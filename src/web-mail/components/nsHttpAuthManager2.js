/*****************************  Globals   *************************************/                 
const nsHttpAuthManager2ClassID = Components.ID("{1e05e7f0-e385-11da-8ad9-0800200c9a66}");
const nsHttpAuthManager2ContactID = "@mozilla.org/HttpAuthManager2;1";


/***********************  HttpAuthManager ********************************/
function nsHttpAuthManager()
{
    this.m_aTokens = new Array();
    this.m_scriptLoader = null;
    this.m_Log = null;
}

nsHttpAuthManager.prototype =
{

    addToken : function (sszUserName, zDomain, szHeader, szURI, szPassword)
    {
        try
        {
            this.m_Log.Write("nsHttpAuthManager - addToken - START");
            this.m_Log.Write("nsHttpAuthManager - addToken - \ndomain " 
                                                        + szDomain +"\n"
                                                        + "Header " + szHeader 
                                                        + "URI " + szURI
                                                        + "username " + szUserName
                                                        + "password " + szPassword);
                                                        
            if (!szDomain || !szHeader || !szUserName || !szPassword) return false; 
           
            //search tokens
            if (this.m_aTokens.length !=0)   
            {           
                var iMax = this.m_aTokens.length;
                for (var i = 0 ; i<iMax ; i++)
                {
                    this.m_Log.Write("nsHttpAuthManager.js - addToken" + this.m_aTokens[0]);
                    
                    if (this.m_aTokens[0] != undefined)
                    {  
                        var temp = this.m_aTokens.shift();  //get first item
                        this.m_Log.Write("nsHttpAuthManager.js - addToken " + i + " "+ temp.getDomain());
                       
                        var regexp =  new RegExp(temp.getDomain(), "i");
                        this.m_Log.Write("nsHttpAuthManager.js - addToken - regexp " +regexp );
                        
                        var domainRegExp =  new RegExp(temp.getDomain(), "i");
                        this.m_Log.Write("nsHttpAuthManager.js - addToken - regexp " +domainRegExp);
                        var usernameRegExp = new RegExp(temp.getUserName(),"i");
                        this.m_Log.Write("nsHttpAuthManager.js - addToken - usernameRegExp " +usernameRegExp);
                
                        if (szDomain.search(regexp)!=-1 && szUserName.search(usernameRegExp)!=-1)
                        {
                            this.m_Log.Write("nsHttpAuthManager.js - addToken - found domain - deleted");
                            var oTokens = new HttpAuthToken();   
                            oTokens.setDomain(szDomain);
                            oTokens.setUserName(szUserName);
                            oTokens.setToken(this.newToken(szHeader, szURI, szUserName, szPassword));                           
                            this.m_aTokens.push(oTokens); //place token in array
                            this.m_Log.Write("nsHttpAuthManager.js - addToken - found domain END");
                            return true;
                        }
                        else
                        {
                            this.m_aTokens.push(temp);
                            this.m_Log.Write("nsHttpAuthManager.js - addToken - not found domain"); 
                        }
                    }
                } 
            }
            
            //domain not found create new cookie        
            this.m_Log.Write("nsHttpAuthManager - addToken - creating new token"); 
            var oTokens = new HttpAuthToken();   
            oTokens.setDomain(szDomain);
            oTokens.setUserName(szUserName);
            oTokens.setToken(this.newToken(szHeader, szURI, szUserName, szPassword));                           
            this.m_aTokens.push(oTokens); //place tokan in array
            
            this.m_Log.Write("nsHttpAuthManager - addToken - END"); 
            return true;   
        }
        catch(e)
        {
             this.m_Log.Write("nsHttpAuthManager: addToken : Exception : " 
                                          + e.name 
                                          + ".\nError message: " 
                                          + e.message+ "\n"
                                          + e.lineNumber);
        }   
    },
    
    
    
    findToken :  function (szUserName, szDomain)
    {
        try
        {
            this.m_Log.Write("nsHttpAuthManager - findToken - START");
            this.m_Log.Write("nsHttpAuthManager - findToken - target domain - " + szDomain + " username " + szUserName);
            if (!szDomain || !szUserName) return null;
            if (this.m_aTokens.length == 0) return null;   
            
            var szToken = null;
            for (var i = 0 ; i<this.m_aTokens.length ; i++)
            {
                var temp = this.m_aTokens[i];              
                var domainRegExp =  new RegExp(temp.getDomain(), "i");
                this.m_Log.Write("nsHttpAuthManager.js - findToken - regexp " +domainRegExp);
                var usernameRegExp = new RegExp(temp.getUserName(),"i");
                this.m_Log.Write("nsHttpAuthManager.js - findToken - usernameRegExp " +usernameRegExp);
                
                if (szDomain.search(regexp)!=-1 && szUserName.search(usernameRegExp)!=-1)
                { 
                    this.m_Log.Write("nsHttpAuthManager.js - findToken - found domain"); 
                    szToken = temp.getToken();
                }   
            }
            
            this.m_Log.Write("nsHttpAuthManager - findToken - END");
            return szToken;   
        }
        catch(e)
        {
            this.m_Log.Write("nsHttpAuthManager: findToken : Exception : " 
                                          + e.name 
                                          + ".\nError message: " 
                                          + e.message+ "\n"
                                          + e.lineNumber);
                                          
            return null;
        }
    },

    
    
    deleteToken : function (szUserName)
    {
        try
        {
            this.m_Log.Write("nsHttpAuthManager - deleteToken - START " + szUserName);
            if (!szUserName) return false;
            
            var bResult = false;
            //search tokens
            if (this.m_aTokens.length !=0)   
            {           
                var iMax = this.m_aTokens.length;
                for (var i = 0 ; i<iMax ; i++)
                {
                    this.m_Log.Write("nsHttpAuthManager.js - addToken" + this.m_aTokens[0]);
                    
                    if (this.m_aTokens[0] != undefined)
                    {  
                        var temp = this.m_aTokens.shift();  //get first item
                        
                        var usernameRegExp = new RegExp(temp.getUserName(),"i");
                        this.m_Log.Write("nsHttpAuthManager.js - addToken - usernameRegExp " +usernameRegExp);
                
                        if (szUserName.search(usernameRegExp)==-1)
                        {
                            this.m_Log.Write("nsHttpAuthManager.js - addToken - found domain - deleted");
                            delete temp;
                            bFound = true;
                        }
                        else
                        {
                            this.m_aTokens.push(temp);
                            this.m_Log.Write("nsHttpAuthManager.js - addToken - not found domain"); 
                        }
                    }
                } 
            }
            
            this.m_Log.Write("nsHttpAuthManager - deleteToken - END " + bResult);
            return bResult; 
        }
        catch(e)
        {
            this.m_Log.Write("nsHttpAuthManager: deleteToken : Exception : " 
                                          + e.name 
                                          + ".\nError message: " 
                                          + e.message+ "\n"
                                          + e.lineNumber);
                                          
            return false;
        }
    },
    
    
    randomString : function () 
    {
    	var seed = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXTZabcdefghiklmnopqrstuvwxyz";
    	var iLength = 10;
    	var szRandom = "";
    	for (var i=0; i<iLength; i++) 
        {
    		var rnum = Math.floor(Math.random() * seed.length);
    		szRandom += seed.substring(rnum,rnum+1);
    	}
	    return szRandom;
    },
    
    
    
    newToken : function (szValue, szURI ,szUserName, szPassword)
    {
        try
        {
            this.m_Log.Write("nsHttpAuthManager.js - newToken - START");
            
            var szAuth = null;
            if (szValue.search(/basic/i)!= -1)
            {//authentication on the cheap
                this.m_Log.Write("nsHttpAuthManager.js - newToken - basic Authenticate");
               
                var oBase64 = new base64();
                szAuth ="Basic ";
                szAuth += oBase64.encode(szUserName+":"+szPassword);
            }
            else 
            {
                this.m_Log.Write("nsHttpAuthManager.js - newToken - digest Authenticate");
              
                szAuth ="Digest ";
                szAuth +="username=\"" + szUserName + "\", "; 
                var szRealm = szValue.match(/realm="(.*?)"/i)[1];
                szAuth +="realm=\"" + szRealm + "\", "; 
                var szNC = "00000001";
                szAuth +="nc=" + szNC + ", "; 
                szAuth +="algorithm=\"MD5\", ";
                
                var tempURI = null;
                try 
                {
                    tempURI = szURI.match(/(.*?)\?/i)[1]; 
                }
                catch(e)
                {
                    tempURI = szURI; 
                }
                
                szAuth +="uri=\"" + tempURI + "\", ";
                var szConce = this.randomString();
                szAuth +="cnonce=\"" + szConce + "\", "; 
                  
                //find qop and noncem 
                var szQop = szValue.match(/qop="(.*?)"/i)[1];
                this.m_Log.Write("nsHttpAuthManager.js - newToken - Qop: " + szQop);
                szAuth +="qop=\"" + szQop + "\", ";
                
                var szNonce = szValue.match(/nonce="(.*?)"/i)[1];
                this.m_Log.Write("nsHttpAuthManager.js - newToken - Nonce : " + szNonce);      
                szAuth +="nonce=\"" + szNonce + "\", "; 
                
                //hash
                var oHash = new hash();
                
                var szHA1=oHash.md5Hash(szUserName+":"+szRealm+":"+szPassword);
                this.m_Log.Write("nsHttpAuthManager.js - newToken - HA1 " + szHA1);
                
                var szHA2 = oHash.md5Hash("PROPFIND:"+tempURI);
                this.m_Log.Write("nsHttpAuthManager.js - newToken - HA2 " + szHA2);
                
                var szResponse = oHash.md5Hash(szHA1+":"+szNonce+":"+szNC+":"+szConce+":"+szQop+":"+szHA2);

                this.m_Log.Write("nsHttpAuthManager.js - newToken - response " + szResponse);                
                szAuth +="response=\"" + szResponse + "\""; 
            }
            
            this.m_Log.Write("nsHttpAuthManager.js - newToken - " +  szAuth);
            this.m_Log.Write("nsHttpAuthManager.js - newToken - END");
            return szAuth;
        }
        catch(e)
        {
            this.m_Log.Write("nsHttpAuthManager.js: newToken : Exception : " 
                                          + e.name 
                                          + ".\nError message: " 
                                          + e.message+ "\n"
                                          + e.lineNumber);
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
                this.m_scriptLoader.loadSubScript("chrome://web-mail/content/common/HttpAuthToken.js");
                this.m_scriptLoader.loadSubScript("chrome://web-mail/content/common/hash.js");
                this.m_scriptLoader.loadSubScript("chrome://web-mail/content/common/base64.js");
                
                this.m_Log = new DebugLog("webmail.logging.comms", 
                                          "{3c8e8390-2cf6-11d9-9669-0800200c9a66}",
                                          "HttpAuthManager2 ");
                                          
                this.m_Log.Write("nsHttpAuthManager.js - profile-after-change ");  
  
            break;
            
            case "app-startup":
            break;
            
            default:
                throw Components.Exception("Unknown topic: " + aTopic);
        }
    },
    
    
    
    
    QueryInterface : function (iid)
    {
        if (!iid.equals(Components.interfaces.nsIHttpAuthManager2) 
        	    && !iid.equals(Components.interfaces.nsISupports)
                    && !iid.equals(Components.interfaces.nsIObserver))
            throw Components.results.NS_ERROR_NO_INTERFACE;
            
        return this;
    }
}
 

