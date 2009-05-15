/******************************  Yahoo Current Site  ***************************************/

function YahooPOPBETA(oResponseStream, oLog, oPrefs)
{
    try
    {
        var scriptLoader = Components.classes["@mozilla.org/moz/jssubscript-loader;1"];
        scriptLoader = scriptLoader.getService(Components.interfaces.mozIJSSubScriptLoader);
        scriptLoader.loadSubScript("chrome://web-mail/content/common/DebugLog.js");
        scriptLoader.loadSubScript("chrome://web-mail/content/common/HttpComms3.js");
        scriptLoader.loadSubScript("chrome://yahoo/content/YahooMSG.js");
        scriptLoader.loadSubScript("chrome://yahoo/content/Yahoo-Prefs-Accounts-Data.js");
        scriptLoader.loadSubScript("chrome://yahoo/content/EmailBuilder.js");
        scriptLoader.loadSubScript("chrome://yahoo/content/HTML-escape.js");

        this.m_Log = oLog;
        this.m_Log.Write("YahooPOPBETA.js - Constructor - START");

        //prefs
        this.m_bReUseSession = oPrefs.bReUseSession;    //re use session
        this.m_bDownloadUnread= oPrefs.bUnread;         //download unread
        this.m_aszPrefFolderList = oPrefs.aszFolder;    // download folder
        this.m_iTime = oPrefs.iProcessDelay;            //timer delay
        this.m_iProcessAmount =  oPrefs.iProcessAmount; //delay proccess amount
        this.m_bUseShortID = oPrefs.bUseShortID;
        this.m_bMarkAsRead = oPrefs.bMarkAsRead;
        this.m_iMSGList  = oPrefs.iMSGList;             //max number of msg pre folder


        //login data
        this.m_bAuthorised = false;
        this.m_szUserName = null;
        this.m_szPassWord = null;
        this.m_oResponseStream = oResponseStream;

        //comms
        this.m_HttpComms = new HttpComms(this.m_Log);
        this.m_HttpComms.setUserAgentOverride(true);
        
        this.m_szLoginUserName = null;
        this.m_aLoginForm = null;
        this.m_bReEntry = false;
        this.m_bStat = false;
        this.m_szYahooMail = null;
        this.m_szHomeURI = null;
        this.m_iStage = 0;
        this.m_iLoginCount = 0;
        this.m_szLocationURI = null;
        this.m_szWssid = null;
        this.m_aszFolderList= new Array();
        this.m_aRawData = new Array();
        this.m_aMsgDataStore = new Array();
        this.m_aDownloadFiles = new Array();
        
        this.m_iTotalSize = 0;
        this.m_iMSGCount = 0;
        this.m_szEmail = "";
        this.m_szMsgID = null;
        this.m_szBox = null;
        this.m_iID =0;
        this.m_oEmail = null;

        this.m_Timer = Components.classes["@mozilla.org/timer;1"]
                                 .createInstance(Components.interfaces.nsITimer);

        this.m_ComponentManager = Components.classes["@mozilla.org/ComponentData2;1"]
                                            .getService(Components.interfaces.nsIComponentData2);

        this.m_Log.Write("YahooPOPBETA.js - Constructor - END");
    }
    catch(e)
    {
        DebugDump("YahooPOPBETA.js: Constructor : Exception : "
                                      + e.name
                                      + ".\nError message: "
                                      + e.message+ "\n"
                                      + e.lineNumber);
    }
}



