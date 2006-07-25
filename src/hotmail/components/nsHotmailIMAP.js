/*****************************  Globals   *************************************/                 
const nsHotmailIMAPClassID = Components.ID("{8cad2a80-056b-11db-9cd8-0800200c9a66}"); 
const nsHotmailIMAPContactID = "@mozilla.org/HotmailIMAP;1";


const HotmailSchema = "<?xml version=\"1.0\"?>\r\n<D:propfind xmlns:D=\"DAV:\" xmlns:h=\"http://schemas.microsoft.com/hotmail/\" xmlns:hm=\"urn:sc hemas:httpmail:\">\r\n<D:prop>\r\n<h:adbar/>\r\n<hm:contacts/>\r\n<hm:inbox/>\r\n<hm:outbox/>\r\n<hm:sendmsg/>\r\n<hm:sentitems/>\r\n<hm:deleteditems/>\r\n<hm:drafts/>\r\n<hm:msgfolderroot/>\r\n<h:maxpoll/>\r\n<h:sig/>\r\n</D:prop>\r\n</D:propfind>";
const HotmailFolderIMAPSchema = "<?xml version=\"1.0\"?>\r\n<D:propfind xmlns:D=\"DAV:\" xmlns:hm=\"urn:schemas:httpmail:\">\r\n<D:prop>\r\n<D:isfolder/>\r\n<D:displayname/>\r\n<hm:special/>\r\n<D:hassubs/>\r\n<D:nosubs/>\r\n<hm:unreadcount/>\r\n<D:visiblecount/>\r\n<hm:special/>\r\n</D:prop>\r\n</D:propfind>";
const HotmailMailIMAPSchema = "<?xml version=\"1.0\"?>\r\n<D:propfind xmlns:D=\"DAV:\" xmlns:hm=\"urn:schemas:httpmail:\" xmlns:m=\"urn:schemas:mailheader:\">\r\n<D:prop>\r\n<D:isfolder/>\r\n<hm:read/>\r\n<m:hasattachment/>\r\n<m:to/>\r\n<m:from/>\r\n<m:subject/>\r\n<m:date/>\r\n<D:getcontentlength/>\r\n</D:prop>\r\n</D:propfind>";
const HotmailPROPReadSchema = "<?xml version=\"1.0\"?>\r\n<D:propertyupdate xmlns:D=\"DAV:\" xmlns:hm=\"urn:schemas:httpmail:\">\r\n<D:set>\r\n<D:prop>\r\n<hm:read>0</hm:read>\r\n</D:prop>\r\n</D:set>\r\n</D:propertyupdate>";
const HotmailPROPUnReadSchema = "<?xml version=\"1.0\"?>\r\n<D:propertyupdate xmlns:D=\"DAV:\" xmlns:hm=\"urn:schemas:httpmail:\">\r\n<D:set>\r\n<D:prop>\r\n<hm:read>0</hm:read>\r\n</D:prop>\r\n</D:set>\r\n</D:propertyupdate>";

const HotmailIMAPMSGIDPattern = /[^\/]+$/;
const HotmailIMAPResponse = /<D:response>[\S\d\s\r\n]*?<\/D:response>/gm;
const HotmailIMAPHref = /<D:href>(.*?)<\/D:href>/i;
const HotmailIMAPRead = /<hm:read>(.*?)<\/hm:read>/i;
const HotmailIMAPSize = /<D:getcontentlength>(.*?)<\/D:getcontentlength>/i;
const HotmailIMAPAttachment = /<m:hasattachment>(.*?)<\/m:hasattachment>/i;
const HotmailIMAPTo = /<m:to>(.*?)<\/m:to>/i;
const HotmailIMAPFrom = /<m:from>(.*?)<\/m:from>/i;
const HotmailIMAPSubject = /<m:subject>(.*?)<\/m:subject>/i;
const HotmailIMAPDate = /<m:date>(.*?)T(.*?)<\/m:date>/i;

const HotmailIMAPFolderPattern = /<hm:msgfolderroot>(.*?)<\/hm:msgfolderroot>/;
const HotmailIMAPUnreadCount = /<hm:unreadcount>(.*?)<\/hm:unreadcount>/;
const HotmailIMAPMsgCount = /<D:visiblecount>(.*?)<\/D:visiblecount>/;
const HotmailIMAPDisplayName = /<D:displayname>(.*?)<\/D:displayname>/;
const HotmailIMAPSpecial = /<hm:special>(.*?)<\/hm:special>/;
/***********************  Hotmail ********************************/

function nsHotmailIMAP()
{
    try
    {       
        var scriptLoader =  Components.classes["@mozilla.org/moz/jssubscript-loader;1"];
        scriptLoader = scriptLoader.getService(Components.interfaces.mozIJSSubScriptLoader);
        scriptLoader.loadSubScript("chrome://web-mail/content/common/DebugLog.js");
        scriptLoader.loadSubScript("chrome://web-mail/content/common/HttpComms2.js");
        scriptLoader.loadSubScript("chrome://web-mail/content/common/CommonPrefs.js");
       
        var date = new Date();
        var  szLogFileName = "HotmailIMAP Log - " + date.getHours()+ "-" + date.getMinutes() + "-"+ date.getUTCMilliseconds() +" -";
        this.m_Log = new DebugLog("webmail.logging.comms", 
                                  "{3c8e8390-2cf6-11d9-9669-0800200c9a66}" ,
                                  szLogFileName); 
        
        this.m_Log.Write("nsHotmailIMAP.js - Constructor - START");
       
        this.m_szUserName = null;   
        this.m_szPassWord = null; 
        this.m_oResponseStream = null; 
        this.m_iTag = 0;     
        
        this.m_oFolder = Components.classes["@mozilla.org/nsIMAPFolders;1"];
        this.m_oFolder = this.m_oFolder.getService(Components.interfaces.nsIIMAPFolders);
        
        this.m_HttpComms = new HttpComms(); 
        this.m_HttpComms.setHandleHttpAuth(true);     
        this.m_bAuthorised = false;   
        this.m_iStage=0; 
        this.m_szFolderURI = null;
        this.m_szFolderReference = null;
        this.m_szSelectFolder = null;
        this.m_copyDest = null;
        this.m_bStoreStatus = false;
        this.m_bStoreDelete = false;
        this.m_szFolderName = null;
        this.m_szFolderNewName = null;
        this.m_aRawData = new Array();
        this.m_iTimerTask = -1;
        this.m_iStore = 0;
        this.m_iLastCheck = 0;
        this.m_szRange = null;
        this.m_szFlag = null;
        this.m_iUID = 0;
            
        this.m_Timer = Components.classes["@mozilla.org/timer;1"];
        this.m_Timer = this.m_Timer.createInstance(Components.interfaces.nsITimer);

        this.m_SessionManager = Components.classes["@mozilla.org/SessionManager;1"]
                                          .getService(Components.interfaces.nsISessionManager);
        this.m_SessionData = null;


        var oPref = {Value:null};
        var  WebMailPrefAccess = new WebMailCommonPrefAccess();
        if (WebMailPrefAccess.Get("int","hotmail.iProcessDelay",oPref))
            this.m_iTime=oPref.Value;
        else
            this.m_iTime=10; 
        
         //do i reuse the session
        oPref.Value = null;
        if (WebMailPrefAccess.Get("int","hotmail.iBiff",oPref))
            this.m_iBiff =oPref.Value;
        else
            this.m_iBiff = 300000; 
      
        
        //do i reuse the session
        oPref.Value = null;
        if (WebMailPrefAccess.Get("bool","hotmail.bReUseSession",oPref))
            this.m_bReUseSession=oPref.Value;
        else
            this.m_bReUseSession=true; 
                
        this.m_Log.Write("nsHotmailIMAP.js - Constructor - END");
    }
    catch(e)
    {
        DebugDump("nsHotmailIMAP.js: Constructor : Exception : "
                                      + e.name 
                                      + ".\nError message: " 
                                      + e.message+ "\n"
                                      + e.lineNumber);
    }
}



