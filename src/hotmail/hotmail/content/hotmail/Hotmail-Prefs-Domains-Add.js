var gHotmailDomainAdd = 
{
    m_DebugLog : new DebugLog("webmail.logging.comms", 
                              "{3c8e8390-2cf6-11d9-9669-0800200c9a66}",
                              "HotmailPrefs"),
                                  
    init : function ()
    {
        try
        {
            this.m_DebugLog.Write("Hotmail-Prefs-Domains-Add : Init - START");
            document.getElementById("labelDomainName").click();
            this.m_DebugLog.Write("Hotmail-Prefs-Domains-Add : Init - END");
        }
        catch(e)
        {
            this.m_DebugLog.DebugDump("Hotmail-Prefs-Domains-Add : Exception in init : " 
                                          + e.name + 
                                          ".\nError message: " 
                                          + e.message + "\n"
                                          + e.lineNumber);
        }        
    },
    
    
    
    doOk : function ()
    {
        this.m_DebugLog.Write("Hotmail-Prefs-Domains-Add : doOK - START");
        
        //get text
        var szValue =  document.getElementById("txtDomain").value;
        this.m_DebugLog.Write("Hotmail-Prefs-Domains-Add  : szValue " + szValue);
        
        //remove leading and trailing space
        szValue = szValue.replace(/^\s*/,"").replace(/\s*$/,"");
        this.m_DebugLog.Write("Hotmail-Prefs-Domains-Add  : szValue " + szValue+ " length " +szValue.length);
        
        //check length > 0
        if (szValue.length<=0)
        {
            //error 
            this.m_DebugLog.Write("Hotmail-Prefs-Domains-Add : length check failed");
            
            var strBundle = document.getElementById("stringsHotmailDomainsAdd");
            var szTitle = strBundle.getString("errorTitle");
            var szText = strBundle.getString("errorMsg");
            
            var PromptService = Components.classes["@mozilla.org/embedcomp/prompt-service;1"].getService();
            PromptService.QueryInterface(Components.interfaces.nsIPromptService);
            PromptService.alert(window, szTitle, szText);
            
            document.getElementById("labelDomainsName").click();
        }
        else if ( szValue.search(/[^a-zA-Z0-9\.]+/i)!=-1 || 
                  szValue.search(/\s/)!=-1 ||
                  szValue.search(/\./)==-1 ||
                  szValue.search(/^\./)!=-1 || 
                  szValue.search(/\.$/)!=-1)
        {
            //error 
            this.m_DebugLog.Write("Hotmail-Prefs-Domains-Add : invalid");
            
            var strBundle = document.getElementById("stringsHotmailDomainsAdd");
            var szTitle = strBundle.getString("errorTitle");
            var szText = strBundle.getString("errorInvalid");
            
            var PromptService = Components.classes["@mozilla.org/embedcomp/prompt-service;1"].getService();
            PromptService.QueryInterface(Components.interfaces.nsIPromptService);
            PromptService.alert(window, szTitle, szText);
            document.getElementById("labelDomainName").click();
        }
        else
        {
            this.m_DebugLog.Write("Hotmail-Prefs-Domains-Add : check ok");
            window.arguments[0].szDomain = szValue;
            window.arguments[1].value = 1;
            window.close();    
        }
        this.m_DebugLog.Write("Hotmail-Prefs-Domains-Add  : doOK - END");       
        return true;
    },

     
    doCancel : function ()//doCancel
    {
        this.m_DebugLog.Write("Hotmail-Prefs-Domains-Add  : doCancel - START");
        
        window.arguments[1].value = -1;
        window.close();
        
        this.m_DebugLog.Write("Hotmail-Prefs-DOmains-Add  : doCancel - END");
        return true;
    },
}
