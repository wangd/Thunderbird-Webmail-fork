function CookieHandler(errorLog)
{  
    try
    {
        var scriptLoader =  Components.classes["@mozilla.org/moz/jssubscript-loader;1"]
                                  .getService(Components.interfaces.mozIJSSubScriptLoader);
        if (scriptLoader)
        {
            scriptLoader.loadSubScript("chrome://web-mail/content/common/DebugLog.js");
            scriptLoader.loadSubScript("chrome://web-mail/content/common/Cookie.js");
        }
        
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
   
    addCookie : function (szDomain , szCookie)
    {
        try
        {
            this.m_Log.Write("CookieManager.js - addCookie - START");
            this.m_Log.Write("CookieManager.js - addCookie - \ndomain " 
                                                        + szDomain +"\n"
                                                        + "cookie " + szCookie);
            if (!szDomain || !szCookie) return false; 
           
            //search cookies for domain
            var oCookie = null;
            if (this.m_aCookies.length !=0)   
            {           
                var iMax = this.m_aCookies.length;
                for (var i = 0 ; i<iMax ; i++)
                {
                    this.m_Log.Write("CookieManger.js - findCookies " + this.m_aCookies[0]);
                    
                    if (this.m_aCookies[0] != undefined)
                    {  
                        var temp = this.m_aCookies.shift();  //get first item
                        this.m_Log.Write("CookieManger.js - findCookie " + i + " "+ temp.getDomain());
                       
                        if (szDomain == temp.getDomain())
                        { 
                            this.m_Log.Write("CookieManger.js - findCookie - found domain");
                            temp.setCookieValue(szCookie);
                            this.m_aCookies.push(temp);
                            this.m_Log.Write("CookieManger.js - findCookie - found domain END");
                            return true;
                        }
                        else
                        {
                            this.m_aCookies.push(temp);
                            this.m_Log.Write("CookieManger.js - findCookies - not found domain"); 
                        }
                    }
                } 
            }
              
            
            
            if (oCookie == null) //domain  not found
            {
                this.m_Log.Write("CookieManager.js - addCookie - creating new cookie"); 
                //domain not found create new cookie         
                oCookie = new Cookie( this.m_Log);
                oCookie.newCookie(szDomain, szCookie);                                   
            }
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
            if (this.m_aCookies.length == 0) return null;   
            
            var iMax = this.m_aCookies.length;
            for (var i = 0 ; i<iMax ; i++)
            {
                this.m_Log.Write("CookieManger.js - findCookies " + this.m_aCookies[0]);
                
                if (this.m_aCookies[0] != undefined)
                {  
                    var temp = this.m_aCookies.shift();  //get first item
                    this.m_Log.Write("CookieManger.js - findCookie " + i + " "+ temp.getDomain());
                   
                    if (szDomain == temp.getDomain())
                    { 
                        this.m_Log.Write("CookieManger.js - findCookie - found domain"); 
                        this.m_aCookies.push(temp);
                        return temp.getCookieString();
                    }
                    else
                    {
                        this.m_aCookies.push(temp);
                        this.m_Log.Write("CookieManger.js - findCookies - not found domain"); 
                    }
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
