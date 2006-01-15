/*****************************  Globals   *************************************/                 
const nsHttpMailSMTPClassID = Components.ID("{8bc74cc0-4a7e-11da-8cd6-0800200c9a66}");
const nsHttpMailSMTPContactID = "@mozilla.org/HttpMailSMTP;1";
const ExtHttpMailGuid = "{3c8e8390-2cf6-11d9-9669-0800200c9a66}";

const HttpMailSchema = "<?xml version=\"1.0\"?>\r\n<D:propfind xmlns:D=\"DAV:\" xmlns:h=\"http://schemas.microsoft.com/hotmail/\" xmlns:hm=\"urn:schemas:httpmail:\">\r\n<D:prop>\r\n<h:adbar/>\r\n<hm:contacts/>\r\n<hm:inbox/>\r\n<hm:outbox/>\r\n<hm:sendmsg/>\r\n<hm:sentitems/>\r\n<hm:deleteditems/>\r\n<hm:drafts/>\r\n<hm:msgfolderroot/>\r\n<h:maxpoll/>\r\n<h:sig/>\r\n</D:prop>\r\n</D:propfind>\r\n";
const HttpMailSendMsgPattern = /<hm:sendmsg>(.*?)<\/hm:sendmsg>/;
/******************************  HttpMail ***************************************/
function nsHttpMailSMTP()
{
    try
    {       
        var scriptLoader =  Components.classes["@mozilla.org/moz/jssubscript-loader;1"];
        scriptLoader = scriptLoader.getService(Components.interfaces.mozIJSSubScriptLoader);
        scriptLoader.loadSubScript("chrome://web-mail/content/common/DebugLog.js");
        scriptLoader.loadSubScript("chrome://web-mail/content/common/base64.js");
        scriptLoader.loadSubScript("chrome://web-mail/content/common/comms.js");
        scriptLoader.loadSubScript("chrome://web-mail/content/common/CommonPrefs.js");
        
        
        var date = new Date();
        var  szLogFileName = "HttpMail SMTP Log - " + date.getHours()
                                           + "-" + date.getMinutes() 
                                           + "-"+ date.getUTCMilliseconds() +" -";
        this.m_Log = new DebugLog("webmail.logging.comms", ExtHttpMailGuid, szLogFileName); 
        
        this.m_Log.Write("nsHttpMailSMTP.js - Constructor - START");   
       
        this.m_bAuthorised = false;
        this.m_szUserName = null;   
        this.m_szPassWord = null; 
        this.m_oResponseStream = null;  
        this.m_HttpComms = new Comms(this , this.m_Log);
        this.m_HttpComms.setHandleHttpAuth(true);
        this.m_aszTo = new Array;
        this.m_szFrom = null;
        this.m_iStage = 0;
        this.m_szSendUri = null;
           
        this.m_SessionManager = Components.classes["@mozilla.org/SessionManager;1"];
        this.m_SessionManager = this.m_SessionManager.getService();
        this.m_SessionManager.QueryInterface(Components.interfaces.nsISessionManager); 
        this.m_SessionData = null;   
        
        //do i reuse the session
        var oPref = new Object();
        oPref.Value = null;
        var  WebMailPrefAccess = new WebMailCommonPrefAccess();
        if (WebMailPrefAccess.Get("bool","httpmail.bReUseSession",oPref))
            this.m_bReUseSession=oPref.Value;
        else
            this.m_bReUseSession=true; 
                  
        //do i save copy
        var oPref = new Object();
        oPref.Value = null;
        var  PrefAccess = new WebMailCommonPrefAccess();
        if (PrefAccess.Get("bool","httpmail.bSaveCopy",oPref))
            this.m_bSaveCopy=oPref.Value;
        else
            this.m_bSaveCopy=true;          
        delete oPref;
              
        this.m_Log.Write("nsHttpMailSMTP.js - Constructor - END");  
    }
    catch(e)
    {
        DebugDump("nsHttpMailSMTP.js: Constructor : Exception : " 
                                      + e.name 
                                      + ".\nError message: " 
                                      + e.message +"\n" +
                                      e.lineNumber);
    }
}



