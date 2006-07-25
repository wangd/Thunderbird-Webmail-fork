/******************************  Yahoo BETA ***************************************/
function YahooSMTPBETA(oResponseStream, oLog, oPref)
{
    try
    {       
        var scriptLoader =  Components.classes["@mozilla.org/moz/jssubscript-loader;1"];
        scriptLoader = scriptLoader.getService(Components.interfaces.mozIJSSubScriptLoader);
        
        scriptLoader.loadSubScript("chrome://web-mail/content/common/DebugLog.js");
        scriptLoader.loadSubScript("chrome://web-mail/content/common/CommonPrefs.js");
        scriptLoader.loadSubScript("chrome://web-mail/content/common/Email.js");
        scriptLoader.loadSubScript("chrome://web-mail/content/common/HttpComms2.js");
        scriptLoader.loadSubScript("chrome://yahoo/content/Yahoo-Prefs-Accounts-Data.js");
        
        this.m_Log = oLog; 
        this.m_Log.Write("YahooSMTPBETA.js - Constructor - START");   
        
        //prefs
        this.m_bReUseSession = oPref.bReUseSession;    //reuse session
        this.m_bSaveCopy = oPref.bSaveSentItem;        // save copy in sent items
        
        //comms
        this.m_oResponseStream = oResponseStream;
        this.m_HttpComms = new HttpComms(this.m_Log);
        
        this.m_bAuthorised = false;
        this.m_szUserName = null;   
        this.m_szPassWord = null;
        this.m_szLoginUserName = null;
        this.m_iStage = 0;
        this.m_szLocationURI = null; 
        this.m_szYahooMail = null;
        this.m_szHomeURI = null;
        this.m_bReEntry = false;
        this.m_aLoginForm = null; 
        this.m_iLoginCount = 0;
        this.m_szImageVerForm = null;
        this.m_szID = null;
        this.m_Email = new email("");
        this.m_Email.decodeBody(true);
        this.m_szData = null;
        this.m_iAttachCount = 0;

        this.m_SessionManager = Components.classes["@mozilla.org/SessionManager;1"]
                                          .getService(Components.interfaces.nsISessionManager);
        this.m_SessionData = null;          
        this.m_Log.Write("YahooSMTPBETA.js - Constructor - END");  
    }
    catch(e)
    {
        DebugDump("YahooSMTPBETA.js: Constructor : Exception : " 
                                      + e.name 
                                      + ".\nError message: " 
                                      + e.message +"\n"
                                      + e.lineNumber);
    }
}



