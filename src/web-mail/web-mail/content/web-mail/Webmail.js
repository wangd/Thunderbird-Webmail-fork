window.addEventListener("load",  function () {gWebMail.startUp();}, false);
window.addEventListener("unload", function () {gWebMail.shutDown();},  false);

var gWebMail =
{
    m_Log : null,
    m_AccountWizard : null,
    m_POP : null,
    m_SMTP : null,
    m_IMAP : null,
    m_DomainManager : null,
    m_DataBase : null,
   
    startUp : function ()
    {   
        try
        {
            var scriptLoader =  Components.classes["@mozilla.org/moz/jssubscript-loader;1"];
            scriptLoader = scriptLoader.getService(Components.interfaces.mozIJSSubScriptLoader);
            scriptLoader.loadSubScript("chrome://web-mail/content/common/DebugLog.js");
            scriptLoader.loadSubScript("chrome://web-mail/content/common/CommonPrefs.js");
            scriptLoader.loadSubScript("chrome://web-mail/content/Webmail-AccountManager.js");  
           
            
            //create debug log global 
            this.m_Log = new DebugLog("webmail.logging.comms",
                                      "{3c8e8390-2cf6-11d9-9669-0800200c9a66}", 
                                      "general");
                                        
            this.m_Log.Write("Webmail.js : startUp - START");
    
            var iCount = this.windowCount();
            if (iCount >1) 
            {
                this.m_Log.Write("Webmail.js : shutUp - another window - END");
                return;
            }
                       
            //account wizard
       	    var oPref = new Object();
            oPref.Value = null;
            var  WebMailPrefAccess = new WebMailCommonPrefAccess();
            WebMailPrefAccess.Get("bool","webmail.UseAccountWizard",oPref); 
            this.m_AccountWizard = new WebmailAccountManager();  //create webmail.rdf file
            if (oPref.Value) this.m_AccountWizard.createISP();
   	   
   	        //start  service
            try
        
            {   //create service
            
                if (Components.classes["@mozilla.org/storage/service;1"])
                {
                    this.m_Log.Write("Webmail.js : startUp - SQL components installed");
                    this.m_DataBase =  Components.classes["@mozilla.org/DataBaseManager;1"];
                    this.m_DataBase = this.m_DataBase.getService();
                    this.m_DataBase.QueryInterface(Components.interfaces.nsIDataBaseManager);
                }
                else
                    this.m_Log.Write("Webmail.js : startUp - SQL components NOT installed");
                                
                
                this.m_DomainManager = Components.classes["@mozilla.org/DomainManager;1"];
                this.m_DomainManager = this.m_DomainManager.getService();
                this.m_DomainManager.QueryInterface(Components.interfaces.nsIDomainManager);
                
                this.m_POP = Components.classes["@mozilla.org/POPConnectionManager;1"];
                this.m_POP = this.m_POP.getService();
                this.m_POP.QueryInterface(Components.interfaces.nsIPOPConnectionManager);
                
                WebMailPrefAccess.Get("bool","webmail.bUsePOPServer",oPref); 
                if (oPref.Value) 
                {
                    this.m_Log.Write("Webmail.js : startUp - POP server wanted");
                    if (this.m_POP.Start())
                        this.m_Log.Write("Webmail.js : startUp - pop server started");
                    else
                        this.m_Log.Write("Webmail.js : startUp - pop server not started"); 
                }    
                
                
                this.m_SMTP = Components.classes["@mozilla.org/SMTPConnectionManager;1"];
                this.m_SMTP = this.m_SMTP.getService();
                this.m_SMTP.QueryInterface(Components.interfaces.nsISMTPConnectionManager);
                
                WebMailPrefAccess.Get("bool","webmail.bUseSMTPServer",oPref); 
                if (oPref.Value)
                {
                    this.m_Log.Write("Webmail.js : startUp - SMTP server wanted");
                    if (this.m_SMTP.Start())
                        this.m_Log.Write("Webmail.js : startUp - SMTP server started");
                    else
                        this.m_Log.Write("Webmail.js : startUp - SMTP server not started");                      
                }
                
                
                
                this.m_IMAP = Components.classes["@mozilla.org/IMAPConnectionManager;1"]
                this.m_IMAP = this.m_IMAP.getService();
                this.m_IMAP.QueryInterface(Components.interfaces.nsIIMAPConnectionManager);
                                 
                WebMailPrefAccess.Get("bool","webmail.bUseIMAPServer",oPref); 
                if (oPref.Value)
                {
                    this.m_Log.Write("Webmail.js : startUp - IMAP server wanted");
                    if (this.m_IMAP.Start())
                        this.m_Log.Write("Webmail.js : startUp - IMAP server started");
                    else
                        this.m_Log.Write("Webmail.js : startUp - IMAP server not started");                      
                }
            }
            catch(e)
            {
                this.m_Log.Write("Webmail.js :  Exception in startUp servers " 
                                        + e.name + 
                                        ".\nError message: " 
                                        + e.message);
            }
        
            window.removeEventListener("load",function() {gWebMail.startUp();}, false);
                      
    	    this.m_Log.Write("Webmail.js : startUp - END ");
        }
        catch(e)
        {
            DebugDump("Webmail.js : Exception in startUp " 
                                            + e.name 
                                            + ".\nError message: " 
                                            + e.message);
        }
    },
    
    shutDown : function ()
    {
        try
        {
            this.m_Log.Write("Webmail.js : shutDown - START");
           
            var iCount = this.windowCount();
            if (iCount !=0) 
            {
                this.m_Log.Write("Webmail.js : shutDown - Another window - END");
                return;
            }
            
            if  (this.m_POP) 
            {
                this.m_Log.Write("Webmail.js : shutDown - POP stop");
                this.m_POP.Stop(); //stop pop server
            }
            
            if  (this.m_SMTP) 
            {
                this.m_Log.Write("Webmail.js : shutDown - SMTP stop");
                this.m_SMTP.Stop(); //stop SMTP server
            }
             
            if  (this.m_IMAP) 
            {
                this.m_Log.Write("Webmail.js : shutDown - IMAP stop");
                this.m_IMAP.Stop(); //stop IMAP server
            }      
            
            //account wizard
            this.m_AccountWizard.deleteISP();
               
            this.m_Log.Write("Webmail.js : shutDown - END");
        }
        catch(e)
        {
            this.m_Log.DebugDump("Webmail.js : Exception in shutDown " 
                                            + e.name 
                                            + ".\nError message: " 
                                            + e.message);
        }
    },
    
    windowCount : function()
    {
        try
        {
            this.m_Log.Write("Webmail.js : windowCount - START");
            
            var iWindowCount = 0;
            var winman = Components.classes["@mozilla.org/appshell/window-mediator;1"];
            winman = winman.getService(Components.interfaces.nsIWindowMediator);
            var e = winman.getEnumerator(null);
  
            while (e.hasMoreElements()) 
            {
                var win = e.getNext();
                win.QueryInterface(Components.interfaces.nsIDOMWindowInternal);
                var szValue = win.document.documentElement.getAttribute("id");
                this.m_Log.Write("Webmail.js : windowCount - "+ szValue);
                
                if (szValue =="messengerWindow")iWindowCount++;   
            }
            
            this.m_Log.Write("Webmail.js : windowCount - "+ iWindowCount +" END ");
            return iWindowCount;
        }
        catch(e)
        {
            this.m_Log.DebugDump("Webmail.js : Exception in shutDown " 
                                            + e.name 
                                            + ".\nError message: " 
                                            + e.message);
        }
    },
};
