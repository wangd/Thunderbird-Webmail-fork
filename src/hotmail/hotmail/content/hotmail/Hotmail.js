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
                        szUserName = szUserName.replace(/\./g,"_");
                        szUserName = szUserName.toLowerCase();

                        oPref.Value = null;
                        if (WebMailPrefAccess.Get("bool","hotmail.Account."+i+".iMode",oPref))
                        {
                            this.m_Log.Write("nsHotmail.js - init - iMode " + oPref.Value);
                            WebMailPrefAccess.Set("bool","hotmail.Account."+szUserName+".iMode",oPref.Value)
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
