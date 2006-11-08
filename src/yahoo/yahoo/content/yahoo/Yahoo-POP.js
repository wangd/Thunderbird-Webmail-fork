/******************************  Yahoo Current Site  ***************************************/

function YahooPOP(oResponseStream, oLog, oPrefs)
{
    try
    {
        var scriptLoader =  Components.classes["@mozilla.org/moz/jssubscript-loader;1"];
        scriptLoader = scriptLoader.getService(Components.interfaces.mozIJSSubScriptLoader);
        scriptLoader.loadSubScript("chrome://web-mail/content/common/DebugLog.js");
        scriptLoader.loadSubScript("chrome://web-mail/content/common/HttpComms2.js");
        scriptLoader.loadSubScript("chrome://web-mail/content/common/Header.js");
        scriptLoader.loadSubScript("chrome://yahoo/content/YahooMSG.js");
        scriptLoader.loadSubScript("chrome://yahoo/content/Yahoo-Prefs-Accounts-Data.js");

        this.m_Log = oLog;
        this.m_Log.Write("YahooPOP.js - Constructor - START");

        //prefs
        this.m_bReUseSession = oPrefs.bReUseSession;
        this.m_bDownloadUnread= oPrefs.bUnread;
        this.m_aszFolderList = oPrefs.aszFolder;
        this.m_bUseShortID = oPrefs.bUseShortID;

        //login data
        this.m_bAuthorised = false;
        this.m_szUserName = null;
        this.m_szPassWord = null;
        this.m_oResponseStream = oResponseStream;

        //comms
        this.m_HttpComms = new HttpComms(this.m_Log);
        this.m_szLoginUserName = null;
        this.m_szYahooMail = null;
        this.m_szHomeURI = null;
        this.m_iStage = 0;
        this.m_iLoginCount = 0;
        this.m_szLocationURI = null;
        this.m_szDeleteURL = null;
        this.m_bJunkChecked = false;
        this.m_iTotalSize = 0;
        this.m_szHeader = null;
        this.m_iMSGCount = 0;
        this.m_szMsgID = null;
        this.m_szBox = null;
        this.m_bJunkFolder = false;
        this.m_iID =0;
        this.m_aLoginForm = null;
        this.m_bReEntry = false;
        this.m_bStat = false;
        this.m_aMsgDataStore = new Array();
        this.m_aDeleteData = new Array();
        this.m_aszFolderURLList = new Array();

        this.m_SessionManager = Components.classes["@mozilla.org/SessionManager;1"]
                                          .getService(Components.interfaces.nsISessionManager);
        this.m_SessionData = null;
        this.m_Log.Write("YahooPOP.js - Constructor - END");
    }
    catch(e)
    {
        DebugDump("YahooPOP.js: Constructor : Exception : "
                                      + e.name
                                      + ".\nError message: "
                                      + e.message+ "\n"
                                      + e.lineNumber);
    }
}



