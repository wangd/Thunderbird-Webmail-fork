/*****************************  Globals   *************************************/
const nsOWAClassID = Components.ID("{112ebca0-0109-11da-8cd6-0800200c9a66}");
const nsOWAContactID = "@mozilla.org/POPOWA;1";
const ExtOWAGuid = "{3d82b2c0-0109-11da-8cd6-0800200c9a66}";


/******************************  OWA ***************************************/




function nsOWA()
{
    try
    {
        var scriptLoader =  Components.classes["@mozilla.org/moz/jssubscript-loader;1"]
        scriptLoader = scriptLoader.getService(Components.interfaces.mozIJSSubScriptLoader);
        scriptLoader.loadSubScript("chrome://web-mail/content/common/DebugLog.js");
        scriptLoader.loadSubScript("chrome://web-mail/content/common/CommonPrefs.js");
        scriptLoader.loadSubScript("chrome://web-mail/content/common/HttpComms3.js");
        scriptLoader.loadSubScript("chrome://owa/content/OWA-MSG.js");


        var date = new Date();
        var  szLogFileName = "OWA Log - " + date.getHours()+ "-" + date.getMinutes() + "-"+ date.getUTCMilliseconds() +" -";
        this.m_Log = new DebugLog("webmail.logging.comms", ExtOWAGuid, szLogFileName);

        this.m_Log.Write("nsOWA.js - Constructor - START");

        if (typeof kOWAConstants == "undefined")
        {
            this.m_Log.Write("nsPOPOWA.js - Constructor - loading constants");
            scriptLoader.loadSubScript("chrome://owa/content/OWA-Constants.js");
        }

        this.m_DomainManager =  Components.classes["@mozilla.org/OWADomains;1"]
                                          .getService()
                                          .QueryInterface(Components.interfaces.nsIOWADomains);       
        this.m_bAuthorised = false;
        this.m_szUserName = null;
        this.m_szPassWord = null;
        this.m_oResponseStream = null;
        this.m_HttpComms = new HttpComms(this.m_Log);
        this.m_iStage = 0;
        this.m_szBaseURL = null;
        this.m_szMailBox = null;
        this.m_aMsgDataStore = new Array();
        this.m_iHandleCount = 0; 
        this.m_iProcessAmount = 25;
        this.m_iCurrentPage = 0;
        this.m_iNumPages = -1;
        this.m_Timer = Components.classes["@mozilla.org/timer;1"]
                                 .createInstance(Components.interfaces.nsITimer);
        this.m_aRawData =new Array();
         
        this.m_Log.Write("nsOWA.js - Constructor - END");
    }
    catch(e)
    {
        DebugDump("nsOWA.js: Constructor : Exception : "
                                      + e.name
                                      + ".\nError message: "
                                      + e.message);
    }
}