YahooSMTPBETA.prototype =
{
    get userName() {return this.m_szUserName;},
    set userName(userName) {return this.m_szUserName = userName;},
  
    get passWord() {return this.m_szPassWord;},
    set passWord(passWord) {return this.m_szPassWord = passWord;},
    
    get bAuthorised() {return this.m_bAuthorised;},
  
    get ResponseStream() {return this.m_oResponseStream;},
    set ResponseStream(responseStream) {return this.m_oResponseStream = responseStream;},
    
    get to() {return this.m_aszTo;},
    set to(szAddress) {return this.m_aszTo.push(szAddress);},
    
    get from() {return this.m_szFrom;},
    set from(szAddress) {return this.m_szFrom = szAddress;},
    
    
    logIn : function(szUserName, szPassWord)
    {
        try
        {
            this.m_Log.Write("YahooSMTPBETA.js - logIN - START");   
            this.m_Log.Write("YahooSMTPBETA.js - logIN - Username: " + szUserName 
                                                   + " Password: " + szPassWord 
                                                   + " stream: " + this.m_oResponseStream);
           
            if (!szUserName || !szPassWord || !this.m_oResponseStream) return false;
            this.m_szPassWord = szPassWord
            this.m_szUserName =szUserName 
                     
            this.m_szYahooMail = "http://mail.yahoo.com";
            this.m_szLoginUserName = this.m_szUserName;       
            
            if (this.m_szUserName.search(/yahoo/i)!=-1)   
            { //remove domain from user name  
                this.m_szLoginUserName = this.m_szUserName.match(/(.*?)@/)[1].toLowerCase();
            }  
            else if (this.m_szUserName.search(/@talk21.com$/i)!=-1 ||  
                     this.m_szUserName.search(/@btinternet.com$/i)!=-1  ||
                     this.m_szUserName.search(/@btopenworld.com$/i)!=-1 )
            {
                this.m_szYahooMail = "http://bt.yahoo.com/";
            }    
           
        
            this.m_iStage = 0;
            this.m_HttpComms.setURI(this.m_szYahooMail);                    
            this.m_HttpComms.setRequestMethod("GET");
            
            if (this.m_bReUseSession)
            { 
                this.m_Log.Write("YahooSMTPBETA.js - logIN - Getting Session Data");  
                this.m_SessionData = this.m_SessionManager.findSessionData(this.m_szUserName); 
                if (this.m_SessionData)  
                {     
                    this.m_Log.Write("YahooSMTPBETA.js - logIN - Session Data FOUND");
                    this.m_szHomeURI = this.m_SessionData.oComponentData.findElement("szHomeURI");
                    this.m_Log.Write("YahooSMTPBETA.js - logIN - szHomeURI " +this.m_szHomeURI);    
                    if (this.m_szHomeURI)
                    {
                        this.m_Log.Write("YahooSMTPBETA.js - logIN - Session Data Found"); 
                        this.m_iStage =2;
                        this.m_bReEntry = true;
                        this.m_HttpComms.setURI(this.m_szHomeURI);
                    }
                }
            }
            

            var bResult = this.m_HttpComms.send(this.loginOnloadHandler,this);                             
            if (!bResult) throw new Error("httpConnection returned false");  
            
            this.m_Log.Write("YahooSMTPBETA.js - logIN - END");    
            return true;
        }
        catch(e)
        {
            this.m_Log.DebugDump("YahooSMTPBETA.js: logIN : Exception : " 
                                              + e.name + 
                                              ".\nError message: " 
                                              + e.message+ "\n"
                                              + e.lineNumber);
                                              
            this.serverComms("502 negative vibes from "+this.m_szUserName+"\r\n");
            
            return false;
        }
    },

   
    loginOnloadHandler : function(szResponse ,event , mainObject)
    {
        try
        {
            mainObject.m_Log.Write("YahooSMTPBETA.js - loginOnloadHandler - START"); 
            //mainObject.m_Log.Write("YahooSMTPBETA.js - loginOnloadHandler : \n" + szResponse);            
            mainObject.m_Log.Write("YahooSMTPBETA.js - loginOnloadHandler : " + mainObject.m_iStage );  
            
            var httpChannel = event.QueryInterface(Components.interfaces.nsIHttpChannel);
            
            //if this fails we've gone somewhere new
            mainObject.m_Log.Write("YahooSMTPBETA.js - loginOnloadHandler - status :" +httpChannel.responseStatus );
            if (httpChannel.responseStatus != 200) 
                throw new Error("return status " + httpChannel.responseStatus);
            
            
            if (szResponse.search(patternYahooLoginForm)!=-1) 
            {
                if ( mainObject.m_iLoginCount<=3)
                {                    
                    if (szResponse.search(patternYahooLogInSpam)!=-1)
                    {
                        mainObject.m_Log.Write("YahooSMTPBETA.js - loginOnloadHandler - Spam Image found");
                        mainObject.m_iStage =3; //spam image found
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
                    var aLoginForm = szResponse.match(patternYahooLoginForm);
                    if (aLoginForm == null)
                         throw new Error("error parsing yahoo login web page");
                    mainObject.m_Log.Write("YahooSMTPBETA.js - loginOnloadHandler - loginForm " + aLoginForm);
                    
                    var szLoginURL = aLoginForm[0].match(patternYahooAction)[1];
                    mainObject.m_Log.Write("YahooSMTPBETA.js - loginOnloadHandler - loginURL " + szLoginURL);
                    
                    var aLoginData = aLoginForm[0].match(patternYahooInput);
                    mainObject.m_Log.Write("YahooSMTPBETA.js - loginOnloadHandler - loginData " + aLoginData);
                   
                    for (i=0; i<aLoginData.length; i++)
                    {
                        var szName=aLoginData[i].match(patternYahooNameAlt)[1];
                        szName = szName.replace(/"/gm,"");
                        szName = szName.replace(/'/gm,"");
                        mainObject.m_Log.Write("YahooSMTPBETA.js - loginOnloadHandler - loginData name " + szName);
                        
                        var szValue = aLoginData[i].match(patternYahooAltValue)[1]
                        szValue = szValue.replace(/"/gm,"");
                        szValue = szValue.replace(/'/gm,""); 
                        mainObject.m_Log.Write("YahooSMTPBETA.js - loginOnloadHandler - loginData value " + szValue);
                        
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
                    mainObject.m_Log.Write("YahooSMTPBETA.js - loginOnloadHandler - login redirect " + aLoginRedirect);    
                    var szLocation = aLoginRedirect[1];

                    mainObject.m_HttpComms.setURI(szLocation);
                    mainObject.m_HttpComms.setRequestMethod("GET");
                    var bResult = mainObject.m_HttpComms.send(mainObject.loginOnloadHandler, mainObject);
                    if (!bResult) throw new Error("httpConnection returned false");
                    mainObject.m_iStage++;
                break;
            
                case 2: //mail box
                    if (szResponse.search(kPatternLogOut) == -1)
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
                    mainObject.m_szHomeURI = httpChannel.URI.spec;
                    mainObject.m_Log.Write("YahooSMTPBETA.js - loginOnloadHandler - m_szHomeURI : "+mainObject.m_szHomeURI );
                    
                    //get urls for later use
                    mainObject.m_szLocationURI = httpChannel.URI.prePath ;
                    mainObject.m_Log.Write("YahooSMTPBETA.js - loginOnloadHandler - m_szLocationURI : "+mainObject.m_szLocationURI );
            
                     //get wssid
                    mainObject.m_szWssid = szResponse.match(kPatternWssid)[1];
                    mainObject.m_Log.Write("YahooSMTPBETA.js - loginOnloadHandler - m_szWssid : "+mainObject.m_szWssid );                   
                    
                    //get webserviceUrl
                    mainObject.m_szWebserviceUrl = szResponse.match(kPatternWebserviceUrl)[1];                
                    mainObject.m_Log.Write("YahooSMTPBETA.js - loginOnloadHandler - m_szWebserviceUrl : "+mainObject.m_szWebserviceUrl );              
        
                    //server response
                    mainObject.serverComms("235 Your In\r\n");
                    mainObject.m_bAuthorised = true;
                break;
                
                
                
                case 3: //download spam image
                    mainObject.m_aLoginForm = szResponse.match(patternYahooLoginForm);
                    if ( mainObject.m_aLoginForm  == null)
                         throw new Error("error parsing yahoo login web page");
                    mainObject.m_Log.Write("YahooSMTPBETA.js - loginOnloadHandler - loginForm Spam " +  mainObject.m_aLoginForm ); 

                    var szSpamURI = mainObject.m_aLoginForm[0].match(patternYahooSpanURI)[1];  
                    mainObject.m_Log.Write("YahooSMTPBETA.js - loginOnloadHandler - szSpamURI " +  szSpamURI );
              
                    mainObject.m_HttpComms.setURI(szSpamURI);
                    mainObject.m_HttpComms.setRequestMethod("GET");
                    var bResult = mainObject.m_HttpComms.send(mainObject.loginOnloadHandler, mainObject);      
                    if (!bResult) throw new Error("httpConnection returned false");
                    mainObject.m_iStage++;
                break;
                
                
                
                case 4: //send login
                    mainObject.m_Log.Write("YahooSMTPBETA.js - loginOnloadHandler - image download");
                    var szPath = mainObject.writeImageFile(szResponse);
                    mainObject.m_Log.Write("YahooSMTPBETA.js - loginOnloadHandler - imageFile " + szPath);
                    var szResult =  mainObject.openSpamWindow(szPath); 
                    if (!szResult) throw new Error("Spam Handling Error");
                     
                    //construct form 
                    var szLoginURL = mainObject.m_aLoginForm[0].match(patternYahooAction)[1];
                    mainObject.m_Log.Write("YahooSMTPBETA.js - loginOnloadHandler - loginURL " + szLoginURL);
                    
                    var aLoginData = mainObject.m_aLoginForm[0].match(patternYahooLogIn);
                    mainObject.m_Log.Write("YahooSMTPBETA.js - loginOnloadHandler - loginData " + aLoginData);
                   
                    for (i=0; i<aLoginData.length; i++)
                    {
                        var szName=aLoginData[i].match(patternYahooNameAlt)[1];
                        szName = szName.replace(/["|']/gm,"");
                        szName = szName.replace(/^\s*|\s*$/gm,"");
                        mainObject.m_Log.Write("YahooSMTPBETA.js - loginOnloadHandler - loginData name " + szName);
                        
                        var szValue = aLoginData[i].match(patternYahooAltValue)[1];
                        szValue = szValue.replace(/["|']/gm,"");
                        szValue = szValue.replace(/^\s*|\s*$/gm,"");
                        mainObject.m_Log.Write("YahooSMTPBETA.js - loginOnloadHandler - loginData value " + szValue);
                        
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
                      
            mainObject.m_Log.Write("YahooSMTPBETA.js - loginOnloadHandler - END");
        }
        catch(err)
        {
            mainObject.m_Log.DebugDump("nsYahooSMTP.js: loginHandler : Exception : " 
                                          + err.name 
                                          + ".\nError message: " 
                                          + err.message+ "\n"
                                          + err.lineNumber);
                               
            mainObject.serverComms("502 negative vibes from "+mainObject.m_szUserName+"\r\n");
        }
    },
    
    
    rawMSG : function ( szFrom, aszTo, szEmail)
    {
        try
        {
            this.m_Log.Write("YahooSMTPBETA.js - rawMSG - START");   
            this.m_Log.Write("YahooSMTPBETA.js - rawMSG " + szEmail + "\n aszTo " + aszTo + "\n szFrom " +szFrom);

            if (!this.m_Email.parse(szEmail)) throw new Error ("Parse Failed")
            
            //construct email
            var szData = kSendMessge;
            szData = szData.replace(/FROMADDRESS/g,szFrom);   //set from address
            
            //get subject
            var szSubject = this.m_Email.headers.getSubject();
            this.m_Log.Write("YahooSMTPBETA.js - rawMSG - szSubject " + szSubject);
            szData = szData.replace(/EMAILSUBJECT/,szSubject);   //set Subject
            
            //get to
            var szTo = this.m_Email.headers.getTo(); 
            this.m_Log.Write("YahooSMTPBETA.js - rawMSG - szTo " + szTo);
            var aszTempTo = szTo.split(",");
            var szMSGto = "";
            for (var i=0; i<aszTempTo.length; i++)
            {
                szMSGto += "<recipient><addr>" + aszTempTo[i] + "</addr></recipient>";
            }
            szData = szData.replace(/TOADDRESS/,szMSGto);   //set TO Address
             
            //get cc 
            var szCc = "comododragon2003@yahoo.com"//this.m_Email.headers.getCc();
            this.m_Log.Write("YahooSMTPBETA.js - rawMSG - szCc " + szCc);
            if (!szCc)                     
                szData = szData.replace(/<cc>.*?<\/cc>/i,"");   //remove CC     
            else
            {
                var aszTempCC = szCc.split(",");
                var szMSGCC = "";
                for (var i=0; i<aszTempCC.length; i++)
                {
                    szMSGCC += "<recipient><addr>" + aszTempCC[i].replace(/\s*/g,"") + "</addr></recipient>";
                }
                szData = szData.replace(/-CCEMAILADDRESS/,szMSGCC);   //set CC Address
            }   
                
            //get bcc   
            var szBCC = "comododragon2003@yahoo.com";//this.getBcc(aszTo, szTo, szCc);
            this.m_Log.Write("YahooSMTPBETA.js - rawMSG - szBCC " + szBCC);
            if (!szBCC)    
                szData = szData.replace(/<bcc>.*?<\/bcc>/i,"");   //remove BCC 
            else
            {
                var aszTempBCC = szBCC.split(",");
                var szMSGBCC = "";
                for (var i=0; i<aszTempBCC.length-1; i++)
                {
                    szMSGBCC += "<recipient><addr>" + aszTempBCC[i].replace(/\s*/g,"") + "</addr></recipient>";
                }
                szData = szData.replace(/BCCEMAILADDRESS/,szMSGBCC);   //set BCC Address
            }   
            
            
            //get body
            var szMSGBody = "";
            if (this.m_Email.attachments.length>0)                      //add mixed header
                szMSGBody += "<part type=\"multipart\" subtype=\"mixed\">";
            if (this.m_Email.txtBody && this.m_Email.htmlBody)          //add alternative header
                szMSGBody += "<part type=\"multipart\" subtype=\"alternative\">";
            if (this.m_Email.txtBody)                                   //add plain text part
            {
                var szTXTBody = this.m_Email.txtBody.body.getBody(); 
                if (szTXTBody.length==0) szTXTBody = " "                     
                szMSGBody += "<part type=\"text\" subtype=\"plain\"><data>"+szTXTBody+"</data></part>";
            }
            if (this.m_Email.htmlBody)                                  //add HTML part
            {
                var szMsg = this.m_Email.htmlBody.body.getBody();
                szMsg = szMsg.replace(/&/g, "&amp;");
                szMsg = szMsg.replace(/</g,"&lt;");
                szMsg = szMsg.replace(/>/g,"&gt;");
                szMsg = szMsg.replace(/\"/g, "&quot;");              
                szMsg = szMsg.replace(/\s/g, "&nbsp;");
                szMsg = szMsg.replace(/\r/g, "");
                szMsg = szMsg.replace(/\n/g, "");
                szMSGBody += "<part type=\"text\" subtype=\"html\"><data>"+szMsg+"</data></part>";
            }
            if (this.m_Email.txtBody && this.m_Email.htmlBody)
                szMSGBody += "</part>";                         //end of alternative part
            if (this.m_Email.attachments.length>0)
                szMSGBody += "EMAILATTCHMENTS</part>";                 //add attachment place holder
            szData = szData.replace(/EMAILBODY/,szMSGBody);    //set BODY      
            this.m_Log.Write("YahooSMTPBETA.js - rawMSG - szData " + szData);
                
            if (this.m_Email.attachments.length==0) //no attchments
            {
                var szURI = this.m_szLocationURI + "/" + this.m_szWebserviceUrl + "?m=SendMessage&wssid="+this.m_szWssid;
                this.m_iStage = 0 ;
                this.m_HttpComms.setURI(szURI);
                this.m_HttpComms.setRequestMethod("POST");
                this.m_HttpComms.setContentType("application/xml");
                this.m_HttpComms.addData(szData);       
                var bResult = this.m_HttpComms.send(this.composerOnloadHandler, this);  
                if (!bResult) throw new Error("httpConnection returned false");
            }
            else
            {   //get attachment download form
                this.m_szData = szData;
                var q=Math.floor(new Date().getTime()/4);
                var E=Math.floor(Math.random()*4);
                this.m_szID = q.toString()+"_"+E.toString();
                var szURI = this.m_szLocationURI +"/ym/cgattachments?YY=" + Math.floor( Math.random() * 100000000 )+"&id="+this.m_szID;
                this.m_iStage = 1 ;
                this.m_HttpComms.setURI(szURI);
                this.m_HttpComms.setRequestMethod("GET");       
                var bResult = this.m_HttpComms.send(this.composerOnloadHandler, this);  
                if (!bResult) throw new Error("httpConnection returned false");
            }
                
            this.m_Log.Write("YahooSMTPBETA.js - rawMSG - END");    
            return true;
        }
        catch(err)
        {
            this.m_Log.DebugDump("nsYahooSMTP.js: rawMSG : Exception : " 
                                              + err.name + 
                                              ".\nError message: " 
                                              + err.message+ "\n"
                                              + err.lineNumber);
            return false;
        }
    },
    
    
    composerOnloadHandler : function(szResponse ,event , mainObject)
    {
        try
        {
            mainObject.m_Log.Write("YahooSMTPBETA.js - composerOnloadHandler - START"); 
           // mainObject.m_Log.Write("YahooSMTPBETA.js - composerOnloadHandler : \n" + szResponse);
            mainObject.m_Log.Write("YahooSMTPBETA.js - composerOnloadHandler : " + mainObject.m_iStage);  

            var httpChannel = event.QueryInterface(Components.interfaces.nsIHttpChannel);
            
            //if this fails we've gone somewhere new
            mainObject.m_Log.Write("YahooSMTPBETA.js - composerOnloadHandler - status :" +httpChannel.responseStatus );
            if (httpChannel.responseStatus != 200) 
                throw new Error("return status " + httpChannel.responseStatus);

            switch(mainObject.m_iStage)
            {
                case 0:  //MSG sent
                    if (szResponse.search(kPatternSendMSGResponse)!=-1)
                    {
                        mainObject.m_Log.Write("YahooSMTPBETA.js - composerOnloadHandler - SEND OK");
                        if (mainObject.m_bReUseSession)
                        { 
                            mainObject.m_Log.Write("YahooSMTPBETA.js - composerOnloadHandler - Setting Session Data");  
                                
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
                        
                        mainObject.serverComms("250 OK\r\n"); 
                    }
                    else if (szResponse.search(/ymwsHumanVerification:TestRequired/)!=-1)
                    {   
                        mainObject.m_Log.Write("YahooSMTPBETA.js - composerOnloadHandler - Spam Image");
                        
                        //spam image challange
                        var szURL = szResponse.search(kPatternSpamImageURL)[1];
                        mainObject.m_Log.Write("YahooSMTPBETA.js - composerOnloadHandler - szURL" +szURL);
                        
                        mainObject.m_HttpComms.setURI(szURL);
                        mainObject.m_HttpComms.setRequestMethod("GET");
                        var bResult = mainObject.m_HttpComms.send(mainObject.composerOnloadHandler, mainObject);      
                        if (!bResult) throw new Error("httpConnection returned false");
                        mainObject.m_iStage = 3;
                    }
                    else
                    {   //have no idea whats gone wrong
                        mainObject.serverComms("502 Error Sending Email\r\n");
                    }
                break;
                
                case 1: //attachment upload form
                    mainObject.m_Log.Write("YahooSMTPBETA.js - composerOnloadHandler - upload attchement");
                    if (szResponse.search(kPatternAttchUploadForm)==-1)
                        throw new Error("Attchement upload error");
                    mainObject.m_Log.Write("YahooSMTPBETA.js - composerOnloadHandler - mainObject.m_iAttachCount " +mainObject.m_iAttachCount);
                    
                    var szAction = mainObject.m_szLocationURI + "/ym/cgattachments?YY=" + Math.floor( Math.random() * 100000000 );
                    mainObject.m_Log.Write("YahooSMTPBETA.js - composerOnloadHandler - szAction " + szAction);  
                    
                    mainObject.m_HttpComms.addValuePair("_charset_","UTF-8");    //charset
                    
                    //file
                    var oAttach = mainObject.m_Email.attachments[mainObject.m_iAttachCount];
                    var szFileName = oAttach.headers.getContentType(4);
                    if (!szFileName) szFileName = ""; 
                    var szBody = oAttach.body.getBody();
                    mainObject.m_HttpComms.addFile("file", szFileName, szBody); 
                    mainObject.m_Log.Write("YahooSMTPBETA.js - composerOnloadHandler - szFileName " +szFileName);
                   
                    mainObject.m_HttpComms.addValuePair("file_count",mainObject.m_iAttachCount+1);   //file count
                      
                    if (mainObject.m_iAttachCount>0)
                    {
                        mainObject.m_Log.Write("YahooSMTPBETA.js - composerOnloadHandler - ADD previous uploads ");
                        
                        for (var j=0; j<mainObject.m_iAttachCount;j++)
                        {
                            var oAttach = mainObject.m_Email.attachments[j];
                            var szFileName = oAttach.headers.getContentType(4);
                            if (!szFileName) szFileName = ""; 
                            mainObject.m_Log.Write("YahooSMTPBETA.js - composerOnloadHandler - szFileName " +szFileName);
                            var szBody = oAttach.body.getBody();
                            
                            mainObject.m_HttpComms.addValuePair("filename_"+j, szFileName ); 
                            mainObject.m_HttpComms.addValuePair("mime_type_"+j, "application/octet-stream");
                            mainObject.m_HttpComms.addValuePair("byte_size_"+j, szBody.length);
                            mainObject.m_HttpComms.addValuePair("partId_"+j, "");
                            mainObject.m_HttpComms.addValuePair("mid_"+j, "");
                        }
                    }
                    
                    mainObject.m_HttpComms.setContentType("multipart/form-data");
                    mainObject.m_HttpComms.setURI(szAction);                  
                    mainObject.m_HttpComms.setRequestMethod("POST");
                    var bResult = mainObject.m_HttpComms.send(mainObject.composerOnloadHandler,mainObject); 
                    
                    mainObject.m_iAttachCount++;
                    if (mainObject.m_iAttachCount >= mainObject.m_Email.attachments.length)
                        mainObject.m_iStage ++;

                    if (!bResult) throw new Error("httpConnection returned false");
                break;
                
                case 2: //last attchement uploaded  
                    mainObject.m_Log.Write("YahooSMTPBETA.js - composerOnloadHandler - Send MSG");
                    
                    var szMSGBody = "";
                    for (var i=0; i<mainObject.m_Email.attachments.length; i++)
                    {
                        var oAttach = mainObject.m_Email.attachments[i];
                        var szFileName = oAttach.headers.getContentType(4);
                        szFileName = escape(szFileName);
                        szMSGBody += "<part attachment=\"upload://"+szFileName+"\" disposition=\"attachment\"/>";
                    }
                    
                    mainObject.m_szData = mainObject.m_szData.replace(/EMAILATTCHMENTS/,szMSGBody);
                    mainObject.m_Log.Write("YahooSMTPBETA.js - composerOnloadHandler - mainObject.m_szData "+ mainObject.m_szData);
                    
                    var szURI = mainObject.m_szLocationURI + "/" + mainObject.m_szWebserviceUrl + "?m=SendMessage&wssid="+mainObject.m_szWssid;
                    mainObject.m_iStage = 0 ;
                    mainObject.m_HttpComms.setURI(szURI);
                    mainObject.m_HttpComms.setRequestMethod("POST");
                    mainObject.m_HttpComms.setContentType("application/xml");
                    mainObject.m_HttpComms.addData(mainObject.m_szData);       
                    var bResult = mainObject.m_HttpComms.send(mainObject.composerOnloadHandler, mainObject);  
                    if (!bResult) throw new Error("httpConnection returned false");
                break;
                
                
                case 3: //spam image download
                    mainObject.m_Log.Write("YahooSMTPBETA.js - composerOnloadHandler - image download");
                    var szPath = mainObject.writeImageFile(szResponse);
                    mainObject.m_Log.Write("YahooSMTPBETA.js - composerOnloadHandler - imageFile " + szPath);
                    var szResult =  mainObject.openSpamWindow(szPath); 
                    if (!szResult) throw new Error("Spam Handling Error");
                    
                    var szURL = httpChannel.URI.spec;
                    mainObject.m_Log.Write("YahooSMTPBETA.js - composerOnloadHandler - szURL " + szURL);
                    var szGreq = mainObject.m_szData.match(/kPatternGreq/)[1];
                    szGreq += "<ghq>"+szURL+"</ghq>";
                    szGreq += "<gha>"+szResult+"</gha>";
                    mainObject.m_szData = mainObject.m_szData.replace(kPatternGreq,szGreq);
                    
                    var szURI = mainObject.m_szLocationURI + "/" + mainObject.m_szWebserviceUrl + "?m=SendMessage&wssid="+mainObject.m_szWssid;
                    mainObject.m_iStage = 0 ;
                    mainObject.m_HttpComms.setURI(szURI);
                    mainObject.m_HttpComms.setRequestMethod("POST");
                    mainObject.m_HttpComms.setContentType("application/xml");
                    mainObject.m_HttpComms.addData(mainObject.m_szData);       
                    var bResult = mainObject.m_HttpComms.send(mainObject.composerOnloadHandler, mainObject);  
                    if (!bResult) throw new Error("httpConnection returned false");
                break;
            }
                                

            mainObject.m_Log.Write("YahooSMTPBETA.js - composerOnloadHandler - END");
        }
        catch(err)
        {
            mainObject.m_Log.DebugDump("YahooSMTPBETA.js: composerOnloadHandler : Exception : " 
                                          + err.name 
                                          + ".\nError message: " 
                                          + err.message + "\n"
                                          + err.lineNumber);
                                            
            mainObject.serverComms("502 negative vibes from "+mainObject.m_szUserName+"\r\n");
        }
    },
    
    
        
    
    getBcc : function (aszAllToAddresses, szTo,szCc)
    {
        try
        {
            this.m_Log.Write("YahooSMTPBETA.js - getBcc - START");
            if (aszAllToAddresses.length==0) return null;
            this.m_Log.Write("YahooSMTPBETA.js - getBcc - szRcptList " + aszAllToAddresses);  
            
            var szBcc = null;
            var szAddress = null;
            if (szTo) szAddress = szTo;
            if (szCc) szAddress = (szTo ? (szAddress + ","+ szCc) : szCc);
            this.m_Log.Write("YahooSMTPBETA.js - getBcc - szAddress " + szAddress);
           
            if (!szAddress) 
                szBcc = aszAllToAddresses;
            else
            {     
                for (j=0; j<aszAllToAddresses.length; j++)
                {
                    var regExp = new RegExp(aszAllToAddresses[j]);
                    if (szAddress.search(regExp)==-1)
                    {    
                        szBcc? (szBcc += aszAllToAddresses[j]) : (szBcc = aszAllToAddresses[j]);
                        szBcc +=",";
                    }
                }
            }
            this.m_Log.Write("YahooSMTPBETA.js - getBcc szBcc- " + szBcc);           
            this.m_Log.Write("YahooSMTPBETA.js - getBcc - End");
            return szBcc;  
        }
        catch(err)
        {
            this.m_Log.DebugDump("YahooSMTPBETA.js: getBcc : Exception : " 
                                                  + err.name 
                                                  + ".\nError message: " 
                                                  + err.message + "\n"
                                                  + err.lineNumber);
                                                  
            return null;
        }
    },
    
    
    writeImageFile : function(szData)
    {
        try
        {
            this.m_Log.Write("YahooSMTPBETA.js - writeImageFile - End");
            
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
            this.m_Log.Write("YahooSMTPBETA.js - writeImageFile - path " + URL);
            
            this.m_Log.Write("YahooSMTPBETA.js - writeImageFile - End");
            return URL;
        }
        catch(err)
        {
            this.m_Log.DebugDump("YahooSMTPBETA.js: writeImageFile : Exception : " 
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
            this.m_Log.Write("nsYahooSMTP : openWindow - START");
            
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
            this.m_Log.Write("YahooSMTPBETA : openWindow - " + iResult);
            var szResult =  null;
            if (iResult) 
            {
                szResult = params.GetString(0);
                this.m_Log.Write("YahooSMTPBETA : openWindow - " + szResult);
            }
            
            this.m_Log.Write("YahooSMTPBETA : openWindow - END");
            return szResult;
        }
        catch(err)
        {
            this.m_Log.DebugDump("YahooSMTPBETA: Exception in openWindow : " 
                                               + err.name 
                                               + ".\nError message: " 
                                               + err.message + "\n"
                                               + err.lineNumber);
        }
    },
    
    
   
    ////////////////////////////////////////////////////////////////////////////
    /////  Comms                  
    
    serverComms : function (szMsg)
    {
        try
        { 
            this.m_Log.Write("YahooSMTPBETA.js - serverComms - START");
            this.m_Log.Write("YahooSMTPBETA.js - serverComms msg " + szMsg);
            var iCount = this.m_oResponseStream.write(szMsg,szMsg.length);
            this.m_Log.Write("YahooSMTPBETA.js - serverComms sent count: " + iCount 
                                                        +" msg length: " +szMsg.length);
            this.m_Log.Write("YahooSMTPBETA.js - serverComms - END");  
        }
        catch(e)
        {
            this.m_Log.DebugDump("YahooSMTPBETA.js: serverComms : Exception : " 
                                              + e.name 
                                              + ".\nError message: " 
                                              + e.message+ "\n"
                                              + e.lineNumber);
        }
    },
}