YahooPOP.prototype =
{
    logIn : function(szUserName , szPassword)
    {
        try
        {
            this.m_Log.Write("YahooPOP.js - logIN - START");
            if (!szUserName || !szPassword) return false;

            this.m_szUserName = szUserName;
            this.m_szPassWord = szPassword;

            this.m_szYahooMail = "http://mail.yahoo.com";
            this.m_szLoginUserName = this.m_szUserName;

            if (this.m_szUserName.search(/yahoo/i)!=-1) //remove domain from user name
            {
                this.m_szLoginUserName = this.m_szUserName.match(/(.*?)@/)[1].toLowerCase();
            }
            else if (this.m_szUserName.search(/@talk21.com$/i)!=-1 ||
                     this.m_szUserName.search(/@btinternet.com$/i)!=-1  ||
                     this.m_szUserName.search(/@btopenworld.com$/i)!=-1 )
            {
                this.m_szYahooMail = "http://bt.yahoo.com/";
            }


            this.m_Log.Write("YahooPOP.js - logIN - default " +this.m_szYahooMail);
            this.m_iStage = 0;
            this.m_HttpComms.setURI(this.m_szYahooMail);

            //get session data
            if (this.m_bReUseSession)
            {
                this.m_Log.Write("YahooPOP.js - logIN - Getting Session Data");
                this.m_SessionData = this.m_SessionManager.findSessionData(this.m_szUserName);
                if (this.m_SessionData)
                {
                    this.m_Log.Write("YahooPOP.js - logIN - Session Data FOUND");
                    this.m_HttpComms.setCookieManager(this.m_SessionData.oCookieManager);
                    this.m_szHomeURI = this.m_SessionData.oComponentData.findElement("szHomeURI");
                    this.m_Log.Write("YahooPOP.js - logIN - szHomeURI " +this.m_szHomeURI);
                    if (this.m_szHomeURI)
                    {
                        this.m_Log.Write("YahooPOP.js - logIN - Session Data Found");
                        this.m_iStage =2;
                        this.m_bReEntry = true;
                        this.m_HttpComms.setURI(this.m_szHomeURI);
                    }
                }
            }


            this.m_HttpComms.setRequestMethod("GET");
            var bResult = this.m_HttpComms.send(this.loginOnloadHandler, this);
            if (!bResult) throw new Error("httpConnection returned false");
            this.m_Log.Write("YahooPOP.js - logIN - END");
            return true;
        }
        catch(e)
        {
            this.m_Log.DebugDump("YahooPOP.js: logIN : Exception : "
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
            mainObject.m_Log.Write("YahooPOP.js - loginOnloadHandler - START");
            mainObject.m_Log.Write("YahooPOP.js - loginOnloadHandler : Stage" + mainObject.m_iStage);

            var httpChannel = event.QueryInterface(Components.interfaces.nsIHttpChannel);
            //if this fails we've gone somewhere new
            mainObject.m_Log.Write("YahooPOP.js - loginOnloadHandler - status :" +httpChannel.responseStatus );
            if (httpChannel.responseStatus != 200)
                throw new Error("return status " + httpChannel.responseStatus);


            if (szResponse.search(patternYahooLoginForm)!=-1)
            {
                if ( mainObject.m_iLoginCount<=3)
                {
                    if (szResponse.search(patternYahooLogInSpam)!=-1)
                    {
                        mainObject.m_Log.Write("YahooPOP.js - loginOnloadHandler - Spam Image found");
                        mainObject.m_iStage =4; //spam image found
                        mainObject.m_iLoginCount++;
                    }
                    else
                    {
                        mainObject.m_iLoginCount++;
                        mainObject.m_iStage =0;
                    }
                }
                else
                    throw new Error ("Too Many Login's");
            }


            //page code
            switch (mainObject.m_iStage)
            {
                case 0: // login page
                    var aLoginForm = szResponse.match(patternYahooLoginForm);
                    if (aLoginForm == null)
                         throw new Error("error parsing yahoo login web page");
                    mainObject.m_Log.Write("YahooPOP.js - loginOnloadHandler - loginForm " + aLoginForm);


                    var szLoginURL = aLoginForm[0].match(patternYahooAction)[1];
                    mainObject.m_Log.Write("YahooPOP.js - loginOnloadHandler - loginURL " + szLoginURL);

                    var aLoginData = aLoginForm[0].match(patternYahooInput);
                    mainObject.m_Log.Write("YahooPOP.js - loginOnloadHandler - loginData " + aLoginData);

                    for (i=0; i<aLoginData.length; i++)
                    {
                        var szName=aLoginData[i].match(patternYahooNameAlt)[1];
                        szName = szName.replace(/["|']/gm,"");
                        szName = szName.replace(/^\s*|\s*$/gm,"");
                        mainObject.m_Log.Write("YahooPOP.js - loginOnloadHandler - loginData name " + szName);

                        var szValue = aLoginData[i].match(patternYahooAltValue)[1];
                        szValue = szValue.replace(/["|']/gm,"");
                        szValue = szValue.replace(/^\s*|\s*$/gm,"");
                        mainObject.m_Log.Write("YahooPOP.js - loginOnloadHandler - loginData value " + szValue);

                        mainObject.m_HttpComms.addValuePair(szName,(szValue? encodeURIComponent(szValue):""));
                    }

                    var szLogin = encodeURIComponent(mainObject.m_szLoginUserName);
                    mainObject.m_HttpComms.addValuePair("login", szLogin);

                    var szPass = encodeURIComponent(mainObject.m_szPassWord);
                    mainObject.m_HttpComms.addValuePair("passwd",szPass);

                    mainObject.m_HttpComms.addValuePair(".persistent","y");

                    mainObject.m_HttpComms.setURI(szLoginURL);
                    mainObject.m_HttpComms.setRequestMethod("POST");
                    var bResult = mainObject.m_HttpComms.send(mainObject.loginOnloadHandler, mainObject);
                    if (!bResult) throw new Error("httpConnection returned false");
                    mainObject.m_iStage++;
                break;

                case 1: //redirect
                    var aLoginRedirect = szResponse.match(patternYahooRedirect);
                    if (aLoginRedirect == null)
                         throw new Error("error parsing yahoo login web page");
                    mainObject.m_Log.Write("YahooPOP.js - loginOnloadHandler - login redirect " + aLoginRedirect);

                    var szLocation = aLoginRedirect[1];

                    mainObject.m_HttpComms.setURI(szLocation);
                    mainObject.m_HttpComms.setRequestMethod("GET");
                    var bResult = mainObject.m_HttpComms.send(mainObject.loginOnloadHandler, mainObject);
                    if (!bResult) throw new Error("httpConnection returned false");
                    mainObject.m_iStage++;
                break;

                case 2: //mail box
                    var szLocation  = httpChannel.URI.spec;
                    mainObject.m_Log.Write("YahooPOP.js - loginOnloadHandler - page check : " + szLocation );
                    if (szResponse.search(patternYahooShowFolder)== -1)
                    {
                        if (mainObject.m_bReEntry)
                        {
                            mainObject.m_bReEntry = false;
                            mainObject.m_iStage =0;
                            mainObject.m_HttpComms.setURI(mainObject.m_szYahooMail);
                            mainObject.m_HttpComms.setRequestMethod("GET");
                            var bResult = mainObject.m_HttpComms.send(mainObject.loginOnloadHandler, mainObject);
                            if (!bResult) throw new Error("httpConnection returned false");
                            return;
                        }
                        else
                            throw new Error("error logging in");
                    }
                    mainObject.m_szHomeURI = szLocation;

                    //get urls for later use
                    mainObject.m_szLocationURI = httpChannel.URI.prePath ;
                    mainObject.m_Log.Write("YahooPOP.js - loginOnloadHandler - m_szLocationURI : "+mainObject.m_szLocationURI );

                    var szFolderURL = szResponse.match(PatternYahooFolderURL)[1];
                    mainObject.m_Log.Write("YahooPOP.js - loginOnloadHandler - szFolderURL : "+szFolderURL );

                    mainObject.m_HttpComms.setURI(szFolderURL);
                    mainObject.m_HttpComms.setRequestMethod("GET");
                    var bResult = mainObject.m_HttpComms.send(mainObject.loginOnloadHandler, mainObject);
                    if (!bResult) throw new Error("httpConnection returned false");
                    mainObject.m_iStage++;

                break;

                case 3:// folder list
                    var aszServerFolders = szResponse.match(PatternYahooFolders);
                    mainObject.m_Log.Write("YahooPOP.js - loginOnloadHandler - aszServerFolders : "+aszServerFolders);
                    mainObject.m_Log.Write("YahooPOP.js - loginOnloadHandler - m_aszFolderList : "+mainObject.m_aszFolderList);

                    for (j=0; j<mainObject.m_aszFolderList.length; j++)
                    {
                        var regExp = new RegExp("^"+mainObject.m_aszFolderList[j]+"$","i");
                        for (i=0; i<aszServerFolders.length; i++)
                        {
                            var szBox = aszServerFolders[i].match(PatternYahooFolderBox)[1];
                            mainObject.m_Log.Write("YahooPOP.js - loginOnloadHandler - szBox : "+szBox );

                            if (szBox.search(regExp)!=-1)
                            {
                                var szURL = mainObject.m_szLocationURI + aszServerFolders[i].replace(/"/g,"");
                                mainObject.m_aszFolderURLList.push(szURL);
                                mainObject.m_Log.Write("YahooPOP.js - loginOnloadHandler - szURL : "+szURL);
                            }
                        }
                    }

                    //server response
                    mainObject.serverComms("+OK Your in\r\n");
                    mainObject.m_bAuthorised = true;
                break;


                case 4: //download spam image
                    mainObject.m_aLoginForm = szResponse.match(patternYahooLoginForm);
                    if ( mainObject.m_aLoginForm  == null)
                         throw new Error("error parsing yahoo login web page");
                    mainObject.m_Log.Write("YahooPOP.js - loginOnloadHandler - loginForm Spam " +  mainObject.m_aLoginForm );

                    var szSpamURI = mainObject.m_aLoginForm[0].match(patternYahooSpanURI)[1];
                    mainObject.m_Log.Write("YahooPOP.js - loginOnloadHandler - szSpamURI " +  szSpamURI );

                    mainObject.m_HttpComms.setURI(szSpamURI);
                    mainObject.m_HttpComms.setRequestMethod("GET");
                    var bResult = mainObject.m_HttpComms.send(mainObject.loginOnloadHandler, mainObject);
                    if (!bResult) throw new Error("httpConnection returned false");
                    mainObject.m_iStage++;
                break;



                case 5: //send login
                    mainObject.m_Log.Write("YahooPOP.js - loginOnloadHandler - image download");
                    var szPath = mainObject.writeImageFile(szResponse);
                    mainObject.m_Log.Write("YahooPOP.js - loginOnloadHandler - imageFile " + szPath);
                    var szResult =  mainObject.openSpamWindow(szPath);
                    if (!szResult) throw new Error("Spam Handling Error");

                    //construct form
                    var szLoginURL = mainObject.m_aLoginForm[0].match(patternYahooAction)[1];
                    mainObject.m_Log.Write("YahooPOP.js - loginOnloadHandler - loginURL " + szLoginURL);

                    var aLoginData = mainObject.m_aLoginForm[0].match(patternYahooInput);
                    mainObject.m_Log.Write("YahooPOP.js - loginOnloadHandler - loginData " + aLoginData);

                    for (i=0; i<aLoginData.length; i++)
                    {
                        var szName=aLoginData[i].match(patternYahooNameAlt)[1];
                        szName = szName.replace(/["|']/gm,"");
                        szName = szName.replace(/^\s*|\s*$/gm,"");
                        mainObject.m_Log.Write("YahooPOP.js - loginOnloadHandler - loginData name " + szName);

                        var szValue = aLoginData[i].match(patternYahooAltValue)[1];
                        szValue = szValue.replace(/["|']/gm,"");
                        szValue = szValue.replace(/^\s*|\s*$/gm,"");
                        mainObject.m_Log.Write("nsYahoo.js - loginOnloadHandler - loginData value " + szValue);

                        mainObject.m_HttpComms.addValuePair(szName,(szValue? encodeURIComponent(szValue):""));
                    }

                    var szLogin = encodeURIComponent(mainObject.m_szLoginUserName);
                    mainObject.m_HttpComms.addValuePair("login", szLogin);

                    var szPass = encodeURIComponent(mainObject.m_szPassWord);
                    mainObject.m_HttpComms.addValuePair("passwd",szPass);

                    mainObject.m_HttpComms.addValuePair(".secword",szResult);

                    mainObject.m_HttpComms.addValuePair(".persistent","y");

                    mainObject.m_HttpComms.setURI(szLoginURL);
                    mainObject.m_HttpComms.setRequestMethod("POST");
                    var bResult = mainObject.m_HttpComms.send(mainObject.loginOnloadHandler, mainObject);
                    if (!bResult) throw new Error("httpConnection returned false");
                    mainObject.m_iStage=1;
                break;
            };

            mainObject.m_Log.Write("YahooPOP.js - loginOnloadHandler - END");
        }
        catch(err)
        {
            mainObject.m_Log.DebugDump("YahooPOP.js: loginHandler : Exception : "
                                          + err.name
                                          + ".\nError message: "
                                          + err.message + "\n"
                                          + err.lineNumber);

            mainObject.serverComms("-ERR negative vibes from "+ mainObject.m_szUserName +"\r\n");
        }
    },



    //stat
    //total size is in octets
    getNumMessages : function()
    {
        try
        {
            this.m_Log.Write("YahooPOP.js - getNumMessages - START");

            if (this.m_aszFolderURLList.length==0) return false;
            var szMailboxURI = this.m_aszFolderURLList.shift();
            this.m_Log.Write("YahooPOP.js - getNumMessages - mail box url " + szMailboxURI);

            this.m_HttpComms.setURI(szMailboxURI);
            this.m_HttpComms.setRequestMethod("GET");
            var bResult = this.m_HttpComms.send(this.mailBoxOnloadHandler, this);
            if (!bResult) throw new Error("httpConnection returned false");
            this.m_bStat = true;

            this.m_Log.Write("YahooPOP.js - getNumMessages - END");
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




    mailBoxOnloadHandler : function (szResponse ,event , mainObject)
    {
        try
        {
            mainObject.m_Log.Write("YahooPOP.js - mailBoxOnloadHandler - START");
            //mainObject.m_Log.Write("YahooPOP.js - mailBoxOnloadHandler : \n" + szResponse);
            mainObject.m_Log.Write("YahooPOP.js - mailBoxOnloadHandler : " + mainObject.m_iStage);

            var httpChannel = event.QueryInterface(Components.interfaces.nsIHttpChannel);

            //check status should be 200.
            mainObject.m_Log.Write("YahooPOP.js - mailBoxOnloadHandler - Mailbox :" + httpChannel.responseStatus);
            if (httpChannel.responseStatus != 200 )
                throw new Error("error status " + httpChannel.responseStatus);

            //get data for deleting
            if (mainObject.m_aDeleteData.length==0)
            {
                var aszDeleteForm = szResponse.match(PatternYahooDeleteForm);
                mainObject.m_Log.Write("YahooPOP.js - mailBoxOnloadHandler - delete form :" + aszDeleteForm);

                mainObject.m_szDeleteURL = aszDeleteForm[0].match(PatternYahooDeleteURL)[1];
                mainObject.m_Log.Write("YahooPOP.js - mailBoxOnloadHandler - delete URL :" + mainObject.m_szDeleteURL);

                var aszDeleteInput = aszDeleteForm[0].match(PatternYahooDeleteInput);
                mainObject.m_Log.Write("YahooPOP.js - mailBoxOnloadHandler - delete Input :" + aszDeleteInput);

                for (i=0 ; i < aszDeleteInput.length ; i++)
                {
                     var aszInput = aszDeleteInput[i].match(PatternYahooDeleteInput);
                     mainObject.m_Log.Write("YahooPOP.js - mailBoxOnloadHandler - delete Input data :" + aszInput);

                     if (aszInput)
                     {
                        var szName = aszInput[0].match(patternYahooNameAlt)[1];
                        szName = szName.replace(/["|']/gm,"");
                        mainObject.m_Log.Write("YahooPOP.js - mailBoxOnloadHandler - delete name " + szName);

                        var szValue = aszInput[0].match(patternYahooAltValue)[1];
                        szValue = szValue.replace(/["|']/gm,"");
                        mainObject.m_Log.Write("YahooPOP.js - mailBoxOnloadHandler - delete value " + szValue);

                        var oYahooData = new YahooData();
                        oYahooData.szName = szName;
                        oYahooData.szValue = szValue;

                        if (szName.search(/DEL/i)!=-1)
                            oYahooData.szValue = 1;
                        else
                            oYahooData.szValue = escape(szValue); //encodeURIComponent

                       mainObject.m_aDeleteData.push(oYahooData);
                     }
                }
            }

            //process message table
            var aMsgTable = szResponse.match(patternYahooMSGIdTable);
            mainObject.m_Log.Write("YahooPOP.js - mailBoxOnloadHandler - msgtable :" + aMsgTable);
            if (aMsgTable)
            {
                var aMsgRows = aMsgTable[0].match(patternYahooMsgRow);
                mainObject.m_Log.Write("YahooPOP.js - mailBoxOnloadHandler - msgRows :" + aMsgRows);

                //get number of msg on page
                var iNum = aMsgRows.length -1; // first row is headers
                mainObject.m_Log.Write("YahooPOP.js - mailBoxOnloadHandler - msgRows Num :" + iNum);

                //process data
                if (iNum > 0)
                {
                    for (i= 1 ; i< iNum+1 ; i++)
                    {
                        var bRead = true;
                        if (mainObject.m_bDownloadUnread)
                        {
                            bRead = (aMsgRows[i].search(PatternYahooUnRead)!=-1) ? true : false;
                            mainObject.m_Log.Write("YahooPOP.js - mailBoxOnloadHandler - bRead -" + bRead);
                        }

                        if (bRead)
                        {
                            var data = new YahooMSG();

                            //get msg info
                            var szMsgID =  aMsgRows[i].match(patternYahooMsgID)[1];
                            mainObject.m_Log.Write("YahooPOP.js - mailBoxOnloadHandler - msg id :" + i + " " +szMsgID);
                            data.szMSGUri = szMsgID;
                            data.szDeleteUri = mainObject.m_szDeleteURL;
                            data.aData = mainObject.m_aDeleteData;
                            data.bJunkFolder = mainObject.m_bJunkChecked;

                            //get msg size
                            var aMsgSize = aMsgRows[i].match(patternYahooMsgSize);
                            var szMsgSize = aMsgSize[aMsgSize.length-1]; //size is last element
                            var szSize = szMsgSize.match(/<td.*?>(.*?)<\/td/)[1];
                            var iSize = parseInt(szSize);
                            if (szSize.indexOf('k')!= -1) iSize*=1000;
                            mainObject.m_Log.Write("YahooPOP.js - mailBoxOnloadHandler - msg size :" + i + " " +iSize);
                            data.iSize = iSize;

                            mainObject.m_iTotalSize += iSize;
                            mainObject.m_aMsgDataStore.push(data);
                        }
                    }
                }
            }

            //check for more pages
            var aszNextPage = szResponse.match(patternYahooNextPage);
            mainObject.m_Log.Write("YahooPOP.js - mailBoxOnloadHandler - msg next page :" +aszNextPage);
            if (aszNextPage)
            {
                var szNewPage = aszNextPage[0].split("|");
                mainObject.m_Log.Write("YahooPOP.js - mailBoxOnloadHandler - msg next page :" +szNewPage + " " + szNewPage.length);

                var szMailboxURI = mainObject.m_szLocationURI +
                                    szNewPage[szNewPage.length-1].match(patternYahooNextURI)[1];
                mainObject.m_Log.Write("YahooPOP.js - getNumMessages - mail box url " + szMailboxURI);

                mainObject.m_HttpComms.setURI(szMailboxURI);
                mainObject.m_HttpComms.setRequestMethod("GET");
                var bResult = mainObject.m_HttpComms.send(mainObject.mailBoxOnloadHandler, mainObject);
                if (!bResult) throw new Error("httpConnection returned false");
            }
            //check for more folders
            else if ( mainObject.m_aszFolderURLList.length>0)
            {
                mainObject.m_Log.Write("YahooPOP.js - MailBoxOnload - load next folder");

                var szMailboxURI = mainObject.m_aszFolderURLList.shift();
                mainObject.m_Log.Write("YahooPOP.js - getNumMessages - mail box url " + szMailboxURI);

                mainObject.m_HttpComms.setURI(szMailboxURI);
                mainObject.m_HttpComms.setRequestMethod("GET");
                var bResult = mainObject.m_HttpComms.send(mainObject.mailBoxOnloadHandler, mainObject);
                if (!bResult) throw new Error("httpConnection returned false");

                delete mainObject.m_aDeleteData;
                mainObject.m_aDeleteData = new Array();
            }
            //no more pages report back to mozilla
            else
            {
                if (mainObject.m_bStat) //called by stat
                {
                    mainObject.serverComms("+OK "+ mainObject.m_aMsgDataStore.length
                                            + " " + mainObject.m_iTotalSize + "\r\n");
                }
                else //called by list
                {
                    var szPOPResponse = "+OK " + mainObject.m_aMsgDataStore.length + " Messages\r\n";
                    this.m_Log.Write("YahooPOP.js - getMessagesSizes - : " + mainObject.m_aMsgDataStore.length);

                    for (i = 0; i <  mainObject.m_aMsgDataStore.length; i++)
                    {
                        var iEmailSize = mainObject.m_aMsgDataStore[i].iSize;
                        szPOPResponse+=(i+1) + " " + iEmailSize + "\r\n";
                    }

                    szPOPResponse += ".\r\n";
                    mainObject.serverComms(szPOPResponse);
                }

                delete mainObject.m_aDeleteData;
                mainObject.m_aDeleteData = new Array();
            }

            mainObject.m_Log.Write("YahooPOP.js - MailBoxOnload - END");
        }
        catch(err)
        {
             mainObject.m_Log.DebugDump("YahooPOP.js: MailboxOnload : Exception : "
                                              + err.name
                                              + ".\nError message: "
                                              + err.message+ "\n"
                                              + err.lineNumber);

            mainObject.serverComms("-ERR negative vibes from "+ mainObject.m_szUserName +"\r\n");
        }
    },






    //list
    //i'm not downloading the mailbox again.
    getMessageSizes : function()
    {
        try
        {
            this.m_Log.Write("YahooPOP.js - getMessageSizes - START");

            if (this.m_bStat)
            {  //msg table has been donwloaded

                this.m_Log.Write("YahooPOP.js - getMessageSizes - getting sizes");
                var szPOPResponse = "+OK " + this.m_aMsgDataStore.length + " Messages\r\n";
                this.m_Log.Write("nsYahoo.js - getMessagesSizes - : " + this.m_aMsgDataStore.length);

                for (i = 0; i <  this.m_aMsgDataStore.length; i++)
                {
                    var iEmailSize = this.m_aMsgDataStore[i].iSize;
                    szPOPResponse+=(i+1) + " " + iEmailSize + "\r\n";
                }

                szPOPResponse += ".\r\n";

                this.serverComms(szPOPResponse);
            }
            else
            { //download msg list

                this.m_Log.Write("YahooPOP.js - getMessageSizes - calling stat");

                if (this.m_aszFolderURLList.length==0) return false;
                var szMailboxURI = this.m_aszFolderURLList.shift();
                this.m_Log.Write("nsYahoo.js - getMessageSizes - mail box url " + szMailboxURI);

                this.m_HttpComms.setURI(szMailboxURI);
                this.m_HttpComms.setRequestMethod("GET");
                this.m_iStage =0;
                var bResult = this.m_HttpComms.send(this.mailBoxOnloadHandler, this);
                if (!bResult) throw new Error("httpConnection returned false");
            }
            this.m_Log.Write("YahooPOP.js - getMessageSizes - END");
            return true;
        }
        catch(e)
        {
            this.m_Log.DebugDump("YahooPOP.js: getMessageSizes : Exception : "
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
            this.m_Log.Write("YahooPOP.js - getMessageIDs - START");

            var szPOPResponse = "+OK " + this.m_aMsgDataStore.length + " Messages\r\n";
            this.m_Log.Write("YahooPOP.js - getMessageIDs - return : " + this.m_aMsgDataStore.length );

            for (i = 0; i <  this.m_aMsgDataStore.length; i++)
            {
                var oMSGData = this.m_aMsgDataStore[i];
                var szEmailURL = oMSGData.szMSGUri;
                this.m_Log.Write("YahooPOP.js - getMessageIDs - Email URL : " +szEmailURL);

                 var szEmailID = szEmailURL.match(PatternYahooID)[1];
                //use short id
                if (this.m_bUseShortID)
                {
                    var aszIDParts = szEmailID.split(/_/);
                    szEmailID ="";
                    for (var j=0; j<aszIDParts.length; j++)
                    {
                        if (j!=1 && j!=2)
                        {
                            szEmailID += aszIDParts[j];
                            if (j!=aszIDParts.length-1) szEmailID += "_";
                        }
                    }
                }

                this.m_Log.Write("YahooPOP.js - getMessageIDs - IDS : " +szEmailID);
                szPOPResponse+=(i+1) + " " +szEmailID + "\r\n";
            }

            szPOPResponse += ".\r\n";
            this.serverComms(szPOPResponse);

            this.m_Log.Write("YahooPOP.js - getMessageIDs - END");
            return true;
        }
        catch(e)
        {
            this.m_Log.DebugDump("YahooPOP.js: getMessageIDs : Exception : "
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
            this.m_Log.Write("YahooPOP.js - getHeaders - START");
            this.m_Log.Write("YahooPOP.js - getHeaders - id " + lID );

            //get msg id
            this.m_iID = lID-1;
            var oMSGData = this.m_aMsgDataStore[lID-1]
            this.m_szMsgID = oMSGData.szMSGUri;
            this.m_Log.Write("YahooPOP.js - getHeaders - msg id" + this.m_szMsgID);

            try
            {
                this.m_szBox= this.m_szMsgID.match(PatternYahooBox)[1];
            }
            catch(err)
            {
                this.m_szBox= this.m_szMsgID.match(PatternYahooBoxAlt)[1];
            }
            this.m_Log.Write("YahooPOP.js - getHeaders - msg box" + this.m_szBox);

            //get headers
            var szDest = this.m_szLocationURI + this.m_szMsgID.match(/.*?&/) + this.m_szBox +"&bodyPart=HEADER";
            this.m_Log.Write("YahooPOP.js - getHeaders - url - "+ szDest);
            this.m_bJunkFolder = oMSGData.bJunkFolder;
            this.m_iStage = 0;

            //get msg from yahoo
            this.m_HttpComms.setURI(szDest);
            this.m_HttpComms.setRequestMethod("GET");
            var bResult = this.m_HttpComms.send(this.headerOnloadHandler, this);
            if (!bResult) throw new Error("httpConnection returned false");

            this.m_Log.Write("YahooPOP.js - getHeaders - END");
            return true;
        }
        catch(err)
        {

            this.m_Log.DebugDump("YahooPOP.js: getHeaders : Exception : "
                                          + e.name +
                                          ".\nError message: "
                                          + e.message+ "\n"
                                          + e.lineNumber);
            return false;
        }
    },



    headerOnloadHandler : function (szResponse ,event , mainObject)
    {
        try
        {
            mainObject.m_Log.Write("YahooPOP.js - headerOnloadHandler - START");

            var httpChannel = event.QueryInterface(Components.interfaces.nsIHttpChannel);

            //check status should be 200.
            mainObject.m_Log.Write("YahooPOP.js - headerOnloadHandler - msg :" + httpChannel.responseStatus);
            if (httpChannel.responseStatus != 200)
                throw new Error("error status " + httpChannel.responseStatus);

            var szUri = httpChannel.URI.spec;
            mainObject.m_Log.Write("YahooPOP.js - headerOnloadHandler - uri : " + szUri);

            switch(mainObject.m_iStage)
            {
                case 0://process header
                    mainObject.m_szHeader  = "X-WebMail: true\r\n";
                    var szFolder = mainObject.m_szBox.match(PatternYahooFolderBoxAlt)[1];
                    mainObject.m_szHeader += "X-Folder: " +szFolder+ "\r\n";
                    mainObject.m_szHeader += szResponse;
                    mainObject.m_szHeader = mainObject.m_szHeader.replace(/^\./mg,"..");    //bit padding
                    mainObject.m_szHeader += ".\r\n";//msg end

                    var oMSGData = mainObject.m_aMsgDataStore[ mainObject.m_iID];
                    mainObject.m_szMsgID = oMSGData.szMSGUri;
                    var szPath = mainObject.m_szLocationURI + oMSGData.szDeleteUri;
                    mainObject.m_Log.Write("YahooPOP.js - headerOnloadHandler - url - "+ szPath);

                    for(i=0; i<oMSGData.aData.length; i++ )
                    {
                        var oData = oMSGData.aData[i];
                        if (oData.szName.search(/^DEL$/i)!=-1)
                            oData.szValue = "";
                        else if (oData.szName.search(/FLG/i)!=-1)
                            oData.szValue = 1;
                        else if (oData.szName.search(/flags/i)!=-1)
                            oData.szValue ="unread";

                        mainObject.m_HttpComms.addValuePair(oData.szName, oData.szValue);
                    }
                    mainObject.m_HttpComms.addValuePair("Mid", oMSGData.szMSGUri.match(PatternYahooID)[1]);

                    //send request
                    mainObject.m_HttpComms.setURI(szPath);
                    mainObject.m_HttpComms.setRequestMethod("POST");
                    var bResult = mainObject.m_HttpComms.send(mainObject.headerOnloadHandler, mainObject);
                    mainObject.m_iStage ++;
                    if (!bResult) throw new Error("httpConnection returned false");
                break;

                case 1: //marked as unread
                    var  szServerResponse = "+OK " +mainObject.m_szHeader.length + "\r\n";
                    szServerResponse += mainObject.m_szHeader
                    mainObject.serverComms(szServerResponse);
                break;
            }
            mainObject.m_Log.Write("YahooPOP.js - headerOnloadHandler - END");
        }
        catch(err)
        {
            mainObject.m_Log.DebugDump("YahooPOP.js: headerOnloadHandler : Exception : "
                                          + err.name
                                          + ".\nError message: "
                                          + err.message+ "\n"
                                          + err.lineNumber);

            mainObject.serverComms("-ERR negative vibes from "+ mainObject.m_szUserName +"\r\n");
        }
    },




    //retr
    getMessage : function( lID)
    {
        try
        {
            this.m_Log.Write("YahooPOP.js - getMessage - START");
            this.m_Log.Write("YahooPOP.js - getMessage - msg num" + lID);

            //get msg id
            var oMSGData = this.m_aMsgDataStore[lID-1]
            this.m_szMsgID = oMSGData.szMSGUri;
            this.m_Log.Write("YahooPOP.js - getMessage - msg id" + this.m_szMsgID);

            try
            {
                this.m_szBox= this.m_szMsgID.match(PatternYahooBox)[1];
            }
            catch(err)
            {
                this.m_szBox= this.m_szMsgID.match(PatternYahooBoxAlt)[1];
            }
            this.m_Log.Write("YahooPOP.js - getMessage - msg box" + this.m_szBox);

            //get headers
            var szDest = this.m_szLocationURI + this.m_szMsgID.match(/.*?&/) + this.m_szBox +"&bodyPart=HEADER";
            this.m_Log.Write("YahooPOP.js - getMessage - url - "+ szDest);
            this.m_bJunkFolder = oMSGData.bJunkFolder;
            this.m_iStage = 0;

            //get msg from yahoo
            this.m_HttpComms.setURI(szDest);
            this.m_HttpComms.setRequestMethod("GET");
            var bResult = this.m_HttpComms.send(this.emailOnloadHandler, this);
            if (!bResult) throw new Error("httpConnection returned false");

            this.m_Log.Write("YahooPOP.js - getMessage - END");
            return true;
        }
        catch(e)
        {
             this.m_Log.DebugDump("YahooPOP.js: getMessage : Exception : "
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
            mainObject.m_Log.Write("YahooPOP.js - emailOnloadHandler - START");
            var httpChannel = event.QueryInterface(Components.interfaces.nsIHttpChannel);

            //check status should be 200.
            mainObject.m_Log.Write("YahooPOP.js - emailOnloadHandler - msg :" + httpChannel.responseStatus);
            if (httpChannel.responseStatus != 200)
                throw new Error("error status " + httpChannel.responseStatus);

            var szUri = httpChannel.URI.spec;
            mainObject.m_Log.Write("YahooPOP.js - emailOnloadHandler - uri : " + szUri);

            //Content-Type: text/html  == very bad
            try
            {
                var szContetnType =  httpChannel.getResponseHeader("Content-Type");
                mainObject.m_Log.Write("YahooPOP.js - emailOnloadHandler - szContetnType "+szContetnType);
                if (szContetnType.search(/text\/html/i)!=-1)
                {
                    mainObject.m_Log.Write("YahooPOP.js - emailOnloadHandler - error download msg ");
                    if (mainObject.m_iMSGCount == 2)
                    {
                        throw new Error("download failed");
                    }
                    else//try again
                    {
                        mainObject.m_iMSGCount++;
                        mainObject.m_HttpComms.setURI(szUri);
                        mainObject.m_HttpComms.setRequestMethod("GET");
                        var bResult = mainObject.m_HttpComms.send(mainObject.emailOnloadHandler, mainObject);
                        if (!bResult) throw new Error("httpConnection returned false");
                        return;
                    }
                }
            }
            catch(err)
            {
                mainObject.m_Log.Write("YahooPOP.js - emailOnloadHandler - download : Exception : "
                                          + err.name
                                          + ".\nError message: "
                                          + err.message+ "\n"
                                          + err.lineNumber);

                if ( mainObject.m_iMSGCount == 2) throw new Error("download error ran out of retries")
            }
            mainObject.m_iMSGCount = 0;


            switch(mainObject.m_iStage)
            {
                case 0:  ///header
                    mainObject.m_szHeader = "X-WebMail: true\r\n";
                    var szFolder = mainObject.m_szBox.match(PatternYahooFolderBoxAlt)[1];
                    mainObject.m_szHeader += "X-Folder: " + szFolder + "\r\n";

                    //remove quoted printable header
                    szResponse = szResponse.replace(/content-transfer-Encoding:.*?quoted-printable.*?/i,"");
                    var oHeaders = new headers(szResponse);
                    mainObject.m_szHeader += oHeaders.getAllHeaders();
                    mainObject.m_Log.Write("YahooPOP.js - emailOnloadHandler - headers - "+mainObject.m_szHeader);

                    var szDest = mainObject.m_szLocationURI + mainObject.m_szMsgID.match(/.*?&/)
                                    + mainObject.m_szBox + "&bodyPart=TEXT";
                    mainObject.m_Log.Write("YahooPOP.js - emailOnloadHandler - url - "+ szDest);

                    //get msg from yahoo
                    mainObject.m_iStage++;
                    mainObject.m_HttpComms.setURI(szDest);
                    mainObject.m_HttpComms.setRequestMethod("GET");
                    var bResult = mainObject.m_HttpComms.send(mainObject.emailOnloadHandler, mainObject);
                    if (!bResult) throw new Error("httpConnection returned false");
                break;

                case 1: //body
                    var szMsg =  mainObject.m_szHeader;
                    szMsg += szResponse;
                    szMsg = szMsg.replace(/^\./mg,"..");    //bit padding

                    var iMsgLength = szMsg.length-1;
                    var iLastIndex = szMsg.lastIndexOf("\n")
                    szMsg += "\r\n.\r\n";  //msg end

                    var szPOPResponse = "+OK " + szMsg.length + "\r\n";
                    szPOPResponse += szMsg;

                    mainObject.serverComms(szPOPResponse);

                break;
            }

            mainObject.m_Log.Write("YahooPOP.js - emailOnloadHandler - END");
        }
        catch(err)
        {
            mainObject.m_Log.DebugDump("YahooPOP.js: emailOnloadHandler : Exception : "
                                          + err.name
                                          + ".\nError message: "
                                          + err.message+ "\n"
                                          + err.lineNumber);

            mainObject.serverComms("-ERR negative vibes from "+ mainObject.m_szUserName +"\r\n");
        }
    },



    //dele
    deleteMessage : function(lID)
    {
        try
        {
            this.m_Log.Write("YahooPOP.js - deleteMessage - START");
            this.m_Log.Write("YahooPOP.js - deleteMessage - id " + lID );

            //create URL
            var oMSGData = this.m_aMsgDataStore[lID-1];

            var szPath = this.m_szLocationURI + oMSGData.szDeleteUri;
            this.m_Log.Write("YahooPOP.js - deleteMessage - url - "+ szPath);

            for(i=0; i<oMSGData.aData.length; i++ )
            {
                var oData = oMSGData.aData[i];
                this.m_HttpComms.addValuePair(oData.szName, oData.szValue);
            }
            this.m_HttpComms.addValuePair("Mid", oMSGData.szMSGUri.match(PatternYahooID)[1]);

            //send request
            this.m_HttpComms.setURI(szPath);
            this.m_HttpComms.setRequestMethod("POST");
            var bResult = this.m_HttpComms.send(this.deleteMessageOnloadHandler, this);

            if (!bResult) throw new Error("httpConnection returned false");
            this.m_Log.Write("YahooPOP.js - deleteMessage - END");
            return true;
        }
        catch(e)
        {
            this.m_Log.DebugDump("YahooPOP.js: deleteMessage : Exception : "
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
            mainObject.m_Log.Write("YahooPOP.js - deleteMessageOnload - START");
           // mainObject.m_Log.Write("YahooPOP.js - deleteMessageOnload : \n" + szResponse);
            var httpChannel = event.QueryInterface(Components.interfaces.nsIHttpChannel);

            //check status should be 200.
            mainObject.m_Log.Write("YahooPOP.js - deleteMessageOnload :" + httpChannel.responseStatus);
            if (httpChannel.responseStatus != 200 )
                throw new Error("error status " + httpChannel.responseStatus);

            mainObject.serverComms("+OK its history\r\n");
            mainObject.m_Log.Write("YahooPOP.js - deleteMessageOnload - END");
        }
        catch(e)
        {
            mainObject.m_Log.DebugDump("YahooPOP.js: deleteMessageOnload : Exception : "
                                              + e.name
                                              + ".\nError message: "
                                              + e.message+ "\n"
                                              + e.lineNumber);
            mainObject.serverComms("-ERR negative vibes from "+ mainObject.m_szUserName +"\r\n");
        }
    },



    //cookies are deleted when the connection ends so i dont need to download pages
    logOut : function()
    {
        try
        {
            this.m_Log.Write("YahooPOP.js - logOUT - START");

            if (this.m_bReUseSession)
            {
                this.m_Log.Write("YahooPOP.js - logOut - Setting Session Data");

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
                this.m_SessionData.oComponentData.addElement("szHomeURI",this.m_szHomeURI);
                this.m_SessionManager.setSessionData(this.m_SessionData);
            }

            this.m_bAuthorised = false;
            this.serverComms("+OK Your Out\r\n");

            this.m_Log.Write("YahooPOP.js - logOUT - END");
            return true;
        }
        catch(e)
        {
            this.m_Log.DebugDump("YahooPOP.js: logOUT : Exception : "
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
            this.m_Log.Write("YahooPOP.js - serverComms msg " + szMsg);
            var iCount = this.m_oResponseStream.write(szMsg,szMsg.length);
            this.m_Log.Write("YahooPOP.js - serverComms sent count: " + iCount +" msg length: " +szMsg.length);
        }
        catch(e)
        {
            this.m_Log.DebugDump("YahooPOP.js: serverComms : Exception : "
                                              + e.name
                                              + ".\nError message: "
                                              + e.message+ "\n"
                                              + e.lineNumber);
        }
    },




    writeImageFile : function(szData)
    {
        try
        {
            this.m_Log.Write("YahooPOP.js - writeImageFile - End");

            var file = Components.classes["@mozilla.org/file/directory_service;1"];
            file = file.getService(Components.interfaces.nsIProperties);
            file = file.get("TmpD", Components.interfaces.nsIFile);
            file.append("suggestedName.jpg");
            file.createUnique(Components.interfaces.nsIFile.NORMAL_FILE_TYPE, 420);

            var deletefile = Components.classes["@mozilla.org/uriloader/external-helper-app-service;1"];
            deletefile = deletefile.getService(Components.interfaces.nsPIExternalAppLauncher);
            deletefile.deleteTemporaryFileOnExit(file);

            var outputStream = Components.classes["@mozilla.org/network/file-output-stream;1"];
            outputStream = outputStream.createInstance( Components.interfaces.nsIFileOutputStream );
            outputStream.init( file, 0x04 | 0x08 | 0x10, 420, 0 );

            var binaryStream = Components.classes["@mozilla.org/binaryoutputstream;1"];
            binaryStream = binaryStream.createInstance(Components.interfaces.nsIBinaryOutputStream);
            binaryStream.setOutputStream(outputStream)
            binaryStream.writeBytes( szData, szData.length );
            outputStream.close();
            binaryStream.close();

            var ios = Components.classes["@mozilla.org/network/io-service;1"]
                                .getService(Components.interfaces.nsIIOService);
            var fileHandler = ios.getProtocolHandler("file")
                                 .QueryInterface(Components.interfaces.nsIFileProtocolHandler);
            var URL = fileHandler.getURLSpecFromFile(file);
            this.m_Log.Write("nsYahoo.js - writeImageFile - path " + URL);

            this.m_Log.Write("nsYahoo.js - writeImageFile - End");
            return URL;
        }
        catch(err)
        {
            this.m_Log.DebugDump("YahooPOP.js: writeImageFile : Exception : "
                                                  + err.name
                                                  + ".\nError message: "
                                                  + err.message + "\n"
                                                  + err.lineNumber);

            return null;
        }
    },




    openSpamWindow : function(szPath)
    {
        try
        {
            this.m_Log.Write("YahooPOP : openWindow - START");

            var params = Components.classes["@mozilla.org/embedcomp/dialogparam;1"]
                                   .createInstance(Components.interfaces.nsIDialogParamBlock);
            params.SetNumberStrings(1);
            params.SetString(0, szPath);

            var window = Components.classes["@mozilla.org/embedcomp/window-watcher;1"]
                                  .getService(Components.interfaces.nsIWindowWatcher);

            window.openWindow(null,
                              "chrome://yahoo/content/Yahoo-SpamImage.xul",
                              "_blank",
                              "chrome,alwaysRaised,dialog,modal,centerscreen,resizable",
                              params);

            var iResult = params.GetInt(0);
            this.m_Log.Write("YahooPOP : openWindow - " + iResult);
            var szResult =  null;
            if (iResult)
            {
                szResult = params.GetString(0);
                this.m_Log.Write("YahooPOP : openWindow - " + szResult);
            }

            this.m_Log.Write("YahooPOP : openWindow - END");
            return szResult;
        }
        catch(err)
        {
            this.m_Log.DebugDump("YahooPOP: Exception in openWindow : "
                                               + err.name
                                               + ".\nError message: "
                                               + err.message + "\n"
                                               + err.lineNumber);
        }
    },
}
