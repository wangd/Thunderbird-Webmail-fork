/*****************************  Globals   *************************************/                 
const nsDomainManagerClassID = Components.ID("{76f4dcb0-284a-11d9-9669-0800200c9a66}");
const nsDomainManagerContactID = "@mozilla.org/DomainManager;1";


/***********************  DomainManager ********************************/
function nsDomainManager()
{
    try
    {       
        var scriptLoader =  Components.classes["@mozilla.org/moz/jssubscript-loader;1"]
                                        .getService(Components.interfaces.mozIJSSubScriptLoader);
        if (scriptLoader)
            scriptLoader.loadSubScript("chrome://web-mail/content/common/DebugLog.js");

        this.m_DomainLog = new DebugLog("webmail.logging.comms", 
                                        "{3c8e8390-2cf6-11d9-9669-0800200c9a66}",
                                        "Domainlog"); 
        
        this.m_DomainLog.Write("nsDomainManager.js - Constructor - START");   
        this.m_bReady = false;
        this.m_DataSource = null;
        this.m_rdfService = null;
        this.loadDataBase();
                                
        this.m_DomainLog.Write("nsDomainManager.js - Constructor - END");  
    }
    catch(e)
    {
        this.m_DomainLog.DebugDump("nsDomainManager.js: Constructor : Exception : " 
                                      + e.name + 
                                      ".\nError message: " 
                                      + e.message);
    }
}

