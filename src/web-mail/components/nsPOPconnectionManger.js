/*****************************  Globals   *************************************/                 
const nsPOPConnectionManagerCID = Components.ID("{0d1b2fb0-4168-11d9-9669-0800200c9a66}");
const nsPOPConnectionManagerProgID = "@mozilla.org/POPConnectionManager;1";
                                      
const szOK ="+OK thats cool\r\n";
const szERR ="-ERR negative vibes\r\n";
 

/***********************  POPconnectionManager ********************************/
function nsPOPConnectionManager()
{
    this.m_serverSocket = null;   
    this.m_scriptLoader = null;         
    this.m_GarbageTimer= null;
    this.m_Log = null;   
    this.m_iStatus = 0;   //-1 error , 0 = stopped ,1 = waiting, 2= ruuning  
    this.m_aPOPConnections = new Array();
    this.m_bGarbage = false; 
}


nsPOPConnectionManager.prototype.Start = function()
{
   try
   {
        this.m_Log.Write("nsPOPConnectionManager - Start - START");
               
        if(this.m_iStatus != 2 && this.m_iStatus != 1)  //enter here if server is not running
        {
            if (!this.m_bGarbage)
            {//start garbage collection
                this.m_GarbageTimer.initWithCallback(this, 
                                                   20000,  //20 seconds 
                                                   Components.interfaces.nsITimer.TYPE_REPEATING_SLACK);
                this.m_bGarbage = true;
            }
            
            if (!this.m_serverSocket)
            {
                this.m_serverSocket = Components.classes["@mozilla.org/network/server-socket;1"]
                                                .createInstance(Components.interfaces.nsIServerSocket);
            }
            
            //get pref settings
            var  WebMailPrefAccess = new WebMailCommonPrefAccess();
            var oPref = new Object();
            oPref.Value = null;
            if (! WebMailPrefAccess.Get("int", "webmail.server.port.pop", oPref)) 
            {
                this.m_Log.Write("nsPOPConnectionManager - Start - webmail.server.port.pop failed. Set to default 110");
                oPref.Value = 110;
            }
            this.m_Log.Write("nsPOPConnectionManager - Start - POP port value "+ oPref.Value);
            this.iPopPort = oPref.Value;
            delete WebMailPrefAccess
            
            //create listener
            //connect only to this machine, 10 Queue
            this.m_serverSocket.init(this.iPopPort, true, 10); 
            this.m_serverSocket.asyncListen(this); 
              
            this.m_iStatus = 2;  //started
        }
        this.m_Log.Write("nsPOPConnectionManager - Start - END");
        
        return true;
    }
    catch(e)
    {
        this.m_Log.DebugDump("nsPOPConnectionManager: Start : Exception : " 
                                          + e.name 
                                          + ".\nError message: " 
                                          + e.message +"\n" 
                                          + e.lineNumber);
        
        this.m_iStatus = -1;  //error
        return false;
    } 
}


nsPOPConnectionManager.prototype.Stop = function()
{
    try
    {
        this.m_Log.Write("nsPOPConnectionManager - Stop - START");
        
        if (this.m_iStatus != 0 && this.m_iStatus != -1) //only enter if server has not stopped
        {
            this.m_Log.Write("nsPOPConnectionManager - Stop - stopping");
            this.m_serverSocket.close();  //stop new conections
            delete this.m_serverSocket;
            this.m_serverSocket = null;
            this.m_iStatus = 1;  //set status to waiting = 1
        }
        
        this.m_Log.Write("nsPOPConnectionManager - Stop - END");
        return true;
    }
    catch(e)
    {
        this.m_Log.DebugDump("nsPOPConnectionManager: Stop : Exception : " 
                                      + e.name 
                                      + ".\nError message: " 
                                      + e.message+"\n" 
                                      + e.lineNumber);
        this.m_iStatus = -1;  //error
                              
        return false;
    }
}


