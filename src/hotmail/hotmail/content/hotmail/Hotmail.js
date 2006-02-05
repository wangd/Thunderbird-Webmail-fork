const cszHotmailContentID = "@mozilla.org/HotmailPOP;1";
const cszHotmailSMTPContentID = "@mozilla.org/HotmailSMTP;1";

window.addEventListener("load", function() {gHotmailStartUp.init();} , false);

var gHotmailStartUp =
{   
    m_DomainManager : null,
    m_Log : null,
    m_Timer : null,
                            
    init : function ()
    {
        try
        {     
            //create debug log global 
            this.m_Log = new DebugLog("webmail.logging.comms", 
                                      "{3c8e8390-2cf6-11d9-9669-0800200c9a66}",
                                      "hotmail");
                                            
            this.m_Log.Write("Hotmail.js : init - START");
        
                         
            var iCount = this.windowCount();
            if (iCount >1) 
            {
                this.m_Log.Write("Hotmail.js : - another window - END");
                return;
            }
              
                         
            try
            {
                this.m_DomainManager = Components.classes["@mozilla.org/DomainManager;1"].
                                       getService().
                                       QueryInterface(Components.interfaces.nsIDomainManager);
            }
            catch(err)
            {
                window.removeEventListener("load", function() {gYahooStartUp.init();} , false);
                throw new Error("Domain Manager Not Found");
            }  
           
            this.m_Timer = Components.classes["@mozilla.org/timer;1"]
                                            .createInstance(Components.interfaces.nsITimer); 
            this.m_Timer.initWithCallback(this, 
                                          2000, 
                                          Components.interfaces.nsITimer.TYPE_REPEATING_SLACK);
            
            //convert prefs
            var WebMailPrefAccess = new WebMailCommonPrefAccess();
            var oPref = {Value : null};
            
            if (WebMailPrefAccess.Get("int","hotmail.webdav.iAccountNum",oPref))
            {
                var iAccountNum = oPref.Value;
                this.m_Log.Write("nsHotmail.js - init - convert " + iAccountNum);
                
                if(iAccountNum>0)
                {
                    var szData = null;
                    
                    for (i=0; i<iAccountNum; i++)
                    {
                        this.m_Log.Write("nsHotmail.js - init - converting " + i);
                        WebMailPrefAccess.Get("char","hotmail.webdav.Account."+i,oPref);
                        
                        szData ? szData+="\r" : szData="";
                        szData += oPref.Value;
                        szData +="\n";
                        szData += 1;
                    }
                    
                    if (WebMailPrefAccess.Set("char","hotmail.mode",szData))
                    {
                        this.m_Log.Write("nsHotmail.js - init - deleting old keys");
                        WebMailPrefAccess.DeleteBranch("hotmail.webdav");
                    }
                }
                else
                {
                    this.m_Log.Write("nsHotmail.js - init - deleting old keys");
                    WebMailPrefAccess.DeleteBranch("hotmail.webdav");
                }    
            }
            delete WebMailPrefAccess;
            
            window.removeEventListener("load", function() {gHotmailStartUp.init();} , false);
                    
        	this.m_Log.Write("Hotmail.js : init - END ");
        }
        catch(e)
        {
            this.m_Log.DebugDump("Hotmail.js : Exception in init " 
                                        + e.name + 
                                        ".\nError message: " 
                                        + e.message + "\n"
                                        + e.lineNumber);
        }
    },  
       
        
    notify: function(timer)
    {
        try
        {
            this.m_Log.Write("Hotmail.js : notify -  START");
            
           
            if(!this.m_DomainManager.isReady())
            {
                this.m_Log.Write("Hotmail.js : notify -  db not ready");
                return;
            }    
            timer.cancel();
         
            //get store ids
            this.idCheck("hotmail.com", "pop" ,cszHotmailContentID)
            this.idCheck("hotmail.co.uk","pop" , cszHotmailContentID);
            this.idCheck("msn.co.uk", "pop" ,cszHotmailContentID);
            this.idCheck("msn.com", "pop" ,cszHotmailContentID);
            this.idCheck("hotmail.it", "pop" ,cszHotmailContentID);  
            this.idCheck("hotmail.fr", "pop" ,cszHotmailContentID);
            this.idCheck("hotmail.de", "pop" ,cszHotmailContentID);
            
            this.idCheck("hotmail.com", "smtp" ,cszHotmailSMTPContentID)
            this.idCheck("hotmail.co.uk","smtp" , cszHotmailSMTPContentID);
            this.idCheck("msn.co.uk", "smtp" ,cszHotmailSMTPContentID);
            this.idCheck("msn.com", "smtp" ,cszHotmailSMTPContentID);
            this.idCheck("hotmail.it", "smtp" ,cszHotmailSMTPContentID);  
            this.idCheck("hotmail.fr", "smtp" ,cszHotmailSMTPContentID);
            this.idCheck("hotmail.de", "smtp" ,cszHotmailSMTPContentID)               
            
            this.m_Log.Write("Hotmail.js : notify - END");
        }
        catch(e)
        {
            this.m_Log.DebugDump("Hotmail.js : notify - Exception in notify : " 
                                        + e.name + 
                                        ".\nError message: " 
                                        + e.message+ "\n"
                                        + e.lineNumber);
        }
    },
    
    
    idCheck : function(szDomain, szProtocol, szWantedContentID)
    {
        this.m_Log.Write("Hotmail.js : idCheck - START");
        this.m_Log.Write("Hotmail.js : idCheck - " +szDomain + " "
                                                + szProtocol+ " "
                                                + szWantedContentID);
         
        var szContentID = new Object;
        if (this.m_DomainManager.getDomainForProtocol(szDomain,szProtocol, szContentID))
        {
            this.m_Log.Write("Hotmail.js : idCheck - found");
            if (szContentID.value != szWantedContentID)
            {
                this.m_Log.Write("Hotmail.js : idCheck - wrong id");
                this.m_DomainManager.newDomainForProtocol(szDomain, szProtocol, szWantedContentID);
            }
        }
        else
        {
            this.m_Log.Write("Hotmail.js : idCheck - not found");
            this.m_DomainManager.newDomainForProtocol(szDomain, szProtocol, szWantedContentID);    
        }
        
        this.m_Log.Write("Hotmail.js : idCheck - END");
    },
    
     windowCount : function()
    {
        try
        {
            this.m_Log.Write("Hotmail.js : windowCount - START");
            
            var iWindowCount = 0;
            var winman = Components.classes["@mozilla.org/appshell/window-mediator;1"];
            winman = winman.getService(Components.interfaces.nsIWindowMediator);
            var e = winman.getEnumerator(null);
  
            while (e.hasMoreElements()) 
            {
                var win = e.getNext();
                win.QueryInterface(Components.interfaces.nsIDOMWindowInternal);
                var szValue = win.document.documentElement.getAttribute("id");
                this.m_Log.Write("Hotmail.js : windowCount - "+ szValue);
                
                if (szValue =="messengerWindow")iWindowCount++;   
            }
            
            this.m_Log.Write("Hotmail.js : windowCount - "+ iWindowCount +" END ");
            return iWindowCount;
        }
        catch(e)
        {
            this.m_Log.DebugDump("Hotmail.js : Exception in shutDown " 
                                            + e.name 
                                            + ".\nError message: " 
                                            + e.message);
        }
    },
};
