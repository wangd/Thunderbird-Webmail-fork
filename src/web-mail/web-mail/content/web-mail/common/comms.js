function Comms(parent , log)
{
    try
    {
        var scriptLoader =  Components.classes["@mozilla.org/moz/jssubscript-loader;1"]
        scriptLoader = scriptLoader.getService(Components.interfaces.mozIJSSubScriptLoader);
        scriptLoader.loadSubScript("chrome://web-mail/content/common/DebugLog.js");
        scriptLoader.loadSubScript("chrome://web-mail/content/common/CookieManager.js");
        scriptLoader.loadSubScript("chrome://web-mail/content/common/commsData.js");
        scriptLoader.loadSubScript("chrome://web-mail/content/common/CookieManager.js");
        
        this.m_Log = log;
        this.m_Log.Write("comms.js - constructor - START");
          
        this.m_IOService = Components.classes["@mozilla.org/network/io-service;1"];
        this.m_IOService = this.m_IOService.getService(Components.interfaces.nsIIOService);
        
        this.m_oCookies = new CookieHandler(this.m_Log);
        
        this.m_bHandleCookie = true;
        this.m_bHandleBounce = true;
                
        this.m_URI = null;
        this.m_aHeaders = new Array();
        this.m_aFormData = new Array();
        this.m_szMethod = null;
        this.m_CallBack = null;
        this.m_szContentType = "application/x-www-form-urlencoded";
        this.m_iContentType = 0;
        this.m_parent = parent;
        this.m_szStartBoundary = null
        this.m_szEndBoundary = null;
        this.m_szBoundary = null;
        
        this.m_Log.Write("comms.js - constructor - END");  
    }
    catch(e)
    {
         DebugDump("comms.js: Constructor : Exception : " 
                                      + e.name 
                                      + ".\nError message: " 
                                      + e.message +"\n" +
                                      e.lineNumber);
    }
}


