/*****************************  Globals   *************************************/
const nsLycosIMAPClassID = Components.ID("{98ceff20-9cb0-11d9-9669-0800200c9a66}");
const nsLycosIMAPContactID = "@mozilla.org/LycosIMAP;1";

/***********************  Lycos ********************************/

function nsLycosIMAP()
{
    try
    {
        var scriptLoader =  Components.classes["@mozilla.org/moz/jssubscript-loader;1"];
        scriptLoader = scriptLoader.getService(Components.interfaces.mozIJSSubScriptLoader);
        scriptLoader.loadSubScript("chrome://web-mail/content/common/DebugLog.js");
        scriptLoader.loadSubScript("chrome://web-mail/content/common/HttpComms3.js");
        scriptLoader.loadSubScript("chrome://web-mail/content/common/CommonPrefs.js");

        var date = new Date();
        var  szLogFileName = "LycosIMAP Log - " + date.getHours()+ "-" + date.getMinutes() + "-"+ date.getUTCMilliseconds() +" -";
        this.m_Log = new DebugLog("webmail.logging.comms",
                                  "{3c8e8390-2cf6-11d9-9669-0800200c9a66}" ,
                                  szLogFileName);

        this.m_Log.Write("nsLycosIMAP.js - Constructor - START");

        if (typeof kLycosConstants == "undefined")
        {
            this.m_Log.Write("nsLycosIMAP.js - Constructor - loading constants");
            scriptLoader.loadSubScript("chrome://lycos/content/Lycos-Constants.js");
        }


        this.m_szUserName = null;
        this.m_szPassWord = null;
        this.m_oResponseStream = null;
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
        this.m_deleteResponse = null;

        this.m_Timer = Components.classes["@mozilla.org/timer;1"];
        this.m_Timer = this.m_Timer.createInstance(Components.interfaces.nsITimer);

        var oPref = {Value:null};
        var  WebMailPrefAccess = new WebMailCommonPrefAccess();
        if (WebMailPrefAccess.Get("int","lycos.iProcessDelay",oPref))
            this.m_iTime=oPref.Value;
        else
            this.m_iTime=10;

        oPref.Value = null;
        if (WebMailPrefAccess.Get("int","lycos.iFolderBiff",oPref))
            this.m_iFolderBiff = oPref.Value;
        else
            this.m_iFolderBiff = 1200000;

        oPref.Value = null;
        if (WebMailPrefAccess.Get("int","lycos.iMSGListBiff",oPref))
            this.m_iMSGListBiff = oPref.Value;
        else
            this.m_iMSGListBiff = 600000;

        this.m_Log.Write("nsLycosIMAP.js - Constructor - END");
    }
    catch(e)
    {
        DebugDump("nsLycosIMAP.js: Constructor : Exception : "
                                      + e.name
                                      + ".\nError message: "
                                      + e.message+ "\n"
                                      + e.lineNumber);
    }
}