nsDomainManager.prototype =
{
    isReady : function() 
    { 
        this.m_DomainLog.Write("nsDomainManager.js - isReady - " +this.m_bReady); 
        return this.m_bReady;
    },

    
    getDomainForProtocol : function(szAddress, szProtocol , szContentID )
    {
        try
        { 
            this.m_DomainLog.Write("nsDomainManager.js - getDomainForProtocol - START");  
            
            var szTempAddress = szAddress.toLowerCase();
            var szTempProtocol = szProtocol.toLowerCase();          
            this.m_DomainLog.Write("nsDomainManager.js - getDomainForProtocol - " 
                                                        +szTempAddress+ " " 
                                                        +szTempProtocol); 
            
            if (!this.m_bReady) 
            {
                this.m_DomainLog.Write("nsDomainManager.js - getDomainForProtocol - DB not Loaded" );
                return -1; 
            }
            
            //get protocol list
            var protocolResource = this.getProtocolResource(szTempProtocol);    
            var rdfContainerUtils = Components.classes["@mozilla.org/rdf/container-utils;1"].
                                            getService(Components.interfaces.nsIRDFContainerUtils);
            
            //check for registered protocol handlers     
            if (rdfContainerUtils.IsEmpty(this.m_DataSource,protocolResource))
            {
                this.m_DomainLog.Write("nsDomainManager.js - getDomainForProtocol - Container Empty");
                return false;
            }
            
            //search protocol list for domain
            //get domains index
            var DomainResource = this.m_rdfService.GetResource("urn:"+szTempAddress); 
            var iIndex = rdfContainerUtils.indexOf(this.m_DataSource,protocolResource,DomainResource);
            if (iIndex == -1)
            {
                this.m_DomainLog.Write("nsDomainManager.js - getDomainForProtocol - domain handler not found");
                return false;
            }
            this.m_DomainLog.Write("nsDomainManager.js - getDomainForProtocol - Domain index " +iIndex);
          
           
            //get contentId
            var contentIDResource = this.m_rdfService.GetResource("http://www.xulplanet.com/rdf/webmail/"+szTempProtocol);    
            var contentID = this.m_DataSource.GetTarget(DomainResource, contentIDResource, true);
            if (contentID instanceof Components.interfaces.nsIRDFLiteral)
            {
                szContentID.value = contentID.Value;
                this.m_DomainLog.Write("nsDomainManager.js - getDomainForProtocol - contentID found " +szContentID.value);
            }
            else
            {
                this.m_DomainLog.Write("nsDomainManager.js - getDomainForProtocol - contentID == null");
                return false;
            }
            
            this.m_DomainLog.Write("nsDomainManager.js - getDomainForProtocol - END");
            return true;
        }
        catch(e)
        {
            this.m_DomainLog.DebugDump("nsDomainManager.js: getDomainForProtocol : Exception : " 
                                          + e.name + 
                                          ".\nError message: " 
                                          + e.message);
            return false;
        }
    },


    removeDomainForProtocol : function(szAddress, szProtocol)
    {
        try
        {
            this.m_DomainLog.Write("nsDomainManager.js - removeDomainForProtocol -  START" );  
            var szTempAddress = szAddress.toLowerCase();
            var szTempProtocol = szProtocol.toLowerCase();
            this.m_DomainLog.Write("nsDomainManager.js - removeDomainForProtocol - " 
                                                                + szTempAddress+ " "
                                                                + szTempProtocol);
              
            if (!this.m_bReady) 
            {
                this.m_DomainLog.Write("nsDomainManager.js - removeDomainForProtocol - DB not Loaded" );
                return -1; 
            }        
            
            var DomainResource = this.m_rdfService.GetResource("urn:"+szTempAddress);   
          
            var rdfContainerUtils = Components.classes["@mozilla.org/rdf/container-utils;1"].
                                            getService(Components.interfaces.nsIRDFContainerUtils);
        
            var protocolResource = this.getProtocolResource(szTempProtocol);
            var iIndex = rdfContainerUtils.indexOf(this.m_DataSource,protocolResource,DomainResource);             
            this.m_DomainLog.Write("nsDomainManager.js - removeDomain - "+szTempProtocol+ " " + iIndex);
                       
                       
            //remove from list    
            try
            {   
                var container = Components.classes["@mozilla.org/rdf/container;1"].
                                    createInstance(Components.interfaces.nsIRDFContainer); 
                container.Init(this.m_DataSource, protocolResource);  
                container.RemoveElement(DomainResource,true); 
            }
            catch(e)
            {
                this.m_DomainLog.Write("nsDomainManager.js: removeDomainForProtocol container: " 
                                          + e.name + 
                                          ".\nError message: " 
                                          + e.message);
            }
            
            //delete contentId
            var szContentID;
            var contentIDResource = this.m_rdfService.GetResource("http://www.xulplanet.com/rdf/webmail/"+szTempProtocol);    
            var contentID = this.m_DataSource.GetTarget(DomainResource, contentIDResource, true);
            if (contentID instanceof Components.interfaces.nsIRDFLiteral)
                this.m_DataSource.Unassert(DomainResource, contentIDResource, contentID);
             
            //delete about
            var szContentID;
            var aboutResource = this.m_rdfService.GetResource("http://home.netscape.com/NC-rdf#about");    
            this.m_DataSource.Unassert(DomainResource, aboutResource, DomainResource); 
               
                    
            //save changes
            this.m_DataSource.QueryInterface(Components.interfaces.nsIRDFRemoteDataSource);
            this.m_DataSource.Flush();  
            this.m_DataSource.QueryInterface(Components.interfaces.nsIRDFDataSource);            
            this.m_DomainLog.Write("nsDomainManager.js - removeDomainForProtocol -  END" ); 
            return true;
        }
        catch(e)
        { 
            this.m_DomainLog.DebugDump("nsDomainManager.js: removeDomainForProtocol : Exception : " 
                                          + e.name + 
                                          ".\nError message: " 
                                          + e.message);
            return false;
        } 
    },

    
    newDomainForProtocol : function(szAddress, szProtocol, szContentID)
    {
        try
        {
            this.m_DomainLog.Write("nsDomainManager.js - newDomainForProtocol -  START" );
            var szTempAddress = szAddress.toLowerCase();
            var szTempProtocol = szProtocol.toLowerCase();
            this.m_DomainLog.Write("nsDomainManager.js - newDomainForProtocol -  " 
                                                    +  "address " + szTempAddress 
                                                    +  " Content " + szContentID
                                                    +  " protocol " + szTempProtocol ); 
            
            if (!this.m_bReady) 
            {
                this.m_DomainLog.Write("nsDomainManager.js - newDomainForProtocol - DB not Loaded" );
                return -1; 
            }    
            
            //clear old entrys for the address
            this.removeDomainForProtocol(szTempAddress, szTempProtocol);
            
            //creat new entry
            var DomainResource = this.m_rdfService.GetResource("urn:"+szTempAddress); 
           
            // contentId
            var contentIDResource = this.m_rdfService.GetResource("http://www.xulplanet.com/rdf/webmail/"+szTempProtocol);    
            this.m_DataSource.Assert(DomainResource, 
                                     contentIDResource, 
                                     this.m_rdfService.GetLiteral(szContentID), 
                                     true);
            
            var container = Components.classes["@mozilla.org/rdf/container;1"].
                                               createInstance(Components.interfaces.nsIRDFContainer);

            container.Init(this.m_DataSource, this.getProtocolResource(szTempProtocol));  
            container.AppendElement(DomainResource);
 
                
            this.m_DataSource.QueryInterface(Components.interfaces.nsIRDFRemoteDataSource);
            this.m_DataSource.Flush();  
            this.m_DataSource.QueryInterface(Components.interfaces.nsIRDFDataSource);   
            
            this.m_DomainLog.Write("nsDomainManager.js - newDomainForProtocol -  END" ); 
            return true;
        }
        catch(e)
        {
            this.m_DomainLog.DebugDump("nsDomainManager.js: newDomainForProtocol : Exception : " 
                                          + e.name + 
                                          ".\nError message: " 
                                          + e.message);
            return false;
        }
    },

       
    getAllDomainsForProtocol : function(szProtocol, iCount, aszDomains)
    {
        try
        {
            this.m_DomainLog.Write("nsDomainManager.js - getAllDomainsForProtocol -  START " + szProtocol); 
    
            var szTempProtocol = szProtocol.toLowerCase();
    
            if (!this.m_bReady) 
            {
                this.m_DomainLog.Write("nsDomainManager.js - getAllDomainsForProtocol - DB not Loaded" );
                return -1; 
            }
            
           
            var protocolResource =  this.getProtocolResource(szTempProtocol);
            var rdfContainerUtils = Components.classes["@mozilla.org/rdf/container-utils;1"].
                                            getService(Components.interfaces.nsIRDFContainerUtils);
            
            //check for registered protocol handlers     
            if (rdfContainerUtils.IsEmpty(this.m_DataSource,protocolResource))
            {
                this.m_DomainLog.Write("nsDomainManager.js - getAllDomainsForProtocol - Container Empty");
                return false;
            }
            
            var aTemp = new Array();                  
            //get list   
            try
            {   
                var container = Components.classes["@mozilla.org/rdf/container;1"].
                                            createInstance(Components.interfaces.nsIRDFContainer); 
                container.Init(this.m_DataSource, protocolResource); 
                
                
                var enumerator = container.GetElements();
                while (enumerator.hasMoreElements())
                {
                    var domainElement = enumerator.getNext();
                    var domain = domainElement.QueryInterface(Components.interfaces.nsIRDFResource);
                    this.m_DomainLog.Write("nsDomainManager.js - getAllDomains - " + domain.Value);
                    var szTemp = domain.Value;
                    aTemp.push( szTemp.match(/:(.*?)$/)[1]);
                }
            }
            catch(e)
            {
                this.m_DomainLog.Write("nsDomainManager.js:  getAllDomainsForProtocol - list container: " 
                                                                      + e.name  
                                                                      +".\nError message: " 
                                                                      + e.message);
            }
            
            iCount.value = aTemp.length;
            aszDomains.value = aTemp;
            this.m_DomainLog.Write("nsDomainManager.js - getAllDomainsForProtocol - " + iCount.value 
                                                                           + aszDomains.value); 
            this.m_DomainLog.Write("nsDomainManager.js - getAllDomainsForProtocol -  END" ); 
            return true;
        }
        catch(e)
        {
            this.m_DomainLog.DebugDump("nsDomainManager.js: getAllDomainsForProtocol : Exception : " 
                                          + e.name + 
                                          ".\nError message: " 
                                          + e.message);
                                          
            return false;
        }
    },


    getProtocolResource : function(szProtocol)
    {
        this.m_DomainLog.Write("nsDomainManager.js - getProtocolResource -" + szProtocol +" START" ); 
         
        var szProtocolResource = null;
        
        switch(szProtocol.toLowerCase())
        {
            case "pop":  
                 szProtocolResource = "http://www.xulplanet.com/rdf/webmail/protocol/pop";
            break;
            
            case "smtp":
                szProtocolResource = "http://www.xulplanet.com/rdf/webmail/protocol/smpt";
            break;
            
            case "imap":
                szProtocolResource = "http://www.xulplanet.com/rdf/webmail/protocol/imap";
            break;
        }
        
        this.m_DomainLog.Write("nsDomainManager.js - getProtocolResource - " + szProtocolResource);
        var ProtocolResource = this.m_rdfService.GetResource(szProtocolResource);
        this.m_DomainLog.Write("nsDomainManager.js - getProtocolResource - END");  
        return ProtocolResource;
    },


    loadDataBase : function()
    {
        this.m_DomainLog.Write("nsDomainManager.js - loadDataBase - START");   
    
        this.m_rdfService = Components.classes["@mozilla.org/rdf/rdf-service;1"]
                                            .getService(Components.interfaces.nsIRDFService);
        
        //get location of DB
        var oNewFile = Components.classes["@mozilla.org/file/directory_service;1"].
                                  createInstance(Components.interfaces.nsIProperties).
                                  get("ProfD", Components.interfaces.nsILocalFile);
        oNewFile.append("extensions");          //goto profile extension folder
        oNewFile.append("{3c8e8390-2cf6-11d9-9669-0800200c9a66}"); //goto client extension folder
        oNewFile.append("database.rdf");       //goto logfiles folder
        
        var szlocation =   Components.classes["@mozilla.org/network/protocol;1?name=file"]
                                            .createInstance(Components.interfaces.nsIFileProtocolHandler)
                                            .getURLSpecFromFile(oNewFile);
                                            
        this.m_DomainLog.Write("nsDomainManager.js - loadDataBase - location " +szlocation);                                 
         
        this.m_DataSource = this.m_rdfService.GetDataSource(szlocation); 
        this.m_DataSource.QueryInterface(Components.interfaces.nsIRDFXMLSink);
        this.m_DataSource.addXMLSinkObserver(this);
        this.m_DomainLog.Write("nsDomainManager.js - loadDataBase - END");  
    },

    onBeginLoad : function(sink){},
    onInterrupt : function(sink){},
    onResume : function(sink){},
    onError : function(sink,status,msg){},
    onEndLoad : function(sink)
    {
        sink.removeXMLSinkObserver(this);
        sink.QueryInterface(Components.interfaces.nsIRDFDataSource);
        this.m_bReady = true;
        this.m_DomainLog.Write("nsDomainManager.js - onEndLoad - " + this.m_bReady + " DB Loaded"); 
    },


    ///deprecated functions
    getDomain : function(szAddress,  szContentID )
    {
        this.m_DomainLog.Write("nsDomainManager.js - getDomain - START - DEPRECATED FUNCTION");
        return this.getDomainForProtocol(szAddress , "pop", szContentID );
          
    },
    
    removeDomain : function(szAddress)
    {
        this.m_DomainLog.Write("nsDomainManager.js - removeDomain - START - DEPRECATED FUNCTION");
        return this.removeDomainForProtocol(szAddress, "pop");
    },
    
    newDomain : function(szAddress, szContentID)
    {
        this.m_DomainLog.Write("nsDomainManager.js - newDomain - START - DEPRECATED FUNCTION");
        return this.newDomainForProtocol(szAddress, "pop" ,szContentID);    
    },
    
    getAllDomains : function(iCount, aszDomains)
    {
        this.m_DomainLog.Write("nsDomainManager.js - getAllDomains - START - DEPRECATED FUNCTION");
        return this.getAllDomainsForProtocol("pop",  iCount, aszDomains );
    },
    
/******************************************************************************/
/***************** XPCOM  stuff ***********************************************/
/******************************************************************************/
    QueryInterface : function (iid)
    {
        if (!iid.equals(Components.interfaces.nsIDomainManager) 
        	                      	&& !iid.equals(Components.interfaces.nsISupports))
            throw Components.results.NS_ERROR_NO_INTERFACE;
            
        return this;
    }
}
 

