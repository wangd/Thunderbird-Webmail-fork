function IMAPMSG()
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
    },
    
    setIndex : function (iIndex)
    {
    },
    
    getHref :function ()
    {
    },
    
    setHref :function (szHref)
    {
    },
    
    getTo :function ()
    {
    },
    
    setTo :function (szTO)
    {
    },
    
    getFrom :function ()
    {
    },
    
    setFrom :function (szFrom)
    {
    },
    
    getSubject :function ()
    {
    },
    
    setSubject :function (szSubject)
    {
    },
    
    getDate :function ()
    {
    },
    
    setDate :function (szDate)
    {
    },
    
    getTime :function ()
    {
    },
    
    setTime :function (szTime)
    {
    },
    
    getRead :function ()
    {   
    },
    
    setRead :function (bRead)
    {
    },
    
    getDelete :function ()
    {   
    },
    
    setDelete :function (bDelete)
    {
    },
    
    getAttach :function ()
    {
    },
    
    setAttach :function (bAttach)
    {
    },
    
    getUID :function ()
    {
    },
    
    setUID :function (iUID)
    {
    },   
    
    getSize :function ()
    {
    },
    
    setSize :function (iSize)
    {
    },   
}

