//This file contains only the javascript required by the perfs dialog box
var gLycosLog = null;
var hPrefWindow = null;


function InitLycosPrefs()
{
    try
    {
        gLycosLog = new DebugLog("webmail.logging.comms", 
                                 "{3c8e8390-2cf6-11d9-9669-0800200c9a66}",
                                 "lycosPrefs");
                                   
        gLycosLog.Write("Lycos: Lycos-Prefs.js : InitLycosPrefs - START");
                                             
        //create pref panel object
        hPrefWindow = new nsPrefWindow('panelFrame');      
        if( !hPrefWindow ) throw new Error("Failed to create prefwindow");

        hPrefWindow.init();
        
        var url = "chrome://lycos/content/Lycos-Prefs-POP.xul";
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
        
        gLycosLog.Write("Lycos: Lycos-Prefs.js : InitLycosPrefs - END");
        
        return;
    }
    catch(e)
    {
        gLycosLog.DebugDump("Lycos: Lycos-Prefs.js : Exception in InitLycosPrefs : " 
                               + e.name + 
                               ".\nError message: " 
                               + e.message);
    }
}



function switchPage(aEvent)
{   
    try
    {
        gLycosLog.Write("Lycos: Lycos-prefs.js : switchPage - START");
        
        var newURL = aEvent.target.getAttribute("url");
        gLycosLog.Write("Lycos: Lycos-prefs.js : switchPage - \n"
                          +" newURL - "+ newURL);
        
        var newTag = aEvent.target.getAttribute("tag");
         
        if (hPrefWindow) 
            hPrefWindow.switchPage(newURL, newTag);    
        else
            throw "hPrefWindow = NULL" ;   
            
        gLycosLog.Write("Lycos: Lycos-prefs.js : switchPage - END");
    }
    catch(e)
    {    
        gLycosLog.DebugDump("Lycos: Exception in Lycos-Prefs.js:switchPage " 
                                + e.name + 
                                ".\nError message: " 
                                + e.message);
    }
} 


function LycosPrefsClose()
{
    try
    {
        gLycosLog.Write("Lycos: Lycos-prefs.js : LycosPrefsClose - START");
   
        gLycosLog.Write("Lycos: Lycos-prefs.js : LycosPrefsClose - END");
    }
    catch(e)
    {
        gLycosLog.DebugDump("Lycos: Exception in Lycos-Prefs.js:switchPage " 
                                + e.name + 
                                ".\nError message: " 
                                + e.message);
    }
}
