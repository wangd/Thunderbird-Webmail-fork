function IMAPconnectionHandler(transport)
{
    try
    {
        this.m_IMAPLog = new DebugLog("webmail.logging.comms", 
                                     "{3c8e8390-2cf6-11d9-9669-0800200c9a66}",
                                      "imapConnectionlog"); 
                                        
        this.m_IMAPLog.Write("nsIMAPConnectionHandler.js - IMAPconnectionHandler - START"); 
        
        this.transport = transport;
        this.bAuth = false;
                                          
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
        var szCAP  = "* OK IMAP4rev1 server ready\r\n";
        this.ServerResponse.write(szCAP,szCAP.length);
        
        this.m_IMAPLog.Write("nsIMAPConnectionHandler.js - IMAPconnectionHandler - END"); 
    }
    catch(e)
    {
        DebugDump("nsIMAPConnectionHandler.js: IMAPconnectionHandler Constructor : Exception : " 
                                      + e.name + 
                                      ".\nError message: " 
                                      + e.message);
    }
}

IMAPconnectionHandler.prototype.bRunning = true;


IMAPconnectionHandler.prototype.onDataAvailable = function(request, context, inputStream, offset, count)
{
    try
    {
        this.m_IMAPLog.Write("IMAPconnectionHandler - onDataWritable - START"); 
       
        var instream = Components.classes["@mozilla.org/scriptableinputstream;1"]
                     .createInstance(Components.interfaces.nsIScriptableInputStream);
        instream.init(inputStream);
        var szStream = instream.read(count);
        
        this.m_IMAPLog.Write("nsIMAPConnectionHandler - onDataWritable - stream " + szStream);
        
        //remove \n\r from request
        var aStream = szStream.split("\r\n");  //split string on return carrage line feed
        var aCommand = aStream[0].split(" "); //split string on space
        this.m_IMAPLog.Write("nsIMAPConnectionHandler - onDataWritable - command "+ aCommand); 
        
        switch(aCommand[1].toLowerCase())  //first element is command
        {   
            case "capability":
                this.m_IMAPLog.Write("nsIMAPConnectionHandler - onDataWritable - capability - START");
                var szResponse ="* CAPABILITY IMAP4rev1 CHILDREN NAMESPACE\r\n";
                szResponse+=aCommand[0]+" OK CAPABILITY completed\r\n"
                this.m_IMAPLog.Write("nsIMAPConnectionHandler - onDataWritable - capability - \n"+ szResponse);
                this.ServerResponse.write(szResponse,szResponse.length);
                this.m_IMAPLog.Write("nsIMAPConnectionHandler - onDataWritable - capability - END");
            break;
            
             
            case "login":
                this.m_IMAPLog.Write("nsIMAPConnectionHandler - onDataWritable - login - START");
                
                var szDomain = aCommand[2].substring(1,aCommand[2].length-1);
                var szPassWord = aCommand[3].substring(1,aCommand[3].length-1);
                
                var aszDomain = szDomain.split("@");     //split username and domain                         
                if (this.getDomainHandler(aszDomain[0], aszDomain[1]))
                {                  
                    this.m_DomainHandler.ResponseStream = this.ServerResponse;
                    this.m_DomainHandler.tag = aCommand[0];
                    this.m_DomainHandler.userName = szDomain;
                    this.m_DomainHandler.passWord = szPassWord;
                    
                    if (!this.m_DomainHandler.logIn())
                        throw new Error("login failed");
                }
                else
                {//domain is not supported or there's been a fuck up
                    var szTemp = aCommand[0]+" NO unsupported domain\r\n";
                    this.m_IMAPLog.Write("nsIMAPConnectionHandler - onDataWritable - login "+ szTemp);                  
                    this.ServerResponse.write(szTemp,szTemp.length);
                }  
                
                this.m_IMAPLog.Write("nsIMAPConnectionHandler - onDataWritable - login - END");
            break;
            
            
            case "namespace":
                this.m_IMAPLog.Write("nsIMAPConnectionHandler - onDataWritable - namespace - START");
                var szResponse="* NAMESPACE ((\"INBOX.\"\".\")) NIL NIL\r\n";
                szResponse +=aCommand[0]+" OK NAMESPACE complete\r\n" 
                this.m_IMAPLog.Write("nsIMAPConnectionHandler - onDataWritable - namespace - \n"+ szResponse);
                this.ServerResponse.write(szResponse,szResponse.length);
                this.m_IMAPLog.Write("nsIMAPConnectionHandler - onDataWritable - namespace - END");    
            break;
            
            
            case "lsub":
                this.m_IMAPLog.Write("nsIMAPConnectionHandler - onDataWritable - lsub - START");
                this.m_DomainHandler.tag = aCommand[0];
                this.m_DomainHandler.listSubscribe();
                this.m_IMAPLog.Write("nsIMAPConnectionHandler - onDataWritable - lsub - END");
            break;
            
            
            
            case "subscribe":
                this.m_IMAPLog.Write("nsIMAPConnectionHandler - onDataWritable - subscribe - START");
                this.m_DomainHandler.tag = aCommand[0];
                var szFolders = aStream[0].substring( aStream[0].indexOf("\"")+1,aStream[0].lastIndexOf("\""));
                this.m_IMAPLog.Write("nsIMAPConnectionHandler - onDataWritable - subscribe - folders " +szFolders );
                this.m_DomainHandler.subscribe(szFolders);
                this.m_IMAPLog.Write("nsIMAPConnectionHandler - onDataWritable - subscribe - END");
            break;
            
            
            case "unsubscribe":
                this.m_IMAPLog.Write("nsIMAPConnectionHandler - onDataWritable - unsubscribe - START");
                this.m_DomainHandler.tag = aCommand[0];
                var szFolders = aStream[0].substring( aStream[0].indexOf("\"")+1,aStream[0].lastIndexOf("\""));
                this.m_IMAPLog.Write("nsIMAPConnectionHandler - onDataWritable - unsubscribe - folder " + szFolders);
                this.m_DomainHandler.unSubscribe(szFolders);
                this.m_IMAPLog.Write("nsIMAPConnectionHandler - onDataWritable - unsubscribe - END");
            break;
            
            
            case "list":
                this.m_IMAPLog.Write("nsIMAPConnectionHandler - onDataWritable - list - START");
                this.m_DomainHandler.tag = aCommand[0];
                var szHierarchy = aCommand[3].substring(1,aCommand[3].length-1); 
                this.m_DomainHandler.list(szHierarchy);
                this.m_IMAPLog.Write("nsIMAPConnectionHandler - onDataWritable - list - END");
            break;
            
            case "select":
                this.m_IMAPLog.Write("nsIMAPConnectionHandler - onDataWritable - select - START");
                this.m_DomainHandler.tag = aCommand[0];
                var szHierarchy = aCommand[2].substring(1,aCommand[2].length-1); 
                this.m_DomainHandler.select(szHierarchy);
                this.m_IMAPLog.Write("nsIMAPConnectionHandler - onDataWritable - select - END");
            break;
            
            
            case "uid":
                this.m_IMAPLog.Write("nsIMAPConnectionHandler - onDataWritable - uid - START");
                
                if (aCommand[2].toLowerCase() == "fetch")
                {
                    this.m_IMAPLog.Write("nsIMAPConnectionHandler - onDataWritable - fetch");
                    this.m_DomainHandler.tag = aCommand[0];
                    var szFlags = szStream.substring( szStream.indexOf("(")+1,szStream.lastIndexOf(")"));
                    this.m_DomainHandler.fetch(aCommand[3],szFlags);
                }
                else if (aCommand[2].toLowerCase() == "copy")
                {
                    this.m_IMAPLog.Write("nsIMAPConnectionHandler - onDataWritable - copy");
                    this.m_DomainHandler.tag = aCommand[0];
                    var szDestination = aCommand[4].substring(1,aCommand[4].length-1);
                    this.m_DomainHandler.copy(aCommand[3],szDestination);
                }
                else if (aCommand[2].toLowerCase() == "store")
                {
                    this.m_IMAPLog.Write("nsIMAPConnectionHandler - onDataWritable - store");
                    this.m_DomainHandler.tag = aCommand[0];
                    var szFlags = szStream.substring( szStream.indexOf("(")+1, szStream.lastIndexOf(")"));
                    this.m_DomainHandler.store(aCommand[3],aCommand[4],szFlags );
                }
                else
                {
                    throw new Error("unknown command")
                }
                this.m_IMAPLog.Write("nsIMAPConnectionHandler - onDataWritable - uid - END");
            break;
            
            
            case "check":
                this.m_IMAPLog.Write("nsIMAPConnectionHandler - onDataWritable - check - START");
                this.m_DomainHandler.tag = aCommand[0];
                this.m_DomainHandler.check();
                this.m_IMAPLog.Write("nsIMAPConnectionHandler - onDataWritable - check - END");
            break;

            
            case "noop":
                this.m_IMAPLog.Write("nsIMAPConnectionHandler - onDataWritable - noop - START");
                this.m_DomainHandler.tag = aCommand[0];
                this.m_DomainHandler.noop();
                this.m_IMAPLog.Write("nsIMAPConnectionHandler - onDataWritable - noop - END");
            break;
            
            case "expunge":
                this.m_IMAPLog.Write("nsIMAPConnectionHandler - onDataWritable - expunge - START");
                this.m_DomainHandler.tag = aCommand[0];
                this.m_DomainHandler.expunge();
                this.m_IMAPLog.Write("nsIMAPConnectionHandler - onDataWritable - expunge - END");
            break;
            
            case "examine":
                this.m_IMAPLog.Write("nsIMAPConnectionHandler - onDataWritable - examine - START");
                this.m_DomainHandler.tag = aCommand[0];
                this.m_DomainHandler.examine();
                this.m_IMAPLog.Write("nsIMAPConnectionHandler - onDataWritable - examine - END");
            break;
            
            
            case "create":
                this.m_IMAPLog.Write("nsIMAPConnectionHandler - onDataWritable - create - START");
                this.m_DomainHandler.tag = aCommand[0];
                var szFolders = aStream[0].substring( aStream[0].indexOf("\"")+1,aStream[0].lastIndexOf("\""));
                this.m_DomainHandler.createFolder(szFolders);
                this.m_IMAPLog.Write("nsIMAPConnectionHandler - onDataWritable - create - END");
            break;
         
         
            case "delete":
                this.m_IMAPLog.Write("nsIMAPConnectionHandler - onDataWritable - delete - START");
                this.m_DomainHandler.tag = aCommand[0];
                var szFolders = aStream[0].substring( aStream[0].indexOf("\"")+1,aStream[0].lastIndexOf("\""));
                this.m_DomainHandler.deleteFolder(szFolders);
                this.m_IMAPLog.Write("nsIMAPConnectionHandler - onDataWritable - delete - END");
            break;
            
            
            case "rename":
                this.m_IMAPLog.Write("nsIMAPConnectionHandler - onDataWritable - rename - START");
                this.m_DomainHandler.tag = aCommand[0];
                
                //get start of old folder
                var szFolderTemp = aStream[0].substring(aStream[0].indexOf("\"")+1);
                this.m_IMAPLog.Write("nsIMAPConnectionHandler - onDataWritable - rename - " +szFolderTemp);
                //get end of old folder
                var iOldFolder = szFolderTemp.indexOf("\"");
                var szOldFolder = szFolderTemp.substring(0,iOldFolder);
                this.m_IMAPLog.Write("nsIMAPConnectionHandler - onDataWritable - rename old- " +szOldFolder);              
                
                //get start of new folder
                szFolderTemp = szFolderTemp.substring(iOldFolder+1); 
                szFolderTemp = szFolderTemp.substring(szFolderTemp.indexOf("\"")+1); 
                this.m_IMAPLog.Write("nsIMAPConnectionHandler - onDataWritable - rename - " +szFolderTemp); 
                //get end of new folder
                var iNewFolder = szFolderTemp.indexOf("\"");
                var szNewFolder = szFolderTemp.substring(0,iNewFolder);
                this.m_IMAPLog.Write("nsIMAPConnectionHandler - onDataWritable - rename new- " +szNewFolder); 
                
                this.m_DomainHandler.renameFolder(szOldFolder, szNewFolder);
                this.m_IMAPLog.Write("nsIMAPConnectionHandler - onDataWritable - rename - END");
            break;
           
           
            case "logout":
                this.m_IMAPLog.Write("nsIMAPConnectionHandler - onDataWritable - logout - START");
                this.m_DomainHandler.tag = aCommand[0];
                this.m_DomainHandler.logOut();
                this.m_IMAPLog.Write("nsIMAPConnectionHandler - onDataWritable - logout - END");
            break;
                    
                    
            //all unsupported commands
            default:
                var szERR =aCommand[0]+" BAD unknown command\r\n";
                this.ServerResponse.write(szERR,szERR.length);
                this.m_IMAPLog.Write("nsIMAPConnectionHandler - onDataWritable - default " 
                                                   + szStream 
                                                   + szERR); 
            break;
        }
        
        this.m_IMAPLog.Write("nsIMAPConnectionHandler - onDataWritable - END"); 
    }
    catch(e)
    {
        var szERR ="* BYE ERROR\r\n";
        this.ServerResponse.write(szERR,szERR.length);
        
        this.m_IMAPLog.DebugDump("nsIMAPConnectionHandler.js: IMAPconnectionHandler onDataAvailable : Exception : " 
                                              + e.name 
                                              + ".\nError message: " 
                                              + e.message);
    }
}

