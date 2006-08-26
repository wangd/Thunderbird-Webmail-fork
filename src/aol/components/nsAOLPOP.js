/*****************************  Globals   *************************************/                 
const nsAOLClassID = Components.ID("{e977c180-9103-11da-a72b-0800200c9a66}"); 
const nsAOLContactID = "@mozilla.org/AOLPOP;1";


/***********************  AOL ********************************/
function nsAOL()
{
    try
    {       
        var scriptLoader =  Components.classes["@mozilla.org/moz/jssubscript-loader;1"];
        scriptLoader = scriptLoader.getService(Components.interfaces.mozIJSSubScriptLoader);
        scriptLoader.loadSubScript("chrome://web-mail/content/common/DebugLog.js");
        scriptLoader.loadSubScript("chrome://web-mail/content/common/HttpComms2.js");
        scriptLoader.loadSubScript("chrome://web-mail/content/common/CommonPrefs.js");
        scriptLoader.loadSubScript("chrome://aol/content/AOL-MSG.js");
        scriptLoader.loadSubScript("chrome://aol/content/AOL-Prefs-Data.js");
        
        var date = new Date();
        var  szLogFileName = "AOL Log - " + date.getHours()+ "-" + date.getMinutes() + "-"+ date.getUTCMilliseconds() +" -";
        this.m_Log = new DebugLog("webmail.logging.comms", 
                                  "{3c8e8390-2cf6-11d9-9669-0800200c9a66}" ,
                                  szLogFileName); 
        this.m_Log.Write("nsAOL.js - Constructor - START");   
       
         
        if (typeof kAOLConstants == "undefined")
        {
            this.m_Log.Write("nsLycos.js - Constructor - loading constants");
            scriptLoader.loadSubScript("chrome://aol/content/AOL-Constants.js");
        }            

        this.m_szUserName = null;   
        this.m_szPassWord = null; 
        this.m_oResponseStream = null;
  
        this.m_HttpComms = new HttpComms(this.m_Log); 
        this.m_bAuthorised = false; 
        this.m_iStage=0; 
        
        this.m_SuccessPath = null;
        this.m_szHostURL = null;
        this.m_szHomeURI = null;
        this.m_szUserId = null;
        this.m_szVersion = null;
        this.m_szLocation = null;
        this.m_bReEntry = false;
        this.m_szAOLMail = null;
        this.m_iPageNum = -1;
        this.m_iCurrentPage = 1;
        this.m_szFolder  = null;
        this.m_aMsgDataStore = new Array();
        this.m_iTotalSize = 0;
        this.m_szMSG = null;
        this.iID = -1;
        this.m_aszFolderURLList = new Array();
        this.m_SessionManager = Components.classes["@mozilla.org/SessionManager;1"]
                                          .getService(Components.interfaces.nsISessionManager);
        this.m_SessionData = null;  
        
        this.m_bStat = false;
         
        this.m_Log.Write("nsAOL.js - Constructor - END");  
    }
    catch(e)
    {
        DebugDump("nsAOL.js: Constructor : Exception : " 
                                      + e.name 
                                      + ".\nError message: " 
                                      + e.message+ "\n"
                                      + e.lineNumber);
    }
}



