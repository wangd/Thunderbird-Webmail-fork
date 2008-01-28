function HttpComms(oLog)
{
    try
    {
        var scriptLoader =  Components.classes["@mozilla.org/moz/jssubscript-loader;1"];
        scriptLoader = scriptLoader.getService(Components.interfaces.mozIJSSubScriptLoader);
        scriptLoader.loadSubScript("chrome://web-mail/content/common/DebugLog.js");
        scriptLoader.loadSubScript("chrome://web-mail/content/common/commsData.js");
        scriptLoader.loadSubScript("chrome://web-mail/content/common/CommonPrefs.js");
        
        if (oLog)
        {
            this.m_Log = oLog;
        }
        else
        {
            var date = new Date();
            var  szLogFileName = "HTTP Comms Log - " + date.getHours()
                                               + "-" + date.getMinutes()
                                               + "-" + date.getUTCMilliseconds() +" -";
            this.m_Log = new DebugLog("webmail.logging.comms",
                                      "{3c8e8390-2cf6-11d9-9669-0800200c9a66}",
                                      szLogFileName);
        }
        this.m_Log.Write("HttpComms3.js - constructor - START");

        this.m_IOService = Components.classes["@mozilla.org/network/io-service;1"];
        this.m_IOService = this.m_IOService.getService(Components.interfaces.nsIIOService);

        this.m_oCookies = Components.classes["@mozilla.org/nsWebMailCookieManager2;1"]
                                    .getService(Components.interfaces.nsIWebMailCookieManager2);

        this.m_AuthToken = Components.classes["@mozilla.org/HttpAuthManager2;1"]
                                    .getService(Components.interfaces.nsIHttpAuthManager2);

        this.m_aHeaders = new Array();
        this.m_aFormData = new Array();
        this.m_bHandleCookie = true;
        this.m_bHandleBounce = true;
        this.m_bHandleHttpAuth = false;
        this.m_iHttpAuth = 0;
        this.m_szPassword = null;
        this.m_szUserName = Date.now();
        this.m_URI = null;
        this.m_szMethod = null;
        this.m_szContentType = "application/x-www-form-urlencoded";
        this.m_bOverRideUserAgent = false;
        
        var prefs = new WebMailCommonPrefAccess();
        var oPref = {Value : null};
        this.m_szUserAgent = "Mozilla/5.0 (Macintosh; U; Intel Mac OS X; en-US; rv:1.8.1.3) Gecko/20070815 Firefox/2.0.0.6";
        prefs.Get("char","webmail.UserAgent",oPref);
        this.m_Log.Write("HttpComms3.js - useragent " + oPref.Value);
        if (oPref.Value) this.m_szUserAgent =oPref.Value
                 
        this.m_CallBack = null;
        this.m_Parent = null;

        this.m_Log.Write("HttpComms3.js - constructor - END");
    }
    catch(e)
    {
         DebugDump("HttpComms3.js: Constructor : Exception : "
                                      + e.name
                                      + ".\nError message: "
                                      + e.message +"\n" +
                                      e.lineNumber);
    }
}


