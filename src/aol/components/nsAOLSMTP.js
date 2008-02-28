/*****************************  Globals   *************************************/
const nsAOLSMTPClassID = Components.ID("{411242b0-9b47-11da-a72b-0800200c9a66}");
const nsAOLSMTPContactID = "@mozilla.org/AOLSMTP;1";
const ExtAOLGuid = "{3c8e8390-2cf6-11d9-9669-0800200c9a66}";

/******************************  AOL ***************************************/
function nsAOLSMTP()
{
    try
    {
        var scriptLoader =  Components.classes["@mozilla.org/moz/jssubscript-loader;1"];
        scriptLoader = scriptLoader.getService(Components.interfaces.mozIJSSubScriptLoader);
        scriptLoader.loadSubScript("chrome://web-mail/content/common/DebugLog.js");
        scriptLoader.loadSubScript("chrome://web-mail/content/common/base64.js");
        scriptLoader.loadSubScript("chrome://web-mail/content/common/HttpComms3.js");
        scriptLoader.loadSubScript("chrome://web-mail/content/common/CommonPrefs.js");
        scriptLoader.loadSubScript("chrome://web-mail/content/common/Email.js");

        var date = new Date();
        var  szLogFileName = "AOLSMTP Log - " + date.getHours()
                                           + "-" + date.getMinutes()
                                           + "-"+ date.getUTCMilliseconds() +" -";
        this.m_Log = new DebugLog("webmail.logging.comms", ExtAOLGuid, szLogFileName);
        this.m_Log.Write("nsAOLSMTP.js - Constructor - START");

        if (typeof kAOLConstants == "undefined")
        {
            this.m_Log.Write("nsLycos.js - Constructor - loading constants");
            scriptLoader.loadSubScript("chrome://aol/content/AOL-Constants.js");
        }

        this.m_bAuthorised = false;
        this.m_szUserName = null;
        this.m_szLoginUserName = null;
        this.m_szRealUserName = null;
        this.m_szPassWord = null;
        this.m_aszTo = new Array;
        this.m_szFrom = null;
        this.m_oResponseStream = null;
        this.m_bAuthorised = false;
        this.m_HttpComms = new HttpComms(this.m_Log);
        this.m_iStage = 0;

        this.m_szHomeURI = null;
        this.m_szUserId = null;
        this.m_szVersion = null;
        this.m_szLocation = null;
        this.m_bReEntry = false;
        this.m_szAOLMail = null;
        this.m_szSendUri = null;
        this.m_Email = new email(this.m_Log);
        this.m_Email.decodeBody(true);
        this.m_iAttCount = 0;

        this.m_ComponentManager = Components.classes["@mozilla.org/ComponentData2;1"]
                                            .getService(Components.interfaces.nsIComponentData2);

        //do i reuse the session
        this.m_bReUseSession=true;
        var oPref = {Value:null};
        var  WebMailPrefAccess = new WebMailCommonPrefAccess();
        if (WebMailPrefAccess.Get("bool","aol.bReUseSession",oPref))
            this.m_bReUseSession=oPref.Value;

        delete WebMailPrefAccess;

        this.m_Log.Write("nsAOLSMTP.js - Constructor - END");
    }
    catch(e)
    {
        DebugDump("nsAOLSMTP.js: Constructor : Exception : "
                                      + e.name
                                      + ".\nError message: "
                                      + e.message +"\n" +
                                      e.lineNumber);
    }
}



