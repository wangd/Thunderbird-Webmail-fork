function HttpAuthManager(errorLog)
{  
   try
   {
        var scriptLoader =  Components.classes["@mozilla.org/moz/jssubscript-loader;1"];
        scriptLoader = scriptLoader.getService(Components.interfaces.mozIJSSubScriptLoader);
        scriptLoader.loadSubScript("chrome://web-mail/content/common/DebugLog.js");
        scriptLoader.loadSubScript("chrome://web-mail/content/common/HttpAuthToken.js");
        
        this.m_Log = errorLog;
        
        this.m_aTokens = new Array();
    }
    catch(e)
    {
         DebugDump("HttpAuthManager.js: Constructor : Exception : " 
                                      + e.name 
                                      + ".\nError message: " 
                                      + e.message + "\n"
                                      + e.lineNumber);
    }
}


HttpAuthManager.prototype =
{
   
    addToken : function (szDomain, szHeader, szURI ,szUserName, szPassword)
    {
        try
        {
            this.m_Log.Write("HttpAuthManager.js - addToken - START");
            this.m_Log.Write("HttpAuthManager.js - addToken - Domain" + szDomain
                                                            + "\nHeader " + szHeader 
                                                            + "\nURI " + szURI
                                                            + "\nusername " + szUserName
                                                            + "\npassword " + szPassword);
                                                        
            if (!szHeader || !szUserName || !szPassword) return false; 
           
         
            
            //search cookies for domain
            if (this.m_aTokens.length !=0)   
            {           
                var iMax = this.m_aTokens.length;
                for (var i = 0 ; i<iMax ; i++)
                {
                    this.m_Log.Write("HttpAuthManager.js - addToken" + this.m_aTokens[0]);
                    
                    if (this.m_aTokens[0] != undefined)
                    {  
                        var temp = this.m_aTokens.shift();  //get first item
                        this.m_Log.Write("HttpAuthManager.js - addToken " + i + " "+ temp.getDomain());
                       
                        var regexp =  new RegExp(temp.getDomain(), "i");
                        this.m_Log.Write("HttpAuthManager.js - addToken - regexp " +regexp );
                        
                        if (szDomain.search(regexp)!=-1)
                        { 
                            this.m_Log.Write("HttpAuthManager.js - addToken - found domain - deleted");
                            var oTokens = new HttpAuthToken( this.m_Log);
                            oTokens.newToken(szDomain, szHeader, szURI,szUserName, szPassword);                                   
                            this.m_aTokens.push(oTokens); //place cookie in array
                            this.m_Log.Write("AuthTokenHandler.js - addToken - found domain END");
                            return true;
                        }
                        else
                        {
                            this.m_aTokens.push(temp);
                            this.m_Log.Write("HttpAuthManager.js - addToken - not found domain"); 
                        }
                    }
                } 
            }
            
            //domain not found create new cookie        
            this.m_Log.Write("HttpAuthManager.js - addToken - creating new token"); 
            var oTokens = new HttpAuthToken( this.m_Log);
            oTokens.newToken(szDomain, szHeader, szURI,szUserName, szPassword);                                   
            this.m_aTokens.push(oTokens); 
            
            this.m_Log.Write("HttpAuthManager.js - addToken - END"); 
            return true;   
        }
        catch(e)
        {
             this.m_Log.Write("HttpAuthManager.js: addToken : Exception : " 
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
            this.m_Log.Write("HttpAuthManager.js - findToken - START");
            this.m_Log.Write("HttpAuthManager.js - findToken - target domain - " + szDomain);
            if (!szDomain) return null;
            if (this.m_aTokens.length == 0) return null;   
             
            for (var i = 0 ; i<this.m_aTokens.length ; i++)
            {
                var temp = this.m_aTokens[i];
                this.m_Log.Write("HttpAuthManager.js - findToken " + i + " "+ temp.getDomain());
               
                var regexp =  new RegExp(temp.getDomain(), "i");
                this.m_Log.Write("HttpAuthManager.js - findToken - regexp " +regexp );
                
                if (szDomain.search(regexp)!=-1)
                { 
                    this.m_Log.Write("HttpAuthManager.js - findToken - found domain"); 
                    return temp.getTokenString();
                }  
            }
            
            return null;
            this.m_Log.Write("HttpAuthManager.js - findToken - END");   
        }
        catch(e)
        {
            this.m_Log.Write("HttpAuthManager.js: findToken : Exception : " 
                                          + e.name 
                                          + ".\nError message: " 
                                          + e.message+ "\n"
                                          + e.lineNumber);
                                          
            return null;
        }
    },
}
