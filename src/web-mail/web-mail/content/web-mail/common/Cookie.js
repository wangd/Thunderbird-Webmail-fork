function Cookie(errorLog)
{
    try
    {
        var scriptLoader =  Components.classes["@mozilla.org/moz/jssubscript-loader;1"];
        scriptLoader = scriptLoader.getService(Components.interfaces.mozIJSSubScriptLoader);
        scriptLoader.loadSubScript("chrome://web-mail/content/common/DebugLog.js");
           
        this.m_Log = errorLog; 
        
        this.m_Log.Write("cookie.js - constructor - START");
        
        this.m_szDomain = null;
        this.m_aszCookieValue = new Array();
        this.m_aszCookieName = new Array();   
    
        this.m_Log.Write("cookie.js - constructor - END");
    }
    catch(e)
    {
        this.m_Log.Write("cookie.js: constructor : Exception : " 
                                          + e.name 
                                          + ".\nError message: " 
                                          + e.message);
    }
}


Cookie.prototype =
{
    getDomain : function ()
    {
        return this.m_szDomain;
    },
    
    
     
    setCookieValue : function (szValues)
    {
        try
        {
            this.m_Log.Write("cookie.js - setCookieValue - START");
            
            var aCookie = szValues.replace(/\n/g,";").split(";");
            this.m_Log.Write("cookie.js - setCookieValue - value " + aCookie);
            
            var iMax = aCookie.length;
            for (var j = 0 ; j<iMax ; j++)
            {
                var szTemp = aCookie[j];
                if (szTemp.length>0)
                {
                    this.m_Log.Write("cookie.js - setCookieValue - value " + szTemp);
                    this.cookieValue(szTemp);
                }
            }
            
            this.m_Log.Write("cookie.js - setCookieValue - END");
        }
        catch(e)
        {
            this.m_Log.Write("cookie.js: setCookieValue : Exception : " 
                                          + e.name 
                                          + ".\nError message: " 
                                          + e.message);
        }
    },



    newCookie : function (szDomain, szValues)
    {
        try
        {
            this.m_Log.Write("cookie.js - newCookie - START");

            this.m_szDomain = szDomain;
            
            var aCookie = szValues.replace(/\n/g,";").split(";");
            this.m_Log.Write("cookie.js - newCookie - values " + aCookie);
            
            var iMax = aCookie.length;
            for (var k = 0 ; k<iMax ; k++)
            {
                var szTemp = aCookie[k];
                if (szTemp.length>0)
                {
                    this.m_Log.Write("cookie.js - newCookie - value " + szTemp);
                    this.cookieValue(szTemp);
                }
            }
            
            this.m_Log.Write("cookie.js - newCookie - END");
        }
        catch(e)
        {
            this.m_Log.Write("cookie.js: newCookie : Exception : " 
                                          + e.name 
                                          + ".\nError message: " 
                                          + e.message);
        }
    },
    
    
     
    getCookieString : function ()
    {
        try
        {
            this.m_Log.Write("cookie.js - getCookieString - START");
            
            var szCookie= "";
            var iCookieNum = this.m_aszCookieName.length;
            if (iCookieNum>0)
            {
                for(var i=0; i<iCookieNum; i++)
                {
                    szCookie +=  this.m_aszCookieName[i] + "=" + this.m_aszCookieValue[i] 
                    if (i+1 != iCookieNum)  szCookie +="; ";
                }
            }
            
            this.m_Log.Write("cookie.js - getCookieString - END " + szCookie);  
            return szCookie;
        }
        catch(e)
        {
            this.m_Log.Write("cookie.js: getCookieString : Exception : " 
                                          + e.name 
                                          + ".\nError message: " 
                                          + e.message);
        }
    },
    
    cookieValue: function (szValue)
    {
        try
        {
            this.m_Log.Write("cookie.js - CookieValue - START");
            this.m_Log.Write("cookie.js - CookieValue - cookie : " + szValue );
           
            var bDone = false;
            var iNameSplitValue = szValue.indexOf("=");
            var szCookieName = szValue.substr(0,iNameSplitValue);
            var szCookieValue = szValue.substr(iNameSplitValue+1);
            this.m_Log.Write("cookie.js - CookieValue - cookie name : " + szCookieName 
                                                                 + " value " +szCookieValue);
            
            var iNumCookies = this.m_aszCookieName.length;
            this.m_Log.Write("cookie.js - CookieValue - cookie num : " + iNumCookies );
            
            if (szCookieName.search(/domain/i)== -1 &&
                     szCookieName.search(/path/i)== -1 &&
                     szCookieName.search(/httponly/i)== -1 &&
                     szCookieName.search(/version/i)== -1 &&
                     szCookieName.search(/secure/i)== -1 &&
                     szCookieName.search(/expires/i)== -1)
            {
                
                if (iNumCookies>0)
                { 
                    var szSearchName = new RegExp(szCookieName,"i");
                    this.m_Log.Write("cookie.js - CookieValue - cookie search : " + szSearchName );
                    
                    for(var i=0; i<iNumCookies; i++)
                    {
                        //get first element
                        var szTempName =  this.m_aszCookieName.shift();
                        var szTempValue = this.m_aszCookieValue.shift();
                        this.m_Log.Write("cookie.js - CookieValue - cookie item search : " 
                                                                        + szTempName 
                                                                        + " " 
                                                                        + szTempValue);
                        
                        if (szTempName.search(szSearchName)==-1) //not found
                        {
                            //add to end
                            this.m_Log.Write("cookie.js - newCookie - cookie pushed back " + szTempName); 
                            this.m_aszCookieName.push(szTempName);
                            this.m_aszCookieValue.push(szTempValue);
                        }
                        else
                        {
                            //found cookie;set new value
                            if (szCookieValue.length>0)
                            {
                                this.m_Log.Write("cookie.js - newCookie - value updated " + szValue); 
                                this.m_aszCookieName.push(szTempName);
                                this.m_aszCookieValue.push(szCookieValue);
                                bDone = true;
                            }
                            else
                            { //cookie value equals zero delete cookie  
                                this.m_Log.Write("cookie.js - newCookie - deleted " + szValue);  
                                delete szTempValue;
                                delete szTempName;
                                bDone = true;
                            }  
        
                            break;     
                        }
                    }
                    
                    //cookie not found 
                    if (szCookieValue.length>0 && !bDone)
                    {
                        this.m_aszCookieName.push(szCookieName);
                        this.m_aszCookieValue.push(szCookieValue);
                        this.m_Log.Write("cookie.js - newCookie - value added " + szValue);
                    }
                }
                else
                {
                    if (szCookieValue.length>0)
                    {
                        this.m_Log.Write("cookie.js - newCookie - value stored " + szValue);
                        //value stored
                        this.m_aszCookieName.push(szCookieName);
                        this.m_aszCookieValue.push(szCookieValue);
                    }
                }
            }
                    
            this.m_Log.Write("cookie.js - CookieValue - END");
        }
        catch(e)
        {
            this.m_Log.Write("cookie.js: CookieValue : Exception : " 
                                          + e.name 
                                          + ".\nError message: " 
                                          + e.message);
        }
    },
}
