/*****************************  Globals   *************************************/
const nsOWAClassID = Components.ID("{112ebca0-0109-11da-8cd6-0800200c9a66}");
const nsOWAContactID = "@mozilla.org/POPOWA;1";
const ExtOWAGuid = "{3d82b2c0-0109-11da-8cd6-0800200c9a66}";

/******************************  OWA ***************************************/




function nsOWA()
{
    try
    {
        var scriptLoader =  Components.classes["@mozilla.org/moz/jssubscript-loader;1"]
        scriptLoader = scriptLoader.getService(Components.interfaces.mozIJSSubScriptLoader);
        scriptLoader.loadSubScript("chrome://web-mail/content/common/DebugLog.js");
        scriptLoader.loadSubScript("chrome://web-mail/content/common/CommonPrefs.js");
        scriptLoader.loadSubScript("chrome://web-mail/content/common/HttpComms3.js");
        scriptLoader.loadSubScript("chrome://owa/content/OWA-Prefs-Data.js");
        scriptLoader.loadSubScript("chrome://owa/content/OWA-MSG.js");
        scriptLoader.loadSubScript("chrome://owa/content/OWA-WebDav-POP.js");
        scriptLoader.loadSubScript("chrome://owa/content/OWA-ScreenRipper-POP.js");

        var date = new Date();
        var  szLogFileName = "OWA Log - " + date.getHours()+ "-" + date.getMinutes() + "-"+ date.getUTCMilliseconds() +" -";
        this.m_Log = new DebugLog("webmail.logging.comms", ExtOWAGuid, szLogFileName);

        this.m_Log.Write("nsOWA.js - Constructor - START");

        if (typeof kOWAConstants == "undefined")
        {
            this.m_Log.Write("nsPOPOWA.js - Constructor - loading constants");
            scriptLoader.loadSubScript("chrome://owa/content/OWA-Constants.js");
        }

        this.m_szUserName = null;
        this.m_szPassWord = null;
        this.m_oResponseStream = null;
        this.m_bAuthorised = false;
        this.m_CommMethod = null;
         
        this.m_Log.Write("nsOWA.js - Constructor - END");
    }
    catch(e)
    {
        DebugDump("nsOWA.js: Constructor : Exception : "
                                      + e.name
                                      + ".\nError message: "
                                      + e.message);
    }
}



