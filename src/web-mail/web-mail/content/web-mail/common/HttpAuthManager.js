function HttpAuthManager()
{
    try
    {
        var scriptLoader =  Components.classes["@mozilla.org/moz/jssubscript-loader;1"]
                                 .getService(Components.interfaces.mozIJSSubScriptLoader);
        scriptLoader.loadSubScript("chrome://web-mail/content/common/DebugLog.js");
        scriptLoader.loadSubScript("chrome://web-mail/content/common/HttpAuthToken.js");
        scriptLoader.loadSubScript("chrome://web-mail/content/common/hash.js");
        scriptLoader.loadSubScript("chrome://web-mail/content/common/base64.js");

        var date = new Date();
        var szLogFileName = "HttpAuthManager Log - " + date.getHours()+ "-"
                                    + date.getMinutes() + "-"+ date.getUTCMilliseconds() +" -";
        this.m_Log = new DebugLog("webmail.logging.comms", "", szLogFileName);

        this.m_Log.Write("HttpAuthManager.js - Constructor - START");

        this.m_aTokens = new Array();

        this.m_Log.Write("HttpAuthManager.js - Constructor - END");
    }
    catch(e)
    {
        DebugDump("HttpAuthManager.js: Constructor : Exception : "
                                      + e.name +
                                      ".\nError message: "
                                      + e.message + "\n"
                                      + e.lineNumber);
    }
}

