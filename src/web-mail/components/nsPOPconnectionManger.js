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
                  
        this.m_POPLog = new DebugLog("webmail.logging.comms", 
                                     "{3c8e8390-2cf6-11d9-9669-0800200c9a66}",
                                     "popServerlog"); 
        
        this.m_POPLog.Write("nsPOPConnectionManager.js - Constructor - START");   
                    
        //-1 error , 0 = stopped ,1 = waiting, 2= ruuning                       
        this.iStatus = 0;               //error
        this.aPOPConnections = new Array();
        
        this.GarbageTimer = Components.classes["@mozilla.org/timer;1"];
        this.GarbageTimer = this.GarbageTimer.createInstance(Components.interfaces.nsITimer);  
        this.bGarbage = false;
      
        this.m_POPLog.Write("nsPOPConnectionManager.js - Constructor - END");   
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
        this.m_POPLog.Write("nsPOPConnectionManager.js - Start - START");
        
        //g_POPLog.UpdateLog(); //update log with any new prefs settings
        
        if(this.iStatus != 2 && this.iStatus != 1)  //enter here if server is not running
        {
            if (!this.bGarbage)
            {//start garbage collection
                this.GarbageTimer.initWithCallback(this, 
                                                   20000,  //20 seconds 
                                                   Components.interfaces.nsITimer.TYPE_REPEATING_SLACK);
                this.bGarbage = true;
            }
            
            //get pref settings
            var  WebMailPrefAccess = new WebMailCommonPrefAccess();
            var oPref = new Object();
            oPref.Value = null;
            if (! WebMailPrefAccess.Get("int", "webmail.server.port.pop", oPref)) 
            {
                this.m_POPLog.Write("nsPOPConnectionManager.js - Start - webmail.server.port.pop failed. Set to default 110");
                oPref.Value = 110;
            }
            this.m_POPLog.Write("nsPOPConnectionManager.js - Start - POP port value "+ oPref.Value);
            this.iPopPort = oPref.Value;
            delete WebMailPrefAccess
            
            //create listener
            //connect only to this machine, 10 Queue
            this.m_serverSocket.init(this.iPopPort, true, 10); 
            this.m_serverSocket.asyncListen(this); 
              
            this.iStatus = 2;  //started
        }
        this.m_POPLog.Write("nsPOPConnectionManager.js - Start - END");
        
        return true;
    }
    catch(e)
    {
        this.m_POPLog.DebugDump("nsPOPConnectionManager.js: Start : Exception : " 
                                          + e.name 
                                          + ".\nError message: " 
                                          + e.message);
        
        this.iStatus = -1;  //error
        return false;
    } 
}


nsPOPConnectionManager.prototype.Stop = function()
{
    try
    {
        this.m_POPLog.Write("nsPOPConnectionManager.js - Stop - START");
        
        if (this.iStatus != 0 && this.iStatus != -1) //only enter if server has not stopped
        {
            this.m_POPLog.Write("nsPOPConnectionManager.js - Stop - stopping");
            this.m_serverSocket.close();  //stop new conections
            this.iStatus = 1;  //set status to waiting = 1
        }
        
        this.m_POPLog.Write("nsPOPConnectionManager.js - Stop - END");
        return true;
    }
    catch(e)
    {
        this.m_POPLog.DebugDump("nsPOPConnectionManager.js: Stop : Exception : " 
                                      + e.name 
                                      + ".\nError message: " 
                                      + e.message);
        this.iStatus = -1;  //error
                              
        return false;
    }
}


//-1 = ERROR (RED); 0 = Stopped (GREY); 1 = WAITING (AMBER)2 = Running (GREEN)
nsPOPConnectionManager.prototype.GetStatus = function ()
{
    try
    {
        this.m_POPLog.Write("nsPOPConnectionManager.js - GetStatus - START");
        
        if ( this.iStatus == 1)  //waiting to stop
        {
            this.g_POPLog.Write("nsPOPConnectionManager.js - GetStatus - connections " 
                                                        + this.aPOPConnections.length);
            var iCount = 0;
            if (this.aPOPConnections.length>0)
            {
                for (var i =1 ; i<=this.aPOPConnections.length; i++)
                {
                    if (this.aPOPConnections[i] != undefined)
                    {
                        iCount++;
                        this.g_POPLog.Write("nsPOPConnectionManager.js - GetStatus - connections " + iCount);
                    }
                }
            } 
            
            if (iCount==0 ) this.iStatus = 0 //stopped
        }
        this.m_POPLog.Write("nsPOPConnectionManager.js - status = " + this.iStatus);    
        this.m_POPLog.Write("nsPOPConnectionManager.js - GetStatus -  END");
        return this.iStatus; 
    }
    catch(e)
    {
        this.m_POPLog.DebugDump("nsPOPConnectionManager.js: GetStatus : Exception : " 
                                      + e.name 
                                      + ".\nError message: " 
                                      + e.message);
                                      
        this.iStatus = -1;  //error
        return this.iStatus; 
    }
}



nsPOPConnectionManager.prototype.onSocketAccepted = function(serverSocket, transport)
{
    try
    {
        this.m_POPLog.Write("nsPOPConnectionManager.js - onSocketAccepted - START");
        
        this.aPOPConnections.push ( new POPconnectionHandler(transport));
           
        this.m_POPLog.Write("nsPOPConnectionManager.js - onSocketAccepted - END");   
    }
    catch(e)
    {
        this.m_POPLog.DebugDump("nsPOPConnectionManager.js: onSocketAccepted : Exception : " 
                                      + e.name 
                                      + ".\nError message: " 
                                      + e.message);
    }
}


nsPOPConnectionManager.prototype.onStopListening = function(serverSocket, status)
{
   this.m_POPLog.Write("nsPOPConnectionManager.js - onStopListening - START");
   this.m_POPLog.Write("nsPOPConnectionManager.js - onStopListening - END"); 
}


//garbage collection
nsPOPConnectionManager.prototype.notify = function()
{
    try
    {
       // this.m_POPLog.Write("nsPOPConnectionManager.js - notify - START");  //spamming log file
       
      //  this.m_POPLog.Write("nsPOPConnectionManager.js - notify - connections " +this.aPOPConnections.length);
        if (this.aPOPConnections.length>0)
        {
            var iMax = this.aPOPConnections.length;
            for (var i = 0 ; i<iMax ; i++)
            {
                this.m_POPLog.Write("nsPOPConnectionManager.js - connection " + 0 + " "+ this.aPOPConnections[0]);
                
                if (this.aPOPConnections[0] != undefined)
                {  
                    var temp = this.aPOPConnections.shift();  //get first item
                    this.m_POPLog.Write("nsPOPConnectionManager.js - connection " + i + " "+ temp.bRunning + " " +temp.iID);
                   
                    if (temp.bRunning == false)
                    { 
                        delete temp; 
                        this.m_POPLog.Write("nsPOPConnectionManager.js - notify - dead connection deleted " + temp.iID); 
                    }
                    else
                    {
                        this.aPOPConnections.push(temp);
                        this.m_POPLog.Write("nsPOPConnectionManager.js - notify - restored live connection " + temp.iID); 
                    }
                }
            }
        } 
        
       // this.m_POPLog.Write("nsPOPConnectionManager.js - notify - END"); 
    }
    catch(e)
    {
        this.m_POPLog.DebugDump("nsPOPConnectionManager.js: notify : Exception : " 
                                      + e.name 
                                      + ".\nError message: " 
                                      + e.message);
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
