const cszHotmailContentID = "@mozilla.org/Hotmail;1";

window.addEventListener("load", function() {gHotmailStartUp.init();} , false);

var gHotmailStartUp =
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
                                      "{d7103710-6112-11d9-9669-0800200c9a66}",
                                      "hotmail");
                                            
            this.m_Log.Write("Hotmail.js : init - START");
        
                         
            this.m_DomainManager = Components.classes["@mozilla.org/DomainManager;1"].
                                     getService().QueryInterface(Components.interfaces.nsIDomainManager);
           
            this.m_Timer = Components.classes["@mozilla.org/timer;1"]
                                            .createInstance(Components.interfaces.nsITimer); 
            this.m_Timer.initWithCallback(this, 
                                          2000, 
                                          Components.interfaces.nsITimer.TYPE_REPEATING_SLACK);
            this.m_Log.Write("Hotmail.js : init - DB not loaded");
           
            window.removeEventListener("load", function() {gHotmailStartUp.init();} , false);
                    
        	this.m_Log.Write("Hotmail.js : init - END ");
        }
        catch(e)
        {
            this.m_Log.DebugDump("Hotmail.js : Exception in init " 
                                        + e.name + 
                                        ".\nError message: " 
                                        + e.message);
        }
    },  
       
        
    notify: function(timer)
    {
        try
        {
            this.m_Log.Write("Hotmail.js : notify -  START");
            
           
            if(!this.m_DomainManager.isReady())
            {
                this.m_Log.Write("Hotmail.js : notify -  db not ready");
                return;
            }    
            timer.cancel();
         
            //get store ids
            this.idCheck("hotmail.com", "pop" ,cszHotmailContentID)
            this.idCheck("hotmail.co.uk","pop" , cszHotmailContentID);
            this.idCheck("msn.co.uk", "pop" ,cszHotmailContentID);
            this.idCheck("msn.com", "pop" ,cszHotmailContentID);
            this.idCheck("hotmail.it", "pop" ,cszHotmailContentID);  
            this.idCheck("hotmail.fr", "pop" ,cszHotmailContentID);
                           
            this.m_Log.Write("Hotmail.js : notify - END");
        }
        catch(e)
        {
            this.m_Log.DebugDump("Hotmail.js : notify - Exception in notify : " 
                                        + e.name + 
                                        ".\nError message: " 
                                        + e.message);
        }
    },
    
    
    idCheck : function(szDomain, szProtocol, szYahooContentID)
    {
        this.m_Log.Write("Hotmail.js : idCheck - START");
        this.m_Log.Write("Hotmail.js : idCheck - " +szDomain + " "
                                                + szProtocol+ " "
                                                + szYahooContentID);
         
        var szContentID = new Object;
        if (this.m_DomainManager.getDomainForProtocol(szDomain,szProtocol, szContentID))
        {
            this.m_Log.Write("Hotmail.js : idCheck - found");
            if (szContentID.value != szYahooContentID)
            {
                this.m_Log.Write("Hotmail.js : idCheck - wrong id");
                this.m_DomainManager.newDomainForProtocol(szDomain, szProtocol, szYahooContentID);
            }
        }
        else
        {
            this.m_Log.Write("Hotmail.js : idCheck - not found");
            this.m_DomainManager.newDomainForProtocol(szDomain, szProtocol, szYahooContentID);    
        }
        
        this.m_Log.Write("Hotmail.js : idCheck - END");
    },
};
