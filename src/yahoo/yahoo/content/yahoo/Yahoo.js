const cszYahooContentID = "@mozilla.org/Yahoo;1";
const cszYahooSMTPContentID = "@mozilla.org/YahooSMTP;1";

window.addEventListener("load", function() {gYahooStartUp.init();} , false);

var gYahooStartUp =
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
                                      "yahoo");
                                            
            this.m_Log.Write("Yahoo.js : YahooStartUp - START");
        
                         
            this.m_DomainManager = Components.classes["@mozilla.org/DomainManager;1"].
                                     getService().QueryInterface(Components.interfaces.nsIDomainManager);
           
            this.m_Timer = Components.classes["@mozilla.org/timer;1"]
                                            .createInstance(Components.interfaces.nsITimer); 
            this.m_Timer.initWithCallback(this, 
                                          2000, 
                                          Components.interfaces.nsITimer.TYPE_REPEATING_SLACK);
            this.m_Log.Write("Yahoo.js : YahooStartUp - DB not loaded");
           
            window.removeEventListener("load", function() {gYahooStartUp.init();} , false);
                    
        	this.m_Log.Write("Yahoo.js : YahooStartUP - END ");
        }
        catch(e)
        {
            this.m_Log.DebugDump("Yahoo.js : Exception in YahooStartUp " 
                                        + e.name + 
                                        ".\nError message: " 
                                        + e.message);
        }
    },  
       
        
    notify: function(timer)
    {
        try
        {
            this.m_Log.Write("Yahoo.js : TimerCallback -  START");
            
           
            if(!this.m_DomainManager.isReady())
            {
                this.m_Log.Write("Yahoo.js : TimerCallback -  db not ready");
                return;
            }    
            timer.cancel();
         
            //get store ids
            this.idCheck("yahoo.com","POP", cszYahooContentID );
            this.idCheck("yahoo.es","POP", cszYahooContentID);
            this.idCheck("yahoo.co.uk","POP" ,cszYahooContentID);
            this.idCheck("yahoo.it","POP", cszYahooContentID);
            this.idCheck("yahoo.com.cn","POP", cszYahooContentID);  
            this.idCheck("yahoo.fr","POP", cszYahooContentID);
            this.idCheck("yahoo.de","POP", cszYahooContentID);
            this.idCheck("yahoo.ca","POP", cszYahooContentID); 
            this.idCheck("yahoo.com.au","POP", cszYahooContentID);          
           
            this.idCheck("yahoo.com","SMTP",cszYahooSMTPContentID);                  
            this.idCheck("yahoo.es","SMTP", cszYahooSMTPContentID);
            this.idCheck("yahoo.co.uk","SMTP" ,cszYahooSMTPContentID);
            this.idCheck("yahoo.it","SMTP", cszYahooSMTPContentID);
            this.idCheck("yahoo.com.cn","SMTP", cszYahooSMTPContentID);  
            this.idCheck("yahoo.fr","SMTP", cszYahooSMTPContentID);
            this.idCheck("yahoo.de","SMTP", cszYahooSMTPContentID);
            this.idCheck("yahoo.ca","SMTP", cszYahooSMTPContentID); 
            this.idCheck("yahoo.com.au","SMTP", cszYahooSMTPContentID);  
                        
            this.m_Log.Write("Yahoo.js : TimerCallback - END");
        }
        catch(e)
        {
            this.m_Log.DebugDump("Yahoo.js : TimerCallback - Exception in notify : " 
                                        + e.name + 
                                        ".\nError message: " 
                                        + e.message);
        }
    },
    
    
    idCheck : function(szDomain, szProtocol, szYahooContentID)
    {
        this.m_Log.Write("Yahoo.js : idCheck - START");
        this.m_Log.Write("Yahoo.js : idCheck - " +szDomain + " "
                                                + szProtocol+ " "
                                                + szYahooContentID);
         
        var szContentID = new Object;
        if (this.m_DomainManager.getDomainForProtocol(szDomain,szProtocol, szContentID))
        {
            this.m_Log.Write("Yahoo.js : idCheck - found");
            if (szContentID.value != szYahooContentID)
            {
                this.m_Log.Write("Yahoo.js : idCheck - wrong id");
                this.m_DomainManager.newDomainForProtocol(szDomain, szProtocol, szYahooContentID);
            }
        }
        else
        {
            this.m_Log.Write("Yahoo.js : idCheck - not found");
            this.m_DomainManager.newDomainForProtocol(szDomain, szProtocol, szYahooContentID);    
        }
        
        this.m_Log.Write("Yahoo.js : idCheck - END");
    },
};
