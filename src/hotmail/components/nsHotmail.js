/*****************************  Globals component ******************************/                 
const nsHotmailClassID = Components.ID("{3f3822e0-6374-11d9-9669-0800200c9a66}"); 
const nsHotmailContactID = "@mozilla.org/Hotmail;1";

/************************Screen Rippper constants******************************/
const patternHotmailPOPSRuri =/[^\.\/]+\.[^\.\/]+$/;
const patternHotmailPOPSRBounce = /<form.*action="(.*?)".*?>.*<input.*name="mspprawqs".*?value="(.*?)".*?>.*<input.*?name="mspppostint".*?value="(.*?)".*?>/;
const patternHotmailPOPSRBounceAlt = /<form.*action="(.*?)".*?>.*<input.*?name="mspppostint".*?value="(.*?)".*?>/;
const patternHotmailPOPSRLogIn = /<form.*?name="form1".*?action="(.*?)".*?>/;
const patternHotmailPOPSRLogInAlt = /<form.*?action="(.*?)".*?>/;
const patternHotmailPOPSRForm = /<input.*?name=".*?".*?value=".*?".*?>/igm;
const patternHotmailPOPSRType = /type="(.*?)"/i;
const patternHotmailPOPSRName = /name="(.*?)"/i;
const patternHotmailPOPSRValue = /value="(.*?)"/i;
const patternHotmailPOPSRRefresh =/<META.*?HTTP-EQUIV="REFRESH".*?URL=(.*?)".*?>/i;
const patternHotmailPOPSRLogout = /<td><a.*?href="(.*?\/cgi-bin\/logout\?curmbox=.*?").*?>/m;
const PatternHotmailPOPSRFolderBase = /document.location = "(.*?)"\+f/; 
const PatternHotmailPOPSRFolderList =/href="javascript:G\('\/cgi-bin\/folders\?'\)"(.*?)<a href="javascript:G\('\/cgi-bin\/folders\?'\)"/;
const PatternHotmailPOPSRFolderLinks =/<a.*?>/g;
const PatternHotmailPOPSRTabindex =/tabindex="(.*?)"/;
const PatternHotmailPOPSRHMFO =/HMFO\('(.*?)'\)/;
const patternHotmailPOPSRMailbox = /<a href="(\/cgi-bin\/HoTMaiL.*?)".*?tabindex=121/;
const patternHotmailPOPSRMsgTable = /MsgTable.*?>(.*?)<\/table>/m;
const patternHotmailPOPSR_UM = /_UM="(.*?)"/;
const patternHotmailPOPSRMultPageNum = /<select name="MultPageNum" onChange="window\.location\.href='(.*?)'\+_UM\+'(.*?)'.*?>(.*?)<\/select>/;
const patternHotmailPOPSRPages = /<option value="(.*?)".*?>/g;
const patternHotmailPOPSREmailURL = /<a.*?href="javascript:G\('(.*?)'\)">/; 
const patternHotmailPOPSREmailLength = /.*?&len=(.*?)&/;
const patternHotmailPOPSREmailID = /.*?msg=(.*?)&/;
const PatterHotmailPOPSRFolderID = /curmbox=(.*?)&/;
/*******************************************************************************/


/************************Webdav constants *************************************/
const patternHotmailPOPWDuri = /.*?\.(.*?)$/;
const HotmailPOPSchema = "<?xml version=\"1.0\"?>\r\n<D:propfind xmlns:D=\"DAV:\" xmlns:h=\"http://schemas.microsoft.com/hotmail/\" xmlns:hm=\"urn:schemas:httpmail:\">\r\n<D:prop>\r\n<h:adbar/>\r\n<hm:contacts/>\r\n<hm:inbox/>\r\n<hm:outbox/>\r\n<hm:sendmsg/>\r\n<hm:sentitems/>\r\n<hm:deleteditems/>\r\n<hm:drafts/>\r\n<hm:msgfolderroot/>\r\n<h:maxpoll/>\r\n<h:sig/>\r\n</D:prop>\r\n</D:propfind>";
const HotmailPOPFolderSchema = "<?xml version=\"1.0\"?>\r\n<D:propfind xmlns:D=\"DAV:\" xmlns:hm=\"urn:schemas:httpmail:\">\r\n<D:prop>\r\n<D:isfolder/>\r\n<D:displayname/>\r\n<hm:special/>\r\n<D:hassubs/>\r\n<D:nosubs/>\r\n<hm:unreadcount/>\r\n<D:visiblecount/>\r\n<hm:special/>\r\n</D:prop>\r\n</D:propfind>";
const HotmailPOPMailSchema = "<?xml version=\"1.0\"?>\r\n<D:propfind xmlns:D=\"DAV:\" xmlns:hm=\"urn:schemas:httpmail:\" xmlns:m=\"urn:schemas:mailheader:\">\r\n<D:prop>\r\n<D:isfolder/>\r\n<hm:read/>\r\n<m:hasattachment/>\r\n<m:to/>\r\n<m:from/>\r\n<m:subject/>\r\n<m:date/>\r\n<D:getcontentlength/>\r\n</D:prop>\r\n</D:propfind>";
const patternHotmailPOPFolder = /<hm:msgfolderroot>(.*?)<\/hm:msgfolderroot>/;
const patternHotmailPOPTrash = /<hm:deleteditems>(.*?)<\/hm:deleteditems>/;
const patternHotmailPOPMSGID = /[^\/]+$/;
const patternHotmailPOPResponse = /<D:response>[\S\d\s\r\n]*?<\/D:response>/gm;
const patternHotmailPOPTrashFolder = /<D:href>(.*?HM_BuLkMail.*?)<\/D:href>/i;
const patternHotmailPOPinboxFolder = /<D:href>(.*?\/folders\/active\/)<\/D:href>/i;
const patternHotmailPOPID = /<D:id>(.*?)<\/D:id>/;
const patternHotmailPOPHref = /<D:href>(.*?)<\/D:href>/;
const patternHotmailPOPSize = /<D:getcontentlength>(.*?)<\/D:getcontentlength>/;
/*******************************************************************************/