Comms.prototype =
{
    clean : function ()
    {
        this.m_URI = null;
        this.m_szMethod = null;
        this.m_CallBack = null;
        this.m_szContentType = "application/x-www-form-urlencoded";
        this.m_iContentType = 0;
                
        delete this.m_aHeaders;
        this.m_aHeaders = new Array();
        
        delete this.m_aFormData;
        this.m_aFormData = new Array();
    },
  
    setUser : function (szUser)
    {
        //for future use
    },
    
    setHandleCookies : function (bState)
    {
        this.m_bHandleCookie = bState;
    },
    
    
    setHandleBounce : function (bState)
    {
        this.m_bHandleBounce = bState;
    },
    
    
    setURI : function (szURI)
    {
        try
        {
            this.m_Log.Write("comms.js - setURI - " + szURI);
            
            if (!szURI) return false;
            
            this.m_URI = this.m_IOService.newURI(szURI, null, null);
            
            return true;
        }
        catch(err)
        {
            this.m_Log.DebugDump("comms.js: setURI : Exception : " 
                                                  + err.name 
                                                  + ".\nError message: " 
                                                  + err.message + "\n"
                                                  + err.lineNumber);
            return false;
        }
    },
    
      
    addRequestHeader : function (szName, szValue, bOverRide)
    {
        try
        {
            this.m_Log.Write("comms.js - addRequestHeader - " + szName + " " 
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
            this.m_Log.DebugDump("comms.js: addRequestHeader : Exception : " 
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
            this.m_Log.Write("comms.js - requestMethod - " + szMethod);
            if (!szMethod) return false;
            
            this.m_szMethod = szMethod;
             
            return true;
        }
        catch(err)
        {
            this.m_Log.DebugDump("comms.js: requestMethod : Exception : " 
                                                  + err.name 
                                                  + ".\nError message: " 
                                                  + err.message + "\n"
                                                  + err.lineNumber);
            return false;
        }
    },
   
   
    //0 = "application/x-www-form-urlencoded"
    //1 = "multipart/form-data"
    setContentType : function (iType)
    {
        try
        {
            this.m_Log.Write("comms.js - setContentType - START");
            this.m_Log.Write("comms.js - setContentType - " + iType);
                       
            this.m_iContentType = iType;
            
            if (iType==0) 
                this.m_szContentType= "application/x-www-form-urlencoded";
            else if (iType==1) 
                this.m_szContentType= "multipart/form-data";
            else
                this.m_szContentType= null;
            
            this.m_Log.Write("comms.js - setContentType - " + this.m_iContentType);
            this.m_Log.Write("comms.js - setContentType - " + this.m_szContentType);
            
            this.m_Log.Write("comms.js - setContentType - END");
            return true;
        }
        catch(err)
        {
            this.m_Log.DebugDump("comms.js: setContentType : Exception : " 
                                                  + err.name 
                                                  + ".\nError message: " 
                                                  + err.message + "\n"
                                                  + err.lineNumber);
            return false;
        }
    },
    
   
    addValuePair : function (szName, szValue)
    {
       try
        {
            this.m_Log.Write("comms.js - addValuePair - " + szName + " " + szValue);
             
            var oData = new commsData();
            oData.szName = szName;
            oData.szValue = szValue;
            this.m_aFormData.push(oData);
        
            return true;
        }
        catch(err)
        {
            this.m_Log.DebugDump("comms.js: addValuePair : Exception : " 
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
            this.m_Log.Write("comms.js - addFormData - START");
            this.m_Log.Write("comms.js - addFormData - " + szName + " " 
                                                         + szFileName + " "
                                                         + szValue);
                       
            var oData = new commsData();
            oData.szName = szName;
            oData.szValue = szValue;
            oData.szFileName = szFileName;
            oData.bBinary = true;
            oData.bFile = true;
            
            this.m_aFormData.push(oData);
                    
            this.m_Log.Write("comms.js - addFormData - END");
            return true;
        }
        catch(err)
        {
            this.m_Log.DebugDump("comms.js: addFile : Exception : " 
                                                  + err.name 
                                                  + ".\nError message: " 
                                                  + err.message + "\n"
                                                  + err.lineNumber);
            return false;
        } 
    },
    
    
    addData : function (szData, szContentType)
    {
        try
        {
            this.m_Log.Write("comms.js - addData - START");
            this.m_Log.Write("comms.js - addData - " + szContentType + "\n" + szData);
                       
            var oData = new commsData();
            oData.szName = null;
            oData.szValue = szData;
            this.m_szContentType = szContentType;    
            this.m_aFormData.push(oData);
                    
            this.m_Log.Write("comms.js - addFormData - END");
            return true;
        }
        catch(err)
        {
            this.m_Log.DebugDump("comms.js: addData : Exception : " 
                                                  + err.name 
                                                  + ".\nError message: " 
                                                  + err.message + "\n"
                                                  + err.lineNumber);
            return false;
        }
    },
    
    send : function (callback)
    {
        try
        {
            this.m_Log.Write("comms.js - send - START");
            
            this.m_CallBack = callback;
            
            var channel = this.m_IOService.newChannelFromURI(this.m_URI);
           
            var HttpRequest = channel.QueryInterface(Components.interfaces.nsIHttpChannel);                                     
            HttpRequest.redirectionLimit = 0; //stops automatic redirect handling
            
             this.m_Log.Write("comms.js - send - contenttype "+ this.m_iContentType);
            //set headers          
            
            //add cookies
            if (this.m_bHandleCookie)
            {
                var aszHost = this.m_URI.prePath.match(/[^\.\/]+\.[^\.\/]+$/);  
                var aszCookie = this.m_oCookies.findCookie(aszHost);
                if (aszCookie)
                    HttpRequest.setRequestHeader("Cookie", aszCookie, false);
            }
            
            //other headers
            for (i=0; i<this.m_aHeaders.length; i++)
            {   
                var oTemp = this.m_aHeaders[i];
                this.m_Log.Write("comms.js - send - adding headers "+ oTemp.szName +" "+
                                                                      oTemp.szValue +" "+
                                                                      oTemp.bOverRide);
                HttpRequest.setRequestHeader(oTemp.szName, oTemp.szValue, oTemp.bOverRide);
            }     
                 
            //set data
            if (this.m_aFormData.length>0)
            {
                MultiStream = Components.classes["@mozilla.org/io/multiplex-input-stream;1"];
                MultiStream = MultiStream.createInstance(Components.interfaces.nsIMultiplexInputStream);
                
                //create boundarys
                if (this.m_iContentType==1) this.createBoundary();
                
                                   
                for (j=0; j<this.m_aFormData.length; j++)
                {
                    var oTemp = this.m_aFormData[j];
                    this.m_Log.Write("comms.js - send - adding data "+oTemp.szName+" "+oTemp.szValue);
                    
                    if (this.m_iContentType==1) //formdata
                    {                           
                        this.m_Log.Write("comms.js - addFormData - adding start boundary");            
                        var startStream = Components.classes["@mozilla.org/io/string-input-stream;1"];
                        startStream = startStream.createInstance(Components.interfaces.nsIStringInputStream);
                        startStream.setData(this.m_szStartBoundary,-1);
                        MultiStream.appendStream(startStream);
                        startStream.close();
                         
                        var mimeStream = Components.classes["@mozilla.org/network/mime-input-stream;1"];
                        mimeStream = mimeStream.createInstance(Components.interfaces.nsIMIMEInputStream );
                        mimeStream.addContentLength = false;             
                         
                        var szContDisp = "form-data; name=\"" + oTemp.szName + "\"; ";
                        if (oTemp.bFile) 
                        {   
                            this.m_Log.Write("comms.js - send - adding file" + oTemp.szFileName);
                            var szContDisp = "form-data; name=\"" + oTemp.szName + "\"; ";  
                            szContDisp +="filename=\"" + (oTemp.szFileName ? oTemp.szFileName : "") + "\"";       
                            mimeStream.addHeader("Content-Disposition",szContDisp);
                            mimeStream.addHeader("Content-Type","application/octet-stream");
                            
                            if(oTemp.szValue)
                            {
                                this.m_Log.Write("comms.js - send - adding binary data");  
                                var nsIFile = this.writeBinaryFile(oTemp.szValue);
                                if (!nsIFile) throw new Error("file write failed");
                                var bufferStream = this.readBinaryFile(nsIFile);
                                if (!bufferStream) throw new Error("file read failed");
                               
                                this.m_Log.Write("comms.js - addFormData - buffer size " + bufferStream.available());
                                mimeStream.setData(bufferStream);
                                // bufferStream.close();
                            }
                            else
                            {
                                var valueStream = Components.classes["@mozilla.org/io/string-input-stream;1"];
                                valueStream = valueStream.createInstance( Components.interfaces.nsIStringInputStream );
                                valueStream.setData("",-1);
                                mimeStream.setData(valueStream);
                                valueStream.close();
                            }            
                        }    
                        else
                        {
                            this.m_Log.Write("comms.js - send - adding form data"); 
                            var szContDisp = "form-data; name=\"" + oTemp.szName + "\""; 
                            mimeStream.addHeader("Content-Disposition",szContDisp);
                            var valueStream = Components.classes["@mozilla.org/io/string-input-stream;1"];
                            valueStream = valueStream.createInstance( Components.interfaces.nsIStringInputStream );
                            valueStream.setData(oTemp.szValue? oTemp.szValue:"",-1);
                            mimeStream.setData(valueStream);
                            valueStream.close();
                        } 
                    
                        MultiStream.appendStream(mimeStream);
                       // mimeStream.close();
                        
                        if (j==this.m_aFormData.length-1)
                        {
                            this.m_Log.Write("comms.js - send - adding end boundary"); 
                            var endStream = Components.classes["@mozilla.org/io/string-input-stream;1"];
                            endStream = endStream.createInstance( Components.interfaces.nsIStringInputStream );
                            endStream.setData(this.m_szEndBoundary,-1);                   
                            MultiStream.appendStream(endStream);
                            endStream.close();
                        }
                    }
                    else if (this.m_iContentType==0)//urlencoded
                    {
                        if (j>0)
                        { 
                            var andStream = Components.classes["@mozilla.org/io/string-input-stream;1"];
                            andStream = andStream.createInstance(Components.interfaces.nsIStringInputStream);
                            andStream.setData("&",-1); 
                            MultiStream.appendStream(andStream);
                        }
            
                        var dataStream = Components.classes["@mozilla.org/io/string-input-stream;1"];
                        dataStream = dataStream.createInstance(Components.interfaces.nsIStringInputStream);
                        var szData = oTemp.szName + "=" + oTemp.szValue;
                        dataStream.setData(szData,-1); 
                        
                        MultiStream.appendStream(dataStream);
                        dataStream.close();
                    }
                    else  //other
                    {
                        var dataStream = Components.classes["@mozilla.org/io/string-input-stream;1"];
                        dataStream = dataStream.createInstance(Components.interfaces.nsIStringInputStream);
                        var szData = oTemp.szValue;
                        dataStream.setData(szData,-1); 
                        MultiStream.appendStream(dataStream);
                        dataStream.close();     
                    }
                }
                
                var szContentType = this.m_szContentType;
                if (this.m_iContentType == 1) //"application/x-www-form-urlencoded"
                    szContentType +="; boundary=" +this.m_szBoundary;
                this.m_Log.Write("comms.js - send - contentType "+szContentType);
                
                var uploadChannel = channel.QueryInterface(Components.interfaces.nsIUploadChannel);
                uploadChannel.setUploadStream(MultiStream , szContentType , -1);   
            }
            
            HttpRequest.requestMethod = this.m_szMethod;
             
            var listener = new this.downloadListener(this.callback, this);
            channel.asyncOpen(listener, null);  
            
            this.m_Log.Write("comms.js - send - END");
            return true;
        }
        catch(err)
        {
            this.m_Log.DebugDump("comms.js: send : Exception : " 
                                                  + err.name 
                                                  + ".\nError message: " 
                                                  + err.message + "\n"
                                                  + err.lineNumber);
            return false;
        }
    },
    
       
    writeBinaryFile : function (szData)
    {
        try
        {
            this.m_Log.Write("comms.js - writeBinaryFile - START");
            var file = Components.classes["@mozilla.org/file/directory_service;1"];
            file = file.getService(Components.interfaces.nsIProperties);
            file = file.get("TmpD", Components.interfaces.nsIFile);
            file.append("suggestedName.tmp");
            file.createUnique(Components.interfaces.nsIFile.NORMAL_FILE_TYPE, 420); 
           
            var outputStream = Components.classes["@mozilla.org/network/file-output-stream;1"];
            outputStream = outputStream.createInstance( Components.interfaces.nsIFileOutputStream );
            outputStream.init( file, 0x04 | 0x08 | 0x10, 420, 0 );
            
            var binaryStream = Components.classes["@mozilla.org/binaryoutputstream;1"];
            binaryStream = binaryStream.createInstance(Components.interfaces.nsIBinaryOutputStream);
            binaryStream.setOutputStream(outputStream)
            binaryStream.writeBytes( szData, szData.length );
            outputStream.close();
            binaryStream.close();
            this.m_Log.Write("comms.js - writeBinaryFile - END");
            return file;
        }
        catch(err)
        {
            this.m_Log.DebugDump("comms.js: writeBinaryFile : Exception : " 
                                                  + err.name 
                                                  + ".\nError message: " 
                                                  + err.message + "\n"
                                                  + err.lineNumber);
            return null;
        }
    },
    
    
    readBinaryFile : function (nsIFile)
    {
        try
        {
            this.m_Log.Write("comms.js - readBinaryFile - START");
            
            var deletefile = Components.classes["@mozilla.org/uriloader/external-helper-app-service;1"];
            deletefile = deletefile.getService(Components.interfaces.nsPIExternalAppLauncher);
            deletefile.deleteTemporaryFileOnExit(nsIFile);       
            
            //read for file
            var file = Components.classes["@mozilla.org/file/local;1"];
        	file = file.createInstance(Components.interfaces.nsILocalFile);
        	file.initWithFile(nsIFile);
        	
            var inputStream = Components.classes["@mozilla.org/network/file-input-stream;1"];
        	inputStream = inputStream.createInstance(Components.interfaces.nsIFileInputStream);
            inputStream.init(nsIFile, 0x01 , 0 , null);
              
            var binaryStream = Components.classes["@mozilla.org/binaryinputstream;1"];
            binaryStream = binaryStream.createInstance(Components.interfaces.nsIBinaryInputStream);
            binaryStream.setInputStream(inputStream);
                 
            var buffer = Components.classes["@mozilla.org/network/buffered-input-stream;1"];
            buffer = buffer.createInstance(Components.interfaces.nsIBufferedInputStream);
            buffer.init(binaryStream, 4096); 
           
            this.m_Log.Write("comms.js - readBinaryFile - END");
            return buffer;
        }
        catch (err)
        {
            this.m_Log.DebugDump("comms.js: readBinaryFile : Exception : " 
                                                  + err.name 
                                                  + ".\nError message: " 
                                                  + err.message + "\n"
                                                  + err.lineNumber);
            return null;
        }
    },
    
    
    createBoundary : function ()
    {
        this.m_Log.Write("comms.js - createBondary - START");
        
        this.m_szBoundary = "-------------" + 
                            parseInt(Math.floor(Math.random()*100001))+
                            parseInt(Math.floor(Math.random()*100001))+
                            parseInt(Math.floor(Math.random()*100001));
        
        this.m_Log.Write("comms.js - createBondary - boundary " + this.m_szBoundary );  
        this.m_szStartBoundary = "\r\n--"+this.m_szBoundary+"\r\n" ;              
        this.m_szEndBoundary = "\r\n--"+this.m_szBoundary+"--\r\n" ;
        
        this.m_Log.Write("comms.js - createBondary - END");
        return this.m_szBoundary;
    },
    
    
   
    
    
    callback : function(szResponse ,event , mainObject)
    {
        try
        {
            mainObject.m_Log.Write("comms.js - callback - START");
            mainObject.m_Log.Write("comms.js - callback : \n" + szResponse);  
            
            //handle repsonse
            var httpChannel = null;
            if (mainObject.m_bHandleCookie || mainObject.m_bHandleBounce )
            {
                httpChannel = event.QueryInterface(Components.interfaces.nsIHttpChannel);
                mainObject.m_Log.Write("commd.js - callback - status :" +httpChannel.responseStatus );
                 
                //handle cookies
                if (mainObject.m_bHandleCookie)
                {
                    mainObject.m_Log.Write("comms.js - callback - Handling cookies");
                    
                    var szURL = httpChannel.URI.host;
                    mainObject.m_Log.Write("comms.js - callback - url - " + szURL);  
                    var aszTempDomain = szURL.match(/[^\.\/]+\.[^\.\/]+$/);  
                    mainObject.m_Log.Write("comms.js - callback - domain - " + aszTempDomain[0]); 
                    
                    //get cookies
                    try
                    {
                        var szCookies =  httpChannel.getResponseHeader("Set-Cookie");
                        mainObject.m_Log.Write("comms.js - callback - received cookies \n" + szCookies);  
                        mainObject.m_oCookies.addCookie( aszTempDomain[0], szCookies); 
                    }
                    catch(e)
                    {
                        mainObject.m_Log.Write("comms.js - callback - no cookies found"); 
                    }     
                }
                
                
                //bounce handler
                if (mainObject.m_bHandleBounce)
                {
                    if ( httpChannel.responseStatus > 300 && httpChannel.responseStatus < 400)
                    {   var szLocation = null;
                        try
                        {
                            szLocation =  httpChannel.getResponseHeader("Location");
                            mainObject.m_Log.Write("comms.js - callback - location \n" + szLocation);  
                        }
                        catch(e)
                        {
                            throw new Error("Location header not found")
                        } 
                        var oCallback = mainObject.m_CallBack;        
                        mainObject.clean();
                        mainObject.setURI(szLocation);
                        mainObject.setRequestMethod("GET");
                        var bResult = mainObject.send(oCallback);                             
                        if (!bResult) throw new Error("httpConnection returned false");
                        return;
                    }
                }
            }
            
            //let component handle response
            mainObject.m_CallBack (szResponse, event, mainObject.m_parent);
            
            mainObject.m_Log.Write("comms.js - callback - END");
            return true;
        }
        catch(err)
        {
            mainObject.m_Log.DebugDump("comms.js: callback : Exception : " 
                                                  + err.name 
                                                  + ".\nError message: " 
                                                  + err.message + "\n"
                                                  + err.lineNumber);
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
                var scriptInputStream = Components.classes["@mozilla.org/scriptableinputstream;1"];
                scriptInputStream = scriptInputStream.createInstance(Components.interfaces.nsIScriptableInputStream);
                scriptInputStream.init(aStream);
            
                this.m_data += scriptInputStream.read(aLength);
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
