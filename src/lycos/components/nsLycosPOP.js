/*****************************  Globals   *************************************/                 
const nsLycosClassID = Components.ID("{222b6e70-8a87-11d9-9669-0800200c9a66}"); 
const nsLycosContactID = "@mozilla.org/Lycos;1";

const LycosMSGIDPattern = /[^\/]+$/;

const LycosSchema = "<?xml version=\"1.0\"?>\r\n<D:propfind xmlns:D=\"DAV:\" xmlns:h=\"http://schemas.microsoft.com/hotmail/\" xmlns:hm=\"urn:schemas:httpmail:\">\r\n<D:prop>\r\n<h:adbar/>\r\n<hm:contacts/>\r\n<hm:inbox/>\r\n<hm:outbox/>\r\n<hm:sendmsg/>\r\n<hm:sentitems/>\r\n<hm:deleteditems/>\r\n<hm:drafts/>\r\n<hm:msgfolderroot/>\r\n<h:maxpoll/>\r\n<h:sig/>\r\n</D:prop>\r\n</D:propfind>\r\n";
const LycosFolderSchema = "<?xml version=\"1.0\"?>\r\n<D:propfind xmlns:D=\"DAV:\" xmlns:hm=\"urn:schemas:httpmail:\">\r\n<D:prop>\r\n<D:isfolder/>\r\n<D:displayname/>\r\n<hm:special/>\r\n<D:hassubs/>\r\n<D:nosubs/>\r\n<hm:unreadcount/>\r\n<D:visiblecount/>\r\n<hm:special/>\r\n</D:prop>\r\n</D:propfind>\r\n";
const LycosMailSchema = "<?xml version=\"1.0\"?>\r\n<D:propfind xmlns:D=\"DAV:\" xmlns:hm=\"urn:schemas:httpmail:\" xmlns:m=\"urn:schemas:mailheader:\">\r\n<D:prop>\r\n<D:isfolder/>\r\n<hm:read/>\r\n<m:hasattachment/>\r\n<m:to/>\r\n<m:from/>\r\n<m:subject/>\r\n<m:date/>\r\n<D:getcontentlength/>\r\n</D:prop>\r\n</D:propfind>\r\n";
                        
const LycosResponse = /<D:response>[\S\d\s\r\n]*?<\/D:response>/gm;

const LycosHref = /<D:href>(.*?)<\/D:href>/i;
const LycosSize = /<D:getcontentlength>(.*?)<\/D:getcontentlength>/i;

const LycosJunkPattern  = /<D:href>(.*?Courrier%20ind%26eacute;sirable.*?)<\/D:href>/;
const LycosInBoxPattern = /<D:href>(.*?inbox.*?)<\/D:href>/;
const LycosFolderPattern = /<hm:msgfolderroot>(.*?)<\/hm:msgfolderroot>/;
const LycosTrashPattern = /<hm:deleteditems>(.*?)<\/hm:deleteditems>/;
/***********************  Lycos ********************************/


function nsLycos()
{
    try
    {       
        var scriptLoader =  Components.classes["@mozilla.org/moz/jssubscript-loader;1"];
        scriptLoader = scriptLoader.getService(Components.interfaces.mozIJSSubScriptLoader);
        scriptLoader.loadSubScript("chrome://web-mail/content/common/DebugLog.js");
        scriptLoader.loadSubScript("chrome://web-mail/content/common/comms.js");
        scriptLoader.loadSubScript("chrome://web-mail/content/common/CommonPrefs.js");
        scriptLoader.loadSubScript("chrome://web-mail/content/common/base64.js");
        scriptLoader.loadSubScript("chrome://lycos/content/Lycos-POPMSG.js");
        
        
        var date = new Date();
        
        var  szLogFileName = "Lycos Log - " + date.getHours()+ "-" + date.getMinutes() + "-"+ date.getUTCMilliseconds() +" -";
        this.m_Log = new DebugLog("webmail.logging.comms", 
                                       "{3c8e8390-2cf6-11d9-9669-0800200c9a66}" ,
                                       szLogFileName); 
        
        this.m_Log.Write("nsLycos.js - Constructor - START");   
       
        this.m_szUserNameDomain = null;   
        this.m_szPassWord = null; 
        this.m_oResponseStream = null;  
        this.m_HttpComms = new Comms(this,this.m_Log);     
        this.m_bAuthorised = false;   
        this.m_szAuthRealm = null;
        this.m_iAuth = 0;
        this.m_iStage=0; 
        this.m_szInBoxURI= null;
        this.m_szJunkMailURI = null;
        this.m_szFolderURI = null;
        this.m_szTrashURI=null;
        
        this.m_aMsgDataStore = new Array();
        this.m_iTotalSize = 0;     
        this.m_bJunkMail = false;
        
        //do i download junkmail
        var oPref = new Object();
        oPref.Value = null;
        var  WebMailPrefAccess = new WebMailCommonPrefAccess();
        if (WebMailPrefAccess.Get("bool","lycos.bUseJunkMail",oPref))
            this.m_bUseJunkMail=oPref.Value;
        else
            this.m_bUseJunkMail=false;
                   
        this.m_Log.Write("nsLycos.js - Constructor - END");  
    }
    catch(e)
    {
        DebugDump("nsLycos.js: Constructor : Exception : " 
                                      + e.name 
                                      + ".\nError message: " 
                                      + e.message);
    }
}



