/*****************************  Globals   *************************************/                 
const nsHotmailClassID = Components.ID("{3f3822e0-6374-11d9-9669-0800200c9a66}"); 
const nsHotmailContactID = "@mozilla.org/Hotmail;1";


const patternHotmailBounce = /<form.*action="(.*?)".*?>.*<input.*name="mspprawqs".*?value="(.*?)".*?>.*<input.*?name="mspppostint".*?value="(.*?)".*?>/;
const patternHotmailLogIn = /<form.*? name="form1".*?action="(.*?)".*?>/;
const patternHotmailRefresh =/<META.*?HTTP-EQUIV="REFRESH".*?URL=(.*?)".*?>/;
const patternHotmailLogout = /<td><a.*?href="(.*?\/cgi-bin\/logout\?curmbox=.*?").*?>/m;
const PatternHotmailMailbox = /<a href="(\/cgi-bin\/HoTMaiL.*?)".*?tabindex=121/;
const PatternHotmailLogOutBounce = /<form.*?action="(.*?)".*?>.*?<input.*?name="(.*?)".*?value="(.*?)">/;
const PatternHotmailLogOutExpire = /<img.*?name="ID0".*?src="(.*?)".*>/;
const PatternHotmailLogOutReSet = /<img.*?name="ID1".*?src="(.*?)".*>/;
const PatternHotmailMsgTable = /MsgTable.*?>(.*?)<\/table>/m;
const PatternHotmail_UM = /_UM="(.*?)"/;
const PatternHotmailFolderBase = /document.location = "(.*?)"\+f/; 
const PatternHotmailFolderList =/href="javascript:G\('\/cgi-bin\/folders\?'\)"(.*?)<a href="javascript:G\('\/cgi-bin\/folders\?'\)"/;
const PatternHotmailFolderLinks =/<a.*?>/g;
const PatternHotmailHMFO =/HMFO\('(.*?)'\)/;
const PatternHotmailTabindex =/tabindex="(.*?)"/;
const PatternHotmailMultPageNum = /<select name="MultPageNum" onChange="window\.location\.href='(.*?)'\+_UM\+'(.*?)'.*?>(.*?)<\/select>/;
const PatternHotmailPages = /<option value="(.*?)".*?>/g;
const PatternHotmailEmailURL = /<a.*?href="javascript:G\('(.*?)'\)">/; 
const PatternHotmailEmailLength = /.*?&len=(.*?)&/;
const PatternHotmailEmailRead = /.*?&msgread=1&/;
const PatternHotmailEmailID = /.*?msg=(.*?)&/;
const PatterHotmailFolderID = /curmbox=(.*?)&/;


/***********************  Hotmail ********************************/




function nsHotmail()
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
        
        var  szLogFileName = "Hotmail Log - " + date.getHours()+ "-" + date.getMinutes() + "-"+ date.getUTCMilliseconds() +" -";
        this.m_HotmailLog = new DebugLog("webmail.logging.comms", 
                                         "{3c8e8390-2cf6-11d9-9669-0800200c9a66}", 
                                         szLogFileName); 
        
        this.m_HotmailLog.Write("nsHotmail.js - Constructor - START");   
       
        this.m_szUserName = null;   
        this.m_szPassWord = null; 
        this.m_oResponseStream = null;       
        this.m_szMailboxURI = null;
        this.m_szLogOutURI = null;
        this.m_szLocationURI = null;
        this.m_szJunkFolderURI = null;
        this.m_bJunkMailDone = false;
        this.m_bAuthorised = false;
        this.m_aszMsgIDStore = new Array();
        this.m_aszPageURLS = new Array();
        this.m_iPagesURLS = 0;
        this.m_iPageCount =0;
        this.m_iTotalSize = 0;
        this.m_iNum = 0;  
        this.m_szUM = null;
        this.m_oCookies = new CookieHandler(this.m_HotmailLog );    
        this.m_iStage = 0;  
        
        //do i download junkmail
        var oPref = new Object();
        oPref.Value = null;
        var  WebMailPrefAccess = new WebMailCommonPrefAccess();
        if (WebMailPrefAccess.Get("bool","hotmail.bUseJunkMail",oPref))
            this.m_bUseJunkMail=oPref.Value;
        else
            this.m_bUseJunkMail=false;
                                          
        this.m_HotmailLog.Write("nsHotmail.js - Constructor - END");  
    }
    catch(e)
    {
        DebugDump("nsHotmail.js: Constructor : Exception : " 
                                      + e.name 
                                      + ".\nError message: " 
                                      + e.message);
    }
}



