//contains code for error logging using javascript console and sending to file


function DebugLog(szBranch, extGUID , szFileName)
{

    try
    {
        this.ConsoleService = Components.classes["@mozilla.org/consoleservice;1"].
                                 getService(Components.interfaces.nsIConsoleService);

        this.PrefService = Components.classes["@mozilla.org/preferences-service;1"].
                                     getService(Components.interfaces.nsIPrefBranch);

        this.szPrefBranch = szBranch;

        //get UseLog pref
        this.bUseLog = this.PrefService.getBoolPref(this.szPrefBranch + ".UseLog")

        //get UseJSConsole pref
        this.bUseJSConsole = this.PrefService.getBoolPref(this.szPrefBranch + ".UseJSconsole");

        //get UseFile Pref
        this.bUseFile = this.PrefService.getBoolPref(this.szPrefBranch + ".UseFile");

        //log file name
        this.szFileName = szFileName;

        //check logging file location. if location not found create default location
        //get file location
        this.oLogFile = null;

        try
        {
            var oNewFile = this.PrefService.getComplexValue(this.szPrefBranch +".FileLocation",
                                             Components.interfaces.nsILocalFile);

            if (oNewFile instanceof Components.interfaces.nsILocalFile)
            {
                this.oLogFile = Components.classes["@mozilla.org/file/local;1"]
                                   .createInstance(Components.interfaces.nsILocalFile);
                this.oLogFile.initWithFile(oNewFile);
            }
            else
                throw 1;
        }
        catch(e)
        {
            //get user profile folder
            var oNewFile = Components.classes["@mozilla.org/file/directory_service;1"].
                                   createInstance(Components.interfaces.nsIProperties).
                                      get("ProfD", Components.interfaces.nsILocalFile);
            oNewFile.append("extensions");  //goto extension folder
            oNewFile.append(extGUID);       //goto client extension folder
            oNewFile.append("logfiles");       //goto logfiles folder

            //save location
            this.PrefService.setComplexValue(this.szPrefBranch +".FileLocation",
                                             Components.interfaces.nsILocalFile,
                                             oNewFile);
            this.oLogFile = Components.classes["@mozilla.org/file/local;1"]
                                    .createInstance(Components.interfaces.nsILocalFile);

            this.oLogFile.initWithFile(oNewFile);
        }

        //folder exist now create new logging file
        var szTemp = new String();
        if (this.szFileName == null)
        {
            szTemp += "LoggingFile - ";
        }
        else
        {
            szTemp += szFileName;
        }

        var today = new Date();
        szTemp += today.getDate() +"-" + (today.getMonth()+1) + "-" + today.getFullYear();
        szTemp += ".txt";
        delete today;

        this.szPath = this.oLogFile.path;
        this.oLogFile.append(szTemp);

        //check do we need this file
        if (this.bUseFile && this.bUseLog) //create file
        {
            if (!this.oLogFile.exists())
                this.oLogFile.create(Components.interfaces.nsIFile.NORMAL_FILE_TYPE, 420);
        }
    }
    catch(e)
    {
        DebugDump("DebugLog.js : Exception in Constructor "
                                + e.name +
                                ".\nError message: "
                                + e.message);
    }
}



DebugLog.prototype.Write = function(msg)
{
    try
    {
        if(!this.bUseLog) return;  //dont log any messages
        //send log to console
        if (this.bUseJSConsole) this.ConsoleService.logStringMessage(msg);
        //send log to file
        if (this.bUseFile) this.WriteToFile(msg);
        return;
    }
    catch(e)
    {
        DebugDump("DebugLog.js : Exception in Write "
                            + e.name +
                            ".\nError message: "
                            + e.message);
    }
}



//is overrides console options but not file options
DebugLog.prototype.DebugDump = function(msg)
{
    this.ConsoleService.logStringMessage(msg); //send log to console

    if(!this.bUseLog) return;  //dont log any messages

    //send log to file
    if (this.bUseFile) this.WriteToFile(msg);

    return;
}



//write to file
DebugLog.prototype.WriteToFile = function(msg)
{
    try
    {
        var today = new Date();
        //check if file exists
        if (!this.oLogFile.exists())
        {
            if (!this.oLogFile.isFile())  //folder only
                this.oLogFile.append("LoggingFile-"+ today.getTime() +".txt"); //add file name

            //create file
            this.oLogFile.create(Components.interfaces.nsIFile.NORMAL_FILE_TYPE, 420);
        }

        var outputStream = Components.classes["@mozilla.org/network/file-output-stream;1"]
                                      .createInstance( Components.interfaces.nsIFileOutputStream );
        outputStream.init( this.oLogFile, 0x04 | 0x08 | 0x10, 420, 0 );

        var szTempMSG = "";
        var today = new Date();
        szTempMSG += today.toLocaleTimeString();
        szTempMSG += "--";
        szTempMSG += msg;
        delete today;
        if (szTempMSG.lastIndexOf("\r\n") != szTempMSG.length-2) szTempMSG += "\r\n";

        outputStream.write( szTempMSG, szTempMSG.length );
        //outputStream.flush();
        outputStream.close();

        return;
    }
    catch(e)
    {
         DebugDump("DebugLog.js : Exception in WriteToFile "
                    + e.name +
                    ".\nError message: "
                    + e.message);
    }
}



//update prefs has been carried out
DebugLog.prototype.UpdateLog = function ()
{
    try
    {
        //get UseLog pref
        this.bUseLog = this.PrefService.getBoolPref(this.szPrefBranch + ".UseLog");

        //get UseJSConsole pref
        this.bUseJSConsole = this.PrefService.getBoolPref(this.szPrefBranch + ".UseJSconsole");

        //get UseFile Pref
        this.bUseFile = this.PrefService.getBoolPref(this.szPrefBranch + ".UseFile");

        //get folder
         var oNewFile = this.PrefService.getComplexValue(this.szPrefBranch +".FileLocation",
                                                         Components.interfaces.nsILocalFile);
        //compare  old and new file location
        if (this.szPath != oNewFile.path)
        {
            var szTemp = new String();     //construct path
            if (this.szFileName == null)
            {
                szTemp += "LoggingFile - ";
                var today = new Date();
                szTemp += today.getTime();
            }
            else
            {
                szTemp += this.szFileName;
            }

            szTemp += ".txt";
            oNewFile.append(szTemp);


            this.oLogFile = Components.classes["@mozilla.org/file/local;1"]
                                 .createInstance(Components.interfaces.nsILocalFile);
            this.oLogFile.initWithFile(oNewFile);


            //check do we need this file
            if (this.bUseFile && this.bUseLog) //create fille
            {
                if (!this.oLogFile.exists())
                    this.oLogFile.create(Components.interfaces.nsIFile.NORMAL_FILE_TYPE, 420);
            }
        }
    }
    catch(e)
    {
         DebugDump("DebugLog.js : Exception in UpdateLog "
                                + e.name +
                                ".\nError message: "
                                + e.message);
    }
}





//To be used for FUCK UP's only
function DebugDump(msg)
{
    var ConsoleService = Components.classes["@mozilla.org/consoleservice;1"].
                                getService(Components.interfaces.nsIConsoleService);

    ConsoleService.logStringMessage(msg);
}

