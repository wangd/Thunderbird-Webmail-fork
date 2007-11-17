var gYahooDomain = 
{
    m_DebugLog : new DebugLog("webmail.logging.comms","", "YahooPrefs"),
    m_DomainManager : null,
    m_cExtGUID : "{d7103710-6112-11d9-9669-0800200c9a66}",
    m_strBundle : null,
                                  
    init : function ()
    {
        try
        {
            this.m_DebugLog.Write("Yahoo-Prefs-Domains : Init - START");
            
            this.m_strBundle = document.getElementById("stringsYahooDomainWindow");
            
            this.m_DomainManager = Components.classes["@mozilla.org/DomainManager;1"]
                                             .getService()
                                             .QueryInterface(Components.interfaces.nsIDomainManager);

            var aDomains = {value : null};
            var iCount = {value : null }; 
            if (this.m_DomainManager.getDomainForExtension(this.m_cExtGUID,iCount,aDomains))
            {
                if (aDomains.value.length > 0)
                {                    
                    for (var i=0; i<aDomains.value.length; i++)
                    {
                        this.domainList(aDomains.value[i].szDomain, aDomains.value[i].bPOPDefault);
                    }
                }
                else
                    this.errorList();
            }       
            else
                this.errorList();

            this.m_DebugLog.Write("Yahoo-Prefs-Domains : Init - END");
        }
        catch(e)
        {
            this.m_DebugLog.DebugDump("Yahoo-Prefs-Domains : Exception in init : " 
                                          + e.name + 
                                          ".\nError message: " 
                                          + e.message + "\n"
                                          + e.lineNumber);
        }        
    },
    
    
    domainList : function (szDomain, bDefault)
    {
        this.m_DebugLog.Write("Yahoo-Prefs-Domains : domainList - START " +szDomain + " " + bDefault);
        
        var list = document.getElementById("listDomain");
            
        var newItem = document.createElement("richlistitem"); 
        newItem.setAttribute("id", szDomain);
        newItem.setAttribute("class", "listItemDomain");
        newItem.setAttribute("allowEvents", "true");
        newItem.setAttribute("selected","false"); 
        newItem.setAttribute("align", "center");
        newItem.setAttribute("bDefaultDomain", bDefault);
        newItem.setAttribute("disabled",  bDefault);
        
        //image
        var space = document.createElement("spacer")
        space.setAttribute("flex","1");
        var vBoxImage = document.createElement("vbox");
        vBoxImage.setAttribute("id", "boxDomain");
        vBoxImage.appendChild(space);
        var image = document.createElement("image");  
        image.setAttribute("id","yahooImage");
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
         
        list.appendChild(newItem);
               
        this.m_DebugLog.Write("Yahoo-Prefs-Domains : domainList - END");        
    },
    
    
    errorList : function ()
    {
        this.m_DebugLog.Write("Yahoo-Prefs-Domains : errorList - START");   
                              
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
          
        var szMSG = this.m_strBundle.getString("errorMsg");
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
        
        this.m_DebugLog.Write("Yahoo-Prefs-Domains : errorList - END");
    },
     
     
    onSelect : function ()
    {
        try
        {
            this.m_DebugLog.Write("Yahoo-Prefs-Domains : onSelect - START");

            var listView = document.getElementById("listDomain");   //click item
            var iIndex = listView.selectedIndex;
            this.m_DebugLog.Write("Yahoo-Prefs-Domains : onSelect - iIndex "+iIndex);
            
            var item = listView.getItemAtIndex(iIndex);
            var bDefaultDomain = item.getAttribute("bDefaultDomain");
            this.m_DebugLog.Write("Yahoo-Prefs-Domains : onSelect - bDefaultDomain "+bDefaultDomain); 
            iIndex = bDefaultDomain=="true"? -1: iIndex;
            
            var buttonRemove = document.getElementById("remove");   
            buttonRemove.setAttribute("disabled", iIndex!=-1? false : true);
                
            this.m_DebugLog.Write("Yahoo-Prefs-Domains : onSelect - END");
            return true;
        }
        catch(e)
        {
            this.m_DebugLog.DebugDump("Yahoo-Prefs-Domains : Exception in onSelect : " 
                                          + e.name + 
                                          ".\nError message: " 
                                          + e.message + "\n"
                                          + e.lineNumber);
        }
    
    }, 
     
    onAdd : function ()
    {
        try
        {
            this.m_DebugLog.Write("Yahoo-Prefs-Domains : onAdd - START");
            var oResult = {value : -1};
            var oParam = {szDomain : null};
            window.openDialog("chrome://yahoo/content/Yahoo-Prefs-Domains-Add.xul",
                              "Add",
                              "chrome, centerscreen, modal",
                              oParam,
                              oResult);  
        
            this.m_DebugLog.Write("Yahoo-Prefs-Domains: onAdd oResult.value " + oResult.value);
            
            if (oResult.value!=-1)
            {
                this.m_DebugLog.Write("Yahoo-Prefs-Domains : onAdd oParam.szDomain " + oParam.szDomain);
              
                var bFound = false
                var oContentID = new Object();
                if (this.m_DomainManager.getDomainForProtocol(oParam.szDomain, "POP" , oContentID))
                {  //domain found
                   //check contentid
                   if (oContentID.value == "@mozilla.org/YahooPOP;1") bFound = true;
                }
                
                if (bFound == false)  //not found add
                {    //add item to list
                    var bPOP = this.m_DomainManager.newDomainForProtocol(oParam.szDomain, "POP", "@mozilla.org/YahooPOP;1");
                    var bSMTP = this.m_DomainManager.newDomainForProtocol(oParam.szDomain, "SMTP", "@mozilla.org/YahooSMTP;1");
                    if (bPOP || bSMTP);
                    {
                        //remove error message
                        var listView = document.getElementById("listDomain");  
                        var item = listView.getItemAtIndex(0);
                        var szError = item.getAttribute("id");
                        if (szError.search(/error/i)!=-1)
                            listView.removeChild(item);    
                       
                        this.domainList(oParam.szDomain, false);
                    }
                }
                
                var event = document.createEvent("Events");
                event.initEvent("change", false, true);
                document.getElementById("listDomain").dispatchEvent(event);
            }
            this.m_DebugLog.Write("Yahoo-Prefs-Domains : onAdd - END");
        }
        catch(e)
        {
             this.m_DebugLog.DebugDump("Yahoo-Prefs-Domains : Exception in onAdd : " 
                                          + e.name + 
                                          ".\nError message: " 
                                          + e.message + "\n"
                                          + e.lineNumber);
        }
    },
     
     
    onRemove  : function ()
    {        
        try
        {
            this.m_DebugLog.Write("Yahoo-Prefs-Domains : doRemove - START");
            
            //get selected item
            var listView = document.getElementById("listDomain");   //click item
            var iIndex = listView.selectedIndex;
            this.m_DebugLog.Write("Yahoo-Prefs-Domains : doRemove - iIndex "+iIndex);
            
            var item = listView.getItemAtIndex(iIndex);
            var bDefaultDomain = item.getAttribute("bDefaultDomain");
            this.m_DebugLog.Write("Yahoo-Prefs-Domains : onSelect - bDefaultDomain "+bDefaultDomain); 
            if (bDefaultDomain == "false") 
            {
                var szDomain = item.getAttribute("id");
                this.m_DebugLog.Write("Yahoo-Prefs-Domains : doRemove -  " + szDomain);
                
                //check for bad chars
                if (szDomain.search(/[^a-zA-Z0-9\.]+/i) != -1 ||
                szDomain.search(/\s/) != -1 ||
                szDomain.search(/\./) == -1 ||
                szDomain.search(/^\./) != -1 ||
                szDomain.search(/\.$/) != -1) 
                {
                    this.m_Log.Write("nsYahooDomains.js - removeDomain - domain invalid ");
                    return false;
                }
                
                
                //check domain exists
                var oContentID = new Object();
                if (this.m_DomainManager.getDomainForProtocol(szDomain, "POP", oContentID)) 
                { //domain found
                    //check contentid
                    if (oContentID.value == "@mozilla.org/YahooPOP;1") bFound = true;
                }
                
                if (bFound) //remove for display
                {
                    this.m_DomainManager.removeDomainForProtocol(szDomain, "POP");
                    this.m_DomainManager.removeDomainForProtocol(szDomain, "SMTP");
                    
                    this.m_DebugLog.Write("Yahoo-Prefs-Domains : Removeed -  DB");
                    listView.removeChild(item);
                    
                    if (listView.getRowCount() > 0) 
                    {
                        if (iIndex > listView.getRowCount() - 1) listView.selectedIndex = iIndex - 1; //select one above
                        else listView.selectedIndex = iIndex;
                    }
                    else 
                    {
                        document.getElementById("remove").setAttribute("disabled", true);
                        this.errorList();
                    }
                }
                var event = document.createEvent("Events");
                event.initEvent("change", false, true);
                document.getElementById("listDomain").dispatchEvent(event);
            }
            this.m_DebugLog.Write("Yahoo-Prefs-Domains: doRemove - END");
            return true;
        }
        catch(e)
        {
            this.m_DebugLog.DebugDump("Pref-Window : Exception in doRemove : " 
                                          + e.name + 
                                          ".\nError message: " 
                                          + e.message + "\n"
                                          + e.lineNumber);
        }
    },
}
