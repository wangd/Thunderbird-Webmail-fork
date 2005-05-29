
function SMTPconnectionHandler(transport)
{
    try
    {
        this.m_SMTPLog = new DebugLog("webmail.logging.comms", 
                                      "{3c8e8390-2cf6-11d9-9669-0800200c9a66}",
                                      "SMTPConnectionlog"); 
                                        
        this.m_SMTPLog.Write("nsSMTPConnectionManager.js - SMTPconnectionHandler - START"); 
        
        var scriptLoader =  Components.classes["@mozilla.org/moz/jssubscript-loader;1"].
                                getService(Components.interfaces.mozIJSSubScriptLoader);
                       
        if (scriptLoader)
            scriptLoader.loadSubScript("chrome://web-mail/content/common/base64.js");
        
        
        this.transport = transport;
        this.bAuth = false;
        this.iLoginReTryCount = 1;
                                  
        //get streams
        this.ServerRequest = this.transport.openInputStream(0,0,0);
        if (!this.ServerRequest) throw new Error("Error getting input stream.");
        this.ServerResponse =  this.transport.openOutputStream(2,0,0);
        if (!this.ServerResponse) throw new Error("Error getting output stream.");
        
        //create stream watcher
        this.Pump = Components.classes["@mozilla.org/network/input-stream-pump;1"].
                        createInstance(Components.interfaces.nsIInputStreamPump);
        this.Pump.init(this.ServerRequest, -1, -1, 0, 0, false);
        this.Pump.asyncRead(this,null);
        
        //connection made send ok
        var szOK  = "220 SMTP thats so cool man\r\n";
        this.ServerResponse.write(szOK,szOK.length);
        
        this.m_SMTPLog.Write("nsSMTPConnectionManager.js - SMTPconnectionHandler - END"); 
    }
    catch(e)
    {
        this.m_SMTPLog.DebugDump("nsSMTPConnectionManager.js: SMTPconnectionHandler Constructor : Exception : " 
                                      + e.name + 
                                      ".\nError message: " 
                                      + e.message);
    }
}

SMTPconnectionHandler.prototype.bRunning = true;


