function YahooFolderBeta(oLog)
{
    try
    {
        var scriptLoader =  Components.classes["@mozilla.org/moz/jssubscript-loader;1"]
                                      .getService(Components.interfaces.mozIJSSubScriptLoader);
        scriptLoader.loadSubScript("chrome://web-mail/content/common/DebugLog.js");
        scriptLoader.loadSubScript("chrome://web-mail/content/common/HttpComms3.js");
        scriptLoader.loadSubScript("chrome://web-mail/content/common/CommonPrefs.js");

        this.m_Log = oLog;
        this.m_Log.Write("YahooFolderBeta.js - Constructor - START");

        if (typeof kYahooConstants == "undefined")
        {
            this.m_Log.Write("YahooFolderBeta.js - Constructor - loading constants");
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
        this.m_szWssid = null;

        this.m_Log.Write("YahooFolderBeta.js - Constructor - END");
    }
    catch(e)
    {
        this.m_Log.Write("YahooFolderBeta.js: Constructor : Exception : "
                                      + e.name
                                      + ".\nError message: "
                                      + e.message+ "\n"
                                      + e.lineNumber);
    }
}



YahooFolderBeta.prototype =
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
            this.m_Log.Write("YahooFolderBeta.js - donwloadFolderList - START");
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

            this.m_Log.Write("YahooFolderBeta.js - donwloadFolderList - default " +this.m_szYahooMail);
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
                this.m_Log.Write("YahooFolderBeta.js - donwloadFolderList - Getting Session Data");
                this.m_szHomeURI = this.m_ComponentManager.findElement(this.m_szUserName, "szHomeURI");
                this.m_Log.Write("YahooFolderBeta - donwloadFolderList - m_szLocation " +this.m_szHomeURI);
                if (this.m_szHomeURI)
                {
                    this.m_Log.Write("YahooFolderBeta.js - donwloadFolderList - Session Data Found");
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

            if (!this.m_szHomeURI && !this.m_szPassWord)  return -3; //no session data and no password

            this.m_HttpComms.setRequestMethod("GET");
            var bResult = this.m_HttpComms.send(this.downloadOnloadHandler, this);
            if (!bResult) throw new Error("httpConnection returned false");
            this.m_Log.Write("YahooFolderBeta.js - donwloadFolderList - END");
            return 1;
        }
        catch(e)
        {
            this.m_Log.DebugDump("YahooFolderBeta.js: donwloadFolderList : Exception : "
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
            mainObject.m_Log.Write("YahooFolderBeta.js - downloadOnloadHandler - START");
            mainObject.m_Log.Write("YahooFolderBeta.js - downloadOnloadHandler : Stage " + mainObject.m_iStage);
            mainObject.m_Log.Write("YahooFolderBeta.js - downloadOnloadHandler : canceled " + mainObject.m_bCancel);

            if (mainObject.m_bCancel) throw new Error("canceled");

            var httpChannel = event.QueryInterface(Components.interfaces.nsIHttpChannel);
            //if this fails we've gone somewhere new
            mainObject.m_Log.Write("YahooFolderBeta.js - downloadOnloadHandler - status :" +httpChannel.responseStatus );
            if (httpChannel.responseStatus != 200)
                throw new Error("return status " + httpChannel.responseStatus);

            //page code
            switch (mainObject.m_iStage)
            {
                case 0: // login page
                    var aLoginForm = szResponse.match(patternYahooLoginForm);
                    if (aLoginForm == null)
                         throw new Error("error parsing yahoo login web page");
                    mainObject.m_Log.Write("YahooPOPClassic.js - downloadOnloadHandler - loginForm " + aLoginForm);


                    var szLoginURL = aLoginForm[0].match(patternYahooAction)[1];
                    mainObject.m_Log.Write("YahooPOPClassic.js - downloadOnloadHandler - loginURL " + szLoginURL);

                    var aLoginData = aLoginForm[0].match(patternYahooInput);
                    mainObject.m_Log.Write("YahooPOPClassic.js - downloadOnloadHandler - loginData " + aLoginData);

                    for (i=0; i<aLoginData.length; i++)
                    {
                        var szName=aLoginData[i].match(patternYahooClassicName)[1];
                        szName = szName.replace(/^\s*|\s*$/gm,"");
                        mainObject.m_Log.Write("YahooPOPClassic.js - downloadOnloadHandler - loginData name " + szName);

                        var szValue = aLoginData[i].match(patternYahooClassicValue)[1];
                        szValue = szValue.replace(/^\s*|\s*$/gm,"");
                        mainObject.m_Log.Write("YahooPOPClassic.js - downloadOnloadHandler - loginData value " + szValue);

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
                    mainObject.m_Log.Write("YahooFolderBeta.js - downloadOnloadHandler - login redirect " + aLoginRedirect);

                    var szLocation = aLoginRedirect[1];

                    mainObject.m_HttpComms.setURI(szLocation);
                    mainObject.m_HttpComms.setRequestMethod("GET");
                    var bResult = mainObject.m_HttpComms.send(mainObject.downloadOnloadHandler, mainObject);
                    if (!bResult) throw new Error("httpConnection returned false");
                    mainObject.m_iStage++;
                break;

                case 2: //mail box
                    var szLocation  = httpChannel.URI.spec;
                    mainObject.m_Log.Write("YahooFoldersBETA.js - downloadOnloadHandler - page check : " + szLocation );

                    if (szResponse.search(kPatternLogOut)== -1)
                    {
                        mainObject.m_Log.Write("YahooFoldersBETA.js - downloadOnloadHandler - logout not found");
                        //check for bounce
                        if (szResponse.search(kPatternBTBounce)!= -1 && !mainObject.m_bReEntry)
                        {
                            var szRedirect = szResponse.match(kPatternBTBounce)[1];
                            mainObject.m_Log.Write("YahooFoldersBETA.js - downloadOnloadHandler - szRedirect: " + szRedirect );
                            if (!mainObject.m_HttpComms.setURI(szRedirect))
                                mainObject.m_HttpComms.setURI(szLocation + szRedirect);
                            mainObject.m_HttpComms.setRequestMethod("GET");
                            var bResult = mainObject.m_HttpComms.send(mainObject.downloadOnloadHandler, mainObject);
                            if (!bResult) throw new Error("httpConnection returned false");
                            return;
                        }
                        else if (mainObject.m_bReEntry)
                        {
                            //clean and start again
                            mainObject.m_ComponentManager.deleteAllElements(mainObject.m_szUserName);

                            var oCookies = Components.classes["@mozilla.org/nsWebMailCookieManager2;1"]
                                                     .getService(Components.interfaces.nsIWebMailCookieManager2);
                            oCookies.removeCookie(mainObject.m_szUserName);

                            mainObject.m_bReEntry = false;
                            mainObject.m_iStage = 0;
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

                    //get wssid
                    mainObject.m_szWssid = szResponse.match(kPatternWssid)[1];
                    mainObject.m_Log.Write("YahooFoldersBETA.js - downloadOnloadHandler - m_szWssid : "+mainObject.m_szWssid );

                    mainObject.m_szLocationURI = httpChannel.URI.prePath ;
                    mainObject.m_Log.Write("YahooFoldersBETA.js - downloadOnloadHandler - m_szLocationURI : "+mainObject.m_szLocationURI );

                    mainObject.m_iStage++;
                    var szURI = mainObject.m_szLocationURI + "/ws/mail/v1/soap?appid=YahooMailRC&m=ListFolders&wssid="+mainObject.m_szWssid;
                    mainObject.m_Log.Write("YahooFoldersBETA.js - downloadOnloadHandler - szURI " + szURI);
                    mainObject.m_HttpComms.setURI(szURI);
                    mainObject.m_HttpComms.setRequestMethod("POST");
                    mainObject.m_HttpComms.setContentType("application/xml");
                    mainObject.m_HttpComms.addData(kListFolders);
                    var bResult = mainObject.m_HttpComms.send(mainObject.downloadOnloadHandler, mainObject);
                    if (!bResult) throw new Error("httpConnection returned false");
                break;


                case 3:// folder list
                    var szFolderResponse = szResponse.match(kPatternFolderResponse)[1];
                    mainObject.m_Log.Write("YahooFoldersBETA.js - downloadOnloadHandler - szFolderResponse : "+szFolderResponse);

                    var aszFolders = szFolderResponse.match(kPatternFolderData);
                    mainObject.m_Log.Write("YahooFoldersBETA.js - downloadOnloadHandler - aszFolders : "+aszFolders);

                    mainObject.m_ComponentManager.addElement(mainObject.m_szUserName, "szHomeURI", mainObject.m_szHomeURI);

                    var aszFolderList = new Array();
                    for (i=0; i<aszFolders.length; i++)
                    {
                        var szBox = decodeURIComponent(aszFolders[i].match(kPatternFolderID)[1]);
                        mainObject.m_Log.Write("YahooFolderBeta.js - downloadOnloadHandler - szBox : "+szBox );
                        aszFolderList.push(szBox);
                    }

                    mainObject.m_callback(aszFolderList, mainObject.m_parent);
                break;
            };

            mainObject.m_Log.Write("YahooFolderBeta.js - downloadOnloadHandler - END");
        }
        catch(err)
        {
            mainObject.m_ComponentManager.deleteAllElements(mainObject.m_szUserName);

            var oCookies = Components.classes["@mozilla.org/nsWebMailCookieManager2;1"]
                                     .getService(Components.interfaces.nsIWebMailCookieManager2);
            oCookies.removeCookie(mainObject.m_szUserName);

            mainObject.m_Log.DebugDump("YahooFolderBeta.js: loginHandler : Exception : "
                                          + err.name
                                          + ".\nError message: "
                                          + err.message + "\n"
                                          + err.lineNumber);
            mainObject.m_bCancel = true;
            mainObject.m_callback(null, mainObject.m_parent);
        }
    }
}