nsLycos.prototype =
{
    get userName() {return this.m_szUserNameDomain;},
    set userName(userName) {return this.m_szUserNameDomain = userName;},
    
    get passWord() {return this.m_szPassWord;},
    set passWord(passWord) {return this.m_szPassWord = passWord;},
    
    get bAuthorised() {return this.m_bAuthorised;},
  
    get ResponseStream() {return this.m_oResponseStream;},
    set ResponseStream(responseStream) {return this.m_oResponseStream = responseStream;},
    
       
    logIn : function()
    {
        try
        {
            this.m_Log.Write("nsLycos.js - logIN - START");   
            this.m_Log.Write("nsLycos.js - logIN - Username: " + this.m_szUserNameDomain 
                                                   + " Password: "  + this.m_szPassWord 
                                                   + " stream: "    + this.m_oResponseStream);
            
            if (!this.m_szUserNameDomain || !this.m_oResponseStream || !this.m_szPassWord) return false;
            
            var szTempUserName = this.m_szUserNameDomain.split("@");
            this.m_Log.Write("nsLycos.js - logIN - doamain " + szTempUserName); 
            var szDomain = szTempUserName[1];
            
            var szLocation= null;
            if (szDomain.search(/lycos.co.uk/i)!=-1) 
                szLocation= "http://webdav.lycos.co.uk/httpmail.asp";
            else if (szDomain.search(/lycos.es/i)!=-1)
                szLocation= "http://webdav.lycos.es/httpmail.asp";
            else if (szDomain.search(/lycos.de/i)!=-1)    
                szLocation= "http://webdav.lycos.de/httpmail.asp";
            else if (szDomain.search(/lycos.it/i)!=-1)    
                szLocation= "http://webdav.lycos.it/httpmail.asp";
            else if (szDomain.search(/lycos.at/i)!=-1)    
                szLocation= "http://webdav.lycos.at/httpmail.asp";  
            else if (szDomain.search(/lycos.nl/i)!=-1)    
                szLocation= "http://webdav.lycos.nl/httpmail.asp";    
            else
                throw new Error("Unknown domain");
            
            this.m_HttpComms.clean();
            this.m_HttpComms.setContentType(-1);
            this.m_HttpComms.setURI(szLocation);
            this.m_HttpComms.setRequestMethod("PROPFIND");
            this.m_HttpComms.addData(LycosSchema,"text/xml");
            var bResult = this.m_HttpComms.send(this.loginOnloadHandler);                             
            if (!bResult) throw new Error("httpConnection returned false");
            
            this.m_Log.Write("nsLycos.js - logIN - END " + bResult);    
            return true;
        }
        catch(e)
        {
            this.m_Log.DebugDump("nsLycos.js: logIN : Exception : " 
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
            mainObject.m_Log.Write("nsLycos.js - loginOnloadHandler - START"); 
            mainObject.m_Log.Write("nsLycos.js - loginOnloadHandler : "+ mainObject.m_iStage);  
            
            var httpChannel = event.QueryInterface(Components.interfaces.nsIHttpChannel);
            mainObject.m_HttpComms.clean();
            
            //if this fails we've gone somewhere new
            mainObject.m_Log.Write("nsLycos - loginOnloadHandler - status :" +httpChannel.responseStatus );
            if (httpChannel.responseStatus != 200 
                    && httpChannel.responseStatus != 207 
                        && httpChannel.responseStatus != 401) 
                throw new Error("return status " + httpChannel.responseStatus);
            
                    
            //Authenticate
            if  (httpChannel.responseStatus == 401)
            {
                if ( mainObject.m_iAuth==2) throw new Error("login error");
                
                try
                {                
                    var szAuthenticate =  httpChannel.getResponseHeader("www-Authenticate");
                    mainObject.m_Log.Write("nsLycos.js - loginOnloadHandler - www-Authenticate " + szAuthenticate);
                    mainObject.m_iAuth++;
                }
                catch(err)
                {                   
                    throw new Error("szAuthenticate header not found")
                }     
                    
                //basic or digest
                if (szAuthenticate.search(/basic/i)!= -1)
                {//authentication on the cheap
                    mainObject.m_Log.Write("nsLycos.js - loginOnloadHandler - basic Authenticate");
                   
                    if (!mainObject.m_szAuthString) 
                    {
                        var oBase64 = new base64();
                        mainObject.m_szAuthString ="Basic ";
                        mainObject.m_szAuthString += oBase64.encode(mainObject.m_szUserNameDomain+":"+mainObject.m_szPassWord);
                    }
                    mainObject.m_HttpComms.setContentType(-1);
                    mainObject.m_HttpComms.setURI(httpChannel.URI.spec);
                    mainObject.m_HttpComms.setRequestMethod("PROPFIND");
                    mainObject.m_HttpComms.addData(LycosSchema,"text/xml");
                    mainObject.m_HttpComms.addRequestHeader("Authorization", mainObject.m_szAuthString , false);
                    var bResult = mainObject.m_HttpComms.send(mainObject.loginOnloadHandler);                             
                    if (!bResult) throw new Error("httpConnection returned false");
                }
                else if (szAuthenticate.search(/digest/i)!= -1)
                {
                    throw new Error("unspported authentication method");
                }
                else
                    throw new Error("unknown authentication method");
            } 
            else  //everything else
            {
                mainObject.m_Log.Write("nsLycos.js - loginOnloadHandler - get url - start");
                mainObject.m_iAuth=0; //reset login counter
                mainObject.m_szFolderURI = szResponse.match(LycosFolderPattern)[1];
                mainObject.m_Log.Write("nsLycos.js - loginOnloadHandler - get folder url - " + mainObject.m_szFolderURI);
                mainObject.m_szTrashURI = szResponse.match(LycosTrashPattern)[1];
                mainObject.m_Log.Write("nsLycos.js - loginOnloadHandler - get trash url - " + mainObject.m_szTrashURI);
                
                //server response
                mainObject.serverComms("+OK Your in\r\n");
                mainObject.m_bAuthorised = true;
                        
                mainObject.m_Log.Write("nsLycos.js - loginOnloadHandler - get url - end"); 
            }
           
            mainObject.m_Log.Write("nsLycos.js - loginOnloadHandler - END");
        }
        catch(err)
        {
            mainObject.m_Log.DebugDump("nsLycos.js: loginHandler : Exception : " 
                                          + err.name 
                                          + ".\nError message: " 
                                          + err.message);
                                              
            mainObject.serverComms("-ERR Comms Error\r\n");
        }
    },
    
    
    //stat 
    //total size is in octets
    getNumMessages : function()
    {
        try
        {
            this.m_Log.Write("nsLycos.js - getNumMessages - START"); 
            this.m_iStage=0;
             
            if (this.m_szFolderURI == null) return false;
            this.m_Log.Write("nsLycos.js - getNumMessages - mail box url " + this.m_szFolderURI); 
            
            this.m_HttpComms.clean();
            this.m_HttpComms.setContentType(-1);
            this.m_HttpComms.setURI(this.m_szFolderURI);
            this.m_HttpComms.setRequestMethod("PROPFIND");
            this.m_HttpComms.addData(LycosFolderSchema,"text/xml");
            this.m_HttpComms.addRequestHeader("Authorization", this.m_szAuthString , false);
            var bResult = this.m_HttpComms.send(this.mailBoxOnloadHandler);                             
            if (!bResult) throw new Error("httpConnection returned false");
                           
            this.m_Log.Write("nsLycos.js - getNumMessages - END"); 
            return true;
        }
        catch(e)
        {
            this.m_Log.DebugDump("nsLycos.js: getNumMessages : Exception : " 
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
            mainObject.m_Log.Write("nsLycos.js - mailBoxOnloadHandler - START"); 
            mainObject.m_Log.Write("nsLycos.js - mailBoxOnloadHandler : " + mainObject.m_iStage);  
            
            var httpChannel = event.QueryInterface(Components.interfaces.nsIHttpChannel);
            mainObject.m_HttpComms.clean();
            
            //if this fails we've gone somewhere new
            mainObject.m_Log.Write("nsLycos - mailBoxOnloadHandler - status :" +httpChannel.responseStatus );
            if (httpChannel.responseStatus != 200 && httpChannel.responseStatus != 207) 
                throw new Error("return status " + httpChannel.responseStatus);
           
                   
            switch(mainObject.m_iStage)
            {
                case 0:  //get inbox and junkmail uri
                    mainObject.m_Log.Write("nsLycos.js - mailBoxOnloadHandler - get folder list - START");         
                    
                    mainObject.m_szInBoxURI = szResponse.match(LycosInBoxPattern)[1]; 
                    mainObject.m_Log.Write("nsLycos.js - mailBoxOnloadHandler - inBox - " + mainObject.m_szInBoxURI); 
                       
                    mainObject.m_szJunkMailURI = szResponse.match(LycosJunkPattern)[1];
                    mainObject.m_Log.Write("nsLycos.js - mailBoxOnloadHandler - junkmail - " + mainObject.m_szJunkMailURI);
                  
                    //load mailbox
                    mainObject.m_HttpComms.setContentType(-1);
                    mainObject.m_HttpComms.setURI(mainObject.m_szInBoxURI);
                    mainObject.m_HttpComms.setRequestMethod("PROPFIND");
                    mainObject.m_HttpComms.addData(LycosMailSchema,"text/xml");
                    mainObject.m_HttpComms.addRequestHeader("Authorization", mainObject.m_szAuthString , false);
                    var bResult = mainObject.m_HttpComms.send(mainObject.mailBoxOnloadHandler);                             
                    if (!bResult) throw new Error("httpConnection returned false");
                                        
                    mainObject.m_iStage++;  
                    mainObject.m_Log.Write("nsLycos.js - mailBoxOnloadHandler - get folder list - end"); 
                break;
                    
                    
                case 1: //get inbox and junkmail uri
                    mainObject.m_Log.Write("nsLycos.js - mailBoxOnloadHandler - inbox mail uri- start");
                    
                    var aszResponses = szResponse.match(LycosResponse);
                    mainObject.m_Log.Write("nsLycos.js - mailBoxOnloadHandler - inbox - \n" + aszResponses);
                    if (aszResponses)
                    {
                        for (i=0; i<aszResponses.length; i++)
                        {
                            var data = new LycosPOPMSG();
                            data.szMSGUri = aszResponses[i].match(LycosHref)[1]; //uri
                            data.iSize = parseInt(aszResponses[i].match(LycosSize)[1]);//size 
                            mainObject.m_iTotalSize += data.iSize;
                            data.bJunkFolder = false;
                            mainObject.m_aMsgDataStore.push(data);
                        }
                    }
                    
                    if (mainObject.m_bUseJunkMail)
                    {
                        //load junkmail
                        mainObject.m_HttpComms.setContentType(-1);
                        mainObject.m_HttpComms.setURI(mainObject.m_szJunkMailURI);
                        mainObject.m_HttpComms.setRequestMethod("PROPFIND");
                        mainObject.m_HttpComms.addData(LycosMailSchema,"text/xml");
                        mainObject.m_HttpComms.addRequestHeader("Authorization", mainObject.m_szAuthString , false);
                        var bResult = mainObject.m_HttpComms.send(mainObject.mailBoxOnloadHandler);                             
                        if (!bResult) throw new Error("httpConnection returned false");
                    }
                    else
                    {
                        //server response
                        mainObject.serverComms("+OK "+ mainObject.m_aMsgDataStore.length + " " + mainObject.m_iTotalSize + "\r\n");
                    }
                    mainObject.m_iStage++; 
                    mainObject.m_Log.Write("nsLycos.js - mailBoxOnloadHandler - inbox mail uri - end");
                break; 
                
                case 2:
                    mainObject.m_Log.Write("nsLycos.js - mailBoxOnloadHandler - junkmail uri- start");
                    
                    var aszResponses = szResponse.match(LycosResponse);
                    mainObject.m_Log.Write("nsLycos.js - mailBoxOnloadHandler - junkmail - \n" + aszResponses);
                    
                    if (aszResponses)
                    {
                        for (i=0; i<aszResponses.length; i++)
                        {      
                            var data = new LycosPOPMSG();
                            data.szMSGUri = aszResponses[i].match(LycosHref)[1]; //uri
                            data.iSize = parseInt(aszResponses[i].match(LycosSize)[1]);//size 
                            mainObject.m_iTotalSize += data.iSize;
                            data.bJunkFolder = true;
                            mainObject.m_aMsgDataStore.push(data);
                        }
                    }
                    
                    //server response
                    mainObject.serverComms("+OK "+ mainObject.m_aMsgDataStore.length + " " + mainObject.m_iTotalSize + "\r\n");

                    mainObject.m_Log.Write("nsLycos.js - mailBoxOnloadHandler - junkmail uri - end");
                break;                    
            }       
        }
        catch(err)
        {
             mainObject.m_Log.DebugDump("nsLycos.js: MailboxOnload : Exception : " 
                                              + err.name 
                                              + ".\nError message: " 
                                              + err.message);
            
             mainObject.serverComms("-ERR Comms Error\r\n");
        }
    },
    
                      
    //list
    getMessageSizes : function() 
    {
        try
        {
            this.m_Log.Write("nsLycos.js - getMessageSizes - START"); 
            
            var szPOPResponse = "+OK " +  this.m_aMsgDataStore.length + " Messages\r\n"; 
            for (i = 0; i < this.m_aMsgDataStore.length; i++)
            {
                var iEmailSize = this.m_aMsgDataStore[i].iSize;
                this.m_Log.Write("nsLycos.js - getMessageSizes - Email Size : " +iEmailSize);
                szPOPResponse+=(i+1) + " " + iEmailSize + "\r\n";   
            } 
            szPOPResponse += ".\r\n";
            
            this.serverComms(szPOPResponse);
                   
            this.m_Log.Write("nsLycos.js - getMessageSizes - END"); 
            return true;
        }
        catch(e)
        {
            this.m_Log.DebugDump("nsLycos.js: getMessageSizes : Exception : " 
                                          + e.name 
                                          + ".\nError message: " 
                                          + e.message);
            return false;
        }
    },
    
    
    
    //IUDL
    getMessageIDs : function()
    {
        try
        {
            this.m_Log.Write("nsLycos.js - getMessageIDs - START"); 
            
            var szPOPResponse = "+OK " + this.m_aMsgDataStore.length + " Messages\r\n";
            for (i = 0; i <  this.m_aMsgDataStore.length; i++)
            {
                var szEmailURL = this.m_aMsgDataStore[i].szMSGUri;
                this.m_Log.Write("nsLycos.js - getMessageIDs - Email URL : " +szEmailURL);
               
                var szEmailID = szEmailURL.match(LycosMSGIDPattern);
                                    
                this.m_Log.Write("nsLycos.js - getMessageIDs - IDS : " +szEmailID);    
                szPOPResponse+=(i+1) + " " + szEmailID + "\r\n"; 
            }         
            szPOPResponse += ".\r\n";
            this.serverComms(szPOPResponse);           
                     
            this.m_Log.Write("nsLycos.js - getMessageIDs - END"); 
            return true;
        }
        catch(e)
        {
            this.m_Log.DebugDump("nsLycos.js: getMessageIDs : Exception : " 
                                          + e.name 
                                          + ".\nError message: " 
                                          + e.message);
            return false;
        }
    },
      



    //top
    getMessageHeaders : function(lID)
    {
        try
        {
            this.m_Log.Write("nsLycos.js - getHeaders - START");  
            this.m_Log.Write("nsLycos.js - getHeaders - id " + lID ); 
            
            this.serverComms("-ERR negative vibes\r\n");
            
            this.m_Log.Write("nsLycos.js - getHeaders - END");
            return true; 
        }
        catch(err)
        {
            this.m_Log.DebugDump("nsLycos.js: getHeaders : Exception : " 
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
            this.m_Log.Write("nsLycos.js - getMessage - START"); 
            this.m_Log.Write("nsLycos.js - getMessage - msg num" + lID);
            this.m_iStage=0;
                                  
            //get msg id
            var oMSG = this.m_aMsgDataStore[lID-1]
            var szMsgID = oMSG.szMSGUri;
            this.m_Log.Write("nsLycos.js - getMessage - msg id" + szMsgID); 
           
            this.m_bJunkMail = oMSG.bJunkFolder;
             
            //get msg from lycos
            this.m_HttpComms.clean();
            this.m_HttpComms.setContentType(-1);
            this.m_HttpComms.setURI(szMsgID);
            this.m_HttpComms.setRequestMethod("GET");
            this.m_HttpComms.addRequestHeader("Authorization", this.m_szAuthString , false);
            var bResult = this.m_HttpComms.send(this.emailOnloadHandler);                             
            if (!bResult) throw new Error("httpConnection returned false");
                  
            this.m_Log.Write("nsLycos.js - getMessage - END"); 
            return true;
        }
        catch(e)
        {
             this.m_Log.DebugDump("nsLycos.js: getMessage : Exception : " 
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
            mainObject.m_Log.Write("nsLycos.js - emailOnloadHandler - START"); 
            mainObject.m_Log.Write("nsLycos.js - emailOnloadHandler : " + mainObject.m_iStage);  
            
            var httpChannel = event.QueryInterface(Components.interfaces.nsIHttpChannel);
            
            //if this fails we've gone somewhere new
            mainObject.m_Log.Write("nsLycos - emailOnloadHandler - status :" +httpChannel.responseStatus );
            if (httpChannel.responseStatus != 200) 
                throw new Error("return status " + httpChannel.responseStatus);
            
            //server response
            var szMsg =  "X-WebMail: true\r\n";
            szMsg += "X-JunkFolder: " +(mainObject.m_bJunkMail? "true":"false")+"\r\n";
            szMsg += szResponse;
            
            szMsg = szMsg.replace(/^\./mg,"..");    //bit padding 
            if (szMsg.lastIndexOf("\r\n") == -1) szMsg += "\r\n";
            szMsg += ".\r\n";  //msg end 
                                                                                                              
            var szPOPResponse = "+OK " + szMsg.length + "\r\n";                     
            szPOPResponse += szMsg;
            mainObject.serverComms(szPOPResponse);           
            mainObject.m_Log.Write("nsLycos.js - emailOnloadHandler - end"); 
        }
        catch(err)
        {
            mainObject.m_Log.DebugDump("nsLycos.js: emailOnloadHandler : Exception : " 
                                              + err.name 
                                              + ".\nError message: " 
                                              + err.message);
            
            mainObject.serverComms("-ERR Comms Error\r\n");
        }    
    },
                                    
      
    //dele
    deleteMessage : function(lID)
    {
        try
        {
            this.m_Log.Write("nsLycos.js - deleteMessage - START");  
            this.m_Log.Write("nsLycos.js - deleteMessage - id " + lID ); 
                  
            //create URL
            var szPath = this.m_aMsgDataStore[lID-1].szMSGUri;
            this.m_Log.Write("nsLycos.js - deleteMessage - id " + szPath );
                       
           
            this.m_iStage=0;           
            
            this.m_HttpComms.clean();
            this.m_HttpComms.setURI(szPath);
            this.m_HttpComms.setRequestMethod("MOVE");
            this.m_HttpComms.setContentType(-1);           
            var szMsgID =  szPath.match(LycosMSGIDPattern); 
            var szDestination= this.m_szTrashURI + szMsgID;
            this.m_Log.Write("nsLycos.js - deleteMessage - Destination " + szDestination );
            this.m_HttpComms.addRequestHeader("Destination", szDestination , false);
            this.m_HttpComms.addRequestHeader("Authorization", this.m_szAuthString , false);
            var bResult = this.m_HttpComms.send(this.deleteMessageOnloadHandler);                             
            if (!bResult) throw new Error("httpConnection returned false");
                  
            this.m_Log.Write("nsLycos.js - deleteMessage - END");     
            return true;
        }
        catch(e)
        {
            this.m_Log.DebugDump("nsLycos.js: deleteMessage : Exception : " 
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
            mainObject.m_Log.Write("nsLycos.js - deleteMessageOnloadHandler - START");
            mainObject.m_Log.Write("nsLycos.js - emailOnloadHandler : " + mainObject.m_iStage);  
            
            var httpChannel = event.QueryInterface(Components.interfaces.nsIHttpChannel);
            
            //if this fails we've gone somewhere new
            mainObject.m_Log.Write("nsLycos - emailOnloadHandler - status :" +httpChannel.responseStatus );
            if (httpChannel.responseStatus != 201) 
                throw new Error("return status " + httpChannel.responseStatus);
            
            mainObject.serverComms("+OK its gone\r\n");   
              
            mainObject.m_Log.Write("nsLycos.js - deleteMessageOnloadHandler - END");
        }
        catch(err)
        {
            mainObject.m_Log.DebugDump("nsLycos.js: deleteMessageOnloadHandler : Exception : " 
                                              + err.name 
                                              + ".\nError message: " 
                                              + err.message);
            
            mainObject.serverComms("-ERR Comms Error\r\n");
        }
    },
    
    
    
    logOut : function()
    {
        try
        {
            this.m_Log.Write("nsLycos.js - logOUT - START"); 
            
            this.m_bAuthorised = false;
            this.serverComms("+OK your out\r\n");                 
            
            this.m_Log.Write("nsLycos.js - logOUT - END");  
            return true;
        }
        catch(e)
        {
            this.m_Log.DebugDump("nsLycos.js: logOUT : Exception : " 
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
            this.m_Log.Write("nsLycos.js - serverComms - START");
            this.m_Log.Write("nsLycos.js - serverComms msg " + szMsg);
            var iCount = this.m_oResponseStream.write(szMsg,szMsg.length);
            this.m_Log.Write("nsLycos.js - serverComms sent count: " + iCount 
                                                        +" msg length: " +szMsg.length);
            this.m_Log.Write("nsLycos.js - serverComms - END");  
        }
        catch(e)
        {
            this.m_Log.DebugDump("nsLycos.js: serverComms : Exception : " 
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
var nsLycosFactory = new Object();

nsLycosFactory.createInstance = function (outer, iid)
{
    if (outer != null) throw Components.results.NS_ERROR_NO_AGGREGATION;
    
    if (!iid.equals(nsLycosClassID) && !iid.equals(Components.interfaces.nsISupports))
        throw Components.results.NS_ERROR_INVALID_ARG;
    
    return new nsLycos();
}


/******************************************************************************/
/* MODULE */
var nsLycosModule = new Object();

nsLycosModule.registerSelf = function(compMgr, fileSpec, location, type)
{
    compMgr = compMgr.QueryInterface(Components.interfaces.nsIComponentRegistrar);
    compMgr.registerFactoryLocation(nsLycosClassID,
                                    "LycosComponent",
                                    nsLycosContactID, 
                                    fileSpec,
                                    location, 
                                    type);
}


nsLycosModule.unregisterSelf = function(aCompMgr, aFileSpec, aLocation)
{
    aCompMgr = aCompMgr.QueryInterface(Components.interfaces.nsIComponentRegistrar);
    aCompMgr.unregisterFactoryLocation(nsLycosClassID, aFileSpec);
}

 
nsLycosModule.getClassObject = function(compMgr, cid, iid)
{
    if (!cid.equals(nsLycosClassID))
        throw Components.results.NS_ERROR_NO_INTERFACE;

    if (!iid.equals(Components.interfaces.nsIFactory))
        throw Components.results.NS_ERROR_NOT_IMPLEMENTED;

    return nsLycosFactory;
}


nsLycosModule.canUnload = function(compMgr)
{
    return true;
}
/******************************************************************************/


function NSGetModule(compMgr, fileSpec)
{
    return nsLycosModule; 
}
