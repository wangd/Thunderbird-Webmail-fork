var gPrefAccounts =
{
    m_kMailDotComContentID : "@mozilla.org/MailDotComPOP;1",
    m_DebugLog : new DebugLog("webmail.logging.comms",
                              "{3c8e8390-2cf6-11d9-9669-0800200c9a66}",
                              "MailDotComPrefs"),
    m_aszUserList : null,
    m_iIndex : 0,
    m_bInit : false,



    init : function()
    {
        try
        {
            this.m_DebugLog.Write("MailDotCom-Pref-Accounts : Init - START");

            this.m_bInit = true;

            //load data
            this.getUserNames();
            this.createUserDropDown();


            if (this.m_aszUserList.length>0) //select first item
            {
                document.getElementById("menuAccounts").selectedIndex= this.m_iIndex;
            }
           else //disable elements
            {
                document.getElementById("boxAccounts").setAttribute("hidden", true);
                document.getElementById("boxError").setAttribute("hidden", false);
            }

            this.selectUserName();

            var iSelected = document.getElementById("selectedTabIndex").value;
            this.m_DebugLog.Write("MailDotCom-Pref-Accounts : Init - iSelected " + iSelected);
            if (iSelected != null)
                document.getElementById("tabsAccount").selectedIndex = iSelected;

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



    getUserNames : function ()
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
                    var szUserName = currentServer.realUsername;
                    szUserName = szUserName.replace(/\s/,"");  //removes non print chars
                    this.m_DebugLog.Write("MailDotCom-Pref-Accounts : getUserNameList - userName " + szUserName);
                    if (szUserName)
                    {
                        if (szUserName.search(/@/)==-1)
                        {
                            szUserName = currentServer.username ;
                            szUserName = szUserName.replace(/\s/,"");  //removes non print chars
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
                                   this.m_DebugLog.Write("MailDotCom-Pref-Accounts : getUserNames - userName raw " + szUserName);

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

                                   this.m_DebugLog.Write("MailDotCom-Pref-Accounts : getUserNames - userName clean " + szUserName);

                                   this.m_aszUserList.push(szUserName);
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



    selectUserName : function ()
    {
        try
        {
            this.m_DebugLog.Write("MailDotCom-Pref-Accounts : selectUserName - START");

            var listView = document.getElementById("menuAccounts");   //click item
            this.m_iIndex = listView.selectedIndex;
            this.m_DebugLog.Write("MailDotCom-Pref-Accounts : selectUserName - iIndex "+this.m_iIndex);

            var prefAccess = new WebMailCommonPrefAccess();
            var oPref = {Value : null};

            if (this.m_aszUserList.length>0)
            {
                var szUserName = this.m_aszUserList[this.m_iIndex].toLowerCase();
                document.getElementById("selectedUserName").value = szUserName;
                szUserName = szUserName.replace(/\./g,"_");
                szUserName = szUserName.toLowerCase();
                this.m_DebugLog.Write("MailDotCom-Pref-Accounts : selectUserName -  szUserName "+ szUserName);

                //download unread
                if (!prefAccess.Get("bool","maildotcom.Account."+szUserName+".bDownloadUnread",oPref))
                   oPref.Value = false; //Default
                this.m_DebugLog.Write("MailDotCom-Pref-Accounts : selectUserName -  bDownloadUnread "+ oPref.Value);
                document.getElementById("chkDownloadUnread").checked = oPref.Value;

                //empty trash
                if (!prefAccess.Get("bool","maildotcom.Account."+szUserName+".bEmptyTrash",oPref))
                   oPref.Value = false; //Default
                this.m_DebugLog.Write("MailDotCom-Pref-Accounts : selectUserName -  bEmptyTrash "+ oPref.Value);
                document.getElementById("chkEmptyTrash").checked = oPref.Value;

                //SaveSentItems
                oPref.Value = null;
                if (!prefAccess.Get("bool","maildotcom.Account."+szUserName+".bSaveCopy",oPref))
                    oPref.Value = false; //Default
                this.m_DebugLog.Write("MailDotCom-Pref-Accounts.js - selectUserName - bSaveSentItem " + oPref.Value);
                document.getElementById("chkSentItems").checked = oPref.Value;

                //Send HTML
                if (!prefAccess.Get("bool","maildotcom.Account."+szUserName+".bSendHtml",oPref))
                   oPref.Value = false; //Default
                this.m_DebugLog.Write("MailDotCom-Pref-Accounts : selectUserName -  bSendHtml "+ oPref.Value);
                document.getElementById("radiogroupAlt").selectedIndex = oPref.Value?1:0;

                //clear Folder list
                var listFolders = document.getElementById("listFolders");
                var iRowCount = listFolders.getRowCount()
                for (var i=0; i<iRowCount; i++)
                {
                    this.m_DebugLog.Write("MailDotCom-Pref-Accounts : selectUserName - removing " + i);
                    var item = listFolders.getItemAtIndex(0);
                    listFolders.removeChild(item);
                }

                //add folder details
                if (!prefAccess.Get("char","maildotcom.Account."+szUserName+".szFolders",oPref))
                   oPref.Value = null; //Default
                this.m_DebugLog.Write("MailDotCom-Pref-Accounts : selectUserName - aszFolder " + oPref.Value);
                if (oPref.Value)
                {
                    var aFolders = oPref.Value.split("\r");
                    for (var j=0; j<aFolders.length; j++)
                    {
                        this.m_DebugLog.Write("MailDotCom-Pref-Accounts : selectUserName - aszFolder " + aFolders[j] + " j "+j);
                        if (aFolders[j].length>0)
                            this.addItemFolderList(aFolders[j]);
                    }
                }
            }
            this.m_DebugLog.Write("MailDotCom-Pref-Accounts : selectUserName - END");
        }
        catch(e)
        {
             this.m_DebugLog.DebugDump("MailDotCom-Pref-Accounts : Exception in selectUserName : "
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
            this.m_DebugLog.Write("MailDotCom-Pref-Accounts : userAdd - START");

            var szLastUserName = document.getElementById("selectedUserName").value;
            var regExp = new RegExp("^"+ szLastUserName + "$","i");

            var list = document.getElementById("popupAccounts");
            if (this.m_aszUserList.length > 0)
            {
                for(i =0 ; i< this.m_aszUserList.length; i++)
                {
                    var szUserName = this.m_aszUserList[i];
                    if (szUserName.search(regExp)!= -1) this.m_iIndex = i;
                    var newItem = document.createElement("menuitem");
                    newItem.setAttribute("id", szUserName);
                    newItem.setAttribute("label", szUserName);
                    newItem.setAttribute("class", "menuitem-iconic");
                    newItem.setAttribute("src","chrome://maildotcom/skin/person.png");
                    newItem.setAttribute("oncommand","gPrefAccounts.selectUserName()");
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



   tabSelectionChanged : function ()
   {
       this.m_DebugLog.Write("MailDotCom-Pref-Accounts : tabSelectionChanged - START");

       if (!this.m_bInit) return;

       var iIndex = document.getElementById("tabsAccount").selectedIndex;
       this.m_DebugLog.Write("MailDotCom-Pref-Accounts : tabSelectionChanged - iIndex " + iIndex);
       var preference = document.getElementById("selectedTabIndex");
       preference.value = iIndex;

       this.m_DebugLog.Write("MailDotCom-Pref-Accounts : tabSelectionChanged - END");
   },


/**********************************************************************/
//Deck POP Panel
/**********************************************************************/
    chkDownloadUreadOnChange : function ()
    {
        this.m_DebugLog.Write("MailDotCom-Pref-Accounts : chkDownloadUreadOnChange - START");

        var bUnread = document.getElementById("chkDownloadUnread").checked ? false : true;
        this.m_DebugLog.Write("MailDotCom-Pref-Accounts : chkDownloadUreadOnChange -  bUnread "+ bUnread);

        var szUserName = this.m_aszUserList[this.m_iIndex].toLowerCase();
        szUserName = szUserName.replace(/\./g,"_");
        szUserName = szUserName.toLowerCase();
        this.m_DebugLog.Write("MailDotCom-Pref-Accounts : chkDownloadUreadOnChange -  username "+ szUserName);

        //write pref
        var prefAccess = new WebMailCommonPrefAccess();
        prefAccess.Set("bool","maildotcom.Account."+szUserName+".bDownloadUnread",bUnread);

        this.m_DebugLog.Write("MailDotCom-Pref-Accounts : chkDownloadUreadOnChange - END");
    },



    chkEmptyTrashOnChange : function ()
    {
        this.m_DebugLog.Write("MailDotCom-Pref-Accounts : chkEmptyTrashOnChange - START");

        var bEmptyTrash = document.getElementById("chkEmptyTrash").checked ? false : true;
        this.m_DebugLog.Write("MailDotCom-Pref-Accounts : chkEmptyTrashOnChange -  bEmptyTrash "+ !bEmptyTrash);

        var szUserName = this.m_aszUserList[this.m_iIndex].toLowerCase();
        szUserName = szUserName.replace(/\./g,"_");
        szUserName = szUserName.toLowerCase();
        this.m_DebugLog.Write("MailDotCom-Pref-Accounts : chkEmptyTrashOnChange -  username "+ szUserName);

        //write pref
        var prefAccess = new WebMailCommonPrefAccess();
        prefAccess.Set("bool","maildotcom.Account."+szUserName+".bEmptyTrash",bEmptyTrash);

        this.m_DebugLog.Write("MailDotCom-Pref-Accounts : chkEmptyTrashOnChange - END");
    },



    addFolderList : function ()
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

                var szUserName = this.m_aszUserList[this.m_iIndex].toLowerCase();
                szUserName = szUserName.replace(/\./g,"_");
                szUserName = szUserName.toLowerCase();
                this.m_DebugLog.Write("MailDotCom-Pref-Accounts : folderListAdd -  username "+ szUserName);

                var szFolder = "";
                var bFound = false;
                var oPref = {Value : null };
                var prefAccess = new WebMailCommonPrefAccess();
                prefAccess.Get("char","maildotcom.Account."+szUserName+".szFolders",oPref);
                if (oPref.Value)
                {
                    var aFolders = oPref.Value.split("\r");
                    this.m_DebugLog.Write("MailDotCom-Pref-Accounts : folderListAdd -  aFolders "+ aFolders);
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
                    this.m_DebugLog.Write("MailDotCom-Pref-Accounts.js - getAccountPrefs - szFolder " + szFolder);
                    prefAccess.Set("char","maildotcom.Account."+szUserName+".szFolders",szFolder);

                    this.addItemFolderList(oParam.szFolder);   //add item to list

                    //refresh list
                    var event = document.createEvent("Events");
                    event.initEvent("change", false, true);
                    document.getElementById("listFolders").dispatchEvent(event);
                }
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


    removefolderList  : function ()
    {
        try
        {
            this.m_DebugLog.Write("MailDotCom-Pref-Accounts : doRemove - START");

            //get selected item
            var listView = document.getElementById("listFolders");   //click item
            var iIndex = listView.selectedIndex;
            this.m_DebugLog.Write("MailDotCom-Pref-Accounts : doRemove - iIndex "+iIndex);

            var szUserName = this.m_aszUserList[this.m_iIndex].toLowerCase();
            szUserName = szUserName.replace(/\./g,"_");
            szUserName = szUserName.toLowerCase();
            this.m_DebugLog.Write("MailDotCom-Pref-Accounts : doRemove -  username "+ szUserName);

            var item = listView.getItemAtIndex(iIndex);
            var szFolderName = item.id;
            this.m_DebugLog.Write("MailDotCom-Pref-Accounts : doRemove -  szFolderName "+ szFolderName);

            //remove from array
            var oPref = {Value : null };
            var szFolder = "";
            var prefAccess = new WebMailCommonPrefAccess();
            prefAccess.Get("char","maildotcom.Account."+szUserName+".szFolders",oPref);
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

            this.m_DebugLog.Write("MailDotCom-Pref-Accounts : doRemove -  szFolder "+ szFolder);
            prefAccess.Set("char","maildotcom.Account."+szUserName+".szFolders",szFolder);

            //remove for display
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


/**********************************************************************/
//Deck SMTP Panel
/**********************************************************************/
    chkSentItemsOnChange : function ()
    {
        this.m_DebugLog.Write("MailDotCom-Pref-Accounts : chkSentItemsOnChange - START");

        var bSaveItem = document.getElementById("chkSentItems").checked ? false : true;
        this.m_DebugLog.Write("MailDotCom-Pref-Accounts : chkSentItemsOnChange -  bSaveItem "+ bSaveItem);

        var szUserName = this.m_aszUserList[this.m_iIndex].toLowerCase();
        szUserName = szUserName.replace(/\./g,"_");
        szUserName = szUserName.toLowerCase();
        this.m_DebugLog.Write("MailDotCom-Pref-Accounts : chkJunkMailOnChange -  username "+ szUserName);

        var prefAccess = new WebMailCommonPrefAccess();
        prefAccess.Set("bool","maildotcom.Account."+szUserName+".bSaveCopy",bSaveItem);

        this.m_DebugLog.Write("MailDotCom-Pref-Accounts : chkSentItemsOnChange - END");
    },



    rgAltOnChange : function ()
    {
        this.m_DebugLog.Write("MailDotCom-Pref-Accounts : rgAltOnChange - START");

        var bSendHtml = document.getElementById("radiogroupAlt").value;
        this.m_DebugLog.Write("MailDotCom-Pref-Accounts : rgAltOnChange -  bSendHtml "+ bSendHtml);

        var szUserName = this.m_aszUserList[this.m_iIndex].toLowerCase();
        szUserName = szUserName.replace(/\./g,"_");
        szUserName = szUserName.toLowerCase();
        this.m_DebugLog.Write("MailDotCom-Pref-Accounts : chkJunkMailOnChange -  username "+ szUserName);

        var prefAccess = new WebMailCommonPrefAccess();
        prefAccess.Set("bool","maildotcom.Account."+szUserName+".bSendHtml",bSendHtml);

        this.m_DebugLog.Write("MailDotCom-Pref-Accounts : rgAltOnChange - END");
    },
}
