window.addEventListener("load", function() {gMailDotComStartUp.init();} , false);

var gMailDotComStartUp =
{
    m_Log : null,
    m_Timer : null,

    init : function ()
    {
        try
        {
            //create debug log global
            this.m_Log = new DebugLog("webmail.logging.comms",
                                      "{3c8e8390-2cf6-11d9-9669-0800200c9a66}",
                                      "maildotcom");

            this.m_Log.Write("MailDotCom.js : init - START");


            var iCount = this.windowCount();
            if (iCount >1)
            {
                this.m_Log.Write("MailDotCom.js : - another window - END");
                return;
            }


            //convert prefs
            var WebMailPrefAccess = new WebMailCommonPrefAccess();
            var oPref = {Value : null};
            if (WebMailPrefAccess.Get("int","maildotcom.Account.Num",oPref))
            {
                //convert to new keys
                var iNum = oPref.Value;
                this.m_Log.Write("MailDotCom.js : - init - iNum " + iNum);

                for (var i=0; i<iNum; i++)
                {
                    oPref.Value = null;
                    if (WebMailPrefAccess.Get("char","maildotcom.Account."+i+".user",oPref))
                    {
                        this.m_Log.Write("MailDotCom.js : - init - userName " + oPref.Value);
                        var szUserName =  oPref.Value;
                        szUserName = szUserName.replace(/\./g,"_");
                        szUserName = szUserName.toLowerCase();

                        oPref.Value = null;
                        if (WebMailPrefAccess.Get("bool","maildotcom.Account."+i+".bEmptyTrash",oPref))
                        {
                            this.m_Log.Write("MailDotCom.js - init - bEmptyTrash " + oPref.Value);
                            WebMailPrefAccess.Set("bool","maildotcom.Account."+szUserName+".bUseJunkMail",oPref.Value)
                        }

                        //get unread
                        oPref.Value = null;
                        if (WebMailPrefAccess.Get("bool","maildotcom.Account."+i+".bDownloadUnread",oPref))
                        {
                            this.m_Log.Write("MailDotCom.js - init - bDownloadUnread " + oPref.Value);
                            WebMailPrefAccess.Set("bool","maildotcom.Account."+szUserName+".bDownloadUnread",oPref.Value)
                        }

                        //get folders
                        oPref.Value = null;
                        if (WebMailPrefAccess.Get("char","maildotcom.Account."+i+".szFolders",oPref))
                        {
                            this.m_Log.Write("MailDotCom.js - init - szFolders " + oPref.Value);
                            WebMailPrefAccess.Set("char","maildotcom.Account."+szUserName+".szFolders",oPref.Value)
                        }

                        // save copy
                        oPref.Value = null;
                        if (WebMailPrefAccess.Get("bool","maildotcom.Account."+i+".bSaveCopy",oPref))
                        {
                            this.m_Log.Write("MailDotCom.js - init - bSaveCopy " + oPref.Value);
                            WebMailPrefAccess.Set("bool","maildotcom.Account."+szUserName+".bSaveCopy",oPref.Value)
                        }


                        //what do i do with alternative parts
                        oPref.Value = null;
                        if (WebMailPrefAccess.Get("bool","maildotcom.Account."+i+".bSendHtml",oPref))
                        {
                            this.m_Log.Write("MailDotCom.js - init - bSendHtml " + oPref.Value);
                            WebMailPrefAccess.Set("bool","maildotcom.Account."+szUserName+".bSendHtml",oPref.Value)
                        }

                        WebMailPrefAccess.DeleteBranch("maildotcom.Account."+i+".user");
                        WebMailPrefAccess.DeleteBranch("maildotcom.Account."+i+".bEmptyTrash");
                        WebMailPrefAccess.DeleteBranch("maildotcom.Account."+i+".bDownloadUnread");
                        WebMailPrefAccess.DeleteBranch("maildotcom.Account."+i+".szFolders");
                        WebMailPrefAccess.DeleteBranch("maildotcom.Account."+i+".bSaveCopy");
                        WebMailPrefAccess.DeleteBranch("maildotcom.Account."+i+".bSendHtml");
                    }
                }
                WebMailPrefAccess.DeleteBranch("maildotcom.Account.Num");
            }

            //delete unused keys
            WebMailPrefAccess.DeleteBranch("maildotcom.bDownloadUnread");
            WebMailPrefAccess.DeleteBranch("maildotcom.bSaveCopy");
            WebMailPrefAccess.DeleteBranch("maildotcom.bSendHtml");
            WebMailPrefAccess.DeleteBranch("maildotcom.bEmptyTrash");
            delete WebMailPrefAccess;


            window.removeEventListener("load", function() {gMailDotComStartUp.init();} , false);

            this.m_Log.Write("MailDotCom.js : init - END ");
        }
        catch(e)
        {
            this.m_Log.DebugDump("Lycos.js : Exception in init "
                                        + e.name +
                                        ".\nError message: "
                                        + e.message);
        }
    },



    windowCount : function()
    {
        try
        {
            this.m_Log.Write("MailDotCom.js : windowCount - START");

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

            this.m_Log.Write("MailDotCom.js : windowCount - "+ iWindowCount +" END ");
            return iWindowCount;
        }
        catch(e)
        {
            this.m_Log.DebugDump("MailDotCom.js : Exception in shutDown "
                                            + e.name
                                            + ".\nError message: "
                                            + e.message);
        }
    },
};
