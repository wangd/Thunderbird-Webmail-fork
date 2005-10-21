/*****************************  Globals   *************************************/                 
const nsComponentDataClassID = Components.ID("{27bde2f0-3900-11da-8cd6-0800200c9a66}");
const nsComponentDataContactID = "@mozilla.org/ComponentData;1";


/***********************  Component Data ********************************/
function nsComponentData()
{   
    try
    {       
        var scriptLoader =  Components.classes["@mozilla.org/moz/jssubscript-loader;1"]
                                 .getService(Components.interfaces.mozIJSSubScriptLoader);
        scriptLoader.loadSubScript("chrome://web-mail/content/common/DebugLog.js");
        scriptLoader.loadSubScript("chrome://web-mail/content/common/componentData.js");

        var date = new Date();
        var  szLogFileName = "ComponentData Log - " + date.getHours()+ "-" 
                                    + date.getMinutes() + "-"+ date.getUTCMilliseconds() +" -";
                                    
        this.m_Log = new DebugLog("webmail.logging.comms", "", szLogFileName); 
        
        this.m_Log.Write("nsComponentData.js - Constructor - START");   
  
        this.m_aElements = new Array();
                                
        this.m_Log.Write("nsComponentData.js - Constructor - END");  
    }
    catch(e)
    {
        this.m_Log.DebugDump("nsComponentData.js: Constructor : Exception : " 
                                      + e.name + 
                                      ".\nError message: " 
                                      + e.message + "\n" 
                                      + e.lineNumber);
    }
}

nsComponentData.prototype =
{

    addElement : function (szName, szValue)
    {
        try
        {
            this.m_Log.Write("nsComponentData.js - addElement - START"); 
            this.m_Log.Write("nsComponentData.js - addElement - " + szName +"- " + szValue);
           
            var bFound = false;
            
            //find and update
            for (i=0; i<this.m_aElements.length; i++)
            {
                var regName = new RegExp(this.m_aElements[i].szName,"i");
                this.m_Log.Write("nsComponentData.js - addElement - search " + regName);
                
                if (szName.search(regName)!=-1)
                {
                    this.m_Log.Write("nsComponentData.js - addElement - Found ");
                    
                    this.m_aElements[i].szName = szName;
                    this.m_aElements[i].szValue = szValue;       
                    bFound = true; 
                }
            }
            
            if (!bFound)//add
            {
                this.m_Log.Write("nsComponentData.js - addElement - adding"); 
                var oData = new componentData();
                oData.szName = szName;
                oData.szValue = szValue; 
                this.m_aElements.push(oData);
            }
            
            this.m_Log.Write("nsComponentData.js - addElement - END"); 
            return true;
        }
        catch(err)
        {
             this.m_Log.DebugDump("nsComponentData.js: addElement : Exception : " 
                                      + err.name + 
                                      ".\nError message: " 
                                      + err.message+ "\n"
                                      + err.lineNumber);
             return false;
        }
    },
    
    
                            
    findElement : function (szName)
    {
        try
        {
            this.m_Log.Write("nsComponentData.js - findElement - START"); 
            this.m_Log.Write("nsComponentData.js - findElement - " + szName);
                      
            //find and delete
            for (i=0; i<this.m_aElements.length; i++)
            {
                var regName = new RegExp(this.m_aElements[i].szName,"i");
                this.m_Log.Write("nsComponentData.js - findElement - search " + regName);
                
                if (szName.search(regName)!=-1)
                {
                    var temp = this.m_aElements[i];  //get first item
                    this.m_Log.Write("nsComponentData - findElement Found");
                    return temp.szValue;
                }
            }
            
            this.m_Log.Write("nsComponentData.js - findElement - END"); 
            return null;
        }
        catch(err)
        {
            this.m_Log.DebugDump("nsComponentData.js: findElement : Exception : " 
                                      + err.name + 
                                      ".\nError message: " 
                                      + err.message+ "\n"
                                      + err.lineNumber);
            return null;
        }
    },
    
    
    
    deleteElement: function (szName)
    {
        try
        {
            this.m_Log.Write("nsComponentData.js - deleteElement - START"); 
            this.m_Log.Write("nsComponentData.js - deleteElement - " + szName);
                      
            //find and delete
            for (i=0; i<this.m_aElements.length; i++)
            { 
                var temp = this.m_aElements.shift();  //get first item
                var regName = new RegExp(temp.szName,"i");
                this.m_Log.Write("nsComponentData.js - deleteElement - search " + regName);
                
                if (szName.search(regName)!=-1)
                {
                    this.m_Log.Write("nsComponentData - deleteElement Found");
                    delete temp; 
                }
                else
                    this.m_aElements.push(temp);
            }
            
            this.m_Log.Write("nsComponentData.js - deleteElement - END"); 
            return true;
        }
        catch(err)
        {
            this.m_Log.DebugDump("nsComponentData.js: deleteElement : Exception : " 
                                      + err.name + 
                                      ".\nError message: " 
                                      + err.message+ "\n"
                                      + err.lineNumber);
            return false;
        }
    },
    
    
    
    deleteAllElements : function ()
    {
        try
        {
            this.m_Log.Write("nsComponentData.js - deleteElement - START"); 
            
            if (this.m_aElements.length>0) delete this.m_aElements;
            this.m_aElements = new Array();
            
            this.m_Log.Write("nsComponentData.js - deleteElement - END"); 
            return true;
        }
        catch(err)
        {
            this.m_Log.DebugDump("nsComponentData.js: deleteAllElements : Exception : " 
                                      + err.name + 
                                      ".\nError message: " 
                                      + err.message+ "\n"
                                      + err.lineNumber);
            return false;
        }
    },   

    
/******************************************************************************/
/***************** XPCOM  stuff ***********************************************/
/******************************************************************************/
    QueryInterface : function (iid)
    {
        if (!iid.equals(Components.interfaces.nsIComponentData) 
        	    && !iid.equals(Components.interfaces.nsISupports))
            throw Components.results.NS_ERROR_NO_INTERFACE;
            
        return this;
    }
}
 