nsAOLSMTP.prototype =
{
    get userName() {return this.m_szUserName;},
    set userName(userName) {return this.m_szUserName = userName;},

    get passWord() {return this.m_szPassWord;},
    set passWord(passWord) {return this.m_szPassWord = passWord;},

    get bAuthorised()
    {
        return this.m_bAuthorised;
    },

    get ResponseStream() {return this.m_oResponseStream;},
    set ResponseStream(responseStream) {return this.m_oResponseStream = responseStream;},

    get to() {return this.m_aszTo;},
    set to(szAddress) {return this.m_aszTo.push(szAddress);},

    get from() {return this.m_szFrom;},
    set from(szAddress) {return this.m_szFrom = szAddress;},


    logIn : function()
    {
        try
        {
            this.m_Log.Write("nsAOL.js - logIN - START");
            this.m_Log.Write("nsAOL.js - logIN - Username: " + this.m_szUserName
                                                   + " Password: "  + this.m_szPassWord
                                                   + " stream: "    + this.m_oResponseStream);

            if (!this.m_szUserName || !this.m_oResponseStream || !this.m_szPassWord) return false;

            var szTempUserName = this.m_szUserName.split("@");
            this.m_Log.Write("nsAOLSMTP.js - logIN - doamain " + szTempUserName);
            var szDomain = szTempUserName[1];
            this.m_szLoginUserName =szTempUserName[0];
            var szDomain = szTempUserName[1];
            if (szDomain.search(/aol/i)==-1 && szDomain.search(/aim/i)==-1 && szDomain.search(/netscape/i)==-1)
            {
                this.m_szLoginUserName = this.m_szUserName;
            }

            this.m_szAOLMail= "http://webmail.aol.com";
            this.m_iStage = 0;
            this.m_HttpComms.setURI(this.m_szAOLMail);
            this.m_HttpComms.setRequestMethod("GET");
            this.m_HttpComms.setUserName(this.m_szUserName);

            //get session data
            if (this.m_bReUseSession)
            {
                this.m_Log.Write("nsAOLSMTP.js - logIN - Session Data found");
                this.m_szHomeURI = this.m_ComponentManager.findElement(this.m_szUserName, "szHomeURI");
                this.m_Log.Write("Hotmail-SR - logIN - szHomeURI " +this.m_szHomeURI);

                if (this.m_szHomeURI)
                {
                    this.m_Log.Write("nsAOLSMTP.js - logIN - Session Data Found");
                    this.m_iStage =4;
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

            var bResult = this.m_HttpComms.send(this.loginOnloadHandler, this);
            if (!bResult) throw new Error("httpConnection returned false");

            this.m_Log.Write("nsAOL.js - logIN - END " + bResult);
            return true;
        }
        catch(e)
        {
            this.m_Log.DebugDump("nsAOL.js: logIN : Exception : "
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
            mainObject.m_Log.Write("nsAOL.js - loginOnloadHandler - START");
            mainObject.m_Log.Write("nsAOL.js - loginOnloadHandler : " + mainObject.m_iStage);

            var httpChannel = event.QueryInterface(Components.interfaces.nsIHttpChannel);

            //if this fails we've gone somewhere new
            mainObject.m_Log.Write("AOLSMTP.js - loginOnloadHandler - status :" +httpChannel.responseStatus );
            if (httpChannel.responseStatus != 200)
                throw new Error("return status " + httpChannel.responseStatus);


             //page code
            switch (mainObject.m_iStage)
            {
                case 0: //login page
                    var szLoginForm = szResponse.match(patternAOLLoginForm);
                    mainObject.m_Log.Write("AOLSMTP.js - loginOnloadHandler - szLoginForm " + szLoginForm);
                    if (szLoginForm == null)
                        throw new Error("error parsing AOL login web page");

                    var aLoginData = szLoginForm[0].match(patternAOLInput);
                    mainObject.m_Log.Write("AOLSMTP.js - loginOnloadHandler - aLoginData " + aLoginData);

                    for (i=0; i<aLoginData.length; i++)
                    {
                        if (aLoginData[i].search(/type="hidden"/i)!=-1)
                        {
                            var szName=aLoginData[i].match(patternAOLName)[1];
                            mainObject.m_Log.Write("AOLSMTP.js - loginOnloadHandler - loginData name " + szName);

                            var szValue = aLoginData[i].match(patternAOLValue)[1];
                            mainObject.m_Log.Write("AOLSMTP.js - loginOnloadHandler - loginData value " + szValue);

                            mainObject.m_HttpComms.addValuePair(szName,(szValue? encodeURIComponent(szValue):""));
                         }
                    }

                    var szLogin = encodeURIComponent(mainObject.m_szLoginUserName);
                    mainObject.m_HttpComms.addValuePair("loginId",szLogin);

                    var szPass = encodeURIComponent(mainObject.m_szPassWord);
                    mainObject.m_HttpComms.addValuePair("password",szPass);

                    var szAction = szLoginForm[0].match(patternAOLAction)[1];
                    mainObject.m_Log.Write("AOLSMTP.js - loginOnloadHandler - szAction : "+szAction);
                    if (!mainObject.m_HttpComms.setURI(szAction))
                        mainObject.m_HttpComms.setURI(httpChannel.URI.prePath + szAction);

                    mainObject.m_HttpComms.setRequestMethod("POST");
                    var bResult = mainObject.m_HttpComms.send(mainObject.loginOnloadHandler, mainObject);
                    if (!bResult) throw new Error("httpConnection returned false");
                    mainObject.m_iStage++;
                break;

                 case 1://login bounce
                    var szLoginVerify = szResponse.match(patternAOLVerify)[1];
                    mainObject.m_Log.Write("AOLSMTP.js - loginOnloadHandler - szLoginVerify " + szLoginVerify);
                    if (szLoginVerify == null)
                        throw new Error("error parsing AOL login web page");

                    mainObject.m_HttpComms.setURI(szLoginVerify);
                    mainObject.m_HttpComms.setRequestMethod("GET");
                    var bResult = mainObject.m_HttpComms.send(mainObject.loginOnloadHandler, mainObject);
                    if (!bResult) throw new Error("httpConnection returned false");
                    mainObject.m_iStage++;
                break;


                case 2://another bloody bounce
                    var szHostURL = szResponse.match(patternAOLPreferredHost)[1];
                    if (szHostURL == null)
                        throw new Error("error parsing AOL login web page");

                    var szSuccessURL = szResponse.match(patternAOLPath)[1];
                    mainObject.m_Log.Write("AOLSMTP.js - loginOnloadHandler - szSuccessURL " +szSuccessURL);
                    var szURL = "http://" + szHostURL + encodeURI(szSuccessURL);

                    mainObject.m_HttpComms.setURI(szURL);
                    mainObject.m_HttpComms.setRequestMethod("GET");
                    var bResult = mainObject.m_HttpComms.send(mainObject.loginOnloadHandler, mainObject);
                    if (!bResult) throw new Error("httpConnection returned false");
                    mainObject.m_iStage++;
                break;


                case 3://get settings
                    var szSetttingsURL = szResponse.match(kPatternSettings)[1];
                    mainObject.m_Log.Write("AOLPOP.js - loginOnloadHandler - szSetttingsURL " +szSetttingsURL);
                    mainObject.m_HttpComms.setURI(szSetttingsURL);
                    mainObject.m_HttpComms.setRequestMethod("GET");
                    var bResult = mainObject.m_HttpComms.send(mainObject.loginOnloadHandler, mainObject);
                    if (!bResult) throw new Error("httpConnection returned false");
                    mainObject.m_iStage++;
                break;
            

                case 4://get urls
                    if(szResponse.search(patternAOLUserID)==-1)
                    {
                        if (mainObject.m_bReEntry)
                        {
                            mainObject.m_ComponentManager.deleteAllElements(mainObject.m_szUserName);

                            var oCookies = Components.classes["@mozilla.org/nsWebMailCookieManager2;1"]
                                                     .getService(Components.interfaces.nsIWebMailCookieManager2);
                            oCookies.removeCookie(mainObject.m_szUserName);

                            mainObject.m_bReEntry = false;
                            mainObject.m_iStage =0;
                            mainObject.m_HttpComms.setURI(mainObject.m_szAOLMail);
                            mainObject.m_HttpComms.setRequestMethod("GET");
                            var bResult = mainObject.m_HttpComms.send(mainObject.loginOnloadHandler, mainObject);
                            if (!bResult) throw new Error("httpConnection returned false");
                            return;
                        }
                        else
                            throw new Error("error logging in");
                    }

                    mainObject.m_szUserId = szResponse.match(patternAOLUserID)[1];
                    mainObject.m_Log.Write("AOLPOP.js - loginOnloadHandler - m_szUserId " +mainObject.m_szUserId);

                    mainObject.m_szRealUserName = szResponse.match(patternAOLRealUserName)[1];
                    mainObject.m_Log.Write("AOLPOP.js - loginOnloadHandler - m_szRealUserName " +mainObject.m_szRealUserName);

                    var IOService = Components.classes["@mozilla.org/network/io-service;1"]
                                              .getService(Components.interfaces.nsIIOService);
                    var nsIURI = IOService.newURI(httpChannel.URI.spec, null, null);
                    var szDirectory = nsIURI.QueryInterface(Components.interfaces.nsIURL).directory;
                    mainObject.m_Log.Write("AOLPOP - loginOnloadHandler - directory : " +szDirectory);

                    mainObject.m_szLocation = httpChannel.URI.prePath + szDirectory +"rpc/";
                    mainObject.m_Log.Write("AOLSMTP.js - loginOnloadHandler - mainObject.m_szLocation " +mainObject.m_szLocation);

                    mainObject.m_szHomeURI = httpChannel.URI.spec;
                    mainObject.m_Log.Write("AOLSMTP.js - loginOnloadHandler - mainObject.m_szHomeURI " +mainObject.m_szHomeURI);

                    //server response
                    mainObject.serverComms("235 Your In\r\n");
                    mainObject.m_bAuthorised = true;
                break;
            }
            mainObject.m_Log.Write("nsAOL.js - loginOnloadHandler - END");
        }
        catch(err)
        {
            mainObject.m_ComponentManager.deleteAllElements(mainObject.m_szUserName);

            var oCookies = Components.classes["@mozilla.org/nsWebMailCookieManager2;1"]
                                     .getService(Components.interfaces.nsIWebMailCookieManager2);
            oCookies.removeCookie(mainObject.m_szUserName);

            mainObject.m_Log.DebugDump("nsAOLSMTP.js: loginHandler : Exception : "
                                          + err.name
                                          + ".\nError message: "
                                          + err.message +"\n" +
                                            err.lineNumber);
            mainObject.serverComms("502 negative vibes from " +mainObject.m_szUserName +"\r\n");
        }
    },




    rawMSG : function (szEmail)
    {
        try
        {
            this.m_Log.Write("nsAOLSMTP.js - rawMSG - START");
            this.m_Log.Write("nsAOLSMTP.js - rawMSG to " +this.m_aszTo );
            this.m_Log.Write("nsAOLSMTP.js - rawMSG " + szEmail);

            if (!this.m_Email.parse(szEmail))
                throw new Error ("Parse Failed")


            if (this.m_Email.attachments.length>0)
            {
                var i;
                for (i=0; i<this.m_Email.attachments.length; i++)
                {
                     //headers
                    var oAttach = this.m_Email.attachments[i];
                    var szFileName = oAttach.headers.getContentType(4);
                    if (!szFileName) szFileName = "";

                    //body
                    var szBody = oAttach.body.getBody();
                    this.m_HttpComms.addFile("file"+i, szFileName, szBody);
                }

                this.m_HttpComms.addFile("file"+(i+1),"", "");
            }
            else
                this.m_HttpComms.addFile("file0","", "");


            var szMsg = "[{";
            szMsg    += "\"From\":\"" + this.m_szUserName.toLowerCase() +"\",";
            var szTo = this.m_Email.headers.getTo();
            if (szTo == null) szTo = "";
            szMsg    += "\"To\":\""   + szTo +"\",";
            var szCc = this.m_Email.headers.getCc();
            if (szCc == null) szCc = "";
            szMsg    += "\"Cc\":\""   + szCc +"\",";
            var szBcc = this.getBcc(szTo, szCc);
            if (szBcc == null) szBcc = "";
            szMsg    += "\"Bcc\":\""  + szBcc +"\",";
            szMsg    += "\"Subject\":\""  + this.m_Email.headers.getSubject() +"\",";

            var szPlainBody = ""
            if (this.m_Email.txtBody)
            {
                //convert to UTF 8
                var szContentType = null;
                if (this.m_Email.txtBody.headers)
                    szContentType = this.m_Email.txtBody.headers.getContentType(0);
                else
                    szContentType = this.m_Email.headers.getContentType(0);
                this.m_Log.Write("AOLSMTP.js - composerOnloadHandler szContentType " + szContentType);
                var szCharset = szContentType.match(/charset=(.*?)($|;|\s)/i)[1];
                szValue = this.m_Email.txtBody.body.getBody().replace(/\r?\n/g,"\\n");

                this.m_Log.Write("AOLSMTP.js - composerOnloadHandler szCharset " + szCharset);
                var Converter = Components.classes["@mozilla.org/intl/scriptableunicodeconverter"]
                                          .getService(Components.interfaces.nsIScriptableUnicodeConverter);
                Converter.charset =  szCharset;
                var unicode =  Converter.ConvertToUnicode(szValue);
                Converter.charset = "utf-8";
                var szDecoded = Converter.ConvertFromUnicode(unicode);
                this.m_Log.Write("AOLSMTP.js - composerOnloadHandler - utf-8 "+szDecoded);
                szPlainBody = szDecoded;
            }
            szMsg    += "\"PlainBody\":\""  + szPlainBody +"\",";

            var szRichText = szPlainBody;
            if (this.m_Email.htmlBody)
            {
                szRichText =this.m_Email.htmlBody.body.getBody();
                szRichText = szRichText.match(/<body.*?>([\s\S]*?)<\/body>/i)[1];
                szRichText = szRichText.replace(/\r?\n/g,"\\n");
                szRichText = szRichText.replace(/"/g,"\\\"");
            }

            szMsg    += "\"RichBody\":\""+ szRichText +"\",";
            var bRichEdit = this.m_Email.htmlBody? "true" : "false";
            szMsg    += "\"RichEdit\":" + bRichEdit +",";
            szMsg    += "\"ParentMessageID\":undefined,\"ParentReferences\":undefined,\"ParentInReplyTo\":undefined,";
            szMsg    += "\"AnswerUID\":null,\"AnswerFolder\":null,\"DraftMsgFolder\":undefined,\"DraftMsgUID\":undefined,";
            szMsg    += "\"SourceMsgUID\":undefined,\"SourceMsgFolder\":undefined,\"SourceAttachmentIDs\":[],\"SavePicturesToShoebox\":-1,";
            szMsg    += "\"action\":\"SendMessage\"}]";

            this.m_iStage = 0;

            this.m_HttpComms.addValuePair("requests", szMsg);
            this.m_HttpComms.addValuePair("automatic", "false");
            this.m_HttpComms.addValuePair("dojo.transport","iframe");

            var szURL = this.m_szLocation +"RPC.aspx?user=" +this.m_szUserId + "&r="+Math.random();
            this.m_HttpComms.setURI(szURL);
            this.m_HttpComms.setContentType("multipart/form-data");
            this.m_HttpComms.setRequestMethod("POST");
            var bResult = this.m_HttpComms.send(this.composerOnloadHandler, this);
            if (!bResult) throw new Error("httpConnection returned false");

            this.m_Log.Write("nsAOLSMTP.js - rawMSG -" + bResult +" END");
            return bResult;
        }
        catch(err)
        {
            this.m_Log.DebugDump("nsAOLSMTP.js: rawMSG : Exception : "
                                              + err.name +
                                              ".\nError message: "
                                              + err.message +"\n" +
                                                err.lineNumber);

            this.serverComms("502 negative vibes from " +this.m_szUserName +"\r\n");

            return false;
        }
    },





    composerOnloadHandler : function(szResponse ,event , mainObject)
    {
        try
        {
            mainObject.m_Log.Write("nsAOLSMTP.js - composerOnloadHandler - START");
            mainObject.m_Log.Write("nsAOLSMTP.js - composerOnloadHandler : " + mainObject.m_iStage);

            var httpChannel = event.QueryInterface(Components.interfaces.nsIHttpChannel);

            //if this fails we've gone somewhere new
            mainObject.m_Log.Write("nsAOLSMTP.js - composerOnloadHandler - status :" +httpChannel.responseStatus );
            if (httpChannel.responseStatus != 200)
                throw new Error("return status " + httpChannel.responseStatus);


            if (szResponse.search(/&quot;isSuccess&quot;:true/i)==-1)
            {
                mainObject.m_Log.Write("nsAOLSMTP.js - composerOnloadHandler - check failed");
                mainObject.serverComms("502 Error Sending Email\r\n");
                return;
            }

            if (mainObject.m_bReUseSession)
            {
                mainObject.m_Log.Write("nsAOLSMTP.js - composerOnloadHandler - Setting Session Data");

                mainObject.m_ComponentManager.addElement(mainObject.m_szUserName, "szHomeURI", mainObject.m_szHomeURI);
            }
            else
            {
                mainObject.m_Log.Write("nsAOLSMTP.js - composerOnloadHandler - removing Session Data");
                mainObject.m_ComponentManager.deleteAllElements(mainObject.m_szUserName);

                var oCookies = Components.classes["@mozilla.org/nsWebMailCookieManager2;1"]
                                         .getService(Components.interfaces.nsIWebMailCookieManager2);
                oCookies.removeCookie(mainObject.m_szUserName);
            }

            mainObject.serverComms("250 OK\r\n");

            mainObject.m_Log.Write("nsAOLSMTP.js - composerOnloadHandler - END");
        }
        catch(err)
        {
            mainObject.m_Log.DebugDump("nsAOLSMTP.js: composerOnloadHandler : Exception : "
                                          + err.name
                                          + ".\nError message: "
                                          + err.message +"\n" +
                                            err.lineNumber);

            mainObject.serverComms("502 negative vibes from " +mainObject.m_szUserName +"\r\n");
        }
    },




    getBcc : function (szTo,szCc)
    {
        try
        {
            this.m_Log.Write("nsAOLSMTP.js - getBcc - START");
            if (this.m_aszTo.length==0) return null;
            this.m_Log.Write("nsAOLSMTP.js - getBcc - szRcptList " + this.m_aszTo);

            var szBcc = null;
            var szAddress = null;
            if (szTo) szAddress = szTo;
            if (szCc) szAddress = (szTo ? (szAddress + ","+ szCc) : szCc);
            this.m_Log.Write("nsAOLSMTP.js - getBcc - szAddress " + szAddress);

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
            this.m_Log.Write("nsAOLSMTP.js - getBcc szBcc- " + szBcc);

            this.m_Log.Write("nsAOLSMTP.js - getBcc - End");
            return szBcc;
        }
        catch(err)
        {
            this.m_Log.DebugDump("nsAOLSMTP.js: getBcc : Exception : "
                                                  + err.name
                                                  + ".\nError message: "
                                                  + err.message + "\n"
                                                  + err.lineNumber);

            return null;
        }
    },





    ////////////////////////////////////////////////////////////////////////////
    /////  Comms

    serverComms : function (szMsg)
    {
        try
        {
            this.m_Log.Write("nsAOLSMTP.js - serverComms - START");
            this.m_Log.Write("nsAOLSMTP.js - serverComms msg " + szMsg);
            var iCount = this.m_oResponseStream.write(szMsg,szMsg.length);
            this.m_Log.Write("nsAOLSMTP.js - serverComms sent count: " + iCount
                                                        +" msg length: " +szMsg.length);
            this.m_Log.Write("nsAOLSMTP.js - serverComms - END");
        }
        catch(e)
        {
            this.m_Log.DebugDump("nsAOLSMTP.js: serverComms : Exception : "
                                              + e.name
                                              + ".\nError message: "
                                              + e.message +"\n" +
                                                e.lineNumber);
        }
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
var nsAOLSMTPFactory = new Object();

nsAOLSMTPFactory.createInstance = function (outer, iid)
{
    if (outer != null) throw Components.results.NS_ERROR_NO_AGGREGATION;

    if (!iid.equals(nsAOLSMTPClassID) && !iid.equals(Components.interfaces.nsISupports))
        throw Components.results.NS_ERROR_INVALID_ARG;

    return new nsAOLSMTP();
}


/******************************************************************************/
/* MODULE */
var nsAOLSMTPModule = new Object();

nsAOLSMTPModule.registerSelf = function(compMgr, fileSpec, location, type)
{
    compMgr = compMgr.QueryInterface(Components.interfaces.nsIComponentRegistrar);
    compMgr.registerFactoryLocation(nsAOLSMTPClassID,
                                    "AOLSMTPComponent",
                                    nsAOLSMTPContactID,
                                    fileSpec,
                                    location,
                                    type);
}


nsAOLSMTPModule.unregisterSelf = function(aCompMgr, aFileSpec, aLocation)
{
    aCompMgr = aCompMgr.QueryInterface(Components.interfaces.nsIComponentRegistrar);
    aCompMgr.unregisterFactoryLocation(nsAOLSMTPClassID, aFileSpec);
}


nsAOLSMTPModule.getClassObject = function(compMgr, cid, iid)
{
    if (!cid.equals(nsAOLSMTPClassID))
        throw Components.results.NS_ERROR_NO_INTERFACE;

    if (!iid.equals(Components.interfaces.nsIFactory))
        throw Components.results.NS_ERROR_NOT_IMPLEMENTED;

    return nsAOLSMTPFactory;
}


nsAOLSMTPModule.canUnload = function(compMgr)
{
    return true;
}
/******************************************************************************/


function NSGetModule(compMgr, fileSpec)
{
    return nsAOLSMTPModule;
}
