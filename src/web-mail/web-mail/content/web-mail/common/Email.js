function email (Log)
{
    try
    {
        var scriptLoader =  Components.classes["@mozilla.org/moz/jssubscript-loader;1"]
                                  .getService(Components.interfaces.mozIJSSubScriptLoader);
            
        scriptLoader.loadSubScript("chrome://web-mail/content/common/Header.js");
        scriptLoader.loadSubScript("chrome://web-mail/content/common/Body.js");
        scriptLoader.loadSubScript("chrome://web-mail/content/common/Attachments.js");
        scriptLoader.loadSubScript("chrome://web-mail/content/common/DebugLog.js");
        
        this.m_Log = Log;
    }
    catch(err)
    {
        DebugDump("Email.js: Constructor : Exception : " 
                                      + err.name 
                                      + ".\nError message: " 
                                      + err.message);
    }
}

email.prototype.headers = null;

email.prototype.body = null;

email.prototype.attachments = new Array();


email.prototype.parse = function (szRawEmail)
{
    try
    {
        this.m_Log.Write("email.js - parse - START"); 
        
        var iHeadersEnd = this.findHeaders(szRawEmail);
        var szHeaders = this.getHeaders(szRawEmail,iHeadersEnd);
        this.headers = new headers(this.m_Log , szHeaders);
        var szBody = this.getBody(szRawEmail,iHeadersEnd);
        this.body = new body();
         
        var szType = this.headers.getContentType(1);
        var szSubType = this.headers.getContentType(2);
        if (szType.search(/text/i)!=-1)
        {
            this.m_Log.Write("email.js - parse - text msg only"); 
                       
            if (szSubType.search(/html/)!=-1) this.body.setHtmlBody(szBody);      
            if (szSubType.search(/plain/)!=-1) this.body.setTxtBody(szBody);          
        }
        else if (szType.search(/multipart/i)!=-1)
        {
            this.m_Log.Write("email.js - parse - mulitpart msg");   
            
            var aszParts = this.getParts(this.headers, szBody);
            this.m_Log.Write("email.js - parse - Parts " + aszParts);
            
            var aTempAttach = this.processParts(aszParts);
            
            //process parts
            for (j=0; j<aTempAttach.length; j++)
            {
                this.m_Log.Write("email.js - parse - part "+j +" " +aTempAttach.length );
                var szType = aTempAttach[j].headers.getContentType(1);
                this.m_Log.Write("email.js - parse - type "+ szType);
                var szSubType = aTempAttach[j].headers.getContentType(2);
                this.m_Log.Write("email.js - parse - subtype "+ szSubType);
                
                var szFileName = aTempAttach[j].headers.getContentDisposition(1);
                this.m_Log.Write("email.js - parse - FileName "+ szFileName);
                var bFile = szFileName ? true : false;
                
                if (szSubType.search(/alternative/i)!=-1)
                {
                    //more parts
                    this.m_Log.Write("email.js - parse - more parts");
                    var iHeadersEnd = this.findHeaders(aTempAttach[j].headers);
                    var szHeaders = this.getHeaders(aTempAttach[j].body.getBody(1),iHeadersEnd);
                    var oHeader = new headers(this.m_Log , szHeaders);
                    var szBody = this.getBody(szRawEmail,iHeadersEnd);
                    var aszParts = this.getParts(this.headers, szBody);
                    aTempAttach.push(this.processParts(aszParts));
                }
                else if (szType.search(/text/i)!=-1 && !bFile)
                { 
                    this.m_Log.Write("email.js - parse - text/html MSG");
                    var szBody = aTempAttach[j].body.getBody(0);
                    if (szSubType.search(/html/)!=-1) this.body.setHtmlBody(szBody);      
                    if (szSubType.search(/plain/)!=-1) this.body.setTxtBody(szBody);  
                }
                else
                {
                    //files
                    this.m_Log.Write("email.js - parse - files");
                    var temp = new attachments(this.m_Log,
                                               aTempAttach[j].headers.getAllHeaders(),
                                               aTempAttach[j].body.getBody(0))
                    this.attachments.push(temp);
                }
            }                       
        }
        
        this.m_Log.Write("email.js - parse - End"); 
        return true;
    }
    catch(err)
    {
        this.m_Log.DebugDump("email.js: parse : Exception : " 
                                                  + err.name 
                                                  + ".\nError message: " 
                                                  + err.message);
        return false;
    }
}



email.prototype.findHeaders = function (szRawEmail)
{
     return szRawEmail.indexOf("\r\n\r\n")+4;
}


email.prototype.getHeaders = function (szRawEmail, iHeaderLength)
{
    this.m_Log.Write("email.js - getHeaders START");
    var szHeaders = szRawEmail.substr(0,iHeaderLength);
    this.m_Log.Write("email.js - getHeaders \n" + szHeaders + "\n" );
    szHeaders = szHeaders.replace(/;\r\n/gm,"; "); //remove folding 
    this.m_Log.Write("email.js - getHeaders END");
    return szHeaders;
}


email.prototype.getBody = function (szRawEmail, iHeaderLength)
{
    this.m_Log.Write("email.js - getbody START"); 
    var szBody = szRawEmail.substr(iHeaderLength);
    szBody = szBody.replace(/^\.$/gm,"");  //remove pop terminator
    szBody = szBody.replace(/^\.\./gm,"."); //remove pop padding
    this.m_Log.Write("email.js - getbody\n" + szBody + "\n"); 
    this.m_Log.Write("email.js - getbody END"); 
    return szBody;
}



email.prototype.getParts = function (oHeaders, szBody)
{
    this.m_Log.Write("email.js - getParts START"); 
    
    var szBoundary = oHeaders.getContentType(3);
    this.m_Log.Write("email.js - getParts - boundary " + szBoundary); 
    var regExp = new RegExp("--"+szBoundary+"([\\s\\S]*)"+"--"+szBoundary+"--");
    this.m_Log.Write("email.js - getParts - Bound RegExp " + regExp); 
    var aszParts = szBody.match(regExp)[1].split("--"+szBoundary);
    this.m_Log.Write("email.js -getParts - Parts " + aszParts);
    
    this.m_Log.Write("email.js - getParts END"); 
    return aszParts; 
}


email.prototype.processParts = function (aszParts)
{
    this.m_Log.Write("email.js - processParts START"); 
    var aTempAttach = new Array();
    
    //split email in parts
    for (i=0; i<aszParts.length; i++)
    {
        var iHeadersEnd = this.findHeaders(aszParts[i]);
        var szHeaders = this.getHeaders(aszParts[i],iHeadersEnd);
        this.m_Log.Write("email.js - processParts headers \n" + szHeaders + "\n" );
        var szBody = this.getBody(aszParts[i],iHeadersEnd);
        this.m_Log.Write("email.js - processParts body \n" + szBody + "\n" )
        var aAttch = new attachments(this.m_Log,szHeaders,szBody);
        aTempAttach.push(aAttch);
    }
            
    this.m_Log.Write("email.js - processParts END"); 
    return aTempAttach;
}
