function HotmailWebDav(parent)
{
    try
    {       
        var scriptLoader =  Components.classes["@mozilla.org/moz/jssubscript-loader;1"]
                              .getService(Components.interfaces.mozIJSSubScriptLoader);
        if (scriptLoader)
        {
            scriptLoader.loadSubScript("chrome://web-mail/content/common/DebugLog.js");
            scriptLoader.loadSubScript("chrome://web-mail/content/common/CookieManager.js");
            scriptLoader.loadSubScript("chrome://hotmail/content/Hotmail-AuthTokenManager.js");
        }
         
        this.m_HotmailLog = parent.m_HotmailLog; 
        
        this.m_HotmailLog.Write("HotmailWebDav.js - Constructor - START");   
       
        this.m_szUserName = parent.m_szUserName;   
        this.m_szPassWord = parent.m_szPassWord; 
        this.m_oResponseStream = parent.m_oResponseStream;       
        this.m_bUseJunkMail = parent.m_bUseJunkMail;
        this.m_Parent = parent;
        this.m_oCookies = new CookieHandler(this.m_HotmailLog); 
        this.m_AuthToken = new AuthTokenHandler(this.m_HotmailLog);
        this.m_iStage=0; 
        this.m_szInBoxURI= null;
        this.m_szJunkMailURI = null;
        this.m_szFolderURI = null;
        this.m_szTrashURI=null;
        this.m_aszMsgIDStore = new Array();
        this.m_aiMsgSize = new Array();
        this.m_iTotalSize = 0;
        this.m_szMsgID = null;
      
        this.m_HotmailLog.Write("HotmailWebDav.js - Constructor - END");  
    }
    catch(e)
    {
        DebugDump("HotmailWebDav.js: Constructor : Exception : " 
                                      + e.name 
                                      + " line " 
                                      + e.linenumber
                                      + ".\nError message: " 
                                      + e.message);
    }
}