/************************************  Hotmail ********************************/

function nsHotmail()
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
            scriptLoader.loadSubScript("chrome://hotmail/content/Hotmail-WebDav.js");
            scriptLoader.loadSubScript("chrome://hotmail/content/Hotmail-ScreenRipper.js");
        }
        
        var date = new Date();
        
        var  szLogFileName = "Hotmail Log - " + date.getHours()+ "-" + date.getMinutes() + "-"+ date.getUTCMilliseconds() +" -";
        this.m_HotmailLog = new DebugLog("webmail.logging.comms", 
                                         "{3c8e8390-2cf6-11d9-9669-0800200c9a66}", 
                                         szLogFileName); 
        
        this.m_HotmailLog.Write("nsHotmail.js - Constructor - START");   
       
        this.m_szUserName = null;   
        this.m_szPassWord = null; 
        this.m_oResponseStream = null;       
        this.m_bAuthorised = false;
        this.m_CommMethod = null;
        
        //do i download junkmail
        var oPref = new Object();
        oPref.Value = null;
        var  WebMailPrefAccess = new WebMailCommonPrefAccess();
        if (WebMailPrefAccess.Get("bool","hotmail.bUseJunkMail",oPref))
            this.m_bUseJunkMail=oPref.Value;
        else
            this.m_bUseJunkMail=false;
                                                   
        this.m_HotmailLog.Write("nsHotmail.js - Constructor - END");  
    }
    catch(e)
    {
        DebugDump("nsHotmail.js: Constructor : Exception : " 
                                      + e.name 
                                      + ".\nError message: " 
                                      + e.message);
    }
}



