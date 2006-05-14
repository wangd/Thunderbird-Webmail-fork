function HttpAuthToken()
{
    this.m_szUserName = null;
    this.m_szDomain = null;
    this.m_szToken = null;
}


HttpAuthToken.prototype =
{
    setUserName :function (szUserName)
    {
        this.m_szUserName = szUserName;
    },
    
    getUserName : function ()
    {
        return this.m_szUserName;
    },
    
    
    setDomain : function (szDomain)
    {
        this.m_szDomain = szDomain
    },
    
    getDomain : function ()
    {
        return this.m_szDomain;
    },
    
    
    setToken : function (szToken)
    {
        this.m_szToken = szToken;
    },
    
    
    getToken :function ()
    {
        return this.m_szToken;
    },
}
