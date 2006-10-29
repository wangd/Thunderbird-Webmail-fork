/*****************************  Globals   *************************************/
const nsHotmailSMTPClassID = Components.ID("{8b9baa40-1296-11da-8cd6-0800200c9a66}");
const nsHotmailSMTPContactID = "@mozilla.org/HotmailSMTP;1";
const ExtHotmailGuid = "{3c8e8390-2cf6-11d9-9669-0800200c9a66}";

/******************************  Hotmail ***************************************/
function nsHotmailSMTP()
{
    try
    {
        var scriptLoader =  Components.classes["@mozilla.org/moz/jssubscript-loader;1"];
        scriptLoader = scriptLoader.getService(Components.interfaces.mozIJSSubScriptLoader);
        scriptLoader.loadSubScript("chrome://web-mail/content/common/DebugLog.js");
        scriptLoader.loadSubScript("chrome://web-mail/content/common/CommonPrefs.js");
        scriptLoader.loadSubScript("chrome://hotmail/content/Hotmail-Prefs-Data.js");
        scriptLoader.loadSubScript("chrome://hotmail/content/Hotmail-WebDav-SMTP.js");
        scriptLoader.loadSubScript("chrome://hotmail/content/Hotmail-ScreenRipper-SMTP.js");
        scriptLoader.loadSubScript("chrome://hotmail/content/Hotmail-ScreenRipper-SMTP-BETA.js");

        var date = new Date();
        var  szLogFileName = "Hotmail SMTP Log - " + date.getHours()
                                           + "-" + date.getMinutes()
                                           + "-"+ date.getUTCMilliseconds() +" -";
        this.m_Log = new DebugLog("webmail.logging.comms", ExtHotmailGuid, szLogFileName);
        this.m_Log.Write("nsHotmailSMTP.js - Constructor - START");

        if (typeof kHotmailConstants == "undefined")
        {
            this.m_Log.Write("nsLycos.js - Constructor - loading constants");
            scriptLoader.loadSubScript("chrome://hotmail/content/Hotmail-Constants.js");
        }

        this.m_szUserName = null;
        this.m_szPassWord = null;
        this.m_oResponseStream = null;
        this.m_aszTo = new Array();
        this.m_szFrom = null;
        this.m_CommMethod = null;

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

            //load prefs
            var PrefData = this.getPrefs();

            if (PrefData.iMode==1) ///webdav
                this.m_CommMethod = new HotmailSMTPWebDav(this.m_oResponseStream, this.m_Log, PrefData);
            else if (PrefData.iMode==2) //beta
                this.m_CommMethod = new HotmailSMTPScreenRipperBETA(this.m_oResponseStream, this.m_Log, PrefData);

            if (!this.m_CommMethod) //default screen ripper
                this.m_CommMethod = new HotmailSMTPScreenRipper(this.m_oResponseStream, this.m_Log, PrefData);

            var bResult = this.m_CommMethod.logIn(this.m_szUserName, this.m_szPassWord);

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
            this.m_Log.Write("nsHotmailSMTP.js - rawMSG from " +this.m_szFrom );
            this.m_Log.Write("nsHotmailSMTP.js - rawMSG to " +this.m_aszTo );
            this.m_Log.Write("nsHotmailSMTP.js - rawMSG " + szEmail);

            var bResult = this.m_CommMethod.rawMSG(this.m_szFrom, this.m_aszTo, szEmail);

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


   serverComms : function (szMsg)
    {
        try
        {
            this.m_Log.Write("nsHotmailSMTP - serverComms - START");
            this.m_Log.Write("nsHotmailSMTP - serverComms msg " + szMsg);
            var iCount = this.m_oResponseStream.write(szMsg,szMsg.length);
            this.m_Log.Write("nsHotmailSMTP - serverComms sent count: " + iCount
                                                        +" msg length: " +szMsg.length);
            this.m_Log.Write("nsHotmailSMTP - serverComms - END");
        }
        catch(e)
        {
            this.m_Log.DebugDump("nsHotmailSMTP: serverComms : Exception : "
                                              + e.name
                                              + ".\nError message: "
                                              + e.message+ "\n"
                                              + e.lineNumber);
        }
    },




    getPrefs : function ()
    {
        try
        {
            this.m_Log.Write("nsHotmailSMTP.js - getPrefs - START");

            var WebMailPrefAccess = new WebMailCommonPrefAccess();
            var oPref = {Value : null};
            var oData = new PrefData();

            ////////
            //load defaults
            ////////
            //do i reuse the session
            WebMailPrefAccess.Get("bool","hotmail.bReUseSession",oPref);
            this.m_Log.Write("nsHotmailSMTP.js - getPrefs - hotmail.bReUseSession " + oPref.Value);
            if (oPref.Value != null) oData.bReUseSession = oPref.Value;

            //save copy in sent items
            oPref.Value = null;
            WebMailPrefAccess.Get("bool","hotmail.bSaveCopy",oPref);
            this.m_Log.Write("nsHotmailSMTP.js - getPrefs - hotmail.bSaveCopy " + oPref.Value);
            if (oPref.Value != null) oData.bSaveCopy=oPref.Value;

            //what do i do with alternative parts
            oPref.Value = null;
            WebMailPrefAccess.Get("bool","hotmail.bSendHtml",oPref);
            this.m_Log.Write("nsHotmailSMTP.js - getPrefs - hotmail.bSendHtml " + oPref.Value);
            if (oPref.Value != null) oData.bSendHtml = oPref.Value;

            //////
            //load User prefs
            //////
            var iCount = 0;
            oPref.Value = null;
            WebMailPrefAccess.Get("int","hotmail.Account.Num",oPref);
            this.m_Log.Write("nsHotmailSMTP.js - getPrefs - Users Num " + oPref.Value);
            if (oPref.Value != null) iCount = oPref.Value;

            var regExp = new RegExp(this.m_szUserName,"i");

            for(var i=0; i<iCount; i++)
            {
                oPref.Value = null;
                WebMailPrefAccess.Get("char","hotmail.Account."+i+".user",oPref);
                this.m_Log.Write("nsHotmailSMTP.js - getPrefs - szUserName " + oPref.Value);
                if (oPref.Value != null)
                {
                    if (oPref.Value.search(regExp)!=-1)
                    {
                        this.m_Log.Write("nsHotmailSMTP.js - getPrefs - user found "+ i);

                        //get Mode
                        oPref.Value = null;
                        WebMailPrefAccess.Get("int","hotmail.Account."+i+".iMode",oPref);
                        this.m_Log.Write("nsHotmailSMTP.js - getPrefs - iMode " + oPref.Value);
                        if (oPref.Value != null) oData.iMode = oPref.Value;

                        //do i save copy
                        oPref.Value = null;
                        WebMailPrefAccess.Get("bool","hotmail.Account."+i+".bSaveCopy",oPref);
                        this.m_Log.Write("nsHotmailSMTP.js - getPrefs - bSaveCopy " + oPref.Value);
                        if (oPref.Value != null) oData.bSaveCopy=oPref.Value;

                        //what do i do with alternative parts
                        oPref.Value = null;
                        WebMailPrefAccess.Get("bool","hotmail.Account."+i+".bSendHtml",oPref);
                        this.m_Log.Write("nsHotmailSMTP.js - getPrefs - bSendHtml " + oPref.Value);
                        if (oPref.Value != null) oData.bSendHtml = oPref.Value;
                    }
                }
            }

            this.m_Log.Write("nsHotmailSMTP.js - getPrefs - END");
            return oData;
        }
        catch(e)
        {
            this.m_Log.DebugDump("nsHotmailSMTP.js: getPrefs : Exception : "
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
