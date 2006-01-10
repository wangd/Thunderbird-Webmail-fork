var gHotmailModeEdit = 
{
    m_strBundle : null,
    m_szAddress : null,
    m_iMode : -1,
           
    init: function ()
    {
        try
        {
            this.m_Log = new DebugLog("webmail.logging.comms", 
                                      "{3c8e8390-2cf6-11d9-9669-0800200c9a66}",
                                      "hotmailPrefs");
            this.m_Log.Write("Hotmail-Mode : init - START");
              
            this.m_szAddress = window.arguments[0];
            this.m_iMode= window.arguments[1]; 
            this.m_Log.Write("Hotmail-Mode : init - address " + this.m_szAddress + " mode " + this.m_iMode);
            
            document.getElementById("labelAddress").setAttribute("value",this.m_szAddress);
            document.getElementById("radiogroupMode").selectedIndex = this.m_iMode;
            
            this.m_Log.Write("Hotmail-Mode : init - END");   
            return true;
        }
        catch(err)
        {
             DebugDump("Hotmail-Mode : Exception in init : " 
                                                           + err.name 
                                                           + ".\nError message: " 
                                                           + err.message + "\n"
                                                           + err.lineNumber);
        }
    },


     
    doOk : function ()
    {
        this.m_Log.Write("Hotmail-Mode: doOK - START");
        
        window.arguments[2].value = document.getElementById("radiogroupMode").selectedIndex;
        window.close();
        
        this.m_Log.Write("Hotmail-Mode : doOK - END");
        return true;
    },

     
    doCancel: function ()
    {
        this.m_Log.Write("Hotmail-Mode : doCancel - START");
        
        window.arguments[2].value = -1;
        window.close();
        
        this.m_Log.Write("Hotmail-Mode : doCancel - END");
        return true;
    },

};
