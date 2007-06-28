function HotmailSMTPScreenRipperBETA(oResponseStream, oLog, oPrefData)
{
    try
    {
        var scriptLoader = Components.classes["@mozilla.org/moz/jssubscript-loader;1"];
        scriptLoader = scriptLoader.getService(Components.interfaces.mozIJSSubScriptLoader);
        scriptLoader.loadSubScript("chrome://web-mail/content/common/DebugLog.js");
        scriptLoader.loadSubScript("chrome://web-mail/content/common/HttpComms3.js");
        scriptLoader.loadSubScript("chrome://web-mail/content/common/Email.js");
        scriptLoader.loadSubScript("chrome://hotmail/content/Hotmail-Prefs-Data.js");
        scriptLoader.loadSubScript("chrome://global/content/strres.js");
        scriptLoader.loadSubScript("chrome://hotmail/content/HTML-escape.js");

        this.m_Log = oLog;

        this.m_Log.Write("Hotmail-SR-SMTP-BETA - Constructor - START");

        this.m_szUserName = null;
        this.m_szPassWord =null;
        this.m_oResponseStream = oResponseStream;
        this.m_HttpComms = new HttpComms(this.m_Log);
        this.m_szLocationURI = null;
        this.m_szHomeURI = null;
        this.m_szComposer = null;
        this.aszTo = null;
        this.szFrom = null;
        this.m_Email = new email(this.m_Log);
        this.m_Email.decodeBody(true);
        this.m_iStage = 0;
        this.m_bAttHandled = false;
        this.m_iAttCount = 0;
        this.m_iAttUploaded = 1;
        this.m_iAttachPlaceNum = 5;
        this.m_szMT = null;

        this.m_ComponentManager = Components.classes["@mozilla.org/ComponentData2;1"]
                                          .getService(Components.interfaces.nsIComponentData2);

        this.m_bReEntry = false;

        this.m_bReUseSession = oPrefData.bReUseSession;    //do i reuse the session
        this.m_bSaveCopy= oPrefData.bSaveCopy;            //do i save copy
        this.m_bSendHtml = oPrefData.bSendHtml;          //what do i do with alternative parts

        this.m_Log.Write("Hotmail-SR-SMTP-BETA.js - Constructor - END");
    }
    catch(e)
    {
        DebugDump("Hotmail-SR-SMTP: Constructor : Exception : "
                                      + e.name
                                      + ".\nError message: "
                                      + e.message + "\n"
                                      + e.lineNumber);
    }
}




