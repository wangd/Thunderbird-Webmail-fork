/*****************************  Globals   *************************************/                 
const nsIMAPConnectionManagerCID = Components.ID("{48f21650-9bd3-11d9-9669-0800200c9a66}");
const nsIMAPConnectionManagerProgID = "@mozilla.org/IMAPConnectionManager;1";
                                      

/***********************  imap connectionManager ********************************/
function nsIMAPConnectionManager()
{
    this.m_serverSocket = null;
    this.m_Log = null;   
    this.m_GarbageTimer = null;
    this.m_iStatus = 0;  //-1 error , 0 = stopped ,1 = waiting, 2= ruuning
    this.m_aIMAPConnections = new Array();
    this.m_bGarbage = false;
}

nsIMAPConnectionManager.prototype.Start = function()
{
   try
   {
        this.m_Log.Write("nsIMAPConnectionManager.js - Start - START");
        
        if(this.m_iStatus != 2 && this.m_iStatus != 1)  //enter here if server is not running
        {
            if (!this.m_bGarbage)
            {//start garbage collection
                this.m_GarbageTimer.initWithCallback(this, 
                                                   20000, //20 seconds 
                                                   Components.interfaces.nsITimer.TYPE_REPEATING_SLACK);
                this.m_bGarbage = true;
            }
            
            //get pref settings
            var  WebMailPrefAccess = new WebMailCommonPrefAccess();
            var oPref = new Object();
            oPref.Value = null;
            if (! WebMailPrefAccess.Get("int", "webmail.server.port.imap", oPref)) 
            {
                this.m_Log.Write("nsIMAPConnectionManager.js - Start - webmail.server.port.imap failed. Set to default 143");
                oPref.Value = 143;
            }
            this.m_Log.Write("nsIMAPConnectionManager.js - Start - IMAP port value "+ oPref.Value);
            this.iIMAPPort = oPref.Value;
            delete WebMailPrefAccess
            
            //create listener
            //connect only to this machine, 10 Queue
            this.m_serverSocket.init(this.iIMAPPort, true, 10); 
            this.m_serverSocket.asyncListen(this); 
              
            this.m_iStatus = 2;  //started
        }
        this.m_Log.Write("nsIMAPConnectionManager.js - Start - END");
        
        return true;
    }
    catch(e)
    {
        this.m_Log.DebugDump("nsIMAPConnectionManager.js: Start : Exception : " 
                                          + e.name 
                                          + ".\nError message: " 
                                          + e.message + "\n"
                                          + e.lineNumber);
        
        this.m_iStatus = -1;  //error
        return false;
    } 
}


nsIMAPConnectionManager.prototype.Stop = function()
{
    try
    {
        this.m_Log.Write("nsIMAPConnectionManager.js - Stop - START");
        
         this.m_Log.Write("nsIMAPConnectionManager.js - Stop - "+ this.m_iStatus);
        if (this.m_iStatus != 0 && this.m_iStatus!=-1) //only enter if server has not stopped
        {
            this.m_Log.Write("nsIMAPConnectionManager.js - Stop - stopping");
            this.m_serverSocket.close();  //stop new conections
            this.m_iStatus = 1;  //set status to waiting = 1
        }
        
        this.m_Log.Write("nsIMAPConnectionManager.js - Stop - END");
        return true;
    }
    catch(e)
    {
        this.m_Log.DebugDump("nsIMAPConnectionManager.js: Stop : Exception : " 
                                      + e.name 
                                      + ".\nError message: " 
                                      + e.message+ "\n"
                                      + e.lineNumber);
        
        this.m_iStatus = -1;  //error                      
        return false;
    }
}


