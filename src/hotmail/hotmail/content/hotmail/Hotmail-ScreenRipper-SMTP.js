function HotmailSMTPScreenRipper(oResponseStream, oLog, bSaveCopy)
{
    try
    {       
        var scriptLoader = Components.classes["@mozilla.org/moz/jssubscript-loader;1"];
        scriptLoader = scriptLoader.getService(Components.interfaces.mozIJSSubScriptLoader);
        scriptLoader.loadSubScript("chrome://web-mail/content/common/DebugLog.js");
        scriptLoader.loadSubScript("chrome://web-mail/content/common/comms.js");
        scriptLoader.loadSubScript("chrome://web-mail/content/common/Email.js");
        scriptLoader.loadSubScript("chrome://web-mail/content/common/base64.js");
        scriptLoader.loadSubScript("chrome://web-mail/content/common/Quoted-Printable.js");
               
        this.m_Log = oLog; 
                
        this.m_Log.Write("Hotmail-SR-SMTP - Constructor - START");   
       
        this.m_szUserName = null;   
        this.m_szPassWord =null; 
        this.m_oResponseStream = oResponseStream;  
        this.m_bSaveCopy =  bSaveCopy;
        this.m_HttpComms = new Comms(this,this.m_Log);   
        this.m_szUM = null;
        this.m_szLocationURI = null;
        this.m_szComposer = null;
        this.aszTo = null;
        this.szFrom = null;
        this.m_Email = new email(this.m_Log);
        this.m_iStage = 0;  
        this.m_bAttHandled = false;
        this.m_iAttCount = 0;
        this.m_iAttUploaded = 0;
                                                     
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
            this.m_szUserName = szUserName;
            this.m_szPassWord = szPassWord;
            
            if (!this.m_szUserName || !this.m_oResponseStream || !this.m_szPassWord) return false;
                     
            //get hotmail.com webpage
            this.m_iStage= 0;
            this.m_HttpComms.clean();
            this.m_HttpComms.setContentType(-1);
            this.m_HttpComms.setURI("http://www.hotmail.com");
            this.m_HttpComms.setRequestMethod("GET");
            var bResult = this.m_HttpComms.send(this.loginOnloadHandler);  
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
            mainObject.m_Log.Write("Hotmail-SR-SMTP - loginOnloadHandler : " + mainObject.m_iStage);  
            
            var httpChannel = event.QueryInterface(Components.interfaces.nsIHttpChannel);
            mainObject.m_Log.Write("Hotmail-SR-SMTP - loginOnloadHandler - status :" +httpChannel.responseStatus );
            
            //if this fails we've gone somewhere new
            if (httpChannel.responseStatus != 200 ) 
                throw new Error("return status " + httpChannel.responseStatus);
  
            mainObject.m_HttpComms.clean();
            mainObject.m_HttpComms.setContentType(0);
             
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
                                else 
                                    szData = szValue;
                                    
                                mainObject.m_HttpComms.addValuePair(szName,szData);
                            }
                        }
                    }
                    
                    var szAction = aForm[0].match(patternHotmailSMTPAction)[1];
                    mainObject.m_Log.Write("Hotmail-SR-SMTP - loginOnloadHandler "+ szAction);
                    mainObject.m_HttpComms.setURI(szAction);                    
                    
                    mainObject.m_HttpComms.setRequestMethod("POST");
                    var bResult = mainObject.m_HttpComms.send(mainObject.loginOnloadHandler);                   
                    if (!bResult) throw new Error("httpConnection returned false");
                    mainObject.m_iStage++;
                break;
               
                case 2: //refresh
                    var aRefresh = szResponse.match(patternHotmailSMTPRefresh);
                    if (!aRefresh)
                        aRefresh = szResponse.match(patternHotmailSMTPJavaRefresh);
                    mainObject.m_Log.Write("Hotmail-SR-SMTP - loginOnloadHandler "+ aRefresh); 
                    if (aRefresh == null) throw new Error("error parsing login page");
                    
                    mainObject.m_HttpComms.setURI(aRefresh[1]);
                    mainObject.m_HttpComms.setRequestMethod("GET");
                    var bResult = mainObject.m_HttpComms.send(mainObject.loginOnloadHandler);   
                    if (!bResult) throw new Error("httpConnection returned false");
                    mainObject.m_iStage++;
                break;
               
                case 3:
                    var szLocation = httpChannel.URI.spec;
                    var iIndex = szLocation.search("uilogin.srt");
                    mainObject.m_Log.Write("Hotmail-SR-SMTP - loginOnloadHandler - page check : " + szLocation 
                                                        + " index = " +  iIndex );
                    if (iIndex != -1) throw new Error("error logging in ");
                    
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
            
             mainObject.serverComms("502 negative vibes\r\n");
        }
    },
    
    
    rawMSG : function ( szFrom, aszTo, szEmail)
    {
        try
        {
            this.m_Log.Write("Hotmail-SR-SMTP.js - rawMSG - START"); 
            
            
            if (!this.m_Email.parse(szEmail))
                throw new Error ("Parse Failed")
             
            this.aszTo = aszTo;
            this.szFrom = szFrom;
            this.m_iAttCount = this.m_Email.attachments.length;
            this.m_iAttUploaded = 0;
        
            this.m_iStage=0;
            this.m_HttpComms.clean();
            var szUri = this.m_szLocationURI + this.m_szComposer + this.m_szUM;
            this.m_HttpComms.setURI(szUri);
            this.m_HttpComms.setRequestMethod("GET");
            var bResult = this.m_HttpComms.send(this.composerOnloadHandler);      
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
            
            this.serverComms("502 negative vibes\r\n");
            return false;
        } 
    },
    
    
    
    composerOnloadHandler : function(szResponse ,event , mainObject)
    {
        try
        {
            mainObject.m_Log.Write("Hotmail-SR-SMTP.js - composerOnloadHandler - START"); 
            mainObject.m_Log.Write("Hotmail-SR-SMTP.js - composerOnloadHandler : " + mainObject.m_iStage );  
            
            var httpChannel = event.QueryInterface(Components.interfaces.nsIHttpChannel);
            mainObject.m_Log.Write("Hotmail-SR-SMTP.js - composerOnloadHandler - status :" +httpChannel.responseStatus );
           
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
                                                                              
                        if (szName.search(/^to$/i)!=-1) 
                        {
                            var szTo = mainObject.m_Email.headers.getTo();
                            szValue = szTo? szTo:"";
                        }
                        else if (szName.search(/^cc$/i)!=-1) 
                        {
                            var szCc = mainObject.m_Email.headers.getCc();
                            szValue = szCc? szCc:"";
                        }
                        else if (szName.search(/^bcc$/i)!=-1) 
                        {
                            var szTo = mainObject.m_Email.headers.getTo();
                            var szCc = mainObject.m_Email.headers.getCc();
                            var szBcc = mainObject.getBcc(szTo, szCc);
                            szValue = szBcc? szBcc:"";
                        }
                        else if (szName.search(/subject/i)!=-1)
                        {   
                            var szSubject = mainObject.m_Email.headers.getSubject(); 
                            szValue = szSubject? encodeURIComponent(szSubject) : "%20";
                        }
                        else if (szName.search(/outgoing/i)!=-1)
                        {
                            szValue = mainObject.m_bSaveCopy? "on":"off";
                        }
                        else if (szName.search(/_HMaction/i)!=-1) 
                            szValue = "Send";
                        
                        mainObject.m_HttpComms.addValuePair(szName,szValue);
                    }
                    
                    var szTxtBody = mainObject.m_Email.body.getBody(0);
                    mainObject.m_HttpComms.addValuePair("body",encodeURIComponent(szTxtBody));
                    mainObject.m_HttpComms.setRequestMethod("POST");
                    var bResult = mainObject.m_HttpComms.send(mainObject.composerOnloadHandler);      
                    if (!bResult) throw new Error("httpConnection returned false");
                    mainObject.m_iStage = 1;
                break;
                
                case 1: //MSG OK handler 
                    mainObject.m_Log.Write("Hotmail-SR-SMTP.js - composerOnloadHandler - MSG OK"); 
                    if (szResponse.search(patternHotmailAD)!=-1)
                        mainObject.serverComms("250 OK\r\n");    
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
                    
                    var bResult = mainObject.m_HttpComms.send(mainObject.composerOnloadHandler);      
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
                    
                    if (mainObject.m_iAttUploaded!= mainObject.m_iAttCount-1)
                        mainObject.m_iStage = 3;
                    else
                        mainObject.m_iStage = 0;
                                      
                    var szAction = szForm.match(patternHotmailSMTPAction)[1];
                    mainObject.m_HttpComms.setURI(szAction);
                    mainObject.m_HttpComms.setRequestMethod("POST");

                    var aInput = szForm.match(patternHotmailSMTPInput);
                    mainObject.m_Log.Write("Hotmail-SR-SMTP.js - composerOnloadHandler - INPUT " + aInput);
                    
                    for (i=0; i<aInput.length ; i++)
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
                       
                        if (i==0 && mainObject.m_iStage == 3) 
                            mainObject.m_HttpComms.addValuePair("","");
                        if (i==0 && mainObject.m_iStage == 0) 
                            mainObject.m_HttpComms.addValuePair("Attach.x","");
                        
                        if (szName.search(/^attfile$/i)!=-1)
                        { 
                            //headers
                            var oAttach = mainObject.m_Email.attachments[mainObject.m_iAttUploaded];
                            var szFileName = oAttach.headers.getContentType(4);
                            if (!szFileName) szFileName = "";
                            mainObject.m_Log.Write("Hotmail-SR-SMTP.js - composerOnloadHandler - Filename " + szFileName); 
                            var szEncoding = oAttach.headers.getEncoderType();
                                                      
                            //body
                            var szBody = oAttach.body.getBody(0);
                            if (szEncoding.search(/base64/i)!=-1)
                            {
                                mainObject.m_Log.Write("Hotmail-SR-SMTP.js - composerOnloadHandler - encoded B64"); 
                                var oBase64 = new base64();
                                szBody = oBase64.decode(szBody.replace(/\r\n/gm,""));
                                mainObject.m_HttpComms.addFile(szName, szFileName, true, szBody);
                            } 
                            else if (szEncoding.search(/quoted-printable/i)!=-1)
                            {
                                mainObject.m_Log.Write("Hotmail-SR-SMTP.js - composerOnloadHandler - encoded QP");  
                                var oQP = new QuotedPrintable();
                                szBody = oQP.decode(szBody);
                                mainObject.m_HttpComms.addFormData(szName, szFileName, false,szBody)   
                            }
                            else
                            {
                                mainObject.m_Log.Write("Hotmail-SR-SMTP.js - composerOnloadHandler - no encoding"); 
                                mainObject.m_HttpComms.addFile(szName, szFileName, false, szBody);
                            }
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
              
            mainObject.m_Log.Write("Hotmail-SR-SMTP.js - composerOnloadHandler - END");
        }
        catch(err)
        {
            mainObject.m_Log.DebugDump("Hotmail-SR-SMTP.js: composerOnloadHandler : Exception : " 
                                          + err.name 
                                          + ".\nError message: " 
                                          + err.message +"\n" +
                                            err.lineNumber);
                                            
            mainObject.serverComms("502 negative vibes\r\n");
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
                for (i=0; i<this.m_aszTo.length; i++)
                {
                    var regExp = new RegExp(this.m_aszTo[i]);
                    if (szAddress.search(regExp)==-1)
                    {    
                        szBcc? (szBcc += this.m_aszTo[i]) : (szBcc = this.m_aszTo[i]);
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
}
