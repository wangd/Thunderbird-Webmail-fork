//project globals

var gWebmailDebugLog = null;
var gPOP = null;
var g_DomainManager = null;

window.addEventListener("load",   WebmailStartUp, false);
window.addEventListener("unload", WebmailShutDown,  false);


function WebmailStartUp()
{   
    try
    {        
        //create debug log global 
        gWebmailDebugLog = new DebugLog("webmail.logging.comms", 
                                        "{3c8e8390-2cf6-11d9-9669-0800200c9a66}",
                                        "general");
                                        
        gWebmailDebugLog.Write("Webmail: Webmail.js : WebmailStartUp - START");
    
    
        //stop reentry - removelistener isnt working
        var hShellService = Components.classes["@mozilla.org/appshell/appShellService;1"].
                                                getService(Components.interfaces.nsIAppShellService);
    	var hHiddenWindow = hShellService.hiddenDOMWindow;
    	if (hHiddenWindow.WebmailStart == true) 
        {
            gWebmailDebugLog.Write("Webmail: Webmail.js : WebmailStartUp - already running");
            return false;	
        }
        if (!('WebmailStop' in window)) window.WebmailStop = false;
    	

        //start  service
        try
        {   //create service
            g_DomainManager = Components.classes["@mozilla.org/DomainManager;1"].
                                          getService().QueryInterface(Components.interfaces.nsIDomainManager);
            
            gPOP = Components.classes["@mozilla.org/POPConnectionManager;1"].
                                          getService().QueryInterface(Components.interfaces.nsIPOPConnectionManager);
           
            if (gPOP.Start())
            {
                window.WebmailStop = true;
                hHiddenWindow.WebmailStart = true;
                gWebmailDebugLog.Write("Webmail: Webmail.js : WebmailStartUp - pop server started");
            }
            else
            {
                window.WebmailStop = false;
                hHiddenWindow.WebmailStart = false;
                gWebmailDebugLog.Write("Webmail: Webmail.js : WebmailStartUp - pop server not started");
            }
            
       }
        catch(e)
        {
            gWebmailDebugLog.Write("Webmail: Webmail.js : Starting POP servers Exception in WebmailStartUp " 
                                    + e.name + 
                                    ".\nError message: " 
                                    + e.message);
        }
        
    	//window.removeEventListener("load",   WebmailStartUp, false);
    	window.setTimeout(function()
                          {
                              gWebmailDebugLog.Write("Webmail: Webmail.js : WebmailStartUP - removeEventListener");
                              window.removeEventListener("load",WebmailStartUp, false);
                          },
                          15);
        
    	gWebmailDebugLog.Write("Webmail: Webmail.js : WebmailStartUP - END ");
    }
    catch(e)
    {
        DebugDump("Webmail: Webmail.js : Exception in WebmailStartUp " + e.name + ".\nError message: " + e.message);
    }
}


function WebmailShutDown()
{
    gWebmailDebugLog.Write("Webmail : Webmail.js : WebmailShutDown - START");
    
    if (window.WebmailStop  != true)
    { 
        gWebmailDebugLog.Write("Webmail: Webmail.js : WebmailShutDown - still running");
        return false;
    }
    
    gWebmailDebugLog.Write("Webmail: Webmail.js : WebmailShutDown - WebmailStop == true");
    if  (gPOP) gPOP.Stop(); //stop pop server
  
    gWebmailDebugLog.Write("Webmail : Webmail.js : WebmailShutDown - END");
}
