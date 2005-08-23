function HotmailSMTPScreenRipper(oResponseStream, oLog, bSaveCopy)
{
    try
    {       
        var scriptLoader = Components.classes["@mozilla.org/moz/jssubscript-loader;1"];
        scriptLoader = scriptLoader.getService(Components.interfaces.mozIJSSubScriptLoader);
        scriptLoader.loadSubScript("chrome://web-mail/content/common/DebugLog.js");
        scriptLoader.loadSubScript("chrome://web-mail/content/common/comms.js");
               
        this.m_Log = oLog; 
                
        this.m_Log.Write("Hotmail-SR-SMTP - Constructor - START");   
       
        this.m_szUserName = null;   
        this.m_szPassWord =null; 
        this.m_oResponseStream = oResponseStream;  
        this.m_bSaveCopy =  bSaveCopy;
        this.m_HttpComms = new Comms(this,this.m_Log);   
               
        this.m_iStage = 0;  
                                                     
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
                    var aBounceData = szResponse.match(patternHotmailPOPSRBounce);
                    mainObject.m_Log.Write("Hotmail-SR-SMTP - loginOnloadHandler "+ aBounceData);
                    
                    if (!aBounceData)
                    {
                        aBounceData = szResponse.match(patternHotmailPOPSRBounceAlt);
                        mainObject.m_Log.Write("Hotmail-SR-SMTP - loginOnloadHandler "+ aBounceData);
                        if (!aBounceData)
                            throw new Error("error parsing bounce web page");
                        else
                        {   
                            var  szValue = encodeURIComponent(aBounceData[2]);
                            mainObject.m_HttpComms.addValuePair("mspppostint", szValue);
                        }
                    }
                    else
                    {
                        mainObject.m_HttpComms.addValuePair("mspprawqs",aBounceData[2]);
                        mainObject.m_HttpComms.addValuePair("mspppostint",aBounceData[3]);
                    }
                  
                    mainObject.m_HttpComms.setURI(aBounceData[1]);
                    mainObject.m_HttpComms.setRequestMethod("POST");
                    var bResult = mainObject.m_HttpComms.send(mainObject.loginOnloadHandler);   
                    if (!bResult) throw new Error("httpConnection returned false");
                    mainObject.m_iStage++;
                break;
                
                
                case 1: //login
                    var aLogInURL = szResponse.match(patternHotmailPOPSRLogIn);
                    if (!aLogInURL) 
                    {   
                        aLogInURL = szResponse.match(patternHotmailPOPSRLogInAlt); 
                        if (!aLogInURL) throw new Error("error parsing login page");
                        
                        //get form data
                        var aszForm =  szResponse.match(patternHotmailPOPSRForm); 
                        mainObject.m_Log.Write("nsHotmail.js - loginOnloadHandler - form data " + aszForm);
                        
                        for (i=0; i<aszForm.length; i++)
                        {
                            var szType = aszForm[i].match(patternHotmailPOPSRType)[1]; 
                            mainObject.m_Log.Write("nsHotmail.js - loginOnloadHandler - form type " + szType);
                            var szName = aszForm[i].match(patternHotmailPOPSRName)[1]; 
                            mainObject.m_Log.Write("nsHotmail.js - loginOnloadHandler - form name " + szName);
                            var szValue = aszForm[i].match(patternHotmailPOPSRValue)[1]; 
                            mainObject.m_Log.Write("nsHotmail.js - loginOnloadHandler - form value " + szValue);
                            
                            if (szType.search(/submit/i)==-1)
                            {
                                if (szType.search(/radio/i)!=-1)
                                {
                                    if (aszForm[i].search(/checked/i)!=-1)
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
                    }
                    else
                    {
                        mainObject.m_HttpComms.addValuePair("notinframe","1");
                        var szUser = encodeURIComponent(mainObject.m_szUserName);
                        mainObject.m_HttpComms.addValuePair("login",szUser);
                        var szPass = encodeURIComponent(mainObject.m_szPassWord);
                        mainObject.m_HttpComms.addValuePair("passwd",szPass);
                        mainObject.m_HttpComms.addValuePair("submit1","+Sign+In+");
                    }
                                        
                    mainObject.m_HttpComms.setURI(aLogInURL[1]);
                    mainObject.m_HttpComms.setRequestMethod("POST");
                    var bResult = mainObject.m_HttpComms.send(mainObject.loginOnloadHandler);                   
                    if (!bResult) throw new Error("httpConnection returned false");
                    mainObject.m_iStage++;
                break;
               
                case 2: //refresh
                    var aRefresh = szResponse.match(patternHotmailPOPSRRefresh);
                    if (!aRefresh)
                        aRefresh = szResponse.match(patternHotmailPOPJavaRefresh);
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
                    mainObject.m_szLocationURI = httpChannel.URI.prePath ;
                    mainObject.m_Log.Write("Hotmail-SR-SMTP - loginOnloadHandler - m_szLocationURI : "+mainObject.m_szLocationURI );
                   
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
        }
        catch(err)
        {
        } 
    },
    
    
    
    composerOnloadHandler : function(szResponse ,event , mainObject)
    {
        try
        {
            mainObject.m_Log.Write("nsLycosSMTP.js - composerOnloadHandler - START"); 
            mainObject.m_Log.Write("nsLycosSMTP.js - composerOnloadHandler : " + mainObject.m_iStage + "\n");  
            
            var httpChannel = event.QueryInterface(Components.interfaces.nsIHttpChannel);
            
            //if this fails we've gone somewhere new
            mainObject.m_Log.Write("nsLycosSMTP.js - composerOnloadHandler - status :" +httpChannel.responseStatus );
            if (httpChannel.responseStatus != 200) 
                mainObject.serverComms("502 Error Sending Email\r\n");  
             
            mainObject.serverComms("250 OK\r\n");       
            mainObject.m_Log.Write("nsLycosSMTP.js - composerOnloadHandler - END");
        }
        catch(err)
        {
            mainObject.m_Log.DebugDump("nsLycosSMTP.js: composerOnloadHandler : Exception : " 
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
