/*****************************  Globals   *************************************/
const nsOWASMTPClassID = Components.ID("{840fbdf0-103b-11da-8cd6-0800200c9a66}");
const nsOWASMTPContactID = "@mozilla.org/SMTPOWA;1";
const ExtOWAGuid = "{bb791690-5d30-11db-b0de-0800200c9a66}";

/******************************  OWA ***************************************/
function nsOWASMTP()
{
    try
    {
        var scriptLoader =  Components.classes["@mozilla.org/moz/jssubscript-loader;1"]
                                      .getService(Components.interfaces.mozIJSSubScriptLoader);
        scriptLoader.loadSubScript("chrome://web-mail/content/common/DebugLog.js");
        scriptLoader.loadSubScript("chrome://web-mail/content/common/CommonPrefs.js");
        scriptLoader.loadSubScript("chrome://web-mail/content/common/HttpComms3.js");
        scriptLoader.loadSubScript("chrome://web-mail/content/common/Email.js");
        scriptLoader.loadSubScript("chrome://owa/content/OWA-Prefs-Data.js");
        scriptLoader.loadSubScript("chrome://owa/content/OWA-WebDav-SMTP.js");
        scriptLoader.loadSubScript("chrome://owa/content/OWA-ScreenRipper-SMTP.js");

        var date = new Date();
        var szLogFileName = "OWA SMTP Log - " + date.getHours()+ "-" + date.getMinutes() + "-"+ date.getUTCMilliseconds() +" -";
        this.m_Log = new DebugLog("webmail.logging.comms", ExtOWAGuid, szLogFileName);

        this.m_Log.Write("nsOWASMTP.js - Constructor - START");


        if (typeof kOWAConstants == "undefined")
        {
            this.m_Log.Write("nsOWASMTP.js - Constructor - loading constants");
            scriptLoader.loadSubScript("chrome://owa/content/OWA-Constants.js");
        }

        this.m_szUserName = null;
        this.m_szPassWord = null;
        this.m_oResponseStream = null;
        this.m_aszTo = new Array();
        this.m_szFrom = null;
        this.m_CommMethod = null;
        
        this.m_Log.Write("nsOWASMTP.js - Constructor - END");
    }
    catch(e)
    {
        DebugDump("nsOWASMTP.js: Constructor : Exception : "
                                      + e.name
                                      + ".\nError message: "
                                      + e.message +"\n" +
                                      e.lineNumber);
    }
}



