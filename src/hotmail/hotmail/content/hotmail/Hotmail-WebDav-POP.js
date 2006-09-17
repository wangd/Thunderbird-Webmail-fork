function HotmailWebDav(oResponseStream, oLog, oPrefData)
{
    try
    {       
        var scriptLoader =  Components.classes["@mozilla.org/moz/jssubscript-loader;1"];
        scriptLoader = scriptLoader.getService(Components.interfaces.mozIJSSubScriptLoader);
        scriptLoader.loadSubScript("chrome://web-mail/content/common/DebugLog.js");
        scriptLoader.loadSubScript("chrome://web-mail/content/common/HttpComms2.js");
        scriptLoader.loadSubScript("chrome://hotmail/content/Hotmail-MSG.js");
        scriptLoader.loadSubScript("chrome://hotmail/content/Hotmail-Prefs-Data.js");
              
        this.m_Log = oLog; 
        this.m_Log.Write("HotmailWebDav.js - Constructor - START");   
              
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
      
        this.m_IOS = Components.classes["@mozilla.org/network/io-service;1"];
        this.m_IOS = this.m_IOS.getService(Components.interfaces.nsIIOService);

        this.m_Timer = Components.classes["@mozilla.org/timer;1"];
        this.m_Timer = this.m_Timer.createInstance(Components.interfaces.nsITimer);
           
        this.m_SessionManager = Components.classes["@mozilla.org/SessionManager;1"]
                                          .getService(Components.interfaces.nsISessionManager);
        this.m_SessionData = null;
             
        this.m_iTime = oPrefData.iProcessDelay;            //timer delay
        this.m_iProcessAmount =  oPrefData.iProcessAmount; //delay proccess amount
        this.m_bReUseSession = oPrefData.bReUseSession;    //do i reuse the session
        this.m_bUseJunkMail= oPrefData.bUseJunkMail;       //do i download junkmail
        this.m_bDownloadUnread = oPrefData.bDownloadUnread; //do i download unread only
        this.m_bMarkAsRead = oPrefData.bMarkAsRead;         //do i mark email as read
         
        this.m_szTrashURI=null;
        this.m_aszFolderURLList = new Array();

        //process folders
        this.m_aszFolders = new Array();
        this.m_aszFolders.push("Active"); //Inbox
        if (oPrefData.bUseJunkMail)  this.m_aszFolders.push("HM_BuLkMail_"); //junk
        for(var i=0; i<oPrefData.aszFolder.length; i++)
        {
            this.m_aszFolders.push(oPrefData.aszFolder[i]);
        }
        this.m_Log.Write("HotmailWebDav.js - Constructor - this.m_aszFolders "+ this.m_aszFolders);
       
        this.m_bStat = false;
    
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
            
            if (this.m_bReUseSession)
            {
                this.m_Log.Write("HotmailWebDav.js - logIN - Getting Seassion Data");
                this.m_SessionData = this.m_SessionManager.findSessionData(this.m_szUserName);
                if (this.m_SessionData)
                {
                    this.m_Log.Write("HotmailWebDav.js - logIN - Session Data found");
                    if (this.m_SessionData.oCookieManager)
                        this.m_HttpComms.setCookieManager(this.m_SessionData.oCookieManager);
                    
                    if (this.m_SessionData.oHttpAuthManager)
                        this.m_HttpComms.setHttpAuthManager(this.m_SessionData.oHttpAuthManager); 
                }
            }
            
            this.m_iStage=0;
            this.m_HttpComms.setUserName(this.m_szUserName);
            this.m_HttpComms.setPassword(this.m_szPassWord);
            this.m_HttpComms.setURI("http://oe.hotmail.com/svcs/hotmail/httpmail.asp");
            this.m_HttpComms.setRequestMethod("PROPFIND");
            this.m_HttpComms.setContentType("text/xml");
            this.m_HttpComms.addData(HotmailSchema);
            var bResult = this.m_HttpComms.send(this.loginOnloadHandler, this);                             
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
        
            switch(mainObject.m_iStage)
            {
                case 0: //get baisc uri's
                    var szFolderURI = szResponse.match(patternHotmailFolder)[1];
                    mainObject.m_Log.Write("HotmailWebDav.js - loginOnloadHandler - get folder url - " + szFolderURI);
                    mainObject.m_szTrashURI = szResponse.match(patternHotmailTrash)[1];
                    mainObject.m_Log.Write("HotmailWebDav.js - loginOnloadHandler - get trash url - " + mainObject.m_szTrashURI);
                    
                    //download folder list;
                    mainObject.m_iStage = 1;
                    mainObject.m_HttpComms.setContentType("text/xml");
                    mainObject.m_HttpComms.setURI(szFolderURI);
                    mainObject.m_HttpComms.setRequestMethod("PROPFIND");
                    mainObject.m_HttpComms.addData(HotmailFolderSchema);
                    var bResult = mainObject.m_HttpComms.send(mainObject.loginOnloadHandler, mainObject);                             
                    if (!bResult) throw new Error("httpConnection returned false");
                break;
                
                case 1: //process folder uri's

                    var aszFolderList = szResponse.match(patternHotmailResponse);
                    mainObject.m_Log.Write("HotmailWebDav.js - loginOnloadHandler - aszFolderList :" +aszFolderList);
                    
                    for (j=0; j<mainObject.m_aszFolders.length; j++)
                    {
                        var regExp = new RegExp("^"+mainObject.m_aszFolders[j]+"$","i");
                        mainObject.m_Log.Write("HotmailWebDav.js - loginOnloadHandler - regExp : "+regExp );
                        
                        for (var i=0; i<aszFolderList.length; i++)
                        {
                            var szFolderURL = aszFolderList[i].match(patternHotmailHref)[1];
                            mainObject.m_Log.Write("HotmailWebDav.js - loginOnloadHandler - szFolderURL : "+szFolderURL );
                            var szFolderName = szFolderURL.match(patternHotmailFolderName)[1];
                            mainObject.m_Log.Write("HotmailWebDav.js - loginOnloadHandler - szFolderName : "+szFolderName );
                            var szDisplayName = "";
                            if (aszFolderList[i].search(patternHotmailDisplayName)!=-1)
                                szDisplayName =aszFolderList[i].match(patternHotmailDisplayName)[1];
                            mainObject.m_Log.Write("HotmailWebDav.js - loginOnloadHandler - szDisplayName : "+szDisplayName );
                            
                            if (szFolderName.search(regExp)!=-1 || szDisplayName.search(regExp)!=-1)
                            {
                                mainObject.m_aszFolderURLList.push(szFolderURL);
                                mainObject.m_Log.Write("HotmailWebDav.js - loginOnloadHandler - URL found : "+szFolderURL);
                            }
                        }
                    }
                    
                    //server response
                    mainObject.serverComms("+OK Your in\r\n");
                    mainObject.m_bAuthorised = true;
                break;
            }

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
             
            if (this.m_aszFolderURLList.length==0) return false;
            this.m_Log.Write("HotmailWebDav.js - getNumMessages - mail box url " + this.m_aszFolderURLList); 
                                   
            this.m_HttpComms.setContentType("text/xml");
            var szUri = this.m_aszFolderURLList.shift(); 
            this.m_HttpComms.setURI(szUri);
            this.m_HttpComms.setRequestMethod("PROPFIND");
            this.m_HttpComms.addData(HotmailMailSchema);
            var bResult = this.m_HttpComms.send(this.mailBoxOnloadHandler, this);                             
            if (!bResult) throw new Error("httpConnection returned false");
            this.m_bStat = true;
          
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
                             
            var aszResponses = szResponse.match(patternHotmailResponse);
            mainObject.m_Log.Write("HotmailWebDav.js - mailBoxOnloadHandler - inbox - \n" + aszResponses);
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
                mainObject.m_HttpComms.addData(HotmailMailSchema);
                var bResult = mainObject.m_HttpComms.send(mainObject.mailBoxOnloadHandler, mainObject);                             
                if (!bResult) throw new Error("httpConnection returned false");
            }
            else
            {   
                mainObject.m_Log.Write("HotmailWebDav.js - mailBoxOnloadHandler - download complet e- starting delay");
                //start timer
                mainObject.m_Timer.initWithCallback(mainObject, 
                                                    mainObject.m_iTime, 
                                                    Components.interfaces.nsITimer.TYPE_REPEATING_SLACK);
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
    
    
    notify : function(timer)
    {
        try
        {
            this.m_Log.Write("HotmailWebDav.js - notify - START");

            if (this.m_aRawData.length>0)
            {   
                var iCount=0;
                do{
                    var Item = this.m_aRawData.shift();
                    this.processItem(Item);   
                    iCount++;
                    this.m_Log.Write("HotmailWebDav.js - notify - rawData icount " + iCount + " " + this.m_aRawData.length);
                }while(iCount != this.m_iProcessAmount && this.m_aRawData.length!=0)

            }
            else
            {
                this.m_Log.Write("HotmailWebDav.js - notify - all data handled"); 
                this.m_Timer.cancel();
                
                if (this.m_bStat) //called by stat
                {
                    //server response
                    this.serverComms("+OK "+ this.m_aMsgDataStore.length + " " + this.m_iTotalSize + "\r\n");
                }
                else //called by list
                {
                    this.serverComms("+OK " + this.m_aMsgDataStore.length + " Messages\r\n");
                    this.m_Log.Write("HotmailWebDav.js - notify - : " + this.m_aMsgDataStore.length);
     
                    for (i = 0; i <  this.m_aMsgDataStore.length; i++)
                    {
                        var iEmailSize = this.m_aMsgDataStore[i].iSize; 
                        this.serverComms((i+1) + " " + iEmailSize + "\r\n");      
                    }         
                   
                    this.serverComms(".\r\n");
                }
                
                delete  this.m_aRawData;
            }
          
            this.m_Log.Write("HotmailWebDav.js - notify - END"); 
        }
        catch(err)
        {
            this.m_Timer.cancel();
            this.m_Log.DebugDump("HotmailWebDav.js: notify : Exception : " 
                                              + err.name 
                                              + ".\nError message: " 
                                              + err.message+ "\n"
                                              + err.lineNumber);
                                              
            this.serverComms("-ERR negative vibes from " +this.m_szUserName+ "\r\n");
        }
    },
    
    
    
    processItem : function (rawData)
    {
        this.m_Log.Write("HotmailWebDav.js - processItem - START");
        this.m_Log.Write("HotmailWebDav.js - processItem - rawData " +rawData);
        
        var bRead = true;
        if (this.m_bDownloadUnread)
        {
            bRead = parseInt(rawData.match(patternHotmailRead)[1]) ? false : true;
            this.m_Log.Write("HotmailWebDav.js - processItem - bRead -" + bRead);
        }
        
        if (bRead)
        {
            //mail url   
            var oMSG = new HotmailMSG();
            var szHref = rawData.match(patternHotmailHref)[1];
            this.m_Log.Write("HotmailWebDav.js - processItem - href - "+ szHref);
            oMSG.szMSGUri = szHref;
            
            //size 
            var iSize = parseInt(rawData.match(patternHotmailSize)[1]);
            this.m_Log.Write("HotmailWebDav.js - processItem - size - "+ iSize);
            this.m_iTotalSize += iSize;
            oMSG.iSize = iSize;
           
            var szTO="";
            try
            {                   
                szTO = rawData.match(patternHotmailTo)[1].match(/[\S\d]*@[\S\d]*/);  
            }
            catch(err)
            {
                szTO = this.m_szUserName;
            }
            oMSG.szTo = szTO;
            
            
            var szFrom = "";
            try
            {
                szFrom = rawData.match(patternHotmailFrom)[1].match(/[\S]*@[\S]*/);
                if (!szFrom) throw new Error("no sender");
            }
            catch(err)
            {
                szFrom = rawData.match(patternHotmailFrom)[1];    
            }
            oMSG.szFrom = szFrom;
            
            
            var szSubject= "";
            try
            {
                szSubject= rawData.match(patternHotmailSubject)[1];
            }
            catch(err){}
            oMSG.szSubject = szSubject;
            
            try
            {
                var aszDateTime = rawData.match(patternHotmailDate);
                var aszDate = aszDateTime[1].split("-");
                var aszTime = aszDateTime[2].split(":");
                this.m_Log.Write("HotmailWebDav.js - processItem - "+aszDate+" "+aszTime);
                var date = new Date(parseInt(aszDate[0],10),  //year
                                    parseInt(aszDate[1],10)-1,  //month
                                    parseInt(aszDate[2],10),  //day
                                    parseInt(aszTime[0],10)+1,  //hour
                                    parseInt(aszTime[1],10),  //minute
                                    parseInt(aszTime[2],10));  //second
                oMSG.szDate = date.toGMTString();
                this.m_Log.Write("HotmailWebDav.js - processItem - " + oMSG.szDate);
            }
            catch(err){}
            
            this.m_aMsgDataStore.push(oMSG); 
        }
        
        this.m_Log.Write("HotmailWebDav.js - processItem - END");
    },   
    
    
       
    //list
    getMessageSizes : function()
    {
        try
        {
            this.m_Log.Write("HotmailWebDav.js - getMessageSizes - START"); 
   
            if (this.m_bStat) 
            {  //msg table has been donwloaded            
                this.m_Log.Write("HotmailWebDav.js - getMessageSizes - getting sizes"); 
                this.m_Log.Write("nsYahoo.js - getMessagesSizes - : " + this.m_aMsgDataStore.length);
                
                this.serverComms("+OK " + this.m_aMsgDataStore.length + " Messages\r\n"); 

                for (i = 0; i < this.m_aMsgDataStore.length; i++)
                {
                    var iSize = this.m_aMsgDataStore[i].iSize;
                    this.m_Log.Write("HotmailWebDav.js - getMessageSizes - Email Size : " +iSize);
                    this.serverComms((i+1) + " " + iSize + "\r\n"); 
                }         
                
                this.serverComms(".\r\n");
            }
            else
            { //download msg list
                this.m_Log.Write("HotmailWebDav.js - getMessageSizes - calling stat");
               
                if (this.m_szFolderURI == null) return false;
                this.m_Log.Write("HotmailWebDav.js - getNumMessages - mail box url " + this.m_szFolderURI); 
                                
                this.m_HttpComms.setContentType("text/xml");
                this.m_HttpComms.setURI(this.m_szFolderURI);
                this.m_HttpComms.setRequestMethod("PROPFIND");
                this.m_HttpComms.addData(HotmailFolderSchema);
                var bResult = this.m_HttpComms.send(this.mailBoxOnloadHandler, this);                             
                if (!bResult) throw new Error("httpConnection returned false");
            }
   
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

            this.serverComms("+OK " + this.m_aMsgDataStore.length + " Messages\r\n");
            for (i = 0; i <  this.m_aMsgDataStore.length; i++)
            {
                var szURL = this.m_aMsgDataStore[i].szMSGUri;
                this.m_Log.Write("HotmailWebDav.js - getMessageIDs - Email URL : " +szURL);
               
                var szID = szURL.match(patternHotmailMSGID);
                this.m_Log.Write("HotmailWebDav.js - getMessageIDs - IDS : " +szID);    
                this.serverComms((i+1) + " " + szID + "\r\n"); 
            }         
     
            this.serverComms(".\r\n");           
                       
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
            var szFolderURI = oMSG.szMSGUri.match(patternHotmailFolderName)[1];
            this.m_Log.Write("HotmailWebDav.js - getHeaders - get folder url - " + szFolderURI);
            
            var szCleanName = szFolderURI;
            if (szFolderURI.search(/active/i)!=-1) szCleanName = "Inbox"
            else if (szFolderURI.search(/BuLkMail/i)!=-1) szCleanName = "Spam";
            this.m_Log.Write("HotmailWebDav.js - getHeaders - szCleanName - " + szCleanName); 
            
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

            this.m_Log.Write("HotmailWebDav.js - getHeaders - END");
            return true; 
        }
        catch(e)
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
            this.m_Log.Write("HotmailWebDav.js - getMessage - msg url" + oMSG.szMSGUri); 
        
            //get email
            this.m_HttpComms.setURI(oMSG.szMSGUri);
            this.m_HttpComms.setRequestMethod("GET");
            var bResult = this.m_HttpComms.send(this.emailOnloadHandler, this);                             
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
                      
                    var szUri = httpChannel.URI.spec;
                    mainObject.m_Log.Write("HotmailWebDav.js - loginOnloadHandler - szUri - " + szUri);
                    
                    var szFolderName= szUri.match(patternHotmailFolderName)[1];
                    mainObject.m_Log.Write("HotmailWebDav.js - loginOnloadHandler - szFolderName - " + szFolderName);
                    
                    var szCleanName = szFolderName;
                    if (szFolderName.search(/active/i)!=-1) szCleanName = "Inbox"
                    else if (szFolderName.search(/BuLkMail/i)!=-1) szCleanName = "Spam";
                    mainObject.m_Log.Write("HotmailWebDav.js - loginOnloadHandler - szCleanName - " + szCleanName);    
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
                        mainObject.m_HttpComms.addData(HotmailReadSchema);
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
            
            var szMsgID =  szPath.match(patternHotmailMSGID);  
            var szStart = "<?xml version=\"1.0\"?>\r\n<D:move xmlns:D=\"DAV:\">\r\n<D:target>\r\n";
            var szEnd = "</D:target>\r\n</D:move>";
            var szMsgID =  szPath.match(patternHotmailMSGID); 
            var sztemp ="<D:href>"+szMsgID+"</D:href>\r\n"
            var szData = szStart + sztemp + szEnd;  
              
                                                         
            this.m_iStage=0;      
            this.m_HttpComms.setURI(szPath);
            this.m_HttpComms.setRequestMethod("MOVE");           
            
            var szDestination= this.m_szTrashURI + szMsgID;
            this.m_Log.Write("HotmailWebDav.js - deleteMessage - Destination " + szDestination );
            this.m_HttpComms.addRequestHeader("Destination", szDestination , false);
            var bResult = this.m_HttpComms.send(this.deleteMessageOnloadHandler, this);                             
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
            
            if (this.m_bReUseSession)
            {
                this.m_Log.Write("nsHotmailIMAP.js - loginOnloadHandler - Save Session Data");
                if (!this.m_SessionData)
                {
                    this.m_SessionData = Components.classes["@mozilla.org/SessionData;1"].createInstance();
                    this.m_SessionData.QueryInterface(Components.interfaces.nsISessionData);
                    this.m_SessionData.szUserName = this.m_szUserName;    
                }
                this.m_SessionData.oCookieManager = this.m_HttpComms.getCookieManager();
                this.m_SessionData.oHttpAuthManager = this.m_HttpComms.getHttpAuthManager();
                this.m_SessionManager.setSessionData(this.m_SessionData);  
            }
              
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
