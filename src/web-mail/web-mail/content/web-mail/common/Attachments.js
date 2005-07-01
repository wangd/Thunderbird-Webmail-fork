function attachments(Log, szHeaders, szBody)
{
    var scriptLoader =  Components.classes["@mozilla.org/moz/jssubscript-loader;1"]
                              .getService(Components.interfaces.mozIJSSubScriptLoader);
        
    scriptLoader.loadSubScript("chrome://web-mail/content/common/Header.js");
    scriptLoader.loadSubScript("chrome://web-mail/content/common/Body.js"); 
    
    this.headers= new headers(Log , szHeaders);
    this.body = new body();
    this.body.setTxtBody(szBody);
}

attachments.prototype.headers = null;

attachments.prototype.body = null;
