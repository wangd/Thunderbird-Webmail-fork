var gYahooFoldersAdd = 
{
    m_DebugLog : new DebugLog("webmail.logging.comms", 
                              "{3c8e8390-2cf6-11d9-9669-0800200c9a66}",
                              "YahooPrefs"), 
    m_Log : null,
    m_strBundle : null,
    m_szUserName : null,
    m_iType : 0,
    m_comms : null,
            
    init : function ()
    {
        try
        {
            this.m_DebugLog.Write("Yahoo-Prefs-Folders-Add : Init - START");
                        
            var scriptLoader =  Components.classes["@mozilla.org/moz/jssubscript-loader;1"]
                                      .getService(Components.interfaces.mozIJSSubScriptLoader);
            scriptLoader.loadSubScript("chrome://yahoo/content/Yahoo-Prefs-Folders-Download-Classic.js");
            scriptLoader.loadSubScript("chrome://yahoo/content/Yahoo-Prefs-Folders-Download-Beta.js");
                 
            var date = new Date();
            var szLogFileName = "YahooPrefsComms - " + date.getHours()+ "-" + date.getMinutes() + "-"+ date.getUTCMilliseconds() +" -";
            this.m_Log = new DebugLog("webmail.logging.comms", 
                                      "{3c8e8390-2cf6-11d9-9669-0800200c9a66}",
                                      szLogFileName),

            this.m_szUserName = window.arguments[0].szUserName;
            this.m_iType = window.arguments[0].iAccountType;
            this.m_aszFolderPref =  window.arguments[0].aszCurrentFolders;
            this.m_DebugLog.Write("Yahoo-Prefs-Folders-Add : " + this.m_iType + " " + this.m_szUserName);

            if (this.m_iType == 2 || this.m_iType == 1) 
            {
                if (this.m_iType == 2)  //new classic
                {
                    document.getElementById("vBoxfolderDownload").setAttribute("hidden", false);
                    document.getElementById("vBoxFolderList").setAttribute("hidden", true);
                    document.getElementById("cmd_close").setAttribute("oncommand", "gYahooFoldersAdd.doCancelDownload()");
                    this.m_comms = new YahooFolderClassic(this.m_Log);
                }
                else if (this.m_iType == 1) //beta
                {
                    document.getElementById("vBoxfolderDownload").setAttribute("hidden", false);
                    document.getElementById("vBoxFolderList").setAttribute("hidden", true);
                    document.getElementById("cmd_close").setAttribute("oncommand", "gYahooFoldersAdd.doCancelDownload()");
                    this.m_comms = new YahooFolderBeta(this.m_Log);
                }

                this.m_comms.setUserName(this.m_szUserName);
                if (this.m_comms.donwloadFolderList(this.listDownloaded, this) == -3) //get folder list
                { //use old method
                    document.getElementById("vBoxfolderDownload").setAttribute("hidden", true);
                    document.getElementById("vBoxFolderList").setAttribute("hidden", false);
                }       
            }
            else    //old classic
                document.getElementById("labelFolderName").click();
            
            this.m_DebugLog.Write("Yahoo-Prefs-Folders-Add : Init - END");
        }
        catch(e)
        {
            this.m_DebugLog.DebugDump("Yahoo-Prefs-Folders-Add : Exception in init : " 
                                          + e.name + 
                                          ".\nError message: " 
                                          + e.message + "\n"
                                          + e.lineNumber);
        }        
    },
    
    
    listDownloaded : function (aszFolderList, parent)
    {
        try
        {
            parent.m_DebugLog.Write("Yahoo-Prefs-Folders-Add : listDownloaded - START " + aszFolderList);
            
            if (aszFolderList) 
            {
                document.getElementById("cmd_ok").setAttribute("oncommand", "gYahooFoldersAdd.doOkList()");
                document.getElementById("cmd_close").setAttribute("oncommand", "gYahooFoldersAdd.doCancel()");
                document.getElementById("vBoxfolderDownload").setAttribute("selectedIndex", 1);

                for (var i = 0; i < aszFolderList.length; i++) 
                {                 
                    //check for special folders
                    if (aszFolderList[i].search(/^inbox$/i)  == -1 && 
                        aszFolderList[i].search(/^trash$/i)  == -1 &&
                        /*aszFolderList[i].search(/^sent$/i)   == -1 &&*/
                        aszFolderList[i].search(/^draft$/i)  == -1 &&
                        aszFolderList[i].search(/^@B@Bulk$/i)== -1) 
                    {
                        //check for duplicates
                        var regExp = new RegExp("^"+aszFolderList[i]+"$","i");
                        var bFound = false;
                        if (parent.m_aszFolderPref) 
                        {
                            for (var j = 0; j < parent.m_aszFolderPref.length; j++) 
                            {
                                if (parent.m_aszFolderPref[j].search(regExp) != -1) bFound = true;
                            }
                        }
                        //looks ok add to list
                        if (!bFound) parent.addItemFolderList(aszFolderList[i]);
                    }
                }
            }
            else
            {
                document.getElementById("vBoxfolderDownload").setAttribute("hidden", true);
                document.getElementById("vBoxFolderList").setAttribute("hidden", false);
                window.sizeToContent();
            } 
            
            parent.m_DebugLog.Write("Yahoo-Prefs-Folders-Add : listDownloaded - END"); 
        }
        catch(e)
        {
            parent.m_DebugLog.DebugDump("Yahoo-Prefs-Folders-Add : Exception in listDownloaded : " 
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
            this.m_DebugLog.Write("Yahoo-Prefs-Folders-Add : addItemFolderList - START " + szName);

            var newItem = document.createElement("richlistitem");
            newItem.setAttribute("id", szName);
            newItem.setAttribute("class", "listItem");
            newItem.setAttribute("align", "center");
            newItem.setAttribute("tabIndex", 0);
            newItem.setAttribute("allowEvents", "true");
            newItem.setAttribute("selected","false");

            //Check box
            var space = document.createElement("spacer")
            space.setAttribute("flex","1");
            var vBoxCheck = document.createElement("vbox");
            vBoxCheck.setAttribute("id", "boxCheck");
            vBoxCheck.appendChild(space);
            var checkBox = document.createElement("checkbox");
            checkBox.setAttribute("id","checkboxFolder");
            checkBox.setAttribute("checked","false");
            vBoxCheck.appendChild(checkBox);
            var space1 = document.createElement("spacer")
            space1.setAttribute("flex","1");
            vBoxCheck.appendChild(space1);
            newItem.appendChild(vBoxCheck);

            //folder name
            var label = document.createElement("label");
            label.setAttribute("value",szName);
            label.setAttribute("id","folderName");
            label.setAttribute("class","folderName");
            newItem.appendChild(label);

            document.getElementById("listFolders").appendChild(newItem);
            this.m_DebugLog.Write("Yahoo-Prefs-Folders-Add : addItemFolderList - END");
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

        
    doOk : function ()
    {
        try
        {
            this.m_DebugLog.Write("Yahoo-Prefs-Folders-Add : doOK - START");
            
            //get text
            var szValue =  document.getElementById("txtDomain").value;
            this.m_DebugLog.Write("Yahoo-Prefs-Folders-Add  : szValue " + szValue);
            
            //remove leading and trailing space
            szValue = szValue.replace(/^\s*/,"").replace(/\s*$/,"");
            this.m_DebugLog.Write("Yahoo-Prefs-Folders-Add  : szValue " + szValue+ "length" +szValue.length);
            
            //check length > 0
            if (szValue.length<=0)
            {
                //error 
                this.m_DebugLog.Write("Yahoo-Prefs-Folders-Add : length check failed");
                
                var strBundle = document.getElementById("stringsYahooFoldersAdd");
                var szTitle = strBundle.getString("errorTitle");
                var szText = strBundle.getString("errorMsg");
                
                var PromptService = Components.classes["@mozilla.org/embedcomp/prompt-service;1"].getService();
                PromptService.QueryInterface(Components.interfaces.nsIPromptService);
                PromptService.alert(window, szTitle, szText);
                
                document.getElementById("labelFolderName").click();
            }
            else if (szValue.search(/^inbox$/i)!=-1 || 
                     szValue.search(/^trash$/i)!=-1 ||
                     /*szValue.search(/^sent$/i)!=-1 ||*/ 
                     szValue.search(/^draft$/i)!=-1)
            {
                this.m_DebugLog.Write("Yahoo-Prefs-Folders-Add : folder check failed");
        
                var strBundle = document.getElementById("stringsYahooFoldersAdd");
                var szTitle = strBundle.getString("errorTitle");
                var szText = strBundle.getString("errorMsgName");
                szText = szText.replace(/%s/,szValue);
                
                var PromptService = Components.classes["@mozilla.org/embedcomp/prompt-service;1"].getService();
                PromptService.QueryInterface(Components.interfaces.nsIPromptService);
                PromptService.alert(window, szTitle, szText);
      
                document.getElementById("labelFolderName").click();
            }
            else
            {
                this.m_DebugLog.Write("Yahoo-Prefs-Folders-Add : check ok");
                
                //check for duplicate
                var bFound = false;
                
                if (this.m_aszFolderPref) 
                {
                    var regExp = new RegExp("^" + szValue[i] + "$", "i");
                    for (var j = 0; j < this.m_aszFolderPref.length; j++) 
                    {
                        if (this.m_aszFolderPref[j].search(regExp) != -1) bFound = true;
                    }
                }
                
                if (bFound)
                {
                    var strBundle = document.getElementById("stringsYahooFoldersAdd");
                    var szTitle = strBundle.getString("errorTitle");
                    var szText = strBundle.getString("errorMsgDupliate");
                    szText = szText.replace(/%s/,szValue);
                    
                    var PromptService = Components.classes["@mozilla.org/embedcomp/prompt-service;1"].getService();
                    PromptService.QueryInterface(Components.interfaces.nsIPromptService);
                    PromptService.alert(window, szTitle, szText);
                }
                else  //looks ok
                {
                    if (this.m_aszFolderPref) 
                    {
                        for (var i=0; i< this.m_aszFolderPref.length-1; i++) 
                        {
                            window.arguments[0].aszFolder.push(this.m_aszFolderPref[i]);
                        }
                    }
                    window.arguments[0].aszFolder.push(szValue);
                    window.arguments[1].value = 1;
                    window.close();
                }    
            }
            this.m_DebugLog.Write("Yahoo-Prefs-Folders-Add  : doOK - END");       
            return true;
        }
        catch(e)
        {
             this.m_DebugLog.Write("Yahoo-Pref-Accounts : Exception in doOK : "
                              + e.name +
                              ".\nError message: "
                              + e.message + "\n"
                              + e.lineNumber);
        }
    },

         
    doOkList : function ()
    {
        try
        {
            this.m_DebugLog.Write("Yahoo-Prefs-Folders-Add : doOkList - START");
            
            if (this.m_aszFolderPref) 
            {
                for (var i = 0; i < this.m_aszFolderPref.length-1; i++) 
                {
                    window.arguments[0].aszFolder.push(this.m_aszFolderPref[i]);
                }
            }
            
            var listView = document.getElementById("listFolders");   //click item
            var iRowCount =listView.getRowCount();
            for (var i = 0; i < iRowCount; i++) 
            {
                Item = listView.getItemAtIndex(i);
                var szName = Item.getAttribute("id");
                this.m_DebugLog.Write("Yahoo-Prefs-Folders-Add : doOkList - szName - " + szName);

                var checkbox = Item.childNodes[0].childNodes[1]
                var bChecked = checkbox.getAttribute("checked");
                this.m_DebugLog.Write("Yahoo-Prefs-Folders-Add : doOkList - bChecked - " + bChecked);
                if (bChecked.search(/true/i)!=-1) 
                    window.arguments[0].aszFolder.push(szName);        
            }
    
            window.arguments[1].value = 1;
            window.close();
            
            this.m_DebugLog.Write("Yahoo-Prefs-Folders-Add  : doOkList - END");       
            return true;
        }
        catch(e)
        {
             this.m_DebugLog.Write("Yahoo-Pref-Accounts : Exception in doOkList : "
                                          + e.name +
                                          ".\nError message: "
                                          + e.message + "\n"
                                          + e.lineNumber);
        }
    }, 
     
     
    doCancel: function ()
    {
        this.m_DebugLog.Write("Yahoo-Prefs-Folders-Add  : doCancel - START");
        
        if (this.m_comms) 
        {
            this.m_comms.cancel(true);
            delete this.m_comms;
            this.m_comms = null;
        }
        window.arguments[1].value = -1;
        window.close();
          
        this.m_DebugLog.Write("Yahoo-Prefs-Folders-Add  : doCancel - END");
        return true;
    },
    
    
    doDownloadCancel: function ()
    {
        this.m_DebugLog.Write("Yahoo-Prefs-Folders-Add  : doDownloadCancel - START");
        
        if (this.m_comms) this.m_comms.cancel(true);
       
        document.getElementById("vBoxfolderDownload").setAttribute("hidden", true);
        document.getElementById("vBoxFolderList").setAttribute("hidden", false);
        window.sizeToContent();
        
        this.m_DebugLog.Write("Yahoo-Prefs-Folders-Add  : doDownloadCancel - END");
        return true;
    }
}