HttpComms.prototype =
{
    clear : function ()
    {
        this.m_Log.Write("HttpComms3.js - clear - START");

        this.m_URI = null;
        this.m_szMethod = null;
        this.m_szContentType = "application/x-www-form-urlencoded";
        this.m_iHttpAuth = 0;

        delete this.m_aHeaders;
        this.m_aHeaders = new Array();

        delete this.m_aFormData;
        this.m_aFormData = new Array();

        this.m_Log.Write("HttpComms3.js - clear - END");
    },

    setLogFile : function (log)
    {
        if (!log) return false;
        if (this.m_Log) delete this.m_Log;
        this.m_Log = log;
        return true;
    },

    setHandleCookies : function (bState)
    {
        this.m_bHandleCookie = bState;
    },


    setHandleBounce : function (bState)
    {
        this.m_bHandleBounce = bState;
    },

    setHandleHttpAuth : function (bState)
    {
        this.m_bHandleHttpAuth = bState;
    },


    setUserName : function (szUserName)
    {
        this.m_szUserName = szUserName;
    },


    setPassword : function (szPassword)
    {
        this.m_szPassword = szPassword;
    },


    setUserAgentOverride : function (bOverride)
    {
        this.m_bOverRideUserAgent = bOverride;  
    },

    setUserAgent : function (szUseragent)
    {
        this.m_szUserAgent = szUseragent;  
    },


    setURI : function (szURI)
    {
        try
        {
            this.m_Log.Write("HttpComms3.js - setURI - " + szURI);

            if (!szURI) return false;

            if (this.m_URI) delete this.m_URI;
            this.m_URI = this.m_IOService.newURI(szURI, null, null);

            return true;
        }
        catch(err)
        {
            return false;
        }
    },


    addRequestHeader : function (szName, szValue, bOverRide)
    {
        try
        {
            this.m_Log.Write("HttpComms3.js - addRequestHeader - " + szName + " "
                                                              + szValue + " "
                                                              + bOverRide);

            if (!szName || !szValue || (bOverRide!=true && bOverRide!=false)) return false;

            var oData = new commsData();
            oData.szName = szName;
            oData.szValue = szValue;
            oData.bOverRide = bOverRide;
            this.m_aHeaders.push(oData);

            return true;
        }
        catch(err)
        {
            this.m_Log.DebugDump("HttpComms3.js: addRequestHeader : Exception : "
                                                  + err.name
                                                  + ".\nError message: "
                                                  + err.message + "\n"
                                                  + err.lineNumber);
            return false;
        }
    },



    setRequestMethod : function (szMethod)
    {
        try
        {
            this.m_Log.Write("HttpComms3.js - requestMethod - " + szMethod);
            if (!szMethod) return false;

            this.m_szMethod = szMethod;

            return true;
        }
        catch(err)
        {
            this.m_Log.DebugDump("HttpComms3.js: requestMethod : Exception : "
                                                  + err.name
                                                  + ".\nError message: "
                                                  + err.message + "\n"
                                                  + err.lineNumber);
            return false;
        }
    },


    getRequestMethod : function ()
    {
        try
        {
            this.m_Log.Write("HttpComms3.js - get requestMethod - "+this.m_szMethod);
            if (!this.m_szMethod) return null;
            return this.m_szMethod;
        }
        catch(err)
        {
            this.m_Log.DebugDump("HttpComms3.js: requestMethod : Exception : "
                                                  + err.name
                                                  + ".\nError message: "
                                                  + err.message + "\n"
                                                  + err.lineNumber);
            return false;
        }
    },


    // 0"application/x-www-form-urlencoded"
    // 1"multipart/form-data"
    setContentType : function (szContentType)
    {
        this.m_Log.Write("HttpComms3.js - setContentType - " + szContentType);
        if (!szContentType) return false;

        this.m_szContentType = szContentType;

        return true;
    },


    addValuePair : function (szName, szValue)
    {
       try
        {
            this.m_Log.Write("HttpComms3.js - addValuePair - " + szName + " " + szValue);

            var oData = new commsData();
            oData.szName = szName;
            oData.szValue = szValue;
            this.m_aFormData.push(oData);

            return true;
        }
        catch(err)
        {
            this.m_Log.DebugDump("HttpComms3.js: addValuePair : Exception : "
                                                  + err.name
                                                  + ".\nError message: "
                                                  + err.message + "\n"
                                                  + err.lineNumber);
            return false;
        }
    },



    addFile : function (szName, szFileName , szValue)
    {
       try
        {
            this.m_Log.Write("HttpComms3.js - addFormData - START");
            this.m_Log.Write("HttpComms3.js - addFormData - " + szName + " " + szFileName);

            var oData = new commsData();
            oData.szName = szName;
            oData.szValue = szValue;
            oData.szFileName = szFileName;
            oData.bBinary = true;
            oData.bFile = true;

            this.m_aFormData.push(oData);

            this.m_Log.Write("HttpComms3.js - addFormData - END");
            return true;
        }
        catch(err)
        {
            this.m_Log.DebugDump("HttpComms3.js: addFile : Exception : "
                                                  + err.name
                                                  + ".\nError message: "
                                                  + err.message + "\n"
                                                  + err.lineNumber);
            return false;
        }
    },


    addData : function (szData)
    {
        try
        {
            this.m_Log.Write("HttpComms3.js - addData - START");
            this.m_Log.Write("HttpComms3.js - addData - \n" + szData);

            var oData = new commsData();
            oData.szName = null;
            oData.szValue = szData;
            this.m_aFormData.push(oData);

            this.m_Log.Write("HttpComms3.js - addFormData - END");
            return true;
        }
        catch(err)
        {
            this.m_Log.DebugDump("HttpComms3.js: addData : Exception : "
                                                  + err.name
                                                  + ".\nError message: "
                                                  + err.message + "\n"
                                                  + err.lineNumber);
            return false;
        }
    },



    send : function (callback, parent)
    {
        try
        {
            this.m_Log.Write("HttpComms3.js - send - START");

            this.m_CallBack = callback;
            this.m_Parent = parent;

            var channel = this.m_IOService.newChannelFromURI(this.m_URI);
            var HttpRequest = channel.QueryInterface(Components.interfaces.nsIHttpChannel);
            HttpRequest.redirectionLimit = 0; //stops automatic redirect handling

            /***********/
            //SET Headers
            /***********/

            //add cookies
            if (this.m_bHandleCookie)
            {
                var aszCookie = this.m_oCookies.findCookie(this.m_szUserName, this.m_URI);
                this.m_Log.Write("HttpComms3.js - send - adding cookies "+ aszCookie);
                if (aszCookie)
                    HttpRequest.setRequestHeader("Cookie", aszCookie, false);
            }

            //add Http Auth
            if (this.m_bHandleHttpAuth)
            {
                var szDomain = this.m_URI.prePath.match(/\/\/(.*?)$/)[1];
                var szAuthString = this.m_AuthToken.findToken(this.m_szUserName, szDomain);
                this.m_Log.Write("HttpComms3.js - send - adding HttpAuth "+ szAuthString);
                if (szAuthString)
                    HttpRequest.setRequestHeader("Authorization", szAuthString , false);
            }

            //other headers
            if (this.m_bOverRideUserAgent)
            {
                this.m_Log.Write("HttpComms3.js - send - setting UserAgent " + this.m_szUserAgent);
                HttpRequest.setRequestHeader("User-Agent", this.m_szUserAgent, true);
            }
            
            for (i=0; i<this.m_aHeaders.length; i++)
            {
                var oTemp = this.m_aHeaders[i];
                this.m_Log.Write("HttpComms3.js - send - adding headers "+ oTemp.szName +" "+
                                                                      oTemp.szValue +" "+
                                                                      oTemp.bOverRide);
                HttpRequest.setRequestHeader(oTemp.szName, oTemp.szValue, oTemp.bOverRide);
            }

            if (this.m_szMethod == "GET")
                HttpRequest.setRequestHeader("Cache-control","max-age=0",false);

            HttpRequest.requestMethod = this.m_szMethod;

            /***********/
            //SET Body
            /***********/
            this.m_Log.Write("HttpComms3.js - send - szContentType "+ this.m_szContentType);

            if (this.m_aFormData.length>0)
            {
                if (this.m_szContentType.search(/^multipart\/form-data$/i)!=-1) //formdata
                {
                    this.multipartFormData(channel);
                }
                else if (this.m_szContentType.search(/^application\/x-www-form-urlencoded$/i)!=-1)//urlencoded
                {
                    this.urlEncodedFormData(channel);
                }
                else  //other
                {
                    this.otherData(channel);
                }
            }
            else  //bounce ?
            {
                var listener = new this.downloadListener(this.callback, this);
                channel.asyncOpen(listener, null);
            }

            this.m_Log.Write("HttpComms3.js - send - END");
            return true;
        }
        catch(err)
        {
            this.m_Log.DebugDump("HttpComms3.js: send : Exception : "
                                                  + err.name
                                                  + ".\nError message: "
                                                  + err.message + "\n"
                                                  + err.lineNumber);
            return false;
        }
    },




    otherData : function(nsIChannel)
    {
        this.m_Log.Write("HttpComms3.js - otherData - Start");

        var MultiStream = Components.classes["@mozilla.org/io/multiplex-input-stream;1"]
                                    .createInstance(Components.interfaces.nsIMultiplexInputStream);

        var inStreamData = this.inputStream(this.m_aFormData[0].szValue);
        MultiStream.appendStream(inStreamData);
        //inStreamData.close();

        var uploadChannel = nsIChannel.QueryInterface(Components.interfaces.nsIUploadChannel);
        uploadChannel.setUploadStream(MultiStream , this.m_szContentType , -1);

        var HttpRequest = nsIChannel.QueryInterface(Components.interfaces.nsIHttpChannel);
        HttpRequest.requestMethod = this.m_szMethod;

        var listener = new this.downloadListener(this.callback, this);
        nsIChannel.asyncOpen(listener, null);

        //if (MultiStream)  MultiStream.close();

        this.m_Log.Write("HttpComms3.js - otherData - END");
    },



    urlEncodedFormData : function (nsIChannel)
    {
        this.m_Log.Write("HttpComms3.js - urlEncodedFormData - Start");

        var MultiStream = Components.classes["@mozilla.org/io/multiplex-input-stream;1"]
                                    .createInstance(Components.interfaces.nsIMultiplexInputStream);

        for (j=0; j<this.m_aFormData.length; j++)
        {
            var oTemp = this.m_aFormData[j];
            this.m_Log.Write("HttpComms3.js - urlencoded - adding data "+oTemp.szName+" "+oTemp.szValue);

            if (j>0)
            {
                var inStreamAnd = this.inputStream("&");
                MultiStream.appendStream(inStreamAnd);
                //inStreamAnd.close();
            }

            var szData = oTemp.szName + "=" + oTemp.szValue;
            var inStreamData = this.inputStream(szData);
            MultiStream.appendStream(inStreamData);
            //inStreamData.close();
        }

        var uploadChannel = nsIChannel.QueryInterface(Components.interfaces.nsIUploadChannel);
        uploadChannel.setUploadStream(MultiStream , this.m_szContentType , -1);

        var HttpRequest = nsIChannel.QueryInterface(Components.interfaces.nsIHttpChannel);
        HttpRequest.requestMethod = this.m_szMethod;

        var listener = new this.downloadListener(this.callback, this);
        nsIChannel.asyncOpen(listener, null);

        //if (MultiStream)  MultiStream.close();
        MultiStream = null;

        this.m_Log.Write("HttpComms3.js - urlEncodedFormData - END");
    },




    multipartFormData : function (nsIChannel)
    {
        this.m_Log.Write("HttpComms3.js - multipartFormData - Start");

        var MultiStream = Components.classes["@mozilla.org/io/multiplex-input-stream;1"]
                                    .createInstance(Components.interfaces.nsIMultiplexInputStream);

        var szBoundary = this.createBoundary();   //create boundarys
        var szStartBoundary = "\r\n--"+szBoundary+"\r\n" ;
        var szEndBoundary = "\r\n--"+szBoundary+"--\r\n" ;
        var szContentType = this.m_szContentType;
        szContentType += "; boundary=" +szBoundary;
        this.m_Log.Write("HttpComms3.js - send - update szContentType "+ szContentType);

        for (j=0; j<this.m_aFormData.length; j++)
        {
            var oTemp = this.m_aFormData[j];

            var inStreamStartBound = this.inputStream(szStartBoundary);
            MultiStream.appendStream(inStreamStartBound);
            //inStreamStartBound.close();

            var mimeStream = Components.classes["@mozilla.org/network/mime-input-stream;1"];
            mimeStream = mimeStream.createInstance(Components.interfaces.nsIMIMEInputStream );
            mimeStream.addContentLength = false;

            var szContDisp = "form-data; name=\"" + oTemp.szName + "\"; ";
            if (oTemp.bFile)
            {
                this.m_Log.Write("HttpComms3.js - multipartFormData - adding data "+oTemp.szName);
                this.m_Log.Write("HttpComms3.js - multipartFormData - adding file" + oTemp.szFileName);
                var szContDisp = "form-data; name=\"" + oTemp.szName + "\"; ";
                szContDisp +="filename=\"" + (oTemp.szFileName ? oTemp.szFileName : "") + "\"";
                mimeStream.addHeader("Content-Disposition",szContDisp);
                mimeStream.addHeader("Content-Type","application/octet-stream");

                if(oTemp.szValue)
                {
                    this.m_Log.Write("HttpComms3.js - multipartFormData - adding binary data");
                    var binaryStream = this.binaryStream(oTemp.szValue);
                    mimeStream.setData(binaryStream);
                    //binaryStream.close();
                }
                else
                {
                    var inStreamEmpty = this.inputStream("");
                    mimeStream.setData(inStreamEmpty);
                    //inStreamEmpty.close();
                }
            }
            else
            {
                this.m_Log.Write("HttpComms3.js - multipartFormData - adding data "+oTemp.szName+" "+oTemp.szValue);
                this.m_Log.Write("HttpComms3.js - multipartFormData - adding form data");
                var szContDisp = "form-data; name=\"" + oTemp.szName + "\"";
                mimeStream.addHeader("Content-Disposition",szContDisp);
                var valueStream = this.inputStream(oTemp.szValue? oTemp.szValue:"");
                mimeStream.setData(valueStream);
                //valueStream.close();
            }

            MultiStream.appendStream(mimeStream);
            //mimeStream.close();

            if (j==this.m_aFormData.length-1)
            {
                this.m_Log.Write("HttpComms3.js - multipartFormData - adding end boundary");
                var inStreamEndBound = this.inputStream(szEndBoundary);
                MultiStream.appendStream(inStreamEndBound);
                //inStreamEndBound.close();
            }
        }

        var uploadChannel = nsIChannel.QueryInterface(Components.interfaces.nsIUploadChannel);
        uploadChannel.setUploadStream(MultiStream , szContentType , -1);

        var HttpRequest = nsIChannel.QueryInterface(Components.interfaces.nsIHttpChannel);
        HttpRequest.requestMethod = this.m_szMethod;

        var listener = new this.downloadListener(this.callback, this);
        nsIChannel.asyncOpen(listener, null);

        //MultiStream.close();
        //MultiStream = null;

        this.m_Log.Write("HttpComms3.js - multipartFormData - END");
    },




    binaryStream : function (szData)
    {
        try
        {
            this.m_Log.Write("HttpComms3.js - binaryStream - START");
            var file = Components.classes["@mozilla.org/file/directory_service;1"];
            file = file.getService(Components.interfaces.nsIProperties);
            file = file.get("TmpD", Components.interfaces.nsIFile);
            file.append("suggestedName.tmp");
            file.createUnique(Components.interfaces.nsIFile.NORMAL_FILE_TYPE, 420);

            var deletefile = Components.classes["@mozilla.org/uriloader/external-helper-app-service;1"];
            deletefile = deletefile.getService(Components.interfaces.nsPIExternalAppLauncher);
            deletefile.deleteTemporaryFileOnExit(file);

            var outputStream = Components.classes["@mozilla.org/network/file-output-stream;1"];
            outputStream = outputStream.createInstance( Components.interfaces.nsIFileOutputStream );
            outputStream.init( file, 0x04 | 0x08 | 0x10, 420, 0 );

            var binaryStream = Components.classes["@mozilla.org/binaryoutputstream;1"];
            binaryStream = binaryStream.createInstance(Components.interfaces.nsIBinaryOutputStream);
            binaryStream.setOutputStream(outputStream)
            binaryStream.writeBytes( szData, szData.length );
            outputStream.flush();
            binaryStream.flush();
            outputStream.close();
            binaryStream.close();


            var inputStream = Components.classes["@mozilla.org/network/file-input-stream;1"];
            inputStream = inputStream.createInstance(Components.interfaces.nsIFileInputStream);
            inputStream.init(file, 0x01 , 0 , null);

            var binaryStream = Components.classes["@mozilla.org/binaryinputstream;1"];
            binaryStream = binaryStream.createInstance(Components.interfaces.nsIBinaryInputStream);
            binaryStream.setInputStream(inputStream);

            var buffer = Components.classes["@mozilla.org/network/buffered-input-stream;1"];
            buffer = buffer.createInstance(Components.interfaces.nsIBufferedInputStream);
            buffer.init(binaryStream, 4096);
            //inputStream.close();
            //binaryStream.close();

            this.m_Log.Write("HttpComms3.js - binaryStream - END");
            return buffer;
        }
        catch(err)
        {
            this.m_Log.DebugDump("HttpComms3.js: binaryStream : Exception : "
                                                  + err.name
                                                  + ".\nError message: "
                                                  + err.message + "\n"
                                                  + err.lineNumber);
            return null;
        }
    },



    createBoundary : function ()
    {
        this.m_Log.Write("HttpComms3.js - createBondary - START");

        var szBoundary = "-------------" +
                        parseInt(Math.floor(Math.random()*100001))+
                        parseInt(Math.floor(Math.random()*100001))+
                        parseInt(Math.floor(Math.random()*100001));

        this.m_Log.Write("HttpComms3.js - createBondary - END " + szBoundary);
        return szBoundary;
    },



    inputStream : function (szValue)
    {
        try
        {
            this.m_Log.Write("HttpComms3.js - inputStream - " + szValue);

            var Stream = Components.classes["@mozilla.org/io/string-input-stream;1"];
            Stream = Stream.createInstance(Components.interfaces.nsIStringInputStream);
            Stream.setData(szValue,-1);
            return Stream;
        }
        catch(err)
        {
            this.m_Log.DebugDump("HttpComms3.js: inputStream : Exception : "
                                                  + err.name
                                                  + ".\nError message: "
                                                  + err.message + "\n"
                                                  + err.lineNumber);
            return null;
        }
    },



    callback : function(szResponse ,event , mainObject)
    {
        try
        {
            mainObject.m_Log.Write("HttpComms3.js - callback - START");
            mainObject.m_Log.Write("HttpComms3.js - callback : \n" + szResponse);

            //handle repsonse
            var httpChannel = event.QueryInterface(Components.interfaces.nsIHttpChannel);
            mainObject.m_Log.Write("commd.js - callback - status :" +httpChannel.responseStatus );

            //handle cookies
            if (mainObject.m_bHandleCookie)
            {
                mainObject.m_Log.Write("HttpComms3.js - callback - checking for cookies");

                //get cookies
                try
                {
                    var szCookies =  httpChannel.getResponseHeader("Set-Cookie");
                    mainObject.m_Log.Write("HttpComms3.js - callback - received cookies \n" + szCookies);
                    mainObject.m_oCookies.addCookie(mainObject.m_szUserName, httpChannel.URI, szCookies);
                }
                catch(e)
                {
                    mainObject.m_Log.Write("HttpComms3.js - callback - no cookies found");
                }
            }


            //handel Http auth reponse
            if (mainObject.m_bHandleHttpAuth && httpChannel.responseStatus == 401)
            {
                mainObject.m_Log.Write("HttpComms3.js - callback - Handling Http Auth");

                if (httpChannel.responseStatus == 401 && mainObject.m_szUserName && mainObject.m_szPassword)
                {
                    mainObject.m_iHttpAuth++;
                    if (mainObject.m_iHttpAuth >10) throw new Error ("Too login re-trys");

                    try
                    {
                        var szDomain = "." + httpChannel.URI.host.match(/\.(.*?)$/)[1];
                        mainObject.m_Log.Write("HttpComms3.js - callback - domain " +szDomain);
                        var szAuthenticate =  httpChannel.getResponseHeader("www-Authenticate");
                        mainObject.m_Log.Write("HttpComms3.js - callback - www-Authenticate " + szAuthenticate);

                        mainObject.m_AuthToken.addToken(szDomain,
                                                        szAuthenticate ,
                                                        httpChannel.URI.path ,
                                                        mainObject.m_szUserName,
                                                        mainObject.m_szPassword);

                        var bResult = mainObject.send(mainObject.m_CallBack, mainObject.m_Parent);
                        if (!bResult) throw new Error("httpConnection returned false");
                        return;
                    }
                    catch(err)
                    {
                        mainObject.m_Log.Write("HttpComms3.js - callback - Authentication failed");
                    }
                }
            }



            //bounce handler
            if (mainObject.m_bHandleBounce)
            {
                mainObject.m_Log.Write("HttpComms3.js - callback - Checking for Bounce");
                if ( httpChannel.responseStatus > 300 && httpChannel.responseStatus < 400)
                {
                    var szLocation = null;
                    try
                    {
                        szLocation =  httpChannel.getResponseHeader("Location");
                        mainObject.m_Log.Write("HttpComms3.js - callback - location \n" + szLocation);
                    }
                    catch(e)
                    {
                        throw new Error("Location header not found")
                    }

                    var bURL = mainObject.setURI(szLocation);
                    if (!bURL)
                    {
                        mainObject.m_Log.Write("HttpComms3.js - callback - location invalid");
                        szLocation = httpChannel.URI.prePath + szLocation;
                        mainObject.setURI(szLocation);
                    }

                    if (mainObject.getRequestMethod().search(/post/i)!=-1)
                        mainObject.setRequestMethod("GET");

                    delete mainObject.m_aFormData;
                    mainObject.m_aFormData = new Array();

                    var bResult = mainObject.send(mainObject.m_CallBack, mainObject.m_Parent);
                    if (!bResult) throw new Error("httpConnection returned false");
                    return;
                }
            }

            mainObject.clear();
            //let component handle response
            mainObject.m_CallBack (szResponse, event, mainObject.m_Parent);

            mainObject.m_Log.Write("HttpComms3.js - callback - END");
            return true;
        }
        catch(err)
        {
            mainObject.m_Log.DebugDump("HttpComms3.js: callback : Exception : "
                                                  + err.name
                                                  + ".\nError message: "
                                                  + err.message + "\n"
                                                  + err.lineNumber);

            //there's a problem let component handle the response
            mainObject.m_CallBack (szResponse, event, mainObject.m_Parent);
            return false;
        }
    },



    downloadListener : function(CallbackFunc, parent)
    {
        return ({
            m_data : "",
            m_Stream : null,

            onStartRequest : function (aRequest, aContext)
            {
                //parent.m_Log.Write("onStartRequest");
                this.m_data = "";
            },


            onDataAvailable : function (aRequest, aContext, aStream, aSourceOffset, aLength)
            {
                //parent.m_Log.Write("onDataAvailable");
                if (this.m_Stream == null)
                    this.m_Stream = Components.classes["@mozilla.org/binaryinputstream;1"]
                                            .createInstance(Components.interfaces.nsIBinaryInputStream);

                this.m_Stream.setInputStream (aStream);
                this.m_data += this.m_Stream.readBytes(this.m_Stream.available());
            },


            onStopRequest : function (aRequest, aContext, aStatus)
            {
                //parent.m_Log.Write("onStopRequest");
                CallbackFunc(this.m_data, aRequest, parent);
                if (this.m_Stream) this.m_Stream.close();
                this.m_data = null;
            },


            QueryInterface : function(aIID)
            {
                if (aIID.equals(Components.interfaces.nsIStreamListener) ||
                          aIID.equals(Components.interfaces.nsISupportsWeakReference) ||
                          aIID.equals(Components.interfaces.nsIAlertListener) ||
                          aIID.equals(Components.interfaces.nsISupports))
                    return this;

                throw Components.results.NS_NOINTERFACE;
            }
        });
    },
}
