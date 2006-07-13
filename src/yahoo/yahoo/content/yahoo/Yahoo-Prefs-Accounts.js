var gPrefAccounts =
{
    m_cszYahooContentID : "@mozilla.org/YahooPOP;1",
    m_DebugLog : new DebugLog("webmail.logging.comms", 
                              "{3c8e8390-2cf6-11d9-9669-0800200c9a66}",
                              "YahooPrefs"),
    m_aszUserList : null,
    m_aszPrefsList : null,
    m_bDefaultUnread : false,
    m_bDefaultSentItems : false,
    m_bDefaultSpam : false,
    m_iIndex : -1,
                   
    init : function()
    {
        try
        {
            this.m_DebugLog.Write("Yahoo-Pref-Accounts : Init - START");

            this.m_strBundle = document.getElementById("stringYahooFolders");
            
            //get defaults
            var WebMailPrefAccess = new WebMailCommonPrefAccess();
            var oPref = {Value : null};
            
            WebMailPrefAccess.Get("bool","yahoo.bDownloadUnread",oPref);
            this.m_bDefaultUnread = oPref.Value;
            this.m_DebugLog.Write("Yahoo-Pref-Accounts : Init - this.m_bDefaultUnread "+this.m_bDefaultUnread );
            oPref.Value = null;
            
            WebMailPrefAccess.Get("bool","yahoo.bSaveCopy",oPref);
            this.m_bDefaultSentItems = oPref.Value;
            this.m_DebugLog.Write("Yahoo-Pref-Accounts : Init - this.m_bDefaultSentItems "+this.m_bDefaultSentItems );
            oPref.Value = null;
            
            WebMailPrefAccess.Get("bool","yahoo.bUseJunkMail",oPref);
            this.m_bDefaultSpam = oPref.Value;
            this.m_DebugLog.Write("Yahoo-Pref-Accounts : Init - this.m_bDefaultSpam "+this.m_bDefaultSpam );
            oPref.Value = null;

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
            
            this.m_DebugLog.Write("Yahoo-Pref-Accounts : Init - END");
        }
        catch(e)
        {
             this.m_DebugLog.DebugDump("Yahoo-Pref-Accounts : Exception in init : " 
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
            this.m_DebugLog.Write("Yahoo-Pref-Accounts : onOK - START");
            
            if (this.m_aszUserList.length>0)
            {
                //write prefs
                var WebMailPrefAccess = new WebMailCommonPrefAccess();
        
                for (var i=0; i<this.m_aszUserList.length; i++)
                {
                    WebMailPrefAccess.Set("char","yahoo.Account."+i+".user",this.m_aszUserList[i].szUser);
                    this.m_DebugLog.Write("Yahoo-Pref-Accounts.js - onOK - user " + this.m_aszUserList[i].szUser);
                    
                    WebMailPrefAccess.Set("bool","yahoo.Account."+i+".bDownloadUnread",this.m_aszUserList[i].bUnread);
                    this.m_DebugLog.Write("Yahoo-Pref-Accounts.js - onOK - bDownloadUnread " + this.m_aszUserList[i].bUnread); 
                    
                    WebMailPrefAccess.Set("bool","yahoo.Account."+i+".bUseJunkMail",this.m_aszUserList[i].bJunkMail);
                    this.m_DebugLog.Write("Yahoo-Pref-Accounts.js - onOK - bUseJunkMail " + this.m_aszUserList[i].bJunkMail);
                    
                    WebMailPrefAccess.Set("bool","yahoo.Account."+i+".bSaveCopy",this.m_aszUserList[i].bSaveSentItem);
                    this.m_DebugLog.Write("Yahoo-Pref-Accounts.js - onOK - bSaveCopy " + this.m_aszUserList[i].bSaveSentItem);
                    
                    WebMailPrefAccess.Set("bool","yahoo.Account."+i+".bBeta",this.m_aszUserList[i].bBeta);
                    this.m_DebugLog.Write("Yahoo-Pref-Accounts.js - onOK - bBeta " + this.m_aszUserList[i].bBeta);
                    
                    var szFolders = "";
                    if (this.m_aszUserList[i].aszFolder)
                    {
                        for (var j=0; j<this.m_aszUserList[i].aszFolder.length; j++)
                        {
                            szFolders += this.m_aszUserList[i].aszFolder[j];
                            if (j!=this.m_aszUserList[i].aszFolder.length-1) szFolders += "\r";
                        }
                    }
                    WebMailPrefAccess.Set("char","yahoo.Account."+i+".szFolders",szFolders);
                    this.m_DebugLog.Write("Yahoo-Pref-Accounts.js - onOK - szFolders " + szFolders);   
                }
                WebMailPrefAccess.Set("int","yahoo.Account.Num",this.m_aszUserList.length);
            }
            
            this.m_DebugLog.Write("Yahoo-Pref-Accounts : onOK - END");
        }
        catch(e)
        {
            this.m_DebugLog.DebugDump("Yahoo-Pref-Accounts : Exception in onOK : " 
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
            this.m_DebugLog.Write("Yahoo-Pref-Accounts : getAccountPrefs - START");
             
            var WebMailPrefAccess = new WebMailCommonPrefAccess();
            var oPref = {Value : null};
            
            if (WebMailPrefAccess.Get("int","yahoo.Account.Num",oPref))
            {
                var iAccountNum = oPref.Value;
                this.m_DebugLog.Write("Yahoo-Pref-Accounts.js - getAccountPrefs num " + iAccountNum);
                
                if(iAccountNum>0)
                {
                    this.m_aszPrefsList = new Array();
                    
                    for (i=0; i<iAccountNum; i++)
                    {
                        var oData = new PrefData();
                        this.m_DebugLog.Write("Yahoo-Pref-Accounts.js - getAccountPrefs - i " + i);
                        
                        //get email address
                        oPref.Value = null;
                        WebMailPrefAccess.Get("char","yahoo.Account."+i+".user",oPref);
                        oData.szUser = oPref.Value;
                        this.m_DebugLog.Write("Yahoo-Pref-Accounts.js - getAccountPrefs - oData.szUser " + oData.szUser);
                        
                        //get unread
                        oPref.Value = null;
                        WebMailPrefAccess.Get("bool","yahoo.Account."+i+".bDownloadUnread",oPref);
                        oData.bUnread = oPref.Value;
                        this.m_DebugLog.Write("Yahoo-Pref-Accounts.js - getAccountPrefs - oData.bUnread " + oData.bUnread);
                                                
                        //get junkmail
                        oPref.Value = null;
                        WebMailPrefAccess.Get("bool","yahoo.Account."+i+".bUseJunkMail",oPref);
                        oData.bJunkMail = oPref.Value;
                        this.m_DebugLog.Write("Yahoo-Pref-Accounts.js - getAccountPrefs - oData.bJunkMail " + oData.bJunkMail);
                                              
                        //get SaveSentItems
                        oPref.Value = null;
                        WebMailPrefAccess.Get("bool","yahoo.Account."+i+".bSaveCopy",oPref);
                        oData.bSaveSentItem = oPref.Value;
                        this.m_DebugLog.Write("Yahoo-Pref-Accounts.js - getAccountPrefs - oData.bSaveSentItem " + oData.bSaveSentItem);
                        
                         //get bBeta
                        oPref.Value = null;
                        WebMailPrefAccess.Get("bool","yahoo.Account."+i+".bBeta",oPref);
                        oData.bBeta = oPref.Value;
                        this.m_DebugLog.Write("Yahoo-Pref-Accounts.js - getAccountPrefs - oData.bBeta " + oData.bBeta);
     
                        //get szFolders
                        oPref.Value = null;
                        WebMailPrefAccess.Get("char","yahoo.Account."+i+".szFolders",oPref);
                        if (oPref.Value)
                        {
                            var aFolders = oPref.Value.split("\r");
                            oData.aszFolder = new Array();
                            for (var j=0; j<aFolders.length; j++)
                            {
                                if (aFolders[j].length>0)
                                    oData.aszFolder.push(aFolders[j]);
                            } 
                            this.m_DebugLog.Write("Yahoo-Pref-Accounts.js - getAccountPrefs - oData.szFolders " + oData.aszFolder);   
                        }
                        
                        this.m_aszPrefsList.push(oData);
                    }
                }
            }
            
            this.m_DebugLog.Write("Yahoo-Pref-Accounts : getAccountPrefs - END");
            return true;
        }
        catch(e)
        {
             this.m_DebugLog.DebugDump("Yahoo-Pref-Accounts : Exception in getAccountPrefs : " 
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
            this.m_DebugLog.Write("Yahoo-Pref-Accounts : getAccountList - START");

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
                    this.m_DebugLog.Write("Yahoo-Pref-Accounts : getUserNameList - userName " + szUserName);
                    if (szUserName)
                    {
                        if (szUserName.search(/@/)==-1) 
                        {
                            szUserName = currentServer.realUsername ;
                            this.m_DebugLog.Write("Yahoo-Pref-Accounts  : getUserNameList - realuserName " + szUserName);
                        }
                        
                        if (szUserName.search(/@/)!=-1)
                        {
                            var szDomain = szUserName.split("@")[1];
                            this.m_DebugLog.Write("Yahoo-Pref-Accounts : getUserNameList - szDomain " + szDomain);
                           
                            var szContentID ={value:null};
                            if (domainManager.getDomainForProtocol(szDomain,"pop", szContentID))//domain found
                            {
                                if (szContentID.value == this.m_cszYahooContentID) //yahoo account found
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
                                                data.bBeta = this.m_aszPrefsList[j].bBeta;
                                                this.m_DebugLog.Write("Yahoo-Pref-Accounts : getUserNameList - bBeta " + data.bBeta);
                                                
                                                data.bJunkMail = this.m_aszPrefsList[j].bJunkMail;
                                                this.m_DebugLog.Write("Yahoo-Pref-Accounts : getUserNameList - bJunkFolder " + data.bJunkMail);
                                              
                                                data.aszFolder = this.m_aszPrefsList[j].aszFolder;
                                                this.m_DebugLog.Write("Yahoo-Pref-Accounts : getUserNameList - aszFolder " + data.aszFolder);
                                              
                                                data.bUnread = this.m_aszPrefsList[j].bUnread;
                                                this.m_DebugLog.Write("Yahoo-Pref-Accounts : getUserNameList - bUnread " + data.bUnread);
                                              
                                                data.bSaveSentItem = this.m_aszPrefsList[j].bSaveSentItem;
                                                this.m_DebugLog.Write("Yahoo-Pref-Accounts : getUserNameList - bSaveSentItem " + data.bSaveSentItem);
                                                bFound= true;
                                            }
                                        }
                                    }
                                   
                                   if (!bFound)//prefs not found 
                                    {
                                        data.bJunkMail = this.m_bDefaultSpam;
                                        this.m_DebugLog.Write("Yahoo-Pref-Accounts : getUserNameList - default spam " + data.bJunkMail);                                        
                                       
                                        data.bUnread = this.m_bDefaultUnread;
                                        this.m_DebugLog.Write("Yahoo-Pref-Accounts : getUserNameList - default bUnread " + data.bUnread);
                                       
                                        data.bSaveSentItem = this.m_bDefaultSentItems;
                                        this.m_DebugLog.Write("Yahoo-Pref-Accounts : getUserNameList - default bSaveSentItem " + data.bSaveSentItem);
                                    }
                                                                       
                                    this.m_DebugLog.Write("Yahoo-Pref-Accounts : getUserNameList - userName added");    
                                    this.m_aszUserList.push(data);   
                                } 
                            }
                        }
                    }
                }
            }

            this.m_DebugLog.Write("Yahoo-Pref-Accounts : getAccountList - END");
            return true;
        }
        catch(e)
        {
            this.m_DebugLog.DebugDump("Yahoo-Pref-Accounts : Exception in getAccountList : " 
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
            this.m_DebugLog.Write("Yahoo-Pref-Accounts : userAdd - START");
                  
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
                    newItem.setAttribute("src","chrome://yahoo/skin/person.png");
                    newItem.setAttribute("oncommand","gPrefAccounts.userClick()"); 
                    list.appendChild(newItem);
                }
            }
            
            this.m_DebugLog.Write("Yahoo-Pref-Accounts : userAdd - END");
        }
        catch(err)
        {
            this.m_DebugLog.DebugDump("Yahoo-Pref-Accounts : Exception in userAdd : " 
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
            this.m_DebugLog.Write("Yahoo-Pref-Accounts : userClick - START");
                        
            var listView = document.getElementById("menuAccounts");   //click item
            this.m_iIndex = listView.selectedIndex;
            this.m_DebugLog.Write("Yahoo-Pref-Accounts : userListDBClick - iIndex "+this.m_iIndex);
            
            if (this.m_aszUserList.length>0)
            {
                var data = this.m_aszUserList[this.m_iIndex];
                this.m_DebugLog.Write("Yahoo-Pref-Accounts : userListDBClick -  data.szUser "+ data.szUser);
                
                this.m_DebugLog.Write("Yahoo-Pref-Accounts : userClick -  data.bBeta "+ data.bBeta);
                document.getElementById("radiogroupMode").selectedIndex = data.bBeta? 1 : 0;
                
                document.getElementById("chkDownloadUnread").checked = data.bUnread;
                this.m_DebugLog.Write("Yahoo-Pref-Accounts : userListDBClick -  data.bUnread "+ data.bUnread);
               
                document.getElementById("chkJunkMail").checked = data.bJunkMail;
                this.m_DebugLog.Write("Yahoo-Pref-Accounts : userListDBClick -  data.bJunkFolder "+ data.bJunkMail);
               
                document.getElementById("chkSentItems").checked = data.bSaveSentItem;
                this.m_DebugLog.Write("Yahoo-Pref-Accounts : userListDBClick -  data.bSaveSentItem "+ data.bSaveSentItem);
                
                //clear list
                var listFolders = document.getElementById("listFolders");
                var iRowCount = listFolders.getRowCount()
                for (var i=0; i<iRowCount; i++)
                {
                    this.m_DebugLog.Write("Yahoo-Pref-Accounts : userClick - removing " + i);
                    var item = listFolders.getItemAtIndex(0);
                    listFolders.removeChild(item);
                }
                
                //add folder details
                this.m_DebugLog.Write("Yahoo-Pref-Accounts : userClick - data.aszFolder " + data.aszFolder);
                if (data.aszFolder) 
                {       
                    for (var i=0; i<data.aszFolder.length; i++)
                    {
                        this.m_DebugLog.Write("Yahoo-Pref-Accounts : userListDBClick - data.aszFolder " + data.aszFolder[i] + " i "+i);
                        this.addItemFolderList(data.aszFolder[i]);
                    }
                }
            }
            this.m_DebugLog.Write("Yahoo-Pref-Accounts : userClick - END");
        }
        catch(e)
        {
             this.m_DebugLog.DebugDump("Yahoo-Pref-Accounts : Exception in userClick : " 
                                          + e.name + 
                                          ".\nError message: " 
                                          + e.message + "\n"
                                          + e.lineNumber);
        }
    },



