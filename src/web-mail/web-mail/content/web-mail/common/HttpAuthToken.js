function HttpAuthToken(errorLog)
{
    try
    {
        var scriptLoader =  Components.classes["@mozilla.org/moz/jssubscript-loader;1"]
        scriptLoader = scriptLoader.getService(Components.interfaces.mozIJSSubScriptLoader);
        scriptLoader.loadSubScript("chrome://web-mail/content/common/DebugLog.js");
        scriptLoader.loadSubScript("chrome://web-mail/content/common/hash.js");
        scriptLoader.loadSubScript("chrome://web-mail/content/common/base64.js");
                   
        this.m_Log = errorLog; 
        
        this.m_Log.Write("HttpAuthToken.js - constructor - START");
        
        this.m_szDomain = null;
        this.m_szAuth =null;   
    
        this.m_Log.Write("HttpAuthToken.js - constructor - END");
    }
    catch(e)
    {
        this.m_Log.Write("HttpAuthToken.js: constructor : Exception : " 
                                          + e.name 
                                          + ".\nError message: " 
                                          + e.message+ "\n"
                                          + e.lineNumber);
    }
}


HttpAuthToken.prototype =
{
    getDomain : function ()
    {
        return this.m_szDomain;
    },
    
    
     
    newToken : function (szDomain, szValue, szURI ,szUserName, szPassword)
    {
        try
        {
            this.m_Log.Write("HttpAuthToken.js - newToken - START");

            this.m_szDomain = szDomain;

            if (szValue.search(/basic/i)!= -1)
            {//authentication on the cheap
                this.m_Log.Write("HttpAuthToken.js - newToken - basic Authenticate");
               
                var oBase64 = new base64();
                this.m_szAuth ="Basic ";
                this.m_szAuth += oBase64.encode(szUserName+":"+szPassword);
                this.m_Log.Write("HttpAuthToken.js - newToken - " +  this.m_szAuth);
            }
            else 
            {
                this.m_Log.Write("HttpAuthToken.js - newToken - digest Authenticate");
              
                this.m_szAuth ="Digest ";
                this.m_szAuth +="username=\"" + szUserName + "\", "; 
                var szRealm = szValue.match(/realm="(.*?)"/i)[1];
                this.m_szAuth +="realm=\"" + szRealm + "\", "; 
                var szNC = "00000001";
                this.m_szAuth +="nc=" + szNC + ", "; 
                this.m_szAuth +="algorithm=\"MD5\", ";
                
                var tempURI = null;
                try 
                {
                    tempURI = szURI.match(/(.*?)\?/i)[1]; 
                }
                catch(e)
                {
                    tempURI = szURI; 
                }
                
                this.m_szAuth +="uri=\"" + tempURI + "\", ";
                var szConce = this.randomString();
                this.m_szAuth +="cnonce=\"" + szConce + "\", "; 
                  
                //find qop and noncem 
                var szQop = szValue.match(/qop="(.*?)"/i)[1];
                this.m_Log.Write("HttpAuthToken.js - newToken - Qop: " + szQop);
                this.m_szAuth +="qop=\"" + szQop + "\", ";
                
                var szNonce = szValue.match(/nonce="(.*?)"/i)[1];
                this.m_Log.Write("HttpAuthToken.js - newToken - Nonce : " + szNonce);      
                this.m_szAuth +="nonce=\"" + szNonce + "\", "; 
                
                //hash
                var oHash = new hash();
                
                var szHA1=oHash.md5Hash(szUserName+":"+szRealm+":"+szPassword);
                this.m_Log.Write("HttpAuthToken.js - newToken - HA1 " + szHA1);
                
                var szHA2 = oHash.md5Hash("PROPFIND:"+tempURI);
                this.m_Log.Write("HttpAuthToken.js - newToken - HA2 " + szHA2);
                
                var szResponse = oHash.md5Hash(szHA1+":"+szNonce+":"+szNC+":"+szConce+":"+szQop+":"+szHA2);

                this.m_Log.Write("HttpAuthToken.js - newToken - response " + szResponse);                
                this.m_szAuth +="response=\"" + szResponse + "\""; 
            }

            this.m_Log.Write("HttpAuthToken.js - newToken - END");
        }
        catch(e)
        {
            this.m_Log.Write("HttpAuthToken.js: newToken : Exception : " 
                                          + e.name 
                                          + ".\nError message: " 
                                          + e.message+ "\n"
                                          + e.lineNumber);
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
    
     
    getTokenString : function ()
    {
        try
        {
            this.m_Log.Write("HttpAuthToken.js - getTokenString - " + this.m_szAuth);  
            return this.m_szAuth;
        }
        catch(e)
        {
            this.m_Log.Write("HttpAuthToken.js: getTokenString : Exception : " 
                                          + e.name 
                                          + ".\nError message: " 
                                          + e.message + "\n"
                                          + e.lineNumber);
        }
    },
}
