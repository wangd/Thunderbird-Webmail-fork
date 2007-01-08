const cszLycosPOPContentID = "@mozilla.org/LycosPOP;1";
const cszLycosIMAPContentID = "@mozilla.org/LycosIMAP;1";
const cszLycosSMTPContentID = "@mozilla.org/LycosSMTP;1";

window.addEventListener("load", function() {gLycosStartUp.init();} , false);

var gLycosStartUp =
{
    m_Log : null,

    init : function ()
    {
        try
        {
            //create debug log global
            this.m_Log = new DebugLog("webmail.logging.comms",
                                      "{3c8e8390-2cf6-11d9-9669-0800200c9a66}",
                                      "lycos");

            this.m_Log.Write("Lycos.js : init - START");

            var iCount = this.windowCount();
            if (iCount >1)
            {
                this.m_Log.Write("Lycos.js : - another window - END");
                return;
            }

            //convert prefs
            var WebMailPrefAccess = new WebMailCommonPrefAccess();
            var oPref = {Value : null};
            if (WebMailPrefAccess.Get("int","lycos.Account.Num",oPref))
            {
                //convert to new keys
                var iNum = oPref.Value;
                this.m_Log.Write("Lycos.js : - init - iNum " + iNum);

                for (var i=0; i<iNum; i++)
                {
                    oPref.Value = null;
                    if (WebMailPrefAccess.Get("char","lycos.Account."+i+".user",oPref))
                    {
                        this.m_Log.Write("Lycos.js : - init - userName " + oPref.Value);
                        var szUserName =  oPref.Value;
                        szUserName = szUserName.replace(/\./g,"_");
                        szUserName = szUserName.toLowerCase();

                        oPref.Value = null;
                        if (WebMailPrefAccess.Get("bool","lycos.Account."+i+".bUseJunkMail",oPref))
                        {
                            this.m_Log.Write("Lycos.js - init - bUseJunkMail " + oPref.Value);
                            WebMailPrefAccess.Set("bool","lycos.Account."+szUserName+".bUseJunkMail",oPref.Value)
                        }

                        //get unread
                        oPref.Value = null;
                        if (WebMailPrefAccess.Get("bool","lycos.Account."+i+".bDownloadUnread",oPref))
                        {
                            this.m_Log.Write("nslycos.js - init - bDownloadUnread " + oPref.Value);
                            WebMailPrefAccess.Set("bool","lycos.Account."+szUserName+".bDownloadUnread",oPref.Value)
                        }

                        //mark as read
                        oPref.Value = null;
                        if (WebMailPrefAccess.Get("bool","lycos.Account."+i+".bMarkAsRead",oPref))
                        {
                            this.m_Log.Write("Lycos.js - init - bMarkAsRead " + oPref.Value);
                            WebMailPrefAccess.Set("bool","lycos.Account."+szUserName+".bMarkAsRead",oPref.Value)
                        }

                        //get folders
                        oPref.Value = null;
                        if (WebMailPrefAccess.Get("char","lycos.Account."+i+".szFolders",oPref))
                        {
                            this.m_Log.Write("Lycos.js - init - szFolders " + oPref.Value);
                            WebMailPrefAccess.Set("char","lycos.Account."+szUserName+".szFolders",oPref.Value)
                        }


                        //empty trash
                        oPref.Value = null;
                        if (WebMailPrefAccess.Get("bool","lycos.Account."+i+".bEmptyTrash",oPref))
                        {
                            this.m_Log.Write("Lycos.js - init - bEmptyTrash " + oPref.Value);
                            WebMailPrefAccess.Set("bool","lycos.Account."+szUserName+".bEmptyTrash",oPref.Value)
                        }


                        // save copy
                        oPref.Value = null;
                        if (WebMailPrefAccess.Get("bool","lycos.Account."+i+".bSaveCopy",oPref))
                        {
                            this.m_Log.Write("Lycos.js - init - bSaveCopy " + oPref.Value);
                            WebMailPrefAccess.Set("bool","lycos.Account."+szUserName+".bSaveCopy",oPref.Value)
                        }

                        WebMailPrefAccess.DeleteBranch("lycos.Account."+i+".user");
                        WebMailPrefAccess.DeleteBranch("lycos.Account."+i+".bUseJunkMail");
                        WebMailPrefAccess.DeleteBranch("lycos.Account."+i+".bDownloadUnread");
                        WebMailPrefAccess.DeleteBranch("lycos.Account."+i+".bMarkAsRead");
                        WebMailPrefAccess.DeleteBranch("lycos.Account."+i+".szFolders");
                        WebMailPrefAccess.DeleteBranch("lycos.Account."+i+".bSaveCopy");
                        WebMailPrefAccess.DeleteBranch("lycos.Account."+i+".bEmptyTrash");
                    }
                }
                WebMailPrefAccess.DeleteBranch("lycos.Account.Num");
            }

            //delete unused keys
            WebMailPrefAccess.DeleteBranch("lycos.bDownloadUnread");
            WebMailPrefAccess.DeleteBranch("lycos.bSaveCopy");
            WebMailPrefAccess.DeleteBranch("lycos.bEmptyTrash");
            WebMailPrefAccess.DeleteBranch("lycos.bUseJunkMail");
            delete WebMailPrefAccess;
            window.removeEventListener("load", function() {gLycosStartUp.init();} , false);

            this.m_Log.Write("Lycos.js : init - END ");
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
            this.m_Log.Write("Lycos.js : windowCount - START");

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

            this.m_Log.Write("Lycos.js : windowCount - "+ iWindowCount +" END ");
            return iWindowCount;
        }
        catch(e)
        {
            this.m_Log.DebugDump("Lycos.js : Exception in shutDown "
                                            + e.name
                                            + ".\nError message: "
                                            + e.message);
        }
    },
};
