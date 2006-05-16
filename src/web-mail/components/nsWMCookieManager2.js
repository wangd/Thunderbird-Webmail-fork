/*****************************  Globals   *************************************/                 
const nsWMCookieManager2ClassID = Components.ID("{32c0d4c0-e3a8-11da-8ad9-0800200c9a66}");
const nsWMCookieManager2ContactID = "@mozilla.org/nsWMCookieManager2;1";

/***********************  nsWebMailCookieManager ********************************/
function nsWebMailCookieManager()
{   
    this.m_Log = null;
    this.m_scriptLoader = null;
    this.m_aCookies = new Array();
}

nsWebMailCookieManager.prototype =
{

    addCookie : function (szUserName, url, szCookie)
    {
        try
        {
            this.m_Log.Write("CookieManager.js - addCookie - START");
            this.m_Log.Write("CookieManager.js - addCookie - " + szCookie + " " + url + " " + szUserName);
            if (!szCookie || !url || !szUserName) return false; 
            
            var szDefaultDomain = url.prePath.match(/\/\/(.*?)$/)[1];  
            this.m_Log.Write("CookieManager.js - addCookie - default domain " + szDefaultDomain);
            
            //split into rows
            var aszCookie = szCookie.split(/\n/);
            this.m_Log.Write("CookieManager.js - addCookie - cookie rows " + aszCookie);
            
            //process cookies
            var aTempCookies = new Array();
            for (i=0; i<aszCookie.length; i++)
            { 
                var oNewCookie =this.createCookie(aszCookie[i]);                
                if (!oNewCookie.getDomain()) oNewCookie.setDomain(szDefaultDomain);
                oNewCookie.setUserName(szUserName);
                
                var bFound = false;
                //update existing cookies 
                if (this.m_aCookies.length>0)
                {     
                    var j=0;
                  
                    do 
                    {
                        this.m_Log.Write("CookieManger.js - addCookie - Update - checking Cookie " + j);
                        var tempCookie = this.m_aCookies[j];
                        var usernameRegExp = new RegExp("^"+tempCookie.getUserName()+"$","i");
                        this.m_Log.Write("CookieManger.js - addCookie - Update -user  " +tempCookie.getUserName() );
                        if (szUserName.search(usernameRegExp)!=-1)
                        {
                            this.m_Log.Write("CookieManger.js - addCookie - Update -user found ");
                            var tempDomain = tempCookie.getDomain();
                            var szNewCookieDomain = oNewCookie.getDomain();
                            if (this.domainCheck(tempDomain,szNewCookieDomain))
                            {
                                this.m_Log.Write("CookieManger.js - addCookie - Update - Domain found")
                                //found domain
                                var tempName = tempCookie.getName();
                                var szNewCookieName = oNewCookie.getName();
                                if (this.cookieCheck(tempName,szNewCookieName))
                                {
                                    this.m_Log.Write("CookieManger.js - addCookie - Update - Cookie found");
                                    //cookie found - update
                                    tempCookie.setValue(oNewCookie.getValue());
                                    tempCookie.setExpiry(oNewCookie.getExpiry());
                                    bFound = true;
                                }
                            }
                        }
                        j++;
                    }while(j!=this.m_aCookies.length && !bFound ) 
                }
                        
                if (bFound)
                {
                    delete oNewCookie;
                    this.m_Log.Write("CookieManger.js - addCookie - Update - deleted");
                }
                else
                {
                    this.m_aCookies.push(oNewCookie);                        
                    this.m_Log.Write("CookieManger.js - addCookie - Update - saved");
                }
            }
   
            this.m_Log.Write("CookieManager.js - addCookie - END"); 
            return true;   
        }
        catch(e)
        {
             this.m_Log.Write("CookieManger.js: addCookie : Exception : " 
                                          + e.name 
                                          + ".\nError message: " 
                                          + e.message + " \n"
                                          + e.lineNumber);
        }   
    },


    findCookie :  function (szUserName, url)
    {
        try
        {
            this.m_Log.Write("CookieManger.js - findCookie - START");
            this.m_Log.Write("CookieManger.js - findCookie - " + szUserName + " " + url);
            if (!url || !szUserName) return false;
            
            var szDomain = url.prePath.match(/\/\/(.*?)$/)[1]
            this.m_Log.Write("CookieManger.js - findCookie - domain - " + szDomain);
            
            var szCookies = "";
            var iCookieCount = this.m_aCookies.length
            for (var i=0; i<iCookieCount; i++ )
            {
                var oCookie = this.m_aCookies.shift();
                var usernameRegExp = new RegExp("^"+oCookie.getUserName()+"$","i");  
                this.m_Log.Write("CookieManger.js - findCookie - Update -user  " +oCookie.getUserName() );     
                if (szUserName.search(usernameRegExp)!=-1)
                {
                    this.m_Log.Write("CookieManger.js - findCookie - Update -user found ");
                    if (this.domainCheck(oCookie.getDomain(),szDomain))
                    {
                        this.m_Log.Write("CookieManger.js - findCookie - Update - domain found ");                       
                        if (this.expiryCheck(oCookie.getExpiry()))
                        {
                            var szName = oCookie.getName();
                            var szValue = oCookie.getValue();
                            this.m_Log.Write("CookieManger.js - findCookie - cookie - found " + szName + " " + szValue );
                            if (szValue.length>0)
                            {
                                szCookies +=  szName; 
                                szCookies += "=";
                                szCookies +=  szValue;
                                szCookies +=  "; " ;
                            }
                            this.m_aCookies.push(oCookie); //valid cookie put it back
                        }
                        else  //delete expired cookie
                            delete oCookie;
                    }
                    else //domain not found
                        this.m_aCookies.push(oCookie);
                        
                }
                else //user not found
                    this.m_aCookies.push(oCookie);
                
            }

            this.m_Log.Write("CookieManger.js - findCookie - szCookies " + szCookies);   
            this.m_Log.Write("CookieManger.js - findCookie - END");   
            return szCookies;
        }
        catch(e)
        {
            this.m_Log.Write("CookieManger.js: findCookie : Exception : " 
                                          + e.name 
                                          + ".\nError message: " 
                                          + e.message + " \n"
                                          + e.lineNumber);
                                          
            return null;
        }
    },   



     
    deleteCookie : function (szUserName)
    {
        try
        {
            this.m_Log.Write("CookieManager.js - deleteCookie - START " + szUserName);
            if (!szUserName) return false; 
          
            //process cookies
            if (this.m_aCookies.length>0)
            {
                var iCookieCount = this.m_aCookies.length;
                for (var i=0; i<iCookieCount; i++ )
                {
                    this.m_Log.Write("CookieManger.js - deleteCookie - Update - checking Cookie " + j);
                    var oCookie = this.m_aCookies.shift();
                    
                    var usernameRegExp = new RegExp("^"+tempCookie.getUserName()+"$","i");
                    if (szUserName.search(usernameRegExp)!=-1)
                    {
                        this.m_Log.Write("CookieManger.js - deleteCookie - Domain found");
                        delete oCookie;
                    }
                }
            }
                       
            this.m_Log.Write("CookieManager.js - deleteCookie - END"); 
            return true;   
        }
        catch(e)
        {
            this.m_Log.Write("CookieManger.js: deleteCookie : Exception : " 
                                          + e.name 
                                          + ".\nError message: " 
                                          + e.message + " \n"
                                          + e.lineNumber);
            return false;
        }   
    },



    createCookie : function (szCookie)
    {
        try
        {
            this.m_Log.Write("CookieManager.js - createCookie - START"); 
            
            var aData = szCookie.split(";");
            this.m_Log.Write("CookieManager.js - createCookie - aData " + aData); 
               
            var oCookie = new Cookie(); 
            for (j=0; j<aData.length; j++)
            {
                //split name and value
                var iNameSplit = aData[j].indexOf("=");
                var szTempName = aData[j].substr(0, iNameSplit);
                var szTempValue = aData[j].substr(iNameSplit+1);
                this.m_Log.Write("CookieManager.js - createCookie ITEM - name : " + szTempName + "  value : " +szTempValue);
                             
                if (szTempName.search(/domain/i)!=-1) //get domain
                {
                    szDomain = szTempValue;
                    this.m_Log.Write("CookieManager.js - createCookie - szDomain " + szDomain); 
                    oCookie.setDomain(szDomain); 
                }
                else if(szTempName.search(/path/i)!=-1) //get path
                {
                    szPath = szTempValue;
                    this.m_Log.Write("CookieManager.js - createCookie - szPath " + szPath);
                    oCookie.setPath(szPath);
                }
                else if (szTempName.search(/expires/i)!=-1)//get expiry
                {
                    iExpiry = Date.parse(szTempValue.replace(/-/g," "));
                    this.m_Log.Write("CookieManager.js - createCookie - iExpiry " + iExpiry);
                    oCookie.setExpiry(iExpiry);
                }
                else if (szTempName.search(/secure/i)!=-1)//get secure
                {
                    bSecure = true;
                    this.m_Log.Write("CookieManager.js - createCookie - bSecure " + bSecure);
                    oCookie.setSecure(bSecure);
                }
                else if (szTempName.search(/httponly/i)!=-1)//get httponly
                {
                }
                else if (szTempName.search(/version/)!=-1) //get version
                {
                    if (!szName)
                    {
                        szName = szTempName;
                        szValue = szTempValue;
                    }
                    this.m_Log.Write("CookieManager.js - createCookie - Version " + szName);
                    oCookie.setName(szName);
                    oCookie.setValue(szValue);
                }
                else  //should be cookie 
                {
                    if (szTempName.length>0)
                    {
                        szName = szTempName;
                        szValue = szTempValue;
                        this.m_Log.Write("CookieManager.js - createCookie data - szName " + szName + " szValue " + szValue);
                        oCookie.setName(szName);
                        oCookie.setValue(szValue);
                    }
                }
            }
            
            this.m_Log.Write("CookieManager.js - createCookie - END"); 
            return oCookie;   
        }
        catch(e)
        {
             this.m_Log.Write("CookieManger.js: createCookie : Exception : " 
                                          + e.name 
                                          + ".\nError message: " 
                                          + e.message + " \n"
                                          + e.lineNumber);
            return null;
        }
    },
    
 
    
    domainCheck : function (szCookieDomain, szWantedDomain)
    {
        try
        {
            this.m_Log.Write("CookieManger.js - domainCheck - START"); 
            this.m_Log.Write("CookieManger.js - domainCheck - cookie "+szCookieDomain + " wanted " + szWantedDomain); 
           
            var regexp = null;
            var szSubject = null;
            if (szWantedDomain.length > szCookieDomain.length)
            { 
                szSubject = szWantedDomain;
                var tempDomain = szCookieDomain.replace(/^\./,"");
                regexp =  new RegExp(tempDomain+"$", "i");
            }
            else
            {  
                szSubject = szCookieDomain;
                var tempDomain = szWantedDomain.replace(/^\./,"");
                regexp = new RegExp(tempDomain+"$", "i");
            }
           
            var bFound = false;
            if (szSubject.search(regexp)!=-1)bFound =  true;
        
            this.m_Log.Write("CookieManger.js - domainCheck END " +bFound); 
            return bFound;
        }
        catch(err)
        {
            return false;   
        }
    },
    
    
    cookieCheck : function (szCookieName, szWantedName)
    {
        try
        {
            this.m_Log.Write("CookieManger.js - cookieCheck - START"); 
            this.m_Log.Write("CookieManger.js - cookieCheck - cookie "+szCookieName + " wanted " + szWantedName); 
            var regexp =  new RegExp("^"+szCookieName+"$", "i");
            var bFound = false
            if (szWantedName.search(regexp)!=-1) bFound = true;
            this.m_Log.Write("CookieManger.js - cookieCheck - END " + bFound); 
            return bFound;
        }
        catch(err)
        {
            return false;   
        }
    },
    
    
    expiryCheck : function (iExpiryTime)
    {
        try
        {
            this.m_Log.Write("CookieManger.js - expiryCheck - START"); 
            var iTimeNow = Date.now();
            this.m_Log.Write("CookieManger.js - expiryCheck - iExpiryTime "+iExpiryTime + " NOW " + iTimeNow); 
            
            var bFound = true;

            if (iExpiryTime != -1)
                if (iExpiryTime<iTimeNow) bFound = false;

            this.m_Log.Write("CookieManger.js - cookieCheck - END " +bFound);
            return bFound; 
        }
        catch(err)
        {
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
                this.m_scriptLoader.loadSubScript("chrome://web-mail/content/common/Cookie.js");                
                this.m_Log = new DebugLog("webmail.logging.comms", 
                                          "{3c8e8390-2cf6-11d9-9669-0800200c9a66}",
                                          "CookieManager 2 ");
                this.m_Log.Write("CookieManger.js - profile-after-change ");    
            break;

            case "app-startup":
            break;
            
            default:
                throw Components.Exception("Unknown topic: " + aTopic);
        }
    },
    
    
    
    QueryInterface : function (iid)
    {
        if (!iid.equals(Components.interfaces.nsIWMCookieManager2) 
        	    && !iid.equals(Components.interfaces.nsISupports)
                    && !iid.equals(Components.interfaces.nsIObserver))
            throw Components.results.NS_ERROR_NO_INTERFACE;
            
        return this;
    }
}
 

