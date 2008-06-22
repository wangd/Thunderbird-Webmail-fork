window.addEventListener("load",  function () {gWebMailStatusBar.startUp();}, false);
window.addEventListener("unload", function () {gWebMailStatusBar.shutDown();},  false);

var gWebMailStatusBar =
{
    m_Log : null,
    m_POPServer : null,
    m_SMTPServer : null,
    m_IMAPServer : null, 
    m_prefBranch : null, 
    m_stringBundle : null,
    m_nsObserver : null,


    startUp : function ()
    {
        try
        {
            var scriptLoader =  Components.classes["@mozilla.org/moz/jssubscript-loader;1"];
            scriptLoader = scriptLoader.getService(Components.interfaces.mozIJSSubScriptLoader);
            scriptLoader.loadSubScript("chrome://web-mail/content/common/DebugLog.js");
            scriptLoader.loadSubScript("chrome://web-mail/content/common/CommonPrefs.js");

            //create debug log global
            this.m_Log = new DebugLog("webmail.logging.comms",
                                      "{3c8e8390-2cf6-11d9-9669-0800200c9a66}",
                                      "statusbar");

            this.m_Log.Write("WebmailStatusbar.js : startUp - START");

            var iCount = this.windowCount();
            if (iCount >1)
            {
                this.m_Log.Write("WebmailStatusbar.js : another window - END");
                return;
            }
           
            //load strings
            var strBundleService = Components.classes["@mozilla.org/intl/stringbundle;1"]
                                             .getService(Components.interfaces.nsIStringBundleService);
            this.m_stringbundle = strBundleService.createBundle("chrome://web-mail/locale/Webmail-Statusbar.properties");                                 
                                             
            //get popt service
            this.m_POPServer = Components.classes["@mozilla.org/POPConnectionManager;1"].getService()
                                         .QueryInterface(Components.interfaces.nsIPOPConnectionManager);

            //get SMTP service
            this.m_SMTPServer = Components.classes["@mozilla.org/SMTPConnectionManager;1"].getService()
                                          .QueryInterface(Components.interfaces.nsISMTPConnectionManager);

            //get IMAP service
            this.m_IMAPServer = Components.classes["@mozilla.org/IMAPConnectionManager;1"].getService()
                                          .QueryInterface(Components.interfaces.nsIIMAPConnectionManager);
           
                   
            //watch for pref change
            this.registerObservers();
            
            this.createStatusbar();
            
            var bShow = this.getPref();
            bShow ? this.showStatusbar() :  this.hideStatusbar();
              
            this.updateStatus(this.m_POPServer.GetStatus(), "pop-status");
            this.updateStatus(this.m_SMTPServer.GetStatus(), "smtp-status");
            this.updateStatus(this.m_IMAPServer.GetStatus(), "imap-status");

            this.m_Log.Write("WebmailStatusbar.js : startUp - END ");
        }
        catch(e)
        {
            DebugDump("WebmailStatusbar.js : Exception in startUp "
                                            + e.name
                                            + ".\nError message: "
                                            + e.message + "\n"
                                            + e.lineNumber);
        }
    },


    getPref : function()
    {
        this.m_Log.Write("WebmailStatusbar.js -getPref - Start");
        
        var oPref = new Object();
        oPref.Value = null;
        var PrefAccess = new WebMailCommonPrefAccess();
        if (!PrefAccess.Get("bool", "webmail.server.statusbar", oPref))
            oPref.Value = false;
        delete PrefAccess;
        
        this.m_Log.Write("WebmailStatusbar.js - getPref - End " + oPref.Value );
        return oPref.Value;
    },
    

    createStatusbar : function ()
    {
        try
        {
            this.m_Log.Write("WebmailStatusbar.js : createstatubar - START");

            //pop
            var newPOPItem = document.createElement("statusbarpanel");
            newPOPItem.setAttribute("id", "pop-status");
            newPOPItem.setAttribute("class", "status statusbarpanel-menu-iconic");
            newPOPItem.setAttribute("value", "-1");
            newPOPItem.setAttribute("tooltiptext", "POP server");
            newPOPItem.setAttribute("onclick", "gWebMailStatusBar.showMenu(\"pop-status\")");
            
            //SMTP
            var newSMTPItem = document.createElement("statusbarpanel");
            newSMTPItem.setAttribute("id", "smtp-status");
            newSMTPItem.setAttribute("class", "status statusbarpanel-menu-iconic");
            newSMTPItem.setAttribute("value", "-1");
            newSMTPItem.setAttribute("tooltiptext", "SMTP server");
            newSMTPItem.setAttribute("onclick", "gWebMailStatusBar.showMenu(\"smtp-status\")");
                            
            //IMAP
            var newIMAPItem = document.createElement("statusbarpanel");
            newIMAPItem.setAttribute("id", "imap-status");
            newIMAPItem.setAttribute("class", "status statusbarpanel-menu-iconic");
            newIMAPItem.setAttribute("value", "-1");
            newIMAPItem.setAttribute("tooltiptext", "IMAP server");
            newIMAPItem.setAttribute("onclick", "gWebMailStatusBar.showMenu(\"imap-status\")");
                                
            var hbox = document.createElement("hbox");
            hbox.setAttribute("id", "colourStatus");
            hbox.appendChild(newPOPItem);
            hbox.appendChild(newSMTPItem);
            hbox.appendChild(newIMAPItem);
                        
            //add status bar
            var statusTextBox = document.getElementById("statusTextBox");
            var offline = statusTextBox.firstChild;
            var statusBar = document.getElementById("status-bar");
           
            statusTextBox.insertBefore(hbox, offline.nextSibling);
            
            this.m_Log.Write("WebmailStatusbar.js : createstatubar - END");
        }
        catch(e)
        {
            this.m_Log.DebugDump("WebmailStatusbar.js : Exception in createstatubar "
                                            + e.name
                                            + ".\nError message: "
                                            + e.message + "\n"
                                            + e.lineNumber);
        }
    },


    showStatusbar : function ()
    {
        document.getElementById("pop-status").setAttribute("hidden", "false");
        document.getElementById("smtp-status").setAttribute("hidden", "false");
        document.getElementById("imap-status").setAttribute("hidden", "false");            
    },

    
    hideStatusbar : function ()
    {
        try
        {
            this.m_Log.Write("WebmailStatusbar.js : hideStatusbar - START");
                        
            document.getElementById("pop-status").setAttribute("hidden", "true");
            document.getElementById("smtp-status").setAttribute("hidden", "true");
            document.getElementById("imap-status").setAttribute("hidden", "true");
                        
            this.m_Log.Write("WebmailStatusbar.js : hideStatusbar - ENd");
        }
        catch(e)
        {
            this.m_Log.DebugDump("WebmailStatusbar.js : Exception in hideStatusbar "
                                            + e.name
                                            + ".\nError message: "
                                            + e.message + "\n"
                                            + e.lineNumber);
        }
    },
    
    
    showMenu : function (id)
    {
        try
        {
            this.m_Log.Write("WebmailStatusbar.js : showMenu - START " + id);
                         
            var menu = document.getElementById("statusWebmailMenu");
            menu.showPopup(document.getElementById(id),-1,-1,"popup","topleft","bottomleft"); 
                        
            //get status of selected server
            var iServerStatus = -1;
            var szServer = ""
            if (id == "pop-status")
            {
                iServerStatus = this.m_POPServer.GetStatus();
                szServer = this.m_stringbundle.GetStringFromName("pop");
            }
            else if (id == "smtp-status")
            {
                iServerStatus = this.m_SMTPServer.GetStatus();
                szServer = this.m_stringbundle.GetStringFromName("smtp")
            }
            else if (id == "imap-status")
            {
                iServerStatus = this.m_IMAPServer.GetStatus();
                szServer = this.m_stringbundle.GetStringFromName("imap")
            } 
            this.m_Log.Write("Webmail : showMenu - " + iServerStatus);
            
            var szEnable = this.m_stringbundle.GetStringFromName("enable");
            szEnable = szEnable.replace(/\%1/,szServer);
            document.getElementById("enableWebmailServer").label = szEnable ; //update label
            var szDisable =  this.m_stringbundle.GetStringFromName("disable");
            szDisable = szDisable.replace(/\%1/,szServer);
            document.getElementById("disableWebmailServer").setAttribute("label",szDisable); //update label
                        
            if (iServerStatus == -1 || iServerStatus == 0)  //error -  stop
            {
                document.getElementById("enableWebmailServer").setAttribute("imageID",2); //enable start
                document.getElementById("enableWebmailServer").setAttribute("disabled","false");
                document.getElementById("disableWebmailServer").setAttribute("imageID",-1); //disable stop
                document.getElementById("disableWebmailServer").setAttribute("disabled","true");
                document.getElementById("enableWebmailServer").setAttribute("oncommand","gWebMailStatusBar.startServer(\""+id+"\")"); 
                document.getElementById("disableWebmailServer").setAttribute("oncommand",""); 
            }
            else if (iServerStatus == 1)   //waiting
            {
                document.getElementById("enableWebmailServer").setAttribute("imageID",-2); //disable start
                document.getElementById("enableWebmailServer").setAttribute("disabled","true");
                document.getElementById("disableWebmailServer").setAttribute("disabled","true");
                document.getElementById("disableWebmailServer").setAttribute("imageID",-1); //disable stop
                document.getElementById("enableWebmailServer").setAttribute("oncommand",""); 
                document.getElementById("disableWebmailServer").setAttribute("oncommand",""); 
            }
            else if (iServerStatus == 2)   //running
            {
                document.getElementById("enableWebmailServer").setAttribute("imageID",-2); //disable start
                document.getElementById("enableWebmailServer").setAttribute("disabled","true");
                document.getElementById("disableWebmailServer").setAttribute("imageID",1); //enable stop
                document.getElementById("disableWebmailServer").setAttribute("disabled","false");
                document.getElementById("disableWebmailServer").setAttribute("oncommand","gWebMailStatusBar.stopServer(\""+id+"\")"); 
                document.getElementById("enableWebmailServer").setAttribute("oncommand",""); 
            }
            
            this.m_Log.Write("WebmailStatusbar.js : showMenu - END");
        }
        catch(e)
        {
            this.m_Log.DebugDump("WebmailStatusbar.js : Exception in showMenu "
                                            + e.name
                                            + ".\nError message: "
                                            + e.message + "\n"
                                            + e.lineNumber);
        }
    },
    
    
    startServer : function (id)
    {
        try
        {
            this.m_Log.Write("WebmailStatusbar.js : startServer - START "  + id);
            
            if (id == "pop-status")
                 this.m_POPServer.Start();
            else if (id == "smtp-status")
                 this.m_SMTPServer.Start();
            else if (id == "imap-status")
                 this.m_IMAPServer.Start(); 
                             
            this.m_Log.Write("WebmailStatusbar.js : startServer - END");    
        }
        catch(e)
        {
            this.m_Log.DebugDump("WebmailStatusbar.js : Exception in startServer "
                                            + e.name
                                            + ".\nError message: "
                                            + e.message + "\n"
                                            + e.lineNumber);
        }
    },
    
    
    stopServer : function (id)
    {
        try
        {
            this.m_Log.Write("WebmailStatusbar.js : stopServer - START " +id);
            
            if (id == "pop-status")
                 this.m_POPServer.Stop();
            else if (id == "smtp-status")
                 this.m_SMTPServer.Stop();
            else if (id == "imap-status")
                 this.m_IMAPServer.Stop();
                                   
            this.m_Log.Write("WebmailStatusbar.js : stopServer - END");    
        }
        catch(e)
        {
            this.m_Log.DebugDump("WebmailStatusbar.js : Exception in showMenu "
                                            + e.name
                                            + ".\nError message: "
                                            + e.message + "\n"
                                            + e.lineNumber);
        }
    },

    
    
    windowCount : function()
    {
        try
        {
            this.m_Log.Write("WebmailStatusbar.js : windowCount - START");

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

            this.m_Log.Write("WebmailStatusbar.js : windowCount - "+ iWindowCount +" END ");
            return iWindowCount;
        }
        catch(e)
        {
            this.m_Log.DebugDump("WebmailStatusbar.js : Exception in shutDown "
                                            + e.name
                                            + ".\nError message: "
                                            + e.message);
        }
    },



    shutDown : function ()
    {
        try
        {
            this.m_Log.Write("WebmailStatusbar.js : shutDown - START");

            var iCount = this.windowCount();
            if (iCount !=0)
            {
                this.m_Log.Write("Webmail.js : shutDown - Another window - END");
                return;
            }
            
            this.unregisterObservers();
            
            this.m_Log.Write("WebmailStatusbar.js : shutDown - END");
        }
        catch(e)
        {
            this.m_Log.DebugDump("WebmailStatusbar.js : Exception in shutDown "
                                            + e.name
                                            + ".\nError message: "
                                            + e.message);
        }
    },
    
    
    
    updateStatus : function (iStatusValue, szStatusID)
    {
        try
        {
            this.m_Log.Write("WebmailStatusbar : updateStatus -  START");
            document.getElementById(szStatusID).setAttribute("value",iStatusValue); //set status colour
            var szTooltip = this.statusText(parseInt(iStatusValue), szStatusID)
            document.getElementById(szStatusID).setAttribute("tooltiptext", szTooltip )//set tooltiptext

            this.m_Log.Write("WebmailStatusbar : updateStatus - END");
        }
        catch(e)
        {
            this.m_Log.DebugDump("WebmailStatusbar : updateStatus - Exception in updateStatus : "
                                        + e.name +
                                        ".\nError message: "
                                        + e.message+ "\n"
                                        + e.lineNumber);
        }
    },
    
    
    
    statusText : function (iValue, szServerID)
    {
        this.m_Log.Write("WebmailStatusbar : StatusText - " + iValue + " " + szServerID + "- START");
        
        var szStatus="";

        //status
        switch(iValue)
        {// -1 = ERROR (RED); 0 = WAITING (AMBER); 1 = Stopped (GREY); 2 = Running (GREEN)
            case -1:   szStatus = this.m_stringbundle.GetStringFromName("error"); break
            case  0:   szStatus = this.m_stringbundle.GetStringFromName("stop"); break
            case  1:   szStatus = this.m_stringbundle.GetStringFromName("wait"); break
            case  2:   szStatus = this.m_stringbundle.GetStringFromName("go"); break
        }

        //server
        var szServer = "";
        switch(szServerID)
        {
            case "pop-status" :   szServer = this.m_stringbundle.GetStringFromName("pop"); break
            case "smtp-status":   szServer = this.m_stringbundle.GetStringFromName("smtp"); break
            case "imap-status":   szServer = this.m_stringbundle.GetStringFromName("imap"); break
        }
        
        var szResult = szStatus.replace(/\%1/,szServer);
        
        this.m_Log.Write("WebmailStatusbar : StatusText - " + szResult + " END");
        return szResult;
    },
    
    
    
    registerObservers: function()
    {
        try
        {
            this.m_Log.Write("WebmailStatusbar.js - register - START");

            //pop
            this.m_nsObserver = Components.classes["@mozilla.org/observer-service;1"]
                                          .getService(Components.interfaces.nsIObserverService);
            this.m_nsObserver.addObserver(this, "webmail-pop-status-change", false); 
            this.m_nsObserver.addObserver(this, "webmail-smtp-status-change", false); 
            this.m_nsObserver.addObserver(this, "webmail-imap-status-change", false); 
            
            //prefs
            var prefService = Components.classes["@mozilla.org/preferences-service;1"]
                                        .getService(Components.interfaces.nsIPrefService);
            this.m_prefBranch = prefService.getBranch("webmail.server.statusbar");
            this.m_prefBranch.QueryInterface(Components.interfaces.nsIPrefBranch2);
            this.m_prefBranch.addObserver("", this, false);

            this.m_Log.Write("WebmailStatusbar.js - register - END");
        }
        catch(err)
        {
            this.m_Log.DebugDump("WebmailStatusbar.js : register"
                                    + err.name +
                                    ".\nError message: "
                                    + err.message + "\n"
                                    + err.lineNumber);
        }
    },



    unregisterObservers: function()
    {
        try
        {
            this.m_Log.Write("WebmailStatusbar.js - unregister - START");

            if (this.m_prefBranch)
                this.m_prefBranch.removeObserver("", this);  
            
            if (this.m_nsObserver) 
            {
                this.m_nsObserver.removeObserver(this, "webmail-pop-status-change");
                this.m_nsObserver.removeObserver(this, "webmail-smtp-status-change");
                this.m_nsObserver.removeObserver(this, "webmail-imap-status-change");
            }
            this.m_Log.Write("WebmailStatusbar.js - unregister - END");
        }
        catch(err)
        {
            this.m_Log.DebugDump("WebmailStatusbar.js : updateISP"
                                    + err.name +
                                    ".\nError message: "
                                    + err.message + "\n"
                                    + err.lineNumber);
        }
    },



    observe : function(aSubject, aTopic, aData)
    {
        this.m_Log.Write("WebmailStatusbar.js - observe - aTopic " + aTopic + " " + aData);
        
        if(aTopic == "webmail-pop-status-change")  this.updateStatus(parseInt(aData), "pop-status"); 
        if(aTopic == "webmail-smtp-status-change") this.updateStatus(parseInt(aData), "smtp-status");
        if(aTopic == "webmail-imap-status-change") this.updateStatus(parseInt(aData), "imap-status");  
        
        if (aTopic == "nsPref:changed") 
        {
            var bShow = this.getPref();
            bShow ? this.showStatusbar() : this.hideStatusbar();
        }
        return;  
    }
};
