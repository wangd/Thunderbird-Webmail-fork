/*****************************  Globals   *************************************/
const nsGMailPOPClassID = Components.ID("{38d08a80-44a3-11da-8cd6-0800200c9a66}");
const nsGMailPOPContactID = "@mozilla.org/GMailPOP;1";
const ExtGMailGuid = "{42040a50-44a3-11da-8cd6-0800200c9a66}";

const szVersionNumber = "V20060829100000";

/******************************  GMail ***************************************/


function nsGMail()
{
    try
    {
        var scriptLoader =  Components.classes["@mozilla.org/moz/jssubscript-loader;1"]
                                      .getService(Components.interfaces.mozIJSSubScriptLoader);
        scriptLoader.loadSubScript("chrome://web-mail/content/common/DebugLog.js");
        scriptLoader.loadSubScript("chrome://web-mail/content/common/CommonPrefs.js");
        scriptLoader.loadSubScript("chrome://web-mail/content/common/HttpComms3.js");
        scriptLoader.loadSubScript("chrome://gmail/content/GMailMSG.js");
        scriptLoader.loadSubScript("chrome://gmail/content/HTML-escape.js");

        var date = new Date();
        var szLogFileName = "GMailLog_" + date.getHours()+ "_" + date.getMinutes() + "_"+ date.getUTCMilliseconds() +"_";
        this.m_Log = new DebugLog("webmail.logging.comms", ExtGMailGuid, szLogFileName);

        this.m_Log.Write("nsGMailPOP.js " + szVersionNumber + " - Constructor - START");

        if (typeof PatternGmailConstants == "undefined")
        {
            this.m_Log.Write("nsPOPOWA.js - Constructor - loading constants");
            scriptLoader.loadSubScript("chrome://gmail/content/Gmail-Constants.js");
        }

        this.m_DomainManager =  Components.classes["@mozilla.org/GMailDomains;1"]
                                          .getService()
                                          .QueryInterface(Components.interfaces.nsIGMailDomains);       


        this.m_szMailURL = "http://mail.google.com/mail/"
        this.m_bAuthorised = false;
        this.m_szUserName = null;
        this.m_szPassWord = null;
        this.m_oResponseStream = null;
        this.m_HttpComms = new HttpComms(this.m_Log);
        this.m_HttpComms.setUserAgentOverride(true);
        
        this.m_iStage = 0;
        this.m_szGMailAtCookie = null;
        this.m_szCookieLoginURL = null;

        this.m_aMsgDataStore = new Array();
        this.m_iTotalSize = 0;
        this.m_szLabels = "";
        this.m_szStared = false;
            
        this.m_ComponentManager = Components.classes["@mozilla.org/ComponentData2;1"]
                                            .getService(Components.interfaces.nsIComponentData2);

        //do i reuse the session
        var oPref = {Value:null};
        var  WebMailPrefAccess = new WebMailCommonPrefAccess();
        if (WebMailPrefAccess.Get("bool","gmail.bReUseSession",oPref))
            this.m_bReUseSession = oPref.Value;
        else
            this.m_bReUseSession = false;

        this.m_Log.Write("nsGMailPOP.js - Constructor - bReUseSession : " + this.m_bReUseSession);

        //do i download unread msg only
        oPref = {Value:null};
        if (WebMailPrefAccess.Get("bool","gmail.bDownloadUnread",oPref))
            this.m_bDownloadUnread = oPref.Value;
        else
            this.m_bDownloadUnread = true;
        this.m_Log.Write("nsGMailPOP.js - Constructor - bDownloadUnread : " + this.m_bDownloadUnread);

        //archive or delete
        oPref = {Value:null};
        if (WebMailPrefAccess.Get("bool","gmail.bArchive",oPref))
            this.m_bArchive = oPref.Value;
        else
            this.m_bArchive = true;
        this.m_Log.Write("nsGMailPOP.js - Constructor - m_bArchive : " + this.m_bArchive);

        this.m_szMsgID = 0;

        this.m_Timer = Components.classes["@mozilla.org/timer;1"];
        this.m_Timer = this.m_Timer.createInstance(Components.interfaces.nsITimer);
        this.m_iTime = 10;
        this.m_iHandleCount = 0;
        this.m_aszThreadURL = new Array();

        this.m_Log.Write("nsGMailPOP.js - Constructor - END");
    }
    catch(e)
    {
        DebugDump("nsGMailPOP.js: Constructor : Exception : "
                                      + e.name
                                      + ".\nError message: "
                                      + e.message);
    }
}



