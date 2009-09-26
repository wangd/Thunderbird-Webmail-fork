function HotmailScreenRipperBETA(oResponseStream, oLog, oPrefData)
{
    try
    {
        var scriptLoader = Components.classes["@mozilla.org/moz/jssubscript-loader;1"];
        scriptLoader = scriptLoader.getService(Components.interfaces.mozIJSSubScriptLoader);
        scriptLoader.loadSubScript("chrome://web-mail/content/common/DebugLog.js");
        scriptLoader.loadSubScript("chrome://web-mail/content/common/HttpComms3.js");
        scriptLoader.loadSubScript("chrome://hotmail/content/Hotmail-MSG.js");
        scriptLoader.loadSubScript("chrome://hotmail/content/Hotmail-Prefs-Data.js");
        scriptLoader.loadSubScript("chrome://hotmail/content/Hotmail-FolderList.js");
        scriptLoader.loadSubScript("chrome://hotmail/content/HTML-escape.js");

        this.m_Log = oLog;
        this.m_Log.Write("Hotmail-SR-BETA - Constructor - START");
                
        this.m_szUserName = null;
        this.m_szPassWord = null;
        this.m_oResponseStream = oResponseStream;
        this.m_HttpComms = new HttpComms(this.m_Log);
        this.m_HttpComms.setUserAgentOverride(true);
        this.m_MSGEscape = null;
        
        this.m_szLocationURI = null;
        this.m_szFolderURL = null;
        this.m_aMsgDataStore = new Array();
        this.m_szHomeURI = null;
        this.m_iTotalSize = 0;
        this.m_iStage = 0;
        this.m_szMsgID = null;
        this.m_szMsgURL = null;
        this.m_szAuthUser = null;
        this.m_szSessionID = null;
        this.m_szMad = null;
        this.m_szNonce = null; 
        this.m_iPageCount = 1;
        this.m_szMSGPerPage = 25;
        this.m_szRtl = false;  

        this.m_szMSG = null;
        this.m_bStat = false;
        this.m_bReEntry = true;
        this.m_iLoginBounce = 4;
        this.m_szMT = null;
        this.m_iDownloadRetry = 3;
        this.m_szLocale = null;

        this.m_ComponentManager = Components.classes["@mozilla.org/ComponentData2;1"]
                                            .getService(Components.interfaces.nsIComponentData2);

        this.m_iTime = oPrefData.iProcessDelay;            //timer delay
        this.m_iProcessAmount  =  oPrefData.iProcessAmount; //delay proccess amount
        this.m_bReUseSession   = oPrefData.bReUseSession;    //do i reuse the session
        this.m_bUseJunkMail    = oPrefData.bUseJunkMail;       //do i download junkmail
        this.m_bDownloadUnread = oPrefData.bDownloadUnread;     //do i download unread only
        this.m_bMarkAsRead     = oPrefData.bMarkAsRead;         //do i mark email as read
        this.m_bDownloadInbox  = oPrefData.bDownloadInbox;         //do i download inbox
        this.m_iHandleCount = 0;
        this.m_Timer = Components.classes["@mozilla.org/timer;1"]
                                 .createInstance(Components.interfaces.nsITimer);

        //process folders
        this.m_szFolderName = null;

        this.m_aszFolders = new Array();
        for(var i=0; i<oPrefData.aszFolder.length; i++)
        {
            this.m_aszFolders.push(oPrefData.aszFolder[i]);
        }
        this.m_Log.Write("Hotmail-SR-BETA.js - Constructor - m_aszFolders "+ this.m_aszFolders);
        this.m_aszFolderURLList = new Array();
        this.m_Log.Write("Hotmail-SR-BETA.js - Constructor - END");
    }
    catch(e)
    {
        DebugDump("Hotmail-SR-BETA: Constructor : Exception : "
                                      + e.name
                                      + ".\nError message: "
                                      + e.message + "\n"
                                      + e.lineNumber);
    }
}



