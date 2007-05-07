function POPconnectionHandler(transport)
{
    try
    {
        this.m_POPLog = new DebugLog("webmail.logging.comms",
                                     "{3c8e8390-2cf6-11d9-9669-0800200c9a66}",
                                     "popConnectionlog");

        var date = new Date();
        this.iID = date.getHours()+ "-" + date.getMinutes() + "-"+ date.getUTCMilliseconds();
        delete date;

        this.m_POPLog.Write("nsPOPConnectionHandler.js - POPconnectionHandler - START - "+ this.iID);


        this.transport = transport;
        this.bAuth = false;
        this.iLoginReTryCount = 1;
        this.m_DomainHandler = null;

        //get streams
        this.ServerRequest = this.transport.openInputStream(0,0,0);
        if (!this.ServerRequest) throw new Error("Error getting input stream.");
        this.ServerResponse =  this.transport.openOutputStream(0,0,-1);
        if (!this.ServerResponse) throw new Error("Error getting output stream.");

        //create stream watcher
        this.Pump = Components.classes["@mozilla.org/network/input-stream-pump;1"];
        this.Pump = this.Pump.createInstance(Components.interfaces.nsIInputStreamPump);
        this.Pump.init(this.ServerRequest, -1, -1, 0, 0, false);
        this.Pump.asyncRead(this,null);

        //connection made send ok
        var szOK  = "+OK POP3 thats cool man\r\n";
        this.ServerResponse.write(szOK,szOK.length);

        this.m_POPLog.Write("nsPOPConnectionHandler.js - POPconnectionHandler - END - "+ this.iID);
    }
    catch(e)
    {
        this.m_POPLog.DebugDump("nsPOPConnectionHandler.js: POPconnectionHandler Constructor : Exception : "
                                      + e.name +
                                      ".\nError message: "
                                      + e.message+ "\n"
                                      + e.lineNumber);
    }
}

POPconnectionHandler.prototype.bRunning = true;
POPconnectionHandler.prototype.iID = 0;



