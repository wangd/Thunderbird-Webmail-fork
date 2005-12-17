var gHttpMailDomains = 
{
    m_DebugLog : null,
    m_tree  :  null,
    m_mainTreeChildren : null,
    m_strbundle : null,
    m_UriManager : null,
    m_DomainManager : null,
    m_aOpenContainer : new Array(),
    m_szSelectedContainer : null,
    m_szSelectedDomain : null,
    m_strbundle : null,
    m_iCount : 0,
    
   
    init: function ()
    {
        try
        {
            this.m_DebugLog = new DebugLog("webmail.logging.comms", 
                                           "{3c8e8390-2cf6-11d9-9669-0800200c9a66}",
                                           "webdavPrefs");
                                       
            this.m_DebugLog.Write("Webmail-Prefs-Domains : init - START");
            
            this.m_tree = document.getElementById("domainTree");
            this.m_mainTreeChildren = document.createElement("treechildren");
             
            this.m_strbundle =document.getElementById("stringsHttpMailPrefs-Domains"); 
            
            this.m_UriManager = Components.classes["@mozilla.org/UriManager;1"].getService();
            this.m_UriManager.QueryInterface(Components.interfaces.nsIUriManager);   
             
            this.m_DomainManager = Components.classes["@mozilla.org/DomainManager;1"].getService();
            this.m_DomainManager.QueryInterface(Components.interfaces.nsIDomainManager); 
               
            this.update();
                            
            this.m_DebugLog.Write("Webmail-Prefs-Domains : init - END");
        }
        catch(err)
        {
            DebugDump("Webmail-Prefs-Domains : Exception in init : " 
                                           + err.name + 
                                           ".\nError message: " 
                                           + err.message + "\n"
                                           + err.lineNumber);
        }
    }, 
    
    
    update : function ()
    {
        try
        {
            this.m_DebugLog.Write("Webmail-Prefs-Domains : update - START");
            
            var iRow = 0;
            var iParentSelect = 0;
            var iSelectDomain = -1;
            var iCount = {value : null};
            var aUri = {value : null};
            this.m_UriManager.getAllUri(iCount, aUri);
            this.m_DebugLog.Write("Webmail-Prefs-Domains : update - uri -  count "+iCount.value +" " + aUri.value);
            this.m_iCount = iCount.value;
            
            if (this.m_iCount==0)
            {
                this.enableRemove(false);
                
                var newTreeCell = document.createElement("treecell");     
                var szNoDomain=this.m_strbundle.getString("domainNotFound");           
                newTreeCell.setAttribute("label",szNoDomain); 
                newTreeCell.setAttribute("properties","noDomainImage");

                var newTreeRow = document.createElement("treerow");
                newTreeRow.appendChild(newTreeCell);
               	
               	var newTreeItem = document.createElement("treeitem"); 
                newTreeItem.appendChild(newTreeRow);
                
                this.m_mainTreeChildren.appendChild(newTreeItem);
            }
            else
            {
                this.enableRemove(true);
                
                var aszUri = aUri.value;
                for (i=0; i<aszUri.length; i++)
                {
                    this.m_DebugLog.Write("Webmail-Prefs-Domains : update - uri "+ aszUri);
                    var newUriItem = document.createElement("treeitem"); 
                    
                    var bFound = false;
                    for (j=0 ; j<this.m_aOpenContainer.length; j++)
                    {
                        var regExp = new RegExp(aszUri[i],"i");
                        this.m_DebugLog.Write("Webmail-Prefs-Domains : update - regExp "+ regExp);
                        
                        if (this.m_aOpenContainer[j].search(regExp)!=-1) 
                        {
                            this.m_DebugLog.Write("Webmail-Prefs-Domains : update - Found ");
                            bFound = true;
                        }
                    }

                    newUriItem.setAttribute("container","true");  
                    newUriItem.setAttribute("open",bFound);  

                    
                    var newUriCell = document.createElement("treecell"); 
                    newUriCell.setAttribute("label",aszUri[i]); 
                    newUriCell.setAttribute("properties","DomainImage");
                    
                    if (this.m_szSelectedContainer)
                    {
                        var regExp = new RegExp(aszUri[i],"i");
                        if (this.m_szSelectedContainer.search(regExp)!=-1)
                        {
                            iParentSelect = iRow;
                            this.m_DebugLog.Write("Webmail-Prefs-Domains : update - iParentSelect "+iParentSelect);
                        }    
                    }
                    
                    var newUriRow = document.createElement("treerow"); 
                    newUriRow.appendChild(newUriCell);
                    newUriItem.appendChild(newUriRow);
                    iRow++;
                    
                    var iCount = {value : null};
                    var aDomain = {value : null};
                    this.m_UriManager.getDomains(aszUri[i],iCount, aDomain);
                    this.m_DebugLog.Write("Webmail-Prefs-Domains : update - domain - count "+iCount.value +" " + aDomain.value);
                    
                    var newUriChildren = document.createElement("treechildren"); 
                   
                    var aszDomain = aDomain.value;
                    for (j=0; j<aszDomain.length; j++)
                    {
                        var newDomainCell = document.createElement("treecell"); 
                        newDomainCell.setAttribute("label",aszDomain[j]); 
                        newDomainCell.setAttribute("properties","PersonImage");
                        
                        if (this.m_szSelectedDomain)
                        {
                            var regExp = new RegExp(aszDomain[j],"i");
                            if (this.m_szSelectedDomain.search(regExp)!=-1)
                            {
                                iSelectDomain = iRow;
                                this.m_DebugLog.Write("Webmail-Prefs-Domains : update - iSelect "+iSelectDomain);
                            }       
                        }
                        
                        var newDomainRow = document.createElement("treerow");
                        newDomainRow.appendChild(newDomainCell);
                       	
                       	var newDomainItem = document.createElement("treeitem"); 
                        newDomainItem.appendChild(newDomainRow);
                        newUriChildren.appendChild(newDomainItem);
                        if (bFound) iRow++;
                    }
                    
                    newUriItem.appendChild(newUriChildren);
                    this.m_mainTreeChildren.appendChild(newUriItem);
                }
            }
        
            this.m_tree.appendChild(this.m_mainTreeChildren);
           
            if (iSelectDomain!=-1)
            {
                this.m_tree.view.selection.select(iSelectDomain);
                this.m_DebugLog.Write("Webmail-Prefs-Domains : update - selecting domain");
            }
            else
            { 
                this.m_tree.view.selection.select(iParentSelect);
                this.m_DebugLog.Write("Webmail-Prefs-Domains : update - selecting uri");
            }
            
            this.m_DebugLog.Write("Webmail-Prefs-Domains : update - END");
        }
        catch(err)
        {
            this.m_DebugLog.DebugDump("Webmail-Prefs-Domains : Exception in update : " 
                                           + err.name + 
                                           ".\nError message: " 
                                           + err.message + "\n"
                                           + err.lineNumber);
        }
    }, 
    
    
    
    add : function (bFill)
    {
        this.m_DebugLog.Write("Webmail-Prefs-Domains : add - START");
        var szUri = null;
        
        if (bFill)
        {
            var iSelection = this.m_tree.view.selection.currentIndex;
            this.m_DebugLog.Write("Webmail-Prefs-Domains : add - row "+iSelection );
            if (iSelection == -1)return;
            
            var col = this.m_tree.columns["domain"];
            this.m_DebugLog.Write("Webmail-Prefs-Domains : add - col "+ col);
            
            var szLabel = this.m_tree.view.getCellText(iSelection,col);
            var bContainer = this.m_tree.view.isContainer(iSelection)
            this.m_DebugLog.Write("Webmail-Prefs-Domains : add - label "+ szLabel + " uri " + bContainer);
          
            if (this.m_iCount>0)
            {
                if(bContainer)
                {
                    szUri = szLabel;
                }
                else
                {
                    var iParent = this.m_tree.view.getParentIndex(iSelection);          
                    szUri = this.m_tree.view.getCellText(iParent,col);
                    this.m_DebugLog.Write("Webmail-Prefs-Domains : add - uri "+ szUri + " parent " + iParent);
                }   
            }
        }
        
        var oResult = {value : null};
        window.openDialog("chrome://httpmail/content/HttpMail-Add.xul",
                          "Add",
                          "chrome, centerscreen, modal",
                          false,szUri, null, oResult);  
                        
        this.m_DebugLog.Write("Webmail-Prefs-Domains : add - result "+ oResult.value);
        if (oResult.value)
        {
            this.treeSelect();
            this.treeStatus();
            this.treeClear(); 
            this.update();  
        }
    
        this.m_DebugLog.Write("Webmail-Prefs-Domains : add - END"); 
    },
    
    
    
    
    edit : function ()
    {
        this.m_DebugLog.Write("Webmail-Prefs-Domains : edit - START");
        
        var iSelection = this.m_tree.view.selection.currentIndex;
        this.m_DebugLog.Write("Webmail-Prefs-Domains : edit - row "+iSelection );
        if (iSelection == -1)return;
        
        var col = this.m_tree.columns["domain"];
        this.m_DebugLog.Write("Webmail-Prefs-Domains : edit - col "+ col);
        
        var szUri = null;
        var szDomain = null;
        var szLabel = this.m_tree.view.getCellText(iSelection,col);
        var bContainer = this.m_tree.view.isContainer(iSelection)
        this.m_DebugLog.Write("Webmail-Prefs-Domains : edit - label "+ szLabel + " uri " + bContainer);
        if(bContainer)
        {
            szUri = szLabel;
        }
        else
        {
            var iParent = this.m_tree.view.getParentIndex(iSelection);          
            var szUri = this.m_tree.view.getCellText(iParent,col);
            this.m_DebugLog.Write("Webmail-Prefs-Domains : edit - uri "+ szUri + " parent " + iParent);
            szDomain = szLabel;   
        }   

        var oResult = {value : null};
        window.openDialog("chrome://httpmail/content/HttpMail-Add.xul",
                          "Edit",
                          "chrome, centerscreen, modal",
                          true,szUri, szDomain, oResult);  
                        
        this.m_DebugLog.Write("Webmail-Prefs-Domains : edit - result "+ oResult.value);
        if (oResult.value)
        {
            this.treeSelect();
            this.treeStatus();
            this.treeClear(); 
            this.update();  
        }
    
        this.m_DebugLog.Write("Webmail-Prefs-Domains : edit - END"); 
    },
    
    
    
    
    remove : function ()
    {
        try
        {
            this.m_DebugLog.Write("Webmail-Prefs-Domains : remove - END");
            
            var iSelection = this.m_tree.view.selection.currentIndex;
            this.m_DebugLog.Write("Webmail-Prefs-Domains : remove - row "+iSelection );
            if (iSelection == -1)return;
            
            var col = this.m_tree.columns["domain"];
            this.m_DebugLog.Write("Webmail-Prefs-Domains : remove - col "+ col);
            
            var szLabel = this.m_tree.view.getCellText(iSelection,col);
            var bContainer = this.m_tree.view.isContainer(iSelection)
            this.m_DebugLog.Write("Webmail-Prefs-Domains : remove - label "+ szLabel + " uri " + bContainer);
            
            var promptService = Components.classes["@mozilla.org/embedcomp/prompt-service;1"].getService();
            promptService.QueryInterface(Components.interfaces.nsIPromptService);
            
            var flags = promptService.BUTTON_TITLE_YES * promptService.BUTTON_POS_0 +
                        promptService.BUTTON_TITLE_NO * promptService.BUTTON_POS_1;
            var check = {value: false};
            
            var szTitle = this.m_strbundle.getString("removeTitle");
            var szText = null;
            if (bContainer)
                szText = this.m_strbundle.getString("removeUri");
            else
                szText = this.m_strbundle.getString("removeDomains"); 
            
            szText= szText.replace(/%S1/i, szLabel);
                                   
            button = promptService.confirmEx(window, szTitle, szText, flags, null, null,null, null, check);
            
            if (button == 0) //Yes
            {
                if (bContainer) 
                {
                    var iCount = {value : null};
                    var aDomain = {value : null};
                    this.m_UriManager.getDomains(szLabel,iCount, aDomain);
                    this.m_DebugLog.Write("Webmail-Prefs-Domains : update - remove - count "+iCount.value +" " + aDomain.value);
 
                    for (i=0; i< aDomain.value.length; i++)
                    {
                        this.m_DomainManager.removeDomainForProtocol(aDomain.value[i],"pop");  
                        this.m_DomainManager.removeDomainForProtocol(aDomain.value[i],"smtp");
                    }
                    
                    this.m_UriManager.deleteUri(szLabel);
                }
                else
                {
                    this.m_UriManager.deleteDomain(szLabel); 
                    this.m_DomainManager.removeDomainForProtocol(szLabel,"pop");  
                    this.m_DomainManager.removeDomainForProtocol(szLabel,"smtp");
                }
                    
                this.treeSelect()
                this.treeStatus();
                this.treeClear(); 
                this.update();  
            }
            this.m_DebugLog.Write("Webmail-Prefs-Domains : remove - END");
        }
        catch(err)
        {
            this.m_DebugLog.DebugDump("Webmail-Prefs-Domains : Exception in remove : " 
                                           + err.name + 
                                           ".\nError message: " 
                                           + err.message + "\n"
                                           + err.lineNumber);
        }
    },
    
    
    
    ondbclick : function ()
    {
        try
        {
            this.m_DebugLog.Write("Webmail-Prefs-Domains : ondbclick - START");
                           
            if (this.m_iCount==0)
                this.add(true);    
            else 
            {
                var iSelection = this.m_tree.view.selection.currentIndex;        
                var bContainer = this.m_tree.view.isContainer(iSelection);
                this.m_DebugLog.Write("Webmail-Prefs-Domains : ondbclick - bContainer "+ bContainer);  
                
                if (!bContainer)
                    this.edit();
                else
                    this.add(true);
            }
                
            this.m_DebugLog.Write("Webmail-Prefs-Domains : ondbclick - END");
        }
        catch(err)
        {
            this.m_DebugLog.DebugDump("Webmail-Prefs-Domains : Exception in ondbclick : " 
                                           + err.name + 
                                           ".\nError message: " 
                                           + err.message + "\n"
                                           + err.lineNumber);
        }   
    },
    
    
    
    contextMenu : function ()
    {
        try
        {
            this.m_DebugLog.Write("Webmail-Prefs-Domains : contextMenu - START");
            
            if (this.m_iCount!=0)
            {
                document.getElementById("cmRemove").setAttribute("disabled",false); 
                
                var iSelection = this.m_tree.view.selection.currentIndex;        
                var bContainer = this.m_tree.view.isContainer(iSelection);
                this.m_DebugLog.Write("Webmail-Prefs-Domains : contextMenu - bContainer "+ bContainer);  
                
                if (!bContainer)
                    document.getElementById("cmEdit").setAttribute("disabled",false); 
                else
                    document.getElementById("cmEdit").setAttribute("disabled",true);
            }
            else
            {
                document.getElementById("cmRemove").setAttribute("disabled",true);
                document.getElementById("cmEdit").setAttribute("disabled",true); 
            }     
            this.m_DebugLog.Write("Webmail-Prefs-Domains : contextMenu - END");
            return true;
        }
        catch(err)
        {
             this.m_DebugLog.DebugDump("Webmail-Prefs-Domains : Exception in contextMenu : " 
                                           + err.name + 
                                           ".\nError message: " 
                                           + err.message + "\n"
                                           + err.lineNumber);
        }
    }, 
    
    
    
    enableRemove : function (bState)
    {
        document.getElementById("remove").setAttribute("disabled",bState); 
        document.getElementById("edit").setAttribute("disabled",bState); 
    },
    
        
    onSelect : function ()
    {
        try
        {
            this.m_DebugLog.Write("Webmail-Prefs-Domains : onSelect - START");
             
            if (this.m_iCount!=0)
            {
                document.getElementById("remove").setAttribute("disabled",false);
                 
                var iSelection = this.m_tree.view.selection.currentIndex;   
                this.m_DebugLog.Write("Webmail-Prefs-Domains : onSelect - iSelection "+ iSelection); 
                if (iSelection==-1) return;
                
                var bContainer = this.m_tree.view.isContainer(iSelection);
                this.m_DebugLog.Write("Webmail-Prefs-Domains : onSelect - bContainer "+ bContainer);  
                
                if (!bContainer)
                    document.getElementById("edit").setAttribute("disabled",false); 
                else
                    document.getElementById("edit").setAttribute("disabled",true); 
            }
            else
            {
                document.getElementById("remove").setAttribute("disabled",true);
                document.getElementById("edit").setAttribute("disabled",true); 
            }     
            this.m_DebugLog.Write("Webmail-Prefs-Domains : onSelect - END");
        }
        catch(err)
        {
            this.m_DebugLog.DebugDump("Webmail-Prefs-Domains : Exception in onSelect : " 
                                           + err.name + 
                                           ".\nError message: " 
                                           + err.message + "\n"
                                           + err.lineNumber);
        }
    },
    
    treeClear : function ()
    {
        try
        {
            this.m_DebugLog.Write("Webmail-Prefs-Domains : treeClear - START");
            
            var iCount = this.m_tree.view.rowCount;
            this.m_DebugLog.Write("Webmail-Prefs-Domains : treeClear - " + iCount);
            
            var listNodes = this.m_mainTreeChildren.childNodes;
            for (i=0; i< listNodes.length+1; i++)
            {
                this.m_mainTreeChildren.removeChild(listNodes.item(0)); 

            }
            this.m_tree.treeBoxObject.invalidate(); 
            
            this.m_DebugLog.Write("Webmail-Prefs-Domains : treeClear - END");
        }
        catch(err)
        {
            this.m_DebugLog.DebugDump("Webmail-Prefs-Domains : Exception in treeClear : " 
                                           + err.name + 
                                           ".\nError message: " 
                                           + err.message + "\n"
                                           + err.lineNumber);
        }
    },
    
    
    treeSelect : function ()
    {
        try
        {
            this.m_DebugLog.Write("Webmail-Prefs-Domains : treeSelect - START");
            
            this.m_szSelectedContainer = null;
            this.m_szSelectedDomain = null;
                       
            var iSelection = this.m_tree.view.selection.currentIndex;
            this.m_DebugLog.Write("Webmail-Prefs-Domains : treeSelect - row "+iSelection );
            if (iSelection == -1)return;
            
            var col = this.m_tree.columns["domain"];
            this.m_DebugLog.Write("Webmail-Prefs-Domains : treeSelect - col "+ col);
            
            var szLabel = this.m_tree.view.getCellText(iSelection,col);
            this.m_DebugLog.Write("Webmail-Prefs-Domains : treeSelect - szLabel "+ szLabel);   
            
            var bContainer = this.m_tree.view.isContainer(iSelection);
            this.m_DebugLog.Write("Webmail-Prefs-Domains : treeSelect - bContainer "+ bContainer); 
            
            this.m_szSelectedContainer = szLabel;

            if (!bContainer) 
            {
                var iParent = this.m_tree.view.getParentIndex(iSelection);
                this.m_DebugLog.Write("Webmail-Prefs-Domains : treeSelect - iParent "+ iParent);  

                if (iParent !=-1)
                {
                    var szParent = this.m_tree.view.getCellText(iParent,col);
                    this.m_DebugLog.Write("Webmail-Prefs-Domains : treeSelect - szParent "+ szParent);   
                    this.m_szSelectedContainer = szParent;                
                }
            }   
             
            this.m_DebugLog.Write("Webmail-Prefs-Domains : treeSelect - END");
        }
        catch(err)
        {
            this.m_DebugLog.DebugDump("Webmail-Prefs-Domains : Exception in treeSelect : " 
                                           + err.name + 
                                           ".\nError message: " 
                                           + err.message + "\n"
                                           + err.lineNumber);
        }
    },
    
    
    treeStatus : function ()
    {
        try
        {
            this.m_DebugLog.Write("Webmail-Prefs-Domains : treeStatus - START");
            
            delete this.m_aOpenContainer;
            this.m_aOpenContainer = new Array();
            
            var iCount = this.m_tree.view.rowCount;
            this.m_DebugLog.Write("Webmail-Prefs-Domains : treeStatus - rowcount" + iCount);
             
            var col = this.m_tree.columns["domain"];
            this.m_DebugLog.Write("Webmail-Prefs-Domains : treeStatus - col "+ col);    
            
            for (i=0; i< iCount; i++)
            {
                var bContainer = this.m_tree.view.isContainer(i); 
                this.m_DebugLog.Write("Webmail-Prefs-Domains : treeStatus - bContainer "+ bContainer);    
               
                if (bContainer)
                {
                    var bOpen = this.m_tree.view.isContainerOpen(i);
                    this.m_DebugLog.Write("Webmail-Prefs-Domains : treeStatus - bOpen "+ bOpen);    
                    
                    if (bOpen)
                    {
                        var szValue = this.m_tree.view.getCellText(i,col);
                        this.m_DebugLog.Write("Webmail-Prefs-Domains : treeStatus - szValue "+ szValue);    
                        this.m_aOpenContainer.push(szValue);
                    }
                }
                        

            }
            this.m_DebugLog.Write("Webmail-Prefs-Domains : treeStatus - END");
        }
        catch(err)
        {
            this.m_DebugLog.DebugDump("Webmail-Prefs-Domains : Exception in treeStatus : " 
                                           + err.name + 
                                           ".\nError message: " 
                                           + err.message + "\n"
                                           + err.lineNumber);
        } 
    },
};
