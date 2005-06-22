var g_YahooDebugLog = null;
var g_YahooTimer = null;
      
const cszYahooContentID = "@mozilla.org/Yahoo;1";

window.addEventListener("load",   YahooStartUp, false);


function YahooStartUp()
{   
    try
    {     
        //create debug log global 
        g_YahooDebugLog = new DebugLog("webmail.logging.comms", 
                                         "{d7103710-6112-11d9-9669-0800200c9a66}",
                                         "yahoo");
                                        
        g_YahooDebugLog.Write("Yahoo: Yahoo.js : YahooStartUp - START");
    
                     
        var DomainManager = Components.classes["@mozilla.org/DomainManager;1"].
                                 getService().QueryInterface(Components.interfaces.nsIDomainManager);
        if(DomainManager.isReady())
        {
            g_YahooDebugLog.Write("Yahoo: Yahoo.js : YahooStartUp - DB loaded");
            YahooDiagnosticTest();
        }
        else
        {
            g_YahooTimer = Components.classes["@mozilla.org/timer;1"]
                                            .createInstance(Components.interfaces.nsITimer); 
            g_YahooTimer.initWithCallback(YahooDiagnosticTest, 
                                          2000, 
                                          Components.interfaces.nsITimer.TYPE_REPEATING_SLACK);
            g_YahooDebugLog.Write("Yahoo: Yahoo.js : YahooStartUp - DB not loaded");
        }
     
        window.setTimeout(function()
                      {
                          g_YahooDebugLog.Write("Yahoo: Yahoo.js : YahooStartUp - removeEventListener");
                          window.removeEventListener("load",YahooStartUp, false);
                      },
                      15);
                  
    	g_YahooDebugLog.Write("Yahoo: Yahoo.js : YahooStartUP - END ");
    }
    catch(e)
    {
        g_YahooDebugLog.DebugDump("Yahoo: Yahoo.js : Exception in YahooStartUp " 
                                    + e.name + 
                                    ".\nError message: " 
                                    + e.message);
    }
}

//timer
var YahooDiagnosticTest = 
{
    notify: function(timer)
    {
        try
        {
            g_YahooDebugLog.Write("Yahoo: Yahoo.js : TimerCallback -  START");
            
            var DomainManager = Components.classes["@mozilla.org/DomainManager;1"].
                                     getService().QueryInterface(Components.interfaces.nsIDomainManager);
            if(!DomainManager.isReady())
            {
                g_YahooDebugLog.Write("Yahoo: Yahoo.js : TimerCallback -  db not ready");
                return;
            }    
            timer.cancel();
         
            //get store ids
            var szContentID = new Object;
                      
            //get domain handler contentid for pop protocol
            var bResult = DomainManager.getDomainForProtocol("yahoo.com","POP", szContentID);
            var bResult1 = DomainManager.getDomainForProtocol("yahoo.es","POP",szContentID);
            var bResult2 = DomainManager.getDomainForProtocol("yahoo.co.uk","POP", szContentID);
            var bResult3 = DomainManager.getDomainForProtocol("yahoo.it","POP",szContentID);
            var bResult4 = DomainManager.getDomainForProtocol("yahoo.com.cn","POP",szContentID);
            var bResult5 = DomainManager.getDomainForProtocol("yahoo.fr","POP",szContentID);
            var bResult6 = DomainManager.getDomainForProtocol("yahoo.de","POP",szContentID);
            var bResult7 = DomainManager.getDomainForProtocol("yahoo.ca","POP",szContentID);
            
                       
            
            var bPass = false;
            
            if (bResult && bResult1 && bResult2 && bResult3 && bResult4 && bResult5 && bResult6
                    && bResult7)
            {
                g_YahooDebugLog.Write("Yahoo.js :YahooStartUp - getDomains ");
                
                //check returned ids
                if (szContentID.value == cszYahooContentID) bPass = true; 
                
                //test has failed set ids    
                if (!bPass)
                {
                    g_YahooDebugLog.Write("Yahoo.js :YahooStartUp - IDs failed - resetting");
                    DomainManager.newDomainForProtocol("yahoo.com", "POP", cszYahooContentID);
                    DomainManager.newDomainForProtocol("yahoo.co.uk","POP", cszYahooContentID);
                    DomainManager.newDomainForProtocol("yahoo.it","POP", cszYahooContentID);  
                    DomainManager.newDomainForProtocol("yahoo.es","POP", cszYahooContentID); 
                    DomainManager.newDomainForProtocol("yahoo.com.cn","POP",cszYahooContentID); 
                    DomainManager.newDomainForProtocol("yahoo.fr","POP",cszYahooContentID); 
                    DomainManager.newDomainForProtocol("yahoo.de","POP",cszYahooContentID);
                    DomainManager.newDomainForProtocol("yahoo.ca","POP",cszYahooContentID); 
                }  
            }
            else
            {
                g_YahooDebugLog.Write("Yahoo.js :YahooStartUp - setting Domains");
                if (!bResult) DomainManager.newDomainForProtocol("yahoo.com","POP", cszYahooContentID);
                if (!bResult1)DomainManager.newDomainForProtocol("yahoo.es", "POP",cszYahooContentID);  
                if (!bResult2)DomainManager.newDomainForProtocol("yahoo.co.uk","POP", cszYahooContentID);
                if (!bResult3)DomainManager.newDomainForProtocol("yahoo.it","POP", cszYahooContentID); 
                if (!bResult4)DomainManager.newDomainForProtocol("yahoo.com.cn","POP", cszYahooContentID);  
                if (!bResult5)DomainManager.newDomainForProtocol("yahoo.fr","POP", cszYahooContentID);  
                if (!bResult6)DomainManager.newDomainForProtocol("yahoo.de","POP", cszYahooContentID); 
                if (!bResult7)DomainManager.newDomainForProtocol("yahoo.ca","POP", cszYahooContentID);  
            }
                   
            g_YahooDebugLog.Write("Yahoo: Yahoo.js : TimerCallback - END");
        }
        catch(e)
        {
            g_YahooDebugLog.DebugDump("Yahoo: Yahoo.js : TimerCallback - Exception in notify : " 
                                        + e.name + 
                                        ".\nError message: " 
                                        + e.message);
        }
    }
}
