function HotmailSMTPScreenRipper(oResponseStream, oLog, oPrefData)
{
    try
    {       
        var scriptLoader = Components.classes["@mozilla.org/moz/jssubscript-loader;1"];
        scriptLoader = scriptLoader.getService(Components.interfaces.mozIJSSubScriptLoader);
        scriptLoader.loadSubScript("chrome://web-mail/content/common/DebugLog.js");
        scriptLoader.loadSubScript("chrome://web-mail/content/common/HttpComms2.js");
        scriptLoader.loadSubScript("chrome://web-mail/content/common/Email.js");
        scriptLoader.loadSubScript("chrome://hotmail/content/Hotmail-Prefs-Data.js");
               
        this.m_Log = oLog; 
                
        this.m_Log.Write("Hotmail-SR-SMTP - Constructor - START");   
       
        this.m_szUserName = null;   
        this.m_szPassWord =null; 
        this.m_oResponseStream = oResponseStream;  
        this.m_HttpComms = new HttpComms();   
        this.m_szUM = null;
        this.m_szLocationURI = null;
        this.m_szHomeURI = null;
        this.m_szComposer = null;
        this.aszTo = null;
        this.szFrom = null;
        this.m_Email = new email("");
        this.m_Email.decodeBody(true);
        this.m_iStage = 0;  
        this.m_bAttHandled = false;
        this.m_iAttCount = 0;
        this.m_iAttUploaded = 1;
        this.m_szImageVerForm = null;
         
        this.m_ComponentManager = Components.classes["@mozilla.org/nsComponentData2;1"];
        this.m_ComponentManager = this.m_ComponentManager.getService(Components.interfaces.nsIComponentData2);
        
        this.m_bReEntry = false;
                       
        this.m_bReUseSession = oPrefData.bReUseSession;    //do i reuse the session
        this.m_bSaveCopy= oPrefData.bSaveCopy;            //do i save copy
        this.m_bSendHtml = oPrefData.bSendHtml;          //what do i do with alternative parts
                                     
        this.m_Log.Write("Hotmail-SR-SMTP.js - Constructor - END");  
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




HotmailSMTPScreenRipper.prototype =
{ 
    logIn : function(szUserName, szPassWord)
    {
        try
        {
            this.m_Log.Write("Hotmail-SR-SMTP - logIN - START");   
            this.m_Log.Write("Hotmail-SR-SMTP - logIN - Username: " + szUserName 
                                                   + " Password: " +  szPassWord 
                                                   + " stream: " + this.m_oResponseStream);
            this.m_szUserName = szUserName.toLowerCase();
            this.m_szPassWord = szPassWord;
            
            if (!this.m_szUserName || !this.m_oResponseStream || !this.m_szPassWord) return false;
            
            this.m_iStage= 0;
            this.m_HttpComms.setURI("http://www.hotmail.com");
            this.m_HttpComms.setUserName(this.m_szUserName);
            
            //get session data
            if (this.m_bReUseSession)
            { 
                this.m_Log.Write("Hotmail-SR-BETAR - logIN - Getting Session Data");           
                this.m_szHomeURI = this.m_ComponentManager.findElement(this.m_szUserName, "szHomeURI");
                this.m_Log.Write("Hotmail-SR-BETAR - logIN - szHomeURI " +this.m_szHomeURI);    
                if (this.m_szHomeURI)
                {
                    this.m_Log.Write("Hotmail-SR-BETAR - logIN - Session Data Found"); 
                    this.m_iStage =3;
                    this.m_bReEntry = true;
                    this.m_HttpComms.setURI(this.m_szHomeURI);
                }
            }
            
            this.m_HttpComms.setRequestMethod("GET");
            var bResult = this.m_HttpComms.send(this.loginOnloadHandler, this);  
            if (!bResult) throw new Error("httpConnection returned false");        
                       
            this.m_Log.Write("Hotmail-SR-SMTP - logIN - END");    
            return true;
        }
        catch(e)
        {
            this.m_Log.DebugDump("Hotmail-SR-SMTP: logIN : Exception : " 
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
            mainObject.m_Log.Write("Hotmail-SR-SMTP - loginOnloadHandler - START"); 
            mainObject.m_Log.Write("Hotmail-SR-SMTP - loginOnloadHandler : \n" + szResponse);
            mainObject.m_Log.Write("Hotmail-SR-SMTP - loginOnloadHandler : " + mainObject.m_iStage);  
            
            var httpChannel = event.QueryInterface(Components.interfaces.nsIHttpChannel);
            mainObject.m_Log.Write("Hotmail-SR-SMTP - loginOnloadHandler - status :" +httpChannel.responseStatus );
            
            //if this fails we've gone somewhere new
            if (httpChannel.responseStatus != 200 ) 
                throw new Error("return status " + httpChannel.responseStatus);
             
            //page code                                
            switch (mainObject.m_iStage)
            {
                case 0: // redirect destination
                    var aForm = szResponse.match(patternHotmailSMTPForm);
                    if (!aForm) throw new Error("error parsing login page");
                    mainObject.m_Log.Write("Hotmail-SR-SMTP - loginOnloadHandler "+ aForm);
                    
                    //action
                    var szAction = aForm[0].match(patternHotmailSMTPAction)[1];
                    mainObject.m_Log.Write("Hotmail-SR-SMTP - loginOnloadHandler "+ szAction);
                    mainObject.m_HttpComms.setURI(szAction);
                    
                    //name value
                    var aInput = aForm[0].match(patternHotmailSMTPInput);
                    mainObject.m_Log.Write("Hotmail-SR-SMTP - loginOnloadHandler "+ aInput);
                    for (i=0; i<aInput.length ; i++)
                    {
                        var szName =  aInput[i].match(patternHotmailSMTPName)[1];
                        mainObject.m_Log.Write("Hotmail-SR-SMTP - loginOnloadHandler "+ szName);  
                        var szValue =  aInput[i].match(patternHotmailSMTPValue)[1];
                        mainObject.m_Log.Write("Hotmail-SR-SMTP - loginOnloadHandler "+ szValue);
                        szValue = encodeURIComponent(szValue);
                        mainObject.m_HttpComms.addValuePair(szName, szValue);
                    }
                    
                    mainObject.m_HttpComms.setRequestMethod("POST");
                    var bResult = mainObject.m_HttpComms.send(mainObject.loginOnloadHandler, mainObject);   
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
                    
                    var szAction = aForm[0].match(patternHotmailSMTPAction)[1];
                    mainObject.m_Log.Write("Hotmail-SR- loginOnloadHandler "+ szAction);
                    var szDomain = mainObject.m_szUserName.split("@")[1];
                    var szRegExp = "g_DO\\[\""+szDomain+"\"\\]=\"(.*?)\"";
                    mainObject.m_Log.Write("Hotmail-SR- loginOnloadHandler szRegExp "+ szRegExp);
                    var regExp = new RegExp(szRegExp,"i");
                    var aszURI = szResponse.match(regExp);
                    mainObject.m_Log.Write("Hotmail-SR- loginOnloadHandler aszURI "+ aszURI);
                    var szURI = null;
                    if (!aszURI)
                    {
                        szURI = szAction;
                    }
                    else
                    {
                        var szQS =  szResponse.match(patternHotmailSMTPQS)[1];    
                        mainObject.m_Log.Write("Hotmail-SR- loginOnloadHandler szQuery "+ szQS); 
                        szURI = aszURI[1] + "?" + szQS; 
                    }
                    mainObject.m_HttpComms.setURI(szURI);                 
                    
                    mainObject.m_HttpComms.setRequestMethod("POST");
                    var bResult = mainObject.m_HttpComms.send(mainObject.loginOnloadHandler,mainObject);                   
                    if (!bResult) throw new Error("httpConnection returned false");
                    mainObject.m_iStage++;
                break;
               
                case 2: //refresh
                   var aRefresh = szResponse.match(patternHotmailSMTPForm);
                    mainObject.m_Log.Write("Hotmail-SR - loginOnloadHandler - refresh "+ aRefresh); 
                   
                    if (aRefresh)
                    {   
                        //action
                        var szAction = aRefresh[0].match(patternHotmailSMTPAction)[1];
                        mainObject.m_Log.Write("Hotmail-SR- loginOnloadHandler "+ szAction);
                        mainObject.m_HttpComms.setURI(szAction);
                        
                        //form data  
                        var aInput =  aRefresh[0].match(patternHotmailSMTPInput);
                        mainObject.m_Log.Write("Hotmail-SR- loginOnloadHandler "+ aInput); 
                        var szName =  aInput[0].match(patternHotmailSMTPName)[1];
                        var szValue =  aInput[0].match(patternHotmailSMTPValue)[1];
                        szValue = encodeURIComponent(szValue);
                        mainObject.m_HttpComms.addValuePair(szName,szValue);
                        mainObject.m_HttpComms.setRequestMethod("POST");  
                    }
                    else
                    {
                        aRefresh = szResponse.match(patternHotmailSMTPRefresh);
                        
                        if (!aRefresh)
                            aRefresh = szResponse.match(patternHotmailSMTPJavaRefresh);
                            
                        mainObject.m_Log.Write("Hotmail-SR - loginOnloadHandler refresh "+ aRefresh); 
                        if (aRefresh == null) throw new Error("error parsing login page");    
                        
                        mainObject.m_HttpComms.setURI(aRefresh[1]);
                        mainObject.m_HttpComms.setRequestMethod("GET");
                    } 
           
                    var bResult = mainObject.m_HttpComms.send(mainObject.loginOnloadHandler, mainObject);   
                    if (!bResult) throw new Error("httpConnection returned false");
                    mainObject.m_iStage++;
                break;
               
                case 3:
                    if (szResponse.search(patternHotmailSMTPMailbox) == -1)
                    {
                        if (mainObject.m_bReEntry)
                        {
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
                    mainObject.m_szHomeURI =  httpChannel.URI.spec;
                    mainObject.m_Log.Write("Hotmail-SR-SMTP - loginOnloadHandler - m_szHomeURI : " + mainObject.m_szHomeURI);
                    
                    //get urls for later use
                    mainObject.m_szUM = szResponse.match(patternHotmailSMTP_UM)[1];
                    mainObject.m_Log.Write("Hotmail-SR-SMTP - loginOnloadHandler - UM : "+mainObject.m_szUM );
                    
                    mainObject.m_szLocationURI = httpChannel.URI.prePath ;
                    mainObject.m_Log.Write("Hotmail-SR-SMTP - loginOnloadHandler - m_szLocationURI : "+mainObject.m_szLocationURI );
                   
                    mainObject.m_szComposer = szResponse.match(patternHotmailSMTPComposer)[1];
                    mainObject.m_Log.Write("Hotmail-SR-SMTP - loginOnloadHandler - m_szComposer : "+mainObject.m_szComposer );
                    
                    //server response
                    mainObject.serverComms("235 Your In\r\n");
                    mainObject.m_bAuthorised = true;
                break;
            }
            
            mainObject.m_Log.Write("Hotmail-SR-SMTP - loginOnloadHandler - END");
        }
        catch(err)
        {
            mainObject.m_Log.DebugDump("Hotmail-SR-SMTP: loginHandler : Exception : " 
                                          + err.name 
                                          + ".\nError message: " 
                                          + err.message+ "\n"
                                          + err.lineNumber);
            
            var szSession = mainObject.m_ComponentManager.findElement(mainObject.m_szUserName, "szHomeURI");    
            if (!szSession)
            {
                mainObject.m_HttpComms.deleteSessionData();
            } 
            mainObject.serverComms("502 negative vibes from " + mainObject.m_szUserName + "\r\n");
        }
    },
    
    
    rawMSG : function ( szFrom, aszTo, szEmail)
    {
        try
        {
            this.m_Log.Write("Hotmail-SR-SMTP.js - rawMSG - START"); 
            
            if (!this.m_Email.parse(szEmail))
                throw new Error ("Parse Failed")
                
            this.m_aszTo = aszTo;
            this.m_szFrom = szFrom;
            this.m_iAttCount = this.m_Email.attachments.length-1;
            this.m_iAttUploaded = 0;
        
            this.m_iStage=0;
            var szUri = this.m_szLocationURI + this.m_szComposer + this.m_szUM;
            this.m_HttpComms.setURI(szUri);
            this.m_HttpComms.setRequestMethod("GET");
            var bResult = this.m_HttpComms.send(this.composerOnloadHandler, this);      
            if (!bResult) throw new Error("httpConnection returned false");
            
            this.m_Log.Write("Hotmail-SR-SMTP.js - rawMSG - END"); 
            return true;
        }
        catch(err)
        {
            this.m_Log.DebugDump("Hotmail-SR-SMTP: rawMSG : Exception : " 
                                          + err.name 
                                          + ".\nError message: " 
                                          + err.message+ "\n"
                                          + err.lineNumber);
            
            mainObject.serverComms("502 negative vibes from " + mainObject.m_szUserName + "\r\n");
            return false;
        } 
    },
    
    
    
    composerOnloadHandler : function(szResponse ,event , mainObject)
    {
        try
        {
            mainObject.m_Log.Write("Hotmail-SR-SMTP - composerOnloadHandler - START"); 
            mainObject.m_Log.Write("Hotmail-SR-SMTP - composerOnloadHandler : \n" + szResponse);
            mainObject.m_Log.Write("Hotmail-SR-SMTP - composerOnloadHandler : " + mainObject.m_iStage );  
            
            var httpChannel = event.QueryInterface(Components.interfaces.nsIHttpChannel);
            mainObject.m_Log.Write("Hotmail-SR-SMTP.js - composerOnloadHandler - status :" +httpChannel.responseStatus );
           
            //if this fails we've gone somewhere new
            if (httpChannel.responseStatus != 200) 
                mainObject.serverComms("502 Error Sending Email\r\n");
                        
            if (mainObject.m_Email.attachments.length>0 && !mainObject.m_bAttHandled)
                mainObject.m_iStage = 2;
                
            //page code                                
            switch (mainObject.m_iStage)
            {
                case 0:  //MSG handler
                    mainObject.m_Log.Write("Hotmail-SR-SMTP.js - composerOnloadHandler - Send MSG"); 
                    
                    var szForm = szResponse.match(patternHotmailSMTPCompForm)[0];
                    mainObject.m_Log.Write("Hotmail-SR-SMTP.js - composerOnloadHandler - Form " + szForm);
                    
                    var szAction = szForm.match(patternHotmailSMTPAction)[1];
                    mainObject.m_HttpComms.setURI(szAction);
                                      
                    var aInput = szForm.match(patternHotmailSMTPInput);
                    mainObject.m_Log.Write("Hotmail-SR-SMTP.js - composerOnloadHandler - INPUT " + aInput);
                    
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
                                                                              
                        if (szName.search(/^to$/i)!=-1|| szName.search(/^encodedto$/i)!=-1) 
                        {
                            var szTo = mainObject.m_Email.headers.getTo();
                            szValue = szTo? escape(szTo):"";
                        }
                        else if (szName.search(/^cc$/i)!=-1|| szName.search(/^encodedcc$/i)!=-1) 
                        {
                            var szCc = mainObject.m_Email.headers.getCc();
                            szValue = szCc? escape(szCc):"";
                        }
                        else if (szName.search(/^bcc$/i)!=-1 || szName.search(/^encodedbcc$/i)!=-1) 
                        {
                            var szTo = mainObject.m_Email.headers.getTo();
                            var szCc = mainObject.m_Email.headers.getCc();
                            var szBcc = mainObject.getBcc(szTo, szCc);
                            szValue = szBcc? escape(szBcc):"";
                        }
                        else if (szName.search(/subject/i)!=-1)
                        {   
                            var szSubject = mainObject.m_Email.headers.getSubject(); 
                            szValue = szSubject? escape(szSubject) : "%20";
                        }
                        else if (szName.search(/outgoing/i)!=-1)
                        {
                            szValue = mainObject.m_bSaveCopy? "on":"off";
                        }
                        else if (szName.search(/_HMaction/i)!=-1) 
                        {
                            szValue = "Send";
                        }
                       
                        mainObject.m_HttpComms.addValuePair(szName,szValue);
                    }
                    
                    if (mainObject.m_Email.txtBody && !mainObject.m_bSendHtml || !mainObject.m_Email.htmlBody)
                    {
                        mainObject.m_Log.Write("Hotmail-SR-SMTP.js - composerOnloadHandler - plain");
                        var szTxtBody = mainObject.m_Email.txtBody.body.getBody();
                        mainObject.m_HttpComms.addValuePair("body",escape(szTxtBody));
                    }
                    else if (mainObject.m_Email.htmlBody && mainObject.m_bSendHtml || !mainObject.m_Email.txtBody)
                    {   
                        mainObject.m_Log.Write("Hotmail-SR-SMTP.js - composerOnloadHandler - html");
                        var szHTMLBody = mainObject.m_Email.htmlBody.body.getBody();
                        szHTMLBody = szHTMLBody.match(/<html>[\s\S]*<\/html>/)[0];
                        mainObject.m_HttpComms.addValuePair("body",escape(szHTMLBody));
                    }
                    
                    mainObject.m_HttpComms.setRequestMethod("POST");
                    var bResult = mainObject.m_HttpComms.send(mainObject.composerOnloadHandler, mainObject);      
                    if (!bResult) throw new Error("httpConnection returned false");
                    mainObject.m_iStage = 1;
                break;
                
                case 1: //MSG OK handler  
                    if (szResponse.search(patternHotmailAD)!=-1)
                    {
                        mainObject.m_Log.Write("Hotmail-SR-SMTP.js - composerOnloadHandler - MSG OK");
                        
                        if (mainObject.m_bReUseSession)
                        { 
                            mainObject.m_Log.Write("Hotmail-SR- logIN - Setting Session Data");           
                            mainObject.m_ComponentManager.addElement(mainObject.m_szUserName, "szHomeURI", mainObject.m_szHomeURI);
                            mainObject.m_Log.Write("nsYahoo.js - logIN - szHomeURI" + mainObject.m_szHomeURI);    
                        }
                        else
                        {
                            mainObject.m_Log.Write("Hotmail-SR- logIN - deleting Session Data");
                            mainObject.m_HttpComms.deleteSessionData(); 
                            mainObject.m_ComponentManager.deleteAllElements(mainObject.m_szUserName);
                        }
                        
                        mainObject.serverComms("250 OK\r\n");    
                    }
                    else if (szResponse.search(patternHotmailSpamForm)!=-1)//spam challenge 
                    {
                        mainObject.m_Log.Write("Hotmail-SR-SMTP - composerOnloadHandler - image verification\n"+szResponse);
                        //get form
                        mainObject.m_szImageVerForm = szResponse.match(patternHotmailSpamForm)[0];
                        mainObject.m_Log.Write("Hotmail-SR-SMTP - composerOnloadHandler - form " + mainObject.m_szImageVerForm );
                        
                        //get base
                        var szBase = szResponse.match(patternHotmailBase)[1];
                        mainObject.m_Log.Write("Hotmail-SR-SMTP - composerOnloadHandler - base " + szBase);
                        
                        //get image
                        var szImageUri = szResponse.match(patternHotmailSpamImage)[1];
                        mainObject.m_Log.Write("Hotmail-SR-SMTP - composerOnloadHandler - image " + szImageUri);
                        
                        mainObject.m_HttpComms.setURI(szBase + szImageUri);
                        mainObject.m_HttpComms.setRequestMethod("GET");
                        mainObject.m_iStage = 4;
                        var bResult = mainObject.m_HttpComms.send(mainObject.composerOnloadHandler, mainObject);  
                        if (!bResult) throw new Error("httpConnection returned false");                        
                    }
                    else
                        mainObject.serverComms("502 Failed\r\n"); 
                break;
                
                case 2: //Add Attachment Request
                    mainObject.m_Log.Write("Hotmail-SR-SMTP.js - composerOnloadHandler - Attach Request");
                    
                    var szForm = szResponse.match(patternHotmailSMTPCompForm)[0];
                    mainObject.m_Log.Write("Hotmail-SR-SMTP.js - composerOnloadHandler - Form " + szForm);
                    
                    var szAction = szForm.match(patternHotmailSMTPAction)[1];
                    mainObject.m_HttpComms.setURI(szAction);
                    mainObject.m_HttpComms.setRequestMethod("POST");
                    
                    var aInput = szForm.match(patternHotmailSMTPInput);
                    mainObject.m_Log.Write("Hotmail-SR-SMTP.js - composerOnloadHandler - INPUT " + aInput);
                    
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
                    
                    var bResult = mainObject.m_HttpComms.send(mainObject.composerOnloadHandler, mainObject);      
                    if (!bResult) throw new Error("httpConnection returned false");
                    mainObject.m_bAttHandled = true;
                    mainObject.m_iStage = 3;
                break;
                
                case 3: //Add Attach
                    mainObject.m_Log.Write("Hotmail-SR-SMTP.js - composerOnloadHandler - More Attachments"); 
                    mainObject.m_Log.Write("Hotmail-SR-SMTP.js - composerOnloadHandler - upload " +mainObject.m_iAttUploaded
                                                        + " " + mainObject.m_iAttCount );
                     
                    var szForm = szForm = szResponse.match(patternHotmailSMTPAttForm)[0];
                    mainObject.m_Log.Write("Hotmail-SR-SMTP.js - composerOnloadHandler - Form " + szForm);
                    
                    if (mainObject.m_iAttUploaded == mainObject.m_iAttCount)
                        mainObject.m_iStage = 0;
                    else
                        mainObject.m_iStage = 3;  
                                 
                    var szAction = szForm.match(patternHotmailSMTPAction)[1];
                    mainObject.m_HttpComms.setURI(szAction);
                    mainObject.m_HttpComms.setRequestMethod("POST");

                    var aInput = szForm.match(patternHotmailSMTPInput);
                    mainObject.m_Log.Write("Hotmail-SR-SMTP.js - composerOnloadHandler - INPUT " + aInput);
                    
                                             
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

                        if (szName.search(/^attfile$/i)!=-1)
                        { 
                            //headers
                            var oAttach = mainObject.m_Email.attachments[mainObject.m_iAttUploaded];
                            var szFileName = oAttach.headers.getContentType(4);
                            if (!szFileName) szFileName = "";
                            mainObject.m_Log.Write("Hotmail-SR-SMTP.js - composerOnloadHandler - Filename " + szFileName); 
                                                      
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
                    mainObject.m_HttpComms.setContentType("multipart/form-data");
                    mainObject.m_HttpComms.setURI(szAction);
                    mainObject.m_HttpComms.setRequestMethod("POST");
                    var bResult = mainObject.m_HttpComms.send(mainObject.composerOnloadHandler, mainObject);  
                    if (!bResult) throw new Error("httpConnection returned false"); 
                break;
                
                case 4: //downloaded image verifiaction
                    mainObject.m_Log.Write("Hotmail-SR-SMTP.js - composerOnloadHandler - image download"); 
                    var szPath = mainObject.writeImageFile(szResponse);
                    mainObject.m_Log.Write("Hotmail-SR-SMTP.js - composerOnloadHandler - imageFile " + szPath);
                    var szResult =  mainObject.openSpamWindow(szPath);
                    
                    if (!szResult)
                    {
                        mainObject.serverComms("502 Error Sending Email\r\n");
                        return;
                    }
                    
                    //construct form 
                    var aszInput = mainObject.m_szImageVerForm.match(patternHotmailSMTPInput);
                    for (i=0; i< aszInput.length; i++)
                    {
                        var szName = aszInput[i].match(patternHotmailSMTPName)[1];
                        mainObject.m_Log.Write("Hotmail-SR-SMTP.js - composerOnloadHandler - Name " + szName); 
                                              
                        var szValue = "";
                        if (szName.search(/HIPSolution/i)!=-1)
                        {
                            szValue = szResult;
                        }
                        else
                        {
                            szValue = aszInput[i].match(patternHotmailSMTPValue)[1]
                        }
                        szValue = encodeURIComponent(szValue);
                        mainObject.m_Log.Write("Hotmail-SR-SMTP.js - composerOnloadHandler - value " + szValue);
                        
                        mainObject.m_HttpComms.addValuePair(szName,(szValue.length>0)? szValue : "");
                    }

                    var szActionUrl = mainObject.m_szImageVerForm.match(patternHotmailSMTPAction)[1];
                    mainObject.m_Log.Write("Hotmail-SR-SMTP.js - composerOnloadHandler - szFormAction " + szActionUrl);
                    
                    //send data
                    mainObject.m_HttpComms.setContentType("multipart/form-data");
                    mainObject.m_HttpComms.setURI(szActionUrl);
                    mainObject.m_HttpComms.setRequestMethod("POST");
                    var bResult = mainObject.m_HttpComms.send(mainObject.composerOnloadHandler, mainObject);  
                    if (!bResult) throw new Error("httpConnection returned false");
                    mainObject.m_iStage = 1;
                break;
            }; 
              
            mainObject.m_Log.Write("Hotmail-SR-SMTP.js - composerOnloadHandler - END");
        }
        catch(err)
        {
            mainObject.m_Log.DebugDump("Hotmail-SR-SMTP.js: composerOnloadHandler : Exception : " 
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
            this.m_Log.Write("Hotmail-SR-SMTP.js - getBcc - START");
            if (this.m_aszTo.length==0) return null;
            this.m_Log.Write("Hotmail-SR-SMTP.js - getBcc - szRcptList " + this.m_aszTo);  
            
            var szBcc = null;
            var szAddress = null;
            if (szTo) szAddress = szTo;
            if (szCc) szAddress = (szTo ? (szAddress + ","+ szCc) : szCc);
            this.m_Log.Write("Hotmail-SR-SMTP.js - getBcc - szAddress " + szAddress);
           
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
            this.m_Log.Write("Hotmail-SR-SMTP.js - getBcc szBcc- " + szBcc);
            
            this.m_Log.Write("Hotmail-SR-SMTP.js - getBcc - End");
            return szBcc;  
        }
        catch(err)
        {
            this.m_Log.DebugDump("Hotmail-SR-SMTP.js: getBcc : Exception : " 
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
            this.m_Log.Write("Hotmail-SR-SMTP - serverComms - START");
            this.m_Log.Write("Hotmail-SR-SMTP - serverComms msg " + szMsg);
            var iCount = this.m_oResponseStream.write(szMsg,szMsg.length);
            this.m_Log.Write("Hotmail-SR-SMTP - serverComms sent count: " + iCount 
                                                        +" msg length: " +szMsg.length);
            this.m_Log.Write("Hotmail-SR-SMTP - serverComms - END");  
        }
        catch(e)
        {
            this.m_Log.DebugDump("Hotmail-SR-SMTP: serverComms : Exception : " 
                                              + e.name 
                                              + ".\nError message: " 
                                              + e.message+ "\n"
                                              + e.lineNumber);
        }
    },
    
    
    writeImageFile : function(szData)
    {
        try
        {
            this.m_Log.Write("Hotmail-SR-SMTP.js - writeImageFile - End");
            
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
            this.m_Log.Write("Hotmail-SR-SMTP.js - writeImageFile - path " + URL);
            
            this.m_Log.Write("Hotmail-SR-SMTP.js - writeImageFile - End");
            return URL;
        }
        catch(err)
        {
            this.m_Log.DebugDump("Hotmail-SR-SMTP.js: writeImageFile : Exception : " 
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
            this.m_Log.Write("Hotmail-SR-SMTP : openWindow - START");
            
            var params = Components.classes["@mozilla.org/embedcomp/dialogparam;1"]
                                   .createInstance(Components.interfaces.nsIDialogParamBlock);
            params.SetNumberStrings(1);
            params.SetString(0, szPath);           
                      
            var window = Components.classes["@mozilla.org/embedcomp/window-watcher;1"]
                                  .getService(Components.interfaces.nsIWindowWatcher);
            
            window.openWindow(null, 
                              "chrome://hotmail/content/Hotmail-SpamImage.xul",
                              "_blank", 
                              "chrome,alwaysRaised,dialog,modal,centerscreen,resizable",
                              params);
           
            var iResult = params.GetInt(0);
            this.m_Log.Write("Hotmail-SR-SMTP : openWindow - " + iResult);
            var szResult =  null;
            if (iResult) 
            {
                szResult = params.GetString(0);
                this.m_Log.Write("Hotmail-SR-SMTP : openWindow - " + szResult);
            }
            
            this.m_Log.Write("Hotmail-SR-SMTP : openWindow - END");
            return szResult;
        }
        catch(err)
        {
            this.m_Log.DebugDump("Hotmail-SR-SMTP: Exception in openWindow : " 
                                               + err.name 
                                               + ".\nError message: " 
                                               + err.message + "\n"
                                               + err.lineNumber);
        }
    },
}
