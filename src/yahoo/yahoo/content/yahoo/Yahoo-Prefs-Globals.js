var gPrefGlobals =
{
    m_DebugLog : new DebugLog("webmail.logging.comms", 
                              "{3c8e8390-2cf6-11d9-9669-0800200c9a66}",
                              "YahooPrefs"),
                   
    init : function()
    {
        try
        {
            this.m_DebugLog.Write("Yahoo-Pref-Globals : Init - START");
    
            //get defaults
            var WebMailPrefAccess = new WebMailCommonPrefAccess();
            var oPref = {Value : null};
            
            WebMailPrefAccess.Get("bool","yahoo.bReUseSession",oPref);
            this.m_DebugLog.Write("Yahoo-Pref-Globals : Init - bReUseSession "+oPref.Value);
            document.getElementById("chkReUseSession").setAttribute("checked", oPref.Value);
            
            oPref.Value = null;
            WebMailPrefAccess.Get("bool","yahoo.bUseShortID",oPref);
            this.m_DebugLog.Write("Yahoo-Pref-Globals : Init - bUseShortID "+oPref.Value);
            document.getElementById("chkShortID").setAttribute("checked", oPref.Value);
            
            this.m_DebugLog.Write("Yahoo-Pref-Globals : Init - END");
        }
        catch(e)
        {
             this.m_DebugLog.DebugDump("Yahoo-Pref-Globals : Exception in init : " 
                                          + e.name + 
                                          ".\nError message: " 
                                          + e.message + "\n"
                                          + e.lineNumber);
        }
    },
    
     
    save : function ()
    {
        try
        {
            this.m_DebugLog.Write("Yahoo-Pref-Globals : onOK - START");
           
            var WebMailPrefAccess = new WebMailCommonPrefAccess();
            
            var bShortID = document.getElementById("chkShortID").getAttribute("checked");           
            WebMailPrefAccess.Set("bool","yahoo.bUseShortID",bShortID? true: false);
            this.m_DebugLog.Write("Yahoo-Pref-Globals.js - onOK - bShortID " + bShortID);
            
            var bReUseSession = document.getElementById("chkReUseSession").getAttribute("checked");
            WebMailPrefAccess.Set("bool","yahoo.bReUseSession",bReUseSession? true: false);
            this.m_DebugLog.Write("Yahoo-Pref-Globals.js - onOK - bReUseSession " + bReUseSession);
            
            this.m_DebugLog.Write("Yahoo-Pref-Globals : onOK - END");
        }
        catch(e)
        {
            this.m_DebugLog.DebugDump("Yahoo-Pref-Globals : Exception in onOK : " 
                                          + e.name + 
                                          ".\nError message: " 
                                          + e.message + "\n"
                                          + e.lineNumber);
        }
    }
}