HotmailSMTPScreenRipperBETA.prototype =
{
    logIn : function(szUserName, szPassWord)
    {
        try
        {
            this.m_Log.Write("Hotmail-SR-SMTP-BETA - logIN - START");
            this.m_Log.Write("Hotmail-SR-SMTP-BETA - logIN - Username: " + szUserName
                                                   + " Password: " +  szPassWord
                                                   + " stream: " + this.m_oResponseStream);
            this.m_szUserName = szUserName.toLowerCase();
            this.m_szPassWord = szPassWord.substr(0,16);

            if (!this.m_szUserName || !this.m_oResponseStream || !this.m_szPassWord) return false;

            this.m_HttpComms.setUserName(this.m_szUserName);
            this.m_iStage= 0;
            this.m_HttpComms.setURI("http://www.hotmail.com");

            this.m_HttpComms.addRequestHeader("User-Agent", UserAgent, true);

            //get session data
            if (this.m_bReUseSession)
            {
                this.m_Log.Write("Hotmail-SR-BETA - logIN - Getting Session Data");
                this.m_szHomeURI = this.m_ComponentManager.findElement(this.m_szUserName, "szHomeURI");
                this.m_Log.Write("Hotmail-SR-BETA - logIN - szHomeURI " +this.m_szHomeURI);

                if (this.m_szHomeURI)
                {
                    this.m_Log.Write("Hotmail-SR-BETA - logIN - Session Data Found");
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

            this.m_HttpComms.setRequestMethod("GET");
            var bResult = this.m_HttpComms.send(this.loginOnloadHandler, this);
            if (!bResult) throw new Error("httpConnection returned false");

            this.m_Log.Write("Hotmail-SR-SMTP-BETA - logIN - END");
            return true;
        }
        catch(e)
        {
            this.m_Log.DebugDump("Hotmail-SR-SMTP-BETA: logIN : Exception : "
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
            mainObject.m_Log.Write("Hotmail-SR-SMTP-BETA - loginOnloadHandler - START");
            mainObject.m_Log.Write("Hotmail-SR-SMTP-BETA - loginOnloadHandler : " + mainObject.m_iStage);

            var httpChannel = event.QueryInterface(Components.interfaces.nsIHttpChannel);
            mainObject.m_Log.Write("Hotmail-SR-SMTP-BETA - loginOnloadHandler - status :" +httpChannel.responseStatus );

            //if this fails we've gone somewhere new
            if (httpChannel.responseStatus != 200 )
                throw new Error("return status " + httpChannel.responseStatus);

            mainObject.m_HttpComms.addRequestHeader("User-Agent", UserAgent, true);

            //check for java refresh
            var aRefresh = szResponse.match(patternHotmailJSRefresh);
            mainObject.m_Log.Write("Hotmail-SR-BETA-SMTP - loginOnloadHandler aRefresh "+ aRefresh);
            if (!aRefresh) aRefresh = szResponse.match(patternHotmailJSRefreshAlt);
            mainObject.m_Log.Write("Hotmail-SR-BETA-SMTP - loginOnloadHandler aRefresh "+ aRefresh);
            if (aRefresh)
            {
                mainObject.m_Log.Write("Hotmail-SR-BETA-SMTP - loginOnloadHandler - refresh ");

                mainObject.m_HttpComms.setURI(aRefresh[1]);
                mainObject.m_HttpComms.setRequestMethod("GET");

                var bResult = mainObject.m_HttpComms.send(mainObject.loginOnloadHandler, mainObject);
                if (!bResult) throw new Error("httpConnection returned false");
                return;
            }


            //page code
            switch (mainObject.m_iStage)
            {
                case 0: //login
                    var aForm = szResponse.match(patternHotmailForm);
                    if (!aForm) throw new Error("error parsing login page");

                    //get form data
                    var aInput =  aForm[0].match(patternHotmailInput);
                    mainObject.m_Log.Write("Hotmail-SR-BETA-SMTP.js - loginOnloadHandler - form data " + aInput);

                    for (i=0; i<aInput.length; i++)
                    {
                        var szType = aInput[i].match(patternHotmailType)[1];
                        mainObject.m_Log.Write("Hotmail-SR-BETA-SMTP.js - loginOnloadHandler - form type " + szType);
                        var szName = aInput[i].match(patternHotmailName)[1];
                        mainObject.m_Log.Write("Hotmail-SR-BETA-SMTP.js - loginOnloadHandler - form name " + szName);

                        var szValue = "";
                        try
                        {
                            szValue = aInput[i].match(patternHotmailValue)[1];
                            mainObject.m_Log.Write("nHotmail-SR-BETA-SMTP.js - loginOnloadHandler - form value " + szValue);
                        }
                        catch(e)
                        {
                            szValue = "";
                        }


                        if (szType.search(/submit/i)==-1)
                        {
                            if (szType.search(/radio/i)!=-1)
                            {
                                if (aInput[i].search(/checked/i)!=-1)
                                    mainObject.m_HttpComms.addValuePair(szName,szValue);
                            }
                            else
                            {
                                var szData = null;
                                if (szName.search(/login/i)!=-1)
                                    szData = escape(mainObject.m_szUserName);
                                else if (szName.search(/passwd/i)!=-1)
                                    szData = escape(mainObject.m_szPassWord);
                                else if (szName.search(/PwdPad/i)!=-1)
                                {
                                    var szPasswordPadding = "IfYouAreReadingThisYouHaveTooMuchFreeTime";
                                    var lPad=szPasswordPadding.length-mainObject.m_szPassWord.length;
                                    szData += szPasswordPadding.substr(0,(lPad<0)?0:lPad);
                                }
                                else
                                    szData = encodeURIComponent(szValue);

                                mainObject.m_HttpComms.addValuePair(szName,szData);
                            }
                        }
                    }

                    var szAction = aForm[0].match(patternHotmailAction)[1];
                    mainObject.m_Log.Write("Hotmail-SR-BETA-SMTP - loginOnloadHandler "+ szAction);
                    var szDomain = mainObject.m_szUserName.split("@")[1];
                    var szRegExp = "g_DO\\[\""+szDomain+"\"\\]=\"(.*?)\"";
                    mainObject.m_Log.Write("Hotmail-SR-BETA-SMTP- loginOnloadHandler szRegExp "+ szRegExp);
                    var regExp = new RegExp(szRegExp,"i");
                    var aszURI = szResponse.match(regExp);
                    mainObject.m_Log.Write("Hotmail-SR-BETA-SMTP- loginOnloadHandler aszURI "+ aszURI);
                    var szURI = null;
                    if (!aszURI)
                    {
                        szURI = szAction;
                    }
                    else
                    {
                        var szQS =  szResponse.match(patternHotmailQS)[1];
                        mainObject.m_Log.Write("Hotmail-SR-BETA-SMTP- loginOnloadHandler szQuery "+ szQS);
                        szURI = aszURI[1] + "?" + szQS;
                    }
                    mainObject.m_HttpComms.setURI(szURI);

                    mainObject.m_HttpComms.setRequestMethod("POST");
                    var bResult = mainObject.m_HttpComms.send(mainObject.loginOnloadHandler, mainObject);
                    if (!bResult) throw new Error("httpConnection returned false");
                    mainObject.m_iStage++;
                break;


                case 1: //inbox
                    //get urls for later use
                    var IOService = Components.classes["@mozilla.org/network/io-service;1"];
                    IOService = IOService.getService(Components.interfaces.nsIIOService);
                    var nsIURI = IOService.newURI(httpChannel.URI.spec, null, null);
                    var szDirectory = nsIURI.QueryInterface(Components.interfaces.nsIURL).directory;
                    this.m_Log.Write("Hotmail-SR-BETA-SMTP - loginOnloadHandler - directory : " +szDirectory);


                    //check for logout option
                    var aszLogoutURL = szResponse.match(patternHotmailLogOut);
                    mainObject.m_Log.Write("Hotmail-SR-BETA - loginOnloadHandler - logout : " + aszLogoutURL);

                    if (!aszLogoutURL)
                    {
                        //check for complex hotmail site
                        if (szResponse.search(patternHotmailFrame)!=-1)
                        {
                            mainObject.m_Log.Write("Hotmail-SR-BETA-SMTP - loginOnloadHandler - frame found");
                            mainObject.m_iStage = 1;
                            mainObject.m_HttpComms.setURI(httpChannel.URI.prePath + szDirectory + "TodayLight.aspx?YouChoose=true");
                            mainObject.m_HttpComms.setRequestMethod("GET");
                            var bResult = mainObject.m_HttpComms.send(mainObject.loginOnloadHandler, mainObject);
                            if (!bResult) throw new Error("httpConnection returned false");
                            return;
                        }
                        else if (mainObject.m_bReEntry)//something has gone wrong retry
                        {
                            mainObject.m_ComponentManager.deleteAllElements(mainObject.m_szUserName);

                            var oCookies = Components.classes["@mozilla.org/nsWebMailCookieManager2;1"]
                                                     .getService(Components.interfaces.nsIWebMailCookieManager2);
                            oCookies.removeCookie(mainObject.m_szUserName);

                            mainObject.m_bReEntry = false;
                            mainObject.m_iStage =0;
                            mainObject.m_HttpComms.setURI("http://www.hotmail.com");
                            mainObject.m_HttpComms.setRequestMethod("GET");
                            var bResult = mainObject.m_HttpComms.send(mainObject.loginOnloadHandler, mainObject);
                            if (!bResult) throw new Error("httpConnection returned false");
                            return;
                        }
                        else
                            throw new Error("error logging in");
                    }


                    mainObject.m_szLocationURI = httpChannel.URI.prePath + szDirectory;
                    mainObject.m_Log.Write("Hotmail-SR-BETA-SMTP - loginOnloadHandler - m_szLocationURI : "+mainObject.m_szLocationURI );

                    mainObject.m_szHomeURI = httpChannel.URI.spec;
                    mainObject.m_Log.Write("Hotmail-SR-BETA-SMTP - loginOnloadHandler - m_szHomeURI : "+mainObject.m_szHomeURI );

                    var szURL = szResponse.match(patternHotmailCompose)[1];
                    mainObject.m_Log.Write("Hotmail-SR-SMTP-BETA - loginOnloadHandler - szURL : "+szURL);
                    mainObject.m_szComposer =  mainObject.m_szLocationURI + szURL;
                    mainObject.m_Log.Write("Hotmail-SR-SMTP-BETA - loginOnloadHandler - m_szComposer : "+mainObject.m_szComposer );

                    //get cookies
                    var oCookies = Components.classes["@mozilla.org/nsWebMailCookieManager2;1"]
                                             .getService(Components.interfaces.nsIWebMailCookieManager2);
                    var szCookie = oCookies.findCookie(mainObject.m_szUserName, httpChannel.URI);
                    mainObject.m_Log.Write("Hotmail-SR-BETA - loginOnloadHandler cookies "+ szCookie);
                    mainObject.m_szMT = szCookie.match(patternHotmailMT)[1];
                    mainObject.m_Log.Write("Hotmail-SR-BETA - loginOnloadHandler mainObject.m_szMT "+ mainObject.m_szMT);

                    //server response
                    mainObject.serverComms("235 Your In\r\n");
                    mainObject.m_bAuthorised = true;
                break;
            }

            mainObject.m_Log.Write("Hotmail-SR-BETA-SMTP - loginOnloadHandler - END");
        }
        catch(err)
        {
             mainObject.m_Log.DebugDump("Hotmail-SR-BETA-SMTP: loginHandler : Exception : "
                                          + err.name
                                          + ".\nError message: "
                                          + err.message+ "\n"
                                          + err.lineNumber);

            mainObject.m_ComponentManager.deleteAllElements(mainObject.m_szUserName);

            var oCookies = Components.classes["@mozilla.org/nsWebMailCookieManager2;1"]
                                     .getService(Components.interfaces.nsIWebMailCookieManager2);
            oCookies.removeCookie(mainObject.m_szUserName);

            mainObject.serverComms("502 negative vibes from " + mainObject.m_szUserName + "\r\n");
        }
    },


    rawMSG : function ( szFrom, aszTo, szEmail)
    {
        try
        {
            this.m_Log.Write("Hotmail-SR-SMTP-BETA.js - rawMSG - START");

            if (!this.m_Email.parse(szEmail))
                throw new Error ("Parse Failed")

            this.m_aszTo = aszTo;
            this.m_szFrom = szFrom;

            this.m_HttpComms.addRequestHeader("User-Agent", UserAgent, true);
            this.m_iStage=0;
            this.m_HttpComms.setURI(this.m_szComposer);
            this.m_HttpComms.setRequestMethod("GET");
            var bResult = this.m_HttpComms.send(this.composerOnloadHandler,this);
            if (!bResult) throw new Error("httpConnection returned false");

            this.m_Log.Write("Hotmail-SR-SMTP-BETA.js - rawMSG - END");
            return true;
        }
        catch(err)
        {
            this.m_Log.DebugDump("Hotmail-SR-SMTP-BETA: rawMSG : Exception : "
                                          + err.name
                                          + ".\nError message: "
                                          + err.message+ "\n"
                                          + err.lineNumber);

            this.serverComms("502 negative vibes from " + mainObject.m_szUserName + "\r\n");
            return false;
        }
    },



    composerOnloadHandler : function(szResponse ,event , mainObject)
    {
        try
        {
            mainObject.m_Log.Write("Hotmail-SR-SMTP-BETA - composerOnloadHandler - START");
            mainObject.m_Log.Write("Hotmail-SR-SMTP-BETA - composerOnloadHandler : " + mainObject.m_iStage );

            var httpChannel = event.QueryInterface(Components.interfaces.nsIHttpChannel);
            mainObject.m_Log.Write("Hotmail-SR-SMTP-BETA.js - composerOnloadHandler - status :" +httpChannel.responseStatus );

            //if this fails we've gone somewhere new
            if (httpChannel.responseStatus != 200 )
                throw new Error("return status " + httpChannel.responseStatus);

            if (szResponse.search(/GlobalError.aspx/i)!=-1)
                throw new Error("Error parsing page");


            mainObject.m_HttpComms.addRequestHeader("User-Agent", UserAgent, true);

            if (mainObject.m_Email.attachments.length>0 && !mainObject.m_bAttHandled)
                mainObject.m_iStage = 2;


            //page code
            switch (mainObject.m_iStage)
            {
                case 0:  //MSG handler

                    mainObject.m_Log.Write("Hotmail-SR-SMTP-BETA.js - composerOnloadHandler - Send MSG");
                    var szForm = szResponse.match(patternHotmailForm)[0];
                    mainObject.m_Log.Write("Hotmail-SR-SMTP-BETA.js - composerOnloadHandler - Form " + szForm);

                    var aszInput = szForm.match(patternHotmailInput);
                    mainObject.m_Log.Write("Hotmail-SR-SMTP-BETA.js - composerOnloadHandler - szInput " + aszInput);

                    var szAction = szResponse.match(patternHotmailSend)[1];
                    mainObject.m_Log.Write("Hotmail-SR-SMTP-BETA.js - composerOnloadHandler - Action " + szAction);
                    var szURL =  mainObject.decodeHTML(mainObject.m_szLocationURI + szAction);
                    mainObject.m_Log.Write("Hotmail-SR-SMTP-BETA - composerOnloadHandler - szURL : " +szURL);

                    for (i=0; i<aszInput.length; i++)
                    {
                        mainObject.m_Log.Write("Hotmail-SR-SMTP-BETA.js - composerOnloadHandler -aszInput[i] "  +aszInput[i]);

                        var szType ="";
                        try
                        {
                            szType = aszInput[i].match(patternHotmailType)[1];
                        }
                        catch(err){}

                        if (szType.search(/submit/i)==-1 && szType.search(/image/i)==-1 && aszInput[i].search(/name/i)!=-1)
                        {
                            var szName = aszInput[i].match(patternHotmailName)[1];
                            var szValue = "";
                            try
                            {
                                szValue = aszInput[i].match(patternHotmailValue)[1];
                            }
                            catch(err){}

                            if (szName.search(/fMessageBody/i)==-1)
                            {
                                if (szName.search(/fTo/i)!=-1)
                                {
                                    szValue = mainObject.m_Email.headers.getTo();

                                }
                                else if (szName.search(/fCc/i)!=-1)
                                {
                                    var szCc = mainObject.m_Email.headers.getCc();
                                    szValue = szCc? szCc : "";
                                }
                                else if (szName.search(/fBcc/i)!=-1)
                                {
                                    var szTo = mainObject.m_Email.headers.getTo();
                                    var szCc = mainObject.m_Email.headers.getCc();
                                    var szBCC =  mainObject.getBcc(szTo, szCc);
                                    szValue = szBCC? szBCC : "";
                                }
                                else if (szName.search(/fSubject/i)!=-1)
                                {
                                    var szSubject = mainObject.m_Email.headers.getSubject();
                                    szValue = szSubject? szSubject : "";
                                }
                                else if (szName.search(/ToolbarActionItem/i)!=-1)
                                {
                                    szValue = "SendMessage";
                                }
                                else if (szName.search(/mt/i)!=-1)
                                {
                                    szValue = mainObject.m_szMT;
                                }
                                mainObject.m_HttpComms.addValuePair(szName, szValue);
                            }
                        }
                    }

                    var aszFromDate = szForm.match(patternHotmailFromBeta);
                    mainObject.m_Log.Write("Hotmail-SR-SMTP-BETA.js - composerOnloadHandler aszFromDate " + aszFromDate);
                    mainObject.m_HttpComms.addValuePair(aszFromDate[1], aszFromDate[2]);


                    mainObject.m_HttpComms.addValuePair("MsgPriority", "0");

                    if (mainObject.m_Email.txtBody && !mainObject.m_bSendHtml || !mainObject.m_Email.htmlBody)
                    {
                        mainObject.m_Log.Write("Hotmail-SR-SMTP.js - composerOnloadHandler - plain");
                        var szBody = mainObject.m_Email.txtBody.body.getBody();
                        szBody = mainObject.encodeHTML(szBody);

                        var szContentType = null;
                        if (mainObject.m_Email.txtBody.headers)
                            szContentType = mainObject.m_Email.txtBody.headers.getContentType(0);
                        else
                            szContentType = mainObject.m_Email.headers.getContentType(0);
                        mainObject.m_Log.Write("Hotmail-SR-SMTP-BETA.js - composerOnloadHandler szContentType " + szContentType);
                        if (szContentType)
                        {
                            if (szContentType.search(/charset/i)!=-1)
                            {
                                var szCharset = null;
                                if (szContentType.search(/charset=(.*?);\s/i)!=-1)
                                    szCharset = szContentType.match(/charset=(.*?);\s/i)[1];
                                else
                                   szCharset = szContentType.match(/charset=(.*?)$/i)[1];
                                mainObject.m_Log.Write("Hotmail-SR-SMTP-BETA.js - composerOnloadHandler -szCharset " + szCharset);
                                var Converter = Components.classes["@mozilla.org/intl/scriptableunicodeconverter"]
                                                          .getService(Components.interfaces.nsIScriptableUnicodeConverter);
                                Converter.charset =  szCharset;
                                var unicode =  Converter.ConvertToUnicode(szBody);
                                Converter.charset = "utf-8";
                                var szDecoded = Converter.ConvertFromUnicode(unicode);
                                this.m_Log.Write("Hotmail-SR-BETA - emailOnloadHandler - utf-8 "+szDecoded);

                                szBody = szDecoded;
                            }
                        }

                        mainObject.m_HttpComms.addValuePair("fMessageBody", szBody);
                        mainObject.m_HttpComms.addValuePair("editmessagearea", szBody);
                    }
                    else if (mainObject.m_Email.htmlBody && mainObject.m_bSendHtml || !mainObject.m_Email.txtBody)
                    {
                        mainObject.m_Log.Write("Hotmail-SR-SMTP.js - composerOnloadHandler - html");
                        var szHTMLBody = mainObject.m_Email.htmlBody.body.getBody();
                        //var szHTMLBody = "<font size=\"7\">another test</font><br><big>test</big><br>test"
                        szHTMLBody = szHTMLBody.match(/<body.*?>[\s\S]*<\/body>/)[0];
                        szHTMLBody = szHTMLBody.replace(/body/ig,"span");
                        szHTMLBody = szHTMLBody.replace(/\r?\n/g,"<br>");
                        mainObject.m_HttpComms.addValuePair("fMessageBody", szHTMLBody);
                        mainObject.m_HttpComms.addValuePair("editmessagearea", szHTMLBody);
                    }

                    mainObject.m_HttpComms.setURI(szURL);
                    mainObject.m_HttpComms.setRequestMethod("POST");
                    mainObject.m_HttpComms.setContentType("multipart/form-data");
                    var bResult = mainObject.m_HttpComms.send(mainObject.composerOnloadHandler, mainObject);
                    if (!bResult) throw new Error("httpConnection returned false");
                    mainObject.m_iStage = 1;
                break;



                case 1: //MSG OK handler
                    mainObject.m_Log.Write("Hotmail-SR-SMTP-BETA.js - composerOnloadHandler - MSG OK");
                    if (szResponse.search(patternHotmailSentOK)!=-1)
                    {
                        if (mainObject.m_bReUseSession)
                        {
                            mainObject.m_Log.Write("Hotmail-SR-BETA - composerOnloadHandler - Setting Session Data");

                            mainObject.m_ComponentManager.addElement(mainObject.m_szUserName, "szHomeURI", mainObject.m_szHomeURI);
                        }
                        else
                        {
                            mainObject.m_Log.Write("Hotmail-SR-BETA - composerOnloadHandler - removing Session Data");
                            mainObject.m_ComponentManager.deleteAllElements(mainObject.m_szUserName);

                            var oCookies = Components.classes["@mozilla.org/nsWebMailCookieManager2;1"]
                                                     .getService(Components.interfaces.nsIWebMailCookieManager2);
                            oCookies.removeCookie(mainObject.m_szUserName);
                        }

                        mainObject.serverComms("250 OK\r\n");
                    }
                    else
                        mainObject.serverComms("502 Failed\r\n");
                break;



                case 2: //Add Attachment Request
                    mainObject.m_Log.Write("Hotmail-SR-SMTP-BETA.js - composerOnloadHandler - Attach Request");

                    var szForm = szResponse.match(patternHotmailForm)[0];
                    mainObject.m_Log.Write("Hotmail-SR-SMTP-BETA.js - composerOnloadHandler - Form " + szForm);

                    var aszInput = szForm.match(patternHotmailInput);
                    mainObject.m_Log.Write("Hotmail-SR-SMTP-BETA.js - composerOnloadHandler - szInput " + aszInput);

                    var szAction = szResponse.match(patternHotmailAddAttachment)[1];
                    mainObject.m_Log.Write("Hotmail-SR-SMTP-BETA.js - composerOnloadHandler - Action " + szAction);
                    var szURL =  mainObject.decodeHTML(mainObject.m_szLocationURI + szAction);
                    mainObject.m_Log.Write("Hotmail-SR-SMTP-BETA - composerOnloadHandler - szURL : " +szURL);

                    mainObject.m_bAttHandled = true;

                    for (i=0; i<aszInput.length; i++)
                    {
                        mainObject.m_Log.Write("Hotmail-SR-SMTP-BETA.js - composerOnloadHandler -aszInput[i] "  +aszInput[i]);

                        var szType ="";
                        try
                        {
                            szType = aszInput[i].match(patternHotmailType)[1];
                        }
                        catch(err){}

                        if (szType.search(/submit/i)==-1 && szType.search(/image/i)==-1 && aszInput[i].search(/name/i)!=-1 )
                        {
                            var szName = aszInput[i].match(patternHotmailName)[1];
                            var szValue = "";
                            try
                            {
                                szValue = aszInput[i].match(patternHotmailValue)[1];
                            }
                            catch(err){}

                            if (szName.search(/ToolbarActionItem/i)!=-1)
                            {
                                szValue = "AddAttachment";
                            }
                            else if (szName.search(/mt/i)!=-1)
                            {
                                szValue = mainObject.m_szMT;
                            }
                            mainObject.m_HttpComms.addValuePair(szName, szValue);
                        }
                    }

                    mainObject.m_HttpComms.addValuePair("fMessageBody", "");

                    mainObject.m_HttpComms.setURI(szURL);
                    mainObject.m_HttpComms.setRequestMethod("POST");
                    mainObject.m_HttpComms.setContentType("multipart/form-data");
                    var bResult = mainObject.m_HttpComms.send(mainObject.composerOnloadHandler, mainObject);
                    if (!bResult) throw new Error("httpConnection returned false");
                    mainObject.m_iStage = 3;
                break;



                case 3: //Add Attach
                    mainObject.m_Log.Write("Hotmail-SR-SMTP-BETA.js - composerOnloadHandler - Add Files");

                    var szForm = szResponse.match(patternHotmailForm)[0];
                    mainObject.m_Log.Write("Hotmail-SR-SMTP-BETA.js - composerOnloadHandler - Form " + szForm);

                    var aszInput = szForm.match(patternHotmailInput);
                    mainObject.m_Log.Write("Hotmail-SR-SMTP-BETA.js - composerOnloadHandler - szInput " + aszInput);

                    var szAction = szResponse.match(patternHotmailLastAttachment)[1];
                    mainObject.m_Log.Write("Hotmail-SR-SMTP-BETA.js - composerOnloadHandler - Action " + szAction);
                    var szURL =  mainObject.decodeHTML(mainObject.m_szLocationURI + szAction);
                    mainObject.m_Log.Write("Hotmail-SR-SMTP-BETA - composerOnloadHandler - szURL : " +szURL);
                    mainObject.m_HttpComms.setURI(szURL);

                    for (i=0; i<aszInput.length; i++)
                    {
                        mainObject.m_Log.Write("Hotmail-SR-SMTP-BETA.js - composerOnloadHandler -aszInput[i] "  +aszInput[i]);

                        var szType ="";
                        try
                        {
                            szType = aszInput[i].match(patternHotmailType)[1];
                        }
                        catch(err){}

                        if (szType.search(/submit/i)==-1 && szType.search(/image/i)==-1 && aszInput[i].search(/name/i)!=-1 )
                        {
                            var szName = aszInput[i].match(patternHotmailName)[1];
                            var szValue = "";
                            try
                            {
                                szValue = aszInput[i].match(patternHotmailValue)[1];
                            }
                            catch(err){}

                            if (szName.search(/FileUpload/i)!=-1)
                            {
                                 //headers
                                var oAttach = mainObject.m_Email.attachments[mainObject.m_iAttCount];
                                var szFileName = oAttach.headers.getContentType(4);
                                if (!szFileName) szFileName = "";

                                //body
                                var szBody = oAttach.body.getBody();
                                mainObject.m_HttpComms.addFile(szName, szFileName, szBody);
                                mainObject.m_iAttCount++;
                            }
                            else if (szName.search(/ToolbarActionItem/i)!=-1)
                            {
                                mainObject.m_HttpComms.addValuePair(szName, "UploadAttachment");
                            }
                            else if (szName.search(/mt/i)!=-1)
                            {
                                mainObject.m_HttpComms.addValuePair(szName,  mainObject.m_szMT);
                            }
                            else if (szName.search(/AutoSavedMsgId/i)!=-1)
                            {
                                var szClean = new HTMLescape().decode(szValue)
                                mainObject.m_HttpComms.addValuePair(szName,  szClean);
                            }
                            else
                                mainObject.m_HttpComms.addValuePair(szName, szValue);
                        }
                    }

                    if (mainObject.m_iAttCount < mainObject.m_Email.attachments.length)
                    {
                        mainObject.m_iStage = 2;
                    }
                    else
                    {
                        mainObject.m_iStage = 0;
                    }

                    mainObject.m_HttpComms.setRequestMethod("POST");
                    mainObject.m_HttpComms.setContentType("multipart/form-data");
                    var bResult = mainObject.m_HttpComms.send(mainObject.composerOnloadHandler, mainObject);
                    if (!bResult) throw new Error("httpConnection returned false");
                break;
            };

            mainObject.m_Log.Write("Hotmail-SR-SMTP-BETA.js - composerOnloadHandler - END");
        }
        catch(err)
        {
            mainObject.m_Log.DebugDump("Hotmail-SR-SMTP-BETA.js: composerOnloadHandler : Exception : "
                                          + err.name
                                          + ".\nError message: "
                                          + err.message +"\n" +
                                            err.lineNumber);

            mainObject.serverComms("502 negative vibes from " + mainObject.m_szUserName + "\r\n");
        }
    },



    getBcc : function (szTo,szCc)
    {
        try
        {
            this.m_Log.Write("Hotmail-SR-SMTP-BETA.js - getBcc - START");
            if (this.m_aszTo.length==0) return null;
            this.m_Log.Write("Hotmail-SR-SMTP-BETA.js - getBcc - szRcptList " + this.m_aszTo);

            var szBcc = null;
            var szAddress = null;
            if (szTo) szAddress = szTo;
            if (szCc) szAddress = (szTo ? (szAddress + ","+ szCc) : szCc);
            this.m_Log.Write("Hotmail-SR-SMTP-BETA.js - getBcc - szAddress " + szAddress);

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
            this.m_Log.Write("Hotmail-SR-SMTP-BETA.js - getBcc szBcc- " + szBcc);

            this.m_Log.Write("Hotmail-SR-SMTP-BETA.js - getBcc - End");
            return szBcc;
        }
        catch(err)
        {
            this.m_Log.DebugDump("Hotmail-SR-SMTP-BETA.js: getBcc : Exception : "
                                                  + err.name
                                                  + ".\nError message: "
                                                  + err.message + "\n"
                                                  + err.lineNumber);

            return null;
        }
    },


    decodeHTML : function (szRaw)
    {
        this.m_Log.Write("Hotmail-SR-SMTP-BETA - decodeHTML - START");
        var szMsg = szRaw.replace(/&lt;/g,"<");
        szMsg = szMsg.replace(/&gt;/g,">");
        szMsg = szMsg.replace(/&quot;/g, "\"");
        szMsg = szMsg.replace(/&amp;/g, "&");
        szMsg = szMsg.replace(/&nbsp;/g, " ");
        szMsg = szMsg.replace(/<strong>/g, "");
        szMsg = szMsg.replace(/<\/strong>/g, "");
        this.m_Log.Write("Hotmail-SR-SMTP-BETA - decodeHTML - ENd")
        return szMsg;
    },


   encodeHTML : function (szRaw)
   {
        this.m_Log.Write("Hotmail-SR-SMTP-BETA - encodeHTML - START");
        var szMsg = szRaw.replace(/&/g,"&amp;");
        szMsg = szMsg.replace(/</g,"&lt;");
        szMsg = szMsg.replace(/>/g,"&gt;");
        szMsg = szMsg.replace(/\r?\n/g,"\r\n<br>");
        this.m_Log.Write("Hotmail-SR-SMTP-BETA - encodeHTML - ENd")
        return szMsg;

   },

    serverComms : function (szMsg)
    {
        try
        {
            this.m_Log.Write("Hotmail-SR-SMTP-BETA - serverComms - START");
            this.m_Log.Write("Hotmail-SR-SMTP-BETA - serverComms msg " + szMsg);
            var iCount = this.m_oResponseStream.write(szMsg,szMsg.length);
            this.m_Log.Write("Hotmail-SR-SMTP-BETA - serverComms sent count: " + iCount
                                                        +" msg length: " +szMsg.length);
            this.m_Log.Write("Hotmail-SR-SMTP-BETA - serverComms - END");
        }
        catch(e)
        {
            this.m_Log.DebugDump("Hotmail-SR-SMTP-BETA: serverComms : Exception : "
                                              + e.name
                                              + ".\nError message: "
                                              + e.message+ "\n"
                                              + e.lineNumber);
        }
    }
}
