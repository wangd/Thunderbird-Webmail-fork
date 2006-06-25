window.addEventListener("load", function() {gMailDotComStartUp.init();} , false);

var gMailDotComStartUp =
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
                                      "maildotcom");
                                            
            this.m_Log.Write("MailDotCom.js : init - START");
        
              
            var iCount = this.windowCount();
            if (iCount >1) 
            {
                this.m_Log.Write("MailDotCom.js : - another window - END");
                return;
            }
                
            window.removeEventListener("load", function() {gMailDotComStartUp.init();} , false);
                    
        	this.m_Log.Write("MailDotCom.js : init - END ");
        }
        catch(e)
        {
            this.m_Log.DebugDump("Lycos.js : Exception in init " 
                                        + e.name + 
                                        ".\nError message: " 
                                        + e.message);
        }
    },  

    
    
    windowCount : function()
    {
        try
        {
            this.m_Log.Write("MailDotCom.js : windowCount - START");
            
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
            
            this.m_Log.Write("MailDotCom.js : windowCount - "+ iWindowCount +" END ");
            return iWindowCount;
        }
        catch(e)
        {
            this.m_Log.DebugDump("MailDotCom.js : Exception in shutDown " 
                                            + e.name 
                                            + ".\nError message: " 
                                            + e.message);
        }
    },
};
