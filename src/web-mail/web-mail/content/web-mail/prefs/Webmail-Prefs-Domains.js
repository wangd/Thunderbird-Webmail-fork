var gDomainsPane = 
{
    m_DebugLog : null,
   
    init: function ()
    {
    
        this.m_DebugLog = new DebugLog("webmail.logging.comms", 
                                       "{3c8e8390-2cf6-11d9-9669-0800200c9a66}",
                                       "webmailPrefs");
                                   
        this.m_DebugLog.Write("Webmail-Prefs-Domains : init - START");
        
        var aszDomains = this.loadWebmailDomains();
        this.addDomainsListItems(aszDomains);
        
        this.m_DebugLog.Write("Webmail-Prefs-Domains : init - END");
    },
    
    
    
    loadWebmailDomains : function ()
    {
        try
        {
            this.m_DebugLog.Write("Webmail-Prefs-Domains : LoadWebmailDomains - START");
           
            var DomainManager = Components.classes["@mozilla.org/DomainManager;1"].
                                           getService().
                                           QueryInterface(Components.interfaces.nsIDomainManager);
            
            var aszDomains = {value : null};
            var iCount = {value : null }; 
            if (DomainManager.getAllDomainsForProtocol("pop", iCount, aszDomains))
            {
                this.m_DebugLog.Write("Webmail-Prefs-Domains : LoadWebmailDomains "
                                                + "pop"
                                                + iCount.value +"\n"
                                                + aszDomains.value);
            }
            
            this.m_DebugLog.Write("Webmail-Prefs-Domains : LoadWebmailDomains - END"); 
            return aszDomains.value;
        }
        catch(e)
        {
            this.m_DebugLog.DebugDump("Webmail-Prefs-Domains : Exception in LoadWebmailDomains : " 
                                                     + e.name 
                                                     + ".\nError message: " 
                                                     + e.message);
        }
    },
    
    
    addDomainsListItems : function (aszDomains)
    {
        try
        {
            this.m_DebugLog.Write("Webmail-Prefs-Domains : AddListItems - START");
            
            if (aszDomains.length > 0) 
            {
                aszDomains = aszDomains.sort()
                var list = document.getElementById("listView");
                
                for(i =0 ; i< aszDomains.length; i++)
                {
                    var newItem = document.createElement("listitem");  
                    newItem.setAttribute("label", aszDomains[i]);
                   	list.appendChild(newItem);
                }
            }
            else
            {
                this.m_DebugLog.Write("Webmail-Prefs-Domains : AddListItems - Domains = 0");
            }
                      
            this.m_DebugLog.Write("Webmail-Prefs-Domains : AddListItems - END"); 
        }
        catch(e)
        {
            this.m_DebugLog.DebugDump("Webmail-Prefs-Domains : Exception in AddListItems : " 
                                           + e.name + 
                                           ".\nError message: " 
                                           + e.message);
        }
    }, 
};
