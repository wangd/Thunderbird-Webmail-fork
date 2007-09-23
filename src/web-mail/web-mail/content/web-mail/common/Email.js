function email (Log)
{
    try
    {
        var scriptLoader =  Components.classes["@mozilla.org/moz/jssubscript-loader;1"]
        scriptLoader = scriptLoader.getService(Components.interfaces.mozIJSSubScriptLoader);
        scriptLoader.loadSubScript("chrome://web-mail/content/common/Header.js");
        scriptLoader.loadSubScript("chrome://web-mail/content/common/Body.js");
        scriptLoader.loadSubScript("chrome://web-mail/content/common/MimePart.js");
        scriptLoader.loadSubScript("chrome://web-mail/content/common/base64.js");
        scriptLoader.loadSubScript("chrome://web-mail/content/common/Quoted-Printable.js");
        scriptLoader.loadSubScript("chrome://web-mail/content/common/DebugLog.js");

        this.m_Log = new DebugLog("webmail.logging.comms",
                                  "{3c8e8390-2cf6-11d9-9669-0800200c9a66}",
                                  "EMail Parser"),
        this.m_bDecodeBody = false;
    }
    catch(err)
    {
        DebugDump("Email.js: Constructor : Exception : " + err.name
                                                         + ".\nError message: "
                                                         + err.message  +"\n"
                                                         + err.lineNumber);
    }
}

email.prototype.headers = null;

email.prototype.txtBody = null;

email.prototype.htmlBody = null;

email.prototype.attachments = new Array();


email.prototype.parse = function (szRawEmail)
{
    try
    {
        this.m_Log.Write("email.js - parse - START");

        var szEmail = szRawEmail.replace(/^\.$/gm,""); //remove pop terminator
        szEmail = szEmail.replace(/^\.\./gm,"."); //remove pop padding

        //split header and body
        var oTempBody = {value : null};
        var oTempHeaders ={value : null};
        this.splitHeaderBody(szEmail, oTempHeaders, oTempBody);
        this.headers = new headers(oTempHeaders.value);
        var oBody = new body(oTempBody.value);
        oTempBody = null;
        oTempHeaders = null;

        this.process(this.headers, oBody );

        this.m_Log.Write("email.js - parse - End");
        return true;
    }
    catch(err)
    {
        this.m_Log.DebugDump("email.js: parse : Exception : " + err.name
                                                  + ".\nError message: "
                                                  + err.message + "\n"
                                                  + err.lineNumber);
        return false;
    }
}


email.prototype.splitHeaderBody = function (szRaw, oHeader, oBody)
{
    this.m_Log.Write("email.js - splitHeaderBody START");
    this.m_Log.Write("email.js - splitHeaderBody szRaw\n"+ szRaw);
    var iEndHeaders = szRaw.search(/\r?\n\r?\n/gm);
    this.m_Log.Write("email.js - splitHeaderBody iEndHeaders "+ iEndHeaders);
    oHeader.value= szRaw.substring(0,iEndHeaders );
    var istartBody = iEndHeaders +4;
    this.m_Log.Write("email.js - splitHeaderBody istartBody "+ istartBody);
    oBody.value = szRaw.substring(istartBody)

    oHeader.value = oHeader.value.replace(/;\r\n/gm,"; "); //remove folding for headers

    this.m_Log.Write("email.js - splitHeaderBody Headers\n"+ oHeader.value);
    this.m_Log.Write("email.js - splitHeaderBody END");
    return true;
}


email.prototype.splitBoundary = function (szBoundary, szBody)
{
    this.m_Log.Write("email.js - splitBoundary START");
    this.m_Log.Write("email.js - splitBoundary - boundary " + szBoundary);

    var szStartBoundary = "--"+szBoundary+"\r\n";
    var iStart = szBody.search(szStartBoundary);
    var szEndBoundary = "\r\n--"+szBoundary+"--"
    var iEnd = szBody.search(szEndBoundary);
    var aszParts = szBody.substring(iStart+szStartBoundary.length,iEnd).split(szStartBoundary);
    this.m_Log.Write("email.js -splitBoundary - Parts " + aszParts.length);

    //split email in parts
    var aTempAttach = new Array();
    for (i=0; i<aszParts.length; i++)
    {
        var oBody = {value :null};
        var oHeader = {value : null};
        var aPart = this.splitHeaderBody(aszParts[i],oHeader, oBody);
        aTempAttach.push(new mimePart(oHeader.value, oBody.value));
        oBody = null;
        oHeader = null;
    }

    this.m_Log.Write("email.js - splitBoundary END");
    return aTempAttach;
}


email.prototype.decodeBody = function (bDecoded)
{
    this.m_bDecodeBody = bDecoded;
}


