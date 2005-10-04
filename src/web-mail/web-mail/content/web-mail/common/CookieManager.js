function CookieHandler(errorLog)
{  
    try
    {
        var scriptLoader =  Components.classes["@mozilla.org/moz/jssubscript-loader;1"];
        scriptLoader = scriptLoader.getService(Components.interfaces.mozIJSSubScriptLoader);
        scriptLoader.loadSubScript("chrome://web-mail/content/common/DebugLog.js");
        scriptLoader.loadSubScript("chrome://web-mail/content/common/Cookie.js");
        
        this.m_Log = errorLog;
        
        this.m_aCookies = new Array();
    }
    catch(e)
    {
         DebugDump("CookieManager.js: Constructor : Exception : " 
                                      + e.name 
                                      + ".\nError message: " 
                                      + e.message);
    }
}


CookieHandler.prototype =
{
   
    addCookie : function (szCookie)
    {
        try
        {
            this.m_Log.Write("CookieManager.js - addCookie - START");
            this.m_Log.Write("CookieManager.js - addCookie - cookie " + szCookie);
            if (!szCookie) return false; 
            
            //remove newlines and ,
            szCookie = szCookie.replace(/\n|,/g,";")+";";
            
            //get domain
            var szDomain = szCookie.match(/domain=(.*?);/i)[1];
            this.m_Log.Write("CookieManager.js - addCookie - cookie domain " + szDomain);
            
            
            //search cookies for domain
            var iMax = this.m_aCookies.length;
            if (iMax != 0)   
            {
                for (var i = 0 ; i<iMax ; i++)
                {
                    var temp = this.m_aCookies[i];  //get first item
                    this.m_Log.Write("CookieManger.js - findCookie " + i + " "+ temp.getDomain());
                   
                    var regexp =  new RegExp(temp.getDomain(), "i");
                    this.m_Log.Write("CookieManger.js - addCookie - regexp " +regexp );  
                    if (szDomain.search(regexp)!=-1)
                    { 
                        temp.setCookieValue(szCookie);
                        this.m_Log.Write("CookieManger.js - findCookie - found domain END");
                        return true;
                    }
                } 
            }
              
            this.m_Log.Write("CookieManger.js - findCookies - domain not found"); 
            
            var oCookie = new Cookie( this.m_Log);
            oCookie.newCookie(szDomain, szCookie); 
            this.m_Log.Write("CookieManager.js - addCookie - creating new cookie"); 
            this.m_aCookies.push(oCookie); //place cookie in array
            
            this.m_Log.Write("CookieManager.js - addCookie - END"); 
            return true;   
        }
        catch(e)
        {
             this.m_Log.Write("CookieManger.js: addCookie : Exception : " 
                                          + e.name 
                                          + ".\nError message: " 
                                          + e.message);
        }   
    },
    
    
    
    findCookie :  function (szDomain)
    {
        try
        {
            this.m_Log.Write("CookieManger.js - findCookie - START");
            this.m_Log.Write("CookieManger.js - findCookie - target domain - " + szDomain);
            if (!szDomain) return null;
            
            var iMax = this.m_aCookies.length;
            if (iMax == 0) return null;   
            
            for (var i = 0 ; i<iMax ; i++)
            {
                var temp = this.m_aCookies[i]
                this.m_Log.Write("CookieManger.js - findCookie " + i + " "+ temp.getDomain());
               
                var regexp =  new RegExp(temp.getDomain(), "i");
                this.m_Log.Write("CookieManger.js - findCookie - regexp " +regexp );  
                if (szDomain.search(regexp)!=-1)
                { 
                    this.m_Log.Write("CookieManger.js - findCookie - found domain END"); 
                    return temp.getCookieString();
                }
            }
            
            return null;
            this.m_Log.Write("CookieManger.js - findCookie - END");   
        }
        catch(e)
        {
            this.m_Log.Write("CookieManger.js: findCookie : Exception : " 
                                          + e.name 
                                          + ".\nError message: " 
                                          + e.message);
                                          
            return null;
        }
    },
}
