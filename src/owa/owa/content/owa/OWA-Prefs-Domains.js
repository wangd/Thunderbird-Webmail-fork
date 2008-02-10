var gOWADomains = 
{
    m_DebugLog : null,
    m_strBundle : null,
    m_UriManager : null,
    m_szSelectedDomain : null,
    m_iSelectedIndex : -1,
    
   
    init: function ()
    {
        try
        {
            this.m_DebugLog = new DebugLog("webmail.logging.comms", 
                                           "{3c8e8390-2cf6-11d9-9669-0800200c9a66}",
                                           "OWA Prefs");
                                       
            this.m_DebugLog.Write("OWA-Prefs-Domains : init - START");
            
            this.m_strBundle = document.getElementById("stringsOWAPrefs-Domains");
            
            this.m_UriManager = Components.classes["@mozilla.org/OWADomains;1"]
                                          .getService()
                                          .QueryInterface(Components.interfaces.nsIOWADomains);   
               
            this.updateList();
                            
            this.m_DebugLog.Write("OWA-Prefs-Domains : init - END");
        }
        catch(err)
        {
            DebugDump("OWA-Prefs-Domains : Exception in init : " 
                                           + err.name + 
                                           ".\nError message: " 
                                           + err.message + "\n"
                                           + err.lineNumber);
        }
    }, 
    
  
    
    updateList : function ()
    {
        try
        {
            this.m_DebugLog.Write("OWA-Prefs-Domains : updateList - Start");         
            
            var iCount = {value : null};
            var aDomains = {value : null};            
            if (this.m_UriManager.getAllDomains(iCount, aDomains))
            {
                if (aDomains.value.length > 0)
                {           
                    this.m_DebugLog.Write("OWA-Prefs-Domains : updateList - "+iCount.value +" " + aDomains.value);         
                    for (var i=0; i<aDomains.value.length; i++)
                    {
                        this.domainList(aDomains.value[i]);
                    }
                    var listView = document.getElementById("listDomain");   //click item
                    listView.selectedIndex = this.m_iSelectedIndex;
                }
                else
                    this.errorList();
            }       
            else
                this.errorList();

                            
            this.m_DebugLog.Write("OWA-Prefs-Domains : updateList - END");
        }
        catch(err)
        {
             this.m_DebugLog.DebugDump("OWA-Prefs-Domains : Exception in updateList : " 
                                           + err.name + 
                                           ".\nError message: " 
                                           + err.message + "\n"
                                           + err.lineNumber);   
        }

    },
    
    
    
    clearList : function ()
    {
        try
        {
            this.m_DebugLog.Write("OWA-Prefs-Domains : clearList - START");   
            
            //get selected item
            var listView = document.getElementById("listDomain");   //click item
            var iIndex = listView.selectedIndex;
            this.m_DebugLog.Write("OWA-Prefs-Domains : clearList - iIndex "+iIndex);
            
            if (iIndex != -1)
            {
                var item = listView.getItemAtIndex(iIndex);
                this.m_szSelectedDomain = item.getAttribute("id");
                this.m_DebugLog.Write("OWA-Prefs-Domains : clearList - m_szSelectedDomain  "+this.m_szSelectedDomain ); 
            }
            
            //clear list
            var iCount = listView.getRowCount();
            for (var i=0; i<iCount; i++)
            {
                listView.removeChild(listView.getItemAtIndex(0));
            }
            
            this.m_DebugLog.Write("OWA-Prefs-Domains : clearList - END");  
        }
        catch(err)
        {
             this.m_DebugLog.DebugDump("OWA-Prefs-Domains : Exception in clearList : " 
                                           + err.name + 
                                           ".\nError message: " 
                                           + err.message + "\n"
                                           + err.lineNumber);   
        }
    },
    


    domainList : function (szDomain)
    {
        this.m_DebugLog.Write("OWA-Prefs-Domains : domainList - START " +szDomain);
        
        var list = document.getElementById("listDomain");
            
        var newItem = document.createElement("richlistitem"); 
        newItem.setAttribute("id", szDomain);
        newItem.setAttribute("class", "listItemDomain");
        newItem.setAttribute("allowEvents", "true");
        
        var regExp = new RegExp(this.m_szSelectedDomain);
        if (szDomain.search(regExp) != -1) 
            this.m_iSelectedIndex =  list.getRowCount();
        
        newItem.setAttribute("selected", "false");             
        newItem.setAttribute("align", "center");
        
        //image
        var space = document.createElement("spacer")
        space.setAttribute("flex","1");
        var vBoxImage = document.createElement("vbox");
        vBoxImage.setAttribute("id", "boxDomain");
        vBoxImage.appendChild(space);
        var image = document.createElement("image");  
        image.setAttribute("id","OWAImage");
        vBoxImage.appendChild(image);
        var space1 = document.createElement("spacer")
        space1.setAttribute("flex","1");
        vBoxImage.appendChild(space1);
        newItem.appendChild(vBoxImage);
       
        //labelDomain
        var labelDomain = document.createElement("label");
        labelDomain.setAttribute("value",szDomain); 
        labelDomain.setAttribute("class","domain");
        newItem.appendChild(labelDomain);
        newItem.setAttribute("ondblclick","gOWADomains.onDBclick();");
        
        list.appendChild(newItem);
               
        this.m_DebugLog.Write("OWA-Prefs-Domains : domainList - END");        
    },

    
    
    errorList : function ()
    {
        this.m_DebugLog.Write("OWA-Prefs-Domains : errorList - START");   
                              
        var vBox = document.createElement("vbox");
        vBox.setAttribute("align","center");
        vBox.setAttribute("pack","center");
        vBox.setAttribute("flex","1");

        //image
        var space = document.createElement("spacer")
        space.setAttribute("flex","1");
        vBox.appendChild(space);
        var image = document.createElement("image");  
        image.setAttribute("id","imageError");
        vBox.appendChild(image);
        var space1 = document.createElement("spacer")
        space1.setAttribute("flex","1");
        vBox.appendChild(space1);
          
        var szMSG = this.m_strBundle.getString("domainNotFound");
        var aszMSG = szMSG.split(/\s/);
                   
        //message
        for (var i=0; i<aszMSG.length; i++)
        {
            var labelMSG = document.createElement("label");
            labelMSG.setAttribute("value",aszMSG[i]); 
            labelMSG.setAttribute("class","errorMSG");
            vBox.appendChild(labelMSG);
        }
      
        var newItem = document.createElement("richlistitem"); 
        newItem.setAttribute("id", "error");
        newItem.setAttribute("class", "listError");
        newItem.setAttribute("allowEvents", "false");
        newItem.setAttribute("selected","false"); 
        newItem.setAttribute("align", "center");
        newItem.appendChild(vBox);               
        
        var list = document.getElementById("listDomain");
        list.appendChild(newItem);
        
        this.m_DebugLog.Write("OWA-Prefs-Domains : errorList - END");
    },

    
    
    add : function ()
    {
        try
        {
            this.m_DebugLog.Write("OWA-Prefs-Domains : add - START");
           
            var oResult = {value : null};
            var oData = {szURL : null, szDomain: null};
            
            window.openDialog("chrome://OWA/content/OWA-Prefs-Domains-Add.xul",
                              "Add",
                              "chrome, centerscreen, modal",
                              false,
                              oData,
                              oResult);  
                            
            this.m_DebugLog.Write("OWA-Prefs-Domains : add - result "+ oResult.value);
            if (oResult.value)
            {
                this.m_DebugLog.Write("OWA-Prefs-Domains : add - szDomains "+ oData.szDomain + " " + oData.szURL);
                
                this.m_UriManager.addDomain(oData.szDomain, oData.szURL);      

                this.clearList();
                this.updateList();
              
                var event = document.createEvent("Events");
                event.initEvent("change", false, true);
                document.getElementById("listDomain").dispatchEvent(event);
            }
        
            this.m_DebugLog.Write("OWA-Prefs-Domains : add - END");
        }
        catch(err)
        {
             this.m_DebugLog.DebugDump("OWA-Prefs-Domains : Exception in add : " 
                                           + err.name + 
                                           ".\nError message: " 
                                           + err.message + "\n"
                                           + err.lineNumber);   
        } 
    },
    
    
    
    edit : function ()
    {
        try
        {
            this.m_DebugLog.Write("OWA-Prefs-Domains : edit - START");
            
            var listView = document.getElementById("listDomain");   //click item
            var iIndex = listView.selectedIndex;
            this.m_DebugLog.Write("OWA-Prefs-Domains : edit - iIndex "+iIndex);
            if (iIndex == -1) return;
  
            var item = listView.getItemAtIndex(iIndex);
            var szDomain = item.getAttribute("id");
            this.m_DebugLog.Write("OWA-Prefs-Domains : edit -  " + szDomain);                      
  
            var szURL = this.m_UriManager.getURL(szDomain);
            this.m_DebugLog.Write("OWA-Prefs-Domains : edit -  " + szURL);                       
            
            var oResult = {value : null};
            var oData = {szURL : szURL, szDomain: szDomain};            
            window.openDialog("chrome://OWA/content/OWA-Prefs-Domains-Add.xul",
                              "Edit",
                              "chrome, centerscreen, modal",
                              true,
                              oData,
                              oResult);                         
                            
            this.m_DebugLog.Write("OWA-Prefs-Domains : edit - result "+ oResult.value);
            if (oResult.value)
            {
                this.m_DebugLog.Write("OWA-Prefs-Domains : edit - szDomains "+ oData.szDomain + " " + oData.szURL);
                
                //remove old entry
                this.m_UriManager.removeDomain(szDomain);                

                //add new one
                this.m_UriManager.addDomain(oData.szDomain, oData.szURL);      
                
                this.clearList();
                this.updateList();
              
                var event = document.createEvent("Events");
                event.initEvent("change", false, true);
                document.getElementById("listDomain").dispatchEvent(event);
            }
        
            this.m_DebugLog.Write("OWA-Prefs-Domains : edit - END"); 
        }
        catch(err)
        {
             this.m_DebugLog.DebugDump("OWA-Prefs-Domains : Exception in add : " 
                                           + err.name + 
                                           ".\nError message: " 
                                           + err.message + "\n"
                                           + err.lineNumber);   
        }
    },
    
    
    
    
    remove : function ()
    {
        try
        {
            this.m_DebugLog.Write("OWA-Prefs-Domains : remove - START");
            
            //get selected item
            var listView = document.getElementById("listDomain");   //click item
            var iIndex = listView.selectedIndex;
            this.m_DebugLog.Write("OWA-Prefs-Domains : remove - iIndex "+iIndex);
            if (iIndex == -1) return;
            
            var item = listView.getItemAtIndex(iIndex);
            var szDomain = item.getAttribute("id");
            this.m_DebugLog.Write("OWA-Prefs-Domains : remove -  " + szDomain);
            
            this.m_UriManager.removeDomain(szDomain);                
            
            this.m_DebugLog.Write("OWA-Prefs-Domains : remove -  DB");
            listView.removeChild(item);
            
            if (listView.getRowCount() > 0) 
            {
                if (iIndex > listView.getRowCount() - 1) listView.selectedIndex = iIndex - 1; //select one above
                else listView.selectedIndex = iIndex;
            }
            else 
            {
                document.getElementById("remove").setAttribute("disabled", true);
                document.getElementById("edit").setAttribute("disabled", true);
                this.errorList();
            }

            var event = document.createEvent("Events");
            event.initEvent("change", false, true);
            document.getElementById("listDomain").dispatchEvent(event);

            this.m_DebugLog.Write("Yahoo-Prefs-Domains: remove - END");
            return true;
        }
        catch(err)
        {
            this.m_DebugLog.DebugDump("OWA-Prefs-Domains : Exception in remove : " 
                                           + err.name + 
                                           ".\nError message: " 
                                           + err.message + "\n"
                                           + err.lineNumber);
        }
    },
    
    
    
    onDBclick : function ()
    {
        try
        {
            this.m_DebugLog.Write("OWA-Prefs-Domains : ondbclick - START");
                           
            this.m_iCount==0 ? this.add() : this.edit();

            this.m_DebugLog.Write("OWA-Prefs-Domains : ondbclick - END");
        }
        catch(err)
        {
            this.m_DebugLog.DebugDump("OWA-Prefs-Domains : Exception in ondbclick : " 
                                           + err.name + 
                                           ".\nError message: " 
                                           + err.message + "\n"
                                           + err.lineNumber);
        }   
    },
    
    
                
    onSelect : function ()
    {
        try
        {
            this.m_DebugLog.Write("OWA-Prefs-Domains : onSelect - START");
             
            var listView = document.getElementById("listDomain");   //click item
            var iIndex = listView.selectedIndex;
            this.m_DebugLog.Write("OWA-Prefs-Domains : onSelect - iIndex "+iIndex); 
             
            var buttonRemove = document.getElementById("remove");   
            buttonRemove.setAttribute("disabled", iIndex!=-1? false : true);
            
            var buttonEdit = document.getElementById("edit");   
            buttonEdit.setAttribute("disabled", iIndex!=-1? false : true);
            
            this.m_DebugLog.Write("OWA-Prefs-Domains : onSelect - END");
        }
        catch(err)
        {
            this.m_DebugLog.DebugDump("OWA-Prefs-Domains : Exception in onSelect : " 
                                           + err.name + 
                                           ".\nError message: " 
                                           + err.message + "\n"
                                           + err.lineNumber);
        }
    }
};
