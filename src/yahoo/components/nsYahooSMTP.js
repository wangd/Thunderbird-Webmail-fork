/*****************************  Globals   *************************************/                 
const nsYahooSMTPClassID = Components.ID("{958266e0-e2a6-11d9-8cd6-0800200c9a66}");
const nsYahooSMTPContactID = "@mozilla.org/YahooSMTP;1";
const ExtYahooGuid = "{d7103710-6112-11d9-9669-0800200c9a66}";

const patternYahooSecure = /<a href="(.*?https.*?)".*?>/;
const patternYahooLoginForm = /<form.*?name="*login_form"*.*?>[\S\s]*?<\/form>/gm;
const patternYahooAction = /<form.*?action="(.*?)".*?>/;
const patternYahooInput = /<input.*?type=['|"]*hidden['|"]*.*?name=.*?value=.*?>/gm;
const patternYahooFile = /<input.*?type="*file"*.*?name=.*?>/igm;
const patternYahooNameAlt = /name=['|"]*([\S]*)['|"]*/;
const patternYahooAltValue = /value=['|"]*([\S]*)['|"]*>/;
const patternYahooRedirect = /<a href=['|"]*(.*?)['|"]*>/;
const patternYahooCompose = /location="*(http:\/\/.*?Compose\?YY=.*?)"*/i;
const patternYahooComposeForm = /<form.*?name="*Compose"*.*?>[\S\s]*?<\/form>/igm;
const patternYahooAttachmentForm = /<form.*?name="*Attachments"*.*?>[\S\s]*?<\/form>/igm;
const patternYahooAttachCheck = /javascript\:VirusScanResults\(0\)/igm


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
        scriptLoader.loadSubScript("chrome://web-mail/content/common/base64.js");
        scriptLoader.loadSubScript("chrome://web-mail/content/common/Quoted-Printable.js");
        scriptLoader.loadSubScript("chrome://web-mail/content/common/comms.js");
        
        
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
        this.m_iStage = 0;
        
        this.m_szComposeURI = null;
        this.m_szLocationURI = null; 
        this.m_Email = new email(this.m_Log);
        this.m_bAttHandled = false;
        
        //do i save copy
        var oPref = new Object();
        oPref.Value = null;
        var  PrefAccess = new WebMailCommonPrefAccess();
        if (PrefAccess.Get("bool","yahoo.bSaveCopy",oPref))
            this.m_bSaveCopy=oPref.Value;
        else
            this.m_bSaveCopy=true;          
        delete oPref;
        
        //what do i do with alternative parts
        oPref = new Object();
        oPref.Value = null;
        if (PrefAccess.Get("bool","yahoo.bSendHtml",oPref))
            this.m_bSendHtml = oPref.Value;
        else
            this.m_bSendHtml = false;    
        delete oPref;
                      
        this.m_Log.Write("nsYahooSMTP.js - Constructor - END");  
    }
    catch(e)
    {
        DebugDump("nsYahooSMTP.js: Constructor : Exception : " 
                                      + e.name 
                                      + ".\nError message: " 
                                      + e.message +"\n" +
                                      e.lineNumber);
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
    
    
    logIn : function()
    {
        try
        {
            this.m_Log.Write("nsYahooSMTP.js - logIN - START");   
            this.m_Log.Write("nsYahooSMTP.js - logIN - Username: " + this.m_szUserName 
                                                   + " Password: " + this.m_szPassWord 
                                                   + " stream: " + this.m_oResponseStream);
           
            if (!this.m_szUserName || !this.m_oResponseStream  || !this.m_szPassWord) return false;
                     
            //get YahooLog.com webpage
            this.m_HttpComms.clean();
            this.m_HttpComms.setURI("http://mail.yahoo.com");
            this.m_HttpComms.setRequestMethod("GET");
            var bResult = this.m_HttpComms.send(this.loginOnloadHandler);                             
            if (!bResult) throw new Error("httpConnection returned false");
            
            this.m_Log.Write("nsYahooSMTP.js - logIN - END");    
            return true;
        }
        catch(e)
        {
            this.m_Log.DebugDump("nsYahooSMTP.js: logIN : Exception : " 
                                              + e.name + 
                                              ".\nError message: " 
                                              + e.message);
                                              
            this.serverComms("502 negative vibes\r\n");
            
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
            
            
            //page code                                
            switch (mainObject.m_iStage)
            {
                case 0: //secure web page
                    var aSecureLoginURL = szResponse.match(patternYahooSecure);
                    if (aSecureLoginURL == null)
                         throw new Error("error parsing yahoo login web page");
                    
                    mainObject.m_Log.Write("nsYahooSMTP.js - loginOnloadHandler - Secure URL " + aSecureLoginURL);
                    var szSecureURL = aSecureLoginURL[1];
    
                    mainObject.m_HttpComms.clean();
                    mainObject.m_HttpComms.setURI(szSecureURL);
                    mainObject.m_HttpComms.setRequestMethod("GET");
                    var bResult = mainObject.m_HttpComms.send(mainObject.loginOnloadHandler);                       
                    if (!bResult) throw new Error("httpConnection returned false");
                    mainObject.m_iStage++;
                break;
               
                
                case 1: // login page               
                    var aLoginForm = szResponse.match(patternYahooLoginForm);
                    if (aLoginForm == null)
                         throw new Error("error parsing yahoo login web page");
                    mainObject.m_Log.Write("nsYahooSMTP.js - loginOnloadHandler - loginForm " + aLoginForm);
                    
                    var szLoginURL = aLoginForm[0].match(patternYahooAction)[1];
                    mainObject.m_Log.Write("nsYahooSMTP.js - loginOnloadHandler - loginURL " + szLoginURL);
                    
                    var aLoginData = aLoginForm[0].match(patternYahooInput);
                    mainObject.m_Log.Write("nsYahooSMTP.js - loginOnloadHandler - loginData " + aLoginData);
                   
                    mainObject.m_HttpComms.clean();
                    
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
                    
                    var szLogin = mainObject.m_szUserName.match(/(.*?)@/)[1].toLowerCase();
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
                                  
                case 2: //redirect
                    var aLoginRedirect = szResponse.match(patternYahooRedirect);
                    if (aLoginRedirect == null)
                         throw new Error("error parsing yahoo login web page");
                    mainObject.m_Log.Write("nsYahooSMTP.js - loginOnloadHandler - login redirect " + aLoginRedirect);    
                    var szLocation = aLoginRedirect[1];
                  
                    mainObject.m_HttpComms.clean();
                    mainObject.m_HttpComms.setURI(szLocation);
                    mainObject.m_HttpComms.setRequestMethod("GET");
                    var bResult = mainObject.m_HttpComms.send(mainObject.loginOnloadHandler);
                    if (!bResult) throw new Error("httpConnection returned false");
                    mainObject.m_iStage++;
                break;
            
                case 3: //mail box
                    var szLocation = httpChannel.URI.spec;
                    var iIndex = szLocation.indexOf("uilogin.srt");
                    mainObject.m_Log.Write("nsYahooSMTP.js - loginOnloadHandler - page check : " + szLocation 
                                                        + " index = " +  iIndex );
                    if (iIndex != -1) throw new Error("error logging in ");
                    
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
                                          + err.message);
                                            
            mainObject.serverComms("502 negative vibes\r\n");
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
                                              + err.message);
            return false;
        }
    },
    
    
    composerOnloadHandler : function(szResponse ,event , mainObject)
    {
        try
        {
            mainObject.m_Log.Write("nsYahooSMTP.js - composerOnloadHandler - START"); 
            
            mainObject.m_Log.Write("nsYahooSMTP.js - composerOnloadHandler : " 
                                                    + mainObject.m_iStage + "\n"
                                                    + szResponse);  
            
            var httpChannel = event.QueryInterface(Components.interfaces.nsIHttpChannel);
            
            //if this fails we've gone somewhere new
            mainObject.m_Log.Write("nsYahooSMTP.js - composerOnloadHandler - status :" +httpChannel.responseStatus );
            if (httpChannel.responseStatus != 200) 
                throw new Error("return status " + httpChannel.responseStatus);
            
            
            if (mainObject.m_Email.attachments.length>0 && !mainObject.m_bAttHandled)
                mainObject.m_iStage = 2;
        
            switch(mainObject.m_iStage)
            {
                case 0: //MSG handler
                    mainObject.m_Log.Write("nsYahooSMTP.js - composerOnloadHandler - Send MSG");
                    
                    var szForm = szResponse.match(patternYahooComposeForm)[0];
                    mainObject.m_Log.Write("nsYahooSMTP.js - composerOnloadHandler - Form " + szForm);
             
                    var szAction = szForm.match(patternYahooAction)[1];
                    mainObject.m_Log.Write("nsYahooSMTP.js - composerOnloadHandler - Action " + szAction);
                    var szActionURI = mainObject.m_szLocationURI + szAction;
                    mainObject.m_Log.Write("nsYahooSMTP.js - composerOnloadHandler - ActionURI " + szActionURI);
            
                    var aszInput = szForm.match(patternYahooInput);
                    mainObject.m_Log.Write("nsYahooSMTP.js - composerOnloadHandler - Input " + aszInput);
                    
                    for (i=0; i< aszInput.length; i++)
                    {
                        var szName = aszInput[i].match(patternYahooNameAlt)[1];
                        szName = szName.replace(/"/mg,"");
                        szName = szName.replace(/'/mg,"");
                        mainObject.m_Log.Write("nsYahooSMTP.js - composerOnloadHandler - Name " + szName); 
                                    
                        if (szName.search(/Send/i)!=-1)
                            mainObject.m_HttpComms.addValuePair(szName,"1"); 
                        else if (szName.search(/SaveCopy/i)!=-1)
                        {
                            var szSave = mainObject.m_bSaveCopy ? "yes" : "no";
                            mainObject.m_HttpComms.addValuePair(szName,szSave);
                        }
                        else
                        {
                            var szValue = aszInput[i].match(patternYahooAltValue)[1]
                            szValue = szValue.replace(/"/mg,"");
                            szValue = szValue.replace(/'/mg,"");              
                            mainObject.m_Log.Write("nsYahooSMTP.js - composerOnloadHandler -  value " + szValue);
                            mainObject.m_HttpComms.addValuePair(szName, (szValue? szValue : ""));
                        }
                    }
                    
                    var szTo = mainObject.m_Email.headers.getTo(); 
                    mainObject.m_Log.Write("nsYahooSMTP.js - composerOnloadHandler - TO " + szTo);
                    mainObject.m_HttpComms.addValuePair("To", (szTo? szTo : ""));
                                        
                    var szBCC = mainObject.m_Email.headers.getBcc();
                    mainObject.m_Log.Write("nsYahooSMTP.js - composerOnloadHandler - Bcc " + szBCC);
                    mainObject.m_HttpComms.addValuePair("Bcc", (szBCC? szBCC : ""));
                  
                    var szCc = mainObject.m_Email.headers.getCc();
                    mainObject.m_Log.Write("nsYahooSMTP.js - composerOnloadHandler - CC " + szCc);
                    mainObject.m_HttpComms.addValuePair("Cc", (szCc? szCc : ""));

                    var szSubject = mainObject.m_Email.headers.getSubject(); 
                    mainObject.m_Log.Write("nsYahooSMTP.js - composerOnloadHandler - Subject " + szSubject);
                    mainObject.m_HttpComms.addValuePair("Subj",
                                            (szSubject? encodeURIComponent(szSubject) : "%20"));
                   
                    var szContentType = mainObject.m_Email.headers.getContentType(2);
                    mainObject.m_Log.Write("nsYahooSMTP.js - composerOnloadHandler - ContentType " + szContentType);
                    if (szContentType)
                    {
                        var szTxtBody = mainObject.m_Email.body.getBody(0);
                        var szHtmlBody = mainObject.m_Email.body.getBody(1);
                       
                        if (szContentType.search(/plain/)!=-1)
                        {
                            mainObject.m_Log.Write("nsYahooSMTP.js - composerOnloadHandler - plain");
                            mainObject.m_HttpComms.addValuePair("Body",mainObject.escapeStr(szTxtBody));
                        }
                        else if (szContentType.search(/html/)!=-1)
                        {
                            mainObject.m_Log.Write("nsYahooSMTP.js - composerOnloadHandler - html");
                            mainObject.m_HttpComms.addValuePair("Format","html");
                            mainObject.m_HttpComms.addValuePair("Body",mainObject.escapeStr(szHtmlBody));
                        }
                        else if (szContentType.search(/alternative/i)!=-1 ||
                                           szContentType.search(/mixed/i)!=-1)
                        {  
                            if (mainObject.m_bSendHtml && szHtmlBody)
                            {
                                mainObject.m_Log.Write("nsYahooSMTP.js - composerOnloadHandler - bSendHtml szHtmlBody");
                                mainObject.m_HttpComms.addValuePair("Format","html");
                                mainObject.m_HttpComms.addValuePair("Body",encodeURIComponent(szHtmlBody));
                            }
                            else if (!mainObject.m_bSendHtml && szTxtBody)
                            {
                                mainObject.m_Log.Write("nsYahooSMTP.js - composerOnloadHandler - !bSendHtml szTxtBody");
                                mainObject.m_HttpComms.addValuePair("Body",encodeURIComponent(szTxtBody));
                            }
                            else if (szHtmlBody)
                            {
                                mainObject.m_Log.Write("nsYahooSMTP.js - composerOnloadHandler - szHtmlBody");
                                mainObject.m_HttpComms.addValuePair("Format","html");
                                mainObject.m_HttpComms.addValuePair("Body",encodeURIComponent(szHtmlBody));
                            }
                            else if (szTxtBody)
                            {
                                mainObject.m_Log.Write("nsYahooSMTP.js - composerOnloadHandler - szTxtBody");
                                mainObject.m_HttpComms.addValuePair("Format","plain");
                                mainObject.m_HttpComms.addValuePair("Body",encodeURIComponent(szTxtBody));
                            }  
                        }
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
                        mainObject.serverComms("250 OK\r\n");
                    else
                        mainObject.serverComms("502 Error Sending Email\r\n");   
                break;
                
                case 2: //Attchment request
                    mainObject.m_Log.Write("nsYahooSMTP.js - composerOnloadHandler - attachment request"); 
                    mainObject.m_bAttHandled =true;
                    
                    var szForm = szResponse.match(patternYahooComposeForm)[0];
                    mainObject.m_Log.Write("nsYahooSMTP.js - composerOnloadHandler - Form " + szForm);
             
                    var szAction = szForm.match(patternYahooAction)[1];
                    mainObject.m_Log.Write("nsYahooSMTP.js - composerOnloadHandler - Action " + szAction);
                    var szActionURI = mainObject.m_szLocationURI + szAction;
                    mainObject.m_Log.Write("nsYahooSMTP.js - composerOnloadHandler - ActionURI " + szActionURI);
            
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
                            mainObject.m_HttpComms.addFormData(szName,"Attach Files",null,false);          
                        }
                        else
                        { 
                           
                            var szValue = aszInput[i].match(patternYahooAltValue)[1]
                            szValue = szValue.replace(/"/mg,""); 
                            szValue = szValue.replace(/'/mg,"");              
                            mainObject.m_Log.Write("nsYahooSMTP.js - composerOnloadHandler - value " + szValue);
                            mainObject.m_HttpComms.addFormData(szName,
                                                               (szValue.length>0) ? szValue : "",
                                                               false,
                                                               null,
                                                               false);  
                        }
                    }
                    
                    for (i=0; i< aszFileInput.length; i++)
                    {
                        var szName = aszFileInput[i].match(patternYahooNameAlt)[1];
                        szName = szName.replace(/"/mg,"");
                        mainObject.m_Log.Write("nsYahooSMTP.js - composerOnloadHandler - Name " + szName); 
                        
                        szData+="Content-Disposition: form-data; name=\""
                        szData += szName +"\"";
                        if (i < mainObject.m_Email.attachments.length)
                        {
                            //headers
                            var oAttach = mainObject.m_Email.attachments[i];
                            var szFileName = oAttach.headers.getContentType(4);
                            if (!szFileName) szFileName = "";
                            mainObject.m_Log.Write("nsYahooSMTP.js - composerOnloadHandler - Filename " + szFileName); 
                            var szEncoding = oAttach.headers.getEncoderType();
                                                      
                            //body
                            var szBody = oAttach.body.getBody(0);
                            if (szEncoding.search(/base64/i)!=-1)
                            {
                                mainObject.m_Log.Write("nsYahooSMTP.js - composerOnloadHandler - encoded B64"); 
                                var oBase64 = new base64();
                                szBody = oBase64.decode(szBody.replace(/\r\n/gm,""));
                                mainObject.m_HttpComms.addFormData(szName,szBody,true,szFileName,true); 
                            } 
                            else if (szEncoding.search(/quoted-printable/i)!=-1)
                            {
                                mainObject.m_Log.Write("nsYahooSMTP.js - composerOnloadHandler - encoded QP");  
                                var oQP = new QuotedPrintable();
                                szBody = oQP.decode(szBody);
                                mainObject.m_HttpComms.addFormData(szName,szBody,true,szFileName,false);    
                            }
                            else
                            {
                                mainObject.m_Log.Write("nsYahooSMTP.js - composerOnloadHandler - no encoding"); 
                                mainObject.m_HttpComms.addFormData(szName,szBody,true,szFileName,false); 
                            }
                        }
                        else
                            mainObject.m_HttpComms.addFormData(szName, null, true, null, false); 
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
                        
                        mainObject.m_HttpComms.addValuePair(szName,
                                                        (szValue.length>0)? szValue : "");
                    }
                   
                    mainObject.m_HttpComms.setContentType(0);
                    mainObject.m_HttpComms.setURI(szAction);
                    mainObject.m_HttpComms.setRequestMethod("POST");
                    var bResult = mainObject.m_HttpComms.send(mainObject.composerOnloadHandler);  
                    if (!bResult) throw new Error("httpConnection returned false");
                    mainObject.m_iStage = 0;
                break;
            };
                     
            mainObject.m_Log.Write("nsYahooSMTP.js - composerOnloadHandler - END");
        }
        catch(err)
        {
            mainObject.m_Log.DebugDump("nsYahooSMTP.js: composerOnloadHandler : Exception : " 
                                          + err.name 
                                          + ".\nError message: " 
                                          + err.message);
                                            
            mainObject.serverComms("502 negative vibes\r\n");
        }
    },
    
    
    escapeStr : function(szMSG)
    {
        var szEncode = encodeURIComponent(szMSG);
        szEncode = szEncode.replace(/%20/gm,"+"); //replace space
        return szEncode;
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
                                              + e.message);
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