POPconnectionHandler.prototype.onDataAvailable = function(request, context, inputStream, offset, count)
{
    try
    {
        this.m_POPLog.Write("POPconnectionHandler - onDataWritable - START - "+ this.iID);

        var instream = Components.classes["@mozilla.org/scriptableinputstream;1"]
                     .createInstance(Components.interfaces.nsIScriptableInputStream);
        instream.init(inputStream);
        var szStream = instream.read(count);

        //remove \n\r from request
        var aStream = szStream.split("\r\n");  //split string on return carrage line feed
        var aCommand = aStream[0].split(" "); //split string on space

        switch(aCommand[0].toLowerCase())  //first element is command
        {
            //AUTHORIZATION state
            case "user":
                this.m_POPLog.Write("POPconnectionHandler - onDataWritable - user - START - "+ this.iID);

                var aszDomain = aCommand[1].split("@");     //split username and domain
                if (this.getDomainHandler(aszDomain[0], aszDomain[1]))
                {
                    this.m_POPLog.Write("POPconnectionHandler - onDataWritable - user "
                                                + aCommand[0] + " "
                                                + aCommand[1] + " "
                                                + szOK);

                    this.ServerResponse.write(szOK,szOK.length);
                }
                else
                {//domain is not supported or there's been a fuck up
                    var szTemp = "-ERR "+ aszDomain[1] + " is a unsupported domain\r\n"

                    this.m_POPLog.Write("POPconnectionHandler - onDataWritable - user "
                                                + aCommand[0] + " "
                                                + aCommand[1] + " "
                                                + szTemp);

                    this.ServerResponse.write(szTemp,szTemp.length);
                }

                this.m_POPLog.Write("POPconnectionHandler - onDataWritable - user - END " + this.iID);
            break;


            case "pass":
                try
                {
                    this.m_POPLog.Write("POPconnectionHandler - onDataWritable - pass START "
                                                + aCommand[0] + " "
                                                + aCommand[1] + " "
                                                + this.iID);

                    if (this.iLoginReTryCount == 0)
                        throw new Error("ran out of login re-trys");

                    this.iLoginReTryCount --;

                    try
                    {//new method
                        this.m_DomainHandler.passWord = aCommand[1];
                        if (!this.m_DomainHandler.logIn())
                            throw new Error("login failed");
                    }
                    catch(err)
                    {//old method
                        if (!this.m_DomainHandler.logIn(aCommand[1]))
                            throw new Error("login failed");
                    }

                    this.m_POPLog.Write("POPconnectionHandler - onDataWritable - pass END " +this.iID);
                }
                catch(e)
                {
                    if (this.iLoginReTryCount != 0)
                    {
                        var szTemp = "-ERR login has failed\r\n" ;
                        this.m_POPLog.Write("POPconnectionHandler - onDataWritable - pass " + szTemp);
                        this.ServerResponse.write(szTemp,szTemp.length);
                    }
                    this.ServerResponse.close();
                    this.ServerRequest.close();

                    this.m_POPLog.Write("POPconnectionHandler - onDataWritable - pass "
                                                + aCommand[0] + " "
                                                + aCommand[1] + "\n"
                                                + e.message+ "\n"
                                                + e.lineNumber);
                }
            break;

            //TRANSACTION State
            case "stat":
                try
                {
                    this.m_POPLog.Write("POPconnectionHandler - onDataWritable - stat - START "+ this.iID);

                    if (!this.m_DomainHandler.bAuthorised)
                        throw new Error("not logged how did you here?");

                    //have successful logged in
                    if (!this.m_DomainHandler.getNumMessages())
                        throw new Error("getNumMessages returned false");

                    this.m_POPLog.Write("POPconnectionHandler - onDataWritable - stat - END   "+ this.iID);
                }
                catch(e)
                {
                    this.ServerResponse.write(szERR,szERR.length);
                    this.m_POPLog.DebugDump("popHandler.js: stat : Exception : "
                                                      + e.name
                                                      + ".\nError message: "
                                                      + e.message+ "\n"
                                                      + e.lineNumber);
                }
            break;

            case "list":
                try
                {
                    this.m_POPLog.Write("POPconnectionHandler - onDataWritable - list - START "+ this.iID);

                    if (!this.m_DomainHandler.bAuthorised)
                        throw new Error("not logged how did you here?");

                    if (!this.m_DomainHandler.getMessageSizes())
                        throw new Error("getMessageSizes returned false");

                    this.m_POPLog.Write("POPconnectionHandler - onDataWritable - list - END   "+ this.iID);
                }
                catch(e)
                {
                    this.ServerResponse.write(szERR,szERR.length);
                    this.m_POPLog.DebugDump("popHandler.js: list : Exception : "
                                                  + e.name
                                                  + ".\nError message: "
                                                  + e.message+ "\n"
                                                  + e.lineNumber);
                }
            break;

            case "uidl":
                try
                {
                    this.m_POPLog.Write("POPconnectionHandler - onDataWritable - uidl - START "+ this.iID);

                    if (!this.m_DomainHandler.bAuthorised)
                        throw new Error("not logged how did you here?");

                    if (!this.m_DomainHandler.getMessageIDs())
                        throw new Error("getMessageIDs returned false");

                    this.m_POPLog.Write("POPconnectionHandler - onDataWritable - uidl - END   "+ this.iID);
                }
                catch(e)
                {
                    this.ServerResponse.write(szERR,szERR.length);
                    this.m_POPLog.DebugDump("popHandler.js: uidl : Exception : "
                                                  + e.name
                                                  + ".\nError message: "
                                                  + e.message+ "\n"
                                                  + e.lineNumber);
                }
            break;

            case "top" :
                try
                {
                    this.m_POPLog.Write("POPconnectionHandler - onDataWritable - top - START "+ this.iID);

                    if (!this.m_DomainHandler.bAuthorised)
                        throw new Error("not logged how did you here?");

                    try
                    {
                        this.m_POPLog.Write("POPconnectionHandler - onDataWritable - top -" + aCommand[1] );
                        if (!this.m_DomainHandler.getMessageHeaders(aCommand[1]))
                            throw new Error("TOP NOT supported");
                    }
                    catch(e)
                    {
                        this.ServerResponse.write(szERR,szERR.length);
                        this.m_POPLog.Write("POPconnectionHandler - onDataWritable - top - Not Supported");
                        this.m_POPLog.Write("popHandler.js: top : Exception : "
                                                  + e.name
                                                  + ".\nError message: "
                                                  + e.message + "\n"
                                                  + e.lineNumber);
                    }

                    this.m_POPLog.Write("POPconnectionHandler - onDataWritable - top - END   "+ this.iID);
                }
                catch(e)
                {
                    this.ServerResponse.write(szERR,szERR.length);
                    this.m_POPLog.Write("popHandler.js: top : Exception : "
                                                  + e.name
                                                  + ".\nError message: "
                                                  + e.message + "\n"
                                                  + e.lineNumber);
                }
            break;

            case "retr":
                try
                {
                    this.m_POPLog.Write("POPconnectionHandler - onDataWritable - retr - START "+ this.iID);

                    if (!this.m_DomainHandler.bAuthorised)
                        throw new Error("not logged how did you here?");

                    this.m_POPLog.Write("POPconnectionHandler - onDataWritable - retr -" + aCommand[1] );
                    if (!this.m_DomainHandler.getMessage( aCommand[1]))
                        throw new Error("getMessage returned false");

                    this.m_POPLog.Write("POPconnectionHandler - onDataWritable - retr - END   "+ this.iID);
                }
                catch(e)
                {
                    this.ServerResponse.write(szERR,szERR.length);
                    this.m_POPLog.DebugDump("popHandler.js: retr : Exception : "
                                                  + e.name
                                                  + ".\nError message: "
                                                  + e.message+ "\n"
                                                  + e.lineNumber);
                }
            break;


            case "dele":
                try
                {
                    this.m_POPLog.Write("POPconnectionHandler - onDataWritable - dele - START "+ this.iID);

                    if (!this.m_DomainHandler.bAuthorised)
                        throw new Error("not logged how did you here?");

                    this.m_POPLog.Write("POPconnectionHandler - onDataWritable - dele " + aCommand[1]);
                    if (!this.m_DomainHandler.deleteMessage(aCommand[1]))
                        throw new Error("deleteMessage return false");

                    this.m_POPLog.Write("POPconnectionHandler - onDataWritable - dele - END   "+ this.iID);
                }
                catch(e)
                {
                    this.ServerResponse.write(szERR,szERR.length);
                    this.m_POPLog.DebugDump("popHandler.js: dele : Exception : "
                                                  + e.name
                                                  + ".\nError message: "
                                                  + e.message+ "\n"
                                                  + e.lineNumber);
                }
            break;


            //UPDATE state
            case "quit":
                try
                {
                    this.m_POPLog.Write("POPconnectionHandler - onDataWritable - quit - START - "+ this.iID);

                    if (!this.m_DomainHandler.bAuthorised)
                        throw new Error("not logged how did you here?");

                    if (!this.m_DomainHandler.logOut())
                        throw new Error("logout returned false");

                    this.m_POPLog.Write("POPconnectionHandler - onDataWritable - quit - END "+ this.iID);
                }
                catch(e)
                {
                    this.ServerResponse.write(szERR,szERR.length);
                    this.m_POPLog.DebugDump("popHandler.js: quit : Exception : "
                                                  + e.name
                                                  + ".\nError message: "
                                                  + e.message+ "\n"
                                                  + e.lineNumber);
                }
            break;



            case "capa":
                var szTemp = "+OK \r\nUSER\r\nUIDL\r\nTOP\r\n.\r\n"
                this.m_POPLog.Write("POPconnectionHandler - onDataWritable - capa "+ szTemp);
                this.ServerResponse.write(szTemp,szTemp.length);
            break;


            case "noop":
                var szTemp = "+OK stop the time wasting\r\n"
                this.m_POPLog.Write("POPconnectionHandler - onDataWritable - noop " + szTemp);
                this.ServerResponse.write(szTemp,szTemp.length);
            break;


            //all unsupported commands
            default:
                this.ServerResponse.write(szERR,szERR.length);
                this.m_POPLog.Write("POPconnectionHandler - onDataWritable - default "
                                                   + szStream
                                                   + szERR);
            break;
        }

        this.m_POPLog.Write("POPconnectionHandler - onDataWritable - END "+ this.iID);
    }
    catch(e)
    {
        this.m_POPLog.DebugDump("nsPOPConnectionManager.js: POPconnectionHandler onDataAvailable : Exception : "
                                              + e.name
                                              + ".\nError message: "
                                              + e.message+ "\n"
                                              + e.lineNumber);
    }
}

