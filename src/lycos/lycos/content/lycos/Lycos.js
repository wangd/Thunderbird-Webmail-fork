const cszLycosPOPContentID = "@mozilla.org/LycosPOP;1";
const cszLycosIMAPContentID = "@mozilla.org/LycosIMAP;1";
const cszLycosSMTPContentID = "@mozilla.org/LycosSMTP;1";

window.addEventListener("load", function() {gLycosStartUp.init();} , false);

var gLycosStartUp =
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
                                      "lycos");
                                            
            this.m_Log.Write("Lycos.js : init - START");
                     
            var iCount = this.windowCount();
            if (iCount >1) 
            {
                this.m_Log.Write("Lycos.js : - another window - END");
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
            this.m_Log.Write("Lycos.js : init - DB not loaded");
           
            window.removeEventListener("load", function() {gLycosStartUp.init();} , false);
                    
        	this.m_Log.Write("Lycos.js : init - END ");
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
            this.m_Log.Write("Lycos.js : notify -  START");
            
           
            if(!this.m_DomainManager.isReady())
            {
                this.m_Log.Write("Lcyos.js : notify -  db not ready");
                return;
            }    
            timer.cancel();
         
            //get store ids
            this.idCheck("lycos.co.uk", "pop" ,cszLycosPOPContentID);
            this.idCheck("lycos.it","pop" , cszLycosPOPContentID);
            this.idCheck("lycos.at", "pop" ,cszLycosPOPContentID);
            this.idCheck("lycos.de", "pop" ,cszLycosPOPContentID);
            this.idCheck("lycos.es", "pop" ,cszLycosPOPContentID);  
            this.idCheck("caramail.com", "pop" ,cszLycosPOPContentID);
            this.idCheck("lycos.nl", "pop" ,cszLycosPOPContentID);
           
           /*
            this.idCheck("lycos.co.uk", "imap" ,cszLycosIMAPContentID); 
            this.idCheck("lycos.it", "imap" ,cszLycosIMAPContentID);
            this.idCheck("lycos.at", "imap" ,cszLycosIMAPContentID);
            this.idCheck("lycos.de", "imap" ,cszLycosIMAPContentID);
            this.idCheck("lycos.es", "imap" ,cszLycosIMAPContentID);  
            this.idCheck("lycos.fr", "imap" ,cszLycosIMAPContentID); 
            this.idCheck("lycos.nl", "imap" ,cszLycosIMAPContentID);
           */
           
            this.idCheck("lycos.co.uk", "smtp" ,cszLycosSMTPContentID); 
            this.idCheck("lycos.it", "smtp" ,cszLycosSMTPContentID);
            this.idCheck("lycos.at", "smtp" ,cszLycosSMTPContentID);
            this.idCheck("lycos.de", "smtp" ,cszLycosSMTPContentID);
            this.idCheck("lycos.es", "smtp" ,cszLycosSMTPContentID);  
            this.idCheck("caramail.com", "smtp" ,cszLycosSMTPContentID); 
            this.idCheck("lycos.nl", "smtp" ,cszLycosSMTPContentID);
                               
            this.m_Log.Write("Lycos.js : notify - END");
        }
        catch(e)
        {
            this.m_Log.DebugDump("Lycos.js : notify - Exception in notify : " 
                                        + e.name + 
                                        ".\nError message: " 
                                        + e.message);
        }
    },
    
    
    idCheck : function(szDomain, szProtocol, szWantedContentID)
    {
        this.m_Log.Write("Lycos.js : idCheck - START");
        this.m_Log.Write("Lycos.js : idCheck - " +szDomain + " "
                                                + szProtocol+ " "
                                                + szWantedContentID);
         
        var szContentID = new Object;
        if (this.m_DomainManager.getDomainForProtocol(szDomain,szProtocol, szContentID))
        {
            this.m_Log.Write("Lycos.js : idCheck - found");
            if (szContentID.value != szWantedContentID)
            {
                this.m_Log.Write("Lycos.js : idCheck - wrong id");
                this.m_DomainManager.newDomainForProtocol(szDomain, szProtocol, szWantedContentID);
            }
        }
        else
        {
            this.m_Log.Write("Lycos.js : idCheck - not found");
            this.m_DomainManager.newDomainForProtocol(szDomain, szProtocol, szWantedContentID);    
        }
        
        this.m_Log.Write("Lycos.js : idCheck - END");
    },
    
    
     windowCount : function()
    {
        try
        {
            this.m_Log.Write("Lycos.js : windowCount - START");
            
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
            
            this.m_Log.Write("Lycos.js : windowCount - "+ iWindowCount +" END ");
            return iWindowCount;
        }
        catch(e)
        {
            this.m_Log.DebugDump("Lycos.js : Exception in shutDown " 
                                            + e.name 
                                            + ".\nError message: " 
                                            + e.message);
        }
    },
};
