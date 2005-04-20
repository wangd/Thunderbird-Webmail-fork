function Msg()
{
    try
    {     
        var scriptLoader =  Components.classes["@mozilla.org/moz/jssubscript-loader;1"]
                                  .getService(Components.interfaces.mozIJSSubScriptLoader);
        if (scriptLoader)
        {
            scriptLoader.loadSubScript("chrome://web-mail/content/common/DebugLog.js");
        }
        
        this.m_szHref = null;
        this.m_iUID = -1;
        this.m_szTo = null;
        this.m_szFrom = null;
        this.m_szSubject = null;
        this.m_szDate = null;
        this.m_szTime = null;
        this.m_bRead = false;
        this.m_bDelete = false;
        this.m_bAttchment = false;       
        this.m_iIndex = -1;
        this.m_iSize = -1;
    }
    catch(e)
    {
         DebugDump("MSG.js: Constructor : Exception : " 
                                      + e.name 
                                      + ".\nError message: " 
                                      + e.message);
    }
}


Msg.prototype =
{
    getIndex : function ()
    {
        return this.m_iIndex;
    },
    
    setIndex : function (iIndex)
    {
        this.m_iIndex = iIndex;   
    },
    
    getHref :function ()
    {
        return this.m_szHref;
    },
    
    setHref :function (szHref)
    {
        this.m_szHref = szHref
    },
    
    getTo :function ()
    {
        return this.m_szTo;
    },
    
    setTo :function (szTO)
    {
        this.m_szTo = szTO; 
    },
    
    getFrom :function ()
    {
        return this.m_szFrom;
    },
    
    setFrom :function (szFrom)
    {
        this.m_szFrom = szFrom;
    },
    
    getSubject :function ()
    {
        return this.m_szSubject;
    },
    
    setSubject :function (szSubject)
    {
        this.m_szSubject = szSubject;
    },
    
    getDate :function ()
    {
        return this.m_szDate;
    },
    
    setDate :function (szDate)
    {
        this.m_szDate = szDate;
    },
    
    getTime :function ()
    {
        return this.m_szTime; 
    },
    
    setTime :function (szTime)
    {
        this.m_szTime = szTime;
    },
    
    
    getRead :function ()
    {   
        return this.m_bRead;
    },
    
    setRead :function (bRead)
    {
        this.m_bRead = bRead;
    },
    
    
    getDelete :function ()
    {   
        return this.m_bDelete;
    },
    
    
    setDelete :function (bDelete)
    {
        this.m_bDelete = bDelete;
    },
    
    
    getAttach :function ()
    {
        return this.m_bAttchment;
    },
    
    setAttach :function (bAttach)
    {
        this.m_bAttchment = bAttach;
    },
    
    getUID :function ()
    {
        return this.m_iUID;
    },
    
    setUID :function (iUID)
    {
        this.m_iUID = iUID;
    },   
    
    getSize :function ()
    {
        return this.m_iSize;
    },
    
    setSize :function (iSize)
    {
        this.m_iSize = iSize;
    },   
}
