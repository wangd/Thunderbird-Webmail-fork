function HotmailScreenRipper(oResponseStream, oLog, bUseJunkMail)
{
    try
    {       
        var scriptLoader = Components.classes["@mozilla.org/moz/jssubscript-loader;1"];
        scriptLoader = scriptLoader.getService(Components.interfaces.mozIJSSubScriptLoader);
        scriptLoader.loadSubScript("chrome://web-mail/content/common/DebugLog.js");
        scriptLoader.loadSubScript("chrome://web-mail/content/common/comms.js");
        scriptLoader.loadSubScript("chrome://hotmail/content/Hotmail-MSG.js");
       
        this.m_Log = oLog; 
                
        this.m_Log.Write("Hotmail-SR - Constructor - START");   
       
        this.m_szUserName = null;   
        this.m_szPassWord = null; 
        this.m_oResponseStream = oResponseStream;  
        this.m_bUseJunkMail = bUseJunkMail;  
        this.m_HttpComms = new Comms(this,this.m_Log);   
        this.m_szMailboxURI = null;
        this.m_szLogOutURI = null;
        this.m_szLocationURI = null;
        this.m_szJunkFolderURI = null;
        this.m_bJunkMailDone = false;
        this.m_aMsgDataStore = new Array();
        this.m_aszPageURLS = new Array();
        this.m_iPageCount =0;
        this.m_iTotalSize = 0; 
        this.m_szUM = null;
        this.m_iStage = 0;  
        this.m_bJunkMail = false;
                                              
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
            
            this.m_szUserName = szUserName;
            this.m_szPassWord = szPassWord;
            
            if (!this.m_szUserName || !this.m_oResponseStream || !this.m_szPassWord) return false;
                     
            //get hotmail.com webpage
            this.m_iStage= 0;
            this.m_HttpComms.clean();
            this.m_HttpComms.setContentType(-1);
            this.m_HttpComms.setURI("http://www.hotmail.com");
            this.m_HttpComms.setRequestMethod("GET");
            var bResult = this.m_HttpComms.send(this.loginOnloadHandler);  
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
            mainObject.m_Log.Write("Hotmail-SR - loginOnloadHandler : " + mainObject.m_iStage);  
            
            var httpChannel = event.QueryInterface(Components.interfaces.nsIHttpChannel);
            mainObject.m_Log.Write("Hotmail-SR - loginOnloadHandler - status :" +httpChannel.responseStatus );
            
            //if this fails we've gone somewhere new
            if (httpChannel.responseStatus != 200 ) 
                throw new Error("return status " + httpChannel.responseStatus);
  
            mainObject.m_HttpComms.clean();
            mainObject.m_HttpComms.setContentType(0);
             
            //page code                                
            switch (mainObject.m_iStage)
            {
                case 0: // redirect destination
                    var aForm = szResponse.match(patternHotmailPOPForm);
                    if (!aForm) throw new Error("error parsing login page");
                    mainObject.m_Log.Write("Hotmail-SR - loginOnloadHandler "+ aForm);
                    
                    //action
                    var szAction = aForm[0].match(patternHotmailPOPAction)[1];
                    mainObject.m_Log.Write("Hotmail-SR - loginOnloadHandler "+ szAction);
                    mainObject.m_HttpComms.setURI(szAction);
                    
                    //name value
                    var aInput = aForm[0].match(patternHotmailPOPInput);
                    mainObject.m_Log.Write("Hotmail-SR - loginOnloadHandler "+ aInput);
                    for (i=0; i<aInput.length ; i++)
                    {
                        var szName =  aInput[i].match(patternHotmailPOPName)[1];
                        mainObject.m_Log.Write("Hotmail-SR- loginOnloadHandler "+ szName);  
                        var szValue =  aInput[i].match(patternHotmailPOPValue)[1];
                        mainObject.m_Log.Write("Hotmail-SR- loginOnloadHandler "+ szValue);
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
                                else 
                                    szData = szValue;
                                    
                                mainObject.m_HttpComms.addValuePair(szName,szData);
                            }
                        }
                    }
                    
                    var szAction = aForm[0].match(patternHotmailPOPAction)[1];
                    mainObject.m_Log.Write("Hotmail-SR- loginOnloadHandler "+ szAction);
                    mainObject.m_HttpComms.setURI(szAction);                    
                    
                    mainObject.m_HttpComms.setRequestMethod("POST");
                    var bResult = mainObject.m_HttpComms.send(mainObject.loginOnloadHandler);                   
                    if (!bResult) throw new Error("httpConnection returned false");
                    mainObject.m_iStage++;
                break;
                
               
                case 2: //refresh
                    var aRefresh = szResponse.match(patternHotmailPOPRefresh);
                    if (!aRefresh)
                        aRefresh = szResponse.match(patternHotmailPOPJavaRefresh);
                    mainObject.m_Log.Write("Hotmail-SR - loginOnloadHandler "+ aRefresh); 
                    if (aRefresh == null) throw new Error("error parsing login page");
                    
                    mainObject.m_HttpComms.setURI(aRefresh[1]);
                    mainObject.m_HttpComms.setRequestMethod("GET");
                    var bResult = mainObject.m_HttpComms.send(mainObject.loginOnloadHandler);   
                    if (!bResult) throw new Error("httpConnection returned false");
                    mainObject.m_iStage++;
                break;
               
                case 3:
                    var szLocation = httpChannel.URI.spec;
                    var iIndex = szLocation.search("uilogin.srt");
                    mainObject.m_Log.Write("Hotmail-SR - loginOnloadHandler - page check : " + szLocation 
                                                        + " index = " +  iIndex );
                    if (iIndex != -1) throw new Error("error logging in ");
                    
                    //get urls for later use
                    mainObject.m_szLocationURI = httpChannel.URI.prePath ;
                    mainObject.m_Log.Write("Hotmail-SR - loginOnloadHandler - m_szLocationURI : "+mainObject.m_szLocationURI );
                   
                    mainObject.m_szMailboxURI = szResponse.match(patternHotmailPOPMailbox)[1];
                    mainObject.m_Log.Write("Hotmail-SR - loginOnloadHandler - m_szMaiboxURI : "+mainObject.m_szMailboxURI );
                   
                    mainObject.m_szLogOutURI = szResponse.match(patternHotmailPOPLogout)[1];
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
            var szMailboxURI = this.m_szLocationURI + this.m_szMailboxURI; 
            this.m_Log.Write("Hotmail-SR - getNumMessages - mail box url " + szMailboxURI); 
            
            this.m_iStage = 0;  
            this.m_HttpComms.clean();
            this.m_HttpComms.setURI(szMailboxURI);
            this.m_HttpComms.setRequestMethod("GET");
            var bResult = this.m_HttpComms.send(this.mailBoxOnloadHandler); 
            if (!bResult) throw new Error("httpConnection returned false");
                        
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
            mainObject.m_Log.Write("Hotmail-SR - mailBoxOnloadHandler : " + mainObject.m_iStage);  
            
            var httpChannel = event.QueryInterface(Components.interfaces.nsIHttpChannel);
            mainObject.m_Log.Write("Hotmail-SR - mailBoxOnloadHandler - Mailbox :" + httpChannel.responseStatus);          
            
            //check status should be 200.
            if (httpChannel.responseStatus != 200 ) 
                throw new Error("error status " + httpChannel.responseStatus);   
            
           
            // get trash folder uri      
            if (!mainObject.m_szJunkFolderURI && mainObject.m_bUseJunkMail)
            {
                try
                {
                    var szFolderURL = szResponse.match(PatternHotmailPOPFolderBase)[1];
                    mainObject.m_Log.Write("Hotmail-SR - mailBoxOnloadHandler - folder base: " +szFolderURL);
                          
                    var szFolderList = szResponse.match(PatternHotmailPOPFolderList)[1];    
                    mainObject.m_Log.Write("Hotmail-SR - mailBoxOnloadHandler - folder list: " +szFolderList);
                    
                    var aszFolderLinks = szFolderList.match(PatternHotmailPOPFolderLinks);
                    mainObject.m_Log.Write("Hotmail-SR - mailBoxOnloadHandler - folder links: " +aszFolderLinks
                                                                       + " length " + aszFolderLinks.length);
                   
                    var szJunkFolder=null;
                    for (i=0 ; i<aszFolderLinks.length-1; i++ )
                    {
                        mainObject.m_Log.Write("Hotmail-SR - mailBoxOnloadHandler - folder link: " +aszFolderLinks[i]);
                        //get tabindex
                        var iIndex = aszFolderLinks[i].match(PatternHotmailPOPTabindex)[1]; 
                        mainObject.m_Log.Write("Hotmail-SR - mailBoxOnloadHandler - folder index: " +iIndex);
                        if(iIndex == 131)
                        {
                            szJunkFolder = aszFolderLinks[i].match(PatternHotmailPOPHMFO)[1];
                            mainObject.m_Log.Write("Hotmail-SR - mailBoxOnloadHandler - folder id: " +szJunkFolder);
                        }
                    }
    
                    mainObject.m_szJunkFolderURI = mainObject.m_szLocationURI + szFolderURL + szJunkFolder;
                    mainObject.m_Log.Write("Hotmail-SR - mailBoxOnloadHandler - folder uri: " +mainObject.m_szJunkFolderURI);
                }
                catch(err)
                {
                    mainObject.m_Log.DebugDump("Hotmail-SR: mailBoxOnloadHandler folder: Exception : " 
                                                      + err.name 
                                                      + ".\nError message: " 
                                                      + err.message+ "\n"
                                                      + err.lineNumber);
                }   
            }
                     
                      
            //get pages uri
            if (mainObject.m_aszPageURLS.length==0)
            {
                //get UM
                mainObject.m_szUM= szResponse.match(patternHotmailPOPUM)[1];
                mainObject.m_Log.Write("Hotmail-SR - mailBoxOnloadHandler -msg pages UM : " +mainObject.m_szUM)
                
                //any more pages
                var aPages = szResponse.match(patternHotmailPOPMultPageNum);
                mainObject.m_Log.Write("Hotmail-SR - mailBoxOnloadHandler -msg pages : " +aPages);
                
                if (aPages)
                {   //more than one page
                    var aNums = aPages[3].match(patternHotmailPOPPages);
                    mainObject.m_Log.Write("Hotmail-SR - mailBoxOnloadHandler -msg pages num : " +aNums);
                
                    //construct page urls
                    for (i =1 ; i < aNums.length ; i++)  //start at second page
                    {
                        mainObject.m_aszPageURLS.push(mainObject.m_szLocationURI + aPages[1] 
                                                       + mainObject.m_szUM + aPages[2] + (i+1));        
                    }
                }
                
                 mainObject.m_Log.Write("Hotmail-SR - mailBoxOnloadHandler -msg pages url : " 
                                                        + mainObject.m_aszPageURLS
                                                        + " length "
                                                        + mainObject.m_aszPageURLS.length);
            }
            
            
            //get msg urls
            var aMsgTable = szResponse.match(patternHotmailPOPMsgTable);
            if (aMsgTable == null) throw new Error("aMsgTable == null");
            mainObject.m_Log.Write("Hotmail-SR - mailBoxOnloadHandler -msg table : " +aMsgTable[1]);
            var szMsgRows = aMsgTable[1].split(/<tr.*?>/);  //split on rows
            mainObject.m_Log.Write("Hotmail-SR - mailBoxOnloadHandler -split msg table : " +szMsgRows);
            if (szMsgRows == null) throw new Error("szMsgRows == null");//oops
            
           
            for (j = 0; j < szMsgRows.length; j++)
            {
                var aEmailURL = szMsgRows[j].match(patternHotmailPOPEmailURL);
                mainObject.m_Log.Write("Hotmail-SR - mailBoxOnloadHandler - Email URL : " +aEmailURL);
                if (aEmailURL)
                {
                    var oMSG = new HotmailMSG();
                    var szPath = mainObject.m_szLocationURI+aEmailURL[1]+"&"+mainObject.m_szUM+"&raw=1";
                    mainObject.m_Log.Write("Hotmail-SR - mailBoxOnloadHandler - Email URL : " +szPath);
                    oMSG.szMSGUri = szPath;
                                        
                    var aEmailLength = aEmailURL[1].match(patternHotmailPOPEmailLength);                    
                    var iSize = aEmailLength?  parseInt(aEmailLength[1]) : 2000;
                    mainObject.m_Log.Write("Hotmail-SR - mailBoxOnloadHandler - size : " +iSize);
                    oMSG.iSize = iSize;    
                    mainObject.m_iTotalSize += iSize;
                    
                    oMSG.bJunkFolder = mainObject.m_bJunkMailDone;
                    
                    mainObject.m_aMsgDataStore.push(oMSG); 
                 }  
            }
    
            mainObject.m_Log.Write("Hotmail-SR - mailBoxOnloadHandler -msg pages : " +mainObject.m_aszPageURLS);    
            mainObject.m_Log.Write("Hotmail-SR - mailBoxOnloadHandler -msg pages count : " 
                                                        + mainObject.m_aszPageURLS.length + " "
                                                        + mainObject.m_iPageCount);   
                                                                             
            if (mainObject.m_aszPageURLS.length!= mainObject.m_iPageCount)//more pages
            {           
                //set cookies
                var szTempURI = mainObject.m_aszPageURLS[ mainObject.m_iPageCount];
                mainObject.m_Log.Write("Hotmail-SR - mailBoxOnloadHandler - page: " + szTempURI); 
               
                mainObject.m_HttpComms.clean();
                mainObject.m_HttpComms.setURI(szTempURI);
                mainObject.m_HttpComms.setRequestMethod("GET");
                var bResult = mainObject.m_HttpComms.send(mainObject.mailBoxOnloadHandler); 
                if (!bResult) throw new Error("httpConnection returned false");
                
                mainObject.m_iPageCount++;                       
            }
            else  //done with mailbox
            {  
                mainObject.m_Log.Write("Hotmail-SR - mailBoxOnloadHandler - use junkmail: " 
                                                        + mainObject.m_bUseJunkMail
                                                        + " Done " + mainObject.m_bJunkMailDone
                                                        + " uri " + mainObject.m_szJunkFolderURI );
                 
                if (!mainObject.m_bJunkMailDone && mainObject.m_bUseJunkMail && mainObject.m_szJunkFolderURI)
                { //get junkmail
                    mainObject.m_Log.Write("Hotmail-SR - mailBoxOnloadHandler - junkmail: " + mainObject.m_bUseJunkMail); 
                    
                    mainObject.m_bJunkMailDone = true;
                    mainObject.m_iPageCount = 0; //reset array
                    mainObject.m_aszPageURLS = new Array;
                    
                    mainObject.m_HttpComms.clean();
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
 
    
                     
    //list
    //i'm not downloading the mailbox again. 
    //I hope stat been called first or there's going to be trouble
    getMessageSizes : function() 
    {
        try
        {
            this.m_Log.Write("Hotmail-SR - getMessageSizes - START"); 
            
            var szPOPResponse = "+OK " + this.m_aMsgDataStore.length + " Messages\r\n";
            for (i = 0; i <  this.m_aMsgDataStore.length; i++)
            {
                var iSize = this.m_aMsgDataStore[i].iSize;
                this.m_Log.Write("Hotmail-SR - getMessageSizes - size : " +iSize);    
                szPOPResponse+=(i+1) + " " + iSize + "\r\n";  
            }
            szPOPResponse += ".\r\n";
            
            this.serverComms(szPOPResponse);
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
        
                var aEmailID = szEmailURL.match(patternHotmailPOPEmailID);
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
            
            this.serverComms("-ERR negative vibes\r\n"); 
            
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
            var szMsgURI = oMSG.szMSGUri;
            this.m_Log.Write("Hotmail-SR - getMessage - msg uri" + szMsgURI); 
           
            this.m_bJunkMail = oMSG.bJunkFolder;
            
            //get msg from hotmail
            this.m_HttpComms.clean();
            this.m_HttpComms.setURI(szMsgURI);
            this.m_HttpComms.setRequestMethod("GET");
            var bResult = this.m_HttpComms.send(this.emailOnloadHandler); 
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
            return false;
        }
    },    
    
    
    emailOnloadHandler : function (szResponse ,event , mainObject)
    {
        try
        {
            mainObject.m_Log.Write("Hotmail-SR - emailOnloadHandler - START");
             
            var httpChannel = event.QueryInterface(Components.interfaces.nsIHttpChannel);
            mainObject.m_Log.Write("Hotmail-SR - emailOnloadHandler - msg :" + httpChannel.responseStatus);
                       
            //check status should be 200.
            if (httpChannel.responseStatus != 200) 
                throw new Error("error status " + httpChannel.responseStatus);   
           
            var szMsg = "X-WebMail: true\r\n";
            szMsg += "X-JunkFolder: " + (mainObject.m_bJunkMail? "true":"false")+ "\r\n";
                                                                                 
            //get msg
            var aTemp = szResponse.split(/<pre>\s+/); 
            if (aTemp.length == 0)
                throw new Error("Message START  not found");     
            var szEmail = aTemp[1].split(/<\/pre>/)[0];
             if (szEmail.length == 0)
                throw new Error("Message END  not found"); 
            
            szMsg += szEmail;
            
            //clean up msg
            szMsg = szMsg.replace(/&lt;/g,"<");
            szMsg = szMsg.replace(/&gt;/g,">");
            szMsg = szMsg.replace(/&quot;/g, "\"");
            szMsg = szMsg.replace(/&amp;/g, "&");
            szMsg = szMsg.replace(/^\./mg,"..");    //bit padding   
            szMsg += "\r\n.\r\n";
                                                    //.toString(8)
            var szPOPResponse = "+OK " + szMsg.length + "\r\n";                  
            szPOPResponse += szMsg;

            mainObject.serverComms(szPOPResponse);           
           
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
            var aTempID = szTempID.match(patternHotmailPOPEmailID); 
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
            var szFolderID = szTempID.match(patterHotmailPOPFolderID)[1];
            this.m_Log.Write("Hotmail-SR - deleteMessage - FolderId " + szFolderID );
               
            //construct data
            var szPath = this.m_szLocationURI + "/cgi-bin/HoTMaiL" ;
            this.m_Log.Write("Hotmail-SR - deleteMessage - szPath " + szPath); 
           
            this.m_HttpComms.clean();
            this.m_HttpComms.setContentType(0);
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
            var bResult = this.m_HttpComms.send(this.deleteMessageOnloadHandler);                   
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
            return false;
        } 
    },

    
    deleteMessageOnloadHandler : function (szResponse ,event , mainObject)
    {
        try
        {
            mainObject.m_Log.Write("Hotmail-SR - deleteMessageOnload - START");    
                    
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
            
            this.m_bAuthorised = false;
            this.serverComms("+OK Your Out\r\n");             
                                           
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
}
