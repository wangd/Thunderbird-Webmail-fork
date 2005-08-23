/*****************************  Globals   *************************************/                 
const nsLycosSMTPClassID = Components.ID("{840fbdf0-103b-11da-8cd6-0800200c9a66}");
const nsLycosSMTPContactID = "@mozilla.org/LycosSMTP;1";
const ExtLycosGuid = "{10e6e940-8a9c-11d9-9669-0800200c9a66}";

const LycosSchema = "<?xml version=\"1.0\"?>\r\n<D:propfind xmlns:D=\"DAV:\" xmlns:h=\"http://schemas.microsoft.com/hotmail/\" xmlns:hm=\"urn:schemas:httpmail:\">\r\n<D:prop>\r\n<h:adbar/>\r\n<hm:contacts/>\r\n<hm:inbox/>\r\n<hm:outbox/>\r\n<hm:sendmsg/>\r\n<hm:sentitems/>\r\n<hm:deleteditems/>\r\n<hm:drafts/>\r\n<hm:msgfolderroot/>\r\n<h:maxpoll/>\r\n<h:sig/>\r\n</D:prop>\r\n</D:propfind>\r\n";
const LycosSendMsgPattern = /<hm:sendmsg>(.*?)<\/hm:sendmsg>/;
/******************************  Lycos ***************************************/
function nsLycosSMTP()
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
        var  szLogFileName = "Lycos SMTP Log - " + date.getHours()
                                           + "-" + date.getMinutes() 
                                           + "-"+ date.getUTCMilliseconds() +" -";
        this.m_Log = new DebugLog("webmail.logging.comms", ExtLycosGuid, szLogFileName); 
        
        this.m_Log.Write("nsLycosSMTP.js - Constructor - START");   
       
        this.m_bAuthorised = false;
        this.m_szUserName = null;   
        this.m_szPassWord = null; 
        this.m_oResponseStream = null;  
        this.m_HttpComms = new Comms(this , this.m_Log);
        this.m_szAuthRealm = null;
        this.m_iAuth = 0;
        this.m_bAuthorised = false; 
        this.m_aszTo = new Array;
        this.m_szFrom = null;
        this.m_iStage = 0;
        this.m_szSendUri = null;
              
        //do i save copy
        var oPref = new Object();
        oPref.Value = null;
        var  PrefAccess = new WebMailCommonPrefAccess();
        if (PrefAccess.Get("bool","lycos.bSaveCopy",oPref))
            this.m_bSaveCopy=oPref.Value;
        else
            this.m_bSaveCopy=true;          
        delete oPref;
              
        this.m_Log.Write("nsLycosSMTP.js - Constructor - END");  
    }
    catch(e)
    {
        DebugDump("nsLycosSMTP.js: Constructor : Exception : " 
                                      + e.name 
                                      + ".\nError message: " 
                                      + e.message +"\n" +
                                      e.lineNumber);
    }
}



