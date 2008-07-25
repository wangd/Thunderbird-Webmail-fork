/*****************************  Globals   *************************************/
const nsGMailSMTPClassID = Components.ID("{09c77b00-b437-11da-a94d-0800200c9a66}");
const nsGMailSMTPContactID = "@mozilla.org/GMailSMTP;1";
const ExtGMailGuid = "{42040a50-44a3-11da-8cd6-0800200c9a66}";

const szVersionNumber = "V20060829100000";

/******************************  GMail ***************************************/
function nsGMailSMTP()
{
    try
    {
        var scriptLoader =  Components.classes["@mozilla.org/moz/jssubscript-loader;1"]
        scriptLoader = scriptLoader.getService(Components.interfaces.mozIJSSubScriptLoader);
        scriptLoader.loadSubScript("chrome://web-mail/content/common/DebugLog.js");
        scriptLoader.loadSubScript("chrome://web-mail/content/common/Email.js");
        scriptLoader.loadSubScript("chrome://web-mail/content/common/CommonPrefs.js");
        scriptLoader.loadSubScript("chrome://web-mail/content/common/HttpComms3.js");
        scriptLoader.loadSubScript("chrome://web-mail/content/common/base64.js");
        scriptLoader.loadSubScript("chrome://gmail/content/GMailMSG.js");
        scriptLoader.loadSubScript("chrome://gmail/content/HTML-escape.js");

        var date = new Date();
        var szLogFileName = "GMailLog_SMTP_" + date.getHours()+ "_" + date.getMinutes() + "_"+ date.getUTCMilliseconds() +"_";
        // var szLogFileName = "GMailLog_";
        this.m_Log = new DebugLog("webmail.logging.comms", ExtGMailGuid, szLogFileName);

        this.m_Log.Write("nsGMailSMTP.js " + szVersionNumber + " - Constructor - START");

        if (typeof PatternGmailConstants == "undefined")
        {
            this.m_Log.Write("nsGMailSMTP.js - Constructor - loading constants");
            scriptLoader.loadSubScript("chrome://gmail/content/Gmail-Constants.js");
        }

        this.m_DomainManager =  Components.classes["@mozilla.org/GMailDomains;1"]
                                          .getService()
                                          .QueryInterface(Components.interfaces.nsIGMailDomains);       

        this.m_szMailURL = "http://mail.google.com/mail/"
        this.m_bAuthorised = false;
        this.m_szUserName = null;
        this.m_szPassWord = null;
        this.m_oResponseStream = null;
        this.m_HttpComms = new HttpComms(this.m_Log);
        this.m_HttpComms.setUserAgentOverride(true);
        
        this.m_iStage = 0;
        this.m_szGMailAtCookie = null;
        this.m_aMsgDataStore = new Array();
        this.m_iTotalSize = 0;
        this.m_Email = new email(this.m_Log);
        this.m_base64 = new base64();
        this.m_Email.decodeBody(true);
        this.m_aszTo = new Array;
        this.m_szFrom = null;
        this.m_szCookieLoginURL = null;

        // this.m_bReEntry = false;
        // this.m_bAttHandled = false;

        this.m_szMsgID = 0;
        this.m_Log.Write("nsGMailSMTP.js - Constructor - END");

        this.m_ComponentManager = Components.classes["@mozilla.org/ComponentData2;1"]
                                            .getService(Components.interfaces.nsIComponentData2);

        //do i reuse the session
        var oPref = new Object();
        oPref.Value = null;
        var  WebMailPrefAccess = new WebMailCommonPrefAccess();
        if (WebMailPrefAccess.Get("bool","gmail.bReUseSession",oPref))
            this.m_bReUseSession = oPref.Value;
        else
            this.m_bReUseSession = false;

        this.m_Log.Write("nsGMailSMTP.js - Constructor - bReUseSession : " + this.m_bReUseSession);

        //do i save copy
        /*
        var oPref = new Object();
        oPref.Value = null;
        var  PrefAccess = new WebMailCommonPrefAccess();
        if (PrefAccess.Get("bool","gmail.bSaveCopy",oPref))
            this.m_bSaveCopy = oPref.Value;
        else
            this.m_bSaveCopy = true;
        delete oPref;
        this.m_Log.Write("nsGMailSMTP.js - Constructor - bSaveCopy : " + this.m_bSaveCopy);
        */

        this.m_Log.Write("nsGMailSMTP.js - Constructor - END");
    }
    catch(e) {
        DebugDump("nsGMailSMTP.js: Constructor : Exception : " + e.name + ".\nError message: " + e.message +"\n" + e.lineNumber);
    }
}

