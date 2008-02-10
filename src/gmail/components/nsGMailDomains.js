/*****************************  Globals   *************************************/
const nsGMailDomainsClassID = Components.ID("{6b5918d0-d693-11dc-95ff-0800200c9a66}");
const nsGMailDomainsContactID = "@mozilla.org/GMailDomains;1";
const nsGMailExtGUID = "{860a7040-44a3-11da-8cd6-0800200c9a66}";

/***********************  UriManager ********************************/
function nsGMailDomains()
{
    this.m_scriptLoader = null;
    this.m_Log = null;
    this.m_DomainManager = null;
    this.m_dbService = null;
    this.m_bIsReady = false;
    this.m_oFile = null;
    this.m_aFilesDomains = new Array();
    this.m_Timer = null;
    this.m_iCount = 0;
}


nsGMailDomains.prototype =
{
    loadDataBase : function()
    {
        try
        {
            this.m_Log.Write("nsDomainsGMail.js - loadDataBase - START");

            try
            {
                this.m_dbService = Components.classes["@mozilla.org/storage/service;1"]
                                             .getService(Components.interfaces.mozIStorageService);
            }
            catch(err)
            {
                this.m_Log.Write("nsDomainsGMail.js : startUp - SQL components NOT installed");
                throw new Error("no database");
            }

            //get location of DB
            var fileDB = Components.classes["@mozilla.org/file/directory_service;1"];
            fileDB = fileDB.createInstance(Components.interfaces.nsIProperties);
            fileDB = fileDB.get("ProfD", Components.interfaces.nsILocalFile);
            fileDB.append("WebmailData");         //add folder
            if (!fileDB.exists() || !fileDB.isDirectory())    //check folder exist
                fileDB.create(Components.interfaces.nsIFile.DIRECTORY_TYPE, 0764);
            if (fileDB.exists() && fileDB.isDirectory() && fileDB.permissions != 0764) //check permissions
            {
                this.m_Log.Write("nsDomainsGMail.js - loadDB - updating file permissions");
                try
                {
                    fileDB.permissions = 0764;
                }
                catch(e)
                {
                    this.m_Log.Write("nsDomainsGMail.js: loadDataBase : permissions exception : "
                                          + e.name
                                          + ".\nError message: "
                                          + e.message);
                }
            }
            fileDB.append("GMaildomains.db3");         //sqlite database
            fileDB.QueryInterface(Components.interfaces.nsIFile)
            this.m_Log.Write("nsDomainsGMail.js - loadDB - fileDB "+ fileDB.path);

            //load DB
            this.m_dbConn = this.m_dbService.openDatabase(fileDB);
            if (!this.m_dbConn) return false;

            var iVersion = this.getDBVersion();
            if (iVersion == -1)
                this.createDB();
          
            this.m_bIsReady = true;

            this.m_Log.Write("nsDomainsGMail.js - loadDataBase - END");
            return true;
        }
        catch(err)
        {
            this.m_Log.DebugDump("nsDomainsGMail.js: loadDataBase : Exception : "
                                          + err.name
                                          + ".\nError message: "
                                          + err.message + "\n"
                                          + err.lineNumber +"\n"
                                          + "DB Reset "+ this.m_dbConn.lastErrorString);

            return false;
        }
    },

    
        
    getDBVersion : function ()
    {
        try
        {
            this.m_Log.Write("nsDomainsGMail.js - getDBVersion - START");

            var iVersion = -1;

            try
            {
                var szVersion = "SELECT version FROM GMaildomains_schema_version LIMIT 1";
                var statement = this.m_dbConn.createStatement(szVersion);
                var wStatement = Components.classes["@mozilla.org/storage/statement-wrapper;1"]
                                           .createInstance(Components.interfaces.mozIStorageStatementWrapper);
                try
                {
                    wStatement.initialize(statement);
                    if (wStatement.step()) iVersion = wStatement.row["version"];
                }
                finally
                {
                    wStatement.reset();
                    this.m_Log.Write("nsDomainsGMail : getDBversion - DB Reset");
                }
            }
            catch (e)
            {
                iVersion = -1;
            }

            this.m_Log.Write("nsDomainsGMail.js - getDBVersion - "+ iVersion);
            this.m_Log.Write("nsDomainsGMail.js - getDBVersion - END");
            return iVersion;
        }
        catch(err)
        {
            this.m_Log.DebugDump("nsDomainsGMail.js: getDBVersion : Exception : "
                                          + err.name
                                          + "\nError message: "
                                          + err.message +"\n"
                                          + err.lineNumber+ "\n"
                                          + this.m_dbConn.lastErrorString);
            return -1;
        }
    },

     
 
    createDB : function ()
    {
        try
        {
            this.m_Log.Write("nsDomainsGMail.js - createDB - START");
            var szSQL;

            //Domains Table
            szSQL = "CREATE TABLE domains ";
            szSQL +="(";
            szSQL +=    "id INTEGER PRIMARY KEY, ";
            szSQL +=    "domain TEXT, ";
            szSQL +=    "url TEXT ";
            szSQL +=");";
            this.m_Log.Write("nsDomainsGMail.js - createDB - szSQL " + szSQL);
            this.m_dbConn.executeSimpleSQL(szSQL);

            //Version table
            szSQL = "CREATE TABLE GMaildomains_schema_version (version INTEGER);";
            this.m_dbConn.executeSimpleSQL(szSQL);
            szSQL = "INSERT INTO GMaildomains_schema_version VALUES(1);";
            this.m_dbConn.executeSimpleSQL(szSQL);
            
            this.m_Log.Write("nsDomainsGMail.js - createDB - END");
        }
        catch(err)
        {
            this.m_Log.DebugDump("nsDomainsGMail.js: createDB : Exception : "
                                          + err.name +
                                          "\nError message: "
                                          + err.message +"\n"
                                          + "DB Error " + "\n"
                                          + err.lineNumber+ "\n"
                                          + this.m_dbConn.lastErrorString);
            return false;
        }
    },

  
    
    loadFileData : function()
    {
        try
        {
            this.m_Log.Write("nsGMailDomains.js - loadStandardData - START");

            //get location of DB
            this.m_oFile = Components.classes["@mozilla.org/file/directory_service;1"]
                                     .createInstance(Components.interfaces.nsIProperties)
                                     .get("ProfD", Components.interfaces.nsIFile);
            this.m_oFile.append("extensions");          //goto profile extension folder
            this.m_oFile.append("{3d82b2c0-0109-11da-8cd6-0800200c9a66}"); //goto client extension folder
            this.m_oFile.append("domains.txt");       //goto logfiles folder

            //check file exist
            if (!this.m_oFile.exists())
            {   //create file
                this.m_Log.Write("nsGMailDomains.js - loadStandardData - creating file");
                this.m_oFile.create(Components.interfaces.nsIFile.NORMAL_FILE_TYPE, 0764);
            }

            //open file
            var ioService = Components.classes["@mozilla.org/network/io-service;1"]
                                      .getService(Components.interfaces.nsIIOService);

            var fileURI = ioService.newFileURI(this.m_oFile);
            var channel = ioService.newChannelFromURI(fileURI);

            var streamLoader = Components.classes["@mozilla.org/network/stream-loader;1"]
                                         .createInstance(Components.interfaces.nsIStreamLoader);
            try
            {
                 streamLoader.init(channel, this, null);
            }
            catch(e) //branch
            {
                 streamLoader.init(this);
                 channel.asyncOpen(streamLoader, this);
            }

            this.m_Log.Write("nsGMailDomains.js - loadStandardData - END");
            return true;
        }
        catch(err)
        {
            this.m_Log.DebugDump("nsGMailDomains.js: loadStandardData : Exception : "
                                          + err.name
                                          + ".\nError message: "
                                          + err.message + "\n"
                                          + err.lineNumber);

            return false;
        }
    },



    onStreamComplete : function(aLoader, aContext, aStatus, ResultLength, Result)
    {
        try
        {
            this.m_Log.Write("nsHotmailDomains.js - onStreamComplete - START");

            var szResult = null;
            try
            {
                var uniCon = Components.classes["@mozilla.org/intl/scriptableunicodeconverter"]
                                       .createInstance(Components.interfaces.nsIScriptableUnicodeConverter);
                uniCon.charset = "UTF-8";
                szResult = uniCon.convertFromByteArray(Result, Result.length);
            }
            catch(e)
            {
                this.m_Log.Write("nsHotmailDomains.js - onStreamComplete - conversion failed");
            }


            try
            {
                if (szResult.length>0)
                {
                    //get database
                    var szDataBase = szResult.match(/<database>([\S\s]*?)<\/database>/i)[1];

                    //get rows
                    var aszRows = szDataBase.match(/<entry>[\S\s]*?<\/entry>/ig);
            
                    for (i=0; i < aszRows.length; i++)
                    {
                        var data = new GMailDomains()
                        data.szDomain = aszRows[i].match(/<domain>([\S\s]*?)<\/domain>/i)[1];
                        this.m_Log.Write("nsGMailDomains.js - onStreamComplete - szDomain " + data.szDomain);
                        data.szURL = aszRows[i].match(/<url>([\S\s]*?)<\/url>/i)[1];
                        this.m_Log.Write("nsGMailDomains.js - onStreamComplete - szURL " + data.szURL);
                        this.m_aFilesDomains.push(data);
                    }
                }
            }
            catch(err)
            {
                this.m_Log.Write("nsGMailDomains.js - onStreamComplete - NO DATA ");
            }

            //assume DB not ready start timer
            this.m_Timer = Components.classes["@mozilla.org/timer;1"]
                                     .createInstance(Components.interfaces.nsITimer);
            this.m_Timer.initWithCallback(this,
                                          250,
                                          Components.interfaces.nsITimer.TYPE_REPEATING_SLACK);

            this.m_Log.Write("nsGMailDomains.js - onStreamComplete - END");
            return true;
        }
        catch(err)
        {
            this.m_Log.DebugDump("nsGMailDomains.js: onStreamComplete : Exception : "
                                          + err.name
                                          + ".\nError message: "
                                          + err.message + "\n"
                                          + err.lineNumber);

            return false;
        }
    },



    notify: function(timer)
    {
        try
        {
            this.m_Log.Write("nsGMailDomains.js : TimerCallback -  START");


            if(!this.m_DomainManager.isReady())
            {
                this.m_Log.Write("nsGMailDomains.js : TimerCallback -  db not ready");
                return;
            }

            if (this.m_iCount == 0)  //register content_id and extension guid
            {
                this.m_DomainManager.registerDomainHandler("@mozilla.org/GMailPOP;1", nsGMailExtGUID);
                this.m_DomainManager.registerDomainHandler("@mozilla.org/GMailSMTP;1",nsGMailExtGUID);
            }

            if (this.m_iCount< this.m_aFilesDomains.length)
            {
                this.addDomain(this.m_aFilesDomains[this.m_iCount].szDomain,
                               this.m_aFilesDomains[this.m_iCount].szURL)
            }
            else
                timer.cancel();

            this.m_iCount++;

            this.m_Log.Write("nsGMailDomains.js : TimerCallback - END");
        }
        catch(e)
        {
            this.m_Timer.cancel();
            this.m_Log.DebugDump("nsGMailDomains.js : TimerCallback - Exception in notify : "
                                        + e.name +
                                        ".\nError message: "
                                        + e.message + "\n"
                                        + e.lineNumber);
        }
    },



    domainCheck : function (szDomain,szProtocol, szGMailContentID)
    {
        try
        {
            this.m_Log.Write("nsGMailDomains.js - domainCheck - START ");
            this.m_Log.Write("nsGMailDomains.js - domainCheck - " +szDomain + " " + szProtocol + " " + szGMailContentID);

            var bFound = false;
            var szContentID = new Object;
            var bDefault = new Object;
            if (this.m_DomainManager.getDomain(szDomain,szProtocol, szContentID, bDefault))
            {
                //check content id and defalut status
                if (szContentID.value == szGMailContentID)
                    bFound = true;
            }

            this.m_Log.Write("nsGMailDomains.js - domainCheck - END " + bFound);
            return bFound;
        }
        catch(err)
        {
            this.m_Log.DebugDump("nsGMailDomains.js: domainCheck : Exception : "
                                          + err.name
                                          + ".\nError message: "
                                          + err.message + "\n"
                                          + err.lineNumber);

            return false;
        }
    },



    addDomain : function (szDomain, szURL)
    {
        try
        {
            this.m_Log.Write("nsGMailDomains.js - addDomain - START " + szDomain + " " + szURL);

            //add domains to webmail database
            if (!this.domainCheck( szDomain, "POP", "@mozilla.org/GMailPOP;1"))
                this.m_DomainManager.newDomain(szDomain, "POP", "@mozilla.org/GMailPOP;1","false");
            if (!this.domainCheck(szDomain, "SMTP", "@mozilla.org/GMailSMTP;1"))
                this.m_DomainManager.newDomain(szDomain, "SMTP", "@mozilla.org/GMailSMTP;1","false");

            var szSQL;
            szSQL  = "REPLACE INTO domains (id, domain, url) ";
            szSQL += "VALUES ";
            szSQL += "( ";
            szSQL += "  (SELECT id FROM domains WHERE domain LIKE ?1),";
            szSQL += "   ?1,";
            szSQL += "   ?2 ";
            szSQL += ");";
            this.m_Log.Write("nsGMailDomains : newDomain - sql "  + szSQL);
            var statement = this.m_dbConn.createStatement(szSQL);
            statement.bindStringParameter(0, szDomain.toLowerCase().replace(/\s/,""));
            statement.bindStringParameter(1, szURL.toLowerCase().replace(/\s/,""));
            statement.execute();
            
            this.m_Log.Write("nsGMailDomains.js - addDomain - END " );
        }
        catch(err)
        {
            this.m_Log.DebugDump("nsGMailDomains.js: addDomain : Exception : "
                                          + err.name
                                          + ".\nError message: "
                                          + err.message + "\n"
                                          + err.lineNumber);

            return false;
        }
    },
    
    
    
    removeDomain : function (szDomain)
    {
        try
        {
            this.m_Log.Write("nsGMailDomains.js - removeDomain - START " + szDomain);

            var szSQL = "DELETE FROM domains WHERE domain LIKE ?1";
            var statement = this.m_dbConn.createStatement(szSQL);
            statement.bindStringParameter(0, szDomain.toLowerCase().replace(/\s/,""));
            statement.execute();

            this.m_DomainManager.removeDomainForProtocol(szDomain, "POP");
            this.m_DomainManager.removeDomainForProtocol(szDomain, "SMTP");
            
            this.m_Log.Write("nsGMailDomains.js - removeDomain - END " );
            return 1;
        }
        catch(err)
        {
            this.m_Log.DebugDump("nsGMailDomains.js: removeDomain : Exception : "
                                          + err.name
                                          + ".\nError message: "
                                          + err.message + "\n"
                                          + err.lineNumber);

            return 0;
        }
    },
    
    
    
    getAllDomains : function (iCount, aDomains)
    {
        try
        {
            this.m_Log.Write("nsGMailDomains.js - getAllDomains - START ");
            var aResult = new Array();
            
            var szSQL = "SELECT domain FROM domains ORDER BY domain ASC ";            
            var statement = this.m_dbConn.createStatement(szSQL);
            try
            {
                var wStatement = Components.classes["@mozilla.org/storage/statement-wrapper;1"]
                                           .createInstance(Components.interfaces.mozIStorageStatementWrapper);
                wStatement.initialize(statement);
                while (wStatement.step())
                {
                   aResult.push(wStatement.row["domain"]);
                }
            }
            finally
            {
                statement.reset();
                this.m_Log.Write("nsGMailDomains : getAllDomains - DB Reset "+ this.m_dbConn.lastErrorString);
            }
            
            
            iCount.value = aResult.length;
            aDomains.value = aResult;
            this.m_Log.Write("nsGMailDomains.js - getAllDomains - " + iCount.value);
            
            this.m_Log.Write("nsGMailDomains.js - getAllDomains - END " );
            return 1;
        }
        catch(err)
        {
            this.m_Log.DebugDump("nsGMailDomains.js: getDomains : Exception : "
                                          + err.name
                                          + ".\nError message: "
                                          + err.message + "\n"
                                          + err.lineNumber);

            return 0;
        } 
    },
    
    
    
    getURL : function (szDomain)
    {
        try
        {
            this.m_Log.Write("nsGMailDomains.js - getURL - START " + szDomain);
            var szURL = null;
            var szSQL = "SELECT url FROM domains WHERE domain LIKE ?1";
            var statement = this.m_dbConn.createStatement(szSQL);
            statement.bindStringParameter(0, szDomain.toLowerCase().replace(/\s/,""));
            try
            {
                var wStatement = Components.classes["@mozilla.org/storage/statement-wrapper;1"]
                                           .createInstance(Components.interfaces.mozIStorageStatementWrapper);
                wStatement.initialize(statement);
                while (wStatement.step())
                {
                   szURL = wStatement.row["url"];
                }
            }
            finally
            {
                statement.reset();
                this.m_Log.Write("nsGMailDomains : getURL - DB Reset "+ this.m_dbConn.lastErrorString);
            }

            this.m_Log.Write("nsGMailDomains.js - getURL - END " + szURL );
            return szURL;
        }
        catch(err)
        {
            this.m_Log.DebugDump("nsGMailDomains.js: getURL : Exception : "
                                          + err.name
                                          + ".\nError message: "
                                          + err.message + "\n"
                                          + err.lineNumber);

            return null;
        } 
    },
    


    observe : function(aSubject, aTopic, aData)
    {
        switch(aTopic)
        {
            case "xpcom-startup":
                // this is run very early, right after XPCOM is initialized, but before
                // user profile information is applied. Register ourselves as an observer
                // for 'profile-after-change' and 'quit-application'.
                var obsSvc = Components.classes["@mozilla.org/observer-service;1"]
                                       .getService(Components.interfaces.nsIObserverService);
                obsSvc.addObserver(this, "profile-after-change", false);
                obsSvc.addObserver(this, "quit-application", false);

                this.m_scriptLoader = Components.classes["@mozilla.org/moz/jssubscript-loader;1"]
                                                .getService(Components.interfaces.mozIJSSubScriptLoader);
            break;

            case "profile-after-change":
                // This happens after profile has been loaded and user preferences have been read.
                // startup code here
                this.m_scriptLoader.loadSubScript("chrome://web-mail/content/common/DebugLog.js");
                this.m_scriptLoader.loadSubScript("chrome://web-mail/content/common/CommonPrefs.js");
                this.m_scriptLoader.loadSubScript("chrome://gmail/content/GMail-DomainData.js");
                this.m_Log = new DebugLog("webmail.logging.comms",
                                          "{3c8e8390-2cf6-11d9-9669-0800200c9a66}",
                                          "GMailDomainsLog");
                try
                {
                    this.m_DomainManager = Components.classes["@mozilla.org/DomainManager;1"]
                                                     .getService()
                                                     .QueryInterface(Components.interfaces.nsIDomainManager);
                }
                catch(err)
                {
                    this.m_Log.Write("nsGMailDomains.js - domainmanager not found");
                }
                
                this.loadDataBase();                
                this.loadFileData();
            break;


            case "quit-application":
                this.m_Log.Write("nsGMailDomains.js - quit-application ");
                
                var obsSvc = Components.classes["@mozilla.org/observer-service;1"]
                                       .getService(Components.interfaces.nsIObserverService);
                obsSvc.removeObserver(this, "profile-after-change");
                obsSvc.removeObserver(this, "quit-application");
            break;

            case "app-startup":
            break;

            default:
                throw Components.Exception("Unknown topic: " + aTopic);
        }
    },



/******************************************************************************/
/***************** XPCOM  stuff ***********************************************/
/******************************************************************************/
    QueryInterface : function (iid)
    {
        if (!iid.equals(Components.interfaces.nsIGMailDomains)
                && !iid.equals(Components.interfaces.nsISupports)
                    && !iid.equals(Components.interfaces.nsIObserver))
            throw Components.results.NS_ERROR_NO_INTERFACE;

        return this;
    }
}