YahooPOPBETA.prototype =
{
    logIn : function(szUserName , szPassword)
    {
        try
        {
            this.m_Log.Write("YahooPOPBETA.js - logIN - START");
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

            this.m_Log.Write("YahooPOPBETA.js - logIN - default " +this.m_szYahooMail);
            this.m_iStage = 0;
            this.m_HttpComms.setURI(this.m_szYahooMail);
            this.m_HttpComms.setUserName(this.m_szUserName);

            //get session data
            if (this.m_bReUseSession)
            {
                this.m_Log.Write("YahooPOPBETA.js - logIN - Getting Session Data");
                this.m_szHomeURI = this.m_ComponentManager.findElement(this.m_szUserName, "szHomeURI");
                this.m_Log.Write("YahooPOPBETA - logIN - m_szLocation " +this.m_szHomeURI);
                if (this.m_szHomeURI)
                {
                    this.m_Log.Write("YahooPOPBETA.js - logIN - Session Data Found");
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
            this.m_Log.Write("YahooPOPBETA.js - logIN - END");
            return true;
        }
        catch(e)
        {
            this.m_Log.DebugDump("YahooPOPBETA.js: logIN : Exception : "
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
            mainObject.m_Log.Write("YahooPOPBETA.js - loginOnloadHandler - START");
            mainObject.m_Log.Write("YahooPOPBETA.js - loginOnloadHandler : Stage" + mainObject.m_iStage);

            var httpChannel = event.QueryInterface(Components.interfaces.nsIHttpChannel);
            //if this fails we've gone somewhere new
            mainObject.m_Log.Write("nsYahoo.js - loginOnloadHandler - status :" +httpChannel.responseStatus );
            if (httpChannel.responseStatus != 200)
                throw new Error("return status " + httpChannel.responseStatus);
                    
            var szLocation  = httpChannel.URI.spec;
            mainObject.m_Log.Write("YahooPOPBETA.js - loginOnloadHandler - page check : " + szLocation );

            if (szResponse.search(patternYahooLoginForm)!=-1)
            {
                if ( mainObject.m_iLoginCount<=3)
                {
                    if (szResponse.search(patternYahooLogInSpam)!=-1)
                    {
                        mainObject.m_Log.Write("YahooPOPBETA.js - loginOnloadHandler - Spam Image found");
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
            
            
            if (mainObject.m_iStage == 0 && szResponse.search(kPatternLogOut)!=-1)
            {             
                mainObject.m_Log.Write("YahooPOPBETA.js - loginOnloadHandler - already login");
                mainObject.m_iStage =2; //logged in already
                mainObject.m_iLoginCount++;
            }
            

            //page code
            switch (mainObject.m_iStage)
            {
                case 0: // login page
                    var aLoginForm = szResponse.match(patternYahooLoginForm);
                    if (aLoginForm == null)
                         throw new Error("error parsing yahoo login web page");
                    mainObject.m_Log.Write("YahooPOPBETA.js - loginOnloadHandler - loginForm " + aLoginForm);


                    var szLoginURL = aLoginForm[0].match(patternYahooAction)[1];
                    mainObject.m_Log.Write("YahooPOPBETA.js - loginOnloadHandler - loginURL " + szLoginURL);

                    var aLoginData = aLoginForm[0].match(patternYahooInput);
                    mainObject.m_Log.Write("YahooPOPBETA.js - loginOnloadHandler - loginData " + aLoginData);

                    for (i=0; i<aLoginData.length; i++)
                    {
                        var szName=aLoginData[i].match(patternYahooNameAlt)[1];
                        szName = szName.replace(/["|']/gm,"");
                        szName = szName.replace(/^\s*|\s*$/gm,"");
                        mainObject.m_Log.Write("YahooPOPBETA.js - loginOnloadHandler - loginData name " + szName);

                        var szValue = aLoginData[i].match(patternYahooAltValue)[1];
                        szValue = szValue.replace(/["|']/gm,"");
                        szValue = szValue.replace(/^\s*|\s*$/gm,"");
                        mainObject.m_Log.Write("YahooPOPBETA.js - loginOnloadHandler - loginData value " + szValue);

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
                    mainObject.m_Log.Write("YahooPOPBETA.js - loginOnloadHandler - login redirect " + aLoginRedirect);

                    var szLocation = aLoginRedirect[1];

                    mainObject.m_HttpComms.setURI(szLocation);
                    mainObject.m_HttpComms.setRequestMethod("GET");
                    var bResult = mainObject.m_HttpComms.send(mainObject.loginOnloadHandler, mainObject);
                    if (!bResult) throw new Error("httpConnection returned false");
                    mainObject.m_iStage++;
                break;

                case 2: //mail box

                    if (szResponse.search(kPatternLogOut)== -1)
                    {
                        mainObject.m_Log.Write("YahooPOPBETA.js - loginOnloadHandler - logout not found");
                        //check for bounce
                        if (szResponse.search(kPatternBTBounce)!= -1 && !mainObject.m_bReEntry) 
                        {
                            var szRedirect = szResponse.match(kPatternBTBounce)[1];
                            mainObject.m_Log.Write("YahooPOPBETA.js - loginOnloadHandler - szRedirect: " + szRedirect );
                            if (!mainObject.m_HttpComms.setURI(szRedirect))
                                mainObject.m_HttpComms.setURI(szLocation + szRedirect);
                            mainObject.m_HttpComms.setRequestMethod("GET");
                            var bResult = mainObject.m_HttpComms.send(mainObject.loginOnloadHandler, mainObject);
                            if (!bResult) throw new Error("httpConnection returned false");
                            return;
                        }
                        else if (mainObject.m_bReEntry)
                        {                       
                            //clean and start again
                            mainObject.m_ComponentManager.deleteAllElements(mainObject.m_szUserName);
                            
                            var oCookies = Components.classes["@mozilla.org/nsWebMailCookieManager2;1"]
                                                     .getService(Components.interfaces.nsIWebMailCookieManager2);
                            oCookies.removeCookie(mainObject.m_szUserName);
                            
                            mainObject.m_bReEntry = false;
                            mainObject.m_iStage = 0;
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

                    //get wssid
                    mainObject.m_szWssid = szResponse.match(kPatternWssid)[1];
                    mainObject.m_Log.Write("YahooPOPBETA.js - loginOnloadHandler - m_szWssid : "+mainObject.m_szWssid );

                    mainObject.m_szLocationURI = httpChannel.URI.prePath ;
                    mainObject.m_Log.Write("YahooPOPBETA.js - loginOnloadHandler - m_szLocationURI : "+mainObject.m_szLocationURI );

                    mainObject.m_iStage++;
                    var szURI = mainObject.m_szLocationURI + "/ws/mail/v1/soap?appid=YahooMailRC&m=ListFolders&wssid="+mainObject.m_szWssid;
                    mainObject.m_Log.Write("YahooPOPBETA.js - loginOnloadHandler - szURI " + szURI);
                    mainObject.m_HttpComms.setURI(szURI);
                    mainObject.m_HttpComms.setRequestMethod("POST");
                    mainObject.m_HttpComms.setContentType("application/xml");
                    mainObject.m_HttpComms.addData(kListFolders);
                    var bResult = mainObject.m_HttpComms.send(mainObject.loginOnloadHandler, mainObject);
                    if (!bResult) throw new Error("httpConnection returned false");
                break;

                case 3: //process folder list
                    var szFolderResponse = szResponse.match(kPatternFolderResponse)[1];
                    mainObject.m_Log.Write("YahooPOPBETA.js - loginOnloadHandler - szFolderResponse : "+szFolderResponse);

                    var aszFolders = szFolderResponse.match(kPatternFolderData);
                    mainObject.m_Log.Write("YahooPOPBETA.js - loginOnloadHandler - aszFolders : "+aszFolders);

                    for (var i=0; i<mainObject.m_aszPrefFolderList.length; i++)
                    {
                        var regExp = new RegExp("^"+mainObject.m_aszPrefFolderList[i]+"$","i");
                        mainObject.m_Log.Write("YahooPOP.js - loginOnloadHandler - regExp : "+regExp );

                        for (var j=0; j<aszFolders.length; j++)
                        {
                            var szBox = aszFolders[j].match(kPatternFolderID)[1];
                            mainObject.m_Log.Write("YahooPOP.js - loginOnloadHandler - szBox : "+szBox );

                            if (szBox.search(regExp)!=-1)
                            {
                                mainObject.m_aszFolderList.push(szBox);
                                mainObject.m_Log.Write("YahooPOP.js - loginOnloadHandler - Found");
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
                    mainObject.m_Log.Write("YahooPOPBETA.js - loginOnloadHandler - loginForm Spam " +  mainObject.m_aLoginForm );

                    var szSpamURI = mainObject.m_aLoginForm[0].match(patternYahooSpanURI)[1];
                    mainObject.m_Log.Write("YahooPOPBETA.js - loginOnloadHandler - szSpamURI " +  szSpamURI );

                    mainObject.m_HttpComms.setURI(szSpamURI);
                    mainObject.m_HttpComms.setRequestMethod("GET");
                    var bResult = mainObject.m_HttpComms.send(mainObject.loginOnloadHandler, mainObject);
                    if (!bResult) throw new Error("httpConnection returned false");
                    mainObject.m_iStage++;
                break;



                case 5: //send login
                    mainObject.m_Log.Write("YahooPOPBETA.js - loginOnloadHandler - image download");
                    var szPath = mainObject.writeImageFile(szResponse);
                    mainObject.m_Log.Write("YahooPOPBETA.js - loginOnloadHandler - imageFile " + szPath);
                    var szResult =  mainObject.openSpamWindow(szPath);
                    if (!szResult) throw new Error("Spam Handling Error");

                    //construct form
                    var szLoginURL = mainObject.m_aLoginForm[0].match(patternYahooAction)[1];
                    mainObject.m_Log.Write("YahooPOPBETA.js - loginOnloadHandler - loginURL " + szLoginURL);

                    var aLoginData = mainObject.m_aLoginForm[0].match(patternYahooInput);
                    mainObject.m_Log.Write("YahooPOPBETA.js - loginOnloadHandler - loginData " + aLoginData);

                    for (i=0; i<aLoginData.length; i++)
                    {
                        var szName=aLoginData[i].match(patternYahooNameAlt)[1];
                        szName = szName.replace(/["|']/gm,"");
                        szName = szName.replace(/^\s*|\s*$/gm,"");
                        mainObject.m_Log.Write("YahooPOPBETA.js - loginOnloadHandler - loginData name " + szName);

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

            mainObject.m_Log.Write("YahooPOPBETA.js - loginOnloadHandler - END");
        }
        catch(err)
        {
            mainObject.m_ComponentManager.deleteAllElements(mainObject.m_szUserName);

            var oCookies = Components.classes["@mozilla.org/nsWebMailCookieManager2;1"]
                                     .getService(Components.interfaces.nsIWebMailCookieManager2);
            oCookies.removeCookie(mainObject.m_szUserName);

            mainObject.m_Log.DebugDump("YahooPOPBETA.js: loginHandler : Exception : "
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
            this.m_Log.Write("YahooPOPBETA.js - getNumMessages - START");
            
            if (this.m_aszFolderList.length == 0) 
            {
                this.serverComms("+OK " + this.m_aMsgDataStore.length + " " + this.m_iTotalSize + "\r\n");
            }
            else 
            {
                this.mailBox(true);
            }

            this.m_Log.Write("YahooPOPBETA.js - getNumMessages - END");
            return true;
        }
        catch(e)
        {
            this.m_Log.DebugDump("YahooPOPBETA.js: getNumMessages : Exception : "
                                          + e.name
                                          + ".\nError message: "
                                          + e.message+ "\n"
                                          + e.lineNumber);
            return false;
        }
    },


    mailBox : function (bState)
    {
        this.m_Log.Write("YahooPOPBETA.js - mailBox - START");

        var szFolderName = this.m_aszFolderList.shift();
        this.m_Log.Write("YahooPOPBETA.js - mailBox - szFolderName " + szFolderName);
        var szData = kLstMsgs.replace(/folderName/,szFolderName);
        szData = szData.replace(/MSGLIST/,this.m_iMSGList);
        
        var szURI = this.m_szLocationURI + "/ws/mail/v1/soap?appid=YahooMailRC&m=ListMessages&wssid="+this.m_szWssid;
        this.m_Log.Write("YahooPOPBETA.js - mailBox - szURI " + szURI);
        this.m_HttpComms.setURI(szURI);
        this.m_HttpComms.setRequestMethod("POST");
        this.m_HttpComms.setContentType("application/xml");
        this.m_HttpComms.addData(szData);
        var bResult = this.m_HttpComms.send(this.mailBoxOnloadHandler, this);
        if (!bResult) throw new Error("httpConnection returned false");
        this.m_bStat = bState;

        this.m_Log.Write("YahooPOPBETA.js - mailBox - END");
    },




    mailBoxOnloadHandler : function (szResponse ,event , mainObject)
    {
        try
        {
            mainObject.m_Log.Write("YahooPOPBETA.js - mailBoxOnloadHandler - START");
            mainObject.m_Log.Write("YahooPOPBETA.js - mailBoxOnloadHandler : " + mainObject.m_iStage);

            var httpChannel = event.QueryInterface(Components.interfaces.nsIHttpChannel);

            //check status should be 200.
            mainObject.m_Log.Write("YahooPOPBETA.js - mailBoxOnloadHandler - Mailbox :" + httpChannel.responseStatus);
            if (httpChannel.responseStatus != 200 )
                throw new Error("error status " + httpChannel.responseStatus);

            var aszResponses = szResponse.match(kPatternInfo);
            mainObject.m_Log.Write("YahooPOPBETA.js - mailBoxOnloadHandler - mailbox - " + aszResponses);
            if (aszResponses)
            {
                var szFolderInfo = szResponse.match(kPatternFolderInfo)[0];
                mainObject.m_Log.Write("YahooPOPBETA.js - mailBoxOnloadHandler - szFolderInfo - " + szFolderInfo);

                mainObject.m_aRawData.push (szFolderInfo);
                var aTemp = mainObject.m_aRawData.concat(aszResponses);
                delete mainObject.m_aRawData;
                mainObject.m_aRawData = aTemp;
            }

            if (mainObject.m_aszFolderList.length>0) //load next folder
            {
                this.m_Log.Write("YahooPOPBETA.js - mailBoxOnloadHandler - Loading Next Folder ");
                var szFolderName = mainObject.m_aszFolderList.shift();
                this.m_Log.Write("YahooPOPBETA.js - mailBoxOnloadHandler - szFolderName " + szFolderName);
                var szData = kLstMsgs.replace(/folderName/,szFolderName);
                szData = szData.replace(/MSGLIST/,mainObject.m_iMSGList);

                var szURI = mainObject.m_szLocationURI + "/ws/mail/v1/soap?appid=YahooMailRC&m=ListMessages&wssid="+mainObject.m_szWssid;
                mainObject.m_HttpComms.setURI(szURI);
                mainObject.m_HttpComms.setRequestMethod("POST");
                mainObject.m_HttpComms.setContentType("application/xml");
                mainObject.m_HttpComms.addData(szData);
                var bResult = mainObject.m_HttpComms.send(mainObject.mailBoxOnloadHandler, mainObject);
                if (!bResult) throw new Error("httpConnection returned false");
            }
            else
            {
                mainObject.m_Log.Write("YahooPOPBETA.js - mailBoxOnloadHandler - download complete - starting delay");

                //start timer
                var callback = {
                    notify: function(timer) { this.parent.processItem(timer)}
                 };
                callback.parent = mainObject;

                mainObject.m_Timer.initWithCallback(callback,
                                                    mainObject.m_iTime,
                                                    Components.interfaces.nsITimer.TYPE_REPEATING_SLACK);
            }

            mainObject.m_Log.Write("YahooPOPBETA.js - MailBoxOnload - END");
        }
        catch(err)
        {
             mainObject.m_Log.DebugDump("YahooPOPBETA.js: MailboxOnload : Exception : "
                                              + err.name
                                              + ".\nError message: "
                                              + err.message+ "\n"
                                              + err.lineNumber);

            mainObject.serverComms("-ERR negative vibes from "+ mainObject.m_szUserName +"\r\n");
        }
    },





    processItem : function(timer)
    {
        try
        {
            this.m_Log.Write("YahooPOPBETA.js - processItem - START");

            if (this.m_aRawData.length>0)
            {
                var iCount=0;
                do{
                    var Item = this.m_aRawData.shift();
                    this.m_Log.Write("YahooPOPBETA.js - processItem - Item " + Item);

                    if (Item.search(/folderInfo/)!=-1)  //folder info
                    {
                        this.m_szBox = Item.match(kPatternFolderID)[1];
                        this.m_Log.Write("YahooPOPBETA.js - processItem - folder " +this.m_szBox );
                    }
                    else  //message info
                    {
                        var bRead = true;
                        if (this.m_bDownloadUnread)
                        {
                            bRead = parseInt(Item.match(kPatternSeen)[1]) ? false : true;
                            this.m_Log.Write("YahooPOPBETA.js - processItem - bRead -" + bRead);
                        }

                        if (bRead)
                        {
                            //mail url
                            var oMSG = new YahooMSG();

                            //ID
                            oMSG.szID =  Item.match(kPatternID)[1];
                            this.m_Log.Write("YahooPOPBETA.js - processItem - oMSG.szID -" + oMSG.szID);

                            //size
                            oMSG.iSize = parseInt(Item.match(kPatternSize)[1]);
                            this.m_Log.Write("YahooPOPBETA.js - processItem - oMSG.iSize - "+ oMSG.iSize);
                            this.m_iTotalSize += oMSG.iSize;

                            //Folder
                            oMSG.szFolder = this.m_szBox;
                            this.m_Log.Write("YahooPOPBETA.js - processItem - oMSG.szFolder - "+ oMSG.szFolder);

                            this.m_aMsgDataStore.push(oMSG);
                        }
                    }

                    iCount++;
                    this.m_Log.Write("YahooPOPBETA.js - processItem - rawData icount " + iCount + " " + this.m_aRawData.length);
                }while(iCount != this.m_iProcessAmount && this.m_aRawData.length!=0)

            }
            else
            {
                this.m_Log.Write("YahooPOPBETA.js - processItem - all data handled");
                timer.cancel();
                delete  this.m_aRawData;

                if (this.m_bStat) //called by stat
                {
                    //server response
                    this.serverComms("+OK "+ this.m_aMsgDataStore.length + " " + this.m_iTotalSize + "\r\n");
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

            this.m_Log.Write("YahooPOPBETA.js - notify - END");
        }
        catch(err)
        {
            this.m_Timer.cancel();
            this.m_Log.DebugDump("YahooPOPBETA.js: notify : Exception : "
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
            this.m_Log.Write("YahooPOPBETA.js - getMessageSizes - START");

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
                this.m_Log.Write("YahooPOPBETA.js - getMessageSizes - calling stat");
                this.mailBox(false);
            }
            this.m_Log.Write("YahooPOPBETA.js - getMessageSizes - END");
            return true;
        }
        catch(e)
        {
            this.m_Log.DebugDump("YahooPOPBETA.js: getMessageSizes : Exception : "
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
            this.m_Log.Write("YahooPOPBETA.js - processSizes - START");

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

            this.m_Log.Write("YahooPOPBETA.js - processSizes - END");
        }
        catch(err)
        {
            this.m_Timer.cancel();
            this.m_Log.DebugDump("YahooPOPBETA.js: processSizes : Exception : "
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
            this.m_Log.Write("YahooPOPBETA.js - getMessageIDs - START");

            var callback = {
               notify: function(timer) { this.parent.processIDS(timer)}
            };
            callback.parent = this;
            this.m_iHandleCount = 0;
            this.m_Timer.initWithCallback(callback,
                                          this.m_iTime,
                                          Components.interfaces.nsITimer.TYPE_REPEATING_SLACK);

            this.m_Log.Write("YahooPOPBETA.js - getMessageIDs - END");
            return true;
        }
        catch(e)
        {
            this.m_Log.DebugDump("YahooPOPBETA.js: getMessageIDs : Exception : "
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
            this.m_Log.Write("YahooPOPBETA.js - processIDS - START");

            //response start
            if (this.m_iHandleCount ==  0)
                this.serverComms("+OK " + this.m_aMsgDataStore.length + " Messages\r\n");


            if ( this.m_aMsgDataStore.length > 0)
            {
                var iCount = 0;
                do{
                    var szEmailID = this.m_aMsgDataStore[this.m_iHandleCount].szID;;

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

            this.m_Log.Write("YahooPOPBETA.js - processIDS - END");
        }
        catch(err)
        {
            this.m_Timer.cancel();
            this.m_Log.DebugDump("YahooPOPBETA.js: processIDS : Exception : "
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
            this.m_Log.Write("YahooPOPBETA.js - getHeaders - START");
            this.m_Log.Write("YahooPOPBETA.js - getHeaders - id " + lID );

            //get msg id
            var oMSGData = this.m_aMsgDataStore[lID-1];
            this.m_szMsgID = oMSGData.szID;
            this.m_szBox = oMSGData.szFolder;
            var szData = kMSGHeaders.replace(/MSGID/,oMSGData.szID).replace(/FOLDERNAME/,oMSGData.szFolder);
            this.m_Log.Write("YahooPOPBETA.js - getHeaders - szData " + szData);

            var szURI = this.m_szLocationURI + "/ws/mail/v1/soap?&appid=YahooMailRC&m=GetMessageRawHeader&wssid="+this.m_szWssid;
            this.m_Log.Write("YahooPOPBETA.js - getHeaders - szURI " + szURI);

            this.m_HttpComms.setURI(szURI);
            this.m_HttpComms.setRequestMethod("POST");
            this.m_HttpComms.setContentType("application/xml");
            this.m_HttpComms.addData(szData);
            var bResult = this.m_HttpComms.send(this.headerOnloadHandler, this);
            if (!bResult) throw new Error("httpConnection returned false");

            this.m_Log.Write("YahooPOPBETA.js - getHeaders - END");
            return true;
        }
        catch(e)
        {

            this.m_Log.DebugDump("YahooPOPBETA.js: getHeaders : Exception : "
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
            mainObject.m_Log.Write("YahooPOPBETA.js - headerOnloadHandler - START");

            var httpChannel = event.QueryInterface(Components.interfaces.nsIHttpChannel);

            //check status should be 200.
            mainObject.m_Log.Write("YahooPOPBETA.js - headerOnloadHandler - msg :" + httpChannel.responseStatus);
            if (httpChannel.responseStatus != 200)
                throw new Error("error status " + httpChannel.responseStatus);

            var szHeader = szResponse.match(kPatternHeader)[1];
            var oEscapeDecode = new HTMLescape();
            szHeader= oEscapeDecode.decode(szHeader)
            delete oEscapeDecode;
            mainObject.m_Log.Write("YahooPOPBETA.js - headerOnloadHandler - szHeader : " + szHeader);

            var szEmail = "X-WebMail: true\r\n";
            szEmail += "X-Folder: " +mainObject.m_szBox+ "\r\n";
            szEmail += szHeader;
            szEmail = szEmail.replace(/^\./mg,"..");    //bit padding
            szEmail += ".\r\n";//msg end

            var szServerResponse = "+OK " + szEmail.length + "\r\n";
            szServerResponse += szEmail;
            mainObject.serverComms(szServerResponse);
            mainObject.m_Log.Write("YahooPOPBETA.js - headerOnloadHandler - END");
        }
        catch(err)
        {
            mainObject.m_Log.DebugDump("YahooPOPBETA.js: headerOnloadHandler : Exception : "
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
            this.m_Log.Write("YahooPOPBETA.js - getMessage - START");
            this.m_Log.Write("YahooPOPBETA.js - getMessage - msg num" + lID);
            
            if (this.m_oEmail) delete this.m_oEmail;
            this.m_oEmail = new emailBuilder(this.m_Log);
            
            delete this.m_aDownloadFiles;
            this.m_aDownloadFiles = new Array();
                        
            //get msg id
            var oMSGData = this.m_aMsgDataStore[lID-1];
            this.m_szMsgID = oMSGData.szID;
            this.m_szBox = oMSGData.szFolder;
            var szData = kMSGHeaders.replace(/MSGID/,oMSGData.szID).replace(/FOLDERNAME/,oMSGData.szFolder);
            this.m_Log.Write("YahooPOPBETA.js - getMessage - szData " + szData);

            var szURI = this.m_szLocationURI + "/ws/mail/v1/soap?appid=YahooMailRC&m=GetMessageRawHeader&wssid="+this.m_szWssid;
            this.m_Log.Write("YahooPOPBETA.js - getMessage - szURI " + szURI);

            this.m_HttpComms.setURI(szURI);
            this.m_HttpComms.setRequestMethod("POST");
            this.m_HttpComms.setContentType("application/xml");
            this.m_HttpComms.addData(szData);
            var bResult = this.m_HttpComms.send(this.emailOnloadHandler, this);
            if (!bResult) throw new Error("httpConnection returned false");
            this.m_iStage = 0;

            this.m_Log.Write("YahooPOPBETA.js - getMessage - END");
            return true;
        }
        catch(e)
        {
             this.m_Log.DebugDump("YahooPOPBETA.js: getMessage : Exception : "
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
            mainObject.m_Log.Write("YahooPOPBETA.js - emailOnloadHandler - START");
            var httpChannel = event.QueryInterface(Components.interfaces.nsIHttpChannel);

            //check status should be 200.
            mainObject.m_Log.Write("YahooPOPBETA.js - emailOnloadHandler - msg :" + httpChannel.responseStatus);
            if (httpChannel.responseStatus != 200)
                throw new Error("error status " + httpChannel.responseStatus);
                
            var szUri = httpChannel.URI.spec;
            mainObject.m_Log.Write("YahooPOPBETA.js - emailOnloadHandler - uri : " + szUri);

            switch(mainObject.m_iStage)
            {
                case 0: // headers
                    mainObject.m_Log.Write("YahooPOPBETA.js - emailOnloadHandler - headers");
                    if (szResponse.search(kPatternLstHeadersResponse)==-1)
                        throw new Error("Error Parsing Headers");
                       
                    var szHeader = szResponse.match(kPatternHeader)[1];
                    var oEscapeDecode = new HTMLescape();
                    szHeader= oEscapeDecode.decode(szHeader)  
                    delete oEscapeDecode;
                    
                    //remove quoted printable header
                    szHeader = szHeader.replace(/content-transfer-Encoding:.*?quoted-printable.*?$/img, "x-Header: removed");
                    szHeader = szHeader.replace(/content-transfer-Encoding:.*?base64.*?$/img,  "x-Header: removed");

                    var szHeaderTemp  = "X-WebMail: true\r\n";
                    szHeaderTemp += "X-Folder: " +mainObject.m_szBox+ "\r\n";
                    szHeaderTemp += szHeader;
                    
                    mainObject.m_oEmail.setEnvolpeHeaders(szHeaderTemp);
                                       
                    //now get body
                    var szData = kMSG.replace(/MSGID/,mainObject.m_szMsgID).replace(/FOLDERNAME/,mainObject.m_szBox);
                    mainObject.m_Log.Write("YahooPOPBETA.js - emailOnloadHandler - szData " + szData);
        
                    var szURI = mainObject.m_szLocationURI + "/ws/mail/v1/soap?&appid=YahooMailRC&m=GetMessage&wssid="+mainObject.m_szWssid;
                    mainObject.m_Log.Write("YahooPOPBETA.js - emailOnloadHandler - szURI " + szURI);
        
                    mainObject.m_HttpComms.setURI(szURI);
                    mainObject.m_HttpComms.setRequestMethod("POST");
                    mainObject.m_HttpComms.setContentType("application/xml");
                    mainObject.m_HttpComms.addData(szData);
                    var bResult = mainObject.m_HttpComms.send(mainObject.emailOnloadHandler, mainObject);
                    if (!bResult) throw new Error("httpConnection returned false");
                    mainObject.m_iStage++;
                break;

                case 1: // body
                    mainObject.m_Log.Write("YahooPOPBETA.js - emailOnloadHandler - body");
      				if (szResponse.search(kPatternLstBodyPartResponse)==-1)
                        throw new Error("Error Parsing Body");
                    
                    var aszShortParts = szResponse.match(kPatternShortPart);
                    mainObject.m_Log.Write("YahooPOPBETA.js - emailOnloadHandler - aszShortParts : " + aszShortParts);
                    var aszComplexParts = szResponse.match(kPatternLongPart);
                    mainObject.m_Log.Write("YahooPOPBETA.js - emailOnloadHandler - aszComplexParts : " + aszComplexParts);
                    if (aszComplexParts.length>0)
                    {
                        var aszCleanParts = new Array();
                        for (var i =0; i<aszComplexParts.length; i++)
                        {
                            aszCleanParts = aszCleanParts.concat(aszComplexParts[i].replace(kPatternShortPart,""));
                        }
                        
                        delete aszComplexParts;
                        aszComplexParts = aszCleanParts;
                        mainObject.m_Log.Write("YahooPOPBETA.js - emailOnloadHandler - szCleanedParts : " + aszComplexParts);                     
                    }
                    var aszParts = aszShortParts.concat(aszComplexParts);
                    delete aszShortParts;
                    delete aszComplexParts;
                    var bTextAttachments = false;
                                        
                    do{
                        var szData = aszParts.shift();
                        mainObject.m_Log.Write("YahooPOPBETA.js - emailOnloadHandler - aszParts[i] : " + szData);
                        var szPartID = szData.match(kPatternPartID)[1];
                        mainObject.m_Log.Write("YahooPOPBETA.js - emailOnloadHandler - szPartID : " + szPartID);
                        
                        var szType = szData.match(kPatternPartType)[1];
                        mainObject.m_Log.Write("YahooPOPBETA.js - emailOnloadHandler - szType : " + szType);
                        
                        var szSubType = szData.match(kPatternPartSubType)[1];
                        mainObject.m_Log.Write("YahooPOPBETA.js - emailOnloadHandler - szSubType : " + szSubType);
                        
                        var szFileName = "";
                        try
                        {
                            szFileName = szData.match(kPatternFileNameAlt)[1];
                            mainObject.m_Log.Write("YahooPOPBETA.js - emailOnloadHandler - szFileName : " + szFileName);
                        }
                        catch(e)
                        {
                            szFileName = "";
                        }
                        
                        if (szPartID.search(/text/i)!=-1 && szSubType.search(/mixed/i)!=-1)
                        {
                            mainObject.m_Log.Write("YahooPOPBETA.js - emailOnloadHandler - This email may have txt attach ");
                            bTextAttachments = true;  //may have text attachments
                        }
                        
                        if (szType.search(/x-unknown/i)!=-1)
                        {
                            mainObject.m_Log.Write("YahooPOPBETA.js - emailOnloadHandler - x-unknown : ");
                            var aszNumber = szPartID.match(/(\d)\..*?/);  //numerical part of id
                            if (aszNumber)
                            {
                                var iPartId = parseInt(aszNumber[1]);
                                mainObject.m_Log.Write("YahooPOPBETA.js - emailOnloadHandler - iPartId : " + iPartId);
                                var iLength = aszParts.length;
                                var i = 0;
                                do{  //remove find subpart
                                    var szTemp = aszParts.shift();
                                    var szTempPartID = szTemp.match(kPatternPartID)[1];
                                    mainObject.m_Log.Write("YahooPOPBETA.js - emailOnloadHandler - szTempPartID : " + szTempPartID);
                                    var aszTempNumber = szTempPartID.match(/(\d)\..*?/);
                                    if (aszTempNumber)
                                    {
                                        var iTempPartId = parseInt(aszTempNumber[1]);
                                        mainObject.m_Log.Write("YahooPOPBETA.js - emailOnloadHandler - iTempPartId : " + iTempPartId);
                                        if (iTempPartId == iPartId) //remove part
                                        {                                        
                                            mainObject.m_Log.Write("YahooPOPBETA.js - emailOnloadHandler - removing part : ");
                                            delete szTemp;                                            
                                        }
                                        else
                                        {
                                            mainObject.m_Log.Write("YahooPOPBETA.js - emailOnloadHandler - keeping part : ");
                                            aszParts.push(szTemp);
                                        }
                                    }
                                    else
                                    {
                                        mainObject.m_Log.Write("YahooPOPBETA.js - emailOnloadHandler - keeping part : ");
                                        aszParts.push(szTemp);  
                                    }
                                    i++
                                }while(iLength!=i);
                            }                            
                        }
                        else if(szType.search(/text/i)!=-1)     // text/html part
                        {  
                            mainObject.m_Log.Write("YahooPOPBETA.js - emailOnloadHandler -  Text part");
                            //proces headers
                            var szHeader = null;

                            var szSubType = "plain";
                            if (szData.search(kPatternPartSubType)!=-1)
                            {
                                szSubType = szData.match(kPatternPartSubType)[1];
                                mainObject.m_Log.Write("YahooPOPBETA.js - emailOnloadHandler - szSubType : " + szSubType);
                            }
                            var bFile = false;
                            
                            if (szData.search(kPatternPartTypeParams)!=-1)
                            {
                                var szTypeParams = szData.match(kPatternPartTypeParams)[1];
                                mainObject.m_Log.Write("YahooPOPBETA.js - emailOnloadHandler - szTypeParams : " + szTypeParams);

                                szHeader = "Content-Type: "+szType+"/"+szSubType+"; " +szTypeParams + "\r\n";
                                szHeader += "Content-Transfer-Encoding: 7bit\r\n";
                                
                                var iPartID = parseFloat(szPartID);
                                mainObject.m_Log.Write("YahooPOPBETA.js - emailOnloadHandler - iPartID : " + iPartID);
                                if (szData.search(kPatternFileNameAlt)!=-1 && 
                                    szData.search(kPatternDispositionInline)!=-1 && 
                                    szPartID >= 2 &&
                                    bTextAttachments == true)
                                {
                                    var szFilename = szData.match(kPatternFileNameAlt)[1];
                                    if (szFilename.length>0)
                                    {
                                        szHeader += "Content-Disposition: attachment; fileName=\"" +szFileName + "\"\r\n\r\n";
                                        bFile= true;
                                    }
                                }
                                szHeader += "\r\n\r\n";

                                mainObject.m_Log.Write("YahooPOPBETA.js - emailOnloadHandler - szHeader : " + szHeader);
                            }

                            //get text
                            var szText = szData.match(kPatternPartText)[1];
                            if (szText!=null) 
                            {
                                mainObject.m_Log.Write("YahooPOPBETA.js - emailOnloadHandler -body found ");
                                var oEscapeDecode = new HTMLescape();
                                szText = oEscapeDecode.decode(szText)
                                delete oEscapeDecode;
                                
                                var szCharset = null;
                                if (szTypeParams.search(/charset/i) != -1) 
                                {
                                    szCharset = szTypeParams.match(/charset=(.*?)[;|\s]*$/i)[1];
                                    szText = mainObject.convertFromUTF8(szText, szCharset);
                                }
                                mainObject.m_Log.Write("YahooPOPBETA.js - emailOnloadHandler - szText : " + szText);
                                
                                if (!bFile) //text body part
                                    mainObject.m_oEmail.addBody(szHeader, szText);
                                else 
                                    mainObject.m_oEmail.addAttachment(szHeader, szText);
                            }
                        }
                        else                           //attachment
                        {
                            if (szType.search(/multipart/i)==-1) 
                            {
                                mainObject.m_Log.Write("YahooPOPBETA.js - emailOnloadHandler -  need to download file attachment");
                                mainObject.m_aDownloadFiles.push(szData);
                            }                        
                        }
                    }while(aszParts.length!=0);

                    if (mainObject.m_aDownloadFiles.length==0) //no files 
                    {
                        if (mainObject.m_bMarkAsRead)
                            mainObject.markAsRead();
                        else
                            mainObject.m_oEmail.buildAsync(mainObject.emailBuiltCallback, mainObject);  
                    }
                    else
                    {   //download first file
                        var szURI = mainObject.m_szLocationURI + "/ya/download?";
                        szURI += "fid=" + encodeURIComponent(mainObject.m_szBox);
                        szURI += "&mid=" + encodeURIComponent(mainObject.m_szMsgID);
                        szURI += "&pid=" +mainObject.m_aDownloadFiles[0].match(kPatternPartId)[1];

                        mainObject.m_Log.Write("YahooPOPBETA.js - emailOnloadHandler - szURI " +szURI);
                        mainObject.m_HttpComms.setURI(szURI);
                        mainObject.m_HttpComms.setRequestMethod("GET");
                        var bResult = mainObject.m_HttpComms.send(mainObject.emailOnloadHandler, mainObject);
                        if (!bResult) throw new Error("httpConnection returned false");
                        mainObject.m_iStage = 3;
                    }
                break;


                case 2:// MSG marked as seen
                    mainObject.m_Log.Write("YahooPOPBETA.js - emailOnloadHandler - SEEN");
                    mainObject.m_oEmail.buildAsync(mainObject.emailBuiltCallback, mainObject);                   
                break;
                  
                         
                case 3:  //handle attachments
                    mainObject.m_Log.Write("YahooPOPBETA.js - emailOnloadHandler - Attachments");

                    var szPart = mainObject.m_aDownloadFiles.shift();
                    mainObject.m_Log.Write("YahooPOPBETA.js - emailOnloadHandler - szPart : " + szPart);

                    //headers
                    var szType = "application/octet-stream";
                    if (szPart.search(kPatternPartType)!=-1 && szPart.search(kPatternPartSubType)!=-1)
                        szType = szPart.match(kPatternPartType)[1] +"/" + szPart.match(kPatternPartSubType)[1];
                    mainObject.m_Log.Write("YahooPOPBETA.js - emailOnloadHandler - szType : " + szType);
                    var szHeader = "Content-Type: "+szType+"; ";
                    
                    var szName = null;
                    if (szPart.search(kPatternPartTypeParams)!=-1)
                        szName = szPart.match(kPatternPartTypeParams)[1];
                    mainObject.m_Log.Write("YahooPOPBETA.js - emailOnloadHandler - szName : " + szName);    
                    szHeader +=  szName?szName:"";
                    szHeader +=  "\r\n";
                    
                    if (szType.search(/rfc822/i)!=-1 || szType.search(/message/i)!=-1 || szType.search(/text/i)!=-1)
                        szHeader += "Content-Transfer-Encoding: 7bit\r\n";
                    else    
                        szHeader += "Content-Transfer-Encoding: base64\r\n";
                          
                    var szContentID = null;
                    if (szPart.search(kPatternContentId)!=-1)
                    {
                        szContentID = szPart.match(kPatternContentId)[1];
                        if (szContentID.length > 0) 
                        {
                            var oEscapeDecode = new HTMLescape();
                            szContentID = oEscapeDecode.decode(szContentID)
                            delete oEscapeDecode;
                            szHeader += "Content-ID: " + szContentID + "\r\n";
                        }
                    }
                    mainObject.m_Log.Write("YahooPOPBETA.js - emailOnloadHandler - szContentID : " + szContentID);
                    
                            
                    var szFileName = null;
                    var szDispParam = szPart.match(kPatternPartDispParam)[1];
                    mainObject.m_Log.Write("YahooPOPBETA.js - emailOnloadHandler - szDispParam : " + szDispParam);                  
                    if (szDispParam.search(kPatternFileName) != -1) 
                        szFileName = szDispParam.match(kPatternFileName)[1];
                    else 
                        szFileName = szPart.match(kPatternFileNameAlt)[1];
                    mainObject.m_Log.Write("YahooPOPBETA.js - emailOnloadHandler - szFileName : " + szFileName);              
                    
                    var szFileType = "attachment";
                    if (szPart.search(/disposition="inline"/i)!=-1) szFileType = "inline";
                    szHeader += "Content-Disposition: " + szFileType +"; fileName=\"" +szFileName + "\"\r\n\r\n";
                    
                    mainObject.m_Log.Write("YahooPOPBETA.js - emailOnloadHandler - szHeader : " + szHeader);
                          
                    mainObject.m_oEmail.addAttachment(szHeader, szResponse);
                   
                    if (mainObject.m_aDownloadFiles.length!=0) //all files downloaded process them
                    {
                        mainObject.m_Log.Write("YahooPOPBETA.js - emailOnloadHandler - download next file ");
                          
                        var szURI = mainObject.m_szLocationURI + "/ya/download?";
                        szURI += "fid=" + encodeURIComponent(mainObject.m_szBox);
                        szURI += "&mid=" + encodeURIComponent(mainObject.m_szMsgID);
                        szURI += "&pid=" +mainObject.m_aDownloadFiles[0].match(kPatternPartId)[1];
                        mainObject.m_Log.Write("YahooPOPBETA.js - emailOnloadHandler - szURI " +szURI);
        
                        mainObject.m_HttpComms.setURI(szURI);
                        mainObject.m_HttpComms.setRequestMethod("GET");
                        var bResult = mainObject.m_HttpComms.send(mainObject.emailOnloadHandler, mainObject);
                        if (!bResult) throw new Error("httpConnection returned false");
                        mainObject.m_iStage = 3;   
                    }   
                    else   //download next file in list
                    {  
                        mainObject.m_Log.Write("YahooPOPBETA.js - emailOnloadHandler - all files downloaded ");
                                               
                        if (mainObject.m_bMarkAsRead) //mark as read
                        { 
                            mainObject.markAsRead();                           
                        }
                        else                         //pass email to TB
                        {                 
                            mainObject.m_oEmail.buildAsync(mainObject.emailBuiltCallback, mainObject);
                        }                    
                    }
                break;
            }

            mainObject.m_Log.Write("YahooPOPBETA.js - emailOnloadHandler - END");
        }
        catch(err)
        {
            mainObject.m_Log.DebugDump("YahooPOPBETA.js: emailOnloadHandler : Exception : "
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
            this.m_Log.Write("YahooPOPBETA.js -markAsRead - START"); 
             
            this.m_Log.Write("YahooPOPBETA.js - emailOnloadHandler - marking as read"); 
            var szURI = this.m_szLocationURI + 
                        "/ws/mail/v1/soap?&appid=YahooMailRC&m=FlagMessages&wssid=" 
                        + this.m_szWssid;
            this.m_Log.Write("YahooPOPBETA.js - emailOnloadHandler - szURI " +szURI);

            this.m_HttpComms.setURI(szURI);
            this.m_HttpComms.setRequestMethod("POST");
            this.m_HttpComms.setContentType("application/xml");
            var szData = kSeen.replace(/MSGID/,this.m_szMsgID).replace(/FOLDERNAME/,this.m_szBox);
            this.m_Log.Write("YahooPOPBETA.js - emailOnloadHandler - szData " +szData);
            this.m_HttpComms.addData(szData);
            var bResult = this.m_HttpComms.send(this.emailOnloadHandler, this);
            if (!bResult) throw new Error("httpConnection returned false");
            this.m_iStage = 2;      
            
            this.m_Log.Write("YahooPOPBETA.js -markAsRead - END"); 
            return true;
        }
        catch(e)
        {
            this.m_Log.DebugDump("YahooPOPBETA.js: markAsRead : Exception : "
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
            mainObject.m_Log.Write("YahooPOPBETA.js: emailBuilt : START ");
            var szEmail = mainObject.m_oEmail.getEmail();                  
            var szPOPResponse = "+OK " + szEmail.length + "\r\n";
            szPOPResponse += szEmail;
            mainObject.serverComms(szPOPResponse);
            delete mainObject.m_oEmail;
            mainObject.m_oEmail = null; 
            mainObject.m_Log.Write("YahooPOPBETA.js: emailBuilt : END ");
            return true;
       } 
       catch(err)
       {
            mainObject.m_Log.DebugDump("YahooPOPBETA.js: emailBuilt : Exception : "
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
            this.m_Log.Write("YahooPOPBETA.js - deleteMessage - START");
            this.m_Log.Write("YahooPOPBETA.js - deleteMessage - id " + lID );

            //create URL
            var oMSGData = this.m_aMsgDataStore[lID-1];

            var szURI = this.m_szLocationURI + "/ws/mail/v1/soap?&appid=YahooMailRC&";
            szURI += "m=MoveMessages&src="+oMSGData.szFolder+"&dst=Trash&count=1&wssid="+this.m_szWssid;
            this.m_Log.Write("YahooPOPBETA.js - deleteMessage - szURI " +szURI);
            this.m_HttpComms.setURI(szURI);
            this.m_HttpComms.setRequestMethod("POST");
            this.m_HttpComms.setContentType("application/xml");
            var szData = kDelete.replace(/MSGID/,oMSGData.szID).replace(/FOLDERNAME/,oMSGData.szFolder);
            this.m_Log.Write("YahooPOPBETA.js - deleteMessage - szData " +szData);
            this.m_HttpComms.addData(szData);
            var bResult = this.m_HttpComms.send(this.deleteMessageOnloadHandler, this);
            if (!bResult) throw new Error("httpConnection returned false");

            this.m_Log.Write("YahooPOPBETA.js - deleteMessage - END");
            return true;
        }
        catch(e)
        {
            this.m_Log.DebugDump("YahooPOPBETA.js: deleteMessage : Exception : "
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
            mainObject.m_Log.Write("YahooPOPBETA.js - deleteMessageOnload - START");
            var httpChannel = event.QueryInterface(Components.interfaces.nsIHttpChannel);

            //check status should be 200.
            mainObject.m_Log.Write("YahooPOPBETA.js - deleteMessageOnload :" + httpChannel.responseStatus);
            if (httpChannel.responseStatus != 200 )
                throw new Error("error status " + httpChannel.responseStatus);

            if (szResponse.search(kPatternDeleteMSGResponse)==-1) throw new Error ("Delete Failed");

            mainObject.serverComms("+OK its history\r\n");
            mainObject.m_Log.Write("YahooPOPBETA.js - deleteMessageOnload - END");
        }
        catch(e)
        {
            mainObject.m_Log.DebugDump("YahooPOPBETA.js: deleteMessageOnload : Exception : "
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
            this.m_Log.Write("YahooPOPBETA.js - logOUT - START");

            if (this.m_bReUseSession)
            {
                this.m_Log.Write("YahooPOPBETA.js - logOut - Setting Session Data");
                this.m_ComponentManager.addElement(this.m_szUserName, "szHomeURI", this.m_szHomeURI);
            }
            else
            {
                this.m_Log.Write("YahooPOPBETA.js - logOUT - removing Session Data");
                this.m_ComponentManager.deleteAllElements(this.m_szUserName);

                var oCookies = Components.classes["@mozilla.org/nsWebMailCookieManager2;1"]
                                         .getService(Components.interfaces.nsIWebMailCookieManager2);
                oCookies.removeCookie(this.m_szUserName);
            }


            this.m_bAuthorised = false;
            this.serverComms("+OK Your Out\r\n");
            this.m_Timer.cancel();
            delete this.m_aMsgDataStore;
            delete this.m_aszFolderList;
            delete this.m_aRawData

            this.m_Log.Write("YahooPOPBETA.js - logOUT - END");
            return true;
        }
        catch(e)
        {
            this.m_Log.DebugDump("YahooPOPBETA.js: logOUT : Exception : "
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
            this.m_Log.Write("YahooPOPBETA.js - serverComms msg " + szMsg);
            var iCount = this.m_oResponseStream.write(szMsg,szMsg.length);
            this.m_Log.Write("YahooPOPBETA.js - serverComms sent count: " + iCount +" msg length: " +szMsg.length);
        }
        catch(e)
        {
            this.m_Log.DebugDump("YahooPOPBETA.js: serverComms : Exception : "
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
            this.m_Log.Write("YahooPOPBETA.js - writeImageFile - End");

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
            this.m_Log.DebugDump("YahooPOPBETA.js: writeImageFile : Exception : "
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
            this.m_Log.Write("YahooPOPBETA : openWindow - START");

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
            this.m_Log.Write("YahooPOPBETA : openWindow - " + iResult);
            var szResult =  null;
            if (iResult)
            {
                szResult = params.GetString(0);
                this.m_Log.Write("YahooPOPBETA : openWindow - " + szResult);
            }

            this.m_Log.Write("YahooPOPBETA : openWindow - END");
            return szResult;
        }
        catch(err)
        {
            this.m_Log.DebugDump("YahooPOPBETA: Exception in openWindow : "
                                               + err.name
                                               + ".\nError message: "
                                               + err.message + "\n"
                                               + err.lineNumber);
        }
    },



    convertFromUTF8 : function (szRawMSG, szCharset)
    {
        this.m_Log.Write("YahooPOPBETA - convertFromUTF8 START " +szCharset );

        var aszCharset = new Array( "ISO-2022-CN" , "ISO-2022-JP"  , "ISO-2022-KR" , "ISO-8859-1"  , "ISO-8859-10",
                                    "ISO-8859-11" , "ISO-8859-12"  , "ISO-8859-13" , "ISO-8859-14" , "ISO-8859-15",
                                    "ISO-8859-16" , "ISO-8859-2"   , "ISO-8859-3"  , "ISO-8859-4"  , "ISO-8859-5" ,
                                    "ISO-8859-6"  , "ISO-8859-6-E" , "ISO-8859-6-I", "ISO-8859-7"  , "ISO-8859-8" ,
                                    "ISO-8859-8-E", "ISO-8859-8-I" , "ISO-8859-9"  , "ISO-IR-111"  ,
                                    "UTF-8"       , "UTF-16"       , "UTF-16BE"    , "UTF-16LE"    , "UTF-32BE"   ,
                                    "UTF-32LE"    , "UTF-7"        ,
                                    "IBM850"      , "IBM852"       , "IBM855"      , "IBM857"      , "IBM862"     ,
                                    "IBM864"      , "IBM864I"      , "IBM866"      ,
                                    "WINDOWS-1250", "WINDOWS-1251" , "WINDOWS-1252", "WINDOWS-1253", "WINDOWS-1254",
                                    "WINDOWS-1255", "WINDOWS-1256" , "WINDOWS-1257", "WINDOWS-1258", "WINDOWS-874" ,
                                    "WINDOWS-936" ,
                                    "BIG5"        , "BIG5-HKSCS"   , "EUC-JP"      , "EUC-KR"      , "GB2312"     ,
                                    "X-GBK"       , "GB18030"      , "HZ-GB-2312"  , "ARMSCII-8"   , "GEOSTD8"    ,
                                    "KOI8-R"      , "KOI8-U"       , "SHIFT_JIS"   , "T.61-8BIT"   , "TIS-620"    ,
                                    "US-ASCII"    , "VIQR"         , "VISCII"      ,
                                    "X-EUC-TW"       , "X-JOHAB"                , "X-MAC-ARABIC"          , "X-MAC-CE"       ,
                                    "X-MAC-CROATIAN" , "X-MAC-GREEK"            , "X-MAC-HEBREW"          , "X-MAC-ROMAN"    ,
                                    "X-MAC-TURKISH"  , "X-MAC-ICELANDIC"        , "X-U-ESCAPED"           , "X-MAC-CYRILLIC" ,
                                    "X-MAC-UKRAINIAN", "X-MAC-ROMANIAN"         , "X-OBSOLETED-EUC-JP"    , "X-USER-DEFINED" ,
                                    "X-VIET-VNI"     , "X-VIET-VPS"             , "X-IMAP4-MODIFIED-UTF7" , "X-VIET-TCVN5712",
                                    "X-WINDOWS-949"  , "X-OBSOLETED-ISO-2022-JP", "X-OBSOLETED-SHIFT_JIS"
                                  );

        var szUseCharSet = "US-ASCII";
        var i = 0;
        var bFound = false;
        do{
            if (aszCharset[i] == szCharset.toUpperCase())
            {
                bFound = true;
                szUseCharSet =  szCharset.toUpperCase();
            }
            i++;
        }while (i<aszCharset.length && !bFound)
        this.m_Log.Write("YahooPOPBETA - convertFromUTF8 use charset " + szUseCharSet);

        var Converter = Components.classes["@mozilla.org/intl/scriptableunicodeconverter"]
                                  .getService(Components.interfaces.nsIScriptableUnicodeConverter);
        Converter.charset = "UTF-8";
        var unicode =  Converter.ConvertToUnicode(szRawMSG);
        Converter.charset =  szUseCharSet;
        var szDecoded = Converter.ConvertFromUnicode(unicode)+ Converter.Finish();

        this.m_Log.Write("YahooPOPBETA - convertFromUTF8 END");
        return szDecoded;
    }
}