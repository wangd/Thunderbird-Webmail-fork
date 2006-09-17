function HotmailScreenRipper(oResponseStream, oLog, oPrefData)
{
    try
    {       
        var scriptLoader = Components.classes["@mozilla.org/moz/jssubscript-loader;1"];
        scriptLoader = scriptLoader.getService(Components.interfaces.mozIJSSubScriptLoader);
        scriptLoader.loadSubScript("chrome://web-mail/content/common/DebugLog.js");
        scriptLoader.loadSubScript("chrome://web-mail/content/common/HttpComms2.js");
        scriptLoader.loadSubScript("chrome://web-mail/content/common/Header.js");
        scriptLoader.loadSubScript("chrome://web-mail/content/common/Email.js");
        scriptLoader.loadSubScript("chrome://hotmail/content/Hotmail-MSG.js");
        scriptLoader.loadSubScript("chrome://hotmail/content/Hotmail-Prefs-Data.js");
        scriptLoader.loadSubScript("chrome://hotmail/content/Hotmail-FolderList.js");
                
        this.m_Log = oLog;
        this.m_Log.Write("Hotmail-SR - Constructor - START");   
       
        this.m_szUserName = null;   
        this.m_szPassWord = null; 
        this.m_oResponseStream = oResponseStream;  
        this.m_HttpComms = new HttpComms(this.m_Log);   
        this.m_szLogOutURI = null;
        this.m_szLocationURI = null;
        this.m_aMsgDataStore = new Array();
        this.m_aszPageURLS = new Array();
        this.m_szHomeURI = null;
        this.m_szFolderURI = null;
        this.m_szFolderName = null;
        this.m_iPageCount =0;
        this.m_iTotalSize = 0; 
        this.m_szUM = null;
        this.m_iStage = 0;  

        this.m_szMSG = null;
        this.m_szMSGUri = null;
        this.bNeedFolderUri = true;
        
        this.m_SessionManager = Components.classes["@mozilla.org/SessionManager;1"]
                                          .getService(Components.interfaces.nsISessionManager);
        this.m_SessionData = null;

        this.m_bReEntry = false;
        
        this.m_bReUseSession = oPrefData.bReUseSession;    //do i reuse the session
        this.m_bUseJunkMail= oPrefData.bUseJunkMail;       //do i download junkmail
        this.m_bDownloadUnread = oPrefData.bDownloadUnread; //do i download unread only
        this.m_bMarkAsRead = oPrefData.bMarkAsRead;         //do i mark email as read
        
        this.m_bJunkMail = false;
        this.m_aszFolderURLList = new Array();

        //process folders
        this.m_aszFolders = new Array();
        for(var i=0; i<oPrefData.aszFolder.length; i++)
        {
            this.m_aszFolders.push(oPrefData.aszFolder[i]);
        }
        this.m_Log.Write("Hotmail-SR - Constructor - m_aszFolders "+ this.m_aszFolders);
        
        this.m_bStat = false;
        
        this.m_Log.Write("Hotmail-SR.js - Constructor - END");  
    }
    catch(e)
    {
        DebugDump("Hotmail-SR: Constructor : Exception : " 
                                      + e.name 
                                      + ".\nError message: " 
                                      + e.message + "\n"
                                      + e.lineNumber);
    }
}