nsLycosIMAP.prototype =
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
            this.m_Log.Write("nsLycosIMAP.js - logIN - START");
            this.m_Log.Write("nsLycosIMAP.js - logIN - Username: " + this.m_szUserName
                                                   + " Password: "  + this.m_szPassWord
                                                   + " stream: "    + this.m_oResponseStream);

            if (!this.m_szUserName || !this.m_oResponseStream || !this.m_szPassWord) return false;

            var szDomain = this.m_szUserName.split("@")[1];
            this.m_Log.Write("nsLycosIMAP.js - logIN - doamain " + szDomain);

            var szLocation= null;
            if (szDomain.search(/lycos.co.uk/i)!=-1)
                szLocation= "http://webdav.lycos.co.uk/httpmail.asp";
            else if (szDomain.search(/lycos.es/i)!=-1)
                szLocation= "http://webdav.lycos.es/httpmail.asp";
            else if (szDomain.search(/lycos.de/i)!=-1)
                szLocation= "http://webdav.lycos.de/httpmail.asp";
            else if (szDomain.search(/lycos.it/i)!=-1)
                szLocation= "http://webdav.lycos.it/httpmail.asp";
            else if (szDomain.search(/lycos.at/i)!=-1)
                szLocation= "http://webdav.lycos.at/httpmail.asp";
            else if (szDomain.search(/lycos.nl/i)!=-1)
                szLocation= "http://webdav.lycos.nl/httpmail.asp";
            else if (szDomain.search(/lycos.fr/i)!=-1)
                szLocation= "http://webdav.caramail.lycos.fr/httpmail.asp";
            else
                throw new Error("Unknown domain");

            this.m_HttpComms.setUserName(this.m_szUserName);
            this.m_HttpComms.setPassword(this.m_szPassWord);
            this.m_HttpComms.setContentType("text/xml");
            this.m_HttpComms.setURI(szLocation);
            this.m_HttpComms.setRequestMethod("PROPFIND");
            this.m_HttpComms.addData(kLycosSchema);
            var bResult = this.m_HttpComms.send(this.loginOnloadHandler, this);
            if (!bResult) throw new Error("httpConnection returned false");

            this.m_Log.Write("nsLycosIMAP.js - logIN - END " + bResult);
            return true;
        }
        catch(e)
        {
            this.m_Log.DebugDump("nsLycosIMAP.js: logIN : Exception : "
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
            mainObject.m_Log.Write("nsLycosIMAP.js - loginOnloadHandler - START");
            mainObject.m_Log.Write("nsLycosIMAP.js - loginOnloadHandler : "+ mainObject.m_iStage);

            var httpChannel = event.QueryInterface(Components.interfaces.nsIHttpChannel);

            //if this fails we've gone somewhere new
            mainObject.m_Log.Write("nsLycos - loginOnloadHandler - status :" +httpChannel.responseStatus );
            if (httpChannel.responseStatus != 200 && httpChannel.responseStatus != 207)
                throw new Error("return status " + httpChannel.responseStatus);

            mainObject.m_Log.Write("nsLycosIMAP.js - loginOnloadHandler - get url - start");
            mainObject.m_iAuth=0; //reset login counter
            mainObject.m_szFolderURI = szResponse.match(kLycosFolder)[1];
            mainObject.m_Log.Write("nsLycosIMAP.js - loginOnloadHandler - get folder url - " + mainObject.m_szFolderURI);

            mainObject.m_oIMAPData.createUser(mainObject.m_szUserName);

            //server response
            mainObject.serverComms(mainObject.m_iTag +" OK Login Complete\r\n");
            mainObject.m_bAuthorised = true;
            mainObject.m_Log.Write("nsLycosIMAP.js - loginOnloadHandler - END");
        }
        catch(err)
        {
            var oCookies = Components.classes["@mozilla.org/nsWebMailCookieManager2;1"]
                                     .getService(Components.interfaces.nsIWebMailCookieManager2);
            oCookies.removeCookie(mainObject.m_szUserName);

            var oAuth = Components.classes["@mozilla.org/HttpAuthManager2;1"]
                                  .getService(Components.interfaces.nsIHttpAuthManager2);
            oAuth.removeToken(mainObject.m_szUserName);
            
            mainObject.m_Log.DebugDump("nsLycosIMAP.js: loginHandler : Exception : "
                                          + err.name
                                          + ".\nError message: "
                                          + err.message+ "\n"
                                          + err.lineNumber);
            mainObject.serverComms(mainObject.m_iTag + " NO Comms Error\r\n");
            return false;
        }
    },



    listSubscribe : function()
    {
        try
        {
            this.m_Log.Write("nsLycosIMAP.js - listSubscribe - START");

            var iUpdateDate = this.m_oIMAPData.lastFolderListUpdate(this.m_szUserName);
            iUpdateDate += this.m_iFolderBiff;
            this.m_Log.Write("nsLycosIMAP.js - list - iUpdateDate " + iUpdateDate);
            this.m_iListType = 0;

            if (iUpdateDate < Date.now())
            {//donwload folder list
                this.m_HttpComms.setContentType("text/xml");
                this.m_HttpComms.setRequestMethod("PROPFIND");
                this.m_HttpComms.addData(kLycosFolderSchema);
                this.m_HttpComms.setURI(this.m_szFolderURI);
                var bResult = this.m_HttpComms.send(this.listOnloadHandler, this);
                if (!bResult) throw new Error("httpConnection returned false");
            }
            else
            {
                this.subscribeResponse();
            }


            this.m_Log.Write("nsLycosIMAP.js - listSubscribe - END");
            return true;
        }
        catch(err)
        {
            this.m_Log.DebugDump("nsLycosIMAP.js: listSubscribe : Exception : "
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
            this.m_Log.Write("nsLycosIMAP.js - subscribeResponse - START");

            var aszFolders = {value : null};
            var iFolders = {value : null };
            this.m_oIMAPData.listSubscribed(this.m_szUserName, iFolders, aszFolders);
            this.m_Log.Write("nsLycosIMAP.js - listSubscribe - list: " + aszFolders.value);

            var szResponse = "";
            for (i=0; i<aszFolders.value.length; i++)
            {
                szResponse += "* lsub (\\Noinferiors \\HasNoChildren) " + "\".\" \"" + aszFolders.value[i] + "\"\r\n";
            }
            szResponse += this.m_iTag + " OK LSUB Completed\r\n";
            this.serverComms(szResponse);

            this.m_Log.Write("nsLycosIMAP.js - subscribeResponse - END");
        }
        catch(err)
        {
             this.m_Log.DebugDump("nsLycosIMAP.js: subscribeResponse : Exception : "
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
            this.m_Log.Write("nsLycosIMAP.js - subscribe - START");
            this.m_Log.Write("nsLycosIMAP.js - subscribe - szFolder " +szFolder);
            if (!szFolder) return false;

            var bDone = this.m_oIMAPData.subscribeFolder(this.m_szUserName, szFolder);
            var szResponse = this.m_iTag;
            szResponse += bDone? " OK " : " NO ";
            szResponse += "SUBCRIBE Completed\r\n";
            this.serverComms(szResponse);

            this.m_Log.Write("nsLycosIMAP.js - subscribe - END");
        }
        catch(err)
        {
             this.m_Log.DebugDump("nsLycosIMAP.js: subscribe : Exception : "
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
            this.m_Log.Write("nsLycosIMAP.js - unSubscribe - START");
            this.m_Log.Write("nsLycosIMAP.js - unSubscribe - Folder " + szFolder );
            if (!szFolder) return false;

            var bDone = this.m_oIMAPData.unsubscribeFolder(this.m_szUserName, szFolder);
            var szResponse = this.m_iTag;
            szResponse += bDone? " OK " : " NO ";
            szResponse += "UNSUBCRIBE Completed\r\n";
            this.serverComms(szResponse);

            this.m_Log.Write("nsLycosIMAP.js - unSubscribe - END");
        }
        catch(err)
        {
            this.m_Log.DebugDump("nsLycosIMAP.js: unSubscribe : Exception : "
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
            this.m_Log.Write("nsLycosIMAP.js - list - START");
            this.m_Log.Write("nsLycosIMAP.js - list - szReference " + szReference);

            if (this.m_szFolderURI == null) return false;
            this.m_Log.Write("nsLycosIMAP.js - list - mail box url " + this.m_szFolderURI);

            this.m_szFolderReference = szReference;

            var iUpdateDate = this.m_oIMAPData.lastFolderListUpdate(this.m_szUserName);
            iUpdateDate += this.m_iFolderBiff;
            this.m_Log.Write("nsLycosIMAP.js - list - iUpdateDate " + iUpdateDate);

            this.m_iListType = 1

            if (iUpdateDate < Date.now())
            {//donwload folder list
                this.m_HttpComms.setContentType("text/xml");
                this.m_HttpComms.setRequestMethod("PROPFIND");
                this.m_HttpComms.addData(kLycosFolderSchema);
                this.m_HttpComms.setURI(this.m_szFolderURI);
                var bResult = this.m_HttpComms.send(this.listOnloadHandler, this);
                if (!bResult) throw new Error("httpConnection returned false");
            }
            else
            {
                this.listResponse();
            }
            this.m_Log.Write("nsLycosIMAP.js - list - END");
            return true;
        }
        catch(err)
        {
            this.m_Log.DebugDump("nsLycosIMAP.js: list : Exception : "
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
            mainObject.m_Log.Write("nsLycosIMAP.js - listOnloadHandler - START");

            var httpChannel = event.QueryInterface(Components.interfaces.nsIHttpChannel);

            //if this fails we've gone somewhere new
            mainObject.m_Log.Write("nsLycos - listOnloadHandler - status :" +httpChannel.responseStatus );
            if (httpChannel.responseStatus != 200 && httpChannel.responseStatus != 207)
                throw new Error("return status " + httpChannel.responseStatus);

            //get root folders
            mainObject.m_Log.Write("nsLycosIMAP.js - listOnloadHandler - get root folder list - START");

            var aszResponses = szResponse.match(kLycosResponse);
            mainObject.m_Log.Write("nsLycosIMAP.js - listOnloadHandler - folders - \n" + aszResponses);

            var szResponse = "";

            for (i=0; i<aszResponses.length; i++)
            {
                mainObject.processFolder(aszResponses[i]);
            }

            if (mainObject.m_iListType == 1)
                mainObject.listResponse();
            else
                mainObject.subscribeResponse();

            mainObject.m_Log.Write("nsLycosIMAP.js - listOnloadHandler - END");
        }
        catch(err)
        {
             mainObject.m_Log.DebugDump("nsLycosIMAP.js: listOnloadHandler : Exception : "
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
            this.m_Log.Write("nsLycosIMAP.js - processFolder - START");
            this.m_Log.Write("nsLycosIMAP.js - processFolder - szFolder " +szFolder);

            var szHref = szFolder.match(kLycosHref)[1];

            var szDisplayName = null;
            try
            {
                szDisplayName = szFolder.match(kLycosDisplayName)[1];
            }
            catch(e)
            {
                szDisplayName = szFolder.match(kLycosSpecial)[1];
            }

            var szHiererchy = null;
            if (szHref.search(/inbox/i)!=-1)
            {
                szHiererchy = "INBOX";
            }
            else if (szHref.search(/trash/i)!=-1)
            {
                szHiererchy = "INBOX.Trash"
            }
            else
            {//not inbox
                szHiererchy = "INBOX." + szDisplayName;
            }

            var iUnreadCount = parseInt(szFolder.match(kLycosUnreadCount)[1]);
            var iMsgCount =  parseInt(szFolder.match(kLycosMsgCount)[1]);

            this.m_oIMAPData.addFolder(this.m_szUserName, szHiererchy, szHref);
            this.m_Log.Write("nsLycosIMAP.js - processFolder - END");
        }
        catch(err)
        {
            this.m_Log.DebugDump("nsLycosIMAP.js: listResponse : Exception : "
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
            this.m_Log.Write("nsLycosIMAP.js - listResponse - START");

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

            this.m_Log.Write("nsLycosIMAP.js - listResponse - END");
        }
        catch(err)
        {
             this.m_Log.DebugDump("nsLycosIMAP.js: listResponse : Exception : "
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
            this.m_Log.Write("nsLycosIMAP.js - select - START");
            this.m_Log.Write("nsLycosIMAP.js - select - szReference " + szReference);

            if (this.m_szFolderURI == null) return false;

            this.m_szSelectFolder = szReference;

            var iUpdateDateFolder = this.m_oIMAPData.lastFolderListUpdate(this.m_szUserName);
            iUpdateDateFolder += this.m_iFolderBiff;
            this.m_Log.Write("nsLycosIMAP.js - Select - iUpdateDateFolder " + iUpdateDateFolder);

            if (iUpdateDateFolder < Date.now())
            {
                this.m_Log.Write("nsLycosIMAP.js - select - folders not found");
                this.m_iStage=0;
                this.m_Log.Write("nsLycosIMAP.js - select - " + this.m_szFolderURI);
                this.m_HttpComms.setURI(this.m_szFolderURI);
                this.m_HttpComms.setRequestMethod("PROPFIND");
                this.m_HttpComms.setContentType("text/xml");
                this.m_HttpComms.addData(kLycosFolderSchema);
                var bResult = this.m_HttpComms.send(this.selectOnloadHandler, this);
                if (!bResult) throw new Error("httpConnection returned false");
            }
            else
            {
                this.m_Log.Write("nsLycosIMAP.js - select - folder data current ");

                var iUpdateDateMSGList = this.m_oIMAPData.lastMsgListUpdate(this.m_szUserName, this.m_szSelectFolder);
                iUpdateDateMSGList += this.m_iMSGListBiff;
                this.m_Log.Write("nsLycosIMAP.js - Select - iUpdateDateMSGList " + iUpdateDateMSGList);

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

                    this.m_Log.Write("nsLycosIMAP.js - select - " + oHref.value + " " + oUID.value + " "
                                                                  + oMSGCount.value + " " + oUnreadCount.value);

                    this.m_iStage = 1;
                    this.m_HttpComms.setURI(oHref.value);
                    this.m_HttpComms.setContentType("text/xml");
                    this.m_HttpComms.setRequestMethod("PROPFIND");
                    this.m_HttpComms.addData(kLycosMailSchema);
                    var bResult = this.m_HttpComms.send(this.selectOnloadHandler, this);
                    if (!bResult) throw new Error("httpConnection returned false");
                }
                else
                {
                    this.m_Log.Write("nsLycosIMAP.js - select - msg data current ");
                    this.responseSelect();
                }
            }

            this.m_Log.Write("nsLycosIMAP.js - select - END");
            return true;
        }
        catch(err)
        {
            this.m_Log.DebugDump("nsLycosIMAP.js: select : Exception : "
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
            mainObject.m_Log.Write("nsLycosIMAP.js - selectOnloadHandler - START");
            mainObject.m_Log.Write("nsLycosIMAP.js - selectOnloadHandler : "+ mainObject.m_iStage);

            var httpChannel = event.QueryInterface(Components.interfaces.nsIHttpChannel);

            //if this fails we've gone somewhere new
            mainObject.m_Log.Write("nsLycos - selectOnloadHandler - status :" +httpChannel.responseStatus );
            if (httpChannel.responseStatus != 200 && httpChannel.responseStatus != 207)
                throw new Error("return status " + httpChannel.responseStatus);


            switch( mainObject.m_iStage)
            {
                case 0:   //folder list
                    mainObject.m_Log.Write("nsLycosIMAP.js - selectOnloadHandler - get folder list - START");

                    var aszResponses = szResponse.match(kLycosResponse);
                    mainObject.m_Log.Write("nsLycosIMAP.js - selectOnloadHandler - folders - \n" + aszResponses);
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

                    this.m_Log.Write("nsLycosIMAP.js - select - " + oHref.value + " " + oUID.value + " "
                                                                  + oMSGCount.value + " " + oUnreadCount.value);

                    mainObject.m_iStage = 1;
                    mainObject.m_HttpComms.setContentType("text/xml");
                    mainObject.m_HttpComms.setURI(oHref.value);
                    mainObject.m_HttpComms.setRequestMethod("PROPFIND");
                    mainObject.m_HttpComms.addData(kLycosMailSchema);
                    var bResult = mainObject.m_HttpComms.send(mainObject.selectOnloadHandler, mainObject);
                    if (!bResult) throw new Error("httpConnection returned false");

                    mainObject.m_Log.Write("nsLycosIMAP.js - selectOnloadHandler - get folder list - END");
                break;

                case 1:  //message headers
                    mainObject.m_Log.Write("nsLycosIMAP.js - selectOnloadHandler - get msg list - START");

                    //get uid list
                    var aszResponses = szResponse.match(kLycosResponse);
                    mainObject.m_Log.Write("nsLycosIMAP.js - selectOnloadHandler - \n" + aszResponses);
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

                    mainObject.m_Log.Write("nsLycosIMAP.js - selectOnloadHandler - get msg list - END");
                break;
            }

            mainObject.m_Log.Write("nsLycosIMAP.js - selectOnloadHandler - END");
        }
        catch(err)
        {
             mainObject.m_Log.DebugDump("nsLycosIMAP.js: selectOnloadHandler : Exception : "
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
            this.m_Log.Write("nsLycosIMAP.js - selectResponse - Start ");

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

            this.m_Log.Write("nsLycosIMAP.js - selectResponse - END");
        }
        catch(err)
        {
             this.m_Log.DebugDump("nsLycosIMAP.js: selectResponse : Exception : "
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
            this.m_Log.Write("nsLycosIMAP.js - processMSG - START");
            if (this.m_aRawData.length>0)
            {
                var Item = this.m_aRawData.shift();
                this.processMSGItem(Item);
            }
            else
            {
                this.m_Log.Write("nsLycosIMAP.js - processMSG - all data handled");
                this.responseSelect();
                delete this.m_aRawData;
                this.m_aRawData = new Array();
                timer.cancel();
            }

            this.m_Log.Write("nsLycosIMAP.js - processMSG - END");
        }
        catch(err)
        {
             this.m_Log.DebugDump("nsLycosIMAP.js: processMSG : Exception : "
                                              + err.name
                                              + ".\nError message: "
                                              + err.message +"\n"
                                              + err.lineNumber);

             this.serverComms(mainObject.m_iTag +" BAD error\r\n");
        }
    },








    processMSGItem : function (Item)
    {
        this.m_Log.Write("nsLycosIMAP.js - processMSGItem - START");

        this.m_Log.Write("nsLycosIMAP.js - processMSGItem - handling data");

        var bRead = parseInt(Item.match(kLycosRead)[1]) ? true : false;
        this.m_Log.Write("nsLycosIMAP.js - processMSGItem - bRead -" + bRead);

        var szMSGUri = Item.match(kLycosHref)[1]; //uri
        this.m_Log.Write("nsLycosIMAP.js - processMSGItem - szMSGUri -" + szMSGUri);

        var szID = szMSGUri.match(/MSG(.*?)$/)[1];
        this.m_Log.Write("nsLycosIMAP.js - processMSGItem - szID -" + szID);

        var iSize = parseInt(Item.match(kLycosSize)[1]);//size
        this.m_Log.Write("nsLycosIMAP.js - processMSGItem - iSize -" + iSize);

        var szTO="";
        try
        {
            szTO = Item.match(kLycosTo)[1].match(/[\S\d]*@[\S\d]*/);
        }
        catch(err)
        {
            szTO = Item.match(kLycosTo)[1];
        }
        this.m_Log.Write("nsLycosIMAP.js - processMSGItem - szTO -" + szTO);

        var szFrom = "";
        try
        {
            szFrom = Item.match(kLycosFrom)[1].match(/[\S\d]*@[\S\d]*/);
        }
        catch(err)
        {
            szFrom = Item.match(kLycosFrom)[1];
        }
        this.m_Log.Write("nsLycosIMAP.js - processMSGItem - szFrom -" + szFrom);

        var szSubject= "";
        try
        {
            szSubject= Item.match(kLycosSubject)[1];
        }
        catch(err){}
        this.m_Log.Write("nsLycosIMAP.js - processMSGItem - szSubject -" + szSubject);

        var szDate = "";
        try
        {
            var aszDateTime = Item.match(kLycosDate);
            var aszDate = aszDateTime[1].split("-");
            var aszTime = aszDateTime[2].split(":");

            var date = new Date(parseInt(aszDate[0],10),  //year
                             parseInt(aszDate[1],10)-1,  //month
                             parseInt(aszDate[2],10),  //day
                             parseInt(aszTime[0],10),  //hour
                             parseInt(aszTime[1],10),  //minute
                             parseInt(aszTime[2],10));  //second
            szDate = date.toGMTString();
        }
        catch(err){}
        this.m_Log.Write("nsLycosIMAP.js - processMSGItem - szDate -" + szDate);

        this.m_oIMAPData.addMSG(this.m_szUserName, this.m_szSelectFolder, szMSGUri, szID , bRead, szTO, szFrom, szSubject, szDate, iSize);

        this.m_Log.Write("nsLycosIMAP.js - processMSGItem - END");
    },






    noop : function ()
    {
        try
        {
            this.m_Log.Write("nsLycosIMAP.js - noop - START");

            var iUpdateDateMSGList = this.m_oIMAPData.lastMsgListUpdate(this.m_szUserName, this.m_szSelectFolder);
            iUpdateDateMSGList += this.m_iMSGListBiff;
            this.m_Log.Write("nsLycosIMAP.js - noop - iUpdateDateFolder " + iUpdateDateMSGList);

            if (iUpdateDateMSGList < Date.now())
            {
                var oHref = {value:null};
                var oUID = {value:null};
                var oMSGCount = {value:null};
                var oUnreadCount = {value:null};
                var oExpungeCount = {value:null};
                if (!this.m_oIMAPData.getFolderDetails(this.m_szUserName, this.m_szSelectFolder,
                                                       oHref , oUID, oMSGCount, oUnreadCount, oExpungeCount))
                    throw new Error("Folder not found");

                this.m_Log.Write("nsLycosIMAP.js - noop - " + oHref.value + " " + oUID.value + " " + oMSGCount.value + " " + oUnreadCount.value);

                this.m_HttpComms.setURI(oHref.value);
                this.m_HttpComms.setContentType("text/xml");
                this.m_HttpComms.setRequestMethod("PROPFIND");
                this.m_HttpComms.addData(kLycosMailSchema);
                var bResult = this.m_HttpComms.send(this.noopOnloadHandler, this);
                if (!bResult) throw new Error("httpConnection returned false");
            }
            else
            {
                this.responseNOOP();
            }
            this.m_Log.Write("nsLycosIMAP.js - noop - END");
        }
        catch(err)
        {
            this.m_Log.DebugDump("nsLycosIMAP.js: noop : Exception : "
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
            mainObject.m_Log.Write("nsLycosIMAP.js - noopOnloadHandler - START");

            var httpChannel = event.QueryInterface(Components.interfaces.nsIHttpChannel);

            //if this fails we've gone somewhere new
            mainObject.m_Log.Write("nsLycos - noopOnloadHandler - status :" +httpChannel.responseStatus );
            if (httpChannel.responseStatus != 200 && httpChannel.responseStatus != 207)
                throw new Error("return status " + httpChannel.responseStatus);

            //get uid list
            var aszResponses = szResponse.match(kLycosResponse);
            mainObject.m_Log.Write("nsLycosIMAP.js - noopOnloadHandler - \n" + aszResponses);
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

            mainObject.m_Log.Write("nsLycosIMAP.js - noopOnloadHandler - END");
        }
        catch(err)
        {
             mainObject.m_Log.DebugDump("nsLycosIMAP.js: noopOnloadHandler : Exception : "
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
            this.m_Log.Write("nsLycosIMAP.js - processNOOP - START");

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
                this.m_Log.Write("nsLycosIMAP.js - processNOOP - all data handled");
                this.responseNOOP();
            }

            this.m_Log.Write("nsLycosIMAP.js - processNOOP - END");
        }
        catch(err)
        {
            this.m_Timer.cancel();
            this.m_Log.DebugDump("nsLycosIMAP.js: processNOOP : Exception : "
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
            this.m_Log.Write("nsLycosIMAP.js - responseNOOP - Start ");

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

            this.m_Log.Write("nsLycosIMAP.js - responseNOOP - END");
        }
        catch(err)
        {
             this.m_Log.DebugDump("nsLycosIMAP.js: responseNOOP : Exception : "
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
            this.m_Log.Write("nsLycosIMAP.js - fetch - START");
            this.m_Log.Write("nsLycosIMAP.js - fetch - Range " + szRange + " Flags "+ szFlag);

            var iUpdateDate = this.m_oIMAPData.lastMsgListUpdate(this.m_szUserName, this.m_szSelectFolder);
            iUpdateDate += this.m_iMSGListBiff;
            this.m_Log.Write("nsLycosIMAP.js - fetch - iUpdateDate " + iUpdateDate);

            if (iUpdateDate < Date.now())
            {
                this.m_Log.Write("nsLycosIMAP.js - fetch - Check for new data");
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

                this.m_Log.Write("nsLycosIMAP.js - fetch - " + oHref.value + " " + oUID.value + " " + oMSGCount.value + " " + oUnreadCount.value);

                this.m_HttpComms.setURI(oHref.value);
                this.m_HttpComms.setContentType("text/xml");
                this.m_HttpComms.setRequestMethod("PROPFIND");
                this.m_HttpComms.addData(kLycosMailSchema);
                var bResult = this.m_HttpComms.send(this.fetchOnloadHandler, this);
                if (!bResult) throw new Error("httpConnection returned false");
            }
            else
            {
                this.m_Log.Write("nsLycosIMAP.js - fetch - Use stored data");

                delete this.m_aRawData;
                this.m_aRawData = this.range(szRange);
                this.m_Log.Write("nsLycosIMAP.js - fetch - Range " +this.m_aRawData);

                if (szFlag.search(/Header/i)!=-1)
                {
                    this.m_Log.Write("nsLycosIMAP.js - fetch - headers ");
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
                    this.m_Log.Write("nsLycosIMAP.js - fetch - body ");
                    this.fetchBody();
                }
                else  //get message ids
                {
                    this.m_Log.Write("nsLycosIMAP.js - fetch - ids ");

                    var callback = {
                          notify: function(timer) { this.parent.processIDs(timer)}
                    };
                    callback.parent = this;
                    this.m_Timer.initWithCallback(callback,
                                                  this.m_iTime,
                                                  Components.interfaces.nsITimer.TYPE_REPEATING_SLACK);
                }
            }

            this.m_Log.Write("nsLycosIMAP.js - fetch - END");
            return true;
        }
        catch(err)
        {
             this.m_Log.DebugDump("nsLycosIMAP.js: fetch : Exception : "
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
            mainObject.m_Log.Write("nsLycosIMAP.js - fetchOnloadHandler - START");

            var httpChannel = event.QueryInterface(Components.interfaces.nsIHttpChannel);

            //if this fails we've gone somewhere new
            mainObject.m_Log.Write("nsLycos - fetchOnloadHandler - status :" +httpChannel.responseStatus );
            if (httpChannel.responseStatus != 200 && httpChannel.responseStatus != 207)
                throw new Error("return status " + httpChannel.responseStatus);

            //get uid list
            var aszResponses = szResponse.match(kLycosResponse);
            mainObject.m_Log.Write("nsLycosIMAP.js - fetchOnloadHandler - \n" + aszResponses);
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
            mainObject.m_Log.Write("nsLycosIMAP.js - fetchOnloadHandler - starting delay");
            mainObject.m_Timer.initWithCallback(callback,
                                                mainObject.m_iTime,
                                                Components.interfaces.nsITimer.TYPE_REPEATING_SLACK);

            mainObject.m_Log.Write("nsLycosIMAP.js - fetchOnloadHandler - END");
        }
        catch(err)
        {
             mainObject.m_Log.DebugDump("nsLycosIMAP.js: fetchOnloadHandler : Exception : "
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
            this.m_Log.Write("nsLycosIMAP.js - processFetch - START");

            if (this.m_aRawData.length>0)
            {
                var Item = this.m_aRawData.shift();
                this.processMSGItem(Item);
            }
            else
            {
                this.m_Log.Write("nsLycosIMAP.js - processFetch - all data handled");
                timer.cancel();
                delete this.m_aRawData;
                this.m_aRawData = this.range(this.m_szRange);
                this.m_Log.Write("nsLycosIMAP.js - notify - Range " +this.m_aRawData);

                if (this.m_szFlag.search(/Header/i)!=-1)
                {
                    this.m_Log.Write("nsLycosIMAP.js - processFetch - headers ");
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
                    this.m_Log.Write("nsLycosIMAP.js - processFetch - body ");
                    this.fetchBody();
                }
                else  //get message ids
                {
                    this.m_Log.Write("nsLycosIMAP.js - processFetch - ids ");

                    var callback = {
                          notify: function(timer) { this.parent.processIDs(timer)}
                    };
                    callback.parent = this;
                    this.m_Timer.initWithCallback(callback,
                                                  this.m_iTime,
                                                  Components.interfaces.nsITimer.TYPE_REPEATING_SLACK);
                }
            }
            this.m_Log.Write("nsLycosIMAP.js - processFetch - END");
        }
        catch(err)
        {
             this.m_Log.DebugDump("nsLycosIMAP.js: processFetch : Exception : "
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
            this.m_Log.Write("nsLycosIMAP.js - processIDs - START");

            var Item = null;
            if (this.m_aRawData.length>0)
            {
                Item = this.m_aRawData.shift();
                this.m_Log.Write("nsLycosIMAP.js - processIDs - Item " + Item);
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
                this.m_Log.Write("nsLycosIMAP.js - processIDs - all data handled");
                this.serverComms(this.m_iTag +" UID FETCH complete\r\n");
            }

            this.m_Log.Write("nsLycosIMAP.js - processIDs - END");
            return true;
        }
        catch(err)
        {
             this.m_Log.DebugDump("nsLycosIMAP.js: fetchIDs : Exception : "
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
            this.m_Log.Write("nsLycosIMAP.js - processHeaders - START");

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
                this.m_Log.Write("nsLycosIMAP.js - processHeaders - all data handled");
                this.serverComms(this.m_iTag +" OK UID FETCH complete\r\n");
            }

            this.m_Log.Write("nsLycosIMAP.js - processHeaders - END");
            return true;
        }
        catch(err)
        {
             this.m_Log.DebugDump("nsLycosIMAP.js: processHeaders : Exception : "
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
            this.m_Log.Write("nsLycosIMAP.js - fetchBody - START");

            if (this.m_aRawData.length>0)
            {
                this.m_iUID = this.m_aRawData.shift();
                var oHref = {value:null};
                var bMSG = this.m_oIMAPData.getMSGHref(this.m_szUserName, this.m_szSelectFolder, this.m_iUID, oHref);
                this.m_Log.Write("nsLycosIMAP.js - fetchBody - URI " +oHref.value );

                this.m_iStage = 0;
                this.m_HttpComms.setURI(oHref.value);
                this.m_HttpComms.setRequestMethod("GET");
                var bResult = this.m_HttpComms.send(this.fetchBodyOnloadHandler, this);

                if (!bResult) throw new Error("httpConnection returned false");
            }
            else
                throw new Error("NO IDs");

            this.m_Log.Write("nsLycosIMAP.js - fetchBody - END");
            return true;
        }
        catch(err)
        {
            this.m_Log.DebugDump("nsLycosIMAP.js: fetchBody : Exception : "
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
            mainObject.m_Log.Write("nsLycosIMAP.js - fetchBodyOnloadHandler - START");
            mainObject.m_Log.Write("nsLycosIMAP.js - fetchBodyOnloadHandler : " + mainObject.m_iStage);

            var httpChannel = event.QueryInterface(Components.interfaces.nsIHttpChannel);

            //if this fails we've gone somewhere new
            mainObject.m_Log.Write("nsLycos - fetchBodyOnloadHandler - status :" +httpChannel.responseStatus );
            if (httpChannel.responseStatus != 200 && httpChannel.responseStatus != 207)
                throw new Error("return status " + httpChannel.responseStatus);

            var szMsg = "* " + 1 +" FETCH (UID " + mainObject.m_iUID ; //id
            szMsg += " RFC822.SIZE " + szResponse.length ; //size
            szMsg += " BODY[] ";
            szMsg += "{" + szResponse.length + "}\r\n";
            szMsg += szResponse + ")\r\n";
            szMsg += "* FETCH (FLAGS (\\Seen \\Recent))\r\n" ; //flags
            szMsg += mainObject.m_iTag +" OK UID FETCH complete\r\n"
            mainObject.serverComms(szMsg);

            mainObject.m_oIMAPData.setMSGSeenFlag(mainObject.m_szUserName, mainObject.m_szSelectFolder, mainObject.m_iUID, true);
            mainObject.m_Log.Write("nsLycosIMAP.js - fetchBodyOnloadHandler - END");
            return true;
        }
        catch(err)
        {
            mainObject.m_Log.DebugDump("nsLycosIMAP.js: fetchBodyOnloadHandler : Exception : "
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
            this.m_Log.Write("nsLycosIMAP.js - store - START");
            this.m_Log.Write("nsLycosIMAP.js - store - range " + szRange + " szData "+ szData + " Item " +szDataItem );

            //construct MSG range
            delete this.m_aRawData;
            this.m_aRawData = this.range(szRange);
            this.m_Log.Write("nsLycosIMAP.js - store - Range " +this.m_aRawData);

            //check we have got something
            if (this.m_aRawData.length== 0)
            {
                this.m_Log.Write("nsLycosIMAP.js - store - no messages");
                this.serverComms(this.m_iTag +" NO STORE no messages\r\n");
                return false;
            }

            if (szDataItem.search(/seen/i)!=-1)
            {
                this.m_Log.Write("nsLycosIMAP.js - store - seen/Unseen");

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
                    this.m_Log.Write("nsLycosIMAP.js - store - Unseen");
                    this.m_bStoreStatus = false;
                    this.m_HttpComms.addData(kLycosUnReadSchema);
                }
                else
                {
                    this.m_Log.Write("nsLycosIMAP.js - store - seen");
                    this.m_bStoreStatus = true;
                    this.m_HttpComms.addData(kLycosReadSchema);
                }

                if (szDataItem.search(/delete/i)!=-1)
                {
                    this.m_Log.Write("nsLycosIMAP.js - store - delete");
                    this.m_bStoreDelete = true;
                }

                var bResult = this.m_HttpComms.send(this.storeOnloadHandler, this);
                if (!bResult) throw new Error("httpConnection returned false");
                this.m_Log.Write("nsLycosIMAP.js - store - seen");
            }
            else if (szDataItem.search(/delete/i)!=-1)
            {
                this.m_Log.Write("nsLycosIMAP.js - store - Delete");
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

            this.m_Log.Write("nsLycosIMAP.js - store - END");
            return true;
        }
        catch(err)
        {
             this.m_Log.DebugDump("nsLycosIMAP.js: store : Exception : "
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
            mainObject.m_Log.Write("nsLycosIMAP.js - storeOnloadHandler - START");
            mainObject.m_Log.Write("nsLycosIMAP.js - storeOnloadHandler : " + mainObject.m_iStage);

            //if this fails we've gone somewhere new
            var httpChannel = event.QueryInterface(Components.interfaces.nsIHttpChannel);
            mainObject.m_Log.Write("nsLycos - storeOnloadHandler - status :" +httpChannel.responseStatus );
            if (httpChannel.responseStatus != 200 && httpChannel.responseStatus != 201 )
                throw new Error("return status " + httpChannel.responseStatus);

            //get messages ID
            var oHref = {value:null};
            var oRead = {value:null};
            var oDelete = {value:null};
            var oSeqNum = {value:null};
            mainObject.m_Log.Write("nsLycosIMAP.js - storeOnloadHandler : " + mainObject.m_bStoreStatus);
            mainObject.m_oIMAPData.setMSGSeenFlag(mainObject.m_szUserName, mainObject.m_szSelectFolder,
                                                  mainObject.m_iUID, mainObject.m_bStoreStatus);
            var bMSG = mainObject.m_oIMAPData.getMSGStatus(mainObject.m_szUserName, mainObject.m_szSelectFolder, mainObject.m_iUID,
                                                           oHref, oRead, oDelete, oSeqNum);



            mainObject.serverComms(szResponse);

            if (mainObject.m_bStoreDelete)
            {
                mainObject.m_Log.Write("nsLycosIMAP.js - storeOnloadHandler - marks as deleted");
                mainObject.storeDelete( mainObject.m_iUID);
            }
            else
            {
                var szResponse = "* " + oSeqNum.value +" FETCH (UID " + mainObject.m_iUID ; //id
                szResponse+= " FLAGS (";
                szResponse+= oRead.value? "\\Seen ":"";
                szResponse+= oDelete.value? "\\Deleted ":"";
                szResponse+= "))\r\n";
            }

            if (mainObject.m_aRawData.length>0)
            {
                mainObject.m_Log.Write("nsLycosIMAP.js - storeOnloadHandler - next - ");

                var iUID = mainObject.m_aRawData.shift();
                var bMSG = mainObject.m_oIMAPData.getMSGHref(mainObject.m_szUserName, mainObject.m_szSelectFolder, iUID, oHref);
                mainObject.m_iUID = iUID;

                mainObject.m_HttpComms.setContentType("text/xml");
                mainObject.m_HttpComms.setURI(oHref.value);
                mainObject.m_HttpComms.setRequestMethod("PROPPATCH");

                if (mainObject.m_bStoreStatus)
                    mainObject.m_HttpComms.addData(kLycosReadSchema)
                else
                    mainObject.m_HttpComms.addData(kLycosUnReadSchema);

                var bResult = mainObject.m_HttpComms.send(mainObject.storeOnloadHandler, mainObject);
                if (!bResult) throw new Error("httpConnection returned false");
            }
            else
            {
                mainObject.m_Log.Write("nsLycosIMAP.js - storeOnloadHandler - done - ");
                var szResponse = mainObject.m_iTag +" OK FETCH complete\r\n"
                mainObject.serverComms(szResponse);
            }

            mainObject.m_Log.Write("nsLycosIMAP.js - storeOnloadHandler - END");
            return true;
        }
        catch(err)
        {
            mainObject.m_Log.DebugDump("nsLycosIMAP.js: storeOnloadHandler : Exception : "
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
            this.m_Log.Write("nsLycosIMAP.js - processDelete - START ");

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
             this.m_Log.DebugDump("nsLycosIMAP.js: processDelete : Exception : "
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
            this.m_Log.Write("nsLycosIMAP.js - processDelete - START " + Item);

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
                this.m_Log.Write("nsLycosIMAP.js - processDelete - all data handled");
                this.serverComms(this.m_iTag +" OK FETCH complete\r\n");
            }

            this.m_Log.Write("nsLycosIMAP.js - processDelete - END");
            return true;
        }
        catch(err)
        {
             this.m_Log.DebugDump("nsLycosIMAP.js: processDelete : Exception : "
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
            this.m_Log.Write("nsLycosIMAP.js - copy - START");
            this.m_Log.Write("nsLycosIMAP.js - copy - range " + szRange + " destination " + szDestination);

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
                this.m_Log.Write("nsLycosIMAP.js - copy - destination folder doesn't exist");
                this.serverComms(this.m_iTag +" NO [TRYCREATE] error\r\n");
                return false;
            }
            this.m_copyDest = oHref.value;

            this.m_Log.Write("nsLycosIMAP.js - copy - destination  folder" + this.m_copyDest);

            //construct MSG range
            delete this.m_aRawData;
            this.m_aRawData = this.range(szRange);
            this.m_Log.Write("nsLycosIMAP.js - copy - Range " +this.m_aRawData);

            if (this.m_aRawData.length== 0)
            {
                this.m_Log.Write("nsLycosIMAP.js - copy - no messages to move");
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
                this.m_Log.Write("nsLycosIMAP.js - copy - message not found");
                this.serverComms(this.m_iTag +" NO copy no messages\r\n");
                return false;
            }


            var szMSGID = oHref.value.match(/[^\/]+$/);
            this.m_Log.Write("nsLycosIMAP.js - copy - destination URI" + this.m_copyDest + szMSGID);

            this.m_HttpComms.setURI(oHref.value);
            this.m_HttpComms.setRequestMethod("MOVE");
            this.m_HttpComms.addRequestHeader("Destination", this.m_copyDest + szMSGID , false);
            var bResult = this.m_HttpComms.send(this.copyOnloadHandler, this);
            if (!bResult) throw new Error("httpConnection returned false");

            this.m_Log.Write("nsLycosIMAP.js - copy - END");
            return true;
        }
        catch(err)
        {
            this.m_Log.DebugDump("nsLycosIMAP.js: copy : Exception : "
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
            mainObject.m_Log.Write("nsLycosIMAP.js - copyOnloadHandler - START");
            mainObject.m_Log.Write("nsLycosIMAP.js - copyOnloadHandler : " + mainObject.m_iStage);

            var httpChannel = event.QueryInterface(Components.interfaces.nsIHttpChannel);

            //if this fails we've gone somewhere new
            mainObject.m_Log.Write("nsLycos - copyOnloadHandler - status :" +httpChannel.responseStatus );
            if (httpChannel.responseStatus != 200 && httpChannel.responseStatus != 201)
                throw new Error("return status " + httpChannel.responseStatus);

            mainObject.m_oIMAPData.copyMSG(mainObject.m_szUserName,
                                           mainObject.m_iUID,
                                           mainObject.m_szSelectFolder,
                                           mainObject.m_szDestinationFolder);


            if (mainObject.m_aRawData.length>0)
            {
                mainObject.m_Log.Write("nsLycosIMAP.js - copyOnloadHandler - next - ");

                var Item = mainObject.m_aRawData.shift();
                mainObject.m_iUID = Item;

                //get messages ID
                var oHref = {value:null};
                var bMSG = mainObject.m_oIMAPData.getMSGHref(mainObject.m_szUserName, mainObject.m_szSelectFolder, Item, oHref);

                var szMSGID = oHref.value.match(/[^\/]+$/);
                mainObject.m_Log.Write("nsLycosIMAP.js - copy - destination URI" + mainObject.m_copyDest + szMSGID);

                mainObject.m_HttpComms.setURI(oHref.value);
                mainObject.m_HttpComms.setRequestMethod("MOVE");
                mainObject.m_HttpComms.addRequestHeader("Destination", mainObject.m_copyDest + szMSGID, false);
                var bResult = mainObject.m_HttpComms.send(mainObject.copyOnloadHandler, mainObject);
                if (!bResult) throw new Error("httpConnection returned false");

                mainObject.m_iStage ++;
            }
            else
            {
                mainObject.m_Log.Write("nsLycosIMAP.js - copyOnloadHandler - done - ");
                //reset copy data
                mainObject.m_copyDest = null;
                mainObject.serverComms(mainObject.m_iTag +" OK COPY complete\r\n");
            }


            mainObject.m_Log.Write("nsLycosIMAP.js - copyOnloadHandler - END");
            return true;
        }
        catch(err)
        {
            mainObject.m_Log.DebugDump("nsLycosIMAP.js: copyloadHandler : Exception : "
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
            this.m_Log.Write("nsLycosIMAP.js - expunge - START");

            this.m_oIMAPData.deleteMSG(this.m_szUserName, this.m_szSelectFolder)


            //empty trash
            if (this.m_szSelectFolder.match(/^INBOX.Trash$/,i)!=-1)
            {
                //get trash
                this.m_HttpComms.setContentType("text/xml");
                var oHref = {value:null};
                var oUID = {value:null};
                var oMSGCount = {value:null};
                var oUnreadCount = {value:null};
                var oExpungeCount = {value:null};
                this.m_oIMAPData.getFolderDetails(this.m_szUserName, this.m_szSelectFolder,
                                                  oHref, oUID, oMSGCount, oUnreadCount, oExpungeCount);
                this.m_HttpComms.setURI(oHref.value);
                this.m_HttpComms.setRequestMethod("PROPFIND");
                this.m_HttpComms.addData(kLycosMailSchema);
                var bResult = this.m_HttpComms.send(this.emptyTrashOnloadHandler, this);
                if (!bResult) throw new Error("httpConnection returned false");
                this.m_iStage=0;
            }
            else
            {
                this.serverComms(this.m_iTag +" OK EXPUNGE COMPLETE\r\n");
            }
            this.m_Log.Write("nsLycosIMAP.js - expunge - END");
        }
        catch(err)
        {
            this.m_Log.DebugDump("nsLycosIMAP.js: expunge : Exception : "
                                              + err.name
                                              + ".\nError message: "
                                              + err.message+ "\n"
                                              + err.lineNumber);

            this.serverComms(this.m_iTag +" BAD error\r\n");
            return false;
        }
    },




    emptyTrashOnloadHandler : function (szResponse ,event , mainObject)
    {
        try
        {
            mainObject.m_Log.Write("nsLycos.js - emptyTrashOnloadHandler - START");
            mainObject.m_Log.Write("nsLycos.js - emptyTrashOnloadHandler : " + mainObject.m_iStage);

            var httpChannel = event.QueryInterface(Components.interfaces.nsIHttpChannel);

            //if this fails we've gone somewhere new
            mainObject.m_Log.Write("nsLycos - emptyTrashOnloadHandler - status :" +httpChannel.responseStatus );
            if (httpChannel.responseStatus <200 || httpChannel.responseStatus >300 )
                throw new Error("return status " + httpChannel.responseStatus);

            switch(mainObject.m_iStage)
            {

                case 0:
                    mainObject.m_aRawData = szResponse.match(kLycosResponse);
                    mainObject.m_Log.Write("nsLycos.js - emptyTrashOnloadHandler - trash - \n" +  mainObject.m_aRawData);
                    if (mainObject.m_aRawData)
                    {
                        mainObject.m_deleteResponse = "<?xml version=\"1.0\"?>\r\n<D:delete xmlns:D=\"DAV:\">\r\n<D:target>\r\n";

                        var callback = {
                            notify: function(timer) { this.parent.processItemDelete(timer)}
                         };
                        callback.parent = mainObject;

                        mainObject.m_Timer.initWithCallback(callback,
                                                            mainObject.m_iTime,
                                                            Components.interfaces.nsITimer.TYPE_REPEATING_SLACK);
                    }
                    else //no messages
                    {
                        mainObject.m_bAuthorised = false;
                        mainObject.serverComms(this.m_iTag +" OK EXPUNGE COMPLETE\r\n");
                    }
                break;

                case 1:
                    mainObject.m_bAuthorised = false;
                        mainObject.serverComms(this.m_iTag +" OK EXPUNGE COMPLETE\r\n");
                break;
            }

            mainObject.m_Log.Write("nsLycos.js - emptyTrashOnloadHandler - END");
        }
        catch(err)
        {
            mainObject.m_Log.DebugDump("nsLycos.js: emptyTrashOnloadHandler : Exception : "
                                              + err.name
                                              + ".\nError message: "
                                              + err.message+ "\n"
                                              + err.lineNumber);

            this.serverComms(this.m_iTag +" BAD error\r\n");
        }
    },





    processItemDelete: function(timer)
    {
        try
        {
            this.m_Log.Write("nsLycos.js - processItemDelete - START");

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
                var szMSGUri = Item.match(kLycosHref)[1]; //uri
                var szMsgID =  szMSGUri.match(kLycosMSGID); //id
                var temp ="<D:href>"+szMsgID+"</D:href>\r\n"
                this.m_deleteResponse += temp;
            }
            else
            {
                var oHref = {value:null};
                var oUID = {value:null};
                var oMSGCount = {value:null};
                var oUnreadCount = {value:null};
                var oExpungeCount = {value:null};
                this.m_oIMAPData.getFolderDetails(this.m_szUserName, this.m_szSelectFolder,
                                                  oHref, oUID, oMSGCount, oUnreadCount, oExpungeCount);

                this.m_deleteResponse += "</D:target>\r\n</D:delete>";
                this.m_HttpComms.setContentType("text/xml");
                this.m_HttpComms.setURI(oHref.value);
                this.m_HttpComms.setRequestMethod("BDELETE");
                this.m_HttpComms.addData(this.m_deleteResponse);
                var bResult = this.m_HttpComms.send(this.logoutOnloadHandler, this);
                if (!bResult) throw new Error("httpConnection returned false");
                this.m_iStage=1;
            }

            this.m_Log.Write("nsLycos.js - processItemDelete - END");
        }
        catch(err)
        {
            this.m_Timer.cancel();
            this.m_Log.DebugDump("nsLycos.js: processItemDelete : Exception : "
                                              + err.name
                                              + ".\nError message: "
                                              + err.message+ "\n"
                                              + err.lineNumber);

            this.serverComms(this.m_iTag +" BAD error\r\n");
        }
    },





    createFolder : function (szFolder)
    {
        try
        {
            this.m_Log.Write("nsLycosIMAP.js - createFolder - START");
            this.m_Log.Write("nsLycosIMAP.js - createFolder - folder " + szFolder);

            //check level
            var aszLevel = szFolder.split(".");
            if (aszLevel.length!=2)
            {
                this.serverComms(this.m_iTag +" NO too low level\r\n");
                this.m_Log.Write("nsLycosIMAP.js - createFolder - folder too low");
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
                     this.m_Log.Write("nsLycosIMAP.js - createFolder - exists");
                }
            }

            this.m_Log.Write("nsLycosIMAP.js - createFolder - END");
        }
        catch(err)
        {
            this.m_Log.DebugDump("nsLycosIMAP.js: createFolder : Exception : "
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
            mainObject.m_Log.Write("nsLycosIMAP.js - createFolderOnloadHandler - START");

            var httpChannel = event.QueryInterface(Components.interfaces.nsIHttpChannel);

            //if this fails we've gone somewhere new
            mainObject.m_Log.Write("nsLycos - createFolderOnloadHandler - status :" +httpChannel.responseStatus );
            if (httpChannel.responseStatus != 200 && httpChannel.responseStatus != 201)
                throw new Error("return status " + httpChannel.responseStatus);

            switch(mainObject.m_iStage)
            {
                case 0: //create done now get folder list
                    mainObject.m_Log.Write("nsLycosIMAP.js - createFolderOnloadHandler - get folder list - START");
                    mainObject.m_HttpComms.setContentType("text/xml");
                    mainObject.m_HttpComms.setRequestMethod("PROPFIND");
                    mainObject.m_HttpComms.addData(kLycosFolderSchema);
                    mainObject.m_HttpComms.setURI(mainObject.m_szFolderURI);
                    var bResult = mainObject.m_HttpComms.send(mainObject.listOnloadHandler, mainObject);
                    if (!bResult) throw new Error("httpConnection returned false");
                    mainObject.m_Log.Write("nsLycosIMAP.js - createFolderOnloadHandler - get folder list - END");
                break;


                case 1:  //add new folder details
                    mainObject.m_Log.Write("nsLycosIMAP.js - createFolderOnloadHandler - new folder details - START");

                    var aszResponses = szResponse.match(kLycosResponse);
                    mainObject.m_Log.Write("nsLycosIMAP.js - createFolderOnloadHandler - folders - \n" + aszResponses);
                    for (i=0; i<aszResponses.length; i++)
                    {
                        mainObject.processFolder(aszResponses[i]);
                    }

                    var szMsg = mainObject.m_iTag +" OK CREATE complete\r\n"
                    mainObject.serverComms(szMsg);
                    mainObject.m_szFolderName = null;
                    mainObject.m_Log.Write("nsLycosIMAP.js - createFolderOnloadHandler - new folder details - END");
                break;
            }



            mainObject.m_Log.Write("nsLycosIMAP.js - createFolderOnloadHandler - END");
            return true;
        }
        catch(err)
        {
            mainObject.m_Log.DebugDump("nsLycosIMAP.js: createFolderOnloadHandler : Exception : "
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
            this.m_Log.Write("nsLycosIMAP.js - deleteFolder - START");
            this.m_Log.Write("nsLycosIMAP.js - deleteFolder - folder " + szFolder);

            var oHref = {value:null};
            var oUID = {value:null};
            var oMSGCount = {value:null};
            var oUnreadCount = {value:null};
            var oExpungeCount = {value:null};
            if (this.m_oIMAPData.getFolderDetails(this.m_szUserName, szFolder,
                                                 oHref , oUID, oMSGCount, oUnreadCount, oExpungeCount))
            {
                this.m_Log.Write("nsLycosIMAP.js - deleteFolder - oHref.value " + oHref.value);
                this.m_szFolderName = szFolder;
                this.m_HttpComms.setURI(oHref.value);
                this.m_HttpComms.setRequestMethod("DELETE");
                var bResult = this.m_HttpComms.send(this.deleteFolderOnloadHandler, this);
                if (!bResult) throw new Error("httpConnection returned false");
            }
            else
                this.serverComms(this.m_iTag +" NO deleteFolder not supported\r\n");

            this.m_Log.Write("nsLycosIMAP.js - deleteFolder - END");
        }
        catch(err)
        {
            this.m_Log.DebugDump("nsLycosIMAP.js: deleteFolder : Exception : "
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
            mainObject.m_Log.Write("nsLycosIMAP.js - deleteFolderOnloadHandler - START");

            var httpChannel = event.QueryInterface(Components.interfaces.nsIHttpChannel);

            //if this fails we've gone somewhere new
            mainObject.m_Log.Write("nsLycos - deleteFolderOnloadHandler - status :" +httpChannel.responseStatus );
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
            mainObject.m_Log.Write("nsLycosIMAP.js - deleteFolderOnloadHandler - END");
            return true;
        }
        catch(err)
        {
            mainObject.m_Log.DebugDump("nsLycosIMAP.js: deleteFolderOnloadHandler : Exception : "
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
            this.m_Log.Write("nsLycosIMAP.js - renameFolder - START");
            this.m_Log.Write("nsLycosIMAP.js - renameFolder - oldfolder " + szOldFolder + " newFolder "+ szNewFolder);

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
                this.m_Log.Write("nsLycosIMAP.js - renameFolder - szOldFolder " + szOldFolderName);

                this.m_szFolderNewName = szNewFolder;
                var szNewFolderName = this.m_szFolderNewName.split(".")[1];
                this.m_Log.Write("nsLycosIMAP.js - renameFolder - szNewFolder " + szNewFolderName);

                //get details of old folder
                this.m_oIMAPData.getFolderDetails(this.m_szUserName, this.m_szFolderName,
                                                  oHref , oUID, oMSGCount, oUnreadCount, oExpungeCount);
                this.m_Log.Write("nsLycosIMAP.js - renameFolder - oHref.value " + oHref.value);
                var szNewFolderURI = oHref.value.replace(szOldFolderName, szNewFolderName);
                this.m_Log.Write("nsLycosIMAP.js - renameFolder - szNewFolderURI " + szNewFolderURI);
                this.m_szFolderReference = szNewFolderURI;

                this.m_HttpComms.setURI(oHref.value);
                this.m_HttpComms.setRequestMethod("MOVE");
                this.m_HttpComms.addRequestHeader("Destination", szNewFolderURI , false);
                var bResult = this.m_HttpComms.send(this.renameFolderOnloadHandler, this);
                if (!bResult) throw new Error("httpConnection returned false");
            }
            else
                this.serverComms(this.m_iTag +" NO renameFolder found\r\n");

            this.m_Log.Write("nsLycosIMAP.js - renameFolder - END");
        }
        catch(err)
        {
            this.m_Log.DebugDump("nsLycosIMAP.js: renameFolder : Exception : "
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
            mainObject.m_Log.Write("nsLycosIMAP.js - renameFolderOnloadHandler - START");

            //if this fails we've gone somewhere new
            var httpChannel = event.QueryInterface(Components.interfaces.nsIHttpChannel);
            mainObject.m_Log.Write("nsLycos - renameOnloadHandler - status :" +httpChannel.responseStatus );
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
            mainObject.m_Log.Write("nsLycosIMAP.js - renameFolderOnloadHandler - END");
            return true;
        }
        catch(err)
        {
            mainObject.m_Log.DebugDump("nsLycosIMAP.js: renameFolderOnloadHandler : Exception : "
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
            this.m_Log.Write("nsLycosIMAP.js - range - START");
            this.m_Log.Write("nsLycosIMAP.js - range - szRange " + szRange);

            var aTempRange = szRange.split(",");
            this.m_Log.Write("nsLycosIMAP.js - range - aTempRange " +aTempRange);

            var aRange = new Array();
            for (var i=0; i<aTempRange.length; i++)
            {
                if (aTempRange[i].search(/\:/)!=-1)
                {
                    this.m_Log.Write("nsLycosIMAP.js - range - found range");

                    var aWildCardTemp = aTempRange[i].split(/\:/);
                    this.m_Log.Write("nsLycosIMAP.js - range - aWildCardTemp "+aWildCardTemp);
                    var min = aWildCardTemp[0];
                    var max = -1;
                    if (aWildCardTemp[1].search(/\d/)!=-1) max = aWildCardTemp[1];
                    this.m_Log.Write("nsLycosIMAP.js - range - min " + min + " max " +max );

                    var aiIDs = {value : null};
                    var iCount = {value : null };
                    this.m_oIMAPData.getRangeMSGIDs(this.m_szUserName, this.m_szSelectFolder,
                                                    min, max, iCount, aiIDs);
                    this.m_Log.Write("nsLycosIMAP.js - range - aiIDs "+aiIDs.value);
                    aRange = aRange.concat(aiIDs.value);
                }
                else
                    aRange.push( aTempRange[i]);
            }

            this.m_Log.Write("nsLycosIMAP.js - range - aRange "+ aRange);
            this.m_Log.Write("nsLycosIMAP.js - range - END");
            return aRange;
        }
        catch(err)
        {
            this.m_Log.DebugDump("nsLycosIMAP.js: range : Exception : "
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
            this.m_Log.Write("nsLycosIMAP.js - logOUT - START");

            this.m_bAuthorised = false;
            var szResponse = "* BYE IMAP4rev1 Server logout\r\n";
            szResponse += this.m_iTag +" OK Logout Completed\r\n"
            this.serverComms(szResponse);

            this.m_Log.Write("nsLycosIMAP.js - logOUT - END");
            return true;
        }
        catch(e)
        {
            this.m_Log.DebugDump("nsLycosIMAP.js: logOUT : Exception : "
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
            this.m_Log.Write("nsLycosIMAP.js - close - START");
            this.serverComms(this.m_iTag +" OK CLOSE complete\r\n");
            this.m_Log.Write("nsLycosIMAP.js - close - END");
        }
        catch(err)
        {
            this.m_Log.DebugDump("nsLycosIMAP.js: close : Exception : "
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
            this.m_Log.Write("nsLycosIMAP.js - check - START");
            this.serverComms(this.m_iTag +" OK CHECK complete\r\n");
            this.m_Log.Write("nsLycosIMAP.js - check - END");
        }
        catch(err)
        {
            this.m_Log.DebugDump("nsLycosIMAP.js: check : Exception : "
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
            this.m_Log.Write("nsLycosIMAP.js - examine - START");
            this.serverComms(this.m_iTag +" NO examine\r\n");
            this.m_Log.Write("nsLycosIMAP.js - examine - END");
        }
        catch(err)
        {
            this.m_Log.DebugDump("nsLycosIMAP.js: examine : Exception : "
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
            this.m_Log.Write("nsLycosIMAP.js - serverComms - START");
            this.m_Log.Write("nsLycosIMAP.js - serverComms msg " + szMsg);
            var iCount = this.m_oResponseStream.write(szMsg,szMsg.length);
            this.m_Log.Write("nsLycosIMAP.js - serverComms sent count: " + iCount
                                                        +" msg length: " +szMsg.length);
            this.m_Log.Write("nsLycosIMAP.js - serverComms - END");
        }
        catch(e)
        {
            this.m_Log.DebugDump("nsLycos.js: serverComms : Exception : "
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
var nsLycosIMAPFactory = new Object();

nsLycosIMAPFactory.createInstance = function (outer, iid)
{
    if (outer != null) throw Components.results.NS_ERROR_NO_AGGREGATION;

    if (!iid.equals(nsLycosIMAPClassID) && !iid.equals(Components.interfaces.nsISupports))
        throw Components.results.NS_ERROR_INVALID_ARG;

    return new nsLycosIMAP();
}


/******************************************************************************/
/* MODULE */
var nsLycosIMAPModule = new Object();

nsLycosIMAPModule.registerSelf = function(compMgr, fileSpec, location, type)
{
    compMgr = compMgr.QueryInterface(Components.interfaces.nsIComponentRegistrar);
    compMgr.registerFactoryLocation(nsLycosIMAPClassID,
                                    "LycosIMAPComponent",
                                    nsLycosIMAPContactID,
                                    fileSpec,
                                    location,
                                    type);
}


nsLycosIMAPModule.unregisterSelf = function(aCompMgr, aFileSpec, aLocation)
{
    aCompMgr = aCompMgr.QueryInterface(Components.interfaces.nsIComponentRegistrar);
    aCompMgr.unregisterFactoryLocation(nsLycosIMAPClassID, aFileSpec);
}


nsLycosIMAPModule.getClassObject = function(compMgr, cid, iid)
{
    if (!cid.equals(nsLycosIMAPClassID))
        throw Components.results.NS_ERROR_NO_INTERFACE;

    if (!iid.equals(Components.interfaces.nsIFactory))
        throw Components.results.NS_ERROR_NOT_IMPLEMENTED;

    return nsLycosIMAPFactory;
}


nsLycosIMAPModule.canUnload = function(compMgr)
{
    return true;
}
/******************************************************************************/


function NSGetModule(compMgr, fileSpec)
{
    return nsLycosIMAPModule;
}
