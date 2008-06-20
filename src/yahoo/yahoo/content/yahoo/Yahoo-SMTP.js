/******************************  Yahoo ***************************************/
function YahooSMTP(oResponseStream, oLog, oPref)
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
        this.m_Log.Write("YahooSMTP.js - Constructor - START");

        //prfs
        this.m_bReUseSession = oPref.bReUseSession;    //reuse session
        this.m_bSaveCopy = oPref.bSaveCopy;        // save copy in sent items

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

        this.m_bReEntry = false;
        this.m_aLoginForm = null;
        this.m_iLoginCount = 0;

        this.m_ComponentManager = Components.classes["@mozilla.org/ComponentData2;1"]
                                            .getService(Components.interfaces.nsIComponentData2);
        this.m_Log.Write("YahooSMTP.js - Constructor - END");
    }
    catch(e)
    {
        DebugDump("YahooSMTP.js: Constructor : Exception : "
                                      + e.name
                                      + ".\nError message: "
                                      + e.message +"\n"
                                      + e.lineNumber);
    }
}



YahooSMTP.prototype =
{
    logIn : function(szUserName, szPassWord)
    {
        try
        {
            this.m_Log.Write("YahooSMTP.js - logIN - START");
            this.m_Log.Write("YahooSMTP.js - logIN - Username: " +szUserName
                                                   + " Password: " + szPassWord
                                                   + " stream: " + this.m_oResponseStream);

            if (!szUserName || !szPassWord || !this.m_oResponseStream) return false;
            this.m_szPassWord = szPassWord
            this.m_szUserName =szUserName

            this.m_szYahooMail = "http://mail.yahoo.com";
            this.m_szLoginUserName = this.m_szUserName;

            if (this.m_szUserName.search(/yahoo/i)!=-1)
            {
                if (this.m_szUserName.search(/yahoo\.co\.jp/i)!=-1)
                    this.m_szYahooMail = "http://mail.yahoo.co.jp/";

                //remove domain from user name
                if (this.m_szUserName.search(/ymail/i)!=-1) 
                    this.m_szLoginUserName = this.m_szUserName.match(/(.*?)@/)[1].toLowerCase();
            }
            else if (this.m_szUserName.search(/@talk21.com$/i)!=-1 ||
                     this.m_szUserName.search(/@btinternet.com$/i)!=-1  ||
                     this.m_szUserName.search(/@btopenworld.com$/i)!=-1 )
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
                    this.m_iStage =2;
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

            this.m_Log.Write("YahooSMTP.js - logIN - END");
            return true;
        }
        catch(e)
        {
            this.m_Log.DebugDump("YahooSMTP.js: logIN : Exception : "
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
            mainObject.m_Log.Write("YahooSMTP.js - loginOnloadHandler - START");
            mainObject.m_Log.Write("YahooSMTP.js - loginOnloadHandler : " + mainObject.m_iStage );

            var httpChannel = event.QueryInterface(Components.interfaces.nsIHttpChannel);

            //if this fails we've gone somewhere new
            mainObject.m_Log.Write("YahooSMTP.js - loginOnloadHandler - status :" +httpChannel.responseStatus );
            if (httpChannel.responseStatus != 200)
                throw new Error("return status " + httpChannel.responseStatus);
            
            //page code
            switch (mainObject.m_iStage)
            {
                case 0: // login page
                    var aLoginForm = szResponse.match(patternYahooLoginForm);
                    if (aLoginForm == null)
                         throw new Error("error parsing yahoo login web page");
                    mainObject.m_Log.Write("YahooSMTP.js - loginOnloadHandler - loginForm " + aLoginForm);

                    var szLoginURL = aLoginForm[0].match(patternYahooAction)[1];
                    mainObject.m_Log.Write("YahooSMTP.js - loginOnloadHandler - loginURL " + szLoginURL);

                    var aLoginData = aLoginForm[0].match(patternYahooInput);
                    mainObject.m_Log.Write("YahooSMTP.js - loginOnloadHandler - loginData " + aLoginData);

                    for (i=0; i<aLoginData.length; i++)
                    {
                        var szName=aLoginData[i].match(patternYahooNameAlt)[1];
                        szName = szName.replace(/"/gm,"");
                        szName = szName.replace(/'/gm,"");
                        mainObject.m_Log.Write("YahooSMTP.js - loginOnloadHandler - loginData name " + szName);

                        var szValue = aLoginData[i].match(patternYahooAltValue)[1]
                        szValue = szValue.replace(/"/gm,"");
                        szValue = szValue.replace(/'/gm,"");
                        mainObject.m_Log.Write("YahooSMTP.js - loginOnloadHandler - loginData value " + szValue);

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

                case 1: //redirect
                    var aLoginRedirect = szResponse.match(patternYahooRedirect);
                    if (aLoginRedirect == null)
                         throw new Error("error parsing yahoo login web page");
                    mainObject.m_Log.Write("YahooSMTP.js - loginOnloadHandler - login redirect " + aLoginRedirect);
                    var szLocation = aLoginRedirect[1];

                    mainObject.m_HttpComms.setURI(szLocation);
                    mainObject.m_HttpComms.setRequestMethod("GET");
                    var bResult = mainObject.m_HttpComms.send(mainObject.loginOnloadHandler, mainObject);
                    if (!bResult) throw new Error("httpConnection returned false");
                    mainObject.m_iStage++;
                break;

                case 2: //mail box
                    var szLocation = httpChannel.URI.spec;
                    mainObject.m_Log.Write("YahooSMTP.js - loginOnloadHandler - page check : " + szLocation);
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
                    mainObject.m_Log.Write("YahooSMTP.js - loginOnloadHandler - m_szLocationURI : "+mainObject.m_szLocationURI );

                    mainObject.m_szComposeURI = szResponse.match(patternYahooCompose)[1] ;
                    mainObject.m_Log.Write("YahooSMTP.js - loginOnloadHandler - m_szComposeURI : "+mainObject.m_szComposeURI );

                    //server response
                    mainObject.serverComms("235 Your In\r\n");
                    mainObject.m_bAuthorised = true;
                break;
            };

            mainObject.m_Log.Write("YahooSMTP.js - loginOnloadHandler - END");
        }
        catch(err)
        {
            mainObject.m_ComponentManager.deleteAllElements(mainObject.m_szUserName);

            var oCookies = Components.classes["@mozilla.org/nsWebMailCookieManager2;1"]
                                     .getService(Components.interfaces.nsIWebMailCookieManager2);
            oCookies.removeCookie(mainObject.m_szUserName);

            mainObject.m_Log.DebugDump("YahooSMTP.js: loginHandler : Exception : "
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
            this.m_Log.Write("YahooSMTP.js - rawMSG - START");

            this.m_iStage =0 ;
            this.m_aszTo = aszTo;
            this.m_szFrom = szFrom;

            if (!this.m_Email.parse(szEmail)) throw new Error ("Parse Failed")
            
            //get composer page
            this.m_HttpComms.setURI(this.m_szComposeURI);
            this.m_HttpComms.setRequestMethod("GET");
            var bResult = this.m_HttpComms.send(this.composerOnloadHandler, this);
            if (!bResult) throw new Error("httpConnection returned false");

            this.m_Log.Write("YahooSMTP.js - rawMSG - END");
            return true;
        }
        catch(err)
        {
            this.m_Log.DebugDump("YahooSMTP.js: rawMSG : Exception : "
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
            mainObject.m_Log.Write("YahooSMTP.js - composerOnloadHandler - START");
            mainObject.m_Log.Write("YahooSMTP.js - composerOnloadHandler : " + mainObject.m_iStage);

            var httpChannel = event.QueryInterface(Components.interfaces.nsIHttpChannel);

            //if this fails we've gone somewhere new
            mainObject.m_Log.Write("YahooSMTP.js - composerOnloadHandler - status :" +httpChannel.responseStatus );
            if (httpChannel.responseStatus != 200)
                throw new Error("return status " + httpChannel.responseStatus);

            var szReferer = httpChannel.URI.spec;
            mainObject.m_Log.Write("YahooSMTP.js - composerOnloadHandler - Referer :" +szReferer);

            if (mainObject.m_Email.attachments.length>0 && !mainObject.m_bAttHandled)
                mainObject.m_iStage = 2;
            
            switch(mainObject.m_iStage)
            {
                case 0: //MSG handler
                    mainObject.m_Log.Write("YahooSMTP.js - composerOnloadHandler - Send MSG");

                    var szForm = szResponse.match(patternYahooComposeForm)[0];
                    mainObject.m_Log.Write("YahooSMTP.js - composerOnloadHandler - Form " + szForm);

                    var szActionURI = szForm.match(patternYahooAction)[1];
                    mainObject.m_Log.Write("YahooSMTP.js - composerOnloadHandler - Action " + szActionURI);
                    if (szActionURI.search(/^http/i)==-1)
                        szActionURI = mainObject.m_szLocationURI + szActionURI;

                    var aszInput = szForm.match(patternYahooInput);
                    mainObject.m_Log.Write("YahooSMTP.js - composerOnloadHandler - Input " + aszInput);

                    for (i=0; i< aszInput.length; i++)
                    {
                        var szName = aszInput[i].match(patternYahooNameAlt)[1];
                        szName = szName.replace(/"/mg,"");
                        szName = szName.replace(/'/mg,"");
                        mainObject.m_Log.Write("YahooSMTP.js - composerOnloadHandler - Name " + szName);

                        if (szName.search(/^Send$/i)!=-1)
                        {
                            mainObject.m_HttpComms.addValuePair(szName,"1");
                        }
                        else if (szName.search(/SaveCopy/i)!=-1)
                        {
                            var szSave = mainObject.m_bSaveCopy ? "yes" : "no";
                            mainObject.m_HttpComms.addValuePair(szName,szSave);
                        }
                        else if (szName.search(/format/i)!=-1)
                        {
                            //do nothing
                        }
                        else if (szName.search(/PlainMsg/i)!=-1)
                        {
                            //do nothing
                        }
                        else
                        {
                            var szValue = aszInput[i].match(patternYahooAltValue)[1]
                            szValue = szValue.replace(/"/mg,"");
                            szValue = szValue.replace(/'/mg,"");
                            mainObject.m_HttpComms.addValuePair(szName, (szValue? szValue : ""));
                        }
                    }

                    var szTo = mainObject.m_Email.headers.getTo();
                    mainObject.m_HttpComms.addValuePair("To", (szTo? szTo : ""));

                    var szCc = mainObject.m_Email.headers.getCc();
                    mainObject.m_HttpComms.addValuePair("Cc", (szCc? szCc : ""));

                    var szBCC = mainObject.getBcc(szTo, szCc);
                    mainObject.m_HttpComms.addValuePair("Bcc", (szBCC? szBCC : ""));

                    var szSubject = mainObject.m_Email.headers.getSubject();
                    mainObject.m_HttpComms.addValuePair("Subj",
                                            (szSubject? mainObject.escapeStr(szSubject) : "%20"));

                    if (mainObject.m_Email.htmlBody)
                    {
                        mainObject.m_Log.Write("YahooSMTP.js - composerOnloadHandler - html");
                        var szHtmlBody = mainObject.m_Email.htmlBody.body.getBody();
                        mainObject.m_HttpComms.addValuePair("Format","html");
                        mainObject.m_HttpComms.addValuePair("Body",mainObject.escapeStr(szHtmlBody));

                        if (mainObject.m_Email.txtBody)
                        {
                            mainObject.m_Log.Write("YahooSMTP.js - composerOnloadHandler - TEXT");
                            var szTxtBody = mainObject.m_Email.txtBody.body.getBody();
                            mainObject.m_HttpComms.addValuePair("PlainMsg",mainObject.escapeStr(szTxtBody));
                        }
                    }
                    else
                    {
                        mainObject.m_Log.Write("YahooSMTP.js - composerOnloadHandler - plain");
                        var szTxtBody = mainObject.m_Email.txtBody.body.getBody();
                        mainObject.m_HttpComms.addValuePair("Body",mainObject.escapeStr(szTxtBody));
                    }

                    mainObject.m_iStage++;
                    mainObject.m_HttpComms.setURI(szActionURI);
                    mainObject.m_HttpComms.setRequestMethod("POST");
                    var bResult = mainObject.m_HttpComms.send(mainObject.composerOnloadHandler,mainObject);
                    if (!bResult) throw new Error("httpConnection returned false");
                break;

                case 1: //MSG OK handler
                    //check for add address to addressbook
                    if (szResponse.search(/AddAddresses/i)!=-1)
                    {
                        mainObject.m_Log.Write("YahooSMTP.js - composerOnloadHandler - SEND OK");
                        if (mainObject.m_bReUseSession)
                        {
                            mainObject.m_Log.Write("YahooSMTP.js - logOut - Setting Session Data");
                            mainObject.m_ComponentManager.addElement(mainObject.m_szUserName, "szHomeURI", mainObject.m_szHomeURI);
                        }
                        else
                        {
                            mainObject.m_Log.Write("YahooSMTP.js - logOUT - removing Session Data");
                            mainObject.m_ComponentManager.deleteAllElements(mainObject.m_szUserName);

                            var oCookies = Components.classes["@mozilla.org/nsWebMailCookieManager2;1"]
                                                     .getService(Components.interfaces.nsIWebMailCookieManager2);
                            oCookies.removeCookie(mainObject.m_szUserName);
                        }


                        mainObject.serverComms("250 OK\r\n");
                    }
                    else if(szResponse.search(/<form.*?name=ImgVerification[\S\s]*?>/igm)!=-1)
                    {
                        mainObject.m_Log.Write("YahooSMTP.js - composerOnloadHandler - image verification");
                        mainObject.m_szImageVerForm = szResponse.match(patternYahooImageVerifiaction)[0];
                        mainObject.m_Log.Write("YahooSMTP.js - composerOnloadHandler - form " + mainObject.m_szImageVerForm );
                        var szImageUri = szResponse.match(patternYahooImage)[1];
                        mainObject.m_Log.Write("YahooSMTP.js - composerOnloadHandler - image " + szImageUri);

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
                    mainObject.m_Log.Write("YahooSMTP.js - composerOnloadHandler - attachment request");
                    mainObject.m_bAttHandled =true;

                    var szForm = szResponse.match(patternYahooComposeForm)[0];
                    mainObject.m_Log.Write("YahooSMTP.js - composerOnloadHandler - Form " + szForm);

                    var szActionURI = szForm.match(patternYahooAction)[1];
                    mainObject.m_Log.Write("YahooSMTP.js - composerOnloadHandler - Action " + szActionURI);
                    if (szActionURI.search(/^http/i)==-1)
                        szActionURI = mainObject.m_szLocationURI + szActionURI;

                    var aszInput = szForm.match(patternYahooInput);
                    mainObject.m_Log.Write("YahooSMTP.js - composerOnloadHandler - Input " + aszInput);

                    for (i=0; i< aszInput.length; i++)
                    {
                        var szName = aszInput[i].match(patternYahooNameAlt)[1];
                        szName = szName.replace(/"/mg,"");
                        szName = szName.replace(/'/mg,"");
                        mainObject.m_Log.Write("YahooSMTP.js - composerOnloadHandler - Name " + szName);

                        if (szName.search(/^ATT$/i)!=-1)
                        {
                            mainObject.m_HttpComms.addValuePair(szName,"1");
                        }
                        else if (szName.search(/SaveCopy/i)!=-1)
                        {
                            mainObject.m_HttpComms.addValuePair(szName,
                                                mainObject.m_bSaveCopy ? "yes" : "no");
                        }
                        else
                        {
                            var szValue = aszInput[i].match(patternYahooAltValue)[1]
                            szValue = szValue.replace(/"/mg,"");
                            szValue = szValue.replace(/'/mg,"");
                            mainObject.m_Log.Write("YahooSMTP.js - composerOnloadHandler -  value " + szValue);
                            mainObject.m_HttpComms.addValuePair(szName,(szValue.length>0) ? szValue : "");
                        }
                    }

                    mainObject.m_HttpComms.addValuePair("To","");
                    mainObject.m_HttpComms.addValuePair("Bcc","");
                    mainObject.m_HttpComms.addValuePair("Cc","");
                    mainObject.m_HttpComms.addValuePair("Subj","");
                    mainObject.m_HttpComms.addValuePair("Body","");

                    mainObject.m_iStage = 3;
                    mainObject.m_HttpComms.setURI(szActionURI);
                    mainObject.m_HttpComms.setRequestMethod("POST");
                    var bResult = mainObject.m_HttpComms.send(mainObject.composerOnloadHandler,mainObject);
                    if (!bResult) throw new Error("httpConnection returned false");
                break;

                case 3: //Attchment handler
                    mainObject.m_Log.Write("YahooSMTP.js - composerOnloadHandler - attach upload");

                    var szForm = szResponse.match(patternYahooAttachmentForm)[0];
                    mainObject.m_Log.Write("YahooSMTP.js - composerOnloadHandler - Form " + szForm);

                    var szAction = szForm.match(patternYahooAction)[1];
                    mainObject.m_Log.Write("YahooSMTP.js - composerOnloadHandler - Action " + szAction);
                    if (szAction.search(/^http/i)==-1)
                        szAction = mainObject.m_szLocationURI + szAction;

                    var aszInput = szForm.match(patternYahooInput);
                    mainObject.m_Log.Write("YahooSMTP.js - composerOnloadHandler - Input " + aszInput);

                    var aszFileInput = szForm.match(patternYahooFile);
                    mainObject.m_Log.Write("YahooSMTP.js - composerOnloadHandler - File Input " + aszFileInput);

                    for (i=0; i< aszInput.length; i++)
                    {
                        var szName = aszInput[i].match(patternYahooNameAlt)[1];
                        szName = szName.replace(/"/mg,"");
                        szName = szName.replace(/'/mg,"");
                        mainObject.m_Log.Write("YahooSMTP.js - composerOnloadHandler - Name " + szName);

                        if(szName.search(/^UPL$/i)!=-1)
                        {
                            mainObject.m_HttpComms.addValuePair(szName, 1);
                        }
                        else if (szName.search(/^body$/i)!=-1)
                        {
                            mainObject.m_HttpComms.addValuePair(szName,"Inbox");   
                        }
                        else if (szName.search(/^box$/i)!=-1)
                        {
                            mainObject.m_HttpComms.addValuePair(szName,"<br>");                              
                        }
                        else
                        {
                            var szValue = aszInput[i].match(patternYahooAltValue)[1]
                            szValue = szValue.replace(/"/mg,"");
                            szValue = szValue.replace(/'/mg,"");
                            mainObject.m_Log.Write("YahooSMTP.js - composerOnloadHandler - value " + szValue);
                            mainObject.m_HttpComms.addValuePair(szName, (szValue.length>0) ? szValue : "");
                        }
                    }

                    for (i=0; i< aszFileInput.length; i++)
                    {
                        var szName = aszFileInput[i].match(patternYahooNameAlt)[1];
                        szName = szName.replace(/"/mg,"");
                        mainObject.m_Log.Write("YahooSMTP.js - composerOnloadHandler - Name " + szName);

                        if (i < mainObject.m_Email.attachments.length)
                        {
                            //headers
                            var oAttach = mainObject.m_Email.attachments[i];
                            var szFileName = oAttach.headers.getContentType(4);
                            if (!szFileName) szFileName = "";
                            mainObject.m_Log.Write("YahooSMTP.js - composerOnloadHandler - Filename " + szFileName);

                            //body
                            var szBody = oAttach.body.getBody();
                            mainObject.m_HttpComms.addFile(szName, szFileName, szBody);
                        }
                        else
                            mainObject.m_HttpComms.addFile(szName, "", "");
                    }

                    mainObject.m_HttpComms.setContentType("multipart/form-data");
                    mainObject.m_HttpComms.setURI(szAction);
                    mainObject.m_HttpComms.setRequestMethod("POST");
                    var bResult = mainObject.m_HttpComms.send(mainObject.composerOnloadHandler,mainObject);
                    if (!bResult) throw new Error("httpConnection returned false");
                    mainObject.m_iStage = 4;
                break;

                case 4: //Attachment OK handler
                    mainObject.m_Log.Write("YahooSMTP.js - composerOnloadHandler - attach ok handler");

                    if (szResponse.search(patternYahooAttachCheck)==-1)
                    {
                        mainObject.m_Log.Write("YahooSMTP.js - composerOnloadHandler - attach check failed");
                        mainObject.serverComms("502 Error Sending Email\r\n");
                        return;
                    }

                    var szForm = szResponse.match(patternYahooComposeForm)[0];
                    mainObject.m_Log.Write("YahooSMTP.js - composerOnloadHandler - Form " + szForm);

                    var szAction = szForm.match(patternYahooAction)[1];
                    mainObject.m_Log.Write("YahooSMTP.js - composerOnloadHandler - Action " + szAction);
                    if (szAction.search(/^http/i)==-1)
                        szAction = mainObject.m_szLocationURI + szAction;

                    var aszInput = szForm.match(patternYahooInput);
                    mainObject.m_Log.Write("YahooSMTP.js - composerOnloadHandler - Input " + aszInput);


                    for (i=0; i< aszInput.length; i++)
                    {
                        var szName = aszInput[i].match(patternYahooNameAlt)[1];
                        szName = szName.replace(/"/mg,"");
                        szName = szName.replace(/'/mg,"");
                        mainObject.m_Log.Write("YahooSMTP.js - composerOnloadHandler - Name " + szName);

                        var szValue = aszInput[i].match(patternYahooAltValue)[1]
                        szValue = szValue.replace(/"/mg,"");
                        szValue = szValue.replace(/'/mg,"");
                        mainObject.m_Log.Write("YahooSMTP.js - composerOnloadHandler - value " + szValue);

                        mainObject.m_HttpComms.addValuePair(szName,(szValue.length>0)? szValue : "");
                    }

                    mainObject.m_HttpComms.setURI(szAction);
                    mainObject.m_HttpComms.setRequestMethod("POST");
                    var bResult = mainObject.m_HttpComms.send(mainObject.composerOnloadHandler, mainObject);
                    if (!bResult) throw new Error("httpConnection returned false");
                    mainObject.m_iStage = 0;
                break;


                case 5: //downloaded image verifiaction
                    mainObject.m_Log.Write("YahooSMTP.js - composerOnloadHandler - image download");
                    var szPath = mainObject.writeImageFile(szResponse);
                    mainObject.m_Log.Write("YahooSMTP.js - composerOnloadHandler - imageFile " + szPath);
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
                        var szName = aszInput[i].match(patternYahooNameAlt)[1];
                        szName = szName.replace(/"/mg,"");
                        szName = szName.replace(/'/mg,"");
                        mainObject.m_Log.Write("YahooSMTP.js - composerOnloadHandler - Name " + szName);

                        var szValue = aszInput[i].match(patternYahooAltValue)[1]
                        szValue = szValue.replace(/"/mg,"");
                        szValue = szValue.replace(/'/mg,"");
                        szValue = mainObject.cleanHTML(szValue);
                        szValue = mainObject.escapeStr(szValue);
                        mainObject.m_Log.Write("YahooSMTP.js - composerOnloadHandler - value " + szValue);

                        mainObject.m_HttpComms.addValuePair(szName,(szValue.length>0)? szValue : "");
                    }

                    szValue = mainObject.escapeStr(szResult);
                    mainObject.m_HttpComms.addValuePair("Word",(szValue.length>0)? szValue : "");

                    var szFormAction = mainObject.m_szImageVerForm.match(patternYahooImageAction)[1];
                    mainObject.m_Log.Write("YahooSMTP.js - composerOnloadHandler - szFormAction " + szFormAction);
                    var szActionUrl = szFormAction.replace(/\r/g,"").replace(/\n/g,"");
                    mainObject.m_Log.Write("YahooSMTP.js - composerOnloadHandler - aszActionUrl " + szActionUrl);
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

            mainObject.m_Log.Write("YahooSMTP.js - composerOnloadHandler - END");
        }
        catch(err)
        {
            mainObject.m_Log.DebugDump("YahooSMTP.js: composerOnloadHandler : Exception : "
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
            this.m_Log.Write("YahooSMTP.js - getBcc - START");
            if (this.m_aszTo.length==0) return null;
            this.m_Log.Write("YahooSMTP.js - getBcc - szRcptList " + this.m_aszTo);

            var szBcc = null;
            var szAddress = null;
            if (szTo) szAddress = szTo;
            if (szCc) szAddress = (szTo ? (szAddress + ","+ szCc) : szCc);
            this.m_Log.Write("YahooSMTP.js - getBcc - szAddress " + szAddress);

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
            this.m_Log.Write("YahooSMTP.js - getBcc szBcc- " + szBcc);

            this.m_Log.Write("YahooSMTP.js - getBcc - End");
            return szBcc;
        }
        catch(err)
        {
            this.m_Log.DebugDump("YahooSMTP.js: getBcc : Exception : "
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
            this.m_Log.Write("YahooSMTP.js - writeImageFile - End");

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
            this.m_Log.Write("YahooSMTP.js - writeImageFile - path " + URL);

            this.m_Log.Write("YahooSMTP.js - writeImageFile - End");
            return URL;
        }
        catch(err)
        {
            this.m_Log.DebugDump("YahooSMTP.js: writeImageFile : Exception : "
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
            this.m_Log.Write("YahooSMTP : openWindow - START");

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
            this.m_Log.Write("YahooSMTP : openWindow - " + iResult);
            var szResult =  null;
            if (iResult)
            {
                szResult = params.GetString(0);
                this.m_Log.Write("YahooSMTP : openWindow - " + szResult);
            }

            this.m_Log.Write("YahooSMTP : openWindow - END");
            return szResult;
        }
        catch(err)
        {
            this.m_Log.DebugDump("YahooSMTP: Exception in openWindow : "
                                               + err.name
                                               + ".\nError message: "
                                               + err.message + "\n"
                                               + err.lineNumber);
        }
    },


    cleanHTML : function (szRaw)
    {
        this.m_Log.Write("YahooSMTP - cleanHTML");
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
            this.m_Log.Write("YahooSMTP.js - serverComms - START");
            this.m_Log.Write("YahooSMTP.js - serverComms msg " + szMsg);
            var iCount = this.m_oResponseStream.write(szMsg,szMsg.length);
            this.m_Log.Write("YahooSMTP.js - serverComms sent count: " + iCount
                                                        +" msg length: " +szMsg.length);
            this.m_Log.Write("YahooSMTP.js - serverComms - END");
        }
        catch(e)
        {
            this.m_Log.DebugDump("YahooSMTP.js: serverComms : Exception : "
                                              + e.name
                                              + ".\nError message: "
                                              + e.message+ "\n"
                                              + e.lineNumber);
        }
    }
}
