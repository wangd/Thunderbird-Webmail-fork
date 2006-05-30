/*****************************  Globals   *************************************/                 
const nsLycosClassID = Components.ID("{222b6e70-8a87-11d9-9669-0800200c9a66}"); 
const nsLycosContactID = "@mozilla.org/LycosPOP;1";

const LycosMSGIDPattern = /[^\/]+$/;

const LycosSchema = "<?xml version=\"1.0\"?>\r\n<D:propfind xmlns:D=\"DAV:\" xmlns:h=\"http://schemas.microsoft.com/hotmail/\" xmlns:hm=\"urn:schemas:httpmail:\">\r\n<D:prop>\r\n<h:adbar/>\r\n<hm:contacts/>\r\n<hm:inbox/>\r\n<hm:outbox/>\r\n<hm:sendmsg/>\r\n<hm:sentitems/>\r\n<hm:deleteditems/>\r\n<hm:drafts/>\r\n<hm:msgfolderroot/>\r\n<h:maxpoll/>\r\n<h:sig/>\r\n</D:prop>\r\n</D:propfind>\r\n";
const LycosFolderSchema = "<?xml version=\"1.0\"?>\r\n<D:propfind xmlns:D=\"DAV:\" xmlns:hm=\"urn:schemas:httpmail:\">\r\n<D:prop>\r\n<D:isfolder/>\r\n<D:displayname/>\r\n<hm:special/>\r\n<D:hassubs/>\r\n<D:nosubs/>\r\n<hm:unreadcount/>\r\n<D:visiblecount/>\r\n<hm:special/>\r\n</D:prop>\r\n</D:propfind>\r\n";
const LycosMailSchema = "<?xml version=\"1.0\"?>\r\n<D:propfind xmlns:D=\"DAV:\" xmlns:hm=\"urn:schemas:httpmail:\" xmlns:m=\"urn:schemas:mailheader:\">\r\n<D:prop>\r\n<D:isfolder/>\r\n<hm:read/>\r\n<m:hasattachment/>\r\n<m:to/>\r\n<m:from/>\r\n<m:subject/>\r\n<m:date/>\r\n<D:getcontentlength/>\r\n</D:prop>\r\n</D:propfind>\r\n";
const LycosReadSchema = "<?xml version=\"1.0\"?>\r\n<D:propertyupdate xmlns:D=\"DAV:\" xmlns:hm=\"urn:schemas:httpmail:\">\r\n<D:set>\r\n<D:prop>\r\n<hm:read>1</hm:read>\r\n</D:prop>\r\n</D:set>\r\n</D:propertyupdate>";                   

const LycosResponse = /<D:response>[\S\d\s\r\n]*?<\/D:response>/gm;
const LycosHref = /<D:href>(.*?)<\/D:href>/i;
const LycosSize = /<D:getcontentlength>(.*?)<\/D:getcontentlength>/i;
const LycosJunkPattern  = /<D:href>(.*?Courrier%20ind%26eacute;sirable.*?)<\/D:href>/i;
const LycosJunkPatternAlt = /<D:href>(.*?junk.*?)<\/D:href>/i;
const LycosInBoxPattern = /<D:href>(.*?inbox.*?)<\/D:href>/;
const LycosFolderPattern = /<hm:msgfolderroot>(.*?)<\/hm:msgfolderroot>/;
const LycosTrashPattern = /<hm:deleteditems>(.*?)<\/hm:deleteditems>/;
const LycosPOPRead = /<hm:read>(.*?)<\/hm:read>/i;
const LycosPOPTo = /<m:to>(.*?)<\/m:to>/i;
const LycosPOPFrom = /<m:from>(.*?)<\/m:from>/i;
const LycosPOPSubject = /<m:subject>\s(.*?)<\/m:subject>/i;
const LycosPOPDate = /<m:date>(.*?)T(.*?)<\/m:date>/i;
/***********************  Lycos ********************************/


