/*****************************  Globals   *************************************/                 
const nsAOLClassID = Components.ID("{e977c180-9103-11da-a72b-0800200c9a66}"); 
const nsAOLContactID = "@mozilla.org/AOLPOP;1";

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
const patternAOLSucessPath = /^(.*?\/)suite.aspx$/i;
const patternAOLHostCheck = /gHostCheckPath.*?"(.*?)"/i;
const patternAOLTarget = /gTargetHost.*?"(.*?)"/i;
const patternAOLMSGList = /gMessageButtonVisibility/i;
const patternAOLVersion =/var VERSION="(.*?)"/i;
const patternAOLUserID =/uid:(.*?)&/i;
const patternAOLPageNum = /info.pageCount\s=\s(.*?);/i;
const patternAOLMSGSender = /^fa[\s\S].*$/gmi;
const patternAOLMSGData = /MI\(.*?\);/igm;
const patternAOLMSGDataProcess =/MI\("(.*?)",.*?,"([\s\S]*)",(.*?),(.*?),.*?,.*?,(.*?),.*?\);/i;
const patternAOLURLPageNum = /page=(.*?)&/i;
const patternAOLLogout = /Logout\.aspx/i;
const patternAOLLoginURL = /<div id="sns"><a.*?href="(.*?login.*?)".*?>.*?<\/div>/i;
const patternAOLLogoutURL = /<div id="sns"><a.*?href="(.*?logout.*?)".*?>.*?<\/div>/i;
/***********************  AOL ********************************/


function nsAOL()
{
    try
    {       
        var scriptLoader =  Components.classes["@mozilla.org/moz/jssubscript-loader;1"];
        scriptLoader = scriptLoader.getService(Components.interfaces.mozIJSSubScriptLoader);
        scriptLoader.loadSubScript("chrome://web-mail/content/common/DebugLog.js");
        scriptLoader.loadSubScript("chrome://aol/content/AOL-POP.js");
        scriptLoader.loadSubScript("chrome://aol/content/Netscape-POP.js");
        
        var date = new Date();
        var  szLogFileName = "AOL Log - " + date.getHours()+ "-" + date.getMinutes() + "-"+ date.getUTCMilliseconds() +" -";
        this.m_Log = new DebugLog("webmail.logging.comms", 
                                  "{3c8e8390-2cf6-11d9-9669-0800200c9a66}" ,
                                  szLogFileName); 
        
        this.m_Log.Write("nsAOL.js - Constructor - START");   
       
        this.m_szUserName = null;   
        this.m_szPassWord = null; 
        this.m_oResponseStream = null;   
        this.m_CommMethod = null;
         
        this.m_Log.Write("nsAOL.js - Constructor - END");  
    }
    catch(e)
    {
        DebugDump("nsAOL.js: Constructor : Exception : " 
                                      + e.name 
                                      + ".\nError message: " 
                                      + e.message+ "\n"
                                      + e.lineNumber);
    }
}