nsOWA.prototype =
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
            this.m_Log.Write("nsOWA.js - logIN - START");
            this.m_Log.Write("nsOWA.js - logIN - Username: " + this.m_szUserName
                                                   + " Password: " + this.m_szPassWord
                                                   + " stream: " + this.m_oResponseStream);

            if (!this.m_szUserName || !this.m_oResponseStream  || !this.m_szPassWord) return false;

            var szDomain = this.m_szUserName.match(/.*?@(.*?)$/)[1].toLowerCase();
            var szURL = this.m_DomainManager.getURL(szDomain);
            this.m_HttpComms.setURI(szURL);
            this.m_HttpComms.setRequestMethod("GET");
            var bResult = this.m_HttpComms.send(this.loginOnloadHandler, this);
            if (!bResult) throw new Error("httpConnection returned false");

            this.m_iStage = 0;
            
            this.m_Log.Write("nsOWA.js - logIN - END");
            return true;
        }
        catch(e)
        {
            this.m_Log.DebugDump("nsOWA.js: logIN : Exception : "
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
            mainObject.m_Log.Write("nsOWA.js - loginOnloadHandler - START");

            var httpChannel = event.QueryInterface(Components.interfaces.nsIHttpChannel);
            mainObject.m_Log.Write("nsOWA.js - loginOnloadHandler - status :" +httpChannel.responseStatus );

            if (httpChannel.responseStatus != 200)
                throw new Error("return status " + httpChannel.responseStatus);
           
            switch(mainObject.m_iStage)
            {
                case 0: //login form
                    var szAction = szResponse.match(kOWAAction)[1];            
                    mainObject.m_Log.Write("nsOWA - loginOnloadHandler - szAction :" +szAction);
                    var szURL = httpChannel.URI.prePath + szAction
                    mainObject.m_Log.Write("nsOWA - loginOnloadHandler - szURL :" +szURL);
        
                    var szForm = szResponse.match(kOWAForm)[1];
                    mainObject.m_Log.Write("nsOWA - loginOnloadHandler - szForm :" +szForm);
                    
                    var aszInput = szForm.match(kOWAInput);
                    
                    for (var i =0 ; i<aszInput.length; i++)
                    {
                        mainObject.m_Log.Write("nsOWA - loginOnloadHandler - aszInput :" +aszInput[i]);
                        
                        if (aszInput[i].search(/submit/i)==-1 && aszInput[i].search(/radio/i) == -1 && aszInput[i].search(/check/i) == -1)
                        { 
                            var szName = aszInput[i].match(kOWAName)[1];
                            
                            var szValue = "";
                            if (aszInput[i].search(/value/i)!=-1) szValue = aszInput[i].match(kOWAValue)[1];
                            
                            if (szName.search(/username/i) != -1) 
                            {
                                szValue = mainObject.m_szUserName.match(/(.*?)@/)[1].toLowerCase();
                                szValue = encodeURIComponent(szValue);
                            }
                            else if (szName.search(/password/i) != -1) 
                            {
                                szValue = mainObject.m_szPassWord;
                                szValue = encodeURIComponent(szValue);
                            }
                            
                            mainObject.m_HttpComms.addValuePair(szName,szValue);
                        }                
                    }
                    
                    mainObject.m_HttpComms.addValuePair("rdoPublic",0);
                    
                    mainObject.m_HttpComms.setURI(szURL);
                    mainObject.m_HttpComms.setRequestMethod("POST");
                    mainObject.m_iStage ++;
                    var bResult = mainObject.m_HttpComms.send(mainObject.loginOnloadHandler, mainObject);
                    if (!bResult) throw new Error("httpConnection returned false");
                break;
                
                
                case 1: //get base URL
                    mainObject.m_szBaseURL = szResponse.match(kBaseURL)[1];            
                    mainObject.m_Log.Write("nsOWA - loginOnloadHandler - m_szBaseURL :" +mainObject.m_szBaseURL);
                    
                    var szMailBox = szResponse.match(kMailBoxURL)[1];  
                    mainObject.m_szMailBox = mainObject.m_szBaseURL + szMailBox + "&SortBy=Received&SortOrder=ascending&Page=1";         
                    mainObject.m_Log.Write("nsOWA - loginOnloadHandler - m_szMailBox :" +mainObject.m_szMailBox);

                    //server response
                    mainObject.serverComms("+OK Your in\r\n");
                    mainObject.m_bAuthorised = true;
                break;
            }
            
            
            mainObject.m_Log.Write("nsOWA.js - loginOnloadHandler - END");
        }
        catch(err)
        {
            mainObject.m_Log.DebugDump("nsOWA.js: loginHandler : Exception : "
                                          + err.name
                                          + ".\nError message: "
                                          + err.message);

            mainObject.serverComms("-ERR negative vibes from "+ mainObject.m_szUserName +"\r\n");
        }
    },




    //stat
    //total size is in octets
    getNumMessages : function()
    {
        try
        {
            this.m_Log.Write("nsOWA.js - getNumMessages - START");

            if (!this.m_szMailBox) return false;
            
            this.m_iStage=0;
            this.m_HttpComms.setURI(this.m_szMailBox);
            this.m_HttpComms.setRequestMethod("GET");
            var bResult = this.m_HttpComms.send(this.mailBoxOnloadHandler, this);
            if (!bResult) throw new Error("httpConnection returned false");
            this.m_iCurrentPage = 1;
            
            this.m_Log.Write("nsOWA.js - getNumMessages - END");
            return true;
        }
        catch(e)
        {
            this.m_Log.DebugDump("nsOWA.js: getNumMessages : Exception : "
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
            mainObject.m_Log.Write("nsOWA.js - mailBoxOnloadHandler - START "  + mainObject.m_iStage);
            var httpChannel = event.QueryInterface(Components.interfaces.nsIHttpChannel);
            mainObject.m_Log.Write("nsMailDotCom.js - mailBoxOnloadHandler - Mailbox :" + httpChannel.responseStatus);

            //check status should be 200.
            if (httpChannel.responseStatus != 200)
                throw new Error("error status " + httpChannel.responseStatus);

            //process mail box
            var aszRawData = szResponse.match(kMSGData);
            if (aszRawData) 
            {
                if (aszRawData.length > 0) 
                {
                    var aTemp = mainObject.m_aRawData.concat(aszRawData);
                    delete mainObject.m_aRawData;
                    mainObject.m_aRawData = aTemp;
                }
            }
            
            //check for more pages
            if (mainObject.m_iNumPages == -1)  //get max page number
            {
                var szPageNum = szResponse.match(kOWAPageNum)[1];  
                mainObject.m_Log.Write("nsOWA.js - MailBoxOnload - szPageNum " + szPageNum); 
                mainObject.m_iNumPages = parseInt(szPageNum);
                mainObject.m_Log.Write("nsOWA.js - MailBoxOnload - m_iNumPages" + mainObject.m_iNumPages);
            }
            
            if (mainObject.m_iNumPages > mainObject.m_iCurrentPage) 
            {
                mainObject.m_Log.Write("nsOWA.js - MailBoxOnload - Another Page " +  mainObject.m_iCurrentPage);
                mainObject.m_iCurrentPage++;
                var szPageUrl = szResponse.match(KNextPage)[1];
                szPageUrl = szPageUrl + "&SortBy=Received&SortOrder=ascending";
                mainObject.m_Log.Write("nsOWA.js - MailBoxOnload - szPageUrl " + szPageUrl);                
                mainObject.m_HttpComms.setURI(szPageUrl);
                mainObject.m_HttpComms.setRequestMethod("GET");
                var bResult = mainObject.m_HttpComms.send(mainObject.mailBoxOnloadHandler, mainObject);
                if (!bResult) throw new Error("httpConnection returned false");
            }
            else  //done 
            {
                mainObject.m_Log.Write("nsOWA.js - mailBoxOnloadHandler - download complete - starting delay");
                //start timer
                var callback = {
                    notify: function(timer) { this.parent.processItem(timer)}
                 };
                callback.parent = mainObject;

                mainObject.m_Timer.initWithCallback(callback,
                                                    mainObject.m_iTime,
                                                    Components.interfaces.nsITimer.TYPE_REPEATING_SLACK);
            }
            
            mainObject.m_Log.Write("nsOWA.js - MailBoxOnload - END");
        }
        catch(err)
        {
             mainObject.m_Log.DebugDump("nsOWA.js: MailboxOnload : Exception : "
                                              + err.name
                                              + ".\nError message: "
                                              + err.message + "\n"
                                              + err.lineNumber);

            mainObject.serverComms("-ERR negative vibes from "+ mainObject.m_szUserName +"\r\n");
        }
    },



    processItem : function(timer)
    {
        try
        {
            this.m_Log.Write("nsOWA.js - notify - START");

            if (this.m_aRawData.length>0)
            {
                var iCount=0;
                do{
                    var Item = this.m_aRawData.shift();
                    this.m_Log.Write("nsOWA.js - loginOnloadHandler - Item " +Item);
                    
                    //email url 
                    var data = new OWAMSG();
                    
                    data.szMSGUri = Item.match(kOWAMSGURL)[1];
                    this.m_Log.Write("nsOWA.js - loginOnloadHandler - szMSGUri " + data.szMSGUri);
                    
                    data.szID = Item.match(kOWAMSGID)[1];
                    this.m_Log.Write("nsOWA.js - loginOnloadHandler - szMSGID " + data.szID);
                    
                    try
                    {
                        data.iSize = Item.match(kOWAMSGSize)[1];
                    }
                    catch(e)
                    {
                    }
                    
                    if (Item.match(KMSGSize)[2].search(/k/i) !=-1) data.iSize *= 1000;
                    if (Item.match(KMSGSize)[2].search(/g/i) !=-1) data.iSize *= 1000000;
                    this.m_Log.Write("nsOWA.js - loginOnloadHandler - iSize " + data.iSize);
                    this.m_iTotalSize +=  parseInt(data.iSize);
                    
                    this.m_aMsgDataStore.push(data);
                   
                    iCount++;
                    this.m_Log.Write("nsOWA.js - notify - rawData icount " + iCount + " " + this.m_aRawData.length);
                }while(iCount != this.m_iProcessAmount && this.m_aRawData.length!=0);
            }
            else
            {
                this.m_Log.Write("nsOWA.js - notify - all data handled");
                timer.cancel();
                delete this.m_aRawData;
                this.m_aRawData = null;

                this.serverComms("+OK " + this.m_aMsgDataStore.length + " " + this.m_iTotalSize + "\r\n");
            }

            this.m_Log.Write("nsOWA.js - notify - END");
        }
        catch(err)
        {
            this.m_Timer.cancel();
            this.m_Log.DebugDump("nsOWA.js: notify : Exception : "
                                              + err.name
                                              + ".\nError message: "
                                              + err.message+ "\n"
                                              + err.lineNumber);

            this.serverComms("-ERR negative vibes from " +this.m_szUserName+ "\r\n");
        }
    },






    //list
    //i'm not downloading the mailbox again.
    //I hope stat been called first or there's going to be trouble
    getMessageSizes : function()
    {
        try
        {
            this.m_Log.Write("nsOWA.js - getMessageSizes - START");

            var callback = {
                   notify: function(timer) { this.parent.processSizes(timer)}
            };
            callback.parent = this;
            this.m_iHandleCount = 0;
            this.m_Timer.initWithCallback(callback,
                                          this.m_iTime,
                                          Components.interfaces.nsITimer.TYPE_REPEATING_SLACK);

            this.m_Log.Write("nsOWA.js - getMessageSizes - END");
            return true;
        }
        catch(e)
        {
            this.m_Log.DebugDump("nsOWA.js: getMessageSizes : Exception : "
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
            this.m_Log.Write("nsOWA.js - processSizes - START");

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

            this.m_Log.Write("nsOWA.js - processSizes - END");
        }
        catch(err)
        {
            this.m_Timer.cancel();
            this.m_Log.DebugDump("nsOWA.js: processSizes : Exception : "
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
            this.m_Log.Write("nsOWA.js - getMessageIDs - START");

            var callback = {
               notify: function(timer) { this.parent.processIDS(timer)}
            };
            callback.parent = this;
            this.m_iHandleCount = 0;
            this.m_Timer.initWithCallback(callback,
                                          this.m_iTime,
                                          Components.interfaces.nsITimer.TYPE_REPEATING_SLACK);

            this.m_Log.Write("nsOWA.js - getMessageIDs - END");
            return true;
        }
        catch(e)
        {
            this.m_Log.DebugDump("nsOWA.js: getMessageIDs : Exception : "
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
            this.m_Log.Write("nsOWA.js - processIDS - START");

            //response start
            if (this.m_iHandleCount ==  0)
                this.serverComms("+OK " + this.m_aMsgDataStore.length + " Messages\r\n");


            if ( this.m_aMsgDataStore.length > 0)
            {
                var iCount = 0;
                do{
                     var szEmailID = this.m_aMsgDataStore[this.m_iHandleCount].szID;
                     this.m_Log.Write("nsOWA.js - getMessageIDs - Email URL : " +szEmailID);

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

            this.m_Log.Write("nsOWA.js - processIDS - END");
        }
        catch(err)
        {
            this.m_Timer.cancel();
            this.m_Log.DebugDump("nsOWA.js: processIDS : Exception : "
                                              + err.name
                                              + ".\nError message: "
                                              + err.message+ "\n"
                                              + err.lineNumber);

            this.serverComms("-ERR negative vibes from " +this.m_szUserName+ "\r\n");
        }
    },




    //retr
    getMessage : function( lID)
    {
        try
        {
            this.m_Log.Write("nsOWA.js - getMessage - START");
            this.m_Log.Write("nsOWA.js - getMessage - msg num" + lID);
     
            var szURL = this.m_aMsgDataStore[lID-1].szMSGUri;
            this.m_Log.Write("nsOWA.js - getMessage - szURL " + szURL);
            
            if (!this.m_HttpComms.setURI(szURL))
                this.m_HttpComms.setURI(this.m_szBaseURL + szURL)
                          
            this.m_HttpComms.addRequestHeader("Translate","f",true);
            this.m_HttpComms.setRequestMethod("GET");
            var bResult = this.m_HttpComms.send(this.emailOnloadHandler, this);
            if (!bResult) throw new Error("httpConnection returned false");

            this.m_Log.Write("nsOWA.js - getMessage - END");
            return true;
        }
        catch(e)
        {
             this.m_Log.DebugDump("nsOWA.js: getMessage : Exception : "
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
            mainObject.m_Log.Write("nsOWA.js - emailOnloadHandler - START");
            var httpChannel = event.QueryInterface(Components.interfaces.nsIHttpChannel);
            mainObject.m_Log.Write("nsOWA.js - emailOnloadHandler - msg :" + httpChannel.responseStatus);
            if (httpChannel.responseStatus != 200)
                throw new Error("error status " + httpChannel.responseStatus);

            var szMSG = "X-WebMail: true\r\n";
            szMSG += szResponse;
            szMSG = szMSG.replace(/^\./mg,"..");    //bit padding
            szMSG += "\r\n.\r\n";  //msg end
                
            var szPOPResponse = "+OK " + szMSG.length + "\r\n";
            szPOPResponse += szMSG
            mainObject.serverComms(szPOPResponse);
              
            mainObject.m_Log.Write("nsOWA.js - emailOnloadHandler - END");
        }
        catch(err)
        {
            mainObject.m_Log.DebugDump("nsOWA.js: emailOnloadHandler : Exception : "
                                          + err.name
                                          + ".\nError message: "
                                          + err.message);

            mainObject.serverComms("-ERR negative vibes from " +mainObject.m_szUserName+ "\r\n");
        }
    },




    //dele
    deleteMessage : function(lID)
    {
        try
        {
            this.m_Log.Write("nsOWA.js - deleteMessage - START");
            this.m_Log.Write("nsOWA.js - deleteMessage - id " + lID );

            var szURL = this.m_szBaseURL; 
            this.m_Log.Write("nsOWA.js - deleteMessage - url - "+ szURL);

            this.m_HttpComms.addValuePair("cmd", "delete");
            var szID = this.m_aMsgDataStore[lID-1].szID.replace(/\\/,"");
            this.m_HttpComms.addValuePair("msgId", szID);
            
            //send request
            this.m_HttpComms.setURI(szURL);
            this.m_HttpComms.setRequestMethod("POST");
            var bResult = this.m_HttpComms.send(this.deleteMessageOnloadHandler, this);

            this.m_Log.Write("nsOWA.js - deleteMessage - END");
            return true;
        }
        catch(e)
        {
            this.m_Log.DebugDump("nsOWA.js: deleteMessage : Exception : "
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
            mainObject.m_Log.Write("nsOWA.js - deleteMessageOnload - START");
            
            var httpChannel = event.QueryInterface(Components.interfaces.nsIHttpChannel);
            if (httpChannel.responseStatus != 200 )
                throw new Error("error status " + httpChannel.responseStatus);

            mainObject.serverComms("+OK its history\r\n");
            mainObject.m_Log.Write("nsOWA.js - deleteMessageOnload - END");
        }
        catch(e)
        {
            mainObject.m_Log.DebugDump("nsOWA.js: deleteMessageOnload : Exception : "
                                              + e.name
                                              + ".\nError message: "
                                              + e.message);
            mainObject.serverComms("-ERR negative vibes\r\n");
        }
    },



    //cookies are deleted when the connection ends so i dont need to download pages
    logOut : function()
    {
        try
        {
            this.m_Log.Write("nsOWA.js - logOUT - START");

            this.m_bAuthorised = false;
            this.serverComms("+OK Your Out\r\n");

            this.m_Log.Write("nsOWA.js - logOUT - END");
            return true;
        }
        catch(e)
        {
            this.m_Log.DebugDump("nsOWA.js: logOUT : Exception : "
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
            this.m_Log.Write("nsOWA.js - serverComms - START");
            this.m_Log.Write("nsOWA.js - serverComms msg " + szMsg);
            var iCount = this.m_oResponseStream.write(szMsg,szMsg.length);
            this.m_Log.Write("nsOWA.js - serverComms sent count: " + iCount
                                                        +" msg length: " +szMsg.length);
            this.m_Log.Write("nsOWA.js - serverComms - END");
        }
        catch(e)
        {
            this.m_Log.DebugDump("nsOWA.js: serverComms : Exception : "
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
var nsOWAFactory = new Object();

nsOWAFactory.createInstance = function (outer, iid)
{
    if (outer != null) throw Components.results.NS_ERROR_NO_AGGREGATION;

    if (!iid.equals(nsOWAClassID) && !iid.equals(Components.interfaces.nsISupports))
        throw Components.results.NS_ERROR_INVALID_ARG;

    return new nsOWA();
}


/******************************************************************************/
/* MODULE */
var nsOWAModule = new Object();

nsOWAModule.registerSelf = function(compMgr, fileSpec, location, type)
{
    compMgr = compMgr.QueryInterface(Components.interfaces.nsIComponentRegistrar);
    compMgr.registerFactoryLocation(nsOWAClassID,
                                    "OWAComponent",
                                    nsOWAContactID,
                                    fileSpec,
                                    location,
                                    type);
}


nsOWAModule.unregisterSelf = function(aCompMgr, aFileSpec, aLocation)
{
    aCompMgr = aCompMgr.QueryInterface(Components.interfaces.nsIComponentRegistrar);
    aCompMgr.unregisterFactoryLocation(nsOWAClassID, aFileSpec);
}


nsOWAModule.getClassObject = function(compMgr, cid, iid)
{
    if (!cid.equals(nsOWAClassID))
        throw Components.results.NS_ERROR_NO_INTERFACE;

    if (!iid.equals(Components.interfaces.nsIFactory))
        throw Components.results.NS_ERROR_NOT_IMPLEMENTED;

    return nsOWAFactory;
}


nsOWAModule.canUnload = function(compMgr)
{
    return true;
}
/******************************************************************************/


function NSGetModule(compMgr, fileSpec)
{
    return nsOWAModule;
}
