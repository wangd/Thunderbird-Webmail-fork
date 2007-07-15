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
                if (szSubType.search(/plain/,i)!=-1)
                {
                    this.m_Log.Write("emailBuilder.js - addBody - plain");
                    this.m_bPlain = true;
                }
                else if (szSubType.search(/html/,i)!=-1)
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

        if (this.m_aoBodyPart.length==1) //only one part
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

                if (szName.search(/content-type/i)!=-1)
                {
                    this.m_Log.Write("emailBuilder.js - Headers - found content type ");
                    if (szValue.search(/plain/i)==-1 && szValue.search(/html/i)==-1)
                    {
                        this.m_Log.Write("emailBuilder.js - Headers - getting content type ");
                        var szContentType = this.m_aoBodyPart[0].headers.getContentType(1);
                        szContentType += "/";
                        szContentType += this.m_aoBodyPart[0].headers.getContentType(2);
                        this.m_Log.Write("emailBuilder.js - Headers - szContentType "+ szContentType);
                        szValue = szContentType;
                    }
                }

                szEmail += szValue;
                szEmail += "\r\n";
            }
            szEmail +="\r\n";

            this.m_Log.Write("emailBuilder.js - build - plain or html part only");
            szEmail += this.m_aoBodyPart[0].body.getBody();
        }
        else  //muilt part email
        {
            szEmail += this.m_oHeader.getAllHeaders();
            szEmail += "This email was created By Yahoo Webmail Extension\r\n";

            var szBaseBoundary = this.m_oHeader.getContentType(3); //get boundary
            var szStartBoundary = "\r\n--" + szBaseBoundary + "\r\n";
            var szEndBoundary = "\r\n--" + szBaseBoundary + "--\r\n\r\n";

            //is this alternative only
            var szSubType = this.m_oHeader.getContentType(2);
            if (szSubType.search(/alternative/i)!=-1)
            {
                this.m_Log.Write("emailBuilder.js - build - plain and html part");
                var bMultiPart = false;
                var sz2ndStartBoundary = null;
                var sz2ndEndBoundary = null
                for (var i=0; i<this.m_aoBodyPart.length; i++)
                {
                    szEmail += sz2ndStartBoundary? sz2ndStartBoundary : szStartBoundary;
                    var szHeaders = this.m_aoBodyPart[i].headers.getAllHeaders();
                    if (szHeaders.search(/html/i)!=-1 && this.m_aoBodyPart.length>2)
                    {
                        if (!sz2ndStartBoundary)
                        {
                            var sz2ndBoundary = szBaseBoundary+"ALTBoundary";
                            sz2ndStartBoundary = "\r\n--" + sz2ndBoundary + "\r\n";
                            sz2ndEndBoundary =  "\r\n--" + sz2ndBoundary + "--\r\n\r\n";
                        }
                        szEmail += "Content-Type: multipart/related; boundary=\""+sz2ndBoundary+"\"\r\n\r\n";
                        szEmail += sz2ndStartBoundary;
                        bMultiPart = true;
                    }
                    szEmail += szHeaders;
                    szEmail += this.m_aoBodyPart[i].body.getBody();
                }
                if (bMultiPart) szEmail += sz2ndEndBoundary;
                szEmail += szEndBoundary;
            }
            else //mixed
            {
                //alternative
                if (this.m_bHTML && this.m_bPlain)
                {
                    this.m_Log.Write("emailBuilder.js - build - mixed part with alternative");

                    szEmail += szStartBoundary;
                    var szAltBoundary = "--AltPartYExt080703070009060604010001"
                    var szStartAltBoundary = "\r\n--"+szAltBoundary + "\r\n";
                    var szEndAltBoundary = "\r\n--"+szAltBoundary + "--\r\n\r\n";
                    szEmail += "Content-Type: multipart/alternative; boundary=\"" +szAltBoundary +"\"\r\n\r\n";

                    var aTemp = new Array()
                    aTemp = aTemp.concat(this.m_aoBodyPart);
                    var k =0;
                    var iLength = aTemp.length;
                    do
                    {
                        var oData =  aTemp.shift();
                        if (oData)
                        {
                            if (!oData.headers.getContentDisposition(1))  //is this not a file
                            {
                                this.m_Log.Write("emailBuilder.js - build - text or html part found");
                                szEmail += szStartAltBoundary;

                                var bInline = false;
                                if (oData.headers.getContentType(2).search(/html/i)!=-1) //html part
                                {
                                    this.m_Log.Write("emailBuilder.js - build - html part found");
                                    if (aTemp.length>0)
                                    {
                                        //check for inline parts
                                        for (var j=0; j<aTemp.length; j++)
                                        {
                                            var szContentDis =aTemp[j].headers.getContentDisposition(0);
                                            this.m_Log.Write("emailBuilder.js - build - getContentDisposition " + szContentDis);
                                            var szContent =aTemp[j].headers.getContentType(1);
                                            this.m_Log.Write("emailBuilder.js - build - getContent " + szContent);
                                            if (szContentDis && szContent.search(/image/i)!=-1)
                                            {
                                                if (szContentDis.search(/inline/i)!=-1)
                                                {
                                                   bInline = true;
                                                   this.m_Log.Write("emailBuilder.js - build - inlines found");
                                                }
                                            }
                                        }

                                        if (bInline)
                                        {
                                            var szBaseBoundary = this.m_oHeader.getContentType(3); //get boundary
                                            var sz2ndBoundary = szBaseBoundary+"ALTBoundary2";
                                            sz2ndStartBoundary = "\r\n--" + sz2ndBoundary + "\r\n";
                                            szEmail += "Content-Type: multipart/related; boundary=\""+sz2ndBoundary+"\"\r\n\r\n";
                                            szEmail += sz2ndStartBoundary;
                                            szEmail += oData.headers.getAllHeaders();
                                            szEmail += oData.body.getBody();

                                            var i=0;
                                            do
                                            {
                                                var oData2 = aTemp.shift();
                                                if (oData2)
                                                {
                                                    var szContentDis = oData2.headers.getContentDisposition(0);
                                                    var szContent = oData2.headers.getContentType(1);
                                                    if (szContentDis && szContent.search(/image/i)!=-1)
                                                    {
                                                        if (szContentDis.search(/inline/i)!=-1)
                                                        {
                                                            szEmail += sz2ndStartBoundary;
                                                            szEmail += oData2.headers.getAllHeaders();
                                                            szEmail += oData2.body.getBody();
                                                        }
                                                        else
                                                            aTemp.push(oData2);
                                                    }
                                                    else
                                                        aTemp.push(oData2);
                                                }
                                                i++;
                                            }while(iLength!=i);

                                            szEmail += "\r\n--" + sz2ndBoundary + "--\r\n\r\n";
                                        }
                                    }
                                }

                                if (!bInline)  // no inline attachments
                                {
                                    this.m_Log.Write("emailBuilder.js - build - text or no inlines found");
                                    szEmail += oData.headers.getAllHeaders();
                                    szEmail += oData.body.getBody();
                                }
                            }
                            else //is this a file
                                aTemp.push(oData);
                        }
                        k++;
                    }while(iLength!=k);
                    szEmail += szEndAltBoundary;

                    //Handle file attachement
                    for (var i=0; i<aTemp.length; i++)
                    {
                        szEmail += szStartBoundary;
                        szEmail += aTemp[i].headers.getAllHeaders();
                        szEmail += aTemp[i].body.getBody();
                    }
                    szEmail += szEndBoundary;
                    delete aTemp;
                }
                else //mixed
                {
                    this.m_Log.Write("emailBuilder.js - build - mixed part");
                    for (var i=0; i<this.m_aoBodyPart.length; i++)
                    {
                        szEmail += szStartBoundary;
                        szEmail += this.m_aoBodyPart[i].headers.getAllHeaders();
                        szEmail += this.m_aoBodyPart[i].body.getBody();
                    }

                    szEmail += szEndBoundary;
                }
            }
        }
        this.m_Log.Write("emailBuilder.js - build - szEmail \n" +szEmail );
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
