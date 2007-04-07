window.addEventListener("load",  function () {gWebMail.startUp();}, false);
window.addEventListener("unload", function () {gWebMail.shutDown();},  false);

var gWebMail =
{
    m_Log : null,
    m_AccountWizard : null,
    m_timer : null,


    startUp : function ()
    {
        try
        {
            var scriptLoader =  Components.classes["@mozilla.org/moz/jssubscript-loader;1"];
            scriptLoader = scriptLoader.getService(Components.interfaces.mozIJSSubScriptLoader);
            scriptLoader.loadSubScript("chrome://web-mail/content/common/DebugLog.js");
            scriptLoader.loadSubScript("chrome://web-mail/content/Webmail-AccountManager.js");


            //create debug log global
            this.m_Log = new DebugLog("webmail.logging.comms",
                                      "{3c8e8390-2cf6-11d9-9669-0800200c9a66}",
                                      "general");

            this.m_Log.Write("Webmail.js : startUp - START");

            var iCount = this.windowCount();
            if (iCount >1)
            {
                this.m_Log.Write("Webmail.js : shutUp - another window - END");
                return;
            }

            this.m_bThunderbird = true;
            this.m_AccountWizard = new WebmailAccountManager();  //create webmail.rdf file
            this.m_AccountWizard.updateISP();
            this.m_AccountWizard.register();

            this.m_Log.Write("Webmail.js : startUp - END ");
        }
        catch(e)
        {
            DebugDump("Webmail.js : Exception in startUp "
                                            + e.name
                                            + ".\nError message: "
                                            + e.message);
        }
    },


    windowCount : function()
    {
        try
        {
            this.m_Log.Write("Webmail.js : windowCount - START");

            var iWindowCount = 0;
            var winman = Components.classes["@mozilla.org/appshell/window-mediator;1"];
            winman = winman.getService(Components.interfaces.nsIWindowMediator);
            var e = winman.getEnumerator(null);

            while (e.hasMoreElements())
            {
                var win = e.getNext();
                win.QueryInterface(Components.interfaces.nsIDOMWindowInternal);
                var szValue = win.document.documentElement.getAttribute("id");
                this.m_Log.Write("Webmail.js : windowCount - "+ szValue);

                if (szValue =="messengerWindow")iWindowCount++;
            }

            this.m_Log.Write("Webmail.js : windowCount - "+ iWindowCount +" END ");
            return iWindowCount;
        }
        catch(e)
        {
            this.m_Log.DebugDump("Webmail.js : Exception in shutDown "
                                            + e.name
                                            + ".\nError message: "
                                            + e.message);
        }
    },



    shutDown : function ()
    {
        try
        {
            this.m_Log.Write("Webmail.js : shutDown - START");

            var iCount = this.windowCount();
            if (iCount !=0)
            {
                this.m_Log.Write("Webmail.js : shutDown - Another window - END");
                return;
            }

            //account wizard
            this.m_AccountWizard.unregister();
            //this.m_AccountWizard.saveISP();

            this.m_Log.Write("Webmail.js : shutDown - END");
        }
        catch(e)
        {
            this.m_Log.DebugDump("Webmail.js : Exception in shutDown "
                                            + e.name
                                            + ".\nError message: "
                                            + e.message);
        }
    },
};
