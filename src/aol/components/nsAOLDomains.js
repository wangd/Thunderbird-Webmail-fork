/*****************************  Globals   *************************************/
const nsAOLDomainsClassID = Components.ID("{0e1009c0-8533-11db-b606-0800200c9a66}");
const nsAOLDomainsContactID = "@mozilla.org/AOLDomains;1";


/***********************  UriManager ********************************/
function nsAOLDomains()
{
    this.m_scriptLoader = null;
    this.m_Log = null;
    this.m_DomainManager = null;
    this.m_aszStandardDomains = new Array();
    this.m_oStandardFile = null;
    this.m_aszCustomDomains = new Array();
    this.m_oCustomFile = null;
    this.m_Timer = null;
    this.m_iFile = 0;
    this.m_bChange = false;
    this.m_bReady = false;
    this.m_iCount = 0;
}

nsAOLDomains.prototype =
{
    isReady : function ()
    {
        this.m_Log.Write("nsAOLDomains.js - isReady - " +  this.m_bReady);
        return this.m_bReady;
    },

    addDomain : function (szDomain)
    {
        try
        {
            this.m_Log.Write("nsAOLDomains.js - addDomain - START " + szDomain);

            if ( szDomain.search(/[^a-zA-Z0-9\.]+/i)!=-1 ||
                 szDomain.search(/\s/)!=-1 ||
                 szDomain.search(/\./)==-1 ||
                 szDomain.search(/^\./)!=-1 ||
                 szDomain.search(/\.$/)!=-1)
            {
                this.m_Log.Write("nsAOLDomains.js - addDomain - domain invalid ");
                return false;
            }

            var bADD = false;

            if (!this.domainCheck(szDomain, "POP", "@mozilla.org/AOLPOP;1"))
                bADD = this.domainAdd(szDomain, "POP", "@mozilla.org/AOLPOP;1")

            if (!this.domainCheck(szDomain, "SMTP", "@mozilla.org/AOLSMTP;1"))
                bADD = this.domainAdd(szDomain, "SMTP", "@mozilla.org/AOLSMTP;1")

            var bFound = false;
            //custom
            if (this.m_aszCustomDomains.length>0)
            {
                this.m_Log.Write("nsAOLDomains.js - addDomain - search for domain - Custom");

                var i=0;
                var regExp = new RegExp("^"+szDomain+"$", "i");
                do{
                    if (this.m_aszCustomDomains[i].search(regExp)!=-1)
                        bFound = true;
                    i++;
                }while(i<this.m_aszCustomDomains.length && !bFound)
            }

            //standard
            if (!bFound && this.m_aszStandardDomains.length>0)
            {
                this.m_Log.Write("nsAOLDomains.js - addDomain - search for domain - Standard");

                var i=0;
                var regExp = new RegExp("^"+szDomain+"$", "i");
                do{
                    if (this.m_aszStandardDomains[i].search(regExp)!=-1)
                        bFound = true;
                    i++;
                }while(i<this.m_aszStandardDomains.length && !bFound)
            }

            if (!bFound)
            {
                this.m_Log.Write("nsAOLDomains.js - addDomain - not Found added");
                this.m_aszCustomDomains.push(szDomain);
            }

            this.m_bChange = true;


            this.m_Log.Write("nsAOLDomains.js - addDomain - END");
            return bADD;
        }
        catch(err)
        {
            this.m_Log.DebugDump("nsAOLDomains.js: addDomain : Exception : "
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
            this.m_Log.Write("nsAOLDomains.js - removeDomain - START " + szDomain);

            if ( szDomain.search(/[^a-zA-Z0-9\.]+/i)!=-1 ||
                 szDomain.search(/\s/)!=-1 ||
                 szDomain.search(/\./)==-1 ||
                 szDomain.search(/^\./)!=-1 ||
                 szDomain.search(/\.$/)!=-1)
            {
                this.m_Log.Write("nsAOLDomains.js - removeDomain - domain invalid ");
                return false;
            }

            this.m_bChange = true;
            var regExp = new RegExp("^"+szDomain+"$", "i");
            var i=0;
            var bFound=false;
            var szTempDomain;

            //custom domains
            if (this.m_aszCustomDomains.length >0)
            {
                do{
                    szTempDomain = this.m_aszCustomDomains.shift();
                    this.m_Log.Write("nsAOLDomains.js - removeDomain Custom- " + szTempDomain);

                    if (szTempDomain.search(regExp)==-1)
                    {
                        this.m_Log.Write("nsAOLDomains.js - removeDomain Custom- pushed back");
                        this.m_aszCustomDomains.push(szTempDomain);
                    }
                    else
                    {
                        this.m_Log.Write("nsAOLDomains.js - removeDomain Custom -found");
                        bFound = true;
                    }
                    i++;
                }while(i<this.m_aszCustomDomains.length && !bFound)
            }


            //standard domains
            if (!bFound && this.m_aszStandardDomains.length >0)
            {
                do{
                    szTempDomain = this.m_aszStandardDomains.shift();
                    this.m_Log.Write("nsAOLDomains.js - removeDomain Standard- " + szTempDomain);

                    if (szTempDomain.search(regExp)==-1)
                    {
                        this.m_Log.Write("nsAOLDomains.js - removeDomain Standard- pushed back");
                        this.m_aszStandardDomains.push(szTempDomain);
                    }
                    else
                    {
                        this.m_Log.Write("nsAOLDomains.js - removeDomain Standard -found");
                        bFound = true;
                    }
                    i++;
                }while(i<this.m_aszStandardDomains.length && !bFound)
            }



            if (bFound)
            {
                this.m_Log.Write("nsAOLDomains.js - removeDomain - found");
                this.m_DomainManager.removeDomainForProtocol(szDomain, "POP");
                this.m_DomainManager.removeDomainForProtocol(szDomain, "SMTP");
                bFound = true;
            }

            this.m_Log.Write("nsAOLDomains.js - removeDomain - END");
            return true;
        }
        catch(err)
        {
            this.m_Log.DebugDump("nsAOLDomains.js: removeDomain : Exception : "
                                          + err.name
                                          + ".\nError message: "
                                          + err.message + "\n"
                                          + err.lineNumber);

            return false;
        }
    },




    getAllDomains : function(iCount, aszDomains)
    {
        try
        {
            this.m_Log.Write("nsAOLDomains.js - getAllDomains -  START " );

            var aResult = this.m_aszStandardDomains.concat(this.m_aszCustomDomains);
            iCount.value = aResult.length;
            aszDomains.value = aResult;
            this.m_Log.Write("nsAOLDomains.js - getAllDomains - " + iCount.value + " " + aszDomains.value);

            this.m_Log.Write("nsAOLDomains.js - getAllDomains -  END" );
            return true;
        }
        catch(e)
        {
            this.m_Log.DebugDump("nsAOLDomains.js: getAllDomains : Exception : "
                                          + e.name +
                                          ".\nError message: "
                                          + e.message+ "\n"
                                          + e.lineNumber);

            return false;
        }
    },



    loadStandardData : function()
    {
        try
        {
            this.m_Log.Write("nsAOLDomains.js - loadDataBase - START");

            this.m_iFile = 0;

            //get location of DB
            this.m_oStandardFile = Components.classes["@mozilla.org/file/directory_service;1"].
                                      createInstance(Components.interfaces.nsIProperties).
                                      get("ProfD", Components.interfaces.nsIFile);
            this.m_oStandardFile.append("extensions");          //goto profile extension folder
            this.m_oStandardFile.append("{268d7420-9032-11da-a72b-0800200c9a66}"); //goto client extension folder
            this.m_oStandardFile.append("domains.txt");       //goto logfiles folder


            //check file exist
            if (!this.m_oStandardFile.exists())
            {   //create file
                this.m_Log.Write("nsAOLDomains.js - loadStandardData - creating file");
                this.m_oStandardFile.create(Components.interfaces.nsIFile.NORMAL_FILE_TYPE, 0764);
            }

            //open file
            var ioService = Components.classes["@mozilla.org/network/io-service;1"].
                                    getService(Components.interfaces.nsIIOService);

            var fileURI = ioService.newFileURI(this.m_oStandardFile);
            var channel = ioService.newChannelFromURI(fileURI);

            var streamLoader = Components.classes["@mozilla.org/network/stream-loader;1"].
                                    createInstance(Components.interfaces.nsIStreamLoader);
            try
            {
                 streamLoader.init(channel, this, null);
            }
            catch(e) //branch
            {
                 streamLoader.init(this);
                 channel.asyncOpen(streamLoader, this);
            }

            this.m_Log.Write("nsAOLDomains.js - loadDataBase - END");
            return true;
        }
        catch(err)
        {
            this.m_Log.DebugDump("nsAOLDomains.js: loadDataBase : Exception : "
                                          + err.name
                                          + ".\nError message: "
                                          + err.message + "\n"
                                          + err.lineNumber);

            return false;
        }
    },



    loadCustomData : function()
    {
        try
        {
            this.m_Log.Write("nsAOLDomains.js - loadCustomData - START");

            this.m_iFile = 1;

            //get location of DB
            this.m_oCustomFile = Components.classes["@mozilla.org/file/directory_service;1"].
                                      createInstance(Components.interfaces.nsIProperties).
                                      get("ProfD", Components.interfaces.nsIFile);
            this.m_oCustomFile.append("WebmailData");          //goto data folder
            if (!this.m_oCustomFile.exists() || !this.m_oCustomFile.isDirectory()) //check folder exist
                 this.m_oCustomFile.create(Components.interfaces.nsIFile.DIRECTORY_TYPE, 0764);
            this.m_oCustomFile.append("AOLDomains.txt");       //goto domains

            //check file exist
            if (!this.m_oCustomFile.exists())
            {   //create file
                this.m_Log.Write("nsAOLDomains.js - loadCustomData - creating file");
                this.m_oCustomFile.create(Components.interfaces.nsIFile.NORMAL_FILE_TYPE, 0764);
            }

            //open file
            var ioService = Components.classes["@mozilla.org/network/io-service;1"].
                                    getService(Components.interfaces.nsIIOService);

            var fileURI = ioService.newFileURI(this.m_oCustomFile);
            var channel = ioService.newChannelFromURI(fileURI);

            var streamLoader = Components.classes["@mozilla.org/network/stream-loader;1"].
                                    createInstance(Components.interfaces.nsIStreamLoader);
            try
            {
                 streamLoader.init(channel, this, null);
            }
            catch(e) //branch
            {
                 streamLoader.init(this);
                 channel.asyncOpen(streamLoader, this);
            }

            this.m_Log.Write("nsAOLDomains.js - loadCustomData - END");
            return true;
        }
        catch(err)
        {
            this.m_Log.DebugDump("nsAOLDomains.js: loadCustomData : Exception : "
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
            this.m_Log.Write("nsAOLDomains.js - onStreamComplete - START");

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
                this.m_Log.Write("nsAOLDomains.js - onStreamComplete - conversion failed");
            }


            try
            {
                if (szResult.length>0)
                {
                    //get database
                    var szDataBase = szResult.match(/<database>([\S\s]*?)<\/database>/i)[1];

                    //get rows
                    var aszRows = szDataBase.match(/<domain>[\S\s]*?<\/domain>/ig);

                    for (i=0; i < aszRows.length; i++)
                    {
                        var szDomain = aszRows[i].match(/<domain>([\S\s]*?)<\/domain>/i)[1];
                        this.m_Log.Write("nsAOLDomains.js - onStreamComplete - szDomain " + szDomain);
                        if (this.m_iFile==0)
                            this.m_aszStandardDomains.push(szDomain);
                        else
                            this.m_aszCustomDomains.push(szDomain);
                    }
                }
            }
            catch(err)
            {
                this.m_Log.Write("nsAOLDomains.js - onStreamComplete - NO DATA");
            }



            if (this.m_iFile ==0)
                this.loadCustomData();
            else
            {
                //assume DB not ready start timer
                this.m_Timer = Components.classes["@mozilla.org/timer;1"]
                                        .createInstance(Components.interfaces.nsITimer);
                this.m_Timer.initWithCallback(this,
                                              250,
                                              Components.interfaces.nsITimer.TYPE_REPEATING_SLACK);
            }

            this.m_Log.Write("nsAOLDomains.js - onStreamComplete - END");
            return true;
        }
        catch(err)
        {
            this.m_Log.DebugDump("nsAOLDomains.js: onStreamComplete : Exception : "
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
            this.m_Log.Write("nsAOLDomains.js : TimerCallback -  START");


            if(!this.m_DomainManager.isReady())
            {
                this.m_Log.Write("nsAOLDomains.js : TimerCallback -  db not ready");
                return;
            }

            var aszDomain = this.m_aszStandardDomains.concat(this.m_aszCustomDomains);
            if (this.m_iCount<aszDomain.length)
            {
                if (!this.domainCheck(aszDomain[this.m_iCount], "POP", "@mozilla.org/AOLPOP;1"))
                    this.domainAdd(aszDomain[this.m_iCount], "POP", "@mozilla.org/AOLPOP;1")
                if (!this.domainCheck(aszDomain[this.m_iCount], "SMTP", "@mozilla.org/AOLSMTP;1"))
                    this.domainAdd(aszDomain[this.m_iCount], "SMTP", "@mozilla.org/AOLSMTP;1")
            }
            else
            {
                timer.cancel();
                this.m_bReady = true;
            }
            this.m_iCount++;

            this.m_Log.Write("nsAOLDomains.js : TimerCallback - END");
        }
        catch(e)
        {
            this.m_Timer.cancel();
            this.m_Log.DebugDump("nsAOLDomains.js : TimerCallback - Exception in notify : "
                                        + e.name +
                                        ".\nError message: "
                                        + e.message + "\n"
                                        + e.lineNumber);
        }
    },



    domainAdd : function (szDomain,szProtocol, szAOLContentID)
    {
        try
        {
            this.m_Log.Write("nsAOLDomains.js - domainAdd - START ");
            this.m_Log.Write("nsAOLDomains.js - domainAdd - " +szDomain + " " + szProtocol + " " + szAOLContentID);

            var bFound = this.m_DomainManager.newDomainForProtocol(szDomain, szProtocol, szAOLContentID);

            this.m_Log.Write("nsAOLDomains.js - domainAdd - END " + bFound);
            return bFound;
        }
        catch(err)
        {
            this.m_Log.DebugDump("nsAOLDomains.js: domainCheck : Exception : "
                                          + err.name
                                          + ".\nError message: "
                                          + err.message + "\n"
                                          + err.lineNumber);

            return false;
        }
    },



    domainCheck : function (szDomain,szProtocol, szAOLContentID)
    {
        try
        {
            this.m_Log.Write("nsAOLDomains.js - domainCheck - START ");
            this.m_Log.Write("nsAOLDomains.js - domainCheck - " +szDomain + " " + szProtocol + " " + szAOLContentID);

            var bFound = false;
            var szContentID = new Object;
            if (this.m_DomainManager.getDomainForProtocol(szDomain,szProtocol, szContentID))
            {

                if (szContentID.value == szAOLContentID)
                {
                    this.m_Log.Write("nsAOLDomains.js : idCheck - found");
                    bFound = true;
                }
            }

            this.m_Log.Write("nsAOLDomains.js - domainCheck - END " + bFound);
            return bFound;
        }
        catch(err)
        {
            this.m_Log.DebugDump("nsAOLDomains.js: domainCheck : Exception : "
                                          + err.name
                                          + ".\nError message: "
                                          + err.message + "\n"
                                          + err.lineNumber);

            return false;
        }
    },



    saveData : function ()
    {
        try
        {
            this.m_Log.Write("nsAOLDomains.js - saveDataBase - START");

           //create standard file
            var szDataBase = "<database>\r\n";
            for (j=0; j<this.m_aszStandardDomains.length; j++)
            {
                szDataBase += "<domain>"+this.m_aszStandardDomains[j]+"</domain>\r\n";
            }
            szDataBase += "</database>\r\n";

            var outStream = Components.classes["@mozilla.org/network/file-output-stream;1"]
                                .createInstance(Components.interfaces.nsIFileOutputStream);
            outStream.init(this.m_oStandardFile, 0x04 | 0x20 , 420 , 0);
            outStream.write( szDataBase, szDataBase.length );
            outStream.close();

            ///create custom file
            szDataBase = "<database>\r\n";
            for (j=0; j<this.m_aszCustomDomains.length; j++)
            {
                szDataBase += "<domain>"+this.m_aszCustomDomains[j]+"</domain>\r\n";
            }
            szDataBase += "</database>\r\n";

            var outStream = Components.classes["@mozilla.org/network/file-output-stream;1"]
                                .createInstance(Components.interfaces.nsIFileOutputStream);
            outStream.init(this.m_oCustomFile, 0x04 | 0x20 , 420 , 0);
            outStream.write( szDataBase, szDataBase.length );
            outStream.close();

            this.m_Log.Write("nsAOLDomains.js - saveDataBase - END");
            return true;
        }
        catch(err)
        {
            this.m_Log.DebugDump("nsAOLDomains.js: saveDataBase : Exception : "
                                          + err.name
                                          + ".\nError message: "
                                          + err.message + "\n"
                                          + err.lineNumber);

            return false;
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
                var obsSvc = Components.classes["@mozilla.org/observer-service;1"].
                                getService(Components.interfaces.nsIObserverService);
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
                this.m_Log = new DebugLog("webmail.logging.comms",
                                          "{3c8e8390-2cf6-11d9-9669-0800200c9a66}",
                                          "AOLDomainsLog");
                try
                {
                    this.m_DomainManager = Components.classes["@mozilla.org/DomainManager;1"].
                                          getService().
                                           QueryInterface(Components.interfaces.nsIDomainManager);
                }
                catch(err)
                {
                    this.m_Log.Write("nsAOLDomains.js - domainmanager not found");
                }

                this.loadStandardData();
            break;

            case "quit-application":
                this.m_Log.Write("nsAOLDomains.js - quit-application ");
                if (this.m_bChange) this.saveData();
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
        if (!iid.equals(Components.interfaces.nsIDomains)
                && !iid.equals(Components.interfaces.nsISupports)
                    && !iid.equals(Components.interfaces.nsIObserver))
            throw Components.results.NS_ERROR_NO_INTERFACE;

        return this;
    }
}


/******************************************************************************/
/* FACTORY*/
var nsAOLDomainsFactory = new Object();

nsAOLDomainsFactory.createInstance = function (outer, iid)
{
    if (outer != null)
        throw Components.results.NS_ERROR_NO_AGGREGATION;

    if (!iid.equals(nsAOLDomainsClassID)
            && !iid.equals(Components.interfaces.nsISupports))
        throw Components.results.NS_ERROR_INVALID_ARG;

    return new nsAOLDomains();
}


/******************************************************************************/
/* MODULE */
var nsAOLDomainsModule = new Object();

nsAOLDomainsModule.registerSelf = function(compMgr, fileSpec, location, type)
{
    var catman = Components.classes["@mozilla.org/categorymanager;1"].
                        getService(Components.interfaces.nsICategoryManager);

    catman.addCategoryEntry("xpcom-startup",
                            "AOL Domains",
                            nsAOLDomainsContactID,
                            true,
                            true);

    catman.addCategoryEntry("app-startup",
                            "AOL Domains",
                            "service," + nsAOLDomainsContactID,
                            true,
                            true);

    compMgr = compMgr.QueryInterface(Components.interfaces.nsIComponentRegistrar);
    compMgr.registerFactoryLocation(nsAOLDomainsClassID,
                                    "AOL Domains",
                                    nsAOLDomainsContactID,
                                    fileSpec,
                                    location,
                                    type);
}


nsAOLDomainsModule.unregisterSelf = function(aCompMgr, aFileSpec, aLocation)
{
    var catman = Components.classes["@mozilla.org/categorymanager;1"].
                            getService(Components.interfaces.nsICategoryManager);

    catman.deleteCategoryEntry("xpcom-startup", "AOL Domains", true);
    catman.deleteCategoryEntry("app-startup", "AOL Domains", true);

    aCompMgr = aCompMgr.QueryInterface(Components.interfaces.nsIComponentRegistrar);
    aCompMgr.unregisterFactoryLocation(nsAOLDomainsClassID, aFileSpec);
}


nsAOLDomainsModule.getClassObject = function(compMgr, cid, iid)
{
    if (!cid.equals(nsAOLDomainsClassID))
        throw Components.results.NS_ERROR_NO_INTERFACE;

    if (!iid.equals(Components.interfaces.nsIFactory))
        throw Components.results.NS_ERROR_NOT_IMPLEMENTED;

    return nsAOLDomainsFactory;
}


nsAOLDomainsModule.canUnload = function(compMgr)
{
    return true;
}
/******************************************************************************/


function NSGetModule(compMgr, fileSpec)
{
    return nsAOLDomainsModule;
}
