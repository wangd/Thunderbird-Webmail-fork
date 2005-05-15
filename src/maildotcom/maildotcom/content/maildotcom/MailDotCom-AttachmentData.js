function AttachmentData()
{
    this.m_szHeaders= null;
    this.m_szURI = null;
}




AttachmentData.prototype =
{
    setHeaders : function (szHeaders)
    {
        this.m_szHeaders = szHeaders;
    },
    
    getHeaders : function ()
    {
        return this.m_szHeaders
    },
    
    setURI : function (szURI)
    {
        this.m_szURI = szURI;
    },
    
    getURI : function ()
    {
        return this.m_szURI
    },
}