HotmailWebDav.prototype =
{
   
    logIn : function()
    {
        try
        {
            this.m_HotmailLog.Write("HotmailWebDav.js - logIN - START");   
            this.m_HotmailLog.Write("HotmailWebDav.js - logIN - Username: " + this.m_szUserName 
                                                   + " Password: " + this.m_szPassWord 
                                                   + " stream: " + this.m_oResponseStream);
            
            if (!this.m_szUserName || !this.m_oResponseStream || !this.m_szPassWord) return false;
            
            this.m_iStage= 0;
            var bResult = this.httpConnection("http://services.msn.com/svcs/hotmail/httpmail.asp", 
                                              "PROPFIND", 
                                              null,
                                              HotmailPOPSchema,
                                              null, 
                                              this.loginOnloadHandler);         
           
            
            this.m_HotmailLog.Write("HotmailWebDav.js - logIN - END");    
            return bResult;
        }
        catch(e)
        {
            this.m_HotmailLog.DebugDump("HotmailWebDav.js: logIN : Exception : " 
                                              + e.name + 
                                              ".\nError message: " 
                                              + e.message);
            return false;
        }
    },


    loginOnloadHandler : function(szResponse ,event , mainObject)
    {
        try
        {
            mainObject.m_HotmailLog.Write("HotmailWebDav.js - loginOnloadHandler - START"); 
            
            mainObject.m_HotmailLog.Write("HotmailWebDav.js - loginOnloadHandler : " 
                                         + mainObject.m_iStage + "\n"
                                         + szResponse);  
            
            var httpChannel = event.QueryInterface(Components.interfaces.nsIHttpChannel);
            
            //if this fails we've gone somewhere new
            mainObject.m_HotmailLog.Write("HotmailWebDav.js - loginOnloadHandler - status :" +httpChannel.responseStatus );
           
            if (httpChannel.responseStatus != 200 
                    && httpChannel.responseStatus != 207 
                                && httpChannel.responseStatus != 302 
                                                 && httpChannel.responseStatus != 401) 
                throw new Error("return status " + httpChannel.responseStatus);
            
            var szPath = httpChannel.URI.spec;
            var szURL = httpChannel.URI.host;
            var szFolder = httpChannel.URI.path 
            mainObject.m_HotmailLog.Write("HotmailWebDav.js - loginOnloadHandler - url - " + szURL + " " + szPath + " " + szFolder );  
           
            var aszTempDomain = szURL.match(patternHotmailPOPSRuri);
            if (aszTempDomain.length==0)
                aszTempDomain = szURL.match(patternHotmailPOPWDuri);
                
            mainObject.m_HotmailLog.Write("HotmailWebDav.js - loginOnloadHandler - domain - " + aszTempDomain[0]); 
            
            //get cookies
            try
            {
                var szCookies =  httpChannel.getResponseHeader("Set-Cookie");
                mainObject.m_HotmailLog.Write("HotmailWebDav.js - loginOnloadHandler - received cookies \n" + szCookies);  
                mainObject.m_oCookies.addCookie( aszTempDomain[0], szCookies); 
            }
            catch(e)
            {
                mainObject.m_HotmailLog.Write("HotmailWebDav.js - loginOnloadHandler - no cookies found"); 
            } 
            
            var ios=Components.classes["@mozilla.org/network/io-service;1"].
                                    getService(Components.interfaces.nsIIOService);



            //bounce handler
            if ( httpChannel.responseStatus == 302)
            {
                mainObject.m_iStage++;
                try
                {
                    var szLocation =  httpChannel.getResponseHeader("Location");
                    mainObject.m_HotmailLog.Write("HotmailWebDav.js - loginOnloadHandler - location \n" + szLocation);  
                }
                catch(e)
                {
                    throw new Error("Location header not found")
                } 
            
                //set cookies
                var szURL = ios.newURI(szLocation,null,null).prePath;
                var aszHost = szURL.match(patternHotmailPOPSRuri);  
                               
                var aszCookie = mainObject.m_oCookies.findCookie(aszHost[0]);             
                var bResult = mainObject.httpConnection(szLocation, 
                                                        "PROPFIND",
                                                        null,
                                                        HotmailPOPSchema, 
                                                        aszCookie,
                                                        mainObject.loginOnloadHandler);
                                            
                if (!bResult) throw new Error("httpConnection returned false");
            }
            //Authenticate
            else if  (httpChannel.responseStatus == 401)
            {
                mainObject.m_iStage++;
                var szURL = ios.newURI(szPath,null,null).prePath;
                var aszHost = szURL.match(patternHotmailPOPSRuri); 
                
                try
                {
                    var szAuthenticate =  httpChannel.getResponseHeader("www-Authenticate");
                    mainObject.m_HotmailLog.Write("HotmailWebDav.js - loginOnloadHandler - www-Authenticate " + szAuthenticate);                      
                }
                catch(err)
                {
                     mainObject.m_HotmailLog.DebugDump("HotmailWebDav.js: loginHandler  Authenitcation: Exception : " 
                                                      + err.name 
                                                      + ".\nError message: " 
                                                      + err.message);
                                                      
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
                                                    szFolder,
                                                    mainObject.m_szUserName, 
                                                    mainObject.m_szPassWord);
                                                    
                    var szAuthString = mainObject.m_AuthToken.findToken(szRealm);
                    
                    var aszCookie = mainObject.m_oCookies.findCookie(aszHost[0]);
                    var bResult = mainObject.httpConnection(szPath, 
                                                            "PROPFIND", 
                                                            szAuthString,
                                                            HotmailPOPSchema, 
                                                            aszCookie,
                                                            mainObject.loginOnloadHandler);
                                        
                    if (!bResult) throw new Error("httpConnection returned false");
                }
                else
                    throw new Error("unknown authentication method");
            } 
            else //everything else
            {
                mainObject.m_iStage++;
                mainObject.m_HotmailLog.Write("HotmailWebDav.js - loginOnloadHandler - get url - start");
                mainObject.m_iAuth=0; //reset login counter
                mainObject.m_szFolderURI = szResponse.match(patternHotmailPOPFolder)[1];
                mainObject.m_HotmailLog.Write("HotmailWebDav.js - loginOnloadHandler - get folder url - " + mainObject.m_szFolderURI);
                mainObject.m_szTrashURI = szResponse.match(patternHotmailPOPTrash)[1];
                mainObject.m_HotmailLog.Write("HotmailWebDav.js - loginOnloadHandler - get trash url - " + mainObject.m_szTrashURI);
                
                //server response
                mainObject.serverComms("+OK Your in\r\n");
                mainObject.m_Parent.m_bAuthorised = true;
                        
                mainObject.m_HotmailLog.Write("HotmailWebDav.js - loginOnloadHandler - get url - end"); 
            }
            mainObject.m_HotmailLog.Write("HotmailWebDav.js - loginOnloadHandler - END");
        }
        catch(err)
        {
            mainObject.m_HotmailLog.DebugDump("HotmailWebDav.js: loginHandler : Exception : " 
                                          + err.name 
                                          + ".\nError message: " 
                                          + err.message);
            
            mainObject.serverComms("-ERR webdav error\r\n");
        }
    },
    
        
 
    
    //stat 
    //total size is in octets
    getNumMessages : function()
    {
        try
        {
            this.m_HotmailLog.Write("HotmailWebDav.js - getNumMessages - START"); 
            
            this.m_iStage=0;
             
            if (this.m_szFolderURI == null) return false;
            this.m_HotmailLog.Write("HotmailWebDav.js - getNumMessages - mail box url " + this.m_szFolderURI); 
            
            var ios=Components.classes["@mozilla.org/network/io-service;1"].
                                    getService(Components.interfaces.nsIIOService);
            var szURL = ios.newURI(this.m_szFolderURI,null,null).prePath;
            
            //Auth 
            var aszRealm = szURL.match(patternHotmailPOPSRuri); 
            var szAuthString = this.m_AuthToken.findToken(aszRealm);
            this.m_HotmailLog.Write("HotmailWebDav.js - getNumMessages - Auth " + szAuthString);                   
            
            //set cookies
            var aszCookie = this.m_oCookies.findCookie(aszRealm);
            this.m_HotmailLog.Write("HotmailWebDav.js - getNumMessages - cookies - "+ aszCookie);
                                                              
            var bResult = this.httpConnection(this.m_szFolderURI, 
                                              "PROPFIND", 
                                              szAuthString,
                                              HotmailPOPFolderSchema, 
                                              aszCookie, 
                                              this.mailBoxOnloadHandler);  
                                              
            if (!bResult) throw new Error("httpConnection returned false");
                    
            this.m_HotmailLog.Write("HotmailWebDav.js - getNumMessages - END"); 
            return true;
        }
        catch(e)
        {
            this.m_HotmailLog.DebugDump("HotmailWebDav.js: getNumMessages : Exception : " 
                                          + e.name 
                                          + ".\nError message: " 
                                          + e.message);
            return false;
        }
    },
    
    
    
    
    mailBoxOnloadHandler : function (szResponse ,event , mainObject)
    {
        try
        {
            mainObject.m_HotmailLog.Write("HotmailWebDav.js - mailBoxOnloadHandler - START"); 
            
            mainObject.m_HotmailLog.Write("HotmailWebDav.js - mailBoxOnloadHandler : " 
                                         + mainObject.m_iStage + "\n"
                                         + szResponse);  
            
            var httpChannel = event.QueryInterface(Components.interfaces.nsIHttpChannel);
             
            mainObject.m_HotmailLog.Write("HotmailWebDav - mailBoxOnloadHandler - status :" +httpChannel.responseStatus );
            if (httpChannel.responseStatus != 200 && httpChannel.responseStatus != 207) 
                throw new Error("return status " + httpChannel.responseStatus);
            
            var szPath = httpChannel.URI.spec;
            var szURL = httpChannel.URI.host;
            mainObject.m_HotmailLog.Write("HotmailWebDav.js - mailBoxOnloadHandler - url - " + szURL + " " + szPath);  
            var aszTempDomain = szURL.match(patternHotmailPOPSRuri);  
            mainObject.m_HotmailLog.Write("HotmailWebDav.js - mailBoxOnloadHandler - domain - " + aszTempDomain); 
            
            //get cookies
            try
            {
                var szCookies =  httpChannel.getResponseHeader("Set-Cookie");
                mainObject.m_HotmailLog.Write("HotmailWebDav.js - mailBoxOnloadHandler - received cookies \n" + szCookies);  
                mainObject.m_oCookies.addCookie( aszTempDomain, szCookies); 
            }
            catch(e)
            {
                mainObject.m_HotmailLog.Write("HotmailWebDav.js - mailBoxOnloadHandler - no cookies found"); 
            } 
            
            var ios=Components.classes["@mozilla.org/network/io-service;1"].
                                    getService(Components.interfaces.nsIIOService);
                                    
         
            switch(mainObject.m_iStage)
            {
                case 0:  //get inbox and junkmail uri
                    mainObject.m_HotmailLog.Write("HotmailWebDav.js - mailBoxOnloadHandler - get folder list - START");         
                    mainObject.m_szInBoxURI = szResponse.match(patternHotmailPOPinboxFolder)[1];//in box
                    mainObject.m_HotmailLog.Write("HotmailWebDav.js - mailBoxOnloadHandler - inBox - " + mainObject.m_szInBoxURI);
                    mainObject.m_szJunkMailURI = szResponse.match(patternHotmailPOPTrashFolder)[1];
                    mainObject.m_HotmailLog.Write("HotmailWebDav.js - mailBoxOnloadHandler - junkmail - " + mainObject.m_szJunkMailURI);
                     
                    //Auth 
                    var szURL = ios.newURI(mainObject.m_szInBoxURI,null,null).prePath;
                    var aszRealm = szURL.match(patternHotmailPOPSRuri); 
                    mainObject.m_HotmailLog.Write("HotmailWebDav.js - getNumMessages - realm " + aszRealm); 
                    var szAuthString = mainObject.m_AuthToken.findToken(aszRealm);
                    mainObject.m_HotmailLog.Write("HotmailWebDav.js - getNumMessages - Auth " + szAuthString);                   
                    
                    //set cookies
                    var aszCookie = mainObject.m_oCookies.findCookie(aszRealm);
                    mainObject.m_HotmailLog.Write("HotmailWebDav.js - getNumMessages - cookies - "+ aszCookie);                    
                    
                    //load mailbox
                    var bResult = mainObject.httpConnection(mainObject.m_szInBoxURI, 
                                                            "PROPFIND", 
                                                            szAuthString,
                                                            HotmailPOPMailSchema, 
                                                            aszCookie,
                                                            mainObject.mailBoxOnloadHandler);
                                        
                    if (!bResult) throw new Error("httpConnection returned false");
                    
                    mainObject.m_iStage++;  
                    mainObject.m_HotmailLog.Write("HotmailWebDav.js - mailBoxOnloadHandler - get folder list - end"); 
                break;
                    
                    
                case 1: //get inbox and junkmail 
                    mainObject.m_HotmailLog.Write("HotmailWebDav.js - mailBoxOnloadHandler - inbox mail uri- start");
                    
                    var aszResponses = szResponse.match(patternHotmailPOPResponse);
                    mainObject.m_HotmailLog.Write("HotmailWebDav.js - mailBoxOnloadHandler - inbox - \n" + aszResponses);
                    if (aszResponses)
                    {
                        for (i=0; i<aszResponses.length; i++)
                        {
                            //mail url
                            var szHref = aszResponses[i].match(patternHotmailPOPHref)[1];
                            mainObject.m_HotmailLog.Write("HotmailWebDav.js - mailBoxOnloadHandler - href - "+ szHref);
                            mainObject.m_aszMsgIDStore.push(szHref); 
                            
                            //size 
                            var iSize = parseInt(aszResponses[i].match(patternHotmailPOPSize)[1]);
                            mainObject.m_HotmailLog.Write("HotmailWebDav.js - mailBoxOnloadHandler - size - "+ iSize);
                            mainObject.m_iTotalSize += iSize;
                            mainObject.m_aiMsgSize.push(iSize);
                        }
                    }
                    
                    if (mainObject.m_bUseJunkMail)
                    {
                        //load junkmail
                        
                        //Auth 
                        var szURL = ios.newURI(mainObject.m_szJunkMailURI,null,null).prePath;
                        var aszRealm = szURL.match(patternHotmailPOPSRuri); 
                        mainObject.m_HotmailLog.Write("HotmailWebDav.js - getNumMessages - realm " + aszRealm); 
                        var szAuthString = mainObject.m_AuthToken.findToken(aszRealm);
                        mainObject.m_HotmailLog.Write("HotmailWebDav.js - getNumMessages - Auth " + szAuthString);                   
                        
                        //set cookies
                        var aszCookie = mainObject.m_oCookies.findCookie(aszRealm);
                        mainObject.m_HotmailLog.Write("HotmailWebDav.js - getNumMessages - cookies - "+ aszCookie);
                        
                        var bResult = mainObject.httpConnection(mainObject.m_szJunkMailURI, 
                                                                "PROPFIND", 
                                                                szAuthString,
                                                                HotmailPOPMailSchema, 
                                                                aszCookie,
                                                                mainObject.mailBoxOnloadHandler);
                                            
                        if (!bResult) throw new Error("httpConnection returned false");
                    }
                    else
                    {
                        //server response
                        mainObject.serverComms("+OK "+ mainObject.m_aiMsgSize.length + " " + mainObject.m_iTotalSize + "\r\n");
                    }
                    mainObject.m_iStage++; 
                    mainObject.m_HotmailLog.Write("HotmailWebDav.js - mailBoxOnloadHandler - inbox mail uri - end");
                break; 
                
                case 2:
                    mainObject.m_HotmailLog.Write("HotmailWebDav.js - mailBoxOnloadHandler - junkmail uri- start");
                    
                    var aszResponses = szResponse.match(patternHotmailPOPResponse);
                    mainObject.m_HotmailLog.Write("HotmailWebDav.js - mailBoxOnloadHandler - junkmail - \n" + aszResponses);
                    
                    if (aszResponses)
                    {
                        for (i=0; i<aszResponses.length; i++)
                        {   
                            //mail url   
                            var szHref = aszResponses[i].match(patternHotmailPOPHref)[1];
                            mainObject.m_HotmailLog.Write("HotmailWebDav.js - mailBoxOnloadHandler - href - "+ szHref);
                            mainObject.m_aszMsgIDStore.push(szHref); //mail url
                            
                            //size 
                            var iSize = parseInt(aszResponses[i].match(patternHotmailPOPSize)[1]);
                            mainObject.m_HotmailLog.Write("HotmailWebDav.js - mailBoxOnloadHandler - size - "+ iSize);
                            mainObject.m_iTotalSize += iSize;
                            mainObject.m_aiMsgSize.push(iSize);
                        }
                    }
                    
                    //server response
                    mainObject.serverComms("+OK "+ mainObject.m_aiMsgSize.length + " " + mainObject.m_iTotalSize + "\r\n");

                    mainObject.m_HotmailLog.Write("HotmailWebDav.js - mailBoxOnloadHandler - junkmail uri - end");
                break;                    
            }                
             
            mainObject.m_HotmailLog.Write("HotmailWebDav.js - mailBoxOnloadHandler - END"); 
            return true;
        }
        catch(e)
        {
            this.m_HotmailLog.DebugDump("HotmailWebDav.js: getMessageSizes : Exception : " 
                                              + e.name 
                                              + ".\nError message: " 
                                              + e.message);
                                              
            mainObject.serverComms("-ERR webdav error\r\n");
            return false;
        }
    },
    
    
    
    //list
    getMessageSizes : function()
    {
        try
        {
            this.m_HotmailLog.Write("HotmailWebDav.js - getMessageSizes - START"); 
                                             
            var iTempNum = 0;
            var aTempSize = new Array();
       
            for (i = 0; i < this.m_aiMsgSize.length; i++)
            {
                var iEmailSize = this.m_aiMsgSize[i];
                this.m_HotmailLog.Write("HotmailWebDav.js - getMessageSizes - Email Size : " +iEmailSize);
        
                aTempSize.push(iEmailSize);
                iTempNum++; 
            }         
    
            this.m_HotmailLog.Write("HotmailWebDav.js - getMessagesSizes - : " + aTempSize + " " + iTempNum); 
            
            //sever response
            var szPOPResponse = "+OK " + iTempNum + " Messages\r\n"; 
            for (i =0 ; i<iTempNum; i++)
            {
                szPOPResponse+=(i+1) + " " + aTempSize[i] + "\r\n";                        
            }
            szPOPResponse += ".\r\n";
            
            this.serverComms(szPOPResponse);
                         
            this.m_HotmailLog.Write("HotmailWebDav.js - getMessageSizes - END"); 
            return true;
        }
        catch(e)
        {
            this.m_HotmailLog.DebugDump("HotmailWebDav.js: getMessageSizes : Exception : " 
                                              + e.name 
                                              + ".\nError message: " 
                                              + e.message);
            return false;
        }
    },
      


     //IUDL
    getMessageIDs : function()
    {
        try
        {
            this.m_HotmailLog.Write("HotmailWebDav.js - getMessageIDs - START"); 
           
            var iTempNum = 0;
            var aTempIDs = new Array();
            
            for (i = 0; i <  this.m_aszMsgIDStore.length; i++)
            {
                var szEmailURL = this.m_aszMsgIDStore[i];
                this.m_HotmailLog.Write("HotmailWebDav.js - getMessageIDs - Email URL : " +szEmailURL);
               
                var szEmailID = szEmailURL.match(patternHotmailPOPMSGID);
                                    
                this.m_HotmailLog.Write("HotmailWebDav.js - getMessageIDs - IDS : " +szEmailID);    
                aTempIDs.push(szEmailID);
                iTempNum++; 
            }         
     
            //server response                                    
            var szPOPResponse = "+OK " + iTempNum + " Messages\r\n";
            for (i =0 ; i<iTempNum; i++)
            {
                szPOPResponse+=(i+1) + " " + aTempIDs[i] + "\r\n";                        
            }
            szPOPResponse += ".\r\n";
            this.serverComms(szPOPResponse);           
                               
            this.m_HotmailLog.Write("HotmailWebDav.js - getMessage - END"); 
            return true;
        }
        catch(e)
        {
             this.m_HotmailLog.DebugDump("HotmailWebDav.js: getMessageIDs : Exception : " 
                                          + e.name + 
                                          ".\nError message: " 
                                          + e.message);
            return false;
        }
    },    
    
    
    
    getMessage : function( lID)
    {
        try
        {
            this.m_HotmailLog.Write("HotmailWebDav.js - getMessage - START"); 
            this.m_HotmailLog.Write("HotmailWebDav.js - getMessage - msg num" + lID);
            this.m_iStage=0;
                                  
            //get msg id
            this.m_szMsgID = this.m_aszMsgIDStore[lID-1];
            this.m_HotmailLog.Write("HotmailWebDav.js - getMessage - msg id" + this.m_szMsgID); 
                      
            var ios=Components.classes["@mozilla.org/network/io-service;1"].
                                    getService(Components.interfaces.nsIIOService);
            
            var szURL = ios.newURI(this.m_szMsgID,null,null).prePath;
            
            //Auth 
            var aszRealm = szURL.match(patternHotmailPOPSRuri); 
            var szAuthString = this.m_AuthToken.findToken(aszRealm);
            this.m_HotmailLog.Write("HotmailWebDav.js - getNumMessages - Auth " + szAuthString);                   
            
            //set cookies
            var aszCookie = this.m_oCookies.findCookie(aszRealm);
            this.m_HotmailLog.Write("HotmailWebDav.js - getNumMessages - cookies - "+ aszCookie);
                                                              
            var bResult = this.httpConnection(this.m_szMsgID, 
                                              "GET", 
                                              szAuthString,
                                              null, 
                                              aszCookie, 
                                              this.emailOnloadHandler);  
                                           
            if (!bResult) throw new Error("httpConnection returned false");   
                      
            this.m_HotmailLog.Write("HotmailWebDav.js - getMessage - END"); 
            return true;
        }
        catch(e)
        {
             this.m_HotmailLog.DebugDump("HotmailWebDav.js: getMessage : Exception : " 
                                          + e.name + 
                                          ".\nError message: " 
                                          + e.message);
            return false;
        }
    },    
    
    emailOnloadHandler : function (szResponse ,event , mainObject)
    {
        try
        {
            mainObject.m_HotmailLog.Write("HotmailWebDav.js - emailOnloadHandler - START"); 
            mainObject.m_HotmailLog.Write("HotmailWebDav.js - emailOnloadHandler - msg :\n" + szResponse); 
            
            var httpChannel = event.QueryInterface(Components.interfaces.nsIHttpChannel);
            mainObject.m_HotmailLog.Write("HotmailWebDav - emailOnloadHandler - status :" +httpChannel.responseStatus );
            
            if (httpChannel.responseStatus != 200) 
                throw new Error("return status " + httpChannel.responseStatus);
            
            
            var szPath = httpChannel.URI.spec;
            var szURL = httpChannel.URI.host;
            mainObject.m_HotmailLog.Write("HotmailWebDav.js - emailOnloadHandler - url - " + szURL + " " + szPath);  
            var aszTempDomain = szURL.match(patternHotmailPOPSRuri);  
            mainObject.m_HotmailLog.Write("HotmailWebDav.js - emailOnloadHandler - domain - " + aszTempDomain); 
            
            //get cookies
            try
            {
                var szCookies =  httpChannel.getResponseHeader("Set-Cookie");
                mainObject.m_HotmailLog.Write("HotmailWebDav.js - emailOnloadHandler - received cookies \n" + szCookies);  
                mainObject.m_oCookies.addCookie( aszTempDomain, szCookies); 
            }
            catch(e)
            {
                mainObject.m_HotmailLog.Write("HotmailWebDav.js - emailOnloadHandler - no cookies found"); 
            } 
                       
            //server response
            var szMsg =  szResponse;
            szMsg = szMsg.replace(/^\./mg,"..");    //bit padding 
            if (szMsg.lastIndexOf("\r\n") == -1) szMsg += "\r\n";
            szMsg += ".\r\n";  //msg end 
                                                                                                              
            var szPOPResponse = "+OK " + szMsg.length + "\r\n";                     
            szPOPResponse += szMsg;
            mainObject.serverComms(szPOPResponse);           
            mainObject.m_HotmailLog.Write("HotmailWebDav.js - emailOnloadHandler - end");  
        }
        catch(err)
        {
            mainObject.m_HotmailLog.DebugDump("HotmailWebDav.js: emailOnloadHandler : Exception : " 
                                          + err.name 
                                          + ".\nError message: " 
                                          + err.message);
            
            mainObject.serverComms("-ERR webdav error\r\n");
        }
    },
    


             
    //dele
    deleteMessage : function(lID)
    {
        try
        {
            this.m_HotmailLog.Write("HotmailWebDav.js - deleteMessage - START");  
            this.m_HotmailLog.Write("HotmailWebDav.js - deleteMessage - id " + lID ); 
                  
            //create URL
            var szPath = this.m_aszMsgIDStore[lID-1];
            this.m_HotmailLog.Write("HotmailWebDav.js - deleteMessage - id " + szPath );
                       
            var ios=Components.classes["@mozilla.org/network/io-service;1"].
                                    getService(Components.interfaces.nsIIOService);
            
            var szURL = ios.newURI(szPath,null,null).prePath;
                                     
            //Auth 
            var aszRealm = szURL.match(patternHotmailPOPSRuri); 
            var szAuthString = this.m_AuthToken.findToken(aszRealm);
            this.m_HotmailLog.Write("HotmailWebDav.js - getNumMessages - Auth " + szAuthString);                   
            
            //set cookies
            var aszCookie = this.m_oCookies.findCookie(aszRealm);
            this.m_HotmailLog.Write("HotmailWebDav.js - getNumMessages - cookies - "+ aszCookie);
                                                              
            var bResult = this.httpConnection(szPath, 
                                              "MOVE", 
                                              szAuthString,
                                              null, 
                                              aszCookie, 
                                              this.deleteMessageOnloadHandler);  
           
            this.m_iStage=0;           
                            
            if (!bResult) throw new Error("httpConnection returned false");
               
            this.m_HotmailLog.Write("HotmailWebDav.js - deleteMessage - END");     
            return true;
        }
        catch(e)
        {
            this.m_HotmailLog.DebugDump("HotmailWebDav.js: deleteMessage : Exception : " 
                                              + e.name + 
                                              ".\nError message: " 
                                              + e.message);
            return false;
        } 
    },

    
    deleteMessageOnloadHandler : function (szResponse ,event , mainObject)
    {
        try
        {
            mainObject.m_HotmailLog.Write("HotmailWebDav.js - deleteMessageOnload - START");    
           
            mainObject.m_HotmailLog.Write("HotmailWebDav.js - emailOnloadHandler : " 
                                         + mainObject.m_iStage + "\n"
                                         + szResponse);  
            
            var httpChannel = event.QueryInterface(Components.interfaces.nsIHttpChannel);
            
            //if this fails we've gone somewhere new
            mainObject.m_HotmailLog.Write("HotmailWebDav - emailOnloadHandler - status :" +httpChannel.responseStatus );
            if (httpChannel.responseStatus != 201) 
                throw new Error("return status " + httpChannel.responseStatus);
            
            mainObject.serverComms("+OK its gone\r\n");   
            
            mainObject.m_HotmailLog.Write("HotmailWebDav.js - deleteMessageOnload - END");      
        }
        catch(e)
        {
            mainObject.m_HotmailLog.DebugDump("HotmailWebDav.js: deleteMessageOnload : Exception : " 
                                                      + e.name 
                                                      + ".\nError message: " 
                                                      + e.message);
            mainObject.serverComms("-ERR webdav error\r\n");
        }
    },
    


    //cookies are deleted when the connection ends so i dont need to download pages
    logOut : function()
    {
        try
        {
            this.m_HotmailLog.Write("HotmailWebDav.js - logOUT - START"); 
            
            this.m_Parent.m_bAuthorised = false;
            this.serverComms("+OK Your Out\r\n");             
                                           
            this.m_HotmailLog.Write("HotmailWebDav.js - logOUT - END");  
            return true;
        }
        catch(e)
        {
            this.m_HotmailLog.DebugDump("HotmailWebDav.js: logOUT : Exception : " 
                                      + e.name 
                                      + ".\nError message: " 
                                      + e.message);
            return false;
        }
    },  
    
     
   serverComms : function (szMsg)
    {
        try
        { 
            this.m_HotmailLog.Write("HotmailWebDav.js - serverComms - START");
            this.m_HotmailLog.Write("HotmailWebDav.js - serverComms msg " + szMsg);
            var iCount = this.m_oResponseStream.write(szMsg,szMsg.length);
            this.m_HotmailLog.Write("HotmailWebDav.js - serverComms sent count: " + iCount 
                                                        +" msg length: " +szMsg.length);
            this.m_HotmailLog.Write("HotmailWebDav.js - serverComms - END");  
        }
        catch(e)
        {
            this.m_HotmailLog.DebugDump("HotmailWebDav.js: serverComms : Exception : " 
                                              + e.name 
                                              + ".\nError message: " 
                                              + e.message);
        }
    },
   
      
    httpConnection : function (szURL, szType, szAuthorization ,szData, szCookies ,callBack)
    {
        try
        {
            this.m_HotmailLog.Write("HotmailWebDav.js - httpConnection - START");   
            this.m_HotmailLog.Write("HotmailWebDav.js - httpConnection - " + szURL + "\n"
                                                                   + szType + "\n"
                                                                   + szAuthorization + "\n"
                                                                   + szCookies + "\n"
                                                                   + szData );  
            
            
            var ioService = Components.classes["@mozilla.org/network/io-service;1"].
                                    getService(Components.interfaces.nsIIOService);
      
            var uri = ioService.newURI(szURL, null, null);
            var channel = ioService.newChannelFromURI(uri);
            var HttpRequest = channel.QueryInterface(Components.interfaces.nsIHttpChannel);                                     
            HttpRequest.redirectionLimit = 0; //stops automatic redirect handling
            
            var component = this;             
            
              
            //set cookies
            if (szCookies)
            {
                this.m_HotmailLog.Write("HotmailWebDav.js - httpConnection - adding cookie \n"+ szCookies);
                HttpRequest.setRequestHeader("x-CookieHack", "Hacker\r\nCookie: "  + szCookies , false);
            }
           
           
            //set data
            if (szData)
            {
                this.m_HotmailLog.Write("HotmailWebDav.js - httpConnection - adding data");
                
                var uploadStream = Components.classes["@mozilla.org/io/string-input-stream;1"]
                                    .createInstance(Components.interfaces.nsIStringInputStream);         
                uploadStream.setData(szData, szData.length);
        
                var uploadChannel = channel.QueryInterface(Components.interfaces.nsIUploadChannel);
                uploadChannel.setUploadStream(uploadStream, "text/xml", -1); 
            }
            
            //set Destination
            if (szType.search(/move/i)!=-1)
            {
                this.m_HotmailLog.Write("HotmailWebDav.js - httpConnection - adding Destination");
                var szMsgID =  szURL.match(patternHotmailPOPMSGID); 
                var szDestination= this.m_szTrashURI + szMsgID
                this.m_HotmailLog.Write("HotmailWebDav.js - httpConnection - Destination " + szDestination );
                HttpRequest.setRequestHeader("Destination", szDestination , false);
            }
            
            //set authorization
            if (szAuthorization)
            {
                this.m_HotmailLog.Write("HotmailWebDav.js - httpConnection - adding szAuthorization");
                HttpRequest.setRequestHeader("Authorization", szAuthorization , false);
            } 
            
            HttpRequest.requestMethod = szType;
                       
            var listener = new this.downloadListener(callBack, this);
            channel.asyncOpen(listener, null);  
            
            this.m_HotmailLog.Write("HotmailWebDav.js - httpConnection - END"); 
            
            return true;  
        }
        catch(e)
        {
            this.m_HotmailLog.DebugDump("HotmailWebDav.js: httpConnection : Exception : " 
                                              + e.name 
                                              + ".\nError message: " 
                                              + e.message);
            return false;
        }
    },
    
    
    downloadListener : function(CallbackFunc, parent) 
    {
        return ({
            m_data : "",
            
            onStartRequest : function (aRequest, aContext) 
            {                 
                this.m_data = "";
            },
            
            
            onDataAvailable : function (aRequest, aContext, aStream, aSourceOffset, aLength)
            {               
                var scriptableInputStream = Components.classes["@mozilla.org/scriptableinputstream;1"]
                                 .createInstance(Components.interfaces.nsIScriptableInputStream);
                scriptableInputStream.init(aStream);
            
                this.m_data += scriptableInputStream.read(aLength);
            },
            
            
            onStopRequest : function (aRequest, aContext, aStatus) 
            {
                CallbackFunc(this.m_data, aRequest, parent);
            },
            
            
            QueryInterface : function(aIID) 
            {
                if (aIID.equals(Components.interfaces.nsIStreamListener) ||
                          aIID.equals(Components.interfaces.nsISupportsWeakReference) ||
                          aIID.equals(Components.interfaces.nsIAlertListener) ||
                          aIID.equals(Components.interfaces.nsISupports))
                    return this;
                
                throw Components.results.NS_NOINTERFACE;
            }            
        });
    },
}    
                      
        
    
