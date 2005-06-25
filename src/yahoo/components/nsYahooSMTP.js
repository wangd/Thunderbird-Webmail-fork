/*****************************  Globals   *************************************/                 
const nsYahooSMTPClassID = Components.ID("{958266e0-e2a6-11d9-8cd6-0800200c9a66}");
const nsYahooSMTPContactID = "@mozilla.org/YahooSMTP;1";
const ExtYahooGuid = "{d7103710-6112-11d9-9669-0800200c9a66}";

const patternYahooSecure = /<a href="(.*?https.*?)".*?>/;
const patternYahooForm = /<form.*?name=login_form.*?>[\S\d\s\r\n]*?<\/form>/gm;
const patternYahooAction = /<form.*?action="(.*?)".*?>/;
const patternYahooLogIn = /<input type="*hidden"* name=.*?value=.*?>/gm;
const patternYahooName = /name="([\S]*)"/;
const patternYahooNameAlt = /name=([\S]*)/;
const patternYahooValue = /value="([\S]*)"/;
const patternYahooAltValue = /value=([\S]*)>/;
const patternYahooRedirect = /<a href="(.*?)">/;
const patternYahooCompose = /location='(http:\/\/.*?Compose\?YY=.*?)'/i;

/******************************  Yahoo ***************************************/
function nsYahooSMTP()
{
    try
    {       
        var scriptLoader =  Components.classes["@mozilla.org/moz/jssubscript-loader;1"]
                              .getService(Components.interfaces.mozIJSSubScriptLoader);
        
        scriptLoader.loadSubScript("chrome://web-mail/content/common/DebugLog.js");
        scriptLoader.loadSubScript("chrome://web-mail/content/common/CookieManager.js");
        scriptLoader.loadSubScript("chrome://web-mail/content/common/CommonPrefs.js");
       
        
        var date = new Date();
        var  szLogFileName = "Yahoo SMTP Log - " + date.getHours()
                                           + "-" + date.getMinutes() 
                                           + "-"+ date.getUTCMilliseconds() +" -";
        this.m_Log = new DebugLog("webmail.logging.comms", ExtYahooGuid, szLogFileName); 
        
        this.m_Log.Write("nsYahoo.js - Constructor - START");   
       
        this.m_bAuthorised = false;
        this.m_szUserName = null;   
        this.m_szPassWord = null; 
        this.m_oResponseStream = null;  
        this.m_szComposeURI = null;
        this.m_oCookies = new CookieHandler(this.m_Log);    
        this.m_iStage = 0;
                       
        this.m_Log.Write("nsYahoo.js - Constructor - END");  
    }
    catch(e)
    {
        DebugDump("nsYahoo.js: Constructor : Exception : " 
                                      + e.name 
                                      + ".\nError message: " 
                                      + e.message);
    }
}



