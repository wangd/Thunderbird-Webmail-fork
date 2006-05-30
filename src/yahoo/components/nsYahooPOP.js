/*****************************  Globals   *************************************/                 
const nsYahooClassID = Components.ID("{bfacf8a0-6447-11d9-9669-0800200c9a66}");
const nsYahooContactID = "@mozilla.org/YahooPOP;1";
const ExtYahooGuid = "{d7103710-6112-11d9-9669-0800200c9a66}";

const patternYahooSecure = /<a href="(.*?https.*?login.*?)".*?>/;
const patternYahooForm = /<form.*?name="login_form".*?>[\S\s]*?<\/form>/gm;
const patternYahooAction = /<form.*?action="(.*?)".*?>/;
const patternYahooLogIn = /<input.*?type=['|"]*hidden['|"]*.*?name=.*?value=.*?>/gm;
const patternYahooNameAlt = /name=['|"]*([\S]*)['|"]*/;
const patternYahooAltValue = /value=['|"]*([\S\s]*)['|"]*[\s]*>/;
const patternYahooRedirect = /<a href=['|"]*(.*?)['|"]*>/; 
const patternYahooMSGIdTable = /<table id="datatable".*?>[\S\s]*?<\/table>/m;
const patternYahooMsgRow = /<tr.*?>[\S\s]*?<\/tr>/gm;
const patternYahooMsgID = /href="(.*?MsgId.*?)"/;
const patternYahooMsgSize = /<td.*?>.*?<\/td>/gm;
const patternYahooNextPage = /<a href=".*?next=1.*?">/m;
const patternYahooNextURI = /<a href=["|']*(.*?)["|']*>/
const PatternYahooID =/MsgId=(.*?)&/;
const PatternYahooDeleteForm = /<form name=messageList.*?>[\S\s]*?<\/form>/;
const PatternYahooDeleteURL = /action="(.*?)"/;
const PatternYahooDeleteInput = /<input.*?hidden.*?>/gm;
const PatternYahooBox =/(box=.*?)#/;
const PatternYahooBoxAlt =/(box=.*?)$/;
const PatternYahooUnRead = /msgnew/;
const PatternYahooFolders = /".*?ShowFolder\?box=.*?"/gim;
const PatternYahooFoldersPart = /"(.*?ShowFolder\?box=.*?)"/gim;
const PatternYahooFolderURL =/'(.*?Folders\?YY.*?)'"/i;
const PatternYahooFolderBox = /box=(.*?)&/i;
const PatternYahooFolderBoxAlt = /box=(.*?)$/i;
const PatternYahooLogout = /id="signoutlink"/i;
/******************************  Yahoo ***************************************/




function nsYahoo()
{
    try
    {       
        var scriptLoader =  Components.classes["@mozilla.org/moz/jssubscript-loader;1"];
        scriptLoader = scriptLoader.getService(Components.interfaces.mozIJSSubScriptLoader);
        scriptLoader.loadSubScript("chrome://web-mail/content/common/DebugLog.js");
        scriptLoader.loadSubScript("chrome://web-mail/content/common/CommonPrefs.js");
        scriptLoader.loadSubScript("chrome://web-mail/content/common/HttpComms2.js");
        scriptLoader.loadSubScript("chrome://yahoo/content/YahooMSG.js");
        scriptLoader.loadSubScript("chrome://web-mail/content/common/Header.js");
              
        var date = new Date();
        var  szLogFileName = "Yahoo Log - " + date.getHours()+ "-" + date.getMinutes() + "-"+ date.getUTCMilliseconds() +" -";
        this.m_Log = new DebugLog("webmail.logging.comms", ExtYahooGuid, szLogFileName); 
        
        this.m_Log.Write("nsYahoo.js - Constructor - START");   
       
        this.m_bAuthorised = false;
        this.m_szUserName = null;   
        this.m_szPassWord = null; 
        this.m_oResponseStream = null;  
        this.m_HttpComms = new HttpComms();
        this.m_iStage = 0; 
        this.m_szLocationURI = null;     
        this.m_szMailboxURI = null;
        this.m_szBulkFolderURI = null;
        this.m_szDeleteURL = null; 
        this.m_szHomeURI = null;
        this.m_szYahooMail = null;
        this.m_szLoginUserName = null;
        
        this.m_bJunkChecked = false;
        this.m_aMsgDataStore = new Array();
        this.m_aDeleteData = new Array();
        this.m_iTotalSize = 0;
        this.m_szHeader = null;  
        this.m_iMSGCount = 0;  
        this.m_szMsgID = null;  
        this.m_szBox = null;
        this.m_bJunkFolder = false;
        this.m_iID =0;
        this.m_aszFolderList = new Array(); 
        this.m_aszFolderURLList = new Array();
        
        this.m_ComponentManager = Components.classes["@mozilla.org/nsComponentData2;1"];
        this.m_ComponentManager = this.m_ComponentManager.getService(Components.interfaces.nsIComponentData2);
        
        this.m_bReEntry = false;
        this.m_bStat = false;

        //do i reuse the session
        var oPref = {Value:null};
        var  WebMailPrefAccess = new WebMailCommonPrefAccess();
        if (WebMailPrefAccess.Get("bool","yahoo.bReUseSession",oPref))
            this.m_bReUseSession=oPref.Value;
        else
            this.m_bReUseSession=true; 
                
                                                         
        this.m_Log.Write("nsYahoo.js - Constructor - END");  
    }
    catch(e)
    {
        DebugDump("nsYahoo.js: Constructor : Exception : " 
                                      + e.name 
                                      + ".\nError message: " 
                                      + e.message+ "\n"
                                      + e.lineNumber);
    }
}



nsYahoo.prototype =
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
            this.m_Log.Write("nsYahoo.js - logIN - START");   
            this.m_Log.Write("nsYahoo.js - logIN - Username: " + this.m_szUserName 
                                                   + " Password: " + this.m_szPassWord 
                                                   + " stream: " + this.m_oResponseStream);
            
            if (!this.m_szUserName || !this.m_oResponseStream  || !this.m_szPassWord) return false;        
                       
            //get prefs
            this.loadPrefs();
             
            if (this.m_szUserName.search(/yahoo/i)!=-1)   
            { //remove domain from user name  
                this.m_szYahooMail = "http://mail.yahoo.com";
                this.m_szLoginUserName = this.m_szUserName.match(/(.*?)@/)[1].toLowerCase();
            }  
            else if (this.m_szUserName.search(/@talk21.com$/i)!=-1 ||  
                     this.m_szUserName.search(/@btinternet.com$/i)!=-1  ||
                     this.m_szUserName.search(/@btopenworld.com$/i)!=-1 )
            {//include domain 
                this.m_szYahooMail = "http://bt.yahoo.com/";
                this.m_szLoginUserName = this.m_szUserName;
            }    
            else
            {//include domain in user name
                this.m_szYahooMail = "http://mail.yahoo.com";
                this.m_szLoginUserName = this.m_szUserName;
            } 
            
            this.m_HttpComms.setUserName(this.m_szUserName);
            
            this.m_Log.Write("nsYahoo.js - logIN - default " +this.m_szYahooMail);
            this.m_iStage = 0;
            this.m_HttpComms.setURI(this.m_szYahooMail);  
            
            //get session data
            if (this.m_bReUseSession)
            { 
                this.m_Log.Write("nsYahoo.js - logIN - Getting Session Data");           
                this.m_szHomeURI = this.m_ComponentManager.findElement(this.m_szUserName, "szHomeURI");
                this.m_Log.Write("nsYahoo.js - logIN - szHomeURI " +this.m_szHomeURI);    
                if (this.m_szHomeURI)
                {
                    this.m_Log.Write("nsYahoo.js - logIN - Session Data Found"); 
                    this.m_iStage =2;
                    this.m_bReEntry = true;
                    this.m_HttpComms.setURI(this.m_szHomeURI);
                }
            }
           
            this.m_HttpComms.setRequestMethod("GET");
            var bResult = this.m_HttpComms.send(this.loginOnloadHandler, this);                             
            if (!bResult) throw new Error("httpConnection returned false");
            this.m_Log.Write("nsYahoo.js - logIN - END");    
            return true;
        }
        catch(e)
        {
            this.m_Log.DebugDump("nsYahoo.js: logIN : Exception : " 
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
            mainObject.m_Log.Write("nsYahoo.js - loginOnloadHandler - START"); 
            mainObject.m_Log.Write("nsYahoo.js - loginOnloadHandler : \n" + szResponse);
            mainObject.m_Log.Write("nsYahoo.js - loginOnloadHandler : Stage" + mainObject.m_iStage);  
            
            var httpChannel = event.QueryInterface(Components.interfaces.nsIHttpChannel);     
            //if this fails we've gone somewhere new
            mainObject.m_Log.Write("nsYahoo.js - loginOnloadHandler - status :" +httpChannel.responseStatus );
            if (httpChannel.responseStatus != 200) 
                throw new Error("return status " + httpChannel.responseStatus);
                            
            //page code                                
            switch (mainObject.m_iStage)
            {
                case 0: // login page               
                    var aLoginForm = szResponse.match(patternYahooForm);
                    if (aLoginForm == null)
                         throw new Error("error parsing yahoo login web page");
                    mainObject.m_Log.Write("nsYahoo.js - loginOnloadHandler - loginForm " + aLoginForm);
                    
                    var szLoginURL = aLoginForm[0].match(patternYahooAction)[1];
                    mainObject.m_Log.Write("nsYahoo.js - loginOnloadHandler - loginURL " + szLoginURL);
                    
                    var aLoginData = aLoginForm[0].match(patternYahooLogIn);
                    mainObject.m_Log.Write("nsYahoo.js - loginOnloadHandler - loginData " + aLoginData);
                   
                    for (i=0; i<aLoginData.length; i++)
                    {
                        var szName=aLoginData[i].match(patternYahooNameAlt)[1];
                        szName = szName.replace(/["|']/gm,"");
                        szName = szName.replace(/^\s*|\s*$/gm,"");
                        mainObject.m_Log.Write("nsYahoo.js - loginOnloadHandler - loginData name " + szName);
                        
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
                   
                    mainObject.m_HttpComms.addValuePair(".save","Sign+In");  
                                      
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
                    mainObject.m_Log.Write("nsYahoo.js - loginOnloadHandler - login redirect " + aLoginRedirect);
                      
                    var szLocation = aLoginRedirect[1];
                
                    mainObject.m_HttpComms.setURI(szLocation);
                    mainObject.m_HttpComms.setRequestMethod("GET");
                    var bResult = mainObject.m_HttpComms.send(mainObject.loginOnloadHandler, mainObject);
                    if (!bResult) throw new Error("httpConnection returned false");
                    mainObject.m_iStage++;
                break;
            
                case 2: //mail box
                    var szLocation  = httpChannel.URI.spec;
                    mainObject.m_Log.Write("nsYahoo.js - loginOnloadHandler - page check : " + szLocation );
                    if (szResponse.search(PatternYahooLogout)== -1)
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
                                    
                    //get urls for later use
                    mainObject.m_szLocationURI = httpChannel.URI.prePath ;
                    mainObject.m_Log.Write("nsYahoo.js - loginOnloadHandler - m_szLocationURI : "+mainObject.m_szLocationURI );
                    
                    var szFolderURL = szResponse.match(PatternYahooFolderURL)[1];
                    mainObject.m_Log.Write("nsYahoo.js - loginOnloadHandler - szFolderURL : "+szFolderURL );

                    mainObject.m_HttpComms.setURI(szFolderURL);
                    mainObject.m_HttpComms.setRequestMethod("GET");
                    var bResult = mainObject.m_HttpComms.send(mainObject.loginOnloadHandler, mainObject);
                    if (!bResult) throw new Error("httpConnection returned false");
                    mainObject.m_iStage++;
             
                break;
                
                case 3:// folder list     
                    var aszServerFolders = szResponse.match(PatternYahooFolders);
                    mainObject.m_Log.Write("nsYahoo.js - loginOnloadHandler - aszServerFolders : "+aszServerFolders);       
                    mainObject.m_Log.Write("nsYahoo.js - loginOnloadHandler - aszServerFolders : "+mainObject.m_aszFolderList); 
                    
                    for (j=0; j<mainObject.m_aszFolderList.length; j++)
                    {
                        var regExp = new RegExp("^"+mainObject.m_aszFolderList[j]+"$","i");
                        for (i=0; i<aszServerFolders.length; i++)
                        {
                            var szBox = aszServerFolders[i].match(PatternYahooFolderBox)[1];
                            mainObject.m_Log.Write("nsYahoo.js - loginOnloadHandler - szBox : "+szBox );
                            
                            if (szBox.search(regExp)!=-1)
                            {
                                var szURL = mainObject.m_szLocationURI + aszServerFolders[i].replace(/"/g,"");
                                mainObject.m_aszFolderURLList.push(szURL);
                                mainObject.m_Log.Write("nsYahoo.js - loginOnloadHandler - szURL : "+szURL);
                            }
                        }
                    }
                   
                    //server response
                    mainObject.serverComms("+OK Your in\r\n");
                    mainObject.m_bAuthorised = true;
                break;
            };
                      
            mainObject.m_Log.Write("nsYahoo.js - loginOnloadHandler - END");
        }
        catch(err)
        {
            mainObject.m_Log.DebugDump("nsYahoo.js: loginHandler : Exception : " 
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
            this.m_Log.Write("nsYahoo.js - getNumMessages - START"); 
           
            if (this.m_aszFolderURLList.length==0) return false;
            var szMailboxURI = this.m_aszFolderURLList.shift();
            this.m_Log.Write("nsYahoo.js - getNumMessages - mail box url " + szMailboxURI); 
            
            this.m_HttpComms.setURI(szMailboxURI);
            this.m_HttpComms.setRequestMethod("GET");
            var bResult = this.m_HttpComms.send(this.mailBoxOnloadHandler, this); 
            if (!bResult) throw new Error("httpConnection returned false");
            this.m_bStat = true;
            
            this.m_Log.Write("nsYAhoo.js - getNumMessages - END"); 
            return true;
        }
        catch(e)
        {
            this.m_Log.DebugDump("nsYahoo.js: getNumMessages : Exception : " 
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
            mainObject.m_Log.Write("nsYahoo.js - mailBoxOnloadHandler - START"); 
            mainObject.m_Log.Write("nsYahoo.js - mailBoxOnloadHandler : \n" + szResponse);
            mainObject.m_Log.Write("nsYahoo.js - mailBoxOnloadHandler : " + mainObject.m_iStage);  
            
            var httpChannel = event.QueryInterface(Components.interfaces.nsIHttpChannel);
                      
            //check status should be 200.
            mainObject.m_Log.Write("nsYahoo.js - mailBoxOnloadHandler - Mailbox :" + httpChannel.responseStatus);
            if (httpChannel.responseStatus != 200 ) 
                throw new Error("error status " + httpChannel.responseStatus);
            
            //get data for deleting
            if (mainObject.m_aDeleteData.length==0)
            {
                var aszDeleteForm = szResponse.match(PatternYahooDeleteForm);
                mainObject.m_Log.Write("nsYahoo.js - mailBoxOnloadHandler - delete form :" + aszDeleteForm);
               
                mainObject.m_szDeleteURL = aszDeleteForm[0].match(PatternYahooDeleteURL)[1];
                mainObject.m_Log.Write("nsYahoo.js - mailBoxOnloadHandler - delete URL :" + mainObject.m_szDeleteURL);
                
                var aszDeleteInput = aszDeleteForm[0].match(PatternYahooDeleteInput);
                mainObject.m_Log.Write("nsYahoo.js - mailBoxOnloadHandler - delete Input :" + aszDeleteInput);
                
                for (i=0 ; i < aszDeleteInput.length ; i++)
                {
                     var aszInput = aszDeleteInput[i].match(PatternYahooDeleteInput);
                     mainObject.m_Log.Write("nsYahoo.js - mailBoxOnloadHandler - delete Input data :" + aszInput);
                     
                     if (aszInput)
                     { 
                        var szName = aszInput[0].match(patternYahooNameAlt)[1];
                        szName = szName.replace(/["|']/gm,"");
                        mainObject.m_Log.Write("nsYahoo.js - mailBoxOnloadHandler - delete name " + szName);
                        
                        var szValue = aszInput[0].match(patternYahooAltValue)[1];
                        szValue = szValue.replace(/["|']/gm,"");
                        mainObject.m_Log.Write("nsYahoo.js - mailBoxOnloadHandler - delete value " + szValue);
                         
                        var oYahooData = new YahooData();
                        oYahooData.szName = szName;
                        oYahooData.szValue = szValue;
                      
                        if (szName.search(/DEL/i)!=-1)
                            oYahooData.szValue = 1; 
                        else
                            oYahooData.szValue = escape(szValue); //encodeURIComponent
                            
                       mainObject.m_aDeleteData.push(oYahooData); 
                     }
                }
            }
            
            //process message table
            var aMsgTable = szResponse.match(patternYahooMSGIdTable);
            mainObject.m_Log.Write("nsYahoo.js - mailBoxOnloadHandler - msgtable :" + aMsgTable);
            if (aMsgTable)
            {
                var aMsgRows = aMsgTable[0].match(patternYahooMsgRow);
                mainObject.m_Log.Write("nsYahoo.js - mailBoxOnloadHandler - msgRows :" + aMsgRows);
                
                //get number of msg on page
                var iNum = aMsgRows.length -1; // first row is headers
                mainObject.m_Log.Write("nsYahoo.js - mailBoxOnloadHandler - msgRows Num :" + iNum);
                
                //process data
                if (iNum > 0)
                {
                    for (i= 1 ; i< iNum+1 ; i++)
                    {  
                        var bRead = true;
                        if (mainObject.m_bDownloadUnread)
                        {
                            bRead = (aMsgRows[i].search(PatternYahooUnRead)!=-1) ? true : false;
                            mainObject.m_Log.Write("nsYahoo.js - mailBoxOnloadHandler - bRead -" + bRead);
                        }
                        
                        if (bRead)
                        {
                            var data = new YahooMSG();
                            
                            //get msg info
                            var szMsgID =  aMsgRows[i].match(patternYahooMsgID)[1];
                            mainObject.m_Log.Write("nsYahoo.js - mailBoxOnloadHandler - msg id :" + i + " " +szMsgID);
                            data.szMSGUri = szMsgID;
                            data.szDeleteUri = mainObject.m_szDeleteURL;
                            data.aData = mainObject.m_aDeleteData;
                            data.bJunkFolder = mainObject.m_bJunkChecked;
                            
                            //get msg size
                            var aMsgSize = aMsgRows[i].match(patternYahooMsgSize);
                            var szMsgSize = aMsgSize[aMsgSize.length-1]; //size is last element
                            var szSize = szMsgSize.match(/<td.*?>(.*?)<\/td/)[1];
                            var iSize = parseInt(szSize);
                            if (szSize.indexOf('k')!= -1) iSize*=1000;
                            mainObject.m_Log.Write("nsYahoo.js - mailBoxOnloadHandler - msg size :" + i + " " +iSize);
                            data.iSize = iSize;
                            
                            mainObject.m_iTotalSize += iSize;
                            mainObject.m_aMsgDataStore.push(data);  
                        }
                    }
                }
            }
                
            //check for more pages
            var aszNextPage = szResponse.match(patternYahooNextPage);
            mainObject.m_Log.Write("nsYahoo.js - mailBoxOnloadHandler - msg next page :" +aszNextPage);
            if (aszNextPage)
            { 
                var szNewPage = aszNextPage[0].split("|");
                mainObject.m_Log.Write("nsYahoo.js - mailBoxOnloadHandler - msg next page :" +szNewPage + " " + szNewPage.length);
    
                var szMailboxURI = mainObject.m_szLocationURI + 
                                    szNewPage[szNewPage.length-1].match(patternYahooNextURI)[1];
                mainObject.m_Log.Write("nsYahoo.js - getNumMessages - mail box url " + szMailboxURI); 
                  
                mainObject.m_HttpComms.setURI(szMailboxURI);
                mainObject.m_HttpComms.setRequestMethod("GET");
                var bResult = mainObject.m_HttpComms.send(mainObject.mailBoxOnloadHandler, mainObject); 
                if (!bResult) throw new Error("httpConnection returned false");
            }
            //check for more folders
            else if ( mainObject.m_aszFolderURLList.length>0)
            {
                mainObject.m_Log.Write("nsYahoo.js - MailBoxOnload - load next folder");
                
                var szMailboxURI = mainObject.m_aszFolderURLList.shift(); 
                mainObject.m_Log.Write("nsYahoo.js - getNumMessages - mail box url " + szMailboxURI); 
                
                mainObject.m_HttpComms.setURI(szMailboxURI);
                mainObject.m_HttpComms.setRequestMethod("GET");
                var bResult = mainObject.m_HttpComms.send(mainObject.mailBoxOnloadHandler, mainObject); 
                if (!bResult) throw new Error("httpConnection returned false");
                
                delete mainObject.m_aDeleteData;
                mainObject.m_aDeleteData = new Array();
            }
            //no more pages report back to mozilla
            else
            {    
                if (mainObject.m_bStat) //called by stat
                {
                    mainObject.serverComms("+OK "+ mainObject.m_aMsgDataStore.length 
                                            + " " + mainObject.m_iTotalSize + "\r\n");
                }
                else //called by list
                {
                    var szPOPResponse = "+OK " + mainObject.m_aMsgDataStore.length + " Messages\r\n"; 
                    this.m_Log.Write("nsYahoo.js - getMessagesSizes - : " + mainObject.m_aMsgDataStore.length);
     
                    for (i = 0; i <  mainObject.m_aMsgDataStore.length; i++)
                    {
                        var iEmailSize = mainObject.m_aMsgDataStore[i].iSize;
                        szPOPResponse+=(i+1) + " " + iEmailSize + "\r\n";       
                    }         
                   
                    szPOPResponse += ".\r\n";
                    mainObject.serverComms(szPOPResponse);
                }
                
                delete mainObject.m_aDeleteData;
                mainObject.m_aDeleteData = new Array();
            }
            
            mainObject.m_Log.Write("nsYahoo.js - MailBoxOnload - END"); 
        }
        catch(err)
        {
             mainObject.m_Log.DebugDump("nsYahoo.js: MailboxOnload : Exception : " 
                                              + err.name 
                                              + ".\nError message: " 
                                              + err.message+ "\n"
                                              + err.lineNumber);
            
            mainObject.serverComms("-ERR negative vibes from "+ mainObject.m_szUserName +"\r\n");
        }   
    },
 
    
    
   

                     
    //list
    //i'm not downloading the mailbox again. 
    getMessageSizes : function() 
    {
        try
        {
            this.m_Log.Write("nsYahoo.js - getMessageSizes - START"); 
            
            if (this.m_bStat) 
            {  //msg table has been donwloaded
            
                this.m_Log.Write("nsYahoo.js - getMessageSizes - getting sizes"); 
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
            
                this.m_Log.Write("nsYahoo.js - getMessageSizes - calling stat");
               
                if (this.m_szMailboxURI == null) return false;
                var szMailboxURI = this.m_szLocationURI + this.m_szMailboxURI; 
                this.m_Log.Write("nsYahoo.js - getMessageSizes - mail box url " + szMailboxURI); 
                
                this.m_HttpComms.clean();
                this.m_HttpComms.setURI(szMailboxURI);
                this.m_HttpComms.setRequestMethod("GET");
                this.m_iStage =0;
                var bResult = this.m_HttpComms.send(this.mailBoxOnloadHandler, this); 
                if (!bResult) throw new Error("httpConnection returned false");
            }
            this.m_Log.Write("nsYahoo.js - getMessageSizes - END"); 
            return true;
        }
        catch(e)
        {
            this.m_Log.DebugDump("nsYahoo.js: getMessageSizes : Exception : " 
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
            this.m_Log.Write("nsYahoo.js - getMessageIDs - START"); 
    
            var szPOPResponse = "+OK " + this.m_aMsgDataStore.length + " Messages\r\n";
            this.m_Log.Write("nsYahoo.js - getMessageIDs - return : " + this.m_aMsgDataStore.length ); 
                                                
            for (i = 0; i <  this.m_aMsgDataStore.length; i++)
            {
                var oMSGData = this.m_aMsgDataStore[i];
                var szEmailURL = oMSGData.szMSGUri;
                this.m_Log.Write("nsYahoo.js - getMessageIDs - Email URL : " +szEmailURL);
               
                var szEmailID = szEmailURL.match(PatternYahooID)[1];
                                    
                this.m_Log.Write("nsYahoo.js - getMessageIDs - IDS : " +szEmailID);    
                szPOPResponse+=(i+1) + " " +szEmailID + "\r\n";  
            }         
               
            szPOPResponse += ".\r\n";
            this.serverComms(szPOPResponse);           
          
            this.m_Log.Write("nsYahoo.js - getMessageIDs - END"); 
            return true;
        }
        catch(e)
        {
            this.m_Log.DebugDump("nsYahoo.js: getMessageIDs : Exception : " 
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
            this.m_Log.Write("nsYahoo.js - getHeaders - START");  
            this.m_Log.Write("nsYahoo.js - getHeaders - id " + lID ); 
           
            //get msg id
            this.m_iID = lID-1;
            var oMSGData = this.m_aMsgDataStore[lID-1]
            this.m_szMsgID = oMSGData.szMSGUri;
            this.m_Log.Write("nsYahoo.js - getHeaders - msg id" + this.m_szMsgID); 
            
            try
            {
                this.m_szBox= this.m_szMsgID.match(PatternYahooBox)[1];
            }
            catch(err)
            {
                this.m_szBox= this.m_szMsgID.match(PatternYahooBoxAlt)[1];
            }
            this.m_Log.Write("nsYahoo.js - getHeaders - msg box" + this.m_szBox); 
             
            //get headers
            var szDest = this.m_szLocationURI + this.m_szMsgID.match(/.*?&/) + this.m_szBox +"&bodyPart=HEADER";
            this.m_Log.Write("nsYahoo.js - getHeaders - url - "+ szDest);                       
            this.m_bJunkFolder = oMSGData.bJunkFolder;
            this.m_iStage = 0;   
            
            //get msg from yahoo
            this.m_HttpComms.setURI(szDest);
            this.m_HttpComms.setRequestMethod("GET");
            var bResult = this.m_HttpComms.send(this.headerOnloadHandler, this); 
            if (!bResult) throw new Error("httpConnection returned false");
            
            this.m_Log.Write("nsYahoo.js - getHeaders - END");
            return true; 
        }
        catch(err)
        {
            
            this.m_Log.DebugDump("nsYahoo.js: getHeaders : Exception : " 
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
            mainObject.m_Log.Write("m_YahooLog.js - headerOnloadHandler - START");
            mainObject.m_Log.Write("m_YahooLog.js - headerOnloadHandler - msg :\n" + szResponse); 
           
            var httpChannel = event.QueryInterface(Components.interfaces.nsIHttpChannel);
                      
            //check status should be 200.
            mainObject.m_Log.Write("m_YahooLog.js - headerOnloadHandler - msg :" + httpChannel.responseStatus);
            if (httpChannel.responseStatus != 200) 
                throw new Error("error status " + httpChannel.responseStatus);   
         
            var szUri = httpChannel.URI.spec;
            mainObject.m_Log.Write("m_YahooLog.js - headerOnloadHandler - uri : " + szUri);   
                            
            switch(mainObject.m_iStage)
            {
                case 0://process header
                    mainObject.m_szHeader  = "X-WebMail: true\r\n";
                    var szFolder = mainObject.m_szBox.match(PatternYahooFolderBoxAlt)[1];
                    mainObject.m_szHeader += "X-Folder: " +szFolder+ "\r\n";
                    mainObject.m_szHeader += szResponse; 
                    mainObject.m_szHeader = mainObject.m_szHeader.replace(/^\./mg,"..");    //bit padding 
                    mainObject.m_szHeader += ".\r\n";//msg end 
                    
                    var oMSGData = mainObject.m_aMsgDataStore[ mainObject.m_iID];
                    mainObject.m_szMsgID = oMSGData.szMSGUri;
                    var szPath = mainObject.m_szLocationURI + oMSGData.szDeleteUri;
                    mainObject.m_Log.Write("nsYahoo.js - headerOnloadHandler - url - "+ szPath);                       
             
                    for(i=0; i<oMSGData.aData.length; i++ )
                    {
                        var oData = oMSGData.aData[i];
                        if (oData.szName.search(/^DEL$/i)!=-1)
                            oData.szValue = ""; 
                        else if (oData.szName.search(/FLG/i)!=-1)
                            oData.szValue = 1;
                        else if (oData.szName.search(/flags/i)!=-1)
                            oData.szValue ="unread";

                        mainObject.m_HttpComms.addValuePair(oData.szName, oData.szValue);
                    }
                    mainObject.m_HttpComms.addValuePair("Mid", oMSGData.szMSGUri.match(PatternYahooID)[1]);
               
                    //send request
                    mainObject.m_HttpComms.setURI(szPath);
                    mainObject.m_HttpComms.setRequestMethod("POST");
                    var bResult = mainObject.m_HttpComms.send(mainObject.headerOnloadHandler, mainObject); 
                    mainObject.m_iStage ++;
                    if (!bResult) throw new Error("httpConnection returned false");       
                break;
               
                case 1: //marked as unread
                    var  szServerResponse = "+OK " +mainObject.m_szHeader.length + "\r\n"; 
                    szServerResponse += mainObject.m_szHeader
                    mainObject.serverComms(szServerResponse);
                break;
            }
            mainObject.m_Log.Write("m_YahooLog.js - headerOnloadHandler - END");      
        }
        catch(err)
        {
            mainObject.m_Log.DebugDump("m_YahooLog.js: headerOnloadHandler : Exception : " 
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
            this.m_Log.Write("nsYahoo.js - getMessage - START"); 
            this.m_Log.Write("nsYahoo.js - getMessage - msg num" + lID); 
                     
            //get msg id
            var oMSGData = this.m_aMsgDataStore[lID-1]
            this.m_szMsgID = oMSGData.szMSGUri;
            this.m_Log.Write("nsYahoo.js - getMessage - msg id" + this.m_szMsgID); 
            
            try
            {
                this.m_szBox= this.m_szMsgID.match(PatternYahooBox)[1];
            }
            catch(err)
            {
                this.m_szBox= this.m_szMsgID.match(PatternYahooBoxAlt)[1];
            }
            this.m_Log.Write("nsYahoo.js - getMessage - msg box" + this.m_szBox); 
             
            //get headers
            var szDest = this.m_szLocationURI + this.m_szMsgID.match(/.*?&/) + this.m_szBox +"&bodyPart=HEADER";
            this.m_Log.Write("nsYahoo.js - getMessage - url - "+ szDest);                       
            this.m_bJunkFolder = oMSGData.bJunkFolder;
            this.m_iStage = 0;   
            
            //get msg from yahoo
            this.m_HttpComms.setURI(szDest);
            this.m_HttpComms.setRequestMethod("GET");
            var bResult = this.m_HttpComms.send(this.emailOnloadHandler, this); 
            if (!bResult) throw new Error("httpConnection returned false");
            
            this.m_Log.Write("m_YahooLog.js - getMessage - END"); 
            return true;
        }
        catch(e)
        {
             this.m_Log.DebugDump("m_YahooLog.js: getMessage : Exception : " 
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
            mainObject.m_Log.Write("m_YahooLog.js - emailOnloadHandler - START");
            mainObject.m_Log.Write("nsYahoo.js - emailOnloadHandler : \n" + szResponse);          
            var httpChannel = event.QueryInterface(Components.interfaces.nsIHttpChannel);
                      
            //check status should be 200.
            mainObject.m_Log.Write("m_YahooLog.js - emailOnloadHandler - msg :" + httpChannel.responseStatus);
            if (httpChannel.responseStatus != 200) 
                throw new Error("error status " + httpChannel.responseStatus);   
            
            var szUri = httpChannel.URI.spec;
            mainObject.m_Log.Write("m_YahooLog.js - emailOnloadHandler - uri : " + szUri);
            
            //Content-Type: text/html  == very bad
            try
            {
                var szContetnType =  httpChannel.getResponseHeader("Content-Type");
                mainObject.m_Log.Write("m_YahooLog.js - emailOnloadHandler - szContetnType "+szContetnType);   
                if (szContetnType.search(/text\/html/i)!=-1)
                {
                    mainObject.m_Log.Write("m_YahooLog.js - emailOnloadHandler - error download msg");   
                    if (mainObject.m_iMSGCount == 2) 
                    {
                        throw new Error("download failed"); 
                    }
                    else//try again
                    {
                        mainObject.m_iMSGCount++;        
                        mainObject.m_HttpComms.setURI(szUri);
                        mainObject.m_HttpComms.setRequestMethod("GET");
                        var bResult = mainObject.m_HttpComms.send(mainObject.emailOnloadHandler, mainObject); 
                        if (!bResult) throw new Error("httpConnection returned false");
                        return;
                    }
                }
                mainObject.m_iMSGCount = 0; 
            }
            catch(err)
	        {
                mainObject.m_Log.Write("m_YahooLog.js - emailOnloadHandler - szContetnType error");
            }
            
            
            switch(mainObject.m_iStage)
            {
                case 0:  ///header
                    mainObject.m_szHeader = "X-WebMail: true\r\n";
                    var szFolder = mainObject.m_szBox.match(PatternYahooFolderBoxAlt)[1];
                    mainObject.m_szHeader += "X-Folder: " + szFolder + "\r\n";

                    var oHeaders = new headers(szResponse);
                    mainObject.m_szHeader += oHeaders.getAllHeaders();
                    mainObject.m_Log.Write("nsYahoo.js - emailOnloadHandler - headers - "+mainObject.m_szHeader);
            
                    //get body
                    var ios=Components.classes["@mozilla.org/network/io-service;1"];
                    ios = ios.getService(Components.interfaces.nsIIOService);
                    
                   
                    var szDest = mainObject.m_szLocationURI + mainObject.m_szMsgID.match(/.*?&/) 
                                    + mainObject.m_szBox + "&bodyPart=TEXT";
                    mainObject.m_Log.Write("nsYahoo.js - emailOnloadHandler - url - "+ szDest);                       
                   
                    //get msg from yahoo
                    mainObject.m_iStage++;
                    mainObject.m_HttpComms.setURI(szDest);
                    mainObject.m_HttpComms.setRequestMethod("GET");
                    var bResult = mainObject.m_HttpComms.send(mainObject.emailOnloadHandler, mainObject); 
                    if (!bResult) throw new Error("httpConnection returned false");
                break;
                
                case 1: //body
                    var szMsg =  mainObject.m_szHeader;
                    szMsg += szResponse;
                    szMsg = szMsg.replace(/^\./mg,"..");    //bit padding 
                    
                    var iMsgLength = szMsg.length-1;
                    var iLastIndex = szMsg.lastIndexOf("\n")
                    szMsg += "\r\n.\r\n";  //msg end 
                                                                                                                      
                    var szPOPResponse = "+OK " + szMsg.length + "\r\n";                     
                    szPOPResponse += szMsg;
                                                 
                    mainObject.serverComms(szPOPResponse);           
                   
                break;
            }
          
            mainObject.m_Log.Write("m_YahooLog.js - emailOnloadHandler - END");      
        }
        catch(err)
        {
            mainObject.m_Log.DebugDump("m_YahooLog.js: emailOnloadHandler : Exception : " 
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
            this.m_Log.Write("nsYahoo.js - deleteMessage - START");  
            this.m_Log.Write("nsYahoo.js - deleteMessage - id " + lID ); 
                  
            //create URL
            var oMSGData = this.m_aMsgDataStore[lID-1];
           
            var szPath = this.m_szLocationURI + oMSGData.szDeleteUri;
            this.m_Log.Write("nsYahoo.js - deleteMessage - url - "+ szPath);  
           
            for(i=0; i<oMSGData.aData.length; i++ )
            {
                var oData = oMSGData.aData[i];
                this.m_HttpComms.addValuePair(oData.szName, oData.szValue);
            }
            this.m_HttpComms.addValuePair("Mid", oMSGData.szMSGUri.match(PatternYahooID)[1]);
       
            //send request
            this.m_HttpComms.setURI(szPath);
            this.m_HttpComms.setRequestMethod("POST");
            var bResult = this.m_HttpComms.send(this.deleteMessageOnloadHandler, this); 
            
            if (!bResult) throw new Error("httpConnection returned false");
            this.m_Log.Write("nsYahoo.js - deleteMessage - END");     
            return true;
        }
        catch(e)
        {
            this.m_Log.DebugDump("nsYahoo.js: deleteMessage : Exception : " 
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
            mainObject.m_Log.Write("nsYahoo.js - deleteMessageOnload - START");    
            mainObject.m_Log.Write("nsYahoo.js - deleteMessageOnload : \n" + szResponse);
            var httpChannel = event.QueryInterface(Components.interfaces.nsIHttpChannel);
            
            //check status should be 200.
            mainObject.m_Log.Write("nsYahoo.js - deleteMessageOnload :" + httpChannel.responseStatus);
            if (httpChannel.responseStatus != 200 ) 
                throw new Error("error status " + httpChannel.responseStatus);   
                 
            mainObject.serverComms("+OK its history\r\n");      
            mainObject.m_Log.Write("nsYahoo.js - deleteMessageOnload - END");      
        }
        catch(e)
        {
            mainObject.m_Log.DebugDump("nsYahoo.js: deleteMessageOnload : Exception : " 
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
            this.m_Log.Write("nsYahoo.js - logOUT - START"); 
            
            if (this.m_bReUseSession)
            { 
                this.m_Log.Write("nsYahoo.js - logOut - Setting Session Data");           
                this.m_ComponentManager.addElement(this.m_szUserName, "szHomeURI", this.m_szHomeURI);
                this.m_Log.Write("nsYahoo.js - logOut - szHomeURI" + this.m_szHomeURI);    
            }
            else
            {
                this.m_Log.Write("nsYahoo.js - logIN - deleting Session Data");
                this.m_HttpComms.deleteSessionData(); 
                this.m_ComponentManager.deleteAllElements(this.m_szUserName);
            }
                   
            this.m_bAuthorised = false;
            this.serverComms("+OK Your Out\r\n");             
                                           
            this.m_Log.Write("nsYahoo.js - logOUT - END");  
            return true;
        }
        catch(e)
        {
            this.m_Log.DebugDump("nsYahoo.js: logOUT : Exception : " 
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
            this.m_Log.Write("nsYahoo.js - serverComms - START");
            this.m_Log.Write("nsYahoo.js - serverComms msg " + szMsg);
            var iCount = this.m_oResponseStream.write(szMsg,szMsg.length);
            this.m_Log.Write("nsYahoo.js - serverComms sent count: " + iCount 
                                                        +" msg length: " +szMsg.length);
            this.m_Log.Write("nsYahoo.js - serverComms - END");  
        }
        catch(e)
        {
            this.m_Log.DebugDump("nsYahoo.js: serverComms : Exception : " 
                                              + e.name 
                                              + ".\nError message: " 
                                              + e.message+ "\n"
                                              + e.lineNumber);
        }
    },
   
   
    
    loadPrefs : function()
    {
        try
        {
            this.m_Log.Write("nsYahoo.js - loadPrefs - START"); 
           
            //get user prefs
            var iCount = 0;
            var oPref = {Value:null};
            var  WebMailPrefAccess = new WebMailCommonPrefAccess();
            WebMailPrefAccess.Get("int","yahoo.Account.Num",oPref);
            this.m_Log.Write("nsYahoo.js - loadPrefs - num " + oPref.Value);
            if (oPref.Value) iCount = oPref.Value;
                
            var bFound = false;
            var regExp = new RegExp(this.m_szUserName,"i");
            for (i=0; i<iCount; i++)
            {
                //get user name
                oPref.Value = null;
                WebMailPrefAccess.Get("char","yahoo.Account."+i+".user",oPref);
                this.m_Log.Write("nsYahoo.js - loadPrefs - user " + oPref.Value);
                if (oPref.Value)
                {
                    if (oPref.Value.search(regExp)!=-1)
                    {
                        this.m_Log.Write("nsYahoo.js - loadPrefs - user found "+ i);
                        bFound = true;
                                                                                   
                        //inbox
                        this.m_aszFolderList.push("inbox"); 
                        
                        //get spam
                        oPref.Value = null;
                        WebMailPrefAccess.Get("bool","yahoo.Account."+i+".bUseJunkMail",oPref);
                        this.m_Log.Write("nsYahoo.js - loadPrefs - bUseJunkMail " + oPref.Value);
                        if (oPref.Value)           
                            this.m_aszFolderList.push("%40B%40Bulk");
    
                        
                        //get folders
                        WebMailPrefAccess.Get("char","yahoo.Account."+i+".szFolders",oPref);
                        this.m_Log.Write("nsYahoo.js - loadPrefs - szFolders " + oPref.Value);
                        if (oPref.Value)
                        {
                            var aszFolders = oPref.Value.split("\r");
                            for (j=0; j<aszFolders.length; j++)
                            {
                                this.m_Log.Write("nsYahoo - loadPRefs - aszFolders[j] " + aszFolders[j]);
                                this.m_aszFolderList.push(encodeURIComponent(aszFolders[j]));
                            }
                        }
                        
                        //get unread
                        oPref.Value = null;
                        WebMailPrefAccess.Get("bool","yahoo.Account."+i+".bDownloadUnread",oPref);
                        if (oPref.Value)
                            this.m_bDownloadUnread=oPref.Value;
                        else
                             this.m_bDownloadUnread= false;              
                    }
                }
            }
            
            if (!bFound) //get defaults
            {
                this.m_Log.Write("nsYahoo - loadPrefs - Default Folders");
                
                //unread only
                oPref.Value = null;
                if (WebMailPrefAccess.Get("bool","yahoo.bDownloadUnread",oPref))
                    this.m_bDownloadUnread=oPref.Value;
                else
                     this.m_bDownloadUnread= false;                   
                          
                //inbox
                this.m_Log.Write("nsYahoo - loadPrefs - Default Folders - inbox");
                this.m_aszFolderList.push("inbox");
                
                //spam
                oPref.Value = null;
                if (WebMailPrefAccess.Get("bool","yahoo.bUseJunkMail",oPref))
                {
                    if (oPref.Value)
                    {
                        this.m_Log.Write("nsYahoo - loadPrefs - Default Folders - spam");
                        this.m_aszFolderList.push("%40B%40Bulk");
                    }
                }
            }
            this.m_Log.Write("nsYahoo.js - loadPrefs - END");
        }
        catch(e)
        {
             this.m_Log.DebugDump("nsYahoo.js: loadPrefs : Exception : " 
                                              + e.name + 
                                              ".\nError message: " 
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
var nsYahooFactory = new Object();

nsYahooFactory.createInstance = function (outer, iid)
{
    if (outer != null) throw Components.results.NS_ERROR_NO_AGGREGATION;
    
    if (!iid.equals(nsYahooClassID) && !iid.equals(Components.interfaces.nsISupports))
        throw Components.results.NS_ERROR_INVALID_ARG;
    
    return new nsYahoo();
}


/******************************************************************************/
/* MODULE */
var nsYahooModule = new Object();

nsYahooModule.registerSelf = function(compMgr, fileSpec, location, type)
{
    compMgr = compMgr.QueryInterface(Components.interfaces.nsIComponentRegistrar);
    compMgr.registerFactoryLocation(nsYahooClassID,
                                    "YahooComponent",
                                    nsYahooContactID, 
                                    fileSpec,
                                    location, 
                                    type);
}


nsYahooModule.unregisterSelf = function(aCompMgr, aFileSpec, aLocation)
{
    aCompMgr = aCompMgr.QueryInterface(Components.interfaces.nsIComponentRegistrar);
    aCompMgr.unregisterFactoryLocation(nsYahooClassID, aFileSpec);
}

 
nsYahooModule.getClassObject = function(compMgr, cid, iid)
{
    if (!cid.equals(nsYahooClassID))
        throw Components.results.NS_ERROR_NO_INTERFACE;

    if (!iid.equals(Components.interfaces.nsIFactory))
        throw Components.results.NS_ERROR_NOT_IMPLEMENTED;

    return nsYahooFactory;
}


nsYahooModule.canUnload = function(compMgr)
{
    return true;
}
/******************************************************************************/


function NSGetModule(compMgr, fileSpec)
{
    return nsYahooModule; 
}
