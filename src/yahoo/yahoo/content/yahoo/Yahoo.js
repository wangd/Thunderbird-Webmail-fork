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
                        szUserName = szUserName.replace(/\./g,"_");
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
