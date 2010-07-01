function SMTPconnectionHandler(transport)
{
    try
    {
        var scriptLoader =  Components.classes["@mozilla.org/moz/jssubscript-loader;1"].
                                getService(Components.interfaces.mozIJSSubScriptLoader);

        scriptLoader.loadSubScript("chrome://web-mail/content/common/DebugLog.js");
        scriptLoader.loadSubScript("chrome://web-mail/content/common/base64.js");

        this.m_SMTPLog = new DebugLog("webmail.logging.comms",
                                      "{3c8e8390-2cf6-11d9-9669-0800200c9a66}",
                                      "SMTPConnectionlog");

        this.m_SMTPLog.Write("nsSMTPConnectionHander.js - START");



        var date = new Date();
        this.iID = date.getHours()+ "-" + date.getMinutes() + "-"+ date.getUTCMilliseconds();
        delete date;

        this.transport = transport;
        this.bAuth = false;
        this.iLoginReTryCount = 1;
        this.m_bData = false;
        this.m_szEmail = null;
        this.m_DomainHandler = null;

        //get streams
        this.ServerRequest = this.transport.openInputStream(0,0,-1);
        if (!this.ServerRequest) throw new Error("Error getting input stream.");
        this.ServerResponse =  this.transport.openOutputStream(0,0,0);
        if (!this.ServerResponse) throw new Error("Error getting output stream.");

        //create stream watcher
        this.Pump = Components.classes["@mozilla.org/network/input-stream-pump;1"].
                        createInstance(Components.interfaces.nsIInputStreamPump);
        this.Pump.init(this.ServerRequest, -1, -1, 0, 0, false);
        this.Pump.asyncRead(this,null);

        //connection made send ok
        var szOK  = "220 WebMail ESMTP\r\n";
        this.m_SMTPLog.Write("nsSMTPConnectionHandler.js - "+ szOK);
        this.ServerResponse.write(szOK,szOK.length);

        this.m_SMTPLog.Write("nsSMTPConnectionHandler.js - END");
    }
    catch(e)
    {
        this.m_SMTPLog.DebugDump("nsSMTPConnectionManager.js: Constructor : Exception : "
                                      + e.name +
                                      ".\nError message: "
                                      + e.message +"\n"
                                      + e.lineNumber);
    }
}

SMTPconnectionHandler.prototype.bRunning = true;
SMTPconnectionHandler.prototype.iID = 0;


