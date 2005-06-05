var gServersPane = 
{
    m_DebugLog : null,
    m_POPServer : null,
    
    
    init: function ()
    {
    
        this.m_DebugLog = new DebugLog("webmail.logging.comms", 
                                       "{3c8e8390-2cf6-11d9-9669-0800200c9a66}",
                                       "webmailPrefs");
                                   
        this.m_DebugLog.Write("Webmail-Prefs-Servers : init - START");
        
        try
        {
            //get pop service
            this.m_POPServer = Components.classes["@mozilla.org/POPConnectionManager;1"].
                                 getService().QueryInterface(Components.interfaces.nsIPOPConnectionManager);
        }
        catch(e)
        {
             this.m_DebugLog.Write("Webmail-Prefs-Servers: m_POPServer ERROR"
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
            document.getElementById("txtPopStatus").setAttribute("value",this.StatusText(iPOPvalue)); //set status text 
            
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
