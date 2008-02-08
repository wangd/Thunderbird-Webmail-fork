/*****************************  Globals   *************************************/
const nsLycosClassID = Components.ID("{222b6e70-8a87-11d9-9669-0800200c9a66}");
const nsLycosContactID = "@mozilla.org/LycosPOP;1";


/***********************  Lycos ********************************/


function nsLycos()
{
    try
    {
        var scriptLoader =  Components.classes["@mozilla.org/moz/jssubscript-loader;1"];
        scriptLoader = scriptLoader.getService(Components.interfaces.mozIJSSubScriptLoader);
        scriptLoader.loadSubScript("chrome://web-mail/content/common/DebugLog.js");
        scriptLoader.loadSubScript("chrome://web-mail/content/common/HttpComms3.js");
        scriptLoader.loadSubScript("chrome://web-mail/content/common/CommonPrefs.js");
        scriptLoader.loadSubScript("chrome://lycos/content/Lycos-POPMSG.js");

        var date = new Date();
        var  szLogFileName = "Lycos Log - " + date.getHours()+ "-" + date.getMinutes() + "-"+ date.getUTCMilliseconds() +" -";
        this.m_Log = new DebugLog("webmail.logging.comms",
                                  "{3c8e8390-2cf6-11d9-9669-0800200c9a66}" ,
                                  szLogFileName);
        delete date;

        this.m_Log.Write("nsLycos.js - Constructor - START");


        if (typeof kLycosConstants == "undefined")
        {
            this.m_Log.Write("nsLycos.js - Constructor - loading constants");
            scriptLoader.loadSubScript("chrome://lycos/content/Lycos-Constants.js");
        }

        this.m_szUserName = null;
        this.m_szPassWord = null;
        this.m_oResponseStream = null;
        this.m_HttpComms = new HttpComms(this.m_Log);
        this.m_HttpComms.setHandleHttpAuth(true);
        this.m_bAuthorised = false;
        this.m_iStage=0;
        this.m_aszFolderURLList = new Array();
        this.m_szTrashURI=null;
        this.m_szMSG = null;
        this.m_aMsgDataStore = new Array();
        this.m_iTotalSize = 0;
        this.m_bJunkMail = false;
        this.m_aRawData = new Array();
        this.m_deleteResponse = null;

        this.m_iTime = 10;
        this.m_iProcessAmount =  25;
        this.m_iProcessTrigger = 50;
        this.m_bReUseSession = true;
        this.m_bUseJunkMail= false;
        this.m_bDownloadUnread = false;
        this.m_bMarkAsRead = true;
        this.m_iHandleCount = 0;
        this.m_aszFolder = new Array();
        this.m_bEmptyTrash = false;

        this.m_Timer = Components.classes["@mozilla.org/timer;1"];
        this.m_Timer = this.m_Timer.createInstance(Components.interfaces.nsITimer);

        this.m_bStat = false;
        this.m_Log.Write("nsLycos.js - Constructor - END");
    }
    catch(e)
    {
        DebugDump("nsLycos.js: Constructor : Exception : "
                                      + e.name
                                      + ".\nError message: "
                                      + e.message+ "\n"
                                      + e.lineNumber);
    }
}