function nsLycos()
{
    try
    {       
        var scriptLoader =  Components.classes["@mozilla.org/moz/jssubscript-loader;1"];
        scriptLoader = scriptLoader.getService(Components.interfaces.mozIJSSubScriptLoader);
        scriptLoader.loadSubScript("chrome://web-mail/content/common/DebugLog.js");
        scriptLoader.loadSubScript("chrome://web-mail/content/common/HttpComms2.js");
        scriptLoader.loadSubScript("chrome://web-mail/content/common/CommonPrefs.js");
        scriptLoader.loadSubScript("chrome://lycos/content/Lycos-POPMSG.js");
        
        
        var date = new Date();
        
        var  szLogFileName = "Lycos Log - " + date.getHours()+ "-" + date.getMinutes() + "-"+ date.getUTCMilliseconds() +" -";
        this.m_Log = new DebugLog("webmail.logging.comms", 
                                       "{3c8e8390-2cf6-11d9-9669-0800200c9a66}" ,
                                       szLogFileName); 
        
        this.m_Log.Write("nsLycos.js - Constructor - START");   
       
        this.m_szUserName = null;   
        this.m_szPassWord = null; 
        this.m_oResponseStream = null;  
        this.m_HttpComms = new HttpComms(); 
        this.m_HttpComms.setHandleHttpAuth(true);    
        this.m_bAuthorised = false; 
        this.m_iStage=0; 
        this.m_szInBoxURI= null;
        this.m_szJunkMailURI = null;
        this.m_szFolderURI = null;
        this.m_szTrashURI=null;
        this.m_szMSG = null;
        this.m_aMsgDataStore = new Array();
        this.m_iTotalSize = 0;     
        this.m_bJunkMail = false;
        this.m_aRawData = new Array();

        this.m_Timer = Components.classes["@mozilla.org/timer;1"];
        this.m_Timer = this.m_Timer.createInstance(Components.interfaces.nsITimer);
        this.m_iTime = 10;
        
        //do i reuse the session
        var oPref = {Value:null};
        var  WebMailPrefAccess = new WebMailCommonPrefAccess();
        if (WebMailPrefAccess.Get("bool","lycos.bReUseSession",oPref))
            this.m_bReUseSession=oPref.Value;
        else
            this.m_bReUseSession=true; 
        
        //do i download junkmail
        oPref.Value = null;
        if (WebMailPrefAccess.Get("bool","lycos.bUseJunkMail",oPref))
            this.m_bUseJunkMail=oPref.Value;
        else
            this.m_bUseJunkMail=false;
         
        //do i download unread only
        oPref.Value = null;
        if (WebMailPrefAccess.Get("bool","lycos.bDownloadUnread",oPref))
            this.m_bDownloadUnread=oPref.Value;
        else
            this.m_bDownloadUnread=false;
        
        //delay process trigger
        oPref.Value = null;
        if (WebMailPrefAccess.Get("bool","lycos.iProcessTrigger",oPref))
            this.m_iProcessTrigger = oPref.Value;
        else
            this.m_iProcessTrigger = 50; 
        
        //delay proccess amount
        oPref.Value = null;
        if (WebMailPrefAccess.Get("bool","lycos.iProcessAmount",oPref))
            this.m_iProcessAmount = oPref.Value;
        else
            this.m_iProcessAmount = 25;
            
        delete WebMailPrefAccess;
        this.m_bStat = false;           
        this.m_Log.Write("nsLycos.js - Constructor - END");  
    }
    catch(e)
    {
        DebugDump("nsLycos.js: Constructor : Exception : " 
                                      + e.name 
                                      + ".\nError message: " 
                                      + e.message+ "\n"
                                      + e.lineNumber);
    }
}