//-1 = ERROR (RED); 0 = Stopped (GREY); 1 = WAITING (AMBER)2 = Running (GREEN)
nsIMAPConnectionManager.prototype.GetStatus = function ()
{
    try
    {
        this.m_Log.Write("nsIMAPConnectionManager.js - GetStatus - START");
        
        if ( this.m_iStatus == 1)  //waiting to stop
        {
            this.g_IMAPLog.Write("nsIMAPConnectionManager.js - GetStatus - connections " 
                                                        + this.m_aIMAPConnections.length);
            var iCount = 0;
            if (this.m_aIMAPConnections.length>0)
            {
                for (var i =1 ; i<=this.m_aIMAPConnections.length; i++)
                {
                    if (this.m_aIMAPConnections[i] != undefined)
                    {
                        iCount++;
                        this.g_IMAPLog.Write("nsIMAPConnectionManager.js - GetStatus - connections " + iCount);
                    }
                }
            } 
            
            if (iCount==0 ) this.m_iStatus = 0 //stopped
        }
        this.m_Log.Write("nsIMAPConnectionManager.js - status = " + this.m_iStatus);    
        this.m_Log.Write("nsIMAPConnectionManager.js - GetStatus -  END");
        return this.m_iStatus; 
    }
    catch(e)
    {
        this.m_Log.DebugDump("nsIMAPConnectionManager.js: GetStatus : Exception : " 
                                      + e.name 
                                      + ".\nError message: " 
                                      + e.message+ "\n"
                                      + e.lineNumber);
        this.m_iStatus = -1;  //error
        return this.m_iStatus; 
    }
}



nsIMAPConnectionManager.prototype.onSocketAccepted = function(serverSocket, transport)
{
    try
    {
        this.m_Log.Write("nsIMAPConnectionManager.js - onSocketAccepted - START");
        
        this.m_aIMAPConnections.push ( new IMAPconnectionHandler(transport));
           
        this.m_Log.Write("nsIMAPConnectionManager.js - onSocketAccepted - END");   
    }
    catch(e)
    {
        this.m_Log.DebugDump("nsIMAPConnectionManager.js: onSocketAccepted : Exception : " 
                                      + e.name 
                                      + ".\nError message: " 
                                      + e.message+ "\n"
                                      + e.lineNumber);
    }
}


nsIMAPConnectionManager.prototype.onStopListening = function(serverSocket, status)
{
   this.m_Log.Write("nsIMAPConnectionManager.js - onStopListening - START");
   this.m_Log.Write("nsIMAPConnectionManager.js - onStopListening - END"); 
}


//garbage collection
nsIMAPConnectionManager.prototype.notify = function()
{
    try
    {
       // this.m_Log.Write("nsIMAPConnectionManager.js - notify - START");  //spamming log file
       
      //  this.m_Log.Write("nsIMAPConnectionManager.js - notify - connections " +this.m_aIMAPConnections.length);
        if (this.m_aIMAPConnections.length>0)
        {
            var iMax = this.m_aIMAPConnections.length;
            for (var i = 0 ; i<iMax ; i++)
            {
                this.m_Log.Write("nsIMAPConnectionManager.js - connection " + 0 + " "+ this.m_aIMAPConnections[0]);
                
                if (this.m_aIMAPConnections[0] != undefined)
                {  
                    var temp = this.m_aIMAPConnections.shift();  //get first item
                    this.m_Log.Write("nsIMAPConnectionManager.js - connection " + i + " "+ temp.bRunning+ " " +temp.iID);
                   
                    if (temp.bRunning == false)
                    { 
                        delete temp; 
                        this.m_Log.Write("nsIMAPConnectionManager.js - notify - dead connection deleted"+ " " +temp.iID); 
                    }
                    else
                    {
                        this.m_aIMAPConnections.push(temp);
                        this.m_Log.Write("nsIMAPConnectionManager.js - notify - restored live connection"+ " " +temp.iID); 
                    }
                }
            }
        } 
        
       // this.m_Log.Write("nsIMAPConnectionManager.js - notify - END"); 
    }
    catch(e)
    {
        this.m_Log.DebugDump("nsIMAPConnectionManager.js: notify : Exception : " 
                                      + e.name 
                                      + ".\nError message: " 
                                      + e.message+ "\n"
                                      + e.lineNumber);
    }   
}



