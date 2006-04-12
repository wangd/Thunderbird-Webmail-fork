var gYahooFoldersAdd = 
{
    m_DebugLog : new DebugLog("webmail.logging.comms", 
                              "{3c8e8390-2cf6-11d9-9669-0800200c9a66}",
                              "yahooPrefs"),
    m_strBundle : null,
                                  
    init : function ()
    {
        try
        {
            this.m_DebugLog.Write("Yahoo-Prefs-Folders-Add : Init - START");
            document.getElementById("labelFolderName").click();
            this.m_DebugLog.Write("Yahoo-Prefs-Folders-Add : Init - END");
        }
        catch(e)
        {
            this.m_DebugLog.DebugDump("Yahoo-Prefs-Folders-Add : Exception in init : " 
                                          + e.name + 
                                          ".\nError message: " 
                                          + e.message + "\n"
                                          + e.lineNumber);
        }        
    },
    
    
    
    doOk : function ()
    {
        this.m_DebugLog.Write("Yahoo-Prefs-Folders-Add : doOK - START");
        
        //get text
        var szValue =  document.getElementById("txtDomain").value;
        this.m_DebugLog.Write("Yahoo-Prefs-Folders-Add  : szValue " + szValue);
        
        //remove leading and trailing space
        szValue = szValue.replace(/^\s/,"").replace(/\s*$/,"");
        this.m_DebugLog.Write("Yahoo-Prefs-Folders-Add  : szValue " + szValue+ "length" +szValue.length);
        
        //check length > 0
        if (szValue.length<=0)
        {
            //error 
            this.m_DebugLog.Write("Yahoo-Prefs-Folders-Add : check failed");
            
            var strBundle = document.getElementById("stringsYahooFoldersAdd");
            var szTitle = strBundle.getString("errorTitle");
            var szText = strBundle.getString("errorMsg");
            
            var PromptService = Components.classes["@mozilla.org/embedcomp/prompt-service;1"].getService();
            PromptService.QueryInterface(Components.interfaces.nsIPromptService);
            PromptService.alert(window, szTitle, szText);
            
            document.getElementById("labelFolderName").click();
        }
        else
        {
            this.m_DebugLog.Write("Yahoo-Prefs-Folders-Add : check ok");
            window.arguments[0].szFolder = szValue;
            window.arguments[1].value = 1;
            window.close();    
        }
        this.m_DebugLog.Write("Yahoo-Prefs-Folders-Add  : doOK - END");       
        return true;
    },

     
    doCancel: function ()
    {
        this.m_DebugLog.Write("Yahoo-Prefs-Folders-Add  : doCancel - START");
        
        window.arguments[1].value = -1;
        window.close();
        
        this.m_DebugLog.Write("Yahoo-Prefs-Folders-Add  : doCancel - END");
        return true;
    },
}
