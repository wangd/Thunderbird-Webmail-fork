//This file contains only the javascript required by the perfs dialog box
var gHotmailPrefsLog = null;
var hPrefWindow = null;
var g_aDevUserNameList = null;

function InitHotmailPrefs()
{
    try
    {
        gHotmailPrefsLog = new DebugLog("webmail.logging.comms", 
                                 "{3c8e8390-2cf6-11d9-9669-0800200c9a66}",
                                 "hotmailPrefs");
                                   
        gHotmailPrefsLog.Write("Hotmail: Hotmail-Prefs.js : InitHotmailPrefs - START");
                                             
        //create pref panel object
        hPrefWindow = new nsPrefWindow('panelFrame');      
        if( !hPrefWindow ) throw new Error("Failed to create prefwindow");

        hPrefWindow.init();
        
        var url = "chrome://hotmail/content/Hotmail-Prefs-WebDav.xul";
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
        
        gHotmailPrefsLog.Write("Hotmail: Hotmail-Prefs.js : InitHotmailPrefs - END");
        
        return;
    }
    catch(e)
    {
        gHotmailPrefsLog.DebugDump("Hotmail: Hotmail-Prefs.js : Exception in InitHotmailPrefs : " 
                               + e.name + 
                               ".\nError message: " 
                               + e.message);
    }
}



function switchPage(aEvent)
{   
    try
    {
        gHotmailPrefsLog.Write("Hotmail: Hotmail-prefs.js : switchPage - START");
        
        var newURL = aEvent.target.getAttribute("url");
        gHotmailPrefsLog.Write("Hotmail: Hotmail-prefs.js : switchPage - \n"
                          +" newURL - "+ newURL);
        
        var newTag = aEvent.target.getAttribute("tag");
         
        if (hPrefWindow) 
            hPrefWindow.switchPage(newURL, newTag);    
        else
            throw new Error("hPrefWindow = NULL");   
            
        gHotmailPrefsLog.Write("Hotmail: Hotmail-prefs.js : switchPage - END");
    }
    catch(e)
    {    
        gHotmailPrefsLog.DebugDump("Hotmail: Exception in switchpage " 
                                + e.name + 
                                ".\nError message: " 
                                + e.message);
    }
} 


function HotmailPrefsClose()
{
    try
    {
        gHotmailPrefsLog.Write("Hotmail: Hotmail-prefs.js : HotmailPrefsClose - START");
   
        gHotmailPrefsLog.Write("Hotmail: Hotmail-prefs.js : HotmailPrefsClose - END");
    }
    catch(e)
    {
        gHotmailPrefsLog.DebugDump("Hotmail: Exception in Hotmail-Prefs.js: " 
                                + e.name + 
                                ".\nError message: " 
                                + e.message);
    }
}
