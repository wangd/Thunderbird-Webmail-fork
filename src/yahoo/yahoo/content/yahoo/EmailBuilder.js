function emailBuilder ()
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
        
        this.m_Log = new DebugLog("webmail.logging.comms", 
                                  "{3c8e8390-2cf6-11d9-9669-0800200c9a66}",
                                  "emailBuilder"),
                                  
        this.m_oHeader = null;
        this.m_aoBodyPart = new Array();
        this.m_bHTML = false;
        this.m_bPlain = false;
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


emailBuilder.prototype.addBody = function (szHeader, szBody)
{
    try
    {
        this.m_Log.Write("emailBuilder.js - addBody - START");
        this.m_Log.Write("emailBuilder.js - addBody - szHeader \n" + szHeader + "\nBody \n" + szBody);
        
        var oPart = new mimePart (szHeader? szHeader : "", szBody);
        //get type
        if (szHeader)
        {
            if (!oPart.headers.getContentDisposition(1))  //not file
            {
                this.m_Log.Write("emailBuilder.js - addBody - not file");
                var szSubType = oPart.headers.getContentType(2);
                if (szSubType.search(/plain/,i)!=-1)
                {
                    this.m_Log.Write("emailBuilder.js - addBody - plain");
                    this.m_bPlain = true;
                }
                else if (szSubType.search(/html/,i)!=-1)
                {
                    this.m_Log.Write("emailBuilder.js - addBody - html");
                    this.m_bHTML = true;
                }
            }
        }
        
        this.m_aoBodyPart.push(oPart);
        
        this.m_Log.Write("emailBuilder.js - addBody - END"); 
    }
    catch(err)
    {
        this.m_Log.DebugDump("emailBuilder.js: addBody : Exception : " + err.name 
                                                  + ".\nError message: " 
                                                  + err.message + "\n"
                                                  + err.lineNumber);
    }
}


emailBuilder.prototype.build = function ()
{
    try
    {
        this.m_Log.Write("emailBuilder.js - build - START");
        
        var szEmail = "";
        szEmail += this.m_oHeader.getAllHeaders();
        
        if (this.m_aoBodyPart.length==1) //only one part
        {//html or plain
            this.m_Log.Write("emailBuilder.js - build - plain or html part only");
            szEmail += this.m_aoBodyPart[0].body.getBody();
        }
        else  //muilt part email
        {
            szEmail += "This email was created By Yahoo Webmail Extension\r\n";
              
            var szBaseBoundary = this.m_oHeader.getContentType(3); //get boundary
            var szStartBoundary = "\r\n--" + szBaseBoundary + "\r\n";
            var szEndBoundary = "\r\n--" + szBaseBoundary + "--\r\n\r\n";
            
            //is this alternative only
            var szSubType = this.m_oHeader.getContentType(2);
            if (szSubType.search(/alternative/,i)!=-1)
            {
                this.m_Log.Write("emailBuilder.js - build - plain and html part");
                
                for (var i=0; i<this.m_aoBodyPart.length; i++)
                {
                    szEmail += szStartBoundary;
                    szEmail += this.m_aoBodyPart[i].headers.getAllHeaders();
                    szEmail += this.m_aoBodyPart[i].body.getBody();
                }  
                szEmail += szEndBoundary;
            }
            else //mixed 
            {                
                //alternative 
                if (this.m_bHTML && this.m_bPlain)
                {
                    this.m_Log.Write("emailBuilder.js - build - mixed part with alternative");
                    
                    szEmail += szStartBoundary;
                    var szAltBoundary = "--AltPartYExt080703070009060604010001"
                    var szStartAltBoundary = "\r\n--"+szAltBoundary + "\r\n";
                    var szEndAltBoundary = "\r\n--"+szAltBoundary + "--\r\n\r\n";
                    szEmail += "Content-Type: multipart/alternative; boundary=\"" +szAltBoundary +"\"\r\n\r\n\r\n";
                    
                    var aTemp = new Array()
                    aTemp = aTemp.concat(this.m_aoBodyPart);
                    
                    var i =0;
                    var iLength = aTemp.length;
                    do
                    {
                        var oData =  aTemp.shift();
                        if (!oData.headers.getContentDisposition(1))  //is this a file?
                        {
                            this.m_Log.Write("emailBuilder.js - build - text or html part found");  
                            szEmail += szStartAltBoundary;
                            szEmail += oData.headers.getAllHeaders();
                            szEmail += oData.body.getBody();   
                        }
                        else
                            aTemp.push(oData);
                            
                        i++;
                    }while(i!=iLength);
                    szEmail +=szEndAltBoundary;
                    
                    for (var i=0; i<aTemp.length; i++)
                    {
                        szEmail += szStartBoundary;
                        szEmail += aTemp[i].headers.getAllHeaders();
                        szEmail += aTemp[i].body.getBody();
                    }
                    szEmail += szEndBoundary;
                    delete aTemp;
                }  
                else //mixed
                {
                    this.m_Log.Write("emailBuilder.js - build - mixed part");
                    for (var i=0; i<this.m_aoBodyPart.length; i++)
                    {
                        szEmail += szStartBoundary;
                        szEmail += this.m_aoBodyPart[i].headers.getAllHeaders();
                        szEmail += this.m_aoBodyPart[i].body.getBody();
                    }
                     
                    szEmail += szEndBoundary;
                }
            }
        }
        this.m_Log.Write("emailBuilder.js - build - szEmail " +szEmail );
        this.m_Log.Write("emailBuilder.js - build - END"); 
        return szEmail;
    }
    catch(err)
    {
        this.m_Log.DebugDump("emailBuilder.js: build : Exception : " + err.name 
                                                  + ".\nError message: " 
                                                  + err.message + "\n"
                                                  + err.lineNumber);
    }
}
