function HotmailScreenRipperBETA(oResponseStream, oLog)
{
    try
    {       
        var scriptLoader = Components.classes["@mozilla.org/moz/jssubscript-loader;1"];
        scriptLoader = scriptLoader.getService(Components.interfaces.mozIJSSubScriptLoader);
        scriptLoader.loadSubScript("chrome://web-mail/content/common/DebugLog.js");
        scriptLoader.loadSubScript("chrome://web-mail/content/common/comms.js");
        scriptLoader.loadSubScript("chrome://hotmail/content/Hotmail-MSG.js");
        scriptLoader.loadSubScript("chrome://web-mail/content/common/CommonPrefs.js");
        
        this.m_Log = oLog; 
                
        this.m_Log.Write("Hotmail-SR-BETAR - Constructor - START");   
       
        this.m_szUserName = null;   
        this.m_szPassWord = null; 
        this.m_oResponseStream = oResponseStream;  
        this.m_HttpComms = new Comms(this,this.m_Log);   
        this.m_szMailboxURI = null;
        this.m_szLocationURI = null;
        this.m_szJunkFolderURI = null;
        this.m_szDelete = null;
        this.m_bJunkMailDone = false;
        this.m_aMsgDataStore = new Array();
        this.m_szHomeURI = null;
        this.m_iTotalSize = 0; 
        this.m_iStage = 0;  
        this.m_bJunkMail = false;
        this.m_szViewState = null;
       
        this.m_SessionManager = Components.classes["@mozilla.org/SessionManager;1"];
        this.m_SessionManager = this.m_SessionManager.getService();
        this.m_SessionManager.QueryInterface(Components.interfaces.nsISessionManager); 
        this.m_SessionData = null;
        
        this.m_bReEntry = false;
        
        //do i reuse the session
        var oPref = {Value : null};
        var  WebMailPrefAccess = new WebMailCommonPrefAccess();
        if (WebMailPrefAccess.Get("bool","hotmail.bReUseSession",oPref))
            this.m_bReUseSession=oPref.Value;
        else
            this.m_bReUseSession=true; 
                  
        //do i download junkmail
        oPref.Value = null;
        var  WebMailPrefAccess = new WebMailCommonPrefAccess();
        if (WebMailPrefAccess.Get("bool","hotmail.bUseJunkMail",oPref))
            this.m_bUseJunkMail=oPref.Value;
        else
            this.m_bUseJunkMail=false;
                                          
        //do i download unread only
        oPref.Value = null;
        var  WebMailPrefAccess = new WebMailCommonPrefAccess();
        if (WebMailPrefAccess.Get("bool","hotmail.bDownloadUnread",oPref))
            this.m_bDownloadUnread=oPref.Value;
        else
            this.m_bDownloadUnread=false;   
                                         
        this.m_Log.Write("Hotmail-SR-BETAR.js - Constructor - END");  
    }
    catch(e)
    {
        DebugDump("Hotmail-SR-BETAR: Constructor : Exception : " 
                                      + e.name 
                                      + ".\nError message: " 
                                      + e.message + "\n"
                                      + e.lineNumber);
    }
}



