/*****************************  Globals   *************************************/                 
const nsLycosClassID = Components.ID("{222b6e70-8a87-11d9-9669-0800200c9a66}"); 
const nsLycosContactID = "@mozilla.org/Lycos;1";

const LycosSchema = "<?xml version=\"1.0\"?>\r\n<D:propfind xmlns:D=\"DAV:\" xmlns:h=\"http://schemas.microsoft.com/hotmail/\" xmlns:hm=\"urn:sc hemas:httpmail:\">\r\n<D:prop>\r\n<h:adbar/>\r\n<hm:contacts/>\r\n<hm:inbox/>\r\n<hm:outbox/>\r\n<hm:sendmsg/>\r\n<hm:sentitems/>\r\n<hm:deleteditems/>\r\n<hm:drafts/>\r\n<hm:msgfolderroot/>\r\n<h:maxpoll/>\r\n<h:sig/>\r\n</D:prop>\r\n</D:propfind>";
const LycosFolderSchema = "<?xml version=\"1.0\"?>\r\n<D:propfind xmlns:D=\"DAV:\" xmlns:hm=\"urn:schemas:httpmail:\">\r\n<D:prop>\r\n<D:isfolder/>\r\n<D:displayname/>\r\n<hm:special/>\r\n<D:hassubs/>\r\n<D:nosubs/>\r\n<hm:unreadcount/>\r\n<D:visiblecount/>\r\n<hm:special/>\r\n</D:prop>\r\n</D:propfind>";
const LycosMail = "<?xml version=\"1.0\"?>\r\n<D:propfind xmlns:D=\"DAV:\" xmlns:hm=\"urn:schemas:httpmail:\" xmlns:m=\"urn:schemas:mailheader:\">\r\n<D:prop>\r\n<D:isfolder/>\r\n<hm:read/>\r\n<m:hasattachment/>\r\n<m:to/>\r\n<m:from/>\r\n<m:subject/>\r\n<m:date/>\r\n<D:getcontentlength/>\r\n</D:prop>\r\n</D:propfind>";
const LycosFolderPattern = /<hm:msgfolderroot>(.*?)<\/hm:msgfolderroot>/;
const LycosMSGIDPattern = /[^\/]+$/;
const LycosResponse = /<D:response>[\S\d\s\r\n]*?<\/D:response>/gm;
const LycosID = /<D:id>(.*?)<\/D:id>/;
const LycosHref = /<D:href>(.*?)<\/D:href>/;
const LycosSize = /<D:getcontentlength>(.*?)<\/D:getcontentlength>/;
/***********************  Lycos ********************************/


function nsLycos()
{
    try
    {       
        var scriptLoader =  Components.classes["@mozilla.org/moz/jssubscript-loader;1"]
                              .getService(Components.interfaces.mozIJSSubScriptLoader);
        if (scriptLoader)
        {
            scriptLoader.loadSubScript("chrome://web-mail/content/common/DebugLog.js");
            scriptLoader.loadSubScript("chrome://web-mail/content/common/CookieManager.js");
            scriptLoader.loadSubScript("chrome://web-mail/content/common/CommonPrefs.js");
            scriptLoader.loadSubScript("chrome://lycos/content/base64.js");
        }
        
        var date = new Date();
        
        var  szLogFileName = "Lycos Log - " + date.getHours()+ "-" + date.getMinutes() + "-"+ date.getUTCMilliseconds() +" -";
        this.m_LycosLog = new DebugLog("webmail.logging.comms", 
                                       "{3c8e8390-2cf6-11d9-9669-0800200c9a66}" ,
                                       szLogFileName); 
        
        this.m_LycosLog.Write("nsLycos.js - Constructor - START");   
       
        this.m_szUserNameDomain = null;   
        this.m_szPassWord = null; 
        this.m_oResponseStream = null;  
        this.m_oCookies = new CookieHandler(this.m_LycosLog);     
        this.m_bAuthorised = false;   
        this.m_szAuthRealm = null;
        this.m_iAuth = 0;
        this.m_iStage=0; 
        this.m_szInBoxURI= null;
        this.m_szJunkMailURI = null;
        this.m_szFolderURI = null;
        this.m_aszMsgIDStore = new Array();
        this.m_aiMsgSize = new Array();
        this.m_iTotalSize = 0;
        this.m_szMsgID = null;
        
        
        //do i download junkmail
        var oPref = new Object();
        oPref.Value = null;
        var  WebMailPrefAccess = new WebMailCommonPrefAccess();
        if (WebMailPrefAccess.Get("bool","lycos.bUseJunkMail",oPref))
            this.m_bUseJunkMail=oPref.Value;
        else
            this.m_bUseJunkMail=false;
                   
        this.m_LycosLog.Write("nsLycos.js - Constructor - END");  
    }
    catch(e)
    {
        DebugDump("nsLycos.js: Constructor : Exception : " 
                                      + e.name 
                                      + ".\nError message: " 
                                      + e.message);
    }
}



