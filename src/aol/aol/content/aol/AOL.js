window.addEventListener("load", function() {gAOLStartUp.init();} , false);

var gAOLStartUp =
{
    m_Log : null,

    init : function ()
    {
        try
        {
            //create debug log global
            this.m_Log = new DebugLog("webmail.logging.comms",
                                      "{3c8e8390-2cf6-11d9-9669-0800200c9a66}",
                                      "AOL");

            this.m_Log.Write("AOL.js : init - START");


            var iCount = this.windowCount();
            if (iCount >1)
            {
                this.m_Log.Write("AOL.js : - another window - END");
                return;
            }


            //convert prefs
            var WebMailPrefAccess = new WebMailCommonPrefAccess();
            var oPref = {Value : null};
            if (WebMailPrefAccess.Get("int","aol.Account.Num",oPref))
            {
                //convert to new keys
                var iNum = oPref.Value;
                this.m_Log.Write("AOL.js : - init - iNum " + iNum);

                for (var i=0; i<iNum; i++)
                {
                    oPref.Value = null;
                    if (WebMailPrefAccess.Get("char","aol.Account."+i+".user",oPref))
                    {
                        this.m_Log.Write("AOL.js : - init - userName " + oPref.Value);
                        var szUserName =  oPref.Value;
                        szUserName = szUserName.replace(/\./g,"_");
                        szUserName = szUserName.toLowerCase();

                        oPref.Value = null;
                        if (WebMailPrefAccess.Get("bool","aol.Account."+i+".bUseJunkMail",oPref))
                        {
                            this.m_Log.Write("AOL.js - init - bUseJunkMail " + oPref.Value);
                            WebMailPrefAccess.Set("bool","aol.Account."+szUserName+".bUseJunkMail",oPref.Value)
                        }

                        //get unread
                        oPref.Value = null;
                        if (WebMailPrefAccess.Get("bool","aol.Account."+i+".bDownloadUnread",oPref))
                        {
                            this.m_Log.Write("AOL.js - init - bDownloadUnread " + oPref.Value);
                            WebMailPrefAccess.Set("bool","aol.Account."+szUserName+".bDownloadUnread",oPref.Value)
                        }

                        //mark as read
                        oPref.Value = null;
                        if (WebMailPrefAccess.Get("bool","aol.Account."+i+".bMarkAsRead",oPref))
                        {
                            this.m_Log.Write("AOL.js - init - bMarkAsRead " + oPref.Value);
                            WebMailPrefAccess.Set("bool","aol.Account."+szUserName+".bMarkAsRead",oPref.Value)
                        }

                        //get folders
                        oPref.Value = null;
                        if (WebMailPrefAccess.Get("char","aol.Account."+i+".szFolders",oPref))
                        {
                            this.m_Log.Write("AOL.js - init - szFolders " + oPref.Value);
                            WebMailPrefAccess.Set("char","aol.Account."+szUserName+".szFolders",oPref.Value)
                        }

                        WebMailPrefAccess.DeleteBranch("aol.Account."+i+".user");
                        WebMailPrefAccess.DeleteBranch("aol.Account."+i+".bUseJunkMail");
                        WebMailPrefAccess.DeleteBranch("aol.Account."+i+".bDownloadUnread");
                        WebMailPrefAccess.DeleteBranch("aol.Account."+i+".bMarkAsRead");
                        WebMailPrefAccess.DeleteBranch("aol.Account."+i+".szFolders");
                    }
                }
                WebMailPrefAccess.DeleteBranch("aol.Account.Num");
            }

            //delete unused keys
            WebMailPrefAccess.DeleteBranch("aol.bDownloadUnread");
            WebMailPrefAccess.DeleteBranch("aol.bUseJunkMail");
            delete WebMailPrefAccess;

            window.removeEventListener("load", function() {gAOLStartUp.init();} , false);

            this.m_Log.Write("AOL.js : init - END ");
        }
        catch(e)
        {
            this.m_Log.DebugDump("AOL.js : Exception in init "
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
            this.m_Log.Write("AOL.js : windowCount - START");

            var iWindowCount = 0;
            var winman = Components.classes["@mozilla.org/appshell/window-mediator;1"];
            winman = winman.getService(Components.interfaces.nsIWindowMediator);
            var e = winman.getEnumerator(null);

            while (e.hasMoreElements())
            {
                var win = e.getNext();
                win.QueryInterface(Components.interfaces.nsIDOMWindowInternal);
                var szValue = win.document.documentElement.getAttribute("id");
                this.m_Log.Write("AOL.js : windowCount - "+ szValue);

                if (szValue =="messengerWindow")iWindowCount++;
            }

            this.m_Log.Write("AOL.js : windowCount - "+ iWindowCount +" END ");
            return iWindowCount;
        }
        catch(e)
        {
            this.m_Log.DebugDump("AOL.js : Exception in shutDown "
                                            + e.name
                                            + ".\nError message: "
                                            + e.message);
        }
    },
};