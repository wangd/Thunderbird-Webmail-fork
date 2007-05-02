/*****************************  Globals   *************************************/
const nsComponentData2ClassID = Components.ID("{57364ea6-f75f-11db-8314-0800200c9a66}");
const nsComponentData2ContactID = "@mozilla.org/ComponentData2;1";


/***********************  Component Data ********************************/
function nsComponentData2()
{
    this.m_Log = null;
    this.m_dbService = null;
    this.m_dbConn = null;
    this.m_bIsReady = false;
    this.m_scriptLoader = null;
}




nsComponentData2.prototype =
{
    addElement : function (szUserName, szName, szValue)
    {
        try
        {
            this.m_Log.Write("nsComponentData.js - addElement - START");
            this.m_Log.Write("nsComponentData.js - addElement - " + szUserName + " - "+ szName +" - " + szValue);

            var szSQL =null;
            szSQL = "REPLACE INTO webmail_components (id, user_name, component_name, component_value) " +
                    "VALUES " +
                    "(" +
                    "   (" +
                    "       SELECT id FROM webmail_components  " +
                    "       WHERE user_name LIKE ?1 AND component_name LIKE ?2 " +
                    "   ), " +
                    "   ?1, " +
                    "   ?2, " +
                    "   ?3 " +
                    "); "

            var statement = this.m_dbConn.createStatement(szSQL);
            statement.bindStringParameter(0, szUserName.toLowerCase()); //username
            statement.bindStringParameter(1, szName);                   //component name
            statement.bindStringParameter(2, szValue);                  //component value
            statement.execute();

            this.m_Log.Write("nsComponentData.js - addElement - END");
            return true;
        }
        catch(err)
        {
             this.m_Log.DebugDump("nsComponentData.js: addElement : Exception : "
                                      + err.name +
                                      ".\nError message: "
                                      + err.message+ "\n"
                                      + err.lineNumber+ "\n"
                                      + this.m_dbConn.lastErrorString);
             return false;
        }
    },



    findElement : function (szUserName, szName)
    {
        try
        {
            this.m_Log.Write("nsComponentData.js - findElement - START");
            this.m_Log.Write("nsComponentData.js - findElement - "  + szUserName + " " + szName);

            var szValue = null;
            var szSQL = null;
            szSQL = "SELECT *  " +
                    "FROM webmail_components " +
                    "WHERE user_name LIKE ?1 AND component_name LIKE ?2";

            var statement = this.m_dbConn.createStatement(szSQL);
            statement.bindStringParameter(0, szUserName.toLowerCase()); //username
            statement.bindStringParameter(1, szName);                   //component name

            try
            {
                var wStatement = Components.classes["@mozilla.org/storage/statement-wrapper;1"]
                                           .createInstance(Components.interfaces.mozIStorageStatementWrapper);
                wStatement.initialize(statement);
                while (wStatement.step())
                {
                    szValue = wStatement.row["component_value"];
                    this.m_Log.Write("nsComponentData.js - findElement - data - found " + szValue);
                }
            }
            finally
            {
                statement.reset();
                this.m_Log.Write("nsComponentData : findCookie - DB Reset "+ this.m_dbConn.lastErrorString);
            }

            this.m_Log.Write(".js - findElement - END");
            return szValue;
        }
        catch(err)
        {
            this.m_Log.DebugDump("nsComponentData.js: findElement : Exception : "
                                      + err.name +
                                      ".\nError message: "
                                      + err.message+ "\n"
                                      + err.lineNumber+ "\n"
                                      + this.m_dbConn.lastErrorString);
            return null;
        }
    },



    deleteElement: function (szUserName, szName)
    {
        try
        {
            this.m_Log.Write("nsComponentData.js - deleteElement - START");
            this.m_Log.Write("nsComponentData.js - deleteElement - " + szUserName + " " + szName);

            var szSQL = "DELETE FROM webmail_components " +
                        "WHERE user_name LIKE ?1 AND component_name LIKE ?2";
            var statement = this.m_dbConn.createStatement(szSQL);
            statement.bindStringParameter(0, szUserName.toLowerCase());
            statement.bindStringParameter(1, szName);
            statement.execute();

            this.m_Log.Write("nsComponentData.js - deleteElement - END");
            return true;
        }
        catch(err)
        {
            this.m_Log.DebugDump("nsComponentData.js: deleteElement : Exception : "
                                      + err.name +
                                      ".\nError message: "
                                      + err.message+ "\n"
                                      + err.lineNumber+ "\n"
                                      + this.m_dbConn.lastErrorString);
            return false;
        }
    },



    deleteAllElements : function (szUserName)
    {
        try
        {
            this.m_Log.Write("nsComponentData.js - deleteElement - START " + szUserName);

            var szSQL = "DELETE FROM webmail_components " +
                        "WHERE user_name LIKE ?1";
            var statement = this.m_dbConn.createStatement(szSQL);
            statement.bindStringParameter(0, szUserName.toLowerCase());
            statement.execute();

            this.m_Log.Write("nsComponentData.js - deleteElement - END");
            return true;
        }
        catch(err)
        {
            this.m_Log.DebugDump("nsComponentData.js: deleteAllElements : Exception : "
                                      + err.name +
                                      ".\nError message: "
                                      + err.message+ "\n"
                                      + err.lineNumber+ "\n"
                                      + this.m_dbConn.lastErrorString);
            return false;
        }
    },





     //private functions

    loadDataBase : function()
    {
        try
        {
            this.m_Log.Write("ComponentManager.js - loadDataBase - START");

            try
            {
                this.m_dbService = Components.classes["@mozilla.org/storage/service;1"]
                                             .getService(Components.interfaces.mozIStorageService);
            }
            catch(err)
            {
                this.m_Log.Write("ComponentManager.js : startUp - SQL components NOT installed");
                throw new Error("no database");
            }

            //load DB
            /*
            var fileDB = Components.classes["@mozilla.org/file/directory_service;1"];
            fileDB = fileDB.createInstance(Components.interfaces.nsIProperties);
            fileDB = fileDB.get("ProfD", Components.interfaces.nsILocalFile);
            fileDB.append("WebmailData");         //add folder
            if (!fileDB.exists())    //check folder exist
                fileDB.create(Components.interfaces.nsIFile.DIRECTORY_TYPE, 0664);
            fileDB.append("components.db3");         //sqlite database
            fileDB.QueryInterface(Components.interfaces.nsIFile)
            this.m_Log.Write("CookieManager.js - loadDB - fileDB "+ fileDB.path);
            this.m_dbConn = this.m_dbService.openDatabase(fileDB);
            */
            this.m_dbConn = this.m_dbService.openSpecialDatabase("memory");
            if (!this.m_dbConn) return false;

            this.createDB();

            this.m_bIsReady = true;

            this.m_Log.Write("ComponentManager.js - loadDataBase - END");
            return true;
        }
        catch(err)
        {
            this.m_Log.DebugDump("ComponentManager.js: loadDataBase : Exception : "
                                          + err.name
                                          + ".\nError message: "
                                          + err.message + "\n"
                                          + err.lineNumber+ "\n"
                                          + this.m_dbConn.lastErrorString);

            return false;
        }
    },



    createDB : function ()
    {
        try
        {
            this.m_Log.Write("ComponentManager.js - createDB - START");
            var szSQL;

            //account table
            szSQL = "CREATE TABLE webmail_components " +
                    "(" +
                       "id INTEGER PRIMARY KEY AUTOINCREMENT, "+
                        "user_name TEXT, " +
                        "component_name TEXT," +
                        "component_value TEXT" +
                    ");";
            this.m_dbConn.executeSimpleSQL(szSQL);
            this.m_Log.Write("ComponentManager.js - createDB - szSQL " + szSQL);

            this.m_Log.Write("ComponentManager.js - createDB - END");

        }
        catch(err)
        {
            this.m_Log.DebugDump("ComponentManager.js: createDB : Exception : "
                                          + err.name +
                                          "\nError message: "
                                          + err.message +"\n"
                                          + "DB Error " + "\n"
                                          + err.lineNumber+ "\n"
                                          + this.m_dbConn.lastErrorString);
            return false;
        }
    },


/******************************************************************************/
/***************** XPCOM  stuff ***********************************************/
/******************************************************************************/
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
                this.m_Log = new DebugLog("webmail.logging.comms",
                                          "{3c8e8390-2cf6-11d9-9669-0800200c9a66}",
                                          "Component Manager");

                this.m_Log.Write("nsComponentData.js - profile-after-change");
                this.loadDataBase();
            break;

            case "quit-application":
                this.m_Log.Write("nsComponentData.js - quit-application ");
            break;

            case "app-startup":
            break;

            default: throw Components.Exception("Unknown topic: " + aTopic);
        }
    },



    QueryInterface : function (iid)
    {
        if (!iid.equals(Components.interfaces.nsIComponentData2)
                && !iid.equals(Components.interfaces.nsISupports)
                && !iid.equals(Components.interfaces.nsIObserver))
            throw Components.results.NS_ERROR_NO_INTERFACE;

        return this;
    }
}


