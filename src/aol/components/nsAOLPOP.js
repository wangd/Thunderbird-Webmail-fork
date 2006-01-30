/*****************************  Globals   *************************************/                 
const nsAOLClassID = Components.ID("{e977c180-9103-11da-a72b-0800200c9a66}"); 
const nsAOLContactID = "@mozilla.org/AOLPOP;1";

const patternAOLReplace = /parent\.location\.replace\("(.*?)"\);/i;
const patternAOLRedirect = /goToLoginUrl[\s\S]*snsRedir\("(.*?)"\)/i;
const patternAOLLoginForm = /<form.*?loginForm.*?>[\s\S]*<\/form>/igm;
const patternAOLAction = /<form.*?action="(.*?)".*?>/;
const patternAOLInput = /<input.*?>/igm;
const patternAOLType = /type="(.*?)"/i;
const patternAOLName = /name="(.*?)"/i;
const patternAOLValue = /value="(.*?)"/i;
const patternAOLVerify = /<body onLoad=".*?'(http.*?)'.*>/i;
const patternAOLHost = /gPreferredHost.*?"(.*?)";/i;
const patternAOLPath = /gSuccessPath.*?"(.*?)";/i;
const patternAOLHostCheck = /gHostCheckPath.*?"(.*?)"/i;
const patternAOLTarget = /gTargetHost.*?"(.*?)"/i;
const patternAOLMSGList = /MessageList\.aspx/i;
const patternAOLVersion =/var VERSION="(.*?)"/i;
const patternAOLUserID =/uid:(.*?)&/i;


/***********************  AOL ********************************/


