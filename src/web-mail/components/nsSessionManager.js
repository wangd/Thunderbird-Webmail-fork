/*****************************  Globals   *************************************/                 
const nsSessionManagerClassID = Components.ID("{1bf23e40-385f-11da-8cd6-0800200c9a66}");
const nsSessionManagerContactID = "@mozilla.org/SessionManager;1";
const cExpiryTime = 30 *(1000*60); //min


/***********************  SessionManager ********************************/
function nsSessionManager()
{
    this.m_scriptLoader =  null;
    this.m_Log = null;
    this.m_aSessionData = new Array();
    this.m_Timer = null;    
}

nsSessionManager.prototype =
{

    setSessionData: function (sessionData)
    {
        try
        {
            this.m_Log.Write("nsSessionManager.js - setSessionData - START"); 
            var szUserName = sessionData.szUserName;
            this.m_Log.Write("nsSessionManager.js - setSessionData - " + szUserName);
           
            var bFound = false;
            
            //find and update
            for (i=0; i<this.m_aSessionData.length; i++)
            {
                var regUserName = new RegExp(this.m_aSessionData[i].szUserName,"i");
                this.m_Log.Write("nsSessionManager.js - setSessionData - search " + regUserName);
                
                if (szUserName.search(regUserName)!=-1)
                {
                    this.m_Log.Write("nsSessionManager.js - setSessionData - Found ");
                   
                    if (this.m_aSessionData[i].oCookieManager) delete this.m_aSessionData[i].oCookieManager;
                    this.m_aSessionData[i].oCookieManager = sessionData.oCookieManager; 
                    
                    if (this.m_aSessionData[i].oHttpAuthManager) delete this.m_aSessionData[i].oHttpAuthManager;
                    this.m_aSessionData[i].oHttpAuthManager = sessionData.oHttpAuthManager;
                    
                    if (this.m_aSessionData[i].oComponentData) delete this.m_aSessionData[i].oComponentData;                    
                    this.m_aSessionData[i].oComponentData = sessionData.oComponentData; 
                    
                    this.m_aSessionData[i].iExpiryTime = sessionData.iExpiryTime; 
                    
                    this.m_aSessionData[i].bBlocked = false;
                    
                    bFound = true; 
                }
            }
            
            if (!bFound)//add
            {
                this.m_Log.Write("nsSessionManager.js - setSessionData - adding"); 
                sessionData.bBlocked=false;
                this.m_aSessionData.push(sessionData);
            }
            
            this.m_Log.Write("nsSessionManager.js - setSessionData - END"); 
            return true;
        }
        catch(err)
        {
            this.m_Log.DebugDump("nsSessionManager.js: setSessionData : Exception : " 
                                      + err.name + 
                                      ".\nError message: " 
                                      + err.message+ "\n"
                                      + err.lineNumber);
            return false;
        }
    },
    
    
    
    removeSession : function (szUserName)
    {
        try
        {
            this.m_Log.Write("nsSessionManager.js - removeSession - START"); 
            this.m_Log.Write("nsSessionManager.js - removeSession - " + szUserName);
                      
            //find and delete
            for (i=0; i<this.m_aSessionData.length; i++)
            {
                var temp = this.m_aSessionData.shift();  //get first item
                var regUserName = new RegExp(temp.szUserName,"i");
                this.m_Log.Write("nsSessionManager.js - removeSession - search " + regUserName);
                
                if (szUserName.search(regUserName)!=-1)
                {
                    this.m_Log.Write("nsSessionManager - removeSession Found");
                    delete temp; 
                }
                else
                    this.m_aSessionData.push(temp);
            }
            
            this.m_Log.Write("nsSessionManager.js - removeSession - END"); 
            return true;
        }
        catch(err)
        {
            this.m_Log.DebugDump("nsSessionManager.js: removeSession : Exception : " 
                                      + err.name + 
                                      ".\nError message: " 
                                      + err.message+ "\n"
                                      + err.lineNumber);
            return false;
        }
    },
    
    
    
    findSessionData : function (szUserName)
    {
        try
        {
            this.m_Log.Write("nsSessionManager.js - findSessionData - START"); 
            this.m_Log.Write("nsSessionManager.js - findSessionData - " + szUserName);
                      
            //find and delete
            for (i=0; i<this.m_aSessionData.length; i++)
            {
                var regUserName = new RegExp(this.m_aSessionData[i].szUserName,"i");
                this.m_Log.Write("nsSessionManager.js - findSessionData - search " + regUserName);
                
                if (szUserName.search(regUserName)!=-1)
                {
                    var temp = this.m_aSessionData[i];  //get first item
                    this.m_Log.Write("nsSessionManager - findSessionData Found");
                    temp.bBlocked =true;
                    return temp;
                }
            }
            
            this.m_Log.Write("nsSessionManager.js - findSessionData - END"); 
            return null;
        }
        catch(err)
        {
            this.m_Log.DebugDump("nsSessionManager.js: findSessionData : Exception : " 
                                      + err.name + 
                                      ".\nError message: " 
                                      + err.message+ "\n"
                                      + err.lineNumber);
            return null;
        }
    },
    
    
    
    notify : function(timer)
    {
        try
        {
            this.m_Log.Write("nsSessionManager.js - Timer - START"); 
    
            var date = new Date();
            var timeNow = date.getTime();
            this.m_Log.Write("nsSessionManager.js - Timer - now " + timeNow);
            
            //find and delete
            for (i=0; i<this.m_aSessionData.length; i++)
            {
                var temp = this.m_aSessionData.shift();  //get first item
                this.m_Log.Write("nsSessionManager.js - Timer - user name " + temp.szUserName);
                this.m_Log.Write("nsSessionManager.js - Timer - status " + temp.bBlocked);
                this.m_Log.Write("nsSessionManager.js - Timer - expiry time " + temp.iExpiryTime );
                
                if (!temp.bBlocked)
                {
                    if (temp.iExpiryTime > timeNow )
                    {
                        this.m_Log.Write("nsSessionManager.js - Timer - deleting");
                        delete temp;
                    }
                    else
                    {
                        this.m_Log.Write("nsSessionManager.js - Timer - pushed back");
                        this.m_aSessionData.push(temp);
                    }
                }
            }
                
            this.m_Log.Write("nsSessionManager.js - Timer - END"); 
        }
        catch(err)
        {
            this.m_Log.DebugDump("nsSessionManager.js: Timer : Exception : " 
                                      + err.name + 
                                      ".\nError message: " 
                                      + err.message+ "\n"
                                      + err.lineNumber);
        }
    },
    
    
    
    observe : function(aSubject, aTopic, aData) 
    {
        switch(aTopic) 
        {
            case "xpcom-startup":
                // this is run very early, right after XPCOM is initialized, but before
                // user profile information is applied. Register ourselves as an observer
                // for 'profile-after-change' and 'quit-application'.
                var obsSvc = Components.classes["@mozilla.org/observer-service;1"].
                                getService(Components.interfaces.nsIObserverService);
                obsSvc.addObserver(this, "profile-after-change", false);
                
                this.m_scriptLoader = Components.classes["@mozilla.org/moz/jssubscript-loader;1"]
                                        .getService(Components.interfaces.mozIJSSubScriptLoader); 
                                        
            break;
            
            case "profile-after-change":
                // This happens after profile has been loaded and user preferences have been read.
                // startup code here
                this.m_scriptLoader.loadSubScript("chrome://web-mail/content/common/DebugLog.js");
                                
                this.m_Log = new DebugLog("webmail.logging.comms", 
                                          "{3c8e8390-2cf6-11d9-9669-0800200c9a66}",
                                          "SessionManager");
                   
                this.m_Log.Write("nsSessionManager : STARTED");     
                
                //expiry timer
                this.m_Timer = Components.classes["@mozilla.org/timer;1"];
                this.m_Timer = this.m_Timer.createInstance(Components.interfaces.nsITimer); 
                this.m_Timer.initWithCallback(this, 
                                              cExpiryTime, 
                                              Components.interfaces.nsITimer.TYPE_REPEATING_SLACK);
            break;

            case "quit-application": // shutdown code here
            break;
        
            case "app-startup":
            break;
            
            default:
                throw Components.Exception("Unknown topic: " + aTopic);
        }
    },
    
        
    
/******************************************************************************/
/***************** XPCOM  stuff ***********************************************/
/******************************************************************************/
    QueryInterface : function (iid)
    {
        if (!iid.equals(Components.interfaces.nsISessionManager) 
        	    && !iid.equals(Components.interfaces.nsISupports)
                    && !iid.equals(Components.interfaces.nsIObserver))
            throw Components.results.NS_ERROR_NO_INTERFACE;
            
        return this;
    }
}
 

