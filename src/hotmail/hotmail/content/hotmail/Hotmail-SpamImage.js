var gHotmailSpamImage = 
{
    m_Log : null,
    m_fileIamge : null,
    m_Timer : null,
    m_params : null,
    
       
    init: function ()
    {
        try
        {
            this.m_Log = new DebugLog("webmail.logging.comms",
                                      "{3c8e8390-2cf6-11d9-9669-0800200c9a66}",
                                      "Hotmail-SpamImage"),
            this.m_Log.Write("HotmailSpamImage : init - START");
            
            this.m_params = window.arguments[0].QueryInterface(Components.interfaces.nsIDialogParamBlock);
            var szImagePath = this.m_params.GetString(0);
            this.m_Log.Write("HotmailSpamImage : init - " +szImagePath );
            document.getElementById("imageSpam").src = szImagePath;   
            
            this.m_Timer = Components.classes["@mozilla.org/timer;1"]
                                                .createInstance(Components.interfaces.nsITimer);    
            this.m_Timer.initWithCallback(this, 
                                          250, 
                                          Components.interfaces.nsITimer.TYPE_ONE_SHOT);
            
            this.m_Log.Write("HotmailSpamImage : init - END");
        }
        catch(err)
        {
            this.m_Log.DebugDump("HotmailSpamImage: Exception in init : " 
                                               + err.name 
                                               + ".\nError message: " 
                                               + err.message + "\n"
                                               + err.lineNumber);
        }
    },
    
    
    
    notify: function(timer)
    {
        try
        {
            this.m_Log.Write("HotmailSpamImage : notify -  START");
            
            document.getElementById("labelSpamImage").click();
            timer.cancel();

            this.m_Log.Write("HotmailSpamImage : notify - END");
        }
        catch(e)
        {
            this.m_Log.DebugDump("HotmailSpamImage : notify - Exception in notify : " 
                                        + e.name + 
                                        ".\nError message: " 
                                        + e.message+ "\n"
                                        + err.lineNumber);
        }
    },
    
    
    
    doOk: function ()
    {
        try
        {
            this.m_Log.Write("HotmailSpamImage : doOK - START");
            
            window.close();
            
            var szResult = document.getElementById("txtSpamImage").value;
            this.m_Log.Write("HotmailSpamImage : doOK - " + szResult);
            
            if (szResult.length>1)
                this.m_params.SetInt(0,1);
            else
                this.m_params.SetInt(0,0);
                
            this.m_params.SetString(0,szResult);
            this.m_Log.Write("HotmailSpamImage : doOK - END");
            return true;
        }
        catch(err)
        {
            this.m_Log.DebugDump("HotmailSpamImage : doOK - Exception in notify : " 
                                        + e.name + 
                                        ".\nError message: " 
                                        + e.message+ "\n"
                                        + err.lineNumber);
            return true;
        }
    },
}
