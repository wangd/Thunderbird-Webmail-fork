/*****************************  Globals   *************************************/                 
const nsDemoClassID = Components.ID("{3f3822e0-6374-11d9-9669-0123456c7a89}"); 
const nsDemoContactID = "@mozilla.org/Demo;1";
const ExtDemoGuid = "{a6a33690-2c6a-11d9-9669-7899999c9a66}";




/***********************  DEMO ********************************/




function nsDemo()
{
    try
    {       
        var scriptLoader =  Components.classes["@mozilla.org/moz/jssubscript-loader;1"]
                              .getService(Components.interfaces.mozIJSSubScriptLoader);
        if (scriptLoader)
        {
            scriptLoader.loadSubScript("chrome://web-mail/content/common/DebugLog.js");
            scriptLoader.loadSubScript("chrome://web-mail/content/common/CookieManager.js");
        }
        
        var date = new Date();
        
        var  szLogFileName = "Demo Log - " + date.getHours()+ "-" + date.getMinutes() + "-"+ date.getUTCMilliseconds() +" -";
        this.m_DemoLog = new DebugLog("webmail.logging.comms", ExtDemoGuid, szLogFileName); 
        
        this.m_DemoLog.Write("nsDemo.js - Constructor - START");   
       
        this.m_szUserName = null;   
        this.m_szPassWord = null; 
        this.m_oResponseStream = null;       
        this.m_bAuthorised = false;
        this.m_oCookies = new CookieHandler(this.m_HotmailLog );    
                                      
        this.m_DemoLog.Write("nsDemo.js - Constructor - END");  
    }
    catch(e)
    {
        DebugDump("nsDemo.js: Constructor : Exception : " 
                                      + e.name 
                                      + ".\nError message: " 
                                      + e.message);
    }
}