SMTPconnectionHandler.prototype.onDataAvailable = function(request, context, inputStream, offset, count)
{
    try
    {
        this.m_SMTPLog.Write("SMTPconnectionHandler - onDataWritable - START "+ this.iID);

        var instream = Components.classes["@mozilla.org/scriptableinputstream;1"]
                     .createInstance(Components.interfaces.nsIScriptableInputStream);
        instream.init(inputStream);
        var szStream = instream.read(count);

        this.m_SMTPLog.Write("SMTPconnectionHandler - onDataWritable - STREAM "+this.iID+"\n"+ szStream);

        if (this.m_bData)
        {
            this.m_SMTPLog.Write("SMTPconnectionHandler - onDataWritable - Data MSG Cont - START "+ this.iID);

            if (szStream.search(/^\.$/m)!=-1)
            {
                this.m_bData = false;

                var szEmail = (this.m_szEmail)? this.m_szEmail :"";
                szEmail += szStream;

                if (!this.m_DomainHandler.rawMSG(szEmail))
                    throw new Error("msg upload failed");
            }
            else // there's more
            {
                (this.m_szEmail)? this.m_szEmail+= szStream : this.m_szEmail= szStream;
            }
            this.m_SMTPLog.Write("SMTPconnectionHandler - onDataWritable - Data MSG Cont - END "+ this.iID);
        }
        else
        {
            //remove \n\r from request
            var aStream = szStream.split("\r\n");  //split string on return carrage line feed
            var aCommand = aStream[0].split(" "); //split string on space

            switch(aCommand[0].toLowerCase())  //first element is command
            {
                case "ehlo":
                    this.m_SMTPLog.Write("SMTPconnectionHandler - onDataWritable - ehlo - START "+ this.iID);
                    var szResponse = "250-WebMail\r\n250 AUTH plain\r\n";
                    this.ServerResponse.write(szResponse, szResponse.length);
                    this.m_SMTPLog.Write("SMTPconnectionHandler - onDataWritable - ehlo\n"+ szResponse);
                    this.m_SMTPLog.Write("SMTPconnectionHandler - onDataWritable - ehlo - END");
                break;


                case "auth":
                    this.m_SMTPLog.Write("SMTPconnectionHandler - onDataWritable - auth - START "+ this.iID);
                    this.m_SMTPLog.Write("SMTPconnectionHandler - onDataWritable - auth - "+ aCommand);

                    switch(aCommand[1].toLowerCase())
                    {
                        case "plain":
                            this.m_SMTPLog.Write("SMTPconnectionHandler - onDataWritable - plain - START "+ this.iID);

                            //decode base 64 encodec text
                            var oBase64 = new base64();
                            var aszDecoded =  oBase64.decode(aCommand[2]).split("\0");
                            this.m_SMTPLog.Write("SMTPconnectionHandler - onDataWritable - decoded -" +aszDecoded);

                            var aszUserName = aszDecoded[1].replace(/\s/,"").split("@");                        
                            var szPassword = aszDecoded[2];

                            if (this.getDomainHandler(aszUserName[0], aszUserName[1]))
                            {
                                this.m_SMTPLog.Write("SMTPconnectionHandler - onDataWritable - got domain handler");

                                this.m_DomainHandler.passWord = szPassword;
                                this.m_DomainHandler.logIn();
                            }
                            else
                            {
                                var szTemp = "550 "+ aszUserName[1] + " is a unsupported domain\r\n"
                                this.ServerResponse.write(szTemp,szTemp.length);
                                this.m_SMTPLog.Write("SMTPconnectionHandler - onDataWritable - unsuppoorted domain");
                            }
                            this.m_SMTPLog.Write("SMTPconnectionHandler - onDataWritable - plain - END "+ this.iID);
                        break;

                        default:
                            this.m_SMTPLog.Write("SMTPconnectionHandler - onDataWritable - auth default - START "+ this.iID);
                            var szErr = "504 Unrecognized authentication type\r\n";
                            this.ServerResponse.write(szErr, szErr.length);
                            this.m_SMTPLog.Write("SMTPconnectionHandler - onDataWritable - auth default - END "+ this.iID);
                        break;
                    }

                    this.m_SMTPLog.Write("SMTPconnectionHandler - onDataWritable - auth - END "+ this.iID);
                break;



                //requires login
                case "mail":
                    this.m_SMTPLog.Write("SMTPconnectionHandler - onDataWritable - mail - START "+ this.iID);
                    this.m_SMTPLog.Write("SMTPconnectionHandler - onDataWritable - mail -\n"+ aCommand);

                    var szTemp;
                    try
                    {
                    	szTemp = aCommand[1].match(/<(.*?)>/)[1];
                    }
                    catch(e)
                    {
                    	szTemp = aCommand[2].match(/<(.*?)>/)[1];
                    }	
                    this.m_DomainHandler.from = szTemp;

                    var szResponse = "250 OK\r\n";
                    this.ServerResponse.write(szResponse, szResponse.length);

                    this.m_SMTPLog.Write("SMTPconnectionHandler - onDataWritable - mail - END "+ this.iID);
                break;


                case "rcpt":
                    this.m_SMTPLog.Write("SMTPconnectionHandler - onDataWritable - rcpt - START "+ this.iID);
                    this.m_SMTPLog.Write("SMTPconnectionHandler - onDataWritable - rcpt -\n"+ aCommand);

                    var szTemp;
                    try
                    {
                    	szTemp = aCommand[1].match(/<(.*?)>/)[1];
                    }
                    catch(e)
                    {
                    	szTemp = aCommand[2].match(/<(.*?)>/)[1];
                    }	
                    this.m_DomainHandler.to = szTemp;

                    var szResponse = "250 OK\r\n";
                    this.ServerResponse.write(szResponse, szResponse.length);

                    this.m_SMTPLog.Write("SMTPconnectionHandler - onDataWritable - rcpt - END "+ this.iID);
                break;


                case "data":
                    this.m_SMTPLog.Write("SMTPconnectionHandler - onDataWritable - data - START "+ this.iID);
                    this.m_SMTPLog.Write("SMTPconnectionHandler - onDataWritable - data -\n"+ aCommand);

                    var szResponse = "354 OK\r\n";
                    this.ServerResponse.write(szResponse, szResponse.length);
                    this.m_bData = true;
                    this.m_SMTPLog.Write("SMTPconnectionHandler - onDataWritable - data - END "+ this.iID);
                break;


                case "rset":
                    this.m_SMTPLog.Write("SMTPconnectionHandler - onDataWritable - rset - START "+ this.iID);
                    this.m_SMTPLog.Write("SMTPconnectionHandler - onDataWritable - rset -\n"+ aCommand);

                    var szResponse = "221 OK\r\n";
                    this.ServerResponse.write(szResponse, szResponse.length);

                    this.m_SMTPLog.Write("SMTPconnectionHandler - onDataWritable - rset - END "+ this.iID);
                break;


                case "quit":
                    this.m_SMTPLog.Write("SMTPconnectionHandler - onDataWritable - quit - START "+ this.iID);
                    this.m_SMTPLog.Write("SMTPconnectionHandler - onDataWritable - quit -\n"+ aCommand);

                    var szResponse = "221 OK\r\n";
                    this.ServerResponse.write(szResponse, szResponse.length);
                    this.ServerResponse.close();
                    this.ServerRequest.close();

                    this.m_SMTPLog.Write("SMTPconnectionHandler - onDataWritable - quit - END "+ this.iID);
                break;


                //all unsupported commands
                default:
                    var szErr = "502 negative vibes\r\n";
                    this.ServerResponse.write(szErr, szErr.length);
                    this.m_SMTPLog.Write("SMTPconnectionHandler - onDataWritable - default "
                                                       + szStream
                                                       + szErr);
                break;
            }
        }

        this.m_SMTPLog.Write("SMTPconnectionHandler - onDataWritable - END "+ this.iID);
    }
    catch(e)
    {
        var szErr = "502 negative vibes\r\n";
        this.ServerResponse.write(szErr, szErr.length);
        this.m_SMTPLog.DebugDump("nsSMTPConnectionManager.js: onDataAvailable : Exception : "
                                              + e.name
                                              + ".\nError message: "
                                              + e.message+"\n"
                                              + e.lineNumber);
    }
}


