/*****************************  Globals   *************************************/                 
const nsDataBaseManagerClassID = Components.ID("{75874110-09e5-11da-8cd6-0800200c9a66}");
const nsDataBaseManagerContactID = "@mozilla.org/DataBaseManager;1";


/***********************  DomainManager ********************************/
function nsDataBaseManager()
{
    try
    {
        var scriptLoader =  Components.classes["@mozilla.org/moz/jssubscript-loader;1"];
        scriptLoader = scriptLoader.getService(Components.interfaces.mozIJSSubScriptLoader);
        scriptLoader.loadSubScript("chrome://web-mail/content/common/DebugLog.js");
    
        this.m_Log = new DebugLog("webmail.logging.comms", 
                                  "{3c8e8390-2cf6-11d9-9669-0800200c9a66}",
                                  "DBManager"); 
            
        this.m_Log.Write("nsDataBaseManager.js - Constructor - START");
        
        this.m_dbService = Components.classes["@mozilla.org/storage/service;1"].
                            getService(Components.interfaces.mozIStorageService);
       
        this.m_dbConn = null;
        
        this.loadDB();
        if (!this.checkDB()) this.updateDB();
            
        
        this.m_Log.Write("nsDataBaseManager.js - Constructor - END");
    }
    catch(e)
    {
        this.m_Log.DebugDump("nsDataBaseManager.js: Constructor : Exception : " 
                                      + e.name + 
                                      "\nError message: " 
                                      + e.message +"\n"
                                      + e.lineNumber);
    }
}

nsDataBaseManager.prototype =
{
    loadDB: function() 
    {
        try
        {
            this.m_Log.Write("nsDataBaseManager.js - loadDB - START");
             
            //get location of DB
            var fileDB = Components.classes["@mozilla.org/file/directory_service;1"].
	                     createInstance(Components.interfaces.nsIProperties).
	                     get("ProfD", Components.interfaces.nsILocalFile);
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


    checkDB : function ()
    {
        try
        {
            this.m_Log.Write("nsDataBaseManager.js - checkDB - START");
            this.m_Log.Write("nsDataBaseManager.js - checkDB - END");
        }
        catch(err)
        {
            this.m_Log.DebugDump("nsDataBaseManager.js: checkDB : Exception : " 
                                          + e.name
                                          + "\nError message: " 
                                          + e.message +"\n"
                                          + e.lineNumber);
            return false;
        }
    },

     
    
    updateDB : function ()
    {
        try
        {
            this.m_Log.Write("nsDataBaseManager.js - updateDB - START");
            this.m_Log.Write("nsDataBaseManager.js - updateDB - END");
        }
        catch(err)
        {
            this.m_Log.DebugDump("nsDataBaseManager.js: updateDB : Exception : " 
                                          + e.name + 
                                          "\nError message: " 
                                          + e.message +"\n"
                                          + e.lineNumber);
            return false;
        }
    },
    
    
    createDBQuery : function (query)
    {
        try
        {
            this.m_Log.Write("nsDataBaseManager.js - createDBQuery - START");
            this.m_Log.Write("nsDataBaseManager.js - createDBQuery - END");
        }
        catch(err)
        {
            this.m_Log.DebugDump("nsDataBaseManager.js: createDBQuery : Exception : " 
                                          + e.name + 
                                          "\nError message: " 
                                          + e.message+"\n"
                                          + e.lineNumber);
            return null;
        }
    },
    
    
    queryDB : function (sqlCommand)
    {
        try
        {
            this.m_Log.Write("nsDataBaseManager.js - queryDB - START");
            this.m_Log.Write("nsDataBaseManager.js - queryDB - END");
        }
        catch(err)
        {
            this.m_Log.DebugDump("nsDataBaseManager.js: queryDB : Exception : " 
                                          + e.name + 
                                          "\nError message: " 
                                          + e.message +"\n"
                                          + e.lineNumber);
            return null;
        }
    },
    
/******************************************************************************/
/***************** XPCOM  stuff ***********************************************/
/******************************************************************************/
    QueryInterface : function (iid)
    {
        if (!iid.equals(Components.interfaces.nsIDataBaseManager) 
        	                && !iid.equals(Components.interfaces.nsISupports))
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
