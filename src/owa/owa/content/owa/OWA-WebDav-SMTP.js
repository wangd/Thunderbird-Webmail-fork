function OWASMTPWebDav(oResponseStream, oLog, oPrefData)
{
    try
    {
        var scriptLoader =  Components.classes["@mozilla.org/moz/jssubscript-loader;1"];
        scriptLoader = scriptLoader.getService(Components.interfaces.mozIJSSubScriptLoader);
        scriptLoader.loadSubScript("chrome://web-mail/content/common/DebugLog.js");
        scriptLoader.loadSubScript("chrome://web-mail/content/common/HttpComms3.js");

        this.m_Log = oLog;
        this.m_Log.Write("OWAWebDav.js - Constructor - START");

        this.m_bAuthorised = false;
        this.m_szUserName = null;
        this.m_szPassWord = null;
        this.m_oResponseStream = oResponseStream;
        this.m_HttpComms = new HttpComms(this.m_Log);
        this.m_HttpComms.setHandleHttpAuth(true);
        this.m_iRetries = 2;
        this.m_iStage=0;
        this.m_szSendUri = null;
        this.m_szURL = null;

        this.m_IOS = Components.classes["@mozilla.org/network/io-service;1"]
                               .getService(Components.interfaces.nsIIOService);

        this.m_DomainManager =  Components.classes["@mozilla.org/OWADomains;1"]
                                          .getService()
                                          .QueryInterface(Components.interfaces.nsIOWADomains);       
                                          
        this.m_bLoginWithDomain = oPrefData.bLoginWithDomain;
        this.m_bReUseSession = oPrefData.bReUseSession;
        this.m_forwardCreds = oPrefData.forwardCreds;

        this.m_Log.Write("OWAWD-SMTP.js - Constructor - END");
    }
    catch(e)
    {
        DebugDump("OWAWD-SMTP.js: Constructor : Exception : "
                                      + e.name
                                      + " line "
                                      + e.linenumber
                                      + ".\nError message: "
                                      + e.message);
    }
}


