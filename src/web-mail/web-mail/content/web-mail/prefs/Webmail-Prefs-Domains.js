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
            DomainManager.getAllDomains(iCount, aszDomains);

            this.m_DebugLog.Write("Webmail-Prefs-Domains : LoadWebmailDomains - END");
            return aszDomains.value;
        }
        catch(e)
        {
            this.m_DebugLog.DebugDump("Webmail-Prefs-Domains : Exception in LoadWebmailDomains : "
                                                     + e.name
                                                     + ".\nError message: "
                                                     + e.message + "\n" +
                                                     e.lineNumber);
        }
    },


    addDomainsListItems : function (aszDomains)
    {
        try
        {
            this.m_DebugLog.Write("Webmail-Prefs-Domains : AddListItems - START");

            if (aszDomains.length > 0)
            {
                var tree = document.getElementById("domainTree");
                var mainTreeChildren = document.createElement("treechildren");

                var strbundle=document.getElementById("stringsWebmailPrefs-Domains");
                var szYes=strbundle.getString("Yes");
                var szNo=strbundle.getString("No");

                for(i =0 ; i< aszDomains.length; i++)
                {
                    var newDomainItem = document.createElement("treeitem");
                    var newTreeRow = document.createElement("treerow");

                    var treecellDomain = document.createElement("treecell");
                    treecellDomain.setAttribute("label",aszDomains[i].szDomain);
                    treecellDomain.setAttribute("properties","DomainImage");
                    newTreeRow.appendChild(treecellDomain);

                    var treecellPOP = document.createElement("treecell");
                    if (aszDomains[i].bPOP)
                    {
                        treecellPOP.setAttribute("properties","check");
                        treecellPOP.setAttribute("label",szYes);
                    }
                    else
                    {
                        treecellPOP.setAttribute("properties","cross");
                        treecellPOP.setAttribute("label",szNo);
                    }
                    newTreeRow.appendChild(treecellPOP);

                    var treecellSMTP = document.createElement("treecell");
                    if (aszDomains[i].bSMTP)
                    {
                        treecellSMTP.setAttribute("properties","check");
                        treecellSMTP.setAttribute("label",szYes);
                    }
                    else
                    {
                        treecellSMTP.setAttribute("properties","cross");
                        treecellSMTP.setAttribute("label",szNo);
                    }
                    newTreeRow.appendChild(treecellSMTP);

                    var treecellIMAP = document.createElement("treecell");
                    if (aszDomains[i].bIMAP)
                    {
                        treecellIMAP.setAttribute("properties","check");
                        treecellIMAP.setAttribute("label",szYes);
                    }
                    else
                    {
                        treecellIMAP.setAttribute("properties","cross");
                        treecellIMAP.setAttribute("label",szNo);
                    }
                    newTreeRow.appendChild(treecellIMAP);

                    newDomainItem.appendChild(newTreeRow);
                    mainTreeChildren.appendChild(newDomainItem);
                }

                tree.appendChild(mainTreeChildren);
            }

            this.m_DebugLog.Write("Webmail-Prefs-Domains : AddListItems - END");
        }
        catch(e)
        {
            this.m_DebugLog.DebugDump("Webmail-Prefs-Domains : Exception in AddListItems : "
                                           + e.name +
                                           ".\nError message: "
                                           + e.message+ "\n" +
                                             e.lineNumber);
        }
    },
};
