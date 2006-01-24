function HotmailSMTPScreenRipperBETA(oResponseStream, oLog, bSaveCopy)
{
    try
    {       
        var scriptLoader = Components.classes["@mozilla.org/moz/jssubscript-loader;1"];
        scriptLoader = scriptLoader.getService(Components.interfaces.mozIJSSubScriptLoader);
        scriptLoader.loadSubScript("chrome://web-mail/content/common/DebugLog.js");
        scriptLoader.loadSubScript("chrome://web-mail/content/common/comms.js");
        scriptLoader.loadSubScript("chrome://web-mail/content/common/Email.js");
        scriptLoader.loadSubScript("chrome://web-mail/content/common/CommonPrefs.js");
        scriptLoader.loadSubScript("chrome://global/content/strres.js");
               
        this.m_Log = oLog; 
                
        this.m_Log.Write("Hotmail-SR-SMTP-BETA - Constructor - START");   
       
        this.m_szUserName = null;   
        this.m_szPassWord =null; 
        this.m_oResponseStream = oResponseStream;  
        this.m_bSaveCopy =  bSaveCopy;
        this.m_HttpComms = new Comms(this,this.m_Log);   
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
        this.m_szViewState = null;
        
        this.m_SessionManager = Components.classes["@mozilla.org/SessionManager;1"];
        this.m_SessionManager = this.m_SessionManager.getService();
        this.m_SessionManager.QueryInterface(Components.interfaces.nsISessionManager); 
        this.m_SessionData = null;
        
        this.m_bReEntry = false;
          
        //do i reuse the session
        var oPref = new Object();
        oPref.Value = null;
        var  WebMailPrefAccess = new WebMailCommonPrefAccess();
        if (WebMailPrefAccess.Get("bool","hotmail.bReUseSession",oPref))
            this.m_bReUseSession=oPref.Value;
        else
            this.m_bReUseSession=true; 
                                                         
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
            this.m_szPassWord = szPassWord;
            
            if (!this.m_szUserName || !this.m_oResponseStream || !this.m_szPassWord) return false;
            
            this.m_iStage= 0;
            this.m_HttpComms.clean();
            this.m_HttpComms.setContentType(-1);
             
            this.m_SessionData = this.m_SessionManager.findSessionData(this.m_szUserName);
            if (this.m_SessionData && this.m_bReUseSession)
            {
                this.m_Log.Write("nsHotmail.js - logIN - Session Data found"); 
                this.m_szHomeURI = this.m_SessionData.oComponentData.findElement("szHomeURI");
            }
            
            if (this.m_szHomeURI)
            {
                this.m_HttpComms.setCookieManager(this.m_SessionData.oCookieManager);
                this.m_Log.Write("nsHotmail" +this.m_szHomeURI);    
            
                //get home page
                this.m_iStage =2;
                this.m_bReEntry = true;
                this.m_HttpComms.setURI(this.m_szHomeURI);
                this.m_HttpComms.setRequestMethod("GET");
                var bResult = this.m_HttpComms.send(this.loginOnloadHandler);                             
                if (!bResult) throw new Error("httpConnection returned false");
            }
            else
            {    
                this.m_HttpComms.setURI("http://www.hotmail.com");
                this.m_HttpComms.setRequestMethod("GET");
                var bResult = this.m_HttpComms.send(this.loginOnloadHandler);  
                if (!bResult) throw new Error("httpConnection returned false");        
            }
                       
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
  
            mainObject.m_HttpComms.clean();
            mainObject.m_HttpComms.setContentType(0);
             
            //check for java refresh
            var aRefresh = szResponse.match(patternHotmailSMTPJSRefresh);
            if (aRefresh)
            {
                mainObject.m_Log.Write("Hotmail-SR-BETAR - loginOnloadHandler - refresh "); 
                
                mainObject.m_HttpComms.setURI(aRefresh[1]);
                mainObject.m_HttpComms.setRequestMethod("GET");
                
                var bResult = mainObject.m_HttpComms.send(mainObject.loginOnloadHandler);   
                if (!bResult) throw new Error("httpConnection returned false");
                return;   
            }
            
             
            //page code                                
            switch (mainObject.m_iStage)
            {
                case 0: // redirect destination
                    var aForm = szResponse.match(patternHotmailSMTPForm);
                    if (!aForm) throw new Error("error parsing login page");
                    mainObject.m_Log.Write("Hotmail-SR-SMTP-BETA - loginOnloadHandler "+ aForm);
                    
                    //action
                    var szAction = aForm[0].match(patternHotmailSMTPAction)[1];
                    mainObject.m_Log.Write("Hotmail-SR-SMTP-BETA - loginOnloadHandler "+ szAction);
                    mainObject.m_HttpComms.setURI(szAction);
                    
                    //name value
                    var aInput = aForm[0].match(patternHotmailSMTPInput);
                    mainObject.m_Log.Write("Hotmail-SR-SMTP-BETA - loginOnloadHandler "+ aInput);
                    for (i=0; i<aInput.length ; i++)
                    {
                        var szName =  aInput[i].match(patternHotmailSMTPName)[1];
                        mainObject.m_Log.Write("Hotmail-SR-SMTP-BETA - loginOnloadHandler "+ szName);  
                        var szValue =  aInput[i].match(patternHotmailSMTPValue)[1];
                        mainObject.m_Log.Write("Hotmail-SR-SMTP-BETA - loginOnloadHandler "+ szValue);
                        szValue = encodeURIComponent(szValue);
                        mainObject.m_HttpComms.addValuePair(szName, szValue);
                    }
                    
                    mainObject.m_HttpComms.setRequestMethod("POST");
                    var bResult = mainObject.m_HttpComms.send(mainObject.loginOnloadHandler);   
                    if (!bResult) throw new Error("httpConnection returned false");
                    mainObject.m_iStage++;
                break;
                
                
                case 1: //login
                    var aForm = szResponse.match(patternHotmailSMTPForm);
                    if (!aForm) throw new Error("error parsing login page");
                        
                    //get form data
                    var aInput =  aForm[0].match(patternHotmailSMTPInput); 
                    mainObject.m_Log.Write("nsHotmail.js - loginOnloadHandler - form data " + aInput);
                    
                    for (i=0; i<aInput.length; i++)
                    {
                        var szType = aInput[i].match(patternHotmailSMTPType)[1]; 
                        mainObject.m_Log.Write("nsHotmail.js - loginOnloadHandler - form type " + szType);
                        var szName = aInput[i].match(patternHotmailSMTPName)[1]; 
                        mainObject.m_Log.Write("nsHotmail.js - loginOnloadHandler - form name " + szName);
                        var szValue = aInput[i].match(patternHotmailSMTPValue)[1]; 
                        mainObject.m_Log.Write("nsHotmail.js - loginOnloadHandler - form value " + szValue);
                        
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
                                    szData = encodeURIComponent(mainObject.m_szUserName);
                                else if (szName.search(/passwd/i)!=-1)
                                    szData = encodeURIComponent(mainObject.m_szPassWord);
                                else if (szName.search(/PwdPad/i)!=-1)
                                {
                                    var szPasswordPadding = "IfYouAreReadingThisYouHaveTooMuchFreeTime";
                                    var lPad=szPasswordPadding.length-mainObject.m_szPassWord.length;
                                    szData += szPasswordPadding.substr(0,(lPad<0)?0:lPad);
                                }
                                else 
                                    szData = szValue;
                                    
                                mainObject.m_HttpComms.addValuePair(szName,szData);
                            }
                        }
                    }
                    
                    var szAction = aForm[0].match(patternHotmailSMTPAction)[1];
                    mainObject.m_Log.Write("Hotmail-SR-BETAR- loginOnloadHandler "+ szAction);
                    var IOService = Components.classes["@mozilla.org/network/io-service;1"];
                    IOService = IOService.getService(Components.interfaces.nsIIOService);
                    var nsIURI = IOService.newURI(szAction, null, null);
                    var szQuery = nsIURI.QueryInterface(Components.interfaces.nsIURL).query;    
                    mainObject.m_Log.Write("Hotmail-SR-BETAR- loginOnloadHandler "+ szQuery);                   
                    
                    var szDomain = mainObject.m_szUserName.split("@")[1];
                    var szURI = null;
                    if (szDomain.search(/hotmail.co.jp/)!=-1 || szDomain.search(/hotmail.co.uk/)!=-1 ||
                        szDomain.search(/hotmail.com/)!=-1 || szDomain.search(/hotmail.de/)!=-1 ||
                        szDomain.search(/hotmail.fr/)!=-1 || szDomain.search(/hotmail.it/)!=-1  )
                    {
                        szURI = "https://loginnet.passport.com/ppsecure/post.srf";
                        szURI += "?" + szQuery;
                    }
                    else if (szDomain.search(/msn.com/)!=-1 || szDomain.search(/compaq.net/)!=-1)
                    {
                        szURI = "https://msnialogin.passport.com/ppsecure/post.srf"; 
                        szURI += "?" + szQuery;
                    }
                    else if (szDomain.search(/messengeruser.com/)!=-1 || szDomain.search(/passport.com/)!=-1 ||
                             szDomain.search(/charter.com/)!=-1 || szDomain.search(/webtv.net/)!=-1)
                    {
                        szURI = "https://login.passport.com/ppsecure/post.srf"; 
                        szURI += "?" + szQuery;
                    }
                    else
                    {
                        szURI = szAction;
                    }

                    mainObject.m_HttpComms.setURI(szURI);                     
                    
                    mainObject.m_HttpComms.setRequestMethod("POST");
                    var bResult = mainObject.m_HttpComms.send(mainObject.loginOnloadHandler);                   
                    if (!bResult) throw new Error("httpConnection returned false");
                    mainObject.m_iStage++;
                break;
               
                case 2: //inbox
                   //check for logout option 
                    var aszLogoutURL = szResponse.match(patternHotmailSMTPLogOut);
                    mainObject.m_Log.Write("Hotmail-SR-BETAR - loginOnloadHandler - logout : " + aszLogoutURL);
                
                    if (!aszLogoutURL)
                    {
                        if (mainObject.m_bReEntry)
                        {
                            mainObject.m_bReEntry = false;
                            mainObject.m_iStage =0;
                            mainObject.m_HttpComms.setURI("http://www.hotmail.com");
                            mainObject.m_HttpComms.setRequestMethod("GET");
                            var bResult = mainObject.m_HttpComms.send(mainObject.loginOnloadHandler);                             
                            if (!bResult) throw new Error("httpConnection returned false");
                            return;
                        }
                        else
                            throw new Error("error logging in");
                    } 
                    
                    //get urls for later use                  
                    mainObject.m_szLocationURI = httpChannel.URI.prePath  ;
                    mainObject.m_Log.Write("Hotmail-SR-BETAR - loginOnloadHandler - m_szLocationURI : "+mainObject.m_szLocationURI );
                                    
                    mainObject.m_szHomeURI = httpChannel.URI.spec;
                    mainObject.m_Log.Write("Hotmail-SR-BETAR - loginOnloadHandler - m_szHomeURI : "+mainObject.m_szHomeURI );
             
                    //get form
                    var szAction = szResponse.match(patternHotmailSMTPAction)[1];
                    mainObject.m_Log.Write("Hotmail-SR-SMTP-BETA - loginOnloadHandler - szAction : "+szAction);
                    
                    var IOService = Components.classes["@mozilla.org/network/io-service;1"];
                    IOService = IOService.getService(Components.interfaces.nsIIOService);
                    var nsIURI = IOService.newURI(mainObject.m_szHomeURI, null, null);
                    var szDirectory = nsIURI.QueryInterface(Components.interfaces.nsIURL).directory;
                    mainObject.m_Log.Write("Hotmail-SR-SMTP-BETA - loginOnloadHandler - directory : " +szDirectory);
                    
                    mainObject.m_szViewState = szResponse.match(patternHotmailSMTPViewState)[1];
                    mainObject.m_Log.Write("Hotmail-SR-SMTP-BETA - loginOnloadHandler - szViewState : " +mainObject.m_szViewState);

                    mainObject.m_szComposer =  mainObject.m_szLocationURI + szDirectory+ szAction;
                    mainObject.m_Log.Write("Hotmail-SR-SMTP-BETA - loginOnloadHandler - m_szComposer : "+mainObject.m_szComposer );
                    
                    //server response
                    mainObject.serverComms("235 Your In\r\n");
                    mainObject.m_bAuthorised = true;
                break;
            }
            
            mainObject.m_Log.Write("Hotmail-SR-SMTP-BETA - loginOnloadHandler - END");
        }
        catch(err)
        {
             mainObject.m_Log.DebugDump("Hotmail-SR-SMTP-BETA: loginHandler : Exception : " 
                                          + err.name 
                                          + ".\nError message: " 
                                          + err.message+ "\n"
                                          + err.lineNumber);
            
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
            this.m_iAttCount = this.m_Email.attachments.length-1;
            this.m_iAttUploaded = 0;
            
            if (!this.m_Email.txtBody) 
            {
                var stringBundle =srGetStrBundle("chrome://hotmail/locale/Hotmail-SMTP.properties");
                var szError = stringBundle.GetStringFromName("HtmlError");

                this.serverComms("502 "+ szError + "\r\n");
                return false;
            }
             
             
            if (this.m_iAttCount>0)
            {
                var stringBundle =srGetStrBundle("chrome://hotmail/locale/Hotmail-SMTP.properties");
                var szError = stringBundle.GetStringFromName("AttachError");

                this.serverComms("502 "+ szError + "\r\n");
                return false;
            }
            
            var szCc = this.m_Email.headers.getCc();
            if (szCc) 
            {
                var stringBundle =srGetStrBundle("chrome://hotmail/locale/Hotmail-SMTP.properties");
                var szError = stringBundle.GetStringFromName("CcError");

                this.serverComms("502 "+ szError + "\r\n");
                return false;
            }
            
            var szTo = this.m_Email.headers.getTo();
            var szBCC =  this.getBcc(szTo, szCc);
            if (szBCC) 
            {
                var stringBundle =srGetStrBundle("chrome://hotmail/locale/Hotmail-SMTP.properties");
                var szError = stringBundle.GetStringFromName("BccError");

                this.serverComms("502 "+ szError + "\r\n");
                return false;
            }
                
            this.m_iStage=0;
            this.m_HttpComms.clean();
            this.m_HttpComms.setContentType(0);
            this.m_HttpComms.setURI(this.m_szComposer);
            this.m_HttpComms.setRequestMethod("POST");
            this.m_HttpComms.addValuePair("__VIEWSTATE",encodeURIComponent(this.m_szViewState));
            this.m_HttpComms.addValuePair("NewMessage","New");
            var bResult = this.m_HttpComms.send(this.composerOnloadHandler);      
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
            mainObject.m_Log.Write("Hotmail-SR-SMTP-BETA.js - composerOnloadHandler - START"); 
            mainObject.m_Log.Write("Hotmail-SR-SMTP-BETA.js - composerOnloadHandler : " + mainObject.m_iStage );  
            
            var httpChannel = event.QueryInterface(Components.interfaces.nsIHttpChannel);
            mainObject.m_Log.Write("Hotmail-SR-SMTP-BETA.js - composerOnloadHandler - status :" +httpChannel.responseStatus );
           
            //if this fails we've gone somewhere new
            if (httpChannel.responseStatus != 200) 
                mainObject.serverComms("502 Error Sending Email\r\n");  
             
            mainObject.m_HttpComms.clean();
                        
            if (mainObject.m_Email.attachments.length>0 && !mainObject.m_bAttHandled)
                mainObject.m_iStage = 2;
                
            //page code                                
            switch (mainObject.m_iStage)
            {
                case 0:  //MSG handler
                    mainObject.m_Log.Write("Hotmail-SR-SMTP-BETA.js - composerOnloadHandler - Send MSG"); 
                    
                    var szAction = szResponse.match(patternHotmailSMTPAction)[1];
                    mainObject.m_Log.Write("Hotmail-SR-SMTP-BETA.js - composerOnloadHandler - Action " + szAction);
                    
                    var IOService = Components.classes["@mozilla.org/network/io-service;1"];
                    IOService = IOService.getService(Components.interfaces.nsIIOService);
                    var nsIURI = IOService.newURI(httpChannel.URI.spec, null, null);
                    var szDirectory = nsIURI.QueryInterface(Components.interfaces.nsIURL).directory;
                    mainObject.m_Log.Write("Hotmail-SR-SMTP-BETA - composerOnloadHandler - directory : " +szDirectory);
                    mainObject.m_HttpComms.setURI( mainObject.m_szLocationURI + szDirectory + szAction);
                                                        
                    mainObject.m_HttpComms.addValuePair("__VIEWSTATE",encodeURIComponent(mainObject.m_szViewState));
                    mainObject.m_HttpComms.addValuePair("SendMessage","Send");
                    
                    var szTo = mainObject.m_Email.headers.getTo();
                    var szValue = szTo? escape(szTo):"";
                    mainObject.m_HttpComms.addValuePair("fTo",szValue);
                    
                    var szSubject = mainObject.m_Email.headers.getSubject(); 
                    szValue = szSubject? escape(szSubject) : "%20";
                    mainObject.m_HttpComms.addValuePair("fSubject",szValue); 
                    
                    var szTxtBody = mainObject.m_Email.txtBody.body.getBody();
                    mainObject.m_HttpComms.addValuePair("fMessageBody",escape(szTxtBody));
                    
                    mainObject.m_HttpComms.setRequestMethod("POST");
                    var bResult = mainObject.m_HttpComms.send(mainObject.composerOnloadHandler);      
                    if (!bResult) throw new Error("httpConnection returned false");
                    mainObject.m_iStage = 1;
                break;
                
                case 1: //MSG OK handler 
                    mainObject.m_Log.Write("Hotmail-SR-SMTP-BETA.js - composerOnloadHandler - MSG OK"); 
                    if (szResponse.search(patternHotmailSMTPMailBoxTable)!=-1)
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
                    else
                        mainObject.serverComms("502 Failed\r\n"); 
                break;
                
                case 2: //Add Attachment Request
                    mainObject.m_Log.Write("Hotmail-SR-SMTP-BETA.js - composerOnloadHandler - Attach Request");
                    
                    var szForm = szResponse.match(patternHotmailSMTPCompForm)[0];
                    mainObject.m_Log.Write("Hotmail-SR-SMTP-BETA.js - composerOnloadHandler - Form " + szForm);
                    
                    var szAction = szForm.match(patternHotmailSMTPAction)[1];
                    mainObject.m_HttpComms.setURI(szAction);
                    mainObject.m_HttpComms.setRequestMethod("POST");
                    
                    var aInput = szForm.match(patternHotmailSMTPInput);
                    mainObject.m_Log.Write("Hotmail-SR-SMTP-BETA.js - composerOnloadHandler - INPUT " + aInput);
                    
                    for (i=0; i<aInput.length; i++)
                    {   
                        var szName = aInput[i].match(patternHotmailSMTPName)[1]; 
                        
                        var szValue = null;
                        try
                        {
                            szValue = aInput[i].match(patternHotmailSMTPValue)[1]; 
                        }
                        catch(err)
                        {
                            szValue = "";
                        }
                                                                              
                        if (szName.search(/to/i)!=-1) szValue = ""; 
                        else if (szName.search(/cc/i)!=-1) szValue = ""; 
                        else if (szName.search(/bcc/i)!=-1) szValue = ""; 
                        else if (szName.search(/subject/i)!=-1) szValue = "";
                        else if (szName.search(/_HMaction/i)!=-1) szValue = "AttachFile";

                        mainObject.m_HttpComms.addValuePair(szName,szValue);
                    }
                                        
                    mainObject.m_HttpComms.addValuePair("body","");
                    
                    var bResult = mainObject.m_HttpComms.send(mainObject.composerOnloadHandler);      
                    if (!bResult) throw new Error("httpConnection returned false");
                    mainObject.m_bAttHandled = true;
                    mainObject.m_iStage = 3;
                break;
                
                case 3: //Add Attach
                    mainObject.m_Log.Write("Hotmail-SR-SMTP-BETA.js - composerOnloadHandler - More Attachments"); 
                    mainObject.m_Log.Write("Hotmail-SR-SMTP-BETA.js - composerOnloadHandler - upload " +mainObject.m_iAttUploaded
                                                        + " " + mainObject.m_iAttCount );
                     
                    var szForm = szForm = szResponse.match(patternHotmailSMTPAttForm)[0];
                    mainObject.m_Log.Write("Hotmail-SR-SMTP-BETA.js - composerOnloadHandler - Form " + szForm);
                    
                    if (mainObject.m_iAttUploaded == mainObject.m_iAttCount)
                        mainObject.m_iStage = 0;
                    else
                        mainObject.m_iStage = 3;  
                                 
                    var szAction = szForm.match(patternHotmailSMTPAction)[1];
                    mainObject.m_HttpComms.setURI(szAction);
                    mainObject.m_HttpComms.setRequestMethod("POST");

                    var aInput = szForm.match(patternHotmailSMTPInput);
                    mainObject.m_Log.Write("Hotmail-SR-SMTP-BETA.js - composerOnloadHandler - INPUT " + aInput);
                    
                                             
                    for (i=0; i<aInput.length ; i++)
                    {
                        var szName = aInput[i].match(patternHotmailSMTPName)[1]; 
                        var szValue = "";
                        try
                        {
                            szValue = aInput[i].match(patternHotmailSMTPValue)[1]; 
                        }
                        catch(err){}
                
                        if (i==0 && mainObject.m_iStage == 0) szName = "Attach.x";
                       // if (i==0 && mainObject.m_iStage == 3) 
                       //     mainObject.m_HttpComms.addValuePair("","");  
                                                            
                        if (szName.search(/^attfile$/i)!=-1)
                        { 
                            //headers
                            var oAttach = mainObject.m_Email.attachments[mainObject.m_iAttUploaded];
                            var szFileName = oAttach.headers.getContentType(4);
                            if (!szFileName) szFileName = "";
                            mainObject.m_Log.Write("Hotmail-SR-SMTP-BETA.js - composerOnloadHandler - Filename " + szFileName); 
                                                      
                            //body
                            var szBody = oAttach.body.getBody();
                            mainObject.m_HttpComms.addFile(szName, szFileName, szBody);
                        }
                        else if (szName.search(/_HMaction/i)!=-1)
                        {
                            if (mainObject.m_iStage==0)
                                mainObject.m_HttpComms.addValuePair(szName,"FastAttach");
                            else
                                mainObject.m_HttpComms.addValuePair(szName,"");
                        }
                        else
                            mainObject.m_HttpComms.addValuePair(szName,szValue);
                    } 
                    mainObject.m_iAttUploaded++;   
                    mainObject.m_HttpComms.setContentType(1);
                    mainObject.m_HttpComms.setURI(szAction);
                    mainObject.m_HttpComms.setRequestMethod("POST");
                    var bResult = mainObject.m_HttpComms.send(mainObject.composerOnloadHandler);  
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
    },
}
