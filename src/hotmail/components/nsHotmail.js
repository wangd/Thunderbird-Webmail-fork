/*****************************  Globals   *************************************/                 
const nsHotmailClassID = Components.ID("{3f3822e0-6374-11d9-9669-0800200c9a66}"); 
const nsHotmailContactID = "@mozilla.org/Hotmail;1";
const ExtHotmailGuid = "{a6a33690-2c6a-11d9-9669-0800200c9a66}";

const patternHotmailBounce = /<form.*action="(.*?)".*?>.*<input.*name="mspprawqs".*?value="(.*?)".*?>.*<input.*?name="mspppostint".*?value="(.*?)".*?>/;
const patternHotmailLogIn = /<form.*? name="form1".*?action="(.*?)".*?>/;
const patternHotmailRefresh =/<META.*?HTTP-EQUIV="REFRESH".*?URL=(.*?)".*?>/;
const patternHotmailLogout = /<td><a.*?href="(.*?\/cgi-bin\/logout\?curmbox=.*?").*?>/m;
const PatternHotmailMailbox = /<a href="(\/cgi-bin\/HoTMaiL.*?)".*?tabindex=121/;
const PatternHotmailLogOutBounce = /<form.*?action="(.*?)".*?>.*?<input.*?name="(.*?)".*?value="(.*?)">/;
const PatternHotmailLogOutExpire = /<img.*?name="ID0".*?src="(.*?)".*>/;
const PatternHotmailLogOutReSet = /<img.*?name="ID1".*?src="(.*?)".*>/;
const PatternHotmailMsgTable = /MsgTable.*?>(.*?)<\/table>/m;
const PatternHotmail_UM = /_UM="(.*?)"/;
const PatternHotmailMultPageNum = /<select name="MultPageNum" onChange="window\.location\.href='(.*?)'\+_UM\+'(.*?)'.*?>(.*?)<\/select>/;
const PatternHotmailPages = /<option value="(.*?)".*?>/g;
const PatternHotmailEmailURL = /<a.*?href="javascript:G\('(.*?)'\)">/; 
const PatternHotmailEmailLength = /.*?&len=(.*?)&/;
const PatternHotmailEmailRead = /.*?&msgread=1&/;
const PatternHotmailEmailID = /.*?msg=(.*?)&/;


/***********************  Hotmail ********************************/




function nsHotmail()
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
        
        var  szLogFileName = "Hotmail Log - " + date.getHours()+ "-" + date.getMinutes() + "-"+ date.getUTCMilliseconds() +" -";
        this.m_HotmailLog = new DebugLog("webmail.logging.comms", ExtHotmailGuid, szLogFileName); 
        
        this.m_HotmailLog.Write("nsHotmail.js - Constructor - START");   
       
        this.m_szUserName = null;   
        this.m_szPassWord = null; 
        this.m_oResponseStream = null;       
        this.m_szMailboxURI = null;
        this.m_szLogOutURI = null;
        this.m_szLocationURI = null;
        this.m_bAuthorised = false;
        this.m_aszMsgIDStore = new Array();
        this.m_aszPageURLS = new Array();
        this.m_iPagesURLS = 0;
        this.m_iTotalSize = 0;
        this.m_iNum = 0;  
        this.m_szUM = null;
        this.m_oCookies = new CookieHandler(this.m_HotmailLog );    
        this.m_iStage = 0;                                    
        this.m_HotmailLog.Write("nsHotmail.js - Constructor - END");  
    }
    catch(e)
    {
        DebugDump("nsHotmail.js: Constructor : Exception : " 
                                      + e.name 
                                      + ".\nError message: " 
                                      + e.message);
    }
}



