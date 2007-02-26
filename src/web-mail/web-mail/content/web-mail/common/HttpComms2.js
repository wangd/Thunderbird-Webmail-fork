function HttpComms(oLog)
{
    try
    {
        var scriptLoader =  Components.classes["@mozilla.org/moz/jssubscript-loader;1"];
        scriptLoader = scriptLoader.getService(Components.interfaces.mozIJSSubScriptLoader);
        scriptLoader.loadSubScript("chrome://web-mail/content/common/DebugLog.js");
        scriptLoader.loadSubScript("chrome://web-mail/content/common/commsData.js");

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
        this.m_Log.Write("HttpComms2.js - constructor - START");

        this.m_IOService = Components.classes["@mozilla.org/network/io-service;1"];
        this.m_IOService = this.m_IOService.getService(Components.interfaces.nsIIOService);

        this.m_oCookies = null;
        this.m_AuthToken = null;

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

        this.m_CallBack = null;
        this.m_Parent = null;

        this.m_Log.Write("HttpComms2.js - constructor - END");
    }
    catch(e)
    {
         DebugDump("HttpComms2.js: Constructor : Exception : "
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
        this.m_Log.Write("HttpComms2.js - clear - START");

        this.m_URI = null;
        this.m_szMethod = null;
        this.m_szContentType = "application/x-www-form-urlencoded";
        this.m_iHttpAuth = 0;

        delete this.m_aHeaders;
        this.m_aHeaders = new Array();

        delete this.m_aFormData;
        this.m_aFormData = new Array();

        this.m_Log.Write("HttpComms2.js - clear - END");
    },


    setCookieManager : function (oCookieManager)
    {
        this.m_Log.Write("HttpComms2.js - setCookieManager - " + oCookieManager);
        if (!oCookieManager) return false;
        if (this.m_oCookies)  delete this.m_oCookies;
        this.m_oCookies = oCookieManager;
        return true;
    },


    getCookieManager: function ()
    {
        return this.m_oCookies;
    },


    setHttpAuthManager : function (oHttpAuthManager)
    {
        this.m_Log.Write("HttpComms2.js - setHttpAuthManager - " + oHttpAuthManager);
        if (!oHttpAuthManager) return false;
        if (this.m_AuthToken)  delete this.m_AuthToken;
        this.m_AuthToken = oHttpAuthManager;
        return true;
    },


    getHttpAuthManager: function ()
    {
        return this.m_AuthToken;
    },



    setLogFile : function (log)
    {
        this.m_Log = log;
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


    setURI : function (szURI)
    {
        try
        {
            this.m_Log.Write("HttpComms2.js - setURI - " + szURI);

            if (!szURI) return false;

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
            this.m_Log.Write("HttpComms2.js - addRequestHeader - " + szName + " "
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
            this.m_Log.DebugDump("HttpComms2.js: addRequestHeader : Exception : "
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
            this.m_Log.Write("HttpComms2.js - requestMethod - " + szMethod);
            if (!szMethod) return false;

            this.m_szMethod = szMethod;

            return true;
        }
        catch(err)
        {
            this.m_Log.DebugDump("HttpComms2.js: requestMethod : Exception : "
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
            this.m_Log.Write("HttpComms2.js - get requestMethod - "+this.m_szMethod);
            if (!this.m_szMethod) return null;
            return this.m_szMethod;
        }
        catch(err)
        {
            this.m_Log.DebugDump("HttpComms2.js: requestMethod : Exception : "
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
        this.m_Log.Write("HttpComms2.js - setContentType - " + szContentType);
        if (!szContentType) return false;

        this.m_szContentType = szContentType;

        return true;
    },


    addValuePair : function (szName, szValue)
    {
       try
        {
            this.m_Log.Write("HttpComms2.js - addValuePair - " + szName + " " + szValue);

            var oData = new commsData();
            oData.szName = szName;
            oData.szValue = szValue;
            this.m_aFormData.push(oData);

            return true;
        }
        catch(err)
        {
            this.m_Log.DebugDump("HttpComms2.js: addValuePair : Exception : "
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
            this.m_Log.Write("HttpComms2.js - addFormData - START");
            this.m_Log.Write("HttpComms2.js - addFormData - " + szName + " " + szFileName);

            var oData = new commsData();
            oData.szName = szName;
            oData.szValue = szValue;
            oData.szFileName = szFileName;
            oData.bBinary = true;
            oData.bFile = true;

            this.m_aFormData.push(oData);

            this.m_Log.Write("HttpComms2.js - addFormData - END");
            return true;
        }
        catch(err)
        {
            this.m_Log.DebugDump("HttpComms2.js: addFile : Exception : "
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
            this.m_Log.Write("HttpComms2.js - addData - START");
            this.m_Log.Write("HttpComms2.js - addData - \n" + szData);

            var oData = new commsData();
            oData.szName = null;
            oData.szValue = szData;
            this.m_aFormData.push(oData);

            this.m_Log.Write("HttpComms2.js - addFormData - END");
            return true;
        }
        catch(err)
        {
            this.m_Log.DebugDump("HttpComms2.js: addData : Exception : "
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
            this.m_Log.Write("HttpComms2.js - send - START");

            this.m_CallBack = callback;
            this.m_Parent = parent;

            var channel = this.m_IOService.newChannelFromURI(this.m_URI);

            var HttpRequest = channel.QueryInterface(Components.interfaces.nsIHttpChannel);
            HttpRequest.redirectionLimit = 0; //stops automatic redirect handling

            //add cookies
            if (this.m_bHandleCookie && this.m_oCookies)
            {
                var aszCookie = this.m_oCookies.findCookie(this.m_URI);
                this.m_Log.Write("HttpComms2.js - send - adding cookies "+ aszCookie);
                if (aszCookie)
                    HttpRequest.setRequestHeader("Cookie", aszCookie, false);
            }

            //add Http Auth
            if (this.m_bHandleHttpAuth && this.m_AuthToken )
            {
                var szDomain = this.m_URI.prePath.match(/\/\/(.*?)$/)[1];
                var szAuthString = this.m_AuthToken.findToken(szDomain);
                this.m_Log.Write("HttpComms2.js - send - adding HttpAuth "+ szAuthString);
                if (szAuthString)
                    HttpRequest.setRequestHeader("Authorization", szAuthString , false);
            }


            //other headers
            for (i=0; i<this.m_aHeaders.length; i++)
            {
                var oTemp = this.m_aHeaders[i];
                this.m_Log.Write("HttpComms2.js - send - adding headers "+ oTemp.szName +" "+
                                                                      oTemp.szValue +" "+
                                                                      oTemp.bOverRide);
                HttpRequest.setRequestHeader(oTemp.szName, oTemp.szValue, oTemp.bOverRide);
            }


            //set data
            var szContentType = this.m_szContentType;
            this.m_Log.Write("HttpComms2.js - send - szContentType "+ szContentType);

            if (this.m_aFormData.length>0)
            {
                var MultiStream = Components.classes["@mozilla.org/io/multiplex-input-stream;1"];
                MultiStream = MultiStream.createInstance(Components.interfaces.nsIMultiplexInputStream);

                if (this.m_szContentType.search(/^multipart\/form-data$/i)!=-1) //formdata
                {
                    var szBoundary = this.createBoundary();   //create boundarys
                    var szStartBoundary = "\r\n--"+szBoundary+"\r\n" ;
                    var szEndBoundary = "\r\n--"+szBoundary+"--\r\n" ;
                    szContentType += "; boundary=" +szBoundary;
                    this.m_Log.Write("HttpComms2.js - send - update szContentType "+ szContentType);

                    for (j=0; j<this.m_aFormData.length; j++)
                    {
                        var oTemp = this.m_aFormData[j];

                        MultiStream.appendStream(this.inputStream(szStartBoundary));

                        var mimeStream = Components.classes["@mozilla.org/network/mime-input-stream;1"];
                        mimeStream = mimeStream.createInstance(Components.interfaces.nsIMIMEInputStream );
                        mimeStream.addContentLength = false;

                        var szContDisp = "form-data; name=\"" + oTemp.szName + "\"; ";
                        if (oTemp.bFile)
                        {
                            this.m_Log.Write("HttpComms2.js - send - adding data "+oTemp.szName);
                            this.m_Log.Write("HttpComms2.js - send - adding file" + oTemp.szFileName);
                            var szContDisp = "form-data; name=\"" + oTemp.szName + "\"; ";
                            szContDisp +="filename=\"" + (oTemp.szFileName ? oTemp.szFileName : "") + "\"";
                            mimeStream.addHeader("Content-Disposition",szContDisp);
                            mimeStream.addHeader("Content-Type","application/octet-stream");

                            if(oTemp.szValue)
                            {
                                this.m_Log.Write("HttpComms2.js - send - adding binary data");
                                var binaryStream = this.binaryStream(oTemp.szValue);
                                mimeStream.setData(binaryStream);
                            }
                            else
                                mimeStream.setData(this.inputStream(""));
                        }
                        else
                        {
                            this.m_Log.Write("HttpComms2.js - send - adding data "+oTemp.szName+" "+oTemp.szValue);
                            this.m_Log.Write("HttpComms2.js - send - adding form data");
                            var szContDisp = "form-data; name=\"" + oTemp.szName + "\"";
                            mimeStream.addHeader("Content-Disposition",szContDisp);
                            var valueStream = this.inputStream(oTemp.szValue? oTemp.szValue:"");
                            mimeStream.setData(valueStream);
                        }

                        MultiStream.appendStream(mimeStream);

                        if (j==this.m_aFormData.length-1)
                        {
                            this.m_Log.Write("HttpComms2.js - send - adding end boundary");
                            MultiStream.appendStream(this.inputStream(szEndBoundary));
                        }
                    }
                }
                else if (this.m_szContentType.search(/^application\/x-www-form-urlencoded$/i)!=-1)//urlencoded
                {
                    for (j=0; j<this.m_aFormData.length; j++)
                    {
                        var oTemp = this.m_aFormData[j];
                        this.m_Log.Write("HttpComms2.js - send - adding data "+oTemp.szName+" "+oTemp.szValue);

                        if (j>0) MultiStream.appendStream(this.inputStream("&"));
                        var szData = oTemp.szName + "=" + oTemp.szValue;
                        MultiStream.appendStream(this.inputStream(szData));
                    }
                }
                else  //other
                    MultiStream.appendStream(this.inputStream(this.m_aFormData[0].szValue));

                var uploadChannel = channel.QueryInterface(Components.interfaces.nsIUploadChannel);
                uploadChannel.setUploadStream(MultiStream , szContentType , -1);
            }

            HttpRequest.requestMethod = this.m_szMethod;

            var listener = new this.downloadListener(this.callback, this);
            channel.asyncOpen(listener, null);

            this.m_Log.Write("HttpComms2.js - send - END");
            return true;
        }
        catch(err)
        {
            this.m_Log.DebugDump("HttpComms2.js: send : Exception : "
                                                  + err.name
                                                  + ".\nError message: "
                                                  + err.message + "\n"
                                                  + err.lineNumber);
            return false;
        }
    },


    binaryStream : function (szData)
    {
        try
        {
            this.m_Log.Write("HttpComms2.js - binaryStream - START");
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

            this.m_Log.Write("HttpComms2.js - binaryStream - END");
            return buffer;
        }
        catch(err)
        {
            this.m_Log.DebugDump("HttpComms2.js: binaryStream : Exception : "
                                                  + err.name
                                                  + ".\nError message: "
                                                  + err.message + "\n"
                                                  + err.lineNumber);
            return null;
        }
    },


    createBoundary : function ()
    {
        this.m_Log.Write("HttpComms2.js - createBondary - START");

        var szBoundary = "-------------" +
                        parseInt(Math.floor(Math.random()*100001))+
                        parseInt(Math.floor(Math.random()*100001))+
                        parseInt(Math.floor(Math.random()*100001));

        this.m_Log.Write("HttpComms2.js - createBondary - END " + szBoundary);
        return szBoundary;
    },




    inputStream : function (szValue)
    {
        try
        {
            this.m_Log.Write("HttpComms2.js - inputStream - " + szValue);

            var Stream = Components.classes["@mozilla.org/io/string-input-stream;1"];
            Stream = Stream.createInstance(Components.interfaces.nsIStringInputStream);
            Stream.setData(szValue,-1);
            return Stream;
        }
        catch(err)
        {
            this.m_Log.DebugDump("HttpComms2.js: inputStream : Exception : "
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
            mainObject.m_Log.Write("HttpComms2.js - callback - START");
            mainObject.m_Log.Write("HttpComms2.js - callback : \n" + szResponse);

            //handle repsonse
            var httpChannel = event.QueryInterface(Components.interfaces.nsIHttpChannel);
            mainObject.m_Log.Write("commd.js - callback - status :" +httpChannel.responseStatus );

            //handle cookies
            if (mainObject.m_bHandleCookie)
            {
                mainObject.m_Log.Write("HttpComms2.js - callback - checking for cookies");

                //get cookies
                try
                {
                    var szCookies =  httpChannel.getResponseHeader("Set-Cookie");
                    mainObject.m_Log.Write("HttpComms2.js - callback - received cookies \n" + szCookies);
                    if (!mainObject.m_oCookies)
                    {
                        mainObject.m_oCookies = Components.classes["@mozilla.org/nsWebMailCookieManager;1"].createInstance();
                        mainObject.m_oCookies.QueryInterface(Components.interfaces.nsIWebMailCookieManager);
                    }
                    mainObject.m_oCookies.addCookie( httpChannel.URI, szCookies);
                }
                catch(e)
                {
                    mainObject.m_Log.Write("HttpComms2.js - callback - no cookies found");
                }
            }


            //handel Http auth
            if (mainObject.m_bHandleHttpAuth)
            {
                mainObject.m_Log.Write("HttpComms2.js - callback - Handling Http Auth");

                if (httpChannel.responseStatus == 401 && mainObject.m_szUserName && mainObject.m_szPassword)
                {
                    mainObject.m_iHttpAuth++;
                    if (mainObject.m_iHttpAuth >10) throw new Error ("Too login re-trys");

                    try
                    {
                        var szDomain = httpChannel.URI.host.match(/\.(.*?)$/)[1];
                        mainObject.m_Log.Write("HttpComms2.js - callback - domain " +szDomain);
                        var szAuthenticate =  httpChannel.getResponseHeader("www-Authenticate");
                        mainObject.m_Log.Write("HttpComms2.js - callback - www-Authenticate " + szAuthenticate);

                        if (!mainObject.m_AuthToken)
                        {
                            mainObject.m_AuthToken = Components.classes["@mozilla.org/HttpAuthManager;1"].createInstance();
                            mainObject.m_AuthToken.QueryInterface(Components.interfaces.nsIHttpAuthManager);
                        }

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
                        mainObject.m_Log.Write("HttpComms2.js - callback - Authentication failed");
                    }
                }
            }



            //bounce handler
            if (mainObject.m_bHandleBounce)
            {
                mainObject.m_Log.Write("HttpComms2.js - callback - Checking for Bounce");
                if ( httpChannel.responseStatus > 300 && httpChannel.responseStatus < 400)
                {
                    var szLocation = null;
                    try
                    {
                        szLocation =  httpChannel.getResponseHeader("Location");
                        mainObject.m_Log.Write("HttpComms2.js - callback - location \n" + szLocation);
                        szLocation = decodeURIComponent(szLocation);
                    }
                    catch(e)
                    {
                        throw new Error("Location header not found")
                    }

                    if (!mainObject.setURI(szLocation))
                    {
                        mainObject.m_Log.Write("HttpComms2.js - callback - location invalid");
                        szLocation = httpChannel.URI.prePath + szLocation;
                        szLocation = decodeURIComponent(szLocation);
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

            mainObject.m_Log.Write("HttpComms2.js - callback - END");
            return true;
        }
        catch(err)
        {
            mainObject.m_Log.DebugDump("HttpComms2.js: callback : Exception : "
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

            onStartRequest : function (aRequest, aContext)
            {
                this.m_data = "";
            },


            onDataAvailable : function (aRequest, aContext, aStream, aSourceOffset, aLength)
            {
                var binaryInputStream = Components.classes["@mozilla.org/binaryinputstream;1"];
                binaryInputStream = binaryInputStream.createInstance(Components.interfaces.nsIBinaryInputStream);
                binaryInputStream.setInputStream (aStream);
                this.m_data += binaryInputStream.readBytes(binaryInputStream.available());
            },


            onStopRequest : function (aRequest, aContext, aStatus)
            {
                CallbackFunc(this.m_data, aRequest, parent);
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
