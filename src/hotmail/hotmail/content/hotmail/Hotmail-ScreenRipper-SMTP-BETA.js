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
        scriptLoader.loadSubScript("chrome://hotmail/content/HTML-escape.js");

        this.m_Log = oLog;

        this.m_Log.Write("Hotmail-SR-SMTP-BETA - Constructor - START");

        this.m_szUserName = null;
        this.m_szPassWord =null;
        this.m_oResponseStream = oResponseStream;
        this.m_HttpComms = new HttpComms(this.m_Log);
        this.m_HttpComms.setUserAgentOverride(true);
                    
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
            this.m_HttpComms.setURI("http://mail.live.com");

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

            //check for java refresh
            var aRefresh = szResponse.match(patternHotmailJSRefresh); 
            if (!aRefresh) aRefresh = szResponse.match(patternHotmailJSRefreshAlt);
            if (!aRefresh) aRefresh = szResponse.match(patternHotmailRefresh2);  
            mainObject.m_Log.Write("Hotmail-SR-BETA-SMTP - loginOnloadHandler aRefresh "+ aRefresh);
            if (aRefresh)
            {
                mainObject.m_Log.Write("Hotmail-SR-BETA - loginOnloadHandler - refresh ");

                mainObject.m_HttpComms.setURI(aRefresh[1]);
                mainObject.m_HttpComms.setRequestMethod("GET");

                var bResult = mainObject.m_HttpComms.send(mainObject.loginOnloadHandler, mainObject);
                if (!bResult) throw new Error("httpConnection returned false");
                return;
            }

            var aForm = szResponse.match(patternHotmailLoginForm);
            mainObject.m_Log.Write("Hotmail-SR-BETA - loginOnloadHandler aForm "+ aForm);
            if (aForm)
            {
                var szURL = aForm[0].match(patternHotmailAction);
                mainObject.m_HttpComms.setURI(szURL[1]);
                mainObject.m_HttpComms.setRequestMethod("POST");
                var szInput = aForm[0].match(patternHotmailInput);
                var szName = szInput[0].match(patternHotmailName)[1];
                var szValue = szInput[0].match(patternHotmailValue)[1];
                mainObject.m_HttpComms.addValuePair(szName, szValue);

                var bResult = mainObject.m_HttpComms.send(mainObject.loginOnloadHandler, mainObject);
                if (!bResult) throw new Error("httpConnection returned false");
                return;
            }
            
            //page code
            switch (mainObject.m_iStage)
            {
                case 0: //login
                    var szURL = szResponse.match(patternHotmailLoginURL)[1];            
                    mainObject.m_Log.Write("Hotmail-SR-BETA loginOnloadHandler - szURL :" +szURL);
                    if (!szURL) throw new Error("error parsing login page");

                    //get form data
                    mainObject.m_HttpComms.addValuePair("idsbho","1");
                    
                    var szPasswordPadding = "IfYouAreReadingThisYouHaveTooMuchFreeTime";
                    var lPad=szPasswordPadding.length-mainObject.m_szPassWord.length;
                    szData = szPasswordPadding.substr(0,(lPad<0)?0:lPad);
                    mainObject.m_HttpComms.addValuePair("PwdPad",szData);
                    
                    mainObject.m_HttpComms.addValuePair("loginOptions","2");
                    mainObject.m_HttpComms.addValuePair("CS","");
                    mainObject.m_HttpComms.addValuePair("FedState","");
                    
                    var szBlob = szResponse.match(patternHotmailSRBlob)[1];   
                    mainObject.m_Log.Write("Hotmail-SR - loginOnloadHandler - szBlob :" +szBlob);
                    mainObject.m_HttpComms.addValuePair("PPSX",szBlob);
                   
                    mainObject.m_HttpComms.addValuePair("login",mainObject.urlEncode(mainObject.m_szUserName));
                    mainObject.m_HttpComms.addValuePair("passwd",mainObject.urlEncode(mainObject.m_szPassWord));       
                    mainObject.m_HttpComms.addValuePair("remMe","1");
                    mainObject.m_HttpComms.addValuePair("NewUser","1");
                    
                    var szSFT = szResponse.match(patternHotmailSFT)[1];   
                    mainObject.m_Log.Write("Hotmail-SR - loginOnloadHandler - szSFT :" +szSFT);
                    mainObject.m_HttpComms.addValuePair("PPFT",szSFT);

                    mainObject.m_HttpComms.setURI(szURL);
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

                    var oCookies = Components.classes["@mozilla.org/nsWebMailCookieManager2;1"]
                                             .getService(Components.interfaces.nsIWebMailCookieManager2);
                                             
                    //check for logout option
                    if (szResponse.search(patternHotmailLogOut)==-1)
                    {
                        mainObject.m_Log.Write("Hotmail-SR-BETA - loginOnloadHandler - logout not found : ");
                        //check for complex hotmail site
                        if (szResponse.search(patternHotmailFrame)!=-1)
                        {
                            mainObject.m_Log.Write("Hotmail-SR-BETA-SMTP - loginOnloadHandler - frame found");
                            mainObject.m_iStage = 1;
                            oCookies.addCookie(mainObject.m_szUserName, httpChannel.URI, "lr=1;");
                            var szLight = szResponse.match(patternHotmailLight)[1]; 
                            mainObject.m_Log.Write("Hotmail-SR-BETA-SMTP - loginOnloadHandler - szLight " + szLight);
                            mainObject.m_HttpComms.setURI(httpChannel.URI.prePath + szLight);
                            mainObject.m_HttpComms.setRequestMethod("GET");
                            var bResult = mainObject.m_HttpComms.send(mainObject.loginOnloadHandler, mainObject);
                            if (!bResult) throw new Error("httpConnection returned false");
                            return;
                        }
                        else if (mainObject.m_bReEntry)//something has gone wrong retry
                        {
                            mainObject.m_ComponentManager.deleteAllElements(mainObject.m_szUserName);

                            oCookies.removeCookie(mainObject.m_szUserName);

                            mainObject.m_bReEntry = false;
                            mainObject.m_iStage =0;
                            mainObject.m_HttpComms.setURI("http://mail.live.com");
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

            if (mainObject.m_Email.attachments.length>0 && !mainObject.m_bAttHandled)
                mainObject.m_iStage = 2;

            //page code
            switch (mainObject.m_iStage)
            {
                case 0:  //MSG handler

                    mainObject.m_Log.Write("Hotmail-SR-SMTP-BETA.js - composerOnloadHandler - Send MSG");
                    var szForm;
                    try
                    {
                        szForm = szResponse.match(patternHotmailSMTPForm)[0];
                    }
                    catch(err)
                    {
                        szForm = szResponse.match(patternHotmailForm)[0];  
                    }
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
                    var szSenderAddress = new HTMLescape().decode(aszFromDate[2]) 
                    mainObject.m_HttpComms.addValuePair(aszFromDate[1], szSenderAddress);


                    mainObject.m_HttpComms.addValuePair("MsgPriority", "0");
                    
                    var szBody = "";     
                    var szContentType = null;               
                    if (mainObject.m_Email.txtBody && !mainObject.m_bSendHtml || !mainObject.m_Email.htmlBody)
                    {
                        mainObject.m_Log.Write("Hotmail-SR-SMTP.js - composerOnloadHandler - plain");
                        if (mainObject.m_Email.txtBody.headers)
                            szContentType = mainObject.m_Email.txtBody.headers.getContentType(0);
                        else
                            szContentType = mainObject.m_Email.headers.getContentType(0);
                        szBody = mainObject.m_Email.txtBody.body.getBody();
                        szBody = szBody.replace(/\r?\n/g,"<br>");
                    }
                    else if (mainObject.m_Email.htmlBody && mainObject.m_bSendHtml || !mainObject.m_Email.txtBody)
                    {
                        mainObject.m_Log.Write("Hotmail-SR-SMTP.js - composerOnloadHandler - html");
                        szContentType = mainObject.m_Email.headers.getContentType(0);
                        szBody = mainObject.m_Email.htmlBody.body.getBody();
                        //var szHTMLBody = "<font size=\"7\">another test</font><br><big>test</big><br>test"
                        szBody = szBody.match(/<body.*?>([\s\S]*)<\/body>/)[1];
                    }
                    
                    mainObject.m_Log.Write("Hotmail-SR-SMTP-BETA.js - composerOnloadHandler szContentType " + szContentType);
                    if (szContentType)
                    {
                        if (szContentType.search(/charset/i)!=-1)
                        {
                            var szCharset = null;
                            if (szContentType.search(/charset=['|"]*(.*?)['|"]*;\s/i)!=-1)
                                szCharset = szContentType.match(/charset=['|"]*(.*?)['|"]*;\s/i)[1];
                            else
                               szCharset = szContentType.match(/charset=['|"]*(.*?)['|"]*$/i)[1];
                            mainObject.m_Log.Write("Hotmail-SR-SMTP-BETA.js - composerOnloadHandler -szCharset " + szCharset);
                            if (szCharset)
                            {
                                szBody = mainObject.convertToUTF8(szBody,szCharset);                                 
                                mainObject.m_Log.Write("Hotmail-SR-BETA - emailOnloadHandler - utf-8 "+szBody);
                            }
                        }
                    }
                    
                    
                    mainObject.m_HttpComms.addValuePair("fMessageBody", szBody);
                    mainObject.m_HttpComms.addValuePair("editmessagearea", szBody);
                    
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

                    var szForm = szResponse.match(patternHotmailSMTPForm)[0];
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

                    var szForm = szResponse.match(patternHotmailSMTPForm)[0];
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


    convertToUTF8 : function (szRawMSG, szCharset)
    {
        this.m_Log.Write("Hotmail-SR-SMTP-BETA - convertToUTF8 START " +szCharset );

        var aszCharset = new Array( "ISO-2022-CN" , "ISO-2022-JP"  , "ISO-2022-KR" , "ISO-8859-1"  , "ISO-8859-10",
                                    "ISO-8859-11" , "ISO-8859-12"  , "ISO-8859-13" , "ISO-8859-14" , "ISO-8859-15",
                                    "ISO-8859-16" , "ISO-8859-2"   , "ISO-8859-3"  , "ISO-8859-4"  , "ISO-8859-5" ,
                                    "ISO-8859-6"  , "ISO-8859-6-E" , "ISO-8859-6-I", "ISO-8859-7"  , "ISO-8859-8" ,
                                    "ISO-8859-8-E", "ISO-8859-8-I" , "ISO-8859-9"  , "ISO-IR-111"  ,
                                    "UTF-8"       , "UTF-16"       , "UTF-16BE"    , "UTF-16LE"    , "UTF-32BE"   ,
                                    "UTF-32LE"    , "UTF-7"        ,
                                    "IBM850"      , "IBM852"       , "IBM855"      , "IBM857"      , "IBM862"     ,
                                    "IBM864"      , "IBM864I"      , "IBM866"      ,
                                    "WINDOWS-1250", "WINDOWS-1251" , "WINDOWS-1252", "WINDOWS-1253", "WINDOWS-1254",
                                    "WINDOWS-1255", "WINDOWS-1256" , "WINDOWS-1257", "WINDOWS-1258", "WINDOWS-874" ,
                                    "WINDOWS-936" ,
                                    "BIG5"        , "BIG5-HKSCS"   , "EUC-JP"      , "EUC-KR"      , "GB2312"     ,
                                    "X-GBK"       , "GB18030"      , "HZ-GB-2312"  , "ARMSCII-8"   , "GEOSTD8"    ,
                                    "KOI8-R"      , "KOI8-U"       , "SHIFT_JIS"   , "T.61-8BIT"   , "TIS-620"    ,
                                    "US-ASCII"    , "VIQR"         , "VISCII"      ,
                                    "X-EUC-TW"       , "X-JOHAB"                , "X-MAC-ARABIC"          , "X-MAC-CE"       ,
                                    "X-MAC-CROATIAN" , "X-MAC-GREEK"            , "X-MAC-HEBREW"          , "X-MAC-ROMAN"    ,
                                    "X-MAC-TURKISH"  , "X-MAC-ICELANDIC"        , "X-U-ESCAPED"           , "X-MAC-CYRILLIC" ,
                                    "X-MAC-UKRAINIAN", "X-MAC-ROMANIAN"         , "X-OBSOLETED-EUC-JP"    , "X-USER-DEFINED" ,
                                    "X-VIET-VNI"     , "X-VIET-VPS"             , "X-IMAP4-MODIFIED-UTF7" , "X-VIET-TCVN5712",
                                    "X-WINDOWS-949"  , "X-OBSOLETED-ISO-2022-JP", "X-OBSOLETED-SHIFT_JIS"
                                  );

        var szUseCharSet = "US-ASCII";
        var i = 0;
        var bFound = false;
        do{
            if (aszCharset[i] == szCharset.toUpperCase())
            {
                bFound = true;
                szUseCharSet =  szCharset.toUpperCase();
            }
            i++;
        }while (i<aszCharset.length && !bFound)
        this.m_Log.Write("Hotmail-SR-SMTP-BETA - convertToUTF8 use charset " + szUseCharSet);

        var Converter = Components.classes["@mozilla.org/intl/scriptableunicodeconverter"]
                                  .getService(Components.interfaces.nsIScriptableUnicodeConverter);
        Converter.charset =  szUseCharSet;
        var unicode =  Converter.ConvertToUnicode(szRawMSG);
        Converter.charset = "UTF-8";
        var szDecoded = Converter.ConvertFromUnicode(unicode)+ Converter.Finish();
        this.m_Log.Write("YahooSMTPBETA - convertToUTF8 - "+szDecoded);

        this.m_Log.Write("Hotmail-SR-SMTP-BETA - convertToUTF8 END");
        return szDecoded;
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


    urlEncode : function (szData)
    {
        var szEncoded = encodeURIComponent(szData);
        szEncoded = szEncoded.replace(/!/g,"%21");
        return szEncoded;

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
