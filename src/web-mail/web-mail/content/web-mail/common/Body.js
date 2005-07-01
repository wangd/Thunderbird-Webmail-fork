function body()
{
    this.szHtmlBody = null; 
    this.szTxtBody = null;   
}


body.prototype.setHtmlBody = function (szHtmlBody)
{
    this.szHtmlBody = szHtmlBody;
}


body.prototype.setTxtBody = function (szTxtBody)
{
    this.szTxtBody = szTxtBody;
}



//0 = plain txt
//1 = html
body.prototype.getBody = function (iType)
{
    try
    {
        if (iType == 0) return (!this.szTxtBody) ? null : this.szTxtBody;  
        if (iType == 1) return (!this.szHtmlBody)? null : this.szHtmlBody;      
    }
    catch(err)
    {
        return null;
    }
}

