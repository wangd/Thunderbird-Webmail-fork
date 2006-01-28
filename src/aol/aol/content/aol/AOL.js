const cszAOLContentID = "@mozilla.org/AOLPOP;1";
const cszAOLSMTPContentID = "@mozilla.org/AOLSMTP;1";

window.addEventListener("load", function() {gAOLStartUp.init();} , false);

var gAOLStartUp =
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
                                      "AOL");
                                            
            this.m_Log.Write("AOL.js : init - START");
        
                         
            this.m_DomainManager = Components.classes["@mozilla.org/DomainManager;1"].
                                     getService().QueryInterface(Components.interfaces.nsIDomainManager);
           
            this.m_Timer = Components.classes["@mozilla.org/timer;1"]
                                            .createInstance(Components.interfaces.nsITimer); 
            this.m_Timer.initWithCallback(this, 
                                          2000, 
                                          Components.interfaces.nsITimer.TYPE_REPEATING_SLACK);
              
            window.removeEventListener("load", function() {gAOLStartUp.init();} , false);
                    
        	this.m_Log.Write("AOL.js : init - END ");
        }
        catch(e)
        {
            this.m_Log.DebugDump("AOL.js : Exception in init " 
                                        + e.name + 
                                        ".\nError message: " 
                                        + e.message + "\n"
                                        + e.lineNumber);
        }
    },  
       
        
    notify: function(timer)
    {
        try
        {
            this.m_Log.Write("AOL.js : notify -  START");
            
           
            if(!this.m_DomainManager.isReady())
            {
                this.m_Log.Write("AOL.js : notify -  db not ready");
                return;
            }    
            timer.cancel();
         
            //get store ids
            this.idCheck("aol.com", "pop" ,cszAOLContentID)
            this.idCheck("aim.com","pop" , cszAOLContentID);
            this.idCheck("netscape.com", "pop" ,cszAOLContentID);
            
            
            this.idCheck("aol.com", "smtp" ,cszAOLSMTPContentID)
            this.idCheck("aim.com","smtp" , cszAOLSMTPContentID);
            this.idCheck("netscape.com", "smtp" ,cszAOLSMTPContentID);
                   
            
            this.m_Log.Write("AOL.js : notify - END");
        }
        catch(e)
        {
            this.m_Log.DebugDump("AOL.js : notify - Exception in notify : " 
                                        + e.name + 
                                        ".\nError message: " 
                                        + e.message+ "\n"
                                        + e.lineNumber);
        }
    },
    
    
    idCheck : function(szDomain, szProtocol, szWantedContentID)
    {
        this.m_Log.Write("AOL.js : idCheck - START");
        this.m_Log.Write("AOL.js : idCheck - " +szDomain + " "
                                                + szProtocol+ " "
                                                + szWantedContentID);
         
        var szContentID = new Object;
        if (this.m_DomainManager.getDomainForProtocol(szDomain,szProtocol, szContentID))
        {
            this.m_Log.Write("AOL.js : idCheck - found");
            if (szContentID.value != szWantedContentID)
            {
                this.m_Log.Write("AOL.js : idCheck - wrong id");
                this.m_DomainManager.newDomainForProtocol(szDomain, szProtocol, szWantedContentID);
            }
        }
        else
        {
            this.m_Log.Write("AOL.js : idCheck - not found");
            this.m_DomainManager.newDomainForProtocol(szDomain, szProtocol, szWantedContentID);    
        }
        
        this.m_Log.Write("AOL.js : idCheck - END");
    },
};