nsHotmailIMAP.prototype =
{
    get userName() {return this.m_szUserName;},
    set userName(userName) {return this.m_szUserName = userName;},
    
    get passWord() {return this.m_szPassWord;},
    set passWord(passWord) {return this.m_szPassWord = passWord;},
    
    get tag() {return this.m_iTag;},
    set tag(iTag) {return this.m_iTag = iTag;},
     
    get bAuthorised() {return this.m_bAuthorised;},
  
    get ResponseStream() {return this.m_oResponseStream;},
    set ResponseStream(responseStream) {return this.m_oResponseStream = responseStream;},
    
       
    logIn : function()
    {
        try
        {
            this.m_Log.Write("nsHotmailIMAP.js - logIN - START");
            this.m_Log.Write("nsHotmailIMAP.js - logIN - Username: " + this.m_szUserName
                                                   + " Password: "  + this.m_szPassWord 
                                                   + " stream: "    + this.m_oResponseStream);
            
            if (!this.m_szUserName || !this.m_oResponseStream || !this.m_szPassWord) return false;
            
            var szDomain = this.m_szUserName.split("@")[1];
            this.m_Log.Write("nsHotmailIMAP.js - logIN - doamain " + szDomain);
            
            if (this.m_bReUseSession)
            {
                this.m_Log.Write("nsHotmailIMAP.js - logIN - Getting Seassion Data");
                this.m_SessionData = this.m_SessionManager.findSessionData(this.m_szUserName);
                if (this.m_SessionData)
                {
                    this.m_Log.Write("nsHotmailIMAP.js - logIN - Session Data found");
                    if (this.m_SessionData.oCookieManager)
                        this.m_HttpComms.setCookieManager(this.m_SessionData.oCookieManager);
                    
                    if (this.m_SessionData.oHttpAuthManager)
                        this.m_HttpComms.setHttpAuthManager(this.m_SessionData.oHttpAuthManager); 
                }
            }
                    
            this.m_HttpComms.setUserName(this.m_szUserName);
            this.m_HttpComms.setPassword(this.m_szPassWord);
            this.m_HttpComms.setContentType("text/xml");
            this.m_HttpComms.setURI("http://oe.hotmail.com/svcs/hotmail/httpmail.asp");
            this.m_HttpComms.setRequestMethod("PROPFIND");
            this.m_HttpComms.addData(HotmailSchema);
            var bResult = this.m_HttpComms.send(this.loginOnloadHandler, this);                             
            if (!bResult) throw new Error("httpConnection returned false");      
            
            this.m_Log.Write("nsHotmailIMAP.js - logIN - END " + bResult);
            return true;
        }
        catch(e)
        {
            this.m_Log.DebugDump("nsHotmailIMAP.js: logIN : Exception : "
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
            mainObject.m_Log.Write("nsHotmailIMAP.js - loginOnloadHandler - START");
            mainObject.m_Log.Write("nsHotmailIMAP.js - loginOnloadHandler : \n" + szResponse);  
            mainObject.m_Log.Write("nsHotmailIMAP.js - loginOnloadHandler : "+ mainObject.m_iStage);           
            
            var httpChannel = event.QueryInterface(Components.interfaces.nsIHttpChannel);
            
            //if this fails we've gone somewhere new
            mainObject.m_Log.Write("nsHotmail - loginOnloadHandler - status :" +httpChannel.responseStatus );
            if (httpChannel.responseStatus != 200 && httpChannel.responseStatus != 207) 
                throw new Error("return status " + httpChannel.responseStatus);
        
            mainObject.m_Log.Write("nsHotmailIMAP.js - loginOnloadHandler - get url - start");
            mainObject.m_iAuth=0; //reset login counter
            mainObject.m_szFolderURI = szResponse.match(HotmailIMAPFolderPattern)[1];
            mainObject.m_Log.Write("nsHotmailIMAP.js - loginOnloadHandler - get folder url - " + mainObject.m_szFolderURI);

            if (mainObject.m_SessionData)
            {
                mainObject.m_Log.Write("nsHotmailIMAP.js - loginOnloadHandler - Save Session Data");
                if (!mainObject.m_SessionData)
                {
                    mainObject.m_SessionData = Components.classes["@mozilla.org/SessionData;1"].createInstance();
                    mainObject.m_SessionData.QueryInterface(Components.interfaces.nsISessionData);
                    mainObject.m_SessionData.szUserName = mainObject.m_szUserName;    
                }
                mainObject.m_SessionData.oCookieManager = mainObject.m_HttpComms.getCookieManager();
                mainObject.m_SessionData.oHttpAuthManager = mainObject.m_HttpComms.getHttpAuthManager();
                mainObject.m_SessionManager.setSessionData(mainObject.m_SessionData);
            }  
                    
            //server response
            mainObject.serverComms(mainObject.m_iTag +" OK Login Complete\r\n");
            mainObject.m_bAuthorised = true;

            mainObject.m_Log.Write("nsHotmailIMAP.js - loginOnloadHandler - END");
        }
        catch(err)
        {
            mainObject.m_Log.DebugDump("nsHotmailIMAP.js: loginHandler : Exception : "
                                          + err.name 
                                          + ".\nError message: " 
                                          + err.message+ "\n"
                                          + err.lineNumber);                                  
            mainObject.serverComms(mainObject.m_iTag + " NO Comms Error\r\n");
            return false;
        }
    },
    
    
    
    
    
    
    listSubscribe : function()
    {
        try
        {
            this.m_Log.Write("nsHotmailIMAP.js - listSubscribe - START");
            
            var aszFolders = {value : null};
            var iFolders = {value : null }; 
            var aszFolder = this.m_oFolder.listSubscribed(this.m_szUserName, 
                                                          iFolders,
                                                          aszFolders);
            this.m_Log.Write("nsHotmailIMAP.js - listSubscribe - list: " + aszFolders.value);
            
            var szResponse = "";
            for (i=0; i<aszFolders.value.length; i++)
            {
                szResponse += "* lsub (\\Noinferiors \\HasNoChildren) " + "\".\" \"" + aszFolders.value[i] + "\"\r\n";  
            } 
            szResponse += this.m_iTag + " OK LSUB Completed\r\n";
            this.serverComms(szResponse);  
        
            this.m_Log.Write("nsHotmailIMAP.js - listSubscribe - END");
            return true;
        }
        catch(err)
        {
            this.m_Log.DebugDump("nsHotmailIMAP.js: listSubscribe : Exception : "
                                      + err.name 
                                      + ".\nError message: " 
                                      + err.message + "\n"
                                      + err.lineNumber);
            this.serverComms(this.m_iTag +" BAD error\r\n");  
            return false;
        }
    },   
    
    
    
    
    
    
    subscribe : function (szFolder)
    {
        try
        {
            this.m_Log.Write("nsHotmailIMAP.js - subscribe - START");
            this.m_Log.Write("nsHotmailIMAP.js - subscribe - szFolder " +szFolder);                                                                   
            if (!szFolder) return false;

            var bDone = this.m_oFolder.subscribeFolder(this.m_szUserName, szFolder); 
            var szResponse = this.m_iTag;
            szResponse += bDone? " OK " : " NO ";
            szResponse += "SUBCRIBE Completed\r\n";           
            this.serverComms(szResponse);  
            
            this.m_Log.Write("nsHotmailIMAP.js - subscribe - END");
        }
        catch(err)
        {
             this.m_Log.DebugDump("nsHotmailIMAP.js: subscribe : Exception : "
                                          + err.name 
                                          + ".\nError message: " 
                                          + err.message+ "\n"
                                          + err.lineNumber);
                                              
            this.serverComms(this.m_iTag + " NO Comms Error\r\n");
        }
    },
    
    
    
    
    
    unSubscribe : function (szFolder)
    {
        try
        {
            this.m_Log.Write("nsHotmailIMAP.js - unSubscribe - START");
            this.m_Log.Write("nsHotmailIMAP.js - unSubscribe - Folder " + szFolder );
            if (!szFolder) return false;
            
            var bDone = this.m_oFolder.unsubscribeFolder(this.m_szUserName, szFolder); 
            var szResponse = this.m_iTag;
            szResponse += bDone? " OK " : " NO ";
            szResponse += "UNSUBCRIBE Completed\r\n";            
            this.serverComms(szResponse);  
            
            this.m_Log.Write("nsHotmailIMAP.js - unSubscribe - END");
        }
        catch(err)
        {
            this.m_Log.DebugDump("nsHotmailIMAP.js: unSubscribe : Exception : "
                                                          + err.name 
                                                          + ".\nError message: " 
                                                          + err.message+ "\n"
                                                          + err.lineNumber);
            this.serverComms(this.m_iTag +" BAD error\r\n");  
            return false;
        }
    },
    
    
   
    
    
    
    list : function (szReference)
    {
        try
        {
            this.m_Log.Write("nsHotmailIMAP.js - list - START");
            this.m_Log.Write("nsHotmailIMAP.js - list - szReference " + szReference);  
            
            if (this.m_szFolderURI == null) return false;
            this.m_Log.Write("nsHotmailIMAP.js - list - mail box url " + this.m_szFolderURI);
            
            this.m_szFolderReference = szReference;

            if (this.m_oFolder.getFolderCount(this.m_szUserName)==0)
            {//donwload folder list
                this.m_HttpComms.setContentType("text/xml");
                this.m_HttpComms.setRequestMethod("PROPFIND");
                this.m_HttpComms.addData(HotmailFolderIMAPSchema);
                this.m_HttpComms.setURI(this.m_szFolderURI);
                var bResult = this.m_HttpComms.send(this.listOnloadHandler, this);                             
                if (!bResult) throw new Error("httpConnection returned false");
            }
            else
            {
                this.listResponse();
            }     
            this.m_Log.Write("nsHotmailIMAP.js - list - END");
            return true;
        }
        catch(err)
        {
            this.m_Log.DebugDump("nsHotmailIMAP.js: list : Exception : "
                                      + err.name 
                                      + ".\nError message: " 
                                      + err.message + "\n"
                                      + err.lineNumber);
                                      
            this.serverComms(this.m_iTag +" BAD error\r\n");  
            return false;
        }    
    },
    
  
    
    listOnloadHandler : function (szResponse ,event , mainObject)
    {
        try
        {
            mainObject.m_Log.Write("nsHotmailIMAP.js - listOnloadHandler - START");
            mainObject.m_Log.Write("nsHotmailIMAP.js - listOnloadHandler - " + szResponse);
            
            var httpChannel = event.QueryInterface(Components.interfaces.nsIHttpChannel);
            
            //if this fails we've gone somewhere new
            mainObject.m_Log.Write("nsHotmail - listOnloadHandler - status :" +httpChannel.responseStatus );
            if (httpChannel.responseStatus != 200 && httpChannel.responseStatus != 207) 
                throw new Error("return status " + httpChannel.responseStatus);
                                          
            //get root folders
            mainObject.m_Log.Write("nsHotmailIMAP.js - listOnloadHandler - get root folder list - START");
            
            var aszResponses = szResponse.match(HotmailIMAPResponse);
            mainObject.m_Log.Write("nsHotmailIMAP.js - listOnloadHandler - folders - \n" + aszResponses);
            
            var szResponse = "";
            
            for (i=0; i<aszResponses.length; i++)
            {
                mainObject.processFolder(aszResponses[i]);
            }
            
            mainObject.listResponse();
            
            mainObject.m_Log.Write("nsHotmailIMAP.js - listOnloadHandler - END");
        }
        catch(err)
        {
             mainObject.m_Log.DebugDump("nsHotmailIMAP.js: listOnloadHandler : Exception : "
                                              + err.name 
                                              + ".\nError message: " 
                                              + err.message + "\n"
                                              + err.lineNumber);
            
             mainObject.serverComms(mainObject.m_iTag +" BAD error\r\n");
        }
    },
    
    
    
    
    
    processFolder : function (szFolder)
    {
        try
        {
            this.m_Log.Write("nsHotmailIMAP.js - processFolder - START");
            this.m_Log.Write("nsHotmailIMAP.js - processFolder - szFolder " +szFolder);
            
            var szHref = szFolder.match(HotmailIMAPHref)[1];
            this.m_Log.Write("nsHotmailIMAP.js - processFolder - szHref " +szHref);        
            
            var szDisplayName = null;
            try
            {
                szDisplayName = szFolder.match(HotmailIMAPDisplayName)[1];
            }
            catch(e)
            {
                szDisplayName = szFolder.match(HotmailIMAPSpecial)[1];
            }
            this.m_Log.Write("nsHotmailIMAP.js - processFolder - szDisplayName " +szDisplayName);
                          
            var szHiererchy = null;
            if (szHref.search(/inbox/i)!=-1 || szHref.search(/active/i)!=-1  )
            {
                szHiererchy = "INBOX";
            }
            else if (szHref.search(/trash/i)!=-1)
            {
                szHiererchy = "INBOX.Trash"
            }
            else
            {//not inbox
                szHiererchy = "INBOX." + szDisplayName;
            } 
            this.m_Log.Write("nsHotmailIMAP.js - processFolder - szHiererchy " +szHiererchy);
            
            
            var iDNvalue=0;
            for (var i=0; i<szDisplayName.length; i++)
            {
                iDNvalue+=szDisplayName.charCodeAt(i); 
            }
            
            var today = new Date();
            var szIndex = today.getDate(); 
            szIndex +=(today.getMonth()+1);
            szIndex += today.getHours();
            szIndex += today.getMinutes();
            szIndex += today.getMilliseconds();
            szIndex += iDNvalue;    
            this.m_Log.Write("nsHotmailIMAP.js - processFolder - szIndex " +szIndex);
             
            var iUnreadCount = parseInt(szFolder.match(HotmailIMAPUnreadCount)[1]);
            var iMsgCount =  parseInt(szFolder.match(HotmailIMAPMsgCount)[1]);
            
            this.m_oFolder.addFolder(this.m_szUserName, szHiererchy, szHref, szIndex, 0, 0);
            this.m_Log.Write("nsHotmailIMAP.js - processFolder - END");
        }
        catch(err)
        {
            this.m_Log.DebugDump("nsHotmailIMAP.js: listResponse : Exception : "
                                  + err.name 
                                  + ".\nError message: " 
                                  + err.message + "\n"
                                  + err.lineNumber);
            return false;
        }
    },
    
    
    
    
    
    listResponse : function ()
    {
        try
        {
            this.m_Log.Write("nsHotmailIMAP.js - listResponse - START");
            
            var szResponse = "";
            var aszFolders = {value : null};
            var iCount = {value : null };
            this.m_oFolder.getHierarchies(this.m_szUserName, this.m_szFolderReference ,iCount, aszFolders ); 
            
            for (i=0; i<aszFolders.value.length; i++)
            {
                szResponse += "* LIST (\\Noinferiors \\HasNoChildren) \".\" \"" + aszFolders.value[i] +"\"\r\n";
            }
            
            if (aszFolders.value.length>0)
                szResponse += this.m_iTag + " OK LIST COMPLETE\r\n"
            else
                szResponse = this.m_iTag + " NO LIST COMPLETE\r\n"

            this.serverComms(szResponse);
            
            this.m_Log.Write("nsHotmailIMAP.js - listResponse - END");    
        }
        catch(err)
        {
             this.m_Log.DebugDump("nsHotmailIMAP.js: listResponse : Exception : "
                                              + err.name 
                                              + ".\nError message: " 
                                              + err.message + "\n"
                                              + err.lineNumber);
            
             this.serverComms(this.m_iTag +" BAD error\r\n");
        }
    },
    
    
    
    
    
    select : function (szReference)
    {
        try
        {
            this.m_Log.Write("nsHotmailIMAP.js - select - START");   
            this.m_Log.Write("nsHotmailIMAP.js - select - szReference " + szReference);           
            this.m_szSelectFolder = szReference;
                
            
            if ((this.m_iLastCheck + this.m_iBiff)<this.getTime()) //recheck mail box if last check was more than 5m ago
            {
                this.m_Log.Write("nsHotmailIMAP.js - select - Check for new data");
                this.refreshMSGlist(0);  
            }
            else
            {
                this.m_Log.Write("nsHotmailIMAP.js - select - Use stored data");
                
                //get folder details
                var oHref = {value:null};
                var oUID = {value:null};
                var oMSGCount = {value:null};
                var oUnreadCount = {value:null};
                
                if (!this.m_oFolder.getFolderDetails(this.m_szUserName, this.m_szSelectFolder , oHref , oUID, oMSGCount, oUnreadCount))
                    throw new Error("folder not found");
                    
                //send select ok message back to TB
                var szSelectResponse= "* " +  oMSGCount.value + " EXISTS\r\n";
                szSelectResponse+= "* " + oUnreadCount.value + " RECENT\r\n";
                szSelectResponse+= "* OK [UIDVALIDITY " + oUID.value + "] UIDs\r\n";
                szSelectResponse+= "* FLAGS (\\Seen \\Deleted)\r\n";
                szSelectResponse+= "* OK [PERMANENTFLAGS (\\Seen)] Limited\r\n";
                szSelectResponse+= this.m_iTag +" OK [READ-WRITE] SELECT COMPLETE\r\n"; 
                
                this.serverComms(szSelectResponse);
            }    
            
                                                                                                
            this.m_Log.Write("nsHotmailIMAP.js - select - END");
            return true;
        }
        catch(err)
        {
            this.m_Log.DebugDump("nsHotmailIMAP.js: select : Exception : "
                                      + err.name 
                                      + ".\nError message: " 
                                      + err.message  +"\n"
                                      + err.lineNumber);
                                      
            this.serverComms(this.m_iTag +" BAD error\r\n"); 
            return false;
        }
    },
    
    
     
    noop : function ()
    {
        try
        {
            this.m_Log.Write("nsHotmailIMAP.js - noop - START");
            
            if ((this.m_iLastCheck + this.m_iBiff)<this.getTime()) //recheck mail box if last check was more than 5m ago
            {
                this.m_Log.Write("nsHotmailIMAP.js - noop - Check for new data");
                this.refreshMSGlist(4);  
            }
            else
            {
                this.m_Log.Write("nsHotmailIMAP.js - noop - Use stored data");
                //get folder details
                var oHref = {value:null};
                var oUID = {value:null};
                var oMSGCount = {value:null};
                var oUnreadCount = {value:null};
                
                if (!this.m_oFolder.getFolderDetails(this.m_szUserName, this.m_szSelectFolder , oHref , oUID, oMSGCount, oUnreadCount))
                    throw new Error("folder not found");
                    
                //send select ok message back to TB
                var szSelectResponse= "* " +  oMSGCount.value + " EXISTS\r\n";
                szSelectResponse+= "* " + oUnreadCount.value + " RECENT\r\n";
                szSelectResponse+= this.m_iTag +" OK NOOP COMPLETE\r\n"; 
                
                this.serverComms(szSelectResponse);
            }
            this.m_Log.Write("nsHotmailIMAP.js - noop - END");   
        }
        catch(err)
        {
            this.m_Log.DebugDump("nsHotmailIMAP.js: noop : Exception : "
                                              + err.name 
                                              + ".\nError message: " 
                                              + err.message + "\n"
                                              + err.lineNumber);
            
            this.serverComms(this.m_iTag +" BAD error\r\n");
            return false;
        }
    },
    
  

    
    
    
    
    refreshMSGlist : function (iTask)
    {
        try
        {
            this.m_Log.Write("nsHotmailIMAP.js - refreshMSGlist - START");
            
            var oHref = {value:null};
            var oUID = {value:null};
            var oMSGCount = {value:null};
            var oUnreadCount = {value:null};
            if (!this.m_oFolder.getFolderDetails(this.m_szUserName, this.m_szSelectFolder , oHref , oUID, oMSGCount, oUnreadCount))
                throw new Error("Folder not found");
           
            this.m_Log.Write("nsHotmailIMAP.js - noop - " + oHref.value + " " + oUID.value + " " + oMSGCount.value + " " + oUnreadCount.value);
            this.m_iTimerTask = iTask;
            this.m_HttpComms.setURI(oHref.value);
            this.m_HttpComms.setContentType("text/xml");
            this.m_HttpComms.setRequestMethod("PROPFIND");
            this.m_HttpComms.addData(HotmailMailIMAPSchema);
            var bResult = this.m_HttpComms.send(this.refreshOnloadHandler, this);                             
            if (!bResult) throw new Error("httpConnection returned false");
             
            this.m_Log.Write("nsHotmailIMAP.js - refreshMSGlist - END");
        }
        catch(err)
        {
             this.m_Log.DebugDump("nsHotmailIMAP.js: refreshMSGlist : Exception : "
                                              + err.name 
                                              + ".\nError message: " 
                                              + err.message + "\n"
                                              + err.lineNumber);
            
            this.serverComms(this.m_iTag +" BAD error\r\n");
            return false;
        }
    },
    
    
    
    refreshOnloadHandler : function (szResponse ,event , mainObject)
    {
        try
        {
            mainObject.m_Log.Write("nsHotmailIMAP.js - refreshOnloadHandler - START");
            mainObject.m_Log.Write("nsHotmailIMAP.js - refreshOnloadHandler : \n"+ szResponse); 
            
            var httpChannel = event.QueryInterface(Components.interfaces.nsIHttpChannel);

            //if this fails we've gone somewhere new
            mainObject.m_Log.Write("nsHotmail - refreshOnloadHandler - status :" +httpChannel.responseStatus );
            if (httpChannel.responseStatus != 200 && httpChannel.responseStatus != 207) 
                throw new Error("return status " + httpChannel.responseStatus);
            
            //get uid list
            var aszResponses = szResponse.match(HotmailIMAPResponse);
            mainObject.m_Log.Write("nsHotmailIMAP.js - refreshOnloadHandler - \n" + aszResponses);
            delete mainObject.m_aRawData;
            if (aszResponses)
            {
                mainObject.m_aRawData = aszResponses; 
            }
            else
                mainObject.m_aRawData = new Array();     
            
            mainObject.m_iLastCheck = mainObject.getTime();                    
            mainObject.m_Log.Write("nsHotmailIMAP.js - refreshOnloadHandler - starting delay");
            //start timer
            mainObject.m_Timer.initWithCallback(mainObject, 
                                                mainObject.m_iTime, 
                                      Components.interfaces.nsITimer.TYPE_REPEATING_SLACK); 

            mainObject.m_Log.Write("nsHotmailIMAP.js - refreshOnloadHandler - END");
        }
        catch(err)
        {
             mainObject.m_Log.DebugDump("nsHotmailIMAP.js: refreshOnloadHandler : Exception : "
                                              + err.name 
                                              + ".\nError message: " 
                                              + err.message +"\n"
                                              + err.lineNumber);
            
             mainObject.serverComms(mainObject.m_iTag +" BAD error\r\n");
        }
    },
    
    
    
    
    processMSG : function (Item)
    {
        this.m_Log.Write("nsHotmailIMAP.js - processMSG - START");
        
        this.m_Log.Write("nsHotmailIMAP.js - processMSG - handling data");
        
        var bRead = parseInt(Item.match(HotmailIMAPRead)[1]) ? true : false;
        this.m_Log.Write("nsHotmailIMAP.js - processMSG - bRead -" + bRead);

        var szMSGUri = Item.match(HotmailIMAPHref)[1]; //uri
        this.m_Log.Write("nsHotmailIMAP.js - processMSG - szMSGUri -" + szMSGUri);
                                        
        var iSize = parseInt(Item.match(HotmailIMAPSize)[1]);//size 
        this.m_Log.Write("nsHotmailIMAP.js - processMSG - iSize -" + iSize);
                   
        var szTO = "";
        try
        {
            szTO = rawData.match(HotmailIMAPTo)[1].match(/[\S]*@[\S]*/);
            if (!szTO) throw new Error("no sender");
        }
        catch(err)
        {
            try
            {
                szTO = Item.match(HotmailIMAPTo)[1];
            }
            catch(e) 
            {
                szTO = this.m_szUserName;
            }   
        }
        this.m_Log.Write("nsHotmailIMAP.js - processMSG - szTO -" + szTO);
        
        
        
        var szFrom = "";
        try
        {
            szFrom = rawData.match(patternHotmailIMAPFrom)[1].match(/[\S]*@[\S]*/);
            if (!szFrom) throw new Error("no sender");
        }
        catch(err)
        {
            try
            {
                szFrom = Item.match(HotmailIMAPFrom)[1];
            }
            catch(e)
            {
                szFrom = this.m_szUserName;
            }    
        }
        this.m_Log.Write("nsHotmailIMAP.js - processMSG - szFrom -" + szFrom);
        
        var szSubject= "";
        try
        {
            szSubject= Item.match(HotmailIMAPSubject)[1];
        }
        catch(err){}
        this.m_Log.Write("nsHotmailIMAP.js - processMSG - szSubject -" + szSubject);
        
        var szDate = "";
        try
        {
            var aszDateTime = Item.match(HotmailIMAPDate);
            var aszDate = aszDateTime[1].split("-");
            var aszTime = aszDateTime[2].split(":");

            var date = new Date(parseInt(aszDate[0],10),  //year
                             parseInt(aszDate[1],10)-1,  //month
                             parseInt(aszDate[2],10),  //day
                             parseInt(aszTime[0],10),  //hour
                             parseInt(aszTime[1],10),  //minute
                             parseInt(aszTime[2],10));  //second
            szDate = date.toGMTString();
        }
        catch(err){}
        this.m_Log.Write("nsHotmailIMAP.js - processMSG - szDate -" + szDate);
        
        this.m_oFolder.addMSG(this.m_szUserName, this.m_szSelectFolder, szMSGUri, null , bRead, szTO, szFrom, szSubject, szDate, iSize);
      
        this.m_Log.Write("nsHotmailIMAP.js - processMSG - END");
    },
    




    fetch : function (szRange, szFlag)
    {
        try
        {
            this.m_Log.Write("nsHotmailIMAP.js - fetch - START");
            this.m_Log.Write("nsHotmailIMAP.js - fetch - Range " + szRange + " Flags "+ szFlag);
            
            if ((this.m_iLastCheck + this.m_iBiff)<this.getTime()) //recheck mail box if last check was more than 5m ago
            {
                this.m_Log.Write("nsHotmailIMAP.js - fetch - Check for new data");
                this.m_szRange = szRange;
                this.m_szFlag = szFlag;
                
                var oHref = {value:null};
                var oUID = {value:null};
                var oMSGCount = {value:null};
                var oUnreadCount = {value:null};
                if (!this.m_oFolder.getFolderDetails(this.m_szUserName, this.m_szSelectFolder , oHref , oUID, oMSGCount, oUnreadCount))
                    throw new Error("Folder not found");
               
                this.m_Log.Write("nsHotmailIMAP.js - noop - " + oHref.value + " " + oUID.value + " " + oMSGCount.value + " " + oUnreadCount.value);
                
                this.m_HttpComms.setURI(oHref.value);
                this.m_HttpComms.setContentType("text/xml");
                this.m_HttpComms.setRequestMethod("PROPFIND");
                this.m_HttpComms.addData(HotmailMailIMAPSchema);
                var bResult = this.m_HttpComms.send(this.fetchOnloadHandler, this);                             
                if (!bResult) throw new Error("httpConnection returned false"); 
            }
            else
            {
                this.m_Log.Write("nsHotmailIMAP.js - fetch - Use stored data");
                
                delete this.m_aRawData;
                this.m_aRawData = this.range(szRange);
                this.m_Log.Write("nsHotmailIMAP.js - fetch - Range " +this.m_aRawData);
                
                if (szFlag.search(/Header/i)!=-1)
                {
                    this.m_Log.Write("nsHotmailIMAP.js - fetch - headers "); 
                    this.m_iTimerTask =2;
                    //start timer
                    this.m_Timer.initWithCallback(this, 
                                                  this.m_iTime, 
                                          Components.interfaces.nsITimer.TYPE_REPEATING_SLACK); 
                }
                else if (szFlag.search(/Body/i)!=-1)
                {
                    this.m_Log.Write("nsHotmailIMAP.js - fetch - body ");
                    this.fetchBody(); 
                }
                else  //get message ids
                {
                    this.m_Log.Write("nsHotmailIMAP.js - fetch - ids ");   
                    this.m_iTimerTask =1;
                    //start timer
                    this.m_Timer.initWithCallback(this, 
                                                  this.m_iTime, 
                                          Components.interfaces.nsITimer.TYPE_REPEATING_SLACK); 
                }                 
            }
            
            this.m_Log.Write("nsHotmailIMAP.js - fetch - END");
            return true;
        }
        catch(err)
        {
             this.m_Log.DebugDump("nsHotmailIMAP.js: fetch : Exception : "
                                              + err.name 
                                              + ".\nError message: " 
                                              + err.message+ "\n"
                                              + err.lineNumber);
            
             this.serverComms(this.m_iTag +" BAD error\r\n");
             return false;
        }
    },
    
        
        
        
    fetchOnloadHandler : function (szResponse ,event , mainObject)
    {
        try
        {
            mainObject.m_Log.Write("nsHotmailIMAP.js - fetchOnloadHandler - START");
            mainObject.m_Log.Write("nsHotmailIMAP.js - fetchOnloadHandler : \n"+ szResponse); 
            
            var httpChannel = event.QueryInterface(Components.interfaces.nsIHttpChannel);

            //if this fails we've gone somewhere new
            mainObject.m_Log.Write("nsHotmail - fetchOnloadHandler - status :" +httpChannel.responseStatus );
            if (httpChannel.responseStatus != 200 && httpChannel.responseStatus != 207) 
                throw new Error("return status " + httpChannel.responseStatus);
            
            //get uid list
            var aszResponses = szResponse.match(HotmailIMAPResponse);
            mainObject.m_Log.Write("nsHotmailIMAP.js - fetchOnloadHandler - \n" + aszResponses);
            delete mainObject.m_aRawData;
            if (aszResponses)
            {
                mainObject.m_aRawData = aszResponses; 
            }
            else
                mainObject.m_aRawData = new Array();     
            
            mainObject.m_iLastCheck = mainObject.getTime();                    
            mainObject.m_iTimerTask =6;
            mainObject.m_Log.Write("nsHotmailIMAP.js - fetchOnloadHandler - starting delay");
            //start timer
            mainObject.m_Timer.initWithCallback(mainObject, 
                                                mainObject.m_iTime, 
                                      Components.interfaces.nsITimer.TYPE_REPEATING_SLACK); 

            mainObject.m_Log.Write("nsHotmailIMAP.js - fetchOnloadHandler - END");
        }
        catch(err)
        {
             mainObject.m_Log.DebugDump("nsHotmailIMAP.js: fetchOnloadHandler : Exception : "
                                              + err.name 
                                              + ".\nError message: " 
                                              + err.message +"\n"
                                              + err.lineNumber);
            
             mainObject.serverComms(mainObject.m_iTag +" BAD error\r\n");
        }
    },
        
        
    
    fetchIDs : function (iUID)
    {
        this.m_Log.Write("nsHotmailIMAP.js - fetchIDs - START " +iUID);
        if (iUID)
        {
            //get messages ID
            var oIndex = {value:null};
            var oHref = {value:null};
            var oRead = {value:null};
            var oDelete = {value:null};
            var oTo = {value:null};
            var oFrom = {value:null};
            var oSubject = {value:null};
            var oDate = {value:null};
            var oSize = {value:null};
            var bMSG = this.m_oFolder.getMSG(this.m_szUserName, this.m_szSelectFolder, iUID, 
                                            oIndex, oHref, oRead, oDelete, oTo, oFrom, oSubject, oDate, oSize);
            
            if (bMSG)
            {
                var szResponse = "* "+oIndex.value+ " FETCH (FLAGS (";
                szResponse +=  oRead.value?"\\Seen":"\\Recent" ; //flags
                szResponse +=  oDelete.value?" \\Deleted":"";
                szResponse += ") UID " + iUID + ")\r\n"; 
                this.serverComms(szResponse);
            }
        }
        else
        {
            this.m_Log.Write("nsHotmailIMAP.js - fetchIDs - all data handled");  
            this.serverComms(this.m_iTag +" UID FETCH complete\r\n");
        }
             
        this.m_Log.Write("nsHotmailIMAP.js - fetchIDs - END");
        return true; 
    },
    
    
    
    
    
    fetchHeaders : function (iUID)
    {
        this.m_Log.Write("nsHotmailIMAP.js - fetchHeaders - START " + iUID);
        
        if (iUID)
        { 
            var oIndex = {value:null};
            var oHref = {value:null};
            var oRead = {value:null};
            var oDelete = {value:null};
            var oTo = {value:null};
            var oFrom = {value:null};
            var oSubject = {value:null};
            var oDate = {value:null};
            var oSize = {value:null};
            var bMSG = this.m_oFolder.getMSG(this.m_szUserName, this.m_szSelectFolder, iUID, 
                                             oIndex, oHref, oRead, oDelete, oTo, oFrom, oSubject, oDate, oSize);
            
            if (bMSG)
            {
                var szTemp = "To: "+ oTo.value + "\r\n";
                szTemp += "From: "+  oFrom.value + "\r\n";
                szTemp += "Subject: "+ oSubject.value + "\r\n";
                szTemp += "Date: "+ oDate.value + "\r\n\r\n";
               
                var szResponse = "* " + oIndex.value;
                szResponse += " FETCH (UID "+ iUID //id
                szResponse += " RFC822.SIZE " +oSize.value; //size
                szResponse += " FLAGS ("   ; //flags
                szResponse += (oRead.value?"\\Seen":"\\Recent");
                szResponse += ") BODY[HEADER] ";
                szResponse += "{" + szTemp.length + "}\r\n";
                szResponse += szTemp + ")\r\n"; 
                this.serverComms(szResponse);
            }
        }
        else
        {
            this.m_Log.Write("nsHotmailIMAP.js - fetchIDs - all data handled");  
            this.serverComms(this.m_iTag +" OK UID FETCH complete\r\n");
        }
        
        this.m_Log.Write("nsHotmailIMAP.js - fetchHeaders - END");
        return true;
    },
    
    
    
    
    
    fetchBody : function ()
    {
        try
        {
            this.m_Log.Write("nsHotmailIMAP.js - fetchBody - START"); 
            
            if (this.m_aRawData.length>0)
            { 
                var iUID = this.m_aRawData.shift();
                var oIndex = {value:null};
                var oHref = {value:null};
                var oRead = {value:null};
                var oDelete = {value:null};
                var oTo = {value:null};
                var oFrom = {value:null};
                var oSubject = {value:null};
                var oDate = {value:null};
                var oSize = {value:null};
                this.m_Log.Write("nsHotmailIMAP.js - fetchBody - iUID "+ iUID);
                this.m_iUID = iUID;
                var bMSG = this.m_oFolder.getMSG(this.m_szUserName, this.m_szSelectFolder, iUID, 
                                                 oIndex, oHref, oRead, oDelete, oTo, oFrom, oSubject, oDate, oSize);
                this.m_Log.Write("nsHotmailIMAP.js - fetchBody - URI " +oHref.value );
                
                this.m_iStage = 0;
                this.m_HttpComms.setURI(oHref.value);
                this.m_HttpComms.setRequestMethod("GET");
                var bResult = this.m_HttpComms.send(this.fetchBodyOnloadHandler, this); 
                                            
                if (!bResult) throw new Error("httpConnection returned false");                              
            }
            else
                throw new Error("NO IDs");
            
            this.m_Log.Write("nsHotmailIMAP.js - fetchBody - END");
            return true; 
        }
        catch(err)
        {
            this.m_Log.DebugDump("nsHotmailIMAP.js: fetchBody : Exception : "
                                              + err.name 
                                              + ".\nError message: " 
                                              + err.message + "\n"
                                              + err.lineNumber);
            
            this.serverComms(this.m_iTag +" BAD error\r\n");
            return false;
        }
    },
    
    
    
    
    
    fetchBodyOnloadHandler : function (szResponse ,event , mainObject)
    {
        try
        {
            mainObject.m_Log.Write("nsHotmailIMAP.js - fetchBodyOnloadHandler - START");
            mainObject.m_Log.Write("nsHotmailIMAP.js - fetchBodyOnloadHandler : " + mainObject.m_iStage);  
            mainObject.m_Log.Write("nsHotmailIMAP.js - fetchBodyOnloadHandler : \n" + szResponse);
            
            var httpChannel = event.QueryInterface(Components.interfaces.nsIHttpChannel);
            
            //if this fails we've gone somewhere new
            mainObject.m_Log.Write("nsHotmail - fetchBodyOnloadHandler - status :" +httpChannel.responseStatus );
            if (httpChannel.responseStatus != 200 && httpChannel.responseStatus != 207) 
                throw new Error("return status " + httpChannel.responseStatus);
                
            var iUID = mainObject.m_iUID;
            var oIndex = {value:null};
            var oHref = {value:null};
            var oRead = {value:null};
            var oDelete = {value:null};
            var oTo = {value:null};
            var oFrom = {value:null};
            var oSubject = {value:null};
            var oDate = {value:null};
            var oSize = {value:null};
            var bMSG = mainObject.m_oFolder.getMSG(mainObject.m_szUserName, mainObject.m_szSelectFolder, iUID, 
                                                   oIndex, oHref, oRead, oDelete, oTo, oFrom, oSubject, oDate, oSize);
       
            var szMsg = "* " + oIndex.value +" FETCH (UID " + iUID ; //id
            szMsg += " RFC822.SIZE " + szResponse.length ; //size
            szMsg += " BODY[] ";
            szMsg += "{" + szResponse.length + "}\r\n";
            szMsg += szResponse + ")\r\n"; 
            szMsg += "* FETCH (FLAGS (\\Seen \\Recent))\r\n" ; //flags
            szMsg += mainObject.m_iTag +" OK UID FETCH complete\r\n"
            mainObject.serverComms(szMsg); 
            
            mainObject.m_oFolder.setMSGSeenFlag(mainObject.m_szUserName, mainObject.m_szSelectFolder, iUID, true);
            mainObject.m_Log.Write("nsHotmailIMAP.js - fetchBodyOnloadHandler - END");
            return true;
        }
        catch(err)
        {
            mainObject.m_Log.DebugDump("nsHotmailIMAP.js: fetchBodyOnloadHandler : Exception : "
                                              + err.name 
                                              + ".\nError message: " 
                                              + err.message + "\n"
                                              + err.lineNumber);
            
            mainObject.serverComms(mainObject.m_iTag +" BAD error\r\n");
            return false;
        }
    },
    
    
    
    

    
    
    
    
    store : function (szRange, szData, szDataItem)
    {
        try
        {
            this.m_Log.Write("nsHotmailIMAP.js - store - START");
            this.m_Log.Write("nsHotmailIMAP.js - store - range " + szRange + " szData "+ szData + " Item " +szDataItem );
           
            //construct MSG range
            delete this.m_aRawData;
            this.m_aRawData = this.range(szRange);
            this.m_Log.Write("nsHotmailIMAP.js - store - Range " +this.m_aRawData);
                                    
            //check we have got something
            if (this.m_aRawData.length== 0)
            {
                this.m_Log.Write("nsHotmailIMAP.js - store - no messages");
                this.serverComms(this.m_iTag +" NO STORE no messages\r\n");
                return false;
            }
            
            
            if (szDataItem.search(/\/unseen/i)!=-1 || szDataItem.search(/\/seen/i)!=-1) 
            {
                this.m_iStage=0;
                
                var iUID = this.m_aRawData.shift();
                
                //get messages ID
                var oIndex = {value:null};
                var oHref = {value:null};
                var oRead = {value:null};
                var oDelete = {value:null};
                var oTo = {value:null};
                var oFrom = {value:null};
                var oSubject = {value:null};
                var oDate = {value:null};
                var oSize = {value:null};
                                
                this.m_Log.Write("nsHotmailIMAP.js - store - seen/Unseen");
              
                this.m_iStore = iUID;
                var bMSG = this.m_oFolder.getMSG(this.m_szUserName, this.m_szSelectFolder, iUID, 
                                                 oIndex, oHref, oRead, oDelete, oTo, oFrom, oSubject, oDate, oSize);
                                  
                //propattach
                this.m_HttpComms.setURI(oHref.value);
                this.m_HttpComms.setContentType("text/xml");
                this.m_HttpComms.setRequestMethod("PROPPATCH");
                
                if (szDataItem.search(/\/unseen/i)!=-1)
                {
                    this.m_Log.Write("nsHotmailIMAP.js - store - Unseen");
                    this.m_bStoreStatus = false;
                    this.m_HttpComms.addData(HotmailPROPUnReadSchema);
                }
                
                if (szDataItem.search(/\/seen/i)!=-1)
                {
                    this.m_Log.Write("nsHotmailIMAP.js - store - seen");
                    this.m_bStoreStatus = true;
                    this.m_HttpComms.addData(HotmailPROPReadSchema);
                }
                
                if (szDataItem.search(/\/delete/i)!=-1)
                {
                    this.m_Log.Write("nsHotmailIMAP.js - store - deleted"); 
                    this.m_bStoreDelete = true;
                }            
                
                var bResult = this.m_HttpComms.send(this.storeOnloadHandler, this);                             
                if (!bResult) throw new Error("httpConnection returned false");
            
                this.m_Log.Write("nsHotmailIMAP.js - store - seen");
            } 
            else if(szDataItem.search(/delete/i)!=-1) 
            {
                this.m_Log.Write("nsHotmailIMAP.js - store - delete");

                this.m_iTimerTask = 3;
                //start timer
                this.m_Timer.initWithCallback(this, 
                                              this.m_iTime, 
                                      Components.interfaces.nsITimer.TYPE_REPEATING_SLACK);
            }
            else
            {
                this.serverComms(this.m_iTag +" NO STORE cant do that\r\n");
            }
                        
            this.m_Log.Write("nsHotmailIMAP.js - store - END");
            return true;
        }
        catch(err)
        {
             this.m_Log.DebugDump("nsHotmailIMAP.js: store : Exception : "
                                              + err.name 
                                              + ".\nError message: " 
                                              + err.message + "\n"
                                              + err.lineNumber);
            
            this.serverComms(this.m_iTag +" BAD error\r\n");
            return false;
        }  
    },
    
    
    
    
    storeDelete : function (iUID)
    {
        this.m_Log.Write("nsHotmailIMAP.js - storeDelete - START " + iUID);
        
        if (iUID)
        {
            //get messages ID
            var oIndex = {value:null};
            var oHref = {value:null};
            var oRead = {value:null};
            var oDelete = {value:null};
            var oTo = {value:null};
            var oFrom = {value:null};
            var oSubject = {value:null};
            var oDate = {value:null};
            var oSize = {value:null};
            var bMSG = this.m_oFolder.getMSG(this.m_szUserName, this.m_szSelectFolder, iUID, 
                                            oIndex, oHref, oRead, oDelete, oTo, oFrom, oSubject, oDate, oSize);
            
            if (bMSG)
            {
                var szResponse = "* " + oIndex.value +" FETCH (UID " + iUID ; //id
                szResponse += " FLAGS (";
                szResponse+=  oRead.value?"\\Seen ":"";
                szResponse+="\\Deleted))\r\n";
                this.serverComms(szResponse);
                this.m_oFolder.setMSGDeleteFlag(this.m_szUserName, this.m_szSelectFolder, iUID, true);
            }
        }
        else
        {
            this.m_Log.Write("nsHotmailIMAP.js - storeDelete - all data handled"); 
            this.serverComms(this.m_iTag +" OK FETCH complete\r\n");
        }         
             
        this.m_Log.Write("nsHotmailIMAP.js - storeDelete - END");
        return true; 
    },
    
    
    
    
    
    storeOnloadHandler : function (szResponse ,event , mainObject)
    {
        try
        {
            mainObject.m_Log.Write("nsHotmailIMAP.js - storeOnloadHandler - START");
            mainObject.m_Log.Write("nsHotmailIMAP.js - storeOnloadHandler : " + mainObject.m_iStage);
            mainObject.m_Log.Write("nsHotmailIMAP.js - storeOnloadHandler : \n" + szResponse);  
            
            //if this fails we've gone somewhere new
            var httpChannel = event.QueryInterface(Components.interfaces.nsIHttpChannel);
            mainObject.m_Log.Write("nsHotmail - storeOnloadHandler - status :" +httpChannel.responseStatus );
            if (httpChannel.responseStatus != 200 && httpChannel.responseStatus != 201 ) 
                throw new Error("return status " + httpChannel.responseStatus);
            
            //get messages ID
            var oIndex = {value:null};
            var oHref = {value:null};
            var oRead = {value:null};
            var oDelete = {value:null};
            var oTo = {value:null};
            var oFrom = {value:null};
            var oSubject = {value:null};
            var oDate = {value:null};
            var oSize = {value:null};
            var bMSG = mainObject.m_oFolder.getMSG(mainObject.m_szUserName, mainObject.m_szSelectFolder, mainObject.m_iStore, 
                                            oIndex, oHref, oRead, oDelete, oTo, oFrom, oSubject, oDate, oSize);
            
            var szResponse = "* " + oIndex.value +" FETCH (UID " + mainObject.m_iStore ; //id
            szResponse+= " FLAGS (";
            szResponse+= oRead.value?"\\Seen ":"";
            szResponse+= oDelete.value? "\\Deleted ":"";
            szResponse+= "))\r\n";
            
            var szResponse= "* "+ mainObject.m_iStore + " FETCH FLAGS (";
            szResponse+= oRead.value? "\\Seen ":"";
            szResponse+= oDelete.value? "\\Deleted ":"";
            szResponse+= ")\r\n";
            mainObject.serverComms(szResponse);
            
            if (mainObject.m_bStoreDelete) 
            {
                mainObject.m_Log.Write("nsHotmailIMAP.js - storeOnloadHandler - marks as deleted");
                mainObject.storeDelete( mainObject.m_iStore);
            }
            
            if (mainObject.m_aRawData.length>0)
            {
                mainObject.m_Log.Write("nsHotmailIMAP.js - storeOnloadHandler - next - ");
                
                var iUID = mainObject.m_aRawData.shift();
                var bMSG = mainObject.m_oFolder.getMSG(mainObject.m_szUserName, mainObject.m_szSelectFolder, iUID, 
                                                oIndex, oHref, oRead, oDelete, oTo, oFrom, oSubject, oDate, oSize); 
                mainObject.m_iStore = iUID;
                
                mainObject.m_HttpComms.setContentType("text/xml");
                mainObject.m_HttpComms.setURI(oHref.value);
                mainObject.m_HttpComms.setRequestMethod("PROPPATCH");
                
                if (mainObject.m_bStoreStatus)
                    mainObject.m_HttpComms.addData(HotmailPROPUnReadSchema)
                else
                    mainObject.m_HttpComms.addData(HotmailPROPUnReadSchema);
                    
                var bResult = mainObject.m_HttpComms.send(mainObject.storeOnloadHandler, mainObject);                             
                if (!bResult) throw new Error("httpConnection returned false");
            }
            else
            {     
                mainObject.m_Log.Write("nsHotmailIMAP.js - storeOnloadHandler - done - ");
                var szResponse = mainObject.m_iTag +" OK FETCH complete\r\n"
                mainObject.serverComms(szResponse);
            }
                   
            mainObject.m_Log.Write("nsHotmailIMAP.js - storeOnloadHandler - END");
            return true;
        }
        catch(err)
        {
            mainObject.m_Log.DebugDump("nsHotmailIMAP.js: storeOnloadHandler : Exception : "
                                              + err.name 
                                              + ".\nError message: " 
                                              + err.message + "\n"
                                              + err.lineNumber);
            
            mainObject.serverComms(mainObject.m_iTag +" BAD error\r\n");
            return false;
        }
    },

     
     
     
    notify : function(timer)
    {
        try
        {
            this.m_Log.Write("nsHotmailIMAP.js - notify - START");
            
            switch(this.m_iTimerTask)
            {
                case 0: //process MSG
                    this.m_Log.Write("nsHotmailIMAP.js - notify - processing MSG");    
                    if (this.m_aRawData.length>0)
                    {  
                        var Item = this.m_aRawData.shift();
                        this.processMSG(Item);
                    }
                    else
                    {
                        this.m_Log.Write("nsHotmailIMAP.js - processMSG - all data handled"); 
                        
                        //get folder details
                        var oHref = {value:null};
                        var oUID = {value:null};
                        var oMSGCount = {value:null};
                        var oUnreadCount = {value:null};
                        
                        if (!this.m_oFolder.getFolderDetails(this.m_szUserName, this.m_szSelectFolder , oHref , oUID, oMSGCount, oUnreadCount))
                            throw new Error("folder not found");
                            
                        //send select ok message back to TB
                        var szSelectResponse= "* " +  oMSGCount.value + " EXISTS\r\n";
                        szSelectResponse+= "* " + oUnreadCount.value + " RECENT\r\n";
                        szSelectResponse+= "* OK [UIDVALIDITY " + oUID.value + "] UIDs\r\n";
                        szSelectResponse+= "* FLAGS (\\Seen \\Deleted)\r\n";
                        szSelectResponse+= "* OK [PERMANENTFLAGS (\\Seen)] Limited\r\n";
                        szSelectResponse+= this.m_iTag +" OK [READ-WRITE] SELECT COMPLETE\r\n"; 
                        
                        this.serverComms(szSelectResponse);
                        delete this.m_aRawData;
                        this.m_aRawData = new Array();
                        this.m_Timer.cancel();
                    }
                break;
                
                case 1: //Fetch ID's
                    this.m_Log.Write("nsHotmailIMAP.js - notify - Fetch IDS");
                    var Item = null;
                    if (this.m_aRawData.length>0)  
                        Item = this.m_aRawData.shift();
                    else
                    {
                        delete this.m_aRawData;
                        this.m_aRawData = new Array();
                        this.m_Timer.cancel();
                    }         
                    this.fetchIDs(Item);
                break;
                
                case 2: //Fetch Header
                    this.m_Log.Write("nsHotmailIMAP.js - notify - Fetch HEADERs");
                    var Item = null;
                    if (this.m_aRawData.length>0)  
                        Item = this.m_aRawData.shift();
                    else
                    {
                        delete this.m_aRawData;
                        this.m_aRawData = new Array();
                        this.m_Timer.cancel();
                    }     
                    this.fetchHeaders(Item);
                break;
                
                case 3: //Store Delete
                    this.m_Log.Write("nsHotmailIMAP.js - notify - Store Delete");
                    var Item = null;
                    if (this.m_aRawData.length>0)  
                        Item = this.m_aRawData.shift();
                    else
                    {
                        delete this.m_aRawData;
                        this.m_aRawData = new Array();
                        this.m_Timer.cancel();
                    }     
                    this.storeDelete(Item);
                break;
                
                case 4: //noop
                    this.m_Log.Write("nsHotmailIMAP.js - notify - noop");    
                    var Item = null;
                    if (this.m_aRawData.length>0)  
                        Item = this.m_aRawData.shift();
                    else
                    {
                        delete this.m_aRawData;
                        this.m_aRawData = new Array();
                        this.m_Timer.cancel();
                    }     
                    
                    if (Item)
                        this.processMSG(Item);
                    else
                    {
                        this.m_Log.Write("nsHotmailIMAP.js - notify - all data handled"); 
                        
                        //get folder details
                        var oHref = {value:null};
                        var oUID = {value:null};
                        var oMSGCount = {value:null};
                        var oUnreadCount = {value:null};
                        
                        if (!this.m_oFolder.getFolderDetails(this.m_szUserName, this.m_szSelectFolder , oHref , oUID, oMSGCount, oUnreadCount))
                            throw new Error("folder not found");
                            
                        //send select ok message back to TB
                        var szSelectResponse= "* " +  oMSGCount.value + " EXISTS\r\n";
                        szSelectResponse+= "* " + oUnreadCount.value + " RECENT\r\n";
                        szSelectResponse+= this.m_iTag +" OK NOOP COMPLETE\r\n"; 
                        
                        this.serverComms(szSelectResponse);
                    }
                break;
                
                case 5: //expunge
                    this.m_Log.Write("nsHotmailIMAP.js - notify - expunge");
                    var oIndex ={value:null};
                    if (this.m_oFolder.deleteMSG(this.m_szUserName, this.m_szSelectFolder ,oIndex))
                    {
                        this.serverComms("* " + oIndex.value +" EXPUNGE\r\n");
                    }
                    else
                    {
                        this.serverComms(this.m_iTag +" OK EXPUNGE COMPLETE\r\n");
                        this.m_Timer.cancel();
                    }    
                break;
                
                case 6: //fetch
                    this.m_Log.Write("nsHotmailIMAP.js - notify - fetch");
                    if (this.m_aRawData.length>0)
                    {  
                        var Item = this.m_aRawData.shift();
                        this.processMSG(Item);
                    }
                    else
                    {
                        this.m_Log.Write("nsHotmailIMAP.js - notify - fetch - all data handled"); 
                        this.m_Timer.cancel();
                        delete this.m_aRawData;
                        this.m_aRawData = this.range(this.m_szRange);
                        this.m_Log.Write("nsHotmailIMAP.js - notify - Range " +this.m_aRawData);
                        
                        if (this.m_szFlag.search(/Header/i)!=-1)
                        {
                            this.m_Log.Write("nsHotmailIMAP.js - notify - fetch - headers "); 
                            this.m_iTimerTask =2;
                            //start timer
                            this.m_Timer.initWithCallback(this, 
                                                          this.m_iTime, 
                                                  Components.interfaces.nsITimer.TYPE_REPEATING_SLACK); 
                        }
                        else if (this.m_szFlag.search(/Body/i)!=-1)
                        {
                            this.m_Log.Write("nsHotmailIMAP.js - notify - fetch - body ");
                            this.fetchBody(); 
                        }
                        else  //get message ids
                        {
                            this.m_Log.Write("nsHotmailIMAP.js - notify - fetch - ids ");   
                            this.m_iTimerTask =1;
                            //start timer
                            this.m_Timer.initWithCallback(this, 
                                                          this.m_iTime, 
                                                  Components.interfaces.nsITimer.TYPE_REPEATING_SLACK);
                        }
                    }
                break;

                default:
                    this.m_Log.Write("nsHotmailIMAP.js - notify - UNKNOWN COMMAND");
                    this.m_Timer.cancel();
                break;
            }
            
            this.m_Log.Write("nsHotmailIMAP.js - notify - END"); 
        }
        catch(err)
        {
            this.m_Timer.cancel();
            this.m_Log.DebugDump("nsHotmailIMAP.js: notify : Exception : " 
                                              + err.name 
                                              + ".\nError message: " 
                                              + err.message+ "\n"
                                              + err.lineNumber);
                                              
            this.serverComms(this.m_iTag +" BAD error\r\n");
        }
    }, 
     
    
    
     
     
    copy : function (szRange, szDestination)
    {
        try
        {
            this.m_Log.Write("nsHotmailIMAP.js - copy - START");
            this.m_Log.Write("nsHotmailIMAP.js - copy - range " + szRange + " destination " + szDestination);
                       
            //check destination
            var oHref = {value:null};
            var oUID = {value:null};
            var oMSGCount = {value:null};
            var oUnreadCount = {value:null}
            var bDestFolder = this.m_oFolder.getFolderDetails(this.m_szUserName, szDestination, oHref, oUID, oMSGCount, oUnreadCount);
            
            if (!bDestFolder) //destination not found
            {
                this.m_Log.Write("nsHotmailIMAP.js - copy - destination folder doesn't exist");
                this.serverComms(this.m_iTag +" NO [TRYCREATE] error\r\n");
                return false;
            }
            this.m_copyDest = oHref.value;
            
            this.m_Log.Write("nsHotmailIMAP.js - copy - destination  folder" + this.m_copyDest);
            
            //construct MSG range
            delete this.m_aRawData;
            this.m_aRawData = this.range(szRange);
            this.m_Log.Write("nsHotmailIMAP.js - copy - Range " +this.m_aRawData);
        
            if (this.m_aRawData.length== 0)
            {
                this.m_Log.Write("nsHotmailIMAP.js - copy - no messages to move");
                this.serverComms(this.m_iTag +" NO copy no messages\r\n");
                return false;
            }
            
            //get first item 
            var Item = this.m_aRawData.shift();
            
            //get messages ID
            var oIndex = {value:null};
            var oHref = {value:null};
            var oRead = {value:null};
            var oDelete = {value:null};
            var oTo = {value:null};
            var oFrom = {value:null};
            var oSubject = {value:null};
            var oDate = {value:null};
            var oSize = {value:null};
            var bMSG = this.m_oFolder.getMSG(this.m_szUserName, this.m_szSelectFolder, Item, 
                                            oIndex, oHref, oRead, oDelete, oTo, oFrom, oSubject, oDate, oSize);
            
            if (!bMSG)
            {
                this.m_Log.Write("nsHotmailIMAP.js - copy - message not found");
                this.serverComms(this.m_iTag +" NO copy no messages\r\n");
                return false;
            }
             
            
            var szMSGID = oHref.value.match(/[^\/]+$/);
            this.m_Log.Write("nsHotmailIMAP.js - copy - destination URI" + this.m_copyDest + szMSGID);
        
            this.m_HttpComms.setURI(oHref.value);
            this.m_HttpComms.setRequestMethod("MOVE");
            this.m_HttpComms.addRequestHeader("Destination", this.m_copyDest + szMSGID , false);
            var bResult = this.m_HttpComms.send(this.copyOnloadHandler, this);                             
            if (!bResult) throw new Error("httpConnection returned false");  
                     
            this.m_Log.Write("nsHotmailIMAP.js - copy - END");
            return true;
        }
        catch(err)
        {
            this.m_Log.DebugDump("nsHotmailIMAP.js: copy : Exception : "
                                              + err.name 
                                              + ".\nError message: " 
                                              + err.message + "\n" 
                                              + err.lineNumber);
            
            this.serverComms(this.m_iTag +" BAD error\r\n");
            return false;
        }
    },
    
    
    
    
    copyOnloadHandler : function (szResponse ,event , mainObject)
    {
        try
        {
            mainObject.m_Log.Write("nsHotmailIMAP.js - copyOnloadHandler - START");
            mainObject.m_Log.Write("nsHotmailIMAP.js - copyOnloadHandler : \n" + szResponse);
            mainObject.m_Log.Write("nsHotmailIMAP.js - copyOnloadHandler : " + mainObject.m_iStage);  
            
            var httpChannel = event.QueryInterface(Components.interfaces.nsIHttpChannel);
            
            //if this fails we've gone somewhere new
            mainObject.m_Log.Write("nsHotmail - copyOnloadHandler - status :" +httpChannel.responseStatus );
            if (httpChannel.responseStatus != 200 && httpChannel.responseStatus != 201) 
                throw new Error("return status " + httpChannel.responseStatus);
             
            if (mainObject.m_aRawData.length>0)
            {
                mainObject.m_Log.Write("nsHotmailIMAP.js - copyOnloadHandler - next - ");
                
                var Item = mainObject.m_aRawData.shift();
            
                //get messages ID
                var oIndex = {value:null};
                var oHref = {value:null};
                var oRead = {value:null};
                var oDelete = {value:null};
                var oTo = {value:null};
                var oFrom = {value:null};
                var oSubject = {value:null};
                var oDate = {value:null};
                var oSize = {value:null};
                var bMSG = mainObject.m_oFolder.getMSG(mainObject.m_szUserName, mainObject.m_szSelectFolder, Item, 
                                                       oIndex, oHref, oRead, oDelete, oTo, oFrom, oSubject, oDate, oSize);

                var szMSGID = oHref.value.match(/[^\/]+$/);
                mainObject.m_Log.Write("nsHotmailIMAP.js - copy - destination URI" + mainObject.m_copyDest + szMSGID);

                mainObject.m_HttpComms.setURI(oHref.value);
                mainObject.m_HttpComms.setRequestMethod("MOVE");
                mainObject.m_HttpComms.addRequestHeader("Destination", mainObject.m_copyDest + szMSGID, false);
                var bResult = mainObject.m_HttpComms.send(mainObject.copyOnloadHandler, mainObject);                             
                if (!bResult) throw new Error("httpConnection returned false");  
               
                mainObject.m_iStage ++;
            }
            else
            {     
                mainObject.m_Log.Write("nsHotmailIMAP.js - copyOnloadHandler - done - ");       
                //reset copy data 
                mainObject.m_copyDest = null;
                mainObject.serverComms(mainObject.m_iTag +" OK COPY complete\r\n");
            }
            
          
            mainObject.m_Log.Write("nsHotmailIMAP.js - copyOnloadHandler - END");
            return true;
        }
        catch(err)
        {
            mainObject.m_Log.DebugDump("nsHotmailIMAP.js: copyloadHandler : Exception : "
                                              + err.name 
                                              + ".\nError message: " 
                                              + err.message+ "\n" 
                                              + err.lineNumber);
            
            mainObject.serverComms(mainObject.m_iTag +" BAD error\r\n");
            return false;
        }
    },
     
     
     
     
     
        
    
    createFolder : function (szFolder)
    {
        try
        {
            this.m_Log.Write("nsHotmailIMAP.js - createFolder - START");
            this.m_Log.Write("nsHotmailIMAP.js - createFolder - folder " + szFolder);
            
            //check level
            var aszLevel = szFolder.split(".");
            if (aszLevel.length!=2)
            {
                this.serverComms(this.m_iTag +" NO too low level\r\n");
                this.m_Log.Write("nsHotmailIMAP.js - createFolder - folder too low");
            }
            else
            {
                //check if folder exists
                var oHref = {value:null};
                var oUID = {value:null};
                var oMSGCount = {value:null};
                var oUnreadCount = {value:null};
                if (!this.m_oFolder.getFolderDetails(this.m_szUserName, szFolder , oHref , oUID, oMSGCount, oUnreadCount))
                {
                    //create new folder
                    var szFolderHref = this.m_szFolderURI+aszLevel[1]+"/";
                    this.m_szFolderName = szFolder;
                    this.m_iStage = 0;
                    this.m_HttpComms.setContentType("text/xml");
                    this.m_HttpComms.setURI(szFolderHref);
                    this.m_HttpComms.setRequestMethod("MKCOL");
                    var bResult = this.m_HttpComms.send(this.createFolderOnloadHandler, this);                             
                    if (!bResult) throw new Error("httpConnection returned false");
                }
                else
                {
                     this.serverComms(this.m_iTag +" NO folder exists\r\n");
                     this.m_Log.Write("nsHotmailIMAP.js - createFolder - exists");
                }
            }
            
            this.m_Log.Write("nsHotmailIMAP.js - createFolder - END");   
        }
        catch(err)
        {
            this.m_Log.DebugDump("nsHotmailIMAP.js: createFolder : Exception : "
                                              + err.name 
                                              + ".\nError message: " 
                                              + err.message+ "\n"
                                              + err.lineNumber);
            
            this.serverComms(this.m_iTag +" BAD error\r\n");
            return false;
        }
    },
    
   
   
   
    createFolderOnloadHandler : function (szResponse ,event , mainObject)
    {
        try
        {
            mainObject.m_Log.Write("nsHotmailIMAP.js - createFolderOnloadHandler - START");
            mainObject.m_Log.Write("nsHotmailIMAP.js - createFolderOnloadHandler - " + szResponse);
            
            var httpChannel = event.QueryInterface(Components.interfaces.nsIHttpChannel);
            
            //if this fails we've gone somewhere new
            mainObject.m_Log.Write("nsHotmail - createFolderOnloadHandler - status :" +httpChannel.responseStatus );
            if (httpChannel.responseStatus != 200 && httpChannel.responseStatus != 201) 
                throw new Error("return status " + httpChannel.responseStatus);
            
            switch(mainObject.m_iStage)
            {
                case 0: //create done now get folder list
                    mainObject.m_Log.Write("nsHotmailIMAP.js - createFolderOnloadHandler - get folder list - START");
                    mainObject.m_HttpComms.setContentType("text/xml");
                    mainObject.m_HttpComms.setRequestMethod("PROPFIND");
                    mainObject.m_HttpComms.addData(HotmailFolderIMAPSchema);
                    mainObject.m_HttpComms.setURI(mainObject.m_szFolderURI);
                    var bResult = mainObject.m_HttpComms.send(mainObject.listOnloadHandler, mainObject);                             
                    if (!bResult) throw new Error("httpConnection returned false");
                    mainObject.m_Log.Write("nsHotmailIMAP.js - createFolderOnloadHandler - get folder list - END");               
                break;
                
                
                case 1:  //add new folder details
                    mainObject.m_Log.Write("nsHotmailIMAP.js - createFolderOnloadHandler - new folder details - START");
                
                    var aszResponses = szResponse.match(HotmailIMAPResponse);
                    mainObject.m_Log.Write("nsHotmailIMAP.js - createFolderOnloadHandler - folders - \n" + aszResponses);
                    for (i=0; i<aszResponses.length; i++)
                    {
                        mainObject.processFolder(aszResponses[i]);    
                    }
                    
                    var szMsg = mainObject.m_iTag +" OK CREATE complete\r\n"
                    mainObject.serverComms(szMsg);  
                    mainObject.m_szFolderName = null;
                    mainObject.m_Log.Write("nsHotmailIMAP.js - createFolderOnloadHandler - new folder details - END");
                break;
            }
            
            
           
            mainObject.m_Log.Write("nsHotmailIMAP.js - createFolderOnloadHandler - END");
            return true;
        }
        catch(err)
        {
            mainObject.m_Log.DebugDump("nsHotmailIMAP.js: createFolderOnloadHandler : Exception : "
                                              + err.name 
                                              + ".\nError message: " 
                                              + err.message+ "\n"
                                              + err.lineNumber);
            
            mainObject.serverComms(mainObject.m_iTag +" BAD error\r\n");
            return false;
        }
    },
   
   
   
    deleteFolder : function (szFolder)
    {
        try
        {
            this.m_Log.Write("nsHotmailIMAP.js - deleteFolder - START");
            this.m_Log.Write("nsHotmailIMAP.js - deleteFolder - folder " + szFolder);
            
            var oHref = {value:null};
            var oUID = {value:null};
            var oMSGCount = {value:null};
            var oUnreadCount = {value:null};
            if (this.m_oFolder.getFolderDetails(this.m_szUserName, szFolder , oHref , oUID, oMSGCount, oUnreadCount))
            {
                this.m_Log.Write("nsHotmailIMAP.js - deleteFolder - oHref.value " + oHref.value);
                this.m_szFolderName = szFolder;  
                this.m_HttpComms.setURI(oHref.value);
                this.m_HttpComms.setRequestMethod("DELETE");
                var bResult = this.m_HttpComms.send(this.deleteFolderOnloadHandler, this);                             
                if (!bResult) throw new Error("httpConnection returned false");
            }
            else
                this.serverComms(this.m_iTag +" NO deleteFolder not supported\r\n");

            this.m_Log.Write("nsHotmailIMAP.js - deleteFolder - END");   
        }
        catch(err)
        {
            this.m_Log.DebugDump("nsHotmailIMAP.js: deleteFolder : Exception : "
                                              + err.name 
                                              + ".\nError message: " 
                                              + err.message+ "\n"
                                              + err.lineNumber);
            
            this.serverComms(this.m_iTag +" BAD error\r\n");
            return false;
        }
    },
    
    
    
    
    deleteFolderOnloadHandler : function (szResponse ,event , mainObject)
    {
        try
        {
            mainObject.m_Log.Write("nsHotmailIMAP.js - deleteFolderOnloadHandler - START");
            
            var httpChannel = event.QueryInterface(Components.interfaces.nsIHttpChannel);
            
            //if this fails we've gone somewhere new
            mainObject.m_Log.Write("nsHotmail - deleteFolderOnloadHandler - status :" +httpChannel.responseStatus );
            if (httpChannel.responseStatus != 200 && httpChannel.responseStatus != 207) 
                throw new Error("return status " + httpChannel.responseStatus);
                              
            var bResult = mainObject.m_oFolder.deleteFolder(mainObject.m_szUserName, mainObject.m_szFolderName);
            var szMsg = mainObject.m_iTag;
            if (bResult)
                szMsg += " OK delete complete\r\n";
            else
                szMsg += " NO delete failed\r\n";
           
            mainObject.serverComms(szMsg); 
            mainObject.m_szFolderReference = null; 
            mainObject.m_szFolderName = null;
            mainObject.m_Log.Write("nsHotmailIMAP.js - deleteFolderOnloadHandler - END");
            return true;
        }
        catch(err)
        {
            mainObject.m_Log.DebugDump("nsHotmailIMAP.js: deleteFolderOnloadHandler : Exception : "
                                              + err.name 
                                              + ".\nError message: " 
                                              + err.message+ "\n"
                                              + err.lineNumber);
            
            mainObject.serverComms(mainObject.m_iTag +" BAD error\r\n");
            return false;
        }
    },
    
    
    
    
    renameFolder : function (szOldFolder, szNewFolder)
    {
        try
        {
            this.m_Log.Write("nsHotmailIMAP.js - renameFolder - START");
            this.m_Log.Write("nsHotmailIMAP.js - renameFolder - oldfolder " + szOldFolder + " newFolder "+ szNewFolder);
           
            //check for new name
            var oHref = {value:null};
            var oUID = {value:null};
            var oMSGCount = {value:null};
            var oUnreadCount = {value:null};
            if (!this.m_oFolder.getFolderDetails(this.m_szUserName, szNewFolder , oHref , oUID, oMSGCount, oUnreadCount))
            {
                this.m_szFolderName = szOldFolder;
                var szOldFolderName = this.m_szFolderName.split(".")[1];
                this.m_Log.Write("nsHotmailIMAP.js - renameFolder - szOldFolder " + szOldFolderName);
             
                this.m_szFolderNewName = szNewFolder;  
                var szNewFolderName = this.m_szFolderNewName.split(".")[1];
                this.m_Log.Write("nsHotmailIMAP.js - renameFolder - szNewFolder " + szNewFolderName);
                
                //get details of old folder 
                this.m_oFolder.getFolderDetails(this.m_szUserName, this.m_szFolderName , oHref , oUID, oMSGCount, oUnreadCount);
                this.m_Log.Write("nsHotmailIMAP.js - renameFolder - oHref.value " + oHref.value);
                var szNewFolderURI = oHref.value.replace(szOldFolderName, szNewFolderName);
                this.m_Log.Write("nsHotmailIMAP.js - renameFolder - szNewFolderURI " + szNewFolderURI);
                this.m_szFolderReference = szNewFolderURI;
               
                this.m_HttpComms.setURI(oHref.value);
                this.m_HttpComms.setRequestMethod("MOVE");           
                this.m_HttpComms.addRequestHeader("Destination", szNewFolderURI , false);
                var bResult = this.m_HttpComms.send(this.renameFolderOnloadHandler, this);                             
                if (!bResult) throw new Error("httpConnection returned false");
            }
            else
                this.serverComms(this.m_iTag +" NO renameFolder found\r\n");
                
            this.m_Log.Write("nsHotmailIMAP.js - renameFolder - END");   
        }
        catch(err)
        {
            this.m_Log.DebugDump("nsHotmailIMAP.js: renameFolder : Exception : "
                                              + err.name 
                                              + ".\nError message: " 
                                              + err.message+ "\n"
                                              + err.lineNumber);
            
            this.serverComms(this.m_iTag +" BAD error\r\n");
            return false;
        }
    },
    
    
    
     
    renameFolderOnloadHandler : function (szResponse ,event , mainObject)
    {
        try
        {
            mainObject.m_Log.Write("nsHotmailIMAP.js - renameFolderOnloadHandler - START");
            mainObject.m_Log.Write("nsHotmailIMAP.js - renameFolderOnloadHandler - \n" + szResponse);
                       
            //if this fails we've gone somewhere new
            var httpChannel = event.QueryInterface(Components.interfaces.nsIHttpChannel);
            mainObject.m_Log.Write("nsHotmail - renameOnloadHandler - status :" +httpChannel.responseStatus );
            if (httpChannel.responseStatus != 200 && httpChannel.responseStatus != 201) 
                throw new Error("return status " + httpChannel.responseStatus);
                       
            var bResult = mainObject.m_oFolder.renameFolder(mainObject.m_szUserName,
                                                            mainObject.m_szFolderName,
                                                            mainObject.m_szFolderNewName,
                                                            mainObject.m_szFolderReference);
            var szMsg;
            if (bResult)
                szMsg = mainObject.m_iTag +" OK rename complete\r\n";
            else
                szMsg = mainObject.m_iTag +" NO rename failed\r\n";
           
            mainObject.m_szFolderReference = null;
            
            mainObject.serverComms(szMsg); 
            mainObject.m_Log.Write("nsHotmailIMAP.js - renameFolderOnloadHandler - END");
            return true;
        }
        catch(err)
        {
            mainObject.m_Log.DebugDump("nsHotmailIMAP.js: renameFolderOnloadHandler : Exception : "
                                              + err.name 
                                              + ".\nError message: " 
                                              + err.message+ "\n"
                                              + err.lineNumber);
            
            mainObject.serverComms(mainObject.m_iTag +" BAD error\r\n");
            return false;
        }
    },
    
    
   
    
    //spilt range = 1,3,4:8,10:*
    range : function (szRange)
    {
        try
        {
            this.m_Log.Write("nsHotmailIMAP.js - range - START");
            this.m_Log.Write("nsHotmailIMAP.js - range - szRange " + szRange);
            
            var aTempRange = szRange.split(",");
            this.m_Log.Write("nsHotmailIMAP.js - range - aTempRange " +aTempRange);
            
            var aRange = new Array();
            for (var i=0; i<aTempRange.length; i++)
            {
                if (aTempRange[i].search(/\:/)!=-1)
                {
                    this.m_Log.Write("nsHotmailIMAP.js - range - found range");
                    
                    var aWildCardTemp = aTempRange[i].split(/\:/);  
                    this.m_Log.Write("nsHotmailIMAP.js - range - aWildCardTemp "+aWildCardTemp);
                    var min = parseInt(aWildCardTemp[0]);
                    var max = -1;
                    if (aWildCardTemp[1].search(/\d/)!=-1) max = parseInt(aWildCardTemp[1]);
                    this.m_Log.Write("nsHotmailIMAP.js - range - min " + min + " max " +max );
                       
                    var aiUIDS = {value : null};
                    var iUIDS = {value : null }; 
                    this.m_oFolder.getMSGUIDS(this.m_szUserName, this.m_szSelectFolder , iUIDS , aiUIDS);
                    this.m_Log.Write("nsHotmailIMAP.js - range - aiUIDS "+aiUIDS.value);
                    
                    for (var j=0; j<aiUIDS.value.length; j++)
                    {
                        this.m_Log.Write("nsHotmailIMAP.js - range - aiUIDS.value[j] "+aiUIDS.value[j]);
                        
                        if (min <=aiUIDS.value[j] && (max >= aiUIDS.value[j] || max ==-1) )
                        {
                            aRange.push( aiUIDS.value[j]);
                            this.m_Log.Write("nsHotmailIMAP.js - range - aiUIDS.value[j] - ADDED");
                        }    
                    }
                }
                else
                    aRange.push( aTempRange[i]);    
            }
            
            this.m_Log.Write("nsHotmailIMAP.js - range - aRange "+ aRange);           
            this.m_Log.Write("nsHotmailIMAP.js - range - END");    
            return aRange;
        }
        catch(err)
        {
            this.m_Log.DebugDump("nsHotmailIMAP.js: range : Exception : "
                                              + err.name 
                                              + ".\nError message: " 
                                              + err.message + "\n"
                                              + err.lineNumber);
             return null;
        }
    },
    
    
    
    
    
        
    logOut : function()
    {
        try
        {
            this.m_Log.Write("nsHotmailIMAP.js - logOUT - START");
            
            this.m_bAuthorised = false;
            var szResponse = "* BYE IMAP4rev1 Server logout\r\n";
            szResponse += this.m_iTag +" OK Logout Completed\r\n"
            this.serverComms(szResponse);                 
            
            this.m_Log.Write("nsHotmailIMAP.js - logOUT - END");
            return true;
        }
        catch(e)
        {
            this.m_Log.DebugDump("nsHotmailIMAP.js: logOUT : Exception : "
                                      + e.name 
                                      + ".\nError message: " 
                                      + e.message+ "\n"
                                      + e.lineNumber);
            return false;
        }
    },
    
   
   
       
    
    
    close : function ()
    {
        try
        {
            this.m_Log.Write("nsHotmailIMAP.js - close - START");
            this.serverComms(this.m_iTag +" OK CLOSE complete\r\n");
            this.m_Log.Write("nsHotmailIMAP.js - close - END");   
        }
        catch(err)
        {
            this.m_Log.DebugDump("nsHotmailIMAP.js: close : Exception : "
                                              + err.name 
                                              + ".\nError message: " 
                                              + err.message);
            
            this.serverComms(this.m_iTag +" BAD error\r\n");
            return false;
        }
    },
    
    
    
    check : function()
    {
        try
        {
            this.m_Log.Write("nsHotmailIMAP.js - check - START");
            this.serverComms(this.m_iTag +" OK CHECK complete\r\n");
            this.m_Log.Write("nsHotmailIMAP.js - check - END");   
        }
        catch(err)
        {
            this.m_Log.DebugDump("nsHotmailIMAP.js: check : Exception : "
                                              + err.name 
                                              + ".\nError message: " 
                                              + err.message);
            
            this.serverComms(this.m_iTag +" BAD error\r\n");
            return false;
        }
    },
    
    
    
  
    expunge : function ()
    {
        try
        {
            this.m_Log.Write("nsHotmailIMAP.js - expunge - START");

            this.m_iTimerTask =5;
            this.m_Log.Write("nsHotmailIMAP.js - expunge - starting delay");
            //start timer
            this.m_Timer.initWithCallback(this, 
                                          this.m_iTime, 
                                      Components.interfaces.nsITimer.TYPE_REPEATING_SLACK); 
            
            this.m_Log.Write("nsHotmailIMAP.js - expunge - END");  
        }
        catch(err)
        {
            this.m_Log.DebugDump("nsHotmailIMAP.js: expunge : Exception : "
                                              + err.name 
                                              + ".\nError message: " 
                                              + err.message+ "\n"
                                              + err.lineNumber);
            
            this.serverComms(this.m_iTag +" BAD error\r\n");
            return false;
        }
    },
    
    
    
    examine : function ()
    {
        try
        {
            this.m_Log.Write("nsHotmailIMAP.js - examine - START");
            this.serverComms(this.m_iTag +" NO examine\r\n");
            this.m_Log.Write("nsHotmailIMAP.js - examine - END");  
        }
        catch(err)
        {
            this.m_Log.DebugDump("nsHotmailIMAP.js: examine : Exception : "
                                              + err.name 
                                              + ".\nError message: " 
                                              + err.message+ "\n"
                                              + err.lineNumber);
            
            this.serverComms(this.m_iTag +" BAD error\r\n");
            return false;
        }
    },
    
    
    getTime : function()
    {
        var date = new Date();
        var time = date.getTime();
        return time;
    },
    
    
     /*******************************Server Comms  ****************************/
    
    serverComms : function (szMsg)
    {
        try
        { 
            this.m_Log.Write("nsHotmailIMAP.js - serverComms - START");
            this.m_Log.Write("nsHotmailIMAP.js - serverComms msg " + szMsg);
            var iCount = this.m_oResponseStream.write(szMsg,szMsg.length);
            this.m_Log.Write("nsHotmailIMAP.js - serverComms sent count: " + iCount
                                                        +" msg length: " +szMsg.length);
            this.m_Log.Write("nsHotmailIMAP.js - serverComms - END");
        }
        catch(e)
        {
            this.m_Log.DebugDump("nsHotmail.js: serverComms : Exception : " 
                                      + e.name 
                                      + ".\nError message: " 
                                      + e.message+ "\n"
                                      + e.lineNumber);
        }
    },
      
    
/******************************************************************************/
/***************** XPCOM  stuff ***********************************************/
/******************************************************************************/
    QueryInterface : function (iid)
    {
        if (!iid.equals(Components.interfaces.nsIIMAPDomainHandler) 
        	                      && !iid.equals(Components.interfaces.nsISupports))
            throw Components.results.NS_ERROR_NO_INTERFACE;
            
        return this;
    }
}
 

/******************************************************************************/
/* FACTORY*/
var nsHotmailIMAPFactory = new Object();

nsHotmailIMAPFactory.createInstance = function (outer, iid)
{
    if (outer != null) throw Components.results.NS_ERROR_NO_AGGREGATION;
    
    if (!iid.equals(nsHotmailIMAPClassID) && !iid.equals(Components.interfaces.nsISupports))
        throw Components.results.NS_ERROR_INVALID_ARG;
    
    return new nsHotmailIMAP();
}


/******************************************************************************/
/* MODULE */
var nsHotmailIMAPModule = new Object();

nsHotmailIMAPModule.registerSelf = function(compMgr, fileSpec, location, type)
{
    compMgr = compMgr.QueryInterface(Components.interfaces.nsIComponentRegistrar);
    compMgr.registerFactoryLocation(nsHotmailIMAPClassID,
                                    "HotmailIMAPComponent",
                                    nsHotmailIMAPContactID, 
                                    fileSpec,
                                    location, 
                                    type);
}


nsHotmailIMAPModule.unregisterSelf = function(aCompMgr, aFileSpec, aLocation)
{
    aCompMgr = aCompMgr.QueryInterface(Components.interfaces.nsIComponentRegistrar);
    aCompMgr.unregisterFactoryLocation(nsHotmailIMAPClassID, aFileSpec);
}

 
nsHotmailIMAPModule.getClassObject = function(compMgr, cid, iid)
{
    if (!cid.equals(nsHotmailIMAPClassID))
        throw Components.results.NS_ERROR_NO_INTERFACE;

    if (!iid.equals(Components.interfaces.nsIFactory))
        throw Components.results.NS_ERROR_NOT_IMPLEMENTED;

    return nsHotmailIMAPFactory;
}


nsHotmailIMAPModule.canUnload = function(compMgr)
{
    return true;
}
/******************************************************************************/


function NSGetModule(compMgr, fileSpec)
{
    return nsHotmailIMAPModule; 
}
