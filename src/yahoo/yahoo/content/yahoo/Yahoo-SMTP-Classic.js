/******************************  Yahoo ***************************************/
function YahooSMTPClassic(oResponseStream, oLog, oPref)
{
    try
    {
        var scriptLoader =  Components.classes["@mozilla.org/moz/jssubscript-loader;1"];
        scriptLoader = scriptLoader.getService(Components.interfaces.mozIJSSubScriptLoader);

        scriptLoader.loadSubScript("chrome://web-mail/content/common/DebugLog.js");
        scriptLoader.loadSubScript("chrome://web-mail/content/common/CommonPrefs.js");
        scriptLoader.loadSubScript("chrome://web-mail/content/common/Email.js");
        scriptLoader.loadSubScript("chrome://web-mail/content/common/HttpComms3.js");
        scriptLoader.loadSubScript("chrome://yahoo/content/Yahoo-SpamImage.js");
        scriptLoader.loadSubScript("chrome://yahoo/content/Yahoo-Prefs-Accounts-Data.js");

        this.m_Log = oLog;
        this.m_Log.Write("YahooSMTPClassic.js - Constructor - START");

        //prfs
        this.m_bReUseSession = oPref.bReUseSession;      //reuse session
        this.m_bSendHtml = false; //oPref.bSendHtml;          //what do i do with alternative parts

        //comms
        this.m_oResponseStream = oResponseStream;
        this.m_HttpComms = new HttpComms(this.m_Log);
        this.m_HttpComms.setUserAgentOverride(true);
        
        this.m_bAuthorised = false;
        this.m_szUserName = null;
        this.m_szPassWord = null;

        this.m_aszTo = new Array;
        this.m_szFrom = null;
        this.m_iStage = 0;
        this.m_szComposeURI = null;
        this.m_szLocationURI = null;
        this.m_szYahooMail = null;
        this.m_szHomeURI = null;
        this.m_bReEntry = false;
        this.m_bAttHandled = false;
        this.m_Email = new email("");
        this.m_Email.decodeBody(true);
        this.m_szImageVerForm = null;
        this.m_szLoginUserName = null;
        this.m_szForm = null;
        this.m_bReEntry = false;
        this.m_aLoginForm = null;
        this.m_iLoginCount = 0;

        this.m_ComponentManager = Components.classes["@mozilla.org/ComponentData2;1"]
                                            .getService(Components.interfaces.nsIComponentData2);
        this.m_Log.Write("YahooSMTPClassic.js - Constructor - END");
    }
    catch(e)
    {
        DebugDump("YahooSMTPClassic.js: Constructor : Exception : "
                                      + e.name
                                      + ".\nError message: "
                                      + e.message +"\n"
                                      + e.lineNumber);
    }
}



