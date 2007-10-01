/*****************************  Globals   *************************************/
const nsHotmailIMAPClassID = Components.ID("{8cad2a80-056b-11db-9cd8-0800200c9a66}");
const nsHotmailIMAPContactID = "@mozilla.org/HotmailIMAP;1";

/***********************  Hotmail ********************************/
function nsHotmailIMAP()
{
    try
    {
        var scriptLoader =  Components.classes["@mozilla.org/moz/jssubscript-loader;1"];
        scriptLoader = scriptLoader.getService(Components.interfaces.mozIJSSubScriptLoader);
        scriptLoader.loadSubScript("chrome://web-mail/content/common/DebugLog.js");
        scriptLoader.loadSubScript("chrome://web-mail/content/common/HttpComms3.js");
        scriptLoader.loadSubScript("chrome://web-mail/content/common/CommonPrefs.js");

        var date = new Date();
        var  szLogFileName = "HotmailIMAP Log - " + date.getHours()+ "-" + date.getMinutes() + "-"+ date.getUTCMilliseconds() +" -";
        this.m_Log = new DebugLog("webmail.logging.comms",
                                  "{3c8e8390-2cf6-11d9-9669-0800200c9a66}" ,
                                  szLogFileName);
        delete date;
        this.m_Log.Write("nsHotmailIMAP.js - Constructor - START");

        if (typeof kHotmailConstants == "undefined")
        {
            this.m_Log.Write("nsHotmailIMAP.js - Constructor - loading constants");
            scriptLoader.loadSubScript("chrome://hotmail/content/Hotmail-Constants.js");
        }


        this.m_szUserName = null;
        this.m_szPassWord = null;
        this.m_oResponseStream = null;
        this.m_iRetries = 1;
        this.m_iTag = 0;

        this.m_oIMAPData = Components.classes["@mozilla.org/nsIMAPFolders;1"]
                                     .getService(Components.interfaces.nsIIMAPFolders);

        this.m_HttpComms = new HttpComms(this.m_Log);
        this.m_HttpComms.setHandleHttpAuth(true);
        this.m_bAuthorised = false;
        this.m_iStage=0;

        this.m_szFolderURI = null;
        this.m_szFolderReference = null;
        this.m_szSelectFolder = null;
        this.m_copyDest = null;
        this.m_bStoreStatus = false;
        this.m_bStoreDelete = false;
        this.m_szFolderName = null;
        this.m_szFolderNewName = null;
        this.m_aRawData = new Array();
        this.m_szRange = null;
        this.m_szFlag = null;
        this.m_iUID = 0;
        this.m_szDestinationFolder = null;
        this.m_iListType = 0;
        this.m_szMSG = null;

        this.m_Timer = Components.classes["@mozilla.org/timer;1"];
        this.m_Timer = this.m_Timer.createInstance(Components.interfaces.nsITimer);

        var oPref = {Value:null};
        var  WebMailPrefAccess = new WebMailCommonPrefAccess();
        if (WebMailPrefAccess.Get("int","hotmail.iProcessDelay",oPref))
            this.m_iTime=oPref.Value;
        else
            this.m_iTime=10;

        oPref.Value = null;
        if (WebMailPrefAccess.Get("int","hotmail.iProcessAmount",oPref))
            this.m_iProcessAmount = oPref.Value;
        else
            this.m_iProcessAmount = 25;

        oPref.Value = null;
        if (WebMailPrefAccess.Get("int","hotmail.iFolderBiff",oPref))
            this.m_iFolderBiff = oPref.Value;
        else
            this.m_iFolderBiff = 1200000;

        oPref.Value = null;
        if (WebMailPrefAccess.Get("int","hotmail.iMSGListBiff",oPref))
            this.m_iMSGListBiff = oPref.Value;
        else
            this.m_iMSGListBiff = 600000;

        this.m_Log.Write("nsHotmailIMAP.js - Constructor - END");
    }
    catch(e)
    {
        DebugDump("nsHotmailIMAP.js: Constructor : Exception : "
                                      + e.name
                                      + ".\nError message: "
                                      + e.message+ "\n"
                                      + e.lineNumber);
    }
}



