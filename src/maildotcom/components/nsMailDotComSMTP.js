/*****************************  Globals   *************************************/                 
const nsMailDotComSMTPClassID = Components.ID("{ab03f970-22cf-11da-8cd6-0800200c9a66}");
const nsMailDotComSMTPContactID = "@mozilla.org/MailDotComSMTP;1";
const ExtMailDotComGuid = "{1ad5b3b0-b908-11d9-9669-0800200c9a66}";

const patternMailRefresh = /<head>[\s]<meta http-equiv="Refresh" content="0;URL=(.*?)">[\s\S]*<\/head>/i;
const patternMailDotComLoginForm =/<form.*?>[\S\s]*?<\/form>/igm;
const patternMailDotComLoginURI = /action="(.*?)"/;
const patternMailDotComLoginInput = /<input type=(?!"submit").*?>/igm;
const patternMailDotComType = /type="(.*?)"/i;
const patternMailDotComValue = /value=\s?['??|"??](\S*)['??|"??]/i;
const patternMailDotComName = /name=\s?["??|'??](\S*)["??|'??]/i;
const patternMailDotComFrame = /<frame.*?src="(.*?)".*?name="mailcomframe".*?SCROLLING="AUTO">/;
const patternMailDotComComposeButtonForm = /<form.*?>.*?<input type="button".*?compose.*?>.*?<\/form>/igm;
const patternMailDotComSMTPInput = /<input.*?>/igm;
const patternMailDotComComposerURI = /onclick="document.location.href='(.*?compose.*?)';"/i
const patternMailDotComComposeForm = /<form.*?composeForm.*?>[\s\S]*<\/form>/igm;
const patternMailDotComAddURI = /document.location.href="(.*?)"/;
const patternMailDotComAttachForm = /<form.*?attachmentForm.*?>[\s\S]*<\/form>/igm;
const patternMailDotComFolders = /href="(.*?folders.mail.*?)"/;

/******************************  MailDotCom ***************************************/
function nsMailDotComSMTP()
{
    try
    {       
        var scriptLoader =  Components.classes["@mozilla.org/moz/jssubscript-loader;1"];
        scriptLoader = scriptLoader.getService(Components.interfaces.mozIJSSubScriptLoader);
        scriptLoader.loadSubScript("chrome://web-mail/content/common/DebugLog.js");
        scriptLoader.loadSubScript("chrome://web-mail/content/common/CommonPrefs.js");
        scriptLoader.loadSubScript("chrome://web-mail/content/common/comms.js");
        scriptLoader.loadSubScript("chrome://web-mail/content/common/Email.js");
        
        
        var date = new Date();
        var  szLogFileName = "MailDotCom SMTP Log - " + date.getHours()
                                           + "-" + date.getMinutes() 
                                           + "-"+ date.getUTCMilliseconds() +" -";
        this.m_Log = new DebugLog("webmail.logging.comms", ExtMailDotComGuid, szLogFileName); 
        
        this.m_Log.Write("nsMailDotComSMTP.js - Constructor - START");   
       
        this.m_bAuthorised = false;
        this.m_szUserName = null;   
        this.m_szPassWord = null; 
        this.m_oResponseStream = null;  
        this.m_HttpComms = new Comms(this , this.m_Log);
        this.m_aszTo = new Array;
        this.m_szFrom = null;
        
        this.m_BeforeAdsCallback = null;
        this.m_iStage = 0;
        this.m_szComposeURI = null;
        this.m_szLocation = null;  
        this.m_bAttHandled = false;
        this.m_Email = new email(this.m_Log);
        this.m_Email.decodeBody(true);
        this.m_iAttCount = 0;
        this.m_iAttUploaded = 1;
        
        this.m_SessionManager = Components.classes["@mozilla.org/SessionManager;1"];
        this.m_SessionManager = this.m_SessionManager.getService();
        this.m_SessionManager.QueryInterface(Components.interfaces.nsISessionManager); 
        this.m_SessionData = null;
        
        this.m_bReEntry = false;
        
        //do i reuse the session
        var oPref = new Object();
        oPref.Value = null;
        var  WebMailPrefAccess = new WebMailCommonPrefAccess();
        if (WebMailPrefAccess.Get("bool","maildotcom.bReUseSession",oPref))
            this.m_bReUseSession=oPref.Value;
        else
            this.m_bReUseSession=true; 
            
        //do i save copy
        var oPref = new Object();
        oPref.Value = null;
        var  PrefAccess = new WebMailCommonPrefAccess();
        if (PrefAccess.Get("bool","maildotcom.bSaveCopy",oPref))
            this.m_bSaveCopy=oPref.Value;
        else
            this.m_bSaveCopy=true;          
        delete oPref;
        
        //what do i do with alternative parts
        oPref = new Object();
        oPref.Value = null;
        if (PrefAccess.Get("bool","maildotcom.bSendHtml",oPref))
            this.m_bSendHtml = oPref.Value;
        else
            this.m_bSendHtml = false;    
        delete oPref;
            
        this.m_Log.Write("nsMailDotComSMTP.js - Constructor - END");  
    }
    catch(e)
    {
        DebugDump("nsMailDotComSMTP.js: Constructor : Exception : " 
                                      + e.name 
                                      + ".\nError message: " 
                                      + e.message +"\n"
                                      + e.lineNumber);
    }
}



nsMailDotComSMTP.prototype =
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
        try
        {
           this.m_Log.Write("nsMailDotCom.js - logIN - START");   
            this.m_Log.Write("nsMailDotCom.js - logIN - Username: " + this.m_szUserName 
                                                   + " Password: " + this.m_szPassWord 
                                                   + " stream: " + this.m_oResponseStream);
            
            if (!this.m_szUserName || !this.m_oResponseStream || !this.m_szPassWord) return false;
                 
            //get mail.com webpage
            this.m_HttpComms.clean();
            this.m_SessionData = this.m_SessionManager.findSessionData(this.m_szUserName);
            if (this.m_SessionData && this.m_bReUseSession)
            {
                this.m_Log.Write("nsMailDotCom.js - logIN - Session Data found");
                this.m_HttpComms.setCookieManager(this.m_SessionData.oCookieManager);
                this.m_szLocation = this.m_SessionData.oComponentData.findElement("szLocation");
                this.m_Log.Write("nsMailDotCom.js - logIN - szLocation - " +this.m_szLocation);    
                this.m_szFolderList = this.m_SessionData.oComponentData.findElement("szFolderList");
                this.m_Log.Write("nsMailDotCom.js - logIN - szFolderList - " +this.m_szFolderList);    
                
                //get folder list
                this.m_iStage =3;
                this.m_bReEntry = true;
                this.m_HttpComms.setURI(this.m_szFolderList);
                this.m_HttpComms.setRequestMethod("GET");
                var bResult = this.m_HttpComms.send(this.loginOnloadHandler);                             
                if (!bResult) throw new Error("httpConnection returned false");
            }
            else
            {   //get mail.com webpage 
                this.m_iStage =0;
                this.m_HttpComms.setURI("http://www.mail.com");
                this.m_HttpComms.setRequestMethod("GET");
                var bResult = this.m_HttpComms.send(this.loginOnloadHandler);                             
                if (!bResult) throw new Error("httpConnection returned false");
            }
            
            this.m_Log.Write("nsMailDotCom.js - logIN - END");    
            return true;
        }
        catch(e)
        {
            this.m_Log.DebugDump("nsMailDotComSMTP.js: logIN : Exception : " 
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
            mainObject.m_Log.Write("nsMailDotCom.js - loginOnloadHandler - START"); 
            mainObject.m_Log.Write("nsMailDotCom.js - loginOnloadHandler : " +mainObject.m_iStage);  
            
            var httpChannel = event.QueryInterface(Components.interfaces.nsIHttpChannel);
            
            //if this fails we've gone somewhere new
            mainObject.m_Log.Write("nsMailDotCom.js - loginOnloadHandler - status :" +httpChannel.responseStatus );
            if (httpChannel.responseStatus != 200) 
                throw new Error("return status " + httpChannel.responseStatus);
           
            //ads handler
            if (httpChannel.URI.spec.search(/intr.main/)!=-1)
            { 
                var bAd = mainObject.ads(szResponse, mainObject.loginOnloadHandler);
                if (!bAd)throw new Error("Ad Handler failed");
                return true;
            }
            
            mainObject.m_HttpComms.clean();
                        
            //page code                                
            switch (mainObject.m_iStage)
            {
                case 0: //refresh page
                    var szRefreshURI = szResponse.match(patternMailRefresh)[1];
                    mainObject.m_Log.Write("nsMailDotCom.js - loginOnloadHandler - Refresh URI " + szRefreshURI);
                    
                    mainObject.m_HttpComms.setURI(szRefreshURI);
                    mainObject.m_HttpComms.setRequestMethod("GET");
                    var bResult = mainObject.m_HttpComms.send(mainObject.loginOnloadHandler);                             
                    if (!bResult) throw new Error("httpConnection returned false");
                    mainObject.m_iStage++;
                break;
                
                case 1: //login page
                    //get login form
                    var szForm= szResponse.match(patternMailDotComLoginForm)[0];
                    if (!szForm) 
                        throw new Error("error parsing mail.com login web page");
                    mainObject.m_Log.Write("nsMailDotCom.js - loginOnloadHandler - form " + szForm );
                    
                    //get login URI
                    var szLoginURI= szForm.match(patternMailDotComLoginURI)[1];
                    mainObject.m_Log.Write("nsMailDotCom.js - loginOnloadHandler - login uri " + szLoginURI);
                
                    //get login input form
                    var aszLoginInput= szForm.match(patternMailDotComLoginInput);
                    mainObject.m_Log.Write("nsMailDotCom.js - loginOnloadHandler - login input " + aszLoginInput);
                    
                    mainObject.m_HttpComms.setContentType(0);
                    
                    //login data 
                    for (i=0; i<aszLoginInput.length; i++)
                    {
                        var szName=aszLoginInput[i].match(patternMailDotComName)[1];
                        mainObject.m_Log.Write("nsMailDotCom.js - loginOnloadHandler - name " + szName);
                
                        if (szName.search(/^login$/i)!=-1)
                        {
                            var szUserName =  encodeURI(mainObject.m_szUserName);
                            mainObject.m_HttpComms.addValuePair(szName, szUserName);
                        }
                        else if (szName.search(/password/i)!=-1)
                        {
                            var szPassword =  encodeURI(mainObject.m_szPassWord);
                            mainObject.m_HttpComms.addValuePair(szName, szPassword);
                        }
                        else if (szName.search(/siteselected/i)!=-1)
                        {
                            if(aszLoginInput[i].search(/checked/i)!=-1)
                            {
                                var szValue=aszLoginInput[i].match(patternMailDotComValue)[1];
                                szValue = encodeURI(szValue);
                                mainObject.m_Log.Write("nsMailDotCom.js - loginOnloadHandler - value " + szValue);
                                mainObject.m_HttpComms.addValuePair(szName, szValue);
                            }
                        }
                        else
                        {
                            var szValue=aszLoginInput[i].match(patternMailDotComValue)[1];
                            szValue = encodeURI(szValue);  
                            mainObject.m_Log.Write("nsMailDotCom.js - loginOnloadHandler - value " + szValue);
                            mainObject.m_HttpComms.addValuePair(szName, szValue);
                        }
                    }
                                        
                    //construct fake cookie
                    var szCookie = "loginName2=" + encodeURIComponent(mainObject.m_szUserName)+ "; sitetype=normal;";
                    mainObject.m_HttpComms.addRequestHeader("Cookie", szCookie , false);
                    
                    mainObject.m_HttpComms.setURI(szLoginURI);
                    mainObject.m_HttpComms.setRequestMethod("POST");
                    var bResult = mainObject.m_HttpComms.send(mainObject.loginOnloadHandler);      
                    if (!bResult) throw new Error("httpConnection returned false");
                    mainObject.m_iStage++;
                break;
                
                case 2: //frame
                     //get mail box
                    var szMailBox = szResponse.match(patternMailDotComFrame)[1];
                    if (!szMailBox) 
                        throw new Error("error parsing mail.com login web page");
                    mainObject.m_Log.Write("nsMailDotCom.js - loginOnloadHandler - mailbox " + szMailBox);
                
                    mainObject.m_HttpComms.setURI(szMailBox);
                    mainObject.m_HttpComms.setRequestMethod("GET");
                    var bResult = mainObject.m_HttpComms.send(mainObject.loginOnloadHandler);
                    if (!bResult) throw new Error("httpConnection returned false");
                    mainObject.m_iStage++
                break;
                
                
                case 3://get folder list
                    var szLocation = httpChannel.URI.spec;
                    mainObject.m_Log.Write("nsMailDotCom.js - loginOnloadHandler - location "+ szLocation);
                    if (szLocation.search(/frontpage.main/)==-1)
                    {
                        if (mainObject.m_bReEntry)
                        {
                            mainObject.m_bReEntry = false;
                            mainObject.m_iStage =0;
                            mainObject.m_HttpComms.setURI("http://www.mail.com");
                            mainObject.m_HttpComms.setRequestMethod("GET");
                            var bResult = mainObject.m_HttpComms.send(mainObject.loginOnloadHandler);                             
                            if (!bResult) throw new Error("httpConnection returned false");
                            return;
                        }
                        else
                            throw new Error("error logging in");
                    }
                    
                    mainObject.m_szLocation = httpChannel.URI.prePath 
                    mainObject.m_Log.Write("nsMailDotCom.js - loginOnloadHandler - location "+ mainObject.m_szLocation);
                        
                    
                    //get composer uri
                    var aszComposerForm = szResponse.match(patternMailDotComComposeButtonForm);
                    mainObject.m_Log.Write("nsMailDotCom.js - loginOnloadHandler - aszComposerForm "+ aszComposerForm);
                    var aInputs = aszComposerForm[0].match(patternMailDotComSMTPInput);
                    mainObject.m_Log.Write("nsMailDotCom.js - loginOnloadHandler - aInputs "+ aInputs);
                    var szComposer = null;
                    for (i=0; i<aInputs.length; i++)
                    {
                        mainObject.m_Log.Write("nsMailDotCom.js - loginOnloadHandler - Input "+ aInputs[i]); 
                        if (aInputs[i].search(/compose/)!=-1)
                        {
                            szComposer = aInputs[i].match(patternMailDotComComposerURI)[1];
                            mainObject.m_Log.Write("nsMailDotCom.js - loginOnloadHandler - szComposer "+ szComposer);
                            mainObject.m_szComposeURI =  mainObject.m_szLocation + szComposer;
                            mainObject.m_Log.Write("nsMailDotCom.js - loginOnloadHandler - composer "+ mainObject.m_szComposeURI);
                        }
                    }
                    
                    //get folder uri
                    var szFolder = szResponse.match(patternMailDotComFolders)[1];
                    mainObject.m_szFolderList =  mainObject.m_szLocation + szFolder;
                    mainObject.m_Log.Write("nsMailDotCom.js - loginOnloadHandler - folders "+ mainObject.m_szFolderList);
                  
                  
                    //server response
                    mainObject.serverComms("235 Your In\r\n");
                    mainObject.m_bAuthorised = true;
                break;    
            };
           
            mainObject.m_Log.Write("nsMailDotCom.js - loginOnloadHandler - END");
        }
        catch(err)
        {
            mainObject.m_Log.DebugDump("nsMailDotComSMTP.js: loginHandler : Exception : " 
                                          + err.name 
                                          + ".\nError message: " 
                                          + err.message+ "\n"
                                          + err.lineNumber);
                                            
            mainObject.serverComms("502 negative vibes from "+mainObject.m_szUserName+"\r\n");
        }
    },
    
    
    rawMSG : function (szEmail)
    {
        try
        {
            this.m_Log.Write("nsMailDotComSMTP.js - rawMSG - START");   
            this.m_Log.Write("nsMailDotComSMTP.js - rawMSG " + szEmail);
    
            this.m_iStage =0 ;

            if (!this.m_Email.parse(szEmail))
                throw new Error ("Parse Failed")
           
            this.m_iAttCount = this.m_Email.attachments.length-1;
            this.m_iAttUploaded = 0;
             
            //get composer page
            this.m_HttpComms.clean();
            this.m_HttpComms.setURI(this.m_szComposeURI);
            this.m_HttpComms.setRequestMethod("GET");       
            var bResult = this.m_HttpComms.send(this.composerOnloadHandler);  
            if (!bResult) throw new Error("httpConnection returned false");
            
            this.m_Log.Write("nsMailDotComSMTP.js - rawMSG - END");    
            return true;
        }
        catch(err)
        {
            this.m_Log.DebugDump("nsMailDotComSMTP.js: rawMSG : Exception : " 
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
            mainObject.m_Log.Write("nsMailDotComSMTP.js - composerOnloadHandler - START"); 
            mainObject.m_Log.Write("nsMailDotComSMTP.js - composerOnloadHandler : " + mainObject.m_iStage);  
            
            var httpChannel = event.QueryInterface(Components.interfaces.nsIHttpChannel);
            
            //if this fails we've gone somewhere new
            mainObject.m_Log.Write("nsMailDotComSMTP.js - composerOnloadHandler - status :" +httpChannel.responseStatus );
            if (httpChannel.responseStatus != 200) 
                throw new Error("return status " + httpChannel.responseStatus);
            
            //ads handler
            if (httpChannel.URI.spec.search(/intr.main/)!=-1)
            { 
                var bAd = mainObject.ads(szResponse, mainObject.composerOnloadHandler);
                if (!bAd)throw new Error("Ad Handler failed");
                return;
            }
            
            mainObject.m_HttpComms.clean();
            
            var szReferer = httpChannel.URI.spec;
            mainObject.m_Log.Write("nsMailDotComSMTP.js - composerOnloadHandler - Referer :" +szReferer);
             
            if (mainObject.m_Email.attachments.length>0 && !mainObject.m_bAttHandled)
                mainObject.m_iStage = 2; 
            
            switch(mainObject.m_iStage)
            {
                case 0: //get advanced editor
                    mainObject.m_Log.Write("nsMailDotCom.js - composerOnloadHandler - compose message");
                    var szForm= szResponse.match(patternMailDotComComposeForm)[0];
                    if (!szForm) 
                        throw new Error("error parsing mail.com login web page");
                    mainObject.m_Log.Write("nsMailDotCom.js - composerOnloadHandler - form " + szForm );
                    
                     //get login URI
                    var szURI= szForm.match(patternMailDotComLoginURI)[1];
                    mainObject.m_Log.Write("nsMailDotCom.js - composerOnloadHandler - login uri " + szURI);
                    
                    //get login input form
                    var aszInput= szForm.match(patternMailDotComLoginInput);
                    mainObject.m_Log.Write("nsMailDotCom.js - composerOnloadHandler - login input " + aszInput);
                    
                    //compose email
                    var szTxtBody = null;
                    var szHtmlBody = null;
                    if (mainObject.m_Email.txtBody)
                        szTxtBody = mainObject.m_Email.txtBody.body.getBody();
                    if (mainObject.m_Email.htmlBody)
                        szHtmlBody = mainObject.m_Email.htmlBody.body.getBody();
                    
                    if (szTxtBody && !mainObject.m_bSendHtml || !szHtmlBody)
                    {
                        mainObject.m_Log.Write("nsYahooSMTP.js - composerOnloadHandler - plain");
                        mainObject.m_HttpComms.addValuePair("format","");
                        mainObject.m_HttpComms.addValuePair("body",mainObject.escapeStr(szTxtBody));
                        mainObject.m_HttpComms.addValuePair("advancededitor","");
                    }
                    else if (szHtmlBody && mainObject.m_bSendHtml || !szTxtBody)
                    {   
                        mainObject.m_Log.Write("nsYahooSMTP.js - composerOnloadHandler - html");
                        mainObject.m_HttpComms.addValuePair("emailcomposer","advanced");
                        mainObject.m_HttpComms.addValuePair("format","html");
                        mainObject.m_HttpComms.addValuePair("body",mainObject.escapeStr(szHtmlBody));
                        mainObject.m_HttpComms.addValuePair("switchnow","no");
                        mainObject.m_HttpComms.addValuePair("composebody","");
                    }
                    
                    //other composer data 
                    for (i=0; i<aszInput.length; i++)
                    {
                        mainObject.m_Log.Write("nsMailDotCom.js - loginOnloadHandler - input " + aszInput[i]);
                        var szType = aszInput[i].match(patternMailDotComType)[1];
                        if (szType.search(/button/)==-1 && szType.search(/checkbox/)==-1 )
                        {
                            var szName=aszInput[i].match(patternMailDotComName)[1];
                            mainObject.m_Log.Write("nsMailDotCom.js - loginOnloadHandler - input szName " + szName);
                            
                            var szValue = "";
                            try
                            {
                                szValue = aszInput[i].match(patternMailDotComValue)[1];
                            }
                            catch(err){}
                            
                            mainObject.m_Log.Write("nsMailDotCom.js - loginOnloadHandler - input szValue " + szValue);
                            
                            if (szName.search(/^Send$/i)!=-1)
                                mainObject.m_HttpComms.addValuePair(szName,"Send"); 
                            else if (szName.search(/^to$/i)!=-1)
                            {
                                var szTo = mainObject.m_Email.headers.getTo(); 
                                mainObject.m_HttpComms.addValuePair(szName, (szTo? escape(szTo) : ""));
                             }
                            else if (szName.search(/^cc$/i)!=-1)
                            {
                                var szCc = mainObject.m_Email.headers.getCc();
                                mainObject.m_HttpComms.addValuePair(szName, (szCc? escape(szCc) : ""));
                            }
                            else if (szName.search(/^bcc$/i)!=-1)
                            {
                                var szBCC = mainObject.getBcc(szTo, szCc);
                                mainObject.m_HttpComms.addValuePair(szName, (szBCC? escape(szBCC) : ""));
                            }
                            else if (szName.search(/subject/i)!=-1)
                            {
                                var szSubject = mainObject.m_Email.headers.getSubject(); 
                                mainObject.m_HttpComms.addValuePair(szName,
                                            (szSubject? escape(szSubject) : "%20"));     
                            }
                            else if (szName.search(/emailcomposer/i)!=-1 || 
                                     szName.search(/advancededitor/i)!=-1 ||
                                     szName.search(/format/i)!=-1)
                            {
                                mainObject.m_Log.Write("nsMailDotComSMTP.js - composerOnloadHandler - removing");  
                            }
                            else if (szName.search(/savesent/i)!=-1)
                            {   
                                var szSave = mainObject.m_bSaveCopy ? "yes" : "no";
                                mainObject.m_HttpComms.addValuePair(szName,szSave);
                            }
                            else
                                 mainObject.m_HttpComms.addValuePair(szName,szValue);
                        }
                    }  
                    
                    mainObject.m_HttpComms.setURI(szURI);
                    mainObject.m_HttpComms.setRequestMethod("POST");
                    mainObject.m_HttpComms.setContentType(0);
                    var bResult = mainObject.m_HttpComms.send(mainObject.composerOnloadHandler);
                    if (!bResult) throw new Error("httpConnection returned false");
                    mainObject.m_iStage=1;
                break;
                                
                case 1:  //message ok
                    mainObject.m_Log.Write("nsMailDotCom.js - composerOnloadHandler - message ok");
                    if (szResponse.search(/aftersent/igm)!=-1)
                    {
                        if (!mainObject.m_SessionData)
                        {
                            mainObject.m_SessionData = Components.classes["@mozilla.org/SessionData;1"].createInstance();
                            mainObject.m_SessionData.QueryInterface(Components.interfaces.nsISessionData);
                            mainObject.m_SessionData.szUserName = mainObject.m_szUserName;
                            
                            var componentData = Components.classes["@mozilla.org/ComponentData;1"].createInstance();
                            componentData.QueryInterface(Components.interfaces.nsIComponentData);
                            mainObject.m_SessionData.oComponentData = componentData;
                        }
                        mainObject.m_SessionData.oCookieManager = mainObject.m_HttpComms.getCookieManager();
                        mainObject.m_SessionData.oComponentData.addElement("szLocation",mainObject.m_szLocation);
                        mainObject.m_SessionData.oComponentData.addElement("szFolderList", mainObject.m_szFolderList);
                        mainObject.m_SessionManager.setSessionData(mainObject.m_SessionData);
                        
                        mainObject.serverComms("250 OK\r\n");
                    }
                    else
                        mainObject.serverComms("502 Error Sending Email\r\n");   
                break;
                
                
                case 2: //attachments
                    mainObject.m_Log.Write("nsMailDotCom.js - composerOnloadHandler -  get attachemnt page");

                    var szForm= szResponse.match(patternMailDotComComposeForm)[0];
                    if (!szForm) 
                        throw new Error("error parsing mail.com login web page");
                    mainObject.m_Log.Write("nsMailDotCom.js - composerOnloadHandler - form " + szForm );
                    
                     //get login URI
                    var szURI= szForm.match(patternMailDotComLoginURI)[1];
                    mainObject.m_Log.Write("nsMailDotCom.js - composerOnloadHandler - login uri " + szURI);
                    
                    //get login input form
                    var aszInput= szForm.match(patternMailDotComLoginInput);
                    mainObject.m_Log.Write("nsMailDotCom.js - composerOnloadHandler - login input " + aszInput);
                    
                                        
                    //composer data 
                    for (i=0; i<aszInput.length; i++)
                    {
                        mainObject.m_Log.Write("nsMailDotCom.js - composerOnloadHandler - input " + aszInput[i]);
                        var szType = aszInput[i].match(patternMailDotComType)[1];
                        if (szType.search(/button/)==-1 && szType.search(/checkbox/)==-1 )
                        {
                            var szName=aszInput[i].match(patternMailDotComName)[1];
                            mainObject.m_Log.Write("nsMailDotCom.js - composerOnloadHandler - input szName " + szName);
                            
                            var szValue = "";
                            try
                            {
                                szValue = aszInput[i].match(patternMailDotComValue)[1];
                            }
                            catch(err){}
                            
                            mainObject.m_Log.Write("nsMailDotCom.js - composerOnloadHandler - input szValue " + szValue);
                            
                            if (szName.search(/^att$/i)!=-1)
                                mainObject.m_HttpComms.addValuePair(szName,"show"); 
                            else
                                 mainObject.m_HttpComms.addValuePair(szName,szValue);
                        }
                    }  
                    
                    mainObject.m_bAttHandled =true;
                    mainObject.m_HttpComms.setURI(szURI);
                    mainObject.m_HttpComms.setRequestMethod("POST");
                    mainObject.m_HttpComms.setContentType(0);
                    var bResult = mainObject.m_HttpComms.send(mainObject.composerOnloadHandler);
                    if (!bResult) throw new Error("httpConnection returned false");
                    mainObject.m_iStage =3;
                break;
                
                case 3: //upload attachment
                    mainObject.m_Log.Write("nsMailDotCom.js - composerOnloadHandler - upload attachment");
                    
                    var szForm= szResponse.match(patternMailDotComAttachForm)[0];
                    if (!szForm) 
                        throw new Error("error parsing mail.com login web page");
                    mainObject.m_Log.Write("nsMailDotCom.js - composerOnloadHandler - form " + szForm );
                    
                     //get login URI
                    var szURI= szForm.match(patternMailDotComLoginURI)[1];
                    mainObject.m_Log.Write("nsMailDotCom.js - composerOnloadHandler - login uri " + szURI);
                    
                    //get login input form
                    var aszInput= szForm.match(patternMailDotComLoginInput);
                    mainObject.m_Log.Write("nsMailDotCom.js - composerOnloadHandler - login input " + aszInput);
                    
                    var oAttach = mainObject.m_Email.attachments[mainObject.m_iAttUploaded];
                    
                    if (mainObject.m_iAttUploaded == mainObject.m_iAttCount)
                        mainObject.m_iStage = 4;
                    else
                        mainObject.m_iStage = 3;  
                        
                    //composer data 
                    for (i=0; i<aszInput.length; i++)
                    {
                        mainObject.m_Log.Write("nsMailDotCom.js - composerOnloadHandler - input " + aszInput[i]);
                        var szType = aszInput[i].match(patternMailDotComType)[1];
                        if (szType.search(/button/)==-1 && szType.search(/checkbox/)==-1 )
                        {
                            var szName=aszInput[i].match(patternMailDotComName)[1];
                            mainObject.m_Log.Write("nsMailDotCom.js - composerOnloadHandler - input szName " + szName);
                            
                            var szValue = "";
                            try
                            {
                                szValue = aszInput[i].match(patternMailDotComValue)[1];
                            }
                            catch(err)
                            {
                                szValue = "";
                            }
                            mainObject.m_Log.Write("nsMailDotCom.js - composerOnloadHandler - input szValue " + szValue);
                            
                            if (szName.search(/^att$/i)!=-1)
                                mainObject.m_HttpComms.addValuePair(szName,"upload"); 
                            else if (szName.search(/^filename$/i)!=-1)
                            {
                                var szFileName = oAttach.headers.getContentType(4);
                                if (!szFileName) szFileName = "";
                                mainObject.m_HttpComms.addValuePair(szName,szFileName); 
                            }
                            else if (szName.search(/^attachment$/i)!=-1)
                            {
                                //headers
                                var szFileName = oAttach.headers.getContentType(4);
                                if (!szFileName) szFileName = "";
                                                          
                                //body
                                var szBody = oAttach.body.getBody();
                                mainObject.m_HttpComms.addFile(szName, szFileName, szBody);
                            }
                            else
                                 mainObject.m_HttpComms.addValuePair(szName,szValue);
                        }
                    }  
                    
                    mainObject.m_iAttUploaded ++;
                    mainObject.m_HttpComms.setContentType(1);
                    mainObject.m_HttpComms.setURI(szURI);                  
                    mainObject.m_HttpComms.setRequestMethod("POST");
                    var bResult = mainObject.m_HttpComms.send(mainObject.composerOnloadHandler);  
                    if (!bResult) throw new Error("httpConnection returned false");
                break;
                
                case 4:
                    mainObject.m_Log.Write("nsMailDotCom.js - composerOnloadHandler - attachment done");
                    
                    var szForm= szResponse.match(patternMailDotComAttachForm)[0];
                    if (!szForm) 
                        throw new Error("error parsing mail.com login web page");
                    mainObject.m_Log.Write("nsMailDotCom.js - composerOnloadHandler - form " + szForm );
                    
                     //get login URI
                    var szURI= szForm.match(patternMailDotComLoginURI)[1];
                    mainObject.m_Log.Write("nsMailDotCom.js - composerOnloadHandler - login uri " + szURI);
                    
                    //get login input form
                    var aszInput= szForm.match(patternMailDotComLoginInput);
                    mainObject.m_Log.Write("nsMailDotCom.js - composerOnloadHandler - login input " + aszInput);
                    
                    //composer data 
                    for (i=0; i<aszInput.length; i++)
                    {
                        mainObject.m_Log.Write("nsMailDotCom.js - composerOnloadHandler - input " + aszInput[i]);
                        var szType = aszInput[i].match(patternMailDotComType)[1];
                        if (szType.search(/button/)==-1 && szType.search(/checkbox/)==-1 )
                        {
                            var szName=aszInput[i].match(patternMailDotComName)[1];
                            mainObject.m_Log.Write("nsMailDotCom.js - composerOnloadHandler - input szName " + szName);
                            
                            var szValue = "";
                            try
                            {
                                szValue = aszInput[i].match(patternMailDotComValue)[1];
                            }
                            catch(err){}
                            
                            mainObject.m_Log.Write("nsMailDotCom.js - composerOnloadHandler - input szValue " + szValue);
                            
                            if (szName.search(/^att$/i)!=-1)
                                mainObject.m_HttpComms.addValuePair(szName,"done");
                            else
                                 mainObject.m_HttpComms.addValuePair(szName,szValue);
                        }
                    }  
                    
                    mainObject.m_HttpComms.setContentType(1);
                    mainObject.m_HttpComms.setURI(szURI);                  
                    mainObject.m_HttpComms.setRequestMethod("POST");
                    var bResult = mainObject.m_HttpComms.send(mainObject.composerOnloadHandler);  
                    if (!bResult) throw new Error("httpConnection returned false");
                    mainObject.m_iStage = 0;
                break;
            } 
                            
            mainObject.m_Log.Write("nsMailDotComSMTP.js - composerOnloadHandler - END");
        }
        catch(err)
        {
            mainObject.m_Log.DebugDump("nsMailDotComSMTP.js: composerOnloadHandler : Exception : " 
                                          + err.name 
                                          + ".\nError message: " 
                                          + err.message + "\n"
                                          + err.lineNumber);
                                            
            mainObject.serverComms("502 negative vibes from "+mainObject.m_szUserName+"\r\n");
        }
    },
    
    
    getBcc : function (szTo,szCc)
    {
        try
        {
            this.m_Log.Write("nsMailDotComSMTP.js - getBcc - START");
            if (this.m_aszTo.length==0) return null;
            this.m_Log.Write("nsMailDotComSMTP.js - getBcc - szRcptList " + this.m_aszTo);  
            
            var szBcc = null;
            var szAddress = null;
            if (szTo) szAddress = szTo;
            if (szCc) szAddress = (szTo ? (szAddress + ","+ szCc) : szCc);
            this.m_Log.Write("nsMailDotComSMTP.js - getBcc - szAddress " + szAddress);
           
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
            this.m_Log.Write("nsMailDotComSMTP.js - getBcc szBcc- " + szBcc);
            
            this.m_Log.Write("nsMailDotComSMTP.js - getBcc - End");
            return szBcc;  
        }
        catch(err)
        {
            this.m_Log.DebugDump("nsMailDotComSMTP.js: getBcc : Exception : " 
                                                  + err.name 
                                                  + ".\nError message: " 
                                                  + err.message + "\n"
                                                  + err.lineNumber);
                                                  
            return null;
        }
    },
    
    
    
    
    ads : function (szResponse, callback) 
    {
        try
        {
            this.m_Log.Write("nsMailDotComSMTP.js - ads - START");
            var szDataPage = szResponse.match(patternMailDotComAddURI)[1];
            this.m_Log.Write("nsMailDotComSMTP.js - ads - URI " + szDataPage);
            
            this.m_BeforeAdsCallback = callback;
            
            this.m_HttpComms.clean();
            this.m_HttpComms.setURI(szDataPage);
            this.m_HttpComms.setRequestMethod("GET");
            var bResult = this.m_HttpComms.send(this.adsHandler); 
            if (!bResult) throw new Error("httpConnection returned false"); 
           
            this.m_Log.Write("nsMailDotComSMTP.js - ads - END");
            return true;
        }
        catch(err)
        {
            this.m_Log.DebugDump("nsMailDotComSMTP.js: ads : Exception : " 
                                              + err.name 
                                              + ".\nError message: " 
                                              + err.message);
            return false;
        }
    },
     
     
     
    adsHandler : function (szResponse ,event , mainObject)  
    {
        try
        {
            mainObject.m_Log.Write("nsMailDotComSMTP.js - adsHandler - START");
            var szMailBox = szResponse.match(patternMailDotComFrame)[1];
            if (!szMailBox) 
                throw new Error("error parsing mail.com login web page");
            mainObject.m_Log.Write("nsMailDotComSMTP.js - adsHandler - mailbox " + szMailBox);
           
            mainObject.m_HttpComms.clean();
            mainObject.m_HttpComms.setURI(szMailBox);
            mainObject.m_HttpComms.setRequestMethod("GET");
            var bResult = mainObject.m_HttpComms.send(mainObject.m_BeforeAdsCallback); 
            if (!bResult) throw new Error("httpConnection returned false"); 
                  
            mainObject.m_Log.Write("nsMailDotComSMTP.js - adsHandler - START");
        }
        catch(err)
        {
            mainObject.m_Log.DebugDump("nsMailDotComSMTP.js: adsHandler : Exception : " 
                                              + err.name 
                                              + ".\nError message: " 
                                              + err.message);
            mainObject.serverComms("-ERR negative vibes\r\n");
        }
    },
    
    
    escapeStr : function(szMSG)
    {
        var szEncode = escape(szMSG);
        szEncode = szEncode.replace(/%20/gm,"+"); //replace space
        return szEncode;
    },
    
    ////////////////////////////////////////////////////////////////////////////
    /////  Comms                  
    
    serverComms : function (szMsg)
    {
        try
        { 
            this.m_Log.Write("nsMailDotComSMTP.js - serverComms - START");
            this.m_Log.Write("nsMailDotComSMTP.js - serverComms msg " + szMsg);
            var iCount = this.m_oResponseStream.write(szMsg,szMsg.length);
            this.m_Log.Write("nsMailDotComSMTP.js - serverComms sent count: " + iCount 
                                                        +" msg length: " +szMsg.length);
            this.m_Log.Write("nsMailDotComSMTP.js - serverComms - END");  
        }
        catch(e)
        {
            this.m_Log.DebugDump("nsMailDotComSMTP.js: serverComms : Exception : " 
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
var nsMailDotComSMTPFactory = new Object();

nsMailDotComSMTPFactory.createInstance = function (outer, iid)
{
    if (outer != null) throw Components.results.NS_ERROR_NO_AGGREGATION;
    
    if (!iid.equals(nsMailDotComSMTPClassID) && !iid.equals(Components.interfaces.nsISupports))
        throw Components.results.NS_ERROR_INVALID_ARG;
    
    return new nsMailDotComSMTP();
}


/******************************************************************************/
/* MODULE */
var nsMailDotComSMTPModule = new Object();

nsMailDotComSMTPModule.registerSelf = function(compMgr, fileSpec, location, type)
{
    compMgr = compMgr.QueryInterface(Components.interfaces.nsIComponentRegistrar);
    compMgr.registerFactoryLocation(nsMailDotComSMTPClassID,
                                    "MailDotComSMTPComponent",
                                    nsMailDotComSMTPContactID, 
                                    fileSpec,
                                    location, 
                                    type);
}


nsMailDotComSMTPModule.unregisterSelf = function(aCompMgr, aFileSpec, aLocation)
{
    aCompMgr = aCompMgr.QueryInterface(Components.interfaces.nsIComponentRegistrar);
    aCompMgr.unregisterFactoryLocation(nsMailDotComSMTPClassID, aFileSpec);
}

 
nsMailDotComSMTPModule.getClassObject = function(compMgr, cid, iid)
{
    if (!cid.equals(nsMailDotComSMTPClassID))
        throw Components.results.NS_ERROR_NO_INTERFACE;

    if (!iid.equals(Components.interfaces.nsIFactory))
        throw Components.results.NS_ERROR_NOT_IMPLEMENTED;

    return nsMailDotComSMTPFactory;
}


nsMailDotComSMTPModule.canUnload = function(compMgr)
{
    return true;
}
/******************************************************************************/


function NSGetModule(compMgr, fileSpec)
{
    return nsMailDotComSMTPModule; 
}