/******************************************************************************/
/* FACTORY*/
var nsGMailDomainsFactory = new Object();

nsGMailDomainsFactory.createInstance = function (outer, iid)
{
    if (outer != null)
        throw Components.results.NS_ERROR_NO_AGGREGATION;

    if (!iid.equals(nsGMailDomainsClassID)
            && !iid.equals(Components.interfaces.nsISupports))
        throw Components.results.NS_ERROR_INVALID_ARG;

    return new nsGMailDomains();
}


/******************************************************************************/
/* MODULE */
var nsGMailDomainsModule = new Object();

nsGMailDomainsModule.registerSelf = function(compMgr, fileSpec, location, type)
{
    var catman = Components.classes["@mozilla.org/categorymanager;1"].
                        getService(Components.interfaces.nsICategoryManager);

    catman.addCategoryEntry("xpcom-startup",
                            "GMail Domains",
                            nsGMailDomainsContactID,
                            true,
                            true);

    catman.addCategoryEntry("app-startup",
                            "GMail Domains",
                            "service," + nsGMailDomainsContactID,
                            true,
                            true);

    compMgr = compMgr.QueryInterface(Components.interfaces.nsIComponentRegistrar);
    compMgr.registerFactoryLocation(nsGMailDomainsClassID,
                                    "GMail Domains",
                                    nsGMailDomainsContactID,
                                    fileSpec,
                                    location,
                                    type);
}


nsGMailDomainsModule.unregisterSelf = function(aCompMgr, aFileSpec, aLocation)
{
    var catman = Components.classes["@mozilla.org/categorymanager;1"].
                            getService(Components.interfaces.nsICategoryManager);

    catman.deleteCategoryEntry("xpcom-startup", "GMail Domains", true);
    catman.deleteCategoryEntry("app-startup", "GMail Domains", true);
    
    aCompMgr = aCompMgr.QueryInterface(Components.interfaces.nsIComponentRegistrar);
    aCompMgr.unregisterFactoryLocation(nsGMailDomainsClassID, aFileSpec);
}


nsGMailDomainsModule.getClassObject = function(compMgr, cid, iid)
{
    if (!cid.equals(nsGMailDomainsClassID))
        throw Components.results.NS_ERROR_NO_INTERFACE;

    if (!iid.equals(Components.interfaces.nsIFactory))
        throw Components.results.NS_ERROR_NOT_IMPLEMENTED;

    return nsGMailDomainsFactory;
}


nsGMailDomainsModule.canUnload = function(compMgr)
{
    return true;
}
/******************************************************************************/


function NSGetModule(compMgr, fileSpec)
{
    return nsGMailDomainsModule;
}
