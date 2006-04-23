/*****************************  Globals   *************************************/                 
const nsAOLSMTPClassID = Components.ID("{411242b0-9b47-11da-a72b-0800200c9a66}");
const nsAOLSMTPContactID = "@mozilla.org/AOLSMTP;1";
const ExtAOLGuid = "{3c8e8390-2cf6-11d9-9669-0800200c9a66}";

const patternAOLReplace = /parent\.location\.replace\("(.*?)"\);/i;
const patternAOLRedirect = /goToLoginUrl[\s\S]*snsRedir\("(.*?)"\)/i;
const patternAOLLoginForm = /<form.*?loginForm.*?>[\s\S]*<\/form>/igm;
const patternAOLAction = /<form.*?action="(.*?)".*?>/;
const patternAOLInput = /<input.*?>/igm;
const patternAOLType = /type="(.*?)"/i;
const patternAOLName = /name="(.*?)"/i;
const patternAOLValue = /value="(.*?)"/i;
const patternAOLVerify = /<body onLoad=".*?'(http.*?)'.*>/i;
const patternAOLHost = /gPreferredHost.*?"(.*?)";/i;
const patternAOLPath = /gSuccessPath.*?"(.*?)";/i;
const patternAOLHostCheck = /gHostCheckPath.*?"(.*?)"/i;
const patternAOLTarget = /gTargetHost.*?"(.*?)"/i;
const patternAOLMSGList = /gMessageButtonVisibility/i;
const patternAOLVersion =/var VERSION="(.*?)"/i;
const patternAOLUserID =/uid:(.*?)&/i;
const patternAOLSend =/<form.*?name="SendForm".*?>[\s\S]*?<\/form>/igm;
const patternAOLSendCheck = /parent.HandleSendSaveResponse/igm
const patternAOLLogout = /Logout\.aspx/i;
/******************************  AOL ***************************************/
function nsAOLSMTP()
{
    try
    {       
        var scriptLoader =  Components.classes["@mozilla.org/moz/jssubscript-loader;1"];
        scriptLoader = scriptLoader.getService(Components.interfaces.mozIJSSubScriptLoader);
        scriptLoader.loadSubScript("chrome://web-mail/content/common/DebugLog.js");
        scriptLoader.loadSubScript("chrome://web-mail/content/common/base64.js");
        scriptLoader.loadSubScript("chrome://web-mail/content/common/comms.js");
        scriptLoader.loadSubScript("chrome://web-mail/content/common/CommonPrefs.js");
        scriptLoader.loadSubScript("chrome://web-mail/content/common/Email.js");
        
        var date = new Date();
        var  szLogFileName = "AOLSMTP Log - " + date.getHours()
                                           + "-" + date.getMinutes() 
                                           + "-"+ date.getUTCMilliseconds() +" -";
        this.m_Log = new DebugLog("webmail.logging.comms", ExtAOLGuid, szLogFileName); 
        
        this.m_Log.Write("nsAOLSMTP.js - Constructor - START");   
       
        this.m_bAuthorised = false;
        this.m_szUserName = null;   
        this.m_szPassWord = null; 
        this.m_oResponseStream = null;  
        this.m_HttpComms = new Comms(this , this.m_Log);
        this.m_aszTo = new Array;
        this.m_szFrom = null;
        this.m_iStage = 0;
                
        this.m_SuccessPath = null;
        this.m_szHostURL = null;
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
         
        this.m_SessionManager = Components.classes["@mozilla.org/SessionManager;1"];
        this.m_SessionManager = this.m_SessionManager.getService();
        this.m_SessionManager.QueryInterface(Components.interfaces.nsISessionManager); 
        this.m_SessionData = null;   
        
        //do i reuse the session
        var oPref = {Value:null};
        var  WebMailPrefAccess = new WebMailCommonPrefAccess();
        if (WebMailPrefAccess.Get("bool","aol.bReUseSession",oPref))
            this.m_bReUseSession=oPref.Value;
        else
            this.m_bReUseSession=true; 
        
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
            this.m_Log.Write("nsAOL.js - logIN - START");   
            this.m_Log.Write("nsAOL.js - logIN - Username: " + this.m_szUserName 
                                                   + " Password: "  + this.m_szPassWord 
                                                   + " stream: "    + this.m_oResponseStream);
            
            if (!this.m_szUserName || !this.m_oResponseStream || !this.m_szPassWord) return false;
            
            var szTempUserName = this.m_szUserName.split("@");
            this.m_Log.Write("nsAOL.js - logIN - doamain " + szTempUserName); 
            var szDomain = szTempUserName[1];
            
            if (szDomain.search(/aim/i)!=-1) 
                this.m_szAOLMail= "http://webmail.aol.com/";  
            else if (szDomain.search(/netscape/i)!=-1)
                this.m_szAOLMail= "http://mail.netscape.com/";  
            else
                this.m_szAOLMail= "http://webmail.aol.com/";
            
            this.m_HttpComms.clean();
            
            this.m_SessionData = this.m_SessionManager.findSessionData(this.m_szUserName);
            if (this.m_SessionData && this.m_bReUseSession)
            {
                this.m_Log.Write("nsAOL.js - logIN - Session Data found");
                
                this.m_HttpComms.setCookieManager(this.m_SessionData.oCookieManager);
                this.m_szHomeURI = this.m_SessionData.oComponentData.findElement("szHomeURI");
                this.m_Log.Write("nsAOL.js - logIN - m_szHomeURI " +this.m_szHomeURI);
                this.m_szUserId = this.m_SessionData.oComponentData.findElement("szUserId");
                this.m_Log.Write("nsAOL.js - logIN - m_szUserId " +this.m_szUserId);   
                this.m_szVersion = this.m_SessionData.oComponentData.findElement("szVersion");
                this.m_Log.Write("nsAOL.js - logIN - m_szVersion " +this.m_szVersion);      
                this.m_SuccessPath = this.m_SessionData.oComponentData.findElement("szSuccessPath");
                this.m_Log.Write("nsAOL.js - logIN - .m_SuccessPath " +this.m_SuccessPath); 
                this.m_szHostURL = this.m_SessionData.oComponentData.findElement("szHostURL");
                this.m_Log.Write("nsAOL.js - logIN - .m_szHostURL" +this.m_szHostURL); 
                this.m_szLocation = this.m_SessionData.oComponentData.findElement("szLocation");
                this.m_Log.Write("nsAOL.js - logIN - .m_szLocation" +this.m_szLocation);
                
                //get home page
                this.m_iStage =6;
                this.m_bReEntry = true;
                this.m_HttpComms.setURI(this.m_szHomeURI);
                this.m_HttpComms.setRequestMethod("GET");
                var bResult = this.m_HttpComms.send(this.loginOnloadHandler);                             
                if (!bResult) throw new Error("httpConnection returned false");
            }
            else
            {   
                this.m_iStage = 0;
                this.m_HttpComms.setURI(this.m_szAOLMail);
                this.m_HttpComms.setRequestMethod("GET");
                var bResult = this.m_HttpComms.send(this.loginOnloadHandler);                             
                if (!bResult) throw new Error("httpConnection returned false");        
            }
                              
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
            mainObject.m_Log.Write("nsAOL.js - loginOnloadHandler - status :" +httpChannel.responseStatus );
            if (httpChannel.responseStatus != 200)
            { 
                if (mainObject.m_iStage!=5)
                    throw new Error("return status " + httpChannel.responseStatus);
            }
            
            mainObject.m_HttpComms.clean();
            
             //page code                                
            switch (mainObject.m_iStage)
            {
                case 0: // login page               
                    var szLoginReplaceURL = szResponse.match(patternAOLReplace)[1];
                    mainObject.m_Log.Write("nsAOL.js - loginOnloadHandler - replace " + szLoginReplaceURL);
                    if (szLoginReplaceURL == null)
                         throw new Error("error parsing AOL login web page");

                    mainObject.m_HttpComms.setURI(szLoginReplaceURL);
                    mainObject.m_HttpComms.setRequestMethod("GET");
                    var bResult = mainObject.m_HttpComms.send(mainObject.loginOnloadHandler);      
                    if (!bResult) throw new Error("httpConnection returned false");
                    mainObject.m_iStage++;
                break;
                
                
                case 1://redirect
                    var szLoginRedirectURL = szResponse.match(patternAOLRedirect)[1];
                    mainObject.m_Log.Write("nsAOL.js - loginOnloadHandler - redirect " + szLoginRedirectURL);
                    if (szLoginRedirectURL == null)
                         throw new Error("error parsing AOL login web page");
                         
                    mainObject.m_HttpComms.setURI(szLoginRedirectURL);
                    mainObject.m_HttpComms.setRequestMethod("GET");
                    var bResult = mainObject.m_HttpComms.send(mainObject.loginOnloadHandler);      
                    if (!bResult) throw new Error("httpConnection returned false");
                    mainObject.m_iStage++;
                    
                break;
                
                
                case 2: //login page
                    var szLoginForm = szResponse.match(patternAOLLoginForm);
                    mainObject.m_Log.Write("nsAOL.js - loginOnloadHandler - szLoginForm " + szLoginForm);
                    if (szLoginForm == null)
                        throw new Error("error parsing AOL login web page");
                         
                    var aLoginData = szLoginForm[0].match(patternAOLInput);
                    mainObject.m_Log.Write("nsAOL.js - loginOnloadHandler - aLoginData " + aLoginData);
                    
                    for (i=0; i<aLoginData.length; i++)
                    {
                        if (aLoginData[i].search(/type="hidden"/i)!=-1)
                        {
                            var szName=aLoginData[i].match(patternAOLName)[1];
                            mainObject.m_Log.Write("nsAOL.js - loginOnloadHandler - loginData name " + szName);
                            
                            var szValue = aLoginData[i].match(patternAOLValue)[1];
                            mainObject.m_Log.Write("nsAOL.js - loginOnloadHandler - loginData value " + szValue);
                        
                            mainObject.m_HttpComms.addValuePair(szName,(szValue? encodeURIComponent(szValue):""));
                         }
                    }
                    
                    var szScreenName = mainObject.m_szUserName.split("@")[0];
                    var szLogin = encodeURIComponent(szScreenName);
                    mainObject.m_HttpComms.addValuePair("loginId",szLogin);
                    
                    var szPass = encodeURIComponent(mainObject.m_szPassWord);
                    mainObject.m_HttpComms.addValuePair("password",szPass);
                    
                    var szAction = szLoginForm[0].match(patternAOLAction)[1];
                    var szLoginURL = httpChannel.URI.prePath + szAction;
                    mainObject.m_Log.Write("nsAOL.js - loginOnloadHandler - szLoginURL : "+szLoginURL);
                    
                    mainObject.m_HttpComms.setURI(szLoginURL);
                    mainObject.m_HttpComms.setRequestMethod("POST");
                    var bResult = mainObject.m_HttpComms.send(mainObject.loginOnloadHandler);      
                    if (!bResult) throw new Error("httpConnection returned false");
                    mainObject.m_iStage++;
                break;
                
                
                case 3://login bounce 
                    var szLoginVerify = szResponse.match(patternAOLVerify)[1];
                    mainObject.m_Log.Write("nsAOL.js - loginOnloadHandler - szLoginVerify " + szLoginVerify);
                    if (szLoginVerify == null)
                        throw new Error("error parsing AOL login web page");
                   
                    mainObject.m_HttpComms.setURI(szLoginVerify);
                    mainObject.m_HttpComms.setRequestMethod("GET");
                    var bResult = mainObject.m_HttpComms.send(mainObject.loginOnloadHandler);      
                    if (!bResult) throw new Error("httpConnection returned false");
                    mainObject.m_iStage++;
                break;
                
                case 4://get host
                    mainObject.m_szHostURL = szResponse.match(patternAOLHost)[1];
                    if (mainObject.m_szHostURL == null)
                        throw new Error("error parsing AOL login web page");
                    mainObject.m_SuccessPath = szResponse.match(patternAOLPath)[1];
                    var szCheck = szResponse.match(patternAOLHostCheck)[1];
                    var szURL = "http://" + mainObject.m_szHostURL + szCheck;
                               
                    mainObject.m_HttpComms.setURI(szURL);
                    mainObject.m_HttpComms.setRequestMethod("GET");
                    var bResult = mainObject.m_HttpComms.send(mainObject.loginOnloadHandler);      
                    if (!bResult) throw new Error("httpConnection returned false");
                    mainObject.m_iStage++;
                break;
                
                case 5://get mail box                   
                    mainObject.m_szHostURL = szResponse.match(patternAOLTarget)[1];
                    mainObject.m_Log.Write("nsAOL.js - loginOnloadHandler - m_szHostURL " +mainObject.m_szHostURL);
                    if (mainObject.m_szHostURL == null)
                        throw new Error("error parsing AOL login web page");
                   
                    var szURL = "http://" + mainObject.m_szHostURL + mainObject.m_SuccessPath;
                    mainObject.m_szHomeURI = szURL;
                    
                    var szCookies =  httpChannel.getResponseHeader("Set-Cookie");                   
                    mainObject.m_szUserId = szCookies.match(patternAOLUserID)[1];
                    mainObject.m_Log.Write("nsAOL.js - loginOnloadHandler - m_szUserId " +mainObject.m_szUserId);
                    
                    mainObject.m_HttpComms.setURI(szURL);
                    mainObject.m_HttpComms.setRequestMethod("GET");
                    var bResult = mainObject.m_HttpComms.send(mainObject.loginOnloadHandler);      
                    if (!bResult) throw new Error("httpConnection returned false");
                    mainObject.m_iStage++;
                break;
                
                case 6://get urls
                    if(szResponse.search(patternAOLLogout)==-1)
                    {
                        if (mainObject.m_bReEntry)
                        {
                            mainObject.m_bReEntry = false;
                            mainObject.m_iStage =0;
                            mainObject.m_HttpComms.setURI(mainObject.m_szAOLMail);
                            mainObject.m_HttpComms.setRequestMethod("GET");
                            var bResult = mainObject.m_HttpComms.send(mainObject.loginOnloadHandler);                             
                            if (!bResult) throw new Error("httpConnection returned false");
                            return;
                        }
                        else
                            throw new Error("error logging in");
                    }
                      
                    mainObject.m_szVersion = szResponse.match(patternAOLVersion)[1];
                    mainObject.m_Log.Write("nsAOL.js - loginOnloadHandler - szVersion " +mainObject.m_szVersion);
                    
                    var szDir = mainObject.m_SuccessPath.replace(/\/Mail\//i,"/rpc/");
                    mainObject.m_szLocation = "http://" + mainObject.m_szHostURL + szDir ;
                    var szURL = mainObject.m_szLocation + "GetMessageList.aspx?page=1";
                    var szData = "previousFolder=&stateToken=&newMailToken=&"
                    szData += "version="+ mainObject.m_szVersion +"&user="+ mainObject.m_szUserId;
                    
                   
                    //server response
                    mainObject.serverComms("235 Your In\r\n");
                    mainObject.m_bAuthorised = true;
                break;
            }
            mainObject.m_Log.Write("nsAOL.js - loginOnloadHandler - END");
        }
        catch(err)
        {
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
            this.m_Log.Write("nsAOLSMTP.js - rawMSG " + szEmail);
    
            if (!this.m_Email.parse(szEmail))
                throw new Error ("Parse Failed")
                           
            this.m_iStage = 0;
            var szComposer = this.m_szHomeURI + "compose-message.aspx"; 
            this.m_Log.Write("nsAOLSMTP.js - rawMSG szComposer " + szComposer);
            this.m_HttpComms.setURI(szComposer);
            this.m_HttpComms.setRequestMethod("GET");
            var bResult = this.m_HttpComms.send(this.composerOnloadHandler);                             
            if (!bResult) throw new Error("httpConnection returned false");
            
            this.m_Log.Write("nsAOLSMTP.js - rawMSG - END");    
            return true;
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
            mainObject.m_Log.Write("nsAOLSMTP.js - composerOnloadHandler : " + mainObject.m_iStage + "\n");  
            
            var httpChannel = event.QueryInterface(Components.interfaces.nsIHttpChannel);
            
            //if this fails we've gone somewhere new
            mainObject.m_Log.Write("nsAOLSMTP.js - composerOnloadHandler - status :" +httpChannel.responseStatus );
            if (httpChannel.responseStatus != 200) 
                throw new Error("return status " + httpChannel.responseStatus);
           
            mainObject.m_HttpComms.clean();
        
            switch(mainObject.m_iStage)
            {
                case 0: //MSG handler
                    mainObject.m_Log.Write("nsAOLSMTP.js - composerOnloadHandler - Send MSG");
                    
                    var szForm = szResponse.match(patternAOLSend)[0];
                    mainObject.m_Log.Write("nsAOLSMTP.js - composerOnloadHandler - Form " + szForm);
                    
                    var aszInput = szResponse.match(patternAOLInput);
                    mainObject.m_Log.Write("nsAOLSMTP.js - composerOnloadHandler - aszInput " + aszInput);
                    
                    for (i=0; i< aszInput.length; i++)
                    { 
                        var szType = aszInput[i].match(patternAOLType)[1];
                        mainObject.m_Log.Write("nsAOLSMTP.js - composerOnloadHandler - szType " + szType);
                        
                        if (szType.search(/button/i)==-1)
                        {
                            var szName = aszInput[i].match(patternAOLName)[1];
                            mainObject.m_Log.Write("nsYahooSMTP.js - composerOnloadHandler - Name " + szName); 
                            
                            var szValue = null; 
                            if (szName.search(/upload/i)==-1)
                            {
                                if (szName.search(/user/i)!=-1) 
                                    szValue = mainObject.m_szUserId;
                                else if (szName.search(/From/i)!=-1) 
                                    szValue = mainObject.m_szFrom;
                                else if (szName.search(/PlainBody/i)!=-1) 
                                {
                                    if (mainObject.m_Email.txtBody)
                                        szValue = mainObject.m_Email.txtBody.body.getBody();
                                    else 
                                        szValue ="";
                                }
                                else if (szName.search(/RichBody/i)!=-1)
                                {
                                    if (mainObject.m_Email.htmlBody)
                                        szValue = mainObject.m_Email.htmlBody.body.getBody();
                                    else
                                        szValue ="";
                                }
                                else if (szName.search(/RichEdit/i)!=-1)
                                {
                                    if (mainObject.m_Email.htmlBody)
                                        szValue = "1";
                                    else 
                                        szValue = "0";                                       
                                }
                                else if (szName.search(/^To/i)!=-1) 
                                    szValue =  mainObject.m_Email.headers.getTo();
                                else if (szName.search(/^Cc/i)!=-1) 
                                    szValue = mainObject.m_Email.headers.getCc();
                                else if (szName.search(/bcc/i)!=-1)
                                {
                                    var szTo = mainObject.m_Email.headers.getTo();
                                    var szCc = mainObject.m_Email.headers.getCc();
                                    szValue = mainObject.getBcc(szTo, szCc);
                                }
                                else if (szName.search(/subject/i)!=-1)
                                    szValue = mainObject.m_Email.headers.getSubject();
                                else
                                {
                                    try
                                    {
                                        szValue = aszInput[i].match(patternAOLValue)[1];
                                    }
                                    catch(err)
                                    {
                                        szValue = "";
                                    }
                                }   
                                
                                mainObject.m_HttpComms.addValuePair(szName,szValue);  
                            }
                            else 
                            {
                                if (mainObject.m_iAttCount < mainObject.m_Email.attachments.length)
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
                                else
                                    mainObject.m_HttpComms.addFile(szName, "", ""); 
                                    
                            }                     
                        }
                    }  
                    
                    mainObject.m_HttpComms.setContentType(1);
                    var szAction = mainObject.m_szLocation + "SendMessage.aspx?version="+mainObject.m_szVersion;
                    mainObject.m_HttpComms.setURI(szAction);
                    mainObject.m_HttpComms.setRequestMethod("POST");
                    var bResult = mainObject.m_HttpComms.send(mainObject.composerOnloadHandler);  
                    if (!bResult) throw new Error("httpConnection returned false");
                    mainObject.m_iStage = 1;
                break;
                
                case 1: //MSG OK handler
                    mainObject.m_Log.Write("nsAOLSMTP.js - composerOnloadHandler - MSG OK handler");
                    
                    if (szResponse.search(patternAOLSendCheck)==-1)
                    {
                        mainObject.m_Log.Write("nsAOLSMTP.js - composerOnloadHandler - check failed");
                        mainObject.serverComms("502 Error Sending Email\r\n");    
                        return; 
                    }
                    
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
                    mainObject.m_SessionData.oComponentData.addElement("szHomeURI",mainObject.m_szHomeURI);
                    mainObject.m_SessionData.oComponentData.addElement("szUserId",mainObject.m_szUserId);
                    mainObject.m_SessionData.oComponentData.addElement("szVersion",mainObject.m_szVersion);
                    mainObject.m_SessionData.oComponentData.addElement("szSuccessPath", mainObject.m_SuccessPath);
                    mainObject.m_SessionData.oComponentData.addElement("szHostURL",mainObject.m_szHostURL);
                    mainObject.m_SessionData.oComponentData.addElement("szLocation",mainObject.m_szLocation);
                        
                    mainObject.serverComms("250 OK\r\n");
                break;
            };
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
            this.m_Log.DebugDump("nsYahooSMTP.js: getBcc : Exception : " 
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