SMTPconnectionHandler.prototype.onStopRequest = function(request, context, status)
{
    this.m_SMTPLog.Write("SMTPconnectionHandler - onStopRequest - START "+ this.iID);

    this.ServerResponse.close();
    this.ServerRequest.close();
    this.bRunning = false;
    delete this.m_DomainHandler;

    this.m_SMTPLog.Write("SMTPconnectionHandler - onStopRequest - END "+ this.iID);
}


SMTPconnectionHandler.prototype.onStartRequest = function(request, context)
{
    this.m_SMTPLog.Write("SMTPconnectionHandler - onStartRequest - START "+ this.iID);
    this.m_SMTPLog.Write("SMTPconnectionHandler - onStartRequest - END "+ this.iID);
}






SMTPconnectionHandler.prototype.getDomainHandler = function(szUserName, szDomain)
{
    try
    {
        this.m_SMTPLog.Write("POPconnectionHandler - getDomainHandler - START");
        this.m_SMTPLog.Write("POPconnectionHandler - getDomainHandler - "
                                                + szUserName
                                                + " "
                                                + szDomain);

        var DomainManager = Components.classes["@mozilla.org/DomainManager;1"];
        DomainManager = DomainManager.getService();
        DomainManager.QueryInterface(Components.interfaces.nsIDomainManager);
        var szContentID = new Object;

        
        //get domain handler contentid and interfaceid
        this.m_SMTPLog.Write("SMTPconnectionHandler - getDomainHandler - Domain "
                                              + szUserName
                                              + " "
                                              +szDomain);

        if (DomainManager.getDomainForProtocol(szDomain,"smtp",szContentID)!=1)
        {
            delete szContentID;
            this.m_SMTPLog.Write("SMTPconnectionHandler - getDomainHandler - DomainManger false");
            return false;
        }

        this.m_SMTPLog.Write("SMTPconnectionHandler - getDomainHandler - ContentID " + szContentID.value);

        //load domain handler
        if (typeof(Components.classes[szContentID.value]) == "undefined")
        {
            delete szContentID;
            this.m_SMTPLog.Write("SMTPconnectionHandler - getDomainHandler - DomainHandler does not exist");
            return false;
        }

        this.m_SMTPLog.Write("SMTPconnectionHandler - getDomainHandler - DomainHandler exist cID " +szContentID.value);
        this.m_DomainHandler = Components.classes[szContentID.value].createInstance();
        this.m_DomainHandler.QueryInterface(Components.interfaces.nsISMTPDomainHandler);
        this.m_SMTPLog.Write("SMTPconnectionHandler - getDomainHandler - DomainHandler created ");

        this.m_DomainHandler.ResponseStream = this.ServerResponse;
        this.m_DomainHandler.userName = szUserName + "@" + szDomain;
        this.m_SMTPLog.Write("SMTPconnectionHandler - getDomainHandler - " +this.m_DomainHandler.userName);

        delete szContentID;

        this.m_SMTPLog.Write("SMTPconnectionHandler - getDomainHandler - END");
        return true;
    }
    catch(e)
    {
        this.m_SMTPLog.DebugDump("SMTPconnectionHandler.js : getDomainHandler : Exception : "
                                      + e.name
                                      + ".\nError message: "
                                      + e.message+"\n"
                                      + e.lineNumber);
        return false;
    }
}
