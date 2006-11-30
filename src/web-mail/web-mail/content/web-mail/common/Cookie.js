function User()
{
}

User.prototype.szUser = null;
User.prototype.aData = null;




function Cookie()
{
    this.m_szDomain = null;
    this.m_szCookieValue = null;
    this.m_szCookieName =  null;
    this.m_iExpiry =  -1;
    this.m_szPath = null;
    this.m_bSecure = false;
    this.m_iVersion = -1;
}


Cookie.prototype =
{
    getDomain : function ()
    {
        return this.m_szDomain;
    },

    setDomain : function (szDomain)
    {
        this.m_szDomain = szDomain;
    },



    getName : function ()
    {
        return this.m_szCookieName;
    },

    setName : function (szName)
    {
        this.m_szCookieName = szName;
    },


    getValue : function ()
    {
        return this.m_szCookieValue;
    },

    setValue : function (szValue)
    {
        this.m_szCookieValue = szValue;
    },



    getExpiry : function ()
    {
        return this.m_iExpiry;
    },

    setExpiry : function (szExpiry)
    {
        this.m_iExpiry = szExpiry;
    },



    getPath : function ()
    {
        return this.m_szPath;
    },

    setPath : function (szPath)
    {
        this.m_szPath = szPath;
    },


    getSecure : function ()
    {
        return this.m_bSecure;
    },

    setSecure : function (bSecure)
    {
        this.m_bSecure = bSecure;
    },


    getVersion : function ()
    {
        return this.m_iVersion;
    },

    setVersion : function (iVersion)
    {
        this.m_iVersion= iVersion;
    }
}
