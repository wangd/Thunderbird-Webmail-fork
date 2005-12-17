/*****************************  Globals   *************************************/                 
const nsHttpMailClassID = Components.ID("{7dea1b00-4a7e-11da-8cd6-0800200c9a66}"); 
const nsHttpMailContactID = "@mozilla.org/HttpMailPOP;1";

const HttpMailSchema = "<?xml version=\"1.0\"?>\r\n<D:propfind xmlns:D=\"DAV:\" xmlns:h=\"http://schemas.microsoft.com/hotmail/\" xmlns:hm=\"urn:schemas:httpmail:\">\r\n<D:prop>\r\n<h:adbar/>\r\n<hm:contacts/>\r\n<hm:inbox/>\r\n<hm:outbox/>\r\n<hm:sendmsg/>\r\n<hm:sentitems/>\r\n<hm:deleteditems/>\r\n<hm:drafts/>\r\n<hm:msgfolderroot/>\r\n<h:maxpoll/>\r\n<h:sig/>\r\n</D:prop>\r\n</D:propfind>\r\n";
const HttpMailFolderSchema = "<?xml version=\"1.0\"?>\r\n<D:propfind xmlns:D=\"DAV:\" xmlns:hm=\"urn:schemas:httpmail:\">\r\n<D:prop>\r\n<D:isfolder/>\r\n<D:displayname/>\r\n<hm:special/>\r\n<D:hassubs/>\r\n<D:nosubs/>\r\n<hm:unreadcount/>\r\n<D:visiblecount/>\r\n<hm:special/>\r\n</D:prop>\r\n</D:propfind>\r\n";
const HttpMailMailSchema = "<?xml version=\"1.0\"?>\r\n<D:propfind xmlns:D=\"DAV:\" xmlns:hm=\"urn:schemas:httpmail:\" xmlns:m=\"urn:schemas:mailheader:\">\r\n<D:prop>\r\n<D:isfolder/>\r\n<hm:read/>\r\n<m:hasattachment/>\r\n<m:to/>\r\n<m:from/>\r\n<m:subject/>\r\n<m:date/>\r\n<D:getcontentlength/>\r\n</D:prop>\r\n</D:propfind>\r\n";
const HttpMailReadSchema = "<?xml version=\"1.0\"?>\r\n<D:propertyupdate xmlns:D=\"DAV:\" xmlns:hm=\"urn:schemas:httpmail:\">\r\n<D:set>\r\n<D:prop>\r\n<hm:read>1</hm:read>\r\n</D:prop>\r\n</D:set>\r\n</D:propertyupdate>";                   

const HttpMailMSGIDPattern = /[^\/]+$/;
const HttpMailResponse = /<D:response>[\S\d\s\r\n]*?<\/D:response>/gm;
const HttpMailHref = /<D:href>(.*?)<\/D:href>/i;
const HttpMailSize = /<D:getcontentlength>(.*?)<\/D:getcontentlength>/i;
const HttpMailInBoxPattern = /<hm:inbox>(.*?)<\/hm:inbox>/i;
const HttpMailTrashPattern = /<hm:deleteditems>(.*?)<\/hm:deleteditems>/;
const HttpMailPOPRead = /<hm:read>(.*?)<\/hm:read>/i;
const HttpMailPOPTo = /<m:to>(.*?)<\/m:to>/i;
const HttpMailPOPFrom = /<m:from>(.*?)<\/m:from>/i;
const HttpMailPOPSubject = /<m:subject>\s(.*?)<\/m:subject>/i;
const HttpMailPOPDate = /<m:date>(.*?)T(.*?)<\/m:date>/i;

/***********************  HttpMail ********************************/


