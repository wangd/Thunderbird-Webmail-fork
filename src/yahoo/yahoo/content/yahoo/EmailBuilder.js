function emailBuilder (oLog)
{
    try
    {
        var scriptLoader =  Components.classes["@mozilla.org/moz/jssubscript-loader;1"]
        scriptLoader = scriptLoader.getService(Components.interfaces.mozIJSSubScriptLoader);
        scriptLoader.loadSubScript("chrome://web-mail/content/common/Header.js");
        scriptLoader.loadSubScript("chrome://web-mail/content/common/Body.js");
        scriptLoader.loadSubScript("chrome://web-mail/content/common/MimePart.js");
        scriptLoader.loadSubScript("chrome://web-mail/content/common/base64.js");
        scriptLoader.loadSubScript("chrome://web-mail/content/common/DebugLog.js");

        if (!oLog)
            this.m_Log = new DebugLog("webmail.logging.comms",
                                      "{3c8e8390-2cf6-11d9-9669-0800200c9a66}",
                                      "emailBuilder");
        else    
            this.m_Log = oLog;
            
        this.m_Timer = Components.classes["@mozilla.org/timer;1"]
                                 .createInstance(Components.interfaces.nsITimer); 

        this.m_oHeader = null;
        this.m_aoAttachments = new Array();
        this.m_aoBodyPart = new Array();
        this.m_szBoundary = "";
        this.m_szEmail= null;
        this.m_callback = null;
        this.m_parent = null;
        this.m_szBoundary = "";
    }
    catch(err)
    {
        DebugDump("emailBuilder.js: Constructor : Exception : " + err.name
                                                         + ".\nError message: "
                                                         + err.message  +"\n"
                                                         + err.lineNumber);
    }
}



emailBuilder.prototype.setEnvolpeHeaders = function (szHeader)
{
    try
    {
        this.m_Log.Write("emailBuilder.js - setEnvolpeHeaders - START");
        this.m_Log.Write("emailBuilder.js - setEnvolpeHeaders - szHeader " + szHeader);

        if (this.m_oHeader) delete this.m_oHeader;
        this.m_oHeader = new headers(szHeader);

        this.m_Log.Write("emailBuilder.js - setEnvolpeHeaders - END");
    }
    catch(err)
    {
        this.m_Log.DebugDump("emailBuilder.js: setEnvolpeHeaders : Exception : " + err.name
                                                  + ".\nError message: "
                                                  + err.message + "\n"
                                                  + err.lineNumber);
    }
}



emailBuilder.prototype.addAttachment = function (szHeader, szBody)
{
    try
    {
        this.m_Log.Write("emailBuilder.js - addAttachment - START");
        this.m_Log.Write("emailBuilder.js - addAttachment - szHeader \n" + szHeader + "\nBody \n" + szBody);

        var oPart = new mimePart (szHeader? szHeader : "", szBody);

        this.m_aoAttachments.push(oPart);

        this.m_Log.Write("emailBuilder.js - addAttachment - END");
    }
    catch(err)
    {
        this.m_Log.DebugDump("emailBuilder.js: addAttachment : Exception : " + err.name
                                                  + ".\nError message: "
                                                  + err.message + "\n"
                                                  + err.lineNumber);
    }
}



emailBuilder.prototype.addBody = function (szHeader, szBody)
{
    try
    {
        this.m_Log.Write("emailBuilder.js - addBody - START");
        this.m_Log.Write("emailBuilder.js - addBody - szHeader \n" + szHeader + "\nBody \n" + szBody);

        this.m_aoBodyPart.push( new mimePart (szHeader? szHeader : "", szBody));

        this.m_Log.Write("emailBuilder.js - addBody - END");
        return true;
    }
    catch(err)
    {
        this.m_Log.DebugDump("emailBuilder.js: addBody : Exception : " + err.name
                                                  + ".\nError message: "
                                                  + err.message + "\n"
                                                  + err.lineNumber);
        return false;
    }
}



emailBuilder.prototype.getEmail = function()
{
    this.m_Log.Write("emailBuilder.js - getEmail ");
    return this.m_szEmail;
}



