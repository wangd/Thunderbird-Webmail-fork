/*****************************  Globals   *************************************/                 
const nsHotmailSMTPClassID = Components.ID("{8b9baa40-1296-11da-8cd6-0800200c9a66}");
const nsHotmailSMTPContactID = "@mozilla.org/HotmailSMTP;1";
const ExtHotmailGuid = "{3c8e8390-2cf6-11d9-9669-0800200c9a66}";

/************************Screen Rippper constants******************************/
const patternHotmailSMTPSRuri =/[^\.\/]+\.[^\.\/]+$/;


/************************Webdav constants *************************************/
const patternHotmailPOPWDuri = /.*?\.(.*?)$/;
const HotmailSMTPSchema = "<?xml version=\"1.0\"?>\r\n<D:propfind xmlns:D=\"DAV:\" xmlns:h=\"http://schemas.microsoft.com/hotmail/\" xmlns:hm=\"urn:schemas:httpmail:\">\r\n<D:prop>\r\n<h:adbar/>\r\n<hm:contacts/>\r\n<hm:inbox/>\r\n<hm:outbox/>\r\n<hm:sendmsg/>\r\n<hm:sentitems/>\r\n<hm:deleteditems/>\r\n<hm:drafts/>\r\n<hm:msgfolderroot/>\r\n<h:maxpoll/>\r\n<h:sig/>\r\n</D:prop>\r\n</D:propfind>";
const HotmailSMTPFolderSchema = "<?xml version=\"1.0\"?>\r\n<D:propfind xmlns:D=\"DAV:\" xmlns:hm=\"urn:schemas:httpmail:\">\r\n<D:prop>\r\n<D:isfolder/>\r\n<D:displayname/>\r\n<hm:special/>\r\n<D:hassubs/>\r\n<D:nosubs/>\r\n<hm:unreadcount/>\r\n<D:visiblecount/>\r\n<hm:special/>\r\n</D:prop>\r\n</D:propfind>";
const HotmailSMTPMailSchema = "<?xml version=\"1.0\"?>\r\n<D:propfind xmlns:D=\"DAV:\" xmlns:hm=\"urn:schemas:httpmail:\" xmlns:m=\"urn:schemas:mailheader:\">\r\n<D:prop>\r\n<D:isfolder/>\r\n<hm:read/>\r\n<m:hasattachment/>\r\n<m:to/>\r\n<m:from/>\r\n<m:subject/>\r\n<m:date/>\r\n<D:getcontentlength/>\r\n</D:prop>\r\n</D:propfind>";
const HotmailSendMsgPattern = /<hm:sendmsg>(.*?)<\/hm:sendmsg>/;

/*************************Screen Ripper Constants *****************************/
const patternHotmailSMTPForm = /<form.*?>[\S\s]*?<\/form>/;
const patternHotmailSMTPAction = /<form.*?action="(.*?)".*?>/;
const patternHotmailSMTPInput = /<input.*?>/igm;
const patternHotmailSMTPType = /type="(.*?)"/i;
const patternHotmailSMTPName = /name="(.*?)"/i;
const patternHotmailSMTPValue = /value="(.*?)"/i;
const patternHotmailSMTPRefresh =/<META.*?HTTP-EQUIV="REFRESH".*?URL=(.*?)".*?>/i;
const patternHotmailSMTPJavaRefresh = /top.location.replace\("(.*?)"\);/i
const patternHotmailSMTP_UM = /_UM="(.*?)"/;
const patternHotmailSMTPComposer = /onclick="G\('(.*?compose\?.*?)'\);"/i;
const patternHotmailSMTPCompForm = /<form\s+name="composeform".*?>[\S\s]*?<\/form>/igm;

