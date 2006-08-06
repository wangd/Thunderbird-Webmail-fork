/*****************************  Globals component ******************************/                 
const nsHotmailClassID = Components.ID("{3f3822e0-6374-11d9-9669-0800200c9a66}"); 
const nsHotmailContactID = "@mozilla.org/HotmailPOP;1";
const ExtHotmailGuid = "{3c8e8390-2cf6-11d9-9669-0800200c9a66}";

/************************Screen Rippper constants******************************/
const patternHotmailPOPSRuri =/[^\.\/]+\.[^\.\/]+$/;
const patternHotmailPOPForm = /<form.*?>[\S\s]*?<\/form>/;
const patternHotmailPOPAction = /<form.*?action="(.*?)".*?>/;
const patternHotmailPOPInput = /<input.*?>/igm;
const patternHotmailPOPType = /type="(.*?)"/i;
const patternHotmailPOPName = /name="(.*?)"/i;
const patternHotmailPOPValue = /value="(.*?)"/i;
const patternHotmailPOPJavaRefresh = /location\.replace\("(.*?)"\)/i;
const patternHotmailPOPRefresh =/<META.*?HTTP-EQUIV="REFRESH".*?URL=(.*?)".*?>/i;
const patternHotmailPOPLogout = /<td><a.*?href="(.*?\/cgi-bin\/logout\?curmbox=.*?").*?>/m;
const patternHotmailPOPMailbox = /<a href="(\/cgi-bin\/HoTMaiL.*?)".*?tabindex=121.*?class="E">/;
const PatternHotmailPOPFolderBase = /document.location = "(.*?)"\+f/; 
const PatternHotmailPOPFolderList =/href="javascript:G\('\/cgi-bin\/folders\?'\)"(.*?)<a href="javascript:G\('\/cgi-bin\/folders\?'\)"/;
const PatternHotmailPOPFolderLinks =/<a.*?>/g;
const PatternHotmailPOPTabindex =/tabindex="(.*?)"/i;
const PatternHotmailPOPTabTitle =/title="(.*?)"/i;
const PatternHotmailPOPHMFO =/HMFO\('(.*?)'\)/;
const patternHotmailPOPMsgTable = /MsgTable.*?>(.*?)<\/table>/m;
const patternHotmailPOPMultPageNum = /<select name="MultPageNum" onChange="window\.location\.href='(.*?)'\+_UM\+'(.*?)'.*?>(.*?)<\/select>/;
const patternHotmailPOPPages = /<option value="(.*?)".*?>/g;
const patternHotmailPOPEmailURL = /<a.*?href="javascript:G\('(.*?)'\)">/; 
const patternHotmailPOPEmailLength = /len=(.*?)&/;
const patternHotmailPOPEmailID = /msg=(.*?)&/;
const patternHotmailPOPUM = /_UM="(.*?)"/;
const patterHotmailPOPFolderID = /curmbox=(.*?)&/;
const patternHotmailPOPSRRead = /msgread=1/gi;
const patternHotmailPOPSRFrom =/<tr[\S\s]*name="(.*?)"><td>/i;
const patternHotmailPOPQS = /g_QS="(.*?)"/i;

/*********BETA*****************/
const patternHotmailPOPJSRefresh = /<html><head><script.*?>.*?\.location\.replace.*?\("(.*?)"\).*?<\/script>.*?<\/html>/i;
const patternHotmailPOPFrame = /<frame.*?name="main".*?src="(.*?)".*?>/i;
const patternHotmailPOPLogOut = /<.*?"(.*?logout.aspx.*?)".*?>/gi;
const patternHotmailPOPInbox = /<a href="(.*?mail.aspx\?Control=Inbox)".*?>/i;
const patternHotmailPOPJunkFolderID = /<a href="(.*?mail.aspx\?Control=Inbox&FolderID.*?5)">/i;
const patternHotmailPOPNextPage = /<div class="dItemListHeaderNav">[\s\S]*?<a href="(.*?InboxPage=next&Page=[\d]*?)">/i;
const patternHotmailPOPMailBoxTable = /<table.*?ContentTable".*?>[\s\S]*?<\/table>/ig;
const patternHotmailPOPMailBoxTableRow = /<tr>[\s\S]*?<\/tr>/ig;
const patternHotmailPOPEMailURL = /<td.*?dInboxContentTableTitleCol.*>.*?<a href="(.*?)".*?>/i;
const patternHotmailPOPEmailRead = /<td.*?class="dInboxContentTableFromCol"><strong>.*?<\/strong><\/td>/gi;
const patternHotmailPOPEmailSender = /<td.*?dInboxContentTableFromCol.*?>(.*?)<\/td>/i; 
const patternHotmailPOPEmailSubject = /<td.*?dInboxContentTableTitleCol.*?>.*?<a href=.*?>(.*?)<\/a>.*?<\/td>/i; 
const patternHotmailPOPEmailDate = /<td.*?dInboxContentTableDateCol.*?>(.*?)<\/td>/i;
const patternHotmailPOPEMailID =/ReadMessageID=(.*?)&/i;
const patternHotmailPOPViewState = /<input.*?id="__VIEWSTATE".*?value="(.*?)".*?\/>/i;
const patternHotmailPOPFolderID = /FolderID=(.*?)$/i;
const patternHotmailPOPInboxCotent = /<div id="inbox">/ig
const patternHotmailPOPInboxNoContent =/<div.*?ContentNoMsg.*?>/ig
const patternHotmailPOPFolderList = /select name="InboxMoveMessage"[\s\S]*?option value.*?>.*?<\/option>[\s\S]*?<\/select>/img;
const patternHotmailPOPFolderOption = /<option value=.*?>.*?<\/option>/ig;
const patternHotmailPOPFolderHref = /<option value="(.*?)">.*?<\/option>/i;
const patternHotmailPOPTitle = /<option value=.*?>(.*?)<\/option>/i;
const kDisplayName = /<D:displayname>(.*?)<\/D:displayname>/;
const kSpecial = /<hm:special>(.*?)<\/hm:special>/;
/*******************************************************************************/


