var g_HotmailDebugLog = null;
var g_HotmailTimer = null;

                                  
const cszHotmailContentID = "@mozilla.org/Hotmail;1";

window.addEventListener("load", HotmailStartUp, false);

function HotmailStartUp()
{   
    try
    {         
        //create debug log global 
        g_HotmailDebugLog = new DebugLog("webmail.logging.comms", 
                                         "{a6a33690-2c6a-11d9-9669-0800200c9a66}",
                                         "hotmail");
                                        
        g_HotmailDebugLog.Write("Hotmail: Hotmail.js : HotmailStartUp - START"); 
         
        var DomainManager = Components.classes["@mozilla.org/DomainManager;1"].
                                 getService().QueryInterface(Components.interfaces.nsIDomainManager);
        
                              
        if(DomainManager.isReady())
        {
            g_HotmailDebugLog.Write("Hotmail: Hotmail.js : HotmailStartUp - DB loaded");
            HotmailDiagnosticTest();
        }
        else
        {
            g_HotmailTimer = Components.classes["@mozilla.org/timer;1"]
                                            .createInstance(Components.interfaces.nsITimer); 
            g_HotmailTimer.initWithCallback(HotmailDiagnosticTest, 
                                            2000, 
                                            Components.interfaces.nsITimer.TYPE_REPEATING_SLACK);
            g_HotmailDebugLog.Write("Hotmail: Hotmail.js : HotmailStartUp - DB not loaded");
        }
      
    	window.setTimeout(function()
                      {
                          g_HotmailDebugLog.Write("Hotmail: Hotmail.js : HotmailStartUp - removeEventListener");
                          window.removeEventListener("load",HotmailStartUp, false);
                      },
                      15);
                    
        g_HotmailDebugLog.Write("Hotmail: Hotmail.js : HotmailStartUP - END ");
    }
    catch(e)
    {
        g_HotmailDebugLog.DebugDump("Hotmail: Hotmail.js : Exception in HotmailStartUp " 
                                    + e.name + 
                                    ".\nError message: " 
                                    + e.message);
    }
}

//timer
var HotmailDiagnosticTest = 
{
    notify: function(timer)
    {
        try
        {
            g_HotmailDebugLog.Write("Hotmail: Hotmail.js : TimerCallback -  START");
            
            var DomainManager = Components.classes["@mozilla.org/DomainManager;1"].
                                     getService().QueryInterface(Components.interfaces.nsIDomainManager);
            if(!DomainManager.isReady())
            {
                g_HotmailDebugLog.Write("Hotmail: Hotmail.js : TimerCallback -  db not ready");
                return;
            }    
            timer.cancel();
         
            //get store ids
            var szContentID = new Object;
                      
            //get domain handler contentid for pop protocol
            var bResult = DomainManager.getDomain("hotmail.com", szContentID);
            var bResult1 = DomainManager.getDomain("hotmail.co.uk", szContentID);
            var bResult2 = DomainManager.getDomain("msn.co.uk", szContentID);
            var bResult3 = DomainManager.getDomain("msn.com", szContentID);
            var bResult4 = DomainManager.getDomain("hotmail.it", szContentID);
            var bPass = false;
            
            if (bResult && bResult1 && bResult2 && bResult3 && bResult4)
            {
                g_HotmailDebugLog.Write("Hotmail.js :HotmailStartUp - getDomain - OK");
                
                //check returned ids
                if (szContentID.value == cszHotmailContentID) bPass = true;  
                
                //test has failed set ids    
                if (!bPass)
                {
                    g_HotmailDebugLog.Write("Hotmail.js :HotmailStartUp - IDs failed - resetting");
                    DomainManager.newDomain("hotmail.com", cszHotmailContentID);
                    DomainManager.newDomain("hotmail.co.uk", cszHotmailContentID);
                    DomainManager.newDomain("msn.co.uk", cszHotmailContentID);
                    DomainManager.newDomain("msn.com", cszHotmailContentID);
                    DomainManager.newDomain("hotmail.it", cszHotmailContentID);
                }  
            }
            else
            {
                g_HotmailDebugLog.Write("Hotmail.js :HotmailStartUp - setting domains");
                if (!bResult) DomainManager.newDomain("hotmail.com", cszHotmailContentID);
                if (!bResult1)DomainManager.newDomain("hotmail.co.uk", cszHotmailContentID);
                if (!bResult2)DomainManager.newDomain("msn.co.uk", cszHotmailContentID);
                if (!bResult3)DomainManager.newDomain("msn.com", cszHotmailContentID);
                if (!bResult4)DomainManager.newDomain("hotmail.it", cszHotmailContentID);
            }       

            g_HotmailDebugLog.Write("Hotmail: Hotmail.js : TimerCallback - END");
        }
        catch(e)
        {
            g_HotmailDebugLog.DebugDump("Hotmail: Hotmail.js : TimerCallback - Exception in notify : " 
                                        + e.name + 
                                        ".\nError message: " 
                                        + e.message);
        }
    }
}