//-1 = ERROR (RED); 0 = Stopped (GREY); 1 = WAITING (AMBER)2 = Running (GREEN)
nsPOPConnectionManager.prototype.GetStatus = function ()
{
    try
    {
        this.m_Log.Write("nsPOPConnectionManager - GetStatus - START");
        
        if ( this.m_iStatus == 1)  //waiting to stop
        {
            this.g_POPLog.Write("nsPOPConnectionManager - GetStatus - connections " 
                                                        + this.m_aPOPConnections.length);
            var iCount = 0;
            if (this.m_aPOPConnections.length>0)
            {
                for (var i =1 ; i<=this.m_aPOPConnections.length; i++)
                {
                    if (this.m_aPOPConnections[i] != undefined)
                    {
                        iCount++;
                        this.g_POPLog.Write("nsPOPConnectionManager - GetStatus - connections " + iCount);
                    }
                }
            } 
            
            if (iCount==0 ) this.m_iStatus = 0 //stopped
        }
        this.m_Log.Write("nsPOPConnectionManager - status = " + this.m_iStatus);    
        this.m_Log.Write("nsPOPConnectionManager - GetStatus -  END");
        return this.m_iStatus; 
    }
    catch(e)
    {
        this.m_Log.DebugDump("nsPOPConnectionManager: GetStatus : Exception : " 
                                      + e.name 
                                      + ".\nError message: " 
                                      + e.message +"\n" 
                                      + e.lineNumber);
                                      
        this.m_iStatus = -1;  //error
        return this.m_iStatus; 
    }
}



nsPOPConnectionManager.prototype.onSocketAccepted = function(serverSocket, transport)
{
    try
    {
        this.m_Log.Write("nsPOPConnectionManager - onSocketAccepted - START");
        
        this.m_aPOPConnections.push ( new POPconnectionHandler(transport));
           
        this.m_Log.Write("nsPOPConnectionManager - onSocketAccepted - END");   
    }
    catch(e)
    {
        this.m_Log.DebugDump("nsPOPConnectionManager: onSocketAccepted : Exception : " 
                                      + e.name 
                                      + ".\nError message: " 
                                      + e.message+"\n" 
                                      + e.lineNumber);
    }
}


nsPOPConnectionManager.prototype.onStopListening = function(serverSocket, status)
{
   this.m_Log.Write("nsPOPConnectionManager - onStopListening - START");
   this.m_iStatus = 0;
   this.m_Log.Write("nsPOPConnectionManager - onStopListening - END"); 
}


//garbage collection
nsPOPConnectionManager.prototype.notify = function()
{
    try
    {
       // this.m_Log.Write("nsPOPConnectionManager - notify - START");  //spamming log file
       
      //  this.m_Log.Write("nsPOPConnectionManager - notify - connections " +this.m_aPOPConnections.length);
        if (this.m_aPOPConnections.length>0)
        {
            var iMax = this.m_aPOPConnections.length;
            for (var i = 0 ; i<iMax ; i++)
            {
                this.m_Log.Write("nsPOPConnectionManager - connection " + 0 + " "+ this.m_aPOPConnections[0]);
                
                if (this.m_aPOPConnections[0] != undefined)
                {  
                    var temp = this.m_aPOPConnections.shift();  //get first item
                    this.m_Log.Write("nsPOPConnectionManager - connection " + i + " "+ temp.bRunning + " " +temp.iID);
                   
                    if (temp.bRunning == false)
                    { 
                        delete temp; 
                        this.m_Log.Write("nsPOPConnectionManager - notify - dead connection deleted " + temp.iID); 
                    }
                    else
                    {
                        this.m_aPOPConnections.push(temp);
                        this.m_Log.Write("nsPOPConnectionManager - notify - restored live connection " + temp.iID); 
                    }
                }
            }
        } 
        
       // this.m_Log.Write("nsPOPConnectionManager - notify - END"); 
    }
    catch(e)
    {
        this.m_Log.DebugDump("nsPOPConnectionManager: notify : Exception : " 
                                      + e.name 
                                      + ".\nError message: " 
                                      + e.message +"\n" 
                                      + e.lineNumber);
    }   
}


nsPOPConnectionManager.prototype.observe = function(aSubject, aTopic, aData) 
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
            obsSvc.addObserver(this, "network:offline-status-changed", false);
             	       
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
            this.m_scriptLoader .loadSubScript("chrome://web-mail/content/server/popConnectionHandler.js");
            this.m_Log = new DebugLog("webmail.logging.comms", 
                                      "{3c8e8390-2cf6-11d9-9669-0800200c9a66}",
                                      "popServerlog"); 
            this.intial();
        break;
            
        case "quit-application": // shutdown code here
            this.m_Log.Write("nsPOPConnectionManager : quit-application");
            this.Stop();
        break;
        
        case "network:offline-status-changed":
            this.m_Log.Write("nsPOPConnectionManager : network:offline-status-changed " + aData);
            
            if (aData.search(/online/)!=-1)
            {
                this.m_Log.Write("nsPOPConnectionManager : going  Online");
                this.Start();
            }
            else
            {   
                this.m_Log.Write("nsPOPConnectionManager : going Offline");
                this.Stop();
            }    
        break;
        
        case "app-startup":
        break;
        
        default:
            throw Components.Exception("Unknown topic: " + aTopic);
    }
}


