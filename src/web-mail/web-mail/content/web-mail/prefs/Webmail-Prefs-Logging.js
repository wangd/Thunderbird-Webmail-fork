var gLoggingPane =
{
    m_DebugLog : new DebugLog("webmail.logging.comms",
                              "{3c8e8390-2cf6-11d9-9669-0800200c9a66}",
                              "webmailPrefs"),

    init : function ()
    {
        this.m_DebugLog.Write("Webmail-Prefs-Logging : init - START");

        var chkBox1 = document.getElementById("chkWebmailLogging"); //use logging
        if (chkBox1.checked)
        {
            document.getElementById("labelLoggingFile").disabled = false;
            document.getElementById("txtLoggingFile").disabled = false;
            document.getElementById("buttonLoggingFile").disabled = false;
        }
        else
        {
            document.getElementById("labelLoggingFile").disabled = true;
            document.getElementById("txtLoggingFile").disabled = true;
            document.getElementById("buttonLoggingFile").disabled = true;
        }


        this.m_DebugLog.Write("Webmail-Prefs-Logging : init - END");
    },


    updateBox : function()
    {
        try
        {
            this.m_DebugLog.Write("Webmail-Prefs-Logging : updateBox - START");

            var chkBox1 = document.getElementById("chkWebmailLogging"); //use logging

            if (!chkBox1.checked)
            {
                document.getElementById("labelLoggingFile").disabled = false;
                document.getElementById("txtLoggingFile").disabled = false;
                document.getElementById("buttonLoggingFile").disabled = false;
            }
            else
            {
                document.getElementById("labelLoggingFile").disabled = true;
                document.getElementById("txtLoggingFile").disabled = true;
                document.getElementById("buttonLoggingFile").disabled = true;
            }

            this.m_DebugLog.Write("Webmail-Prefs-Logging : updateBox - END");
            return undefined;
        }
        catch(e)
        {
            this.m_DebugLog.DebugDump("Webmail-Prefs-Logging : Exception in updateBox : "
                                          + e.name +
                                          ".\nError message: "
                                          + e.message + "\n"
                                          + e.lineNumber);
            return false;
        }
    },

    readFolderPref : function ()
    {
        try
        {
            this.m_DebugLog.Write("Webmail-Prefs-Logging : readFolderPref - START");

            this.updateFileField();

            this.m_DebugLog.Write("Webmail-Prefs-Logging : readFolderPref - END");
            return undefined;
        }
        catch(e)
        {
            this.m_DebugLog.DebugDump("Webmail-Prefs-Logging : Exception in readFolderPref : "
                                          + e.name +
                                          ".\nError message: "
                                          + e.message + "\n"
                                          + e.lineNumber);
            return undefined;
        }
    },


    writeFolderPref : function ()
    {
        try
        {
            this.m_DebugLog.Write("Webmail-Prefs-Logging : writeFolderPref - START");

            var folderPref = document.getElementById("fileLocation");
            this.m_DebugLog.Write("Webmail-Prefs-Logging : readFolderPref - folderpref " + folderPref.value);

            this.m_DebugLog.Write("Webmail-Prefs-Logging : writeFolderPref - END");
            return folderPref.value;
        }
        catch(e)
        {
             this.m_DebugLog.DebugDump("Webmail-Prefs-Logging : Exception in writeFolderPref : "
                                          + e.name +
                                          ".\nError message: "
                                          + e.message + "\n"
                                          + e.lineNumber);
            return false;
        }
    },


    browseForFolders : function ()
    {
        try
        {
            this.m_DebugLog.Write("Webmail-Prefs-Logging : browseForFolders - START");

            var nsIFilePicker = Components.interfaces.nsIFilePicker;
            var fp = Components.classes["@mozilla.org/filepicker;1"].createInstance(nsIFilePicker);

            var strbundle=document.getElementById("stringsWebmailPrefs-Log");
            var szFolder=strbundle.getString("BrowseForFolders");
            fp.init(window, szFolder, nsIFilePicker.modeGetFolder);
            var res=fp.show();

            if (res==nsIFilePicker.returnOK)
            {
                var folderPref = document.getElementById("fileLocation");
                folderPref.value = fp.file;

                this.updateFileField();
            }

            this.m_DebugLog.Write("Webmail-Prefs-Logging : browseForFolders END");
            return;
        }
        catch(e)
        {
            this.m_DebugLog.DebugDump("Webmail-Prefs-Servers : Exception in browseForFolders : "
                                          + e.name +
                                          ".\nError message: "
                                          + e.message + "\n"
                                          + e.lineNumber);
        }
    },


    updateFileField : function ()
    {
        try
        {
            this.m_DebugLog.Write("Webmail-Prefs-Logging : updateFileField START");

            var folderPref = document.getElementById("fileLocation");
            var txtLoggingFile = document.getElementById("txtLoggingFile");
            txtLoggingFile.value = folderPref.value;
            txtLoggingFile.label = folderPref.value.path;

            var ios = Components.classes["@mozilla.org/network/io-service;1"].
                                getService(Components.interfaces.nsIIOService);
            var nsFilePro = ios.getProtocolHandler("file").
                                QueryInterface(Components.interfaces.nsIFileProtocolHandler);

            var urlspec = nsFilePro.getURLSpecFromFile(folderPref.value);
            txtLoggingFile.image = "moz-icon://" + urlspec + "?size=16";

            this.m_DebugLog.Write("Webmail-Prefs-Logging : updateFileField END");
        }
        catch(e)
        {
            this.m_DebugLog.DebugDump("Webmail-Prefs-Servers : Exception in updateFileField : "
                                          + e.name +
                                          ".\nError message: "
                                          + e.message + "\n"
                                          + e.lineNumber);
        }
    },
};