nsYahooSMTP.prototype =
{
    get userName() {return this.m_szUserName;},
    set userName(userName) {return this.m_szUserName = userName;},
  
    get passWord() {return this.m_szPassWord;},
    set passWord(passWord) {return this.m_szPassWord = passWord;},
    
    get bAuthorised() {return this.m_bAuthorised;},
  
    get ResponseStream() {return this.m_oResponseStream;},
    set ResponseStream(responseStream) {return this.m_oResponseStream = responseStream;},
    
    
    logIn : function()
    {
        try
        {
            this.m_Log.Write("nsYahoo.js - logIN - START");   
            this.m_Log.Write("nsYahoo.js - logIN - Username: " + this.m_szUserName 
                                                   + " Password: " + this.m_szPassWord 
                                                   + " stream: " + this.m_oResponseStream);
           
            if (!this.m_szUserName || !this.m_oResponseStream  || !this.m_szPassWord) return false;
                     
            //get YahooLog.com webpage
            var bResult = this.httpConnection("http://mail.yahoo.com", 
                                              "GET", 
                                              null,
                                              null, 
                                              this.loginOnloadHandler);
                                                
            if (!bResult) throw new Error("httpConnection returned false");
            
            this.m_Log.Write("nsYahoo.js - logIN - END");    
            return true;
        }
        catch(e)
        {
            this.m_Log.DebugDump("nsYahoo.js: logIN : Exception : " 
                                              + e.name + 
                                              ".\nError message: " 
                                              + e.message);
            return false;
        }
    },

   
    loginOnloadHandler : function(szResponse ,event , mainObject)
    {
        try
        {
            mainObject.m_Log.Write("nsYahoo.js - loginOnloadHandler - START"); 
            
            mainObject.m_Log.Write("nsYahoo.js - loginOnloadHandler : " 
                                                    + mainObject.m_iStage + "\n"
                                                    + szResponse);  
            
            var httpChannel = event.QueryInterface(Components.interfaces.nsIHttpChannel);
            
            //if this fails we've gone somewhere new
            mainObject.m_Log.Write("nsYahoo.js - loginOnloadHandler - status :" +httpChannel.responseStatus );
            if (httpChannel.responseStatus != 200 
                        && httpChannel.responseStatus != 302
                                    && httpChannel.responseStatus != 301) 
                throw new Error("return status " + httpChannel.responseStatus);
            
            var szURL = httpChannel.URI.host;
            mainObject.m_Log.Write("nsYahoo.js - loginOnloadHandler - url - " + szURL);  
            var aszTempDomain = szURL.match(/[^\.\/]+\.[^\.\/]+$/);  
            mainObject.m_Log.Write("nsYahoo.js - loginOnloadHandler - domain - " + aszTempDomain[0]); 
            
            //get cookies
            try
            {
                var szCookies =  httpChannel.getResponseHeader("Set-Cookie");
                mainObject.m_Log.Write("nsYahoo.js - loginOnloadHandler - received cookies \n" + szCookies);  
                mainObject.m_oCookies.addCookie( aszTempDomain[0], szCookies); 
            }
            catch(e)
            {
                mainObject.m_Log.Write("nsYahoo.js - loginOnloadHandler - no cookies found"); 
            } 
            
            var ios=Components.classes["@mozilla.org/network/io-service;1"].
                                    getService(Components.interfaces.nsIIOService);



            //bounce handler
            if ( httpChannel.responseStatus == 302 || httpChannel.responseStatus == 301)
            {
                try
                {
                    var szLocation =  httpChannel.getResponseHeader("Location");
                    mainObject.m_Log.Write("nsYahoo.js - loginOnloadHandler - location \n" + szLocation);  
                }
                catch(e)
                {
                    throw new Error("Location header not found")
                } 
            
                //set cookies
                var szURL = ios.newURI(szLocation,null,null).prePath;
                var aszHost = szURL.match(/[^\.\/]+\.[^\.\/]+$/);  
                var aszCookie = mainObject.m_oCookies.findCookie(aszHost);
                mainObject.m_Log.Write("nsYahoo.js - loginOnloadHandler - sending cookies - "+ aszCookie);
                
                var bResult = mainObject.httpConnection(szLocation, 
                                                        "GET", 
                                                        null, 
                                                        aszCookie,
                                                        mainObject.loginOnloadHandler);
                                            
                if (!bResult) throw new Error("httpConnection returned false");
                return;
            }
            
            //page code                                
            switch (mainObject.m_iStage)
            {
                case 0: //secure web page
                    var aSecureLoginURL = szResponse.match(patternYahooSecure);
                    if (aSecureLoginURL == null)
                         throw new Error("error parsing yahoo login web page");
                    
                    mainObject.m_Log.Write("nsYahoo.js - loginOnloadHandler - Secure URL " + aSecureLoginURL);
                    
                    var szSecureURL = aSecureLoginURL[1];
                    
                    //set  cookies
                    var szURL = ios.newURI(szSecureURL,null,null).prePath;
                    var aszHost = szURL.match(/[^\.\/]+\.[^\.\/]+$/);  
                    var aszCookie = mainObject.m_oCookies.findCookie(aszHost);
                    mainObject.m_Log.Write("nsYahoo.js - loginOnloadHandler - sending cookies - "+ aszCookie);
                   
                    var bResult = mainObject.httpConnection(szSecureURL, 
                                                            "GET", 
                                                            null, 
                                                            aszCookie,
                                                            mainObject.loginOnloadHandler);
                                             
                    if (!bResult) throw new Error("httpConnection returned false");
                    mainObject.m_iStage++;
                break;
               
                
                case 1: // login page               
                    var aLoginForm = szResponse.match(patternYahooForm);
                    if (aLoginForm == null)
                         throw new Error("error parsing yahoo login web page");
                    mainObject.m_Log.Write("nsYahoo.js - loginOnloadHandler - loginForm " + aLoginForm);
                    
                    var szLoginURL = aLoginForm[0].match(patternYahooAction)[1];
                    mainObject.m_Log.Write("nsYahoo.js - loginOnloadHandler - loginURL " + szLoginURL);
                    
                    var aLoginData = aLoginForm[0].match(patternYahooLogIn);
                    mainObject.m_Log.Write("nsYahoo.js - loginOnloadHandler - loginData " + aLoginData);
                    var szData = null;
                    for (i=0; i<aLoginData.length; i++)
                    {
                        var szName=null;
                        try
                        { 
                            szName= aLoginData[i].match(patternYahooName)[1];
                        }
                        catch(e)
                        {
                            szName= aLoginData[i].match(patternYahooNameAlt)[1];
                        
                        }
                        mainObject.m_Log.Write("nsYahoo.js - loginOnloadHandler - loginData name " + szName);
                        
                        var szValue
                        try
                        {
                            szValue = aLoginData[i].match(patternYahooValue)[1];
                        }
                        catch(err)
                        {
                            szValue = aLoginData[i].match(patternYahooAltValue)[1];
                        }                     
                        mainObject.m_Log.Write("nsYahoo.js - loginOnloadHandler - loginData value " + szValue);
                        
                        szData?(szData += szName + "="):(szData = szName + "=");                         
                        szValue.length>0?(szData +=  encodeURIComponent(szValue) + "&"):(szData += "&");
                    }
                    szData += "login=" + mainObject.m_szUserName.match(/(.*?)@/)[1].toLowerCase() + "&";
                    szData += "passwd=" + encodeURIComponent(mainObject.m_szPassWord) + "&";
                    szData += ".save=Sign+In";
                    mainObject.m_Log.Write("nsYahoo.js - loginOnloadHandler - login DATA \n" + szData);   
                          
                    //set  cookies
                    var szURL = ios.newURI(szLoginURL,null,null).prePath;
                    var aszHost = szURL.match(/[^\.\/]+\.[^\.\/]+$/);  
                    var aszCookie = mainObject.m_oCookies.findCookie(aszHost);
                    mainObject.m_Log.Write("nsYahoo.js - loginOnloadHandler - sending cookies - "+ aszCookie);
                   
                    var bResult = mainObject.httpConnection(szLoginURL, 
                                                            "POST", 
                                                            szData, 
                                                            aszCookie,
                                                            mainObject.loginOnloadHandler);
                                             
                    if (!bResult) throw new Error("httpConnection returned false");
                    mainObject.m_iStage++;
                break;
                                  
                case 2: //redirect
                    var aLoginRedirect = szResponse.match(patternYahooRedirect);
                    if (aLoginRedirect == null)
                         throw new Error("error parsing yahoo login web page");
                    mainObject.m_Log.Write("nsYahoo.js - loginOnloadHandler - login redirect " + aLoginRedirect);
                      
                    var szLocation = aLoginRedirect[1];
                    
                    //set cookies
                    var szURL = ios.newURI(szLocation,null,null).prePath;
                    var aszHost = szURL.match(/[^\.\/]+\.[^\.\/]+$/);  
                    var aszCookie = mainObject.m_oCookies.findCookie(aszHost);
                    mainObject.m_Log.Write("nsYahoo.js - loginOnloadHandler - sending cookies - "+ aszCookie);
                    
                    var bResult = mainObject.httpConnection(szLocation, 
                                                            "GET", 
                                                            null, 
                                                            aszCookie,
                                                            mainObject.loginOnloadHandler);
                                                
                    if (!bResult) throw new Error("httpConnection returned false");
                    mainObject.m_iStage++;
                break;
            
                case 3: //mail box
                    var szLocation = httpChannel.URI.spec;
                    var iIndex = szLocation.indexOf("uilogin.srt");
                    mainObject.m_Log.Write("nsYahoo.js - loginOnloadHandler - page check : " + szLocation 
                                                        + " index = " +  iIndex );
                    if (iIndex != -1) throw new Error("error logging in ");
                    
                    //get urls for later use
                    mainObject.m_szComposeURI = szResponse.match(patternYahooCompose)[1] ;
                    mainObject.m_Log.Write("nsYahoo.js - loginOnloadHandler - m_szComposeURI : "+mainObject.m_szComposeURI );
            
                    //server response
                    mainObject.serverComms("235 Your In\r\n");
                    mainObject.m_bAuthorised = true;
                break;
            };
                      
            mainObject.m_Log.Write("nsYahoo.js - loginOnloadHandler - END");
        }
        catch(err)
        {
            mainObject.m_Log.DebugDump("nsYahoo.js: loginHandler : Exception : " 
                                          + err.name 
                                          + ".\nError message: " 
                                          + err.message);
                                            
            mainObject.serverComms("502 negative vibes\r\n");
        }
    },
    
    
    rawMSG : function (szEmail)
    {
        try
        {
            this.m_Log.Write("nsYahoo.js - rawMSG - START");   
            this.m_Log.Write("nsYahoo.js - rawMSG " + szEmail);
           
            
            this.serverComms("250 OK\r\n");
            
            this.m_Log.Write("nsYahoo.js - rawMSG - END");    
            return true;
        }
        catch(err)
        {
            this.m_Log.DebugDump("nsYahoo.js: rawMSG : Exception : " 
                                              + e.name + 
                                              ".\nError message: " 
                                              + e.message);
            return false;
        }
    },
    
    ////////////////////////////////////////////////////////////////////////////
    /////  Comms                  
    
    serverComms : function (szMsg)
    {
        try
        { 
            this.m_Log.Write("nsYahoo.js - serverComms - START");
            this.m_Log.Write("nsYahoo.js - serverComms msg " + szMsg);
            var iCount = this.m_oResponseStream.write(szMsg,szMsg.length);
            this.m_Log.Write("nsYahoo.js - serverComms sent count: " + iCount 
                                                        +" msg length: " +szMsg.length);
            this.m_Log.Write("nsYahoo.js - serverComms - END");  
        }
        catch(e)
        {
            this.m_Log.DebugDump("nsYahoo.js: serverComms : Exception : " 
                                              + e.name 
                                              + ".\nError message: " 
                                              + e.message);
        }
    },
   

    
    
    httpConnection : function (szURL, szType, szData, szCookies ,callBack)
    {
        try
        {
            this.m_Log.Write("nsYahoo.js - httpConnection - START");   
            this.m_Log.Write("nsYahoo.js - httpConnection - " + szURL + "\n"
                                                              + szType + "\n"
                                                              + szCookies + "\n"
                                                              + szData );  
            
            
            var ioService = Components.classes["@mozilla.org/network/io-service;1"].
                                    getService(Components.interfaces.nsIIOService);
      
            var uri = ioService.newURI(szURL, null, null);
            var channel = ioService.newChannelFromURI(uri);
            var HttpRequest = channel.QueryInterface(Components.interfaces.nsIHttpChannel);                                     
            HttpRequest.redirectionLimit = 0; //stops automatic redirect handling
            
            var component = this;             
            
              
            //set cookies
            if (szCookies)
            {
                this.m_Log.Write("nsYahoo.js - httpConnection - adding cookie \n"+ szCookies);
                HttpRequest.setRequestHeader("x-CookieHack", "Hacker\r\nCookie: "  + szCookies , false);
            }
           
           
            //set data
            if (szData)
            {
                this.m_Log.Write("nsYahoo.js - httpConnection - adding data");
                
                var uploadStream = Components.classes["@mozilla.org/io/string-input-stream;1"]
                                    .createInstance(Components.interfaces.nsIStringInputStream);         
                uploadStream.setData(szData, szData.length);
        
                var uploadChannel = channel.QueryInterface(Components.interfaces.nsIUploadChannel);
                uploadChannel.setUploadStream(uploadStream, "application/x-www-form-urlencoded", -1); 
            }
            HttpRequest.requestMethod = szType;
            
           // HttpRequest.setRequestHeader("User-Agent", 
           //               "Mozilla/5.0 (Windows; U; Windows NT 5.1;en-US; rv:1.7.5) Gecko/20041206 Thunderbird/1.0" ,
           //               false);
           // HttpRequest.setRequestHeader("Accept-Language", "en-US" , false);
            
            var listener = new this.downloadListener(callBack, this);
            channel.asyncOpen(listener, null);  
            
            this.m_Log.Write("nsYahoo.js - httpConnection - END"); 
            
            return true;  
        }
        catch(e)
        {
            this.m_Log.DebugDump("nsYahoo.js: httpConnection : Exception : " 
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
        
    
    
    
/******************************************************************************/
/***************** XPCOM  stuff ***********************************************/
/******************************************************************************/
    QueryInterface : function (iid)
    {
        if (!iid.equals(Components.interfaces.nsISMTPDomainHandler) 
        	                && !iid.equals(Components.interfaces.nsISupports))
            throw Components.results.NS_ERROR_NO_INTERFACE;
            
        return this;
    }
}
 

/******************************************************************************/
/* FACTORY*/
var nsYahooSMTPFactory = new Object();

nsYahooSMTPFactory.createInstance = function (outer, iid)
{
    if (outer != null) throw Components.results.NS_ERROR_NO_AGGREGATION;
    
    if (!iid.equals(nsYahooSMTPClassID) && !iid.equals(Components.interfaces.nsISupports))
        throw Components.results.NS_ERROR_INVALID_ARG;
    
    return new nsYahooSMTP();
}


/******************************************************************************/
/* MODULE */
var nsYahooSMTPModule = new Object();

nsYahooSMTPModule.registerSelf = function(compMgr, fileSpec, location, type)
{
    compMgr = compMgr.QueryInterface(Components.interfaces.nsIComponentRegistrar);
    compMgr.registerFactoryLocation(nsYahooSMTPClassID,
                                    "YahooSMTPComponent",
                                    nsYahooSMTPContactID, 
                                    fileSpec,
                                    location, 
                                    type);
}


nsYahooSMTPModule.unregisterSelf = function(aCompMgr, aFileSpec, aLocation)
{
    aCompMgr = aCompMgr.QueryInterface(Components.interfaces.nsIComponentRegistrar);
    aCompMgr.unregisterFactoryLocation(nsYahooSMTPClassID, aFileSpec);
}

 
nsYahooSMTPModule.getClassObject = function(compMgr, cid, iid)
{
    if (!cid.equals(nsYahooSMTPClassID))
        throw Components.results.NS_ERROR_NO_INTERFACE;

    if (!iid.equals(Components.interfaces.nsIFactory))
        throw Components.results.NS_ERROR_NOT_IMPLEMENTED;

    return nsYahooSMTPFactory;
}


nsYahooSMTPModule.canUnload = function(compMgr)
{
    return true;
}
/******************************************************************************/


function NSGetModule(compMgr, fileSpec)
{
    return nsYahooSMTPModule; 
}
