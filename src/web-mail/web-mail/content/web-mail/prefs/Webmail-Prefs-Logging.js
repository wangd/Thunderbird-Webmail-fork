var WebmailLoggingGroupList = new Array("chkLoggingJSConsole", 
                                        "chkLoggingFile");
                           
var WebmailLoggingFileList = new Array("labelLoggingFile", 
                                        "txtLoggingFile", 
                                        "buttonLoggingFile");
                                                     

function GetFields()
  {
    try
    {
        parent.gWebmailLog.Write("Webmail: Webmail-Prefs-Logging.js : GetFields - START");
        
        var dataObject = parent.hPrefWindow.wsm.dataManager.pageData["chrome://web-mail/content/prefs/Webmail-Prefs-Logging.xul"];
      
        if (parent.gFileGeneralLogging != null)
        {
            parent.gWebmailLog.Write("Webmail: Webmail-Prefs-Logging.js : GetFields - General file != null");
            dataObject.GeneralFile = parent.gFileGeneralLogging;
        }
       
        parent.gWebmailLog.Write("Webmail: Webmail-Prefs-Logging.js : GetFields - END");
        
        return dataObject;
    }
    catch(e)
    {
        parent.gWebmailLog.DebugDump("Webmail: Webmail-Prefs-Logging.js : Exception in GetFields : " 
                                      + e.name + 
                                      ".\nError message: " 
                                      + e.message);
        return null;
    }  
  }

// manual data setting function for PrefWindow
function SetFields( aDataObject )
{
    try
    {
        parent.gWebmailLog.Write("Webmail: Webmail-Prefs-Logging.js : SetFields - START");
       
        if ("GeneralFile" in aDataObject)
        {
            parent.gFileGeneralLogging = aDataObject.GeneralFile;
            document.getElementById("txtLoggingFile").value = parent.gFileGeneralLogging.path;  
        }
        else
        {   //general file not set get from prefs
            var oPref = new Object();
            oPref.Value = null;
            var  WebMailPrefAccess = new WebMailCommonPrefAccess();
            if (WebMailPrefAccess.Get("nsILocalFile","webmail.logging.comms.FileLocation",oPref))
            {
                parent.gFileGeneralLogging = Components.classes["@mozilla.org/file/local;1"].
	                                    createInstance(Components.interfaces.nsILocalFile);
                parent.gFileGeneralLogging.initWithFile(oPref.Value);
                document.getElementById("txtLoggingFile").value = parent.gFileGeneralLogging.path;
            } 
            delete WebMailPrefAccess;
        }
                
        parent.gWebmailLog.Write("Webmail: Webmail-Prefs-Logging.js : SetFields - END");
        
        return true;
    }
    catch(e)
    {
         parent.gWebmailLog.DebugDump("Webmail: Webmail-Prefs-Logging.js : Exception in SetFields : " 
                                        + e.name + 
                                        ".\nError message: " 
                                        + e.message);
         return false;
    }
}                                        
                                        
function Startup()
{
    try
    {
        parent.gWebmailLog.Write("Webmail: Webmail-Prefs-Logging.js : Startup - START");
        
        //register ok callback
        parent.hPrefWindow.registerOKCallbackFunc(onOK);
        
         
        //general logging
        InitBox("chkWebmailLogging",WebmailLoggingGroupList,
                "chkLoggingFile",WebmailLoggingFileList);
              
        
        parent.gWebmailLog.Write("Webmail: Webmail-Prefs-Logging.js : Startup - END");
        return;
    }
    catch(e)
    {
        parent.gWebmailLog.DebugDump("Webmail: Webmail-Prefs-Logging.js : Exception in Startup : " 
                                       + e.name + 
                                       ".\nError message: " 
                                       + e.message);
    }
}


function onOK()
{
    try
    {
        parent.gWebmailLog.Write("Webmail: Webmail-Prefs-Logging.js : onOK - START");
    
        //set file locations
        if (parent.gFileGeneralLogging)
        {
            var  WebMailPrefAccess = new WebMailCommonPrefAccess();
            var bResult = WebMailPrefAccess.Set("nsILocalFile",
                                         "webmail.logging.comms.FileLocation",
                                         parent.gFileGeneralLogging);
       
         
            if (!bResult) throw new Error("WebMailPrefAccess.Set general.FileLocation failed");
            delete WebMailPrefAccess;
        }
        parent.gWebmailLog.Write("Webmail: Webmail-Prefs-Logging.js : onOK - END");
    }
    catch(e)
    {
         parent.gWebmailLog.DebugDump("Webmail: Webmail-Prefs-Logging.js : Exception in onOK : " 
                                      + e.name + 
                                      ".\nError message: " 
                                      + e.message);
    }
}