function nsHttpMail()
{
    try
    {       
        var scriptLoader =  Components.classes["@mozilla.org/moz/jssubscript-loader;1"];
        scriptLoader = scriptLoader.getService(Components.interfaces.mozIJSSubScriptLoader);
        scriptLoader.loadSubScript("chrome://web-mail/content/common/DebugLog.js");
        scriptLoader.loadSubScript("chrome://web-mail/content/common/comms.js");
        scriptLoader.loadSubScript("chrome://web-mail/content/common/CommonPrefs.js");
        scriptLoader.loadSubScript("chrome://httpmail/content/HttpMail-POPMSG.js");
        
        
        var date = new Date();
        
        var  szLogFileName = "HttpMail Log - " + date.getHours()+ "-" + date.getMinutes() + "-"+ date.getUTCMilliseconds() +" -";
        this.m_Log = new DebugLog("webmail.logging.comms", 
                                  "{3c8e8390-2cf6-11d9-9669-0800200c9a66}" ,
                                  szLogFileName); 
        
        this.m_Log.Write("nsHttpMail.js - Constructor - START");   
       
        this.m_szUserName = null;   
        this.m_szPassWord = null; 
        this.m_oResponseStream = null;  
        this.m_HttpComms = new Comms(this,this.m_Log); 
        this.m_HttpComms.setHandleHttpAuth(true);    
        this.m_bAuthorised = false; 
        this.m_iStage=0; 
        this.m_szInBoxURI= null;
        this.m_szTrashURI=null;
        this.m_szMSG = null;
        this.m_aMsgDataStore = new Array();
        this.m_iTotalSize = 0;     
             
        this.m_SessionManager = Components.classes["@mozilla.org/SessionManager;1"];
        this.m_SessionManager = this.m_SessionManager.getService();
        this.m_SessionManager.QueryInterface(Components.interfaces.nsISessionManager); 
        this.m_SessionData = null;
        
        //do i reuse the session
        var oPref = new Object();
        oPref.Value = null;
        var  WebMailPrefAccess = new WebMailCommonPrefAccess();
        if (WebMailPrefAccess.Get("bool","HttpMail.bReUseSession",oPref))
            this.m_bReUseSession=oPref.Value;
        else
            this.m_bReUseSession=true; 
        
        //do i download unread only
        var oPref = new Object();
        oPref.Value = null;
        var  WebMailPrefAccess = new WebMailCommonPrefAccess();
        if (WebMailPrefAccess.Get("bool","HttpMail.bDownloadUnread",oPref))
            this.m_bDownloadUnread=oPref.Value;
        else
            this.m_bDownloadUnread=false;
                   
        this.m_Log.Write("nsHttpMail.js - Constructor - END");  
    }
    catch(e)
    {
        DebugDump("nsHttpMail.js: Constructor : Exception : " 
                                      + e.name 
                                      + ".\nError message: " 
                                      + e.message+ "\n"
                                      + e.lineNumber);
    }
}



