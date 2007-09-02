function HTMLescape()
{
    var scriptLoader =  Components.classes["@mozilla.org/moz/jssubscript-loader;1"];
    scriptLoader = scriptLoader.getService(Components.interfaces.mozIJSSubScriptLoader);
    scriptLoader.loadSubScript("chrome://web-mail/content/common/DebugLog.js");
           
    var  szLogFileName = "HTML escape Log ";
    this.m_Log = new DebugLog("webmail.logging.comms", ExtHotmailGuid, szLogFileName);
    
    this.m_Timer = Components.classes["@mozilla.org/timer;1"]
                             .createInstance(Components.interfaces.nsITimer); 
                             
    this.kBlockSize = 5000;
    this.kTerminator = "&#13;&#10;";
    this.m_iCurrentRead = 0;
    this.m_iStreamSize = 0;
    this.m_inStream = null;
    this.m_szCleanMSG = "";
    this.m_szTempMSG = "";
    this.m_callback= null;
    this.m_parent = null;
}


HTMLescape.prototype.encode = function(msg)
{
    return msg;
}

HTMLescape.prototype.decode = function(rawMSG)
{
    try
    {
        var szMSG = rawMSG;

        //&#00;-&#08;                Unused
        //&#11;-&#12;                Unused
        //&#14;-&#31;                Unused
        //&#32; = \s                 MS not using
        //&#44; = ,                  MS not using
        //&#45; = -                  MS not using
        //&#46; = .                  MS not using
        //&#48;-&#57;      0-9       Digits 0-9
        //&#65;-&#90;      A-Z       Letters A-Z
        //&#97;-&#122;     a-z       Letters a-z
        //&#127;-&#159;              Unused
        //&#160;-&#255               Unlikely
        
        //most likely
        szMSG = szMSG.replace(/&#9;/gm, "\t")         .replace(/&#09;/gm, "\t")
                     .replace(/&#13;&#10;/gm, "\r\n") .replace(/&#34;/gm, "\"")
                     .replace(/&#58;/gm, ":")         .replace(/&#59;/gm, ";")
                     .replace(/&#61;/gm, "=");
                     
        //might be there
        if (szMSG.search(/&#33;/gm)!=-1) szMSG = szMSG.replace(/&#33;/gm, "!");        
        if (szMSG.search(/&#35;/gm)!=-1) szMSG = szMSG.replace(/&#35;/gm, "#");
        if (szMSG.search(/&#36;/gm)!=-1) szMSG = szMSG.replace(/&#36;/gm, "$"); 
        if (szMSG.search(/&#37;/gm)!=-1) szMSG = szMSG.replace(/&#37;/gm, "%");
        if (szMSG.search(/&#38;/gm)!=-1) szMSG = szMSG.replace(/&#38;/gm, "&");
        if (szMSG.search(/&#39;/gm)!=-1) szMSG = szMSG.replace(/&#39;/gm, "'");
        if (szMSG.search(/&#40;/gm)!=-1) szMSG = szMSG.replace(/&#40;/gm, "(");
        if (szMSG.search(/&#41;/gm)!=-1) szMSG = szMSG.replace(/&#41;/gm, ")");
        if (szMSG.search(/&#42;/gm)!=-1) szMSG = szMSG.replace(/&#42;/gm, "*");
        if (szMSG.search(/&#43;/gm)!=-1) szMSG = szMSG.replace(/&#43;/gm, "+");
        if (szMSG.search(/&#47;/gm)!=-1) szMSG = szMSG.replace(/&#47;/gm, "/");
        if (szMSG.search(/&#60;/gm)!=-1) szMSG = szMSG.replace(/&#60;/gm, "<");
        if (szMSG.search(/&#62;/gm)!=-1) szMSG = szMSG.replace(/&#62;/gm, ">");
        if (szMSG.search(/&#63;/gm)!=-1) szMSG = szMSG.replace(/&#63;/gm, "?");
        if (szMSG.search(/&#64;/gm)!=-1) szMSG = szMSG.replace(/&#64;/gm, "@");
        if (szMSG.search(/&#91;/gm)!=-1) szMSG = szMSG.replace(/&#91;/gm, "[");
        if (szMSG.search(/&#92;/gm)!=-1) szMSG = szMSG.replace(/&#92;/gm, "\\");
        if (szMSG.search(/&#93;/gm)!=-1) szMSG = szMSG.replace(/&#93;/gm, "]");
        if (szMSG.search(/&#94;/gm)!=-1) szMSG = szMSG.replace(/&#94;/gm, "^");
        if (szMSG.search(/&#95;/gm)!=-1) szMSG = szMSG.replace(/&#95;/gm, "_");
        if (szMSG.search(/&#96;/gm)!=-1) szMSG = szMSG.replace(/&#96;/gm, "`");
        if (szMSG.search(/&#123;/gm)!=-1) szMSG = szMSG.replace(/&#123;/gm, "{");
        if (szMSG.search(/&#124;/gm)!=-1) szMSG = szMSG.replace(/&#124;/gm, "|");
        if (szMSG.search(/&#125;/gm)!=-1) szMSG = szMSG.replace(/&#125;/gm, "}");
        if (szMSG.search(/&#126;/gm)!=-1) szMSG = szMSG.replace(/&#126;/gm, "~");

        return szMSG;
    }
    catch(e)
    {
        DebugDump("HTML-escape.js : Exception in decode "
                                + e.name +
                                ".\nError message: "
                                + e.message + "\n"
                                + e.lineNumber);
        return null;
    }
}


HTMLescape.prototype.largeDecode = function(rawMSG, callback, parent)
{
    try
    {
        this.m_Log.Write("HTMLescape.js - largeDecode - START");
        
        var stream = Components.classes["@mozilla.org/io/string-input-stream;1"]
                               .createInstance(Components.interfaces.nsIStringInputStream);
        stream.setData(rawMSG,-1);
        
        if (this.m_inStream) this.m_inStream.close();      
        this.m_inStream = Components.classes["@mozilla.org/scriptableinputstream;1"]
                                    .createInstance(Components.interfaces.nsIScriptableInputStream);
        this.m_inStream.init(stream); 
        
        this.m_callback = callback;
        this.m_parent = parent;
        this.m_iCurrentRead = 0;
        this.m_szTempMSG = "";
        this.m_szCleanMSG = "";
        this.m_iStreamSize = this.m_inStream.available();
        this.m_Log.Write("HTMLescape.js - largeDecode - Size " + this.m_iStreamSize);
        
        this.m_Timer.initWithCallback(this,
                                      10,
                                      Components.interfaces.nsITimer.TYPE_REPEATING_SLACK);
       
        this.m_Log.Write("HTMLescape.js - largeDecode - END");
        return true;
    }
    catch(err)
    {
         this.m_Log.DebugDump("HTMLescape.js: largeDecode : Exception : "
                                          + err.name
                                          + ".\nError message: "
                                          + err.message +"\n"
                                          + err.lineNumber);

        return false;
    }
}


HTMLescape.prototype.notify = function (timer)
{
    try
    {
        this.m_Log.Write("HTMLescape.js - notify - START");
               
        this.m_szTempMSG += this.m_inStream.read(this.kBlockSize);
        this.m_Log.Write("HTMLescape.js - notify - Raw Block \n" + this.m_szTempMSG);
                
        this.m_iCurrentRead += this.kBlockSize;
        this.m_Log.Write("HTMLescape.js - notify - Block Size " + this.m_iCurrentRead);               
        
        //clean only complete lines
        var iComplete = this.m_szTempMSG.lastIndexOf(this.kTerminator )+ this.kTerminator.length;
        var szToClean = this.m_szTempMSG.substr(0,iComplete );
        var szDirty = this.m_szTempMSG.substr(iComplete, this.m_szTempMSG.length-iComplete);
        this.m_szTempMSG = szDirty;
        
        this.m_szCleanMSG += this.decode(szToClean); 
        
        //stream completed
        if (this.m_iCurrentRead >= this.m_iStreamSize)  
        {
            timer.cancel();
            this.m_inStream.close();
            this.m_inStream = null;
            if (this.m_szTempMSG.length>0) this.m_szCleanMSG += this.decode(this.m_szTempMSG); 
            this.m_Log.Write("HTMLescape.js - notify - Clean Message \n" + this.m_szCleanMSG);
            this.m_callback(this.m_szCleanMSG, this.m_parent );
            this.m_szTempMSG = null;
        }
          
        this.m_Log.Write("HTMLescape.js - notify - END");
    }
    catch(err)
    {
         this.m_Log.DebugDump("HTMLescape.js: notify : Exception : "
                                          + err.name
                                          + ".\nError message: "
                                          + err.message +"\n"
                                          + err.lineNumber);
        
         this.m_callback(null, this.m_parent );
    }
}