HotmailScreenRipperBETA.prototype =
{
    logIn : function(szUserName, szPassWord)
    {
        try
        {
            this.m_Log.Write("Hotmail-SR-BETA - logIN - START");
            this.m_Log.Write("Hotmail-SR-BETA - logIN - Username: " + szUserName
                                                   + " Password: " + szPassWord
                                                   + " stream: " + this.m_oResponseStream);

            this.m_szUserName = szUserName.toLowerCase();
            this.m_szPassWord = szPassWord.substr(0,16);

            if (!this.m_szUserName || !this.m_oResponseStream || !this.m_szPassWord) return false;

            this.m_HttpComms.setUserName(this.m_szUserName);
            //get hotmail.com webpage
            this.m_iStage= 0;
            this.m_HttpComms.setURI("http://mail.live.com");

            //get session data
            if (this.m_bReUseSession)
            {
                this.m_Log.Write("Hotmail-SR-BETA - logIN - Getting Session Data");
                this.m_szHomeURI = this.m_ComponentManager.findElement(this.m_szUserName, "szHomeURI");
                this.m_Log.Write("Hotmail-SR - logIN - szHomeURI " +this.m_szHomeURI);

                if (this.m_szHomeURI)
                {
                    this.m_Log.Write("Hotmail-SR-BETA - logIN - Session Data Found");
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


            this.m_Log.Write("Hotmail-SR-BETA - logIN - END");
            return true;
        }
        catch(e)
        {
            this.m_Log.DebugDump("Hotmail-SR-BETA: logIN : Exception : "
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
            mainObject.m_Log.Write("Hotmail-SR-BETA - loginOnloadHandler - START");
            mainObject.m_Log.Write("Hotmail-SR-BETA - loginOnloadHandler : " + mainObject.m_iStage);

            var httpChannel = event.QueryInterface(Components.interfaces.nsIHttpChannel);
            mainObject.m_Log.Write("Hotmail-SR-BETA - loginOnloadHandler - status :" +httpChannel.responseStatus );

            //if this fails we've gone somewhere new
            if (httpChannel.responseStatus != 200 )
                throw new Error("return status " + httpChannel.responseStatus);

            //check for java refresh
            var aRefresh = szResponse.match(patternHotmailJSRefresh); 
            if (!aRefresh) aRefresh = szResponse.match(patternHotmailJSRefreshAlt);
            if (!aRefresh) aRefresh = szResponse.match(patternHotmailRefresh2);
            if (!aRefresh && mainObject.m_iStage>0) aRefresh = szResponse.match(patternHotmailJSRefreshAlt3);  
            mainObject.m_Log.Write("Hotmail-SR-BETA-SMTP - loginOnloadHandler aRefresh "+ aRefresh);
            if (aRefresh)
            {
                mainObject.m_Log.Write("Hotmail-SR-BETA - loginOnloadHandler - refresh ");
                
                if (mainObject.m_iLoginBounce == 0) throw new Error ("No many bounces") 
                mainObject.m_iLoginBounce--;
                
                var szURL = mainObject.urlDecode(aRefresh[1]);
                if (!mainObject.m_HttpComms.setURI(szURL))
                    mainObject.m_HttpComms.setURI(httpChannel.URI.prePath + szDirectory + aRefresh[1]);

                mainObject.m_HttpComms.setRequestMethod("GET");

                var bResult = mainObject.m_HttpComms.send(mainObject.loginOnloadHandler, mainObject);
                if (!bResult) throw new Error("httpConnection returned false");
                return;
            }
            
            
            var aForm = szResponse.match(patternHotmailLoginForm);
            mainObject.m_Log.Write("Hotmail-SR-BETA-POP - loginOnloadHandler aForm "+ aForm);
            if (aForm)
            {
                var szURL = aForm[0].match(patternHotmailAction);
                mainObject.m_HttpComms.setURI(szURL[1]);
                mainObject.m_HttpComms.setRequestMethod("POST");
                var szInput = aForm[0].match(patternHotmailInput);
                var szName = szInput[0].match(patternHotmailName)[1];
                var szValue = szInput[0].match(patternHotmailValue)[1];
                mainObject.m_HttpComms.addValuePair(szName, szValue);

                var bResult = mainObject.m_HttpComms.send(mainObject.loginOnloadHandler, mainObject);
                if (!bResult) throw new Error("httpConnection returned false");
                return;
            }
            
            //page code
            switch (mainObject.m_iStage)
            {
                case 0: //login
                    var szURL = szResponse.match(patternHotmailLoginURL)[1];            
                    mainObject.m_Log.Write("Hotmail-SR-BETA loginOnloadHandler - szURL :" +szURL);
                    if (!szURL) throw new Error("error parsing login page");

                    //get form data
                    mainObject.m_HttpComms.addValuePair("idsbho","1");
                    
                    var szPasswordPadding = "IfYouAreReadingThisYouHaveTooMuchFreeTime";
                    var lPad=szPasswordPadding.length-mainObject.m_szPassWord.length;
                    szData = szPasswordPadding.substr(0,(lPad<0)?0:lPad);
                    mainObject.m_HttpComms.addValuePair("PwdPad",szData);
                    
                    mainObject.m_HttpComms.addValuePair("LoginOptions","3");
                    mainObject.m_HttpComms.addValuePair("CS","");
                    mainObject.m_HttpComms.addValuePair("FedState","");
                    
                    var szBlob = szResponse.match(patternHotmailSRBlob)[1];   
                    mainObject.m_Log.Write("Hotmail-SR - loginOnloadHandler - szBlob :" +szBlob);
                    mainObject.m_HttpComms.addValuePair("PPSX",szBlob);
                   
                    mainObject.m_HttpComms.addValuePair("login",mainObject.urlEncode(mainObject.m_szUserName));
                    mainObject.m_HttpComms.addValuePair("passwd",mainObject.urlEncode(mainObject.m_szPassWord));       
                    mainObject.m_HttpComms.addValuePair("remMe","1");
                    mainObject.m_HttpComms.addValuePair("NewUser","1");
                    mainObject.m_HttpComms.addValuePair("i1","0");
                    mainObject.m_HttpComms.addValuePair("i2","0");
                    mainObject.m_HttpComms.addValuePair("type","11");
                    
                    var szSFT = mainObject.urlEncode(szResponse.match(patternHotmailSFT)[1]);   
                    mainObject.m_Log.Write("Hotmail-SR - loginOnloadHandler - szSFT :" +szSFT);
                    mainObject.m_HttpComms.addValuePair("PPFT",szSFT);

                    mainObject.m_HttpComms.setURI(szURL);
                    mainObject.m_HttpComms.setRequestMethod("POST");
                    var bResult = mainObject.m_HttpComms.send(mainObject.loginOnloadHandler, mainObject);
                    if (!bResult) throw new Error("httpConnection returned false");
                    mainObject.m_iStage++;
                break;

                case 1:
                    //get urls for later use
                    var IOService = Components.classes["@mozilla.org/network/io-service;1"];
                    IOService = IOService.getService(Components.interfaces.nsIIOService);
                    var nsIURI = IOService.newURI(httpChannel.URI.spec, null, null);
                    var szDirectory = nsIURI.QueryInterface(Components.interfaces.nsIURL).directory;
                    this.m_Log.Write("Hotmail-SR-BETA - loginOnloadHandler - directory : " +szDirectory);

                    var oCookies = Components.classes["@mozilla.org/nsWebMailCookieManager2;1"]
                                             .getService(Components.interfaces.nsIWebMailCookieManager2);
                                             
                    //check for logout option
                    if (szResponse.search(patternHotmailLogOut)==-1)
                    {
                        mainObject.m_Log.Write("Hotmail-SR-BETA - loginOnloadHandler - logout not found : ");
                        //check for complex hotmail site
                        if (szResponse.search(patternHotmailFrame)!=-1)
                        {
                            mainObject.m_Log.Write("Hotmail-SR-BETA - loginOnloadHandler - frame found");
                            mainObject.m_iStage = 1;
                            var szURL = szResponse.match(patternHotmailLight)[1];
                            var oEscape = new HTMLescape(mainObject.m_Log);
                            szURL = oEscape.decode(szURL);
                            delete oEscape
                            mainObject.m_Log.Write("Hotmail-SR-BETA - loginOnloadHandler - szLight " + szURL);
                            mainObject.m_HttpComms.setURI(szURL);
                            mainObject.m_HttpComms.setRequestMethod("GET");
                            var bResult = mainObject.m_HttpComms.send(mainObject.loginOnloadHandler, mainObject);
                            if (!bResult) throw new Error("httpConnection returned false");
                            return;
                        }
                        else if (mainObject.m_bReEntry)//something has gone wrong retry
                        {
                            mainObject.m_ComponentManager.deleteAllElements(mainObject.m_szUserName);
                            oCookies.removeCookie(mainObject.m_szUserName);

                            mainObject.m_bReEntry = false;
                            mainObject.m_iStage =0;
                            mainObject.m_HttpComms.setURI("http://mail.live.com");
                            mainObject.m_HttpComms.setRequestMethod("GET");
                            var bResult = mainObject.m_HttpComms.send(mainObject.loginOnloadHandler, mainObject);
                            if (!bResult) throw new Error("httpConnection returned false");
                            return;
                        }
                        else
                            throw new Error("error logging in");
                    }

                    mainObject.m_szLocationURI = httpChannel.URI.prePath + szDirectory;
                    mainObject.m_Log.Write("Hotmail-SR-BETA - loginOnloadHandler - m_szLocationURI : "+mainObject.m_szLocationURI );
                    mainObject.m_szHomeURI = httpChannel.URI.spec;
                    mainObject.m_Log.Write("Hotmail-SR-BETA - loginOnloadHandler - m_szHomeURI : "+mainObject.m_szHomeURI );

                    //get cookies
                    var szCookie = oCookies.findCookie(mainObject.m_szUserName, httpChannel.URI);
                    mainObject.m_Log.Write("Hotmail-SR-BETA - loginOnloadHandler cookies "+ szCookie);
                    mainObject.m_szMT = szCookie.match(patternHotmailMT)[1];
                    mainObject.m_Log.Write("Hotmail-SR-BETA - loginOnloadHandler mainObject.m_szMT "+ mainObject.m_szMT);

                    //get folder manager
                    var szURI = mainObject.m_szLocationURI + szResponse.match(patternHotmailFolderManager)[1];
                    mainObject.m_Log.Write("Hotmail-SR-BETA - loginOnloadHandler - folders : "+szURI);
                    mainObject.m_iStage++;
                    mainObject.m_HttpComms.setURI(szURI);
                    mainObject.m_HttpComms.setRequestMethod("GET");
                    var bResult = mainObject.m_HttpComms.send(mainObject.loginOnloadHandler, mainObject);
                    if (!bResult) throw new Error("httpConnection returned false");
                break;


                case 2: //other folders
                    mainObject.m_Log.Write("Hotmail-SR-BETA - loginOnloadHandler - processing folders");

                    //inbox - 000000000001
                    if (mainObject.m_bDownloadInbox) 
                    {
                         var oFolder = new FolderData();
                         oFolder.szURI = mainObject.m_szLocationURI + szResponse.match(patternHotmailInboxFolderID)[1];
                         mainObject.m_Log.Write("Hotmail-SR-BETA - loginOnloadHandler - inbox : " + oFolder.szURI);
                         oFolder.szFolderName = "INBOX";
                         mainObject.m_aszFolderURLList.push(oFolder);
                    }
                     
                    //junk mail - 000000000005
                    if (mainObject.m_bUseJunkMail)
                    {
                        oFolder = new FolderData();
                        oFolder.szURI =  mainObject.m_szLocationURI + szResponse.match(patternHotmailJunkFolderID)[1];
                        oFolder.szFolderName = "Junk Mail";
                        mainObject.m_Log.Write("Hotmail-SR-BETA - loginOnloadHandler - Junk Mail: " + oFolder.szURI);
                        mainObject.m_aszFolderURLList.push(oFolder);
                    }

                    var aszFolderList = szResponse.match(patternHotmailFolderList);
                    mainObject.m_Log.Write("Hotmail-SR-BETA - loginOnloadHandler - szFolderList : "+aszFolderList);
                    if (aszFolderList)
                    {
                        for (var i=0 ; i<mainObject.m_aszFolders.length; i++ )
                        {
                            var regExp = new RegExp("^"+mainObject.m_aszFolders[i]+"$","i");
                            mainObject.m_Log.Write("Hotmail-SR-BETA - loginOnloadHandler - regExp : "+regExp );
                            
                            var oEscape = new HTMLescape(mainObject.m_Log);
                            for (var j=0; j<aszFolderList.length; j++)
                            {
                                var szTitle = aszFolderList[j].match(patternHotmailFolderTitle)[1];
                                var szDeCodeTitle = oEscape.decode(szTitle);
                                mainObject.m_Log.Write("Hotmail-SR-BETA - loginOnloadHandler - folder szTitle: " +szDeCodeTitle);

                                if (szDeCodeTitle.search(regExp)!=-1)
                                {
                                    var szID = aszFolderList[j].match(patternHotmailFolderURL)[1];
                                    mainObject.m_Log.Write("Hotmail-SR-BETA - loginOnloadHandler - folder szID: " +szID);
                                    var szURI = mainObject.m_szLocationURI + szID;
                                    mainObject.m_Log.Write("Hotmail-SR-BETA - loginOnloadHandler - Found URI : " +szURI);
                                    var oFolder = new FolderData();
                                    oFolder.szFolderName = szDeCodeTitle;
                                    oFolder.szURI = szURI;
                                    mainObject.m_aszFolderURLList.push(oFolder);
                                }
                            }
                            delete oEscape;
                        }
                    }

                    //server response
                    mainObject.serverComms("+OK Your in\r\n");
                    mainObject.m_bAuthorised = true;
                break
            }

            mainObject.m_Log.Write("Hotmail-SR-BETA - loginOnloadHandler - END");
        }
        catch(err)
        {
            mainObject.m_Log.DebugDump("Hotmail-SR-BETA: loginHandler : Exception : "
                                          + err.name
                                          + ".\nError message: "
                                          + err.message+ "\n"
                                          + err.lineNumber);

            mainObject.m_ComponentManager.deleteAllElements(mainObject.m_szUserName);

            var oCookies = Components.classes["@mozilla.org/nsWebMailCookieManager2;1"]
                                     .getService(Components.interfaces.nsIWebMailCookieManager2);
            oCookies.removeCookie(mainObject.m_szUserName);

            mainObject.serverComms("-ERR negative vibes from " +mainObject.m_szUserName+ "\r\n");
        }
    },



    //stat
    //total size is in octets
    getNumMessages : function()
    {
        try
        {
            this.m_Log.Write("Hotmail-SR-BETA - getNumMessages - START");
            if (this.m_aszFolderURLList.length == 0) 
            {
                this.serverComms("+OK " + this.m_aMsgDataStore.length + " " + this.m_iTotalSize + "\r\n");
            }
            else 
            {            
                this.mailBox(true);
            }
            this.m_Log.Write("Hotmail-SR-BETA - getNumMessages - END");
            return true;
        }
        catch(e)
        {
            this.m_Log.DebugDump("Hotmail-SR-BETA: getNumMessages : Exception : "
                                          + e.name
                                          + ".\nError message: "
                                          + e.message+ "\n"
                                          + e.lineNumber);
            return false;
        }
    },



    mailBox : function (bState)
    {
        this.m_iStage = 0;
        var oFolder = this.m_aszFolderURLList.shift();
        this.m_szFolderName = oFolder.szFolderName;
        this.m_szFolderURL = oFolder.szURI;
        this.m_Log.Write("Hotmail-SR-BETA - getNumMessages - mail box "+this.m_szFolderName + "  url " + oFolder.szURI);
        this.m_HttpComms.setURI(oFolder.szURI);
        this.m_HttpComms.setRequestMethod("GET");

        var bResult = this.m_HttpComms.send(this.mailBoxOnloadHandler, this);
        if (!bResult) throw new Error("httpConnection returned false");
        this.m_bStat = true;
    },



    mailBoxOnloadHandler : function (szResponse ,event , mainObject)
    {
        try
        {
            mainObject.m_Log.Write("Hotmail-SR-BETA - mailBoxOnloadHandler - START");
            mainObject.m_Log.Write("Hotmail-SR-BETA - mailBoxOnloadHandler : " + mainObject.m_iStage);

            var httpChannel = event.QueryInterface(Components.interfaces.nsIHttpChannel);
            mainObject.m_Log.Write("Hotmail-SR-BETA - mailBoxOnloadHandler - Mailbox :" + httpChannel.responseStatus);
         
            //check status should be 200.
            if (httpChannel.responseStatus != 200 )
                throw new Error("error status " + httpChannel.responseStatus);
            
            var szCleanResponse  = szResponse.replace(/\\"/g,"\"");
            szCleanResponse  = szResponse.replace(/\\'/g,"\'");
            szCleanResponse = szCleanResponse.replace(/\\r\\n/g,"\r\n");
                        
            if (szCleanResponse.search(patternHotmailInboxContent)!=-1) //search for inbox content
            {
                mainObject.m_Log.Write("Hotmail-SR-BETA - mailBoxOnloadHandler - content found");

                //get view state
                var szStatView = ""
                if (szCleanResponse.search(patternHotmailViewState)!=-1)
                    szStatView = szCleanResponse.match(patternHotmailViewState)[1];
                mainObject.m_Log.Write("Hotmail-SR-BETA - mailBoxOnloadHandler - szViewState : " +szStatView);

                //get AuthUser
                if (szCleanResponse.search(patternHotmailAuthUser)!=-1)
                    mainObject.m_szAuthUser = szCleanResponse.match(patternHotmailAuthUser)[1];
                mainObject.m_Log.Write("Hotmail-SR-BETA - mailBoxOnloadHandler - m_szAuthUser : " +mainObject.m_szAuthUser);

                //get SessionId
                if (szCleanResponse.search(patternHotmailSessionID)!=-1)
                    mainObject.m_szSessionID = szCleanResponse.match(patternHotmailSessionID)[1];
                mainObject.m_Log.Write("Hotmail-SR-BETA - mailBoxOnloadHandler - m_szSessionID : " +mainObject.m_szSessionID);

                //nonce 
                if (szCleanResponse.search(patternHotmailNonce)!=-1)
                    mainObject.m_szNonce = szCleanResponse.match(patternHotmailNonce)[1];
                mainObject.m_Log.Write("Hotmail-SR-BETA - mailBoxOnloadHandler - m_szNonce : " +mainObject.m_szNonce);

                //Right to left
                if (szCleanResponse.search(patternHotmailRtl)!=-1)
                    mainObject.m_szRtl = szCleanResponse.match(patternHotmailRtl)[1];
                mainObject.m_Log.Write("Hotmail-SR-BETA - mailBoxOnloadHandler -szRtl : " +mainObject.m_szRtl);              

              
                //get msg urls
                if (szCleanResponse.search(patternHotmailMailBoxTable)!= -1) 
                {
                    var szMsgTable = szCleanResponse.match(patternHotmailMailBoxTable)[1];
                    mainObject.m_Log.Write("Hotmail-SR-BETA - mailBoxOnloadHandler -msg table : " + szMsgTable);
                    
                    var szMsgRows = szMsgTable.match(patternHotmailMailBoxTableRow); //split on rows
                    mainObject.m_Log.Write("Hotmail-SR-BETA - mailBoxOnloadHandler -split msg table : " + szMsgRows);
                    if (szMsgRows) 
                    {
                        for (j = 0; j < szMsgRows.length; j++) 
                        {
                            mainObject.m_Log.Write("Hotmail-SR-BETA - mailBoxOnloadHandler - row  : " + szMsgRows[j]);
                            var oMSG = mainObject.processMSG(szMsgRows[j], szStatView);
                            if (oMSG) mainObject.m_aMsgDataStore.push(oMSG);
                        }
                    }
                }
            }


            //get pages uri
            var bMorepages = false;
            if (szCleanResponse.search(patternHotmailNextPage)!=-1 && szCleanResponse.search(patternHotmailLastPage)!=-1)
            {
                var iLastPage = parseInt(szCleanResponse.match(patternHotmailLastPage)[1]);              
                mainObject.m_Log.Write("Hotmail-SR-BETA - mailBoxOnloadHandler -iLastPage : " +iLastPage +" " + mainObject.m_iPageCount);
                if (iLastPage > mainObject.m_iPageCount)bMorepages = true;
            }
         
            if (bMorepages)  //more pages
            {                
                var szNavBlock = szCleanResponse.match(patternHotmailNextPage)[0];
                mainObject.m_Log.Write("Hotmail-SR-BETA - mailBoxOnloadHandler -szNavBlock : " +szNavBlock);
                
                var szPageDir = szNavBlock.match(patternHotmailPageDir)[1];
                mainObject.m_Log.Write("Hotmail-SR-BETA - mailBoxOnloadHandler -szPageDir : " +szPageDir);    
  
                var szMsgAnchor = szNavBlock.match(patternHotmailMsgAnchor)[1];
                mainObject.m_Log.Write("Hotmail-SR-BETA - mailBoxOnloadHandler -szMsgAnchor : " +szMsgAnchor);    
                  
                var szAnchorDate = szNavBlock.match(patternHotmailAnchorDate)[1];
                mainObject.m_Log.Write("Hotmail-SR-BETA - mailBoxOnloadHandler -szAnchorDate : " +szAnchorDate);              
                var oEscape = new HTMLescape(mainObject.m_Log);
                szAnchorDate = oEscape.decode(szAnchorDate);
                szAnchorDate = szAnchorDate.replace(/\:/g,"\\:");
                delete oEscape;  
                
                var szMSGCount = 0;  //message count
                try
                {
                    szMSGCount = szCleanResponse.match(patternHotmailMSGcount)[1];
                    mainObject.m_Log.Write("Hotmail-SR-BETA - mailBoxOnloadHandler -szMSGCount : " + szMSGCount);
                }
                catch(e){}   
                      
                mainObject.m_Log.Write("Hotmail-SR-BETA - mailBoxOnloadHandler -m_iPageCount : " +mainObject.m_iPageCount);    
                
                var szMid = szNavBlock.match(patternHotmailMid)[1];
                mainObject.m_Log.Write("Hotmail-SR-BETA - mailBoxOnloadHandler -szMid : " +szMid);              
                 
                var szURL = mainObject.m_szLocationURI + "mail.fpp?"
                szURL += "cnmn=Microsoft.Msn.Hotmail.Ui.Fpp.MailBox.GetInboxData&";
                szURL += "a=" + mainObject.m_szSessionID + "&";
                szURL += "au=" + mainObject.m_szAuthUser + "&";
                szURL += "ptid=0";
                mainObject.m_Log.Write("Hotmail-SR-BETA - emailOnloadHandler - szURL :" + szURL);
                
                mainObject.m_HttpComms.addValuePair("cn","Microsoft.Msn.Hotmail.Ui.Fpp.MailBox");
                mainObject.m_HttpComms.addValuePair("mn","GetInboxData");
                
                var szD = "true,false,true,{";
                szD += "\"" + mainObject.m_szFolderURL.match(patternHotmailFolderID)[1] + "\",";  //folderID
                szD += szPageDir + ","; //pnDir
                szD += "0,Date,false,"; 
                szD += "\"" + szMsgAnchor + "\",";  //pnAm
                szD += "\"" +  szAnchorDate + "\",";  //pnAd
                szD += mainObject.m_iPageCount +",";  //current page
                szD += szMid + ",";  //pMid
                szD += "false,\"\","; 
                szD += szMSGCount;  //message count
                szD += ",-1,Off";
                szD += "},false,null";
                szD = mainObject.urlEncode(szD);
                              
                mainObject.m_HttpComms.addValuePair("d",szD);
                mainObject.m_HttpComms.addValuePair("v","1");
                mainObject.m_HttpComms.addValuePair("mt",mainObject.m_szMT);
                                
                mainObject.m_HttpComms.setURI(szURL);
                mainObject.m_HttpComms.setRequestMethod("POST");
                mainObject.m_iPageCount++;
                var bResult = mainObject.m_HttpComms.send(mainObject.mailBoxOnloadHandler, mainObject);
                if (!bResult) throw new Error("httpConnection returned false");
            }
            else  //done with mailbox
            {
                if (mainObject.m_aszFolderURLList.length>0)
                {
                    var oFolder = mainObject.m_aszFolderURLList.shift();
                    mainObject.m_Log.Write("Hotmail-SR-BETA - mailBoxOnloadHandler - :" + oFolder.szURI);
                    mainObject.m_szFolderURL = oFolder.szURI;
                    mainObject.m_szFolderName = oFolder.szFolderName;
                    mainObject.m_iPageCount = 1;

                    mainObject.m_HttpComms.setURI(oFolder.szURI);
                    mainObject.m_HttpComms.setRequestMethod("GET");

                    var bResult = mainObject.m_HttpComms.send(mainObject.mailBoxOnloadHandler, mainObject);
                    if (!bResult) throw new Error("httpConnection returned false");
                }
                else  //all uri's collected
                {
                    if (mainObject.m_bStat) //called by stat
                    {
                        mainObject.serverComms("+OK "+ mainObject.m_aMsgDataStore.length + " " + mainObject.m_iTotalSize + "\r\n");
                    }
                    else //called by list
                    {
                        var callback = {
                           notify: function(timer){ this.parent.processSizes(timer)}
                        };
                        callback.parent = mainObject;
                        mainObject.m_iHandleCount = 0;
                        mainObject.m_Timer.initWithCallback(callback,
                                                            mainObject.m_iTime,
                                                            Components.interfaces.nsITimer.TYPE_REPEATING_SLACK);
                    }
                }
            }
            mainObject.m_Log.Write("Hotmail-SR-BETA - MailBoxOnload - END");
        }
        catch(err)
        {
             mainObject.m_Log.DebugDump("Hotmail-SR-BETA: MailboxOnload : Exception : "
                                              + err.name
                                              + ".\nError message: "
                                              + err.message+ "\n"
                                              + err.lineNumber);

            mainObject.serverComms("-ERR negative vibes from " +mainObject.m_szUserName+ "\r\n");
        }
    },



    processMSG : function (szMSGData,szStatView)
    {
        try
        {
            this.m_Log.Write("Hotmail-SR-BETA - processMSG - START");
    
            var oMSG =  null;
            var bRead = true;
            if (this.m_bDownloadUnread)
            {
                bRead = (szMSGData.search(patternHotmailEmailRead)!=-1) ? true : false;
                this.m_Log.Write("Hotmail-SR-BETA.js - processMSG - bRead -" + bRead);
            }
    
            if (bRead)
            {
                oMSG = new HotmailMSG();
                var oEscape = new HTMLescape(this.m_Log);
                
                oMSG.szMad = szMSGData.match(patternHotmailMad)[1];
                this.m_Log.Write("Hotmail-SR-BETA..js - processMSG - oMSG.szMad -" + oMSG.szMad);
                           
                var szEmailID = szMSGData.match(patternHotmailID)[1];
                this.m_Log.Write("Hotmail-SR-BETA - processMSG - Email ID : " +szEmailID);
                oMSG.szMSGID = szEmailID;
    
                oMSG.szFolderName = this.m_szFolderName;
                oMSG.szFolderURL = this.m_szFolderURL;
                oMSG.szFolderID = this.m_szFolderURL.match(patternHotmailFolderID)[1];
                oMSG.szTo = this.m_szUserName;
    
                var szFrom = "";
                try
                {
                    if (szMSGData.search(patternHotmailEmailSender) != -1) 
                    {
                        szFrom = szMSGData.match(patternHotmailEmailSender)[1];
                        szFrom = oEscape.decode(szFrom);
                        this.m_Log.Write("Hotmail-SR-BETA - processMSG - Email Alt From : " + szFrom);
                    }
                    else 
                    {
                        szFrom = szMSGData.match(patternHotmailEmailSenderAlt)[1];
                        szFrom = oEscape.decode(szFrom);
                        this.m_Log.Write("Hotmail-SR-BETA - processMSG - Email From : " + szFrom);
                    }
                }
                catch(err){}
                oMSG.szFrom = szFrom;
    
                var szSubject= "";
                try
                {
                    if (szMSGData.search(patternHotmailEmailSubject) != -1) 
                    {
                        szSubject = szMSGData.match(patternHotmailEmailSubject)[1];
                        szSubject = oEscape.decode(szSubject);
                        this.m_Log.Write("Hotmail-SR-BETA - processMSG - Email Subject Alt : " + szSubject);
                    }
                    else 
                    {
                        szSubject = szMSGData.match(patternHotmailEmailSubjectAlt)[1];
                        szSubject = oEscape.decode(szSubject);
                        this.m_Log.Write("Hotmail-SR-BETA - processMSG - Email szSubject : " + szSubject);
                    }
                }
                catch(err){}
                oMSG.szSubject = szSubject;
                
                delete oEscape;
        
                try
                {
                    var today = new Date();
                    var szRawDate = "";
                    try
                    {
                        if (szMSGData.search(patternHotmailEmailDate) != -1) 
                        {
                            szRawDate = szMSGData.match(patternHotmailEmailDateAlt)[1];
                            this.m_Log.Write("Hotmail-SR-BETA - processMSG - Email Date Alt : " + szRawDate);
                        }
                        else 
                        {
                            szRawDate = szMSGData.match(patternHotmailEmailDate)[1];
                            this.m_Log.Write("Hotmail-SR-BETA - processMSG - Email Date : " + szRawDate);
                        }
                    }
                    catch(err){}
    
                    if (szRawDate.search(/:/)!=-1)//check for time
                    {
                        var aTime = szRawDate.split(/:|\s/);
                        this.m_Log.Write("Hotmail-SR-BETA.js - processMSG - time "+aTime);
                        if (aTime[2] == 'PM') 
                            today.setHours(parseInt(aTime[0])+12);
                        else
                            today.setHours(aTime[0]);
                            
                        today.setMinutes(aTime[1]);
                    }
                    else if (szRawDate.search(/\//)!=-1)   //date
                    {
                        var aDate = szRawDate.split(/\//);
                        if (aDate[2].length>2)
                            today.setFullYear(aDate[2]);   //Hotmail uses YY
                        else
                            today.setFullYear("20" + aDate[2]);   //Hotmail uses YY
                            
                        this.m_Log.Write("Hotmail-SR-BETA.js - processMSG - date "+aDate);
                        if (this.m_szLocale.search(/en-US/i)!=-1) 
                        {
                            this.m_Log.Write("Hotmail-SR-BETA.js - processMSG - date mm/day");
                            today.setMonth(aDate[0]-1);
                            today.setDate(aDate[1]);
                        }
                        else
                        {
                            this.m_Log.Write("Hotmail-SR-BETA.js - processMSG - date day/mm");
                            today.setMonth(aDate[1]-1);
                            today.setDate(aDate[0]);
                        }
                    }
                    else  //yesterday
                    {
                         today.setDate(today.getDate()-1);
                    }
                    oMSG.szDate = today.toUTCString();
                    this.m_Log.Write("Hotmail-SR-BETA.js - processMSG - " + oMSG.szDate);
                }
                catch(err){}
    
                oMSG.iSize = 1000;
                this.m_Log.Write("Hotmail-SR-BETA - processMSG - size " + oMSG.iSize );
                this.m_iTotalSize += oMSG.iSize;
    
                oMSG.szStatView = szStatView;
            }
    
            this.m_Log.Write("Hotmail-SR-BETA - processMSG - END");
            return oMSG;
        }
        catch(e)
        {
            this.m_Log.DebugDump("Hotmail-SR-BETA: processMSG : Exception : "
                              + e.name
                              + ".\nError message: "
                              + e.message+ "\n"
                              + e.lineNumber);
                              
            return null;
        }
    },



    //list
    getMessageSizes : function()
    {
        try
        {
            this.m_Log.Write("Hotmail-SR-BETA - getMessageSizes - START");

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
            {
                if (this.m_aszFolderURLList.length==0) return false;
                this.mailBox(false);
            }
            this.m_Log.Write("Hotmail-SR-BETA - getMessageSizes - END");
            return true;
        }
        catch(e)
        {
            this.m_Log.DebugDump("Hotmail-SR-BETA: getMessageSizes : Exception : "
                                          + e.name
                                          + ".\nError message: "
                                          + e.message+ "\n"
                                          + e.lineNumber);
            this.serverComms("-ERR negative vibes from " +this.m_szUserName+ "\r\n");
            return false;
        }
    },



    processSizes : function(timer)
    {
        try
        {
            this.m_Log.Write("Hotmail-SR-BETA.js - processSizes - START");

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

            this.m_Log.Write("Hotmail-SR-BETA.js - processSizes - END");
        }
        catch(err)
        {
            this.m_Timer.cancel();
            this.m_Log.DebugDump("Hotmail-SR-BETA.js: processSizes : Exception : "
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
            this.m_Log.Write("Hotmail-SR-BETA - getMessageIDs - START");

             var callback = {
               notify: function(timer) { this.parent.processIDS(timer)}
            };
            callback.parent = this;
            this.m_iHandleCount = 0;
            this.m_Timer.initWithCallback(callback,
                                          this.m_iTime,
                                          Components.interfaces.nsITimer.TYPE_REPEATING_SLACK);

            this.m_Log.Write("Hotmail-SR-BETA - getMessageIDs - END");
            return true;
        }
        catch(e)
        {
            this.m_Log.DebugDump("Hotmail-SR-BETA: getMessageIDs : Exception : "
                                          + e.name
                                          + ".\nError message: "
                                          + e.message+ "\n"
                                          + e.lineNumber);
            this.serverComms("-ERR negative vibes from " +this.m_szUserName+ "\r\n");
            return false;
        }
    },



    processIDS : function(timer)
    {
        try
        {
            this.m_Log.Write("Hotmail-SR-BETA.js - processIDS - START");

            //response start
            if (this.m_iHandleCount ==  0)
                this.serverComms("+OK " + this.m_aMsgDataStore.length + " Messages\r\n");


            if ( this.m_aMsgDataStore.length > 0)
            {
                var iCount = 0;
                do{                    
                    var szEmailID = this.m_aMsgDataStore[this.m_iHandleCount].szMSGID;
                    this.m_Log.Write("Hotmail-SR-BETA - getMessageIDs - Email ID : " +szEmailID);                 
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

            this.m_Log.Write("Hotmail-SR-BETA.js - processIDS - END");
        }
        catch(err)
        {
            this.m_Timer.cancel();
            this.m_Log.DebugDump("Hotmail-SR-BETA..js: processIDS : Exception : "
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
            this.m_Log.Write("Hotmail-SR-BETA.js - getHeaders - START");
            this.m_Log.Write("Hotmail-SR-BETA.js - getHeaders - id " + lID );

            var oMSG = this.m_aMsgDataStore[lID-1];

            var szHeaders = "X-WebMail: true\r\n";
            szHeaders += "X-Folder: " +oMSG.szFolderName + "\r\n";
            szHeaders += "To: "+ oMSG.szTo +"\r\n";
            szHeaders += "From: "+ oMSG.szFrom +"\r\n";
            szHeaders += "Subject: "+ oMSG.szSubject +"\r\n";
            szHeaders += "Date: " + oMSG.szDate +"\r\n"; // \r\n";
            szHeaders += "\r\n.\r\n";//msg end

            var  szResponse = "+OK " +szHeaders.length + "\r\n";
            szResponse += szHeaders
            this.serverComms(szResponse);

            this.m_Log.Write("Hotmail-SR-BETA.js - getHeaders - END");
            return true;
        }
        catch(err)
        {
            this.m_Log.DebugDump("Hotmail-SR-BETA.js: getHeaders : Exception : "
                                          + err.name +
                                          ".\nError message: "
                                          + err.message+ "\n"
                                          + err.lineNumber);
            this.serverComms("-ERR negative vibes from " +this.m_szUserName+ "\r\n");
            return false;
        }
    },



    //retr
    getMessage : function( lID)
    {
        try
        {
            this.m_Log.Write("Hotmail-SR-BETA - getMessage - START");
            this.m_Log.Write("Hotmail-SR-BETA - getMessage - msg num" + lID);

            //get msg id
            var oMSG = this.m_aMsgDataStore[lID-1];
            this.m_szMsgID = oMSG.szMSGID;    
            var szURI = this.m_szLocationURI + "GetMessageSource.aspx?msgid=" + this.m_szMsgID ;
            this.m_Log.Write("Hotmail-SR-BETA - getMessage - msg uri" + szURI);

            if (this.m_MSGEscape) delete this.m_MSGEscape;  
            this.m_szFolderName = oMSG.szFolderName;
            this.m_szFolderID = oMSG.szFolderID;
            this.m_szMad = oMSG.szMad;
            this.m_iStage = 0;
            this.m_iDownloadRetry = 3;

            //get msg from hotmail
            this.m_HttpComms.setURI(szURI);
            this.m_HttpComms.setRequestMethod("GET");

            var bResult = this.m_HttpComms.send(this.emailOnloadHandler, this);
            if (!bResult) throw new Error("httpConnection returned false");

            this.m_Log.Write("Hotmail-SR-BETA - getMessage - END");
            return true;
        }
        catch(e)
        {
             this.m_Log.DebugDump("Hotmail-SR-BETA: getMessage : Exception : "
                                          + e.name +
                                          ".\nError message: "
                                          + e.message+ "\n"
                                          + e.lineNumber);
            this.serverComms("-ERR negative vibes from " +this.m_szUserName+ "\r\n");
            return false;
        }
    },



    emailOnloadHandler : function (szResponse ,event , mainObject)
    {
        try
        {
            mainObject.m_Log.Write("Hotmail-SR-BETA - emailOnloadHandler - START");

            var httpChannel = event.QueryInterface(Components.interfaces.nsIHttpChannel);
            mainObject.m_Log.Write("Hotmail-SR-BETA - emailOnloadHandler - msg :" + httpChannel.responseStatus);

            //check status should be 200.
            if (httpChannel.responseStatus != 200) 
            {
                if (mainObject.m_iDownloadRetry > 0 && mainObject.m_iStage == 0) 
                {                    
                    var szURI = mainObject.m_szLocationURI + "GetMessageSource.aspx?msgid=" + mainObject.m_szMSGID;
                    mainObject.m_Log.Write("Hotmail-SR-BETA - getMessage - msg uri" + szURI);
                    mainObject.m_HttpComms.setURI(szURI);
                    mainObject.m_HttpComms.setRequestMethod("GET");
                    
                    var bResult = mainObject.m_HttpComms.send(mainObject.emailOnloadHandler, mainObject);
                    mainObject.m_iDownloadRetry--;
                    return;
                }
                else throw new Error("error status " + httpChannel.responseStatus);
            }
            
            switch(mainObject.m_iStage)
            {
                case 0: //get email
                    var aTemp = szResponse.split(/<pre>/);
                    if (!aTemp) throw new Error("Message START  not found");
                    var szEmail = aTemp[1].split(/<\/pre>/)[0];
                    if (!szEmail) throw new Error("Message END  not found");
                    szEmail = szEmail.replace(/<\/$/,"");  //clean bad tag
                    szEmail = szEmail.replace(/<\/pr$/,"");  //clean bad tag
                    szEmail = szEmail.replace(/<\/pre$/,"");  //clean bad tag - Why can't MS get this right

                    mainObject.m_MSGEscape = new HTMLescape(mainObject.m_Log);
                    if (!mainObject.m_MSGEscape.decodeAsync(szEmail, mainObject.emailCleanCallback, mainObject)) 
                        throw new Error ("email clean failed")
                break;

                case 1: //mark as read
                    var szPOPResponse = "+OK " +  mainObject.m_szMSG.length + "\r\n";
                    szPOPResponse +=  mainObject.m_szMSG;
                    mainObject.serverComms(szPOPResponse);
                break;
            }
            mainObject.m_Log.Write("Hotmail-SR-BETA - emailOnloadHandler - END");
        }
        catch(err)
        {
            mainObject.m_Log.DebugDump("Hotmail-SR-BETA: emailOnloadHandler : Exception : "
                                          + err.name
                                          + ".\nError message: "
                                          + err.message+ "\n"
                                          + err.lineNumber);

            mainObject.serverComms("-ERR negative vibes from " +mainObject.m_szUserName+ "\r\n");
        }
    },




    emailCleanCallback : function (szMSG, mainObject)
    {
        try
        {      
            mainObject.m_Log.Write("Hotmail-SR-BETA - emailCleanCallback - START");
                                            
            //clean up msg
            mainObject.m_szMSG = "X-WebMail: true\r\n";
            mainObject.m_szMSG += "X-Folder: " + mainObject.m_szFolderName + "\r\n";
            mainObject.m_szMSG += szMSG;
            mainObject.m_szMSG =  mainObject.m_szMSG.replace(/^\./mg,"..");    //bit padding
            mainObject.m_szMSG += "\r\n.\r\n";

            if (mainObject.m_bMarkAsRead)
            {
                mainObject.m_Log.Write("Hotmail-SR-BETA - emailOnloadHandler - MarkAsRead");   
                mainObject.m_iStage++;
                var szURL = mainObject.m_szLocationURI + "mail.fpp?"
                szURL += "cnmn=Microsoft.Msn.Hotmail.Ui.Fpp.MailBox.MarkMessagesReadState&";
                szURL += "a=" + mainObject.m_szSessionID + "&";
                szURL += "au=" + mainObject.m_szAuthUser + "&";
                szURL += "ptid=0";
                mainObject.m_Log.Write("Hotmail-SR-BETA - emailOnloadHandler - szURL :" + szURL);
                
                mainObject.m_HttpComms.addValuePair("cn","Microsoft.Msn.Hotmail.Ui.Fpp.MailBox");
                mainObject.m_HttpComms.addValuePair("mn","MarkMessagesReadState");
                
                var szD = "true,";
                szD    += "[\""  + mainObject.m_szMsgID + "\"],";
                szD    += "[{\"" + mainObject.m_szMad.replace(/\|/g,"\\|")  + "\"}],"
                szD    += "{\""  + mainObject.m_szFolderID + "\",";
                szD    += "FirstPage,0,Date,false,\"00000000-0000-0000-0000-000000000000\",";
                szD    += "\"\",1,2,false,\"\",2,-1,Off}";
                         
                szD = mainObject.urlEncode(szD);
                mainObject.m_HttpComms.addValuePair("d",szD);
                mainObject.m_HttpComms.addValuePair("v","1");
                mainObject.m_HttpComms.addValuePair("mt",mainObject.m_szMT);
                                
                mainObject.m_HttpComms.setURI(szURL);
                mainObject.m_HttpComms.setRequestMethod("POST");
                var bResult = mainObject.m_HttpComms.send(mainObject.emailOnloadHandler, mainObject);
                if (!bResult) throw new Error("httpConnection returned false");
            }
            else
            {
                var szPOPResponse = "+OK " +  mainObject.m_szMSG.length + "\r\n";
                szPOPResponse +=  mainObject.m_szMSG;
                mainObject.serverComms(szPOPResponse);
            }
            
            mainObject.m_Log.Write("Hotmail-SR-BETA - emailCleanCallback - END");    
        }
        catch(e)
        {
            mainObject.m_Log.DebugDump("Hotmail-SR-BETA: emailCleanCallback : Exception : "
                                          + e.name +
                                          ".\nError message: "
                                          + e.message+ "\n"
                                          + e.lineNumber);
            mainObject.serverComms("-ERR negative vibes from " +mainObject.m_szUserName+ "\r\n");
        }                
    },



    //dele
    deleteMessage : function(lID)
    {
        try
        {
            this.m_Log.Write("Hotmail-SR-BETA - deleteMessage - START");
            this.m_Log.Write("Hotmail-SR-BETA - deleteMessage - id " + lID );

            var oMSG = this.m_aMsgDataStore[lID-1];

            var szURL = this.m_szLocationURI + "mail.fpp?"
            szURL += "cnmn=Microsoft.Msn.Hotmail.Ui.Fpp.MailBox.MoveMessagesToFolder&";
            szURL += "a=" + this.urlEncode(this.m_szSessionID) + "&";
            szURL += "au=" + this.m_szAuthUser + "&";
            szURL += "ptid=0";
            this.m_Log.Write("Hotmail-SR-BETA - deleteMessage - szURL :" + szURL);
            this.m_HttpComms.setURI(szURL);

            this.m_HttpComms.addValuePair("cn","Microsoft.Msn.Hotmail.Ui.Fpp.MailBox");
            this.m_HttpComms.addValuePair("mn","MoveMessagesToFolder");
            
            var szD = "\"" + oMSG.szFolderID + "\","; //from folder
            szD   +=  "\"00000000-0000-0000-0000-000000000002\","; //to trash
            szD   +=  "[\"" + oMSG.szMSGID + "\"],"; //msg ID
            szD   +=  "[{\"" + oMSG.szMad.replace(/\|/g,"\\|") + "\"}],";
            szD   +=  "{\"00000000-0000-0000-0000-000000000001\",FirstPage,0,Date,false,"
            szD   +=         "\"00000000-0000-0000-0000-000000000000\",\"\",1,2,false,\"\",5,-1,Off}";
            szD = this.urlEncode(szD);
            this.m_HttpComms.addValuePair("d",szD);
            this.m_HttpComms.addValuePair("v","1");
            this.m_HttpComms.addValuePair("mt",this.m_szMT);
            
            this.m_HttpComms.setRequestMethod("POST");
            var bResult = this.m_HttpComms.send(this.deleteMessageOnloadHandler, this);
            if (!bResult) throw new Error("httpConnection returned false");

            this.m_Log.Write("Hotmail-SR-BETA - deleteMessage - END");
            return true;
        }
        catch(e)
        {
            this.m_Log.DebugDump("Hotmail-SR-BETA: deleteMessage : Exception : "
                                          + e.name +
                                          ".\nError message: "
                                          + e.message+ "\n"
                                          + e.lineNumber);
            this.serverComms("-ERR negative vibes from " +this.m_szUserName+ "\r\n");
            return false;
        }
    },


    deleteMessageOnloadHandler : function (szResponse ,event , mainObject)
    {
        try
        {
            mainObject.m_Log.Write("Hotmail-SR-BETA - deleteMessageOnload - START");

            var httpChannel = event.QueryInterface(Components.interfaces.nsIHttpChannel);

            //check status should be 200.
            mainObject.m_Log.Write("Hotmail-SR-BETA - deleteMessageOnload :" + httpChannel.responseStatus);
            if (httpChannel.responseStatus != 200 )
                throw new Error("error status " + httpChannel.responseStatus);

            if (szResponse.search(/<div id="error">/i)==-1)
                mainObject.serverComms("+OK its history\r\n");
            else
               mainObject.serverComms("-ERR negative vibes from " +mainObject.m_szUserName+ "\r\n");

            mainObject.m_Log.Write("Hotmail-SR-BETA - deleteMessageOnload - END");
        }
        catch(e)
        {
            mainObject.m_Log.DebugDump("Hotmail-SR-BETA: deleteMessageOnload : Exception : "
                                              + e.name
                                              + ".\nError message: "
                                              + e.message+ "\n"
                                              + e.lineNumber);
            mainObject.serverComms("-ERR negative vibes from " +mainObject.m_szUserName+ "\r\n");
        }
    },



    logOut : function()
    {
        try
        {
            this.m_Log.Write("Hotmail-SR-BETA - logOUT - START");

            if (this.m_bReUseSession)
            {
                this.m_Log.Write("Hotmail-SR-BETA - logOUT - Setting Session Data");

                this.m_ComponentManager.addElement(this.m_szUserName, "szHomeURI", this.m_szHomeURI);
            }
            else
            {
                this.m_Log.Write("Hotmail-SR-BETA - logOUT - removing Session Data");
                this.m_ComponentManager.deleteAllElements(this.m_szUserName);

                var oCookies = Components.classes["@mozilla.org/nsWebMailCookieManager2;1"]
                                         .getService(Components.interfaces.nsIWebMailCookieManager2);
                oCookies.removeCookie(this.m_szUserName);
            }

            this.m_bAuthorised = false;
            this.serverComms("+OK Your Out\r\n");

            this.m_Timer.cancel();
            delete this.m_aMsgDataStore;
            delete this.m_aszFolders;
            delete this.m_aszFolderURLList;
            delete this.m_HttpComms;
            if (this.m_MSGEscape) delete this.m_MSGEscape;
            
            this.m_Log.Write("Hotmail-SR-BETA - logOUT - END");
            return true;
        }
        catch(e)
        {
            this.m_Log.DebugDump("Hotmail-SR-BETA: logOUT : Exception : "
                                      + e.name
                                      + ".\nError message: "
                                      + e.message+ "\n"
                                      + e.lineNumber);
            this.serverComms("-ERR negative vibes from " +this.m_szUserName+ "\r\n");
            return false;
        }
    },



    serverComms : function (szMsg)
    {
        try
        {
            this.m_Log.Write("Hotmail-SR-BETA - serverComms - START");
            this.m_Log.Write("Hotmail-SR-BETA - serverComms msg " + szMsg);
            var iCount = this.m_oResponseStream.write(szMsg,szMsg.length);
            this.m_Log.Write("Hotmail-SR-BETA - serverComms sent count: " + iCount +" msg length: " +szMsg.length);
            this.m_Log.Write("Hotmail-SR-BETA - serverComms - END");
        }
        catch(e)
        {
            this.m_Log.DebugDump("Hotmail-SR-BETA: serverComms : Exception : "
                                              + e.name
                                              + ".\nError message: "
                                              + e.message+ "\n"
                                              + e.lineNumber);
        }
    },



    /*        
    %60 %7E %40 %24 %25 %5E
    `   ~   @   $   %   ^ 
    
    %26 %28 %29 %2B %3D
    &   (    )   +   = 
    
    %7B %7D %7C %5B %5D %5C  %22
    {    }   |   [   ]   \    " 
    
    %3B %27 %3C %3E %3F %2C %2F
    ;     '  <   >   ?   ,   /
    */
    urlEncode : function (szData)
    {
        var szEncoded = encodeURI(szData);
        szEncoded = szEncoded.replace(/!/g,"%21");
        szEncoded = szEncoded.replace(/\:/g,"%3A");
        szEncoded = szEncoded.replace(/\#/g,"%23");
        szEncoded = szEncoded.replace(/\@/g,"%40");

        szEncoded = szEncoded.replace(/%5B/g,"[");
        szEncoded = szEncoded.replace(/%5D/g,"]");
        szEncoded = szEncoded.replace(/%7B/g,"{");
        szEncoded = szEncoded.replace(/%7D/g,"}");        
        return szEncoded;

    },
    
    
    urlDecode : function (szDate)
    {
        var szDecode = szDate.replace(/\\x3a/g,":");
        szDecode = szDecode.replace(/\\x2f/g,"/");
        szDecode = szDecode.replace(/\\x3f/g,"?");
        szDecode = szDecode.replace(/\\x3d/g,"="); 
        szDecode = szDecode.replace(/\\x26/g,"&");
        return szDecode;
    }
}
