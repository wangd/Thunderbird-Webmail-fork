/*****************************  Globals   *************************************/                 
const nsHttpAuthManagerClassID = Components.ID("{a54653e0-39e3-11da-8cd6-0800200c9a66}");
const nsHttpAuthManagerContactID = "@mozilla.org/HttpAuthManager;1";


/***********************  HttpAuthManager ********************************/
function nsHttpAuthManager()
{   
    try
    {       
        var scriptLoader =  Components.classes["@mozilla.org/moz/jssubscript-loader;1"]
                                 .getService(Components.interfaces.mozIJSSubScriptLoader);
        scriptLoader.loadSubScript("chrome://web-mail/content/common/DebugLog.js");
        scriptLoader.loadSubScript("chrome://web-mail/content/common/HttpAuthToken.js");

        var date = new Date();
        var szLogFileName = "HttpAuthManager Log - " + date.getHours()+ "-" 
                                    + date.getMinutes() + "-"+ date.getUTCMilliseconds() +" -";
        this.m_Log = new DebugLog("webmail.logging.comms", "", szLogFileName); 
        
        this.m_Log.Write("nsHttpAuthManager.js - Constructor - START");   
  
        this.m_aTokens = new Array();
                                
        this.m_Log.Write("nsHttpAuthManager.js - Constructor - END");  
    }
    catch(e)
    {
        DebugDump("nsHttpAuthManager.js: Constructor : Exception : " 
                                      + e.name + 
                                      ".\nError message: " 
                                      + e.message + "\n" 
                                      + e.lineNumber);
    }
}

nsHttpAuthManager.prototype =
{

    addToken : function (szDomain , szHeader, szURI ,szUserName, szPassword)
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
           
            //search cookies for domain
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
                        
                        if (szDomain.search(regexp)!=-1)
                        { 
                            this.m_Log.Write("nsHttpAuthManager.js - addToken - found domain - deleted");
                            var oTokens = new HttpAuthToken( this.m_Log);
                            oTokens.newToken(szDomain, szHeader, szURI,szUserName, szPassword);                                   
                            this.m_aTokens.push(oTokens); //place cookie in array
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
            var oTokens = new HttpAuthToken( this.m_Log);
            oTokens.newToken(szDomain, szHeader, szURI,szUserName, szPassword);                                   
            this.m_aTokens.push(oTokens); 
            
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
    
    
    
    findToken :  function (szDomain)
    {
        try
        {
            this.m_Log.Write("nsHttpAuthManager - findToken - START");
            this.m_Log.Write("nsHttpAuthManager - findToken - target domain - " + szDomain);
            if (!szDomain) return null;
            if (this.m_aTokens.length == 0) return null;   
            
            for (var i = 0 ; i<this.m_aTokens.length ; i++)
            {
                var temp = this.m_aTokens[i];
                this.m_Log.Write("nsHttpAuthManager.js - findToken " + i + " "+ temp.getDomain());
               
                var regexp =  new RegExp(temp.getDomain(), "i");
                this.m_Log.Write("nsHttpAuthManager.js - findToken - regexp " +regexp );
                
                if (szDomain.search(regexp)!=-1)
                { 
                    this.m_Log.Write("nsHttpAuthManager.js - findToken - found domain"); 
                    return temp.getTokenString();
                }   
            }
            
            return null;
            this.m_Log.Write("nsHttpAuthManager - findToken - END");   
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

    
/******************************************************************************/
/***************** XPCOM  stuff ***********************************************/
/******************************************************************************/
    QueryInterface : function (iid)
    {
        if (!iid.equals(Components.interfaces.nsIHttpAuthManager) 
        	    && !iid.equals(Components.interfaces.nsISupports))
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
    
    if (!iid.equals(nsHttpAuthManagerClassID) 
            && !iid.equals(Components.interfaces.nsISupports))
        throw Components.results.NS_ERROR_INVALID_ARG;
    
    return new nsHttpAuthManager();
}


/******************************************************************************/
/* MODULE */
var nsHttpAuthManagerModule = new Object();

nsHttpAuthManagerModule.registerSelf = function(compMgr, fileSpec, location, type)
{
    compMgr = compMgr.QueryInterface(Components.interfaces.nsIComponentRegistrar);
    compMgr.registerFactoryLocation(nsHttpAuthManagerClassID,
                                    "HTTP Auth Manager",
                                    nsHttpAuthManagerContactID, 
                                    fileSpec,
                                    location, 
                                    type);
}


nsHttpAuthManagerModule.unregisterSelf = function(aCompMgr, aFileSpec, aLocation)
{
    aCompMgr = aCompMgr.QueryInterface(Components.interfaces.nsIComponentRegistrar);
    aCompMgr.unregisterFactoryLocation(nsHttpAuthManagerClassID, aFileSpec);
}

 
nsHttpAuthManagerModule.getClassObject = function(compMgr, cid, iid)
{
    if (!cid.equals(nsHttpAuthManagerClassID))
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