/******************************  Hotmail ***************************************/
function nsHotmailSMTP()
{
    try
    {       
        var scriptLoader =  Components.classes["@mozilla.org/moz/jssubscript-loader;1"];
        scriptLoader = scriptLoader.getService(Components.interfaces.mozIJSSubScriptLoader);
        scriptLoader.loadSubScript("chrome://web-mail/content/common/DebugLog.js");
        scriptLoader.loadSubScript("chrome://web-mail/content/common/CommonPrefs.js");
        scriptLoader.loadSubScript("chrome://hotmail/content/Hotmail-WebDav-SMTP.js");
        scriptLoader.loadSubScript("chrome://hotmail/content/Hotmail-ScreenRipper-SMTP.js");
              
        
        var date = new Date();
        var  szLogFileName = "Hotmail SMTP Log - " + date.getHours()
                                           + "-" + date.getMinutes() 
                                           + "-"+ date.getUTCMilliseconds() +" -";
        this.m_Log = new DebugLog("webmail.logging.comms", ExtHotmailGuid, szLogFileName); 
        
        this.m_Log.Write("nsHotmailSMTP.js - Constructor - START");   
       
        this.m_szUserName = null;   
        this.m_szPassWord = null; 
        this.m_oResponseStream = null;  
        this.m_aszTo = new Array;
        this.m_szFrom = null;
        this.m_CommMethod = null;
              
        //do i save copy
        var oPref = new Object();
        oPref.Value = null;
        var  PrefAccess = new WebMailCommonPrefAccess();
        if (PrefAccess.Get("bool","hotmail.bSaveCopy",oPref))
            this.m_bSaveCopy=oPref.Value;
        else
            this.m_bSaveCopy=true;          
        delete oPref;
        
        
        this.m_Log.Write("nsHotmailSMTP.js - Constructor - END");  
    }
    catch(err)
    {
        DebugDump("nsHotmailSMTP.js: Constructor : Exception : " 
                                      + err.name 
                                      + ".\nError message: " 
                                      + err.message +"\n" +
                                      err.lineNumber);
    }
}



