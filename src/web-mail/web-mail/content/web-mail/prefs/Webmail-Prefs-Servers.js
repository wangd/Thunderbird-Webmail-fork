


function Startup()
{
    try
    {
        parent.gWebmailLog.Write("Webmail: Webmail-Prefs-Servers.js : Startup - START");
        
        parent.hPrefWindow.registerOKCallbackFunc(onOK);
        parent.hPrefWindow.registerCancelCallbackFunc(onCancel);
        
        UpdateStatus();
       
        //update status every 10s
        //get timer 
        parent.gWebMailUpdateTimer = Components.classes["@mozilla.org/timer;1"].createInstance(Components.interfaces.nsITimer);  
        parent.gWebMailUpdateTimer.initWithCallback(TimerCallback, 60000, Components.interfaces.nsITimer.TYPE_REPEATING_SLACK);
        
        parent.gWebmailLog.Write("Webmail: Webmail-Prefs-Servers.js : Startup - END");
    }
    catch(e)
    {
         parent.gWebmailLog.DebugDump("Webmail: Webmail-Prefs-Servers.js : Exception in Startup : " 
                                      + e.name + 
                                      ".\nError message: " 
                                      + e.message);
    }
}


function onOK()
{
    try
    {
        parent.gWebmailLog.Write("Webmail: Webmail-Prefs-Servers.js : onOK - START");
        //cancel status page timer
        if (parent.gWebMailUpdateTimer) parent.gWebMailUpdateTimer.cancel(); 
        parent.gWebmailLog.Write("Webmail: Webmail-Prefs-Servers.js : onOK - END");
    }
    catch(e)
    {
        parent.gWebmailLog.DebugDump("Webmail: Webmail-Prefs-Servers.js : Exception in onOK : " 
                                      + e.name + 
                                      ".\nError message: " 
                                      + e.message);
    }
}

function onCancel()
{
    try
    {
        parent.gWebmailLog.Write("Webmail: Webmail-Prefs-Servers.js : onCancel - START");
        //cancel status page timer
        if (parent.gWebMailUpdateTimer) parent.gWebMailUpdateTimer.cancel(); 
        parent.gWebmailLog.Write("Webmail: Webmail-Prefs-Servers.js : onCancel - START");
    }
    catch(e)
    {
        parent.gWebmailLog.DebugDump("Webmail: Webmail-Prefs-Servers.js : Exception in onCancel : " 
                                      + e.name + 
                                      ".\nError message: " 
                                      + e.message);
    }
}



function StatusText(iValue)
{ 
    parent.gWebmailLog.Write("Webmail: Webmail-Prefs-Servers.js : StatusText - " + iValue + "- START");
    
    var strbundle=document.getElementById("stringsWebmailPrefs-Servers");
    var szString="";
    
    switch(iValue)
    {// -1 = ERROR (RED); 0 = WAITING (AMBER); 1 = Stopped (GREY); 2 = Running (GREEN)
        case -1:  szString = strbundle.getString("ERROR"); break              
        case 0:   szString = strbundle.getString("Stop"); break
        case 1:   szString = strbundle.getString("Wait"); break
        case 2:   szString = strbundle.getString("Go"); break
    }
    
    parent.gWebmailLog.Write("Webmail: Webmail-Prefs-Servers.js : StatusText - " + szString + " END");
    return szString;
}



function UpdateStatus()
{
    parent.gWebmailLog.Write("Webmail: Webmail-Prefs-Servers.js : UpdateStatus - START");
      
    //pop status
    var iPOPvalue = -1;
    parent.gWebmailLog.Write("Webmail: Webmail-Prefs-Servers.js : Startup - getting pop status");
    if (parent.gWebmailPOP)
    {
        iPOPvalue = parent.gWebmailPOP.GetStatus();
        parent.gWebmailLog.Write("Webmail: Webmail-Prefs-Servers.js : Startup - parent.gPOP.GetStatus()" + iPOPvalue);
    }
    else
    {
        parent.gWebmailLog.Write("Webmail: Webmail-Prefs-Servers.js : Startup - parent.gPOP == null");
    }
    
    document.getElementById("imgPopStatus").setAttribute("value",iPOPvalue); //set pop status colour
    document.getElementById("txtPopStatus").setAttribute("value",StatusText(iPOPvalue)); //set status text 
    
    parent.gWebmailLog.Write("Webmail: Webmail-Prefs-Servers.js : UpdateStatus - END");
}



//timer
var TimerCallback = {
    notify: function(timer)
    {
        parent.gWebmailLog.Write("Webmail: Webmail-Prefs-Servers.js : TimerCallback - START");
        
        UpdateStatus(); 
        
        parent.gWebmailLog.Write("Webmail: Webmail-Prefs-Servers.js : TimerCallback - END");
    } 
} 
