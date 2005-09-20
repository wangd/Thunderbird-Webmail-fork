var gServersPane = 
{
    m_DebugLog : null,
    m_POPServer : null,
    m_SMTPServer : null,
    m_IMAPServer : null,
    
    
    init: function ()
    {
    
        this.m_DebugLog = new DebugLog("webmail.logging.comms", 
                                       "{3c8e8390-2cf6-11d9-9669-0800200c9a66}",
                                       "webmailPrefs");
                                   
        this.m_DebugLog.Write("Webmail-Prefs-Servers : init - START");
        
        try
        {
            //get pop service
            this.m_POPServer = Components.classes["@mozilla.org/POPConnectionManager;1"];
            this.m_POPServer = this.m_POPServer.getService();
            this.m_POPServer.QueryInterface(Components.interfaces.nsIPOPConnectionManager);
            
            //get SMTP service
            this.m_SMTPServer = Components.classes["@mozilla.org/SMTPConnectionManager;1"];
            this.m_SMTPServer = this.m_SMTPServer.getService();
            this.m_SMTPServer.QueryInterface(Components.interfaces.nsISMTPConnectionManager);
            
            //get IMAP service
            this.m_IMAPServer = Components.classes["@mozilla.org/IMAPConnectionManager;1"];
            this.m_IMAPServer = this.m_IMAPServer.getService();
            this.m_IMAPServer.QueryInterface(Components.interfaces.nsIIMAPConnectionManager);
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
    
            document.getElementById("imgIMAPStatus").setAttribute("value",iIMAPvalue); //set pop status colour
            document.getElementById("txtIMAPStatus").value = this.StatusText(iIMAPvalue); //set status text 
           
            
            this.m_DebugLog.Write("Webmail-Prefs-Servers : updataStatus - END");
        }
        catch(err)
        {
            this.m_DebugLog.DebugDump("Webmail-Prefs-Servers : Exception in updateStatus : " 
                                      + e.name + 
                                      ".\nError message: " 
                                      + e.message);
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
};
