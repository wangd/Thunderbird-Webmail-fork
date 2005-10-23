/*****************************  Globals   *************************************/                 
const nsSessionDataClassID = Components.ID("{f38acaf0-35f5-11da-8cd6-0800200c9a66}");
const nsSessionDataContactID = "@mozilla.org/SessionData;1";


/***********************  SessionManager ********************************/
function nsSessionData()
{   
    this.m_szUserName = null;
    this.m_oCookieManager = null;
    this.m_oHttpAuthManager = null;
    this.m_oComponentData = null;
    this.m_iExpiryTime =-1;
    this.m_iBlocked = false;
}

nsSessionData.prototype =
{
    get szUserName() {return this.m_szUserName;},
    set szUserName(userName) {return this.m_szUserName = userName;},   
     
    get oCookieManager() {return this.m_oCookieManager;},
    set oCookieManager(oCookieManager) {return this.m_oCookieManager = oCookieManager;},
    
    get oHttpAuthManager() {return this.m_oHttpAuthManager;},
    set oHttpAuthManager(oHttpAuthManager) {return this.m_oHttpAuthManager = oHttpAuthManager;},

    get oComponentData() {return this.m_oComponentData;},
    set oComponentData(oComponentData) {return this.m_oComponentData = oComponentData;},

    get iExpiryTime() {return this.m_iExpiryTime;},
    set iExpiryTime(iExpiryTime) {return this.m_iExpiryTime = iExpiryTime;},
    
    get bBlocked() {return this.m_bBlocked;},
    set bBlocked(bBlocked) {return this.m_bBlocked = bBlocked;},

        
/******************************************************************************/
/***************** XPCOM  stuff ***********************************************/
/******************************************************************************/
    QueryInterface : function (iid)
    {
        if (!iid.equals(Components.interfaces.nsISessionData) 
        	    && !iid.equals(Components.interfaces.nsISupports))
            throw Components.results.NS_ERROR_NO_INTERFACE;
            
        return this;
    }
}
 

/******************************************************************************/
/* FACTORY*/
var nsSessionDataFactory = new Object();

nsSessionDataFactory.createInstance = function (outer, iid)
{
    if (outer != null)
        throw Components.results.NS_ERROR_NO_AGGREGATION;
    
    if (!iid.equals(nsSessionDataClassID) 
                            && !iid.equals(Components.interfaces.nsISupports))
        throw Components.results.NS_ERROR_INVALID_ARG;
    
    return new nsSessionData();
}


/******************************************************************************/
/* MODULE */
var nsSessionDataModule = new Object();

nsSessionDataModule.registerSelf = function(compMgr, fileSpec, location, type)
{
    compMgr = compMgr.QueryInterface(Components.interfaces.nsIComponentRegistrar);
    compMgr.registerFactoryLocation(nsSessionDataClassID,
                                    "Session Data",
                                    nsSessionDataContactID, 
                                    fileSpec,
                                    location, 
                                    type);
}


nsSessionDataModule.unregisterSelf = function(aCompMgr, aFileSpec, aLocation)
{
    aCompMgr = aCompMgr.QueryInterface(Components.interfaces.nsIComponentRegistrar);
    aCompMgr.unregisterFactoryLocation(nsSessionDataClassID, aFileSpec);
}

 
nsSessionDataModule.getClassObject = function(compMgr, cid, iid)
{
    if (!cid.equals(nsSessionDataClassID))
        throw Components.results.NS_ERROR_NO_INTERFACE;

    if (!iid.equals(Components.interfaces.nsIFactory))
        throw Components.results.NS_ERROR_NOT_IMPLEMENTED;

    return nsSessionDataFactory;
}


nsSessionDataModule.canUnload = function(compMgr)
{
    return true;
}
/******************************************************************************/


function NSGetModule(compMgr, fileSpec)
{
    return nsSessionDataModule; 
}
