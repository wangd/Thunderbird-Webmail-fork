const NC_rdf ="http://home.netscape.com/NC-rdf#";

function WebmailAccountManager()
{
    try
    {
        var scriptLoader =  Components.classes["@mozilla.org/moz/jssubscript-loader;1"]
                                        .getService(Components.interfaces.mozIJSSubScriptLoader);
        if (scriptLoader)
        {
            scriptLoader.loadSubScript("chrome://web-mail/content/common/DebugLog.js");
            scriptLoader.loadSubScript("chrome://web-mail/content/common/CommonPrefs.js");
        }
        this.m_Log = new DebugLog("webmail.logging.comms", 
                                  "{3c8e8390-2cf6-11d9-9669-0800200c9a66}", 
                                  "AccountWizard");
                                  
        this.m_Log.Write("WebmailAccountManager.js - Constructor - START");
        
        this.m_DataSource =  null;
        this.m_rdfService =  Components.classes["@mozilla.org/rdf/rdf-service;1"]
                                        .getService(Components.interfaces.nsIRDFService);;
                  
        var strBundleService = Components.classes["@mozilla.org/intl/stringbundle;1"].
                                    getService(Components.interfaces.nsIStringBundleService);
                                
        this.m_ContentBundle = strBundleService.createBundle("chrome://web-mail/locale/Webmail-AccountWizard.properties");
                                               
        this.m_Log.Write("WebmailAccountManager.js - Constructor - END");  
    }
    catch(err)
    {
        DebugDump("WebmailAccountManager.js: Constructor : Exception : " 
                                      + err.name + 
                                      ".\nError message: " 
                                      + err.message);
    }
}