nsHotmail.prototype =
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
            this.m_HotmailLog.Write("nsHotmail.js - serverComms - START");
            this.m_HotmailLog.Write("nsHotmail.js - serverComms msg " + szMsg);
            var iCount = this.m_oResponseStream.write(szMsg,szMsg.length);
            this.m_HotmailLog.Write("nsHotmail.js - serverComms sent count: " + iCount 
                                                        +" msg length: " +szMsg.length);
            this.m_HotmailLog.Write("nsHotmail.js - serverComms - END");  
        }
        catch(e)
        {
            this.m_HotmailLog.DebugDump("nsHotmail.js: serverComms : Exception : " 
                                              + e.name 
                                              + ".\nError message: " 
                                              + e.message);
        }
    },
   
      
    httpConnection : function (szURL, szType, szData, szCookies ,callBack)
    {
        try
        {
            this.m_HotmailLog.Write("nsHotmail.js - httpConnection - START");   
            this.m_HotmailLog.Write("nsHotmail.js - httpConnection - " + szURL + "\n"
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
                this.m_HotmailLog.Write("nsHotmail.js - httpConnection - adding cookie \n" + szCookies); 
                HttpRequest.setRequestHeader("x-CookieHack", "Hacker\r\nCookie: "  + szCookies , false);
            }
           
            
            //set data
            if (szData)
            {
                this.m_HotmailLog.Write("nsHotmail.js - httpConnection - adding data");
                
                var uploadStream = Components.classes["@mozilla.org/io/string-input-stream;1"]
                                    .createInstance(Components.interfaces.nsIStringInputStream);         
                uploadStream.setData(szData, szData.length);
        
                var uploadChannel = channel.QueryInterface(Components.interfaces.nsIUploadChannel);
                uploadChannel.setUploadStream(uploadStream, "application/x-www-form-urlencoded", -1); 
            }
            HttpRequest.requestMethod = szType;
            
            var listener = new this.downloadListener(callBack, this);
            channel.asyncOpen(listener, null);  
            
            this.m_HotmailLog.Write("nsHotmail.js - httpConnection - END"); 
            
            return true;  
        }
        catch(e)
        {
            this.m_HotmailLog.DebugDump("nsHotmail.js: httpConnection : Exception : " 
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
            this.m_HotmailLog.Write("nsHotmail.js - logIN - START");   
            this.m_HotmailLog.Write("nsHotmail.js - logIN - Username: " + this.m_szUserName 
                                                   + " Password: " + szPassword 
                                                   + " stream: " + this.m_oResponseStream);
            
            if (!this.m_szUserName || !this.m_oResponseStream ) return false;
            
            this.m_szPassWord = szPassword;
            
            //get hotmail.com webpage
            var bResult = this.httpConnection("http://www.hotmail.com", 
                                              "GET", 
                                              null,
                                              null, 
                                              this.loginOnloadHandler);
                                                
            if (!bResult) throw new Error("httpConnection returned false");
            
            this.m_HotmailLog.Write("nsHotmail.js - logIN - END");    
            return true;
        }
        catch(e)
        {
            this.m_HotmailLog.DebugDump("nsHotmail.js: logIN : Exception : " 
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
            mainObject.m_HotmailLog.Write("nsHotmail.js - loginOnloadHandler - START"); 
            
            mainObject.m_HotmailLog.Write("nsHotmail.js - loginOnloadHandler : " 
                                         + mainObject.m_iStage + "\n"
                                         + szResponse);  
            
            var httpChannel = event.QueryInterface(Components.interfaces.nsIHttpChannel);
            
            //if this fails we've gone somewhere new
            mainObject.m_HotmailLog.Write("nsHotmail.js - loginOnloadHandler - status :" +httpChannel.responseStatus );
            if (httpChannel.responseStatus != 200 && httpChannel.responseStatus != 302) 
                throw new Error("return status " + httpChannel.responseStatus);
            
            var szURL = httpChannel.URI.host;
            mainObject.m_HotmailLog.Write("nsHotmail.js - loginOnloadHandler - url - " + szURL);  
            var aszTempDomain = szURL.match(/[^\.\/]+\.[^\.\/]+$/);  
            mainObject.m_HotmailLog.Write("nsHotmail.js - loginOnloadHandler - domain - " + aszTempDomain[0]); 
            
            //get cookies
            try
            {
                var szCookies =  httpChannel.getResponseHeader("Set-Cookie");
                mainObject.m_HotmailLog.Write("nsHotmail.js - loginOnloadHandler - cookies \n" + szCookies);  
                mainObject.m_oCookies.addCookie( aszTempDomain[0], szCookies); 
            }
            catch(e)
            {
                mainObject.m_HotmailLog.Write("nsHotmail.js - loginOnloadHandler - no cookies found"); 
            } 
            
            var ios=Components.classes["@mozilla.org/network/io-service;1"].
                                    getService(Components.interfaces.nsIIOService);


            //page code                                
            switch (mainObject.m_iStage)
            {
                case 0: // hotmail redirect 
                    
                    try
                    {
                        var szLocation =  httpChannel.getResponseHeader("Location");
                        mainObject.m_HotmailLog.Write("nsHotmail.js - loginOnloadHandler - location \n" + szLocation);  
                    }
                    catch(e)
                    {
                        throw new Error("Location header not found")
                    } 
              
                    var bResult = mainObject.httpConnection(szLocation, 
                                                    "GET", 
                                                    null, 
                                                    null,
                                                    mainObject.loginOnloadHandler);
                                                
                    if (!bResult) throw new Error("httpConnection returned false");
                    mainObject.m_iStage++;
                break;
                
                case 1: // redirect destination
                    var aBounceData = szResponse.match(patternHotmailBounce);
                    if (aBounceData == null) 
                        throw new Error("error parsing bounce web page");
                    mainObject.m_HotmailLog.Write("nsHotmail.js - loginOnloadHandler "+ aBounceData);
                    
                    //set cookies
                    var szURL = ios.newURI(aBounceData[1],null,null).prePath;
                    var aszHost = szURL.match(/[^\.\/]+\.[^\.\/]+$/);  
                    var aszCookie = mainObject.m_oCookies.findCookie(aszHost);
                    mainObject.m_HotmailLog.Write("nsHotmail.js - loginOnloadHandler - cookies - "+ aszCookie);
                    
                    //login page  
                    var szData = "mspprawqs="+aBounceData[2]+"&mspppostint="+aBounceData[3];
                    var bResult = mainObject.httpConnection(aBounceData[1], 
                                                   "POST", 
                                                   szData, 
                                                   aszCookie,
                                                   mainObject.loginOnloadHandler);
                                                
                    if (!bResult) throw new Error("httpConnection returned false");
                    mainObject.m_iStage++;
                break;
               
               
                case 2: //login
                    var aLogInURL = szResponse.match(patternHotmailLogIn);
                    if (aLogInURL == null ) throw new Error("error parsing login page");  
                    
                   
                    var szData = "notinframe=1&login="+encodeURIComponent(mainObject.m_szUserName)
                                           +"&passwd="+encodeURIComponent(mainObject.m_szPassWord)
                                           +"&submit1=+Sign+In+"; 
                                                                    
                    //set cookies
                    var szURL = ios.newURI(aLogInURL[1],null,null).prePath;
                    var aszHost = szURL.match(/[^\.\/]+\.[^\.\/]+$/); 
                    var aszCookie = mainObject.m_oCookies.findCookie(aszHost);
                    mainObject.m_HotmailLog.Write("nsHotmail.js - loginOnloadHandler - cookies - "+ aszCookie);
                     
                    var bResult = mainObject.httpConnection(aLogInURL[1], 
                                                            "POST", 
                                                            szData, 
                                                            aszCookie,
                                                            mainObject.loginOnloadHandler);
                                                      
                    if (!bResult) throw new Error("httpConnection returned false");
                    mainObject.m_iStage++;
                break;
               
                case 3: //login redirect
                    try
                    {
                        var szLocation =  httpChannel.getResponseHeader("Location");
                        mainObject.m_HotmailLog.Write("nsHotmail.js - loginOnloadHandler - location \n" + szLocation);  
                    }
                    catch(e)
                    {
                        throw new Error("Location header not found")
                    } 
              
                    //set cookies
                    var szURL = ios.newURI(szLocation,null,null).prePath;
                    var aszHost = szURL.match(/[^\.\/]+\.[^\.\/]+$/); 
                    var aszCookie = mainObject.m_oCookies.findCookie(aszHost);
                    mainObject.m_HotmailLog.Write("nsHotmail.js - loginOnloadHandler - cookies - "+ aszCookie);
                    
                    var bResult = mainObject.httpConnection(szLocation, 
                                                    "GET", 
                                                    null, 
                                                    aszCookie,
                                                    mainObject.loginOnloadHandler);
                                                
                    if (!bResult) throw new Error("httpConnection returned false");
                    mainObject.m_iStage++;
                break;
                 
                case 4: //refresh
                    var aRefresh = szResponse.match(patternHotmailRefresh);
                    mainObject.m_HotmailLog.Write("nsHotmail.js - loginOnloadHandler "+ aRefresh); 
                    if (aRefresh == null) throw new Error("error parsing login page");
                    
                    //set cookies
                    var szURL = ios.newURI(aRefresh[1],null,null).prePath;
                    var aszHost = szURL.match(/[^\.\/]+\.[^\.\/]+$/); 
                    var aszCookie = mainObject.m_oCookies.findCookie(aszHost);
                    mainObject.m_HotmailLog.Write("nsHotmail.js - loginOnloadHandler - cookies - "+ aszCookie);
                     
                    var bResult = mainObject.httpConnection(aRefresh[1], 
                                                      "GET", 
                                                      null, 
                                                      aszCookie,
                                                      mainObject.loginOnloadHandler);  
                                                      
                    if (!bResult) throw new Error("httpConnection returned false");
                    mainObject.m_iStage++;
                break;
                
                        
                case 5: //mailbox redirect
                    try
                    {
                        var szLocation =  httpChannel.getResponseHeader("Location");
                        mainObject.m_HotmailLog.Write("nsHotmail.js - loginOnloadHandler - location \n" + szLocation);  
                    }
                    catch(e)
                    {
                        throw new Error("Location header not found")
                    } 
              
                    //set cookies
                    var szURL = ios.newURI(szLocation,null,null).prePath;
                    var aszHost = szURL.match(/[^\.\/]+\.[^\.\/]+$/); 
                    var aszCookie = mainObject.m_oCookies.findCookie(aszHost);
                    mainObject.m_HotmailLog.Write("nsHotmail.js - loginOnloadHandler - cookies - "+ aszCookie);
                    
                    var bResult = mainObject.httpConnection(szLocation, 
                                                    "GET", 
                                                    null, 
                                                    aszCookie,
                                                    mainObject.loginOnloadHandler);
                                                
                    if (!bResult) throw new Error("httpConnection returned false");
                    mainObject.m_iStage++;
                break;
                
                case 6:
                    var szLocation = httpChannel.URI.spec;
                    var iIndex = szLocation.indexOf("uilogin.srt");
                    mainObject.m_HotmailLog.Write("nsHotmail.js - loginOnloadHandler - page check : " + szLocation 
                                                        + " index = " +  iIndex );
                    if (iIndex != -1) throw new Error("error logging in ");
                    
                    //get urls for later use
                    mainObject.m_szLocationURI = httpChannel.URI.prePath ;
                    mainObject.m_HotmailLog.Write("nsHotmail.js - loginOnloadHandler - m_szLocationURI : "+mainObject.m_szLocationURI );
                    var aMailBoxURI = szResponse.match(PatternHotmailMailbox);
                    mainObject.m_szMailboxURI = aMailBoxURI[1];
                    mainObject.m_HotmailLog.Write("nsHotmail.js - loginOnloadHandler - m_szMaiboxURI : "+mainObject.m_szMailboxURI );
                    var aLogOutURI = szResponse.match(patternHotmailLogout);
                    mainObject.m_szLogOutURI = aLogOutURI[1];
                    mainObject.m_HotmailLog.Write("nsHotmail.js - loginOnloadHandler - m_szLogOutURI : "+mainObject.m_szLogOutURI );
                    
                    //server response
                    mainObject.serverComms("+OK Your in\r\n");
                    mainObject.m_bAuthorised = true;
                break;
            };
            
            mainObject.m_HotmailLog.Write("nsHotmail.js - loginOnloadHandler - END");
        }
        catch(err)
        {
            mainObject.m_HotmailLog.DebugDump("nsHotmail.js: loginHandler : Exception : " 
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
            this.m_HotmailLog.Write("nsHotmail.js - getNumMessages - START"); 
            
            if (this.m_szMailboxURI == null) return false;
            var szMailboxURI = this.m_szLocationURI + this.m_szMailboxURI; 
            this.m_HotmailLog.Write("nsHotmail.js - getNumMessages - mail box url " + szMailboxURI); 
            
            var ios=Components.classes["@mozilla.org/network/io-service;1"].
                                    getService(Components.interfaces.nsIIOService);
                                    
            //set cookies
            var szURL = ios.newURI(szMailboxURI,null,null).prePath;
            var aszHost = szURL.match(/[^\.\/]+\.[^\.\/]+$/); 
            var aszCookie = this.m_oCookies.findCookie(aszHost);
            this.m_HotmailLog.Write("nsHotmail.js - getNumMessages - cookies - "+ aszCookie);
            
            this.m_iStage = 0;    
            var bResult = this.httpConnection(szMailboxURI, 
                                              "GET", 
                                              null,
                                              aszCookie, 
                                              this.mailBoxOnloadHandler);  
                                              
            if (!bResult) throw new Error("httpConnection returned false");
            
            this.m_HotmailLog.Write("nsHotmail.js - getNumMessages - END"); 
            return true;
        }
        catch(e)
        {
            this.m_HotmailLog.DebugDump("nsHotmail.js: getNumMessages : Exception : " 
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
            mainObject.m_HotmailLog.Write("nsHotmail.js - mailBoxOnloadHandler - START"); 
            
            mainObject.m_HotmailLog.Write("nsHotmail.js - mailBoxOnloadHandler : " 
                                         + mainObject.m_iStage + "\n"
                                         + szResponse);  
            
            var httpChannel = event.QueryInterface(Components.interfaces.nsIHttpChannel);
                      
            //check status should be 200.
            mainObject.m_HotmailLog.Write("nsHotmail.js - mailBoxOnloadHandler - Mailbox :" + httpChannel.responseStatus);
            if (httpChannel.responseStatus != 200 ) 
                throw new Error("error status " + httpChannel.responseStatus);   
            
            var szURL = httpChannel.URI.host;
            mainObject.m_HotmailLog.Write("nsHotmail.js - mailBoxOnloadHandler - url - " + szURL);  
            var aszTempDomain = szURL.match(/[^\.\/]+\.[^\.\/]+$/);  
            mainObject.m_HotmailLog.Write("nsHotmail.js - mailBoxOnloadHandler - domain - " + aszTempDomain[0]); 
            
            //get cookies
            try
            {
                var szCookies =  httpChannel.getResponseHeader("Set-Cookie");
                mainObject.m_HotmailLog.Write("nsHotmail.js - mailBoxOnloadHandler - cookies \n" + szCookies);  
                mainObject.m_oCookies.addCookie( aszTempDomain[0], szCookies); 
            }
            catch(e)
            {
                mainObject.m_HotmailLog.Write("nsHotmail.js - mailBoxOnloadHandler - no cookies found"); 
            } 
            
            
            //get UM
            if (!mainObject.m_szUM)
            {
                mainObject.m_szUM= szResponse.match(PatternHotmail_UM)[1];
                mainObject.m_HotmailLog.Write("nsHotmail.js - mailBoxOnloadHandler -msg pages UM : " +mainObject.m_szUM)
            }
                    
          
                     
            var ios=Components.classes["@mozilla.org/network/io-service;1"].
                                    getService(Components.interfaces.nsIIOService);
                                    
            switch(mainObject.m_iStage)
            {
                case 0: 
                    //get number of pages
                    var aPages = szResponse.match(PatternHotmailMultPageNum);
                    mainObject.m_HotmailLog.Write("nsHotmail.js - mailBoxOnloadHandler -msg pages : " +aPages);
            
                    if (aPages)
                    {   //more than one page
                        var aNums = aPages[3].match(PatternHotmailPages);
                        mainObject.m_HotmailLog.Write("nsHotmail.js - mailBoxOnloadHandler -msg pages num : " +aNums);
                
                        
                        //construct page urls
                        for (i =0 ; i < aNums.length ; i++)
                        {
                            mainObject.m_aszPageURLS.push(mainObject.m_szLocationURI+aPages[1]+mainObject.m_szUM+aPages[2]+(i+1));        
                        }
                        mainObject.m_HotmailLog.Write("nsHotmail.js - mailBoxOnloadHandler -msg pages url : " 
                                                                    +mainObject.m_aszPageURLS
                                                                    + " length "
                                                                    +mainObject.m_aszPageURLS.length);
                       
                        var ios=Components.classes["@mozilla.org/network/io-service;1"].
                                    getService(Components.interfaces.nsIIOService);
                                    
                        //set cookies
                        var szURL = ios.newURI(mainObject.m_aszPageURLS[0],null,null).prePath;
                        var aszHost = szURL.match(/[^\.\/]+\.[^\.\/]+$/); 
                        var aszCookie = mainObject.m_oCookies.findCookie(aszHost);
                        mainObject.m_HotmailLog.Write("nsHotmail.js - mailBoxOnloadHandler - cookies - "+ aszCookie);
                                                                      
                        var bResult = mainObject.httpConnection(mainObject.m_aszPageURLS[0], 
                                                        "GET", 
                                                        null, 
                                                        aszCookie,
                                                        mainObject.mailBoxOnloadHandler);
                                                        
                        if (!bResult) throw new Error("httpConnection returned false");
                    }
                    else
                    {   //only one page
                        if (!mainObject.msgTableParse(szResponse)) 
                            throw new Error("Error Parsing MsgTable");
                 
                        mainObject.serverComms("+OK "+ mainObject.m_iNum + " " + mainObject.m_iTotalSize + "\r\n");
                    }
                                            
                    mainObject.m_iStage++;  
                        
                break;
                
                case 1:
                    mainObject.m_iPagesURLS ++;
                    
                    mainObject.m_HotmailLog.Write("nsHotmail.js - mailBoxOnloadHandler -msg pages num : " 
                                                                                + mainObject.m_iPagesURLS 
                                                                                +"\n"
                                                                                + szResponse);
                    if (!mainObject.msgTableParse(szResponse)) 
                        throw new Error("error parsing msg table"); 
                    
                    if (mainObject.m_iPagesURLS == mainObject.m_aszPageURLS.length)
                    {
                        mainObject.serverComms("+OK "+ mainObject.m_iNum + " " + mainObject.m_iTotalSize + "\r\n");
                    }
                    else
                    {
                        var ios=Components.classes["@mozilla.org/network/io-service;1"].
                                    getService(Components.interfaces.nsIIOService);
                                    
                        //set cookies
                        var szURL = ios.newURI(mainObject.m_aszPageURLS[mainObject.m_iPagesURLS],
                                               null,
                                               null).prePath;
                        var aszHost = szURL.match(/[^\.\/]+\.[^\.\/]+$/); 
                        var aszCookie = mainObject.m_oCookies.findCookie(aszHost);
                        mainObject.m_HotmailLog.Write("nsHotmail.js - mailBoxOnloadHandler - cookies - "+ aszCookie);
                        
                        var bResult = mainObject.httpConnection(mainObject.m_aszPageURLS[mainObject.m_iPagesURLS], 
                                                         "GET", 
                                                         null, 
                                                         aszCookie,
                                                         mainObject.mailBoxOnloadHandler);  
                                                      
                        if (!bResult) throw new Error("httpConnection returned false");   
                    }   
                break;
            }

            mainObject.m_HotmailLog.Write("nsHotmail.js - MailBoxOnload - END"); 
        }
        catch(err)
        {
             mainObject.m_HotmailLog.DebugDump("nsHotmail.js: MailboxOnload : Exception : " 
                                              + err.name 
                                              + ".\nError message: " 
                                              + err.message);
            
             mainObject.serverComms("-ERR negative vibes\r\n");
            
        }   
    },
 
    
    
    msgTableParse : function (szMailBox )
    {
        try
        { 
            this.m_HotmailLog.Write("nsHotmail.js - msgTableParse - START"); 
            
            var aMsgTable = szMailBox.match(PatternHotmailMsgTable);
            if (aMsgTable == null) throw new Error("aMsgTable == null");
            this.m_HotmailLog.Write("nsHotmail.js - msgTableParse -msg table : " +aMsgTable[1]);
            var szMsgRows = aMsgTable[1].split(/<tr.*?>/);  //split on rows
            this.m_HotmailLog.Write("nsHotmail.js - msgTableParse -split msg table : " +szMsgRows);
            if (szMsgRows == null) throw new Error("szMsgRows == null");//oops
            
            var tempTotalSize = 0;
            var tempNum = 0; 
            for (j = 0; j < szMsgRows.length; j++)
            {
                var aEmailURL = szMsgRows[j].match(PatternHotmailEmailURL);
                this.m_HotmailLog.Write("nsHotmail.js - msgTableParse - Email URL : " +aEmailURL);
                if (aEmailURL)
                {
                    this.m_aszMsgIDStore.push(aEmailURL[1]);  
                    var aEmailLength = aEmailURL[1].match(PatternHotmailEmailLength);
                    
                    var lSize = 0;
                    if (aEmailLength) 
                        lSize = aEmailLength[1];
                    else
                        lSize = 2000;
                          
                    this.m_HotmailLog.Write("nsHotmail.js - msgTableParse - size : " +lSize);    
                    tempTotalSize += lSize;
                    tempNum ++; 
                 }  
            }
            
            this.m_iNum += tempNum;
            this.m_iTotalSize += tempTotalSize;
            this.m_HotmailLog.Write("nsHotmail.js - msgTableParse - Num " + this.m_iNum +" Total " +  this.m_iTotalSize);
            this.m_HotmailLog.Write("nsHotmail.js - msgTableParse - END"); 
            return true;
        }
        catch(err)
        {
            this.m_HotmailLog.DebugDump("nsHotmail.js: msgTableParse : Exception : " 
                                                              + err.name 
                                                              + ".\nError message: " 
                                                              + err.message);
            return false;
        }
    },
    
    

                     
    //list
    //i'm not downloading the mailbox again. 
    //I hope stat been called first or there's going to be trouble
    getMessageSizes : function() 
    {
        try
        {
            this.m_HotmailLog.Write("nsHotmail.js - getMessageSizes - START"); 
            
            var iTempNum = 0;
            var aTempSize = new Array();
            
            for (i = 0; i <  this.m_aszMsgIDStore.length; i++)
            {
                var szEmailURL = this.m_aszMsgIDStore[i];
                this.m_HotmailLog.Write("nsHotmail.js - getMessageSizes - Email URL : " +szEmailURL);
               
                //get size 
                var aEmailLength = szEmailURL.match(PatternHotmailEmailLength);
                var lSize = 0
                if (aEmailLength) 
                    lSize = aEmailLength[1];
                else
                    lSize = 2000;
                    
                this.m_HotmailLog.Write("nsHotmail.js - getMessageSizes - size : " +lSize);    
                aTempSize.push(lSize);
                iTempNum++; 
            }         
    
            this.m_HotmailLog.Write("nsHotmail.js - getMessagesSizes - : " 
                                                            + aTempSize + " " 
                                                            + iTempNum); 
            
            var szPOPResponse = "+OK " + iTempNum + " Messages\r\n"; 
            for (i =0 ; i<iTempNum; i++)
            {
                szPOPResponse+=(i+1) + " " + aTempSize[i] + "\r\n";                        
            }
            szPOPResponse += ".\r\n";
            
            this.serverComms(szPOPResponse);
            this.m_HotmailLog.Write("nsHotmail.js - getMessageSizes - END"); 
            return true;
        }
        catch(e)
        {
            this.m_HotmailLog.DebugDump("nsHotmail.js: getMessageSizes : Exception : " 
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
            this.m_HotmailLog.Write("nsHotmail.js - getMessageIDs - START"); 
            
            var iTempNum = 0;
            var aTempIDs = new Array();
            
            for (i = 0; i <  this.m_aszMsgIDStore.length; i++)
            {
                var szEmailURL = this.m_aszMsgIDStore[i];
                this.m_HotmailLog.Write("nsHotmail.js - getMessageIDs - Email URL : " +szEmailURL);
               
                var aEmailID = szEmailURL.match(PatternHotmailEmailID);
                var szEmailID;
                if (aEmailID ==null) //not got id
                {  
                    var iStartOfID = szEmailURL.indexOf('='); 
                    szEmailID =  szEmailURL.substring(iStartOfID +1, szEmailURL.length );
                }
                else
                    szEmailID = aEmailID[1];
                    
                this.m_HotmailLog.Write("nsHotmail.js - getMessageIDs - IDS : " +szEmailID);    
                aTempIDs.push(szEmailID);
                iTempNum++; 
            }         
     
            this.m_HotmailLog.Write("nsHotmail.js - getMessageIDs - return : " 
                                                + aTempIDs + " "
                                                + iTempNum); 
                                                
            var szPOPResponse = "+OK " + iTempNum + " Messages\r\n";
            for (i =0 ; i<iTempNum; i++)
            {
                szPOPResponse+=(i+1) + " " + aTempIDs[i] + "\r\n";                        
            }
            szPOPResponse += ".\r\n";
            this.serverComms(szPOPResponse);           
           
            this.m_HotmailLog.Write("nsHotmail.js - getMessageIDs - END"); 
            return true;
        }
        catch(e)
        {
            this.m_HotmailLog.DebugDump("nsHotmail.js: getMessageIDs : Exception : " 
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
            this.m_HotmailLog.Write("nsHotmail.js - getMessage - START"); 
            this.m_HotmailLog.Write("nsHotmail.js - getMessage - msg num" + lID); 
            var szTempMsg = new String();
            
            //get msg id
            var szMsgID = this.m_aszMsgIDStore[lID-1];
            this.m_HotmailLog.Write("nsHotmail.js - getMessage - msg id" + szMsgID); 
            
            
            var ios=Components.classes["@mozilla.org/network/io-service;1"].
                                    getService(Components.interfaces.nsIIOService);
            
            var szDest = this.m_szLocationURI + szMsgID
            if (this.m_szUM) szDest+= "&" + this.m_szUM;
            szDest+= "&raw=1";
            
                                   
            //set cookies
            var szURL = ios.newURI(szDest,null,null).prePath;
            var aszHost = szURL.match(/[^\.\/]+\.[^\.\/]+$/); 
            var aszCookie = this.m_oCookies.findCookie(aszHost);
            this.m_HotmailLog.Write("nsHotmail.js - getNumMessages - cookies - "+ aszCookie);
            
            //get msg from hotmail
            var bResult = this.httpConnection(szDest, 
                                                "GET", 
                                                null,
                                                aszCookie, 
                                                this.emailOnloadHandler);  
                                           
            if (!bResult) throw new Error("httpConnection returned false"); 
             
            this.m_HotmailLog.Write("nsHotmail.js - getMessage - END"); 
            return true;
        }
        catch(e)
        {
             this.m_HotmailLog.DebugDump("nsHotmail.js: getMessage : Exception : " 
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
            mainObject.m_HotmailLog.Write("nsHotmail.js - emailOnloadHandler - START");
            
            mainObject.m_HotmailLog.Write("nsHotmail.js - emailOnloadHandler - msg :\n" + szResponse); 
            
            var httpChannel = event.QueryInterface(Components.interfaces.nsIHttpChannel);
                      
            //check status should be 200.
            mainObject.m_HotmailLog.Write("nsHotmail.js - emailOnloadHandler - msg :" + httpChannel.responseStatus);
            if (httpChannel.responseStatus != 200 && httpChannel.responseStatus != 302) 
                throw new Error("error status " + httpChannel.responseStatus);   
            
            //test code
            if (httpChannel.responseStatus == 302)
            {
                //get location
                try
                {
                    var szLocation =  httpChannel.getResponseHeader("Location");
                    mainObject.m_HotmailLog.Write("nsHotmail.js - emailOnloadHandler - location \n" + szLocation);  
                }
                catch(e)
                {
                    throw new Error("Location header not found")
                } 
                
                var ios=Components.classes["@mozilla.org/network/io-service;1"].
                                    getService(Components.interfaces.nsIIOService);
                var szURL = ios.newURI(szLocation,null,null).prePath;
                var aszHost = szURL.match(/[^\.\/]+\.[^\.\/]+$/); 
                var aszCookie = mainObject.m_oCookies.findCookie(aszHost);
                mainObject.m_HotmailLog.Write("nsHotmail.js - emailOnloadHandler - cookies - "+ aszCookie);
                
                //load new page
                mainObject.httpConnection(szLocation, 
                                          "GET", 
                                          null,
                                          aszCookie, 
                                          mainObject.emailOnloadHandler);
                return true;
            }   
                                                                                 
            //get msg
            var aTemp = szResponse.split(/<pre>\s+/); 
            if (aTemp.length == 0)
                throw new Error("Message START  not found");     
            var szMsg = aTemp[1].split(/<\/pre>/)[0];
             if (szMsg.length == 0)
                throw new Error("Message END  not found"); 
            
            
            //clean up msg
            szMsg = szMsg.replace(/&lt;/g,"<");
            szMsg = szMsg.replace(/&gt;/g,">");
            szMsg = szMsg.replace(/&quot;/g, "\"");
            szMsg = szMsg.replace(/&amp;/g, "&");
            
            var szPOPResponse = "+OK " + szMsg.length + "\r\n";
            szMsg = szMsg.replace(/^\./mg,"..");    //bit padding                       
            szPOPResponse += szMsg;
            szPOPResponse += "\r\n.\r\n";
                      
            mainObject.serverComms(szPOPResponse);           
           
            mainObject.m_HotmailLog.Write("nsHotmail.js - emailOnloadHandler - END");      
        }
        catch(err)
        {
            mainObject.m_HotmailLog.DebugDump("nsHotmail.js: emailOnloadHandler : Exception : " 
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
            this.m_HotmailLog.Write("nsHotmail.js - deleteMessage - START");  
            this.m_HotmailLog.Write("nsHotmail.js - deleteMessage - id " + lID ); 
                   
            //create URL
            var szTempID = this.m_aszMsgIDStore[lID-1];
            this.m_HotmailLog.Write("nsHotmail.js - deleteMessage - id " + szTempID );
            var aTempID = szTempID.match(PatternHotmailEmailID); 
            var szID ;
            if (aTempID == null)
            {
                var iTempID = szTempID.indexOf("=");
                this.m_HotmailLog.Write("nsHotmail.js - deleteMessage - id " + iTempID ); 
                szID = szTempID.substring(iTempID+1,szTempID.length);
            }
            else
                szID = aTempID[1];
                
            this.m_HotmailLog.Write("nsHotmail.js - deleteMessage - id " + szID ); 
            
            //construct data
            var szPath = this.m_szLocationURI + "/cgi-bin/HoTMaiL" ;
            this.m_HotmailLog.Write("nsHotmail.js - deleteMessage - szPath " + szPath); 
            var szData = "curmbox=F000000001&HrsTest=&js=&_HMaction=delete&wo=&page=1&tobox=F000000004&ReportLevel=&rj=&DoEmpty=&SMMF=0&"+ szID + "=on"; 
           
           
            var ios=Components.classes["@mozilla.org/network/io-service;1"].
                                    getService(Components.interfaces.nsIIOService);
                                   
            //set cookies
            var szURL = ios.newURI(szPath,null,null).prePath;
            var aszHost = szURL.match(/[^\.\/]+\.[^\.\/]+$/); 
            var aszCookie = this.m_oCookies.findCookie(aszHost);
            this.m_HotmailLog.Write("nsHotmail.js - getNumMessages - cookies - "+ aszCookie);
           
            //send request
            var bResult = this.httpConnection(szPath, 
                                              "POST", 
                                              szData,
                                              aszCookie, 
                                              this.deleteMessageOnloadHandler);  
                                           
            if (!bResult) throw new Error("httpConnection returned false");            
             
            this.m_HotmailLog.Write("nsHotmail.js - deleteMessage - END");     
            return true;
        }
        catch(e)
        {
            this.m_HotmailLog.DebugDump("nsHotmail.js: deleteMessage : Exception : " 
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
            mainObject.m_HotmailLog.Write("nsHotmail.js - deleteMessageOnload - START");    
            mainObject.m_HotmailLog.Write("nsHotmail.js - deleteMessageOnload :\n" + szResponse); 
            
            var httpChannel = event.QueryInterface(Components.interfaces.nsIHttpChannel);
            
            //check status should be 200.
            mainObject.m_HotmailLog.Write("nsHotmail.js - deleteMessageOnload :" + httpChannel.responseStatus);
            if (httpChannel.responseStatus != 200 ) 
                throw new Error("error status " + httpChannel.responseStatus);   
                    
            mainObject.serverComms("+OK its history\r\n");      
            mainObject.m_HotmailLog.Write("nsHotmail.js - deleteMessageOnload - END");      
        }
        catch(e)
        {
            mainObject.m_HotmailLog.DebugDump("nsHotmail.js: deleteMessageOnload : Exception : " 
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
            this.m_HotmailLog.Write("nsHotmail.js - logOUT - START"); 
            
            this.m_bAuthorised = false;
            this.serverComms("+OK Your Out\r\n");             
                                           
            this.m_HotmailLog.Write("nsHotmail.js - logOUT - END");  
            return true;
        }
        catch(e)
        {
            this.m_HotmailLog.DebugDump("nsHotmail.js: logOUT : Exception : " 
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
var nsHotmailFactory = new Object();

nsHotmailFactory.createInstance = function (outer, iid)
{
    if (outer != null) throw Components.results.NS_ERROR_NO_AGGREGATION;
    
    if (!iid.equals(nsHotmailClassID) && !iid.equals(Components.interfaces.nsISupports))
        throw Components.results.NS_ERROR_INVALID_ARG;
    
    return new nsHotmail();
}


/******************************************************************************/
/* MODULE */
var nsHotmailModule = new Object();

nsHotmailModule.registerSelf = function(compMgr, fileSpec, location, type)
{
    compMgr = compMgr.QueryInterface(Components.interfaces.nsIComponentRegistrar);
    compMgr.registerFactoryLocation(nsHotmailClassID,
                                    "HotmailComponent",
                                    nsHotmailContactID, 
                                    fileSpec,
                                    location, 
                                    type);
}


nsHotmailModule.unregisterSelf = function(aCompMgr, aFileSpec, aLocation)
{
    aCompMgr = aCompMgr.QueryInterface(Components.interfaces.nsIComponentRegistrar);
    aCompMgr.unregisterFactoryLocation(nsHotmailClassID, aFileSpec);
}

 
nsHotmailModule.getClassObject = function(compMgr, cid, iid)
{
    if (!cid.equals(nsHotmailClassID))
        throw Components.results.NS_ERROR_NO_INTERFACE;

    if (!iid.equals(Components.interfaces.nsIFactory))
        throw Components.results.NS_ERROR_NOT_IMPLEMENTED;

    return nsHotmailFactory;
}


nsHotmailModule.canUnload = function(compMgr)
{
    return true;
}
/******************************************************************************/


function NSGetModule(compMgr, fileSpec)
{
    return nsHotmailModule; 
}
