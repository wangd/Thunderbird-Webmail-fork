var gPrefAccounts =
{
    m_kMailDotComContentID : "@mozilla.org/MailDotComPOP;1",
    m_DebugLog : new DebugLog("webmail.logging.comms", 
                              "{3c8e8390-2cf6-11d9-9669-0800200c9a66}",
                              "MailDotComPrefs"),
    m_aszUserList : null,
    m_aszPrefsList : null,
    m_bDefaultUnread : false,
    m_bDefaultSentItems : false,
    m_bDefaultSendHtml : false, 
    m_bDefaultSaveCopy :true,
    m_bDefaultEmptyTrash : false,    
    m_iIndex : -1,
      
      
                   
    init : function()
    {
        try
        {
            this.m_DebugLog.Write("MailDotCom-Pref-Accounts : Init - START");

            this.m_strBundle = document.getElementById("stringMailDotComFolders");
            
            //get defaults
            var WebMailPrefAccess = new WebMailCommonPrefAccess();
            var oPref = {Value : null};
            
            //save copy in sent items
            WebMailPrefAccess.Get("bool","maildotcom.bSaveCopy",oPref);
            this.m_bDefaultSaveCopy=oPref.Value;
            this.m_DebugLog.Write("MailDotCom-Pref-Accounts : Init - this.m_bDefaultSaveCopy "+this.m_bDefaultSaveCopy );
            
            //empty trash
            oPref.Value = null;
            WebMailPrefAccess.Get("bool","maildotcom.bEmptyTrash",oPref);
            this.m_bDefaultEmptyTrash=oPref.Value;
            this.m_DebugLog.Write("MailDotCom-Pref-Accounts : Init - this.m_bDefaultEmptyTrash "+this.m_bDefaultEmptyTrash );
            
            //what do i do with alternative parts
            oPref.Value = null;
            WebMailPrefAccess.Get("bool","maildotcom.bSendHtml",oPref);  
            this.m_bDefaultSendHtml = oPref.Value;
            this.m_DebugLog.Write("MailDotCom-Pref-Accounts : Init - this.m_bDefaultSendHtml "+this.m_bDefaultSendHtml );
            
            oPref.Value = null;
            WebMailPrefAccess.Get("bool","maildotcom.bDownloadUnread",oPref);
            this.m_bDefaultUnread = oPref.Value;
            this.m_DebugLog.Write("MailDotCom-Pref-Accounts : Init - this.m_bDefaultUnread "+this.m_bDefaultUnread );
            
            oPref.Value = null;
            WebMailPrefAccess.Get("bool","maildotcom.bSaveCopy",oPref);
            this.m_bDefaultSentItems = oPref.Value;
            this.m_DebugLog.Write("MailDotCom-Pref-Accounts : Init - this.m_bDefaultSentItems "+this.m_bDefaultSentItems );
            
            //load data
            this.getAccountPrefs();                        
            this.getAccountList();
            this.userAdd();
        

            if (this.m_aszUserList.length>0) //select first item
            {
                document.getElementById("menuAccounts").selectedIndex=0;
            }
           else //disable elements
            {
                document.getElementById("boxAccounts").setAttribute("hidden", true);
                document.getElementById("boxError").setAttribute("hidden", false);
            }
            this.userClick();
            
            this.m_DebugLog.Write("MailDotCom-Pref-Accounts : Init - END");
        }
        catch(e)
        {
             this.m_DebugLog.DebugDump("MailDotCom-Pref-Accounts : Exception in init : " 
                                          + e.name + 
                                          ".\nError message: " 
                                          + e.message + "\n"
                                          + e.lineNumber);
        }
    },
    
    
    
    
    save : function ()
    {
        try
        {
            this.m_DebugLog.Write("MailDotCom-Pref-Accounts : save - START");
            
            if (this.m_aszUserList.length>0)
            {
                //write prefs
                var WebMailPrefAccess = new WebMailCommonPrefAccess();
        
                for (var i=0; i<this.m_aszUserList.length; i++)
                {
                    WebMailPrefAccess.Set("char","maildotcom.Account."+i+".user",this.m_aszUserList[i].szUser);
                    this.m_DebugLog.Write("MailDotCom-Pref-Accounts.js - save - user " + this.m_aszUserList[i].szUser);
                    
                    WebMailPrefAccess.Set("bool","maildotcom.Account."+i+".bEmptyTrash",this.m_aszUserList[i].bEmptyTrash);
                    this.m_DebugLog.Write("MailDotCom-Pref-Accounts.js - save - bEmptyTrash " + this.m_aszUserList[i].bEmptyTrash); 
                    
                    WebMailPrefAccess.Set("bool","maildotcom.Account."+i+".bDownloadUnread",this.m_aszUserList[i].bDownloadUnread);
                    this.m_DebugLog.Write("MailDotCom-Pref-Accounts.js - save - bDownloadUnread " + this.m_aszUserList[i].bDownloadUnread); 
                    
                    WebMailPrefAccess.Set("bool","maildotcom.Account."+i+".bSendHtml",this.m_aszUserList[i].bSendHtml);
                    this.m_DebugLog.Write("MailDotCom-Pref-Accounts.js - save - bSendHtml " + this.m_aszUserList[i].bSendHtml);
                    
                    WebMailPrefAccess.Set("bool","maildotcom.Account."+i+".bSaveCopy",this.m_aszUserList[i].bSaveCopy);
                    this.m_DebugLog.Write("MailDotCom-Pref-Accounts.js - save - bSaveCopy " + this.m_aszUserList[i].bSaveCopy);

                    var szFolders = "";
                    if (this.m_aszUserList[i].aszFolder)
                    {
                        for (var j=0; j<this.m_aszUserList[i].aszFolder.length; j++)
                        {
                            szFolders += this.m_aszUserList[i].aszFolder[j];
                            if (j!=this.m_aszUserList[i].aszFolder.length-1) szFolders += "\r";
                        }
                    }
                    WebMailPrefAccess.Set("char","maildotcom.Account."+i+".szFolders",szFolders);
                    this.m_DebugLog.Write("MailDotCom-Pref-Accounts.js - save - szFolders " + szFolders);
   
                }
                WebMailPrefAccess.Set("int","maildotcom.Account.Num",this.m_aszUserList.length);
            }
            
            this.m_DebugLog.Write("MailDotCom-Pref-Accounts : save - END");
        }
        catch(e)
        {
            this.m_DebugLog.DebugDump("MailDotCom-Pref-Accounts : Exception in save : " 
                                          + e.name + 
                                          ".\nError message: " 
                                          + e.message + "\n"
                                          + e.lineNumber);
        }
    },



    getAccountPrefs : function ()
    {
        try
        {
            this.m_DebugLog.Write("MailDotCom-Pref-Accounts : getAccountPrefs - START");
             
            var WebMailPrefAccess = new WebMailCommonPrefAccess();
            var oPref = {Value : null};
            
            if (WebMailPrefAccess.Get("int","maildotcom.Account.Num",oPref))
            {
                var iAccountNum = oPref.Value;
                this.m_DebugLog.Write("MailDotCom-Pref-Accounts.js - getAccountPrefs num " + iAccountNum);
                
                if(iAccountNum>0)
                {
                    this.m_aszPrefsList = new Array();
                    
                    for (i=0; i<iAccountNum; i++)
                    {
                        var oData = new PrefData();
                        this.m_DebugLog.Write("MailDotCom-Pref-Accounts.js - getAccountPrefs - i " + i);
                        
                        //get email address
                        oPref.Value = null;
                        WebMailPrefAccess.Get("char","maildotcom.Account."+i+".user",oPref);
                        oData.szUser = oPref.Value;
                        this.m_DebugLog.Write("MailDotCom-Pref-Accounts.js - getAccountPrefs - oData.szUser " + oData.szUser);
                        
                        //get unread
                        oPref.Value = null;
                        WebMailPrefAccess.Get("bool","maildotcom.Account."+i+".bDownloadUnread",oPref);
                        oData.bDownloadUnread = oPref.Value;
                        this.m_DebugLog.Write("MailDotCom-Pref-Accounts.js - getAccountPrefs - oData.bDownloadUnread " + oData.bDownloadUnread);
                           
                        //empty trash
                        oPref.Value = null;
                        WebMailPrefAccess.Get("bool","maildotcom.Account."+i+".bEmptyTrash",oPref);
                        oData.bEmptyTrash = oPref.Value;
                        this.m_DebugLog.Write("MailDotCom-Pref-Accounts.js - getAccountPrefs - oData.bEmptyTrash " + oData.bEmptyTrash); 
                                                                 
                        //get SaveSentItems
                        oPref.Value = null;
                        WebMailPrefAccess.Get("bool","maildotcom.Account."+i+".bSaveCopy",oPref);
                        oData.bSaveCopy = oPref.Value;
                        this.m_DebugLog.Write("MailDotCom-Pref-Accounts.js - getAccountPrefs - oData.bSaveSentItem " + oData.bSaveCopy);
                        
                        //get SendHtml
                        oPref.Value = null;
                        WebMailPrefAccess.Get("bool","maildotcom.Account."+i+".bSendHtml",oPref);
                        oData.bSendHtml = oPref.Value;
                        this.m_DebugLog.Write("MailDotCom-Pref-Accounts.js - getAccountPrefs - oData.bSendHtml " + oData.bSendHtml);

                        //get szFolders
                        oPref.Value = null;
                        WebMailPrefAccess.Get("char","maildotcom.Account."+i+".szFolders",oPref);
                        if (oPref.Value)
                        {
                            var aFolders = oPref.Value.split("\r");
                            oData.aszFolder = new Array();
                            for (var j=0; j<aFolders.length; j++)
                            {
                                if (aFolders[j].length>0)
                                    oData.aszFolder.push(aFolders[j]);
                            } 
                            this.m_DebugLog.Write("MailDotCom-Pref-Accounts.js - getAccountPrefs - oData.szFolders " + oData.aszFolder);   
                        }

                        this.m_aszPrefsList.push(oData);
                    }
                }
            }
            
            this.m_DebugLog.Write("MailDotCom-Pref-Accounts : getAccountPrefs - END");
            return true;
        }
        catch(e)
        {
             this.m_DebugLog.DebugDump("MailDotCom-Pref-Accounts : Exception in getAccountPrefs : " 
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
            this.m_DebugLog.Write("MailDotCom-Pref-Accounts : getAccountList - START");

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
                    this.m_DebugLog.Write("MailDotCom-Pref-Accounts : getUserNameList - userName " + szUserName);
                    if (szUserName)
                    {
                        if (szUserName.search(/@/)==-1) 
                        {
                            szUserName = currentServer.realUsername ;
                            this.m_DebugLog.Write("MailDotCom-Pref-Accounts  : getUserNameList - realuserName " + szUserName);
                        }
                        
                        if (szUserName.search(/@/)!=-1)
                        {
                            var szDomain = szUserName.split("@")[1];
                            this.m_DebugLog.Write("MailDotCom-Pref-Accounts : getUserNameList - szDomain " + szDomain);
                           
                            var szContentID ={value:null};
                            if (domainManager.getDomainForProtocol(szDomain,"pop", szContentID))//domain found
                            {
                                this.m_DebugLog.Write("MailDotCom-Pref-Accounts : getUserNameList - szContentID.value " + szContentID.value);
                                if (szContentID.value == this.m_kMailDotComContentID) //MailDotCom account found
                                {   
                                    var data = new PrefData();      
                                    data.szUser = szUserName; 
                                    
                                    var bFound = false;
                                    
                                    if (this.m_aszPrefsList)//check for prefs
                                    {
                                        var reg = new RegExp(szUserName,"i");
                                        for (j=0; j<this.m_aszPrefsList.length; j++)
                                        {
                                            if (this.m_aszPrefsList[j].szUser.search(reg)!=-1)
                                            {
                                                data.aszFolder = this.m_aszPrefsList[j].aszFolder;
                                                this.m_DebugLog.Write("MailDotCom-Pref-Accounts : getUserNameList - aszFolder " + data.aszFolder);
                                              
                                                data.bDownloadUnread = this.m_aszPrefsList[j].bDownloadUnread;
                                                this.m_DebugLog.Write("MailDotCom-Pref-Accounts : getUserNameList - bUnread " + data.bDownloadUnread);
                                              
                                                data.bEmptyTrash = this.m_aszPrefsList[j].bEmptyTrash;
                                                this.m_DebugLog.Write("MailDotCom-Pref-Accounts : getUserNameList - bEmptyTrash " + data.bEmptyTrash);
                                              
                                                data.bSaveCopy = this.m_aszPrefsList[j].bSaveCopy;
                                                this.m_DebugLog.Write("MailDotCom-Pref-Accounts : getUserNameList - bSaveSentItem " + data.bSaveCopy);
                                            
                                                data.bSendHtml = this.m_aszPrefsList[j].bSendHtml;
                                                this.m_DebugLog.Write("MailDotCom-Pref-Accounts : getUserNameList - bSendHtml " + data.bSendHtml);

                                                bFound= true;
                                            }
                                        }
                                    }
                                   
                                   if (!bFound)//prefs not found 
                                    {  
                                        data.bDownloadUnread = this.m_bDefaultUnread;
                                        this.m_DebugLog.Write("MailDotCom-Pref-Accounts : getUserNameList - default bUnread " + data.bDownloadUnread);
                                       
                                        data.bSaveCopy = this.m_bDefaultSaveCopy;
                                        this.m_DebugLog.Write("MailDotCom-Pref-Accounts : getUserNameList - default bSaveCopy " + data.bSaveCopy);
                                    
                                        data.bSendHtml = this.m_bDefaultSendHtml;
                                        this.m_DebugLog.Write("MailDotCom-Pref-Accounts : getUserNameList - default bSendHtml " + data.bSendHtml); 
                                        
                                        data.bEmptyTrash = this.m_bDefaultEmptyTrash;
                                        this.m_DebugLog.Write("MailDotCom-Pref-Accounts : getUserNameList - default bEmptyTrash " + data.bEmptyTrash);                                  
                                    }
                                                                       
                                    this.m_DebugLog.Write("MailDotCom-Pref-Accounts : getUserNameList - userName added");    
                                    this.m_aszUserList.push(data);   
                                } 
                            }
                        }
                    }
                }
            }

            this.m_DebugLog.Write("MailDotCom-Pref-Accounts : getAccountList - END");
            return true;
        }
        catch(e)
        {
            this.m_DebugLog.DebugDump("MailDotCom-Pref-Accounts : Exception in getAccountList : " 
                                          + e.name + 
                                          ".\nError message: " 
                                          + e.message + "\n"
                                          + e.lineNumber);
        }
    },   


    userAdd : function ()
    {
        try
        {
            this.m_DebugLog.Write("MailDotCom-Pref-Accounts : userAdd - START");
                  
            var list = document.getElementById("popupAccounts");    
            if (this.m_aszUserList.length > 0) 
            {        
                for(i =0 ; i< this.m_aszUserList.length; i++)
                {
                    var szUserName = this.m_aszUserList[i].szUser;
                    var newItem = document.createElement("menuitem"); 
                    newItem.setAttribute("id", szUserName);
                    newItem.setAttribute("label", szUserName);
                    newItem.setAttribute("class", "menuitem-iconic"); 
                    newItem.setAttribute("src","chrome://maildotcom/skin/person.png");
                    newItem.setAttribute("oncommand","gPrefAccounts.userClick()"); 
                    list.appendChild(newItem);
                }
            }
            
            this.m_DebugLog.Write("MailDotCom-Pref-Accounts : userAdd - END");
        }
        catch(err)
        {
            this.m_DebugLog.DebugDump("MailDotCom-Pref-Accounts : Exception in userAdd : " 
                                       + err.name + 
                                       ".\nError message: " 
                                       + err.message + "\n"
                                       + err.lineNumber);
        }
    },
    
    
    userClick : function ()
    {
        try
        {
            this.m_DebugLog.Write("MailDotCom-Pref-Accounts : userClick - START");
                        
            var listView = document.getElementById("menuAccounts");   //click item
            this.m_iIndex = listView.selectedIndex;
            this.m_DebugLog.Write("MailDotCom-Pref-Accounts : userClick - iIndex "+this.m_iIndex);
            
            if (this.m_aszUserList.length>0)
            {
                var data = this.m_aszUserList[this.m_iIndex];
                this.m_DebugLog.Write("MailDotCom-Pref-Accounts : userClick -  data.szUser "+ data.szUser);
                
                this.m_DebugLog.Write("MailDotCom-Pref-Accounts : userClick -  data.bUnread "+ data.bDownloadUnread);
                document.getElementById("chkDownloadUnread").checked = data.bDownloadUnread;
                
                this.m_DebugLog.Write("MailDotCom-Pref-Accounts : userClick -  data.bEmptyTrash "+ data.bEmptyTrash);
                document.getElementById("chkEmptyTrash").checked = data.bEmptyTrash;
            
                this.m_DebugLog.Write("MailDotCom-Pref-Accounts : userClick -  data.bSaveCopy "+ data.bSaveCopy);
                document.getElementById("chkSentItems").checked = data.bSaveCopy;
                
                this.m_DebugLog.Write("MailDotCom-Pref-Accounts : userClick -  data.bSendHtml "+ data.bSendHtml );
                document.getElementById("radiogroupAlt").selectedIndex = data.bSendHtml?1:0;
                
                //clear list
                var listFolders = document.getElementById("listFolders");
                var iRowCount = listFolders.getRowCount()
                for (var i=0; i<iRowCount; i++)
                {
                    this.m_DebugLog.Write("MailDotCom-Pref-Accounts : userClick - removing " + i);
                    var item = listFolders.getItemAtIndex(0);
                    listFolders.removeChild(item);
                }
                
                //add folder details
                this.m_DebugLog.Write("MailDotCom-Pref-Accounts : userClick -  data.aszFolder " + data.aszFolder);
                if (data.aszFolder) 
                {       
                    for (var i=0; i<data.aszFolder.length; i++)
                    {
                        this.m_DebugLog.Write("MailDotCom-Pref-Accounts : userListDBClick - data.aszFolder " + data.aszFolder[i] + " i "+i);
                        this.addItemFolderList(data.aszFolder[i]);
                    }
                }
            }
            this.m_DebugLog.Write("MailDotCom-Pref-Accounts : userClick - END");
        }
        catch(e)
        {
             this.m_DebugLog.DebugDump("MailDotCom-Pref-Accounts : Exception in userClick : " 
                                          + e.name + 
                                          ".\nError message: " 
                                          + e.message + "\n"
                                          + e.lineNumber);
        }
    },


