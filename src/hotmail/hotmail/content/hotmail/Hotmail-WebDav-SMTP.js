function HotmailSMTPWebDav(oResponseStream, oLog, oPrefData)
{
    try
    {       
        var scriptLoader =  Components.classes["@mozilla.org/moz/jssubscript-loader;1"];
        scriptLoader = scriptLoader.getService(Components.interfaces.mozIJSSubScriptLoader);
        scriptLoader.loadSubScript("chrome://web-mail/content/common/DebugLog.js");
        scriptLoader.loadSubScript("chrome://web-mail/content/common/HttpComms2.js");
        scriptLoader.loadSubScript("chrome://hotmail/content/Hotmail-Prefs-Data.js");
                            
        this.m_Log = oLog; 
        this.m_Log.Write("HotmailWebDav.js - Constructor - START");   
        
        this.m_bAuthorised = false;        
        this.m_szUserName = null;
        this.m_szPassWord = null;
        this.m_oResponseStream = oResponseStream;       
        this.m_HttpComms = new HttpComms(this.m_Log); 
        this.m_HttpComms.setHandleHttpAuth(true);
        
        this.m_iStage=0; 
        this.m_szSendUri = null;
       
        this.m_IOS = Components.classes["@mozilla.org/network/io-service;1"];
        this.m_IOS = this.m_IOS.getService(Components.interfaces.nsIIOService);
        
        this.m_SessionManager = Components.classes["@mozilla.org/SessionManager;1"]
                                          .getService(Components.interfaces.nsISessionManager);
        this.m_SessionData = null;

      
        this.m_bReUseSession = oPrefData.bReUseSession;    //do i reuse the session
        this.m_bSaveCopy= oPrefData.bSaveCopy;          //do i save copy
      
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
            
            if (this.m_bReUseSession)
            {
                this.m_Log.Write("HotmailWebDav.js - logIN - Getting Seassion Data");
                this.m_SessionData = this.m_SessionManager.findSessionData(this.m_szUserName);
                if (this.m_SessionData)
                {
                    this.m_Log.Write("HotmailWebDav.js - logIN - Session Data found");
                    if (this.m_SessionData.oCookieManager)
                        this.m_HttpComms.setCookieManager(this.m_SessionData.oCookieManager);
                    
                    if (this.m_SessionData.oHttpAuthManager)
                        this.m_HttpComms.setHttpAuthManager(this.m_SessionData.oHttpAuthManager); 
                }
            }
            
            this.m_HttpComms.setUserName(this.m_szUserName);
            this.m_HttpComms.setPassword(this.m_szPassWord);
            this.m_HttpComms.setContentType("text/xml");
            this.m_HttpComms.setURI("http://oe.hotmail.com/svcs/hotmail/httpmail.asp");
            this.m_HttpComms.setRequestMethod("PROPFIND");
            this.m_HttpComms.addData(HotmailSchema);
            var bResult = this.m_HttpComms.send(this.loginOnloadHandler, this);                             
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
            //mainObject.m_Log.Write("HotmailWD-SMTP.js - loginOnloadHandler : \n" + szResponse);
            mainObject.m_Log.Write("HotmailWD-SMTP.js - loginOnloadHandler : " + mainObject.m_iStage);  
            
            var httpChannel = event.QueryInterface(Components.interfaces.nsIHttpChannel);
            
            //if this fails we've gone somewhere new
            mainObject.m_Log.Write("HotmailWD-SMTP.js - loginOnloadHandler - status :" +httpChannel.responseStatus );
           
            if (httpChannel.responseStatus != 200 && httpChannel.responseStatus != 207 ) 
                throw new Error("return status " + httpChannel.responseStatus);
            
            mainObject.m_iStage++;
            mainObject.m_Log.Write("HotmailWD-SMTP.js - loginOnloadHandler - get url - start");
            mainObject.m_iAuth=0; //reset login counter
           
            mainObject.m_szSendUri = szResponse.match(patternHotmailSendMsg)[1];
            mainObject.m_Log.Write("HotmailWD-SMTP.js - loginOnloadHandler - Send URi - " +mainObject.m_szSendUri);
            
            //server response
            mainObject.serverComms("235 Your In\r\n");
            mainObject.m_bAuthorised = true;
            
            mainObject.m_Log.Write("HotmailWD-SMTP.js - loginOnloadHandler - END");
        }
        catch(err)
        {
            mainObject.m_Log.DebugDump("HotmailWD-SMTP.js: loginHandler : Exception : " 
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
            
            this.m_HttpComms.setContentType("message/rfc821");
            this.m_HttpComms.setURI(this.m_szSendUri);
            this.m_HttpComms.setRequestMethod("POST");
            this.m_HttpComms.addRequestHeader("SAVEINSENT", this.m_bSaveCopy?"t":"f", false); 
            this.m_HttpComms.addData(szMsg);
            var bResult = this.m_HttpComms.send(this.composerOnloadHandler,this);  
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
                                                
            this.serverComms("502 negative vibes from " + mainObject.m_szUserName + "\r\n");
            
            return false;
        }
    },
     
     
    
    
    composerOnloadHandler : function(szResponse ,event , mainObject)
    {
        try
        {
            mainObject.m_Log.Write("HotmailWD-SMTP.js - composerOnloadHandler - START");
            //mainObject.m_Log.Write("HotmailWD-SMTP.js - composerOnloadHandler : \n" + szResponse); 
            mainObject.m_Log.Write("HotmailWD-SMTP.js - composerOnloadHandler : " + mainObject.m_iStage);  
            
            var httpChannel = event.QueryInterface(Components.interfaces.nsIHttpChannel);
            
            //if this fails we've gone somewhere new
            mainObject.m_Log.Write("HotmailWD-SMTP.js - composerOnloadHandler - status :" +httpChannel.responseStatus );
            if (httpChannel.responseStatus <=199 || httpChannel.responseStatus >=300) 
            {
                mainObject.serverComms("502 Error Sending Email\r\n");  
            }
            else
            {
                if (mainObject.m_bReUseSession)
                {
                    mainObject.m_Log.Write("nsHotmailIMAP.js - loginOnloadHandler - Save Session Data");
                    if (!mainObject.m_SessionData)
                    {
                        mainObject.m_SessionData = Components.classes["@mozilla.org/SessionData;1"].createInstance();
                        mainObject.m_SessionData.QueryInterface(Components.interfaces.nsISessionData);
                        mainObject.m_SessionData.szUserName = mainObject.m_szUserName;    
                    }
                    mainObject.m_SessionData.oCookieManager = mainObject.m_HttpComms.getCookieManager();
                    mainObject.m_SessionData.oHttpAuthManager = mainObject.m_HttpComms.getHttpAuthManager();
                    mainObject.m_SessionManager.setSessionData(mainObject.m_SessionData);  
                }
                
                mainObject.serverComms("250 OK\r\n");       
            }
            mainObject.m_Log.Write("HotmailWD-SMTP.js - composerOnloadHandler - END");
        }
        catch(err)
        {
            mainObject.m_Log.DebugDump("HotmailWD-SMTP.js: composerOnloadHandler : Exception : " 
                                          + err.name 
                                          + ".\nError message: " 
                                          + err.message +"\n" +
                                            err.lineNumber);
                                            
            mainObject.serverComms("502 negative vibes from " + mainObject.m_szUserName + "\r\n");
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
