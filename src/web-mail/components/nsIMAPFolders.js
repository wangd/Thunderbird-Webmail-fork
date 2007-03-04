/*****************************  Globals   *************************************/
const nsIMAPFoldersClassID = Components.ID("{9433ab20-f658-11da-974d-0800200c9a66}");
const nsIMAPFoldersContactID = "@mozilla.org/nsIMAPFolders;1";


/***********************  UriManager ********************************/
function nsIMAPFolders()
{
    this.m_scriptLoader = null;
    this.m_Log = null;
    this.m_dbService = null;
    this.m_dbConn = null;
    this.m_dbConnDummy = null;
    this.m_iCurrentDBVersion = 1;
    this.m_bIsReady = false;
    this.m_iSession = 0;
}


nsIMAPFolders.prototype =
{
    loadDataBase : function()
    {
        try
        {
            this.m_Log.Write("nsIMAPFolders.js - loadDataBase - START");

            try
            {
                this.m_dbService = Components.classes["@mozilla.org/storage/service;1"]
                                             .getService(Components.interfaces.mozIStorageService);
            }
            catch(err)
            {
                this.m_Log.Write("nsIMAPFolders.js : startUp - SQL components NOT installed");
                throw new Error("no database");
            }

            //get location of DB
            var fileDB = Components.classes["@mozilla.org/file/directory_service;1"];
            fileDB = fileDB.createInstance(Components.interfaces.nsIProperties);
            fileDB = fileDB.get("ProfD", Components.interfaces.nsILocalFile);
            fileDB.append("WebmailData");         //add folder
            if (!fileDB.exists())    //check folder exist
                fileDB.create(Components.interfaces.nsIFile.DIRECTORY_TYPE, 0664);
            fileDB.append("imapdata.db3");         //sqlite database
            fileDB.QueryInterface(Components.interfaces.nsIFile)
            this.m_Log.Write("nsIMAPFolders.js - loadDB - fileDB "+ fileDB.path);

            //load DB
            this.m_dbConn = this.m_dbService.openDatabase(fileDB);
            if (!this.m_dbConn) return false;

            var iVersion = this.getDBVersion();
            if (iVersion == -1)
                this.createDB();
            else if (iVersion != this.m_iCurrentDBVersion)
                this.updateDB(iVersion);

            this.m_iSession = this.getSession();

            this.m_bIsReady = true;

            this.m_Log.Write("nsIMAPFolders.js - loadDataBase - END");
            return true;
        }
        catch(err)
        {
            this.m_Log.DebugDump("nsIMAPFolders.js: loadDataBase : Exception : "
                                          + err.name
                                          + ".\nError message: "
                                          + err.message + "\n"
                                          + err.lineNumber);

            return false;
        }
    },




    getDBVersion : function ()
    {
        try
        {
            this.m_Log.Write("nsIMAPFolders.js - getDBVersion - START");

            var iVersion = -1;

            try
            {
                var szVersion = "SELECT version FROM imap_schema_version LIMIT 1";
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
                    this.m_Log.Write("nsIMAPFolders : getDBversion - DB Reset");
                }
            }
            catch (e)
            {
                iVersion = -1;
            }

            this.m_Log.Write("nsIMAPFolders.js - getDBVersion - "+ iVersion);
            this.m_Log.Write("nsIMAPFolders.js - getDBVersion - END");
            return iVersion;
        }
        catch(err)
        {
            this.m_Log.DebugDump("nsIMAPFolders.js: getDBVersion : Exception : "
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
            this.m_Log.Write("nsIMAPFolders.js - createDB - START");
            var szSQL;

            //dummy table
            szSQL = "CREATE TABLE dummy_table (id INTEGER PRIMARY KEY);";
            this.m_Log.Write("nsIMAPFolders.js - createDB - szSQL " + szSQL);
            this.m_dbConn.executeSimpleSQL(szSQL);
            szSQL = "INSERT OR IGNORE INTO dummy_table VALUES (1)";
            this.m_dbConn.executeSimpleSQL(szSQL);


            //Version table
            szSQL = "CREATE TABLE imap_schema_version (version INTEGER);";
            this.m_dbConn.executeSimpleSQL(szSQL);
            szSQL = "INSERT INTO imap_schema_version VALUES(1);";
            this.m_dbConn.executeSimpleSQL(szSQL);


            //session table
            szSQL = "CREATE TABLE session ";
            szSQL +="(";
            szSQL +=    "id INTEGER PRIMARY KEY, ";
            szSQL +=    "session INTEGER ";
            szSQL +=");";
            this.m_dbConn.executeSimpleSQL(szSQL);
            this.m_Log.Write("nsIMAPFolders.js - createDB - szSQL " + szSQL);
            szSQL = "INSERT INTO session (id ,session) VALUES (1, 1)";
            this.m_dbConn.executeSimpleSQL(szSQL);


            //account table
            szSQL = "CREATE TABLE imap_accounts ";
            szSQL +="(";
            szSQL +=    "id INTEGER PRIMARY KEY AUTOINCREMENT, ";
            szSQL +=    "account_name TEXT ";
            szSQL +=");";
            this.m_dbConn.executeSimpleSQL(szSQL);
            this.m_Log.Write("nsIMAPFolders.js - createDB - szSQL " + szSQL);


            //subscribed folder list
            szSQL = "CREATE TABLE subscribed_folders ";
            szSQL +="(";
            szSQL +=    "id INTEGER PRIMARY KEY AUTOINCREMENT, ";
            szSQL +=    "account_id INTEGER, ";
            szSQL +=    "folder_hierarchy TEXT ";
            szSQL +=");";
            this.m_dbConn.executeSimpleSQL(szSQL);
            this.m_Log.Write("nsIMAPFolders.js - createDB - szSQL " + szSQL);


            //folder table
            szSQL = "CREATE TABLE folders ";
            szSQL +="(";
            szSQL +=    "id INTEGER PRIMARY KEY AUTOINCREMENT, ";
            szSQL +=    "account_id INTEGER, ";
            szSQL +=    "folder_hierarchy TEXT, ";
            szSQL +=    "folder_url TEXT, ";
            szSQL +=    "session INTEGER ";
            szSQL +=");";
            this.m_dbConn.executeSimpleSQL(szSQL);
            this.m_Log.Write("nsIMAPFolders.js - createDB - szSQL " + szSQL);



            //message table
            szSQL = "CREATE TABLE messages ";
            szSQL +="(";
            szSQL +=    "id INTEGER PRIMARY KEY AUTOINCREMENT, ";
            szSQL +=    "account_id INTEGER, ";
            szSQL +=    "folder_id INTEGER,"
            szSQL +=    "href TEXT,";
            szSQL +=    "uid TEXT,";
            szSQL +=    "recipient TEXT,";
            szSQL +=    "sender TEXT,";
            szSQL +=    "subject TEXT,";
            szSQL +=    "date TEXT,";
            szSQL +=    "size TEXT,";
            szSQL +=    "read BOOLEAN,";
            szSQL +=    "deleted BOOLEAN,";
            szSQL +=    "session INTEGER";
            szSQL +=");";
            this.m_dbConn.executeSimpleSQL(szSQL);
            this.m_Log.Write("nsIMAPFolders.js - createDB - szSQL " + szSQL);


            //folder update table
            szSQL  =  "CREATE TABLE last_folder_update  ";
            szSQL += "( " ;
            szSQL += "    id INTEGER PRIMARY KEY, ";
            szSQL += "    account_id INTEGER, ";
            szSQL += "    folder_id INTEGER, ";
            szSQL += "    session INTEGER, " ;
            szSQL += "    date DATE ";
            szSQL += ")";
            this.m_dbConn.executeSimpleSQL(szSQL);
            this.m_Log.Write("nsIMAPFolders.js - createDB - szSQL " + szSQL);


            //trigger on Insert in messages
            szSQL  = "CREATE TRIGGER trigger_insert_messages INSERT ON messages "
            szSQL += "BEGIN ";
            szSQL += "     REPLACE INTO last_folder_update (id , account_id, folder_id, session,date) ";
            szSQL += "     VALUES ";
            szSQL += "     ( ";
            szSQL += "           (SELECT id ";
            szSQL += "             FROM last_folder_update ";
            szSQL += "            WHERE account_id = NEW.account_id AND ";
            szSQL += "                   folder_id = NEW.folder_id ";
            szSQL += "            ),";
            szSQL += "            NEW.account_id, ";
            szSQL += "            NEW.folder_id, ";
            szSQL += "            NEW.session, ";
            szSQL += "            current_timestamp ";
            szSQL += "     ); ";
            szSQL += "END"
            this.m_dbConn.executeSimpleSQL(szSQL);
            this.m_Log.Write("nsIMAPFolders.js - createDB - szSQL " + szSQL);


            //Table last_user_update
            szSQL  = "CREATE TABLE last_user_update ";
            szSQL += "( ";
            szSQL += "   id INTEGER PRIMARY KEY, "
            szSQL += "   account_id INTEGER, "
            szSQL += "   session INTEGER, "
            szSQL += "   date DATE "
            szSQL += ")";
            this.m_dbConn.executeSimpleSQL(szSQL);
            this.m_Log.Write("nsIMAPFolders.js - createDB - szSQL " + szSQL);


            szSQL  = "CREATE TRIGGER trigger_insert_folders INSERT ON folders "
            szSQL += "BEGIN ";
            szSQL += "     REPLACE INTO last_user_update (id, account_id, session, date) ";
            szSQL += "     VALUES ";
            szSQL += "     ( ";
            szSQL += "          (SELECT id ";
            szSQL += "           FROM last_user_update ";
            szSQL += "           WHERE account_id = NEW.account_id ";
            szSQL += "           LIMIT 1 ";
            szSQL += "          ), ";
            szSQL += "          NEW.account_id, ";
            szSQL += "          NEW.session, ";
            szSQL += "          current_timestamp ";
            szSQL += "     ); ";
            szSQL += "END"
            this.m_dbConn.executeSimpleSQL(szSQL);
            this.m_Log.Write("nsIMAPFolders.js - createDB - szSQL " + szSQL);


            this.m_Log.Write("nsIMAPFolders.js - createDB - END");

        }
        catch(err)
        {
            this.m_Log.DebugDump("nsDataBaseManager.js: createDB : Exception : "
                                          + err.name +
                                          "\nError message: "
                                          + err.message +"\n"
                                          + "DB Error " + "\n"
                                          + err.lineNumber+ "\n"
                                          + this.m_dbConn.lastErrorString);
            return false;
        }
    },




    getSession : function ()
    {
        try
        {
            this.m_Log.Write("nsIMAPFolders.js - getSession - START");

            var iSession = 0;

            var szSQL = "SELECT session FROM session"
            var statement = this.m_dbConn.createStatement(szSQL);
            var wStatement = Components.classes["@mozilla.org/storage/statement-wrapper;1"]
                                       .createInstance(Components.interfaces.mozIStorageStatementWrapper);
            try
            {
                wStatement.initialize(statement);
                if (wStatement.step()) iSession = wStatement.row["session"];
            }
            finally
            {
                wStatement.reset();
                this.m_Log.Write("nsIMAPFolders : getSession - DB Reset");
            }

            iSession++;

            szSQL = "REPLACE INTO session (id, session) VALUES (1, ?1)";
            statement = this.m_dbConn.createStatement(szSQL);
            statement.bindStringParameter(0, iSession);
            statement.execute();

            this.m_Log.Write("nsIMAPFolders.js - getSession - END " + iSession);
            return iSession;
        }
        catch(err)
        {
            this.m_Log.DebugDump("nsDataBaseManager.js: createDB : Exception : "
                                          + err.name +
                                          "\nError message: "
                                          + err.message +"\n"
                                          + "DB Error " + "\n"
                                          + err.lineNumber+ "\n"
                                          + this.m_dbConn.lastErrorString);
            return 0;
        }
    },



    createUser : function (szUserName)
    {
        try
        {
            this.m_Log.Write("nsIMAPFolders.js - createUser - START");
            this.m_Log.Write("nsIMAPFolders.js - createUser - " +szUserName);

            var szSQL = "REPLACE INTO imap_accounts (id, account_name) ";
            szSQL    += "VALUES ";
            szSQL    += "(" ;
            szSQL    += "  (SELECT id FROM imap_accounts WHERE account_name LIKE ?1),";
            szSQL    += "  ?1";
            szSQL    += ");";

            var statement = this.m_dbConn.createStatement(szSQL);
            statement.bindStringParameter(0, szUserName.toLowerCase());
            statement.execute();

            this.m_Log.Write("nsIMAPFolders.js - createUser - END");
        }
        catch(e)
        {
            this.m_Log.DebugDump("nsIMAPFolders.js: createUser : Exception : "
                                          + e.name +
                                          ".\nError message: "
                                          + e.message+ "\n"
                                          + e.lineNumber+ "\n" +
                                          this.m_dbConn.lastErrorString);
            return false;
        }
    },




    listSubscribed : function (szAddress, iCount, aszFolders)
    {
        try
        {
            this.m_Log.Write("nsIMAPFolder.js - listSubscribed - Start");
            this.m_Log.Write("nsIMAPFolder.js - listSubscribed - "+szAddress);

            var bReturn = false;
            var szSQL = "SELECT subscribed_folders.folder_hierarchy "
            szSQL    += "FROM subscribed_folders, imap_accounts, folders ";
            szSQL    += "WHERE imap_accounts.account_name LIKE ?1 AND " +
                        "      imap_accounts.id = subscribed_folders.account_id  AND " +
                        "      subscribed_folders.folder_hierarchy LIKE folders.folder_hierarchy  AND " +
                        "      folders.session = ?2 "
            var statement = this.m_dbConn.createStatement(szSQL);
            statement.bindStringParameter(0, szAddress.toLowerCase());
            statement.bindStringParameter(1, this.m_iSession);

            var aResult = new Array();
            try
            {
                var wStatement = Components.classes["@mozilla.org/storage/statement-wrapper;1"]
                                       .createInstance(Components.interfaces.mozIStorageStatementWrapper);
                wStatement.initialize(statement);
                while (wStatement.step())
                {
                   aResult.push(wStatement.row["folder_hierarchy"]);
                   bReturn = true;
                }
            }
            finally
            {
                statement.reset();
                this.m_Log.Write("nsIMAPFolder : listSubscribed - DB Reset "+ this.m_dbConn.lastErrorString);
            }

            iCount.value = aResult.length;
            aszFolders.value = aResult;
            bReturn = true;

            this.m_Log.Write("nsIMAPFolder.js - listSubscribed - " + iCount.value + " " + aszFolders.value);
            this.m_Log.Write("nsIMAPFolder.js - listSubscribed - End");
            return bReturn;
        }
        catch(err)
        {
            this.m_Log.DebugDump("nsIMAPFolder.js: listSubscribed : Exception : "
                                          + err.name
                                          + ".\nError message: "
                                          + err.message + "\n"
                                          + err.lineNumber+ "\n" +
                                          this.m_dbConn.lastErrorString);
            return false;
        }
    },




    subscribeFolder :function (szAddress, szFolder)
    {
        try
        {
            this.m_Log.Write("nsIMAPFolder.js - subscribeFolder - Start");
            this.m_Log.Write("nsIMAPFolder.js - subscribeFolder - "+szAddress + " " + szFolder);

            var bReturn = false;

            var szSQL = "REPLACE INTO subscribed_folders (id, account_id, folder_hierarchy) ";
            szSQL    += "VALUES ";
            szSQL    += "(";
            szSQL    += "   (";
            szSQL    += "        SELECT subscribed_folders.id " +
                                 "FROM subscribed_folders, imap_accounts " +
                                 "WHERE imap_accounts.account_name  LIKE ?1 AND " +
                                       "imap_accounts.id = subscribed_folders.account_id  AND " +
                                       "subscribed_folders.folder_hierarchy  = ?2";
            szSQL    += "    ),"
            szSQL    += "    ("
            szSQL    += "        SELECT imap_accounts.id " +
                                 "FROM imap_accounts " +
                                 "WHERE imap_accounts.account_name LIKE ?1 " +
                                 "LIMIT 1"
            szSQL    += "     ),";
            szSQL    += "     ?2";
            szSQL    += ")"

            var statement = this.m_dbConn.createStatement(szSQL);
            statement.bindStringParameter(0, szAddress.toLowerCase());
            statement.bindStringParameter(1, szFolder);
            statement.execute();

            this.m_Log.Write("nsIMAPFolder.js - subscribeFolder - End");
            return bReturn;
        }
        catch(err)
        {
            this.m_Log.DebugDump("nsIMAPFolder.js: subscribeFolder : Exception : "
                                          + err.name
                                          + ".\nError message: "
                                          + err.message + "\n"
                                          + err.lineNumber+ "\n" +
                                          this.m_dbConn.lastErrorString);
            return false;
        }
    },




    unsubscribeFolder : function (szAddress, szFolder)
    {
        try
        {
            this.m_Log.Write("nsIMAPFolder.js - unsubscribeFolder - Start");
            this.m_Log.Write("nsIMAPFolder.js - unsubscribeFolder - "+szAddress + " " + szFolder);

            var bFound = true;
            var szSQL = "DELETE FROM subscribed_folders ";
            szSQL   +=  "WHERE account_id = (SELECT id FROM imap_accounts WHERE account_name LIKE ?1) AND folder_hierarchy = ?2";
            var statement = this.m_dbConn.createStatement(szSQL);
            statement.bindStringParameter(0, szAddress.toLowerCase());
            statement.bindStringParameter(1, szFolder);
            statement.execute();

            this.m_Log.Write("nsIMAPFolder.js - unsubscribeFolder - End");
            return bFound;
        }
        catch(err)
        {
            this.m_Log.DebugDump("nsIMAPFolder.js: unsubscribeFolder : Exception : "
                                          + err.name
                                          + ".\nError message: "
                                          + err.message + "\n"
                                          + err.lineNumber+ "\n" +
                                          this.m_dbConn.lastErrorString);
            return false;
        }
    },




    addFolder : function (szUser, szHiererchy, szHref)
    {
        try
        {
            this.m_Log.Write("nsIMAPFolder.js - addFolder - Start");
            this.m_Log.Write("nsIMAPFolder.js - addFolder - "+ szUser + " " + szHiererchy + " " + szHref);

            var szSQL = "REPLACE INTO folders (id, account_id, folder_hierarchy, folder_url, session) "
            szSQL    += "VALUES ";
            szSQL    += "(";
            szSQL    += "   (";
            szSQL    += "        SELECT folders.id " +
                                 "FROM folders, imap_accounts " +
                                 "WHERE imap_accounts.account_name LIKE ?1 AND " +
                                       "imap_accounts.id = folders.account_id  AND " +
                                       "folders.folder_hierarchy  = ?2";
            szSQL    += "    ),"
            szSQL    += "    ("
            szSQL    += "        SELECT imap_accounts.id  " +
                                 "FROM imap_accounts " +
                                 "WHERE imap_accounts.account_name LIKE ?1 " +
                                 "LIMIT 1"
            szSQL    += "     ),";
            szSQL    += "     ?2,";
            szSQL    += "     ?3,";
            szSQL    += "     ?4";
            szSQL    += ");"

            var statement = this.m_dbConn.createStatement(szSQL);
            statement.bindStringParameter(0, szUser.toLowerCase());
            statement.bindStringParameter(1, szHiererchy);
            statement.bindStringParameter(2, szHref);
            statement.bindStringParameter(3, this.m_iSession);
            statement.execute();

            this.m_Log.Write("nsIMAPFolder.js - addFolder - End");
            return true;
        }
        catch(err)
        {
            this.m_Log.DebugDump("nsIMAPFolder.js: addFolder : Exception : "
                                          + err.name
                                          + ".\nError message: "
                                          + err.message + "\n"
                                          + err.lineNumber+ "\n" +
                                          this.m_dbConn.lastErrorString);
            return false;
        }
    },




    deleteFolder : function (szUser, szHiererchy)
    {
        try
        {
            this.m_Log.Write("nsIMAPFolder.js - deleteFolder - Start");
            this.m_Log.Write("nsIMAPFolder.js - deleteFolder - "+ szUser + " " + szHiererchy);

            var szSQL = "DELETE FROM folders "
            szSQL    += "WHERE (account_id = (SELECT id FROM imap_accounts WHERE account_name LIKE ?1)) AND folder_hierarchy LIKE ?2 "

            var statement = this.m_dbConn.createStatement(szSQL);
            statement.bindStringParameter(0, szUser.toLowerCase());
            statement.bindStringParameter(1, szHiererchy);
            statement.execute();

            this.m_Log.Write("nsIMAPFolder.js - deleteFolder - End");
            return true;
        }
        catch(err)
        {
            this.m_Log.DebugDump("nsIMAPFolder.js: deleteFolder : Exception : "
                                          + err.name
                                          + ".\nError message: "
                                          + err.message + "\n"
                                          + err.lineNumber + "\n" +
                                          this.m_dbConn.lastErrorString);
            return false;
        }
    },




    renameFolder : function (szUser, szOldHierarchy, szNewHierarchy, szNewHref)
    {
        try
        {
            this.m_Log.Write("nsIMAPFolder.js - renameFolder - Start");
            this.m_Log.Write("nsIMAPFolder.js - renameFolder - "+ szUser + " " + szOldHierarchy + " " + szNewHierarchy + " " + szNewHref);

            var szSQL = "UPDATE folders ";
            szSQL    += "SET folder_hierarchy = ?3, " +
                            "folder_url = ?4 ";
            szSQL    += "WHERE id = ( SELECT folders.id " +
                                     "FROM folders, imap_accounts " +
                                     "WHERE imap_accounts.account_name LIKE ?1 AND " +
                                     "      imap_accounts.id = folders.account_id  AND " +
                                     "      folders.folder_hierarchy  = ?2 " +
                                    ");"

            var statement = this.m_dbConn.createStatement(szSQL);
            statement.bindStringParameter(0, szUser.toLowerCase());
            statement.bindStringParameter(1, szOldHierarchy);
            statement.bindStringParameter(2, szNewHierarchy);
            statement.bindStringParameter(3, szNewHref);
            statement.execute();


            this.m_Log.Write("nsIMAPFolder.js - renameFolder - End");
            return true;
        }
        catch(err)
        {
            this.m_Log.DebugDump("nsIMAPFolder.js: renameFolder : Exception : "
                                          + err.name
                                          + ".\nError message: "
                                          + err.message + "\n"
                                          + err.lineNumber + "\n" +
                                          this.m_dbConn.lastErrorString);
            return false;
        }
    },




    getHierarchies : function (szUser, szHierarchy ,iCount, aszFolders)
    {
        try
        {
            this.m_Log.Write("nsIMAPFolder.js - getAllHiererchy - START");
            this.m_Log.Write("nsIMAPFolder.js - getAllHiererchy - " + szUser + " " +szHierarchy);
            if (!szHierarchy) throw new Error("no szHierarchy");
            if (szHierarchy.search(/INBOX/)==-1) throw new Error("searching not for inbox");

            var bResult = false;
            var aResult = new Array();
            var szSQL;
            var statement;


            if (szHierarchy.search(/INBOX\.(.*?)\.\*|\%$/)!=-1)
            {
                var aHierarchy = szHierarchy.split(/\./);
                this.m_Log.Write("nsIMAPFolder.js - getAllHiererchy - aHierarchy " + aHierarchy);
                szHierarchy =  aHierarchy[0] + "."+ aHierarchy[1];
                this.m_Log.Write("nsIMAPFolder.js - getAllHiererchy - szHierarchy " + szHierarchy);
            }

            if (szHierarchy.search(/INBOX\.\*|\%$/)!=-1)
            {
                this.m_Log.Write("nsIMAPFolder.js - getAllHiererchy - wildcard ");
                szSQL  = "SELECT folder_hierarchy "
                szSQL += "FROM folders, imap_accounts "
                szSQL += "WHERE folders.account_id = imap_accounts.id AND " +
                                "imap_accounts.account_name LIKE ?1 AND " +
                                "session = ?2"
                statement = this.m_dbConn.createStatement(szSQL);
                statement.bindStringParameter(0, szUser);
                statement.bindStringParameter(1, this.m_iSession);
            }
            else
            {
                szSQL  = "SELECT folder_hierarchy "
                szSQL += "FROM folders, imap_accounts "
                szSQL += "WHERE folders.account_id = imap_accounts.id AND " +
                                "imap_accounts.account_name LIKE ?1 AND " +
                                "folder_hierarchy LIKE ?2 AND " +
                                "session = ?3"
                statement = this.m_dbConn.createStatement(szSQL);
                statement.bindStringParameter(0, szUser);
                statement.bindStringParameter(1, szHierarchy);
                statement.bindStringParameter(2, this.m_iSession);
            }

            try
            {
                var wStatement = Components.classes["@mozilla.org/storage/statement-wrapper;1"]
                                       .createInstance(Components.interfaces.mozIStorageStatementWrapper);
                wStatement.initialize(statement);
                while (wStatement.step())
                {
                   aResult.push(wStatement.row["folder_hierarchy"]);
                   bResult = true;
                }
            }
            finally
            {
                statement.reset();
                this.m_Log.Write("nsIMAPFolder : getAllHiererchy - DB Reset "+ this.m_dbConn.lastErrorString);
            }


            iCount.value = aResult.length;
            aszFolders.value = aResult;
            this.m_Log.Write("nsIMAPFolder.js - getAllHiererchy - " + iCount.value + " " + aszFolders.value);
            this.m_Log.Write("nsIMAPFolder.js - getAllHiererchy - End");
            return bResult;
        }
        catch(err)
        {
            this.m_Log.DebugDump("nsIMAPFolder.js: getAllHiererchy : Exception : "
                                          + err.name
                                          + ".\nError message: "
                                          + err.message + "\n"
                                          + err.lineNumber + "\n" +
                                          this.m_dbConn.lastErrorString);
            return false;
        }
    },




    getFolderDetails : function (szUser, szHierarchy, szHref, szUID, iMSGCount, iUnreadCount, iExpungeCount)
    {
        try
        {
            this.m_Log.Write("nsIMAPFolder.js - getFolderDetails - Start");
            this.m_Log.Write("nsIMAPFolder.js - getFolderDetails - " + szUser + " " + szHierarchy);

            var bResult = false;

            var szSQL = "SELECT folders.id, " +
                               "folders.folder_url," +
                               "(    SELECT COUNT(*) "+
                                "    FROM messages, folders, imap_accounts " +
                                "    WHERE folders.account_id = imap_accounts.id AND " +
                                "          messages.account_id = imap_accounts.id AND"+
                                "          imap_accounts.account_name LIKE ?1 AND "+
                                "          folders.id = messages.folder_id AND "+
                                "          folders.folder_hierarchy LIKE ?2 AND " +
                                "          messages.session = ?3 AND " +
                                "          messages.deleted = \"false\" " +
                                ") AS message_count, " +
                                "(   SELECT COUNT(*) " +
                                "    FROM messages, folders, imap_accounts " +
                                "    WHERE folders.account_id = imap_accounts.id AND " +
                                "          messages.account_id = imap_accounts.id AND"+
                                "          imap_accounts.account_name LIKE ?1 AND " +
                                "          folders.id = messages.folder_id AND "+
                                "          folders.folder_hierarchy LIKE ?2 AND " +
                                "          messages.read = \"false\" AND " +
                                "          messages.deleted = \"false\" AND " +
                                "          messages.session = ?3 " +
                                ") AS read_count, " +
                                "(   SELECT COUNT(*) " +
                                    "FROM messages, folders, imap_accounts " +
                                    "WHERE folders.account_id = imap_accounts.id AND " +
                                          "messages.account_id = imap_accounts.id AND " +
                                          "imap_accounts.account_name LIKE ?1 AND " +
                                          "folders.id = messages.folder_id AND " +
                                          "folders.folder_hierarchy LIKE ?2 AND " +
                                          "messages.deleted = \"true\" AND " +
                                          "messages.session = ?3 " +
                                ") AS expunge_count ";
            szSQL    += "FROM folders, imap_accounts "
            szSQL    += "WHERE folders.account_id = imap_accounts.id AND " +
                              "imap_accounts.account_name LIKE ?1 AND " +
                              "folders.folder_hierarchy LIKE ?2 AND " +
                              "folders.session = ?3 "
            szSQL    += "LIMIT 1;"


            var statement = this.m_dbConn.createStatement(szSQL);
            statement.bindStringParameter(0, szUser);
            statement.bindStringParameter(1, szHierarchy);
            statement.bindStringParameter(2, this.m_iSession);

            try
            {
                var wStatement = Components.classes["@mozilla.org/storage/statement-wrapper;1"]
                                       .createInstance(Components.interfaces.mozIStorageStatementWrapper);
                wStatement.initialize(statement);
                while (wStatement.step())
                {
                    szUID.value = wStatement.row["id"];
                    this.m_Log.Write("nsIMAPFolder.js - getFolderDetails - "+ szUID.value);
                    szHref.value = wStatement.row["folder_url"];
                    this.m_Log.Write("nsIMAPFolder.js - getFolderDetails - " + szHref.value);
                    iMSGCount.value =  wStatement.row["message_count"];
                    this.m_Log.Write("nsIMAPFolder.js - getFolderDetails - " + iMSGCount.value);
                    iUnreadCount.value =  wStatement.row["read_count"];
                    this.m_Log.Write("nsIMAPFolder.js - getFolderDetails - " + iUnreadCount.value);
                    iExpungeCount.value =  wStatement.row["expunge_count"];
                    this.m_Log.Write("nsIMAPFolder.js - getFolderDetails - " + iExpungeCount.value);
                    bResult = true;
                }
            }
            finally
            {
                statement.reset();
                this.m_Log.Write("nsIMAPFolder : getAllHiererchy - DB Reset "+ this.m_dbConn.lastErrorString);
            }

            this.m_Log.Write("nsIMAPFolder.js - getFolderDetails - End " +bResult);
            return bResult;
        }
        catch(err)
        {
             this.m_Log.DebugDump("nsIMAPFolder.js: getFolderDetails : Exception : "
                                          + err.name
                                          + ".\nError message: "
                                          + err.message + "\n"
                                          + err.lineNumber + "\n" +
                                          this.m_dbConn.lastErrorString);
            return false;
        }
    },




    addMSG : function (szUser, szHierarchy, szHref, szUID, bRead, szTo, szFrom, szSubject, szDate, iSize)
    {
        try
        {
            this.m_Log.Write("nsIMAPFolder.js - addMSG - Start");
            this.m_Log.Write("nsIMAPFolder.js - addMSG - " + szUser + " " + szHierarchy + " " + szHref + " " + szUID + " " + bRead +" "
                                                           + szTo + " " + szFrom + " " + szSubject + " " + szDate + " " + iSize);
            var bResult = false;

            var szSQL = "REPLACE INTO messages " ;
            szSQL    +=         "(id, account_id, folder_id, uid, href, recipient, sender, subject, date, size, read, deleted ,session) "
            szSQL    += "VALUES ";
            szSQL    += "(";
            szSQL    += "    (" +
                                "SELECT messages.id " +
                                "FROM messages, imap_accounts, folders " +
                                "WHERE messages.account_id = imap_accounts.id  AND  " +
                                      "imap_accounts.id = folders.account_id  AND " +
                                      "imap_accounts.account_name LIKE ?1 AND " +
                                      "messages.folder_id = folders.id AND " +
                                      "folders.folder_hierarchy LIKE ?2 AND " +
                                      "messages.uid = ?3 AND " +
                                      "messages.deleted = \"false\" " +
                                "LIMIT 1 "
            szSQL    += "    ),"
            szSQL    += "    (" +
                                 "SELECT imap_accounts.id  " +
                                 "FROM imap_accounts " +
                                 "WHERE imap_accounts.account_name LIKE ?1 " +
                                 "LIMIT 1 "
            szSQL    += "     ),";
            szSQL    += "    (" +
                                 "SELECT folders.id " +
                                 "FROM folders, imap_accounts " +
                                 "WHERE imap_accounts.account_name LIKE ?1 AND " +
                                       "imap_accounts.id = folders.account_id AND " +
                                       "folders.folder_hierarchy LIKE ?2 " +
                                 "LIMIT 1 "
            szSQL    += "     ),"
            szSQL    += "     ?3,";
            szSQL    += "     ?4,";
            szSQL    += "     ?5,";
            szSQL    += "     ?6,";
            szSQL    += "     ?7,";
            szSQL    += "     ?8,";
            szSQL    += "     ?9,";
            szSQL    += "     ?10,";
            szSQL    += "     ?11,";
            szSQL    += "     ?12";
            szSQL    += ");"

            var statement = this.m_dbConn.createStatement(szSQL);
            statement.bindStringParameter(0, szUser);
            statement.bindStringParameter(1, szHierarchy);
            statement.bindStringParameter(2, szUID);
            statement.bindStringParameter(3, szHref);
            statement.bindStringParameter(4, szTo);
            statement.bindStringParameter(5, szFrom);
            statement.bindStringParameter(6, szSubject);
            statement.bindStringParameter(7, szDate);
            statement.bindStringParameter(8, iSize);
            statement.bindStringParameter(9, bRead);
            statement.bindStringParameter(10, "false");
            statement.bindStringParameter(11, this.m_iSession);
            statement.execute();

            this.m_Log.Write("nsIMAPFolder.js - addMSG - End " +bResult);
            return bResult;
        }
        catch(err)
        {
            this.m_Log.DebugDump("nsIMAPFolder.js: addMSG : Exception : "
                                          + err.name
                                          + ".\nError message: "
                                          + err.message + "\n"
                                          + err.lineNumber + "\n" +
                                          this.m_dbConn.lastErrorString);
            return false;
        }
    },




    copyMSG : function (szUser , szUID, szOldHierarchy, szNewHierarchy)
    {
        try
        {
            this.m_Log.Write("nsIMAPFolder.js - copyMSG - Start");
            this.m_Log.Write("nsIMAPFolder.js - copyMSG - " + szUser + " " + szOldHierarchy + " " + szUID + " " +szNewHierarchy);
            var bResult = false;

            var szSQL ="SELECT  messages.href," +
                               "messages.recipient," +
                               "messages.sender, " +
                               "messages.subject, " +
                               "messages.date, " +
                               "messages.size, " +
                               "messages.read, " +
                               "messages.uid "
            szSQL   += "FROM folders, imap_accounts, messages "
            szSQL   += "WHERE  folders.account_id = imap_accounts.id AND " +
                              "messages.account_id =  imap_accounts.id AND " +
                              "imap_accounts.account_name LIKE ?1 AND " +
                              "folders.id = messages.folder_id AND " +
                              "folders.folder_hierarchy LIKE ?2 AND  " +
                              "messages.session = ?3 AND " +
                              "messages.id= ?4 "
            szSQL   += "LIMIT 1"

            var statement = this.m_dbConn.createStatement(szSQL);
            statement.bindStringParameter(0, szUser);
            statement.bindStringParameter(1, szOldHierarchy);
            statement.bindStringParameter(2, this.m_iSession);
            statement.bindStringParameter(3, szUID);

            var szHref = null;
            var szTo = null;
            var szFrom = null;
            var szSubject = null;
            var szDate = null;
            var iSize = 0;
            var bRead = false;

            try
            {
                var wStatement = Components.classes["@mozilla.org/storage/statement-wrapper;1"]
                                           .createInstance(Components.interfaces.mozIStorageStatementWrapper);
                wStatement.initialize(statement);
                while (wStatement.step())
                {
                   szHref = wStatement.row["href"];
                   szTo = wStatement.row["recipient"];
                   szFrom = wStatement.row["sender"];
                   szSubject = wStatement.row["subject"];
                   szDate = wStatement.row["date"];
                   iSize = Number(wStatement.row["size"]);
                   var szRead = wStatement.row["read"];
                   bRead = (szRead.search(/true/i)!=-1) ? true : false;
                   szMSGID = wStatement.row["uid"];
                }
            }
            finally
            {
                statement.reset();
                this.m_Log.Write("nsIMAPFolder : copyMSG - DB Reset "+ this.m_dbConn.lastErrorString);
            }


            bResult = this.addMSG(szUser, szNewHierarchy, szHref, szMSGID, bRead, szTo, szFrom, szSubject, szDate, iSize);

            this.m_Log.Write("nsIMAPFolder.js - copyMSG - END " + bResult);
            return bResult;
        }
        catch(err)
        {
            this.m_Log.DebugDump("nsIMAPFolder.js: copyMSG : Exception : "
                                          + err.name
                                          + ".\nError message: "
                                          + err.message + "\n"
                                          + err.lineNumber + "\n" +
                                          this.m_dbConn.lastErrorString);
            return false;
        }
    },




    getRangeMSGIDs : function (szUser, szHierarchy, iMinID, iMaxID, iCount, aiIDs)
    {
        try
        {
            this.m_Log.Write("nsIMAPFolder.js - getMSGUIDS - Start");
            this.m_Log.Write("nsIMAPFolder.js - getMSGUIDS - " + szUser + " " + szHierarchy + " " + iMinID + " " + iMaxID);

            var bResult = false;
            var aResults = new Array();

            var szSQL  = "SELECT messages.id "
            szSQL     += "FROM messages, imap_accounts, folders "
            szSQL     += "WHERE folders.account_id = imap_accounts.id AND " +
                        "       imap_accounts.account_name LIKE ?1 AND " +
                        "       folders.id = messages.folder_id AND " +
                        "       folders.folder_hierarchy LIKE ?2 AND " +
                        "       messages.session = ?3 AND" +
                        "       messages.id >= ?4 ";
            if (iMaxID != -1) szSQL += " AND messages.id <= ?5 "
            szSQL    += "ORDER BY messages.id ASC ";
            this.m_Log.Write("nsIMAPFolder.js - getMSGUIDS - " + szSQL);

            var statement = this.m_dbConn.createStatement(szSQL);
            statement.bindStringParameter(0, szUser);
            statement.bindStringParameter(1, szHierarchy);
            statement.bindStringParameter(2, this.m_iSession);
            statement.bindStringParameter(3, iMinID);
            if (iMaxID != -1) statement.bindStringParameter(4, iMaxID);

            try
            {
                var wStatement = Components.classes["@mozilla.org/storage/statement-wrapper;1"]
                                           .createInstance(Components.interfaces.mozIStorageStatementWrapper);
                wStatement.initialize(statement);
                while (wStatement.step())
                {
                   aResults.push(wStatement.row["id"])
                   bResult = true;
                }
            }
            finally
            {
                statement.reset();
                this.m_Log.Write("nsIMAPFolder : getAllHiererchy - DB Reset "+ this.m_dbConn.lastErrorString);
            }

            iCount.value = aResults.length;
            aiIDs.value = aResults;
            this.m_Log.Write("nsIMAPFolder.js - getMSGUIDS - End " +bResult + " " + aiIDs.value);
            this.m_Log.Write("nsIMAPFolder.js - getMSGUIDS - End ");
            return bResult;
        }
        catch(err)
        {
            this.m_Log.DebugDump("nsIMAPFolder.js: getMSGUIDS : Exception : "
                                          + err.name
                                          + ".\nError message: "
                                          + err.message + "\n"
                                          + err.lineNumber + "\n" +
                                          this.m_dbConn.lastErrorString);
            return false;
        }
    },





    getMSGHeaders : function (szUser, szHierarchy, szUID, szHref, bRead, bDelete, szTo, szFrom, szSubject, szDate, iSize, iSeqNum)
    {
        try
        {
            this.m_Log.Write("nsIMAPFolder.js - getMSG - Start");
            this.m_Log.Write("nsIMAPFolder.js - getMSG - " + szUser + " " + szHierarchy + " " + szUID);
            var bResult = false;

            var szSQL ="SELECT  messages.href," +
                               "messages.recipient," +
                               "messages.sender, " +
                               "messages.subject, " +
                               "messages.date, " +
                               "messages.size, " +
                               "messages.read, " +
                               "messages.deleted, " +
                               "(  SELECT COUNT(*) " +
                               "   FROM messages, folders, imap_accounts " +
                               "   WHERE folders.account_id = imap_accounts.id AND " +
                               "         messages.account_id = imap_accounts.id AND " +
                               "         imap_accounts.account_name LIKE ?1 AND " +
                               "         messages.folder_id = folders.id AND " +
                               "         folders.folder_hierarchy LIKE ?2 AND " +
                               "         messages.session = ?3 AND " +
                               "         messages.id <= ?4" +
                               ") AS sequence_number "
            szSQL   += "FROM folders, imap_accounts, messages "
            szSQL   += "WHERE  folders.account_id = imap_accounts.id AND " +
                              "messages.account_id =  imap_accounts.id AND " +
                              "imap_accounts.account_name LIKE ?1 AND " +
                              "folders.id = messages.folder_id AND " +
                              "folders.folder_hierarchy LIKE ?2 AND  " +
                              "messages.session = ?3 AND " +
                              "messages.id= ?4 "
            szSQL   += "LIMIT 1"

            var statement = this.m_dbConn.createStatement(szSQL);
            statement.bindStringParameter(0, szUser);
            statement.bindStringParameter(1, szHierarchy);
            statement.bindStringParameter(2, this.m_iSession);
            statement.bindStringParameter(3, szUID);

            try
            {
                var wStatement = Components.classes["@mozilla.org/storage/statement-wrapper;1"]
                                           .createInstance(Components.interfaces.mozIStorageStatementWrapper);
                wStatement.initialize(statement);
                while (wStatement.step())
                {
                   szHref.value = wStatement.row["href"];
                   szTo.value = wStatement.row["recipient"];
                   szFrom.value = wStatement.row["sender"];
                   szSubject.value = wStatement.row["subject"];
                   szDate.value = wStatement.row["date"];
                   iSize.value = Number(wStatement.row["size"]);
                   var szRead = wStatement.row["read"];
                   bRead.value = (szRead.search(/true/i)!=-1) ? true : false;
                   var szDeleted = wStatement.row["deleted"];
                   bDelete.value = (szDeleted.search(/true/i)!=-1) ? true : false;
                   iSeqNum.value =  Number(wStatement.row["sequence_number"]);
                   bResult = true;
                }
            }
            finally
            {
                statement.reset();
                this.m_Log.Write("nsIMAPFolder : getMSG - DB Reset "+ this.m_dbConn.lastErrorString);
            }

            this.m_Log.Write("nsIMAPFolder.js - getMSG - END " +bResult);
            return bResult;
        }
        catch(err)
        {
             this.m_Log.DebugDump("nsIMAPFolder.js: getMSG : Exception : "
                                          + err.name
                                          + ".\nError message: "
                                          + err.message + "\n"
                                          + err.lineNumber+ "\n" +
                                          this.m_dbConn.lastErrorString);
            return false;
        }
    },





    getMSGHref : function (szUser, szHierarchy, szUID, szHref)
    {
        try
        {
            this.m_Log.Write("nsIMAPFolder.js - getMSGHref - Start");
            this.m_Log.Write("nsIMAPFolder.js - getMSGHref - " + szUser + " " + szHierarchy + " " + szUID);
            var bResult = false;

            var szSQL ="SELECT  messages.href ";
            szSQL   += "FROM folders, imap_accounts, messages "
            szSQL   += "WHERE  folders.account_id = imap_accounts.id AND " +
                              "messages.account_id =  imap_accounts.id AND " +
                              "imap_accounts.account_name LIKE ?1 AND " +
                              "folders.id = messages.folder_id AND " +
                              "folders.folder_hierarchy LIKE ?2 AND  " +
                              "messages.session = ?3 AND " +
                              "messages.id= ?4 "
            szSQL   += "LIMIT 1"

            var statement = this.m_dbConn.createStatement(szSQL);
            statement.bindStringParameter(0, szUser);
            statement.bindStringParameter(1, szHierarchy);
            statement.bindStringParameter(2, this.m_iSession);
            statement.bindStringParameter(3, szUID);

            try
            {
                var wStatement = Components.classes["@mozilla.org/storage/statement-wrapper;1"]
                                           .createInstance(Components.interfaces.mozIStorageStatementWrapper);
                wStatement.initialize(statement);
                while (wStatement.step())
                {
                   szHref.value = wStatement.row["href"];
                   bResult = true;
                }
            }
            finally
            {
                statement.reset();
                this.m_Log.Write("nsIMAPFolder : getMSGHref - DB Reset "+ this.m_dbConn.lastErrorString);
            }

            this.m_Log.Write("nsIMAPFolder.js - getMSGHref - END " +bResult);
            return bResult;
        }
        catch(err)
        {
             this.m_Log.DebugDump("nsIMAPFolder.js: getMSGHref : Exception : "
                                          + err.name
                                          + ".\nError message: "
                                          + err.message + "\n"
                                          + err.lineNumber+ "\n" +
                                          this.m_dbConn.lastErrorString);
            return false;
        }
    },





    getMSGStatus : function (szUser, szHierarchy, szUID, szHref, bRead, bDelete, iSeqNum)
    {
        try
        {
            this.m_Log.Write("nsIMAPFolder.js - getMSGStatus - Start");
            this.m_Log.Write("nsIMAPFolder.js - getMSGStatus - " + szUser + " " + szHierarchy + " " + szUID);
            var bResult = false;

            var szSQL ="SELECT  messages.href," +
                               "messages.read, " +
                               "messages.deleted, " +
                               "(  SELECT COUNT(*) " +
                               "   FROM messages, folders, imap_accounts " +
                               "   WHERE folders.account_id = imap_accounts.id AND " +
                               "         messages.account_id = imap_accounts.id AND " +
                               "         imap_accounts.account_name LIKE ?1 AND " +
                               "         messages.folder_id = folders.id AND " +
                               "         folders.folder_hierarchy LIKE ?2 AND " +
                               "         messages.session = ?3 AND " +
                               "         messages.id <= ?4" +
                               ") AS sequence_number "
            szSQL   += "FROM folders, imap_accounts, messages "
            szSQL   += "WHERE  folders.account_id = imap_accounts.id AND " +
                              "messages.account_id =  imap_accounts.id AND " +
                              "imap_accounts.account_name LIKE ?1 AND " +
                              "folders.id = messages.folder_id AND " +
                              "folders.folder_hierarchy LIKE ?2 AND  " +
                              "messages.session = ?3 AND " +
                              "messages.id= ?4 "
            szSQL   += "LIMIT 1"

            var statement = this.m_dbConn.createStatement(szSQL);
            statement.bindStringParameter(0, szUser);
            statement.bindStringParameter(1, szHierarchy);
            statement.bindStringParameter(2, this.m_iSession);
            statement.bindStringParameter(3, szUID);

            try
            {
                var wStatement = Components.classes["@mozilla.org/storage/statement-wrapper;1"]
                                           .createInstance(Components.interfaces.mozIStorageStatementWrapper);
                wStatement.initialize(statement);
                while (wStatement.step())
                {
                   szHref.value = wStatement.row["href"];
                   var szRead = wStatement.row["read"];
                   bRead.value = (szRead.search(/true/i)!=-1) ? true : false;
                   var szDeleted = wStatement.row["deleted"];
                   bDelete.value = (szDeleted.search(/true/i)!=-1) ? true : false;
                   iSeqNum.value =  Number(wStatement.row["sequence_number"]);
                   bResult = true;
                }
            }
            finally
            {
                statement.reset();
                this.m_Log.Write("nsIMAPFolder : getMSGStatus - DB Reset "+ this.m_dbConn.lastErrorString);
            }

            this.m_Log.Write("nsIMAPFolder.js - getMSGStatus - END " +bResult);
            return bResult;
        }
        catch(err)
        {
             this.m_Log.DebugDump("nsIMAPFolder.js: getMSGStatus : Exception : "
                                          + err.name
                                          + ".\nError message: "
                                          + err.message + "\n"
                                          + err.lineNumber+ "\n" +
                                          this.m_dbConn.lastErrorString);
            return false;
        }
    },





    setMSGSeenFlag : function(szUser, szHierarchy, szUID, bSeen)
    {
        try
        {
            this.m_Log.Write("nsIMAPFolder.js - setMSGSeenFlag - Start");
            this.m_Log.Write("nsIMAPFolder.js - setMSGSeenFlag - " + szUser + " " + szHierarchy + " " + szUID + " " + bSeen);

            var szSQL = "UPDATE messages ";
            szSQL    += "SET read = ?4 "
            szSQL    += "WHERE id = ( SELECT messages.id " +
                                     "FROM messages, folders, imap_accounts " +
                                     "WHERE imap_accounts.account_name LIKE ?1 AND " +
                                     "      imap_accounts.id = folders.account_id  AND " +
                                     "      messages.account_id = imap_accounts.id AND " +
                                     "      messages.folder_id = folders.id AND " +
                                     "      folders.folder_hierarchy  = ?2  AND " +
                                     "      messages.id = ?3" +
                                    ");"

            var statement = this.m_dbConn.createStatement(szSQL);
            statement.bindStringParameter(0, szUser.toLowerCase());
            statement.bindStringParameter(1, szHierarchy);
            statement.bindStringParameter(2, szUID);
            statement.bindStringParameter(3, bSeen);
            statement.execute();

            this.m_Log.Write("nsIMAPFolder.js - setMSGSeenFlag - END ");
            return true;
        }
        catch(err)
        {
             this.m_Log.DebugDump("nsIMAPFolder.js: setMSGSeenFlag : Exception : "
                                          + err.name
                                          + ".\nError message: "
                                          + err.message + "\n"
                                          + err.lineNumber+ "\n" +
                                          this.m_dbConn.lastErrorString);
            return false;
        }
    },




    setMSGDeleteFlag : function (szUser, szHierarchy, szUID, bDelete)
    {
        try
        {
            this.m_Log.Write("nsIMAPFolder.js - setMSGDeleteFlag - Start");
            this.m_Log.Write("nsIMAPFolder.js - setMSGDeleteFlag - " + szUser + " " + szHierarchy + " " + szUID + " " + bDelete);

            var szSQL = "UPDATE messages ";
            szSQL    += "SET deleted = ?4 "
            szSQL    += "WHERE id = ( SELECT messages.id " +
                                     "FROM messages, folders, imap_accounts " +
                                     "WHERE imap_accounts.account_name LIKE ?1 AND " +
                                     "      imap_accounts.id = folders.account_id  AND " +
                                     "      messages.account_id = imap_accounts.id AND " +
                                     "      messages.folder_id = folders.id AND " +
                                     "      folders.folder_hierarchy  = ?2  AND " +
                                     "      messages.id = ?3" +
                                    ");"

            var statement = this.m_dbConn.createStatement(szSQL);
            statement.bindStringParameter(0, szUser.toLowerCase());
            statement.bindStringParameter(1, szHierarchy);
            statement.bindStringParameter(2, szUID);
            statement.bindStringParameter(3, bDelete);
            statement.execute();


            this.m_Log.Write("nsIMAPFolder.js - setMSGDeleteFlag - END ");
            return true;
        }
        catch(err)
        {
             this.m_Log.DebugDump("nsIMAPFolder.js: setMSGDeleteFlag : Exception : "
                                          + err.name
                                          + ".\nError message: "
                                          + err.message + "\n"
                                          + err.lineNumber+ "\n" +
                                          this.m_dbConn.lastErrorString);
            return false;
        }
    },




    deleteMSG : function (szUser, szHierarchy)
    {
        try
        {
            this.m_Log.Write("nsIMAPFolder.js - deleteMSGs - START ");
            this.m_Log.Write("nsIMAPFolder.js - deleteMSGs - " + szUser + " " + szHierarchy );

            var szSQL = "DELETE FROM messages ";
            szSQL   +=  "WHERE account_id = (SELECT id FROM imap_accounts WHERE account_name LIKE ?1) AND " +
                              "folder_id = (SELECT id FROM folders WHERE folder_hierarchy LIKE ?2) AND " +
                              "deleted = \"true\"";

            var statement = this.m_dbConn.createStatement(szSQL);
            statement.bindStringParameter(0, szUser);
            statement.bindStringParameter(1, szHierarchy);
            statement.execute();

            this.m_Log.Write("nsIMAPFolder.js - deleteMSGs - END ");
            return true;
        }
        catch(err)
        {
            this.m_Log.DebugDump("nsIMAPFolder.js: deleteMSGs : Exception : "
                              + err.name
                              + ".\nError message: "
                              + err.message + "\n"
                              + err.lineNumber+ "\n" +
                              this.m_dbConn.lastErrorString);
            return false;
        }
    },



   lastMsgListUpdate : function (szUser, szHierarchy)
   {
         try
        {
            this.m_Log.Write("nsIMAPFolder.js - lastMsgListUpdate - START ");
            this.m_Log.Write("nsIMAPFolder.js - lastMsgListUpdate - " + szUser + " " + szHierarchy);

            var iDate = 0;
            var szSQL = "SELECT last_folder_update.date ";
            szSQL    += "FROM last_folder_update, imap_accounts, folders "
            szSQL    += "WHERE last_folder_update.account_id = imap_accounts.id AND " +
                              "imap_accounts.id = folders.account_id AND " +
                              "imap_accounts.account_name LIKE ?1 AND " +
                              "folders.id = last_folder_update.folder_id AND " +
                              "folders.folder_hierarchy LIKE ?2 AND " +
                              "last_folder_update.session = ?3"

            var statement = this.m_dbConn.createStatement(szSQL);
            statement.bindStringParameter(0, szUser);
            statement.bindStringParameter(1, szHierarchy);
            statement.bindStringParameter(2, this.m_iSession);

            try
            {
                var wStatement = Components.classes["@mozilla.org/storage/statement-wrapper;1"]
                                           .createInstance(Components.interfaces.mozIStorageStatementWrapper);
                wStatement.initialize(statement);
                while (wStatement.step())
                {
                   var dbDate = wStatement.row["date"];
                   this.m_Log.Write("nsIMAPFolder.js : dbDate - "  +dbDate);

                   var aDateTime = dbDate.split(/\s/);
                   this.m_Log.Write("nsIMAPFolder.js : aDateTime - " +aDateTime);

                   var aDate = aDateTime[0].split(/-/);
                   this.m_Log.Write("nsIMAPFolder.js : aDate - " +aDate);

                   var aTime = aDateTime[1].split(/:/);
                   this.m_Log.Write("nsIMAPFolder.js : aTime - " +aTime);

                   var oDate = new Date ();
                   oDate.setFullYear(aDate[0]);
                   oDate.setMonth(aDate[1]-1);
                   oDate.setDate(aDate[2]);
                   oDate.setHours(aTime[0]);
                   oDate.setMinutes(aTime[1]);
                   oDate.setSeconds(aTime[2]);

                   iDate = Date.parse(oDate);
                }
            }
            finally
            {
                statement.reset();
                this.m_Log.Write("nsIMAPFolder : lastMsgListUpdate - DB Reset "+ this.m_dbConn.lastErrorString);
            }

            this.m_Log.Write("nsIMAPFolder.js - lastMsgListUpdate - END " +iDate);
            return iDate;
        }
        catch(err)
        {
            this.m_Log.DebugDump("nsIMAPFolder.js: lastMsgListUpdate : Exception : "
                              + err.name
                              + ".\nError message: "
                              + err.message + "\n"
                              + err.lineNumber+ "\n" +
                              this.m_dbConn.lastErrorString);
            return 0;
        }
   },



   lastFolderListUpdate :function (szUser)
   {
        try
        {
            this.m_Log.Write("nsIMAPFolder.js - lastFolderListUpdate - START ");
            this.m_Log.Write("nsIMAPFolder.js - lastFolderListUpdate - " + szUser);

            var iDate = 0;
            var szSQL = "SELECT last_user_update.date ";
            szSQL    += "FROM last_user_update, imap_accounts "
            szSQL    += "WHERE last_user_update.account_id = imap_accounts.id AND " +
                              "imap_accounts.account_name LIKE ?1 AND " +
                              "last_user_update.session = ?2"

            var statement = this.m_dbConn.createStatement(szSQL);
            statement.bindStringParameter(0, szUser);
            statement.bindStringParameter(1, this.m_iSession);

            try
            {
                var wStatement = Components.classes["@mozilla.org/storage/statement-wrapper;1"]
                                           .createInstance(Components.interfaces.mozIStorageStatementWrapper);
                wStatement.initialize(statement);
                while (wStatement.step())
                {
                   var dbDate = wStatement.row["date"];
                   this.m_Log.Write("nsIMAPFolder.js : dbDate - "  +dbDate);

                   var aDateTime = dbDate.split(/\s/);
                   this.m_Log.Write("nsIMAPFolder.js : aDateTime - " +aDateTime);

                   var aDate = aDateTime[0].split(/-/);
                   this.m_Log.Write("nsIMAPFolder.js : aDate - " +aDate);

                   var aTime = aDateTime[1].split(/:/);
                   this.m_Log.Write("nsIMAPFolder.js : aTime - " +aTime);

                   var oDate = new Date ();
                   oDate.setFullYear(aDate[0]);
                   oDate.setMonth(aDate[1]-1);
                   oDate.setDate(aDate[2]);
                   oDate.setHours(aTime[0]);
                   oDate.setMinutes(aTime[1]);
                   oDate.setSeconds(aTime[2]);

                   iDate = Date.parse(oDate);
                }
            }
            finally
            {
                statement.reset();
                this.m_Log.Write("nsIMAPFolder : lastFolderListUpdate - DB Reset "+ this.m_dbConn.lastErrorString);
            }

            this.m_Log.Write("nsIMAPFolder.js - lastFolderListUpdate - END " +iDate);
            return iDate;
        }
        catch(err)
        {
            this.m_Log.DebugDump("nsIMAPFolder.js: lastFolderListUpdate : Exception : "
                              + err.name
                              + ".\nError message: "
                              + err.message + "\n"
                              + err.lineNumber+ "\n" +
                              this.m_dbConn.lastErrorString);
            return 0;
        }
   },




    cleanDB : function ()
    {
        try
        {
            this.m_Log.Write("nsIMAPFolder.js - cleanDB - START ");

            //delete old messages
            var szSQL = "DELETE FROM messages WHERE session <= ?1"
            var statement = this.m_dbConn.createStatement(szSQL);
            statement.bindStringParameter(0, this.m_iSession - 50);
            statement.execute();


            //delete old folders
            var szSQL = "DELETE FROM folders WHERE session <= ?1"
            var statement = this.m_dbConn.createStatement(szSQL);
            statement.bindStringParameter(0, this.m_iSession - 100);
            statement.execute();

            this.m_Log.Write("nsIMAPFolder.js - cleanDB - END ");
        }
        catch(err)
        {
            this.m_Log.DebugDump("nsIMAPFolder.js: lastFolderListUpdate : Exception : "
                                  + err.name
                                  + ".\nError message: "
                                  + err.message + "\n"
                                  + err.lineNumber+ "\n" +
                                  this.m_dbConn.lastErrorString);
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
                                          "IMAP Folders");

                this.m_Log.Write("nsIMAPFolder.js - profile-after-change");
                this.loadDataBase();
            break;

            case "quit-application":
                this.m_Log.Write("nsIMAPFolder.js - quit-application ");
                this.cleanDB();
            break;

            case "app-startup":
            break;

            default: throw Components.Exception("Unknown topic: " + aTopic);
        }
    },

