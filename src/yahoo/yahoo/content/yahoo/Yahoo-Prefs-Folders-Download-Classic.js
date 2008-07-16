function YahooFolderClassic(oLog)
{
    try
    {
        var scriptLoader =  Components.classes["@mozilla.org/moz/jssubscript-loader;1"]
                                      .getService(Components.interfaces.mozIJSSubScriptLoader);
        scriptLoader.loadSubScript("chrome://web-mail/content/common/DebugLog.js");
        scriptLoader.loadSubScript("chrome://web-mail/content/common/HttpComms3.js");
        scriptLoader.loadSubScript("chrome://web-mail/content/common/CommonPrefs.js");
        
        this.m_Log = oLog;
        this.m_Log.Write("YahooFolderClassic.js - Constructor - START");

        if (typeof kYahooConstants == "undefined")
        {
            this.m_Log.Write("YahooFolderClassic.js - Constructor - loading constants");
            scriptLoader.loadSubScript("chrome://yahoo/content/Yahoo-Constants.js");
        }

        //login data
        this.m_szUserName = null;
        this.m_szLoginUserName = null;
        this.m_szPassWord = null;
        this.m_ComponentManager = Components.classes["@mozilla.org/ComponentData2;1"]
                                            .getService(Components.interfaces.nsIComponentData2);

        //comms
        this.m_HttpComms = new HttpComms(this.m_Log);
        this.m_HttpComms.setUserAgentOverride(true);
        this.m_iStage =0;
        this.m_bReEntry = false;
        this.m_bCancel  = false;

        this.m_callback = null;
        this.m_parent = null;
        this.m_szLocationURI = null;
        this.m_szHomeURI = null;
        this.m_szYahooMail = null;

        this.m_Log.Write("YahooFolderClassic.js - Constructor - END");
    }
    catch(e)
    {
        this.m_Log.Write("YahooFolderClassic.js: Constructor : Exception : "
                                      + e.name
                                      + ".\nError message: "
                                      + e.message+ "\n"
                                      + e.lineNumber);
    }
}



