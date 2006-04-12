var gYahooFoldersEdit = 
{
    m_strBundle : null,
    m_oUserData : null,
           
    init: function ()
    {
        try
        {
            this.m_Log = new DebugLog("webmail.logging.comms", 
                                      "{3c8e8390-2cf6-11d9-9669-0800200c9a66}",
                                      "yahooPrefs");
            this.m_Log.Write("Yahoo-Folders-Edit : init - START");
              
            this.m_oUserData = window.arguments[0]; 
            this.m_Log.Write("Yahoo-Folders-Edit : init - address " + this.m_oUserData.szUser);
            
            document.getElementById("labelAddress").setAttribute("value", this.m_oUserData.szUser);
            document.getElementById("chkJunkMail").checked = this.m_oUserData.chkJunkMail;
  
            if (this.m_oUserData.aszFolders) 
            {   
                this.m_Log.Write("Yahoo-Folders-Edit : init - address " + this.m_oUserData.aszFolders);

                var list = document.getElementById("listView");
                
                for (i=0; i<this.m_oUserData.aszFolders.length; i++)
                {
                    var newItem = document.createElement("richlistitem"); 
                    newItem.setAttribute("id", this.m_oUserData.aszFolders[i]);
                    newItem.setAttribute("class", "listItem");
                    newItem.setAttribute("tabIndex", i);
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
                    label.setAttribute("value",this.m_oUserData.aszFolders[i]); 
                    label.setAttribute("class","foldername");
                    newItem.appendChild(label);
                    
                    list.appendChild(newItem);
                }
            }
            
            this.m_Log.Write("Yahoo-Folders-Edit : init - END");   
            return true;
        }
        catch(err)
        {
             DebugDump("Yahoo-Folders-Edit : Exception in init : " 
                                               + err.name 
                                               + ".\nError message: " 
                                               + err.message + "\n"
                                               + err.lineNumber);
        }
    },




    onSelect : function ()
    {
        try
        {
            this.m_Log.Write("Yahoo-Folders-Edit : onSelect - START");

            var listView = document.getElementById("listView");   //click item
            var iIndex = listView.selectedIndex;
            this.m_Log.Write("Yahoo-Folders-Edit : onSelect - iIndex "+iIndex);
            
            var buttonRemove = document.getElementById("remove");   
            buttonRemove.setAttribute("disabled", iIndex!=-1? false : true);
                
            this.m_Log.Write("Yahoo-Folders-Edit : onSelect - END");
            return true;
        }
        catch(e)
        {
            this.m_Log.DebugDump("Yahoo-Folders-Edit : Exception in onSelect : " 
                                          + e.name + 
                                          ".\nError message: " 
                                          + e.message + "\n"
                                          + e.lineNumber);
        }
    },



    doAdd : function ()
    {
        this.m_Log.Write("Yahoo-Folders-Edit: doAdd - START");
        
        var oResult = {value : -1};
        var oParam = {szfolder : null};
        window.openDialog("chrome://Yahoo/content/Yahoo-Prefs-Folders-Add.xul",
                          "Add",
                          "chrome, centerscreen, modal",
                          oParam,
                          oResult);  
    
        this.m_Log.Write("Yahoo-Folders-Edit : doAdd oResult.value " + oResult.value);
        if (oResult.value!=-1)
        {
            this.m_Log.Write("Yahoo-Folders-Edit : doAdd oParam.szfolder " + oParam.szFolder);
            
            //add to array
            if(!this.m_oUserData.aszFolders)
                this.m_oUserData.aszFolders = new Array();
            this.m_oUserData.aszFolders.push(oParam.szFolder);
            
            //add item to list
            var newItem = document.createElement("richlistitem"); 
            newItem.setAttribute("id", oParam.szFolder);
            newItem.setAttribute("class", "listItem");
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
            label.setAttribute("value",oParam.szFolder); 
            label.setAttribute("class","foldername");          
            newItem.appendChild(label);
            
            document.getElementById("listView").appendChild(newItem);
            
            var event = document.createEvent("Events");
            event.initEvent("change", false, true);
            document.getElementById("listView").dispatchEvent(event);
        }
        
        this.m_Log.Write("Yahoo-Folders-Edit : doAdd - END");
        return true;
    },
    

    doRemove : function ()
    {
        this.m_Log.Write("Yahoo-Folders-Edit: doRemove - START");
        
        //get selected item
        var listView = document.getElementById("listView");   //click item
        var iIndex = listView.selectedIndex;
        this.m_Log.Write("Yahoo-Folders-Edit : doRemove - iIndex "+iIndex);
        
        //remove from array
        for (i=0; this.m_oUserData.aszFolders.length>i; i++)
        {
            var temp = this.m_oUserData.aszFolders.shift();
            this.m_Log.Write("Yahoo-Folders-Edit : doRemove - temp "+temp);
            
            if (i!= iIndex)
            {
                this.m_oUserData.aszFolders.push(temp);
                this.m_Log.Write("Yahoo-Folders-Edit : doRemove - pushed back ");
            }
            
        }
        
        //remove for display
        var item = listView.getItemAtIndex(iIndex);
        listView.removeChild(item);

        if (listView.getRowCount()>0) 
            listView.selectedIndex = 0;  //select first item
        else   
            document.getElementById("remove").setAttribute("disabled",true);
        
        var event = document.createEvent("Events");
        event.initEvent("change", false, true);
        document.getElementById("listView").dispatchEvent(event);
        
        this.m_Log.Write("Yahoo-Folders-Edit : doRemove - END");
        return true;
    },
    
     
    doOk : function ()
    {
        this.m_Log.Write("Yahoo-Folders-Edit: doOK - START");
        
        window.arguments[1].value = 1;
        window.arguments[0].chkJunkMail = document.getElementById("chkJunkMail").checked;
        if (this.m_oUserData.aszFolders.length==0)
        {
            delete window.arguments[0].aszFolders;
            window.arguments[0].aszFolders = null;
        }
        window.close();
        
        this.m_Log.Write("Yahoo-Folders-Edit : doOK - END");
        return true;
    },

     
    doCancel: function ()
    {
        this.m_Log.Write("Yahoo-Folders-Edit : doCancel - START");
        
        window.arguments[1].value = -1;
        window.close();
        
        this.m_Log.Write("Yahoo-Folders-Edit : doCancel - END");
        return true;
    },

};
