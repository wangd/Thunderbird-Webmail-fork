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
            
            if (!WebMailPrefAccess.Get("int","hotmail.version",oPref))
            { 
                WebMailPrefAccess.DeleteBranch("hotmail.Account.updated");
                WebMailPrefAccess.Set("int","hotmail.version", 1); 
            }

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
