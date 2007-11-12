/*****************************  Globals   *************************************/
const nsDomainManagerClassID = Components.ID("{76f4dcb0-284a-11d9-9669-0800200c9a66}");
const nsDomainManagerContactID = "@mozilla.org/DomainManager;1";

/***********************  DomainManager ********************************/
function nsDomainManager()
{
    this.m_scriptLoader = null;
    this.m_Log = null;
    this.m_dbService = null;
    this.m_dbConn = null;
    this.m_dbConnDummy = null;
    this.m_iCurrentDBVersion = 4;
    this.m_bIsReady = false;
}

nsDomainManager.prototype =
{
    loadDataBase : function()
    {
        try
        {
            this.m_Log.Write("nsDomainManager.js - loadDataBase - START");

            try
            {
                this.m_dbService = Components.classes["@mozilla.org/storage/service;1"]
                                             .getService(Components.interfaces.mozIStorageService);
            }
            catch(err)
            {
                this.m_Log.Write("nsDomainManager.js : startUp - SQL components NOT installed");
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
                this.m_Log.Write("nsDomainManager.js - loadDB - updating file permissions");
                try
                {
                    fileDB.permissions = 0764;
                }
                catch(e)
                {
                    this.m_Log.Write("nsDomainManager.js: loadDataBase : permissions exception : "
                                          + e.name
                                          + ".\nError message: "
                                          + e.message);
                }
            }
            fileDB.append("domains.db3");         //sqlite database
            fileDB.QueryInterface(Components.interfaces.nsIFile)
            this.m_Log.Write("nsDataBaseManager.js - loadDB - fileDB "+ fileDB.path);

            //load DB
            this.m_dbConn = this.m_dbService.openDatabase(fileDB);
            if (!this.m_dbConn) return false;

            var iVersion = this.getDBVersion();
            if (iVersion == -1)
                this.createDB();
            else if (iVersion != this.m_iCurrentDBVersion)
                this.updateDB(iVersion);
            
            this.domainHandlerCheck();
            
            this.m_bIsReady = true;

            this.m_Log.Write("nsDomainManager.js - loadDataBase - END");
            return true;
        }
        catch(err)
        {
            this.m_Log.DebugDump("nsDomainManager.js: loadDataBase : Exception : "
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
            this.m_Log.Write("nsDomainManager.js - getDBVersion - START");

            var iVersion = -1;

            try
            {
                var szVersion = "SELECT version FROM webmail_schema_version LIMIT 1";
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
                    this.m_Log.Write("nsDomainManager : getDBversion - DB Reset");
                }
            }
            catch (e)
            {
                iVersion = -1;
            }

            this.m_Log.Write("nsDomainManager.js - getDBVersion - "+ iVersion);
            this.m_Log.Write("nsDomainManager.js - getDBVersion - END");
            return iVersion;
        }
        catch(err)
        {
            this.m_Log.DebugDump("nsDomainManager.js: getDBVersion : Exception : "
                                          + err.name
                                          + "\nError message: "
                                          + err.message +"\n"
                                          + err.lineNumber+ "\n"
                                          + this.m_dbConn.lastErrorString);
            return -1;
        }
    },


    updateDB : function (iVersion)
    {
        try
        {
            this.m_Log.Write("nsDataBaseManager.js - updateDB - START");
            
            if (iVersion == 1)
            {
                this.updateV1toV2();
                this.updateV2toV3();                
                this.updateV3toV4();
            }
            else if(iVersion == 2)
            {
                this.updateV2toV3();
                this.updateV3toV4();
            }
            else if(iVersion == 3)
                this.updateV3toV4();
                
            this.m_Log.Write("nsDataBaseManager.js - updateDB - END");
        }
        catch(err)
        {
            this.m_Log.DebugDump("nsDataBaseManager.js: updateDB : Exception : "
                              + err.name +
                              "\nError message: "
                              + err.message +"\n"
                              + "DB Error " + "\n"
                              + err.lineNumber+ "\n"
                              + this.m_dbConn.lastErrorString);            
        }
    },
    

    updateV1toV2 : function ()
    {
        try
        {
            this.m_Log.Write("nsDataBaseManager.js - updateV1toV2 - START");
            
            //get contents ids
            var aContentID = new Array();
            szSQL  = "SELECT content_id FROM smtp_domains UNION ";
            szSQL += "SELECT content_id FROM pop_domains UNION ";
            szSQL += "SELECT content_id FROM imap_domains ";
            szSQL += "ORDER BY content_id ASC";
            var statement = this.m_dbConn.createStatement(szSQL);
            var wStatement = Components.classes["@mozilla.org/storage/statement-wrapper;1"]
                                       .createInstance(Components.interfaces.mozIStorageStatementWrapper);
            try
            {
                wStatement.initialize(statement);
                while (wStatement.step())
                {
                    var szContentId = wStatement.row["content_id"];
                    this.m_Log.Write("nsDomainManager : updateDB - " +szContentId );                           
                    aContentID.push(szContentId);
                }
            }
            finally
            {
                statement.reset();
                this.m_Log.Write("nsDomainManager : updateV1toV2 - DB Reset "+ this.m_dbConn.lastErrorString);
            }
            
            this.m_dbConn.beginTransaction();

            //add new table domain_handler
            var szSQL = null;
            szSQL  = "CREATE TABLE domain_handler ";
            szSQL += "( ";
            szSQL +=    "id INTEGER PRIMARY KEY, ";
            szSQL +=    "content_id  TEXT, ";
            szSQL +=    "enabled     BOOLEAN ";
            szSQL += ")";
            this.m_Log.Write("nsDataBaseManager.js - updateV1toV2 - szSQL " + szSQL);
            this.m_dbConn.executeSimpleSQL(szSQL);
            
            //update version number                
            szSQL = "DELETE FROM webmail_schema_version; INSERT INTO webmail_schema_version VALUES (2);"
            this.m_Log.Write("nsDataBaseManager.js - updateV1toV2 - szSQL " + szSQL);
            this.m_dbConn.executeSimpleSQL(szSQL);
                           
            //add content ids to new table
            szSQL  = "INSERT INTO domain_handler (content_id, enabled) "
            szSQL += "VALUES "
            szSQL += "( "
            szSQL +=    "?1, "
            szSQL +=    "\"true\""
            szSQL += ");"
            statement = this.m_dbConn.createStatement(szSQL);
            
            for (var i =0; i<aContentID.length; i++)
            {
                statement.bindStringParameter(0, aContentID[i]);
                statement.execute();
            }
            statement.reset();
            
            this.m_dbConn.commitTransaction();
                
            this.m_Log.Write("nsDataBaseManager.js - updateV1toV2 - END");
        }
        catch(err)
        {
            this.m_Log.DebugDump("nsDataBaseManager.js: updateV1toV2 : Exception : "
                              + err.name +
                              "\nError message: "
                              + err.message +"\n"
                              + "DB Error " + "\n"
                              + err.lineNumber+ "\n"
                              + this.m_dbConn.lastErrorString);            
        }
    },
    
        
    updateV2toV3 : function ()
    {
        try
        {
            this.m_Log.Write("nsDataBaseManager.js - updateV2toV3 - START");
                              
            this.m_dbConn.beginTransaction();

            //add new column
            var szSQL = null;
            szSQL  = "ALTER TABLE pop_domains "
            szSQL += "ADD COLUMN default_domain BOOLEAN"
            this.m_Log.Write("nsDataBaseManager.js - updateV2toV3 - szSQL " + szSQL);
            this.m_dbConn.executeSimpleSQL(szSQL);

            szSQL  = "ALTER TABLE smtp_domains "
            szSQL += "ADD COLUMN default_domain BOOLEAN"
            this.m_Log.Write("nsDataBaseManager.js - updateV2toV3 - szSQL " + szSQL);
            this.m_dbConn.executeSimpleSQL(szSQL);
            
            szSQL  = "ALTER TABLE imap_domains "
            szSQL += "ADD COLUMN default_domain BOOLEAN"
            this.m_Log.Write("nsDataBaseManager.js - updateV2toV3 - szSQL " + szSQL);
            this.m_dbConn.executeSimpleSQL(szSQL);
                        
            //update version number                
            szSQL = "DELETE FROM webmail_schema_version; INSERT INTO webmail_schema_version VALUES (3);"
            this.m_Log.Write("nsDataBaseManager.js - updateV2toV3 - szSQL " + szSQL);
            this.m_dbConn.executeSimpleSQL(szSQL);
                           
            this.m_dbConn.commitTransaction();
                
            this.m_Log.Write("nsDataBaseManager.js - updateV2toV3 - END");
        }
        catch(err)
        {
            this.m_Log.DebugDump("nsDataBaseManager.js: updateV2toV3 : Exception : "
                              + err.name +
                              "\nError message: "
                              + err.message +"\n"
                              + "DB Error " + "\n"
                              + err.lineNumber+ "\n"
                              + this.m_dbConn.lastErrorString);            
        }
    },
    
     
    updateV3toV4 : function ()
    {
        try
        {
            this.m_Log.Write("nsDataBaseManager.js - updateV3toV4 - START");
                              
            this.m_dbConn.beginTransaction();
            
            szSQL  = "ALTER TABLE domain_handler "
            szSQL += "ADD COLUMN extension_guid TEXT"
            this.m_Log.Write("nsDataBaseManager.js - updateV3toV4 - szSQL " + szSQL);
            this.m_dbConn.executeSimpleSQL(szSQL);
            
            //update version number                
            szSQL = "DELETE FROM webmail_schema_version; INSERT INTO webmail_schema_version VALUES (4);"
            this.m_Log.Write("nsDataBaseManager.js - updateV3toV4 - szSQL " + szSQL);
            this.m_dbConn.executeSimpleSQL(szSQL);
                           
            this.m_dbConn.commitTransaction();
                
            this.m_Log.Write("nsDataBaseManager.js - updateV3toV4 - END");
        }
        catch(err)
        {
            this.m_Log.DebugDump("nsDataBaseManager.js: updateV3toV4 : Exception : "
                              + err.name +
                              "\nError message: "
                              + err.message +"\n"
                              + "DB Error " + "\n"
                              + err.lineNumber+ "\n"
                              + this.m_dbConn.lastErrorString);            
        }
    },
     
         
    createDB : function ()
    {
        try
        {
            this.m_Log.Write("nsDataBaseManager.js - createDB - START");
            var szSQL;

            //Domains Table
            szSQL = "CREATE TABLE pop_domains ";
            szSQL +="(";
            szSQL +=    "id INTEGER PRIMARY KEY, ";
            szSQL +=    "domain TEXT, ";
            szSQL +=    "content_id TEXT, ";
            szSQL +=    "default_domain BOOLEAN ";
            szSQL +=");";
            this.m_Log.Write("nsDataBaseManager.js - createDB - szSQL " + szSQL);
            this.m_dbConn.executeSimpleSQL(szSQL);

            szSQL = "CREATE TABLE smtp_domains ";
            szSQL +="(";
            szSQL +=    "id INTEGER PRIMARY KEY, ";
            szSQL +=    "domain TEXT, ";
            szSQL +=    "content_id TEXT, ";
            szSQL +=    "default_domain BOOLEAN ";
            szSQL +=");";
            this.m_Log.Write("nsDataBaseManager.js - createDB - szSQL " + szSQL);
            this.m_dbConn.executeSimpleSQL(szSQL);

            szSQL = "CREATE TABLE imap_domains ";
            szSQL +="(";
            szSQL +=    "id INTEGER PRIMARY KEY, ";
            szSQL +=    "domain TEXT, ";
            szSQL +=    "content_id TEXT, ";
            szSQL +=    "default_domain BOOLEAN ";
            szSQL +=");";
            this.m_Log.Write("nsDataBaseManager.js - createDB - szSQL " + szSQL);
            this.m_dbConn.executeSimpleSQL(szSQL);


            szSQL = "CREATE VIEW view_all_domain AS SELECT ";
            szSQL+= "  domain ";
            szSQL+= "FROM smtp_domains UNION SELECT domain FROM pop_domains UNION SELECT domain FROM imap_domains "
            szSQL+= "ORDER BY domain ASC";
            this.m_Log.Write("nsDataBaseManager.js - createDB - szSQL " + szSQL);
            this.m_dbConn.executeSimpleSQL(szSQL);


            szSQL  = "CREATE TABLE domain_handler ";
            szSQL += "( ";
            szSQL +=    "id INTEGER PRIMARY KEY, ";
            szSQL +=    "content_id  TEXT, ";
            szSQL +=    "extension_guid TEXT, ";
            szSQL +=    "enabled BOOLEAN ";
            szSQL += ")";
            this.m_Log.Write("nsDataBaseManager.js - createDB - szSQL " + szSQL);
            this.m_dbConn.executeSimpleSQL(szSQL);

            //dummy table
            szSQL = "CREATE TABLE dummy_table (id INTEGER PRIMARY KEY);";
            this.m_Log.Write("nsDataBaseManager.js - createDB - szSQL " + szSQL);
            this.m_dbConn.executeSimpleSQL(szSQL);
            szSQL = "INSERT OR IGNORE INTO dummy_table VALUES (1)";
            this.m_dbConn.executeSimpleSQL(szSQL);


            //Version table
            szSQL = "CREATE TABLE webmail_schema_version (version INTEGER);";
            this.m_dbConn.executeSimpleSQL(szSQL);
            szSQL = "INSERT INTO webmail_schema_version VALUES(4);";
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
                                          + err.lineNumber+ "\n"
                                          + this.m_dbConn.lastErrorString);
            return false;
        }
    },


    domainHandlerCheck : function ()
    {
        try
        {
            this.m_Log.Write("nsDataBaseManager.js - domainHandlerCheck - START");
            
            //get domain handler list
            var aDomains = new Array();
            var szSQL = null;
            szSQL  = "SELECT * FROM domain_handler "
            var statement = this.m_dbConn.createStatement(szSQL);
            var wStatement = Components.classes["@mozilla.org/storage/statement-wrapper;1"]
                                       .createInstance(Components.interfaces.mozIStorageStatementWrapper);
            try
            {
                wStatement.initialize(statement);
                while (wStatement.step())
                {
                    var oData = new domainData();
                    oData.iId = wStatement.row["id"];
                    oData.szContentId = wStatement.row["content_id"];
                    this.m_Log.Write("nsDomainManager : domainHandlerCheck - " + oData.szContentId );  
                    oData.szGUID = wStatement.row["extension_guid"];                         
                    aDomains.push(oData);
                }
            }
            finally
            {
                statement.reset();
                this.m_Log.Write("nsDomainManager : domainHandlerCheck - DB Reset "+ this.m_dbConn.lastErrorString);
            }
            
            //load domain handler

            for (var i=0; i<aDomains.length; i++)
            {
                if (typeof(Components.classes[aDomains[i].szContentId]) == "undefined")
                   aDomains[i].bEnabled = false;
                else
                   aDomains[i].bEnabled = true;  
                this.m_Log.Write("nsDomainManager : domainHandlerCheck - szContentId "+ aDomains[i].szContentId 
                                                                         + " bEnabled " + aDomains[i].bEnabled );   
            }
            
            //update domain handler list
            this.m_dbConn.beginTransaction();
            
            szSQL = "REPLACE INTO domain_handler (id, content_id, enabled, extension_guid) ";
            szSQL+= "VALUES ";
            szSQL+= "(" ;
            szSQL+=     "?1,";
            szSQL+=     "?2,";
            szSQL+=     "?3,";
            szSQL+=     "?4 ";
            szSQL+= ");";
         
            for (var i = 0; i < aDomains.length; i++) 
            {
                statement = this.m_dbConn.createStatement(szSQL);
                statement.bindStringParameter(0, aDomains[i].iId);
                statement.bindStringParameter(1, aDomains[i].szContentId);
                statement.bindStringParameter(2, aDomains[i].bEnabled);
                statement.bindStringParameter(3, aDomains[i].szGUID);
                statement.execute();
            }
            delete aContentID;
                        
            this.m_dbConn.commitTransaction();
            
            this.m_Log.Write("nsDataBaseManager.js - domainHandlerCheck - END");
        }
        catch(err)
        {
            this.m_Log.DebugDump("nsDataBaseManager.js: domainHandlerCheck : Exception : "
                              + err.name +
                              "\nError message: "
                              + err.message +"\n"
                              + "DB Error " + "\n"
                              + err.lineNumber+ "\n"
                              + this.m_dbConn.lastErrorString);
            return false;
        }       
    },


    registerDomainHandler : function (szContentId, szGUID)
    {
        try
        {
            this.m_Log.Write("nsDomainManager.js - registerDomainHandler - START");
            this.m_Log.Write("nsDomainManager.js - registerDomainHandler - szCotentID " + szContentId
                                                                          + " szGUID " + szGUID);
            
            //update domain handler table
            var szSQL;
            szSQL  = "REPLACE INTO domain_handler (id, content_id, enabled, extension_guid) ";
            szSQL += "VALUES ";
            szSQL += "( ";
            szSQL += "  (SELECT id FROM domain_handler WHERE content_id LIKE ?1),";
            szSQL += "   ?1,";
            szSQL += "   \"true\",";
            szSQL += "   ?2";
            szSQL += ");";
            
            var statement = this.m_dbConn.createStatement(szSQL);
            statement.bindStringParameter(0, szContentId);
            statement.bindStringParameter(1, szGUID);
            statement.execute();
        
            this.m_Log.Write("nsDomainManager.js - registerDomainHandler - END");   
            return 1;      
        }
        catch(e)
        {
            this.m_Log.DebugDump("nsDomainManager.js: registerDomainHandler : Exception : "
                                          + e.name +
                                          ".\nError message: "
                                          + e.message+ "\n"
                                          + e.lineNumber+"\n"
                                          + "DB Reset "+ this.m_dbConn.lastErrorString);
            return false;   
        }
    },
    
    
    getDomain : function(szAddress, szProtocol, szContentID, bDefault)
    {
        try
        {
            this.m_Log.Write("nsDomainManager.js - getDoamin - START");
            this.m_Log.Write("nsDomainManager.js - getDoamin - " +szAddress+ " " +szProtocol);

            var bFound = false;
            if (!szAddress || !szProtocol )
            {
                this.m_Log.Write("nsDomainManager.js - getDoamin - bad param" );
                return bFound;
            }

            var szSQL
            if (szProtocol.search(/pop/i)!=-1)
                szSQL = "SELECT pop_domains.content_id, pop_domains.default_domain " +
                        "FROM pop_domains, domain_handler " +
                        "WHERE domain LIKE ?1 " +
                        "      AND domain_handler.content_id = pop_domains.content_id " +
                        "      AND domain_handler.enabled = \"true\"" +
                        "LIMIT (1)";
            if (szProtocol.search(/smtp/i)!=-1)
                szSQL = "SELECT smtp_domains.content_id, smtp_domains.default_domain " +
                        "FROM smtp_domains, domain_handler  " +
                        "WHERE domain LIKE ?1 " +
                        "      AND domain_handler.content_id = smtp_domains.content_id " +
                        "      AND domain_handler.enabled = \"true\"" +
                        "LIMIT (1)";
            if (szProtocol.search(/imap/i)!=-1)
                szSQL = "SELECT imap_domains.content_id, imap_domains.default_domain  " +
                        "FROM imap_domains, domain_handler  " +
                        "WHERE domain LIKE ?1 " +
                        "      AND domain_handler.content_id = imap_domains.content_id " +
                        "      AND domain_handler.enabled = \"true\"" +
                        "LIMIT (1)";

            var statement = this.m_dbConn.createStatement(szSQL);
            statement.bindStringParameter(0, szAddress.toLowerCase().replace(/\s/,""));

            try
            {
                var wStatement = Components.classes["@mozilla.org/storage/statement-wrapper;1"]
                                           .createInstance(Components.interfaces.mozIStorageStatementWrapper);
                wStatement.initialize(statement);
                if (wStatement.step())
                {
                   szContentID.value = wStatement.row["content_id"];
                   this.m_Log.Write("nsDomainManager.js - getDoamin - szContentID " + szContentID.value);
                   
                   bDefault.value = wStatement.row["default_domain"] ? true : false;
                   this.m_Log.Write("nsDomainManager.js - getDoamin - bDefault " +  bDefault.value);
                   bFound = true;
                }
            }
            finally
            {
                statement.reset();
                this.m_Log.Write("nsDomainManager : getDoamin - DB Reset "+ this.m_dbConn.lastErrorString);
            }

            this.m_Log.Write("nsDomainManager.js - getDoamin - END " + bFound);
            return bFound;
        }
        catch(e)
        {
            this.m_Log.DebugDump("nsDomainManager.js: getDoamin : Exception : "
                                          + e.name +
                                          ".\nError message: "
                                          + e.message+ "\n"
                                          + e.lineNumber+"\n"
                                          + "DB Reset "+ this.m_dbConn.lastErrorString);
            return false;
        }
        
    },
    
    
    getDomainForProtocol : function(szAddress, szProtocol , szContentID )
    {   
        var bDefault = new Object;
        return this.getDomain(szAddress, szProtocol, szContentID, bDefault);
    },


    newDomain : function (szAddress, szProtocol, szContentID, bDefault)
    {
        try
        {
            this.m_Log.Write("nsDomainManager.js - newDomain -  START" );
            this.m_Log.Write("nsDomainManager.js - newDomain -   address " + szAddress
                                                                        + " Content " + szContentID
                                                                        + " protocol " + szProtocol
                                                                        + " default " + bDefault);

            if (!szAddress || !szProtocol || !szContentID)
            {
                this.m_Log.Write("nsDomainManager.js - newDomain - bad param" );
                return false;
            }

            //update domain handler table
            var szSQL;
            szSQL  = "REPLACE INTO domain_handler (id, content_id, enabled, extension_guid) ";
            szSQL += "VALUES ";
            szSQL += "( ";
            szSQL += "  (SELECT id FROM domain_handler WHERE content_id LIKE ?1),";
            szSQL += "   ?1,";
            szSQL += "   \"true\",";
            szSQL += "   (SELECT extension_guid FROM domain_handler WHERE content_id LIKE ?1)"
            szSQL += ");";
            var statement = this.m_dbConn.createStatement(szSQL);
            statement.bindStringParameter(0, szContentID);
            statement.execute();
             
            
            //updtae domain
            if (szProtocol.search(/pop/i)!=-1)
            {
                szSQL = "REPLACE INTO pop_domains (id,domain,content_id, default_domain) ";
                szSQL+= "VALUES ";
                szSQL+= "(" ;
                szSQL+= "(SELECT id FROM pop_domains WHERE domain LIKE ?1),";
                szSQL+= "?2,";
                szSQL+= "?3,";
                szSQL+= "?4";
                szSQL+= ");";
            }
            if (szProtocol.search(/smtp/i)!=-1)
            {
                szSQL = "REPLACE INTO smtp_domains (id,domain,content_id, default_domain) ";
                szSQL+= "VALUES ";
                szSQL+= "(" ;
                szSQL+= "(SELECT id FROM smtp_domains WHERE domain LIKE ?1),";
                szSQL+= "?2,";
                szSQL+= "?3,";
                szSQL+= "?4";
                szSQL+= ");";
            }
            if (szProtocol.search(/imap/i)!=-1)
            {
                szSQL = "REPLACE INTO imap_domains (id,domain,content_id, default_domain) ";
                szSQL+= "VALUES ";
                szSQL+= "(" ;
                szSQL+= "(SELECT id FROM imap_domains WHERE domain LIKE ?1),";
                szSQL+= "?2,";
                szSQL+= "?3,";
                szSQL+= "?4";
                szSQL+= ");";
            }

            this.m_Log.Write("nsDomainManager : newDomain - sql "  + szSQL);
            statement = this.m_dbConn.createStatement(szSQL);
            statement.bindStringParameter(0, szAddress.toLowerCase().replace(/\s/,""));
            statement.bindStringParameter(1, szAddress.toLowerCase().replace(/\s/,""));
            statement.bindStringParameter(2, szContentID);
            statement.bindStringParameter(3, bDefault);
            statement.execute();

            this.m_Log.Write("nsDomainManager.js - newDomain -  END" );
            return true;
        }
        catch(e)
        {
            this.m_Log.DebugDump("nsDomainManager.js: newDomain : Exception : "
                                          + e.name +
                                          ".\nError message: "
                                          + e.message+ "\n"
                                          + e.lineNumber+"\n"
                                          + "DB Reset "+ this.m_dbConn.lastErrorString);
            return false;
        }
        
    },
    
    
    newDomainForProtocol : function(szAddress, szProtocol, szContentID)
    {
        return this.newDomain(szAddress, szProtocol, szContentID, false);
    },



    getDomainForExtension : function (szGUID, iCount, aDomains)
    {
        try
        {
            this.m_Log.Write("nsDomainManager.js - getDomainForExtension -  START ");

            var aResult = new Array();
            var szSQL = "SELECT domain AS domain, ";
                szSQL+= "(CASE " +
                        "     WHEN (SELECT pop_domains.domain " +
                        "           FROM pop_domains, domain_handler " +
                        "           WHERE pop_domains.domain = view_all_domain.domain "  +
                        "                 AND domain_handler.enabled =\"true\" " +
                        "                 AND pop_domains.content_id =  domain_handler.content_id " +
                        "                 AND domain_handler.extension_guid = ?1 ) <> 0 THEN 1 ELSE 0 " +
                        "END) AS pop, ";
                szSQL+= "(CASE " +
                        "     WHEN (SELECT pop_domains.domain " +
                        "           FROM pop_domains " +
                        "           WHERE pop_domains.default_domain = \"true\" ) <> 0 THEN 1 ELSE 0 " +
                        "END) AS pop_default, ";        
                szSQL+= "(CASE " +
                        "      WHEN (SELECT smtp_domains.domain " +
                        "            FROM smtp_domains, domain_handler" +
                        "            WHERE smtp_domains.domain =view_all_domain.domain " +
                        "                  AND domain_handler.enabled =\"true\" " +
                        "                  AND smtp_domains.content_id =  domain_handler.content_id " +
                        "                  AND domain_handler.extension_guid = ?1 ) <> 0 THEN 1 ELSE 0 " +
                        "END)  AS smtp, ";
                szSQL+= "(CASE " +
                        "     WHEN (SELECT smtp_domains.domain " +
                        "           FROM smtp_domains " +
                        "           WHERE smtp_domains.default_domain = \"true\" ) <> 0 THEN 1 ELSE 0 " +
                        "END) AS smtp_default, ";        
                szSQL+="(CASE " +
                        "      WHEN (SELECT imap_domains.domain " +
                        "            FROM imap_domains, domain_handler " +
                        "            WHERE imap_domains.domain=view_all_domain.domain " +
                        "                  AND domain_handler.enabled =\"true\" " +
                        "                  AND imap_domains.content_id = domain_handler.content_id " +
                        "                  AND domain_handler.extension_guid = ?1 ) <> 0 THEN 1 ELSE 0 " +
                        "END) AS imap, ";
                szSQL+= "(CASE " +
                        "     WHEN (SELECT imap_domains.domain " +
                        "           FROM imap_domains " +
                        "           WHERE imap_domains.default_domain = \"true\" ) <> 0 THEN 1 ELSE 0 " +
                        "END) AS imap_default ";        
                szSQL+="FROM view_all_domain";


            var statement = this.m_dbConn.createStatement(szSQL);
            statement.bindStringParameter(0, szGUID);
            var wStatement = Components.classes["@mozilla.org/storage/statement-wrapper;1"]
                                       .createInstance(Components.interfaces.mozIStorageStatementWrapper);
            try
            {
                wStatement.initialize(statement);
                while (wStatement.step())
                {
                    var domainData = Components.classes["@mozilla.org/DomainData;1"].createInstance()
                                               .QueryInterface(Components.interfaces.nsIDomainData);

                    domainData.szDomain = wStatement.row["domain"];
                    domainData.bPOP = wStatement.row["pop"]? true : false;
                    domainData.bPOPDefault = wStatement.row["pop_default"]? true : false;
                    domainData.bSMTP = wStatement.row["smtp"]? true : false;
                    domainData.bSMTPDefault = wStatement.row["smtp_default"]? true : false;
                    domainData.bIMAP = wStatement.row["imap"]? true : false;
                    domainData.bIMAPDefault = wStatement.row["imap_default"]? true : false;   
                    this.m_Log.Write("nsDomainManager : getDomainForExtension - " +domainData.szDomain 
                                                                            + " " + domainData.bPOP 
                                                                            + " " + domainData.bSMTP
                                                                            + " " + domainData.bIMAP);
                    if (domainData.bPOP ||domainData.bSMTP || domainData.bIMAP)
                        aResult.push(domainData);
                }
            }
            finally
            {
                statement.reset();
                this.m_Log.Write("nsDomainManager : getDomainForExtension - DB Reset "+ this.m_dbConn.lastErrorString);
            }

            iCount.value = aResult.length;
            aDomains.value = aResult;
            this.m_Log.Write("nsDomainManager.js - getDomainForExtension - " + iCount.value);

            this.m_Log.Write("nsDomainManager.js - getDomainForExtension -  END" );
            return true;
        }
        catch(e)
        {
            this.m_Log.DebugDump("nsDomainManager.js: getDomainForExtension : Exception : "
                                          + e.name +
                                          ".\nError message: "
                                          + e.message+ "\n"
                                          + e.lineNumber+"\n"
                                          + "DB Reset "+ this.m_dbConn.lastErrorString);

            return false;
        }
    },



    getAllDomainsForProtocol : function(szProtocol, iCount, aszDomains)
    {
        try
        {
            this.m_Log.Write("nsDomainManager.js - getAllDomainsForProtocol -  START " + szProtocol);


            if (!szProtocol )
            {
                this.m_Log.Write("nsDomainManager.js - getAllDomainsForProtocol - bad param" );
                return 0;
            }

            var aResult = new Array();
            var szSQL;
            if (szProtocol.search(/pop/i)!=-1)
            {
               szSQL  = "SELECT pop_domains.domain, pop_domains.content_id, " +
                        "       domain_handler.content_id, domain_handler.enabled "
               szSQL += "FROM pop_domains, domain_handler ";
               szSQL += "WHERE pop_domains.content_id = domain_handler.content_id " +
                        "      AND domain_handler.enabled =\"true\" ";
               szSQL += "ORDER BY domain ASC ";
            }
            if (szProtocol.search(/smtp/i)!=-1)
            {
               szSQL  = "SELECT smtp_domains.domain, smtp_domains.content_id, " +
                        "       domain_handler.content_id, domain_handler.enabled "
               szSQL += "FROM smtp_domains, domain_handler ";
               szSQL += "WHERE smtp_domains.content_id = domain_handler.content_id " +
                        "      AND domain_handler.enabled =\"true\" ";
               szSQL += "ORDER BY domain ASC ";
            }
            if (szProtocol.search(/imap/i)!=-1)
            {
               szSQL  = "SELECT imap_domains.domain, imap_domains.content_id, " +
                        "       domain_handler.content_id, domain_handler.enabled "
               szSQL += "FROM imap_domains, domain_handler ";
               szSQL += "WHERE imap_domains.content_id = domain_handler.content_id " +
                        "      AND domain_handler.enabled =\"true\" ";
               szSQL += "ORDER BY domain ASC ";
            }
            
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
                this.m_Log.Write("nsDomainManager : getDomainForProtocol - DB Reset "+ this.m_dbConn.lastErrorString);
            }

            iCount.value = aResult.length;
            aszDomains.value = aResult;
            this.m_Log.Write("nsDomainManager.js - getAllDomainsForProtocol - " + iCount.value + " " + aszDomains.value);

            this.m_Log.Write("nsDomainManager.js - getAllDomainsForProtocol -  END" );
            return true;
        }
        catch(e)
        {
            this.m_Log.DebugDump("nsDomainManager.js: getAllDomainsForProtocol : Exception : "
                                          + e.name +
                                          ".\nError message: "
                                          + e.message+ "\n"
                                          + e.lineNumber+"\n"
                                          + "DB Reset "+ this.m_dbConn.lastErrorString);

            return false;
        }
    },


    getAllDomains : function(iCount, aszDomains)
    {
        try
        {
            this.m_Log.Write("nsDomainManager.js - getAllDomains -  START ");

            var aResult = new Array();
            var szSQL = "SELECT domain AS domain, ";
                szSQL+= "(CASE " +
                        "     WHEN (SELECT pop_domains.domain " +
                        "           FROM pop_domains, domain_handler " +
                        "           WHERE pop_domains.domain = view_all_domain.domain "  +
                        "                 AND domain_handler.enabled =\"true\" " +
                        "                 AND pop_domains.content_id =  domain_handler.content_id  ) <> 0 THEN 1 ELSE 0 " +
                        "END) AS pop, ";
                szSQL+= "(CASE " +
                        "      WHEN (SELECT smtp_domains.domain " +
                        "            FROM smtp_domains, domain_handler" +
                        "            WHERE smtp_domains.domain =view_all_domain.domain " +
                        "                  AND domain_handler.enabled =\"true\" " +
                        "                  AND smtp_domains.content_id =  domain_handler.content_id  ) <> 0 THEN 1 ELSE 0 " +
                        "END)  AS smtp, ";
                szSQL+="(CASE " +
                        "      WHEN (SELECT imap_domains.domain " +
                        "            FROM imap_domains, domain_handler " +
                        "            WHERE imap_domains.domain=view_all_domain.domain " +
                        "                  AND domain_handler.enabled =\"true\" " +
                        "                  AND imap_domains.content_id = domain_handler.content_id  ) <> 0 THEN 1 ELSE 0 " +
                        "END) AS imap ";
                szSQL+="FROM view_all_domain";


            var statement = this.m_dbConn.createStatement(szSQL);
            var wStatement = Components.classes["@mozilla.org/storage/statement-wrapper;1"]
                                       .createInstance(Components.interfaces.mozIStorageStatementWrapper);
            try
            {
                wStatement.initialize(statement);
                while (wStatement.step())
                {
                    var domainData = Components.classes["@mozilla.org/DomainData;1"].createInstance()
                                               .QueryInterface(Components.interfaces.nsIDomainData);

                    domainData.szDomain = wStatement.row["domain"];
                    domainData.bPOP = wStatement.row["pop"]? true : false;
                    domainData.bSMTP = wStatement.row["smtp"]? true : false;
                    domainData.bIMAP = wStatement.row["imap"]? true : false;
                    this.m_Log.Write("nsDomainManager : getAllDomains - " +domainData.szDomain 
                                                                    + " " + domainData.bPOP 
                                                                    + " " + domainData.bSMTP
                                                                    + " " + domainData.bIMAP);
                    if (domainData.bPOP ||domainData.bSMTP || domainData.bIMAP)
                        aResult.push(domainData);
                }
            }
            finally
            {
                statement.reset();
                this.m_Log.Write("nsDomainManager : getAllDomains - DB Reset "+ this.m_dbConn.lastErrorString);
            }

            iCount.value = aResult.length;
            aszDomains.value = aResult;
            this.m_Log.Write("nsDomainManager.js - getAllDomains - " + iCount.value);

            this.m_Log.Write("nsDomainManager.js - getAllDomains -  END" );
            return true;
        }
        catch(e)
        {
            this.m_Log.DebugDump("nsDomainManager.js: getAllDomains : Exception : "
                                          + e.name +
                                          ".\nError message: "
                                          + e.message+ "\n"
                                          + e.lineNumber+"\n"
                                          + "DB Reset "+ this.m_dbConn.lastErrorString);

            return false;
        }
    },


    removeDomainForProtocol : function(szAddress, szProtocol)
    {
        try
        {
            this.m_Log.Write("nsDomainManager.js - removeDomainForProtocol -  START" );
            this.m_Log.Write("nsDomainManager.js - removeDomainForProtocol - " + szAddress+ " " + szProtocol);

            if (!szAddress || !szProtocol )
            {
                this.m_Log.Write("nsDomainManager.js - removeDomainForProtocol - bad param" );
                return 0;
            }

            var szSQL;
            if (szProtocol.search(/pop/i)!=-1)
                szSQL = "DELETE FROM pop_domains WHERE domain LIKE ?1";
            if (szProtocol.search(/smtp/i)!=-1)
                szSQL = "DELETE FROM smtp_domains WHERE domain LIKE ?1";
            if (szProtocol.search(/imap/i)!=-1)
                szSQL = "DELETE FROM imap_domains WHERE domain LIKE ?1";

            var statement = this.m_dbConn.createStatement(szSQL);
            statement.bindStringParameter(0, szAddress.toLowerCase().replace(/\s/,""));
            statement.execute();

            this.m_Log.Write("nsDomainManager.js - removeDomainForProtocol -  END" );
            return true;
        }
        catch(e)
        {
            this.m_Log.DebugDump("nsDomainManager.js: removeDomainForProtocol : Exception : "
                                          + e.name +
                                          ".\nError message: "
                                          + e.message+ "\n"
                                          + e.lineNumber+"\n"
                                          + "DB Reset "+ this.m_dbConn.lastErrorString);
            return false;
        }
    },


    isReady : function()
    {
        try
        {
            this.m_Log.Write("nsDomainManager.js - isReady - " +this.m_bIsReady);
            return this.m_bIsReady;
        }
        catch(e)
        {
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
                this.m_scriptLoader.loadSubScript("chrome://web-mail/content/common/CommonPrefs.js");
                this.m_scriptLoader.loadSubScript("chrome://web-mail/content/common/DebugLog.js");
                this.m_scriptLoader.loadSubScript("chrome://web-mail/content/common/domainData.js");
                
                this.m_Log = new DebugLog("webmail.logging.comms",
                                          "{3c8e8390-2cf6-11d9-9669-0800200c9a66}",
                                          "Domainlog");
                this.m_Log.Write("nsDomainManager.js - profile-after-change ");
                this.loadDataBase();
            break;

            case "quit-application":
                this.m_Log.Write("nsDomainManager.js - quit-application ");
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
        if (!iid.equals(Components.interfaces.nsIDomainManager)
                && !iid.equals(Components.interfaces.nsISupports)
                    && !iid.equals(Components.interfaces.nsIObserver))
            throw Components.results.NS_ERROR_NO_INTERFACE;

        return this;
    }
}


