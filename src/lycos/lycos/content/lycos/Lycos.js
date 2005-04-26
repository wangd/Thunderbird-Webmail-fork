var g_LycosDebugLog = null;
var g_LycosTimer = null;
                              
const cszLycosPOPContentID = "@mozilla.org/Lycos;1";

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
            
            var DomainManager = Components.classes["@mozilla.org/DomainManager;1"]
                                          .getService()
                                          .QueryInterface(Components.interfaces.nsIDomainManager);
            if(!DomainManager.isReady())
            {
                g_LycosDebugLog.Write("Lycos.js : TimerCallback -  db not ready");
                return;
            }    
            timer.cancel();
         
            //get store ids
            var szContentPOPID = new Object;
            var szContentIMAPID = new Object;
                      
            //get domain handler contentid for pop protocol
            var bResultPOP = DomainManager.getDomainForProtocol("lycos.co.uk", "pop",szContentPOPID);
            var bResultPOP1 = DomainManager.getDomainForProtocol("lycos.it", "pop",szContentPOPID);
            var bResultPOP2 = DomainManager.getDomainForProtocol("lycos.at", "pop",szContentPOPID);
            var bResultPOP3 = DomainManager.getDomainForProtocol("lycos.de", "pop",szContentPOPID);
            var bResultPOP4 = DomainManager.getDomainForProtocol("lycos.es", "pop",szContentPOPID);
            var bResultPOP5 = DomainManager.getDomainForProtocol("lycos.fr", "pop",szContentPOPID);
            
           
            if (bResultPOP && bResultPOP1 && bResultPOP2 && bResultPOP3 && bResultPOP4 && bResultPOP5)
            {
                g_LycosDebugLog.Write("Lycos.js :TimerCallback - getDomain - OK");
                
                //check returned ids
                if (szContentPOPID.value != cszLycosPOPContentID) 
                {
                    g_LycosDebugLog.Write("Lycos.js :TimerCallback - POP IDs failed - resetting");
                    DomainManager.newDomainForProtocol("lycos.co.uk", "pop" ,cszLycosPOPContentID);
                    DomainManager.newDomainForProtocol("lycos.it", "pop" ,cszLycosPOPContentID);
                    DomainManager.newDomainForProtocol("lycos.at", "pop",cszLycosPOPContentID);
                    DomainManager.newDomainForProtocol("lycos.de", "pop",cszLycosPOPContentID);
                    DomainManager.newDomainForProtocol("lycos.es", "pop",cszLycosPOPContentID);
                    DomainManager.newDomainForProtocol("lycos.fr", "pop",cszLycosPOPContentID);
                } 
            }
            else
            {
                g_LycosDebugLog.Write("Lycos.js :TimerCallback - setting domains");
                if (!bResultPOP) DomainManager.newDomainForProtocol("lycos.co.uk", "pop" ,cszLycosPOPContentID);
                if (!bResultPOP1) DomainManager.newDomainForProtocol("lycos.it", "pop" ,cszLycosPOPContentID);
                if (!bResultPOP2) DomainManager.newDomainForProtocol("lycos.at", "pop",cszLycosPOPContentID);
                if (!bResultPOP3) DomainManager.newDomainForProtocol("lycos.de", "pop",cszLycosPOPContentID);
                if (!bResultPOP4) DomainManager.newDomainForProtocol("lycos.es", "pop",cszLycosPOPContentID);
                if (!bResultPOP5) DomainManager.newDomainForProtocol("lycos.fr", "pop",cszLycosPOPContentID);
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
