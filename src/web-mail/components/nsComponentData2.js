/*****************************  Globals   *************************************/                 
const nsComponentData2ClassID = Components.ID("{d98abcd0-e3a8-11da-8ad9-0800200c9a66}");
const nsComponentData2ContactID = "@mozilla.org/nsComponentData2;1";


/***********************  Component Data ********************************/
function nsComponentData()
{   
    this.m_Log = null;
    this.m_aElements = new Array();
    this.m_scriptLoader = null;
}

nsComponentData.prototype =
{

    addElement : function (szUserName, szName, szValue)
    {
        try
        {
            this.m_Log.Write("nsComponentData.js - addElement - START"); 
            this.m_Log.Write("nsComponentData.js - addElement - " + szUserName + " - " + szName +"- " + szValue);
            if (!szUserName || !szName || !szValue) return false;
            
            var bFound = false;
            
            //find and update
            for (i=0; i<this.m_aElements.length; i++)
            {
                var usernameRegExp = new RegExp(this.m_aElements[i].szUserName,"i");
                var nameRegExp = new RegExp(this.m_aElements[i].szName,"i");
                this.m_Log.Write("nsComponentData.js - addElement - search " + nameRegExp + " " + usernameRegExp);
                if (szUserName.search(usernameRegExp)!=-1 && szName.search(nameRegExp)!=-1)
                {
                    this.m_Log.Write("nsComponentData.js - addElement - Found ");
                    
                    this.m_aElements[i].szName = szName;
                    this.m_aElements[i].szValue = szValue;       
                    bFound = true; 
                }
            }
            
            if (!bFound)//add
            {
                this.m_Log.Write("nsComponentData.js - addElement - adding"); 
                var oData = new componentData();
                oData.szName = szName;
                oData.szUserName = szUserName;
                oData.szValue = szValue; 
                this.m_aElements.push(oData);
            }
            
            this.m_Log.Write("nsComponentData.js - addElement - END"); 
            return true;
        }
        catch(err)
        {
             this.m_Log.DebugDump("nsComponentData.js: addElement : Exception : " 
                                      + err.name + 
                                      ".\nError message: " 
                                      + err.message+ "\n"
                                      + err.lineNumber);
             return false;
        }
    },
    
    
                            
    findElement : function (szUserName, szName)
    {
        try
        {
            this.m_Log.Write("nsComponentData.js - findElement - START"); 
            this.m_Log.Write("nsComponentData.js - findElement - " + szUserName + " " + szName);
            if (!szUserName || !szName) return false;          
            
            //find 
            var szValue = null;
            for (i=0; i<this.m_aElements.length; i++)
            {
                var usernameRegExp = new RegExp(this.m_aElements[i].szUserName,"i");
                var nameRegExp = new RegExp(this.m_aElements[i].szName,"i");
                this.m_Log.Write("nsComponentData.js - FindElement - search " + nameRegExp + " " + usernameRegExp);
                
                if (szUserName.search(usernameRegExp)!=-1 && szName.search(nameRegExp)!=-1)
                {
                    this.m_Log.Write("nsComponentData - findElement Found");
                    szValue = this.m_aElements[i].szValue;
                }
            }
            
            this.m_Log.Write("nsComponentData.js - findElement - END " + szValue); 
            return szValue;
        }
        catch(err)
        {
            this.m_Log.DebugDump("nsComponentData.js: findElement : Exception : " 
                                      + err.name + 
                                      ".\nError message: " 
                                      + err.message+ "\n"
                                      + err.lineNumber);
            return null;
        }
    },
    
    
    
    deleteElement: function (szUserName, szName)
    {
        try
        {
            this.m_Log.Write("nsComponentData.js - deleteElement - START"); 
            this.m_Log.Write("nsComponentData.js - deleteElement - " + szUserName + " " + szName);
            if (!szUserName || !szName) return false;          
            
            //delete
            for (i=0; i<this.m_aElements.length; i++)
            { 
                var temp = this.m_aElements.shift();  //get first item
                var usernameRegExp = new RegExp(temp.szUserName,"i");
                var nameRegExp = new RegExp(temp.szName,"i");
                this.m_Log.Write("nsComponentData.js - FindElement - search " + nameRegExp + " " + usernameRegExp);
                
                if (szUserName.search(usernameRegExp)!=-1 && szName.search(nameRegExp)!=-1)
                {
                    this.m_Log.Write("nsComponentData - deleteElement Found");
                    delete temp; 
                }
                else
                    this.m_aElements.push(temp);
            }
            
            this.m_Log.Write("nsComponentData.js - deleteElement - END"); 
            return true;
        }
        catch(err)
        {
            this.m_Log.DebugDump("nsComponentData.js: deleteElement : Exception : " 
                                      + err.name + 
                                      ".\nError message: " 
                                      + err.message+ "\n"
                                      + err.lineNumber);
            return false;
        }
    },
    
    
    
    deleteAllElements : function (szUserName)
    {
        try
        {
            this.m_Log.Write("nsComponentData.js - deleteAllElements - START");  
            this.m_Log.Write("nsComponentData.js - deleteAllElements - " + szUserName);
            if (!szUserName) return false;          
            
            if (this.m_aElements.length>0) delete this.m_aElements;
            this.m_aElements = new Array();
            //delete ALL
            for (i=0; i<this.m_aElements.length; i++)
            { 
                var temp = this.m_aElements.shift();  //get first item
                var usernameRegExp = new RegExp(temp.szUserName,"i");
                this.m_Log.Write("nsComponentData.js - FindElement - search " + usernameRegExp);
                
                if (szUserName.search(usernameRegExp)!=-1)
                {
                    this.m_Log.Write("nsComponentData - deleteElement Found");
                    delete temp; 
                }
                else
                    this.m_aElements.push(temp);
            }
            
            this.m_Log.Write("nsComponentData.js - deleteAllElements - END"); 
            return true;
        }
        catch(err)
        {
            this.m_Log.DebugDump("nsComponentData.js: deleteAllElements : Exception : " 
                                      + err.name + 
                                      ".\nError message: " 
                                      + err.message+ "\n"
                                      + err.lineNumber);
            return false;
        }
    },   

    
/******************************************************************************/
/***************** XPCOM  stuff ***********************************************/
/******************************************************************************/
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
                this.m_scriptLoader.loadSubScript("chrome://web-mail/content/common/componentData.js");            
                this.m_Log = new DebugLog("webmail.logging.comms", 
                                          "{3c8e8390-2cf6-11d9-9669-0800200c9a66}",
                                          "Component Manager 2 ");
                this.m_Log.Write("nsComponentData.js - profile-after-change ");    
            break;

            case "app-startup":
            break;
            
            default:
                throw Components.Exception("Unknown topic: " + aTopic);
        }
    },


    QueryInterface : function (iid)
    {
        if (!iid.equals(Components.interfaces.nsIComponentData2) 
        	    && !iid.equals(Components.interfaces.nsISupports)
                    && !iid.equals(Components.interfaces.nsIObserver))
            throw Components.results.NS_ERROR_NO_INTERFACE;
            
        return this;
    }
}
 

