const URLPatternVerify = /(http|ftp|https):\/\/[\w\-_]+(\.[\w\-_]+)+([\w\-\.,@?^=%&:\/~\+#]*[\w\-\@?^=%&\/~\+#])?/i;
const DomainPatternVerify = /^((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.)|(([a-zA-Z0-9\-]+\.)+))([a-zA-Z]{2,4}|[0-9]{1,3})(\]?)$/;

var gGMailAdd = 
{
    m_Log : null,
    m_PromptService : null,
    m_oData : null,
    m_bMode : false,
    m_Timer : null,
    m_strBundle : null,
    
    
               
    init: function ()
    {
        try
        {
            this.m_Log = new DebugLog("webmail.logging.comms", 
                                      "{3c8e8390-2cf6-11d9-9669-0800200c9a66}",
                                      "GMail Prefs");
            this.m_Log.Write("GMail-Prefs-Domains-Add : init - START");

            this.m_PromptService = Components.classes["@mozilla.org/embedcomp/prompt-service;1"]
                                             .getService()
                                             .QueryInterface(Components.interfaces.nsIPromptService);
                                                      
            this.m_bMode = window.arguments[0];   //false = add , true = edit
            this.m_oData = window.arguments[1]; 
            this.m_Log.Write("Webmail-Add : init - mode " + this.m_bMode 
                                                          + " uri " + this.m_oData.szURL
                                                          + " domain " + this.m_oData.szDomain);

            this.m_strBundle = document.getElementById("stringsGMailAdd");
            var szEdit = this.m_strBundle.getString("edit");
            var szAdd = this.m_strBundle.getString("add");
                                 
            var szMode = this.m_bMode? szEdit:szAdd;
            document.title = szMode;                  
            document.getElementById("modeID").setAttribute("value", szMode);
            document.getElementById("domainImage").setAttribute("value", this.m_bMode );  
            
            if (this.m_bMode)   //edit
            {
                document.getElementById("txtDomain").setAttribute("value",this.m_oData.szDomain);
                document.getElementById("txtURL").setAttribute("value",this.m_oData.szURL);
            }

            document.getElementById("txtDomain").click();
            
            this.m_Log.Write("GMail-Prefs-Domains-Add : init - END");   
            return true;
        }
        catch(err)
        {
             DebugDump("GMail-Prefs-Domains-Add : Exception in init : "+ err.name 
                                                           + ".\nError message: " 
                                                           + err.message + "\n"
                                                           + err.lineNumber);
        }
    },


    
    doOk: function ()
    {
        try
        {
            this.m_Log.Write("GMail-Prefs-Domains-Add : doOk - START");   
/*
            //get uri value
            var szUri = document.getElementById("txtURL").value;               
            this.m_Log.Write("GMail-Prefs-Domains-Add : doOk - uri " + szUri);   
             
            //remove spaces
            szUri = szUri.replace(/\s/,"");
            this.m_Log.Write("GMail-Prefs-Domains-Add : doOk - space removed szUri "+ szUri); 
            
            //verify URI
            if (szUri.search(URLPatternVerify)==-1)
            {
                //error uri didn't verify
                this.m_Log.Write("GMail-Prefs-Domains-Add : doOk - uri veify failed");

                var szTitle = this.m_strBundle.getString("verError");
                var szText = this.m_strBundle.getString("urlVer");
                this.m_PromptService.alert(window, szTitle, szText);
                return false;
            } 
             
  */           
               
            //get domain value  
            var szDomain = document.getElementById("txtDomain").value;
            this.m_Log.Write("GMail-Prefs-Domains-Add : doOk - szDomain " + szDomain); 
     
            //remove @
            if(szDomain.search(/@/)!=-1)
            {
                szDomain = szDomain.split(/@/)[1];
                this.m_Log.Write("GMail-Prefs-Domains-Add : doOk - removing @ " + szDomain);
            }
                
            //remove spaces
            szDomain = szDomain.replace(/\s/,"");
            this.m_Log.Write("GMail-Prefs-Domains-Add : doOk - space removed szDomain "+ szDomain);
                
                                
            //verify Domain
            if (szDomain.search(DomainPatternVerify)==-1)
            {
                //error domain didn't verify
                this.m_Log.Write("GMail-Prefs-Domains-Add : doOk - domain veify failed");
                
                var szTitle = this.m_strBundle.getString("verError");
                var szText = this.m_strBundle.getString("domainVer");
                this.m_PromptService.alert(window, szTitle,szText);
                return false;
            }
            
            this.m_oData.szDomain = szDomain;
            this.m_oData.szURL  = "";
            window.arguments[1].value = this.m_oData            
            window.arguments[2].value = true;
            window.close();

            this.m_Log.Write("GMail-Prefs-Domains-Add : doOk - END");   
            return true;
        }
        catch(err)
        {
            this.m_Log.DebugDump("GMail-Prefs-Domains-Add : Exception in doOk : " 
                                           + err.name + 
                                           ".\nError message: " 
                                           + err.message + "\n"
                                           + err.lineNumber);
        }
    },
    
    
    
    doCancel: function ()
    {
        this.m_Log.Write("GMail-Prefs-Domains-Add : doCancel - START");
        
        window.arguments[2].value = false;
        window.close();
        
        this.m_Log.Write("GMail-Prefs-Domains-Add : doCancel - END");
        return true;
    },

};