nsLycos.prototype =
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
            this.m_Log.Write("nsLycos.js - logIN - START");
            this.m_Log.Write("nsLycos.js - logIN - Username: " + this.m_szUserName
                                                   + " Password: "  + this.m_szPassWord
                                                   + " stream: "    + this.m_oResponseStream);

            if (!this.m_szUserName || !this.m_oResponseStream || !this.m_szPassWord) return false;

            var szTempUserName = this.m_szUserName.split("@");
            this.m_Log.Write("nsLycos.js - logIN - doamain " + szTempUserName);
            var szDomain = szTempUserName[1];

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
            else if (szDomain.search(/caramail.com/i)!=-1)
                szLocation= "http://webdav.caramail.lycos.fr/httpmail.asp";
            else
                throw new Error("Unknown domain");

            this.loadPrefs();   //get prefs

            if (!this.m_bReUseSession)
            {
                this.m_Log.Write("nsLycos.js - logIN - Looking for Session Data");
                var oCookies = Components.classes["@mozilla.org/nsWebMailCookieManager2;1"]
                                         .getService(Components.interfaces.nsIWebMailCookieManager2);
                oCookies.removeCookie(this.m_szUserName);

                var oAuth = Components.classes["@mozilla.org/HttpAuthManager2;1"]
                                      .getService(Components.interfaces.nsIHttpAuthManager2);
                oAuth.removeToken(this.m_szUserName);
            }


            this.m_HttpComms.setUserName(this.m_szUserName);
            this.m_HttpComms.setPassword(this.m_szPassWord);
            this.m_HttpComms.setContentType("text/xml");
            this.m_HttpComms.setURI(szLocation);
            this.m_HttpComms.setRequestMethod("PROPFIND");
            this.m_HttpComms.addData(kLycosSchema);
            var bResult = this.m_HttpComms.send(this.loginOnloadHandler, this);
            if (!bResult) throw new Error("httpConnection returned false");

            this.m_Log.Write("nsLycos.js - logIN - END " + bResult);
            return true;
        }
        catch(e)
        {
            this.m_Log.DebugDump("nsLycos.js: logIN : Exception : "
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
            mainObject.m_Log.Write("nsLycos.js - loginOnloadHandler - START");
            mainObject.m_Log.Write("nsLycos.js - loginOnloadHandler : "+ mainObject.m_iStage);

            var httpChannel = event.QueryInterface(Components.interfaces.nsIHttpChannel);

            //if this fails we've gone somewhere new
            mainObject.m_Log.Write("nsLycos - loginOnloadHandler - status :" +httpChannel.responseStatus );
            if (httpChannel.responseStatus != 200 && httpChannel.responseStatus != 207)
                throw new Error("return status " + httpChannel.responseStatus);

             switch(mainObject.m_iStage)
            {
                case 0: //get baisc uri's
                    var szFolderURI = szResponse.match(kLycosFolder)[1];
                    mainObject.m_Log.Write("nsLycos.js - loginOnloadHandler - get folder url - " + szFolderURI);
                    mainObject.m_szTrashURI = szResponse.match(kLycosTrash)[1];
                    mainObject.m_Log.Write("nsLycos.js - loginOnloadHandler - get trash url - " + mainObject.m_szTrashURI);

                    //download folder list;
                    mainObject.m_iStage = 1;
                    mainObject.m_HttpComms.setContentType("text/xml");
                    mainObject.m_HttpComms.setURI(szFolderURI);
                    mainObject.m_HttpComms.setRequestMethod("PROPFIND");
                    mainObject.m_HttpComms.addData(kLycosFolderSchema);
                    var bResult = mainObject.m_HttpComms.send(mainObject.loginOnloadHandler, mainObject);
                    if (!bResult) throw new Error("httpConnection returned false");
                break;

                 case 1: //process folder uri's

                    var aszFolderList = szResponse.match(kLycosResponse );
                    mainObject.m_Log.Write("nsLycos.js - loginOnloadHandler - aszFolderList :" +aszFolderList);

                    for (j=0; j<mainObject.m_aszFolder.length; j++)
                    {
                        var regExp = new RegExp("^"+mainObject.m_aszFolder[j]+"$","i");
                        mainObject.m_Log.Write("nsLycos.js - loginOnloadHandler - regExp : "+regExp );

                        var i =0;
                        var bFound = false;
                        do{
                            var szFolderURL = aszFolderList[i].match(kLycosHref )[1];
                            mainObject.m_Log.Write("nsLycos.js - loginOnloadHandler - szFolderURL : "+szFolderURL );
                            var szFolderName = szFolderURL.match(kLycosFolderName )[1];
                            mainObject.m_Log.Write("nsLycos.js - loginOnloadHandler - szFolderName : "+szFolderName );
                            var szDisplayName = "";
                            if (aszFolderList[i].search(kLycosDisplayName )!=-1)
                                szDisplayName =aszFolderList[i].match(kLycosDisplayName)[1];
                            mainObject.m_Log.Write("nsLycos.js - loginOnloadHandler - szDisplayName : "+szDisplayName );

                            if (szFolderName.search(regExp)>=0 || szDisplayName.search(regExp) >=0)
                            {
                                bFound = true;
                                mainObject.m_aszFolderURLList.push(szFolderURL);
                                mainObject.m_Log.Write("nsLycos.js - loginOnloadHandler - URL found : "+szFolderURL);
                            }
                            i++;
                        }while (i<aszFolderList.length && !bFound)
                    }


                    //server response
                    mainObject.serverComms("+OK Your in\r\n");
                    mainObject.m_bAuthorised = true;
                break;
            }

            mainObject.m_Log.Write("nsLycos.js - loginOnloadHandler - END");
        }
        catch(err)
        {
            var oCookies = Components.classes["@mozilla.org/nsWebMailCookieManager2;1"]
                                     .getService(Components.interfaces.nsIWebMailCookieManager2);
            oCookies.removeCookie(mainObject.m_szUserName);

            var oAuth = Components.classes["@mozilla.org/HttpAuthManager2;1"]
                                  .getService(Components.interfaces.nsIHttpAuthManager2);
            oAuth.removeToken(mainObject.m_szUserName);

            mainObject.m_Log.DebugDump("nsLycos.js: loginHandler : Exception : "
                                          + err.name
                                          + ".\nError message: "
                                          + err.message+ "\n"
                                          + err.lineNumber);
            mainObject.serverComms("-ERR Comms Error from "+ mainObject.m_szUserName+"\r\n");
        }
    },



    //stat
    //total size is in octets
    getNumMessages : function()
    {
        try
        {
            this.m_Log.Write("nsLycos.js - getNumMessages - START");

            this.m_Log.Write("Lycos.js - getNumMessages - mail box url " + this.m_aszFolderURLList);
            if (this.m_aszFolderURLList.length==0) return false;

            this.mailBox(true);

            this.m_Log.Write("nsLycos.js - getNumMessages - END");
            return true;
        }
        catch(e)
        {
            this.m_Log.DebugDump("nsLycos.js: getNumMessages : Exception : "
                                          + e.name
                                          + ".\nError message: "
                                          + e.message+ "\n"
                                          + e.lineNumber);
            return false;
        }
    },



    mailBox : function (bState)
    {
        this.m_iStage=0;
        this.m_HttpComms.setContentType("text/xml");
        var szUri = this.m_aszFolderURLList.shift();
        this.m_HttpComms.setURI(szUri);
        this.m_HttpComms.setRequestMethod("PROPFIND");
        this.m_HttpComms.addData(kLycosMailSchema);
        var bResult = this.m_HttpComms.send(this.mailBoxOnloadHandler, this);
        if (!bResult) throw new Error("httpConnection returned false");
        this.m_bStat = bState;
    },



    mailBoxOnloadHandler : function (szResponse ,event , mainObject)
    {
        try
        {
            mainObject.m_Log.Write("nsLycos.js - mailBoxOnloadHandler - START");
            mainObject.m_Log.Write("nsLycos.js - mailBoxOnloadHandler : " + mainObject.m_iStage);

            var httpChannel = event.QueryInterface(Components.interfaces.nsIHttpChannel);

            //if this fails we've gone somewhere new
            mainObject.m_Log.Write("nsLycos - mailBoxOnloadHandler - status :" +httpChannel.responseStatus );
            if (httpChannel.responseStatus != 200 && httpChannel.responseStatus != 207)
                throw new Error("return status " + httpChannel.responseStatus);

            var aszResponses = szResponse.match(kLycosResponse);
            mainObject.m_Log.Write("nsLycos.js - mailBoxOnloadHandler - mailbox - \n" + aszResponses);
            if (aszResponses)
            {
                var aTemp = mainObject.m_aRawData.concat(aszResponses);
                delete mainObject.m_aRawData;
                mainObject.m_aRawData = aTemp;
            }

            if (mainObject.m_aszFolderURLList.length>0)
            {
                var szUri = mainObject.m_aszFolderURLList.shift();
                //load next folder
                mainObject.m_HttpComms.setContentType("text/xml");
                mainObject.m_HttpComms.setURI(szUri);
                mainObject.m_HttpComms.setRequestMethod("PROPFIND");
                mainObject.m_HttpComms.addData(kLycosMailSchema);
                var bResult = mainObject.m_HttpComms.send(mainObject.mailBoxOnloadHandler, mainObject);
                if (!bResult) throw new Error("httpConnection returned false");
            }
            else
            {
                mainObject.m_Log.Write("nsLycos.js - mailBoxOnloadHandler - download complet e- starting delay");
                //start timer
                var callback = {
                    notify: function(timer) { this.parent.processItem(timer)}
                 };
                callback.parent = mainObject;

                mainObject.m_Timer.initWithCallback(callback,
                                                    mainObject.m_iTime,
                                                    Components.interfaces.nsITimer.TYPE_REPEATING_SLACK);
            }

            mainObject.m_Log.Write("nsLycos.js - mailBoxOnloadHandler - END");
        }
        catch(err)
        {
             mainObject.m_Log.DebugDump("nsLycos.js: MailboxOnload : Exception : "
                                              + err.name
                                              + ".\nError message: "
                                              + err.message + "\n"
                                              + err.lineNumber);

            mainObject.serverComms("-ERR Comms Error from "+ mainObject.m_szUserName+"\r\n");
        }
    },



    processItem : function(timer)
    {
        try
        {
            this.m_Log.Write("nsLycos.js - notify - START");

            if (this.m_aRawData.length>0)
            {
                var iCount=0;
                do{
                    var Item = this.m_aRawData.shift();
                    var bRead = true;
                    if (this.m_bDownloadUnread)
                    {
                        bRead = parseInt(Item.match(kLycosRead)[1]) ? false : true;
                        this.m_Log.Write("nsLycos.js - mailBoxOnloadHandler - bRead -" + bRead);
                    }

                    if (bRead)
                    {
                        var data = new LycosPOPMSG();
                        data.szMSGUri = Item.match(kLycosHref)[1]; //uri
                        data.iSize = parseInt(Item.match(kLycosSize)[1]);//size
                        this.m_iTotalSize += data.iSize;

                        //set junk mail status
                        if (this.m_szJunkMailURI)
                        {
                            if(data.szMSGUri.search(this.m_szJunkMailURI)!=-1)
                               data.bJunkFolder = true;
                        }

                        var szTO="";
                        try
                        {
                            szTO = Item.match(kLycosTo)[1].match(/[\S\d]*@[\S\d]*/);
                        }
                        catch(err)
                        {
                            szTO = Item.match(kLycosTo)[1];
                        }
                        data.szTo = szTO;

                        var szFrom = "";
                        try
                        {
                            szFrom = Item.match(kLycosFrom)[1].match(/[\S\d]*@[\S\d]*/);
                        }
                        catch(err)
                        {
                            szFrom = Item.match(kLycosFrom)[1];
                        }
                        data.szFrom = szFrom;

                        var szSubject= "";
                        try
                        {
                            szSubject= Item.match(kLycosSubject)[1];
                        }
                        catch(err){}
                        data.szSubject = szSubject;

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
                            data.szDate = date.toGMTString();
                        }
                        catch(err){}

                        this.m_aMsgDataStore.push(data);
                    }
                    iCount++;
                    this.m_Log.Write("nsLycos.js - notify - rawData icount " + iCount + " " + this.m_aRawData.length);
                }while(iCount != this.m_iProcessAmount && this.m_aRawData.length!=0)
            }
            else
            {
                this.m_Log.Write("nsLycos.js - notify - all data handled");
                timer.cancel();
                delete  this.m_aRawData;

                if (this.m_bStat) //called by stat
                {
                    this.serverComms("+OK "+ this.m_aMsgDataStore.length
                                        + " " + this.m_iTotalSize + "\r\n");
                }
                else //called by list
                {
                    var callback = {
                       notify: function(timer) { this.parent.processSizes(timer)}
                    };
                    callback.parent = this;
                    this.m_iHandleCount = 0;
                    this.m_Timer.initWithCallback(callback,
                                                  this.m_iTime,
                                                  Components.interfaces.nsITimer.TYPE_REPEATING_SLACK);
                }
            }

            this.m_Log.Write("nsLycos.js - notify - END");
        }
        catch(err)
        {
            this.m_Timer.cancel();
            this.m_Log.DebugDump("nsLycos.js: notify : Exception : "
                                              + err.name
                                              + ".\nError message: "
                                              + err.message+ "\n"
                                              + err.lineNumber);

            this.serverComms("-ERR negative vibes from " +this.m_szUserName+ "\r\n");
        }
    },



    //list
    getMessageSizes : function()
    {
        try
        {
            this.m_Log.Write("nsLycos.js - getMessageSizes - START");

            if (this.m_bStat)
            {  //msg table has been donwloaded
                this.m_Log.Write("nsLycos.js - getMessageSizes - getting sizes");

                var callback = {
                   notify: function(timer) { this.parent.processSizes(timer)}
                };
                callback.parent = this;
                this.m_iHandleCount = 0;
                this.m_Timer.initWithCallback(callback,
                                              this.m_iTime,
                                              Components.interfaces.nsITimer.TYPE_REPEATING_SLACK);
            }
            else
            { //download msg list
                this.m_Log.Write("Lycos.js - getNumMessages - mail box url " + this.m_aszFolderURLList);
                if (this.m_aszFolderURLList.length==0) return false;
                this.mailBox(false);
            }

            this.m_Log.Write("nsLycos.js - getMessageSizes - END");
            return true;
        }
        catch(e)
        {
            this.m_Log.DebugDump("nsLycos.js: getMessageSizes : Exception : "
                                          + e.name
                                          + ".\nError message: "
                                          + e.message+ "\n"
                                          + e.lineNumber);
            return false;
        }
    },



    processSizes : function(timer)
    {
        try
        {
            this.m_Log.Write("nsLycos.js - processSizes - START");

            //response start
            if (this.m_iHandleCount ==  0)
                this.serverComms("+OK " + this.m_aMsgDataStore.length + " Messages\r\n")


            if ( this.m_aMsgDataStore.length > 0)
            {
                var iCount = 0;
                do{
                    var iEmailSize = this.m_aMsgDataStore[this.m_iHandleCount].iSize;
                    this.serverComms((this.m_iHandleCount+1) + " " + iEmailSize + "\r\n");
                    this.m_iHandleCount++;
                    iCount++;
                }while(iCount != this.m_iProcessAmount && this.m_iHandleCount!=this.m_aMsgDataStore.length)
            }

            //response end
            if (this.m_iHandleCount == this.m_aMsgDataStore.length)
            {
              this.serverComms(".\r\n");
              timer.cancel();
            }

            this.m_Log.Write("nsLycos.js - processSizes - END");
        }
        catch(err)
        {
            this.m_Timer.cancel();
            this.m_Log.DebugDump("nsLycos.js: processSizes : Exception : "
                                              + err.name
                                              + ".\nError message: "
                                              + err.message+ "\n"
                                              + err.lineNumber);

            this.serverComms("-ERR negative vibes from " +this.m_szUserName+ "\r\n");
        }
    },




    //IUDL
    getMessageIDs : function()
    {
        try
        {
            this.m_Log.Write("nsLycos.js - getMessageIDs - START");

            var callback = {
               notify: function(timer) { this.parent.processIDS(timer)}
            };
            callback.parent = this;
            this.m_iHandleCount = 0;
            this.m_Timer.initWithCallback(callback,
                                          this.m_iTime,
                                          Components.interfaces.nsITimer.TYPE_REPEATING_SLACK);

            this.m_Log.Write("nsLycos.js - getMessageIDs - END");
            return true;
        }
        catch(e)
        {
            this.m_Log.DebugDump("nsLycos.js: getMessageIDs : Exception : "
                                          + e.name
                                          + ".\nError message: "
                                          + e.message+ "\n"
                                          + e.lineNumber);
            return false;
        }
    },




    processIDS : function(timer)
    {
        try
        {
            this.m_Log.Write("nsLycos.js - processIDS - START");

            //response start
            if (this.m_iHandleCount ==  0)
                this.serverComms("+OK " + this.m_aMsgDataStore.length + " Messages\r\n");


            if ( this.m_aMsgDataStore.length > 0)
            {
                var iCount = 0;
                do{
                    var szEmailID = this.m_aMsgDataStore[this.m_iHandleCount].szID;

                    var szURL = this.m_aMsgDataStore[this.m_iHandleCount].szMSGUri;
                    this.m_Log.Write("nsLycos.js - getMessageIDs - Email URL : " +szURL);

                    var szEmailID = szURL.match(kLycosMSGID);
                    this.m_Log.Write("nsLycos.js - getMessageIDs - IDS : " +szEmailID);

                    this.serverComms((this.m_iHandleCount+1) + " " + szEmailID + "\r\n");
                    this.m_iHandleCount++;
                    iCount++;
                }while(iCount != this.m_iProcessAmount && this.m_iHandleCount!=this.m_aMsgDataStore.length)
            }


            //response end
            if (this.m_iHandleCount == this.m_aMsgDataStore.length)
            {
                this.serverComms(".\r\n");
                timer.cancel();
            }

            this.m_Log.Write("nsLycos.js - processIDS - END");
        }
        catch(err)
        {
            this.m_Timer.cancel();
            this.m_Log.DebugDump("nsLycos.js: processIDS : Exception : "
                                              + err.name
                                              + ".\nError message: "
                                              + err.message+ "\n"
                                              + err.lineNumber);

            this.serverComms("-ERR negative vibes from " +this.m_szUserName+ "\r\n");
        }
    },





    //top
    getMessageHeaders : function(lID)
    {
        try
        {
            this.m_Log.Write("nsLycos.js - getHeaders - START");
            this.m_Log.Write("nsLycos.js - getHeaders - id " + lID );

            var oMSG = this.m_aMsgDataStore[lID-1];

            var szHeaders = "X-WebMail: true\r\n";
            szHeaders += "X-JunkFolder: " +(oMSG.bJunkFolder? "true":"false")+ "\r\n";
            szHeaders += "To: "+ oMSG.szTo +"\r\n";
            szHeaders += "From: "+ oMSG.szFrom +"\r\n";
            szHeaders += "Subject: "+ oMSG.szSubject +"\r\n";
            szHeaders += "Date: " + oMSG.szDate +"\r\n"; // \r\n";
            szHeaders = szHeaders.replace(/^\./mg,"..");    //bit padding
            szHeaders += "\r\n.\r\n";//msg end

            var  szResponse = "+OK " +szHeaders.length + "\r\n";
            szResponse += szHeaders
            this.serverComms(szResponse);

            this.m_Log.Write("nsLycos.js - getHeaders - END");
            return true;
        }
        catch(err)
        {
            this.m_Log.DebugDump("nsLycos.js: getHeaders : Exception : "
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
            this.m_Log.Write("nsLycos.js - getMessage - START");
            this.m_Log.Write("nsLycos.js - getMessage - msg num" + lID);
            this.m_iStage=0;

            //get msg id
            var oMSG = this.m_aMsgDataStore[lID-1];
            var szMsgID = oMSG.szMSGUri;
            this.m_Log.Write("nsLycos.js - getMessage - msg id" + szMsgID);

            this.m_bJunkMail = oMSG.bJunkFolder;
            this.m_iStage =0;
            //get msg from lycos
            this.m_HttpComms.setURI(szMsgID);
            this.m_HttpComms.setRequestMethod("GET");
            var bResult = this.m_HttpComms.send(this.emailOnloadHandler, this);
            if (!bResult) throw new Error("httpConnection returned false");

            this.m_Log.Write("nsLycos.js - getMessage - END");
            return true;
        }
        catch(e)
        {
             this.m_Log.DebugDump("nsLycos.js: getMessage : Exception : "
                                          + e.name +
                                          ".\nError message: "
                                          + e.message+ "\n"
                                          + e.lineNumber);
            return false;
        }
    },


    emailOnloadHandler : function (szResponse ,event , mainObject)
    {
        try
        {
            mainObject.m_Log.Write("nsLycos.js - emailOnloadHandler - START");
            mainObject.m_Log.Write("nsLycos.js - emailOnloadHandler : \n" + szResponse);
            mainObject.m_Log.Write("nsLycos.js - emailOnloadHandler : " + mainObject.m_iStage);

            var httpChannel = event.QueryInterface(Components.interfaces.nsIHttpChannel);

            //if this fails we've gone somewhere new
            mainObject.m_Log.Write("nsLycos - emailOnloadHandler - status :" +httpChannel.responseStatus );
            if (httpChannel.responseStatus != 200)
                throw new Error("return status " + httpChannel.responseStatus);

             switch(mainObject.m_iStage)
            {
                case 0:  //email
                    mainObject.m_szMSG = "X-WebMail: true\r\n";
                    mainObject.m_szMSG += "X-JunkFolder: " +(mainObject.m_bJunkMail? "true":"false")+ "\r\n";
                    mainObject.m_szMSG +=szResponse;
                    mainObject.m_szMSG = mainObject.m_szMSG.replace(/^\./mg,"..");    //bit padding
                    mainObject.m_szMSG += "\r\n.\r\n";//msg end

                    if (!mainObject.m_bMarkAsRead)
                    {
                        //mark email as read
                        mainObject.m_HttpComms.setContentType("text/xml");
                        var szUri = httpChannel.URI.spec;
                        mainObject.m_HttpComms.setURI(szUri);
                        mainObject.m_HttpComms.setRequestMethod("PROPPATCH");
                        mainObject.m_HttpComms.addData(kLycosUnReadSchema);
                        var bResult = mainObject.m_HttpComms.send(mainObject.emailOnloadHandler, mainObject);
                        mainObject.m_iStage++;
                     }
                     else
                     {
                        var szPOPResponse = "+OK " +mainObject.m_szMSG.length + "\r\n";
                        szPOPResponse += mainObject.m_szMSG;
                        mainObject.serverComms(szPOPResponse);
                     }
                break;

                case 1: //mark as read
                    var szPOPResponse = "+OK " +mainObject.m_szMSG.length + "\r\n";
                    szPOPResponse += mainObject.m_szMSG;
                    mainObject.serverComms(szPOPResponse);
                break;
            }
            mainObject.m_Log.Write("nsLycos.js - emailOnloadHandler - end");
        }
        catch(err)
        {
            mainObject.m_Log.DebugDump("nsLycos.js: emailOnloadHandler : Exception : "
                                              + err.name
                                              + ".\nError message: "
                                              + err.message+ "\n"
                                              + err.lineNumber);

            mainObject.serverComms("-ERR Comms Error from "+ mainObject.m_szUserName+"\r\n");
        }
    },


    //dele
    deleteMessage : function(lID)
    {
        try
        {
            this.m_Log.Write("nsLycos.js - deleteMessage - START");
            this.m_Log.Write("nsLycos.js - deleteMessage - id " + lID );

            //create URL
            var szPath = this.m_aMsgDataStore[lID-1].szMSGUri;
            this.m_Log.Write("nsLycos.js - deleteMessage - id " + szPath );

            this.m_iStage=0;

            var szStart = "<?xml version=\"1.0\"?>\r\n<D:move xmlns:D=\"DAV:\">\r\n<D:target>\r\n";
            var szEnd = "</D:target>\r\n</D:move>";
            var szMsgID =  szPath.match(kLycosMSGID);
            var sztemp ="<D:href>"+szMsgID+"</D:href>\r\n"
            var szData = szStart + sztemp + szEnd;

            this.m_HttpComms.setURI(szPath);
            this.m_HttpComms.setRequestMethod("MOVE");
            this.m_HttpComms.setContentType("text/xml");
            this.m_HttpComms.addData(szData);

            var szDestination= this.m_szTrashURI + szMsgID;
            this.m_Log.Write("nsLycos.js - deleteMessage - Destination " + szDestination );
            this.m_HttpComms.addRequestHeader("Destination", szDestination , false);
            var bResult = this.m_HttpComms.send(this.deleteMessageOnloadHandler, this);
            if (!bResult) throw new Error("httpConnection returned false");

            this.m_Log.Write("nsLycos.js - deleteMessage - END");
            return true;
        }
        catch(e)
        {
            this.m_Log.DebugDump("nsLycos.js: deleteMessage : Exception : "
                                          + e.name +
                                          ".\nError message: "
                                          + e.message+ "\n"
                                          + e.lineNumber);
            return false;
        }
    },



    deleteMessageOnloadHandler : function (szResponse ,event , mainObject)
    {
        try
        {
            mainObject.m_Log.Write("nsLycos.js - deleteMessageOnloadHandler - START");
            mainObject.m_Log.Write("nsLycos.js - deleteMessageOnloadHandler : \n" + szResponse);
            mainObject.m_Log.Write("nsLycos.js - deleteMessageOnloadHandler : " + mainObject.m_iStage);

            var httpChannel = event.QueryInterface(Components.interfaces.nsIHttpChannel);

            //if this fails we've gone somewhere new
            mainObject.m_Log.Write("nsLycos - deleteMessageOnloadHandler - status :" +httpChannel.responseStatus );
            if (httpChannel.responseStatus != 201)
                throw new Error("return status " + httpChannel.responseStatus);

            mainObject.serverComms("+OK its gone\r\n");

            mainObject.m_Log.Write("nsLycos.js - deleteMessageOnloadHandler - END");
        }
        catch(err)
        {
            mainObject.m_Log.DebugDump("nsLycos.js: deleteMessageOnloadHandler : Exception : "
                                              + err.name
                                              + ".\nError message: "
                                              + err.message+ "\n"
                                              + err.lineNumber);

            mainObject.serverComms("-ERR Comms Error from "+ mainObject.m_szUserName+"\r\n");
        }
    },



    logOut : function()
    {
        try
        {
            this.m_Log.Write("nsLycos.js - logOUT - START");

            if (!this.m_bReUseSession)
            {
                var oCookies = Components.classes["@mozilla.org/nsWebMailCookieManager2;1"]
                                         .getService(Components.interfaces.nsIWebMailCookieManager2);
                oCookies.removeCookie(this.m_szUserName);

                var oAuth = Components.classes["@mozilla.org/HttpAuthManager2;1"]
                                  .getService(Components.interfaces.nsIHttpAuthManager2);
                oAuth.removeToken(this.m_szUserName);
            }

            if (!this.m_bEmptyTrash)
            {
                this.m_bAuthorised = false;
                this.m_Timer.cancel();
                delete this.m_aMsgDataStore;
                delete this.m_aszFolderURLList;
                delete this.m_aszFolder;
                this.serverComms("+OK Your Out\r\n");
                return true;
            }
            else //get trash
            {
                this.m_HttpComms.setContentType("text/xml");
                this.m_HttpComms.setURI(this.m_szTrashURI);
                this.m_HttpComms.setRequestMethod("PROPFIND");
                this.m_HttpComms.addData(kLycosMailSchema);
                var bResult = this.m_HttpComms.send(this.logoutOnloadHandler, this);
                if (!bResult) throw new Error("httpConnection returned false");
                this.m_iStage=0;
            }
            this.m_Log.Write("nsLycos.js - logOUT - END");
            return true;
        }
        catch(e)
        {
            this.m_Log.DebugDump("nsLycos.js: logOUT : Exception : "
                                      + e.name
                                      + ".\nError message: "
                                      + e.message+ "\n"
                                      + e.lineNumber);
            return false;
        }
    },



    logoutOnloadHandler : function (szResponse ,event , mainObject)
    {
        try
        {
            mainObject.m_Log.Write("nsLycos.js - logoutOnloadHandler - START");
            mainObject.m_Log.Write("nsLycos.js - logoutOnloadHandler : " + mainObject.m_iStage);

            var httpChannel = event.QueryInterface(Components.interfaces.nsIHttpChannel);

            //if this fails we've gone somewhere new
            mainObject.m_Log.Write("nsLycos - logoutOnloadHandler - status :" +httpChannel.responseStatus );
            if (httpChannel.responseStatus <200 || httpChannel.responseStatus >300 )
                throw new Error("return status " + httpChannel.responseStatus);

            switch(mainObject.m_iStage)
            {
                case 0:
                    mainObject.m_aRawData = szResponse.match(kLycosResponse);
                    mainObject.m_Log.Write("nsLycos.js - logoutOnloadHandler - trash - \n" +  mainObject.m_aRawData);
                    if (mainObject.m_aRawData)
                    {
                        mainObject.m_deleteResponse = "<?xml version=\"1.0\"?>\r\n<D:delete xmlns:D=\"DAV:\">\r\n<D:target>\r\n";

                        var callback = {
                            notify: function(timer) { this.parent.processDeleteItem(timer)}
                         };
                        callback.parent = mainObject;

                        mainObject.m_Timer.initWithCallback(callback,
                                                            mainObject.m_iTime,
                                                            Components.interfaces.nsITimer.TYPE_REPEATING_SLACK);
                    }
                    else //no messages
                    {
                        mainObject.m_bAuthorised = false;

                        mainObject.m_Timer.cancel();
                        delete mainObject.m_aMsgDataStore;
                        delete mainObject.m_aszFolderURLList;
                        delete mainObject.m_aszFolder;

                        mainObject.serverComms("+OK Your Out\r\n");
                    }
                break;

                case 1:
                    mainObject.m_bAuthorised = false;

                    mainObject.m_Timer.cancel();
                    delete mainObject.m_aMsgDataStore;
                    delete mainObject.m_aszFolderURLList;
                    delete mainObject.m_aszFolder;

                    mainObject.serverComms("+OK Your Out\r\n");
                break;
            }

            mainObject.m_Log.Write("nsLycos.js - logoutOnloadHandler - END");
        }
        catch(err)
        {
            mainObject.m_Log.DebugDump("nsLycos.js: logoutOnloadHandler : Exception : "
                                              + err.name
                                              + ".\nError message: "
                                              + err.message+ "\n"
                                              + err.lineNumber);

            mainObject.serverComms("-ERR Comms Error from "+ mainObject.m_szUserName+"\r\n");
        }
    },





    processDeleteItem : function(timer)
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
                this.m_deleteResponse += "</D:target>\r\n</D:delete>";
                this.m_HttpComms.setContentType("text/xml");
                this.m_HttpComms.setURI(this.m_szTrashURI);
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

            this.serverComms("-ERR negative vibes from " +this.m_szUserName+ "\r\n");
        }
    },




    loadPrefs : function()
    {
        try
        {
            this.m_Log.Write("nsLycos.js - loadPrefs - START");

            var szUserName =  this.m_szUserName;
            szUserName = szUserName.replace(/\./g,"~");
            szUserName = szUserName.toLowerCase();

            //get user prefs
            var oPref = {Value:null};
            var  WebMailPrefAccess = new WebMailCommonPrefAccess();


            //do i reuse the session
            oPref.Value = null;
            if (WebMailPrefAccess.Get("bool","lycos.bReUseSession",oPref))
                this.m_bReUseSession = oPref.Value;

            //get timer
            oPref.Value = null;
            if (WebMailPrefAccess.Get("int","lycos.iProcessDelay",oPref))
                this.m_iTime = oPref.Value;

            //delay process trigger
            oPref.Value = null;
            if (WebMailPrefAccess.Get("bool","lycos.iProcessTrigger",oPref))
                this.m_iProcessTrigger = oPref.Value;

            //delay proccess amount
            oPref.Value = null;
            if (WebMailPrefAccess.Get("bool","lycos.iProcessAmount",oPref))
                this.m_iProcessAmount = oPref.Value;

            //inbox
            this.m_aszFolder.push("inbox");

            //get folders
            oPref.Value = null;
            WebMailPrefAccess.Get("char","lycos.Account."+szUserName+".szFolders",oPref);
            this.m_Log.Write("nsLycos.js - getPrefs - szFolders " + oPref.Value);
            if (oPref.Value)
            {
                var aszFolders = oPref.Value.split("\r");
                for (j=0; j<aszFolders.length; j++)
                {
                    this.m_Log.Write("nsLycos.js - getPrefs - aszFolders " + aszFolders[j]);
                    this.m_aszFolder.push(aszFolders[j]);
                }
            }

            //get unread
            oPref.Value = null;
            if (WebMailPrefAccess.Get("bool","lycos.Account."+szUserName+".bDownloadUnread",oPref))
                this.m_bDownloadUnread = oPref.Value;
            this.m_Log.Write("nsLycos.js - getPrefs - bDownloadUnread " + oPref.Value);

            //mark as read
            oPref.Value = null;
            if (WebMailPrefAccess.Get("bool","lycos.Account."+szUserName+".bMarkAsRead",oPref))
                this.m_bMarkAsRead = oPref.Value;
            this.m_Log.Write("nsLycos.js - getPrefs - bMarkAsRead " + oPref.Value);

            //get spam
            oPref.Value = null;
            if (WebMailPrefAccess.Get("bool","lycos.Account."+szUserName+".bUseJunkMail",oPref))
            {
                this.m_bUseJunkMail= oPref.Value;
                this.m_aszFolder.push("Courrier%20ind%26eacute;sirable");
            }
            this.m_Log.Write("nsLycos.js - getPrefs - bUseJunkMail " + oPref.Value);


            //get empty trash
            oPref.Value = null;
            if (WebMailPrefAccess.Get("bool","lycos.Account."+szUserName+".bEmptyTrash",oPref))
               this.m_bEmptyTrash = oPref.Value;
            this.m_Log.Write("nsLycos.js - loadPrefs - bEmptyTrash " + oPref.Value);

            this.m_Log.Write("nsLycos.js - loadPrefs - END");
        }
        catch(e)
        {
             this.m_Log.DebugDump("nsLycos.js: loadPrefs : Exception : "
                                              + e.name +
                                              ".\nError message: "
                                              + e.message+ "\n"
                                              + e.lineNumber);
            return null;
        }
    },



    serverComms : function (szMsg)
    {
        try
        {
            this.m_Log.Write("nsLycos.js - serverComms - START");
            this.m_Log.Write("nsLycos.js - serverComms msg " + szMsg);
            var iCount = this.m_oResponseStream.write(szMsg,szMsg.length);
            this.m_Log.Write("nsLycos.js - serverComms sent count: " + iCount
                                                        +" msg length: " +szMsg.length);
            this.m_Log.Write("nsLycos.js - serverComms - END");
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
        if (!iid.equals(Components.interfaces.nsIPOPDomainHandler)
                                  && !iid.equals(Components.interfaces.nsISupports))
            throw Components.results.NS_ERROR_NO_INTERFACE;

        return this;
    }
}


