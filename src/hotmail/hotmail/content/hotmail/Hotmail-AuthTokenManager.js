function AuthTokenHandler(errorLog)
{  
    try
    {
        var scriptLoader =  Components.classes["@mozilla.org/moz/jssubscript-loader;1"]
        scriptLoader = scriptLoader.getService(Components.interfaces.mozIJSSubScriptLoader);
        scriptLoader.loadSubScript("chrome://web-mail/content/common/DebugLog.js");
        scriptLoader.loadSubScript("chrome://hotmail/content/Hotmail-AuthToken.js");
        
        this.m_Log = errorLog;
        
        this.m_aTokens = new Array();
    }
    catch(e)
    {
         DebugDump("AuthTokenHandler.js: Constructor : Exception : " 
                                      + e.name 
                                      + ".\nError message: " 
                                      + e.message + "\n"
                                      + e.lineNumber);
    }
}


AuthTokenHandler.prototype =
{
   
    addToken : function (szDomain , szHeader, szURI ,szUserName, szPassword)
    {
        try
        {
            this.m_Log.Write("AuthTokenHandler.js - addToken - START");
            this.m_Log.Write("AuthTokenHandler.js - addToken - \ndomain " 
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
                    this.m_Log.Write("AuthTokenHandler.js - addToken" + this.m_aTokens[0]);
                    
                    if (this.m_aTokens[0] != undefined)
                    {  
                        var temp = this.m_aTokens.shift();  //get first item
                        this.m_Log.Write("AuthTokenHandler.js - addToken " + i + " "+ temp.getDomain());
                       
                        if (szDomain == temp.getDomain())
                        { 
                            this.m_Log.Write("AuthTokenHandler.js - addToken - found domain - deleted");
                            var oTokens = new Token( this.m_Log);
                            oTokens.newToken(szDomain, szHeader, szURI,szUserName, szPassword);                                   
                            this.m_aTokens.push(oTokens); //place cookie in array
                            this.m_Log.Write("AuthTokenHandler.js - addToken - found domain END");
                            return true;
                        }
                        else
                        {
                            this.m_aTokens.push(temp);
                            this.m_Log.Write("AuthTokenHandler.js - addToken - not found domain"); 
                        }
                    }
                } 
            }
            
            //domain not found create new cookie        
            this.m_Log.Write("AuthTokenHandler.js - addToken - creating new token"); 
            var oTokens = new Token( this.m_Log);
            oTokens.newToken(szDomain, szHeader, szURI,szUserName, szPassword);                                   
            this.m_aTokens.push(oTokens); 
            
            this.m_Log.Write("AuthTokenHandler.js - addToken - END"); 
            return true;   
        }
        catch(e)
        {
             this.m_Log.Write("AuthTokenHandler.js: addToken : Exception : " 
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
            this.m_Log.Write("AuthTokenHandler.js - findToken - START");
            this.m_Log.Write("AuthTokenHandler.js - findToken - target domain - " + szDomain);
            if (!szDomain) return null;
            if (this.m_aTokens.length == 0) return null;   
            
            for (var i = 0 ; i<this.m_aTokens.length ; i++)
            {
                var temp = this.m_aTokens[i];
                this.m_Log.Write("AuthTokenHandler.js - findToken " + i + " "+ temp.getDomain());
               
                if (szDomain == temp.getDomain())
                { 
                    this.m_Log.Write("AuthTokenHandler.js - findToken - found domain"); 
                    return temp.getTokenString();
                }  
            }
            
            return null;
            this.m_Log.Write("AuthTokenHandler.js - findToken - END");   
        }
        catch(e)
        {
            this.m_Log.Write("AuthTokenHandler.js: findToken : Exception : " 
                                          + e.name 
                                          + ".\nError message: " 
                                          + e.message+ "\n"
                                          + e.lineNumber);
                                          
            return null;
        }
    },
}
