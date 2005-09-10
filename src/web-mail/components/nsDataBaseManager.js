/*****************************  Globals   *************************************/                 
const nsDataBaseManagerClassID = Components.ID("{75874110-09e5-11da-8cd6-0800200c9a66}");
const nsDataBaseManagerContactID = "@mozilla.org/DataBaseManager;1";

const cCurrentDBVersion = 1;

/***********************  DomainManager ********************************/
function nsDataBaseManager()
{
    this.m_scriptLoader =  null;
    this.m_Log = null;
    this.m_dbService = null;
    this.m_dbConn = null;
}

nsDataBaseManager.prototype =
{
    loadDB: function() 
    {
        try
        {
            this.m_Log.Write("nsDataBaseManager.js - loadDB - START");
             
            //get location of DB
            var fileDB = Components.classes["@mozilla.org/file/directory_service;1"];
	        fileDB = fileDB.createInstance(Components.interfaces.nsIProperties);
	        fileDB = fileDB.get("ProfD", Components.interfaces.nsILocalFile);
            fileDB.append("WebMail.db3");         //sqlite database
            fileDB.QueryInterface(Components.interfaces.nsIFile)
            this.m_Log.Write("nsDataBaseManager.js - loadDB - fileDB "+ fileDB.path);
                           
            //load DB
            this.m_dbConn = this.m_dbService.openDatabase(fileDB);
            if (!this.m_dbConn) return false;
            
            this.m_Log.Write("nsDataBaseManager.js - loadDB - END");
            return true;
        }
        catch(e)
        {
            this.m_Log.DebugDump("nsDataBaseManager.js: loadDB : Exception : " 
                                          + e.name  
                                          +"\nError message: " 
                                          + e.message+"\n"
                                          + e.lineNumber);
            return false;
        }
    },



    getDBVersion : function ()
    {
        try
        {
            this.m_Log.Write("nsDataBaseManager.js - getDBVersion - START");
            
            var iVersion = -1;
            var szVersion = "SELECT version FROM webmail_schema_version LIMIT 1";
            var select = null;
            
            try 
            {
                select = this.createDBQuery(szVersion);
                if (select.step()) iVersion = select.row.version;
            } 
            catch (e) 
            { 
                iVersion = -1;
            }
            if (select) select.reset();
            
            this.m_Log.Write("nsDataBaseManager.js - getDBVersion - "+ iVersion);   
            this.m_Log.Write("nsDataBaseManager.js - getDBVersion - END"); 
            return iVersion;
        }
        catch(err)
        {
            this.m_Log.DebugDump("nsDataBaseManager.js: getDBVersion : Exception : " 
                                          + err.name
                                          + "\nError message: " 
                                          + err.message +"\n"
                                          + err.lineNumber);
            return -1;
        }
    },

     
    createDB : function ()
    {
        try
        {
            this.m_Log.Write("nsDataBaseManager.js - createDB - START");
             
            var szSQL = "CREATE TABLE webmail_schema_version (version INTEGER);";
            this.m_dbConn.executeSimpleSQL(szSQL);
            szSQL = "INSERT INTO webmail_schema_version VALUES(1);";
            this.m_dbConn.executeSimpleSQL(szSQL); 
            
            szSQL ="CREATE TABLE webmail_folders (folder_hierarchy STRING, folder_id INTEGER PRIMARY KEY, folder_name STRING, user_id INTEGER);";
            this.m_dbConn.executeSimpleSQL(szSQL); 
            
            szSQL = "CREATE TABLE webmail_message (attachment BOOLEAN, date TEXT, delete_msg BOOLEAN, folder_id INTEGER, sender STRING, href TEXT, msg_id INTEGER PRIMARY KEY, read BOOLEAN, size INTEGER, subject TEXT, time TEXT, recipient TEXT, user_id INTEGER);";
            this.m_dbConn.executeSimpleSQL(szSQL); 
            
            szSQL = "CREATE TABLE webmail_subscribe_list (folder_name STRING, user_id INTEGER);";
            this.m_dbConn.executeSimpleSQL(szSQL); 
            
            szSQL = "CREATE TABLE webmail_user (user_id INTEGER PRIMARY KEY, user_name TEXT);";
            this.m_dbConn.executeSimpleSQL(szSQL); 
            
           
                                  
            this.m_Log.Write("nsDataBaseManager.js - createDB - END");
        }
        catch(err)
        {
            this.m_Log.DebugDump("nsDataBaseManager.js: createDB : Exception : " 
                                          + err.name + 
                                          "\nError message: " 
                                          + err.message +"\n"
                                          + "DB Error " + "\n"
                                          + this.m_dbConn.lastError +"\n"
                                          + err.lineNumber);
            return false;
        }
    },
    
    
    updateDB : function (iVersion)
    {
        try
        {
            this.m_Log.Write("nsDataBaseManager.js - updateDB - START");
            this.m_Log.Write("nsDataBaseManager.js - updateDB - "+iVersion);
            this.m_Log.Write("nsDataBaseManager.js - updateDB - END");
        }
        catch(err)
        {
            this.m_Log.DebugDump("nsDataBaseManager.js: updateDB : Exception : " 
                                          + err.name + 
                                          "\nError message: " 
                                          + err.message +"\n"
                                          + err.lineNumber);
            return false;
        }
    },
    
    
    createDBQuery : function (query)
    {
        try
        {
            this.m_Log.Write("nsDataBaseManager.js - createDBQuery - START");
                      
            var statement = this.m_dbConn.createStatement(query);
            
            var wStatement = Components.classes["@mozilla.org/storage/statement-wrapper;1"];
            wStatement = wStatement.createInstance(Components.interfaces.mozIStorageStatementWrapper);
            wStatement.initialize(statement);
                     
            this.m_Log.Write("nsDataBaseManager.js - createDBQuery - END"); 
            return wStatement;
        }
        catch(err)
        {
            this.m_Log.DebugDump("nsDataBaseManager.js: createDBQuery : Exception : " 
                                          + err.name + 
                                          "\nError message: " 
                                          + err.message+"\n"
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
                var obsSvc = Components.classes["@mozilla.org/observer-service;1"].
                                getService(Components.interfaces.nsIObserverService);
                obsSvc.addObserver(this, "profile-after-change", false);
                
                this.m_scriptLoader = Components.classes["@mozilla.org/moz/jssubscript-loader;1"]
                                        .getService(Components.interfaces.mozIJSSubScriptLoader); 
                                        
            break;
            
            case "profile-after-change":
                // This happens after profile has been loaded and user preferences have been read.
                // startup code here
                this.m_scriptLoader.loadSubScript("chrome://web-mail/content/common/DebugLog.js");
                this.m_Log = new DebugLog("webmail.logging.comms", 
                                          "{3c8e8390-2cf6-11d9-9669-0800200c9a66}",
                                          "DBManager");
                   
                this.intial();        
            break;

            case "quit-application": // shutdown code here
            break;
        
            case "app-startup":
            break;
            
            default:
                throw Components.Exception("Unknown topic: " + aTopic);
        }
    },
    
    intial : function ()
    {
        try
        {
            this.m_Log.Write("nsDataBaseManager : intial - START");
            
            try
            {
                this.m_dbService = Components.classes["@mozilla.org/storage/service;1"]
                                     .getService(Components.interfaces.mozIStorageService);
            }
            catch(err)
            {
                this.m_Log.Write("Webmail.js : startUp - SQL components NOT installed");
                return;
            }
                                 
            this.loadDB();
            var iVersion = this.getDBVersion();
            if (iVersion == -1) 
                this.createDB();
            else if (iVersion != cCurrentDBVersion)
                this.updateDB(iVersion);
            
            this.m_Log.Write("nsDataBaseManager : intial - END"); 
        }
        catch(e)
        {
            this.m_Log.Write("nsDataBaseManager :  Exception in intial " 
                                            + e.name + 
                                            ".\nError message: " 
                                            + e.message + "\n"
                                            + e.lineNumber);
        }
    },
    
    
/******************************************************************************/
/***************** XPCOM  stuff ***********************************************/
/******************************************************************************/
    QueryInterface : function (iid)
    {
        if (!iid.equals(Components.interfaces.nsIDataBaseManager) 
        	    && !iid.equals(Components.interfaces.nsISupports)
                    && !iid.equals(Components.interfaces.nsIObserver))
            throw Components.results.NS_ERROR_NO_INTERFACE;
            
        return this;
    }
}
 

/******************************************************************************/
/* FACTORY*/
var nsDataBaseManagerFactory = new Object();

nsDataBaseManagerFactory.createInstance = function (outer, iid)
{
    if (outer != null)
        throw Components.results.NS_ERROR_NO_AGGREGATION;
    
    if (!iid.equals(nsDataBaseManagerClassID) 
                            && !iid.equals(Components.interfaces.nsISupports))
        throw Components.results.NS_ERROR_INVALID_ARG;
    
    return new nsDataBaseManager();
}


/******************************************************************************/
/* MODULE */
var nsDataBaseManagerModule = new Object();

nsDataBaseManagerModule.registerSelf = function(compMgr, fileSpec, location, type)
{
    var catman = Components.classes["@mozilla.org/categorymanager;1"].
                        getService(Components.interfaces.nsICategoryManager);
        
    catman.addCategoryEntry("xpcom-startup", 
                            "DataBase Manager", 
                            nsDataBaseManagerContactID, 
                            true, 
                            true);                     
                            
    catman.addCategoryEntry("app-startup", 
                            "DataBase Manager", 
                            "service," + nsDataBaseManagerContactID, 
                            true, 
                            true);
                            
    catman.addCategoryEntry("xpcom-shutdown",
                            "DataBase Manager", 
                            nsDataBaseManagerContactID, 
                            true, 
                            true);  
                            
    compMgr = compMgr.QueryInterface(Components.interfaces.nsIComponentRegistrar);
    compMgr.registerFactoryLocation(nsDataBaseManagerClassID,
                                    "DataBase Manager",
                                    nsDataBaseManagerContactID, 
                                    fileSpec,
                                    location, 
                                    type);
}


nsDataBaseManagerModule.unregisterSelf = function(aCompMgr, aFileSpec, aLocation)
{
    var catman = Components.classes["@mozilla.org/categorymanager;1"].
                            getService(Components.interfaces.nsICategoryManager);
                            
    catman.deleteCategoryEntry("xpcom-startup", "DataBase Manager", true);
    catman.deleteCategoryEntry("app-startup", "DataBase Manager", true);
    catman.deleteCategoryEntry("xpcom-shutdown", "DataBase Manager", true);
    
    aCompMgr = aCompMgr.QueryInterface(Components.interfaces.nsIComponentRegistrar);
    aCompMgr.unregisterFactoryLocation(nsDataBaseManagerClassID, aFileSpec);
}

 
nsDataBaseManagerModule.getClassObject = function(compMgr, cid, iid)
{
    if (!cid.equals(nsDataBaseManagerClassID))
        throw Components.results.NS_ERROR_NO_INTERFACE;

    if (!iid.equals(Components.interfaces.nsIFactory))
        throw Components.results.NS_ERROR_NOT_IMPLEMENTED;

    return nsDataBaseManagerFactory;
}


nsDataBaseManagerModule.canUnload = function(compMgr)
{
    return true;
}
/******************************************************************************/


function NSGetModule(compMgr, fileSpec)
{
    return nsDataBaseManagerModule; 
}
