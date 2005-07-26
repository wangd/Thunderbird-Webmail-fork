var gDomainsPane = 
{
    m_DebugLog : null,
    m_tree  :  null,
    m_mainTreeChildren : null,
    m_strbundle : null,
    
   
    init: function ()
    {
    
        this.m_DebugLog = new DebugLog("webmail.logging.comms", 
                                       "{3c8e8390-2cf6-11d9-9669-0800200c9a66}",
                                       "webmailPrefs");
                                   
        this.m_DebugLog.Write("Webmail-Prefs-Domains : init - START");
        
        this.m_strbundle =document.getElementById("stringsWebmailPrefs-Domains");
               
        var szPOP=this.m_strbundle.getString("POP");
        var aszDomains = this.loadWebmailDomains("pop");
        this.addDomainsListItems(szPOP,aszDomains);
        
        var szSMTP=this.m_strbundle.getString("SMTP");
        aszDomains = this.loadWebmailDomains("smtp");
        this.addDomainsListItems(szSMTP,aszDomains);
        
        var szIMAP=this.m_strbundle.getString("IMAP");
        aszDomains = this.loadWebmailDomains("imap");
        this.addDomainsListItems(szIMAP,aszDomains);
        
        this.m_DebugLog.Write("Webmail-Prefs-Domains : init - END");
    },
    
    
    
    loadWebmailDomains : function (szProtocol)
    {
        try
        {
            this.m_DebugLog.Write("Webmail-Prefs-Domains : LoadWebmailDomains - START");
           
            var DomainManager = Components.classes["@mozilla.org/DomainManager;1"].
                                           getService().
                                           QueryInterface(Components.interfaces.nsIDomainManager);
            
            var aszDomains = {value : null};
            var iCount = {value : null }; 
            if (DomainManager.getAllDomainsForProtocol(szProtocol, iCount, aszDomains))
            {
                this.m_DebugLog.Write("Webmail-Prefs-Domains : LoadWebmailDomains "
                                                + szProtocol
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
    
    
    addDomainsListItems : function (szProtocol,aszDomains)
    {
        try
        {
            this.m_DebugLog.Write("Webmail-Prefs-Domains : AddListItems - START");
            
            if (!this.m_tree) 
                this.m_tree = document.getElementById("domainTree");
            if (!this.m_mainTreeChildren) 
                this.m_mainTreeChildren = document.createElement("treechildren");
           
            var newDomainItem = document.createElement("treeitem"); 
            newDomainItem.setAttribute("container","true");  
            newDomainItem.setAttribute("open","false");  
    
            var newTreeRow = document.createElement("treerow"); 
            var newTreeCell = document.createElement("treecell"); 
            newTreeCell.setAttribute("label",szProtocol);
            
            if (szProtocol.search(/pop/i)!=-1 )//pop
            {
                newTreeCell.setAttribute("properties","POPImage");
            }
            else if (szProtocol.search(/smtp/i)!=-1)//smtp
            {
                newTreeCell.setAttribute("properties","SMTPImage");
            }
            else //imap
            {
                newTreeCell.setAttribute("properties","IMAPImage");
            }
            
            newTreeRow.appendChild(newTreeCell);
            newDomainItem.appendChild(newTreeRow);
            
            var newTreeChildren = document.createElement("treechildren"); 
            
            if (aszDomains.length > 0) 
            {
                aszDomains = aszDomains.sort();
                for(i =0 ; i< aszDomains.length; i++)
                {
                    var newTreeCell = document.createElement("treecell"); 
                    newTreeCell.setAttribute("label",aszDomains[i]); 
                    newTreeCell.setAttribute("properties","DomainImage");
                    
                    var newTreeRow = document.createElement("treerow");
                    newTreeRow.appendChild(newTreeCell);
                   	
                   	var newTreeItem = document.createElement("treeitem"); 
                    newTreeItem.appendChild(newTreeRow);
                    
                    newTreeChildren.appendChild(newTreeItem);
                }
            }
            else
            {
                this.m_DebugLog.Write("Webmail-Prefs-Domains : AddListItems - Domains = 0");
                var newTreeCell = document.createElement("treecell"); 
                
                var szNoDomain=this.m_strbundle.getString("NoDomain");
                newTreeCell.setAttribute("label",szNoDomain); 
                newTreeCell.setAttribute("properties","noDomainImage");
                
                var newTreeRow = document.createElement("treerow");
                newTreeRow.appendChild(newTreeCell);
               	
               	var newTreeItem = document.createElement("treeitem"); 
                newTreeItem.appendChild(newTreeRow);
                
                newTreeChildren.appendChild(newTreeItem);
            }
            
            newDomainItem.appendChild(newTreeChildren);
            this.m_mainTreeChildren.appendChild(newDomainItem);
            this.m_tree.appendChild(this.m_mainTreeChildren);
                       
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
