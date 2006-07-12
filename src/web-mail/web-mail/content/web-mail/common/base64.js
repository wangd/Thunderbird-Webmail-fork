// Base64
// if encoding/decoding fails, return old content
function base64()
{   
    this.m_hShellService = Components.classes["@mozilla.org/appshell/appShellService;1"].
                                     getService(Components.interfaces.nsIAppShellService);
                                     
    this.m_HiddenWindow = this.m_hShellService.hiddenDOMWindow;
}

base64.prototype.bLineBreak = false;

base64.prototype.iLineBreak = 74;

base64.prototype.encode = function(szMsg)
{
    var szB6Temp = this.m_HiddenWindow.btoa(szMsg);
      
    //check length if geater than 74 char split#
    var szB6MSG = "";
    
    if (this.bLineBreak)
    {
        if (szB6Temp.length < 300) 
            szB6MSG = szB6Temp;
        else
        {  
            for (var i=0; i<szB6Temp.length; i+=this.iLineBreak)
            {
                szB6MSG += szB6Temp.substr(i, this.iLineBreak);
                szB6MSG +=  "\r\n"
            } 
        }
     }
     else
        szB6MSG = szB6Temp;
  
    
    return szB6MSG;
}



base64.prototype.decode = function(szMsg)
{
    return this.m_HiddenWindow.atob(szMsg);
}
