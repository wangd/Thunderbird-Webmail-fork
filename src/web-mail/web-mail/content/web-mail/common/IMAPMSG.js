function IMAPMSG(errorLog)
{
    try
    {     
        var scriptLoader =  Components.classes["@mozilla.org/moz/jssubscript-loader;1"]
                                  .getService(Components.interfaces.mozIJSSubScriptLoader);
        scriptLoader.loadSubScript("chrome://web-mail/content/common/DebugLog.js");
        
        
    }
    catch(e)
    {
         DebugDump("MSG.js: Constructor : Exception : " 
                                      + e.name 
                                      + ".\nError message: " 
                                      + e.message);
    }
}


IMAPMSG.prototype =
{
    setUserName : function(szUserName)
    {
        
    },
    
    setUserId : function(iUserId)
    {
    },
    
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

