/*****************************  Globals   *************************************/                 
const nsPOPConnectionManagerCID = Components.ID("{0d1b2fb0-4168-11d9-9669-0800200c9a66}");
const nsPOPConnectionManagerProgID = "@mozilla.org/POPConnectionManager;1";
                                      
const szOK ="+OK thats cool\r\n";
const szERR ="-ERR negative vibes\r\n";
 

/***********************  POPconnectionManager ********************************/
function nsPOPConnectionManager()
{
    try
    {
        this.m_serverSocket = Components.classes["@mozilla.org/network/server-socket;1"]
                              .createInstance(Components.interfaces.nsIServerSocket);
        
       
        var scriptLoader =  Components.classes["@mozilla.org/moz/jssubscript-loader;1"];
        scriptLoader = scriptLoader.getService(Components.interfaces.mozIJSSubScriptLoader);
        scriptLoader.loadSubScript("chrome://web-mail/content/common/DebugLog.js");
        scriptLoader.loadSubScript("chrome://web-mail/content/common/CommonPrefs.js");
        scriptLoader.loadSubScript("chrome://web-mail/content/server/popConnectionHandler.js")
                  
        this.m_Log = new DebugLog("webmail.logging.comms", 
                                     "{3c8e8390-2cf6-11d9-9669-0800200c9a66}",
                                     "popServerlog"); 
        
        this.m_Log.Write("nsPOPConnectionManager.js - Constructor - START");   
                    
        //-1 error , 0 = stopped ,1 = waiting, 2= ruuning                       
        this.m_iStatus = 0;               //error
        this.m_aPOPConnections = new Array();
        
        this.m_GarbageTimer = Components.classes["@mozilla.org/timer;1"].
                                createInstance(Components.interfaces.nsITimer);  
        this.m_bGarbage = false;
      
        this.m_Log.Write("nsPOPConnectionManager.js - Constructor - END");   
    }
    catch(e)
    {
         DebugDump("nsPOPConnectionManager.js: Constructor : Exception : " 
                              + e.name  
                              + ".\nError message: " 
                              + e.message);
    }
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


/******************************************************************************/
/***************** XPCOM  stuff ***********************************************/
/******************************************************************************/
nsPOPConnectionManager.prototype.QueryInterface = function (iid)
{
    if (!iid.equals(Components.interfaces.nsIPOPConnectionManager) 
		    && !iid.equals(Components.interfaces.nsISupports))
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