emailBuilder.prototype.buildAsync = function(callback, parent)
{
    try
    {
        this.m_Log.Write("emailBuilder.js - buildAsync - START");
         
        this.m_callback = callback;
        this.m_parent = parent;
                
        this.m_Timer.initWithCallback(this,
                                      5,
                                      Components.interfaces.nsITimer.TYPE_REPEATING_SLACK); 
                                      
        this.m_Log.Write("emailBuilder.js - buildAsync - END");
        return true;
    }
    catch(err)
    {
        this.m_Log.DebugDump("emailBuilder.js: buildAsync : Exception : " + err.name
                                                  + ".\nError message: "
                                                  + err.message + "\n"
                                                  + err.lineNumber);
        return false;
    }
}



emailBuilder.prototype.notify = function (timer)
{
    try
    {
        this.m_Log.Write("emailBuilder.js - notify - START");
        
        timer.cancel();
        
        //construct email headers
        var szContentSubType = this.m_oHeader.getContentType(2);
        this.m_Log.Write("emailBuilder.js - " + szContentSubType + " " + this.m_aoBodyPart.length);
        if (this.m_aoBodyPart.length == 1  &&
            szContentSubType.search(/alternative/i)!=-1 || 
            szContentSubType.search(/related/i)!=-1  ) 
        {   //something's wrong with the header only one body part found 
            this.m_Log.Write("emailBuilder.js - Wrong subtype header found");
            this.m_szEmail = this.headers(this.m_oHeader.getAllHeadersArray(),
                                          this.m_aoBodyPart[0].headers.getHeader("Content-Type"));          
        }
        else
            this.m_szEmail = this.headers(this.m_oHeader.getAllHeadersArray(), null);  
        
        
        if (this.m_aoAttachments.length==0) //no attachments
        {
            this.m_Log.Write("emailBuilder.js - build -  simple email");
            
            //message body
            if (this.m_aoBodyPart.length == 1) //ONE part only
            {
                this.m_Log.Write("emailBuilder.js - build - simple body ");  
                this.m_szEmail += this.m_aoBodyPart[0].body.getBody();
            }
            else // alternative body parts
            {
                this.m_Log.Write("emailBuilder.js - build - complex body "); 
                
                this.m_szEmail += "This is a multi-part message in MIME format built by the Yahoo extension.\r\n";
                
                //get body bounday 
                this.m_szBoundary = this.m_oHeader.getContentType(3);
                this.m_Log.Write("emailBuilder.js - build - szBoundary " + this.m_szBoundary);
                              
                for (var i = 0; i < this.m_aoBodyPart.length; i++) 
                {
                    this.m_szEmail += "\r\n--" + this.m_szBoundary + "\r\n";
                    this.m_szEmail += this.headers(this.m_aoBodyPart[i].headers.getAllHeadersArray());
                    this.m_szEmail += this.m_aoBodyPart[i].body.getBody();
                }
                
                this.m_szEmail += "\r\n--"+ this.m_szBoundary + "--\r\n\r\n"
            }                
            this.m_szEmail  = this.correctForSending(this.m_szEmail);
            
            //call callback
            this.m_callback( this.m_parent );
        }
        else //has attachments
        {
            this.m_Log.Write("emailBuilder.js - build - email with attachments "); 
            
            this.m_szEmail +="This is a multi-part message in MIME format built by the Yahoo extension.\r\n";
            
            //get body bounday 
            this.m_szBoundary = this.m_oHeader.getContentType(3);
            this.m_Log.Write("emailBuilder.js - build - szBoundary " +this.m_szBoundary);
                    
            if (this.m_aoBodyPart.length == 1) //simple body
            {
                this.m_Log.Write("emailBuilder.js - build - simple body ");
                this.m_szEmail += "\r\n--" +this.m_szBoundary+"\r\n";
                this.m_szEmail += this.headers(this.m_aoBodyPart[0].headers.getAllHeadersArray()); //construct email headers
                this.m_szEmail += this.m_aoBodyPart[0].body.getBody();
            }
            else //complex body 
             {
                this.m_Log.Write("emailBuilder.js - build - complex body "); 
                
                this.m_szEmail += "\r\n--" + this.m_szBoundary + "\r\n";
                this.m_szEmail += "Content-Type: multipart/alternative; boundary=\"" + this.m_szBoundary+ "=MULTPART\"\r\n";

                for (var i = 0; i < this.m_aoBodyPart.length; i++) 
                {
                    this.m_szEmail += "\r\n--" + this.m_szBoundary + "=MULTPART\r\n";
                    this.m_szEmail += this.headers(this.m_aoBodyPart[i].headers.getAllHeadersArray());
                    this.m_szEmail += this.m_aoBodyPart[i].body.getBody();
                }
                
                this.m_szEmail += "\r\n--"+ this.m_szBoundary + "=MULTPART--";
            }  
            
            this.m_szEmail += "\r\n--"+ this.m_szBoundary + "\r\n";
            
            //get attachments
            var attach = this.m_aoAttachments.pop();
            this.m_szEmail += this.headers(attach.headers.getAllHeadersArray());
            
            var oB64 = new base64();
            oB64.bLineBreak = true;
            oB64.encodeAsync(attach.body.getBody(), 
                             this.processAttachmentsCallback, 
                             this);
        }
             
        this.m_Log.Write("emailBuilder.js - notify - END");
    }
    catch(err)
    {
        this.m_Log.DebugDump("emailBuilder.js: notify : Exception : " + err.name
                                                  + ".\nError message: "
                                                  + err.message + "\n"
                                                  + err.lineNumber);
         timer.cancel();
         this.m_szEmail = null;
         this.m_callback(this.m_parent );
    }
}