/**********************************************************************/
//Deck POP Panel
/**********************************************************************/    
    folderListSelect : function ()
    {
        try
        {
            this.m_DebugLog.Write("MailDotCom-Pref-Accounts : folderListSelect - START");

            var listView = document.getElementById("listFolders");   //click item
            var iIndex = listView.selectedIndex;
            this.m_DebugLog.Write("MailDotCom-Pref-Accounts : folderListSelect - iIndex "+iIndex);
            
            var buttonRemove = document.getElementById("removeFolderList");   
            buttonRemove.setAttribute("disabled", iIndex!=-1? false : true);
                
            this.m_DebugLog.Write("MailDotCom-Pref-Accounts : folderListSelect - END");
            return true;
        }
        catch(e)
        {
            this.m_DebugLog.DebugDump("MailDotCom-Pref-Accounts : Exception in folderListSelect : " 
                                          + e.name + 
                                          ".\nError message: " 
                                          + e.message + "\n"
                                          + e.lineNumber);
        }
    
    },
    
    
    addItemFolderList : function (szName)
    {
        try
        {
            this.m_DebugLog.Write("MailDotCom-Pref-Accounts : addItemFolderList - START " + szName);
            
            var newItem = document.createElement("richlistitem"); 
            newItem.setAttribute("id", szName);
            newItem.setAttribute("class", "listItem");
            newItem.setAttribute("align", "center");
            newItem.setAttribute("tabIndex", 0);
            newItem.setAttribute("allowEvents", "true");
            newItem.setAttribute("selected","false"); 

            //image
            var space = document.createElement("spacer")
            space.setAttribute("flex","1");
            var vBoxImage = document.createElement("vbox");
            vBoxImage.setAttribute("id", "boxImage");
            vBoxImage.appendChild(space);
            var image = document.createElement("image");  
            image.setAttribute("id","customFolderImage");
            vBoxImage.appendChild(image);
            var space1 = document.createElement("spacer")
            space1.setAttribute("flex","1");
            vBoxImage.appendChild(space1);
            newItem.appendChild(vBoxImage);
            
            //folder name
            var label = document.createElement("label");
            label.setAttribute("value",szName); 
            label.setAttribute("class","folderName");          
            newItem.appendChild(label);
            
            document.getElementById("listFolders").appendChild(newItem);
            
            this.m_DebugLog.Write("MailDotCom-Pref-Accounts : addItemFolderList - END");
            return true;
        }
        catch(e)
        {
             this.m_DebugLog.DebugDump("MailDotCom-Pref-Accounts : Exception in addItemFolderList : " 
                                          + e.name + 
                                          ".\nError message: " 
                                          + e.message + "\n"
                                          + e.lineNumber);
        }
    },
    
    
    folderListAdd : function ()
    {
        try
        {
            this.m_DebugLog.Write("MailDotCom-Pref-Accounts : folderListAdd - START");
            var oResult = {value : -1};
            var oParam = {szfolder : null};
            window.openDialog("chrome://maildotcom/content/MailDotCom-Prefs-Folders-Add.xul",
                              "Add",
                              "chrome, centerscreen, modal",
                              oParam,
                              oResult);  
        
            this.m_DebugLog.Write("MailDotCom-Pref-Accounts: folderListAdd oResult.value " + oResult.value);
            
            if (oResult.value!=-1)
            {
                this.m_DebugLog.Write("MailDotCom-Pref-Accounts : folderListAdd oParam.szfolder " + oParam.szFolder);
                
                //add to array
                if(!this.m_aszUserList[this.m_iIndex].aszFolder)
                    this.m_aszUserList[this.m_iIndex].aszFolder = new Array();
                    
                this.m_aszUserList[this.m_iIndex].aszFolder.push(oParam.szFolder);
                this.m_DebugLog.Write("MailDotCom-Pref-Accounts : folderListAdd aszFolder" + this.m_aszUserList[this.m_iIndex].aszFolder);
               
                //add item to list
                this.addItemFolderList(oParam.szFolder);
                
                var event = document.createEvent("Events");
                event.initEvent("change", false, true);
                document.getElementById("listFolders").dispatchEvent(event);
            }
            this.m_DebugLog.Write("MailDotCom-Pref-Accounts : folderListAdd - END");
        }
        catch(e)
        {
             this.m_DebugLog.DebugDump("MailDotCom-Pref-Accounts : Exception in folderListAdd : " 
                                          + e.name + 
                                          ".\nError message: " 
                                          + e.message + "\n"
                                          + e.lineNumber);
        }
    },
    
    
    folderListRemove  : function ()
    {        
        try
        {
            this.m_DebugLog.Write("MailDotCom-Pref-Accounts : doRemove - START");
            
            //get selected item
            var listView = document.getElementById("listFolders");   //click item
            var iIndex = listView.selectedIndex;
            this.m_DebugLog.Write("MailDotCom-Pref-Accounts : doRemove - iIndex "+iIndex);
            
            //remove from array
            for (i=0; this.m_aszUserList[this.m_iIndex].aszFolder.length>i; i++)
            {
                var temp = this.m_aszUserList[this.m_iIndex].aszFolder.shift();
                this.m_DebugLog.Write("MailDotCom-Pref-Accounts : doRemove - temp "+temp);
                
                if (i!= iIndex)
                {
                    this.m_aszUserList[this.m_iIndex].aszFolder.push(temp);
                    this.m_DebugLog.Write("MailDotCom-Pref-Accounts : doRemove - pushed back ");
                }       
            }
            
            //remove for display
            var item = listView.getItemAtIndex(iIndex);
            listView.removeChild(item);
    
            if (listView.getRowCount()>0) 
                listView.selectedIndex = 0;  //select first item
            else   
                document.getElementById("removeFolderList").setAttribute("disabled",true);
            
            var event = document.createEvent("Events");
            event.initEvent("change", false, true);
            document.getElementById("listFolders").dispatchEvent(event);
      
            this.m_DebugLog.Write("MailDotCom-Pref-Accounts : folderListRemove - END");
            return true;
        }
        catch(e)
        {
            this.m_DebugLog.DebugDump("MailDotCom-Pref-Accounts : Exception in folderListRemove : " 
                                          + e.name + 
                                          ".\nError message: " 
                                          + e.message + "\n"
                                          + e.lineNumber);
        }
    },
    
        
    chkDownloadUreadOnChange : function ()
    {
        this.m_DebugLog.Write("MailDotCom-Pref-Accounts : chkDownloadUreadOnChange - START");
        
        var bUnread = document.getElementById("chkDownloadUnread").checked;
        this.m_DebugLog.Write("MailDotCom-Pref-Accounts : chkDownloadUreadOnChange -  bUnread "+ !bUnread);
        this.m_aszUserList[this.m_iIndex].bDownloadUnread = !bUnread;
        
        this.m_DebugLog.Write("MailDotCom-Pref-Accounts : chkDownloadUreadOnChange - END");
    },
    
    
    
    chkEmptyTrashOnChange : function ()
    {
        this.m_DebugLog.Write("MailDotCom-Pref-Accounts : chkEmptyTrashOnChange - START");
        
        var bEmptyTrash = document.getElementById("chkEmptyTrash").checked;
        this.m_DebugLog.Write("MailDotCom-Pref-Accounts : chkEmptyTrashOnChange -  bEmptyTrash "+ !bEmptyTrash);
        this.m_aszUserList[this.m_iIndex].bEmptyTrash = !bEmptyTrash;
        
        this.m_DebugLog.Write("MailDotCom-Pref-Accounts : chkEmptyTrashOnChange - END");
    },
 
     
/**********************************************************************/
//Deck SMTP Panel
/**********************************************************************/    
    chkSentItemsOnChange : function ()
    {
        this.m_DebugLog.Write("MailDotCom-Pref-Accounts : chkSentItemsOnChange - START");
        
        var bSaveItem = document.getElementById("chkSentItems").checked;
        this.m_DebugLog.Write("MailDotCom-Pref-Accounts : chkSentItemsOnChange -  bSaveItem "+ !bSaveItem);
        this.m_aszUserList[this.m_iIndex].bSaveCopy = !bSaveItem;
        
        this.m_DebugLog.Write("MailDotCom-Pref-Accounts : chkSentItemsOnChange - END");
    },
    
    
    
    rgAltOnChange : function ()
    {
        this.m_DebugLog.Write("MailDotCom-Pref-Accounts : rgAltOnChange - START");
        
        var bSendHtml = document.getElementById("radiogroupAlt").value;
        this.m_DebugLog.Write("MailDotCom-Pref-Accounts : rgAltOnChange -  bSendHtml "+ bSendHtml);
        this.m_aszUserList[this.m_iIndex].bSendHtml = bSendHtml;
        
        this.m_DebugLog.Write("MailDotCom-Pref-Accounts : rgAltOnChange - END");
    },
}
