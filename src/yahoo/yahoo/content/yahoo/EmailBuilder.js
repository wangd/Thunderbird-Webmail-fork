function emailBuilder ()
{
    try
    {
        var scriptLoader =  Components.classes["@mozilla.org/moz/jssubscript-loader;1"]
        scriptLoader = scriptLoader.getService(Components.interfaces.mozIJSSubScriptLoader);
        scriptLoader.loadSubScript("chrome://web-mail/content/common/Header.js");
        scriptLoader.loadSubScript("chrome://web-mail/content/common/Body.js");
        scriptLoader.loadSubScript("chrome://web-mail/content/common/MimePart.js");
        scriptLoader.loadSubScript("chrome://web-mail/content/common/base64.js");
        scriptLoader.loadSubScript("chrome://web-mail/content/common/DebugLog.js");

        this.m_Log = new DebugLog("webmail.logging.comms",
                                  "{3c8e8390-2cf6-11d9-9669-0800200c9a66}",
                                  "emailBuilder"),

        this.m_oHeader = null;
        this.m_aoBodyPart = new Array();
        this.m_bHTML = false;
        this.m_bPlain = false;
    }
    catch(err)
    {
        DebugDump("emailBuilder.js: Constructor : Exception : " + err.name
                                                         + ".\nError message: "
                                                         + err.message  +"\n"
                                                         + err.lineNumber);
    }
}



emailBuilder.prototype.setEnvolpeHeaders = function (szHeader)
{
    try
    {
        this.m_Log.Write("emailBuilder.js - setEnvolpeHeaders - START");
        this.m_Log.Write("emailBuilder.js - setEnvolpeHeaders - szHeader " + szHeader);

        if (this.m_oHeader) delete this.m_oHeader;
        this.m_oHeader = new headers(szHeader);

        this.m_Log.Write("emailBuilder.js - setEnvolpeHeaders - END");
    }
    catch(err)
    {
        this.m_Log.DebugDump("emailBuilder.js: setEnvolpeHeaders : Exception : " + err.name
                                                  + ".\nError message: "
                                                  + err.message + "\n"
                                                  + err.lineNumber);
    }
}


emailBuilder.prototype.addBody = function (szHeader, szBody)
{
    try
    {
        this.m_Log.Write("emailBuilder.js - addBody - START");
        this.m_Log.Write("emailBuilder.js - addBody - szHeader \n" + szHeader + "\nBody \n" + szBody);

        var oPart = new mimePart (szHeader? szHeader : "", szBody);
        //get type
        if (szHeader)
        {
            if (!oPart.headers.getContentDisposition(1))  //not file
            {
                this.m_Log.Write("emailBuilder.js - addBody - not file");
                var szSubType = oPart.headers.getContentType(2);
                if (szSubType.search(/plain/i)!=-1)
                {
                    this.m_Log.Write("emailBuilder.js - addBody - plain");
                    this.m_bPlain = true;
                }
                else if (szSubType.search(/html/i)!=-1)
                {
                    this.m_Log.Write("emailBuilder.js - addBody - html");
                    this.m_bHTML = true;
                }
            }
        }

        this.m_aoBodyPart.push(oPart);

        this.m_Log.Write("emailBuilder.js - addBody - END");
    }
    catch(err)
    {
        this.m_Log.DebugDump("emailBuilder.js: addBody : Exception : " + err.name
                                                  + ".\nError message: "
                                                  + err.message + "\n"
                                                  + err.lineNumber);
    }
}


emailBuilder.prototype.build = function ()
{
    try
    {
        this.m_Log.Write("emailBuilder.js - build - START");

        var szEmail = "";

        if (this.m_aoBodyPart.length==1) //no attachments
        {//html or plain
            var aHeaders = this.m_oHeader.getAllHeadersArray();
            for (var i =0; i<aHeaders.length; i++)
            {
                var szName = aHeaders[i].szName;
                this.m_Log.Write("emailBuilder.js - Headers - szName "+ szName);
                szEmail += szName;
                szEmail += ": ";
                var szValue = aHeaders[i].szValue;
                this.m_Log.Write("emailBuilder.js - Headers - szValue "+ szValue);

                szEmail += szValue;
                szEmail += "\r\n";
            }
            szEmail +="\r\n";

            this.m_Log.Write("emailBuilder.js - build - plain or html part only");
            szEmail += this.m_aoBodyPart[0].body.getBody();
        }
        else //has attachments
        {
            
        }
        
        szEmail = szEmail.replace(/^\./mg,"..");    //bit padding       
        var iMsgLength = szEmail.length-1;
        var iLastIndex = szEmail.lastIndexOf("\n")
        szEmail += "\r\n.\r\n";  //msg end
        
        this.m_Log.Write("emailBuilder.js - build - END");
        return szEmail;
    }
    catch(err)
    {
        this.m_Log.DebugDump("emailBuilder.js: build : Exception : " + err.name
                                                  + ".\nError message: "
                                                  + err.message + "\n"
                                                  + err.lineNumber);
    }
}