/******************************************************************************/
/* FACTORY*/
var nsHttpAuthManagerFactory = new Object();

nsHttpAuthManagerFactory.createInstance = function (outer, iid)
{
    if (outer != null)
        throw Components.results.NS_ERROR_NO_AGGREGATION;
    
    if (!iid.equals(nsHttpAuthManager2ClassID) 
            && !iid.equals(Components.interfaces.nsISupports))
        throw Components.results.NS_ERROR_INVALID_ARG;
    
    return new nsHttpAuthManager();
}


/******************************************************************************/
/* MODULE */
var nsHttpAuthManagerModule = new Object();

nsHttpAuthManagerModule.registerSelf = function(compMgr, fileSpec, location, type)
{
     var catman = Components.classes["@mozilla.org/categorymanager;1"].
                        getService(Components.interfaces.nsICategoryManager);
        
    catman.addCategoryEntry("xpcom-startup", 
                            "HTTP Auth Manager 2", 
                            nsHttpAuthManager2ContactID, 
                            true, 
                            true);                     
                            
    catman.addCategoryEntry("app-startup", 
                            "HTTP Auth Manager 2", 
                            "service," + nsHttpAuthManager2ContactID, 
                            true, 
                            true);

    compMgr = compMgr.QueryInterface(Components.interfaces.nsIComponentRegistrar);
    compMgr.registerFactoryLocation(nsHttpAuthManager2ClassID,
                                    "HTTP Auth Manager 2",
                                    nsHttpAuthManager2ContactID, 
                                    fileSpec,
                                    location, 
                                    type);
}