nsGMailSMTP.prototype =
{
    get userName() {return this.m_szUserName;},
    set userName(userName) {return this.m_szUserName = userName;},

    get passWord() {return this.m_szPassWord;},
    set passWord(passWord) {return this.m_szPassWord = passWord;},

    get bAuthorised() {return this.m_bAuthorised;},

    get ResponseStream() {return this.m_oResponseStream;},
    set ResponseStream(responseStream) {return this.m_oResponseStream = responseStream;},

    get to() {return this.m_aszTo;},
    set to(szAddress) {return this.m_aszTo.push(szAddress);},

    get from() {return this.m_szFrom;},
    set from(szAddress) {return this.m_szFrom = szAddress;},

    logIn : function()
    {
        try {
            this.m_Log.Write("nsGMailSMTP.js - logIN - START");
            this.m_Log.Write("nsGMailSMTP.js - logIN - Username: " + this.m_szUserName + " Password: " 
                                                                   + this.m_szPassWord + " stream: " 
                                                                   + this.m_oResponseStream);

            if (!this.m_szUserName || !this.m_oResponseStream  || !this.m_szPassWord) return false;

            // get login webPage
            var szDomain = this.m_szUserName.match(/.*?@(.*?)$/)[1].toLowerCase();
            if (szDomain == "gmail.com" || szDomain == "googlemail.com") 
                loginURL = "http://mail.google.com/mail/";
            else
                loginURL = "http://mail.google.com/a/" + szDomain + "/";

            this.m_szMailURL = loginURL;


            this.m_HttpComms.setUserName(this.m_szUserName);

            var bSessionStored = this.m_ComponentManager.findElement(this.m_szUserName, "bSessionStored");
            if ( bSessionStored && this.m_bReUseSession ) 
            {
                this.m_Log.Write("nsGMailSMTP.js - logIN - Session Data found");

                this.serverComms("+OK Your in\r\n");
                this.m_bAuthorised = true;
            } 
            else 
            {
                this.m_Log.Write("nsGMailSMTP.js - logIN - No Session Data found");
                var oCookies = Components.classes["@mozilla.org/nsWebMailCookieManager2;1"]
                                         .getService(Components.interfaces.nsIWebMailCookieManager2);
                oCookies.removeCookie(this.m_szUserName);
                this.m_ComponentManager.deleteAllElements(this.m_szUserName);

                this.m_HttpComms.setURI(loginURL);
                this.m_HttpComms.setRequestMethod("GET");
                
                var bResult = this.m_HttpComms.send(this.loginOnloadHandler, this);
                if (!bResult) throw new Error('httpConnection returned false');
                this.m_iStage = 0;
            }

            this.m_Log.Write("nsGMailSMTP.js - logIN - END");
            return true;
        }
        catch(e) 
        {
            this.m_Log.DebugDump("nsGMailSMTP.js: logIN : Exception : " + e.name 
                                                     + ".\nError message: " + e.message+ "\n" 
                                                     + e.lineNumber);
            this.serverComms("502 negative vibes from "+this.m_szUserName+"\r\n");
            return false;
        }
    },

    loginOnloadHandler : function(szResponse ,event , mainObject)
    {
        try 
        {
            mainObject.m_Log.Write("nsGMailSMTP.js - loginOnloadHandler - START");
            mainObject.m_Log.Write("nsGMailSMTP.js - loginOnloadHandler : " + mainObject.m_iStage);

            var httpChannel = event.QueryInterface(Components.interfaces.nsIHttpChannel);

            //if this fails we've gone somewhere new
            mainObject.m_Log.Write("nsGMailSMTP.js - loginOnloadHandler - status :" + httpChannel.responseStatus );
            if (httpChannel.responseStatus != 200)
                throw new Error("return status " + httpChannel.responseStatus);

            //bounce check
            if (szResponse.search(patternGMailLoginBounce)!=-1)
            {
                mainObject.m_Log.Write("nsGMailSMTP.js - loginOnloadHandler - bounce");
                var oEscape = new HTMLescape();
                var szClean = oEscape.decode(szResponse);
                delete oEscape;
                var szURI = szClean.match(patternGMailLoginBounce)[1];
                mainObject.m_Log.Write("nsGMailPOP.js - loginOnloadHandler - redirectURL " + szURI);

                mainObject.m_HttpComms.setURI(szURI);
                mainObject.m_HttpComms.setRequestMethod("GET");
                var bResult = mainObject.m_HttpComms.send(mainObject.loginOnloadHandler, mainObject);
                if (!bResult) throw new Error("httpConnection returned false");    
                return;   
            }


            switch  ( mainObject.m_iStage ) 
            {
                case 0:  //login
                    mainObject.m_Log.Write("nsGMailSMTP.js - loginOnloadHandler - login");
                     
                    var aszLoginForm = szResponse.match(patternGMailLoginForm);
                    mainObject.m_Log.Write("nsGMailSMTP.js - loginOnloadHandler - aszLoginForm " + aszLoginForm);
                     
                    var szAction = aszLoginForm[0].match(patternGMailFormAction)[1];
                    mainObject.m_Log.Write("nsGMailSMTP.js - loginOnloadHandler - szAction " + szAction);
                   
                    var aszInput = aszLoginForm[0].match(patternGMailFormInput);
                    mainObject.m_Log.Write("nsGMailSMTP.js - loginOnloadHandler - aszInput " + aszInput);
                               
                    for (i=0; i<aszInput.length; i++)
                    {
                        mainObject.m_Log.Write("nsGMailSMTP.js - loginOnloadHandler - aszInput[i] " + aszInput[i]);
                        
                        var szName = aszInput[i].match(patternGMailFormName)[1];
                        mainObject.m_Log.Write("nsGMailSMTP.js - loginOnloadHandler - szName " + szName);
                       
                        var szValue = "";
                        try 
                        {
                            var szValue = aszInput[i].match(patternGMailFormValue)[1];
                        } 
                        catch (e) 
                        {
                        }
                        mainObject.m_Log.Write("nsGMailSMTP.js - loginOnloadHandler - szValue " + szValue);
                        
                        if (szName.search(/Passwd/i) != -1) szValue = mainObject.m_szPassWord;
                        if (szName.search(/Email/i) != -1) 
                        {
                            var szUserName = mainObject.m_szUserName.match(/(.*?)@.*?$/)[1].toLowerCase();
                            szValue = szUserName;
                        }
                        
                        mainObject.m_HttpComms.addValuePair(szName, encodeURIComponent(szValue));
                    }        
                    
                    mainObject.m_HttpComms.setURI(szAction);
                    mainObject.m_HttpComms.setRequestMethod("POST");
                    var bResult = mainObject.m_HttpComms.send(mainObject.loginOnloadHandler, mainObject);
                    if (!bResult) throw new Error("httpConnection returned false");
                    mainObject.m_iStage++;      
                break;
           
                case 1:
                    if ( szResponse.indexOf("Sign In") > -1 ||
                            szResponse.indexOf("NewAccount") > -1 ||
                            szResponse.indexOf("Username and password do not match") > -1 ||
                            szResponse.indexOf("Sign up for Gmail") > -1)
                        throw new Error("Invalid Password");
    
                    mainObject.m_Log.Write("nsGMailSMTP.js - loginOnloadHandler - Getting session cookie...");
    
                    var szLocation  = httpChannel.URI.spec;
                    mainObject.m_Log.Write("nsGMailPOP.js - loginOnloadHandler - location : " + szLocation );
                    
                    var IOService = Components.classes["@mozilla.org/network/io-service;1"]
                                              .getService(Components.interfaces.nsIIOService);

                    var nsIURI = IOService.newURI(szLocation, null, null);
                    var oCookies = Components.classes["@mozilla.org/nsWebMailCookieManager2;1"]
                                             .getService(Components.interfaces.nsIWebMailCookieManager2);
                    szCookies = oCookies.findCookie(mainObject.m_szUserName, nsIURI);
                    mainObject.m_Log.Write("nsGMailSMTP.js - loginOnloadHandler - session cookies:\n" + szCookies);
    
                    mainObject.m_szGMailAtCookie = szCookies.match(PatternGMailGetSessionCookie)[1];
                    if ( mainObject.m_szGMailAtCookie == null)
                        throw new Error("Error getting session cookie during login");
    
                    mainObject.m_Log.Write("nsGMailSMTP.js - loginOnloadHandler - szGMAIL_AT: " + mainObject.m_szGMailAtCookie);
    
                    mainObject.serverComms("235 Your In\r\n");
                    mainObject.m_bAuthorised = true;
                break;
            }

            mainObject.m_Log.Write("nsGMailSMTP.js - loginOnloadHandler - END");
        }
        catch(err) {

            var oCookies = Components.classes["@mozilla.org/nsWebMailCookieManager2;1"]
                                     .getService(Components.interfaces.nsIWebMailCookieManager2);
            oCookies.removeCookie(mainObject.m_szUserName);

            mainObject.m_ComponentManager.deleteAllElements(mainObject.m_szUserName);

            mainObject.m_Log.DebugDump("nsGMailSMTP.js: loginHandler : Exception : " + err.name + ".\nError message: " + err.message+ "\n" + err.lineNumber);
            mainObject.serverComms("502 negative vibes from "+mainObject.m_szUserName+"\r\n");
        }
    },

    rawMSG : function (szEmail)
    {
        try {
            this.m_Log.Write("nsGMailSMTP.js - rawMSG - START");
            this.m_Log.Write("nsGMailSMTP.js - rawMSG " + szEmail);

            if ( this.m_bAuthorised == false )
                return false;

            this.m_iStage =0 ;
            if ( !this.m_Email.parse(szEmail) ) throw new Error ("Parse Failed")

            var szTo = this.m_Email.headers.getTo();
            var szCc = this.m_Email.headers.getCc();
            var szBCC = this.getBcc(szTo, szCc);
            
            var szSubject = this.m_Email.headers.getSubject();
            szSubject = szSubject ? szSubject : " " ; 
            this.m_Log.Write("nsGMailSMTP.js - rawMSG - szSubject "+szSubject);
            
            var szContentType = null;
            var szCharset = null;
   
            try
            {
                 szContentType = this.m_Email.txtBody.headers.getContentType(0);
            }
            catch(e)
            {
                try
                {
                    szContentType = this.m_Email.htmlBody.headers.getContentType(0);
                }
                catch(err)
                {
                    szContentType = this.m_Email.headers.getContentType(0);
                }
            }
            this.m_Log.Write("nsGMailSMTP.js - composerOnloadHandler szContentType " + szContentType);
            
            if (szContentType)
            {
                if (szContentType.search(/charset/i)!=-1)
                {
                    if (szContentType.search(/charset=(.*?);\s/i)!=-1)
                        szCharset = szContentType.match(/charset=(.*?);\s/i)[1];
                    else
                       szCharset = szContentType.match(/charset=(.*?)$/i)[1];
                    this.m_Log.Write("nsGMailSMTP.js - rawMSG -szCharset " + szCharset);
                }
            }
                       
            var szMsgBody = " ";
            if ( this.m_Email.txtBody ) 
            {
                szMsgBody = this.m_Email.txtBody.body.getBody();
                if (szCharset)
                    szMsgBody = this.convertToUTF8(szMsgBody, szCharset);              
            }

            this.m_HttpComms.addValuePair('view', 'sm');
            this.m_HttpComms.addValuePair('cmid', '2');
            this.m_HttpComms.addValuePair('at', this.m_szGMailAtCookie);
            this.m_HttpComms.addValuePair('to', (szTo? szTo : "") );
            this.m_HttpComms.addValuePair('cc', (szCc? szCc : "") );
            this.m_HttpComms.addValuePair('bcc', (szBCC? szBCC : "") );
            this.m_HttpComms.addValuePair('subject', szSubject ); 


            if ( this.m_Email.htmlBody ) 
            {
                this.m_Log.DebugDump("nsGMailSMTP.js: rawMSG: isHTML");

                this.m_HttpComms.addValuePair('ishtml', "1" );
                szMsgBody = this.m_Email.htmlBody.body.getBody();
                if (szCharset)
                    szMsgBody = this.convertToUTF8(szMsgBody, szCharset);               
            }

            this.m_HttpComms.addValuePair('msgbody', (szMsgBody? szMsgBody : " ") );
            this.m_Log.DebugDump("nsGMailSMTP.js: rawMSG: body: " + szMsgBody );

            if ( this.m_Email.attachments.length>0 ) {
                this.m_Log.DebugDump("nsGMailSMTP.js: rawMSG: nAttachments: " + this.m_Email.attachments.length );

                for ( i=0 ; i< this.m_Email.attachments.length ; i++ ) {
                    var szName = "file" + i;
                    var szFileName = this.m_Email.attachments[i].headers.getContentType(4);
                    if ( szFileName )
                        szName = szFileName;
                    else
                        szFileName = szName;

                    var szContentType = this.m_Email.attachments[i].headers.getContentType(0);
                    var szURLCodedBody =  this.m_Email.attachments[i].body.getBody();

                    var szMsg = "filename=" + szFileName + "\n" + "Content-Type: " + szContentType + "\n\n" + szURLCodedBody;

                    // this.m_HttpComms.addValuePair(szName, encodeURIComponent(szMsg) );
                    // this.m_Log.DebugDump("nsGMailSMTP.js: rawMSG: attach[" + i + "]: " + szMsg);

                    this.m_HttpComms.addFile(szName, szFileName, this.m_Email.attachments[i].body.getBody() );
                    // this.m_Log.DebugDump("nsGMailSMTP.js: rawMSG: attach[" + i + "]: " + this.m_Email.attachments[i].body.getBody() );
                }
            }

            // var szSave = this.m_bSaveCopy ? "yes" : "no";
            // this.m_HttpComms.addValuePair(szName, szSave);

            var szComposeURI = this.m_szMailURL+"?ui=1";
            this.m_HttpComms.setContentType("multipart/form-data");
            this.m_HttpComms.setURI(szComposeURI);
            this.m_HttpComms.setRequestMethod("POST");
            var bResult = this.m_HttpComms.send(this.composerOnloadHandler, this);
            if ( !bResult ) {
                // TODO parse reply to get the failure reason
/*
D(["sr","2",0,"test.vbs is an executable file. For security reasons, Gmail does not allow you to send this type of file.","0",0,[]
,,0,0,0,"",,0,[]
*/
                throw new Error("httpConnection returned false");
            }
            this.m_Log.Write("nsGMailSMTP.js - rawMSG - END");
            return true;
        }
        catch(err) {
            this.m_Log.DebugDump("nsGMailSMTP.js: rawMSG : Exception : " + err.name + ".\nError message: " + err.message+ "\n" + err.lineNumber);
            return false;
        }
    },

    composerOnloadHandler : function(szResponse ,event , mainObject)
    {
        try {
            mainObject.m_Log.Write("nsGMailSMTP.js - composerOnloadHandler - START");
            mainObject.m_Log.Write("nsGMailSMTP.js - composerOnloadHandler : " + mainObject.m_iStage);

            var httpChannel = event.QueryInterface(Components.interfaces.nsIHttpChannel);

            //if this fails we've gone somewhere new
            mainObject.m_Log.Write("nsGMailSMTP.js - composerOnloadHandler - status :" + httpChannel.responseStatus );

            if ( szResponse.search("Your message has been sent.") ==-1 &&
                 szResponse.search("Il messaggio � stato inviato.") ==-1 &&
                 szResponse.search("Ihre Nachricht wurde gesendet.") ==-1 &&
                 szResponse.search("Votre message a été envoyé.") ==-1 )
                mainObject.serverComms("502 Invalid mail format\r\n");

            if ( mainObject.m_bReUseSession)
            {
                mainObject.m_Log.Write("nsGMailPOP.js - loginOnloadHandler - Saving session Data");
                mainObject.m_ComponentManager.addElement(mainObject.m_szUserName, "bSessionStored", true);
            }
            else
            {
                var oCookies = Components.classes["@mozilla.org/nsWebMailCookieManager2;1"]
                                         .getService(Components.interfaces.nsIWebMailCookieManager2);
                oCookies.removeCookie(mainObject.m_szUserName);

                mainObject.m_ComponentManager.deleteAllElements(mainObject.m_szUserName);
            }

            mainObject.serverComms("250 OK\r\n");
            mainObject.m_Log.Write("nsGMailSMTP.js - composerOnloadHandler - END");
        }
        catch(err) {
            mainObject.m_Log.DebugDump("nsGMailSMTP.js: composerOnloadHandler : Exception : " + err.name + ".\nError message: " + err.message + "\n" + err.lineNumber);
            mainObject.serverComms("502 negative vibes from " + mainObject.m_szUserName + "\r\n");
        }
    },

    escapeStr : function(szMSG)
    {
        var szEncode = escape(szMSG);
        szEncode = szEncode.replace(/%20/gm,"+"); //replace space
        return szEncode;
    },

    getBcc : function (szTo,szCc)
    {
        try
        {
            this.m_Log.Write("nsGMailSMTP.js - getBcc - START");
            if (this.m_aszTo.length==0) return null;
            this.m_Log.Write("nsGMailSMTP.js - getBcc - szRcptList " + this.m_aszTo);

            var szBcc = null;
            var szAddress = null;
            if (szTo) szAddress = szTo;
            if (szCc) szAddress = (szTo ? (szAddress + ","+ szCc) : szCc);
            this.m_Log.Write("nsGMailSMTP.js - getBcc - szAddress " + szAddress);

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
            this.m_Log.Write("nsGMailSMTP.js - getBcc szBcc- " + szBcc);

            this.m_Log.Write("nsGMailSMTP.js - getBcc - End");
            return szBcc;
        }
        catch(err)
        {
            this.m_Log.DebugDump("nsGMailSMTP.js: getBcc : Exception : "
                                                  + err.name
                                                  + ".\nError message: "
                                                  + err.message + "\n"
                                                  + err.lineNumber);

            return null;
        }
    },



    convertToUTF8 : function (szRawMSG, szCharset)
    {
        this.m_Log.Write("nsGMailSMTP - convertToUTF8 START " +szCharset );

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
        this.m_Log.Write("nsGMailSMTP - convertToUTF8 use charset " + szUseCharSet);

        var Converter = Components.classes["@mozilla.org/intl/scriptableunicodeconverter"]
                                  .getService(Components.interfaces.nsIScriptableUnicodeConverter);
        Converter.charset =  szUseCharSet;
        var unicode =  Converter.ConvertToUnicode(szRawMSG);
        Converter.charset = "UTF-8";
        var szDecoded = Converter.ConvertFromUnicode(unicode)+ Converter.Finish();
        this.m_Log.Write("nsGMailSMTP - convertToUTF8 - "+szDecoded);

        this.m_Log.Write("nsGMailSMTP - convertToUTF8 END");
        return szDecoded;
    },
/*
    writeImageFile : function(szData)
    {
        try
        {
            this.m_Log.Write("nsGMailSMTP.js - writeImageFile - End");

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
            this.m_Log.Write("nsGMailSMTP.js - writeImageFile - path " + URL);

            this.m_Log.Write("nsGMailSMTP.js - writeImageFile - End");
            return URL;
        }
        catch(err)
        {
            this.m_Log.DebugDump("nsGMailSMTP.js: writeImageFile : Exception : "
                                                  + err.name
                                                  + ".\nError message: "
                                                  + err.message + "\n"
                                                  + err.lineNumber);

            return null;
        }
    },
*/

/*
    openSpamWindow : function(szPath)
    {
        try
        {
            this.m_Log.Write("nsGMailSMTP : openWindow - START");

            var params = Components.classes["@mozilla.org/embedcomp/dialogparam;1"]
                                   .createInstance(Components.interfaces.nsIDialogParamBlock);
            params.SetNumberStrings(1);
            params.SetString(0, szPath);

            var window = Components.classes["@mozilla.org/embedcomp/window-watcher;1"]
                                  .getService(Components.interfaces.nsIWindowWatcher);

            window.openWindow(null,
                              "chrome://gmail/content/GMail-SpamImage.xul",
                              "_blank",
                              "chrome,alwaysRaised,dialog,modal,centerscreen",
                              params);

            var iResult = params.GetInt(0);
            this.m_Log.Write("nsGMailSMTP : openWindow - " + iResult);
            var szResult =  null;
            if (iResult)
            {
                szResult = params.GetString(0);
                this.m_Log.Write("nsGMailSMTP : openWindow - " + szResult);
            }

            this.m_Log.Write("nsGMailSMTP : openWindow - END");
            return szResult;
        }
        catch(err)
        {
            this.m_Log.DebugDump("nsGMailSMTP: Exception in openWindow : "
                                               + err.name
                                               + ".\nError message: "
                                               + err.message + "\n"
                                               + err.lineNumber);
        }
    },
*/


    ////////////////////////////////////////////////////////////////////////////
    /////  Comms

    serverComms : function (szMsg)
    {
        try
        {
            this.m_Log.Write("nsGMailSMTP.js - serverComms - START");
            this.m_Log.Write("nsGMailSMTP.js - serverComms msg " + szMsg);
            var iCount = this.m_oResponseStream.write(szMsg,szMsg.length);
            this.m_Log.Write("nsGMailSMTP.js - serverComms sent count: " + iCount
                                                        +" msg length: " +szMsg.length);
            this.m_Log.Write("nsGMailSMTP.js - serverComms - END");
        }
        catch(e)
        {
            this.m_Log.DebugDump("nsGMailSMTP.js: serverComms : Exception : "
                                              + e.name
                                              + ".\nError message: "
                                              + e.message+ "\n"
                                              + e.lineNumber);
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
var nsGMailSMTPFactory = new Object();

nsGMailSMTPFactory.createInstance = function (outer, iid)
{
    if (outer != null) throw Components.results.NS_ERROR_NO_AGGREGATION;

    if (!iid.equals(nsGMailSMTPClassID) && !iid.equals(Components.interfaces.nsISupports))
        throw Components.results.NS_ERROR_INVALID_ARG;

    return new nsGMailSMTP();
}


/******************************************************************************/
/* MODULE */
var nsGMailSMTPModule = new Object();

nsGMailSMTPModule.registerSelf = function(compMgr, fileSpec, location, type)
{
    compMgr = compMgr.QueryInterface(Components.interfaces.nsIComponentRegistrar);
    compMgr.registerFactoryLocation(nsGMailSMTPClassID,
                                    "GMailSMTPComponent",
                                    nsGMailSMTPContactID,
                                    fileSpec,
                                    location,
                                    type);
}


nsGMailSMTPModule.unregisterSelf = function(aCompMgr, aFileSpec, aLocation)
{
    aCompMgr = aCompMgr.QueryInterface(Components.interfaces.nsIComponentRegistrar);
    aCompMgr.unregisterFactoryLocation(nsGMailSMTPClassID, aFileSpec);
}


nsGMailSMTPModule.getClassObject = function(compMgr, cid, iid)
{
    if (!cid.equals(nsGMailSMTPClassID))
        throw Components.results.NS_ERROR_NO_INTERFACE;

    if (!iid.equals(Components.interfaces.nsIFactory))
        throw Components.results.NS_ERROR_NOT_IMPLEMENTED;

    return nsGMailSMTPFactory;
}


nsGMailSMTPModule.canUnload = function(compMgr)
{
    return true;
}
/******************************************************************************/


function NSGetModule(compMgr, fileSpec)
{
    return nsGMailSMTPModule;
}