/******************************************************************************/
/* FACTORY*/
var nsLycosFactory = new Object();

nsLycosFactory.createInstance = function (outer, iid)
{
    if (outer != null) throw Components.results.NS_ERROR_NO_AGGREGATION;

    if (!iid.equals(nsLycosClassID) && !iid.equals(Components.interfaces.nsISupports))
        throw Components.results.NS_ERROR_INVALID_ARG;

    return new nsLycos();
}


/******************************************************************************/
/* MODULE */
var nsLycosModule = new Object();

nsLycosModule.registerSelf = function(compMgr, fileSpec, location, type)
{
    compMgr = compMgr.QueryInterface(Components.interfaces.nsIComponentRegistrar);
    compMgr.registerFactoryLocation(nsLycosClassID,
                                    "LycosComponent",
                                    nsLycosContactID,
                                    fileSpec,
                                    location,
                                    type);
}


nsLycosModule.unregisterSelf = function(aCompMgr, aFileSpec, aLocation)
{
    aCompMgr = aCompMgr.QueryInterface(Components.interfaces.nsIComponentRegistrar);
    aCompMgr.unregisterFactoryLocation(nsLycosClassID, aFileSpec);
}


nsLycosModule.getClassObject = function(compMgr, cid, iid)
{
    if (!cid.equals(nsLycosClassID))
        throw Components.results.NS_ERROR_NO_INTERFACE;

    if (!iid.equals(Components.interfaces.nsIFactory))
        throw Components.results.NS_ERROR_NOT_IMPLEMENTED;

    return nsLycosFactory;
}


nsLycosModule.canUnload = function(compMgr)
{
    return true;
}
/******************************************************************************/


function NSGetModule(compMgr, fileSpec)
{
    return nsLycosModule;
}
