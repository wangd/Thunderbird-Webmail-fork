/*****************************  Globals   *************************************/                 
const nsIMAPConnectionManagerCID = Components.ID("{48f21650-9bd3-11d9-9669-0800200c9a66}");
const nsIMAPConnectionManagerProgID = "@mozilla.org/IMAPConnectionManager;1";
                                      

/***********************  imap connectionManager ********************************/
function nsIMAPConnectionManager()
{
    try
    {
        this.m_serverSocket = Components.classes["@mozilla.org/network/server-socket;1"].
                                createInstance(Components.interfaces.nsIServerSocket);
        
       
        var scriptLoader =  Components.classes["@mozilla.org/moz/jssubscript-loader;1"];
        scriptLoader = scriptLoader.getService(Components.interfaces.mozIJSSubScriptLoader);
        scriptLoader.loadSubScript("chrome://web-mail/content/common/DebugLog.js");
        scriptLoader.loadSubScript("chrome://web-mail/content/common/CommonPrefs.js");
        scriptLoader.loadSubScript("chrome://web-mail/content/server/imapConnectionHandler.js")
        
          
        this.m_IMAPLog = new DebugLog("webmail.logging.comms", 
                                      "{3c8e8390-2cf6-11d9-9669-0800200c9a66}",
                                      "imapServerlog"); 
        
        this.m_IMAPLog.Write("nsIMAPConnectionManager.js - Constructor - START");   
                    
        //-1 error , 0 = stopped ,1 = waiting, 2= ruuning                       
        this.iStatus = -1;               //error
        this.aIMAPConnections = new Array();
        
        this.GarbageTimer = Components.classes["@mozilla.org/timer;1"];
        this.GarbageTimer = this.GarbageTimer.createInstance(Components.interfaces.nsITimer);  
        this.bGarbage = false;
      
        this.m_IMAPLog.Write("nsIMAPConnectionManager.js - Constructor - END");   
    }
    catch(e)
    {
         DebugDump("nsIMAPConnectionManager.js: Constructor : Exception : " 
                              + e.name  
                              + " line " 
                              + e.linenumber
                              + ".\nError message: " 
                              + e.message);
    }
}

nsIMAPConnectionManager.prototype.Start = function()
{
   try
   {
        this.m_IMAPLog.Write("nsIMAPConnectionManager.js - Start - START");
        
        if(this.iStatus != 2 && this.iStatus != 1)  //enter here if server is not running
        {
            if (!this.bGarbage)
            {//start garbage collection
                this.GarbageTimer.initWithCallback(this, 
                                                   20000, //20 seconds 
                                                   Components.interfaces.nsITimer.TYPE_REPEATING_SLACK);
                this.bGarbage = true;
            }
            
            //get pref settings
            var  WebMailPrefAccess = new WebMailCommonPrefAccess();
            var oPref = new Object();
            oPref.Value = null;
            if (! WebMailPrefAccess.Get("int", "webmail.server.port.imap", oPref)) 
            {
                this.m_IMAPLog.Write("nsIMAPConnectionManager.js - Start - webmail.server.port.imap failed. Set to default 143");
                oPref.Value = 143;
            }
            this.m_IMAPLog.Write("nsIMAPConnectionManager.js - Start - IMAP port value "+ oPref.Value);
            this.iIMAPPort = oPref.Value;
            delete WebMailPrefAccess
            
            //create listener
            //connect only to this machine, 10 Queue
            this.m_serverSocket.init(this.iIMAPPort, true, 10); 
            this.m_serverSocket.asyncListen(this); 
              
            this.iStatus = 2;  //started
        }
        this.m_IMAPLog.Write("nsIMAPConnectionManager.js - Start - END");
        
        return true;
    }
    catch(e)
    {
        this.m_IMAPLog.DebugDump("nsIMAPConnectionManager.js: Start : Exception : " 
                                          + e.name 
                                          + ".\nError message: " 
                                          + e.message);
        
        this.iStatus = -1;  //error
        return false;
    } 
}


nsIMAPConnectionManager.prototype.Stop = function()
{
    try
    {
        this.m_IMAPLog.Write("nsIMAPConnectionManager.js - Stop - START");
        
        if (this.iStatus != 0) //only enter if server has not stopped
        {
            this.m_IMAPLog.Write("nsIMAPConnectionManager.js - Stop - stopping");
            this.m_serverSocket.close();  //stop new conections
            this.iStatus = 1;  //set status to waiting = 1
        }
        
        this.m_IMAPLog.Write("nsIMAPConnectionManager.js - Stop - END");
        return true;
    }
    catch(e)
    {
        this.m_IMAPLog.DebugDump("nsIMAPConnectionManager.js: Stop : Exception : " 
                                      + e.name 
                                      + ".\nError message: " 
                                      + e.message);
                              
        return false;
    }
}


//-1 = ERROR (RED); 0 = Stopped (GREY); 1 = WAITING (AMBER)2 = Running (GREEN)
nsIMAPConnectionManager.prototype.GetStatus = function ()
{
    try
    {
        this.m_IMAPLog.Write("nsIMAPConnectionManager.js - GetStatus - START");
        
        if ( this.iStatus == 1)  //waiting to stop
        {
            this.g_IMAPLog.Write("nsIMAPConnectionManager.js - GetStatus - connections " 
                                                        + this.aIMAPConnections.length);
            var iCount = 0;
            if (this.aIMAPConnections.length>0)
            {
                for (var i =1 ; i<=this.aIMAPConnections.length; i++)
                {
                    if (this.aIMAPConnections[i] != undefined)
                    {
                        iCount++;
                        this.g_IMAPLog.Write("nsIMAPConnectionManager.js - GetStatus - connections " + iCount);
                    }
                }
            } 
            
            if (iCount==0 ) this.iStatus = 0 //stopped
        }
        this.m_IMAPLog.Write("nsIMAPConnectionManager.js - status = " + this.iStatus);    
        this.m_IMAPLog.Write("nsIMAPConnectionManager.js - GetStatus -  END");
        return this.iStatus; 
    }
    catch(e)
    {
        this.m_IMAPLog.DebugDump("nsIMAPConnectionManager.js: GetStatus : Exception : " 
                                      + e.name 
                                      + ".\nError message: " 
                                      + e.message);
    }
}