/******************************************************************************/
/* FACTORY*/
var nsComponentData2Factory = new Object();

nsComponentData2Factory.createInstance = function (outer, iid)
{
    if (outer != null)
        throw Components.results.NS_ERROR_NO_AGGREGATION;

    if (!iid.equals(nsComponentData2ClassID)
            && !iid.equals(Components.interfaces.nsISupports))
        throw Components.results.NS_ERROR_INVALID_ARG;

    return new nsComponentData2();
}


/******************************************************************************/
/* MODULE */
var nsComponentData2Module = new Object();

nsComponentData2Module.registerSelf = function(compMgr, fileSpec, location, type)
{
    var catman = Components.classes["@mozilla.org/categorymanager;1"]
                           .getService(Components.interfaces.nsICategoryManager);

    catman.addCategoryEntry("xpcom-startup",
                            "WebMail Component Manager 2",
                            nsComponentData2ContactID,
                            true,
                            true);

    catman.addCategoryEntry("app-startup",
                            "WebMail Component Manager 2",
                            "service," + nsComponentData2ContactID,
                            true,
                            true);

    compMgr = compMgr.QueryInterface(Components.interfaces.nsIComponentRegistrar);
    compMgr.registerFactoryLocation(nsComponentData2ClassID,
                                    "WebMail Component Manager 2",
                                    nsComponentData2ContactID,
                                    fileSpec,
                                    location,
                                    type);
}


nsComponentData2Module.unregisterSelf = function(aCompMgr, aFileSpec, aLocation)
{
    aCompMgr = aCompMgr.QueryInterface(Components.interfaces.nsIComponentRegistrar);
    aCompMgr.unregisterFactoryLocation(nsComponentData2ClassID, aFileSpec);
}


nsComponentData2Module.getClassObject = function(compMgr, cid, iid)
{
    if (!cid.equals(nsComponentData2ClassID))
        throw Components.results.NS_ERROR_NO_INTERFACE;

    if (!iid.equals(Components.interfaces.nsIFactory))
        throw Components.results.NS_ERROR_NOT_IMPLEMENTED;

    return nsComponentData2Factory;
}


nsComponentData2Module.canUnload = function(compMgr)
{
    return true;
}
/******************************************************************************/


function NSGetModule(compMgr, fileSpec)
{
    return nsComponentData2Module;
}
