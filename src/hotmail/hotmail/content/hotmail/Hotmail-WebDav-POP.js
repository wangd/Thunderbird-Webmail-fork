function HotmailWebDav(oResponseStream, oLog)
{
    try
    {       
        var scriptLoader =  Components.classes["@mozilla.org/moz/jssubscript-loader;1"];
        scriptLoader = scriptLoader.getService(Components.interfaces.mozIJSSubScriptLoader);
        scriptLoader.loadSubScript("chrome://web-mail/content/common/DebugLog.js");
        scriptLoader.loadSubScript("chrome://web-mail/content/common/comms.js");
        scriptLoader.loadSubScript("chrome://hotmail/content/Hotmail-MSG.js");
        scriptLoader.loadSubScript("chrome://web-mail/content/common/CommonPrefs.js");
              
        this.m_Log = oLog; 
        this.m_Log.Write("HotmailWebDav.js - Constructor - START");   
                
        this.m_szUserName = null;   
        this.m_szPassWord = null; 
        this.m_oResponseStream = oResponseStream;       
        this.m_HttpComms = new Comms(this,this.m_Log); 
        this.m_HttpComms.setHandleHttpAuth(true);
        this.m_iStage=0; 
        this.m_szInBoxURI= null;
        this.m_szJunkMailURI = null;
        this.m_szFolderURI = null;
        this.m_szTrashURI=null;
        this.m_szMsgID = null;
        this.m_aMsgDataStore = new Array();
        this.m_iTotalSize = 0;
        this.m_szMSG = null;
      
        this.m_IOS = Components.classes["@mozilla.org/network/io-service;1"];
        this.m_IOS = this.m_IOS.getService(Components.interfaces.nsIIOService);
        
        this.m_bJunkMail = false;
        
        this.m_SessionManager = Components.classes["@mozilla.org/SessionManager;1"];
        this.m_SessionManager = this.m_SessionManager.getService();
        this.m_SessionManager.QueryInterface(Components.interfaces.nsISessionManager); 
        this.m_SessionData = null;
        
        //do i reuse the session
        var oPref = new Object();
        oPref.Value = null;
        var  WebMailPrefAccess = new WebMailCommonPrefAccess();
        if (WebMailPrefAccess.Get("bool","hotmail.bReUseSession",oPref))
            this.m_bReUseSession=oPref.Value;
        else
            this.m_bReUseSession=true; 
        
         //do i download junkmail
        var oPref = new Object();
        oPref.Value = null;
        var  WebMailPrefAccess = new WebMailCommonPrefAccess();
        if (WebMailPrefAccess.Get("bool","hotmail.bUseJunkMail",oPref))
            this.m_bUseJunkMail=oPref.Value;
        else
            this.m_bUseJunkMail=false;
                                          
        //do i download unread only
        var oPref = new Object();
        oPref.Value = null;
        var  WebMailPrefAccess = new WebMailCommonPrefAccess();
        if (WebMailPrefAccess.Get("bool","hotmail.bDownloadUnread",oPref))
            this.m_bDownloadUnread=oPref.Value;
        else
            this.m_bDownloadUnread=false; 
             
        this.m_Log.Write("HotmailWebDav.js - Constructor - END");  
    }
    catch(e)
    {
        DebugDump("HotmailWebDav.js: Constructor : Exception : " 
                                      + e.name 
                                      + ".\nError message: " 
                                      + e.message + "\n"
                                      + e.lineNumber);
    }
}



