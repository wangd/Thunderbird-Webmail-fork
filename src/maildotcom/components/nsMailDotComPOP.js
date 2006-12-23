/*****************************  Globals   *************************************/
const nsMailDotComClassID = Components.ID("{304bef20-b908-11d9-9669-0800200c9a66}");
const nsMailDotComContactID = "@mozilla.org/MailDotComPOP;1";
const ExtMailDotComGuid = "{1ad5b3b0-b908-11d9-9669-0800200c9a66}";

/******************************  MailDotCom ***************************************/
function nsMailDotCom()
{
    try
    {
        var scriptLoader =  Components.classes["@mozilla.org/moz/jssubscript-loader;1"];
        scriptLoader = scriptLoader.getService(Components.interfaces.mozIJSSubScriptLoader);
        scriptLoader.loadSubScript("chrome://web-mail/content/common/DebugLog.js");
        scriptLoader.loadSubScript("chrome://web-mail/content/common/HttpComms2.js");
        scriptLoader.loadSubScript("chrome://web-mail/content/common/CommonPrefs.js");
        scriptLoader.loadSubScript("chrome://maildotcom/content/MailDotCom-MSG.js");
        scriptLoader.loadSubScript("chrome://maildotcom/content/MailDotCom-Prefs-Data.js");

        var date = new Date();
        var  szLogFileName = "MailDotCom Log - " + date.getHours()+ "-"
                                    + date.getMinutes() + "-"+ date.getUTCMilliseconds() +" -";
        this.m_Log = new DebugLog("webmail.logging.comms", ExtMailDotComGuid, szLogFileName);
        this.m_Log.Write("nsMailDotCom.js - Constructor - START");

        if (typeof kMailDotComConstants == "undefined")
        {
            this.m_Log.Write("nsMailDotCom.js - Constructor - loading constants");
            scriptLoader.loadSubScript("chrome://maildotcom/content/MailDotCom-Constants.js");
        }


        //login data
        this.m_bAuthorised = false;
        this.m_szUserName = null;
        this.m_szPassWord = null;
        this.m_oResponseStream = null;
        this.m_bReEntry = false;

        this.m_prefData = null;

        //comms
        this.m_HttpComms = new HttpComms(this.m_Log);
        this.m_iStage = 0;
        this.m_BeforeAdsCallback = null;
        this.m_szLocation=null;
        this.m_szFolderList=null;
        this.m_aszURI = new Array();
        this.m_szTrashURI=null;
        this.m_szDeleteURI = null;

        //msg data
        this.m_szMSGID = null;
        this.m_iTotalSize = 0;
        this.m_aMsgDataStore = new Array();
        this.m_szFolderName = null;
        this.m_szHeaders = null;
        this.m_bStat = false;

        this.m_SessionManager = Components.classes["@mozilla.org/SessionManager;1"]
                                          .getService(Components.interfaces.nsISessionManager);
        this.m_SessionData = null;
        this.m_Log.Write("nsMailDotCom.js - Constructor - END");
    }
    catch(e)
    {
        DebugDump("nsMailDotCom.js: Constructor : Exception : "
                                      + e.name
                                      + ".\nError message: "
                                      + e.message +"\n"
                                      + e.lineNumber);
    }
}



