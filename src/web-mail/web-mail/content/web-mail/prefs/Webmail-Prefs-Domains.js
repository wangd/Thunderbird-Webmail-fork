function Startup()
{
    try
    {
        parent.gWebmailLog.Write("Webmail: Webmail-Prefs-Domains.js : Startup - START");
        
        AddDomainsListItems(LoadWebmailDomains());
         
        parent.gWebmailLog.Write("Webmail: Webmail-Prefs-Domains.js : Startup - END");
    }
    catch(e)
    {
        parent.gWebmailLog.DebugDump("Webmail: Webmail-Prefs-Domains.js : Exception in Startup : " 
                                     + e.name + 
                                     ".\nError message: " 
                                     + e.message);
    }
}


function LoadWebmailDomains()
{
    try
    {
        parent.gWebmailLog.Write("Webmail: Webmail-Prefs-Domains.js : LoadWebmailDomains - START");
       
        var DomainManager = Components.classes["@mozilla.org/DomainManager;1"].
                                            getService().
                                            QueryInterface(Components.interfaces.nsIDomainManager);
        
        var aszDomains = {value : null};
        var iCount = {value : null }; 
        if (DomainManager.getAllDomains(iCount, aszDomains))
        {
            parent.gWebmailLog.Write("Webmail: Webmail-Prefs-Domains.js : LoadWebmailDomains "
                                            + iCount.value +"\n"
                                            + aszDomains.value);
        }
        
        parent.gWebmailLog.Write("Webmail: Webmail-Prefs-Domains.js : LoadWebmailDomains - END"); 
        return aszDomains.value;
    }
    catch(e)
    {
        parent.gWebmailLog.DebugDump("Webmail: Webmail-Prefs-Domains.js : Exception in LoadWebmailDomains : " 
                                                 + e.name 
                                                 + ".\nError message: " 
                                                 + e.message);
    }
   
}



function AddDomainsListItems(Domains)
{
    try
    {
        parent.gWebmailLog.Write("Webmail: Webmail-Prefs-Domains.js : AddListItems - START");
        parent.gWebmailLog.Write("Webmail: Webmail-Prefs-Domains.js : AddListItems " + Domains);
        
        if (Domains.length > 0) 
        {
            var list = document.getElementById("listView");
            
            for(i =0 ; i< Domains.length; i++)
            {
                var newItem = document.createElement("listitem");  
                newItem.setAttribute("label", Domains[i]);
               	list.appendChild(newItem);
            }
        }
        else
        {
            parent.gWebmailLog.Write("Webmail: Webmail-Prefs-Domains.js : AddListItems - Domains = 0");
        }
                  
        parent.gWebmailLog.Write("Webmail: Webmail-Prefs-Domains.js : AddListItems - END"); 
    }
    catch(e)
    {
         parent.gWebmailLog.DebugDump("Webmail: Webmail-Prefs-Domains.js : Exception in AddListItems : " 
                                       + e.name + 
                                       ".\nError message: " 
                                       + e.message);
    }
}
