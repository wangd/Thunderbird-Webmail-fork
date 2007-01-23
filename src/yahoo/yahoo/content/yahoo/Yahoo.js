window.addEventListener("load", function() {gYahooStartUp.init();} , false);

var gYahooStartUp =
{
    m_Log : null,

    init : function ()
    {
        try
        {
            //create debug log global
            this.m_Log = new DebugLog("webmail.logging.comms",
                                      "{3c8e8390-2cf6-11d9-9669-0800200c9a66}",
                                      "yahoo");

            this.m_Log.Write("Yahoo.js : YahooStartUp - START");

            var iCount = this.windowCount();
            if (iCount >1)
            {
                this.m_Log.Write("Yahoo.js : - another window - END");
                return;
            }

            window.removeEventListener("load", function() {gYahooStartUp.init();} , false);

            //convert prefs
            var WebMailPrefAccess = new WebMailCommonPrefAccess();
            var oPref = {Value : null};
            if (!WebMailPrefAccess.Get("bool","yahoo.Account.Update",oPref))
            {
                //get user name list
                var aszUserList = this.getUserNames();
                for (var i=0; i<aszUserList.length; i++)
                {
                    var szOldUserName = aszUserList[i].replace(/\./g,"_");
                    this.m_Log.Write("yahoo.js - init - szOldUserName " +szOldUserName);
                    var szNewUserName = aszUserList[i].replace(/\./g,"~");
                    this.m_Log.Write("yahoo.js - init - szNewUserName " +szNewUserName);

                    if (WebMailPrefAccess.Get("bool","yahoo.Account."+szOldUserName+".bBeta",oPref))
                    {
                        this.m_Log.Write("yahoo.js - init - iMode " + oPref.Value);
                        WebMailPrefAccess.Set("bool","yahoo.Account."+szNewUserName+".bBeta",oPref.Value)
                    }

                    oPref.Value = null;
                    if (WebMailPrefAccess.Get("bool","yahoo.Account."+szOldUserName+".bUseJunkMail",oPref))
                    {
                        this.m_Log.Write("yahoo.js - init - bUseJunkMail " + oPref.Value);
                        WebMailPrefAccess.Set("bool","yahoo.Account."+szNewUserName+".bUseJunkMail",oPref.Value)
                    }

                    //get unread
                    oPref.Value = null;
                    if (WebMailPrefAccess.Get("bool","yahoo.Account."+szOldUserName+".bDownloadUnread",oPref))
                    {
                        this.m_Log.Write("yahoo.js - init - bDownloadUnread " + oPref.Value);
                        WebMailPrefAccess.Set("bool","yahoo.Account."+szNewUserName+".bDownloadUnread",oPref.Value)
                    }

                    //get folders
                    oPref.Value = null;
                    if (WebMailPrefAccess.Get("char","yahoo.Account."+szOldUserName+".szFolders",oPref))
                    {
                        this.m_Log.Write("yahoo.js - init - szFolders " + oPref.Value);
                        WebMailPrefAccess.Set("char","yahoo.Account."+szNewUserName+".szFolders",oPref.Value)
                    }

                    // save copy
                    oPref.Value = null;
                    if (WebMailPrefAccess.Get("bool","yahoo.Account."+szOldUserName+".bSaveCopy",oPref))
                    {
                        this.m_Log.Write("yahoo.js - init - bSaveCopy " + oPref.Value);
                        WebMailPrefAccess.Set("bool","yahoo.Account."+szNewUserName+".bSaveCopy",oPref.Value)
                    }

                    var aszUserName = szOldUserName.split(/@/);
                    if (aszUserName[0].search(/_/g)==-1)
                    {
                        WebMailPrefAccess.DeleteBranch("yahoo.Account."+szOldUserName+".bBeta");
                        WebMailPrefAccess.DeleteBranch("yahoo.Account."+szOldUserName+".bUseJunkMail");
                        WebMailPrefAccess.DeleteBranch("yahoo.Account."+szOldUserName+".bDownloadUnread");
                        WebMailPrefAccess.DeleteBranch("yahoo.Account."+szOldUserName+".bMarkAsRead");
                        WebMailPrefAccess.DeleteBranch("yahoo.Account."+szOldUserName+".szFolders");
                        WebMailPrefAccess.DeleteBranch("yahoo.Account."+szOldUserName+".bSaveCopy");
                    }
                }

                WebMailPrefAccess.Set("bool","yahoo.Account.updated",true);
            }



            oPref.Value = null;
            if (WebMailPrefAccess.Get("int","yahoo.Account.Num",oPref))
            {
                //convert to new keys
                var iNum = oPref.Value;
                this.m_Log.Write("Yahoo.js : - init - iNum " + iNum);

                for (var i=0; i<iNum; i++)
                {
                    oPref.Value = null;
                    if (WebMailPrefAccess.Get("char","yahoo.Account."+i+".user",oPref))
                    {
                        this.m_Log.Write("Yahoo.js : - init - userName " + oPref.Value);
                        var szUserName =  oPref.Value;
                        szUserName = szUserName.replace(/\./g,"~");
                        szUserName = szUserName.toLowerCase();

                        oPref.Value = null;
                        if (WebMailPrefAccess.Get("bool","yahoo.Account."+i+".bBeta",oPref))
                        {
                            this.m_Log.Write("yahoo.js - init - iMode " + oPref.Value);
                            WebMailPrefAccess.Set("bool","yahoo.Account."+szUserName+".bBeta",oPref.Value)
                        }

                        oPref.Value = null;
                        if (WebMailPrefAccess.Get("bool","yahoo.Account."+i+".bUseJunkMail",oPref))
                        {
                            this.m_Log.Write("yahoo.js - init - bUseJunkMail " + oPref.Value);
                            WebMailPrefAccess.Set("bool","yahoo.Account."+szUserName+".bUseJunkMail",oPref.Value)
                        }

                        //get unread
                        oPref.Value = null;
                        if (WebMailPrefAccess.Get("bool","yahoo.Account."+i+".bDownloadUnread",oPref))
                        {
                            this.m_Log.Write("yahoo.js - init - bDownloadUnread " + oPref.Value);
                            WebMailPrefAccess.Set("bool","yahoo.Account."+szUserName+".bDownloadUnread",oPref.Value)
                        }

                        //get folders
                        oPref.Value = null;
                        if (WebMailPrefAccess.Get("char","yahoo.Account."+i+".szFolders",oPref))
                        {
                            this.m_Log.Write("yahoo.js - init - szFolders " + oPref.Value);
                            WebMailPrefAccess.Set("char","yahoo.Account."+szUserName+".szFolders",oPref.Value)
                        }

                        // save copy
                        oPref.Value = null;
                        if (WebMailPrefAccess.Get("bool","yahoo.Account."+i+".bSaveCopy",oPref))
                        {
                            this.m_Log.Write("yahoo.js - init - bSaveCopy " + oPref.Value);
                            WebMailPrefAccess.Set("bool","yahoo.Account."+szUserName+".bSaveCopy",oPref.Value)
                        }

                        WebMailPrefAccess.DeleteBranch("yahoo.Account."+i+".user");
                        WebMailPrefAccess.DeleteBranch("yahoo.Account."+i+".bBeta");
                        WebMailPrefAccess.DeleteBranch("yahoo.Account."+i+".bUseJunkMail");
                        WebMailPrefAccess.DeleteBranch("yahoo.Account."+i+".bDownloadUnread");
                        WebMailPrefAccess.DeleteBranch("yahoo.Account."+i+".bMarkAsRead");
                        WebMailPrefAccess.DeleteBranch("yahoo.Account."+i+".szFolders");
                        WebMailPrefAccess.DeleteBranch("yahoo.Account."+i+".bSaveCopy");
                    }
                }
                WebMailPrefAccess.DeleteBranch("yahoo.Account.Num");
                WebMailPrefAccess.Set("bool","yahoo.Account.updated",true);
            }

            //delete unused keys
            WebMailPrefAccess.DeleteBranch("yahoo.bDownloadUnread");
            WebMailPrefAccess.DeleteBranch("yahoo.bSaveCopy");
            WebMailPrefAccess.DeleteBranch("yahoo.bUseJunkMail");
            delete WebMailPrefAccess;

            this.m_Log.Write("Yahoo.js : YahooStartUP - END ");
        }
        catch(e)
        {
            this.m_Log.DebugDump("Yahoo.js : Exception in YahooStartUp "
                                        + e.name +
                                        ".\nError message: "
                                        + e.message);
        }
    },




    getUserNames : function ()
    {
        try
        {
            this.m_Log.Write("Yahoo.js: getUserNames - START");

            var cContentID = "@mozilla.org/YahooPOP;1";
            var aszUserList =  new Array();
            var accountManager = Components.classes["@mozilla.org/messenger/account-manager;1"]
                                           .getService(Components.interfaces.nsIMsgAccountManager);

            var domainManager = Components.classes["@mozilla.org/DomainManager;1"]
                                          .getService(Components.interfaces.nsIDomainManager);

            var allServers = accountManager.allServers;

            for (var i=0; i < allServers.Count(); i++)
            {
                var currentServer = allServers.GetElementAt(i)
                                              .QueryInterface(Components.interfaces.nsIMsgIncomingServer);

                if (currentServer.type.search(/pop3/i)!=-1)  //found pop account
                {
                    var szUserName = currentServer.realUsername;
                    this.m_Log.Write("Yahoo.js : getUserNames - userName " + szUserName);
                    if (szUserName)
                    {
                        if (szUserName.search(/@/)==-1)
                        {
                            szUserName = currentServer.username;
                            this.m_Log.Write("Yahoo.js  : getUserNames - realuserName " + szUserName);
                        }

                        if (szUserName.search(/@/)!=-1)
                        {
                            var szDomain = szUserName.split("@")[1];
                            this.m_Log.Write("Yahoo.js : getUserNames - szDomain " + szDomain);

                            var szContentID ={value:null};
                            if (domainManager.getDomainForProtocol(szDomain,"pop", szContentID))//domain found
                            {
                                if (szContentID.value == cContentID) //account found
                                {
                                   this.m_Log.Write("Yahoo.js : getUserNames - userName added " + szUserName);
                                   aszUserList.push(szUserName.toLowerCase());
                                }
                            }
                        }
                    }
                }
            }

            this.m_Log.Write("Yahoo : getUserNames - END");
            return aszUserList;
        }
        catch(e)
        {
            this.m_Log.DebugDump("Yahoo : Exception in getUserNames : "
                                          + e.name +
                                          ".\nError message: "
                                          + e.message + "\n"
                                          + e.lineNumber);
        }
    },




    windowCount : function()
    {
        try
        {
            this.m_Log.Write("Yahoo.js : windowCount - START");

            var iWindowCount = 0;
            var winman = Components.classes["@mozilla.org/appshell/window-mediator;1"];
            winman = winman.getService(Components.interfaces.nsIWindowMediator);
            var e = winman.getEnumerator(null);

            while (e.hasMoreElements())
            {
                var win = e.getNext();
                win.QueryInterface(Components.interfaces.nsIDOMWindowInternal);
                var szValue = win.document.documentElement.getAttribute("id");
                this.m_Log.Write("Yahoo.js : windowCount - "+ szValue);

                if (szValue =="messengerWindow")iWindowCount++;
            }

            this.m_Log.Write("Yahoo.js : windowCount - "+ iWindowCount +" END ");
            return iWindowCount;
        }
        catch(e)
        {
            this.m_Log.DebugDump("Yahoo.js : Exception in shutDown "
                                            + e.name
                                            + ".\nError message: "
                                            + e.message);
        }
    },
};