YahooFolderClassic.prototype =
{
    setUserName : function (szUserName)
    {
        this.m_szUserName = szUserName;  
    },
    
    
    setPassword : function (szPassword)
    {
        this.m_szPassWord = szPassword;
    },
    
    
    cancel : function (bCancel)
    {
        this.m_bCancel =  bCancel; 
    },
    
    // return  0 = error
    //         1 = ok
    //         -2 = no user name
    //         -3 = no password
    donwloadFolderList : function(callback, parent)
    {
        try
        {
            this.m_Log.Write("YahooFolderClassic.js - donwloadFolderList - START");
            if (!this.m_szUserName) return -2;
            
            this.m_callback = callback;
            this.m_parent = parent;
            
            this.m_szYahooMail = "http://mail.yahoo.com";
            this.m_szLoginUserName = this.m_szUserName;

            if (this.m_szUserName.search(/yahoo/i)!=-1)
            {
                if (this.m_szUserName.search(/yahoo\.co\.jp/i)!=-1)
                    this.m_szYahooMail = "http://mail.yahoo.co.jp/";

                //remove domain from user name       
                this.m_szLoginUserName = this.m_szUserName.match(/(.*?)@/)[1].toLowerCase();
            }
            else if (this.m_szUserName.search(/@talk21.com$/i)!=-1 ||
                     this.m_szUserName.search(/@btinternet.com$/i)!=-1  ||
                     this.m_szUserName.search(/@btopenworld.com$/i)!=-1 )
            {
                this.m_szYahooMail = "http://bt.yahoo.com/";
            }

            this.m_Log.Write("YahooFolderClassic.js - donwloadFolderList - default " +this.m_szYahooMail);
            this.m_iStage = 0;
            
            this.m_HttpComms.setUserName(this.m_szUserName);
            this.m_HttpComms.setURI(this.m_szYahooMail);

            //get session data
            var szUserName =  this.m_szUserName.replace(/\./g,"~").toLowerCase();
            var oPref = {Value:null};
            var  WebMailPrefAccess = new WebMailCommonPrefAccess();
            WebMailPrefAccess.Get("bool","yahoo.Account."+szUserName +".bReUseSession",oPref);
            if (oPref.Value == true)
            {
                this.m_Log.Write("YahooFolderClassic.js - donwloadFolderList - Getting Session Data");
                this.m_szHomeURI = this.m_ComponentManager.findElement(this.m_szUserName, "szHomeURI");
                this.m_Log.Write("YahooFolderClassic - donwloadFolderList - m_szLocation " +this.m_szHomeURI);
                if (this.m_szHomeURI)
                {
                    this.m_Log.Write("YahooFolderClassic.js - donwloadFolderList - Session Data Found");
                    this.m_iStage =2;
                    this.m_bReEntry = true;
                    this.m_HttpComms.setURI(this.m_szHomeURI);
                }
                else
                {
                   this.m_ComponentManager.deleteAllElements(this.m_szUserName);
    
                    var oCookies = Components.classes["@mozilla.org/nsWebMailCookieManager2;1"]
                                             .getService(Components.interfaces.nsIWebMailCookieManager2);
                    oCookies.removeCookie(this.m_szUserName);                    
                }           
            }
            else
            {
                this.m_ComponentManager.deleteAllElements(this.m_szUserName);

                var oCookies = Components.classes["@mozilla.org/nsWebMailCookieManager2;1"]
                                         .getService(Components.interfaces.nsIWebMailCookieManager2);
                oCookies.removeCookie(this.m_szUserName);
            }
            
            if (!this.m_szHomeURI && !this.m_szPassWord)  //no session data and no password
            {
                this.m_Log.Write("YahooFolderClassic.js - donwloadFolderList - NO Session Data");
                var ioService = Components.classes["@mozilla.org/network/io-service;1"]
                                          .getService(Components.interfaces.nsIIOService);
                var passwordManager = Components.classes["@mozilla.org/passwordmanager;1"]
                                                .getService(Components.interfaces.nsIPasswordManager);
                var e = passwordManager.enumerator;
                while (e.hasMoreElements()) 
                {
                    try 
                    {
                       var pass = e.getNext().QueryInterface(Components.interfaces.nsIPassword);
                       var user = decodeURIComponent(ioService.newURI(pass.host, null, null).username);
                       this.m_Log.Write("YahooFolderClassic.js - donwloadFolderList - user " + user);
                       
                       var regExp = new RegExp("^"+user+"$","i");
                       if (this.m_szUserName.search(regExp)!=-1) 
                       {
                           this.m_szPassWord = pass.password;
                           this.m_Log.Write("YahooFolderClassic.js - donwloadFolderList - this.m_szPassWord " + this.m_szPassWord);
                       }
                    } 
                    catch (ex) 
                    {                      
                    }
                }
                if (!this.m_szPassWord) return -3; //no password
            }

            this.m_HttpComms.setRequestMethod("GET");
            var bResult = this.m_HttpComms.send(this.downloadOnloadHandler, this);
            if (!bResult) throw new Error("httpConnection returned false");
            this.m_Log.Write("YahooFolderClassic.js - donwloadFolderList - END");
            return 1;
        }
        catch(e)
        {
            this.m_Log.DebugDump("YahooFolderClassic.js: donwloadFolderList : Exception : "
                                              + e.name +
                                              ".\nError message: "
                                              + e.message+ "\n"
                                              + e.lineNumber);
            return 0;
        }
    },




    downloadOnloadHandler : function(szResponse ,event , mainObject)
    {
        try
        {
            mainObject.m_Log.Write("YahooFolderClassic.js - downloadOnloadHandler - START");
            mainObject.m_Log.Write("YahooFolderClassic.js - downloadOnloadHandler : Stage " + mainObject.m_iStage);
            mainObject.m_Log.Write("YahooFolderClassic.js - downloadOnloadHandler : canceled " + mainObject.m_bCancel);
            
            if (mainObject.m_bCancel) throw new Error("canceled");

            var httpChannel = event.QueryInterface(Components.interfaces.nsIHttpChannel);
            //if this fails we've gone somewhere new
            mainObject.m_Log.Write("YahooFolderClassic.js - downloadOnloadHandler - status :" +httpChannel.responseStatus );
            if (httpChannel.responseStatus != 200)
                throw new Error("return status " + httpChannel.responseStatus);

            //page code
            switch (mainObject.m_iStage)
            {
                case 0: // login page
                    var aLoginForm = szResponse.match(patternYahooLoginForm);
                    if (aLoginForm == null)
                         throw new Error("error parsing yahoo login web page");
                    mainObject.m_Log.Write("YahooPOPClassic.js - loginOnloadHandler - loginForm " + aLoginForm);


                    var szLoginURL = aLoginForm[0].match(patternYahooAction)[1];
                    mainObject.m_Log.Write("YahooPOPClassic.js - loginOnloadHandler - loginURL " + szLoginURL);

                    var aLoginData = aLoginForm[0].match(patternYahooInput);
                    mainObject.m_Log.Write("YahooPOPClassic.js - loginOnloadHandler - loginData " + aLoginData);

                    for (i=0; i<aLoginData.length; i++)
                    {
                        var szName=aLoginData[i].match(patternYahooClassicName)[1];
                        szName = szName.replace(/^\s*|\s*$/gm,"");
                        mainObject.m_Log.Write("YahooPOPClassic.js - loginOnloadHandler - loginData name " + szName);

                        var szValue = aLoginData[i].match(patternYahooClassicValue)[1];
                        szValue = szValue.replace(/^\s*|\s*$/gm,"");
                        mainObject.m_Log.Write("YahooPOPClassic.js - loginOnloadHandler - loginData value " + szValue);

                        mainObject.m_HttpComms.addValuePair(szName,(szValue? szValue : ""));
                    }

                    var szLogin = encodeURIComponent(mainObject.m_szLoginUserName);
                    mainObject.m_HttpComms.addValuePair("login", szLogin);

                    var szPass = encodeURIComponent(mainObject.m_szPassWord);
                    mainObject.m_HttpComms.addValuePair("passwd",szPass);

                    mainObject.m_HttpComms.addValuePair(".persistent","y");

                    mainObject.m_HttpComms.setURI(szLoginURL);
                    mainObject.m_HttpComms.setRequestMethod("POST");
                    var bResult = mainObject.m_HttpComms.send(mainObject.downloadOnloadHandler, mainObject);
                    if (!bResult) throw new Error("httpConnection returned false");
                    mainObject.m_iStage++;
                break;

                case 1: //redirect
                    var aLoginRedirect = szResponse.match(patternYahooRedirect);
                    if (aLoginRedirect == null)
                         throw new Error("error parsing yahoo login web page");
                    mainObject.m_Log.Write("YahooFolderClassic.js - downloadOnloadHandler - login redirect " + aLoginRedirect);

                    var szLocation = aLoginRedirect[1];

                    mainObject.m_HttpComms.setURI(szLocation);
                    mainObject.m_HttpComms.setRequestMethod("GET");
                    var bResult = mainObject.m_HttpComms.send(mainObject.downloadOnloadHandler, mainObject);
                    if (!bResult) throw new Error("httpConnection returned false");
                    mainObject.m_iStage++;
                break;

                case 2: //mail box
                    var szLocation  = httpChannel.URI.spec;
                    mainObject.m_Log.Write("YahooFolderClassic.js - downloadOnloadHandler - page check : " + szLocation );
                    if (szResponse.search(patternYahooShowFolder)== -1)
                    {
                        if (szLocation.search(/try_mail/i)!=-1)
                        {
                             mainObject.m_Log.Write("YahooFolderClassic.js - downloadOnloadHandler - try_mail");
                             mainObject.m_HttpComms.addValuePair("newStatus", "1");
                             mainObject.m_HttpComms.setURI(szLocation);
                             mainObject.m_HttpComms.setRequestMethod("POST");
                             var bResult = mainObject.m_HttpComms.send(mainObject.downloadOnloadHandler, mainObject);
                             if (!bResult) throw new Error("httpConnection returned false");
                             return;
                        }
                        else if (mainObject.m_bReEntry)
                        {
                            mainObject.m_Log.Write("YahooFolderClassic.js - downloadOnloadHandler - retrying");
                            mainObject.m_ComponentManager.deleteAllElements(mainObject.m_szUserName);

                            var oCookies = Components.classes["@mozilla.org/nsWebMailCookieManager2;1"]
                                                     .getService(Components.interfaces.nsIWebMailCookieManager2);
                            oCookies.removeCookie(mainObject.m_szUserName);

                            mainObject.m_bReEntry = false;
                            mainObject.m_iStage =0;
                            mainObject.m_HttpComms.setURI(mainObject.m_szYahooMail);
                            mainObject.m_HttpComms.setRequestMethod("GET");
                            var bResult = mainObject.m_HttpComms.send(mainObject.downloadOnloadHandler, mainObject);
                            if (!bResult) throw new Error("httpConnection returned false");
                            return;
                        }
                        else
                            throw new Error("error logging in");
                    }
                    mainObject.m_szHomeURI = szLocation;

                    //get urls for later use
                    mainObject.m_szLocationURI = httpChannel.URI.prePath ;
                    mainObject.m_Log.Write("YahooFolderClassic.js - downloadOnloadHandler - m_szLocationURI : "+mainObject.m_szLocationURI );
                                        
                    var szFolderURL = szResponse.match(PatternYahooFolderURL)[1];
                    mainObject.m_Log.Write("YahooFolderClassic.js - downloadOnloadHandler - szFolderURL : "+szFolderURL );

                    if (!mainObject.m_HttpComms.setURI(szFolderURL)) 
                    {
                        if (szFolderURL.search(/^\//) == -1)
                        {
                            var IOService = Components.classes["@mozilla.org/network/io-service;1"]
                                                      .getService(Components.interfaces.nsIIOService);
                            var nsIURI = IOService.newURI(httpChannel.URI.spec, null, null)
                                                  .QueryInterface(Components.interfaces.nsIURL);
                            var szDirectory = nsIURI.directory
                            mainObject.m_Log.Write("YahooFolderClassic - downloadOnloadHandler - directory : " +szDirectory);
                            
                            szFolderURL = mainObject.m_szLocationURI + szDirectory + szFolderURL
                        }
                        else
                        {
                            szFolderURL = mainObject.m_szLocationURI + szFolderURL
                        }
                        mainObject.m_HttpComms.setURI(szFolderURL);
                    }
                    mainObject.m_HttpComms.setRequestMethod("GET");
                    var bResult = mainObject.m_HttpComms.send(mainObject.downloadOnloadHandler, mainObject);
                    if (!bResult) throw new Error("httpConnection returned false");
                    mainObject.m_iStage++;
                break;


                case 3:// folder list
                    var aszServerFolders = szResponse.match(PatternYahooFolders);
                    if (!aszServerFolders) aszServerFolders = szResponse.match(PatternYahooFoldersAlt);
                    mainObject.m_Log.Write("YahooFolderClassic.js - downloadOnloadHandler - aszServerFolders : "+aszServerFolders);
           
                    this.m_ComponentManager.addElement(this.m_szUserName, "szHomeURI", mainObject.m_szHomeURI);

                    var aszFolderList = new Array();
                    for (i=0; i<aszServerFolders.length; i++)
                    {
                        var szServerFolders = decodeURIComponent(aszServerFolders[i]);
                        var szBox = decodeURIComponent(szServerFolders.match(PatternYahooFolderNameAlt)[1]);
                        mainObject.m_Log.Write("YahooFolderClassic.js - downloadOnloadHandler - szBox : "+szBox );
                        aszFolderList.push(szBox);
                    }
                    mainObject.m_callback(aszFolderList, mainObject.m_parent);
                break;
            };

            mainObject.m_Log.Write("YahooFolderClassic.js - downloadOnloadHandler - END");
        }
        catch(err)
        {
            mainObject.m_ComponentManager.deleteAllElements(mainObject.m_szUserName);

            var oCookies = Components.classes["@mozilla.org/nsWebMailCookieManager2;1"]
                                     .getService(Components.interfaces.nsIWebMailCookieManager2);
            oCookies.removeCookie(mainObject.m_szUserName);

            mainObject.m_Log.DebugDump("YahooFolderClassic.js: loginHandler : Exception : "
                                          + err.name
                                          + ".\nError message: "
                                          + err.message + "\n"
                                          + err.lineNumber);
            mainObject.m_bCancel = true;                              
            mainObject.m_callback(null, mainObject.m_parent);
        }
    }
}