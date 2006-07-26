/******************************  Yahoo Current Site  ***************************************/

function YahooPOPBETA(oResponseStream, oLog, oPrefs)
{
    try
    {       
        var scriptLoader =  Components.classes["@mozilla.org/moz/jssubscript-loader;1"];
        scriptLoader = scriptLoader.getService(Components.interfaces.mozIJSSubScriptLoader);
        scriptLoader.loadSubScript("chrome://web-mail/content/common/DebugLog.js");
        scriptLoader.loadSubScript("chrome://web-mail/content/common/HttpComms2.js");
        scriptLoader.loadSubScript("chrome://web-mail/content/common/Header.js");
        scriptLoader.loadSubScript("chrome://web-mail/content/common/base64.js");
        scriptLoader.loadSubScript("chrome://yahoo/content/YahooMSG.js");
        scriptLoader.loadSubScript("chrome://yahoo/content/Yahoo-Prefs-Accounts-Data.js");
        scriptLoader.loadSubScript("chrome://yahoo/content/EmailBuilder.js");     
        
        this.m_Log = oLog;
        this.m_Log.Write("YahooPOPBETA.js - Constructor - START");   
       
        //prefs
        this.m_bReUseSession = oPrefs.bReUseSession;    //re use session
        this.m_bDownloadUnread= oPrefs.bUnread;         //download unread
        this.m_aszPrefFolderList = oPrefs.aszFolder;    // download folder
        this.m_iTime = oPrefs.iProcessDelay;            //timer delay
        this.m_iProcessTrigger = oPrefs.iProcessTrigger;//delay process trigger
        this.m_iProcessAmount =  oPrefs.iProcessAmount; //delay proccess amount

        //login data
        this.m_bAuthorised = false;
        this.m_szUserName = null; 
        this.m_szPassWord = null; 
        this.m_oResponseStream = oResponseStream;  
        
        //comms
        this.m_HttpComms = new HttpComms(this.m_Log);
        this.m_szLoginUserName = null;
        this.m_aLoginForm = null;
        this.m_bReEntry = false;
        this.m_bStat = false;
        this.m_szYahooMail = null;
        this.m_szHomeURI = null;
        this.m_iStage = 0; 
        this.m_iLoginCount = 0;
        this.m_szLocationURI = null;
        this.m_szWssid = null;
        this.m_szWebserviceUrl = null;    
        this.m_aszFolderList= new Array();
        this.m_aRawData = new Array();
        this.m_aMsgDataStore = new Array();
        this.m_aDownloadFiles = new Array();
        
        this.m_iTotalSize = 0;
        this.m_iMSGCount = 0;
        this.m_szHeader = null;        
        this.m_szMsgID = null;  
        this.m_szBox = null;
        this.m_iID =0; 
        this.m_oEmail = null;
        
        this.m_Timer = Components.classes["@mozilla.org/timer;1"];
        this.m_Timer = this.m_Timer.createInstance(Components.interfaces.nsITimer);   
        
        this.m_SessionManager = Components.classes["@mozilla.org/SessionManager;1"]
                                          .getService(Components.interfaces.nsISessionManager);
        this.m_SessionData = null;      
                                           
        this.m_Log.Write("YahooPOPBETA.js - Constructor - END");  
    }
    catch(e)
    {
        DebugDump("YahooPOPBETA.js: Constructor : Exception : " 
                                      + e.name 
                                      + ".\nError message: " 
                                      + e.message+ "\n"
                                      + e.lineNumber);
    }
}



