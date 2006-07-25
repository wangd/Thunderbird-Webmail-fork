function AOLSMTP(oResponseStream, oLog)
{
    try
    {       
        var scriptLoader =  Components.classes["@mozilla.org/moz/jssubscript-loader;1"];
        scriptLoader = scriptLoader.getService(Components.interfaces.mozIJSSubScriptLoader);
        scriptLoader.loadSubScript("chrome://web-mail/content/common/DebugLog.js");
        scriptLoader.loadSubScript("chrome://web-mail/content/common/base64.js");
        scriptLoader.loadSubScript("chrome://web-mail/content/common/HttpComms2.js");
        scriptLoader.loadSubScript("chrome://web-mail/content/common/CommonPrefs.js");
        scriptLoader.loadSubScript("chrome://web-mail/content/common/Email.js");
        
        this.m_Log = oLog;
        this.m_Log.Write("nsAOLSMTP.js - Constructor - START");   
        this.m_oResponseStream = oResponseStream;
        this.m_bAuthorised = false;
        this.m_szUserName = null;   
        this.m_szPassWord = null; 
        this.m_HttpComms = new HttpComms(this.m_Log);
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
         
        this.m_SessionManager = Components.classes["@mozilla.org/SessionManager;1"]
                                          .getService(Components.interfaces.nsISessionManager);
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



AOLSMTP.prototype =
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
    
    
    logIn : function(szUserName, szPassWord)
    {
        try
        {
            this.m_Log.Write("nsAOL.js - logIN - START");   
            this.m_Log.Write("nsAOL.js - logIN - Username: " + szUserName
                                                   + " Password: "  + szPassWord
                                                   + " stream: "    + this.m_oResponseStream);
            
            if (!szUserName || !this.m_oResponseStream || !szPassWord) return false;
            
            this.m_szUserName = szUserName;
            this.m_szPassWord = szPassWord;
            this.m_szAOLMail= "http://www.aol.com"; 
            this.m_iStage = 0;
            this.m_HttpComms.setURI(this.m_szAOLMail);
            this.m_HttpComms.setRequestMethod("GET");
            
            if (this.m_bReUseSession)
            { 
                this.m_SessionData = this.m_SessionManager.findSessionData(this.m_szUserName.toLowerCase());
                if (this.m_SessionData && this.m_bReUseSession)
                {
                    this.m_Log.Write("AOLSMTP.js - logIN - Session Data found");
                    
                    this.m_HttpComms.setCookieManager(this.m_SessionData.oCookieManager);
                    this.m_szHomeURI = this.m_SessionData.oComponentData.findElement("szHomeURI");
                    this.m_Log.Write("AOLPOP.js - logIN - m_szHomeURI " +this.m_szHomeURI);
                    this.m_szUserId = this.m_SessionData.oComponentData.findElement("szUserId");
                    this.m_Log.Write("AOLPOP.js - logIN - m_szUserId " +this.m_szUserId);   
                    this.m_szVersion = this.m_SessionData.oComponentData.findElement("szVersion");
                    this.m_Log.Write("AOLPOP.js - logIN - m_szVersion " +this.m_szVersion);      
                    this.m_SuccessPath = this.m_SessionData.oComponentData.findElement("szSuccessPath");
                    this.m_Log.Write("AOLPOP.js - logIN - .m_SuccessPath " +this.m_SuccessPath); 
                    this.m_szHostURL = this.m_SessionData.oComponentData.findElement("szHostURL");
                    this.m_Log.Write("AOLPOP.js - logIN - .m_szHostURL" +this.m_szHostURL); 
                    this.m_szLocation = this.m_SessionData.oComponentData.findElement("szLocation");
                    this.m_Log.Write("AOLPOP.js - logIN - .m_szLocation" +this.m_szLocation);
                
                    if (this.m_szHomeURI) //get home page
                    {
                        this.m_iStage =7;
                        this.m_bReEntry = true;
                        this.m_HttpComms.setURI(this.m_szHomeURI);
                    }
                }
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
            mainObject.m_Log.Write("nsAOL.js - loginOnloadHandler : \n" + szResponse);
            mainObject.m_Log.Write("nsAOL.js - loginOnloadHandler : " + mainObject.m_iStage);  
            
            var httpChannel = event.QueryInterface(Components.interfaces.nsIHttpChannel);
            
            //if this fails we've gone somewhere new
            mainObject.m_Log.Write("nsAOL.js - loginOnloadHandler - status :" +httpChannel.responseStatus );
            if (httpChannel.responseStatus != 200)
            { 
                if (mainObject.m_iStage!=5)
                    throw new Error("return status " + httpChannel.responseStatus);
            }
            
             //page code                                
            switch (mainObject.m_iStage)
            {
                case 0:  //get login url
                    var szLoginURL = szResponse.match(patternAOLLoginURL)[1];
                    mainObject.m_Log.Write("AOLPOP.js - loginOnloadHandler - szLoginURL " + szLoginURL);
                    if (szLoginURL == null)
                        throw new Error("error parsing AOL login web page");
                   
                    mainObject.m_HttpComms.setURI(szLoginURL);
                    mainObject.m_HttpComms.setRequestMethod("GET");
                    var bResult = mainObject.m_HttpComms.send(mainObject.loginOnloadHandler, mainObject);      
                    if (!bResult) throw new Error("httpConnection returned false");
                    mainObject.m_iStage++;
                break;
                      
                case 1: //login page
                    var szLoginForm = szResponse.match(patternAOLLoginForm);
                    mainObject.m_Log.Write("AOLPOP.js - loginOnloadHandler - szLoginForm " + szLoginForm);
                    if (szLoginForm == null)
                        throw new Error("error parsing AOL login web page");
                         
                    var aLoginData = szLoginForm[0].match(patternAOLInput);
                    mainObject.m_Log.Write("AOLPOP.js - loginOnloadHandler - aLoginData " + aLoginData);
                    
                    for (i=0; i<aLoginData.length; i++)
                    {
                        if (aLoginData[i].search(/type="hidden"/i)!=-1)
                        {
                            var szName=aLoginData[i].match(patternAOLName)[1];
                            mainObject.m_Log.Write("AOLPOP.js - loginOnloadHandler - loginData name " + szName);
                            
                            var szValue = aLoginData[i].match(patternAOLValue)[1];
                            mainObject.m_Log.Write("AOLPOP.js - loginOnloadHandler - loginData value " + szValue);
                        
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
                    mainObject.m_Log.Write("AOLPOP.js - loginOnloadHandler - szLoginURL : "+szLoginURL);
                    
                    mainObject.m_HttpComms.setURI(szLoginURL);
                    mainObject.m_HttpComms.setRequestMethod("POST");
                    var bResult = mainObject.m_HttpComms.send(mainObject.loginOnloadHandler, mainObject);      
                    if (!bResult) throw new Error("httpConnection returned false");
                    mainObject.m_iStage++;
                break;
                
                
                case 2://login bounce 
                    var szLoginVerify = szResponse.match(patternAOLVerify)[1];
                    mainObject.m_Log.Write("AOLPOP.js - loginOnloadHandler - szLoginVerify " + szLoginVerify);
                    if (szLoginVerify == null)
                        throw new Error("error parsing AOL login web page");
                   
                    mainObject.m_HttpComms.setURI(szLoginVerify);
                    mainObject.m_HttpComms.setRequestMethod("GET");
                    var bResult = mainObject.m_HttpComms.send(mainObject.loginOnloadHandler, mainObject);      
                    if (!bResult) throw new Error("httpConnection returned false");
                    mainObject.m_iStage++;
                break;
                
                case 3://login check
                    if (szResponse.search(patternAOLLogoutURL)==-1)
                        throw new Error("error parsing AOL login web page");
                                                    
                    mainObject.m_HttpComms.setURI("http://webmail.aol.com");
                    mainObject.m_HttpComms.setRequestMethod("GET");
                    var bResult = mainObject.m_HttpComms.send(mainObject.loginOnloadHandler, mainObject);      
                    if (!bResult) throw new Error("httpConnection returned false");
                    mainObject.m_iStage++;
                break;
                
                case 4: //cookie check
                    var szLoginReplaceURL = szResponse.match(patternAOLReplace)[1];
                    mainObject.m_Log.Write("AOLPOP.js - loginOnloadHandler - replace " + szLoginReplaceURL);
                    if (szLoginReplaceURL == null)
                         throw new Error("error parsing AOL login web page");

                    mainObject.m_HttpComms.setURI(szLoginReplaceURL);
                    mainObject.m_HttpComms.setRequestMethod("GET");
                    var bResult = mainObject.m_HttpComms.send(mainObject.loginOnloadHandler, mainObject);      
                    if (!bResult) throw new Error("httpConnection returned false");
                    mainObject.m_iStage++;
                break;
                
                case 5://get host
                    mainObject.m_szHostURL = szResponse.match(patternAOLHost)[1];
                    if (mainObject.m_szHostURL == null)
                        throw new Error("error parsing AOL login web page");
                    mainObject.m_SuccessPath = szResponse.match(patternAOLPath)[1];
                    mainObject.m_Log.Write("AOLPOP.js - loginOnloadHandler - m_SuccessPath " +mainObject.m_SuccessPath);
                    var szCheck = szResponse.match(patternAOLHostCheck)[1];
                    var szURL = "http://" + mainObject.m_szHostURL + szCheck;
                               
                    mainObject.m_HttpComms.setURI(szURL);
                    mainObject.m_HttpComms.setRequestMethod("GET");
                    var bResult = mainObject.m_HttpComms.send(mainObject.loginOnloadHandler, mainObject);      
                    if (!bResult) throw new Error("httpConnection returned false");
                    mainObject.m_iStage++;
                break;
                
                
                case 6://get mail box                   
                    mainObject.m_szHostURL = szResponse.match(patternAOLTarget)[1];
                    mainObject.m_Log.Write("AOLPOP.js - loginOnloadHandler - m_szHostURL " +mainObject.m_szHostURL);
                    if (mainObject.m_szHostURL == null)
                        throw new Error("error parsing AOL login web page");
                   
                    var szURL = "http://" + mainObject.m_szHostURL + mainObject.m_SuccessPath;
                    mainObject.m_szHomeURI = szURL;
                    
                    var szCookies =  httpChannel.getResponseHeader("Set-Cookie");                   
                    mainObject.m_szUserId = szCookies.match(patternAOLUserID)[1];
                    mainObject.m_Log.Write("AOLPOP.js - loginOnloadHandler - m_szUserId " +mainObject.m_szUserId);
                    
                    mainObject.m_HttpComms.setURI(szURL);
                    mainObject.m_HttpComms.setRequestMethod("GET");
                    var bResult = mainObject.m_HttpComms.send(mainObject.loginOnloadHandler, mainObject);      
                    if (!bResult) throw new Error("httpConnection returned false");
                    mainObject.m_iStage++;
                break;
                
                case 7://get urls
                    if(szResponse.search(patternAOLLogout)==-1)
                    {
                        if (mainObject.m_bReEntry)
                        {
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
                      
                    mainObject.m_szVersion = szResponse.match(patternAOLVersion)[1];
                    mainObject.m_Log.Write("AOLPOP.js - loginOnloadHandler - szVersion " +mainObject.m_szVersion);
                                     
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
    
    
    rawMSG : function (szFrom, aszTo, szEmail)
    {
        try
        {
            this.m_Log.Write("nsAOLSMTP.js - rawMSG - START");   
            this.m_Log.Write("nsAOLSMTP.js - rawMSG " + szEmail);
    
            if (!this.m_Email.parse(szEmail))
                throw new Error ("Parse Failed")
            
            this.m_aszTo = aszTo;
            this.m_szFrom = szFrom;               
            this.m_iStage = 0;
            
            var szDir = this.m_SuccessPath.match(patternAOLSucessPath)[1];
            this.m_Log.Write("AOLPOP.js - rawMSG - szDir " +szDir);
            this.m_szLocation = "http://" + this.m_szHostURL + szDir + "Mail/" ;            
            var szComposer = this.m_szLocation + "compose-message.aspx"; 
            this.m_Log.Write("nsAOLSMTP.js - rawMSG szComposer " + szComposer);
            this.m_HttpComms.setURI(szComposer);
            this.m_HttpComms.setRequestMethod("GET");
            var bResult = this.m_HttpComms.send(this.composerOnloadHandler, this);                             
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
            mainObject.m_Log.Write("nsAOLSMTP.js - composerOnloadHandler : \n" + szResponse);
            mainObject.m_Log.Write("nsAOLSMTP.js - composerOnloadHandler : " + mainObject.m_iStage);  
            
            var httpChannel = event.QueryInterface(Components.interfaces.nsIHttpChannel);
            
            //if this fails we've gone somewhere new
            mainObject.m_Log.Write("nsAOLSMTP.js - composerOnloadHandler - status :" +httpChannel.responseStatus );
            if (httpChannel.responseStatus != 200) 
                throw new Error("return status " + httpChannel.responseStatus);
        
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
                    
                    mainObject.m_HttpComms.setContentType("multipart/form-data");
                    var szLocation = mainObject.m_szLocation.replace("Mail","RPC");
                    var szAction = szLocation + "SendMessage.aspx?version="+mainObject.m_szVersion;
                    mainObject.m_HttpComms.setURI(szAction);
                    mainObject.m_HttpComms.setRequestMethod("POST");
                    var bResult = mainObject.m_HttpComms.send(mainObject.composerOnloadHandler, mainObject);  
                    if (!bResult) throw new Error("httpConnection returned false");
                    mainObject.m_iStage = 1;
                break;
                
                case 1: //MSG OK handler
                    mainObject.m_Log.Write("AOLSMTP.js - composerOnloadHandler - MSG OK handler");
                    
                    if (szResponse.search(patternAOLSendCheck)==-1)
                    {
                        mainObject.m_Log.Write("nsAOLSMTP.js - composerOnloadHandler - check failed");
                        mainObject.serverComms("502 Error Sending Email\r\n");    
                        return; 
                    }
                    
                    if (mainObject.m_bReUseSession)
                    {
                        mainObject.m_Log.Write("nsAOLSMTP.js - Logout - Setting Session Data"); 
                        if (!mainObject.m_SessionData)
                        {
                            mainObject.m_SessionData = Components.classes["@mozilla.org/SessionData;1"].createInstance();
                            mainObject.m_SessionData.QueryInterface(Components.interfaces.nsISessionData);
                            mainObject.m_SessionData.szUserName = mainObject.m_szUserName.toLowerCase();
                            
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
                        mainObject.m_SessionManager.setSessionData(mainObject.m_SessionData);    
                    }
                        
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
}