nsHotmail.prototype =
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
            this.m_HotmailLog.Write("nsHotmail.js - logIN - START");   
            this.m_HotmailLog.Write("nsHotmail.js - logIN - Username: " + this.m_szUserName 
                                                   + " Password: " + this.m_szPassWord 
                                                   + " stream: " + this.m_oResponseStream);
            
            if (!this.m_szUserName || !this.m_oResponseStream || !this.m_szPassWord) return false;
                     
            //get hotmail.com webpage
            var bResult = this.httpConnection("http://www.hotmail.com", 
                                              "GET", 
                                              null,
                                              null, 
                                              this.loginOnloadHandler);
                                                
            if (!bResult) throw new Error("httpConnection returned false");
            
            this.m_HotmailLog.Write("nsHotmail.js - logIN - END");    
            return true;
        }
        catch(e)
        {
            this.m_HotmailLog.DebugDump("nsHotmail.js: logIN : Exception : " 
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
            mainObject.m_HotmailLog.Write("nsHotmail.js - loginOnloadHandler - START"); 
            
            mainObject.m_HotmailLog.Write("nsHotmail.js - loginOnloadHandler : " 
                                         + mainObject.m_iStage + "\n"
                                         + szResponse);  
            
            var httpChannel = event.QueryInterface(Components.interfaces.nsIHttpChannel);
            
            //if this fails we've gone somewhere new
            mainObject.m_HotmailLog.Write("nsHotmail.js - loginOnloadHandler - status :" +httpChannel.responseStatus );
            if (httpChannel.responseStatus != 200 && httpChannel.responseStatus != 302) 
                throw new Error("return status " + httpChannel.responseStatus);
            
            var szURL = httpChannel.URI.host;
            mainObject.m_HotmailLog.Write("nsHotmail.js - loginOnloadHandler - url - " + szURL);  
            var aszTempDomain = szURL.match(/[^\.\/]+\.[^\.\/]+$/);  
            mainObject.m_HotmailLog.Write("nsHotmail.js - loginOnloadHandler - domain - " + aszTempDomain[0]); 
            
            //get cookies
            try
            {
                var szCookies =  httpChannel.getResponseHeader("Set-Cookie");
                mainObject.m_HotmailLog.Write("nsHotmail.js - loginOnloadHandler - cookies \n" + szCookies);  
                mainObject.m_oCookies.addCookie( aszTempDomain[0], szCookies); 
            }
            catch(e)
            {
                mainObject.m_HotmailLog.Write("nsHotmail.js - loginOnloadHandler - no cookies found"); 
            } 
            
            var ios=Components.classes["@mozilla.org/network/io-service;1"].
                                    getService(Components.interfaces.nsIIOService);

            if(httpChannel.responseStatus == 302) //redirect
            { 
                try
                {
                    var szLocation =  httpChannel.getResponseHeader("Location");
                    mainObject.m_HotmailLog.Write("nsHotmail.js - loginOnloadHandler - location \n" + szLocation);  
                }
                catch(e)
                {
                    throw new Error("Location header not found");
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
            else  //pages
            {
                //page code                                
                switch (mainObject.m_iStage)
                {             
                    case 0: // redirect destination
                        var aBounceData = szResponse.match(patternHotmailBounce);
                        if (aBounceData == null) throw new Error("error parsing bounce web page");
                        mainObject.m_HotmailLog.Write("nsHotmail.js - loginOnloadHandler "+ aBounceData);
                        
                        //set cookies
                        var szURL = ios.newURI(aBounceData[1],null,null).prePath;
                        var aszHost = szURL.match(/[^\.\/]+\.[^\.\/]+$/);  
                        var aszCookie = mainObject.m_oCookies.findCookie(aszHost);
                        
                        //login page  
                        var szData = "mspprawqs="+aBounceData[2]+"&mspppostint="+aBounceData[3];
                        var bResult = mainObject.httpConnection(aBounceData[1], 
                                                       "POST", 
                                                       szData, 
                                                       aszCookie,
                                                       mainObject.loginOnloadHandler);
                                                    
                        if (!bResult) throw new Error("httpConnection returned false");
                        mainObject.m_iStage++;
                    break;
                   
                   
                    case 1: //login
                        var aLogInURL = szResponse.match(patternHotmailLogIn);
                        if (aLogInURL == null ) throw new Error("error parsing login page");  
                        
                       
                        var szData = "notinframe=1&login="+encodeURIComponent(mainObject.m_szUserName)
                                               +"&passwd="+encodeURIComponent(mainObject.m_szPassWord)
                                               +"&submit1=+Sign+In+"; 
                                                                        
                        //set cookies
                        var szURL = ios.newURI(aLogInURL[1],null,null).prePath;
                        var aszHost = szURL.match(/[^\.\/]+\.[^\.\/]+$/); 
                        var aszCookie = mainObject.m_oCookies.findCookie(aszHost);
                         
                        var bResult = mainObject.httpConnection(aLogInURL[1], 
                                                                "POST", 
                                                                szData, 
                                                                aszCookie,
                                                                mainObject.loginOnloadHandler);
                                                          
                        if (!bResult) throw new Error("httpConnection returned false");
                        mainObject.m_iStage++;
                    break;
                     
                    case 2: //refresh
                        var aRefresh = szResponse.match(patternHotmailRefresh);
                        mainObject.m_HotmailLog.Write("nsHotmail.js - loginOnloadHandler "+ aRefresh); 
                        if (aRefresh == null) throw new Error("error parsing login page");
                        
                        //set cookies
                        var szURL = ios.newURI(aRefresh[1],null,null).prePath;
                        var aszHost = szURL.match(/[^\.\/]+\.[^\.\/]+$/); 
                        var aszCookie = mainObject.m_oCookies.findCookie(aszHost);
                         
                        var bResult = mainObject.httpConnection(aRefresh[1], 
                                                          "GET", 
                                                          null, 
                                                          aszCookie,
                                                          mainObject.loginOnloadHandler);  
                                                          
                        if (!bResult) throw new Error("httpConnection returned false");
                        mainObject.m_iStage++;
                    break;
                                  
                    case 3: 
                        var szLocation = httpChannel.URI.spec;
                        var iIndex = szLocation.indexOf("uilogin.srt");
                        mainObject.m_HotmailLog.Write("nsHotmail.js - loginOnloadHandler - page check : " + szLocation 
                                                            + " index = " +  iIndex );
                        if (iIndex != -1) throw new Error("error logging in ");
                        
                        //get urls for later use
                        mainObject.m_szLocationURI = httpChannel.URI.prePath ;
                        mainObject.m_HotmailLog.Write("nsHotmail.js - loginOnloadHandler - m_szLocationURI : "+mainObject.m_szLocationURI );
                        var aMailBoxURI = szResponse.match(PatternHotmailMailbox);
                        mainObject.m_szMailboxURI = aMailBoxURI[1];
                        mainObject.m_HotmailLog.Write("nsHotmail.js - loginOnloadHandler - m_szMaiboxURI : "+mainObject.m_szMailboxURI );
                        var aLogOutURI = szResponse.match(patternHotmailLogout);
                        mainObject.m_szLogOutURI = aLogOutURI[1];
                        mainObject.m_HotmailLog.Write("nsHotmail.js - loginOnloadHandler - m_szLogOutURI : "+mainObject.m_szLogOutURI );
                        
                        //server response
                        mainObject.serverComms("+OK Your in\r\n");
                        mainObject.m_bAuthorised = true;
                    break;
                }
            }
            
            mainObject.m_HotmailLog.Write("nsHotmail.js - loginOnloadHandler - END");
        }
        catch(err)
        {
            mainObject.m_HotmailLog.DebugDump("nsHotmail.js: loginHandler : Exception : " 
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
            this.m_HotmailLog.Write("nsHotmail.js - getNumMessages - START"); 
            
            if (this.m_szMailboxURI == null) return false;
            var szMailboxURI = this.m_szLocationURI + this.m_szMailboxURI; 
            this.m_HotmailLog.Write("nsHotmail.js - getNumMessages - mail box url " + szMailboxURI); 
            
            var ios=Components.classes["@mozilla.org/network/io-service;1"].
                                    getService(Components.interfaces.nsIIOService);
                                    
            //set cookies
            var szURL = ios.newURI(szMailboxURI,null,null).prePath;
            var aszHost = szURL.match(/[^\.\/]+\.[^\.\/]+$/); 
            var aszCookie = this.m_oCookies.findCookie(aszHost);
                       
            this.m_iStage = 0;    
            var bResult = this.httpConnection(szMailboxURI, 
                                              "GET", 
                                              null,
                                              aszCookie, 
                                              this.mailBoxOnloadHandler);  
                                              
            if (!bResult) throw new Error("httpConnection returned false");
            
            this.m_HotmailLog.Write("nsHotmail.js - getNumMessages - END"); 
            return true;
        }
        catch(e)
        {
            this.m_HotmailLog.DebugDump("nsHotmail.js: getNumMessages : Exception : " 
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
            mainObject.m_HotmailLog.Write("nsHotmail.js - mailBoxOnloadHandler - START"); 
            
            mainObject.m_HotmailLog.Write("nsHotmail.js - mailBoxOnloadHandler : " 
                                         + mainObject.m_iStage + "\n"
                                         + szResponse);  
            
            var httpChannel = event.QueryInterface(Components.interfaces.nsIHttpChannel);
                      
            //check status should be 200.
            mainObject.m_HotmailLog.Write("nsHotmail.js - mailBoxOnloadHandler - Mailbox :" + httpChannel.responseStatus);
            if (httpChannel.responseStatus != 200 ) 
                throw new Error("error status " + httpChannel.responseStatus);   
            
            var szURL = httpChannel.URI.host;
            mainObject.m_HotmailLog.Write("nsHotmail.js - mailBoxOnloadHandler - url - " + szURL);  
            var aszTempDomain = szURL.match(/[^\.\/]+\.[^\.\/]+$/);  
            mainObject.m_HotmailLog.Write("nsHotmail.js - mailBoxOnloadHandler - domain - " + aszTempDomain[0]); 
            
            //get cookies
            try
            {
                var szCookies =  httpChannel.getResponseHeader("Set-Cookie");
                mainObject.m_HotmailLog.Write("nsHotmail.js - mailBoxOnloadHandler - cookies \n" + szCookies);  
                mainObject.m_oCookies.addCookie( aszTempDomain[0], szCookies); 
            }
            catch(e)
            {
                mainObject.m_HotmailLog.Write("nsHotmail.js - mailBoxOnloadHandler - no cookies found"); 
            } 
            
            
            // get trash folder uri      
            if (!mainObject.m_szJunkFolderURI && mainObject.m_bUseJunkMail)
            {
                try
                {
                    var szFolderURL = szResponse.match(PatternHotmailFolderBase)[1];
                    mainObject.m_HotmailLog.Write("nsHotmail.js - mailBoxOnloadHandler - folder base: " +szFolderURL);
                   
                    var szFolderList = szResponse.match(PatternHotmailFolderList)[1];    
                    mainObject.m_HotmailLog.Write("nsHotmail.js - mailBoxOnloadHandler - folder list: " +szFolderList);
                    
                    var aszFolderLinks = szFolderList.match(PatternHotmailFolderLinks);
                    mainObject.m_HotmailLog.Write("nsHotmail.js - mailBoxOnloadHandler - folder links: " +aszFolderLinks
                                                                       + " length " + aszFolderLinks.length);
                   
                    var szJunkFolder=null;
                    for (i=0 ; i<aszFolderLinks.length-1; i++ )
                    {
                        
                        mainObject.m_HotmailLog.Write("nsHotmail.js - mailBoxOnloadHandler - folder link: " +aszFolderLinks[i]);
                        //get tabindex
                        var iIndex = aszFolderLinks[i].match(PatternHotmailTabindex)[1]; 
                        mainObject.m_HotmailLog.Write("nsHotmail.js - mailBoxOnloadHandler - folder index: " +iIndex);
                        if(iIndex == 131)
                        {
                            szJunkFolder = aszFolderLinks[i].match(PatternHotmailHMFO)[1];
                            mainObject.m_HotmailLog.Write("nsHotmail.js - mailBoxOnloadHandler - folder id: " +szJunkFolder);
                        }
                    }
    
                    mainObject.m_szJunkFolderURI = mainObject.m_szLocationURI + szFolderURL + szJunkFolder;
                    mainObject.m_HotmailLog.Write("nsHotmail.js - mailBoxOnloadHandler - folder uri: " +mainObject.m_szJunkFolderURI);
                }
                catch(err)
                {
                    mainObject.m_HotmailLog.DebugDump("nsHotmail.js: mailBoxOnloadHandler folder: Exception : " 
                                                      + err.name 
                                                      + ".\nError message: " 
                                                      + err.message);
                }   
            }
                     
                      
            //get pages uri
            if (mainObject.m_aszPageURLS.length==0)
            {
                //get UM
                mainObject.m_szUM= szResponse.match(PatternHotmail_UM)[1];
                mainObject.m_HotmailLog.Write("nsHotmail.js - mailBoxOnloadHandler -msg pages UM : " +mainObject.m_szUM)
                
                //any more pages
                var aPages = szResponse.match(PatternHotmailMultPageNum);
                mainObject.m_HotmailLog.Write("nsHotmail.js - mailBoxOnloadHandler -msg pages : " +aPages);
                
                if (aPages)
                {   //more than one page
                    var aNums = aPages[3].match(PatternHotmailPages);
                    mainObject.m_HotmailLog.Write("nsHotmail.js - mailBoxOnloadHandler -msg pages num : " +aNums);
                
                    //construct page urls
                    for (i =1 ; i < aNums.length ; i++)  //start at second page
                    {
                        mainObject.m_aszPageURLS.push(mainObject.m_szLocationURI + aPages[1] 
                                                       + mainObject.m_szUM + aPages[2] + (i+1));        
                    }
                }
                
                 mainObject.m_HotmailLog.Write("nsHotmail.js - mailBoxOnloadHandler -msg pages url : " 
                                                        + mainObject.m_aszPageURLS
                                                        + " length "
                                                        + mainObject.m_aszPageURLS.length);
            }
            
            
            //get msg urls
            var aMsgTable = szResponse.match(PatternHotmailMsgTable);
            if (aMsgTable == null) throw new Error("aMsgTable == null");
            mainObject.m_HotmailLog.Write("nsHotmail.js - mailBoxOnloadHandler -msg table : " +aMsgTable[1]);
            var szMsgRows = aMsgTable[1].split(/<tr.*?>/);  //split on rows
            mainObject.m_HotmailLog.Write("nsHotmail.js - mailBoxOnloadHandler -split msg table : " +szMsgRows);
            if (szMsgRows == null) throw new Error("szMsgRows == null");//oops
            
            var tempTotalSize = 0;
            var tempNum = 0; 
            for (j = 0; j < szMsgRows.length; j++)
            {
                var aEmailURL = szMsgRows[j].match(PatternHotmailEmailURL);
                mainObject.m_HotmailLog.Write("nsHotmail.js - mailBoxOnloadHandler - Email URL : " +aEmailURL);
                if (aEmailURL)
                {
                    var szPath = mainObject.m_szLocationURI+aEmailURL[1]+"&"+mainObject.m_szUM+"&raw=1";
                    mainObject.m_HotmailLog.Write("nsHotmail.js - mailBoxOnloadHandler - Email URL : " +szPath);
                    mainObject.m_aszMsgIDStore.push(szPath);  
                    var aEmailLength = aEmailURL[1].match(PatternHotmailEmailLength);
                    
                    var lSize = 0;
                    if (aEmailLength) 
                        lSize = parseInt(aEmailLength[1]);
                    else
                        lSize = 2000;
                          
                    mainObject.m_HotmailLog.Write("nsHotmail.js - mailBoxOnloadHandler - size : " +lSize);    
                    tempTotalSize += lSize;
                    tempNum ++; 
                 }  
            }
            
            mainObject.m_iNum += tempNum;
            mainObject.m_iTotalSize += tempTotalSize;
            mainObject.m_HotmailLog.Write("nsHotmail.js - mailBoxOnloadHandler - Num " + mainObject.m_iNum 
                                                            +" Total " + mainObject.m_iTotalSize);
            
            
            mainObject.m_HotmailLog.Write("nsHotmail.js - mailBoxOnloadHandler -msg pages : " +mainObject.m_aszPageURLS);    
            
            var ios=Components.classes["@mozilla.org/network/io-service;1"].
                                    getService(Components.interfaces.nsIIOService);
            
            mainObject.m_HotmailLog.Write("nsHotmail.js - mailBoxOnloadHandler -msg pages count : " 
                                                + mainObject.m_aszPageURLS.length + " "
                                                + mainObject.m_iPageCount);   
                                                                             
            if (mainObject.m_aszPageURLS.length!= mainObject.m_iPageCount)//more pages
            {           
                //set cookies
                var szTempURI = mainObject.m_aszPageURLS[ mainObject.m_iPageCount];
                mainObject.m_HotmailLog.Write("nsHotmail.js - mailBoxOnloadHandler - page: " + szTempURI); 
                var szURL = ios.newURI(szTempURI,null,null).prePath;
                var aszHost = szURL.match(/[^\.\/]+\.[^\.\/]+$/); 
                var aszCookie = mainObject.m_oCookies.findCookie(aszHost);                                                             
                var bResult = mainObject.httpConnection(szTempURI, 
                                                        "GET", 
                                                        null, 
                                                        aszCookie,
                                                        mainObject.mailBoxOnloadHandler);
               
                mainObject.m_iPageCount++;                       
                if (!bResult) throw new Error("httpConnection returned false");
            }
            else  //done with mailbox
            {  
                mainObject.m_HotmailLog.Write("nsHotmail.js - mailBoxOnloadHandler - use junkmail: " 
                                                        + mainObject.m_bUseJunkMail
                                                        + " Done " + mainObject.m_bJunkMailDone
                                                        + " uri " + mainObject.m_szJunkFolderURI );
                 
                if (!mainObject.m_bJunkMailDone && mainObject.m_bUseJunkMail && mainObject.m_szJunkFolderURI)
                { //get junkmail
                    mainObject.m_HotmailLog.Write("nsHotmail.js - mailBoxOnloadHandler - junkmail: " + mainObject.m_bUseJunkMail); 
                    
                    mainObject.m_bJunkMailDone = true;
                    mainObject.m_iPageCount = 0; //reset array
                    mainObject.m_aszPageURLS = new Array;
                    
                    //set cookies
                    var szURL = ios.newURI(mainObject.m_szJunkFolderURI,null,null).prePath;
                    var aszHost = szURL.match(/[^\.\/]+\.[^\.\/]+$/); 
                    var aszCookie = mainObject.m_oCookies.findCookie(aszHost);
                                                                                      
                    var bResult = mainObject.httpConnection(mainObject.m_szJunkFolderURI, 
                                                            "GET", 
                                                            null, 
                                                            aszCookie,
                                                            mainObject.mailBoxOnloadHandler);
                                                    
                    if (!bResult) throw new Error("httpConnection returned false");
                }
                else  //all uri's collected
                {
                   mainObject.serverComms("+OK "+ mainObject.m_iNum + " " + mainObject.m_iTotalSize + "\r\n");
                }
            }
            mainObject.m_HotmailLog.Write("nsHotmail.js - MailBoxOnload - END"); 
        }
        catch(err)
        {
             mainObject.m_HotmailLog.DebugDump("nsHotmail.js: MailboxOnload : Exception : " 
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
            this.m_HotmailLog.Write("nsHotmail.js - getMessageSizes - START"); 
            
            var iTempNum = 0;
            var aTempSize = new Array();
            
            for (i = 0; i <  this.m_aszMsgIDStore.length; i++)
            {
                var szEmailURL = this.m_aszMsgIDStore[i];
                this.m_HotmailLog.Write("nsHotmail.js - getMessageSizes - Email URL : " +szEmailURL);
               
                //get size 
                var aEmailLength = szEmailURL.match(PatternHotmailEmailLength);
                var lSize = 0
                if (aEmailLength) 
                    lSize = aEmailLength[1];
                else
                    lSize = 2000;
                    
                this.m_HotmailLog.Write("nsHotmail.js - getMessageSizes - size : " +lSize);    
                aTempSize.push(lSize);
                iTempNum++; 
            }         
    
            this.m_HotmailLog.Write("nsHotmail.js - getMessagesSizes - : " 
                                                            + aTempSize + " " 
                                                            + iTempNum); 
            
            var szPOPResponse = "+OK " + iTempNum + " Messages\r\n"; 
            for (i =0 ; i<iTempNum; i++)
            {
                szPOPResponse+=(i+1) + " " + aTempSize[i] + "\r\n";                        
            }
            szPOPResponse += ".\r\n";
            
            this.serverComms(szPOPResponse);
            this.m_HotmailLog.Write("nsHotmail.js - getMessageSizes - END"); 
            return true;
        }
        catch(e)
        {
            this.m_HotmailLog.DebugDump("nsHotmail.js: getMessageSizes : Exception : " 
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
            this.m_HotmailLog.Write("nsHotmail.js - getMessageIDs - START"); 
            
            var iTempNum = 0;
            var aTempIDs = new Array();
            
            for (i = 0; i <  this.m_aszMsgIDStore.length; i++)
            {
                var szEmailURL = this.m_aszMsgIDStore[i];
                this.m_HotmailLog.Write("nsHotmail.js - getMessageIDs - Email URL : " +szEmailURL);
               
                var aEmailID = szEmailURL.match(PatternHotmailEmailID);
                var szEmailID;
                if (aEmailID ==null) //not got id
                {  
                    var iStartOfID = szEmailURL.indexOf('='); 
                    szEmailID =  szEmailURL.substring(iStartOfID +1, szEmailURL.length );
                }
                else
                    szEmailID = aEmailID[1];
                    
                this.m_HotmailLog.Write("nsHotmail.js - getMessageIDs - IDS : " +szEmailID);    
                aTempIDs.push(szEmailID);
                iTempNum++; 
            }         
     
            this.m_HotmailLog.Write("nsHotmail.js - getMessageIDs - return : " 
                                                + aTempIDs + " "
                                                + iTempNum); 
                                                
            var szPOPResponse = "+OK " + iTempNum + " Messages\r\n";
            for (i =0 ; i<iTempNum; i++)
            {
                szPOPResponse+=(i+1) + " " + aTempIDs[i] + "\r\n";                        
            }
            szPOPResponse += ".\r\n";
            this.serverComms(szPOPResponse);           
           
            this.m_HotmailLog.Write("nsHotmail.js - getMessageIDs - END"); 
            return true;
        }
        catch(e)
        {
            this.m_HotmailLog.DebugDump("nsHotmail.js: getMessageIDs : Exception : " 
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
            this.m_HotmailLog.Write("nsHotmail.js - getMessage - START"); 
            this.m_HotmailLog.Write("nsHotmail.js - getMessage - msg num" + lID); 
            var szTempMsg = new String();
            
            //get msg id
            var szMsgURI = this.m_aszMsgIDStore[lID-1];
            this.m_HotmailLog.Write("nsHotmail.js - getMessage - msg uri" + szMsgURI); 
            
            
            var ios=Components.classes["@mozilla.org/network/io-service;1"].
                                    getService(Components.interfaces.nsIIOService);
                            
            //set cookies
            var szURL = ios.newURI(szMsgURI,null,null).prePath;
            var aszHost = szURL.match(/[^\.\/]+\.[^\.\/]+$/); 
            var aszCookie = this.m_oCookies.findCookie(aszHost);
                       
            //get msg from hotmail
            var bResult = this.httpConnection(szMsgURI, 
                                                "GET", 
                                                null,
                                                aszCookie, 
                                                this.emailOnloadHandler);  
                                           
            if (!bResult) throw new Error("httpConnection returned false"); 
             
            this.m_HotmailLog.Write("nsHotmail.js - getMessage - END"); 
            return true;
        }
        catch(e)
        {
             this.m_HotmailLog.DebugDump("nsHotmail.js: getMessage : Exception : " 
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
            mainObject.m_HotmailLog.Write("nsHotmail.js - emailOnloadHandler - START");
            
            mainObject.m_HotmailLog.Write("nsHotmail.js - emailOnloadHandler - msg :\n" + szResponse); 
            
            var httpChannel = event.QueryInterface(Components.interfaces.nsIHttpChannel);
                      
            //check status should be 200.
            mainObject.m_HotmailLog.Write("nsHotmail.js - emailOnloadHandler - msg :" + httpChannel.responseStatus);
            if (httpChannel.responseStatus != 200 && httpChannel.responseStatus != 302) 
                throw new Error("error status " + httpChannel.responseStatus);   
            
            //test code
            if (httpChannel.responseStatus == 302)
            {
                //get location
                try
                {
                    var szLocation =  httpChannel.getResponseHeader("Location");
                    mainObject.m_HotmailLog.Write("nsHotmail.js - emailOnloadHandler - location \n" + szLocation);  
                }
                catch(e)
                {
                    throw new Error("Location header not found")
                } 
                
                var ios=Components.classes["@mozilla.org/network/io-service;1"].
                                    getService(Components.interfaces.nsIIOService);
                var szURL = ios.newURI(szLocation,null,null).prePath;
                var aszHost = szURL.match(/[^\.\/]+\.[^\.\/]+$/); 
                var aszCookie = mainObject.m_oCookies.findCookie(aszHost);
                
                //load new page
                mainObject.httpConnection(szLocation, 
                                          "GET", 
                                          null,
                                          aszCookie, 
                                          mainObject.emailOnloadHandler);
                return true;
            }   
                                                                                 
            //get msg
            var aTemp = szResponse.split(/<pre>\s+/); 
            if (aTemp.length == 0)
                throw new Error("Message START  not found");     
            var szMsg = aTemp[1].split(/<\/pre>/)[0];
             if (szMsg.length == 0)
                throw new Error("Message END  not found"); 
            
            
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
           
            mainObject.m_HotmailLog.Write("nsHotmail.js - emailOnloadHandler - END");      
        }
        catch(err)
        {
            mainObject.m_HotmailLog.DebugDump("nsHotmail.js: emailOnloadHandler : Exception : " 
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
            this.m_HotmailLog.Write("nsHotmail.js - deleteMessage - START");  
            this.m_HotmailLog.Write("nsHotmail.js - deleteMessage - id " + lID ); 
                   
            //create URL
            var szTempID = this.m_aszMsgIDStore[lID-1];
            this.m_HotmailLog.Write("nsHotmail.js - deleteMessage - id " + szTempID );
            //msg id
            var aTempID = szTempID.match(PatternHotmailEmailID); 
            var szID ;
            if (aTempID == null)
            {
                var iTempID = szTempID.indexOf("=");
                this.m_HotmailLog.Write("nsHotmail.js - deleteMessage - id " + iTempID ); 
                szID = szTempID.substring(iTempID+1,szTempID.length);
            }
            else
                szID = aTempID[1];
            this.m_HotmailLog.Write("nsHotmail.js - deleteMessage - MSGid " + szID );    
                
            //folder id
            var szFolderID = szTempID.match(PatterHotmailFolderID)[1];
            this.m_HotmailLog.Write("nsHotmail.js - deleteMessage - FolderId " + szFolderID );
               
            //construct data
            var szPath = this.m_szLocationURI + "/cgi-bin/HoTMaiL" ;
            this.m_HotmailLog.Write("nsHotmail.js - deleteMessage - szPath " + szPath); 
           
            var szData = "curmbox=" + szFolderID;
            szData += "&HrsTest=&js=&_HMaction=delete&wo=&page=1&tobox=F000000004&ReportLevel=&rj=&DoEmpty=&SMMF=0&"
            szData += szID + "=on"; 
            this.m_HotmailLog.Write("nsHotmail.js - deleteMessage - szData " + szData);           
           
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
             
            this.m_HotmailLog.Write("nsHotmail.js - deleteMessage - END");     
            return true;
        }
        catch(e)
        {
            this.m_HotmailLog.DebugDump("nsHotmail.js: deleteMessage : Exception : " 
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
            mainObject.m_HotmailLog.Write("nsHotmail.js - deleteMessageOnload - START");    
            mainObject.m_HotmailLog.Write("nsHotmail.js - deleteMessageOnload :\n" + szResponse); 
            
            var httpChannel = event.QueryInterface(Components.interfaces.nsIHttpChannel);
            
            //check status should be 200.
            mainObject.m_HotmailLog.Write("nsHotmail.js - deleteMessageOnload :" + httpChannel.responseStatus);
            if (httpChannel.responseStatus != 200 ) 
                throw new Error("error status " + httpChannel.responseStatus);   
                    
            mainObject.serverComms("+OK its history\r\n");      
            mainObject.m_HotmailLog.Write("nsHotmail.js - deleteMessageOnload - END");      
        }
        catch(e)
        {
            mainObject.m_HotmailLog.DebugDump("nsHotmail.js: deleteMessageOnload : Exception : " 
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
            this.m_HotmailLog.Write("nsHotmail.js - logOUT - START"); 
            
            this.m_bAuthorised = false;
            this.serverComms("+OK Your Out\r\n");             
                                           
            this.m_HotmailLog.Write("nsHotmail.js - logOUT - END");  
            return true;
        }
        catch(e)
        {
            this.m_HotmailLog.DebugDump("nsHotmail.js: logOUT : Exception : " 
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
            this.m_HotmailLog.Write("nsHotmail.js - serverComms - START");
            this.m_HotmailLog.Write("nsHotmail.js - serverComms msg " + szMsg);
            var iCount = this.m_oResponseStream.write(szMsg,szMsg.length);
            this.m_HotmailLog.Write("nsHotmail.js - serverComms sent count: " + iCount 
                                                        +" msg length: " +szMsg.length);
            this.m_HotmailLog.Write("nsHotmail.js - serverComms - END");  
        }
        catch(e)
        {
            this.m_HotmailLog.DebugDump("nsHotmail.js: serverComms : Exception : " 
                                              + e.name 
                                              + ".\nError message: " 
                                              + e.message);
        }
    },
   
      
    httpConnection : function (szURL, szType, szData, szCookies ,callBack)
    {
        try
        {
            this.m_HotmailLog.Write("nsHotmail.js - httpConnection - START");   
            this.m_HotmailLog.Write("nsHotmail.js - httpConnection - " + szURL + "\n"
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
                this.m_HotmailLog.Write("nsHotmail.js - httpConnection - adding cookie \n" + szCookies); 
                HttpRequest.setRequestHeader("x-CookieHack", "Hacker\r\nCookie: "  + szCookies , false);
            }
           
            
            //set data
            if (szData)
            {
                this.m_HotmailLog.Write("nsHotmail.js - httpConnection - adding data");
                
                var uploadStream = Components.classes["@mozilla.org/io/string-input-stream;1"]
                                    .createInstance(Components.interfaces.nsIStringInputStream);         
                uploadStream.setData(szData, szData.length);
        
                var uploadChannel = channel.QueryInterface(Components.interfaces.nsIUploadChannel);
                uploadChannel.setUploadStream(uploadStream, "application/x-www-form-urlencoded", -1); 
            }
            HttpRequest.requestMethod = szType;
            
            var listener = new this.downloadListener(callBack, this);
            channel.asyncOpen(listener, null);  
            
            this.m_HotmailLog.Write("nsHotmail.js - httpConnection - END"); 
            
            return true;  
        }
        catch(e)
        {
            this.m_HotmailLog.DebugDump("nsHotmail.js: httpConnection : Exception : " 
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
var nsHotmailFactory = new Object();

nsHotmailFactory.createInstance = function (outer, iid)
{
    if (outer != null) throw Components.results.NS_ERROR_NO_AGGREGATION;
    
    if (!iid.equals(nsHotmailClassID) && !iid.equals(Components.interfaces.nsISupports))
        throw Components.results.NS_ERROR_INVALID_ARG;
    
    return new nsHotmail();
}


/******************************************************************************/
/* MODULE */
var nsHotmailModule = new Object();

nsHotmailModule.registerSelf = function(compMgr, fileSpec, location, type)
{
    compMgr = compMgr.QueryInterface(Components.interfaces.nsIComponentRegistrar);
    compMgr.registerFactoryLocation(nsHotmailClassID,
                                    "HotmailComponent",
                                    nsHotmailContactID, 
                                    fileSpec,
                                    location, 
                                    type);
}


nsHotmailModule.unregisterSelf = function(aCompMgr, aFileSpec, aLocation)
{
    aCompMgr = aCompMgr.QueryInterface(Components.interfaces.nsIComponentRegistrar);
    aCompMgr.unregisterFactoryLocation(nsHotmailClassID, aFileSpec);
}

 
nsHotmailModule.getClassObject = function(compMgr, cid, iid)
{
    if (!cid.equals(nsHotmailClassID))
        throw Components.results.NS_ERROR_NO_INTERFACE;

    if (!iid.equals(Components.interfaces.nsIFactory))
        throw Components.results.NS_ERROR_NOT_IMPLEMENTED;

    return nsHotmailFactory;
}


nsHotmailModule.canUnload = function(compMgr)
{
    return true;
}
/******************************************************************************/


function NSGetModule(compMgr, fileSpec)
{
    return nsHotmailModule; 
}
