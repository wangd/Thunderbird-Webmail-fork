var gLoggingPane = 
{
    m_DebugLog : new DebugLog("webmail.logging.comms", 
                              "{3c8e8390-2cf6-11d9-9669-0800200c9a66}",
                              "webmailPrefs"),
    
    m_aLoggingGroupList : new Array("chkLoggingJSConsole", 
                                    "chkLoggingFile"),
                           
    m_aLoggingFileList : new Array("labelLoggingFile", 
                                   "txtLoggingFile", 
                                   "buttonLoggingFile"),
                                          
                                          
    init : function ()
    {
        this.m_DebugLog.Write("Webmail-Prefs-Logging : init - START");
        
        var chkBox1 = document.getElementById("chkWebmailLogging"); //use logging
        var chkBox2 = document.getElementById("chkLoggingFile"); //use file 
    
        if (!chkBox1.checked) //if c1 == false then disable  all
        {   
           this.boxActivation("chkLoggingFile", this.m_aLoggingFileList, true );
           this.boxActivation("chkWebmailLogging", this.m_aLoggingGroupList, true ); 
        }
        else //if c1 == true then C2==B3
        {  
           this.boxActivation("chkWebmailLogging", this.m_aLoggingGroupList, !chkBox1.checked);
           this.boxActivation("chkLoggingFile", this.m_aLoggingFileList, !chkBox2.checked);
        } 
        
        this.m_DebugLog.Write("Webmail-Prefs-Logging : init - END");
    },
    
    
    //  checkbox: clicked check box
    //  list: elements to enable/disable
    //  state: if set ignore current state and use give state 
    boxActivation : function (checkbox, list, state)
    {
        try
        {
            this.m_DebugLog.Write("Webmail-Prefs-Logging : boxActivation - START");
          
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
                        this.m_DebugLog.Write("Webmail-Prefs-Logging : boxActivation - \n"
                                                 +"element - " + list[i] + "\n" 
                                                 + "disabled - " + newState);
                    }
                }
            } 
                	
            this.m_DebugLog.Write("Webmail-Prefs-Logging : boxActivation - END");
            return; 
        }
        catch(e)
        {
            this.m_DebugLog.DebugDump("Webmail-Prefs-Servers: Exception in boxActivation : " 
                                          + e.name +
                                          ".\nError message: " 
                                          + e.message);
        }
    },
    
    
    updateBox : function (checkbox1,list1,checkbox2,list2)
    {
        this.m_DebugLog.Write("Webmail-Prefs-Logging : UpDateBox - START");
         
        var element = document.getElementById(checkbox1);
        var element2 = document.getElementById(checkbox2);
        
        if (element.checked) //if c1 == false then disable  all
        {   
            this.boxActivation(checkbox2, list2, true );
            this.boxActivation(checkbox1, list1, true ); 
        }
        else //if c1 == true then C2==B3
        {
            this.boxActivation(checkbox1, list1,null ); 
            this.boxActivation(checkbox2, list2,!element2.checked);      
        }
        
        this.m_DebugLog.Write("Webmail-Prefs-Logging : UpDateBox - END");
        
        return;
    },
    
    
    readFolderPref : function ()
    {
        try
        {   
            this.m_DebugLog.Write("Webmail-Prefs-Logging : readFolderPref - START");
             
            this.updateFileField();
    
            this.m_DebugLog.Write("Webmail-Prefs-Logging : readFolderPref - END");
            return undefined;
        }
        catch(e)
        {
            this.m_DebugLog.DebugDump("Webmail-Prefs-Logging : Exception in readFolderPref : " 
                                          + e.name + 
                                          ".\nError message: " 
                                          + e.message);
            return undefined;
        }
    },
    
    
    writeFolderPref : function ()
    {
        try
        {
            this.m_DebugLog.Write("Webmail-Prefs-Logging : writeFolderPref - START");
            
            var folderPref = document.getElementById("fileLocation"); 
            this.m_DebugLog.Write("Webmail-Prefs-Logging : readFolderPref - folderpref " + folderPref.value);
            
            this.m_DebugLog.Write("Webmail-Prefs-Logging : writeFolderPref - END");
            return folderPref.value;
        }
        catch(e)
        {
             this.m_DebugLog.DebugDump("Webmail-Prefs-Logging : Exception in writeFolderPref : " 
                                          + e.name + 
                                          ".\nError message: " 
                                          + e.message);
            return false;
        }
    },
    
    
    browseForFolders : function ()
    {
        try
        {
            this.m_DebugLog.Write("Webmail-Prefs-Logging : browseForFolders - START");
           
            var nsIFilePicker = Components.interfaces.nsIFilePicker;
            var fp = Components.classes["@mozilla.org/filepicker;1"].createInstance(nsIFilePicker);
            
            var strbundle=document.getElementById("stringsWebmailPrefs-Log");
            var szFolder=strbundle.getString("BrowseForFolders");
            fp.init(window, szFolder, nsIFilePicker.modeGetFolder);
            var res=fp.show();
            
            if (res==nsIFilePicker.returnOK)
            {
                var folderPref = document.getElementById("fileLocation"); 
                folderPref.value = fp.file;
                
                this.updateFileField(); 
            }
                         
            this.m_DebugLog.Write("Webmail-Prefs-Logging : browseForFolders END");
            return;
        }
        catch(e)
        {
            this.m_DebugLog.DebugDump("Webmail-Prefs-Servers : Exception in browseForFolders : " 
                                          + e.name + 
                                          ".\nError message: " 
                                          + e.message);
        }
    },
    
    
    updateFileField : function ()
    { 
        try
        {
            this.m_DebugLog.Write("Webmail-Prefs-Logging : updateFileField START");
            
            var folderPref = document.getElementById("fileLocation"); 
            var txtLoggingFile = document.getElementById("txtLoggingFile"); 
            txtLoggingFile.value = folderPref.value;
            txtLoggingFile.label = folderPref.value.path;
              
            var ios = Components.classes["@mozilla.org/network/io-service;1"].
                                getService(Components.interfaces.nsIIOService);
            var nsFilePro = ios.getProtocolHandler("file").
                                QueryInterface(Components.interfaces.nsIFileProtocolHandler);
            
            var urlspec = nsFilePro.getURLSpecFromFile(folderPref.value);
            txtLoggingFile.image = "moz-icon://" + urlspec + "?size=16";
            
            this.m_DebugLog.Write("Webmail-Prefs-Logging : updateFileField END");
        }
        catch(e)
        {
            this.m_DebugLog.DebugDump("Webmail-Prefs-Servers : Exception in updateFileField : " 
                                          + e.name + 
                                          ".\nError message: " 
                                          + e.message);
        }
    },
};