/******************************************************************************/
/* FACTORY*/
var nsDomainManagerFactory = new Object();

nsDomainManagerFactory.createInstance = function (outer, iid)
{
    if (outer != null)
        throw Components.results.NS_ERROR_NO_AGGREGATION;
    
    if (!iid.equals(nsDomainManagerClassID) 
                            && !iid.equals(Components.interfaces.nsISupports))
        throw Components.results.NS_ERROR_INVALID_ARG;
    
    return new nsDomainManager();
}


/******************************************************************************/
/* MODULE */
var nsDomainManagerModule = new Object();

nsDomainManagerModule.registerSelf = function(compMgr, fileSpec, location, type)
{
    compMgr = compMgr.QueryInterface(Components.interfaces.nsIComponentRegistrar);
    compMgr.registerFactoryLocation(nsDomainManagerClassID,
                                    "Domain Manager",
                                    nsDomainManagerContactID, 
                                    fileSpec,
                                    location, 
                                    type);
}


nsDomainManagerModule.unregisterSelf = function(aCompMgr, aFileSpec, aLocation)
{
    aCompMgr = aCompMgr.QueryInterface(Components.interfaces.nsIComponentRegistrar);
    aCompMgr.unregisterFactoryLocation(nsDomainManagerClassID, aFileSpec);
}

 
nsDomainManagerModule.getClassObject = function(compMgr, cid, iid)
{
    if (!cid.equals(nsDomainManagerClassID))
        throw Components.results.NS_ERROR_NO_INTERFACE;

    if (!iid.equals(Components.interfaces.nsIFactory))
        throw Components.results.NS_ERROR_NOT_IMPLEMENTED;

    return nsDomainManagerFactory;
}


nsDomainManagerModule.canUnload = function(compMgr)
{
    return true;
}
/******************************************************************************/


function NSGetModule(compMgr, fileSpec)
{
    return nsDomainManagerModule; 
}
