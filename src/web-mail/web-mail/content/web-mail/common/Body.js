function body(szBody)
{
    this.m_szBody = szBody; 
}

body.prototype.setBody = function (szBody)
{
    this.m_szBody = szBody;
}


body.prototype.getBody = function ()
{
    return (!this.m_szBody) ? "" : this.m_szBody;
}
