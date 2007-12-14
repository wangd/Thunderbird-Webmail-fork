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
        scriptLoader.loadSubScript("chrome://global/content/strres.js");
        scriptLoader.loadSubScript("chrome://owa/content/OWA-MSG.js");

        var date = new Date();
        var szLogFileName = "OWA SMTP Log - " + date.getHours()+ "-" + date.getMinutes() + "-"+ date.getUTCMilliseconds() +" -";
        this.m_Log = new DebugLog("webmail.logging.comms", ExtOWAGuid, szLogFileName);

        this.m_Log.Write("nsOWASMTP.js - Constructor - START");


        if (typeof kOWAConstants == "undefined")
        {
            this.m_Log.Write("nsOWASMTP.js - Constructor - loading constants");
            scriptLoader.loadSubScript("chrome://owa/content/OWA-Constants.js");
        }

        this.m_DomainManager =  Components.classes["@mozilla.org/OWADomains;1"]
                                          .getService()
                                          .QueryInterface(Components.interfaces.nsIOWADomains);       
        this.m_bAuthorised = false;
        this.m_szUserName = null;
        this.m_szPassWord = null;
        this.m_oResponseStream = null;
        this.m_HttpComms = new HttpComms(this.m_Log);
        this.m_aszTo = new Array;
        this.m_szFrom = null;
        this.m_iStage = 0;
        this.m_szBaseURL = null;
        this.m_szMailBox = null;
        this.m_Email = new email("");
        this.m_Email.decodeBody(true);
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
            this.m_Log.Write("nsOWASMTP.js - logIN - START");
            this.m_Log.Write("nsOWASMTP.js - logIN - Username: " + this.m_szUserName
                                                   + " Password: " + this.m_szPassWord
                                                   + " stream: " + this.m_oResponseStream);

            var szDomain = this.m_szUserName.match(/.*?@(.*?)$/)[1].toLowerCase();
            var szURL = this.m_DomainManager.getURL(szDomain);
            this.m_HttpComms.setURI(szURL);
            this.m_HttpComms.setRequestMethod("GET");
            var bResult = this.m_HttpComms.send(this.loginOnloadHandler, this);
            if (!bResult) throw new Error("httpConnection returned false");

            this.m_iStage = 0;
                        
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


    loginOnloadHandler : function(szResponse ,event , mainObject)
    {
        try
        {
            mainObject.m_Log.Write("nsOWASMTP.js - loginOnloadHandler - START");
            mainObject.m_Log.Write("nsOWASMTP.js - loginOnloadHandler : " + mainObject.m_iStage );

            var httpChannel = event.QueryInterface(Components.interfaces.nsIHttpChannel);

            //if this fails we've gone somewhere new
            mainObject.m_Log.Write("nsOWASMTP.js - loginOnloadHandler - status :" +httpChannel.responseStatus );
            if (httpChannel.responseStatus != 200 && httpChannel.responseStatus != 207)
                throw new Error("return status " + httpChannel.responseStatus);


            switch(mainObject.m_iStage)
            {
                case 0: //login form
                    var szAction = szResponse.match(kOWAAction)[1];            
                    mainObject.m_Log.Write("nsOWASMTP - loginOnloadHandler - szAction :" +szAction);
                    var szURL = httpChannel.URI.prePath + szAction
                    mainObject.m_Log.Write("nsOWASMTP - loginOnloadHandler - szURL :" +szURL);
        
                    var szForm = szResponse.match(kOWAForm)[1];
                    mainObject.m_Log.Write("nsOWASMTP - loginOnloadHandler - szForm :" +szForm);
                    
                    var aszInput = szForm.match(kOWAInput);
                    
                    for (var i =0 ; i<aszInput.length; i++)
                    {
                        mainObject.m_Log.Write("nsOWASMTP - loginOnloadHandler - aszInput :" +aszInput[i]);
                        
                        if (aszInput[i].search(/submit/i)==-1 && aszInput[i].search(/radio/i) == -1)
                        { 
                            var szName = aszInput[i].match(kOWAName)[1];
                            
                            var szValue = "";
                            if (aszInput[i].search(/value/i)!=-1) szValue = aszInput[i].match(kOWAValue)[1];
                            
                            if (szName.search(/username/i) != -1) 
                            {
                                szValue = mainObject.m_szUserName.match(/(.*?)@/)[1].toLowerCase();
                                szValue = encodeURIComponent(szValue);
                            }
                            else if (szName.search(/password/i) != -1) 
                            {
                                szValue = mainObject.m_szPassWord;
                                szValue = encodeURIComponent(szValue);
                            }
                            
                            mainObject.m_HttpComms.addValuePair(szName,szValue);
                        }                
                    }
                    
                    mainObject.m_HttpComms.addValuePair("rdoPublic",0);
                    
                    mainObject.m_HttpComms.setURI(szURL);
                    mainObject.m_HttpComms.setRequestMethod("POST");
                    mainObject.m_iStage ++;
                    var bResult = mainObject.m_HttpComms.send(mainObject.loginOnloadHandler, mainObject);
                    if (!bResult) throw new Error("httpConnection returned false");
                break;
                
                
                case 1: //get base URL
                    mainObject.m_szBaseURL = szResponse.match(kBaseURL)[1];            
                    mainObject.m_Log.Write("nsOWASMTP - loginOnloadHandler - m_szBaseURL :" +mainObject.m_szBaseURL);
                    
                    var szMailBox = szResponse.match(kMailBoxURL)[1];  
                    mainObject.m_szMailBox = mainObject.m_szBaseURL + szMailBox         
                    mainObject.m_Log.Write("nsOWASMTP - loginOnloadHandler - m_szMailBox :" +mainObject.m_szMailBox);

                    //server response
                    mainObject.serverComms("235 Your In\r\n");
                    mainObject.m_bAuthorised = true;
                break;
            }

            mainObject.m_Log.Write("nsOWASMTP.js - loginOnloadHandler - END");
        }
        catch(err)
        {
            mainObject.m_Log.DebugDump("nsOWASMTP.js: loginHandler : Exception : "
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
            this.m_Log.Write("nsOWASMTP.js - rawMSG - START");
            this.m_Log.Write("nsOWASMTP.js - rawMSG " + szEmail);

            if (!this.m_Email.parse(szEmail)) throw new Error ("Parse Failed")  
            
            if (!this.m_Email.txtBody) 
            {
                var stringBundle =srGetStrBundle("chrome://owa/locale/OWA-SMTP.properties");
                var szError = stringBundle.GetStringFromName("HtmlError");

                this.serverComms("502 "+ szError + "\r\n");
                return false;
            }
                       
            this.m_iStage = 0;
            var szURL = this.m_szBaseURL + "?cmd=new";
            this.m_HttpComms.setURI(szURL);
            this.m_HttpComms.setRequestMethod("GET");
            var bResult = this.m_HttpComms.send(this.composerOnloadHandler, this);
            if (!bResult) throw new Error("httpConnection returned false");
            
            this.m_Log.Write("nsOWASMTP.js - rawMSG - END");
            return true;
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


    composerOnloadHandler : function(szResponse ,event , mainObject)
    {
        try
        {
            mainObject.m_Log.Write("nsOWASMTP.js - composerOnloadHandler - START");
            mainObject.m_Log.Write("nsOWASMTP.js - composerOnloadHandler : " + mainObject.m_iStage);

            var httpChannel = event.QueryInterface(Components.interfaces.nsIHttpChannel);
            
            switch(mainObject.m_iStage)
            {
                case 0:
                    var szAction = szResponse.match(kOWAAction)[1];            
                    mainObject.m_Log.Write("nsOWASMTP - composerOnloadHandler - szAction :" +szAction);
                
                    var szForm = szResponse.match(kOWAForm)[1];
                    mainObject.m_Log.Write("nsOWASMTP - composerOnloadHandler - szForm :" +szForm);
                            
                    var aszInput = szForm.match(kOWAInput);
                            
                    for (var i = 0; i < aszInput.length; i++) 
                    {
                        mainObject.m_Log.Write("nsOWASMTP - composerOnloadHandler - aszInput :" + aszInput[i]);
                        
                        var szName = aszInput[i].match(kOWAName)[1];
                        var szValue = "";
                        try 
                        {
                            szValue = aszInput[i].match(kOWAValue)[1];
                        } 
                        catch (err) 
                        {
                        }
                        
                        if (szName.search(/MsgTo/i) != -1) 
                        {
                            szValue = mainObject.m_Email.headers.getTo();
                            
                        }
                        else if (szName.search(/MsgCc/i) != -1) 
                        {
                            var szCc = mainObject.m_Email.headers.getCc();
                            szValue = szCc ? szCc : "";
                        }
                        else if (szName.search(/MsgBcc/i) != -1) 
                        {
                            var szTo = mainObject.m_Email.headers.getTo();
                            var szCc = mainObject.m_Email.headers.getCc();
                            var szBCC = mainObject.getBcc(szTo, szCc);
                            szValue = szBCC ? szBCC : "";
                        }
                        else if (szName.search(/subject/i) != -1) 
                        {
                            var szSubject = mainObject.m_Email.headers.getSubject();
                            szValue = szSubject ? szSubject : "";
                        }
                        else if (szName.search(/^cmd$/i) != -1) 
                        {
                            szValue = "SEND";
                        }
                        
                        mainObject.m_HttpComms.addValuePair(szName, szValue);
                    }
                    
                    //email body
                    var szValue = mainObject.m_Email.txtBody.body.getBody();
                    mainObject.m_HttpComms.addValuePair("urn:schemas:httpmail:textdescription", szValue);
                     
                    mainObject.m_HttpComms.setURI(szAction);
                    mainObject.m_HttpComms.setRequestMethod("POST");
                    mainObject.m_iStage ++;
                    var bResult = mainObject.m_HttpComms.send(mainObject.composerOnloadHandler, mainObject);
                    if (!bResult) throw new Error("httpConnection returned false");
                break;
                
                case 1:
                    mainObject.serverComms("250 OK\r\n"); //message sent
                break;                              
            }

            mainObject.m_Log.Write("nsOWASMTP.js - composerOnloadHandler - END");
        }
        catch(err)
        {
            mainObject.m_Log.DebugDump("nsOWASMTP.js: composerOnloadHandler : Exception : "
                                          + err.name
                                          + ".\nError message: "
                                          + err.message +"\n" +                                         
                                          err.lineNumber);

            mainObject.serverComms("502 negative vibes from " +mainObject.m_szUserName +"\r\n");
        }
    },




    getBcc : function (szTo,szCc)
    {
        try
        {
            this.m_Log.Write("nsOWASMTP.js - getBcc - START");
            if (this.m_aszTo.length==0) return null;
            this.m_Log.Write("nsOWASMTP.js - getBcc - szRcptList " + this.m_aszTo);

            var szBcc = null;
            var szAddress = null;
            if (szTo) szAddress = szTo;
            if (szCc) szAddress = (szTo ? (szAddress + ","+ szCc) : szCc);
            this.m_Log.Write("nsOWASMTP.js - getBcc - szAddress " + szAddress);

            if (!szAddress)
                szBcc = this.m_aszTo;
            else
            {
                for (j=0; j<this.m_aszTo.length; j++)
                {
                    var regExp = new RegExp(this.m_aszTo[j]);
                    if (szAddress.search(regExp)==-1)
                    {
                        szBcc? (szBcc += this.m_aszTo[j]) : (szBcc = this.m_aszTo[j]);
                        szBcc +=",";
                    }
                }
            }
            this.m_Log.Write("nsOWASMTP.js - getBcc szBcc- " + szBcc);

            this.m_Log.Write("nsOWASMTP.js - getBcc - End");
            return szBcc;
        }
        catch(err)
        {
            this.m_Log.DebugDump("nsOWASMTP.js: getBcc : Exception : "
                                                  + err.name
                                                  + ".\nError message: "
                                                  + err.message + "\n"
                                                  + err.lineNumber);

            return null;
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