nsDemo.prototype =
{
    get userName() {return this.m_szUserName;},
    set userName(userName) {return this.m_szUserName = userName;},

    get bAuthorised() {return this.m_bAuthorised;},
  
    get ResponseStream() {return this.m_oResponseStream;},
    set ResponseStream(responseStream) {return this.m_oResponseStream = responseStream;},
    
    
    serverComms : function (szMsg)
    {
        try
        { 
            this.m_DemoLog.Write("nsDemo.js - serverComms - START");
            this.m_DemoLog.Write("nsDemo.js - serverComms msg " + szMsg);
            var iCount = this.m_oResponseStream.write(szMsg,szMsg.length);
            this.m_DemoLog.Write("nsDemo.js - serverComms sent count: " + iCount 
                                                        +" msg length: " +szMsg.length);
            this.m_DemoLog.Write("nsDemo.js - serverComms - END");  
        }
        catch(e)
        {
            this.m_DemoLog.DebugDump("nsDemo.js: serverComms : Exception : " 
                                              + e.name 
                                              + ".\nError message: " 
                                              + e.message);
        }
    },
   
   
   
 
    
    httpConnection : function (szURL, szType, szData, aszCookies ,callBack)
    {
        try
        {
            this.m_DemoLog.Write("nsDemo.js - httpConnection - START");   
            this.m_DemoLog.Write("nsDemo.js - httpConnection - " + szURL + "\n"
                                                                    + szType + "\n"
                                                                    + aszCookies + "\n"
                                                                    + szData );  
            
            
            var ioService = Components.classes["@mozilla.org/network/io-service;1"].
                                    getService(Components.interfaces.nsIIOService);
      
            var uri = ioService.newURI(szURL, null, null);
            var channel = ioService.newChannelFromURI(uri);
            var HttpRequest = channel.QueryInterface(Components.interfaces.nsIHttpChannel);                                     
            HttpRequest.redirectionLimit = 0; //stops automatic redirect handling
            
            var component = this;             
            
              
            //set cookies
            if (aszCookies)
            {
                this.m_DemoLog.Write("nsDemo.js - httpConnection - adding cookie");
                
                var szCookie = "";
                for (i=0 ; i< aszCookies.length; i++)
                {
                    szCookie+=aszCookies[i];
                    if (i != aszCookies.length-1) szCookie+= "; ";
                }
                
                HttpRequest.setRequestHeader("x-CookieHack", "Hacker\r\nCookie: "  + szCookie , false);
            }
           
            HttpRequest.setRequestHeader("Accept-Language", "en-US" , false); 
            
            //set data
            if (szData)
            {
                this.m_DemoLog.Write("nsDemo.js - httpConnection - adding data");
                
                var uploadStream = Components.classes["@mozilla.org/io/string-input-stream;1"]
                                    .createInstance(Components.interfaces.nsIStringInputStream);         
                uploadStream.setData(szData, szData.length);
        
                var uploadChannel = channel.QueryInterface(Components.interfaces.nsIUploadChannel);
                uploadChannel.setUploadStream(uploadStream, "application/x-www-form-urlencoded", -1); 
            }
            HttpRequest.requestMethod = szType;
            
            var listener = new this.downloadListener(callBack, this);
            channel.asyncOpen(listener, null);  
            
            this.m_DemoLog.Write("nsDemo.js - httpConnection - END"); 
            
            return true;  
        }
        catch(e)
        {
            this.m_DemoLog.DebugDump("nsDemo.js: httpConnection : Exception : " 
                                              + e.name 
                                              + ".\nError message: " 
                                              + e.message);
            return false;
        }
    },
    
    
    downloadListener : function(CallbackFunc, parent) 
    {
        return ({
            m_data : "",
            
            onStartRequest : function (aRequest, aContext) 
            {                 
                this.m_data = "";
            },
            
            
            onDataAvailable : function (aRequest, aContext, aStream, aSourceOffset, aLength)
            {               
                var scriptableInputStream = Components.classes["@mozilla.org/scriptableinputstream;1"]
                                 .createInstance(Components.interfaces.nsIScriptableInputStream);
                scriptableInputStream.init(aStream);
            
                this.m_data += scriptableInputStream.read(aLength);
            },
            
            
            onStopRequest : function (aRequest, aContext, aStatus) 
            {
                CallbackFunc(this.m_data, aRequest, parent);
            },
            
            
            QueryInterface : function(aIID) 
            {
                if (aIID.equals(Components.interfaces.nsIStreamListener) ||
                          aIID.equals(Components.interfaces.nsISupportsWeakReference) ||
                          aIID.equals(Components.interfaces.nsIAlertListener) ||
                          aIID.equals(Components.interfaces.nsISupports))
                    return this;
                
                throw Components.results.NS_NOINTERFACE;
            }            
        });
    },
    
    
    
    logIn : function(szPassword)
    {
        try
        {
            this.m_DemoLog.Write("nsDemo.js - logIN - START");   
            this.m_DemoLog.Write("nsDemol.js - logIN - Username: " + this.m_szUserName 
                                                   + " Password: " + szPassword 
                                                   + " stream: " + this.m_oResponseStream);
            
            if (!this.m_szUserName || !this.m_oResponseStream ) return false;
            
            this.m_szPassWord = szPassword;
            
            
            ///you must set this variable to true when you successful loged in 
            this.m_bAuthorised = true
            
            this.m_DemoLog.Write("nsDemo.js - logIN - END");    
            return true;
        }
        catch(e)
        {
            this.m_DemoLog.DebugDump("nsDemo.js: logIN : Exception : " 
                                              + e.name + 
                                              ".\nError message: " 
                                              + e.message);
            return false;
        }
    },


    
    
    //stat 
    //total size is in octets
    getNumMessages : function()
    {
        try
        {
            this.m_DemoLog.Write("nsDemo.js - getNumMessages - START"); 
            
           
            
            this.m_DemoLog.Write("nsDemo.js - getNumMessages - END"); 
            return true;
        }
        catch(e)
        {
            this.m_DemoLog.DebugDump("nsDemo.js: getNumMessages : Exception : " 
                                          + e.name 
                                          + ".\nError message: " 
                                          + e.message);
            return false;
        }
    },
    
    
    
    
    
                     
    //list
    getMessageSizes : function() 
    {
        try
        {
            this.m_DemoLog.Write("nsDemo.js - getMessageSizes - START"); 
            
                        
           
            this.m_DemoLog.Write("nsDemo.js - getMessageSizes - END"); 
            return true;
        }
        catch(e)
        {
            this.m_DemoLog.DebugDump("nsDemo.js: getMessageSizes : Exception : " 
                                          + e.name 
                                          + ".\nError message: " 
                                          + e.message);
            return false;
        }
    },
    
    
    
    //IUDL
    getMessageIDs : function()
    {
        try
        {
            this.m_DemoLog.Write("nsDemo.js - getMessageIDs - START"); 
            
                      
            this.m_DemoLog.Write("nsDemo.js - getMessageIDs - END"); 
            return true;
        }
        catch(e)
        {
            this.m_DemoLog.DebugDump("nsDemo.js: getMessageIDs : Exception : " 
                                          + e.name 
                                          + ".\nError message: " 
                                          + e.message);
            return false;
        }
    },
      




    //retr
    getMessage : function( lID)
    {
        try
        {
            this.m_DemoLog.Write("nsDemo.js - getMessage - START"); 
            this.m_DemoLog.Write("nsDemo.js - getMessage - msg num" + lID); 
           
             
            this.m_DemoLog.Write("nsDemo.js - getMessage - END"); 
            return true;
        }
        catch(e)
        {
             this.m_DemoLog.DebugDump("nsDemo.js: getMessage : Exception : " 
                                          + e.name + 
                                          ".\nError message: " 
                                          + e.message);
            return false;
        }
    },    
    
    
   

             
    //dele
    deleteMessage : function(lID)
    {
        try
        {
            this.m_DemoLog.Write("nsDemo.js - deleteMessage - START");  
            this.m_DemoLog.Write("nsDemo.js - deleteMessage - id " + lID ); 
                   
           
            this.m_DemoLog.Write("nsDemo.js - deleteMessage - END");     
            return true;
        }
        catch(e)
        {
            this.m_DemoLog.DebugDump("nsDemo.js: deleteMessage : Exception : " 
                                          + e.name + 
                                          ".\nError message: " 
                                          + e.message);
            return false;
        } 
    },

    
   
   
    logOut : function()
    {
        try
        {
            this.m_DemoLog.Write("nsDemo.js - logOUT - START"); 
            
            this.m_bAuthorised = false;           
                                           
            this.m_DemoLog.Write("nsDmeo.js - logOUT - END");  
            return true;
        }
        catch(e)
        {
            this.m_DemoLog.DebugDump("nsDemo.js: logOUT : Exception : " 
                                      + e.name 
                                      + ".\nError message: " 
                                      + e.message);
            return false;
        }
    },  
    
     
   
                      
        
    
    
    
/******************************************************************************/
/***************** XPCOM  stuff ***********************************************/
/******************************************************************************/
    QueryInterface : function (iid)
    {
        if (!iid.equals(Components.interfaces.nsIDomainHandler) 
        	                      && !iid.equals(Components.interfaces.nsISupports))
            throw Components.results.NS_ERROR_NO_INTERFACE;
            
        return this;
    }
}
 