/******************************************************************************/
/* FACTORY*/
var nsDomainManagerFactory = new Object();

nsDomainManagerFactory.createInstance = function (outer, iid)
{
    if (outer != null)
        throw Components.results.NS_ERROR_NO_AGGREGATION;

    if (!iid.equals(nsDomainManagerClassID)
            && !iid.equals(Components.interfaces.nsISupports))
        throw Components.results.NS_ERROR_INVALID_ARG;

    return new nsDomainManager();
}


/******************************************************************************/
/* MODULE */
var nsDomainManagerModule = new Object();

nsDomainManagerModule.registerSelf = function(compMgr, fileSpec, location, type)
{
    var catman = Components.classes["@mozilla.org/categorymanager;1"].
                        getService(Components.interfaces.nsICategoryManager);

    catman.addCategoryEntry("xpcom-startup",
                            "Domain Manager",
                            nsDomainManagerContactID,
                            true,
                            true);

    catman.addCategoryEntry("app-startup",
                            "Domain Manager",
                            "service," + nsDomainManagerContactID,
                            true,
                            true);


    compMgr = compMgr.QueryInterface(Components.interfaces.nsIComponentRegistrar);
    compMgr.registerFactoryLocation(nsDomainManagerClassID,
                                    "Domain Manager",
                                    nsDomainManagerContactID,
                                    fileSpec,
                                    location,
                                    type);
}


nsDomainManagerModule.unregisterSelf = function(aCompMgr, aFileSpec, aLocation)
{
    var catman = Components.classes["@mozilla.org/categorymanager;1"].
                            getService(Components.interfaces.nsICategoryManager);

    catman.deleteCategoryEntry("xpcom-startup", "Domain Manager", true);
    catman.deleteCategoryEntry("app-startup", "Domain Manager", true);

    aCompMgr = aCompMgr.QueryInterface(Components.interfaces.nsIComponentRegistrar);
    aCompMgr.unregisterFactoryLocation(nsDomainManagerClassID, aFileSpec);
}


nsDomainManagerModule.getClassObject = function(compMgr, cid, iid)
{
    if (!cid.equals(nsDomainManagerClassID))
        throw Components.results.NS_ERROR_NO_INTERFACE;

    if (!iid.equals(Components.interfaces.nsIFactory))
        throw Components.results.NS_ERROR_NOT_IMPLEMENTED;

    return nsDomainManagerFactory;
}


nsDomainManagerModule.canUnload = function(compMgr)
{
    return true;
}
/******************************************************************************/


function NSGetModule(compMgr, fileSpec)
{
    return nsDomainManagerModule;
}
