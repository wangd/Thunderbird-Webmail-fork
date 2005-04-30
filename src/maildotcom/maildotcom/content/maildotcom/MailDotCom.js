var g_MailDotComDebugLog = null;
var g_MailDotComTimer = null;
      
const cszMailDotComContentID = "@mozilla.org/MailDotCom;1";

window.addEventListener("load", MailDotComStartUp, false);


function MailDotComStartUp()
{   
    try
    {     
        //create debug log global 
        g_MailDotComDebugLog = new DebugLog("webmail.logging.comms", 
                                            "{1ad5b3b0-b908-11d9-9669-0800200c9a66}",
                                            "maildotcom");
                                        
        g_MailDotComDebugLog.Write("MailDotCom.js : MailDotComStartUp - START");
    
                     
        var DomainManager = Components.classes["@mozilla.org/DomainManager;1"].
                                 getService().QueryInterface(Components.interfaces.nsIDomainManager);
        if(DomainManager.isReady())
        {
            g_MailDotComDebugLog.Write("MailDotCom.js : MailDotComStartUp - DB loaded");
            MailDotComDiagnosticTest();
        }
        else
        {
            g_MailDotComTimer = Components.classes["@mozilla.org/timer;1"]
                                            .createInstance(Components.interfaces.nsITimer); 
            g_MailDotComTimer.initWithCallback(MailDotComDiagnosticTest, 
                                          2000, 
                                          Components.interfaces.nsITimer.TYPE_REPEATING_SLACK);
            g_MailDotComDebugLog.Write("MailDotCom.js : MailDotComStartUp - DB not loaded");
        }
     
        window.setTimeout(function()
                      {
                          g_MailDotComDebugLog.Write("MailDotCom.js : MailDotComStartUp - removeEventListener");
                          window.removeEventListener("load",MailDotComStartUp, false);
                      },
                      15);
                  
    	g_MailDotComDebugLog.Write("MailDotCom.js : MailDotComStartUP - END ");
    }
    catch(e)
    {
        g_MailDotComDebugLog.DebugDump("MailDotCom.js : Exception in MailDotComStartUp " 
                                    + e.name + 
                                    ".\nError message: " 
                                    + e.message);
    }
}

//timer
var MailDotComDiagnosticTest = 
{
    notify: function(timer)
    {
        try
        {
            g_MailDotComDebugLog.Write("MailDotCom.js : TimerCallback -  START");
            
            var DomainManager = Components.classes["@mozilla.org/DomainManager;1"].
                                     getService().QueryInterface(Components.interfaces.nsIDomainManager);
            if(!DomainManager.isReady())
            {
                g_MailDotComDebugLog.Write("MailDotCom.js : TimerCallback -  db not ready");
                return;
            }    
            timer.cancel();
         
            //get store ids
            var szContentID = new Object;
                      
            //get domain handler contentid for pop protocol
            var bResult = DomainManager.getDomain("mail.com", szContentID);           
            var bPass = false;
            
            if (bResult)
            {
                g_MailDotComDebugLog.Write("MailDotCom.js :MailDotComStartUp - getDomains ");
                
                //check returned ids
                if (szContentID.value == cszMailDotComContentID) bPass = true; 
                
                //test has failed set ids    
                if (!bPass)
                {
                    g_MailDotComDebugLog.Write("MailDotCom.js :MailDotComStartUp - IDs failed - resetting");
                    DomainManager.newDomain("mail.com", cszMailDotComContentID);
                }  
            }
            else
            {
                g_MailDotComDebugLog.Write("MailDotCom.js :MailDotComStartUp - setting Domains");
                if (!bResult) DomainManager.newDomain("mail.com", cszMailDotComContentID);
            }
                   
            g_MailDotComDebugLog.Write("MailDotCom.js : TimerCallback - END");
        }
        catch(e)
        {
            g_MailDotComDebugLog.DebugDump("MailDotCom.js : TimerCallback - Exception in notify : " 
                                        + e.name + 
                                        ".\nError message: " 
                                        + e.message);
        }
    }
}