/******************************************************************************/
/* FACTORY*/
var nsComponentDataFactory = new Object();

nsComponentDataFactory.createInstance = function (outer, iid)
{
    if (outer != null)
        throw Components.results.NS_ERROR_NO_AGGREGATION;
    
    if (!iid.equals(nsComponentDataClassID) 
            && !iid.equals(Components.interfaces.nsISupports))
        throw Components.results.NS_ERROR_INVALID_ARG;
    
    return new nsComponentData();
}


/******************************************************************************/
/* MODULE */
var nsComponentDataModule = new Object();

nsComponentDataModule.registerSelf = function(compMgr, fileSpec, location, type)
{
    compMgr = compMgr.QueryInterface(Components.interfaces.nsIComponentRegistrar);
    compMgr.registerFactoryLocation(nsComponentDataClassID,
                                    "Component Data",
                                    nsComponentDataContactID, 
                                    fileSpec,
                                    location, 
                                    type);
}


nsComponentDataModule.unregisterSelf = function(aCompMgr, aFileSpec, aLocation)
{
    aCompMgr = aCompMgr.QueryInterface(Components.interfaces.nsIComponentRegistrar);
    aCompMgr.unregisterFactoryLocation(nsComponentDataClassID, aFileSpec);
}

 
nsComponentDataModule.getClassObject = function(compMgr, cid, iid)
{
    if (!cid.equals(nsComponentDataClassID))
        throw Components.results.NS_ERROR_NO_INTERFACE;

    if (!iid.equals(Components.interfaces.nsIFactory))
        throw Components.results.NS_ERROR_NOT_IMPLEMENTED;

    return nsComponentDataFactory;
}


nsComponentDataModule.canUnload = function(compMgr)
{
    return true;
}
/******************************************************************************/


function NSGetModule(compMgr, fileSpec)
{
    return nsComponentDataModule; 
}
