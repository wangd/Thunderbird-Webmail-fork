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
    this.kTerminatorAlt = "\r\n";
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
        if (szMSG.search(/&#33;/g)!=-1) szMSG = szMSG.replace(/&#33;/gm, "!");        
        if (szMSG.search(/&#35;/g)!=-1) szMSG = szMSG.replace(/&#35;/gm, "#");
        if (szMSG.search(/&#36;/g)!=-1) szMSG = szMSG.replace(/&#36;/gm, "$"); 
        if (szMSG.search(/&#37;/g)!=-1) szMSG = szMSG.replace(/&#37;/gm, "%");
        if (szMSG.search(/&#38;/g)!=-1) szMSG = szMSG.replace(/&#38;/gm, "&");
        if (szMSG.search(/&#39;/g)!=-1) szMSG = szMSG.replace(/&#39;/gm, "'");
        if (szMSG.search(/&#40;/g)!=-1) szMSG = szMSG.replace(/&#40;/gm, "(");
        if (szMSG.search(/&#41;/g)!=-1) szMSG = szMSG.replace(/&#41;/gm, ")");
        if (szMSG.search(/&#42;/g)!=-1) szMSG = szMSG.replace(/&#42;/gm, "*");
        if (szMSG.search(/&#43;/g)!=-1) szMSG = szMSG.replace(/&#43;/gm, "+");
        if (szMSG.search(/&#47;/g)!=-1) szMSG = szMSG.replace(/&#47;/gm, "/");
        if (szMSG.search(/&#60;/g)!=-1) szMSG = szMSG.replace(/&#60;/gm, "<");
        if (szMSG.search(/&#62;/g)!=-1) szMSG = szMSG.replace(/&#62;/gm, ">");
        if (szMSG.search(/&#63;/g)!=-1) szMSG = szMSG.replace(/&#63;/gm, "?");
        if (szMSG.search(/&#64;/g)!=-1) szMSG = szMSG.replace(/&#64;/gm, "@");
        if (szMSG.search(/&#91;/g)!=-1) szMSG = szMSG.replace(/&#91;/gm, "[");
        if (szMSG.search(/&#92;/g)!=-1) szMSG = szMSG.replace(/&#92;/gm, "\\");
        if (szMSG.search(/&#93;/g)!=-1) szMSG = szMSG.replace(/&#93;/gm, "]");
        if (szMSG.search(/&#94;/g)!=-1) szMSG = szMSG.replace(/&#94;/gm, "^");
        if (szMSG.search(/&#95;/g)!=-1) szMSG = szMSG.replace(/&#95;/gm, "_");
        if (szMSG.search(/&#96;/g)!=-1) szMSG = szMSG.replace(/&#96;/gm, "`");
        if (szMSG.search(/&#123;/g)!=-1) szMSG = szMSG.replace(/&#123;/gm, "{");
        if (szMSG.search(/&#124;/g)!=-1) szMSG = szMSG.replace(/&#124;/gm, "|");
        if (szMSG.search(/&#125;/g)!=-1) szMSG = szMSG.replace(/&#125;/gm, "}");
        if (szMSG.search(/&#126;/g)!=-1) szMSG = szMSG.replace(/&#126;/gm, "~");

        //some more MS use
        if (szMSG.search(/&lt;/g)!=-1) szMSG = szMSG.replace(/&lt;/gm,"<");
        if (szMSG.search(/&gt;/g)!=-1) szMSG = szMSG.replace(/&gt;/gm,">");
        if (szMSG.search(/&quot;/g)!=-1) szMSG = szMSG.replace(/&quot;/gm,"\"");
        if (szMSG.search(/&amp;/g)!=-1) szMSG = szMSG.replace(/&amp;/gm,"&");
        if (szMSG.search(/&nbsp;/g)!=-1) szMSG = szMSG.replace(/&nbsp;/gm," ");
        if (szMSG.search(/&apos;/g)!=-1) szMSG = szMSG.replace(/&apos;/gm,"\'");
        if (szMSG.search(/\r/g)!=-1) szMSG = szMSG.replace(/\r/gm,"");
        if (szMSG.search(/\n/g)!=-1) szMSG = szMSG.replace(/\n/gm,"\r\n");

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


HTMLescape.prototype.decodeAsync = function(rawMSG, callback, parent)
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
        //this.m_iStreamSize = this.m_inStream.available();
        this.m_Log.Write("HTMLescape.js - largeDecode - Size " + this.m_inStream.available());
        
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
                
        //this.m_iCurrentRead += this.kBlockSize;
        this.m_Log.Write("HTMLescape.js - notify - Block Size " + this.m_szTempMSG.length);               
        
        //clean only complete lines
        var iComplete = this.m_szTempMSG.lastIndexOf(this.kTerminator )
        if (iComplete ==-1)
            iComplete = this.m_szTempMSG.lastIndexOf(this.kTerminatorAlt)+ this.kTerminatorAlt.length;
        else
            iComplete += this.kTerminator.length
        this.m_Log.Write("HTMLescape.js - notify - iComplete " + iComplete);    

        var szToClean = this.m_szTempMSG.substr(0,iComplete );
        var szDirty = this.m_szTempMSG.substr(iComplete, this.m_szTempMSG.length-iComplete);
        this.m_szTempMSG = szDirty;
        
        this.m_szCleanMSG += this.decode(szToClean); 
        
        //stream completed
        if (this.m_inStream.available() == 0)  
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