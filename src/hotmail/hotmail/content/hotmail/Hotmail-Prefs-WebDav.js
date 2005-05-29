function Startup()
{
    try
    {
        parent.gHotmailPrefsLog.Write("Hotmail: Hotmail-Prefs-WebDav.js : Startup - START");
        
        //register ok callback
        parent.hPrefWindow.registerOKCallbackFunc(onOK);
        
        var aHotmailUserNames = new Array(); 
        var accountManager = Components.classes["@mozilla.org/messenger/account-manager;1"].
                        getService(Components.interfaces.nsIMsgAccountManager);
    
        var allServers = accountManager.allServers;
        
        for (var i=0; i < allServers.Count(); i++)
        {
            var currentServer = allServers.GetElementAt(i).QueryInterface(Components.interfaces.nsIMsgIncomingServer);
            
            var szHostName = currentServer.hostName;
            parent.gHotmailPrefsLog.Write("Hotmail: Hotmail-Prefs-WebDav.js : Startup - HostName " + szHostName);
            
            if (szHostName.search(/localhost/i)!=-1 || szHostName.search(/127\.0\.0\.1/)!=-1 )
            {
                var szUserName = currentServer.username;
                parent.gHotmailPrefsLog.Write("Hotmail: Hotmail-Prefs-WebDav.js : Startup - userName " + szUserName);
                if (szUserName.search(/msn/i)!=-1 || szUserName.search(/hotmail/i)!= -1)
                {
                     parent.gHotmailPrefsLog.Write("Hotmail: Hotmail-Prefs-WebDav.js : userName added");
                     aHotmailUserNames.push(szUserName);   
                }
            } 
        }
        
        AddUserNamesListView(aHotmailUserNames);
        
        parent.gHotmailPrefsLog.Write("Hotmail: Hotmail-Prefs-WebDav.js : Startup - END");
    }
    catch(err)
    {
        parent.gHotmailPrefsLog.DebugDump("Hotmail: Hotmail-Prefs-WebDav.js : Exception in Startup : " 
                               + e.name + 
                               ".\nError message: " 
                               + e.message);
    }
}