nsIMAPConnectionManager.prototype.onSocketAccepted = function(serverSocket, transport)
{
    try
    {
        this.m_IMAPLog.Write("nsIMAPConnectionManager.js - onSocketAccepted - START");
        
        this.aIMAPConnections.push ( new IMAPconnectionHandler(transport));
           
        this.m_IMAPLog.Write("nsIMAPConnectionManager.js - onSocketAccepted - END");   
    }
    catch(e)
    {
        this.m_IMAPLog.DebugDump("nsIMAPConnectionManager.js: onSocketAccepted : Exception : " 
                                      + e.name 
                                      + ".\nError message: " 
                                      + e.message);
    }
}


nsIMAPConnectionManager.prototype.onStopListening = function(serverSocket, status)
{
   this.m_IMAPLog.Write("nsIMAPConnectionManager.js - onStopListening - START");
   this.m_IMAPLog.Write("nsIMAPConnectionManager.js - onStopListening - END"); 
}


//garbage collection
nsIMAPConnectionManager.prototype.notify = function()
{
    try
    {
       // this.m_IMAPLog.Write("nsIMAPConnectionManager.js - notify - START");  //spamming log file
       
      //  this.m_IMAPLog.Write("nsIMAPConnectionManager.js - notify - connections " +this.aIMAPConnections.length);
        if (this.aIMAPConnections.length>0)
        {
            var iMax = this.aIMAPConnections.length;
            for (var i = 0 ; i<iMax ; i++)
            {
                this.m_IMAPLog.Write("nsIMAPConnectionManager.js - connection " + 0 + " "+ this.aIMAPConnections[0]);
                
                if (this.aIMAPConnections[0] != undefined)
                {  
                    var temp = this.aIMAPConnections.shift();  //get first item
                    this.m_IMAPLog.Write("nsIMAPConnectionManager.js - connection " + i + " "+ temp.bRunning+ " " +temp.iID);
                   
                    if (temp.bRunning == false)
                    { 
                        delete temp; 
                        this.m_IMAPLog.Write("nsIMAPConnectionManager.js - notify - dead connection deleted"+ " " +temp.iID); 
                    }
                    else
                    {
                        this.aIMAPConnections.push(temp);
                        this.m_IMAPLog.Write("nsIMAPConnectionManager.js - notify - restored live connection"+ " " +temp.iID); 
                    }
                }
            }
        } 
        
       // this.m_IMAPLog.Write("nsIMAPConnectionManager.js - notify - END"); 
    }
    catch(e)
    {
        this.m_IMAPLog.DebugDump("nsIMAPConnectionManager.js: notify : Exception : " 
                                      + e.name 
                                      + ".\nError message: " 
                                      + e.message);
    }   
}


/******************************************************************************/
/***************** XPCOM  stuff ***********************************************/
/******************************************************************************/
nsIMAPConnectionManager.prototype.QueryInterface = function (iid)
{
    if (!iid.equals(Components.interfaces.nsIIMAPConnectionManager) 
		                      	&& !iid.equals(Components.interfaces.nsISupports))
        throw Components.results.NS_ERROR_NO_INTERFACE;
        
    return this;
}

 

/******************************************************************************/
/* FACTORY*/
var nsIMAPConnectionManagerFactory = new Object();

nsIMAPConnectionManagerFactory.createInstance = function (outer, iid)
{
    if (outer != null)
        throw Components.results.NS_ERROR_NO_AGGREGATION;
    
    if (!iid.equals(nsIMAPConnectionManagerCID) 
                            && !iid.equals(Components.interfaces.nsISupports))
        throw Components.results.NS_ERROR_INVALID_ARG;
    
    return new nsIMAPConnectionManager();
}


/******************************************************************************/
/* MODULE */
var nsIMAPConnectionManagerModule = new Object();

nsIMAPConnectionManagerModule.registerSelf = function(compMgr, fileSpec, location, type)
{
    compMgr = compMgr.QueryInterface(Components.interfaces.nsIComponentRegistrar);
    compMgr.registerFactoryLocation(nsIMAPConnectionManagerCID,
                                    "IMAP Connection Manager",
                                    nsIMAPConnectionManagerProgID, 
                                    fileSpec,
                                    location, 
                                    type);
}

nsIMAPConnectionManagerModule.unregisterSelf = function(aCompMgr, aFileSpec, aLocation)
{
    aCompMgr = aCompMgr.QueryInterface(Components.interfaces.nsIComponentRegistrar);
    aCompMgr.unregisterFactoryLocation(nsIMAPConnectionManagerProgID, aFileSpec);
}
 
nsIMAPConnectionManagerModule.getClassObject = function(compMgr, cid, iid)
{
    if (!cid.equals(nsIMAPConnectionManagerCID))
        throw Components.results.NS_ERROR_NO_INTERFACE;

    if (!iid.equals(Components.interfaces.nsIFactory))
        throw Components.results.NS_ERROR_NOT_IMPLEMENTED;

    return nsIMAPConnectionManagerFactory;
}


nsIMAPConnectionManagerModule.canUnload = function(compMgr)
{
    return true;
}
/******************************************************************************/


function NSGetModule(compMgr, fileSpec)
{
    return nsIMAPConnectionManagerModule; 
}