nsLycos.prototype =
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
            this.m_Log.Write("nsLycos.js - logIN - START");   
            this.m_Log.Write("nsLycos.js - logIN - Username: " + this.m_szUserName 
                                                   + " Password: "  + this.m_szPassWord 
                                                   + " stream: "    + this.m_oResponseStream);
            
            if (!this.m_szUserName || !this.m_oResponseStream || !this.m_szPassWord) return false;
            
            var szTempUserName = this.m_szUserName.split("@");
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
            else if (szDomain.search(/lycos.fr/i)!=-1)
                szLocation= "http://webdav.caramail.lycos.fr/httpmail.asp";   
            else
                throw new Error("Unknown domain");
            
            this.m_HttpComms.setUserName(this.m_szUserName);
            this.m_HttpComms.setPassword(this.m_szPassWord);
            this.m_HttpComms.setContentType("text/xml");
            this.m_HttpComms.setURI(szLocation);
            this.m_HttpComms.setRequestMethod("PROPFIND");
            this.m_HttpComms.addData(LycosSchema);
            var bResult = this.m_HttpComms.send(this.loginOnloadHandler, this);                             
            if (!bResult) throw new Error("httpConnection returned false");
            
            this.m_Log.Write("nsLycos.js - logIN - END " + bResult);    
            return true;
        }
        catch(e)
        {
            this.m_Log.DebugDump("nsLycos.js: logIN : Exception : " 
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
            mainObject.m_Log.Write("nsLycos.js - loginOnloadHandler - START"); 
            mainObject.m_Log.Write("nsLycos.js - loginOnloadHandler : \n" + szResponse);
            mainObject.m_Log.Write("nsLycos.js - loginOnloadHandler : "+ mainObject.m_iStage);  
            
            var httpChannel = event.QueryInterface(Components.interfaces.nsIHttpChannel);
            
            //if this fails we've gone somewhere new
            mainObject.m_Log.Write("nsLycos - loginOnloadHandler - status :" +httpChannel.responseStatus );
            if (httpChannel.responseStatus != 200 && httpChannel.responseStatus != 207) 
                throw new Error("return status " + httpChannel.responseStatus);
            
            mainObject.m_szFolderURI = szResponse.match(LycosFolderPattern)[1];
            mainObject.m_Log.Write("nsLycos.js - loginOnloadHandler - get folder url - " + mainObject.m_szFolderURI);
            mainObject.m_szTrashURI = szResponse.match(LycosTrashPattern)[1];
            mainObject.m_Log.Write("nsLycos.js - loginOnloadHandler - get trash url - " + mainObject.m_szTrashURI);
            
            //server response
            mainObject.serverComms("+OK Your in\r\n");
            mainObject.m_bAuthorised = true;
                             
            mainObject.m_Log.Write("nsLycos.js - loginOnloadHandler - END");
        }
        catch(err)
        {
            mainObject.m_Log.DebugDump("nsLycos.js: loginHandler : Exception : " 
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
            this.m_Log.Write("nsLycos.js - getNumMessages - START"); 
            this.m_iStage=0;
             
            if (this.m_szFolderURI == null) return false;
            this.m_Log.Write("nsLycos.js - getNumMessages - mail box url " + this.m_szFolderURI); 
        
            this.m_HttpComms.setContentType("text/xml");
            this.m_HttpComms.setURI(this.m_szFolderURI);
            this.m_HttpComms.setRequestMethod("PROPFIND");
            this.m_HttpComms.addData(LycosFolderSchema);
            var bResult = this.m_HttpComms.send(this.mailBoxOnloadHandler, this);                             
            if (!bResult) throw new Error("httpConnection returned false");
            this.m_bStat = true;              
            this.m_Log.Write("nsLycos.js - getNumMessages - END"); 
            return true;
        }
        catch(e)
        {
            this.m_Log.DebugDump("nsLycos.js: getNumMessages : Exception : " 
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
            mainObject.m_Log.Write("nsLycos.js - mailBoxOnloadHandler - START"); 
            mainObject.m_Log.Write("nsLycos.js - mailBoxOnloadHandler : \n" + szResponse);
            mainObject.m_Log.Write("nsLycos.js - mailBoxOnloadHandler : " + mainObject.m_iStage);  
            
            var httpChannel = event.QueryInterface(Components.interfaces.nsIHttpChannel);
            
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
                      
                    try
                    {   
                        mainObject.m_szJunkMailURI = szResponse.match(LycosJunkPattern)[1];
                    }
                    catch(err)
                    {
                        mainObject.m_szJunkMailURI = szResponse.match(LycosJunkPatternAlt)[1];   
                    }
                    mainObject.m_Log.Write("nsLycos.js - mailBoxOnloadHandler - junkmail - " + mainObject.m_szJunkMailURI);
                  
                    //load mailbox
                    mainObject.m_HttpComms.setContentType("text/xml");
                    mainObject.m_HttpComms.setURI(mainObject.m_szInBoxURI);
                    mainObject.m_HttpComms.setRequestMethod("PROPFIND");
                    mainObject.m_HttpComms.addData(LycosMailSchema);
                    var bResult = mainObject.m_HttpComms.send(mainObject.mailBoxOnloadHandler, mainObject);                             
                    if (!bResult) throw new Error("httpConnection returned false");
                                        
                    mainObject.m_iStage++;  
                    mainObject.m_Log.Write("nsLycos.js - mailBoxOnloadHandler - get folder list - end"); 
                break;
                    
                    
                case 1: //get inbox folder
                    mainObject.m_Log.Write("nsLycos.js - mailBoxOnloadHandler - inbox mail uri- start");
                    
                    var aszResponses = szResponse.match(LycosResponse);
                    mainObject.m_Log.Write("nsLycos.js - mailBoxOnloadHandler - inbox - \n" + aszResponses);
                    if (aszResponses)
                    {
                        var aTemp = mainObject.m_aRawData.concat(aszResponses);
                        delete mainObject.m_aRawData;
                        mainObject.m_aRawData = aTemp;   
                    }
                    
                    
                    if (mainObject.m_bUseJunkMail && !mainObject.m_bJunkMail)
                    {
                        //load junkmail
                        mainObject.m_HttpComms.setContentType("text/xml");
                        mainObject.m_HttpComms.setURI(mainObject.m_szJunkMailURI);
                        mainObject.m_HttpComms.setRequestMethod("PROPFIND");
                        mainObject.m_HttpComms.addData(LycosMailSchema);
                        var bResult = mainObject.m_HttpComms.send(mainObject.mailBoxOnloadHandler, mainObject);                             
                        if (!bResult) throw new Error("httpConnection returned false");
                        mainObject.m_bJunkMail = true;
                    }
                    else
                    {   
                        mainObject.m_Log.Write("nsLycos.js - mailBoxOnloadHandler - download complete");
                        if (mainObject.m_aRawData.length>mainObject.m_iProcessTrigger)
                        {
                            mainObject.m_Log.Write("nsLycos.js - mailBoxOnloadHandler - starting delay");
                            //start timer
                            mainObject.m_Timer.initWithCallback(mainObject, 
                                                                mainObject.m_iTime, 
                                                  Components.interfaces.nsITimer.TYPE_REPEATING_SLACK);
                            return;
                        }
                        else
                        {   
                            mainObject.m_Log.Write("nsLycos.js - mailBoxOnloadHandler - starting to process");
                           
                            for (i=0; i< mainObject.m_aRawData.length; i++)
                            {
                                mainObject.processItem( mainObject.m_aRawData[i]);        
                            }
                            
                            if (mainObject.m_bStat) //called by stat
                            {
                                mainObject.serverComms("+OK "+ mainObject.m_aMsgDataStore.length 
                                                        + " " + mainObject.m_iTotalSize + "\r\n");
                            }
                            else //called by list
                            {
                                var szPOPResponse = "+OK " + mainObject.m_aMsgDataStore.length + " Messages\r\n"; 
                                this.m_Log.Write("Lycos.js - getMessagesSizes - : " + mainObject.m_aMsgDataStore.length);
                 
                                for (i = 0; i <  mainObject.m_aMsgDataStore.length; i++)
                                {
                                    var iEmailSize = mainObject.m_aMsgDataStore[i].iSize;
                                    szPOPResponse+=(i+1) + " " + iEmailSize + "\r\n";       
                                }         
                               
                                szPOPResponse += ".\r\n";
                                mainObject.serverComms(szPOPResponse);
                            }
                            
                            delete  mainObject.m_aRawData;
                        }
                    }
                    mainObject.m_Log.Write("nsLycos.js - mailBoxOnloadHandler - inbox mail uri - end");
                break;          
            }       
        }
        catch(err)
        {
             mainObject.m_Log.DebugDump("nsLycos.js: MailboxOnload : Exception : " 
                                              + err.name 
                                              + ".\nError message: " 
                                              + err.message + "\n"
                                              + err.lineNumber);
            
            mainObject.serverComms("-ERR Comms Error from "+ mainObject.m_szUserName+"\r\n");
        }
    },
    
     
     
    notify : function(timer)
    {
        try
        {
            this.m_Log.Write("nsLycos.js - notify - START");

            if (this.m_aRawData.length>0)
            {   
                var iCount=0;
                do{
                    var Item = this.m_aRawData.shift();
                    this.processItem(Item);   
                    iCount++;
                    this.m_Log.Write("nsLycos.js - notify - rawData icount " + iCount + " " + this.m_aRawData.length);
                }while(iCount != this.m_iProcessAmount && this.m_aRawData.length!=0)

            }
            else
            {
                this.m_Log.Write("nsLycos.js - notify - all data handled"); 
                this.m_Timer.cancel();
                
                if (this.m_bStat) //called by stat
                {
                    this.serverComms("+OK "+ this.m_aMsgDataStore.length 
                                        + " " + this.m_iTotalSize + "\r\n");
                }
                else //called by list
                {
                    var szPOPResponse = "+OK " + this.m_aMsgDataStore.length + " Messages\r\n"; 
                    this.m_Log.Write("Lycos.js - getMessagesSizes - : " + this.m_aMsgDataStore.length);
     
                    for (i = 0; i <  this.m_aMsgDataStore.length; i++)
                    {
                        var iEmailSize = this.m_aMsgDataStore[i].iSize;
                        szPOPResponse+=(i+1) + " " + iEmailSize + "\r\n";       
                    }         
                   
                    szPOPResponse += ".\r\n";
                    this.serverComms(szPOPResponse);
                }

                delete  this.m_aRawData;
            }
            
            this.m_Log.Write("nsLycos.js - notify - END"); 
        }
        catch(err)
        {
            this.m_Timer.cancel();
            this.m_Log.DebugDump("nsLycos.js: notify : Exception : " 
                                              + err.name 
                                              + ".\nError message: " 
                                              + err.message+ "\n"
                                              + err.lineNumber);
                                              
            this.serverComms("-ERR negative vibes from " +this.m_szUserName+ "\r\n");
        }
    }, 
     
    
    
    processItem : function (rawData)
    {
        this.m_Log.Write("nsLycos.js - processItem - START");
        this.m_Log.Write("nsLycos.js - processItem - rawData " +rawData);
            
        var bRead = true;
        if (this.m_bDownloadUnread)
        {
            bRead = parseInt(rawData.match(LycosPOPRead)[1]) ? false : true;
            mainObject.m_Log.Write("nsLycos.js - mailBoxOnloadHandler - bRead -" + bRead);
        }
        
        if (bRead)
        {
            var data = new LycosPOPMSG();
            data.szMSGUri = rawData.match(LycosHref)[1]; //uri
            data.iSize = parseInt(rawData.match(LycosSize)[1]);//size 
            this.m_iTotalSize += data.iSize;
            
            //set junk mail status
            if (this.m_szJunkMailURI)
            {
                if(data.szMSGUri.search(this.m_szJunkMailURI)!=-1)
                   data.bJunkFolder = true;
            }
                       
            var szTO="";
            try
            {                   
                szTO = rawData.match(LycosPOPTo)[1].match(/[\S\d]*@[\S\d]*/);  
            }
            catch(err)
            {
                szTO = rawData.match(LycosPOPTo)[1];
            }
            data.szTo = szTO;
            
            var szFrom = "";
            try
            {
                szFrom = rawData.match(LycosPOPFrom)[1].match(/[\S\d]*@[\S\d]*/);
            }
            catch(err)
            {
                szFrom = rawData.match(LycosPOPFrom)[1];    
            }
            data.szFrom = szFrom;
            
            var szSubject= "";
            try
            {
                szSubject= rawData.match(LycosPOPSubject)[1];
            }
            catch(err){}
            data.szSubject = szSubject;
            
            try
            {
                var aszDateTime = rawData.match(LycosPOPDate);
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
            
            this.m_aMsgDataStore.push(data);
        }
        
        this.m_Log.Write("nsLycos.js - processItem - END");
    },
    
    
                      
    //list
    getMessageSizes : function() 
    {
        try
        {
            this.m_Log.Write("nsLycos.js - getMessageSizes - START"); 
            
            if (this.m_bStat) 
            {  //msg table has been donwloaded
                var szPOPResponse = "+OK " +  this.m_aMsgDataStore.length + " Messages\r\n"; 
                for (i = 0; i < this.m_aMsgDataStore.length; i++)
                {
                    var iEmailSize = this.m_aMsgDataStore[i].iSize;
                    this.m_Log.Write("Lycos.js - getMessageSizes - Email Size : " +iEmailSize);
                    szPOPResponse+=(i+1) + " " + iEmailSize + "\r\n";   
                } 
                szPOPResponse += ".\r\n";
                
                this.serverComms(szPOPResponse);
            }
            else
            { //download msg list
                this.m_iStage=0;
                if (this.m_szFolderURI == null) return false;
                this.m_Log.Write("nsLycos.js - getNumMessages - mail box url " + this.m_szFolderURI); 
                
                this.m_HttpComms.setContentType("text/xml");
                this.m_HttpComms.setURI(this.m_szFolderURI);
                this.m_HttpComms.setRequestMethod("PROPFIND");
                this.m_HttpComms.addData(LycosFolderSchema);
                var bResult = this.m_HttpComms.send(this.mailBoxOnloadHandler, this);                             
                if (!bResult) throw new Error("httpConnection returned false");
            }
                   
            this.m_Log.Write("nsLycos.js - getMessageSizes - END"); 
            return true;
        }
        catch(e)
        {
            this.m_Log.DebugDump("nsLycos.js: getMessageSizes : Exception : " 
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
            this.m_Log.Write("nsLycos.js - getHeaders - START");  
            this.m_Log.Write("nsLycos.js - getHeaders - id " + lID ); 
            
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
            var oMSG = this.m_aMsgDataStore[lID-1];
            var szMsgID = oMSG.szMSGUri;
            this.m_Log.Write("nsLycos.js - getMessage - msg id" + szMsgID); 
           
            this.m_bJunkMail = oMSG.bJunkFolder;
            this.m_iStage =0;
            //get msg from lycos
            this.m_HttpComms.setURI(szMsgID);
            this.m_HttpComms.setRequestMethod("GET");
            var bResult = this.m_HttpComms.send(this.emailOnloadHandler, this);                             
            if (!bResult) throw new Error("httpConnection returned false");
                  
            this.m_Log.Write("nsLycos.js - getMessage - END"); 
            return true;
        }
        catch(e)
        {
             this.m_Log.DebugDump("nsLycos.js: getMessage : Exception : " 
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
            mainObject.m_Log.Write("nsLycos.js - emailOnloadHandler - START");
            mainObject.m_Log.Write("nsLycos.js - emailOnloadHandler : \n" + szResponse); 
            mainObject.m_Log.Write("nsLycos.js - emailOnloadHandler : " + mainObject.m_iStage);  
            
            var httpChannel = event.QueryInterface(Components.interfaces.nsIHttpChannel);
            
            //if this fails we've gone somewhere new
            mainObject.m_Log.Write("nsLycos - emailOnloadHandler - status :" +httpChannel.responseStatus );
            if (httpChannel.responseStatus != 200) 
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
                    mainObject.m_HttpComms.setContentType("text/xml");
                    var szUri = httpChannel.URI.spec;
                    mainObject.m_HttpComms.setURI(szUri);
                    mainObject.m_HttpComms.setRequestMethod("PROPPATCH");
                    mainObject.m_HttpComms.addData(LycosReadSchema);
                    var bResult = mainObject.m_HttpComms.send(mainObject.emailOnloadHandler, mainObject);          
                    mainObject.m_iStage++;          
                break;
                
                case 1: //mark as read
                    var szPOPResponse = "+OK " +mainObject.m_szMSG.length + "\r\n";                     
                    szPOPResponse += mainObject.m_szMSG;
                    mainObject.serverComms(szPOPResponse);
                break;
            }
            mainObject.m_Log.Write("nsLycos.js - emailOnloadHandler - end"); 
        }
        catch(err)
        {
            mainObject.m_Log.DebugDump("nsLycos.js: emailOnloadHandler : Exception : " 
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
            this.m_Log.Write("nsLycos.js - deleteMessage - START");  
            this.m_Log.Write("nsLycos.js - deleteMessage - id " + lID ); 
                  
            //create URL
            var szPath = this.m_aMsgDataStore[lID-1].szMSGUri;
            this.m_Log.Write("nsLycos.js - deleteMessage - id " + szPath );
                       
            this.m_iStage=0;           
            
            var szStart = "<?xml version=\"1.0\"?>\r\n<D:move xmlns:D=\"DAV:\">\r\n<D:target>\r\n";
            var szEnd = "</D:target>\r\n</D:move>";
            var szMsgID =  szPath.match(LycosMSGIDPattern); 
            var sztemp ="<D:href>"+szMsgID+"</D:href>\r\n"
            var szData = szStart + sztemp + szEnd;
            
            this.m_HttpComms.setURI(szPath);
            this.m_HttpComms.setRequestMethod("MOVE");
            this.m_HttpComms.setContentType("text/xml"); 
            this.m_HttpComms.addData(szData);          

            var szDestination= this.m_szTrashURI + szMsgID;
            this.m_Log.Write("nsLycos.js - deleteMessage - Destination " + szDestination );
            this.m_HttpComms.addRequestHeader("Destination", szDestination , false);
            var bResult = this.m_HttpComms.send(this.deleteMessageOnloadHandler, this);                             
            if (!bResult) throw new Error("httpConnection returned false");
                  
            this.m_Log.Write("nsLycos.js - deleteMessage - END");     
            return true;
        }
        catch(e)
        {
            this.m_Log.DebugDump("nsLycos.js: deleteMessage : Exception : " 
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
            mainObject.m_Log.Write("nsLycos.js - deleteMessageOnloadHandler - START");
            mainObject.m_Log.Write("nsLycos.js - deleteMessageOnloadHandler : \n" + szResponse);
            mainObject.m_Log.Write("nsLycos.js - deleteMessageOnloadHandler : " + mainObject.m_iStage);  
            
            var httpChannel = event.QueryInterface(Components.interfaces.nsIHttpChannel);
            
            //if this fails we've gone somewhere new
            mainObject.m_Log.Write("nsLycos - deleteMessageOnloadHandler - status :" +httpChannel.responseStatus );
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
                                              + err.message+ "\n"
                                              + err.lineNumber);
            
            mainObject.serverComms("-ERR Comms Error from "+ mainObject.m_szUserName+"\r\n");
        }
    },
    
    
    
    logOut : function()
    {
        try
        {
            this.m_Log.Write("nsLycos.js - logOUT - START"); 
            
            var oPref = new Object();
            oPref.Value = null;
            var  WebMailPrefAccess = new WebMailCommonPrefAccess();
            WebMailPrefAccess.Get("bool","lycos.bEmptyTrash",oPref);
        
            if (!this.m_bReUseSession)
            {
                this.m_Log.Write("Lycos.js - logIN - deleting Session Data");
                this.m_HttpComms.deleteSessionData();
            }
            
            if (!oPref.Value)
            {
                this.m_bAuthorised = false;
                this.serverComms("+OK Your Out\r\n");
                return true;
            }
           
            //get trash 
            this.m_HttpComms.setContentType("text/xml");
            this.m_HttpComms.setURI(this.m_szTrashURI);
            this.m_HttpComms.setRequestMethod("PROPFIND");
            this.m_HttpComms.addData(LycosMailSchema);
            var bResult = this.m_HttpComms.send(this.logoutOnloadHandler, this);                             
            if (!bResult) throw new Error("httpConnection returned false");           
            this.m_iStage=0;
            this.m_Log.Write("nsLycos.js - logOUT - END");  
            return true;
        }
        catch(e)
        {
            this.m_Log.DebugDump("nsLycos.js: logOUT : Exception : " 
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
            mainObject.m_Log.Write("nsLycos.js - logoutOnloadHandler - START");
            mainObject.m_Log.Write("nsLycos.js - logoutOnloadHandler : \n" + szResponse);
            mainObject.m_Log.Write("nsLycos.js - logoutOnloadHandler : " + mainObject.m_iStage);  
            
            var httpChannel = event.QueryInterface(Components.interfaces.nsIHttpChannel);
            
            //if this fails we've gone somewhere new
            mainObject.m_Log.Write("nsLycos - logoutOnloadHandler - status :" +httpChannel.responseStatus );
            if (httpChannel.responseStatus <200 || httpChannel.responseStatus >300 ) 
                throw new Error("return status " + httpChannel.responseStatus);
            
            switch(mainObject.m_iStage)
            {
              
                case 0:
                    var aszResponses = szResponse.match(LycosResponse);
                    mainObject.m_Log.Write("nsLycos.js - logoutOnloadHandler - trash - \n" + aszResponses);
                    if (aszResponses)
                    {
                        var szStart = "<?xml version=\"1.0\"?>\r\n<D:delete xmlns:D=\"DAV:\">\r\n<D:target>\r\n";                
                        var szEnd = "</D:target>\r\n</D:delete>";
                        
                        var szDeleteMsg= szStart;
                        for (i=0; i<aszResponses.length; i++)
                        {
                            var szMSGUri = aszResponses[i].match(LycosHref)[1]; //uri
                            var szMsgID =  szMSGUri.match(LycosMSGIDPattern); //id
                            var temp ="<D:href>"+szMsgID+"</D:href>\r\n"
                            szDeleteMsg+=temp;
                        }
                        szDeleteMsg+= szEnd;
                        
                        mainObject.m_HttpComms.setContentType("text/xml");
                        mainObject.m_HttpComms.setURI(mainObject.m_szTrashURI);
                        mainObject.m_HttpComms.setRequestMethod("BDELETE");
                        mainObject.m_HttpComms.addData(szDeleteMsg);
                        var bResult = mainObject.m_HttpComms.send(mainObject.logoutOnloadHandler, mainObject);                             
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
             
            mainObject.m_Log.Write("nsLycos.js - logoutOnloadHandler - END");
        }
        catch(err)
        {
            mainObject.m_Log.DebugDump("nsLycos.js: deleteMessageOnloadHandler : Exception : " 
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