nsHotmailIMAP.prototype =
{
    get userName() {return this.m_szUserName;},
    set userName(userName) {return this.m_szUserName = userName;},

    get passWord() {return this.m_szPassWord;},
    set passWord(passWord) {return this.m_szPassWord = passWord;},

    get tag() {return this.m_iTag;},
    set tag(iTag) {return this.m_iTag = iTag;},

    get bAuthorised() {return this.m_bAuthorised;},

    get ResponseStream() {return this.m_oResponseStream;},
    set ResponseStream(responseStream) {return this.m_oResponseStream = responseStream;},


    logIn : function()
    {
        try
        {
            this.m_Log.Write("nsHotmailIMAP.js - logIN - START");
            this.m_Log.Write("nsHotmailIMAP.js - logIN - Username: " + this.m_szUserName
                                                   + " Password: "  + this.m_szPassWord
                                                   + " stream: "    + this.m_oResponseStream);

            if (!this.m_szUserName || !this.m_oResponseStream || !this.m_szPassWord) return false;

            var szDomain = this.m_szUserName.split("@")[1];
            this.m_Log.Write("nsHotmailIMAP.js - logIN - doamain " + szDomain);

            this.m_HttpComms.setUserName(this.m_szUserName);
            this.m_HttpComms.setPassword(this.m_szPassWord);
            this.m_HttpComms.setContentType("text/xml");
            this.m_HttpComms.setURI("http://oe.hotmail.com/svcs/hotmail/httpmail.asp");
            this.m_HttpComms.setRequestMethod("PROPFIND");
            this.m_HttpComms.addData(HotmailSchema);
            var bResult = this.m_HttpComms.send(this.loginOnloadHandler, this);
            if (!bResult) throw new Error("httpConnection returned false");

            this.m_Log.Write("nsHotmailIMAP.js - logIN - END " + bResult);
            return true;
        }
        catch(e)
        {
            this.m_Log.DebugDump("nsHotmailIMAP.js: logIN : Exception : "
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
            mainObject.m_Log.Write("nsHotmailIMAP.js - loginOnloadHandler - START");
            mainObject.m_Log.Write("nsHotmailIMAP.js - loginOnloadHandler : "+ mainObject.m_iStage);

            var httpChannel = event.QueryInterface(Components.interfaces.nsIHttpChannel);

            //if this fails we've gone somewhere new
            mainObject.m_Log.Write("nsHotmail - loginOnloadHandler - status :" +httpChannel.responseStatus );
            if (httpChannel.responseStatus != 200 && httpChannel.responseStatus != 207)
                throw new Error("return status " + httpChannel.responseStatus);

            mainObject.m_Log.Write("nsHotmailIMAP.js - loginOnloadHandler - get url - start");
            mainObject.m_szFolderURI = szResponse.match(patternHotmailFolder)[1];
            mainObject.m_Log.Write("nsHotmailIMAP.js - loginOnloadHandler - get folder url - " + mainObject.m_szFolderURI);

            mainObject.m_oIMAPData.createUser(mainObject.m_szUserName);

            //server response
            mainObject.serverComms(mainObject.m_iTag +" OK Login Complete\r\n");
            mainObject.m_bAuthorised = true;

            mainObject.m_Log.Write("nsHotmailIMAP.js - loginOnloadHandler - END");
        }
        catch(err)
        {
            var oCookies = Components.classes["@mozilla.org/nsWebMailCookieManager2;1"]
                                     .getService(Components.interfaces.nsIWebMailCookieManager2);
            oCookies.removeCookie(mainObject.m_szUserName);

            var oAuth = Components.classes["@mozilla.org/HttpAuthManager2;1"]
                                  .getService(Components.interfaces.nsIHttpAuthManager2);
            oAuth.removeToken(mainObject.m_szUserName);

            //check for retries
            if (mainObject.m_iRetries > 0)
            {
                mainObject.m_iRetries --;
                mainObject.m_Log.Write("nsHotmailIMAP.js - loginHandler - having another go " +mainObject.m_iRetries);
                mainObject.m_HttpComms.setUserName(mainObject.m_szUserName);
                mainObject.m_HttpComms.setPassword(mainObject.m_szPassWord);
                mainObject.m_HttpComms.setURI("http://oe.hotmail.com/svcs/hotmail/httpmail.asp");
                mainObject.m_HttpComms.setRequestMethod("PROPFIND");
                mainObject.m_HttpComms.setContentType("text/xml");
                mainObject.m_HttpComms.addData(HotmailSchema);
                var bResult = mainObject.m_HttpComms.send(mainObject.loginOnloadHandler, mainObject);
            }
            else
            {
                mainObject.m_Log.DebugDump("nsHotmailIMAP.js: loginHandler : Exception : "
                                              + err.name
                                              + ".\nError message: "
                                              + err.message+ "\n"
                                              + err.lineNumber);

                mainObject.serverComms(mainObject.m_iTag + " NO Comms Error\r\n");
                return false;
            }
        }
    },






    listSubscribe : function()
    {
        try
        {
            this.m_Log.Write("nsHotmailIMAP.js - listSubscribe - START");

            var iUpdateDate = this.m_oIMAPData.lastFolderListUpdate(this.m_szUserName);
            iUpdateDate += this.m_iFolderBiff;
            this.m_Log.Write("nsHotmailIMAP.js - list - iUpdateDate " + iUpdateDate);
            this.m_iListType = 0;

            if (iUpdateDate < Date.now())
            {//donwload folder list
                this.m_HttpComms.setContentType("text/xml");
                this.m_HttpComms.setRequestMethod("PROPFIND");
                this.m_HttpComms.addData(HotmailFolderSchema);
                this.m_HttpComms.setURI(this.m_szFolderURI);
                var bResult = this.m_HttpComms.send(this.listOnloadHandler, this);
                if (!bResult) throw new Error("httpConnection returned false");
            }
            else
            {
                this.subscribeResponse();
            }

            this.m_Log.Write("nsHotmailIMAP.js - listSubscribe - END");
            return true;
        }
        catch(err)
        {
            this.m_Log.DebugDump("nsHotmailIMAP.js: listSubscribe : Exception : "
                                      + err.name
                                      + ".\nError message: "
                                      + err.message + "\n"
                                      + err.lineNumber);
            this.serverComms(this.m_iTag +" BAD error\r\n");
            return false;
        }
    },





    subscribeResponse : function ()
    {
        try
        {
            this.m_Log.Write("nsHotmailIMAP.js - subscribeResponse - START");

            var aszFolders = {value : null};
            var iFolders = {value : null };
            this.m_oIMAPData.listSubscribed(this.m_szUserName, iFolders, aszFolders);
            this.m_Log.Write("nsHotmailIMAP.js - listSubscribe - list: " + aszFolders.value);

            var szResponse = "";
            for (i=0; i<aszFolders.value.length; i++)
            {
                szResponse += "* lsub (\\Noinferiors \\HasNoChildren) " + "\".\" \"" + aszFolders.value[i] + "\"\r\n";
            }
            szResponse += this.m_iTag + " OK LSUB Completed\r\n";
            this.serverComms(szResponse);

            this.m_Log.Write("nsHotmailIMAP.js - subscribeResponse - END");
        }
        catch(err)
        {
             this.m_Log.DebugDump("nsHotmailIMAP.js: subscribeResponse : Exception : "
                                              + err.name
                                              + ".\nError message: "
                                              + err.message + "\n"
                                              + err.lineNumber);

             this.serverComms(this.m_iTag +" BAD error\r\n");
        }
    },






    subscribe : function (szFolder)
    {
        try
        {
            this.m_Log.Write("nsHotmailIMAP.js - subscribe - START");
            this.m_Log.Write("nsHotmailIMAP.js - subscribe - szFolder " +szFolder);
            if (!szFolder) return false;

            var bDone = this.m_oIMAPData.subscribeFolder(this.m_szUserName, szFolder);
            var szResponse = this.m_iTag;
            szResponse += bDone? " OK " : " NO ";
            szResponse += "SUBCRIBE Completed\r\n";
            this.serverComms(szResponse);

            this.m_Log.Write("nsHotmailIMAP.js - subscribe - END");
        }
        catch(err)
        {
             this.m_Log.DebugDump("nsHotmailIMAP.js: subscribe : Exception : "
                                          + err.name
                                          + ".\nError message: "
                                          + err.message+ "\n"
                                          + err.lineNumber);

            this.serverComms(this.m_iTag + " NO Comms Error\r\n");
        }
    },





    unSubscribe : function (szFolder)
    {
        try
        {
            this.m_Log.Write("nsHotmailIMAP.js - unSubscribe - START");
            this.m_Log.Write("nsHotmailIMAP.js - unSubscribe - Folder " + szFolder );
            if (!szFolder) return false;

            var bDone = this.m_oIMAPData.unsubscribeFolder(this.m_szUserName, szFolder);
            var szResponse = this.m_iTag;
            szResponse += bDone? " OK " : " NO ";
            szResponse += "UNSUBCRIBE Completed\r\n";
            this.serverComms(szResponse);

            this.m_Log.Write("nsHotmailIMAP.js - unSubscribe - END");
        }
        catch(err)
        {
            this.m_Log.DebugDump("nsHotmailIMAP.js: unSubscribe : Exception : "
                                                          + err.name
                                                          + ".\nError message: "
                                                          + err.message+ "\n"
                                                          + err.lineNumber);
            this.serverComms(this.m_iTag +" BAD error\r\n");
            return false;
        }
    },






    list : function (szReference)
    {
        try
        {
            this.m_Log.Write("nsHotmailIMAP.js - list - START");
            this.m_Log.Write("nsHotmailIMAP.js - list - szReference " + szReference);

            if (this.m_szFolderURI == null) return false;
            this.m_Log.Write("nsHotmailIMAP.js - list - mail box url " + this.m_szFolderURI);

            this.m_szFolderReference = szReference;

            var iUpdateDate = this.m_oIMAPData.lastFolderListUpdate(this.m_szUserName);
            iUpdateDate += this.m_iFolderBiff;
            this.m_Log.Write("nsHotmailIMAP.js - list - iUpdateDate " + iUpdateDate);

            this.m_iListType = 1

            if (iUpdateDate < Date.now())
            {//donwload folder list
                this.m_HttpComms.setContentType("text/xml");
                this.m_HttpComms.setRequestMethod("PROPFIND");
                this.m_HttpComms.addData(HotmailFolderSchema);
                this.m_HttpComms.setURI(this.m_szFolderURI);
                var bResult = this.m_HttpComms.send(this.listOnloadHandler, this);
                if (!bResult) throw new Error("httpConnection returned false");
            }
            else
            {
                this.listResponse();
            }

            this.m_Log.Write("nsHotmailIMAP.js - list - END");
            return true;
        }
        catch(err)
        {
            this.m_Log.DebugDump("nsHotmailIMAP.js: list : Exception : "
                                      + err.name
                                      + ".\nError message: "
                                      + err.message + "\n"
                                      + err.lineNumber);

            this.serverComms(this.m_iTag +" BAD error\r\n");
            return false;
        }
    },



    listOnloadHandler : function (szResponse ,event , mainObject)
    {
        try
        {
            mainObject.m_Log.Write("nsHotmailIMAP.js - listOnloadHandler - START");

            var httpChannel = event.QueryInterface(Components.interfaces.nsIHttpChannel);

            //if this fails we've gone somewhere new
            mainObject.m_Log.Write("nsHotmail - listOnloadHandler - status :" +httpChannel.responseStatus );
            if (httpChannel.responseStatus != 200 && httpChannel.responseStatus != 207)
                throw new Error("return status " + httpChannel.responseStatus);

            //get root folders
            mainObject.m_Log.Write("nsHotmailIMAP.js - listOnloadHandler - get root folder list - START");

            var aszResponses = szResponse.match(patternHotmailResponse);
            mainObject.m_Log.Write("nsHotmailIMAP.js - listOnloadHandler - folders - \n" + aszResponses);

            var szResponse = "";

            for (i=0; i<aszResponses.length; i++)
            {
                mainObject.processFolder(aszResponses[i]);
            }

            if (mainObject.m_iListType == 1)
                mainObject.listResponse();
            else
                mainObject.subscribeResponse();

            mainObject.m_Log.Write("nsHotmailIMAP.js - listOnloadHandler - END");
        }
        catch(err)
        {
             mainObject.m_Log.DebugDump("nsHotmailIMAP.js: listOnloadHandler : Exception : "
                                              + err.name
                                              + ".\nError message: "
                                              + err.message + "\n"
                                              + err.lineNumber);

             mainObject.serverComms(mainObject.m_iTag +" BAD error\r\n");
        }
    },





    processFolder : function (szFolder)
    {
        try
        {
            this.m_Log.Write("nsHotmailIMAP.js - processFolder - START");
            this.m_Log.Write("nsHotmailIMAP.js - processFolder - szFolder " +szFolder);

            var szHref = szFolder.match(patternHotmailHref)[1];

            var szDisplayName = null;
            try
            {
                szDisplayName = szFolder.match(patternHotmailDisplayName)[1];
            }
            catch(e)
            {
                szDisplayName = szFolder.match(patternHotmailSpecial)[1];
            }

            var szHiererchy = null;
            if (szHref.search(/inbox/i)!=-1 || szHref.search(/active/i)!=-1  )
            {
                szHiererchy = "INBOX";
            }
            else if (szHref.search(/trash/i)!=-1)
            {
                szHiererchy = "INBOX.Trash"
            }
            else if (szDisplayName.search(/sentitems/i)!=-1)
            {
                szHiererchy = "INBOX.Sent"
            }
            else
            {//not inbox
                szHiererchy = "INBOX." + szDisplayName;
            }

            var iUnreadCount = parseInt(szFolder.match(patternHotmailUnreadCount)[1]);
            var iMsgCount =  parseInt(szFolder.match(patternHotmailMsgCount)[1]);

            this.m_oIMAPData.addFolder(this.m_szUserName, szHiererchy, szHref);
            this.m_Log.Write("nsHotmailIMAP.js - processFolder - END");
        }
        catch(err)
        {
            this.m_Log.DebugDump("nsHotmailIMAP.js: listResponse : Exception : "
                                  + err.name
                                  + ".\nError message: "
                                  + err.message + "\n"
                                  + err.lineNumber);
            return false;
        }
    },





    listResponse : function ()
    {
        try
        {
            this.m_Log.Write("nsHotmailIMAP.js - listResponse - START");

            var szResponse = "";
            var aszFolders = {value : null};
            var iCount = {value : null };
            this.m_oIMAPData.getHierarchies(this.m_szUserName, this.m_szFolderReference ,iCount, aszFolders );

            for (i=0; i<aszFolders.value.length; i++)
            {
                szResponse += "* LIST (\\Noinferiors \\HasNoChildren) \".\" \"" + aszFolders.value[i] +"\"\r\n";
            }

            if (aszFolders.value.length>0)
                szResponse += this.m_iTag + " OK LIST COMPLETE\r\n"
            else
                szResponse = this.m_iTag + " NO LIST COMPLETE\r\n"

            this.serverComms(szResponse);

            this.m_Log.Write("nsHotmailIMAP.js - listResponse - END");
        }
        catch(err)
        {
             this.m_Log.DebugDump("nsHotmailIMAP.js: listResponse : Exception : "
                                              + err.name
                                              + ".\nError message: "
                                              + err.message + "\n"
                                              + err.lineNumber);

             this.serverComms(this.m_iTag +" BAD error\r\n");
        }
    },





    select : function (szReference)
    {
        try
        {
            this.m_Log.Write("nsHotmailIMAP.js - select - START");
            this.m_Log.Write("nsHotmailIMAP.js - select - szReference " + szReference);

            if (this.m_szFolderURI == null) return false;

            this.m_szSelectFolder = szReference;

            var iUpdateDateFolder = this.m_oIMAPData.lastFolderListUpdate(this.m_szUserName);
            iUpdateDateFolder += this.m_iFolderBiff;
            this.m_Log.Write("nsHotmailIMAP.js - Select - iUpdateDateFolder " + iUpdateDateFolder);

            if (iUpdateDateFolder < Date.now())
            {
                this.m_Log.Write("nsHotmailIMAP.js - select - folders not found");
                this.m_iStage=0;
                this.m_Log.Write("nsHotmailIMAP.js - select - " + this.m_szFolderURI);
                this.m_HttpComms.setURI(this.m_szFolderURI);
                this.m_HttpComms.setRequestMethod("PROPFIND");
                this.m_HttpComms.setContentType("text/xml");
                this.m_HttpComms.addData(HotmailFolderSchema);
                var bResult = this.m_HttpComms.send(this.selectOnloadHandler, this);
                if (!bResult) throw new Error("httpConnection returned false");
            }
            else
            {
                this.m_Log.Write("nsHotmailIMAP.js - select - folder data current ");

                var iUpdateDateMSGList = this.m_oIMAPData.lastMsgListUpdate(this.m_szUserName, this.m_szSelectFolder);
                iUpdateDateMSGList += this.m_iMSGListBiff;
                this.m_Log.Write("nsHotmailIMAP.js - Select - iUpdateDateMSGList " + iUpdateDateMSGList);

                if (iUpdateDateMSGList < Date.now())
                {
                    var oHref = {value:null};
                    var oUID = {value:null};
                    var oMSGCount = {value:null};
                    var oUnreadCount = {value:null};
                    var oExpungeCount = {value:null};
                    if (!this.m_oIMAPData.getFolderDetails(this.m_szUserName, szReference,
                                                           oHref , oUID, oMSGCount, oUnreadCount, oExpungeCount))
                        throw new Error("Folder not found");

                    this.m_Log.Write("nsHotmailIMAP.js - select - " + oHref.value + " " + oUID.value + " "
                                                                    + oMSGCount.value + " " + oUnreadCount.value);

                    this.m_iStage = 1;
                    this.m_HttpComms.setURI(oHref.value);
                    this.m_HttpComms.setContentType("text/xml");
                    this.m_HttpComms.setRequestMethod("PROPFIND");
                    this.m_HttpComms.addData(HotmailMailSchema);
                    var bResult = this.m_HttpComms.send(this.selectOnloadHandler, this);
                    if (!bResult) throw new Error("httpConnection returned false");
                }
                else
                {
                    this.m_Log.Write("nsHotmailIMAP.js - select - msg data current ");
                    this.responseSelect();
                }
            }

            this.m_Log.Write("nsHotmailIMAP.js - select - END");
            return true;
        }
        catch(err)
        {
            this.m_Log.DebugDump("nsHotmailIMAP.js: select : Exception : "
                                      + err.name
                                      + ".\nError message: "
                                      + err.message  +"\n"
                                      + err.lineNumber);

            this.serverComms(this.m_iTag +" BAD error\r\n");
            return false;
        }
    },






    selectOnloadHandler : function (szResponse ,event , mainObject)
    {
        try
        {
            mainObject.m_Log.Write("nsHotmailIMAP.js - selectOnloadHandler - START");
            mainObject.m_Log.Write("nsHotmailIMAP.js - selectOnloadHandler : "+ mainObject.m_iStage);

            var httpChannel = event.QueryInterface(Components.interfaces.nsIHttpChannel);

            //if this fails we've gone somewhere new
            mainObject.m_Log.Write("nsHotmailIMAP - selectOnloadHandler - status :" +httpChannel.responseStatus );
            if (httpChannel.responseStatus != 200 && httpChannel.responseStatus != 207)
                throw new Error("return status " + httpChannel.responseStatus);


            switch( mainObject.m_iStage)
            {
                case 0:   //folder list
                    mainObject.m_Log.Write("nsHotmailIMAP.js - selectOnloadHandler - get folder list - START");

                    var aszResponses = szResponse.match(patternHotmailResponse);
                    mainObject.m_Log.Write("nsHotmailIMAP.js - selectOnloadHandler - folders - \n" + aszResponses);
                    for (i=0; i<aszResponses.length; i++)
                    {
                        mainObject.processFolder(aszResponses[i]);
                    }

                    var oHref = {value:null};
                    var oUID = {value:null};
                    var oMSGCount = {value:null};
                    var oUnreadCount = {value:null};
                    var oExpungeCount = {value:null};
                    var bFolder = mainObject.m_oIMAPData.getFolderDetails(mainObject.m_szUserName, mainObject.m_szSelectFolder,
                                                                          oHref , oUID, oMSGCount, oUnreadCount, oExpungeCount)
                    if (!bFolder) throw new Error("Folder not found");

                    this.m_Log.Write("nsHotmailIMAP.js - select - " + oHref.value + " " + oUID.value + " "
                                                                  + oMSGCount.value + " " + oUnreadCount.value);

                    mainObject.m_iStage = 1;
                    mainObject.m_HttpComms.setContentType("text/xml");
                    mainObject.m_HttpComms.setURI(oHref.value);
                    mainObject.m_HttpComms.setRequestMethod("PROPFIND");
                    mainObject.m_HttpComms.addData(HotmailMailSchema);
                    var bResult = mainObject.m_HttpComms.send(mainObject.selectOnloadHandler, mainObject);
                    if (!bResult) throw new Error("httpConnection returned false");

                    mainObject.m_Log.Write("nsHotmailIMAP.js - selectOnloadHandler - get folder list - END");
                break;

                case 1:  //message headers
                    mainObject.m_Log.Write("nsHotmailIMAP.js - selectOnloadHandler - get msg list - START");

                    //get uid list
                    var aszResponses = szResponse.match(patternHotmailResponse);
                    mainObject.m_Log.Write("nsHotmailIMAP.js - selectOnloadHandler - \n" + aszResponses);
                    delete mainObject.m_aRawData;
                    if (aszResponses)
                    {
                        mainObject.m_aRawData = aszResponses;
                    }
                    else
                        mainObject.m_aRawData = new Array();

                    var callback = {
                          notify: function(timer) { this.parent.processMSG(timer)}
                    };
                    callback.parent = mainObject;
                    mainObject.m_Timer.initWithCallback(callback,
                                                        mainObject.m_iTime,
                                                        Components.interfaces.nsITimer.TYPE_REPEATING_SLACK);

                    mainObject.m_Log.Write("nsHotmailIMAP.js - selectOnloadHandler - get msg list - END");
                break;
            }

            mainObject.m_Log.Write("nsHotmailIMAP.js - selectOnloadHandler - END");
        }
        catch(err)
        {
             mainObject.m_Log.DebugDump("nsHotmailIMAP.js: selectOnloadHandler : Exception : "
                                              + err.name
                                              + ".\nError message: "
                                              + err.message +"\n"
                                              + err.lineNumber);

             mainObject.serverComms(mainObject.m_iTag +" BAD error\r\n");
        }
    },



    responseSelect : function ()
    {
        try
        {
            this.m_Log.Write("nsHotmailIMAP.js - selectResponse - Start ");

            //get folder details
            var oHref = {value:null};
            var oUID = {value:null};
            var oMSGCount = {value:null};
            var oUnreadCount = {value:null};
            var oExpungeCount = {value:null};

            if (!this.m_oIMAPData.getFolderDetails(this.m_szUserName, this.m_szSelectFolder,
                                                   oHref , oUID, oMSGCount, oUnreadCount, oExpungeCount))
                throw new Error("folder not found");

            //send select ok message back to TB
            var szSelectResponse= "* " +  oMSGCount.value + " EXISTS\r\n";
            szSelectResponse+= "* " + oUnreadCount.value + " RECENT\r\n";
            szSelectResponse+= "* OK [UIDVALIDITY " + oUID.value + "] UIDs\r\n";
            szSelectResponse+= "* FLAGS (\\Seen \\Deleted)\r\n";
            szSelectResponse+= "* OK [PERMANENTFLAGS (\\Seen)] Limited\r\n";
            szSelectResponse+= this.m_iTag +" OK [READ-WRITE] SELECT COMPLETE\r\n";

            this.serverComms(szSelectResponse);

            this.m_Log.Write("nsHotmailIMAP.js - selectResponse - END");
        }
        catch(err)
        {
             this.m_Log.DebugDump("nsHotmailIMAP.js: selectResponse : Exception : "
                                              + err.name
                                              + ".\nError message: "
                                              + err.message +"\n"
                                              + err.lineNumber);

             this.serverComms(mainObject.m_iTag +" BAD error\r\n");
        }
    },






    processMSG : function (timer)
    {
        try
        {
            this.m_Log.Write("nsHotmailIMAP.js - processMSG - START");
            if (this.m_aRawData.length>0)
            {
                var Item = this.m_aRawData.shift();
                this.processMSGItem(Item);
            }
            else
            {
                this.m_Log.Write("nsHotmailIMAP.js - processMSG - all data handled");
                this.responseSelect();
                delete this.m_aRawData;
                this.m_aRawData = new Array();
                timer.cancel();
            }

            this.m_Log.Write("nsHotmailIMAP.js - processMSG - END");
        }
        catch(err)
        {
             this.m_Log.DebugDump("nsHotmailIMAP.js: processMSG : Exception : "
                                              + err.name
                                              + ".\nError message: "
                                              + err.message +"\n"
                                              + err.lineNumber);

             this.serverComms(mainObject.m_iTag +" BAD error\r\n");
        }
    },








    processMSGItem : function (Item)
    {
        this.m_Log.Write("nsHotmailIMAP.js - processMSG - START");

        this.m_Log.Write("nsHotmailIMAP.js - processMSG - handling data");

        var bRead = parseInt(Item.match(patternHotmailRead)[1]) ? true : false;
        this.m_Log.Write("nsHotmailIMAP.js - processMSG - bRead -" + bRead);

        var szMSGUri = Item.match(patternHotmailHref)[1]; //uri
        this.m_Log.Write("nsHotmailIMAP.js - processMSG - szMSGUri -" + szMSGUri);

        var szID = szMSGUri.match(patternHotmailMSGID);
        this.m_Log.Write("nsHotmailIMAP.js - processMSG - szID -" + szID);

        var iSize = parseInt(Item.match(patternHotmailSize)[1]);//size
        this.m_Log.Write("nsHotmailIMAP.js - processMSG - iSize -" + iSize);

        var szTO = "";
        try
        {
            szTO = rawData.match(patternHotmailTo)[1].match(/[\S]*@[\S]*/);
            if (!szTO) throw new Error("no sender");
        }
        catch(err)
        {
            try
            {
                szTO = Item.match(patternHotmailTo)[1];
            }
            catch(e)
            {
                szTO = this.m_szUserName;
            }
        }
        szTO = this.removeHTML(szTO);
        this.m_Log.Write("nsHotmailIMAP.js - processMSG - szTO -" + szTO);



        var szFrom = "";
        try
        {
            szFrom = rawData.match(patternHotmailFrom)[1].match(/[\S]*@[\S]*/);
            if (!szFrom) throw new Error("no sender");
        }
        catch(err)
        {
            try
            {
                szFrom = Item.match(patternHotmailFrom)[1];
            }
            catch(e)
            {
                szFrom = this.m_szUserName;
            }
        }
        szFrom = this.removeHTML(szFrom);   
        this.m_Log.Write("nsHotmailIMAP.js - processMSG - szFrom -" + szFrom);

        var szFromAddr= null;
        try
        {
            szFromAddr= Item.match(patternHotmailFromAddr)[1];
        }
        catch(err){}
        this.m_Log.Write("nsHotmailIMAP.js - processMSG - szFromAddr -" + szFromAddr);   
        if (szFromAddr) szFrom = "\""+szFrom + "\" <" + szFromAddr +">";

        var szSubject= "";
        try
        {
            szSubject= Item.match(patternHotmailSubject)[1];
        }
        catch(err){}
        szSubject = this.removeHTML(szSubject);
        this.m_Log.Write("nsHotmailIMAP.js - processMSG - szSubject -" + szSubject);

        var szDate = "";
        try
        {
            var aszDateTime = Item.match(patternHotmailDate);
            var aszDate = aszDateTime[1].split("-");
            var aszTime = aszDateTime[2].split(":");

            var date = new Date(Date.UTC(parseInt(aszDate[0],10),  //year
                             parseInt(aszDate[1],10)-1,  //month
                             parseInt(aszDate[2],10),  //day
                             parseInt(aszTime[0],10),  //hour
                             parseInt(aszTime[1],10),  //minute
                             parseInt(aszTime[2],10)));  //second
            szDate = date.toUTCString();
        }
        catch(err){}
        this.m_Log.Write("nsHotmailIMAP.js - processMSG - szDate -" + szDate);

        this.m_oIMAPData.addMSG(this.m_szUserName, this.m_szSelectFolder, szMSGUri, szID , bRead, szTO, szFrom, szSubject, szDate, iSize);
        this.m_Log.Write("nsHotmailIMAP.js - processMSG - END");
    },


    removeHTML : function (szRaw)
    {
        this.m_Log.Write("nsHotMail.js: removeHTML");
        var szMsg = szRaw.replace(/&lt;/g,"<");
        szMsg = szMsg.replace(/&gt;/g,">");
        szMsg = szMsg.replace(/&quot;/g, "\"");
        szMsg = szMsg.replace(/&amp;/g, "&");
        szMsg = szMsg.replace(/&nbsp;/g, " ");
        szMsg = szMsg.replace(/&apos;/g, "\'");
        return szMsg;
    },






    noop : function ()
    {
        try
        {
            this.m_Log.Write("nsHotmailIMAP.js - noop - START");

            var iUpdateDateMSGList = this.m_oIMAPData.lastMsgListUpdate(this.m_szUserName, this.m_szSelectFolder);
            iUpdateDateMSGList += this.m_iMSGListBiff;
            this.m_Log.Write("nsHotmailIMAP.js - noop - iUpdateDateFolder " + iUpdateDateMSGList);

            if (iUpdateDateMSGList < Date.now())
            {
                var oHref = {value:null};
                var oUID = {value:null};
                var oMSGCount = {value:null};
                var oUnreadCount = {value:null};
                var oExpungeCount = {value:null};
                if (!this.m_oIMAPData.getFolderDetails(this.m_szUserName, this.m_szSelectFolder ,
                                                       oHref , oUID, oMSGCount, oUnreadCount,oExpungeCount))
                    throw new Error("Folder not found");

                this.m_Log.Write("nsHotmailIMAP.js - noop - " + oHref.value + " " + oUID.value + " " + oMSGCount.value + " " + oUnreadCount.value);

                this.m_HttpComms.setURI(oHref.value);
                this.m_HttpComms.setContentType("text/xml");
                this.m_HttpComms.setRequestMethod("PROPFIND");
                this.m_HttpComms.addData(HotmailMailSchema);
                var bResult = this.m_HttpComms.send(this.noopOnloadHandler, this);
                if (!bResult) throw new Error("httpConnection returned false");
            }
            else
            {
                this.responseNOOP();
            }

            this.m_Log.Write("nsHotmailIMAP.js - noop - END");
        }
        catch(err)
        {
            this.m_Log.DebugDump("nsHotmailIMAP.js: noop : Exception : "
                                              + err.name
                                              + ".\nError message: "
                                              + err.message + "\n"
                                              + err.lineNumber);

            this.serverComms(this.m_iTag +" BAD error\r\n");
            return false;
        }
    },







    noopOnloadHandler : function (szResponse ,event , mainObject)
    {
        try
        {
            mainObject.m_Log.Write("nsHotmailIMAP.js - noopOnloadHandler - START");

            var httpChannel = event.QueryInterface(Components.interfaces.nsIHttpChannel);

            //if this fails we've gone somewhere new
            mainObject.m_Log.Write("nsHotmailIMAP - noopOnloadHandler - status :" +httpChannel.responseStatus );
            if (httpChannel.responseStatus != 200 && httpChannel.responseStatus != 207)
                throw new Error("return status " + httpChannel.responseStatus);

            //get uid list
            var aszResponses = szResponse.match(patternHotmailResponse);
            mainObject.m_Log.Write("nsHotmailIMAP.js - noopOnloadHandler - \n" + aszResponses);
            delete mainObject.m_aRawData;
            if (aszResponses)
            {
                mainObject.m_aRawData = aszResponses;
            }
            else
                mainObject.m_aRawData = new Array();

            var callback = {
                  notify: function(timer) { this.parent.processNOOP(timer)}
            };
            callback.parent = mainObject;
            mainObject.m_Timer.initWithCallback(callback,
                                                mainObject.m_iTime,
                                                Components.interfaces.nsITimer.TYPE_REPEATING_SLACK);

            mainObject.m_Log.Write("nsHotmailIMAP.js - noopOnloadHandler - END");
        }
        catch(err)
        {
             mainObject.m_Log.DebugDump("nsHotmailIMAP.js: noopOnloadHandler : Exception : "
                                              + err.name
                                              + ".\nError message: "
                                              + err.message +"\n"
                                              + err.lineNumber);

             mainObject.serverComms(mainObject.m_iTag +" BAD error\r\n");
        }
    },






    processNOOP : function(timer)
    {
        try
        {
            this.m_Log.Write("nsHotmailIMAP.js - processNOOP - START");

            var Item = null;
            if (this.m_aRawData.length>0)
                Item = this.m_aRawData.shift();
            else
            {
                delete this.m_aRawData;
                this.m_aRawData = new Array();
                timer.cancel();
            }

            if (Item)
                this.processMSGItem(Item);
            else
            {
                this.m_Log.Write("nsHotmailIMAP.js - processNOOP - all data handled");
                this.responseNOOP();
            }

            this.m_Log.Write("nsHotmailIMAP.js - processNOOP - END");
        }
        catch(err)
        {
            this.m_Timer.cancel();
            this.m_Log.DebugDump("nsHotmailIMAP.js: processNOOP : Exception : "
                                              + err.name
                                              + ".\nError message: "
                                              + err.message+ "\n"
                                              + err.lineNumber);

            this.serverComms(this.m_iTag +" BAD error\r\n");
        }
    },




    responseNOOP : function ()
    {
        try
        {
            this.m_Log.Write("nsHotmailIMAP.js - responseNOOP - Start ");

            //get folder details
            var oHref = {value:null};
            var oUID = {value:null};
            var oMSGCount = {value:null};
            var oUnreadCount = {value:null};
            var oExpungeCount = {value:null};

            if (!this.m_oIMAPData.getFolderDetails(this.m_szUserName, this.m_szSelectFolder ,
                                                   oHref , oUID, oMSGCount, oUnreadCount, oExpungeCount))
                throw new Error("folder not found");

            //send select ok message back to TB
            var szSelectResponse= "* " +  oMSGCount.value + " EXISTS\r\n";
            szSelectResponse+= "* " + oUnreadCount.value + " RECENT\r\n";
          //  szSelectResponse+= "* " + oExpungeCount.value + " EXPUNGE\r\n";
            szSelectResponse+= this.m_iTag +" OK NOOP COMPLETE\r\n";

            this.serverComms(szSelectResponse);

            this.m_Log.Write("nsHotmailIMAP.js - responseNOOP - END");
        }
        catch(err)
        {
             this.m_Log.DebugDump("nsHotmailIMAP.js: responseNOOP : Exception : "
                                              + err.name
                                              + ".\nError message: "
                                              + err.message +"\n"
                                              + err.lineNumber);

             this.serverComms(mainObject.m_iTag +" BAD error\r\n");
        }
    },












    fetch : function (szRange, szFlag)
    {
        try
        {
            this.m_Log.Write("nsHotmailIMAP.js - fetch - START");
            this.m_Log.Write("nsHotmailIMAP.js - fetch - Range " + szRange + " Flags "+ szFlag);

            var iUpdateDate = this.m_oIMAPData.lastMsgListUpdate(this.m_szUserName, this.m_szSelectFolder);
            iUpdateDate += this.m_iMSGListBiff;
            this.m_Log.Write("nsHotmailIMAP.js - fetch - iUpdateDate " + iUpdateDate);

            if (iUpdateDate < Date.now())
            {
                this.m_Log.Write("nsHotmailIMAP.js - fetch - Check for new data");
                this.m_szRange = szRange;
                this.m_szFlag = szFlag;

                var oHref = {value:null};
                var oUID = {value:null};
                var oMSGCount = {value:null};
                var oUnreadCount = {value:null};
                var oExpungeCount = {value:null};
                if (!this.m_oIMAPData.getFolderDetails(this.m_szUserName, this.m_szSelectFolder,
                                                       oHref , oUID, oMSGCount, oUnreadCount, oExpungeCount))
                    throw new Error("Folder not found");

                this.m_Log.Write("nsHotmailIMAP.js - fetch - " + oHref.value + " " + oUID.value + " " + oMSGCount.value + " " + oUnreadCount.value);

                this.m_HttpComms.setURI(oHref.value);
                this.m_HttpComms.setContentType("text/xml");
                this.m_HttpComms.setRequestMethod("PROPFIND");
                this.m_HttpComms.addData(HotmailMailSchema);
                var bResult = this.m_HttpComms.send(this.fetchOnloadHandler, this);
                if (!bResult) throw new Error("httpConnection returned false");
            }
            else
            {
                this.m_Log.Write("nsHotmailIMAP.js - fetch - Use stored data");

                delete this.m_aRawData;
                this.m_aRawData = this.range(szRange);
                this.m_Log.Write("nsHotmailIMAP.js - fetch - Range " +this.m_aRawData);

                if (szFlag.search(/Header/i)!=-1)
                {
                    this.m_Log.Write("nsHotmailIMAP.js - fetch - headers ");
                    var callback = {
                          notify: function(timer) { this.parent.processHeaders(timer)}
                    };
                    callback.parent = this;
                    this.m_Timer.initWithCallback(callback,
                                                  this.m_iTime,
                                                  Components.interfaces.nsITimer.TYPE_REPEATING_SLACK);
                }
                else if (szFlag.search(/Body/i)!=-1)
                {
                    this.m_Log.Write("nsHotmailIMAP.js - fetch - body ");
                    this.fetchBody();
                }
                else  //get message ids
                {
                    this.m_Log.Write("nsHotmailIMAP.js - fetch - ids ");

                    var callback = {
                          notify: function(timer) { this.parent.processIDs(timer)}
                    };
                    callback.parent = this;
                    this.m_Timer.initWithCallback(callback,
                                                  this.m_iTime,
                                                  Components.interfaces.nsITimer.TYPE_REPEATING_SLACK);
                }
            }

            this.m_Log.Write("nsHotmailIMAP.js - fetch - END");
            return true;
        }
        catch(err)
        {
             this.m_Log.DebugDump("nsHotmailIMAP.js: fetch : Exception : "
                                              + err.name
                                              + ".\nError message: "
                                              + err.message+ "\n"
                                              + err.lineNumber);

             this.serverComms(this.m_iTag +" BAD error\r\n");
             return false;
        }
    },





    fetchOnloadHandler : function (szResponse ,event , mainObject)
    {
        try
        {
            mainObject.m_Log.Write("nsHotmailIMAP.js - fetchOnloadHandler - START");

            var httpChannel = event.QueryInterface(Components.interfaces.nsIHttpChannel);

            //if this fails we've gone somewhere new
            mainObject.m_Log.Write("nsHotmail - fetchOnloadHandler - status :" +httpChannel.responseStatus );
            if (httpChannel.responseStatus != 200 && httpChannel.responseStatus != 207)
                throw new Error("return status " + httpChannel.responseStatus);

            //get uid list
            var aszResponses = szResponse.match(patternHotmailResponse);
            mainObject.m_Log.Write("nsHotmailIMAP.js - fetchOnloadHandler - \n" + aszResponses);
            delete mainObject.m_aRawData;
            if (aszResponses)
            {
                mainObject.m_aRawData = aszResponses;
            }
            else
                mainObject.m_aRawData = new Array();

            var callback = {
                  notify: function(timer) { this.parent.processFetch(timer)}
            };
            callback.parent = mainObject;
            mainObject.m_Log.Write("nsHotmailIMAP.js - fetchOnloadHandler - starting delay");
            mainObject.m_Timer.initWithCallback(callback,
                                                mainObject.m_iTime,
                                                Components.interfaces.nsITimer.TYPE_REPEATING_SLACK);

            mainObject.m_Log.Write("nsHotmailIMAP.js - fetchOnloadHandler - END");
        }
        catch(err)
        {
             mainObject.m_Log.DebugDump("nsHotmailIMAP.js: fetchOnloadHandler : Exception : "
                                              + err.name
                                              + ".\nError message: "
                                              + err.message +"\n"
                                              + err.lineNumber);

             mainObject.serverComms(mainObject.m_iTag +" BAD error\r\n");
        }
    },





    processFetch : function(timer)
    {
        try
        {
            this.m_Log.Write("nsHotmailIMAP.js - processFetch - START");

            if (this.m_aRawData.length>0)
            {
              var iCount = 0;
              do 
                {
                  iCount++;
                var Item = this.m_aRawData.shift();
                this.processMSGItem(Item);
                } while (iCount < this.m_iProcessAmount & this.m_aRawData.length>0)
            }
            else
            {
                this.m_Log.Write("nsHotmailIMAP.js - processFetch - all data handled");
                timer.cancel();
                delete this.m_aRawData;
                this.m_aRawData = this.range(this.m_szRange);
                this.m_Log.Write("nsHotmailIMAP.js - notify - Range " +this.m_aRawData);

                if (this.m_szFlag.search(/Header/i)!=-1)
                {
                    this.m_Log.Write("nsHotmailIMAP.js - processFetch - headers ");
                    var callback = {
                          notify: function(timer) { this.parent.processHeaders(timer)}
                    };
                    callback.parent = this;
                    this.m_Timer.initWithCallback(callback,
                                                  this.m_iTime,
                                                  Components.interfaces.nsITimer.TYPE_REPEATING_SLACK);
                }
                else if (this.m_szFlag.search(/Body/i)!=-1)
                {
                    this.m_Log.Write("nsHotmailIMAP.js - processFetch - body ");
                    this.fetchBody();
                }
                else  //get message ids
                {
                    this.m_Log.Write("nsHotmailIMAP.js - processFetch - ids ");

                    var callback = {
                          notify: function(timer) { this.parent.processIDs(timer)}
                    };
                    callback.parent = this;
                    this.m_Timer.initWithCallback(callback,
                                                  this.m_iTime,
                                                  Components.interfaces.nsITimer.TYPE_REPEATING_SLACK);
                }
            }
            this.m_Log.Write("nsHotmailIMAP.js - processFetch - END");
        }
        catch(err)
        {
             this.m_Log.DebugDump("nsHotmailIMAP.js: processFetch : Exception : "
                                              + err.name
                                              + ".\nError message: "
                                              + err.message +"\n"
                                              + err.lineNumber);
             this.m_Timer.cancel();
             this.serverComms(this.m_iTag +" BAD error\r\n");
        }
    },




    processIDs : function (timer)
    {
        try
        {
            this.m_Log.Write("nsHotmailIMAP.js - processIDs - START");

            var Item = null;
            if (this.m_aRawData.length>0)
            {
                Item = this.m_aRawData.shift();
                this.m_Log.Write("nsHotmailIMAP.js - processIDs - Item " + Item);
            }
            else
            {
                delete this.m_aRawData;
                this.m_aRawData = new Array();
                timer.cancel();
            }

            if (Item)
            {
                //get messages ID
                var oHref = {value:null};
                var oRead = {value:null};
                var oDelete = {value:null};
                var oSeqNum = {value :null};
                var bMSG = this.m_oIMAPData.getMSGStatus(this.m_szUserName, this.m_szSelectFolder, Item, oHref, oRead, oDelete ,oSeqNum);

                if (bMSG)
                {
                    var szResponse = "* "+  oSeqNum.value + " FETCH (FLAGS (";
                    szResponse +=  oRead.value?"\\Seen":"\\Recent" ; //flags
                    szResponse +=  oDelete.value?" \\Deleted":"";
                    szResponse += ") UID " + Item + ")\r\n";
                    this.serverComms(szResponse);
                }
            }
            else
            {
                this.m_Log.Write("nsHotmailIMAP.js - processIDs - all data handled");
                this.serverComms(this.m_iTag +" UID FETCH complete\r\n");
            }

            this.m_Log.Write("nsHotmailIMAP.js - processIDs - END");
            return true;
        }
        catch(err)
        {
             this.m_Log.DebugDump("nsHotmailIMAP.js: fetchIDs : Exception : "
                                              + err.name
                                              + ".\nError message: "
                                              + err.message +"\n"
                                              + err.lineNumber);
             this.m_Timer.cancel();
             this.serverComms(this.m_iTag +" BAD error\r\n");
        }
    },





    processHeaders : function (timer)
    {
        try
        {
            this.m_Log.Write("nsHotmailIMAP.js - processHeaders - START");

            var Item = null;
            if (this.m_aRawData.length>0)
                Item = this.m_aRawData.shift();
            else
            {
                delete this.m_aRawData;
                this.m_aRawData = new Array();
                timer.cancel();
            }

            if (Item)
            {
                var oHref = {value:null};
                var oRead = {value:null};
                var oDelete = {value:null};
                var oTo = {value:null};
                var oFrom = {value:null};
                var oSubject = {value:null};
                var oDate = {value:null};
                var oSize = {value:null};
                var oSeqNum = {value : null};
                var bMSG = this.m_oIMAPData.getMSGHeaders(this.m_szUserName, this.m_szSelectFolder, Item,
                                                          oHref, oRead, oDelete, oTo, oFrom, oSubject, oDate, oSize, oSeqNum);

                if (bMSG)
                {
                    var szTemp = "To: "+ oTo.value + "\r\n";
                    szTemp += "From: "+  oFrom.value + "\r\n";
                    szTemp += "Subject: "+ oSubject.value + "\r\n";
                    szTemp += "Date: "+ oDate.value + "\r\n\r\n";

                    var szResponse = "* " + oSeqNum.value;
                    szResponse += " FETCH (UID "+ Item //id
                    szResponse += " RFC822.SIZE " +oSize.value; //size
                    szResponse += " FLAGS ("   ; //flags
                    szResponse += (oRead.value?"\\Seen":"\\Recent");
                    szResponse += ") BODY[HEADER] ";
                    szResponse += "{" + szTemp.length + "}\r\n";
                    szResponse += szTemp + ")\r\n";
                    this.serverComms(szResponse);
                }
            }
            else
            {
                this.m_Log.Write("nsHotmailIMAP.js - processHeaders - all data handled");
                this.serverComms(this.m_iTag +" OK UID FETCH complete\r\n");
            }

            this.m_Log.Write("nsHotmailIMAP.js - processHeaders - END");
            return true;
        }
        catch(err)
        {
             this.m_Log.DebugDump("nsHotmailIMAP.js: processHeaders : Exception : "
                                              + err.name
                                              + ".\nError message: "
                                              + err.message +"\n"
                                              + err.lineNumber);
             this.m_Timer.cancel();
             this.serverComms(this.m_iTag +" BAD error\r\n");
        }
    },






    fetchBody : function ()
    {
        try
        {
            this.m_Log.Write("nsHotmailIMAP.js - fetchBody - START");

            if (this.m_aRawData.length>0)
            {
                this.m_iUID = this.m_aRawData.shift();
                var oHref = {value:null};
                var bMSG = this.m_oIMAPData.getMSGHref(this.m_szUserName, this.m_szSelectFolder, this.m_iUID, oHref);
                this.m_Log.Write("nsHotmailIMAP.js - fetchBody - URI " +oHref.value );

                this.m_iStage = 0;
                this.m_HttpComms.setURI(oHref.value);
                this.m_HttpComms.setRequestMethod("GET");
                var bResult = this.m_HttpComms.send(this.fetchBodyOnloadHandler, this);

                if (!bResult) throw new Error("httpConnection returned false");
            }
            else
                throw new Error("NO IDs");

            this.m_Log.Write("nsHotmailIMAP.js - fetchBody - END");
            return true;
        }
        catch(err)
        {
            this.m_Log.DebugDump("nsHotmailIMAP.js: fetchBody : Exception : "
                                              + err.name
                                              + ".\nError message: "
                                              + err.message + "\n"
                                              + err.lineNumber);

            this.serverComms(this.m_iTag +" BAD error\r\n");
            return false;
        }
    },






    fetchBodyOnloadHandler : function (szResponse ,event , mainObject)
    {
        try
        {
            mainObject.m_Log.Write("nsHotmailIMAP.js - fetchBodyOnloadHandler - START");
            mainObject.m_Log.Write("nsHotmailIMAP.js - fetchBodyOnloadHandler : " + mainObject.m_iStage);

            var httpChannel = event.QueryInterface(Components.interfaces.nsIHttpChannel);

            //if this fails we've gone somewhere new
            mainObject.m_Log.Write("nsHotmailIMAP - fetchBodyOnloadHandler - status :" +httpChannel.responseStatus );
            if (httpChannel.responseStatus != 200 && httpChannel.responseStatus != 207)
                throw new Error("return status " + httpChannel.responseStatus);

            switch(mainObject.m_iStage)
            {
                case 0: //download message           
                    mainObject.m_szMSG = "* " + 1 +" FETCH (UID " + mainObject.m_iUID ; //id
                    mainObject.m_szMSG += " RFC822.SIZE " + szResponse.length ; //size
                    mainObject.m_szMSG += " BODY[] ";
                    mainObject.m_szMSG += "{" + szResponse.length + "}\r\n";
                    mainObject.m_szMSG += szResponse + ")\r\n";
//                    mainObject.m_szMSG += "* FETCH (FLAGS (\\Seen \\Recent))\r\n" ; //flags
                    mainObject.m_szMSG += mainObject.m_iTag +" OK UID FETCH complete\r\n";
                    
					var szUri = httpChannel.URI.spec;
                    mainObject.m_Log.Write("nsHotmailIMAP - loginOnloadHandler - szUri - " + szUri);

	                //mark email as read
	                mainObject.m_HttpComms.setContentType("text/xml");
	                mainObject.m_HttpComms.setURI(szUri);
	                mainObject.m_HttpComms.setRequestMethod("PROPPATCH");
	                mainObject.m_HttpComms.addData(HotmailReadSchema);
	                var bResult = mainObject.m_HttpComms.send(mainObject.fetchBodyOnloadHandler, mainObject);
	                mainObject.m_iStage++;
                break;
                
                case 1: //marked as read
                    mainObject.serverComms(mainObject.m_szMSG);
                    delete mainObject.m_szMSG;
                    mainObject.m_szMSG = null;
                    mainObject.m_oIMAPData.setMSGSeenFlag(mainObject.m_szUserName, 
                                                          mainObject.m_szSelectFolder, 
                                                          mainObject.m_iUID, true);
                break;
            }
            mainObject.m_Log.Write("nsHotmailIMAP.js - fetchBodyOnloadHandler - END");
            return true;
        }
        catch(err)
        {
            mainObject.m_Log.DebugDump("nsHotmailIMAP.js: fetchBodyOnloadHandler : Exception : "
                                              + err.name
                                              + ".\nError message: "
                                              + err.message + "\n"
                                              + err.lineNumber);

            mainObject.serverComms(mainObject.m_iTag +" BAD error\r\n");
            return false;
        }
    },








    store : function (szRange, szData, szDataItem)
    {
        try
        {
            this.m_Log.Write("nsHotmailIMAP.js - store - START");
            this.m_Log.Write("nsHotmailIMAP.js - store - range " + szRange + " szData "+ szData + " Item " +szDataItem );

            //construct MSG range
            delete this.m_aRawData;
            this.m_aRawData = this.range(szRange);
            this.m_Log.Write("nsHotmailIMAP.js - store - Range " +this.m_aRawData);

            //check we have got something
            if (this.m_aRawData.length== 0)
            {
                this.m_Log.Write("nsHotmailIMAP.js - store - no messages");
                this.serverComms(this.m_iTag +" NO STORE no messages\r\n");
                return false;
            }

            if (szDataItem.search(/seen/i)!=-1)
            {
                this.m_Log.Write("nsHotmailIMAP.js - store - seen/Unseen");

                this.m_iStage=0;

                var iUID = this.m_aRawData.shift();
                this.m_iUID = iUID;

                //get messages ID
                var oHref = {value:null};
                var bMSG = this.m_oIMAPData.getMSGHref(this.m_szUserName, this.m_szSelectFolder, iUID, oHref);

                //propattach
                this.m_HttpComms.setURI(oHref.value);
                this.m_HttpComms.setContentType("text/xml");
                this.m_HttpComms.setRequestMethod("PROPPATCH");

                if (szData.search(/-Flags/i)!=-1)
                {
                    this.m_Log.Write("nsHotmailIMAP.js - store - Unseen");
                    this.m_bStoreStatus = false;
                    this.m_HttpComms.addData(HotmailUnReadSchema);
                }
                else
                {
                    this.m_Log.Write("nsHotmailIMAP.js - store - seen");
                    this.m_bStoreStatus = true;
                    this.m_HttpComms.addData(HotmailReadSchema);
                }

                if (szDataItem.search(/delete/i)!=-1)
                {
                    this.m_Log.Write("nsHotmailIMAP.js - store - delete");
                    this.m_bStoreDelete = true;
                }

                var bResult = this.m_HttpComms.send(this.storeOnloadHandler, this);
                if (!bResult) throw new Error("httpConnection returned false");
                this.m_Log.Write("nsHotmailIMAP.js - store - seen");
            }
            else if (szDataItem.search(/delete/i)!=-1)
            {
                this.m_Log.Write("nsHotmailIMAP.js - store - Delete");
                var callback = {
                      notify: function(timer) { this.parent.processDelete(timer)}
                };
                callback.parent = this;
                this.m_Timer.initWithCallback(callback,
                                              this.m_iTime,
                                              Components.interfaces.nsITimer.TYPE_REPEATING_SLACK);
            }
            else
            {
                this.serverComms(this.m_iTag +" NO STORE cant do that\r\n");
            }


            this.m_Log.Write("nsHotmailIMAP.js - store - END");
            return true;
        }
        catch(err)
        {
             this.m_Log.DebugDump("nsHotmailIMAP.js: store : Exception : "
                                              + err.name
                                              + ".\nError message: "
                                              + err.message + "\n"
                                              + err.lineNumber);

            this.serverComms(this.m_iTag +" BAD error\r\n");
            return false;
        }
    },





    storeOnloadHandler : function (szResponse ,event , mainObject)
    {
        try
        {
            mainObject.m_Log.Write("nsHotmailIMAP.js - storeOnloadHandler - START");
            mainObject.m_Log.Write("nsHotmailIMAP.js - storeOnloadHandler : " + mainObject.m_iStage);

            //if this fails we've gone somewhere new
            var httpChannel = event.QueryInterface(Components.interfaces.nsIHttpChannel);
            mainObject.m_Log.Write("nsHotmailIMAP - storeOnloadHandler - status :" +httpChannel.responseStatus );
            if (httpChannel.responseStatus != 200 && httpChannel.responseStatus != 201 )
                throw new Error("return status " + httpChannel.responseStatus);

            //get messages ID
            var oHref = {value:null};
            var oRead = {value:null};
            var oDelete = {value:null};
            var oSeqNum = {value:null};
            mainObject.m_Log.Write("nsHotmailIMAP.js - storeOnloadHandler : " + mainObject.m_bStoreStatus);
            mainObject.m_oIMAPData.setMSGSeenFlag(mainObject.m_szUserName, mainObject.m_szSelectFolder,
                                                  mainObject.m_iUID, mainObject.m_bStoreStatus);
            var bMSG = mainObject.m_oIMAPData.getMSGStatus(mainObject.m_szUserName, mainObject.m_szSelectFolder, mainObject.m_iUID,
                                                           oHref, oRead, oDelete, oSeqNum);


            if (mainObject.m_bStoreDelete)
            {
                mainObject.m_Log.Write("nsHotmailIMAP.js - storeOnloadHandler - marks as deleted");
                mainObject.storeDelete( mainObject.m_iUID);
            }
            else
            {
                var szResponse = "* " + oSeqNum.value +" FETCH (UID " + mainObject.m_iUID ; //id
                szResponse+= " FLAGS (";
                szResponse+= oRead.value? "\\Seen ":"";
                szResponse+= oDelete.value? "\\Deleted ":"";
                szResponse+= "))\r\n";
                mainObject.serverComms(szResponse);
            }

            if (mainObject.m_aRawData.length>0)
            {
                mainObject.m_Log.Write("nsHotmailIMAP.js - storeOnloadHandler - next - ");

                var iUID = mainObject.m_aRawData.shift();
                var bMSG = mainObject.m_oIMAPData.getMSGHref(mainObject.m_szUserName, mainObject.m_szSelectFolder, iUID, oHref);
                mainObject.m_iUID = iUID;

                mainObject.m_HttpComms.setContentType("text/xml");
                mainObject.m_HttpComms.setURI(oHref.value);
                mainObject.m_HttpComms.setRequestMethod("PROPPATCH");

                if (mainObject.m_bStoreStatus)
                    mainObject.m_HttpComms.addData(HotmailReadSchema)
                else
                    mainObject.m_HttpComms.addData(HotmailUnReadSchema);

                var bResult = mainObject.m_HttpComms.send(mainObject.storeOnloadHandler, mainObject);
                if (!bResult) throw new Error("httpConnection returned false");
            }
            else
            {
                mainObject.m_Log.Write("nsHotmailIMAP.js - storeOnloadHandler - done - ");
                var szResponse = mainObject.m_iTag +" OK FETCH complete\r\n"
                mainObject.serverComms(szResponse);
            }

            mainObject.m_Log.Write("nsHotmailIMAP.js - storeOnloadHandler - END");
            return true;
        }
        catch(err)
        {
            mainObject.m_Log.DebugDump("nsHotmailIMAP.js: storeOnloadHandler : Exception : "
                                              + err.name
                                              + ".\nError message: "
                                              + err.message + "\n"
                                              + err.lineNumber);

            mainObject.serverComms(mainObject.m_iTag +" BAD error\r\n");
            return false;
        }
    },




    processDelete : function (timer)
    {
        try
        {
            this.m_Log.Write("nsHotmailIMAP.js - processDelete - START ");

            var Item = null;
            if (this.m_aRawData.length>0)
                Item = this.m_aRawData.shift();
            else
            {
                delete this.m_aRawData;
                this.m_aRawData = new Array();
                timer.cancel();
            }

            this.storeDelete(Item);
        }
        catch(err)
        {
             this.m_Log.DebugDump("nsHotmailIMAP.js: processDelete : Exception : "
                                  + err.name
                                  + ".\nError message: "
                                  + err.message +"\n"
                                  + err.lineNumber);

             this.serverComms(this.m_iTag +" BAD error\r\n");
        }
    },




    storeDelete : function (Item)
    {
        try
        {
            this.m_Log.Write("nsHotmailIMAP.js - processDelete - START " + Item);

            if (Item)
            {
                //mark as deleted
                this.m_oIMAPData.setMSGDeleteFlag(this.m_szUserName, this.m_szSelectFolder, Item, true);

                //get messages ID
                var oHref = {value:null};
                var oRead = {value:null};
                var oDelete = {value:null};
                var oSeqNum = {value:null};
                var bMSG = this.m_oIMAPData.getMSGStatus(this.m_szUserName, this.m_szSelectFolder, Item,
                                                         oHref, oRead, oDelete, oSeqNum);

                if (bMSG)
                {
                    var szResponse = "* " + oSeqNum.value +" FETCH (UID " + Item ; //id
                    szResponse += " FLAGS (";
                    szResponse+=  oRead.value? "\\Seen ":"\\Unseen ";
                    szResponse+=  oDelete.value? "\\Deleted" :"";
                    szResponse+= "))\r\n";
                    this.serverComms(szResponse);
                }
            }
            else
            {
                this.m_Log.Write("nsHotmailIMAP.js - processDelete - all data handled");
                this.serverComms(this.m_iTag +" OK FETCH complete\r\n");
            }

            this.m_Log.Write("nsHotmailIMAP.js - processDelete - END");
            return true;
        }
        catch(err)
        {
             this.m_Log.DebugDump("nsHotmailIMAP.js: processDelete : Exception : "
                                              + err.name
                                              + ".\nError message: "
                                              + err.message +"\n"
                                              + err.lineNumber);

             this.serverComms(this.m_iTag +" BAD error\r\n");
        }
    },





    copy : function (szRange, szDestination)
    {
        try
        {
            this.m_Log.Write("nsHotmailIMAP.js - copy - START");
            this.m_Log.Write("nsHotmailIMAP.js - copy - range " + szRange + " destination " + szDestination);

            //check destination
            var oHref = {value:null};
            var oUID = {value:null};
            var oMSGCount = {value:null};
            var oUnreadCount = {value:null};
            var oExpungeCount = {value:null};
            var bDestFolder = this.m_oIMAPData.getFolderDetails(this.m_szUserName, szDestination,
                                                                oHref, oUID, oMSGCount, oUnreadCount, oExpungeCount);

            if (!bDestFolder) //destination not found
            {
                this.m_Log.Write("nsHotmailIMAP.js - copy - destination folder doesn't exist");
                this.serverComms(this.m_iTag +" NO [TRYCREATE] error\r\n");
                return false;
            }
            this.m_copyDest = oHref.value;

            this.m_Log.Write("nsHotmailIMAP.js - copy - destination  folder" + this.m_copyDest);

            //construct MSG range
            delete this.m_aRawData;
            this.m_aRawData = this.range(szRange);
            this.m_Log.Write("nsHotmailIMAP.js - copy - Range " +this.m_aRawData);

            if (this.m_aRawData.length== 0)
            {
                this.m_Log.Write("nsHotmailIMAP.js - copy - no messages to move");
                this.serverComms(this.m_iTag +" NO copy no messages\r\n");
                return false;
            }

            //get first item
            var Item = this.m_aRawData.shift();
            this.m_iUID = Item;
            this.m_szDestinationFolder = szDestination;

            //get messages ID
            var oHref = {value:null};
            var bMSG = this.m_oIMAPData.getMSGHref(this.m_szUserName, this.m_szSelectFolder, Item, oHref);

            if (!bMSG)
            {
                this.m_Log.Write("nsHotmailIMAP.js - copy - message not found");
                this.serverComms(this.m_iTag +" NO copy no messages\r\n");
                return false;
            }


            var szMSGID = oHref.value.match(/[^\/]+$/);
            this.m_Log.Write("nsHotmailIMAP.js - copy - destination URI" + this.m_copyDest + szMSGID);

            this.m_HttpComms.setURI(oHref.value);
            this.m_HttpComms.setRequestMethod("MOVE");
            this.m_HttpComms.addRequestHeader("Destination", this.m_copyDest + szMSGID , false);
            var bResult = this.m_HttpComms.send(this.copyOnloadHandler, this);
            if (!bResult) throw new Error("httpConnection returned false");


            this.m_Log.Write("nsHotmailIMAP.js - copy - END");
            return true;
        }
        catch(err)
        {
            this.m_Log.DebugDump("nsHotmailIMAP.js: copy : Exception : "
                                              + err.name
                                              + ".\nError message: "
                                              + err.message + "\n"
                                              + err.lineNumber);

            this.serverComms(this.m_iTag +" BAD error\r\n");
            return false;
        }
    },




    copyOnloadHandler : function (szResponse ,event , mainObject)
    {
        try
        {
            mainObject.m_Log.Write("nsHotmailIMAP.js - copyOnloadHandler - START");
            mainObject.m_Log.Write("nsHotmailIMAP.js - copyOnloadHandler : " + mainObject.m_iStage);

            var httpChannel = event.QueryInterface(Components.interfaces.nsIHttpChannel);

            //if this fails we've gone somewhere new
            mainObject.m_Log.Write("nsHotmailIMAP - copyOnloadHandler - status :" +httpChannel.responseStatus );
            if (httpChannel.responseStatus != 200 && httpChannel.responseStatus != 201)
                throw new Error("return status " + httpChannel.responseStatus);

            mainObject.m_oIMAPData.copyMSG(mainObject.m_szUserName,
                                           mainObject.m_iUID,
                                           mainObject.m_szSelectFolder,
                                           mainObject.m_szDestinationFolder);


            if (mainObject.m_aRawData.length>0)
            {
                mainObject.m_Log.Write("nsHotmailIMAP.js - copyOnloadHandler - next - ");

                var Item = mainObject.m_aRawData.shift();
                mainObject.m_iUID = Item;

                //get messages ID
                var oHref = {value:null};
                var bMSG = mainObject.m_oIMAPData.getMSGHref(mainObject.m_szUserName, mainObject.m_szSelectFolder, Item, oHref);

                var szMSGID = oHref.value.match(/[^\/]+$/);
                mainObject.m_Log.Write("nsHotmailIMAP.js - copy - destination URI" + mainObject.m_copyDest + szMSGID);

                mainObject.m_HttpComms.setURI(oHref.value);
                mainObject.m_HttpComms.setRequestMethod("MOVE");
                mainObject.m_HttpComms.addRequestHeader("Destination", mainObject.m_copyDest + szMSGID, false);
                var bResult = mainObject.m_HttpComms.send(mainObject.copyOnloadHandler, mainObject);
                if (!bResult) throw new Error("httpConnection returned false");

                mainObject.m_iStage ++;
            }
            else
            {
                mainObject.m_Log.Write("nsHotmailIMAP.js - copyOnloadHandler - done - ");
                //reset copy data
                mainObject.m_copyDest = null;
                mainObject.serverComms(mainObject.m_iTag +" OK COPY complete\r\n");
            }

            mainObject.m_Log.Write("nsHotmailIMAP.js - copyOnloadHandler - END");
            return true;
        }
        catch(err)
        {
            mainObject.m_Log.DebugDump("nsHotmailIMAP.js: copyloadHandler : Exception : "
                                              + err.name
                                              + ".\nError message: "
                                              + err.message+ "\n"
                                              + err.lineNumber);

            mainObject.serverComms(mainObject.m_iTag +" BAD error\r\n");
            return false;
        }
    },



    expunge : function ()
    {
        try
        {
            this.m_Log.Write("nsHotmailIMAP.js - expunge - START");

            this.m_oIMAPData.deleteMSG(this.m_szUserName, this.m_szSelectFolder)
            this.serverComms(this.m_iTag +" OK EXPUNGE COMPLETE\r\n");

            this.m_Log.Write("nsHotmailIMAP.js - expunge - END");
        }
        catch(err)
        {
            this.m_Log.DebugDump("nsHotmailIMAP.js: expunge : Exception : "
                                              + err.name
                                              + ".\nError message: "
                                              + err.message+ "\n"
                                              + err.lineNumber);

            this.serverComms(this.m_iTag +" BAD error\r\n");
            return false;
        }
    },





    createFolder : function (szFolder)
    {
        try
        {
            this.m_Log.Write("nsHotmailIMAP.js - createFolder - START");
            this.m_Log.Write("nsHotmailIMAP.js - createFolder - folder " + szFolder);

            //check level
            var aszLevel = szFolder.split(".");
            if (aszLevel.length!=2)
            {
                this.serverComms(this.m_iTag +" NO too low level\r\n");
                this.m_Log.Write("nsHotmailIMAP.js - createFolder - folder too low");
            }
            else
            {
                //check if folder exists
                var oHref = {value:null};
                var oUID = {value:null};
                var oMSGCount = {value:null};
                var oUnreadCount = {value:null};
                var oExpungeCount = {value:null};
                if (!this.m_oIMAPData.getFolderDetails(this.m_szUserName, szFolder,
                                                       oHref , oUID, oMSGCount, oUnreadCount, oExpungeCount))
                {
                    //create new folder
                    var szFolderHref = this.m_szFolderURI+aszLevel[1]+"/";
                    this.m_szFolderName = szFolder;
                    this.m_iStage = 0;
                    this.m_HttpComms.setContentType("text/xml");
                    this.m_HttpComms.setURI(szFolderHref);
                    this.m_HttpComms.setRequestMethod("MKCOL");
                    var bResult = this.m_HttpComms.send(this.createFolderOnloadHandler, this);
                    if (!bResult) throw new Error("httpConnection returned false");
                }
                else
                {
                     this.serverComms(this.m_iTag +" NO folder exists\r\n");
                     this.m_Log.Write("nsHotmailIMAP.js - createFolder - exists");
                }
            }

            this.m_Log.Write("nsHotmailIMAP.js - createFolder - END");
        }
        catch(err)
        {
            this.m_Log.DebugDump("nsHotmailIMAP.js: createFolder : Exception : "
                                              + err.name
                                              + ".\nError message: "
                                              + err.message+ "\n"
                                              + err.lineNumber);

            this.serverComms(this.m_iTag +" BAD error\r\n");
            return false;
        }
    },




    createFolderOnloadHandler : function (szResponse ,event , mainObject)
    {
        try
        {
            mainObject.m_Log.Write("nsHotmailIMAP.js - createFolderOnloadHandler - START");
            var httpChannel = event.QueryInterface(Components.interfaces.nsIHttpChannel);

            //if this fails we've gone somewhere new
            mainObject.m_Log.Write("nsHotmailIMAP - createFolderOnloadHandler - status :" +httpChannel.responseStatus );
            if (httpChannel.responseStatus != 200 && httpChannel.responseStatus != 201)
                throw new Error("return status " + httpChannel.responseStatus);

            switch(mainObject.m_iStage)
            {
                case 0: //create done now get folder list
                    mainObject.m_Log.Write("nsHotmailIMAP.js - createFolderOnloadHandler - get folder list - START");
                    mainObject.m_HttpComms.setContentType("text/xml");
                    mainObject.m_HttpComms.setRequestMethod("PROPFIND");
                    mainObject.m_HttpComms.addData(HotmailFolderSchema);
                    mainObject.m_HttpComms.setURI(mainObject.m_szFolderURI);
                    var bResult = mainObject.m_HttpComms.send(mainObject.listOnloadHandler, mainObject);
                    if (!bResult) throw new Error("httpConnection returned false");
                    mainObject.m_Log.Write("nsHotmailIMAP.js - createFolderOnloadHandler - get folder list - END");
                break;


                case 1:  //add new folder details
                    mainObject.m_Log.Write("nsHotmailIMAP.js - createFolderOnloadHandler - new folder details - START");

                    var aszResponses = szResponse.match(patternHotmailResponse);
                    mainObject.m_Log.Write("nsHotmailIMAP.js - createFolderOnloadHandler - folders - \n" + aszResponses);
                    for (i=0; i<aszResponses.length; i++)
                    {
                        mainObject.processFolder(aszResponses[i]);
                    }

                    var szMsg = mainObject.m_iTag +" OK CREATE complete\r\n"
                    mainObject.serverComms(szMsg);
                    mainObject.m_szFolderName = null;
                    mainObject.m_Log.Write("nsHotmailIMAP.js - createFolderOnloadHandler - new folder details - END");
                break;
            }

            mainObject.m_Log.Write("nsHotmailIMAP.js - createFolderOnloadHandler - END");
            return true;
        }
        catch(err)
        {
            mainObject.m_Log.DebugDump("nsHotmailIMAP.js: createFolderOnloadHandler : Exception : "
                                              + err.name
                                              + ".\nError message: "
                                              + err.message+ "\n"
                                              + err.lineNumber);

            mainObject.serverComms(mainObject.m_iTag +" BAD error\r\n");
            return false;
        }
    },



    deleteFolder : function (szFolder)
    {
        try
        {
            this.m_Log.Write("nsHotmailIMAP.js - deleteFolder - START");
            this.m_Log.Write("nsHotmailIMAP.js - deleteFolder - folder " + szFolder);

            var oHref = {value:null};
            var oUID = {value:null};
            var oMSGCount = {value:null};
            var oUnreadCount = {value:null};
            var oExpungeCount = {value:null};
            if (this.m_oIMAPData.getFolderDetails(this.m_szUserName, szFolder,
                                                  oHref , oUID, oMSGCount, oUnreadCount, oExpungeCount))
            {
                this.m_Log.Write("nsHotmailIMAP.js - deleteFolder - oHref.value " + oHref.value);
                this.m_szFolderName = szFolder;
                this.m_HttpComms.setURI(oHref.value);
                this.m_HttpComms.setRequestMethod("DELETE");
                var bResult = this.m_HttpComms.send(this.deleteFolderOnloadHandler, this);
                if (!bResult) throw new Error("httpConnection returned false");
            }
            else
                this.serverComms(this.m_iTag +" NO deleteFolder not supported\r\n");

            this.m_Log.Write("nsHotmailIMAP.js - deleteFolder - END");
        }
        catch(err)
        {
            this.m_Log.DebugDump("nsHotmailIMAP.js: deleteFolder : Exception : "
                                              + err.name
                                              + ".\nError message: "
                                              + err.message+ "\n"
                                              + err.lineNumber);

            this.serverComms(this.m_iTag +" BAD error\r\n");
            return false;
        }
    },




    deleteFolderOnloadHandler : function (szResponse ,event , mainObject)
    {
        try
        {
            mainObject.m_Log.Write("nsHotmailIMAP.js - deleteFolderOnloadHandler - START");

            var httpChannel = event.QueryInterface(Components.interfaces.nsIHttpChannel);

            //if this fails we've gone somewhere new
            mainObject.m_Log.Write("nsHotmailIMAP - deleteFolderOnloadHandler - status :" +httpChannel.responseStatus );
            if (httpChannel.responseStatus != 200 && httpChannel.responseStatus != 207)
                throw new Error("return status " + httpChannel.responseStatus);

            var bResult = mainObject.m_oIMAPData.deleteFolder(mainObject.m_szUserName, mainObject.m_szFolderName);
            var szMsg = mainObject.m_iTag;
            if (bResult)
                szMsg += " OK delete complete\r\n";
            else
                szMsg += " NO delete failed\r\n";

            mainObject.serverComms(szMsg);
            mainObject.m_szFolderReference = null;
            mainObject.m_szFolderName = null;

            mainObject.m_Log.Write("nsHotmailIMAP.js - deleteFolderOnloadHandler - END");
            return true;
        }
        catch(err)
        {
            mainObject.m_Log.DebugDump("nsHotmailIMAP.js: deleteFolderOnloadHandler : Exception : "
                                              + err.name
                                              + ".\nError message: "
                                              + err.message+ "\n"
                                              + err.lineNumber);

            mainObject.serverComms(mainObject.m_iTag +" BAD error\r\n");
            return false;
        }
    },




    renameFolder : function (szOldFolder, szNewFolder)
    {
        try
        {
            this.m_Log.Write("nsHotmailIMAP.js - renameFolder - START");
            this.m_Log.Write("nsHotmailIMAP.js - renameFolder - oldfolder " + szOldFolder + " newFolder "+ szNewFolder);

            //check for new name
            var oHref = {value:null};
            var oUID = {value:null};
            var oMSGCount = {value:null};
            var oUnreadCount = {value:null};
            var oExpungeCount = {value:null};
            if (!this.m_oIMAPData.getFolderDetails(this.m_szUserName, szNewFolder,
                                                   oHref , oUID, oMSGCount, oUnreadCount, oExpungeCount))
            {
                this.m_szFolderName = szOldFolder;
                var szOldFolderName = this.m_szFolderName.split(".")[1];
                this.m_Log.Write("nsHotmailIMAP.js - renameFolder - szOldFolder " + szOldFolderName);

                this.m_szFolderNewName = szNewFolder;
                var szNewFolderName = this.m_szFolderNewName.split(".")[1];
                this.m_Log.Write("nsHotmailIMAP.js - renameFolder - szNewFolder " + szNewFolderName);

                //get details of old folder
                this.m_oIMAPData.getFolderDetails(this.m_szUserName, this.m_szFolderName,
                                                  oHref , oUID, oMSGCount, oUnreadCount, oExpungeCount);
                this.m_Log.Write("nsHotmailIMAP.js - renameFolder - oHref.value " + oHref.value);
                var szNewFolderURI = oHref.value.replace(szOldFolderName, szNewFolderName);
                this.m_Log.Write("nsHotmailIMAP.js - renameFolder - szNewFolderURI " + szNewFolderURI);
                this.m_szFolderReference = szNewFolderURI;

                this.m_HttpComms.setURI(oHref.value);
                this.m_HttpComms.setRequestMethod("MOVE");
                this.m_HttpComms.addRequestHeader("Destination", szNewFolderURI , false);
                var bResult = this.m_HttpComms.send(this.renameFolderOnloadHandler, this);
                if (!bResult) throw new Error("httpConnection returned false");
            }
            else
                this.serverComms(this.m_iTag +" NO renameFolder found\r\n");

            this.m_Log.Write("nsHotmailIMAP.js - renameFolder - END");
        }
        catch(err)
        {
            this.m_Log.DebugDump("nsHotmailIMAP.js: renameFolder : Exception : "
                                              + err.name
                                              + ".\nError message: "
                                              + err.message+ "\n"
                                              + err.lineNumber);

            this.serverComms(this.m_iTag +" BAD error\r\n");
            return false;
        }
    },




    renameFolderOnloadHandler : function (szResponse ,event , mainObject)
    {
        try
        {
            mainObject.m_Log.Write("nsHotmailIMAP.js - renameFolderOnloadHandler - START");

            //if this fails we've gone somewhere new
            var httpChannel = event.QueryInterface(Components.interfaces.nsIHttpChannel);
            mainObject.m_Log.Write("nsHotmailIMAP - renameOnloadHandler - status :" +httpChannel.responseStatus );
            if (httpChannel.responseStatus != 200 && httpChannel.responseStatus != 201)
                throw new Error("return status " + httpChannel.responseStatus);

            var bResult = mainObject.m_oIMAPData.renameFolder(mainObject.m_szUserName,
                                                            mainObject.m_szFolderName,
                                                            mainObject.m_szFolderNewName,
                                                            mainObject.m_szFolderReference);
            var szMsg;
            if (bResult)
                szMsg = mainObject.m_iTag +" OK rename complete\r\n";
            else
                szMsg = mainObject.m_iTag +" NO rename failed\r\n";

            mainObject.m_szFolderReference = null;

            mainObject.serverComms(szMsg);

            mainObject.m_Log.Write("nsHotmailIMAP.js - renameFolderOnloadHandler - END");
            return true;
        }
        catch(err)
        {
            mainObject.m_Log.DebugDump("nsHotmailIMAP.js: renameFolderOnloadHandler : Exception : "
                                              + err.name
                                              + ".\nError message: "
                                              + err.message+ "\n"
                                              + err.lineNumber);

            mainObject.serverComms(mainObject.m_iTag +" BAD error\r\n");
            return false;
        }
    },




    //spilt range = 1,3,4:8,10:*
    range : function (szRange)
    {
        try
        {
            this.m_Log.Write("nsHotmailIMAP.js - range - START");
            this.m_Log.Write("nsHotmailIMAP.js - range - szRange " + szRange);

            var aTempRange = szRange.split(",");
            this.m_Log.Write("nsHotmailIMAP.js - range - aTempRange " +aTempRange);

            var aRange = new Array();
            for (var i=0; i<aTempRange.length; i++)
            {
                if (aTempRange[i].search(/\:/)!=-1)
                {
                    this.m_Log.Write("nsHotmailIMAP.js - range - found range");

                    var aWildCardTemp = aTempRange[i].split(/\:/);
                    this.m_Log.Write("nsHotmailIMAP.js - range - aWildCardTemp "+aWildCardTemp);
                    var min = aWildCardTemp[0];
                    var max = -1;
                    if (aWildCardTemp[1].search(/\d/)!=-1) max = aWildCardTemp[1];
                    this.m_Log.Write("nsHotmailIMAP.js - range - min " + min + " max " +max );

                    var aiIDs = {value : null};
                    var iCount = {value : null };
                    this.m_oIMAPData.getRangeMSGIDs(this.m_szUserName, this.m_szSelectFolder,
                                                    min, max, iCount, aiIDs);
                    this.m_Log.Write("nsHotmailIMAP.js - range - aiIDs "+aiIDs.value);
                    aRange = aRange.concat(aiIDs.value);
                }
                else
                    aRange.push( aTempRange[i]);
            }

            this.m_Log.Write("nsHotmailIMAP.js - range - aRange "+ aRange);
            this.m_Log.Write("nsHotmailIMAP.js - range - END");
            return aRange;
        }
        catch(err)
        {
            this.m_Log.DebugDump("nsHotmailIMAP.js: range : Exception : "
                                              + err.name
                                              + ".\nError message: "
                                              + err.message + "\n"
                                              + err.lineNumber);
             return null;
        }
    },




    logOut : function()
    {
        try
        {
            this.m_Log.Write("nsHotmailIMAP.js - logOUT - START");

            this.m_bAuthorised = false;
            var szResponse = "* BYE IMAP4rev1 Server logout\r\n";
            szResponse += this.m_iTag +" OK Logout Completed\r\n"
            this.serverComms(szResponse);

            this.m_Log.Write("nsHotmailIMAP.js - logOUT - END");
            return true;
        }
        catch(e)
        {
            this.m_Log.DebugDump("nsHotmailIMAP.js: logOUT : Exception : "
                                      + e.name
                                      + ".\nError message: "
                                      + e.message+ "\n"
                                      + e.lineNumber);
            return false;
        }
    },






    close : function ()
    {
        try
        {
            this.m_Log.Write("nsHotmailIMAP.js - close - START");
            this.serverComms(this.m_iTag +" OK CLOSE complete\r\n");
            this.m_Log.Write("nsHotmailIMAP.js - close - END");
        }
        catch(err)
        {
            this.m_Log.DebugDump("nsHotmailIMAP.js: close : Exception : "
                                              + err.name
                                              + ".\nError message: "
                                              + err.message);

            this.serverComms(this.m_iTag +" BAD error\r\n");
            return false;
        }
    },



    check : function()
    {
        try
        {
            this.m_Log.Write("nsHotmailIMAP.js - check - START");
            this.serverComms(this.m_iTag +" OK CHECK complete\r\n");
            this.m_Log.Write("nsHotmailIMAP.js - check - END");
        }
        catch(err)
        {
            this.m_Log.DebugDump("nsHotmailIMAP.js: check : Exception : "
                                              + err.name
                                              + ".\nError message: "
                                              + err.message);

            this.serverComms(this.m_iTag +" BAD error\r\n");
            return false;
        }
    },



    examine : function ()
    {
        try
        {
            this.m_Log.Write("nsHotmailIMAP.js - examine - START");
            this.serverComms(this.m_iTag +" NO examine\r\n");
            this.m_Log.Write("nsHotmailIMAP.js - examine - END");
        }
        catch(err)
        {
            this.m_Log.DebugDump("nsHotmailIMAP.js: examine : Exception : "
                                              + err.name
                                              + ".\nError message: "
                                              + err.message+ "\n"
                                              + err.lineNumber);

            this.serverComms(this.m_iTag +" BAD error\r\n");
            return false;
        }
    },

     /*******************************Server Comms  ****************************/

    serverComms : function (szMsg)
    {
        try
        {
            this.m_Log.Write("nsHotmailIMAP.js - serverComms - START");
            this.m_Log.Write("nsHotmailIMAP.js - serverComms msg " + szMsg);
            var iCount = this.m_oResponseStream.write(szMsg,szMsg.length);
            this.m_Log.Write("nsHotmailIMAP.js - serverComms sent count: " + iCount
                                                        +" msg length: " +szMsg.length);
            this.m_Log.Write("nsHotmailIMAP.js - serverComms - END");
        }
        catch(e)
        {
            this.m_Log.DebugDump("nsHotmail.js: serverComms : Exception : "
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
        if (!iid.equals(Components.interfaces.nsIIMAPDomainHandler)
                                  && !iid.equals(Components.interfaces.nsISupports))
            throw Components.results.NS_ERROR_NO_INTERFACE;

        return this;
    }
}


/******************************************************************************/
/* FACTORY*/
var nsHotmailIMAPFactory = new Object();

nsHotmailIMAPFactory.createInstance = function (outer, iid)
{
    if (outer != null) throw Components.results.NS_ERROR_NO_AGGREGATION;

    if (!iid.equals(nsHotmailIMAPClassID) && !iid.equals(Components.interfaces.nsISupports))
        throw Components.results.NS_ERROR_INVALID_ARG;

    return new nsHotmailIMAP();
}


/******************************************************************************/
/* MODULE */
var nsHotmailIMAPModule = new Object();

nsHotmailIMAPModule.registerSelf = function(compMgr, fileSpec, location, type)
{
    compMgr = compMgr.QueryInterface(Components.interfaces.nsIComponentRegistrar);
    compMgr.registerFactoryLocation(nsHotmailIMAPClassID,
                                    "HotmailIMAPComponent",
                                    nsHotmailIMAPContactID,
                                    fileSpec,
                                    location,
                                    type);
}


nsHotmailIMAPModule.unregisterSelf = function(aCompMgr, aFileSpec, aLocation)
{
    aCompMgr = aCompMgr.QueryInterface(Components.interfaces.nsIComponentRegistrar);
    aCompMgr.unregisterFactoryLocation(nsHotmailIMAPClassID, aFileSpec);
}


nsHotmailIMAPModule.getClassObject = function(compMgr, cid, iid)
{
    if (!cid.equals(nsHotmailIMAPClassID))
        throw Components.results.NS_ERROR_NO_INTERFACE;

    if (!iid.equals(Components.interfaces.nsIFactory))
        throw Components.results.NS_ERROR_NOT_IMPLEMENTED;

    return nsHotmailIMAPFactory;
}


nsHotmailIMAPModule.canUnload = function(compMgr)
{
    return true;
}
/******************************************************************************/


function NSGetModule(compMgr, fileSpec)
{
    return nsHotmailIMAPModule;
}
