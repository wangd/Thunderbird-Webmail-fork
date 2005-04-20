function FolderManager(errorLog)
{  
    try
    {
        var scriptLoader =  Components.classes["@mozilla.org/moz/jssubscript-loader;1"]
                                  .getService(Components.interfaces.mozIJSSubScriptLoader);
        if (scriptLoader)
        {
            scriptLoader.loadSubScript("chrome://web-mail/content/common/DebugLog.js");
            scriptLoader.loadSubScript("chrome://web-mail/content/common/Folder.js");
        }
        
        this.m_Log = errorLog;
        this.m_aFolders = new Array();
        this.m_iCount = 0;
    }
    catch(e)
    {
         DebugDump("FolderManager.js: Constructor : Exception : " 
                                      + e.name 
                                      + ".\nError message: " 
                                      + e.message);
    }
}


FolderManager.prototype =
{
    getFolderCount : function ()
    {
        return this.m_iCount
    },
    
    
    addFolder : function(szHierarchy, iUID, szHref, szDisplay, iMsgCount, iUnRead)
    {
        try
        {
            this.m_Log.Write("FolderManager.js - addFolder - START");
            this.m_Log.Write("FolderManager.js - addFolder - " + szHierarchy + " "
                                                               + iUID + " "
                                                               + szHref + " "
                                                               + szDisplay + " "
                                                               + iMsgCount + " "
                                                               + iUnRead);
            
            if (!szHierarchy || !szHref || !szDisplay) return false; 
            this.m_iCount++;
            var oFolder = new Folder(this.m_Log);
            oFolder.newFolder(szHierarchy, iUID, szHref, szDisplay, iMsgCount, iUnRead); 
            this.m_aFolders.push(oFolder); //place folder in array
             
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
    },
    
     
    
      
    //return folders matching szHierarchy
    getFolders : function (szHierarchy)
    {
        try
        {
            this.m_Log.Write("FolderManager.js - findFolder - START");
            this.m_Log.Write("FolderManager.js - findFolder - " + szHierarchy );
            if (!szHierarchy) throw new Error("no szHierarchy");
            if (this.m_aFolders.length == 0) throw new Error("no folders");   
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
    
    
    
    addMsg :function ( szHierarchy, oMSG)
    {
        try
        {
            this.m_Log.Write("FolderManager.js - addMsg - START ");
            this.m_Log.Write("FolderManager.js - addMsg - szFolder " + szHierarchy + " MSG " + oMSG );
             
            if (!szHierarchy) return null;
            if (this.m_aFolders.length == 0) return null;   
            if (szHierarchy.search(/INBOX/)==-1) return null;
                        
            var iMax = this.m_aFolders.length;
            for (i = 0 ; i<iMax ; i++)
            {     
                var szTempHierarchy = this.m_aFolders[i].getHierarchy();
                this.m_Log.Write("FolderManager.js - addMsg " + i + " "+ szTempHierarchy);
                
                var aHier = szHierarchy.split(".");
                this.m_Log.Write("FolderManager.js - addMsg " + i + " "+ aHier);
                var reg = null;
                if (aHier.length==1)
                    reg = new RegExp(szHierarchy+"$");
                else
                    reg = new RegExp(aHier[1]);
                this.m_Log.Write("FolderManager.js - addMsg  Reg " + i + " "+ reg);
                
                if (szTempHierarchy.search(reg)!=-1)
                {
                    this.m_Log.Write("FolderManager.js - addMsg found" + i);
                    this.m_aFolders[i].addMSG (oMSG);
                    return true;
                }
            }
            
            this.m_Log.Write("FolderManager.js - addMsg - END ");
            return false;
        }
        catch(e)
        {
             this.m_Log.Write("FolderManager.js: addMsg : Exception : " 
                                          + e.name 
                                          + ".\nError message: " 
                                          + e.message);
            return false;
        }
    },
    
    
    removeAllMsg :function (szHierarchy)
    {
        try
        {
            this.m_Log.Write("FolderManager.js - removeAllMsg - START ");
            this.m_Log.Write("FolderManager.js - removeAllMsg - szFolder " + szHierarchy );
             
            if (!szHierarchy) return null;
            if (this.m_aFolders.length == 0) return null;   
            if (szHierarchy.search(/INBOX/)==-1) return null;
                        
            var iMax = this.m_aFolders.length;
            for (i = 0 ; i<iMax ; i++)
            {
                var szTempHierarchy = this.m_aFolders[i].getHierarchy();
                this.m_Log.Write("FolderManager.js - removeAllMsg " + i + " "+ szTempHierarchy);
                
                var aHier = szHierarchy.split(".");
                this.m_Log.Write("FolderManager.js - removeAllMsg " + i + " "+ aHier);
                var reg = null;
                if (aHier.length==1)
                    reg = new RegExp(szHierarchy+"$");
                else
                    reg = new RegExp(aHier[1]);
                this.m_Log.Write("FolderManager.js - removeAllMsg  Reg " + i + " "+ reg);
                
                if (szTempHierarchy.search(reg)!=-1)
                {
                    this.m_Log.Write("FolderManager.js - removeAllMsg found" + i);
                    this.m_aFolders[i].removeAllMSG();
                    return true;
                }
            }
            
            this.m_Log.Write("FolderManager.js - removeAllMsg - END ");
            return false;
        }
        catch(e)
        {
             this.m_Log.Write("FolderManager.js: removeAllMsg : Exception : " 
                                          + e.name 
                                          + ".\nError message: " 
                                          + e.message);
             return false;
        }
    },
    
    
    getMsgsUID : function (szHierarchy, iStartUID, iEndUID)
    {
        try
        {
            this.m_Log.Write("FolderManager.js - getMsgsUID - START ");
            this.m_Log.Write("FolderManager.js - getMsgsUID - Folder " + szHierarchy 
                                                            + " start " + iStartUID
                                                            + " end " + iEndUID );
             
            if (!szHierarchy) return null;
            if (this.m_aFolders.length == 0) return null;   
            if (szHierarchy.search(/INBOX/)==-1) return null;
            
            var iMax = this.m_aFolders.length;
            for (i = 0 ; i<iMax ; i++)
            {
                var szTempHierarchy = this.m_aFolders[i].getHierarchy();
                this.m_Log.Write("FolderManager.js - getMsgsUID " + i + " "+ szTempHierarchy);
                
                var aHier = szHierarchy.split(".");
                this.m_Log.Write("FolderManager.js - getMsgsUID " + i + " "+ aHier);
                var reg = null;
                if (aHier.length==1)
                    reg = new RegExp(szHierarchy+"$");
                else
                    reg = new RegExp(aHier[1]);
                this.m_Log.Write("FolderManager.js - getMsgsUID  Reg " + i + " "+ reg);
                
                if (szTempHierarchy.search(reg)!=-1)
                {
                    this.m_Log.Write("FolderManager.js - getMsgsUID found" + i);
                    var aResult =  this.m_aFolders[i].getMsgUID(iStartUID, iEndUID);
                    return aResult;
                }
            }
            this.m_Log.Write("FolderManager.js - getMsgsUID - END ");
            return null;
        }
        catch(err)
        {
            this.m_Log.Write("FolderManager.js: getMsgsUID : Exception : " 
                                          + e.name 
                                          + ".\nError message: " 
                                          + e.message);
            return null;
        }
    },
    
    
    setMsgDeleteFlag: function (Folder, MsgUID,bDelete)
    {
         try
        {
            this.m_Log.Write("FolderManager.js - setMsgDeleteFlag - START");
                 
            for (i = 0 ; i<this.m_aFolders.length ; i++)
            {
                if (Folder == this.m_aFolders[i].getUID())
                {
                    this.m_aFolders.setMsgDeleteFlag(MsgUID,bDelete);
                    return true;
                }                    
            }
            
            this.m_Log.Write("FolderManager.js - setMsgDeleteFlag - END"); 
            return false;
        }
        catch(err)
        {
            this.m_Log.Write("FolderManager.js: setMsgDeleteFlag : Exception : " 
                                          + err.name 
                                          + ".\nError message: " 
                                          + err.message);
            return false;
        }
        
    },
    
    
    setMsgSeenFlag : function (Folder, MsgUID, bSeen)
    {
        try
        {
            this.m_Log.Write("FolderManager.js - setMsgSeenFlag - START");
                           
            for (i = 0 ; i<this.m_aFolders.length ; i++)
            {
                if (Folder == this.m_aFolders[i].getUID())
                {
                    this.m_aFolders.setMsgSeenFlag(MsgUID,bSeen);
                    return true;
                }                    
            }
            
            this.m_Log.Write("FolderManager.js - setMsgSeenFlag - END");
            return false;
        }
        catch(err)
        {
            this.m_Log.Write("FolderManager.js: setMsgSeenFlag : Exception : " 
                                          + err.name 
                                          + ".\nError message: " 
                                          + err.message);
            return false;
        }
        
    },
}