POPconnectionHandler.prototype.onStopRequest = function(request, context, status)
{
    this.m_POPLog.Write("POPconnectionHandler - onStopRequest - START "+ this.iID);

    this.ServerResponse.close();
    this.ServerRequest.close();
    delete this.m_DomainHandler;
    this.bRunning = false;


    this.m_POPLog.Write("POPconnectionHandler - onStopRequest - END   "+ this.iID);
}

POPconnectionHandler.prototype.onStartRequest = function(request, context)
{
    this.m_POPLog.Write("POPconnectionHandler - onStartRequest - START "+ this.iID);
    this.m_POPLog.Write("POPconnectionHandler - onStartRequest - END   "+ this.iID);
}



POPconnectionHandler.prototype.getDomainHandler = function(szUserName, szDomain)
{
    try
    {
        this.m_POPLog.Write("POPconnectionHandler - getDomainHandler - START");

        this.m_POPLog.Write("POPconnectionHandler - getDomainHandler - "
                                                + szUserName
                                                + " "
                                                + szDomain);

        var DomainManager = Components.classes["@mozilla.org/DomainManager;1"];
        DomainManager = DomainManager.getService();
        DomainManager.QueryInterface(Components.interfaces.nsIDomainManager);
        var szContentID = new Object;


        //get domain handler contentid and interfaceid
        this.m_POPLog.Write("POPconnectionHandler - getDomainHandler - Domain "
                                              + szUserName
                                              + " "
                                              +szDomain);

        if (DomainManager.getDomainForProtocol(szDomain,"pop",szContentID)!=1)
        {
            delete szContentID;
            this.m_POPLog.Write("POPconnectionHandler - getDomainHandler - DomainManger false");
            return false;
        }

        this.m_POPLog.Write("POPconnectionHandler - getDomainHandler - ContentID " + szContentID.value);

        //load domain handler
        if (typeof(Components.classes[szContentID.value]) == "undefined")
        {
            delete szContentID;
            //delete bad record
            DomainManager.removeDomainForProtocol(szDomain, "pop");
            this.m_POPLog.Write("POPconnectionHandler - getDomainHandler - DomainHandler does not exist");
            return false;
        }

        this.m_POPLog.Write("POPconnectionHandler - getDomainHandler - DomainHandler exist cID " +szContentID.value);
        this.m_DomainHandler = Components.classes[szContentID.value].createInstance();

        try
        {
            this.m_DomainHandler.QueryInterface(Components.interfaces.nsIPOPDomainHandler);
            this.m_POPLog.Write("POPconnectionHandler - getDomainHandler - DomainHandler created ");
        }
        catch(err)
        {
            this.m_DomainHandler.QueryInterface(Components.interfaces.nsIDomainHandler);
            this.m_POPLog.Write("POPconnectionHandler - getDomainHandler - DomainHandler created - DEPRECATED INTERFACE");
        }

        this.m_DomainHandler.ResponseStream = this.ServerResponse;
        this.m_DomainHandler.userName = szUserName + "@" + szDomain;
        this.m_POPLog.Write("POPconnectionHandler - getDomainHandler - " +this.m_DomainHandler.userName);


        delete szContentID;

        this.m_POPLog.Write("POPconnectionHandler - getDomainHandler - END");
        return true;
    }
    catch(e)
    {
        this.m_POPLog.DebugDump("POPconnectionHandler.js : getDomainHandler : Exception : "
                                      + e.name
                                      + ".\nError message: "
                                      + e.message+ "\n"
                                      + e.lineNumber);
        return false;
    }
}