nsMailDotCom.prototype =
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
            this.m_Log.Write("nsMailDotCom.js - logIN - START");
            this.m_Log.Write("nsMailDotCom.js - logIN - Username: " + this.m_szUserName
                                                   + " Password: " + this.m_szPassWord
                                                   + " stream: " + this.m_oResponseStream);

            if (!this.m_szUserName || !this.m_oResponseStream || !this.m_szPassWord) return false;

            this.m_prefData = this.loadPrefs();   //get prefs

            this.m_iStage =0;
            this.m_HttpComms.setURI("http://www.mail.com");
            this.m_HttpComms.setRequestMethod("GET");

            if (this.m_prefData.bReUseSession)
            {
                this.m_Log.Write("nsMailDotCom.js - logIN - Getting Session Data");
                this.m_SessionData = this.m_SessionManager.findSessionData(this.m_szUserName);
                if (this.m_SessionData)
                {
                    this.m_Log.Write("nsMailDotCom.js - logIN - Session Data FOUND");
                    this.m_HttpComms.setCookieManager(this.m_SessionData.oCookieManager);
                    this.m_szLocation = this.m_SessionData.oComponentData.findElement("szLocation");
                    this.m_Log.Write("YahooPOPBETA.js - logIN - m_szLocation " +this.m_szLocation);
                    this.m_szFolderList =  this.m_SessionData.oComponentData.findElement("szFolderList");
                    this.m_Log.Write("nsMailDotCom.js - logIN - m_szFolderList - " +this.m_szFolderList);
                    if (this.m_szLocation)
                    {
                        this.m_iStage =4;
                        this.m_bReEntry = true;
                        this.m_HttpComms.setURI(this.m_szFolderList);
                    }
                }
            }

            var bResult = this.m_HttpComms.send(this.loginOnloadHandler, this);
            if (!bResult) throw new Error("httpConnection returned false");

            this.m_Log.Write("nsMailDotCom.js - logIN - END");
            return true;
        }
        catch(e)
        {
            this.m_Log.DebugDump("nsMailDotCom.js: logIN : Exception : "
                                              + e.name +
                                              ".\nError message: "
                                              + e.message +"\n"
                                              + e.lineNumber);
            return false;
        }
    },


    loginOnloadHandler : function(szResponse ,event , mainObject)
    {
        try
        {
            mainObject.m_Log.Write("nsMailDotCom.js - loginOnloadHandler - START");
         //   mainObject.m_Log.Write("nsMailDotCom.js - loginOnloadHandler : \n" + szResponse);
            mainObject.m_Log.Write("nsMailDotCom.js - loginOnloadHandler : " +mainObject.m_iStage);

            var httpChannel = event.QueryInterface(Components.interfaces.nsIHttpChannel);

            //if this fails we've gone somewhere new
            mainObject.m_Log.Write("nsMailDotCom.js - loginOnloadHandler - status :" +httpChannel.responseStatus );
            if (httpChannel.responseStatus != 200)
                throw new Error("return status " + httpChannel.responseStatus);

            //ads handler
            if (httpChannel.URI.spec.search(/intr.main/)!=-1)
            {
                var bAd = mainObject.ads(szResponse, mainObject.loginOnloadHandler);
                if (!bAd)throw new Error("Ad Handler failed");
                return true;
            }

            //page code
            switch (mainObject.m_iStage)
            {
                case 0: //refresh page
                    var szRefreshURI = szResponse.match(patternMailRefresh)[1];
                    mainObject.m_Log.Write("nsMailDotCom.js - loginOnloadHandler - Refresh URI " + szRefreshURI);

                    mainObject.m_HttpComms.setURI(szRefreshURI);
                    mainObject.m_HttpComms.setRequestMethod("GET");
                    var bResult = mainObject.m_HttpComms.send(mainObject.loginOnloadHandler, mainObject);
                    if (!bResult) throw new Error("httpConnection returned false");
                    mainObject.m_iStage++;
                break;

                case 1: //login page
                    //get login form
                    var szForm= szResponse.match(patternMailDotComLoginForm)[0];
                    if (!szForm)
                        throw new Error("error parsing mail.com login web page");
                    mainObject.m_Log.Write("nsMailDotCom.js - loginOnloadHandler - form " + szForm );

                    //get login URI
                    var szLoginURI= szForm.match(patternMailDotComLoginURI)[1];
                    mainObject.m_Log.Write("nsMailDotCom.js - loginOnloadHandler - login uri " + szLoginURI);

                    //get login input form
                    var aszLoginInput= szForm.match(patternMailDotComLoginInput);
                    mainObject.m_Log.Write("nsMailDotCom.js - loginOnloadHandler - login input " + aszLoginInput);

                    //login data
                    for (i=0; i<aszLoginInput.length; i++)
                    {
                        var szName=aszLoginInput[i].match(patternMailDotComName)[1];
                        szName = szName.replace(/"/gm,"");
                        szName = szName.replace(/'/gm,"");
                        mainObject.m_Log.Write("nsMailDotCom.js - loginOnloadHandler - name " + szName);

                        if (szName.search(/^login$/i)!=-1)
                        {
                            var szUserName =  encodeURIComponent(mainObject.m_szUserName);
                            mainObject.m_HttpComms.addValuePair(szName, szUserName);
                        }
                        else if (szName.search(/password/i)!=-1)
                        {
                            var szPassword =  encodeURIComponent(mainObject.m_szPassWord);
                            mainObject.m_HttpComms.addValuePair(szName, szPassword);
                        }
                        else if (szName.search(/siteselected/i)!=-1)
                        {
                            if(aszLoginInput[i].search(/checked/i)!=-1)
                            {
                                var szValue=aszLoginInput[i].match(patternMailDotComValue)[1];
                                szValue = szValue.replace(/"/gm,"");
                                szValue = szValue.replace(/'/gm,"");
                                szValue = encodeURIComponent(szValue);
                                mainObject.m_Log.Write("nsMailDotCom.js - loginOnloadHandler - value " + szValue);
                                mainObject.m_HttpComms.addValuePair(szName, szValue);
                            }
                        }
                        else
                        {
                            var szValue=aszLoginInput[i].match(patternMailDotComValue)[1];
                            szValue = szValue.replace(/"/gm,"");
                            szValue = szValue.replace(/'/gm,"");
                            szValue = encodeURIComponent(szValue);
                            mainObject.m_Log.Write("nsMailDotCom.js - loginOnloadHandler - value " + szValue);
                            mainObject.m_HttpComms.addValuePair(szName, szValue);
                        }
                    }

                    //construct fake cookie
                    var szCookie = "loginName2=" + encodeURIComponent(mainObject.m_szUserName)+ "; sitetype=normal;";
                    mainObject.m_HttpComms.addRequestHeader("Cookie", szCookie , false);

                    mainObject.m_HttpComms.setURI(szLoginURI);
                    mainObject.m_HttpComms.setRequestMethod("POST");
                    var bResult = mainObject.m_HttpComms.send(mainObject.loginOnloadHandler, mainObject);
                    if (!bResult) throw new Error("httpConnection returned false");
                    mainObject.m_iStage++;
                break;

                case 2: //frame
                     //get mail box
                    var szMailBox = szResponse.match(patternMailDotComFrame)[1];
                    if (!szMailBox)
                        throw new Error("error parsing mail.com login web page");
                    mainObject.m_Log.Write("nsMailDotCom.js - loginOnloadHandler - mailbox " + szMailBox);

                    mainObject.m_HttpComms.setURI(szMailBox);
                    mainObject.m_HttpComms.setRequestMethod("GET");
                    var bResult = mainObject.m_HttpComms.send(mainObject.loginOnloadHandler, mainObject);
                    if (!bResult) throw new Error("httpConnection returned false");
                    mainObject.m_iStage++
                break;


                case 3://get folder list
                    var szLocation = httpChannel.URI.spec;
                    mainObject.m_Log.Write("nsMailDotCom.js - loginOnloadHandler - location "+ szLocation);
                    if (szLocation.search(/frontpage.main/)==-1)
                        throw new Error("error logging in");

                    mainObject.m_szLocation = httpChannel.URI.prePath
                    mainObject.m_Log.Write("nsMailDotCom.js - loginOnloadHandler - location "+ mainObject.m_szLocation);
                    var szFolder = szResponse.match(patternMailDotComFolders)[1];
                    mainObject.m_szFolderList =  mainObject.m_szLocation + szFolder
                    mainObject.m_Log.Write("nsMailDotCom.js - loginOnloadHandler - folders "+ mainObject.m_szFolderList);

                    mainObject.m_HttpComms.setURI(mainObject.m_szFolderList);
                    mainObject.m_HttpComms.setRequestMethod("GET");
                    var bResult = mainObject.m_HttpComms.send(mainObject.loginOnloadHandler, mainObject);
                    if (!bResult) throw new Error("httpConnection returned false");

                    mainObject.m_iStage++;
                break;


                case 4: //get folder urls
                    var aszFolderList = szResponse.match(patternMailDotComFolderList);
                    mainObject.m_Log.Write("nsMailDotCom.js - loginOnloadHandler - folders list "+ aszFolderList);

                    if (!aszFolderList)
                    {
                        if (mainObject.m_bReEntry)
                        {
                            mainObject.m_bReEntry = false;
                            mainObject.m_iStage =0;
                            mainObject.m_HttpComms.setURI("http://www.mail.com");
                            mainObject.m_HttpComms.setRequestMethod("GET");
                            var bResult = mainObject.m_HttpComms.send(mainObject.loginOnloadHandler, mainObject);
                            if (!bResult) throw new Error("httpConnection returned false");
                            return;
                        }
                        else
                            throw new Error("error logging in");
                    }

                    var szLocation = httpChannel.URI.spec;
                    mainObject.m_Log.Write("nsMailDotCom.js - loginOnloadHandler - location "+ szLocation);
                    var szPath = szLocation.match(/(http:\/\/.*?)\//i)[1];
                    mainObject.m_Log.Write("nsMailDotCom.js - loginOnloadHandler - path "+ szPath);

                    for (j=0; j<mainObject.m_prefData.aszFolder.length; j++)
                    {
                        var regExp = new RegExp("^"+mainObject.m_prefData.aszFolder[j]+"$","i");
                        mainObject.m_Log.Write("nsMailDotCom.js - loginOnloadHandler - regExp "+ regExp);

                        for(i=0; i<aszFolderList.length; i++)
                        {
                            var szHref = aszFolderList[i].match(patternMailDotComFolderURI)[1];
                            mainObject.m_Log.Write("nsMailDotCom.js - loginOnloadHandler - folders uri "+ szHref);
                            var szName = szHref.match(patternMailDotComFolderName)[1];
                            mainObject.m_Log.Write("nsMailDotCom.js - loginOnloadHandler - folders name "+ szName);

                            if (szName.search(regExp)!=-1) //get urls
                            {
                                mainObject.m_aszURI.push(szPath + szHref +"&order=Oldest");
                                mainObject.m_Log.Write("nsMailDotCom.js - loginOnloadHandler - mailbox found");
                            }
                            else if (szName.search(/trash/i)!=-1 && mainObject.m_szTrashURI == null)//get trash
                            {
                                mainObject.m_szTrashURI =  szPath + szHref;
                                mainObject.m_Log.Write("nsMailDotCom.js - loginOnloadHandler - trash found");
                            }
                        }
                    }

                    //server response
                    mainObject.serverComms("+OK Your in\r\n");
                    mainObject.m_bAuthorised = true;
                break;
            };

            mainObject.m_Log.Write("nsMailDotCom.js - loginOnloadHandler - END");
        }
        catch(err)
        {
            mainObject.m_Log.DebugDump("nsMailDotCom.js: loginHandler : Exception : "
                                          + err.name
                                          + ".\nError message: "
                                          + err.message +"\n"
                                          + err.lineNumber);

            mainObject.serverComms("-ERR negative vibes from "+mainObject.m_szUserName+"\r\n");
        }
    },




    //stat
    //total size is in octets
    getNumMessages : function()
    {
        try
        {
            this.m_Log.Write("nsMailDotCom.js - getNumMessages - START");
            if (this.m_aszURI.length==0) return false;

            this.m_iStage=0;
            var szURI = this.m_aszURI.shift();

            this.m_HttpComms.setURI(szURI);
            this.m_HttpComms.setRequestMethod("GET");
            var bResult = this.m_HttpComms.send(this.mailBoxOnloadHandler, this);
            if (!bResult) throw new Error("httpConnection returned false");
            this.m_bStat = true;
            this.m_Log.Write("nsMailDotCom.js - getNumMessages - END");
            return true;
        }
        catch(e)
        {
            this.m_Log.DebugDump("nsMailDotCom.js: getNumMessages : Exception : "
                                          + e.name
                                          + ".\nError message: "
                                          + e.message +"\n"
                                          + e.lineNumber);
            return false;
        }
    },




    mailBoxOnloadHandler : function (szResponse ,event , mainObject)
    {
        try
        {
            mainObject.m_Log.Write("nsMailDotCom.js - mailBoxOnloadHandler - START");
           // mainObject.m_Log.Write("nsMailDotCom.js - mailBoxOnloadHandler : \n" + szResponse);
            var httpChannel = event.QueryInterface(Components.interfaces.nsIHttpChannel);
            mainObject.m_Log.Write("nsMailDotCom.js - mailBoxOnloadHandler - Mailbox :" + httpChannel.responseStatus);

            //check status should be 200.
            if (httpChannel.responseStatus != 200)
                throw new Error("error status " + httpChannel.responseStatus);

            //ads handler
            if (httpChannel.URI.spec.search(/intr.main/)!=-1)
            {
                var bAd = mainObject.ads(szResponse, mainObject.mailBoxOnloadHandler);
                if (!bAd)throw new Error("Ad Handler failed");
                return;
            }


            //get msg table
            var aszMsgTable = szResponse.match(patternMailDotComMsgTable);
            mainObject.m_Log.Write("nsMailDotCom.js - mailBoxOnloadHandler - MsgTable " + aszMsgTable );
            if (aszMsgTable)
            {
                var aszMSGs = aszMsgTable[0].match(patternMailDotComMsgRows);
                mainObject.m_Log.Write("nsMailDotCom.js - mailBoxOnloadHandler - MSGs Rows" + aszMSGs );


                if(aszMSGs)
                {
                    for (i=0; i<aszMSGs.length; i++ )
                    {
                        var aszData = aszMSGs[i].match(patternMailDotComMsgData);
                        mainObject.m_Log.Write("nsMailDotCom.js - mailBoxOnloadHandler - MSG Data" + aszData );

                        var bRead = true;
                        if (mainObject.m_bDownloadUnread)
                        {
                            bRead = (aszMSGs[i].search(patternMailDotComUnRead)!=-1) ? true : false;
                            mainObject.m_Log.Write("nsYahoo.js - mailBoxOnloadHandler - bRead -" + bRead);
                        }

                        if (bRead)
                        {
                            var data = new MailDotComMSG();
                            var szHref = mainObject.m_szLocation + aszData[1].match(patternMailDotComHref)[1];
                            mainObject.m_Log.Write("nsMailDotCom.js - mailBoxOnloadHandler - href " + szHref );
                            data.szMSGUri = szHref;

                            var szSize = aszData[3].match(patternMailDotComSize)[1];
                            mainObject.m_Log.Write("nsMailDotCom.js - mailBoxOnloadHandler - size " + szSize );
                            var iSize = parseInt(szSize);
                            if (szSize.indexOf('k')!= -1) iSize*=1000;
                            mainObject.m_Log.Write("nsMailDotCom.js - mailBoxOnloadHandler - msg size :" + i + " " +iSize);
                            data.iSize = iSize;

                            mainObject.m_iTotalSize += iSize;

                            data.szTo = mainObject.m_szUserName;

                            var szFrom = "";
                            try
                            {
                                szFrom = aszData[0].match(/<B>(.*?)<\/B>/i)[1];
                            }
                            catch(err){}
                            data.szFrom = szFrom;


                            var szSubject= "";
                            try
                            {
                                szSubject= aszData[1].match(/<b>(.*?)<\/b>/i)[1];
                            }
                            catch(err){}
                            data.szSubject = szSubject;

                            try
                            {
                                var szRawDate = aszData[2].match(/<td.*?>(.*?)<\/td>/i)[1];
                                var aRawDate = szRawDate.split(/\s/);
                                mainObject.m_Log.Write("nsMailDotCom.js - mailBoxOnloadHandler - raw date "+aRawDate);
                                var today = new Date();
                                var szDate = aRawDate[1] +" ,"+ aRawDate[0] +" "+ aRawDate[2];
                                mainObject.m_Log.Write("nsMailDotCom.js - mailBoxOnloadHandler - szDate "+szDate);
                                var today = new Date();
                                var oldDate = Date.parse(szDate);
                                var newDate= new Date(oldDate);

                                newDate.setHours(today.getHours(),
                                                 today.getMinutes(),
                                                 today.getSeconds(),
                                                 today.getMilliseconds());
                                data.szDate = newDate.toUTCString();
                                mainObject.m_Log.Write("nsMailDotCom.js - mailBoxOnloadHandler - " + oMSG.szDate);
                            }
                            catch(err){}

                            mainObject.m_aMsgDataStore.push(data);
                        }
                    }
                }
            }

            //get delete uri
            if (!mainObject.m_szDeleteURI)
            {
                mainObject.m_szDeleteURI = szResponse.match(patternMailDotComDelete)[1];
                mainObject.m_Log.Write("nsMailDotCom.js - mailBoxOnloadHandler - delete uri " + mainObject.m_szDeleteURI);
            }


            var aszNext = szResponse.match(patternMailDotComNext);
            mainObject.m_Log.Write("nsMailDotCom.js - mailBoxOnloadHandler - Next Table " + aszNext );

            if (aszNext)  //get next page
            {
                var szNext =  mainObject.m_szLocation + aszNext[1];
                mainObject.m_Log.Write("nsMailDotCom.js - mailBoxOnloadHandler - Next URI " + szNext );

                mainObject.m_HttpComms.setURI(szNext);
                mainObject.m_HttpComms.setRequestMethod("GET");
                var bResult = mainObject.m_HttpComms.send(mainObject.mailBoxOnloadHandler, mainObject);
                if (!bResult) throw new Error("httpConnection returned false");
            }
            else if(mainObject.m_aszURI.length>0)
            {
                var szURI = mainObject.m_aszURI.shift();
                mainObject.m_HttpComms.setURI(szURI);
                mainObject.m_HttpComms.setRequestMethod("GET");
                var bResult = mainObject.m_HttpComms.send(mainObject.mailBoxOnloadHandler, mainObject);
                if (!bResult) throw new Error("httpConnection returned false");
            }
            else  //return msg number
            {
                if (mainObject.m_bStat) //called by stat
                {
                    mainObject.serverComms("+OK "+ mainObject.m_aMsgDataStore.length
                                            + " " + mainObject.m_iTotalSize + "\r\n");
                }
                else //called by list
                {
                    var szPOPResponse = "+OK " + mainObject.m_aMsgDataStore.length + " Messages\r\n";
                    this.m_Log.Write("AOL.js - getMessagesSizes - : " + mainObject.m_aMsgDataStore.length);

                    for (i = 0; i <  mainObject.m_aMsgDataStore.length; i++)
                    {
                        var iEmailSize = mainObject.m_aMsgDataStore[i].iSize;
                        szPOPResponse+=(i+1) + " " + iEmailSize + "\r\n";
                    }

                    szPOPResponse += ".\r\n";
                    mainObject.serverComms(szPOPResponse);
                }
            }

            mainObject.m_Log.Write("nsMailDotCom.js - MailBoxOnload - END");
        }
        catch(err)
        {
             mainObject.m_Log.DebugDump("nsMailDotCom.js: MailboxOnload : Exception : "
                                              + err.name
                                              + ".\nError message: "
                                              + err.message +"\n"
                                              + err.lineNumber);

            mainObject.serverComms("-ERR negative vibes from "+mainObject.m_szUserName+"\r\n");
        }
    },






    //list
    //i'm not downloading the mailbox again.
    //I hope stat been called first or there's going to be trouble
    getMessageSizes : function()
    {
        try
        {
            this.m_Log.Write("nsMailDotCom.js - getMessageSizes - START");

            if (this.m_bStat)
            {  //msg table has been donwloaded
                var szPOPResponse = "+OK " +  this.m_aMsgDataStore.length + " Messages\r\n";
                for (i = 0; i < this.m_aMsgDataStore.length; i++)
                {
                    var iEmailSize = this.m_aMsgDataStore[i].iSize;
                    this.m_Log.Write("nsMailDotCom.js - getMessageSizes - Email Size : " +iEmailSize);
                    szPOPResponse+=(i+1) + " " + iEmailSize + "\r\n";
                }
                szPOPResponse += ".\r\n";

                this.serverComms(szPOPResponse);
            }
            else
            { //download msg list
                this.m_Log.Write("nsMailDotCom - getMessageSizes - calling stat");

                if (this.m_szInboxURI == null) return false;
                this.m_Log.Write("nsMailDotCom.js - getNumMessages - Inbox " + this.m_szInboxURI);

                this.m_iStage=0;
                this.m_HttpComms.setURI(this.m_szInboxURI);
                this.m_HttpComms.setRequestMethod("GET");
                var bResult = this.m_HttpComms.send(this.mailBoxOnloadHandler, this);
                if (!bResult) throw new Error("httpConnection returned false");
            }

            this.m_Log.Write("nsMailDotCom.js - getMessageSizes - END");
            return true;
        }
        catch(e)
        {
            this.m_Log.DebugDump("nsMailDotCom.js: getMessageSizes : Exception : "
                                          + e.name
                                          + ".\nError message: "
                                          + e.message +"\n"
                                          + e.lineNumber);
            return false;
        }
    },



    //IUDL
    getMessageIDs : function()
    {
        try
        {
            this.m_Log.Write("nsMailDotCom.js - getMessageIDs - START");

            var szPOPResponse = "+OK " + this.m_aMsgDataStore.length + " Messages\r\n";
            for (i = 0; i <  this.m_aMsgDataStore.length; i++)
            {
                var szURL = this.m_aMsgDataStore[i].szMSGUri;
                this.m_Log.Write("nsMailDotCom.js - getMessageIDs - Email URL : " +szURL);
                var szEmailID = szURL.match(patternMailDotComMsgId)[1];
                this.m_Log.Write("nsMailDotCom.js - getMessageIDs - IDS : " +szEmailID);
                szPOPResponse+=(i+1) + " " + szEmailID + "\r\n";
            }
            szPOPResponse += ".\r\n";
            this.serverComms(szPOPResponse);

            this.m_Log.Write("nsMailDotCom.js - getMessageIDs - END");
            return true;
        }
        catch(e)
        {
            this.m_Log.DebugDump("nsMailDotCom.js: getMessageIDs : Exception : "
                                          + e.name
                                          + ".\nError message: "
                                          + e.message +"\n"
                                          + e.lineNumber);
            return false;
        }
    },



    //top
    getMessageHeaders : function(lID)
    {
        try
        {
            this.m_Log.Write("nsMailDotCom.js - getHeaders - START");
            this.m_Log.Write("nsMailDotCom.js - getHeaders - id " + lID );

            var oMSG = this.m_aMsgDataStore[lID-1];
            var szHref = oMSG.szMSGUri;
            var szFolderName = szHref.match(patternMailDotComFolderName)[1];

            var szHeaders = "X-WebMail: true\r\n";
            szHeaders += "X-Folder: " +szFolderName+ "\r\n";
            szHeaders += "To: "+ oMSG.szTo +"\r\n";
            szHeaders += "From: "+ oMSG.szFrom +"\r\n";
            szHeaders += "Subject: "+ oMSG.szSubject +"\r\n";
            szHeaders += "Date: " + oMSG.szDate +"\r\n"; // \r\n";
            szHeaders += "\r\n.\r\n";//msg end

            var  szResponse = "+OK " +szHeaders.length + "\r\n";
            szResponse += szHeaders
            this.serverComms(szResponse);

            this.m_Log.Write("nsMailDotCom.js - getHeaders - END");
            return true;
        }
        catch(err)
        {
            this.m_Log.DebugDump("nsMailDotCom.js: getHeaders : Exception : "
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
            this.m_Log.Write("nsMailDotCom.js - getMessage - START");
            this.m_Log.Write("nsMailDotCom.js - getMessage - msg num " + lID);

            //get msg id
            var oMSG = this.m_aMsgDataStore[lID-1]
            var szHref = oMSG.szMSGUri;
            this.m_Log.Write("nsMailDotCom.js - getMessage - msg id" + szHref);
            this.m_szMSGID = szHref.match(patternMailDotComMsgId)[1];
            this.m_szFolderName = szHref.match(patternMailDotComFolderName)[1];
            var szMsgURI = this.m_szLocation;
            szMsgURI += "/scripts/mail/mesg.mail";
            szMsgURI += "?folder=" + this.m_szFolderName;
            szMsgURI += "&msg_uid=" + this.m_szMSGID+"&mhead=f&print=1";

            this.m_iStage = 0;
            //get msg from MailDotCom
            this.m_HttpComms.setURI(szMsgURI);
            this.m_HttpComms.setRequestMethod("GET");
            var bResult = this.m_HttpComms.send(this.emailOnloadHandler, this);
            if (!bResult) throw new Error("httpConnection returned false");

            this.m_Log.Write("m_MailDotComLog.js - getMessage - END");
            return true;
        }
        catch(e)
        {
             this.m_Log.DebugDump("nsMailDotCom.js: getMessage : Exception : "
                                          + e.name +
                                          ".\nError message: "
                                          + e.message +"\n"
                                          + e.lineNumber);
            return false;
        }
    },


    emailOnloadHandler : function (szResponse ,event , mainObject)
    {
        try
        {
            mainObject.m_Log.Write("nsMailDotCom.js - emailOnloadHandler - START");
            //mainObject.m_Log.Write("nsMailDotCom.js - emailOnloadHandler : \n" + szResponse);
            var httpChannel = event.QueryInterface(Components.interfaces.nsIHttpChannel);
            mainObject.m_Log.Write("nsMailDotCom.js - emailOnloadHandler - msg code :" + httpChannel.responseStatus);

            //check status should be 200.
            if (httpChannel.responseStatus != 200)
                throw new Error("error status " + httpChannel.responseStatus);

            //ads handler
            if (httpChannel.URI.spec.search(/intr.main/)!=-1)
            {
                var bAd = mainObject.ads(szResponse, mainObject.emailOnloadHandler);
                if (!bAd)throw new Error("Ad Handler failed");
                return;
            }


            //every thing else
            switch (mainObject.m_iStage)
            {
                case 0: //parse email web page
                    mainObject.m_szHeaders = "X-WebMail: true\r\n";
                    mainObject.m_szHeaders += "X-Folder: " + mainObject.m_szFolderName+"\r\n";

                    //get message block
                    var aszMSG = szResponse.match(patternMailDotComMSG);
                    mainObject.m_Log.Write("nsMailDotCom.js - emailOnloadHandler - MSG block :" +aszMSG);

                    //get header block
                    var szHeaderBlock = aszMSG[0].match(patternMailDotComHeaders);
                    mainObject.m_Log.Write("nsMailDotCom.js - emailOnloadHandler - Header block :" +szHeaderBlock);

                    //get headers
                    var aszRawHeaders = szHeaderBlock[1].split(/<BR>/i);
                    mainObject.m_Log.Write("nsMailDotCom.js - emailOnloadHandler -RawHeaders :" +aszRawHeaders);

                    //process headers
                    if (aszRawHeaders)
                    {
                        for (i=0; i<aszRawHeaders.length; i++)
                        {
                            try
                            {
                                var aszHeaders = aszRawHeaders[i].match(patternMailDotComOtherHeaderData);
                                mainObject.m_Log.Write("nsMailDotCom.js - emailOnloadHandler - header :" +aszHeaders);
                                aszHeaders[2] = aszHeaders[2].replace(/\r/," ");
                                aszHeaders[2] = aszHeaders[2].replace(/\n/," ");

                                var szHeader = aszHeaders[1] + aszHeaders[2] + "\r\n";
                                mainObject.m_szHeaders += szHeader;
                                mainObject.m_Log.Write("nsMailDotCom.js - emailOnloadHandler - other headers :" +szHeader);
                            }
                            catch(err)
                            {
                            }
                        }
                    }

                    mainObject.m_szHeaders = mainObject.m_szHeaders.replace(/<B>/g,"");
                    mainObject.m_szHeaders = mainObject.m_szHeaders.replace(/<\/B>/g,"");
                    mainObject.m_szHeaders = mainObject.m_szHeaders.replace(/<BR>/g,"");
                    mainObject.m_szHeaders = mainObject.m_szHeaders.replace(/&#34;/g,"\"");
                    mainObject.m_szHeaders = mainObject.m_szHeaders.replace(/&lt;/g,"<");
                    mainObject.m_szHeaders = mainObject.m_szHeaders.replace(/&gt;/g,">");
                    mainObject.m_Log.Write("nsMailDotCom.js - emailOnloadHandler - headers :" +mainObject.m_szHeaders);

                    //get message body
                    var szBodyURI = mainObject.m_szLocation;
                    szBodyURI += "/getattach/message.eml?folder=INBOX&.intr=1&";
                    szBodyURI += "msg_uid=" + mainObject.m_szMSGID;
                    szBodyURI +="&partsno=0";

                    mainObject.m_Log.Write("nsMailDotCom.js - emailOnloadHandler - download body uri " +szBodyURI);

                    mainObject.m_HttpComms.setURI(szBodyURI);
                    mainObject.m_HttpComms.setRequestMethod("GET");
                    var bResult = mainObject.m_HttpComms.send(mainObject.emailOnloadHandler, mainObject);
                    if (!bResult) throw new Error("httpConnection returned false");
                    mainObject.m_iStage++;
                break;


                case 1: //download attachments
                    mainObject.m_Log.Write("nsMailDotCom.js - emailOnloadHandler - attach downloaded");

                    var szEmail = mainObject.m_szHeaders;
                    szEmail +="\r\n"  //end of headers
                    szEmail += szResponse;
                    szEmail += "\r\n\r\n"; //end of message

                    szEmail = szEmail.replace(/^\./mg,"..");    //bit padding
                    if (szEmail.lastIndexOf("\r\n") == -1) szEmail += "\r\n";
                    szEmail += ".\r\n";  //msg end

                    var szPOPResponse = "+OK " + szEmail.length + "\r\n";
                    szPOPResponse += szEmail;

                    mainObject.serverComms(szPOPResponse);
                break;
            };

            mainObject.m_Log.Write("nsMailDotCom.js - emailOnloadHandler - END");
        }
        catch(err)
        {
            mainObject.m_Log.DebugDump("nsMailDotCom.js: emailOnloadHandler : Exception : "
                                          + err.name
                                          + ".\nError message: "
                                          + err.message +"\n"
                                          + err.lineNumber);

            mainObject.serverComms("-ERR negative vibes from "+mainObject.m_szUserName+"\r\n");
        }
    },



    //dele
    deleteMessage : function(lID)
    {
        try
        {
            this.m_Log.Write("nsMailDotCom.js - deleteMessage - START");
            this.m_Log.Write("nsMailDotCom.js - deleteMessage - id " + lID );

            //create URL
            var szDest = this.m_aMsgDataStore[lID-1].szMSGUri;
            this.m_Log.Write("nsMailDotCom.js - deleteMessage - id " + szDest );
            var szFolderName = szDest.match(patternMailDotComFolderName)[1];
            var szPath = this.m_szLocation + this.m_szDeleteURI;
            this.m_Log.Write("nsMailDotCom.js - deleteMessage - URI " + szPath );

            this.m_HttpComms.addValuePair("folder",szFolderName);
            this.m_HttpComms.addValuePair("order","Newest");
            this.m_HttpComms.addValuePair("changeview","0");
            this.m_HttpComms.addValuePair("mview","a");
            this.m_HttpComms.addValuePair("mstart","1");
            this.m_HttpComms.addValuePair("delete_selected","yes");
            this.m_HttpComms.addValuePair("move_selected","");
            this.m_HttpComms.addValuePair("flag_selected","");
            this.m_HttpComms.addValuePair("flags","");
            this.m_HttpComms.addValuePair("views","a");
            this.m_HttpComms.addValuePair("folder_name","Trash");
            var szID = szDest.match(patternMailDotComMsgId)[1];
            this.m_HttpComms.addValuePair("sel_"+szID, "ON");
            this.m_HttpComms.addValuePair("matchfield","fr");
            this.m_HttpComms.addValuePair("mpat","");

            //send request
            this.m_HttpComms.setURI(szPath);
            this.m_HttpComms.setRequestMethod("POST");
            var bResult = this.m_HttpComms.send(this.deleteMessageOnloadHandler, this);
            if (!bResult) throw new Error("httpConnection returned false");

            this.m_Log.Write("nsMailDotCom.js - deleteMessage - END");
            return true;
        }
        catch(e)
        {
            this.m_Log.DebugDump("nsMailDotCom.js: deleteMessage : Exception : "
                                          + e.name +
                                          ".\nError message: "
                                          + e.message +"\n"
                                          + e.lineNumber);
            return false;
        }
    },




    deleteMessageOnloadHandler : function (szResponse ,event , mainObject)
    {
        try
        {
            mainObject.m_Log.Write("nsMailDotCom.js - deleteMessageOnload - START");
           // mainObject.m_Log.Write("nsMailDotCom.js - deleteMessageOnload :\n" + szResponse);

            var httpChannel = event.QueryInterface(Components.interfaces.nsIHttpChannel);

            //check status should be 200.
            mainObject.m_Log.Write("nsMailDotCom.js - deleteMessageOnload :" + httpChannel.responseStatus);
            if (httpChannel.responseStatus != 200 )
                throw new Error("error status " + httpChannel.responseStatus);

            mainObject.serverComms("+OK its history\r\n");
            mainObject.m_Log.Write("nsMailDotCom.js - deleteMessageOnload - END");
        }
        catch(e)
        {
            mainObject.m_Log.DebugDump("nsMailDotCom.js: deleteMessageOnload : Exception : "
                                              + e.name
                                              + ".\nError message: "
                                              + e.message +"\n"
                                              + e.lineNumber);
            mainObject.serverComms("-ERR negative vibes from "+mainObject.m_szUserName+"\r\n");
        }
    },




    //cookies are deleted when the connection ends so i dont need to download pages
    logOut : function()
    {
        try
        {
            this.m_Log.Write("nsMailDotCom.js - logOUT - START");

            var oPref = new Object();
            oPref.Value = null;
            var  WebMailPrefAccess = new WebMailCommonPrefAccess();
            WebMailPrefAccess.Get("bool","maildotcom.bEmptyTrash",oPref);

            if (!oPref.Value)
            {
                if (this.m_prefData.bReUseSession)
                {
                    this.m_Log.Write("nsMailDotCom.js - logOut - Setting Session Data");

                    if (!this.m_SessionData)
                    {
                        this.m_SessionData = Components.classes["@mozilla.org/SessionData;1"].createInstance();
                        this.m_SessionData.QueryInterface(Components.interfaces.nsISessionData);
                        this.m_SessionData.szUserName = this.m_szUserName;

                        var componentData = Components.classes["@mozilla.org/ComponentData;1"].createInstance();
                        componentData.QueryInterface(Components.interfaces.nsIComponentData);
                        this.m_SessionData.oComponentData = componentData;
                    }
                    this.m_SessionData.oCookieManager = this.m_HttpComms.getCookieManager();
                    this.m_SessionData.oComponentData.addElement("szLocation",this.m_szLocation);
                    this.m_SessionData.oComponentData.addElement("szFolderList", this.m_szFolderList);
                    this.m_SessionManager.setSessionData(this.m_SessionData);
                }

                this.m_bAuthorised = false;
                this.serverComms("+OK Your Out\r\n");
                return true;
            }

            //create URL
            var szPath = this.m_szLocation + "/scripts/mail/Outblaze.mail?emptytrash=1&current_folder=Trash";
            this.m_Log.Write("nsMailDotCom.js - logOUT - empty trash " + szPath );


            //send request
            this.m_HttpComms.setURI(szPath);
            this.m_HttpComms.setRequestMethod("GET");
            var bResult = this.m_HttpComms.send(this.logOutOnloadHandler,this);
            if (!bResult) throw new Error("httpConnection returned false");

            this.m_Log.Write("nsMailDotCom.js - logOUT - END");
            return true;
        }
        catch(e)
        {
            this.m_Log.DebugDump("nsMailDotCom.js: logOUT : Exception : "
                                      + e.name
                                      + ".\nError message: "
                                      + e.message +"\n"
                                      + e.lineNumber);
            return false;
        }
    },



    logOutOnloadHandler : function (szResponse ,event , mainObject)
    {
        try
        {
            mainObject.m_Log.Write("nsMailDotCom.js - logOutOnloadHandler - START");
            //mainObject.m_Log.Write("nsMailDotCom.js - logOutOnloadHandler : \n" + szResponse);

            var httpChannel = event.QueryInterface(Components.interfaces.nsIHttpChannel);
            mainObject.m_Log.Write("nsMailDotCom.js - logOutOnloadHandler :" + httpChannel.responseStatus);
            //check status should be 200.
            if (httpChannel.responseStatus != 200 )
                throw new Error("error status " + httpChannel.responseStatus);

            //ads handler
            if (httpChannel.URI.spec.search(/intr.main/)!=-1)
            {
                var bAd = mainObject.ads(szResponse, mainObject.logOutOnloadHandler);
                if (!bAd)throw new Error("Ad Handler failed");
                return;
            }

            if (mainObject.m_prefData.bReUseSession)
            {
                mainObject.m_Log.Write("nsMailDotCom.js - logOut - Setting Session Data");

                if (!mainObject.m_SessionData)
                {
                    mainObject.m_SessionData = Components.classes["@mozilla.org/SessionData;1"].createInstance();
                    mainObject.m_SessionData.QueryInterface(Components.interfaces.nsISessionData);
                    mainObject.m_SessionData.szUserName = mainObject.m_szUserName;

                    var componentData = Components.classes["@mozilla.org/ComponentData;1"].createInstance();
                    componentData.QueryInterface(Components.interfaces.nsIComponentData);
                    mainObject.m_SessionData.oComponentData = componentData;
                }
                mainObject.m_SessionData.oCookieManager = mainObject.m_HttpComms.getCookieManager();
                mainObject.m_SessionData.oComponentData.addElement("szLocation",mainObject.m_szLocation);
                mainObject.m_SessionData.oComponentData.addElement("szFolderList", mainObject.m_szFolderList);
                mainObject.m_SessionManager.setSessionData(mainObject.m_SessionData);
            }


            mainObject.m_bAuthorised = false;
            mainObject.serverComms("+OK Your Out\r\n");

            mainObject.m_Log.Write("nsMailDotCom.js - logOutOnloadHandler - END");
        }
        catch(e)
        {
            mainObject.m_Log.DebugDump("nsMailDotCom.js: logOutOnloadHandler : Exception : "
                                              + e.name
                                              + ".\nError message: "
                                              + e.message +"\n"
                                              + e.lineNumber);
            mainObject.serverComms("-ERR negative vibes from "+mainObject.m_szUserName+"\r\n");
        }
    },



    ads : function (szResponse, callback)
    {
        try
        {
            this.m_Log.Write("nsMailDotCom.js - ads - START");
            var szDataPage = szResponse.match(patternMailDotComAddURI)[1];
            this.m_Log.Write("nsMailDotCom.js - ads - URI " + szDataPage);

            this.m_BeforeAdsCallback = callback;

            this.m_HttpComms.setURI(szDataPage);
            this.m_HttpComms.setRequestMethod("GET");
            var bResult = this.m_HttpComms.send(this.adsHandler, this);
            if (!bResult) throw new Error("httpConnection returned false");

            this.m_Log.Write("nsMailDotCom.js - ads - END");
            return true;
        }
        catch(err)
        {
            this.m_Log.DebugDump("nsMailDotCom.js: ads : Exception : "
                                              + err.name
                                              + ".\nError message: "
                                              + err.message +"\n"
                                              + err.lineNumber);
            return false;
        }
    },


    adsHandler : function (szResponse ,event , mainObject)
    {
        try
        {
            mainObject.m_Log.Write("nsMailDotCom.js - adsHandler - START");
            //mainObject.m_Log.Write("nsMailDotCom.js - adsHandler : \n" + szResponse);

            var szMailBox = szResponse.match(patternMailDotComFrame)[1];
            if (!szMailBox)
                throw new Error("error parsing mail.com login web page");
            mainObject.m_Log.Write("nsMailDotCom.js - adsHandler - mailbox " + szMailBox);

            mainObject.m_HttpComms.setURI(szMailBox);
            mainObject.m_HttpComms.setRequestMethod("GET");
            var bResult = mainObject.m_HttpComms.send(mainObject.m_BeforeAdsCallback, mainObject);
            if (!bResult) throw new Error("httpConnection returned false");

            mainObject.m_Log.Write("nsMailDotCom.js - adsHandler - START");
        }
        catch(err)
        {
            mainObject.m_Log.DebugDump("nsMailDotCom.js: adsHandler : Exception : "
                                              + err.name
                                              + ".\nError message: "
                                              + err.message +"\n"
                                              + err.lineNumber);
            mainObject.serverComms("-ERR negative vibes from "+mainObject.m_szUserName+"\r\n");
        }
    },



    loadPrefs : function()
    {
        try
        {
            this.m_Log.Write("nsMailDotCom.js - loadPrefs - START");

            //get user prefs
            var oData = new PrefData();
            var oPref = {Value:null};
            //do i reuse the session
            var  WebMailPrefAccess = new WebMailCommonPrefAccess();
            WebMailPrefAccess.Get("bool","maildotcom.bReUseSession",oPref);
            this.m_Log.Write("nsMailDotCom.js - loadPrefs - bReUseSession " + oPref.Value);
            if (oPref.Value != null) oData.bReUseSession = oPref.Value;

            var iCount = 0;
            oPref.Value = null;
            WebMailPrefAccess.Get("int","maildotcom.Account.Num",oPref);
            this.m_Log.Write("nsMailDotCom.js - loadPrefs - num " + oPref.Value);
            if (oPref.Value != null) iCount = oPref.Value;

            var bFound = false;
            var regExp = new RegExp(this.m_szUserName,"i");
            for (i=0; i<iCount; i++)
            {
                //get user name
                oPref.Value = null;
                WebMailPrefAccess.Get("char","maildotcom.Account."+i+".user",oPref);
                this.m_Log.Write("nsMailDotCom.js - loadPrefs - user " + oPref.Value);
                if (oPref.Value != null)
                {
                    if (oPref.Value.search(regExp)!=-1)
                    {
                        this.m_Log.Write("nsMailDotCom.js - loadPrefs - user found "+ i);
                        bFound = true;

                        //inbox
                        oData.aszFolder.push("inbox");

                        //get folders
                        WebMailPrefAccess.Get("char","maildotcom.Account."+i+".szFolders",oPref);
                        this.m_Log.Write("nsMailDotCom.js - loadPrefs - szFolders " + oPref.Value);
                        if (oPref.Value)
                        {
                            var aszFolders = oPref.Value.split("\r");
                            for (j=0; j<aszFolders.length; j++)
                            {
                                this.m_Log.Write("nsMailDotCom - loadPRefs - aszFolders[j] " + aszFolders[j]);
                                oData.aszFolder.push(encodeURIComponent(aszFolders[j]));
                            }
                        }

                        //get unread
                        oPref.Value = null;
                        WebMailPrefAccess.Get("bool","maildotcom.Account."+i+".bDownloadUnread",oPref);
                        this.m_Log.Write("nsMailDotCom.js - loadPrefs - bDownloadUnread " + oPref.Value);
                        if (oPref.Value != null) oData.bUnread=oPref.Value;
                    }
                }
            }

            if (!bFound) //get defaults
            {
                this.m_Log.Write("nsYahoo - loadPrefs - Default Folders");

                //unread only
                oPref.Value = null;
                WebMailPrefAccess.Get("bool","maildotcom.bDownloadUnread",oPref);
                this.m_Log.Write("nsMailDotCom.js - loadPrefs - bDownloadUnread " + oPref.Value);
                if (oPref.Value != null) oData.bUnread=oPref.Value;

                //inbox
                this.m_Log.Write("nsMailDotCom - loadPrefs - Default Folders - inbox");
                oData.aszFolder.push("inbox");
            }
            this.m_Log.Write("nsMailDotCom.js - loadPrefs - END");
            return oData;
        }
        catch(e)
        {
             this.m_Log.DebugDump("nsMailDotCom.js: loadPrefs : Exception : "
                                              + e.name +
                                              ".\nError message: "
                                              + e.message+ "\n"
                                              + e.lineNumber);
            return null;
        }
    },

    /////////////////////    Comms Code /////////////////////////////////////////
    serverComms : function (szMsg)
    {
        try
        {
            this.m_Log.Write("nsMailDotCom.js - serverComms - START");
            this.m_Log.Write("nsMailDotCom.js - serverComms msg " + szMsg);
            var iCount = this.m_oResponseStream.write(szMsg,szMsg.length);
            this.m_Log.Write("nsMailDotCom.js - serverComms sent count: " + iCount
                                                        +" msg length: " +szMsg.length);
            this.m_Log.Write("nsMailDotCom.js - serverComms - END");
        }
        catch(e)
        {
            this.m_Log.DebugDump("nsMailDotCom.js: serverComms : Exception : "
                                              + e.name
                                              + ".\nError message: "
                                              + e.message +"\n"
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
var nsMailDotComFactory = new Object();

nsMailDotComFactory.createInstance = function (outer, iid)
{
    if (outer != null) throw Components.results.NS_ERROR_NO_AGGREGATION;

    if (!iid.equals(nsMailDotComClassID) && !iid.equals(Components.interfaces.nsISupports))
        throw Components.results.NS_ERROR_INVALID_ARG;

    return new nsMailDotCom();
}


/******************************************************************************/
/* MODULE */
var nsMailDotComModule = new Object();

nsMailDotComModule.registerSelf = function(compMgr, fileSpec, location, type)
{
    compMgr = compMgr.QueryInterface(Components.interfaces.nsIComponentRegistrar);
    compMgr.registerFactoryLocation(nsMailDotComClassID,
                                    "MailDotComComponent",
                                    nsMailDotComContactID,
                                    fileSpec,
                                    location,
                                    type);
}


nsMailDotComModule.unregisterSelf = function(aCompMgr, aFileSpec, aLocation)
{
    aCompMgr = aCompMgr.QueryInterface(Components.interfaces.nsIComponentRegistrar);
    aCompMgr.unregisterFactoryLocation(nsMailDotComClassID, aFileSpec);
}


nsMailDotComModule.getClassObject = function(compMgr, cid, iid)
{
    if (!cid.equals(nsMailDotComClassID))
        throw Components.results.NS_ERROR_NO_INTERFACE;

    if (!iid.equals(Components.interfaces.nsIFactory))
        throw Components.results.NS_ERROR_NOT_IMPLEMENTED;

    return nsMailDotComFactory;
}


nsMailDotComModule.canUnload = function(compMgr)
{
    return true;
}
/******************************************************************************/


function NSGetModule(compMgr, fileSpec)
{
    return nsMailDotComModule;
}
