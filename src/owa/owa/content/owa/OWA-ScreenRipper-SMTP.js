function OWASMTPScreenRipper(oResponseStream, oLog, oPrefData)
{
    try
    {
        var scriptLoader =  Components.classes["@mozilla.org/moz/jssubscript-loader;1"]
                                      .getService(Components.interfaces.mozIJSSubScriptLoader);
        scriptLoader.loadSubScript("chrome://web-mail/content/common/DebugLog.js");
        scriptLoader.loadSubScript("chrome://web-mail/content/common/CommonPrefs.js");
        scriptLoader.loadSubScript("chrome://web-mail/content/common/HttpComms3.js");
        scriptLoader.loadSubScript("chrome://web-mail/content/common/Email.js");

        this.m_Log = oLog;
        this.m_Log.Write("OWA-SMTP-SR.js - Constructor - START");
        this.m_oResponseStream = oResponseStream;

        this.m_DomainManager =  Components.classes["@mozilla.org/OWADomains;1"]
                                          .getService()
                                          .QueryInterface(Components.interfaces.nsIOWADomains);       
        this.m_bAuthorised = false;
        this.m_szUserName = null;
        this.m_szPassWord = null;
        this.m_HttpComms = new HttpComms(this.m_Log);
        this.m_aszTo = new Array();
        this.m_szFrom = null;
        this.m_iStage = 0;
        this.m_szBaseURL = null;
        this.m_szMailBox = null;
        this.m_bAttHandled = false;
        this.m_iAttCount = 0;
        this.m_Email = new email(this.m_Log);
        this.m_Email.decodeBody(true);
        
        this.m_bLoginWithDomain = oPrefData.bLoginWithDomain;
        this.m_bReUseSession = oPrefData.bReUseSession;
                        
        this.m_Log.Write("OWA-SMTP-SR.js - Constructor - END");
    }
    catch(e)
    {
        DebugDump("OWA-SMTP-SR.js: Constructor : Exception : "
                                      + e.name
                                      + ".\nError message: "
                                      + e.message +"\n" +
                                      e.lineNumber);
    }
}