/******************************************************************************/
/* FACTORY*/
var nsComponentDataFactory = new Object();

nsComponentDataFactory.createInstance = function (outer, iid)
{
    if (outer != null)
        throw Components.results.NS_ERROR_NO_AGGREGATION;
    
    if (!iid.equals(nsComponentData2ClassID) 
            && !iid.equals(Components.interfaces.nsISupports))
        throw Components.results.NS_ERROR_INVALID_ARG;
    
    return new nsComponentData();
}


/******************************************************************************/
/* MODULE */
var nsComponentDataModule = new Object();

nsComponentDataModule.registerSelf = function(compMgr, fileSpec, location, type)
{
    var catman = Components.classes["@mozilla.org/categorymanager;1"].
                        getService(Components.interfaces.nsICategoryManager);
        
    catman.addCategoryEntry("xpcom-startup", 
                            "Component Manager 2", 
                            nsComponentData2ContactID, 
                            true, 
                            true);                     
                            
    catman.addCategoryEntry("app-startup", 
                            "Component Manager 2", 
                            "service," + nsComponentData2ContactID, 
                            true, 
                            true);
                            
    compMgr = compMgr.QueryInterface(Components.interfaces.nsIComponentRegistrar);
    compMgr.registerFactoryLocation(nsComponentData2ClassID,
                                    "Component Data 2",
                                    nsComponentData2ContactID, 
                                    fileSpec,
                                    location, 
                                    type);
}


nsComponentDataModule.unregisterSelf = function(aCompMgr, aFileSpec, aLocation)
{
    aCompMgr = aCompMgr.QueryInterface(Components.interfaces.nsIComponentRegistrar);
    aCompMgr.unregisterFactoryLocation(nsComponentData2ClassID, aFileSpec);
    
    var catman = Components.classes["@mozilla.org/categorymanager;1"].
                            getService(Components.interfaces.nsICategoryManager);
                            
    catman.deleteCategoryEntry("xpcom-startup", "Component Manager 2", true);
    catman.deleteCategoryEntry("app-startup", "Component Manager 2", true);
}

 
nsComponentDataModule.getClassObject = function(compMgr, cid, iid)
{
    if (!cid.equals(nsComponentData2ClassID))
        throw Components.results.NS_ERROR_NO_INTERFACE;

    if (!iid.equals(Components.interfaces.nsIFactory))
        throw Components.results.NS_ERROR_NOT_IMPLEMENTED;

    return nsComponentDataFactory;
}


nsComponentDataModule.canUnload = function(compMgr)
{
    return true;
}
/******************************************************************************/


function NSGetModule(compMgr, fileSpec)
{
    return nsComponentDataModule; 
}
