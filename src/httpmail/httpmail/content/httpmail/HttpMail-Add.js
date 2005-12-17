const URLPatternVerify = /(http|ftp|https):\/\/[\w\-_]+(\.[\w\-_]+)+([\w\-\.,@?^=%&:/~\+#]*[\w\-\@?^=%&/~\+#])?/i;
const DomainPatternVerify = /^((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.)|(([a-zA-Z0-9\-]+\.)+))([a-zA-Z]{2,4}|[0-9]{1,3})(\]?)$/;

var gHttpMailAdd = 
{
    m_UriManager : null,
    m_PromptService : null,
    m_Timer : null,
    m_szUri : null,
    m_DomainManager : null,
    m_szDomain : null,
    m_bMode : false,
    m_Log : null,
    m_bUriOnChange : false,
    m_bDomainOnChange : false,
    m_strBundle : null,
    m_bStringDomainBox : false,
    
    
           
    init: function ()
    {
        try
        {
            this.m_Log = new DebugLog("webmail.logging.comms", 
                                      "{3c8e8390-2cf6-11d9-9669-0800200c9a66}",
                                      "webdavPrefs");
            this.m_Log.Write("Webmail-Add : init - START");

            this.m_UriManager = Components.classes["@mozilla.org/UriManager;1"].getService();
            this.m_UriManager.QueryInterface(Components.interfaces.nsIUriManager);   
            
            this.m_PromptService = Components.classes["@mozilla.org/embedcomp/prompt-service;1"].getService();
            this.m_PromptService.QueryInterface(Components.interfaces.nsIPromptService);
                                                      
            this.m_DomainManager = Components.classes["@mozilla.org/DomainManager;1"].getService();
            this.m_DomainManager.QueryInterface(Components.interfaces.nsIDomainManager);
            
            this.m_bMode = window.arguments[0];
            this.m_szUri = window.arguments[1]; 
            this.m_szDomain = window.arguments[2]; 
            this.m_Log.Write("Webmail-Add : init - mode " + this.m_bMode 
                                                          + " uri " + this.m_szUri
                                                          + " domain " + this.m_szDomain);
            
            if (!this.m_bMode)//ADD
            {
                this.m_Timer = Components.classes["@mozilla.org/timer;1"]
                                                .createInstance(Components.interfaces.nsITimer);    
                this.m_Timer.initWithCallback(this, 
                                              250, 
                                              Components.interfaces.nsITimer.TYPE_ONE_SHOT);
            }
                 
            this.m_strBundle = document.getElementById("stringsHttpMailAdd");
            var szEdit = this.m_strBundle.getString("edit");
            var szAdd = this.m_strBundle.getString("add");
                                 
            var szMode = this.m_bMode? szEdit:szAdd;
            document.title = szMode;
                   
            document.getElementById("modeID").setAttribute("value", szMode);
            document.getElementById("domainImage").setAttribute("value", this.m_bMode );
            
            if (this.m_bMode) //set domain
                document.getElementById("txtDomain").setAttribute("value", this.m_szDomain );

            //get uri list
            var iCount = {value : null};
            var oUri = {value : null};
            this.m_UriManager.getAllUri(iCount, oUri);
            var aUri = oUri.value;
            this.m_Log.Write("Webmail-Add : init - iCount " + aUri.length + " uri " + aUri);

            if (iCount.value>0)
            {
                document.getElementById("menuURL" ).setAttribute("hidden",  false); 
                document.getElementById("labelURL" ).setAttribute("control",  "menuURL");               
                
                var regExp = new RegExp (this.m_szUri,"i");
                var bSel = false;
                for (i=0 ; i<aUri.length; i++ )
                {  
                    bSel = (aUri[i].search(regExp)!=-1) ? true : false;
                    this.m_Log.Write("Webmail-Add : init - " + aUri[i] + " bsel " + bSel);    
                    var menuitem = document.createElement("menuitem"); 
                    menuitem.setAttribute("label", aUri[i]);
                    document.getElementById("menupopup").appendChild(menuitem);
                    if (bSel) 
                        document.getElementById("menuURL").value = aUri[i];
                }
            }
            else
            {
                this.m_bStringDomainBox = true;
                document.getElementById("txtURL").setAttribute("hidden",  false); 
                document.getElementById("labelURL").setAttribute("control",  "txtURL");
            }

            this.m_Log.Write("Webmail-Add : init - END");   
            return true;
        }
        catch(err)
        {
             DebugDump("Webmail-Add : Exception in init : " 
                                                           + err.name 
                                                           + ".\nError message: " 
                                                           + err.message + "\n"
                                                           + err.lineNumber);
        }
    },


    notify: function(timer)
    {
        try
        {
            this.m_Log.Write("ebmail-Add : notify -  START");

            if (!this.m_szUri)
                document.getElementById("labelURL").click();
            else
                document.getElementById("labelDomain").click();
                
            timer.cancel();

            this.m_Log.Write("ebmail-Add : notify - END");
        }
        catch(e)
        {
            this.m_Log.DebugDump("ebmail-Add : notify - Exception in notify : " 
                                        + e.name + 
                                        ".\nError message: " 
                                        + e.message+ "\n"
                                        + err.lineNumber);
        }
    },


    urlChanged : function ()
    {
        this.m_Log.Write("Webmail-Add : urlChanged - START");   
        
        this.m_bUriOnChange = true;
        
        this.m_Log.Write("Webmail-Add : urlChanged - END");           
    },
    
    
    domainChanged : function ()
    {
        this.m_Log.Write("Webmail-Add : domainChanged - START");   
        
        this.m_bDomainOnChange = true;
        
        this.m_Log.Write("Webmail-Add : domainChanged - END");           
    },
    
    
    doOk: function ()
    {
        try
        {
            this.m_Log.Write("Webmail-Add : doOk - START");   

            //get uri value
            var bUriChange= true;
            var szUri = null;
            if (!this.m_bStringDomainBox)
                szUri = document.getElementById("menuURL").inputField.value;
            else
                szUri = document.getElementById("txtURL").value;    
            
            this.m_Log.Write("Webmail-Add : doOk - uri " + szUri);   
            
            if (this.m_szUri)
            {
                var regExp = new RegExp(szUri,"i");
                if (this.m_szUri.search(regExp)!=-1) bUriChange = false;
                delete regExp;
            }
    
            //get domain value  
            var bDomainChange = true;      
            var szDomain = document.getElementById("txtDomain").value;
            this.m_Log.Write("Webmail-Add : doOk - szDomain " + szDomain); 
      
            if (this.m_szDomain)
            {
                regExp = new RegExp(szDomain,"i");
                if (this.m_szDomain.search(regExp)!=-1) bDomainChange = false;
                delete regExp;
            }
            
            
            if (bUriChange || bDomainChange)
            {
                this.m_Log.Write("Webmail-Add : doOk - change detected "); 
                
                //remove @
                if(szDomain.search(/@/)!=-1)
                {
                    szDomain = szDomain.split(/@/)[1];
                    this.m_Log.Write("Webmail-Add : doOk - removing @ " + szDomain);
                }
                
                //remove leading space
                szDomain = szDomain.replace(/^\s/,"").replace(/\s$/,"");
                this.m_Log.Write("Webmail-Add : doOk - space removed szDomain "+ szDomain);
                
                szUri = szUri.replace(/^\s/,"").replace(/\s$/,"");
                this.m_Log.Write("Webmail-Add : doOk - space removed uri "+ szUri);
               
                //verify URI
                var iVerifyUri = szUri.search(URLPatternVerify);
                this.m_Log.Write("Webmail-Add : doOk - uri verify "+ iVerifyUri);
                if (iVerifyUri==-1 && szUri.search(/httpmail\.asp/i)==-1)
                {
                    //error uri didn't verify
                    this.m_Log.Write("Webmail-Add : doOk - uri veify failed");

                    var szTitle = this.m_strBundle.getString("verError");
                    var szText = this.m_strBundle.getString("urlVer");
                    this.m_PromptService.alert(window, szTitle, szText);
                    return false;
                }
                                  
                //verify Domain
                var iVerifyDomain = szDomain.search(DomainPatternVerify);
                this.m_Log.Write("Webmail-Add : doOk - domain verify "+ iVerifyDomain);
                if (iVerifyDomain==-1)
                {
                    //error domain didn't verify
                    this.m_Log.Write("Webmail-Add : doOk - domain veify failed");
                    
                    var szTitle = this.m_strBundle.getString("verError");
                    var szText = this.m_strBundle.getString("domainVer");
                    this.m_PromptService.alert(window, szTitle,szText);
                    return false;
                }
                
                //get domains registered to url
                var iDomainCount = {value : null};
                var aDomains = {value : null};
                this.m_UriManager.getDomains( szUri, iDomainCount,aDomains);
    
                //check for duplicate domain
                var szOldURL = this.m_UriManager.getUri(szDomain);
    
                if (szOldURL)
                {   //domain found
                    this.m_Log.Write("Webmail-Add : doOk - duplicate found");
                    
                    var button = 0; //overwright
                    if (!this.m_bMode) //ADD mode
                    {
                        //offer to replace
                        var flags = this.m_PromptService.BUTTON_TITLE_YES * this.m_PromptService.BUTTON_POS_0 +
                                    this.m_PromptService.BUTTON_TITLE_NO * this.m_PromptService.BUTTON_POS_1;
                        var check = {value: false};
                        
                        var szTitle = this.m_strBundle.getString("removeTitle");
                        var szText = this.m_strBundle.getString("dupDomain");
                        szText= szText.replace(/%S1/i, szDomain);
                        szText = szText.replace(/%S2/i, szOldURL);
                                               
                        button = this.m_PromptService.confirmEx(window,
                                                                szTitle, 
                                                                szText, 
                                                                flags, 
                                                                null, 
                                                                null,
                                                                null, 
                                                                null,
                                                                check);
                        
                        this.m_Log.Write("Webmail-Add : doOk - button" + button)
                    }
                    
                    if (button == 0) //Yes
                    {
                        this.m_Log.Write("Webmail-Add : doOk - replacing old entry");
                        this.m_UriManager.deleteDomain(szDomain); 
                        this.m_DomainManager.removeDomainForProtocol(szDomain,"pop");  
                        this.m_DomainManager.removeDomainForProtocol(szDomain,"smtp");  
                        
                        this.m_UriManager.addDomain(szUri, szDomain);  
                        this.m_DomainManager.newDomainForProtocol(szDomain, "pop","@mozilla.org/HttpMailPOP;1");  
                        this.m_DomainManager.newDomainForProtocol(szDomain, "smtp","@mozilla.org/HttpMailSMTP;1"); 
                    }
                    else //no
                    {
                        return false;
                    }
                }
                else//add uri and domain 
                {
                    if (!this.m_bMode) //ADD mode
                    {
                        this.m_Log.Write("Webmail-Add : doOk - adding new entry");
                        this.m_UriManager.addDomain(szUri, szDomain);
                        this.m_DomainManager.newDomainForProtocol(szDomain, "pop","@mozilla.org/HttpMailPOP;1");  
                        this.m_DomainManager.newDomainForProtocol(szDomain, "smtp","@mozilla.org/HttpMailSMTP;1");
                    }
                    else // EDIT
                    {
                        this.m_Log.Write("Webmail-Add : doOk - replacing old entry");
                        this.m_UriManager.deleteDomain(szDomain); 
                        this.m_DomainManager.removeDomainForProtocol(szDomain,"pop");  
                        this.m_DomainManager.removeDomainForProtocol(szDomain,"smtp");  
                        
                        this.m_UriManager.addDomain(szUri, szDomain); 
                        this.m_DomainManager.newDomainForProtocol(szDomain, "pop","@mozilla.org/HttpMailPOP;1");  
                        this.m_DomainManager.newDomainForProtocol(szDomain, "smtp","@mozilla.org/HttpMailSMTP;1");
                    }
                }
            }
            
            window.arguments[3].value = true;
            window.close();

            this.m_Log.Write("Webmail-Add : doOk - END");   
            return true;
        }
        catch(err)
        {
            this.m_Log.DebugDump("Webmail-Add : Exception in doOk : " 
                                           + err.name + 
                                           ".\nError message: " 
                                           + err.message + "\n"
                                           + err.lineNumber);
        }
    },
    
    
    
    doCancel: function ()
    {
        this.m_Log.Write("Webmail-Add : doCancel - START");
        
        window.arguments[3].value = false;
        window.close();
        
        this.m_Log.Write("Webmail-Add : doCancel - END");
        return true;
    },

};
