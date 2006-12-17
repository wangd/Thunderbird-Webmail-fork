window.addEventListener("unload", function() {gServersPane.close();} , false);


var gServersPane =
{
    m_DebugLog : new DebugLog("webmail.logging.comms", "","webmailPrefs"),
    m_POPServer : null,
    m_SMTPServer : null,
    m_IMAPServer : null,
    m_Timer : null,
    m_bPOPPort : false,
    m_bSMPTPort : false,
    m_bIMAPPort : false,

    init: function ()
    {
        this.m_DebugLog.Write("Webmail-Prefs-Servers : init - START");

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

            //status update timer
            this.m_Timer = Components.classes["@mozilla.org/timer;1"]
                                     .createInstance(Components.interfaces.nsITimer);
            this.m_Timer.initWithCallback(this,
                                          5000,
                                          Components.interfaces.nsITimer.TYPE_REPEATING_SLACK);
        }
        catch(e)
        {
             this.m_DebugLog.Write("Webmail-Prefs-Servers: ERROR"
                                                         + e.name +
                                                         ".\nError message: "
                                                         + e.message);
        }

        this.updateStatus();

        this.m_DebugLog.Write("Webmail-Prefs-Servers : init - END");
    },




    close : function ()
    {
        try
        {
            this.m_DebugLog.Write("Webmail-Prefs-Servers : close - START");

            this.m_Timer.cancel();

            this.m_DebugLog.Write("Webmail-Prefs-Servers : close - END");
        }
        catch(e)
        {
            this.m_DebugLog.DebugDump("Webmail-Prefs-Servers.js : close - Exception in notify : "
                                        + e.name +
                                        ".\nError message: "
                                        + e.message+ "\n"
                                        + e.lineNumber);
        }
    },