emailBuilder.prototype.headers = function(aHeaders, szContentType)
{
    try 
    {
        this.m_Log.Write("emailBuilder.js - headers - START " + szContentType);
        var szHeaders = "";
        for (var i =0; i<aHeaders.length; i++)
        {
            var szName = aHeaders[i].szName;
            var szValue ="";
            this.m_Log.Write("emailBuilder.js - Headers - szName "+ szName);
            
            szHeaders += szName;
            szHeaders += ": ";
            if (szName.search(/Content-Type/i)!=-1 && szContentType!=null )
                szValue = szContentType;
            else
                szValue = aHeaders[i].szValue;
            this.m_Log.Write("emailBuilder.js - Headers - szValue "+ szValue);

            szHeaders += szValue;
            szHeaders += "\r\n";
        }
        szHeaders +="\r\n";
        
        this.m_Log.Write("emailBuilder.js - headers - END " + szHeaders);
        return szHeaders;
    } 
    catch (err) 
    {
        this.m_Log.DebugDump("emailBuilder.js: notify : Exception : " + err.name
                                          + ".\nError message: "
                                          + err.message + "\n"
                                          + err.lineNumber);
        return null;
    }
}



emailBuilder.prototype.correctForSending = function (szRawEmail)
{
    try
    {
        var szEmail=""
        szEmail = szRawEmail.replace(/^\./mg,"..");    //bit padding       
        var iMsgLength = szEmail.length-1;
        var iLastIndex = szEmail.lastIndexOf("\n")
        szEmail += "\r\n.\r\n";  //msg end  
        return szEmail; 
    }
    catch(e)
    {
        return null;
    } 
}



emailBuilder.prototype.processAttachmentsCallback = function(szMSG, mainObject)
{
    try
    {
        mainObject.m_Log.Write("emailBuilder.js: processAttachmentsCallback - START");
        
        mainObject.m_szEmail += szMSG; 
        if (mainObject.m_aoAttachments.length ==0)
        {
            mainObject.m_szEmail += "\r\n--"+ mainObject.m_szBoundary + "--\r\n\r\n"
            mainObject.m_szEmail = mainObject.correctForSending(mainObject.m_szEmail);
            mainObject.m_callback(mainObject.m_parent );
        }
        else
        {           
            mainObject.m_szEmail += "\r\n--"+ mainObject.m_szBoundary + "\r\n"  
            
            var attach = mainObject.m_aoAttachments.pop();
            mainObject.m_szEmail += mainObject.headers(attach.headers.getAllHeadersArray());
            
            var oB64 = new base64();
            oB64.bLineBreak = true;
            oB64.encodeAsync(attach.body.getBody(), 
                             mainObject.processAttachmentsCallback, 
                             mainObject);
        }
        
        mainObject.m_Log.Write("emailBuilder.js: processAttachmentsCallback - END");
    }
    catch(err)
    {
        mainObject.m_Log.DebugDump("emailBuilder.js: processAttachmentsCallback : Exception : " + err.name
                                          + ".\nError message: "
                                          + err.message + "\n"
                                          + err.lineNumber);
    }
}