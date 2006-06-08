function NetscapePOP(oResponseStream, oLog)
{
    try
    {       
        var scriptLoader =  Components.classes["@mozilla.org/moz/jssubscript-loader;1"];
        scriptLoader = scriptLoader.getService(Components.interfaces.mozIJSSubScriptLoader);
        scriptLoader.loadSubScript("chrome://web-mail/content/common/DebugLog.js");
        scriptLoader.loadSubScript("chrome://web-mail/content/common/HttpComms2.js");
        scriptLoader.loadSubScript("chrome://web-mail/content/common/CommonPrefs.js");
        scriptLoader.loadSubScript("chrome://aol/content/AOL-MSG.js");

        this.m_Log = oLog;
        this.m_Log.Write("NetscapePOP.js - Constructor - START");   
        this.m_oResponseStream = oResponseStream;
        this.m_szUserName = null;   
        this.m_szPassWord = null; 
  
        this.m_HttpComms = new HttpComms(); 
        this.m_bAuthorised = false; 
        this.m_iStage=0; 
         
        this.m_szInboxURL = null;
        this.m_szSpamURL = null;         
        this.m_SuccessPath = null;
        this.m_szHostURL = null;
        this.m_szHomeURI = null;
        this.m_szUserId = null;
        this.m_szVersion = null;
        this.m_szLocation = null;
        this.m_bReEntry = false;
        this.m_szAOLMail = null;
        this.m_iPageNum = -1;
        this.m_iCurrentPage = 1;
        this.m_bJunkMailDone = false;
        this.m_bJunkMail = false;
        this.m_aMsgDataStore = new Array();
        this.m_iTotalSize = 0;
        this.m_szMSG = null;
        this.iID = -1;
        
        this.m_ComponentManager = Components.classes["@mozilla.org/nsComponentData2;1"];
        this.m_ComponentManager = this.m_ComponentManager.getService(Components.interfaces.nsIComponentData2);
         
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
        
        this.m_bStat = false;
                   
        this.m_Log.Write("NetscapePOP.js - Constructor - END");  
    }
    catch(e)
    {
        DebugDump("NetscapePOP.js: Constructor : Exception : " 
                                      + e.name 
                                      + ".\nError message: " 
                                      + e.message+ "\n"
                                      + e.lineNumber);
    }
}