YahooPOPBETA.prototype =
{     
    logIn : function(szUserName , szPassword)
    {
        try
        {
            this.m_Log.Write("YahooPOPBETA.js - logIN - START"); 
            if (!szUserName || !szPassword) return false;  
            
            this.m_szUserName = szUserName;  
            this.m_szPassWord = szPassword; 
            
            this.m_szYahooMail = "http://mail.yahoo.com";
            this.m_szLoginUserName = this.m_szUserName;
            
            if (this.m_szUserName.search(/yahoo/i)!=-1) //remove domain from user name 
            {  
                this.m_szLoginUserName = this.m_szUserName.match(/(.*?)@/)[1].toLowerCase();
            }  
            else if (this.m_szUserName.search(/@talk21.com$/i)!=-1 ||  
                     this.m_szUserName.search(/@btinternet.com$/i)!=-1  ||
                     this.m_szUserName.search(/@btopenworld.com$/i)!=-1 )
            {
                this.m_szYahooMail = "http://bt.yahoo.com/";
            }    
                       
                       
            this.m_Log.Write("YahooPOPBETA.js - logIN - default " +this.m_szYahooMail);
            this.m_iStage = 0;
            this.m_HttpComms.setURI(this.m_szYahooMail);  
            
            //get session data
            if (this.m_bReUseSession)
            { 
                this.m_Log.Write("YahooPOPBETA.js - logIN - Getting Session Data");  
                this.m_SessionData = this.m_SessionManager.findSessionData(this.m_szUserName); 
                if (this.m_SessionData)  
                {     
                    this.m_Log.Write("YahooPOPBETA.js - logIN - Session Data FOUND");
                    this.m_HttpComms.setCookieManager(this.m_SessionData.oCookieManager);
                    this.m_szHomeURI = this.m_SessionData.oComponentData.findElement("szHomeURI");
                    this.m_Log.Write("YahooPOPBETA.js - logIN - szHomeURI " +this.m_szHomeURI);    
                    if (this.m_szHomeURI)
                    {
                        this.m_Log.Write("YahooPOPBETA.js - logIN - Session Data Found"); 
                        this.m_iStage =2;
                        this.m_bReEntry = true;
                        this.m_HttpComms.setURI(this.m_szHomeURI);
                    }
                }
            }
            
            this.m_HttpComms.setRequestMethod("GET");
            var bResult = this.m_HttpComms.send(this.loginOnloadHandler, this);                             
            if (!bResult) throw new Error("httpConnection returned false");
            this.m_Log.Write("YahooPOPBETA.js - logIN - END");    
            return true;
        }
        catch(e)
        {
            this.m_Log.DebugDump("YahooPOPBETA.js: logIN : Exception : " 
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
            mainObject.m_Log.Write("YahooPOPBETA.js - loginOnloadHandler - START"); 
           // mainObject.m_Log.Write("YahooPOPBETA.js - loginOnloadHandler : \n" + szResponse);
            mainObject.m_Log.Write("YahooPOPBETA.js - loginOnloadHandler : Stage" + mainObject.m_iStage);  
            
            var httpChannel = event.QueryInterface(Components.interfaces.nsIHttpChannel);     
            //if this fails we've gone somewhere new
            mainObject.m_Log.Write("nsYahoo.js - loginOnloadHandler - status :" +httpChannel.responseStatus );
            if (httpChannel.responseStatus != 200) 
                throw new Error("return status " + httpChannel.responseStatus);
             
             
            if (szResponse.search(patternYahooForm)!=-1) 
            {
                if ( mainObject.m_iLoginCount<=3)
                {                    
                    if (szResponse.search(patternYahooLogInSpam)!=-1)
                    {
                        mainObject.m_Log.Write("YahooPOPBETA.js - loginOnloadHandler - Spam Image found");
                        mainObject.m_iStage =4; //spam image found
                        mainObject.m_iLoginCount++;
                    }
                    else
                    {
                        mainObject.m_iLoginCount++;
                        mainObject.m_iStage =0;
                    }
                }
                else
                    throw new Error ("Too Many Login's");
            }    
              
                
            //page code                                
            switch (mainObject.m_iStage)
            {
                case 0: // login page               
                    var aLoginForm = szResponse.match(patternYahooForm);
                    if (aLoginForm == null)
                         throw new Error("error parsing yahoo login web page");
                    mainObject.m_Log.Write("YahooPOPBETA.js - loginOnloadHandler - loginForm " + aLoginForm);
                    
                    
                    var szLoginURL = aLoginForm[0].match(patternYahooAction)[1];
                    mainObject.m_Log.Write("YahooPOPBETA.js - loginOnloadHandler - loginURL " + szLoginURL);
                    
                    var aLoginData = aLoginForm[0].match(patternYahooLogIn);
                    mainObject.m_Log.Write("YahooPOPBETA.js - loginOnloadHandler - loginData " + aLoginData);
                   
                    for (i=0; i<aLoginData.length; i++)
                    {
                        var szName=aLoginData[i].match(patternYahooNameAlt)[1];
                        szName = szName.replace(/["|']/gm,"");
                        szName = szName.replace(/^\s*|\s*$/gm,"");
                        mainObject.m_Log.Write("YahooPOPBETA.js - loginOnloadHandler - loginData name " + szName);
                        
                        var szValue = aLoginData[i].match(patternYahooAltValue)[1];
                        szValue = szValue.replace(/["|']/gm,"");
                        szValue = szValue.replace(/^\s*|\s*$/gm,"");
                        mainObject.m_Log.Write("YahooPOPBETA.js - loginOnloadHandler - loginData value " + szValue);
                        
                        mainObject.m_HttpComms.addValuePair(szName,(szValue? encodeURIComponent(szValue):""));
                    }
                    
                    var szLogin = encodeURIComponent(mainObject.m_szLoginUserName);
                    mainObject.m_HttpComms.addValuePair("login", szLogin);
                    
                    var szPass = encodeURIComponent(mainObject.m_szPassWord);
                    mainObject.m_HttpComms.addValuePair("passwd",szPass);
                   
                    mainObject.m_HttpComms.addValuePair(".persistent","y");  
                                      
                    mainObject.m_HttpComms.setURI(szLoginURL);
                    mainObject.m_HttpComms.setRequestMethod("POST");
                    var bResult = mainObject.m_HttpComms.send(mainObject.loginOnloadHandler, mainObject);      
                    if (!bResult) throw new Error("httpConnection returned false");
                    mainObject.m_iStage++;
                break;
                                  
                case 1: //redirect
                    var aLoginRedirect = szResponse.match(patternYahooRedirect);
                    if (aLoginRedirect == null)
                         throw new Error("error parsing yahoo login web page");
                    mainObject.m_Log.Write("YahooPOPBETA.js - loginOnloadHandler - login redirect " + aLoginRedirect);
                      
                    var szLocation = aLoginRedirect[1];
                
                    mainObject.m_HttpComms.setURI(szLocation);
                    mainObject.m_HttpComms.setRequestMethod("GET");
                    var bResult = mainObject.m_HttpComms.send(mainObject.loginOnloadHandler, mainObject);
                    if (!bResult) throw new Error("httpConnection returned false");
                    mainObject.m_iStage++;
                break;
            
                case 2: //mail box
                    var szLocation  = httpChannel.URI.spec;
                    mainObject.m_Log.Write("YahooPOPBETA.js - loginOnloadHandler - page check : " + szLocation );
                   
                    if (szResponse.search(kPatternLogOut)== -1)
                    {
                        if (mainObject.m_bReEntry)
                        {
                            mainObject.m_bReEntry = false;
                            mainObject.m_iStage =0;
                            mainObject.m_HttpComms.setURI(mainObject.m_szYahooMail);
                            mainObject.m_HttpComms.setRequestMethod("GET");
                            var bResult = mainObject.m_HttpComms.send(mainObject.loginOnloadHandler, mainObject);                             
                            if (!bResult) throw new Error("httpConnection returned false");
                            return;
                        }
                        else
                            throw new Error("error logging in");
                    } 
                    
                    mainObject.m_szHomeURI = szLocation;
                    
                    //get wssid
                    mainObject.m_szWssid = szResponse.match(kPatternWssid)[1];
                    mainObject.m_Log.Write("YahooPOPBETA.js - loginOnloadHandler - m_szWssid : "+mainObject.m_szWssid );                   
                    
                    //get webserviceUrl
                    mainObject.m_szWebserviceUrl = szResponse.match(kPatternWebserviceUrl)[1];                
                    mainObject.m_Log.Write("YahooPOPBETA.js - loginOnloadHandler - m_szWebserviceUrl : "+mainObject.m_szWebserviceUrl );              
        
                    mainObject.m_szLocationURI = httpChannel.URI.prePath ;
                    mainObject.m_Log.Write("YahooPOPBETA.js - loginOnloadHandler - m_szLocationURI : "+mainObject.m_szLocationURI );
                    
                    mainObject.m_iStage++;
                    var szURI = mainObject.m_szLocationURI + "/" + mainObject.m_szWebserviceUrl + "?m=ListFolders&wssid="+mainObject.m_szWssid; 
                    mainObject.m_Log.Write("YahooPOPBETA.js - loginOnloadHandler - szURI " + szURI);
                    mainObject.m_HttpComms.setURI(szURI);
                    mainObject.m_HttpComms.setRequestMethod("POST");
                    mainObject.m_HttpComms.setContentType("application/xml");
                    mainObject.m_HttpComms.addData(kListFolders);
                    var bResult = mainObject.m_HttpComms.send(mainObject.loginOnloadHandler, mainObject);                             
                    if (!bResult) throw new Error("httpConnection returned false");
                break;
               
                case 3: //process folder list
                    var szFolderResponse = szResponse.match(kPatternFolderResponse)[1];
                    mainObject.m_Log.Write("YahooPOPBETA.js - loginOnloadHandler - szFolderResponse : "+szFolderResponse);
                    
                    var aszFolders = szFolderResponse.match(kPatternData);
                    mainObject.m_Log.Write("YahooPOPBETA.js - loginOnloadHandler - aszFolders : "+aszFolders);
                    
                    for (var i=0; i<mainObject.m_aszPrefFolderList.length; i++)
                    {
                        var regExp = new RegExp("^"+mainObject.m_aszPrefFolderList[i]+"$","i");
                        mainObject.m_Log.Write("YahooPOP.js - loginOnloadHandler - regExp : "+regExp );                       
                        
                        for (var j=0; j<aszFolders.length; j++)
                        {
                            var szBox = aszFolders[j].match(kPatternFolderName)[1];
                            mainObject.m_Log.Write("YahooPOP.js - loginOnloadHandler - szBox : "+szBox );
                            
                            if (szBox.search(regExp)!=-1)
                            {
                                mainObject.m_aszFolderList.push(szBox);
                                mainObject.m_Log.Write("YahooPOP.js - loginOnloadHandler - Found");
                            }
                        }
                    }
    
                    //server response
                    mainObject.serverComms("+OK Your in\r\n");
                    mainObject.m_bAuthorised = true;
                break;
                
                
                
                case 4: //download spam image
                    mainObject.m_aLoginForm = szResponse.match(patternYahooForm);
                    if ( mainObject.m_aLoginForm  == null)
                         throw new Error("error parsing yahoo login web page");
                    mainObject.m_Log.Write("YahooPOPBETA.js - loginOnloadHandler - loginForm Spam " +  mainObject.m_aLoginForm ); 

                    var szSpamURI = mainObject.m_aLoginForm[0].match(patternYahooSpanURI)[1];  
                    mainObject.m_Log.Write("YahooPOPBETA.js - loginOnloadHandler - szSpamURI " +  szSpamURI );
              
                    mainObject.m_HttpComms.setURI(szSpamURI);
                    mainObject.m_HttpComms.setRequestMethod("GET");
                    var bResult = mainObject.m_HttpComms.send(mainObject.loginOnloadHandler, mainObject);      
                    if (!bResult) throw new Error("httpConnection returned false");
                    mainObject.m_iStage++;
                break;
                
                
                
                case 5: //send login
                    mainObject.m_Log.Write("YahooPOPBETA.js - loginOnloadHandler - image download");
                    var szPath = mainObject.writeImageFile(szResponse);
                    mainObject.m_Log.Write("YahooPOPBETA.js - loginOnloadHandler - imageFile " + szPath);
                    var szResult =  mainObject.openSpamWindow(szPath); 
                    if (!szResult) throw new Error("Spam Handling Error");
                     
                    //construct form 
                    var szLoginURL = mainObject.m_aLoginForm[0].match(patternYahooAction)[1];
                    mainObject.m_Log.Write("YahooPOPBETA.js - loginOnloadHandler - loginURL " + szLoginURL);
                    
                    var aLoginData = mainObject.m_aLoginForm[0].match(patternYahooLogIn);
                    mainObject.m_Log.Write("YahooPOPBETA.js - loginOnloadHandler - loginData " + aLoginData);
                   
                    for (i=0; i<aLoginData.length; i++)
                    {
                        var szName=aLoginData[i].match(patternYahooNameAlt)[1];
                        szName = szName.replace(/["|']/gm,"");
                        szName = szName.replace(/^\s*|\s*$/gm,"");
                        mainObject.m_Log.Write("YahooPOPBETA.js - loginOnloadHandler - loginData name " + szName);
                        
                        var szValue = aLoginData[i].match(patternYahooAltValue)[1];
                        szValue = szValue.replace(/["|']/gm,"");
                        szValue = szValue.replace(/^\s*|\s*$/gm,"");
                        mainObject.m_Log.Write("nsYahoo.js - loginOnloadHandler - loginData value " + szValue);
                        
                        mainObject.m_HttpComms.addValuePair(szName,(szValue? encodeURIComponent(szValue):""));
                    }
                    
                    var szLogin = encodeURIComponent(mainObject.m_szLoginUserName);
                    mainObject.m_HttpComms.addValuePair("login", szLogin);
                    
                    var szPass = encodeURIComponent(mainObject.m_szPassWord);
                    mainObject.m_HttpComms.addValuePair("passwd",szPass);
                    
                    mainObject.m_HttpComms.addValuePair(".secword",szResult);
                    
                    mainObject.m_HttpComms.addValuePair(".persistent","y");
                                             
                    mainObject.m_HttpComms.setURI(szLoginURL);
                    mainObject.m_HttpComms.setRequestMethod("POST");
                    var bResult = mainObject.m_HttpComms.send(mainObject.loginOnloadHandler, mainObject);      
                    if (!bResult) throw new Error("httpConnection returned false");               
                    mainObject.m_iStage=1;
                break;
            };
                      
            mainObject.m_Log.Write("YahooPOPBETA.js - loginOnloadHandler - END");
        }
        catch(err)
        {
            mainObject.m_Log.DebugDump("YahooPOPBETA.js: loginHandler : Exception : " 
                                          + err.name 
                                          + ".\nError message: " 
                                          + err.message + "\n"
                                          + err.lineNumber);
                                
            mainObject.serverComms("-ERR negative vibes from "+ mainObject.m_szUserName +"\r\n");
        }
    },
    
        
    
    //stat 
    //total size is in octets
    getNumMessages : function()
    {
        try
        {
            this.m_Log.Write("YahooPOPBETA.js - getNumMessages - START");  
            if (this.m_aszFolderList.length==0) return false;
            
            this.mailBox(true);
            
            this.m_Log.Write("YahooPOPBETA.js - getNumMessages - END"); 
            return true;
        }
        catch(e)
        {
            this.m_Log.DebugDump("YahooPOPBETA.js: getNumMessages : Exception : " 
                                          + e.name 
                                          + ".\nError message: " 
                                          + e.message+ "\n"
                                          + e.lineNumber);
            return false;
        }
    },
    
    
    mailBox : function (bState)
    {
        this.m_Log.Write("YahooPOPBETA.js - mailBox - START");                
        
        var szFolderName = this.m_aszFolderList.shift();
        this.m_Log.Write("YahooPOPBETA.js - mailBox - szFolderName " + szFolderName); 
        var szData = kLstMsgs.replace(/folderName/,szFolderName);
         
        var szURI = this.m_szLocationURI + "/" + this.m_szWebserviceUrl + "?m=LstMsgs&wssid="+this.m_szWssid; 
        this.m_Log.Write("YahooPOPBETA.js - mailBox - szURI " + szURI);
        
        this.m_HttpComms.setURI(szURI);
        this.m_HttpComms.setRequestMethod("POST");
        this.m_HttpComms.setContentType("application/xml");
        this.m_HttpComms.addData(szData);
        var bResult = this.m_HttpComms.send(this.mailBoxOnloadHandler, this); 
        if (!bResult) throw new Error("httpConnection returned false");
        this.m_bStat = bState;
        
        this.m_Log.Write("YahooPOPBETA.js - mailBox - END");  
    },
    
    
    mailBoxOnloadHandler : function (szResponse ,event , mainObject)
    {
        try
        {
            mainObject.m_Log.Write("YahooPOPBETA.js - mailBoxOnloadHandler - START"); 
            //mainObject.m_Log.Write("YahooPOPBETA.js - mailBoxOnloadHandler : \n" + szResponse);
            mainObject.m_Log.Write("YahooPOPBETA.js - mailBoxOnloadHandler : " + mainObject.m_iStage);  
            
            var httpChannel = event.QueryInterface(Components.interfaces.nsIHttpChannel);
                      
            //check status should be 200.
            mainObject.m_Log.Write("YahooPOPBETA.js - mailBoxOnloadHandler - Mailbox :" + httpChannel.responseStatus);
            if (httpChannel.responseStatus != 200 ) 
                throw new Error("error status " + httpChannel.responseStatus);
            
            var aszResponses = szResponse.match(kPatternInfo);
            mainObject.m_Log.Write("YahooPOPBETA.js - mailBoxOnloadHandler - mailbox - " + aszResponses);
            if (aszResponses)
            {
                var aTemp = mainObject.m_aRawData.concat(aszResponses);
                delete mainObject.m_aRawData;
                mainObject.m_aRawData = aTemp;   
            }
            
            if (mainObject.m_aszFolderList.length>0) //load next folder
            {
                var szFolderName = mainObject.m_aszFolderList.shift();
                this.m_Log.Write("YahooPOPBETA.js - mailBoxOnloadHandler - szFolderName " + szFolderName); 
                var szData = kLstMsgs.replace(/folderName/,szFolderName);
                 
                var szURI = mainObject.m_szLocationURI + "/" + mainObject.m_szWebserviceUrl + "?m=LstMsgs&wssid="+mainObject.m_szWssid;
                mainObject.m_HttpComms.setURI(szURI);
                mainObject.m_HttpComms.setRequestMethod("POST");
                mainObject.m_HttpComms.setContentType("application/xml");
                mainObject.m_HttpComms.addData(szData);
                var bResult = mainObject.m_HttpComms.send(mainObject.mailBoxOnloadHandler, mainObject); 
                if (!bResult) throw new Error("httpConnection returned false");
            }
            else
            {   
                mainObject.m_Log.Write("YahooPOPBETA.js - mailBoxOnloadHandler - download complet e- starting delay");
                //start timer
                mainObject.m_Timer.initWithCallback(mainObject, 
                                                    mainObject.m_iTime, 
                                                    Components.interfaces.nsITimer.TYPE_REPEATING_SLACK);
            }
                        
            mainObject.m_Log.Write("YahooPOPBETA.js - MailBoxOnload - END"); 
        }
        catch(err)
        {
             mainObject.m_Log.DebugDump("YahooPOPBETA.js: MailboxOnload : Exception : " 
                                              + err.name 
                                              + ".\nError message: " 
                                              + err.message+ "\n"
                                              + err.lineNumber);
            
            mainObject.serverComms("-ERR negative vibes from "+ mainObject.m_szUserName +"\r\n");
        }   
    },
 
    
    
   

    notify : function(timer)
    {
        try
        {
            this.m_Log.Write("YahooPOPBETA.js - notify - START");

            if (this.m_aRawData.length>0)
            {   
                var iCount=0;
                do{
                    var Item = this.m_aRawData.shift();
                    this.processItem(Item);   
                    iCount++;
                    this.m_Log.Write("YahooPOPBETA.js - notify - rawData icount " + iCount + " " + this.m_aRawData.length);
                }while(iCount != this.m_iProcessAmount && this.m_aRawData.length!=0)

            }
            else
            {
                this.m_Log.Write("YahooPOPBETA.js - notify - all data handled"); 
                this.m_Timer.cancel();
                
                if (this.m_bStat) //called by stat
                {
                    //server response
                    this.serverComms("+OK "+ this.m_aMsgDataStore.length + " " + this.m_iTotalSize + "\r\n");
                }
                else //called by list
                {
                    this.serverComms("+OK " + this.m_aMsgDataStore.length + " Messages\r\n");
                    this.m_Log.Write("YahooPOPBETA.js - notify - : " + this.m_aMsgDataStore.length);
     
                    for (i = 0; i <  this.m_aMsgDataStore.length; i++)
                    {
                        var iEmailSize = this.m_aMsgDataStore[i].iSize; 
                        this.serverComms((i+1) + " " + iEmailSize + "\r\n");      
                    }         
                   
                    this.serverComms(".\r\n");
                }
                
                delete  this.m_aRawData;
            }
          
            this.m_Log.Write("YahooPOPBETA.js - notify - END"); 
        }
        catch(err)
        {
            this.m_Timer.cancel();
            this.m_Log.DebugDump("YahooPOPBETA.js: notify : Exception : " 
                                              + err.name 
                                              + ".\nError message: " 
                                              + err.message+ "\n"
                                              + err.lineNumber);
                                              
            this.serverComms("-ERR negative vibes from " +this.m_szUserName+ "\r\n");
        }
    },
    
    
    
    processItem : function (rawData)
    {
        this.m_Log.Write("YahooPOPBETA.js - processItem - START");
        this.m_Log.Write("YahooPOPBETA.js - processItem - rawData " +rawData);
        
        var bRead = true;
        if (this.m_bDownloadUnread)
        {
            bRead = parseInt(rawData.match(kPatternSeen)[1]) ? false : true;
            this.m_Log.Write("YahooPOPBETA.js - processItem - bRead -" + bRead);
        }
        
        if (bRead)
        {
            //mail url   
            var oMSG = new YahooMSG();
            
            //ID
            oMSG.szID =  rawData.match(kPatternID)[1];
            this.m_Log.Write("YahooPOPBETA.js - processItem - oMSG.szID -" + oMSG.szID);
            
            //size 
            oMSG.iSize = parseInt(rawData.match(kPatternSize)[1]);
            this.m_Log.Write("YahooPOPBETA.js - processItem - oMSG.iSize - "+ oMSG.iSize);
            this.m_iTotalSize += oMSG.iSize;
           
            //Folder 
            oMSG.szFolder = rawData.match(kPatternFolder)[1];
            this.m_Log.Write("YahooPOPBETA.js - processItem - oMSG.szFolder - "+ oMSG.szFolder);
                        
            this.m_aMsgDataStore.push(oMSG); 
        }
        
        this.m_Log.Write("YahooPOPBETA.js - processItem - END");
    },   
    



                     
    //list 
    getMessageSizes : function() 
    {
        try
        {
            this.m_Log.Write("YahooPOPBETA.js - getMessageSizes - START"); 
            
            if (this.m_bStat) 
            {  //msg table has been donwloaded
            
                this.m_Log.Write("YahooPOPBETA.js - getMessageSizes - getting sizes"); 
                var szPOPResponse = "+OK " + this.m_aMsgDataStore.length + " Messages\r\n"; 
                this.m_Log.Write("nsYahoo.js - getMessagesSizes - : " + this.m_aMsgDataStore.length);
     
                for (i = 0; i <  this.m_aMsgDataStore.length; i++)
                {
                    var iEmailSize = this.m_aMsgDataStore[i].iSize;
                    szPOPResponse+=(i+1) + " " + iEmailSize + "\r\n";       
                }         
        
                szPOPResponse += ".\r\n";
                
                this.serverComms(szPOPResponse);
            }
            else
            { //download msg list
                this.m_Log.Write("YahooPOPBETA.js - getMessageSizes - calling stat");
                this.mailBox(false);
            }
            this.m_Log.Write("YahooPOPBETA.js - getMessageSizes - END"); 
            return true;
        }
        catch(e)
        {
            this.m_Log.DebugDump("YahooPOPBETA.js: getMessageSizes : Exception : " 
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
            this.m_Log.Write("YahooPOPBETA.js - getMessageIDs - START"); 
    
            var szPOPResponse = "+OK " + this.m_aMsgDataStore.length + " Messages\r\n";
            this.m_Log.Write("YahooPOPBETA.js - getMessageIDs - return : " + this.m_aMsgDataStore.length ); 
                                                
            for (i = 0; i <  this.m_aMsgDataStore.length; i++)
            {
                var szID = this.m_aMsgDataStore[i].szID;
                this.m_Log.Write("YahooPOPBETA.js - getMessageIDs - IDS : " +szID);    
                szPOPResponse+=(i+1) + " " +szID + "\r\n";  
            }         
               
            szPOPResponse += ".\r\n";
            this.serverComms(szPOPResponse);           
          
            this.m_Log.Write("YahooPOPBETA.js - getMessageIDs - END"); 
            return true;
        }
        catch(e)
        {
            this.m_Log.DebugDump("YahooPOPBETA.js: getMessageIDs : Exception : " 
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
            this.m_Log.Write("YahooPOPBETA.js - getHeaders - START");  
            this.m_Log.Write("YahooPOPBETA.js - getHeaders - id " + lID ); 
           
            //get msg id
            var oMSGData = this.m_aMsgDataStore[lID-1]; 
            this.m_szMsgID = oMSGData.szID;  
            
            var szFolder = oMSGData.szFolder;
            if (oMSGData.szFolder.search(/%40B%40Bulk/i)!=-1) szFolder = "Bulk"; 
            this.m_szBox = szFolder;
            var szData = kMSGHeaders.replace(/MSGID/,oMSGData.szID).replace(/FOLDERNAME/,oMSGData.szFolder);
            this.m_Log.Write("YahooPOPBETA.js - getHeaders - szData " + szData);
             
            var szURI = this.m_szLocationURI + "/" + this.m_szWebserviceUrl + "?m=GetMessageRawHeader&wssid="+this.m_szWssid; 
            this.m_Log.Write("YahooPOPBETA.js - getHeaders - szURI " + szURI);
            
            this.m_HttpComms.setURI(szURI);
            this.m_HttpComms.setRequestMethod("POST");
            this.m_HttpComms.setContentType("application/xml");
            this.m_HttpComms.addData(szData);
            var bResult = this.m_HttpComms.send(this.headerOnloadHandler, this); 
            if (!bResult) throw new Error("httpConnection returned false");
              
            this.m_Log.Write("YahooPOPBETA.js - getHeaders - END");
            return true; 
        }
        catch(e)
        {
            
            this.m_Log.DebugDump("YahooPOPBETA.js: getHeaders : Exception : " 
                                          + e.name + 
                                          ".\nError message: " 
                                          + e.message+ "\n"
                                          + e.lineNumber);
            return false;
        }
    },



    headerOnloadHandler : function (szResponse ,event , mainObject)
    {
        try
        {
            mainObject.m_Log.Write("YahooPOPBETA.js - headerOnloadHandler - START");
            //mainObject.m_Log.Write("YahooPOPBETA.js - headerOnloadHandler - msg :\n" + szResponse); 
           
            var httpChannel = event.QueryInterface(Components.interfaces.nsIHttpChannel);
                      
            //check status should be 200.
            mainObject.m_Log.Write("YahooPOPBETA.js - headerOnloadHandler - msg :" + httpChannel.responseStatus);
            if (httpChannel.responseStatus != 200) 
                throw new Error("error status " + httpChannel.responseStatus);   
                    
            var szHeader = szResponse.match(kPatternHeader)[1];   
            szHeader= mainObject.cleanHTML(szHeader);             
            mainObject.m_Log.Write("YahooPOPBETA.js - headerOnloadHandler - szHeader : " + szHeader);
            
            var szHeaderTemp  = "X-WebMail: true\r\n";
            szHeaderTemp += "X-Folder: " +mainObject.m_szBox+ "\r\n";
            szHeaderTemp += szHeader; 
            mainObject.m_szHeader = szHeaderTemp.replace(/^\./mg,"..");    //bit padding 
            mainObject.m_szHeader += ".\r\n";//msg end  
            
            //this.m_szMsgID   
            //this.m_szBox  
            var szServerResponse = "+OK " +mainObject.m_szHeader.length + "\r\n";
            szServerResponse += mainObject.m_szHeader;
            mainObject.serverComms(szServerResponse);
            mainObject.m_Log.Write("YahooPOPBETA.js - headerOnloadHandler - END");      
        }
        catch(err)
        {
            mainObject.m_Log.DebugDump("YahooPOPBETA.js: headerOnloadHandler : Exception : " 
                                          + err.name 
                                          + ".\nError message: " 
                                          + err.message+ "\n"
                                          + err.lineNumber);
            
            mainObject.serverComms("-ERR negative vibes from "+ mainObject.m_szUserName +"\r\n");
        }
    },
    



    //retr
    getMessage : function( lID)
    {
        try
        {
            this.m_Log.Write("YahooPOPBETA.js - getMessage - START"); 
            this.m_Log.Write("YahooPOPBETA.js - getMessage - msg num" + lID); 
            
            if (this.m_oEmail) delete this.m_oEmail;
            this.m_oEmail = new emailBuilder();
            
            //get msg id
            var oMSGData = this.m_aMsgDataStore[lID-1]
            this.m_szMsgID = oMSGData.szID;  
            var szFolder = oMSGData.szFolder;
            if (oMSGData.szFolder.search(/%40B%40Bulk/i)!=-1) szFolder = "Bulk"; 
            this.m_szBox = szFolder;
            this.m_Log.Write("YahooPOPBETA.js - getMessage - msg id" + this.m_szMsgID + " Folder " + this.m_szBox); 
            
            var szData = kMSGHeaders.replace(/MSGID/,oMSGData.szID).replace(/FOLDERNAME/,oMSGData.szFolder);
            this.m_Log.Write("YahooPOPBETA.js - getMessage - szData " + szData);
             
            var szURI = this.m_szLocationURI + "/" + this.m_szWebserviceUrl + "?m=GetMessageRawHeader&wssid="+this.m_szWssid; 
            this.m_Log.Write("YahooPOPBETA.js - getMessage - szURI " + szURI);
            
            this.m_HttpComms.setURI(szURI);
            this.m_HttpComms.setRequestMethod("POST");
            this.m_HttpComms.setContentType("application/xml");
            this.m_HttpComms.addData(szData);
            var bResult = this.m_HttpComms.send(this.emailOnloadHandler, this); 
            if (!bResult) throw new Error("httpConnection returned false");
            this.m_iStage = 0;
            
            this.m_Log.Write("YahooPOPBETA.js - getMessage - END"); 
            return true;
        }
        catch(e)
        {
             this.m_Log.DebugDump("YahooPOPBETA.js: getMessage : Exception : " 
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
            mainObject.m_Log.Write("YahooPOPBETA.js - emailOnloadHandler - START");
           // mainObject.m_Log.Write("YahooPOPBETA.js - emailOnloadHandler : \n" + szResponse);          
            var httpChannel = event.QueryInterface(Components.interfaces.nsIHttpChannel);
                      
            //check status should be 200.
            mainObject.m_Log.Write("YahooPOPBETA.js - emailOnloadHandler - msg :" + httpChannel.responseStatus);
            if (httpChannel.responseStatus != 200) 
                throw new Error("error status " + httpChannel.responseStatus);   
            
            var szUri = httpChannel.URI.spec;
            mainObject.m_Log.Write("YahooPOPBETA.js - emailOnloadHandler - uri : " + szUri);
            
            switch(mainObject.m_iStage)
            {
                case 0: // headers
                    mainObject.m_Log.Write("YahooPOPBETA.js - emailOnloadHandler - headers");
                    if (szResponse.search(kPatternLstHeadersResponse)==-1)
                        throw new Error("Error Parsing Headers");
                        
                    var szHeader = szResponse.match(kPatternHeader)[1];   
                    szHeader= mainObject.cleanHTML(szHeader);             
                                        
                    var szHeaderTemp  = "X-WebMail: true\r\n";
                    szHeaderTemp += "X-Folder: " +mainObject.m_szBox+ "\r\n";
                    szHeaderTemp += szHeader; 
                    mainObject.m_oEmail.setEnvolpeHeaders(szHeaderTemp);
                    
                    var szURI = mainObject.m_szLocationURI + "/" + mainObject.m_szWebserviceUrl + "?m=GetMessageBodyPart&wssid="+mainObject.m_szWssid;
                    mainObject.m_Log.Write("YahooPOPBETA.js - emailOnloadHandler - szURI "+szURI);
                    
                    mainObject.m_HttpComms.setURI(szURI);
                    mainObject.m_HttpComms.setRequestMethod("POST");
                    mainObject.m_HttpComms.setContentType("application/xml");
                    var szData = kMSG.replace(/MSGID/,mainObject.m_szMsgID).replace(/FOLDERNAME/,mainObject.m_szBox);
                    mainObject.m_Log.Write("YahooPOPBETA.js - emailOnloadHandler - szData "+szData);
                    mainObject.m_HttpComms.addData(szData);
                    var bResult = mainObject.m_HttpComms.send(mainObject.emailOnloadHandler, mainObject); 
                    if (!bResult) throw new Error("httpConnection returned false");
                    mainObject.m_iStage++;
                break;
                
                case 1: // body
                    mainObject.m_Log.Write("YahooPOPBETA.js - emailOnloadHandler - body");
                    if (szResponse.search(kPatternLstBodyPartResponse)==-1)
                        throw new Error("Error Parsing Body");
                    
                    var aszParts = szResponse.match(kPatternPart);
                    mainObject.m_Log.Write("YahooPOPBETA.js - emailOnloadHandler - aszParts : " + aszParts);
                      
                    //remove the first item this is the headers and they have already been downloaded
                    var aszHeaderPart = aszParts.shift();
                    delete aszHeaderPart;
                    var i=0;
                    var iLength = aszParts.length;               
                    do{
                        var szData = aszParts.shift();
                        mainObject.m_Log.Write("YahooPOPBETA.js - emailOnloadHandler - aszParts[i] : " + szData);
                        var szPartID = szData.match(kPatternPartID)[1];
                       
                        var szType = szData.match(kPatternPartType)[1];
                        mainObject.m_Log.Write("YahooPOPBETA.js - emailOnloadHandler - szType : " + szType);
                       
                        
                        if(szType.search(/text/i)!=-1)
                        {  //process text/htlm message part 
                            mainObject.m_Log.Write("YahooPOPBETA.js - emailOnloadHandler -  Text part");
                            //proces headers
                            var szHeader = null;
                            if(szData.search(kPatternPartTypeParams)!=-1)
                            {
                                mainObject.m_Log.Write("YahooPOPBETA.js - emailOnloadHandler - params found");
                                var szSubType = szData.match(kPatternPartSubType)[1];
                                var szTypeParams = szData.match(kPatternPartTypeParams)[1]; 
                                var szSubType = szData.match(kPatternPartSubType)[1];   
                                
                                szHeader = "Content-Type: "+szType+"/"+szSubType+"; " +szTypeParams + "\r\n";
                                szHeader += "Content-Transfer-Encoding: 7bit\r\n";
                                if (szData.search(kPatternPartDispParam)!=-1)
                                {
                                    var szDispParam = szData.match(kPatternPartDispParam)[1];
                                    if (szDispParam.search(/filename=/i)!=-1) 
                                    {
                                        var szFileName = szDispParam.match(kPatternFileName)[1];
                                        szHeader += "Content-Disposition: attachment; fileName=\"" +szFileName + "\"\r\n\r\n";
                                    }
                                }
                                szHeader += "\r\n\r\n";
                                
                                mainObject.m_Log.Write("YahooPOPBETA.js - emailOnloadHandler - szHeader : " + szHeader);
                            }
                            
                            //get text
                            var szText = szData.match(kPatternPartText)[1];
                            szText= mainObject.cleanHTML(szText);
                            mainObject.m_Log.Write("YahooPOPBETA.js - emailOnloadHandler - szText : " + szText);                        
                            mainObject.m_oEmail.addBody(szHeader,szText);
                        }
                        else if (szData.search(kPatternPartDispParam)!=-1)
                        {
                            var szDispParam = szData.match(kPatternPartDispParam)[1];
                            mainObject.m_Log.Write("YahooPOPBETA.js - emailOnloadHandler -  szDispParam " +szDispParam);
                            if (szDispParam.search(/filename=/i)!=-1)
                            {
                                mainObject.m_Log.Write("YahooPOPBETA.js - emailOnloadHandler -  need to download file attachment");
                                mainObject.m_aDownloadFiles.push(szData);
                            }
                        }
                        i++;
                    }while(i!=iLength);
                    
                    if (mainObject.m_aDownloadFiles.length==0) //no files
                    {
                        var szURI = mainObject.m_szLocationURI + "/" + mainObject.m_szWebserviceUrl + "?m=SetMessageFlag&wssid=" + mainObject.m_szWssid;
                        mainObject.m_Log.Write("YahooPOPBETA.js - emailOnloadHandler - szURI " +szURI);
                        
                        mainObject.m_HttpComms.setURI(szURI);
                        mainObject.m_HttpComms.setRequestMethod("POST");
                        mainObject.m_HttpComms.setContentType("application/xml");
                        var szData = kSeen.replace(/MSGID/,mainObject.m_szMsgID).replace(/FOLDERNAME/,mainObject.m_szBox);
                        mainObject.m_Log.Write("YahooPOPBETA.js - emailOnloadHandler - szData " +szData);
                        mainObject.m_HttpComms.addData(szData);
                        var bResult = mainObject.m_HttpComms.send(mainObject.emailOnloadHandler, mainObject); 
                        if (!bResult) throw new Error("httpConnection returned false");
                        mainObject.m_iStage = 2;
                    }  
                    else
                    {   //download first file
                        //Borrowed this URI from freepops
                        var szURI = mainObject.m_szLocationURI + "/ym/cgdownload/?"
                        szURI += "box=" + mainObject.m_szBox;
                        szURI += "&MsgId=" + mainObject.m_szMsgID;
                        szURI += "&bodyPart=" +mainObject.m_aDownloadFiles[0].match(kPatternPartId)[1];
                        szURI += "&download=1"
                        mainObject.m_Log.Write("YahooPOPBETA.js - emailOnloadHandler - szURI " +szURI);
                        
                        mainObject.m_HttpComms.setURI(szURI);
                        mainObject.m_HttpComms.setRequestMethod("GET");                        
                        var bResult = mainObject.m_HttpComms.send(mainObject.emailOnloadHandler, mainObject); 
                        if (!bResult) throw new Error("httpConnection returned false");
                        mainObject.m_iStage = 3;
                    }
                break;
                
                case 2:// MSG marked as seen
                    mainObject.m_Log.Write("YahooPOPBETA.js - emailOnloadHandler - SEEN");
                    var szMSG = mainObject.m_oEmail.build();
                    szMSG = szMSG.replace(/^\./mg,"..");    //bit padding 
                    szMSG += "\r\n.\r\n";  //msg end 
                                                                                                                      
                    var szPOPResponse = "+OK " + szMSG.length + "\r\n";                     
                    szPOPResponse += szMSG;                          
                    mainObject.serverComms(szPOPResponse);     
                break;
                
                case 3:  //download files
                    mainObject.m_Log.Write("YahooPOPBETA.js - emailOnloadHandler - Attachments");
                    
                    var szPart = mainObject.m_aDownloadFiles.shift();
                    mainObject.m_Log.Write("YahooPOPBETA.js - emailOnloadHandler - szPart : " + szPart);
 
                    //headers
                    var szName = szPart.match(kPatternPartTypeParams)[1];
                    var szDispParam = szPart.match(kPatternPartDispParam)[1];                
                    var szFileName = szDispParam.match(kPatternFileName)[1];
                                 
                    var szHeader = "Content-Type: application/octet-stream; " +szName + "\r\n";
                    szHeader += "Content-Transfer-Encoding: base64\r\n";
                    szHeader += "Content-Disposition: attachment; fileName=\"" +szFileName + "\"\r\n\r\n";
                    mainObject.m_Log.Write("YahooPOPBETA.js - emailOnloadHandler - szHeader : " + szHeader);
                    
                    //base64 file
                    var oB64 = new base64();
                    oB64.bLineBreak = true;
                    var szB64Response = oB64.encode(szResponse);
                    mainObject.m_oEmail.addBody(szHeader,szB64Response);
                    
                    if (mainObject.m_aDownloadFiles.length==0) //no files
                    {
                        var szURI = mainObject.m_szLocationURI + "/" + mainObject.m_szWebserviceUrl + "?m=SetMessageFlag&wssid=" + mainObject.m_szWssid;
                        mainObject.m_Log.Write("YahooPOPBETA.js - emailOnloadHandler - szURI " +szURI);
                        
                        mainObject.m_HttpComms.setURI(szURI);
                        mainObject.m_HttpComms.setRequestMethod("POST");
                        mainObject.m_HttpComms.setContentType("application/xml");
                        var szData = kSeen.replace(/MSGID/,mainObject.m_szMsgID).replace(/FOLDERNAME/,mainObject.m_szBox);
                        mainObject.m_Log.Write("YahooPOPBETA.js - emailOnloadHandler - szData " +szData);
                        mainObject.m_HttpComms.addData(szData);
                        var bResult = mainObject.m_HttpComms.send(mainObject.emailOnloadHandler, mainObject); 
                        if (!bResult) throw new Error("httpConnection returned false");
                        mainObject.m_iStage = 2;
                    }  
                    else
                    {   //download first file
                        //Borrowed this URI from freepops
                        var szURI = mainObject.m_szLocationURI + "/ym/cgdownload/?"
                        szURI += "box=" + mainObject.m_szBox;
                        szURI += "&MsgId=" + mainObject.m_szMsgID;
                        szURI += "&bodyPart=" +mainObject.m_aDownloadFiles[0].match(kPatternPartId)[1];
                        szURI += "&download=1"
                        mainObject.m_Log.Write("YahooPOPBETA.js - emailOnloadHandler - szURI " +szURI);
                        
                        mainObject.m_HttpComms.setURI(szURI);
                        mainObject.m_HttpComms.setRequestMethod("GET");                        
                        var bResult = mainObject.m_HttpComms.send(mainObject.emailOnloadHandler, mainObject); 
                        if (!bResult) throw new Error("httpConnection returned false");
                        mainObject.m_iStage = 3;
                    }
                break;
            }
           
            mainObject.m_Log.Write("YahooPOPBETA.js - emailOnloadHandler - END");      
        }
        catch(err)
        {
            mainObject.m_Log.DebugDump("YahooPOPBETA.js: emailOnloadHandler : Exception : " 
                                          + err.name 
                                          + ".\nError message: " 
                                          + err.message+ "\n"
                                          + err.lineNumber);
            
            mainObject.serverComms("-ERR negative vibes from "+ mainObject.m_szUserName +"\r\n");
        }
    },
    
    
             
    //dele
    deleteMessage : function(lID)
    {
        try
        {
            this.m_Log.Write("YahooPOPBETA.js - deleteMessage - START");  
            this.m_Log.Write("YahooPOPBETA.js - deleteMessage - id " + lID ); 
                  
            //create URL
            var oMSGData = this.m_aMsgDataStore[lID-1];
       
            var szURI = this.m_szLocationURI + "/" + this.m_szWebserviceUrl;
            szURI += "?m=MoveMsgs&src="+oMSGData.szFolder+"&dst=Trash&count=1&wssid="+this.m_szWssid;
            this.m_Log.Write("YahooPOPBETA.js - deleteMessage - szURI " +szURI);
            
            this.m_HttpComms.setURI(szURI);
            this.m_HttpComms.setRequestMethod("POST");
            this.m_HttpComms.setContentType("application/xml");
            var szData = kDelete.replace(/MSGID/,oMSGData.szID).replace(/FOLDERNAME/,oMSGData.szFolder);
            this.m_Log.Write("YahooPOPBETA.js - deleteMessage - szData " +szData);
            this.m_HttpComms.addData(szData);
            var bResult = this.m_HttpComms.send(this.deleteMessageOnloadHandler, this); 
            if (!bResult) throw new Error("httpConnection returned false");
            
            this.m_Log.Write("YahooPOPBETA.js - deleteMessage - END");     
            return true;
        }
        catch(e)
        {
            this.m_Log.DebugDump("YahooPOPBETA.js: deleteMessage : Exception : " 
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
            mainObject.m_Log.Write("YahooPOPBETA.js - deleteMessageOnload - START");    
           // mainObject.m_Log.Write("YahooPOPBETA.js - deleteMessageOnload : \n" + szResponse);
            var httpChannel = event.QueryInterface(Components.interfaces.nsIHttpChannel);
            
            //check status should be 200.
            mainObject.m_Log.Write("YahooPOPBETA.js - deleteMessageOnload :" + httpChannel.responseStatus);
            if (httpChannel.responseStatus != 200 ) 
                throw new Error("error status " + httpChannel.responseStatus);   
            
            if (szResponse.search(kPatternDeleteMSGResponse)==-1) throw new Error ("Delete Failed");
                 
            mainObject.serverComms("+OK its history\r\n");      
            mainObject.m_Log.Write("YahooPOPBETA.js - deleteMessageOnload - END");      
        }
        catch(e)
        {
            mainObject.m_Log.DebugDump("YahooPOPBETA.js: deleteMessageOnload : Exception : " 
                                              + e.name 
                                              + ".\nError message: " 
                                              + e.message+ "\n"
                                              + e.lineNumber);
            mainObject.serverComms("-ERR negative vibes from "+ mainObject.m_szUserName +"\r\n");
        }
    },
    


    //cookies are deleted when the connection ends so i dont need to download pages
    logOut : function()
    {
        try
        {
            this.m_Log.Write("YahooPOPBETA.js - logOUT - START"); 
                  
            if (this.m_bReUseSession)
            { 
                this.m_Log.Write("YahooPOPBETA.js - logOut - Setting Session Data");  
                    
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
                                           
            this.m_Log.Write("YahooPOPBETA.js - logOUT - END");  
            return true;
        }
        catch(e)
        {
            this.m_Log.DebugDump("YahooPOPBETA.js: logOUT : Exception : " 
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
            this.m_Log.Write("YahooPOPBETA.js - serverComms msg " + szMsg);
            var iCount = this.m_oResponseStream.write(szMsg,szMsg.length);
            this.m_Log.Write("YahooPOPBETA.js - serverComms sent count: " + iCount +" msg length: " +szMsg.length);  
        }
        catch(e)
        {
            this.m_Log.DebugDump("YahooPOPBETA.js: serverComms : Exception : " 
                                              + e.name 
                                              + ".\nError message: " 
                                              + e.message+ "\n"
                                              + e.lineNumber);
        }
    },
   
   
   
   
    writeImageFile : function(szData)
    {
        try
        {
            this.m_Log.Write("YahooPOPBETA.js - writeImageFile - End");
            
            var file = Components.classes["@mozilla.org/file/directory_service;1"];
            file = file.getService(Components.interfaces.nsIProperties);
            file = file.get("TmpD", Components.interfaces.nsIFile);
            file.append("suggestedName.jpg");
            file.createUnique(Components.interfaces.nsIFile.NORMAL_FILE_TYPE, 420); 
           
            var deletefile = Components.classes["@mozilla.org/uriloader/external-helper-app-service;1"];
            deletefile = deletefile.getService(Components.interfaces.nsPIExternalAppLauncher);
            deletefile.deleteTemporaryFileOnExit(file);    
            
            var outputStream = Components.classes["@mozilla.org/network/file-output-stream;1"];
            outputStream = outputStream.createInstance( Components.interfaces.nsIFileOutputStream );
            outputStream.init( file, 0x04 | 0x08 | 0x10, 420, 0 );
            
            var binaryStream = Components.classes["@mozilla.org/binaryoutputstream;1"];
            binaryStream = binaryStream.createInstance(Components.interfaces.nsIBinaryOutputStream);
            binaryStream.setOutputStream(outputStream)
            binaryStream.writeBytes( szData, szData.length );
            outputStream.close();
            binaryStream.close();
                       
            var ios = Components.classes["@mozilla.org/network/io-service;1"]
                                .getService(Components.interfaces.nsIIOService);
            var fileHandler = ios.getProtocolHandler("file")
                                 .QueryInterface(Components.interfaces.nsIFileProtocolHandler);
            var URL = fileHandler.getURLSpecFromFile(file);
            this.m_Log.Write("nsYahoo.js - writeImageFile - path " + URL);
            
            this.m_Log.Write("nsYahoo.js - writeImageFile - End");
            return URL;
        }
        catch(err)
        {
            this.m_Log.DebugDump("YahooPOPBETA.js: writeImageFile : Exception : " 
                                                  + err.name 
                                                  + ".\nError message: " 
                                                  + err.message + "\n"
                                                  + err.lineNumber);
                                                  
            return null;
        }
    },
    
    
    
    
    openSpamWindow : function(szPath)
    {
        try
        {
            this.m_Log.Write("YahooPOPBETA : openWindow - START");
            
            var params = Components.classes["@mozilla.org/embedcomp/dialogparam;1"]
                                   .createInstance(Components.interfaces.nsIDialogParamBlock);
            params.SetNumberStrings(1);
            params.SetString(0, szPath);           
                      
            var window = Components.classes["@mozilla.org/embedcomp/window-watcher;1"]
                                  .getService(Components.interfaces.nsIWindowWatcher);
            
            window.openWindow(null, 
                              "chrome://yahoo/content/Yahoo-SpamImage.xul",
                              "_blank", 
                              "chrome,alwaysRaised,dialog,modal,centerscreen,resizable",
                              params);
           
            var iResult = params.GetInt(0);
            this.m_Log.Write("YahooPOPBETA : openWindow - " + iResult);
            var szResult =  null;
            if (iResult) 
            {
                szResult = params.GetString(0);
                this.m_Log.Write("YahooPOPBETA : openWindow - " + szResult);
            }
            
            this.m_Log.Write("YahooPOPBETA : openWindow - END");
            return szResult;
        }
        catch(err)
        {
            this.m_Log.DebugDump("YahooPOPBETA: Exception in openWindow : " 
                                               + err.name 
                                               + ".\nError message: " 
                                               + err.message + "\n"
                                               + err.lineNumber);
        }
    },
    
    
    
    
    cleanHTML : function (szRaw)
    {
        this.m_Log.Write("YahooPOPBETA - cleanHTML - START");
        var szMsg = szRaw.replace(/&lt;/g,"<");
        szMsg = szMsg.replace(/&gt;/g,">");
        szMsg = szMsg.replace(/&quot;/g, "\"");
        szMsg = szMsg.replace(/&amp;/g, "&");
        szMsg = szMsg.replace(/&nbsp;/g, " ");   
        szMsg = szMsg.replace(/&#xA;/g,"\n");  
        szMsg = szMsg.replace(/&#xD;/g,"\r");
        return szMsg;
    },
}
