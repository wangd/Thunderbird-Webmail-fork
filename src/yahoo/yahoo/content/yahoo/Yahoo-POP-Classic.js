/******************************  Yahoo Current Site  ***************************************/

function YahooPOPClassic(oResponseStream, oLog, oPrefs)
{
    try
    {
        var scriptLoader =  Components.classes["@mozilla.org/moz/jssubscript-loader;1"]
                                      .getService(Components.interfaces.mozIJSSubScriptLoader);
        scriptLoader.loadSubScript("chrome://web-mail/content/common/DebugLog.js");
        scriptLoader.loadSubScript("chrome://web-mail/content/common/HttpComms3.js");
        scriptLoader.loadSubScript("chrome://yahoo/content/EmailBuilder.js");
        scriptLoader.loadSubScript("chrome://yahoo/content/YahooMSG.js");
        scriptLoader.loadSubScript("chrome://yahoo/content/Yahoo-Prefs-Accounts-Data.js");

        this.m_Log = oLog;
        this.m_Log.Write("YahooPOPClassic.js - Constructor - START");

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
        this.m_bHasAttachments = false;
        this.m_iTotalSize = 0;
        this.m_oMessage = null;
        this.m_iMSGCount = 0;
        this.m_szMsgID = null;
        this.m_szBox = null;
        this.m_iID =0;
        this.m_aLoginForm = null;
        this.m_bReEntry = false;
        this.m_bStat = false;
        this.m_aMsgDataStore = new Array();
        this.m_aszFolderURLList = new Array();
        this.m_bUnread = true;
        this.m_iHandleCount = 0;
        this.m_iCount = 3;
        this.m_iLastPage = 0;
         
        this.m_Timer = Components.classes["@mozilla.org/timer;1"]
                                 .createInstance(Components.interfaces.nsITimer);

        this.m_ComponentManager = Components.classes["@mozilla.org/ComponentData2;1"]
                                            .getService(Components.interfaces.nsIComponentData2);

        this.m_Log.Write("YahooPOPClassic.js - Constructor - END");
    }
    catch(e)
    {
        DebugDump("YahooPOPClassic.js: Constructor : Exception : "
                                      + e.name
                                      + ".\nError message: "
                                      + e.message+ "\n"
                                      + e.lineNumber);
    }
}



