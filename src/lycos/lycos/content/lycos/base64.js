// Base64
// if encoding/decoding fails, return old content
function EncBase64(asContent)
{
    var hShellService = Components.classes["@mozilla.org/appshell/appShellService;1"].
                                     getService(Components.interfaces.nsIAppShellService);
    var hHiddenWindow = hShellService.hiddenDOMWindow;
    return hHiddenWindow.btoa(asContent);
  
}
function DecBase64(asContent)
{ 
    var hShellService = Components.classes["@mozilla.org/appshell/appShellService;1"].
                                     getService(Components.interfaces.nsIAppShellService);
    var hHiddenWindow = hShellService.hiddenDOMWindow;
    return hHiddenWindow.atob(asContent);
}