nsLycosSMTP.prototype =
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
            this.m_Log.Write("nsLycosSMTP.js - logIN - START");   
            this.m_Log.Write("nsLycosSMTP.js - logIN - Username: " + this.m_szUserName 
                                                   + " Password: " + this.m_szPassWord 
                                                   + " stream: " + this.m_oResponseStream);
           
            if (!this.m_szUserName || !this.m_oResponseStream  || !this.m_szPassWord) return false;
                     
            var szTempUserName = this.m_szUserName.split("@");
            this.m_Log.Write("nsLycos.js - logIN - doamain " + szTempUserName); 
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
            
            this.m_iStage = 0;
            this.m_HttpComms.clean();
            this.m_HttpComms.setContentType(-1);
            this.m_HttpComms.setURI(szLocation);
            this.m_HttpComms.setRequestMethod("PROPFIND");
            this.m_HttpComms.addData(LycosSchema,"text/xml");
            var bResult = this.m_HttpComms.send(this.loginOnloadHandler);                             
            if (!bResult) throw new Error("httpConnection returned false");
            
            this.m_Log.Write("nsLycosSMTP.js - logIN - END");    
            return true;
        }
        catch(e)
        {
            this.m_Log.DebugDump("nsLycosSMTP.js: logIN : Exception : " 
                                              + e.name + 
                                              ".\nError message: " 
                                              + e.message +"\n" 
                                              + e.lineNumber);
                                              
            this.serverComms("502 negative vibes\r\n");
            
            return false;
        }
    },

   
    loginOnloadHandler : function(szResponse ,event , mainObject)
    {
        try
        {
            mainObject.m_Log.Write("nsLycosSMTP.js - loginOnloadHandler - START"); 
            mainObject.m_Log.Write("nsLycosSMTP.js - loginOnloadHandler : " + mainObject.m_iStage );  
            
            var httpChannel = event.QueryInterface(Components.interfaces.nsIHttpChannel);
            
            //if this fails we've gone somewhere new
            mainObject.m_Log.Write("nsLycosSMTP.js - loginOnloadHandler - status :" +httpChannel.responseStatus );
            if (httpChannel.responseStatus != 200 
                    && httpChannel.responseStatus != 207 
                        && httpChannel.responseStatus != 401) 
                throw new Error("return status " + httpChannel.responseStatus);
            
            //Authenticate
            if  (httpChannel.responseStatus == 401)
            {
                if ( mainObject.m_iAuth==2) throw new Error("login error");
                
                try
                {                
                    var szAuthenticate =  httpChannel.getResponseHeader("www-Authenticate");
                    mainObject.m_Log.Write("nsLycos.js - loginOnloadHandler - www-Authenticate " + szAuthenticate);
                    mainObject.m_iAuth++;
                }
                catch(err)
                {                   
                    throw new Error("szAuthenticate header not found")
                }     
                    
                //basic or digest
                if (szAuthenticate.search(/basic/i)!= -1)
                {//authentication on the cheap
                    mainObject.m_Log.Write("nsLycos.js - loginOnloadHandler - basic Authenticate");
                   
                    if (!mainObject.m_szAuthString) 
                    {
                        var oBase64 = new base64();
                        mainObject.m_szAuthString ="Basic ";
                        mainObject.m_szAuthString += oBase64.encode(mainObject.m_szUserName+":"+mainObject.m_szPassWord);
                    }
                    
                    mainObject.m_HttpComms.clean();
                    mainObject.m_HttpComms.setContentType(-1);
                    mainObject.m_HttpComms.setURI(httpChannel.URI.spec);
                    mainObject.m_HttpComms.setRequestMethod("PROPFIND");
                    mainObject.m_HttpComms.addData(LycosSchema,"text/xml");
                    mainObject.m_HttpComms.addRequestHeader("Authorization", mainObject.m_szAuthString , false);
                    var bResult = mainObject.m_HttpComms.send(mainObject.loginOnloadHandler);                             
                    if (!bResult) throw new Error("httpConnection returned false");
                }
                else if (szAuthenticate.search(/digest/i)!= -1)
                {
                    throw new Error("unspported authentication method");
                }
                else
                    throw new Error("unknown authentication method");
            } 
            else  //everything else
            {
                mainObject.m_Log.Write("nsLycos.js - loginOnloadHandler - get url - start");
                mainObject.m_iAuth=0; //reset login counter
               
                mainObject.m_szSendUri = szResponse.match(LycosSendMsgPattern)[1];
                mainObject.m_Log.Write("nsLycos.js - loginOnloadHandler - Send URi - " +mainObject.m_szSendUri);
                //server response
                mainObject.serverComms("235 Your In\r\n");
                mainObject.m_bAuthorised = true;
                        
                mainObject.m_Log.Write("nsLycos.js - loginOnloadHandler - get url - end"); 
            }
            
            mainObject.m_Log.Write("nsLycosSMTP.js - loginOnloadHandler - END");
        }
        catch(err)
        {
            mainObject.m_Log.DebugDump("nsLycosSMTP.js: loginHandler : Exception : " 
                                          + err.name 
                                          + ".\nError message: " 
                                          + err.message +"\n" +
                                            err.lineNumber);
                                            
            mainObject.serverComms("502 negative vibes\r\n");
        }
    },
    
    
    rawMSG : function (szEmail)
    {
        try
        {
            this.m_Log.Write("nsLycosSMTP.js - rawMSG - START");   
            this.m_Log.Write("nsLycosSMTP.js - rawMSG " + szEmail);
    
            this.m_iStage = 0;
            szEmail = szEmail.replace(/^\.$/m, ""); //removes SMTP termiator
            //get composer page
            var szMsg = "MAIL FROM:<"+this.m_szFrom+">\r\n";
            for (i=0; i< this.m_aszTo.length; i++)
            {
                szMsg +="RCPT TO:<"+this.m_aszTo[i]+">\r\n";
            }
            szMsg +="\r\n";
            szMsg += szEmail;
            szMsg +="\r\n\r\n";
            
            this.m_HttpComms.clean();
            this.m_HttpComms.setContentType(-1);
            this.m_HttpComms.setURI(this.m_szSendUri);
            this.m_HttpComms.setRequestMethod("POST");
            this.m_HttpComms.addRequestHeader("SAVEINSENT", this.m_bSaveCopy?"t":"f", false); 
            this.m_HttpComms.addData(szMsg,"message/rfc821");     
            this.m_HttpComms.addRequestHeader("Authorization", this.m_szAuthString , false);  
            var bResult = this.m_HttpComms.send(this.composerOnloadHandler);  
            if (!bResult) throw new Error("httpConnection returned false");
            
            this.m_Log.Write("nsLycosSMTP.js - rawMSG - END");    
            return true;
        }
        catch(err)
        {
            this.m_Log.DebugDump("nsLycosSMTP.js: rawMSG : Exception : " 
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
    
    
    ////////////////////////////////////////////////////////////////////////////
    /////  Comms                  
    
    serverComms : function (szMsg)
    {
        try
        { 
            this.m_Log.Write("nsLycosSMTP.js - serverComms - START");
            this.m_Log.Write("nsLycosSMTP.js - serverComms msg " + szMsg);
            var iCount = this.m_oResponseStream.write(szMsg,szMsg.length);
            this.m_Log.Write("nsLycosSMTP.js - serverComms sent count: " + iCount 
                                                        +" msg length: " +szMsg.length);
            this.m_Log.Write("nsLycosSMTP.js - serverComms - END");  
        }
        catch(e)
        {
            this.m_Log.DebugDump("nsLycosSMTP.js: serverComms : Exception : " 
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
var nsLycosSMTPFactory = new Object();

nsLycosSMTPFactory.createInstance = function (outer, iid)
{
    if (outer != null) throw Components.results.NS_ERROR_NO_AGGREGATION;
    
    if (!iid.equals(nsLycosSMTPClassID) && !iid.equals(Components.interfaces.nsISupports))
        throw Components.results.NS_ERROR_INVALID_ARG;
    
    return new nsLycosSMTP();
}


/******************************************************************************/
/* MODULE */
var nsLycosSMTPModule = new Object();

nsLycosSMTPModule.registerSelf = function(compMgr, fileSpec, location, type)
{
    compMgr = compMgr.QueryInterface(Components.interfaces.nsIComponentRegistrar);
    compMgr.registerFactoryLocation(nsLycosSMTPClassID,
                                    "LycosSMTPComponent",
                                    nsLycosSMTPContactID, 
                                    fileSpec,
                                    location, 
                                    type);
}


nsLycosSMTPModule.unregisterSelf = function(aCompMgr, aFileSpec, aLocation)
{
    aCompMgr = aCompMgr.QueryInterface(Components.interfaces.nsIComponentRegistrar);
    aCompMgr.unregisterFactoryLocation(nsLycosSMTPClassID, aFileSpec);
}

 
nsLycosSMTPModule.getClassObject = function(compMgr, cid, iid)
{
    if (!cid.equals(nsLycosSMTPClassID))
        throw Components.results.NS_ERROR_NO_INTERFACE;

    if (!iid.equals(Components.interfaces.nsIFactory))
        throw Components.results.NS_ERROR_NOT_IMPLEMENTED;

    return nsLycosSMTPFactory;
}


nsLycosSMTPModule.canUnload = function(compMgr)
{
    return true;
}
/******************************************************************************/


function NSGetModule(compMgr, fileSpec)
{
    return nsLycosSMTPModule; 
}