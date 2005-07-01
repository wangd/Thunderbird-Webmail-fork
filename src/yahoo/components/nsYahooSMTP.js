/*****************************  Globals   *************************************/                 
const nsYahooSMTPClassID = Components.ID("{958266e0-e2a6-11d9-8cd6-0800200c9a66}");
const nsYahooSMTPContactID = "@mozilla.org/YahooSMTP;1";
const ExtYahooGuid = "{d7103710-6112-11d9-9669-0800200c9a66}";

const patternYahooSecure = /<a href="(.*?https.*?)".*?>/;
const patternYahooLoginForm = /<form.*?name="*login_form"*.*?>[\S\d\s\r\n]*?<\/form>/gm;
const patternYahooAction = /<form.*?action="(.*?)".*?>/;
const patternYahooInput = /<input type="*hidden"* name=.*?value=.*?>/gm;
const patternYahooNameAlt = /name=([\S]*)/;
const patternYahooAltValue = /value=([\S]*)>/;
const patternYahooRedirect = /<a href="(.*?)">/;
const patternYahooCompose = /location='(http:\/\/.*?Compose\?YY=.*?)'/i;
const patternYahooComposeForm = /<form.*?name="*Compose"*.*?id="*Compose"*.*?>[\S\d\s\r\n]*?<script>/igm;
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
        scriptLoader.loadSubScript("chrome://web-mail/content/common/Email.js");
        
        var date = new Date();
        var  szLogFileName = "Yahoo SMTP Log - " + date.getHours()
                                           + "-" + date.getMinutes() 
                                           + "-"+ date.getUTCMilliseconds() +" -";
        this.m_Log = new DebugLog("webmail.logging.comms", ExtYahooGuid, szLogFileName); 
        
        this.m_Log.Write("nsYahooSMTP.js - Constructor - START");   
       
        this.m_bAuthorised = false;
        this.m_szUserName = null;   
        this.m_szPassWord = null; 
        this.m_oResponseStream = null;  
        this.m_szComposeURI = null;
        this.m_szLocationURI = null;
        this.m_oCookies = new CookieHandler(this.m_Log);    
        this.m_Email = new email(this.m_Log);
        this.m_iStage = 0;
        this.m_bAttHandled = false;
        
        //do i save copy
        var oPref = new Object();
        oPref.Value = null;
        var  PrefAccess = new WebMailCommonPrefAccess();
        if (PrefAccess.Get("bool","yahoo.bSaveCopy",oPref))
            this.m_bSaveCopy=oPref.Value;
        else
            this.m_bSaveCopy=true;          
                       
        this.m_Log.Write("nsYahooSMTP.js - Constructor - END");  
    }
    catch(e)
    {
        DebugDump("nsYahooSMTP.js: Constructor : Exception : " 
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
            this.m_Log.Write("nsYahooSMTP.js - logIN - START");   
            this.m_Log.Write("nsYahooSMTP.js - logIN - Username: " + this.m_szUserName 
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
            
            this.m_Log.Write("nsYahooSMTP.js - logIN - END");    
            return true;
        }
        catch(e)
        {
            this.m_Log.DebugDump("nsYahooSMTP.js: logIN : Exception : " 
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
            mainObject.m_Log.Write("nsYahooSMTP.js - loginOnloadHandler - START"); 
            
            mainObject.m_Log.Write("nsYahooSMTP.js - loginOnloadHandler : " 
                                                    + mainObject.m_iStage + "\n"
                                                    + szResponse);  
            
            var httpChannel = event.QueryInterface(Components.interfaces.nsIHttpChannel);
            
            //if this fails we've gone somewhere new
            mainObject.m_Log.Write("nsYahooSMTP.js - loginOnloadHandler - status :" +httpChannel.responseStatus );
            if (httpChannel.responseStatus != 200 
                        && httpChannel.responseStatus != 302
                                    && httpChannel.responseStatus != 301) 
                throw new Error("return status " + httpChannel.responseStatus);
            
            var szURL = httpChannel.URI.host;
            mainObject.m_Log.Write("nsYahooSMTP.js - loginOnloadHandler - url - " + szURL);  
            var aszTempDomain = szURL.match(/[^\.\/]+\.[^\.\/]+$/);  
            mainObject.m_Log.Write("nsYahooSMTP.js - loginOnloadHandler - domain - " + aszTempDomain[0]); 
            
            //get cookies
            try
            {
                var szCookies =  httpChannel.getResponseHeader("Set-Cookie");
                mainObject.m_Log.Write("nsYahooSMTP.js - loginOnloadHandler - received cookies \n" + szCookies);  
                mainObject.m_oCookies.addCookie( aszTempDomain[0], szCookies); 
            }
            catch(e)
            {
                mainObject.m_Log.Write("nsYahooSMTP.js - loginOnloadHandler - no cookies found"); 
            } 
            
            var ios=Components.classes["@mozilla.org/network/io-service;1"].
                                    getService(Components.interfaces.nsIIOService);



            //bounce handler
            if ( httpChannel.responseStatus == 302 || httpChannel.responseStatus == 301)
            {
                try
                {
                    var szLocation =  httpChannel.getResponseHeader("Location");
                    mainObject.m_Log.Write("nsYahooSMTP.js - loginOnloadHandler - location \n" + szLocation);  
                }
                catch(e)
                {
                    throw new Error("Location header not found")
                } 
            
                //set cookies
                var szURL = ios.newURI(szLocation,null,null).prePath;
                var aszHost = szURL.match(/[^\.\/]+\.[^\.\/]+$/);  
                var aszCookie = mainObject.m_oCookies.findCookie(aszHost);
                
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
                    
                    mainObject.m_Log.Write("nsYahooSMTP.js - loginOnloadHandler - Secure URL " + aSecureLoginURL);
                    
                    var szSecureURL = aSecureLoginURL[1];
                    
                    //set  cookies
                    var szURL = ios.newURI(szSecureURL,null,null).prePath;
                    var aszHost = szURL.match(/[^\.\/]+\.[^\.\/]+$/);  
                    var aszCookie = mainObject.m_oCookies.findCookie(aszHost);
                   
                    var bResult = mainObject.httpConnection(szSecureURL, 
                                                            "GET", 
                                                            null, 
                                                            aszCookie,
                                                            mainObject.loginOnloadHandler);
                                             
                    if (!bResult) throw new Error("httpConnection returned false");
                    mainObject.m_iStage++;
                break;
               
                
                case 1: // login page               
                    var aLoginForm = szResponse.match(patternYahooLoginForm);
                    if (aLoginForm == null)
                         throw new Error("error parsing yahoo login web page");
                    mainObject.m_Log.Write("nsYahooSMTP.js - loginOnloadHandler - loginForm " + aLoginForm);
                    
                    var szLoginURL = aLoginForm[0].match(patternYahooAction)[1];
                    mainObject.m_Log.Write("nsYahooSMTP.js - loginOnloadHandler - loginURL " + szLoginURL);
                    
                    var aLoginData = aLoginForm[0].match(patternYahooInput);
                    mainObject.m_Log.Write("nsYahooSMTP.js - loginOnloadHandler - loginData " + aLoginData);
                    var szData = "";
                    for (i=0; i<aLoginData.length; i++)
                    {
                        var szName=aLoginData[i].match(patternYahooNameAlt)[1];
                        szName = szName.replace(/"/gm,"")
                        mainObject.m_Log.Write("nsYahooSMTP.js - loginOnloadHandler - loginData name " + szName);
                        
                        var szValue = aLoginData[i].match(patternYahooAltValue)[1]
                        szValue = szValue.replace(/"/gm,"");              
                        mainObject.m_Log.Write("nsYahooSMTP.js - loginOnloadHandler - loginData value " + szValue);
                        
                        szData += szName + "=";    
                        if (szValue) szData += encodeURIComponent(szValue);
                        szData += "&"; 
                    }
                    szData += "login=" + mainObject.m_szUserName.match(/(.*?)@/)[1].toLowerCase() + "&";
                    szData += "passwd=" + encodeURIComponent(mainObject.m_szPassWord) + "&";
                    szData += ".save=Sign+In";
                    mainObject.m_Log.Write("nsYahooSMTP.js - loginOnloadHandler - login DATA \n" + szData);   
                          
                    //set  cookies
                    var szURL = ios.newURI(szLoginURL,null,null).prePath;
                    var aszHost = szURL.match(/[^\.\/]+\.[^\.\/]+$/);  
                    var aszCookie = mainObject.m_oCookies.findCookie(aszHost);
                   
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
                    mainObject.m_Log.Write("nsYahooSMTP.js - loginOnloadHandler - login redirect " + aLoginRedirect);
                      
                    var szLocation = aLoginRedirect[1];
                    
                    //set cookies
                    var szURL = ios.newURI(szLocation,null,null).prePath;
                    var aszHost = szURL.match(/[^\.\/]+\.[^\.\/]+$/);  
                    var aszCookie = mainObject.m_oCookies.findCookie(aszHost);
                    
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
                    mainObject.m_Log.Write("nsYahooSMTP.js - loginOnloadHandler - page check : " + szLocation 
                                                        + " index = " +  iIndex );
                    if (iIndex != -1) throw new Error("error logging in ");
                    
                    //get urls for later use
                    mainObject.m_szLocationURI = httpChannel.URI.prePath ;
                    mainObject.m_Log.Write("nsYahooSMTP.js - loginOnloadHandler - m_szLocationURI : "+mainObject.m_szLocationURI );
                        
                    mainObject.m_szComposeURI = szResponse.match(patternYahooCompose)[1] ;
                    mainObject.m_Log.Write("nsYahooSMTP.js - loginOnloadHandler - m_szComposeURI : "+mainObject.m_szComposeURI );
            
                    //server response
                    mainObject.serverComms("235 Your In\r\n");
                    mainObject.m_bAuthorised = true;
                break;
            };
                      
            mainObject.m_Log.Write("nsYahooSMTP.js - loginOnloadHandler - END");
        }
        catch(err)
        {
            mainObject.m_Log.DebugDump("nsYahooSMTP.js: loginHandler : Exception : " 
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
            this.m_Log.Write("nsYahooSMTP.js - rawMSG - START");   
            this.m_Log.Write("nsYahooSMTP.js - rawMSG " + szEmail);
    
            this.m_iStage =0 ;

            if (!this.m_Email.parse(szEmail))
                throw new Error ("Parse Failed")
            
            var ios=Components.classes["@mozilla.org/network/io-service;1"].
                                    getService(Components.interfaces.nsIIOService);
                                    
            var szURL = ios.newURI(this.m_szComposeURI,null,null).prePath;
            var aszHost = szURL.match(/[^\.\/]+\.[^\.\/]+$/);  
            var aszCookie = this.m_oCookies.findCookie(aszHost);
            
            //get composer page
            var bResult = this.httpConnection(this.m_szComposeURI, 
                                              "GET", 
                                              null,
                                              aszCookie, 
                                              this.composerOnloadHandler);
                                                
            if (!bResult) throw new Error("httpConnection returned false");
            
            this.m_Log.Write("nsYahooSMTP.js - rawMSG - END");    
            return true;
        }
        catch(err)
        {
            this.m_Log.DebugDump("nsYahooSMTP.js: rawMSG : Exception : " 
                                              + err.name + 
                                              ".\nError message: " 
                                              + err.message);
            return false;
        }
    },
    
    
    composerOnloadHandler : function(szResponse ,event , mainObject)
    {
        try
        {
            mainObject.m_Log.Write("nsYahooSMTP.js - composerOnloadHandler - START"); 
            
            mainObject.m_Log.Write("nsYahooSMTP.js - composerOnloadHandler : " 
                                                    + mainObject.m_iStage + "\n"
                                                    + szResponse);  
            
            var httpChannel = event.QueryInterface(Components.interfaces.nsIHttpChannel);
            
            //if this fails we've gone somewhere new
            mainObject.m_Log.Write("nsYahooSMTP.js - composerOnloadHandler - status :" +httpChannel.responseStatus );
            if (httpChannel.responseStatus != 200) 
                throw new Error("return status " + httpChannel.responseStatus);
            
            var szURL = httpChannel.URI.host;
            mainObject.m_Log.Write("nsYahooSMTP.js - composerOnloadHandler - url - " + szURL);  
            var aszTempDomain = szURL.match(/[^\.\/]+\.[^\.\/]+$/);  
            mainObject.m_Log.Write("nsYahooSMTP.js - composerOnloadHandler - domain - " + aszTempDomain[0]); 
            
            //get cookies
            try
            {
                var szCookies =  httpChannel.getResponseHeader("Set-Cookie");
                mainObject.m_Log.Write("nsYahooSMTP.js - composerOnloadHandler - received cookies \n" + szCookies);  
                mainObject.m_oCookies.addCookie( aszTempDomain[0], szCookies); 
            }
            catch(e)
            {
                mainObject.m_Log.Write("nsYahooSMTP.js - composerOnloadHandler - no cookies found"); 
            } 
            
            var ios=Components.classes["@mozilla.org/network/io-service;1"].
                                    getService(Components.interfaces.nsIIOService);

          
           
            
            
            if (mainObject.m_Email.attachments.length>0 && !mainObject.m_bAttHandled )
                mainObject.m_iStage = 1;
        
            switch(mainObject.m_iStage)
            {
                case 0: //MSG handler
                    var szForm = szResponse.match(patternYahooComposeForm)[0];
                    mainObject.m_Log.Write("nsYahooSMTP.js - composerOnloadHandler - Form " + szForm);
             
                    var szAction = szForm.match(patternYahooAction)[1];
                    mainObject.m_Log.Write("nsYahooSMTP.js - composerOnloadHandler - Action " + szAction);
                    var szActionURI = mainObject.m_szLocationURI + szAction;
                    mainObject.m_Log.Write("nsYahooSMTP.js - composerOnloadHandler - ActionURI " + szActionURI);
            
                    var aszInput = szForm.match(patternYahooInput);
                    mainObject.m_Log.Write("nsYahooSMTP.js - composerOnloadHandler - Input " + aszInput);
                    
                    var szData="";
                    
                    for (i=0; i< aszInput.length; i++)
                    {
                        var szName = aszInput[i].match(patternYahooNameAlt)[1];
                        szName = szName.replace(/"/mg,"");
                        mainObject.m_Log.Write("nsYahooSMTP.js - composerOnloadHandler - Name " + szName); 
                        
                        szData += szName +"=";
                        
                        if (szName.search(/Send/i)!=-1)
                        {
                            szData += 1;
                        }
                        else if (szName.search(/SaveCopy/i)!=-1)
                        {
                            szData += mainObject.m_bSaveCopy ? "yes" : "no";
                        }
                        else
                        {
                            var szValue = aszInput[i].match(patternYahooAltValue)[1]
                            szValue = szValue.replace(/"/mg,"");              
                            mainObject.m_Log.Write("nsYahooSMTP.js - composerOnloadHandler -  value " + szValue);
                            szData += (szValue.length>0) ? szValue : "";
                        }
                        szData += "&";
                    }
                    
                    szData +="To=";
                    var szTo = mainObject.m_Email.headers.getTo() 
                    mainObject.m_Log.Write("nsYahooSMTP.js - composerOnloadHandler - TO " + szTo);
                    szData += (szTo!=null) ? szTo : "";
                    szData += "&";
                     
                    szData +="Bcc=" 
                    var szBCC = mainObject.m_Email.headers.getBcc();
                    mainObject.m_Log.Write("nsYahooSMTP.js - composerOnloadHandler - Bcc " + szBCC);
                    szData += (szBCC!=null) ? szBCC : "";
                    szData += "&";
                   
                    szData +="Cc=";
                    var szCc = mainObject.m_Email.headers.getCc();
                    mainObject.m_Log.Write("nsYahooSMTP.js - composerOnloadHandler - CC " + szCc);
                    szData += (szCc!=null) ? szCc : "";
                    szData += "&";
                    
                    szData +="Subj=";
                    var szSubject = mainObject.m_Email.headers.getSubject(); 
                    mainObject.m_Log.Write("nsYahooSMTP.js - composerOnloadHandler - Subject " + szSubject);
                    szData += (szSubject!=null) ? encodeURIComponent(szSubject) : "%20";
                    szData += "&";
                    
                    
                    var szContentType = mainObject.m_Email.headers.getContentType(2);
                    mainObject.m_Log.Write("nsYahooSMTP.js - composerOnloadHandler - ContentType " + szContentType);
                    if (szContentType)
                    {
                        var szTxtBody = mainObject.m_Email.body.getBody(0);
                        var szHtmlBody = mainObject.m_Email.body.getBody(1);
                       
                        if (szContentType.search(/plain/)!=-1)
                        {
                             mainObject.m_Log.Write("nsYahooSMTP.js - composerOnloadHandler - plain");
                             szData +="Format=plain&";
                             szData +="Body=" + encodeURIComponent(szTxtBody);
                        }
                        else if (szContentType.search(/html/)!=-1)
                        {
                             mainObject.m_Log.Write("nsYahooSMTP.js - composerOnloadHandler - html");
                             szData +="Format=html&";
                             szData +="Body=" + encodeURIComponent(szHtmlBody);
                        }
                        else if (szContentType.search(/alternative/i)!=-1)
                        {  
                            var oPref = new Object();
                            oPref.Value = null;
                            var PrefAccess = new WebMailCommonPrefAccess();
                            PrefAccess.Get("bool","yahoo.bSendHtml",oPref);
                            var bSendHtml = oPref.Value; 
                                                   
                            if (bSendHtml && szHtmlBody)
                            {
                                mainObject.m_Log.Write("nsYahooSMTP.js - composerOnloadHandler - bSendHtml szHtmlBody");
                                szData +="Format=html&";
                                szData +="Body=" + encodeURIComponent(szHtmlBody);
                            }
                            else if (!bSendHtml && szTxtBody)
                            {
                                mainObject.m_Log.Write("nsYahooSMTP.js - composerOnloadHandler - !bSendHtml szTxtBody");
                                szData +="Format=plain&";
                                szData +="Body=" + encodeURIComponent(szTxtBody);
                            }
                            else if (szHtmlBody)
                            {
                                mainObject.m_Log.Write("nsYahooSMTP.js - composerOnloadHandler - szHtmlBody");
                                szData +="Format=html&";
                                szData +="Body=" + encodeURIComponent(szHtmlBody);
                            }
                            else if (szTxtBody)
                            {
                                mainObject.m_Log.Write("nsYahooSMTP.js - composerOnloadHandler - szTxtBody");
                                szData +="Format=plain&";
                                szData +="Body=" + encodeURIComponent(szTxtBody);
                            }  
                        }
                    }

                    mainObject.m_Log.Write("nsYahooSMTP.js - composerOnloadHandler - Compose Data" + szData); 
                    
                    mainObject.m_iStage++;
                    var szURL = ios.newURI(szActionURI,null,null).prePath;
                    var aszHost = szURL.match(/[^\.\/]+\.[^\.\/]+$/);  
                    var aszCookie = mainObject.m_oCookies.findCookie(aszHost);
                    
                    var bResult = mainObject.httpConnection(szActionURI, 
                                                            "POST", 
                                                            szData,
                                                            aszCookie, 
                                                            mainObject.composerOnloadHandler);
                                                        
                    if (!bResult) throw new Error("httpConnection returned false");
                break;
                
                case 1: //MSG OK handler
                    //check for add address to addressbook
                    if (szResponse.search(/AddAddresses/i)!=-1)
                        mainObject.serverComms("250 OK\r\n");
                    else
                        mainObject.serverComms("502 Error Sending Email\r\n");   
                break;
                
                case 2: //Attchment request
                    mainObject.m_bAttHandled =true;
                    mainObject.iStage = 3;
                break;
                
                case 3: //Attchment handler
                    mainObject.iStage = 4;
                break;
                
                case 4: //Attachment OK handler
                    mainObject.iStage = 0;
                break;
            };
                     
            mainObject.m_Log.Write("nsYahooSMTP.js - composerOnloadHandler - END");
        }
        catch(err)
        {
            mainObject.m_Log.DebugDump("nsYahooSMTP.js: composerOnloadHandler : Exception : " 
                                          + err.name 
                                          + ".\nError message: " 
                                          + err.message);
                                            
            mainObject.serverComms("502 negative vibes\r\n");
        }
    },
    
    
    
    
    ////////////////////////////////////////////////////////////////////////////
    /////  Comms                  
    
    serverComms : function (szMsg)
    {
        try
        { 
            this.m_Log.Write("nsYahooSMTP.js - serverComms - START");
            this.m_Log.Write("nsYahooSMTP.js - serverComms msg " + szMsg);
            var iCount = this.m_oResponseStream.write(szMsg,szMsg.length);
            this.m_Log.Write("nsYahooSMTP.js - serverComms sent count: " + iCount 
                                                        +" msg length: " +szMsg.length);
            this.m_Log.Write("nsYahooSMTP.js - serverComms - END");  
        }
        catch(e)
        {
            this.m_Log.DebugDump("nsYahooSMTP.js: serverComms : Exception : " 
                                              + e.name 
                                              + ".\nError message: " 
                                              + e.message);
        }
    },
   

    
    
    httpConnection : function (szURL, szType, szData, szCookies ,callBack)
    {
        try
        {
            this.m_Log.Write("nsYahooSMTP.js - httpConnection - START");   
            this.m_Log.Write("nsYahooSMTP.js - httpConnection - " + szURL + "\n"
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
                this.m_Log.Write("nsYahooSMTP.js - httpConnection - adding cookie \n"+ szCookies);
                HttpRequest.setRequestHeader("x-CookieHack", "Hacker\r\nCookie: "  + szCookies , false);
            }
           
           
            //set data
            if (szData)
            {
                this.m_Log.Write("nsYahooSMTP.js - httpConnection - adding data");
                
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
            
            this.m_Log.Write("nsYahooSMTP.js - httpConnection - END"); 
            
            return true;  
        }
        catch(e)
        {
            this.m_Log.DebugDump("nsYahooSMTP.js: httpConnection : Exception : " 
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
