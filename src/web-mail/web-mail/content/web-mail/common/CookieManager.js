function CookieManager()
{
   try
    {
        var scriptLoader =  Components.classes["@mozilla.org/moz/jssubscript-loader;1"];
        scriptLoader = scriptLoader.getService(Components.interfaces.mozIJSSubScriptLoader);
        scriptLoader.loadSubScript("chrome://web-mail/content/common/DebugLog.js");
        scriptLoader.loadSubScript("chrome://web-mail/content/common/Cookie.js");

        var date = new Date();
        var  szLogFileName = "CookieManager Log - " + date.getHours()+
                               "-" + date.getMinutes() +
                               "-"+ date.getUTCMilliseconds() +" -";
        this.m_Log = new DebugLog("webmail.logging.comms", "", szLogFileName);

        this.m_Log.Write("CookieManager.js - Constructor - START");

        this.m_aCookies = new Array();

        this.m_Log.Write("CookieManager.js - Constructor - END");
    }
    catch(e)
    {
         DebugDump("CookieManager.js: Constructor : Exception : "
                                      + e.name
                                      + ".\nError message: "
                                      + e.message + " \n"
                                      + e.lineNumber);
    }
}

CookieManager.prototype =
{

    addCookie : function (url, szCookie)
    {
        try
        {
            this.m_Log.Write("CookieManager.js - addCookie - START");
            this.m_Log.Write("CookieManager.js - addCookie - cookie " + szCookie);
            if (!szCookie) return false;

            var szDefaultDomain = url.prePath.match(/\/\/(.*?)$/)[1];
            this.m_Log.Write("CookieManager.js - addCookie - default domain " + szDefaultDomain);

            //split into rows
            var aszCookie = szCookie.split(/\n/);
            this.m_Log.Write("CookieManager.js - addCookie - cookie rows " + aszCookie);

            //process cookies
            var aTempCookies = new Array();
            for (i=0; i<aszCookie.length; i++)
            {
                var oNewCookie =this.createCookie(aszCookie[i]);
                if (!oNewCookie.getDomain()) oNewCookie.setDomain(szDefaultDomain);

                var bFound = false;
                //update existing cookies
                if (this.m_aCookies.length>0)
                {
                    var szNewCookieDomain = oNewCookie.getDomain();
                    var szNewCookieName = oNewCookie.getName();

                    var j=0;

                    do
                    {
                        this.m_Log.Write("CookieManger.js - addCookie - Update - checking Cookie " + j);
                        var tempCookie = this.m_aCookies[j];
                        var tempDomain = tempCookie.getDomain();
                        if (this.domainCheck(tempDomain,szNewCookieDomain))
                        {
                            this.m_Log.Write("CookieManger.js - addCookie - Update - Domain found")
                            //found domain
                            var tempName = tempCookie.getName();
                            if (this.cookieCheck(tempName,szNewCookieName))
                            {
                                this.m_Log.Write("CookieManger.js - addCookie - Update - Cookie found");
                                //cookie found - update
                                tempCookie.setValue(oNewCookie.getValue());
                                tempCookie.setExpiry(oNewCookie.getExpiry());
                                bFound = true;
                            }
                        }
                        j++;
                    }while(j!=this.m_aCookies.length && !bFound )
                }

                if (bFound)
                {
                    delete oNewCookie;
                    this.m_Log.Write("CookieManger.js - addCookie - Update - deleted");
                }
                else
                {
                    this.m_aCookies.push(oNewCookie);
                    this.m_Log.Write("CookieManger.js - addCookie - Update - saved");
                }
            }

            this.m_Log.Write("CookieManager.js - addCookie - END");
            return true;
        }
        catch(e)
        {
             this.m_Log.Write("CookieManger.js: addCookie : Exception : "
                                          + e.name
                                          + ".\nError message: "
                                          + e.message + " \n"
                                          + e.lineNumber);
        }
    },


    createCookie : function (szCookie)
    {
        try
        {
            this.m_Log.Write("CookieManager.js - createCookie - START");

            var aData = szCookie.split(";");
            this.m_Log.Write("CookieManager.js - createCookie - aData " + aData);

            var szName = null;
            var oCookie = new Cookie();

            //element 0 is the cookie
            var iNameSplit = aData[0].indexOf("=");
            var szName = (aData[0].substr(0, iNameSplit)).replace(/^[\s]+|[\s]+$/,"");
            var szValue = (aData[0].substr(iNameSplit+1)).replace(/^[\s]+|[\s]+$/,"");;
            this.m_Log.Write("CookieManager.js - createCookie data - szName " + szName + " szValue " + szValue);
            oCookie.setName(szName);
            oCookie.setValue(szValue);

            //rest of cookie data
            for (j=1; j<aData.length; j++)
            {
                //split name and value
                iNameSplit = aData[j].indexOf("=");
                szTempName = (aData[j].substr(0, iNameSplit)).replace(/^[\s]+|[\s]+$/,"");
                szTempValue = (aData[j].substr(iNameSplit+1)).replace(/^[\s]+|[\s]+$/,"");
                this.m_Log.Write("CookieManager.js - createCookie ITEM - name : " + szTempName + "  value : " +szTempValue);

                if (szTempName.search(/^domain$/i)!=-1) //get domain
                {
                    szDomain = szTempValue;
                    this.m_Log.Write("CookieManager.js - createCookie - szDomain " + szDomain);
                    oCookie.setDomain(szDomain);
                }
                else if(szTempName.search(/^path$/i)!=-1) //get path
                {
                    szPath = szTempValue;
                    this.m_Log.Write("CookieManager.js - createCookie - szPath " + szPath);
                    oCookie.setPath(szPath);
                }
                else if (szTempName.search(/^expires$/i)!=-1)//get expiry
                {
                    iExpiry = Date.parse(szTempValue.replace(/-/g," "));
                    this.m_Log.Write("CookieManager.js - createCookie - iExpiry " + iExpiry);
                    oCookie.setExpiry(iExpiry);
                }
                else if (szTempName.search(/^secure$/i)!=-1)//get secure
                {
                    bSecure = true;
                    this.m_Log.Write("CookieManager.js - createCookie - bSecure " + bSecure);
                    oCookie.setSecure(bSecure);
                }
                else if (szTempName.search(/^httponly$/i)!=-1)//get httponly
                {
                }
                else if (szTempName.search(/^version$/i)!=-1) //get version
                {
                    this.m_Log.Write("CookieManager.js - createCookie - Version " + szValue);
                    oCookie.setVersion(szValue);
                }
                /*
                else  //should be cookie
                {
                    if (szTempName.length>0)
                    {
                        szName = szTempName;
                        szValue = szTempValue;
                        this.m_Log.Write("CookieManager.js - createCookie data - szName " + szName + " szValue " + szValue);
                        oCookie.setName(szName);
                        oCookie.setValue(szValue);
                    }
                }*/
            }

            this.m_Log.Write("CookieManager.js - createCookie - END");
            return oCookie;
        }
        catch(e)
        {
             this.m_Log.Write("CookieManger.js: createCookie : Exception : "
                                          + e.name
                                          + ".\nError message: "
                                          + e.message + " \n"
                                          + e.lineNumber);
            return null;
        }
    },


    findCookie :  function (url)
    {
        try
        {
            this.m_Log.Write("CookieManger.js - findCookie - START");
            var szDomain = url.prePath.match(/\/\/(.*?)$/)[1]
            this.m_Log.Write("CookieManger.js - findCookie - domain - " + szDomain);

            var szCookies = "";
            var iCookieCount = this.m_aCookies.length
            for (var i=0; i<iCookieCount; i++ )
            {
                var oCookie = this.m_aCookies.shift();
                if (this.domainCheck(oCookie.getDomain(),szDomain))
                {

                    if (this.expiryCheck(oCookie.getExpiry()))
                    {
                        var szName = oCookie.getName();
                        var szValue = oCookie.getValue();
                        this.m_Log.Write("CookieManger.js - findCookie - cookie - found " + szName + " " + szValue );
                        if (szValue.length>0)
                        {
                            szCookies +=  szName;
                            szCookies += "=";
                            szCookies +=  szValue;
                            szCookies +=  "; " ;
                        }
                        this.m_aCookies.push(oCookie); //valid cookie put it back
                    }
                    else  //delete expired cookie
                        delete oCookie;
                }
                else //domain not found
                    this.m_aCookies.push(oCookie);

            }

            szCookies = szCookies.replace(/;\s$/,"");
            this.m_Log.Write("CookieManger.js - findCookie - szCookies " + szCookies);

            this.m_Log.Write("CookieManger.js - findCookie - END");
            return szCookies;
        }
        catch(e)
        {
            this.m_Log.Write("CookieManger.js: findCookie : Exception : "
                                          + e.name
                                          + ".\nError message: "
                                          + e.message + " \n"
                                          + e.lineNumber);

            return null;
        }
    },

    domainCheck : function (szCookieDomain, szWantedDomain)
    {
        try
        {
            this.m_Log.Write("CookieManger.js - domainCheck - cookie "+szCookieDomain + " wanted " + szWantedDomain);

            var regexp = null;
            var szSubject = null;
            if (szWantedDomain.length > szCookieDomain.length)
            {
                szSubject = szWantedDomain;
                var tempDomain = szCookieDomain.replace(/^\./,"");
                regexp =  new RegExp(tempDomain+"$", "i");
            }
            else
            {
                szSubject = szCookieDomain;
                var tempDomain = szWantedDomain.replace(/^\./,"");
                regexp = new RegExp(tempDomain+"$", "i");
            }

            var bFound = false;
            if (szSubject.search(regexp)!=-1)bFound =  true;

            this.m_Log.Write("CookieManger.js - domainCheck END " +bFound);
            return bFound;
        }
        catch(err)
        {
            this.m_Log.Write("CookieManger.js: domainCheck : Exception : "
                                          + err.name
                                          + ".\nError message: "
                                          + err.message + " \n"
                                          + err.lineNumber);

            return false;
        }
    },


    cookieCheck : function (szCookieName, szWantedName)
    {
        try
        {
            this.m_Log.Write("CookieManger.js - cookieCheck - cookie "+szCookieName + " wanted " + szWantedName);
            var regexp =  new RegExp("^"+szCookieName+"$", "i");
            var bFound = false
            if (szWantedName.search(regexp)!=-1) bFound = true;
            this.m_Log.Write("CookieManger.js - cookieCheck - END " + bFound);
            return bFound;
        }
        catch(err)
        {
            this.m_Log.Write("CookieManger.js: cookieCheck : Exception : "
                                          + err.name
                                          + ".\nError message: "
                                          + err.message + " \n"
                                          + err.lineNumber);
            return false;
        }
    },


    expiryCheck : function (iExpiryTime)
    {
        try
        {
            var iTimeNow = Date.now();
            this.m_Log.Write("CookieManger.js - expiryCheck - iExpiryTime "+iExpiryTime + " NOW " + iTimeNow);

            var bFound = true;

            if (iExpiryTime != -1)
                if (iExpiryTime<iTimeNow) bFound = false;

            this.m_Log.Write("CookieManger.js - cookieCheck - END " +bFound);
            return bFound;
        }
        catch(err)
        {
            this.m_Log.Write("CookieManger.js: expiryCheck : Exception : "
                                          + err.name
                                          + ".\nError message: "
                                          + err.message + " \n"
                                          + err.lineNumber);
            return false;
        }
    }
}
