var g_LycosDebugLog = null;
var g_LycosTimer = null;

                                  
const cszLycosContentID = "@mozilla.org/Lycos;1";

window.addEventListener("load", LycosStartUp, false);

function LycosStartUp()
{   
    try
    {         
        //create debug log global 
        g_LycosDebugLog = new DebugLog("webmail.logging.comms", 
                                       "{3c8e8390-2cf6-11d9-9669-0800200c9a66}",
                                       "Lycos");
                                        
        g_LycosDebugLog.Write("Lycos.js : LycosStartUp - START"); 
        
        var DomainManager = Components.classes["@mozilla.org/DomainManager;1"].
                                 getService().QueryInterface(Components.interfaces.nsIDomainManager);
        
                              
        if(DomainManager.isReady())
        {
            g_LycosDebugLog.Write("Lycos.js : LycosStartUp - DB loaded");
            LycosDiagnosticTest();
        }
        else
        {
            g_LycosTimer = Components.classes["@mozilla.org/timer;1"]
                                            .createInstance(Components.interfaces.nsITimer); 
            g_LycosTimer.initWithCallback(LycosDiagnosticTest, 
                                            2000, 
                                            Components.interfaces.nsITimer.TYPE_REPEATING_SLACK);
            g_LycosDebugLog.Write("Lycos.js : LycosStartUp - DB not loaded");
        }
      
    	window.setTimeout(function()
                      {
                          g_LycosDebugLog.Write("Lycos.js: LycosStartUp - removeEventListener");
                          window.removeEventListener("load",LycosStartUp, false);
                      },
                      15);
                      
        g_LycosDebugLog.Write("Lycos.js : LycosStartUp - END ");
    }
    catch(e)
    {
        g_LycosDebugLog.DebugDump("Lycos.js :LycosStartUp - Exception" 
                                    + e.name + 
                                    ".\nError message: " 
                                    + e.message);
    }
}

//timer
var LycosDiagnosticTest = 
{
    notify: function(timer)
    {
        try
        {
            g_LycosDebugLog.Write("Lycos.js : TimerCallback -  START");
            
            var DomainManager = Components.classes["@mozilla.org/DomainManager;1"].
                                     getService().QueryInterface(Components.interfaces.nsIDomainManager);
            if(!DomainManager.isReady())
            {
                g_LycosDebugLog.Write("Lycos.js : TimerCallback -  db not ready");
                return;
            }    
            timer.cancel();
         
            //get store ids
            var szContentID = new Object;
                      
            //get domain handler contentid for pop protocol
            var bResult = DomainManager.getDomainForProtocol("lycos.co.uk", "pop",szContentID);
            var bResult1= DomainManager.getDomainForProtocol("lycos.it", "pop",szContentID);
            var bResult2= DomainManager.getDomainForProtocol("lycos.at", "pop",szContentID);
            var bResult3= DomainManager.getDomainForProtocol("lycos.de", "pop",szContentID);
            var bPass = false;
            
            if (bResult && bResult1 && bResult2 && bResult3 )
            {
                g_LycosDebugLog.Write("Lycos.js :TimerCallback - getDomain - OK");
                
                //check returned ids
                if (szContentID.value == cszLycosContentID) bPass = true;  
                
                //test has failed set ids    
                if (!bPass)
                {
                    g_LycosDebugLog.Write("Lycos.js :TimerCallback - IDs failed - resetting");
                    DomainManager.newDomainForProtocol("lycos.co.uk", "pop" ,cszLycosContentID);
                    DomainManager.newDomainForProtocol("lycos.it", "pop" ,cszLycosContentID);
                    DomainManager.newDomainForProtocol("lycos.at", "pop",cszLycosContentID);
                    DomainManager.newDomainForProtocol("lycos.de", "pop",cszLycosContentID);
                }  
            }
            else
            {
                g_LycosDebugLog.Write("Lycos.js :TimerCallback - setting domains");
                if (!bResult) DomainManager.newDomainForProtocol("lycos.co.uk", "pop" ,cszLycosContentID);
                if (!bResult1) DomainManager.newDomainForProtocol("lycos.it", "pop" ,cszLycosContentID);
                if (!bResult2) DomainManager.newDomainForProtocol("lycos.at", "pop",cszLycosContentID);
                if (!bResult3) DomainManager.newDomainForProtocol("lycos.de", "pop",cszLycosContentID);
            }       

            g_LycosDebugLog.Write("Lycos.js : TimerCallback - END");
        }
        catch(e)
        {
            g_LycosDebugLog.DebugDump("Lycos.js : TimerCallback - Exception in notify : " 
                                        + e.name + 
                                        ".\nError message: " 
                                        + e.message);
        }
    }
}
