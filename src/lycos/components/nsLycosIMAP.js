/*****************************  Globals   *************************************/                 
const nsLycosIMAPClassID = Components.ID("{98ceff20-9cb0-11d9-9669-0800200c9a66}"); 
const nsLycosIMAPContactID = "@mozilla.org/LycosIMAP;1";

const LycosIMAPMSGIDPattern = /[^\/]+$/;

const LycosIMAPSchema = "<?xml version=\"1.0\"?>\r\n<D:propfind xmlns:D=\"DAV:\" xmlns:h=\"http://schemas.microsoft.com/hotmail/\" xmlns:hm=\"urn:sc hemas:httpmail:\">\r\n<D:prop>\r\n<h:adbar/>\r\n<hm:contacts/>\r\n<hm:inbox/>\r\n<hm:outbox/>\r\n<hm:sendmsg/>\r\n<hm:sentitems/>\r\n<hm:deleteditems/>\r\n<hm:drafts/>\r\n<hm:msgfolderroot/>\r\n<h:maxpoll/>\r\n<h:sig/>\r\n</D:prop>\r\n</D:propfind>";
const LycosFolderIMAPSchema = "<?xml version=\"1.0\"?>\r\n<D:propfind xmlns:D=\"DAV:\" xmlns:hm=\"urn:schemas:httpmail:\">\r\n<D:prop>\r\n<D:isfolder/>\r\n<D:displayname/>\r\n<hm:special/>\r\n<D:hassubs/>\r\n<D:nosubs/>\r\n<hm:unreadcount/>\r\n<D:visiblecount/>\r\n<hm:special/>\r\n</D:prop>\r\n</D:propfind>";
const LycosMailIMAPSchema = "<?xml version=\"1.0\"?>\r\n<D:propfind xmlns:D=\"DAV:\" xmlns:hm=\"urn:schemas:httpmail:\" xmlns:m=\"urn:schemas:mailheader:\">\r\n<D:prop>\r\n<D:isfolder/>\r\n<hm:read/>\r\n<m:hasattachment/>\r\n<m:to/>\r\n<m:from/>\r\n<m:subject/>\r\n<m:date/>\r\n<D:getcontentlength/>\r\n</D:prop>\r\n</D:propfind>";
const LycosPROPReadSchema = "<?xml version=\"1.0\"?>\r\n<D:propertyupdate xmlns:D=\"DAV:\" xmlns:hm=\"urn:schemas:httpmail:\">\r\n<D:set>\r\n<D:prop>\r\n<hm:read>0</hm:read>\r\n</D:prop>\r\n</D:set>\r\n</D:propertyupdate>";
const LycosPROPUnReadSchema = "<?xml version=\"1.0\"?>\r\n<D:propertyupdate xmlns:D=\"DAV:\" xmlns:hm=\"urn:schemas:httpmail:\">\r\n<D:set>\r\n<D:prop>\r\n<hm:read>0</hm:read>\r\n</D:prop>\r\n</D:set>\r\n</D:propertyupdate>";

const LycosIMAPResponse = /<D:response>[\S\d\s\r\n]*?<\/D:response>/gm;

const LycosIMAPID = /<D:id>(.*?)<\/D:id>/i;
const LycosIMAPHref = /<D:href>(.*?)<\/D:href>/i;
const LycosIMAPRead = /<hm:read>(.*?)<\/hm:read>/i;
const LycosIMAPSize = /<D:getcontentlength>(.*?)<\/D:getcontentlength>/i;
const LycosIMAPAttachment = /<m:hasattachment>(.*?)<\/m:hasattachment>/i;
const LycosIMAPTo = /<m:to>(.*?)<\/m:to>/i;
const LycosIMAPFrom = /<m:from>(.*?)<\/m:from>/i;
const LycosIMAPSubject = /<m:subject>(.*?)<\/m:subject>/i;
const LycosIMAPDate = /<m:date>(.*?)T(.*?)<\/m:date>/i;


const LycosIMAPFolderPattern = /<hm:msgfolderroot>(.*?)<\/hm:msgfolderroot>/;
const LycosIMAPUnreadCount = /<hm:unreadcount>(.*?)<\/hm:unreadcount>/;
const LycosIMAPMsgCount = /<D:visiblecount>(.*?)<\/D:visiblecount>/;
const LycosIMAPDisplayName = /<D:displayname>(.*?)<\/D:displayname>/;
const LycosIMAPSpecial = /<hm:special>(.*?)<\/hm:special>/;

/***********************  Lycos ********************************/
function nsLycosIMAP()
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
            scriptLoader.loadSubScript("chrome://web-mail/content/common/FolderManager.js");
            scriptLoader.loadSubScript("chrome://web-mail/content/common/Folder.js");
            scriptLoader.loadSubScript("chrome://web-mail/content/common/MSG.js");
            scriptLoader.loadSubScript("chrome://web-mail/content/common/crc.js");
            scriptLoader.loadSubScript("chrome://lycos/content/base64.js");
        }
        
        var date = new Date();
        
        var  szLogFileName = "LycosIMAP Log - " + date.getHours()+ "-" + date.getMinutes() + "-"+ date.getUTCMilliseconds() +" -";
        this.m_LycosLog = new DebugLog("webmail.logging.comms", 
                                       "{3c8e8390-2cf6-11d9-9669-0800200c9a66}" ,
                                       szLogFileName); 
        
        this.m_LycosLog.Write("nsLycosIMAP.js - Constructor - START");
       
        this.m_szUserNameDomain = null;   
        this.m_szPassWord = null; 
        this.m_oResponseStream = null; 
        this.m_iTag = 0; 
        this.m_oCookies = new CookieHandler(this.m_LycosLog); 
        this.m_oFolder = new FolderManager(this.m_LycosLog);    
        this.m_bAuthorised = false;   
        this.m_szAuthRealm = null;
        this.m_iAuth = 0;
        this.m_iStage=0; 
        this.m_szFolderURI = null;
        this.m_szFolderReference = null;
        this.m_szSelectFolder = null;
        this.m_aTargetMSG = null;
        this.m_copyDest = null;
        this.m_bStoreStatus = false;
        this.m_szFolderName = null;
        this.m_szFolderNewName = null;
                                          
        this.m_LycosLog.Write("nsLycosIMAP.js - Constructor - END");
    }
    catch(e)
    {
        DebugDump("nsLycosIMAP.js: Constructor : Exception : "
                                      + e.name 
                                      + ".\nError message: " 
                                      + e.message);
    }
}