nsIMAPConnectionManager.prototype.observe = function(aSubject, aTopic, aData) 
{
    switch(aTopic) 
    {
        case "xpcom-startup":
            // this is run very early, right after XPCOM is initialized, but before
            // user profile information is applied.
            var obsSvc = Components.classes["@mozilla.org/observer-service;1"].
                            getService(Components.interfaces.nsIObserverService);
            obsSvc.addObserver(this, "profile-after-change", false);
            obsSvc.addObserver(this, "quit-application", false);
            
            this.m_scriptLoader = Components.classes["@mozilla.org/moz/jssubscript-loader;1"]
                                    .getService(Components.interfaces.mozIJSSubScriptLoader);
                                    
            this.m_GarbageTimer = Components.classes["@mozilla.org/timer;1"]
                                    .createInstance(Components.interfaces.nsITimer);  
                                    
            this.m_serverSocket = Components.classes["@mozilla.org/network/server-socket;1"]
                                    .createInstance(Components.interfaces.nsIServerSocket);
        break;
        
        case "profile-after-change":
            // This happens after profile has been loaded and user preferences have been read.
            // startup code here
            this.m_scriptLoader .loadSubScript("chrome://web-mail/content/common/DebugLog.js");
            this.m_scriptLoader .loadSubScript("chrome://web-mail/content/common/CommonPrefs.js");
            this.m_scriptLoader .loadSubScript("chrome://web-mail/content/server/imapConnectionHandler.js");
            this.m_Log = new DebugLog("webmail.logging.comms", 
                                      "{3c8e8390-2cf6-11d9-9669-0800200c9a66}",
                                      "imapServerlog"); 
            this.intial();
        break;
        
        case "quit-application": // shutdown code here
            this.Stop();
        break;
        
        case "app-startup":
        break;
        
        default:
            throw Components.Exception("Unknown topic: " + aTopic);
    }
}


nsIMAPConnectionManager.prototype.intial = function ()
{
    try
    {
        this.m_Log.Write("nsIMAPConnectionManager : intial - START");
        
        var oPref = new Object();
        oPref.Value = null;
        
        var  WebMailPrefAccess = new WebMailCommonPrefAccess();
        WebMailPrefAccess.Get("bool","webmail.bUseIMAPServer",oPref); 
        if (oPref.Value) 
        {
            this.m_Log.Write("nsIMAPConnectionManager : intial - IMAP server wanted");
            if (this.Start())
                this.m_Log.Write("nsIMAPConnectionManager : intial - IMAP server started");
            else
                this.m_Log.Write("nsIMAPConnectionManager : intial - IMAP server not started"); 
        } 
        
        this.m_Log.Write("nsIMAPConnectionManager : intial - END"); 
    }
    catch(e)
    {
        this.m_Log.Write("nsIMAPConnectionManager :  Exception in intial " 
                                        + e.name + 
                                        ".\nError message: " 
                                        + e.message + "\n"
                                        + e.lineNumber);
    }
}


/******************************************************************************/
/***************** XPCOM  stuff ***********************************************/
/******************************************************************************/
nsIMAPConnectionManager.prototype.QueryInterface = function (iid)
{
    if (!iid.equals(Components.interfaces.nsIIMAPConnectionManager) 
		    && !iid.equals(Components.interfaces.nsISupports)
                && !iid.equals(Components.interfaces.nsIObserver))
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
    var catman = Components.classes["@mozilla.org/categorymanager;1"].
                        getService(Components.interfaces.nsICategoryManager);
        
    catman.addCategoryEntry("xpcom-startup", 
                            "IMAP Connection Manager", 
                            nsIMAPConnectionManagerProgID, 
                            true, 
                            true); 
                                  
    catman.addCategoryEntry("xpcom-shutdown",
                            "IMAP Connection Manager", 
                            nsIMAPConnectionManagerProgID, 
                            true, 
                            true);                       
                            
    catman.addCategoryEntry("app-startup", 
                            "IMAP Connection Manager", 
                            "service," + nsIMAPConnectionManagerProgID, 
                            true, 
                            true);
                            
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
    var catman = Components.classes["@mozilla.org/categorymanager;1"].
                            getService(Components.interfaces.nsICategoryManager);
                            
    catman.deleteCategoryEntry("xpcom-startup", "IMAP Connection Manager", true);
    catman.deleteCategoryEntry("xpcom-shutdown", "IMAP Connection Manager", true);
    catman.deleteCategoryEntry("app-startup", "IMAP Connection Manager", true);
    
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
