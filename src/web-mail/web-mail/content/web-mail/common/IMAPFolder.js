function IMAPFolder(errorLog)
{  
    try
    {
        var scriptLoader =  Components.classes["@mozilla.org/moz/jssubscript-loader;1"]
                                  .getService(Components.interfaces.mozIJSSubScriptLoader);
        scriptLoader.loadSubScript("chrome://web-mail/content/common/DebugLog.js");

        this.m_Log = errorLog;
        this.m_iID = -1;
    }
    catch(e)
    {
         DebugDump("FolderManager.js: Constructor : Exception : " 
                                      + e.name 
                                      + ".\nError message: " 
                                      + e.message);
    }
}


IMAPFolder.prototype =
{
    setUserName : function(szUserName)
    {
        try
        {
            this.m_Log.Write("IMAPFolder.js - setUserName - START");
            this.m_Log.Write("IMAPFolder.js - setUserName - "+szUserName);
            this.m_Log.Write("IMAPFolder.js - setUserName - END");
            return this.m_iID ;     
        }
        catch(err)
        {
            this.m_Log.DebugDump("nsLycosIMAP.js: setUserName : Exception : "
                                              + err.name + 
                                              ".\nError message: " 
                                              + err.message+ "\n"
                                              + err.lineNumber);
            return -1;
        }
    },
    
    
    
    setUserId : function(iUserId)
    {
        try
        {
            this.m_Log.Write("IMAPFolder.js - setUserId - START");
            this.m_Log.Write("IMAPFolder.js - setUserId - "+iUserId);
            this.m_Log.Write("IMAPFolder.js - setUserId - END");
            return true;
        }
        catch(err)
        {
            this.m_Log.DebugDump("nsLycosIMAP.js: setUserId : Exception : "
                                              + err.name + 
                                              ".\nError message: " 
                                              + err.message+ "\n"
                                              + err.lineNumber);
            return false;
        }
    },
    
    
    listSubscribed : function ()
    {
        try
        {
            this.m_Log.Write("IMAPFolder.js - listSubscribed - START");
            this.m_Log.Write("IMAPFolder.js - listSubscribed - END");
            return "todo";
        }
        catch(err)
        {
            this.m_Log.DebugDump("nsLycosIMAP.js: listSubscribed : Exception : "
                                              + err.name + 
                                              ".\nError message: " 
                                              + err.message+ "\n"
                                              + err.lineNumber);
            return false;
        }
    },
    
    
    subscribeFolder : function (szFolder)
    {
        try
        {
            this.m_Log.Write("IMAPFolder.js - subscribeFolder - START");
            this.m_Log.Write("IMAPFolder.js - subscribeFolder - szFolder "+ szFolder);
            this.m_Log.Write("IMAPFolder.js - subscribeFolder - END");
            return true;
        }
        catch(err)
        {
            this.m_Log.DebugDump("nsLycosIMAP.js: subscribeFolder : Exception : "
                                              + err.name + 
                                              ".\nError message: " 
                                              + err.message+ "\n"
                                              + err.lineNumber);
            return false;
        }
    },
    
    
    unSubscribeFolder : function (szFolder)
    {
        try
        {
            this.m_Log.Write("IMAPFolder.js - unSubscribeFolder - START");
            this.m_Log.Write("IMAPFolder.js - unSubscribeFolder - szFolder "+ szFolder);
            this.m_Log.Write("IMAPFolder.js - unSubscribeFolder - END");
            return true;
        }
        catch(err)
        {
            this.m_Log.DebugDump("nsLycosIMAP.js: unSubscribeFolder : Exception : "
                                              + err.name + 
                                              ".\nError message: " 
                                              + err.message+ "\n"
                                              + err.lineNumber);
            return false;
        }
    },
    
 
    addFolder : function(szHierarchy, szHref, szDisplay)
    {
        try
        {
            this.m_Log.Write("FolderManager.js - addFolder - START");
            this.m_Log.Write("FolderManager.js - addFolder - " + szHierarchy + " "
                                                               + szHref + " "
                                                               + szDisplay);         
            if (!szHierarchy || !szHref || !szDisplay) return false; 
         
            this.m_Log.Write("FolderManager.js - addFolder - END");
        }
        catch(e)
        {
            this.m_Log.Write("FolderManager.js: addFolder : Exception : " 
                                          + e.name 
                                          + ".\nError message: " 
                                          + e.message);
        }
    },
    
    
    //return folders matching szHierarchy
    getFolders : function (szHierarchy)
    {
        try
        {
            this.m_Log.Write("FolderManager.js - findFolder - START");
            this.m_Log.Write("FolderManager.js - findFolder - " + szHierarchy );
            if (!szHierarchy) throw new Error("no szHierarchy");
            if (szHierarchy.search(/INBOX/)==-1) throw new Error("searching not for inbox");
            
            var bWildcards = false;
            if (szHierarchy.search(/INBOX\.\*|\%$/)!=-1) bWildcards = true; 
            this.m_Log.Write("FolderManager.js - findFolders - wildcard " + bWildcards);
            
            var aResult = new Array();
            
            var iMax = this.m_aFolders.length;
            for (i = 0 ; i<iMax ; i++)
            {
                this.m_Log.Write("FolderManager.js - findFolders " + this.m_aFolders[0]);
                
                if (this.m_aFolders[0] != undefined)
                {  
                    var temp = this.m_aFolders.shift();  //get first item
                    
                    var szTempHierarchy = temp.getHierarchy();
                    this.m_Log.Write("FolderManager.js - findFolders " + i + " "+ szTempHierarchy);
                   
                    if (bWildcards) //wildcard retun everything
                    {
                        aResult.push(temp);
                    }
                    else
                    {
                        var aHier = szHierarchy.split(".");
                        this.m_Log.Write("FolderManager.js - findFolders " + i + " "+ aHier);
                        var reg = null;
                        if (aHier.length==1)
                            reg = new RegExp(szHierarchy+"$");
                        else
                            reg = new RegExp(aHier[1]);
                        this.m_Log.Write("FolderManager.js - findFolders  Reg " + i + " "+ reg);
                        
                        if (szTempHierarchy.search(reg)!=-1)
                        {
                            this.m_Log.Write("FolderManager.js - findFolders found" + i + " "+ reg);
                            aResult.push(temp);
                        }
                    }
                    
                    this.m_aFolders.push(temp);
                }
            }
            
            this.m_Log.Write("FolderManager.js - findFolder - END ");
            return (aResult.length>0? aResult : null); 
        }
        catch(e)
        {
            this.m_Log.Write("FolderManager.js: findFolder : Exception : " 
                                          + e.name 
                                          + ".\nError message: " 
                                          + e.message);
            return null;
        }
    },
    
       
    getFolderCount : function ()
    {
        return this.m_iCount
    },
    
    
    
    deleteFolder : function (szFolder)
    {
        try
        {
            this.m_Log.Write("FolderManager.js - deleteFolder - START");
            
            var iMax = this.m_aFolders.length;
            for (i = 0 ; i<iMax ; i++)
            {
                this.m_Log.Write("FolderManager.js - deleteFolder " + this.m_aFolders[0]);
                
                if (this.m_aFolders[0] != undefined)
                {  
                    var temp = this.m_aFolders.shift();  //get first item
                    
                    var iTempHier = temp.getHierarchy();
                    this.m_Log.Write("FolderManager.js - deleteFolder " + i + " "+ iTempHier);
                   
                                     
                    if (iTempHier != szFolder)
                    {
                        this.m_Log.Write("FolderManager.js - deleteFolder put back" + i);
                        this.m_aFolders.push(temp);
                        return true;
                    }
                    else
                    {
                        this.m_Log.Write("FolderManager.js - deleteFolder done" + i);
                        return true;
                    }
                }
            }
            
            this.m_Log.Write("FolderManager.js - deleteFolder - end");
            return false;   
        }
        catch(err)
        {
            this.m_Log.Write("FolderManager.js: deleteFolder : Exception : " 
                                          + err.name 
                                          + ".\nError message: " 
                                          + err.message);
            return false;
        }
    },
    
    
    
    
    renameFolder : function (szOldFolderName, szNewFolderName,szNewHref)
    {
        try
        {
            this.m_Log.Write("FolderManager.js - renameFolder - START");
            this.m_Log.Write("FolderManager.js - renameFolder - "+ szOldFolderName + " "
                                                                 +szNewFolderName + " "
                                                                 +szNewHref);
            
            var iMax = this.m_aFolders.length;
            for (i = 0 ; i<iMax ; i++)
            {
                this.m_Log.Write("FolderManager.js - renameFolder " + this.m_aFolders[0]);
                
                if (this.m_aFolders[0] != undefined)
                {  
                    var temp = this.m_aFolders.shift();  //get first item
                    
                    var szTempHier = temp.getHierarchy();
                    this.m_Log.Write("FolderManager.js - renameFolder " + i + " "+ szTempHier);
                   
                                     
                    if (szTempHier != szOldFolderName)
                    {
                        this.m_Log.Write("FolderManager.js - renameFolder put back" + i);
                        this.m_aFolders.push(temp);
                        return true;
                    }
                    else
                    {
                        this.m_Log.Write("FolderManager.js - renameFolder done" + i);
                        temp.setHref(szNewHref);
                        temp.setDisplayName(szNewFolderName);
                        this.m_aFolders.push(temp);
                        return true;
                    }
                }
            }
            
            this.m_Log.Write("FolderManager.js - renameFolder - end");
            return false;   
        }
        catch(err)
        {
            this.m_Log.Write("FolderManager.js: renameFolder : Exception : " 
                                          + err.name 
                                          + ".\nError message: " 
                                          + err.message);
            return false;
        }
    },
    
   
   
    
    updateFolder : function (oFolder)
    {
        try
        {
            this.m_Log.Write("FolderManager.js - updateFolder - START");
            this.m_Log.Write("FolderManager.js - updateFolder - " + oFolder);
            
            if (!oFolder) return false;
             
            var iUID =  oFolder.getUID();        
            var iMax = this.m_aFolders.length;
            for (i = 0 ; i<iMax ; i++)
            {
                this.m_Log.Write("FolderManager.js - updateFolder " + this.m_aFolders[0]);
                
                if (this.m_aFolders[0] != undefined)
                {  
                    var temp = this.m_aFolders.shift();  //get first item
                    
                    var iTempUID = temp.getUID();
                    this.m_Log.Write("FolderManager.js - updateFolder " + i + " "+ iTempUID);
                   
                                     
                    if (iTempUID == iUID)
                    {
                        this.m_Log.Write("FolderManager.js - updateFolder done" + i);
                        this.m_aFolders.push(oFolder);
                        return true;
                    }
                    else
                    {
                         this.m_aFolders.push(temp);
                    }
                }
            }
            
            this.m_Log.Write("FolderManager.js - updateFolder - END");
        }
        catch(e)
        {
            this.m_Log.Write("FolderManager.js: updateFolder : Exception : " 
                                          + e.name 
                                          + ".\nError message: " 
                                          + e.message);
        }
    }
}
