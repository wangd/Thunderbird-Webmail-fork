//This file contains only the javascript required by the perfs dialog box
var gHotmailLog = null;
var hPrefWindow = null;


function InitHotmailPrefs()
{
    try
    {
        gLycosLog = new DebugLog("webmail.logging.comms", 
                                 "{3c8e8390-2cf6-11d9-9669-0800200c9a66}",
                                 "hotmailPrefs");
                                   
        gLycosLog.Write("Hotmail: Hotmail-Prefs.js : InitHotmailPrefs - START");
                                             
        //create pref panel object
        hPrefWindow = new nsPrefWindow('panelFrame');      
        if( !hPrefWindow ) throw new Error("Failed to create prefwindow");

        hPrefWindow.init();
        
        var url = "chrome://hotmail/content/Hotmail-Prefs-POP.xul";
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
        
        gLycosLog.Write("Hotmail: Hotmail-Prefs.js : InitHotmailPrefs - END");
        
        return;
    }
    catch(e)
    {
        gLycosLog.DebugDump("Hotmail: Hotmail-Prefs.js : Exception in InitHotmailPrefs : " 
                               + e.name + 
                               ".\nError message: " 
                               + e.message);
    }
}



function switchPage(aEvent)
{   
    try
    {
        gLycosLog.Write("Hotmail: Hotmail-prefs.js : switchPage - START");
        
        var newURL = aEvent.target.getAttribute("url");
        gLycosLog.Write("Hotmail: Hotmail-prefs.js : switchPage - \n"
                          +" newURL - "+ newURL);
        
        var newTag = aEvent.target.getAttribute("tag");
         
        if (hPrefWindow) 
            hPrefWindow.switchPage(newURL, newTag);    
        else
            throw "hPrefWindow = NULL" ;   
            
        gLycosLog.Write("Hotmail: Hotmail-prefs.js : switchPage - END");
    }
    catch(e)
    {    
        gLycosLog.DebugDump("Hotmail: Exception in Hotmail-Prefs.js:switchPage " 
                                + e.name + 
                                ".\nError message: " 
                                + e.message);
    }
} 


function HotmailPrefsClose()
{
    try
    {
        gLycosLog.Write("Hotmail: Hotmail-prefs.js : HotmailPrefsClose - START");
   
        gLycosLog.Write("Hotmail: Hotmail-prefs.js : HotmailPrefsClose - END");
    }
    catch(e)
    {
        gLycosLog.DebugDump("Hotmail: Exception in Hotmail-Prefs.js:switchPage " 
                                + e.name + 
                                ".\nError message: " 
                                + e.message);
    }
}
