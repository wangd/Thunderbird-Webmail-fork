/*****************************  Globals   *************************************/                 
const nsMailDotComClassID = Components.ID("{304bef20-b908-11d9-9669-0800200c9a66}");
const nsMailDotComContactID = "@mozilla.org/MailDotCom;1";
const ExtMailDotComGuid = "{1ad5b3b0-b908-11d9-9669-0800200c9a66}";

const patternMailRefresh = /<head>[\s]<meta http-equiv="Refresh" content="0;URL=(.*?)">[\s\S]*<\/head>/i;
const patternMailDotComLoginForm =/<form.*?>[\S\d\s\r\n]*?<\/form>/igm;
const patternMailDotComLoginURI = /action="(.*?)"/;
const patternMailDotComLoginInput = /<input type=(?!"submit").*?>/igm;
const patternMailDotComType = /type="(.*?)"/i;
const patternMailDotComValue = /value=['|"]*(\S*)['|"]*.*?>/i;
const patternMailDotComName = /name=['|"]*([\S]*)['|"]*/i;
const patternMailDotComFrame = /<frame.*?src="(.*?)".*?name="mailcomframe".*?SCROLLING="AUTO">/;
const patternMailDotComFolders = /href="(.*?folders.mail.*?)".*?class="nltxt"/;
const patternMailDotComFolderList = /href=".*?".*?class="fb"/gm;
const patternMailDotComFolderURI= /href="(.*?)"/;
const patternMailDotComFolderName=/&folder=(.*?)$/;
const patternMailDotComAddURI = /document.location.href="(.*?)"/;
const patternMailDotComMsgTable = /<tbody>[\S\s]*<\/tbody>/igm;
const patternMailDotComNext = /<a href="(.*?mailbox.mail.*?)" class="fl">Next<\/a>/;
const patternMailDotComDelete = /<form action="(\/scripts\/mail\/mailbox.mail\?.ob=.*?)" method="POST" name="inBoxMessages">/;
const patternMailDotComMsgRows = /<tr.*?>[[\S\s\n]*?<\/tr>/igm;
const patternMailDotComMsgData = /<td.*?>[\S\s\n]*?<\/td>/igm;
const patternMailDotComHref = /href="(.*?)"/i;
const patternMailDotComSize = />(.*?)</;
const patternMailDotComMsgId = /msg_uid=(.*?)&/;
const patternMailDotComMSG =/<body bgcolor="#ffffff">([\s\S]*)<div id="pbl">/;
const patternMailDotComHeaders = /<p>([\s\S]*?)<\/p>/;
const patternMailDotComOtherHeaderData = /<B>(.*?)<\/B>([\s\S]*?)$/i;

/******************************  MailDotCom ***************************************/




function nsMailDotCom()
{
    try
    {       
        var scriptLoader =  Components.classes["@mozilla.org/moz/jssubscript-loader;1"]
                              .getService(Components.interfaces.mozIJSSubScriptLoader);
        if (scriptLoader)
        {
            scriptLoader.loadSubScript("chrome://web-mail/content/common/DebugLog.js");
            scriptLoader.loadSubScript("chrome://web-mail/content/common/CookieManager.js");
            scriptLoader.loadSubScript("chrome://web-mail/content/common/CommonPrefs.js");
            
        }
        
        var date = new Date();
        
        var  szLogFileName = "nsMailDotCom Log - " + date.getHours()+ "-" 
                                    + date.getMinutes() + "-"+ date.getUTCMilliseconds() +" -";
        this.Log = new DebugLog("webmail.logging.comms", ExtMailDotComGuid, szLogFileName); 
        
        this.Log.Write("nsMailDotCom.js - Constructor - START");   
       
        this.m_bAuthorised = false;
        this.m_szUserName = null;   
        this.m_szPassWord = null; 
        this.m_oResponseStream = null; 
        this.m_oCookies = new CookieHandler(this.Log); 
        this.m_iStage = 0;
        this.m_BeforeAdsCallback = null;
        
        this.m_szLocation=null;
        this.m_szFolderList=null;
        this.m_szInboxURI=null;
        this.m_szTrashURI=null;
        this.m_szDeleteURI = null;
        this.m_szMSGID = null;
               
        this.m_iTotalSize = 0; 
        this.m_aiMsgSize = new Array();
        this.m_aszMsgIDStore = new Array();
        
        this.m_szHeaders = null;
                   
        this.Log.Write("nsMailDotCom.js - Constructor - END");  
    }
    catch(e)
    {
        DebugDump("nsMailDotCom.js: Constructor : Exception : " 
                                      + e.name 
                                      + ".\nError message: " 
                                      + e.message);
    }
}



nsMailDotCom.prototype =
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
            this.Log.Write("nsMailDotCom.js - logIN - START");   
            this.Log.Write("nsMailDotCom.js - logIN - Username: " + this.m_szUserName 
                                                   + " Password: " + this.m_szPassWord 
                                                   + " stream: " + this.m_oResponseStream);
            
            if (!this.m_szUserName || !this.m_oResponseStream || !this.m_szPassWord) return false;
        
            this.m_iStage =0;
            
            //get mail.com webpage
            var bResult = this.httpConnection("http://www.mail.com",
                                              "GET", 
                                              null,
                                              null, 
                                              this.loginOnloadHandler);
                                                
            if (!bResult) throw new Error("httpConnection returned false");
         
            this.Log.Write("nsMailDotCom.js - logIN - END");    
            return true;
        }
        catch(e)
        {
            this.Log.DebugDump("nsMailDotCom.js: logIN : Exception : " 
                                              + e.name + 
                                              ".\nError message: " 
                                              + e.message);
            return false;
        }
    },


    loginOnloadHandler : function(szResponse ,event , mainObject)
    {
        try
        {
            mainObject.Log.Write("nsMailDotCom.js - loginOnloadHandler - START"); 
            
            mainObject.Log.Write("nsMailDotCom.js - loginOnloadHandler : " 
                                         + mainObject.m_iStage + "\n"
                                         + szResponse);  
            
            var httpChannel = event.QueryInterface(Components.interfaces.nsIHttpChannel);
            
            //if this fails we've gone somewhere new
            mainObject.Log.Write("nsMailDotCom.js - loginOnloadHandler - status :" +httpChannel.responseStatus );
            if (httpChannel.responseStatus != 200 
                        && httpChannel.responseStatus != 302
                                    && httpChannel.responseStatus != 301) 
                throw new Error("return status " + httpChannel.responseStatus);
            
            var szURL = httpChannel.URI.host;
            mainObject.Log.Write("nsMailDotCom.js - loginOnloadHandler - url - " + szURL);  
            var aszTempDomain = szURL.match(/[^\.\/]+\.[^\.\/]+$/);  
            mainObject.Log.Write("nsMailDotCom.js - loginOnloadHandler - domain - " + aszTempDomain[0]); 
            
            //get cookies
            try
            {
                var szCookies =  httpChannel.getResponseHeader("Set-Cookie");
                mainObject.Log.Write("nsMailDotCom.js - loginOnloadHandler - received cookies \n" + szCookies);  
                mainObject.m_oCookies.addCookie( aszTempDomain[0], szCookies); 
            }
            catch(e)
            {
                mainObject.Log.Write("nsMailDotCom.js - loginOnloadHandler - no cookies found"); 
            } 
            
            var ios=Components.classes["@mozilla.org/network/io-service;1"].
                                    getService(Components.interfaces.nsIIOService);

            //bounce handler
            if ( httpChannel.responseStatus == 302 || httpChannel.responseStatus == 301)
            {
                var bBounce = mainObject.bounce(httpChannel, mainObject.loginOnloadHandler);
                if (!bBounce)throw new Error("Bounce Handler failed");
                return true;   
            }
            
            //ads handler
            if (httpChannel.URI.spec.search(/intr.main/)!=-1)
            { 
                var bAd = mainObject.ads(szResponse, mainObject.loginOnloadHandler);
                if (!bAd)throw new Error("Ad Handler failed");
                return true;
            }
            
                       
            //page code                                
            switch (mainObject.m_iStage)
            {
                case 0: //refresh page
                    var szRefreshURI = szResponse.match(patternMailRefresh)[1];
                    mainObject.Log.Write("nsMailDotCom.js - loginOnloadHandler - Refresh URI " + szRefreshURI);
                    var szURL = ios.newURI(szRefreshURI,null,null).prePath;
                    var aszHost = szURL.match(/[^\.\/]+\.[^\.\/]+$/);  
                    var aszCookie = mainObject.m_oCookies.findCookie(aszHost);
           
                    var bResult = mainObject.httpConnection(szRefreshURI, 
                                                      "GET", 
                                                      null, 
                                                      aszCookie,
                                                      mainObject.loginOnloadHandler);
                                        
                    if (!bResult) throw new Error("httpConnection returned false");
                    mainObject.m_iStage++;
                break;
                
                case 1: //login page
                    //get login form
                    var szForm= szResponse.match(patternMailDotComLoginForm)[0];
                    if (!szForm) 
                        throw new Error("error parsing mail.com login web page");
                    mainObject.Log.Write("nsMailDotCom.js - loginOnloadHandler - form " + szForm );
                    
                    //get login URI
                    var szLoginURI= szForm.match(patternMailDotComLoginURI)[1];
                    mainObject.Log.Write("nsMailDotCom.js - loginOnloadHandler - login uri " + szLoginURI);
                
                    //get login input form
                    var aszLoginInput= szForm.match(patternMailDotComLoginInput);
                    mainObject.Log.Write("nsMailDotCom.js - loginOnloadHandler - login input " + aszLoginInput);
                    
                    //login data 
                    var szData="";
                    for (i=0; i<aszLoginInput.length; i++)
                    {
                        var szTempData="";
                                                  
                        var szName=aszLoginInput[i].match(patternMailDotComName)[1];
                        szName = szName.replace(/"/gm,"");
                        szName = szName.replace(/'/gm,"");
                        mainObject.Log.Write("nsMailDotCom.js - loginOnloadHandler - name " + szName);
                
                        if (szName.search(/^login$/i)!=-1)
                        {
                            szTempData+= szName + "=" + encodeURIComponent(mainObject.m_szUserName);
                        }
                        else if (szName.search(/password/i)!=-1)
                        {
                            szTempData+= szName + "=" + encodeURIComponent(mainObject.m_szPassWord);
                        }
                        else if (szName.search(/siteselected/i)!=-1)
                        {
                            if(aszLoginInput[i].search(/checked/i)!=-1)
                            {
                                var szValue=aszLoginInput[i].match(patternMailDotComValue)[1];
                                szValue = szValue.replace(/"/gm,"");
                                szValue = szValue.replace(/'/gm,"");  
                                szValue = encodeURIComponent(szValue);
                                mainObject.Log.Write("nsMailDotCom.js - loginOnloadHandler - value " + szValue);
                                szTempData+= szName + "=" + szValue;
                            }
                        }
                        else
                        {
                            var szValue=aszLoginInput[i].match(patternMailDotComValue)[1];
                            szValue = szValue.replace(/"/gm,"");
                            szValue = szValue.replace(/'/gm,"");
                            szValue = encodeURIComponent(szValue);  
                            mainObject.Log.Write("nsMailDotCom.js - loginOnloadHandler - value " + szValue);
                            szTempData+= szName + "=" +szValue;     
                        }
                                                    
                        if (i<aszLoginInput.length-1) szTempData+="&";
                        mainObject.Log.Write("nsMailDotCom.js - loginOnloadHandler - tempvalue " + szTempData);
                        szData+=szTempData;
                    }
                    
                    mainObject.Log.Write("nsMailDotCom.js - loginOnloadHandler - data " + szData);
                    
                    //construct fake cookie
                    var szFakeCookie = "loginName2=" + encodeURIComponent(mainObject.m_szUserName)+ "; sitetype=normal;";
    
                    var bResult = mainObject.httpConnection(szLoginURI,
                                                            "POST", 
                                                            szData, 
                                                            szFakeCookie,
                                                            mainObject.loginOnloadHandler);
                                                
                    if (!bResult) throw new Error("httpConnection returned false");
            
                    mainObject.m_iStage++;
                break;
                
                case 2: //frame
                     //get mail box
                    var szMailBox = szResponse.match(patternMailDotComFrame)[1];
                    if (!szMailBox) 
                        throw new Error("error parsing mail.com login web page");
                    mainObject.Log.Write("nsMailDotCom.js - loginOnloadHandler - mailbox " + szMailBox);
                
                    var szURL = ios.newURI(szMailBox,null,null).prePath;
                    var aszHost = szURL.match(/[^\.\/]+\.[^\.\/]+$/);  
                    var aszCookie = mainObject.m_oCookies.findCookie(aszHost);
            
                    var bResult = mainObject.httpConnection(szMailBox,
                                                            "GET", 
                                                            null, 
                                                            aszCookie,
                                                            mainObject.loginOnloadHandler);
                                        
                    if (!bResult) throw new Error("httpConnection returned false");
                    mainObject.m_iStage++
                break;
                
                
                case 3://get folder list
                    var szLocation = httpChannel.URI.spec;
                    mainObject.Log.Write("nsMailDotCom.js - loginOnloadHandler - location "+ szLocation);
                    if (szLocation.search(/frontpage.main/)==-1)
                        throw new Error("error logging in");
                    
                    mainObject.m_szLocation = httpChannel.URI.prePath 
                    mainObject.Log.Write("nsMailDotCom.js - loginOnloadHandler - location "+ mainObject.m_szLocation);
                    var szFolder = szResponse.match(patternMailDotComFolders)[1];
                    mainObject.m_szFolderList =  mainObject.m_szLocation + szFolder
                    mainObject.Log.Write("nsMailDotCom.js - loginOnloadHandler - folders "+ mainObject.m_szFolderList);
                    
                    var szURL = ios.newURI(mainObject.m_szFolderList,null,null).prePath;
                    var aszHost = szURL.match(/[^\.\/]+\.[^\.\/]+$/);  
                    var aszCookie = mainObject.m_oCookies.findCookie(aszHost);
            
                    var bResult = mainObject.httpConnection(mainObject.m_szFolderList, 
                                                            "GET", 
                                                            null, 
                                                            aszCookie,
                                                            mainObject.loginOnloadHandler);
                                        
                    if (!bResult) throw new Error("httpConnection returned false");
                    
                    mainObject.m_iStage++;
                break;
                
                
                case 4: //get folder urls
                    var szLocation = httpChannel.URI.spec;
                    mainObject.Log.Write("nsMailDotCom.js - loginOnloadHandler - location "+ szLocation);
                    if (szLocation.search(/folders.mail/)==-1)
                        throw new Error("error logging in");
                   
                    var aszFolderList = szResponse.match(patternMailDotComFolderList);
                    mainObject.Log.Write("nsMailDotCom.js - loginOnloadHandler - folders list "+ aszFolderList);
                        
                    for(i=0; i<aszFolderList.length; i++)
                    {
                        var szHref = aszFolderList[i].match(patternMailDotComFolderURI)[1];
                        mainObject.Log.Write("nsMailDotCom.js - loginOnloadHandler - folders uri "+ szHref);
                        var szName = szHref.match(patternMailDotComFolderName)[1];     
                        mainObject.Log.Write("nsMailDotCom.js - loginOnloadHandler - folders name "+ szName);
                    
                        if (szName.search(/inbox/i)!=-1) //get inbox
                        {
                            mainObject.m_szInboxURI =  szHref; 
                            mainObject.Log.Write("nsMailDotCom.js - loginOnloadHandler - Inbox "+ mainObject.m_szInboxURI);
                        }
                        else if (szName.search(/trash/i)!=-1)//get trash
                        {
                            mainObject.m_szTrashURI =  szHref;
                            mainObject.Log.Write("nsMailDotCom.js - loginOnloadHandler - trash "+ mainObject.m_szTrashURI);
                        }  
                    }
                    
                    //server response
                    mainObject.serverComms("+OK Your in\r\n");
                    mainObject.m_bAuthorised = true;
                break;    
            };
           
            mainObject.Log.Write("nsMailDotCom.js - loginOnloadHandler - END");
        }
        catch(err)
        {
            mainObject.Log.DebugDump("nsMailDotCom.js: loginHandler : Exception : " 
                                          + err.name 
                                          + ".\nError message: " 
                                          + err.message);
                                              
            mainObject.serverComms("-ERR negative vibes\r\n");
        }
    },
    
        
 
    
    //stat 
    //total size is in octets
    getNumMessages : function()
    {
        try
        {
            this.Log.Write("nsMailDotCom.js - getNumMessages - START"); 
            
            if (this.m_szInboxURI == null) return false;
           
            this.Log.Write("nsMailDotCom.js - getNumMessages - Inbox " + this.m_szInboxURI); 
            
            this.m_iStage=0;
            var ios=Components.classes["@mozilla.org/network/io-service;1"].
                                    getService(Components.interfaces.nsIIOService);
                                    
            //set cookies
            var szURL = ios.newURI(this.m_szInboxURI,null,null).prePath;
            var aszHost = szURL.match(/[^\.\/]+\.[^\.\/]+$/); 
            var aszCookie = this.m_oCookies.findCookie(aszHost);
          
            var bResult = this.httpConnection(this.m_szInboxURI, 
                                              "GET", 
                                              null,
                                              aszCookie, 
                                              this.mailBoxOnloadHandler);  
                                              
            if (!bResult) throw new Error("httpConnection returned false");
           
            this.Log.Write("nsMailDotCom.js - getNumMessages - END"); 
            return true;
        }
        catch(e)
        {
            this.Log.DebugDump("nsMailDotCom.js: getNumMessages : Exception : " 
                                          + e.name 
                                          + ".\nError message: " 
                                          + e.message);
            return false;
        }
    },
    
    
    
    
    mailBoxOnloadHandler : function (szResponse ,event , mainObject)
    {
        try
        {
            mainObject.Log.Write("nsMailDotCom.js - mailBoxOnloadHandler - START"); 
            
            mainObject.Log.Write("nsMailDotCom.js - mailBoxOnloadHandler : \n"+ szResponse);  
            
            var httpChannel = event.QueryInterface(Components.interfaces.nsIHttpChannel);
                      
            //check status should be 200.
            mainObject.Log.Write("nsMailDotCom.js - mailBoxOnloadHandler - Mailbox :" + httpChannel.responseStatus);
            if (httpChannel.responseStatus != 200 && httpChannel.responseStatus != 300
                        && httpChannel.responseStatus != 302) 
                throw new Error("error status " + httpChannel.responseStatus);   
            
            var szURL = httpChannel.URI.host;
            mainObject.Log.Write("nsMailDotCom.js - mailBoxOnloadHandler - url - " + szURL);  
            var aszTempDomain = szURL.match(/[^\.\/]+\.[^\.\/]+$/);  
            mainObject.Log.Write("nsMailDotCom.js - mailBoxOnloadHandler - domain - " + aszTempDomain[0]); 
           
           
            var ios=Components.classes["@mozilla.org/network/io-service;1"].
                                    getService(Components.interfaces.nsIIOService);
                                    
            //get cookies
            try
            {
                var szCookies =  httpChannel.getResponseHeader("Set-Cookie");
                mainObject.Log.Write("nsMailDotCom.js - mailBoxOnloadHandler - cookies \n" + szCookies);  
                mainObject.m_oCookies.addCookie( aszTempDomain[0], szCookies); 
            }
            catch(e)
            {
                mainObject.Log.Write("nsMailDotCom.js - mailBoxOnloadHandler - no cookies found"); 
            } 
            
            //bounce handler
            if ( httpChannel.responseStatus == 302 || httpChannel.responseStatus == 301)
            {
                var bBounce = mainObject.bounce(httpChannel, mainObject.mailBoxOnloadHandler);
                if (!bBounce)throw new Error("Bounce Handler failed");
                return;   
            }
            
            //ads handler
            if (httpChannel.URI.spec.search(/intr.main/)!=-1)
            { 
                var bAd = mainObject.ads(szResponse, mainObject.mailBoxOnloadHandler);
                if (!bAd)throw new Error("Ad Handler failed");
                return;
            }
            
              
            //get msg table
            var aszMsgTable = szResponse.match(patternMailDotComMsgTable);
            mainObject.Log.Write("nsMailDotCom.js - mailBoxOnloadHandler - MsgTable " + aszMsgTable );  
            if (aszMsgTable)
            {   
                var aszMSGs = aszMsgTable[0].match(patternMailDotComMsgRows);
                mainObject.Log.Write("nsMailDotCom.js - mailBoxOnloadHandler - MSGs Rows" + aszMSGs ); 
                
                
                if(aszMSGs)
                {
                    for (i=0; i<aszMSGs.length; i++ )
                    {
                        var aszData = aszMSGs[i].match(patternMailDotComMsgData);
                        mainObject.Log.Write("nsMailDotCom.js - mailBoxOnloadHandler - MSG Data" + aszData );
                        
                        var szHref = mainObject.m_szLocation + aszData[1].match(patternMailDotComHref)[1];
                        mainObject.Log.Write("nsMailDotCom.js - mailBoxOnloadHandler - href " + szHref );
                        mainObject.m_aszMsgIDStore.push(szHref);
                        
                        var szSize = aszData[3].match(patternMailDotComSize)[1];
                        mainObject.Log.Write("nsMailDotCom.js - mailBoxOnloadHandler - size " + szSize );
                        var iSize = parseInt(szSize);
                        if (szSize.indexOf('k')!= -1) iSize*=1000;
                        mainObject.Log.Write("nsMailDotCom.js - mailBoxOnloadHandler - msg size :" + i + " " +iSize);
                        mainObject.m_iTotalSize += iSize;
                        mainObject.m_aiMsgSize.push(iSize);    
                    }
                }
            }

            //get delete uri
            if (!mainObject.m_szDeleteURI)
            {
                mainObject.m_szDeleteURI = szResponse.match(patternMailDotComDelete)[1];
                mainObject.Log.Write("nsMailDotCom.js - mailBoxOnloadHandler - delete uri " + mainObject.m_szDeleteURI); 
            }
            
            
            var aszNext = szResponse.match(patternMailDotComNext);
            mainObject.Log.Write("nsMailDotCom.js - mailBoxOnloadHandler - Next Table " + aszNext ); 
             
            if (aszNext)  //get next page
            {
                var szNext =  mainObject.m_szLocation + aszNext[1];
                mainObject.Log.Write("nsMailDotCom.js - mailBoxOnloadHandler - Next URI " + szNext ); 
                
                 //set cookies
                var szURL = ios.newURI(szNext,null,null).prePath;
                var aszHost = szURL.match(/[^\.\/]+\.[^\.\/]+$/);  
                var aszCookie = mainObject.m_oCookies.findCookie(aszHost);
               
                var bResult = mainObject.httpConnection(szNext, 
                                                        "GET", 
                                                        null, 
                                                        aszCookie,
                                                        mainObject.mailBoxOnloadHandler);
                                            
                if (!bResult) throw new Error("httpConnection returned false");
            }
            else  //return msg number
            {
                mainObject.serverComms("+OK "+ mainObject.m_aiMsgSize.length + " " 
                                                + mainObject.m_iTotalSize + "\r\n");
            }
                    
            mainObject.Log.Write("nsMailDotCom.js - MailBoxOnload - END"); 
        }
        catch(err)
        {
             mainObject.Log.DebugDump("nsMailDotCom.js: MailboxOnload : Exception : " 
                                              + err.name 
                                              + ".\nError message: " 
                                              + err.message);
            
             mainObject.serverComms("-ERR negative vibes\r\n");
        }   
    },
 
    
    
   

                     
    //list
    //i'm not downloading the mailbox again. 
    //I hope stat been called first or there's going to be trouble
    getMessageSizes : function() 
    {
        try
        {
            this.Log.Write("nsMailDotCom.js - getMessageSizes - START"); 
                    
            var szPOPResponse = "+OK " + this.m_aiMsgSize.length + " Messages\r\n"; 
            
            for (i = 0; i <  this.m_aiMsgSize.length; i++)
            {
                var iEmailSize = this.m_aiMsgSize[i];
                this.Log.Write("nsMailDotCom.js - getMessageSizes - Email Size : " +iEmailSize);
        
                szPOPResponse+=(i+1) + " " + iEmailSize + "\r\n";  
            }
            szPOPResponse += ".\r\n";
            
            this.serverComms(szPOPResponse);
            this.Log.Write("nsMailDotCom.js - getMessageSizes - END"); 
            return true;
        }
        catch(e)
        {
            this.Log.DebugDump("nsMailDotCom.js: getMessageSizes : Exception : " 
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
            this.Log.Write("nsMailDotCom.js - getMessageIDs - START"); 
                
            var szPOPResponse = "+OK " + this.m_aszMsgIDStore.length + " Messages\r\n";
            for (i = 0; i <  this.m_aszMsgIDStore.length; i++)
            {
                var szEmailURL = this.m_aszMsgIDStore[i];
                this.Log.Write("nsMailDotCom.js - getMessageIDs - Email URL : " +szEmailURL);
                var szEmailID = szEmailURL.match(patternMailDotComMsgId)[1];                   
                this.Log.Write("nsMailDotCom.js - getMessageIDs - IDS : " +szEmailID);    
                szPOPResponse+=(i+1) + " " + szEmailID + "\r\n";
            }
            szPOPResponse += ".\r\n";
            this.serverComms(szPOPResponse);           
          
            this.Log.Write("nsMailDotCom.js - getMessageIDs - END"); 
            return true;
        }
        catch(e)
        {
            this.Log.DebugDump("nsMailDotCom.js: getMessageIDs : Exception : " 
                                          + e.name 
                                          + ".\nError message: " 
                                          + e.message);
            return false;
        }
    },
      




    //retr
    getMessage : function( lID)
    {
        try
        {
            this.Log.Write("nsMailDotCom.js - getMessage - START"); 
            this.Log.Write("nsMailDotCom.js - getMessage - msg num " + lID); 
           
            //get msg id
            var szHref = this.m_aszMsgIDStore[lID-1];
            this.Log.Write("nsMailDotCom.js - getMessage - msg id" + szHref); 
            this.m_szMSGID = szHref.match(patternMailDotComMsgId)[1];
            var szMsgURI = this.m_szLocation;
            szMsgURI += "/scripts/mail/mesg.mail";
            szMsgURI += "?folder=INBOX&msg_uid=" + this.m_szMSGID+"&mhead=f&print=1";
            
            var ios=Components.classes["@mozilla.org/network/io-service;1"].
                                    getService(Components.interfaces.nsIIOService);
           
            //set cookies
            var szURL = ios.newURI(szMsgURI,null,null).prePath;
            var aszHost = szURL.match(/[^\.\/]+\.[^\.\/]+$/); 
            var aszCookie = this.m_oCookies.findCookie(aszHost);
            this.Log.Write("nsMailDotCom.js - getNumMessages - cookies - "+ aszCookie);
             
            this.m_iStage = 0;   
            //get msg from MailDotCom
            var bResult = this.httpConnection(szMsgURI, 
                                              "GET", 
                                              null,
                                              aszCookie, 
                                              this.emailOnloadHandler);  
                                           
            if (!bResult) throw new Error("httpConnection returned false"); 
             
            this.Log.Write("m_MailDotComLog.js - getMessage - END"); 
            return true;
        }
        catch(e)
        {
             this.Log.DebugDump("nsMailDotCom.js: getMessage : Exception : " 
                                          + e.name + 
                                          ".\nError message: " 
                                          + e.message);
            return false;
        }
    },    
    
    
    emailOnloadHandler : function (szResponse ,event , mainObject)
    {
        try
        {
            mainObject.Log.Write("nsMailDotCom.js - emailOnloadHandler - START");
            
            mainObject.Log.Write("nsMailDotCom.js - emailOnloadHandler - msg :\n" + szResponse); 
           
            var httpChannel = event.QueryInterface(Components.interfaces.nsIHttpChannel);
                      
            //check status should be 200.
            mainObject.Log.Write("nsMailDotCom.js - emailOnloadHandler - msg code :" + httpChannel.responseStatus);
            if (httpChannel.responseStatus != 200 && httpChannel.responseStatus != 302) 
                throw new Error("error status " + httpChannel.responseStatus);   
            
            
            var ios=Components.classes["@mozilla.org/network/io-service;1"].
                                    getService(Components.interfaces.nsIIOService);
            
            //bounce handler
            if ( httpChannel.responseStatus == 302 || httpChannel.responseStatus == 301)
            {
                var bBounce = mainObject.bounce(httpChannel, mainObject.emailOnloadHandler);
                if (!bBounce)throw new Error("Bounce Handler failed");
                return;   
            }
            
            //ads handler
            if (httpChannel.URI.spec.search(/intr.main/)!=-1)
            { 
                var bAd = mainObject.ads(szResponse, mainObject.emailOnloadHandler);
                if (!bAd)throw new Error("Ad Handler failed");
                return;
            }
           
                       
            //every thing else
            switch (mainObject.m_iStage)
            {
                case 0: //parse email web page
                    mainObject.m_szHeaders = "";
                     
                    //get message block
                    var aszMSG = szResponse.match(patternMailDotComMSG);
                    mainObject.Log.Write("nsMailDotCom.js - emailOnloadHandler - MSG block :" +aszMSG);
                   
                    //get header block
                    var szHeaderBlock = aszMSG[0].match(patternMailDotComHeaders);
                    mainObject.Log.Write("nsMailDotCom.js - emailOnloadHandler - Header block :" +szHeaderBlock);
                    
                    //get headers   
                    var aszRawHeaders = szHeaderBlock[1].split(/<BR>/i);         
                    mainObject.Log.Write("nsMailDotCom.js - emailOnloadHandler -RawHeaders :" +aszRawHeaders);
                   
                    //process headers
                    if (aszRawHeaders)
                    {
                        for (i=0; i<aszRawHeaders.length; i++)
                        {
                            try
                            {
                                var aszHeaders = aszRawHeaders[i].match(patternMailDotComOtherHeaderData);
                                mainObject.Log.Write("nsMailDotCom.js - emailOnloadHandler - header :" +aszHeaders);
                                aszHeaders[2] = aszHeaders[2].replace(/\r/," ");
                                aszHeaders[2] = aszHeaders[2].replace(/\n/," ");
                                
                                var szHeader = aszHeaders[1] + aszHeaders[2] + "\r\n";  
                                mainObject.m_szHeaders += szHeader;
                                mainObject.Log.Write("nsMailDotCom.js - emailOnloadHandler - other headers :" +szHeader);
                            }
                            catch(err)
                            {
                            }
                        }
                    }
                    
                    mainObject.m_szHeaders = mainObject.m_szHeaders.replace(/<B>/g,"");
                    mainObject.m_szHeaders = mainObject.m_szHeaders.replace(/<\/B>/g,"");
                    mainObject.m_szHeaders = mainObject.m_szHeaders.replace(/<BR>/g,"");
                    mainObject.m_szHeaders = mainObject.m_szHeaders.replace(/&#34;/g,"\"");
                    mainObject.m_szHeaders = mainObject.m_szHeaders.replace(/&lt;/g,"<");
                    mainObject.m_szHeaders = mainObject.m_szHeaders.replace(/&gt;/g,">");
                    mainObject.Log.Write("nsMailDotCom.js - emailOnloadHandler - headers :" +mainObject.m_szHeaders);
                  
                    //get message body
                    var szBodyURI = mainObject.m_szLocation;
                    szBodyURI += "/getattach/message.eml?folder=INBOX&.intr=1&";
                    szBodyURI += "msg_uid=" + mainObject.m_szMSGID;
                    szBodyURI +="&partsno=0";
                                        
                    mainObject.Log.Write("nsMailDotCom.js - emailOnloadHandler - download body uri " +szBodyURI);
    
                    var szURL = ios.newURI(szBodyURI,null,null).prePath;
                    var aszHost = szURL.match(/[^\.\/]+\.[^\.\/]+$/);  
                    var aszCookie = mainObject.m_oCookies.findCookie(aszHost);
                
                    var bResult = mainObject.httpConnection(szBodyURI, 
                                                            "GET", 
                                                            null, 
                                                            aszCookie,
                                                            mainObject.emailOnloadHandler);
                             
                    if (!bResult) throw new Error("httpConnection returned false");
                    mainObject.m_iStage++;       
                  
                break;
                
                
                case 1: //download attachments
                    mainObject.Log.Write("nsMailDotCom.js - emailOnloadHandler - attach downloaded");
                                       
                    var szEmail = mainObject.m_szHeaders;
                    szEmail +="\r\n"  //end of headers
                    szEmail += szResponse;                         
                    szEmail += "\r\n\r\n"; //end of message
                   
                    szEmail = szEmail.replace(/^\./mg,"..");    //bit padding 
                    if (szEmail.lastIndexOf("\r\n") == -1) szEmail += "\r\n";
                    szEmail += ".\r\n";  //msg end 
                                                                                                                      
                    var szPOPResponse = "+OK " + szEmail.length + "\r\n";                     
                    szPOPResponse += szEmail;
                                                 
                    mainObject.serverComms(szPOPResponse); 
                break;
            };  
          
            mainObject.Log.Write("nsMailDotCom.js - emailOnloadHandler - END");      
        }
        catch(err)
        {
            mainObject.Log.DebugDump("nsMailDotCom.js: emailOnloadHandler : Exception : " 
                                          + err.name 
                                          + ".\nError message: " 
                                          + err.message);
            
            mainObject.serverComms("-ERR negative vibes\r\n");
        }
    },
    

    
    //dele
    deleteMessage : function(lID)
    {
        try
        {
            this.Log.Write("nsMailDotCom.js - deleteMessage - START");  
            this.Log.Write("nsMailDotCom.js - deleteMessage - id " + lID ); 
               
            //create URL
            var szDest = this.m_aszMsgIDStore[lID-1];
            this.Log.Write("nsMailDotCom.js - deleteMessage - id " + szDest );
            
            var szPath = this.m_szLocation + this.m_szDeleteURI;
            this.Log.Write("nsMailDotCom.js - deleteMessage - URI " + szPath );
             
            var szID = szDest.match(patternMailDotComMsgId)[1];
            var szData = "folder=INBOX&order=Newest&changeview=0&mview=a&mstart=1";
            szData += "&delete_selected=yes&move_selected=&flag_selected=&flags=&";
            szData += "views=a&folder_name=Trash&";
            szData += "sel_"+ szID +"=ON&";
            szData += "matchfield=fr&mpat=";
            this.Log.Write("nsMailDotCom.js - deleteMessage - data - "+szData);
                      
            var ios=Components.classes["@mozilla.org/network/io-service;1"].
                                    getService(Components.interfaces.nsIIOService);
                                   
            //set cookies
            var szURL = ios.newURI(szPath,null,null).prePath;
            var aszHost = szURL.match(/[^\.\/]+\.[^\.\/]+$/); 
            var aszCookie = this.m_oCookies.findCookie(aszHost);
                    
            //send request
            var bResult = this.httpConnection(szPath, 
                                              "POST", 
                                              szData,
                                              aszCookie, 
                                              this.deleteMessageOnloadHandler);  
                                           
            if (!bResult) throw new Error("httpConnection returned false");            
          
          
            this.Log.Write("nsMailDotCom.js - deleteMessage - END");     
            return true;
        }
        catch(e)
        {
            this.Log.DebugDump("nsMailDotCom.js: deleteMessage : Exception : " 
                                          + e.name + 
                                          ".\nError message: " 
                                          + e.message);
            return false;
        } 
    },



    
    deleteMessageOnloadHandler : function (szResponse ,event , mainObject)
    {
        try
        {
            mainObject.Log.Write("nsMailDotCom.js - deleteMessageOnload - START");    
            mainObject.Log.Write("nsMailDotCom.js - deleteMessageOnload :\n" + szResponse); 
           
            var httpChannel = event.QueryInterface(Components.interfaces.nsIHttpChannel);
           
            //check status should be 200.
            mainObject.Log.Write("nsMailDotCom.js - deleteMessageOnload :" + httpChannel.responseStatus);
            if (httpChannel.responseStatus != 200 ) 
                throw new Error("error status " + httpChannel.responseStatus);   
                 
            mainObject.serverComms("+OK its history\r\n");    
            mainObject.Log.Write("nsMailDotCom.js - deleteMessageOnload - END");      
        }
        catch(e)
        {
            mainObject.Log.DebugDump("nsMailDotCom.js: deleteMessageOnload : Exception : " 
                                              + e.name 
                                              + ".\nError message: " 
                                              + e.message);
            mainObject.serverComms("-ERR negative vibes\r\n");
        }
    },
    



    //cookies are deleted when the connection ends so i dont need to download pages
    logOut : function()
    {
        try
        {
            this.Log.Write("nsMailDotCom.js - logOUT - START"); 
            
            var oPref = new Object();
            oPref.Value = null;
            var  WebMailPrefAccess = new WebMailCommonPrefAccess();
            WebMailPrefAccess.Get("bool","maildotcom.bEmptyTrash",oPref);
        
            if (!oPref.Value)
            {
                this.m_bAuthorised = false;
                this.serverComms("+OK Your Out\r\n");
                return true;
            }
            
            //create URL
            var szPath = this.m_szLocation + "/scripts/mail/Outblaze.mail?emptytrash=1&current_folder=Trash";
            this.Log.Write("nsMailDotCom.js - logOUT - empty trash " + szPath );
           
            var ios=Components.classes["@mozilla.org/network/io-service;1"].
                                    getService(Components.interfaces.nsIIOService);
                                   
            //set cookies
            var szURL = ios.newURI(szPath,null,null).prePath;
            var aszHost = szURL.match(/[^\.\/]+\.[^\.\/]+$/); 
            var aszCookie = this.m_oCookies.findCookie(aszHost);
                    
            //send request
            var bResult = this.httpConnection(szPath, 
                                              "GET", 
                                              null,
                                              aszCookie, 
                                              this.logOutOnloadHandler);  
                                           
            if (!bResult) throw new Error("httpConnection returned false"); 
           
                                               
            this.Log.Write("nsMailDotCom.js - logOUT - END");  
            return true;
        }
        catch(e)
        {
            this.Log.DebugDump("nsMailDotCom.js: logOUT : Exception : " 
                                      + e.name 
                                      + ".\nError message: " 
                                      + e.message);
            return false;
        }
    },  
    
    
    
    logOutOnloadHandler : function (szResponse ,event , mainObject)
    {
        try
        {
            mainObject.Log.Write("nsMailDotCom.js - logOutOnloadHandler - START");    
            mainObject.Log.Write("nsMailDotCom.js - logOutOnloadHandler :\n" + szResponse); 
           
            var httpChannel = event.QueryInterface(Components.interfaces.nsIHttpChannel);
           
            //check status should be 200.
            mainObject.Log.Write("nsMailDotCom.js - logOutOnloadHandler :" + httpChannel.responseStatus);
            if (httpChannel.responseStatus != 200 && httpChannel.responseStatus != 302 
                   && httpChannel.responseStatus != 301 ) 
                throw new Error("error status " + httpChannel.responseStatus);   
            
            //bounce handler
            if ( httpChannel.responseStatus == 302 || httpChannel.responseStatus == 301)
            {
                var bBounce = mainObject.bounce(httpChannel, mainObject.logOutOnloadHandler);
                if (!bBounce)throw new Error("Bounce Handler failed");
                return;   
            }
            
            //ads handler
            if (httpChannel.URI.spec.search(/intr.main/)!=-1)
            { 
                var bAd = mainObject.ads(szResponse, mainObject.logOutOnloadHandler);
                if (!bAd)throw new Error("Ad Handler failed");
                return;
            }
                 
            mainObject.m_bAuthorised = false;
            mainObject.serverComms("+OK Your Out\r\n");
               
            mainObject.Log.Write("nsMailDotCom.js - logOutOnloadHandler - END");      
        }
        catch(e)
        {
            mainObject.Log.DebugDump("nsMailDotCom.js: logOutOnloadHandler : Exception : " 
                                              + e.name 
                                              + ".\nError message: " 
                                              + e.message);
            mainObject.serverComms("-ERR negative vibes\r\n");
        }
    },
    
     
     
    ads : function (szResponse, callback) 
    {
        try
        {
            this.Log.Write("nsMailDotCom.js - ads - START");
            var szDataPage = szResponse.match(patternMailDotComAddURI)[1];
            this.Log.Write("nsMailDotCom.js - ads - URI " + szDataPage);
            
            this.m_BeforeAdsCallback = callback;
            
            var ios=Components.classes["@mozilla.org/network/io-service;1"].
                                    getService(Components.interfaces.nsIIOService);
            
            var szURL = ios.newURI(szDataPage,null,null).prePath;
            var aszHost = szURL.match(/[^\.\/]+\.[^\.\/]+$/);  
            var aszCookie = this.m_oCookies.findCookie(aszHost);
    
            var bResult = this.httpConnection(szDataPage, 
                                              "GET", 
                                              null, 
                                              aszCookie,
                                              this.adsHandler);
                     
            if (!bResult) throw new Error("httpConnection returned false");
            
            this.Log.Write("nsMailDotCom.js - ads - END");
            return true;
        }
        catch(err)
        {
            this.Log.DebugDump("nsMailDotCom.js: ads : Exception : " 
                                              + err.name 
                                              + ".\nError message: " 
                                              + err.message);
            return false;
        }
    },
     
     
    adsHandler : function (szResponse ,event , mainObject)  
    {
        try
        {
            mainObject.Log.Write("nsMailDotCom.js - adsHandler - START");
            var szMailBox = szResponse.match(patternMailDotComFrame)[1];
            if (!szMailBox) 
                throw new Error("error parsing mail.com login web page");
            mainObject.Log.Write("nsMailDotCom.js - adsHandler - mailbox " + szMailBox);
            
            var ios=Components.classes["@mozilla.org/network/io-service;1"].
                                    getService(Components.interfaces.nsIIOService);
                                    
            var szURL = ios.newURI(szMailBox,null,null).prePath;
            var aszHost = szURL.match(/[^\.\/]+\.[^\.\/]+$/);  
            var aszCookie = mainObject.m_oCookies.findCookie(aszHost);
    
            var bResult = mainObject.httpConnection(szMailBox, 
                                                    "GET", 
                                                    null, 
                                                    aszCookie,
                                                    mainObject.m_BeforeAdsCallback);
                                
            if (!bResult) throw new Error("httpConnection returned false");
        
            mainObject.Log.Write("nsMailDotCom.js - adsHandler - START");
        }
        catch(err)
        {
            mainObject.Log.DebugDump("nsMailDotCom.js: deleteMessageOnload : Exception : " 
                                              + err.name 
                                              + ".\nError message: " 
                                              + err.message);
            mainObject.serverComms("-ERR negative vibes\r\n");
        }
    },
    
    
    bounce : function (httpChannel, callback)
    {
        try
        {
            this.Log.Write("nsMailDotCom.js - bounce - START");
            try
            {
                var szLocation =  httpChannel.getResponseHeader("Location");
                this.Log.Write("nsMailDotCom.js - bounce - location \n" + szLocation);  
            }
            catch(e)
            {
                throw new Error("Location header not found")
            } 
        
            //set cookies
            var ios=Components.classes["@mozilla.org/network/io-service;1"].
                                    getService(Components.interfaces.nsIIOService);
            var szURL = ios.newURI(szLocation,null,null).prePath;
            var aszHost = szURL.match(/[^\.\/]+\.[^\.\/]+$/);  
            var aszCookie = this.m_oCookies.findCookie(aszHost);
           
            var bResult = this.httpConnection(szLocation, 
                                              "GET", 
                                              null, 
                                              aszCookie,
                                              callback);
                                        
            if (!bResult) throw new Error("httpConnection returned false");
            this.Log.Write("nsMailDotCom.js - bounce - END");
            return true;
        }
        catch(err)
        {
            this.Log.DebugDump("nsMailDotCom.js: bounce : Exception : " 
                                              + err.name 
                                              + ".\nError message: " 
                                              + err.message);
            return false
        }
    },
    
    /////////////////////    Comms Code /////////////////////////////////////////
     
    serverComms : function (szMsg)
    {
        try
        { 
            this.Log.Write("nsMailDotCom.js - serverComms - START");
            this.Log.Write("nsMailDotCom.js - serverComms msg " + szMsg);
            var iCount = this.m_oResponseStream.write(szMsg,szMsg.length);
            this.Log.Write("nsMailDotCom.js - serverComms sent count: " + iCount 
                                                        +" msg length: " +szMsg.length);
            this.Log.Write("nsMailDotCom.js - serverComms - END");  
        }
        catch(e)
        {
            this.Log.DebugDump("nsMailDotCom.js: serverComms : Exception : " 
                                              + e.name 
                                              + ".\nError message: " 
                                              + e.message);
        }
    },
   

    
    
    httpConnection : function (szURL, szType, szData, szCookies ,callBack)
    {
        try
        {
            this.Log.Write("nsMailDotCom.js - httpConnection - START");   
            this.Log.Write("nsMailDotCom.js - httpConnection - " + szURL + "\n"
                                                                 + szType + "\n"
                                                                 + szCookies + "\n"
                                                                 + szData );  
            
            
            var ioService = Components.classes["@mozilla.org/network/io-service;1"].
                                    getService(Components.interfaces.nsIIOService);
      
            var uri = ioService.newURI(szURL, null, null);
            var channel = ioService.newChannelFromURI(uri);
            var HttpRequest = channel.QueryInterface(Components.interfaces.nsIHttpChannel);                                     
            HttpRequest.redirectionLimit = 0; //stops automatic redirect handling
            
            var component = this;             
            
              
            //set cookies
            if (szCookies)
            {
                this.Log.Write("nsMailDotCom.js - httpConnection - adding cookie \n"+ szCookies);
                HttpRequest.setRequestHeader("x-CookieHack", "Hacker\r\nCookie: "  + szCookies , false);
            }
           
           
            //set data
            if (szData)
            {
                this.Log.Write("nsMailDotCom.js - httpConnection - adding data");
                
                var uploadStream = Components.classes["@mozilla.org/io/string-input-stream;1"]
                                    .createInstance(Components.interfaces.nsIStringInputStream);         
                uploadStream.setData(szData, szData.length);
        
                var uploadChannel = channel.QueryInterface(Components.interfaces.nsIUploadChannel);
                uploadChannel.setUploadStream(uploadStream, "application/x-www-form-urlencoded", -1); 
            }
            HttpRequest.requestMethod = szType;
            
           // HttpRequest.setRequestHeader("User-Agent", "Mozilla/5.0 (Windows; U; Windows NT 5.1;en-US; rv:1.7.5) Gecko/20041206 Thunderbird/1.0" , false);
           // HttpRequest.setRequestHeader("Accept-Language", "en-US" , false);
           
            
            var listener = new this.downloadListener(callBack, this);
            channel.asyncOpen(listener, null);  
            
            this.Log.Write("nsMailDotCom.js - httpConnection - END"); 
            
            return true;  
        }
        catch(e)
        {
            this.Log.DebugDump("nsMailDotCom.js: httpConnection : Exception : " 
                                              + e.name 
                                              + ".\nError message: " 
                                              + e.message);
            return false;
        }
    },
    
    
    downloadListener : function(CallbackFunc, parent) 
    {
        return ({
            m_data : "",
            
            onStartRequest : function (aRequest, aContext) 
            {  
                this.m_data = "";
            },
            
            
            onDataAvailable : function (aRequest, aContext, aStream, aSourceOffset, aLength)
            {               
                var scriptableInputStream = Components.classes["@mozilla.org/scriptableinputstream;1"]
                                 .createInstance(Components.interfaces.nsIScriptableInputStream);
                scriptableInputStream.init(aStream);
            
                this.m_data += scriptableInputStream.read(aLength);
            },
            
            
            onStopRequest : function (aRequest, aContext, aStatus) 
            {
                CallbackFunc(this.m_data, aRequest, parent);
            },
            
            
            QueryInterface : function(aIID) 
            {
                if (aIID.equals(Components.interfaces.nsIStreamListener) ||
                          aIID.equals(Components.interfaces.nsISupportsWeakReference) ||
                          aIID.equals(Components.interfaces.nsIAlertListener) ||
                          aIID.equals(Components.interfaces.nsISupports))
                    return this;
                
                throw Components.results.NS_NOINTERFACE;
            }            
        });
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
var nsMailDotComFactory = new Object();

nsMailDotComFactory.createInstance = function (outer, iid)
{
    if (outer != null) throw Components.results.NS_ERROR_NO_AGGREGATION;
    
    if (!iid.equals(nsMailDotComClassID) && !iid.equals(Components.interfaces.nsISupports))
        throw Components.results.NS_ERROR_INVALID_ARG;
    
    return new nsMailDotCom();
}


/******************************************************************************/
/* MODULE */
var nsMailDotComModule = new Object();

nsMailDotComModule.registerSelf = function(compMgr, fileSpec, location, type)
{
    compMgr = compMgr.QueryInterface(Components.interfaces.nsIComponentRegistrar);
    compMgr.registerFactoryLocation(nsMailDotComClassID,
                                    "MailDotComComponent",
                                    nsMailDotComContactID, 
                                    fileSpec,
                                    location, 
                                    type);
}


nsMailDotComModule.unregisterSelf = function(aCompMgr, aFileSpec, aLocation)
{
    aCompMgr = aCompMgr.QueryInterface(Components.interfaces.nsIComponentRegistrar);
    aCompMgr.unregisterFactoryLocation(nsMailDotComClassID, aFileSpec);
}

 
nsMailDotComModule.getClassObject = function(compMgr, cid, iid)
{
    if (!cid.equals(nsMailDotComClassID))
        throw Components.results.NS_ERROR_NO_INTERFACE;

    if (!iid.equals(Components.interfaces.nsIFactory))
        throw Components.results.NS_ERROR_NOT_IMPLEMENTED;

    return nsMailDotComFactory;
}


nsMailDotComModule.canUnload = function(compMgr)
{
    return true;
}
/******************************************************************************/


function NSGetModule(compMgr, fileSpec)
{
    return nsMailDotComModule; 
}