SMTPconnectionHandler.prototype.onDataAvailable = function(request, context, inputStream, offset, count)
{
    try
    {
        this.m_SMTPLog.Write("SMTPconnectionHandler - onDataWritable - START"); 
       
        var instream = Components.classes["@mozilla.org/scriptableinputstream;1"]
                     .createInstance(Components.interfaces.nsIScriptableInputStream);
        instream.init(inputStream);
        var szStream = instream.read(count);
        
        //remove \n\r from request
        var aStream = szStream.split("\r\n");  //split string on return carrage line feed
        var aCommand = aStream[0].split(" "); //split string on space
        
        switch(aCommand[0].toLowerCase())  //first element is command
        {   
            case "ehlo":
                this.m_SMTPLog.Write("SMTPconnectionHandler - onDataWritable - ehlo - START"); 
                var szResponse = "250-localhost\r\n250 AUTH PLAIN\r\n";
                this.ServerResponse.write(szResponse, szResponse.length); 
                this.m_SMTPLog.Write("SMTPconnectionHandler - onDataWritable - ehlo\n"+ szResponse);
                this.m_SMTPLog.Write("SMTPconnectionHandler - onDataWritable - ehlo - END");   
            break;
            
            case "auth":
                this.m_SMTPLog.Write("SMTPconnectionHandler - onDataWritable - auth - START"); 
                this.m_SMTPLog.Write("SMTPconnectionHandler - onDataWritable - auth -\n"+ aCommand); 
                 
                switch(aCommand[1].toLowerCase())
                {
                    case "plain":
                        this.m_SMTPLog.Write("SMTPconnectionHandler - onDataWritable - plain - START"); 
                           
                        //decode base 64 encodec text
                        var aszDecoded =  DecBase64(aCommand[2]).split("\0");
                        this.m_SMTPLog.Write("SMTPconnectionHandler - onDataWritable - decoded -" +aszDecoded); 
                        
                        var aszUserName = aszDecoded[1].split("@");
                        var szPassword = aszDecoded[2];
                        
                        if (this.getDomainHandler(aszUserName[0], aszUserName[1]))
                        { 
                            this.m_SMTPLog.Write("SMTPconnectionHandler - onDataWritable - got domain handler");  
                        
                            this.m_DomainHandler.bSMTP = true;
                            if (!this.m_DomainHandler.logIn(szPassword))
                                throw new Error("login failed");      
                        }
                        else
                        {
                            var szTemp = "550 "+ aszUserName[1] + " is a unsupported domain\r\n"              
                            this.ServerResponse.write(szTemp,szTemp.length);
                            this.m_SMTPLog.Write("SMTPconnectionHandler - onDataWritable - unsuppoorted domain");    
                        }
                        this.m_SMTPLog.Write("SMTPconnectionHandler - onDataWritable - plain - END"); 
                    break;
                    
                    default:
                        this.m_SMTPLog.Write("SMTPconnectionHandler - onDataWritable - !plain - START"); 
                        var szErr = "504 Unrecognized authentication type\r\n";
                        this.ServerResponse.write(szErr, szErr.length);
                        this.m_SMTPLog.Write("SMTPconnectionHandler - onDataWritable - !plain - END"); 
                    break;
                } 
                
                this.m_SMTPLog.Write("SMTPconnectionHandler - onDataWritable - auth - END"); 
            break;
            
            
            case "mail":
                this.m_SMTPLog.Write("SMTPconnectionHandler - onDataWritable - mail - START"); 
                this.m_SMTPLog.Write("SMTPconnectionHandler - onDataWritable - mail -\n"+ aCommand); 
                var aszMail = aCommand[1].split(":");
                switch(aszMail[0].toLowerCase())
                {
                    case "from":
                        this.m_SMTPLog.Write("SMTPconnectionHandler - onDataWritable - from - START");
                        this.m_SMTPLog.Write("SMTPconnectionHandler - onDataWritable - from -\n"+ aszMail); 
                        
                        //address
                        var aszAddress = aszMail[1].split("<")[1].split(">");
                        this.m_SMTPLog.Write("SMTPconnectionHandler - onDataWritable - from -address\n"+ aszAddress[0]); 
                       
                        var szResponse = "250 thats cool\r\n";
                        this.ServerResponse.write(szResponse, szResponse.length); 
                       
                        this.m_SMTPLog.Write("SMTPconnectionHandler - onDataWritable - from - END");
                    break; 
                }
                this.m_SMTPLog.Write("SMTPconnectionHandler - onDataWritable - mail - END"); 
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
        
        this.m_SMTPLog.Write("SMTPconnectionHandler - onDataWritable - END"); 
    }
    catch(e)
    {
        var szErr = "502 negative vibes\r\n";
        this.ServerResponse.write(szErr, szErr.length);
        this.m_SMTPLog.DebugDump("nsSMTPConnectionManager.js: SMTPconnectionHandler onDataAvailable : Exception : " 
                                              + e.name 
                                              + ".\nError message: " 
                                              + e.message);
    }
}


SMTPconnectionHandler.prototype.onStopRequest = function(request, context, status)
{
    this.m_SMTPLog.Write("SMTPconnectionHandler - onStopRequest - START"); 
    
    this.ServerResponse.close();
    this.ServerRequest.close();
    this.bRunning = false;
    
    this.m_SMTPLog.Write("SMTPconnectionHandler - onStopRequest - END"); 
}


SMTPconnectionHandler.prototype.onStartRequest = function(request, context)
{
    this.m_SMTPLog.Write("SMTPconnectionHandler - onStartRequest - START"); 
    this.m_SMTPLog.Write("SMTPconnectionHandler - onStartRequest - END"); 
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
                                                
        var DomainManager = Components.classes["@mozilla.org/DomainManager;1"].
                                getService().
                                QueryInterface(Components.interfaces.nsIDomainManager);
        var szContentID = new Object;
       
        
        //get domain handler contentid and interfaceid
        this.m_SMTPLog.Write("SMTPconnectionHandler - getDomainHandler - Domain "  
                                              + szUserName 
                                              + " " 
                                              +szDomain);
                                              
        if (DomainManager.getDomain(szDomain,"smtp",szContentID)!=1)
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
            //delete bad record
            DomainManager.removeDomainProtocol(szDomain,"smtp");
            this.m_SMTPLog.Write("SMTPconnectionHandler - getDomainHandler - DomainHandler does not exist");
            return false;
        }
        
        this.m_SMTPLog.Write("SMTPconnectionHandler - getDomainHandler - DomainHandler exist cID " +szContentID.value); 
        this.m_DomainHandler = Components.classes[szContentID.value].
                                createInstance(Components.interfaces.nsIDomainHandler);   
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
                                      + e.message);
        return false;      
    }
}
