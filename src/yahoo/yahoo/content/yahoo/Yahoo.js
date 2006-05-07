window.addEventListener("load", function() {gYahooStartUp.init();} , false);

var gYahooStartUp =
{   
    m_Log : null,
                        
    init : function ()
    {
        try
        {     
            //create debug log global 
            this.m_Log = new DebugLog("webmail.logging.comms", 
                                      "{3c8e8390-2cf6-11d9-9669-0800200c9a66}",
                                      "yahoo");
                                            
            this.m_Log.Write("Yahoo.js : YahooStartUp - START");
        
            var iCount = this.windowCount();
            if (iCount >1) 
            {
                this.m_Log.Write("Yahoo.js : - another window - END");
                return;
            }
              
            window.removeEventListener("load", function() {gYahooStartUp.init();} , false);
        
            this.updatePrefs();
                                    
        	this.m_Log.Write("Yahoo.js : YahooStartUP - END ");
        }
        catch(e)
        {
            this.m_Log.DebugDump("Yahoo.js : Exception in YahooStartUp " 
                                        + e.name + 
                                        ".\nError message: " 
                                        + e.message);
        }
    },  
       
        
  
    windowCount : function()
    {
        try
        {
            this.m_Log.Write("Yahoo.js : windowCount - START");
            
            var iWindowCount = 0;
            var winman = Components.classes["@mozilla.org/appshell/window-mediator;1"];
            winman = winman.getService(Components.interfaces.nsIWindowMediator);
            var e = winman.getEnumerator(null);
  
            while (e.hasMoreElements()) 
            {
                var win = e.getNext();
                win.QueryInterface(Components.interfaces.nsIDOMWindowInternal);
                var szValue = win.document.documentElement.getAttribute("id");
                this.m_Log.Write("Yahoo.js : windowCount - "+ szValue);
                
                if (szValue =="messengerWindow")iWindowCount++;   
            }
            
            this.m_Log.Write("Yahoo.js : windowCount - "+ iWindowCount +" END ");
            return iWindowCount;
        }
        catch(e)
        {
            this.m_Log.DebugDump("Yahoo.js : Exception in shutDown " 
                                            + e.name 
                                            + ".\nError message: " 
                                            + e.message);
        }
    },
    
    
    updatePrefs : function ()
    {
        try
        {
            this.m_Log.Write("Yahoo.js : updatePrefs - START ");
            
            var oPref = {Value:null};
            var  WebMailPrefAccess = new WebMailCommonPrefAccess();
            
            WebMailPrefAccess.Get("bool","yahoo.bDownloadUnread",oPref);
            var bDefaultUnread = oPref.Value;
            this.m_Log.Write("Yahoo.js : updatePrefs - bDefaultUnread "+bDefaultUnread);
            oPref.Value = null;
            
            WebMailPrefAccess.Get("bool","yahoo.bSaveCopy",oPref);
            var bDefaultSentItems = oPref.Value;
            this.m_Log.Write("Yahoo.js : updatePrefs - bDefaultSentItems "+bDefaultSentItems);
            oPref.Value = null;
                
            WebMailPrefAccess.Get("char","yahoo.szFolders",oPref);
            if (oPref.Value)
            {                       
                var aszUsers =oPref.Value.split("\n");
                this.m_Log.Write("Yahoo.js : updatePrefs - aszUsers " + aszUsers);
                var iCount = 0;
                for (i=0;i<aszUsers.length-1 ; i++)
                {
                    this.m_Log.Write("Yahoo.js : updatePrefs - aszUsers " + aszUsers[i]);
                    var aszFolders = aszUsers[i].split("\r");
        
                    //user name
                    WebMailPrefAccess.Set("char","yahoo.Account."+i+".user",aszFolders[0]);                
        
                    //spam
                    WebMailPrefAccess.Set("bool","yahoo.Account."+i+".bUseJunkMail",aszFolders[2]);
                    
                    //unread
                    WebMailPrefAccess.Set("bool","yahoo.Account."+i+".bDownloadUnread",bDefaultUnread);
                    
                    //sent items 
                    WebMailPrefAccess.Set("bool","yahoo.Account."+i+".bSaveCopy",bDefaultSentItems); 
                    
                    //custom folders
                    var szFolders = "";    
                    if (aszFolders.length>3)             
                    {
                        for (j=3; j<aszFolders.length; j++)
                        {
                            szFolders += aszFolders[j];
                            if (j!=aszFolders.length-1) szFolders += "\r";
                            this.m_Log.Write("Yahoo.js : updatePrefs - aszFolders[j] " + aszFolders[j]);
                        }
                        this.m_Log.Write("Pref-Window.js - onOK - szFolders " + szFolders);
                    }
                    WebMailPrefAccess.Set("char","yahoo.Account."+i+".szFolders",szFolders);
                    iCount++;               
                }
                WebMailPrefAccess.Set("int","yahoo.Account.Num", iCount);
                WebMailPrefAccess.DeleteBranch("yahoo.szFolders");
            }
            this.m_Log.Write("Yahoo.js : updatePrefs - END ");
        }
        catch(e)
        {
            this.m_Log.DebugDump("Yahoo.js : Exception in updatePrefs " 
                                            + e.name 
                                            + ".\nError message: " 
                                            + e.message + "\n"
                                            + e.lineNumber);
        }
    },
};