function AddUserNamesListView( aHotmailUserNames )
{
    try
    {
        parent.gHotmailPrefsLog.Write("Hotmail: Hotmail-Prefs-WebDav.js : AddUserNamesListView - START");
        
        parent.gHotmailPrefsLog.Write("Hotmail: Hotmail-Prefs-WebDav.js : AddUserNamesListView " + aHotmailUserNames);
        
        if (aHotmailUserNames.length > 0) 
        {   
            var list = document.getElementById("listView");
            
            for(i =0 ; i< aHotmailUserNames.length; i++)
            {
                parent.gHotmailPrefsLog.Write("Hotmail: Hotmail-Prefs-WebDav.js : AddUserNamesListView " + aHotmailUserNames[i]);
                var bFound = false;
 
                if (parent.g_aDevUserNameList)
                {   
                    for (j=0; j<parent.g_aDevUserNameList.length; j++)
                    {
                        parent.gHotmailPrefsLog.Write("Hotmail: Hotmail-Prefs-WebDav.js : AddUserNamesListView - list " + parent.g_aDevUserNameList[j] );
                        var reg = new RegExp(aHotmailUserNames[i],"i");
                        if(parent.g_aDevUserNameList[j].match(reg))
                        {
                            bFound = true;
                            parent.gHotmailPrefsLog.Write("Hotmail: Hotmail-Prefs-WebDav.js : AddUserNamesListView - found");
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
                ScreenRipperCell.setAttribute("onclick", "CheckBox(event.target.id)");
                ScreenRipperCell.setAttribute("class" , "checkBox");
                newItem.appendChild(ScreenRipperCell);
                
                //webdav               
                var WebDavCell =  document.createElement("listcell"); 
                WebDavCell.setAttribute("type", "checkbox");
                WebDavCell.setAttribute("checked", bFound);
                WebDavCell.setAttribute("id",aHotmailUserNames[i]+"/WD" );
                WebDavCell.setAttribute("commType","2" );
                WebDavCell.setAttribute("userName",aHotmailUserNames[i]);
                WebDavCell.setAttribute("onclick", "CheckBox(event.target.id)");
                newItem.appendChild(WebDavCell);
               	
                list.appendChild(newItem);
            }
        }
       
        parent.gHotmailPrefsLog.Write("Hotmail: Hotmail-Prefs-WebDav.js : AddUserNamesListView - END");
    }
    catch(err)
    {
        parent.gHotmailPrefsLog.DebugDump("Hotmail: Hotmail-Prefs-WebDav.js : Exception in AddUserNamesListView : " 
                               + e.name + 
                               ".\nError message: " 
                               + e.message);
    }
}

function CheckBox(ID)
{
    try
    {
        parent.gHotmailPrefsLog.Write("Hotmail: Hotmail-Prefs-WebDav.js : CheckBox - START");
        parent.gHotmailPrefsLog.Write("Hotmail: Hotmail-Prefs-WebDav.js : CheckBox - "+ID );
        
        var item1 = document.getElementById(ID);   //click item
        
        var iItem1CommType = item1.getAttribute("commType");
        parent.gHotmailPrefsLog.Write("Hotmail: Hotmail-Prefs-WebDav.js : CheckBox item1 CommType "+iItem1CommType);
        var szItem1UserName = item1.getAttribute("userName");
        parent.gHotmailPrefsLog.Write("Hotmail: Hotmail-Prefs-WebDav.js : CheckBox item1 userName "+szItem1UserName);
       
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
        parent.gHotmailPrefsLog.Write("Hotmail: Hotmail-Prefs-WebDav.js : CheckBox item1 state " + bItem1);
      
       
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
      
        parent.gHotmailPrefsLog.Write("Hotmail: Hotmail-Prefs-WebDav.js : CheckBox - END");
    }
    catch(err)
    {
        parent.gHotmailPrefsLog.DebugDump("Hotmail: Hotmail-Prefs-WebDav.js : Exception in CheckBox : " 
                               + e.name + 
                               ".\nError message: " 
                               + e.message);
    }   
}



function GetFields()
{
    try
    {
        parent.gHotmailPrefsLog.Write("Hotmail: Hotmail-Prefs-WebDav.js : GetFields - START");
             
        var dataObject = parent.hPrefWindow.wsm.dataManager.pageData["chrome://hotmail/content/Hotmail-Prefs-WebDav.xul"];
        dataObject.UserNameList = GetWebDavList();    
              
        parent.gHotmailPrefsLog.Write("Webmail: Webmail-Prefs-Logging.js : GetFields - END");
        return dataObject;
    }
    catch(e)
    {
        parent.gHotmailPrefsLog.DebugDump("Hotmail: Hotmail-Prefs-WebDav.js : Exception in GetFields : " 
                                      + e.name + 
                                      ".\nError message: " 
                                      + e.message);
        return null;
    }  
}



// manual data setting function for PrefWindow
function SetFields( aDataObject )
{
    try
    {
        parent.gHotmailPrefsLog.Write("Hotmail: Hotmail-Prefs-WebDav.js : SetFields - START");
       
        if ("UserNameList" in aDataObject)
        {
            parent.gHotmailPrefsLog.Write("Hotmail: Hotmail-Prefs-WebDav.js : SetFields - data found");
            parent.g_aDevUserNameList = aDataObject.UserNameList;      
        }
        else
        {
            parent.gHotmailPrefsLog.Write("Hotmail: Hotmail-Prefs-WebDav.js : SetFields - loading data from prefs");
            parent.g_aDevUserNameList = LoadWebDavPrefs();
        }
             
        parent.gHotmailPrefsLog.Write("Hotmail: Hotmail-Prefs-WebDav.js : SetFields - END");
        
        return true;
    }
    catch(e)
    {
         parent.gHotmailPrefsLog.DebugDump("Hotmail: Hotmail-Prefs-WebDav.js : Exception in SetFields : " 
                                        + e.name + 
                                        ".\nError message: " 
                                        + e.message);
         return false;
    }
}    


function onOK()
{
    try
    {
        parent.gHotmailPrefsLog.Write("Hotmail: Hotmail-Prefs-WebDav.js : onOK - START");
    
        //get list
        var aWebDavList = GetWebDavList();
        parent.gHotmailPrefsLog.Write("Hotmail: Hotmail-Prefs-WebDav.js : onOK - " + aWebDavList);
        
        //delete old list    
        var  WebMailPrefAccess = new WebMailCommonPrefAccess();
        WebMailPrefAccess.DeleteBranch("hotmail.webdav.Account");
       
        //write new list
        if (aWebDavList.length>0)
        {
             parent.gHotmailPrefsLog.Write("Hotmail: Hotmail-Prefs-WebDav.js : onOK - count " + aWebDavList.length);
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
                 
        parent.gHotmailPrefsLog.Write("Hotmail: Hotmail-Prefs-WebDav.js: onOK - END");
    }
    catch(e)
    {
         parent.gHotmailPrefsLog.DebugDump("Hotmail: Hotmail-Prefs-WebDav.js : Exception in onOK : " 
                                      + e.name + 
                                      ".\nError message: " 
                                      + e.message);
    }
}


function LoadWebDavPrefs()
{
    try
    {
        parent.gHotmailPrefsLog.Write("Hotmail: Hotmail-Prefs-WebDav.js : LoadPrefs - START");
    
        var aWebDavUserList = new Array();
        var oPref = new Object();
        oPref.Value = null;
        var  WebMailPrefAccess = new WebMailCommonPrefAccess();
        WebMailPrefAccess.Get("int","hotmail.webdav.iAccountNum",oPref);
        var iCount = oPref.Value;
        
        if (iCount>0)
        {
            parent.gHotmailPrefsLog.Write("Hotmail: Hotmail-Prefs-WebDav.js : LoadPrefs - count " + iCount);
            for(i=0; i<iCount; i++)
            {
                WebMailPrefAccess.Get("char","hotmail.webdav.Account."+i,oPref);
                parent.gHotmailPrefsLog.Write("Hotmail: Hotmail-Prefs-WebDav.js : LoadPrefs - count " + oPref.Value);
                aWebDavUserList.push(oPref.Value);   
            } 
        } 
        delete WebMailPrefAccess;     
        parent.gHotmailPrefsLog.Write("Hotmail: Hotmail-Prefs-WebDav.js: LoadPrefs - END");
        return aWebDavUserList;
    }
    catch(e)
    {
         parent.gHotmailPrefsLog.DebugDump("Hotmail: Hotmail-Prefs-WebDav.js : Exception in LoadPrefs : " 
                                      + e.name + 
                                      ".\nError message: " 
                                      + e.message);
    }
}



function GetWebDavList()
{
    try
    {
        parent.gHotmailPrefsLog.Write("Hotmail: Hotmail-Prefs-WebDav.js : GetWebDavList - START");
        
        var aDevList = new Array();
        var list = document.getElementById("listView");
        
        var iCount = list.getRowCount();
        parent.gHotmailPrefsLog.Write("Hotmail: Hotmail-Prefs-WebDav.js : GetWebDavList - row count " + iCount);
        
        for (i=0; i<iCount ; i++)
        {
            //get username
            var Item = list.getItemAtIndex(i);
            var szUserName = Item.getAttribute("id");
            parent.gHotmailPrefsLog.Write("Hotmail: Hotmail-Prefs-WebDav.js : GetWebDavList - username " + szUserName);  
            
            //get check state of webdev
            var Item2 = document.getElementById(szUserName+"/WD");
            var bItem2 = Item2.getAttribute("checked");
            parent.gHotmailPrefsLog.Write("Hotmail: Hotmail-Prefs-WebDav.js : GetWebDavList state " + bItem2);
            
            if (bItem2 == "true")
            {
                parent.gHotmailPrefsLog.Write("Hotmail: Hotmail-Prefs-WebDav.js : GetWebDavList - added to list");
                aDevList.push(szUserName);
            }
        }
        parent.gHotmailPrefsLog.Write("Hotmail: Hotmail-Prefs-WebDav.js : GetWebDavList - END");
        return aDevList;
    }
    catch(err)
    {
         parent.gHotmailPrefsLog.DebugDump("Hotmail: Hotmail-Prefs-WebDav.js : Exception in GetWebDavList : " 
                                      + e.name + 
                                      ".\nError message: " 
                                      + e.message);
    }
}