nsLycosIMAP.prototype =
{
    get userName() {return this.m_szUserNameDomain;},
    set userName(userName) {return this.m_szUserNameDomain = userName;},
    
    get passWord() {return this.m_szPassWord;},
    set passWord(passWord) {return this.m_szPassWord = passWord;},
    
    get tag() {return this.m_iTag;},
    set tag(iTag) {return this.m_iTag = iTag;},
   
   
    get bAuthorised() {return this.m_bAuthorised;},
  
    get ResponseStream() {return this.m_oResponseStream;},
    set ResponseStream(responseStream) {return this.m_oResponseStream = responseStream;},
    
       
    logIn : function()
    {
        try
        {
            this.m_LycosLog.Write("nsLycosIMAP.js - logIN - START");
            this.m_LycosLog.Write("nsLycosIMAP.js - logIN - Username: " + this.m_szUserNameDomain
                                                   + " Password: "  + this.m_szPassWord 
                                                   + " stream: "    + this.m_oResponseStream);
            
            if (!this.m_szUserNameDomain || !this.m_oResponseStream || !this.m_szPassWord) return false;
            
            var szTempUserName = this.m_szUserNameDomain.split("@");
            this.m_LycosLog.Write("nsLycosIMAP.js - logIN - doamain " + szTempUserName);
            var szDomain = szTempUserName[1];
            
            var szLocation= null;
            if (szDomain.search(/lycos.co.uk/i)!=-1) 
                szLocation= "http://webdav.lycos.co.uk/httpmail.asp";
            else if (szDomain.search(/lycos.es/i)!=-1)
                szLocation= "http://webdav.lycos.es/httpmail.asp";
            else if (szDomain.search(/lycos.de/i)!=-1)    
                szLocation= "http://webdav.lycos.de/httpmail.asp";
            else if (szDomain.search(/lycos.it/i)!=-1)    
                szLocation= "http://webdav.lycos.it/httpmail.asp";
            else if (szDomain.search(/lycos.at/i)!=-1)    
                szLocation= "http://webdav.lycos.at/httpmail.asp";  
            else if (szDomain.search(/lycos.nl/i)!=-1)    
                szLocation= "http://webdav.lycos.nl/httpmail.asp";    
            else
                throw new Error("Unknown domain");
            
            var bResult = this.httpConnection(szLocation, 
                                              "PROPFIND", 
                                              null,
                                              LycosIMAPSchema,
                                              null, 
                                              null,
                                              this.loginOnloadHandler);
                                                
            if (!bResult) throw new Error("httpConnection returned false");
            
            this.m_LycosLog.Write("nsLycosIMAP.js - logIN - END " + bResult);
            return true;
        }
        catch(e)
        {
            this.m_LycosLog.DebugDump("nsLycosIMAP.js: logIN : Exception : "
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
            mainObject.m_LycosLog.Write("nsLycosIMAP.js - loginOnloadHandler - START");
            
            mainObject.m_LycosLog.Write("nsLycosIMAP.js - loginOnloadHandler : "
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
            mainObject.m_LycosLog.Write("nsLycosIMAP.js - loginOnloadHandler - url - " + szURL + " " + szPath);
            var aszTempDomain = szURL.match(/.*?\.(.*?)$/);  
            mainObject.m_LycosLog.Write("nsLycosIMAP.js - loginOnloadHandler - domain - " + aszTempDomain[1]);
            
            //get cookies
            try
            {
                var szCookies =  httpChannel.getResponseHeader("Set-Cookie");
                mainObject.m_LycosLog.Write("nsLycosIMAP.js - loginOnloadHandler - received cookies \n" + szCookies);
                mainObject.m_oCookies.addCookie( aszTempDomain[0], szCookies); 
            }
            catch(e)
            {
                mainObject.m_LycosLog.Write("nsLycosIMAP.js - loginOnloadHandler - no cookies found");
            } 
            
            var ios=Components.classes["@mozilla.org/network/io-service;1"].
                                    getService(Components.interfaces.nsIIOService);



            //bounce handler
            if ( httpChannel.responseStatus == 302)
            {
                mainObject.m_iAuth=0; //reset login count
                try
                {
                    var szLocation =  httpChannel.getResponseHeader("Location");
                    mainObject.m_LycosLog.Write("nsLycosIMAP.js - loginOnloadHandler - location \n" + szLocation);
                }
                catch(e)
                {
                    throw new Error("Location header not found")
                } 
            
                //set cookies
                var szURL = ios.newURI(szLocation,null,null).prePath;
                var aszHost = szURL.match(/.*?\.(.*?)$/);  
                var aszCookie = mainObject.m_oCookies.findCookie(aszHost[1]);
                mainObject.m_LycosLog.Write("nsLycosIMAP.js - loginOnloadHandler - sending cookies - "+ aszCookie);
                
                var bResult = mainObject.httpConnection(szLocation, 
                                                        "PROPFIND",
                                                        null,
                                                        LycosIMAPSchema, 
                                                        aszCookie,
                                                        null,
                                                        mainObject.loginOnloadHandler);
                                            
                if (!bResult) throw new Error("httpConnection returned false");
            }
            //Authenticate
            else if  (httpChannel.responseStatus == 401)
            {
                if ( mainObject.m_iAuth==2) throw new Error("login error");
                
                try
                { 
                    var szAuthenticate =  httpChannel.getResponseHeader("www-Authenticate");
                    mainObject.m_LycosLog.Write("nsLycosIMAP.js - loginOnloadHandler - www-Authenticate " + szAuthenticate);
                    mainObject.m_iAuth++;
                }
                catch(err)
                {
                    throw new Error("szAuthenticate header not found")
                }     
                    
                //basic or digest
                if (szAuthenticate.search(/basic/i)!= -1)
                {//authentication on the cheap
                    mainObject.m_LycosLog.Write("nsLycosIMAP.js - loginOnloadHandler - basic Authenticate");
                   
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
                                                    LycosIMAPSchema, 
                                                    aszCookie,
                                                    null,
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
                mainObject.m_LycosLog.Write("nsLycosIMAP.js - loginOnloadHandler - get url - start");
                mainObject.m_iAuth=0; //reset login counter
                mainObject.m_szFolderURI = szResponse.match(LycosIMAPFolderPattern)[1];
                mainObject.m_LycosLog.Write("nsLycosIMAP.js - loginOnloadHandler - get folder url - " + mainObject.m_szFolderURI);
              
                //server response
                mainObject.serverComms(mainObject.m_iTag +" OK Login Complete\r\n");
                mainObject.m_bAuthorised = true;
                        
                mainObject.m_LycosLog.Write("nsLycosIMAP.js - loginOnloadHandler - get url - end");
            }
           
            mainObject.m_LycosLog.Write("nsLycosIMAP.js - loginOnloadHandler - END");
        }
        catch(err)
        {
            mainObject.m_LycosLog.DebugDump("nsLycosIMAP.js: loginHandler : Exception : "
                                          + err.name 
                                          + ".\nError message: " 
                                          + err.message);
                                              
            mainObject.serverComms(mainObject.m_iTag + " NO Comms Error\r\n");
        }
    },
    
    
    subscribe : function (szFolder)
    {
        try
        {
            this.m_LycosLog.Write("nsLycosIMAP.js - subscribe - START");
            this.m_LycosLog.Write("nsLycosIMAP.js - subscribe - Username: " + this.m_szUserNameDomain +
                                                                    " szFolder " + szFolder);
                                                                    
            if (!this.m_szUserNameDomain && !szFolder) return false;
            
            var oPref = new Object();
            oPref.Value = null;
            
            var szSubList = "";
            var  WebMailPrefAccess = new WebMailCommonPrefAccess();
            if (WebMailPrefAccess.Get("char","lycos.imap.subscribed."+this.m_szUserNameDomain,oPref))
                szSubList = oPref.Value;
            this.m_LycosLog.Write("nsLycosIMAP.js - Subscribe - old list: " + szSubList);
             
            szSubList +=  szFolder + "\r\n";
            this.m_LycosLog.Write("nsLycosIMAP.js - Subscribe - new list: " + szSubList);
            WebMailPrefAccess.Set("char","lycos.imap.subscribed."+this.m_szUserNameDomain,szSubList);
            
            var szResponse = this.m_iTag + " OK SUBSCRIBE Completed\r\n";
            this.serverComms(szResponse);  
            
            this.m_LycosLog.Write("nsLycosIMAP.js - subscribe - END");
        }
        catch(err)
        {
             this.m_LycosLog.DebugDump("nsLycosIMAP.js: subscribe : Exception : "
                                          + err.name 
                                          + ".\nError message: " 
                                          + err.message);
                                              
            this.serverComms(this.m_iTag + " NO Comms Error\r\n");
        }
    },
    
    
    unSubscribe : function (szFolder)
    {
        try
        {
            this.m_LycosLog.Write("nsLycosIMAP.js - unSubscribe - START");
            this.m_LycosLog.Write("nsLycosIMAP.js - unSubscribe - Username: " + this.m_szUserNameDomain +
                                                                " Folder " + szFolder );
                
            if (!this.m_szUserNameDomain && !szFolder) return false;
            
            var oPref = new Object();
            oPref.Value = null;
            var bFound = false;  
            var szSubscribed = ""; 
            var reg = new RegExp (szFolder,"i");
            var  WebMailPrefAccess = new WebMailCommonPrefAccess();
            if (WebMailPrefAccess.Get("char","lycos.imap.subscribed."+this.m_szUserNameDomain,oPref))
            {
                var aszFolder = oPref.Value.split("\r\n");
                this.m_LycosLog.Write("nsLycosIMAP.js - unSubscribe - list: " + aszFolder);
                
                var iLenght = aszFolder.length-1;
                for (i=0; i<iLenght; i++)
                {
                    var temp = aszFolder.shift();  //get first item
                    this.m_LycosLog.Write("nsLycosIMAP.js - unSubscribe " + i + " "+ temp);
                       
                    this.m_LycosLog.Write("nsLycosIMAP.js - unSubscribe reg " + reg);
                    if (temp.search(reg)!=-1)
                    { 
                        this.m_LycosLog.Write("nsLycosIMAP.js - unSubscribe - found");
                        bFound = true;  
                    }
                    else
                    {
                        this.m_LycosLog.Write("nsLycosIMAP.js - unSubscribe - not found");
                        szSubscribed += temp + "\r\n"; 
                    }
                } 
                this.m_LycosLog.Write("nsLycosIMAP.js - unSubscribe -list - " + szSubscribed );
                WebMailPrefAccess.Set("char","lycos.imap.subscribed."+this.m_szUserNameDomain,szSubscribed);
            }
            
            var szResponse;
            if (!bFound) 
                szResponse = this.m_iTag + " NO UNSUBCRIBE Completed\r\n";
            else
                szResponse = this.m_iTag + " OK UNSUBCRIBE Completed\r\n";
                
            this.serverComms(szResponse);  
            
            this.m_LycosLog.Write("nsLycosIMAP.js - unSubscribe - END");
        }
        catch(err)
        {
            this.m_LycosLog.DebugDump("nsLycosIMAP.js: unSubscribe : Exception : "
                                      + err.name 
                                      + ".\nError message: " 
                                      + err.message);
            this.serverComms(this.m_iTag +" BAD error\r\n");  
            return false;
        }
    },
    
    
    listSubscribe : function()
    {
        try
        {
            this.m_LycosLog.Write("nsLycosIMAP.js - listSubscribe - START");
            this.m_LycosLog.Write("nsLycosIMAP.js - listSubscribe - Username: " + this.m_szUserNameDomain);
                
            if (!this.m_szUserNameDomain) return false;
            
            var oPref = new Object();
            oPref.Value = null;
            
            var szResponse = "";
            var  WebMailPrefAccess = new WebMailCommonPrefAccess();
            if (WebMailPrefAccess.Get("char","lycos.imap.subscribed."+this.m_szUserNameDomain,oPref))
            {
                var aszFolder = oPref.Value.split("\r\n");
                this.m_LycosLog.Write("nsLycosIMAP.js - listSubscribe - list: " + aszFolder);
                
                for (i=0; i<aszFolder.length-1; i++)
                {
                    szResponse += "* lsub (\\Noinferiors \\HasNoChildren) " + "\".\" \"" + aszFolder[i] + "\"\r\n";  
                } 
            }
            
            szResponse += this.m_iTag + " OK LSUB Completed\r\n";
            this.serverComms(szResponse);  
            
            
            this.m_LycosLog.Write("nsLycosIMAP.js - listSubscribe - END");
            return true;
        }
        catch(err)
        {
            this.m_LycosLog.DebugDump("nsLycosIMAP.js: listSubscribe : Exception : "
                                      + err.name 
                                      + ".\nError message: " 
                                      + err.message);
            this.serverComms(this.m_iTag +" BAD error\r\n");  
            return false;
        }
    },   
    
    
    
    list : function (szReference)
    {
        try
        {
            this.m_LycosLog.Write("nsLycosIMAP.js - list - START");
              
            if (this.m_szFolderURI == null) return false;
            this.m_LycosLog.Write("nsLycosIMAP.js - list - mail box url " + this.m_szFolderURI);
            
            this.m_szFolderReference = szReference;
            this.m_LycosLog.Write("nsLycosIMAP.js - list - mail box url " + this.m_oFolder.getFolderCount());
            if (this.m_oFolder.getFolderCount() == 0) //load list of folders
            {
                var ios=Components.classes["@mozilla.org/network/io-service;1"].
                                        getService(Components.interfaces.nsIIOService);
                                        
                //set cookies
                var szURL = ios.newURI(this.m_szFolderURI,null,null).prePath;
                var aszHost = szURL.match(/.*?\.(.*?)$/); 
                var aszCookie = this.m_oCookies.findCookie(aszHost[1]);
                this.m_LycosLog.Write("nsLycosIMAP.js - list - cookies - "+ aszCookie);
                
                var bResult = this.httpConnection(this.m_szFolderURI, 
                                                  "PROPFIND", 
                                                  this.m_szAuthString,
                                                  LycosFolderIMAPSchema, 
                                                  aszCookie, 
                                                  null,
                                                  this.listOnloadHandler);  
                                                  
                if (!bResult) throw new Error("httpConnection returned false");
            }
            else
            {
                //construct server response
                this.listResponse();            
            }
                  
            this.m_LycosLog.Write("nsLycosIMAP.js - list - END");
            return true;
        }
        catch(err)
        {
            this.m_LycosLog.DebugDump("nsLycosIMAP.js: list : Exception : "
                                      + err.name 
                                      + ".\nError message: " 
                                      + err.message);
                                      
            this.serverComms(this.m_iTag +" BAD error\r\n");  
            return false;
        }    
    },
    
  
    
    listOnloadHandler : function (szResponse ,event , mainObject)
    {
        try
        {
            mainObject.m_LycosLog.Write("nsLycosIMAP.js - listOnloadHandler - START");
            mainObject.m_LycosLog.Write("nsLycosIMAP.js - listOnloadHandler :\n"+ szResponse);  
            
            var httpChannel = event.QueryInterface(Components.interfaces.nsIHttpChannel);
            
            //if this fails we've gone somewhere new
            mainObject.m_LycosLog.Write("nsLycos - listOnloadHandler - status :" +httpChannel.responseStatus );
            if (httpChannel.responseStatus != 200 && httpChannel.responseStatus != 207) 
                throw new Error("return status " + httpChannel.responseStatus);
            
            var szPath = httpChannel.URI.spec;
            var szURL = httpChannel.URI.host;
            mainObject.m_LycosLog.Write("nsLycosIMAP.js - listOnloadHandler - url - " + szURL + " " + szPath);
            var aszTempDomain = szURL.match(/.*?\.(.*?)$/);  
            mainObject.m_LycosLog.Write("nsLycosIMAP.js - listOnloadHandler - domain - " + aszTempDomain[1]);
            
            //get cookies
            try
            {
                var szCookies =  httpChannel.getResponseHeader("Set-Cookie");
                mainObject.m_LycosLog.Write("nsLycosIMAP.js - listOnloadHandler - received cookies \n" + szCookies);
                mainObject.m_oCookies.addCookie( aszTempDomain[1], szCookies); 
            }
            catch(e)
            {
                mainObject.m_LycosLog.Write("nsLycosIMAP.js - listOnloadHandler - no cookies found");
            } 
            
                                       
            //get root folders
            mainObject.m_LycosLog.Write("nsLycosIMAP.js - listOnloadHandler - get root folder list - START");
            
            var aszResponses = szResponse.match(LycosIMAPResponse);
            mainObject.m_LycosLog.Write("nsLycosIMAP.js - listOnloadHandler - folders - \n" + aszResponses);
            for (i=0; i<aszResponses.length; i++)
            {
                var szHref = aszResponses[i].match(LycosIMAPHref)[1];
                
                var szDisplayName = null;
                try
                {
                    szDisplayName = aszResponses[i].match(LycosIMAPDisplayName)[1];
                }
                catch(e)
                {
                    szDisplayName = aszResponses[i].match(LycosIMAPSpecial)[1];
                }
                
                var iUnReadCount = parseInt(aszResponses[i].match(LycosIMAPUnreadCount)[1]);
                var iMsgCount =  parseInt(aszResponses[i].match(LycosIMAPMsgCount)[1]);
                var iUID = parseInt(Hex16(Crc16Str(szHref)));
                
                var szHiererchy = null;
                if (szHref.search(/inbox/i)!=-1)
                {
                    szHiererchy = "INBOX";
                }
                else if (szHref.search(/trash/i)!=-1)
                {
                    szHiererchy = "INBOX.Trash"
                }
                else
                {//not inbox
                    szHiererchy = "INBOX." + szDisplayName;
                } 
               
                
                mainObject.m_oFolder.addFolder(szHiererchy, iUID, szHref, szDisplayName, iMsgCount,iUnReadCount);
            }
            
            mainObject.listResponse();          
            mainObject.m_LycosLog.Write("nsLycosIMAP.js - listOnloadHandler - END");
        }
        catch(err)
        {
             mainObject.m_LycosLog.DebugDump("nsLycosIMAP.js: listOnloadHandler : Exception : "
                                              + err.name 
                                              + ".\nError message: " 
                                              + err.message);
            
             mainObject.serverComms(mainObject.m_iTag +" BAD error\r\n");
        }
    },
    
    
    
    
    listResponse : function ()
    {
        try
        {
            this.m_LycosLog.Write("nsLycosIMAP.js - listResponse - START");
            
            var aResult = this.m_oFolder.getFolders(this.m_szFolderReference);
            
            var aResponse = "";
            if (aResult!= null)
            {
                for (i=0; i<aResult.length; i++ )
                {
                    aResponse+= "* LIST (\\Noinferiors \\HasNoChildren) \".\" \"" + aResult[i].getHierarchy() +"\"\r\n";
                } 
                
                aResponse+= this.m_iTag + " OK LIST COMPLETE\r\n"
            }
            else
            {
                aResponse+= this.m_iTag + " NO LIST COMPLETE\r\n"
            }
                       
           
            this.serverComms(aResponse);
            
            this.m_LycosLog.Write("nsLycosIMAP.js - listResponse - END");
        }
        catch(err)
        {
            this.m_LycosLog.DebugDump("nsLycosIMAP.js: listResponse : Exception : "
                                      + err.name 
                                      + ".\nError message: " 
                                      + err.message);
                                      
            this.serverComms(this.m_iTag +" BAD error\r\n"); 
        }
    },
    
    
    
    select : function (szReference)
    {
        try
        {
            this.m_LycosLog.Write("nsLycosIMAP.js - select - START");
              
            if (this.m_szFolderURI == null) return false;
                       
            this.m_szSelectFolder = szReference;
                       
            var ios=Components.classes["@mozilla.org/network/io-service;1"].
                                    getService(Components.interfaces.nsIIOService);
            
            var bResult = false;
            this.m_LycosLog.Write("nsLycosIMAP.js - select - num folders " + this.m_oFolder.getFolderCount());
            if (this.m_oFolder.getFolderCount() == 0) //load list of folders
            {
                this.m_LycosLog.Write("nsLycosIMAP.js - select - folders not found");
                                                       
                //set cookies
                var szURL = ios.newURI(this.m_szFolderURI,null,null).prePath;
                var aszHost = szURL.match(/.*?\.(.*?)$/); 
                var aszCookie = this.m_oCookies.findCookie(aszHost[1]);
                this.m_iStage=0;
                bResult = this.httpConnection(this.m_szFolderURI, 
                                              "PROPFIND", 
                                              this.m_szAuthString,
                                              LycosFolderIMAPSchema, 
                                              aszCookie, 
                                              null,
                                              this.selectOnloadHandler);
            }
            else
            {
                this.m_LycosLog.Write("nsLycosIMAP.js - select - folder found");
                var aTarget = this.m_oFolder.getFolders(this.m_szSelectFolder);
                var szTargetURL = aTarget[0].getHref();
                          
                //set cookies
                var szURL = ios.newURI(szTargetURL,null,null).prePath;
                var aszHost = szURL.match(/.*?\.(.*?)$/); 
                var aszCookie = this.m_oCookies.findCookie(aszHost[1]);            
                this.m_iStage = 1;
                bResult = this.httpConnection(szTargetURL, 
                                              "PROPFIND", 
                                              this.m_szAuthString,
                                              LycosMailIMAPSchema, 
                                              aszCookie, 
                                              null,
                                              this.selectOnloadHandler);  
            }
                                             
            if (!bResult) throw new Error("httpConnection returned false");
                                       
            this.m_LycosLog.Write("nsLycosIMAP.js - select - END");
            return true;
        }
        catch(err)
        {
            this.m_LycosLog.DebugDump("nsLycosIMAP.js: select : Exception : "
                                      + err.name 
                                      + ".\nError message: " 
                                      + err.message);
                                      
            this.serverComms(this.m_iTag +" BAD error\r\n"); 
            return false;
        }
    },
    
    
    
    selectOnloadHandler : function (szResponse ,event , mainObject)
    {
        try
        {
            mainObject.m_LycosLog.Write("nsLycosIMAP.js - selectOnloadHandler - START");
            
            mainObject.m_LycosLog.Write("nsLycosIMAP.js - selectOnloadHandler : "
                                         + mainObject.m_iStage + "\n"
                                         + szResponse);  
            
            var httpChannel = event.QueryInterface(Components.interfaces.nsIHttpChannel);
            
            //if this fails we've gone somewhere new
            mainObject.m_LycosLog.Write("nsLycos - selectOnloadHandler - status :" +httpChannel.responseStatus );
            if (httpChannel.responseStatus != 200 && httpChannel.responseStatus != 207) 
                throw new Error("return status " + httpChannel.responseStatus);
            
            var szPath = httpChannel.URI.spec;
            var szURL = httpChannel.URI.host;
            mainObject.m_LycosLog.Write("nsLycosIMAP.js - selectOnloadHandler - url - " + szURL + " " + szPath);
            var aszTempDomain = szURL.match(/.*?\.(.*?)$/);  
            mainObject.m_LycosLog.Write("nsLycosIMAP.js - selectOnloadHandler - domain - " + aszTempDomain[1]);
            
            //get cookies
            try
            {
                var szCookies =  httpChannel.getResponseHeader("Set-Cookie");
                mainObject.m_LycosLog.Write("nsLycosIMAP.js - selectOnloadHandler - received cookies \n" + szCookies);
                mainObject.m_oCookies.addCookie( aszTempDomain[1], szCookies); 
            }
            catch(e)
            {
                mainObject.m_LycosLog.Write("nsLycosIMAP.js - selectOnloadHandler - no cookies found");
            } 
            
            switch( mainObject.m_iStage)
            {
                case 0:   //folder list
                    mainObject.m_LycosLog.Write("nsLycosIMAP.js - selectOnloadHandler - get folder list - START");
                    
                    var aszResponses = szResponse.match(LycosIMAPResponse);
                    mainObject.m_LycosLog.Write("nsLycosIMAP.js - selectOnloadHandler - folders - \n" + aszResponses);
                    for (i=0; i<aszResponses.length; i++)
                    {
                        var szHref = aszResponses[i].match(LycosIMAPHref)[1];
                        
                        var szDisplayName = null;
                        try
                        {
                            szDisplayName = aszResponses[i].match(LycosIMAPDisplayName)[1];
                        }
                        catch(e)
                        {
                            szDisplayName = aszResponses[i].match(LycosIMAPSpecial)[1];
                        }
                        
                        var iUnReadCount = parseInt(aszResponses[i].match(LycosIMAPUnreadCount)[1]);
                        var iMsgCount =  parseInt(aszResponses[i].match(LycosIMAPMsgCount)[1]);
                        var iUID = parseInt(Hex16(Crc16Str(szHref)));
                        
                        var szHiererchy = null;
                        if (szHref.search(/inbox/i)!=-1)
                        {
                            szHiererchy = "INBOX";
                        }
                        else if (szHref.search(/trash/i)!=-1)
                        {
                            szHiererchy = "INBOX.Trash"
                        }
                        else
                        {//not inbox
                            szHiererchy = "INBOX." + szDisplayName;
                        } 
                       
                        mainObject.m_oFolder.addFolder(szHiererchy, iUID, szHref, szDisplayName, iMsgCount,iUnReadCount);
                    }
                                    
                    var aTarget = mainObject.m_oFolder.getFolders(mainObject.m_szSelectFolder);
                    mainObject.m_LycosLog.Write("nsLycosIMAP.js - selectOnloadHandler - folder found");
                    var szTargetURL = aTarget[0].getHref();
                              
                    //set cookies
                    var ios=Components.classes["@mozilla.org/network/io-service;1"].
                                    getService(Components.interfaces.nsIIOService);
                    var szURL = ios.newURI(szTargetURL,null,null).prePath;
                    var aszHost = szURL.match(/.*?\.(.*?)$/); 
                    var aszCookie = mainObject.m_oCookies.findCookie(aszHost[1]);            
                    mainObject.m_iStage = 1;
                    var bResult = mainObject.httpConnection(szTargetURL, 
                                                          "PROPFIND", 
                                                          mainObject.m_szAuthString,
                                                          LycosMailIMAPSchema, 
                                                          aszCookie, 
                                                          null,
                                                          mainObject.selectOnloadHandler);  
                                                      
                    if (!bResult) throw new Error("httpConnection returned false");
                    
                    mainObject.m_LycosLog.Write("nsLycosIMAP.js - selectOnloadHandler - get folder list - END");
                break;
                
                case 1:  //message headers
                    mainObject.m_LycosLog.Write("nsLycosIMAP.js - selectOnloadHandler - get msg list - START");
                     
                    //reset msg count;
                    var aTarget = mainObject.m_oFolder.getFolders(mainObject.m_szSelectFolder);
                    aTarget[0].removeAllMSG();
                    
                    //get uid list
                    var aszResponses = szResponse.match(LycosIMAPResponse);
                    mainObject.m_LycosLog.Write("nsLycosIMAP.js - selectOnloadHandler - \n" + aszResponses);
                    if (aszResponses)
                    {
                        
                        for (i=0; i<aszResponses.length; i++)
                        {
                            var newMSG = new Msg();
                       
                            var szHref = aszResponses[i].match(LycosIMAPHref)[1];
                            mainObject.m_LycosLog.Write("nsLycosIMAP.js - selectOnloadHandler - href " + szHref);
                            newMSG.setHref(szHref);
                       
                           // var  iUID = parseInt(Hex16(Crc16Str(szHref)));
                            var iUID = parseInt(szHref.match(/MSG(.*?)$/)[1]);
                            mainObject.m_LycosLog.Write("nsLycosIMAP.js - selectOnloadHandler - uid " + iUID);
                            newMSG.setUID(iUID);
                       
                            var bRead= parseInt(aszResponses[i].match(LycosIMAPRead)[1]);
                            mainObject.m_LycosLog.Write("nsLycosIMAP.js - selectOnloadHandler - read " + bRead);
                            newMSG.setRead(bRead);
                           
                            var szTO;
                            try
                            {
                               szTO = aszResponses[i].match(LycosIMAPTo)[1].match(/[\S\d]*@[\S\d]*/);
                            }
                            catch(e)
                            {
                                szTO = aszResponses[i].match(LycosIMAPTo)[1];
                            }
                            mainObject.m_LycosLog.Write("nsLycosIMAP.js - selectOnloadHandler - to " + "<"+szTO+">");
                            newMSG.setTo("<"+szTO+">");
                            
                            var szFROM;
                            try
                            {
                                szFROM = aszResponses[i].match(LycosIMAPFrom)[1].match(/[\S\d]*@[\S\d]*/);
                            }
                            catch(e)
                            {
                                szFROM = aszResponses[i].match(LycosIMAPFrom)[1];
                            }
                            mainObject.m_LycosLog.Write("nsLycosIMAP.js - selectOnloadHandler - from " + "<"+szFROM+">");
                            newMSG.setFrom("<"+szFROM+">");
                            
                            var szSubject= aszResponses[i].match(LycosIMAPSubject)[1];
                            mainObject.m_LycosLog.Write("nsLycosIMAP.js - selectOnloadHandler - subject " + szSubject);
                            newMSG.setSubject(szSubject);
                            
                            var aszDate = aszResponses[i].match(LycosIMAPDate);
                            mainObject.m_LycosLog.Write("nsLycosIMAP.js - selectOnloadHandler - date " + aszDate);
                            newMSG.setDate(aszDate[1]);
                            newMSG.setTime(aszDate[2]);
                            
                            var bAttach = aszResponses[i].match(LycosIMAPAttachment)[1];
                            mainObject.m_LycosLog.Write("nsLycosIMAP.js - selectOnloadHandler - attach " + bAttach);
                            newMSG.setAttach(bAttach);
                            
                            var iSize = parseInt(aszResponses[i].match(LycosIMAPSize)[1]);
                            mainObject.m_LycosLog.Write("nsLycosIMAP.js - selectOnloadHandler - size " + iSize);
                            newMSG.setSize(iSize);
                            
                            aTarget[0].addMsg(newMSG);
                           
                        }
                    }
                    
                    //send select ok message back to TB
                    var szSelectResponse= "* " +  aTarget[0].getMsgCount() + " EXISTS\r\n";
                    szSelectResponse+= "* " + aTarget[0].getUnreadMsgCount() + " RECENT\r\n";
                    szSelectResponse+= "* OK [UIDVALIDITY " + aTarget[0].getUID() + "] UIDs\r\n";
                    szSelectResponse+= "* FLAGS (\\Seen \\Deleted)\r\n";
                    szSelectResponse+= "* OK [PERMANENTFLAGS (\Seen)] Limited\r\n";
                    szSelectResponse+= mainObject.m_iTag +" OK [READ-WRITE] SELECT COMPLETE\r\n"; 
                    mainObject.serverComms(szSelectResponse);
                    
                    mainObject.m_oFolder.updateFolder(aTarget[0]); 
                    mainObject.m_LycosLog.Write("nsLycosIMAP.js - selectOnloadHandler - get msg list - END");
                break;
            }
            
            mainObject.m_LycosLog.Write("nsLycosIMAP.js - selectOnloadHandler - END");
        }
        catch(err)
        {
             mainObject.m_LycosLog.DebugDump("nsLycosIMAP.js: selectOnloadHandler : Exception : "
                                              + err.name 
                                              + ".\nError message: " 
                                              + err.message);
            
             mainObject.serverComms(mainObject.m_iTag +" BAD error\r\n");
        }
    },
    
    
  
  
    
    fetch : function (szRange, szFlag)
    {
        try
        {
            this.m_LycosLog.Write("nsLycosIMAP.js - fetch - START");
            this.m_LycosLog.Write("nsLycosIMAP.js - fetch - Range " + szRange + " Flags "+ szFlag);
          
            if (szFlag.search(/Header/i)!=-1)
            {
                this.m_LycosLog.Write("nsLycosIMAP.js - fetch - headers ");
                this.fetchHeaders(szRange); 
            }
            else if (szFlag.search(/Body/i)!=-1)
            {
                this.m_LycosLog.Write("nsLycosIMAP.js - fetch - body ");
                this.fetchBody(szRange); 
            }
            else  //get message ids
            {
                this.m_LycosLog.Write("nsLycosIMAP.js - fetch - ids ");
                this.fetchIDs(szRange); 
            }                 
            
            this.m_LycosLog.Write("nsLycosIMAP.js - fetch - END");
            return true;
        }
        catch(err)
        {
             this.m_LycosLog.DebugDump("nsLycosIMAP.js: fetch : Exception : "
                                              + err.name 
                                              + ".\nError message: " 
                                              + err.message);
            
             this.serverComms(this.m_iTag +" BAD error\r\n");
             return false;
        }
    },
    
    
    
    fetchIDs : function (szRange)
    {
        try
        {
            this.m_LycosLog.Write("nsLycosIMAP.js - fetchIDs - START");
            this.m_LycosLog.Write("nsLycosIMAP.js - fetchIDs - range " + szRange);
            
            //spilt range
            var aszRange = szRange.split(":");
            this.m_LycosLog.Write("nsLycosIMAP.js - fetchIDs - range " + aszRange);
            var iStart = parseInt( aszRange[0]);
            this.m_LycosLog.Write("nsLycosIMAP.js - fetchIDs - start " + iStart);
            var iEnd = -1;
            if (aszRange[1] != "*") iEnd = parseInt( aszRange[1]);
            this.m_LycosLog.Write("nsLycosIMAP.js - fetchIDs - end " + iEnd);
             
            //get messages
            var aTarget = this.m_oFolder.getMsgsUID(this.m_szSelectFolder, iStart, iEnd);
            var szResponse = "";
            if (aTarget)
            {
                if (aTarget.length>0)
                {
                    for (i=0; i<aTarget.length; i++)
                    {
                        szResponse += "* "+aTarget[i].getIndex()+ " FETCH (FLAGS (";
                        szResponse += (aTarget[i].getRead())?"\\Seen":"\\Recent" ; //flags
                        szResponse += ") UID " + aTarget[i].getUID()+ ")\r\n"; 
                    }
                }
            }
            szResponse+= this.m_iTag +" UID FETCH complete\r\n"
            this.serverComms(szResponse); 
            
            this.m_LycosLog.Write("nsLycosIMAP.js - fetchIDs - END");
            return true; 
        }
        catch(err)
        {
             this.m_LycosLog.DebugDump("nsLycosIMAP.js: fetchIDs : Exception : "
                                              + err.name 
                                              + ".\nError message: " 
                                              + err.message);
            
             this.serverComms(this.m_iTag +" BAD error\r\n");
             return false;
        }
    },
    
    
    
    fetchHeaders : function (szRange)
    {
        try
        {
            this.m_LycosLog.Write("nsLycosIMAP.js - fetchHeaders - START");
            this.m_LycosLog.Write("nsLycosIMAP.js - fetchHeaders - ranger " + szRange);
            
            //get range
            var aRange;
            if (szRange.indexOf(",")!=-1)
            {
                aRange = szRange.split(",");  
            }
            else
                aRange = new Array(szRange);
            
            this.m_LycosLog.Write("nsLycosIMAP.js - fetchHeaders - range array" + aRange + " length "+aRange.length);
            
            //get headers
            var aTarget = new Array();           
            
            for(k=0 ; k<aRange.length; k++)
            {
                var aTemp;
                
                if (aRange[k].search(/:/)!=-1)
                {
                    //spilt range
                    var aszTempRange = aRange[k].split(":");
                    this.m_LycosLog.Write("nsLycosIMAP.js - fetchHeaders - range " + aszTempRange);
                    var iStart = parseInt( aszTempRange[0]);
                    this.m_LycosLog.Write("nsLycosIMAP.js - fetchHeaders - start " + iStart);
                    var iEnd = -1;
                    if (aszTempRange[1] != "*") iEnd = parseInt( aszTempRange[1]);
                    this.m_LycosLog.Write("nsLycosIMAP.js - fetchHeaders - end " + iEnd);
                     
                    //get messages
                    aTemp = this.m_oFolder.getMsgsUID(this.m_szSelectFolder, iStart, iEnd);
                }
                else
                {
                    var iID = parseInt(aRange[k]);
                    aTemp = this.m_oFolder.getMsgsUID(this.m_szSelectFolder, iID, iID );
                }
                
                if (aTemp) aTarget = aTarget.concat(aTemp);
            }
           
            //send headers to server
            var szResponse = "";
            this.m_LycosLog.Write("nsLycosIMAP.js - fetchHeaders - Target lenght " + aTarget.length);
            
            if (aTarget.length>0)
            {
                for (i=0; i<aTarget.length; i++)
                {
                    var szTemp = "To: "+ aTarget[i].getTo() + "\r\n";
                    szTemp += "From: "+ aTarget[i].getFrom() + "\r\n";
                    szTemp += "Subject: "+ aTarget[i].getSubject() + "\r\n";
                    
                    var aszDate = aTarget[i].getDate().split("-");
                    var aszTime = aTarget[i].getTime().split(":");
                    
                    var d = new Date(parseInt(aszDate[0]),  //year
                                     parseInt(aszDate[1])-1,  //month
                                     parseInt(aszDate[2]),  //day
                                     parseInt(aszTime[0]),  //hour
                                     parseInt(aszTime[1]),  //minute
                                     parseInt(aszTime[2]));  //second
                    szTemp += "Date: "+ d.toGMTString() + "\r\n";
                   
                   
                    szResponse += "* "+aTarget[i].getIndex();
                    szResponse += " FETCH (UID "+ aTarget[i].getUID(); //id
                    szResponse += " RFC822.SIZE " +aTarget[i].getSize(); //size
                    szResponse += " FLAGS (" +((aTarget[i].getRead())?"\\Seen":"\\Recent") + ")" ; //flags
                    szResponse += " BODY[HEADER] ";
                    szResponse += "{" + szTemp.length + "}\r\n";
                    szResponse += szTemp + ")\r\n"; 
                }
            }
           
            szResponse+= this.m_iTag +" OK UID FETCH complete\r\n"
            this.serverComms(szResponse); 
            
            this.m_LycosLog.Write("nsLycosIMAP.js - fetchHeaders - END");
            return true; 
        }
        catch(err)
        {
             this.m_LycosLog.DebugDump("nsLycosIMAP.js: fetchHeaders : Exception : "
                                              + err.name 
                                              + ".\nError message: " 
                                              + err.message);
            
             this.serverComms(this.m_iTag +" BAD error\r\n");
             return false;
        }
    },
    
    
    fetchBody : function (szRange)
    {
        try
        {
            this.m_LycosLog.Write("nsLycosIMAP.js - fetchBody - START"); 
            this.m_LycosLog.Write("nsLycosIMAP.js - fetchBody - range " + szRange);
            
            this.m_iStage = 0;
            
            var iID = parseInt(szRange);
            var aTarget = this.m_oFolder.getMsgsUID(this.m_szSelectFolder, iID, iID );
          
            var ios=Components.classes["@mozilla.org/network/io-service;1"].
                                    getService(Components.interfaces.nsIIOService);
            
            //set cookies
            var szURL = ios.newURI(aTarget[0].getHref(),null,null).prePath;
            var aszHost = szURL.match(/.*?\.(.*?)$/); 
            var aszCookie = this.m_oCookies.findCookie(aszHost[1]);
            this.m_iStage=0;
            bResult = this.httpConnection(aTarget[0].getHref(), 
                                          "GET", 
                                          this.m_szAuthString,
                                          null, 
                                          aszCookie, 
                                          null,
                                          this.fetchBodyOnloadHandler);
                                          
            if (!bResult) throw new Error("httpConnection returned false");
            
            this.m_LycosLog.Write("nsLycosIMAP.js - fetchBody - END");
            return true; 
        }
        catch(err)
        {
            this.m_LycosLog.DebugDump("nsLycosIMAP.js: fetchBody : Exception : "
                                              + err.name 
                                              + ".\nError message: " 
                                              + err.message);
            
            this.serverComms(this.m_iTag +" BAD error\r\n");
            return false;
        }
    },
    
    
    
    fetchBodyOnloadHandler : function (szResponse ,event , mainObject)
    {
        try
        {
            mainObject.m_LycosLog.Write("nsLycosIMAP.js - fetchBodyOnloadHandler - START");
            
            mainObject.m_LycosLog.Write("nsLycosIMAP.js - fetchBodyOnloadHandler : "
                                         + mainObject.m_iStage + "\n"
                                         + szResponse);  
            
            var httpChannel = event.QueryInterface(Components.interfaces.nsIHttpChannel);
            
            //if this fails we've gone somewhere new
            mainObject.m_LycosLog.Write("nsLycos - fetchBodyOnloadHandler - status :" +httpChannel.responseStatus );
            if (httpChannel.responseStatus != 200 && httpChannel.responseStatus != 207) 
                throw new Error("return status " + httpChannel.responseStatus);
            
            var szPath = httpChannel.URI.spec;
            var szURL = httpChannel.URI.host;
            mainObject.m_LycosLog.Write("nsLycosIMAP.js - fetchBodyOnloadHandler - url - " + szURL + " " + szPath);
            var aszTempDomain = szURL.match(/.*?\.(.*?)$/);  
            mainObject.m_LycosLog.Write("nsLycosIMAP.js - fetchBodyOnloadHandler - domain - " + aszTempDomain[1]);
            
            //get cookies
            try
            {
                var szCookies =  httpChannel.getResponseHeader("Set-Cookie");
                mainObject.m_LycosLog.Write("nsLycosIMAP.js - fetchBodyOnloadHandler - received cookies \n" + szCookies);
                mainObject.m_oCookies.addCookie( aszTempDomain[1], szCookies); 
            }
            catch(e)
            {
                mainObject.m_LycosLog.Write("nsLycosIMAP.js - fetchBodyOnloadHandler - no cookies found");
            } 
            
            var iUID = parseInt(szPath.match(/MSG(.*?)$/)[1]);
            //var iUID = parseInt(Hex16(Crc16Str(szPath)));   
            var aTarget = mainObject.m_oFolder.getMsgsUID(mainObject.m_szSelectFolder, iUID, iUID );       
            var szMsg = "* " + aTarget[0].getIndex() +" FETCH (UID " + iUID ; //id
            szMsg += " RFC822.SIZE " + szResponse.length ; //size
            szMsg += " BODY[] ";
            szMsg += "{" + szResponse.length + "}\r\n";
            szMsg += szResponse + ")\r\n"; 
            szMsg += "* FETCH (FLAGS (\\Seen "+ ((aTarget[0].getRead())?"":"\\Recent")+ "))\r\n"
            szMsg += mainObject.m_iTag +" OK UID FETCH complete\r\n"
            mainObject.serverComms(szMsg); 
            
            mainObject.m_oFolder.setMsgSeenFlag(mainObject.m_szSelectFolder, iUID , true );
            
            mainObject.m_LycosLog.Write("nsLycosIMAP.js - fetchBodyOnloadHandler - END");
            return true;
        }
        catch(err)
        {
            mainObject.m_LycosLog.DebugDump("nsLycosIMAP.js: fetchBodyOnloadHandler : Exception : "
                                              + err.name 
                                              + ".\nError message: " 
                                              + err.message);
            
            mainObject.serverComms(mainObject.m_iTag +" BAD error\r\n");
            return false;
        }
    },
    
    
    copy : function (szRange, szDestination)
    {
        try
        {
            this.m_LycosLog.Write("nsLycosIMAP.js - copy - START");
            this.m_LycosLog.Write("nsLycosIMAP.js - copy - range " + szRange + " destination " + szDestination);
            
            //construct range
            var aRange;
            if (szRange.indexOf(",")!=-1)
            {
                aRange = szRange.split(",");  
            }
            else
                aRange = new Array(szRange);
            
            this.m_LycosLog.Write("nsLycosIMAP.js - copy - range array" + aRange + " length "+aRange.length);
            
           
            //check destination
            var aDestFolder = this.m_oFolder.getFolders(szDestination);
            if (!aDestFolder) //destination not found
            {
                this.m_LycosLog.Write("nsLycosIMAP.js - copy - destination folder doesn't exist");
                this.serverComms(this.m_iTag +" NO [TRYCREATE] error\r\n");
                return false;
            }
            this.m_LycosLog.Write("nsLycosIMAP.js - copy - destination folder" + aDestFolder[0].getHref());
            
            //get msg to be moved
            var aTargetMsg = new Array();           
            
            for(k=0 ; k<aRange.length; k++)
            {
                var aTemp;
                
                if (aRange[k].search(/:/)!=-1)
                {
                    //spilt range
                    var aszTempRange = aRange[k].split(":");
                    this.m_LycosLog.Write("nsLycosIMAP.js - fetchHeaders - range " + aszTempRange);
                    var iStart = parseInt( aszTempRange[0]);
                    this.m_LycosLog.Write("nsLycosIMAP.js - fetchHeaders - start " + iStart);
                    var iEnd = -1;
                    if (aszTempRange[1] != "*") iEnd = parseInt( aszTempRange[1]);
                    this.m_LycosLog.Write("nsLycosIMAP.js - fetchHeaders - end " + iEnd);
                     
                    //get messages
                    aTemp = this.m_oFolder.getMsgsUID(this.m_szSelectFolder, iStart, iEnd);
                }
                else
                {
                    var iID = parseInt(aRange[k]);
                    aTemp = this.m_oFolder.getMsgsUID(this.m_szSelectFolder, iID, iID );
                }
                
                if (aTemp) aTargetMsg = aTargetMsg.concat(aTemp);
            }
           
            //check we have got something to move
            if (aTargetMsg.length== 0)
            {
                this.m_LycosLog.Write("nsLycosIMAP.js - copy - no messages to move");
                this.serverComms(this.m_iTag +" NO copy no messages\r\n");
                return false;
            }
            this.m_LycosLog.Write("nsLycosIMAP.js - copy - messages to move" + aTargetMsg.length);
             
            //move first msg on real server
            var ios=Components.classes["@mozilla.org/network/io-service;1"].
                                    getService(Components.interfaces.nsIIOService);
            
            //set cookies
            var szURL = ios.newURI(aTargetMsg[0].getHref(),null,null).prePath;
            var aszHost = szURL.match(/.*?\.(.*?)$/); 
            var aszCookie = this.m_oCookies.findCookie(aszHost[1]);
            this.m_iStage=0;
            this.m_aTargetMSG = aTargetMsg;
            this.m_copyDest = aDestFolder[0];
            var bResult = this.httpConnection(aTargetMsg[0].getHref(), 
                                              "MOVE", 
                                              this.m_szAuthString,
                                              null, 
                                              aszCookie, 
                                              this.m_copyDest.getHref(),
                                              this.copyOnloadHandler);
                                          
            if (!bResult) throw new Error("httpConnection returned false");
            
            this.m_LycosLog.Write("nsLycosIMAP.js - copy - END");
            return true;
        }
        catch(err)
        {
            this.m_LycosLog.DebugDump("nsLycosIMAP.js: copy : Exception : "
                                              + err.name 
                                              + ".\nError message: " 
                                              + err.message);
            
            this.serverComms(this.m_iTag +" BAD error\r\n");
            return false;
        }
    },
    
    
    
    copyOnloadHandler : function (szResponse ,event , mainObject)
    {
        try
        {
            mainObject.m_LycosLog.Write("nsLycosIMAP.js - copyOnloadHandler - START");
            
            mainObject.m_LycosLog.Write("nsLycosIMAP.js - copyOnloadHandler : "
                                         + mainObject.m_iStage + "\n"
                                         + szResponse);  
            
            var httpChannel = event.QueryInterface(Components.interfaces.nsIHttpChannel);
            
            //if this fails we've gone somewhere new
            mainObject.m_LycosLog.Write("nsLycos - copyOnloadHandler - status :" +httpChannel.responseStatus );
            if (httpChannel.responseStatus != 200 && httpChannel.responseStatus != 201) 
                throw new Error("return status " + httpChannel.responseStatus);
            
            var szPath = httpChannel.URI.spec;
            var szURL = httpChannel.URI.host;
            mainObject.m_LycosLog.Write("nsLycosIMAP.js - copyOnloadHandler - url - " + szURL + " " + szPath);
            var aszTempDomain = szURL.match(/.*?\.(.*?)$/);  
            mainObject.m_LycosLog.Write("nsLycosIMAP.js - copyOnloadHandler - domain - " + aszTempDomain[1]);
            
            //get cookies
            try
            {
                var szCookies =  httpChannel.getResponseHeader("Set-Cookie");
                mainObject.m_LycosLog.Write("nsLycosIMAP.js - copyOnloadHandler - received cookies \n" + szCookies);
                mainObject.m_oCookies.addCookie( aszTempDomain[1], szCookies); 
            }
            catch(e)
            {
                mainObject.m_LycosLog.Write("nsLycosIMAP.js - copyOnloadHandler - no cookies found");
            } 
            
            if (mainObject.m_iStage< mainObject.m_aTargetMSG.length-1)
            {
                mainObject.m_LycosLog.Write("nsLycosIMAP.js - copyOnloadHandler - next - ");
                var ios=Components.classes["@mozilla.org/network/io-service;1"].
                                    getService(Components.interfaces.nsIIOService);
                var szURL = ios.newURI(mainObject.m_aTargetMSG[mainObject.m_iStage].getHref(),null,null).prePath;
                var aszHost = szURL.match(/.*?\.(.*?)$/); 
                var aszCookie = mainObject.m_oCookies.findCookie(aszHost[1]);
                var bResult = mainObject.httpConnection(mainObject.m_aTargetMSG[mainObject.m_iStage].getHref(), 
                                                  "MOVE", 
                                                  mainObject.m_szAuthString,
                                                  null, 
                                                  aszCookie, 
                                                  mainObject.m_copyDest.getHref(),
                                                  mainObject.copyOnloadHandler);
                                              
                if (!bResult) throw new Error("httpConnection returned false");
                mainObject.m_iStage ++;
            }
            else
            {     
                mainObject.m_LycosLog.Write("nsLycosIMAP.js - copyOnloadHandler - done - ");       
                //reset copy data 
                mainObject.m_aTargetMSG = null;
                mainObject.m_copyDest = null;
                mainObject.m_iStage = 0;
                mainObject.serverComms(mainObject.m_iTag +" OK COPY complete\r\n");
            }
            
          
            mainObject.m_LycosLog.Write("nsLycosIMAP.js - copyOnloadHandler - END");
            return true;
        }
        catch(err)
        {
            mainObject.m_LycosLog.DebugDump("nsLycosIMAP.js: copyloadHandler : Exception : "
                                              + err.name 
                                              + ".\nError message: " 
                                              + err.message);
            
            mainObject.serverComms(mainObject.m_iTag +" BAD error\r\n");
            return false;
        }
    },
    
    
    store : function (szRange, szData, szDataItem)
    {
        try
        {
            this.m_LycosLog.Write("nsLycosIMAP.js - store - START");
            this.m_LycosLog.Write("nsLycosIMAP.js - store - range " + szRange + " szData "+ szData + " Item " +szDataItem );
           
            //construct range
            var aRange;
            if (szRange.indexOf(",")!=-1)
            {
                aRange = szRange.split(",");  
            }
            else
                aRange = new Array(szRange);
            
            this.m_LycosLog.Write("nsLycosIMAP.js - store - range array" + aRange + " length "+aRange.length);
            
            //get msgs
            var aTargetMsg = new Array();           
            
            for(k=0 ; k<aRange.length; k++)
            {
                var aTemp;
                
                if (aRange[k].search(/:/)!=-1)
                {
                    //spilt range
                    var aszTempRange = aRange[k].split(":");
                    this.m_LycosLog.Write("nsLycosIMAP.js - store - range " + aszTempRange);
                    var iStart = parseInt( aszTempRange[0]);
                    this.m_LycosLog.Write("nsLycosIMAP.js - store - start " + iStart);
                    var iEnd = -1;
                    if (aszTempRange[1] != "*") iEnd = parseInt( aszTempRange[1]);
                    this.m_LycosLog.Write("nsLycosIMAP.js - store - end " + iEnd);
                     
                    //get messages
                    aTemp = this.m_oFolder.getMsgsUID(this.m_szSelectFolder, iStart, iEnd);
                }
                else
                {
                    var iID = parseInt(aRange[k]);
                    aTemp = this.m_oFolder.getMsgsUID(this.m_szSelectFolder, iID, iID );
                }
                
                if (aTemp) aTargetMsg = aTargetMsg.concat(aTemp);
            }
            
            //check we have got something
            if (aTargetMsg.length== 0)
            {
                this.m_LycosLog.Write("nsLycosIMAP.js - store - no messages");
                this.serverComms(this.m_iTag +" NO STORE no messages\r\n");
                return false;
            }
            this.m_LycosLog.Write("nsLycosIMAP.js - store - messages " + aTargetMsg.length);
            
            //move first msg on real server
            var ios=Components.classes["@mozilla.org/network/io-service;1"].
                                    getService(Components.interfaces.nsIIOService);
            
            //set cookies
            var szURL = ios.newURI(aTargetMsg[0].getHref(),null,null).prePath;
            var aszHost = szURL.match(/.*?\.(.*?)$/); 
            var aszCookie = this.m_oCookies.findCookie(aszHost[1]);
          
            var bResult;
            
            if (szDataItem.search(/unseen/i)!=-1)
            {
                this.m_LycosLog.Write("nsLycosIMAP.js - store - unseen");
                this.m_iStage=0;
                this.m_aTargetMSG = aTargetMsg;
                this.m_bStoreStatus = false;
            
                //propattach
                bResult = this.httpConnection(aTargetMsg[0].getHref(), 
                                              "PROPPATCH", 
                                              this.m_szAuthString,
                                              LycosPROPUnReadSchema, 
                                              aszCookie, 
                                              null,
                                              this.storeOnloadHandler);
                 
                if (!bResult) throw new Error("httpConnection returned false"); 
            }
            else if(szDataItem.search(/seen/i)!=-1) 
            {
                this.m_LycosLog.Write("nsLycosIMAP.js - store - seen");
                
                this.m_iStage=0;
                this.m_aTargetMSG = aTargetMsg;
                this.m_bStoreStatus = true;
                
                bResult = this.httpConnection(aTargetMsg[0].getHref(), 
                                              "PROPPATCH", 
                                              this.m_szAuthString,
                                              LycosPROPReadSchema, 
                                              aszCookie, 
                                              null,
                                              this.storeOnloadHandler);
                
                if (!bResult) throw new Error("httpConnection returned false"); 
            } 
            else if(szDataItem.search(/delete/i)!=-1) 
            {
                var szResponse= "";
                for(i=0; i<aTargetMsg.length; i++)
                {
                    szResponse+= "* "+ aTargetMsg[i].getUID() + " FETCH FLAGS (";
                    szResponse+= (aTargetMsg[i].getRead())?"\\Seen ":"";
                    szResponse+="\\Deleted)\r\n";
                }
                szResponse+=this.m_iTag +" OK FETCH complete\r\n"
                this.serverComms(szResponse);
            }
            else
            {
                this.serverComms(this.m_iTag +" NO STORE cant do that\r\n");
            }
            
                    
            
            this.m_LycosLog.Write("nsLycosIMAP.js - store - END");
            return true;
        }
        catch(err)
        {
             this.m_LycosLog.DebugDump("nsLycosIMAP.js: store : Exception : "
                                              + err.name 
                                              + ".\nError message: " 
                                              + err.message);
            
            this.serverComms(this.m_iTag +" BAD error\r\n");
            return false;
        }  
    },
    
    
    
    
    
    storeOnloadHandler : function (szResponse ,event , mainObject)
    {
        try
        {
            mainObject.m_LycosLog.Write("nsLycosIMAP.js - storeOnloadHandler - START");
            
            mainObject.m_LycosLog.Write("nsLycosIMAP.js - storeOnloadHandler : "
                                         + mainObject.m_iStage + "\n"
                                         + szResponse);  
            
            var httpChannel = event.QueryInterface(Components.interfaces.nsIHttpChannel);
            
            //if this fails we've gone somewhere new
            mainObject.m_LycosLog.Write("nsLycos - storeOnloadHandler - status :" +httpChannel.responseStatus );
            if (httpChannel.responseStatus != 200 && httpChannel.responseStatus != 201 ) 
                throw new Error("return status " + httpChannel.responseStatus);
            
            var szPath = httpChannel.URI.spec;
            var szURL = httpChannel.URI.host;
            mainObject.m_LycosLog.Write("nsLycosIMAP.js - storeOnloadHandler - url - " + szURL + " " + szPath);
            var aszTempDomain = szURL.match(/.*?\.(.*?)$/);  
            mainObject.m_LycosLog.Write("nsLycosIMAP.js - storeOnloadHandler - domain - " + aszTempDomain[1]);
            
            //get cookies
            try
            {
                var szCookies =  httpChannel.getResponseHeader("Set-Cookie");
                mainObject.m_LycosLog.Write("nsLycosIMAP.js - storeOnloadHandler - received cookies \n" + szCookies);
                mainObject.m_oCookies.addCookie( aszTempDomain[1], szCookies); 
            }
            catch(e)
            {
                mainObject.m_LycosLog.Write("nsLycosIMAP.js - storeOnloadHandler - no cookies found");
            } 
            
            if (mainObject.m_iStage< mainObject.m_aTargetMSG.length-1)
            {
                mainObject.m_LycosLog.Write("nsLycosIMAP.js - storeOnloadHandler - next - ");
                var ios=Components.classes["@mozilla.org/network/io-service;1"].
                                    getService(Components.interfaces.nsIIOService);
                var szURL = ios.newURI(mainObject.m_aTargetMSG[mainObject.m_iStage].getHref(),null,null).prePath;
                var aszHost = szURL.match(/.*?\.(.*?)$/); 
                var aszCookie = mainObject.m_oCookies.findCookie(aszHost[1]);
                var bResult = mainObject.httpConnection(mainObject.m_aTargetMSG[mainObject.m_iStage].getHref(), 
                                                  "PROPPATCH", 
                                                  mainObject.m_szAuthString,
                                                  ((mainObject.m_bStoreStatus)?LycosPROPReadSchema:LycosPROPUnReadSchema), 
                                                  aszCookie, 
                                                  null,
                                                  mainObject.storeOnloadHandler);
                                              
                if (!bResult) throw new Error("httpConnection returned false");
                mainObject.m_iStage ++;
            }
            else
            {     
                mainObject.m_LycosLog.Write("nsLycosIMAP.js - storeOnloadHandler - done - ");       
                
                var szResponse= "";
                for(i=0; i<mainObject.m_aTargetMSG.length; i++)
                {
                    szResponse+= "* "+ mainObject.m_aTargetMSG[i].getUID() + " FETCH FLAGS (";
                    szResponse+= (mainObject.m_aTargetMSG[i].getRead())? "\\Seen ":"";
                    szResponse+= (mainObject.m_aTargetMSG[i].getDelete())? "\\Deleted ":"";
                    szResponse+= ")\r\n";
                }
                szResponse+=mainObject.m_iTag +" OK FETCH complete\r\n"
               
                mainObject.m_aTargetMSG = null;
                mainObject.m_iStage = 0;
                mainObject.serverComms(szResponse);
            }
            
          
            mainObject.m_LycosLog.Write("nsLycosIMAP.js - storeOnloadHandler - END");
            return true;
        }
        catch(err)
        {
            mainObject.m_LycosLog.DebugDump("nsLycosIMAP.js: storeOnloadHandler : Exception : "
                                              + err.name 
                                              + ".\nError message: " 
                                              + err.message);
            
            mainObject.serverComms(mainObject.m_iTag +" BAD error\r\n");
            return false;
        }
    },
    
    
    
    close : function ()
    {
        try
        {
            this.m_LycosLog.Write("nsLycosIMAP.js - close - START");
            this.serverComms(this.m_iTag +" OK CLOSE complete\r\n");
            this.m_LycosLog.Write("nsLycosIMAP.js - close - END");   
        }
        catch(err)
        {
            this.m_LycosLog.DebugDump("nsLycosIMAP.js: close : Exception : "
                                              + err.name 
                                              + ".\nError message: " 
                                              + err.message);
            
            this.serverComms(this.m_iTag +" BAD error\r\n");
            return false;
        }
    },
    
    
    
    check : function()
    {
        try
        {
            this.m_LycosLog.Write("nsLycosIMAP.js - check - START");
            this.serverComms(this.m_iTag +" OK CHECK complete\r\n");
            this.m_LycosLog.Write("nsLycosIMAP.js - check - END");   
        }
        catch(err)
        {
            this.m_LycosLog.DebugDump("nsLycosIMAP.js: check : Exception : "
                                              + err.name 
                                              + ".\nError message: " 
                                              + err.message);
            
            this.serverComms(this.m_iTag +" BAD error\r\n");
            return false;
        }
    },
    
    
    
    noop : function ()
    {
        try
        {
            this.m_LycosLog.Write("nsLycosIMAP.js - noop - START");
            this.serverComms(this.m_iTag +" OK NOOP complete\r\n");
            this.m_LycosLog.Write("nsLycosIMAP.js - noop - END");   
        }
        catch(err)
        {
            this.m_LycosLog.DebugDump("nsLycosIMAP.js: noop : Exception : "
                                              + err.name 
                                              + ".\nError message: " 
                                              + err.message);
            
            this.serverComms(this.m_iTag +" BAD error\r\n");
            return false;
        }
    },
    
    
    expunge : function ()
    {
        try
        {
            this.m_LycosLog.Write("nsLycosIMAP.js - expunge - START");
            this.serverComms(this.m_iTag +" NO expunge\r\n");
            this.m_LycosLog.Write("nsLycosIMAP.js - expunge - END");  
        }
        catch(err)
        {
            this.m_LycosLog.DebugDump("nsLycosIMAP.js: expunge : Exception : "
                                              + err.name 
                                              + ".\nError message: " 
                                              + err.message);
            
            this.serverComms(this.m_iTag +" BAD error\r\n");
            return false;
        }
    },
    
    
    
    examine : function ()
    {
        try
        {
            this.m_LycosLog.Write("nsLycosIMAP.js - examine - START");
            this.serverComms(this.m_iTag +" NO expunge\r\n");
            this.m_LycosLog.Write("nsLycosIMAP.js - examine - END");  
        }
        catch(err)
        {
            this.m_LycosLog.DebugDump("nsLycosIMAP.js: examine : Exception : "
                                              + err.name 
                                              + ".\nError message: " 
                                              + err.message);
            
            this.serverComms(this.m_iTag +" BAD error\r\n");
            return false;
        }
    },
    
    
    
    
    
    
    createFolder : function (szFolder)
    {
        try
        {
            this.m_LycosLog.Write("nsLycosIMAP.js - createFolder - START");
            this.m_LycosLog.Write("nsLycosIMAP.js - createFolder - folder " + szFolder);
            
            //check level
            var aszLevel = szFolder.split(".");
            if (aszLevel.length!=2)
            {
                this.serverComms(this.m_iTag +" NO too low level\r\n");
                this.m_LycosLog.Write("nsLycosIMAP.js - createFolder - folder too low");
            }
            else
            {
                //check if folder exists
                
                if (this.m_oFolder.getFolders(szFolder)==null)
                {
                    //create new folder
                    this.m_szFolderReference = this.m_szFolderURI+aszLevel[1]+"/";
                    this.m_szFolderName = aszLevel[1];
                    
                     //move first msg on real server
                    var ios=Components.classes["@mozilla.org/network/io-service;1"].
                                            getService(Components.interfaces.nsIIOService);
                    
                    //set cookies
                    var szURL = ios.newURI(this.m_szFolderReference,null,null).prePath;
                    var aszHost = szURL.match(/.*?\.(.*?)$/); 
                    var aszCookie = this.m_oCookies.findCookie(aszHost[1]);
                    
                    var bResult = this.httpConnection(this.m_szFolderReference, 
                                                      "MKCOL", 
                                                      this.m_szAuthString,
                                                      null, 
                                                      aszCookie, 
                                                      null,
                                                      this.createOnloadHandler);
                                              
                    if (!bResult) throw new Error("httpConnection returned false");
                }
                else
                {
                     this.serverComms(this.m_iTag +" NO folder exists\r\n");
                     this.m_LycosLog.Write("nsLycosIMAP.js - createFolder - exists");
                }
            }
            
            this.m_LycosLog.Write("nsLycosIMAP.js - createFolder - END");   
        }
        catch(err)
        {
            this.m_LycosLog.DebugDump("nsLycosIMAP.js: createFolder : Exception : "
                                              + err.name 
                                              + ".\nError message: " 
                                              + err.message);
            
            this.serverComms(this.m_iTag +" BAD error\r\n");
            return false;
        }
    },
    
   
   
   
    createOnloadHandler : function (szResponse ,event , mainObject)
    {
        try
        {
            mainObject.m_LycosLog.Write("nsLycosIMAP.js - createOnloadHandler - START");
            
            mainObject.m_LycosLog.Write("nsLycosIMAP.js - createOnloadHandler : \n"+ szResponse);  
            
            var httpChannel = event.QueryInterface(Components.interfaces.nsIHttpChannel);
            
            //if this fails we've gone somewhere new
            mainObject.m_LycosLog.Write("nsLycos - createOnloadHandler - status :" +httpChannel.responseStatus );
            if (httpChannel.responseStatus != 200 && httpChannel.responseStatus != 201) 
                throw new Error("return status " + httpChannel.responseStatus);
            
            var szPath = httpChannel.URI.spec;
            var szURL = httpChannel.URI.host;
            mainObject.m_LycosLog.Write("nsLycosIMAP.js - createOnloadHandler - url - " + szURL + " " + szPath);
            var aszTempDomain = szURL.match(/.*?\.(.*?)$/);  
            mainObject.m_LycosLog.Write("nsLycosIMAP.js - createOnloadHandler - domain - " + aszTempDomain[1]);
            
            //get cookies
            try
            {
                var szCookies =  httpChannel.getResponseHeader("Set-Cookie");
                mainObject.m_LycosLog.Write("nsLycosIMAP.js - createOnloadHandler - received cookies \n" + szCookies);
                mainObject.m_oCookies.addCookie( aszTempDomain[1], szCookies); 
            }
            catch(e)
            {
                mainObject.m_LycosLog.Write("nsLycosIMAP.js - createOnloadHandler - no cookies found");
            } 
            
                   
            var iUID = parseInt(Hex16(Crc16Str(mainObject.m_szFolderReference)));
            var szHiererchy = "INBOX." + mainObject.m_szFolderName;
            mainObject.m_oFolder.addFolder(szHiererchy, 
                                           iUID, 
                                           mainObject.m_szFolderReference, 
                                           mainObject.m_szFolderName, 
                                           0,
                                           0);
            
            var szMsg = mainObject.m_iTag +" OK CREATE complete\r\n"
            mainObject.serverComms(szMsg); 
            mainObject.m_szFolderReference = null; 
            mainObject.m_szFolderName = null;
            mainObject.m_LycosLog.Write("nsLycosIMAP.js - createOnloadHandler - END");
            return true;
        }
        catch(err)
        {
            mainObject.m_LycosLog.DebugDump("nsLycosIMAP.js: createOnloadHandler : Exception : "
                                              + err.name 
                                              + ".\nError message: " 
                                              + err.message);
            
            mainObject.serverComms(mainObject.m_iTag +" BAD error\r\n");
            return false;
        }
    },
   
   
   
    deleteFolder : function (szFolder)
    {
        try
        {
            this.m_LycosLog.Write("nsLycosIMAP.js - deleteFolder - START");
            this.m_LycosLog.Write("nsLycosIMAP.js - deleteFolder - folder " + szFolder);
            
            var aszLevel = szFolder.split(".");
            var szDeleteFolder = this.m_szFolderURI+aszLevel[1]+"/";
            this.m_szFolderName = szFolder;
           
            var ios=Components.classes["@mozilla.org/network/io-service;1"].
                                    getService(Components.interfaces.nsIIOService);
            
            //set cookies
            var szURL = ios.newURI(szDeleteFolder,null,null).prePath;
            var aszHost = szURL.match(/.*?\.(.*?)$/); 
            var aszCookie = this.m_oCookies.findCookie(aszHost[1]);
            
            var bResult = this.httpConnection(szDeleteFolder, 
                                              "DELETE", 
                                              this.m_szAuthString,
                                              null, 
                                              aszCookie, 
                                              null,
                                              this.deleteOnloadHandler);
                                      
            if (!bResult) throw new Error("httpConnection returned false");
            
            this.m_LycosLog.Write("nsLycosIMAP.js - deleteFolder - END");   
        }
        catch(err)
        {
            this.m_LycosLog.DebugDump("nsLycosIMAP.js: deleteFolder : Exception : "
                                              + err.name 
                                              + ".\nError message: " 
                                              + err.message);
            
            this.serverComms(this.m_iTag +" BAD error\r\n");
            return false;
        }
    },
    
    
    
    
    deleteOnloadHandler : function (szResponse ,event , mainObject)
    {
        try
        {
            mainObject.m_LycosLog.Write("nsLycosIMAP.js - deleteOnloadHandler - START");
            mainObject.m_LycosLog.Write("nsLycosIMAP.js - deleteOnloadHandler : \n"+ szResponse);  
            
            var httpChannel = event.QueryInterface(Components.interfaces.nsIHttpChannel);
            
            //if this fails we've gone somewhere new
            mainObject.m_LycosLog.Write("nsLycos - deleteOnloadHandler - status :" +httpChannel.responseStatus );
            if (httpChannel.responseStatus != 200 && httpChannel.responseStatus != 207) 
                throw new Error("return status " + httpChannel.responseStatus);
            
            var szPath = httpChannel.URI.spec;
            var szURL = httpChannel.URI.host;
            mainObject.m_LycosLog.Write("nsLycosIMAP.js - deleteOnloadHandler - url - " + szURL + " " + szPath);
            var aszTempDomain = szURL.match(/.*?\.(.*?)$/);  
            mainObject.m_LycosLog.Write("nsLycosIMAP.js - deleteOnloadHandler - domain - " + aszTempDomain[1]);
            
            //get cookies
            try
            {
                var szCookies =  httpChannel.getResponseHeader("Set-Cookie");
                mainObject.m_LycosLog.Write("nsLycosIMAP.js - deleteOnloadHandler - received cookies \n" + szCookies);
                mainObject.m_oCookies.addCookie( aszTempDomain[1], szCookies); 
            }
            catch(e)
            {
                mainObject.m_LycosLog.Write("nsLycosIMAP.js - deleteOnloadHandler - no cookies found");
            } 
            
                   
            var bResult = mainObject.m_oFolder.deleteFolder(mainObject.m_szFolderName);
             var szMsg;
            if (bResult)
                szMsg = mainObject.m_iTag +" OK delete complete\r\n";
            else
                szMsg = mainObject.m_iTag +" NO delete failed\r\n";
           
            mainObject.serverComms(szMsg); 
            mainObject.m_szFolderReference = null; 
            mainObject.m_szFolderName = null;
            mainObject.m_LycosLog.Write("nsLycosIMAP.js - createOnloadHandler - END");
            return true;
        }
        catch(err)
        {
            mainObject.m_LycosLog.DebugDump("nsLycosIMAP.js: createOnloadHandler : Exception : "
                                              + err.name 
                                              + ".\nError message: " 
                                              + err.message);
            
            mainObject.serverComms(mainObject.m_iTag +" BAD error\r\n");
            return false;
        }
    },
    
    
    
    
    renameFolder : function (szOldFolder, szNewFolder)
    {
        try
        {
            this.m_LycosLog.Write("nsLycosIMAP.js - renameFolder - START");
            this.m_LycosLog.Write("nsLycosIMAP.js - renameFolder - oldfolder " + szOldFolder 
                                                                + " newFolder "+ szNewFolder);
           
            //check for new name
            if (this.m_oFolder.getFolders(szNewFolder)==null)
            {
                var aszOldLevel = szOldFolder.split(".");
                var szOldFolderURI = this.m_szFolderURI+aszOldLevel[1]+"/";
                var aszNewLevel = szNewFolder.split(".");
                var szNewFolderURI = this.m_szFolderURI+aszNewLevel[1]+"/";
               
                this.m_szFolderName = szOldFolder;
                this.m_szFolderNewName = szNewFolder;
                this.m_szFolderReference = szNewFolderURI;
                 
                var ios=Components.classes["@mozilla.org/network/io-service;1"].
                                        getService(Components.interfaces.nsIIOService);
                
                //set cookies
                var szURL = ios.newURI(szOldFolderURI,null,null).prePath;
                var aszHost = szURL.match(/.*?\.(.*?)$/); 
                var aszCookie = this.m_oCookies.findCookie(aszHost[1]);
                
                var bResult = this.httpConnection(szOldFolderURI, 
                                                  "MOVE", 
                                                  this.m_szAuthString,
                                                  null, 
                                                  aszCookie, 
                                                  szNewFolderURI,
                                                  this.renameOnloadHandler);
                                          
                if (!bResult) throw new Error("httpConnection returned false");
            }
            else
                this.serverComms(this.m_iTag +" NO renameFolder not supported\r\n");
                
            this.m_LycosLog.Write("nsLycosIMAP.js - renameFolder - END");   
        }
        catch(err)
        {
            this.m_LycosLog.DebugDump("nsLycosIMAP.js: renameFolder : Exception : "
                                              + err.name 
                                              + ".\nError message: " 
                                              + err.message);
            
            this.serverComms(this.m_iTag +" BAD error\r\n");
            return false;
        }
    },
    
    
    
     
    renameOnloadHandler : function (szResponse ,event , mainObject)
    {
        try
        {
            mainObject.m_LycosLog.Write("nsLycosIMAP.js - renameOnloadHandler - START");
            mainObject.m_LycosLog.Write("nsLycosIMAP.js - renameOnloadHandler : \n"+ szResponse);  
            
            var httpChannel = event.QueryInterface(Components.interfaces.nsIHttpChannel);
            
            //if this fails we've gone somewhere new
            mainObject.m_LycosLog.Write("nsLycos - renameOnloadHandler - status :" +httpChannel.responseStatus );
            if (httpChannel.responseStatus != 200 && httpChannel.responseStatus != 201) 
                throw new Error("return status " + httpChannel.responseStatus);
            
            var szPath = httpChannel.URI.spec;
            var szURL = httpChannel.URI.host;
            mainObject.m_LycosLog.Write("nsLycosIMAP.js - renameOnloadHandler - url - " + szURL + " " + szPath);
            var aszTempDomain = szURL.match(/.*?\.(.*?)$/);  
            mainObject.m_LycosLog.Write("nsLycosIMAP.js - renameOnloadHandler - domain - " + aszTempDomain[1]);
            
            //get cookies
            try
            {
                var szCookies =  httpChannel.getResponseHeader("Set-Cookie");
                mainObject.m_LycosLog.Write("nsLycosIMAP.js - renameOnloadHandler - received cookies \n" + szCookies);
                mainObject.m_oCookies.addCookie( aszTempDomain[1], szCookies); 
            }
            catch(e)
            {
                mainObject.m_LycosLog.Write("nsLycosIMAP.js - renameOnloadHandler - no cookies found");
            } 
            
           
            var bResult = mainObject.m_oFolder.renameFolder(mainObject.m_szFolderName,
                                                            mainObject.m_szFolderNewName,
                                                            mainObject.m_szFolderReference);
             var szMsg;
            if (bResult)
                szMsg = mainObject.m_iTag +" OK rename complete\r\n";
            else
                szMsg = mainObject.m_iTag +" NO rename failed\r\n";
           
            mainObject.serverComms(szMsg); 
            mainObject.m_szFolderReference = null; 
            mainObject.m_szFolderName = null;
            mainObject.m_LycosLog.Write("nsLycosIMAP.js - renameOnloadHandler - END");
            return true;
        }
        catch(err)
        {
            mainObject.m_LycosLog.DebugDump("nsLycosIMAP.js: renameOnloadHandler : Exception : "
                                              + err.name 
                                              + ".\nError message: " 
                                              + err.message);
            
            mainObject.serverComms(mainObject.m_iTag +" BAD error\r\n");
            return false;
        }
    },
    
    
    
    logOut : function()
    {
        try
        {
            this.m_LycosLog.Write("nsLycosIMAP.js - logOUT - START");
            
            this.m_bAuthorised = false;
            var szResponse = "* BYE IMAP4rev1 Server logout\r\n";
            szResponse += this.m_iTag +" OK Logout Completed\r\n"
            this.serverComms(szResponse);                 
            
            this.m_LycosLog.Write("nsLycosIMAP.js - logOUT - END");
            return true;
        }
        catch(e)
        {
            this.m_LycosLog.DebugDump("nsLycosIMAP.js: logOUT : Exception : "
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
            this.m_LycosLog.Write("nsLycosIMAP.js - serverComms - START");
            this.m_LycosLog.Write("nsLycosIMAP.js - serverComms msg " + szMsg);
            var iCount = this.m_oResponseStream.write(szMsg,szMsg.length);
            this.m_LycosLog.Write("nsLycosIMAP.js - serverComms sent count: " + iCount
                                                        +" msg length: " +szMsg.length);
            this.m_LycosLog.Write("nsLycosIMAP.js - serverComms - END");
        }
        catch(e)
        {
            this.m_LycosLog.DebugDump("nsLycosIMAP.js: serverComms : Exception : "
                                              + e.name 
                                              + ".\nError message: " 
                                              + e.message);
        }
    },
        
                      
    
    httpConnection : function (szURL, szType, szAuthorization ,szData, szCookies, szDestFolder ,callBack)
    {
        try
        {
            this.m_LycosLog.Write("nsLycosIMAP.js - httpConnection - START");
            this.m_LycosLog.Write("nsLycosIMAP.js - httpConnection - " + szURL + "\n"
                                                                   + szType + "\n"
                                                                   + szAuthorization + "\n"
                                                                   + szCookies + "\n"
                                                                   + szDestFolder + "\n"
                                                                   + szData +"\n");  
            
            
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
                this.m_LycosLog.Write("nsLycosIMAP.js - httpConnection - adding cookie \n"+ szCookies);
                HttpRequest.setRequestHeader("x-CookieHack", "Hacker\r\nCookie: "  + szCookies , false);
            }
           
           
            //set data
            if (szData)
            {
                this.m_LycosLog.Write("nsLycosIMAP.js - httpConnection - adding data");
                
                var uploadStream = Components.classes["@mozilla.org/io/string-input-stream;1"]
                                    .createInstance(Components.interfaces.nsIStringInputStream);         
                uploadStream.setData(szData, szData.length);
        
                var uploadChannel = channel.QueryInterface(Components.interfaces.nsIUploadChannel);
                uploadChannel.setUploadStream(uploadStream, "text/xml", -1); 
            }
            
            //set Destination
            if (szType.search(/move/i)!=-1)
            {
                this.m_LycosLog.Write("nsLycosIMAP.js - httpConnection - adding Destination");
                var szMsgID =  szURL.match(LycosIMAPMSGIDPattern); 
                var szDestination= szDestFolder + szMsgID
                this.m_LycosLog.Write("nsLycosIMAP.js - httpConnection - Destination " + szDestination );
                HttpRequest.setRequestHeader("Destination", szDestination , false);
            }
            
            //set authorization
            if (szAuthorization)
            {
                this.m_LycosLog.Write("nsLycosIMAP.js - httpConnection - adding szAuthorization");
                HttpRequest.setRequestHeader("Authorization", szAuthorization , false);
            } 
            
            HttpRequest.requestMethod = szType;
                       
            var listener = new this.downloadListener(callBack, this);
            channel.asyncOpen(listener, null);  
            
            this.m_LycosLog.Write("nsLycosIMAP.js - httpConnection - END");
            
            return true;  
        }
        catch(e)
        {
            this.m_LycosLog.DebugDump("nsLycosIMAP.js: httpConnection : Exception : "
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
        if (!iid.equals(Components.interfaces.nsIIMAPDomainHandler) 
        	                      && !iid.equals(Components.interfaces.nsISupports))
            throw Components.results.NS_ERROR_NO_INTERFACE;
            
        return this;
    }
}
 

/******************************************************************************/
/* FACTORY*/
var nsLycosIMAPFactory = new Object();

nsLycosIMAPFactory.createInstance = function (outer, iid)
{
    if (outer != null) throw Components.results.NS_ERROR_NO_AGGREGATION;
    
    if (!iid.equals(nsLycosIMAPClassID) && !iid.equals(Components.interfaces.nsISupports))
        throw Components.results.NS_ERROR_INVALID_ARG;
    
    return new nsLycosIMAP();
}


/******************************************************************************/
/* MODULE */
var nsLycosIMAPModule = new Object();

nsLycosIMAPModule.registerSelf = function(compMgr, fileSpec, location, type)
{
    compMgr = compMgr.QueryInterface(Components.interfaces.nsIComponentRegistrar);
    compMgr.registerFactoryLocation(nsLycosIMAPClassID,
                                    "LycosIMAPComponent",
                                    nsLycosIMAPContactID, 
                                    fileSpec,
                                    location, 
                                    type);
}


nsLycosIMAPModule.unregisterSelf = function(aCompMgr, aFileSpec, aLocation)
{
    aCompMgr = aCompMgr.QueryInterface(Components.interfaces.nsIComponentRegistrar);
    aCompMgr.unregisterFactoryLocation(nsLycosIMAPClassID, aFileSpec);
}

 
nsLycosIMAPModule.getClassObject = function(compMgr, cid, iid)
{
    if (!cid.equals(nsLycosIMAPClassID))
        throw Components.results.NS_ERROR_NO_INTERFACE;

    if (!iid.equals(Components.interfaces.nsIFactory))
        throw Components.results.NS_ERROR_NOT_IMPLEMENTED;

    return nsLycosIMAPFactory;
}


nsLycosIMAPModule.canUnload = function(compMgr)
{
    return true;
}
/******************************************************************************/


function NSGetModule(compMgr, fileSpec)
{
    return nsLycosIMAPModule; 
}