nsPOPConnectionManager.prototype.intial = function ()
{
    try
    {
        this.m_Log.Write("nsPOPConnectionManager : intial - START");
        
        var oPref = new Object();
        oPref.Value = null;
        
        var  WebMailPrefAccess = new WebMailCommonPrefAccess();
        WebMailPrefAccess.Get("bool","webmail.bUsePOPServer",oPref); 
        if (oPref.Value) 
        {
            this.m_Log.Write("nsPOPConnectionManager : intial - POP server wanted");
            if (this.Start())
                this.m_Log.Write("nsPOPConnectionManager : intial - pop server started");
            else
                this.m_Log.Write("nsPOPConnectionManager : intial - pop server not started"); 
        } 
        
        this.m_Log.Write("nsPOPConnectionManager : intial - END"); 
    }
    catch(e)
    {
        this.m_Log.Write("nsPOPConnectionManager :  Exception in intial " 
                                        + e.name + 
                                        ".\nError message: " 
                                        + e.message + "\n"
                                        + e.lineNumber);
    }
}


/******************************************************************************/
/***************** XPCOM  stuff ***********************************************/
/******************************************************************************/
nsPOPConnectionManager.prototype.QueryInterface = function (iid)
{
    if (!iid.equals(Components.interfaces.nsIPOPConnectionManager) 
		    && !iid.equals(Components.interfaces.nsISupports)
                && !iid.equals(Components.interfaces.nsIObserver))
        throw Components.results.NS_ERROR_NO_INTERFACE;
        
    return this;
}

 

/******************************************************************************/
/* FACTORY*/
var nsPOPConnectionManagerFactory = new Object();

nsPOPConnectionManagerFactory.createInstance = function (outer, iid)
{
    if (outer != null)
        throw Components.results.NS_ERROR_NO_AGGREGATION;
    
    if (!iid.equals(nsPOPConnectionManagerCID) 
                            && !iid.equals(Components.interfaces.nsISupports))
        throw Components.results.NS_ERROR_INVALID_ARG;
    
    return new nsPOPConnectionManager();
}


/******************************************************************************/
/* MODULE */
var nsPOPConnectionManagerModule = new Object();

nsPOPConnectionManagerModule.registerSelf = function(compMgr, fileSpec, location, type)
{   
    var catman = Components.classes["@mozilla.org/categorymanager;1"].
                        getService(Components.interfaces.nsICategoryManager);
        
    catman.addCategoryEntry("xpcom-startup", 
                            "POP Connection Manager", 
                            nsPOPConnectionManagerProgID, 
                            true, 
                            true); 
                                  
    catman.addCategoryEntry("xpcom-shutdown",
                            "POP Connection Manager", 
                            nsPOPConnectionManagerProgID, 
                            true, 
                            true);                       
                            
    catman.addCategoryEntry("app-startup", 
                            "POP Connection Manager", 
                            "service," + nsPOPConnectionManagerProgID, 
                            true, 
                            true);
                            
    compMgr = compMgr.QueryInterface(Components.interfaces.nsIComponentRegistrar);
    compMgr.registerFactoryLocation(nsPOPConnectionManagerCID,
                                    "POP Connection Manager",
                                    nsPOPConnectionManagerProgID, 
                                    fileSpec,
                                    location, 
                                    type);
}

nsPOPConnectionManagerModule.unregisterSelf = function(aCompMgr, aFileSpec, aLocation)
{
    var catman = Components.classes["@mozilla.org/categorymanager;1"].
                            getService(Components.interfaces.nsICategoryManager);
                            
    catman.deleteCategoryEntry("xpcom-startup", "POP Connection Manager", true);
    catman.deleteCategoryEntry("xpcom-shutdown", "POP Connection Manager", true);
    catman.deleteCategoryEntry("app-startup", "POP Connection Manager", true);
    
    aCompMgr = aCompMgr.QueryInterface(Components.interfaces.nsIComponentRegistrar);
    aCompMgr.unregisterFactoryLocation(nsPOPConnectionManagerProgID, aFileSpec);
}
 
nsPOPConnectionManagerModule.getClassObject = function(compMgr, cid, iid)
{
    if (!cid.equals(nsPOPConnectionManagerCID))
        throw Components.results.NS_ERROR_NO_INTERFACE;

    if (!iid.equals(Components.interfaces.nsIFactory))
        throw Components.results.NS_ERROR_NOT_IMPLEMENTED;

    return nsPOPConnectionManagerFactory;
}


nsPOPConnectionManagerModule.canUnload = function(compMgr)
{
    return true;
}
/******************************************************************************/


function NSGetModule(compMgr, fileSpec)
{
    return nsPOPConnectionManagerModule; 
}
