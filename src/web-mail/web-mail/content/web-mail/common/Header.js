function headers(szRawHeaders)
{
    var scriptLoader =  Components.classes["@mozilla.org/moz/jssubscript-loader;1"];
    scriptLoader = scriptLoader.getService(Components.interfaces.mozIJSSubScriptLoader);
    scriptLoader.loadSubScript("chrome://web-mail/content/common/base64.js");
    scriptLoader.loadSubScript("chrome://web-mail/content/common/Quoted-Printable.js");
    scriptLoader.loadSubScript("chrome://web-mail/content/common/DebugLog.js");
    scriptLoader.loadSubScript("chrome://web-mail/content/common/HeaderData.js");

    this.m_Log = new DebugLog("webmail.logging.comms",
                              "{3c8e8390-2cf6-11d9-9669-0800200c9a66}",
                              "Header Parser"),

    this.m_Log.Write("Header.js - raw - \n" +szRawHeaders);


    //remove folding
    var szHeaders = szRawHeaders.replace(/\r?\n\s/gm," ");
    this.m_Log.Write("Header.js - unfold - \n" +szHeaders);

    this.m_aszHeaders = new Array();

    //remove bad headers
    var aHeaders =  szHeaders.split("\n");
    for (var i =0; i<aHeaders.length; i++)
    {
        this.m_Log.Write("Header.js - header - row " +aHeaders[i]);
        if (aHeaders[i].search(/^\S*\s?:\s*[\S\s]*$/)!=-1)
        {
            //check for spaces
            var aszHeader = aHeaders[i].match(/^(\S*)\s?:\s*([\S\s]*)$/);
            var oData = new headerData();
            oData.szName = aszHeader[1];
            this.m_Log.Write("Header.js - header - name " + oData.szName);
            oData.szValue = aszHeader[2].replace(/\r|\n/,"");
            this.m_Log.Write("Header.js - header - value " + oData.szValue);
            this.m_aszHeaders.push(oData);
        }
    }
}


