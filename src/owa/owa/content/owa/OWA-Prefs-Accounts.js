var gPrefAccounts =
{
    m_cszOWAPOPContentID : "@mozilla.org/POPOWA;1",
    m_DebugLog : new DebugLog("webmail.logging.comms",
                              "{3c8e8390-2cf6-11d9-9669-0800200c9a66}",
                              "OWA Prefs"),
    m_aszUserList : null,
    m_iIndex : 0,
    m_bInit : false,



    init : function()
    {
        try
        {
            this.m_DebugLog.Write("OWA-Pref-Accounts : Init - START");

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
            this.m_DebugLog.Write("OWA-Pref-Accounts : Init - iSelected " + iSelected);
            if (iSelected != null)
                document.getElementById("tabsAccount").selectedIndex = iSelected;

            this.m_DebugLog.Write("OWA-Pref-Accounts : Init - END");
        }
        catch(e)
        {
             this.m_DebugLog.DebugDump("OWA-Pref-Accounts : Exception in init : "
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
            this.m_DebugLog.Write("OWA-Pref-Accounts : getUserNames - START");

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
                this.m_DebugLog.Write("OWA-Pref-Accounts  : getUserNames - type " +szType );             
                if (szType.search(/pop3/i)!=-1)  //found pop account
                {
                    var szUserName = currentServer.realUsername;
                    szUserName = szUserName.replace(/\s/,"");  //removes non print chars
                    this.m_DebugLog.Write("OWA-Pref-Accounts : getUserNames - userName " + szUserName);
                    if (szUserName)
                    {
                        if (szUserName.search(/@/)==-1)
                        {
                            szUserName = currentServer.username;
                            szUserName = szUserName.replace(/\s/,"");  //removes non print chars
                            this.m_DebugLog.Write("OWA-Pref-Accounts  : getUserNames - realuserName " + szUserName);
                        }

                        if (szUserName.search(/@/)!=-1)
                        {
                            var szDomain = szUserName.split("@")[1];
                            this.m_DebugLog.Write("OWA-Pref-Accounts : getUserNames - szDomain " + szDomain);

                            var szContentID ={value:null};
                            var iType = 0 ;   //default pop
                            var bDomainCheck = domainManager.getDomainForProtocol(szDomain,"pop", szContentID);                               
                            if (bDomainCheck)//domain found
                            {
                                if (szContentID.value == this.m_cszOWAPOPContentID)
                                {
                                   this.m_DebugLog.Write("OWA-Pref-Accounts : getUserNames - userName raw " + szUserName);

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
                                   this.m_DebugLog.Write("OWA-Pref-Accounts : getUserNames - userName clean " + szUserName);
                                   oUserData.szDisplayName = szUserName;
                                   this.m_aszUserList.push(oUserData);
                                }
                            }
                        }
                    }
                }
            }

            this.m_DebugLog.Write("OWA-Pref-Accounts : getUserNames - END");
            return true;
        }
        catch(e)
        {
            this.m_DebugLog.DebugDump("OWA-Pref-Accounts : Exception in getUserNames : "
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
            this.m_DebugLog.Write("OWA-Pref-Accounts : selectUserName - START");

            var listView = document.getElementById("menuAccounts");   //click item
            this.m_iIndex = listView.selectedIndex;
            this.m_DebugLog.Write("OWA-Pref-Accounts : selectUserName - iIndex "+this.m_iIndex);

            if (this.m_aszUserList.length>0)
            {
                var szUserName = this.m_aszUserList[this.m_iIndex].szUsername.toLowerCase();
		        var iType = this.m_aszUserList[this.m_iIndex].iType;
		        
                document.getElementById("selectedUserName").value = szUserName;
                szUserName = szUserName.replace(/\./g,"~");
                this.m_DebugLog.Write("OWA-Pref-Accounts : selectUserName -  szUserName "+ szUserName);

                var prefAccess = new WebMailCommonPrefAccess();
                var oPref = {Value : null};

                //get iMode
                if (!prefAccess.Get("int","owa.Account."+szUserName+".iMode",oPref))
                   oPref.Value = 0 //Default to ScreenRipper
                this.m_DebugLog.Write("OWA-Pref-Accounts.js - selectUserName - iMode " + oPref.Value);
                document.getElementById("radiogroupMode").selectedIndex  = oPref.Value;       
                
                //get LoginWithDomain  
                if (!prefAccess.Get("bool","owa.Account."+szUserName+".bLoginWithDomain",oPref))
                   oPref.Value = false;  
                this.m_DebugLog.Write("OWA-Pref-Accounts.js - selectUserName - bLoginWithDomain " + oPref.Value);  
                document.getElementById("chkLoginWithDomain").checked = oPref.Value;
 
                //get LoginWithDomain  
                if (!prefAccess.Get("bool","owa.Account."+szUserName+".forwardCreds",oPref))
                   oPref.Value = false;  
                this.m_DebugLog.Write("OWA-Pref-Accounts.js - selectUserName - forwardCreds " + oPref.Value);  
                document.getElementById("chkForwardCred").checked = oPref.Value;
            }
            this.m_DebugLog.Write("OWA-Pref-Accounts : selectUserName - END");
        }
        catch(e)
        {
             this.m_DebugLog.DebugDump("OWA-Pref-Accounts : Exception in selectUserName : "
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
            this.m_DebugLog.Write("OWA-Pref-Accounts : createUserDropDown - START");
            
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
                    newItem.setAttribute("src","chrome://owa/skin/person.png");
                    newItem.setAttribute("oncommand","gPrefAccounts.selectUserName()");
                    list.appendChild(newItem);
                }
            }
            this.m_DebugLog.Write("OWA-Pref-Accounts : createUserDropDown - iIndex "+this.m_iIndex);

            this.m_DebugLog.Write("OWA-Pref-Accounts : createUserDropDown - END");
        }
        catch(err)
        {
            this.m_DebugLog.DebugDump("OWA-Pref-Accounts : Exception in createUserDropDown : "
                                       + err.name +
                                       ".\nError message: "
                                       + err.message + "\n"
                                       + err.lineNumber);
        }
    },



    tabSelectionChanged : function ()
    {
       this.m_DebugLog.Write("OWA-Pref-Accounts : tabSelectionChanged - START");

       if (!this.m_bInit) return;
      
       var iIndex = document.getElementById("tabsAccount").selectedIndex;
       this.m_DebugLog.Write("OWA-Pref-Accounts : tabSelectionChanged - iIndex " + iIndex);
       var preference = document.getElementById("selectedTabIndex");
       preference.value = iIndex;

       this.m_DebugLog.Write("OWA-Pref-Accounts : tabSelectionChanged - END");
   },

/**********************************************************************/
//Deck Mode Panel
/**********************************************************************/


    rgModeOnChange : function ()
    {
        this.m_DebugLog.Write("OWA-Pref-Accounts : rgModeOnChange - START");

        var iMode = document.getElementById("radiogroupMode").value;
        this.m_DebugLog.Write("OWA-Pref-Accounts : rgModeOnChange -  iMode "+ iMode);

        var szUserName = this.m_aszUserList[this.m_iIndex].szUsername.toLowerCase();
        szUserName = szUserName.replace(/\./g,"~");
        this.m_DebugLog.Write("OWA-Pref-Accounts : rgModeOnChange -  szUserName "+ szUserName);

        //write pref
        var prefAccess = new WebMailCommonPrefAccess();
        prefAccess.Set("int","owa.Account."+szUserName+".iMode",iMode);

        this.m_DebugLog.Write("OWA-Pref-Accounts : rgModeOnChange - END");
    },
    
    
    
    chkLoginWithDomainOnChange : function ()
    {
        this.m_DebugLog.Write("OWA-Pref-Accounts : chkLoginWithDomainOnChange - START");

        var bDomain = document.getElementById("chkLoginWithDomain").checked ? false : true;
        this.m_DebugLog.Write("OWA-Pref-Accounts : chkLoginWithDomainOnChange -  bDomain "+ bDomain);

        var szUserName = this.m_aszUserList[this.m_iIndex].szUsername.toLowerCase();
        szUserName = szUserName.replace(/\./g,"~");
        this.m_DebugLog.Write("OWA-Pref-Accounts : chkLoginWithDomainOnChange -  username "+ szUserName);

        //write pref
        var prefAccess = new WebMailCommonPrefAccess();
        prefAccess.Set("bool","owa.Account."+szUserName+".bLoginWithDomain",bDomain);
        
        this.m_DebugLog.Write("OWA-Pref-Accounts : chkLoginWithDomainOnChange - END");
    },

    chkForwardCredOnChange: function ()
    {
        this.m_DebugLog.Write("OWA-Pref-Accounts : chkForwardCredOnChange - START");
        var forwardCred = document.getElementById("chkForwardCred").checked ? false : true;
        this.m_DebugLog.Write("OWA-Pref-Accounts : chkForwardCredOnChange - Set Use Authentication to " + forwardCred);
        //write pref
        var szUserName = this.m_aszUserList[this.m_iIndex].szUsername.toLowerCase();
        szUserName = szUserName.replace(/\./g,"~");
        var prefAccess = new WebMailCommonPrefAccess();
        prefAccess.Set("bool","owa.Account."+szUserName+".forwardCreds",forwardCred);
        this.m_DebugLog.Write("OWA-Pref-Accounts : chkForwardCredOnChange - END");
    }
}




/*  Helper object*/

function userData(){}
userData.prototype.szUsername = null;
userData.prototype.szDisplayName = null;
userData.prototype.iType = 0;   //0 = POP; 1 = IMAP
