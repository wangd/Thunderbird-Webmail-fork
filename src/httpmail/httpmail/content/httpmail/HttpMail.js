const cszHttpMailPOPContentID = "@mozilla.org/HttpMailPOP;1";
const cszHttpMailIMAPContentID = "@mozilla.org/HttpMailIMAP;1";
const cszHttpMailSMTPContentID = "@mozilla.org/HttpMailSMTP;1";

window.addEventListener("load", function() {gHttpMailStartUp.init();} , false);

var gHttpMailStartUp =
{   
    m_DomainManager : null,
    m_Log : null,
    m_Timer : null,
                            
    init : function ()
    {
        try
        {     
            //create debug log global 
            this.m_Log = new DebugLog("webmail.logging.comms", 
                                      "{3c8e8390-2cf6-11d9-9669-0800200c9a66}",
                                      "httpmail");
                                            
            this.m_Log.Write("HttpMail.js : init - START");
             
            var iCount = this.windowCount();
            if (iCount >1) 
            {
                this.m_Log.Write("MailDotCom.js : - another window - END");
                return;
            } 
             
              
            try
            {             
                this.m_DomainManager = Components.classes["@mozilla.org/DomainManager;1"].getService();
                this.m_DomainManager.QueryInterface(Components.interfaces.nsIDomainManager);
            }
            catch(err)
            {
                window.removeEventListener("load", function() {gYahooStartUp.init();} , false);
                throw new Error("Domain Manager Not Found");
            }
            
            this.m_Timer = Components.classes["@mozilla.org/timer;1"]
                                            .createInstance(Components.interfaces.nsITimer); 
            this.m_Timer.initWithCallback(this, 
                                          2000, 
                                          Components.interfaces.nsITimer.TYPE_REPEATING_SLACK);
            this.m_Log.Write("HttpMail.js : init - DB not loaded");
           
            window.removeEventListener("load", function() {gWebDavStartUp.init();} , false);
                    
        	this.m_Log.Write("HttpMail.js : init - END ");
        }
        catch(e)
        {
            this.m_Log.DebugDump("HttpMail.js : Exception in init " 
                                        + e.name + 
                                        ".\nError message: " 
                                        + e.message);
        }
    },  
       
        
    notify: function(timer)
    {
        try
        {
            this.m_Log.Write("HttpMail.js : notify -  START");
            
            if(!this.m_DomainManager.isReady())
            {
                this.m_Log.Write("Lcyos.js : notify -  db not ready");
                return;
            }    
            timer.cancel();
         
            var uriManager = Components.classes["@mozilla.org/UriManager;1"].getService();
            uriManager.QueryInterface(Components.interfaces.nsIUriManager);  
           
            var iCount = {value : null};
            var aDomain = {value : null};
            uriManager.getAllDomains(iCount, aDomain);
            
            for (i=0 ; i< aDomain.value.length; i++)
            {
                this.idCheck(aDomain.value[i], "pop" ,cszHttpMailPOPContentID); 
                this.idCheck(aDomain.value[i], "smtp" ,cszHttpMailSMTPContentID); 
            }    
                               
            this.m_Log.Write("HttpMail.js : notify - END");
        }
        catch(e)
        {
            this.m_Log.DebugDump("HttpMail.js : notify - Exception in notify : " 
                                        + e.name + 
                                        ".\nError message: " 
                                        + e.message);
        }
    },
    
    
    idCheck : function(szDomain, szProtocol, szContentID)
    {
        this.m_Log.Write("HttpMail.js : idCheck - START");
        this.m_Log.Write("HttpMail.js : idCheck - " +szDomain + " "
                                                + szProtocol+ " "
                                                + szContentID);
         
        var szCheckContentID = new Object;
        if (this.m_DomainManager.getDomainForProtocol(szDomain,szProtocol, szCheckContentID))
        {
            this.m_Log.Write("HttpMail.js : idCheck - found");
            if (szCheckContentID.value != szContentID)
            {
                this.m_Log.Write("HttpMail.js : idCheck - wrong id");
                this.m_DomainManager.newDomainForProtocol(szDomain, szProtocol, szContentID);
            }
        }
        else
        {
            this.m_Log.Write("HttpMail.js : idCheck - not found");
            this.m_DomainManager.newDomainForProtocol(szDomain, szProtocol, szContentID);    
        }
        
        this.m_Log.Write("HttpMail.js : idCheck - END");
    },
    
     windowCount : function()
    {
        try
        {
            this.m_Log.Write("HttpMail.js : windowCount - START");
            
            var iWindowCount = 0;
            var winman = Components.classes["@mozilla.org/appshell/window-mediator;1"];
            winman = winman.getService(Components.interfaces.nsIWindowMediator);
            var e = winman.getEnumerator(null);
  
            while (e.hasMoreElements()) 
            {
                var win = e.getNext();
                win.QueryInterface(Components.interfaces.nsIDOMWindowInternal);
                var szValue = win.document.documentElement.getAttribute("id");
                this.m_Log.Write("HttpMail.js : windowCount - "+ szValue);
                
                if (szValue =="messengerWindow")iWindowCount++;   
            }
            
            this.m_Log.Write("HttpMail.js : windowCount - "+ iWindowCount +" END ");
            return iWindowCount;
        }
        catch(e)
        {
            this.m_Log.DebugDump("HttpMail.js : Exception in shutDown " 
                                            + e.name 
                                            + ".\nError message: " 
                                            + e.message);
        }
    },
};
