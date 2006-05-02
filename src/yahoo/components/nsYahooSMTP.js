/*****************************  Globals   *************************************/                 
const nsYahooSMTPClassID = Components.ID("{958266e0-e2a6-11d9-8cd6-0800200c9a66}");
const nsYahooSMTPContactID = "@mozilla.org/YahooSMTP;1";
const ExtYahooGuid = "{d7103710-6112-11d9-9669-0800200c9a66}";

const patternYahooSecure = /<a href="(.*?https.*?login.*?)".*?>/;
const patternYahooLoginForm = /<form.*?name="login_form".*?>[\S\s]*?<\/form>/gm;
const patternYahooAction = /<form.*?action="(.*?)".*?>/;
const patternYahooInput = /<input.*?type=['|"]*hidden['|"]*.*?name=.*?value=[\s\S]*?>/igm;
const patternYahooFile = /<input.*?type="*file"*.*?name=.*?>/igm;
const patternYahooNameAlt = /name=['|"]*([\S]*)['|"]*/;
const patternYahooAltValue = /value=['|"]*([\S\s]*)['|"]*[\s]*>/;
const patternYahooRedirect = /<a href=['|"]*(.*?)['|"]*>/;
const patternYahooCompose = /location="*(http:\/\/.*?Compose\?YY=.*?)"*/i;
const patternYahooComposeForm = /<form.*?name="*Compose"*.*?>[\S\s]*?<\/form>/igm;
const patternYahooAttachmentForm = /<form.*?name="*Attachments"*.*?>[\S\s]*?<\/form>/igm;
const patternYahooAttachCheck = /javascript\:VirusScanResults\(0\)/igm;
const patternYahooImageVerifiaction = /<form.*?name=ImgVerification[\S\s]*?>[\s\S]*?<\/form>/igm;
const patternYahooImage = /<input.*?name="IMG".*?value="(.*?)">/i;
const patternYahooImageAction = /<form.*?name=ImgVerification.*?action="([\S\s]*?)">/i;

/******************************  Yahoo ***************************************/
function nsYahooSMTP()
{
    try
    {       
        var scriptLoader =  Components.classes["@mozilla.org/moz/jssubscript-loader;1"];
        scriptLoader = scriptLoader.getService(Components.interfaces.mozIJSSubScriptLoader);
        
        scriptLoader.loadSubScript("chrome://web-mail/content/common/DebugLog.js");
        scriptLoader.loadSubScript("chrome://web-mail/content/common/CommonPrefs.js");
        scriptLoader.loadSubScript("chrome://web-mail/content/common/Email.js");
        scriptLoader.loadSubScript("chrome://web-mail/content/common/comms.js");
        scriptLoader.loadSubScript("chrome://yahoo/content/Yahoo-SpamImage.js");
        
        
        var date = new Date();
        var  szLogFileName = "Yahoo SMTP Log - " + date.getHours()
                                           + "-" + date.getMinutes() 
                                           + "-"+ date.getUTCMilliseconds() +" -";
        this.m_Log = new DebugLog("webmail.logging.comms", ExtYahooGuid, szLogFileName); 
        
        this.m_Log.Write("nsYahooSMTP.js - Constructor - START");   
       
        this.m_bAuthorised = false;
        this.m_szUserName = null;   
        this.m_szPassWord = null; 
        this.m_oResponseStream = null;  
        this.m_HttpComms = new Comms(this , this.m_Log);
        this.m_aszTo = new Array;
        this.m_szFrom = null;
        this.m_iStage = 0;
        this.m_szComposeURI = null;
        this.m_szLocationURI = null; 
        this.m_szYahooMail = null;
        this.m_szHomeURI = null;
        this.m_bReEntry = false;
        this.m_bAttHandled = false;
        this.m_Email = new email(this.m_Log);
        this.m_Email.decodeBody(true);
        this.m_szImageVerForm = null;
        this.m_szLoginUserName = null;
        
        this.m_SessionManager = Components.classes["@mozilla.org/SessionManager;1"];
        this.m_SessionManager = this.m_SessionManager.getService();
        this.m_SessionManager.QueryInterface(Components.interfaces.nsISessionManager); 
        this.m_SessionData = null;
        
        this.m_bReEntry = false;
        
        //do i reuse the session
        var oPref = {Value:null};
        var  WebMailPrefAccess = new WebMailCommonPrefAccess();
        if (WebMailPrefAccess.Get("bool","yahoo.bReUseSession",oPref))
            this.m_bReUseSession=oPref.Value;
        else
            this.m_bReUseSession=true; 
                             
        this.m_Log.Write("nsYahooSMTP.js - Constructor - END");  
    }
    catch(e)
    {
        DebugDump("nsYahooSMTP.js: Constructor : Exception : " 
                                      + e.name 
                                      + ".\nError message: " 
                                      + e.message +"\n"
                                      + e.lineNumber);
    }
}



nsYahooSMTP.prototype =
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
            this.m_Log.Write("nsYahooSMTP.js - logIN - START");   
            this.m_Log.Write("nsYahooSMTP.js - logIN - Username: " + this.m_szUserName 
                                                   + " Password: " + this.m_szPassWord 
                                                   + " stream: " + this.m_oResponseStream);
           
            if (!this.m_szUserName || !this.m_oResponseStream  || !this.m_szPassWord) return false;
              
            //get prefs
            this.loadPrefs();  
                     
           this.m_szYahooMail = "http://mail.yahoo.com";
                    
            if (this.m_szUserName.search(/yahoo/i)!=-1)   
            { //remove domain from user name  
                this.m_szYahooMail = "http://mail.yahoo.com";
                this.m_szLoginUserName = this.m_szUserName.match(/(.*?)@/)[1].toLowerCase();
            }  
            else if (this.m_szUserName.search(/@talk21.com$/i)!=-1 ||  
                     this.m_szUserName.search(/@btinternet.com$/i)!=-1  ||
                     this.m_szUserName.search(/@btopenworld.com$/i)!=-1 )
            {
                this.m_szYahooMail = "http://bt.yahoo.com/";
                this.m_szLoginUserName = this.m_szUserName;
            }    
            else
            {//include domain in user name
                this.m_szYahooMail = "http://mail.yahoo.com";
                this.m_szLoginUserName = this.m_szUserName;
            } 
            
            this.m_HttpComms.clean();
                            
            this.m_SessionData = this.m_SessionManager.findSessionData(this.m_szUserName);
            if (this.m_SessionData && this.m_bReUseSession)
            {
                this.m_Log.Write("nsYahoo.js - logIN - Session Data found");
                this.m_HttpComms.setCookieManager(this.m_SessionData.oCookieManager);
                this.m_szHomeURI = this.m_SessionData.oComponentData.findElement("szHomeURI");
                this.m_Log.Write("nsYahoo" +this.m_szHomeURI);    
            
                //get home page
                this.m_iStage =2;
                this.m_bReEntry = true;
                this.m_HttpComms.setURI(this.m_szHomeURI);
                this.m_HttpComms.setRequestMethod("GET");
                var bResult = this.m_HttpComms.send(this.loginOnloadHandler);                             
                if (!bResult) throw new Error("httpConnection returned false");
            }
            else
            {   //get YahooLog.com webpage
                this.m_iStage = 0;
                this.m_HttpComms.setURI(this.m_szYahooMail);
                this.m_HttpComms.setRequestMethod("GET");
                var bResult = this.m_HttpComms.send(this.loginOnloadHandler);                             
                if (!bResult) throw new Error("httpConnection returned false");        
            }
            
            this.m_Log.Write("nsYahooSMTP.js - logIN - END");    
            return true;
        }
        catch(e)
        {
            this.m_Log.DebugDump("nsYahooSMTP.js: logIN : Exception : " 
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
            mainObject.m_Log.Write("nsYahooSMTP.js - loginOnloadHandler - START"); 
            
            mainObject.m_Log.Write("nsYahooSMTP.js - loginOnloadHandler : " + mainObject.m_iStage );  
            
            var httpChannel = event.QueryInterface(Components.interfaces.nsIHttpChannel);
            
            //if this fails we've gone somewhere new
            mainObject.m_Log.Write("nsYahooSMTP.js - loginOnloadHandler - status :" +httpChannel.responseStatus );
            if (httpChannel.responseStatus != 200) 
                throw new Error("return status " + httpChannel.responseStatus);
            
            mainObject.m_HttpComms.clean();
                                      
            //page code                                
            switch (mainObject.m_iStage)
            {
                case 0: // login page               
                    var aLoginForm = szResponse.match(patternYahooLoginForm);
                    if (aLoginForm == null)
                         throw new Error("error parsing yahoo login web page");
                    mainObject.m_Log.Write("nsYahooSMTP.js - loginOnloadHandler - loginForm " + aLoginForm);
                    
                    var szLoginURL = aLoginForm[0].match(patternYahooAction)[1];
                    mainObject.m_Log.Write("nsYahooSMTP.js - loginOnloadHandler - loginURL " + szLoginURL);
                    
                    var aLoginData = aLoginForm[0].match(patternYahooInput);
                    mainObject.m_Log.Write("nsYahooSMTP.js - loginOnloadHandler - loginData " + aLoginData);
                   
                    for (i=0; i<aLoginData.length; i++)
                    {
                        var szName=aLoginData[i].match(patternYahooNameAlt)[1];
                        szName = szName.replace(/"/gm,"");
                        szName = szName.replace(/'/gm,"");
                        mainObject.m_Log.Write("nsYahooSMTP.js - loginOnloadHandler - loginData name " + szName);
                        
                        var szValue = aLoginData[i].match(patternYahooAltValue)[1]
                        szValue = szValue.replace(/"/gm,"");
                        szValue = szValue.replace(/'/gm,""); 
                        mainObject.m_Log.Write("nsYahooSMTP.js - loginOnloadHandler - loginData value " + szValue);
                        
                        mainObject.m_HttpComms.addValuePair(szName,(szValue? encodeURIComponent(szValue):""));
                    }
                    
                    var szLogin = encodeURIComponent(mainObject.m_szLoginUserName);
                    mainObject.m_HttpComms.addValuePair("login", szLogin);
                    
                    var szPass = encodeURIComponent(mainObject.m_szPassWord);
                    mainObject.m_HttpComms.addValuePair("passwd",szPass);
                   
                    mainObject.m_HttpComms.addValuePair(".save","Sign+In");
                                        
                    mainObject.m_HttpComms.setURI(szLoginURL);
                    mainObject.m_HttpComms.setRequestMethod("POST");
                    mainObject.m_HttpComms.setContentType(0);
                    var bResult = mainObject.m_HttpComms.send(mainObject.loginOnloadHandler);
                    if (!bResult) throw new Error("httpConnection returned false");
                    mainObject.m_iStage++;
                break;
                                  
                case 1: //redirect
                    var aLoginRedirect = szResponse.match(patternYahooRedirect);
                    if (aLoginRedirect == null)
                         throw new Error("error parsing yahoo login web page");
                    mainObject.m_Log.Write("nsYahooSMTP.js - loginOnloadHandler - login redirect " + aLoginRedirect);    
                    var szLocation = aLoginRedirect[1];

                    mainObject.m_HttpComms.setURI(szLocation);
                    mainObject.m_HttpComms.setRequestMethod("GET");
                    var bResult = mainObject.m_HttpComms.send(mainObject.loginOnloadHandler);
                    if (!bResult) throw new Error("httpConnection returned false");
                    mainObject.m_iStage++;
                break;
            
                case 2: //mail box
                    var szLocation = httpChannel.URI.spec;
                    var iIndex = szLocation.indexOf("uilogin.srt");
                    mainObject.m_Log.Write("nsYahooSMTP.js - loginOnloadHandler - page check : " + szLocation);
                    if (szLocation.indexOf("uilogin.srt")!= -1)
                    {
                        if (mainObject.m_bReEntry)
                        {
                            mainObject.m_bReEntry = false;
                            mainObject.m_iStage =0;
                            mainObject.m_HttpComms.setURI(mainObject.m_szYahooMail);
                            mainObject.m_HttpComms.setRequestMethod("GET");
                            var bResult = mainObject.m_HttpComms.send(mainObject.loginOnloadHandler);                             
                            if (!bResult) throw new Error("httpConnection returned false");
                            return;
                        }
                        else
                            throw new Error("error logging in");
                    } 
                    mainObject.m_szHomeURI = szLocation;
                    
                    //get urls for later use
                    mainObject.m_szLocationURI = httpChannel.URI.prePath ;
                    mainObject.m_Log.Write("nsYahooSMTP.js - loginOnloadHandler - m_szLocationURI : "+mainObject.m_szLocationURI );
                        
                    mainObject.m_szComposeURI = szResponse.match(patternYahooCompose)[1] ;
                    mainObject.m_Log.Write("nsYahooSMTP.js - loginOnloadHandler - m_szComposeURI : "+mainObject.m_szComposeURI );
            
                    //server response
                    mainObject.serverComms("235 Your In\r\n");
                    mainObject.m_bAuthorised = true;
                break;
            };
                      
            mainObject.m_Log.Write("nsYahooSMTP.js - loginOnloadHandler - END");
        }
        catch(err)
        {
            mainObject.m_Log.DebugDump("nsYahooSMTP.js: loginHandler : Exception : " 
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
            this.m_Log.Write("nsYahooSMTP.js - rawMSG - START");   
            this.m_Log.Write("nsYahooSMTP.js - rawMSG " + szEmail);
    
            this.m_iStage =0 ;

            if (!this.m_Email.parse(szEmail))
                throw new Error ("Parse Failed")
            
            //get composer page
            this.m_HttpComms.clean();
            this.m_HttpComms.setURI(this.m_szComposeURI);
            this.m_HttpComms.setRequestMethod("GET");       
            var bResult = this.m_HttpComms.send(this.composerOnloadHandler);  
            if (!bResult) throw new Error("httpConnection returned false");
            
            this.m_Log.Write("nsYahooSMTP.js - rawMSG - END");    
            return true;
        }
        catch(err)
        {
            this.m_Log.DebugDump("nsYahooSMTP.js: rawMSG : Exception : " 
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
            mainObject.m_Log.Write("nsYahooSMTP.js - composerOnloadHandler - START"); 
            mainObject.m_Log.Write("nsYahooSMTP.js - composerOnloadHandler : " + mainObject.m_iStage);  
            
            var httpChannel = event.QueryInterface(Components.interfaces.nsIHttpChannel);
            
            //if this fails we've gone somewhere new
            mainObject.m_Log.Write("nsYahooSMTP.js - composerOnloadHandler - status :" +httpChannel.responseStatus );
            if (httpChannel.responseStatus != 200) 
                throw new Error("return status " + httpChannel.responseStatus);
            
            mainObject.m_HttpComms.clean();            
            var szReferer = httpChannel.URI.spec;
            mainObject.m_Log.Write("nsYahooSMTP.js - composerOnloadHandler - Referer :" +szReferer);
             
            if (mainObject.m_Email.attachments.length>0 && !mainObject.m_bAttHandled)
                mainObject.m_iStage = 2;
        
            switch(mainObject.m_iStage)
            {
                case 0: //MSG handler
                    mainObject.m_Log.Write("nsYahooSMTP.js - composerOnloadHandler - Send MSG");
                    
                    var szForm = szResponse.match(patternYahooComposeForm)[0];
                    mainObject.m_Log.Write("nsYahooSMTP.js - composerOnloadHandler - Form " + szForm);
             
                    var szActionURI = szForm.match(patternYahooAction)[1];
                    mainObject.m_Log.Write("nsYahooSMTP.js - composerOnloadHandler - Action " + szActionURI);
                    if (szActionURI.search(/^http/i)==-1)
                        szActionURI = mainObject.m_szLocationURI + szActionURI;
                        
                    var aszInput = szForm.match(patternYahooInput);
                    mainObject.m_Log.Write("nsYahooSMTP.js - composerOnloadHandler - Input " + aszInput);
                    
                    for (i=0; i< aszInput.length; i++)
                    {
                        var szName = aszInput[i].match(patternYahooNameAlt)[1];
                        szName = szName.replace(/"/mg,"");
                        szName = szName.replace(/'/mg,"");
                        mainObject.m_Log.Write("nsYahooSMTP.js - composerOnloadHandler - Name " + szName); 
                                    
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
                                            (szSubject? escape(szSubject) : "%20"));
                    
                    if (mainObject.m_Email.htmlBody)
                    {
                        mainObject.m_Log.Write("nsYahooSMTP.js - composerOnloadHandler - html");
                        var szHtmlBody = mainObject.m_Email.htmlBody.body.getBody();
                        mainObject.m_HttpComms.addValuePair("Format","html");
                        mainObject.m_HttpComms.addValuePair("Body",mainObject.escapeStr(szHtmlBody));
                        
                        if (mainObject.m_Email.txtBody)
                        {
                            mainObject.m_Log.Write("nsYahooSMTP.js - composerOnloadHandler - TEXT");
                            var szTxtBody = mainObject.m_Email.txtBody.body.getBody();
                            mainObject.m_HttpComms.addValuePair("PlainMsg",mainObject.escapeStr(szTxtBody));
                        }
                    } 
                    else
                    { 
                        mainObject.m_Log.Write("nsYahooSMTP.js - composerOnloadHandler - plain"); 
                        var szTxtBody = mainObject.m_Email.txtBody.body.getBody();
                        mainObject.m_HttpComms.addValuePair("Body",mainObject.escapeStr(szTxtBody));
                    }
                                                           
                    mainObject.m_iStage++;
                    mainObject.m_HttpComms.setContentType(0);
                    mainObject.m_HttpComms.setURI(szActionURI);
                    mainObject.m_HttpComms.setRequestMethod("POST");
                    var bResult = mainObject.m_HttpComms.send(mainObject.composerOnloadHandler);                                                    
                    if (!bResult) throw new Error("httpConnection returned false");
                break;
                
                case 1: //MSG OK handler
                    //check for add address to addressbook
                    if (szResponse.search(/AddAddresses/i)!=-1)
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
                        mainObject.m_SessionData.oComponentData.addElement("szHomeURI",mainObject.m_szHomeURI);
                        mainObject.m_SessionManager.setSessionData(mainObject.m_SessionData);
                        
                        mainObject.serverComms("250 OK\r\n");                      
                    }
                    else if(szResponse.search(/<form.*?name=ImgVerification[\S\s]*?>/igm)!=-1)
                    { 
                        mainObject.m_Log.Write("nsYahooSMTP.js - composerOnloadHandler - image verification");
                        mainObject.m_szImageVerForm = szResponse.match(patternYahooImageVerifiaction)[0];
                        mainObject.m_Log.Write("nsYahooSMTP.js - composerOnloadHandler - form " + mainObject.m_szImageVerForm );
                        var szImageUri = szResponse.match(patternYahooImage)[1];
                        mainObject.m_Log.Write("nsYahooSMTP.js - composerOnloadHandler - image " + szImageUri);
                     
                        mainObject.m_HttpComms.setContentType(1);
                        mainObject.m_HttpComms.setURI(szImageUri);
                        mainObject.m_HttpComms.setRequestMethod("GET");
                        mainObject.m_iStage = 5;
                        var bResult = mainObject.m_HttpComms.send(mainObject.composerOnloadHandler);  
                        if (!bResult) throw new Error("httpConnection returned false");
                    }
                    else
                    {
                        mainObject.serverComms("502 Error Sending Email\r\n");   
                    }
                break;
                
                case 2: //Attchment request
                    mainObject.m_Log.Write("nsYahooSMTP.js - composerOnloadHandler - attachment request"); 
                    mainObject.m_bAttHandled =true;
                    
                    var szForm = szResponse.match(patternYahooComposeForm)[0];
                    mainObject.m_Log.Write("nsYahooSMTP.js - composerOnloadHandler - Form " + szForm);
             
                    var szActionURI = szForm.match(patternYahooAction)[1];
                    mainObject.m_Log.Write("nsYahooSMTP.js - composerOnloadHandler - Action " + szActionURI);
                    if (szActionURI.search(/^http/i)==-1)
                        szActionURI = mainObject.m_szLocationURI + szActionURI;
                        
                    var aszInput = szForm.match(patternYahooInput);
                    mainObject.m_Log.Write("nsYahooSMTP.js - composerOnloadHandler - Input " + aszInput);
                    
                    for (i=0; i< aszInput.length; i++)
                    {
                        var szName = aszInput[i].match(patternYahooNameAlt)[1];
                        szName = szName.replace(/"/mg,"");
                        szName = szName.replace(/'/mg,"");
                        mainObject.m_Log.Write("nsYahooSMTP.js - composerOnloadHandler - Name " + szName); 
                        
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
                            mainObject.m_Log.Write("nsYahooSMTP.js - composerOnloadHandler -  value " + szValue);
                            mainObject.m_HttpComms.addValuePair(szName,(szValue.length>0) ? szValue : "");
                        }
                    }
                    
                    mainObject.m_HttpComms.addValuePair("To","");
                    mainObject.m_HttpComms.addValuePair("Bcc","");
                    mainObject.m_HttpComms.addValuePair("Cc","");
                    mainObject.m_HttpComms.addValuePair("Subj","");
                    mainObject.m_HttpComms.addValuePair("Body","");
                 
                    mainObject.m_iStage = 3; 
                    mainObject.m_HttpComms.setContentType(0);
                    mainObject.m_HttpComms.setURI(szActionURI);
                    mainObject.m_HttpComms.setRequestMethod("POST");
                    var bResult = mainObject.m_HttpComms.send(mainObject.composerOnloadHandler);  
                    if (!bResult) throw new Error("httpConnection returned false");
                break;
                
                case 3: //Attchment handler
                    mainObject.m_Log.Write("nsYahooSMTP.js - composerOnloadHandler - attach upload");
                    
                    var szForm = szResponse.match(patternYahooAttachmentForm)[0];
                    mainObject.m_Log.Write("nsYahooSMTP.js - composerOnloadHandler - Form " + szForm);
                    
                    var szAction = szForm.match(patternYahooAction)[1];
                    mainObject.m_Log.Write("nsYahooSMTP.js - composerOnloadHandler - Action " + szAction);
                    if (szAction.search(/^http/i)==-1)
                        szAction = mainObject.m_szLocationURI + szAction;
                    
                    var aszInput = szForm.match(patternYahooInput);
                    mainObject.m_Log.Write("nsYahooSMTP.js - composerOnloadHandler - Input " + aszInput);
                   
                    var aszFileInput = szForm.match(patternYahooFile);
                    mainObject.m_Log.Write("nsYahooSMTP.js - composerOnloadHandler - File Input " + aszFileInput);
                   
                    for (i=0; i< aszInput.length; i++)
                    {
                        var szName = aszInput[i].match(patternYahooNameAlt)[1];
                        szName = szName.replace(/"/mg,"");
                        szName = szName.replace(/'/mg,"");
                        mainObject.m_Log.Write("nsYahooSMTP.js - composerOnloadHandler - Name " + szName); 
                        
                        if(szName.search(/^UPL$/i)!=-1)
                        {
                            mainObject.m_HttpComms.addValuePair(szName,"Attach Files");          
                        }
                        else
                        { 
                            var szValue = aszInput[i].match(patternYahooAltValue)[1]
                            szValue = szValue.replace(/"/mg,""); 
                            szValue = szValue.replace(/'/mg,"");              
                            mainObject.m_Log.Write("nsYahooSMTP.js - composerOnloadHandler - value " + szValue);
                            mainObject.m_HttpComms.addValuePair(szName, (szValue.length>0) ? szValue : "");  
                        }
                    }
                    
                    for (i=0; i< aszFileInput.length; i++)
                    {
                        var szName = aszFileInput[i].match(patternYahooNameAlt)[1];
                        szName = szName.replace(/"/mg,"");
                        mainObject.m_Log.Write("nsYahooSMTP.js - composerOnloadHandler - Name " + szName); 
                        
                        if (i < mainObject.m_Email.attachments.length)
                        {
                            //headers
                            var oAttach = mainObject.m_Email.attachments[i];
                            var szFileName = oAttach.headers.getContentType(4);
                            if (!szFileName) szFileName = "";
                            mainObject.m_Log.Write("nsYahooSMTP.js - composerOnloadHandler - Filename " + szFileName); 
                          
                            //body
                            var szBody = oAttach.body.getBody();
                            mainObject.m_HttpComms.addFile(szName, szFileName, szBody); 
                        }
                        else
                            mainObject.m_HttpComms.addFile(szName, "", ""); 
                    }
                   
                    mainObject.m_HttpComms.setContentType(1);
                    mainObject.m_HttpComms.setURI(szAction);                  
                    mainObject.m_HttpComms.setRequestMethod("POST");
                    var bResult = mainObject.m_HttpComms.send(mainObject.composerOnloadHandler);  
                    if (!bResult) throw new Error("httpConnection returned false");
                    mainObject.m_iStage = 4;
                break;
                
                case 4: //Attachment OK handler
                    mainObject.m_Log.Write("nsYahooSMTP.js - composerOnloadHandler - attach ok handler");
                    
                    if (szResponse.search(patternYahooAttachCheck)==-1)
                    {
                        mainObject.m_Log.Write("nsYahooSMTP.js - composerOnloadHandler - attach check failed");
                        mainObject.serverComms("502 Error Sending Email\r\n");    
                        return;
                    }
                    
                    var szForm = szResponse.match(patternYahooComposeForm)[0];
                    mainObject.m_Log.Write("nsYahooSMTP.js - composerOnloadHandler - Form " + szForm);
                    
                    var szAction = szForm.match(patternYahooAction)[1];
                    mainObject.m_Log.Write("nsYahooSMTP.js - composerOnloadHandler - Action " + szAction);
                    if (szAction.search(/^http/i)==-1)
                        szAction = mainObject.m_szLocationURI + szAction;
                   
                    var aszInput = szForm.match(patternYahooInput);
                    mainObject.m_Log.Write("nsYahooSMTP.js - composerOnloadHandler - Input " + aszInput);
                   
                    
                    for (i=0; i< aszInput.length; i++)
                    {
                        var szName = aszInput[i].match(patternYahooNameAlt)[1];
                        szName = szName.replace(/"/mg,"");
                        szName = szName.replace(/'/mg,"");
                        mainObject.m_Log.Write("nsYahooSMTP.js - composerOnloadHandler - Name " + szName); 
                       
                        var szValue = aszInput[i].match(patternYahooAltValue)[1]
                        szValue = szValue.replace(/"/mg,""); 
                        szValue = szValue.replace(/'/mg,"");              
                        mainObject.m_Log.Write("nsYahooSMTP.js - composerOnloadHandler - value " + szValue);
                        
                        mainObject.m_HttpComms.addValuePair(szName,(szValue.length>0)? szValue : "");
                    }
                   
                    mainObject.m_HttpComms.setContentType(0);
                    mainObject.m_HttpComms.setURI(szAction);
                    mainObject.m_HttpComms.setRequestMethod("POST");
                    var bResult = mainObject.m_HttpComms.send(mainObject.composerOnloadHandler);  
                    if (!bResult) throw new Error("httpConnection returned false");
                    mainObject.m_iStage = 0;
                break;
                
                
                case 5: //downloaded image verifiaction
                    mainObject.m_Log.Write("nsYahooSMTP.js - composerOnloadHandler - image download");
                    var szPath = mainObject.writeImageFile(szResponse);
                    mainObject.m_Log.Write("nsYahooSMTP.js - composerOnloadHandler - imageFile " + szPath);
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
                        mainObject.m_Log.Write("nsYahooSMTP.js - composerOnloadHandler - Name " + szName); 
                       
                        var szValue = aszInput[i].match(patternYahooAltValue)[1]
                        szValue = szValue.replace(/"/mg,""); 
                        szValue = szValue.replace(/'/mg,"");   
                        szValue = mainObject.escapeStr(szValue);
                        mainObject.m_Log.Write("nsYahooSMTP.js - composerOnloadHandler - value " + szValue);
                        
                        mainObject.m_HttpComms.addValuePair(szName,(szValue.length>0)? szValue : "");
                    }
                    
                    szValue = mainObject.escapeStr(szResult);
                    mainObject.m_HttpComms.addValuePair("Word",(szValue.length>0)? szValue : "");
                    
                    var szFormAction = mainObject.m_szImageVerForm.match(patternYahooImageAction)[1];
                    mainObject.m_Log.Write("nsYahooSMTP.js - composerOnloadHandler - szFormAction " + szFormAction);
                    var szActionUrl = szFormAction.replace(/\r/g,"").replace(/\n/g,"");
                    mainObject.m_Log.Write("nsYahooSMTP.js - composerOnloadHandler - aszActionUrl " + szActionUrl);
                    var szAction = szActionUrl;
                    
                    //send data
                    mainObject.m_HttpComms.setContentType(1);
                    mainObject.m_HttpComms.setURI(mainObject.m_szLocationURI + szAction);
                    mainObject.m_HttpComms.setRequestMethod("POST");
                    var bResult = mainObject.m_HttpComms.send(mainObject.composerOnloadHandler);  
                    if (!bResult) throw new Error("httpConnection returned false");
                    mainObject.m_iStage = 1;
                   
                break;
            };
                     
            mainObject.m_Log.Write("nsYahooSMTP.js - composerOnloadHandler - END");
        }
        catch(err)
        {
            mainObject.m_Log.DebugDump("nsYahooSMTP.js: composerOnloadHandler : Exception : " 
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
        szEncode = szEncode.replace(/%20/gm,"+"); //replace space
        return szEncode;
    },
    
    
    getBcc : function (szTo,szCc)
    {
        try
        {
            this.m_Log.Write("nsYahooSMTP.js - getBcc - START");
            if (this.m_aszTo.length==0) return null;
            this.m_Log.Write("nsYahooSMTP.js - getBcc - szRcptList " + this.m_aszTo);  
            
            var szBcc = null;
            var szAddress = null;
            if (szTo) szAddress = szTo;
            if (szCc) szAddress = (szTo ? (szAddress + ","+ szCc) : szCc);
            this.m_Log.Write("nsYahooSMTP.js - getBcc - szAddress " + szAddress);
           
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
            this.m_Log.Write("nsYahooSMTP.js - getBcc szBcc- " + szBcc);
            
            this.m_Log.Write("nsYahooSMTP.js - getBcc - End");
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
    
    
    writeImageFile : function(szData)
    {
        try
        {
            this.m_Log.Write("nsYahooSMTP.js - writeImageFile - End");
            
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
            this.m_Log.Write("nsYahooSMTP.js - writeImageFile - path " + URL);
            
            this.m_Log.Write("nsYahooSMTP.js - writeImageFile - End");
            return URL;
        }
        catch(err)
        {
            this.m_Log.DebugDump("nsYahooSMTP.js: writeImageFile : Exception : " 
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
            this.m_Log.Write("nsYahooSMTP : openWindow - START");
            
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
            this.m_Log.Write("nsYahooSMTP : openWindow - " + iResult);
            var szResult =  null;
            if (iResult) 
            {
                szResult = params.GetString(0);
                this.m_Log.Write("nsYahooSMTP : openWindow - " + szResult);
            }
            
            this.m_Log.Write("nsYahooSMTP : openWindow - END");
            return szResult;
        }
        catch(err)
        {
            this.m_Log.DebugDump("nsYahooSMTP: Exception in openWindow : " 
                                               + err.name 
                                               + ".\nError message: " 
                                               + err.message + "\n"
                                               + err.lineNumber);
        }
    },
    
    
    
    loadPrefs : function()
    {
        try
        {
            this.m_Log.Write("nsYahoo.js - loadPrefs - START"); 
           
            //get user prefs
            var iCount = 0;
            var oPref = {Value:null};
            var  WebMailPrefAccess = new WebMailCommonPrefAccess();
            if (WebMailPrefAccess.Get("int","yahoo.Account.Num",oPref))
            {
                this.m_Log.Write("nsYahoo.js - loadPrefs - num " + oPref.Value);
                iCount = oPref.Value;
            } 
                
            var bFound = false;
            var regExp = new RegExp(this.m_szUserName,"i");
            for (var i=0; i<iCount; i++)
            {
                //get user name
                oPref.Value = null;
                if (WebMailPrefAccess.Get("char","yahoo.Account."+i+".user",oPref.Value))
                {
                    this.m_Log.Write("nsYahoo.js - loadPrefs - user " + oPref.Value);
                    if (oPref.Value.search(regExp)!=-1)
                    {
                        this.m_Log.Write("nsYahoo.js - loadPrefs - user found");
                        bFound = true;
                
                        //do i save copy
                        oPref.Value = null;
                        var  PrefAccess = new WebMailCommonPrefAccess();
                        if (PrefAccess.Get("bool","yahoo.Account."+i+".bSaveCopy",oPref))
                            this.m_bSaveCopy=oPref.Value;
                        else
                            this.m_bSaveCopy=true;      
                    }
                }
            }
            
            if (!bFound) //get defaults
            {
                this.m_Log.Write("Yahoo-Prefs-Folders : loadPrefs - Default Folders");
                
                //unread only
                oPref.Value = null;
                if (WebMailPrefAccess.Get("bool","yahoo.bSaveCopy",oPref))
                    this.m_bSaveCopy=oPref.Value;
                else
                     this.m_bSaveCopy= true;
            }
            this.m_Log.Write("nsYahoo.js - loadPrefs - END");
        }
        catch(e)
        {
             this.m_Log.DebugDump("nsYahoo.js: loadPrefs : Exception : " 
                                              + e.name + 
                                              ".\nError message: " 
                                              + e.message+ "\n"
                                              + e.lineNumber);
        }
    },
    
    
    
    ////////////////////////////////////////////////////////////////////////////
    /////  Comms                  
    
    serverComms : function (szMsg)
    {
        try
        { 
            this.m_Log.Write("nsYahooSMTP.js - serverComms - START");
            this.m_Log.Write("nsYahooSMTP.js - serverComms msg " + szMsg);
            var iCount = this.m_oResponseStream.write(szMsg,szMsg.length);
            this.m_Log.Write("nsYahooSMTP.js - serverComms sent count: " + iCount 
                                                        +" msg length: " +szMsg.length);
            this.m_Log.Write("nsYahooSMTP.js - serverComms - END");  
        }
        catch(e)
        {
            this.m_Log.DebugDump("nsYahooSMTP.js: serverComms : Exception : " 
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
var nsYahooSMTPFactory = new Object();

nsYahooSMTPFactory.createInstance = function (outer, iid)
{
    if (outer != null) throw Components.results.NS_ERROR_NO_AGGREGATION;
    
    if (!iid.equals(nsYahooSMTPClassID) && !iid.equals(Components.interfaces.nsISupports))
        throw Components.results.NS_ERROR_INVALID_ARG;
    
    return new nsYahooSMTP();
}


/******************************************************************************/
/* MODULE */
var nsYahooSMTPModule = new Object();

nsYahooSMTPModule.registerSelf = function(compMgr, fileSpec, location, type)
{
    compMgr = compMgr.QueryInterface(Components.interfaces.nsIComponentRegistrar);
    compMgr.registerFactoryLocation(nsYahooSMTPClassID,
                                    "YahooSMTPComponent",
                                    nsYahooSMTPContactID, 
                                    fileSpec,
                                    location, 
                                    type);
}


nsYahooSMTPModule.unregisterSelf = function(aCompMgr, aFileSpec, aLocation)
{
    aCompMgr = aCompMgr.QueryInterface(Components.interfaces.nsIComponentRegistrar);
    aCompMgr.unregisterFactoryLocation(nsYahooSMTPClassID, aFileSpec);
}

 
nsYahooSMTPModule.getClassObject = function(compMgr, cid, iid)
{
    if (!cid.equals(nsYahooSMTPClassID))
        throw Components.results.NS_ERROR_NO_INTERFACE;

    if (!iid.equals(Components.interfaces.nsIFactory))
        throw Components.results.NS_ERROR_NOT_IMPLEMENTED;

    return nsYahooSMTPFactory;
}


nsYahooSMTPModule.canUnload = function(compMgr)
{
    return true;
}
/******************************************************************************/


function NSGetModule(compMgr, fileSpec)
{
    return nsYahooSMTPModule; 
}
