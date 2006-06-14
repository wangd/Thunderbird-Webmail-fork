window.addEventListener("load", function() {gHotmailStartUp.init();} , false);

var gHotmailStartUp =
{   
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
