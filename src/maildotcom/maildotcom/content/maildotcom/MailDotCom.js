const cszMailDotComContentID = "@mozilla.org/MailDotComPOP;1";
const cszMailDotComSMTPContentID = "@mozilla.org/MailDotComSMTP;1";

window.addEventListener("load", function() {gMailDotComStartUp.init();} , false);

var gMailDotComStartUp =
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
                                      "maildotcom");
                                            
            this.m_Log.Write("MailDotCom.js : init - START");
        
              
            var iCount = this.windowCount();
            if (iCount >1) 
            {
                this.m_Log.Write("MailDotCom.js : - another window - END");
                return;
            }
              
                         
            try
            {
                this.m_DomainManager = Components.classes["@mozilla.org/DomainManager;1"].
                                       getService().
                                       QueryInterface(Components.interfaces.nsIDomainManager);
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
            this.m_Log.Write("MailDotCom.js : init - DB not loaded");
           
            window.removeEventListener("load", function() {gMailDotComStartUp.init();} , false);
                    
        	this.m_Log.Write("MailDotCom.js : init - END ");
        }
        catch(e)
        {
            this.m_Log.DebugDump("Lycos.js : Exception in init " 
                                        + e.name + 
                                        ".\nError message: " 
                                        + e.message);
        }
    },  
       
        
    notify: function(timer)
    {
        try
        {
            this.m_Log.Write("MailDotCom.js : notify -  START");
            
           
            if(!this.m_DomainManager.isReady())
            {
                this.m_Log.Write("MailDotCom.js : notify -  db not ready");
                return;
            }    
            timer.cancel();
         
            //get store ids
            this.idCheck("mail.com","POP", cszMailDotComContentID);
            this.idCheck("email.com","POP", cszMailDotComContentID);
            this.idCheck("journalism.com","POP", cszMailDotComContentID);
            this.idCheck("iname.com","POP", cszMailDotComContentID);
            this.idCheck("scientist.com","POP", cszMailDotComContentID);
            this.idCheck("earthling.net","POP", cszMailDotComContentID);
            this.idCheck("techie.com","POP", cszMailDotComContentID);
            this.idCheck("usa.com","POP", cszMailDotComContentID);
            this.idCheck("post.com","POP", cszMailDotComContentID);
            this.idCheck("witty.com","POP", cszMailDotComContentID);
            this.idCheck("whoever.com","POP", cszMailDotComContentID);
            this.idCheck("writeme.com","POP", cszMailDotComContentID);
            this.idCheck("unforgettable.com","POP", cszMailDotComContentID);
            this.idCheck("teacher.com","POP", cszMailDotComContentID);
            this.idCheck("consultant.com","POP", cszMailDotComContentID);
            
            this.idCheck("mail.com","SMTP", cszMailDotComSMTPContentID);
            this.idCheck("email.com","SMTP", cszMailDotComSMTPContentID);
            this.idCheck("journalism.com","SMTP", cszMailDotComSMTPContentID);
            this.idCheck("iname.com","SMTP", cszMailDotComSMTPContentID);
            this.idCheck("scientist.com","SMTP", cszMailDotComSMTPContentID);
            this.idCheck("earthling.net","SMTP", cszMailDotComSMTPContentID);
            this.idCheck("techie.com","SMTP", cszMailDotComSMTPContentID);
            this.idCheck("usa.com","SMTP", cszMailDotComSMTPContentID);
            this.idCheck("post.com","SMTP", cszMailDotComSMTPContentID);
            this.idCheck("witty.com","SMTP", cszMailDotComSMTPContentID);
            this.idCheck("whoever.com","SMTP", cszMailDotComSMTPContentID);
            this.idCheck("writeme.com","SMTP", cszMailDotComSMTPContentID);
            this.idCheck("unforgettable.com","SMTP", cszMailDotComSMTPContentID);
            this.idCheck("teacher.com","SMTP", cszMailDotComSMTPContentID);
            this.idCheck("consultant.com","POP", cszMailDotComSMTPContentID);
                        
            this.m_Log.Write("MailDotCom.js : notify - END");
        }
        catch(e)
        {
            this.m_Log.DebugDump("MailDotCom.js : notify - Exception in notify : " 
                                        + e.name + 
                                        ".\nError message: " 
                                        + e.message);
        }
    },
    
    
    idCheck : function(szDomain, szProtocol, szWantedContentID)
    {
        this.m_Log.Write("MailDotCom.js : idCheck - START");
        this.m_Log.Write("MailDotCom.js : idCheck - " +szDomain + " "
                                                + szProtocol+ " "
                                                + szWantedContentID);
         
        var szContentID = new Object;
        if (this.m_DomainManager.getDomainForProtocol(szDomain,szProtocol, szContentID))
        {
            this.m_Log.Write("MailDotCom.js : idCheck - found");
            if (szContentID.value != szWantedContentID)
            {
                this.m_Log.Write("MailDotCom.js : idCheck - wrong id");
                this.m_DomainManager.newDomainForProtocol(szDomain, szProtocol, szWantedContentID);
            }
        }
        else
        {
            this.m_Log.Write("MailDotCom.js : idCheck - not found");
            this.m_DomainManager.newDomainForProtocol(szDomain, szProtocol, szWantedContentID);    
        }
        
        this.m_Log.Write("MailDotCom.js : idCheck - END");
    },
    
    
    windowCount : function()
    {
        try
        {
            this.m_Log.Write("MailDotCom.js : windowCount - START");
            
            var iWindowCount = 0;
            var winman = Components.classes["@mozilla.org/appshell/window-mediator;1"];
            winman = winman.getService(Components.interfaces.nsIWindowMediator);
            var e = winman.getEnumerator(null);
  
            while (e.hasMoreElements()) 
            {
                var win = e.getNext();
                win.QueryInterface(Components.interfaces.nsIDOMWindowInternal);
                var szValue = win.document.documentElement.getAttribute("id");
                this.m_Log.Write("Yahoo.js : windowCount - "+ szValue);
                
                if (szValue =="messengerWindow")iWindowCount++;   
            }
            
            this.m_Log.Write("MailDotCom.js : windowCount - "+ iWindowCount +" END ");
            return iWindowCount;
        }
        catch(e)
        {
            this.m_Log.DebugDump("MailDotCom.js : Exception in shutDown " 
                                            + e.name 
                                            + ".\nError message: " 
                                            + e.message);
        }
    },
};