/**********************************************************************/
//Deck Mode Panel
/**********************************************************************/    


    rgModeOnChange : function ()
    {
        this.m_DebugLog.Write("Yahoo-Pref-Accounts : rgModeOnChange - START");
        
        var iMode = document.getElementById("radiogroupMode").value;
        this.m_DebugLog.Write("Yahoo-Pref-Accounts : rgModeOnChange -  iMode "+ iMode);
        this.m_aszUserList[this.m_iIndex].bBeta = iMode==1? true : false;
                
        this.m_DebugLog.Write("Yahoo-Pref-Accounts : rgModeOnChange - END");
    },
    




/**********************************************************************/
//Deck POP Panel
/**********************************************************************/    
    folderListSelect : function ()
    {
        try
        {
            this.m_DebugLog.Write("Yahoo-Pref-Accounts : folderListSelect - START");

            var listView = document.getElementById("listFolders");   //click item
            var iIndex = listView.selectedIndex;
            this.m_DebugLog.Write("Yahoo-Pref-Accounts : folderListSelect - iIndex "+iIndex);
            
            var buttonRemove = document.getElementById("removeFolderList");   
            buttonRemove.setAttribute("disabled", iIndex!=-1? false : true);
                
            this.m_DebugLog.Write("YYahoo-Pref-Accounts : folderListSelect - END");
            return true;
        }
        catch(e)
        {
            this.m_DebugLog.DebugDump("Yahoo-Pref-Accounts : Exception in folderListSelect : " 
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
            this.m_DebugLog.Write("YYahoo-Pref-Accounts : addItemFolderList - START " + szName);
            
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
            this.m_DebugLog.Write("YYahoo-Pref-Accounts : addItemFolderList - END");
            return true;
        }
        catch(e)
        {
             this.m_DebugLog.DebugDump("Yahoo-Pref-Accounts : Exception in addItemFolderList : " 
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
            this.m_DebugLog.Write("Yahoo-Pref-Accounts : folderListAdd - START");
            var oResult = {value : -1};
            var oParam = {szfolder : null};
            window.openDialog("chrome://yahoo/content/Yahoo-Prefs-Folders-Add.xul",
                              "Add",
                              "chrome, centerscreen, modal",
                              oParam,
                              oResult);  
        
            this.m_DebugLog.Write("Yahoo-Pref-Accounts: folderListAdd oResult.value " + oResult.value);
            
            if (oResult.value!=-1)
            {
                this.m_DebugLog.Write("Yahoo-Pref-Accounts : folderListAdd oParam.szfolder " + oParam.szFolder);
                
                //add to array
                if(!this.m_aszUserList[this.m_iIndex].aszFolder)
                    this.m_aszUserList[this.m_iIndex].aszFolder = new Array();
                    
                this.m_aszUserList[this.m_iIndex].aszFolder.push(oParam.szFolder);
                this.m_DebugLog.Write("Yahoo-Pref-Accounts : folderListAdd aszFolder" + this.m_aszUserList[this.m_iIndex].aszFolder);
               
                //add item to list
                this.addItemFolderList(oParam.szFolder);
                
                var event = document.createEvent("Events");
                event.initEvent("change", false, true);
                document.getElementById("listFolders").dispatchEvent(event);
            }
            this.m_DebugLog.Write("YYahoo-Pref-Accounts : folderListAdd - END");
        }
        catch(e)
        {
             this.m_DebugLog.DebugDump("Yahoo-Pref-Accounts : Exception in folderListAdd : " 
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
            this.m_DebugLog.Write("YYahoo-Pref-Accounts : doRemove - START");
            
            //get selected item
            var listView = document.getElementById("listFolders");   //click item
            var iIndex = listView.selectedIndex;
            this.m_DebugLog.Write("YYahoo-Pref-Accounts : doRemove - iIndex "+iIndex);
            
            //remove from array
            for (i=0; this.m_aszUserList[this.m_iIndex].aszFolder.length>i; i++)
            {
                var temp = this.m_aszUserList[this.m_iIndex].aszFolder.shift();
                this.m_DebugLog.Write("YYahoo-Pref-Accounts : doRemove - temp "+temp);
                
                if (i!= iIndex)
                {
                    this.m_aszUserList[this.m_iIndex].aszFolder.push(temp);
                    this.m_DebugLog.Write("YYahoo-Pref-Accounts : doRemove - pushed back ");
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
            this.m_DebugLog.Write("YYahoo-Pref-Accounts : folderListRemove - END");
            return true;
        }
        catch(e)
        {
            this.m_DebugLog.DebugDump("Yahoo-Pref-Accounts : Exception in folderListRemove : " 
                                          + e.name + 
                                          ".\nError message: " 
                                          + e.message + "\n"
                                          + e.lineNumber);
        }
    },
    
        
    chkDownloadUreadOnChange : function ()
    {
        this.m_DebugLog.Write("YYahoo-Pref-Accounts : chkDownloadUreadOnChange - START");
        
        var bUnread = document.getElementById("chkDownloadUnread").checked;
        this.m_DebugLog.Write("Yahoo-Pref-Accounts : chkDownloadUreadOnChange -  bUnread "+ !bUnread);
        this.m_aszUserList[this.m_iIndex].bUnread = !bUnread;        
        this.m_DebugLog.Write("YYahoo-Pref-Accounts : chkDownloadUreadOnChange - END");
    },
 
    
    chkJunkMailOnChange : function ()
    {
        this.m_DebugLog.Write("Yahoo-Pref-Accounts : chkJunkMailOnChange - START");
        
        var bJunkMail = document.getElementById("chkJunkMail").checked;
        this.m_DebugLog.Write("Yahoo-Pref-Accounts : chkJunkMailOnChange bJunkMail"+ !bJunkMail);
        this.m_aszUserList[this.m_iIndex].bJunkMail = !bJunkMail;      
        this.m_DebugLog.Write("Yahoo-Pref-Accounts : chkJunkMailOnChange - END");
    },
 
 
 
/**********************************************************************/
//Deck SMTP Panel
/**********************************************************************/    
    chkSentItemsOnChange : function ()
    {
        this.m_DebugLog.Write("Yahoo-Pref-Accounts : chkSentItemsOnChange - START");
        
        var bSaveItem = document.getElementById("chkSentItems").checked;
        this.m_DebugLog.Write("Yahoo-Pref-Accounts : chkSentItemsOnChange -  bSaveItem "+ !bSaveItem);
        this.m_aszUserList[this.m_iIndex].bSaveSentItem = !bSaveItem;       
        this.m_DebugLog.Write("Yahoo-Pref-Accounts : chkSentItemsOnChange - END");
    },
}
