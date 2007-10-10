var gHotmailFoldersAdd = 
{
    m_DebugLog : new DebugLog("webmail.logging.comms", 
                              "{3c8e8390-2cf6-11d9-9669-0800200c9a66}",
                              "HotmailPrefs"),
    m_strBundle : null,
                                  
    init : function ()
    {
        try
        {
            this.m_DebugLog.Write("Hotmail-Prefs-Folders-Add : Init - START");
            document.getElementById("labelFolderName").click();
            this.m_DebugLog.Write("Hotmail-Prefs-Folders-Add : Init - END");
        }
        catch(e)
        {
            this.m_DebugLog.DebugDump("Hotmail-Prefs-Folders-Add : Exception in init : " 
                                          + e.name + 
                                          ".\nError message: " 
                                          + e.message + "\n"
                                          + e.lineNumber);
        }        
    },
    
    
    
    doOk : function ()
    {
        this.m_DebugLog.Write("Hotmail-Prefs-Folders-Add : doOK - START");
        
        //get text
        var szValue =  document.getElementById("txtDomain").value;
        this.m_DebugLog.Write("Hotmail-Prefs-Folders-Add  : szValue " + szValue);
        
        //remove leading and trailing space
        szValue = szValue.replace(/^\s*/,"").replace(/\s*$/,"");
        this.m_DebugLog.Write("Hotmail-Prefs-Folders-Add  : szValue " + szValue+ "length" +szValue.length);
        
        //check length > 0
        if (szValue.length<=0)
        {
            //error 
            this.m_DebugLog.Write("Hotmail-Prefs-Folders-Add : length check failed");
            
            var strBundle = document.getElementById("stringsHotmailFoldersAdd");
            var szTitle = strBundle.getString("errorTitle");
            var szText = strBundle.getString("errorMsg");
            
            var PromptService = Components.classes["@mozilla.org/embedcomp/prompt-service;1"].getService();
            PromptService.QueryInterface(Components.interfaces.nsIPromptService);
            PromptService.alert(window, szTitle, szText);
            
            document.getElementById("labelFolderName").click();
        }
        else if (szValue.search(/^inbox$/i)!=-1 || szValue.search(/^trash$/i)!=-1 ||
                                                            szValue.search(/^draft$/i)!=-1)
        {
            this.m_DebugLog.Write("Hotmail-Prefs-Folders-Add : folder check failed");
    
            var strBundle = document.getElementById("stringsHotmailFoldersAdd");
            var szTitle = strBundle.getString("errorTitle");
            var szText = strBundle.getString("errorMsgName");
            szText = szText.replace(/%s/,szValue);
            
            var PromptService = Components.classes["@mozilla.org/embedcomp/prompt-service;1"].getService();
            PromptService.QueryInterface(Components.interfaces.nsIPromptService);
            PromptService.alert(window, szTitle, szText);
  
            document.getElementById("labelFolderName").click();
        }
        else
        {
            this.m_DebugLog.Write("Hotmail-Prefs-Folders-Add : check ok");
            window.arguments[0].szFolder = szValue;
            window.arguments[1].value = 1;
            window.close();    
        }
        this.m_DebugLog.Write("Hotmail-Prefs-Folders-Add  : doOK - END");       
        return true;
    },

     
    doCancel: function ()
    {
        this.m_DebugLog.Write("Hotmail-Prefs-Folders-Add  : doCancel - START");
        
        window.arguments[1].value = -1;
        window.close();
        
        this.m_DebugLog.Write("Hotmail-Prefs-Folders-Add  : doCancel - END");
        return true;
    },
}
