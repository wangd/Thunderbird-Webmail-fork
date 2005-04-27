//This file contains only the javascript required by the perfs dialog box
var gYahooLog = null;
var hPrefWindow = null;


function InitYahooPrefs()
{
    try
    {
        gYahooLog = new DebugLog("webmail.logging.comms", 
                                 "{3c8e8390-2cf6-11d9-9669-0800200c9a66}",
                                 "yahooPrefs");
                                   
        gYahooLog.Write("Yahoo: Yahoo-Prefs.js : InitYahooPrefs - START");
                                             
        //create pref panel object
        hPrefWindow = new nsPrefWindow('panelFrame');      
        if( !hPrefWindow ) throw new Error("Failed to create prefwindow");

        hPrefWindow.init();
        
        var url = "chrome://yahoo/content/Yahoo-Prefs-POP.xul";
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
        
        gYahooLog.Write("Yahoo: Yahoo-Prefs.js : InitYahooPrefs - END");
        
        return;
    }
    catch(e)
    {
        gYahooLog.DebugDump("Yahoo: Yahoo-Prefs.js : Exception in InitYahooPrefs : " 
                               + e.name + 
                               ".\nError message: " 
                               + e.message);
    }
}



function switchPage(aEvent)
{   
    try
    {
        gYahooLog.Write("Yahoo: Yahoo-prefs.js : switchPage - START");
        
        var newURL = aEvent.target.getAttribute("url");
        gYahooLog.Write("Yahoo: Yahoo-prefs.js : switchPage - \n"+" newURL - "+ newURL);
        
        var newTag = aEvent.target.getAttribute("tag");
         
        if (hPrefWindow) 
            hPrefWindow.switchPage(newURL, newTag);    
        else
            throw "hPrefWindow = NULL" ;   
            
        gYahooLog.Write("Yahoo: Yahoo-prefs.js : switchPage - END");
    }
    catch(e)
    {    
        gYahooLog.DebugDump("Yahoo: Exception in Yahoo-Prefs.js:switchPage " 
                                + e.name + 
                                ".\nError message: " 
                                + e.message);
    }
} 


function YahooPrefsClose()
{
    try
    {
        gYahooLog.Write("Yahoo: Yahoo-prefs.js : YahooPrefsClose - START");
   
        gYahooLog.Write("Yahoo: Yahoo-prefs.js : YahooPrefsClose - END");
    }
    catch(e)
    {
        gYahooLog.DebugDump("Yahoo: Exception in Yahoo-Prefs.js:switchPage " 
                                + e.name + 
                                ".\nError message: " 
                                + e.message);
    }
}