nsOWA.prototype =
{
    get userName() {return this.m_szUserName;},
    set userName(userName) {return this.m_szUserName = userName;},

    get passWord() {return this.m_szPassWord;},
    set passWord(passWord) {return this.m_szPassWord = passWord;},

    get ResponseStream() {return this.m_oResponseStream;},
    set ResponseStream(responseStream) {return this.m_oResponseStream = responseStream;},

    get bAuthorised()
    {
        return (this.m_CommMethod)? this.m_CommMethod.m_bAuthorised: false;
    },


    logIn : function()
    {
        try
        {
            this.m_Log.Write("nsOWA.js - logIN - START");

            if (!this.m_szUserName || !this.m_oResponseStream || !this.m_szPassWord) return false;

            //load webdav address
            var PrefData = this.getPrefs();

            if (PrefData.iMode==1) ///webdav
                this.m_CommMethod = new OWAWebDav(this.m_oResponseStream, this.m_Log, PrefData);
            else // scrren ripper
                this.m_CommMethod = new OWAScreenRipper(this.m_oResponseStream, this.m_Log, PrefData);

            var bResult = this.m_CommMethod.logIn(this.m_szUserName, this.m_szPassWord);

            this.m_Log.Write("nsOWA.js - logIN - END");
            return true;
        }
        catch(e)
        {
            this.m_Log.DebugDump("nsOWA.js: logIN : Exception : "
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
            this.m_Log.Write("nsOWA.js - getNumMessages - START");

            this.m_CommMethod.getNumMessages();
            
            this.m_Log.Write("nsOWA.js - getNumMessages - END");
            return true;
        }
        catch(e)
        {
            this.m_Log.DebugDump("nsOWA.js: getNumMessages : Exception : "
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
            this.m_Log.Write("nsOWA.js - getMessageSizes - START");

            this.m_CommMethod.getMessageSizes();

            this.m_Log.Write("nsOWA.js - getMessageSizes - END");
            return true;
        }
        catch(e)
        {
            this.m_Log.DebugDump("nsOWA.js: getMessageSizes : Exception : "
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
            this.m_Log.Write("nsOWA.js - getMessageIDs - START");

            this.m_CommMethod.getMessageIDs();

            this.m_Log.Write("nsOWA.js - getMessageIDs - END");
            return true;
        }
        catch(e)
        {
            this.m_Log.DebugDump("nsOWA.js: getMessageIDs : Exception : "
                                          + e.name
                                          + ".\nError message: "
                                          + e.message);
            return false;
        }
    },



    //top
    getMessageHeaders : function(lID)
    {
        try
        {
            this.m_HotmailLog.Write("nsOWA.js - getHeaders - START");
            this.m_HotmailLog.Write("nsOWA.js - getHeaders - id " + lID );

            this.m_CommMethod.getMessageHeaders(lID);

            this.m_HotmailLog.Write("nsOWA.js - getHeaders - END");
            return true;
        }
        catch(err)
        {
            this.m_HotmailLog.DebugDump("nsOWA.js: getHeaders : Exception : "
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
            this.m_Log.Write("nsOWA.js - getMessage - START");
            this.m_Log.Write("nsOWA.js - getMessage - msg num" + lID);
     
            this.m_CommMethod.getMessage(lID);

            this.m_Log.Write("nsOWA.js - getMessage - END");
            return true;
        }
        catch(e)
        {
             this.m_Log.DebugDump("nsOWA.js: getMessage : Exception : "
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
            this.m_Log.Write("nsOWA.js - deleteMessage - START");
            this.m_Log.Write("nsOWA.js - deleteMessage - id " + lID );

            this.m_CommMethod.deleteMessage(lID);
            
            this.m_Log.Write("nsOWA.js - deleteMessage - END");
            return true;
        }
        catch(e)
        {
            this.m_Log.DebugDump("nsOWA.js: deleteMessage : Exception : "
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
            this.m_Log.Write("nsOWA.js - logOUT - START");

            this.m_CommMethod.logOut();
            
            this.m_Log.Write("nsOWA.js - logOUT - END");
            return true;
        }
        catch(e)
        {
            this.m_Log.DebugDump("nsOWA.js: logOUT : Exception : "
                                      + e.name
                                      + ".\nError message: "
                                      + e.message);
            return false;
        }
    },




    getPrefs : function ()
    {
        try
        {
            this.m_Log.Write("nsOWA.js - getPrefs - START");

            var WebMailPrefAccess = new WebMailCommonPrefAccess();
            var oPref = {Value : null};
            var oData = new PrefData();

            var szUserName =  this.m_szUserName;
            szUserName = szUserName.replace(/\./g,"~");
            szUserName = szUserName.toLowerCase();

            //delay processing time delay
            if (WebMailPrefAccess.Get("int","owa.iProcessDelay",oPref))
                oData.iProcessDelay = oPref.Value;

            //delay proccess amount
            oPref.Value = null;
            if (WebMailPrefAccess.Get("bool","owa.iProcessAmount",oPref))
                oData.iProcessAmount = oPref.Value;

            //do i reuse the session
            oPref.Value = null;
            if (WebMailPrefAccess.Get("bool","owa.bReUseSession",oPref))
                oData.bReUseSession = oPref.Value;

            //get Mode
            oPref.Value = null;
            if (WebMailPrefAccess.Get("int","owa.Account."+szUserName+".iMode",oPref))
                oData.iMode = oPref.Value;
            this.m_Log.Write("nsOWA.js - getPrefs - iMode " + oData.iMode);

            //get LoginWithDomain
            oPref.Value = null;
            if (WebMailPrefAccess.Get("bool","owa.Account."+szUserName+".bLoginWithDomain",oPref))
                oData.bLoginWithDomain = oPref.Value;
            this.m_Log.Write("nsOWA.js - getPrefs - bLoginWithDomain " + oData.bLoginWithDomain);

            //get forwardCredentials
            oPref.Value = null;
            if (WebMailPrefAccess.Get("bool","owa.Account."+szUserName+".forwardCreds",oPref))
                oData.forwardCreds = oPref.Value;
            this.m_Log.Write("nsOWA.js - getPrefs - forwardCreds " + oData.forwardCreds);

            this.m_Log.Write("nsOWA.js - getPrefs - END");
            return oData;
        }
        catch(e)
        {
            this.m_Log.DebugDump("nsOWA.js: getPrefs : Exception : "
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
var nsOWAFactory = new Object();

nsOWAFactory.createInstance = function (outer, iid)
{
    if (outer != null) throw Components.results.NS_ERROR_NO_AGGREGATION;

    if (!iid.equals(nsOWAClassID) && !iid.equals(Components.interfaces.nsISupports))
        throw Components.results.NS_ERROR_INVALID_ARG;

    return new nsOWA();
}


/******************************************************************************/
/* MODULE */
var nsOWAModule = new Object();

nsOWAModule.registerSelf = function(compMgr, fileSpec, location, type)
{
    compMgr = compMgr.QueryInterface(Components.interfaces.nsIComponentRegistrar);
    compMgr.registerFactoryLocation(nsOWAClassID,
                                    "OWAComponent",
                                    nsOWAContactID,
                                    fileSpec,
                                    location,
                                    type);
}


nsOWAModule.unregisterSelf = function(aCompMgr, aFileSpec, aLocation)
{
    aCompMgr = aCompMgr.QueryInterface(Components.interfaces.nsIComponentRegistrar);
    aCompMgr.unregisterFactoryLocation(nsOWAClassID, aFileSpec);
}


nsOWAModule.getClassObject = function(compMgr, cid, iid)
{
    if (!cid.equals(nsOWAClassID))
        throw Components.results.NS_ERROR_NO_INTERFACE;

    if (!iid.equals(Components.interfaces.nsIFactory))
        throw Components.results.NS_ERROR_NOT_IMPLEMENTED;

    return nsOWAFactory;
}


nsOWAModule.canUnload = function(compMgr)
{
    return true;
}
/******************************************************************************/


function NSGetModule(compMgr, fileSpec)
{
    return nsOWAModule;
}
