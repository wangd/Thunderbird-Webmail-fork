/*****************************  Globals   *************************************/                 
const nsSMTPConnectionManagerCID = Components.ID("{961883d0-416d-11d9-9669-0800200c9a66}");
const nsSMTPConnectionManagerProgID = "@mozilla.org/SMTPConnectionManager;1";
                                      

/***********************  SMTPconnectionManager ********************************/

function nsSMTPConnectionManager()
{
    try
    {
        this.m_serverSocket = Components.classes["@mozilla.org/network/server-socket;1"].
                                createInstance(Components.interfaces.nsIServerSocket);
      
        var scriptLoader =  Components.classes["@mozilla.org/moz/jssubscript-loader;1"].
                                getService(Components.interfaces.mozIJSSubScriptLoader);
                       
        if (scriptLoader)
        {
            scriptLoader.loadSubScript("chrome://web-mail/content/common/DebugLog.js");
            scriptLoader.loadSubScript("chrome://web-mail/content/common/CommonPrefs.js");
            scriptLoader.loadSubScript("chrome://web-mail/content/server/smtpConnectionHandler.js");
        }

        this.m_SMTPLog = new DebugLog("webmail.logging.comms", 
                                      "{3c8e8390-2cf6-11d9-9669-0800200c9a66}",
                                      "SMTPServerlog"); 
        
        this.m_SMTPLog.Write("nsSMTPConnectionManager.js - Constructor - START");   
           
        //-1 error , 0 = stopped ,1 = waiting, 2= ruuning                    
        this.iStatus = -1;          
        this.aSMTPConnections = new Array();
        
        this.GarbageTimer = Components.classes["@mozilla.org/timer;1"].
                                        createInstance(Components.interfaces.nsITimer);  
        this.bGarbage = false;
      
        this.m_SMTPLog.Write("nsSMTPConnectionManager.js - Constructor - END");   
    }
    catch(e)
    {
         DebugDump("nsSMTPConnectionManager.js: Constructor : Exception : " 
                              + e.name  
                              + ".\nError message: " 
                              + e.message);
    }
}

nsSMTPConnectionManager.prototype.Start = function()
{
   try
   {
        this.m_SMTPLog.Write("nsSMTPConnectionManager.js - Start - START");
      
        //g_SMTPLog.UpdateLog(); //update log with any new prefs settings
        
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
            if (! WebMailPrefAccess.Get("int", "webmail.server.port.smtp", oPref)) 
            {
                this.m_SMTPLog.Write("nsSMTPConnectionManager.js - Start - webmail.server.port.SMTP failed. Set to default 25");
                oPref.Value = 25;
            }
            this.m_SMTPLog.Write("nsSMTPConnectionManager.js - Start - SMTP port value "+ oPref.Value);
            this.iSMTPPort = oPref.Value;
            
            delete WebMailPrefAccess;
            //create listener
            //connect only to this machine, 10 Queue
            this.m_serverSocket.init(this.iSMTPPort, true, 10); 
            this.m_serverSocket.asyncListen(this); 
              
            this.iStatus = 2;  //started
        }
        this.m_SMTPLog.Write("nsSMTPConnectionManager.js - Start - END");
       
        return true;
    }
    catch(e)
    {
        this.m_SMTPLog.DebugDump("nsSMTPConnectionManager.js: Start : Exception : " 
                                          + e.name 
                                          + ".\nError message: " 
                                          + e.message);
        
        this.iStatus = -1;  //error
        return false;
    } 
}


nsSMTPConnectionManager.prototype.Stop = function()
{
    try
    {
        this.m_SMTPLog.Write("nsSMTPConnectionManager.js - Stop - START");
     
        if (this.iStatus != 0) //only enter is not stopped
        {   
            this.m_POPLog.Write("nsSMTPConnectionManager.js - Stop - stopping");
            this.m_serverSocket.close();  //stop new conections
            this.iStatus = 1;  //set status to waiting = 1
        }
        
        this.m_SMTPLog.Write("nsSMTPConnectionManager.js - Stop - END");
        return true;
    }
    catch(e)
    {
        this.m_SMTPLog.DebugDump("nsSMTPConnectionManager.js: Stop : Exception : " 
                                      + e.name 
                                      + ".\nError message: " 
                                      + e.message);
                              
        return false;
    }
}


//-1 = ERROR (RED); 0 = Stopped (GREY); 1 = WAITING (AMBER)2 = Running (GREEN)
nsSMTPConnectionManager.prototype.GetStatus = function ()
{
    try
    {
        this.m_SMTPLog.Write("nsSMTPConnectionManager.js - GetStatus - START");
        
        if ( this.iStatus == 1)  //waiting to stop
        {
            this.g_SMTPLog.Write("nsSMTPConnectionManager.js - GetStatus - connections " 
                                                        + this.aSMTPConnections.length);
            var iCount = 0;
            if (this.aSMTPConnections.length>0)
            {
                for (var i =1 ; i<=this.aSMTPConnections.length; i++)
                {
                    if (this.aSMTPConnections[i] != undefined)
                    {
                        iCount++;
                        this.g_SMTPLog.Write("nsSMTPConnectionManager.js - GetStatus - connections " + iCount);
                    }
                }
            } 
            
            if (iCount==0 ) this.iStatus = 0 //stopped
        }
        this.m_SMTPLog.Write("nsSMTPConnectionManager.js - status = " + this.iStatus);    
        this.m_SMTPLog.Write("nsSMTPConnectionManager.js - GetStatus -  END");
        return this.iStatus; 
    }
    catch(e)
    {
        this.m_SMTPLog.DebugDump("nsSMTPConnectionManager.js: GetStatus : Exception : " 
                                      + e.name 
                                      + ".\nError message: " 
                                      + e.message);
    }
}