HotmailWebDav.prototype =
{
   
    logIn : function(szUserName, szPassWord)
    {
        try
        {
            this.m_Log.Write("HotmailWebDav.js - logIN - START");   
            this.m_Log.Write("HotmailWebDav.js - logIN - Username: " + szUserName 
                                                   + " Password: " + szPassWord 
                                                   + " stream: " + this.m_oResponseStream);
                        
            this.m_szUserName = szUserName;
            this.m_szPassWord = szPassWord;
            
            if (!this.m_szUserName || !this.m_oResponseStream || !this.m_szPassWord) return false;
            
            this.m_HttpComms.clean();
            
            this.m_SessionData = this.m_SessionManager.findSessionData(this.m_szUserName);
            if (this.m_SessionData && this.m_bReUseSession)
            {
                this.m_Log.Write("HotmailWebDav.js - logIN - Session Data found");
                if (!this.m_SessionData.oComponentData)
                {
                    this.m_HttpComms.setCookieManager(this.m_SessionData.oCookieManager);
                    this.m_HttpComms.setHttpAuthManager(this.m_SessionData.oHttpAuthManager); 
                }
            }

            this.m_HttpComms.setUserName(this.m_szUserName);
            this.m_HttpComms.setPassword(this.m_szPassWord);
            this.m_HttpComms.setContentType(-1);
            this.m_HttpComms.setURI("http://oe.hotmail.com/svcs/hotmail/httpmail.asp");
            this.m_HttpComms.setRequestMethod("PROPFIND");
            this.m_HttpComms.addData(HotmailPOPSchema,"text/xml");
            var bResult = this.m_HttpComms.send(this.loginOnloadHandler);                             
            if (!bResult) throw new Error("httpConnection returned false");
                        
            this.m_Log.Write("HotmailWebDav.js - logIN - END");    
            return bResult;
        }
        catch(e)
        {
            this.m_Log.DebugDump("HotmailWebDav.js: logIN : Exception : " 
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
            mainObject.m_Log.Write("HotmailWebDav.js - loginOnloadHandler - START"); 
            mainObject.m_Log.Write("HotmailWebDav.js - loginOnloadHandler : " + mainObject.m_iStage);  
            
            var httpChannel = event.QueryInterface(Components.interfaces.nsIHttpChannel);
            
            //if this fails we've gone somewhere new
            mainObject.m_Log.Write("HotmailWebDav.js - loginOnloadHandler - status :" +httpChannel.responseStatus );
           
            if (httpChannel.responseStatus != 200 && httpChannel.responseStatus != 207) 
                throw new Error("return status " + httpChannel.responseStatus);
            
            mainObject.m_HttpComms.clean();
            
            mainObject.m_szFolderURI = szResponse.match(patternHotmailPOPFolder)[1];
            mainObject.m_Log.Write("HotmailWebDav.js - loginOnloadHandler - get folder url - " + mainObject.m_szFolderURI);
            mainObject.m_szTrashURI = szResponse.match(patternHotmailPOPTrash)[1];
            mainObject.m_Log.Write("HotmailWebDav.js - loginOnloadHandler - get trash url - " + mainObject.m_szTrashURI);
            
            //server response
            mainObject.serverComms("+OK Your in\r\n");
            mainObject.m_bAuthorised = true;

            mainObject.m_Log.Write("HotmailWebDav.js - loginOnloadHandler - END");
        }
        catch(err)
        {
            mainObject.m_Log.DebugDump("HotmailWebDav.js: loginHandler : Exception : " 
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
            this.m_Log.Write("HotmailWebDav.js - getNumMessages - START"); 
            
            this.m_iStage=0;
             
            if (this.m_szFolderURI == null) return false;
            this.m_Log.Write("HotmailWebDav.js - getNumMessages - mail box url " + this.m_szFolderURI); 
                                   
            this.m_HttpComms.clean();
            this.m_HttpComms.setContentType(-1);
            this.m_HttpComms.setURI(this.m_szFolderURI);
            this.m_HttpComms.setRequestMethod("PROPFIND");
            this.m_HttpComms.addData(HotmailPOPFolderSchema,"text/xml");
            var bResult = this.m_HttpComms.send(this.mailBoxOnloadHandler);                             
            if (!bResult) throw new Error("httpConnection returned false");
           
            this.m_Log.Write("HotmailWebDav.js - getNumMessages - END"); 
            return true;
        }
        catch(e)
        {
            this.m_Log.DebugDump("HotmailWebDav.js: getNumMessages : Exception : " 
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
            mainObject.m_Log.Write("HotmailWebDav.js - mailBoxOnloadHandler - START"); 
            mainObject.m_Log.Write("HotmailWebDav.js - mailBoxOnloadHandler : " + mainObject.m_iStage);  
            
            var httpChannel = event.QueryInterface(Components.interfaces.nsIHttpChannel);
            mainObject.m_Log.Write("HotmailWebDav - mailBoxOnloadHandler - status :" +httpChannel.responseStatus );
            
            if (httpChannel.responseStatus != 200 && httpChannel.responseStatus != 207) 
                throw new Error("return status " + httpChannel.responseStatus);
            
            mainObject.m_HttpComms.clean();
                             
            switch(mainObject.m_iStage)
            {
                case 0:  //get inbox and junkmail uri
                    mainObject.m_Log.Write("HotmailWebDav.js - mailBoxOnloadHandler - get folder list - START");         
                    mainObject.m_szInBoxURI = szResponse.match(patternHotmailPOPinboxFolder)[1];//in box
                    mainObject.m_Log.Write("HotmailWebDav.js - mailBoxOnloadHandler - inBox - " + mainObject.m_szInBoxURI);
                    mainObject.m_szJunkMailURI = szResponse.match(patternHotmailPOPTrashFolder)[1];
                    mainObject.m_Log.Write("HotmailWebDav.js - mailBoxOnloadHandler - junkmail - " + mainObject.m_szJunkMailURI);
                   
                     
                    //load mail box               
                    mainObject.m_HttpComms.setContentType(-1);
                    mainObject.m_HttpComms.setURI(mainObject.m_szInBoxURI);
                    mainObject.m_HttpComms.setRequestMethod("PROPFIND");
                    mainObject.m_HttpComms.addData(HotmailPOPMailSchema,"text/xml");
                    var bResult = mainObject.m_HttpComms.send(mainObject.mailBoxOnloadHandler);                             
                    if (!bResult) throw new Error("httpConnection returned false");          
                  
                    mainObject.m_iStage++;  
                    mainObject.m_Log.Write("HotmailWebDav.js - mailBoxOnloadHandler - get folder list - end"); 
                break;
                    
                    
                case 1: //get inbox and junkmail 
                    mainObject.m_Log.Write("HotmailWebDav.js - mailBoxOnloadHandler - inbox/Junk mail uri- start");
                    
                    var aszResponses = szResponse.match(patternHotmailPOPResponse);
                    mainObject.m_Log.Write("HotmailWebDav.js - mailBoxOnloadHandler - inbox - \n" + aszResponses);
                    if (aszResponses)
                    {
                        for (i=0; i<aszResponses.length; i++)
                        {
                            var bRead = true;
                            if (mainObject.m_bDownloadUnread)
                            {
                                bRead = parseInt(aszResponses[i].match(patternHotmailPOPRead)[1]) ? false : true;
                                mainObject.m_Log.Write("HotmailWebDav.js - mailBoxOnloadHandler - bRead -" + bRead);
                            }
                            
                            if (bRead)
                            {
                                //mail url   
                                var oMSG = new HotmailMSG();
                                var szHref = aszResponses[i].match(patternHotmailPOPHref)[1];
                                mainObject.m_Log.Write("HotmailWebDav.js - mailBoxOnloadHandler - href - "+ szHref);
                                oMSG.szMSGUri = szHref;
                                oMSG.bJunkFolder = mainObject.m_bJunkMail;                          
                                //size 
                                var iSize = parseInt(aszResponses[i].match(patternHotmailPOPSize)[1]);
                                mainObject.m_Log.Write("HotmailWebDav.js - mailBoxOnloadHandler - size - "+ iSize);
                                mainObject.m_iTotalSize += iSize;
                                oMSG.iSize = iSize;
                               
                                var szTO="";
                                try
                                {                   
                                    szTO = aszResponses[i].match(patternHotmailPOPTo)[1].match(/[\S\d]*@[\S\d]*/);  
                                }
                                catch(err)
                                {
                                    szTO = mainObject.m_szUserName;
                                }
                                oMSG.szTo = szTO;
                                
                                
                                var szFrom = "";
                                try
                                {
                                    szFrom = aszResponses[i].match(patternHotmailPOPFrom)[1].match(/[\S]*@[\S]*/);
                                    if (!szFrom) throw new Error("no email");
                                }
                                catch(err)
                                {
                                    szFrom = aszResponses[i].match(patternHotmailPOPFrom)[1];    
                                }
                                oMSG.szFrom = szFrom;
                                
                                
                                var szSubject= "";
                                try
                                {
                                    szSubject= aszResponses[i].match(patternHotmailPOPSubject)[1];
                                }
                                catch(err){}
                                oMSG.szSubject = szSubject;
                                
                                try
                                {
                                    var aszDateTime = aszResponses[i].match(patternHotmailPOPDate);
                                    var aszDate = aszDateTime[1].split("-");
                                    var aszTime = aszDateTime[2].split(":");
                                    mainObject.m_Log.Write("HotmailWebDav.js - getNumMessages - "+aszDate+" "+aszTime);
                                    var date = new Date(parseInt(aszDate[0],10),  //year
                                                        parseInt(aszDate[1],10)-1,  //month
                                                        parseInt(aszDate[2],10),  //day
                                                        parseInt(aszTime[0],10)+1,  //hour
                                                        parseInt(aszTime[1],10),  //minute
                                                        parseInt(aszTime[2],10));  //second
                                    oMSG.szDate = date.toGMTString();
                                    mainObject.m_Log.Write("HotmailWebDav.js - getNumMessages - " + oMSG.szDate);
                                }
                                catch(err){}
                                
                                mainObject.m_aMsgDataStore.push(oMSG); 
                            }
                        }
                    }
                    
                    if (mainObject.m_bUseJunkMail && !mainObject.m_bJunkMail)
                    {
                        //load junkmail
                        mainObject.m_HttpComms.setContentType(-1);
                        mainObject.m_HttpComms.setURI(mainObject.m_szJunkMailURI);
                        mainObject.m_HttpComms.setRequestMethod("PROPFIND");
                        mainObject.m_HttpComms.addData(HotmailPOPMailSchema,"text/xml");
                        var bResult = mainObject.m_HttpComms.send(mainObject.mailBoxOnloadHandler);                             
                        if (!bResult) throw new Error("httpConnection returned false");
                        mainObject.m_bJunkMail = true;
                    }
                    else
                    {
                        //server response
                        mainObject.serverComms("+OK "+ mainObject.m_aMsgDataStore.length + " " + mainObject.m_iTotalSize + "\r\n");
                    }
                    
                    mainObject.m_Log.Write("HotmailWebDav.js - mailBoxOnloadHandler - inbox mail uri - end");
                break;
            }                
             
            mainObject.m_Log.Write("HotmailWebDav.js - mailBoxOnloadHandler - END"); 
            return true;
        }
        catch(e)
        {
            mainObject.m_Log.DebugDump("HotmailWebDav.js: getMessageSizes : Exception : " 
                                              + e.name 
                                              + ".\nError message: " 
                                              + e.message+ "\n"
                                              + e.lineNumber);
                                              
            mainObject.serverComms("-ERR negative vibes from " +mainObject.m_szUserName+ "\r\n");
            return false;
        }
    },
    
    
    
    //list
    getMessageSizes : function()
    {
        try
        {
            this.m_Log.Write("HotmailWebDav.js - getMessageSizes - START"); 
           
            var szPOPResponse = "+OK " + this.m_aMsgDataStore.length + " Messages\r\n"; 
           
            for (i = 0; i < this.m_aMsgDataStore.length; i++)
            {
                var iSize = this.m_aMsgDataStore[i].iSize;
                this.m_Log.Write("HotmailWebDav.js - getMessageSizes - Email Size : " +iSize);
                
                szPOPResponse+=(i+1) + " " + iSize + "\r\n"; 
            }         
            szPOPResponse += ".\r\n";
            
            this.serverComms(szPOPResponse);
                         
            this.m_Log.Write("HotmailWebDav.js - getMessageSizes - END"); 
            return true;
        }
        catch(e)
        {
            this.m_Log.DebugDump("HotmailWebDav.js: getMessageSizes : Exception : " 
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
            this.m_Log.Write("HotmailWebDav.js - getMessageIDs - START"); 
      
            var szPOPResponse = "+OK " + this.m_aMsgDataStore.length + " Messages\r\n";
            for (i = 0; i <  this.m_aMsgDataStore.length; i++)
            {
                var szURL = this.m_aMsgDataStore[i].szMSGUri;
                this.m_Log.Write("HotmailWebDav.js - getMessageIDs - Email URL : " +szURL);
               
                var szID = szURL.match(patternHotmailPOPMSGID);
                this.m_Log.Write("HotmailWebDav.js - getMessageIDs - IDS : " +szID);    
                szPOPResponse+=(i+1) + " " + szID + "\r\n";   
            }         
     
            szPOPResponse += ".\r\n";
            this.serverComms(szPOPResponse);           
                               
            this.m_Log.Write("HotmailWebDav.js - getMessage - END"); 
            return true;
        }
        catch(e)
        {
             this.m_Log.DebugDump("HotmailWebDav.js: getMessageIDs : Exception : " 
                                          + e.name + 
                                          ".\nError message: " 
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
            this.m_Log.Write("HotmailWebDav.js - getHeaders - START");  
            this.m_Log.Write("HotmailWebDav.js - getHeaders - id " + lID ); 
            
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
            
            this.m_Log.Write("HotmailWebDav.js - getHeaders - END");
            return true; 
        }
        catch(err)
        {
            this.m_Log.DebugDump("HotmailWebDav.js: getHeaders : Exception : " 
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
            this.m_Log.Write("HotmailWebDav.js - getMessage - START"); 
            this.m_Log.Write("HotmailWebDav.js - getMessage - msg num" + lID);
            this.m_iStage=0;
                                  
            //get msg id
            var oMSG = this.m_aMsgDataStore[lID-1];
            var szMsgID = oMSG.szMSGUri;
            this.m_Log.Write("HotmailWebDav.js - getMessage - msg id" + szMsgID); 
        
            this.m_bJunkMail = oMSG.bJunkFolder;
            
            //get email
            this.m_HttpComms.clean();
            this.m_HttpComms.setContentType(-1);
            this.m_HttpComms.setURI(szMsgID);
            this.m_HttpComms.setRequestMethod("GET");
            var bResult = this.m_HttpComms.send(this.emailOnloadHandler);                             
            if (!bResult) throw new Error("httpConnection returned false");
            this.m_iStage=0; 
                                         
            this.m_Log.Write("HotmailWebDav.js - getMessage - END"); 
            return true;
        }
        catch(e)
        {
             this.m_Log.DebugDump("HotmailWebDav.js: getMessage : Exception : " 
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
            mainObject.m_Log.Write("HotmailWebDav.js - emailOnloadHandler - START"); 
            mainObject.m_Log.Write("HotmailWebDav.js - emailOnloadHandler : " + mainObject.m_iStage);  
                        
            var httpChannel = event.QueryInterface(Components.interfaces.nsIHttpChannel);
            mainObject.m_Log.Write("HotmailWebDav - emailOnloadHandler - status :" +httpChannel.responseStatus );
            
            if (httpChannel.responseStatus != 200) 
                throw new Error("return status " + httpChannel.responseStatus);
            
            switch(mainObject.m_iStage)
            {   
                case 0:  //send msg to TB
                    //email
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
                    mainObject.m_HttpComms.addData(HotmailPOPReadSchema,"text/xml");
                    var bResult = mainObject.m_HttpComms.send(mainObject.emailOnloadHandler);          
                    mainObject.m_iStage++;          
                break;
                
                case 1:// mark msg as read                                                                                                   
                    mainObject.m_Log.Write("HotmailWebDav.js - emailOnloadHandler -email mark as read");     
                    var szPOPResponse = "+OK " +mainObject.m_szMSG.length + "\r\n";                     
                    szPOPResponse += mainObject.m_szMSG;
                    mainObject.serverComms(szPOPResponse);
                break;
            }
            mainObject.m_Log.Write("HotmailWebDav.js - emailOnloadHandler - end");  
        }
        catch(err)
        {
            mainObject.m_Log.DebugDump("HotmailWebDav.js: emailOnloadHandler : Exception : " 
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
            this.m_Log.Write("HotmailWebDav.js - deleteMessage - START");  
            this.m_Log.Write("HotmailWebDav.js - deleteMessage - id " + lID ); 
                  
            //create URL
            var szPath = this.m_aMsgDataStore[lID-1].szMSGUri;
            this.m_Log.Write("HotmailWebDav.js - deleteMessage - id " + szPath );
            
            var szMsgID =  szPath.match(patternHotmailPOPMSGID);  
            var szStart = "<?xml version=\"1.0\"?>\r\n<D:move xmlns:D=\"DAV:\">\r\n<D:target>\r\n";
            var szEnd = "</D:target>\r\n</D:move>";
            var szMsgID =  szPath.match(patternHotmailPOPMSGID); 
            var sztemp ="<D:href>"+szMsgID+"</D:href>\r\n"
            var szData = szStart + sztemp + szEnd;  
              
                                                         
            this.m_iStage=0;      
            this.m_HttpComms.clean();
            this.m_HttpComms.setURI(szPath);
            this.m_HttpComms.setRequestMethod("MOVE");
            this.m_HttpComms.setContentType(-1);           
            
            var szDestination= this.m_szTrashURI + szMsgID;
            this.m_Log.Write("HotmailWebDav.js - deleteMessage - Destination " + szDestination );
            this.m_HttpComms.addRequestHeader("Destination", szDestination , false);
            var bResult = this.m_HttpComms.send(this.deleteMessageOnloadHandler);                             
            if (!bResult) throw new Error("httpConnection returned false");
                            
            this.m_Log.Write("HotmailWebDav.js - deleteMessage - END");     
            return true;
        }
        catch(e)
        {
            this.m_Log.DebugDump("HotmailWebDav.js: deleteMessage : Exception : " 
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
            mainObject.m_Log.Write("HotmailWebDav.js - deleteMessageOnload - START");    
            mainObject.m_Log.Write("HotmailWebDav.js - deleteMessageOnload : " + mainObject.m_iStage);  
            
            var httpChannel = event.QueryInterface(Components.interfaces.nsIHttpChannel);
            mainObject.m_Log.Write("HotmailWebDav - deleteMessageOnload - status :" +httpChannel.responseStatus );
            
            //if this fails we've gone somewhere new
            if (httpChannel.responseStatus != 201) 
                throw new Error("return status " + httpChannel.responseStatus);
            
            mainObject.serverComms("+OK its gone\r\n");   
            
            mainObject.m_Log.Write("HotmailWebDav.js - deleteMessageOnload - END");      
        }
        catch(e)
        {
            mainObject.m_Log.DebugDump("HotmailWebDav.js: deleteMessageOnload : Exception : " 
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
            this.m_Log.Write("HotmailWebDav.js - logOUT - START"); 
            
            if (!this.m_SessionData)
            {
                this.m_SessionData = Components.classes["@mozilla.org/SessionData;1"].createInstance();
                this.m_SessionData.QueryInterface(Components.interfaces.nsISessionData);
                this.m_SessionData.szUserName = this.m_szUserName;    
            }
            this.m_SessionData.oComponentData = null;
            this.m_SessionData.oCookieManager = this.m_HttpComms.getCookieManager();
            this.m_SessionData.oHttpAuthManager = this.m_HttpComms.getHttpAuthManager();
            this.m_SessionManager.setSessionData(this.m_SessionData);
            
            this.m_bAuthorised = false;
            this.serverComms("+OK Your Out\r\n");             
                                           
            this.m_Log.Write("HotmailWebDav.js - logOUT - END");  
            return true;
        }
        catch(e)
        {
            this.m_Log.DebugDump("HotmailWebDav.js: logOUT : Exception : " 
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
            this.m_Log.Write("HotmailWebDav.js - serverComms - START");
            this.m_Log.Write("HotmailWebDav.js - serverComms msg " + szMsg);
            var iCount = this.m_oResponseStream.write(szMsg,szMsg.length);
            this.m_Log.Write("HotmailWebDav.js - serverComms sent count: " + iCount 
                                                        +" msg length: " +szMsg.length);
            this.m_Log.Write("HotmailWebDav.js - serverComms - END");  
        }
        catch(e)
        {
            this.m_Log.DebugDump("HotmailWebDav.js: serverComms : Exception : " 
                                              + e.name 
                                              + ".\nError message: " 
                                              + e.message+ "\n"
                                              + e.lineNumber);
        }
    },   
}