/******************************************************************************/
/* FACTORY*/
var nsWebMailCookieManagerFactory = new Object();

nsWebMailCookieManagerFactory.createInstance = function (outer, iid)
{
    if (outer != null)
        throw Components.results.NS_ERROR_NO_AGGREGATION;
    
    if (!iid.equals(nsWMCookieManager2ClassID) 
            && !iid.equals(Components.interfaces.nsISupports))
        throw Components.results.NS_ERROR_INVALID_ARG;
    
    return new nsWebMailCookieManager();
}


/******************************************************************************/
/* MODULE */
var nsWebMailCookieManagerModule = new Object();

nsWebMailCookieManagerModule.registerSelf = function(compMgr, fileSpec, location, type)
{
    var catman = Components.classes["@mozilla.org/categorymanager;1"].
                        getService(Components.interfaces.nsICategoryManager);
        
    catman.addCategoryEntry("xpcom-startup", 
                            "WebMail Cookie Manager 2", 
                            nsWMCookieManager2ContactID, 
                            true, 
                            true);                     
                            
    catman.addCategoryEntry("app-startup", 
                            "WebMail Cookie Manager 2", 
                            "service," + nsWMCookieManager2ContactID, 
                            true, 
                            true);
                            
    compMgr = compMgr.QueryInterface(Components.interfaces.nsIComponentRegistrar);
    compMgr.registerFactoryLocation(nsWMCookieManager2ClassID,
                                    "WebMail Cookie Manager 2",
                                    nsWMCookieManager2ContactID, 
                                    fileSpec,
                                    location, 
                                    type);
}


