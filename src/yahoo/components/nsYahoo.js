/*****************************  Globals   *************************************/                 
const nsYahooClassID = Components.ID("{bfacf8a0-6447-11d9-9669-0800200c9a66}");
const nsYahooContactID = "@mozilla.org/Yahoo;1";
const ExtYahooGuid = "{d7103710-6112-11d9-9669-0800200c9a66}";

const patternYahooSecure = /<a href="(.*?https.*?)".*?>/;
const patternYahooForm = /<form.*?name=login_form.*?>[\S\d\s\r\n]*?<\/form>/gm;
const patternYahooAction = /<form.*?action="(.*?)".*?>/;
const patternYahooLogIn = /<input type=hidden name=.*?value=.*?>/gm;
const patternYahooName = /name="(.*?)"/;
const patternYahooValue = /value="(.*?)"/;
const patternYahooAltValue = /value=(.*?)>/;
const patternYahooRedirect = /<a href="(.*?)">/;
const patternYahooInbox = /<li id="inbox".*?<a href="(.*?Inbox.*?)".*?>/; 
const patternYahooInboxFrame = /gInboxPage = "http:\/\/.*?(\/.*?)";/;
const patternYahooBulkFrame = /<li id="bulk".*?><a href="(.*?)"/;
const patternYahooMSGIdTable = /<table id="datatable".*?>[\S\d\s\r\n]*?<\/table>/m;
const patternYahooMsgRow = /<tr.*?>[\S\d\s\r\n]*?<\/tr>/gm;
const patternYahooMsgID = /<a href="(.*?MsgId.*?)">/;
const patternYahooMsgSize = /<td.*?>.*?<\/td>/gm;
const patternYahooNextPage = /<a href=".*?next=1.*?">/m;
const PatternYahooID =/MsgId=(.*?)&/;
const PatternYahooDeleteForm = /<form name=messageList.*?>[\S\d\s\r\n]*?<\/form>/;
const PatternYahooDeleteURL = /action="(.*?)"/;
const PatternYahooDeleteInput = /<input.*?name=".*?".*?value=".*?">/gm;
const PatternYahooDeleteNameValue = /type=hidden.*?name="(.*?)".*?value="(.*?)"/;
const PatternYahooDeleteNameValue2 = /type="hidden".*?name="(.*?)".*?value="(.*?)"/;
const PatternYahooBox =/(box=.*?)#/;
const PatternYahooBoxAlt =/(box=.*?)$/;
/******************************  Yahoo ***************************************/




function nsYahoo()
{
    try
    {       
        var scriptLoader =  Components.classes["@mozilla.org/moz/jssubscript-loader;1"]
                              .getService(Components.interfaces.mozIJSSubScriptLoader);
        if (scriptLoader)
        {
            scriptLoader.loadSubScript("chrome://web-mail/content/common/DebugLog.js");
            scriptLoader.loadSubScript("chrome://web-mail/content/common/CookieManager.js");
            scriptLoader.loadSubScript("chrome://web-mail/content/common/CommonPrefs.js");
        }
        
        var date = new Date();
        
        var  szLogFileName = "Yahoo Log - " + date.getHours()+ "-" + date.getMinutes() + "-"+ date.getUTCMilliseconds() +" -";
        this.m_YahooLog = new DebugLog("webmail.logging.comms", ExtYahooGuid, szLogFileName); 
        
        this.m_YahooLog.Write("nsYahoo.js - Constructor - START");   
       
        this.m_bAuthorised = false;
        this.m_szUserName = null;   
        this.m_szPassWord = null; 
        this.m_oResponseStream = null;  
        this.m_szLocationURI = null;     
        this.m_szMailboxURI = null;
        this.m_szBulkFolderURI = null;
        this.m_szDeleteURL = null; 
        this.m_szData = null;     
        this.m_bJunkChecked = false;
        this.m_aszMsgIDStore = new Array();
        this.m_aiMsgSize = new Array();
        this.m_iTotalSize = 0;
        this.m_oCookies = new CookieHandler(this.m_YahooLog);    
        this.m_iStage = 0;  
        this.m_szHeader = null;  
        this.m_szMsgID = null;  
        this.m_szBox = null;
      
        //do i download junkmail
        var oPref = new Object();
        oPref.Value = null;
        var  WebMailPrefAccess = new WebMailCommonPrefAccess();
        if (WebMailPrefAccess.Get("bool","yahoo.bUseJunkMail",oPref))
            this.m_bUseJunkMail=oPref.Value;
        else
            this.m_bUseJunkMail=false;                                                    
        this.m_YahooLog.Write("nsYahoo.js - Constructor - END");  
    }
    catch(e)
    {
        DebugDump("nsYahoo.js: Constructor : Exception : " 
                                      + e.name 
                                      + ".\nError message: " 
                                      + e.message);
    }
}



