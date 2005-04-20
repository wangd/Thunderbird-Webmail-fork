function Folder(Log)
{
    try
    {  
        var scriptLoader =  Components.classes["@mozilla.org/moz/jssubscript-loader;1"]
                                  .getService(Components.interfaces.mozIJSSubScriptLoader);
        if (scriptLoader)
        {
            scriptLoader.loadSubScript("chrome://web-mail/content/common/DebugLog.js");
            scriptLoader.loadSubScript("chrome://web-mail/content/common/MSG.js");
        }
        
        this.m_Log = Log;                       
        this.m_szHierarchy = null;
        this.m_iUID = 0;
        this.m_iUnRead = 0;
        this.m_iMsgCount = 0;
        this.m_szHref = null;
        this.m_szDisplayName = null;
        this.m_aMSGs = new Array();
    }
    catch(e)
    {
        DebugDump("Folder.js: Constructor : Exception : " 
                                      + e.name 
                                      + ".\nError message: " 
                                      + e.message);
    }
}


Folder.prototype =
{
    newFolder : function (szHierarchy, iUID, szHref, szDisplay, iMsgCount, iUnRead)
    {
        this.m_iUnRead = iUnRead;
        this.m_iMsgCount = iMsgCount;
        this.m_szHierarchy = szHierarchy;
        this.m_iUID = iUID;
        this.m_szHref = szHref;
        this.m_szDisplayName = szDisplay;
    },
    
    
    getHierarchy : function ()
    {
        return this.m_szHierarchy;
    },
    
    
    setHierarchy : function (szHierarchy)
    {
        this.m_szHierarchy = szHierarchy;
    },
    
      
    getUID : function ()
    {
        return this.m_iUID;
    },
    
    
    setUID : function (iUID)
    {
        this.m_iUID = iUID ;
    },
    
      
    getHref : function ()
    {
        return this.m_szHref;
    },
    
    
    setHref : function (szHref)
    {
        this.m_szHref = szHref;
    },
    
    
    getDisplayName : function ()
    {
        return this.m_szDisplayName;
    },
    
    
    setDisplayName : function (szDisplayName)
    {
        this.m_szDisplayName =  szDisplayName; 
    },
    
    
    getUnreadMsgCount : function ()
    {
        return this.m_iUnRead;
    },
    
    
    setUnreadMsgCount : function (iUnRead)
    {
        this.m_iUnRead = iUnRead;
    },
    
    
    getMsgCount : function ()
    {
        return this.m_iMsgCount;
    },
    
    
    
    setMsgCount : function (iCount)
    {
        this.m_iMsgCount = iCount;
    },
    
    
    removeAllMSG : function ()
    {
        try
        {
            this.m_Log.Write("Folder.js - removeAllMSG - START");
            delete this.m_aMSGs;
            this.m_aMSGs = new Array();
            this.m_iMsgCount = 0; 
            this.m_iUnRead = 0;
            this.m_Log.Write("Folder.js - removeAllMSG - END");
        }
        catch(err)
        {
            this.m_Log.Write("Folder.js: removeMSG : Exception : " 
                                          + err.name 
                                          + ".\nError message: " 
                                          + err.message);
        }
    },
    
    
    addMsg : function (oMsg)
    {
        try
        {
            this.m_Log.Write("Folder.js - addMsg - START");
            this.m_Log.Write("Folder.js - addMsg - " + oMsg);
            
            this.m_iMsgCount++;
            if (!oMsg.getRead()) this.m_iUnRead++;
            
            this.m_aMSGs.push(oMsg); 
            this.m_aMSGs = this.m_aMSGs.sort(this.sortUID);
                        
            this.m_Log.Write("Folder.js - addMsg - END");
        }
        catch(err)
        {
            this.m_Log.Write("Folder.js: addMsg : Exception : " 
                                          + err.name 
                                          + ".\nError message: " 
                                          + err.message);
        }
    },
    
    sortUID : function (a,b)
    {
        return ((a.getUID()<b.getUID())?-1:1);
    },
    
    
    getMsgUID : function (iStartUID, iEndUID)
    {
        try
        {
            this.m_Log.Write("Folder.js - getMsgUID - START");
            this.m_Log.Write("Folder.js - getMsgUID -  start " + iStartUID + " end "+ iEndUID);
            
            var aResult = new Array();
            var iMax = this.m_aMSGs.length;
            for (i = 0 ; i<iMax ; i++)
            {
                var temp = this.m_aMSGs[i];
                if (iStartUID<=temp.getUID() && ((iEndUID!=-1)?iEndUID>=temp.getUID():true))
                {
                    this.m_Log.Write("Folder.js - getMsgUID -  found " + i+1);
                    temp.setIndex(i+1);
                    aResult.push(temp);
                }
            }
            this.m_Log.Write("Folder.js - getMsgUID - END"); 
            return aResult;   
        }
        catch(err)
        {
            this.m_Log.Write("Folder.js: getMsgUID : Exception : " 
                                          + err.name 
                                          + ".\nError message: " 
                                          + err.message);
            return null;
        }
    },
    
    
    setMsgDeleteFlag: function (UID,bDelete)
    {
         try
        {
            this.m_Log.Write("Folder.js - setMsgDeleteFlag - START");
           
            for (i = 0 ; i<this.m_aMSGs.length; i++)
            {
                if (this.m_aMSGs[i].getUID()==UID)
                {
                    this.m_Log.Write("Folder.js - setMsgDeleteFlag -  found ");
                    this.m_aMSGs[i].setDelete(bDelete);
                    return true;
                }
            }
            
            this.m_Log.Write("Folder.js - setMsgDeleteFlag - END"); 
            return false;
        }
        catch(err)
        {
            this.m_Log.Write("Folder.js: setMsgDeleteFlag : Exception : " 
                                          + err.name 
                                          + ".\nError message: " 
                                          + err.message);
            return false;
        }
        
    },
    
    
    setMsgSeenFlag : function (UID,bSeen)
    {
         try
        {
            this.m_Log.Write("Folder.js - setMsgSeenFlag - START");
                     
            for (i = 0 ; i<this.m_aMSGs.length; i++)
            {
                if (this.m_aMSGs[i].getUID()==UID)
                {
                    this.m_Log.Write("Folder.js - setMsgDeleteFlag -  found ");
                    this.m_aMSGs[i].setDelete(bDelete);
                    this.m_iUnRead--;
                    return true;
                }
            }
           
            this.m_Log.Write("Folder.js - setMsgSeenFlag - END"); 
            return false;
        }
        catch(err)
        {
            this.m_Log.Write("Folder.js: setMsgSeenFlag : Exception : " 
                                          + err.name 
                                          + ".\nError message: " 
                                          + err.message);
             return false;
        }
        
    },
}
