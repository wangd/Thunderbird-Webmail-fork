//project globals
var gWebmailDebugLog = null;
var gPOP = null;
var g_DomainManager = null;
var g_AccountWizard = null;

window.addEventListener("load",   WebmailStartUp, false);
window.addEventListener("unload", WebmailShutDown,  false);


function WebmailStartUp()
{   
    try
    {    
        var scriptLoader =  Components.classes["@mozilla.org/moz/jssubscript-loader;1"]
                                        .getService(Components.interfaces.mozIJSSubScriptLoader);
        if (scriptLoader)
        {
            scriptLoader.loadSubScript("chrome://web-mail/content/common/DebugLog.js");
            scriptLoader.loadSubScript("chrome://web-mail/content/Webmail-AccountManager.js");  
        }
                
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
   	
   	
   	    //account wizard
   	    var oPref = new Object();
        oPref.Value = null;
        var  WebMailPrefAccess = new WebMailCommonPrefAccess();
        WebMailPrefAccess.Get("bool","webmail.UseAccountWizard",oPref); 
        g_AccountWizard = new WebmailAccountManager();  //create webmail.rdf file
        if (oPref.Value) g_AccountWizard.createISP();
   	   
           
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
    
      
    //account wizard
    g_AccountWizard.deleteISP();
       
    gWebmailDebugLog.Write("Webmail : Webmail.js : WebmailShutDown - END");
}
