// Base64
// if encoding/decoding fails, return old content
function base64()
{   
    this.m_hShellService = Components.classes["@mozilla.org/appshell/appShellService;1"].
                                     getService(Components.interfaces.nsIAppShellService);
                                     
    this.m_HiddenWindow = this.m_hShellService.hiddenDOMWindow;
}



base64.prototype.encode = function(szMsg)
{
    return this.m_HiddenWindow.btoa(szMsg);
}



base64.prototype.decode = function(szMsg)
{
    return this.m_HiddenWindow.atob(szMsg);
}