nsAOL.prototype =
{
    get userName() {return this.m_szUserName;},
    set userName(userName) {return this.m_szUserName = userName;},
    
    get passWord() {return this.m_szPassWord;},
    set passWord(passWord) {return this.m_szPassWord = passWord;},
    
    get bAuthorised()    
    {
        return this.m_bAuthorised;
    },
  
    get ResponseStream() {return this.m_oResponseStream;},
    set ResponseStream(responseStream) {return this.m_oResponseStream = responseStream;},
    
       
    logIn : function()
    {
        try
        {
            this.m_Log.Write("nsAOL.js - logIN - START");   
            this.m_Log.Write("nsAOL.js - logIN - Username: " + this.m_szUserName 
                                                   + " Password: "  + this.m_szPassWord 
                                                   + " stream: "    + this.m_oResponseStream);
            
            if (!this.m_szUserName || !this.m_oResponseStream || !this.m_szPassWord) return false;
            
            var szTempUserName = this.m_szUserName.split("@");
            this.m_Log.Write("nsAOL.js - logIN - doamain " + szTempUserName); 
            var szDomain = szTempUserName[1];
        
            this.m_prefData = this.loadPrefs();   //get prefs
            
            this.m_szAOLMail= "http://webmail.aol.com";  
            this.m_iStage = 0;
            this.m_HttpComms.setURI(this.m_szAOLMail);
            this.m_HttpComms.setRequestMethod("GET");

            //get session data
            if (this.m_prefData.bReUseSession)
            { 
                this.m_SessionData = this.m_SessionManager.findSessionData(this.m_szUserName.toLowerCase());
                if (this.m_SessionData && this.m_prefData.bReUseSession)
                {
                    this.m_Log.Write("nsAOL.js - logIN - Session Data found");
                    
                    this.m_HttpComms.setCookieManager(this.m_SessionData.oCookieManager);
                    this.m_szHomeURI = this.m_SessionData.oComponentData.findElement("szHomeURI");
                    this.m_Log.Write("AOLPOP.js - logIN - m_szHomeURI " +this.m_szHomeURI);
                    this.m_szUserId = this.m_SessionData.oComponentData.findElement("szUserId");
                    this.m_Log.Write("AOLPOP.js - logIN - m_szUserId " +this.m_szUserId);   
                    this.m_szVersion = this.m_SessionData.oComponentData.findElement("szVersion");
                    this.m_Log.Write("AOLPOP.js - logIN - m_szVersion " +this.m_szVersion);      
                    this.m_SuccessPath = this.m_SessionData.oComponentData.findElement("szSuccessPath");
                    this.m_Log.Write("AOLPOP.js - logIN - .m_SuccessPath " +this.m_SuccessPath); 
                    this.m_szHostURL = this.m_SessionData.oComponentData.findElement("szHostURL");
                    this.m_Log.Write("AOLPOP.js - logIN - .m_szHostURL" +this.m_szHostURL); 
                    this.m_szLocation = this.m_SessionData.oComponentData.findElement("szLocation");
                    this.m_Log.Write("AOLPOP.js - logIN - .m_szLocation" +this.m_szLocation);
                
                    if (this.m_szHomeURI) //get home page
                    {
                        this.m_iStage =6;
                        this.m_bReEntry = true;
                        this.m_HttpComms.setURI(this.m_szHomeURI);
                    }
                }
            }   
        
            var bResult = this.m_HttpComms.send(this.loginOnloadHandler, this);                             
            if (!bResult) throw new Error("httpConnection returned false");        
                          
            this.m_Log.Write("AOLPOP.js - logIN - END " + bResult);    
               
            return true;
        }
        catch(e)
        {
            this.m_Log.DebugDump("nsAOL.js: logIN : Exception : " 
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
            mainObject.m_Log.Write("AOLPOP.js - loginOnloadHandler - START"); 
            //mainObject.m_Log.Write("AOLPOP.js - loginOnloadHandler : \n" + szResponse);
            mainObject.m_Log.Write("AOLPOP.js - loginOnloadHandler : " + mainObject.m_iStage);  
            
            var httpChannel = event.QueryInterface(Components.interfaces.nsIHttpChannel);
            
            //if this fails we've gone somewhere new
            mainObject.m_Log.Write("AOLPOP.js - loginOnloadHandler - status :" +httpChannel.responseStatus );
            if (httpChannel.responseStatus != 200)
            { 
                if (mainObject.m_iStage!=5)
                    throw new Error("return status " + httpChannel.responseStatus);
            }
            
             //page code                                
            switch (mainObject.m_iStage)
            {         
                case 0:  //javascript bounce
                    var szLoginReplaceURL = szResponse.match(patternAOLReplace)[1];
                    mainObject.m_Log.Write("AOLPOP.js - loginOnloadHandler - replace " + szLoginReplaceURL);
                    if (szLoginReplaceURL == null)
                         throw new Error("error parsing AOL login web page");

                    mainObject.m_HttpComms.setURI(szLoginReplaceURL);
                    mainObject.m_HttpComms.setRequestMethod("GET");
                    var bResult = mainObject.m_HttpComms.send(mainObject.loginOnloadHandler, mainObject);      
                    if (!bResult) throw new Error("httpConnection returned false");
                    mainObject.m_iStage++;
                break;
                 
                case 1://get login page
                    var szSiteDomain =  szResponse.match(patternAOLSitedomain)[1];
                    mainObject.m_Log.Write("AOLPOP.js - loginOnloadHandler - szSiteDomain " + szSiteDomain);
                    var szSiteState =  szResponse.match(patternAOLSiteState)[1];
                    mainObject.m_Log.Write("AOLPOP.js - loginOnloadHandler - szSiteState " + szSiteState);
                    var szSeamless =  szResponse.match(patternAOLSeamless)[1];
                    mainObject.m_Log.Write("AOLPOP.js - loginOnloadHandler - szSeamless " + szSeamless);
 
                    var szURL = "https://my.screenname.aol.com/_cqr/login/login.psp?";
                    szURL += "mcState=initialized&";
                    szURL += "sitedomain=" + szSiteDomain + "&";
                    szURL += "siteState=" + szSiteState + "&";
                    szURL += "seamless=" + szSeamless;
                    mainObject.m_Log.Write("AOLPOP.js - loginOnloadHandler - szURL " + szURL);
                                             
                    mainObject.m_HttpComms.setURI(szURL);
                    mainObject.m_HttpComms.setRequestMethod("GET");
                    var bResult = mainObject.m_HttpComms.send(mainObject.loginOnloadHandler, mainObject);      
                    if (!bResult) throw new Error("httpConnection returned false");
                    mainObject.m_iStage++;
                break;      
                
                
                case 2: //login page
                    var szLoginForm = szResponse.match(patternAOLLoginForm);
                    mainObject.m_Log.Write("AOLPOP.js - loginOnloadHandler - szLoginForm " + szLoginForm);
                    if (szLoginForm == null)
                        throw new Error("error parsing AOL login web page");
                         
                    var aLoginData = szLoginForm[0].match(patternAOLInput);
                    mainObject.m_Log.Write("AOLPOP.js - loginOnloadHandler - aLoginData " + aLoginData);
                    
                    for (i=0; i<aLoginData.length; i++)
                    {
                        if (aLoginData[i].search(/type="hidden"/i)!=-1)
                        {
                            var szName=aLoginData[i].match(patternAOLName)[1];
                            mainObject.m_Log.Write("AOLPOP.js - loginOnloadHandler - loginData name " + szName);
                            
                            var szValue = aLoginData[i].match(patternAOLValue)[1];
                            mainObject.m_Log.Write("AOLPOP.js - loginOnloadHandler - loginData value " + szValue);
                        
                            mainObject.m_HttpComms.addValuePair(szName,(szValue? encodeURIComponent(szValue):""));
                         }
                    }
                    
                    var szScreenName = mainObject.m_szUserName.split("@")[0];
                    var szLogin = encodeURIComponent(szScreenName);
                    mainObject.m_HttpComms.addValuePair("loginId",szLogin);
                    
                    var szPass = encodeURIComponent(mainObject.m_szPassWord);
                    mainObject.m_HttpComms.addValuePair("password",szPass);
                    
                    var szAction = szLoginForm[0].match(patternAOLAction)[1];
                    var szLoginURL = httpChannel.URI.prePath + szAction;
                    mainObject.m_Log.Write("AOLPOP.js - loginOnloadHandler - szLoginURL : "+szLoginURL);
                    
                    mainObject.m_HttpComms.setURI(szLoginURL);
                    mainObject.m_HttpComms.setRequestMethod("POST");
                    var bResult = mainObject.m_HttpComms.send(mainObject.loginOnloadHandler, mainObject);      
                    if (!bResult) throw new Error("httpConnection returned false");
                    mainObject.m_iStage++;
                break;
                
                
                case 3://login bounce 
                    var szLoginVerify = szResponse.match(patternAOLVerify)[1];
                    mainObject.m_Log.Write("AOLPOP.js - loginOnloadHandler - szLoginVerify " + szLoginVerify);
                    if (szLoginVerify == null)
                        throw new Error("error parsing AOL login web page");
                   
                    mainObject.m_HttpComms.setURI(szLoginVerify);
                    mainObject.m_HttpComms.setRequestMethod("GET");
                    var bResult = mainObject.m_HttpComms.send(mainObject.loginOnloadHandler, mainObject);      
                    if (!bResult) throw new Error("httpConnection returned false");
                    mainObject.m_iStage++;
                break;
                                
                case 4://get host
                    mainObject.m_szHostURL = szResponse.match(patternAOLHost)[1];
                    if (mainObject.m_szHostURL == null)
                        throw new Error("error parsing AOL login web page");
                    mainObject.m_SuccessPath = szResponse.match(patternAOLPath)[1];
                    mainObject.m_Log.Write("AOLPOP.js - loginOnloadHandler - m_SuccessPath " +mainObject.m_SuccessPath);
                    var szCheck = szResponse.match(patternAOLHostCheck)[1];
                    var szURL = "http://" + mainObject.m_szHostURL + szCheck;
                               
                    mainObject.m_HttpComms.setURI(szURL);
                    mainObject.m_HttpComms.setRequestMethod("GET");
                    var bResult = mainObject.m_HttpComms.send(mainObject.loginOnloadHandler, mainObject);      
                    if (!bResult) throw new Error("httpConnection returned false");
                    mainObject.m_iStage++;
                break;
                
                
                case 5://get mail box                   
                    mainObject.m_szHostURL = szResponse.match(patternAOLTarget)[1];
                    mainObject.m_Log.Write("AOLPOP.js - loginOnloadHandler - m_szHostURL " +mainObject.m_szHostURL);
                    if (mainObject.m_szHostURL == null)
                        throw new Error("error parsing AOL login web page");
                   
                    var szURL = "http://" + mainObject.m_szHostURL + mainObject.m_SuccessPath;
                    mainObject.m_szHomeURI = szURL;
                    
                    var szCookies =  httpChannel.getResponseHeader("Set-Cookie");                   
                    mainObject.m_szUserId = szCookies.match(patternAOLUserID)[1];
                    mainObject.m_Log.Write("AOLPOP.js - loginOnloadHandler - m_szUserId " +mainObject.m_szUserId);
                    
                    mainObject.m_HttpComms.setURI(szURL);
                    mainObject.m_HttpComms.setRequestMethod("GET");
                    var bResult = mainObject.m_HttpComms.send(mainObject.loginOnloadHandler, mainObject);      
                    if (!bResult) throw new Error("httpConnection returned false");
                    mainObject.m_iStage++;
                break;
                
                case 6://get urls
                    if(szResponse.search(patternAOLLogout)==-1)
                    {
                        if (mainObject.m_bReEntry)
                        {
                            mainObject.m_bReEntry = false;
                            mainObject.m_iStage =0;
                            mainObject.m_HttpComms.setURI(mainObject.m_szAOLMail);
                            mainObject.m_HttpComms.setRequestMethod("GET");
                            var bResult = mainObject.m_HttpComms.send(mainObject.loginOnloadHandler, mainObject);                             
                            if (!bResult) throw new Error("httpConnection returned false");
                            return;
                        }
                        else
                            throw new Error("error logging in");
                    }
                      
                    mainObject.m_szVersion = szResponse.match(patternAOLVersion)[1];
                    mainObject.m_Log.Write("AOLPOP.js - loginOnloadHandler - szVersion " +mainObject.m_szVersion);
                    var szDir = mainObject.m_SuccessPath.match(patternAOLSucessPath)[1];
                    mainObject.m_Log.Write("AOLPOP.js - loginOnloadHandler - szDir " +szDir);
                    mainObject.m_szLocation = "http://" + mainObject.m_szHostURL + szDir + "rpc/" ;
                    
                    //server response
                    mainObject.serverComms("+OK Your in\r\n");
                    mainObject.m_bAuthorised = true;
                break;
            };
            mainObject.m_Log.Write("AOLPOP.js - loginOnloadHandler - END");
        }
        catch(err)
        {
            mainObject.m_Log.DebugDump("AOLPOP.js: loginHandler : Exception : " 
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
            this.m_Log.Write("nsAOL.js - getNumMessages - START"); 
            
            //will always download from inbox 
            var szURL = this.m_szLocation + "GetMessageList.aspx?page=1";
            var szData = "previousFolder=&stateToken=&newMailToken=&"
            szData += "version="+ this.m_szVersion +"&user="+ this.m_szUserId;
            var szInbox = szURL + "&folder=Inbox&" + szData;
            this.m_Log.Write("AOLPOP.js - getNumMessages - szInboxURL " + szInbox);
            
            this.m_iStage = 0;
            this.m_HttpComms.setURI(szInbox);
            this.m_HttpComms.setRequestMethod("GET");
            var bResult = this.m_HttpComms.send(this.mailBoxOnloadHandler, this); 
            if (!bResult) throw new Error("httpConnection returned false");
            this.m_bStat = true;
            
            this.m_Log.Write("nsAOL.js - getNumMessages - END"); 
            return true;
        }
        catch(e)
        {
            this.m_Log.DebugDump("nsAOL.js: getNumMessages : Exception : " 
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
            mainObject.m_Log.Write("AOLPOP.js - mailBoxOnloadHandler - START");
            //mainObject.m_Log.Write("AOLPOP.js - mailBoxOnloadHandler : \n" + szResponse); 
            mainObject.m_Log.Write("AOLPOP.js - mailBoxOnloadHandler : " + mainObject.m_iStage);  
            
            var httpChannel = event.QueryInterface(Components.interfaces.nsIHttpChannel);
            
            //if this fails we've gone somewhere new
            mainObject.m_Log.Write("AOLPOP.js - mailBoxOnloadHandler - status :" +httpChannel.responseStatus );
            if (httpChannel.responseStatus != 200)
                throw new Error("return status " + httpChannel.responseStatus);
            
            var szLocation = httpChannel.URI.spec;
            mainObject.m_Log.Write("AOLPOP - mailBoxOnloadHandler - url : " + szLocation);
                              
            //get folder list
            if (mainObject.m_prefData.aszFolder)
            {
                var aszFolderList = szResponse.match(patternAOLFolders);
                mainObject.m_Log.Write("AOLPOP.js - mailBoxOnloadHandler - aszFolderList " + aszFolderList);
                
                var szURL = mainObject.m_szLocation + "GetMessageList.aspx?page=1";
                var szData = "previousFolder=&stateToken=&newMailToken=&"
                szData += "version="+ mainObject.m_szVersion +"&user="+ mainObject.m_szUserId;
                
                for (var i=0; i<mainObject.m_prefData.aszFolder.length; i++)
                {
                    var regExp = new RegExp("^"+mainObject.m_prefData.aszFolder[i]+"$","i");
                    mainObject.m_Log.Write("AOLPOP.js - mailBoxOnloadHandler - regExp : "+regExp );
                       
                    for (var j=0; j<aszFolderList.length; j++)
                    {
                        var szFolderName = aszFolderList[j].match(patternAOLFolderName)[1];
                        mainObject.m_Log.Write("AOLPOP.js - mailBoxOnloadHandler - szFolderName : "+szFolderName );
                          
                        if (szFolderName.search(regExp)!=-1)
                        {
                            var szURI = szURL + "&folder="+szFolderName+"&" + szData;
                            mainObject.m_aszFolderURLList.push(szURI);
                            mainObject.m_Log.Write("AOLPOP.js - mailBoxOnloadHandler - URL found : "+szURI);
                        } 
                    }
                }
                
                //got the need urls so deleting aszFolder stops reentering here
                delete mainObject.m_prefData.aszFolder; 
            }
                           
            //process page
            var aszMSGDetails = szResponse.match(patternAOLMSGData);
            mainObject.m_Log.Write("Hotmail-SR - mailBoxOnloadHandler - aszMSGDetails : " + aszMSGDetails);
            
            var aszSenderAddress = szResponse.match(patternAOLMSGSender);
            mainObject.m_Log.Write("Hotmail-SR - mailBoxOnloadHandler - aszSenderAddress : " + aszSenderAddress);
            
            if (aszMSGDetails)    
            {
                for (i=0; i<aszMSGDetails.length; i++)
                {
                   
                    var aTempData = aszMSGDetails[i].match(patternAOLMSGDataProcess);
                    mainObject.m_Log.Write("AOL - mailBoxOnloadHandler - aTempData : " + aTempData);
                    
                    var bRead = false;
                    if (mainObject.m_prefData.bDownloadUnread)
                    {
                        bRead = parseInt(aTempData[5]); //unread
                        mainObject.m_Log.Write("AOL.js - mailBoxOnloadHandler - bRead -" + bRead);
                    }
                  
                    if (!bRead)
                    {
                        var MSGData = new AOLMSG();
                        MSGData.iID = aTempData[1]; //ID
                        MSGData.szSubject = aTempData[2]; //Subject
                        MSGData.iDate = parseInt(aTempData[3]); //Date
                        MSGData.iSize = parseInt(aTempData[4]); //size

                        //sender
                        var aTempData2= aszSenderAddress[i].match(/\((.*?)\)/)[1].split(/,/);
                        mainObject.m_Log.Write("AOL - mailBoxOnloadHandler - aTempData2 : " + aTempData2);
                        MSGData.szFrom = aTempData2[0].match(/"(.*?)"/)[1];
                        
                        MSGData.szTo = mainObject.m_szUserName;//me
                        var szFolder = szLocation.match(patternAOLFolderNameURL)[1];
                        mainObject.m_Log.Write("AOL - mailBoxOnloadHandler - szFolder : " + szFolder);
                        MSGData.szFolder =  szFolder;
                        
                        mainObject.m_aMsgDataStore.push(MSGData);
                        mainObject.m_iTotalSize += MSGData.iSize;
                    }
                }
            }

            //next page
            //get number of pages
            if (mainObject.m_iPageNum == -1)
            {
                var szPageNum = szResponse.match(patternAOLPageNum)[1];
                mainObject.m_Log.Write("AOLPOP.js - mailBoxOnloadHandler - szPageNum " + szPageNum);
                mainObject.m_iPageNum =  parseInt(szPageNum);
            }   
            
            //get current page number
            var szCurrentPage = szLocation.match(patternAOLURLPageNum)[1];
            mainObject.m_Log.Write("AOLPOP - mailBoxOnloadHandler - szCurrentPage : " + szCurrentPage);
            var iCurrentPage =  parseInt(szCurrentPage);
            
            if(iCurrentPage < mainObject.m_iPageNum)
            {
                var szNextPage = szLocation.replace(/page.*?&/,"page="+(iCurrentPage+1)+"&");
                mainObject.m_HttpComms.setURI(szNextPage);
                mainObject.m_HttpComms.setRequestMethod("GET");
                var bResult = mainObject.m_HttpComms.send(mainObject.mailBoxOnloadHandler, mainObject); 
                if (!bResult) throw new Error("httpConnection returned false");
            }
            else
            {
                if (mainObject.m_aszFolderURLList.length>0)
                { //get next folder
                    var szFolderURL = mainObject.m_aszFolderURLList.shift();
                    mainObject.m_Log.Write("AOL - mailBoxOnloadHandler - szFolderURL: " + szFolderURL); 
                    
                    mainObject.m_iPageNum = -1; //reset page count
                                       
                    mainObject.m_HttpComms.setURI(szFolderURL);
                    mainObject.m_HttpComms.setRequestMethod("GET");
                    var bResult = mainObject.m_HttpComms.send(mainObject.mailBoxOnloadHandler, mainObject); 
                    if (!bResult) throw new Error("httpConnection returned false");
                }
                else  //all uri's collected
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
            }


            mainObject.m_Log.Write("AOLPOP.js - mailBoxOnloadHandler - END");
        }
        catch(err)
        {
             mainObject.m_Log.DebugDump("AOLPOP.js: MailboxOnload : Exception : " 
                                              + err.name 
                                              + ".\nError message: " 
                                              + err.message + "\n"
                                              + err.lineNumber);
            
            mainObject.serverComms("-ERR Comms Error from "+ mainObject.m_szUserName+"\r\n");
        }
    }, 
      
      
      
      
                      
    //list
    getMessageSizes : function() 
    {
        try
        {
            this.m_Log.Write("nsAOL.js - getMessageSizes - START");
            
            if (this.m_bStat) 
            {  //msg table has been donwloaded
                var szPOPResponse = "+OK " +  this.m_aMsgDataStore.length + " Messages\r\n"; 
                for (i = 0; i < this.m_aMsgDataStore.length; i++)
                {
                    var iEmailSize = this.m_aMsgDataStore[i].iSize;
                    this.m_Log.Write("AOLPOP.js - getMessageSizes - Email Size : " +iEmailSize);
                    szPOPResponse+=(i+1) + " " + iEmailSize + "\r\n";   
                } 
                szPOPResponse += ".\r\n";
                
                this.serverComms(szPOPResponse);
            }
            else
            { //download msg list
                this.m_Log.Write("AOL - getMessageSizes - calling stat");
                //will always download from inbox 
                var szURL = this.m_szLocation + "GetMessageList.aspx?page=1";
                var szData = "previousFolder=&stateToken=&newMailToken=&"
                szData += "version="+ this.m_szVersion +"&user="+ this.m_szUserId;
                var szInbox = szURL + "&folder=Inbox&" + szData;
                this.m_Log.Write("AOL.js - getMessageSizes - szInboxURL " + szInbox);
               
                this.m_iStage = 0;
                this.m_HttpComms.setURI(szInbox);
                this.m_HttpComms.setRequestMethod("GET");
                var bResult = this.m_HttpComms.send(this.mailBoxOnloadHandler, this); 
                if (!bResult) throw new Error("httpConnection returned false");
            }
            
            
            this.m_Log.Write("nsAOL.js - getMessageSizes - END"); 
            return true;
        }
        catch(e)
        {
            this.m_Log.DebugDump("nsAOL.js: getMessageSizes : Exception : " 
                                          + e.name 
                                          + ".\nError message: " 
                                          + e.message+ "\n"
                                          + e.lineNumber);
            return false;
        }
    },
    
    
      
    
    
    //IUDL
    getMessageIDs : function()
    {
        try
        {
            this.m_Log.Write("nsAOL.js - getMessageIDs - START");  
            
            var szPOPResponse = "+OK " + this.m_aMsgDataStore.length + " Messages\r\n";
            for (i = 0; i <  this.m_aMsgDataStore.length; i++)
            {
                var iEmailID = this.m_aMsgDataStore[i].iID;
                this.m_Log.Write("AOLPOP.js - getMessageIDs - Email URL : " +iEmailID);
                                                  
                szPOPResponse+=(i+1) + " " + iEmailID + "\r\n"; 
            }         
            szPOPResponse += ".\r\n";
            this.serverComms(szPOPResponse);   
                 
            this.m_Log.Write("nsAOL.js - getMessageIDs - END"); 
            return true;
        }
        catch(e)
        {
            this.m_Log.DebugDump("nsAOL.js: getMessageIDs : Exception : " 
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
            this.m_Log.Write("nsAOL.js - getHeaders - START");  
            this.m_Log.Write("nsAOL.js - getHeaders - id " + lID ); 
            
             
            var oMSG = this.m_aMsgDataStore[lID-1];
            
            var szHeaders = "X-WebMail: true\r\n";
            szHeaders += "X-Folder: " + oMSG.szFolder + "\r\n";
            szHeaders += "To: "+ oMSG.szTo +"\r\n";
            szHeaders += "From: "+ oMSG.szFrom +"\r\n";
            szHeaders += "Subject: "+ oMSG.szSubject +"\r\n";
            var date = new Date(oMSG.iDate);
            szHeaders += "Date: " +  date +"\r\n"; // \r\n";
            szHeaders = szHeaders.replace(/^\./mg,"..");    //bit padding 
            szHeaders += "\r\n.\r\n";//msg end 
             
            var  szResponse = "+OK " +szHeaders.length + "\r\n"; 
            szResponse += szHeaders
            this.serverComms(szResponse);
            
            this.m_Log.Write("nsAOL.js - getHeaders - END");
            return true; 
        }
        catch(err)
        {
            this.m_Log.DebugDump("nsAOL.js: getHeaders : Exception : " 
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
            this.m_Log.Write("nsAOL.js - getMessage - START"); 
            this.m_Log.Write("nsAOL.js - getMessage - msg num" + lID);
            
            //get msg id
            var oMSG = this.m_aMsgDataStore[lID-1];
            this.m_szFolder = oMSG.szFolder ;
            this.iID = oMSG.iID;
            var szURL = this.m_szLocation.replace(/rpc/,"Mail") + "rfc822.aspx?";
            szURL += "folder=" + this.m_szFolder +"&";
            szURL += "uid=" + oMSG.iID +"&";
            szURL += "user="+ this.m_szUserId;
            
            this.m_iStage = 0;
            this.m_HttpComms.setURI(szURL);
            this.m_HttpComms.setRequestMethod("GET");
            var bResult = this.m_HttpComms.send(this.emailOnloadHandler, this); 
            if (!bResult) throw new Error("httpConnection returned false");
            
            this.m_Log.Write("nsAOL.js - getMessage - END"); 
            return true;
        }
        catch(e)
        {
             this.m_Log.DebugDump("nsAOL.js: getMessage : Exception : " 
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
            mainObject.m_Log.Write("AOLPOP.js - emailOnloadHandler - START"); 
           // mainObject.m_Log.Write("AOLPOP.js - emailOnloadHandler : \n" + szResponse);
            
            var httpChannel = event.QueryInterface(Components.interfaces.nsIHttpChannel);
            mainObject.m_Log.Write("AOLPOP.js - emailOnloadHandler - msg :" + httpChannel.responseStatus);
                       
            //check status should be 200.
            if (httpChannel.responseStatus != 200) 
                throw new Error("error status " + httpChannel.responseStatus);           
            
            switch(mainObject.m_iStage)
            {
                case 0:
                    mainObject.m_szMSG = "X-WebMail: true\r\n";
                    mainObject.m_szMSG += "X-szFolder: " + mainObject.m_szFolder+ "\r\n";
                    mainObject.m_szMSG += szResponse.replace(/^\./mg,"..");    //bit padding   
                    mainObject.m_szMSG += "\r\n.\r\n";       
                    
                    var szURL = mainObject.m_szLocation + "MessageAction.aspx?";
                    szURL += "folder=" +  mainObject.m_szFolder +"&";
                    szURL += "action=seen&";
                    szURL += "version="+ mainObject.m_szVersion +"&";
                    szURL += "uid=" + mainObject.iID +"&";
                    szURL += "version="+ mainObject.m_szVersion +"&";
                    szURL += "user="+ mainObject.m_szUserId;
                                       
                    mainObject.m_HttpComms.setURI(szURL);
                    mainObject.m_HttpComms.setRequestMethod("GET");
                    var bResult = mainObject.m_HttpComms.send(mainObject.emailOnloadHandler, mainObject); 
                    if (!bResult) throw new Error("httpConnection returned false");
                    mainObject.m_iStage++;
                break;
               
                case 1:
                    var szPOPResponse = "+OK " +  mainObject.m_szMSG.length + "\r\n";                  
                    szPOPResponse += mainObject.m_szMSG;
            
                    mainObject.serverComms(szPOPResponse);
                break;
            }
            mainObject.m_Log.Write("AOLPOP.js - emailOnloadHandler - end"); 
        }
        catch(err)
        {
            mainObject.m_Log.DebugDump("AOLPOP.js: emailOnloadHandler : Exception : " 
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
            this.m_Log.Write("nsAOL.js - deleteMessage - START");  
            this.m_Log.Write("nsAOL.js - deleteMessage - id " + lID );
            
            //get msg id
            var oMSG = this.m_aMsgDataStore[lID-1];
            this.m_szFolder = oMSG.szFolder;
            this.iID = oMSG.iID;
            var szURL = this.m_szLocation + "MessageAction.aspx?";
            szURL += "folder=" + this.m_szFolder  +"&";
            szURL += "action=delete&";
            szURL += "version="+ this.m_szVersion +"&";
            szURL += "uid=" + oMSG.iID +"&";
            szURL += "user="+ this.m_szUserId;
            
            this.m_iStage = 0;
            this.m_HttpComms.setURI(szURL);
            this.m_HttpComms.setRequestMethod("GET");
            var bResult = this.m_HttpComms.send(this.deleteMessageOnloadHandler, this); 
            if (!bResult) throw new Error("httpConnection returned false");
            
            this.m_Log.Write("nsAOL.js - deleteMessage - END");     
            return true;
        }
        catch(e)
        {
            this.m_Log.DebugDump("nsAOL.js: deleteMessage : Exception : " 
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
            mainObject.m_Log.Write("AOLPOP.js - deleteMessageOnloadHandler - START");
           // mainObject.m_Log.Write("AOLPOP.js - deleteMessageOnloadHandler : \n" + szResponse);
            
            var httpChannel = event.QueryInterface(Components.interfaces.nsIHttpChannel);
            mainObject.m_Log.Write("AOLPOP.js - emailOnloadHandler - msg :" + httpChannel.responseStatus);
            
            //check status should be 200.
            if (httpChannel.responseStatus != 200) 
                throw new Error("error status " + httpChannel.responseStatus);  
            
            mainObject.serverComms("+OK its history\r\n"); 
            
            mainObject.m_Log.Write("AOLPOP.js - deleteMessageOnloadHandler - END");
        }
        catch(err)
        {
            mainObject.m_Log.DebugDump("AOLPOP.js: deleteMessageOnloadHandler : Exception : " 
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
            this.m_Log.Write("nsAOL.js - logOUT - START"); 
            
            if (this.m_prefData.bReUseSession)
            { 
                this.m_Log.Write("AOLPOP.js - Logout - Setting Session Data");
                if (!this.m_SessionData)
                {
                    this.m_SessionData = Components.classes["@mozilla.org/SessionData;1"].createInstance();
                    this.m_SessionData.QueryInterface(Components.interfaces.nsISessionData);
                    this.m_SessionData.szUserName = this.m_szUserName.toLowerCase();
                    
                    var componentData = Components.classes["@mozilla.org/ComponentData;1"].createInstance();
                    componentData.QueryInterface(Components.interfaces.nsIComponentData);
                    this.m_SessionData.oComponentData = componentData;
                }
                this.m_SessionData.oCookieManager = this.m_HttpComms.getCookieManager();
                this.m_SessionData.oComponentData.addElement("szHomeURI",this.m_szHomeURI);
                this.m_SessionData.oComponentData.addElement("szUserId",this.m_szUserId);
                this.m_SessionData.oComponentData.addElement("szVersion",this.m_szVersion);
                this.m_SessionData.oComponentData.addElement("szSuccessPath", this.m_SuccessPath);
                this.m_SessionData.oComponentData.addElement("szHostURL",this.m_szHostURL);
                this.m_SessionData.oComponentData.addElement("szLocation",this.m_szLocation);
                this.m_SessionManager.setSessionData(this.m_SessionData);  
            }
         
            this.m_bAuthorised = false;
            this.serverComms("+OK Your Out\r\n");    
            
            this.m_Log.Write("nsAOL.js - logOUT - END");  
            return true;
        }
        catch(e)
        {
            this.m_Log.DebugDump("nsAOL.js: logOUT : Exception : " 
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
            this.m_Log.Write("nsAOL.js - serverComms - START");
            this.m_Log.Write("nsAOL.js - serverComms msg " + szMsg);
            var iCount = this.m_oResponseStream.write(szMsg,szMsg.length);
            this.m_Log.Write("nsAOL.js - serverComms sent count: " + iCount 
                                                        +" msg length: " +szMsg.length);
            this.m_Log.Write("nsAOL.js - serverComms - END");  
        }
        catch(e)
        {
            this.m_Log.DebugDump("nsAOL.js: serverComms : Exception : " 
                                              + e.name 
                                              + ".\nError message: " 
                                              + e.message+ "\n"
                                              + e.lineNumber);
        }
    },
    
    
    
    
    loadPrefs : function()
    {
        try
        {
            this.m_Log.Write("nsAOL.js - loadPrefs - START"); 
           
            //get user prefs
            var oData = new PrefData();
            var oPref = {Value:null};
            var  WebMailPrefAccess = new WebMailCommonPrefAccess();
            
            //do i reuse the session
            WebMailPrefAccess.Get("bool","lycos.bReUseSession",oPref);
            this.m_Log.Write("nsAOL.js - loadPrefs - bReUseSession " + oPref.Value);
            if (oPref.Value) oData.bReUseSession = oPref.Value;
                             
            var iCount = 0;
            oPref.Value = null;
            WebMailPrefAccess.Get("int","aol.Account.Num",oPref);
            this.m_Log.Write("nsAOL.js - loadPrefs - num " + oPref.Value);
            if (oPref.Value) iCount = oPref.Value;
                       
            var bFound = false;
            var regExp = new RegExp(this.m_szUserName,"i");
            for (i=0; i<iCount; i++)
            {
                //get user name
                oPref.Value = null;
                WebMailPrefAccess.Get("char","aol.Account."+i+".user",oPref);
                this.m_Log.Write("nsAOL.js - loadPrefs - user " + oPref.Value);
                if (oPref.Value)
                {
                    if (oPref.Value.search(regExp)!=-1)
                    {
                        this.m_Log.Write("nsAOL.js - loadPrefs - user found "+ i);
                        bFound = true;

                        //get folders
                        WebMailPrefAccess.Get("char","aol.Account."+i+".szFolders",oPref);
                        this.m_Log.Write("nsAOL.js - loadPrefs - szFolders " + oPref.Value);
                        if (oPref.Value)
                        {
                            var aszFolders = oPref.Value.split("\r");
                            for (j=0; j<aszFolders.length; j++)
                            {
                                this.m_Log.Write("nsAOL.js - loadPRefs - aszFolders[j] " + aszFolders[j]);
                                oData.aszFolder.push(encodeURIComponent(aszFolders[j]));
                            }
                        }
                        
                        //get unread
                        oPref.Value = null;
                        WebMailPrefAccess.Get("bool","aol.Account."+i+".bDownloadUnread",oPref);
                        this.m_Log.Write("nsAOL.js - loadPrefs - bDownloadUnread " + oPref.Value);
                        if (oPref.Value) oData.bUnread=oPref.Value; 
                                                                   
                        //get junkmail
                        oPref.Value = null;
                        WebMailPrefAccess.Get("bool","aol.Account."+i+".bUseJunkMail",oPref);
                        this.m_Log.Write("nsAOL.js - loadPrefs - bUseJunkMail " + oPref.Value);
                        if (oPref.Value) oData.bUseJunkMail = oPref.Value;
                        if (oData.bUseJunkMail) oData.aszFolder.push("spam");
                    }
                }
            }
            
            if (!bFound) //get defaults
            {
                this.m_Log.Write("nsAOL.js - loadPrefs - Default Folders");
                
                //unread only
                oPref.Value = null;
                WebMailPrefAccess.Get("bool","aol.bDownloadUnread",oPref);
                this.m_Log.Write("nsAOL.js - loadPrefs - bDownloadUnread " + oPref.Value);
                if (oPref.Value) oData.bUnread=oPref.Value;
               
                //get junkmail
                oPref.Value = null;
                WebMailPrefAccess.Get("bool","aol.bUseJunkMail",oPref);
                this.m_Log.Write("nsAOL.js - loadPrefs - bUseJunkMail " + oPref.Value);
                if (oPref.Value) oData.bUseJunkMail = oPref.Value;
                if (oData.bUseJunkMail) oData.aszFolder.push("spam");
            }
            this.m_Log.Write("nsAOL.js - loadPrefs - END");
            return oData;
        }
        catch(e)
        {
             this.m_Log.DebugDump("nsAOL.js: loadPrefs : Exception : " 
                                              + e.name + 
                                              ".\nError message: " 
                                              + e.message+ "\n"
                                              + e.lineNumber);
            return null;
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
var nsAOLFactory = new Object();

nsAOLFactory.createInstance = function (outer, iid)
{
    if (outer != null) throw Components.results.NS_ERROR_NO_AGGREGATION;
    
    if (!iid.equals(nsAOLClassID) && !iid.equals(Components.interfaces.nsISupports))
        throw Components.results.NS_ERROR_INVALID_ARG;
    
    return new nsAOL();
}


/******************************************************************************/
/* MODULE */
var nsAOLModule = new Object();

nsAOLModule.registerSelf = function(compMgr, fileSpec, location, type)
{
    compMgr = compMgr.QueryInterface(Components.interfaces.nsIComponentRegistrar);
    compMgr.registerFactoryLocation(nsAOLClassID,
                                    "AOLComponent",
                                    nsAOLContactID, 
                                    fileSpec,
                                    location, 
                                    type);
}


nsAOLModule.unregisterSelf = function(aCompMgr, aFileSpec, aLocation)
{
    aCompMgr = aCompMgr.QueryInterface(Components.interfaces.nsIComponentRegistrar);
    aCompMgr.unregisterFactoryLocation(nsAOLClassID, aFileSpec);
}

 
nsAOLModule.getClassObject = function(compMgr, cid, iid)
{
    if (!cid.equals(nsAOLClassID))
        throw Components.results.NS_ERROR_NO_INTERFACE;

    if (!iid.equals(Components.interfaces.nsIFactory))
        throw Components.results.NS_ERROR_NOT_IMPLEMENTED;

    return nsAOLFactory;
}


nsAOLModule.canUnload = function(compMgr)
{
    return true;
}
/******************************************************************************/


function NSGetModule(compMgr, fileSpec)
{
    return nsAOLModule; 
}
