function HotmailSMTPWebDav(oResponseStream, oLog, bSaveCopy)
{
    try
    {       
        var scriptLoader =  Components.classes["@mozilla.org/moz/jssubscript-loader;1"];
        scriptLoader = scriptLoader.getService(Components.interfaces.mozIJSSubScriptLoader);
        scriptLoader.loadSubScript("chrome://web-mail/content/common/DebugLog.js");
        scriptLoader.loadSubScript("chrome://hotmail/content/Hotmail-AuthTokenManager.js");
        scriptLoader.loadSubScript("chrome://web-mail/content/common/comms.js");
                    
        this.m_Log = oLog; 
        this.m_Log.Write("HotmailWebDav.js - Constructor - START");   
        
        this.m_bAuthorised = false;        
        this.m_szUserName = null;
        this.m_szPassWord = null;
        this.m_oResponseStream = oResponseStream;       
        this.m_HttpComms = new Comms(this,this.m_Log); 
        this.m_HttpComms.setHandleBounce(false);
        this.m_AuthToken = new AuthTokenHandler(this.m_Log);
        this.m_bSaveCopy =  bSaveCopy;
        
        this.m_iStage=0; 
        this.m_szSendUri = null;
       
        this.m_IOS = Components.classes["@mozilla.org/network/io-service;1"];
        this.m_IOS = this.m_IOS.getService(Components.interfaces.nsIIOService);
        
        this.m_bJunkMail = false;
        
        this.m_Log.Write("HotmailWD-SMTP.js - Constructor - END");  
    }
    catch(e)
    {
        DebugDump("HotmailWD-SMTP.js: Constructor : Exception : " 
                                      + e.name 
                                      + " line " 
                                      + e.linenumber
                                      + ".\nError message: " 
                                      + e.message);
    }
}