/******************************************************************************/
/***************** XPCOM  stuff ***********************************************/
/******************************************************************************/
    QueryInterface : function (iid)
    {
        if (!iid.equals(Components.interfaces.nsIIMAPFolders)
                && !iid.equals(Components.interfaces.nsISupports)
                    && !iid.equals(Components.interfaces.nsIObserver))
            throw Components.results.NS_ERROR_NO_INTERFACE;

        return this;
    }
}


/******************************************************************************/
/* FACTORY*/
var nsIMAPFoldersFactory = new Object();

nsIMAPFoldersFactory.createInstance = function (outer, iid)
{
    if (outer != null)
        throw Components.results.NS_ERROR_NO_AGGREGATION;

    if (!iid.equals(nsIMAPFoldersClassID)
            && !iid.equals(Components.interfaces.nsISupports))
        throw Components.results.NS_ERROR_INVALID_ARG;

    return new nsIMAPFolders();
}


/******************************************************************************/
/* MODULE */
var nsIMAPFoldersModule = new Object();

nsIMAPFoldersModule.registerSelf = function(compMgr, fileSpec, location, type)
{
    var catman = Components.classes["@mozilla.org/categorymanager;1"].
                        getService(Components.interfaces.nsICategoryManager);

    catman.addCategoryEntry("xpcom-startup",
                            "IMAP Folders",
                            nsIMAPFoldersContactID,
                            true,
                            true);

    catman.addCategoryEntry("app-startup",
                            "IMAP Folders",
                            "service," + nsIMAPFoldersContactID,
                            true,
                            true);

    compMgr = compMgr.QueryInterface(Components.interfaces.nsIComponentRegistrar);
    compMgr.registerFactoryLocation(nsIMAPFoldersClassID,
                                    "IMAP Folders",
                                    nsIMAPFoldersContactID,
                                    fileSpec,
                                    location,
                                    type);
}


nsIMAPFoldersModule.unregisterSelf = function(aCompMgr, aFileSpec, aLocation)
{
    var catman = Components.classes["@mozilla.org/categorymanager;1"].
                            getService(Components.interfaces.nsICategoryManager);

    catman.deleteCategoryEntry("xpcom-startup", "IMAP Folders", true);
    catman.deleteCategoryEntry("app-startup", "IMAP Folders", true);

    aCompMgr = aCompMgr.QueryInterface(Components.interfaces.nsIComponentRegistrar);
    aCompMgr.unregisterFactoryLocation(nsIMAPFoldersClassID, aFileSpec);
}


nsIMAPFoldersModule.getClassObject = function(compMgr, cid, iid)
{
    if (!cid.equals(nsIMAPFoldersClassID))
        throw Components.results.NS_ERROR_NO_INTERFACE;

    if (!iid.equals(Components.interfaces.nsIFactory))
        throw Components.results.NS_ERROR_NOT_IMPLEMENTED;

    return nsIMAPFoldersFactory;
}


nsIMAPFoldersModule.canUnload = function(compMgr)
{
    return true;
}
/******************************************************************************/


function NSGetModule(compMgr, fileSpec)
{
    return nsIMAPFoldersModule;
}