nsHttpAuthManagerModule.unregisterSelf = function(aCompMgr, aFileSpec, aLocation)
{
    var catman = Components.classes["@mozilla.org/categorymanager;1"].
                            getService(Components.interfaces.nsICategoryManager);
                            
    catman.deleteCategoryEntry("xpcom-startup", "HTTP Auth Manager 2", true);
    catman.deleteCategoryEntry("app-startup", "HTTP Auth Manager 2", true);
    
    aCompMgr = aCompMgr.QueryInterface(Components.interfaces.nsIComponentRegistrar);
    aCompMgr.unregisterFactoryLocation(nsHttpAuthManager2ClassID, aFileSpec);
}

 
nsHttpAuthManagerModule.getClassObject = function(compMgr, cid, iid)
{
    if (!cid.equals(nsHttpAuthManager2ClassID))
        throw Components.results.NS_ERROR_NO_INTERFACE;

    if (!iid.equals(Components.interfaces.nsIFactory))
        throw Components.results.NS_ERROR_NOT_IMPLEMENTED;

    return nsHttpAuthManagerFactory;
}


nsHttpAuthManagerModule.canUnload = function(compMgr)
{
    return true;
}
/******************************************************************************/


function NSGetModule(compMgr, fileSpec)
{
    return nsHttpAuthManagerModule; 
}
