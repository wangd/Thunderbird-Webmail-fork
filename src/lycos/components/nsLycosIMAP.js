/*****************************  Globals   *************************************/                 
const nsLycosIMAPClassID = Components.ID("{98ceff20-9cb0-11d9-9669-0800200c9a66}"); 
const nsLycosIMAPContactID = "@mozilla.org/LycosIMAP;1";


const LycosSchema = "<?xml version=\"1.0\"?>\r\n<D:propfind xmlns:D=\"DAV:\" xmlns:h=\"http://schemas.microsoft.com/hotmail/\" xmlns:hm=\"urn:sc hemas:httpmail:\">\r\n<D:prop>\r\n<h:adbar/>\r\n<hm:contacts/>\r\n<hm:inbox/>\r\n<hm:outbox/>\r\n<hm:sendmsg/>\r\n<hm:sentitems/>\r\n<hm:deleteditems/>\r\n<hm:drafts/>\r\n<hm:msgfolderroot/>\r\n<h:maxpoll/>\r\n<h:sig/>\r\n</D:prop>\r\n</D:propfind>";
const LycosFolderIMAPSchema = "<?xml version=\"1.0\"?>\r\n<D:propfind xmlns:D=\"DAV:\" xmlns:hm=\"urn:schemas:httpmail:\">\r\n<D:prop>\r\n<D:isfolder/>\r\n<D:displayname/>\r\n<hm:special/>\r\n<D:hassubs/>\r\n<D:nosubs/>\r\n<hm:unreadcount/>\r\n<D:visiblecount/>\r\n<hm:special/>\r\n</D:prop>\r\n</D:propfind>";
const LycosMailIMAPSchema = "<?xml version=\"1.0\"?>\r\n<D:propfind xmlns:D=\"DAV:\" xmlns:hm=\"urn:schemas:httpmail:\" xmlns:m=\"urn:schemas:mailheader:\">\r\n<D:prop>\r\n<D:isfolder/>\r\n<hm:read/>\r\n<m:hasattachment/>\r\n<m:to/>\r\n<m:from/>\r\n<m:subject/>\r\n<m:date/>\r\n<D:getcontentlength/>\r\n</D:prop>\r\n</D:propfind>";
const LycosPROPReadSchema = "<?xml version=\"1.0\"?>\r\n<D:propertyupdate xmlns:D=\"DAV:\" xmlns:hm=\"urn:schemas:httpmail:\">\r\n<D:set>\r\n<D:prop>\r\n<hm:read>0</hm:read>\r\n</D:prop>\r\n</D:set>\r\n</D:propertyupdate>";
const LycosPROPUnReadSchema = "<?xml version=\"1.0\"?>\r\n<D:propertyupdate xmlns:D=\"DAV:\" xmlns:hm=\"urn:schemas:httpmail:\">\r\n<D:set>\r\n<D:prop>\r\n<hm:read>0</hm:read>\r\n</D:prop>\r\n</D:set>\r\n</D:propertyupdate>";

const LycosIMAPMSGIDPattern = /[^\/]+$/;
const LycosIMAPResponse = /<D:response>[\S\d\s\r\n]*?<\/D:response>/gm;
const LycosIMAPID = /<D:id>(.*?)<\/D:id>/i;
const LycosIMAPHref = /<D:href>(.*?)<\/D:href>/i;
const LycosIMAPRead = /<hm:read>(.*?)<\/hm:read>/i;
const LycosIMAPSize = /<D:getcontentlength>(.*?)<\/D:getcontentlength>/i;
const LycosIMAPAttachment = /<m:hasattachment>(.*?)<\/m:hasattachment>/i;
const LycosIMAPTo = /<m:to>(.*?)<\/m:to>/i;
const LycosIMAPFrom = /<m:from>(.*?)<\/m:from>/i;
const LycosIMAPSubject = /<m:subject>(.*?)<\/m:subject>/i;
const LycosIMAPDate = /<m:date>(.*?)T(.*?)<\/m:date>/i;

const LycosIMAPFolderPattern = /<hm:msgfolderroot>(.*?)<\/hm:msgfolderroot>/;
const LycosIMAPUnreadCount = /<hm:unreadcount>(.*?)<\/hm:unreadcount>/;
const LycosIMAPMsgCount = /<D:visiblecount>(.*?)<\/D:visiblecount>/;
const LycosIMAPDisplayName = /<D:displayname>(.*?)<\/D:displayname>/;
const LycosIMAPSpecial = /<hm:special>(.*?)<\/hm:special>/;
/***********************  Lycos ********************************/

function nsLycosIMAP()
{
    try
    {       
        var scriptLoader =  Components.classes["@mozilla.org/moz/jssubscript-loader;1"];
        scriptLoader = scriptLoader.getService(Components.interfaces.mozIJSSubScriptLoader);
        scriptLoader.loadSubScript("chrome://web-mail/content/common/DebugLog.js");
        scriptLoader.loadSubScript("chrome://web-mail/content/common/HttpComms2.js");
        scriptLoader.loadSubScript("chrome://web-mail/content/common/CommonPrefs.js");
       
        var date = new Date();
        var  szLogFileName = "LycosIMAP Log - " + date.getHours()+ "-" + date.getMinutes() + "-"+ date.getUTCMilliseconds() +" -";
        this.m_Log = new DebugLog("webmail.logging.comms", 
                                  "{3c8e8390-2cf6-11d9-9669-0800200c9a66}" ,
                                  szLogFileName); 
        
        this.m_Log.Write("nsLycosIMAP.js - Constructor - START");
       
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
            
        this.m_Timer = Components.classes["@mozilla.org/timer;1"];
        this.m_Timer = this.m_Timer.createInstance(Components.interfaces.nsITimer);

        var oPref = {Value:null};
        var  WebMailPrefAccess = new WebMailCommonPrefAccess();
        if (WebMailPrefAccess.Get("int","lycos.iProcessDelay",oPref))
            this.m_iTime=oPref.Value;
        else
            this.m_iTime=10; 
        
        //do i reuse the session
        oPref.Value = null;
        if (WebMailPrefAccess.Get("bool","lycos.bReUseSession",oPref))
            this.m_bReUseSession=oPref.Value;
        else
            this.m_bReUseSession=true; 
                
        this.m_Log.Write("nsLycosIMAP.js - Constructor - END");
    }
    catch(e)
    {
        DebugDump("nsLycosIMAP.js: Constructor : Exception : "
                                      + e.name 
                                      + ".\nError message: " 
                                      + e.message+ "\n"
                                      + e.lineNumber);
    }
}