email.prototype.decode = function (szEncoding, szBody)
{
    try
    {
        this.m_Log.Write("email.js - decode - START");

        var szDecoded = szBody;
        if (szEncoding.search(/base64/i)!=-1)
        {
            this.m_Log.Write("email.js - decode - encoded B64");
            var oBase64 = new base64();
            szDecoded = oBase64.decode(szBody.replace(/\r?\n/gm,""));
        }
        else if (szEncoding.search(/quoted-printable/i)!=-1)
        {
            this.m_Log.Write("email.js - decode - encoded QP");
            var oQP = new QuotedPrintable();
            szDecoded = oQP.decode(szBody);
        }
        else
        {
            this.m_Log.Write("email.js - decode - no encoding");
            szDecoded = szBody;
        }
        this.m_Log.Write("email.js - decode - END");
        return szDecoded;
    }
    catch(err)
    {
        this.m_Log.DebugDump("email.js: decode : Exception : " + err.name
                                                  + ".\nError message: "
                                                  + err.message + "\n"
                                                  + err.lineNumber);
        return szBody;
    }
}


//I hate recursive functions
email.prototype.process = function (oHeaders , oBody)
{
    try
    {
        this.m_Log.Write("email.js - process - START");

        var szType = oHeaders.getContentType(1);
        this.m_Log.Write("email.js - process - type "+ szType);
        var szSubType = oHeaders.getContentType(2);
        this.m_Log.Write("email.js - process - subtype "+ szSubType);
        var szFileName = oHeaders.getContentDisposition(1);
        if (!szFileName) szFileName = oHeaders.getContentType(4);
        this.m_Log.Write("email.js - process - FileName "+ szFileName);
        var bFile = szFileName ? true : false;

        //check for embedded images
        if (szType.search(/image/i)!=-1 && !bFile) bFile = true

        //text\html
        if (szType.search(/text/i)!=-1 && szSubType.search(/html/)!=-1  && !bFile)
        {
            var szBody = oBody.getBody();
            if (this.m_bDecodeBody)
            {
                var szEncoding = oHeaders.getEncoderType();
                szBody = this.decode(szEncoding, szBody);
            }
            this.htmlBody = new mimePart(oHeaders.getAllHeaders(),szBody);
        }
        //text\plain
        else if (szType.search(/text/i)!=-1 && szSubType.search(/plain/)!=-1 && !bFile)
        {
            var szBody = oBody.getBody();
            if (this.m_bDecodeBody)
            {
                var szEncoding = oHeaders.getEncoderType();
                szBody = this.decode(szEncoding, szBody);
            }

            this.txtBody = new mimePart(oHeaders.getAllHeaders(),szBody);
        }
        //multipart/?????
        else if (szType.search(/multipart/i)!=-1)
        {
            this.m_Log.Write("email.js - process - mulitpart msg");
            var szBoundary = oHeaders.getContentType(3);
            var aTempAttach = this.splitBoundary(szBoundary, oBody.getBody());

            aTempAttach.forEach(this.moreProcessing,this);   //other parts
        }
        //files
        else
        {
            this.m_Log.Write("email.js - parse - files");
            var szBody = oBody.getBody();
            var szHeaders = oHeaders.getAllHeaders();

            if (this.m_bDecodeBody)
            {
                var szEncoding = oHeaders.getEncoderType();
                szBody = this.decode(szEncoding,szBody);
            }

            this.m_Log.Write("email.js - process - files headers\n" +szHeaders);
            //this.m_Log.Write("email.js - process - files body\n" +szBody);
            this.attachments.push(new mimePart(szHeaders,szBody));
        }

        this.m_Log.Write("email.js - process - END");
    }
    catch(err)
    {
        this.m_Log.DebugDump("email.js: process : Exception : " + err.name
                                                  + ".\nError message: "
                                                  + err.message + "\n"
                                                  + err.lineNumber);
    }
}


email.prototype.moreProcessing = function (mimePart, index, array)
{
    try
    {
        this.m_Log.Write("email.js - moreProcessing - START");

        var szSubType = mimePart.headers.getContentType(2);
        this.m_Log.Write("email.js - moreProcessing - subtype "+ szSubType);

        if (szSubType.search(/alternative/i)!=-1)
        {
            //more parts
            this.m_Log.Write("email.js - moreProcessing - more parts");
            var szBoundary = mimePart.headers.getContentType(3);
            var szBody =  mimePart.body.getBody();
            var aParts = this.splitBoundary(szBoundary,szBody);
            aParts.forEach(this.moreProcessing,this);
        }
        else
        {
            this.m_Log.Write("email.js - moreProcessing - processing required");
            this.process(mimePart.headers,mimePart.body);
        }
        this.m_Log.Write("email.js - moreProcessing - END");
    }
    catch(err)
    {
        this.m_Log.DebugDump("email.js: moreProcessing : Exception : " + err.name
                                                  + ".\nError message: "
                                                  + err.message + "\n"
                                                  + err.lineNumber);
    }
}