nsOWASMTP.prototype =
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

    get to() {return this.m_aszTo;},
    set to(szAddress) {return this.m_aszTo.push(szAddress);},

    get from() {return this.m_szFrom;},
    set from(szAddress) {return this.m_szFrom = szAddress;},


    logIn : function()
    {
        try
        {
            this.m_Log.Write("nsOWASMTP.js - logIN - START");

            if (!this.m_szUserName || !this.m_oResponseStream || !this.m_szPassWord) return false;

            //load webdav address
            var PrefData = this.getPrefs();

            if (PrefData.iMode==1) ///webdav
                this.m_CommMethod = new OWASMTPWebDav(this.m_oResponseStream, this.m_Log, PrefData);
            else // scrren ripper
                this.m_CommMethod = new OWASMTPScreenRipper(this.m_oResponseStream, this.m_Log, PrefData);

            var bResult = this.m_CommMethod.logIn(this.m_szUserName, this.m_szPassWord);

            this.m_Log.Write("nsOWASMTP.js - logIN - END");
            return true;
        }
        catch(e)
        {
            this.m_Log.DebugDump("nsOWASMTP.js: logIN : Exception : "
                                              + e.name +
                                              ".\nError message: "
                                              + e.message +"\n"
                                              + e.lineNumber);

            this.serverComms("502 negative vibes from " +this.m_szUserName +"\r\n");

            return false;
        }
    },



    rawMSG : function (szEmail)
    {
        try
        {
            this.m_Log.Write("nsOWASMTP.js - rawMSG - START");
            this.m_Log.Write("nsOWASMTP.js - rawMSG from " +this.m_szFrom );
            this.m_Log.Write("nsOWASMTP.js - rawMSG to " +this.m_aszTo );
            this.m_Log.Write("nsOWASMTP" + szEmail);

            var bResult = this.m_CommMethod.rawMSG(this.m_szFrom, this.m_aszTo, szEmail);
            
            this.m_Log.Write("nsOWASMTP.js - rawMSG - END");
            return bResult;
        }
        catch(err)
        {
            this.m_Log.DebugDump("nsOWASMTP.js: rawMSG : Exception : "
                                              + err.name +
                                              ".\nError message: "
                                              + err.message +"\n" +
                                                err.lineNumber);

            this.serverComms("502 negative vibes from " +this.m_szUserName +"\r\n");

            return false;
        }
    },



    ////////////////////////////////////////////////////////////////////////////
    /////  Comms

    serverComms : function (szMsg)
    {
        try
        {
            this.m_Log.Write("nsOWASMTP.js - serverComms - START");
            this.m_Log.Write("nsOWASMTP.js - serverComms msg " + szMsg);
            var iCount = this.m_oResponseStream.write(szMsg,szMsg.length);
            this.m_Log.Write("nsOWASMTP.js - serverOWA sent count: " + iCount
                                                        +" msg length: " +szMsg.length);
            this.m_Log.Write("nsOWASMTP.js - serverComms - END");
        }
        catch(e)
        {
            this.m_Log.DebugDump("nsOWASMTP.js: serverComms : Exception : "
                                              + e.name
                                              + ".\nError message: "
                                              + e.message +"\n" +
                                                e.lineNumber);
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
        if (!iid.equals(Components.interfaces.nsISMTPDomainHandler)
                            && !iid.equals(Components.interfaces.nsISupports))
            throw Components.results.NS_ERROR_NO_INTERFACE;

        return this;
    }
}


/******************************************************************************/
/* FACTORY*/
var nsOWASMTPFactory = new Object();

nsOWASMTPFactory.createInstance = function (outer, iid)
{
    if (outer != null) throw Components.results.NS_ERROR_NO_AGGREGATION;

    if (!iid.equals(nsOWASMTPClassID) && !iid.equals(Components.interfaces.nsISupports))
        throw Components.results.NS_ERROR_INVALID_ARG;

    return new nsOWASMTP();
}


/******************************************************************************/
/* MODULE */
var nsOWASMTPModule = new Object();

nsOWASMTPModule.registerSelf = function(compMgr, fileSpec, location, type)
{
    compMgr = compMgr.QueryInterface(Components.interfaces.nsIComponentRegistrar);
    compMgr.registerFactoryLocation(nsOWASMTPClassID,
                                    "OWASMTPComponent",
                                    nsOWASMTPContactID,
                                    fileSpec,
                                    location,
                                    type);
}


nsOWASMTPModule.unregisterSelf = function(aCompMgr, aFileSpec, aLocation)
{
    aCompMgr = aCompMgr.QueryInterface(Components.interfaces.nsIComponentRegistrar);
    aCompMgr.unregisterFactoryLocation(nsOWASMTPClassID, aFileSpec);
}


nsOWASMTPModule.getClassObject = function(compMgr, cid, iid)
{
    if (!cid.equals(nsOWASMTPClassID))
        throw Components.results.NS_ERROR_NO_INTERFACE;

    if (!iid.equals(Components.interfaces.nsIFactory))
        throw Components.results.NS_ERROR_NOT_IMPLEMENTED;

    return nsOWASMTPFactory;
}


nsOWASMTPModule.canUnload = function(compMgr)
{
    return true;
}
/******************************************************************************/


function NSGetModule(compMgr, fileSpec)
{
    return nsOWASMTPModule;
}
