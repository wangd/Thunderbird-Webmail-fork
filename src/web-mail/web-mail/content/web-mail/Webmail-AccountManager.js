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

        this.m_Branch = null;

        this.m_rdfService =  Components.classes["@mozilla.org/rdf/rdf-service;1"]
                                        .getService(Components.interfaces.nsIRDFService);
        this.m_TbDataSource =  this.m_rdfService.GetDataSource("rdf:ispdefaults");

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

    updateISP : function()
    {
        try
        {
            this.m_Log.Write("WebmailAccountManager.js - createISP - START");

            var root = this.m_rdfService.GetResource("urn:webmail");
            this.parseISP(this.m_TbDataSource, root);

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



    register: function()
    {
        try
        {
            this.m_Log.Write("WebmailAccountManager.js - register - START");

            var prefService = Components.classes["@mozilla.org/preferences-service;1"]
                                        .getService(Components.interfaces.nsIPrefService);
            this.m_Branch = prefService.getBranch("webmail.server.port.");
            this.m_Branch.QueryInterface(Components.interfaces.nsIPrefBranch2);
            this.m_Branch.addObserver("", this, false);

            this.m_Log.Write("WebmailAccountManager.js - register - END");
        }
        catch(err)
        {
            this.m_Log.DebugDump("WebmailAccountManager.js : updateISP"
                                    + err.name +
                                    ".\nError message: "
                                    + err.message + "\n"
                                    + err.lineNumber);
        }
    },



    unregister: function()
    {
        try
        {
            this.m_Log.Write("WebmailAccountManager.js - unregister - START");

            if(!this.m_Branch) return;
            this.m_Branch.removeObserver("", this);

            this.m_Log.Write("WebmailAccountManager.js - unregister - END");
        }
        catch(err)
        {
            this.m_Log.DebugDump("WebmailAccountManager.js : updateISP"
                                    + err.name +
                                    ".\nError message: "
                                    + err.message + "\n"
                                    + err.lineNumber);
        }
    },





    ///////////////////private functions //////////////////////////////////////
    parseISP : function (dataSource, root)
    {
        try
        {
            this.m_Log.Write("WebmailAccountManager.js - parseISP - START");

            var arcs = dataSource.ArcLabelsOut(root);

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
                        var target = dataSource.GetTarget(root, arc, true);
                        this.m_Log.Write("WebmailAccountManager.js - parseISP - target " + target);

                        try
                        {   //resource
                            target = target.QueryInterface(Components.interfaces.nsIRDFResource);
                            this.m_Log.Write("WebmailAccountManager.js - parseISP - more elements " + target);
                            this.parseISP(dataSource, target);
                        }
                        catch(e)
                        {   //value
                            this.m_Log.Write("WebmailAccountManager.js : parseISP " + e.message);

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
                                dataSource.Change(root, arc, target, port)
                            }
                            else if (szArc.search(/http:\/\/home.netscape.com\/NC-rdf#prettyName/i)!= -1)
                            {
                                var strPrettyName = this.m_ContentBundle.GetStringFromName("prettyName");
                                this.m_Log.Write("WebmailAccountManager.js - parseISP - pretty Name " +strPrettyName);
                                var inServerResource = this.m_rdfService.GetResource( NC_rdf + "incomingServer");
                                var prettyName = this.m_rdfService.GetLiteral(strPrettyName);
                                dataSource.Change(root, arc, target, prettyName)
                            }
                            else if (szArc.search(/http:\/\/home.netscape.com\/NC-rdf#wizardLongName/i)!= -1)
                            {
                                var strWizardLongName = this.m_ContentBundle.GetStringFromName("wizardLongName");
                                this.m_Log.Write("WebmailAccountManager.js - parseISP - wizardLongName " +strWizardLongName);
                                var inServerResource = this.m_rdfService.GetResource( NC_rdf + "incomingServer");
                                var wizardLongName = this.m_rdfService.GetLiteral(strWizardLongName);
                                dataSource.Change(root, arc, target, wizardLongName)
                            }
                            else if (szArc.search(/http:\/\/home.netscape.com\/NC-rdf#wizardShortName/i)!= -1)
                            {
                                var strWizardShortName = this.m_ContentBundle.GetStringFromName("wizardShortName");
                                this.m_Log.Write("WebmailAccountManager.js - parseISP - wizardShortName " +strWizardShortName);
                                var inServerResource = this.m_rdfService.GetResource( NC_rdf + "incomingServer");
                                var wizardShortName = this.m_rdfService.GetLiteral(strWizardShortName);
                                dataSource.Change(root, arc, target, wizardShortName)
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
                                    + err.message + "\n"
                                    + err.lineNumber);
        }
    },



    saveISP : function()
    {
        try
        {
            this.m_Log.Write("WebmailAccountManager.js - loadISP - START");

            var SourceFile =  Components.classes["@mozilla.org/file/directory_service;1"].
                                      createInstance(Components.interfaces.nsIProperties).
                                      get("ProfD", Components.interfaces.nsILocalFile);
            SourceFile.append("extensions");                               //goto profile extension folder
            SourceFile.append("{3c8e8390-2cf6-11d9-9669-0800200c9a66}");  //goto client extension folder
            SourceFile.append("isp");
            SourceFile.append("webmail.rdf");

            var szlocation = Components.classes["@mozilla.org/network/protocol;1?name=file"]
                                                .createInstance(Components.interfaces.nsIFileProtocolHandler)
                                                .getURLSpecFromFile(SourceFile);

            this.m_Log.Write("WebmailAccountManager.js - loadISP - location " +szlocation);

            var dataSource = this.m_rdfService.GetDataSource(szlocation);
            var mainResource = this.m_rdfService.GetResource("urn:webmail");
            this.parseISP(dataSource, mainResource);
            dataSource.QueryInterface(Components.interfaces.nsIRDFRemoteDataSource);
            dataSource.Flush();        //save changes

            this.m_Log.Write("WebmailAccountManager.js - loadISP - END");
        }
        catch(err)
        {
            this.m_Log.DebugDump("WebmailAccountManager.js : loadISP"
                                    + err.name +
                                    ".\nError message: "
                                    + err.message);
        }
    },


    observe: function(aSubject, aTopic, aData)
    {
        this.m_Log.Write("WebmailAccountManager.js - observe - aTopic " + aTopic + " " + aData);
        if(aTopic != "nsPref:changed") return;

        switch (aData)
        {
            case "pop" :
            case "imap":
            case "smtp":
                 this.m_Log.Write("WebmailAccountManager.js - pref change");
                 this.updateISP();
            break;
        }
    }
}