nsGMail.prototype =
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
            this.m_Log.Write("nsGMailPOP.js - logIN - START");
            this.m_Log.Write("nsGMailPOP.js - logIN - Username: " + this.m_szUserName
                                                   + " Password: " + this.m_szPassWord
                                                   + " stream: " + this.m_oResponseStream);

            if (!this.m_szUserName || !this.m_oResponseStream  || !this.m_szPassWord) return false;

            // get login webPage     
            var szDomain = this.m_szUserName.match(/.*?@(.*?)$/)[1].toLowerCase();
            if (szDomain == "gmail.com" || szDomain == "googlemail.com") 
                loginURL = "http://mail.google.com/mail/";
            else
                loginURL = "http://mail.google.com/a/" + szDomain + "/";

            this.m_szMailURL = loginURL;
 
            this.m_HttpComms.setUserName(this.m_szUserName);
            
            var bSessionStored = this.m_ComponentManager.findElement(this.m_szUserName, "bSessionStored");
            if ( bSessionStored && this.m_bReUseSession ) 
            {
                    this.m_Log.Write("nsGMailPOP.js - logIN - Session Data found");
    
                    this.serverComms("+OK Your in\r\n");
                    this.m_bAuthorised = true;
            } 
            else 
            {
                this.m_Log.Write("nsGMailPOP.js - logIN - No Session Data found");
                var oCookies = Components.classes["@mozilla.org/nsWebMailCookieManager2;1"]
                                         .getService(Components.interfaces.nsIWebMailCookieManager2);
                oCookies.removeCookie(this.m_szUserName);
                this.m_ComponentManager.deleteAllElements(this.m_szUserName);

                this.m_HttpComms.setURI(loginURL);
                this.m_HttpComms.setRequestMethod("GET");
                
                var bResult = this.m_HttpComms.send(this.loginOnloadHandler, this);
                if (!bResult) throw new Error('httpConnection returned false');
                this.m_iStage = 0;
            }

            this.m_Log.Write("nsGMailPOP.js - logIN - END");
            return true;
        }
        catch(e)
        {
            this.m_Log.DebugDump("nsGMailPOP.js: logIN : Exception : "
                                              + e.name +
                                              ".\nError message: "
                                              + e.message);
            return false;
        }
    },


    loginOnloadHandler : function(szResponse ,event , mainObject)
    {
        try 
        {
            mainObject.m_Log.Write("nsGMailPOP.js - loginOnloadHandler - START");
            mainObject.m_Log.Write("nsGMailPOP.js - loginOnloadHandler : " + mainObject.m_iStage);
    
            var httpChannel = event.QueryInterface(Components.interfaces.nsIHttpChannel);
    
            //if this fails we've gone somewhere new
            mainObject.m_Log.Write("nsGMailPOP.js - loginOnloadHandler - status :" + httpChannel.responseStatus );
            if (httpChannel.responseStatus != 200)
                throw new Error("return status " + httpChannel.responseStatus);

            //bounce check
            if (szResponse.search(patternGMailLoginBounce)!=-1)
            {
                mainObject.m_Log.Write("nsGMailPOP.js - loginOnloadHandler - bounce");
                var oEscape = new HTMLescape();
                var szClean = oEscape.decode(szResponse);
                delete oEscape;
                var szURI = szClean.match(patternGMailLoginBounce)[1];
                mainObject.m_Log.Write("nsGMailPOP.js - loginOnloadHandler - redirectURL " + szURI);
    
                mainObject.m_HttpComms.setURI(szURI);
                mainObject.m_HttpComms.setRequestMethod("GET");
                var bResult = mainObject.m_HttpComms.send(mainObject.loginOnloadHandler, mainObject);
                if (!bResult) throw new Error("httpConnection returned false");    
                return;   
            }
           

            switch  ( mainObject.m_iStage ) 
            {
                case 0:  //login
                    mainObject.m_Log.Write("nsGMailPOP.js - loginOnloadHandler - login");
                     
                    var aszLoginForm = szResponse.match(patternGMailLoginForm);
                    mainObject.m_Log.Write("nsGMailPOP.js - loginOnloadHandler - aszLoginForm " + aszLoginForm);
                     
                    var szAction = aszLoginForm[0].match(patternGMailFormAction)[1];
                    mainObject.m_Log.Write("nsGMailPOP.js - loginOnloadHandler - szAction " + szAction);
                   
                    var aszInput = aszLoginForm[0].match(patternGMailFormInput);
                    mainObject.m_Log.Write("nsGMailPOP.js - loginOnloadHandler - aszInput " + aszInput);
                               
                    for (i=0; i<aszInput.length; i++)
                    {
                        mainObject.m_Log.Write("nsGMailPOP.js - loginOnloadHandler - aszInput[i] " + aszInput[i]);
                        
                        var szName = aszInput[i].match(patternGMailFormName)[1];
                        mainObject.m_Log.Write("nsMailDotCom.js - loginOnloadHandler - szName " + szName);
                       
                        var szValue = "";
                        try 
                        {
                            var szValue = aszInput[i].match(patternGMailFormValue)[1];
                        } 
                        catch (e) 
                        {
                        }
                        mainObject.m_Log.Write("nsMailDotCom.js - loginOnloadHandler - szValue " + szValue);
                        
                        if (szName.search(/Passwd/i) != -1) szValue = mainObject.m_szPassWord;
                        if (szName.search(/Email/i) != -1) 
                        {
                            var szUserName = mainObject.m_szUserName.match(/(.*?)@.*?$/)[1].toLowerCase();
                            szValue = szUserName;
                        }
                        
                        mainObject.m_HttpComms.addValuePair(szName, encodeURIComponent(szValue));
                    }        
                    
                    mainObject.m_HttpComms.setURI(szAction);
                    mainObject.m_HttpComms.setRequestMethod("POST");
                    var bResult = mainObject.m_HttpComms.send(mainObject.loginOnloadHandler, mainObject);
                    if (!bResult) throw new Error("httpConnection returned false");
                    mainObject.m_iStage++;      
               break
                               
               case 1:
                    if ( szResponse.search(/logout/i) == -1 && szResponse.search(/ManageAccount/i)==-1) 
                        throw new Error("Invalid Password");

                    var szLocation  = httpChannel.URI.spec;
                    mainObject.m_Log.Write("nsGMailPOP.js - loginOnloadHandler - location : " + szLocation );

                    mainObject.m_Log.Write("nsGMailPOP.js - loginOnloadHandler - Getting session cookie...");
                    var IOService = Components.classes["@mozilla.org/network/io-service;1"]
                                              .getService(Components.interfaces.nsIIOService);
                    var nsIURI = IOService.newURI(szLocation, null, null);
                   
                    var oCookies = Components.classes["@mozilla.org/nsWebMailCookieManager2;1"]
                                             .getService(Components.interfaces.nsIWebMailCookieManager2);
                    szCookies = oCookies.findCookie(mainObject.m_szUserName, nsIURI);
                    mainObject.m_Log.Write("nsGMailPOP.js - loginOnloadHandler - session cookies:\n" + szCookies);
        
                    mainObject.m_szGMailAtCookie = szCookies.match(PatternGMailGetSessionCookie)[1];
                    if ( mainObject.m_szGMailAtCookie == null)
                        throw new Error("Error getting session cookie during login");
        
                    mainObject.m_Log.Write("nsGMailPOP.js - loginOnloadHandler - szGMAIL_AT: " + mainObject.m_szGMailAtCookie);
        
                    if (httpChannel.URI.schemeIs("https")) 
                        mainObject.m_szMailURL = mainObject.m_szMailURL.replace(/^http/i,"https");
        
                    mainObject.serverComms("+OK Your in\r\n");
                    mainObject.m_bAuthorised = true;
                break;
            }

            mainObject.m_Log.Write("nsGMailPOP.js - loginOnloadHandler - END");
        }
        catch(err)
        {
            var oCookies = Components.classes["@mozilla.org/nsWebMailCookieManager2;1"]
                                     .getService(Components.interfaces.nsIWebMailCookieManager2);
            oCookies.removeCookie(mainObject.m_szUserName);

            mainObject.m_ComponentManager.deleteAllElements(mainObject.m_szUserName);

            mainObject.m_Log.DebugDump("nsGMailPOP.js: loginHandler : Exception : "
                                          + err.name
                                          + ".\nError message: "
                                          + err.message
                                          + "\n" + err.lineNumber);

            mainObject.serverComms("-ERR negative vibes (GMail)\r\n");
        }
    },



    //stat
    //total size is in octets
    getNumMessages : function()
    {
        try
        {
            this.m_Log.Write("nsGMailPOP.js - getNumMessages - START");

            if ( this.m_bAuthorised == false ) return false;

            var szInboxURI = this.m_szMailURL + "?search=inbox&view=tl&start=0&init=1&ui=1"
            this.m_HttpComms.setURI(szInboxURI);
            this.m_HttpComms.setRequestMethod("GET");
            var bResult = this.m_HttpComms.send(this.mailBoxOnloadHandler, this);
            if (!bResult) throw new Error("httpConnection returned false"); 
            this.m_iStage = 0;

            this.m_Log.Write("nsGMailPOP.js - getNumMessages - END");
            return true;
        }
        catch(e)
        {
            this.m_Log.DebugDump("nsGMailPOP.js: getNumMessages : Exception : "
                                          + e.name
                                          + ".\nError message: "
                                          + e.message);
            return false;
        }
    },




    mailBoxOnloadHandler : function (szResponse ,event , mainObject)
    {
        try
        {
            mainObject.m_Log.Write("nsGMailPOP.js - mailBoxOnloadHandler - START");
            mainObject.m_Log.Write("nsGMailPOP.js - mailBoxOnloadHandler : " + mainObject.m_iStage);

            var httpChannel = event.QueryInterface(Components.interfaces.nsIHttpChannel);

            //check status should be 200.
            mainObject.m_Log.Write("nsGMailPOP.js - mailBoxOnloadHandler - Mailbox :" + httpChannel.responseStatus);
            if (httpChannel.responseStatus != 200 )
                throw new Error("error status " + httpChannel.responseStatus);

            switch(mainObject.m_iStage)
            {
                case 0:
                    mainObject.m_Log.Write("nsGMailPOP.js - mailBoxOnloadHandler - process pages ");
                    var aMSGTableURLs = szResponse.match(PatternGMailNextMSGTable);
                    mainObject.m_Log.Write("nsGMailPOP.js - mailBoxOnloadHandler - aMSGTableURLs :" + aMSGTableURLs);
                    if ( aMSGTableURLs[4].search(/in\:inbox/) == -1 )
                        throw new Error("Error loading GMail Inbox");
        
                    var iNumEmails = parseInt(aMSGTableURLs[3]);
                    mainObject.m_Log.Write("nsGMailPOP.js - mailBoxOnloadHandler - iNumEmails :" + iNumEmails);
                    
                    var aMSGTable = szResponse.match(PatternGMailMSGTable);            
                    mainObject.m_Log.Write("nsGMailPOP.js - mailBoxOnloadHandler - aMSGTable :\n" + aMSGTable);
        
                    if (aMSGTable)
                    {
                        // Get block
                        for (var i = 0; i <  aMSGTable.length ; i++ )
                        {
                            var szBlock = aMSGTable[i].replace(/\]\r?\n,"/gm, "\], \" ");
                            mainObject.m_Log.Write("nsGMailPOP.js - mailBoxOnloadHandler - szBlock :\n" +szBlock);
        
                            var MSGRows = szBlock.match(/D\(\["t"([\s\S]*?)\]\r?\n\);/im)[1];
                            mainObject.m_Log.Write("nsGMailPOP.js - mailBoxOnloadHandler - rows :" + MSGRows);
                            var aMSGRows = MSGRows.match(/,\[.*?\]\r?\n/igm);
                            mainObject.m_Log.Write("nsGMailPOP.js - mailBoxOnloadHandler - rows split :" + aMSGRows);
        
                            //get rows
                            for (var j = 0 ; j<aMSGRows.length; j++)
                            {
                                mainObject.m_Log.Write("nsGMailPOP.js - mailBoxOnloadHandler - aMSGRow :" + aMSGRows[j]);
                                
                                var aszData = aMSGRows[j].match(PatternGMailMSGData);    
                                mainObject.m_Log.Write("nsGMailPOP.js - mailBoxOnloadHandler -  : " + aszData);
                                                                                     
                                var bRead = true;
                                if (mainObject.m_bDownloadUnread)
                                {
                                    bRead = parseInt(aszData[3])==1 ? false : true;
                                    this.m_Log.Write("nsGMailPOP.js - mailBoxOnloadHandler- bRead -" + bRead);
                                }
                                
                                if (bRead)
                                {                               
                                    //check for thread
                                    var iThreadNum = aszData[4].search(/\(\d*?\)/);
                                    var aIDs = aMSGRows[j].match(PatternGMailThreadID);
                                    mainObject.m_Log.Write("nsGMailPOP.js - mailBoxOnloadHandler -  : " + aIDs[1] + " " + aIDs[2] + " " +iThreadNum);
                                    
                                    if (aIDs[1]!=aIDs[2] || iThreadNum!=-1)
                                    {//thread found                                    
                                         mainObject.m_Log.Write("nsGMailPOP.js - mailBoxOnloadHandler - thread found");
                                         var szThreadURI = mainObject.m_szMailURL + "?ui=1&view=cv&search=inbox&th="+ aszData[1];
                                         mainObject.m_Log.Write("nsGMailPOP.js - mailBoxOnloadHandler - szThreadURI :" +szThreadURI);
                                         mainObject.m_aszThreadURL.push(szThreadURI);
                                         iNumEmails--;
                                    }
                                    else   
                                    { //no thread
                                        mainObject.m_Log.Write("nsGMailPOP.js - mailBoxOnloadHandler - NO THREAD ");
                                        
                                        var data = new GMailMSG();
                                        data.szMsgID = aszData[1];
                                        mainObject.m_Log.Write("nsGMailPOP.js - mailBoxOnloadHandler - ID :" + data.szMsgID);
                                        
                                        data.bStared = parseInt(aszData[3])==1 ? true : false;
                                        mainObject.m_Log.Write("nsGMailPOP.js - mailBoxOnloadHandler - stared :" + data.bStared);
                                        
                                        mainObject.m_Log.Write("nsGMailPOP.js - mailBoxOnloadHandler - aszData[5] : " + aszData[5]);
                                        if(aszData[5].length>0)
                                        {
                                            var szLabels = "";
                                            var aszLabels = aszData[5].match(/"(.*?)"/g);
                                            for (var k=0; k<aszLabels.length; k++)
                                            {
                                                if (aszLabels[k].search(/^"\^\S"$/)==-1)
                                                {
                                                    szLabels += aszLabels[k];
                                                    if (k<aszLabels.length-1)szLabels += ", ";
                                                }
                                            }
                                            data.szLabels = (szLabels)? szLabels : " ";
                                        }
                                        mainObject.m_Log.Write("nsGMailPOP.js - mailBoxOnloadHandler - label :" + data.szLabels);
                                                                   
                                        //
                                        // TODO
                                        // GMail does not provide the message size, so we return a fake one until
                                        // we find a nice way of retriving the info
                                        //
                                        data.iSize = 100000;
                                        mainObject.m_iTotalSize += data.iSize;
                                        mainObject.m_aMsgDataStore.push(data);
                                    }
                                }
                            }
                        }
                    }
        
        
                    //next page
                    if (iNumEmails > mainObject.m_aMsgDataStore.length && aMSGTable)
                    {
                        mainObject.m_Log.Write("nsGMailPOP.js - mailBoxOnloadHandler - more pages");
                        var iNext = parseInt(aMSGTableURLs[1]) + parseInt(aMSGTableURLs[2]);
                        var szInboxURI = mainObject.m_szMailURL + "?ui=1&search=inbox&view=tl&start=" + iNext;
                        mainObject.m_Log.Write("nsGMailPOP.js - mailBoxOnloadHandler - szURL " + szInboxURI); 
                        mainObject.m_HttpComms.setURI(szInboxURI);
                        mainObject.m_HttpComms.setRequestMethod("GET");
                        var bResult = mainObject.m_HttpComms.send(mainObject.mailBoxOnloadHandler, mainObject);
                        if (!bResult) throw new Error("httpConnection returned false"); 
                        mainObject.m_iStage = 0;
                    }
                    else if (mainObject.m_aszThreadURL.length > 0)
                    {
                        mainObject.m_Log.Write("nsGMailPOP.js - mailBoxOnloadHandler - now download threads"); 
                        var szURL = mainObject.m_aszThreadURL.pop();
                        mainObject.m_Log.Write("nsGMailPOP.js - mailBoxOnloadHandler - szURL " + szURL); 
                        mainObject.m_HttpComms.setURI(szURL);
                        mainObject.m_HttpComms.setRequestMethod("GET");
                        var bResult= mainObject.m_HttpComms.send(mainObject.mailBoxOnloadHandler, mainObject);
                        if (!bResult) throw new Error("httpConnection returned false"); 
                        mainObject.m_iStage = 1;
                    }
                    else
                    {
                        mainObject.serverComms("+OK "+ 
                                               mainObject.m_aMsgDataStore.length + " " + 
                                               mainObject.m_iTotalSize + "\r\n");
                    }
                break;
                
                case 1:
                    mainObject.m_Log.Write("nsGMailPOP.js - mailBoxOnloadHandler - process threads ");
                                        
                    var aThreadTable = szResponse.match(PatternGMailThreadTable);
                    mainObject.m_Log.Write("nsGMailPOP.js - mailBoxOnloadHandler - aThreadTable :" + aThreadTable);
                    
                    //labels
                    var szLabels = "";
                    var aszRawLabels = szResponse.match(PatternGMailThreadLabels);   
                    mainObject.m_Log.Write("nsGMailPOP.js - mailBoxOnloadHandler - aszRawLabels: " + aszRawLabels);
                    if(aszRawLabels.length>0)
                    {
                        var aszLabels = aszRawLabels[1].match(/"(.*?)"/g);
                        mainObject.m_Log.Write("nsGMailPOP.js - mailBoxOnloadHandler - aszLabels: " + aszLabels);
                        for (var k=0; k<aszLabels.length; k++)
                        {
                            if (aszLabels[k].search(/^"\^\S"$/)==-1)
                            {
                                szLabels += aszLabels[k];
                                if (k<aszLabels.length-1)szLabels += ", ";
                            }
                        }
                    }                     

                    
                    for (var i=0; i<aThreadTable.length; i++)
                    {
                        var aEmailData = aThreadTable[i].match(PatternGMailThreadData);
                        mainObject.m_Log.Write("nsGMailPOP.js - mailBoxOnloadHandler - aEmailData :" + aEmailData);
                        mainObject.m_Log.Write("nsGMailPOP.js - mailBoxOnloadHandler - aEmailData :" 
                                                + aEmailData[1] + " " + aEmailData[2] + " " + aEmailData[3] + " "
                                                + aEmailData[4]+ " " + aEmailData[5]);
                          
                        if (parseInt(aEmailData[1])!= 384 && parseInt(aEmailData[1])!= 392) //384/392 are deleted emails ?
                        {
                            //check your not sender                         
                            //aEmailData[5] sender's email address != account email
                            mainObject.m_szUserName
                            var regExp = new RegExp(aEmailData[5]);
                            if ( mainObject.m_szUserName.search(regExp)==-1)//sent items?
                            { 
                                var data = new GMailMSG();
                                data.szMsgID = aEmailData[3];
                                mainObject.m_Log.Write("nsGMailPOP.js - mailBoxOnloadHandler - ID :" + data.szMsgID);
                                
                                data.bStared = parseInt(aEmailData[4])==1 ? true : false;
                                mainObject.m_Log.Write("nsGMailPOP.js - mailBoxOnloadHandler - stared :" + data.bStared);
                                
                                data.szLabels = (szLabels)? szLabels : " ";                 
                                mainObject.m_Log.Write("nsGMailPOP.js - mailBoxOnloadHandler - label :" + data.szLabels);
                                                           
                                data.iSize = 100000;
                                mainObject.m_iTotalSize += data.iSize;
                                mainObject.m_aMsgDataStore.push(data);
                            }
                            else
                                mainObject.m_Log.Write("nsGMailPOP.js - mailBoxOnloadHandler - You sent this ");
                        }
                        else
                            mainObject.m_Log.Write("nsGMailPOP.js - mailBoxOnloadHandler - This has been deleted ");
                    }
                    
                    if (mainObject.m_aszThreadURL.length > 0)
                    {
                        mainObject.m_Log.Write("nsGMailPOP.js - mailBoxOnloadHandler - now download threads"); 
                        var szURL = mainObject.m_aszThreadURL.pop();
                        mainObject.m_Log.Write("nsGMailPOP.js - mailBoxOnloadHandler - szURL " + szURL); 
                        mainObject.m_HttpComms.setURI(szURL);
                        mainObject.m_HttpComms.setRequestMethod("GET");
                        var bResult= mainObject.m_HttpComms.send(mainObject.mailBoxOnloadHandler, mainObject);
                        if (!bResult) throw new Error("httpConnection returned false"); 
                        mainObject.m_iStage = 1;
                    }
                    else  //done
                    {
                        mainObject.serverComms("+OK "+ 
                                               mainObject.m_aMsgDataStore.length + " " + 
                                               mainObject.m_iTotalSize + "\r\n");
                    }
                break;
            }

            mainObject.m_Log.Write("nsGMailPOP.js - MailBoxOnload - END");
        }
        catch(err)
        {
             mainObject.m_Log.DebugDump("nsGMailPOP.js: MailboxOnload : Exception : "
                                              + err.name
                                              + ".\nError message: "
                                              + err.message
                                              + "\n" + err.lineNumber);

             mainObject.serverComms("-ERR negative vibes (GMail)\r\n");
        }
    },





    //list
    //I'm not downloading the mailbox again.
    //I hope stat been called first or there's going to be trouble
    getMessageSizes : function()
    {
        try
        {
            this.m_Log.Write("nsGMailPOP.js - getMessageSizes - START");

            if ( this.m_bAuthorised == false ) return false;

            var callback = {
               notify: function(timer) { this.parent.processSizes(timer)}
            };
            callback.parent = this;

            this.m_iHandleCount = 0;
            this.m_Timer.initWithCallback(callback,
                                          this.m_iTime,
                                          Components.interfaces.nsITimer.TYPE_REPEATING_SLACK);

            this.m_Log.Write("nsGMailPOP.js - getMessageSizes - END");
            return true;
        }
        catch(e)
        {
            this.m_Log.DebugDump("nsGMailPOP.js: getMessageSizes : Exception : "
                        + e.name
                        + ".\nError message: "
                        + e.message + "\n"
                        + e.lineNumber);
            return false;
        }
    },




    processSizes : function(timer)
    {
        try
        {
            this.m_Log.Write("nsGMailPOP.js - processSizes - START");

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

            this.m_Log.Write("nsGMailPOP.js - processSizes - END");
        }
        catch(err)
        {
            this.m_Timer.cancel();
            this.m_Log.DebugDump("nsGMailPOP.js: processSizes : Exception : "
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
            this.m_Log.Write("nsGMailPOP.js - getMessageIDs - START");

            if ( this.m_bAuthorised == false ) return false;

            var callback = {
               notify: function(timer) { this.parent.processIDS(timer)}
            };
            callback.parent = this;
            this.m_iHandleCount = 0;
            this.m_Timer.initWithCallback(callback,
                                          this.m_iTime,
                                          Components.interfaces.nsITimer.TYPE_REPEATING_SLACK);


            this.m_Log.Write("nsGMailPOP.js - getMessageIDs - END");
            return true;
        }
        catch(e)
        {
            this.m_Log.DebugDump("nsGMailPOP.js: getMessageIDs : Exception : "
                                              + e.name
                                              + ".\nError message: "
                                              + e.message);
            return false;
        }
    },




    processIDS : function(timer)
    {
        try
        {
            this.m_Log.Write("nsGMailPOP.js - processIDS - START");

            //response start
            if (this.m_iHandleCount ==  0)
                this.serverComms("+OK " + this.m_aMsgDataStore.length + " Messages\r\n");


            if ( this.m_aMsgDataStore.length > 0)
            {
                var iCount = 0;
                do{
                    var szEmailID = this.m_aMsgDataStore[this.m_iHandleCount].szMsgID;
                    this.m_Log.Write("nsGMailPOP.js - getMessageIDs - IDS : " +szEmailID);

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

            this.m_Log.Write("nsGMailPOP.js - processIDS - END");
        }
        catch(err)
        {
            this.m_Timer.cancel();
            this.m_Log.DebugDump("nsGMailPOP.js: processIDS : Exception : "
                                              + err.name
                                              + ".\nError message: "
                                              + err.message+ "\n"
                                              + err.lineNumber);

            this.serverComms("-ERR negative vibes from " +this.m_szUserName+ "\r\n");
        }
    },




    //retr
    getMessage : function(msgIndex)
    {
        try
        {
            this.m_Log.Write("nsGMailPOP.js - getMessage - START");
    
            if ( this.m_bAuthorised == false ) return false;
    
            //get msg id
            var oMSGData = this.m_aMsgDataStore[msgIndex-1]
            this.m_szMsgID = oMSGData.szMsgID;
            this.m_Log.Write("nsGMailPOP.js - getMessage - msg id: " + this.m_szMsgID);
    
            this.m_szLabels = (oMSGData.szLabels)? oMSGData.szLabels :  " ";
            this.m_Log.Write("nsGMailPOP.js - getMessage - msg m_szLabels: " + this.m_szLabels);
            
            this.m_bStared = oMSGData.bStared;
            this.m_Log.Write("nsGMailPOP.js - getMessage - msg m_szStared: " + this.m_szStared);
                        
            var getMsgParams = "q=in%3Aanywhere&start=0&ui=1&search=query&view=om&th=" + this.m_szMsgID;
            var szInboxURI = this.m_szMailURL + '?' + getMsgParams;
    
            this.m_iStage = 0;
            this.m_HttpComms.setURI(szInboxURI);
            this.m_HttpComms.setRequestMethod("GET");
            var bResult = this.m_HttpComms.send(this.emailOnloadHandler, this);
            if (!bResult) throw new Error("httpConnection returned false");
    
            this.m_Log.Write("nsGMailPOP.js - getMessage - END");
            return true;
        }
        catch(e)
        {
             this.m_Log.DebugDump("nsGMailPOP.js: getMessage : Exception : "
                                          + e.name +
                                          ".\nError message: "
                                          + e.message);
            return false;
        }
    },


    emailOnloadHandler : function (szResponse ,event , mainObject)
    {
        try
        {
            mainObject.m_Log.Write("nsGMailPOP.js - emailOnloadHandler - START");
            
            var httpChannel = event.QueryInterface(Components.interfaces.nsIHttpChannel);
            //check status should be 200.
            if (httpChannel.responseStatus != 200)
                throw new Error("error status " + httpChannel.responseStatus);

            var szContetnType =  httpChannel.getResponseHeader("Content-Type");
            mainObject.m_Log.Write("nsGMailPOP.js - emailOnloadHandler - szContetnType "+szContetnType);
            if (szContetnType.search(/text\/html/i)!=-1)
               throw new Error("Unexpected reply from GMail; " + szResponse);

            var szMsg =  "X-WebMail: true\r\n";
            szMsg +=  "X-Labels: " + mainObject.m_szLabels + "\r\n";
            szMsg +=  "X-Stared: " + mainObject.m_bStared;
            szMsg += szResponse;
            szMsg += "\r\n.\r\n";  //msg end

            var szPOPResponse = "+OK " + szMsg.length + "\r\n";
            szPOPResponse += szMsg;
            mainObject.serverComms(szPOPResponse);

            mainObject.m_Log.Write("nsGMailPOP.js - emailOnloadHandler - END");
        }
        catch(err)
        {
            mainObject.m_Log.DebugDump("nsGMailPOP.js: emailOnloadHandler : Exception : "
                                              + err.name
                                              + ".\nError message: "
                                              + err.message);
            mainObject.serverComms("-ERR negative vibes (GMail)\r\n");
        }
    },



    //dele
    deleteMessage : function(msgIndex)
    {
        try
        {
            this.m_Log.Write("nsGMailPOP.js - deleteMessage - START");

            if ( this.m_bAuthorised == false ) return false;

            //get msg id
            var oMSGData = this.m_aMsgDataStore[msgIndex-1]
            this.m_szMsgID = oMSGData.szMsgID;
            this.m_Log.Write("nsGMailPOP.js - deleteMessage - msg id: " + this.m_szMsgID);
    
            var szDeleteMsgURL = this.m_szMailURL ;
            szDeleteMsgURL += "?search=inbox&ui=1";
            szDeleteMsgURL += "&view=up";
            szDeleteMsgURL += this.m_bArchive ? "&act=rc_%5Ei" : "&act=tr"; 
            szDeleteMsgURL += "&at=" + this.m_szGMailAtCookie;
            szDeleteMsgURL += "&t=" + this.m_szMsgID;

            this.m_HttpComms.setURI(szDeleteMsgURL);
            this.m_HttpComms.setRequestMethod("GET");
            var bResult = this.m_HttpComms.send(this.deleteMessageOnloadHandler, this);
            this.m_iStage = 0;
    
            this.m_Log.Write("nsGMailPOP.js - deleteMessage - END");
            return true;
        }
        catch(e)
        {
            this.m_Log.DebugDump("nsGMailPOP.js: deleteMessage : Exception : "
                                          + e.name +
                                          ".\nError message: "
                                          + e.message);
            return false;
        }
    },


    deleteMessageOnloadHandler : function (szResponse ,event , mainObject)
    {
        try
        {
            mainObject.m_Log.Write("nsGMailPOP.js - deleteMessageOnload - START");
    
            var httpChannel = event.QueryInterface(Components.interfaces.nsIHttpChannel);
            //check status should be 200.
            mainObject.m_Log.Write("nsGMailPOP.js - deleteMessageOnload :" + httpChannel.responseStatus);
            if (httpChannel.responseStatus != 200 )
                throw new Error("error status " + httpChannel.responseStatus);
    
            mainObject.serverComms("+OK its history\r\n");
            mainObject.m_Log.Write("nsGMailPOP.js - deleteMessageOnload - END");
        }
        catch(e)
        {
            mainObject.m_Log.DebugDump("nsGMailPOP.js: deleteMessageOnload : Exception : " + e.name
                                                  + ".\nError message: "
                                                  + e.message);
            mainObject.serverComms("-ERR negative vibes (GMail)\r\n");
        }
    },

    //cookies are deleted when the connection ends so i dont need to download pages
    logOut : function()
    {
        try
        {
            this.m_Log.Write("nsGMailPOP.js - logOUT - START");
            
            if ( this.m_bReUseSession)
            {
                this.m_Log.Write("nsGMailSMTP.js - logOUT - Saving session Data");
                this.m_ComponentManager.addElement(this.m_szUserName, "bSessionStored", true);
            }
            else
            {
                var oCookies = Components.classes["@mozilla.org/nsWebMailCookieManager2;1"]
                                         .getService(Components.interfaces.nsIWebMailCookieManager2);
                oCookies.removeCookie(this.m_szUserName);

                this.m_ComponentManager.deleteAllElements(this.m_szUserName);
            }

            this.m_bAuthorised = false;
            this.serverComms("+OK Your Out\r\n");

            this.m_Log.Write("nsGMailPOP.js - logOUT - END");
            return true;
        }
        catch(e)
        {
            this.m_Log.DebugDump("nsGMailPOP.js: logOUT : Exception : "
                                      + e.name
                                      + ".\nError message: "
                                      + e.message);
            return false;
        }
    },

    serverComms : function (szMsg)
    {
        try
        {
            this.m_Log.Write("nsGMailPOP.js - serverComms - START");
            this.m_Log.Write("nsGMailPOP.js - serverComms msg " + szMsg);
            var iCount = this.m_oResponseStream.write(szMsg,szMsg.length);
            this.m_Log.Write("nsGMailPOP.js - serverComms sent count: " + iCount +" msg length: " +szMsg.length);
            this.m_Log.Write("nsGMailPOP.js - serverComms - END");
        }
        catch(e)
        {
            this.m_Log.DebugDump("nsGMailPOP.js: serverComms : Exception : "
                                              + e.name
                                              + ".\nError message: "
                                              + e.message);
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
var nsGMailFactory = new Object();

nsGMailFactory.createInstance = function (outer, iid)
{
    if (outer != null) throw Components.results.NS_ERROR_NO_AGGREGATION;

    if (!iid.equals(nsGMailPOPClassID) && !iid.equals(Components.interfaces.nsISupports))
        throw Components.results.NS_ERROR_INVALID_ARG;

    return new nsGMail();
}


/******************************************************************************/
/* MODULE */
var nsGMailModule = new Object();

nsGMailModule.registerSelf = function(compMgr, fileSpec, location, type)
{
    compMgr = compMgr.QueryInterface(Components.interfaces.nsIComponentRegistrar);
    compMgr.registerFactoryLocation(nsGMailPOPClassID,
                                    "GMailComponent",
                                    nsGMailPOPContactID,
                                    fileSpec,
                                    location,
                                    type);
}


nsGMailModule.unregisterSelf = function(aCompMgr, aFileSpec, aLocation)
{
    aCompMgr = aCompMgr.QueryInterface(Components.interfaces.nsIComponentRegistrar);
    aCompMgr.unregisterFactoryLocation(nsGMailPOPClassID, aFileSpec);
}


nsGMailModule.getClassObject = function(compMgr, cid, iid)
{
    if (!cid.equals(nsGMailPOPClassID))
        throw Components.results.NS_ERROR_NO_INTERFACE;

    if (!iid.equals(Components.interfaces.nsIFactory))
        throw Components.results.NS_ERROR_NOT_IMPLEMENTED;

    return nsGMailFactory;
}


nsGMailModule.canUnload = function(compMgr)
{
    return true;
}
/******************************************************************************/


function NSGetModule(compMgr, fileSpec)
{
    return nsGMailModule;
}
