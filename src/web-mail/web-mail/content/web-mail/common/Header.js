function headers(szHeaders)
{
    var scriptLoader =  Components.classes["@mozilla.org/moz/jssubscript-loader;1"];
    scriptLoader = scriptLoader.getService(Components.interfaces.mozIJSSubScriptLoader);
    scriptLoader.loadSubScript("chrome://web-mail/content/common/DebugLog.js");
    
    this.m_szHeaders = szHeaders;
}


headers.prototype =
{
    getTo : function ()
    {
        try
        {
           if (!this.m_szHeaders) return null;
            
            var szTo = null;
            try
            {
                szTo = this.m_szHeaders.match(/To:(.*?)$/im)[1];
                szTo = this.addressClean(szTo);  
            }
            catch(e){}
            
            return szTo;
        }
        catch(err)
        {
            DebugDump("headers.js: getTo : Exception : " + err.name 
                                                  + ".\nError message: " 
                                                  + err.message + "\n"
                                                  + err.lineNumber);
                                                  
            return null;          
        }
    },
       
    
    getCc : function ()
    {
        try
        {
            if (!this.m_szHeaders) return null;
            
            var szCc = null;   
            try
            {
                szCc = this.m_szHeaders.match(/CC:(.*?)$/im)[1];
                szCc = this.addressClean(szCc);
            }
            catch(e){}

            return szCc;  
        }
        catch(err)
        {
            DebugDump("headers.js: getCc : Exception : "  + err.name 
                                                  + ".\nError message: " 
                                                  + err.message + "\n"
                                                  + err.lineNumber);
            return null;
        }
    },
    
    
    getSubject : function ()
    {
        try
        {
            if (!this.m_szHeaders) return null;
        
            var szSubject = null;
            try
            {
                szSubject = this.m_szHeaders.match(/Subject:\s(.*?)$/im)[1];
            }
            catch(e){}

            return szSubject;  
        }
        catch(err)
        {
            DebugDump("headers.js: getSubject : Exception : " + err.name 
                                                  + ".\nError message: " 
                                                  + err.message +"\n"
                                                  + err.lineNumber);
            return null;
        }
    },
   
   
    //0 : All
    //1 : type
    //2 : subtype
    getContentType: function(iField)
    {
        try
        {
            if (!this.m_szHeaders) return null; 
           
            var szContentType = this.m_szHeaders.match(/Content-Type:(.*?)$/im)[1];
            var szContent= null;
            
            switch(iField)
            {
                case 0:  //all
                    szContent = szContentType;
                break;
                
                case 1: // type
                    szContent= szContentType.match(/(.*?)\/.*?;/)[1];
                    szContent = szContent.replace(/\s/,"");
                break;
                
                case 2://subtype
                    szContent= szContentType.match(/.*?\/(.*?);/)[1];
                    szContent = szContent.replace(/\s/,"");
                break;
                
                case 3://boundary
                    szContent= szContentType.match(/ boundary="(.*?)"/)[1];
                    szContent = szContent.replace(/\s/,"");
                break;
                
                case 4://name
                    szContent= szContentType.match(/name="(.*?)"/i)[1];
                break;
            };

            return szContent;  
        }
        catch(err)
        {
            return null;
        }
    },
    
    
    
    
    //0 : All
    //1 : filename
    getContentDisposition: function(iField)
    {
        try
        {
            if (!this.m_szHeaders) return null; 
           
            var szContentDispo = this.m_szHeaders.match(/Content-Disposition:(.*?)$/im)[1];
            var szContent= null;
            
            switch(iField)
            {
                case 0:  //all
                    szContent = szContentDispo;
                break;
                
                case 1: // filename
                    szContent= szContentDispo.match(/filename="(.*?)"/)[1];
                break;
            };
            return szContent;  
        }
        catch(err)
        {
            return null;
        }
    },
    
    
    getEncoderType : function ()
    {
        try
        {
            if (!this.m_szHeaders) return null;  
            
            var szContentType = this.m_szHeaders.match(/Content-Transfer-Encoding:(.*?)$/im)[1];
            szContentType = szContentType.replace(/\s/,"");
            return szContentType;
        }
        catch(err)
        {
            return null;
        }
    },
    
    
    getAllHeaders : function ()
    {
        try
        {
            return this.m_szHeaders ?this.m_szHeaders : null;
        }
        catch(err)
        {
            DebugDump("headers.js: getHeaders : Exception : " + err.name 
                                                  + ".\nError message: " 
                                                  + err.message + "\n"
                                                  + err.lineNumber);
            return null;
        }
    },
    
    
    addressClean : function(szAddress)
    {
        szAddress = szAddress.replace("<","");
        szAddress = szAddress.replace(">","");
        szAddress = szAddress.replace(/\s/gm,""); 
        
        return szAddress;  
    },
}