/******************************************************************************/
/* FACTORY*/
var nsSessionManagerFactory = new Object();

nsSessionManagerFactory.createInstance = function (outer, iid)
{
    if (outer != null)
        throw Components.results.NS_ERROR_NO_AGGREGATION;
    
    if (!iid.equals(nsSessionManagerClassID) 
                            && !iid.equals(Components.interfaces.nsISupports))
        throw Components.results.NS_ERROR_INVALID_ARG;
    
    return new nsSessionManager();
}


/******************************************************************************/
/* MODULE */
var nsSessionManagerModule = new Object();

nsSessionManagerModule.registerSelf = function(compMgr, fileSpec, location, type)
{
    var catman = Components.classes["@mozilla.org/categorymanager;1"].
                        getService(Components.interfaces.nsICategoryManager);
        
    catman.addCategoryEntry("xpcom-startup", 
                            "Session Manager", 
                            nsSessionManagerContactID, 
                            true, 
                            true);                     
                            
    catman.addCategoryEntry("app-startup", 
                            "Session Manager", 
                            "service," + nsSessionManagerContactID, 
                            true, 
                            true);
                            
    catman.addCategoryEntry("xpcom-shutdown",
                            "Session Manager", 
                            nsSessionManagerContactID, 
                            true, 
                            true);  
                            
    compMgr = compMgr.QueryInterface(Components.interfaces.nsIComponentRegistrar);
    compMgr.registerFactoryLocation(nsSessionManagerClassID,
                                    "Session Manager",
                                    nsSessionManagerContactID, 
                                    fileSpec,
                                    location, 
                                    type);
}


