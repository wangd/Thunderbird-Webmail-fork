var gWebDavPane =
{
    m_DebugLog : new DebugLog("webmail.logging.comms", 
                              "{3c8e8390-2cf6-11d9-9669-0800200c9a66}",
                              "hotmailPrefs"),
    m_aWebDavUserList : null,
    m_szIDLastFocused : null,
    m_aUserList : null,
    m_strBundle : null,
    
     
    init : function ()
    {
        this.m_DebugLog.Write("Hotmail-Prefs-WebDav : Init - START");
        
        this.m_strBundle = document.getElementById("stringHotmailMode");                  
        
        this.getUserNameList();
        this.addUserNamesListView();
        
        this.m_DebugLog.Write("Hotmail-Prefs-WebDav : Init - END");        
    },
    
    
    getUserNameList : function ()
    {
        try
        {
            this.m_DebugLog.Write("Hotmail-Prefs-WebDav.js : getUserNameList - START");
            
            this.m_aUserList =  new Array(); 
            var accountManager = Components.classes["@mozilla.org/messenger/account-manager;1"].
                                            getService(Components.interfaces.nsIMsgAccountManager);
        
            var allServers = accountManager.allServers;
            
            for (var i=0; i < allServers.Count(); i++)
            {
                var currentServer = allServers.GetElementAt(i).
                                        QueryInterface(Components.interfaces.nsIMsgIncomingServer);
                
                var szHostName = currentServer.hostName;
                this.m_DebugLog.Write("Hotmail-Prefs-WebDav.js : getUserNameList - szHostName " + szHostName);
                var szRealHostName = currentServer.realHostName;
                this.m_DebugLog.Write("Hotmail-Prefs-WebDav.js : getUserNameList - szRealHostName " + szRealHostName);
                
                if (szHostName.search(/localhost/i)!=-1 || szHostName.search(/127\.0\.0\.1/)!=-1 ||
                        szRealHostName.search(/localhost/i)!=-1 || szRealHostName.search(/127\.0\.0\.1/)!=-1)
                {
                    var szUserName = currentServer.username;
                    this.m_DebugLog.Write("Hotmail-Prefs-WebDav.js : getUserNameList - userName " + szUserName);
                    if (szUserName.search(/@/)==-1) 
                    {
                        szUserName = currentServer.realUsername ;
                        this.m_DebugLog.Write("Hotmail-Prefs-WebDav.js : getUserNameList - realuserName " + szUserName);
                    }
                    
                    if (szUserName.search(/msn/i)!=-1 || szUserName.search(/hotmail/i)!= -1)
                    {
                        this.m_DebugLog.Write("Hotmail-Prefs-WebDav.js : getUserNameList - userName added");
                        var data = new HotmailMode();      
                        data.szAddress = szUserName;
                        data.iMode=0;
                        
                        //check if this is a webdav account
                        if (this.m_aWebDavUserList)
                        {
                            for (j=0; j<this.m_aWebDavUserList.length; j++)
                            {
                                var reg = new RegExp(szUserName,"i");
                                if (this.m_aWebDavUserList[j].szAddress.match(reg))
                                {
                                    data.iMode= this.m_aWebDavUserList[j].iMode;
                                    this.m_DebugLog.Write("Hotmail-Prefs-WebDav.js : getUserNameList - found " + data.iMode);
                                }
                            }
                        }
                                           
                        this.m_aUserList.push(data);   
                    }
                } 
            }
            
            this.m_DebugLog.Write("Hotmail-Prefs-WebDav.js : getUserNameList - END");
            return true;
        }
        catch(err)
        {
            this.m_DebugLog.DebugDump("Hotmail-Prefs-WebDav.js : Exception in getUserNameList : " 
                                       + err.name + 
                                       ".\nError message: " 
                                       + err.message + "\n"
                                       + err.lineNumber);
        }
    },
    
    
    
    addUserNamesListView : function ()
    {
        try
        {
            this.m_DebugLog.Write("Hotmail-Prefs-WebDav.js : AddUserNamesListView - START");
                        
            if (this.m_aUserList.length > 0) 
            {   
                var list = document.getElementById("listView");
                
                for(i =0 ; i< this.m_aUserList.length; i++)
                {
                    var szHotmailUserName = this.m_aUserList[i].szAddress;
                    var iMode = this.m_aUserList[i].iMode;
                    this.m_DebugLog.Write("Hotmail-Prefs-WebDav.js : AddUserNamesListView "+szHotmailUserName+" "+iMode);
                        
                    var newItem = document.createElement("richlistitem"); 
                    newItem.setAttribute("id", szHotmailUserName);
                    newItem.setAttribute("class", "listItem");
                    newItem.setAttribute("tabIndex", i);
                    newItem.setAttribute("allowEvents", "true");
                    newItem.setAttribute("selected","false"); 
                    
                    //image
                    var space = document.createElement("spacer")
                    space.setAttribute("flex","1");
                    var vBoxPerson = document.createElement("vbox");
                    vBoxPerson.setAttribute("id", "boxPerson");
                    vBoxPerson.appendChild(space);
                    var image = document.createElement("image");  
                    image.setAttribute("id","personImage");
                    vBoxPerson.appendChild(image);
                    var space1 = document.createElement("spacer")
                    space1.setAttribute("flex","1");
                    vBoxPerson.appendChild(space1);
                    
                    //user name
                    var label = document.createElement("label");
                    label.setAttribute("value",szHotmailUserName); 
                    label.setAttribute("class","emailAddress");
                    var vBoxDetails = document.createElement("vbox");
                    vBoxDetails.setAttribute("id", "boxDetails");
                    vBoxDetails.setAttribute("class","details"); 
                    vBoxDetails.appendChild(label);
                   
                    //mode 
                    var imageMode = document.createElement("image");  
                    imageMode.setAttribute("id","imageMode");
                    imageMode.setAttribute("class", "mode");
                    imageMode.setAttribute("value", iMode);
                    var hBoxMode = document.createElement("hbox");
                    hBoxMode.setAttribute("id", "boxMode");
                    hBoxMode.setAttribute("align", "center");
                    hBoxMode.appendChild(imageMode); 
                                    
                    var szMode = null;
                    if (iMode ==0) 
                        szMode = this.m_strBundle.getString("ScreenScraper");
                    else if (iMode == 1) 
                        szMode = this.m_strBundle.getString("WebDav");
                    else if (iMode == 2) 
                        szMode = this.m_strBundle.getString("Beta");

                    var labelMode = document.createElement("label");
                    labelMode.setAttribute("id","labelMode"); 
                    labelMode.setAttribute("value",szMode); 
                    hBoxMode.appendChild(labelMode); 
                    vBoxDetails.appendChild(hBoxMode);
                    
                    newItem.appendChild(vBoxPerson);
                    newItem.appendChild(vBoxDetails);
                   
                    list.appendChild(newItem);
                }
            }
           
            this.m_DebugLog.Write("Hotmail-Prefs-WebDav.js : AddUserNamesListView - END");
        }
        catch(err)
        {
            this.m_DebugLog.DebugDump("Hotmail-Prefs-WebDav.js : Exception in AddUserNamesListView : " 
                                       + err.name + 
                                       ".\nError message: " 
                                       + err.message + "\n"
                                       + err.lineNumber);
        }
    },
    
    
    
    
    onDClick : function ()
    {
        try
        {
            this.m_DebugLog.Write("Hotmail-Prefs-WebDav.js : onDClick - START");
            
            //get selected item
            var listView = document.getElementById("listView");   //click item
            var iIndex = listView.selectedIndex
            this.m_DebugLog.Write("Hotmail-Prefs-WebDav : onDClick - iIndex "+iIndex);
          
            var szAddress = this.m_aUserList[iIndex].szAddress;
            var iMode = this.m_aUserList[iIndex].iMode;
            
            var oResult = {value : -1};
            window.openDialog("chrome://hotmail/content/Hotmail-Prefs-Mode-Edit.xul",
                              "Edit",
                              "chrome, centerscreen, modal",
                              szAddress,iMode,oResult);  
                        
            this.m_DebugLog.Write("Hotmail-Prefs-WebDav : onDClick - result "+ oResult.value);
            if (oResult.value!=-1)
            {
                this.m_DebugLog.Write("Hotmail-Prefs-WebDav : onDClick - update");
                
                this.m_aUserList[iIndex].iMode = oResult.value;   
                
                var item  =  listView.selectedItem;
                var aItemChildren = item.childNodes;
                for (i=0; i<aItemChildren.length; i++)
                {
                    var szID = aItemChildren[i].getAttribute("id");
                    this.m_DebugLog.Write("Hotmail-Prefs-WebDav : level 1 szID "+ szID);
                    if (szID.search(/boxDetails/i)!=-1)
                    {
                        var aBoxDetailsChildren = aItemChildren[i].childNodes;
                        for (j=0; j<aBoxDetailsChildren.length; j++)
                        {
                            szID = aBoxDetailsChildren[j].getAttribute("id");
                            this.m_DebugLog.Write("Hotmail-Prefs-WebDav : level 2 szID "+ szID); 
                            if (szID.search(/boxMode/i)!=-1)
                            {   
                                var aBoxModeChildren = aBoxDetailsChildren[j].childNodes;
                                for (k=0; k<aBoxModeChildren.length; k++)
                                {
                                    szID = aBoxModeChildren[k].getAttribute("id");
                                    this.m_DebugLog.Write("Hotmail-Prefs-WebDav : level 3 szID "+ szID); 
                                    
                                    if (szID.search(/imageMode/i)!=-1)
                                    {
                                         aBoxModeChildren[k].setAttribute("value",oResult.value);
                                    }
                                    else if (szID.search(/labelMode/i)!=-1)
                                    {
                                        var szMode = null;
                                        if (oResult.value ==0) 
                                            szMode = this.m_strBundle.getString("ScreenScraper");
                                        else if (oResult.value == 1) 
                                            szMode = this.m_strBundle.getString("WebDav");
                                        else if (oResult.value == 2) 
                                            szMode = this.m_strBundle.getString("Beta");
            
                                        aBoxModeChildren[k].setAttribute("value",szMode);
                                    }
                                }   
                            }
                        }
                    }
                }
            }
            
            var event = document.createEvent("Events");
            event.initEvent("change", false, true);
            document.getElementById("listView").dispatchEvent(event);
            
            this.m_DebugLog.Write("Hotmail-Prefs-WebDav.js : onDClick - END");
            return true;
        }
        catch(e)
        {
             this.m_DebugLog.DebugDump("Hotmail-Prefs-WebDav.js : Exception in onDClick : " 
                                          + e.name + 
                                          ".\nError message: " 
                                          + e.message + "\n"
                                          + e.lineNumber);
        }
    },
    
    
    
    onSelect : function ()
    {
        try
        {
            this.m_DebugLog.Write("Hotmail-Prefs-WebDav.js : onSelect - START");
            
            var buttonEdit = document.getElementById("edit");   
            buttonEdit.setAttribute("disabled", "false");
           
            this.m_DebugLog.Write("Hotmail-Prefs-WebDav.js : onSelect - END");
            return true;
        }
        catch(e)
        {
             this.m_DebugLog.DebugDump("Hotmail-Prefs-WebDav.js : Exception in onSelect : " 
                                          + e.name + 
                                          ".\nError message: " 
                                          + e.message + "\n"
                                          + e.lineNumber);
        }
    },
    
    
    
        
    readModePref : function ()
    {
        try
        {
            this.m_DebugLog.Write("Hotmail-Prefs-WebDav.js : readModePref - START"); 
            
            this.m_aWebDavUserList = new Array();
            var szMode = document.getElementById("prefMode").value;
            this.m_DebugLog.Write("Hotmail-Prefs-WebDav.js : readModePref - "+szMode);
            if (szMode)
            {
                var aRows = szMode.split("\r");
                this.m_DebugLog.Write("Hotmail-Prefs-WebDav.js : readModePref - "+aRows);
                if (aRows)
                {
                    for(i=0; i<aRows.length; i++)
                    {   
                        var item = aRows[i].split("\n");
                        this.m_DebugLog.Write("Hotmail-Prefs-WebDav.js : readModePref - "+item);
                        var data = new HotmailMode();
                        data.szAddress = item[0];
                        data.iMode=item[1];
                        this.m_aWebDavUserList.push(data);   
                    } 
                } 
            }
            
            this.m_DebugLog.Write("Hotmail-Prefs-WebDav.js : readModePref - END");
            return undefined;
        }
        catch(e)
        {
            this.m_DebugLog.DebugDump("Hotmail-Prefs-WebDav.js : Exception in readModePref : " 
                                   + e.name + 
                                   ".\nError message: " 
                                   + e.message + "\n"
                                   + e.lineNumber);
        }  
    },
    
    
    
    writeModePref : function ()
    {
        try
        {
            this.m_DebugLog.Write("Hotmail-Prefs-WebDav.js : writeModePref - START"); 
            
            var szData= null;
          
            for (i=0; i<this.m_aUserList.length; i++)
            {   
                var iMode = this.m_aUserList[i].iMode;
                if (iMode!=0)
                {
                    szData ? szData+="\r" : szData="";
                    szData += this.m_aUserList[i].szAddress;
                    szData +="\n";
                    szData += iMode;                    
                } 
            }
           
            this.m_DebugLog.Write("Hotmail-Prefs-WebDav.js : writeModePref - " + szData);   
                     
            this.m_DebugLog.Write("Hotmail-Prefs-WebDav.js : writeModePref - END");
            return (szData)? szData : "";
        }
        catch(e)
        {
            this.m_DebugLog.DebugDump("Hotmail-Prefs-WebDav.js : Exception in writeModePref : " 
                                   + e.name + 
                                   ".\nError message: " 
                                   + e.message + "\n"
                                   + e.lineNumber);
        }  
    },
};