NetscapePOP.prototype =
{

    logIn : function(szUserName, szPassWord)
    {
        try
        {
            this.m_Log.Write("NetscapePOP.js - logIN - START");   
            this.m_Log.Write("NetscapePOP.js - logIN - Username: " + szUserName 
                                                   + " Password: "  + szPassWord 
                                                   + " stream: "    + this.m_oResponseStream);
            
            if (!szUserName || !this.m_oResponseStream || !szPassWord) return false;
            
            this.m_szUserName = szUserName;
            this.m_szPassWord = szPassWord;
            this.m_szAOLMail= "http://mail.netscape.com/";  
            
            this.m_iStage = 0;
            this.m_HttpComms.setURI(this.m_szAOLMail);
            this.m_HttpComms.setRequestMethod("GET");
            this.m_HttpComms.setUserName(this.m_szUserName);
            
            if (this.m_bReUseSession)
            {
                this.m_Log.Write("NetscapePOP.js - logIN - Session Data found");
                this.m_szHomeURI = this.m_ComponentManager.findElement(this.m_szUserName, "szHomeURI");
                this.m_Log.Write("NetscapePOP.js - logIN - m_szHomeURI " +this.m_szHomeURI);
                this.m_szUserId = this.m_ComponentManager.findElement(this.m_szUserName,"szUserId");
                this.m_Log.Write("NetscapePOP.js - logIN - m_szUserId " +this.m_szUserId);   
                this.m_szVersion = this.m_ComponentManager.findElement(this.m_szUserName,"szVersion");
                this.m_Log.Write("NetscapePOP.js - logIN - m_szVersion " +this.m_szVersion);      
                this.m_SuccessPath = this.m_ComponentManager.findElement(this.m_szUserName,"szSuccessPath");
                this.m_Log.Write("NetscapePOP.js - logIN - .m_SuccessPath " +this.m_SuccessPath); 
                this.m_szHostURL = this.m_ComponentManager.findElement(this.m_szUserName,"szHostURL");
                this.m_Log.Write("NetscapePOP.js - logIN - .m_szHostURL" +this.m_szHostURL); 
                this.m_szLocation =this.m_ComponentManager.findElement(this.m_szUserName,"szLocation");
                this.m_Log.Write("NetscapePOP.js - logIN - .m_szLocation" +this.m_szLocation);
                
                if (this.m_szHomeURI) //get home page
                {
                    this.m_iStage =6;
                    this.m_bReEntry = true;
                    this.m_HttpComms.setURI(this.m_szHomeURI);
                }
            }

            var bResult = this.m_HttpComms.send(this.loginOnloadHandler, this);                             
            if (!bResult) throw new Error("httpConnection returned false");        

            this.m_Log.Write("NetscapePOP.js - logIN - END " + bResult);    
            return true;
        }
        catch(e)
        {
            this.m_Log.DebugDump("NetscapePOP.js: logIN : Exception : " 
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
            mainObject.m_Log.Write("NetscapePOP.js - loginOnloadHandler - START"); 
            mainObject.m_Log.Write("NetscapePOP.js - loginOnloadHandler : \n" + szResponse);
            mainObject.m_Log.Write("NetscapePOP.js - loginOnloadHandler : " + mainObject.m_iStage);  
            
            var httpChannel = event.QueryInterface(Components.interfaces.nsIHttpChannel);
            
            //if this fails we've gone somewhere new
            mainObject.m_Log.Write("NetscapePOP.js - loginOnloadHandler - status :" +httpChannel.responseStatus );
            if (httpChannel.responseStatus != 200)
            { 
                if (mainObject.m_iStage!=5)
                    throw new Error("return status " + httpChannel.responseStatus);
            }
            
             //page code                                
            switch (mainObject.m_iStage)
            {
                case 0: // login page               
                    var szLoginReplaceURL = szResponse.match(patternAOLReplace)[1];
                    mainObject.m_Log.Write("NetscapePOP.js - loginOnloadHandler - replace " + szLoginReplaceURL);
                    if (szLoginReplaceURL == null)
                         throw new Error("error parsing AOL login web page");

                    mainObject.m_HttpComms.setURI(szLoginReplaceURL);
                    mainObject.m_HttpComms.setRequestMethod("GET");
                    var bResult = mainObject.m_HttpComms.send(mainObject.loginOnloadHandler, mainObject);      
                    if (!bResult) throw new Error("httpConnection returned false");
                    mainObject.m_iStage++;
                break;
                
                
                case 1://redirect
                    var szLoginRedirectURL = szResponse.match(patternAOLRedirect)[1];
                    mainObject.m_Log.Write("NetscapePOP.js - loginOnloadHandler - redirect " + szLoginRedirectURL);
                    if (szLoginRedirectURL == null)
                         throw new Error("error parsing AOL login web page");
                         
                    mainObject.m_HttpComms.setURI(szLoginRedirectURL);
                    mainObject.m_HttpComms.setRequestMethod("GET");
                    var bResult = mainObject.m_HttpComms.send(mainObject.loginOnloadHandler, mainObject);      
                    if (!bResult) throw new Error("httpConnection returned false");
                    mainObject.m_iStage++;
                break;
                
                
                case 2: //login page
                    var szLoginForm = szResponse.match(patternAOLLoginForm);
                    mainObject.m_Log.Write("NetscapePOP.js - loginOnloadHandler - szLoginForm " + szLoginForm);
                    if (szLoginForm == null)
                        throw new Error("error parsing AOL login web page");
                         
                    var aLoginData = szLoginForm[0].match(patternAOLInput);
                    mainObject.m_Log.Write("NetscapePOP.js - loginOnloadHandler - aLoginData " + aLoginData);
                    
                    for (i=0; i<aLoginData.length; i++)
                    {
                        if (aLoginData[i].search(/type="hidden"/i)!=-1)
                        {
                            var szName=aLoginData[i].match(patternAOLName)[1];
                            mainObject.m_Log.Write("NetscapePOP.js - loginOnloadHandler - loginData name " + szName);
                            
                            var szValue = aLoginData[i].match(patternAOLValue)[1];
                            mainObject.m_Log.Write("NetscapePOP.js - loginOnloadHandler - loginData value " + szValue);
                        
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
                    mainObject.m_Log.Write("NetscapePOP.js - loginOnloadHandler - szLoginURL : "+szLoginURL);
                    
                    mainObject.m_HttpComms.setURI(szLoginURL);
                    mainObject.m_HttpComms.setRequestMethod("POST");
                    var bResult = mainObject.m_HttpComms.send(mainObject.loginOnloadHandler, mainObject);      
                    if (!bResult) throw new Error("httpConnection returned false");
                    mainObject.m_iStage++;
                break;
                
                
                case 3://login bounce 
                    var szLoginVerify = szResponse.match(patternAOLVerify)[1];
                    mainObject.m_Log.Write("NetscapePOP.js - loginOnloadHandler - szLoginVerify " + szLoginVerify);
                    if (szLoginVerify == null)
                        throw new Error("error parsing AOL login web page");
                   
                    mainObject.m_HttpComms.setURI(szLoginVerify);
                    mainObject.m_HttpComms.setRequestMethod("GET");
                    var bResult = mainObject.m_HttpComms.send(mainObject.loginOnloadHandler, mainObject);      
                    if (!bResult) throw new Error("httpConnection returned false");
                    mainObject.m_iStage++;
                break;
                
                case 4://get host
                    mainObject.m_szHostURL = szResponse.match(patternAOLHost)[1];
                    if (mainObject.m_szHostURL == null)
                        throw new Error("error parsing AOL login web page");
                    mainObject.m_SuccessPath = szResponse.match(patternAOLPath)[1];
                    var szCheck = szResponse.match(patternAOLHostCheck)[1];
                    var szURL = "http://" + mainObject.m_szHostURL + szCheck;
                               
                    mainObject.m_HttpComms.setURI(szURL);
                    mainObject.m_HttpComms.setRequestMethod("GET");
                    var bResult = mainObject.m_HttpComms.send(mainObject.loginOnloadHandler, mainObject);      
                    if (!bResult) throw new Error("httpConnection returned false");
                    mainObject.m_iStage++;
                break;
                
                case 5://get mail box                   
                    mainObject.m_szHostURL = szResponse.match(patternAOLTarget)[1];
                    mainObject.m_Log.Write("NetscapePOP.js - loginOnloadHandler - m_szHostURL " +mainObject.m_szHostURL);
                    if (mainObject.m_szHostURL == null)
                        throw new Error("error parsing AOL login web page");
                   
                    var szURL = "http://" + mainObject.m_szHostURL + mainObject.m_SuccessPath;
                    mainObject.m_szHomeURI = szURL;
                    
                    var szCookies =  httpChannel.getResponseHeader("Set-Cookie");                   
                    mainObject.m_szUserId = szCookies.match(patternAOLUserID)[1];
                    mainObject.m_Log.Write("NetscapePOP.js - loginOnloadHandler - m_szUserId " +mainObject.m_szUserId);
                    
                    mainObject.m_HttpComms.setURI(szURL);
                    mainObject.m_HttpComms.setRequestMethod("GET");
                    var bResult = mainObject.m_HttpComms.send(mainObject.loginOnloadHandler, mainObject);      
                    if (!bResult) throw new Error("httpConnection returned false");
                    mainObject.m_iStage++;
                break;
                
                case 6://get urls
                    if(szResponse.search(patternAOLLogout)==-1)
                    {
                        if (mainObject.m_bReEntry)
                        {
                            mainObject.m_bReEntry = false;
                            mainObject.m_iStage =0;
                            mainObject.m_HttpComms.setURI(mainObject.m_szAOLMail);
                            mainObject.m_HttpComms.setRequestMethod("GET");
                            var bResult = mainObject.m_HttpComms.send(mainObject.loginOnloadHandler, mainObject);                             
                            if (!bResult) throw new Error("httpConnection returned false");
                            return;
                        }
                        else
                            throw new Error("error logging in");
                    }
                      
                    mainObject.m_szVersion = szResponse.match(patternAOLVersion)[1];
                    mainObject.m_Log.Write("NetscapePOP.js - loginOnloadHandler - szVersion " +mainObject.m_szVersion);
                    
                    var szDir = mainObject.m_SuccessPath.replace(/\/Mail\//i,"/rpc/");
                    mainObject.m_szLocation = "http://" + mainObject.m_szHostURL + szDir ;
                    var szURL = mainObject.m_szLocation + "GetMessageList.aspx?page=1";
                    var szData = "previousFolder=&stateToken=&newMailToken=&"
                    szData += "version="+ mainObject.m_szVersion +"&user="+ mainObject.m_szUserId;
                    
                    //inbox
                    mainObject.m_szInboxURL = szURL + "&folder=inbox&" + szData; ;
                    mainObject.m_Log.Write("NetscapePOP.js - loginOnloadHandler - m_szInboxURL " + mainObject.m_szInboxURL);
                    //spam   
                    mainObject.m_szSpamURL = szURL + "&folder=Spam&" + szData;      
                    mainObject.m_Log.Write("NetscapePOP.js - loginOnloadHandler - m_szSpamURL " + mainObject.m_szSpamURL);
                    
                    //server response
                    mainObject.serverComms("+OK Your in\r\n");
                    mainObject.m_bAuthorised = true;
                break;
            };
            mainObject.m_Log.Write("NetscapePOP.js - loginOnloadHandler - END");
        }
        catch(err)
        {
            mainObject.m_Log.DebugDump("NetscapePOP.js: loginHandler : Exception : " 
                                          + err.name 
                                          + ".\nError message: " 
                                          + err.message+ "\n"
                                          + err.lineNumber);
            mainObject.m_HttpComms.deleteSessionData();                                  
            mainObject.serverComms("-ERR Comms Error from "+ mainObject.m_szUserName+"\r\n");
        }
    },
    
    
    //stat 
    //total size is in octets
    getNumMessages : function()
    {
        try
        {
            this.m_Log.Write("NetscapePOP.js - getNumMessages - START"); 
            
            if (this.m_szInboxURL== null) return false;
            this.m_Log.Write("NetscapePOP.js - getNumMessages - mail box url " + this.m_szInboxURL); 
            
            this.m_iStage = 0;
            this.m_HttpComms.setURI(this.m_szInboxURL);
            this.m_HttpComms.setRequestMethod("GET");
            var bResult = this.m_HttpComms.send(this.mailBoxOnloadHandler, this); 
            if (!bResult) throw new Error("httpConnection returned false");
            this.m_bStat = true;
            
            this.m_Log.Write("NetscapePOP.js - getNumMessages - END"); 
            return true;
        }
        catch(e)
        {
            this.m_Log.DebugDump("NetscapePOP.js: getNumMessages : Exception : " 
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
            mainObject.m_Log.Write("NetscapePOP.js - mailBoxOnloadHandler - START"); 
            mainObject.m_Log.Write("NetscapePOP.js - mailBoxOnloadHandler : \n" + szResponse);
            mainObject.m_Log.Write("NetscapePOP.js - mailBoxOnloadHandler : " + mainObject.m_iStage);  
            
            var httpChannel = event.QueryInterface(Components.interfaces.nsIHttpChannel);
            
            //if this fails we've gone somewhere new
            mainObject.m_Log.Write("NetscapePOP.js - mailBoxOnloadHandler - status :" +httpChannel.responseStatus );
            if (httpChannel.responseStatus != 200)
                throw new Error("return status " + httpChannel.responseStatus);
             
                           
            //process page
            var aszMSGDetails = szResponse.match(patternAOLMSGData);
            mainObject.m_Log.Write("Hotmail-SR - mailBoxOnloadHandler - aszMSGDetails : " + aszMSGDetails);
            
            var aszSenderAddress = szResponse.match(patternAOLMSGSender);
            mainObject.m_Log.Write("Hotmail-SR - mailBoxOnloadHandler - aszSenderAddress : " + aszSenderAddress);
            
            if (aszMSGDetails)    
            {
                for (i=0; i<aszMSGDetails.length; i++)
                {
                    var aTempData = aszMSGDetails[i].match(patternAOLMSGDataProcess);
                    mainObject.m_Log.Write("AOL - mailBoxOnloadHandler - aTempData : " + aTempData);
                    
                    var bRead = false;
                    if (mainObject.m_bDownloadUnread)
                    {
                        bRead = parseInt(aTempData[5]); //unread
                        mainObject.m_Log.Write("AOL.js - mailBoxOnloadHandler - bRead -" + bRead);
                    }
                  
                    if (!bRead)
                    {
                        var MSGData = new AOLMSG();
                        MSGData.iID = aTempData[1]; //ID
                        MSGData.szSubject = aTempData[2]; //Subject
                        MSGData.iDate = parseInt(aTempData[3]); //Date
                        MSGData.iSize = parseInt(aTempData[4]); //size

                        //sender
                        var aTempData2= aszSenderAddress[i].match(/\((.*?)\)/)[1].split(/,/);
                        mainObject.m_Log.Write("AOL - mailBoxOnloadHandler - aTempData2 : " + aTempData2);
                        MSGData.szFrom = aTempData2[0].match(/"(.*?)"/)[1];
                        
                        MSGData.szTo = mainObject.m_szUserName;//me
                        MSGData.bJunkFolder = mainObject.m_bJunkMailDone; //junkmail
                        
                        mainObject.m_aMsgDataStore.push(MSGData);
                        mainObject.m_iTotalSize += MSGData.iSize;
                    }
                }
            }

            //next page
            //get number of pages
            if (mainObject.m_iPageNum == -1)
            {
                var szPageNum = szResponse.match(patternAOLPageNum)[1];
                mainObject.m_Log.Write("NetscapePOP.js - mailBoxOnloadHandler - szPageNum " + szPageNum);
                mainObject.m_iPageNum =  parseInt(szPageNum);
            }   
            
            //get current page number
            var szLocation = httpChannel.URI.spec;
            mainObject.m_Log.Write("NetscapePOP - mailBoxOnloadHandler - url : " + szLocation);
            var szCurrentPage = szLocation.match(patternAOLURLPageNum)[1];
            mainObject.m_Log.Write("NetscapePOP - mailBoxOnloadHandler - szCurrentPage : " + szCurrentPage);
            var iCurrentPage =  parseInt(szCurrentPage);
            
            if(iCurrentPage < mainObject.m_iPageNum)
            {
                var szNextPage = szLocation.replace(/page.*?&/,"page="+(iCurrentPage+1)+"&");
                mainObject.m_HttpComms.setURI(szNextPage);
                mainObject.m_HttpComms.setRequestMethod("GET");
                var bResult = mainObject.m_HttpComms.send(mainObject.mailBoxOnloadHandler, mainObject); 
                if (!bResult) throw new Error("httpConnection returned false");
            }
            else
            {
                if (!mainObject.m_bJunkMailDone && mainObject.m_bUseJunkMail && mainObject.m_szSpamURL)
                { //get junkmail
                    mainObject.m_Log.Write("AOL - mailBoxOnloadHandler - junkmail: " + mainObject.m_bUseJunkMail); 
                    
                    mainObject.m_bJunkMailDone = true;
                    mainObject.m_iPageNum = -1; //reset page count
                                       
                    mainObject.m_HttpComms.setURI(mainObject.m_szSpamURL);
                    mainObject.m_HttpComms.setRequestMethod("GET");
                    var bResult = mainObject.m_HttpComms.send(mainObject.mailBoxOnloadHandler, mainObject); 
                    if (!bResult) throw new Error("httpConnection returned false");
                }
                else  //all uri's collected
                {
                    if (mainObject.m_bStat) //called by stat
                    {
                        mainObject.serverComms("+OK "+ mainObject.m_aMsgDataStore.length 
                                                + " " + mainObject.m_iTotalSize + "\r\n");
                    }
                    else //called by list
                    {
                        var szPOPResponse = "+OK " + mainObject.m_aMsgDataStore.length + " Messages\r\n"; 
                        this.m_Log.Write("AOL.js - getMessagesSizes - : " + mainObject.m_aMsgDataStore.length);
         
                        for (i = 0; i <  mainObject.m_aMsgDataStore.length; i++)
                        {
                            var iEmailSize = mainObject.m_aMsgDataStore[i].iSize;
                            szPOPResponse+=(i+1) + " " + iEmailSize + "\r\n";       
                        }         
                       
                        szPOPResponse += ".\r\n";
                        mainObject.serverComms(szPOPResponse);
                    }
                }
            }


            mainObject.m_Log.Write("NetscapePOP.js - mailBoxOnloadHandler - END");
        }
        catch(err)
        {
             mainObject.m_Log.DebugDump("NetscapePOP.js: MailboxOnload : Exception : " 
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
            this.m_Log.Write("NetscapePOP.js - getMessageSizes - START"); 
            
            if (this.m_bStat) 
            {  //msg table has been donwloaded
                var szPOPResponse = "+OK " +  this.m_aMsgDataStore.length + " Messages\r\n"; 
                for (i = 0; i < this.m_aMsgDataStore.length; i++)
                {
                    var iEmailSize = this.m_aMsgDataStore[i].iSize;
                    this.m_Log.Write("NetscapePOP.js - getMessageSizes - Email Size : " +iEmailSize);
                    szPOPResponse+=(i+1) + " " + iEmailSize + "\r\n";   
                } 
                szPOPResponse += ".\r\n";
                
                this.serverComms(szPOPResponse);
            }
            else
            { //download msg list
                this.m_Log.Write("AOL - getMessageSizes - calling stat");
                if (this.m_szInboxURL== null) return false;
                this.m_Log.Write("NetscapePOP.js - getNumMessages - mail box url " + this.m_szInboxURL); 
                
                this.m_iStage = 0;
                this.m_HttpComms.setURI(this.m_szInboxURL);
                this.m_HttpComms.setRequestMethod("GET");
                var bResult = this.m_HttpComms.send(this.mailBoxOnloadHandler, this); 
                if (!bResult) throw new Error("httpConnection returned false");
            }
                           
            this.m_Log.Write("NetscapePOP.js - getMessageSizes - END"); 
            return true;
        }
        catch(e)
        {
            this.m_Log.DebugDump("NetscapePOP.js: getMessageSizes : Exception : " 
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
            this.m_Log.Write("NetscapePOP.js - getMessageIDs - START"); 
            
            var szPOPResponse = "+OK " + this.m_aMsgDataStore.length + " Messages\r\n";
            for (i = 0; i <  this.m_aMsgDataStore.length; i++)
            {
                var iEmailID = this.m_aMsgDataStore[i].iID;
                this.m_Log.Write("NetscapePOP.js - getMessageIDs - Email URL : " +iEmailID);
                                                  
                szPOPResponse+=(i+1) + " " + iEmailID + "\r\n"; 
            }         
            szPOPResponse += ".\r\n";
            this.serverComms(szPOPResponse);           
                     
            this.m_Log.Write("NetscapePOP.js - getMessageIDs - END"); 
            return true;
        }
        catch(e)
        {
            this.m_Log.DebugDump("NetscapePOP.js: getMessageIDs : Exception : " 
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
            this.m_Log.Write("NetscapePOP.js - getHeaders - START");  
            this.m_Log.Write("NetscapePOP.js - getHeaders - id " + lID ); 
            
            var oMSG = this.m_aMsgDataStore[lID-1];
            
            var szHeaders = "X-WebMail: true\r\n";
            szHeaders += "X-JunkFolder: " +(oMSG.bJunkFolder? "true":"false")+ "\r\n";
            szHeaders += "To: "+ oMSG.szTo +"\r\n";
            szHeaders += "From: "+ oMSG.szFrom +"\r\n";
            szHeaders += "Subject: "+ oMSG.szSubject +"\r\n";
            var date = new Date(oMSG.iDate);
            szHeaders += "Date: " +  date +"\r\n"; // \r\n";
            szHeaders = szHeaders.replace(/^\./mg,"..");    //bit padding 
            szHeaders += "\r\n.\r\n";//msg end 
             
            var  szResponse = "+OK " +szHeaders.length + "\r\n"; 
            szResponse += szHeaders
            this.serverComms(szResponse);
            
            this.m_Log.Write("NetscapePOP.js - getHeaders - END");
            return true; 
        }
        catch(err)
        {
            this.m_Log.DebugDump("NetscapePOP.js: getHeaders : Exception : " 
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
            this.m_Log.Write("NetscapePOP.js - getMessage - START"); 
            this.m_Log.Write("NetscapePOP.js - getMessage - msg num" + lID);
                                 
            //get msg id
            var oMSG = this.m_aMsgDataStore[lID-1];
            this.m_bJunkMail = oMSG.bJunkFolder;
            this.iID = oMSG.iID;
            var szURL = this.m_szLocation.replace(/rpc/,"Mail") + "rfc822.aspx?";
            szURL += "folder=" + (this.m_bJunkMail?"Spam":"Inbox") +"&";
            szURL += "uid=" + oMSG.iID +"&";
            szURL += "user="+ this.m_szUserId;
            
            this.m_iStage = 0;
            this.m_HttpComms.setURI(szURL);
            this.m_HttpComms.setRequestMethod("GET");
            var bResult = this.m_HttpComms.send(this.emailOnloadHandler, this); 
            if (!bResult) throw new Error("httpConnection returned false");
           
            this.m_Log.Write("NetscapePOP.js - getMessage - END"); 
            return true;
        }
        catch(e)
        {
             this.m_Log.DebugDump("NetscapePOP.js: getMessage : Exception : " 
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
            mainObject.m_Log.Write("NetscapePOP.js - emailOnloadHandler - START"); 
            mainObject.m_Log.Write("NetscapePOP.js - emailOnloadHandler : \n" + szResponse);
            
            var httpChannel = event.QueryInterface(Components.interfaces.nsIHttpChannel);
            mainObject.m_Log.Write("NetscapePOP.js - emailOnloadHandler - msg :" + httpChannel.responseStatus);
                       
            //check status should be 200.
            if (httpChannel.responseStatus != 200) 
                throw new Error("error status " + httpChannel.responseStatus);           
            
            switch(mainObject.m_iStage)
            {
                case 0:
                    mainObject.m_szMSG = "X-WebMail: true\r\n";
                    mainObject.m_szMSG += "X-JunkFolder: " + (mainObject.m_bJunkMail? "true":"false")+ "\r\n";
                    mainObject.m_szMSG += szResponse.replace(/^\./mg,"..");    //bit padding   
                    mainObject.m_szMSG += "\r\n.\r\n";       
                    
                    var szURL = mainObject.m_szLocation + "MessageAction.aspx?";
                    szURL += "folder=" + (mainObject.m_bJunkMail?"Spam":"Inbox") +"&";
                    szURL += "action=seen&";
                    szURL += "version="+ mainObject.m_szVersion +"&";
                    szURL += "uid=" + mainObject.iID +"&";
                    szURL += "version="+ mainObject.m_szVersion +"&";
                    szURL += "user="+ mainObject.m_szUserId;
                                    
                    mainObject.m_HttpComms.setURI(szURL);
                    mainObject.m_HttpComms.setRequestMethod("GET");
                    var bResult = mainObject.m_HttpComms.send(mainObject.emailOnloadHandler, mainObject); 
                    if (!bResult) throw new Error("httpConnection returned false");
                    mainObject.m_iStage++;
                break;
               
                case 1:
                    var szPOPResponse = "+OK " +  mainObject.m_szMSG.length + "\r\n";                  
                    szPOPResponse += mainObject.m_szMSG;
            
                    mainObject.serverComms(szPOPResponse);
                break;
            }
            mainObject.m_Log.Write("NetscapePOP.js - emailOnloadHandler - end"); 
        }
        catch(err)
        {
            mainObject.m_Log.DebugDump("NetscapePOP.js: emailOnloadHandler : Exception : " 
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
            this.m_Log.Write("NetscapePOP.js - deleteMessage - START");  
            this.m_Log.Write("NetscapePOP.js - deleteMessage - id " + lID );
            
            //get msg id
            var oMSG = this.m_aMsgDataStore[lID-1];
            this.m_bJunkMail = oMSG.bJunkFolder;
            this.iID = oMSG.iID;
            var szURL = this.m_szLocation + "MessageAction.aspx?";
            szURL += "folder=" + (this.m_bJunkMail?"Spam":"Inbox") +"&";
            szURL += "action=delete&";
            szURL += "version="+ this.m_szVersion +"&";
            szURL += "uid=" + oMSG.iID +"&";
            szURL += "user="+ this.m_szUserId;
            
            this.m_iStage = 0;
            this.m_HttpComms.setURI(szURL);
            this.m_HttpComms.setRequestMethod("GET");
            var bResult = this.m_HttpComms.send(this.deleteMessageOnloadHandler, this); 
            if (!bResult) throw new Error("httpConnection returned false");

            this.m_Log.Write("NetscapePOP.js - deleteMessage - END");     
            return true;
        }
        catch(e)
        {
            this.m_Log.DebugDump("NetscapePOP.js: deleteMessage : Exception : " 
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
            mainObject.m_Log.Write("NetscapePOP.js - deleteMessageOnloadHandler - START");
            mainObject.m_Log.Write("NetscapePOP.js - deleteMessageOnloadHandler : \n" + szResponse);
                        
            var httpChannel = event.QueryInterface(Components.interfaces.nsIHttpChannel);
            mainObject.m_Log.Write("NetscapePOP.js - emailOnloadHandler - msg :" + httpChannel.responseStatus);
            
            //check status should be 200.
            if (httpChannel.responseStatus != 200) 
                throw new Error("error status " + httpChannel.responseStatus);  
            
            mainObject.serverComms("+OK its history\r\n"); 
            
            mainObject.m_Log.Write("NetscapePOP.js - deleteMessageOnloadHandler - END");
        }
        catch(err)
        {
            mainObject.m_Log.DebugDump("NetscapePOP.js: deleteMessageOnloadHandler : Exception : " 
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
            this.m_Log.Write("NetscapePOP.js - logOUT - START"); 
            
            if (this.m_bReUseSession)
            { 
                this.m_Log.Write("NetscapePOP.js - Logout - Setting Session Data");           
                this.m_ComponentManager.addElement(this.m_szUserName, "szHomeURI", this.m_szHomeURI);   
                this.m_ComponentManager.addElement(this.m_szUserName, "szUserId",this.m_szUserId);
                this.m_ComponentManager.addElement(this.m_szUserName, "szVersion",this.m_szVersion);
                this.m_ComponentManager.addElement(this.m_szUserName, "szSuccessPath", this.m_SuccessPath);
                this.m_ComponentManager.addElement(this.m_szUserName, "szHostURL",this.m_szHostURL);
                this.m_ComponentManager.addElement(this.m_szUserName, "szLocation",this.m_szLocation);  
            }
            else
            {
                this.m_Log.Write("NetscapePOP.js - logIN - deleting Session Data");
                this.m_HttpComms.deleteSessionData(); 
                this.m_ComponentManager.deleteAllElements(this.m_szUserName);
            }
                      
            this.m_bAuthorised = false;
            this.serverComms("+OK Your Out\r\n");        
            
            this.m_Log.Write("NetscapePOP.js - logOUT - END");  
            return true;
        }
        catch(e)
        {
            this.m_Log.DebugDump("NetscapePOP.js: logOUT : Exception : " 
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
            this.m_Log.Write("NetscapePOP.js - serverComms - START");
            this.m_Log.Write("NetscapePOP.js - serverComms msg " + szMsg);
            var iCount = this.m_oResponseStream.write(szMsg,szMsg.length);
            this.m_Log.Write("NetscapePOP.js - serverComms sent count: " + iCount 
                                                        +" msg length: " +szMsg.length);
            this.m_Log.Write("NetscapePOP.js - serverComms - END");  
        }
        catch(e)
        {
            this.m_Log.DebugDump("NetscapePOP.js: serverComms : Exception : " 
                                              + e.name 
                                              + ".\nError message: " 
                                              + e.message+ "\n"
                                              + e.lineNumber);
        }
    },
}
