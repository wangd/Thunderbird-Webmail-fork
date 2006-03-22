var gYahooFolder =
{
    m_DebugLog : new DebugLog("webmail.logging.comms", 
                              "{3c8e8390-2cf6-11d9-9669-0800200c9a66}",
                              "yahooPrefs"),
    m_aPrefList : null,
                               
    init : function ()
    {
        try
        {
            this.m_DebugLog.Write("Yahoo-Prefs-Folders : Init - START");

            this.getAccountList();
                
            this.m_DebugLog.Write("Yahoo-Prefs-Folders : Init - END");
        }
        catch(e)
        {
            this.m_DebugLog.DebugDump("Yahoo-Prefs-Folders : Exception in init : " 
                                          + e.name + 
                                          ".\nError message: " 
                                          + e.message + "\n"
                                          + e.lineNumber);
        }        
    },
    
    
    getAccountList : function ()
    {
        try
        {
            this.m_DebugLog.Write("Yahoo-Prefs-Folders : getAccountList - START");

            this.m_aszUserList =  new Array(); 
            var accountManager = Components.classes["@mozilla.org/messenger/account-manager;1"].
                                            getService(Components.interfaces.nsIMsgAccountManager);
        
            var allServers = accountManager.allServers;
            
            for (var i=0; i < allServers.Count(); i++)
            {
                var currentServer = allServers.GetElementAt(i).
                                        QueryInterface(Components.interfaces.nsIMsgIncomingServer);
              
                var szUserName = currentServer.username;
                this.m_DebugLog.Write("Yahoo-Prefs-Folders : getUserNameList - userName " + szUserName);
                if (szUserName)
                {
                    if (szUserName.search(/@/)==-1) 
                    {
                        szUserName = currentServer.realUsername ;
                        this.m_DebugLog.Write("Yahoo-Prefs-Folders : getUserNameList - realuserName " + szUserName);
                    }
                    
                    if (szUserName.search(/yahoo/i)!=-1 || szUserName.search(/talk21/i)!= -1 || 
                            szUserName.search(/btinternet/i)!= -1 || szUserName.search(/btopenworld/i)!= -1)
                    {
                        this.m_DebugLog.Write("Yahoo-Prefs-Folders : getUserNameList - userName added");
                        var data = new YahooFolders();      
                        data.szUser = szUserName;                                              
                        this.m_aszUserList.push(data);   
                    }
                }
            }

            this.m_DebugLog.Write("Yahoo-Prefs-Folders : getAccountList - END");
            return true;
        }
        catch(e)
        {
            this.m_DebugLog.DebugDump("Yahoo-Prefs-Folders : Exception in getAccountList : " 
                                          + e.name + 
                                          ".\nError message: " 
                                          + e.message + "\n"
                                          + e.lineNumber);
        }
    },


    readFolderPref : function ()
    {
        try
        {
            this.m_DebugLog.Write("Yahoo-Prefs-Folders : readModePref - START"); 
            
            var szPrefs = document.getElementById("prefFolders").value;     
            this.m_DebugLog.Write("Yahoo-Prefs-Folders : readModePref - Folders " + szPrefs);  
            if (szPrefs)
            {
                this.m_aUserList = new Array();
                
                var aszUsers =szPrefs.split("\n");
                this.m_DebugLog.Write("Yahoo-Prefs-Folders : readModePref - aszUsers " + aszUsers);
                
                for (i=0;i<aszUsers.length ; i++)
                {
                    var aszFolders = aszUsers.split("\r");
                    
                    var data = new YahooFolders();
                
                    //user name
                    data.szUser = aszFolders[0];
                
                    //inbox
                    if (aszFolders[1].search(/true/i)!=-1) data.bInbox = true;
                
                    //spam
                    if (aszFolders[2].search(/true/i)!=-1) data.bSpam = true;
                    
                    
                    //custom folders
                    if (aszFolders.length>3)
                    {
                        for (j=3; j<aszFolders.length; j++)
                        {
                            this.m_DebugLog.Write("Yahoo-Prefs-Folders : readModePref - aszFolders[j] " + aszFolders[j]);
                            data.aszCustom.push(aszFolders[j]);
                        }
                    }
                    
                    this.m_aPrefList.push(data);
                }
            }
            
            this.m_DebugLog.Write("Yahoo-Prefs-Folders : readModePref - END");
            return undefined;
        }
        catch(e)
        {
            this.m_DebugLog.DebugDump("Yahoo-Prefs-Folders : Exception in readModePref : " 
                                   + e.name + 
                                   ".\nError message: " 
                                   + e.message + "\n"
                                   + e.lineNumber);
        }  
    },
    
    writeFolderPref : function ()
    {
        try
        {
            this.m_DebugLog.Write("Yahoo-Prefs-Folders : writeModePref - START"); 
            
            var szData= "";
            
            for (i=0; i<this.m_aPrefList.length; i++)
            {
                var oData = this.m_aPrefList[i];
                var temp = ""
                temp=oData[0]+"\r"+oData[1]+"\r"+oData[2];
                
                for (j=0; j<oData.aszCustom.length; j++)
                {
                    temp += "\r"+oData.aszCustom[j];
                }
                szData+= temp + "\n";
            }
            this.m_DebugLog.Write("Yahoo-Prefs-Folders : writeModePref - szData "+ szData); 
                        
            this.m_DebugLog.Write("Yahoo-Prefs-Folders : writeModePref - END");
            return (szData)? szData : "";
        }
        catch(e)
        {
            this.m_DebugLog.DebugDump("Yahoo-Prefs-Folders : Exception in writeModePref : " 
                                   + e.name + 
                                   ".\nError message: " 
                                   + e.message + "\n"
                                   + e.lineNumber);
        }  
    },
    
    
    onDClick : function ()
    {
        try
        {
            this.m_DebugLog.Write("Yahoo-Prefs-Folders : onDClick - START");
                      
            this.m_DebugLog.Write("Yahoo-Prefs-Folders : onDClick - END");
            return true;
        }
        catch(e)
        {
             this.m_DebugLog.DebugDump("Yahoo-Prefs-Folders : Exception in onDClick : " 
                                          + e.name + 
                                          ".\nError message: " 
                                          + e.message + "\n"
                                          + e.lineNumber);
        }
    },
    
    
    
    onSelect : function ()
    {
        try
        {
            this.m_DebugLog.Write("Yahoo-Prefs-Folders : onSelect - START");

            this.m_DebugLog.Write("Yahoo-Prefs-Folders : onSelect - END");
            return true;
        }
        catch(e)
        {
            this.m_DebugLog.DebugDump("Yahoo-Prefs-Folders : Exception in onSelect : " 
                                          + e.name + 
                                          ".\nError message: " 
                                          + e.message + "\n"
                                          + e.lineNumber);
        }
    },
    
    add : function ()
    {
        try
        {
            this.m_DebugLog.Write("Yahoo-Prefs-Folders : add - START");

            this.m_DebugLog.Write("Yahoo-Prefs-Folders : add - END");
            return true;
        }
        catch(e)
        {
            this.m_DebugLog.DebugDump("Yahoo-Prefs-Folders : Exception in add : " 
                                          + e.name + 
                                          ".\nError message: " 
                                          + e.message + "\n"
                                          + e.lineNumber);
        }
    },
};
