/*****************************  Globals   *************************************/                 
const nsAOLSMTPClassID = Components.ID("{411242b0-9b47-11da-a72b-0800200c9a66}");
const nsAOLSMTPContactID = "@mozilla.org/AOLSMTP;1";
const ExtAOLGuid = "{3c8e8390-2cf6-11d9-9669-0800200c9a66}";

const patternAOLReplace = /parent\.location\.replace\("(.*?)"\);/i;
const patternAOLRedirect = /goToLoginUrl[\s\S]*snsRedir\("(.*?)"\)/i;
const patternAOLLoginForm = /<form.*?loginForm.*?>[\s\S]*<\/form>/igm;
const patternAOLAction = /<form.*?action="(.*?)".*?>/;
const patternAOLInput = /<input.*?>/igm;
const patternAOLType = /type="(.*?)"/i;
const patternAOLName = /name="(.*?)"/i;
const patternAOLValue = /value="(.*?)"/i;
const patternAOLVerify = /<body onLoad=".*?'(http.*?)'.*>/i;
const patternAOLHost = /gPreferredHost.*?"(.*?)";/i;
const patternAOLPath = /gSuccessPath.*?"(.*?)";/i;
const patternAOLHostCheck = /gHostCheckPath.*?"(.*?)"/i;
const patternAOLTarget = /gTargetHost.*?"(.*?)"/i;
const patternAOLMSGList = /gMessageButtonVisibility/i;
const patternAOLVersion =/var VERSION="(.*?)"/i;
const patternAOLUserID =/uid:(.*?)&/i;


/******************************  AOL ***************************************/
function nsAOLSMTP()
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
        var  szLogFileName = "AOLSMTP Log - " + date.getHours()
                                           + "-" + date.getMinutes() 
                                           + "-"+ date.getUTCMilliseconds() +" -";
        this.m_Log = new DebugLog("webmail.logging.comms", ExtAOLGuid, szLogFileName); 
        
        this.m_Log.Write("nsAOLSMTP.js - Constructor - START");   
       
        this.m_bAuthorised = false;
        this.m_szUserName = null;   
        this.m_szPassWord = null; 
        this.m_oResponseStream = null;  
        this.m_HttpComms = new Comms(this , this.m_Log);
        this.m_aszTo = new Array;
        this.m_szFrom = null;
        this.m_iStage = 0;
                
        this.m_SuccessPath = null;
        this.m_szHostURL = null;
        this.m_szHomeURI = null;
        this.m_szUserId = null;
        this.m_szVersion = null;
        this.m_szLocation = null;
        this.m_bReEntry = false;
        this.m_szAOLMail = null;
        this.m_szSendUri = null;  
           
        this.m_SessionManager = Components.classes["@mozilla.org/SessionManager;1"];
        this.m_SessionManager = this.m_SessionManager.getService();
        this.m_SessionManager.QueryInterface(Components.interfaces.nsISessionManager); 
        this.m_SessionData = null;   
        
        //do i reuse the session
        var oPref = {Value:null};
        var  WebMailPrefAccess = new WebMailCommonPrefAccess();
        if (WebMailPrefAccess.Get("bool","aol.bReUseSession",oPref))
            this.m_bReUseSession=oPref.Value;
        else
            this.m_bReUseSession=true; 
                          
        this.m_Log.Write("nsAOLSMTP.js - Constructor - END");  
    }
    catch(e)
    {
        DebugDump("nsAOLSMTP.js: Constructor : Exception : " 
                                      + e.name 
                                      + ".\nError message: " 
                                      + e.message +"\n" +
                                      e.lineNumber);
    }
}



