window.addEventListener("load", function() {gHotmailStartUp.init();} , false);

var gHotmailStartUp =
{
    m_Log : null,

    init : function ()
    {
        try
        {
            //create debug log global
            this.m_Log = new DebugLog("webmail.logging.comms",
                                      "{3c8e8390-2cf6-11d9-9669-0800200c9a66}",
                                      "hotmail");

            this.m_Log.Write("Hotmail.js : init - START");


            var iCount = this.windowCount();
            if (iCount >1)
            {
                this.m_Log.Write("Hotmail.js : - another window - END");
                return;
            }


            //convert prefs
            var WebMailPrefAccess = new WebMailCommonPrefAccess();
            var oPref = {Value : null};

            if (!WebMailPrefAccess.Get("bool","hotmail.Account.updated",oPref))
            {
                //get user name list
                var aszUserList = this.getUserNames();
                for (var i=0; i<aszUserList.length; i++)
                {
                    var szOldUserName = aszUserList[i].replace(/\./g,"_");
                    this.m_Log.Write("nsHotmail.js - init - szOldUserName " +szOldUserName);
                    var szNewUserName = aszUserList[i].replace(/\./g,"~");
                    this.m_Log.Write("nsHotmail.js - init - szNewUserName " +szNewUserName);

                    if (WebMailPrefAccess.Get("int","hotmail.Account."+szOldUserName+".iMode",oPref))
                    {
                        this.m_Log.Write("nsHotmail.js - init - iMode " + oPref.Value);
                        WebMailPrefAccess.Set("int","hotmail.Account."+szNewUserName+".iMode",oPref.Value)
                    }

                    oPref.Value = null;
                    if (WebMailPrefAccess.Get("bool","hotmail.Account."+szOldUserName+".bUseJunkMail",oPref))
                    {
                        this.m_Log.Write("nsHotmail.js - init - bUseJunkMail " + oPref.Value);
                        WebMailPrefAccess.Set("bool","hotmail.Account."+szNewUserName+".bUseJunkMail",oPref.Value)
                    }

                    //get unread
                    oPref.Value = null;
                    if (WebMailPrefAccess.Get("bool","hotmail.Account."+szOldUserName+".bDownloadUnread",oPref))
                    {
                        this.m_Log.Write("nsHotmail.js - init - bDownloadUnread " + oPref.Value);
                        WebMailPrefAccess.Set("bool","hotmail.Account."+szNewUserName+".bDownloadUnread",oPref.Value)
                    }

                    //mark as read
                    oPref.Value = null;
                    if (WebMailPrefAccess.Get("bool","hotmail.Account."+szOldUserName+".bMarkAsRead",oPref))
                    {
                        this.m_Log.Write("nsHotmail.js - init - bMarkAsRead " + oPref.Value);
                        WebMailPrefAccess.Set("bool","hotmail.Account."+szNewUserName+".bMarkAsRead",oPref.Value)
                    }

                    //get folders
                    oPref.Value = null;
                    if (WebMailPrefAccess.Get("char","hotmail.Account."+szOldUserName+".szFolders",oPref))
                    {
                        this.m_Log.Write("nsHotmail.js - init - szFolders " + oPref.Value);
                        WebMailPrefAccess.Set("char","hotmail.Account."+szNewUserName+".szFolders",oPref.Value)
                    }

                    // save copy
                    oPref.Value = null;
                    if (WebMailPrefAccess.Get("bool","hotmail.Account."+szOldUserName+".bSaveCopy",oPref))
                    {
                        this.m_Log.Write("nsHotmailSMTP.js - init - bSaveCopy " + oPref.Value);
                        WebMailPrefAccess.Set("bool","hotmail.Account."+szNewUserName+".bSaveCopy",oPref.Value)
                    }


                    //what do i do with alternative parts
                    oPref.Value = null;
                    if (WebMailPrefAccess.Get("bool","hotmail.Account."+szOldUserName+".bSendHtml",oPref))
                    {
                        this.m_Log.Write("nsHotmailSMTP.js - init - bSendHtml " + oPref.Value);
                        WebMailPrefAccess.Set("bool","hotmail.Account."+szNewUserName+".bSendHtml",oPref.Value)
                    }

                    var aszUserName = szOldUserName.split(/@/);
                    if (aszUserName[0].search(/_/g)==-1)
                    {
                        WebMailPrefAccess.DeleteBranch("hotmail.Account."+szOldUserName+".iMode");
                        WebMailPrefAccess.DeleteBranch("hotmail.Account."+szOldUserName+".bUseJunkMail");
                        WebMailPrefAccess.DeleteBranch("hotmail.Account."+szOldUserName+".bDownloadUnread");
                        WebMailPrefAccess.DeleteBranch("hotmail.Account."+szOldUserName+".bMarkAsRead");
                        WebMailPrefAccess.DeleteBranch("hotmail.Account."+szOldUserName+".szFolders");
                        WebMailPrefAccess.DeleteBranch("hotmail.Account."+szOldUserName+".bSaveCopy");
                        WebMailPrefAccess.DeleteBranch("hotmail.Account."+szOldUserName+".bSendHtml");
                    }
                }

                WebMailPrefAccess.Set("bool","hotmail.Account.updated",true);
            }

            oPref.Value = null;
            if (WebMailPrefAccess.Get("int","hotmail.Account.Num",oPref))
            {
                //convert to new keys
                var iNum = oPref.Value;
                this.m_Log.Write("Hotmail.js : - init - iNum " + iNum);

                for (var i=0; i<iNum; i++)
                {
                    oPref.Value = null;
                    if (WebMailPrefAccess.Get("char","hotmail.Account."+i+".user",oPref))
                    {
                        this.m_Log.Write("Hotmail.js : - init - userName " + oPref.Value);
                        var szUserName =  oPref.Value;
                        szUserName = szUserName.replace(/\./g,"~");
                        szUserName = szUserName.toLowerCase();

                        oPref.Value = null;
                        if (WebMailPrefAccess.Get("int","hotmail.Account."+i+".iMode",oPref))
                        {
                            this.m_Log.Write("nsHotmail.js - init - iMode " + oPref.Value);
                            WebMailPrefAccess.Set("int","hotmail.Account."+szUserName+".iMode",oPref.Value)
                        }

                        oPref.Value = null;
                        if (WebMailPrefAccess.Get("bool","hotmail.Account."+i+".bUseJunkMail",oPref))
                        {
                            this.m_Log.Write("nsHotmail.js - init - bUseJunkMail " + oPref.Value);
                            WebMailPrefAccess.Set("bool","hotmail.Account."+szUserName+".bUseJunkMail",oPref.Value)
                        }

                        //get unread
                        oPref.Value = null;
                        if (WebMailPrefAccess.Get("bool","hotmail.Account."+i+".bDownloadUnread",oPref))
                        {
                            this.m_Log.Write("nsHotmail.js - init - bDownloadUnread " + oPref.Value);
                            WebMailPrefAccess.Set("bool","hotmail.Account."+szUserName+".bDownloadUnread",oPref.Value)
                        }

                        //mark as read
                        oPref.Value = null;
                        if (WebMailPrefAccess.Get("bool","hotmail.Account."+i+".bMarkAsRead",oPref))
                        {
                            this.m_Log.Write("nsHotmail.js - init - bMarkAsRead " + oPref.Value);
                            WebMailPrefAccess.Set("bool","hotmail.Account."+szUserName+".bMarkAsRead",oPref.Value)
                        }

                        //get folders
                        oPref.Value = null;
                        if (WebMailPrefAccess.Get("char","hotmail.Account."+i+".szFolders",oPref))
                        {
                            this.m_Log.Write("nsHotmail.js - init - szFolders " + oPref.Value);
                            WebMailPrefAccess.Set("char","hotmail.Account."+szUserName+".szFolders",oPref.Value)
                        }

                        // save copy
                        oPref.Value = null;
                        if (WebMailPrefAccess.Get("bool","hotmail.Account."+i+".bSaveCopy",oPref))
                        {
                            this.m_Log.Write("nsHotmailSMTP.js - init - bSaveCopy " + oPref.Value);
                            WebMailPrefAccess.Set("bool","hotmail.Account."+szUserName+".bSaveCopy",oPref.Value)
                        }


                        //what do i do with alternative parts
                        oPref.Value = null;
                        if (WebMailPrefAccess.Get("bool","hotmail.Account."+i+".bSendHtml",oPref))
                        {
                            this.m_Log.Write("nsHotmailSMTP.js - init - bSendHtml " + oPref.Value);
                            WebMailPrefAccess.Set("bool","hotmail.Account."+szUserName+".bSendHtml",oPref.Value)
                        }

                        WebMailPrefAccess.DeleteBranch("hotmail.Account."+i+".user");
                        WebMailPrefAccess.DeleteBranch("hotmail.Account."+i+".iMode");
                        WebMailPrefAccess.DeleteBranch("hotmail.Account."+i+".bUseJunkMail");
                        WebMailPrefAccess.DeleteBranch("hotmail.Account."+i+".bDownloadUnread");
                        WebMailPrefAccess.DeleteBranch("hotmail.Account."+i+".bMarkAsRead");
                        WebMailPrefAccess.DeleteBranch("hotmail.Account."+i+".szFolders");
                        WebMailPrefAccess.DeleteBranch("hotmail.Account."+i+".bSaveCopy");
                        WebMailPrefAccess.DeleteBranch("hotmail.Account."+i+".bSendHtml");
                    }
                }
                WebMailPrefAccess.DeleteBranch("hotmail.Account.Num");
                WebMailPrefAccess.Set("bool","hotmail.Account.updated",true);
            }

            //delete unused keys
            WebMailPrefAccess.DeleteBranch("hotmail.bDownloadUnread");
            WebMailPrefAccess.DeleteBranch("hotmail.bSaveCopy");
            WebMailPrefAccess.DeleteBranch("hotmail.bSendHtml");
            WebMailPrefAccess.DeleteBranch("hotmail.bUseJunkMail");
            delete WebMailPrefAccess;

            window.removeEventListener("load", function() {gHotmailStartUp.init();} , false);

            this.m_Log.Write("Hotmail.js : init - END ");
        }
        catch(e)
        {
            this.m_Log.DebugDump("Hotmail.js : Exception in init "
                                        + e.name +
                                        ".\nError message: "
                                        + e.message + "\n"
                                        + e.lineNumber);
        }
    },



    getUserNames : function ()
    {
        try
        {
            this.m_Log.Write("Hotmail.js: getUserNames - START");

            var cszHotmailContentID = "@mozilla.org/HotmailPOP;1";
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
                    this.m_Log.Write("Hotmail.js : getUserNames - userName " + szUserName);
                    if (szUserName)
                    {
                        if (szUserName.search(/@/)==-1)
                        {
                            szUserName = currentServer.username;
                            this.m_Log.Write("Hotmail.js  : getUserNames - realuserName " + szUserName);
                        }

                        if (szUserName.search(/@/)!=-1)
                        {
                            var szDomain = szUserName.split("@")[1];
                            this.m_Log.Write("Hotmail.js : getUserNames - szDomain " + szDomain);

                            var szContentID ={value:null};
                            if (domainManager.getDomainForProtocol(szDomain,"pop", szContentID))//domain found
                            {
                                if (szContentID.value == cszHotmailContentID) //Hotmail account found
                                {
                                   this.m_Log.Write("Hotmail.js : getUserNames - userName added " + szUserName);
                                   aszUserList.push(szUserName.toLowerCase());
                                }
                            }
                        }
                    }
                }
            }

            this.m_Log.Write("Hotmail-Pref-Accounts : getUserNames - END");
            return aszUserList;
        }
        catch(e)
        {
            this.m_Log.DebugDump("Hotmail-Pref-Accounts : Exception in getUserNames : "
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
            this.m_Log.Write("Hotmail.js : windowCount - START");

            var iWindowCount = 0;
            var winman = Components.classes["@mozilla.org/appshell/window-mediator;1"];
            winman = winman.getService(Components.interfaces.nsIWindowMediator);
            var e = winman.getEnumerator(null);

            while (e.hasMoreElements())
            {
                var win = e.getNext();
                win.QueryInterface(Components.interfaces.nsIDOMWindowInternal);
                var szValue = win.document.documentElement.getAttribute("id");
                this.m_Log.Write("Hotmail.js : windowCount - "+ szValue);

                if (szValue =="messengerWindow")iWindowCount++;
            }

            this.m_Log.Write("Hotmail.js : windowCount - "+ iWindowCount +" END ");
            return iWindowCount;
        }
        catch(e)
        {
            this.m_Log.DebugDump("Hotmail.js : Exception in shutDown "
                                            + e.name
                                            + ".\nError message: "
                                            + e.message);
        }
    },
};
