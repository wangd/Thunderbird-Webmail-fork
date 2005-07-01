function headers(Log, szHeaders)
{
    var scriptLoader =  Components.classes["@mozilla.org/moz/jssubscript-loader;1"]
                                  .getService(Components.interfaces.mozIJSSubScriptLoader);
    scriptLoader.loadSubScript("chrome://web-mail/content/common/DebugLog.js");
    
    this.m_Log = Log;
    this.szHeaders = szHeaders;
}


headers.prototype =
{
    getTo : function ()
    {
        try
        {
            this.m_Log.Write("headers.js - getTo - START");
            
            if (!this.szHeaders) return null;
            
            var szTo = null;
            try
            {
                szTo = this.szHeaders.match(/To:(.*?)$/im)[1];
                szTo = this.addressClean(szTo);  
            }
            catch(e){}
            this.m_Log.Write("headers.js - getTo - szTo " + szTo);
            
            this.m_Log.Write("headers.js - getTo - End");
            return szTo;
        }
        catch(err)
        {
            this.m_Log.DebugDump("headers.js: getTo : Exception : " 
                                                  + err.name 
                                                  + ".\nError message: " 
                                                  + err.message);
                                                  
            return null;          
        }
    },
    
    
    getBcc : function ()
    {
        try
        {
            this.m_Log.Write("headers.js - getBcc - START");
            if (!this.szHeaders) return null;
            
            var szBcc = null;
            var szTo = this.getTo();
            var szCc = this.getCc();
            
            var szAddress = null;
            if (szTo) szAddress = szTo;
            if (szCc) szAddress = (szTo ? (szAddress + ","+ szCc) : szCc);
            this.m_Log.Write("headers.js - getBcc - szAddress " + szAddress);
            
            var szRcptList = this.szHeaders.match(/x-Rcpt:(.*?)$/im)[1];
            szRcptList = this.addressClean(szRcptList);
            this.m_Log.Write("headers.js - getBcc - szRcptList " + szRcptList);  
           
            if (!szAddress) 
                szBcc = szRcptList;
            else
            {     
                var aszRcptList = szRcptList.split(",");
                this.m_Log.Write("headers.js - getBcc - aszAddress " + aszRcptList);
                for (i=0; i<aszRcptList.length; i++)
                {
                    var regExp = new RegExp(aszRcptList[i]);
                    if (szAddress.search(regExp)==-1)
                    {    
                        szBcc? (szBcc += aszRcptList[i]) : (szBcc = aszRcptList[i]);
                        szBcc +=",";
                    }
                }
            }
            this.m_Log.Write("headers.js - getBcc szBcc- " + szBcc);
            
            this.m_Log.Write("headers.js - getBcc - End");
            return szBcc;  
        }
        catch(err)
        {
            this.m_Log.DebugDump("headers.js: getBcc : Exception : " 
                                                  + err.name 
                                                  + ".\nError message: " 
                                                  + err.message);
                                                  
            return null;
        }
    },
    
    
    
    getCc : function ()
    {
        try
        {
            this.m_Log.Write("headers.js - getCc - START");
            if (!this.szHeaders) return null;
            
            var szCc = null;   
            try
            {
                szCc = this.szHeaders.match(/CC:(.*?)$/im)[1];
                szCc = this.addressClean(szCc);
            }
            catch(e){}
            this.m_Log.Write("headers.js - getCc - szCc - "+szCc);
            
            this.m_Log.Write("headers.js - getCc - END");
            return szCc;  
        }
        catch(err)
        {
            this.m_Log.DebugDump("headers.js: getCc : Exception : " 
                                                  + err.name 
                                                  + ".\nError message: " 
                                                  + err.message);
            return null;
        }
    },
    
    
    getSubject : function ()
    {
        try
        {
            this.m_Log.Write("headers.js - getSubject - START");
            if (!this.szHeaders) return null;
        
            var szSubject = null;
            try
            {
                szSubject = this.szHeaders.match(/Subject:(.*?)$/im)[1];
            }
            catch(e){}
            
            this.m_Log.Write("headers.js - szSubject - " + szSubject);
           
            this.m_Log.Write("headers.js - getSubject - START");
            return szSubject;  
        }
        catch(err)
        {
            this.m_Log.DebugDump("headers.js: getSubject : Exception : " 
                                                  + err.name 
                                                  + ".\nError message: " 
                                                  + err.message);
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
            this.m_Log.Write("headers.js - getContentType - START " + iField);
            if (!this.szHeaders) return null; 
           
            var szContentType = this.szHeaders.match(/Content-Type:(.*?)$/im)[1];
            var szContent= null;
            
            switch(iField)
            {
                case 0:  //all
                    szContent = szContentType;
                break;
                
                case 1: // type
                    szContent= szContentType.match(/(.*?)\/.*?;/)[1];
                    szContent.replace(" ","");
                break;
                
                case 2://subtype
                    szContent= szContentType.match(/.*?\/(.*?);/)[1];
                    szContent.replace(" ","");
                break;
                
                case 3://boundary
                    szContent= szContentType.match(/ boundary="(.*?)"/)[1];
                    szContent.replace(" ","");
                break;
            };
            this.m_Log.Write("headers.js - getContentType - szContent "+ szContent);
            
            this.m_Log.Write("headers.js - getContentType - End");
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
            this.m_Log.Write("headers.js - getContentDisposition - START " + iField);
            if (!this.szHeaders) return null; 
           
            var szContentDispo = this.szHeaders.match(/Content-Disposition:(.*?)$/im)[1];
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
            this.m_Log.Write("headers.js - getContentDisposition - szContent "+ szContent);
            
            this.m_Log.Write("headers.js - getContentDisposition - End");
            return szContent;  
        }
        catch(err)
        {
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
