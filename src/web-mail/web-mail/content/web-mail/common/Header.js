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
                    szContent= szContentType.match(/.*?\/(.*?);.*?$/)[1];
                    szContent = szContent.replace(/\s/,"");
                    szContent = szContent.replace(/;/," ");
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

            var szDecoded = this.convertToUTF8(szDecoded, aszEncoding[1]);
            this.m_Log.Write("Header.js - UTF 8 encode - " + szDecoded);
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
    
    
    convertToUTF8 : function (szRawMSG, szCharset)
    {
        this.m_Log.Write("Header.js - convertToUTF8 START " +szCharset );

        var aszCharset = new Array( "ISO-2022-CN" , "ISO-2022-JP"  , "ISO-2022-KR" , "ISO-8859-1"  , "ISO-8859-10",
                                    "ISO-8859-11" , "ISO-8859-12"  , "ISO-8859-13" , "ISO-8859-14" , "ISO-8859-15",
                                    "ISO-8859-16" , "ISO-8859-2"   , "ISO-8859-3"  , "ISO-8859-4"  , "ISO-8859-5" ,
                                    "ISO-8859-6"  , "ISO-8859-6-E" , "ISO-8859-6-I", "ISO-8859-7"  , "ISO-8859-8" ,
                                    "ISO-8859-8-E", "ISO-8859-8-I" , "ISO-8859-9"  , "ISO-IR-111"  ,
                                    "UTF-8"       , "UTF-16"       , "UTF-16BE"    , "UTF-16LE"    , "UTF-32BE"   ,
                                    "UTF-32LE"    , "UTF-7"        ,
                                    "IBM850"      , "IBM852"       , "IBM855"      , "IBM857"      , "IBM862"     ,
                                    "IBM864"      , "IBM864I"      , "IBM866"      ,
                                    "WINDOWS-1250", "WINDOWS-1251" , "WINDOWS-1252", "WINDOWS-1253", "WINDOWS-1254",
                                    "WINDOWS-1255", "WINDOWS-1256" , "WINDOWS-1257", "WINDOWS-1258", "WINDOWS-874" ,
                                    "WINDOWS-936" ,
                                    "BIG5"        , "BIG5-HKSCS"   , "EUC-JP"      , "EUC-KR"      , "GB2312"     ,
                                    "X-GBK"       , "GB18030"      , "HZ-GB-2312"  , "ARMSCII-8"   , "GEOSTD8"    ,
                                    "KOI8-R"      , "KOI8-U"       , "SHIFT_JIS"   , "T.61-8BIT"   , "TIS-620"    ,
                                    "US-ASCII"    , "VIQR"         , "VISCII"      ,
                                    "X-EUC-TW"       , "X-JOHAB"                , "X-MAC-ARABIC"          , "X-MAC-CE"       ,
                                    "X-MAC-CROATIAN" , "X-MAC-GREEK"            , "X-MAC-HEBREW"          , "X-MAC-ROMAN"    ,
                                    "X-MAC-TURKISH"  , "X-MAC-ICELANDIC"        , "X-U-ESCAPED"           , "X-MAC-CYRILLIC" ,
                                    "X-MAC-UKRAINIAN", "X-MAC-ROMANIAN"         , "X-OBSOLETED-EUC-JP"    , "X-USER-DEFINED" ,
                                    "X-VIET-VNI"     , "X-VIET-VPS"             , "X-IMAP4-MODIFIED-UTF7" , "X-VIET-TCVN5712",
                                    "X-WINDOWS-949"  , "X-OBSOLETED-ISO-2022-JP", "X-OBSOLETED-SHIFT_JIS"
                                  );

        var szUseCharSet = "US-ASCII";
        var i = 0;
        var bFound = false;
        do{
            if (aszCharset[i] == szCharset.toUpperCase())
            {
                bFound = true;
                szUseCharSet =  szCharset.toUpperCase();
            }
            i++;
        }while (i<aszCharset.length && !bFound)
        this.m_Log.Write("Header.js - convertToUTF8 use charset " + szUseCharSet);

        var Converter = Components.classes["@mozilla.org/intl/scriptableunicodeconverter"]
                                  .getService(Components.interfaces.nsIScriptableUnicodeConverter);
        Converter.charset =  szUseCharSet;
        var unicode =  Converter.ConvertToUnicode(szRawMSG);
        Converter.charset = "UTF-8";
        var szDecoded = Converter.ConvertFromUnicode(unicode)+ Converter.Finish();
        this.m_Log.Write("Header.js - convertToUTF8 - "+szDecoded);

        this.m_Log.Write("Header.js - convertToUTF8 END");
        return szDecoded;
    },
}


