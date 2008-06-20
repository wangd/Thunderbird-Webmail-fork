/******************************  Yahoo Current Site  ***************************************/

function YahooPOP(oResponseStream, oLog, oPrefs)
{
    try
    {
        var scriptLoader =  Components.classes["@mozilla.org/moz/jssubscript-loader;1"];
        scriptLoader = scriptLoader.getService(Components.interfaces.mozIJSSubScriptLoader);
        scriptLoader.loadSubScript("chrome://web-mail/content/common/DebugLog.js");
        scriptLoader.loadSubScript("chrome://web-mail/content/common/HttpComms3.js");
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
        this.m_iTime = oPrefs.iProcessDelay;            //timer delay
        this.m_iProcessAmount =  oPrefs.iProcessAmount; //delay proccess amount
        this.m_bMarkAsRead = oPrefs.bMarkAsRead;
        
        //login data
        this.m_bAuthorised = false;
        this.m_szUserName = null;
        this.m_szPassWord = null;
        this.m_oResponseStream = oResponseStream;

        //comms
        this.m_HttpComms = new HttpComms(this.m_Log);
        this.m_HttpComms.setUserAgentOverride(true);
        
        this.m_szLoginUserName = null;
        this.m_szYahooMail = null;
        this.m_szHomeURI = null;
        this.m_iStage = 0;
        this.m_iLoginCount = 0;
        this.m_szLocationURI = null;
        this.m_szDeleteURL = null;
        this.m_bJunkChecked = false;
        this.m_iTotalSize = 0;
        this.m_szMessage = null;
        this.m_iMSGCount = 0;
        this.m_szMsgID = null;
        this.m_szBox = null;
        this.m_iID =0;
        this.m_aLoginForm = null;
        this.m_bReEntry = false;
        this.m_bStat = false;
        this.m_aMsgDataStore = new Array();
        this.m_aDeleteData = new Array();
        this.m_aszFolderURLList = new Array();
        this.m_bUnread = true;
        this.m_iHandleCount = 0;

        this.m_Timer = Components.classes["@mozilla.org/timer;1"]
                                 .createInstance(Components.interfaces.nsITimer);

        this.m_ComponentManager = Components.classes["@mozilla.org/ComponentData2;1"]
                                            .getService(Components.interfaces.nsIComponentData2);

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

            if (this.m_szUserName.search(/yahoo/i)!=-1)
            {
                if (this.m_szUserName.search(/yahoo\.co\.jp/i)!=-1)
                    this.m_szYahooMail = "http://mail.yahoo.co.jp/";

                //remove domain from user name
                if (this.m_szUserName.search(/ymail/i)!=-1) 
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
            this.m_HttpComms.setUserName(this.m_szUserName);

            //get session data
            if (this.m_bReUseSession)
            {
                this.m_Log.Write("YahooPOP.js - logIN - Getting Session Data");
                this.m_szHomeURI = this.m_ComponentManager.findElement(this.m_szUserName, "szHomeURI");
                this.m_Log.Write("YahooPOP - logIN - m_szLocation " +this.m_szHomeURI);
                if (this.m_szHomeURI)
                {
                    this.m_Log.Write("YahooPOP.js - logIN - Session Data Found");
                    this.m_iStage =2;
                    this.m_bReEntry = true;
                    this.m_HttpComms.setURI(this.m_szLocation);
                }
                else
                {
                    this.m_ComponentManager.deleteAllElements(this.m_szUserName);

                    var oCookies = Components.classes["@mozilla.org/nsWebMailCookieManager2;1"]
                                             .getService(Components.interfaces.nsIWebMailCookieManager2);
                    oCookies.removeCookie(this.m_szUserName);
                }
            }
            else
            {
                this.m_ComponentManager.deleteAllElements(this.m_szUserName);

                var oCookies = Components.classes["@mozilla.org/nsWebMailCookieManager2;1"]
                                         .getService(Components.interfaces.nsIWebMailCookieManager2);
                oCookies.removeCookie(this.m_szUserName);
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
                        if (szLocation.search(/try_mail/i)!=-1)
                        {
                             mainObject.m_HttpComms.addValuePair("newStatus", "1");
                             mainObject.m_HttpComms.setURI(szLocation);
                             mainObject.m_HttpComms.setRequestMethod("POST");
                             var bResult = mainObject.m_HttpComms.send(mainObject.loginOnloadHandler, mainObject);
                             if (!bResult) throw new Error("httpConnection returned false");
                             return;
                        }
                        else if (mainObject.m_bReEntry)
                        {
                            mainObject.m_ComponentManager.deleteAllElements(mainObject.m_szUserName);

                            var oCookies = Components.classes["@mozilla.org/nsWebMailCookieManager2;1"]
                                                     .getService(Components.interfaces.nsIWebMailCookieManager2);
                            oCookies.removeCookie(mainObject.m_szUserName);

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

                    if (!mainObject.m_HttpComms.setURI(szFolderURL)) 
                    {
                        if (szFolderURL.search(/^\//) == -1)
                        {
                            var IOService = Components.classes["@mozilla.org/network/io-service;1"]
                                                      .getService(Components.interfaces.nsIIOService);
                            var nsIURI = IOService.newURI(httpChannel.URI.spec, null, null)
                                                  .QueryInterface(Components.interfaces.nsIURL);
                            var szDirectory = nsIURI.directory
                            mainObject.m_Log.Write("YahooPOP - loginOnloadHandler - directory : " +szDirectory);
                            
                            szFolderURL = mainObject.m_szLocationURI + szDirectory + szFolderURL
                        }
                        else
                        {
                            szFolderURL = mainObject.m_szLocationURI + szFolderURL
                        }
                        mainObject.m_HttpComms.setURI(szFolderURL);
                    }
                    mainObject.m_HttpComms.setRequestMethod("GET");
                    var bResult = mainObject.m_HttpComms.send(mainObject.loginOnloadHandler, mainObject);
                    if (!bResult) throw new Error("httpConnection returned false");
                    mainObject.m_iStage++;

                break;

                case 3:// folder list
                    var aszServerFolders = szResponse.match(PatternYahooFolders);
                    if (!aszServerFolders) aszServerFolders = szResponse.match(PatternYahooFoldersAlt);
                    mainObject.m_Log.Write("YahooPOP.js - loginOnloadHandler - aszServerFolders : "+aszServerFolders);
                    mainObject.m_Log.Write("YahooPOP.js - loginOnloadHandler - m_aszFolderList : "+mainObject.m_aszFolderList);

                    for (j=0; j<mainObject.m_aszFolderList.length; j++)
                    {
                        var regExp = new RegExp("^"+mainObject.m_aszFolderList[j]+"$","i");
                        for (i=0; i<aszServerFolders.length; i++)
                        {
                            var szBox = null;
                            try
                            {
                                szBox = aszServerFolders[i].match(PatternYahooFolderName)[1];
                            }
                            catch(e)
                            {
                                 szBox = aszServerFolders[i].match(PatternYahooFolderNameAlt)[1];
                            }                       
                            mainObject.m_Log.Write("YahooPOP.js - loginOnloadHandler - szBox : "+szBox );

                            if (szBox.search(regExp)!=-1)
                            {
                                var szPart ="";
                                try
                                {
                                    szPart = aszServerFolders[i].match(PatternYahooFoldersPart)[1];
                                }
                                catch(e)
                                {
                                    szPart = aszServerFolders[i].match(PatternYahooFoldersPartAlt)[1]; 
                                }
                                mainObject.m_Log.Write("YahooPOP.js - loginOnloadHandler - szBox : "+szBox );                               
                                
                                //test urls
                                var szFolderURL= "";
                                if (!mainObject.m_HttpComms.setURI(szPart)) 
                                {
                                    if (szPart.search(/^\//) == -1)
                                    {
                                        var IOService = Components.classes["@mozilla.org/network/io-service;1"]
                                                                  .getService(Components.interfaces.nsIIOService);
                                        var nsIURI = IOService.newURI(httpChannel.URI.spec, null, null)
                                                              .QueryInterface(Components.interfaces.nsIURL);
                                        var szDirectory = nsIURI.directory
                                        mainObject.m_Log.Write("YahooPOP - loginOnloadHandler - directory : " +szDirectory);
                                        
                                        szFolderURL = mainObject.m_szLocationURI + szDirectory + szPart
                                    }
                                    else
                                    {
                                        szFolderURL = mainObject.m_szLocationURI + szPart
                                    }
                                }
                                
                                mainObject.m_aszFolderURLList.push(szFolderURL);
                                mainObject.m_Log.Write("YahooPOP.js - loginOnloadHandler - szURL : "+szFolderURL);
                            }
                        }
                    }

                    //server response
                    mainObject.serverComms("+OK Your in\r\n");
                    mainObject.m_bAuthorised = true;
                break;
            };

            mainObject.m_Log.Write("YahooPOP.js - loginOnloadHandler - END");
        }
        catch(err)
        {
            mainObject.m_ComponentManager.deleteAllElements(mainObject.m_szUserName);

            var oCookies = Components.classes["@mozilla.org/nsWebMailCookieManager2;1"]
                                     .getService(Components.interfaces.nsIWebMailCookieManager2);
            oCookies.removeCookie(mainObject.m_szUserName);

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
            this.mailBox(true);

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



    mailBox : function (bState)
    {
        this.m_Log.Write("YahooPOP.js - mailBox - START");

        var szMailboxURI = this.m_aszFolderURLList.shift();
        this.m_Log.Write("YahooPOP.js - getNumMessages - mail box url " + szMailboxURI);

        this.m_HttpComms.setURI(szMailboxURI);
        this.m_HttpComms.setRequestMethod("GET");
        var bResult = this.m_HttpComms.send(this.mailBoxOnloadHandler, this);
        if (!bResult) throw new Error("httpConnection returned false");
        this.m_bStat = bState;

        this.m_Log.Write("YahooPOP.js - mailBox - END");
    },




    mailBoxOnloadHandler : function (szResponse ,event , mainObject)
    {
        try
        {
            mainObject.m_Log.Write("YahooPOP.js - mailBoxOnloadHandler - START");
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

                if (aszDeleteForm) 
                {
                    mainObject.m_szDeleteURL = aszDeleteForm[0].match(PatternYahooDeleteURL)[1];
                    mainObject.m_Log.Write("YahooPOP.js - mailBoxOnloadHandler - delete URL :" + mainObject.m_szDeleteURL);
                    
                    var aszDeleteInput = aszDeleteForm[0].match(PatternYahooDeleteInput);
                    mainObject.m_Log.Write("YahooPOP.js - mailBoxOnloadHandler - delete Input :" + aszDeleteInput);
                    
                    for (i = 0; i < aszDeleteInput.length; i++) 
                    {
                        var aszInput = aszDeleteInput[i].match(PatternYahooDeleteInput);
                        mainObject.m_Log.Write("YahooPOP.js - mailBoxOnloadHandler - delete Input data :" + aszInput);
                        
                        if (aszInput) 
                        {
                            var szName = aszInput[0].match(patternYahooNameAlt)[1];
                            szName = szName.replace(/["|']/gm, "");
                            mainObject.m_Log.Write("YahooPOP.js - mailBoxOnloadHandler - delete name " + szName);
                            
                            var szValue = aszInput[0].match(patternYahooAltValue)[1];
                            szValue = szValue.replace(/["|']/gm, "");
                            mainObject.m_Log.Write("YahooPOP.js - mailBoxOnloadHandler - delete value " + szValue);
                            
                            var oYahooData = new YahooData();
                            oYahooData.szName = szName;
                            oYahooData.szValue = szValue;
                            
                            if (szName.search(/DEL/i) != -1) oYahooData.szValue = 1;
                            else oYahooData.szValue = encodeURIComponent(szValue); //encodeURIComponent
                            mainObject.m_aDeleteData.push(oYahooData);
                        }
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
                        mainObject.m_Log.Write("YahooPOP.js - mailBoxOnloadHandler - msgRow :" + aMsgRows[i]);
                        
                        var bRead = true;
                        if (mainObject.m_bDownloadUnread)
                        {
                            bRead = (aMsgRows[i].search(PatternYahooUnRead)!=-1) ? true : false;
                            mainObject.m_Log.Write("YahooPOP.js - mailBoxOnloadHandler - bRead -" + bRead);
                        }

                        if (bRead)
                        {
                            var data = new YahooMSG();

                            data.bUnread = (aMsgRows[i].search(PatternYahooUnRead)!=-1) ? true : false;
                            mainObject.m_Log.Write("YahooPOP.js - mailBoxOnloadHandler -  data.bUnread -" +  data.bUnread);

                            //get msg info
                            var szMsgID =""
                            try
                            {
                                szMsgID = aMsgRows[i].match(patternYahooMsgID)[1];
                            }
                            catch(err)
                            {
                                szMsgID = aMsgRows[i].match(patternYahooMsgIDAlt)[1];   
                            }                           
                            mainObject.m_Log.Write("YahooPOP.js - mailBoxOnloadHandler - msg id :" + i + " " +szMsgID);
                            data.szMSGUri = szMsgID;
                            data.szDeleteUri = mainObject.m_szDeleteURL;
                            data.aData = mainObject.m_aDeleteData;

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
                    var callback = {
                       notify: function(timer) { this.parent.processSizes(timer)}
                    };
                    callback.parent = mainObject;
                    mainObject.m_iHandleCount = 0;
                    mainObject.m_Timer.initWithCallback(callback,
                                                       mainObject.m_iTime,
                                                       Components.interfaces.nsITimer.TYPE_REPEATING_SLACK);
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
                this.m_Log.Write("YahooPOP.js - getMessageSizes - calling stat");
                if (this.m_aszFolderURLList.length==0) return false;
                this.mailBox(false);
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





    processSizes : function(timer)
    {
        try
        {
            this.m_Log.Write("YahooPOP.js - processSizes - START");

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

            this.m_Log.Write("YahooPOP.js - processSizes - END");
        }
        catch(err)
        {
            this.m_Timer.cancel();
            this.m_Log.DebugDump("YahooPOP.js: processSizes : Exception : "
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
            this.m_Log.Write("YahooPOP.js - getMessageIDs - START");

            var callback = {
               notify: function(timer) { this.parent.processIDS(timer)}
            };
            callback.parent = this;
            this.m_iHandleCount = 0;
            this.m_Timer.initWithCallback(callback,
                                          this.m_iTime,
                                          Components.interfaces.nsITimer.TYPE_REPEATING_SLACK);

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
                                          
            this.serverComms("-ERR negative vibes from "+ this.m_szUserName +"\r\n");
            return false;
        }
    },





    processIDS : function(timer)
    {
        try
        {
            this.m_Log.Write("YahooPOP.js - processIDS - START");

            //response start
            if (this.m_iHandleCount ==  0)
                this.serverComms("+OK " + this.m_aMsgDataStore.length + " Messages\r\n");


            if ( this.m_aMsgDataStore.length > 0)
            {
                var iCount = 0;
                do{
                     var szEmailURL = this.m_aMsgDataStore[this.m_iHandleCount].szMSGUri;
                     this.m_Log.Write("YahooPOP.js - getMessageIDs - Email URL : " +szEmailURL);
                     
                     var szEmailID = ""
                     try
                     {
                         szEmailID = szEmailURL.match(PatternYahooID)[1];
                     }
                     catch(e)
                     {
                         szEmailID = szEmailURL.match(PatternYahooIDAlt)[1];
                     }
                     

                     //use short id    1_8571_AJSySdEAAREkRPe9dgtLa1BshJg
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

            this.m_Log.Write("YahooPOP.js - processIDS - END");
        }
        catch(err)
        {
            this.m_Timer.cancel();
            this.m_Log.DebugDump("YahooPOP.js: processIDS : Exception : "
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
            var szID = this.m_szMsgID.match(/MsgId.*?&/);

            var szDest = this.m_szLocationURI + "/ya/download?" + szID + this.m_szBox +"&bodyPart=HEADER";
            this.m_Log.Write("YahooPOP.js - getHeaders - url - "+ szDest);
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

            mainObject.m_szHeader  = "X-WebMail: true\r\n";
            var szFolder = "";
            try
            {
                szFolder = mainObject.m_szBox.match(PatternYahooFolderBox)[1];
            }
            catch(err)
            {
                szFolder = mainObject.m_szBox.match(PatternYahooFolderBoxAlt)[1];
            }

            mainObject.m_szHeader += "X-Folder: " +szFolder+ "\r\n";
            mainObject.m_szHeader += szResponse;
            mainObject.m_szHeader = mainObject.m_szHeader.replace(/^\./mg,"..");    //bit padding
            mainObject.m_szHeader += ".\r\n";//msg end

            var  szServerResponse = "+OK " +mainObject.m_szHeader.length + "\r\n";
            szServerResponse += mainObject.m_szHeader
            mainObject.serverComms(szServerResponse);
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
            this.m_iID = lID-1;
            var oMSGData = this.m_aMsgDataStore[lID-1]
            this.m_szMsgID = oMSGData.szMSGUri;
            this.m_Log.Write("YahooPOP.js - getMessage - msg raw url " + this.m_szMsgID);
            
            try
            {
                this.m_szBox= this.m_szMsgID.match(PatternYahooBox)[1];
            }
            catch(err)
            {
                this.m_szBox= this.m_szMsgID.match(PatternYahooBoxAlt)[1];
            }
            this.m_Log.Write("YahooPOP.js - getMessage - msg box " + this.m_szBox);

            //get headers
            var szID = this.m_szMsgID.match(/MsgId.*?&/);

            var szDest = this.m_szLocationURI + "/ya/download?" + szID + this.m_szBox +"&bodyPart=HEADER";
            this.m_Log.Write("YahooPOP.js - getMessage - url - "+ szDest);
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
            mainObject.m_Log.Write("YahooPOP.js - emailOnloadHandler - mainObject.m_iStage :" + mainObject.m_iStage);
            
            //check status should be 200.
            mainObject.m_Log.Write("YahooPOP.js - emailOnloadHandler - msg :" + httpChannel.responseStatus);
            if (httpChannel.responseStatus != 200)
                throw new Error("error status " + httpChannel.responseStatus);
            
            var szUri = httpChannel.URI.spec;
            mainObject.m_Log.Write("YahooPOP.js - emailOnloadHandler - uri : " + szUri);
            
            var szContetnType = "";
            try
            {
                var szContetnType =  httpChannel.getResponseHeader("Content-Type");
                mainObject.m_Log.Write("YahooPOP.js - emailOnloadHandler - szContetnType "+szContetnType);
            }
            catch(e)
            { 
                szContetnType = " "   
            }
            
            switch(mainObject.m_iStage)
            {
                case 0:  ///header
                    mainObject.m_Log.Write("YahooPOP.js - emailOnloadHandler - HEADERS ");
                    
                    try
                    {
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
                                var szID = mainObject.m_szMsgID.match(/MsgId.*?&/);
                                if (!szID) 
                                    szID = mainObject.m_szMsgID.match(/mid.*?&/)[0].replace(/mid/, "MsgId");
            
                                var szDest = mainObject.m_szLocationURI + "/ya/download?" 
                                                                        + szID 
                                                                        + mainObject.m_szBox    
                                                                        + "&bodyPart=HEADER";
                                mainObject.m_HttpComms.setURI(szDest);
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
                    mainObject.m_szMessage = "X-WebMail: true\r\n";
                   
                    var szFolder = "";
	                try
                    {
                    	szFolder =  mainObject.m_szBox.match(PatternYahooBox)[1];
            	    }
            	    catch(err)
            	    {
        	            szFolder =  mainObject.m_szBox.match(PatternYahooBoxAlt)[1];
            	    }
                    mainObject.m_szMessage += "X-Folder: " + szFolder + "\r\n";

                    //remove quoted printable header
                    szResponse = szResponse.replace(/content-transfer-Encoding:.*?quoted-printable.*?$/im, "x-Header: removed");
                    szResponse = szResponse.replace(/content-transfer-Encoding:.*?base64.*?$/im,"x-Header: removed");
                    szResponse = szResponse.replace(/Content-Transfer-Encoding:.*?base64.*?$/im,"x-Header: removed");

                    var oHeaders = new headers(szResponse);
                    mainObject.m_szMessage += oHeaders.getAllHeaders();
                    mainObject.m_Log.Write("YahooPOP.js - emailOnloadHandler - headers - "+mainObject.m_szMessage);
                    delete oHeaders;

                    var szID = mainObject.m_szMsgID.match(/MsgId.*?&/);
                    if (!szID) 
                        szID = mainObject.m_szMsgID.match(/mid.*?&/)[0].replace(/mid/, "MsgId");

                    var szDest = mainObject.m_szLocationURI + "/ya/download?" 
                                                            + szID 
                                                            + mainObject.m_szBox    
                                                            + "&bodyPart=TEXT";
                                                            
                    mainObject.m_Log.Write("YahooPOP.js - emailOnloadHandler - url - "+ szDest);

                    //get msg from yahoo
                    mainObject.m_iStage++;
                    mainObject.m_HttpComms.setURI(szDest);
                    mainObject.m_HttpComms.setRequestMethod("GET");
                    var bResult = mainObject.m_HttpComms.send(mainObject.emailOnloadHandler, mainObject);
                    if (!bResult) throw new Error("httpConnection returned false");
                break;

                case 1: //body
                    mainObject.m_Log.Write("YahooPOP.js - emailOnloadHandler - BODY ");         

                    mainObject.m_iMSGCount = 0;     
                    mainObject.m_szMessage += szResponse;
                    szEmail = null;
                    mainObject.m_szMessage = mainObject.m_szMessage.replace(/^\./mg,"..");    //bit padding
        
                    var iMsgLength = mainObject.m_szMessage.length-1;
                    var iLastIndex = mainObject.m_szMessage.lastIndexOf("\n")
                    mainObject.m_szMessage += "\r\n.\r\n";  //msg end
                    
                    if (!mainObject.m_bMarkAsRead)
                    {
                        var szPOPResponse = "+OK " + mainObject.m_szMessage.length + "\r\n";
                        szPOPResponse += mainObject.m_szMessage;
                        mainObject.serverComms(szPOPResponse);  
                        mainObject.m_szMessage = null;
                    }
                    else //mark as read
                    {
                        mainObject.m_Log.Write("YahooPOP.js - emailOnloadHandler - Mark as read - ");
                        var oMSGData = mainObject.m_aMsgDataStore[ mainObject.m_iID];
                        var szPath = mainObject.m_szLocationURI + oMSGData.szDeleteUri;
                        mainObject.m_Log.Write("YahooPOP.js - emailOnloadHandler - URL - "+ szPath);

                        for(i=0; i<oMSGData.aData.length; i++ )
                        {
                            var oData = oMSGData.aData[i];
                            if (oData.szName.search(/^DEL$/i)!=-1)
                                oData.szValue = "";
                            else if (oData.szName.search(/FLG/i)!=-1)
                                oData.szValue = 1;
                            else if (oData.szName.search(/flags/i)!=-1)
                                oData.szValue ="read";

                            mainObject.m_HttpComms.addValuePair(oData.szName, oData.szValue);
                        }
                        
                        var szID = "";
                        try
                        {
                            szID = oMSGData.szMSGUri.match(PatternYahooID)[1]
                        }
                        catch(e)
                        {
                            szID = oMSGData.szMSGUri.match(PatternYahooIDAlt)[1]
                        }                        
                        mainObject.m_HttpComms.addValuePair("Mid", szID);

                        //send request
                        mainObject.m_HttpComms.setURI(szPath);
                        mainObject.m_HttpComms.setRequestMethod("POST");
                        var bResult = mainObject.m_HttpComms.send(mainObject.emailOnloadHandler, mainObject);
                        mainObject.m_iStage ++;
                        if (!bResult) throw new Error("httpConnection returned false");
                    }
                break;
                
                case 2: //marked as read
                     mainObject.m_Log.Write("YahooPOP.js - emailOnloadHandler - marked as read ");
                     var szPOPResponse = "+OK " + mainObject.m_szMessage.length + "\r\n";
                     szPOPResponse += mainObject.m_szMessage;
                     mainObject.serverComms(szPOPResponse);  
                     mainObject.m_szMessage = null;
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
                if (oData.szName.search(/^DEL$/i)!=-1) oData.szValue = "1";
                
                this.m_HttpComms.addValuePair(oData.szName, oData.szValue);
            }
            
            var szID = "";
            try
            {
                szID = oMSGData.szMSGUri.match(PatternYahooID)[1]
            }
            catch(e)
            {
                szID = oMSGData.szMSGUri.match(PatternYahooIDAlt)[1]
            }                        
            this.m_HttpComms.addValuePair("Mid", szID);

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
                this.m_ComponentManager.addElement(this.m_szUserName, "szHomeURI", this.m_szHomeURI);
            }
            else
            {
                this.m_Log.Write("YahooPOP.js - logOUT - removing Session Data");
                this.m_ComponentManager.deleteAllElements(this.m_szUserName);

                var oCookies = Components.classes["@mozilla.org/nsWebMailCookieManager2;1"]
                                         .getService(Components.interfaces.nsIWebMailCookieManager2);
                oCookies.removeCookie(this.m_szUserName);
            }


            this.m_bAuthorised = false;
            this.serverComms("+OK Your Out\r\n");
            this.m_Timer.cancel();
            delete this.m_aMsgDataStore;
            delete this.m_aDeleteData;
            delete this.m_aszFolderURLList;

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