IMAPconnectionHandler.prototype.onStopRequest = function(request, context, status)
{
    this.m_IMAPLog.Write("nsIMAPConnectionHandler - onStopRequest - START"); 
    
    this.ServerResponse.close();
    this.ServerRequest.close();
    this.bRunning = false;
    
    this.m_IMAPLog.Write("nsIMAPConnectionHandler - onStopRequest - END"); 
}

IMAPconnectionHandler.prototype.onStartRequest = function(request, context)
{
    this.m_IMAPLog.Write("nsIMAPConnectionHandler - onStartRequest - START"); 
    this.m_IMAPLog.Write("nsIMAPConnectionHandler - onStartRequest - END"); 
}



IMAPconnectionHandler.prototype.getDomainHandler = function(szUserName, szDomain)
{
    try
    {
        this.m_IMAPLog.Write("IMAPconnectionHandler - getDomainHandler - START"); 
        
        this.m_IMAPLog.Write("IMAPconnectionHandler - getDomainHandler - " 
                                                + szUserName 
                                                + " " 
                                                + szDomain);
                                                
        var DomainManager = Components.classes["@mozilla.org/DomainManager;1"].
                                getService().
                                QueryInterface(Components.interfaces.nsIDomainManager);
        var szContentID = new Object;
       
        
        //get domain handler contentid and interfaceid
        this.m_IMAPLog.Write("IMAPconnectionHandler - getDomainHandler - Domain "  
                                              + szUserName 
                                              + " " 
                                              +szDomain);
                                              
        if (DomainManager.getDomainForProtocol(szDomain,"imap",szContentID)!=1)
        {
            delete szContentID;
            this.m_IMAPLog.Write("IMAPconnectionHandler - getDomainHandler - DomainManger false");
            return false;
        }
        
        this.m_IMAPLog.Write("IMAPconnectionHandler - getDomainHandler - ContentID " + szContentID.value);  
        
        //load domain handler
        if (typeof(Components.classes[szContentID.value]) == "undefined")
        {   
            delete szContentID;
            //delete bad record
            DomainManager.removeDomainForProtocol(szDomain, "imap");
            this.m_IMAPLog.Write("IMAPconnectionHandler - getDomainHandler - DomainHandler does not exist");
            return false;
        }
        
        this.m_IMAPLog.Write("IMAPconnectionHandler - getDomainHandler - DomainHandler exist cID " +szContentID.value); 
        this.m_DomainHandler = Components.classes[szContentID.value].createInstance(); 
        this.m_DomainHandler.QueryInterface(Components.interfaces.nsIIMAPDomainHandler);
        this.m_IMAPLog.Write("IMAPconnectionHandler - getDomainHandler - DomainHandler created "); 
                                                                                                    
        delete szContentID;    
                
        this.m_IMAPLog.Write("IMAPconnectionHandler - getDomainHandler - END"); 
        return true;
    }
    catch(e)
    {
        this.m_IMAPLog.DebugDump("IMAPconnectionHandler.js : getDomainHandler : Exception : " 
                                      + e.name 
                                      + ".\nError message: "
                                      + e.message);
        return false;      
    }
}