HotmailSMTPWebDav.prototype =
{
   
    logIn : function(szUserName, szPassWord)
    {
        try
        {
            this.m_Log.Write("HotmailWD-SMTP.js - logIN - START");   
            this.m_Log.Write("HotmailWD-SMTP.js - logIN - Username: " + szUserName 
                                                   + " Password: " + szPassWord 
                                                   + " stream: " + this.m_oResponseStream);
            this.m_szUserName = szUserName;
            this.m_szPassWord = szPassWord;
            
            if (!this.m_szUserName || !this.m_oResponseStream || !this.m_szPassWord) return false;
            
            this.m_iStage= 0;
            this.m_HttpComms.clean();
            this.m_HttpComms.setContentType(-1);
            this.m_HttpComms.setURI("http://services.msn.com/svcs/hotmail/httpmail.asp");
            this.m_HttpComms.setRequestMethod("PROPFIND");
            this.m_HttpComms.addData(HotmailSMTPSchema,"text/xml");
            var bResult = this.m_HttpComms.send(this.loginOnloadHandler);                             
            if (!bResult) throw new Error("httpConnection returned false");
                        
            this.m_Log.Write("HotmailWD-SMTP.js - logIN - END");    
            return bResult;
        }
        catch(e)
        {
            this.m_Log.DebugDump("HotmailWD-SMTP.js: logIN : Exception : " 
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
            mainObject.m_Log.Write("HotmailWD-SMTP.js - loginOnloadHandler - START"); 
            mainObject.m_Log.Write("HotmailWD-SMTP.js - loginOnloadHandler : " + mainObject.m_iStage);  
            
            var httpChannel = event.QueryInterface(Components.interfaces.nsIHttpChannel);
            
            //if this fails we've gone somewhere new
            mainObject.m_Log.Write("HotmailWD-SMTP.js - loginOnloadHandler - status :" +httpChannel.responseStatus );
           
            if (httpChannel.responseStatus != 200 && 
                    httpChannel.responseStatus != 207 &&
                        httpChannel.responseStatus != 302  &&
                            httpChannel.responseStatus != 401) 
                throw new Error("return status " + httpChannel.responseStatus);
            
            mainObject.m_HttpComms.clean();
            
            //bounce handler
            if ( httpChannel.responseStatus == 302)
            {
                var szLocation = null;
                try
                {
                    szLocation =  httpChannel.getResponseHeader("Location");
                    mainObject.m_Log.Write("HotmailWD-SMTP.js - loginOnloadHandler - location \n" + szLocation);  
                }
                catch(e)
                {
                    throw new Error("Location header not found")
                } 
            
                mainObject.m_HttpComms.setContentType(-1);
                mainObject.m_HttpComms.setURI(szLocation);
                mainObject.m_HttpComms.setRequestMethod("PROPFIND");
                mainObject.m_HttpComms.addData(HotmailSMTPSchema,"text/xml");
                var bResult = mainObject.m_HttpComms.send(mainObject.loginOnloadHandler);                             
                if (!bResult) throw new Error("httpConnection returned false");
            }
            //Authenticate
            else if  (httpChannel.responseStatus == 401)
            {
                mainObject.m_iStage++;
                var szURL = mainObject.m_IOS.newURI(httpChannel.URI.spec,null,null).prePath;
                var aszHost = szURL.match(patternHotmailSMTPSRuri); 
                
                try
                {
                    var szAuthenticate =  httpChannel.getResponseHeader("www-Authenticate");
                    mainObject.m_Log.Write("HotmailWD-SMTP.js - loginOnloadHandler - www-Authenticate " + szAuthenticate);                      
                }
                catch(err)
                {
                     mainObject.m_Log.DebugDump("HotmailWD-SMTP.js: loginHandler  Authenitcation: Exception : " 
                                                      + err.name 
                                                      + ".\nError message: " 
                                                      + err.message+ "\n"
                                                      + err.lineNumber);
                                                      
                    throw new Error("szAuthenticate header not found")
                }     
                    
                //basic or digest
                if (szAuthenticate.search(/basic/i)!= -1)
                {//authentication on the cheap
                    throw new Error("unspported authentication method");
                }
                else if (szAuthenticate.search(/digest/i)!= -1)
                {   
                    //get realm
                    var szRealm = szAuthenticate.match(/realm="(.*?)"/)[1];
                    mainObject.m_AuthToken.addToken(szRealm, 
                                                    szAuthenticate , 
                                                    httpChannel.URI.path ,
                                                    mainObject.m_szUserName, 
                                                    mainObject.m_szPassWord);
                                                    
                    var szAuthString = mainObject.m_AuthToken.findToken(szRealm);
                    
                    mainObject.m_HttpComms.setContentType(-1);
                    mainObject.m_HttpComms.setURI(httpChannel.URI.spec);
                    mainObject.m_HttpComms.addRequestHeader("Authorization", szAuthString , false);
                    mainObject.m_HttpComms.setRequestMethod("PROPFIND");
                    mainObject.m_HttpComms.addData(HotmailSMTPSchema,"text/xml");
                    var bResult = mainObject.m_HttpComms.send(mainObject.loginOnloadHandler);                             
                    if (!bResult) throw new Error("httpConnection returned false");
               }
                else
                    throw new Error("unknown authentication method");
            } 
            else //everything else
            {
                mainObject.m_iStage++;
                mainObject.m_Log.Write("HotmailWD-SMTP.js - loginOnloadHandler - get url - start");
                mainObject.m_iAuth=0; //reset login counter
               
                mainObject.m_szSendUri = szResponse.match(HotmailSendMsgPattern)[1];
                mainObject.m_Log.Write("HotmailWD-SMTP.js - loginOnloadHandler - Send URi - " +mainObject.m_szSendUri);
                
                //server response
                mainObject.serverComms("235 Your In\r\n");
                mainObject.m_bAuthorised = true;
                        
                mainObject.m_Log.Write("HotmailWD-SMTP.js - loginOnloadHandler - get url - end"); 
            }
            mainObject.m_Log.Write("HotmailWD-SMTP.js - loginOnloadHandler - END");
        }
        catch(err)
        {
            mainObject.m_Log.DebugDump("HotmailWD-SMTP.js: loginHandler : Exception : " 
                                          + err.name 
                                          + ".\nError message: " 
                                          + err.message+ "\n"
                                          + err.lineNumber);
            
            mainObject.serverComms("-ERR webdav error\r\n");
        }
    },
    
    
        
    rawMSG : function ( szFrom, aszTo, szEmail)
    {
        try
        {
            this.m_Log.Write("HotmailWD-SMTP.js - rawMSG - START");   
                
            this.m_iStage = 0;
            
            var szMsg = "MAIL FROM:<"+szFrom+">\r\n";
            
            for (i=0; i< aszTo.length; i++)
            {
                szMsg +="RCPT TO:<"+aszTo[i]+">\r\n";
            }
            szMsg +="\r\n";
            szMsg += szEmail.match(/(^[\s\S]*)\r?\n\./)[1];//removes SMTP termiator
            szMsg +="\r\n\r\n";
            
            this.m_HttpComms.clean();
            this.m_HttpComms.setContentType(-1);
            this.m_HttpComms.setURI(this.m_szSendUri);
            this.m_HttpComms.setRequestMethod("POST");
            this.m_HttpComms.addRequestHeader("SAVEINSENT", this.m_bSaveCopy?"t":"f", false); 
            this.m_HttpComms.addData(szMsg,"message/rfc821");
            
            var szURL = this.m_IOS.newURI(this.m_szSendUri,null,null).prePath;
            var aszRealm = szURL.match(patternHotmailSMTPSRuri); 
            var szAuthString = this.m_AuthToken.findToken(aszRealm);
                          
            this.m_HttpComms.addRequestHeader("Authorization", szAuthString , false);  
            var bResult = this.m_HttpComms.send(this.composerOnloadHandler);  
            if (!bResult) throw new Error("httpConnection returned false");
            
            this.m_Log.Write("HotmailWD-SMTP.js - rawMSG - END");    
            return true;
        }
        catch(err)
        {
            this.m_Log.DebugDump("HotmailWD-SMTP.js: rawMSG : Exception : " 
                                              + err.name + 
                                              ".\nError message: " 
                                              + err.message +"\n" +
                                                err.lineNumber);
                                                
            this.serverComms("502 negative vibes\r\n");
            
            return false;
        }
    },
     
     
    
    
    composerOnloadHandler : function(szResponse ,event , mainObject)
    {
        try
        {
            mainObject.m_Log.Write("HotmailWD-SMTP.js - composerOnloadHandler - START"); 
            mainObject.m_Log.Write("HotmailWD-SMTP.js - composerOnloadHandler : " + mainObject.m_iStage);  
            
            var httpChannel = event.QueryInterface(Components.interfaces.nsIHttpChannel);
            
            //if this fails we've gone somewhere new
            mainObject.m_Log.Write("HotmailWD-SMTP.js - composerOnloadHandler - status :" +httpChannel.responseStatus );
            if (httpChannel.responseStatus <=199 || httpChannel.responseStatus >=300) 
                mainObject.serverComms("502 Error Sending Email\r\n");  
             
            mainObject.serverComms("250 OK\r\n");       
            mainObject.m_Log.Write("HotmailWD-SMTP.js - composerOnloadHandler - END");
        }
        catch(err)
        {
            mainObject.m_Log.DebugDump("HotmailWD-SMTP.js: composerOnloadHandler : Exception : " 
                                          + err.name 
                                          + ".\nError message: " 
                                          + err.message +"\n" +
                                            err.lineNumber);
                                            
            mainObject.serverComms("502 negative vibes\r\n");
        }
    },
    
     
     
    serverComms : function (szMsg)
    {
        try
        { 
            this.m_Log.Write("HotmailWD-SMTP.js - serverComms - START");
            this.m_Log.Write("HotmailWD-SMTP.js - serverComms msg " + szMsg);
            var iCount = this.m_oResponseStream.write(szMsg,szMsg.length);
            this.m_Log.Write("HotmailWD-SMTP.js - serverComms sent count: " + iCount 
                                                        +" msg length: " +szMsg.length);
            this.m_Log.Write("HotmailWD-SMTP.js - serverComms - END");  
        }
        catch(e)
        {
            this.m_Log.DebugDump("HotmailWD-SMTP.js: serverComms : Exception : " 
                                              + e.name 
                                              + ".\nError message: " 
                                              + e.message+ "\n"
                                              + e.lineNumber);
        }
    },   
}
