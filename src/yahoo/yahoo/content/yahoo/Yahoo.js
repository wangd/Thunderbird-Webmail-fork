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
            if (!WebMailPrefAccess.Get("int","yahoo.version",oPref))
            {
                var bReuseSession = true;
                if (WebMailPrefAccess.Get("bool","yahoo.bReUseSession",oPref))
                    bReuseSession = oPref.Value;
                
                var bShortId = false;   
                if (WebMailPrefAccess.Get("bool","yahoo.bUseShortID",oPref))
                    bShortId = oPref.Value;

                
                var aszUserList = this.getUserNames();
                for (var i=0; i<aszUserList.length; i++)
                {
                    var szUserName = aszUserList[i].replace(/\./g,"~");
                    this.m_Log.Write("yahoo.js - init - szUserName " +szUserName + 
                                                        " bShortId " + bShortId +
                                                   " bReUseSession " + bReuseSession);
                    
                    WebMailPrefAccess.Set("bool","yahoo.Account."+szUserName+".bReUseSession",bReuseSession);
                    WebMailPrefAccess.Set("bool","yahoo.Account."+szUserName+".bUseShortID",bShortId);
                }
                
                WebMailPrefAccess.Set("int","yahoo.version",1);
                
                //delete unused keys
                WebMailPrefAccess.DeleteBranch("yahoo.Account.updated");
                WebMailPrefAccess.DeleteBranch("yahoo.bReUseSession");
                WebMailPrefAccess.DeleteBranch("yahoo.bUseShortID");
                delete WebMailPrefAccess;   
            }
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
