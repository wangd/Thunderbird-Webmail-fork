function Token(errorLog)
{
    try
    {
        var scriptLoader =  Components.classes["@mozilla.org/moz/jssubscript-loader;1"]
                                      .getService(Components.interfaces.mozIJSSubScriptLoader);
        if (scriptLoader)
        {
            scriptLoader.loadSubScript("chrome://web-mail/content/common/DebugLog.js");
            scriptLoader.loadSubScript("chrome://web-mail/content/common/md5.js");
        }
           
        this.m_Log = errorLog; 
        
        this.m_Log.Write("Hotmail-AuthToken.js - constructor - START");
        
        this.m_szDomain = null;
        this.m_szAuth =null;   
    
        this.m_Log.Write("Hotmial-AuthToken.js - constructor - END");
    }
    catch(e)
    {
        this.m_Log.Write("Hotmail-AuthToken.js: constructor : Exception : " 
                                          + e.name 
                                          + ".\nError message: " 
                                          + e.message);
    }
}


Token.prototype =
{
    getDomain : function ()
    {
        return this.m_szDomain;
    },
    
    
     
    newToken : function (szDomain, szValue, szURI ,szUserName, szPassword)
    {
        try
        {
            this.m_Log.Write("Hotmail-AuthToken.js - newToken - START");

            this.m_szDomain = szDomain;
            
            var szNC = "00000001";
            var szConce = this.randomString();
            var szQop = null;
            var szNonce = null;
            this.m_szAuth ="Digest ";
            this.m_szAuth +="username=\"" + szUserName + "\", "; 
            this.m_szAuth +="realm=\"" + szDomain + "\", "; 
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
            this.m_szAuth +="cnonce=\"" + szConce + "\", "; 
              
            //find qop and noncem 
            szQop = szValue.match(/qop="(.*?)"/i)[1];
            this.m_Log.Write("Hotmail-AuthToken.js - tokenValue - token : " + szQop);
           
            szNonce = szValue.match(/nonce="(.*?)"/i)[1];
            this.m_Log.Write("Hotmail-AuthToken.js - tokenValue - token : " + szNonce);
                  
            this.m_szAuth +="qop=\"" + szQop + "\", ";
            this.m_szAuth +="nonce=\"" + szNonce + "\", "; 
            
            //hash
            var szHA1=hex_md5(szUserName+":"+szDomain+":"+szPassword);
            this.m_Log.Write("Hotmail-AuthToken.js - newToken - HA1 " + szHA1);
            
            var szHA2 = hex_md5("PROPFIND:"+tempURI);
            this.m_Log.Write("Hotmail-AuthToken.js - newToken - HA2 " + szHA2);
            
            var szResponce = hex_md5(szHA1+":"+szNonce+":"+szNC+":"+szConce+":"+szQop+":"+szHA2);
            this.m_Log.Write("Hotmail-AuthToken.js - newToken - response " + szResponce);
           
            this.m_szAuth +="response=\"" + szResponce + "\""; 
           
            this.m_Log.Write("Hotmail-AuthToken.js - newToken - END");
        }
        catch(e)
        {
            this.m_Log.Write("Hotmail-AuthToken.js: newToken : Exception : " 
                                          + e.name 
                                          + ".\nError message: " 
                                          + e.message);
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
            this.m_Log.Write("Hotmail-AuthToken.js - getTokenString - " + this.m_szAuth);  
            return this.m_szAuth;
        }
        catch(e)
        {
            this.m_Log.Write("Hotmail-AuthToken.js: getTokenString : Exception : " 
                                          + e.name 
                                          + ".\nError message: " 
                                          + e.message);
        }
    },
}