nsHttpMailSMTP.prototype =
{
    get userName() {return this.m_szUserName;},
    set userName(userName) {return this.m_szUserName = userName;},
  
    get passWord() {return this.m_szPassWord;},
    set passWord(passWord) {return this.m_szPassWord = passWord;},
    
    get bAuthorised() {return this.m_bAuthorised;},
  
    get ResponseStream() {return this.m_oResponseStream;},
    set ResponseStream(responseStream) {return this.m_oResponseStream = responseStream;},
    
    get to() {return this.m_aszTo;},
    set to(szAddress) {return this.m_aszTo.push(szAddress);},
    
    get from() {return this.m_szFrom;},
    set from(szAddress) {return this.m_szFrom = szAddress;},
    
    
    logIn : function()
    {
        try
        {
            this.m_Log.Write("nsHttpMailSMTP.js - logIN - START");   
            this.m_Log.Write("nsHttpMailSMTP.js - logIN - Username: " + this.m_szUserName 
                                                   + " Password: " + this.m_szPassWord 
                                                   + " stream: " + this.m_oResponseStream);
           
            if (!this.m_szUserName || !this.m_oResponseStream  || !this.m_szPassWord) return false;
                     
            var szTempUserName = this.m_szUserName.split("@");
            this.m_Log.Write("nsHttpMail.js - logIN - doamain " + szTempUserName); 
            var szDomain = szTempUserName[1];
            
            var uriManager = Components.classes["@mozilla.org/UriManager;1"].getService();
            uriManager.QueryInterface(Components.interfaces.nsIUriManager);
            var szLocation = uriManager.getUri(szDomain);
            
            this.m_iStage = 0;
            this.m_HttpComms.clean();
            
            this.m_SessionData = this.m_SessionManager.findSessionData(this.m_szUserName);
            if (this.m_SessionData && this.m_bReUseSession)
            {
                this.m_Log.Write("nsHttpMail.js - logIN - Session Data found");
                this.m_HttpComms.setCookieManager(this.m_SessionData.oCookieManager);
                this.m_HttpComms.setHttpAuthManager(this.m_SessionData.oHttpAuthManager); 
            }
            
            this.m_HttpComms.setUserName(this.m_szUserName);
            this.m_HttpComms.setPassword(this.m_szPassWord);
            this.m_HttpComms.setContentType(-1);
            this.m_HttpComms.setURI(szLocation);
            this.m_HttpComms.setRequestMethod("PROPFIND");
            this.m_HttpComms.addData(HttpMailSchema,"text/xml");
            var bResult = this.m_HttpComms.send(this.loginOnloadHandler);                             
            if (!bResult) throw new Error("httpConnection returned false");
            
            this.m_Log.Write("nsHttpMailSMTP.js - logIN - END");    
            return true;
        }
        catch(e)
        {
            this.m_Log.DebugDump("nsHttpMailSMTP.js: logIN : Exception : " 
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
            mainObject.m_Log.Write("nsHttpMailSMTP.js - loginOnloadHandler - START"); 
            mainObject.m_Log.Write("nsHttpMailSMTP.js - loginOnloadHandler : " + mainObject.m_iStage );  
            
            var httpChannel = event.QueryInterface(Components.interfaces.nsIHttpChannel);
            
            //if this fails we've gone somewhere new
            mainObject.m_Log.Write("nsHttpMailSMTP.js - loginOnloadHandler - status :" +httpChannel.responseStatus );
            if (httpChannel.responseStatus <= 199 || httpChannel.responseStatus >= 300) 
                throw new Error("return status " + httpChannel.responseStatus);
            
            mainObject.m_szSendUri = szResponse.match(HttpMailSendMsgPattern)[1];
            mainObject.m_Log.Write("nsHttpMail.js - loginOnloadHandler - Send URi - " +mainObject.m_szSendUri);
            //server response
            mainObject.serverComms("235 Your In\r\n");
            mainObject.m_bAuthorised = true;
                        
            mainObject.m_Log.Write("nsHttpMailSMTP.js - loginOnloadHandler - END");
        }
        catch(err)
        {
            mainObject.m_Log.DebugDump("nsHttpMailSMTP.js: loginHandler : Exception : " 
                                          + err.name 
                                          + ".\nError message: " 
                                          + err.message +"\n" +
                                            err.lineNumber);
            mainObject.serverComms("502 negative vibes from " +mainObject.m_szUserName +"\r\n");
        }
    },
    
    
    rawMSG : function (szEmail)
    {
        try
        {
            this.m_Log.Write("nsHttpMailSMTP.js - rawMSG - START");   
            this.m_Log.Write("nsHttpMailSMTP.js - rawMSG " + szEmail);
    
            this.m_iStage = 0;
           
            var szMsg = "MAIL FROM:<"+this.m_szFrom+">\r\n";
            for (i=0; i< this.m_aszTo.length; i++)
            {
                szMsg +="RCPT TO:<"+this.m_aszTo[i]+">\r\n";
            }
            szMsg +="\r\n";
            szMsg += szEmail.match(/(^[\s\S]*)\r?\n\./)[1];//removes SMTP termiator;
            szMsg +="\r\n\r\n";
            
            this.m_HttpComms.clean();
            this.m_HttpComms.setContentType(-1);
            this.m_HttpComms.setURI(this.m_szSendUri);
            this.m_HttpComms.setRequestMethod("POST");
            this.m_HttpComms.addRequestHeader("SAVEINSENT", this.m_bSaveCopy?"t":"f", false); 
            this.m_HttpComms.addData(szMsg,"message/rfc821");     
            var bResult = this.m_HttpComms.send(this.composerOnloadHandler);  
            if (!bResult) throw new Error("httpConnection returned false");
            
            this.m_Log.Write("nsHttpMailSMTP.js - rawMSG - END");    
            return true;
        }
        catch(err)
        {
            this.m_Log.DebugDump("nsHttpMailSMTP.js: rawMSG : Exception : " 
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
            mainObject.m_Log.Write("nsHttpMailSMTP.js - composerOnloadHandler - START"); 
            mainObject.m_Log.Write("nsHttpMailSMTP.js - composerOnloadHandler : " + mainObject.m_iStage + "\n");  
            
            var httpChannel = event.QueryInterface(Components.interfaces.nsIHttpChannel);
            
            //if this fails we've gone somewhere new
            mainObject.m_Log.Write("nsHttpMailSMTP.js - composerOnloadHandler - status :" +httpChannel.responseStatus );
            if (httpChannel.responseStatus <= 199 || httpChannel.responseStatus >= 300 ) 
            {
                mainObject.serverComms("502 Error Sending Email\r\n");  
                return;
            }
            else
            { 
                if (!mainObject.m_SessionData)
                {
                    mainObject.m_SessionData = Components.classes["@mozilla.org/SessionData;1"].createInstance();
                    mainObject.m_SessionData.QueryInterface(Components.interfaces.nsISessionData);
                    mainObject.m_SessionData.szUserName = mainObject.m_szUserName;
                    
                    var componentData = Components.classes["@mozilla.org/ComponentData;1"].createInstance();
                    componentData.QueryInterface(Components.interfaces.nsIComponentData);
                    mainObject.m_SessionData.oComponentData = componentData;
                }
                mainObject.m_SessionData.oCookieManager = mainObject.m_HttpComms.getCookieManager();
                mainObject.m_SessionData.oHttpAuthManager = mainObject.m_HttpComms.getHttpAuthManager();
                mainObject.m_SessionManager.setSessionData(mainObject.m_SessionData);
                
                mainObject.serverComms("250 OK\r\n");       
            }
            mainObject.m_Log.Write("nsHttpMailSMTP.js - composerOnloadHandler - END");
        }
        catch(err)
        {
            mainObject.m_Log.DebugDump("nsHttpMailSMTP.js: composerOnloadHandler : Exception : " 
                                          + err.name 
                                          + ".\nError message: " 
                                          + err.message +"\n" +
                                            err.lineNumber);
                                            
            mainObject.serverComms("502 negative vibes from " +mainObject.m_szUserName +"\r\n");
        }
    },
    
    
    ////////////////////////////////////////////////////////////////////////////
    /////  Comms                  
    
    serverComms : function (szMsg)
    {
        try
        { 
            this.m_Log.Write("nsHttpMailSMTP.js - serverComms - START");
            this.m_Log.Write("nsHttpMailSMTP.js - serverComms msg " + szMsg);
            var iCount = this.m_oResponseStream.write(szMsg,szMsg.length);
            this.m_Log.Write("nsHttpMailSMTP.js - serverComms sent count: " + iCount 
                                                        +" msg length: " +szMsg.length);
            this.m_Log.Write("nsHttpMailSMTP.js - serverComms - END");  
        }
        catch(e)
        {
            this.m_Log.DebugDump("nsHttpMailSMTP.js: serverComms : Exception : " 
                                              + e.name 
                                              + ".\nError message: " 
                                              + e.message +"\n" +
                                                e.lineNumber);
        }
    },
    
     
/******************************************************************************/
/***************** XPCOM  stuff ***********************************************/
/******************************************************************************/
    QueryInterface : function (iid)
    {
        if (!iid.equals(Components.interfaces.nsISMTPDomainHandler) 
        	                && !iid.equals(Components.interfaces.nsISupports))
            throw Components.results.NS_ERROR_NO_INTERFACE;
            
        return this;
    }
}
 

/******************************************************************************/
/* FACTORY*/
var nsHttpMailSMTPFactory = new Object();

nsHttpMailSMTPFactory.createInstance = function (outer, iid)
{
    if (outer != null) throw Components.results.NS_ERROR_NO_AGGREGATION;
    
    if (!iid.equals(nsHttpMailSMTPClassID) && !iid.equals(Components.interfaces.nsISupports))
        throw Components.results.NS_ERROR_INVALID_ARG;
    
    return new nsHttpMailSMTP();
}


/******************************************************************************/
/* MODULE */
var nsHttpMailSMTPModule = new Object();

nsHttpMailSMTPModule.registerSelf = function(compMgr, fileSpec, location, type)
{
    compMgr = compMgr.QueryInterface(Components.interfaces.nsIComponentRegistrar);
    compMgr.registerFactoryLocation(nsHttpMailSMTPClassID,
                                    "HttpMailSMTPComponent",
                                    nsHttpMailSMTPContactID, 
                                    fileSpec,
                                    location, 
                                    type);
}


nsHttpMailSMTPModule.unregisterSelf = function(aCompMgr, aFileSpec, aLocation)
{
    aCompMgr = aCompMgr.QueryInterface(Components.interfaces.nsIComponentRegistrar);
    aCompMgr.unregisterFactoryLocation(nsHttpMailSMTPClassID, aFileSpec);
}

 
nsHttpMailSMTPModule.getClassObject = function(compMgr, cid, iid)
{
    if (!cid.equals(nsHttpMailSMTPClassID))
        throw Components.results.NS_ERROR_NO_INTERFACE;

    if (!iid.equals(Components.interfaces.nsIFactory))
        throw Components.results.NS_ERROR_NOT_IMPLEMENTED;

    return nsHttpMailSMTPFactory;
}


nsHttpMailSMTPModule.canUnload = function(compMgr)
{
    return true;
}
/******************************************************************************/


function NSGetModule(compMgr, fileSpec)
{
    return nsHttpMailSMTPModule; 
}
