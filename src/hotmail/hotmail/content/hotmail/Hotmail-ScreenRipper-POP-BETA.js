function HotmailScreenRipperBETA(oResponseStream, oLog, oPrefData)
{
    try
    {       
        var scriptLoader = Components.classes["@mozilla.org/moz/jssubscript-loader;1"];
        scriptLoader = scriptLoader.getService(Components.interfaces.mozIJSSubScriptLoader);
        scriptLoader.loadSubScript("chrome://web-mail/content/common/DebugLog.js");
        scriptLoader.loadSubScript("chrome://web-mail/content/common/HttpComms2.js");
        scriptLoader.loadSubScript("chrome://hotmail/content/Hotmail-MSG.js");
        scriptLoader.loadSubScript("chrome://hotmail/content/Hotmail-Prefs-Data.js");
        scriptLoader.loadSubScript("chrome://hotmail/content/Hotmail-FolderList.js");   
        
        this.m_Log = oLog;
        this.m_Log.Write("Hotmail-SR-BETAR - Constructor - START");   
       
        this.m_szUserName = null;   
        this.m_szPassWord = null; 
        this.m_oResponseStream = oResponseStream;  
        this.m_HttpComms = new HttpComms(this.m_Log);   
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
        this.m_szMailBoxURI = null;
        
        this.m_SessionManager = Components.classes["@mozilla.org/SessionManager;1"]
                                          .getService(Components.interfaces.nsISessionManager);
        this.m_SessionData = null;

        this.m_bReEntry = false;
        
        this.m_bReUseSession = oPrefData.bReUseSession;    //do i reuse the session
        this.m_bUseJunkMail= oPrefData.bUseJunkMail;       //do i download junkmail
        this.m_bDownloadUnread = oPrefData.bDownloadUnread; //do i download unread only
             
        this.m_bStat = false;
          
        //process folders
        this.m_szFolderName = null;
        
        this.m_aszFolders = new Array();
        for(var i=0; i<oPrefData.aszFolder.length; i++)
        {
            this.m_aszFolders.push(oPrefData.aszFolder[i]);
        }
        this.m_Log.Write("Hotmail-SR-BETAR.js - Constructor - m_aszFolders "+ this.m_aszFolders);
        this.m_bFoldersProcessed = false;
        this.m_aszFolderURLList = new Array();                 
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
            this.m_HttpComms.setURI("http://www.hotmail.com");
            this.m_HttpComms.addRequestHeader("User-Agent", UserAgent, true);                    
            
            //get session data
                       //get session data
            if (this.m_bReUseSession)
            { 
                this.m_Log.Write("Hotmail-SR-BETAR - logIN - Getting Session Data");   
                this.m_SessionData = this.m_SessionManager.findSessionData(this.m_szUserName);
                if (this.m_SessionData)
                {    
                    this.m_Log.Write("Hotmail-SR-BETAR - logIN - Session Data found"); 
                    if (this.m_SessionData.oComponentData)
                    {
                        this.m_HttpComms.setCookieManager(this.m_SessionData.oCookieManager);
                        this.m_szHomeURI = this.m_SessionData.oComponentData.findElement("szHomeURI");
                        this.m_Log.Write("Hotmail-SR-BETAR - logIN - szHomeURI " +this.m_szHomeURI);
                        
                        if (this.m_szHomeURI)
                        {
                            this.m_Log.Write("Hotmail-SR-BETAR - logIN - Session Data Found"); 
                            this.m_iStage =3;
                            this.m_bReEntry = true;
                            this.m_HttpComms.setURI(this.m_szHomeURI);
                        }
                    }
                }
            }  
                
            this.m_HttpComms.setRequestMethod("GET");
            var bResult = this.m_HttpComms.send(this.loginOnloadHandler, this);  
            if (!bResult) throw new Error("httpConnection returned false");        

              
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
            mainObject.m_Log.Write("Hotmail-SR-BETA - loginOnloadHandler - START"); 
           // mainObject.m_Log.Write("Hotmail-SR-BETA - loginOnloadHandler : \n" + szResponse);
            mainObject.m_Log.Write("Hotmail-SR-BETA - loginOnloadHandler : " + mainObject.m_iStage);  
            
            var httpChannel = event.QueryInterface(Components.interfaces.nsIHttpChannel);
            mainObject.m_Log.Write("Hotmail-SR-BETAR - loginOnloadHandler - status :" +httpChannel.responseStatus );
            
            //if this fails we've gone somewhere new
            if (httpChannel.responseStatus != 200 ) 
                throw new Error("return status " + httpChannel.responseStatus);
            
            mainObject.m_HttpComms.addRequestHeader("User-Agent", UserAgent, true);                   

            //check for java refresh
            var aRefresh = szResponse.match(patternHotmailPOPJSRefresh);
            if (aRefresh)
            {
                mainObject.m_Log.Write("Hotmail-SR-BETAR - loginOnloadHandler - refresh "); 
                
                mainObject.m_HttpComms.setURI(aRefresh[1]);
                mainObject.m_HttpComms.setRequestMethod("GET");
                
                var bResult = mainObject.m_HttpComms.send(mainObject.loginOnloadHandler, mainObject);   
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
                    var bResult = mainObject.m_HttpComms.send(mainObject.loginOnloadHandler, mainObject);   
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
                                    szData = mainObject.urlEncode(mainObject.m_szUserName);
                                else if (szName.search(/passwd/i)!=-1)
                                    szData = mainObject.urlEncode(mainObject.m_szPassWord);
                                else if (szName.search(/PwdPad/i)!=-1)
                                {
                                    var szPasswordPadding = "IfYouAreReadingThisYouHaveTooMuchFreeTime";
                                    var lPad=szPasswordPadding.length-mainObject.m_szPassWord.length;
                                    szData = szPasswordPadding.substr(0,(lPad<0)?0:lPad);
                                }
                                else 
                                    szData = mainObject.urlEncode(szValue);
                                    
                                mainObject.m_HttpComms.addValuePair(szName,szData);
                            }
                        }
                    }
                    
                    var szAction = aForm[0].match(patternHotmailPOPAction)[1];
                    mainObject.m_Log.Write("Hotmail-SR-BETAR- loginOnloadHandler "+ szAction);
                    var szDomain = mainObject.m_szUserName.split("@")[1];
                    var szRegExp = "g_DO\\[\""+szDomain+"\"\\]=\"(.*?)\"";
                    mainObject.m_Log.Write("Hotmail-SR-BETAR- loginOnloadHandler szRegExp "+ szRegExp);
                    var regExp = new RegExp(szRegExp,"i");
                    var aszURI = szResponse.match(regExp);
                    mainObject.m_Log.Write("Hotmail-SR-BETAR- loginOnloadHandler aszURI "+ aszURI);
                    var szURI = null;
                    if (!aszURI)
                    {
                        szURI = szAction;
                    }
                    else
                    {
                        var szQS =  szResponse.match(patternHotmailPOPQS)[1];    
                        mainObject.m_Log.Write("Hotmail-SR- loginOnloadHandler szQuery "+ szQS); 
                        szURI = aszURI[1] + "?" + szQS; 
                    }
                    mainObject.m_HttpComms.setURI(szURI);                    
                    
                    mainObject.m_HttpComms.setRequestMethod("POST");
                    var bResult = mainObject.m_HttpComms.send(mainObject.loginOnloadHandler, mainObject);                   
                    if (!bResult) throw new Error("httpConnection returned false");
                    mainObject.m_iStage++;
                break;
                
                case 2: //JS bounce
                    var aRefresh = szResponse.match(patternHotmailPOPForm);
                    mainObject.m_Log.Write("Hotmail-SR - loginOnloadHandler - refresh "+ aRefresh); 
                   
                    if (aRefresh)
                    {   
                        //action
                        var szAction = aRefresh[0].match(patternHotmailPOPAction)[1];
                        mainObject.m_Log.Write("Hotmail-SR-BETAR loginOnloadHandler "+ szAction);
                        mainObject.m_HttpComms.setURI(szAction);
                        
                        //form data  
                        var aInput =  aRefresh[0].match(patternHotmailPOPInput);
                        mainObject.m_Log.Write("Hotmail-SR-BETAR loginOnloadHandler "+ aInput); 
                        var szName =  aInput[0].match(patternHotmailPOPName)[1];
                        var szValue =  aInput[0].match(patternHotmailPOPValue)[1];
                        szValue = encodeURIComponent(szValue);
                        mainObject.m_HttpComms.addValuePair(szName,szValue);
                        mainObject.m_HttpComms.setRequestMethod("POST");  
                    }
                    else
                    {
                        aRefresh = szResponse.match(patternHotmailPOPRefresh);
                        
                        if (!aRefresh)
                            aRefresh = szResponse.match(patternHotmailPOPJavaRefresh);
                            
                        mainObject.m_Log.Write("Hotmail-SR-BETAR - loginOnloadHandler refresh "+ aRefresh); 
                        if (aRefresh == null) throw new Error("error parsing login page");    
                        
                        mainObject.m_HttpComms.setURI(aRefresh[1]);
                        mainObject.m_HttpComms.setRequestMethod("GET");
                    } 
           
                    var bResult = mainObject.m_HttpComms.send(mainObject.loginOnloadHandler, mainObject);   
                    if (!bResult) throw new Error("httpConnection returned false");
                    mainObject.m_iStage++;
                break;
               
                case 3://inbox 

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
                            var bResult = mainObject.m_HttpComms.send(mainObject.loginOnloadHandler, mainObject);                             
                            if (!bResult) throw new Error("httpConnection returned false");
                            return;
                        }
                        else
                            throw new Error("error logging in");
                    } 
                    
                    //get urls for later use                  
                    mainObject.m_szLocationURI = httpChannel.URI.prePath ;
                    mainObject.m_Log.Write("Hotmail-SR-BETAR - loginOnloadHandler - m_szLocationURI : "+mainObject.m_szLocationURI );
                                    
                    var oFolder = new FolderData();
                    oFolder.szURI = mainObject.m_szLocationURI + szResponse.match(patternHotmailPOPInbox)[1];
                    mainObject.m_Log.Write("Hotmail-SR-BETAR - loginOnloadHandler - inbox : "+oFolder.szURI);
                    oFolder.szFolderName = "INBOX";
                    mainObject.m_aszFolderURLList.push(oFolder);
                    mainObject.m_szMailBoxURI = oFolder.szURI ;
                    
                    // get trash folder uri      
                    if (mainObject.m_bUseJunkMail)
                    {
                        oFolder = new FolderData();
                        oFolder.szURI =  mainObject.m_szLocationURI + szResponse.match(patternHotmailPOPJunkFolderID)[1];
                        oFolder.szFolderName = "Junk Mail";
                        mainObject.m_Log.Write("Hotmail-SR-BETAR - loginOnloadHandler - Junk Mail: " + oFolder.szURI);
                        mainObject.m_aszFolderURLList.push(oFolder);
                    }
                    
                      
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
            
            if (this.m_aszFolderURLList.length==0) return false;  
            this.m_HttpComms.addRequestHeader("User-Agent", UserAgent, true);            

            this.m_iStage = 0; 
            var oFolder = this.m_aszFolderURLList.shift(); 
            this.szFolderName = oFolder.szFolderName;
            this.m_Log.Write("Hotmail-SR-BETAR - getNumMessages - mail box url " + oFolder.szURI);
            this.m_HttpComms.setURI(oFolder.szURI);
            this.m_HttpComms.setRequestMethod("GET");

            var bResult = this.m_HttpComms.send(this.mailBoxOnloadHandler, this); 
            if (!bResult) throw new Error("httpConnection returned false");
            this.m_bStat = true;            
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
           // mainObject.m_Log.Write("Hotmail-SR-BETA - mailBoxOnloadHandler : \n" + szResponse);
            mainObject.m_Log.Write("Hotmail-SR-BETAR - mailBoxOnloadHandler : " + mainObject.m_iStage);  
            
            var httpChannel = event.QueryInterface(Components.interfaces.nsIHttpChannel);
            mainObject.m_Log.Write("Hotmail-SR-BETAR - mailBoxOnloadHandler - Mailbox :" + httpChannel.responseStatus);          
            
            //check status should be 200.
            if (httpChannel.responseStatus != 200 ) 
                throw new Error("error status " + httpChannel.responseStatus);   
            
            mainObject.m_HttpComms.addRequestHeader("User-Agent", UserAgent, true);     
             
             
            //other folders
            if (!mainObject.m_bFoldersProcessed && mainObject.m_aszFolders.length>0)
            {
                mainObject.m_Log.Write("Hotmail-SR-BETAR - mailBoxOnloadHandler - processing folders");
                mainObject.m_bFoldersProcessed = true;
                
                var szFolderList = szResponse.match(patternHotmailPOPFolderList);
                mainObject.m_Log.Write("Hotmail-SR-BETAR - mailBoxOnloadHandler - szFolderList : "+szFolderList);
                var aszFolderList = szResponse.match(patternHotmailPOPFolderOption);
                mainObject.m_Log.Write("Hotmail-SR-BETAR - mailBoxOnloadHandler - aszFolderList : "+aszFolderList);
                if (aszFolderList)
                {
                    for (var i=0 ; i<mainObject.m_aszFolders.length; i++ )
                    {
                        var regExp = new RegExp("^"+mainObject.m_aszFolders[i]+"$","i");
                        mainObject.m_Log.Write("Hotmail-SR-BETAR - mailBoxOnloadHandler - regExp : "+regExp );
    
                        for (var j=0; j<aszFolderList.length; j++)
                        {
                            var szTitle = aszFolderList[j].match(patternHotmailPOPTitle)[1];   
                            mainObject.m_Log.Write("Hotmail-SR-BETAR - mailBoxOnloadHandler - folder szTitle: " +szTitle); 
                             
                            if (szTitle.search(regExp)!=-1)
                            {
                                var szID = aszFolderList[j].match(patternHotmailPOPFolderHref)[1];
                                mainObject.m_Log.Write("Hotmail-SR-BETAR - mailBoxOnloadHandler - folder szID: " +szID);
                                var szURI = mainObject.m_szMailBoxURI + "&FolderID=" + szID;
                                mainObject.m_Log.Write("Hotmail-SR-BETAR - mailBoxOnloadHandler - Found URI : " +szURI);
                                var oFolder = new FolderData();
                                oFolder.szFolderName = szTitle;
                                oFolder.szURI = szURI;
                                mainObject.m_aszFolderURLList.push(oFolder);   
                            }
                        }
                    }
                }                                
            }  
              
            //delete uri
            if (!mainObject.m_szDelete)
            {
                mainObject.m_szDelete = szResponse.match(patternHotmailPOPAction)[1];
                mainObject.m_Log.Write("Hotmail-SR-BETAR - mailBoxOnloadHandler - m_szDeleteURI : " +mainObject.m_szDelete);
            }
                           
            //search for inbox content
            if (szResponse.search(patternHotmailPOPInboxCotent)==-1)
                throw new Error("Error Parsing Web Page");
                
            //get msg urls
            var aMsgTable = szResponse.match(patternHotmailPOPMailBoxTable);
            mainObject.m_Log.Write("Hotmail-SR-BETAR - mailBoxOnloadHandler -msg table : " +aMsgTable);
            if (aMsgTable) 
            {
                //get view state
                var szStatView = szResponse.match(patternHotmailPOPViewState)[1];
                mainObject.m_Log.Write("Hotmail-SR-BETAR - mailBoxOnloadHandler - szViewState : " +szStatView);
      
                var szMsgRows = aMsgTable[0].match(patternHotmailPOPMailBoxTableRow);  //split on rows
                mainObject.m_Log.Write("Hotmail-SR-BETAR - mailBoxOnloadHandler -split msg table : " +szMsgRows);
                if (szMsgRows) 
                {
                    for (j = 0; j < szMsgRows.length; j++)
                    {
                        mainObject.m_Log.Write("Hotmail-SR-BETAR - mailBoxOnloadHandler - row  : " +szMsgRows[j]);
                        var oMSG = mainObject.processMSG(szMsgRows[j],szStatView); 
                        if (oMSG) mainObject.m_aMsgDataStore.push(oMSG);
                    } 
                } 
            }
            else
            {
                mainObject.m_Log.Write("Hotmail-SR-BETAR - mailBoxOnloadHandler - check for empty mail box");                
                if (szResponse.search(patternHotmailPOPInboxNoContent)==-1)
                    throw new Error("Error Parsing Web Page");
            }               
            
            
            //get pages uri
            var aszNextPage = szResponse.match(patternHotmailPOPNextPage);
            if (aszNextPage)  //get next url
            {
                mainObject.m_Log.Write("Hotmail-SR-BETAR - mailBoxOnloadHandler -aszNextPage : " +aszNextPage[1]);
                var szNextPage = mainObject.m_szLocationURI + aszNextPage[1];
                mainObject.m_Log.Write("Hotmail-SR-BETAR - mailBoxOnloadHandler -next page url : " +szNextPage);
                  
                mainObject.m_HttpComms.setURI(szNextPage);
                mainObject.m_HttpComms.setRequestMethod("GET");
                var bResult = mainObject.m_HttpComms.send(mainObject.mailBoxOnloadHandler, mainObject); 
                if (!bResult) throw new Error("httpConnection returned false");
            }
            else  //done with mailbox
            {                   
                if (mainObject.m_aszFolderURLList.length>0)
                { 
                    var oFolder = mainObject.m_aszFolderURLList.shift();
                    mainObject.m_Log.Write("Hotmail-SR-BETAR - mailBoxOnloadHandler - :" + oFolder.szURI); 
                    mainObject.m_szFolderName = oFolder.szName;
                    mainObject.m_iPageCount = 0; //reset array
                    mainObject.m_aszPageURLS = new Array;

                    mainObject.m_HttpComms.setURI(oFolder.szURI);
                    mainObject.m_HttpComms.setRequestMethod("GET");

                    var bResult = mainObject.m_HttpComms.send(mainObject.mailBoxOnloadHandler, mainObject); 
                    if (!bResult) throw new Error("httpConnection returned false");
                }
                else  //all uri's collected
                {
                    if (mainObject.m_bStat) //called by stat
                    {
                        mainObject.serverComms("+OK "+ mainObject.m_aMsgDataStore.length + " " + mainObject.m_iTotalSize + "\r\n");
                    }
                    else //called by list
                    {
                        mainObject.serverComms("+OK " + mainObject.m_aMsgDataStore.length + " Messages\r\n"); 
                        this.m_Log.Write("Hotmail-SR-BETAR.js - mailBoxOnloadHandler - : " + mainObject.m_aMsgDataStore.length);
         
                        for (i = 0; i <  mainObject.m_aMsgDataStore.length; i++)
                        {
                            var iEmailSize = mainObject.m_aMsgDataStore[i].iSize;
                            mainObject.serverComms((i+1) + " " + iEmailSize + "\r\n");       
                        }         
                        
                        mainObject.serverComms(".\r\n");
                    }
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
 
    
    
    processMSG : function (szMSGData,szStatView)
    {
        this.m_Log.Write("Hotmail-SR-BETAR - processMSG - START");
        this.m_Log.Write("Hotmail-SR-BETAR - processMSG - \n" + szMSGData);
        
        var oMSG =  null;
        var bRead = true;
        if (this.m_bDownloadUnread)
        {
            bRead = (szMSGData.search(patternHotmailPOPEmailRead)!=-1) ? true : false;
            this.m_Log.Write("HotmailWebDav.js - processMSG - bRead -" + bRead);
        }
         
        if (bRead)
        {       
            oMSG = new HotmailMSG();
            
            var szEmailURL = szMSGData.match(patternHotmailPOPEMailURL)[1];
            var szPath = this.m_szLocationURI + szEmailURL;
            this.m_Log.Write("Hotmail-SR-BETAR - processMSG - Email URL : " +szPath);
            oMSG.szMSGUri = szPath;
                                
            oMSG.iSize = 2000;    //size unknown
            this.m_iTotalSize += oMSG.iSize;
            
            oMSG.szFolder = this.m_bJunkMailDone;
            oMSG.szTo = this.m_szUserName;
    
            var szFrom = "";
            try
            {
                szFrom = szMSGData.match(patternHotmailPOPEmailSender)[1];
                szFrom = this.removeHTML(szFrom);
                this.m_Log.Write("Hotmail-SR-BETAR - processMSG - Email From : " +szFrom);
            }
            catch(err){}
            oMSG.szFrom = szFrom;
            
            var szSubject= "";
            try
            {
                szSubject= szMSGData.match(patternHotmailPOPEmailSubject)[1];
                szSubject= this.removeHTML(szSubject);                          
                this.m_Log.Write("Hotmail-SR-BETAR - processMSG - Email szSubject : " +szSubject);           
            }
            catch(err){}
            oMSG.szSubject = szSubject;
             
           
            try
            { 
                var szRawDate = szMSGData.match(patternHotmailPOPEmailDate)[1];
                this.m_Log.Write("Hotmail-SR-BETAR.js - processMSG - raw date/time "+szRawDate);
                var today = new Date();
                
                if (szRawDate.search(/:/)!=-1)//check for time
                {
                    var aTime = szRawDate.split(/:/);                        
                    this.m_Log.Write("Hotmail-SR-BETAR.js - processMSG - time "+aTime);
                    today.setHours(aTime[0]);
                    today.setMinutes(aTime[1]);
                } 
                else if (szRawDate.search(/\//)!=-1)   //date
                {
                    var aDate = szRawDate.split(/\//);                            
                    this.m_Log.Write("Hotmail-SR-BETAR.js - processMSG - date "+aDate); 
                    today.setDate(aDate[0]);
                    today.setMonth(aDate[1]-1);
                    today.setFullYear(aDate[2]);
                }
                else  //yesterday
                {
                     today.setDate(today.getDate()-1);
                }              
                oMSG.szDate = today.toUTCString();
                this.m_Log.Write("Hotmail-SR-BETAR.js - processMSG - " + oMSG.szDate);
            }
            catch(err){}
            
            oMSG.szStatView = szStatView;
        }
        
        this.m_Log.Write("Hotmail-SR-BETAR - processMSG - END");
        return oMSG;
    },
          
          
          
                     
    //list
    getMessageSizes : function() 
    {
        try
        {
            this.m_Log.Write("Hotmail-SR-BETAR - getMessageSizes - START"); 
            
            if (this.m_bStat) 
            {  //msg table has been donwloaded    
                this.serverComms("+OK " + this.m_aMsgDataStore.length + " Messages\r\n");
                for (i = 0; i <  this.m_aMsgDataStore.length; i++)
                {
                    var iSize = this.m_aMsgDataStore[i].iSize;    
                    this.serverComms((i+1) + " " + iSize + "\r\n");  
                }
                this.serverComms(".\r\n");
            }
            else
            {
                if (this.m_szMailboxURI == null) return false;
                var szMailboxURI = this.m_szLocationURI + this.m_szMailboxURI; 
                this.m_Log.Write("Hotmail-SR-BETAR - getMessageSizes - mail box url " + szMailboxURI); 
                
                this.m_HttpComms.addRequestHeader("User-Agent", UserAgent, true);                    

                this.m_iStage = 0;
                this.m_HttpComms.setURI(szMailboxURI);
                this.m_HttpComms.setRequestMethod("GET");

                var bResult = this.m_HttpComms.send(this.mailBoxOnloadHandler, this); 
                if (!bResult) throw new Error("httpConnection returned false");
            }
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
            szHeaders += "X-Folder: " +oMSG.szFolder + "\r\n";
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
                  
            this.m_szFolderName = oMSG.szFolder;
            this.m_iStage = 0;
            
            this.m_HttpComms.addRequestHeader("User-Agent", UserAgent, true);                     

            //get msg from hotmail
            this.m_HttpComms.setURI(szMsgURI);
            this.m_HttpComms.setRequestMethod("GET");

            var bResult = this.m_HttpComms.send(this.emailOnloadHandler, this); 
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
            mainObject.m_Log.Write("Hotmail-SR-BETA - emailOnloadHandler - START");
            //mainObject.m_Log.Write("Hotmail-SR-BETA - emailOnloadHandler : \n" + szResponse);
             
            var httpChannel = event.QueryInterface(Components.interfaces.nsIHttpChannel);
            mainObject.m_Log.Write("Hotmail-SR-BETAR - emailOnloadHandler - msg :" + httpChannel.responseStatus);
                       
            //check status should be 200.
            if (httpChannel.responseStatus != 200) 
                throw new Error("error status " + httpChannel.responseStatus);   
        
            var szMSG = "X-WebMail: true\r\n";
            szMSG += "X-Folder: " + mainObject.m_szFolderName + "\r\n";
                                                                                 
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
                
            this.m_HttpComms.setContentType("multipart/form-data");
            this.m_HttpComms.setRequestMethod("POST");

            
            var IOService = Components.classes["@mozilla.org/network/io-service;1"];
            IOService = IOService.getService(Components.interfaces.nsIIOService);
            var nsIURI = IOService.newURI(oMSG.szMSGUri, null, null);
            var szDirectory = nsIURI.QueryInterface(Components.interfaces.nsIURL).directory;
            this.m_Log.Write("Hotmail-SR-POP-BETA - loginOnloadHandler - directory : " +szDirectory);           
            var szURL = this.m_szLocationURI+szDirectory;
            this.m_Log.Write("Hotmail-SR-POP-BETA - loginOnloadHandler - szURL : " +szURL);           
            
            this.m_HttpComms.addRequestHeader("User-Agent", UserAgent, true);  

            var szFolderID = oMSG.szMSGUri.match(patternHotmailPOPFolderID)[1];
            this.m_HttpComms.setURI(szURL+this.m_szDelete+"&FolderID="+szFolderID);
            this.m_HttpComms.addValuePair("__VIEWSTATE",oMSG.szStatView);
            this.m_HttpComms.addValuePair("InboxDeleteMessages","Delete");
            this.m_HttpComms.addValuePair("InboxMoveMessage","");
            this.m_HttpComms.addValuePair("messages",szID);
            this.m_HttpComms.addValuePair(szID,"on");
            
            var bResult = this.m_HttpComms.send(this.deleteMessageOnloadHandler, this);                   
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
            mainObject.m_Log.Write("Hotmail-SR-BETA - deleteMessageOnload - START");    
            //mainObject.m_Log.Write("Hotmail-SR-BETA - deleteMessageOnload : \n" + szResponse);
            
            var httpChannel = event.QueryInterface(Components.interfaces.nsIHttpChannel);
            
            //check status should be 200.
            mainObject.m_Log.Write("Hotmail-SR-BETAR - deleteMessageOnload :" + httpChannel.responseStatus);
            if (httpChannel.responseStatus != 200 ) 
                throw new Error("error status " + httpChannel.responseStatus);   
                      
            if (szResponse.search(/<div id="error">/i)==-1)        
                mainObject.serverComms("+OK its history\r\n");
            else    
               mainObject.serverComms("-ERR negative vibes from " +mainObject.m_szUserName+ "\r\n"); 
               
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
            
            if (this.m_bReUseSession)
            { 
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
            }
              
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
            this.m_Log.Write("Hotmail-SR-BETAR - serverComms sent count: " + iCount +" msg length: " +szMsg.length);
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
    
    
    urlEncode : function (szData)
    {
        var szEncoded = encodeURIComponent(szData);
        szEncoded = szEncoded.replace(/!/g,"%21");
        return szEncoded;
        
    },
}