OWASMTPWebDav.prototype =
{

    logIn : function(szUserName, szPassWord)
    {
        try
        {
            this.m_Log.Write("OWAWD-SMTP.js - logIN - START");
            this.m_Log.Write("OWAWD-SMTP.js - logIN - Username: " + szUserName
                                                   + " Password: " + szPassWord
                                                   + " stream: " + this.m_oResponseStream);
            this.m_szUserName = szUserName;
            this.m_szPassWord = szPassWord;

            if (!this.m_szUserName || !this.m_oResponseStream || !this.m_szPassWord) return false;
            if (!this.m_bReUseSession)
            {
                var oCookies = Components.classes["@mozilla.org/nsWebMailCookieManager2;1"]
                                         .getService(Components.interfaces.nsIWebMailCookieManager2);
                oCookies.removeCookie(this.m_szUserName);
            }

            if (this.m_forwardCreds) {
                if (this.m_bLoginWithDomain)
                    this.m_HttpComms.setUserName(this.m_szUserName);
                else
                    this.m_HttpComms.setUserName(this.m_szUserName.match(/(.*?)@/)[1].toLowerCase());
            this.m_HttpComms.setPassword(this.m_szPassWord);
            }

            var szDomain = this.m_szUserName.match(/.*?@(.*?)$/)[1].toLowerCase();
            if (this.m_forwardCreds)
                this.m_szURL = this.m_DomainManager.getURL(szDomain);
            else
                this.m_szURL = this.m_DomainManager.getURL(szDomain) + this.m_szUserName.match(/(.*?)@.*?$/)[1].toLowerCase() + "/";

            var nsIURI = Components.classes["@mozilla.org/network/io-service;1"]
                                       .getService(Components.interfaces.nsIIOService)
                                       .newURI(this.m_szURL, null, null);
            if (this.m_forwardCreds) {
                var szServerName= nsIURI.host;
                var szLoginURL  = "https://" + szServerName + "/exchweb/bin/auth/owaauth.dll";
                this.m_HttpComms.setURI(szLoginURL);
                this.m_HttpComms.setRequestMethod("POST");   
                this.m_HttpComms.addValuePair("destination",this.m_szURL);
                this.m_HttpComms.addValuePair("username",this.m_szUserName);
                this.m_HttpComms.addValuePair("password",this.m_szPassWord);
                this.m_HttpComms.addValuePair("SubmitCreds","Log+On");
                this.m_HttpComms.addValuePair("forcedownlevel","0");
                this.m_HttpComms.addValuePair("trusted","0");
            }
            else {
                this.m_HttpComms.setContentType("text/html");
                this.m_HttpComms.setURI(this.m_szURL);
                this.m_HttpComms.setRequestMethod("Get");
            }

            var bResult = this.m_HttpComms.send(this.loginOnloadHandler, this);
            if (!bResult) throw new Error("httpConnection returned false");

            this.m_Log.Write("OWAWD-SMTP.js - logIN - END");
            return bResult;
        }
        catch(e)
        {
            this.m_Log.DebugDump("OWAWD-SMTP.js: logIN : Exception : "
                                              + e.name +
                                              ".\nError message: "
                                              + e.message+ "\n"
                                              + e.lineNumber);

            return false;
        }
    },


    loginOnloadHandler : function(szResponse ,event , mainObject)
    {
        try
        {
            mainObject.m_Log.Write("OWAWD-SMTP.js - loginOnloadHandler - START");
            mainObject.m_Log.Write("OWAWD-SMTP.js - loginOnloadHandler : " + mainObject.m_iStage);

            var httpChannel = event.QueryInterface(Components.interfaces.nsIHttpChannel);

            //if this fails we've gone somewhere new
            mainObject.m_Log.Write("OWAWD-SMTP.js - loginOnloadHandler - status :" +httpChannel.responseStatus );

            if (httpChannel.responseStatus != 200 && httpChannel.responseStatus != 207 )
                throw new Error("return status " + httpChannel.responseStatus);

            switch(mainObject.m_iStage)
            {
                case 0://get folder urls
                    mainObject.m_Log.Write("OWAWD-SMTP.js - loginOnloadHandler - stage 0 - " + mainObject.m_szURL);
                    mainObject.m_HttpComms.setURI(mainObject.m_szURL);
                    mainObject.m_HttpComms.setRequestMethod("PROPFIND");
                    mainObject.m_HttpComms.setContentType("text/xml");
                    mainObject.m_HttpComms.addData(OWASchema);
                    mainObject.m_iStage++;
                    var bResult = mainObject.m_HttpComms.send(mainObject.loginOnloadHandler, mainObject);
                    if (!bResult) throw new Error("httpConnection returned false");
                break;
                
                case 1: //get baisc uri's
                    mainObject.m_iStage++;
                    mainObject.m_Log.Write("OWAWD-SMTP.js - loginOnloadHandler - get url - start");
                    mainObject.m_iAuth=0; //reset login counter
        
                    mainObject.m_szSendUri = szResponse.match(patternOWASendMsg)[1];
                    mainObject.m_Log.Write("OWAWD-SMTP.js - loginOnloadHandler - Send URi - " +mainObject.m_szSendUri);
        
                    //server response
                    mainObject.serverComms("235 Your In\r\n");
                    mainObject.m_bAuthorised = true;
                break;
            }
            
            mainObject.m_Log.Write("OWAWD-SMTP.js - loginOnloadHandler - END");
        }
        catch(err)
        {
            var oCookies = Components.classes["@mozilla.org/nsWebMailCookieManager2;1"]
                                     .getService(Components.interfaces.nsIWebMailCookieManager2);
            oCookies.removeCookie(mainObject.m_szUserName);

            var oAuth = Components.classes["@mozilla.org/HttpAuthManager2;1"]
                                  .getService(Components.interfaces.nsIHttpAuthManager2);
            oAuth.removeToken(mainObject.m_szUserName);

            //check for retries
            if (mainObject.m_iRetries > 0)
            {
                mainObject.m_iRetries --;
                mainObject.m_Log.Write("OWAWD-SMTP.js - loginOnloadHandler - having another go " +mainObject.m_iRetries);
                if (mainObject.m_forwardCreds) {
                    if (mainObject.m_bLoginWithDomain)
                        mainObject.m_HttpComms.setUserName(this.m_szUserName);
                    else
                        mainObject.m_HttpComms.setUserName(mainObject.m_szUserName.match(/(.*?)@/)[1].toLowerCase());
                    mainObject.m_HttpComms.setPassword(mainObject.m_szPassWord);
                }
                mainObject.m_HttpComms.setURI(mainObject.m_szURL);
                mainObject.m_HttpComms.setRequestMethod("PROPFIND");
                mainObject.m_HttpComms.setContentType("text/xml");
                mainObject.m_HttpComms.addData(OWASchema);
                mainObject.m_HttpComms.send(mainObject.loginOnloadHandler, mainObject);
            }
            else
            {
                mainObject.m_Log.DebugDump("OWAWD-SMTP.js: loginHandler : Exception : "
                                          + err.name
                                          + ".\nError message: "
                                          + err.message+ "\n"
                                          + err.lineNumber);
                mainObject.serverComms("502 negative vibes from " + mainObject.m_szUserName + "\r\n");
            }
        }
    },



    rawMSG : function ( szFrom, aszTo, szEmail)
    {
        try
        {
            this.m_Log.Write("OWAWD-SMTP.js - rawMSG - START");

            this.m_iStage = 0;

            var szMsg = "MAIL FROM:<"+szFrom+">\r\n";

            for (i=0; i< aszTo.length; i++)
            {
                szMsg +="RCPT TO:<"+aszTo[i]+">\r\n";
            }
            szMsg +="\r\n";
            szMsg += szEmail.replace(/^\.\r?\n/igm,"");//removes SMTP termiator
            szMsg +="\r\n";

            this.m_HttpComms.setContentType("message/rfc821");
            this.m_HttpComms.setURI(this.m_szSendUri);
            this.m_HttpComms.setRequestMethod("POST");
            this.m_HttpComms.addRequestHeader("SAVEINSENT", this.m_bSaveCopy?"t":"f", false);
            this.m_HttpComms.addData(szMsg);
            var bResult = this.m_HttpComms.send(this.composerOnloadHandler,this);
            if (!bResult) throw new Error("httpConnection returned false");

            this.m_Log.Write("OWAWD-SMTP.js - rawMSG - END");
            return true;
        }
        catch(err)
        {
            this.m_Log.DebugDump("OWAWD-SMTP.js: rawMSG : Exception : "
                                              + err.name +
                                              ".\nError message: "
                                              + err.message +"\n" +
                                                err.lineNumber);

            this.serverComms("502 negative vibes from " + mainObject.m_szUserName + "\r\n");

            return false;
        }
    },




    composerOnloadHandler : function(szResponse ,event , mainObject)
    {
        try
        {
            mainObject.m_Log.Write("OWAWD-SMTP.js - composerOnloadHandler - START");
            //mainObject.m_Log.Write("OWAWD-SMTP.js - composerOnloadHandler : \n" + szResponse);
            mainObject.m_Log.Write("OWAWD-SMTP.js - composerOnloadHandler : " + mainObject.m_iStage);

            var httpChannel = event.QueryInterface(Components.interfaces.nsIHttpChannel);

            //if this fails we've gone somewhere new
            mainObject.m_Log.Write("OWAWD-SMTP.js - composerOnloadHandler - status :" +httpChannel.responseStatus );
            if (httpChannel.responseStatus <=199 || httpChannel.responseStatus >=300)
            {
                mainObject.serverComms("502 Error Sending Email\r\n");
            }
            else
            {
                if (!mainObject.m_bReUseSession)
                {
                    var oCookies = Components.classes["@mozilla.org/nsWebMailCookieManager2;1"]
                                             .getService(Components.interfaces.nsIWebMailCookieManager2);
                    oCookies.removeCookie(mainObject.m_szUserName);

                    var oAuth = Components.classes["@mozilla.org/HttpAuthManager2;1"]
                                      .getService(Components.interfaces.nsIHttpAuthManager2);
                    oAuth.removeToken(mainObject.m_szUserName);
                }

                mainObject.serverComms("250 OK\r\n");
            }
            mainObject.m_Log.Write("OWAWD-SMTP.js - composerOnloadHandler - END");
        }
        catch(err)
        {
            mainObject.m_Log.DebugDump("OWAWD-SMTP.js: composerOnloadHandler : Exception : "
                                          + err.name
                                          + ".\nError message: "
                                          + err.message +"\n" +
                                            err.lineNumber);

            mainObject.serverComms("502 negative vibes from " + mainObject.m_szUserName + "\r\n");
        }
    },



    serverComms : function (szMsg)
    {
        try
        {
            this.m_Log.Write("OWAWD-SMTP.js - serverComms - START");
            this.m_Log.Write("OWAWD-SMTP.js - serverComms msg " + szMsg);
            var iCount = this.m_oResponseStream.write(szMsg,szMsg.length);
            this.m_Log.Write("OWAWD-SMTP.js - serverComms sent count: " + iCount
                                                        +" msg length: " +szMsg.length);
            this.m_Log.Write("OWAWD-SMTP.js - serverComms - END");
        }
        catch(e)
        {
            this.m_Log.DebugDump("OWAWD-SMTP.js: serverComms : Exception : "
                                              + e.name
                                              + ".\nError message: "
                                              + e.message+ "\n"
                                              + e.lineNumber);
        }
    }
}
