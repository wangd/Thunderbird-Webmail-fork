var gPrefAccounts =
{
    m_cszHotmailPOPContentID : "@mozilla.org/HotmailPOP;1",
    m_cszHotmailIMAPContentID : "@mozilla.org/HotmailIMAP;1",
    m_DebugLog : new DebugLog("webmail.logging.comms",
                              "{3c8e8390-2cf6-11d9-9669-0800200c9a66}",
                              "HotmailPrefs"),
    m_aszUserList : null,
    m_iIndex : 0,
    m_bInit : false,



    init : function()
    {
        try
        {
            this.m_DebugLog.Write("Hotmail-Pref-Accounts : Init - START");

            this.m_bInit = true;

            //load data
            this.getUserNames();
            this.createUserDropDown();

            if (this.m_aszUserList.length>0) //select first item
            {
                document.getElementById("menuAccounts").selectedIndex = this.m_iIndex;
            }
           else //disable elements
            {
                document.getElementById("boxAccounts").setAttribute("hidden", true);
                document.getElementById("boxError").setAttribute("hidden", false);
            }

            this.selectUserName();

            var iSelected = document.getElementById("selectedTabIndex").value;
            this.m_DebugLog.Write("Hotmail-Pref-Accounts : Init - iSelected " + iSelected);
            if (iSelected != null)
                document.getElementById("tabsAccount").selectedIndex = iSelected;

            this.m_DebugLog.Write("Hotmail-Pref-Accounts : Init - END");
        }
        catch(e)
        {
             this.m_DebugLog.DebugDump("Hotmail-Pref-Accounts : Exception in init : "
                                          + e.name +
                                          ".\nError message: "
                                          + e.message + "\n"
                                          + e.lineNumber);
        }
    },



    getUserNames : function ()
    {
        try
        {
            this.m_DebugLog.Write("Hotmail-Pref-Accounts : getUserNames - START");

            this.m_aszUserList =  new Array();
            var accountManager = Components.classes["@mozilla.org/messenger/account-manager;1"]
                                           .getService(Components.interfaces.nsIMsgAccountManager);

            var domainManager = Components.classes["@mozilla.org/DomainManager;1"]
                                          .getService(Components.interfaces.nsIDomainManager);

            var allServers = accountManager.allServers;

            for (var i=0; i < allServers.Count(); i++)
            {
                var currentServer = allServers.GetElementAt(i)
                                              .QueryInterface(Components.interfaces.nsIMsgIncomingServer);

                var szType = currentServer.type;
                this.m_DebugLog.Write("Hotmail-Pref-Accounts  : getUserNames - type " +szType );             
                if (szType.search(/pop3/i)!=-1 || szType.search(/imap/i)!=-1)  //found pop account
                {
                    var szUserName = currentServer.realUsername;
                    szUserName = szUserName.replace(/\s/,"");  //removes non print chars
                    this.m_DebugLog.Write("Hotmail-Pref-Accounts : getUserNames - userName " + szUserName);
                    if (szUserName)
                    {
                        if (szUserName.search(/@/)==-1)
                        {
                            szUserName = currentServer.username;
                            szUserName = szUserName.replace(/\s/,"");  //removes non print chars
                            this.m_DebugLog.Write("Hotmail-Pref-Accounts  : getUserNames - realuserName " + szUserName);
                        }

                        if (szUserName.search(/@/)!=-1)
                        {
                            var szDomain = szUserName.split("@")[1];
                            this.m_DebugLog.Write("Hotmail-Pref-Accounts : getUserNames - szDomain " + szDomain);

                            var szContentID ={value:null};
                            var iType = 0 ;   //default po                    
                            var bDomainCheck = domainManager.getDomainForProtocol(szDomain, "pop", szContentID);                               
                            if (bDomainCheck)//domain found
                            {
                                if (szContentID.value == this.m_cszHotmailPOPContentID) //Hotmail account found
                                {
                                   this.m_DebugLog.Write("Hotmail-Pref-Accounts : getUserNames - userName raw " + szUserName);

                                   //clean username
                                   if (szUserName.search(/^.*?\:.*?\:(.*?@.*?)$/)!=-1)  //POPFile
                                       szUserName = szUserName.match(/^.*?\:.*?\:(.*?@.*?)$/)[1];
                                   else if (szUserName.search(/^(.*?@.*?)#.*?/)!=-1) //SpamTerminator Avast
                                       szUserName = szUserName.match(/^(.*?@.*?)#.*?/)[1];
                                   else if (szUserName.search(/^(.*?@.*?)@.*?/)!=-1) //SpamPal
                                       szUserName = szUserName.match(/^(.*?@.*?)@.*?/)[1];
                                   else if (szUserName.search(/.*?\/.*?\/(.*?@.*?)$/)!=-1) //K9
                                       szUserName = szUserName.match(/.*?\/.*?\/(.*?@.*?)$/)[1];
                                   else if (szUserName.search(/^.*?&(.*?@.*?)&.*?$/)!=-1) //SpamHilator
                                       szUserName = szUserName.match(/^.*?&(.*?@.*?)&.*?$/)[1];

                                   var oUserData = new userData();
                                   oUserData.szUsername = szUserName;
                                   oUserData.iType = iType;
				                   //szUserName += " (" + currentServer.type.toUpperCase() + ")";
                                   this.m_DebugLog.Write("Hotmail-Pref-Accounts : getUserNames - userName clean " + szUserName);
                                   oUserData.szDisplayName = szUserName;
                                   this.m_aszUserList.push(oUserData);
                                }
                            }
                        }
                    }
                }
            }

            this.m_DebugLog.Write("Hotmail-Pref-Accounts : getUserNames - END");
            return true;
        }
        catch(e)
        {
            this.m_DebugLog.DebugDump("Hotmail-Pref-Accounts : Exception in getUserNames : "
                                          + e.name +
                                          ".\nError message: "
                                          + e.message + "\n"
                                          + e.lineNumber);
        }
    },




    selectUserName : function ()
    {
        try
        {
            this.m_DebugLog.Write("Hotmail-Pref-Accounts : selectUserName - START");

            var listView = document.getElementById("menuAccounts");   //click item
            this.m_iIndex = listView.selectedIndex;
            this.m_DebugLog.Write("Hotmail-Pref-Accounts : selectUserName - iIndex "+this.m_iIndex);

            if (this.m_aszUserList.length>0)
            {
                var szUserName = this.m_aszUserList[this.m_iIndex].szUsername.toLowerCase();
		        var iType = this.m_aszUserList[this.m_iIndex].iType;
		        
                document.getElementById("selectedUserName").value = szUserName;
                szUserName = szUserName.replace(/\./g,"~");
                this.m_DebugLog.Write("Hotmail-Pref-Accounts : selectUserName -  szUserName "+ szUserName);

                var prefAccess = new WebMailCommonPrefAccess();
                var oPref = {Value : null};
                                  
                //download unread
                if (!prefAccess.Get("bool","hotmail.Account."+szUserName+".bDownloadUnread",oPref))
                   oPref.Value = false; //Default
                this.m_DebugLog.Write("Hotmail-Pref-Accounts : selectUserName -  bUnread "+ oPref.Value);
                document.getElementById("chkDownloadUnread").checked = oPref.Value;
                if (oPref.Value)
                {
                    document.getElementById("chkMarkAsRead").checked = true;
                    document.getElementById("chkMarkAsRead").setAttribute("disabled", true);
                }

                //mark asread
                if (!prefAccess.Get("bool","hotmail.Account."+szUserName+".bMarkAsRead",oPref))
                   oPref.Value = true; //Default
                this.m_DebugLog.Write("Hotmail-Pref-Accounts.js - selectUserName - bMarkAsRead " + oPref.Value);
                document.getElementById("chkMarkAsRead").checked = oPref.Value;

                //download junk mail
                if (!prefAccess.Get("bool","hotmail.Account."+szUserName+".bUseJunkMail",oPref))
                   oPref.Value = false; //Default
                this.m_DebugLog.Write("Hotmail-Pref-Accounts : selectUserName -  bJunkFolder "+ oPref.Value);
                document.getElementById("chkJunkMail").checked = oPref.Value;
                
                //Send HTML
                if (!prefAccess.Get("bool","hotmail.Account."+szUserName+".bSendHtml",oPref))
                   oPref.Value = false; //Default
                this.m_DebugLog.Write("Hotmail-Pref-Accounts : selectUserName -  data.bSendHtml "+ oPref.Value);
                document.getElementById("radiogroupAlt").selectedIndex = oPref.Value?1:0;


                //clear Folder list
                var listFolders = document.getElementById("listFolders");
                var iRowCount = listFolders.getRowCount()
                for (var i=0; i<iRowCount; i++)
                {
                    this.m_DebugLog.Write("Hotmail-Pref-Accounts : selectUserName - removing " + i);
                    var item = listFolders.getItemAtIndex(0);
                    listFolders.removeChild(item);
                }

                //add folder details
                if (!prefAccess.Get("char","hotmail.Account."+szUserName+".szFolders",oPref))
                   oPref.Value = null; //Default
                this.m_DebugLog.Write("Hotmail-Pref-Accounts : selectUserName - aszFolder " + oPref.Value);
                if (oPref.Value)
                {
                    var aFolders = oPref.Value.split("\r");
                    for (var j=0; j<aFolders.length; j++)
                    {
                        this.m_DebugLog.Write("Hotmail-Pref-Accounts : selectUserName - aszFolder " + aFolders[j] + " j "+j);
                        if (aFolders[j].length>0)
                            this.addItemFolderList(aFolders[j]);
                    }
                }

                
                //Save Copy in sent items
                if (!prefAccess.Get("bool","hotmail.Account."+szUserName+".bSaveCopy",oPref))
                   oPref.Value = false; //Default
                this.m_DebugLog.Write("Hotmail-Pref-Accounts : selectUserName -  bSaveCopy "+ oPref.Value);
                document.getElementById("chkSentItems").checked = oPref.Value;
            }
            this.m_DebugLog.Write("Hotmail-Pref-Accounts : selectUserName - END");
        }
        catch(e)
        {
             this.m_DebugLog.DebugDump("Hotmail-Pref-Accounts : Exception in selectUserName : "
                                          + e.name +
                                          ".\nError message: "
                                          + e.message + "\n"
                                          + e.lineNumber);
        }
    },




    createUserDropDown : function ()
    {
        try
        {
            this.m_DebugLog.Write("Hotmail-Pref-Accounts : createUserDropDown - START");
            
            var szLastUserName = document.getElementById("selectedUserName").value;
            var regExp = new RegExp("^"+ szLastUserName + "$","i");

            var list = document.getElementById("popupAccounts");
            if (this.m_aszUserList.length > 0)
            {
                for(i =0 ; i< this.m_aszUserList.length; i++)
                {
                    var szDisplayName = this.m_aszUserList[i].szDisplayName;
                    var iType = this.m_aszUserList[i].iType;
                    var szUserName = this.m_aszUserList[i].szUsername;
                    if (szUserName.search(regExp)!= -1) this.m_iIndex = i;
                    var newItem = document.createElement("menuitem");
                    newItem.setAttribute("id", szDisplayName);
                    newItem.setAttribute("label", szDisplayName);
                    newItem.setAttribute("class", "menuitem-iconic");
                    newItem.setAttribute("src","chrome://hotmail/skin/person.png");
                    newItem.setAttribute("oncommand","gPrefAccounts.selectUserName()");
                    list.appendChild(newItem);
                }
            }
            this.m_DebugLog.Write("Hotmail-Pref-Accounts : createUserDropDown - iIndex "+this.m_iIndex);

            this.m_DebugLog.Write("Hotmail-Pref-Accounts : createUserDropDown - END");
        }
        catch(err)
        {
            this.m_DebugLog.DebugDump("Hotmail-Pref-Accounts : Exception in createUserDropDown : "
                                       + err.name +
                                       ".\nError message: "
                                       + err.message + "\n"
                                       + err.lineNumber);
        }
    },



   tabSelectionChanged : function ()
   {
       this.m_DebugLog.Write("Hotmail-Pref-Accounts : tabSelectionChanged - START");

       if (!this.m_bInit) return;
      
       var iIndex = document.getElementById("tabsAccount").selectedIndex;
       this.m_DebugLog.Write("Hotmail-Pref-Accounts : tabSelectionChanged - iIndex " + iIndex);
       var preference = document.getElementById("selectedTabIndex");
       preference.value = iIndex;

       this.m_DebugLog.Write("Hotmail-Pref-Accounts : tabSelectionChanged - END");
   },



/**********************************************************************/
//Deck POP Panel
/**********************************************************************/
    chkDownloadUreadOnChange : function ()
    {
        this.m_DebugLog.Write("Hotmail-Pref-Accounts : chkDownloadUreadOnChange - START");

        var bUnread = document.getElementById("chkDownloadUnread").checked ? false : true;
        this.m_DebugLog.Write("Hotmail-Pref-Accounts : chkDownloadUreadOnChange -  bUnread "+ bUnread);

        var szUserName = this.m_aszUserList[this.m_iIndex].szUsername.toLowerCase();
        szUserName = szUserName.replace(/\./g,"~");
        this.m_DebugLog.Write("Hotmail-Pref-Accounts : chkDownloadUreadOnChange -  username "+ szUserName);

        //write pref
        var prefAccess = new WebMailCommonPrefAccess();
        prefAccess.Set("bool","hotmail.Account."+szUserName+".bDownloadUnread",bUnread);


        if (bUnread)
        {
            document.getElementById("chkMarkAsRead").checked = true;
            prefAccess.Set("bool","hotmail.Account."+szUserName+".bMarkAsRead",true);
            document.getElementById("chkMarkAsRead").setAttribute("disabled", true);
        }
        else
        {
            document.getElementById("chkMarkAsRead").setAttribute("disabled", false);
        }

        this.m_DebugLog.Write("Hotmail-Pref-Accounts : chkDownloadUreadOnChange - END");
    },


    chkMarkAsReadOnChange : function ()
    {
        this.m_DebugLog.Write("Hotmail-Pref-Accounts : chkMaskAsReadOnChange - START");

        var bMarkAsRead = document.getElementById("chkMarkAsRead").checked ? false : true;
        this.m_DebugLog.Write("Hotmail-Pref-Accounts : chkMaskAsReadOnChange -  bMarkAsRead "+ bMarkAsRead);

        var szUserName = this.m_aszUserList[this.m_iIndex].szUsername.toLowerCase();
        szUserName = szUserName.replace(/\./g,"~");
        this.m_DebugLog.Write("Hotmail-Pref-Accounts : chkDownloadUreadOnChange -  username "+ szUserName);

        var prefAccess = new WebMailCommonPrefAccess();
        prefAccess.Set("bool","hotmail.Account."+szUserName+".bMarkAsRead",bMarkAsRead);

        this.m_DebugLog.Write("Hotmail-Pref-Accounts : chkMaskAsReadOnChange - END");
    },



    chkJunkMailOnChange : function ()
    {
        this.m_DebugLog.Write("Hotmail-Pref-Accounts : chkJunkMailOnChange - START");

        var bJunkMail = document.getElementById("chkJunkMail").checked ? false:true;
        this.m_DebugLog.Write("Hotmail-Pref-Accounts : chkJunkMailOnChange bJunkMail"+ bJunkMail);

        var szUserName = this.m_aszUserList[this.m_iIndex].szUsername.toLowerCase();
        szUserName = szUserName.replace(/\./g,"~");
        this.m_DebugLog.Write("Hotmail-Pref-Accounts : chkJunkMailOnChange -  username "+ szUserName);

        var prefAccess = new WebMailCommonPrefAccess();
        prefAccess.Set("bool","hotmail.Account."+szUserName+".bUseJunkMail",bJunkMail);

        this.m_DebugLog.Write("Hotmail-Pref-Accounts : chkJunkMailOnChange - END");
    },



    addFolderList : function ()
    {
        try
        {
            this.m_DebugLog.Write("Hotmail-Pref-Accounts : folderListAdd - START");
            var oResult = {value : -1};
            var oParam = {szfolder : null};
            window.openDialog("chrome://hotmail/content/Hotmail-Prefs-Folders-Add.xul",
                              "Add",
                              "chrome, centerscreen, modal",
                              oParam,
                              oResult);

            this.m_DebugLog.Write("Hotmail-Pref-Accounts: folderListAdd oResult.value " + oResult.value);

            if (oResult.value!=-1)
            {
                this.m_DebugLog.Write("Hotmail-Pref-Accounts : folderListAdd oParam.szfolder " + oParam.szFolder);

                var szUserName = this.m_aszUserList[this.m_iIndex].szUsername.toLowerCase();
                szUserName = szUserName.replace(/\./g,"~");
                this.m_DebugLog.Write("Hotmail-Pref-Accounts : folderListAdd -  username "+ szUserName);

                var szFolder = "";
                var bFound = false;
                var oPref = {Value : null };
                var prefAccess = new WebMailCommonPrefAccess();
                prefAccess.Get("char","hotmail.Account."+szUserName+".szFolders",oPref);
                if (oPref.Value)
                {
                    var aFolders = oPref.Value.split("\r");
                    this.m_DebugLog.Write("Hotmail-Pref-Accounts : folderListAdd -  aFolders "+ aFolders);
                    for (var j=0; j<aFolders.length; j++)
                    {
                        var regExp = new RegExp("^"+oParam.szFolder+"$","i");
                        if (aFolders[j].length>0 && aFolders[j].search(regExp)==-1)
                        {
                            szFolder += aFolders[j] +"\r";
                        }

                        if (aFolders[j].search(regExp)!=-1)bFound = true;
                    }
                }

                if (!bFound)
                {
                    szFolder += oParam.szFolder +"\r";           //add item to pref list
                    this.m_DebugLog.Write("Hotmail-Pref-Accounts.js - getAccountPrefs - szFolder " + szFolder);
                    prefAccess.Set("char","hotmail.Account."+szUserName+".szFolders",szFolder);

                    this.addItemFolderList(oParam.szFolder);   //add item to list

                    //refresh list
                    var event = document.createEvent("Events");
                    event.initEvent("change", false, true);
                    document.getElementById("listFolders").dispatchEvent(event);
                }
            }
            this.m_DebugLog.Write("YHotmail-Pref-Accounts : folderListAdd - END");
        }
        catch(e)
        {
             this.m_DebugLog.DebugDump("Hotmail-Pref-Accounts : Exception in folderListAdd : "
                                          + e.name +
                                          ".\nError message: "
                                          + e.message + "\n"
                                          + e.lineNumber);
        }
    },


    removefolderList  : function ()
    {
        try
        {
            this.m_DebugLog.Write("Hotmail-Pref-Accounts : doRemove - START");

            //get selected item
            var listView = document.getElementById("listFolders");   //click item
            var iIndex = listView.selectedIndex;
            this.m_DebugLog.Write("Hotmail-Pref-Accounts : doRemove - iIndex "+iIndex);

            var szUserName = this.m_aszUserList[this.m_iIndex].szUsername.toLowerCase();
            szUserName = szUserName.replace(/\./g,"~");
            this.m_DebugLog.Write("Hotmail-Pref-Accounts : doRemove -  username "+ szUserName);

            var item = listView.getItemAtIndex(iIndex);
            var szFolderName = item.id;
            this.m_DebugLog.Write("Hotmail-Pref-Accounts : doRemove -  szFolderName "+ szFolderName);

            //remove from array
            var oPref = {Value : null };
            var szFolder = "";
            var prefAccess = new WebMailCommonPrefAccess();
            prefAccess.Get("char","hotmail.Account."+szUserName+".szFolders",oPref);
            if (oPref.Value)
            {
                var aFolders = oPref.Value.split("\r");
                for (var j=0; j<aFolders.length; j++)
                {
                    var regExp = new RegExp("^"+szFolderName+"$","i");
                    if (aFolders[j].length>0 && aFolders[j].search(regExp)==-1)
                    {
                        szFolder += aFolders[j] +"\r";
                    }
                }
            }
            this.m_DebugLog.Write("Hotmail-Pref-Accounts : doRemove -  szFolder "+ szFolder);
            prefAccess.Set("char","hotmail.Account."+szUserName+".szFolders",szFolder);

            //remove for display
            listView.removeChild(item);

            if (listView.getRowCount()>0)
                listView.selectedIndex = 0;  //select first item
            else
                document.getElementById("removeFolderList").setAttribute("disabled",true);

            var event = document.createEvent("Events");
            event.initEvent("change", false, true);
            document.getElementById("listFolders").dispatchEvent(event);

            this.m_DebugLog.Write("Hotmail-Pref-Accounts : folderListRemove - END");
            return true;
        }
        catch(e)
        {
            this.m_DebugLog.DebugDump("Hotmail-Pref-Accounts : Exception in folderListRemove : "
                                          + e.name +
                                          ".\nError message: "
                                          + e.message + "\n"
                                          + e.lineNumber);
        }
    },


    folderListSelect : function ()
    {
        try
        {
            this.m_DebugLog.Write("Hotmail-Pref-Accounts : folderListSelect - START");

            var listView = document.getElementById("listFolders");   //click item
            var iIndex = listView.selectedIndex;
            this.m_DebugLog.Write("Hotmail-Pref-Accounts : folderListSelect - iIndex "+iIndex);

            var buttonRemove = document.getElementById("removeFolderList");
            buttonRemove.setAttribute("disabled", iIndex!=-1? false : true);

            this.m_DebugLog.Write("Hotmail-Pref-Accounts : folderListSelect - END");
            return true;
        }
        catch(e)
        {
            this.m_DebugLog.DebugDump("Hotmail-Pref-Accounts : Exception in folderListSelect : "
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
            this.m_DebugLog.Write("Hotmail-Pref-Accounts : addItemFolderList - START " + szName);

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

            this.m_DebugLog.Write("Hotmail-Pref-Accounts : addItemFolderList - END");
            return true;
        }
        catch(e)
        {
             this.m_DebugLog.DebugDump("Hotmail-Pref-Accounts : Exception in addItemFolderList : "
                                          + e.name +
                                          ".\nError message: "
                                          + e.message + "\n"
                                          + e.lineNumber);
        }
    },


/**********************************************************************/
//Deck SMTP Panel
/**********************************************************************/
    rgAltOnChange : function ()
    {
        this.m_DebugLog.Write("Hotmail-Pref-Accounts : rgAltOnChange - START");

        var bSendHtml = document.getElementById("radiogroupAlt").value;
        this.m_DebugLog.Write("Hotmail-Pref-Accounts : rgAltOnChange -  bSendHtml "+ bSendHtml);

        var szUserName = this.m_aszUserList[this.m_iIndex].szUsername.toLowerCase();
        szUserName = szUserName.replace(/\./g,"~");
        this.m_DebugLog.Write("Hotmail-Pref-Accounts : chkJunkMailOnChange -  username "+ szUserName);

        var prefAccess = new WebMailCommonPrefAccess();
        prefAccess.Set("bool","hotmail.Account."+szUserName+".bSendHtml",bSendHtml);

        this.m_DebugLog.Write("Hotmail-Pref-Accounts : rgAltOnChange - END");
    },
}




/*  Helper object*/

function userData(){}
userData.prototype.szUsername = null;
userData.prototype.szDisplayName = null;
userData.prototype.iType = 0;   //0 = POP; 1 = IMAP