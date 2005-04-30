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
            var bResult = DomainManager.getDomain("yahoo.com", szContentID);
            var bResult1 = DomainManager.getDomain("yahoo.es",szContentID);
            var bResult2 = DomainManager.getDomain("yahoo.co.uk", szContentID);
            var bResult3 = DomainManager.getDomain("yahoo.it",szContentID);
            var bResult4 = DomainManager.getDomain("yahoo.com.cn",szContentID);
            var bResult5 = DomainManager.getDomain("yahoo.fr",szContentID);
            var bResult6 = DomainManager.getDomain("yahoo.de",szContentID);
                       
            
            var bPass = false;
            
            if (bResult && bResult1 && bResult2 && bResult3 && bResult4 && bResult5 && bReault6)
            {
                g_YahooDebugLog.Write("Yahoo.js :YahooStartUp - getDomains ");
                
                //check returned ids
                if (szContentID.value == cszYahooContentID) bPass = true; 
                
                //test has failed set ids    
                if (!bPass)
                {
                    g_YahooDebugLog.Write("Yahoo.js :YahooStartUp - IDs failed - resetting");
                    DomainManager.newDomain("yahoo.com", cszYahooContentID);
                    DomainManager.newDomain("yahoo.co.uk", cszYahooContentID);
                    DomainManager.newDomain("yahoo.it", cszYahooContentID);  
                    DomainManager.newDomain("yahoo.es", cszYahooContentID); 
                    DomainManager.newDomain("yahoo.com.cn",cszYahooContentID); 
                    DomainManager.newDomain("yahoo.fr",cszYahooContentID); 
                    DomainManager.newDomain("yahoo.de",cszYahooContentID); 
                }  
            }
            else
            {
                g_YahooDebugLog.Write("Yahoo.js :YahooStartUp - setting Domains");
                if (!bResult) DomainManager.newDomain("yahoo.com", cszYahooContentID);
                if (!bResult1)DomainManager.newDomain("yahoo.es", cszYahooContentID);  
                if (!bResult2)DomainManager.newDomain("yahoo.co.uk", cszYahooContentID);
                if (!bResult3)DomainManager.newDomain("yahoo.it", cszYahooContentID); 
                if (!bResult4)DomainManager.newDomain("yahoo.com.cn", cszYahooContentID);  
                if (!bResult5)DomainManager.newDomain("yahoo.fr", cszYahooContentID);  
                if (!bResult6)DomainManager.newDomain("yahoo.de", cszYahooContentID);  
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