headers.prototype =
{
    getAllHeadersArray : function()
    {
        this.m_Log.Write("Header.js - getAllHeadersArray");
        return this.m_aszHeaders;
    },


    getAllHeaders : function ()
    {
        try
        {
            this.m_Log.Write("Header.js - getAllHeaders - START");

            var szHeaders = "";

            for (var i=0; i<this.m_aszHeaders.length; i++)
            {
                var szName = this.m_aszHeaders[i].szName;
                this.m_Log.Write("Header.js - getAllHeaders - szName "+ szName);
                szHeaders += szName;
                szHeaders += ": ";
                var szValue = this.m_aszHeaders[i].szValue;
                this.m_Log.Write("Header.js - getAllHeaders - szValue "+ szValue);
                szHeaders += szValue;
                szHeaders += "\r\n";
            }

            szHeaders +="\r\n";

            this.m_Log.Write("Header.js - getAllHeaders - END");
            return szHeaders;
        }
        catch(e)
        {
            this.m_Log.DebugDump("Header.js: getAllHeaders : Exception : "
                                              + e.name +
                                              ".\nError message: "
                                              + e.message+ "\n"
                                              + e.lineNumber);
        }
    },


    getHeader : function (szName)
    {
        try
        {
            this.m_Log.Write("Header.js - getHeader - Start " + szName);
            var szValue = null;

            if (this.m_aszHeaders.length>0)
            {
                var regexp =  new RegExp("^"+szName+"$", "i");
                var bFound = false;
                var i = 0;
                do{
                    if (this.m_aszHeaders[i].szName.search(regexp)!=-1)
                    {
                        bFound = true;
                        szValue = this.m_aszHeaders[i].szValue;
                        this.m_Log.Write("Header.js - getHeader - found " + szValue);
                    }
                    i++;
                }while(i!=this.m_aszHeaders.length && !bFound )
            }
            this.m_Log.Write("Header.js - getHeader - END");
            return szValue;
        }
        catch(e)
        {
            this.m_Log.DebugDump("Header.js: getHeader : Exception : "
                                              + e.name +
                                              ".\nError message: "
                                              + e.message+ "\n"
                                              + e.lineNumber);
            return null;
        }
    },


    getTo : function ()
    {
        this.m_Log.Write("Header.js - getto");
        return this.emailAddress(this.getHeader("to"));
    },


    getCc : function ()
    {
        this.m_Log.Write("Header.js - getCC");
        return this.emailAddress(this.getHeader("cc"));
    },


    getSubject : function ()
    {
        this.m_Log.Write("Header.js - Subject");
        return this.getHeader("subject");
    },


    //0 : All
    //1 : type
    //2 : subtype
    //3 : boundary
    //4 : filename
    getContentType: function(iField)
    {
        try
        {
            this.m_Log.Write("Header.js - getContentType - START " + iField);
            var szContentType =  this.getHeader("Content-Type");
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
                     try
                     {
                         szContent= szContentType.match(/boundary="(.*?)"/i)[1];
                     }
                     catch(e)
                     {
                         szContent= szContentType.match(/boundary=(.*?)[;|\s]*$/i)[1];
                     }

                     szContent = szContent.replace(/^\s*/,"").replace(/\s*$/,"");
                break;

                case 4://name
                    if (szContentType.search(/name="(.*?)"/i)!=-1)
                    {
                        var szName= szContentType.match(/name="(.*?)"/i)[1];
                        szContent = this.decodeEncodedWord(szName);
                    }
                    else if (szContentType.search(/name\*=(.*?)$/i)!=-1)
                    {
                        var szName= szContentType.match(/name\*=(.*?)$/i)[1];
                        szContent = this.decodeEncodedWordExt(szName);
                    }
                    else
                    {
                        var szType = this.getContentType(1);
                        var szSubtype = this.getContentType(2);
                        szContent = szType + "." + szSubtype;
                    }
                break;
            };

            this.m_Log.Write("Header.js - getContentType - END " + szContent);
            return szContent;
        }
        catch(e)
        {
           this.m_Log.DebugDump("Headers.js: getContentType : Exception : "
                                  + e.name +
                                  ".\nError message: "
                                  + e.message+ "\n"
                                  + e.lineNumber);
            return null;
        }
    },




    //0 : All
    //1 : filename
    getContentDisposition: function(iField)
    {
        try
        {
            this.m_Log.Write("Header.js - getContentDisposition - START " + iField);
            var szContent =  this.getHeader("Content-Disposition");
            var szResult= null;

            if (szContent)
            {
                switch(iField)
                {
                    case 0:  //all
                        szResult = szContent;
                    break;

                    case 1: // filename

                        if (szContent.search(/filename=/i)!=-1 || szContent.search(/name=/i)!=-1)
                        {
                            var aszFilename= szContent.match(/filename="(.*?)"/i);
                            if (!aszFilename)
                                aszFilename= szContent.match(/name="(.*?)"/i);

                            this.m_Log.Write("Header.js - getContentDisposition - aszFilename " + aszFilename);

                            if (aszFilename)
                            {
                                if (aszFilename[1].search(/^=\?.*?\?=$/)!=-1)
                                    szResult = this.decodeEncodedWord(aszFilename[1]);
                                else
                                    szResult = aszFilename[1];
                            }
                        }
                        else if (szContent.search(/filename\*=/i)!=-1 || szContent.search(/name\*=/i)!=-1)
                        {
                            var aszFilename= szContent.match(/filename\*=(.*?)$/i);
                            if (!aszFilename)
                                aszFilename= szContent.match(/name\*=(.*?)$/i);

                            this.m_Log.Write("Header.js - getContentDisposition - aszFilename " + aszFilename);

                            if (aszFilename)
                            {
                                if (aszFilename[1].search(/^.*?'.*?'.*?$/)!=-1)
                                    szResult = this.decodeEncodedWordExt(aszFilename[1]);
                                else
                                    szResult = aszFilename[1];
                            }
                        }
                    break;
                };
            }
            else
            {
                if (iField == 1)  //filename
                {
                    if (this.getHeader("Content-Type") && this.getHeader("Content-ID") )
                    {
                        var szType = this.getContentType(1);
                        var szSubtype = this.getContentType(2);
                        szResult = szType + "." + szSubtype;
                    }
                }
            }
            this.m_Log.Write("Header.js - getContentDisposition - END " + szResult);
            return szResult;
        }
        catch(e)
        {
           this.m_Log.DebugDump("Headers.js: getContentDisposition : Exception : "
                      + e.name +
                      ".\nError message: "
                      + e.message+ "\n"
                      + e.lineNumber);
            return null;
        }
    },


    getEncoderType : function ()
    {
        this.m_Log.Write("Header.js - getEncoderType - START");
        var szContentType = this.getHeader("Content-Transfer-Encoding");
        szContentType = szContentType.replace(/\s/,"");
        return szContentType;
    },



    emailAddress :function (szAddress)
    {
        try
        {
            this.m_Log.Write("Header.js - emailAddress - START " + szAddress);

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

            this.m_Log.Write("Header.js - emailAddress - END " + szList);
            return szList;
        }
        catch(e)
        {
           this.m_Log.DebugDump("Headers.js: emailAddress : Exception : "
                                              + e.name +
                                              ".\nError message: "
                                              + e.message+ "\n"
                                              + e.lineNumber);
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


    decodeEncodedWord : function (szValue)
    {
        //szValue = "=?ISO-2022-JP?B?GyRCPCs4Sj5SMnAhSjcvRWchSxsoQi50eHQ=?=";
        //szValue = "=?Shift_JIS?B?w73ELnR4dA==?=";
        this.m_Log.Write("Header.js - decode - START " + szValue);

        var szDecoded = szValue;

        //check for encoding
        if (szValue.search(/^=\?.*?\?=$/)!=-1)
        {
            var aszEncoding = szValue.match(/^=\?(.*?)\?(.*?)\?(.*?)\?=$/);
            this.m_Log.Write("Header.js - decode - aszEncoding " + aszEncoding);
            var szType = aszEncoding[2];
            if (szType.search(/B/i)!=-1)//base64
            {
                this.m_Log.Write("Header.js - decode - Base 64 ");
                var oBase64 = new base64();
                szDecoded = oBase64.decode(aszEncoding[3]);
            }
            else if (szType.search(/Q/i)!=-1)//quoted printable
            {
                this.m_Log.Write("Header.js - decode - Q ");
                var oQP = new QuotedPrintable();
                szDecoded = oQP.decode(aszEncoding[3]);
            }

            this.m_Log.Write("Header.js - decode - " + szDecoded);

            if (aszEncoding[1].search(/ISO-2022-JP/i)!=-1)
            {
                try
                {
                    //convert coding
                    var Converter = Components.classes["@mozilla.org/intl/scriptableunicodeconverter"].
                                        getService(Components.interfaces.nsIScriptableUnicodeConverter);

                    Converter.charset =  aszEncoding[1];
                    var unicode =  Converter.ConvertToUnicode(szDecoded);
                    this.m_Log.Write("Header.js - decode - unicode " + unicode);

                    Converter.charset = "Shift-JIS";
                    szDecoded = Converter.ConvertFromUnicode(unicode);
                    this.m_Log.Write("Header.js - decode - Shift-JIS "+szDecoded);
                }
                catch (ex)
                {
                    this.m_Log.Write("Header.js - decode - unicode err");

                }
            }
        }

        this.m_Log.Write("Header.js - decode - END ");
        return szDecoded;
    },




    decodeEncodedWordExt : function (szValue)
    {
        //szValue = ISO-8859-1''r%E9sum%E9.txt;
        this.m_Log.Write("Header.js - decodeEncodedWordExt - START " + szValue);

        var szDecoded = szValue;

        //check for encoding
        if (szValue.search(/^.*?'.*?'.*?$/)!=-1)
        {
            var aszEncoding = szValue.match(/^(.*?)'(.*?)'(.*?)$/);
            this.m_Log.Write("Header.js - decodeEncodedWordExt - aszEncoding " + aszEncoding);

            if (aszEncoding[1].search(/ISO-8859-1/i)!=-1)
            {
                try
                {
                     //find used quoted printable hex codes
                    var szDecoded = aszEncoding[3];
                    var aszHexCodes = szDecoded.match(/%[A-Z0-9]{2}/gm);
                    this.m_Log.Write("Header.js - decodeEncodedWordExt - aszHexCodes " + aszHexCodes);
                    aszHexCodes.sort();

                    //remove duplicates
                    for (var i=0; i<aszHexCodes.length; i)
                    {
                        if (aszHexCodes[i] == aszHexCodes[i+1])
                            aszHexCodes.splice(i+1,1);
                        else
                           i++
                    }

                    //removed quoted printable codes
                    for (var j=0; j<aszHexCodes.length; j++)
                    {
                        var hex = aszHexCodes[j].replace(/%/,"");
                        this.m_Log.Write("Header.js - decodeEncodedWordExt - hex " + hex);
                        var decimal = parseInt(hex,16); //convert hex to decimal
                        this.m_Log.Write("Header.js - decodeEncodedWordExt - decimal " + decimal);
                        var regexp = new RegExp(aszHexCodes[j], "gm");
                        //replace hex
                        szDecoded = szDecoded.replace(regexp,String.fromCharCode(decimal));
                    }
                }
                catch (ex)
                {
                    this.m_Log.Write("Header.js - decodeEncodedWordExt - unicode err");

                }
            }
        }

        this.m_Log.Write("Header.js - decodeEncodedWordExt - END " + szDecoded);
        return szDecoded;
    },
}