HotmailScreenRipperBETA.prototype =
{ 
    logIn : function(szUserName, szPassWord)
    {
        try
        {
            this.m_Log.Write("Hotmail-SR-BETAR - logIN - START");   
            this.m_Log.Write("Hotmail-SR-BETAR - logIN - Username: " + szUserName 
                                                   + " Password: " + szPassWord 
                                                   + " stream: " + this.m_oResponseStream);
            
            this.m_szUserName = szUserName.toLowerCase();
            this.m_szPassWord = szPassWord;
            
            if (!this.m_szUserName || !this.m_oResponseStream || !this.m_szPassWord) return false;
                     
            //get hotmail.com webpage
            this.m_iStage= 0;
            this.m_HttpComms.clean();
            this.m_HttpComms.setContentType(-1);
            
            this.m_SessionData = this.m_SessionManager.findSessionData(this.m_szUserName);
            if (this.m_SessionData && this.m_bReUseSession)
            {
                this.m_Log.Write("nsHotmail.js - logIN - Session Data found"); 
                this.m_szHomeURI = this.m_SessionData.oComponentData.findElement("szHomeURI");
            }
            
            if (this.m_szHomeURI)
            {
                this.m_HttpComms.setCookieManager(this.m_SessionData.oCookieManager);
                this.m_Log.Write("nsHotmail" +this.m_szHomeURI);    
            
                //get home page
                this.m_iStage =2;
                this.m_bReEntry = true;
                this.m_HttpComms.setURI(this.m_szHomeURI);
                this.m_HttpComms.setRequestMethod("GET");
                var bResult = this.m_HttpComms.send(this.loginOnloadHandler);                             
                if (!bResult) throw new Error("httpConnection returned false");
            }
            else
            {    
                this.m_HttpComms.setURI("http://www.hotmail.com");
                this.m_HttpComms.setRequestMethod("GET");
                var bResult = this.m_HttpComms.send(this.loginOnloadHandler);  
                if (!bResult) throw new Error("httpConnection returned false");        
            }
              
            this.m_Log.Write("Hotmail-SR-BETAR - logIN - END");    
            return true;
        }
        catch(e)
        {
            this.m_Log.DebugDump("Hotmail-SR-BETAR: logIN : Exception : " 
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
            mainObject.m_Log.Write("Hotmail-SR-BETAR - loginOnloadHandler - START"); 
            mainObject.m_Log.Write("Hotmail-SR-BETAR - loginOnloadHandler : " + mainObject.m_iStage);  
            
            var httpChannel = event.QueryInterface(Components.interfaces.nsIHttpChannel);
            mainObject.m_Log.Write("Hotmail-SR-BETAR - loginOnloadHandler - status :" +httpChannel.responseStatus );
            
            //if this fails we've gone somewhere new
            if (httpChannel.responseStatus != 200 ) 
                throw new Error("return status " + httpChannel.responseStatus);
  
            mainObject.m_HttpComms.clean();
            mainObject.m_HttpComms.setContentType(0);
             
            //check for java refresh
            var aRefresh = szResponse.match(patternHotmailPOPJSRefresh);
            if (aRefresh)
            {
                mainObject.m_Log.Write("Hotmail-SR-BETAR - loginOnloadHandler - refresh "); 
                
                mainObject.m_HttpComms.setURI(aRefresh[1]);
                mainObject.m_HttpComms.setRequestMethod("GET");
                
                var bResult = mainObject.m_HttpComms.send(mainObject.loginOnloadHandler);   
                if (!bResult) throw new Error("httpConnection returned false");
                return;   
            }
             
             
            //page code                                
            switch (mainObject.m_iStage)
            {
                case 0: // redirect destination
                    var aForm = szResponse.match(patternHotmailPOPForm);
                    if (!aForm) throw new Error("error parsing login page");
                    mainObject.m_Log.Write("Hotmail-SR-BETAR - loginOnloadHandler "+ aForm);
                    
                    //action
                    var szAction = aForm[0].match(patternHotmailPOPAction)[1];
                    mainObject.m_Log.Write("Hotmail-SR-BETAR - loginOnloadHandler "+ szAction);
                    mainObject.m_HttpComms.setURI(szAction);
                    
                    //name value
                    var aInput = aForm[0].match(patternHotmailPOPInput);
                    mainObject.m_Log.Write("Hotmail-SR-BETAR - loginOnloadHandler "+ aInput);
                    for (i=0; i<aInput.length ; i++)
                    {
                        var szName =  aInput[i].match(patternHotmailPOPName)[1];
                        mainObject.m_Log.Write("Hotmail-SR-BETAR- loginOnloadHandler "+ szName);  
                        var szValue =  aInput[i].match(patternHotmailPOPValue)[1];
                        mainObject.m_Log.Write("Hotmail-SR-BETAR- loginOnloadHandler "+ szValue);
                        szValue = encodeURIComponent(szValue);
                        mainObject.m_HttpComms.addValuePair(szName, szValue);
                    }
                    
                    mainObject.m_HttpComms.setRequestMethod("POST");
                    var bResult = mainObject.m_HttpComms.send(mainObject.loginOnloadHandler);   
                    if (!bResult) throw new Error("httpConnection returned false");
                    mainObject.m_iStage++;
                break;
                
                
                case 1: //login
                    var aForm = szResponse.match(patternHotmailPOPForm);
                    if (!aForm) throw new Error("error parsing login page");
                        
                    //get form data
                    var aInput =  aForm[0].match(patternHotmailPOPInput); 
                    mainObject.m_Log.Write("nsHotmail.js - loginOnloadHandler - form data " + aInput);
                    
                    for (i=0; i<aInput.length; i++)
                    {
                        var szType = aInput[i].match(patternHotmailPOPType)[1]; 
                        mainObject.m_Log.Write("nsHotmail.js - loginOnloadHandler - form type " + szType);
                        var szName = aInput[i].match(patternHotmailPOPName)[1]; 
                        mainObject.m_Log.Write("nsHotmail.js - loginOnloadHandler - form name " + szName);
                        var szValue = aInput[i].match(patternHotmailPOPValue)[1]; 
                        mainObject.m_Log.Write("nsHotmail.js - loginOnloadHandler - form value " + szValue);
                        
                        if (szType.search(/submit/i)==-1)
                        {
                            if (szType.search(/radio/i)!=-1)
                            {
                                if (aInput[i].search(/checked/i)!=-1)
                                    mainObject.m_HttpComms.addValuePair(szName,szValue);
                            }
                            else
                            {
                                var szData = null;   
                                if (szName.search(/login/i)!=-1)
                                    szData = encodeURIComponent(mainObject.m_szUserName);
                                else if (szName.search(/passwd/i)!=-1)
                                    szData = encodeURIComponent(mainObject.m_szPassWord);
                                else if (szName.search(/PwdPad/i)!=-1)
                                {
                                    var szPasswordPadding = "IfYouAreReadingThisYouHaveTooMuchFreeTime";
                                    var lPad=szPasswordPadding.length-mainObject.m_szPassWord.length;
                                    szData = szPasswordPadding.substr(0,(lPad<0)?0:lPad);
                                }
                                else 
                                    szData = szValue;
                                    
                                mainObject.m_HttpComms.addValuePair(szName,szData);
                            }
                        }
                    }
                    
                    var szAction = aForm[0].match(patternHotmailPOPAction)[1];
                    mainObject.m_Log.Write("Hotmail-SR-BETAR- loginOnloadHandler "+ szAction);
                    var IOService = Components.classes["@mozilla.org/network/io-service;1"];
                    IOService = IOService.getService(Components.interfaces.nsIIOService);
                    var nsIURI = IOService.newURI(szAction, null, null);
                    var szQuery = nsIURI.QueryInterface(Components.interfaces.nsIURL).query;    
                    mainObject.m_Log.Write("Hotmail-SR-BETAR- loginOnloadHandler "+ szQuery);                   
                    
                    var szDomain = mainObject.m_szUserName.split("@")[1];
                    var szURI = null;
                    if (szDomain.search(/hotmail.co.jp/)!=-1 || szDomain.search(/hotmail.co.uk/)!=-1 ||
                        szDomain.search(/hotmail.com/)!=-1 || szDomain.search(/hotmail.de/)!=-1 ||
                        szDomain.search(/hotmail.fr/)!=-1 || szDomain.search(/hotmail.it/)!=-1  )
                    {
                        szURI = "https://loginnet.passport.com/ppsecure/post.srf";
                        szURI += "?" + szQuery;
                    }
                    else if (szDomain.search(/msn.com/)!=-1 || szDomain.search(/compaq.net/)!=-1)
                    {
                        szURI = "https://msnialogin.passport.com/ppsecure/post.srf"; 
                        szURI += "?" + szQuery;
                    }
                    else if (szDomain.search(/messengeruser.com/)!=-1 || szDomain.search(/passport.com/)!=-1 ||
                             szDomain.search(/charter.com/)!=-1 || szDomain.search(/webtv.net/)!=-1)
                    {
                        szURI = "https://login.passport.com/ppsecure/post.srf"; 
                        szURI += "?" + szQuery;
                    }
                    else
                    {
                        szURI = szAction;
                    }

                    mainObject.m_HttpComms.setURI(szURI);                    
                    
                    mainObject.m_HttpComms.setRequestMethod("POST");
                    var bResult = mainObject.m_HttpComms.send(mainObject.loginOnloadHandler);                   
                    if (!bResult) throw new Error("httpConnection returned false");
                    mainObject.m_iStage++;
                break;
                
               
                case 2://inbox 
                    //check for logout option 
                    var aszLogoutURL = szResponse.match(patternHotmailPOPLogOut);
                    mainObject.m_Log.Write("Hotmail-SR-BETAR - loginOnloadHandler - logout : " + aszLogoutURL);
                
                    if (!aszLogoutURL)
                    {
                        if (mainObject.m_bReEntry)
                        {
                            mainObject.m_bReEntry = false;
                            mainObject.m_iStage =0;
                            mainObject.m_HttpComms.setURI("http://www.hotmail.com");
                            mainObject.m_HttpComms.setRequestMethod("GET");
                            var bResult = mainObject.m_HttpComms.send(mainObject.loginOnloadHandler);                             
                            if (!bResult) throw new Error("httpConnection returned false");
                            return;
                        }
                        else
                            throw new Error("error logging in");
                    } 
                    
                    //get urls for later use                  
                    mainObject.m_szLocationURI = httpChannel.URI.prePath ;
                    mainObject.m_Log.Write("Hotmail-SR-BETAR - loginOnloadHandler - m_szLocationURI : "+mainObject.m_szLocationURI );
                                        
                    mainObject.m_szMailboxURI = szResponse.match(patternHotmailPOPInbox)[1];
                    mainObject.m_Log.Write("Hotmail-SR-BETAR - loginOnloadHandler - m_szMaiboxURI : "+mainObject.m_szMailboxURI );
                    
                    mainObject.m_szHomeURI = httpChannel.URI.spec;
                    mainObject.m_Log.Write("Hotmail-SR-BETAR - loginOnloadHandler - m_szHomeURI : "+mainObject.m_szHomeURI );
                                       
                    //server response
                    mainObject.serverComms("+OK Your in\r\n");
                    mainObject.m_bAuthorised = true;
                break;
            }
            
            mainObject.m_Log.Write("Hotmail-SR-BETAR - loginOnloadHandler - END");
        }
        catch(err)
        {
            mainObject.m_Log.DebugDump("Hotmail-SR-BETAR: loginHandler : Exception : " 
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
            this.m_Log.Write("Hotmail-SR-BETAR - getNumMessages - START"); 
            
            if (this.m_szMailboxURI == null) return false;
            var szMailboxURI = this.m_szLocationURI + this.m_szMailboxURI; 
            this.m_Log.Write("Hotmail-SR-BETAR - getNumMessages - mail box url " + szMailboxURI); 
            
            this.m_iStage = 0;  
            this.m_HttpComms.clean();
            this.m_HttpComms.setURI(szMailboxURI);
            this.m_HttpComms.setRequestMethod("GET");
            var bResult = this.m_HttpComms.send(this.mailBoxOnloadHandler); 
            if (!bResult) throw new Error("httpConnection returned false");
                        
            this.m_Log.Write("Hotmail-SR-BETAR - getNumMessages - END"); 
            return true;
        }
        catch(e)
        {
            this.m_Log.DebugDump("Hotmail-SR-BETAR: getNumMessages : Exception : " 
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
            mainObject.m_Log.Write("Hotmail-SR-BETAR - mailBoxOnloadHandler - START"); 
            mainObject.m_Log.Write("Hotmail-SR-BETAR - mailBoxOnloadHandler : " + mainObject.m_iStage);  
            
            var httpChannel = event.QueryInterface(Components.interfaces.nsIHttpChannel);
            mainObject.m_Log.Write("Hotmail-SR-BETAR - mailBoxOnloadHandler - Mailbox :" + httpChannel.responseStatus);          
            
            //check status should be 200.
            if (httpChannel.responseStatus != 200 ) 
                throw new Error("error status " + httpChannel.responseStatus);   
            
           
            // get trash folder uri      
            if (!mainObject.m_szJunkFolderURI && mainObject.m_bUseJunkMail)
            {
                try
                {
                    var aszJunkFolder = szResponse.match(patternHotmailPOPJunkFolderID);
                    mainObject.m_Log.Write("Hotmail-SR-BETAR - mailBoxOnloadHandler - folder links: " +aszJunkFolder);
                    mainObject.m_szJunkFolderURI = mainObject.m_szLocationURI + aszJunkFolder[1];
                    mainObject.m_Log.Write("Hotmail-SR-BETAR - mailBoxOnloadHandler - folder uri: " +mainObject.m_szJunkFolderURI);
                }
                catch(err)
                {
                    mainObject.m_Log.DebugDump("Hotmail-SR-BETAR: mailBoxOnloadHandler folder: Exception : " 
                                                      + err.name 
                                                      + ".\nError message: " 
                                                      + err.message+ "\n"
                                                      + err.lineNumber);
                }   
            }
                     
                      
            //get pages uri
            var aszNextPage = szResponse.match(patternHotmailPOPNextPage);
            mainObject.m_Log.Write("Hotmail-SR-BETAR - mailBoxOnloadHandler -aszNextPage : " +aszNextPage);
            var szNextPage = null;
            if (aszNextPage)  //get next url
            {
                szNextPage = mainObject.m_szLocationURI + aszNextPage[1];
                mainObject.m_Log.Write("Hotmail-SR-BETAR - mailBoxOnloadHandler -next page url : " +szNextPage);
            }
            
            //get view state
            if (!mainObject.m_szViewState)
            {
                mainObject.m_szViewState = szResponse.match(patternHotmailPOPViewState)[1];
                mainObject.m_Log.Write("Hotmail-SR-BETAR - mailBoxOnloadHandler - szViewState : " +mainObject.m_szViewState);
            }
            
            
            //delete uri
            if (!mainObject.m_szDelete)
            {
                mainObject.m_szDelete = szResponse.match(patternHotmailPOPAction)[1];
                mainObject.m_Log.Write("Hotmail-SR-BETAR - mailBoxOnloadHandler - m_szDeleteURI : " +mainObject.m_szDelete);
            }
            
                
            //get msg urls
            var aMsgTable = szResponse.match(patternHotmailPOPMailBoxTable);
            mainObject.m_Log.Write("Hotmail-SR-BETAR - mailBoxOnloadHandler -msg table : " +aMsgTable);
            if (aMsgTable) 
            {
                var szMsgRows = aMsgTable[0].match(patternHotmailPOPMailBoxTableRow);  //split on rows
                mainObject.m_Log.Write("Hotmail-SR-BETAR - mailBoxOnloadHandler -split msg table : " +szMsgRows);
                if (szMsgRows) 
                {
                
                    for (j = 0; j < szMsgRows.length; j++)
                    {
                        mainObject.m_Log.Write("Hotmail-SR-BETAR - mailBoxOnloadHandler - row  : " +szMsgRows[j]);
                                      
                        var bRead = true;
                        if (mainObject.m_bDownloadUnread)
                        {
                            bRead = (szMsgRows[j].search(patternHotmailPOPEmailRead)!=-1) ? false : true;
                            mainObject.m_Log.Write("HotmailWebDav.js - mailBoxOnloadHandler - bRead -" + bRead);
                        }
                         
                        if (bRead)
                        {       
                            var oMSG = new HotmailMSG();
                            
                            var szEmailURL = szMsgRows[j].match(patternHotmailPOPEMailURL)[1];
                            var szPath = mainObject.m_szLocationURI + szEmailURL;
                            mainObject.m_Log.Write("Hotmail-SR-BETAR - mailBoxOnloadHandler - Email URL : " +szPath);
                            oMSG.szMSGUri = szPath;
                                                
                            oMSG.iSize = 2000;    //size unknown
                            mainObject.m_iTotalSize += oMSG.iSize;
                            
                            oMSG.bJunkFolder = mainObject.m_bJunkMailDone;
                            oMSG.szTo = mainObject.m_szUserName;
                    
                            var szFrom = "";
                            try
                            {
                                szFrom = szMsgRows[j].match(patternHotmailPOPEmailSender)[1];
                                szFrom = mainObject.removeHTML(szFrom);
                                mainObject.m_Log.Write("Hotmail-SR-BETAR - mailBoxOnloadHandler - Email From : " +szFrom);
                            }
                            catch(err){}
                            oMSG.szFrom = szFrom;
                            
                            var szSubject= "";
                            try
                            {
                                szSubject= szMsgRows[j].match(patternHotmailPOPEmailSubject)[1];
                                szSubject= mainObject.removeHTML(szSubject);                          
                                mainObject.m_Log.Write("Hotmail-SR-BETAR - mailBoxOnloadHandler - Email szSubject : " +szSubject);           
                            }
                            catch(err){}
                            oMSG.szSubject = szSubject;
                             
                           
                            try
                            { 
                                var szRawDate = szMsgRows[j].match(patternHotmailPOPEmailDate)[1];
                                mainObject.m_Log.Write("HotmailWebDav.js - mailBoxOnloadHandler - raw date/time "+szRawDate);
                                var today = new Date();
                                
                                //check for time
                                if (szRawDate.search(/:/)!=-1)
                                {
                                    var aTime = szRawDate.split(/:/);                        
                                    mainObject.m_Log.Write("HotmailWebDav.js - mailBoxOnloadHandler - time "+aTime);
                                    today.setHours(aTime[1]);
                                    today.setMinutes(aTime[2]);
                                } 
                                else   //date
                                {
                                    var aDate = szRawDate.split(/\//);                            
                                    mainObject.m_Log.Write("HotmailWebDav.js - mailBoxOnloadHandler - date "+aDate); 
                                    today.setDate(aDate[0]);
                                    today.setMonth(aDate[1]);
                                    today.setFullYear(aDate[2]);
                                }
                                              
                                oMSG.szDate = today.toUTCString();
                                mainObject.m_Log.Write("HotmailWebDav.js - mailBoxOnloadHandler - " + oMSG.szDate);
                            }
                            catch(err){}
                            
                            mainObject.m_aMsgDataStore.push(oMSG);
                        }
                    } 
                } 
            }
           
            mainObject.m_HttpComms.clean();                
                                                                         
            if (szNextPage)//more pages
            {           
                //set cookies
                mainObject.m_HttpComms.setURI(szNextPage);
                mainObject.m_HttpComms.setRequestMethod("GET");
                var bResult = mainObject.m_HttpComms.send(mainObject.mailBoxOnloadHandler); 
                if (!bResult) throw new Error("httpConnection returned false");
            }
            else  //done with mailbox
            {  
                mainObject.m_Log.Write("Hotmail-SR-BETAR - mailBoxOnloadHandler - use junkmail: " 
                                                        + mainObject.m_bUseJunkMail
                                                        + " Done " + mainObject.m_bJunkMailDone
                                                        + " uri " + mainObject.m_szJunkFolderURI );
                 
                if (!mainObject.m_bJunkMailDone && mainObject.m_bUseJunkMail && mainObject.m_szJunkFolderURI)
                { //get junkmail
                    mainObject.m_Log.Write("Hotmail-SR-BETAR - mailBoxOnloadHandler - junkmail: " + mainObject.m_bUseJunkMail); 
                    
                    mainObject.m_bJunkMailDone = true;
                    mainObject.m_iPageCount = 0; //reset array
                    mainObject.m_aszPageURLS = new Array;

                    mainObject.m_HttpComms.setURI(mainObject.m_szJunkFolderURI);
                    mainObject.m_HttpComms.setRequestMethod("GET");
                    var bResult = mainObject.m_HttpComms.send(mainObject.mailBoxOnloadHandler); 
                    if (!bResult) throw new Error("httpConnection returned false");
                }
                else  //all uri's collected
                {
                   mainObject.serverComms("+OK "+ mainObject.m_aMsgDataStore.length + " " 
                                                + mainObject.m_iTotalSize + "\r\n");
                }
            }
            mainObject.m_Log.Write("Hotmail-SR-BETAR - MailBoxOnload - END"); 
        }
        catch(err)
        {
             mainObject.m_Log.DebugDump("Hotmail-SR-BETAR: MailboxOnload : Exception : " 
                                              + err.name 
                                              + ".\nError message: " 
                                              + err.message+ "\n"
                                              + err.lineNumber);
            
            mainObject.serverComms("-ERR negative vibes from " +mainObject.m_szUserName+ "\r\n");
            
        }   
    },
 
    
                     
    //list
    //i'm not downloading the mailbox again. 
    //I hope stat been called first or there's going to be trouble
    getMessageSizes : function() 
    {
        try
        {
            this.m_Log.Write("Hotmail-SR-BETAR - getMessageSizes - START"); 
            
            var szPOPResponse = "+OK " + this.m_aMsgDataStore.length + " Messages\r\n";
            for (i = 0; i <  this.m_aMsgDataStore.length; i++)
            {
                var iSize = this.m_aMsgDataStore[i].iSize;
                this.m_Log.Write("Hotmail-SR-BETAR - getMessageSizes - size : " +iSize);    
                szPOPResponse+=(i+1) + " " + iSize + "\r\n";  
            }
            szPOPResponse += ".\r\n";
            
            this.serverComms(szPOPResponse);
            this.m_Log.Write("Hotmail-SR-BETAR - getMessageSizes - END"); 
            return true;
        }
        catch(e)
        {
            this.m_Log.DebugDump("Hotmail-SR-BETAR: getMessageSizes : Exception : " 
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
            this.m_Log.Write("Hotmail-SR-BETAR - getMessageIDs - START"); 
            
             var szPOPResponse = "+OK " + this.m_aMsgDataStore.length + " Messages\r\n";
            
            for (i = 0; i <  this.m_aMsgDataStore.length; i++)
            {
                var szEmailURL = this.m_aMsgDataStore[i].szMSGUri;
                this.m_Log.Write("Hotmail-SR-BETAR - getMessageIDs - Email URL : " +szEmailURL);
        
                var szEmailID = szEmailURL.match(patternHotmailPOPEMailID)[1];
                    
                this.m_Log.Write("Hotmail-SR-BETAR - getMessageIDs - IDS : " +szEmailID);    
                szPOPResponse+=(i+1) + " " + szEmailID + "\r\n";   
            }         
     
            szPOPResponse += ".\r\n";
            this.serverComms(szPOPResponse);           
           
            this.m_Log.Write("Hotmail-SR-BETAR - getMessageIDs - END"); 
            return true;
        }
        catch(e)
        {
            this.m_Log.DebugDump("Hotmail-SR-BETAR: getMessageIDs : Exception : " 
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
            this.m_Log.Write("Hotmail-SR-BETAR.js - getHeaders - START");  
            this.m_Log.Write("Hotmail-SR-BETAR.js - getHeaders - id " + lID ); 
            
            var oMSG = this.m_aMsgDataStore[lID-1];
            
            var szHeaders = "X-WebMail: true\r\n";
            szHeaders += "X-JunkFolder: " +(oMSG.bJunkFolder? "true":"false")+ "\r\n";
            szHeaders += "To: "+ oMSG.szTo +"\r\n";
            szHeaders += "From: "+ oMSG.szFrom +"\r\n";
            szHeaders += "Subject: "+ oMSG.szSubject +"\r\n";
            szHeaders += "Date: " + oMSG.szDate +"\r\n"; // \r\n";
            szHeaders += "\r\n.\r\n";//msg end 
           
            var  szResponse = "+OK " +szHeaders.length + "\r\n"; 
            szResponse += szHeaders
            this.serverComms(szResponse);
            
            this.m_Log.Write("Hotmail-SR-BETAR.js - getHeaders - END");
            return true; 
        }
        catch(err)
        {
            this.m_Log.DebugDump("Hotmail-SR-BETAR.js: getHeaders : Exception : " 
                                          + err.name + 
                                          ".\nError message: " 
                                          + err.message+ "\n"
                                          + err.lineNumber);
            return false;
        }
    },
    


    //retr
    getMessage : function( lID)
    {
        try
        {
            this.m_Log.Write("Hotmail-SR-BETAR - getMessage - START"); 
            this.m_Log.Write("Hotmail-SR-BETAR - getMessage - msg num" + lID); 
           
            //get msg id
            var oMSG = this.m_aMsgDataStore[lID-1];
            var szMSGID = oMSG.szMSGUri.match(patternHotmailPOPEMailID)[1];
            
            var IOService = Components.classes["@mozilla.org/network/io-service;1"];
            IOService = IOService.getService(Components.interfaces.nsIIOService);
            var nsIURI = IOService.newURI(oMSG.szMSGUri, null, null);
            var szDirectory = nsIURI.QueryInterface(Components.interfaces.nsIURL).directory;
            this.m_Log.Write("Hotmail-SR-POP-BETA - loginOnloadHandler - directory : " +szDirectory);           
            var szURL = this.m_szLocationURI+szDirectory;
            this.m_Log.Write("Hotmail-SR-POP-BETA - loginOnloadHandler - szURL : " +szURL); 
            
            var szMsgURI = szURL + "GetMessageSource.aspx?msgid=" + szMSGID;
            this.m_Log.Write("Hotmail-SR-BETAR - getMessage - msg uri" + szMsgURI); 
                  
            this.m_bJunkMail = oMSG.bJunkFolder;
            this.m_iStage = 0;
            
            //get msg from hotmail
            this.m_HttpComms.clean();
            this.m_HttpComms.setURI(szMsgURI);
            this.m_HttpComms.setRequestMethod("GET");
            var bResult = this.m_HttpComms.send(this.emailOnloadHandler); 
            if (!bResult) throw new Error("httpConnection returned false");
            
            this.m_Log.Write("Hotmail-SR-BETAR - getMessage - END"); 
            return true;
        }
        catch(e)
        {
             this.m_Log.DebugDump("Hotmail-SR-BETAR: getMessage : Exception : " 
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
            mainObject.m_Log.Write("Hotmail-SR-BETAR - emailOnloadHandler - START");
             
            var httpChannel = event.QueryInterface(Components.interfaces.nsIHttpChannel);
            mainObject.m_Log.Write("Hotmail-SR-BETAR - emailOnloadHandler - msg :" + httpChannel.responseStatus);
                       
            //check status should be 200.
            if (httpChannel.responseStatus != 200) 
                throw new Error("error status " + httpChannel.responseStatus);   
        
            var szMSG = "X-WebMail: true\r\n";
            szMSG += "X-JunkFolder: " + (mainObject.m_bJunkMail? "true":"false")+ "\r\n";
                                                                                 
            //get msg
            var aTemp = szResponse.split(/<pre>/); 
            if (!aTemp) throw new Error("Message START  not found");     
            var szEmail = aTemp[1].split(/<\/pre>/)[0];
            if (!szEmail) throw new Error("Message END  not found"); 
            
            szMSG += szEmail;
            
            //clean up msg
            szMSG = mainObject.removeHTML(szMSG);
            szMSG =  szMSG.replace(/^\./mg,"..");    //bit padding   
            szMSG += "\r\n.\r\n";
            
            var szPOPResponse = "+OK " +  szMSG.length + "\r\n";                  
            szPOPResponse +=  szMSG;
        
            mainObject.serverComms(szPOPResponse);                    
            mainObject.m_Log.Write("Hotmail-SR-BETAR - emailOnloadHandler - END");      
        }
        catch(err)
        {
            mainObject.m_Log.DebugDump("Hotmail-SR-BETAR: emailOnloadHandler : Exception : " 
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
            this.m_Log.Write("Hotmail-SR-BETAR - deleteMessage - START");  
            this.m_Log.Write("Hotmail-SR-BETAR - deleteMessage - id " + lID ); 
                 
            var oMSG = this.m_aMsgDataStore[lID-1];
            var szID = oMSG.szMSGUri.match(patternHotmailPOPEMailID)[1]; //msg id
            this.m_Log.Write("Hotmail-SR-BETAR - deleteMessage - MSGid " + szID );    
                
            this.m_HttpComms.clean();
            this.m_HttpComms.setContentType(0);
            this.m_HttpComms.setRequestMethod("POST");
            
            var IOService = Components.classes["@mozilla.org/network/io-service;1"];
            IOService = IOService.getService(Components.interfaces.nsIIOService);
            var nsIURI = IOService.newURI(oMSG.szMSGUri, null, null);
            var szDirectory = nsIURI.QueryInterface(Components.interfaces.nsIURL).directory;
            this.m_Log.Write("Hotmail-SR-POP-BETA - loginOnloadHandler - directory : " +szDirectory);           
            var szURL = this.m_szLocationURI+szDirectory;
            this.m_Log.Write("Hotmail-SR-POP-BETA - loginOnloadHandler - szURL : " +szURL);           
            
            
            var szFolderID = oMSG.szMSGUri.match(patternHotmailPOPFolderID)[1];
            this.m_HttpComms.setURI(szURL+this.m_szDelete+"&FolderID="+szFolderID);
            var szViewState = encodeURIComponent(this.m_szViewState);
            this.m_HttpComms.addValuePair("__VIEWSTATE",szViewState);
            this.m_HttpComms.addValuePair("InboxDeleteMessages","Delete");
            this.m_HttpComms.addValuePair("messages",szID);
            this.m_HttpComms.addValuePair(szID,"on");
            
            var bResult = this.m_HttpComms.send(this.deleteMessageOnloadHandler);                   
            if (!bResult) throw new Error("httpConnection returned false");

            this.m_Log.Write("Hotmail-SR-BETAR - deleteMessage - END");     
            return true;
        }
        catch(e)
        {
            this.m_Log.DebugDump("Hotmail-SR-BETAR: deleteMessage : Exception : " 
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
            mainObject.m_Log.Write("Hotmail-SR-BETAR - deleteMessageOnload - START");    
                    
            var httpChannel = event.QueryInterface(Components.interfaces.nsIHttpChannel);
            
            //check status should be 200.
            mainObject.m_Log.Write("Hotmail-SR-BETAR - deleteMessageOnload :" + httpChannel.responseStatus);
            if (httpChannel.responseStatus != 200 ) 
                throw new Error("error status " + httpChannel.responseStatus);   
                    
            mainObject.serverComms("+OK its history\r\n");      
            mainObject.m_Log.Write("Hotmail-SR-BETAR - deleteMessageOnload - END");      
        }
        catch(e)
        {
            mainObject.m_Log.DebugDump("Hotmail-SR-BETAR: deleteMessageOnload : Exception : " 
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
            this.m_Log.Write("Hotmail-SR-BETAR - logOUT - START"); 
            
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
            this.m_SessionManager.setSessionData(this.m_SessionData);
              
            this.m_bAuthorised = false;
            this.serverComms("+OK Your Out\r\n");  
                                           
            this.m_Log.Write("Hotmail-SR-BETAR - logOUT - END");  
            return true;
        }
        catch(e)
        {
            this.m_Log.DebugDump("Hotmail-SR-BETAR: logOUT : Exception : " 
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
            this.m_Log.Write("Hotmail-SR-BETAR - serverComms - START");
            this.m_Log.Write("Hotmail-SR-BETAR - serverComms msg " + szMsg);
            var iCount = this.m_oResponseStream.write(szMsg,szMsg.length);
            this.m_Log.Write("Hotmail-SR-BETAR - serverComms sent count: " + iCount 
                                                        +" msg length: " +szMsg.length);
            this.m_Log.Write("Hotmail-SR-BETAR - serverComms - END");  
        }
        catch(e)
        {
            this.m_Log.DebugDump("Hotmail-SR-BETAR: serverComms : Exception : " 
                                              + e.name 
                                              + ".\nError message: " 
                                              + e.message+ "\n"
                                              + e.lineNumber);
        }
    },
    
    removeHTML : function (szRaw)
    {
        this.m_Log.Write("Hotmail-SR-BETAR - removeHTML - START");
        var szMsg = szRaw.replace(/&lt;/g,"<");
        szMsg = szMsg.replace(/&gt;/g,">");
        szMsg = szMsg.replace(/&quot;/g, "\"");
        szMsg = szMsg.replace(/&amp;/g, "&");
        szMsg = szMsg.replace(/&nbsp;/g, " ");   
        szMsg = szMsg.replace(/<strong>/g, "");
        szMsg = szMsg.replace(/<\/strong>/g, "");  
        this.m_Log.Write("Hotmail-SR-BETAR - removeHTML - ENd")  
        return szMsg;
    },
}