nsHttpMail.prototype =
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
            this.m_Log.Write("nsHttpMail.js - logIN - START");   
            this.m_Log.Write("nsHttpMail.js - logIN - Username: " + this.m_szUserName 
                                                   + " Password: "  + this.m_szPassWord 
                                                   + " stream: "    + this.m_oResponseStream);
            
            if (!this.m_szUserName || !this.m_oResponseStream || !this.m_szPassWord) return false;
            
            var szTempUserName = this.m_szUserName.split("@");
            this.m_Log.Write("nsHttpMail.js - logIN - doamain " + szTempUserName); 
            var szDomain = szTempUserName[1];
            
            var uriManager = Components.classes["@mozilla.org/UriManager;1"].getService();
            uriManager.QueryInterface(Components.interfaces.nsIUriManager);
            var szLocation = uriManager.getUri(szDomain);
            
            this.m_HttpComms.clean();
            
            this.m_SessionData = this.m_SessionManager.findSessionData(this.m_szUserName);
            if (this.m_SessionData && this.m_bReUseSession)
            {
                this.m_Log.Write("nsHttpMail.js - logIN - Session Data found");
                this.m_HttpComms.setCookieManager(this.m_SessionData.oCookieManager);
                this.m_HttpComms.setHttpAuthManager(this.m_SessionData.oHttpAuthManager); 
            }
            
            this.m_HttpComms.setUserName(this.m_szUserName);
            this.m_HttpComms.setPassword(this.m_szPassWord);
            this.m_HttpComms.setContentType(-1);
            this.m_HttpComms.setURI(szLocation);
            this.m_HttpComms.setRequestMethod("PROPFIND");
            this.m_HttpComms.addData(HttpMailSchema,"text/xml");
            var bResult = this.m_HttpComms.send(this.loginOnloadHandler);                             
            if (!bResult) throw new Error("httpConnection returned false");
            
            this.m_Log.Write("nsHttpMail.js - logIN - END " + bResult);    
            return true;
        }
        catch(e)
        {
            this.m_Log.DebugDump("nsHttpMail.js: logIN : Exception : " 
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
            mainObject.m_Log.Write("nsHttpMail.js - loginOnloadHandler - START"); 
            mainObject.m_Log.Write("nsHttpMail.js - loginOnloadHandler : "+ mainObject.m_iStage);  
            
            var httpChannel = event.QueryInterface(Components.interfaces.nsIHttpChannel);
            mainObject.m_HttpComms.clean();
            
            //if this fails we've gone somewhere new
            mainObject.m_Log.Write("nsHttpMail - loginOnloadHandler - status :" +httpChannel.responseStatus );
            if (httpChannel.responseStatus <= 199 || httpChannel.responseStatus >= 300) 
                throw new Error("return status " + httpChannel.responseStatus);
            
            mainObject.m_szInboxURI = szResponse.match(HttpMailInBoxPattern)[1];
            mainObject.m_Log.Write("nsHttpMail.js - loginOnloadHandler - get Inbox url - " + mainObject.m_szInboxURI);
            mainObject.m_szTrashURI = szResponse.match(HttpMailTrashPattern)[1];
            mainObject.m_Log.Write("nsHttpMail.js - loginOnloadHandler - get trash url - " + mainObject.m_szTrashURI);
            
            //server response
            mainObject.serverComms("+OK Your in\r\n");
            mainObject.m_bAuthorised = true;
                             
            mainObject.m_Log.Write("nsHttpMail.js - loginOnloadHandler - END");
        }
        catch(err)
        {
            mainObject.m_Log.DebugDump("nsHttpMail.js: loginHandler : Exception : " 
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
            this.m_Log.Write("nsHttpMail.js - getNumMessages - START"); 
            this.m_iStage=0;
             
            if (this.m_szInboxURI == null) return false;
            this.m_Log.Write("nsHttpMail.js - getNumMessages - mail box url " + this.m_szInboxURI); 
            
            this.m_HttpComms.clean();
            this.m_HttpComms.setContentType(-1);
            this.m_HttpComms.setURI(this.m_szInboxURI);
            this.m_HttpComms.setRequestMethod("PROPFIND");
            this.m_HttpComms.addData(HttpMailMailSchema,"text/xml");
            var bResult = this.m_HttpComms.send(this.mailBoxOnloadHandler);                             
            if (!bResult) throw new Error("httpConnection returned false");
                           
            this.m_Log.Write("nsHttpMail.js - getNumMessages - END"); 
            return true;
        }
        catch(e)
        {
            this.m_Log.DebugDump("nsHttpMail.js: getNumMessages : Exception : " 
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
            mainObject.m_Log.Write("nsHttpMail.js - mailBoxOnloadHandler - START"); 
            
            var httpChannel = event.QueryInterface(Components.interfaces.nsIHttpChannel);
            mainObject.m_HttpComms.clean();
            
            //if this fails we've gone somewhere new
            mainObject.m_Log.Write("nsHttpMail - mailBoxOnloadHandler - status :" +httpChannel.responseStatus );
            if (httpChannel.responseStatus <= 199 || httpChannel.responseStatus >= 300) 
                throw new Error("return status " + httpChannel.responseStatus);
                               
            var aszResponses = szResponse.match(HttpMailResponse);
            mainObject.m_Log.Write("nsHttpMail.js - mailBoxOnloadHandler - inbox - \n" + aszResponses);    
            
            if (aszResponses)
            {
                for (i=0; i<aszResponses.length; i++)
                {
                    var bRead = true;
                    if (mainObject.m_bDownloadUnread)
                    {
                        bRead = parseInt(aszResponses[i].match(HttpMailPOPRead)[1]) ? false : true;
                        mainObject.m_Log.Write("nsHttpMail.js - mailBoxOnloadHandler - bRead -" + bRead);
                    }
                    
                    if (bRead)
                    {
                        var data = new HttpMailPOPMSG();
                        data.szMSGUri = aszResponses[i].match(HttpMailHref)[1]; //uri
                        data.szMSGUri = data.szMSGUri.replace(/\/$/,"");
                        data.iSize = parseInt(aszResponses[i].match(HttpMailSize)[1]);//size 
                        mainObject.m_iTotalSize += data.iSize;
                        
                        var szTO="";
                        try
                        {                   
                            szTO = aszResponses[i].match(HttpMailPOPTo)[1].match(/[\S\d]*@[\S\d]*/);  
                        }
                        catch(err)
                        {
                            szTO = mainObject.m_szUserName;
                        }
                        data.szTo = szTO;
                        
                        var szFrom = "";
                        try
                        {
                            szFrom = aszResponses[i].match(HttpMailPOPFrom)[1].match(/[\S\d]*@[\S\d]*/);
                        }
                        catch(err)
                        {
                            szFrom = aszResponses[i].match(HttpMailPOPFrom)[1];    
                        }
                        data.szFrom = szFrom;
                        
                        var szSubject= "";
                        try
                        {
                            szSubject= aszResponses[i].match(HttpMailPOPSubject)[1];
                        }
                        catch(err){}
                        data.szSubject = szSubject;
                        
                        try
                        {
                            var aszDateTime = aszResponses[i].match(HttpMailPOPDate);
                            var aszDate = aszDateTime[1].split("-");
                            var aszTime = aszDateTime[2].split(":");

                            var date = new Date(parseInt(aszDate[0],10),  //year
                                             parseInt(aszDate[1],10)-1,  //month
                                             parseInt(aszDate[2],10),  //day
                                             parseInt(aszTime[0],10),  //hour
                                             parseInt(aszTime[1],10),  //minute
                                             parseInt(aszTime[2],10));  //second
                            data.szDate = date.toGMTString();
                        }
                        catch(err){}
                        
                        mainObject.m_aMsgDataStore.push(data);
                    }
                }
            }
        
            //server response
            mainObject.serverComms("+OK "+ mainObject.m_aMsgDataStore.length + " " + mainObject.m_iTotalSize + "\r\n");
        }   
        catch(err)
        {
             mainObject.m_Log.DebugDump("nsHttpMail.js: MailboxOnload : Exception : " 
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
            this.m_Log.Write("nsHttpMail.js - getMessageSizes - START"); 
            
            var szPOPResponse = "+OK " +  this.m_aMsgDataStore.length + " Messages\r\n"; 
            for (i = 0; i < this.m_aMsgDataStore.length; i++)
            {
                var iEmailSize = this.m_aMsgDataStore[i].iSize;
                this.m_Log.Write("nsHttpMail.js - getMessageSizes - Email Size : " +iEmailSize);
                szPOPResponse+=(i+1) + " " + iEmailSize + "\r\n";   
            } 
            szPOPResponse += ".\r\n";
            
            this.serverComms(szPOPResponse);
                   
            this.m_Log.Write("nsHttpMail.js - getMessageSizes - END"); 
            return true;
        }
        catch(e)
        {
            this.m_Log.DebugDump("nsHttpMail.js: getMessageSizes : Exception : " 
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
            this.m_Log.Write("nsHttpMail.js - getMessageIDs - START"); 
            
            var szPOPResponse = "+OK " + this.m_aMsgDataStore.length + " Messages\r\n";
            for (i = 0; i <  this.m_aMsgDataStore.length; i++)
            {
                var szEmailURL = this.m_aMsgDataStore[i].szMSGUri;
                this.m_Log.Write("nsHttpMail.js - getMessageIDs - Email URL : " +szEmailURL);
               
                var szEmailID = szEmailURL.match(HttpMailMSGIDPattern);
                                    
                this.m_Log.Write("nsHttpMail.js - getMessageIDs - IDS : " +szEmailID);    
                szPOPResponse+=(i+1) + " " + szEmailID + "\r\n"; 
            }         
            szPOPResponse += ".\r\n";
            this.serverComms(szPOPResponse);           
                     
            this.m_Log.Write("nsHttpMail.js - getMessageIDs - END"); 
            return true;
        }
        catch(e)
        {
            this.m_Log.DebugDump("nsHttpMail.js: getMessageIDs : Exception : " 
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
            this.m_Log.Write("nsHttpMail.js - getHeaders - START");  
            this.m_Log.Write("nsHttpMail.js - getHeaders - id " + lID ); 
            
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
            
            this.m_Log.Write("nsHttpMail.js - getHeaders - END");
            return true; 
        }
        catch(err)
        {
            this.m_Log.DebugDump("nsHttpMail.js: getHeaders : Exception : " 
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
            this.m_Log.Write("nsHttpMail.js - getMessage - START"); 
            this.m_Log.Write("nsHttpMail.js - getMessage - msg num" + lID);
            this.m_iStage=0;
                                  
            //get msg id
            var oMSG = this.m_aMsgDataStore[lID-1];
            var szMsgID = oMSG.szMSGUri;
            this.m_Log.Write("nsHttpMail.js - getMessage - msg id" + szMsgID); 
           
            this.m_bJunkMail = oMSG.bJunkFolder;
            this.m_iStage =0;
            //get msg from HttpMail
            this.m_HttpComms.clean();
            this.m_HttpComms.setContentType(-1);
            this.m_HttpComms.setURI(szMsgID);
            this.m_HttpComms.setRequestMethod("GET");
            var bResult = this.m_HttpComms.send(this.emailOnloadHandler);                             
            if (!bResult) throw new Error("httpConnection returned false");
                  
            this.m_Log.Write("nsHttpMail.js - getMessage - END"); 
            return true;
        }
        catch(e)
        {
             this.m_Log.DebugDump("nsHttpMail.js: getMessage : Exception : " 
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
            mainObject.m_Log.Write("nsHttpMail.js - emailOnloadHandler - START"); 
            mainObject.m_Log.Write("nsHttpMail.js - emailOnloadHandler : " + mainObject.m_iStage);  
            
            var httpChannel = event.QueryInterface(Components.interfaces.nsIHttpChannel);
            
            //if this fails we've gone somewhere new
            mainObject.m_Log.Write("nsHttpMail - emailOnloadHandler - status :" +httpChannel.responseStatus );
            if (httpChannel.responseStatus <= 199 || httpChannel.responseStatus >= 300) 
                throw new Error("return status " + httpChannel.responseStatus);
            
             switch(mainObject.m_iStage)
            {   
                case 0:  //email
                    mainObject.m_szMSG = "X-WebMail: true\r\n";
                    mainObject.m_szMSG += "X-JunkFolder: " +(mainObject.m_bJunkMail? "true":"false")+ "\r\n";
                    mainObject.m_szMSG +=szResponse;
                    mainObject.m_szMSG = mainObject.m_szMSG.replace(/^\./mg,"..");    //bit padding 
                    mainObject.m_szMSG += "\r\n.\r\n";//msg end 
                    
                    //mark email as read        
                    mainObject.m_HttpComms.clean();
                    mainObject.m_HttpComms.setContentType(-1);
                    var szUri = httpChannel.URI.spec;
                    mainObject.m_HttpComms.setURI(szUri);
                    mainObject.m_HttpComms.setRequestMethod("PROPPATCH");
                    mainObject.m_HttpComms.addData(HttpMailReadSchema,"text/xml");
                    var bResult = mainObject.m_HttpComms.send(mainObject.emailOnloadHandler);          
                    mainObject.m_iStage++;          
                break;
                
                case 1: //mark as read
                    var szPOPResponse = "+OK " +mainObject.m_szMSG.length + "\r\n";                     
                    szPOPResponse += mainObject.m_szMSG;
                    mainObject.serverComms(szPOPResponse);
                break;
            }
            mainObject.m_Log.Write("nsHttpMail.js - emailOnloadHandler - end"); 
        }
        catch(err)
        {
            mainObject.m_Log.DebugDump("nsHttpMail.js: emailOnloadHandler : Exception : " 
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
            this.m_Log.Write("nsHttpMail.js - deleteMessage - START");  
            this.m_Log.Write("nsHttpMail.js - deleteMessage - id " + lID ); 
                  
            //create URL
            var szPath = this.m_aMsgDataStore[lID-1].szMSGUri;
            this.m_Log.Write("nsHttpMail.js - deleteMessage - id " + szPath );
             
            var szStart = "<?xml version=\"1.0\"?>\r\n<D:move xmlns:D=\"DAV:\">\r\n<D:target>\r\n";
            var szEnd = "</D:target>\r\n</D:move>";
            var szMsgID =  szPath.match(HttpMailMSGIDPattern); 
            var sztemp ="<D:href>"+szMsgID+"</D:href>\r\n"
            var szData = szStart + sztemp + szEnd;
            
            this.m_iStage=0;           
            
            this.m_HttpComms.clean();
            this.m_HttpComms.setURI(szPath);
            this.m_HttpComms.setRequestMethod("MOVE");
            this.m_HttpComms.setContentType(-1);           
            this.m_HttpComms.addData(szData,"text/xml");
            
            var szDestination= this.m_szTrashURI + szMsgID + "/";
            this.m_Log.Write("nsHttpMail.js - deleteMessage - Destination " + szDestination );
            this.m_HttpComms.addRequestHeader("Destination", szDestination , false);
            var bResult = this.m_HttpComms.send(this.deleteMessageOnloadHandler);                             
            if (!bResult) throw new Error("httpConnection returned false");
                  
            this.m_Log.Write("nsHttpMail.js - deleteMessage - END");     
            return true;
        }
        catch(e)
        {
            this.m_Log.DebugDump("nsHttpMail.js: deleteMessage : Exception : " 
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
            mainObject.m_Log.Write("nsHttpMail.js - deleteMessageOnloadHandler - START");
            mainObject.m_Log.Write("nsHttpMail.js - deleteMessageOnloadHandler : " + mainObject.m_iStage);  
            
            var httpChannel = event.QueryInterface(Components.interfaces.nsIHttpChannel);
            
            //if this fails we've gone somewhere new
            mainObject.m_Log.Write("nsHttpMail - deleteMessageOnloadHandler - status :" +httpChannel.responseStatus );
            if (httpChannel.responseStatus <= 199 || httpChannel.responseStatus >= 300) 
                throw new Error("return status " + httpChannel.responseStatus);
            
            mainObject.serverComms("+OK its gone\r\n");   
              
            mainObject.m_Log.Write("nsHttpMail.js - deleteMessageOnloadHandler - END");
        }
        catch(err)
        {
            mainObject.m_Log.DebugDump("nsHttpMail.js: deleteMessageOnloadHandler : Exception : " 
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
            this.m_Log.Write("nsHttpMail.js - logOUT - START"); 
            
            var oPref = new Object();
            oPref.Value = null;
            var  WebMailPrefAccess = new WebMailCommonPrefAccess();
            WebMailPrefAccess.Get("bool","HttpMail.bEmptyTrash",oPref);
        
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
            this.m_SessionData.oHttpAuthManager = this.m_HttpComms.getHttpAuthManager();
            this.m_SessionManager.setSessionData(this.m_SessionData);
            
            if (!oPref.Value)
            {
                this.m_bAuthorised = false;
                this.serverComms("+OK Your Out\r\n");
                return true;
            }
           
            //get trash 
            this.m_HttpComms.clean();
            this.m_HttpComms.setContentType(-1);
            this.m_HttpComms.setURI(this.m_szTrashURI);
            this.m_HttpComms.setRequestMethod("PROPFIND");
            this.m_HttpComms.addData(HttpMailMailSchema,"text/xml");
            var bResult = this.m_HttpComms.send(this.logoutOnloadHandler);                             
            if (!bResult) throw new Error("httpConnection returned false");           
            this.m_iStage=0;
            this.m_Log.Write("nsHttpMail.js - logOUT - END");  
            return true;
        }
        catch(e)
        {
            this.m_Log.DebugDump("nsHttpMail.js: logOUT : Exception : " 
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
            mainObject.m_Log.Write("nsHttpMail.js - logoutOnloadHandler - START");
            mainObject.m_Log.Write("nsHttpMail.js - logoutOnloadHandler : " + mainObject.m_iStage);  
            
            var httpChannel = event.QueryInterface(Components.interfaces.nsIHttpChannel);
            
            //if this fails we've gone somewhere new
            mainObject.m_Log.Write("nsHttpMail - logoutOnloadHandler - status :" +httpChannel.responseStatus );
            if (httpChannel.responseStatus <199 || httpChannel.responseStatus >300 ) 
                throw new Error("return status " + httpChannel.responseStatus);
            
            switch(mainObject.m_iStage)
            {
              
                case 0:
                    var aszResponses = szResponse.match(HttpMailResponse);
                    mainObject.m_Log.Write("nsHttpMail.js - logoutOnloadHandler - trash - \n" + aszResponses);
                    if (aszResponses)
                    {
                        var szStart = "<?xml version=\"1.0\"?>\r\n<D:delete xmlns:D=\"DAV:\">\r\n<D:target>\r\n";                
                        var szEnd = "</D:target>\r\n</D:delete>";
                        
                        var szDeleteMsg= szStart;
                        for (i=0; i<aszResponses.length; i++)
                        {
                            var szMSGUri = aszResponses[i].match(HttpMailHref)[1]; //uri
                            var szMsgID =  szMSGUri.match(HttpMailMSGIDPattern); //id
                            var temp ="<D:href>"+szMsgID+"</D:href>\r\n"
                            szDeleteMsg+=temp;
                        }
                        szDeleteMsg+= szEnd;
                        
                        mainObject.m_HttpComms.clean();
                        mainObject.m_HttpComms.setContentType(-1);
                        mainObject.m_HttpComms.setURI(mainObject.m_szTrashURI);
                        mainObject.m_HttpComms.setRequestMethod("BDELETE");
                        mainObject.m_HttpComms.addData(szDeleteMsg,"text/xml");
                        var bResult = mainObject.m_HttpComms.send(mainObject.logoutOnloadHandler);                             
                        if (!bResult) throw new Error("httpConnection returned false");           
                        mainObject.m_iStage=1;
                    } 
                    else //no messages
                    {
                        mainObject.m_bAuthorised = false;
                        mainObject.serverComms("+OK Your Out\r\n");
                    }   
                break;
                
                case 1:
                    mainObject.m_bAuthorised = false;
                    mainObject.serverComms("+OK Your Out\r\n");
                break;  
            }
             
            mainObject.m_Log.Write("nsHttpMail.js - logoutOnloadHandler - END");
        }
        catch(err)
        {
            mainObject.m_Log.DebugDump("nsHttpMail.js: deleteMessageOnloadHandler : Exception : " 
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
            this.m_Log.Write("nsHttpMail.js - serverComms - START");
            this.m_Log.Write("nsHttpMail.js - serverComms msg " + szMsg);
            var iCount = this.m_oResponseStream.write(szMsg,szMsg.length);
            this.m_Log.Write("nsHttpMail.js - serverComms sent count: " + iCount 
                                                        +" msg length: " +szMsg.length);
            this.m_Log.Write("nsHttpMail.js - serverComms - END");  
        }
        catch(e)
        {
            this.m_Log.DebugDump("nsHttpMail.js: serverComms : Exception : " 
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
var nsHttpMailFactory = new Object();

nsHttpMailFactory.createInstance = function (outer, iid)
{
    if (outer != null) throw Components.results.NS_ERROR_NO_AGGREGATION;
    
    if (!iid.equals(nsHttpMailClassID) && !iid.equals(Components.interfaces.nsISupports))
        throw Components.results.NS_ERROR_INVALID_ARG;
    
    return new nsHttpMail();
}


/******************************************************************************/
/* MODULE */
var nsHttpMailModule = new Object();

nsHttpMailModule.registerSelf = function(compMgr, fileSpec, location, type)
{
    compMgr = compMgr.QueryInterface(Components.interfaces.nsIComponentRegistrar);
    compMgr.registerFactoryLocation(nsHttpMailClassID,
                                    "HttpMailComponent",
                                    nsHttpMailContactID, 
                                    fileSpec,
                                    location, 
                                    type);
}


nsHttpMailModule.unregisterSelf = function(aCompMgr, aFileSpec, aLocation)
{
    aCompMgr = aCompMgr.QueryInterface(Components.interfaces.nsIComponentRegistrar);
    aCompMgr.unregisterFactoryLocation(nsHttpMailClassID, aFileSpec);
}

 
nsHttpMailModule.getClassObject = function(compMgr, cid, iid)
{
    if (!cid.equals(nsHttpMailClassID))
        throw Components.results.NS_ERROR_NO_INTERFACE;

    if (!iid.equals(Components.interfaces.nsIFactory))
        throw Components.results.NS_ERROR_NOT_IMPLEMENTED;

    return nsHttpMailFactory;
}


nsHttpMailModule.canUnload = function(compMgr)
{
    return true;
}
/******************************************************************************/


function NSGetModule(compMgr, fileSpec)
{
    return nsHttpMailModule; 
}