nsAOL.prototype =
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
            this.m_Log.Write("nsAOL.js - logIN - START");   
            this.m_Log.Write("nsAOL.js - logIN - Username: " + this.m_szUserName 
                                                   + " Password: "  + this.m_szPassWord 
                                                   + " stream: "    + this.m_oResponseStream);
            
            if (!this.m_szUserName || !this.m_oResponseStream || !this.m_szPassWord) return false;
            
            var szTempUserName = this.m_szUserName.split("@");
            this.m_Log.Write("nsAOL.js - logIN - doamain " + szTempUserName); 
            var szDomain = szTempUserName[1];
            
            if (szDomain.search(/aim/i)!=-1) 
                this.m_CommMethod = new AOLPOP(this.m_oResponseStream, this.m_Log);
            else if (szDomain.search(/netscape/i)!=-1)
                this.m_CommMethod = new NetscapePOP(this.m_oResponseStream, this.m_Log);
            else
                this.m_CommMethod = new AOLPOP(this.m_oResponseStream, this.m_Log);

            var bResult = this.m_CommMethod.logIn(this.m_szUserName, this.m_szPassWord);

            this.m_Log.Write("nsAOL.js - logIN - "+ bResult +"- END");    
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


     
    //stat 
    //total size is in octets
    getNumMessages : function()
    {
        try
        {
            this.m_Log.Write("nsAOL.js - getNumMessages - START"); 
            this.m_CommMethod.getNumMessages();
            this.m_Log.Write("nsAOL.js - getNumMessages - END"); 
            return true;
        }
        catch(e)
        {
            this.m_Log.DebugDump("nsAOL.js: getNumMessages : Exception : " 
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
            this.m_Log.Write("nsAOL.js - getMessageSizes - START");
            this.m_CommMethod.getMessageSizes();
            this.m_Log.Write("nsAOL.js - getMessageSizes - END"); 
            return true;
        }
        catch(e)
        {
            this.m_Log.DebugDump("nsAOL.js: getMessageSizes : Exception : " 
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
            this.m_Log.Write("nsAOL.js - getMessageIDs - START");  
            this.m_CommMethod.getMessageIDs();     
            this.m_Log.Write("nsAOL.js - getMessageIDs - END"); 
            return true;
        }
        catch(e)
        {
            this.m_Log.DebugDump("nsAOL.js: getMessageIDs : Exception : " 
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
            this.m_Log.Write("nsAOL.js - getHeaders - START");  
            this.m_Log.Write("nsAOL.js - getHeaders - id " + lID ); 
            this.m_CommMethod.getMessageHeaders(lID);
            this.m_Log.Write("nsAOL.js - getHeaders - END");
            return true; 
        }
        catch(err)
        {
            this.m_Log.DebugDump("nsAOL.js: getHeaders : Exception : " 
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
            this.m_Log.Write("nsAOL.js - getMessage - START"); 
            this.m_Log.Write("nsAOL.js - getMessage - msg num" + lID);
            this.m_CommMethod.getMessage(lID);
            this.m_Log.Write("nsAOL.js - getMessage - END"); 
            return true;
        }
        catch(e)
        {
             this.m_Log.DebugDump("nsAOL.js: getMessage : Exception : " 
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
            this.m_Log.Write("nsAOL.js - deleteMessage - START");  
            this.m_Log.Write("nsAOL.js - deleteMessage - id " + lID );
            this.m_CommMethod.deleteMessage(lID);
            this.m_Log.Write("nsAOL.js - deleteMessage - END");     
            return true;
        }
        catch(e)
        {
            this.m_Log.DebugDump("nsAOL.js: deleteMessage : Exception : " 
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
            this.m_Log.Write("nsAOL.js - logOUT - START"); 
            this.m_CommMethod.logOut();
            this.m_Log.Write("nsAOL.js - logOUT - END");  
            return true;
        }
        catch(e)
        {
            this.m_Log.DebugDump("nsAOL.js: logOUT : Exception : " 
                                      + e.name 
                                      + ".\nError message: " 
                                      + e.message+ "\n"
                                      + e.lineNumber);
            return false;
        }
    },  
        
    serverComms : function (szMsg)
    {
        try
        { 
            this.m_Log.Write("nsAOL.js - serverComms - START");
            this.m_Log.Write("nsAOL.js - serverComms msg " + szMsg);
            var iCount = this.m_oResponseStream.write(szMsg,szMsg.length);
            this.m_Log.Write("nsAOL.js - serverComms sent count: " + iCount 
                                                        +" msg length: " +szMsg.length);
            this.m_Log.Write("nsAOL.js - serverComms - END");  
        }
        catch(e)
        {
            this.m_Log.DebugDump("nsAOL.js: serverComms : Exception : " 
                                              + e.name 
                                              + ".\nError message: " 
                                              + e.message+ "\n"
                                              + e.lineNumber);
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
var nsAOLFactory = new Object();

nsAOLFactory.createInstance = function (outer, iid)
{
    if (outer != null) throw Components.results.NS_ERROR_NO_AGGREGATION;
    
    if (!iid.equals(nsAOLClassID) && !iid.equals(Components.interfaces.nsISupports))
        throw Components.results.NS_ERROR_INVALID_ARG;
    
    return new nsAOL();
}


/******************************************************************************/
/* MODULE */
var nsAOLModule = new Object();

nsAOLModule.registerSelf = function(compMgr, fileSpec, location, type)
{
    compMgr = compMgr.QueryInterface(Components.interfaces.nsIComponentRegistrar);
    compMgr.registerFactoryLocation(nsAOLClassID,
                                    "AOLComponent",
                                    nsAOLContactID, 
                                    fileSpec,
                                    location, 
                                    type);
}


nsAOLModule.unregisterSelf = function(aCompMgr, aFileSpec, aLocation)
{
    aCompMgr = aCompMgr.QueryInterface(Components.interfaces.nsIComponentRegistrar);
    aCompMgr.unregisterFactoryLocation(nsAOLClassID, aFileSpec);
}

 
nsAOLModule.getClassObject = function(compMgr, cid, iid)
{
    if (!cid.equals(nsAOLClassID))
        throw Components.results.NS_ERROR_NO_INTERFACE;

    if (!iid.equals(Components.interfaces.nsIFactory))
        throw Components.results.NS_ERROR_NOT_IMPLEMENTED;

    return nsAOLFactory;
}


nsAOLModule.canUnload = function(compMgr)
{
    return true;
}
/******************************************************************************/


function NSGetModule(compMgr, fileSpec)
{
    return nsAOLModule; 
}