WebmailAccountManager.prototype =
{    
    checkISP : function()
    {
        try
        {
            this.m_Log.Write("WebmailAccountManager.js - checkISP - START"); 
            
            var TargetFile = Components.classes["@mozilla.org/file/directory_service;1"].
                                   createInstance(Components.interfaces.nsIProperties).
                                      get("DefRt", Components.interfaces.nsILocalFile);
            TargetFile.append("isp"); 
            TargetFile.append("webmail.rdf");   
            var bResult =  TargetFile.isFile();           
            this.m_Log.Write("WebmailAccountManager.js - checkISP - file exists " +bResult);           
            this.m_Log.Write("WebmailAccountManager.js - checkISP - END "); 
            return bResult;
        }
        catch(err)
        {
            this.m_Log.DebugDump("WebmailAccountManager.js : checkISP" 
                                    + err.name + 
                                    ".\nError message: " 
                                    + err.message);
        }
    },
     
    
    deleteISP : function()
    { 
        try
        { 
            this.m_Log.Write("WebmailAccountManager.js - deleteISP - START");
            
            if (this.checkISP())
            {
                var TargetFile = Components.classes["@mozilla.org/file/directory_service;1"].
                                       createInstance(Components.interfaces.nsIProperties).
                                          get("DefRt", Components.interfaces.nsILocalFile);
                TargetFile.append("isp"); 
                TargetFile.append("webmail.rdf");  
                TargetFile.remove(false);     //delete isp file  
            }
           
            this.m_Log.Write("WebmailAccountManager.js - deleteISP - END");
        }
        catch(err)
        {
            this.m_Log.DebugDump("WebmailAccountManager.js : deleteISP" 
                                    + err.name + 
                                    ".\nError message: " 
                                    + err.message);
        }
    },
   
   
    createISP : function()
    {
        try
        {
            this.m_Log.Write("WebmailAccountManager.js - createISP - START"); 
            
            this.loadISP();
            
            this.m_Log.Write("WebmailAccountManager.js - createISP - END"); 
        }
        catch(err)
        {
            this.m_Log.DebugDump("WebmailAccountManager.js : createISP" 
                                    + err.name + 
                                    ".\nError message: " 
                                    + err.message);
        }
    },
    
    
    
    ///////////////////private functions //////////////////////////////////////
           
    updateISP: function()
    {
        try
        {
            this.m_Log.Write("WebmailAccountManager.js - updateISP - START"); 
            
            var mainResource = this.m_rdfService.GetResource("urn:web-mail"); 
            
            this.parseISP(this.m_DataSource, mainResource);
            
            //save changes
            this.m_DataSource.QueryInterface(Components.interfaces.nsIRDFRemoteDataSource);
            this.m_DataSource.Flush();
            
            this.m_Log.Write("WebmailAccountManager.js - updateISP - END"); 
        }
        catch(e)
        {
            this.m_Log.DebugDump("WebmailAccountManager.js : updateISP" 
                                    + err.name + 
                                    ".\nError message: " 
                                    + err.message);
        }
    },
    
    
    
    
    loadISP : function()
    { 
        try
        {
            this.m_Log.Write("WebmailAccountManager.js - loadISP - START");   
            
            var SourceFile =  Components.classes["@mozilla.org/file/directory_service;1"].
                                      createInstance(Components.interfaces.nsIProperties).
                                      get("ProfD", Components.interfaces.nsILocalFile);
            SourceFile.append("extensions");                               //goto profile extension folder
            SourceFile.append("{3c8e8390-2cf6-11d9-9669-0800200c9a66}");  //goto client extension folder
            SourceFile.append("webmail.rdf");
                   
            var szlocation = Components.classes["@mozilla.org/network/protocol;1?name=file"]
                                                .createInstance(Components.interfaces.nsIFileProtocolHandler)
                                                .getURLSpecFromFile(SourceFile);
                                                
            this.m_Log.Write("WebmailAccountManager.js - loadISP - location " +szlocation);                                 
             
            this.m_DataSource = this.m_rdfService.GetDataSource(szlocation); 
            this.m_DataSource.QueryInterface(Components.interfaces.nsIRDFXMLSink);
            this.m_DataSource.addXMLSinkObserver(this);
           
            this.m_Log.Write("WebmailAccountManager.js - loadISP - END");
        }
        catch(e)
        {
            this.m_Log.DebugDump("WebmailAccountManager.js : loadISP" 
                                    + err.name + 
                                    ".\nError message: " 
                                    + err.message);
        }   
    },
    
    addISP: function ()
    {   
        try
        {
            this.m_Log.Write("WebmailAccountManager.js - addISP - START");
    
            //goto default folder in application
            var TargetFile = Components.classes["@mozilla.org/file/directory_service;1"].
                                   createInstance(Components.interfaces.nsIProperties).
                                      get("DefRt", Components.interfaces.nsILocalFile);
            TargetFile.append("isp"); 
            
            
            var SourceFile =  Components.classes["@mozilla.org/file/directory_service;1"].
                                      createInstance(Components.interfaces.nsIProperties).
                                      get("ProfD", Components.interfaces.nsILocalFile);
            SourceFile.append("extensions");                               //goto profile extension folder
            SourceFile.append("{3c8e8390-2cf6-11d9-9669-0800200c9a66}");  //goto client extension folder
            SourceFile.append("webmail.rdf");
            SourceFile.copyTo(TargetFile,null);   
           
            this.m_Log.Write("WebmailAccountManager.js - addISP - END");
        }
        catch(e)
        {
            this.m_Log.DebugDump("WebmailAccountManager.js : addISP" 
                                    + err.name + 
                                    ".\nError message: " 
                                    + err.message);
        }
    },
    
    
    
    parseISP : function (datasource, root)
    {
        try
        {
            this.m_Log.Write("WebmailAccountManager.js - parseISP - START");
            
            var arcs = datasource.ArcLabelsOut(root);
            this.m_Log.Write("WebmailAccountManager.js - parseISP - arcs" + arcs);
            
            while (arcs.hasMoreElements()) 
            {
                this.m_Log.Write("WebmailAccountManager.js - parseISP - elements found");
               
                var arc = arcs.getNext();
                if (arc instanceof Components.interfaces.nsIRDFResource)
                {
                    var  szArc = arc.Value
                    this.m_Log.Write("WebmailAccountManager.js - parseISP - arc " + szArc);
            
                    if (szArc.search(/http:\/\/www.w3.org\/1999\/02\/22-rdf-syntax-ns#type/i)== -1 &&
                        szArc.search(/http:\/\/home.netscape.com\/NC-rdf#smtp/i)== -1  &&
                        szArc.search(/http:\/\/home.netscape.com\/NC-rdf#identity/i)== -1 &&
                        szArc.search(/http:\/\/home.netscape.com\/NC-rdf#ServerType-pop3/i)== -1 &&
                        szArc.search(/http:\/\/home.netscape.com\/NC-rdf#biffMinutes/i)== -1 &&
                        szArc.search(/http:\/\/home.netscape.com\/NC-rdf#doBiff/i)== -1 &&
                        szArc.search(/http:\/\/home.netscape.com\/NC-rdf#downloadOnBiff/i)== -1 &&
                        szArc.search(/http:\/\/home.netscape.com\/NC-rdf#type/i)== -1 &&
                        szArc.search(/http:\/\/home.netscape.com\/NC-rdf#hostName/i)== -1 &&
                        szArc.search(/http:\/\/home.netscape.com\/NC-rdf#wizardSkipPanels/i)== -1 &&
                        szArc.search(/http:\/\/home.netscape.com\/NC-rdf#wizardShow/i)== -1 )
                    {
                        var target = datasource.GetTarget(root, arc, true);
                        this.m_Log.Write("WebmailAccountManager.js - parseISP - target " + target);
                    
                        try
                        {   //resource
                            target = target.QueryInterface(Components.interfaces.nsIRDFResource);
                            this.m_Log.Write("WebmailAccountManager.js - parseISP - more elements " + target);
                            this.parseISP(datasource, target);
                        }
                        catch(e)
                        {   //value
                            target = target.QueryInterface(Components.interfaces.nsIRDFLiteral)
                            this.m_Log.Write("WebmailAccountManager.js - parseISP - target value " + target.Value);
                            
                            if (szArc.search(/http:\/\/home.netscape.com\/NC-rdf#port/i)!= -1)
                            {
                                var oPref = new Object();
                                oPref.Value = null;
                                var  WebMailPrefAccess = new WebMailCommonPrefAccess();
                                if (! WebMailPrefAccess.Get("int", "webmail.server.port.pop", oPref)) 
                                {
                                    this.m_POPLog.Write("WebmailAccountManager.js -pop pref failed. Set to default 110");
                                    oPref.Value = 110;
                                }
                                delete WebMailPrefAccess;
                                this.m_Log.Write("WebmailAccountManager.js - parseISP - port " +oPref.Value);
                                var inServerResource = this.m_rdfService.GetResource( NC_rdf + "incomingServer");
                                var port = this.m_rdfService.GetLiteral(oPref.Value);
                                datasource.Change(root, arc, target, port)
                            }
                            else if (szArc.search(/http:\/\/home.netscape.com\/NC-rdf#prettyName/i)!= -1)
                            {
                                var strPrettyName = this.m_ContentBundle.GetStringFromName("prettyName");
                                this.m_Log.Write("WebmailAccountManager.js - parseISP - pretty Name " +strPrettyName);
                                var inServerResource = this.m_rdfService.GetResource( NC_rdf + "incomingServer");
                                var prettyName = this.m_rdfService.GetLiteral(strPrettyName);
                                datasource.Change(root, arc, target, prettyName)   
                            }
                            else if (szArc.search(/http:\/\/home.netscape.com\/NC-rdf#wizardLongName/i)!= -1)
                            {
                                var strWizardLongName = this.m_ContentBundle.GetStringFromName("wizardLongName");
                                this.m_Log.Write("WebmailAccountManager.js - parseISP - wizardLongName " +strWizardLongName);
                                var inServerResource = this.m_rdfService.GetResource( NC_rdf + "incomingServer");
                                var wizardLongName = this.m_rdfService.GetLiteral(strWizardLongName);
                                datasource.Change(root, arc, target, wizardLongName)   
                            }
                            else if (szArc.search(/http:\/\/home.netscape.com\/NC-rdf#wizardShortName/i)!= -1)
                            {
                                var strWizardShortName = this.m_ContentBundle.GetStringFromName("wizardShortName");
                                this.m_Log.Write("WebmailAccountManager.js - parseISP - wizardShortName " +strWizardShortName);
                                var inServerResource = this.m_rdfService.GetResource( NC_rdf + "incomingServer");
                                var wizardShortName = this.m_rdfService.GetLiteral(strWizardShortName);
                                datasource.Change(root, arc, target, wizardShortName)   
                            }
                       }  
                    } 
                }
            }
            this.m_Log.Write("WebmailAccountManager.js - parseISP - END");
        }
        catch(err)
        {
             this.m_Log.DebugDump("WebmailAccountManager.js : parseISP " 
                                    + err.name + 
                                    ".\nError message: " 
                                    + err.message);
        }
    },
    
    
    onBeginLoad : function(sink){},
    onInterrupt : function(sink){},
    onResume : function(sink){},
    onError : function(sink,status,msg){},
    onEndLoad : function(sink)
    {
        try
        {
            this.m_Log.Write("WebmailAccountManager.js - onEndLoad - START"); 
            
            sink.removeXMLSinkObserver(this);
            sink.QueryInterface(Components.interfaces.nsIRDFDataSource);
               
            this.updateISP();
            this.addISP(); //copy webmail.rdf to isp
          
            this.m_Log.Write("WebmailAccountManager.js - onEndLoad - END"); 
        }
        catch(e)
        {
            this.m_Log.DebugDump("WebmailAccountManager.js : onEndLoad" 
                                    + err.name + 
                                    ".\nError message: " 
                                    + err.message);
        } 
    }
}
