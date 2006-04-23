function headers(szHeaders)
{
    var scriptLoader =  Components.classes["@mozilla.org/moz/jssubscript-loader;1"];
    scriptLoader = scriptLoader.getService(Components.interfaces.mozIJSSubScriptLoader);
    scriptLoader.loadSubScript("chrome://web-mail/content/common/base64.js");
    scriptLoader.loadSubScript("chrome://web-mail/content/common/Quoted-Printable.js");
    scriptLoader.loadSubScript("chrome://web-mail/content/common/DebugLog.js");
        
    this.m_szHeaders = szHeaders;
    
    //remove folding
    this.m_szHeaders= this.m_szHeaders.replace(/\r?\n\s/gm," ");
}


headers.prototype =
{
    getTo : function ()
    {
        try
        {
            if (!this.m_szHeaders) return null;
            var szTo = this.m_szHeaders.match(/^To:(.*?)$/im)[1];
            return this.emailAddress(szTo);    
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
            var szCc = this.m_szHeaders.match(/^cc:(.*?)$/im)[1];   
            return this.emailAddress(szCc);  
        }
        catch(err)
        {
            return null;
        }
    },
    
    
    emailAddress :function (szAddress)
    {
         try
        {
            if (!szAddress) return null;
            szAddress = szAddress.replace(/".*?"/, ""); //remove name
            var aszAddress = szAddress.split(",");
            
            var szList =null;
            for (iListCount=0; iListCount<aszAddress.length; iListCount++)
            {
                var szTemp = "";
                try
                {  
                    szTemp = aszAddress[iListCount].match(/<(.*?@.*?)>/)[1];   
                }
                catch(e)
                {
                    szTemp = aszAddress[iListCount].match(/(.*?@.*?)$/)[1];  
                }
                
                if (iListCount!=aszAddress.length-1) szTemp+=", ";
                
                szList? szList+=szTemp: szList=szTemp;
            }  
            
            return szList;  
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
                    szContent= szContentType.match(/(.*?)\/.*?;?$/)[1];
                    szContent = szContent.replace(/\s/,"");
                break;
                
                case 2://subtype
                    szContent= szContentType.match(/.*?\/(.*?);?$/)[1];
                    szContent = szContent.replace(/\s/,"");
                break;
                
                case 3://boundary
                    szContent= szContentType.match(/ boundary="(.*?)"/)[1];
                    szContent = szContent.replace(/\s/,"");
                break;
                
                case 4://name
                    var szName= szContentType.match(/name="(.*?)"/i)[1];
                    szContent = this.decode(szName);
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
                    var szFilename= szContentDispo.match(/filename="(.*?)"/)[1];
                    szContent = this.decode(szFilename);
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
    
    
    decode : function (szValue)
    {
        var szDecoded = szValue;
        
        //check for encoding
        if (szValue.search(/^=\?.*?\?=$/)!=-1)
        {
            var aszEncoding = szValue.match(/^=\?(.*?)\?(.*?)\?(.*?)\?=$/);
            var szType = aszEncoding[2];
            if (szType.search(/B/i)!=-1)//base64
            {
                var oBase64 = new base64();
                szDecoded = oBase64.decode(aszEncoding[3]);
            }
            else if (szType.search(/Q/i)!=-1)//quoted printable
            {
                var oQP = new QuotedPrintable();
                szDecoded = oQP.decode(aszEncoding[3]);
            }  
        }
        
        return szDecoded;       
    },
}