YahooPOPClassic.prototype =
{
    logIn : function(szUserName , szPassword)
    {
        try
        {
            this.m_Log.Write("YahooPOPClassic.js - logIN - START");
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
                this.m_szLoginUserName = this.m_szUserName.match(/(.*?)@/)[1].toLowerCase();
            }
            else if (this.m_szUserName.search(/@talk21.com$/i)!=-1 ||
                     this.m_szUserName.search(/@btinternet.com$/i)!=-1  ||
                     this.m_szUserName.search(/@btopenworld.com$/i)!=-1 )
            {
                this.m_szYahooMail = "http://bt.yahoo.com/";
            }

            this.m_Log.Write("YahooPOPClassic.js - logIN - default " +this.m_szYahooMail);
            this.m_iStage = 0;
            this.m_HttpComms.setURI(this.m_szYahooMail);
            this.m_HttpComms.setUserName(this.m_szUserName);

            //get session data
            if (this.m_bReUseSession)
            {
                this.m_Log.Write("YahooPOPClassic.js - logIN - Getting Session Data");
                this.m_szHomeURI = this.m_ComponentManager.findElement(this.m_szUserName, "szHomeURI");
                this.m_Log.Write("YahooPOPClassic - logIN - m_szLocation " +this.m_szHomeURI);
                if (this.m_szHomeURI)
                {
                    this.m_Log.Write("YahooPOPClassic.js - logIN - Session Data Found");
                    this.m_iStage =1;
                    this.m_bReEntry = true;
                    this.m_HttpComms.setURI(this.m_szHomeURI);
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
            this.m_Log.Write("YahooPOPClassic.js - logIN - END");
            return true;
        }
        catch(e)
        {
            this.m_Log.DebugDump("YahooPOPClassic.js: logIN : Exception : "
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
            mainObject.m_Log.Write("YahooPOPClassic.js - loginOnloadHandler - START");
            mainObject.m_Log.Write("YahooPOPClassic.js - loginOnloadHandler : Stage" + mainObject.m_iStage);

            var httpChannel = event.QueryInterface(Components.interfaces.nsIHttpChannel);
            //if this fails we've gone somewhere new
            mainObject.m_Log.Write("YahooPOPClassic.js - loginOnloadHandler - status :" +httpChannel.responseStatus );
            if (httpChannel.responseStatus != 200)
                throw new Error("return status " + httpChannel.responseStatus);

            var aLoginRedirect = szResponse.match(patternYahooRefresh);
            if (aLoginRedirect==null) aLoginRedirect = szResponse.match(patternYahooRefresh2);
            mainObject.m_Log.Write("YahooPOPClassic.js - loginOnloadHandler - login redirect " + aLoginRedirect);
            if (aLoginRedirect != null && mainObject.m_iStage!=0) 
            {         
                var szLocation = aLoginRedirect[1];         
                mainObject.m_HttpComms.setURI(szLocation);
                mainObject.m_HttpComms.setRequestMethod("GET");
                var bResult = mainObject.m_HttpComms.send(mainObject.loginOnloadHandler, mainObject);
                if (!bResult) throw new Error("httpConnection returned false");
                return;
            }


            //page code
            switch (mainObject.m_iStage)
            {
                case 0: // login page
                    var aLoginForm = szResponse.match(patternYahooLoginForm);
                    if (aLoginForm == null)
                         throw new Error("error parsing yahoo login web page");
                    mainObject.m_Log.Write("YahooPOPClassic.js - loginOnloadHandler - loginForm " + aLoginForm);


                    var szLoginURL = aLoginForm[0].match(patternYahooAction)[1];
                    mainObject.m_Log.Write("YahooPOPClassic.js - loginOnloadHandler - loginURL " + szLoginURL);

                    var aLoginData = aLoginForm[0].match(patternYahooInput);
                    mainObject.m_Log.Write("YahooPOPClassic.js - loginOnloadHandler - loginData " + aLoginData);

                    for (i=0; i<aLoginData.length; i++)
                    {
                        var szName=aLoginData[i].match(patternYahooClassicName)[1];
                        szName = szName.replace(/^\s*|\s*$/gm,"");
                        mainObject.m_Log.Write("YahooPOPClassic.js - loginOnloadHandler - loginData name " + szName);

                        var szValue = aLoginData[i].match(patternYahooClassicValue)[1];
                        szValue = szValue.replace(/^\s*|\s*$/gm,"");
                        mainObject.m_Log.Write("YahooPOPClassic.js - loginOnloadHandler - loginData value " + szValue);

                        mainObject.m_HttpComms.addValuePair(szName,(szValue? szValue : ""));
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

                case 1: //mail box
                    var szLocation  = httpChannel.URI.spec;
                    mainObject.m_Log.Write("YahooPOPClassic.js - loginOnloadHandler - page check : " + szLocation );
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
                    mainObject.m_Log.Write("YahooPOPClassic.js - loginOnloadHandler - m_szLocationURI : "+mainObject.m_szLocationURI );
                                        
                    var szFolderURL = szResponse.match(PatternYahooFolderURL)[1];
                    mainObject.m_Log.Write("YahooPOPClassic.js - loginOnloadHandler - szFolderURL : "+szFolderURL );

                    if (!mainObject.m_HttpComms.setURI(szFolderURL)) 
                    {
                        if (szFolderURL.search(/^\//) == -1)
                        {
                            var IOService = Components.classes["@mozilla.org/network/io-service;1"]
                                                      .getService(Components.interfaces.nsIIOService);
                            var nsIURI = IOService.newURI(httpChannel.URI.spec, null, null)
                                                  .QueryInterface(Components.interfaces.nsIURL);
                            var szDirectory = nsIURI.directory
                            mainObject.m_Log.Write("YahooPOPClassic - loginOnloadHandler - directory : " +szDirectory);
                            
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

                case 2:// folder list
                    var aszServerFolders = szResponse.match(PatternYahooFolders);
                    if (!aszServerFolders) aszServerFolders = szResponse.match(PatternYahooFoldersAlt);
                    mainObject.m_Log.Write("YahooPOPClassic.js - loginOnloadHandler - aszServerFolders : "+aszServerFolders);
                    mainObject.m_Log.Write("YahooPOPClassic.js - loginOnloadHandler - m_aszFolderList : "+mainObject.m_aszFolderList);

                    for (j=0; j<mainObject.m_aszFolderList.length; j++)
                    {
                        var regExp = new RegExp("^"+mainObject.m_aszFolderList[j]+"$","i");
                        for (i=0; i<aszServerFolders.length; i++)
                        {
                            var szServerFolders = decodeURIComponent(aszServerFolders[i]);
                            var szBox = "";
                            try 
                            {
                                szBox = szServerFolders.match(PatternYahooFolderNameAlt)[1];
                            } 
                            catch (e) 
                            {
                                szBox = szServerFolders.match(PatternYahooFolderName)[1];         
                            }
                            mainObject.m_Log.Write("YahooPOPClassic.js - loginOnloadHandler - szBox : "+szBox );

                            if (szBox.search(regExp)!=-1)
                            {
                                var szPart = "";
                                try
                                {
                                    szPart = szServerFolders.match(PatternYahooFoldersPart)[1];
                                }
                                catch(e)
                                {
                                    szPart = szServerFolders.match(PatternYahooFoldersPartAlt)[1];
                                } 
                                mainObject.m_Log.Write("YahooPOPClassic.js - loginOnloadHandler - szPart : "+szPart );                               
                                
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
                                        mainObject.m_Log.Write("YahooPOPClassic - loginOnloadHandler - directory : " +szDirectory);
                                        
                                        szFolderURL = mainObject.m_szLocationURI + szDirectory + szPart
                                    }
                                    else
                                    {
                                        szFolderURL = mainObject.m_szLocationURI + szPart
                                    }
                                }
                                
                                mainObject.m_aszFolderURLList.push(szFolderURL);
                                mainObject.m_Log.Write("YahooPOPClassic.js - loginOnloadHandler - szURL : "+szFolderURL);
                            }
                        }
                    }

                    //server response
                    mainObject.serverComms("+OK Your in\r\n");
                    mainObject.m_bAuthorised = true;
                break;
            };

            mainObject.m_Log.Write("YahooPOPClassic.js - loginOnloadHandler - END");
        }
        catch(err)
        {
            mainObject.m_ComponentManager.deleteAllElements(mainObject.m_szUserName);

            var oCookies = Components.classes["@mozilla.org/nsWebMailCookieManager2;1"]
                                     .getService(Components.interfaces.nsIWebMailCookieManager2);
            oCookies.removeCookie(mainObject.m_szUserName);

            mainObject.m_Log.DebugDump("YahooPOPClassic.js: loginHandler : Exception : "
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
            this.m_Log.Write("YahooPOPClassic.js - getNumMessages - START");

            if (this.m_aszFolderURLList.length == 0) 
            {
                this.serverComms("+OK " + this.m_aMsgDataStore.length + " " + this.m_iTotalSize + "\r\n");
            }
            else 
            {
                this.mailBox(true);
            }
            this.m_Log.Write("YahooPOPClassic.js - getNumMessages - END");
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
        this.m_Log.Write("YahooPOPClassic.js - mailBox - START");

        var szMailboxURI = this.m_aszFolderURLList.shift();
        this.m_Log.Write("YahooPOPClassic.js - getNumMessages - mail box url " + szMailboxURI);

        this.m_HttpComms.setURI(szMailboxURI);
        this.m_HttpComms.setRequestMethod("GET");
        var bResult = this.m_HttpComms.send(this.mailBoxOnloadHandler, this);
        if (!bResult) throw new Error("httpConnection returned false");
        this.m_bStat = bState;

        this.m_Log.Write("YahooPOPClassic.js - mailBox - END");
    },




    mailBoxOnloadHandler : function (szResponse ,event , mainObject)
    {
        try
        {
            mainObject.m_Log.Write("YahooPOPClassic.js - mailBoxOnloadHandler - START");
            mainObject.m_Log.Write("YahooPOPClassic.js - mailBoxOnloadHandler : " + mainObject.m_iStage);

            var httpChannel = event.QueryInterface(Components.interfaces.nsIHttpChannel);

            //check status should be 200.
            mainObject.m_Log.Write("YahooPOPClassic.js - mailBoxOnloadHandler - Mailbox :" + httpChannel.responseStatus);
            if (httpChannel.responseStatus != 200 )
                throw new Error("error status " + httpChannel.responseStatus);
            
            //process message table
            var aMsgTable = szResponse.match(patternYahooMSGIdTable);
            mainObject.m_Log.Write("YahooPOPClassic.js - mailBoxOnloadHandler - msgtable :" + aMsgTable);
            if (aMsgTable)
            {
                var aMsgRows = aMsgTable[0].match(patternYahooClassicMsgRow);
                mainObject.m_Log.Write("YahooPOPClassic.js - mailBoxOnloadHandler - msgRows :" + aMsgRows);

                //get number of msg on page
                var iNum = aMsgRows.length; 
                mainObject.m_Log.Write("YahooPOPClassic.js - mailBoxOnloadHandler - msgRows Num :" + iNum);

                //process data
                if (iNum > 0)
                {
                    for (i= 0 ; i< iNum ; i++)
                    {
                        mainObject.m_Log.Write("YahooPOPClassic.js - mailBoxOnloadHandler - msgRow :" + aMsgRows[i]);
                        
                        var bRead = true;
                        if (mainObject.m_bDownloadUnread)
                        {
                            bRead = (aMsgRows[i].search(PatternYahooUnRead)!=-1) ? true : false;
                            mainObject.m_Log.Write("YahooPOPClassic.js - mailBoxOnloadHandler - bRead -" + bRead);
                        }

                        if (bRead)
                        {
                            var data = new YahooMSG();

                            data.bUnread = (aMsgRows[i].search(PatternYahooUnRead)!=-1) ? true : false;
                            mainObject.m_Log.Write("YahooPOPClassic.js - mailBoxOnloadHandler -  data.bUnread -" +  data.bUnread);

                            //get msg info
                            var szMsgID = aMsgRows[i].match(patternYahooMsgIDAlt)[1];   
                            mainObject.m_Log.Write("YahooPOPClassic.js - mailBoxOnloadHandler - msg id :" + i + " " +szMsgID);
                            data.szMSGUri = szMsgID;
                            data.szDeleteUri = mainObject.m_szDeleteURL;
                            data.aData = mainObject.m_aDeleteData;

                            data.bHasAttachments = aMsgRows[i].search(/attachicon/)!=-1 ? true : false; 
                            mainObject.m_Log.Write("YahooPOPClassic.js - mailBoxOnloadHandler - bHasAttachments :" + i +" "+data.bHasAttachments);
                            
                            //get msg size
                            var aMsgSize = aMsgRows[i].match(patternYahooMsgSize);
                            var szMsgSize = aMsgSize[aMsgSize.length-1]; //size is last element 
                            var szSize = szMsgSize.match(/<td.*?>(.*?)<\/td/)[1];
                            var iSize = parseInt(szSize);
                            if (szSize.indexOf('k')!= -1) iSize*=1000;
                            mainObject.m_Log.Write("YahooPOPClassic.js - mailBoxOnloadHandler - msg size :" + i + " " +iSize);
                            data.iSize = iSize;

                            mainObject.m_iTotalSize += iSize;
                            mainObject.m_aMsgDataStore.push(data);
                        }
                    }
                }
            }

            //check for more pages
            var szNextPage = null;
            try
            {
                szNextPage = szResponse.match(patternYahooNextPageAlt)[1];              
                mainObject.m_Log.Write("YahooPOPClassic.js - mailBoxOnloadHandler - next page :" +szNextPage);
            }
            catch(err)
            {       
                szNextPage = null;      
                mainObject.m_Log.Write("YahooPOPClassic.js: mailBoxOnloadHandler : next page : "
                                              + err.name
                                              + ".\nError message: "
                                              + err.message+ "\n"
                                              + err.lineNumber);
            }

            if (szNextPage)
            {         
                if (!mainObject.m_HttpComms.setURI(szNextPage)) 
                {
                    if (szNextPage.search(/^\//) == -1)
                    {
                        var IOService = Components.classes["@mozilla.org/network/io-service;1"]
                                                  .getService(Components.interfaces.nsIIOService);
                        var nsIURI = IOService.newURI(httpChannel.URI.spec, null, null)
                                              .QueryInterface(Components.interfaces.nsIURL);
                        var szDirectory = nsIURI.directory
                        mainObject.m_Log.Write("YahooPOPClassic - getNumMessages - directory : " +szDirectory);
                        
                        szNextPage = mainObject.m_szLocationURI + szDirectory + szNextPage
                    }
                    else
                    {
                        szNextPage = mainObject.m_szLocationURI +"/" +szNextPage
                    }
                }
                mainObject.m_HttpComms.setURI(szNextPage)                
                mainObject.m_HttpComms.setRequestMethod("GET");
                var bResult = mainObject.m_HttpComms.send(mainObject.mailBoxOnloadHandler, mainObject);
                if (!bResult) throw new Error("httpConnection returned false");
            }
            //check for more folders
            else if ( mainObject.m_aszFolderURLList.length>0)
            {
                mainObject.m_Log.Write("YahooPOPClassic.js - MailBoxOnload - load next folder");

                var szMailboxURI = mainObject.m_aszFolderURLList.shift();
                mainObject.m_Log.Write("YahooPOPClassic.js - getNumMessages - mail box url " + szMailboxURI);

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

            mainObject.m_Log.Write("YahooPOPClassic.js - MailBoxOnload - END");
        }
        catch(err)
        {
             mainObject.m_Log.DebugDump("YahooPOPClassic.js: MailboxOnload : Exception : "
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
            this.m_Log.Write("YahooPOPClassic.js - getMessageSizes - START");

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
                this.m_Log.Write("YahooPOPClassic.js - getMessageSizes - calling stat");
                if (this.m_aszFolderURLList.length==0) return false;
                this.mailBox(false);
            }
            this.m_Log.Write("YahooPOPClassic.js - getMessageSizes - END");
            return true;
        }
        catch(e)
        {
            this.m_Log.DebugDump("YahooPOPClassic.js: getMessageSizes : Exception : "
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
            this.m_Log.Write("YahooPOPClassic.js - processSizes - START");

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

            this.m_Log.Write("YahooPOPClassic.js - processSizes - END");
        }
        catch(err)
        {
            this.m_Timer.cancel();
            this.m_Log.DebugDump("YahooPOPClassic.js: processSizes : Exception : "
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
            this.m_Log.Write("YahooPOPClassic.js - getMessageIDs - START");

            var callback = {
               notify: function(timer) { this.parent.processIDS(timer)}
            };
            callback.parent = this;
            this.m_iHandleCount = 0;
            this.m_Timer.initWithCallback(callback,
                                          this.m_iTime,
                                          Components.interfaces.nsITimer.TYPE_REPEATING_SLACK);

            this.m_Log.Write("YahooPOPClassic.js - getMessageIDs - END");
            return true;
        }
        catch(e)
        {
            this.m_Log.DebugDump("YahooPOPClassic.js: getMessageIDs : Exception : "
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
            this.m_Log.Write("YahooPOPClassic.js - processIDS - START");

            //response start
            if (this.m_iHandleCount ==  0)
                this.serverComms("+OK " + this.m_aMsgDataStore.length + " Messages\r\n");


            if ( this.m_aMsgDataStore.length > 0)
            {
                var iCount = 0;
                do{
                    var szEmailURL = this.m_aMsgDataStore[this.m_iHandleCount].szMSGUri;
                    this.m_Log.Write("YahooPOPClassic.js - getMessageIDs - Email URL : " +szEmailURL);
                     
                    var szEmailID = szEmailURL.match(PatternYahooIDAlt)[1];
                                
                                         
                    //use short id    1_8571_AJSySdEAAREkRPe9dgtLa1BshJg
                    if (this.m_bUseShortID)
                    {
                        var aszIDParts = szEmailID.split(/_/);
                        szEmailID ="";
                        for (var j=0; j<aszIDParts.length; j++)
                        {
                            if (j!=1)
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

            this.m_Log.Write("YahooPOPClassic.js - processIDS - END");
        }
        catch(err)
        {
            this.m_Timer.cancel();
            this.m_Log.DebugDump("YahooPOPClassic.js: processIDS : Exception : "
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
            this.m_Log.Write("YahooPOPClassic.js - getHeaders - START");
            this.m_Log.Write("YahooPOPClassic.js - getHeaders - id " + lID );

            //get msg id
            this.m_iID = lID-1;
            var oMSGData = this.m_aMsgDataStore[lID-1]
            this.m_szMsgID = oMSGData.szMSGUri;
            this.m_Log.Write("YahooPOPClassic.js - getHeaders - msg id" + this.m_szMsgID);

            this.m_szBox= this.m_szMsgID.match(PatternYahooBoxAlt2)[1];
            this.m_Log.Write("YahooPOPClassic.js - getHeaders - msg box" + this.m_szBox);

            //get headers
            var szID = this.m_szMsgID.match(/mid.*?&/)[0];
            var szDest = this.m_szLocationURI.replace(/mc/,"f") + "/ya/download?clean=0&" + szID + this.m_szBox +"&pid=HEADER";
            this.m_Log.Write("YahooPOPClassic.js - getHeaders - url - "+ szDest);
            this.m_iStage = 0;

            //get msg from yahoo
            this.m_HttpComms.setURI(szDest);
            this.m_HttpComms.setRequestMethod("GET");
            var bResult = this.m_HttpComms.send(this.headerOnloadHandler, this);
            if (!bResult) throw new Error("httpConnection returned false");

            this.m_Log.Write("YahooPOPClassic.js - getHeaders - END");
            return true;
        }
        catch(err)
        {

            this.m_Log.DebugDump("YahooPOPClassic.js: getHeaders : Exception : "
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
            mainObject.m_Log.Write("YahooPOPClassic.js - headerOnloadHandler - START");

            var httpChannel = event.QueryInterface(Components.interfaces.nsIHttpChannel);

            //check status should be 200.
            mainObject.m_Log.Write("YahooPOPClassic.js - headerOnloadHandler - msg :" + httpChannel.responseStatus);
            if (httpChannel.responseStatus != 200)
                throw new Error("error status " + httpChannel.responseStatus);

            var szUri = httpChannel.URI.spec;
            mainObject.m_Log.Write("YahooPOPClassic.js - headerOnloadHandler - uri : " + szUri);

            var szHeader  = "X-WebMail: true\r\n";
            var szFolder =  mainObject.m_szBox.match(PatternYahooFolderBoxAlt)[1];

            szHeader += "X-Folder: " +szFolder+ "\r\n";
            szHeader += szResponse;
            szHeader  = szHeader.replace(/^\./mg,"..");    //bit padding
            szHeader += ".\r\n";//msg end

            var  szServerResponse = "+OK " + szHeader.length + "\r\n";
            szServerResponse += szHeader
            mainObject.serverComms(szServerResponse);
            mainObject.m_Log.Write("YahooPOPClassic.js - headerOnloadHandler - END");
        }
        catch(err)
        {
            mainObject.m_Log.DebugDump("YahooPOPClassic.js: headerOnloadHandler : Exception : "
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
            this.m_Log.Write("YahooPOPClassic.js - getMessage - START");
            this.m_Log.Write("YahooPOPClassic.js - getMessage - msg num" + lID);

            if (this.m_oMessage) delete this.m_oMessage;
            this.m_oMessage = new emailBuilder( this.m_Log);
            
            //get msg id
            this.m_iID = lID-1;
            var oMSGData = this.m_aMsgDataStore[lID-1]
            this.m_szMsgID = oMSGData.szMSGUri;
            this.m_Log.Write("YahooPOPClassic.js - getMessage - msg raw url " + this.m_szMsgID);
            this.m_bHasAttachments = oMSGData.bHasAttachments;
                        
            this.m_szBox = this.m_szMsgID.match(PatternYahooBoxAlt2)[1];
            this.m_Log.Write("YahooPOPClassic.js - getMessage - msg box " + this.m_szBox);

            //get headers
            var szID = this.m_szMsgID.match(/mid.*?&/)[0];
            var szDest = this.m_szLocationURI.replace(/mc/,"f")+ "/ya/download?clean=0&" + szID + this.m_szBox +"&pid=HEADER";
            this.m_Log.Write("YahooPOPClassic.js - getMessage - url - "+ szDest);
            this.m_iStage = 0;

            //get msg from yahoo
            this.m_HttpComms.setURI(szDest);
            this.m_HttpComms.setRequestMethod("GET");
            var bResult = this.m_HttpComms.send(this.emailOnloadHandler, this);
            if (!bResult) throw new Error("httpConnection returned false");

            this.m_Log.Write("YahooPOPClassic.js - getMessage - END");
            return true;
        }
        catch(e)
        {
             this.m_Log.DebugDump("YahooPOPClassic.js: getMessage : Exception : "
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
            mainObject.m_Log.Write("YahooPOPClassic.js - emailOnloadHandler - START");
            var httpChannel = event.QueryInterface(Components.interfaces.nsIHttpChannel);
            mainObject.m_Log.Write("YahooPOPClassic.js - emailOnloadHandler - mainObject.m_iStage :" + mainObject.m_iStage);
            
            //check status should be 200.
            mainObject.m_Log.Write("YahooPOPClassic.js - emailOnloadHandler - msg :" + httpChannel.responseStatus);
            if (httpChannel.responseStatus != 200 && mainObject.m_iStage!=3)
                throw new Error("error status " + httpChannel.responseStatus);
            
            var szUri = httpChannel.URI.spec;
            mainObject.m_Log.Write("YahooPOPClassic.js - emailOnloadHandler - uri : " + szUri);
            
            var szContentType = "";
            try
            {
                szContentType =  httpChannel.getResponseHeader("Content-Type");
                mainObject.m_Log.Write("YahooPOPClassic.js - emailOnloadHandler - szContetnType "+szContentType);
            }
            catch(e)
            { 
                szContentType = " "   
            }
            
            switch(mainObject.m_iStage)
            {
                case 0:  ///header
                    mainObject.m_Log.Write("YahooPOPClassic.js - emailOnloadHandler - HEADERS ");
                    
                    try
                    {
                        if (szContentType.search(/text\/html/i)!=-1)
                        {
                            mainObject.m_Log.Write("YahooPOPClassic.js - emailOnloadHandler - error download msg ");
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
                        mainObject.m_Log.Write("YahooPOPClassic.js - emailOnloadHandler - download : Exception : "
                                                  + err.name
                                                  + ".\nError message: "
                                                  + err.message+ "\n"
                                                  + err.lineNumber);
        
                        if ( mainObject.m_iMSGCount == 2) throw new Error("download error ran out of retries")
                    }
                    mainObject.m_iMSGCount = 0;
                    var szMessage = "X-WebMail: true\r\n";
                   
                    var szFolder = mainObject.m_szBox.match(PatternYahooFolderBoxAlt)[1];
                    szMessage += "X-Folder: " + szFolder + "\r\n";
                    szMessage += szResponse;
                    
                    //remove quoted printable header
                    szMessage = szMessage.replace(/content-transfer-Encoding:.*?quoted-printable.*?$/img, "x-Header: removed");
                    szMessage = szMessage.replace(/content-transfer-Encoding:.*?base64.*?$/img,  "x-Header: removed");
                    mainObject.m_oMessage.setEnvolpeHeaders(szMessage);
                    
                    var szID = mainObject.m_szMsgID.match(/mid.*?&/)[0];
                    var szDest = mainObject.m_szLocationURI.replace(/mc/,"f") + "/ya/download?clean=0&" 
                                                                              + szID 
                                                                              + mainObject.m_szBox; 
                    if (!mainObject.m_bHasAttachments) 
                        szDest += "&bodyPart=TEXT&pid=TEXT";
                    else
                        szDest += "&pid=1";
                        
                    mainObject.m_Log.Write("YahooPOPClassic.js - emailOnloadHandler - url - "+ szDest);

                    //get msg from yahoo
                    mainObject.m_iStage++;
                    mainObject.m_HttpComms.setURI(szDest);
                    mainObject.m_HttpComms.setRequestMethod("GET");
                    var bResult = mainObject.m_HttpComms.send(mainObject.emailOnloadHandler, mainObject);
                    if (!bResult) throw new Error("httpConnection returned false");
                break;

                case 1: //body
                    mainObject.m_Log.Write("YahooPOPClassic.js - emailOnloadHandler - BODY ");  
                    
                    if (szContentType.search(/multipart/i) != -1) 
                    {
                        //if this is a mulitpart then the first line is the boundary
                        var szBoundary = szResponse.match(/^--(.*?)\r?\n/m)[1];
                        var szHeader = "Content-Type: multipart/alternative; boundary=\"" + szBoundary + "\"\r\n\r\n";
                        mainObject.m_oMessage.addBody(szHeader, szResponse);
                    }
                    else 
                    {
                        var szHeader = "Content-Type: "+szContentType +"\r\n";
                        szHeader    += "Content-Transfer-Encoding: 7bit\r\n\r\n";
                        mainObject.m_oMessage.addBody(szHeader, szResponse);
                    }
                    
                    if (!mainObject.m_bHasAttachments) //no attachments
                    {
                        if (!mainObject.m_bMarkAsRead) //don't mark as read
                        {
                            mainObject.m_oMessage.buildAsync(mainObject.emailBuiltCallback, mainObject);
                        }
                        else                          //mark as read
                        {
                            mainObject.m_Log.Write("YahooPOPClassic.js - emailOnloadHandler - mark email as read "); 
                            mainObject.markAsRead()
                        }
                    }
                    else   //attachments
                    {
                        mainObject.m_Log.Write("YahooPOPClassic.js - emailOnloadHandler - get first attachment ");    
                        var szID = mainObject.m_szMsgID.match(/mid.*?&/)[0];   
                        var szDest = mainObject.m_szLocationURI.replace(/mc/,"f") + "/ya/download?clean=0&" 
                                                                              + szID 
                                                                              + mainObject.m_szBox
                                                                              + "&pid=2";                   
                        mainObject.m_Log.Write("YahooPOPClassic.js - emailOnloadHandler - url - "+ szDest);
    
                        mainObject.m_iStage=3;
                        mainObject.m_HttpComms.setURI(szDest);
                        mainObject.m_HttpComms.setRequestMethod("GET");
                        var bResult = mainObject.m_HttpComms.send(mainObject.emailOnloadHandler, mainObject);
                        if (!bResult) throw new Error("httpConnection returned false");
                    }
                break;
                
                
                case 2: //marked as read
                    mainObject.m_Log.Write("YahooPOPClassic.js - emailOnloadHandler - Marked as read "); 
                    mainObject.m_oMessage.buildAsync(mainObject.emailBuiltCallback, mainObject);
                break;
                      
                                
                case 3: //handle attachmetns
                    mainObject.m_Log.Write("YahooPOPClassic.js - emailOnloadHandler - handle attachment ");
                     
                    if (httpChannel.responseStatus == 200)   //attachment found
                    {
                        var szContetnDis = "";
                        try 
                        {
                            szContetnDis = httpChannel.getResponseHeader("content-disposition");
                            mainObject.m_Log.Write("YahooPOPClassic.js - emailOnloadHandler - szContetnDis " + szContetnDis);
                            
                            //filename*="utf-8''"
                            if (szContetnDis.search(patternYahooAttFilename)!=-1)
                            {
                                var szFileName= "att";
                                if (szContentType.search(/message\/rfc822/)!=-1) szFileName += ".eml"
                            
                                var szNewFilename = "filename*=\"utf-8'" + szFileName + "'\"";
                                szContetnDis = szContetnDis.replace(patternYahooAttFilename,szNewFilename );     
                            }                                            
                        } 
                        catch (e) 
                        {
                        }                       
                        
                        //construct header
                        var szHeader = "";
                        szHeader = "Content-Type: application/octet-stream\r\n";
                        szHeader += "Content-Transfer-Encoding: base64\r\n";
                        szHeader += "Content-Disposition: " + szContetnDis + "\"\r\n\r\n";
                        
                        mainObject.m_oMessage.addAttachment(szHeader, szResponse);
                        
                        var szID = mainObject.m_szMsgID.match(/mid.*?&/)[0];   
                        var szDest = mainObject.m_szLocationURI.replace(/mc/,"f") + "/ya/download?clean=0&" 
                                                                              + szID 
                                                                              + mainObject.m_szBox
                                                                              + "&pid="+mainObject.m_iCount;                   
                        mainObject.m_Log.Write("YahooPOPClassic.js - emailOnloadHandler - url - "+ szDest);
                        mainObject.m_iCount++;
                        mainObject.m_iStage=3;
                        mainObject.m_HttpComms.setURI(szDest);
                        mainObject.m_HttpComms.setRequestMethod("GET");
                        var bResult = mainObject.m_HttpComms.send(mainObject.emailOnloadHandler, mainObject);
                        if (!bResult) throw new Error("httpConnection returned false");
                    } 
                    else  //no more attachments
                    {
                        if (!mainObject.m_bMarkAsRead) //don't mark as read
                        {
                            mainObject.m_oMessage.buildAsync(mainObject.emailBuiltCallback, mainObject);
                        }
                        else //mark as read
                         {
                            mainObject.m_Log.Write("YahooPOPClassic.js - emailOnloadHandler - mark email as read ");
                            mainObject.markAsRead();
                        }
                    }      
                break;             
            }

            mainObject.m_Log.Write("YahooPOPClassic.js - emailOnloadHandler - END");
        }
        catch(err)
        {
            mainObject.m_Log.DebugDump("YahooPOPClassic.js: emailOnloadHandler : Exception : "
                                          + err.name
                                          + ".\nError message: "
                                          + err.message+ "\n"
                                          + err.lineNumber);

            mainObject.serverComms("-ERR negative vibes from "+ mainObject.m_szUserName +"\r\n");
        }
    },


    markAsRead : function()
    {
        try
        {
            this.m_Log.Write("YahooPOPClassic.js -markAsRead - START"); 
                  
            var szDest = this.m_szLocationURI + "/mc/showFolder?" + this.m_szBox;
            
            var szID = this.m_szMsgID.match(PatternYahooIDAlt)[1];
            this.m_HttpComms.addValuePair("mid", szID);
            this.m_HttpComms.addValuePair("top_mark_select", 1);
            this.m_HttpComms.addValuePair("top_bpress_topmark", "Mark");
            this.m_HttpComms.addValuePair("top_move_select", "");

            var szCrumb = this.m_szMsgID.match(PatternYahooCrumb)[1];
            this.m_HttpComms.addValuePair("mcrumb", szCrumb);
            this.m_iStage=2;
            this.m_HttpComms.setURI(szDest);
            this.m_HttpComms.setRequestMethod("POST");          
            var bResult = this.m_HttpComms.send(this.emailOnloadHandler, this);
            if (!bResult) throw new Error("httpConnection returned false");
            
            this.m_Log.Write("YahooPOPClassic.js -markAsRead - END"); 
            return true;
        }
        catch(e)
        {
            this.m_Log.DebugDump("YahooPOPClassic.js: markAsRead : Exception : "
                              + e.name +
                              ".\nError message: "
                              + e.message+ "\n"
                              + e.lineNumber);
            return false;
        }
    },
    
    
    
    emailBuiltCallback : function( mainObject)
    {
       try
       {
            mainObject.m_Log.Write("YahooPOPClassic.js: emailBuilt : START ");
            var szEmail = mainObject.m_oMessage.getEmail();                  
            var szPOPResponse = "+OK " + szEmail.length + "\r\n";
            szPOPResponse += szEmail;
            mainObject.serverComms(szPOPResponse);
            delete mainObject.m_oMessage;
            mainObject.m_oMessage = null; 
            mainObject.m_Log.Write("YahooPOPClassic.js: emailBuilt : END ");
            return true;
       } 
       catch(err)
       {
            mainObject.m_Log.DebugDump("YahooPOPClassic.js: emailBuilt : Exception : "
                                          + err.name
                                          + ".\nError message: "
                                          + err.message+ "\n"
                                          + err.lineNumber);

            mainObject.serverComms("-ERR negative vibes from "+ mainObject.m_szUserName +"\r\n");
            return false;
       }
    },



    //dele
    deleteMessage : function(lID)
    {
        try
        {
            this.m_Log.Write("YahooPOPClassic.js - deleteMessage - START");
            this.m_Log.Write("YahooPOPClassic.js - deleteMessage - id " + lID );

            //create URL
            var oMSGData = this.m_aMsgDataStore[lID-1];
            
            var szBox = oMSGData.szMSGUri.match(PatternYahooBoxAlt2)[1];
            var szPath = this.m_szLocationURI + "/mc/showFolder?" + szBox;
            this.m_Log.Write("YahooPOPClassic.js - deleteMessage - url - "+ szPath);              

            var szID = oMSGData.szMSGUri.match(PatternYahooIDAlt)[1];
            this.m_HttpComms.addValuePair("mid", szID);
            this.m_HttpComms.addValuePair("top_bpress_delete", "Delete");
            this.m_HttpComms.addValuePair("top_mark_select", 0);
            this.m_HttpComms.addValuePair("top_move_select", "");
        
            var szCrumb = oMSGData.szMSGUri.match(PatternYahooCrumb)[1];
            this.m_HttpComms.addValuePair("mcrumb", szCrumb);
            this.m_HttpComms.setURI(szPath);
            this.m_HttpComms.setRequestMethod("POST");          
            var bResult = this.m_HttpComms.send(this.deleteMessageOnloadHandler, this);
            if (!bResult) throw new Error("httpConnection returned false");         

            this.m_Log.Write("YahooPOPClassic.js - deleteMessage - END");
            return true;
        }
        catch(e)
        {
            this.m_Log.DebugDump("YahooPOPClassic.js: deleteMessage : Exception : "
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
            mainObject.m_Log.Write("YahooPOPClassic.js - deleteMessageOnload - START");
            var httpChannel = event.QueryInterface(Components.interfaces.nsIHttpChannel);

            //check status should be 200.
            mainObject.m_Log.Write("YahooPOPClassic.js - deleteMessageOnload :" + httpChannel.responseStatus);
            if (httpChannel.responseStatus != 200 )
                throw new Error("error status " + httpChannel.responseStatus);

            mainObject.serverComms("+OK its history\r\n");
            mainObject.m_Log.Write("YahooPOPClassic.js - deleteMessageOnload - END");
        }
        catch(e)
        {
            mainObject.m_Log.DebugDump("YahooPOPClassic.js: deleteMessageOnload : Exception : "
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
            this.m_Log.Write("YahooPOPClassic.js - logOUT - START");

            if (this.m_bReUseSession)
            {
                this.m_Log.Write("YahooPOPClassic.js - logOut - Setting Session Data");
                this.m_ComponentManager.addElement(this.m_szUserName, "szHomeURI", this.m_szHomeURI);
            }
            else
            {
                this.m_Log.Write("YahooPOPClassic.js - logOUT - removing Session Data");
                this.m_ComponentManager.deleteAllElements(this.m_szUserName);

                var oCookies = Components.classes["@mozilla.org/nsWebMailCookieManager2;1"]
                                         .getService(Components.interfaces.nsIWebMailCookieManager2);
                oCookies.removeCookie(this.m_szUserName);
            }


            this.m_bAuthorised = false;
            this.serverComms("+OK Your Out\r\n");
            this.m_Timer.cancel();
            delete this.m_aMsgDataStore;
            delete this.m_aszFolderURLList;

            this.m_Log.Write("YahooPOPClassic.js - logOUT - END");
            return true;
        }
        catch(e)
        {
            this.m_Log.DebugDump("YahooPOPClassic.js: logOUT : Exception : "
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
            this.m_Log.Write("YahooPOPClassic.js - serverComms msg " + szMsg);
            var iCount = this.m_oResponseStream.write(szMsg,szMsg.length);
            this.m_Log.Write("YahooPOPClassic.js - serverComms sent count: " + iCount +" msg length: " +szMsg.length);
        }
        catch(e)
        {
            this.m_Log.DebugDump("YahooPOPClassic.js: serverComms : Exception : "
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
            this.m_Log.Write("YahooPOPClassic.js - writeImageFile - End");

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
            this.m_Log.DebugDump("YahooPOPClassic.js: writeImageFile : Exception : "
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
            this.m_Log.Write("YahooPOPClassic : openWindow - START");

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
            this.m_Log.Write("YahooPOPClassic : openWindow - " + iResult);
            var szResult =  null;
            if (iResult)
            {
                szResult = params.GetString(0);
                this.m_Log.Write("YahooPOPClassic : openWindow - " + szResult);
            }

            this.m_Log.Write("YahooPOPClassic : openWindow - END");
            return szResult;
        }
        catch(err)
        {
            this.m_Log.DebugDump("YahooPOPClassic: Exception in openWindow : "
                                               + err.name
                                               + ".\nError message: "
                                               + err.message + "\n"
                                               + err.lineNumber);
        }
    },
}
