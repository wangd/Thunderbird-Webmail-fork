/*****************************  Globals   *************************************/                 
const nsDomainManagerClassID = Components.ID("{76f4dcb0-284a-11d9-9669-0800200c9a66}");
const nsDomainManagerContactID = "@mozilla.org/DomainManager;1";

const patternDataBase = /<database>([\S\s]*?)<\/database>/i;
const patternRow = /<row>[\S\s]*?<\/row>/ig;
const patternProtocol = /<protocol>([\S\s]*?)<\/protocol>/i;
const patternDomain = /<domain>([\S\s]*?)<\/domain>/i;
const patternContentID = /<contentID>([\S\s]*?)<\/contentID>/i;

/***********************  DomainManager ********************************/
function nsDomainManager()
{   
    this.m_scriptLoader = null; 
    this.m_Log = null; 
    this.m_bReady = false;
    this.m_oFile = null;
    this.m_aPOP = new Array();
    this.m_aSMTP = new Array();
    this.m_aIMAP = new Array();
    this.m_bChange = false;
}

nsDomainManager.prototype =
{
    isReady : function() 
    { 
        this.m_Log.Write("nsDomainManager.js - isReady - " +this.m_bReady); 
        return this.m_bReady;
    },

    
    getDomainForProtocol : function(szAddress, szProtocol , szContentID )
    {
        try
        { 
            this.m_Log.Write("nsDomainManager.js - getDomainForProtocol - START");           
            this.m_Log.Write("nsDomainManager.js - getDomainForProtocol - " +szAddress+ " " +szProtocol); 

            if (!this.m_bReady) 
            {
                this.m_Log.Write("nsDomainManager.js - getDomainForProtocol - DB not Loaded" );
                return -1; 
            }
            
            var aData = this.getProtocolResource(szProtocol);
            this.m_Log.Write("nsDomainManager.js - getDomainForProtocol - DATA " +aData.length );
            if (aData.length == 0)
            {
                this.m_Log.Write("nsDomainManager.js - getDomainForProtocol - No DATA" );
                return false;
            }
            
            var regExp = new RegExp("^"+szAddress+"$", "i");
            var bFound = false;
            var i= 0;
            
            //search protocol list for domain            
            do{
                if (aData[i].szDomain.search(regExp)!=-1)
                {
                    this.m_Log.Write("nsDomainManager.js - getDomainForProtocol - Found");
                    szContentID.value =  aData[i].szContentID;
                    bFound = true;     
                }    
                i++;     
            }while(!bFound && i<aData.length);
                        
            this.m_Log.Write("nsDomainManager.js - getDomainForProtocol - END");
            return bFound;
        }
        catch(e)
        {
            this.m_Log.DebugDump("nsDomainManager.js: getDomainForProtocol : Exception : " 
                                          + e.name + 
                                          ".\nError message: " 
                                          + e.message+ "\n"
                                          + e.lineNumber);
            return false;
        }
    },



    newDomainForProtocol : function(szAddress, szProtocol, szContentID)
    {
        try
        {
            this.m_Log.Write("nsDomainManager.js - newDomainForProtocol -  START" );
            this.m_Log.Write("nsDomainManager.js - newDomainForProtocol -  " +  "address " + szAddress 
                                                                            + " Content " + szContentID 
                                                                            + " protocol " + szProtocol); 

            if (!this.m_bReady) 
            {
                this.m_Log.Write("nsDomainManager.js - newDomainForProtocol - DB not Loaded" );
                return -1; 
            }    
            
            
            var aData = this.getProtocolResource(szProtocol);
            
            var oDomainData = new DomainData();
            oDomainData.szDomain = szAddress;
            oDomainData.szContentID = szContentID;
            aData.push(oDomainData);
            this.m_bChange = true;
            
            this.m_Log.Write("nsDomainManager.js - newDomainForProtocol -  END" ); 
            return true;
        }
        catch(e)
        {
            this.m_Log.DebugDump("nsDomainManager.js: newDomainForProtocol : Exception : " 
                                          + e.name + 
                                          ".\nError message: " 
                                          + e.message+ "\n"
                                          + e.lineNumber);
            return false;
        }
    },



    getAllDomainsForProtocol : function(szProtocol, iCount, aszDomains)
    {
        try
        {
            this.m_Log.Write("nsDomainManager.js - getAllDomainsForProtocol -  START " + szProtocol); 

            if (!this.m_bReady) 
            {
                this.m_Log.Write("nsDomainManager.js - getAllDomainsForProtocol - DB not Loaded" );
                return -1; 
            }
            
            
            var aData = this.getProtocolResource(szProtocol);
            
            var aResult = new Array();
            for (i=0; i<aData.length; i++)
            {
                aResult.push(aData[i].szDomain);
            }
             
            iCount.value = aResult.length;
            aszDomains.value = aResult;
            this.m_Log.Write("nsDomainManager.js - getAllDomainsForProtocol - " + iCount.value + " " + aszDomains.value);

            this.m_Log.Write("nsDomainManager.js - getAllDomainsForProtocol -  END" ); 
            return true;
        }
        catch(e)
        {
            this.m_Log.DebugDump("nsDomainManager.js: getAllDomainsForProtocol : Exception : " 
                                          + e.name + 
                                          ".\nError message: " 
                                          + e.message+ "\n"
                                          + e.lineNumber);
                                          
            return false;
        }
    },


    removeDomainForProtocol : function(szAddress, szProtocol)
    {
        try
        {
            this.m_Log.Write("nsDomainManager.js - removeDomainForProtocol -  START" );  
            this.m_Log.Write("nsDomainManager.js - removeDomainForProtocol - " + szAddress+ " " + szProtocol);

            if (!this.m_bReady) 
            {
                this.m_Log.Write("nsDomainManager.js - removeDomainForProtocol - DB not Loaded" );
                return -1; 
            }        
            
            var aData = this.getProtocolResource(szProtocol);  
            var regExp = new RegExp("^"+szAddress+"$", "i");
            var i=0;
            var bFound=false;
            
            do{
                var temp = aData.pop();
                this.m_Log.Write("nsDomainManager.js - removeDomainForProtocol - " + temp.szDomain);
                
                if (temp.szDomain.search(regExp)==-1)
                {
                    this.m_Log.Write("nsDomainManager.js - removeDomainForProtocol - Found");
                    aData.push(temp);
                } 
                else
                {
                    bFound = true;                        
                }   
                i++;   
            }while(i<aData.length && !bFound)

            this.m_bChange = true;
            this.m_Log.Write("nsDomainManager.js - removeDomainForProtocol -  END" ); 
            return true;
        }
        catch(e)
        { 
            this.m_Log.DebugDump("nsDomainManager.js: removeDomainForProtocol : Exception : " 
                                          + e.name + 
                                          ".\nError message: " 
                                          + e.message+ "\n"
                                          + e.lineNumber);
            return false;
        } 
    },

           
   

    getProtocolResource : function(szProtocol)
    {
        try
        {
            this.m_Log.Write("nsDomainManager.js - getProtocolResource - START");   
            this.m_Log.Write("nsDomainManager.js - getProtocolResource - szProtocol" +szProtocol);   

            var aData = null;
            if (szProtocol.search(/pop/i) !=-1) 
            {
                aData = this.m_aPOP;
                this.m_Log.Write("nsDomainManager.js - getProtocolResource - found");   
            }
            else if (szProtocol.search(/imap/i)!=-1)
            {
                aData = this.m_aIMAP;
                this.m_Log.Write("nsDomainManager.js - getProtocolResource - found");   
            }
            else if (szProtocol.search(/smtp/i)!=-1) 
            {
                aData = this.m_aSMTP;
                this.m_Log.Write("nsDomainManager.js - getProtocolResource - found");   
            }

            this.m_Log.Write("nsDomainManager.js - getProtocolResource - END");
            return aData;  
        }
        catch(err)
        {
            this.m_Log.DebugDump("nsDomainManager.js: getProtocolResource : Exception : " 
                                          + err.name + 
                                          ".\nError message: " 
                                          + err.message + "\n"
                                          + err.lineNumber);
                                          
            return false;
        }
    },

    
    loadDataBase : function()
    {
        try
        {
            this.m_Log.Write("nsDomainManager.js - loadDataBase - START");   
    
            //get location of DB
            this.m_oFile = Components.classes["@mozilla.org/file/directory_service;1"].
                                      createInstance(Components.interfaces.nsIProperties).
                                      get("ProfD", Components.interfaces.nsIFile);                                 
            this.m_oFile.append("extensions");          //goto profile extension folder
            this.m_oFile.append("{3c8e8390-2cf6-11d9-9669-0800200c9a66}"); //goto client extension folder
            this.m_oFile.append("database.txt");       //goto logfiles folder
            
            //check file exist  
            if (!this.m_oFile.exists())
            {   //create file
                this.m_Log.Write("nsDomainManager.js - loadDataBase - creating file");   
                this.m_oFile.create(Components.interfaces.nsIFile.NORMAL_FILE_TYPE, 420);
            }
            
            //open file  
            var ioService = Components.classes["@mozilla.org/network/io-service;1"].
                                    getService(Components.interfaces.nsIIOService);
                       
            var fileURI = ioService.newFileURI(this.m_oFile);
            var channel = ioService.newChannelFromURI(fileURI); 
             
            var streamLoader = Components.classes["@mozilla.org/network/stream-loader;1"].
                                    createInstance(Components.interfaces.nsIStreamLoader);
            streamLoader.init(channel, this, null); 
            
            this.m_Log.Write("nsDomainManager.js - loadDataBase - END");  
            return true;
        }
        catch(err)
        {
            this.m_Log.DebugDump("nsDomainManager.js: loadDataBase : Exception : " 
                                          + err.name 
                                          + ".\nError message: " 
                                          + err.message + "\n"
                                          + err.lineNumber);
                                          
            return false;
        }
    },

    
    onStreamComplete : function(aLoader, aContext, aStatus, ResultLength, Result)
    { 
        try
        {
            this.m_Log.Write("nsDomainManager.js - onStreamComplete - START");  
            
            var szResult = null;
            var uniCon = Components.classes["@mozilla.org/intl/scriptableunicodeconverter"]
                                       .createInstance(Components.interfaces.nsIScriptableUnicodeConverter);

            uniCon.charset = "UTF-8";
            var str;
            try 
            {
                szResult = uniCon.convertFromByteArray(Result, Result.length);
            } 
            catch(e) 
            {
                this.m_Log.Write("nsDomainManager.js - onStreamComplete - conversion failed");      
            }
            
            
            try
            {
                if (szResult.length>0)
                {
                    //get database
                    var szDataBase = szResult.match(patternDataBase)[1];
                    
                    //get rows
                    var aszRows = szDataBase.match(patternRow);
                    
                    for (i=0; i < aszRows.length; i++)
                    {
                        //get  protocol pop/smtp/imap 
                        var szProtocol = aszRows[i].match(patternProtocol)[1];
                        this.m_Log.Write("nsDomainManager.js - onStreamComplete - szProtocol " + szProtocol);  
                        
                        //get domain
                        var szDomain = aszRows[i].match(patternDomain)[1];
                        this.m_Log.Write("nsDomainManager.js - onStreamComplete - szDomain " + szDomain);  
                        
                        //get content id
                        var szContentId = aszRows[i].match(patternContentID)[1];
                        this.m_Log.Write("nsDomainManager.js - onStreamComplete - szContentId " + szContentId); 
                        
                        var oData = new DomainData();
                        oData.szDomain = szDomain;
                        oData.szContentID = szContentId;
                        
                        if (szProtocol.search(/pop/i)!=-1) this.m_aPOP.push(oData);
                        else if (szProtocol.search(/imap/i)!=-1) this.m_aIMAP.push(oData);
                        else if (szProtocol.search(/smtp/i)!=-1) this.m_aSMTP.push(oData);                    
                    }
                }
            }
            catch(err)
            {
                this.m_Log.Write("nsDomainManager.js - onStreamComplete - NO DATA \n" 
                                                                  + ".\nError message: " 
                                                                  + err.message + "\n"
                                                                  + err.lineNumber);      
            }
            
            this.m_bReady = true;
            this.m_Log.Write("nsDomainManager.js - onStreamComplete - " + this.m_bReady + " DB Loaded");
            
            this.m_Log.Write("nsDomainManager.js - onStreamComplete - END");  
            return true;
        }
        catch(err)
        {
            this.m_Log.DebugDump("nsDomainManager.js: onStreamComplete : Exception : " 
                                          + err.name 
                                          + ".\nError message: " 
                                          + err.message + "\n"
                                          + err.lineNumber);
                                          
            return false;
        }
    },
    


    saveDataBase : function ()
    {
        try
        {
            this.m_Log.Write("nsDomainManager.js - saveDataBase - START");

            var szDataBase = "<database>\r\n";
            for (i=0; i<3; i++)
            {
                var szProtocol = (i==0) ? "POP" : ((i==1)?"SMTP":"IMAP"); 
                var Data = this.getProtocolResource(szProtocol);
               
                for (j=0; j<Data.length; j++)
                {
                    szDataBase += "<row>\r\n";
                    szDataBase += "<domain>"+Data[j].szDomain+"</domain>\r\n";
                    szDataBase += "<contentID>"+Data[j].szContentID+"</contentID>\r\n";
                    szDataBase += "<protocol>"+szProtocol+"</protocol>\r\n";
                    szDataBase += "</row>\r\n";
                }
            }
            
            szDataBase += "</database>\r\n";
            
            var outStream = Components.classes["@mozilla.org/network/file-output-stream;1"]
                                .createInstance(Components.interfaces.nsIFileOutputStream);
            outStream.init(this.m_oFile, 0x04 | 0x20 , 420 , 0); 
            outStream.write( szDataBase, szDataBase.length );
            outStream.close();
            
            this.m_Log.Write("nsDomainManager.js - saveDataBase - END");  
            return true;
        }
        catch(err)
        {
            this.m_Log.DebugDump("nsDomainManager.js: saveDataBase : Exception : " 
                                          + err.name 
                                          + ".\nError message: " 
                                          + err.message + "\n"
                                          + err.lineNumber);
                                          
            return false;
        }
    },


    observe : function(aSubject, aTopic, aData) 
    {
        switch(aTopic) 
        {
            case "xpcom-startup":
                // this is run very early, right after XPCOM is initialized, but before
                // user profile information is applied. Register ourselves as an observer
                // for 'profile-after-change' and 'quit-application'.
                var obsSvc = Components.classes["@mozilla.org/observer-service;1"].
                                getService(Components.interfaces.nsIObserverService);
                obsSvc.addObserver(this, "profile-after-change", false);
                obsSvc.addObserver(this, "quit-application", false);
                           
                this.m_scriptLoader = Components.classes["@mozilla.org/moz/jssubscript-loader;1"]
                                        .getService(Components.interfaces.mozIJSSubScriptLoader);
            break;
            
            case "profile-after-change":
                // This happens after profile has been loaded and user preferences have been read.
                // startup code here
                this.m_scriptLoader.loadSubScript("chrome://web-mail/content/common/CommonPrefs.js");
                this.m_scriptLoader.loadSubScript("chrome://web-mail/content/common/DebugLog.js");
                this.m_scriptLoader.loadSubScript("chrome://web-mail/content/DomainData.js");
                                
                this.m_Log = new DebugLog("webmail.logging.comms", 
                                          "{3c8e8390-2cf6-11d9-9669-0800200c9a66}",
                                          "Domainlog");
                this.m_Log.Write("nsDomainManager.js - profile-after-change ");  
                this.loadDataBase();  
            break;

            case "quit-application":
                this.m_Log.Write("nsDomainManager.js - quit-application "); 
                if (this.m_bChange) this.saveDataBase(); 
            break;
            
            case "app-startup":
            break;
            
            default:
                throw Components.Exception("Unknown topic: " + aTopic);
        }
    },

/******************************************************************************/
/***************** XPCOM  stuff ***********************************************/
/******************************************************************************/
    QueryInterface : function (iid)
    {
        if (!iid.equals(Components.interfaces.nsIDomainManager) 
        	    && !iid.equals(Components.interfaces.nsISupports)
                    && !iid.equals(Components.interfaces.nsIObserver))
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
    var catman = Components.classes["@mozilla.org/categorymanager;1"].
                        getService(Components.interfaces.nsICategoryManager);
        
    catman.addCategoryEntry("xpcom-startup", 
                            "Domain Manager", 
                            nsDomainManagerContactID, 
                            true, 
                            true);                     
                            
    catman.addCategoryEntry("app-startup", 
                            "Domain Manager", 
                            "service," + nsDomainManagerContactID, 
                            true, 
                            true);
    
            
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
    var catman = Components.classes["@mozilla.org/categorymanager;1"].
                            getService(Components.interfaces.nsICategoryManager);
                            
    catman.deleteCategoryEntry("xpcom-startup", "Domain Manager", true);
    catman.deleteCategoryEntry("app-startup", "Domain Manager", true);
    
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