nsSessionManagerModule.unregisterSelf = function(aCompMgr, aFileSpec, aLocation)
{
    var catman = Components.classes["@mozilla.org/categorymanager;1"].
                            getService(Components.interfaces.nsICategoryManager);
                            
    catman.deleteCategoryEntry("xpcom-startup", "Session Manager", true);
    catman.deleteCategoryEntry("app-startup", "Session Manager", true);
    catman.deleteCategoryEntry("xpcom-shutdown", "Session Manager", true);
    
    aCompMgr = aCompMgr.QueryInterface(Components.interfaces.nsIComponentRegistrar);
    aCompMgr.unregisterFactoryLocation(nsSessionManagerClassID, aFileSpec);
}

 
nsSessionManagerModule.getClassObject = function(compMgr, cid, iid)
{
    if (!cid.equals(nsSessionManagerClassID))
        throw Components.results.NS_ERROR_NO_INTERFACE;

    if (!iid.equals(Components.interfaces.nsIFactory))
        throw Components.results.NS_ERROR_NOT_IMPLEMENTED;

    return nsSessionManagerFactory;
}


nsSessionManagerModule.canUnload = function(compMgr)
{
    return true;
}
/******************************************************************************/


function NSGetModule(compMgr, fileSpec)
{
    return nsSessionManagerModule; 
}