HotmailScreenRipper.prototype =
{ 
    logIn : function(szUserName, szPassWord)
    {
        try
        {
            this.m_Log.Write("Hotmail-SR - logIN - START");   
            this.m_Log.Write("Hotmail-SR - logIN - Username: " + szUserName 
                                                   + " Password: " + szPassWord 
                                                   + " stream: " + this.m_oResponseStream);
            
            this.m_szUserName = szUserName.toLowerCase();
            this.m_szPassWord = szPassWord;
            
            if (!this.m_szUserName || !this.m_oResponseStream || !this.m_szPassWord) return false;
                     
            //get hotmail.com webpage
            this.m_iStage= 0;
            this.m_HttpComms.setURI("http://www.hotmail.com");         
            
            //get session data
            if (this.m_bReUseSession)
            { 
                this.m_Log.Write("Hotmail-SR - logIN - Getting Session Data");
                this.m_SessionData = this.m_SessionManager.findSessionData(this.m_szUserName);
                if (this.m_SessionData)
                {
                    this.m_Log.Write("Hotmail-SR - logIN - Session Data found");                   
                    if (this.m_SessionData.oComponentData)
                    {
                        this.m_HttpComms.setCookieManager(this.m_SessionData.oCookieManager);
                        this.m_szHomeURI = this.m_SessionData.oComponentData.findElement("szHomeURI");
                        this.m_Log.Write("Hotmail-SR - logIN - szHomeURI " +this.m_szHomeURI);
                    }
                }
                                 
                if (this.m_szHomeURI)
                { 
                    this.m_iStage =3;
                    this.m_bReEntry = true;
                    this.m_HttpComms.setURI(this.m_szHomeURI);
                }
            }
         
            this.m_HttpComms.setRequestMethod("GET");
            var bResult = this.m_HttpComms.send(this.loginOnloadHandler, this);  
            if (!bResult) throw new Error("httpConnection returned false");        

            this.m_Log.Write("Hotmail-SR - logIN - END");    
            return true;
        }
        catch(e)
        {
            this.m_Log.DebugDump("Hotmail-SR: logIN : Exception : " 
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
            mainObject.m_Log.Write("Hotmail-SR - loginOnloadHandler - START"); 
            //mainObject.m_Log.Write("Hotmail-SR - loginOnloadHandler : \n" + szResponse);
            mainObject.m_Log.Write("Hotmail-SR - loginOnloadHandler : " + mainObject.m_iStage);  
            
            var httpChannel = event.QueryInterface(Components.interfaces.nsIHttpChannel);
            mainObject.m_Log.Write("Hotmail-SR - loginOnloadHandler - status :" +httpChannel.responseStatus );
            
            //if this fails we've gone somewhere new
            if (httpChannel.responseStatus != 200 ) 
                throw new Error("return status " + httpChannel.responseStatus);

             
            //page code                                
            switch (mainObject.m_iStage)
            {
                case 0: // redirect destination
                    var aForm = szResponse.match(patternHotmailForm);
                    if (!aForm) throw new Error("error parsing login page");
                    mainObject.m_Log.Write("Hotmail-SR - loginOnloadHandler "+ aForm);
                    
                    //action
                    var szAction = aForm[0].match(patternHotmailAction)[1];
                    mainObject.m_Log.Write("Hotmail-SR - loginOnloadHandler "+ szAction);
                    mainObject.m_HttpComms.setURI(szAction);
                    
                    //name value
                    var aInput = aForm[0].match(patternHotmailInput);
                    mainObject.m_Log.Write("Hotmail-SR - loginOnloadHandler "+ aInput);
                    for (i=0; i<aInput.length ; i++)
                    {
                        var szName =  aInput[i].match(patternHotmailName)[1];
                        mainObject.m_Log.Write("Hotmail-SR- loginOnloadHandler "+ szName);  
                        var szValue =  aInput[i].match(patternHotmailValue)[1];
                        mainObject.m_Log.Write("Hotmail-SR- loginOnloadHandler "+ szValue);
                        szValue = encodeURIComponent(szValue);
                        mainObject.m_HttpComms.addValuePair(szName, szValue);
                    }
                    
                    mainObject.m_HttpComms.setRequestMethod("POST");
                    var bResult = mainObject.m_HttpComms.send(mainObject.loginOnloadHandler, mainObject);   
                    if (!bResult) throw new Error("httpConnection returned false");
                    mainObject.m_iStage++;
                break;
                
                
                case 1: //login
                    var aForm = szResponse.match(patternHotmailForm);
                    if (!aForm) throw new Error("error parsing login page");
                        
                    //get form data
                    var aInput =  aForm[0].match(patternHotmailInput); 
                    mainObject.m_Log.Write("nsHotmail.js - loginOnloadHandler - form data " + aInput);
                    
                    for (i=0; i<aInput.length; i++)
                    {
                        var szType = aInput[i].match(patternHotmailType)[1]; 
                        mainObject.m_Log.Write("nsHotmail.js - loginOnloadHandler - form type " + szType);
                        var szName = aInput[i].match(patternHotmailName)[1]; 
                        mainObject.m_Log.Write("nsHotmail.js - loginOnloadHandler - form name " + szName);
                        var szValue = aInput[i].match(patternHotmailValue)[1]; 
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
                    
                    var szAction = aForm[0].match(patternHotmailAction)[1];
                    mainObject.m_Log.Write("Hotmail-SR- loginOnloadHandler "+ szAction);    
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
                        var szQS =  szResponse.match(patternHotmailQS)[1];    
                        mainObject.m_Log.Write("Hotmail-SR- loginOnloadHandler szQuery "+ szQS); 
                        szURI = aszURI[1] + "?" + szQS; 
                    }
                    mainObject.m_HttpComms.setURI(szURI);                    
                    
                    mainObject.m_HttpComms.setRequestMethod("POST");
                    var bResult = mainObject.m_HttpComms.send(mainObject.loginOnloadHandler, mainObject);                   
                    if (!bResult) throw new Error("httpConnection returned false");
                    mainObject.m_iStage++;
                break;
                
               
                case 2: //refresh
                    var aRefresh = szResponse.match(patternHotmailForm);
                    mainObject.m_Log.Write("Hotmail-SR - loginOnloadHandler - refresh "+ aRefresh); 
                   
                    if (aRefresh)
                    {   
                        //action
                        var szAction = aRefresh[0].match(patternHotmailAction)[1];
                        mainObject.m_Log.Write("Hotmail-SR- loginOnloadHandler "+ szAction);
                        mainObject.m_HttpComms.setURI(szAction);
                        
                        //form data  
                        var aInput =  aRefresh[0].match(patternHotmailInput);
                        mainObject.m_Log.Write("Hotmail-SR- loginOnloadHandler "+ aInput); 
                        var szName =  aInput[0].match(patternHotmailName)[1];
                        var szValue =  aInput[0].match(patternHotmailValue)[1];
                        szValue = encodeURIComponent(szValue);
                        mainObject.m_HttpComms.addValuePair(szName,szValue);
                        mainObject.m_HttpComms.setRequestMethod("POST");  
                    }
                    else
                    {
                        aRefresh = szResponse.match(patternHotmailRefresh);
                        
                        if (!aRefresh)
                            aRefresh = szResponse.match(patternHotmailJavaRefresh);
                            
                        mainObject.m_Log.Write("Hotmail-SR - loginOnloadHandler refresh "+ aRefresh); 
                        if (aRefresh == null) throw new Error("error parsing login page");    
                        
                        mainObject.m_HttpComms.setURI(aRefresh[1]);
                        mainObject.m_HttpComms.setRequestMethod("GET");
                    } 
           
                    var bResult = mainObject.m_HttpComms.send(mainObject.loginOnloadHandler, mainObject);   
                    if (!bResult) throw new Error("httpConnection returned false");
                    mainObject.m_iStage++;
                break;
               
                case 3:
                    if (szResponse.search(patternHotmailMailbox) == -1)
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

                    mainObject.m_szHomeURI =  httpChannel.URI.spec;
                    mainObject.m_Log.Write("Hotmail-SR - loginOnloadHandler - m_szHomeURI : " + mainObject.m_szHomeURI );
                    
                    //get urls for later use
                    mainObject.m_szLocationURI = httpChannel.URI.prePath ;
                    mainObject.m_Log.Write("Hotmail-SR - loginOnloadHandler - m_szLocationURI : "+mainObject.m_szLocationURI );
                   
                    mainObject.m_szMailboxURI = szResponse.match(patternHotmailMailbox)[1];
                    mainObject.m_Log.Write("Hotmail-SR - loginOnloadHandler - m_szMaiboxURI : "+mainObject.m_szMailboxURI );
                   
                    mainObject.m_szLogOutURI = szResponse.match(patternHotmailLogout)[1];
                    mainObject.m_Log.Write("Hotmail-SR - loginOnloadHandler - m_szLogOutURI : "+mainObject.m_szLogOutURI );
                    
                    //server response
                    mainObject.serverComms("+OK Your in\r\n");
                    mainObject.m_bAuthorised = true;
                break;
            }
            
            mainObject.m_Log.Write("Hotmail-SR - loginOnloadHandler - END");
        }
        catch(err)
        {
            mainObject.m_Log.DebugDump("Hotmail-SR: loginHandler : Exception : " 
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
            this.m_Log.Write("Hotmail-SR - getNumMessages - START"); 
            
            if (this.m_szMailboxURI == null) return false;
            this.m_szFolderURI = this.m_szLocationURI + this.m_szMailboxURI + "&sort=Date"; 
            this.m_Log.Write("Hotmail-SR - getNumMessages - mail box url " + this.m_szFolderURI); 
            this.m_szFolderName = "INBOX";
            
            this.m_iStage = 0;
            this.m_HttpComms.setURI(this.m_szFolderURI);
            this.m_HttpComms.setRequestMethod("GET");
            var bResult = this.m_HttpComms.send(this.mailBoxOnloadHandler, this); 
            if (!bResult) throw new Error("httpConnection returned false");
            this.m_bStat = true;
            this.m_Log.Write("Hotmail-SR - getNumMessages - END"); 
            return true;
        }
        catch(e)
        {
            this.m_Log.DebugDump("Hotmail-SR: getNumMessages : Exception : " 
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
            mainObject.m_Log.Write("Hotmail-SR - mailBoxOnloadHandler - START");
            //mainObject.m_Log.Write("Hotmail-SR - mailBoxOnloadHandler : \n" + szResponse);
            mainObject.m_Log.Write("Hotmail-SR - mailBoxOnloadHandler : " + mainObject.m_iStage);  
            
            var httpChannel = event.QueryInterface(Components.interfaces.nsIHttpChannel);
            mainObject.m_Log.Write("Hotmail-SR - mailBoxOnloadHandler - Mailbox :" + httpChannel.responseStatus);          
            
            //check status should be 200.
            if (httpChannel.responseStatus != 200 ) 
                throw new Error("error status " + httpChannel.responseStatus);   
              
            // get folder uri's
            if (mainObject.bNeedFolderUri) mainObject.processFolder(szResponse)      
    
                      
            //get pages uri
            if (mainObject.m_aszPageURLS.length==0)
            {
                //get UM
                mainObject.m_szUM= szResponse.match(patternHotmailUM)[1];
                mainObject.m_Log.Write("Hotmail-SR - mailBoxOnloadHandler -msg pages UM : " +mainObject.m_szUM)
                
                //any more pages
                var aPages = szResponse.match(patternHotmailMultPageNum);
                mainObject.m_Log.Write("Hotmail-SR - mailBoxOnloadHandler -msg pages : " +aPages);
                
                if (aPages)
                {   //more than one page
                    var aNums = aPages[3].match(patternHotmailPages);
                    mainObject.m_Log.Write("Hotmail-SR - mailBoxOnloadHandler -msg pages num : " +aNums);
                
                    //construct page urls
                    for (i =1 ; i < aNums.length ; i++)  //start at second page
                    {
                        mainObject.m_aszPageURLS.push(mainObject.m_szLocationURI + aPages[1] + mainObject.m_szUM + aPages[2] + (i+1));        
                    }
                }
                
                 mainObject.m_Log.Write("Hotmail-SR - mailBoxOnloadHandler -msg pages url : " + mainObject.m_aszPageURLS + " length " + mainObject.m_aszPageURLS.length);
            }
            
            
            //get msg urls
            var aMsgTable = szResponse.match(patternHotmailMsgTable);
            if (aMsgTable == null) throw new Error("aMsgTable == null");
            mainObject.m_Log.Write("Hotmail-SR - mailBoxOnloadHandler -msg table : " +aMsgTable[1]);
            var szMsgRows = aMsgTable[1].match(/<tr.*?>[\S]*<\/tr>/gmi);  //split on rows
            mainObject.m_Log.Write("Hotmail-SR - mailBoxOnloadHandler -split msg table : " +szMsgRows);
            if (szMsgRows == null) throw new Error("szMsgRows == null");//oops
            
            //first row  = headers , last row = footer
            for (j = 1; j < szMsgRows.length-1; j++)
            {
                var oMSG = mainObject.processMSG(szMsgRows[j]);
                mainObject.m_Log.Write("Hotmail-SR - mailBoxOnloadHandler - oMSG: " +oMSG);
                if (oMSG) mainObject.m_aMsgDataStore.push(oMSG);               
            }
    
            mainObject.m_Log.Write("Hotmail-SR - mailBoxOnloadHandler -msg pages : " +mainObject.m_aszPageURLS);    
            mainObject.m_Log.Write("Hotmail-SR - mailBoxOnloadHandler -msg pages count : " + mainObject.m_aszPageURLS.length + " "  + mainObject.m_iPageCount);   
                                                                             
            if (mainObject.m_aszPageURLS.length!= mainObject.m_iPageCount)//more pages
            {           
                var szTempURI = mainObject.m_aszPageURLS[ mainObject.m_iPageCount];
                mainObject.m_Log.Write("Hotmail-SR - mailBoxOnloadHandler - page: " + szTempURI); 
                
                mainObject.m_HttpComms.setURI(szTempURI);
                mainObject.m_HttpComms.setRequestMethod("GET");
                var bResult = mainObject.m_HttpComms.send(mainObject.mailBoxOnloadHandler, mainObject); 
                if (!bResult) throw new Error("httpConnection returned false");
                
                mainObject.m_iPageCount++;                       
            }
            else  //done with mailbox
            {                   
                if (mainObject.m_aszFolderURLList.length>0)
                { 
                    var oFolder = mainObject.m_aszFolderURLList.shift();
                    mainObject.m_szFolderURI = oFolder.szURI;
                    mainObject.m_szFolderName = oFolder.szName;
                    mainObject.m_iPageCount = 0; //reset array
                    mainObject.m_aszPageURLS = new Array;
                
                    mainObject.m_HttpComms.setURI(mainObject.m_szFolderURI);
                    mainObject.m_HttpComms.setRequestMethod("GET");
                    var bResult = mainObject.m_HttpComms.send(mainObject.mailBoxOnloadHandler, mainObject); 
                    if (!bResult) throw new Error("httpConnection returned false");
                }
                else  //all uri's collected
                {
                    if (mainObject.m_bStat) //called by stat
                    {
                        mainObject.serverComms("+OK " + mainObject.m_aMsgDataStore.length + " " + mainObject.m_iTotalSize + "\r\n");
                    }
                    else //called by list
                    {
                        mainObject.serverComms("+OK " + mainObject.m_aMsgDataStore.length + " Messages\r\n"); 
         
                        for (i = 0; i <  mainObject.m_aMsgDataStore.length; i++)
                        {
                            var iEmailSize = mainObject.m_aMsgDataStore[i].iSize;
                            mainObject.serverComms((i+1) + " " + iEmailSize + "\r\n");       
                        }         
                       
                        mainObject.serverComms(".\r\n");
                    }
                }
            }
            mainObject.m_Log.Write("Hotmail-SR - MailBoxOnload - END"); 
        }
        catch(err)
        {
             mainObject.m_Log.DebugDump("Hotmail-SR: MailboxOnload : Exception : " 
                                              + err.name 
                                              + ".\nError message: " 
                                              + err.message+ "\n"
                                              + err.lineNumber);
            
            mainObject.serverComms("-ERR negative vibes from " +mainObject.m_szUserName+ "\r\n");  
        }   
    },
 
    
    
    processFolder : function (szResponse)
    {
        try
        {
            this.m_Log.Write("Hotmail-SR: processFolder - START");
            
            var szFolderURL = szResponse.match(patternHotmailFolderBase)[1];
            this.m_Log.Write("Hotmail-SR - processFolder - folder base: " +szFolderURL);
                  
            var szFolderList = szResponse.match(patternHotmailSRFolderList)[1];    
            this.m_Log.Write("Hotmail-SR - processFolder - folder list: " +szFolderList);
            
            var aszFolderLinks = szFolderList.match(patternHotmailFolderLinks);
            this.m_Log.Write("Hotmail-SR - processFolder - folder links: " +aszFolderLinks+ " length " + aszFolderLinks.length);
            
                 
            for (i=0 ; i<aszFolderLinks.length; i++ )
            {
                this.m_Log.Write("Hotmail-SR - processFolder - folder link: " +aszFolderLinks[i]);
                //get tabindex
                var iIndex = aszFolderLinks[i].match(patternHotmailTabindex)[1]; 
                this.m_Log.Write("Hotmail-SR - processFolder - folder index: " +iIndex);                      
                if (this.m_bUseJunkMail)
                {
                    if(iIndex == 131) // junkmail
                    {
                        var iFolder = aszFolderLinks[i].match(patternHotmailHMFO)[1];
                        var szURI = this.m_szLocationURI + szFolderURL + iFolder;
                        this.m_Log.Write("Hotmail-SR - processFolder - szURI : " +szURI);
                        var oFolder = new FolderData();
                        oFolder.szName = "Junk Mail";
                        oFolder.szURI = szURI;
                        this.m_aszFolderURLList.push(oFolder);
                    }
                }
                
                for (var j=0; j<this.m_aszFolders.length; j++)
                {
                    var szTitle = aszFolderLinks[i].match(patternHotmailTabTitle)[1];   
                    this.m_Log.Write("Hotmail-SR - processFolder - folder szTitle: " +szTitle); 
                    
                    var regExp = new RegExp("^"+this.m_aszFolders[j]+"$","i");
                    this.m_Log.Write("HotmailWebDav.js - processFolder - regExp : "+regExp );
                    
                    if (szTitle.search(regExp)!=-1)
                    {
                        var iFolder = aszFolderLinks[i].match(patternHotmailHMFO)[1];
                        var szURI = this.m_szLocationURI + szFolderURL + iFolder;
                        this.m_Log.Write("Hotmail-SR - processFolder - szURI : " +szURI);
                        var oFolder = new FolderData();
                        oFolder.szName = szTitle;
                        oFolder.szURI = szURI;
                        this.m_aszFolderURLList.push(oFolder);   
                    }
                }
            }
          
            this.bNeedFolderUri = false;
            this.m_Log.Write("Hotmail-SR: processFolder - START");
        }
        catch(err)
        {
            this.m_Log.DebugDump("Hotmail-SR: processFolder: Exception : " 
                                              + err.name 
                                              + ".\nError message: " 
                                              + err.message+ "\n"
                                              + err.lineNumber);
        }   
    },
    
    
    
    
    processMSG : function (szMSGData)
    {
        this.m_Log.Write("Hotmail-SR: processMSG - START");
        this.m_Log.Write("Hotmail-SR: processMSG - szMSGData " +szMSGData);
        
        var aEmailURL = szMSGData.match(patternHotmailEmailURL);
        this.m_Log.Write("Hotmail-SR - processMSG - Email URL : " +aEmailURL);                    
       
        var oMSG = null;
        if (aEmailURL)
        {
            var bRead = true;
            if (this.m_bDownloadUnread)
            {
                bRead = (szMSGData.search(patternHotmailSRRead)!=-1) ? false : true;
                this.m_Log.Write("Hotmail-SR.js - processMSG - bRead -" + bRead);
            }
             
            if (bRead)
            {        
                oMSG = new HotmailMSG();
                
                var szPath = this.m_szLocationURI+aEmailURL[1]+"&"+this.m_szUM;
                this.m_Log.Write("Hotmail-SR - processMSG - Email URL : " +szPath);
                oMSG.szMSGUri = szPath;
                                    
                var aEmailLength = aEmailURL[1].match(patternHotmailEmailLength);                    
                var iSize = aEmailLength?  parseInt(aEmailLength[1]) : 2000;
                this.m_Log.Write("Hotmail-SR - processMSG - size : " +iSize);
                oMSG.iSize = iSize;    
                this.m_iTotalSize += iSize;
                
                oMSG.szFolder = this.m_szFolderName;
        
                oMSG.szTo = this.m_szUserName;
        
                var szFrom = "";
                try
                {
                    szFrom = szMSGData.match(patternHotmailSRFrom)[1];
                }
                catch(err){}
                oMSG.szFrom = szFrom;
                
                var data = szMSGData.match(/<td>.*?<\/td>/gi);
                
                var szSubject= "";
                try
                {
                    szSubject= data[6].match(/<td>(.*?)<\/td>/)[1];
                    szSubject= this.removeHTML(szSubject);             
                }
                catch(err){}
                oMSG.szSubject = szSubject;
                
                try
                {
                    var szRawDate = data[7].match(/<td>(.*?)<\/td>/)[1];
                    szRawDate = this.removeHTML(szRawDate);
                    var aRawDate = szRawDate.split(/\s/);
                    this.m_Log.Write("Hotmail-SR - processMSG - "+aRawDate);
                    
                    var today = new Date();
                    var szDate = aRawDate[0] +" ,"+aRawDate[1] +" " + today.getFullYear();
                    this.m_Log.Write("Hotmail-SR - processMSG - "+szDate);
                   
                    var newDate= new Date(Date.parse(szDate));
                    newDate.setHours(today.getHours());
                    newDate.setMinutes(today.getMinutes());
                    
                    oMSG.szDate = newDate.toUTCString();
                    this.m_Log.Write("Hotmail-SR - processMSG - " + oMSG.szDate);
                }
                catch(err){}
            }
        } 
         
        this.m_Log.Write("Hotmail-SR: processMSG - END");
        return oMSG;
    },
    
       
       
       
       
                     
    //list
    //i'm not downloading the mailbox again. 
    //I hope stat been called first or there's going to be trouble
    getMessageSizes : function() 
    {
        try
        {
            this.m_Log.Write("Hotmail-SR - getMessageSizes - START"); 
            
            if (this.m_bStat) 
            {  //msg table has been donwloaded    
                var szPOPResponse = "+OK " + this.m_aMsgDataStore.length + " Messages\r\n";
                for (i = 0; i <  this.m_aMsgDataStore.length; i++)
                {
                    var iSize = this.m_aMsgDataStore[i].iSize;
                    this.m_Log.Write("Hotmail-SR-BETAR - getMessageSizes - size : " +iSize);    
                    szPOPResponse+=(i+1) + " " + iSize + "\r\n";  
                }
                szPOPResponse += ".\r\n";
                
                this.serverComms(szPOPResponse);
            }
            else
            {
                if (this.m_szMailboxURI == null) return false;
                var szMailboxURI = this.m_szLocationURI + this.m_szMailboxURI + "&sort=Date"; 
                this.m_Log.Write("Hotmail-SR - getNumMessages - mail box url " + szMailboxURI); 

                this.m_iStage = 0;
                this.m_HttpComms.setURI(szMailboxURI);
                this.m_HttpComms.setRequestMethod("GET");
                var bResult = this.m_HttpComms.send(this.mailBoxOnloadHandler, this); 
                if (!bResult) throw new Error("httpConnection returned false");
            }
            
            this.m_Log.Write("Hotmail-SR - getMessageSizes - END"); 
            return true;
        }
        catch(e)
        {
            this.m_Log.DebugDump("Hotmail-SR: getMessageSizes : Exception : " 
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
            this.m_Log.Write("Hotmail-SR - getMessageIDs - START"); 
            
            var szPOPResponse = "+OK " + this.m_aMsgDataStore.length + " Messages\r\n";
            
            for (i = 0; i <  this.m_aMsgDataStore.length; i++)
            {
                var szEmailURL = this.m_aMsgDataStore[i].szMSGUri;
                this.m_Log.Write("Hotmail-SR - getMessageIDs - Email URL : " +szEmailURL);
        
                var aEmailID = szEmailURL.match(patternHotmailEmailID);
                var szEmailID;
                if (aEmailID ==null) //not got id
                {  
                    var iStartOfID = szEmailURL.indexOf('='); 
                    szEmailID =  szEmailURL.substring(iStartOfID +1, szEmailURL.length );
                }
                else
                    szEmailID = aEmailID[1];
                    
                this.m_Log.Write("Hotmail-SR - getMessageIDs - IDS : " +szEmailID);    
                szPOPResponse+=(i+1) + " " + szEmailID + "\r\n";   
            }         
     
            szPOPResponse += ".\r\n";
            this.serverComms(szPOPResponse);           
           
            this.m_Log.Write("Hotmail-SR - getMessageIDs - END"); 
            return true;
        }
        catch(e)
        {
            this.m_Log.DebugDump("Hotmail-SR: getMessageIDs : Exception : " 
                                          + e.name 
                                          + ".\nError message: " 
                                          + e.message+ "\n"
                                          + e.lineNumber);
            mainObject.serverComms("-ERR negative vibes from " +mainObject.m_szUserName+ "\r\n");
            return false;
        }
    },
      

    //top
    getMessageHeaders : function(lID)
    {
        try
        {
            this.m_Log.Write("Hotmail-SR.js - getHeaders - START");  
            this.m_Log.Write("Hotmail-SR.js - getHeaders - id " + lID ); 
            
            var oMSG = this.m_aMsgDataStore[lID-1];
            
            var szHeaders = "X-WebMail: true\r\n";
            szHeaders += "X-Folder: " +oMSG.szFolder+ "\r\n";
            szHeaders += "To: "+ oMSG.szTo +"\r\n";
            szHeaders += "From: "+ oMSG.szFrom +"\r\n";
            szHeaders += "Subject: "+ oMSG.szSubject +"\r\n";
            szHeaders += "Date: " + oMSG.szDate +"\r\n"; // \r\n";
            szHeaders += "\r\n.\r\n";//msg end 
             
            var  szResponse = "+OK " +szHeaders.length + "\r\n"; 
            szResponse += szHeaders
            this.serverComms(szResponse);
            
            this.m_Log.Write("Hotmail-SR.js - getHeaders - END");
            return true; 
        }
        catch(err)
        {
            this.m_Log.DebugDump("Hotmail-SR.js: getHeaders : Exception : " 
                                          + e.name + 
                                          ".\nError message: " 
                                          + e.message+ "\n"
                                          + e.lineNumber);
            mainObject.serverComms("-ERR negative vibes from " +mainObject.m_szUserName+ "\r\n");
            return false;
        }
    },
    


    //retr
    getMessage : function( lID)
    {
        try
        {
            this.m_Log.Write("Hotmail-SR - getMessage - START"); 
            this.m_Log.Write("Hotmail-SR - getMessage - msg num" + lID); 
            var szTempMsg = new String();
            
            //get msg id
            var oMSG = this.m_aMsgDataStore[lID-1];
            this.m_szMSGUri = oMSG.szMSGUri;
            var szMsgURI = this.m_szMSGUri + "&raw=1";
            this.m_Log.Write("Hotmail-SR - getMessage - msg uri" + szMsgURI); 
           
            this.m_szFolderName = oMSG.szFolder;
            this.m_iStage = 0;
            
            //get msg from hotmail
            this.m_HttpComms.setURI(szMsgURI);
            this.m_HttpComms.setRequestMethod("GET");
            var bResult = this.m_HttpComms.send(this.emailOnloadHandler, this); 
            if (!bResult) throw new Error("httpConnection returned false");
            
            this.m_Log.Write("Hotmail-SR - getMessage - END"); 
            return true;
        }
        catch(e)
        {
             this.m_Log.DebugDump("Hotmail-SR: getMessage : Exception : " 
                                          + e.name + 
                                          ".\nError message: " 
                                          + e.message+ "\n"
                                          + e.lineNumber);
            mainObject.serverComms("-ERR negative vibes from " +mainObject.m_szUserName+ "\r\n");
            return false;
        }
    },    
    
    
    emailOnloadHandler : function (szResponse ,event , mainObject)
    {
        try
        {
            mainObject.m_Log.Write("Hotmail-SR - emailOnloadHandler - START");
            //mainObject.m_Log.Write("Hotmail-SR - emailOnloadHandler : \n" + szResponse);
            
            var httpChannel = event.QueryInterface(Components.interfaces.nsIHttpChannel);
            mainObject.m_Log.Write("Hotmail-SR - emailOnloadHandler - msg :" + httpChannel.responseStatus);
                       
            //check status should be 200.
            if (httpChannel.responseStatus != 200) 
                throw new Error("error status " + httpChannel.responseStatus);   
           
            switch (mainObject.m_iStage)
            {
                case 0: //construct msg
                    mainObject.m_szMSG = "X-WebMail: true\r\n";
                    mainObject.m_szMSG += "X-Folder: " + mainObject.m_szFolderName+ "\r\n";
                                                                                         
                    //get msg
                    var aTemp = szResponse.split(/<pre>\s+/); 
                    if (aTemp.length == 0)
                        throw new Error("Message START  not found");     
                    var szEmail = aTemp[1].split(/<\/pre>/)[0];
                    if (szEmail.length == 0)
                        throw new Error("Message END  not found"); 
                    
                    mainObject.m_szMSG += szEmail;
                    
                    //clean up msg
                    mainObject.m_szMSG = mainObject.removeHTML(mainObject.m_szMSG);
                    //split body headers
                    var oEmail = new email("");
                    var aEmail = oEmail.splitHeaderBody(mainObject.m_szMSG);
                    //clean headers
                    var oHeaders = new headers(aEmail[1]);
                    var szHeaders = oHeaders.getAllHeaders();
                    //reconstruct email
                    mainObject.m_szMSG = szHeaders + aEmail[2];
                    mainObject.m_szMSG =  mainObject.m_szMSG.replace(/^\./mg,"..");    //bit padding
                    mainObject.m_szMSG += "\r\n.\r\n";
                    
                    if (mainObject.m_bMarkAsRead)
                    {
                        mainObject.m_iStage =1;
                        mainObject.m_HttpComms.setURI(mainObject.m_szMSGUri);
                        mainObject.m_HttpComms.setRequestMethod("GET");
                        var bResult = mainObject.m_HttpComms.send(mainObject.emailOnloadHandler, mainObject); 
                        if (!bResult) throw new Error("httpConnection returned false");
                    }
                    else
                    {  
                        var szPOPResponse = "+OK " +  mainObject.m_szMSG.length + "\r\n";                  
                        szPOPResponse +=  mainObject.m_szMSG;        
                        mainObject.serverComms(szPOPResponse);
                    }                                        
                break;
            
                case 1:  //marked as read        
                    var szPOPResponse = "+OK " +  mainObject.m_szMSG.length + "\r\n";                  
                    szPOPResponse +=  mainObject.m_szMSG;   
                    mainObject.serverComms(szPOPResponse);
                break;
            }
            
            mainObject.m_Log.Write("Hotmail-SR - emailOnloadHandler - END");      
        }
        catch(err)
        {
            mainObject.m_Log.DebugDump("Hotmail-SR: emailOnloadHandler : Exception : " 
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
            this.m_Log.Write("Hotmail-SR - deleteMessage - START");  
            this.m_Log.Write("Hotmail-SR - deleteMessage - id " + lID ); 
                   
            //create URL
            var szTempID = this.m_aMsgDataStore[lID-1].szMSGUri;
            this.m_Log.Write("Hotmail-SR - deleteMessage - id " + szTempID );
            //msg id
            var aTempID = szTempID.match(patternHotmailEmailID); 
            var szID ;
            if (aTempID == null)
            {
                var iTempID = szTempID.indexOf("=");
                this.m_Log.Write("Hotmail-SR - deleteMessage - id " + iTempID ); 
                szID = szTempID.substring(iTempID+1,szTempID.length);
            }
            else
                szID = aTempID[1];
            this.m_Log.Write("Hotmail-SR - deleteMessage - MSGid " + szID );    
                
            //folder id
            var szFolderID = szTempID.match(patternHotmailCurmbox)[1];
            this.m_Log.Write("Hotmail-SR - deleteMessage - FolderId " + szFolderID );
               
            //construct data
            var szPath = this.m_szLocationURI + "/cgi-bin/HoTMaiL" ;
            this.m_Log.Write("Hotmail-SR - deleteMessage - szPath " + szPath); 
        
            this.m_HttpComms.setRequestMethod("POST");
            this.m_HttpComms.setURI(szPath);
            this.m_HttpComms.addValuePair("curmbox",szFolderID);
            this.m_HttpComms.addValuePair("HrsTest","");
            this.m_HttpComms.addValuePair("js","");
            this.m_HttpComms.addValuePair("_HMaction","delete");
            this.m_HttpComms.addValuePair("wo","");
            this.m_HttpComms.addValuePair("tobox","F000000004");
            this.m_HttpComms.addValuePair("ReportLevel","");
            this.m_HttpComms.addValuePair("rj","");
            this.m_HttpComms.addValuePair("DoEmpty","");
            this.m_HttpComms.addValuePair("SMMF","0");
            this.m_HttpComms.addValuePair(szID,"on");                 
            var bResult = this.m_HttpComms.send(this.deleteMessageOnloadHandler, this);                   
            if (!bResult) throw new Error("httpConnection returned false");

            this.m_Log.Write("Hotmail-SR - deleteMessage - END");     
            return true;
        }
        catch(e)
        {
            this.m_Log.DebugDump("Hotmail-SR: deleteMessage : Exception : " 
                                          + e.name + 
                                          ".\nError message: " 
                                          + e.message+ "\n"
                                          + e.lineNumber);
            mainObject.serverComms("-ERR negative vibes from " +mainObject.m_szUserName+ "\r\n");
            return false;
        } 
    },

    
    deleteMessageOnloadHandler : function (szResponse ,event , mainObject)
    {
        try
        {
            mainObject.m_Log.Write("Hotmail-SR - deleteMessageOnload - START");    
            //mainObject.m_Log.Write("Hotmail-SR - deleteMessageOnload : \n" + szResponse);
            
            var httpChannel = event.QueryInterface(Components.interfaces.nsIHttpChannel);
            
            //check status should be 200.
            mainObject.m_Log.Write("Hotmail-SR - deleteMessageOnload :" + httpChannel.responseStatus);
            if (httpChannel.responseStatus != 200 ) 
                throw new Error("error status " + httpChannel.responseStatus);   
                    
            mainObject.serverComms("+OK its history\r\n");      
            mainObject.m_Log.Write("Hotmail-SR - deleteMessageOnload - END");      
        }
        catch(e)
        {
            mainObject.m_Log.DebugDump("Hotmail-SR: deleteMessageOnload : Exception : " 
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
            this.m_Log.Write("Hotmail-SR - logOUT - START"); 
        
            //reset sort 
            var szMailboxURI = this.m_szLocationURI + this.m_szMailboxURI + "&sort=rDate"; 
        
            this.m_HttpComms.setURI(szMailboxURI);
            this.m_HttpComms.setRequestMethod("GET");
            var bResult = this.m_HttpComms.send(this.logoutOnloadHandler, this); 
            if (!bResult) throw new Error("httpConnection returned false");
                                  
            this.m_Log.Write("Hotmail-SR - logOUT - END");  
            return true;
        }
        catch(e)
        {
            this.m_Log.DebugDump("Hotmail-SR: logOUT : Exception : " 
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
            mainObject.m_Log.Write("Hotmail-SR - logoutOnloadHandler - START");    
            //mainObject.m_Log.Write("Hotmail-SR - logoutOnloadHandler : \n" + szResponse);
                                
            var httpChannel = event.QueryInterface(Components.interfaces.nsIHttpChannel);
            
            //check status should be 200.
            mainObject.m_Log.Write("Hotmail-SR - logoutOnloadHandler :" + httpChannel.responseStatus);
            if (httpChannel.responseStatus != 200 ) 
                throw new Error("error status " + httpChannel.responseStatus);   
             
            if (mainObject.m_bReUseSession)
            { 
                mainObject.m_Log.Write("Hotmail-SR-POP.js - composerOnloadHandler - Saving Seasion data");
                if (!mainObject.m_SessionData)
                {
                    mainObject.m_SessionData = Components.classes["@mozilla.org/SessionData;1"].createInstance();
                    mainObject.m_SessionData.QueryInterface(Components.interfaces.nsISessionData);
                    mainObject.m_SessionData.szUserName = mainObject.m_szUserName;
                    
                    var componentData = Components.classes["@mozilla.org/ComponentData;1"].createInstance();
                    componentData.QueryInterface(Components.interfaces.nsIComponentData);
                    mainObject.m_SessionData.oComponentData = componentData;
                }
                mainObject.m_SessionData.oCookieManager = mainObject.m_HttpComms.getCookieManager();
                mainObject.m_SessionData.oComponentData.addElement("szHomeURI",mainObject.m_szHomeURI);
                mainObject.m_SessionManager.setSessionData(mainObject.m_SessionData);
            }
              
            mainObject.m_bAuthorised = false;
            mainObject.serverComms("+OK Your Out\r\n");  
                       
            mainObject.m_Log.Write("Hotmail-SR - logoutOnloadHandler - END");      
        }
        catch(e)
        {
            mainObject.m_Log.DebugDump("Hotmail-SR: logoutOnloadHandler : Exception : " 
                                              + e.name 
                                              + ".\nError message: " 
                                              + e.message+ "\n"
                                              + e.lineNumber);
            mainObject.serverComms("-ERR negative vibes from " +mainObject.m_szUserName+ "\r\n");
        }
    },
    
    
     
     
    serverComms : function (szMsg)
    {
        try
        { 
            this.m_Log.Write("Hotmail-SR - serverComms - START");
            this.m_Log.Write("Hotmail-SR - serverComms msg " + szMsg);
            var iCount = this.m_oResponseStream.write(szMsg,szMsg.length);
            this.m_Log.Write("Hotmail-SR - serverComms sent count: " + iCount 
                                                        +" msg length: " +szMsg.length);
            this.m_Log.Write("Hotmail-SR - serverComms - END");  
        }
        catch(e)
        {
            this.m_Log.DebugDump("Hotmail-SR: serverComms : Exception : " 
                                              + e.name 
                                              + ".\nError message: " 
                                              + e.message+ "\n"
                                              + e.lineNumber);
        }
    },
    
    removeHTML : function (szRaw)
    {
        this.m_Log.Write("Hotmail-SR - removeHTML - START");
        var szMsg = szRaw.replace(/&lt;/g,"<");
        szMsg = szMsg.replace(/&gt;/g,">");
        szMsg = szMsg.replace(/&quot;/g, "\"");
        szMsg = szMsg.replace(/&amp;/g, "&");
        szMsg = szMsg.replace(/&nbsp;/g, " ");   
        this.m_Log.Write("Hotmail-SR - removeHTML - ENd")  
        return szMsg;
    },
    
    urlEncode : function (szData)
    {
        var szEncoded = encodeURIComponent(szData);
        szEncoded = szEncoded.replace(/!/g,"%21");
        return szEncoded;
        
    },
}
