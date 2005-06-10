var gWebDavPane =
{
    m_DebugLog : null,
    m_aWebDavUserList : null,
     
    init : function ()
    {
        this.m_DebugLog = new DebugLog("webmail.logging.comms", 
                                       "{3c8e8390-2cf6-11d9-9669-0800200c9a66}",
                                       "hotmailPrefs");
                                       
        this.m_DebugLog.Write("Hotmail-Prefs-WebDav : Init - START");
        
        this.m_aWebDavUserList = this.loadWebDavPrefs();
        var aHotmailUserNames = this.getUserNameList();
        this.addUserNamesListView(aHotmailUserNames);
        
        this.m_DebugLog.Write("Hotmail-Prefs-WebDav : Init - END");        
    },
    
    
    getUserNameList : function ()
    {
        try
        {
            this.m_DebugLog.Write("Hotmail-Prefs-WebDav.js : getUserNameList - START");
            
            var aHotmailUserNames = new Array(); 
            var accountManager = Components.classes["@mozilla.org/messenger/account-manager;1"].
                                            getService(Components.interfaces.nsIMsgAccountManager);
        
            var allServers = accountManager.allServers;
            
            for (var i=0; i < allServers.Count(); i++)
            {
                var currentServer = allServers.GetElementAt(i).
                                        QueryInterface(Components.interfaces.nsIMsgIncomingServer);
                
                var szHostName = currentServer.hostName;
                this.m_DebugLog.Write("Hotmail-Prefs-WebDav.js : getUserNameList - HostName " + szHostName);
                
                if (szHostName.search(/localhost/i)!=-1 || szHostName.search(/127\.0\.0\.1/)!=-1 )
                {
                    var szUserName = currentServer.username;
                    this.m_DebugLog.Write("Hotmail-Prefs-WebDav.js : getUserNameList - userName " + szUserName);
                    if (szUserName.search(/msn/i)!=-1 || szUserName.search(/hotmail/i)!= -1)
                    {
                         this.m_DebugLog.Write("Hotmail-Prefs-WebDav.js : getUserNameList - userName added");
                         aHotmailUserNames.push(szUserName);   
                    }
                } 
            }
            
            this.m_DebugLog.Write("Hotmail-Prefs-WebDav.js : getUserNameList - list " + aHotmailUserNames);
            this.m_DebugLog.Write("Hotmail-Prefs-WebDav.js : getUserNameList - END");
            return aHotmailUserNames;
        }
        catch(err)
        {
            this.m_DebugLog.DebugDump("Hotmail-Prefs-WebDav.js : Exception in getUserNameList : " 
                                       + e.name + 
                                       ".\nError message: " 
                                       + e.message);
        }
    },
    
    
    
    addUserNamesListView : function ( aHotmailUserNames )
    {
        try
        {
            this.m_DebugLog.Write("Hotmail-Prefs-WebDav.js : AddUserNamesListView - START");
            
            this.m_DebugLog.Write("Hotmail-Prefs-WebDav.js : AddUserNamesListView " + aHotmailUserNames);
            
            if (aHotmailUserNames.length > 0) 
            {   
                var list = document.getElementById("listView");
                
                for(i =0 ; i< aHotmailUserNames.length; i++)
                {
                    this.m_DebugLog.Write("Hotmail-Prefs-WebDav.js : AddUserNamesListView " + aHotmailUserNames[i]);
                    var bFound = false;
     
                    if (this.m_aWebDavUserList)
                    {   
                        for (j=0; j<this.m_aWebDavUserList.length; j++)
                        {
                            this.m_DebugLog.Write("Hotmail-Prefs-WebDav.js : AddUserNamesListView - list " + this.m_aWebDavUserList[j] );
                            var reg = new RegExp(aHotmailUserNames[i],"i");
                            if(this.m_aWebDavUserList[j].match(reg))
                            {
                                bFound = true;
                                this.m_DebugLog.Write("Hotmail-Prefs-WebDav.js : AddUserNamesListView - found");
                            }
                        }
                    }
                    
                    var newItem = document.createElement("listitem"); 
                    newItem.setAttribute("allowevents", "true");
                    newItem.setAttribute("id", aHotmailUserNames[i]);
                    
                    //user name
                    var UserNameCell =  document.createElement("listcell"); 
                    UserNameCell.setAttribute("label", aHotmailUserNames[i]);
                    newItem.appendChild(UserNameCell);
                  
                    //screen ripper
                    var ScreenRipperCell =  document.createElement("listcell"); 
                    ScreenRipperCell.setAttribute("type", "checkbox");
                    ScreenRipperCell.setAttribute("checked",!bFound);
                    ScreenRipperCell.setAttribute("id",aHotmailUserNames[i]+"/SR" );
                    ScreenRipperCell.setAttribute("commType","1" );
                    ScreenRipperCell.setAttribute("userName",aHotmailUserNames[i]);
                    ScreenRipperCell.setAttribute("onclick", "gWebDavPane.checkBox(event.target.id)");
                    ScreenRipperCell.setAttribute("class" , "checkBox");
                    newItem.appendChild(ScreenRipperCell);
                    
                    //webdav               
                    var WebDavCell =  document.createElement("listcell"); 
                    WebDavCell.setAttribute("type", "checkbox");
                    WebDavCell.setAttribute("checked", bFound);
                    WebDavCell.setAttribute("id",aHotmailUserNames[i]+"/WD" );
                    WebDavCell.setAttribute("commType","2" );
                    WebDavCell.setAttribute("userName",aHotmailUserNames[i]);
                    WebDavCell.setAttribute("onclick", "gWebDavPane.checkBox(event.target.id)");
                    newItem.appendChild(WebDavCell);
                   	
                    list.appendChild(newItem);
                }
            }
           
            this.m_DebugLog.Write("Hotmail-Prefs-WebDav.js : AddUserNamesListView - END");
        }
        catch(err)
        {
            this.m_DebugLog.DebugDump("Hotmail-Prefs-WebDav.js : Exception in AddUserNamesListView : " 
                                       + e.name + 
                                       ".\nError message: " 
                                       + e.message);
        }
    },
    
    
    loadWebDavPrefs : function ()
    {
        try
        {
            this.m_DebugLog.Write("Hotmail-Prefs-WebDav.js : LoadPrefs - START");
        
            var aWebDavUserList = new Array();
            var oPref = new Object();
            oPref.Value = null;
            var  WebMailPrefAccess = new WebMailCommonPrefAccess();
            WebMailPrefAccess.Get("int","hotmail.webdav.iAccountNum",oPref);
            var iCount = oPref.Value;
            
            if (iCount>0)
            {
                this.m_DebugLog.Write("Hotmail-Prefs-WebDav.js : LoadPrefs - count " + iCount);
                for(i=0; i<iCount; i++)
                {
                    WebMailPrefAccess.Get("char","hotmail.webdav.Account."+i,oPref);
                    this.m_DebugLog.Write("Hotmail-Prefs-WebDav.js : LoadPrefs - count " + oPref.Value);
                    aWebDavUserList.push(oPref.Value);   
                } 
            } 
            delete WebMailPrefAccess;     
            this.m_DebugLog.Write("Hotmail-Prefs-WebDav.js : LoadPrefs - list " +aWebDavUserList );
            this.m_DebugLog.Write("Hotmail-Prefs-WebDav.js : LoadPrefs - END");
            return aWebDavUserList;
        }
        catch(e)
        {
             this.m_DebugLog.DebugDump("Hotmail-Prefs-WebDav.js : Exception in LoadPrefs : " 
                                          + e.name + 
                                          ".\nError message: " 
                                          + e.message);
        }
    },
    
    
    
    checkBox : function (ID)
    {
        try
        {
            this.m_DebugLog.Write("Hotmail-Prefs-WebDav.js : CheckBox - START");
            this.m_DebugLog.Write("Hotmail-Prefs-WebDav.js : CheckBox - "+ID );
            
            var item1 = document.getElementById(ID);   //click item
            
            var iItem1CommType = item1.getAttribute("commType");
            this.m_DebugLog.Write("Hotmail-Prefs-WebDav.js : CheckBox item1 CommType "+iItem1CommType);
            var szItem1UserName = item1.getAttribute("userName");
            this.m_DebugLog.Write("Hotmail-Prefs-WebDav.js : CheckBox item1 userName "+szItem1UserName);
           
            var item2 = null;
            
            if (iItem1CommType ==1)  //screen ripper 
            {
                item2 = document.getElementById(szItem1UserName+"/WD");
            }
            else //web dav
            {
                item2 = document.getElementById(szItem1UserName+"/SR");
            }
            
            //get click item state
            var bItem1 = item1.getAttribute("checked");
            this.m_DebugLog.Write("Hotmail-Prefs-WebDav.js : CheckBox item1 state " + bItem1);
          
           
            if (bItem1 == "true")  //checked 
            { 
                item1.setAttribute("checked","false");
                item2.setAttribute("checked","true");
            }
            else  //unchecked
            {
                item1.setAttribute("checked","true");
                item2.setAttribute("checked","false");
            }
          
            this.updatePref();
            this.m_DebugLog.Write("Hotmail-Prefs-WebDav.js : CheckBox - END");
        }
        catch(err)
        {
            this.m_DebugLog.DebugDump("Hotmail-Prefs-WebDav.js : Exception in CheckBox : " 
                                   + e.name + 
                                   ".\nError message: " 
                                   + e.message);
        }   
    },
    
    
    updatePref : function ()
    {
        try
        {
            this.m_DebugLog.Write("Hotmail-Prefs-WebDav.js : updatePref - START");
            
            //get list
            var aWebDavList = this.getWebDavList();
            this.m_DebugLog.Write("Hotmail-Prefs-WebDav.js : updatePref list - " + aWebDavList);
            
            //delete old list    
            var  WebMailPrefAccess = new WebMailCommonPrefAccess();
            WebMailPrefAccess.DeleteBranch("hotmail.webdav.Account");
           
            //write new list
            if (aWebDavList.length>0)
            {
                this.m_DebugLog.Write("Hotmail-Prefs-WebDav.js : updatePref - count " + aWebDavList.length);
                WebMailPrefAccess.Set("int","hotmail.webdav.iAccountNum",aWebDavList.length);
               
                for(i=0; i<aWebDavList.length; i++)
                {
                    WebMailPrefAccess.Set("char","hotmail.webdav.Account."+i,aWebDavList[i]);   
                }  
            }
            else
            {
                WebMailPrefAccess.Set("int","hotmail.webdav.iAccountNum",0);
            }
            delete WebMailPrefAccess;   
            
            this.m_DebugLog.Write("Hotmail-Prefs-WebDav.js : updatePref - END");
        }
        catch(e)
        {
            this.m_DebugLog.DebugDump("Hotmail-Prefs-WebDav.js : Exception in updatePref : " 
                                   + e.name + 
                                   ".\nError message: " 
                                   + e.message);
        }  
    },
   
   
    getWebDavList : function ()
    {
        try
        {
            this.m_DebugLog.Write("Hotmail-Prefs-WebDav.js : GetWebDavList - START");
            
            var aDevList = new Array();
            var list = document.getElementById("listView");
            
            var iCount = list.getRowCount();
            this.m_DebugLog.Write("Hotmail-Prefs-WebDav.js : GetWebDavList - row count " + iCount);
            
            for (i=0; i<iCount ; i++)
            {
                //get username
                var Item = list.getItemAtIndex(i);
                var szUserName = Item.getAttribute("id");
                this.m_DebugLog.Write("Hotmail-Prefs-WebDav.js : GetWebDavList - username " + szUserName);  
                
                //get check state of webdev
                var Item2 = document.getElementById(szUserName+"/WD");
                var bItem2 = Item2.getAttribute("checked");
                this.m_DebugLog.Write("Hotmail-Prefs-WebDav.js : GetWebDavList state " + bItem2);
                
                if (bItem2 == "true")
                {
                    this.m_DebugLog.Write("Hotmail-Prefs-WebDav.js : GetWebDavList - added to list");
                    aDevList.push(szUserName);
                }
            }
            this.m_DebugLog.Write("Hotmail-Prefs-WebDav.js : GetWebDavList - END");
            return aDevList;
        }
        catch(err)
        {
             this.m_DebugLog.DebugDump("Hotmail-Prefs-WebDav.js : Exception in GetWebDavList : " 
                                          + e.name + 
                                          ".\nError message: " 
                                          + e.message);
        }
    },
};
