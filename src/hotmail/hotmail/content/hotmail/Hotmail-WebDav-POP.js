function HotmailWebDav(oResponseStream, oLog, bUseJunkMail)
{
    try
    {       
        var scriptLoader =  Components.classes["@mozilla.org/moz/jssubscript-loader;1"];
        scriptLoader = scriptLoader.getService(Components.interfaces.mozIJSSubScriptLoader);
        scriptLoader.loadSubScript("chrome://web-mail/content/common/DebugLog.js");
        scriptLoader.loadSubScript("chrome://hotmail/content/Hotmail-AuthTokenManager.js");
        scriptLoader.loadSubScript("chrome://web-mail/content/common/comms.js");
        scriptLoader.loadSubScript("chrome://hotmail/content/Hotmail-MSG.js");
              
        this.m_Log = oLog; 
        this.m_Log.Write("HotmailWebDav.js - Constructor - START");   
                
        this.m_szUserName = null;   
        this.m_szPassWord = null; 
        this.m_oResponseStream = oResponseStream;       
        this.m_bUseJunkMail = bUseJunkMail;
        this.m_HttpComms = new Comms(this,this.m_Log); 
        this.m_HttpComms.setHandleBounce(false);
        this.m_AuthToken = new AuthTokenHandler(this.m_Log);
        this.m_iStage=0; 
        this.m_szInBoxURI= null;
        this.m_szJunkMailURI = null;
        this.m_szFolderURI = null;
        this.m_szTrashURI=null;
        this.m_szMsgID = null;
        this.m_aMsgDataStore = new Array();
        this.m_iTotalSize = 0;
        this.m_szMSG = null;
      
        this.m_IOS = Components.classes["@mozilla.org/network/io-service;1"];
        this.m_IOS = this.m_IOS.getService(Components.interfaces.nsIIOService);
        
        this.m_bJunkMail = false;
        
        this.m_Log.Write("HotmailWebDav.js - Constructor - END");  
    }
    catch(e)
    {
        DebugDump("HotmailWebDav.js: Constructor : Exception : " 
                                      + e.name 
                                      + ".\nError message: " 
                                      + e.message + "\n"
                                      + e.lineNumber);
    }
}