function onChange()
{
    try
    {
        parent.gWebmailLog.Write("Webmail: Webmail-Prefs-Logging.js : onChange - START");
        
        if (parent.gFileGeneralLogging)
            parent.gFileGeneralLogging.initWithPath(document.getElementById("txtLoggingFile").value);
             
        parent.gWebmailLog.Write("Webmail: Webmail-Prefs-Logging.js : onChange - END");   
    }
    catch(e)
    {
        parent.gWebmailLog.DebugDump("Webmail: Webmail-Prefs-Logging.js : Exception in onChange : " 
                                    + e.name + 
                                    ".\nError message: " 
                                    + e.message);
    }
}



function InitBox(checkbox1,list1,checkbox2,list2)
{
    parent.gWebmailLog.Write("Webmail: Webmail-Prefs-Logging.js : InitBox - START");
    
    var element = document.getElementById(checkbox1);
    var element2 = document.getElementById(checkbox2);
    
    if (!element.checked) //if c1 == false then disable  all
    {   
        WebmailBoxActivation(checkbox2 , list2, true );
        WebmailBoxActivation(checkbox1, list1, true ); 
    }
    else //if c1 == true then C2==B3
    {  
        WebmailBoxActivation(checkbox1, list1,!element.checked );   
        WebmailBoxActivation(checkbox2, list2,!element2.checked);
    }
    
    parent.gWebmailLog.Write("Webmail: Webmail-Prefs-Logging.js : InitBox - END");
    return;
}



function UpDateBox(checkbox1,list1,checkbox2,list2)
{
    parent.gWebmailLog.Write("Webmail: Webmail-Prefs-Logging.js : UpDateBox - START");
     
    var element = document.getElementById(checkbox1);
    var element2 = document.getElementById(checkbox2);
    
    if (element.checked) //if c1 == false then disable  all
    {   
        WebmailBoxActivation(checkbox2 , list2, true );
        WebmailBoxActivation(checkbox1, list1, true ); 
    }
    else //if c1 == true then C2==B3
    {
        WebmailBoxActivation(checkbox1, list1,null ); 
        WebmailBoxActivation(checkbox2, list2,!element2.checked);      
    }
    
    parent.gWebmailLog.Write("Webmail: Webmail-Prefs-Logging.js : UpDateBox - END");
    
    return;
}


//in:
//  checkbox: clicked check box
//  list: elements to enable/disable
//  state: if set ignore current state and use give state 
function WebmailBoxActivation(checkbox, list, state)
{
    try
    {
        parent.gWebmailLog.Write("Webmail: Webmail-Prefs-Logging.js : WebmailBoxActivation - START");
      
        var check = document.getElementById(checkbox);
        
        if (!check.disabled)
        {
            if (list.length>0)
            {  
                var newState;
                if (state != null)
                    newState = state; //use give state
                else
                    newState = (check.checked) ? true : false; //get current check state 
                 
                for(i = 0 ; i < list.length; i++)
                {
                    document.getElementById(list[i]).disabled = newState;
                    parent.gWebmailLog.Write("Webmail: Webmail-Prefs-Logging.js : WebmailBoxActivation - \n"
                                             +"element - " + list[i] + "\n" 
                                             + "disabled - " + newState);
                }
            }
        } 
            	
        parent.gWebmailLog.Write("Webmail: Webmail-Prefs-Logging.js : WebmailBoxActivation - END");
        return; 
    }
    catch(e)
    {
        parent.gWebmailLog.DebugDump("Webmail: Webmail-Prefs-Servers.js : Exception in WebmailBoxActivation : " 
                                      + e.name +
                                      ".\nError message: " 
                                      + e.message);
    }
}




//This function gets location for log file
//in: textbox id 
function BrowseForFolders(textBox)
{
    try
    {
        parent.gWebmailLog.Write("Webmail: Webmail-Prefs-Logging.js : BrowseDir -" + textBox +" START");
       
        var nsIFilePicker = Components.interfaces.nsIFilePicker;
        var fp = Components.classes["@mozilla.org/filepicker;1"].createInstance(nsIFilePicker);
        
        var strbundle=document.getElementById("stringsWebmailPrefs-Log");
        var szFolder=strbundle.getString("BrowseForFolders");
        fp.init(window, szFolder, nsIFilePicker.modeGetFolder);
        var res=fp.show();
        
        if (res==nsIFilePicker.returnOK)
        {
            document.getElementById(textBox).value = fp.file.path;
            
            if (textBox == "txtLoggingFile" && parent.gFileGeneralLogging != null)
                parent.gFileGeneralLogging.initWithPath(fp.file.path);
        }
                     
        parent.gWebmailLog.Write("Webmail: Webmail-Prefs-Logging.js : BrowseDir -" + textBox +" END");
        return;
    }
    catch(e)
    {
        parent.gWebmailLog.DebugDump("Webmail: Webmail-Prefs-Servers.js : Exception in BrowseDir : " 
                                      + e.name + 
                                      ".\nError message: " 
                                      + e.message);
    }
}

