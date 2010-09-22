// Base64
// parts taken from mozilla code base

function base64()
{
    this.m_hShellService = Components.classes["@mozilla.org/appshell/appShellService;1"].
                                     getService(Components.interfaces.nsIAppShellService);

    this.m_HiddenWindow = this.m_hShellService.hiddenDOMWindow;

    this.m_Timer = Components.classes["@mozilla.org/timer;1"]
                             .createInstance(Components.interfaces.nsITimer);
    this.m_callback= null;
    this.m_parent = null;
    this.m_inStream = null;
    this.m_szOutMSG = "";
    this.m_iCount = 0;
    this.m_iType = 0;
    this.m_kBlockSize = 99999;


    this.m_kBase64chars = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H',   //  0 to  7
                           'I', 'J', 'K', 'L', 'M', 'N', 'O', 'P',   //  8 to 15
                           'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X',   // 16 to 23
                           'Y', 'Z', 'a', 'b', 'c', 'd', 'e', 'f',   // 24 to 31
                           'g', 'h', 'i', 'j', 'k', 'l', 'm', 'n',   // 32 to 39
                           'o', 'p', 'q', 'r', 's', 't', 'u', 'v',   // 40 to 47
                           'w', 'x', 'y', 'z', '0', '1', '2', '3',   // 48 to 55
                           '4', '5', '6', '7', '8', '9', '+', '/' ]; // 56 to 63
}


base64.prototype.bLineBreak = false;

base64.prototype.iLineBreak = 70;

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



base64.prototype.encodeAsync = function (aBytes, callback, parent)
{
    try
    {

        this.m_callback = callback;
        this.m_parent = parent;
        this.m_iType = 0; //encode
        this.m_szOutMSG = "";

        this.m_inStream = this.binaryStream(aBytes);

        this.m_Timer.initWithCallback(this,
                                      50,
                                      Components.interfaces.nsITimer.TYPE_REPEATING_SLACK);
    }
    catch(err)
    {
        return aBytes;
    }
}


base64.prototype.decode = function(szMsg)
{
    return this.m_HiddenWindow.atob(szMsg);
}




base64.prototype.decodeAsync = function(szMsg, callback, parent)
{
    return this.m_HiddenWindow.atob(szMsg);
}


base64.prototype.notify = function (timer)
{
    try
    {

        switch(this.m_iType)
        {
            case 0: //encode
                var iCurrentStream = this.m_inStream.available();
                var iBlock = iCurrentStream > this.m_kBlockSize ? this.m_kBlockSize : iCurrentStream;
                var i=0;
                var buf = new Array(iBlock);
                //buf.length = iBlock;
                buf = this.m_inStream.readByteArray(iBlock);

                while (iBlock>i)
                {
                    this.m_iCount+=3;
                    if (buf.length - i >=3)
                    {
                        var chr1 = buf[i];
                        var chr2 = buf[i+1];
                        var chr3 = buf[i+2];
                        i+=3;
                        var enc1 = chr1 >> 2;
                        var enc2 = ((chr1 & 3) << 4) | (chr2 >> 4);
                        var enc3 = ((chr2 & 15) << 2) | (chr3 >> 6);
                        var enc4 = chr3 & 63;

                        this.m_szOutMSG += this.m_kBase64chars[enc1] +  this.m_kBase64chars[enc2] +
                                           this.m_kBase64chars[enc3] +  this.m_kBase64chars[enc4];

                    }

                    if (this.bLineBreak && (this.m_iCount >= this.iLineBreak))
                    {
                        this.m_szOutMSG +=  "\r\n"
                        this.m_iCount = 0;
                    }

                    if (buf.length - i <=2)
                    {
                        switch (buf.length - i)
                        {
                            case 2:
                               chr1 = buf[i];
                               chr2 = buf[i+1];
                               i+=2;
                               this.m_szOutMSG += this.m_kBase64chars[(chr1>>2) & 0x3F];
                               this.m_szOutMSG += this.m_kBase64chars[((chr1 & 0x03) << 4) | ((chr2 >> 4) & 0x0F)];
                               this.m_szOutMSG += this.m_kBase64chars[((chr2 & 0x0F) << 2)];
                               this.m_szOutMSG += "=";
                            break;

                            case 1:
                               chr1 = buf[i];
                               i+=1;
                               this.m_szOutMSG += this.m_kBase64chars[(chr1>>2) & 0x3F];
                               this.m_szOutMSG += this.m_kBase64chars[(chr1 & 0x03) << 4];
                               this.m_szOutMSG += "==";
                            break;
                        }
                    }

                }


                if (this.m_inStream.available() == 0)
                {
                    timer.cancel();

                    this.m_inStream.close();
                    this.m_inStream = null;

                    this.m_callback( this.m_szOutMSG, this.m_parent );
                    this.m_szOutMSG = null;
                }
            break;
        }
    }
    catch(err)
    {
         timer.cancel();
         this.m_callback(null, this.m_parent );
    }
}



base64.prototype.binaryStream = function (szData)
{
    try
    {
        var file = Components.classes["@mozilla.org/file/directory_service;1"];
        file = file.getService(Components.interfaces.nsIProperties);
        file = file.get("TmpD", Components.interfaces.nsIFile);
        file.append("suggestedName.tmp");
        file.createUnique(Components.interfaces.nsIFile.NORMAL_FILE_TYPE, 420);

        var deletefile = Components.classes["@mozilla.org/uriloader/external-helper-app-service;1"];
        deletefile = deletefile.getService(Components.interfaces.nsPIExternalAppLauncher);
        deletefile.deleteTemporaryFileOnExit(file);

        var outputStream = Components.classes["@mozilla.org/network/file-output-stream;1"];
        outputStream = outputStream.createInstance( Components.interfaces.nsIFileOutputStream );
        outputStream.init( file, 0x04 | 0x08 | 0x10, 420, 0 );

        var binaryStream = Components.classes["@mozilla.org/binaryoutputstream;1"];
        binaryStream = binaryStream.createInstance(Components.interfaces.nsIBinaryOutputStream);
        binaryStream.setOutputStream(outputStream)
        binaryStream.writeBytes( szData, szData.length );
        outputStream.flush();
        binaryStream.flush();
        outputStream.close();
        binaryStream.close();

        var inputStream = Components.classes["@mozilla.org/network/file-input-stream;1"];
        inputStream = inputStream.createInstance(Components.interfaces.nsIFileInputStream);
        inputStream.init(file, 0x01 , 0 , null);

        var binaryStream = Components.classes["@mozilla.org/binaryinputstream;1"];
        binaryStream = binaryStream.createInstance(Components.interfaces.nsIBinaryInputStream);
        binaryStream.setInputStream(inputStream);

        return binaryStream;
    }
    catch(err)
    {
        return null;
    }
}
