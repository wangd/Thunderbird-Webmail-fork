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
        
                         
            this.m_DomainManager = Components.classes["@mozilla.org/DomainManager;1"].
                                     getService().QueryInterface(Components.interfaces.nsIDomainManager);
           
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
};