OWASMTPScreenRipper.prototype =
{
    logIn : function(szUserName, szPassWord)
    {
        try
        {
            this.m_Log.Write("OWA-SMTP-SR.js - logIN - START");
            this.m_Log.Write("OWA-SMTP-SR.js - logIN - Username: " + szUserName
                                                   + " Password: " + szPassWord
                                                   + " stream: " + this.m_oResponseStream);

            this.m_szUserName = szUserName;
            this.m_szPassWord = szPassWord;

            if (!this.m_szUserName || !this.m_oResponseStream || !this.m_szPassWord) return false;
            var szDomain = this.m_szUserName.match(/.*?@(.*?)$/)[1].toLowerCase();
            var szURL = this.m_DomainManager.getURL(szDomain);
            this.m_HttpComms.setURI(szURL);
            this.m_HttpComms.setRequestMethod("GET");
            var bResult = this.m_HttpComms.send(this.loginOnloadHandler, this);
            if (!bResult) throw new Error("httpConnection returned false");

            this.m_iStage = 0;
                        
            this.m_Log.Write("OWA-SMTP-SR.js - logIN - END");
            return true;
        }
        catch(e)
        {
            this.m_Log.DebugDump("OWA-SMTP-SR.js: logIN : Exception : "
                                              + e.name +
                                              ".\nError message: "
                                              + e.message +"\n"
                                              + e.lineNumber);

            this.serverComms("502 negative vibes from " +this.m_szUserName +"\r\n");

            return false;
        }
    },


    loginOnloadHandler : function(szResponse ,event , mainObject)
    {
        try
        {
            mainObject.m_Log.Write("OWA-SMTP-SR.js - loginOnloadHandler - START");
            mainObject.m_Log.Write("OWA-SMTP-SR.js - loginOnloadHandler : " + mainObject.m_iStage );

            var httpChannel = event.QueryInterface(Components.interfaces.nsIHttpChannel);
            var szLocation = httpChannel.URI.spec;
            mainObject.m_Log.Write("OWA-SMTP-SR - loginOnloadHandler - szLocation :" +szLocation);
            
            //if this fails we've gone somewhere new
            mainObject.m_Log.Write("OWA-SMTP-SR.js - loginOnloadHandler - status :" +httpChannel.responseStatus );
            if (httpChannel.responseStatus != 200 && httpChannel.responseStatus != 207)
                throw new Error("return status " + httpChannel.responseStatus);


            switch(mainObject.m_iStage)
            {
                case 0: //login form
                    var szAction = szResponse.match(kOWAAction)[1];            
                    mainObject.m_Log.Write("OWA-SMTP-SR - loginOnloadHandler - szAction :" +szAction);
                    var szURL =""; 
                    if (szAction.search(/^\//) == -1)
                    {
                        var IOService = Components.classes["@mozilla.org/network/io-service;1"]
                                                  .getService(Components.interfaces.nsIIOService);
                        var nsIURI = IOService.newURI(httpChannel.URI.spec, null, null)
                                              .QueryInterface(Components.interfaces.nsIURL);
                        var szDirectory = nsIURI.directory
                        mainObject.m_Log.Write("OWA-SMTP-SR - loginOnloadHandler - directory : " +szDirectory);
                        
                        szURL = httpChannel.URI.prePath + szDirectory + szAction
                    }
                    else
                    {
                        szURL = httpChannel.URI.prePath + szAction
                    }
                    mainObject.m_Log.Write("OWA-SMTP-SR - loginOnloadHandler - szURL :" +szURL);
        
                    var szForm = szResponse.match(kOWAForm)[1];
                    mainObject.m_Log.Write("OWA-SMTP-SR - loginOnloadHandler - szForm :" +szForm);
                    
                    var aszInput = szForm.match(kOWAInput);
                    
                    for (var i =0 ; i<aszInput.length; i++)
                    {
                        mainObject.m_Log.Write("OWA-SMTP-SR - loginOnloadHandler - aszInput :" +aszInput[i]);
                        
                        if (aszInput[i].search(/submit/i)==-1 && aszInput[i].search(/button/i)==-1 
                                && aszInput[i].search(/radio/i) == -1 && aszInput[i].search(/check/i) == -1)
                        { 
                            var szName = aszInput[i].match(kOWAName)[1];
                            
                            var szValue = "";
                            if (aszInput[i].search(/value/i)!=-1) szValue = aszInput[i].match(kOWAValue)[1];
                            
                            if (szName.search(/username/i) != -1) 
                            {
                                if (mainObject.m_bLoginWithDomain == true)
                                    szValue = mainObject.m_szUserName.toLowerCase();
                                else
                                    szValue = mainObject.m_szUserName.match(/(.*?)@/)[1].toLowerCase();
                                szValue = encodeURIComponent(szValue);
                            }
                            else if (szName.search(/password/i) != -1) 
                            {
                                szValue = mainObject.m_szPassWord;
                                szValue = encodeURIComponent(szValue);
                            }
                            
                            mainObject.m_HttpComms.addValuePair(szName,szValue);
                        }                
                    }
                    
                    mainObject.m_HttpComms.addValuePair("rdoPublic",0);
                    
                    mainObject.m_HttpComms.setURI(szURL);
                    mainObject.m_HttpComms.setRequestMethod("POST");
                    mainObject.m_iStage ++;
                    var bResult = mainObject.m_HttpComms.send(mainObject.loginOnloadHandler, mainObject);
                    if (!bResult) throw new Error("httpConnection returned false");
                break;
                
                
                case 1: //get base URL
                    mainObject.m_szBaseURL = szResponse.match(kBaseURL)[1];            
                    mainObject.m_Log.Write("OWA-SMTP-SR - loginOnloadHandler - m_szBaseURL :" +mainObject.m_szBaseURL);
                    
                    var szMailBox = szResponse.match(kMailBoxURL)[1];  
                    mainObject.m_szMailBox = mainObject.m_szBaseURL + szMailBox         
                    mainObject.m_Log.Write("OWA-SMTP-SR - loginOnloadHandler - m_szMailBox :" +mainObject.m_szMailBox);

                    //server response
                    mainObject.serverComms("235 Your In\r\n");
                    mainObject.m_bAuthorised = true;
                break;
            }

            mainObject.m_Log.Write("OWA-SMTP-SR.js - loginOnloadHandler - END");
        }
        catch(err)
        {
            mainObject.m_Log.DebugDump("OWA-SMTP-SR.js: loginHandler : Exception : "
                                          + err.name
                                          + ".\nError message: "
                                          + err.message +"\n" +
                                            err.lineNumber);
            mainObject.serverComms("502 negative vibes from " +mainObject.m_szUserName +"\r\n");
        }
    },


    rawMSG : function ( szFrom, aszTo, szEmail)
    {
        try
        {
            this.m_Log.Write("OWA-SMTP-SR.js - rawMSG - START");
            this.m_Log.Write("OWA-SMTP-SR.js - rawMSG " + szEmail);

            if (!this.m_Email.parse(szEmail)) throw new Error ("Parse Failed")  
            
            if (!this.m_Email.txtBody) 
            {
                var strBundleService = Components.classes["@mozilla.org/intl/stringbundle;1"]
                                                 .getService(Components.interfaces.nsIStringBundleService);
                var stringBundle = strBundleService.createBundle("chrome://owa/locale/OWA-SMTP.properties");                                 

                var szError = stringBundle.GetStringFromName("HtmlError");

                this.serverComms("502 "+ szError + "\r\n");
                return false;
            }
                       
            this.m_iStage = 0;
            var szURL = this.m_szBaseURL + "?cmd=new";
            this.m_HttpComms.setURI(szURL);
            this.m_HttpComms.setRequestMethod("GET");
            var bResult = this.m_HttpComms.send(this.composerOnloadHandler, this);
            if (!bResult) throw new Error("httpConnection returned false");
            
            this.m_Log.Write("OWA-SMTP-SR.js - rawMSG - END");
            return true;
        }
        catch(err)
        {
            this.m_Log.DebugDump("OWA-SMTP-SR.js: rawMSG : Exception : "
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
            mainObject.m_Log.Write("OWA-SMTP-SR.js - composerOnloadHandler - START");
            mainObject.m_Log.Write("OWA-SMTP-SR.js - composerOnloadHandler : " + mainObject.m_iStage);

            var httpChannel = event.QueryInterface(Components.interfaces.nsIHttpChannel);            
            var szLocation  = httpChannel.URI.spec;
            mainObject.m_Log.Write("OWA-SMTP-SR.js - composerOnloadHandler - szLocation " + szLocation);
                     
            switch(mainObject.m_iStage)
            {
                case 0:  //send message
                    mainObject.m_Log.Write("OWA-SMTP-SR.js - composerOnloadHandler - send message");
                    var szAction = szResponse.match(kOWAAction)[1];            
                    mainObject.m_Log.Write("OWA-SMTP-SR - composerOnloadHandler - szAction :" +szAction);
                
                    var szForm = szResponse.match(kOWAForm)[1];
                    mainObject.m_Log.Write("OWA-SMTP-SR - composerOnloadHandler - szForm :" +szForm);
                            
                    var aszInput = szForm.match(kOWAInput);
                            
                    for (var i = 0; i < aszInput.length; i++) 
                    {
                        mainObject.m_Log.Write("OWA-SMTP-SR - composerOnloadHandler - aszInput :" + aszInput[i]);
                        
                        var szName = aszInput[i].match(kOWAName)[1];
                        var szValue = "";
                        try 
                        {
                            szValue = aszInput[i].match(kOWAValue)[1];
                        } 
                        catch (err) 
                        {
                        }
                        
                        if (szName.search(/MsgTo/i) != -1) 
                        {
                            szValue = mainObject.m_Email.headers.getTo();
                            
                        }
                        else if (szName.search(/MsgCc/i) != -1) 
                        {
                            var szCc = mainObject.m_Email.headers.getCc();
                            szValue = szCc ? szCc : "";
                        }
                        else if (szName.search(/MsgBcc/i) != -1) 
                        {
                            var szTo = mainObject.m_Email.headers.getTo();
                            var szCc = mainObject.m_Email.headers.getCc();
                            var szBCC = mainObject.getBcc(szTo, szCc);
                            szValue = szBCC ? szBCC : "";
                        }
                        else if (szName.search(/subject/i) != -1) 
                        {
                            var szSubject = mainObject.m_Email.headers.getSubject();
                            szValue = szSubject ? szSubject : "";
                        }
                        else if (szName.search(/^cmd$/i) != -1) 
                        {
                            if (mainObject.m_Email.attachments.length >0)
                                szValue = "editattach";
                            else
                                szValue = "SEND";  
                        }
                        
                        mainObject.m_HttpComms.addValuePair(encodeURIComponent(szName), 
                                                            encodeURIComponent(szValue));
                    }
                    
                    //email body
                    var szValue = encodeURIComponent(mainObject.m_Email.txtBody.body.getBody());
                    var szName = encodeURIComponent("urn:schemas:httpmail:textdescription")
                    mainObject.m_HttpComms.addValuePair(szName, szValue);
                    
                    mainObject.m_bAttHandled = true;
                    mainObject.m_HttpComms.addRequestHeader("Referer", szLocation, true);
                    mainObject.m_HttpComms.setURI(szAction);
                    mainObject.m_HttpComms.setRequestMethod("POST");
                    if (mainObject.m_Email.attachments.length >0)
                        mainObject.m_iStage =2;
                    else    
                        mainObject.m_iStage =1;
                    var bResult = mainObject.m_HttpComms.send(mainObject.composerOnloadHandler, mainObject);
                    if (!bResult) throw new Error("httpConnection returned false");
                break;
                
                
                case 1:
                    mainObject.serverComms("250 OK\r\n"); //message sent
                break;     
                
                                            
                case 2: //upload attachment
                    mainObject.m_Log.Write("OWA-SMTP-SR.js - composerOnloadHandler - upload attachment");
                    if (szResponse.search(kOWAAttchForm)==-1)
                    {
                        mainObject.m_Log.Write("OWA-SMTP-SR.js - composerOnloadHandler - attach check failed");
                        mainObject.serverComms("502 Error Sending Email\r\n");
                        return;
                    }
                                        
                    if (mainObject.m_iAttCount >= mainObject.m_Email.attachments.length) 
                    {
                        mainObject.m_Log.Write("OWA-SMTP-SR.js - composerOnloadHandler - Done uploading attachment");
                        var szURL = szResponse.match(kOWAEdit)[1]; 
                        szURL = szURL.replace(/^\.\//,"");  //clean up url        
                       
                        if (!mainObject.m_HttpComms.setURI(szURL)) 
                        {
                            if (szResponse.search(kOWABase)!=-1)
                            {
                                var szBase =  szResponse.match(kOWABase)[1];
                                mainObject.m_Log.Write("OWA-SMTP-SR - composerOnloadHandler - szBase :" + szBase);
                                mainObject.m_HttpComms.setURI(szBase + szURL);                              
                            }
                            else
                                mainObject.m_HttpComms.setURI(mainObject.m_szBaseURL + szURL);
                        }
                        mainObject.m_HttpComms.addRequestHeader("Referer", szLocation, true);
                        mainObject.m_HttpComms.setRequestMethod("GET");
                        mainObject.m_iStage = 3;
                        var bResult = mainObject.m_HttpComms.send(mainObject.composerOnloadHandler, mainObject);
                        if (!bResult) throw new Error("httpConnection returned false");
                    }
                    else 
                    {
                        mainObject.m_Log.Write("OWA-SMTP-SR.js - composerOnloadHandler - uploading file");
                        var szForm = szResponse.match(kOWAAttchForm);
                        mainObject.m_Log.Write("OWA-SMTP-SR - composerOnloadHandler - szForm :" + szForm);
                        
                        var szAction = szForm[0].match(kOWAAction2)[1];
                        szAction = szAction.replace(/^\.\//,"");  //clean up url        
                        mainObject.m_Log.Write("OWA-SMTP-SR - composerOnloadHandler - szAction :" + szAction);
                        
                        if (!mainObject.m_HttpComms.setURI(szAction)) 
                        {
                            if (szResponse.search(kOWABase)!=-1)
                            {
                                var szBase =  szResponse.match(kOWABase)[1];
                                mainObject.m_Log.Write("OWA-SMTP-SR - composerOnloadHandler - szBase :" + szBase);
                                mainObject.m_HttpComms.setURI(szBase + szAction);                              
                            }
                            else
                                mainObject.m_HttpComms.setURI(mainObject.m_szBaseURL + szAction);
                        }
                        
                        var aszInput = szForm[0].match(kOWAInput);
                        for (var i = 0; i < aszInput.length; i++) 
                        {
                            mainObject.m_Log.Write("OWA-SMTP-SR - composerOnloadHandler - aszInput :" + aszInput[i]);
                            
                            if (aszInput[i].search(kOWAName)!= -1) 
                            {
                                var szName = aszInput[i].match(kOWAName)[1];
                                var szValue = "";
                                try 
                                {
                                    szValue = aszInput[i].match(kOWAValue)[1];
                                } 
                                catch (err) 
                                {
                                }
                                
                                if (szName.search(/^attachFile/i) != -1) 
                                {
                                    var oAttach = mainObject.m_Email.attachments[mainObject.m_iAttCount];
                                    var szFileName = oAttach.headers.getContentType(4);
                                    if (!szFileName) szFileName = "";
                                    
                                    //body
                                    var szBody = oAttach.body.getBody();
                                    mainObject.m_HttpComms.addFile(szName, szFileName, szBody);
                                    mainObject.m_iAttCount++;
                                }
                            }
                        }
                        
                        mainObject.m_iStage = 2;
                        mainObject.m_HttpComms.addRequestHeader("Referer", szLocation, true);
                        mainObject.m_HttpComms.setRequestMethod("POST");
                        mainObject.m_HttpComms.setContentType("multipart/form-data");
                        var bResult = mainObject.m_HttpComms.send(mainObject.composerOnloadHandler, mainObject);
                        if (!bResult) throw new Error("httpConnection returned false");
                    }
                break;        
                
                
                case 3:  //send message
                    mainObject.m_Log.Write("OWA-SMTP-SR.js - composerOnloadHandler - send message");
                    var szAction = szResponse.match(kOWAAction)[1];            
                    mainObject.m_Log.Write("OWA-SMTP-SR - composerOnloadHandler - szAction :" +szAction);
                
                    var szForm = szResponse.match(kOWAForm)[1];
                    mainObject.m_Log.Write("OWA-SMTP-SR - composerOnloadHandler - szForm :" +szForm);
                            
                    var aszInput = szForm.match(kOWAInput);
                            
                    for (var i = 0; i < aszInput.length; i++) 
                    {
                        mainObject.m_Log.Write("OWA-SMTP-SR - composerOnloadHandler - aszInput :" + aszInput[i]);
                        
                        var szName = aszInput[i].match(kOWAName)[1];
                        var szValue = "";
                        try 
                        {
                            szValue = aszInput[i].match(kOWAValue)[1];
                        } 
                        catch (err) 
                        {
                        }
                        
                        if (szName.search(/^cmd$/i) != -1) szValue = "SEND";
                        
                        mainObject.m_HttpComms.addValuePair(encodeURIComponent(szName), 
                                                            encodeURIComponent(szValue));
                    }
                    
                    mainObject.m_HttpComms.addRequestHeader("Referer", szLocation, true);
                    mainObject.m_HttpComms.setURI(szAction);
                    mainObject.m_HttpComms.setRequestMethod("POST");
                    mainObject.m_iStage =1;
                    var bResult = mainObject.m_HttpComms.send(mainObject.composerOnloadHandler, mainObject);
                    if (!bResult) throw new Error("httpConnection returned false");
                break;               
            }

            mainObject.m_Log.Write("OWA-SMTP-SR.js - composerOnloadHandler - END");
        }
        catch(err)
        {
            mainObject.m_Log.DebugDump("OWA-SMTP-SR.js: composerOnloadHandler : Exception : "
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
            this.m_Log.Write("OWA-SMTP-SR.js - getBcc - START");
            if (this.m_aszTo.length==0) return null;
            this.m_Log.Write("OWA-SMTP-SR.js - getBcc - szRcptList " + this.m_aszTo);

            var szBcc = null;
            var szAddress = null;
            if (szTo) szAddress = szTo;
            if (szCc) szAddress = (szTo ? (szAddress + ","+ szCc) : szCc);
            this.m_Log.Write("OWA-SMTP-SR.js - getBcc - szAddress " + szAddress);

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
            this.m_Log.Write("OWA-SMTP-SR.js - getBcc szBcc- " + szBcc);

            this.m_Log.Write("OWA-SMTP-SR.js - getBcc - End");
            return szBcc;
        }
        catch(err)
        {
            this.m_Log.DebugDump("OWA-SMTP-SR.js: getBcc : Exception : "
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
            this.m_Log.Write("OWA-SMTP-SR.js - serverComms - START");
            this.m_Log.Write("OWA-SMTP-SR.js - serverComms msg " + szMsg);
            var iCount = this.m_oResponseStream.write(szMsg,szMsg.length);
            this.m_Log.Write("OWA-SMTP-SR.js - serverOWA sent count: " + iCount
                                                        +" msg length: " +szMsg.length);
            this.m_Log.Write("OWA-SMTP-SR.js - serverComms - END");
        }
        catch(e)
        {
            this.m_Log.DebugDump("OWA-SMTP-SR.js: serverComms : Exception : "
                                              + e.name
                                              + ".\nError message: "
                                              + e.message +"\n" +
                                                e.lineNumber);
        }
    }
}