nsHotmailSMTP.prototype =
{
    get userName() {return this.m_szUserName;},
    set userName(userName) {return this.m_szUserName = userName;},
  
    get passWord() {return this.m_szPassWord;},
    set passWord(passWord) {return this.m_szPassWord = passWord;},
    
    get ResponseStream() {return this.m_oResponseStream;},
    set ResponseStream(responseStream) {return this.m_oResponseStream = responseStream;},
    
    get to() {return this.m_aszTo;},
    set to(szAddress) {return this.m_aszTo.push(szAddress);},
    
    get from() {return this.m_szFrom;},
    set from(szAddress) {return this.m_szFrom = szAddress;},
    
    get bAuthorised() 
    {
        return (this.m_CommMethod)? this.m_CommMethod.m_bAuthorised: false;
    },
  
    
    
    
    logIn : function()
    {
        try
        {
            this.m_Log.Write("nsHotmailSMTP.js - logIN - START");   
            this.m_Log.Write("nsHotmailSMTP.js - logIN - Username: " + this.m_szUserName 
                                                   + " Password: " + this.m_szPassWord 
                                                   + " stream: " + this.m_oResponseStream);
           
            if (!this.m_szUserName || !this.m_oResponseStream  || !this.m_szPassWord) return false;
             
            //load webdav address
            var iAccountNum=0;
            var WebMailPrefAccess = new WebMailCommonPrefAccess();
            var oPref = new Object();
            oPref.Value = null;
            
            if (WebMailPrefAccess.Get("int","hotmail.webdav.iAccountNum",oPref))
                iAccountNum = oPref.Value;
            
            if (iAccountNum>0)
            {
                this.m_Log.Write("nsHotmailSMTP.js - logIN - Accountnum " + iAccountNum);
                for (i=0; i<iAccountNum; i++)
                {
                    this.m_Log.Write("nsHotmailSMTP.js - logIN - username search " + i);
                    WebMailPrefAccess.Get("char","hotmail.webdav.Account."+i,oPref);
                    var reg = new RegExp(oPref.Value,"i");
                    this.m_Log.Write("nsHotmailSMTP.js - logIN - username search " + reg);
                    if (this.m_szUserName.match(reg))
                    {
                        this.m_Log.Write("nsHotmailSMTP.js - logIN - username found");  
                        this.m_CommMethod = new HotmailSMTPWebDav(this.m_oResponseStream, 
                                                                  this.m_Log, 
                                                                  this.m_bSaveCopy);    
                    } 
                }
            }
           
            if (!this.m_CommMethod)
                this.m_CommMethod = new HotmailSMTPScreenRipper(this.m_oResponseStream, 
                                                                this.m_Log, 
                                                                this.m_bSaveCopy);
             
            var bResult = this.m_CommMethod.logIn(this.m_szUserName,   
                                                  this.m_szPassWord);
                       
            this.m_Log.Write("nsHotmailSMTP.js - logIN - "+ bResult +"- END");    
            return bResult;
        }
        catch(err)
        {
            this.m_Log.DebugDump("nsHotmailSMTP.js: logIN : Exception : " 
                                              + err.name + 
                                              ".\nError message: " 
                                              + err.message+ "\n"
                                              + err.lineNumber);
                                              
            this.serverComms("502 negative vibes\r\n");
            return false;
        }
    },

       
    
    rawMSG : function (szEmail)
    {
        try
        {
            this.m_Log.Write("nsHotmailSMTP.js - rawMSG - START");   
            this.m_Log.Write("nsHotmailSMTP.js - rawMSG " + szEmail);
    
            var bResult = this.m_CommMethod.rawMSG(this.m_szFrom, 
                                                   this.m_aszTo,
                                                   szEmail);
            
            this.m_Log.Write("nsHotmailSMTP.js - rawMSG -" + bResult +" END");    
            return bResult;
        }
        catch(err)
        {
            this.m_Log.DebugDump("nsHotmailSMTP.js: rawMSG : Exception : " 
                                              + err.name + 
                                              ".\nError message: " 
                                              + err.message+ "\n"
                                              + err.lineNumber);
                                              
            this.serverComms("502 negative vibes\r\n");
            return false;
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
var nsHotmailSMTPFactory = new Object();

nsHotmailSMTPFactory.createInstance = function (outer, iid)
{
    if (outer != null) throw Components.results.NS_ERROR_NO_AGGREGATION;
    
    if (!iid.equals(nsHotmailSMTPClassID) && !iid.equals(Components.interfaces.nsISupports))
        throw Components.results.NS_ERROR_INVALID_ARG;
    
    return new nsHotmailSMTP();
}


/******************************************************************************/
/* MODULE */
var nsHotmailSMTPModule = new Object();

nsHotmailSMTPModule.registerSelf = function(compMgr, fileSpec, location, type)
{
    compMgr = compMgr.QueryInterface(Components.interfaces.nsIComponentRegistrar);
    compMgr.registerFactoryLocation(nsHotmailSMTPClassID,
                                    "HotmailSMTPComponent",
                                    nsHotmailSMTPContactID, 
                                    fileSpec,
                                    location, 
                                    type);
}


nsHotmailSMTPModule.unregisterSelf = function(aCompMgr, aFileSpec, aLocation)
{
    aCompMgr = aCompMgr.QueryInterface(Components.interfaces.nsIComponentRegistrar);
    aCompMgr.unregisterFactoryLocation(nsHotmailSMTPClassID, aFileSpec);
}

 
nsHotmailSMTPModule.getClassObject = function(compMgr, cid, iid)
{
    if (!cid.equals(nsHotmailSMTPClassID))
        throw Components.results.NS_ERROR_NO_INTERFACE;

    if (!iid.equals(Components.interfaces.nsIFactory))
        throw Components.results.NS_ERROR_NOT_IMPLEMENTED;

    return nsHotmailSMTPFactory;
}


nsHotmailSMTPModule.canUnload = function(compMgr)
{
    return true;
}
/******************************************************************************/


function NSGetModule(compMgr, fileSpec)
{
    return nsHotmailSMTPModule; 
}