nsLycosIMAP.prototype =
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
            this.m_Log.Write("nsLycosIMAP.js - logIN - START");
            this.m_Log.Write("nsLycosIMAP.js - logIN - Username: " + this.m_szUserName
                                                   + " Password: "  + this.m_szPassWord 
                                                   + " stream: "    + this.m_oResponseStream);
            
            if (!this.m_szUserName || !this.m_oResponseStream || !this.m_szPassWord) return false;
            
            var szDomain = this.m_szUserName.split("@")[1];
            this.m_Log.Write("nsLycosIMAP.js - logIN - doamain " + szDomain);
            
            var szLocation= null;
            if (szDomain.search(/lycos.co.uk/i)!=-1) 
                szLocation= "http://webdav.lycos.co.uk/httpmail.asp";
            else if (szDomain.search(/lycos.es/i)!=-1)
                szLocation= "http://webdav.lycos.es/httpmail.asp";
            else if (szDomain.search(/lycos.de/i)!=-1)    
                szLocation= "http://webdav.lycos.de/httpmail.asp";
            else if (szDomain.search(/lycos.it/i)!=-1)    
                szLocation= "http://webdav.lycos.it/httpmail.asp";
            else if (szDomain.search(/lycos.at/i)!=-1)    
                szLocation= "http://webdav.lycos.at/httpmail.asp";  
            else if (szDomain.search(/lycos.nl/i)!=-1)    
                szLocation= "http://webdav.lycos.nl/httpmail.asp";    
            else if (szDomain.search(/lycos.fr/i)!=-1)
                szLocation= "http://webdav.caramail.lycos.fr/httpmail.asp";   
            else
                throw new Error("Unknown domain");
            
            this.m_HttpComms.setUserName(this.m_szUserName);
            this.m_HttpComms.setPassword(this.m_szPassWord);
            this.m_HttpComms.setContentType("text/xml");
            this.m_HttpComms.setURI(szLocation);
            this.m_HttpComms.setRequestMethod("PROPFIND");
            this.m_HttpComms.addData(LycosSchema);
            var bResult = this.m_HttpComms.send(this.loginOnloadHandler, this);                             
            if (!bResult) throw new Error("httpConnection returned false");      
            
            this.m_Log.Write("nsLycosIMAP.js - logIN - END " + bResult);
            return true;
        }
        catch(e)
        {
            this.m_Log.DebugDump("nsLycosIMAP.js: logIN : Exception : "
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
            mainObject.m_Log.Write("nsLycosIMAP.js - loginOnloadHandler - START");
            mainObject.m_Log.Write("nsLycosIMAP.js - loginOnloadHandler : \n" + szResponse);  
            mainObject.m_Log.Write("nsLycosIMAP.js - loginOnloadHandler : "+ mainObject.m_iStage);           
            
            var httpChannel = event.QueryInterface(Components.interfaces.nsIHttpChannel);
            
            //if this fails we've gone somewhere new
            mainObject.m_Log.Write("nsLycos - loginOnloadHandler - status :" +httpChannel.responseStatus );
            if (httpChannel.responseStatus != 200 && httpChannel.responseStatus != 207) 
                throw new Error("return status " + httpChannel.responseStatus);
        
            mainObject.m_Log.Write("nsLycosIMAP.js - loginOnloadHandler - get url - start");
            mainObject.m_iAuth=0; //reset login counter
            mainObject.m_szFolderURI = szResponse.match(LycosIMAPFolderPattern)[1];
            mainObject.m_Log.Write("nsLycosIMAP.js - loginOnloadHandler - get folder url - " + mainObject.m_szFolderURI);
          
            //server response
            mainObject.serverComms(mainObject.m_iTag +" OK Login Complete\r\n");
            mainObject.m_bAuthorised = true;
                    
            mainObject.m_Log.Write("nsLycosIMAP.js - loginOnloadHandler - get url - end");

           
            mainObject.m_Log.Write("nsLycosIMAP.js - loginOnloadHandler - END");
        }
        catch(err)
        {
            mainObject.m_Log.DebugDump("nsLycosIMAP.js: loginHandler : Exception : "
                                          + err.name 
                                          + ".\nError message: " 
                                          + err.message+ "\n"
                                          + err.lineNumber);
            mainObject.m_HttpComms.deleteSessionData();                                  
            mainObject.serverComms(mainObject.m_iTag + " NO Comms Error\r\n");
            return false;
        }
    },
    
    
    
    listSubscribe : function()
    {
        try
        {
            this.m_Log.Write("nsLycosIMAP.js - listSubscribe - START");
            
            var aszFolders = {value : null};
            var iFolders = {value : null }; 
            var aszFolder = this.m_oFolder.listSubscribed(this.m_szUserName, 
                                                          iFolders,
                                                          aszFolders);
            this.m_Log.Write("nsLycosIMAP.js - listSubscribe - list: " + aszFolders.value);
            
            var szResponse = "";
            for (i=0; i<aszFolders.value.length; i++)
            {
                szResponse += "* lsub (\\Noinferiors \\HasNoChildren) " + "\".\" \"" + aszFolders.value[i] + "\"\r\n";  
            } 
            szResponse += this.m_iTag + " OK LSUB Completed\r\n";
            this.serverComms(szResponse);  
        
            this.m_Log.Write("nsLycosIMAP.js - listSubscribe - END");
            return true;
        }
        catch(err)
        {
            this.m_Log.DebugDump("nsLycosIMAP.js: listSubscribe : Exception : "
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
            this.m_Log.Write("nsLycosIMAP.js - subscribe - START");
            this.m_Log.Write("nsLycosIMAP.js - subscribe - szFolder " +szFolder);                                                                   
            if (!szFolder) return false;

            var bDone = this.m_oFolder.subscribeFolder(this.m_szUserName, szFolder); 
            var szResponse = this.m_iTag;
            szResponse += bDone? " OK " : " NO ";
            szResponse += "SUBCRIBE Completed\r\n";           
            this.serverComms(szResponse);  
            
            this.m_Log.Write("nsLycosIMAP.js - subscribe - END");
        }
        catch(err)
        {
             this.m_Log.DebugDump("nsLycosIMAP.js: subscribe : Exception : "
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
            this.m_Log.Write("nsLycosIMAP.js - unSubscribe - START");
            this.m_Log.Write("nsLycosIMAP.js - unSubscribe - Folder " + szFolder );
            if (!szFolder) return false;
            
            var bDone = this.m_oFolder.unsubscribeFolder(this.m_szUserName, szFolder); 
            var szResponse = this.m_iTag;
            szResponse += bDone? " OK " : " NO ";
            szResponse += "UNSUBCRIBE Completed\r\n";            
            this.serverComms(szResponse);  
            
            this.m_Log.Write("nsLycosIMAP.js - unSubscribe - END");
        }
        catch(err)
        {
            this.m_Log.DebugDump("nsLycosIMAP.js: unSubscribe : Exception : "
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
            this.m_Log.Write("nsLycosIMAP.js - list - START");
            this.m_Log.Write("nsLycosIMAP.js - list - szReference " + szReference);  
            
            if (this.m_szFolderURI == null) return false;
            this.m_Log.Write("nsLycosIMAP.js - list - mail box url " + this.m_szFolderURI);
            
            this.m_szFolderReference = szReference;

            if (this.m_oFolder.getFolderCount(this.m_szUserName)==0)
            {//donwload folder list
                this.m_HttpComms.setContentType("text/xml");
                this.m_HttpComms.setRequestMethod("PROPFIND");
                this.m_HttpComms.addData(LycosFolderIMAPSchema);
                this.m_HttpComms.setURI(this.m_szFolderURI);
                var bResult = this.m_HttpComms.send(this.listOnloadHandler, this);                             
                if (!bResult) throw new Error("httpConnection returned false");
            }
            else
            {
                this.listResponse();
            }     
            this.m_Log.Write("nsLycosIMAP.js - list - END");
            return true;
        }
        catch(err)
        {
            this.m_Log.DebugDump("nsLycosIMAP.js: list : Exception : "
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
            mainObject.m_Log.Write("nsLycosIMAP.js - listOnloadHandler - START");
            mainObject.m_Log.Write("nsLycosIMAP.js - listOnloadHandler - " + szResponse);
            
            var httpChannel = event.QueryInterface(Components.interfaces.nsIHttpChannel);
            
            //if this fails we've gone somewhere new
            mainObject.m_Log.Write("nsLycos - listOnloadHandler - status :" +httpChannel.responseStatus );
            if (httpChannel.responseStatus != 200 && httpChannel.responseStatus != 207) 
                throw new Error("return status " + httpChannel.responseStatus);
                                          
            //get root folders
            mainObject.m_Log.Write("nsLycosIMAP.js - listOnloadHandler - get root folder list - START");
            
            var aszResponses = szResponse.match(LycosIMAPResponse);
            mainObject.m_Log.Write("nsLycosIMAP.js - listOnloadHandler - folders - \n" + aszResponses);
            
            var szResponse = "";
            
            for (i=0; i<aszResponses.length; i++)
            {
                mainObject.processFolder(aszResponses[i]);
            }
            
            mainObject.listResponse();
            
            mainObject.m_Log.Write("nsLycosIMAP.js - listOnloadHandler - END");
        }
        catch(err)
        {
             mainObject.m_Log.DebugDump("nsLycosIMAP.js: listOnloadHandler : Exception : "
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
            this.m_Log.Write("nsLycosIMAP.js - processFolder - START");
            this.m_Log.Write("nsLycosIMAP.js - processFolder - szFolder " +szFolder);
            
            var szHref = szFolder.match(LycosIMAPHref)[1];
                    
            var szDisplayName = null;
            try
            {
                szDisplayName = szFolder.match(LycosIMAPDisplayName)[1];
            }
            catch(e)
            {
                szDisplayName = szFolder.match(LycosIMAPSpecial)[1];
            }
                          
            var szHiererchy = null;
            if (szHref.search(/inbox/i)!=-1)
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
            
            var iUnreadCount = parseInt(szFolder.match(LycosIMAPUnreadCount)[1]);
            var iMsgCount =  parseInt(szFolder.match(LycosIMAPMsgCount)[1]);
            var szUID =  szFolder.match(LycosIMAPID)[1];
            
            this.m_oFolder.addFolder(this.m_szUserName, szHiererchy, szHref, szUID, 0, 0);
            this.m_Log.Write("nsLycosIMAP.js - processFolder - END");
        }
        catch(err)
        {
            this.m_Log.DebugDump("nsLycosIMAP.js: listResponse : Exception : "
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
            this.m_Log.Write("nsLycosIMAP.js - listResponse - START");
            
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
            
            this.m_Log.Write("nsLycosIMAP.js - listResponse - END");    
        }
        catch(err)
        {
             this.m_Log.DebugDump("nsLycosIMAP.js: listResponse : Exception : "
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
            this.m_Log.Write("nsLycosIMAP.js - select - START");   
            this.m_Log.Write("nsLycosIMAP.js - select - szReference " + szReference);
                    
            if (this.m_szFolderURI == null) return false;
                       
            this.m_szSelectFolder = szReference;
                        
            var bResult = false;
            
            if ( this.m_oFolder.getFolderCount(this.m_szUserName) == 0) //load list of folders
            {
                this.m_Log.Write("nsLycosIMAP.js - select - folders not found");
                
                this.m_iStage=0;
                this.m_Log.Write("nsLycosIMAP.js - select - " + this.m_szFolderURI);
                this.m_HttpComms.setURI(this.m_szFolderURI);
                this.m_HttpComms.setRequestMethod("PROPFIND");
                this.m_HttpComms.setContentType("text/xml");
                this.m_HttpComms.addData(LycosFolderIMAPSchema);
                var bResult = this.m_HttpComms.send(this.selectOnloadHandler, this);                             
                if (!bResult) throw new Error("httpConnection returned false");
            }
            else
            {
                this.m_Log.Write("nsLycosIMAP.js - select - folder found");
                var oHref = {value:null};
                var oUID = {value:null};
                var oMSGCount = {value:null};
                var oUnreadCount = {value:null};
                if (!this.m_oFolder.getFolderDetails(this.m_szUserName, szReference , oHref , oUID, oMSGCount, oUnreadCount))
                    throw new Error("Folder not found");
               
                this.m_Log.Write("nsLycosIMAP.js - select - " + oHref.value + " " + oUID.value + " " + oMSGCount.value + " " + oUnreadCount.value);
                
                this.m_iStage = 1;
                this.m_HttpComms.setURI(oHref.value);
                this.m_HttpComms.setContentType("text/xml");
                this.m_HttpComms.setRequestMethod("PROPFIND");
                this.m_HttpComms.addData(LycosMailIMAPSchema);
                var bResult = this.m_HttpComms.send(this.selectOnloadHandler, this);                             
                if (!bResult) throw new Error("httpConnection returned false"); 
            }
                                             
            if (!bResult) throw new Error("httpConnection returned false");
                                       
            this.m_Log.Write("nsLycosIMAP.js - select - END");
            return true;
        }
        catch(err)
        {
            this.m_Log.DebugDump("nsLycosIMAP.js: select : Exception : "
                                      + err.name 
                                      + ".\nError message: " 
                                      + err.message  +"\n"
                                      + err.lineNumber);
                                      
            this.serverComms(this.m_iTag +" BAD error\r\n"); 
            return false;
        }
    },
    
    
    
    selectOnloadHandler : function (szResponse ,event , mainObject)
    {
        try
        {
            mainObject.m_Log.Write("nsLycosIMAP.js - selectOnloadHandler - START");
            mainObject.m_Log.Write("nsLycosIMAP.js - selectOnloadHandler : \n"+ szResponse);
            mainObject.m_Log.Write("nsLycosIMAP.js - selectOnloadHandler : "+ mainObject.m_iStage);  
            
            var httpChannel = event.QueryInterface(Components.interfaces.nsIHttpChannel);

            //if this fails we've gone somewhere new
            mainObject.m_Log.Write("nsLycos - selectOnloadHandler - status :" +httpChannel.responseStatus );
            if (httpChannel.responseStatus != 200 && httpChannel.responseStatus != 207) 
                throw new Error("return status " + httpChannel.responseStatus);
            
                        
            switch( mainObject.m_iStage)
            {
                case 0:   //folder list
                    mainObject.m_Log.Write("nsLycosIMAP.js - selectOnloadHandler - get folder list - START");
                    
                    var aszResponses = szResponse.match(LycosIMAPResponse);
                    mainObject.m_Log.Write("nsLycosIMAP.js - selectOnloadHandler - folders - \n" + aszResponses);
                    for (i=0; i<aszResponses.length; i++)
                    {
                        this.processFolder(aszResponses[i]);    
                    }
                   
                    var oHref = {value:null};
                    var oUID = {value:null};
                    var oMSGCount = {value:null};
                    var oUnreadCount = {value:null};
                    var bFolder = mainObject.m_oFolder.getFolderDetails(mainObject.m_szUserName, mainObject.m_szSelectFolder, 
                                                              oHref , oUID, oMSGCount, oUnreadCount)
                    if (!bFolder) throw new Error("Folder not found");
               
                    this.m_Log.Write("nsLycosIMAP.js - select - " + oHref.value + " " + oUID.value + " " + oMSGCount.value + " " + oUnreadCount.value);
                              
                    mainObject.m_iStage = 1;
                    mainObject.m_HttpComms.setContentType("text/xml");
                    mainObject.m_HttpComms.setURI(oHref.value);
                    mainObject.m_HttpComms.setRequestMethod("PROPFIND");
                    mainObject.m_HttpComms.addData(LycosMailIMAPSchema);
                    var bResult = mainObject.m_HttpComms.send(mainObject.selectOnloadHandler, this);                             
                    if (!bResult) throw new Error("httpConnection returned false"); 
                
                    mainObject.m_Log.Write("nsLycosIMAP.js - selectOnloadHandler - get folder list - END");
                break;
                
                case 1:  //message headers
                    mainObject.m_Log.Write("nsLycosIMAP.js - selectOnloadHandler - get msg list - START");
                    
                    //get uid list
                    var aszResponses = szResponse.match(LycosIMAPResponse);
                    mainObject.m_Log.Write("nsLycosIMAP.js - selectOnloadHandler - \n" + aszResponses);
                    delete mainObject.m_aRawData;
                    if (aszResponses)
                    {
                        mainObject.m_aRawData = aszResponses; 
                    }
                    else
                        mainObject.m_aRawData = new Array();     
                                        
                    mainObject.m_iTimerTask =0;
                    mainObject.m_Log.Write("nsLycosIMAP.js - mailBoxOnloadHandler - starting delay");
                    //start timer
                    mainObject.m_Timer.initWithCallback(mainObject, 
                                                        mainObject.m_iTime, 
                                              Components.interfaces.nsITimer.TYPE_REPEATING_SLACK); 
                   
            
                    mainObject.m_Log.Write("nsLycosIMAP.js - selectOnloadHandler - get msg list - END");
                break;
            }
            
            mainObject.m_Log.Write("nsLycosIMAP.js - selectOnloadHandler - END");
        }
        catch(err)
        {
             mainObject.m_Log.DebugDump("nsLycosIMAP.js: selectOnloadHandler : Exception : "
                                              + err.name 
                                              + ".\nError message: " 
                                              + err.message +"\n"
                                              + err.lineNumber);
            
             mainObject.serverComms(mainObject.m_iTag +" BAD error\r\n");
        }
    },
    
    
    processMSG : function (Item)
    {
        this.m_Log.Write("nsLycosIMAP.js - processMSG - START");
        
        if (Item)
        {
            this.m_Log.Write("nsLycosIMAP.js - processMSG - handling data");
            
            var bRead = parseInt(Item.match(LycosIMAPRead)[1]) ? true : false;
            this.m_Log.Write("nsLycosIMAP.js - processMSG - bRead -" + bRead);
    
            var szMSGUri = Item.match(LycosIMAPHref)[1]; //uri
            this.m_Log.Write("nsLycosIMAP.js - processMSG - szMSGUri -" + szMSGUri);
            
            var szID = szMSGUri.match(/MSG(.*?)$/)[1];
            this.m_Log.Write("nsLycosIMAP.js - processMSG - szID -" + szID);
                                    
            var iSize = parseInt(Item.match(LycosIMAPSize)[1]);//size 
            this.m_Log.Write("nsLycosIMAP.js - processMSG - iSize -" + iSize);
                       
            var szTO="";
            try
            {                   
                szTO = Item.match(LycosIMAPTo)[1].match(/[\S\d]*@[\S\d]*/);  
            }
            catch(err)
            {
                szTO = Item.match(LycosIMAPTo)[1];
            }
            this.m_Log.Write("nsLycosIMAP.js - processMSG - szTO -" + szTO);
            
            var szFrom = "";
            try
            {
                szFrom = Item.match(LycosIMAPFrom)[1].match(/[\S\d]*@[\S\d]*/);
            }
            catch(err)
            {
                szFrom = Item.match(LycosIMAPFrom)[1];    
            }
            this.m_Log.Write("nsLycosIMAP.js - processMSG - szFrom -" + szFrom);
            
            var szSubject= "";
            try
            {
                szSubject= Item.match(LycosIMAPSubject)[1];
            }
            catch(err){}
            this.m_Log.Write("nsLycosIMAP.js - processMSG - szSubject -" + szSubject);
            
            var szDate = "";
            try
            {
                var aszDateTime = Item.match(LycosIMAPDate);
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
            this.m_Log.Write("nsLycosIMAP.js - processMSG - szDate -" + szDate);
            
            this.m_oFolder.addMSG(this.m_szUserName, this.m_szSelectFolder, szMSGUri, szID , bRead, szTO, szFrom, szSubject, szDate, iSize);
        }
        else
        {
            this.m_Log.Write("nsLycosIMAP.js - processMSG - all data handled"); 
            
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

        this.m_Log.Write("nsLycosIMAP.js - processMSG - END");
    },
    




    fetch : function (szRange, szFlag)
    {
        try
        {
            this.m_Log.Write("nsLycosIMAP.js - fetch - START");
            this.m_Log.Write("nsLycosIMAP.js - fetch - Range " + szRange + " Flags "+ szFlag);
          
            delete this.m_aRawData;
            this.m_aRawData = this.range(szRange);
            this.m_Log.Write("nsLycosIMAP.js - fetch - Range " +this.m_aRawData);
            
            if (szFlag.search(/Header/i)!=-1)
            {
                this.m_Log.Write("nsLycosIMAP.js - fetch - headers "); 
                this.m_iTimerTask =2;
                //start timer
                this.m_Timer.initWithCallback(this, 
                                              this.m_iTime, 
                                      Components.interfaces.nsITimer.TYPE_REPEATING_SLACK); 
            }
            else if (szFlag.search(/Body/i)!=-1)
            {
                this.m_Log.Write("nsLycosIMAP.js - fetch - body ");
                this.fetchBody(); 
            }
            else  //get message ids
            {
                this.m_Log.Write("nsLycosIMAP.js - fetch - ids ");   
                this.m_iTimerTask =1;
                //start timer
                this.m_Timer.initWithCallback(this, 
                                              this.m_iTime, 
                                      Components.interfaces.nsITimer.TYPE_REPEATING_SLACK); 
            }                 
            
            this.m_Log.Write("nsLycosIMAP.js - fetch - END");
            return true;
        }
        catch(err)
        {
             this.m_Log.DebugDump("nsLycosIMAP.js: fetch : Exception : "
                                              + err.name 
                                              + ".\nError message: " 
                                              + err.message+ "\n"
                                              + err.lineNumber);
            
             this.serverComms(this.m_iTag +" BAD error\r\n");
             return false;
        }
    },
    
        
        
        
    
    fetchIDs : function (iUID)
    {
        this.m_Log.Write("nsLycosIMAP.js - fetchIDs - START");
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
                szResponse += " ";
                szResponse +=  oDelete.value?"\\Deleted":"";
                szResponse += ") UID " + iUID + ")\r\n"; 
                this.serverComms(szResponse);
            }
        }
        else
        {
            this.m_Log.Write("nsLycosIMAP.js - fetchIDs - all data handled");  
            this.serverComms(this.m_iTag +" UID FETCH complete\r\n");
        }
             
        this.m_Log.Write("nsLycosIMAP.js - fetchIDs - END");
        return true; 
    },
    
    
    
    
    
    fetchHeaders : function (iUID)
    {
        this.m_Log.Write("nsLycosIMAP.js - fetchHeaders - START");
        
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
                szTemp += "Date: "+ oDate.value + "\r\n";
               
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
            this.m_Log.Write("nsLycosIMAP.js - fetchIDs - all data handled");  
            this.serverComms(this.m_iTag +" OK UID FETCH complete\r\n");
        }
        
        this.m_Log.Write("nsLycosIMAP.js - fetchHeaders - END");
        return true;
    },
    
    
    
    
    
    fetchBody : function ()
    {
        try
        {
            this.m_Log.Write("nsLycosIMAP.js - fetchBody - START"); 
            
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
                var bMSG = this.m_oFolder.getMSG(this.m_szUserName, this.m_szSelectFolder, iUID, 
                                                 oIndex, oHref, oRead, oDelete, oTo, oFrom, oSubject, oDate, oSize);
                this.m_Log.Write("nsLycosIMAP.js - fetchBody - URI " +oHref.value );
                
                this.m_iStage = 0;
                this.m_HttpComms.setURI(oHref.value);
                this.m_HttpComms.setRequestMethod("GET");
                var bResult = this.m_HttpComms.send(this.fetchBodyOnloadHandler, this); 
                                            
                if (!bResult) throw new Error("httpConnection returned false");                              
            }
            else
                throw new Error("NO IDs");
            
            this.m_Log.Write("nsLycosIMAP.js - fetchBody - END");
            return true; 
        }
        catch(err)
        {
            this.m_Log.DebugDump("nsLycosIMAP.js: fetchBody : Exception : "
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
            mainObject.m_Log.Write("nsLycosIMAP.js - fetchBodyOnloadHandler - START");
            mainObject.m_Log.Write("nsLycosIMAP.js - fetchBodyOnloadHandler : " + mainObject.m_iStage);  
            mainObject.m_Log.Write("nsLycosIMAP.js - fetchBodyOnloadHandler : \n" + szResponse);
            
            var httpChannel = event.QueryInterface(Components.interfaces.nsIHttpChannel);
            
            //if this fails we've gone somewhere new
            mainObject.m_Log.Write("nsLycos - fetchBodyOnloadHandler - status :" +httpChannel.responseStatus );
            if (httpChannel.responseStatus != 200 && httpChannel.responseStatus != 207) 
                throw new Error("return status " + httpChannel.responseStatus);
           
            var iUID = parseInt(httpChannel.URI.spec.match(/MSG(.*?)$/)[1]);   
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
            mainObject.m_Log.Write("nsLycosIMAP.js - fetchBodyOnloadHandler - END");
            return true;
        }
        catch(err)
        {
            mainObject.m_Log.DebugDump("nsLycosIMAP.js: fetchBodyOnloadHandler : Exception : "
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
            this.m_Log.Write("nsLycosIMAP.js - store - START");
            this.m_Log.Write("nsLycosIMAP.js - store - range " + szRange + " szData "+ szData + " Item " +szDataItem );
           
            //construct MSG range
            delete this.m_aRawData;
            this.m_aRawData = this.range(szRange);
            this.m_Log.Write("nsLycosIMAP.js - store - Range " +this.m_aRawData);
                                    
            //check we have got something
            if (this.m_aRawData.length== 0)
            {
                this.m_Log.Write("nsLycosIMAP.js - store - no messages");
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
                                
                this.m_Log.Write("nsLycosIMAP.js - store - seen/Unseen");
              
                this.m_iStore = iUID;
                var bMSG = this.m_oFolder.getMSG(this.m_szUserName, this.m_szSelectFolder, iUID, 
                                                 oIndex, oHref, oRead, oDelete, oTo, oFrom, oSubject, oDate, oSize);
                                  
                //propattach
                this.m_HttpComms.setURI(oHref.value);
                this.m_HttpComms.setContentType("text/xml");
                this.m_HttpComms.setRequestMethod("PROPPATCH");
                
                if (szDataItem.search(/\/unseen/i)!=-1)
                {
                    this.m_Log.Write("nsLycosIMAP.js - store - Unseen");
                    this.m_bStoreStatus = false;
                    this.m_HttpComms.addData(LycosPROPUnReadSchema);
                }
                
                if (szDataItem.search(/\/seen/i)!=-1)
                {
                    this.m_Log.Write("nsLycosIMAP.js - store - seen");
                    this.m_bStoreStatus = true;
                    this.m_HttpComms.addData(LycosPROPReadSchema);
                }
                
                if (szDataItem.search(/\/delete/i)!=-1)
                {
                    this.m_Log.Write("nsLycosIMAP.js - store - deleted"); 
                    this.m_bStoreDelete = true;
                }            
                
                var bResult = this.m_HttpComms.send(this.storeOnloadHandler, this);                             
                if (!bResult) throw new Error("httpConnection returned false");
            
                this.m_Log.Write("nsLycosIMAP.js - store - seen");
            } 
            else if(szDataItem.search(/delete/i)!=-1) 
            {
                this.m_Log.Write("nsLycosIMAP.js - store - delete");

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
                        
            this.m_Log.Write("nsLycosIMAP.js - store - END");
            return true;
        }
        catch(err)
        {
             this.m_Log.DebugDump("nsLycosIMAP.js: store : Exception : "
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
        this.m_Log.Write("nsLycosIMAP.js - storeDelete - START " + iUID);
        
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
            this.m_Log.Write("nsLycosIMAP.js - storeDelete - all data handled"); 
            this.serverComms(this.m_iTag +" OK FETCH complete\r\n");
        }         
             
        this.m_Log.Write("nsLycosIMAP.js - storeDelete - END");
        return true; 
    },
    
    
    
    
    
    storeOnloadHandler : function (szResponse ,event , mainObject)
    {
        try
        {
            mainObject.m_Log.Write("nsLycosIMAP.js - storeOnloadHandler - START");
            mainObject.m_Log.Write("nsLycosIMAP.js - storeOnloadHandler : " + mainObject.m_iStage);
            mainObject.m_Log.Write("nsLycosIMAP.js - storeOnloadHandler : \n" + szResponse);  
            
            //if this fails we've gone somewhere new
            var httpChannel = event.QueryInterface(Components.interfaces.nsIHttpChannel);
            mainObject.m_Log.Write("nsLycos - storeOnloadHandler - status :" +httpChannel.responseStatus );
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
                mainObject.m_Log.Write("nsLycosIMAP.js - storeOnloadHandler - marks as deleted");
                mainObject.storeDelete( mainObject.m_iStore);
            }
            
            if (mainObject.m_aRawData.length>0)
            {
                mainObject.m_Log.Write("nsLycosIMAP.js - storeOnloadHandler - next - ");
                
                var iUID = mainObject.m_aRawData.shift();
                var bMSG = mainObject.m_oFolder.getMSG(mainObject.m_szUserName, mainObject.m_szSelectFolder, iUID, 
                                                oIndex, oHref, oRead, oDelete, oTo, oFrom, oSubject, oDate, oSize); 
                mainObject.m_iStore = iUID;
                
                mainObject.m_HttpComms.setContentType("text/xml");
                mainObject.m_HttpComms.setURI(oHref.value);
                mainObject.m_HttpComms.setRequestMethod("PROPPATCH");
                
                if (mainObject.m_bStoreStatus)
                    mainObject.m_HttpComms.addData(LycosPROPUnReadSchema)
                else
                    mainObject.m_HttpComms.addData(LycosPROPUnReadSchema);
                    
                var bResult = mainObject.m_HttpComms.send(mainObject.storeOnloadHandler, mainObject);                             
                if (!bResult) throw new Error("httpConnection returned false");
            }
            else
            {     
                mainObject.m_Log.Write("nsLycosIMAP.js - storeOnloadHandler - done - ");
                var szResponse = mainObject.m_iTag +" OK FETCH complete\r\n"
                mainObject.serverComms(szResponse);
            }
                   
            mainObject.m_Log.Write("nsLycosIMAP.js - storeOnloadHandler - END");
            return true;
        }
        catch(err)
        {
            mainObject.m_Log.DebugDump("nsLycosIMAP.js: storeOnloadHandler : Exception : "
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
            this.m_Log.Write("nsLycosIMAP.js - notify - START");
            
            var Item = null;
            if (this.m_aRawData.length>0)  
                var Item = this.m_aRawData.shift();
            else
            {
                this.m_Timer.cancel();
                delete this.m_aRawData;
            }         
            
            switch(this.m_iTimerTask)
            {
                case 0: //process MSG
                    this.m_Log.Write("nsLycosIMAP.js - notify - processing MSG");    
                    this.processMSG(Item);
                break;
                
                case 1: //Fetch ID's
                    this.m_Log.Write("nsLycosIMAP.js - notify - Fetch IDS");
                    this.fetchIDs(Item);
                break;
                
                case 2: //Fetch Header
                    this.m_Log.Write("nsLycosIMAP.js - notify - Fetch HEADERs");
                    this.fetchHeaders(Item);
                break;
                
                case 3: //Store Delete
                    this.m_Log.Write("nsLycosIMAP.js - notify - Store Delete");
                    this.storeDelete(Item);
                break;
                
                default:
                    this.m_Log.Write("nsLycosIMAP.js - notify - UNKNOWN COMMAND");
                    this.m_Timer.cancel();
                break;
            }
            
            this.m_Log.Write("nsLycosIMAP.js - notify - END"); 
        }
        catch(err)
        {
            this.m_Timer.cancel();
            this.m_Log.DebugDump("nsLycosIMAP.js: notify : Exception : " 
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
            this.m_Log.Write("nsLycosIMAP.js - copy - START");
            this.m_Log.Write("nsLycosIMAP.js - copy - range " + szRange + " destination " + szDestination);
                       
            //check destination
            var oHref = {value:null};
            var oUID = {value:null};
            var oMSGCount = {value:null};
            var oUnreadCount = {value:null}
            var bDestFolder = this.m_oFolder.getFolderDetails(this.m_szUserName, szDestination, oHref, oUID, oMSGCount, oUnreadCount);
            
            if (!bDestFolder) //destination not found
            {
                this.m_Log.Write("nsLycosIMAP.js - copy - destination folder doesn't exist");
                this.serverComms(this.m_iTag +" NO [TRYCREATE] error\r\n");
                return false;
            }
            this.m_copyDest = oHref.value;
            
            this.m_Log.Write("nsLycosIMAP.js - copy - destination  folder" + this.m_copyDest);
            
            //construct MSG range
            delete this.m_aRawData;
            this.m_aRawData = this.range(szRange);
            this.m_Log.Write("nsLycosIMAP.js - copy - Range " +this.m_aRawData);
        
            if (this.m_aRawData.length== 0)
            {
                this.m_Log.Write("nsLycosIMAP.js - copy - no messages to move");
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
                this.m_Log.Write("nsLycosIMAP.js - copy - message not found");
                this.serverComms(this.m_iTag +" NO copy no messages\r\n");
                return false;
            }
             
            
            var szMSGID = oHref.value.match(/[^\/]+$/);
            this.m_Log.Write("nsLycosIMAP.js - copy - destination URI" + this.m_copyDest + szMSGID);
        
            this.m_HttpComms.setURI(oHref.value);
            this.m_HttpComms.setRequestMethod("MOVE");
            this.m_HttpComms.addRequestHeader("Destination", this.m_copyDest + szMSGID , false);
            var bResult = this.m_HttpComms.send(this.copyOnloadHandler, this);                             
            if (!bResult) throw new Error("httpConnection returned false");  
                     
            this.m_Log.Write("nsLycosIMAP.js - copy - END");
            return true;
        }
        catch(err)
        {
            this.m_Log.DebugDump("nsLycosIMAP.js: copy : Exception : "
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
            mainObject.m_Log.Write("nsLycosIMAP.js - copyOnloadHandler - START");
            mainObject.m_Log.Write("nsLycosIMAP.js - copyOnloadHandler : \n" + szResponse);
            mainObject.m_Log.Write("nsLycosIMAP.js - copyOnloadHandler : " + mainObject.m_iStage);  
            
            var httpChannel = event.QueryInterface(Components.interfaces.nsIHttpChannel);
            
            //if this fails we've gone somewhere new
            mainObject.m_Log.Write("nsLycos - copyOnloadHandler - status :" +httpChannel.responseStatus );
            if (httpChannel.responseStatus != 200 && httpChannel.responseStatus != 201) 
                throw new Error("return status " + httpChannel.responseStatus);
             
            if (mainObject.m_aRawData.length>0)
            {
                mainObject.m_Log.Write("nsLycosIMAP.js - copyOnloadHandler - next - ");
                
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
                mainObject.m_Log.Write("nsLycosIMAP.js - copy - destination URI" + mainObject.m_copyDest + szMSGID);

                mainObject.m_HttpComms.setURI(oHref.value);
                mainObject.m_HttpComms.setRequestMethod("MOVE");
                mainObject.m_HttpComms.addRequestHeader("Destination", mainObject.m_copyDest + szMSGID, false);
                var bResult = mainObject.m_HttpComms.send(mainObject.copyOnloadHandler, mainObject);                             
                if (!bResult) throw new Error("httpConnection returned false");  
               
                mainObject.m_iStage ++;
            }
            else
            {     
                mainObject.m_Log.Write("nsLycosIMAP.js - copyOnloadHandler - done - ");       
                //reset copy data 
                mainObject.m_copyDest = null;
                mainObject.serverComms(mainObject.m_iTag +" OK COPY complete\r\n");
            }
            
          
            mainObject.m_Log.Write("nsLycosIMAP.js - copyOnloadHandler - END");
            return true;
        }
        catch(err)
        {
            mainObject.m_Log.DebugDump("nsLycosIMAP.js: copyloadHandler : Exception : "
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
            this.m_Log.Write("nsLycosIMAP.js - createFolder - START");
            this.m_Log.Write("nsLycosIMAP.js - createFolder - folder " + szFolder);
            
            //check level
            var aszLevel = szFolder.split(".");
            if (aszLevel.length!=2)
            {
                this.serverComms(this.m_iTag +" NO too low level\r\n");
                this.m_Log.Write("nsLycosIMAP.js - createFolder - folder too low");
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
                     this.m_Log.Write("nsLycosIMAP.js - createFolder - exists");
                }
            }
            
            this.m_Log.Write("nsLycosIMAP.js - createFolder - END");   
        }
        catch(err)
        {
            this.m_Log.DebugDump("nsLycosIMAP.js: createFolder : Exception : "
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
            mainObject.m_Log.Write("nsLycosIMAP.js - createFolderOnloadHandler - START");
            mainObject.m_Log.Write("nsLycosIMAP.js - createFolderOnloadHandler - " + szResponse);
            
            var httpChannel = event.QueryInterface(Components.interfaces.nsIHttpChannel);
            
            //if this fails we've gone somewhere new
            mainObject.m_Log.Write("nsLycos - createFolderOnloadHandler - status :" +httpChannel.responseStatus );
            if (httpChannel.responseStatus != 200 && httpChannel.responseStatus != 201) 
                throw new Error("return status " + httpChannel.responseStatus);
            
            switch(mainObject.m_iStage)
            {
                case 0: //create done now get folder list
                    mainObject.m_Log.Write("nsLycosIMAP.js - createFolderOnloadHandler - get folder list - START");
                    mainObject.m_HttpComms.setContentType("text/xml");
                    mainObject.m_HttpComms.setRequestMethod("PROPFIND");
                    mainObject.m_HttpComms.addData(LycosFolderIMAPSchema);
                    mainObject.m_HttpComms.setURI(mainObject.m_szFolderURI);
                    var bResult = mainObject.m_HttpComms.send(mainObject.listOnloadHandler, mainObject);                             
                    if (!bResult) throw new Error("httpConnection returned false");
                    mainObject.m_Log.Write("nsLycosIMAP.js - createFolderOnloadHandler - get folder list - END");               
                break;
                
                
                case 1:  //add new folder details
                    mainObject.m_Log.Write("nsLycosIMAP.js - createFolderOnloadHandler - new folder details - START");
                
                    var aszResponses = szResponse.match(LycosIMAPResponse);
                    mainObject.m_Log.Write("nsLycosIMAP.js - createFolderOnloadHandler - folders - \n" + aszResponses);
                    for (i=0; i<aszResponses.length; i++)
                    {
                        mainObject.processFolder(aszResponses[i]);    
                    }
                    
                    var szMsg = mainObject.m_iTag +" OK CREATE complete\r\n"
                    mainObject.serverComms(szMsg);  
                    mainObject.m_szFolderName = null;
                    mainObject.m_Log.Write("nsLycosIMAP.js - createFolderOnloadHandler - new folder details - END");
                break;
            }
            
            
           
            mainObject.m_Log.Write("nsLycosIMAP.js - createFolderOnloadHandler - END");
            return true;
        }
        catch(err)
        {
            mainObject.m_Log.DebugDump("nsLycosIMAP.js: createFolderOnloadHandler : Exception : "
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
            this.m_Log.Write("nsLycosIMAP.js - deleteFolder - START");
            this.m_Log.Write("nsLycosIMAP.js - deleteFolder - folder " + szFolder);
            
            var oHref = {value:null};
            var oUID = {value:null};
            var oMSGCount = {value:null};
            var oUnreadCount = {value:null};
            if (this.m_oFolder.getFolderDetails(this.m_szUserName, szFolder , oHref , oUID, oMSGCount, oUnreadCount))
            {
                this.m_Log.Write("nsLycosIMAP.js - deleteFolder - oHref.value " + oHref.value);
                this.m_szFolderName = szFolder;  
                this.m_HttpComms.setURI(oHref.value);
                this.m_HttpComms.setRequestMethod("DELETE");
                var bResult = this.m_HttpComms.send(this.deleteFolderOnloadHandler, this);                             
                if (!bResult) throw new Error("httpConnection returned false");
            }
            else
                this.serverComms(this.m_iTag +" NO deleteFolder not supported\r\n");

            this.m_Log.Write("nsLycosIMAP.js - deleteFolder - END");   
        }
        catch(err)
        {
            this.m_Log.DebugDump("nsLycosIMAP.js: deleteFolder : Exception : "
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
            mainObject.m_Log.Write("nsLycosIMAP.js - deleteFolderOnloadHandler - START");
            
            var httpChannel = event.QueryInterface(Components.interfaces.nsIHttpChannel);
            
            //if this fails we've gone somewhere new
            mainObject.m_Log.Write("nsLycos - deleteFolderOnloadHandler - status :" +httpChannel.responseStatus );
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
            mainObject.m_Log.Write("nsLycosIMAP.js - deleteFolderOnloadHandler - END");
            return true;
        }
        catch(err)
        {
            mainObject.m_Log.DebugDump("nsLycosIMAP.js: deleteFolderOnloadHandler : Exception : "
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
            this.m_Log.Write("nsLycosIMAP.js - renameFolder - START");
            this.m_Log.Write("nsLycosIMAP.js - renameFolder - oldfolder " + szOldFolder + " newFolder "+ szNewFolder);
           
            //check for new name
            var oHref = {value:null};
            var oUID = {value:null};
            var oMSGCount = {value:null};
            var oUnreadCount = {value:null};
            if (!this.m_oFolder.getFolderDetails(this.m_szUserName, szNewFolder , oHref , oUID, oMSGCount, oUnreadCount))
            {
                this.m_szFolderName = szOldFolder;
                var szOldFolderName = this.m_szFolderName.split(".")[1];
                this.m_Log.Write("nsLycosIMAP.js - renameFolder - szOldFolder " + szOldFolderName);
             
                this.m_szFolderNewName = szNewFolder;  
                var szNewFolderName = this.m_szFolderNewName.split(".")[1];
                this.m_Log.Write("nsLycosIMAP.js - renameFolder - szNewFolder " + szNewFolderName);
                
                //get details of old folder 
                this.m_oFolder.getFolderDetails(this.m_szUserName, this.m_szFolderName , oHref , oUID, oMSGCount, oUnreadCount);
                this.m_Log.Write("nsLycosIMAP.js - renameFolder - oHref.value " + oHref.value);
                var szNewFolderURI = oHref.value.replace(szOldFolderName, szNewFolderName);
                this.m_Log.Write("nsLycosIMAP.js - renameFolder - szNewFolderURI " + szNewFolderURI);
                this.m_szFolderReference = szNewFolderURI;
               
                this.m_HttpComms.setURI(oHref.value);
                this.m_HttpComms.setRequestMethod("MOVE");           
                this.m_HttpComms.addRequestHeader("Destination", szNewFolderURI , false);
                var bResult = this.m_HttpComms.send(this.renameFolderOnloadHandler, this);                             
                if (!bResult) throw new Error("httpConnection returned false");
            }
            else
                this.serverComms(this.m_iTag +" NO renameFolder found\r\n");
                
            this.m_Log.Write("nsLycosIMAP.js - renameFolder - END");   
        }
        catch(err)
        {
            this.m_Log.DebugDump("nsLycosIMAP.js: renameFolder : Exception : "
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
            mainObject.m_Log.Write("nsLycosIMAP.js - renameFolderOnloadHandler - START");
            mainObject.m_Log.Write("nsLycosIMAP.js - renameFolderOnloadHandler - \n" + szResponse);
                       
            //if this fails we've gone somewhere new
            var httpChannel = event.QueryInterface(Components.interfaces.nsIHttpChannel);
            mainObject.m_Log.Write("nsLycos - renameOnloadHandler - status :" +httpChannel.responseStatus );
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
            mainObject.m_Log.Write("nsLycosIMAP.js - renameFolderOnloadHandler - END");
            return true;
        }
        catch(err)
        {
            mainObject.m_Log.DebugDump("nsLycosIMAP.js: renameFolderOnloadHandler : Exception : "
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
            this.m_Log.Write("nsLycosIMAP.js - range - START");
            this.m_Log.Write("nsLycosIMAP.js - range - szRange " + szRange);
            
            var aTempRange = szRange.split(",");
            this.m_Log.Write("nsLycosIMAP.js - range - aTempRange " +aTempRange);
            
            var aRange = new Array();
            for (var i=0; i<aTempRange.length; i++)
            {
                if (aTempRange[i].search(/\:/)!=-1)
                {
                    this.m_Log.Write("nsLycosIMAP.js - range - found range");
                    
                    var aWildCardTemp = aTempRange[i].split(/\:/);  
                    this.m_Log.Write("nsLycosIMAP.js - range - aWildCardTemp "+aWildCardTemp);
                    var min = aWildCardTemp[0];
                    var max = -1;
                    if (aWildCardTemp[1].search(/\d/)!=-1) max = aWildCardTemp[1];
                    this.m_Log.Write("nsLycosIMAP.js - range - min " + min + " max " +max );
                       
                    var aiUIDS = {value : null};
                    var iUIDS = {value : null }; 
                    this.m_oFolder.getMSGUIDS(this.m_szUserName, this.m_szSelectFolder , iUIDS , aiUIDS);
                    this.m_Log.Write("nsLycosIMAP.js - range - aiUIDS "+aiUIDS.value);
                    
                    for (var j=0; j<aiUIDS.value.length; j++)
                    {
                        this.m_Log.Write("nsLycosIMAP.js - range - aiUIDS.value[j] "+aiUIDS.value[j]);
                        
                        if (min <=aiUIDS.value[j] && (max >= aiUIDS.value[j] || max ==-1) )
                        {
                            aRange.push( aiUIDS.value[j]);
                            this.m_Log.Write("nsLycosIMAP.js - range - aiUIDS.value[j] - ADDED");
                        }    
                    }
                }
                else
                    aRange.push( aTempRange[i]);    
            }
            
            this.m_Log.Write("nsLycosIMAP.js - range - aRange "+ aRange);           
            this.m_Log.Write("nsLycosIMAP.js - range - END");    
            return aRange;
        }
        catch(err)
        {
            this.m_Log.DebugDump("nsLycosIMAP.js: range : Exception : "
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
            this.m_Log.Write("nsLycosIMAP.js - logOUT - START");
            
            this.m_bAuthorised = false;
            var szResponse = "* BYE IMAP4rev1 Server logout\r\n";
            szResponse += this.m_iTag +" OK Logout Completed\r\n"
            this.serverComms(szResponse);                 
            
            this.m_Log.Write("nsLycosIMAP.js - logOUT - END");
            return true;
        }
        catch(e)
        {
            this.m_Log.DebugDump("nsLycosIMAP.js: logOUT : Exception : "
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
            this.m_Log.Write("nsLycosIMAP.js - close - START");
            this.serverComms(this.m_iTag +" OK CLOSE complete\r\n");
            this.m_Log.Write("nsLycosIMAP.js - close - END");   
        }
        catch(err)
        {
            this.m_Log.DebugDump("nsLycosIMAP.js: close : Exception : "
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
            this.m_Log.Write("nsLycosIMAP.js - check - START");
            this.serverComms(this.m_iTag +" OK CHECK complete\r\n");
            this.m_Log.Write("nsLycosIMAP.js - check - END");   
        }
        catch(err)
        {
            this.m_Log.DebugDump("nsLycosIMAP.js: check : Exception : "
                                              + err.name 
                                              + ".\nError message: " 
                                              + err.message);
            
            this.serverComms(this.m_iTag +" BAD error\r\n");
            return false;
        }
    },
    
    
    
    noop : function ()
    {
        try
        {
            this.m_Log.Write("nsLycosIMAP.js - noop - START");
            this.serverComms(this.m_iTag +" OK NOOP complete\r\n");
            this.m_Log.Write("nsLycosIMAP.js - noop - END");   
        }
        catch(err)
        {
            this.m_Log.DebugDump("nsLycosIMAP.js: noop : Exception : "
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
            this.m_Log.Write("nsLycosIMAP.js - expunge - START");
            this.serverComms(this.m_iTag +" NO expunge\r\n");
            this.m_Log.Write("nsLycosIMAP.js - expunge - END");  
        }
        catch(err)
        {
            this.m_Log.DebugDump("nsLycosIMAP.js: expunge : Exception : "
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
            this.m_Log.Write("nsLycosIMAP.js - examine - START");
            this.serverComms(this.m_iTag +" NO expunge\r\n");
            this.m_Log.Write("nsLycosIMAP.js - examine - END");  
        }
        catch(err)
        {
            this.m_Log.DebugDump("nsLycosIMAP.js: examine : Exception : "
                                              + err.name 
                                              + ".\nError message: " 
                                              + err.message+ "\n"
                                              + err.lineNumber);
            
            this.serverComms(this.m_iTag +" BAD error\r\n");
            return false;
        }
    },
    
    
     /*******************************Server Comms  ****************************/
    
    serverComms : function (szMsg)
    {
        try
        { 
            this.m_Log.Write("nsLycosIMAP.js - serverComms - START");
            this.m_Log.Write("nsLycosIMAP.js - serverComms msg " + szMsg);
            var iCount = this.m_oResponseStream.write(szMsg,szMsg.length);
            this.m_Log.Write("nsLycosIMAP.js - serverComms sent count: " + iCount
                                                        +" msg length: " +szMsg.length);
            this.m_Log.Write("nsLycosIMAP.js - serverComms - END");
        }
        catch(e)
        {
            this.m_Log.DebugDump("nsLycos.js: serverComms : Exception : " 
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
var nsLycosIMAPFactory = new Object();

nsLycosIMAPFactory.createInstance = function (outer, iid)
{
    if (outer != null) throw Components.results.NS_ERROR_NO_AGGREGATION;
    
    if (!iid.equals(nsLycosIMAPClassID) && !iid.equals(Components.interfaces.nsISupports))
        throw Components.results.NS_ERROR_INVALID_ARG;
    
    return new nsLycosIMAP();
}


/******************************************************************************/
/* MODULE */
var nsLycosIMAPModule = new Object();

nsLycosIMAPModule.registerSelf = function(compMgr, fileSpec, location, type)
{
    compMgr = compMgr.QueryInterface(Components.interfaces.nsIComponentRegistrar);
    compMgr.registerFactoryLocation(nsLycosIMAPClassID,
                                    "LycosIMAPComponent",
                                    nsLycosIMAPContactID, 
                                    fileSpec,
                                    location, 
                                    type);
}


nsLycosIMAPModule.unregisterSelf = function(aCompMgr, aFileSpec, aLocation)
{
    aCompMgr = aCompMgr.QueryInterface(Components.interfaces.nsIComponentRegistrar);
    aCompMgr.unregisterFactoryLocation(nsLycosIMAPClassID, aFileSpec);
}

 
nsLycosIMAPModule.getClassObject = function(compMgr, cid, iid)
{
    if (!cid.equals(nsLycosIMAPClassID))
        throw Components.results.NS_ERROR_NO_INTERFACE;

    if (!iid.equals(Components.interfaces.nsIFactory))
        throw Components.results.NS_ERROR_NOT_IMPLEMENTED;

    return nsLycosIMAPFactory;
}


nsLycosIMAPModule.canUnload = function(compMgr)
{
    return true;
}
/******************************************************************************/


function NSGetModule(compMgr, fileSpec)
{
    return nsLycosIMAPModule; 
}