HttpAuthManager.prototype =
{

    addToken : function (szDomain , szHeader, szURI ,szUserName, szPassword)
    {
        try
        {
            this.m_Log.Write("nsHttpAuthManager - addToken - START");
            this.m_Log.Write("nsHttpAuthManager - addToken - \ndomain "
                                                        + szDomain +"\n"
                                                        + "Header " + szHeader
                                                        + "URI " + szURI
                                                        + "username " + szUserName
                                                        + "password " + szPassword);

            if (!szDomain || !szHeader || !szUserName || !szPassword) return false;

            //search cookies for domain
            if (this.m_aTokens.length !=0)
            {
                var iMax = this.m_aTokens.length;
                for (var i = 0 ; i<iMax ; i++)
                {
                    this.m_Log.Write("nsHttpAuthManager.js - addToken" + this.m_aTokens[0]);

                    if (this.m_aTokens[0] != undefined)
                    {
                        var temp = this.m_aTokens.shift();  //get first item
                        this.m_Log.Write("nsHttpAuthManager.js - addToken " + i + " "+ temp.getDomain());

                        var regexp =  new RegExp(temp.getDomain(), "i");
                        this.m_Log.Write("nsHttpAuthManager.js - addToken - regexp " +regexp );

                        if (szDomain.search(regexp)!=-1)
                        {
                            this.m_Log.Write("nsHttpAuthManager.js - addToken - found domain - deleted");
                            var oTokens = new HttpAuthToken();
                            oTokens.setDomain(szDomain);
                            oTokens.setToken(this.newToken(szHeader, szURI, szUserName, szPassword));
                            this.m_aTokens.push(oTokens); //place cookie in array
                            this.m_Log.Write("nsHttpAuthManager.js - addToken - found domain END");
                            return true;
                        }
                        else
                        {
                            this.m_aTokens.push(temp);
                            this.m_Log.Write("nsHttpAuthManager.js - addToken - not found domain");
                        }
                    }
                }
            }

            //domain not found create new cookie
            this.m_Log.Write("nsHttpAuthManager - addToken - creating new token");
            var oTokens = new HttpAuthToken();
            oTokens.setDomain(szDomain);
            oTokens.setToken(this.newToken(szHeader, szURI, szUserName, szPassword));
            this.m_aTokens.push(oTokens); //place cookie in array

            this.m_Log.Write("nsHttpAuthManager - addToken - END");
            return true;
        }
        catch(e)
        {
             this.m_Log.Write("nsHttpAuthManager: addToken : Exception : "
                                          + e.name
                                          + ".\nError message: "
                                          + e.message+ "\n"
                                          + e.lineNumber);
        }
    },



    findToken :  function (szDomain)
    {
        try
        {
            this.m_Log.Write("nsHttpAuthManager - findToken - START");
            this.m_Log.Write("nsHttpAuthManager - findToken - target domain - " + szDomain);
            if (!szDomain) return null;
            if (this.m_aTokens.length == 0) return null;

            for (var i = 0 ; i<this.m_aTokens.length ; i++)
            {
                var temp = this.m_aTokens[i];
                this.m_Log.Write("nsHttpAuthManager.js - findToken " + i + " "+ temp.getDomain());

                var regexp =  new RegExp(temp.getDomain(), "i");
                this.m_Log.Write("nsHttpAuthManager.js - findToken - regexp " +regexp );

                if (szDomain.search(regexp)!=-1)
                {
                    this.m_Log.Write("nsHttpAuthManager.js - findToken - found domain");
                    return temp.getToken();
                }
            }

            return null;
            this.m_Log.Write("nsHttpAuthManager - findToken - END");
        }
        catch(e)
        {
            this.m_Log.Write("nsHttpAuthManager: findToken : Exception : "
                                          + e.name
                                          + ".\nError message: "
                                          + e.message+ "\n"
                                          + e.lineNumber);

            return null;
        }
    },




    randomString : function ()
    {
        var seed = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXTZabcdefghiklmnopqrstuvwxyz";
        var iLength = 10;
        var szRandom = "";
        for (var i=0; i<iLength; i++)
        {
            var rnum = Math.floor(Math.random() * seed.length);
            szRandom += seed.substring(rnum,rnum+1);
        }
        return szRandom;
    },



    newToken : function (szValue, szURI ,szUserName, szPassword)
    {
        try
        {
            this.m_Log.Write("nsHttpAuthManager.js - newToken - START");

            var szAuth = null;
            if (szValue.search(/basic/i)!= -1)
            {//authentication on the cheap
                this.m_Log.Write("nsHttpAuthManager.js - newToken - basic Authenticate");

                var oBase64 = new base64();
                szAuth ="Basic ";
                szAuth += oBase64.encode(szUserName+":"+szPassword);
            }
            else
            {
                this.m_Log.Write("nsHttpAuthManager.js - newToken - digest Authenticate");

                szAuth ="Digest ";
                szAuth +="username=\"" + szUserName + "\", ";
                var szRealm = szValue.match(/realm="(.*?)"/i)[1];
                szAuth +="realm=\"" + szRealm + "\", ";
                var szNC = "00000001";
                szAuth +="nc=" + szNC + ", ";
                szAuth +="algorithm=\"MD5\", ";

                var tempURI = null;
                try
                {
                    tempURI = szURI.match(/(.*?)\?/i)[1];
                }
                catch(e)
                {
                    tempURI = szURI;
                }

                szAuth +="uri=\"" + tempURI + "\", ";
                var szConce = this.randomString();
                szAuth +="cnonce=\"" + szConce + "\", ";

                //find qop and noncem
                var szQop = szValue.match(/qop="(.*?)"/i)[1];
                this.m_Log.Write("nsHttpAuthManager.js - newToken - Qop: " + szQop);
                szAuth +="qop=\"" + szQop + "\", ";

                var szNonce = szValue.match(/nonce="(.*?)"/i)[1];
                this.m_Log.Write("nsHttpAuthManager.js - newToken - Nonce : " + szNonce);
                szAuth +="nonce=\"" + szNonce + "\", ";

                //hash
                var oHash = new hash();

                var szHA1=oHash.md5Hash(szUserName+":"+szRealm+":"+szPassword);
                this.m_Log.Write("nsHttpAuthManager.js - newToken - HA1 " + szHA1);

                var szHA2 = oHash.md5Hash("PROPFIND:"+tempURI);
                this.m_Log.Write("nsHttpAuthManager.js - newToken - HA2 " + szHA2);

                var szResponse = oHash.md5Hash(szHA1+":"+szNonce+":"+szNC+":"+szConce+":"+szQop+":"+szHA2);

                this.m_Log.Write("nsHttpAuthManager.js - newToken - response " + szResponse);
                szAuth +="response=\"" + szResponse + "\"";
            }

            this.m_Log.Write("nsHttpAuthManager.js - newToken - " +  szAuth);
            this.m_Log.Write("nsHttpAuthManager.js - newToken - END");
            return szAuth;
        }
        catch(e)
        {
            this.m_Log.Write("nsHttpAuthManager.js: newToken : Exception : "
                                          + e.name
                                          + ".\nError message: "
                                          + e.message+ "\n"
                                          + e.lineNumber);
        }
    }
}