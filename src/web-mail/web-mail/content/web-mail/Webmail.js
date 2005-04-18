//project globals
var gWebmailDebugLog = null;
var gPOP = null;
var gIMAP = null;
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
            scriptLoader.loadSubScript("chrome://web-mail/content/common/CommonPrefs.js");
            scriptLoader.loadSubScript("chrome://web-mail/content/Webmail-AccountManager.js");  
        }
                
        //create debug log global 
        gWebmailDebugLog = new DebugLog("webmail.logging.comms",
                                        "{3c8e8390-2cf6-11d9-9669-0800200c9a66}", 
                                        "general");
                                        
        gWebmailDebugLog.Write("Webmail: Webmail.js : WebmailStartUp - START");
    
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
            g_DomainManager = Components.classes["@mozilla.org/DomainManager;1"]
                                        .getService()
                                        .QueryInterface(Components.interfaces.nsIDomainManager);
            
            gPOP = Components.classes["@mozilla.org/POPConnectionManager;1"]
                             .getService()
                             .QueryInterface(Components.interfaces.nsIPOPConnectionManager);
            
            if (gPOP.Start())
                gWebmailDebugLog.Write("Webmail: Webmail.js : WebmailStartUp - pop server started");
            else
                gWebmailDebugLog.Write("Webmail: Webmail.js : WebmailStartUp - pop server not started");  
                
            
            gIMAP = Components.classes["@mozilla.org/IMAPConnectionManager;1"]
                             .getService()
                             .QueryInterface(Components.interfaces.nsIIMAPConnectionManager);     
            
            if (gIMAP.Start())
                gWebmailDebugLog.Write("Webmail: Webmail.js : WebmailStartUp - IMAP server started");
            else
                gWebmailDebugLog.Write("Webmail: Webmail.js : WebmailStartUp - IMAP server started");
                     
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
   
    if  (gPOP) gPOP.Stop(); //stop pop server
    if  (gIMAP) gIMAP.Stop(); //stop imap server
      
    //account wizard
    g_AccountWizard.deleteISP();
       
    gWebmailDebugLog.Write("Webmail : Webmail.js : WebmailShutDown - END");
}