HotmailWebDav.prototype =
{
   
    logIn : function(szUserName, szPassWord)
    {
        try
        {
            this.m_Log.Write("HotmailWebDav.js - logIN - START");   
            this.m_Log.Write("HotmailWebDav.js - logIN - Username: " + szUserName 
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
            this.m_HttpComms.addData(HotmailPOPSchema,"text/xml");
            var bResult = this.m_HttpComms.send(this.loginOnloadHandler);                             
            if (!bResult) throw new Error("httpConnection returned false");
                        
            this.m_Log.Write("HotmailWebDav.js - logIN - END");    
            return bResult;
        }
        catch(e)
        {
            this.m_Log.DebugDump("HotmailWebDav.js: logIN : Exception : " 
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
            mainObject.m_Log.Write("HotmailWebDav.js - loginOnloadHandler - START"); 
            mainObject.m_Log.Write("HotmailWebDav.js - loginOnloadHandler : " + mainObject.m_iStage);  
            
            var httpChannel = event.QueryInterface(Components.interfaces.nsIHttpChannel);
            
            //if this fails we've gone somewhere new
            mainObject.m_Log.Write("HotmailWebDav.js - loginOnloadHandler - status :" +httpChannel.responseStatus );
           
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
                    mainObject.m_Log.Write("HotmailWebDav.js - loginOnloadHandler - location \n" + szLocation);  
                }
                catch(e)
                {
                    throw new Error("Location header not found")
                } 
            
                mainObject.m_HttpComms.setContentType(-1);
                mainObject.m_HttpComms.setURI(szLocation);
                mainObject.m_HttpComms.setRequestMethod("PROPFIND");
                mainObject.m_HttpComms.addData(HotmailPOPSchema,"text/xml");
                var bResult = mainObject.m_HttpComms.send(mainObject.loginOnloadHandler);                             
                if (!bResult) throw new Error("httpConnection returned false");
            }
            //Authenticate
            else if  (httpChannel.responseStatus == 401)
            {
                mainObject.m_iStage++;
                var szURL = mainObject.m_IOS.newURI(httpChannel.URI.spec,null,null).prePath;
                var aszHost = szURL.match(patternHotmailPOPSRuri); 
                
                try
                {
                    var szAuthenticate =  httpChannel.getResponseHeader("www-Authenticate");
                    mainObject.m_Log.Write("HotmailWebDav.js - loginOnloadHandler - www-Authenticate " + szAuthenticate);                      
                }
                catch(err)
                {
                     mainObject.m_Log.DebugDump("HotmailWebDav.js: loginHandler  Authenitcation: Exception : " 
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
                    mainObject.m_HttpComms.addData(HotmailPOPSchema,"text/xml");
                    var bResult = mainObject.m_HttpComms.send(mainObject.loginOnloadHandler);                             
                    if (!bResult) throw new Error("httpConnection returned false");
               }
                else
                    throw new Error("unknown authentication method");
            } 
            else //everything else
            {
                mainObject.m_iStage++;
                mainObject.m_Log.Write("HotmailWebDav.js - loginOnloadHandler - get url - start");
                mainObject.m_iAuth=0; //reset login counter
                mainObject.m_szFolderURI = szResponse.match(patternHotmailPOPFolder)[1];
                mainObject.m_Log.Write("HotmailWebDav.js - loginOnloadHandler - get folder url - " + mainObject.m_szFolderURI);
                mainObject.m_szTrashURI = szResponse.match(patternHotmailPOPTrash)[1];
                mainObject.m_Log.Write("HotmailWebDav.js - loginOnloadHandler - get trash url - " + mainObject.m_szTrashURI);
                
                //server response
                mainObject.serverComms("+OK Your in\r\n");
                mainObject.m_bAuthorised = true;
                        
                mainObject.m_Log.Write("HotmailWebDav.js - loginOnloadHandler - get url - end"); 
            }
            mainObject.m_Log.Write("HotmailWebDav.js - loginOnloadHandler - END");
        }
        catch(err)
        {
            mainObject.m_Log.DebugDump("HotmailWebDav.js: loginHandler : Exception : " 
                                          + err.name 
                                          + ".\nError message: " 
                                          + err.message+ "\n"
                                          + err.lineNumber);
            
            mainObject.serverComms("-ERR negative vibes from " +mainObject.m_szUserName+ "\r\n");
        }
    },
    
        
 
    
    //stat 
    //total size is in octets
    getNumMessages : function()
    {
        try
        {
            this.m_Log.Write("HotmailWebDav.js - getNumMessages - START"); 
            
            this.m_iStage=0;
             
            if (this.m_szFolderURI == null) return false;
            this.m_Log.Write("HotmailWebDav.js - getNumMessages - mail box url " + this.m_szFolderURI); 
                       
            //Auth  
            var szURL = this.m_IOS.newURI(this.m_szFolderURI,null,null).prePath;
            var aszRealm = szURL.match(patternHotmailPOPSRuri); 
            var szAuthString = this.m_AuthToken.findToken(aszRealm);
            this.m_Log.Write("HotmailWebDav.js - getNumMessages - Auth " + szAuthString);                   
            
            this.m_HttpComms.clean();
            this.m_HttpComms.setContentType(-1);
            this.m_HttpComms.setURI(this.m_szFolderURI);
            this.m_HttpComms.setRequestMethod("PROPFIND");
            this.m_HttpComms.addData(HotmailPOPFolderSchema,"text/xml");
            this.m_HttpComms.addRequestHeader("Authorization", szAuthString , false);
            var bResult = this.m_HttpComms.send(this.mailBoxOnloadHandler);                             
            if (!bResult) throw new Error("httpConnection returned false");
           
            this.m_Log.Write("HotmailWebDav.js - getNumMessages - END"); 
            return true;
        }
        catch(e)
        {
            this.m_Log.DebugDump("HotmailWebDav.js: getNumMessages : Exception : " 
                                          + e.name 
                                          + ".\nError message: " 
                                          + e.message+ "\n"
                                          + e.lineNumber);
            return false;
        }
    },
    
    
    
    
    mailBoxOnloadHandler : function (szResponse ,event , mainObject)
    {
        try
        {
            mainObject.m_Log.Write("HotmailWebDav.js - mailBoxOnloadHandler - START"); 
            mainObject.m_Log.Write("HotmailWebDav.js - mailBoxOnloadHandler : " + mainObject.m_iStage);  
            
            var httpChannel = event.QueryInterface(Components.interfaces.nsIHttpChannel);
            mainObject.m_Log.Write("HotmailWebDav - mailBoxOnloadHandler - status :" +httpChannel.responseStatus );
            
            if (httpChannel.responseStatus != 200 && httpChannel.responseStatus != 207) 
                throw new Error("return status " + httpChannel.responseStatus);
            
            mainObject.m_HttpComms.clean();
                             
            switch(mainObject.m_iStage)
            {
                case 0:  //get inbox and junkmail uri
                    mainObject.m_Log.Write("HotmailWebDav.js - mailBoxOnloadHandler - get folder list - START");         
                    mainObject.m_szInBoxURI = szResponse.match(patternHotmailPOPinboxFolder)[1];//in box
                    mainObject.m_Log.Write("HotmailWebDav.js - mailBoxOnloadHandler - inBox - " + mainObject.m_szInBoxURI);
                    mainObject.m_szJunkMailURI = szResponse.match(patternHotmailPOPTrashFolder)[1];
                    mainObject.m_Log.Write("HotmailWebDav.js - mailBoxOnloadHandler - junkmail - " + mainObject.m_szJunkMailURI);
                     
                    //Auth 
                    var szURL = mainObject.m_IOS.newURI(mainObject.m_szInBoxURI,null,null).prePath;
                    var aszRealm = szURL.match(patternHotmailPOPSRuri); 
                    mainObject.m_Log.Write("HotmailWebDav.js - getNumMessages - realm " + aszRealm); 
                    var szAuthString = mainObject.m_AuthToken.findToken(aszRealm);
                    mainObject.m_Log.Write("HotmailWebDav.js - getNumMessages - Auth " + szAuthString);                   
                   
                    //load mail box               
                    mainObject.m_HttpComms.setContentType(-1);
                    mainObject.m_HttpComms.setURI(mainObject.m_szInBoxURI);
                    mainObject.m_HttpComms.setRequestMethod("PROPFIND");
                    mainObject.m_HttpComms.addData(HotmailPOPMailSchema,"text/xml");
                    mainObject.m_HttpComms.addRequestHeader("Authorization", szAuthString , false);
                    var bResult = mainObject.m_HttpComms.send(mainObject.mailBoxOnloadHandler);                             
                    if (!bResult) throw new Error("httpConnection returned false");          
                  
                    mainObject.m_iStage++;  
                    mainObject.m_Log.Write("HotmailWebDav.js - mailBoxOnloadHandler - get folder list - end"); 
                break;
                    
                    
                case 1: //get inbox and junkmail 
                    mainObject.m_Log.Write("HotmailWebDav.js - mailBoxOnloadHandler - inbox/Junk mail uri- start");
                    
                    var aszResponses = szResponse.match(patternHotmailPOPResponse);
                    mainObject.m_Log.Write("HotmailWebDav.js - mailBoxOnloadHandler - inbox - \n" + aszResponses);
                    if (aszResponses)
                    {
                        for (i=0; i<aszResponses.length; i++)
                        {
                            //mail url   
                            var oMSG = new HotmailMSG();
                            var szHref = aszResponses[i].match(patternHotmailPOPHref)[1];
                            mainObject.m_Log.Write("HotmailWebDav.js - mailBoxOnloadHandler - href - "+ szHref);
                            oMSG.szMSGUri = szHref;
                            oMSG.bJunkFolder = mainObject.m_bJunkMail;                          
                            //size 
                            var iSize = parseInt(aszResponses[i].match(patternHotmailPOPSize)[1]);
                            mainObject.m_Log.Write("HotmailWebDav.js - mailBoxOnloadHandler - size - "+ iSize);
                            mainObject.m_iTotalSize += iSize;
                            oMSG.iSize = iSize;
                           
                            mainObject.m_aMsgDataStore.push(oMSG); 
                        }
                    }
                    
                    if (mainObject.m_bUseJunkMail && !mainObject.m_bJunkMail)
                    {
                        //load junkmail
                        
                        //Auth 
                        var szURL = mainObject.m_IOS.newURI(mainObject.m_szJunkMailURI,null,null).prePath;
                        var aszRealm = szURL.match(patternHotmailPOPSRuri); 
                        mainObject.m_Log.Write("HotmailWebDav.js - getNumMessages - realm " + aszRealm); 
                        var szAuthString = mainObject.m_AuthToken.findToken(aszRealm);
                        mainObject.m_Log.Write("HotmailWebDav.js - getNumMessages - Auth " + szAuthString);                   
                        
                        mainObject.m_HttpComms.setContentType(-1);
                        mainObject.m_HttpComms.setURI(mainObject.m_szJunkMailURI);
                        mainObject.m_HttpComms.setRequestMethod("PROPFIND");
                        mainObject.m_HttpComms.addData(HotmailPOPMailSchema,"text/xml");
                        mainObject.m_HttpComms.addRequestHeader("Authorization", szAuthString , false);
                        var bResult = mainObject.m_HttpComms.send(mainObject.mailBoxOnloadHandler);                             
                        if (!bResult) throw new Error("httpConnection returned false");
                        mainObject.m_bJunkMail = true;
                    }
                    else
                    {
                        //server response
                        mainObject.serverComms("+OK "+ mainObject.m_aMsgDataStore.length + " " + mainObject.m_iTotalSize + "\r\n");
                    }
                    
                    mainObject.m_Log.Write("HotmailWebDav.js - mailBoxOnloadHandler - inbox mail uri - end");
                break;
            }                
             
            mainObject.m_Log.Write("HotmailWebDav.js - mailBoxOnloadHandler - END"); 
            return true;
        }
        catch(e)
        {
            mainObject.m_Log.DebugDump("HotmailWebDav.js: getMessageSizes : Exception : " 
                                              + e.name 
                                              + ".\nError message: " 
                                              + e.message+ "\n"
                                              + e.lineNumber);
                                              
            mainObject.serverComms("-ERR negative vibes from " +mainObject.m_szUserName+ "\r\n");
            return false;
        }
    },
    
    
    
    //list
    getMessageSizes : function()
    {
        try
        {
            this.m_Log.Write("HotmailWebDav.js - getMessageSizes - START"); 
           
            var szPOPResponse = "+OK " + this.m_aMsgDataStore.length + " Messages\r\n"; 
           
            for (i = 0; i < this.m_aMsgDataStore.length; i++)
            {
                var iSize = this.m_aMsgDataStore[i].iSize;
                this.m_Log.Write("HotmailWebDav.js - getMessageSizes - Email Size : " +iSize);
                
                szPOPResponse+=(i+1) + " " + iSize + "\r\n"; 
            }         
            szPOPResponse += ".\r\n";
            
            this.serverComms(szPOPResponse);
                         
            this.m_Log.Write("HotmailWebDav.js - getMessageSizes - END"); 
            return true;
        }
        catch(e)
        {
            this.m_Log.DebugDump("HotmailWebDav.js: getMessageSizes : Exception : " 
                                              + e.name 
                                              + ".\nError message: " 
                                              + e.message+ "\n"
                                              + e.lineNumber);
            return false;
        }
    },
      


     //IUDL
    getMessageIDs : function()
    {
        try
        {
            this.m_Log.Write("HotmailWebDav.js - getMessageIDs - START"); 
      
            var szPOPResponse = "+OK " + this.m_aMsgDataStore.length + " Messages\r\n";
            for (i = 0; i <  this.m_aMsgDataStore.length; i++)
            {
                var szURL = this.m_aMsgDataStore[i].szMSGUri;
                this.m_Log.Write("HotmailWebDav.js - getMessageIDs - Email URL : " +szURL);
               
                var szID = szURL.match(patternHotmailPOPMSGID);
                this.m_Log.Write("HotmailWebDav.js - getMessageIDs - IDS : " +szID);    
                szPOPResponse+=(i+1) + " " + szID + "\r\n";   
            }         
     
            szPOPResponse += ".\r\n";
            this.serverComms(szPOPResponse);           
                               
            this.m_Log.Write("HotmailWebDav.js - getMessage - END"); 
            return true;
        }
        catch(e)
        {
             this.m_Log.DebugDump("HotmailWebDav.js: getMessageIDs : Exception : " 
                                          + e.name + 
                                          ".\nError message: " 
                                          + e.message+ "\n"
                                          + e.lineNumber);
            return false;
        }
    },    
    
    
    
    //top
    getMessageHeaders : function(lID)
    {
        try
        {
            this.m_Log.Write("HotmailWebDav.js - getHeaders - START");  
            this.m_Log.Write("HotmailWebDav.js - getHeaders - id " + lID ); 
            
            this.serverComms("-ERR negative vibes\r\n"); 
            
            this.m_Log.Write("HotmailWebDav.js - getHeaders - END");
            return true; 
        }
        catch(err)
        {
            this.m_Log.DebugDump("HotmailWebDav.js: getHeaders : Exception : " 
                                          + e.name + 
                                          ".\nError message: " 
                                          + e.message+ "\n"
                                          + e.lineNumber);
            return false;
        }
    },
    
    
    getMessage : function( lID)
    {
        try
        {
            this.m_Log.Write("HotmailWebDav.js - getMessage - START"); 
            this.m_Log.Write("HotmailWebDav.js - getMessage - msg num" + lID);
            this.m_iStage=0;
                                  
            //get msg id
            var oMSG = this.m_aMsgDataStore[lID-1];
            var szMsgID = oMSG.szMSGUri;
            this.m_Log.Write("HotmailWebDav.js - getMessage - msg id" + szMsgID); 
                      
            //Auth 
            var szURL = this.m_IOS.newURI(szMsgID,null,null).prePath;
            var aszRealm = szURL.match(patternHotmailPOPSRuri); 
            var szAuthString = this.m_AuthToken.findToken(aszRealm);
            this.m_Log.Write("HotmailWebDav.js - getMessages - Auth " + szAuthString);                   
            
            this.m_bJunkMail = oMSG.bJunkFolder;
            
            //get email
            this.m_HttpComms.clean();
            this.m_HttpComms.setContentType(-1);
            this.m_HttpComms.setURI(szMsgID);
            this.m_HttpComms.setRequestMethod("GET");
            this.m_HttpComms.addRequestHeader("Authorization", szAuthString , false);
            var bResult = this.m_HttpComms.send(this.emailOnloadHandler);                             
            if (!bResult) throw new Error("httpConnection returned false");
            this.m_iStage=0; 
                                         
            this.m_Log.Write("HotmailWebDav.js - getMessage - END"); 
            return true;
        }
        catch(e)
        {
             this.m_Log.DebugDump("HotmailWebDav.js: getMessage : Exception : " 
                                          + e.name + 
                                          ".\nError message: " 
                                          + e.message+ "\n"
                                          + e.lineNumber);
            return false;
        }
    },    
    
    emailOnloadHandler : function (szResponse ,event , mainObject)
    {
        try
        {
            mainObject.m_Log.Write("HotmailWebDav.js - emailOnloadHandler - START"); 
            mainObject.m_Log.Write("HotmailWebDav.js - emailOnloadHandler : " + mainObject.m_iStage);  
                        
            var httpChannel = event.QueryInterface(Components.interfaces.nsIHttpChannel);
            mainObject.m_Log.Write("HotmailWebDav - emailOnloadHandler - status :" +httpChannel.responseStatus );
            
            if (httpChannel.responseStatus != 200) 
                throw new Error("return status " + httpChannel.responseStatus);
            
            switch(mainObject.m_iStage)
            {   
                case 0:  //send msg to TB
                    //email
                    mainObject.m_szMSG = "X-WebMail: true\r\n";
                    mainObject.m_szMSG += "X-JunkFolder: " +(mainObject.m_bJunkMail? "true":"false")+ "\r\n";
                    mainObject.m_szMSG +=szResponse;
                    mainObject.m_szMSG = mainObject.m_szMSG.replace(/^\./mg,"..");    //bit padding 
                    mainObject.m_szMSG += "\r\n.\r\n";//msg end 
                    
                    //mark email as read        
                    mainObject.m_HttpComms.clean();
                    mainObject.m_HttpComms.setContentType(-1);
                    var szUri = httpChannel.URI.spec;
                    mainObject.m_HttpComms.setURI(szUri);
                    mainObject.m_HttpComms.setRequestMethod("PROPPATCH");
                    mainObject.m_HttpComms.addData(HotmailPOPReadSchema,"text/xml");
                    
                    var aszRealm = szUri.match(patternHotmailPOPSRuri); 
                    var szAuthString = mainObject.m_AuthToken.findToken(aszRealm);
                    mainObject.m_Log.Write("HotmailWebDav.js - getMessages - Auth " + szAuthString); 
                    mainObject.m_HttpComms.addRequestHeader("Authorization", szAuthString , false);
                    
                    var bResult = mainObject.m_HttpComms.send(mainObject.emailOnloadHandler);          
                    mainObject.m_iStage++;          
                break;
                
                case 1:// mark msg as read                                                                                                   
                    mainObject.m_Log.Write("HotmailWebDav.js - emailOnloadHandler -email mark as read");     
                    var szPOPResponse = "+OK " +mainObject.m_szMSG.length + "\r\n";                     
                    szPOPResponse += mainObject.m_szMSG;
                    mainObject.serverComms(szPOPResponse);
                break;
            }
            mainObject.m_Log.Write("HotmailWebDav.js - emailOnloadHandler - end");  
        }
        catch(err)
        {
            mainObject.m_Log.DebugDump("HotmailWebDav.js: emailOnloadHandler : Exception : " 
                                          + err.name 
                                          + ".\nError message: " 
                                          + err.message+ "\n"
                                          + err.lineNumber);
            
            mainObject.serverComms("-ERR negative vibes from " +mainObject.m_szUserName+ "\r\n");
        }
    },
    


             
    //dele
    deleteMessage : function(lID)
    {
        try
        {
            this.m_Log.Write("HotmailWebDav.js - deleteMessage - START");  
            this.m_Log.Write("HotmailWebDav.js - deleteMessage - id " + lID ); 
                  
            //create URL
            var szPath = this.m_aMsgDataStore[lID-1].szMSGUri;
            this.m_Log.Write("HotmailWebDav.js - deleteMessage - id " + szPath );
                       
            var szURL = this.m_IOS.newURI(szPath,null,null).prePath;
                                     
            //Auth 
            var aszRealm = szURL.match(patternHotmailPOPSRuri); 
            var szAuthString = this.m_AuthToken.findToken(aszRealm);
            this.m_Log.Write("HotmailWebDav.js - getNumMessages - Auth " + szAuthString);                   
            
            this.m_iStage=0;      
            this.m_HttpComms.clean();
            this.m_HttpComms.setURI(szPath);
            this.m_HttpComms.setRequestMethod("MOVE");
            this.m_HttpComms.setContentType(-1);           
            var szMsgID =  szPath.match(patternHotmailPOPMSGID); 
            var szDestination= this.m_szTrashURI + szMsgID;
            this.m_Log.Write("HotmailWebDav.js - deleteMessage - Destination " + szDestination );
            this.m_HttpComms.addRequestHeader("Destination", szDestination , false);
            this.m_HttpComms.addRequestHeader("Authorization", this.m_szAuthString , false);
            var bResult = this.m_HttpComms.send(this.deleteMessageOnloadHandler);                             
            if (!bResult) throw new Error("httpConnection returned false");
                            
            this.m_Log.Write("HotmailWebDav.js - deleteMessage - END");     
            return true;
        }
        catch(e)
        {
            this.m_Log.DebugDump("HotmailWebDav.js: deleteMessage : Exception : " 
                                              + e.name + 
                                              ".\nError message: " 
                                              + e.message+ "\n"
                                              + e.lineNumber);
            return false;
        } 
    },

    
    deleteMessageOnloadHandler : function (szResponse ,event , mainObject)
    {
        try
        {
            mainObject.m_Log.Write("HotmailWebDav.js - deleteMessageOnload - START");    
            mainObject.m_Log.Write("HotmailWebDav.js - deleteMessageOnload : " + mainObject.m_iStage);  
            
            var httpChannel = event.QueryInterface(Components.interfaces.nsIHttpChannel);
            mainObject.m_Log.Write("HotmailWebDav - deleteMessageOnload - status :" +httpChannel.responseStatus );
            
            //if this fails we've gone somewhere new
            if (httpChannel.responseStatus != 201) 
                throw new Error("return status " + httpChannel.responseStatus);
            
            mainObject.serverComms("+OK its gone\r\n");   
            
            mainObject.m_Log.Write("HotmailWebDav.js - deleteMessageOnload - END");      
        }
        catch(e)
        {
            mainObject.m_Log.DebugDump("HotmailWebDav.js: deleteMessageOnload : Exception : " 
                                                      + e.name 
                                                      + ".\nError message: " 
                                                      + e.message+ "\n"
                                                      + e.lineNumber);
            mainObject.serverComms("-ERR negative vibes from " +mainObject.m_szUserName+ "\r\n");
        }
    },
    

    logOut : function()
    {
        try
        {
            this.m_Log.Write("HotmailWebDav.js - logOUT - START"); 
            
            this.m_bAuthorised = false;
            this.serverComms("+OK Your Out\r\n");             
                                           
            this.m_Log.Write("HotmailWebDav.js - logOUT - END");  
            return true;
        }
        catch(e)
        {
            this.m_Log.DebugDump("HotmailWebDav.js: logOUT : Exception : " 
                                      + e.name 
                                      + ".\nError message: " 
                                      + e.message+ "\n"
                                      + e.lineNumber);
            return false;
        }
    },  
    
     
   serverComms : function (szMsg)
    {
        try
        { 
            this.m_Log.Write("HotmailWebDav.js - serverComms - START");
            this.m_Log.Write("HotmailWebDav.js - serverComms msg " + szMsg);
            var iCount = this.m_oResponseStream.write(szMsg,szMsg.length);
            this.m_Log.Write("HotmailWebDav.js - serverComms sent count: " + iCount 
                                                        +" msg length: " +szMsg.length);
            this.m_Log.Write("HotmailWebDav.js - serverComms - END");  
        }
        catch(e)
        {
            this.m_Log.DebugDump("HotmailWebDav.js: serverComms : Exception : " 
                                              + e.name 
                                              + ".\nError message: " 
                                              + e.message+ "\n"
                                              + e.lineNumber);
        }
    },   
}