/************************Webdav constants *************************************/
const patternHotmailPOPWDuri = /.*?\.(.*?)$/;
const HotmailPOPSchema = "<?xml version=\"1.0\"?>\r\n<D:propfind xmlns:D=\"DAV:\" xmlns:h=\"http://schemas.microsoft.com/hotmail/\" xmlns:hm=\"urn:schemas:httpmail:\">\r\n<D:prop>\r\n<h:adbar/>\r\n<hm:contacts/>\r\n<hm:inbox/>\r\n<hm:outbox/>\r\n<hm:sendmsg/>\r\n<hm:sentitems/>\r\n<hm:deleteditems/>\r\n<hm:drafts/>\r\n<hm:msgfolderroot/>\r\n<h:maxpoll/>\r\n<h:sig/>\r\n</D:prop>\r\n</D:propfind>";
const HotmailPOPFolderSchema = "<?xml version=\"1.0\"?>\r\n<D:propfind xmlns:D=\"DAV:\" xmlns:hm=\"urn:schemas:httpmail:\">\r\n<D:prop>\r\n<D:isfolder/>\r\n<D:displayname/>\r\n<hm:special/>\r\n<D:hassubs/>\r\n<D:nosubs/>\r\n<hm:unreadcount/>\r\n<D:visiblecount/>\r\n<hm:special/>\r\n</D:prop>\r\n</D:propfind>";
const HotmailPOPMailSchema = "<?xml version=\"1.0\"?>\r\n<D:propfind xmlns:D=\"DAV:\" xmlns:hm=\"urn:schemas:httpmail:\" xmlns:m=\"urn:schemas:mailheader:\">\r\n<D:prop>\r\n<D:isfolder/>\r\n<hm:read/>\r\n<m:hasattachment/>\r\n<m:to/>\r\n<m:from/>\r\n<m:subject/>\r\n<m:date/>\r\n<D:getcontentlength/>\r\n</D:prop>\r\n</D:propfind>";
const HotmailPOPReadSchema = "<?xml version=\"1.0\"?>\r\n<D:propertyupdate xmlns:D=\"DAV:\" xmlns:hm=\"urn:schemas:httpmail:\">\r\n<D:set>\r\n<D:prop>\r\n<hm:read>1</hm:read>\r\n</D:prop>\r\n</D:set>\r\n</D:propertyupdate>";
const patternHotmailPOPFolder = /<hm:msgfolderroot>(.*?)<\/hm:msgfolderroot>/;
const patternHotmailPOPTrash = /<hm:deleteditems>(.*?)<\/hm:deleteditems>/;
const patternHotmailPOPMSGID = /[^\/]+$/;
const patternHotmailPOPResponse = /<D:response>[\S\s]*?<\/D:response>/gm;
const patternHotmailPOPID = /<D:id>(.*?)<\/D:id>/;
const patternHotmailPOPHref = /<D:href>(.*?)<\/D:href>/;
const patternHotmailPOPHrefList = /<D:href>.*?<\/D:href>/igm;
const patternHotmailPOPFolderName = /folders\/(.*?)\//i;
const patternHotmailPOPSize = /<D:getcontentlength>(.*?)<\/D:getcontentlength>/;
const patternHotmailPOPRead = /<hm:read>(.*?)<\/hm:read>/i;
const patternHotmailPOPTo = /<m:to>(.*?)<\/m:to>/i;
const patternHotmailPOPFrom = /<m:from>(.*?)<\/m:from>/i;
const patternHotmailPOPSubject = /<m:subject>(.*?)<\/m:subject>/i;
const patternHotmailPOPDate = /<m:date>(.*?)T(.*?)<\/m:date>/i;
/*******************************************************************************/

