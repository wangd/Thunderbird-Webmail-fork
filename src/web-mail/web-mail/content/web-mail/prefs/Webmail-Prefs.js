//This file contains only the javascript required by the perfs dialog box
var gWebmailLog = null;
var hPrefWindow = null;
var gWebmailPOP = null;
var gWebmailSMTP = null;
var gWebMailUpdateTimer = null;
var gFileGeneralLogging = null;

function InitWebmailPrefs()
{
    try
    {
        gWebmailLog = new DebugLog("webmail.logging.comms", 
                                   "{3c8e8390-2cf6-11d9-9669-0800200c9a66}",
                                   "webmailPrefs");
                                   
        gWebmailLog.Write("Webmail: Webmail-Prefs.js : InitWebmail - START");
        
        try
        {
            //get pop service
            gWebmailPOP = Components.classes["@mozilla.org/POPConnectionManager;1"].
                            getService().QueryInterface(Components.interfaces.nsIPOPConnectionManager);
        }
        catch(e)
        {
             gWebmailLog.Write("Webmail: Webmail-Prefs.js : gWebmailPOP ERROR"
                                                             + e.name + 
                                                             ".\nError message: " 
                                                             + e.message);    
        }  
                                       
        //create pref panel object
        hPrefWindow = new nsPrefWindow('panelFrame');      
        if( !hPrefWindow ) throw "Failed to create prefwindow";

        hPrefWindow.init();
        
        var url = "chrome://webmail/content/Webmail-Prefs-Status.xul";
        if(window.arguments && window.arguments[0]) url = window.arguments[0];

        // now make sure the right button is higlighted
        // loop through each child of prefCategories and look for a url match
        var index = 0; 
        var prefsCategories = document.getElementById("prefsCategories");
        for (var i = 0; i < prefsCategories.childNodes.length; i++)
        {
          if (url == prefsCategories.childNodes[i].getAttribute("url"))
          {
            index = i;
            break;
          }
        }
        
        var button = prefsCategories.childNodes[index];
        button.click();
        button.focus();
        
        gWebmailLog.Write("Webmail: Webmail-Prefs.js : InitWebmail - END");
        
        return;
    }
    catch(e)
    {
        gWebmailLog.DebugDump("Webmail: Webmail-Prefs.js : Exception in InitWebmailPrefs : " 
                               + e.name + 
                               ".\nError message: " 
                               + e.message);
    }
}



function switchPage(aEvent)
{   
    try
    {
        gWebmailLog.Write("Webmail: prefs-Webmail.js : switchPage - START");
        
        var newURL = aEvent.target.getAttribute("url");
        gWebmailLog.Write("Webmail: prefs-Webmail.js : switchPage - \n"
                          +" newURL - "+ newURL);
        
        var newTag = aEvent.target.getAttribute("tag");
         
        if (hPrefWindow) 
            hPrefWindow.switchPage(newURL, newTag);    
        else
            throw "hPrefWindow = NULL" ;   
            
        gWebmailLog.Write("Webmail: prefs-Webmail.js : switchPage - END");
    }
    catch(e)
    {    
        gWebmailLog.DebugDump("Webmail: Exception in Webmail-Prefs.js:switchPage " 
                                + e.name + 
                                ".\nError message: " 
                                + e.message);
    }
} 


function WebMailPrefsClose()
{
    try
    {
        gWebmailLog.Write("Webmail: prefs-Webmail.js : WebMailPrefsClose - START");
       
               
        gWebmailLog.Write("Webmail: prefs-Webmail.js : WebMailPrefsClose - END");
    }
    catch(e)
    {
        gWebmailLog.DebugDump("Webmail: Exception in Webmail-Prefs.js:switchPage " 
                                + e.name + 
                                ".\nError message: " 
                                + e.message);
    }
}