function nsAOL()
{
    try
    {       
        var scriptLoader =  Components.classes["@mozilla.org/moz/jssubscript-loader;1"];
        scriptLoader = scriptLoader.getService(Components.interfaces.mozIJSSubScriptLoader);
        scriptLoader.loadSubScript("chrome://web-mail/content/common/DebugLog.js");
        scriptLoader.loadSubScript("chrome://web-mail/content/common/comms.js");
        scriptLoader.loadSubScript("chrome://web-mail/content/common/CommonPrefs.js");
        scriptLoader.loadSubScript("chrome://aol/content/AOL-MSG.js");
        
        var date = new Date();
        var  szLogFileName = "AOL Log - " + date.getHours()+ "-" + date.getMinutes() + "-"+ date.getUTCMilliseconds() +" -";
        this.m_Log = new DebugLog("webmail.logging.comms", 
                                  "{3c8e8390-2cf6-11d9-9669-0800200c9a66}" ,
                                  szLogFileName); 
        
        this.m_Log.Write("nsAOL.js - Constructor - START");   
       
        this.m_szUserName = null;   
        this.m_szPassWord = null; 
        this.m_oResponseStream = null;  
        this.m_HttpComms = new Comms(this,this.m_Log); 
        this.m_bAuthorised = false; 
        this.m_iStage=0; 
         
        this.m_szInboxURL = null;
        this.m_szSpamURL = null;         
        this.m_SuccessPath = null;
        this.m_szHostURL = null;
        this.m_szHomeURI = null;
        this.m_szUserId = null;
        this.m_szVersion = null;
        this.m_bReEntry = false;
        this.m_szAOLMail = null;
        
        this.m_SessionManager = Components.classes["@mozilla.org/SessionManager;1"];
        this.m_SessionManager = this.m_SessionManager.getService();
        this.m_SessionManager.QueryInterface(Components.interfaces.nsISessionManager); 
        this.m_SessionData = null;
         
        //do i reuse the session
        var oPref = {Value:null};
        var  WebMailPrefAccess = new WebMailCommonPrefAccess();
        if (WebMailPrefAccess.Get("bool","aol.bReUseSession",oPref))
            this.m_bReUseSession=oPref.Value;
        else
            this.m_bReUseSession=true; 
        
        //do i download junkmail
        oPref.Value = null;
        if (WebMailPrefAccess.Get("bool","aol.bUseJunkMail",oPref))
            this.m_bUseJunkMail=oPref.Value;
        else
            this.m_bUseJunkMail=false;
         
        //do i download unread only
        oPref.Value = null;
        if (WebMailPrefAccess.Get("bool","aol.bDownloadUnread",oPref))
            this.m_bDownloadUnread=oPref.Value;
        else
            this.m_bDownloadUnread=false;
                   
        delete WebMailPrefAccess;
                   
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
    
    get bAuthorised() {return this.m_bAuthorised;},
  
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
            
            if (szDomain.search(/aim/i)!=-1) 
                this.m_szAOLMail= "http://webmail.aol.com/";  
            else if (szDomain.search(/netscape/i)!=-1)
                this.m_szAOLMail= "http://mail.netscape.com/";  
            else
                this.m_szAOLMail= "http://webmail.aol.com/";
            
            this.m_HttpComms.clean();
            
            this.m_SessionData = this.m_SessionManager.findSessionData(this.m_szUserName);
            if (this.m_SessionData && this.m_bReUseSession)
            {
                this.m_Log.Write("nsAOL.js - logIN - Session Data found");
                
                this.m_HttpComms.setCookieManager(this.m_SessionData.oCookieManager);
                this.m_szHomeURI = this.m_SessionData.oComponentData.findElement("szHomeURI");
                this.m_Log.Write("nsAOL.js - logIN - m_szHomeURI " +this.m_szHomeURI);
                this.m_szUserId = this.m_SessionData.oComponentData.findElement("szUserId");
                this.m_Log.Write("nsAOL.js - logIN - m_szUserId " +this.m_szUserId);   
                this.m_szVersion = this.m_SessionData.oComponentData.findElement("m_szVersion");
                this.m_Log.Write("nsAOL.js - logIN - m_szVersion " +this.m_szVersion);   
                
                //get home page
                this.m_iStage =6;
                this.m_bReEntry = true;
                this.m_HttpComms.setURI(this.m_szHomeURI);
                this.m_HttpComms.setRequestMethod("GET");
                var bResult = this.m_HttpComms.send(this.loginOnloadHandler);                             
                if (!bResult) throw new Error("httpConnection returned false");
            }
            else
            {   
                this.m_iStage = 0;
                this.m_HttpComms.setURI(this.m_szAOLMail);
                this.m_HttpComms.setRequestMethod("GET");
                var bResult = this.m_HttpComms.send(this.loginOnloadHandler);                             
                if (!bResult) throw new Error("httpConnection returned false");        
            }
                              
            this.m_Log.Write("nsAOL.js - logIN - END " + bResult);    
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
            mainObject.m_Log.Write("nsAOL.js - loginOnloadHandler - START"); 
            mainObject.m_Log.Write("nsAOL.js - loginOnloadHandler : " + mainObject.m_iStage);  
            
            var httpChannel = event.QueryInterface(Components.interfaces.nsIHttpChannel);
            
            //if this fails we've gone somewhere new
            mainObject.m_Log.Write("nsAOL.js - loginOnloadHandler - status :" +httpChannel.responseStatus );
            if (httpChannel.responseStatus != 200) 
                throw new Error("return status " + httpChannel.responseStatus);
    
            mainObject.m_HttpComms.clean();
            
             //page code                                
            switch (mainObject.m_iStage)
            {
                case 0: // login page               
                    var szLoginReplaceURL = szResponse.match(patternAOLReplace)[1];
                    mainObject.m_Log.Write("nsAOL.js - loginOnloadHandler - replace " + szLoginReplaceURL);
                    if (szLoginReplaceURL == null)
                         throw new Error("error parsing AOL login web page");

                    mainObject.m_HttpComms.setURI(szLoginReplaceURL);
                    mainObject.m_HttpComms.setRequestMethod("GET");
                    var bResult = mainObject.m_HttpComms.send(mainObject.loginOnloadHandler);      
                    if (!bResult) throw new Error("httpConnection returned false");
                    mainObject.m_iStage++;
                break;
                
                
                case 1://redirect
                    var szLoginRedirectURL = szResponse.match(patternAOLRedirect)[1];
                    mainObject.m_Log.Write("nsAOL.js - loginOnloadHandler - redirect " + szLoginRedirectURL);
                    if (szLoginRedirectURL == null)
                         throw new Error("error parsing AOL login web page");
                         
                    mainObject.m_HttpComms.setURI(szLoginRedirectURL);
                    mainObject.m_HttpComms.setRequestMethod("GET");
                    var bResult = mainObject.m_HttpComms.send(mainObject.loginOnloadHandler);      
                    if (!bResult) throw new Error("httpConnection returned false");
                    mainObject.m_iStage++;
                    
                break;
                
                
                case 2: //login page
                    var szLoginForm = szResponse.match(patternAOLLoginForm);
                    mainObject.m_Log.Write("nsAOL.js - loginOnloadHandler - szLoginForm " + szLoginForm);
                    if (szLoginForm == null)
                        throw new Error("error parsing AOL login web page");
                         
                    var aLoginData = szLoginForm[0].match(patternAOLInput);
                    mainObject.m_Log.Write("nsAOL.js - loginOnloadHandler - aLoginData " + aLoginData);
                    
                    for (i=0; i<aLoginData.length; i++)
                    {
                        if (aLoginData[i].search(/type="hidden"/i)!=-1)
                        {
                            var szName=aLoginData[i].match(patternAOLName)[1];
                            mainObject.m_Log.Write("nsYahoo.js - loginOnloadHandler - loginData name " + szName);
                            
                            var szValue = aLoginData[i].match(patternAOLValue)[1];
                            mainObject.m_Log.Write("nsYahoo.js - loginOnloadHandler - loginData value " + szValue);
                        
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
                    mainObject.m_Log.Write("nsAOL.js - loginOnloadHandler - szLoginURL : "+szLoginURL);
                    
                    mainObject.m_HttpComms.setURI(szLoginURL);
                    mainObject.m_HttpComms.setRequestMethod("POST");
                    var bResult = mainObject.m_HttpComms.send(mainObject.loginOnloadHandler);      
                    if (!bResult) throw new Error("httpConnection returned false");
                    mainObject.m_iStage++;
                break;
                
                
                case 3://login bounce 
                    var szLoginVerify = szResponse.match(patternAOLVerify)[1];
                    mainObject.m_Log.Write("nsAOL.js - loginOnloadHandler - szLoginVerify " + szLoginVerify);
                    if (szLoginVerify == null)
                        throw new Error("error parsing AOL login web page");
                   
                    mainObject.m_HttpComms.setURI(szLoginVerify);
                    mainObject.m_HttpComms.setRequestMethod("GET");
                    var bResult = mainObject.m_HttpComms.send(mainObject.loginOnloadHandler);      
                    if (!bResult) throw new Error("httpConnection returned false");
                    mainObject.m_iStage++;
                break;
                
                case 4://get host
                    var szHost = szResponse.match(patternAOLHost)[1];
                    if (szHost == null)
                        throw new Error("error parsing AOL login web page");
                    mainObject.m_SuccessPath = szResponse.match(patternAOLPath)[1];
                    var szCheck = szResponse.match(patternAOLHostCheck)[1];
                    var szURL = "http://" + szHost + szCheck;
                    
                    mainObject.m_HttpComms.setURI(szURL);
                    mainObject.m_HttpComms.setRequestMethod("GET");
                    var bResult = mainObject.m_HttpComms.send(mainObject.loginOnloadHandler);      
                    if (!bResult) throw new Error("httpConnection returned false");
                    mainObject.m_iStage++;
                break;
                
                case 5://get mail box
                    mainObject.m_szHostURL = szResponse.match(patternAOLTarget)[1];
                    mainObject.m_Log.Write("nsAOL.js - loginOnloadHandler - m_szHostURL " +mainObject.m_szHostURL);
                    if (mainObject.m_szHostURL == null)
                        throw new Error("error parsing AOL login web page");
                        
                    var szURL = "http://" + mainObject.m_szHostURL + mainObject.m_SuccessPath;
                    mainObject.m_szHomeURI = szURL;
                    
                    var szCookies =  httpChannel.getResponseHeader("Set-Cookie");                   
                    mainObject.m_szUserId = szCookies.match(patternAOLUserID)[1];
                    mainObject.m_Log.Write("nsAOL.js - loginOnloadHandler - m_szUserId " +mainObject.m_szUserId);
                    
                    mainObject.m_HttpComms.setURI(szURL);
                    mainObject.m_HttpComms.setRequestMethod("GET");
                    var bResult = mainObject.m_HttpComms.send(mainObject.loginOnloadHandler);      
                    if (!bResult) throw new Error("httpConnection returned false");
                    mainObject.m_iStage++;
                break;
                
                case 6://get urls
                    if(szResponse.search(patternAOLMSGList)==-1)
                    {
                        if (mainObject.m_bReEntry)
                        {
                            mainObject.m_bReEntry = false;
                            mainObject.m_iStage =0;
                            mainObject.m_HttpComms.setURI(mainObject.m_szAOLMail);
                            mainObject.m_HttpComms.setRequestMethod("GET");
                            var bResult = mainObject.m_HttpComms.send(mainObject.loginOnloadHandler);                             
                            if (!bResult) throw new Error("httpConnection returned false");
                            return;
                        }
                        else
                            throw new Error("error logging in");
                    }
                    
                    mainObject.m_szVersion = szResponse.match(patternAOLVersion)[1];
                    mainObject.m_Log.Write("nsAOL.js - loginOnloadHandler - szVersion " +mainObject.m_szVersion);
                    
                    var szDir = mainObject.m_SuccessPath.replace(/\/Mail\//i,"/rpc/");
                    var szURL = "http://" + mainObject.m_szHostURL + szDir ;
                    szURL += "GetMessageList.aspx?page=1";
                    var szData = "previousFolder=&stateToken=&newMailToken=&"
                    szData += "version="+ mainObject.m_szVersion +"&user="+ mainObject.m_szUserId;
                    
                    //inbox
                    mainObject.m_szInboxURL = szURL + "&folder=inbox&" + szData; ;
                    mainObject.m_Log.Write("nsAOL.js - loginOnloadHandler - m_szInboxURL " + mainObject.m_szInboxURL);
                    //spam   
                    mainObject.m_szSpamURL = szURL + "&folder=spam&" + szData;      
                    mainObject.m_Log.Write("nsAOL.js - loginOnloadHandler - m_szSpamURL " + mainObject.m_szSpamURL);
                    
                    //server response
                    mainObject.serverComms("+OK Your in\r\n");
                    mainObject.m_bAuthorised = true;
                break;
            };
            mainObject.m_Log.Write("nsAOL.js - loginOnloadHandler - END");
        }
        catch(err)
        {
            mainObject.m_Log.DebugDump("nsAOL.js: loginHandler : Exception : " 
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
            
            if (this.m_szInboxURL== null) return false;
            this.m_Log.Write("nsAOL.js - getNumMessages - mail box url " + this.m_szInboxURL); 
            
            this.m_HttpComms.clean();
            this.m_HttpComms.setURI(this.m_szInboxURL);
            this.m_HttpComms.setRequestMethod("GET");
            var bResult = this.m_HttpComms.send(this.mailBoxOnloadHandler); 
            if (!bResult) throw new Error("httpConnection returned false");
            
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
            mainObject.m_Log.Write("nsAOL.js - mailBoxOnloadHandler - START"); 
            mainObject.m_Log.Write("nsAOL.js - mailBoxOnloadHandler - END");
        }
        catch(err)
        {
             mainObject.m_Log.DebugDump("nsAOL.js: MailboxOnload : Exception : " 
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
            
            var szPOPResponse = "+OK " +  this.m_aMsgDataStore.length + " Messages\r\n"; 
            for (i = 0; i < this.m_aMsgDataStore.length; i++)
            {
                var iEmailSize = this.m_aMsgDataStore[i].iSize;
                this.m_Log.Write("nsAOL.js - getMessageSizes - Email Size : " +iEmailSize);
                szPOPResponse+=(i+1) + " " + iEmailSize + "\r\n";   
            } 
            szPOPResponse += ".\r\n";
            
            this.serverComms(szPOPResponse);
                   
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
                var szEmailURL = this.m_aMsgDataStore[i].szMSGUri;
                this.m_Log.Write("nsAOL.js - getMessageIDs - Email URL : " +szEmailURL);
               
                var szEmailID = szEmailURL.match(LycosMSGIDPattern);
                                    
                this.m_Log.Write("nsAOL.js - getMessageIDs - IDS : " +szEmailID);    
                szPOPResponse+=(i+1) + " " + szEmailID + "\r\n"; 
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
            szHeaders += "X-JunkFolder: " +(oMSG.bJunkFolder? "true":"false")+ "\r\n";
            szHeaders += "To: "+ oMSG.szTo +"\r\n";
            szHeaders += "From: "+ oMSG.szFrom +"\r\n";
            szHeaders += "Subject: "+ oMSG.szSubject +"\r\n";
            szHeaders += "Date: " + oMSG.szDate +"\r\n"; // \r\n";
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
            var szMsgID = oMSG.szMSGUri;
            this.m_Log.Write("nsAOL.js - getMessage - msg id" + szMsgID); 
           
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
            mainObject.m_Log.Write("nsAOL.js - emailOnloadHandler - START");         
            mainObject.m_Log.Write("nsAOL.js - emailOnloadHandler - end"); 
        }
        catch(err)
        {
            mainObject.m_Log.DebugDump("nsAOL.js: emailOnloadHandler : Exception : " 
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
            mainObject.m_Log.Write("nsAOL.js - deleteMessageOnloadHandler - START");
            mainObject.m_Log.Write("nsAOL.js - deleteMessageOnloadHandler - END");
        }
        catch(err)
        {
            mainObject.m_Log.DebugDump("nsAOL.js: deleteMessageOnloadHandler : Exception : " 
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
            this.m_SessionData.oComponentData.addElement("szUserId",this.m_szUserId);
            this.m_SessionData.oComponentData.addElement("szVersion",this.m_szVersion);
            this.m_SessionManager.setSessionData(this.m_SessionData);
           
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
    
    
    
    logoutOnloadHandler : function (szResponse ,event , mainObject)
    {
        try
        {
            mainObject.m_Log.Write("nsAOL.js - logoutOnloadHandler - START"); 
            mainObject.m_Log.Write("nsAOL.js - logoutOnloadHandler - END");
        }
        catch(err)
        {
            mainObject.m_Log.DebugDump("nsAOL.js: deleteMessageOnloadHandler : Exception : " 
                                              + err.name 
                                              + ".\nError message: " 
                                              + err.message+ "\n"
                                              + err.lineNumber);
            
            mainObject.serverComms("-ERR Comms Error from "+ mainObject.m_szUserName+"\r\n");
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