const UserAgent = "1.1 on Mac OS X — Mozilla/5.0 (Macintosh; U; Intel Mac OS X; en-us) Gecko/20060516 SeaMonkey/1.1.0";

/************************************  Hotmail ********************************/

function nsHotmail()
{
    try
    {       
        var scriptLoader =  Components.classes["@mozilla.org/moz/jssubscript-loader;1"];
        scriptLoader= scriptLoader.getService(Components.interfaces.mozIJSSubScriptLoader);
        scriptLoader.loadSubScript("chrome://web-mail/content/common/DebugLog.js");
        scriptLoader.loadSubScript("chrome://hotmail/content/Hotmail-WebDav-POP.js");
        scriptLoader.loadSubScript("chrome://hotmail/content/Hotmail-ScreenRipper-POP.js");
        scriptLoader.loadSubScript("chrome://hotmail/content/Hotmail-ScreenRipper-POP-BETA.js");
        scriptLoader.loadSubScript("chrome://web-mail/content/common/CommonPrefs.js");
        scriptLoader.loadSubScript("chrome://hotmail/content/Hotmail-Prefs-Data.js");
        
        var date = new Date();
        
        var  szLogFileName = "Hotmail Log - " + date.getHours()+ "-" 
                                              + date.getMinutes() + "-"
                                              + date.getUTCMilliseconds() +" -";
        this.m_HotmailLog = new DebugLog("webmail.logging.comms", ExtHotmailGuid, szLogFileName); 
        
        this.m_HotmailLog.Write("nsHotmail.js - Constructor - START");   
       
        this.m_szUserName = null;   
        this.m_szPassWord = null; 
        this.m_oResponseStream = null;       
        this.m_bAuthorised = false;
        this.m_CommMethod = null;
                      
        this.m_HotmailLog.Write("nsHotmail.js - Constructor - END");  
    }
    catch(e)
    {
        DebugDump("nsHotmail.js: Constructor : Exception : " 
                                      + e.name 
                                      + ".\nError message: " 
                                      + e.message+ "\n"
                                      + e.lineNumber);
    }
}



