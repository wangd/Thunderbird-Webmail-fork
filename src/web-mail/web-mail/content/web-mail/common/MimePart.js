function mimePart(szHeaders, szBody)
{
    var scriptLoader =  Components.classes["@mozilla.org/moz/jssubscript-loader;1"];
    scriptLoader = scriptLoader.getService(Components.interfaces.mozIJSSubScriptLoader);
    scriptLoader.loadSubScript("chrome://web-mail/content/common/Header.js");
    scriptLoader.loadSubScript("chrome://web-mail/content/common/Body.js"); 
    
    this.headers= new headers(szHeaders);
    this.body = new body(szBody);
}

mimePart.prototype.headers = null;

mimePart.prototype.body = null;
