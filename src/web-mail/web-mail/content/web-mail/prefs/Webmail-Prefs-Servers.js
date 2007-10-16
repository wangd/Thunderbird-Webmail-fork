window.addEventListener("unload", function() {gServersPane.close();} , false);


var gServersPane =
{
    m_Log : new DebugLog("webmail.logging.comms", "","webmailPrefs"),
    m_POPServer : null,
    m_SMTPServer : null,
    m_IMAPServer : null,
    m_bPOPPort : false,
    m_bSMPTPort : false,
    m_bIMAPPort : false,
    m_nsObserver : null,

    init: function ()
    {
        this.m_Log.Write("Webmail-Prefs-Servers : init - START");

        try
        {
            //get pop service
            this.m_POPServer = Components.classes["@mozilla.org/POPConnectionManager;1"].getService()
                                         .QueryInterface(Components.interfaces.nsIPOPConnectionManager);

            //get SMTP service
            this.m_SMTPServer = Components.classes["@mozilla.org/SMTPConnectionManager;1"].getService()
                                          .QueryInterface(Components.interfaces.nsISMTPConnectionManager);

            //get IMAP service
            this.m_IMAPServer = Components.classes["@mozilla.org/IMAPConnectionManager;1"].getService()
                                          .QueryInterface(Components.interfaces.nsIIMAPConnectionManager);

            
            this.registerObservers();
            
            this.updateStatus(this.m_POPServer.GetStatus(), "btnPOPStart", "btnPOPStop", "imgPopStatus", "txtPopStatus"); 
            this.updateStatus(this.m_SMTPServer.GetStatus(), "btnSMTPStart", "btnSMTPStop", "imgSMTPStatus", "txtSMTPStatus");
            this.updateStatus(this.m_IMAPServer.GetStatus(), "btnIMAPStart", "btnIMAPStop", "imgIMAPStatus", "txtIMAPStatus");  
        }
        catch(e)
        {
             this.m_Log.Write("Webmail-Prefs-Servers: ERROR"
                                                         + e.name +
                                                         ".\nError message: "
                                                         + e.message);
        }


        this.m_Log.Write("Webmail-Prefs-Servers : init - END");
    },


    close : function ()
    {
        try
        {
            this.m_Log.Write("Webmail-Prefs-Servers : close - START");

            this.unregisterObservers();

            this.m_Log.Write("Webmail-Prefs-Servers : close - END");
        }
        catch(e)
        {
            this.m_Log.DebugDump("Webmail-Prefs-Servers.js : close - Exception in notify : "
                                        + e.name +
                                        ".\nError message: "
                                        + e.message+ "\n"
                                        + e.lineNumber);
        }
    },


    //value : -1 = ERROR (RED); 0 = Stopped (GREY); 1 = WAITING (AMBER)2 = Running (GREEN)
    updateStatus : function (iValue, btnStart, btnStop, imgStatus, txtStatus)
    {
        try
        {   
            this.m_Log.Write("Webmail-Prefs-Servers : updateGUI - START");
            
            if (iValue == -1 ||iValue == 0)  //error -  stop
            {
                document.getElementById(btnStart).setAttribute("imageID",2); //enable start
                document.getElementById(btnStop).setAttribute("imageID",-1); //disable stop
                document.getElementById(btnStop).setAttribute("disabled","true");
                document.getElementById(btnStart).setAttribute("disabled","false");
            }
            else if (iValue == 1)   //waiting
            {
                document.getElementById(btnStart).setAttribute("imageID",-2); //disable start
                document.getElementById(btnStart).setAttribute("disabled","true");
                document.getElementById(btnStop).setAttribute("disabled","true");
                document.getElementById(btnStop).setAttribute("imageID",-1); //disable stop
            }
            else if (iValue == 2)   //running
            {
                document.getElementById(btnStart).setAttribute("imageID",-2); //disable start
                document.getElementById(btnStart).setAttribute("disabled","true");
                document.getElementById(btnStop).setAttribute("disabled","false");
                document.getElementById(btnStop).setAttribute("imageID",1); //enable stop
            }

            document.getElementById(imgStatus).setAttribute("value",iValue); //set pop status colour
            document.getElementById(txtStatus).value =this.StatusText(iValue); //set status text
            
            this.m_Log.Write("Webmail-Prefs-Servers : updateGUI - END"); 
        }
        catch(e)
        {
            this.m_Log.DebugDump("Webmail-Prefs-Servers : Exception in updateGUI : "
                                      + e.name +
                                      ".\nError message: "
                                      + e.message + "\n" +
                                      e.lineNumber);
        }
    },


    updatePort : function ()
    {
        try 
        {
            this.m_Log.Write("Webmail-Prefs-Servers.js : updatePort - START");
            
            //check port number
            var bPortChange = false;
            var iServerPort = this.m_POPServer.GetPort();
            var iPrefPort = document.getElementById("txtPopPort").value;
            this.m_Log.Write("Webmail-Prefs-Servers : updataStatus - iServerPort " + iServerPort + " iPrefPort " + iPrefPort);
            if (iServerPort != iPrefPort) 
            {
                document.getElementById("imgPOPRestart").setAttribute("hidden", "false"); //show warning
                document.getElementById("boxWarning").setAttribute("hidden", "false");
                bPortChange = true;
            }
            
            iServerPort = this.m_SMTPServer.GetPort();
            iPrefPort = document.getElementById("txtSmptPort").value;
            this.m_Log.Write("Webmail-Prefs-Servers : updataStatus - iServerPort " + iServerPort + " iPrefPort " + iPrefPort);
            if (iServerPort != iPrefPort) 
            {
                document.getElementById("imgSMTPRestart").setAttribute("hidden", "false"); //show warning
                document.getElementById("boxWarning").setAttribute("hidden", "false");
                bPortChange = true;
            }
            
            iServerPort = this.m_IMAPServer.GetPort();
            iPrefPort = document.getElementById("txtIMAPPort").value;
            this.m_Log.Write("Webmail-Prefs-Servers : updataStatus - iServerPort " + iServerPort + " iPrefPort " + iPrefPort);
            if (iServerPort != iPrefPort) 
            {
                document.getElementById("imgIMAPRestart").setAttribute("hidden", "false"); //show warning
                document.getElementById("boxWarning").setAttribute("hidden", "false");
                bPortChange = true;
            }
            
            if (bPortChange == false) document.getElementById("boxWarning").setAttribute("hidden", "true"); //hide warning
            
            this.m_Log.Write("Webmail-Prefs-Servers.js : updatePort - END");
        } 
        catch (e) 
        {
            this.m_Log.DebugDump("Webmail-Prefs-Servers.js : Exception in updatePort : "
                                        + e.name +
                                        ".\nError message: "
                                        + e.message+ "\n"
                                        + e.lineNumber);
        }        
    },


    StatusText : function (iValue)
    {
        this.m_Log.Write("Webmail-Prefs-Servers : StatusText - " + iValue + "- START");

        var strbundle=document.getElementById("stringsWebmailPrefs-Servers");
        var szString="";

        switch(iValue)
        {// -1 = ERROR (RED); 0 = WAITING (AMBER); 1 = Stopped (GREY); 2 = Running (GREEN)
            case -1:  szString = strbundle.getString("ERROR"); break
            case 0:   szString = strbundle.getString("Stop"); break
            case 1:   szString = strbundle.getString("Wait"); break
            case 2:   szString = strbundle.getString("Go"); break
        }

        this.m_Log.Write("Webmail-Prefs-Servers : StatusText - " + szString + " END");
        return szString;
    },


    stopServer : function (iServer)
    {
        try
        {
            this.m_Log.Write("Webmail-Prefs-Servers : stopServer - " + iServer + "- START");

            if (iServer == 1)    //pop
                this.m_POPServer.Stop();
            else if (iServer  == 2 )  //smtp
               this.m_SMTPServer.Stop();
            else if (iServer == 3) //imap
               this.m_IMAPServer.Stop();

            this.m_Log.Write("Webmail-Prefs-Servers : stopServer - END");
        }
        catch(e)
        {
            this.m_Log.DebugDump("Webmail-Prefs-Servers : Exception in stopServer : "
                                      + e.name +
                                      ".\nError message: "
                                      + e.message + "\n" +
                                      e.lineNumber);
        }
    },


    startServer : function (iServer)
    {
        try
        {
            this.m_Log.Write("Webmail-Prefs-Servers : startServer - " + iServer + "- START");

            if (iServer == 1)    //pop
            {
                this.m_POPServer.Start();
                document.getElementById("imgPOPRestart").setAttribute("hidden","true"); //hide warning
            }
            else if (iServer  == 2 )  //smtp
            {
               this.m_SMTPServer.Start();
               document.getElementById("imgSMTPRestart").setAttribute("hidden","true"); //hide warning
           }
            else if (iServer == 3) //imap
            {
               this.m_IMAPServer.Start();
               document.getElementById("imgIMAPRestart").setAttribute("hidden","true"); //hide warning
            }

            this.m_Log.Write("Webmail-Prefs-Servers : startServer - END");

        }
        catch(e)
        {
            this.m_Log.DebugDump("Webmail-Prefs-Servers : Exception in startServer : "
                                      + e.name +
                                      ".\nError message: "
                                      + e.message + "\n" +
                                      e.lineNumber);
        }
    },


    portChange : function (iServer)
    {
        try
        {
            this.m_Log.Write("Webmail-Prefs-Servers.js : portChange -  START");

            this.updatePort();

            this.m_Log.Write("Webmail-Prefs-Servers.js : portChange - END");
        }
        catch(e)
        {
            this.m_Log.DebugDump("Webmail-Prefs-Servers.js : portChange - Exception in notify : "
                                        + e.name +
                                        ".\nError message: "
                                        + e.message+ "\n"
                                        + e.lineNumber);
        }
    },


    registerObservers: function()
    {
        try
        {
            this.m_Log.Write("Webmail-Prefs-Servers.js - register - START");
           
            this.m_nsObserver = Components.classes["@mozilla.org/observer-service;1"]
                                          .getService(Components.interfaces.nsIObserverService);
            this.m_nsObserver.addObserver(this, "webmail-pop-status-change", false); 
            this.m_nsObserver.addObserver(this, "webmail-smtp-status-change", false); 
            this.m_nsObserver.addObserver(this, "webmail-imap-status-change", false); 
            
            this.m_Log.Write("Webmail-Prefs-Servers.js - register - END");
        }
        catch(err)
        {
            this.m_Log.DebugDump("Webmail-Prefs-Servers.js : register"
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
            this.m_Log.Write("Webmail-Prefs-Servers.js - unregister - START");

            if (this.m_nsObserver) 
            {
                this.m_nsObserver.removeObserver(this, "webmail-pop-status-change");
                this.m_nsObserver.removeObserver(this, "webmail-smtp-status-change");
                this.m_nsObserver.removeObserver(this, "webmail-imap-status-change");
            }
            this.m_Log.Write("Webmail-Prefs-Servers.js - unregister - END");
        }
        catch(err)
        {
            this.m_Log.DebugDump("Webmail-Prefs-Servers.js : updateISP"
                                    + err.name +
                                    ".\nError message: "
                                    + err.message + "\n"
                                    + err.lineNumber);
        }
    },


    observe : function(aSubject, aTopic, aData)
    {
        this.m_Log.Write("Webmail-Prefs-Servers.js - observe - aTopic " + aTopic + " " + aData);
        
        if(aTopic == "webmail-pop-status-change")  
            this.updateStatus(parseInt(aData), "btnPOPStart", "btnPOPStop", "imgPopStatus", "txtPopStatus"); 
        if(aTopic == "webmail-smtp-status-change") 
            this.updateStatus(parseInt(aData), "btnSMTPStart", "btnSMTPStop", "imgSMTPStatus", "txtSMTPStatus");
        if(aTopic == "webmail-imap-status-change") 
            this.updateStatus(parseInt(aData), "btnIMAPStart", "btnIMAPStop", "imgIMAPStatus", "txtIMAPStatus");  
                
        this.updatePort();
        return;  
    }
};