nsWebMailCookieManagerModule.unregisterSelf = function(aCompMgr, aFileSpec, aLocation)
{
    var catman = Components.classes["@mozilla.org/categorymanager;1"].
                            getService(Components.interfaces.nsICategoryManager);
                            
    catman.deleteCategoryEntry("xpcom-startup", "WebMail Cookie Manager 2", true);
    catman.deleteCategoryEntry("app-startup", "WebMail Cookie Manager 2", true);
 
    aCompMgr = aCompMgr.QueryInterface(Components.interfaces.nsIComponentRegistrar);
    aCompMgr.unregisterFactoryLocation(nsWMCookieManager2ClassID, aFileSpec);
}

 
nsWebMailCookieManagerModule.getClassObject = function(compMgr, cid, iid)
{
    if (!cid.equals(nsWMCookieManager2ClassID))
        throw Components.results.NS_ERROR_NO_INTERFACE;

    if (!iid.equals(Components.interfaces.nsIFactory))
        throw Components.results.NS_ERROR_NOT_IMPLEMENTED;

    return nsWebMailCookieManagerFactory;
}


nsWebMailCookieManagerModule.canUnload = function(compMgr)
{
    return true;
}
/******************************************************************************/


function NSGetModule(compMgr, fileSpec)
{
    return nsWebMailCookieManagerModule; 
}