nsLycos.prototype =
{
    get userName() {return this.m_szUserNameDomain;},
    set userName(userName) {return this.m_szUserNameDomain = userName;},
    
    get passWord() {return this.m_szPassWord;},
    set passWord(passWord) {return this.m_szPassWord = passWord;},
    
    get bAuthorised() {return this.m_bAuthorised;},
  
    get ResponseStream() {return this.m_oResponseStream;},
    set ResponseStream(responseStream) {return this.m_oResponseStream = responseStream;},
    
       
    logIn : function()
    {
        try
        {
            this.m_LycosLog.Write("nsLycos.js - logIN - START");   
            this.m_LycosLog.Write("nsLycos.js - logIN - Username: " + this.m_szUserNameDomain 
                                                   + " Password: "  + this.m_szPassWord 
                                                   + " stream: "    + this.m_oResponseStream);
            
            if (!this.m_szUserNameDomain || !this.m_oResponseStream || !this.m_szPassWord) return false;
            
            var szTempUserName = this.m_szUserNameDomain.split("@");
            this.m_LycosLog.Write("nsLycos.js - logIN - doamain " + szTempUserName); 
            var szDomain = szTempUserName[1];
            
            var szLocation= null;
            if (szDomain.search(/lycos.co.uk/i)!=-1) 
                szLocation= "http://webdav.lycos.co.uk/httpmail.asp";
            else
                throw new Error("Unknown domain");
            
            var bResult = this.httpConnection(szLocation, 
                                              "PROPFIND", 
                                              null,
                                              LycosSchema,
                                              null, 
                                              this.loginOnloadHandler);
                                                
            if (!bResult) throw new Error("httpConnection returned false");
            
            this.m_LycosLog.Write("nsLycos.js - logIN - END " + bResult);    
            return true;
        }
        catch(e)
        {
            this.m_LycosLog.DebugDump("nsLycos.js: logIN : Exception : " 
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
            mainObject.m_LycosLog.Write("nsLycos.js - loginOnloadHandler - START"); 
            
            mainObject.m_LycosLog.Write("nsLycos.js - loginOnloadHandler : " 
                                         + mainObject.m_iStage + "\n"
                                         + szResponse);  
            
            var httpChannel = event.QueryInterface(Components.interfaces.nsIHttpChannel);
            
            //if this fails we've gone somewhere new
            mainObject.m_LycosLog.Write("nsLycos - loginOnloadHandler - status :" +httpChannel.responseStatus );
            if (httpChannel.responseStatus != 200 
                    && httpChannel.responseStatus != 207 
                                && httpChannel.responseStatus != 302 
                                                 && httpChannel.responseStatus != 401) 
                throw new Error("return status " + httpChannel.responseStatus);
            
            var szPath = httpChannel.URI.spec;
            var szURL = httpChannel.URI.host;
            mainObject.m_LycosLog.Write("nsLycos.js - loginOnloadHandler - url - " + szURL + " " + szPath);  
            var aszTempDomain = szURL.match(/.*?\.(.*?)$/);  
            mainObject.m_LycosLog.Write("nsLycos.js - loginOnloadHandler - domain - " + aszTempDomain[1]); 
            
            //get cookies
            try
            {
                var szCookies =  httpChannel.getResponseHeader("Set-Cookie");
                mainObject.m_Log.Write("nsLycos.js - loginOnloadHandler - received cookies \n" + szCookies);  
                mainObject.m_oCookies.addCookie( aszTempDomain[0], szCookies); 
            }
            catch(e)
            {
                mainObject.m_LycosLog.Write("nsLycos.js - loginOnloadHandler - no cookies found"); 
            } 
            
            var ios=Components.classes["@mozilla.org/network/io-service;1"].
                                    getService(Components.interfaces.nsIIOService);



            //bounce handler
            if ( httpChannel.responseStatus == 302)
            {
                try
                {
                    mainObject.m_iAuth=0; //reset login count
                    var szLocation =  httpChannel.getResponseHeader("Location");
                    mainObject.m_LycosLog.Write("nsLycos.js - loginOnloadHandler - location \n" + szLocation);  
                }
                catch(e)
                {
                    throw new Error("Location header not found")
                } 
            
                //set cookies
                var szURL = ios.newURI(szLocation,null,null).prePath;
                var aszHost = szURL.match(/.*?\.(.*?)$/);  
                var aszCookie = mainObject.m_oCookies.findCookie(aszHost[1]);
                mainObject.m_LycosLog.Write("nsLycos.js - loginOnloadHandler - sending cookies - "+ aszCookie);
                
                var bResult = mainObject.httpConnection(szURL, 
                                                        "PROPFIND",
                                                        null,
                                                        LycosSchema, 
                                                        aszCookie,
                                                        mainObject.loginOnloadHandler);
                                            
                if (!bResult) throw new Error("httpConnection returned false");
            }
            //Authenticate
            else if  (httpChannel.responseStatus == 401)
            {
                try
                {
                    if ( mainObject.m_iAuth==2) throw new Error("login error");
                    
                    var szAuthenticate =  httpChannel.getResponseHeader("www-Authenticate");
                    mainObject.m_LycosLog.Write("nsLycos.js - loginOnloadHandler - www-Authenticate " + szAuthenticate);
                    mainObject.m_iAuth++;
                }
                catch(e)
                {
                     mainObject.m_LycosLog.DebugDump("nsLycos.js: loginHandler  Authenitcation: Exception : " 
                                                      + err.name 
                                                      + ".\nError message: " 
                                                      + err.message);
                                                      
                    throw new Error("szAuthenticate header not found")
                }     
                    
                //basic or digest
                if (szAuthenticate.search(/basic/i)!= -1)
                {//authentication on the cheap
                    mainObject.m_LycosLog.Write("nsLycos.js - loginOnloadHandler - basic Authenticate");
                   
                    if (!mainObject.m_szAuthString) 
                    {
                        mainObject.m_szAuthString ="Basic ";
                        mainObject.m_szAuthString += EncBase64(mainObject.m_szUserNameDomain+":"+mainObject.m_szPassWord);
                        mainObject.m_szAuthString += "\r\n"
                    }
                   
                    var szURL = ios.newURI(szPath,null,null).prePath;
                    var aszHost = szURL.match(/.*?\.(.*?)$/); 
                    var aszCookie = mainObject.m_oCookies.findCookie(aszHost);
                    var bResult = mainObject.httpConnection(szPath, 
                                                    "PROPFIND", 
                                                    mainObject.m_szAuthString,
                                                    LycosSchema, 
                                                    aszCookie,
                                                    mainObject.loginOnloadHandler);
                                        
                    if (!bResult) throw new Error("httpConnection returned false");
                }
                else if (szAuthenticate.search(/digest/i)!= -1)
                {
                    throw new Error("unspported authentication method");
                }
                else
                    throw new Error("unknown authentication method");
           } 
            //everything else
            else 
            {
                mainObject.m_LycosLog.Write("nsLycos.js - loginOnloadHandler - get url - start");
                mainObject.m_iAuth=0; //reset login counter
                mainObject.m_LycosLog.Write("nsLycos.js - loginOnloadHandler - get folder list - start");
                mainObject.m_szFolderURI = szResponse.match(LycosFolderPattern)[1];
                mainObject.m_LycosLog.Write("nsLycos.js - loginOnloadHandler - get folder url - " + mainObject.m_szFolderURI);
                
                //server response
                mainObject.serverComms("+OK Your in\r\n");
                mainObject.m_bAuthorised = true;
                        
                mainObject.m_LycosLog.Write("nsLycos.js - loginOnloadHandler - get url - end"); 
            }
           
            mainObject.m_LycosLog.Write("nsLycos.js - loginOnloadHandler - END");
        }
        catch(err)
        {
            mainObject.m_LycosLog.DebugDump("nsLycos.js: loginHandler : Exception : " 
                                          + err.name 
                                          + ".\nError message: " 
                                          + err.message);
                                              
            mainObject.serverComms("-ERR Comms Error\r\n");
        }
    },
    
    
    //stat 
    //total size is in octets
    getNumMessages : function()
    {
        try
        {
            this.m_LycosLog.Write("nsLycos.js - getNumMessages - START"); 
            this.m_iStage=0;
             
            if (this.m_szFolderURI == null) return false;
            this.m_LycosLog.Write("nsLycos.js - getNumMessages - mail box url " + this.m_szFolderURI); 
            
            var ios=Components.classes["@mozilla.org/network/io-service;1"].
                                    getService(Components.interfaces.nsIIOService);
                                    
            //set cookies
            var szURL = ios.newURI(this.m_szFolderURI,null,null).prePath;
            var aszHost = szURL.match(/.*?\.(.*?)$/); 
            var aszCookie = this.m_oCookies.findCookie(aszHost[1]);
            this.m_LycosLog.Write("nsLycos.js - getNumMessages - cookies - "+ aszCookie);
                                                              
            var bResult = this.httpConnection(this.m_szFolderURI, 
                                              "PROPFIND", 
                                              this.m_szAuthString,
                                              LycosFolderSchema, 
                                              aszCookie, 
                                              this.mailBoxOnloadHandler);  
                                              
            if (!bResult) throw new Error("httpConnection returned false");
                  
            this.m_LycosLog.Write("nsLycos.js - getNumMessages - END"); 
            return true;
        }
        catch(e)
        {
            this.m_LycosLog.DebugDump("nsLycos.js: getNumMessages : Exception : " 
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
            mainObject.m_LycosLog.Write("nsLycos.js - mailBoxOnloadHandler - START"); 
            
            mainObject.m_LycosLog.Write("nsLycos.js - mailBoxOnloadHandler : " 
                                         + mainObject.m_iStage + "\n"
                                         + szResponse);  
            
            var httpChannel = event.QueryInterface(Components.interfaces.nsIHttpChannel);
            
            //if this fails we've gone somewhere new
            mainObject.m_LycosLog.Write("nsLycos - mailBoxOnloadHandler - status :" +httpChannel.responseStatus );
            if (httpChannel.responseStatus != 200 && httpChannel.responseStatus != 207) 
                throw new Error("return status " + httpChannel.responseStatus);
            
            var szPath = httpChannel.URI.spec;
            var szURL = httpChannel.URI.host;
            mainObject.m_LycosLog.Write("nsLycos.js - mailBoxOnloadHandler - url - " + szURL + " " + szPath);  
            var aszTempDomain = szURL.match(/.*?\.(.*?)$/);  
            mainObject.m_LycosLog.Write("nsLycos.js - mailBoxOnloadHandler - domain - " + aszTempDomain[1]); 
            
            //get cookies
            try
            {
                var szCookies =  httpChannel.getResponseHeader("Set-Cookie");
                mainObject.m_Log.Write("nsLycos.js - mailBoxOnloadHandler - received cookies \n" + szCookies);  
                mainObject.m_oCookies.addCookie( aszTempDomain[0], szCookies); 
            }
            catch(e)
            {
                mainObject.m_LycosLog.Write("nsLycos.js - mailBoxOnloadHandler - no cookies found"); 
            } 
            
            var ios=Components.classes["@mozilla.org/network/io-service;1"].
                                    getService(Components.interfaces.nsIIOService);
                                    
         
            switch(mainObject.m_iStage)
            {
                case 0:  //get inbox and junkmail uri
                    mainObject.m_LycosLog.Write("nsLycos.js - mailBoxOnloadHandler - get folder list - START");         
                    
                    var aszFolders = szResponse.match(LycosResponse);
                    mainObject.m_LycosLog.Write("nsLycos.js - mailBoxOnloadHandler - get folder list - \n" + aszFolders);
                    
                    for (i=0; i<aszFolders.length; i++)
                    {
                        if (aszFolders[i].match(LycosID)[1] == 5) //in box
                        {
                            mainObject.m_szInBoxURI = aszFolders[i].match(LycosHref)[1]; 
                            mainObject.m_LycosLog.Write("nsLycos.js - mailBoxOnloadHandler - inBox - " + mainObject.m_szInBoxURI); 
                        }
                        else if (aszFolders[i].match(LycosID)[1] == 13) // junk mail
                        { 
                            mainObject.m_szJunkMailURI = aszFolders[i].match(LycosHref)[1];
                            mainObject.m_LycosLog.Write("nsLycos.js - mailBoxOnloadHandler - junkmail - " + mainObject.m_szJunkMailURI);
                        }
                    }
                    
                    //load mailbox
                    var szURL = ios.newURI(mainObject.m_szInBoxURI,null,null).prePath;
                    var aszHost = szURL.match(/.*?\.(.*?)$/); 
                    var aszCookie = mainObject.m_oCookies.findCookie(aszHost[1]);
                    var bResult = mainObject.httpConnection(mainObject.m_szInBoxURI, 
                                                            "PROPFIND", 
                                                            mainObject.m_szAuthString,
                                                            LycosMail, 
                                                            aszCookie,
                                                            mainObject.mailBoxOnloadHandler);
                                        
                    if (!bResult) throw new Error("httpConnection returned false");
                    
                    mainObject.m_iStage++;  
                    mainObject.m_LycosLog.Write("nsLycos.js - mailBoxOnloadHandler - get folder list - end"); 
                break;
                    
                    
                case 1: //get inbox and junkmail uri
                    mainObject.m_LycosLog.Write("nsLycos.js - mailBoxOnloadHandler - inbox mail uri- start");
                    
                    var aszResponses = szResponse.match(LycosResponse);
                    mainObject.m_LycosLog.Write("nsLycos.js - mailBoxOnloadHandler - inbox - \n" + aszResponses);
                    
                    for (i=0; i<aszResponses.length; i++)
                    {
                        mainObject.m_aszMsgIDStore.push(aszResponses[i].match(LycosHref)[1]); //mail url
                        
                        //size                       
                        var iSize = aszResponses[i].match(LycosSize)[1];
                        mainObject.m_iTotalSize += iSize;
                        mainObject.m_aiMsgSize.push(iSize); //size
                    }
                    
                    if (mainObject.m_bUseJunkMail)
                    {
                        //load junkmail
                        var szURL = ios.newURI(mainObject.m_szJunkMailURI,null,null).prePath;
                        var aszHost = szURL.match(/.*?\.(.*?)$/); 
                        var aszCookie = mainObject.m_oCookies.findCookie(aszHost[1]);
                        var bResult = mainObject.httpConnection(mainObject.m_szJunkMailURI, 
                                                                "PROPFIND", 
                                                                mainObject.m_szAuthString,
                                                                LycosMail, 
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
                    mainObject.m_LycosLog.Write("nsLycos.js - mailBoxOnloadHandler - inbox mail uri - end");
                break; 
                
                case 2:
                    mainObject.m_LycosLog.Write("nsLycos.js - mailBoxOnloadHandler - junkmail uri- start");
                    
                    var aszResponses = szResponse.match(LycosResponse);
                    mainObject.m_LycosLog.Write("nsLycos.js - mailBoxOnloadHandler - junkmail - \n" + aszResponses);
                    
                    if (aszResponses)
                    {
                        for (i=0; i<aszResponses.length; i++)
                        {
                            mainObject.m_aszMsgIDStore.push(aszResponses[i].match(LycosHref)[1]); //mail url
                            mainObject.m_aiMsgSize.push(aszResponses[i].match(LycosSize)[1]); //size
                        }
                    }
                    
                    //server response
                    mainObject.serverComms("+OK "+ mainObject.m_aiMsgSize.length + " " + mainObject.m_iTotalSize + "\r\n");

                    mainObject.m_LycosLog.Write("nsLycos.js - mailBoxOnloadHandler - junkmail uri - end");
                break;                    
            }       
        }
        catch(err)
        {
             mainObject.m_LycosLog.DebugDump("nsLycos.js: MailboxOnload : Exception : " 
                                              + err.name 
                                              + ".\nError message: " 
                                              + err.message);
            
             mainObject.serverComms("-ERR Comms Error\r\n");
        }
    },
    
                      
    //list
    getMessageSizes : function() 
    {
        try
        {
            this.m_LycosLog.Write("nsLycos.js - getMessageSizes - START"); 
                                  
            var iTempNum = 0;
            var aTempSize = new Array();
       
            for (i = 0; i < this.m_aiMsgSize.length; i++)
            {
                var iEmailSize = this.m_aiMsgSize[i];
                this.m_LycosLog.Write("nsLycos.js - getMessageSizes - Email Size : " +iEmailSize);
        
                aTempSize.push(iEmailSize);
                iTempNum++; 
            }         
    
            this.m_LycosLog.Write("nsLycos.js - getMessagesSizes - : " + aTempSize + " " + iTempNum); 
            
            //sever response
            var szPOPResponse = "+OK " + iTempNum + " Messages\r\n"; 
            for (i =0 ; i<iTempNum; i++)
            {
                szPOPResponse+=(i+1) + " " + aTempSize[i] + "\r\n";                        
            }
            szPOPResponse += ".\r\n";
            
            this.serverComms(szPOPResponse);
                   
            this.m_LycosLog.Write("nsLycos.js - getMessageSizes - END"); 
            return true;
        }
        catch(e)
        {
            this.m_LycosLog.DebugDump("nsLycos.js: getMessageSizes : Exception : " 
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
            this.m_LycosLog.Write("nsLycos.js - getMessageIDs - START"); 
            
            var iTempNum = 0;
            var aTempIDs = new Array();
            
            for (i = 0; i <  this.m_aszMsgIDStore.length; i++)
            {
                var szEmailURL = this.m_aszMsgIDStore[i];
                this.m_LycosLog.Write("nsLycos.js - getMessageIDs - Email URL : " +szEmailURL);
               
                var szEmailID = szEmailURL.match(LycosMSGIDPattern);
                                    
                this.m_LycosLog.Write("nsLycos.js - getMessageIDs - IDS : " +szEmailID);    
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
                     
            this.m_LycosLog.Write("nsLycos.js - getMessageIDs - END"); 
            return true;
        }
        catch(e)
        {
            this.m_LycosLog.DebugDump("nsLycos.js: getMessageIDs : Exception : " 
                                          + e.name 
                                          + ".\nError message: " 
                                          + e.message);
            return false;
        }
    },
      




    //retr
    getMessage : function( lID)
    {
        try
        {
            this.m_LycosLog.Write("nsLycos.js - getMessage - START"); 
            this.m_LycosLog.Write("nsLycos.js - getMessage - msg num" + lID);
            this.m_iStage=0;
                                  
            //get msg id
            this.m_szMsgID = this.m_aszMsgIDStore[lID-1];
            this.m_LycosLog.Write("nsLycos.js - getMessage - msg id" + this.m_szMsgID); 
           
            
            var ios=Components.classes["@mozilla.org/network/io-service;1"].
                                    getService(Components.interfaces.nsIIOService);
           
            //set cookies
            var szURL = ios.newURI(this.m_szMsgID,null,null).prePath;
            var aszHost = szURL.match(/.*?\.(.*?)$/); 
            var aszCookie = this.m_oCookies.findCookie(aszHost[1]);
            this.m_LycosLog.Write("nsYahoo.js - getNumMessages - cookies - "+ aszCookie);
                      
           //get msg from lycos
            var bResult = this.httpConnection(this.m_szMsgID, 
                                              "GET",
                                              this.m_szAuthString, 
                                              null,
                                              aszCookie, 
                                              this.emailOnloadHandler);  
                                           
            if (!bResult) throw new Error("httpConnection returned false");   
                      
            this.m_LycosLog.Write("nsLycos.js - getMessage - END"); 
            return true;
        }
        catch(e)
        {
             this.m_LycosLog.DebugDump("nsLycos.js: getMessage : Exception : " 
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
            mainObject.m_LycosLog.Write("nsLycos.js - emailOnloadHandler - START"); 
            
            mainObject.m_LycosLog.Write("nsLycos.js - emailOnloadHandler : " 
                                         + mainObject.m_iStage + "\n"
                                         + szResponse);  
            
            var httpChannel = event.QueryInterface(Components.interfaces.nsIHttpChannel);
            
            //if this fails we've gone somewhere new
            mainObject.m_LycosLog.Write("nsLycos - emailOnloadHandler - status :" +httpChannel.responseStatus );
            if (httpChannel.responseStatus != 200) 
                throw new Error("return status " + httpChannel.responseStatus);
            
            var szPath = httpChannel.URI.spec;
            var szURL = httpChannel.URI.host;
            mainObject.m_LycosLog.Write("nsLycos.js - emailOnloadHandler - url - " + szURL + " " + szPath);  
            var aszTempDomain = szURL.match(/.*?\.(.*?)$/);  
            mainObject.m_LycosLog.Write("nsLycos.js - emailOnloadHandler - domain - " + aszTempDomain[1]); 
            
            //get cookies
            try
            {
                var szCookies =  httpChannel.getResponseHeader("Set-Cookie");
                mainObject.m_Log.Write("nsLycos.js - emailOnloadHandler - received cookies \n" + szCookies);  
                mainObject.m_oCookies.addCookie( aszTempDomain[0], szCookies); 
            }
            catch(e)
            {
                mainObject.m_LycosLog.Write("nsLycos.js - emailOnloadHandler - no cookies found"); 
            }
            
            //server response
            var szMsg =  szResponse;
            szMsg = szMsg.replace(/^\./mg,"..");    //bit padding 
            if (szMsg.lastIndexOf("\r\n") == -1) szMsg += "\r\n";
            szMsg += ".\r\n";  //msg end 
                                                                                                              
            var szPOPResponse = "+OK " + szMsg.length + "\r\n";                     
            szPOPResponse += szMsg;
            mainObject.serverComms(szPOPResponse);           
            mainObject.m_LycosLog.Write("nsLycos.js - emailOnloadHandler - end"); 
        }
        catch(err)
        {
            mainObject.m_LycosLog.DebugDump("nsLycos.js: emailOnloadHandler : Exception : " 
                                              + err.name 
                                              + ".\nError message: " 
                                              + err.message);
            
            mainObject.serverComms("-ERR Comms Error\r\n");
        }    
    },
                                    
      
    //dele
    deleteMessage : function(lID)
    {
        try
        {
            this.m_LycosLog.Write("nsLycos.js - deleteMessage - START");  
            this.m_LycosLog.Write("nsLycos.js - deleteMessage - id " + lID ); 
                  
            //create URL
            var szPath = this.m_aszMsgIDStore[lID-1];
            this.m_LycosLog.Write("nsLycos.js - deleteMessage - id " + szPath );
                       
            var ios=Components.classes["@mozilla.org/network/io-service;1"].
                                    getService(Components.interfaces.nsIIOService);
                                   
            //set cookies
            var szURL = ios.newURI(szPath,null,null).prePath;
            var aszHost = szURL.match(/.*?\.(.*?)$/); 
            var aszCookie = this.m_oCookies.findCookie(aszHost[1]);
            this.m_LycosLog.Write("nsYahoo.js - deleteMessage - cookies - "+ aszCookie);
           
            this.m_iStage=0;           
            
            //send request
            var bResult = this.httpConnection(szPath, 
                                              "MOVE",
                                              this.m_szAuthString, 
                                              null,
                                              aszCookie, 
                                              this.deleteMessageOnloadHandler);  
                  
            if (!bResult) throw new Error("httpConnection returned false");         
             
            this.m_LycosLog.Write("nsLycos.js - deleteMessage - END");     
            return true;
        }
        catch(e)
        {
            this.m_LycosLog.DebugDump("nsLycos.js: deleteMessage : Exception : " 
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
            mainObject.m_LycosLog.Write("nsLycos.js - deleteMessageOnloadHandler - START");
            
            mainObject.m_LycosLog.Write("nsLycos.js - emailOnloadHandler : " 
                                         + mainObject.m_iStage + "\n"
                                         + szResponse);  
            
            var httpChannel = event.QueryInterface(Components.interfaces.nsIHttpChannel);
            
            //if this fails we've gone somewhere new
            mainObject.m_LycosLog.Write("nsLycos - emailOnloadHandler - status :" +httpChannel.responseStatus );
            if (httpChannel.responseStatus != 201) 
                throw new Error("return status " + httpChannel.responseStatus);
            
            mainObject.serverComms("+OK its gone\r\n");   
              
            mainObject.m_LycosLog.Write("nsLycos.js - deleteMessageOnloadHandler - END");
        }
        catch(err)
        {
            mainObject.m_LycosLog.DebugDump("nsLycos.js: deleteMessageOnloadHandler : Exception : " 
                                              + err.name 
                                              + ".\nError message: " 
                                              + err.message);
            
            mainObject.serverComms("-ERR Comms Error\r\n");
        }
    },
    
    
    
    logOut : function()
    {
        try
        {
            this.m_LycosLog.Write("nsLycos.js - logOUT - START"); 
            
            this.m_bAuthorised = false;
            this.serverComms("+OK your out\r\n");                 
            
            this.m_LycosLog.Write("nsLycos.js - logOUT - END");  
            return true;
        }
        catch(e)
        {
            this.m_LycosLog.DebugDump("nsLycos.js: logOUT : Exception : " 
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
            this.m_LycosLog.Write("nsLycos.js - serverComms - START");
            this.m_LycosLog.Write("nsLycos.js - serverComms msg " + szMsg);
            var iCount = this.m_oResponseStream.write(szMsg,szMsg.length);
            this.m_LycosLog.Write("nsLycos.js - serverComms sent count: " + iCount 
                                                        +" msg length: " +szMsg.length);
            this.m_LycosLog.Write("nsLycos.js - serverComms - END");  
        }
        catch(e)
        {
            this.m_LycosLog.DebugDump("nsLycos.js: serverComms : Exception : " 
                                              + e.name 
                                              + ".\nError message: " 
                                              + e.message);
        }
    },
                      
    
    httpConnection : function (szURL, szType, szAuthorization ,szData, szCookies ,callBack)
    {
        try
        {
            this.m_LycosLog.Write("nsLycos.js - httpConnection - START");   
            this.m_LycosLog.Write("nsLycos.js - httpConnection - " + szURL + "\n"
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
                this.m_LycosLog.Write("nsLycos.js - httpConnection - adding cookie \n"+ szCookies);
                HttpRequest.setRequestHeader("x-CookieHack", "Hacker\r\nCookie: "  + szCookies , false);
            }
           
           
            //set data
            if (szData)
            {
                this.m_LycosLog.Write("nsLycos.js - httpConnection - adding data");
                
                var uploadStream = Components.classes["@mozilla.org/io/string-input-stream;1"]
                                    .createInstance(Components.interfaces.nsIStringInputStream);         
                uploadStream.setData(szData, szData.length);
        
                var uploadChannel = channel.QueryInterface(Components.interfaces.nsIUploadChannel);
                uploadChannel.setUploadStream(uploadStream, "text/xml", -1); 
            }
            
            //set Destination
            if (szType.search(/move/i)!=-1)
            {
                this.m_LycosLog.Write("nsLycos.js - httpConnection - adding Destination");
                var szMsgID =  szURL.match(LycosMSGIDPattern); 
                var szDestination= szURL.replace(/([^\/]+)\/[^\/]+$/, "trash");
                this.m_LycosLog.Write("nsLycos.js - httpConnection - Destination " + szDestination );
                szDestination += "/" + szMsgID;
                this.m_LycosLog.Write("nsLycos.js - httpConnection - Destination " + szDestination );
                HttpRequest.setRequestHeader("Destination", szDestination , false);
            }
            
            //set authorization
            if (szAuthorization)
            {
                this.m_LycosLog.Write("nsLycos.js - httpConnection - adding szAuthorization");
                HttpRequest.setRequestHeader("Authorization", szAuthorization , false);
            } 
            
            HttpRequest.requestMethod = szType;
                       
            var listener = new this.downloadListener(callBack, this);
            channel.asyncOpen(listener, null);  
            
            this.m_LycosLog.Write("nsLycos.js - httpConnection - END"); 
            
            return true;  
        }
        catch(e)
        {
            this.m_LycosLog.DebugDump("nsLycos.js: httpConnection : Exception : " 
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
    
    
    
/******************************************************************************/
/***************** XPCOM  stuff ***********************************************/
/******************************************************************************/
    QueryInterface : function (iid)
    {
        if (!iid.equals(Components.interfaces.nsIPOPDomainHandler) 
        	                      && !iid.equals(Components.interfaces.nsISupports))
            throw Components.results.NS_ERROR_NO_INTERFACE;
            
        return this;
    }
}
 

/******************************************************************************/
/* FACTORY*/
var nsLycosFactory = new Object();

nsLycosFactory.createInstance = function (outer, iid)
{
    if (outer != null) throw Components.results.NS_ERROR_NO_AGGREGATION;
    
    if (!iid.equals(nsLycosClassID) && !iid.equals(Components.interfaces.nsISupports))
        throw Components.results.NS_ERROR_INVALID_ARG;
    
    return new nsLycos();
}


/******************************************************************************/
/* MODULE */
var nsLycosModule = new Object();

nsLycosModule.registerSelf = function(compMgr, fileSpec, location, type)
{
    compMgr = compMgr.QueryInterface(Components.interfaces.nsIComponentRegistrar);
    compMgr.registerFactoryLocation(nsLycosClassID,
                                    "LycosComponent",
                                    nsLycosContactID, 
                                    fileSpec,
                                    location, 
                                    type);
}


nsLycosModule.unregisterSelf = function(aCompMgr, aFileSpec, aLocation)
{
    aCompMgr = aCompMgr.QueryInterface(Components.interfaces.nsIComponentRegistrar);
    aCompMgr.unregisterFactoryLocation(nsLycosClassID, aFileSpec);
}

 
nsLycosModule.getClassObject = function(compMgr, cid, iid)
{
    if (!cid.equals(nsLycosClassID))
        throw Components.results.NS_ERROR_NO_INTERFACE;

    if (!iid.equals(Components.interfaces.nsIFactory))
        throw Components.results.NS_ERROR_NOT_IMPLEMENTED;

    return nsLycosFactory;
}


nsLycosModule.canUnload = function(compMgr)
{
    return true;
}
/******************************************************************************/


function NSGetModule(compMgr, fileSpec)
{
    return nsLycosModule; 
}
