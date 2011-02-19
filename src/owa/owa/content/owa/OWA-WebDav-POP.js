function OWAWebDav(oResponseStream, oLog, oPrefData)
{
    try
    {
        var scriptLoader =  Components.classes["@mozilla.org/moz/jssubscript-loader;1"];
        scriptLoader = scriptLoader.getService(Components.interfaces.mozIJSSubScriptLoader);
        scriptLoader.loadSubScript("chrome://web-mail/content/common/DebugLog.js");
        scriptLoader.loadSubScript("chrome://web-mail/content/common/HttpComms3.js");
        scriptLoader.loadSubScript("chrome://owa/content/OWA-MSG.js");

        this.m_Log = oLog;
        this.m_Log.Write("OWAWebDav.js - Constructor - START");

        this.m_szUserName = null;
        this.m_szPassWord = null;
        this.m_oResponseStream = oResponseStream;
        this.m_HttpComms = new HttpComms(this.m_Log);
        this.m_HttpComms.setHandleHttpAuth(true);   
        this.m_iStage=0;
        this.m_szMsgID = null;
        this.m_aRawData = new Array();
        this.m_aMsgDataStore = new Array();
        this.m_iTotalSize = 0;
        this.m_szMSG = null;
        this.m_iRetries = 2;
        this.m_szURL = null;

        this.m_IOS = Components.classes["@mozilla.org/network/io-service;1"]
                               .getService(Components.interfaces.nsIIOService);

        this.m_DomainManager =  Components.classes["@mozilla.org/OWADomains;1"]
                                          .getService()
                                          .QueryInterface(Components.interfaces.nsIOWADomains);       

        this.m_Timer = Components.classes["@mozilla.org/timer;1"]
                                 .createInstance(Components.interfaces.nsITimer);

        this.m_iProcessAmount = oPrefData.iProcessAmount;
        this.m_iTime = oPrefData.iProcessDelay;
        this.m_bLoginWithDomain = oPrefData.bLoginWithDomain;
        this.m_forwardCreds = oPrefData.forwardCreds;
        this.m_bReUseSession = oPrefData.bReUseSession;

        //process folders
        this.m_aszFolders = new Array();
        //this.m_aszFolders.push("Active"); //Inbox
        this.m_aszFolders.push("Inbox"); //Inbox
        this.m_aszFolderURLList = new Array();
        if (oPrefData.bUseJunkMail)  this.m_aszFolders.push("HM_BuLkMail_"); //junk
        for(var i=0; i<oPrefData.aszFolder.length; i++)
        {
            this.m_aszFolders.push(oPrefData.aszFolder[i]);
        }

        this.m_Log.Write("OWAWebDav.js - Constructor - this.m_aszFolders "+ this.m_aszFolders);

        this.m_bStat = false;
        this.m_iHandleCount = 0;

        this.m_Log.Write("OWAWebDav.js - Constructor - END");
    }
    catch(e)
    {
        DebugDump("OWAWebDav.js: Constructor : Exception : "
                                      + e.name
                                      + ".\nError message: "
                                      + e.message + "\n"
                                      + e.lineNumber);
    }
}