nsYahoo.prototype =
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
            this.m_YahooLog.Write("nsYahoo.js - serverComms - START");
            this.m_YahooLog.Write("nsYahoo.js - serverComms msg " + szMsg);
            var iCount = this.m_oResponseStream.write(szMsg,szMsg.length);
            this.m_YahooLog.Write("nsYahoo.js - serverComms sent count: " + iCount 
                                                        +" msg length: " +szMsg.length);
            this.m_YahooLog.Write("nsYahoo.js - serverComms - END");  
        }
        catch(e)
        {
            this.m_YahooLog.DebugDump("nsYahoo.js: serverComms : Exception : " 
                                              + e.name 
                                              + ".\nError message: " 
                                              + e.message);
        }
    },
   

    
    
    httpConnection : function (szURL, szType, szData, szCookies ,callBack)
    {
        try
        {
            this.m_YahooLog.Write("nsYahoo.js - httpConnection - START");   
            this.m_YahooLog.Write("nsYahoo.js - httpConnection - " + szURL + "\n"
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
                this.m_YahooLog.Write("nsYahoo.js - httpConnection - adding cookie \n"+ szCookies);
                HttpRequest.setRequestHeader("x-CookieHack", "Hacker\r\nCookie: "  + szCookies , false);
            }
           
           
            //set data
            if (szData)
            {
                this.m_YahooLog.Write("nsYahoo.js - httpConnection - adding data");
                
                var uploadStream = Components.classes["@mozilla.org/io/string-input-stream;1"]
                                    .createInstance(Components.interfaces.nsIStringInputStream);         
                uploadStream.setData(szData, szData.length);
        
                var uploadChannel = channel.QueryInterface(Components.interfaces.nsIUploadChannel);
                uploadChannel.setUploadStream(uploadStream, "application/x-www-form-urlencoded", -1); 
            }
            HttpRequest.requestMethod = szType;
            
           // HttpRequest.setRequestHeader("User-Agent", "Mozilla/5.0 (Windows; U; Windows NT 5.1;en-US; rv:1.7.5) Gecko/20041206 Thunderbird/1.0" , false);
            HttpRequest.setRequestHeader("Accept-Language", "en-US" , false);
            
            var listener = new this.downloadListener(callBack, this);
            channel.asyncOpen(listener, null);  
            
            this.m_YahooLog.Write("nsYahoo.js - httpConnection - END"); 
            
            return true;  
        }
        catch(e)
        {
            this.m_YahooLog.DebugDump("nsYahoo.js: httpConnection : Exception : " 
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
            this.m_YahooLog.Write("nsYahoo.js - logIN - START");   
            this.m_YahooLog.Write("nsYahoo.js - logIN - Username: " + this.m_szUserName 
                                                   + " Password: " + szPassword 
                                                   + " stream: " + this.m_oResponseStream);
            
            if (!this.m_szUserName || !this.m_oResponseStream ) return false;
            
            this.m_szPassWord = szPassword;
         
            //get YahooLog.com webpage
            var bResult = this.httpConnection("http://mail.yahoo.com", 
                                              "GET", 
                                              null,
                                              null, 
                                              this.loginOnloadHandler);
                                                
            if (!bResult) throw new Error("httpConnection returned false");
           
            this.m_YahooLog.Write("nsYahoo.js - logIN - END");    
            return true;
        }
        catch(e)
        {
            this.m_YahooLog.DebugDump("nsYahoo.js: logIN : Exception : " 
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
            mainObject.m_YahooLog.Write("nsYahoo.js - loginOnloadHandler - START"); 
            
            mainObject.m_YahooLog.Write("nsYahoo.js - loginOnloadHandler : " 
                                         + mainObject.m_iStage + "\n"
                                         + szResponse);  
            
            var httpChannel = event.QueryInterface(Components.interfaces.nsIHttpChannel);
            
            //if this fails we've gone somewhere new
            mainObject.m_YahooLog.Write("nsYahoo.js - loginOnloadHandler - status :" +httpChannel.responseStatus );
            if (httpChannel.responseStatus != 200 
                        && httpChannel.responseStatus != 302
                                    && httpChannel.responseStatus != 301) 
                throw new Error("return status " + httpChannel.responseStatus);
            
            var szURL = httpChannel.URI.host;
            mainObject.m_YahooLog.Write("nsYahoo.js - loginOnloadHandler - url - " + szURL);  
            var aszTempDomain = szURL.match(/[^\.\/]+\.[^\.\/]+$/);  
            mainObject.m_YahooLog.Write("nsYahoo.js - loginOnloadHandler - domain - " + aszTempDomain[0]); 
            
            //get cookies
            try
            {
                var szCookies =  httpChannel.getResponseHeader("Set-Cookie");
                mainObject.m_YahooLog.Write("nsYahoo.js - loginOnloadHandler - received cookies \n" + szCookies);  
                mainObject.m_oCookies.addCookie( aszTempDomain[0], szCookies); 
            }
            catch(e)
            {
                mainObject.m_YahooLog.Write("nsYahoo.js - loginOnloadHandler - no cookies found"); 
            } 
            
            var ios=Components.classes["@mozilla.org/network/io-service;1"].
                                    getService(Components.interfaces.nsIIOService);



            //bounce handler
            if ( httpChannel.responseStatus == 302 || httpChannel.responseStatus == 301)
            {
                try
                {
                    var szLocation =  httpChannel.getResponseHeader("Location");
                    mainObject.m_YahooLog.Write("nsYahoo.js - loginOnloadHandler - location \n" + szLocation);  
                }
                catch(e)
                {
                    throw new Error("Location header not found")
                } 
            
                //set cookies
                var szURL = ios.newURI(szLocation,null,null).prePath;
                var aszHost = szURL.match(/[^\.\/]+\.[^\.\/]+$/);  
                var aszCookie = mainObject.m_oCookies.findCookie(aszHost);
                mainObject.m_YahooLog.Write("nsYahoo.js - loginOnloadHandler - sending cookies - "+ aszCookie);
                
                var bResult = mainObject.httpConnection(szLocation, 
                                                        "GET", 
                                                        null, 
                                                        aszCookie,
                                                        mainObject.loginOnloadHandler);
                                            
                if (!bResult) throw new Error("httpConnection returned false");
            }
            else  //everything else
            {
                //page code                                
                switch (mainObject.m_iStage)
                {
                    case 0: //secure web page
                        var aSecureLoginURL = szResponse.match(patternYahooSecure);
                        if (aSecureLoginURL == null)
                             throw new Error("error parsing yahoo login web page");
                        
                        mainObject.m_YahooLog.Write("nsYahoo.js - loginOnloadHandler - Secure URL " + aSecureLoginURL);
                        
                        var szSecureURL = aSecureLoginURL[1];
                        
                        //set  cookies
                        var szURL = ios.newURI(szSecureURL,null,null).prePath;
                        var aszHost = szURL.match(/[^\.\/]+\.[^\.\/]+$/);  
                        var aszCookie = mainObject.m_oCookies.findCookie(aszHost);
                        mainObject.m_YahooLog.Write("nsYahoo.js - loginOnloadHandler - sending cookies - "+ aszCookie);
                       
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
                        mainObject.m_YahooLog.Write("nsYahoo.js - loginOnloadHandler - loginForm " + aLoginForm);
                        
                        var szLoginURL = aLoginForm[0].match(patternYahooAction)[1];
                        mainObject.m_YahooLog.Write("nsYahoo.js - loginOnloadHandler - loginURL " + szLoginURL);
                        
                        var aLoginData = aLoginForm[0].match(patternYahooLogIn);
                        mainObject.m_YahooLog.Write("nsYahoo.js - loginOnloadHandler - loginData " + aLoginData);
                        var szData = null;
                        for (i=0; i<aLoginData.length; i++)
                        {
                            var szName = aLoginData[i].match(patternYahooName)[1];
                            mainObject.m_YahooLog.Write("nsYahoo.js - loginOnloadHandler - loginData name " + szName);
                            
                            var szValue
                            try
                            {
                                szValue = aLoginData[i].match(patternYahooValue)[1];
                            }
                            catch(err)
                            {
                                szValue = aLoginData[i].match(patternYahooAltValue)[1];
                            }
                            
                            mainObject.m_YahooLog.Write("nsYahoo.js - loginOnloadHandler - loginData value " + szValue);
                            
                            if (!szData)
                                szData = szName + "=" ;
                            else
                                szData += szName + "=" ;
                           
                            if(szValue.length>0)  
                                szData +=  encodeURIComponent(szValue) + "&";
                            else
                                szData += "&";
                        }
                        szData += "login=" + mainObject.m_szUserName.match(/(.*?)@/)[1].toLowerCase() + "&";
                        szData += "passwd=" + encodeURIComponent(mainObject.m_szPassWord) + "&";
                        szData += ".save=Sign+In";
                        mainObject.m_YahooLog.Write("nsYahoo.js - loginOnloadHandler - login DATA \n" + szData);   
                              
                        //set  cookies
                        var szURL = ios.newURI(szLoginURL,null,null).prePath;
                        var aszHost = szURL.match(/[^\.\/]+\.[^\.\/]+$/);  
                        var aszCookie = mainObject.m_oCookies.findCookie(aszHost);
                        mainObject.m_YahooLog.Write("nsYahoo.js - loginOnloadHandler - sending cookies - "+ aszCookie);
                       
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
                        mainObject.m_YahooLog.Write("nsYahoo.js - loginOnloadHandler - login redirect " + aLoginRedirect);
                          
                        var szLocation = aLoginRedirect[1];
                        
                        //set cookies
                        var szURL = ios.newURI(szLocation,null,null).prePath;
                        var aszHost = szURL.match(/[^\.\/]+\.[^\.\/]+$/);  
                        var aszCookie = mainObject.m_oCookies.findCookie(aszHost);
                        mainObject.m_YahooLog.Write("nsYahoo.js - loginOnloadHandler - sending cookies - "+ aszCookie);
                        
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
                        mainObject.m_YahooLog.Write("nsYahoo.js - loginOnloadHandler - page check : " + szLocation 
                                                            + " index = " +  iIndex );
                        if (iIndex != -1) throw new Error("error logging in ");
                        
                        //get urls for later use
                        mainObject.m_szLocationURI = httpChannel.URI.prePath ;
                        mainObject.m_YahooLog.Write("nsYahoo.js - loginOnloadHandler - m_szLocationURI : "+mainObject.m_szLocationURI );
                        
                        try
                        {
                            var aMailBoxURI =szResponse.match(patternYahooInbox);
                            mainObject.m_szMailboxURI = aMailBoxURI[1];
                            mainObject.m_YahooLog.Write("nsYahoo.js - loginOnloadHandler - m_szMaiboxURI : "+mainObject.m_szMailboxURI );
                        }
                        catch(e)
                        {
                            mainObject.m_YahooLog.Write("nsYahoo.js - loginOnloadHandler - m_szMaiboxURI frames found: ");
                            var aMailBoxURI = szResponse.match(patternYahooInboxFrame);
                            mainObject.m_szMailboxURI = aMailBoxURI[1];
                            mainObject.m_YahooLog.Write("nsYahoo.js - loginOnloadHandler - m_szMaiboxURI : "+mainObject.m_szMailboxURI );
                        }
                                         
                        //server response
                        mainObject.serverComms("+OK Your in\r\n");
                        mainObject.m_bAuthorised = true;
                    break;
                };
            }
           
            mainObject.m_YahooLog.Write("nsYahoo.js - loginOnloadHandler - END");
        }
        catch(err)
        {
            mainObject.m_YahooLog.DebugDump("nsYahoo.js: loginHandler : Exception : " 
                                          + err.name 
                                          + ".\nError message: " 
                                          + err.message);
                                              
            mainObject.serverComms("-ERR negative vibes\r\n");
        }
    },
    
        
 
    
    //stat 
    //total size is in octets
    getNumMessages : function()
    {
        try
        {
            this.m_YahooLog.Write("nsYahoo.js - getNumMessages - START"); 
           
            if (this.m_szMailboxURI == null) return false;
            var szMailboxURI = this.m_szLocationURI + this.m_szMailboxURI; 
            this.m_YahooLog.Write("nsYahoo.js - getNumMessages - mail box url " + szMailboxURI); 
            
            var ios=Components.classes["@mozilla.org/network/io-service;1"].
                                    getService(Components.interfaces.nsIIOService);
                                    
            //set cookies
            var szURL = ios.newURI(szMailboxURI,null,null).prePath;
            var aszHost = szURL.match(/[^\.\/]+\.[^\.\/]+$/); 
            var aszCookie = this.m_oCookies.findCookie(aszHost);
            this.m_YahooLog.Write("nsYahoo.js - getNumMessages - cookies - "+ aszCookie);
             
            var bResult = this.httpConnection(szMailboxURI, 
                                              "GET", 
                                              null,
                                              aszCookie, 
                                              this.mailBoxOnloadHandler);  
                                              
            if (!bResult) throw new Error("httpConnection returned false");
            
            this.m_YahooLog.Write("nsYAhoo.js - getNumMessages - END"); 
            return true;
        }
        catch(e)
        {
            this.m_YahooLog.DebugDump("nsYahoo.js: getNumMessages : Exception : " 
                                          + e.name 
                                          + ".\nError message: " 
                                          + e.message);
            return false;
        }
    },
    
    
    
    
    mailBoxOnloadHandler : function (szResponse ,event , mainObject)
    {
        try
        {
            mainObject.m_YahooLog.Write("nsYahoo.js - mailBoxOnloadHandler - START"); 
            
            mainObject.m_YahooLog.Write("nsYahoo.js - mailBoxOnloadHandler : " 
                                         + mainObject.m_iStage + "\n"
                                         + szResponse);  
            
            var httpChannel = event.QueryInterface(Components.interfaces.nsIHttpChannel);
                      
            //check status should be 200.
            mainObject.m_YahooLog.Write("nsYahoo.js - mailBoxOnloadHandler - Mailbox :" + httpChannel.responseStatus);
            if (httpChannel.responseStatus != 200 ) 
                throw new Error("error status " + httpChannel.responseStatus);   
            
            var szURL = httpChannel.URI.host;
            mainObject.m_YahooLog.Write("nsYahoo.js - mailBoxOnloadHandler - url - " + szURL);  
            var aszTempDomain = szURL.match(/[^\.\/]+\.[^\.\/]+$/);  
            mainObject.m_YahooLog.Write("nsYahoo.js - mailBoxOnloadHandler - domain - " + aszTempDomain[0]); 
           
            //get cookies
            try
            {
                var szCookies =  httpChannel.getResponseHeader("Set-Cookie");
                mainObject.m_YahooLog.Write("nsYahoo.js - mailBoxOnloadHandler - cookies \n" + szCookies);  
                mainObject.m_oCookies.addCookie( aszTempDomain[0], szCookies); 
            }
            catch(e)
            {
                mainObject.m_YahooLog.Write("nsYahoo.js - mailBoxOnloadHandler - no cookies found"); 
            } 
            
        
            if (!mainObject.m_szBulkFolderURI)
            {
                mainObject.m_szBulkFolderURI = szResponse.match(patternYahooBulkFrame)[1];
                mainObject.m_YahooLog.Write("nsYahoo.js - mailBoxOnloadHandler - bulk URL :" + mainObject.m_szBulkFolderURI);
            }
                
        
            //get data for deleting
            if (!mainObject.m_szData)
            {
                var aszDeleteForm = szResponse.match(PatternYahooDeleteForm);
                mainObject.m_YahooLog.Write("nsYahoo.js - mailBoxOnloadHandler - delete form :" + aszDeleteForm);
               
                mainObject.m_szDeleteURL = aszDeleteForm[0].match(PatternYahooDeleteURL)[1];
                mainObject.m_YahooLog.Write("nsYahoo.js - mailBoxOnloadHandler - delete URL :" + mainObject.m_szDeleteURL);
                
                var aszDeleteInput = aszDeleteForm[0].match(PatternYahooDeleteInput);
                mainObject.m_YahooLog.Write("nsYahoo.js - mailBoxOnloadHandler - delete Input :" + aszDeleteInput);
                
                var szData = null;
                for (i=0 ; i < aszDeleteInput.length ; i++)
                {
                     var aszInput = aszDeleteInput[i].match(PatternYahooDeleteNameValue);
                     if (!aszInput) aszInput = aszDeleteInput[i].match(PatternYahooDeleteNameValue2);
                     mainObject.m_YahooLog.Write("nsYahoo.js - mailBoxOnloadHandler - delete Input data :" + aszInput);
                     
                     if (aszInput)
                     {
                        if (!szData) 
                           szData = aszInput[1] + "=";
                        else
                            szData += aszInput[1] + "=";
                            
                        if (aszInput[1] == "DEL")
                            szData += 1; 
                        else
                            szData += escape(aszInput[2]); //encodeURIComponent
                            
                        szData+= "&";   
                        mainObject.m_YahooLog.Write("nsYahoo.js - mailBoxOnloadHandler - delete output data :" + szData);
                     }
                }
                mainObject.m_szData = szData;
                mainObject.m_YahooLog.Write("nsYahoo.js - mailBoxOnloadHandler - delete data :" + mainObject.m_szData);
            }
            
            
        
        
            //get messgae table
            var aMsgTable = szResponse.match(patternYahooMSGIdTable);
            mainObject.m_YahooLog.Write("nsYahoo.js - mailBoxOnloadHandler - msgtable :" + aMsgTable);
            
            if (aMsgTable)
            {
                var aMsgRows = aMsgTable[0].match(patternYahooMsgRow);
                mainObject.m_YahooLog.Write("nsYahoo.js - mailBoxOnloadHandler - msgRows :" + aMsgRows);
                
                //get number of msg on page
                var iNum = aMsgRows.length -1; // first row is headers
                mainObject.m_YahooLog.Write("nsYahoo.js - mailBoxOnloadHandler - msgRows Num :" + iNum);
                
                //process page
                if (iNum > 0)
                {
                    for (i= 1 ; i< iNum+1 ; i++)
                    {
                        //get msg id
                        var szMsgID = aMsgRows[i].match(patternYahooMsgID)[1];
                        mainObject.m_YahooLog.Write("nsYahoo.js - mailBoxOnloadHandler - msg id :" + i + " " +szMsgID);
                        //add delete data
                        szMsgID += "\r\n"
                        szMsgID +=mainObject.m_szData;
                        szMsgID += "\r\n"
                        szMsgID +=mainObject.m_szDeleteURL;
                        mainObject.m_YahooLog.Write("nsYahoo.js - mailBoxOnloadHandler - msg id+ crumb :" + i + " " +szMsgID);
                        
                        //get msg size
                        var aMsgSize = aMsgRows[i].match(patternYahooMsgSize);
                        var szMsgSize = aMsgSize[aMsgSize.length-1]; //size is last element
                        var szSize = szMsgSize.match(/<td.*?>(.*?)<\/td/)[1];
                        var iSize = parseInt(szSize);
                        if (szSize.indexOf('k')!= -1) iSize*=1000;
                        mainObject.m_YahooLog.Write("nsYahoo.js - mailBoxOnloadHandler - msg size :" + i + " " +iSize);
                        mainObject.m_iTotalSize += iSize;
                        mainObject.m_aszMsgIDStore.push(szMsgID);
                        mainObject.m_aiMsgSize.push(iSize);    
                    }
                }
                
                //check for more pages
                var aszNextPage = szResponse.match(patternYahooNextPage);
                mainObject.m_YahooLog.Write("nsYahoo.js - mailBoxOnloadHandler - msg next page :" +aszNextPage);
                if (aszNextPage)
                { 
                    var szNewPage = aszNextPage[0].split("|");
                    mainObject.m_YahooLog.Write("nsYahoo.js - mailBoxOnloadHandler - msg next page :" +szNewPage + " " + szNewPage.length);
        
                    var szMailboxURI = mainObject.m_szLocationURI + szNewPage[szNewPage.length-1].match(/<a href="(.*?)">/)[1];
                   
                    mainObject.m_YahooLog.Write("nsYahoo.js - getNumMessages - mail box url " + szMailboxURI); 
                    
                    var ios=Components.classes["@mozilla.org/network/io-service;1"].
                                            getService(Components.interfaces.nsIIOService);
                                            
                    //set cookies
                    var szURL = ios.newURI(szMailboxURI,null,null).prePath;
                    var aszHost = szURL.match(/[^\.\/]+\.[^\.\/]+$/); 
                    var aszCookie = mainObject.m_oCookies.findCookie(aszHost);
                    mainObject.m_YahooLog.Write("nsYahoo.js - getNumMessages - cookies - "+ aszCookie);
        
                    //load next page
                    var bResult = mainObject.httpConnection(szMailboxURI, 
                                                              "GET", 
                                                              null,
                                                              aszCookie, 
                                                              mainObject.mailBoxOnloadHandler);  
                                          
                    if (!bResult) throw new Error("httpConnection returned false");
                }
                else if ( mainObject.m_bUseJunkMail && mainObject.m_szBulkFolderURI && !mainObject.m_bJunkChecked)
                {
                    mainObject.m_YahooLog.Write("nsYahoo.js - MailBoxOnload - load junkmail");
                    
                    var szMailboxURI = mainObject.m_szLocationURI + mainObject.m_szBulkFolderURI; 
                    mainObject.m_YahooLog.Write("nsYahoo.js - getNumMessages - mail box url " + szMailboxURI); 
            
                    var ios=Components.classes["@mozilla.org/network/io-service;1"].
                                                getService(Components.interfaces.nsIIOService);
                                    
                    //set cookies
                    var szURL = ios.newURI(szMailboxURI,null,null).prePath;
                    var aszHost = szURL.match(/[^\.\/]+\.[^\.\/]+$/); 
                    var bResult = mainObject.httpConnection(szMailboxURI, 
                                                      "GET", 
                                                      null,
                                                      mainObject.m_oCookies.findCookie(aszHost), 
                                                      mainObject.mailBoxOnloadHandler);  
                                                      
                    if (!bResult) throw new Error("httpConnection returned false");
                    mainObject.m_szData = null; 
                    mainObject.m_bJunkChecked = true;
                }
                else
                {
                    //no more pages report back to mozilla
                    mainObject.serverComms("+OK "+ mainObject.m_aiMsgSize.length + " " + mainObject.m_iTotalSize + "\r\n");
                }
            }
            else if ( mainObject.m_bUseJunkMail && mainObject.m_szBulkFolderURI && !mainObject.m_bJunkChecked)
            {
                mainObject.m_YahooLog.Write("nsYahoo.js - MailBoxOnload - load junkmail");
                
                var szMailboxURI = mainObject.m_szLocationURI + mainObject.m_szBulkFolderURI; 
                mainObject.m_YahooLog.Write("nsYahoo.js - getNumMessages - mail box url " + szMailboxURI); 
        
                var ios=Components.classes["@mozilla.org/network/io-service;1"].
                                            getService(Components.interfaces.nsIIOService);
                                
                //set cookies
                var szURL = ios.newURI(szMailboxURI,null,null).prePath;
                var aszHost = szURL.match(/[^\.\/]+\.[^\.\/]+$/); 
                var bResult = mainObject.httpConnection(szMailboxURI, 
                                                  "GET", 
                                                  null,
                                                  mainObject.m_oCookies.findCookie(aszHost), 
                                                  mainObject.mailBoxOnloadHandler);  
                                                  
                if (!bResult) throw new Error("httpConnection returned false");
                mainObject.m_szData = null; 
                mainObject.m_bJunkChecked = true;
            }
            else
            {   //no emails
                mainObject.serverComms("+OK "+ mainObject.m_aiMsgSize.length + " " + mainObject.m_iTotalSize + "\r\n");
            }
      
            mainObject.m_YahooLog.Write("nsYahoo.js - MailBoxOnload - END"); 
        }
        catch(err)
        {
             mainObject.m_YahooLog.DebugDump("nsYahoo.js: MailboxOnload : Exception : " 
                                              + err.name 
                                              + ".\nError message: " 
                                              + err.message);
            
             mainObject.serverComms("-ERR negative vibes\r\n");
        }   
    },
 
    
    
   

                     
    //list
    //i'm not downloading the mailbox again. 
    //I hope stat been called first or there's going to be trouble
    getMessageSizes : function() 
    {
        try
        {
            this.m_YahooLog.Write("nsYahoo.js - getMessageSizes - START"); 
            
            var iTempNum = 0;
            var aTempSize = new Array();
            
            for (i = 0; i <  this.m_aiMsgSize.length; i++)
            {
                var iEmailSize = this.m_aiMsgSize[i];
                this.m_YahooLog.Write("nsYahoo.js - getMessageSizes - Email Size : " +iEmailSize);
        
                aTempSize.push(iEmailSize);
                iTempNum++; 
            }         
    
            this.m_YahooLog.Write("nsYahoo.js - getMessagesSizes - : " 
                                                            + aTempSize + " " 
                                                            + iTempNum); 
            
            var szPOPResponse = "+OK " + iTempNum + " Messages\r\n"; 
            for (i =0 ; i<iTempNum; i++)
            {
                szPOPResponse+=(i+1) + " " + aTempSize[i] + "\r\n";                        
            }
            szPOPResponse += ".\r\n";
            
            this.serverComms(szPOPResponse);
            this.m_YahooLog.Write("nsYahoo.js - getMessageSizes - END"); 
            return true;
        }
        catch(e)
        {
            this.m_YahooLog.DebugDump("nsYahoo.js: getMessageSizes : Exception : " 
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
            this.m_YahooLog.Write("nsYahoo.js - getMessageIDs - START"); 
    
            var iTempNum = 0;
            var aTempIDs = new Array();
            
            for (i = 0; i <  this.m_aszMsgIDStore.length; i++)
            {
                var szEmailURL = this.m_aszMsgIDStore[i];
                this.m_YahooLog.Write("nsYahoo.js - getMessageIDs - Email URL : " +szEmailURL);
               
                var szEmailID = szEmailURL.match(PatternYahooID)[1];
                                    
                this.m_YahooLog.Write("nsYahoo.js - getMessageIDs - IDS : " +szEmailID);    
                aTempIDs.push(szEmailID);
                iTempNum++; 
            }         
     
            this.m_YahooLog.Write("nsYahoo.js - getMessageIDs - return : " 
                                                + aTempIDs + " "
                                                + iTempNum); 
                                                
            var szPOPResponse = "+OK " + iTempNum + " Messages\r\n";
            for (i =0 ; i<iTempNum; i++)
            {
                szPOPResponse+=(i+1) + " " + aTempIDs[i] + "\r\n";                        
            }
            szPOPResponse += ".\r\n";
            this.serverComms(szPOPResponse);           
          
            this.m_YahooLog.Write("nsYahoo.js - getMessageIDs - END"); 
            return true;
        }
        catch(e)
        {
            this.m_YahooLog.DebugDump("nsYahoo.js: getMessageIDs : Exception : " 
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
            this.m_YahooLog.Write("nsYahoo.js - getMessage - START"); 
            this.m_YahooLog.Write("nsYahoo.js - getMessage - msg num" + lID); 
                     
            //get msg id
            this.m_szMsgID = this.m_aszMsgIDStore[lID-1].split("\r\n")[0];
            this.m_YahooLog.Write("nsYahoo.js - getMessage - msg id" + this.m_szMsgID); 
            
            try
            {
                this.m_szBox= this.m_szMsgID.match(PatternYahooBox)[1];
            }
            catch(err)
            {
                this.m_szBox= this.m_szMsgID.match(PatternYahooBoxAlt)[1];
            }
            this.m_YahooLog.Write("nsYahoo.js - getMessage - msg box" + this.m_szBox); 
             
            var ios=Components.classes["@mozilla.org/network/io-service;1"].
                                    getService(Components.interfaces.nsIIOService);
           
            //get headers
            var szDest = this.m_szLocationURI + this.m_szMsgID.match(/.*?&/) + this.m_szBox +"&bodyPart=HEADER";
            this.m_YahooLog.Write("nsYahoo.js - getNumMessages - url - "+ szDest);                       
           
            //set cookies
            var szURL = ios.newURI(szDest,null,null).prePath;
            var aszHost = szURL.match(/[^\.\/]+\.[^\.\/]+$/); 
            var aszCookie = this.m_oCookies.findCookie(aszHost);
            this.m_YahooLog.Write("nsYahoo.js - getNumMessages - cookies - "+ aszCookie);
             
            this.m_iStage = 0;   
            //get msg from yahoo
            var bResult = this.httpConnection(szDest, 
                                                "GET", 
                                                null,
                                                aszCookie, 
                                                this.emailOnloadHandler);  
                                           
            if (!bResult) throw new Error("httpConnection returned false"); 
             
            this.m_YahooLog.Write("m_YahooLog.js - getMessage - END"); 
            return true;
        }
        catch(e)
        {
             this.m_YahooLog.DebugDump("m_YahooLog.js: getMessage : Exception : " 
                                          + e.name + 
                                          ".\nError message: " 
                                          + e.message);
            return false;
        }
    },    
    
    
    emailOnloadHandler : function (szResponse ,event , mainObject)
    {
        try
        {
            mainObject.m_YahooLog.Write("m_YahooLog.js - emailOnloadHandler - START");
            
            mainObject.m_YahooLog.Write("m_YahooLog.js - emailOnloadHandler - msg :\n" + szResponse); 
           
            var httpChannel = event.QueryInterface(Components.interfaces.nsIHttpChannel);
                      
            //check status should be 200.
            mainObject.m_YahooLog.Write("m_YahooLog.js - emailOnloadHandler - msg :" + httpChannel.responseStatus);
            if (httpChannel.responseStatus != 200) 
                throw new Error("error status " + httpChannel.responseStatus);   
            
            switch(mainObject.m_iStage)
            {
                case 0:  ///header
                    mainObject.m_szHeader = szResponse;
                    mainObject.m_iStage++;
                    
                    //get body
                    var ios=Components.classes["@mozilla.org/network/io-service;1"].
                                    getService(Components.interfaces.nsIIOService);
                    
                   
                    var szDest = mainObject.m_szLocationURI + mainObject.m_szMsgID.match(/.*?&/) + mainObject.m_szBox + "&bodyPart=TEXT";
                    mainObject.m_YahooLog.Write("nsYahoo.js - emailOnloadHandler - url - "+ szDest);                       
                   
                    //set cookies
                    var szURL = ios.newURI(szDest,null,null).prePath;
                    var aszHost = szURL.match(/[^\.\/]+\.[^\.\/]+$/); 
                    var aszCookie = mainObject.m_oCookies.findCookie(aszHost);
                    mainObject.m_YahooLog.Write("nsYahoo.js - emailOnloadHandler - cookies - "+ aszCookie);
                     
                    //get msg from yahoo
                    var bResult = mainObject.httpConnection(szDest, 
                                                             "GET", 
                                                             null,
                                                             aszCookie, 
                                                             mainObject.emailOnloadHandler);  
                                                   
                    if (!bResult) throw new Error("httpConnection returned false"); 
                break;
                
                case 1: //body
                    var szMsg =  mainObject.m_szHeader;
                    szMsg += szResponse;
                    szMsg = szMsg.replace(/^\./mg,"..");    //bit padding 
                    if (szMsg.lastIndexOf("\r\n") == -1) szMsg += "\r\n";
                    szMsg += ".\r\n";  //msg end 
                                                                                                                      
                    var szPOPResponse = "+OK " + szMsg.length + "\r\n";                     
                    szPOPResponse += szMsg;
                                                 
                    mainObject.serverComms(szPOPResponse);           
                   
                break;
            }
          
            mainObject.m_YahooLog.Write("m_YahooLog.js - emailOnloadHandler - END");      
        }
        catch(err)
        {
            mainObject.m_YahooLog.DebugDump("m_YahooLog.js: emailOnloadHandler : Exception : " 
                                          + err.name 
                                          + ".\nError message: " 
                                          + err.message);
            
            mainObject.serverComms("-ERR negative vibes\r\n");
        }
    },
    


             
    //dele
    deleteMessage : function(lID)
    {
        try
        {
            this.m_YahooLog.Write("nsYahoo.js - deleteMessage - START");  
            this.m_YahooLog.Write("nsYahoo.js - deleteMessage - id " + lID ); 
                  
            //create URL
            var aszTempID = this.m_aszMsgIDStore[lID-1].split("\r\n");
            this.m_YahooLog.Write("nsYahoo.js - deleteMessage - id " + aszTempID );
            
            var szPath = this.m_szLocationURI + aszTempID[2] ;
            this.m_YahooLog.Write("nsYahoo.js - deleteMessage - url - "+ szPath);                       
              
            var ios=Components.classes["@mozilla.org/network/io-service;1"].
                                    getService(Components.interfaces.nsIIOService);
                                   
            //set cookies
            var szURL = ios.newURI(szPath,null,null).prePath;
            var aszHost = szURL.match(/[^\.\/]+\.[^\.\/]+$/); 
            var aszCookie = this.m_oCookies.findCookie(aszHost);
                      
            this.m_YahooLog.Write("nsYahoo.js - deleteMessage - data - "+ aszTempID[1]);
            var szData = aszTempID[1] + "Mid=" + aszTempID[0].match(PatternYahooID)[1];
            this.m_YahooLog.Write("nsYahoo.js - deleteMessage - data - "+ szData);
            
            //send request
            var bResult = this.httpConnection(szPath, 
                                              "POST", 
                                              szData,
                                              aszCookie, 
                                              this.deleteMessageOnloadHandler);  
                                           
            if (!bResult) throw new Error("httpConnection returned false");            
            
            this.m_YahooLog.Write("nsYahoo.js - deleteMessage - END");     
            return true;
        }
        catch(e)
        {
            this.m_YahooLog.DebugDump("nsYahoo.js: deleteMessage : Exception : " 
                                          + e.name + 
                                          ".\nError message: " 
                                          + e.message);
            return false;
        } 
    },

    
    deleteMessageOnloadHandler : function (szResponse ,event , mainObject)
    {
        try
        {
            mainObject.m_YahooLog.Write("nsYahoo.js - deleteMessageOnload - START");    
            mainObject.m_YahooLog.Write("nsYahoo.js - deleteMessageOnload :\n" + szResponse); 
           
            var httpChannel = event.QueryInterface(Components.interfaces.nsIHttpChannel);
            
            //check status should be 200.
            mainObject.m_YahooLog.Write("nsYahoo.js - deleteMessageOnload :" + httpChannel.responseStatus);
            if (httpChannel.responseStatus != 200 ) 
                throw new Error("error status " + httpChannel.responseStatus);   
                 
            mainObject.serverComms("+OK its history\r\n");      
            mainObject.m_YahooLog.Write("nsYahoo.js - deleteMessageOnload - END");      
        }
        catch(e)
        {
            mainObject.m_YahooLog.DebugDump("nsYahoo.js: deleteMessageOnload : Exception : " 
                                              + e.name 
                                              + ".\nError message: " 
                                              + e.message);
            mainObject.serverComms("-ERR negative vibes\r\n");
        }
    },
    


    //cookies are deleted when the connection ends so i dont need to download pages
    logOut : function()
    {
        try
        {
            this.m_YahooLog.Write("nsYahoo.js - logOUT - START"); 
            
            this.m_bAuthorised = false;
            this.serverComms("+OK Your Out\r\n");             
                                           
            this.m_YahooLog.Write("nsYahoo.js - logOUT - END");  
            return true;
        }
        catch(e)
        {
            this.m_YahooLog.DebugDump("nsYahoo.js: logOUT : Exception : " 
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
var nsYahooFactory = new Object();

nsYahooFactory.createInstance = function (outer, iid)
{
    if (outer != null) throw Components.results.NS_ERROR_NO_AGGREGATION;
    
    if (!iid.equals(nsYahooClassID) && !iid.equals(Components.interfaces.nsISupports))
        throw Components.results.NS_ERROR_INVALID_ARG;
    
    return new nsYahoo();
}


/******************************************************************************/
/* MODULE */
var nsYahooModule = new Object();

nsYahooModule.registerSelf = function(compMgr, fileSpec, location, type)
{
    compMgr = compMgr.QueryInterface(Components.interfaces.nsIComponentRegistrar);
    compMgr.registerFactoryLocation(nsYahooClassID,
                                    "YahooComponent",
                                    nsYahooContactID, 
                                    fileSpec,
                                    location, 
                                    type);
}


nsYahooModule.unregisterSelf = function(aCompMgr, aFileSpec, aLocation)
{
    aCompMgr = aCompMgr.QueryInterface(Components.interfaces.nsIComponentRegistrar);
    aCompMgr.unregisterFactoryLocation(nsYahooClassID, aFileSpec);
}

 
nsYahooModule.getClassObject = function(compMgr, cid, iid)
{
    if (!cid.equals(nsYahooClassID))
        throw Components.results.NS_ERROR_NO_INTERFACE;

    if (!iid.equals(Components.interfaces.nsIFactory))
        throw Components.results.NS_ERROR_NOT_IMPLEMENTED;

    return nsYahooFactory;
}


nsYahooModule.canUnload = function(compMgr)
{
    return true;
}
/******************************************************************************/


function NSGetModule(compMgr, fileSpec)
{
    return nsYahooModule; 
}