YahooSMTPClassic.prototype =
{
    logIn : function(szUserName, szPassWord)
    {
        try
        {
            this.m_Log.Write("YahooSMTPClassic.js - logIN - START");
            this.m_Log.Write("YahooSMTPClassic.js - logIN - Username: " +szUserName
                                                   + " Password: " + szPassWord
                                                   + " stream: " + this.m_oResponseStream);

            if (!szUserName || !szPassWord || !this.m_oResponseStream) return false;
            this.m_szPassWord = szPassWord
            this.m_szUserName =szUserName

            this.m_szYahooMail = "http://mail.yahoo.com";
            this.m_szLoginUserName = this.m_szUserName;

            if (this.m_szUserName.search(/yahoo/i) != -1) 
            {
                if (this.m_szUserName.search(/yahoo\.co\.jp/i) != -1) 
                    this.m_szYahooMail = "http://mail.yahoo.co.jp/";
                
                //remove domain from user name
                this.m_szLoginUserName = this.m_szUserName.match(/(.*?)@/)[1].toLowerCase();
            }
            else if (this.m_szUserName.search(/@talk21.com$/i) != -1 ||
                       this.m_szUserName.search(/@btinternet.com$/i) != -1 ||
                           this.m_szUserName.search(/@btopenworld.com$/i) != -1) 
            {
                this.m_szYahooMail = "http://bt.yahoo.com/";
            }

            this.m_iStage = 0;
            this.m_HttpComms.setURI(this.m_szYahooMail);
            this.m_HttpComms.setRequestMethod("GET");
            this.m_HttpComms.setUserName(this.m_szUserName);
            
            if (this.m_bReUseSession)
            {
                this.m_Log.Write("YahooPOP.js - logIN - Getting Session Data");
                this.m_szHomeURI = this.m_ComponentManager.findElement(this.m_szUserName, "szHomeURI");
                this.m_Log.Write("YahooPOP - logIN - m_szLocation " +this.m_szHomeURI);
                if (this.m_szHomeURI)
                {
                    this.m_Log.Write("YahooPOP.js - logIN - Session Data Found");
                    this.m_iStage =1;
                    this.m_bReEntry = true;
                    this.m_HttpComms.setURI(this.m_szHomeURI);
                }
                else
                {
                    this.m_ComponentManager.deleteAllElements(this.m_szUserName);

                    var oCookies = Components.classes["@mozilla.org/nsWebMailCookieManager2;1"]
                                             .getService(Components.interfaces.nsIWebMailCookieManager2);
                    oCookies.removeCookie(this.m_szUserName);
                }
            }
            else
            {
                this.m_ComponentManager.deleteAllElements(this.m_szUserName);

                var oCookies = Components.classes["@mozilla.org/nsWebMailCookieManager2;1"]
                                         .getService(Components.interfaces.nsIWebMailCookieManager2);
                oCookies.removeCookie(this.m_szUserName);
            }


            var bResult = this.m_HttpComms.send(this.loginOnloadHandler,this);
            if (!bResult) throw new Error("httpConnection returned false");

            this.m_Log.Write("YahooSMTPClassic.js - logIN - END");
            return true;
        }
        catch(e)
        {
            this.m_Log.DebugDump("YahooSMTPClassic.js: logIN : Exception : "
                                              + e.name +
                                              ".\nError message: "
                                              + e.message+ "\n"
                                              + e.lineNumber);

            this.serverComms("502 negative vibes from "+this.m_szUserName+"\r\n");

            return false;
        }
    },


    loginOnloadHandler : function(szResponse ,event , mainObject)
    {
        try
        {
            mainObject.m_Log.Write("YahooSMTPClassic.js - loginOnloadHandler - START");
            mainObject.m_Log.Write("YahooSMTPClassic.js - loginOnloadHandler : " + mainObject.m_iStage );

            var httpChannel = event.QueryInterface(Components.interfaces.nsIHttpChannel);

            //if this fails we've gone somewhere new
            mainObject.m_Log.Write("YahooSMTPClassic.js - loginOnloadHandler - status :" +httpChannel.responseStatus );
            if (httpChannel.responseStatus != 200)
                throw new Error("return status " + httpChannel.responseStatus);
           
            var aLoginRedirect = szResponse.match(patternYahooRefresh);
            if (aLoginRedirect==null) aLoginRedirect = szResponse.match(patternYahooRefresh2);
            mainObject.m_Log.Write("YahooPOPClassic.js - loginOnloadHandler - login redirect " + aLoginRedirect);
            if (aLoginRedirect != null && mainObject.m_iStage!=0) 
            {         
                var szLocation = aLoginRedirect[1];         
                mainObject.m_HttpComms.setURI(szLocation);
                mainObject.m_HttpComms.setRequestMethod("GET");
                var bResult = mainObject.m_HttpComms.send(mainObject.loginOnloadHandler, mainObject);
                if (!bResult) throw new Error("httpConnection returned false");
                return;
            }

           
            //page code
            switch (mainObject.m_iStage)
            {
                case 0: // login page
                    var aLoginForm = szResponse.match(patternYahooLoginForm);
                    if (aLoginForm == null)
                         throw new Error("error parsing yahoo login web page");
                    mainObject.m_Log.Write("YahooSMTPClassic.js - loginOnloadHandler - loginForm " + aLoginForm);

                    var szLoginURL = aLoginForm[0].match(patternYahooAction)[1];
                    mainObject.m_Log.Write("YahooSMTPClassic.js - loginOnloadHandler - loginURL " + szLoginURL);

                    var aLoginData = aLoginForm[0].match(patternYahooInput);
                    mainObject.m_Log.Write("YahooSMTPClassic.js - loginOnloadHandler - loginData " + aLoginData);

                    for (i=0; i<aLoginData.length; i++)
                    {
                        var szName=aLoginData[i].match(patternYahooClassicName)[1];
                        mainObject.m_Log.Write("YahooSMTPClassic.js - loginOnloadHandler - loginData name " + szName);

                        var szValue = aLoginData[i].match(patternYahooClassicValue)[1];
                        mainObject.m_Log.Write("YahooSMTPClassic.js - loginOnloadHandler - loginData value " + szValue);

                        mainObject.m_HttpComms.addValuePair(szName,(szValue? encodeURIComponent(szValue):""));
                    }

                    var szLogin = encodeURIComponent(mainObject.m_szLoginUserName);
                    mainObject.m_HttpComms.addValuePair("login", szLogin);

                    var szPass = encodeURIComponent(mainObject.m_szPassWord);
                    mainObject.m_HttpComms.addValuePair("passwd",szPass);

                    mainObject.m_HttpComms.addValuePair(".persistent","y");

                    mainObject.m_HttpComms.setURI(szLoginURL);
                    mainObject.m_HttpComms.setRequestMethod("POST");
                    var bResult = mainObject.m_HttpComms.send(mainObject.loginOnloadHandler, mainObject);
                    if (!bResult) throw new Error("httpConnection returned false");
                    mainObject.m_iStage++;
                break;

                case 1: //mail box
                    var szLocation = httpChannel.URI.spec;
                    mainObject.m_Log.Write("YahooSMTPClassic.js - loginOnloadHandler - page check : " + szLocation);
                    if (szResponse.search(patternYahooShowFolder) == -1)
                    {
                        if (szLocation.search(/try_mail/i)!=-1)
                        {
                             mainObject.m_HttpComms.addValuePair("newStatus", "1");
                             mainObject.m_HttpComms.setURI(szLocation);
                             mainObject.m_HttpComms.setRequestMethod("POST");
                             var bResult = mainObject.m_HttpComms.send(mainObject.loginOnloadHandler, mainObject);
                             if (!bResult) throw new Error("httpConnection returned false");
                             return;
                        }
                        else if (mainObject.m_bReEntry)
                        {
                            mainObject.m_ComponentManager.deleteAllElements(mainObject.m_szUserName);

                            var oCookies = Components.classes["@mozilla.org/nsWebMailCookieManager2;1"]
                                                     .getService(Components.interfaces.nsIWebMailCookieManager2);
                            oCookies.removeCookie(mainObject.m_szUserName);

                            mainObject.m_bReEntry = false;
                            mainObject.m_iStage =0;
                            mainObject.m_HttpComms.setURI(mainObject.m_szYahooMail);
                            mainObject.m_HttpComms.setRequestMethod("GET");
                            var bResult = mainObject.m_HttpComms.send(mainObject.loginOnloadHandler, mainObject);
                            if (!bResult) throw new Error("httpConnection returned false");
                            return;
                        }
                        else
                            throw new Error("error logging in");
                    }
                    mainObject.m_szHomeURI = szLocation;

                    //get urls for later use
                    mainObject.m_szLocationURI = httpChannel.URI.prePath ;
                    mainObject.m_Log.Write("YahooSMTPClassic.js - loginOnloadHandler - m_szLocationURI : "+mainObject.m_szLocationURI );

                    var szComposeForm = szResponse.match(patternYahooComposeURLForm)[1];
                    mainObject.m_Log.Write("YahooSMTPClassic.js - loginOnloadHandler - szComposeForm : "+szComposeForm );
                    
                    var szComposeURL = szComposeForm.match(patternYahooAction)[1];
                    mainObject.m_Log.Write("YahooSMTPClassic.js - loginOnloadHandler - szComposeURL " + szComposeURL);
                                    
                    if (!mainObject.m_HttpComms.setURI(szComposeURL)) 
                    {
                        if (szComposeURL.search(/^\//) == -1)
                        {
                            var IOService = Components.classes["@mozilla.org/network/io-service;1"]
                                                      .getService(Components.interfaces.nsIIOService);
                            var nsIURI = IOService.newURI(httpChannel.URI.spec, null, null)
                                                  .QueryInterface(Components.interfaces.nsIURL);
                            var szDirectory = nsIURI.directory
                            mainObject.m_Log.Write("YahooSMTPClassic - loginOnloadHandler - directory : " +szDirectory);
                            
                            szComposeURL = mainObject.m_szLocationURI + szDirectory + szComposeURL
                        }
                        else
                        {
                            szComposeURL = mainObject.m_szLocationURI + szComposeURL
                        }
                    }
                                      
                    var aInputData = szComposeForm.match(patternYahooInput);
                    mainObject.m_Log.Write("YahooSMTPClassic.js - loginOnloadHandler - aInputData " + aInputData);

                    for (i=0; i<aInputData.length; i++)
                    {
                        var szName = aInputData[i].match(patternYahooClassicName)[1];
                        mainObject.m_Log.Write("YahooSMTPClassic.js - loginOnloadHandler - aInputData name " + szName);
                     
                        if (szName.search(/rand/i)==-1)
                        {
                            var szValue = aInputData[i].match(patternYahooClassicValue)[1];
                            mainObject.m_Log.Write("YahooSMTPClassic.js - loginOnloadHandler - aInputData value " + szValue);
                            
                            szComposeURL += "&" + szName + "=" + szValue;
                        }
                    }
                    
                    
                                     
                    mainObject.m_szComposeURI = szComposeURL ;
                    mainObject.m_Log.Write("YahooSMTPClassic.js - loginOnloadHandler - m_szComposeURI : "+mainObject.m_szComposeURI );

                    //server response
                    mainObject.serverComms("235 Your In\r\n");
                    mainObject.m_bAuthorised = true;
                break;
            };

            mainObject.m_Log.Write("YahooSMTPClassic.js - loginOnloadHandler - END");
        }
        catch(err)
        {
            mainObject.m_ComponentManager.deleteAllElements(mainObject.m_szUserName);

            var oCookies = Components.classes["@mozilla.org/nsWebMailCookieManager2;1"]
                                     .getService(Components.interfaces.nsIWebMailCookieManager2);
            oCookies.removeCookie(mainObject.m_szUserName);

            mainObject.m_Log.DebugDump("YahooSMTPClassic.js: loginHandler : Exception : "
                                          + err.name
                                          + ".\nError message: "
                                          + err.message+ "\n"
                                          + err.lineNumber);

            mainObject.serverComms("502 negative vibes from "+mainObject.m_szUserName+"\r\n");
        }
    },


    rawMSG : function ( szFrom, aszTo, szEmail)
    {
        try
        {
            this.m_Log.Write("YahooSMTPClassic.js - rawMSG - START");

            this.m_iStage =0 ;
            this.m_aszTo = aszTo;
            this.m_szFrom = szFrom;

            if (!this.m_Email.parse(szEmail)) throw new Error ("Parse Failed")
            
            if (!this.m_Email.txtBody) 
            {
                var strBundleService = Components.classes["@mozilla.org/intl/stringbundle;1"]
                                             .getService(Components.interfaces.nsIStringBundleService);
                var stringBundle = strBundleService.createBundle("chrome://yahoo/locale/Yahoo-SMTP-Classic.properties");
                var szError = stringBundle.GetStringFromName("HtmlError");

                this.serverComms("502 "+ szError + "\r\n");
                return false;
            }
            
            //get composer page
            this.m_HttpComms.setURI(this.m_szComposeURI);
            this.m_HttpComms.setRequestMethod("GET");
            var bResult = this.m_HttpComms.send(this.composerOnloadHandler, this);
            if (!bResult) throw new Error("httpConnection returned false");

            this.m_Log.Write("YahooSMTPClassic.js - rawMSG - END");
            return true;
        }
        catch(err)
        {
            this.m_Log.DebugDump("YahooSMTPClassic.js: rawMSG : Exception : "
                                              + err.name +
                                              ".\nError message: "
                                              + err.message+ "\n"
                                              + err.lineNumber);
            return false;
        }
    },


    composerOnloadHandler : function(szResponse ,event , mainObject)
    {
        try
        {
            mainObject.m_Log.Write("YahooSMTPClassic.js - composerOnloadHandler - START");
            mainObject.m_Log.Write("YahooSMTPClassic.js - composerOnloadHandler : " + mainObject.m_iStage);

            var httpChannel = event.QueryInterface(Components.interfaces.nsIHttpChannel);

            //if this fails we've gone somewhere new
            mainObject.m_Log.Write("YahooSMTPClassic.js - composerOnloadHandler - status :" +httpChannel.responseStatus );
            if (httpChannel.responseStatus != 200)
                throw new Error("return status " + httpChannel.responseStatus);

            var szReferer = httpChannel.URI.spec;
            mainObject.m_Log.Write("YahooSMTPClassic.js - composerOnloadHandler - Referer :" +szReferer);

            if (mainObject.m_Email.attachments.length>0 && !mainObject.m_bAttHandled)
                mainObject.m_iStage = 2;
            
            switch(mainObject.m_iStage)
            {
                case 0: //MSG handler
                    mainObject.m_Log.Write("YahooSMTPClassic.js - composerOnloadHandler - Send MSG");

                    var szForm = szResponse.match(patternYahooComposeForm)[0];
                    mainObject.m_Log.Write("YahooSMTPClassic.js - composerOnloadHandler - Form " + szForm);

                    var szActionURI = szForm.match(patternYahooAction)[1];
                    mainObject.m_Log.Write("YahooSMTPClassic.js - composerOnloadHandler - Action " + szActionURI);
                    if (!mainObject.m_HttpComms.setURI(szActionURI)) 
                    {
                        if (szActionURI.search(/^\//) == -1)
                        {
                            var IOService = Components.classes["@mozilla.org/network/io-service;1"]
                                                      .getService(Components.interfaces.nsIIOService);
                            var nsIURI = IOService.newURI(httpChannel.URI.spec, null, null)
                                                  .QueryInterface(Components.interfaces.nsIURL);
                            var szDirectory = nsIURI.directory
                            mainObject.m_Log.Write("YahooSMTPClassic - loginOnloadHandler - directory : " +szDirectory);
                            
                            szActionURI = mainObject.m_szLocationURI + szDirectory + szActionURI
                        }
                        else
                        {
                            szActionURI = mainObject.m_szLocationURI + szActionURI
                        }
                        mainObject.m_HttpComms.setURI(szActionURI);                
                    }

                    var aszInput = szForm.match(patternYahooInput);
                    mainObject.m_Log.Write("YahooSMTPClassic.js - composerOnloadHandler - Input " + aszInput);

                    for (i=0; i< aszInput.length; i++)
                    {
                        var szName = aszInput[i].match(patternYahooClassicName)[1];
                        mainObject.m_Log.Write("YahooSMTPClassic.js - composerOnloadHandler - Name " + szName);

                        var szValue = "";
                        if (aszInput[i].search(/value/i)!=-1)
                            szValue = aszInput[i].match(patternYahooClassicValue)[1]
                      
                        mainObject.m_HttpComms.addValuePair(szName, encodeURIComponent(mainObject.cleanHTML(szValue)));
                    }


                    if (szForm.search(patternYahooSelect)!=-1) 
                    {
                        var szName = "defFromAddress";
                        var szSelect = szForm.match(patternYahooSelect)[0];
                        mainObject.m_Log.Write("YahooSMTPClassic.js - composerOnloadHandler - szSelect " + szSelect);
                            
                        szValue = szSelect.match(patternYahooAddress)[1];
                        mainObject.m_Log.Write("YahooSMTPClassic.js - composerOnloadHandler - szValue " + szValue);
                        
                        mainObject.m_HttpComms.addValuePair(szName, encodeURIComponent(mainObject.cleanHTML(szValue)));
                    }  


                    var szTo = mainObject.m_Email.headers.getTo();
                    mainObject.m_HttpComms.addValuePair("to", (szTo? encodeURIComponent(szTo) : ""));

                    var szCc = mainObject.m_Email.headers.getCc();
                    mainObject.m_HttpComms.addValuePair("cc", (szCc? encodeURIComponent(szCc) : ""));

                    var szBCC = mainObject.getBcc(szTo, szCc);
                    mainObject.m_HttpComms.addValuePair("bcc", (szBCC? encodeURIComponent(szBCC) : ""));

                    var szSubject = mainObject.m_Email.headers.getSubject();
                    mainObject.m_HttpComms.addValuePair("Subj",(szSubject? mainObject.escapeStr(szSubject) : "%20"));

                    var szBody = "";
                    if (mainObject.m_Email.txtBody && !mainObject.m_bSendHtml || !mainObject.m_Email.htmlBody)
                    {
                        mainObject.m_Log.Write("YahooSMTPClassic.js - composerOnloadHandler - plain");
                        if (mainObject.m_Email.txtBody.headers)
                            szContentType = mainObject.m_Email.txtBody.headers.getContentType(0);
                        else
                            szContentType = mainObject.m_Email.headers.getContentType(0);
                        szBody = mainObject.m_Email.txtBody.body.getBody();
                    }
                    else if (mainObject.m_Email.htmlBody && mainObject.m_bSendHtml || !mainObject.m_Email.txtBody)
                    {
                        mainObject.m_Log.Write("YahooSMTPClassic.js - composerOnloadHandler - html");
                        szContentType = mainObject.m_Email.headers.getContentType(0);
                        szBody = mainObject.m_Email.htmlBody.body.getBody();
                        szBody = szBody.match(/<body.*?>([\s\S]*)<\/body>/)[1];
                    }
                    mainObject.m_HttpComms.addValuePair("Content",mainObject.escapeStr(szBody));
    
                    mainObject.m_HttpComms.addValuePair("send","Send");
                    
                    mainObject.m_iStage++;

                    mainObject.m_HttpComms.setRequestMethod("POST");
                    var bResult = mainObject.m_HttpComms.send(mainObject.composerOnloadHandler,mainObject);
                    if (!bResult) throw new Error("httpConnection returned false");
                break;

                case 1: //MSG OK handler
                    //check for add address to addressbook
                    if (szResponse.search(/AddAddresses/i)!=-1)
                    {
                        mainObject.m_Log.Write("YahooSMTPClassic.js - composerOnloadHandler - SEND OK");
                        if (mainObject.m_bReUseSession)
                        {
                            mainObject.m_Log.Write("YahooSMTPClassic.js - logOut - Setting Session Data");
                            mainObject.m_ComponentManager.addElement(mainObject.m_szUserName, "szHomeURI", mainObject.m_szHomeURI);
                        }
                        else
                        {
                            mainObject.m_Log.Write("YahooSMTPClassic.js - logOUT - removing Session Data");
                            mainObject.m_ComponentManager.deleteAllElements(mainObject.m_szUserName);

                            var oCookies = Components.classes["@mozilla.org/nsWebMailCookieManager2;1"]
                                                     .getService(Components.interfaces.nsIWebMailCookieManager2);
                            oCookies.removeCookie(mainObject.m_szUserName);
                        }


                        mainObject.serverComms("250 OK\r\n");
                    }
                    else if(szResponse.search(/<form.*?name=ImgVerification[\S\s]*?>/igm)!=-1)
                    {
                        mainObject.m_Log.Write("YahooSMTPClassic.js - composerOnloadHandler - image verification");
                        mainObject.m_szImageVerForm = szResponse.match(patternYahooImageVerifiaction)[0];
                        mainObject.m_Log.Write("YahooSMTPClassic.js - composerOnloadHandler - form " + mainObject.m_szImageVerForm );
                        var szImageUri = szResponse.match(patternYahooImage)[1];
                        mainObject.m_Log.Write("YahooSMTPClassic.js - composerOnloadHandler - image " + szImageUri);

                        mainObject.m_HttpComms.setURI(szImageUri);
                        mainObject.m_HttpComms.setRequestMethod("GET");
                        mainObject.m_iStage = 5;
                        var bResult = mainObject.m_HttpComms.send(mainObject.composerOnloadHandler,mainObject);
                        if (!bResult) throw new Error("httpConnection returned false");
                    }
                    else
                    {
                        mainObject.serverComms("502 Error Sending Email\r\n");
                    }
                break;

                case 2: //Attchment request
                    mainObject.m_Log.Write("YahooSMTPClassic.js - composerOnloadHandler - attachment request");
                    mainObject.m_bAttHandled =true;

                    var szForm = szResponse.match(patternYahooComposeForm)[0];
                    mainObject.m_Log.Write("YahooSMTPClassic.js - composerOnloadHandler - Form " + szForm);

                    var szActionURI = szForm.match(patternYahooAction)[1];
                    mainObject.m_Log.Write("YahooSMTPClassic.js - composerOnloadHandler - Action " + szActionURI);
                    if (!mainObject.m_HttpComms.setURI(szActionURI)) 
                    {
                        if (szActionURI.search(/^\//) == -1)
                        {
                            var IOService = Components.classes["@mozilla.org/network/io-service;1"]
                                                      .getService(Components.interfaces.nsIIOService);
                            var nsIURI = IOService.newURI(httpChannel.URI.spec, null, null)
                                                  .QueryInterface(Components.interfaces.nsIURL);
                            var szDirectory = nsIURI.directory
                            mainObject.m_Log.Write("YahooSMTPClassic - loginOnloadHandler - directory : " +szDirectory);
                            
                            szActionURI = mainObject.m_szLocationURI + szDirectory + szActionURI
                        }
                        else
                        {
                            szActionURI = mainObject.m_szLocationURI + szActionURI
                        }
                        mainObject.m_HttpComms.setURI(szActionURI);                
                    }

                    var aszInput = szForm.match(patternYahooInput);
                    mainObject.m_Log.Write("YahooSMTPClassic.js - composerOnloadHandler - Input " + aszInput);

                    for (i=0; i< aszInput.length; i++)
                    {
                        var szName = aszInput[i].match(patternYahooClassicName)[1];
                        mainObject.m_Log.Write("YahooSMTPClassic.js - composerOnloadHandler - Name " + szName);

                        var szValue = aszInput[i].match(patternYahooClassicValue)[1]
                        mainObject.m_Log.Write("YahooSMTPClassic.js - composerOnloadHandler -  value " + szValue);
                        mainObject.m_HttpComms.addValuePair(szName,(szValue.length>0) ? encodeURIComponent(szValue) : "");
                    }

                    mainObject.m_HttpComms.addValuePair("to","");
                    mainObject.m_HttpComms.addValuePair("bcc","");
                    mainObject.m_HttpComms.addValuePair("cc","");
                    mainObject.m_HttpComms.addValuePair("Subj","");
                    mainObject.m_HttpComms.addValuePair("Content","");
                    mainObject.m_HttpComms.addValuePair("attachFiles","Attach+Files");

                    mainObject.m_iStage = 3;
                    mainObject.m_HttpComms.setRequestMethod("POST");
                    var bResult = mainObject.m_HttpComms.send(mainObject.composerOnloadHandler,mainObject);
                    if (!bResult) throw new Error("httpConnection returned false");
                break;

                case 3: //Attchment handler
                    mainObject.m_Log.Write("YahooSMTPClassic.js - composerOnloadHandler - attach upload");

                    mainObject.m_szForm = szResponse.match(patternYahooClassicAttForm)[0];
                    mainObject.m_Log.Write("YahooSMTPClassic.js - composerOnloadHandler - Form " + mainObject.m_szForm);

                    var aszInput = mainObject.m_szForm.match(patternYahooInput);
                    mainObject.m_Log.Write("YahooSMTPClassic.js - composerOnloadHandler - Input " + aszInput);

                    var szActionURI = "";
                    var szRand = "";
                    for (i=0; i< aszInput.length; i++)
                    {
                        var szName = aszInput[i].match(patternYahooClassicName)[1];
                        mainObject.m_Log.Write("YahooSMTPClassic.js - composerOnloadHandler - Name " + szName);
                        
                        if (szName.search(/uploadEndPoint/)!=-1)
                        {
                            szActionURI ="http://" + aszInput[i].match(patternYahooClassicValue)[1];
                            mainObject.m_Log.Write("YahooSMTPClassic.js - composerOnloadHandler -  szActionURI " + szActionURI);
                        }
                        else if (szName.search(/rand/i)!=-1)
                        {
                            szRand = aszInput[i].match(patternYahooClassicValue)[1];
                        }                      
                    }
                    mainObject.m_HttpComms.setURI(szActionURI.replace(/.rand=.*?/,".rand="+szRand));                

                    var aszFileInput = mainObject.m_szForm.match(patternYahooFile);
                    mainObject.m_Log.Write("YahooSMTPClassic.js - composerOnloadHandler - File Input " + aszFileInput);

                    mainObject.m_HttpComms.addValuePair("_charset_",  "UTF-8");
                    mainObject.m_HttpComms.addValuePair("resulturl",  "http://us.mc539.mail.yahoo.com/mc/uploadHandler?do=done");

                    for (i=0; i< aszFileInput.length; i++)
                    {
                        var szName = aszFileInput[i].match(patternYahooClassicName)[1];
                        szName = szName.replace(/"/mg,"");
                        mainObject.m_Log.Write("YahooSMTPClassic.js - composerOnloadHandler - Name " + szName);

                        if (i < mainObject.m_Email.attachments.length)
                        {
                            //headers
                            var oAttach = mainObject.m_Email.attachments[i];
                            var szFileName = oAttach.headers.getContentType(4);
                            if (!szFileName) szFileName = "";
                            mainObject.m_Log.Write("YahooSMTPClassic.js - composerOnloadHandler - Filename " + szFileName);

                            //body
                            var szBody = oAttach.body.getBody();
                            mainObject.m_HttpComms.addFile(szName, szFileName, szBody);
                        }
                        else
                            mainObject.m_HttpComms.addFile(szName, "", "");
                    }

                    mainObject.m_HttpComms.setContentType("multipart/form-data");
                    mainObject.m_HttpComms.setRequestMethod("POST");
                    var bResult = mainObject.m_HttpComms.send(mainObject.composerOnloadHandler,mainObject);
                    if (!bResult) throw new Error("httpConnection returned false");
                    mainObject.m_iStage = 4;
                break;

                case 4: //Attachment OK handler
                    mainObject.m_Log.Write("YahooSMTPClassic.js - composerOnloadHandler - attach ok handler");

                    if (szResponse.search(patternYahooClassicAttCheck)==-1)
                    {
                        mainObject.m_Log.Write("YahooSMTPClassic.js - composerOnloadHandler - attach check failed");
                        mainObject.serverComms("502 Error Sending Email\r\n");
                        return;
                    }


                    mainObject.m_Log.Write("YahooSMTPClassic.js - composerOnloadHandler - form  " + mainObject.m_szForm);                
                    var aszInput = mainObject.m_szForm.match(patternYahooInput);
                    mainObject.m_Log.Write("YahooSMTPClassic.js - composerOnloadHandler - Input " + aszInput);

                    var szRand = "";
                    for (i=0; i< aszInput.length; i++)
                    {
                        var szName = aszInput[i].match(patternYahooClassicName)[1];
                        mainObject.m_Log.Write("YahooSMTPClassic.js - composerOnloadHandler - Name " + szName);

                        var szValue = "";
                        if (szName.search(/uploadEndPoint/i)==-1)
                        {        
                            if (aszInput[i].search(/value/i)!=-1)
                            {
                                szValue = aszInput[i].match(patternYahooClassicValue)[1];
                                mainObject.m_Log.Write("YahooSMTPClassic.js - composerOnloadHandler - value " + szValue);
                                
                                if (szName.search(/rand/i)!=-1)
                                {
                                    szRand = aszInput[i].match(patternYahooClassicValue)[1];
                                }  
                            }
                            mainObject.m_HttpComms.addValuePair(szName, (szValue.length > 0) ? encodeURIComponent(szValue) : "");
                        }
                    }
                    mainObject.m_szForm = null;
                    
                    mainObject.m_HttpComms.setURI(mainObject.m_szComposeURI.replace(/.rand=.*?/,".rand="+szRand));
                    
                    var szAttDetails = szResponse.match(patternYahooClassicAttDetails)[1];
                    mainObject.m_Log.Write("YahooSMTPClassic.js - composerOnloadHandler - szAttDetails " + szAttDetails);
                    var aszAttDetails = szAttDetails.match(/\[.*?\]/igm);
                    mainObject.m_Log.Write("YahooSMTPClassic.js - composerOnloadHandler - aszAttDetails " + aszAttDetails);
                    var aszFileNames = aszAttDetails[0].match(/["|'].*?["|']/g);
                    mainObject.m_Log.Write("YahooSMTPClassic.js - composerOnloadHandler - aszFileNames " + aszFileNames);
                    var aszFileSize = aszAttDetails[1].match(/["|'].*?["|']/g);
                    mainObject.m_Log.Write("YahooSMTPClassic.js - composerOnloadHandler - aszFileSize " + aszFileSize);
                    var aszFileUpload = aszAttDetails[2].match(/["|'].*?["|']/g);
                    mainObject.m_Log.Write("YahooSMTPClassic.js - composerOnloadHandler - aszFileUpload " + aszFileUpload);
                    var aszFileVirus = aszAttDetails[3].match(/["|'].*?["|']/g);
                    mainObject.m_Log.Write("YahooSMTPClassic.js - composerOnloadHandler - aszFileVirus " + aszFileVirus);
                    
                    var szFileDetails = "[";
                    for (var i=0; i<aszFileNames.length; i++)
                    {
                        szFileDetails = szFileDetails + "[";
                        szFileDetails = szFileDetails + "\"" + aszFileNames[i].match(/["|'](.*?)["|']/)[1] + "\",";
                        szFileDetails = szFileDetails + "\"" + aszFileSize[i].match(/["|'](.*?)["|']/)[1] + "\",";
                        szFileDetails = szFileDetails + "\"" + aszFileUpload[i].match(/["|'](.*?)["|']/)[1].replace(/\\/g,"") + "\",";
                        szFileDetails = szFileDetails + "\"" + aszFileVirus[i].match(/["|'](.*?)["|']/)[1] + "\"";
                        szFileDetails = szFileDetails + "]"; 
                        
                        if (i < aszFileNames.length-1) szFileDetails = szFileDetails + ","; 
                    }
                    szFileDetails = szFileDetails + "]";
                    mainObject.m_Log.Write("YahooSMTPClassic.js - composerOnloadHandler - szFileDetails " + szFileDetails);
                    
                    mainObject.m_HttpComms.addValuePair("attachment",encodeURIComponent(szFileDetails));
                    mainObject.m_HttpComms.addValuePair("changed","true");
                    mainObject.m_HttpComms.addValuePair("frmUp","fromupload");                  

                    mainObject.m_HttpComms.setRequestMethod("POST");
                    var bResult = mainObject.m_HttpComms.send(mainObject.composerOnloadHandler, mainObject);
                    if (!bResult) throw new Error("httpConnection returned false");
                    mainObject.m_iStage = 0;
                break;


                case 5: //downloaded image verifiaction
                    mainObject.m_Log.Write("YahooSMTPClassic.js - composerOnloadHandler - image download");
                    var szPath = mainObject.writeImageFile(szResponse);
                    mainObject.m_Log.Write("YahooSMTPClassic.js - composerOnloadHandler - imageFile " + szPath);
                    var szResult =  mainObject.openSpamWindow(szPath);

                    if (!szResult)
                    {
                        mainObject.serverComms("502 Error Sending Email\r\n");
                        return;
                    }

                    //construct form
                    var aszInput = mainObject.m_szImageVerForm.match(patternYahooInput);
                    for (i=0; i< aszInput.length; i++)
                    {
                        var szName = aszInput[i].match(patternYahooClassicName)[1];
                        mainObject.m_Log.Write("YahooSMTPClassic.js - composerOnloadHandler - Name " + szName);

                        var szValue = aszInput[i].match(patternYahooClassicValue)[1]
                        szValue = mainObject.cleanHTML(szValue);
                        szValue = mainObject.escapeStr(szValue);
                        mainObject.m_Log.Write("YahooSMTPClassic.js - composerOnloadHandler - value " + szValue);

                        mainObject.m_HttpComms.addValuePair(szName,(szValue.length>0)? szValue : "");
                    }

                    szValue = mainObject.escapeStr(szResult);
                    mainObject.m_HttpComms.addValuePair("Word",(szValue.length>0)? szValue : "");

                    var szFormAction = mainObject.m_szImageVerForm.match(patternYahooImageAction)[1];
                    mainObject.m_Log.Write("YahooSMTPClassic.js - composerOnloadHandler - szFormAction " + szFormAction);
                    var szActionUrl = szFormAction.replace(/\r/g,"").replace(/\n/g,"");
                    mainObject.m_Log.Write("YahooSMTPClassic.js - composerOnloadHandler - aszActionUrl " + szActionUrl);
                    var szAction = szActionUrl;

                    //send data
                    mainObject.m_HttpComms.setContentType("multipart/form-data");
                    mainObject.m_HttpComms.setURI(mainObject.m_szLocationURI + szAction);
                    mainObject.m_HttpComms.setRequestMethod("POST");
                    var bResult = mainObject.m_HttpComms.send(mainObject.composerOnloadHandler, mainObject);
                    if (!bResult) throw new Error("httpConnection returned false");
                    mainObject.m_iStage = 1;

                break;
            };

            mainObject.m_Log.Write("YahooSMTPClassic.js - composerOnloadHandler - END");
        }
        catch(err)
        {
            mainObject.m_Log.DebugDump("YahooSMTPClassic.js: composerOnloadHandler : Exception : "
                                          + err.name
                                          + ".\nError message: "
                                          + err.message + "\n"
                                          + err.lineNumber);

            mainObject.serverComms("502 negative vibes from "+mainObject.m_szUserName+"\r\n");
        }
    },


    escapeStr : function(szMSG)
    {
        var szEncode = escape(szMSG);
        szEncode = szEncode.replace(/\+/gm,"%2B"); //replace +  
        szEncode = szEncode.replace(/%20/gm,"+"); //replace space
        return szEncode;
    },


    getBcc : function (szTo,szCc)
    {
        try
        {
            this.m_Log.Write("YahooSMTPClassic.js - getBcc - START");
            if (this.m_aszTo.length==0) return null;
            this.m_Log.Write("YahooSMTPClassic.js - getBcc - szRcptList " + this.m_aszTo);

            var szBcc = null;
            var szAddress = null;
            if (szTo) szAddress = szTo;
            if (szCc) szAddress = (szTo ? (szAddress + ","+ szCc) : szCc);
            this.m_Log.Write("YahooSMTPClassic.js - getBcc - szAddress " + szAddress);

            if (!szAddress)
                szBcc = this.m_aszTo;
            else
            {
                for (j=0; j<this.m_aszTo.length; j++)
                {
                    var regExp = new RegExp(this.m_aszTo[j]);
                    if (szAddress.search(regExp)==-1)
                    {
                        szBcc? (szBcc += this.m_aszTo[j]) : (szBcc = this.m_aszTo[j]);
                        szBcc +=",";
                    }
                }
            }
            this.m_Log.Write("YahooSMTPClassic.js - getBcc szBcc- " + szBcc);

            this.m_Log.Write("YahooSMTPClassic.js - getBcc - End");
            return szBcc;
        }
        catch(err)
        {
            this.m_Log.DebugDump("YahooSMTPClassic.js: getBcc : Exception : "
                                                  + err.name
                                                  + ".\nError message: "
                                                  + err.message + "\n"
                                                  + err.lineNumber);

            return null;
        }
    },


    writeImageFile : function(szData)
    {
        try
        {
            this.m_Log.Write("YahooSMTPClassic.js - writeImageFile - End");

            var file = Components.classes["@mozilla.org/file/directory_service;1"];
            file = file.getService(Components.interfaces.nsIProperties);
            file = file.get("TmpD", Components.interfaces.nsIFile);
            file.append("suggestedName.jpg");
            file.createUnique(Components.interfaces.nsIFile.NORMAL_FILE_TYPE, 420);

            var deletefile = Components.classes["@mozilla.org/uriloader/external-helper-app-service;1"];
            deletefile = deletefile.getService(Components.interfaces.nsPIExternalAppLauncher);
            deletefile.deleteTemporaryFileOnExit(file);

            var outputStream = Components.classes["@mozilla.org/network/file-output-stream;1"];
            outputStream = outputStream.createInstance( Components.interfaces.nsIFileOutputStream );
            outputStream.init( file, 0x04 | 0x08 | 0x10, 420, 0 );

            var binaryStream = Components.classes["@mozilla.org/binaryoutputstream;1"];
            binaryStream = binaryStream.createInstance(Components.interfaces.nsIBinaryOutputStream);
            binaryStream.setOutputStream(outputStream)
            binaryStream.writeBytes( szData, szData.length );
            outputStream.close();
            binaryStream.close();

            var ios = Components.classes["@mozilla.org/network/io-service;1"]
                                .getService(Components.interfaces.nsIIOService);
            var fileHandler = ios.getProtocolHandler("file")
                                 .QueryInterface(Components.interfaces.nsIFileProtocolHandler);
            var URL = fileHandler.getURLSpecFromFile(file);
            this.m_Log.Write("YahooSMTPClassic.js - writeImageFile - path " + URL);

            this.m_Log.Write("YahooSMTPClassic.js - writeImageFile - End");
            return URL;
        }
        catch(err)
        {
            this.m_Log.DebugDump("YahooSMTPClassic.js: writeImageFile : Exception : "
                                                  + err.name
                                                  + ".\nError message: "
                                                  + err.message + "\n"
                                                  + err.lineNumber);

            return null;
        }
    },




    openSpamWindow : function(szPath)
    {
        try
        {
            this.m_Log.Write("YahooSMTPClassic : openWindow - START");

            var params = Components.classes["@mozilla.org/embedcomp/dialogparam;1"]
                                   .createInstance(Components.interfaces.nsIDialogParamBlock);
            params.SetNumberStrings(1);
            params.SetString(0, szPath);

            var window = Components.classes["@mozilla.org/embedcomp/window-watcher;1"]
                                  .getService(Components.interfaces.nsIWindowWatcher);

            window.openWindow(null,
                              "chrome://yahoo/content/Yahoo-SpamImage.xul",
                              "_blank",
                              "chrome,alwaysRaised,dialog,modal,centerscreen,resizable",
                              params);

            var iResult = params.GetInt(0);
            this.m_Log.Write("YahooSMTPClassic : openWindow - " + iResult);
            var szResult =  null;
            if (iResult)
            {
                szResult = params.GetString(0);
                this.m_Log.Write("YahooSMTPClassic : openWindow - " + szResult);
            }

            this.m_Log.Write("YahooSMTPClassic : openWindow - END");
            return szResult;
        }
        catch(err)
        {
            this.m_Log.DebugDump("YahooSMTPClassic: Exception in openWindow : "
                                               + err.name
                                               + ".\nError message: "
                                               + err.message + "\n"
                                               + err.lineNumber);
        }
    },


    cleanHTML : function (szRaw)
    {
        this.m_Log.Write("YahooSMTPClassic - cleanHTML");
        var szMsg = szRaw.replace(/&lt;/g,"<");
        szMsg = szMsg.replace(/&gt;/g,">");
        szMsg = szMsg.replace(/&quot;/g, "\"");
        szMsg = szMsg.replace(/&amp;/g, "&");
        szMsg = szMsg.replace(/&nbsp;/g, " ");
        szMsg = szMsg.replace(/&#xA;/g,"\n");
        szMsg = szMsg.replace(/&#10;/g,"\n");
        szMsg = szMsg.replace(/&#xD;/g,"\r");
        szMsg = szMsg.replace(/&#13;/g,"\r");
        return szMsg;
    },
    ////////////////////////////////////////////////////////////////////////////
    /////  Comms

    serverComms : function (szMsg)
    {
        try
        {
            this.m_Log.Write("YahooSMTPClassic.js - serverComms - START");
            this.m_Log.Write("YahooSMTPClassic.js - serverComms msg " + szMsg);
            var iCount = this.m_oResponseStream.write(szMsg,szMsg.length);
            this.m_Log.Write("YahooSMTPClassic.js - serverComms sent count: " + iCount
                                                        +" msg length: " +szMsg.length);
            this.m_Log.Write("YahooSMTPClassic.js - serverComms - END");
        }
        catch(e)
        {
            this.m_Log.DebugDump("YahooSMTPClassic.js: serverComms : Exception : "
                                              + e.name
                                              + ".\nError message: "
                                              + e.message+ "\n"
                                              + e.lineNumber);
        }
    }
}
