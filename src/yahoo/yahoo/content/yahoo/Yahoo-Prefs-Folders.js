var gYahooFolder =
{
    m_cszYahooContentID : "@mozilla.org/YahooPOP;1",
    m_DebugLog : new DebugLog("webmail.logging.comms", 
                              "{3c8e8390-2cf6-11d9-9669-0800200c9a66}",
                              "yahooPrefs"),
    m_aPrefList : null,
    m_bDefaultSpam : false,
    m_strBundle : null,
    m_aszUserList : null,
                               
    init : function ()
    {
        try
        {
            this.m_DebugLog.Write("Yahoo-Prefs-Folders : Init - START");

            this.m_strBundle = document.getElementById("stringYahooFolders");
            
            var oPref = {Value:null};
            var  WebMailPrefAccess = new WebMailCommonPrefAccess();
            if (WebMailPrefAccess.Get("bool","yahoo.bUseJunkMail",oPref))
                this.m_bDefaultSpam=oPref.Value;

            this.getAccountList();
            this.addUserNamesListView();
                
            this.m_DebugLog.Write("Yahoo-Prefs-Folders : Init - END");
        }
        catch(e)
        {
            this.m_DebugLog.DebugDump("Yahoo-Prefs-Folders : Exception in init : " 
                                          + e.name + 
                                          ".\nError message: " 
                                          + e.message + "\n"
                                          + e.lineNumber);
        }        
    },
    
    
    getAccountList : function ()
    {
        try
        {
            this.m_DebugLog.Write("Yahoo-Prefs-Folders : getAccountList - START");

            this.m_aszUserList =  new Array(); 
            var accountManager = Components.classes["@mozilla.org/messenger/account-manager;1"].
                                            getService(Components.interfaces.nsIMsgAccountManager);
         
            var domainManager = Components.classes["@mozilla.org/DomainManager;1"].getService().
                                       QueryInterface(Components.interfaces.nsIDomainManager);
            
            var allServers = accountManager.allServers;
            
            for (var i=0; i < allServers.Count(); i++)
            {
                var currentServer = allServers.GetElementAt(i).
                                        QueryInterface(Components.interfaces.nsIMsgIncomingServer);
              
                if (currentServer.type.search(/pop3/i)!=-1)  //found pop account
                {
                    var szUserName = currentServer.username;
                    this.m_DebugLog.Write("Yahoo-Prefs-Folders  : getUserNameList - userName " + szUserName);
                    if (szUserName)
                    {
                        if (szUserName.search(/@/)==-1) 
                        {
                            szUserName = currentServer.realUsername ;
                            this.m_DebugLog.Write("Yahoo-Prefs-Folders  : getUserNameList - realuserName " + szUserName);
                        }
                        
                        if (szUserName.search(/@/)!=-1)
                        {
                            var szDomain = szUserName.split("@")[1];
                            this.m_DebugLog.Write("Hotmail-Prefs-WebDav.js : getUserNameList - szDomain " + szDomain);
                           
                            var szContentID ={value:null};
                            if (domainManager.getDomainForProtocol(szDomain,"pop", szContentID))//domain found
                            {
                                if (szContentID.value == this.m_cszYahooContentID) //yahoo account found
                                {   
                                    this.m_DebugLog.Write("Yahoo-Prefs-Folders : getUserNameList - userName added");
                                    var data = new YahooFolders();      
                                    data.szUser = szUserName; 
                                    
                                    var bFound = false;
                                    
                                    if (this.m_aPrefList)//check for folders
                                    {
                                        var reg = new RegExp(szUserName,"i");
                                        for (j=0; j<this.m_aPrefList.length; j++)
                                        {
                                            if (this.m_aPrefList[j].szUser.match(reg))
                                            {
                                                data.bInbox= this.m_aPrefList[j].bInbox;
                                                this.m_DebugLog.Write("Hotmail-Prefs-WebDav.js : getUserNameList - inbox " + data.bInbox);
                                                data.bSpam = this.m_aPrefList[j].bSpam;
                                                this.m_DebugLog.Write("Hotmail-Prefs-WebDav.js : getUserNameList - spam " + data.bSpam);
                                                data.aszCustom = this.m_aPrefList[j].aszCustom;
                                                this.m_DebugLog.Write("Hotmail-Prefs-WebDav.js : getUserNameList - aszCustom " + data.aszCustom);
                                            }
                                        }
                                    }
                                    else//folders not found 
                                    {
                                        data.bInbox = true;
                                        this.m_DebugLog.Write("Hotmail-Prefs-WebDav.js : getUserNameList - inbox " + data.bInbox);
                                        data.bSpam = this.m_bDefaultSpam;
                                        this.m_DebugLog.Write("Hotmail-Prefs-WebDav.js : getUserNameList - spam " + data.bSpam);
                                    }   
                                                                              
                                    this.m_aszUserList.push(data);   
                                } 
                            }
                        }
                    }
                }
            }

            this.m_DebugLog.Write("Yahoo-Prefs-Folders : getAccountList - END");
            return true;
        }
        catch(e)
        {
            this.m_DebugLog.DebugDump("Yahoo-Prefs-Folders : Exception in getAccountList : " 
                                          + e.name + 
                                          ".\nError message: " 
                                          + e.message + "\n"
                                          + e.lineNumber);
        }
    },



    addUserNamesListView : function ()
    {
        try
        {
            this.m_DebugLog.Write("Yahoo-Prefs-Folders : AddUserNamesListView - START");
                        
            if (this.m_aszUserList.length > 0) 
            {   
                var list = document.getElementById("listView");
                
                for(i =0 ; i< this.m_aszUserList.length; i++)
                {
                    var szYahooUserName = this.m_aszUserList[i].szUser;
                        
                    var newItem = document.createElement("richlistitem"); 
                    newItem.setAttribute("id", szYahooUserName);
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
                    label.setAttribute("value",szYahooUserName); 
                    label.setAttribute("class","emailAddress");
                    var vBoxDetails = document.createElement("vbox");
                    vBoxDetails.setAttribute("id", "boxDetails");
                    vBoxDetails.setAttribute("class","details"); 
                    vBoxDetails.appendChild(label);

                    //folder box
                    var folderBox = document.createElement("hbox"); 
                    folderBox.setAttribute("id","folderBox");
                    
                    
                    //add inbox image
                    var hBoxInbox = document.createElement("hbox"); 
                    hBoxInbox.setAttribute("id","inbox");
                    if(!this.m_aszUserList[i].bInbox)
                        hBoxInbox.setAttribute("style","visibility:hidden;");
                    var vBoxInboxImage = document.createElement("vbox");
                    var space = document.createElement("spacer")
                    space.setAttribute("flex","1");
                    vBoxInboxImage.appendChild(space);
                    var imageInbox = document.createElement("image"); 
                    imageInbox.setAttribute("id","inboxFolderImage");
                    vBoxInboxImage.appendChild(imageInbox);
                    var space1 = document.createElement("spacer")
                    space1.setAttribute("flex","1");
                    vBoxInboxImage.appendChild(space1);
                    hBoxInbox.appendChild(vBoxInboxImage);
                    var hInboxBoxLabel = document.createElement("hbox");
                    hInboxBoxLabel.setAttribute("align","center"); 
                    hInboxBoxLabel.setAttribute("class","folderLabel");  
                    var labelInbox = document.createElement("label");
                    var szInbox = this.m_strBundle.getString("Inbox");
                    labelInbox.setAttribute("value",szInbox); 
                    labelInbox.setAttribute("class","folder");
                    hInboxBoxLabel.appendChild(labelInbox);
                    hBoxInbox.appendChild(hInboxBoxLabel);
                    folderBox.appendChild(hBoxInbox);

                    //add spam image
                    var hBoxSpam= document.createElement("hbox"); 
                    hBoxSpam.setAttribute("id","spam"); 
                    if(!this.m_aszUserList[i].bSpam)
                        hBoxSpam.setAttribute("style","visibility:hidden;");
                    var imageSpam = document.createElement("image");  
                    imageSpam.setAttribute("id","spamFolderImage");
                    hBoxSpam.appendChild(imageSpam);
                    var hSpamBoxLabel = document.createElement("hbox");
                    hSpamBoxLabel.setAttribute("align","center");  
                    var labelSpam = document.createElement("label");
                    var szSpam = this.m_strBundle.getString("Spam");
                    labelSpam.setAttribute("value",szSpam); 
                    labelSpam.setAttribute("class","folder");
                    hSpamBoxLabel.appendChild(labelSpam);
                    hBoxSpam.appendChild(hSpamBoxLabel);        
                    folderBox.appendChild(hBoxSpam);              

                    //add custom folders
                    var hBoxCustom = document.createElement("hbox"); 
                    hBoxCustom.setAttribute("id","custom"); 
                    if(this.m_aszUserList[i].aszCustom)
                        hBoxCustom.setAttribute("style","visibility:visible;");
                    else
                        hBoxCustom.setAttribute("style","visibility:hidden;");
                    var vBoxCustomImage = document.createElement("vbox");
                    var space2 = document.createElement("spacer")
                    space2.setAttribute("flex","1");
                    vBoxCustomImage.appendChild(space2);
                    var imageCustom = document.createElement("image");  
                    imageCustom.setAttribute("id","customFolderImage");
                    vBoxCustomImage.appendChild(imageCustom);
                    var space3 = document.createElement("spacer")
                    space3.setAttribute("flex","1");
                    vBoxCustomImage.appendChild(space3);
                    hBoxCustom.appendChild(vBoxCustomImage);
                    var hCustomBoxLabel = document.createElement("hbox");
                    hCustomBoxLabel.setAttribute("align","center");  
                    var labelCustom = document.createElement("label");
                    var szCustom = this.m_strBundle.getString("Custom");
                    labelCustom.setAttribute("value",szCustom); 
                    labelCustom.setAttribute("class","folder");
                    hCustomBoxLabel.appendChild(labelCustom);
                    hBoxCustom.appendChild(hCustomBoxLabel);        
                    folderBox.appendChild(hBoxCustom);     
                    
                    vBoxDetails.appendChild(folderBox);
                    
                    newItem.appendChild(vBoxPerson);
                    newItem.appendChild(vBoxDetails);
                   
                    list.appendChild(newItem);
                }
            }
           
            this.m_DebugLog.Write("Yahoo-Prefs-Folders : AddUserNamesListView - END");
        }
        catch(err)
        {
            this.m_DebugLog.DebugDump("Yahoo-Prefs-Folders : Exception in AddUserNamesListView : " 
                                       + err.name + 
                                       ".\nError message: " 
                                       + err.message + "\n"
                                       + err.lineNumber);
        }
    },


    readFolderPref : function ()
    {
        try
        {
            this.m_DebugLog.Write("Yahoo-Prefs-Folders : readModePref - START"); 
            
            if (this.m_aPrefList) delete this.m_aPrefList;
            
            var szPrefs = document.getElementById("prefFolders").value;     
            this.m_DebugLog.Write("Yahoo-Prefs-Folders : readModePref - Folders " + szPrefs);  
            if (szPrefs)
            {
                this.m_aPrefList = new Array();
                
                var aszUsers =szPrefs.split("\n");
                this.m_DebugLog.Write("Yahoo-Prefs-Folders : readModePref - aszUsers " + aszUsers);
                
                for (i=0;i<aszUsers.length-1 ; i++)
                {
                    this.m_DebugLog.Write("Yahoo-Prefs-Folders : readModePref - aszUsers " + aszUsers[i]);
                    var aszFolders = aszUsers[i].split("\r");
                    
                    var data = new YahooFolders();
                
                    //user name
                    data.szUser = aszFolders[0];
                    //inbox
                    if (aszFolders[1].search(/true/i)!=-1) data.bInbox = true;
                    //spam
                    if (aszFolders[2].search(/true/i)!=-1) data.bSpam = true;
                    
                    //custom folders
                    if (aszFolders.length>3)
                    {
                        if (data.aszCustom) delete data.aszCustom;
                        data.aszCustom = new Array(); 
                        for (j=3; j<aszFolders.length; j++)
                        {
                            this.m_DebugLog.Write("Yahoo-Prefs-Folders : readModePref - aszFolders[j] " + aszFolders[j]);
                            data.aszCustom.push(aszFolders[j]);
                        }
                    }
                    
                    this.m_aPrefList.push(data);
                }
            }
            
            this.m_DebugLog.Write("Yahoo-Prefs-Folders : readModePref - END");
            return undefined;
        }
        catch(e)
        {
            this.m_DebugLog.DebugDump("Yahoo-Prefs-Folders : Exception in readModePref : " 
                                   + e.name + 
                                   ".\nError message: " 
                                   + e.message + "\n"
                                   + e.lineNumber);
        }  
    },
    
    writeFolderPref : function ()
    {
        try
        {
            this.m_DebugLog.Write("Yahoo-Prefs-Folders : writeModePref - START"); 
            
            var szData= "";
            
            for (i=0; i<this.m_aszUserList.length; i++)
            {
                var oData = this.m_aszUserList[i];
                var temp = oData.szUser+"\r"+oData.bInbox+"\r"+oData.bSpam;
                
                if (oData.aszCustom)
                {
                    for (j=0; j<oData.aszCustom.length; j++)
                    {
                        temp += "\r"+oData.aszCustom[j];
                    }
                }
                szData+= temp + "\n";
            }
            this.m_DebugLog.Write("Yahoo-Prefs-Folders : writeModePref - szData "+ szData); 
                        
            this.m_DebugLog.Write("Yahoo-Prefs-Folders : writeModePref - END");
            return (szData)? szData : "";
        }
        catch(e)
        {
            this.m_DebugLog.DebugDump("Yahoo-Prefs-Folders : Exception in writeModePref : " 
                                   + e.name + 
                                   ".\nError message: " 
                                   + e.message + "\n"
                                   + e.lineNumber);
        }  
    },
    
    
    onDClick : function ()
    {
        try
        {
            this.m_DebugLog.Write("Yahoo-Prefs-Folders : onDClick - START");
                  
            //get selected item
            var listView = document.getElementById("listView");   //click item
            var iIndex = listView.selectedIndex
            this.m_DebugLog.Write("Yahoo-Prefs-Folders : onDClick - iIndex "+iIndex);
            if (iIndex==-1) return false;
            
            var oResult = {value : -1};
            var oParam = {szUser: null, chkJunkMail: false, aszFolders:null};
            
            oParam.szUser = this.m_aszUserList[iIndex].szUser;
            this.m_DebugLog.Write("Yahoo-Prefs-Folders : onDClick -  oParam.szUser "+ oParam.szUser);
            oParam.chkJunkMail = this.m_aszUserList[iIndex].bSpam;
            this.m_DebugLog.Write("Yahoo-Prefs-Folders : onDClick -  oParam.chkJunkMail "+ oParam.chkJunkMail);
            oParam.aszFolders = this.m_aszUserList[iIndex].aszCustom;
            this.m_DebugLog.Write("Yahoo-Prefs-Folders : onDClick -  oParam.aszFolders "+ oParam.aszFolders);
          
            window.openDialog("chrome://yahoo/content/Yahoo-Prefs-Folders-Edit.xul",
                              "Edit",
                              "chrome, centerscreen, modal",
                              oParam,
                              oResult);  
            
            this.m_DebugLog.Write("Yahoo-Prefs-Folders  : onDClick - result "+ oResult.value);
            if (oResult.value!=-1)
            {
                this.m_DebugLog.Write("Yahoo-Prefs-Folders  : onDClick - oParam.chkJunkMail "+oParam.chkJunkMail);
                this.m_aszUserList[iIndex].bSpam = oParam.chkJunkMail;
                this.m_DebugLog.Write("Yahoo-Prefs-Folders  : onDClick - oParam.aszFolders "+oParam.aszFolders);
                this.m_aszUserList[iIndex].aszCustom = oParam.aszFolders;

                var item  =  listView.selectedItem;
                var aItemChildren = item.childNodes;
                for (i=0; i<aItemChildren.length; i++)
                {
                    var szID = aItemChildren[i].getAttribute("id");
                    this.m_DebugLog.Write("Yahoo-Prefs-Folders : level 1 szID "+ szID);
                    if (szID.search(/boxDetails/i)!=-1)
                    {
                        var aBoxDetailsChildren = aItemChildren[i].childNodes;
                        for (j=0; j<aBoxDetailsChildren.length; j++)
                        {
                            szID = aBoxDetailsChildren[j].getAttribute("id");
                            this.m_DebugLog.Write("Yahoo-Prefs-Folders : level 2 szID "+ szID); 
                            if (szID.search(/folderBox/i)!=-1)
                            {   
                                var aBoxModeChildren = aBoxDetailsChildren[j].childNodes;
                                for (k=0; k<aBoxModeChildren.length; k++)
                                {
                                    szID = aBoxModeChildren[k].getAttribute("id");
                                    this.m_DebugLog.Write("Yahoo-Prefs-Folders : level 3 szID "+ szID); 
                                    
                                    if(szID.search(/spam/)!=-1)//spam
                                    {                                        
                                        if (!oParam.chkJunkMail)
                                            aBoxModeChildren[k].setAttribute("style","visibility:hidden;");
                                        else
                                            aBoxModeChildren[k].setAttribute("style","visibility:visible;");
                                    }
                                    else if (szID.search(/custom/)!=-1)//custom
                                    {
                                        if (oParam.aszFolders)
                                        {
                                            if (oParam.aszFolders.length>0)
                                                aBoxModeChildren[k].setAttribute("style","visibility:visible;");
                                            else
                                                aBoxModeChildren[k].setAttribute("style","visibility:hidden;"); 
                                        }
                                        else
                                             aBoxModeChildren[k].setAttribute("style","visibility:hidden;");   
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

                                  
            this.m_DebugLog.Write("Yahoo-Prefs-Folders : onDClick - END");
            return true;
        }
        catch(e)
        {
             this.m_DebugLog.DebugDump("Yahoo-Prefs-Folders : Exception in onDClick : " 
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
            this.m_DebugLog.Write("Yahoo-Prefs-Folders : onSelect - START");

            var listView = document.getElementById("listView");   //click item
            var iIndex = listView.selectedIndex;
            this.m_DebugLog.Write("Yahoo-Prefs-Folders : onSelect - iIndex "+iIndex);
            
            var buttonEdit = document.getElementById("edit");   
            buttonEdit.setAttribute("disabled", iIndex!=-1? "false" : true);
                
            this.m_DebugLog.Write("Yahoo-Prefs-Folders : onSelect - END");
            return true;
        }
        catch(e)
        {
            this.m_DebugLog.DebugDump("Yahoo-Prefs-Folders : Exception in onSelect : " 
                                          + e.name + 
                                          ".\nError message: " 
                                          + e.message + "\n"
                                          + e.lineNumber);
        }
    },
    
    add : function ()
    {
        try
        {
            this.m_DebugLog.Write("Yahoo-Prefs-Folders : add - START");

            this.onDClick();
            
            this.m_DebugLog.Write("Yahoo-Prefs-Folders : add - END");
            return true;
        }
        catch(e)
        {
            this.m_DebugLog.DebugDump("Yahoo-Prefs-Folders : Exception in add : " 
                                          + e.name + 
                                          ".\nError message: " 
                                          + e.message + "\n"
                                          + e.lineNumber);
        }
    },
};