nsSMTPConnectionManager.prototype.onSocketAccepted = function(serverSocket, transport)
{
    try
    {
        this.m_SMTPLog.Write("nsSMTPConnectionManager.js - onSocketAccepted - START");
        
        this.aSMTPConnections.push ( new SMTPconnectionHandler(transport));
           
        this.m_SMTPLog.Write("nsSMTPConnectionManager.js - onSocketAccepted - END");   
    }
    catch(e)
    {
        this.m_SMTPLog.DebugDump("nsSMTPConnectionManager.js: onSocketAccepted : Exception : " 
                                      + e.name 
                                      + ".\nError message: " 
                                      + e.message);
    }
}


nsSMTPConnectionManager.prototype.onStopListening = function(serverSocket, status)
{
   this.m_SMTPLog.Write("nsSMTPConnectionManager.js - onStopListening - START");
   this.m_SMTPLog.Write("nsSMTPConnectionManager.js - onStopListening - END"); 
}


//garbage collection
nsSMTPConnectionManager.prototype.notify = function()
{
    try
    {
       // this.m_SMTPLog.Write("nsSMTPConnectionManager.js - notify - START");  //spamming log file
       
      //  this.m_SMTPLog.Write("nsSMTPConnectionManager.js - notify - connections " +this.aSMTPConnections.length);
        if (this.aSMTPConnections.length>0)
        {
            var iMax = this.aSMTPConnections.length;
            for (var i = 0 ; i<iMax ; i++)
            {
                this.m_SMTPLog.Write("nsSMTPConnectionManager.js - connection " + 0 + " "+ this.aSMTPConnections[0]);
                
                if (this.aSMTPConnections[0] != undefined)
                {  
                    var temp = this.aSMTPConnections.shift();  //get first item
                    this.m_SMTPLog.Write("nsSMTPConnectionManager.js - connection " + i + " "+ temp.bRunning + " " +temp.iID)
                   
                    if (temp.bRunning == false)
                    {  
                        delete temp; 
                        this.m_SMTPLog.Write("nsSMTPConnectionManager.js - notify - dead connection deleted" + " " +temp.iID); 
                    }
                    else
                    {
                        this.aSMTPConnections.push(temp);
                        this.m_SMTPLog.Write("nsSMTPConnectionManager.js - notify - restored live connection"+ " " +temp.iID); 
                    }
                }
            }
        } 
        
       // this.m_SMTPLog.Write("nsSMTPConnectionManager.js - notify - END"); 
    }
    catch(e)
    {
        this.m_SMTPLog.DebugDump("nsSMTPConnectionManager.js: notify : Exception : " 
                                      + e.name 
                                      + ".\nError message: " 
                                      + e.message);
    }   
}


/******************************************************************************/
/***************** XPCOM  stuff ***********************************************/
/******************************************************************************/
nsSMTPConnectionManager.prototype.QueryInterface = function (iid)
{
    if (!iid.equals(Components.interfaces.nsISMTPConnectionManager) 
		                      	&& !iid.equals(Components.interfaces.nsISupports))
        throw Components.results.NS_ERROR_NO_INTERFACE;
        
    return this;
}

 

/******************************************************************************/
/* FACTORY*/
var nsSMTPConnectionManagerFactory = new Object();

nsSMTPConnectionManagerFactory.createInstance = function (outer, iid)
{
    if (outer != null)
        throw Components.results.NS_ERROR_NO_AGGREGATION;
    
    if (!iid.equals(nsSMTPConnectionManagerCID) 
                            && !iid.equals(Components.interfaces.nsISupports))
        throw Components.results.NS_ERROR_INVALID_ARG;
    
    return new nsSMTPConnectionManager();
}


/******************************************************************************/
/* MODULE */
var nsSMTPConnectionManagerModule = new Object();

nsSMTPConnectionManagerModule.registerSelf = function(compMgr, fileSpec, location, type)
{
    compMgr = compMgr.QueryInterface(Components.interfaces.nsIComponentRegistrar);
    compMgr.registerFactoryLocation(nsSMTPConnectionManagerCID,
                                    "SMTP Connection Manager",
                                    nsSMTPConnectionManagerProgID, 
                                    fileSpec,
                                    location, 
                                    type);
}

nsSMTPConnectionManagerModule.unregisterSelf = function(aCompMgr, aFileSpec, aLocation)
{
    aCompMgr = aCompMgr.QueryInterface(Components.interfaces.nsIComponentRegistrar);
    aCompMgr.unregisterFactoryLocation(nsSMTPConnectionManagerProgID, aFileSpec);
}
 
nsSMTPConnectionManagerModule.getClassObject = function(compMgr, cid, iid)
{
    if (!cid.equals(nsSMTPConnectionManagerCID))
        throw Components.results.NS_ERROR_NO_INTERFACE;

    if (!iid.equals(Components.interfaces.nsIFactory))
        throw Components.results.NS_ERROR_NOT_IMPLEMENTED;

    return nsSMTPConnectionManagerFactory;
}


nsSMTPConnectionManagerModule.canUnload = function(compMgr)
{
    return true;
}
/******************************************************************************/


function NSGetModule(compMgr, fileSpec)
{
    return nsSMTPConnectionManagerModule; 
}