nsHotmail.prototype =
{
    get userName() {return this.m_szUserName;},
    set userName(userName) {return this.m_szUserName = userName;},

    get passWord() {return this.m_szPassWord;},
    set passWord(passWord) {return this.m_szPassWord = passWord;},
    
    get bAuthorised() {return this.m_bAuthorised;},
  
    get ResponseStream() {return this.m_oResponseStream;},
    set ResponseStream(responseStream) {return this.m_oResponseStream = responseStream;},
    
    
    logIn : function()
    {
        try
        {
            this.m_HotmailLog.Write("nsHotmail.js - logIN - START");   
            this.m_HotmailLog.Write("nsHotmail.js - logIN - Username: " + this.m_szUserName 
                                                   + " Password: " + this.m_szPassWord 
                                                   + " stream: " + this.m_oResponseStream);
            
            if (!this.m_szUserName || !this.m_oResponseStream || !this.m_szPassWord) return false;
            
            
            //load webdav address
            var iAccountNum=0;
            var WebMailPrefAccess = new WebMailCommonPrefAccess();
            var oPref = new Object();
            oPref.Value = null;
            
            if (WebMailPrefAccess.Get("int","hotmail.webdav.iAccountNum",oPref))
                iAccountNum = oPref.Value;
            
            if (iAccountNum>0)
            {
                this.m_HotmailLog.Write("nsHotmail.js - logIN - Accountnum " + iAccountNum);
                for (i=0; i<iAccountNum; i++)
                {
                    this.m_HotmailLog.Write("nsHotmail.js - logIN - username search " + i);
                    WebMailPrefAccess.Get("char","hotmail.webdav.Account."+i,oPref);
                    var reg = new RegExp(oPref.Value,"i");
                    this.m_HotmailLog.Write("nsHotmail.js - logIN - username search " + reg);
                    if (this.m_szUserName.match(reg))
                    {
                        this.m_HotmailLog.Write("nsHotmail.js - logIN - username found");  
                        this.m_CommMethod = new HotmailWebDav(this);    
                    } 
                }
            }
           
            if (!this.m_CommMethod)
                this.m_CommMethod = new HotmailScreenRipper(this);
             
            var bResult = this.m_CommMethod.logIn();
                       
            this.m_HotmailLog.Write("nsHotmail.js - logIN - "+ bResult +"- END");    
            return bResult;
        }
        catch(e)
        {
            this.m_HotmailLog.DebugDump("nsHotmail.js: logIN : Exception : " 
                                              + e.name + 
                                              ".\nError message: " 
                                              + e.message);
            return false;
        }
    },


    
 
    
    //stat 
    //total size is in octets
    getNumMessages : function()
    {
        try
        {
            this.m_HotmailLog.Write("nsHotmail.js - getNumMessages - START"); 
            
            this.m_CommMethod.getNumMessages();
            
            this.m_HotmailLog.Write("nsHotmail.js - getNumMessages - END"); 
            return true;
        }
        catch(e)
        {
            this.m_HotmailLog.DebugDump("nsHotmail.js: getNumMessages : Exception : " 
                                          + e.name 
                                          + ".\nError message: " 
                                          + e.message);
            return false;
        }
    },
    
    
    
    
    
                     
    //list
    //i'm not downloading the mailbox again. 
    //I hope stat been called first or there's going to be trouble
    getMessageSizes : function() 
    {
        try
        {
            this.m_HotmailLog.Write("nsHotmail.js - getMessageSizes - START"); 
            
            this.m_CommMethod.getMessageSizes();
           
            this.m_HotmailLog.Write("nsHotmail.js - getMessageSizes - END"); 
            return true;
        }
        catch(e)
        {
            this.m_HotmailLog.DebugDump("nsHotmail.js: getMessageSizes : Exception : " 
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
            this.m_HotmailLog.Write("nsHotmail.js - getMessageIDs - START"); 
            
            this.m_CommMethod.getMessageIDs();
           
            this.m_HotmailLog.Write("nsHotmail.js - getMessageIDs - END"); 
            return true;
        }
        catch(e)
        {
            this.m_HotmailLog.DebugDump("nsHotmail.js: getMessageIDs : Exception : " 
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
            this.m_HotmailLog.Write("nsHotmail.js - getMessage - START"); 
             
            this.m_CommMethod.getMessage(lID);
             
            this.m_HotmailLog.Write("nsHotmail.js - getMessage - END"); 
            return true;
        }
        catch(e)
        {
             this.m_HotmailLog.DebugDump("nsHotmail.js: getMessage : Exception : " 
                                          + e.name + 
                                          ".\nError message: " 
                                          + e.message);
            return false;
        }
    },    
    
    
   

             
    //dele
    deleteMessage : function(lID)
    {
        try
        {
            this.m_HotmailLog.Write("nsHotmail.js - deleteMessage - START");  
            
            this.m_CommMethod.deleteMessage(lID);
            
            this.m_HotmailLog.Write("nsHotmail.js - deleteMessage - END");     
            return true;
        }
        catch(e)
        {
            this.m_HotmailLog.DebugDump("nsHotmail.js: deleteMessage : Exception : " 
                                          + e.name + 
                                          ".\nError message: " 
                                          + e.message);
            return false;
        } 
    },

    
       


    //cookies are deleted when the connection ends so i dont need to download pages
    logOut : function()
    {
        try
        {
            this.m_HotmailLog.Write("nsHotmail.js - logOUT - START"); 
            
            this.m_CommMethod.logOut();           
                                           
            this.m_HotmailLog.Write("nsHotmail.js - logOUT - END");  
            return true;
        }
        catch(e)
        {
            this.m_HotmailLog.DebugDump("nsHotmail.js: logOUT : Exception : " 
                                      + e.name 
                                      + ".\nError message: " 
                                      + e.message);
            return false;
        }
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
var nsHotmailFactory = new Object();

nsHotmailFactory.createInstance = function (outer, iid)
{
    if (outer != null) throw Components.results.NS_ERROR_NO_AGGREGATION;
    
    if (!iid.equals(nsHotmailClassID) && !iid.equals(Components.interfaces.nsISupports))
        throw Components.results.NS_ERROR_INVALID_ARG;
    
    return new nsHotmail();
}


/******************************************************************************/
/* MODULE */
var nsHotmailModule = new Object();

nsHotmailModule.registerSelf = function(compMgr, fileSpec, location, type)
{
    compMgr = compMgr.QueryInterface(Components.interfaces.nsIComponentRegistrar);
    compMgr.registerFactoryLocation(nsHotmailClassID,
                                    "HotmailComponent",
                                    nsHotmailContactID, 
                                    fileSpec,
                                    location, 
                                    type);
}


nsHotmailModule.unregisterSelf = function(aCompMgr, aFileSpec, aLocation)
{
    aCompMgr = aCompMgr.QueryInterface(Components.interfaces.nsIComponentRegistrar);
    aCompMgr.unregisterFactoryLocation(nsHotmailClassID, aFileSpec);
}

 
nsHotmailModule.getClassObject = function(compMgr, cid, iid)
{
    if (!cid.equals(nsHotmailClassID))
        throw Components.results.NS_ERROR_NO_INTERFACE;

    if (!iid.equals(Components.interfaces.nsIFactory))
        throw Components.results.NS_ERROR_NOT_IMPLEMENTED;

    return nsHotmailFactory;
}


nsHotmailModule.canUnload = function(compMgr)
{
    return true;
}
/******************************************************************************/


function NSGetModule(compMgr, fileSpec)
{
    return nsHotmailModule; 
}