nsAOLSMTP.prototype =
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
            this.m_Log.Write("nsAOL.js - logIN - START");   
            this.m_Log.Write("nsAOL.js - logIN - Username: " + this.m_szUserName 
                                                   + " Password: "  + this.m_szPassWord 
                                                   + " stream: "    + this.m_oResponseStream);
            
            if (!this.m_szUserName || !this.m_oResponseStream || !this.m_szPassWord) return false;
            
            var szTempUserName = this.m_szUserName.split("@");
            this.m_Log.Write("nsAOL.js - logIN - doamain " + szTempUserName); 
            var szDomain = szTempUserName[1];
            
            if (szDomain.search(/aim/i)!=-1) 
                this.m_szAOLMail= "http://webmail.aol.com/";  
            else if (szDomain.search(/netscape/i)!=-1)
                this.m_szAOLMail= "http://mail.netscape.com/";  
            else
                this.m_szAOLMail= "http://webmail.aol.com/";
            
            this.m_HttpComms.clean();
            
            this.m_SessionData = this.m_SessionManager.findSessionData(this.m_szUserName);
            if (this.m_SessionData && this.m_bReUseSession)
            {
                this.m_Log.Write("nsAOL.js - logIN - Session Data found");
                
                this.m_HttpComms.setCookieManager(this.m_SessionData.oCookieManager);
                this.m_szHomeURI = this.m_SessionData.oComponentData.findElement("szHomeURI");
                this.m_Log.Write("nsAOL.js - logIN - m_szHomeURI " +this.m_szHomeURI);
                this.m_szUserId = this.m_SessionData.oComponentData.findElement("szUserId");
                this.m_Log.Write("nsAOL.js - logIN - m_szUserId " +this.m_szUserId);   
                this.m_szVersion = this.m_SessionData.oComponentData.findElement("szVersion");
                this.m_Log.Write("nsAOL.js - logIN - m_szVersion " +this.m_szVersion);      
                this.m_SuccessPath = this.m_SessionData.oComponentData.findElement("szSuccessPath");
                this.m_Log.Write("nsAOL.js - logIN - .m_SuccessPath " +this.m_SuccessPath); 
                this.m_szHostURL = this.m_SessionData.oComponentData.findElement("szHostURL");
                this.m_Log.Write("nsAOL.js - logIN - .m_szHostURL" +this.m_szHostURL); 
                this.m_szLocation = this.m_SessionData.oComponentData.findElement("szLocation");
                this.m_Log.Write("nsAOL.js - logIN - .m_szLocation" +this.m_szLocation);
                
                //get home page
                this.m_iStage =6;
                this.m_bReEntry = true;
                this.m_HttpComms.setURI(this.m_szHomeURI);
                this.m_HttpComms.setRequestMethod("GET");
                var bResult = this.m_HttpComms.send(this.loginOnloadHandler);                             
                if (!bResult) throw new Error("httpConnection returned false");
            }
            else
            {   
                this.m_iStage = 0;
                this.m_HttpComms.setURI(this.m_szAOLMail);
                this.m_HttpComms.setRequestMethod("GET");
                var bResult = this.m_HttpComms.send(this.loginOnloadHandler);                             
                if (!bResult) throw new Error("httpConnection returned false");        
            }
                              
            this.m_Log.Write("nsAOL.js - logIN - END " + bResult);    
            return true;
        }
        catch(e)
        {
            this.m_Log.DebugDump("nsAOL.js: logIN : Exception : " 
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
            mainObject.m_Log.Write("nsAOL.js - loginOnloadHandler - START"); 
            mainObject.m_Log.Write("nsAOL.js - loginOnloadHandler : " + mainObject.m_iStage);  
            
            var httpChannel = event.QueryInterface(Components.interfaces.nsIHttpChannel);
            
            //if this fails we've gone somewhere new
            mainObject.m_Log.Write("nsAOL.js - loginOnloadHandler - status :" +httpChannel.responseStatus );
            if (httpChannel.responseStatus != 200)
            { 
                if (mainObject.m_iStage!=5)
                    throw new Error("return status " + httpChannel.responseStatus);
            }
            
            mainObject.m_HttpComms.clean();
            
             //page code                                
            switch (mainObject.m_iStage)
            {
                case 0: // login page               
                    var szLoginReplaceURL = szResponse.match(patternAOLReplace)[1];
                    mainObject.m_Log.Write("nsAOL.js - loginOnloadHandler - replace " + szLoginReplaceURL);
                    if (szLoginReplaceURL == null)
                         throw new Error("error parsing AOL login web page");

                    mainObject.m_HttpComms.setURI(szLoginReplaceURL);
                    mainObject.m_HttpComms.setRequestMethod("GET");
                    var bResult = mainObject.m_HttpComms.send(mainObject.loginOnloadHandler);      
                    if (!bResult) throw new Error("httpConnection returned false");
                    mainObject.m_iStage++;
                break;
                
                
                case 1://redirect
                    var szLoginRedirectURL = szResponse.match(patternAOLRedirect)[1];
                    mainObject.m_Log.Write("nsAOL.js - loginOnloadHandler - redirect " + szLoginRedirectURL);
                    if (szLoginRedirectURL == null)
                         throw new Error("error parsing AOL login web page");
                         
                    mainObject.m_HttpComms.setURI(szLoginRedirectURL);
                    mainObject.m_HttpComms.setRequestMethod("GET");
                    var bResult = mainObject.m_HttpComms.send(mainObject.loginOnloadHandler);      
                    if (!bResult) throw new Error("httpConnection returned false");
                    mainObject.m_iStage++;
                    
                break;
                
                
                case 2: //login page
                    var szLoginForm = szResponse.match(patternAOLLoginForm);
                    mainObject.m_Log.Write("nsAOL.js - loginOnloadHandler - szLoginForm " + szLoginForm);
                    if (szLoginForm == null)
                        throw new Error("error parsing AOL login web page");
                         
                    var aLoginData = szLoginForm[0].match(patternAOLInput);
                    mainObject.m_Log.Write("nsAOL.js - loginOnloadHandler - aLoginData " + aLoginData);
                    
                    for (i=0; i<aLoginData.length; i++)
                    {
                        if (aLoginData[i].search(/type="hidden"/i)!=-1)
                        {
                            var szName=aLoginData[i].match(patternAOLName)[1];
                            mainObject.m_Log.Write("nsAOL.js - loginOnloadHandler - loginData name " + szName);
                            
                            var szValue = aLoginData[i].match(patternAOLValue)[1];
                            mainObject.m_Log.Write("nsAOL.js - loginOnloadHandler - loginData value " + szValue);
                        
                            mainObject.m_HttpComms.addValuePair(szName,(szValue? encodeURIComponent(szValue):""));
                         }
                    }
                    
                    var szScreenName = mainObject.m_szUserName.split("@")[0];
                    var szLogin = encodeURIComponent(szScreenName);
                    mainObject.m_HttpComms.addValuePair("loginId",szLogin);
                    
                    var szPass = encodeURIComponent(mainObject.m_szPassWord);
                    mainObject.m_HttpComms.addValuePair("password",szPass);
                    
                    var szAction = szLoginForm[0].match(patternAOLAction)[1];
                    var szLoginURL = httpChannel.URI.prePath + szAction;
                    mainObject.m_Log.Write("nsAOL.js - loginOnloadHandler - szLoginURL : "+szLoginURL);
                    
                    mainObject.m_HttpComms.setURI(szLoginURL);
                    mainObject.m_HttpComms.setRequestMethod("POST");
                    var bResult = mainObject.m_HttpComms.send(mainObject.loginOnloadHandler);      
                    if (!bResult) throw new Error("httpConnection returned false");
                    mainObject.m_iStage++;
                break;
                
                
                case 3://login bounce 
                    var szLoginVerify = szResponse.match(patternAOLVerify)[1];
                    mainObject.m_Log.Write("nsAOL.js - loginOnloadHandler - szLoginVerify " + szLoginVerify);
                    if (szLoginVerify == null)
                        throw new Error("error parsing AOL login web page");
                   
                    mainObject.m_HttpComms.setURI(szLoginVerify);
                    mainObject.m_HttpComms.setRequestMethod("GET");
                    var bResult = mainObject.m_HttpComms.send(mainObject.loginOnloadHandler);      
                    if (!bResult) throw new Error("httpConnection returned false");
                    mainObject.m_iStage++;
                break;
                
                case 4://get host
                    mainObject.m_szHostURL = szResponse.match(patternAOLHost)[1];
                    if (mainObject.m_szHostURL == null)
                        throw new Error("error parsing AOL login web page");
                    mainObject.m_SuccessPath = szResponse.match(patternAOLPath)[1];
                    var szCheck = szResponse.match(patternAOLHostCheck)[1];
                    var szURL = "http://" + mainObject.m_szHostURL + szCheck;
                               
                    mainObject.m_HttpComms.setURI(szURL);
                    mainObject.m_HttpComms.setRequestMethod("GET");
                    var bResult = mainObject.m_HttpComms.send(mainObject.loginOnloadHandler);      
                    if (!bResult) throw new Error("httpConnection returned false");
                    mainObject.m_iStage++;
                break;
                
                case 5://get mail box                   
                    mainObject.m_szHostURL = szResponse.match(patternAOLTarget)[1];
                    mainObject.m_Log.Write("nsAOL.js - loginOnloadHandler - m_szHostURL " +mainObject.m_szHostURL);
                    if (mainObject.m_szHostURL == null)
                        throw new Error("error parsing AOL login web page");
                   
                    var szURL = "http://" + mainObject.m_szHostURL + mainObject.m_SuccessPath;
                    mainObject.m_szHomeURI = szURL;
                    
                    var szCookies =  httpChannel.getResponseHeader("Set-Cookie");                   
                    mainObject.m_szUserId = szCookies.match(patternAOLUserID)[1];
                    mainObject.m_Log.Write("nsAOL.js - loginOnloadHandler - m_szUserId " +mainObject.m_szUserId);
                    
                    mainObject.m_HttpComms.setURI(szURL);
                    mainObject.m_HttpComms.setRequestMethod("GET");
                    var bResult = mainObject.m_HttpComms.send(mainObject.loginOnloadHandler);      
                    if (!bResult) throw new Error("httpConnection returned false");
                    mainObject.m_iStage++;
                break;
                
                case 6://get urls
                    if(szResponse.search(patternAOLMSGList)==-1)
                    {
                        if (mainObject.m_bReEntry)
                        {
                            mainObject.m_bReEntry = false;
                            mainObject.m_iStage =0;
                            mainObject.m_HttpComms.setURI(mainObject.m_szAOLMail);
                            mainObject.m_HttpComms.setRequestMethod("GET");
                            var bResult = mainObject.m_HttpComms.send(mainObject.loginOnloadHandler);                             
                            if (!bResult) throw new Error("httpConnection returned false");
                            return;
                        }
                        else
                            throw new Error("error logging in");
                    }
                      
                    mainObject.m_szVersion = szResponse.match(patternAOLVersion)[1];
                    mainObject.m_Log.Write("nsAOL.js - loginOnloadHandler - szVersion " +mainObject.m_szVersion);
                    
                    var szDir = mainObject.m_SuccessPath.replace(/\/Mail\//i,"/rpc/");
                    mainObject.m_szLocation = "http://" + mainObject.m_szHostURL + szDir ;
                    var szURL = mainObject.m_szLocation + "GetMessageList.aspx?page=1";
                    var szData = "previousFolder=&stateToken=&newMailToken=&"
                    szData += "version="+ mainObject.m_szVersion +"&user="+ mainObject.m_szUserId;
                    
                   
                    //server response
                    mainObject.serverComms("235 Your In\r\n");
                    mainObject.m_bAuthorised = true;
                break;
            }
            mainObject.m_Log.Write("nsAOL.js - loginOnloadHandler - END");
        }
        catch(err)
        {
            mainObject.m_Log.DebugDump("nsAOLSMTP.js: loginHandler : Exception : " 
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
            this.m_Log.Write("nsAOLSMTP.js - rawMSG - START");   
            this.m_Log.Write("nsAOLSMTP.js - rawMSG " + szEmail);
    
            this.m_iStage = 0;
                       
            this.m_Log.Write("nsAOLSMTP.js - rawMSG - END");    
            return true;
        }
        catch(err)
        {
            this.m_Log.DebugDump("nsAOLSMTP.js: rawMSG : Exception : " 
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
            mainObject.m_Log.Write("nsAOLSMTP.js - composerOnloadHandler - START"); 
            mainObject.m_Log.Write("nsAOLSMTP.js - composerOnloadHandler : " + mainObject.m_iStage + "\n");  
            
            var httpChannel = event.QueryInterface(Components.interfaces.nsIHttpChannel);
            
            //if this fails we've gone somewhere new
            mainObject.m_Log.Write("nsAOLSMTP.js - composerOnloadHandler - status :" +httpChannel.responseStatus );
            if (httpChannel.responseStatus != 200) 
                throw new Error("return status " + httpChannel.responseStatus);
           
            mainObject.m_Log.Write("nsAOLSMTP.js - composerOnloadHandler - END");
        }
        catch(err)
        {
            mainObject.m_Log.DebugDump("nsAOLSMTP.js: composerOnloadHandler : Exception : " 
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
            this.m_Log.Write("nsAOLSMTP.js - serverComms - START");
            this.m_Log.Write("nsAOLSMTP.js - serverComms msg " + szMsg);
            var iCount = this.m_oResponseStream.write(szMsg,szMsg.length);
            this.m_Log.Write("nsAOLSMTP.js - serverComms sent count: " + iCount 
                                                        +" msg length: " +szMsg.length);
            this.m_Log.Write("nsAOLSMTP.js - serverComms - END");  
        }
        catch(e)
        {
            this.m_Log.DebugDump("nsAOLSMTP.js: serverComms : Exception : " 
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
var nsAOLSMTPFactory = new Object();

nsAOLSMTPFactory.createInstance = function (outer, iid)
{
    if (outer != null) throw Components.results.NS_ERROR_NO_AGGREGATION;
    
    if (!iid.equals(nsAOLSMTPClassID) && !iid.equals(Components.interfaces.nsISupports))
        throw Components.results.NS_ERROR_INVALID_ARG;
    
    return new nsAOLSMTP();
}


/******************************************************************************/
/* MODULE */
var nsAOLSMTPModule = new Object();

nsAOLSMTPModule.registerSelf = function(compMgr, fileSpec, location, type)
{
    compMgr = compMgr.QueryInterface(Components.interfaces.nsIComponentRegistrar);
    compMgr.registerFactoryLocation(nsAOLSMTPClassID,
                                    "AOLSMTPComponent",
                                    nsAOLSMTPContactID, 
                                    fileSpec,
                                    location, 
                                    type);
}


nsAOLSMTPModule.unregisterSelf = function(aCompMgr, aFileSpec, aLocation)
{
    aCompMgr = aCompMgr.QueryInterface(Components.interfaces.nsIComponentRegistrar);
    aCompMgr.unregisterFactoryLocation(nsAOLSMTPClassID, aFileSpec);
}

 
nsAOLSMTPModule.getClassObject = function(compMgr, cid, iid)
{
    if (!cid.equals(nsAOLSMTPClassID))
        throw Components.results.NS_ERROR_NO_INTERFACE;

    if (!iid.equals(Components.interfaces.nsIFactory))
        throw Components.results.NS_ERROR_NOT_IMPLEMENTED;

    return nsAOLSMTPFactory;
}


nsAOLSMTPModule.canUnload = function(compMgr)
{
    return true;
}
/******************************************************************************/


function NSGetModule(compMgr, fileSpec)
{
    return nsAOLSMTPModule; 
}
