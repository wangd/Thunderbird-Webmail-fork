/*****************************  Globals   *************************************/                 
const nsYahooClassID = Components.ID("{bfacf8a0-6447-11d9-9669-0800200c9a66}");
const nsYahooContactID = "@mozilla.org/YahooPOP;1";
const ExtYahooGuid = "{d7103710-6112-11d9-9669-0800200c9a66}";

const patternYahooSecure = /<a href="(.*?https.*?login.*?)".*?>/;
const patternYahooForm = /<form.*?name="login_form".*?>[\S\s]*?<\/form>/gm;
const patternYahooAction = /<form.*?action="(.*?)".*?>/;
const patternYahooLogIn = /<input.*?type=['|"]*hidden['|"]*.*?name=.*?value=.*?>/igm;
const patternYahooLogInSpam = /<input type="hidden" name=".secdata" value=".*?">/igm;
const patternYahooSpanURI =/<td colspan="2">[\s\S]*?<img src="(https.*?)".*?>[\s\S]*?<img src=".*?error.gif.*?".*?>[\s\S]*?<\/td>/im;
const patternYahooNameAlt = /name=['|"]*([\S]*)['|"]*/;
const patternYahooAltValue = /value=['|"]*([\S\s]*)['|"]*[\s]*>/;
const patternYahooRedirect = /<a href=['|"]*(.*?)['|"]*>/; 
const patternYahooMSGIdTable = /<table id="datatable".*?>[\S\s]*?<\/table>/m;
const patternYahooMsgRow = /<tr.*?>[\S\s]*?<\/tr>/gm;
const patternYahooMsgID = /href="(.*?MsgId.*?)"/;
const patternYahooMsgSize = /<td.*?>.*?<\/td>/gm;
const patternYahooNextPage = /<a href=".*?next=1.*?">/m;
const patternYahooNextURI = /<a href=["|']*(.*?)["|']*>/
const PatternYahooID =/MsgId=(.*?)&/;
const PatternYahooDeleteForm = /<form name=messageList.*?>[\S\s]*?<\/form>/;
const PatternYahooDeleteURL = /action="(.*?)"/;
const PatternYahooDeleteInput = /<input.*?hidden.*?>/gm;
const PatternYahooBox =/(box=.*?)#/;
const PatternYahooBoxAlt =/(box=.*?)$/;
const PatternYahooUnRead = /msgnew/;
const PatternYahooFolders = /".*?ShowFolder\?box=.*?"/gim;
const PatternYahooFoldersPart = /"(.*?ShowFolder\?box=.*?)"/gim;
const PatternYahooFolderURL =/'(.*?Folders\?YY.*?)'"/i;
const PatternYahooFolderBox = /box=(.*?)&/i;
const PatternYahooFolderBoxAlt = /box=(.*?)$/i;
const PatternYahooLogout = /Logout/im;


//***************** BETA  **********************************//
const kLstMsgs = "<SOAP-ENV:Envelope xmlns:SOAP-ENV=\"http://schemas.xmlsoap.org/soap/envelope/\" xmlns:xsi=\"http://www.w3.org/1999/XMLSchema-instance\" xmlns:xsd=\"http://www.w3.org/1999/XMLSchema\" SOAP-ENV:encodingStyle=\"http://schemas.xmlsoap.org/soap/encoding/\"><SOAP-ENV:Body><m:LstMsgs xmlns:m=\"urn:yahoo:ymws\"><param1 startMid=\"0\" numMid=\"300\" startInfo=\"0\" numInfo=\"65\" startBody=\"0\" numBody=\"0\"><greq gve=\"8\" getUserData=\"true\" getMetaData=\"true\"><gid>cg</gid></greq><sortKey>date</sortKey><sortOrder>down</sortOrder><fi fname=\"folderName\"/></param1></m:LstMsgs></SOAP-ENV:Body></SOAP-ENV:Envelope>";
const kListFolders = "<SOAP-ENV:Envelope xmlns:SOAP-ENV=\"http://schemas.xmlsoap.org/soap/envelope/\" xmlns:xsi=\"http://www.w3.org/1999/XMLSchema-instance\" xmlns:xsd=\"http://www.w3.org/1999/XMLSchema\" SOAP-ENV:encodingStyle=\"http://schemas.xmlsoap.org/soap/encoding/\"><SOAP-ENV:Body><m:ListFolders xmlns:m=\"urn:yahoo:ymws\"><param1><greq gve=\"8\" ListFolders=\"true\" resetUnseen=\"true\"><gid>cg</gid></greq></param1></m:ListFolders></SOAP-ENV:Body></SOAP-ENV:Envelope>";
const kMSG = "<SOAP-ENV:Envelope xmlns:SOAP-ENV=\"http://schemas.xmlsoap.org/soap/envelope/\" xmlns:xsi=\"http://www.w3.org/1999/XMLSchema-instance\" xmlns:xsd=\"http://www.w3.org/1999/XMLSchema\" SOAP-ENV:encodingStyle=\"http://schemas.xmlsoap.org/soap/encoding/\"><SOAP-ENV:Body><m:GetMessageBodyPart xmlns:m=\"urn:yahoo:ymws\"><param1><greq gve=\"8\" gdk=\"1\"><gid>cg</gid></greq><fi fname=\"FOLDERNAME\"/><mid>MSGID</mid><truncateAt>102400000</truncateAt></param1></m:GetMessageBodyPart></SOAP-ENV:Body></SOAP-ENV:Envelope>";
const kMSGHeaders ="<SOAP-ENV:Envelope xmlns:SOAP-ENV=\"http://schemas.xmlsoap.org/soap/envelope/\" xmlns:xsi=\"http://www.w3.org/1999/XMLSchema-instance\" xmlns:xsd=\"http://www.w3.org/1999/XMLSchema\" SOAP-ENV:encodingStyle=\"http://schemas.xmlsoap.org/soap/encoding/\"><SOAP-ENV:Body><m:GetMessageRawHeader xmlns:m=\"urn:yahoo:ymws\"><param1><greq gve=\"8\"><gid>cg</gid></greq><fi fname=\"FOLDERNAME\"/><mid>MSGID</mid></param1></m:GetMessageRawHeader></SOAP-ENV:Body></SOAP-ENV:Envelope>";
const kDelete = "<SOAP-ENV:Envelope xmlns:SOAP-ENV=\"http://schemas.xmlsoap.org/soap/envelope/\" xmlns:xsi=\"http://www.w3.org/1999/XMLSchema-instance\" xmlns:xsd=\"http://www.w3.org/1999/XMLSchema\" SOAP-ENV:encodingStyle=\"http://schemas.xmlsoap.org/soap/encoding/\"><SOAP-ENV:Body><m:MoveMsgs xmlns:m=\"urn:yahoo:ymws\"><param1><greq gve=\"8\"><gid>cg</gid></greq><fi fname=\"FOLDERNAME\"/><tofi fname=\"Trash\"/><mid>MSGID</mid></param1></m:MoveMsgs></SOAP-ENV:Body></SOAP-ENV:Envelope>";
const kSeen = "<SOAP-ENV:Envelope xmlns:SOAP-ENV=\"http://schemas.xmlsoap.org/soap/envelope/\" xmlns:xsi=\"http://www.w3.org/1999/XMLSchema-instance\" xmlns:xsd=\"http://www.w3.org/1999/XMLSchema\" SOAP-ENV:encodingStyle=\"http://schemas.xmlsoap.org/soap/encoding/\"><SOAP-ENV:Body><m:SetMessageFlag xmlns:m=\"urn:yahoo:ymws\"><param1><greq gve=\"8\"><gid>cg</gid></greq><fi fname=\"FOLDERNAME\"/><mid>MSGID</mid><flag seen=\"1\"></flag></param1></m:SetMessageFlag></SOAP-ENV:Body></SOAP-ENV:Envelope>";
const kPatternFolderResponse = /<ymws:ListFoldersResponse.*?>([\s\S]*?)<\/ymws:ListFoldersResponse>/i;
const kPatternLstMsgsResponse = /<ymws:LstMsgsResponse.*?>([\s\S]*?)<\/ymws:LstMsgsResponse>/i;
const kPatternLstHeadersResponse = /<ymws:GetMessageRawHeaderResponse.*?>([\s\S]*?)<\/ymws:GetMessageRawHeaderResponse>/i;
const kPatternLstBodyPartResponse = /<ymws:GetMessageBodyPartResponse.*?>([\s\S]*?)<\/ymws:GetMessageBodyPartResponse>/i;
const kPatternDeleteMSGResponse = /<ymws:MoveMsgsResponse.*?>([\s\S]*?)<\/ymws:MoveMsgsResponse.*?>/i;
const kPatternSeenMSGResponse = /<ymws:SetMessageFlagResponse.*?>([\s\S]*?)<\/ymws:SetMessageFlagResponse.*?>/i;
const kPatternWssid = /wssid.*?'(.*?)',/i;
const kPatternWebserviceUrl = /webserviceUrl.*?'(.*?)',/i;
const kPatternLogOut = /exit/ig;
const kPatternInfo = /<minfo.*?>[\s\S]*?<\/minfo>/ig;
const kPatternData =/<fdata.*?>/igm;
const kPatternFolderName =/\sfname="(.*?)"/i;
const kPatternSeen = /seen="(.*?)"/i;
const kPatternID = /<mid>(.*?)<\/mid>/i;
const kPatternSize = /msize="(.*?)"/i;
const kPatternFolder = /mfolder="(.*?)"/i;
const kPatternHeader = /<mhd>(.*?)<\/mhd>/i;
const kPatternPart = /<part.*?>[\s\S]*?<\/part>/img;
const kPatternPartID = /partId="(.*?)"/i;
const kPatternPartText = /<text>(.*?)<\/text>/i;
const kPatternPartType =/ type="(.*?)"/i;
const kPatternPartTypeParams =/typeParams="(.*?)"/i;
const kPatternPartSubType =/subType="(.*?)"/i;
const kPatternPartDispParam =/dispParams="(.*?)"/i;
const kPatternPartId = /partId="(.*?)"/i;
const kPatternFileName = /filename=(.*?)$/i

/******************************  Yahoo ***************************************/

function nsYahoo()
{
    try
    {       
        var scriptLoader = Components.classes["@mozilla.org/moz/jssubscript-loader;1"];
        scriptLoader = scriptLoader.getService(Components.interfaces.mozIJSSubScriptLoader);
        scriptLoader.loadSubScript("chrome://web-mail/content/common/DebugLog.js");
        scriptLoader.loadSubScript("chrome://web-mail/content/common/CommonPrefs.js");
        scriptLoader.loadSubScript("chrome://yahoo/content/Yahoo-POP.js"); 
        scriptLoader.loadSubScript("chrome://yahoo/content/Yahoo-POP-Beta.js");  
        scriptLoader.loadSubScript("chrome://yahoo/content/Yahoo-Prefs-Accounts-Data.js");
            
        var date = new Date();
        var  szLogFileName = "Yahoo Log - " + date.getHours()+ "-" + date.getMinutes() + "-"+ date.getUTCMilliseconds() +" -";
        this.m_Log = new DebugLog("webmail.logging.comms", ExtYahooGuid, szLogFileName); 
        
        this.m_Log.Write("nsYahoo.js - Constructor - START");   
       
        this.m_bAuthorised = false;
        this.m_szUserName = null;   
        this.m_szPassWord = null; 
        this.m_oResponseStream = null;  
        this.m_CommMethod = null;
               
        this.m_Log.Write("nsYahoo.js - Constructor - END");  
    }
    catch(e)
    {
        DebugDump("nsYahoo.js: Constructor : Exception : " 
                                      + e.name 
                                      + ".\nError message: " 
                                      + e.message+ "\n"
                                      + e.lineNumber);
    }
}



nsYahoo.prototype =
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
            this.m_Log.Write("nsYahoo.js - logIN - START");   
            this.m_Log.Write("nsYahoo.js - logIN - Username: " + this.m_szUserName 
                                               + " Password: " + this.m_szPassWord 
                                               + " stream: "   + this.m_oResponseStream);
            
            if (!this.m_szUserName || !this.m_oResponseStream  || !this.m_szPassWord) return false;        
                       
            //get prefs
            var oData = this.loadPrefs();
             
            if (oData.bBeta) //use beta site
                this.m_CommMethod = new YahooPOPBETA(this.m_oResponseStream, this.m_Log, oData);
        
            if (!this.m_CommMethod) //use standard site
                this.m_CommMethod = new YahooPOP(this.m_oResponseStream, this.m_Log, oData);

            var bResult = this.m_CommMethod.logIn(this.m_szUserName, this.m_szPassWord); 

            this.m_Log.Write("nsYahoo.js - logIN - END");    
            return true;
        }
        catch(e)
        {
            this.m_Log.DebugDump("nsYahoo.js: logIN : Exception : " 
                                              + e.name + 
                                              ".\nError message: " 
                                              + e.message+ "\n"
                                              + e.lineNumber);
            return false;
        }
    },


    
    //stat
    getNumMessages : function()
    {
        try
        {
            this.m_Log.Write("nsYahoo.js - getNumMessages - START"); 
           
            this.m_CommMethod.getNumMessages();
            
            this.m_Log.Write("nsYAhoo.js - getNumMessages - END"); 
            return true;
        }
        catch(e)
        {
            this.m_Log.DebugDump("nsYahoo.js: getNumMessages : Exception : " 
                                          + e.name 
                                          + ".\nError message: " 
                                          + e.message+ "\n"
                                          + e.lineNumber);
            return false;
        }
    },
    
    
                     
    //list 
    getMessageSizes : function() 
    {
        try
        {
            this.m_Log.Write("nsYahoo.js - getMessageSizes - START"); 
            
            this.m_CommMethod.getMessageSizes();

            this.m_Log.Write("nsYahoo.js - getMessageSizes - END"); 
            return true;
        }
        catch(e)
        {
            this.m_Log.DebugDump("nsYahoo.js: getMessageSizes : Exception : " 
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
            this.m_Log.Write("nsYahoo.js - getMessageIDs - START"); 
            
            this.m_CommMethod.getMessageIDs(); 
          
            this.m_Log.Write("nsYahoo.js - getMessageIDs - END"); 
            return true;
        }
        catch(e)
        {
            this.m_Log.DebugDump("nsYahoo.js: getMessageIDs : Exception : " 
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
            this.m_Log.Write("nsYahoo.js - getHeaders - START");  
            this.m_Log.Write("nsYahoo.js - getHeaders - id " + lID ); 
           
            this.m_CommMethod.getMessageHeaders(lID);
            
            this.m_Log.Write("nsYahoo.js - getHeaders - END");
            return true; 
        }
        catch(e)
        {
            
            this.m_Log.DebugDump("nsYahoo.js: getHeaders : Exception : " 
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
            this.m_Log.Write("nsYahoo.js - getMessage - START"); 
            this.m_Log.Write("nsYahoo.js - getMessage - msg num" + lID); 
                     
            this.m_CommMethod.getMessage(lID);
            
            this.m_Log.Write("m_YahooLog.js - getMessage - END"); 
            return true;
        }
        catch(e)
        {
             this.m_Log.DebugDump("m_YahooLog.js: getMessage : Exception : " 
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
            this.m_Log.Write("nsYahoo.js - deleteMessage - START");  
            this.m_Log.Write("nsYahoo.js - deleteMessage - id " + lID ); 
                  
            this.m_CommMethod.deleteMessage(lID);
            
            this.m_Log.Write("nsYahoo.js - deleteMessage - END");     
            return true;
        }
        catch(e)
        {
            this.m_Log.DebugDump("nsYahoo.js: deleteMessage : Exception : " 
                                          + e.name + 
                                          ".\nError message: " 
                                          + e.message+ "\n"
                                          + e.lineNumber);
            return false;
        } 
    },

    
    
    logOut : function()
    {
        try
        {
            this.m_Log.Write("nsYahoo.js - logOUT - START"); 
            
            this.m_CommMethod.logOut();
            
            this.m_Log.Write("nsYahoo.js - logOUT - END");  
            return true;
        }
        catch(e)
        {
            this.m_Log.DebugDump("nsYahoo.js: logOUT : Exception : " 
                                      + e.name 
                                      + ".\nError message: " 
                                      + e.message+ "\n"
                                      + e.lineNumber);
            return false;
        }
    },  
    

       
    
    loadPrefs : function()
    {
        try
        {
            this.m_Log.Write("nsYahoo.js - loadPrefs - START"); 
           
            //get user prefs
            var oData = new PrefData();
            var oPref = {Value:null};
            //do i reuse the session
            var  WebMailPrefAccess = new WebMailCommonPrefAccess();
            WebMailPrefAccess.Get("bool","yahoo.bReUseSession",oPref);
            this.m_Log.Write("nsYahoo.js - loadPrefs - bReUseSession " + oPref.Value);
            if (oPref.Value) oData.bReUseSession = oPref.Value;
            
            //delay processing time delay
            oPref.Value = null;
            WebMailPrefAccess.Get("int","yahoo.iProcessDelay",oPref);
            if (oPref.Value) oData.iProcessDelay = oPref.Value;
            
            //delay process trigger
            oPref.Value = null;
            WebMailPrefAccess.Get("bool","yahoo.iProcessTrigger",oPref);
            if (oPref.Value) oData.iProcessTrigger = oPref.Value;
          
            //delay proccess amount
            oPref.Value = null;
            WebMailPrefAccess.Get("bool","yahoo.iProcessAmount",oPref);
            if (oPref.Value) oData.iProcessAmount = oPref.Value;
          
            
            var iCount = 0;
            oPref.Value = null;
            WebMailPrefAccess.Get("int","yahoo.Account.Num",oPref);
            this.m_Log.Write("nsYahoo.js - loadPrefs - num " + oPref.Value);
            if (oPref.Value) iCount = oPref.Value;
            
            
            var bFound = false;
            var regExp = new RegExp(this.m_szUserName,"i");
            for (i=0; i<iCount; i++)
            {
                //get user name
                oPref.Value = null;
                WebMailPrefAccess.Get("char","yahoo.Account."+i+".user",oPref);
                this.m_Log.Write("nsYahoo.js - loadPrefs - user " + oPref.Value);
                if (oPref.Value)
                {
                    if (oPref.Value.search(regExp)!=-1)
                    {
                        this.m_Log.Write("nsYahoo.js - loadPrefs - user found "+ i);
                        bFound = true;
                                                                                   
                        //inbox
                        oData.aszFolder.push("inbox"); 
                        
                        //get spam
                        oPref.Value = null;
                        WebMailPrefAccess.Get("bool","yahoo.Account."+i+".bUseJunkMail",oPref);
                        this.m_Log.Write("nsYahoo.js - loadPrefs - bUseJunkMail " + oPref.Value);
                        if (oPref.Value)  oData.aszFolder.push("%40B%40Bulk");
    
                        
                        //get folders
                        WebMailPrefAccess.Get("char","yahoo.Account."+i+".szFolders",oPref);
                        this.m_Log.Write("nsYahoo.js - loadPrefs - szFolders " + oPref.Value);
                        if (oPref.Value)
                        {
                            var aszFolders = oPref.Value.split("\r");
                            for (j=0; j<aszFolders.length; j++)
                            {
                                this.m_Log.Write("nsYahoo - loadPRefs - aszFolders[j] " + aszFolders[j]);
                                oData.aszFolder.push(encodeURIComponent(aszFolders[j]));
                            }
                        }
                        
                        //get unread
                        oPref.Value = null;
                        WebMailPrefAccess.Get("bool","yahoo.Account."+i+".bDownloadUnread",oPref);
                        this.m_Log.Write("nsYahoo.js - loadPrefs - bDownloadUnread " + oPref.Value);
                        if (oPref.Value) oData.bUnread=oPref.Value;
                        
                        //use yahoo beta site
                        oPref.Value = null;
                        WebMailPrefAccess.Get("bool","yahoo.Account."+i+".bBeta",oPref);
                        if (oPref.Value) oData.bBeta=oPref.Value;       
                    }
                }
            }
            
            if (!bFound) //get defaults
            {
                this.m_Log.Write("nsYahoo - loadPrefs - Default Folders");
                
                //unread only
                oPref.Value = null;
                WebMailPrefAccess.Get("bool","yahoo.bDownloadUnread",oPref);
                this.m_Log.Write("nsYahoo.js - loadPrefs - bDownloadUnread " + oPref.Value);
                if (oPref.Value) oData.bUnread=oPref.Value;
               
                //inbox
                this.m_Log.Write("nsYahoo - loadPrefs - Default Folders - inbox");
                oData.aszFolder.push("inbox");
                
                //spam
                oPref.Value = null;
                WebMailPrefAccess.Get("bool","yahoo.bUseJunkMail",oPref);    
                if (oPref.Value)
                {
                    this.m_Log.Write("nsYahoo - loadPrefs - Default Folders - spam");
                    oData.aszFolder.push("%40B%40Bulk");
                }
            }
            this.m_Log.Write("nsYahoo.js - loadPrefs - END");
            return oData;
        }
        catch(e)
        {
             this.m_Log.DebugDump("nsYahoo.js: loadPrefs : Exception : " 
                                              + e.name + 
                                              ".\nError message: " 
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
var nsYahooFactory = new Object();

nsYahooFactory.createInstance = function (outer, iid)
{
    if (outer != null) throw Components.results.NS_ERROR_NO_AGGREGATION;
    
    if (!iid.equals(nsYahooClassID) && !iid.equals(Components.interfaces.nsISupports))
        throw Components.results.NS_ERROR_INVALID_ARG;
    
    return new nsYahoo();
}


/******************************************************************************/
/* MODULE */
var nsYahooModule = new Object();

nsYahooModule.registerSelf = function(compMgr, fileSpec, location, type)
{
    compMgr = compMgr.QueryInterface(Components.interfaces.nsIComponentRegistrar);
    compMgr.registerFactoryLocation(nsYahooClassID,
                                    "YahooComponent",
                                    nsYahooContactID, 
                                    fileSpec,
                                    location, 
                                    type);
}


nsYahooModule.unregisterSelf = function(aCompMgr, aFileSpec, aLocation)
{
    aCompMgr = aCompMgr.QueryInterface(Components.interfaces.nsIComponentRegistrar);
    aCompMgr.unregisterFactoryLocation(nsYahooClassID, aFileSpec);
}

 
nsYahooModule.getClassObject = function(compMgr, cid, iid)
{
    if (!cid.equals(nsYahooClassID))
        throw Components.results.NS_ERROR_NO_INTERFACE;

    if (!iid.equals(Components.interfaces.nsIFactory))
        throw Components.results.NS_ERROR_NOT_IMPLEMENTED;

    return nsYahooFactory;
}


nsYahooModule.canUnload = function(compMgr)
{
    return true;
}
/******************************************************************************/


function NSGetModule(compMgr, fileSpec)
{
    return nsYahooModule; 
}
