/*****************************  Globals   *************************************/
const nsDomainDataClassID = Components.ID("{e350e6d0-9dd0-11db-b606-0800200c9a66}");
const nsDomainDataContactID = "@mozilla.org/DomainData;1";


/***********************  Domain Data ********************************/
function nsDomainData()
{
    this.m_szDomain = null;
    this.m_bPOP = false;
    this.m_bSMTP = false;
    this.m_bIMAP = false;
}

nsDomainData.prototype =
{
    get szDomain() {return this.m_szDomain;},
    set szDomain(domain) {return this.m_szDomain = domain;},

    get bPOP() {return this.m_bPOP;},
    set bPOP(pop) {return this.m_bPOP = pop;},

    get bSMTP() {return this.m_bSMTP;},
    set bSMTP(smtp) {return this.m_bSMTP = smtp;},

    get bIMAP() {return this.m_bIMAP;},
    set bIMAP(imap) {return this.m_bIMAP = imap;},

/******************************************************************************/
/***************** XPCOM  stuff ***********************************************/
/******************************************************************************/
    QueryInterface : function (iid)
    {
        if (!iid.equals(Components.interfaces.nsIDomainData)
                && !iid.equals(Components.interfaces.nsISupports))
            throw Components.results.NS_ERROR_NO_INTERFACE;

        return this;
    }
}


/******************************************************************************/
/* FACTORY*/
var nsDomainDataFactory = new Object();

nsDomainDataFactory.createInstance = function (outer, iid)
{
    if (outer != null)
        throw Components.results.NS_ERROR_NO_AGGREGATION;

    if (!iid.equals(nsDomainDataClassID)
                            && !iid.equals(Components.interfaces.nsISupports))
        throw Components.results.NS_ERROR_INVALID_ARG;

    return new nsDomainData();
}


/******************************************************************************/
/* MODULE */
var nsDomainDataModule = new Object();

nsDomainDataModule.registerSelf = function(compMgr, fileSpec, location, type)
{
    compMgr = compMgr.QueryInterface(Components.interfaces.nsIComponentRegistrar);
    compMgr.registerFactoryLocation(nsDomainDataClassID,
                                    "Domain Data",
                                    nsDomainDataContactID,
                                    fileSpec,
                                    location,
                                    type);
}


nsDomainDataModule.unregisterSelf = function(aCompMgr, aFileSpec, aLocation)
{
    aCompMgr = aCompMgr.QueryInterface(Components.interfaces.nsIComponentRegistrar);
    aCompMgr.unregisterFactoryLocation(nsDomainDataClassID, aFileSpec);
}


nsDomainDataModule.getClassObject = function(compMgr, cid, iid)
{
    if (!cid.equals(nsDomainDataClassID))
        throw Components.results.NS_ERROR_NO_INTERFACE;

    if (!iid.equals(Components.interfaces.nsIFactory))
        throw Components.results.NS_ERROR_NOT_IMPLEMENTED;

    return nsDomainDataFactory;
}


nsDomainDataModule.canUnload = function(compMgr)
{
    return true;
}
/******************************************************************************/


function NSGetModule(compMgr, fileSpec)
{
    return nsDomainDataModule;
}
