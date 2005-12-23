/*****************************  Globals   *************************************/                 
const nsUriManagerClassID = Components.ID("{f1231790-4bdf-11da-8cd6-0800200c9a66}");
const nsUriManagerContactID = "@mozilla.org/UriManager;1";


/***********************  UriManager ********************************/
function nsUriManager()
{   
    this.m_scriptLoader = null; 
    this.m_Log = null; 
    this.m_aUriAndDomains = new Array();
    this.m_aUri = new Array();
}

nsUriManager.prototype =
{

    getAllUri : function(iCount, aszUri)
    {
        try
        {
            this.m_Log.Write("nsUriManager.js - getAllUri - START");
            
            var aTemp = this.m_aUri;
            iCount.value = aTemp.length;
            aszUri.value = aTemp;
            
            this.m_Log.Write("nsUriManager.js - getAllUri - " + iCount.value + " " + aszUri.value); 
            this.m_Log.Write("nsUriManager.js - getAllUri - END"); 
            return true;
        }
        catch(err)
        {
            this.m_Log.DebugDump("nsUriManager.js: getAllUri : Exception : " 
                                          + err.name 
                                          + ".\nError message: " 
                                          + err.message+ "\n"
                                          + err.lineNumber);
            return false;
        }
    },
    

    getDomains : function (szUri,iCount, aszDomains)
    {
         try
        {
            this.m_Log.Write("nsUriManager.js - getDomains - START");
            this.m_Log.Write("nsUriManager.js - getDomains - szUri " + szUri);
            
            var aTemp = new Array();
            for (i=0; i <this.m_aUriAndDomains.length; i++ )
            {
                var szTempUri = this.m_aUriAndDomains[i].szUri;
                var regExp = new RegExp(szTempUri, "i");
                var iResult = szUri.search(regExp);
                this.m_Log.Write("nsUriManager.js - getDomains - szTempUri " + szTempUri + " result " +iResult );               
                if (iResult != -1)
                {
                    var szDomain = this.m_aUriAndDomains[i].szDomain;
                    this.m_Log.Write("nsUriManager.js - getDomains - Found uri "+szDomain );
                    aTemp.push(szDomain);
                }
            }
            iCount.value = aTemp.length;
            aszDomains.value = aTemp;
            this.m_Log.Write("nsUriManager.js - getDomains - " + iCount.value + " " + aszDomains.value); 
            this.m_Log.Write("nsUriManager.js - getDomains - END"); 
            return true;
        }
        catch(err)
        {
            this.m_Log.DebugDump("nsUriManager.js: getDomains : Exception : " 
                                          + err.name 
                                          + ".\nError message: " 
                                          + err.message+ "\n"
                                          + err.lineNumber);
            return false;
        }    
    },
    
    
    
    getAllDomains : function (iCount, aszDomains)
    {
        try
        {
            this.m_Log.Write("nsUriManager.js - getAllDomains - START");
            
            var aTemp = new Array();
            
            for(i=0; i<this.m_aUriAndDomains; i++)
            {
                aTemp.push(this.m_aUriAndDomains[i].szDomain);
            }
            
            iCount.value = aTemp.length;
            aszDomains.value = aTemp;
            this.m_Log.Write("nsUriManager.js - getDomains - " + iCount.value + " " + aszDomains.value); 
            this.m_Log.Write("nsUriManager.js - getAllDomains - END");
            return true;
        }
        catch(err)
        {
            this.m_Log.DebugDump("nsUriManager.js: getAllDomains : Exception : " 
                                          + err.name 
                                          + ".\nError message: " 
                                          + err.message+ "\n"
                                          + err.lineNumber);
            return false;
        }
    },
    
    
    
    getUri : function (szDomain)
    {
        try
        {
            this.m_Log.Write("nsUriManager.js - getUri - START");
            this.m_Log.Write("nsUriManager.js - getUri - szDomain " + szDomain);
            
            var szRegExp = new RegExp(szDomain, "i");     
            var bFound=false;
            var i=0;
            var szResult = null;
            
            if (this.m_aUriAndDomains.length>0)
            {
                do
                {
                    var tempData = this.m_aUriAndDomains[i];
                    this.m_Log.Write("nsUriManager.js - getUri domain "+ tempData.szDomain);
                     
                    if (tempData.szDomain.search(szRegExp)!=-1)
                    {
                        bFound = true;
                        szResult =tempData.szUri;
                        this.m_Log.Write("nsUriManager.js - getUri - Found " + szResult );
                    }  
                    i++;
                } while (i<this.m_aUriAndDomains.length && !bFound );
            }
            
            this.m_Log.Write("nsUriManager.js - getUri - END");
            return szResult;
        }
        catch(err)
        {
            this.m_Log.DebugDump("nsUriManager.js: getDomains : Exception : " 
                                          + err.name 
                                          + ".\nError message: " 
                                          + err.message+ "\n"
                                          + err.lineNumber);
            return null;
        }  
    },
    

    addDomain : function (szUri, szDomain)
    {
        try
        {
            this.m_Log.Write("nsUriManager.js - addDomain - START");
            this.m_Log.Write("nsUriManager.js - addDomain - szUri " + szUri + " szDomain " + szDomain);
            
            
            var newEntry = new UriDomainData()
            newEntry.szUri = szUri;
            newEntry.szDomain = szDomain;
            this.m_aUriAndDomains.push(newEntry);
            this.saveData();
            this.loadData();
            
            this.m_Log.Write("nsUriManager.js - addDomain - END");
        }
        catch(err)
        {
            this.m_Log.DebugDump("nsUriManager.js: addDomain : Exception : " 
                                          + err.name 
                                          + ".\nError message: " 
                                          + err.message+ "\n"
                                          + err.lineNumber);
            return false;
        }
    },
    
        
    deleteUri : function (szUri)
    {
        try
        {
            this.m_Log.Write("nsUriManager.js - deleteUri - START");
            this.m_Log.Write("nsUriManager.js - deleteUri - szUri " + szUri);
            
            var szRegExp = new RegExp(szUri,"i");
            
            var iLength = this.m_aUriAndDomains.length;
            for (i=0; i<iLength; i++)
            {
                var oData = this.m_aUriAndDomains.shift();
                this.m_Log.Write("nsUriManager.js - deleteUri - not found " + oData.szUri);
                if (oData.szUri.search(szRegExp)==-1)
                {
                    this.m_Log.Write("nsUriManager.js - deleteUri - not found " + oData.szUri);
                    this.m_aUriAndDomains.push(oData);
                }
            }
            
            this.saveData();
            this.loadData();
            this.m_Log.Write("nsUriManager.js - deleteUri - ENd");
        }
        catch(err)
        {
            this.m_Log.DebugDump("nsUriManager.js: deleteUri : Exception : " 
                                          + err.name 
                                          + ".\nError message: " 
                                          + err.message+ "\n"
                                          + err.lineNumber);
            return false;
        }
    },
    
    
    
    deleteDomain : function (szDomain)
    {
        try
        {
            this.m_Log.Write("nsUriManager.js - deleteDomain - START");
            this.m_Log.Write("nsUriManager.js - deleteDomain - szDomain " + szDomain);
            
            var szRegExp = new RegExp(szDomain,"i");
            
            var iLength = this.m_aUriAndDomains.length;
            for (i=0; i<iLength; i++)
            {
                var oData = this.m_aUriAndDomains.shift();
                this.m_Log.Write("nsUriManager.js - deleteDomain - " + oData.szUri + " " + oData.szDomain);
                if (oData.szDomain.search(szRegExp)==-1)
                {
                    this.m_Log.Write("nsUriManager.js - deleteDomain - not found ");
                    this.m_aUriAndDomains.push(oData);
                }
            }
            
            this.saveData();
            this.loadData();
            this.m_Log.Write("nsUriManager.js - deleteDomain - ENd");
        }
        catch(err)
        {
            this.m_Log.DebugDump("nsUriManager.js: deleteDomain : Exception : " 
                                          + err.name 
                                          + ".\nError message: " 
                                          + err.message+ "\n"
                                          + err.lineNumber);
            return false;
        }
    },

 
    saveData : function()
    {
        try
        {
            this.m_Log.Write("nsUriManager.js - saveData - START");
            
            //create data list
            var aData = new Array();
            
            for (i=0; i<this.m_aUriAndDomains.length; i++)
            {               
                var szUri = this.m_aUriAndDomains[i].szUri;
                var szDomain = this.m_aUriAndDomains[i].szDomain;
                this.m_Log.Write("nsUriManager.js - saveData - i " + i+" szUri "+szUri + " domain " +szDomain);
                
                var bFound = false;
                if (aData.length>0)
                {    
                    var szRegExp = new RegExp(szUri, "i");     
                    var j=0;
                    do
                    {
                        this.m_Log.Write("nsUriManager.js - saveData - J " + j + "szUri "+aData[j].szUri + " domain "+ aData[j].aDomain);
                         
                        if (aData[j].szUri.search(szRegExp)!=-1)
                        {
                            this.m_Log.Write("nsUriManager.js - saveData - Found");
                            aData[j].aDomain.push(szDomain);
                            bFound = true;
                        }  
                        j++;
                    } while (j!=aData.length && !bFound );
                }
                
                if (!bFound)
                {
                    this.m_Log.Write("nsUriManager.js - saveData - not found");
                    var oTemp = new UriDomainData();
                    oTemp.szUri = szUri;
                    oTemp.aDomain.push(szDomain);
                    aData.push(oTemp);
                }
            }
            
            //delete old list    
            var  WebMailPrefAccess = new WebMailCommonPrefAccess();
            WebMailPrefAccess.DeleteBranch("httpmail.domain");
        
             //write new list
            if (aData.length>0)
            {
                this.m_Log.Write("nsUriManager.js - saveData - count " + aData.length);
                WebMailPrefAccess.Set("int", "httpmail.iNumOfUrl", aData.length);
               
                for(i=0; i<aData.length; i++)
                {
                    var szTempUri = aData[i].szUri;
                    this.m_Log.Write("nsUriManager.js - saveData - szTempUri " + szTempUri);
                    var aszTempDomain  = aData[i].aDomain;
                    this.m_Log.Write("nsUriManager.js - saveData - aszTempDomains " + aszTempDomain);
                    
                    WebMailPrefAccess.Set("char","httpmail.domain.site["+i+"].szUri",szTempUri);  
                    
                    var szPrefDomains = null;
                    for (j=0 ; j < aszTempDomain.length; j++)
                    {
                        var szTemp =aszTempDomain[j]
                        szPrefDomains ? szPrefDomains+="\n"+szTemp : szPrefDomains=szTemp;
                    }                 
                    
                    WebMailPrefAccess.Set("char", "httpmail.domain.site["+i+"].szDomain",szPrefDomains);
                }
            }
            else
            {
                WebMailPrefAccess.Set("int","httpmail.iNumOfUrl",0);
            }
            delete WebMailPrefAccess;   
            
            this.m_Log.Write("nsUriManager.js - Save Data - END");
        }
        catch(err)
        {
            this.m_Log.DebugDump("nsUriManager.js: Save Data : Exception : " 
                                          + err.name 
                                          + ".\nError message: " 
                                          + err.message+ "\n"
                                          + err.lineNumber);
        }
    },
    
            
    loadData : function()
    {
        try
        {
            this.m_Log.Write("nsUriManager.js - Load Data - START");
            
            delete this.m_aUriAndDomains;
            this.m_aUriAndDomains = new Array();
            delete this.m_aUri;
            this.m_aUri = new Array();
            
            var iUriNum=0;
            var WebMailPrefAccess = new WebMailCommonPrefAccess();
            var oPref ={Value : null};
                
            if (WebMailPrefAccess.Get("int","httpmail.iNumOfUrl",oPref))
                iUriNum = oPref.Value;
                
            if (iUriNum>0)
            {
                this.m_Log.Write("nsUriManager.js - iUriNum " + iUriNum);
                for (i=0; i<iUriNum; i++)
                {                     
                    oPref ={Value : null};
                    WebMailPrefAccess.Get("char","httpmail.domain.site["+i+"].szUri",oPref);
                    this.m_Log.Write("nsUriManager.js -  szUri " +oPref.Value );
                    var szUri = oPref.Value
                    this.m_aUri.push(szUri);
                    
                    oPref ={Value : null};
                    WebMailPrefAccess.Get("char","httpmail.domain.site["+i+"].szDomain",oPref);
                    var aszDomains = oPref.Value.split("\n");
                    this.m_Log.Write("nsUriManager.js -  szdomains " +aszDomains );
                   
                    for (j=0 ; j < aszDomains.length; j++)
                    {
                        var oData = new UriDomainData();
                        oData.szUri = szUri;
                        oData.szDomain=aszDomains[j];
                        this.m_aUriAndDomains.push(oData);
                    }
                }
            }
            this.m_Log.Write("nsUriManager.js - Load Data - END");
        }
        catch(err)
        {
            this.m_Log.DebugDump("nsUriManager.js: loadData : Exception : " 
                                          + err.name 
                                          + ".\nError message: " 
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
                this.m_scriptLoader.loadSubScript("chrome://web-mail/content/common/CommonPrefs.js");
                this.m_scriptLoader.loadSubScript("chrome://httpmail/content/HttpMail-UriDomainData.js");
                this.m_Log = new DebugLog("webmail.logging.comms", 
                                          "{3c8e8390-2cf6-11d9-9669-0800200c9a66}",
                                          "UriManagerlog");
                this.loadData();
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
        if (!iid.equals(Components.interfaces.nsIUriManager) 
        	    && !iid.equals(Components.interfaces.nsISupports)
                    && !iid.equals(Components.interfaces.nsIObserver))
            throw Components.results.NS_ERROR_NO_INTERFACE;
            
        return this;
    }
}
 

/******************************************************************************/
/* FACTORY*/
var nsUriManagerFactory = new Object();

nsUriManagerFactory.createInstance = function (outer, iid)
{
    if (outer != null)
        throw Components.results.NS_ERROR_NO_AGGREGATION;
    
    if (!iid.equals(nsUriManagerClassID) 
            && !iid.equals(Components.interfaces.nsISupports))
        throw Components.results.NS_ERROR_INVALID_ARG;
    
    return new nsUriManager();
}


/******************************************************************************/
/* MODULE */
var nsUriManagerModule = new Object();

nsUriManagerModule.registerSelf = function(compMgr, fileSpec, location, type)
{
    var catman = Components.classes["@mozilla.org/categorymanager;1"].
                        getService(Components.interfaces.nsICategoryManager);
        
    catman.addCategoryEntry("xpcom-startup", 
                            "Uri Manager", 
                            nsUriManagerContactID, 
                            true, 
                            true);                     
                            
    catman.addCategoryEntry("app-startup", 
                            "Uri Manager", 
                            "service," + nsUriManagerContactID, 
                            true, 
                            true);
                            
    compMgr = compMgr.QueryInterface(Components.interfaces.nsIComponentRegistrar);
    compMgr.registerFactoryLocation(nsUriManagerClassID,
                                    "Uri Manager",
                                    nsUriManagerContactID, 
                                    fileSpec,
                                    location, 
                                    type);
}


nsUriManagerModule.unregisterSelf = function(aCompMgr, aFileSpec, aLocation)
{
    var catman = Components.classes["@mozilla.org/categorymanager;1"].
                            getService(Components.interfaces.nsICategoryManager);
                            
    catman.deleteCategoryEntry("xpcom-startup", "Uri Manager", true);
    catman.deleteCategoryEntry("app-startup", "Uri Manager", true);
    
    aCompMgr = aCompMgr.QueryInterface(Components.interfaces.nsIComponentRegistrar);
    aCompMgr.unregisterFactoryLocation(nsUriManagerClassID, aFileSpec);
}

 
nsUriManagerModule.getClassObject = function(compMgr, cid, iid)
{
    if (!cid.equals(nsUriManagerClassID))
        throw Components.results.NS_ERROR_NO_INTERFACE;

    if (!iid.equals(Components.interfaces.nsIFactory))
        throw Components.results.NS_ERROR_NOT_IMPLEMENTED;

    return nsUriManagerFactory;
}


nsUriManagerModule.canUnload = function(compMgr)
{
    return true;
}
/******************************************************************************/


function NSGetModule(compMgr, fileSpec)
{
    return nsUriManagerModule; 
}