OWAWebDav.prototype =
{

    logIn : function(szUserName, szPassWord)
    {
        try
        {
            this.m_Log.Write("OWAWebDav.js - logIN - START");
            this.m_Log.Write("OWAWebDav.js - logIN - Username: " + szUserName
                                                   + " Password: " + szPassWord
                                                   + " stream: " + this.m_oResponseStream);

            this.m_szUserName = szUserName;
            this.m_szPassWord = szPassWord;

            if (!this.m_szUserName || !this.m_oResponseStream || !this.m_szPassWord) return false;

            this.m_iStage=0;
            var szUserName = this.m_szUserName;
            if (!this.m_bLoginWithDomain)
                szUserName = this.m_szUserName.match(/(.*?)@/)[1].toLowerCase();

            if (this.m_forwardCreds) {
                this.m_Log.Write("OWAWebDav.js - logIN - using credentials to access OWA");
                this.m_HttpComms.setUserName(szUserName);
                this.m_HttpComms.setPassword(this.m_szPassWord);
            }
            else {
                this.m_Log.Write("OWAWebDav.js - logIN - NOT using credentials to access OWA");
            }
            
            var szDomain = this.m_szUserName.match(/.*?@(.*?)$/)[1].toLowerCase();
            this.m_szURL = this.m_DomainManager.getURL(szDomain);
            
            var nsIURI = Components.classes["@mozilla.org/network/io-service;1"]
                                   .getService(Components.interfaces.nsIIOService)
                                   .newURI(this.m_szURL, null, null);
            var szServerName= nsIURI.host;
            
            if (this.m_forwardCreds) {
                var AuthToken = Components.classes["@mozilla.org/HttpAuthManager2;1"]
                    .getService(Components.interfaces.nsIHttpAuthManager2);
                AuthToken.addToken(szServerName,
                        "basic" ,
                        nsIURI.path ,
                        szUserName,
                        this.m_szPassWord);
            }
            
            this.m_HttpComms.setContentType("text/html");
            this.m_HttpComms.setURI(this.m_szURL);
            this.m_HttpComms.setRequestMethod("Get");
            var bResult = this.m_HttpComms.send(this.loginOnloadHandlerFirst, this);
            if (!bResult) throw new Error("httpConnection returned false");

            this.m_Log.Write("OWAWebDav.js - logIN - END");
            return bResult;
        }
        catch(e)
        {
            this.m_Log.DebugDump("OWAWebDav.js: logIN : Exception : "
                                              + e.name +
                                              ".\nError message: "
                                              + e.message+ "\n"
                                              + e.lineNumber);
            return false;
        }
    },


    loginOnloadHandlerFirst : function(szResponse ,event , mainObject)
    {
        try
        {
            mainObject.m_Log.Write("OWAWebDav.js - logINOnLoadHandlerFirst - START");
            mainObject.m_Log.Write("OWAWebDav.js - loginOnloadHandler : " + mainObject.m_iStage);

            var oCookies = Components.classes["@mozilla.org/nsWebMailCookieManager2;1"]
                                      .getService(Components.interfaces.nsIWebMailCookieManager2);
            
            var szDomain = mainObject.m_szUserName.match(/.*?@(.*?)$/)[1].toLowerCase();
            mainObject.m_szURL = mainObject.m_DomainManager.getURL(szDomain) + mainObject.m_szUserName.match(/(.*?)@.*?$/)[1].toLowerCase() + "/Inbox/";
            
            var nsIURI = Components.classes["@mozilla.org/network/io-service;1"]
                                   .getService(Components.interfaces.nsIIOService)
                                   .newURI(mainObject.m_szURL, null, null);
            var szServerName= nsIURI.host;
            
            mainObject.m_HttpComms.setContentType("text/xml");
            mainObject.m_HttpComms.setURI(mainObject.m_szURL);
            mainObject.m_HttpComms.setRequestMethod("PROPFIND");
            mainObject.m_HttpComms.addData(OWASchema);
            var bResult = mainObject.m_HttpComms.send(mainObject.loginOnloadHandler, mainObject);
            if (!bResult) throw new Error("httpConnection returned false");

            mainObject.m_Log.Write("OWAWebDav.js - logINOnLoadHandlerFirst - END");
            return bResult;
        }
        catch(e)
        {
            mainObject.m_Log.DebugDump("OWAWebDav.js: logIN : Exception : "
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
            mainObject.m_Log.Write("OWAWebDav.js - loginOnloadHandler - START");
            mainObject.m_Log.Write("OWAWebDav.js - loginOnloadHandler : " + mainObject.m_iStage);

            var httpChannel = event.QueryInterface(Components.interfaces.nsIHttpChannel);

            //if this fails we've gone somewhere new
            mainObject.m_Log.Write("OWAWebDav.js - loginOnloadHandler - status :" +httpChannel.responseStatus );

            if (httpChannel.responseStatus != 200 && httpChannel.responseStatus != 207)
                throw new Error("return status " + httpChannel.responseStatus);

            mainObject.m_Log.Write("OWAWebDav.js - Response Status is OK");

            switch(mainObject.m_iStage)
            {
                case 0://get folder urls
                    mainObject.m_HttpComms.setURI(mainObject.m_szURL);
                    mainObject.m_HttpComms.setRequestMethod("PROPFIND");
                    mainObject.m_HttpComms.setContentType("text/xml");
                    mainObject.m_HttpComms.addData(OWASchema);
                    mainObject.m_iStage++;
                    var bResult = mainObject.m_HttpComms.send(mainObject.loginOnloadHandler, mainObject);
                    if (!bResult) throw new Error("httpConnection returned false");
                break;
                
                case 1: //get baisc uri's
                    var szFolderURI = szResponse.match(patternOWAFolder)[1]; // FAILING HERE?
                    mainObject.m_Log.Write("OWAWebDav.js - loginOnloadHandler - get folder url - " + szFolderURI);
                    mainObject.m_szTrashURI = szResponse.match(patternOWATrash)[1];
                    mainObject.m_Log.Write("OWAWebDav.js - loginOnloadHandler - get trash url - " + mainObject.m_szTrashURI);

                    //download folder list;
                    mainObject.m_iStage++;
                    mainObject.m_HttpComms.setContentType("text/xml");
                    mainObject.m_HttpComms.setURI(szFolderURI);
                    mainObject.m_HttpComms.setRequestMethod("PROPFIND");
                    mainObject.m_HttpComms.addData(OWAFolderSchema);
                    var bResult = mainObject.m_HttpComms.send(mainObject.loginOnloadHandler, mainObject);
                    if (!bResult) throw new Error("httpConnection returned false");
                break;

                case 2: //process folder uri's
                    var aszFolderList = szResponse.match(patternOWAResponse);
                    mainObject.m_Log.Write("OWAWebDav.js - loginOnloadHandler - aszFolderList :" +aszFolderList);

                    for (j=0; j<mainObject.m_aszFolders.length; j++)
                    {
                        var regExp = new RegExp("^"+mainObject.m_aszFolders[j]+"$","i");
                        mainObject.m_Log.Write("OWAWebDav.js - loginOnloadHandler - regExp : "+regExp );

                        var i =0;
                        var bFound = false;
                        do{
                            if (aszFolderList[i].match(patternOWAIsFolder) )
                            {
                                mainObject.m_Log.Write("OWAWebDav.js - loginOnloadHandler - folderListItem : "+aszFolderList[i] );
                                var szFolderURL = aszFolderList[i].match(patternOWAHref)[1];
                                mainObject.m_Log.Write("OWAWebDav.js - loginOnloadHandler - szFolderURL : "+szFolderURL );
                                var szFolderName = szFolderURL.match(patternOWAFolderName)[1];
                                mainObject.m_Log.Write("OWAWebDav.js - loginOnloadHandler - szFolderName : "+szFolderName );
    
                                var szDisplayName = "";
                                if (aszFolderList[i].search(patternOWADisplayName)!=-1)
                                    szDisplayName =aszFolderList[i].match(patternOWADisplayName)[1];
                                mainObject.m_Log.Write("OWAWebDav.js - loginOnloadHandler - szDisplayName : "+szDisplayName );
    
                                var szSpecial = "";
                                if (aszFolderList[i].search(patternOWASpecial)!=-1)
                                    szSpecial =aszFolderList[i].match(patternOWASpecial)[1];
                                mainObject.m_Log.Write("OWAWebDav.js - loginOnloadHandler - szSpecial : "+szSpecial );
    
                                if (szFolderName.search(regExp)>=0 || szDisplayName.search(regExp)>=0 || szSpecial.search(regExp)>=0 )
                                {
                                    bFound = true;
                                    mainObject.m_aszFolderURLList.push(szFolderURL);
                                    mainObject.m_Log.Write("OWAWebDav.js - loginOnloadHandler - URL found : "+szFolderURL);
                                }
                            }
                            i++;
                        }while (i<aszFolderList.length && !bFound)
                    }

                    //server response
                    mainObject.serverComms("+OK Your in\r\n");
                    mainObject.m_bAuthorised = true;
                break;
            }

            mainObject.m_Log.Write("OWAWebDav.js - loginOnloadHandler - END");
        }
        catch(err)
        {
            var oCookies = Components.classes["@mozilla.org/nsWebMailCookieManager2;1"]
                                     .getService(Components.interfaces.nsIWebMailCookieManager2);
            oCookies.removeCookie(mainObject.m_szUserName);

            var oAuth = Components.classes["@mozilla.org/HttpAuthManager2;1"]
                                  .getService(Components.interfaces.nsIHttpAuthManager2);
            oAuth.removeToken(mainObject.m_szUserName);

            mainObject.m_Log.DebugDump("OWAWebDav.js: loginHandler : Exception : "
                                          + err.name
                                          + ".\nError message: "
                                          + err.message+ "\n"
                                          + err.lineNumber);

            mainObject.serverComms("-ERR negative vibes from " +mainObject.m_szUserName+ "\r\n");
        }
    },




    //stat
    //total size is in octets
    getNumMessages : function()
    {
        try
        {
            this.m_Log.Write("OWAWebDav.js - getNumMessages - START");

            if (this.m_aszFolderURLList.length==0) return false;
            this.m_Log.Write("OWAWebDav.js - getNumMessages - mail box url " + this.m_aszFolderURLList);
            this.mailBox(true);

            this.m_Log.Write("OWAWebDav.js - getNumMessages - END");
            return true;
        }
        catch(e)
        {
            this.m_Log.DebugDump("OWAWebDav.js: getNumMessages : Exception : "
                                          + e.name
                                          + ".\nError message: "
                                          + e.message+ "\n"
                                          + e.lineNumber);
            return false;
        }
    },


    mailBox : function (bState)
    {
        this.m_Log.Write("OWAWebDav.js - mailBox - START");

        this.m_iStage=0;
        this.m_HttpComms.setContentType("text/xml");
        var szUri = this.m_aszFolderURLList.shift();
        this.m_HttpComms.setURI(szUri);
        this.m_HttpComms.setRequestMethod("PROPFIND");
        this.m_HttpComms.addData(OWAMailSchema);
        var bResult = this.m_HttpComms.send(this.mailBoxOnloadHandler, this);
        if (!bResult) throw new Error("httpConnection returned false");
        this.m_bStat = bState;

        this.m_Log.Write("OWAWebDav.js - mailBox - END");
    },



    mailBoxOnloadHandler : function (szResponse ,event , mainObject)
    {
        try
        {
            mainObject.m_Log.Write("OWAWebDav.js - mailBoxOnloadHandler - START");
            mainObject.m_Log.Write("OWAWebDav.js - mailBoxOnloadHandler : " + mainObject.m_iStage);

            var httpChannel = event.QueryInterface(Components.interfaces.nsIHttpChannel);
            mainObject.m_Log.Write("OWAWebDav - mailBoxOnloadHandler - status :" +httpChannel.responseStatus );

            if (httpChannel.responseStatus != 200 && httpChannel.responseStatus != 207)
                throw new Error("return status " + httpChannel.responseStatus);

            var aszResponses = szResponse.match(patternOWAResponse);
            mainObject.m_Log.Write("OWAWebDav.js - mailBoxOnloadHandler - inbox - \n" + aszResponses);
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
                mainObject.m_HttpComms.addData(OWAMailSchema);
                var bResult = mainObject.m_HttpComms.send(mainObject.mailBoxOnloadHandler, mainObject);
                if (!bResult) throw new Error("httpConnection returned false");
            }
            else
            {
                mainObject.m_Log.Write("OWAWebDav.js - mailBoxOnloadHandler - download complete - starting delay");
                //start timer
                var callback = {
                    notify: function(timer) { this.parent.processItem(timer)}
                 };
                callback.parent = mainObject;

                mainObject.m_Timer.initWithCallback(callback,
                                                    mainObject.m_iTime,
                                                    Components.interfaces.nsITimer.TYPE_REPEATING_SLACK);
            }

            mainObject.m_Log.Write("OWAWebDav.js - mailBoxOnloadHandler - END");
            return true;
        }
        catch(e)
        {
            mainObject.m_Log.DebugDump("OWAWebDav.js: getMessageSizes : Exception : "
                                              + e.name
                                              + ".\nError message: "
                                              + e.message+ "\n"
                                              + e.lineNumber);

            mainObject.serverComms("-ERR negative vibes from " +mainObject.m_szUserName+ "\r\n");
            return false;
        }
    },


    processItem : function(timer)
    {
        try
        {
            this.m_Log.Write("OWAWebDav.js - notify - START");

            if (this.m_aRawData.length>0)
            {
                var iCount=0;
                do{
                    var Item = this.m_aRawData.shift();
                    this.m_Log.Write("OWAWebDav.js - processItem - item - "+ Item);

                    var bRead = true;
                    if (this.m_bDownloadUnread)
                    {
                        bRead = parseInt(Item.match(patternOWARead)[1]) ? false : true;
                        this.m_Log.Write("OWAWebDav.js - processItem - bRead -" + bRead);
                    }

                    if (bRead)
                    {
                        //mail url
                        var oMSG = new OWAMSG();
                        var szHref = Item.match(patternOWAHref)[1];
                        this.m_Log.Write("OWAWebDav.js - processItem - href - "+ szHref);
                        oMSG.szMSGUri = szHref;

                        //size
                        var iSize = parseInt(Item.match(patternOWASize)[1]);
                        this.m_Log.Write("OWAWebDav.js - processItem - size - "+ iSize);
                        this.m_iTotalSize += iSize;
                        oMSG.iSize = iSize;

                        var szTO="";
                        try
                        {
                            //szTO = Item.match(patternOWATo)[1].match(/[\S\d]*@[\S\d]*/);
                            szTO = Item.match(patternOWATo)[1];
                            this.m_Log.Write("OWAWebDav.js - processItem - to - "+ szTo);
                        }
                        catch(err)
                        {
                            szTO = this.m_szUserName;
                            this.m_Log.Write("OWAWebDav.js - processItem - to - <FAILED>" );
                        }
                        oMSG.szTo = szTO;


                        var szFrom = "";
                        try
                        {
                            //szFrom = Item.match(patternOWAFrom)[1].match(/[\S]*@[\S]*/);
                            szFrom = Item.match(patternOWAFrom)[1];
                            if (!szFrom) throw new Error("no sender");
                            this.m_Log.Write("OWAWebDav.js - processItem - from - " + szFrom );
                        }
                        catch(err)
                        {
                            var aFrom = Item.match(patternOWAFrom);
                            if (aFrom == null)
                            {
                                this.m_Log.Write("OWAWebDav.js - processItem - from - <FAILED>");
                                szFrom ="";
                            }
                            else
                            {
                                szFrom = Item.match(patternOWAFrom)[1];
                                this.m_Log.Write("OWAWebDav.js - processItem - from - " + szFrom );
                            }
                        }
                        oMSG.szFrom = szFrom;


                        var szSubject= "";
                        try
                        {
                            szSubject= Item.match(patternOWASubject)[1];
                            this.m_Log.Write("OWAWebDav.js - processItem - subject - " + szSubject );
                        }
                        catch(err){}
                        oMSG.szSubject = szSubject;

                        try
                        {
                            var aszDateTime = Item.match(patternOWADate);
                            var aszDate = aszDateTime[1].split("-");
                            var aszTime = aszDateTime[2].split(":");
                
                            var date = new Date(Date.UTC(parseInt(aszDate[0],10),  //year
                                             parseInt(aszDate[1],10)-1,  //month
                                             parseInt(aszDate[2],10),  //day
                                             parseInt(aszTime[0],10),  //hour
                                             parseInt(aszTime[1],10),  //minute
                                             parseInt(aszTime[2],10)));  //second
                            oMSG.szDate = date.toUTCString();
                            
                            this.m_Log.Write("OWAWebDav.js - processItem - " + oMSG.szDate);
                        }
                        catch(err){}

                        this.m_aMsgDataStore.push(oMSG);
                    }
                    iCount++;
                    this.m_Log.Write("OWAWebDav.js - notify - rawData icount " + iCount + " " + this.m_aRawData.length);
                }while(iCount != this.m_iProcessAmount && this.m_aRawData.length!=0)

            }
            else
            {
                this.m_Log.Write("OWAWebDav.js - notify - all data handled");
                timer.cancel();
                delete this.m_aRawData;
                this.m_aRawData = null;

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
                    callback.parent = mainObject;
                    this.m_iHandleCount = 0;
                    this.m_Timer.initWithCallback(callback,
                                                  this.m_iTime,
                                                  Components.interfaces.nsITimer.TYPE_REPEATING_SLACK);
                }


            }

            this.m_Log.Write("OWAWebDav.js - notify - END");
        }
        catch(err)
        {
            this.m_Timer.cancel();
            this.m_Log.DebugDump("OWAWebDav.js: notify : Exception : "
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
            this.m_Log.Write("OWAWebDav.js - getMessageSizes - START");

            if (this.m_bStat)
            {  //msg table has been donwloaded
                this.m_Log.Write("OWAWebDav.js - getMessageSizes - getting sizes");

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
                this.m_Log.Write("OWAWebDav.js - getMessageSizes - calling stat");
                this.m_Log.Write("OWAWebDav.js - getMessageSizes - mail box url " + this.m_aszFolderURLList);

                if (this.m_aszFolderURLList.length==0) return false;
                this.mailBox(false);
            }

            this.m_Log.Write("OWAWebDav.js - getMessageSizes - END");
            return true;
        }
        catch(e)
        {
            this.m_Log.DebugDump("OWAWebDav.js: getMessageSizes : Exception : "
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
            this.m_Log.Write("OWAWebDav.js - processSizes - START");

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

            this.m_Log.Write("OWAWebDav.js - processSizes - END");
        }
        catch(err)
        {
            this.m_Timer.cancel();
            this.m_Log.DebugDump("OWAWebDav.js: processSizes : Exception : "
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
            this.m_Log.Write("OWAWebDav.js - getMessageIDs - START");

            var callback = {
               notify: function(timer) { this.parent.processIDS(timer)}
            };
            callback.parent = this;
            this.m_iHandleCount = 0;
            this.m_Timer.initWithCallback(callback,
                                          this.m_iTime,
                                          Components.interfaces.nsITimer.TYPE_REPEATING_SLACK);

            this.m_Log.Write("OWAWebDav.js - getMessage - END");
            return true;
        }
        catch(e)
        {
             this.m_Log.DebugDump("OWAWebDav.js: getMessageIDs : Exception : "
                                          + e.name +
                                          ".\nError message: "
                                          + e.message+ "\n"
                                          + e.lineNumber);
            return false;
        }
    },





    processIDS : function(timer)
    {
        try
        {
            this.m_Log.Write("OWAWebDav.js - processIDS - START");

            //response start
            if (this.m_iHandleCount ==  0)
                this.serverComms("+OK " + this.m_aMsgDataStore.length + " Messages\r\n");


            if ( this.m_aMsgDataStore.length > 0)
            {
                var iCount = 0;
                do{
                    var szEmailID = this.m_aMsgDataStore[this.m_iHandleCount].szID;

                    var szURL = this.m_aMsgDataStore[this.m_iHandleCount].szMSGUri;
                    this.m_Log.Write("OWAWebDav.js - getMessageIDs - Email URL : " +szURL);

                    var szEmailID = szURL.match(patternOWAMSGID);
                    this.m_Log.Write("OWAWebDav.js - getMessageIDs - IDS : " +szEmailID);

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

            this.m_Log.Write("OWAWebDav.js - processIDS - END");
        }
        catch(err)
        {
            this.m_Timer.cancel();
            this.m_Log.DebugDump("OWAWebDav.js: processIDS : Exception : "
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
            this.m_Log.Write("OWAWebDav.js - getHeaders - START");
            this.m_Log.Write("OWAWebDav.js - getHeaders - id " + lID );

            var oMSG = this.m_aMsgDataStore[lID-1];

            var szHeaders = "X-WebMail: true\r\n";
            var szFolderURI = oMSG.szMSGUri.match(patternOWAFolderName)[1];
            this.m_Log.Write("OWAWebDav.js - getHeaders - get folder url - " + szFolderURI);

            var szCleanName = szFolderURI;
            if (szFolderURI.search(/active/i)!=-1) szCleanName = "Inbox"
            else if (szFolderURI.search(/BuLkMail/i)!=-1) szCleanName = "Spam";
            this.m_Log.Write("OWAWebDav.js - getHeaders - szCleanName - " + szCleanName);

            szHeaders += "X-JunkFolder: " +szCleanName+ "\r\n";
            szHeaders += "To: "+ oMSG.szTo +"\r\n";
            szHeaders += "From: "+ oMSG.szFrom +"\r\n";
            szHeaders += "Subject: "+ oMSG.szSubject +"\r\n";
            szHeaders += "Date: " + oMSG.szDate +"\r\n"; // \r\n";
            szHeaders = szHeaders.replace(/^\./mg,"..");    //bit padding
            szHeaders += "\r\n.\r\n";//msg end

            var  szResponse = "+OK " +szHeaders.length + "\r\n";
            szResponse += szHeaders
            this.serverComms(szResponse);

            this.m_Log.Write("OWAWebDav.js - getHeaders - END");
            return true;
        }
        catch(e)
        {
            this.m_Log.DebugDump("OWAWebDav.js: getHeaders : Exception : "
                                          + e.name +
                                          ".\nError message: "
                                          + e.message+ "\n"
                                          + e.lineNumber);
            return false;
        }
    },


    getMessage : function( lID)
    {
        try
        {
            this.m_Log.Write("OWAWebDav.js - getMessage - START");
            this.m_Log.Write("OWAWebDav.js - getMessage - msg num" + lID);
            this.m_iStage=0;

            //get msg id
            var oMSG = this.m_aMsgDataStore[lID-1];
            this.m_Log.Write("OWAWebDav.js - getMessage - msg url" + oMSG.szMSGUri);

            //get email
            //this.m_HttpComms.setURI(oMSG.szMSGUri);
            //this.m_HttpComms.setURI(oMSG.szMSGUri + "?Cmd=open");
            this.m_HttpComms.setURI(oMSG.szMSGUri + "?Cmd=body");
            this.m_HttpComms.addRequestHeader("Translate", "f", true);
            this.m_HttpComms.setRequestMethod("GET");
            var bResult = this.m_HttpComms.send(this.emailOnloadHandler, this);
            if (!bResult) throw new Error("httpConnection returned false");
            this.m_iStage=0;

            this.m_Log.Write("OWAWebDav.js - getMessage - END");
            return true;
        }
        catch(e)
        {
             this.m_Log.DebugDump("OWAWebDav.js: getMessage : Exception : "
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
            mainObject.m_Log.Write("OWAWebDav.js - emailOnloadHandler - START");
            mainObject.m_Log.Write("OWAWebDav.js - emailOnloadHandler : " + mainObject.m_iStage);

            var httpChannel = event.QueryInterface(Components.interfaces.nsIHttpChannel);
            mainObject.m_Log.Write("OWAWebDav - emailOnloadHandler - status :" +httpChannel.responseStatus );

            if ( (httpChannel.responseStatus != 200) && (httpChannel.responseStatus != 204) )
			{
                throw new Error("return status " + httpChannel.responseStatus);
			}

            switch(mainObject.m_iStage)
            {
                case 0:  //send msg to TB
                    //email
                    mainObject.m_szMSG = "X-WebMail: true\r\n";

                    var szUri = httpChannel.URI.spec;
                    mainObject.m_Log.Write("OWAWebDav.js - loginOnloadHandler - szUri - " + szUri);

                    //var szFolderName= szUri.match(patternOWAFolderName)[1];
                    var szFolderName= szUri.match(patternOWAFolderName)[1].match( /^([^\?]*)/ )[1];
                    mainObject.m_Log.Write("OWAWebDav.js - loginOnloadHandler - szFolderName - " + szFolderName);

                    var szCleanName = szFolderName;
                    if (szFolderName.search(/active/i)!=-1) szCleanName = "Inbox";
                    else if (szFolderName.search(/BuLkMail/i)!=-1) szCleanName = "Spam";
                    else if (szFolderName.search(/sAVeD/i)!=-1) szCleanName = "Sent Items";
                    mainObject.m_Log.Write("OWAWebDav.js - loginOnloadHandler - szCleanName - " + szCleanName);
                    mainObject.m_szMSG += "X-Folder: " +szCleanName+ "\r\n";

                    mainObject.m_szMSG +=szResponse;
                    mainObject.m_szMSG = mainObject.m_szMSG.replace(/^\./mg,"..");    //bit padding
                    mainObject.m_szMSG += "\r\n.\r\n";//msg end

                    if (mainObject.m_bMarkAsRead)
                    {
                        //mark email as read
                        mainObject.m_HttpComms.setContentType("text/xml");
                        mainObject.m_HttpComms.setURI(szUri);
                        mainObject.m_HttpComms.setRequestMethod("PROPPATCH");
                        mainObject.m_HttpComms.addData(OWAReadSchema);
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

                case 1:// mark msg as read
                    mainObject.m_Log.Write("OWAWebDav.js - emailOnloadHandler -email mark as read");
                    var szPOPResponse = "+OK " +mainObject.m_szMSG.length + "\r\n";
                    szPOPResponse += mainObject.m_szMSG;
                    mainObject.serverComms(szPOPResponse);
                break;
            }

            mainObject.m_Log.Write("OWAWebDav.js - emailOnloadHandler - end");
        }
        catch(err)
        {
            mainObject.m_Log.DebugDump("OWAWebDav.js: emailOnloadHandler : Exception : "
                                          + err.name
                                          + ".\nError message: "
                                          + err.message+ "\n"
                                          + err.lineNumber);

            mainObject.serverComms("-ERR negative vibes from " +mainObject.m_szUserName+ "\r\n");
        }
    },




    //dele
    deleteMessage : function(lID)
    {
        try
        {
            this.m_Log.Write("OWAWebDav.js - deleteMessage - START");
            this.m_Log.Write("OWAWebDav.js - deleteMessage - id " + lID );

            //create URL
            var szPath = this.m_aMsgDataStore[lID-1].szMSGUri;
            this.m_Log.Write("OWAWebDav.js - deleteMessage - id " + szPath );

            var szMsgID =  szPath.match(patternOWAMSGID);
            var szStart = "<?xml version=\"1.0\"?>\r\n<D:move xmlns:D=\"DAV:\">\r\n<D:target>\r\n";
            var szEnd = "</D:target>\r\n</D:move>";
            var szMsgID =  szPath.match(patternOWAMSGID);
            var sztemp ="<D:href>"+szMsgID+"</D:href>\r\n"
            var szData = szStart + sztemp + szEnd;


            this.m_iStage=0;
            this.m_HttpComms.setURI(szPath);
            this.m_HttpComms.setRequestMethod("MOVE");

            var szDestination= this.m_szTrashURI + szMsgID;
            this.m_Log.Write("OWAWebDav.js - deleteMessage - Destination " + szDestination );
            this.m_HttpComms.addRequestHeader("Destination", szDestination , false);
            var bResult = this.m_HttpComms.send(this.deleteMessageOnloadHandler, this);
            if (!bResult) throw new Error("httpConnection returned false");

            this.m_Log.Write("OWAWebDav.js - deleteMessage - END");
            return true;
        }
        catch(e)
        {
            this.m_Log.DebugDump("OWAWebDav.js: deleteMessage : Exception : "
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
            mainObject.m_Log.Write("OWAWebDav.js - deleteMessageOnload - START");
            mainObject.m_Log.Write("OWAWebDav.js - deleteMessageOnload : " + mainObject.m_iStage);

            var httpChannel = event.QueryInterface(Components.interfaces.nsIHttpChannel);
            mainObject.m_Log.Write("OWAWebDav - deleteMessageOnload - status :" +httpChannel.responseStatus );

            //if this fails we've gone somewhere new
            if (httpChannel.responseStatus != 201)
			{
				// JBL: Couldn't get this to work properly
                //throw new Error("return status " + httpChannel.responseStatus);
			}

            mainObject.serverComms("+OK its gone\r\n");

            mainObject.m_Log.Write("OWAWebDav.js - deleteMessageOnload - END");
        }
        catch(e)
        {
            mainObject.m_Log.DebugDump("OWAWebDav.js: deleteMessageOnload : Exception : "
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
            this.m_Log.Write("OWAWebDav.js - logOUT - START");

            if (!this.m_bReUseSession)
            {
                var oCookies = Components.classes["@mozilla.org/nsWebMailCookieManager2;1"]
                                         .getService(Components.interfaces.nsIWebMailCookieManager2);
                oCookies.removeCookie(this.m_szUserName);

                var oAuth = Components.classes["@mozilla.org/HttpAuthManager2;1"]
                                      .getService(Components.interfaces.nsIHttpAuthManager2);
                oAuth.removeToken(this.m_szUserName);
            }

            this.m_bAuthorised = false;
            this.serverComms("+OK Your Out\r\n");

            this.m_Timer.cancel();
            delete this.m_aMsgDataStore;
            delete this.m_aszFolderURLList;
            delete this.m_aszFolders;

            this.m_Log.Write("OWAWebDav.js - logOUT - END");
            return true;
        }
        catch(e)
        {
            this.m_Log.DebugDump("OWAWebDav.js: logOUT : Exception : "
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
            this.m_Log.Write("OWAWebDav.js - serverComms - START");
            this.m_Log.Write("OWAWebDav.js - serverComms msg " + szMsg);
            var iCount = this.m_oResponseStream.write(szMsg,szMsg.length);
            this.m_Log.Write("OWAWebDav.js - serverComms sent count: " + iCount
                                                        +" msg length: " +szMsg.length);
            this.m_Log.Write("OWAWebDav.js - serverComms - END");
        }
        catch(e)
        {
            this.m_Log.DebugDump("OWAWebDav.js: serverComms : Exception : "
                                              + e.name
                                              + ".\nError message: "
                                              + e.message+ "\n"
                                              + e.lineNumber);
        }
    }
}