/******************************************************************************/
/* FACTORY*/
var nsDemoFactory = new Object();

nsDemoFactory.createInstance = function (outer, iid)
{
    if (outer != null) throw Components.results.NS_ERROR_NO_AGGREGATION;
    
    if (!iid.equals(nsDemoClassID) && !iid.equals(Components.interfaces.nsISupports))
        throw Components.results.NS_ERROR_INVALID_ARG;
    
    return new nsDemo();
}


/******************************************************************************/
/* MODULE */
var nsDemoModule = new Object();

nsDemoModule.registerSelf = function(compMgr, fileSpec, location, type)
{
    compMgr = compMgr.QueryInterface(Components.interfaces.nsIComponentRegistrar);
    compMgr.registerFactoryLocation(nsHotmailClassID,
                                    "DemoComponent",
                                    nsDemoContactID, 
                                    fileSpec,
                                    location, 
                                    type);
}


nsDemoModule.unregisterSelf = function(aCompMgr, aFileSpec, aLocation)
{
    aCompMgr = aCompMgr.QueryInterface(Components.interfaces.nsIComponentRegistrar);
    aCompMgr.unregisterFactoryLocation(nsHotmailClassID, aFileSpec);
}

 
nsDmeoModule.getClassObject = function(compMgr, cid, iid)
{
    if (!cid.equals(nsDemoClassID))
        throw Components.results.NS_ERROR_NO_INTERFACE;

    if (!iid.equals(Components.interfaces.nsIFactory))
        throw Components.results.NS_ERROR_NOT_IMPLEMENTED;

    return nsDemoFactory;
}


nsDemoModule.canUnload = function(compMgr)
{
    return true;
}
/******************************************************************************/


function NSGetModule(compMgr, fileSpec)
{
    return nsDemoModule; 
}