nsHotmail.prototype =
{
    get userName() {return this.m_szUserName;},
    set userName(userName) {return this.m_szUserName = userName;},

    get passWord() {return this.m_szPassWord;},
    set passWord(passWord) {return this.m_szPassWord = passWord;},
    
    get bAuthorised() 
    {
        return (this.m_CommMethod)? this.m_CommMethod.m_bAuthorised: false;
    },
  
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
            var PrefData = this.getPrefs();
            
            if (PrefData.iMode==1) ///webdav
                this.m_CommMethod = new HotmailWebDav(this.m_oResponseStream, this.m_HotmailLog, PrefData);    
            else if (PrefData.iMode==2) //beta
                this.m_CommMethod = new HotmailScreenRipperBETA(this.m_oResponseStream, this.m_HotmailLog, PrefData);    
        
            if (!this.m_CommMethod) //default screen ripper
                this.m_CommMethod = new HotmailScreenRipper(this.m_oResponseStream, this.m_HotmailLog, PrefData);
            
            var bResult = this.m_CommMethod.logIn(this.m_szUserName, this.m_szPassWord);
                       
            this.m_HotmailLog.Write("nsHotmail.js - logIN - "+ bResult +"- END");    
            return bResult;
        }
        catch(e)
        {
            this.m_HotmailLog.DebugDump("nsHotmail.js: logIN : Exception : " 
                                              + e.name + 
                                              ".\nError message: " 
                                              + e.message+ "\n"
                                              + e.lineNumber);
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
                                          + e.message+ "\n"
                                          + e.lineNumber);
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
            this.m_HotmailLog.Write("nsHotmail.js - getHeaders - START");  
            this.m_HotmailLog.Write("nsHotmail.js - getHeaders - id " + lID ); 
            
            this.m_CommMethod.getMessageHeaders(lID);
            
            this.m_HotmailLog.Write("nsHotmail.js - getHeaders - END");
            return true; 
        }
        catch(err)
        {
            this.m_HotmailLog.DebugDump("nsHotmail.js: getHeaders : Exception : " 
                                          + e.name + 
                                          ".\nError message: " 
                                          + e.message+ "\n"
                                          + e.lineNumber);
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
                                          + e.message+ "\n"
                                          + e.lineNumber);
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
                                          + e.message+ "\n"
                                          + e.lineNumber);
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
                                      + e.message+ "\n"
                                      + e.lineNumber);
            return false;
        }
    },  
    
  
  
    getPrefs : function ()
    {
        try
        {
            this.m_HotmailLog.Write("nsHotmail.js - getPrefs - START"); 
            
            var WebMailPrefAccess = new WebMailCommonPrefAccess();
            var oPref = {Value : null};
            var oData = new PrefData();
             
            ////////
            //load defaults
            ////////
            
            //delay processing time delay
            if (WebMailPrefAccess.Get("int","hotmail.iProcessDelay",oPref))
                oData.iProcessDelay = oPref.Value;
            else
                oData.iProcessDelay = 10; 
            
            //delay process trigger
            oPref.Value = null;
            if (WebMailPrefAccess.Get("bool","hotmail.iProcessTrigger",oPref))
                oData.iProcessTrigger = oPref.Value;
            else
                oData.iProcessTrigger = 50; 
        
            //delay proccess amount
            oPref.Value = null;
            if (WebMailPrefAccess.Get("bool","hotmail.iProcessAmount",oPref))
                oData.iProcessAmount = oPref.Value;
            else
                oData.iProcessAmount = 25;    
                                     
            //do i reuse the session
            oPref.Value = null;
            if (WebMailPrefAccess.Get("bool","hotmail.bReUseSession",oPref))
                oData.bReUseSession = oPref.Value;
            else
                oData.bReUseSession = true; 
        
            //do i download junkmail
            oPref.Value = null;
            if (WebMailPrefAccess.Get("bool","hotmail.bUseJunkMail",oPref))
                oData.bUseJunkMail=oPref.Value;
            else
                oData.bUseJunkMail=false;
                                          
            //do i download unread only
            oPref.Value = null;
            if (WebMailPrefAccess.Get("bool","hotmail.bDownloadUnread",oPref))
                oData.bDownloadUnread = oPref.Value;
            else
                oData.bDownloadUnread = false; 

            //////
            //load User prefs
            //////
            var iCount = 0;
            oPref.Value = null;
            WebMailPrefAccess.Get("int","hotmail.Account.Num",oPref);
            this.m_HotmailLog.Write("nsHotmail.js - getPrefs - Users Num " + oPref.Value);
            if (oPref.Value) iCount = oPref.Value;
            
            var regExp = new RegExp(this.m_szUserName,"i");
            
            for(var i=0; i<iCount; i++)    
            {  
                oPref.Value = null;
                WebMailPrefAccess.Get("char","hotmail.Account."+i+".user",oPref);
                this.m_HotmailLog.Write("nsHotmail.js - getPrefs - szUserName " + oPref.Value);
                if (oPref.Value)
                {
                    if (oPref.Value.search(regExp)!=-1)
                    {
                        this.m_HotmailLog.Write("nsHotmail.js - getPrefs - user found "+ i);
                        
                        //get Mode 
                        oPref.Value = null;
                        WebMailPrefAccess.Get("int","hotmail.Account."+i+".iMode",oPref);
                        this.m_HotmailLog.Write("nsHotmail.js - getPrefs - iMode " + oPref.Value);
                        if (oPref.Value) oData.iMode = oPref.Value;   
                                                                                 
                        //get spam
                        oPref.Value = null;
                        WebMailPrefAccess.Get("bool","hotmail.Account."+i+".bUseJunkMail",oPref);
                        this.m_HotmailLog.Write("nsHotmail.js - getPrefs - bUseJunkMail " + oPref.Value);
                        if (oPref.Value) oData.bUseJunkMail = oPref.Value;         
                                              
                        //get unread
                        oPref.Value = null;
                        WebMailPrefAccess.Get("bool","hotmail.Account."+i+".bDownloadUnread",oPref);
                        this.m_HotmailLog.Write("nsHotmail.js - getPrefs - bDownloadUnread " + oPref.Value);
                        if (oPref.Value) oData.bDownloadUnread = oPref.Value;
                        
                         //get folders
                        oPref.Value = null;
                        WebMailPrefAccess.Get("char","hotmail.Account."+i+".szFolders",oPref);
                        this.m_HotmailLog.Write("nsHotmail.js - getPrefs - szFolders " + oPref.Value);
                        if (oPref.Value)
                        {
                            var aszFolders = oPref.Value.split("\r");
                            for (j=0; j<aszFolders.length; j++)
                            {
                                this.m_HotmailLog.Write("nsHotmail.js - getPrefs - aszFolders " + aszFolders[j]);
                                oData.aszFolder.push(aszFolders[j]);
                            }
                        }
                    }
                }
            }          
                                           
            this.m_HotmailLog.Write("nsHotmail.js - getPrefs - END");  
            return oData;
        }
        catch(e)
        {
            this.m_HotmailLog.DebugDump("nsHotmail.js: getPrefs : Exception : " 
                                      + e.name 
                                      + ".\nError message: " 
                                      + e.message+ "\n"
                                      + e.lineNumber);
            return null;
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
