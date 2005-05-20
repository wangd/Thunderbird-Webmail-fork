/*****************************  Globals   *************************************/                 
const nsMailDotComClassID = Components.ID("{304bef20-b908-11d9-9669-0800200c9a66}");
const nsMailDotComContactID = "@mozilla.org/MailDotCom;1";
const ExtMailDotComGuid = "{1ad5b3b0-b908-11d9-9669-0800200c9a66}";


const patternMailDotComLoginForm =/<form.*?>[\S\d\s\r\n]*?<\/form>/igm;
const patternMailDotComLoginURI = /action="(.*?)"/;
const patternMailDotComLoginInput = /<input type=(?!"submit").*?>/igm;
const patternMailDotComType = /type="(.*?)"/i;
const patternMailDotComValue = /value="(.*?)"/i;
const patternMailDotComName = /name="(.*?)"/i;
const patternMailDotComFrame = /<frame src="(.*?)" name="mailcomframe" SCROLLING=AUTO">/;
const patternMailDotComFolders = /href="(.*?folders.mail.*?)".*?class="nltxt"/;
const patternMailDotComFolderList = /href=".*?".*?class="fb"/gm;
const patternMailDotComFolderURI= /href="(.*?)"/;
const patternMailDotComFolderName=/&folder=(.*?)$/;
const patternMailDotComAddURI = /document.location.href="(.*?)"/;
const patternMailDotComMsgTable = /<tbody>[\S\s\D\d]*<\/tbody>/igm;
const patternMailDotComNext = /<a href="(.*?mailbox.mail.*?)" class="fl">Next<\/a>/;
const patternMailDotComDelete = /<form action="(\/scripts\/mail\/mailbox.mail\?.ob=.*?)" method="POST" name="inBoxMessages">/;
const patternMailDotComMsgRows = /<tr.*?>[[\S\d\s\r\n]*?<\/tr>/igm;
const patternMailDotComMsgData = /<td.*?>[\S\d\s\r\n]*?<\/td>/igm;
const patternMailDotComHref = /href="(.*?)"/i;
const patternMailDotComSize = />(.*?)</;
const patternMailDotComMsgId = /msg_uid=(.*?)&/;
const patternMailDotComRawHeaders = /<td class="stb"><b>([\S\d\s\r\n]*?)<\/table>/igm;
const patternMailDotComFromHeader = /<font.*class="fst">.*?<\/font>/igm;
const patternMailDotComFromData =/<font.*class="fst">(.*?)<\/font>/;
const patternMailDotComStdHeaders =/<font.*class="ft">[\S\d\s]*?<\/font>[\S\d\s]*?<font.*class="ft">[\S\d\s]*?<\/font>/igm;
const patternMailDotComStdHeaderData =/<font.*class="ft"><b>(.*?)<\/b><\/font>[\S\d\s]*?<font.*class="ft">(.*?)<\/font>/;
const patternMailDotComOtherHeaders =/<font.*class="ft"><B>[\S\s]*?<\/font>/gm;
const patternMailDotComOtherHeaderDate = /<B>(.*?)<\/B>(.*?)$/;
const patternMailDotComBoundary = /boundary=&#34;(.*?)&#34;/i;
const patternMailDotComMsgTextBody = /<PRE>[\S\s\n]*<\/PRE>/i;
const patternMailDotComAttchments = /<table.*?><tr><td><span.*id="obmessage">([\S\s\n]*)<\/span><\/td><\/tr>/i;
const patternMailDotComAttchHeaders = /<B>.*?<\/B>.*?<BR>/igm;
const patternMailDotComAttchHeadersData = /<B>(.*?)<\/B>(.*?)<BR>/i;
const patternMailDotComAttchBody = /^<BR>$([\S\s\n]*)/igm;
const patternMailDotComHTMLBody = /<XHTML>[\S\s\n]*<\/XHTML>/i;
const patternMailDotComAttachURI =/"(.*?getattch.mail.*?)"/i;
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
            scriptLoader.loadSubScript("chrome://maildotcom/content/MailDotCom-AttachmentData.js");
            scriptLoader.loadSubScript("chrome://web-mail/content/common/CommonPrefs.js");
        }
        
        var date = new Date();
        
        var  szLogFileName = "nsMailDotCom Log - " + date.getHours()+ "-" 
                                    + date.getMinutes() + "-"+ date.getUTCMilliseconds() +" -";
        this.m_MailDotComLog = new DebugLog("webmail.logging.comms", ExtMailDotComGuid, szLogFileName); 
        
        this.m_MailDotComLog.Write("nsMailDotCom.js - Constructor - START");   
       
        this.m_bAuthorised = false;
        this.m_szUserName = null;   
        this.m_szPassWord = null; 
        this.m_oResponseStream = null; 
        this.m_oCookies = new CookieHandler(this.m_MailDotComLog); 
        this.m_iStage = 0;
        
        this.m_szLocation=null;
        this.m_szFolderList=null;
        this.m_szInboxURI=null;
        this.m_szTrashURI=null;
        this.m_szDeleteURI = null;
        this.m_bAds=false;
        this.m_iBeforeAdsStage = 0;
        this.m_iTotalSize = 0; 
        this.m_aiMsgSize = new Array();
        this.m_aszMsgIDStore = new Array();
        
        this.m_szHeaders = null;
        this.m_szBody = null;
        this.m_szBoundary = null;
        this.m_Attachment= new Array();
        this.m_AttachmentRaw = new Array();
        
                                             
        this.m_MailDotComLog.Write("nsMailDotCom.js - Constructor - END");  
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
            this.m_MailDotComLog.Write("nsMailDotCom.js - logIN - START");   
            this.m_MailDotComLog.Write("nsMailDotCom.js - logIN - Username: " + this.m_szUserName 
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
         
            this.m_MailDotComLog.Write("nsMailDotCom.js - logIN - END");    
            return true;
        }
        catch(e)
        {
            this.m_MailDotComLog.DebugDump("nsMailDotCom.js: logIN : Exception : " 
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
            mainObject.m_MailDotComLog.Write("nsMailDotCom.js - loginOnloadHandler - START"); 
            
            mainObject.m_MailDotComLog.Write("nsMailDotCom.js - loginOnloadHandler : " 
                                         + mainObject.m_iStage + "\n"
                                         + szResponse);  
            
            var httpChannel = event.QueryInterface(Components.interfaces.nsIHttpChannel);
            
            //if this fails we've gone somewhere new
            mainObject.m_MailDotComLog.Write("nsMailDotCom.js - loginOnloadHandler - status :" +httpChannel.responseStatus );
            if (httpChannel.responseStatus != 200 
                        && httpChannel.responseStatus != 302
                                    && httpChannel.responseStatus != 301) 
                throw new Error("return status " + httpChannel.responseStatus);
            
            var szURL = httpChannel.URI.host;
            mainObject.m_MailDotComLog.Write("nsMailDotCom.js - loginOnloadHandler - url - " + szURL);  
            var aszTempDomain = szURL.match(/[^\.\/]+\.[^\.\/]+$/);  
            mainObject.m_MailDotComLog.Write("nsMailDotCom.js - loginOnloadHandler - domain - " + aszTempDomain[0]); 
            
            //get cookies
            try
            {
                var szCookies =  httpChannel.getResponseHeader("Set-Cookie");
                mainObject.m_MailDotComLog.Write("nsMailDotCom.js - loginOnloadHandler - received cookies \n" + szCookies);  
                mainObject.m_oCookies.addCookie( aszTempDomain[0], szCookies); 
            }
            catch(e)
            {
                mainObject.m_MailDotComLog.Write("nsMailDotCom.js - loginOnloadHandler - no cookies found"); 
            } 
            
            var ios=Components.classes["@mozilla.org/network/io-service;1"].
                                    getService(Components.interfaces.nsIIOService);



            //bounce handler
            if ( httpChannel.responseStatus == 302 || httpChannel.responseStatus == 301)
            {
                try
                {
                    var szLocation =  httpChannel.getResponseHeader("Location");
                    mainObject.m_MailDotComLog.Write("nsMailDotCom.js - loginOnloadHandler - location \n" + szLocation);  
                }
                catch(e)
                {
                    throw new Error("Location header not found")
                } 
            
                //set cookies
                var szURL = ios.newURI(szLocation,null,null).prePath;
                var aszHost = szURL.match(/[^\.\/]+\.[^\.\/]+$/);  
                var aszCookie = mainObject.m_oCookies.findCookie(aszHost);
               
                var bResult = mainObject.httpConnection(szLocation, 
                                                        "GET", 
                                                        null, 
                                                        aszCookie,
                                                        mainObject.loginOnloadHandler);
                                            
                if (!bResult) throw new Error("httpConnection returned false");
            }
            else if (httpChannel.URI.spec.search(/intr.main/)!=-1) //ads
            {
                mainObject.m_MailDotComLog.Write("nsMailDotCom.js - loginOnloadHandler - ADS ");
                var szDataPage = szResponse.match(patternMailDotComAddURI)[1];
                mainObject.m_MailDotComLog.Write("nsMailDotCom.js - loginOnloadHandler - URI " + szDataPage);
                
                var szURL = ios.newURI(szDataPage,null,null).prePath;
                var aszHost = szURL.match(/[^\.\/]+\.[^\.\/]+$/);  
                var aszCookie = mainObject.m_oCookies.findCookie(aszHost);
        
                var bResult = mainObject.httpConnection(szDataPage, 
                                                        "GET", 
                                                        null, 
                                                        aszCookie,
                                                        mainObject.loginOnloadHandler);
                
                mainObject.m_bAds=true;
                mainObject.m_iBeforeAdsStage = mainObject.m_iStage;
                mainObject.m_iStage= 1;                    
                if (!bResult) throw new Error("httpConnection returned false");
                return;
            }
            else  //everything else
            {
                //page code                                
                switch (mainObject.m_iStage)
                {
                    case 0: //login page
                        //get login form
                        var szForm= szResponse.match(patternMailDotComLoginForm)[0];
                        if (!szForm) 
                            throw new Error("error parsing mail.com login web page");
                        mainObject.m_MailDotComLog.Write("nsMailDotCom.js - loginOnloadHandler - form " + szForm );
                        
                        //get login URI
                        var szLoginURI= szForm.match(patternMailDotComLoginURI)[1];
                        mainObject.m_MailDotComLog.Write("nsMailDotCom.js - loginOnloadHandler - login uri " + szLoginURI);
                    
                        //get login input form
                        var aszLoginInput= szForm.match(patternMailDotComLoginInput);
                        mainObject.m_MailDotComLog.Write("nsMailDotCom.js - loginOnloadHandler - login input " + aszLoginInput);
                        
                        //login data 
                        var szData="";
                        for (i=0; i<aszLoginInput.length; i++)
                        {
                            var szTempData="";
                                                      
                            var szName=aszLoginInput[i].match(patternMailDotComName)[1];
                            mainObject.m_MailDotComLog.Write("nsMailDotCom.js - loginOnloadHandler - name " + szName);
                    
                            if (szName.search(/login/i)!=-1)
                            {
                                szTempData+= szName + "=" + escape(mainObject.m_szUserName);
                            }
                            else if (szName.search(/password/i)!=-1)
                            {
                                szTempData+= szName + "=" + escape(mainObject.m_szPassWord);
                            }
                            else if (szName.search(/siteselected/i)!=-1)
                            {
                                if(aszLoginInput[i].search(/checked/i)!=-1)
                                {
                                    var szValue=aszLoginInput[i].match(patternMailDotComValue)[1];
                                    mainObject.m_MailDotComLog.Write("nsMailDotCom.js - loginOnloadHandler - value " + szValue);
                                    szTempData+= szName + "=" + szValue;
                                }
                            }
                            else
                            {
                                var szValue=aszLoginInput[i].match(patternMailDotComValue)[1];
                                mainObject.m_MailDotComLog.Write("nsMailDotCom.js - loginOnloadHandler - value " + szValue);
                                szTempData+= szName + "=" + escape(szValue);     
                            }
                                                        
                            if (i<aszLoginInput.length-1) szTempData+="&";
                            mainObject.m_MailDotComLog.Write("nsMailDotCom.js - loginOnloadHandler - tempvalue " + szTempData);
                            szData+=szTempData;
                        }
                        
                        mainObject.m_MailDotComLog.Write("nsMailDotCom.js - loginOnloadHandler - data " + szData);
                        
                        //construct fake cookie
                        var szFakeCookie = "loginName2=" + escape(mainObject.m_szUserName)+ "; sitetype=normal;";
        
                        var bResult = mainObject.httpConnection(szLoginURI, 
                                                                "POST", 
                                                                szData, 
                                                                szFakeCookie,
                                                                mainObject.loginOnloadHandler);
                                                    
                        if (!bResult) throw new Error("httpConnection returned false");
                
                        mainObject.m_iStage++
                    break;
                    
                    case 1: //frame
                         //get mail box
                        var szMailBox = szResponse.match(patternMailDotComFrame)[1];
                        if (!szMailBox) 
                            throw new Error("error parsing mail.com login web page");
                        mainObject.m_MailDotComLog.Write("nsMailDotCom.js - loginOnloadHandler - mailbox " + szMailBox);
                    
                        var szURL = ios.newURI(szMailBox,null,null).prePath;
                        var aszHost = szURL.match(/[^\.\/]+\.[^\.\/]+$/);  
                        var aszCookie = mainObject.m_oCookies.findCookie(aszHost);
                
                        var bResult = mainObject.httpConnection(szMailBox, 
                                                                "GET", 
                                                                null, 
                                                                aszCookie,
                                                                mainObject.loginOnloadHandler);
                                            
                        if (!bResult) throw new Error("httpConnection returned false");
                        
                        if (mainObject.m_bAds)
                        {
                            mainObject.m_bAds = false;
                            mainObject.m_iStage = mainObject.m_iBeforeAdsStage;
                        }
                        else
                            mainObject.m_iStage++
                    break;
                    
                    
                    case 2://get folder list
                        var szLocation = httpChannel.URI.spec;
                        mainObject.m_MailDotComLog.Write("nsMailDotCom.js - loginOnloadHandler - location "+ szLocation);
                        if (szLocation.search(/frontpage.main/)==-1)
                            throw new Error("error logging in");
                        
                        mainObject.m_szLocation = httpChannel.URI.prePath 
                        mainObject.m_MailDotComLog.Write("nsMailDotCom.js - loginOnloadHandler - location "+ mainObject.m_szLocation);
                        var szFolder = szResponse.match(patternMailDotComFolders)[1];
                        mainObject.m_szFolderList =  mainObject.m_szLocation + szFolder
                        mainObject.m_MailDotComLog.Write("nsMailDotCom.js - loginOnloadHandler - folders "+ mainObject.m_szFolderList);
                        
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
                    
                    
                    case 3: //get folder urls
                        var szLocation = httpChannel.URI.spec;
                        mainObject.m_MailDotComLog.Write("nsMailDotCom.js - loginOnloadHandler - location "+ szLocation);
                        if (szLocation.search(/folders.mail/)==-1)
                            throw new Error("error logging in");
                       
                        var aszFolderList = szResponse.match(patternMailDotComFolderList);
                        mainObject.m_MailDotComLog.Write("nsMailDotCom.js - loginOnloadHandler - folders list "+ aszFolderList);
                            
                        for(i=0; i<aszFolderList.length; i++)
                        {
                            var szHref = aszFolderList[i].match(patternMailDotComFolderURI)[1];
                            mainObject.m_MailDotComLog.Write("nsMailDotCom.js - loginOnloadHandler - folders uri "+ szHref);
                            var szName = szHref.match(patternMailDotComFolderName)[1];     
                            mainObject.m_MailDotComLog.Write("nsMailDotCom.js - loginOnloadHandler - folders name "+ szName);
                        
                            if (szName.search(/inbox/i)!=-1) //get inbox
                            {
                                mainObject.m_szInboxURI =  szHref; 
                                mainObject.m_MailDotComLog.Write("nsMailDotCom.js - loginOnloadHandler - Inbox "+ mainObject.m_szInboxURI);
                            }
                            else if (szName.search(/trash/i)!=-1)//get trash
                            {
                                mainObject.m_szTrashURI =  szHref;
                                mainObject.m_MailDotComLog.Write("nsMailDotCom.js - loginOnloadHandler - trash "+ mainObject.m_szTrashURI);
                            }  
                        }
                        
                        //server response
                        mainObject.serverComms("+OK Your in\r\n");
                        mainObject.m_bAuthorised = true;
                    break;    
                };
            }
           
            mainObject.m_MailDotComLog.Write("nsMailDotCom.js - loginOnloadHandler - END");
        }
        catch(err)
        {
            mainObject.m_MailDotComLog.DebugDump("nsMailDotCom.js: loginHandler : Exception : " 
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
            this.m_MailDotComLog.Write("nsMailDotCom.js - getNumMessages - START"); 
            
            if (this.m_szInboxURI == null) return false;
           
            this.m_MailDotComLog.Write("nsMailDotCom.js - getNumMessages - Inbox " + this.m_szInboxURI); 
            
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
           
            this.m_MailDotComLog.Write("nsMailDotCom.js - getNumMessages - END"); 
            return true;
        }
        catch(e)
        {
            this.m_MailDotComLog.DebugDump("nsMailDotCom.js: getNumMessages : Exception : " 
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
            mainObject.m_MailDotComLog.Write("nsMailDotCom.js - mailBoxOnloadHandler - START"); 
            
            mainObject.m_MailDotComLog.Write("nsMailDotCom.js - mailBoxOnloadHandler : " 
                                             + mainObject.m_iStage + "\n"
                                             + szResponse);  
            
            var httpChannel = event.QueryInterface(Components.interfaces.nsIHttpChannel);
                      
            //check status should be 200.
            mainObject.m_MailDotComLog.Write("nsMailDotCom.js - mailBoxOnloadHandler - Mailbox :" + httpChannel.responseStatus);
            if (httpChannel.responseStatus != 200 && httpChannel.responseStatus != 300
                        && httpChannel.responseStatus != 302) 
                throw new Error("error status " + httpChannel.responseStatus);   
            
            var szURL = httpChannel.URI.host;
            mainObject.m_MailDotComLog.Write("nsMailDotCom.js - mailBoxOnloadHandler - url - " + szURL);  
            var aszTempDomain = szURL.match(/[^\.\/]+\.[^\.\/]+$/);  
            mainObject.m_MailDotComLog.Write("nsMailDotCom.js - mailBoxOnloadHandler - domain - " + aszTempDomain[0]); 
           
           
            var ios=Components.classes["@mozilla.org/network/io-service;1"].
                                    getService(Components.interfaces.nsIIOService);
                                    
            //get cookies
            try
            {
                var szCookies =  httpChannel.getResponseHeader("Set-Cookie");
                mainObject.m_MailDotComLog.Write("nsMailDotCom.js - mailBoxOnloadHandler - cookies \n" + szCookies);  
                mainObject.m_oCookies.addCookie( aszTempDomain[0], szCookies); 
            }
            catch(e)
            {
                mainObject.m_MailDotComLog.Write("nsMailDotCom.js - mailBoxOnloadHandler - no cookies found"); 
            } 
            
            
            var ios=Components.classes["@mozilla.org/network/io-service;1"].
                                    getService(Components.interfaces.nsIIOService);
                                    
            //handle bounce
            if ( httpChannel.responseStatus == 302 || httpChannel.responseStatus == 301)
            {
                try
                {
                    var szLocation =  httpChannel.getResponseHeader("Location");
                    mainObject.m_MailDotComLog.Write("nsMailDotCom.js - loginOnloadHandler - location \n" + szLocation);  
                }
                catch(e)
                {
                    throw new Error("Location header not found")
                } 
            
                //set cookies
                var szURL = ios.newURI(szLocation,null,null).prePath;
                var aszHost = szURL.match(/[^\.\/]+\.[^\.\/]+$/);  
                var aszCookie = mainObject.m_oCookies.findCookie(aszHost);
               
                var bResult = mainObject.httpConnection(szLocation, 
                                                        "GET", 
                                                        null, 
                                                        aszCookie,
                                                        mainObject.mailBoxOnloadHandler);
                                            
                if (!bResult) throw new Error("httpConnection returned false");
                return;
            }
            
            
            
            //ads
            if (httpChannel.URI.spec.search(/intr.main/)!=-1) //ads
            {
                mainObject.m_MailDotComLog.Write("nsMailDotCom.js - loginOnloadHandler - ADS ");
                var szDataPage = szResponse.match(patternMailDotComAddURI)[1];
                mainObject.m_MailDotComLog.Write("nsMailDotCom.js - loginOnloadHandler - URI " + szDataPage);
                
                var szURL = ios.newURI(szDataPage,null,null).prePath;
                var aszHost = szURL.match(/[^\.\/]+\.[^\.\/]+$/);  
                var aszCookie = mainObject.m_oCookies.findCookie(aszHost);
        
                var bResult = mainObject.httpConnection(szDataPage, 
                                                        "GET", 
                                                        null, 
                                                        aszCookie,
                                                        mainObject.mailBoxOnloadHandler);
                
                
                mainObject.m_iStage= 1;                    
                if (!bResult) throw new Error("httpConnection returned false");
                return;
            }
            else  //everything else
            {
                switch (mainObject.m_iStage)
                {
                    case 0: //msg table
                    
                        //get msg table
                        var aszMsgTable = szResponse.match(patternMailDotComMsgTable);
                        mainObject.m_MailDotComLog.Write("nsMailDotCom.js - mailBoxOnloadHandler - MsgTable " + aszMsgTable );     
                        var aszMSGs = aszMsgTable[0].match(patternMailDotComMsgRows);
                        mainObject.m_MailDotComLog.Write("nsMailDotCom.js - mailBoxOnloadHandler - MSGs Rows" + aszMSGs ); 
                        
                        
                        if(aszMSGs)
                        {
                            for (i=0; i<aszMSGs.length; i++ )
                            {
                                var aszData = aszMSGs[i].match(patternMailDotComMsgData);
                                mainObject.m_MailDotComLog.Write("nsMailDotCom.js - mailBoxOnloadHandler - MSG Data" + aszData );
                                
                                var szHref = mainObject.m_szLocation + aszData[1].match(patternMailDotComHref)[1];
                                mainObject.m_MailDotComLog.Write("nsMailDotCom.js - mailBoxOnloadHandler - href " + szHref );
                                mainObject.m_aszMsgIDStore.push(szHref);
                                
                                var szSize = aszData[3].match(patternMailDotComSize)[1];
                                mainObject.m_MailDotComLog.Write("nsMailDotCom.js - mailBoxOnloadHandler - size " + szSize );
                                var iSize = parseInt(szSize);
                                if (szSize.indexOf('k')!= -1) iSize*=1000;
                                mainObject.m_MailDotComLog.Write("nsMailDotCom.js - mailBoxOnloadHandler - msg size :" + i + " " +iSize);
                                mainObject.m_iTotalSize += iSize;
                                mainObject.m_aiMsgSize.push(iSize);    
                            }
                        }
            
                        //get delete uri
                        if (!mainObject.m_szDeleteURI)
                        {
                            mainObject.m_szDeleteURI = szResponse.match(patternMailDotComDelete)[1];
                            mainObject.m_MailDotComLog.Write("nsMailDotCom.js - mailBoxOnloadHandler - delete uri " + mainObject.m_szDeleteURI); 
                        }
                        
                        
                        var aszNext = szResponse.match(patternMailDotComNext);
                        mainObject.m_MailDotComLog.Write("nsMailDotCom.js - mailBoxOnloadHandler - Next Table " + aszNext ); 
                         
                        if (aszNext)  //get next page
                        {
                            var szNext =  mainObject.m_szLocation + aszNext[1];
                            mainObject.m_MailDotComLog.Write("nsMailDotCom.js - mailBoxOnloadHandler - Next URI " + szNext ); 
                            
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
                    break;
                    
                    case 1: // frame
                    
                        var szMailBox = szResponse.match(patternMailDotComFrame)[1];
                        if (!szMailBox) 
                            throw new Error("error parsing mail.com login web page");
                        mainObject.m_MailDotComLog.Write("nsMailDotCom.js - loginOnloadHandler - mailbox " + szMailBox);
                    
                        var szURL = ios.newURI(szMailBox,null,null).prePath;
                        var aszHost = szURL.match(/[^\.\/]+\.[^\.\/]+$/);  
                        var aszCookie = mainObject.m_oCookies.findCookie(aszHost);
                
                        var bResult = mainObject.httpConnection(szMailBox, 
                                                                "GET", 
                                                                null, 
                                                                aszCookie,
                                                                mainObject.mailBoxOnloadHandler);
                                            
                        if (!bResult) throw new Error("httpConnection returned false");
                        
                        mainObject.m_iStage= 0;
                    break;
                };
            }
             
            mainObject.m_MailDotComLog.Write("nsMailDotCom.js - MailBoxOnload - END"); 
        }
        catch(err)
        {
             mainObject.m_MailDotComLog.DebugDump("nsMailDotCom.js: MailboxOnload : Exception : " 
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
            this.m_MailDotComLog.Write("nsMailDotCom.js - getMessageSizes - START"); 
            
            var iTempNum = 0;
            var aTempSize = new Array();
            
            for (i = 0; i <  this.m_aiMsgSize.length; i++)
            {
                var iEmailSize = this.m_aiMsgSize[i];
                this.m_MailDotComLog.Write("nsMailDotCom.js - getMessageSizes - Email Size : " +iEmailSize);
        
                aTempSize.push(iEmailSize);
                iTempNum++; 
            }         
    
            this.m_MailDotComLog.Write("nsMailDotCom.js - getMessagesSizes - : " 
                                                            + aTempSize + " " 
                                                            + iTempNum); 
            
            var szPOPResponse = "+OK " + iTempNum + " Messages\r\n"; 
            for (i =0 ; i<iTempNum; i++)
            {
                szPOPResponse+=(i+1) + " " + aTempSize[i] + "\r\n";                        
            }
            szPOPResponse += ".\r\n";
            
            this.serverComms(szPOPResponse);
            this.m_MailDotComLog.Write("nsMailDotCom.js - getMessageSizes - END"); 
            return true;
        }
        catch(e)
        {
            this.m_MailDotComLog.DebugDump("nsMailDotCom.js: getMessageSizes : Exception : " 
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
            this.m_MailDotComLog.Write("nsMailDotCom.js - getMessageIDs - START"); 
    
            var iTempNum = 0;
            var aTempIDs = new Array();
            
            for (i = 0; i <  this.m_aszMsgIDStore.length; i++)
            {
                var szEmailURL = this.m_aszMsgIDStore[i];
                this.m_MailDotComLog.Write("nsMailDotCom.js - getMessageIDs - Email URL : " +szEmailURL);
               
                var szEmailID = szEmailURL.match(patternMailDotComMsgId)[1];
                                    
                this.m_MailDotComLog.Write("nsMailDotCom.js - getMessageIDs - IDS : " +szEmailID);    
                aTempIDs.push(szEmailID);
                iTempNum++; 
            }         
     
            this.m_MailDotComLog.Write("nsMailDotCom.js - getMessageIDs - return : " 
                                                + aTempIDs + " "
                                                + iTempNum); 
                                                
            var szPOPResponse = "+OK " + iTempNum + " Messages\r\n";
            for (i =0 ; i<iTempNum; i++)
            {
                szPOPResponse+=(i+1) + " " + aTempIDs[i] + "\r\n";                        
            }
            szPOPResponse += ".\r\n";
            this.serverComms(szPOPResponse);           
          
            this.m_MailDotComLog.Write("nsMailDotCom.js - getMessageIDs - END"); 
            return true;
        }
        catch(e)
        {
            this.m_MailDotComLog.DebugDump("nsMailDotCom.js: getMessageIDs : Exception : " 
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
            this.m_MailDotComLog.Write("nsMailDotCom.js - getMessage - START"); 
            this.m_MailDotComLog.Write("nsMailDotCom.js - getMessage - msg num " + lID); 
           
            //get msg id
            szMsgID = this.m_aszMsgIDStore[lID-1];
            this.m_MailDotComLog.Write("nsMailDotCom.js - getMessage - msg id" + szMsgID); 
            
                       
            var ios=Components.classes["@mozilla.org/network/io-service;1"].
                                    getService(Components.interfaces.nsIIOService);
           
            //set cookies
            var szURL = ios.newURI(szMsgID,null,null).prePath;
            var aszHost = szURL.match(/[^\.\/]+\.[^\.\/]+$/); 
            var aszCookie = this.m_oCookies.findCookie(aszHost);
            this.m_MailDotComLog.Write("nsMailDotCom.js - getNumMessages - cookies - "+ aszCookie);
             
            this.m_iStage = 0;   
            //get msg from MailDotCom
            var bResult = this.httpConnection(szMsgID+"&mhead=f", 
                                                "GET", 
                                                null,
                                                aszCookie, 
                                                this.emailOnloadHandler);  
                                           
            if (!bResult) throw new Error("httpConnection returned false"); 
             
            this.m_MailDotComLog.Write("m_MailDotComLog.js - getMessage - END"); 
            return true;
        }
        catch(e)
        {
             this.m_MailDotComLog.DebugDump("m_MailDotComLog.js: getMessage : Exception : " 
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
            mainObject.m_MailDotComLog.Write("m_MailDotComLog.js - emailOnloadHandler - START");
            
            mainObject.m_MailDotComLog.Write("m_MailDotComLog.js - emailOnloadHandler - msg :\n" + szResponse); 
           
            var httpChannel = event.QueryInterface(Components.interfaces.nsIHttpChannel);
                      
            //check status should be 200.
            mainObject.m_MailDotComLog.Write("m_MailDotComLog.js - emailOnloadHandler - msg code :" + httpChannel.responseStatus);
            if (httpChannel.responseStatus != 200 && httpChannel.responseStatus != 302) 
                throw new Error("error status " + httpChannel.responseStatus);   
            
            
            var ios=Components.classes["@mozilla.org/network/io-service;1"].
                                    getService(Components.interfaces.nsIIOService);
            
            //handle bounce
            if ( httpChannel.responseStatus == 302 || httpChannel.responseStatus == 301)
            {
                try
                {
                    var szLocation =  httpChannel.getResponseHeader("Location");
                    mainObject.m_MailDotComLog.Write("nsMailDotCom.js - emailOnloadHandler - location \n" + szLocation);  
                }
                catch(e)
                {
                    throw new Error("Location header not found")
                } 
            
                //set cookies
                var szURL = ios.newURI(szLocation,null,null).prePath;
                var aszHost = szURL.match(/[^\.\/]+\.[^\.\/]+$/);  
                var aszCookie = mainObject.m_oCookies.findCookie(aszHost);
               
                var bResult = mainObject.httpConnection(szLocation, 
                                                        "GET", 
                                                        null, 
                                                        aszCookie,
                                                        mainObject.emailOnloadHandler);
                                            
                if (!bResult) throw new Error("httpConnection returned false");
                return;
            }
            
            
            
            //ads
            if (httpChannel.URI.spec.search(/intr.main/)!=-1) //ads
            {
                mainObject.m_MailDotComLog.Write("nsMailDotCom.js - emailOnloadHandler - ADS ");
                var szDataPage = szResponse.match(patternMailDotComAddURI)[1];
                mainObject.m_MailDotComLog.Write("nsMailDotCom.js - emailOnloadHandler - URI " + szDataPage);
                
                var szURL = ios.newURI(szDataPage,null,null).prePath;
                var aszHost = szURL.match(/[^\.\/]+\.[^\.\/]+$/);  
                var aszCookie = mainObject.m_oCookies.findCookie(aszHost);
        
                var bResult = mainObject.httpConnection(szDataPage, 
                                                        "GET", 
                                                        null, 
                                                        aszCookie,
                                                        mainObject.emailOnloadHandler);
                
                mainObject.m_iBeforeAdsStage=mainObject.m_iStage;
                mainObject.m_iStage= 2;                    
                if (!bResult) throw new Error("httpConnection returned false");
            }
            else
            {
                switch (mainObject.m_iStage)
                {
                    case 0: //parse email web page
                         mainObject.m_szHeaders = "";
                         
                        //get headers            
                        var szRawHeaders = szResponse.match(patternMailDotComRawHeaders)[0];
                        mainObject.m_MailDotComLog.Write("m_MailDotComLog.js - emailOnloadHandler - msg RawHeaders :" +szRawHeaders);
                        
                        var aszFrom = szRawHeaders.match(patternMailDotComFromHeader);
                        mainObject.m_MailDotComLog.Write("m_MailDotComLog.js - emailOnloadHandler - msg From :" +aszFrom);
                        
                        var aszStdHeader = szRawHeaders.match(patternMailDotComStdHeaders);
                        mainObject.m_MailDotComLog.Write("m_MailDotComLog.js - emailOnloadHandler - msg Std Header :" +aszStdHeader);
                       
                        var aszOthHeader = szRawHeaders.match(patternMailDotComOtherHeaders)[0].split(/<BR>/i);
                        mainObject.m_MailDotComLog.Write("m_MailDotComLog.js - emailOnloadHandler - msg Oth Header :" +aszOthHeader);
                       
                        //from header 
                        if (aszFrom)
                        {
                            try
                            {
                                var szFrom =  aszFrom[0].match(patternMailDotComFromData)[1];
                                szFrom += aszFrom[1].match(patternMailDotComFromData)[1];
                                mainObject.m_szHeaders += szFrom + "\r\n"; 
                                mainObject.m_MailDotComLog.Write("m_MailDotComLog.js - emailOnloadHandler - from : " +mainObject.m_szHeaders);
                            }
                            catch(err)
                            {
                            }
                        }
                        
                        
                        //to subject date headers
                        if (aszStdHeader)
                        {
                            for (i=0; i<aszStdHeader.length; i++)
                            {
                                try
                                {
                                    var aszHeaders = aszStdHeader[i].match(patternMailDotComStdHeaderData);
                                    mainObject.m_MailDotComLog.Write("m_MailDotComLog.js - emailOnloadHandler - std headers raw: " +aszHeaders);
                                    var szHeader = aszHeaders[1] + aszHeaders[2] + "\r\n"; 
                                    mainObject.m_MailDotComLog.Write("m_MailDotComLog.js - emailOnloadHandler - std headers : " +szHeader);
                                    mainObject.m_szHeaders += szHeader; 
                                }
                                catch(err)
                                {
                                }
                            }
                        }
                        
                        //other headers
                        if (aszOthHeader)
                        {
                            for (i=0; i<aszOthHeader.length; i++)
                            {
                                try
                                {
                                    var aszHeaders = aszOthHeader[i].match(patternMailDotComOtherHeaderDate);
                                    mainObject.m_MailDotComLog.Write("m_MailDotComLog.js - emailOnloadHandler - other headers raw:" +aszHeaders);
                                 
                                    if (aszHeaders[1].search(/Content-Type/)==-1)
                                    {   
                                        var szHeader = aszHeaders[1] + aszHeaders[2] + "\r\n";  
                                        mainObject.m_szHeaders += szHeader;
                                        mainObject.m_MailDotComLog.Write("m_MailDotComLog.js - emailOnloadHandler - other headers :" +szHeader);                               
                                    }  
                                }
                                catch(err)
                                {
                                }
                            }
                        }
                        mainObject.m_szHeaders = mainObject.m_szHeaders.replace(/&#34;/g,"\"");
                        mainObject.m_szHeaders = mainObject.m_szHeaders.replace(/&lt;/g,"<");
                        mainObject.m_szHeaders = mainObject.m_szHeaders.replace(/&gt;/g,">");
                        mainObject.m_MailDotComLog.Write("m_MailDotComLog.js - emailOnloadHandler - headers :" +mainObject.m_szHeaders);
                      
                        
                        //Message Body
                        try
                        {   //html message
                            var aszBody = szResponse.match(patternMailDotComHTMLBody);
                            mainObject.m_MailDotComLog.Write("m_MailDotComLog.js - emailOnloadHandler - msg body :" +aszBody);
                            
                            if (!aszBody)
                            {   //plain text email
                                aszBody = szResponse.match(patternMailDotComMsgTextBody);
                                mainObject.m_MailDotComLog.Write("m_MailDotComLog.js - emailOnloadHandler - msg  1 body :" +aszBody);
                                                          
                                if (!aszBody)//get everything
                                {
                                    aszBody = szResponse.match(patternMailDotComAttchments)[1].split(/^<HR SIZE=1>$/igm);
                                    mainObject.m_MailDotComLog.Write("m_MailDotComLog.js - emailOnloadHandler - msg 2 body :" +aszBody);
                                }
                            }    
                            
                            mainObject.m_szBody = "<html><body>";
                            mainObject.m_szBody += aszBody;
                            mainObject.m_szBody += "</body></html>";
                        }
                        catch(e)
                        {
                            mainObject.m_MailDotComLog.Write("m_MailDotComLog.js - emailOnloadHandler - No body");
                        } 
                        
                       
                        //get attachments
                        var aszRawBody = null;
                        try
                        {
                            aszRawBody = szResponse.match(patternMailDotComAttchments)[1].split(/^<HR SIZE=1>$/igm);
                            mainObject.m_MailDotComLog.Write("m_MailDotComLog.js - emailOnloadHandler - msg attach raw :" +aszRawBody);
                        }
                        catch(e)
                        {   
                            //no attchments
                            mainObject.m_MailDotComLog.Write("m_MailDotComLog.js - emailOnloadHandler - no attchments ");
                        }
                        
                        var iContentType = 0;//0=uri; 1=plain; 2=html
                        
                        if (aszRawBody)
                        {
                            mainObject.m_MailDotComLog.Write("m_MailDotComLog.js - emailOnloadHandler - processing attachments");
                            
                            for (i=0; i<aszRawBody.length ; i++)
                            {                              
                                try
                                {
                                    //get attch headers
                                    var aszHeaders = aszRawBody[i].match(patternMailDotComAttchHeaders);
                                    mainObject.m_MailDotComLog.Write("m_MailDotComLog.js - emailOnloadHandler - attach raw "+aszHeaders);
                                    
                                    var szHeaders="";
                                    iContentType = 0;//0=uri; 1=plain; 2=html
                                    for (j=0; j<aszHeaders.length ; j++)
                                    {
                                        var aszHData = aszHeaders[j].match(patternMailDotComAttchHeadersData);
                                        mainObject.m_MailDotComLog.Write("m_MailDotComLog.js - emailOnloadHandler - attachData raw "+aszHData);
                                    
                                        szHeaders += aszHData[1]+aszHData[2]+"\r\n";
                                        /*
                                        if (aszHData[1].search(/Content-Type/)!=-1)
                                        {
                                            if (aszHData[2].search(/text\/plain/i)!=-1 ||
                                                        aszHData[2].search(/text\/html/i)!=-1)
                                                iContentType = 1; 
                                        }*/
                                    }
                                    mainObject.m_MailDotComLog.Write("m_MailDotComLog.js - emailOnloadHandler - attach Headers "+szHeaders);
                                    
                                    //get attach body
                                    var szRawBody = aszRawBody[i].match(patternMailDotComAttchBody);
                                    mainObject.m_MailDotComLog.Write("m_MailDotComLog.js - emailOnloadHandler - attach body raw "+szRawBody);
                                    
                                    var szBody;
                                    if (iContentType == 0)//uri
                                    {
                                        mainObject.m_MailDotComLog.Write("m_MailDotComLog.js - emailOnloadHandler - adding attach start");                                            var oAttach = new AttachmentData();
                                        var oAttach = new AttachmentData();
                                        oAttach.addHeaders(szHeaders);
                                        var szURI = szBody.match(patternMailDotComAttachURI)[1];
                                        mainObject.m_MailDotComLog.Write("m_MailDotComLog.js - emailOnloadHandler - attach body uri "+szURI);
                                
                                        oAttach.addURI(mainObject.m_szLocation+szURI);
                                         
                                        mainObject.m_Attachment.push(oAttach);
                                        mainObject.m_MailDotComLog.Write("m_MailDotComLog.js - emailOnloadHandler - adding attach end");
                                    }
                                }
                                catch(e)
                                {
                                }
                            }
                        }
                        
                        if (mainObject.m_Attachment.length==0 ) //no another parts 
                        {
                            //construct email 
                            mainObject.m_szEmail = mainObject.m_szHeaders;
                            mainObject.m_szEmail +="Content-Type: text/html\r\n"
                            mainObject.m_szEmail += "\r\n"; //end of headers
                            mainObject.m_szEmail += mainObject.m_szBody;
                            mainObject.m_szEmail += "\r\n\r\n"; // end of email
                            
                            //pop encode
                            mainObject.m_szEmail = mainObject.m_szEmail.replace(/^\./mg,"..");    //bit padding 
                            if (mainObject.m_szEmail.lastIndexOf("\r\n") == -1) mainObject.m_szEmail += "\r\n";
                            mainObject.m_szEmail += ".\r\n";  //msg end 
                                                                                                                              
                            var szPOPResponse = "+OK " + mainObject.m_szEmail.length + "\r\n";                     
                            szPOPResponse += mainObject.m_szEmail;
                                                         
                            mainObject.serverComms(szPOPResponse);  
                        }
                        else //download next attachment
                        {
                            mainObject.m_MailDotComLog.Write("m_MailDotComLog.js - emailOnloadHandler - download attach");
                            
                            var oTemp = mainObject.m_Attachment.shift();
                            var szTempURI = oTemp.getURI();
                            mainObject.m_MailDotComLog.Write("m_MailDotComLog.js - emailOnloadHandler - download attach uri " +szTempURI);
                            
                            var szTempHeaders = oTemp.getHeaders();
                            mainObject.m_MailDotComLog.Write("m_MailDotComLog.js - emailOnloadHandler - download attach headers " +szTempHeaders);
                            
                            
                            mainObject.m_szEmail+= "--" + mainObject.m_szBoundary + "\r\n";
                            mainObject.m_szEmail+= szTempHeaders + "\r\n";
                          
                            
                            var szURL = ios.newURI(szTempURI,null,null).prePath;
                            var aszHost = szURL.match(/[^\.\/]+\.[^\.\/]+$/);  
                            var aszCookie = mainObject.m_oCookies.findCookie(aszHost);
                
                            var bResult = mainObject.httpConnection(szTempURI, 
                                                                    "GET", 
                                                                    null, 
                                                                    aszCookie,
                                                                    mainObject.emailOnloadHandler);
                             
                                         
                            if (!bResult) throw new Error("httpConnection returned false");
                            mainObject.m_iStage++;             
                        }   
                    break;
                    
                    
                    case 1: //download attachments
                        mainObject.m_MailDotComLog.Write("m_MailDotComLog.js - emailOnloadHandler - attach downloaded");
                          
                        mainObject.m_szEmail+= "test" + "\r\n\r\n";
                        mainObject.m_szEmail+= "--" + mainObject.m_szBoundary + "--\r\n";   
                        
                        if (mainObject.m_Attachment.length==0)
                        {
                            /*
                            szMsg += szResponse;
                            szMsg = szMsg.replace(/^\./mg,"..");    //bit padding 
                            if (szMsg.lastIndexOf("\r\n") == -1) szMsg += "\r\n";*/
                            mainObject.m_szEmail += "\r\n.\r\n";  //msg end 
                                                                                                                              
                            var szPOPResponse = "+OK " + szMsg.length + "\r\n";                     
                            szPOPResponse += mainObject.m_szEmail;
                                                         
                            mainObject.serverComms(szPOPResponse);           
                        }
                        else // more attachments
                        {
                             mainObject.m_MailDotComLog.Write("m_MailDotComLog.js - emailOnloadHandler - download next attach");
                        }
                    break;
                    
                    
                    case 2: //frame
                        var szMailBox = szResponse.match(patternMailDotComFrame)[1];
                        if (!szMailBox) 
                            throw new Error("error parsing mail.com login web page");
                        mainObject.m_MailDotComLog.Write("nsMailDotCom.js - emailOnloadHandler - mailbox " + szMailBox);
                    
                        var szURL = ios.newURI(szMailBox,null,null).prePath;
                        var aszHost = szURL.match(/[^\.\/]+\.[^\.\/]+$/);  
                        var aszCookie = mainObject.m_oCookies.findCookie(aszHost);
                
                        var bResult = mainObject.httpConnection(szMailBox, 
                                                                "GET", 
                                                                null, 
                                                                aszCookie,
                                                                mainObject.emailOnloadHandler);
                                            
                        if (!bResult) throw new Error("httpConnection returned false");
                        mainObject.m_iStage= mainObject.m_iBeforeAdsStage;
                        mainObject.m_MailDotComLog.Write("nsMailDotCom.js - emailOnloadHandler - stage " +  mainObject.m_iStage);
                    break;
                }         
            }
          
            mainObject.m_MailDotComLog.Write("m_MailDotComLog.js - emailOnloadHandler - END");      
        }
        catch(err)
        {
            mainObject.m_MailDotComLog.DebugDump("m_MailDotComLog.js: emailOnloadHandler : Exception : " 
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
            this.m_MailDotComLog.Write("nsMailDotCom.js - deleteMessage - START");  
            this.m_MailDotComLog.Write("nsMailDotCom.js - deleteMessage - id " + lID ); 
               
            //create URL
            var szDest = this.m_aszMsgIDStore[lID-1];
            this.m_MailDotComLog.Write("nsMailDotCom.js - deleteMessage - id " + szDest );
            
            var szPath = this.m_szLocation + this.m_szDeleteURI;
            this.m_MailDotComLog.Write("nsMailDotCom.js - deleteMessage - URI " + szPath );
             
            var szID = szDest.match(patternMailDotComMsgId)[1];
            var szData = "folder=INBOX&order=Newest&changeview=0&mview=a&mstart=1";
            szData += "&delete_selected=yes&move_selected=&flag_selected=&flags=&";
            szData += "views=a&folder_name=Trash&";
            szData += "sel_"+ szID +"=ON&";
            szData += "matchfield=fr&mpat=";
            this.m_MailDotComLog.Write("nsMailDotCom.js - deleteMessage - data - "+szData);
                      
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
          
          
            this.m_MailDotComLog.Write("nsMailDotCom.js - deleteMessage - END");     
            return true;
        }
        catch(e)
        {
            this.m_MailDotComLog.DebugDump("nsMailDotCom.js: deleteMessage : Exception : " 
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
            mainObject.m_MailDotComLog.Write("nsMailDotCom.js - deleteMessageOnload - START");    
            mainObject.m_MailDotComLog.Write("nsMailDotCom.js - deleteMessageOnload :\n" + szResponse); 
           
            var httpChannel = event.QueryInterface(Components.interfaces.nsIHttpChannel);
           
            //check status should be 200.
            mainObject.m_MailDotComLog.Write("nsMailDotCom.js - deleteMessageOnload :" + httpChannel.responseStatus);
            if (httpChannel.responseStatus != 200 ) 
                throw new Error("error status " + httpChannel.responseStatus);   
                 
            mainObject.serverComms("+OK its history\r\n");    
            mainObject.m_MailDotComLog.Write("nsMailDotCom.js - deleteMessageOnload - END");      
        }
        catch(e)
        {
            mainObject.m_MailDotComLog.DebugDump("nsMailDotCom.js: deleteMessageOnload : Exception : " 
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
            this.m_MailDotComLog.Write("nsMailDotCom.js - logOUT - START"); 
            
            this.m_bAuthorised = false;
            this.serverComms("+OK Your Out\r\n");             
                                           
            this.m_MailDotComLog.Write("nsMailDotCom.js - logOUT - END");  
            return true;
        }
        catch(e)
        {
            this.m_MailDotComLog.DebugDump("nsMailDotCom.js: logOUT : Exception : " 
                                      + e.name 
                                      + ".\nError message: " 
                                      + e.message);
            return false;
        }
    },  
    
     
   
                      
     
     
    serverComms : function (szMsg)
    {
        try
        { 
            this.m_MailDotComLog.Write("nsMailDotCom.js - serverComms - START");
            this.m_MailDotComLog.Write("nsMailDotCom.js - serverComms msg " + szMsg);
            var iCount = this.m_oResponseStream.write(szMsg,szMsg.length);
            this.m_MailDotComLog.Write("nsMailDotCom.js - serverComms sent count: " + iCount 
                                                        +" msg length: " +szMsg.length);
            this.m_MailDotComLog.Write("nsMailDotCom.js - serverComms - END");  
        }
        catch(e)
        {
            this.m_MailDotComLog.DebugDump("nsMailDotCom.js: serverComms : Exception : " 
                                              + e.name 
                                              + ".\nError message: " 
                                              + e.message);
        }
    },
   

    
    
    httpConnection : function (szURL, szType, szData, szCookies ,callBack)
    {
        try
        {
            this.m_MailDotComLog.Write("nsMailDotCom.js - httpConnection - START");   
            this.m_MailDotComLog.Write("nsMailDotCom.js - httpConnection - " + szURL + "\n"
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
                this.m_MailDotComLog.Write("nsMailDotCom.js - httpConnection - adding cookie \n"+ szCookies);
                HttpRequest.setRequestHeader("x-CookieHack", "Hacker\r\nCookie: "  + szCookies , false);
            }
           
           
            //set data
            if (szData)
            {
                this.m_MailDotComLog.Write("nsMailDotCom.js - httpConnection - adding data");
                
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
            
            this.m_MailDotComLog.Write("nsMailDotCom.js - httpConnection - END"); 
            
            return true;  
        }
        catch(e)
        {
            this.m_MailDotComLog.DebugDump("nsMailDotCom.js: httpConnection : Exception : " 
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
