//This file contains only the javascript required by the perfs dialog box
var gMailDotComLog = null;
var hPrefWindow = null;


function InitMailDotComPrefs()
{
    try
    {
        gMailDotComLog = new DebugLog("webmail.logging.comms", 
                                 "{3c8e8390-2cf6-11d9-9669-0800200c9a66}",
                                 "maildotcomPrefs");
                                   
        gMailDotComLog.Write("MailDotCom-Prefs.js : InitMailDotComPrefs - START");
                                             
        //create pref panel object
        hPrefWindow = new nsPrefWindow('panelFrame');      
        if( !hPrefWindow ) throw new Error("Failed to create prefwindow");

        hPrefWindow.init();
        
        var url = "chrome://maildotcom/content/MailDotCom-Prefs-POP.xul";
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
        
        gMailDotComLog.Write("MailDotCom-Prefs.js : InitMailDotComPrefs - END");
        
        return;
    }
    catch(e)
    {
        gMailDotComLog.DebugDump("MailDotCom-Prefs.js : Exception in InitMailDotComPrefs : " 
                               + e.name + 
                               ".\nError message: " 
                               + e.message);
    }
}



function switchPage(aEvent)
{   
    try
    {
        gMailDotComLog.Write("MailDotCom-prefs.js : switchPage - START");
        
        var newURL = aEvent.target.getAttribute("url");
        gMailDotComLog.Write("MailDotCom-prefs.js : switchPage - \n"+" newURL - "+ newURL);
        
        var newTag = aEvent.target.getAttribute("tag");
         
        if (hPrefWindow) 
            hPrefWindow.switchPage(newURL, newTag);    
        else
            throw "hPrefWindow = NULL" ;   
            
        gMailDotComLog.Write("MailDotCom-prefs.js : switchPage - END");
    }
    catch(e)
    {    
        gMailDotComLog.DebugDump("MailDotCom-Prefs.js: Exception in switchPage " 
                                + e.name + 
                                ".\nError message: " 
                                + e.message);
    }
} 


function MailDotComPrefsClose()
{
    try
    {
        gMailDotComLog.Write("MailDotCom-Prefs.js: MailDotComPrefsClose - START");
   
        gMailDotComLog.Write("MailDotCom-prefs.js : MailDotComPrefsClose - END");
    }
    catch(e)
    {
        gMailDotComLog.DebugDump("MailDotCom-Prefs.js: Exception in switchPage " 
                                + e.name + 
                                ".\nError message: " 
                                + e.message);
    }
}
