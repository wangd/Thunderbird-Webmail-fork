const cszYahooContentID = "@mozilla.org/YahooPOP;1";
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
        
            var iCount = this.windowCount();
            if (iCount >1) 
            {
                this.m_Log.Write("Yahoo.js : - another window - END");
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
            this.idCheck("yahoo.se","POP", cszYahooContentID);
            this.idCheck("yahoo.co.jp","POP", cszYahooContentID);
            this.idCheck("yahoo.co.uk","POP" ,cszYahooContentID);
            this.idCheck("yahoo.it","POP", cszYahooContentID);
            this.idCheck("yahoo.com.cn","POP", cszYahooContentID);  
            this.idCheck("yahoo.fr","POP", cszYahooContentID);
            this.idCheck("yahoo.de","POP", cszYahooContentID);
            this.idCheck("yahoo.ca","POP", cszYahooContentID); 
            this.idCheck("yahoo.com.au","POP", cszYahooContentID); 
            this.idCheck("yahoo.com.hk","POP", cszYahooContentID); 
            this.idCheck("talk21.com", "POP", cszYahooContentID); 
            this.idCheck("btinternet.com", "POP" ,cszYahooContentID); 
            this.idCheck("btopenworld.com", "POP" ,cszYahooContentID);         
            this.idCheck("yahoo.com.sg", "POP" ,cszYahooContentID);
            this.idCheck("yahoo.com.ar", "POP" ,cszYahooContentID);
            this.idCheck("yahoo.ie", "POP" ,cszYahooContentID);

            this.idCheck("yahoo.com","SMTP",cszYahooSMTPContentID);                  
            this.idCheck("yahoo.es","SMTP", cszYahooSMTPContentID);
            this.idCheck("yahoo.se","SMTP", cszYahooSMTPContentID);
            this.idCheck("yahoo.co.jp","SMTP", cszYahooSMTPContentID);
            this.idCheck("yahoo.co.uk","SMTP" ,cszYahooSMTPContentID);
            this.idCheck("yahoo.it","SMTP", cszYahooSMTPContentID);
            this.idCheck("yahoo.com.cn","SMTP", cszYahooSMTPContentID);  
            this.idCheck("yahoo.fr","SMTP", cszYahooSMTPContentID);
            this.idCheck("yahoo.de","SMTP", cszYahooSMTPContentID);
            this.idCheck("yahoo.ca","SMTP", cszYahooSMTPContentID); 
            this.idCheck("yahoo.com.au","SMTP", cszYahooSMTPContentID); 
            this.idCheck("yahoo.com.hk","SMTP", cszYahooSMTPContentID); 
            this.idCheck("talk21.com", "SMTP", cszYahooSMTPContentID); 
            this.idCheck("btinternet.com", "SMTP" ,cszYahooSMTPContentID); 
            this.idCheck("btopenworld.com", "SMTP" ,cszYahooSMTPContentID);    
            this.idCheck("yahoo.com.sg", "SMTP" ,cszYahooSMTPContentID);
            this.idCheck("yahoo.com.ar", "SMTP" ,cszYahooSMTPContentID);           
            this.idCheck("yahoo.ie", "SMTP" ,cszYahooSMTPContentID);
            
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
    
    
    
    windowCount : function()
    {
        try
        {
            this.m_Log.Write("Yahoo.js : windowCount - START");
            
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
            
            this.m_Log.Write("Yahoo.js : windowCount - "+ iWindowCount +" END ");
            return iWindowCount;
        }
        catch(e)
        {
            this.m_Log.DebugDump("Yahoo.js : Exception in shutDown " 
                                            + e.name 
                                            + ".\nError message: " 
                                            + e.message);
        }
    },
};