//value : -1 = ERROR (RED); 0 = Stopped (GREY); 1 = WAITING (AMBER)2 = Running (GREEN)
    updateStatus : function ()
    {
        try
        {
            this.m_DebugLog.Write("Webmail-Prefs-Servers : updataStatus - START");

            //pop status
            var iPOPvalue = -1;
            this.m_DebugLog.Write("Webmail-Prefs-Servers : updataStatus - getting pop status");
            if (this.m_POPServer)
            {
                iPOPvalue = this.m_POPServer.GetStatus();
                this.m_DebugLog.Write("Webmail-Prefs-Servers : updataStatus - this.m_POPServer.GetStatus()" + iPOPvalue);
            }
            else
            {
                this.m_DebugLog.Write("Webmail-Prefs-Servers : updataStatus - this.m_POPServer == null");
            }


            if (iPOPvalue == -1 ||iPOPvalue == 0)  //error -  stop
            {
                document.getElementById("btnPOPStart").setAttribute("imageID",2); //enable start
                document.getElementById("btnPOPStop").setAttribute("imageID",-1); //disable stop
                document.getElementById("btnPOPStop").setAttribute("disabled","true");
                document.getElementById("btnPOPStart").setAttribute("disabled","false");
            }
            else if (iPOPvalue == 1)   //waiting
            {
                document.getElementById("btnPOPStart").setAttribute("imageID",-2); //disable start
                document.getElementById("btnPOPStart").setAttribute("disabled","true");
                document.getElementById("btnPOPStop").setAttribute("disabled","true");
                document.getElementById("btnPOPStop").setAttribute("imageID",-1); //disable stop
            }
            else if (iPOPvalue == 2)   //running
            {
                document.getElementById("btnPOPStart").setAttribute("imageID",-2); //disable start
                document.getElementById("btnPOPStart").setAttribute("disabled","true");
                document.getElementById("btnPOPStop").setAttribute("disabled","false");
                document.getElementById("btnPOPStop").setAttribute("imageID",1); //enable stop
            }

            document.getElementById("imgPopStatus").setAttribute("value",iPOPvalue); //set pop status colour
            document.getElementById("txtPopStatus").value =this.StatusText(iPOPvalue); //set status text

            //SMTP
            var iSMTPvalue = -1;
            this.m_DebugLog.Write("Webmail-Prefs-Servers : updataStatus - getting smtp status");
            if (this.m_SMTPServer)
            {
                iSMTPvalue = this.m_SMTPServer.GetStatus();
                this.m_DebugLog.Write("Webmail-Prefs-Servers : updataStatus - this.m_SMTPServer.GetStatus()" + iSMTPvalue);
            }
            else
            {
                this.m_DebugLog.Write("Webmail-Prefs-Servers : updataStatus - this.m_SMTPServer == null");
            }

            if (iSMTPvalue == -1 ||iSMTPvalue == 0)  //error -  stop
            {
                document.getElementById("btnSMTPStart").setAttribute("imageID",2); //enable start
                document.getElementById("btnSMTPStop").setAttribute("imageID",-1); //disable stop
                document.getElementById("btnSMTPStop").setAttribute("disabled","true");
                document.getElementById("btnSMTPStart").setAttribute("disabled","false");
            }
            else if (iSMTPvalue == 1)   //waiting
            {
                document.getElementById("btnSMTPStart").setAttribute("imageID",-2); //disable start
                document.getElementById("btnSMTPStart").setAttribute("disabled","true");
                document.getElementById("btnSMTPStop").setAttribute("disabled","true");
                document.getElementById("btnSMTPStop").setAttribute("imageID",-1); //disable stop
            }
            else if (iSMTPvalue == 2)   //running
            {
                document.getElementById("btnSMTPStart").setAttribute("imageID",-2); //disable start
                document.getElementById("btnSMTPStart").setAttribute("disabled","true");
                document.getElementById("btnSMTPStop").setAttribute("disabled","false");
                document.getElementById("btnSMTPStop").setAttribute("imageID",1); //enable stop
            }


            document.getElementById("imgSMTPStatus").setAttribute("value",iSMTPvalue); //set SMTP status colour
            document.getElementById("txtSMTPStatus").value = this.StatusText(iSMTPvalue); //set status text


            //IMAP
            var iIMAPvalue = -1;
            this.m_DebugLog.Write("Webmail-Prefs-Servers : updataStatus - getting IMAP status");
            if (this.m_IMAPServer)
            {
                iIMAPvalue = this.m_IMAPServer.GetStatus();
                this.m_DebugLog.Write("Webmail-Prefs-Servers : updataStatus - this.m_IMAPServer.GetStatus()" + iIMAPvalue);
            }
            else
            {
                this.m_DebugLog.Write("Webmail-Prefs-Servers : updataStatus - this.m_IMAPServer == null");
            }


            if (iIMAPvalue == -1 ||iIMAPvalue == 0)  //error -  stop
            {
                document.getElementById("btnIMAPStart").setAttribute("imageID",2); //enable start
                document.getElementById("btnIMAPStop").setAttribute("imageID",-1); //disable stop
                document.getElementById("btnIMAPStop").setAttribute("disabled","true");
                document.getElementById("btnIMAPStart").setAttribute("disabled","false");
            }
            else if (iIMAPvalue == 1)   //waiting
            {
                document.getElementById("btnIMAPStart").setAttribute("imageID",-2); //disable start
                document.getElementById("btnIMAPStart").setAttribute("disabled","true");
                document.getElementById("btnIMAPStop").setAttribute("disabled","true");
                document.getElementById("btnIMAPStop").setAttribute("imageID",-1); //disable stop
            }
            else if (iIMAPvalue == 2)   //running
            {
                document.getElementById("btnIMAPStart").setAttribute("imageID",-2); //disable start
                document.getElementById("btnIMAPStart").setAttribute("disabled","true");
                document.getElementById("btnIMAPStop").setAttribute("disabled","false");
                document.getElementById("btnIMAPStop").setAttribute("imageID",1); //enable stop
            }

            document.getElementById("imgIMAPStatus").setAttribute("value",iIMAPvalue); //set pop status colour
            document.getElementById("txtIMAPStatus").value = this.StatusText(iIMAPvalue); //set status text

            //check port number
            var iServerPort= this.m_POPServer.GetPort();
            var iPrefPort =  document.getElementById("txtPopPort").value;
            var bPOPChange = false;
            this.m_DebugLog.Write("Webmail-Prefs-Servers : updataStatus - iServerPort " + iServerPort + " iPrefPort " + iPrefPort);
            if (iServerPort != iPrefPort)
            {
                document.getElementById("imgPOPRestart").setAttribute("hidden","false"); //show warning
                document.getElementById("boxWarning").setAttribute("hidden","false");
                bPOPChange = true;
            }

            iServerPort= this.m_SMTPServer.GetPort();
            iPrefPort =  document.getElementById("txtSmptPort").value;
            var bSMTPChange = false;
            this.m_DebugLog.Write("Webmail-Prefs-Servers : updataStatus - iServerPort " + iServerPort + " iPrefPort " + iPrefPort);
            if (iServerPort != iPrefPort)
            {
                document.getElementById("imgSMTPRestart").setAttribute("hidden","false"); //show warning
                document.getElementById("boxWarning").setAttribute("hidden","false");
                bSMTPChange = true;
            }

            iServerPort= this.m_IMAPServer.GetPort();
            iPrefPort =  document.getElementById("txtIMAPPort").value;
            bIMAPChange = false;
            this.m_DebugLog.Write("Webmail-Prefs-Servers : updataStatus - iServerPort " + iServerPort + " iPrefPort " + iPrefPort);
            if (iServerPort != iPrefPort)
            {
                document.getElementById("imgIMAPRestart").setAttribute("hidden","false"); //show warning
                document.getElementById("boxWarning").setAttribute("hidden","false");
                bIMAPChange = true;
            }

            if (bPOPChange == false && bSMTPChange == false && bIMAPChange ==false)
               document.getElementById("boxWarning").setAttribute("hidden","true"); //hide warning

            this.m_DebugLog.Write("Webmail-Prefs-Servers : updataStatus - END");
        }
        catch(e)
        {
            this.m_DebugLog.DebugDump("Webmail-Prefs-Servers : Exception in updateStatus : "
                                      + e.name +
                                      ".\nError message: "
                                      + e.message + "\n" +
                                      e.lineNumber);
        }
    },



    StatusText : function (iValue)
    {
        this.m_DebugLog.Write("Webmail-Prefs-Servers : StatusText - " + iValue + "- START");

        var strbundle=document.getElementById("stringsWebmailPrefs-Servers");
        var szString="";

        switch(iValue)
        {// -1 = ERROR (RED); 0 = WAITING (AMBER); 1 = Stopped (GREY); 2 = Running (GREEN)
            case -1:  szString = strbundle.getString("ERROR"); break
            case 0:   szString = strbundle.getString("Stop"); break
            case 1:   szString = strbundle.getString("Wait"); break
            case 2:   szString = strbundle.getString("Go"); break
        }

        this.m_DebugLog.Write("Webmail-Prefs-Servers : StatusText - " + szString + " END");
        return szString;
    },



    stopServer : function (iServer)
    {
        try
        {
            this.m_DebugLog.Write("Webmail-Prefs-Servers : stopServer - " + iServer + "- START");

            if (iServer == 1)    //pop
            {
                this.m_POPServer.Stop();
            }
            else if (iServer  == 2 )  //smtp
            {
               this.m_SMTPServer.Stop();
            }
            else if (iServer == 3) //imap
            {
               this.m_IMAPServer.Stop();
            }
            this.updateStatus();
            this.m_DebugLog.Write("Webmail-Prefs-Servers : stopServer - END");
        }
        catch(e)
        {
            this.m_DebugLog.DebugDump("Webmail-Prefs-Servers : Exception in stopServer : "
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
            this.m_DebugLog.Write("Webmail-Prefs-Servers : startServer - " + iServer + "- START");

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

            this.updateStatus();
            this.m_DebugLog.Write("Webmail-Prefs-Servers : startServer - END");

        }
        catch(e)
        {
            this.m_DebugLog.DebugDump("Webmail-Prefs-Servers : Exception in startServer : "
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
            this.m_DebugLog.Write("Webmail-Prefs-Servers.js : portChange -  START");

            this.updateStatus();

            this.m_DebugLog.Write("Webmail-Prefs-Servers.js : portChange - END");
        }
        catch(e)
        {
            this.m_DebugLog.DebugDump("Webmail-Prefs-Servers.js : portChange - Exception in notify : "
                                        + e.name +
                                        ".\nError message: "
                                        + e.message+ "\n"
                                        + e.lineNumber);
        }
    },


    notify: function(timer)
    {
        try
        {
            this.m_DebugLog.Write("Webmail-Prefs-Servers.js : notify -  START");

            this.updateStatus();

            this.m_DebugLog.Write("Webmail-Prefs-Servers.js : notify - END");
        }
        catch(e)
        {
            this.m_DebugLog.DebugDump("Webmail-Prefs-Servers.js : notify - Exception in notify : "
                                        + e.name +
                                        ".\nError message: "
                                        + e.message+ "\n"
                                        + e.lineNumber);
        }
    },

};
