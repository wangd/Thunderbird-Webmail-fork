var gDomain =
{
    m_DebugLog : new DebugLog("webmail.logging.comms",
                              "{3c8e8390-2cf6-11d9-9669-0800200c9a66}",
                              "MailDotComPrefs"),
    m_Domains : null,

    init : function ()
    {
        try
        {
            this.m_DebugLog.Write("MailDotCom-Prefs-Domains : Init - START");

            this.m_Domains = Components.classes["@mozilla.org/MailDotComDomains;1"].
                             getService().
                             QueryInterface(Components.interfaces.nsIDomains);

            var aszDomains = {value : null};
            var iCount = {value : null };
            if (this.m_Domains.getAllDomains(iCount,aszDomains))
            {
                if (aszDomains.value.length > 0)
                {
                    aszDomains.value.sort();

                    for (var i=0; i<aszDomains.value.length; i++)
                    {
                        this.domainList(aszDomains.value[i]);
                    }
                }
                else
                    this.errorList();
            }
            else
                this.errorList();

            this.m_DebugLog.Write("MailDotCom-Prefs-Domains : Init - END");
        }
        catch(e)
        {
            this.m_DebugLog.DebugDump("MailDotCom-Prefs-Domains : Exception in init : "
                                          + e.name +
                                          ".\nError message: "
                                          + e.message + "\n"
                                          + e.lineNumber);
        }
    },


    domainList : function (szDomain)
    {
        this.m_DebugLog.Write("MailDotCom-Prefs-Domains : domainList - START " +szDomain);

        var list = document.getElementById("listDomain");

        var newItem = document.createElement("richlistitem");
        newItem.setAttribute("id", szDomain);
        newItem.setAttribute("class", "listItemDomain");
        newItem.setAttribute("allowEvents", "true");
        newItem.setAttribute("selected","false");
        newItem.setAttribute("align", "center");

        //image
        var space = document.createElement("spacer")
        space.setAttribute("flex","1");
        var vBoxImage = document.createElement("vbox");
        vBoxImage.setAttribute("id", "boxDomain");
        vBoxImage.appendChild(space);
        var image = document.createElement("image");
        image.setAttribute("id","maildotcomImage");
        vBoxImage.appendChild(image);
        var space1 = document.createElement("spacer")
        space1.setAttribute("flex","1");
        vBoxImage.appendChild(space1);
        newItem.appendChild(vBoxImage);

        //labelDomain
        var labelDomain = document.createElement("label");
        labelDomain.setAttribute("value",szDomain);
        labelDomain.setAttribute("class","domain");
        newItem.appendChild(labelDomain);
        list.appendChild(newItem);

        this.m_DebugLog.Write("MailDotCom-Prefs-Domains : domainList - END");
    },


    errorList : function ()
    {
        this.m_DebugLog.Write("MailDotCom-Prefs-Domains : errorList - START");

        var vBox = document.createElement("vbox");
        vBox.setAttribute("align","center");
        vBox.setAttribute("pack","center");
        vBox.setAttribute("flex","1");

        //image
        var space = document.createElement("spacer")
        space.setAttribute("flex","1");
        vBox.appendChild(space);
        var image = document.createElement("image");
        image.setAttribute("id","imageError");
        vBox.appendChild(image);
        var space1 = document.createElement("spacer")
        space1.setAttribute("flex","1");
        vBox.appendChild(space1);

        var strBundle = document.getElementById("stringsMailDotComDomainWindow");
        var szMSG = strBundle.getString("errorMsg");
        var aszMSG = szMSG.split(/\s/);

        //message
        for (var i=0; i<aszMSG.length; i++)
        {
            var labelMSG = document.createElement("label");
            labelMSG.setAttribute("value",aszMSG[i]);
            labelMSG.setAttribute("class","errorMSG");
            vBox.appendChild(labelMSG);
        }

        var newItem = document.createElement("richlistitem");
        newItem.setAttribute("id", "error");
        newItem.setAttribute("class", "listError");
        newItem.setAttribute("tabIndex",0);
        newItem.setAttribute("allowEvents", "false");
        newItem.setAttribute("selected","false");
        newItem.setAttribute("align", "center");
        newItem.appendChild(vBox);

        var list = document.getElementById("listDomain");
        list.appendChild(newItem);

        this.m_DebugLog.Write("MailDotCom-Prefs-Domains : errorList - END");
    },




    onSelect : function ()
    {
        try
        {
            this.m_DebugLog.Write("MailDotCom-Prefs-Domains : onSelect - START");

            var listView = document.getElementById("listDomain");   //click item
            var iIndex = listView.selectedIndex;
            this.m_DebugLog.Write("MailDotCom-Prefs-Domains : onSelect - iIndex "+iIndex);

            var buttonRemove = document.getElementById("remove");
            buttonRemove.setAttribute("disabled", iIndex!=-1? false : true);

            this.m_DebugLog.Write("MailDotCom-Prefs-Domains : onSelect - END");
            return true;
        }
        catch(e)
        {
            this.m_DebugLog.DebugDump("MailDotCom-Prefs-Domains : Exception in onSelect : "
                                          + e.name +
                                          ".\nError message: "
                                          + e.message + "\n"
                                          + e.lineNumber);
        }

    },



    onAdd : function ()
    {
        try
        {
            this.m_DebugLog.Write("MailDotCom-Prefs-Domains : onAdd - START");
            var oResult = {value : -1};
            var oParam = {szDomain : null};
            window.openDialog("chrome://maildotcom/content/MailDotCom-Prefs-Domains-Add.xul",
                              "Add",
                              "chrome, centerscreen, modal",
                              oParam,
                              oResult);

            this.m_DebugLog.Write("MailDotCom-Prefs-Domains: onAdd oResult.value " + oResult.value);

            if (oResult.value!=-1)
            {
                this.m_DebugLog.Write("MailDotCom-Prefs-Domains : onAdd oParam.szDomain " + oParam.szDomain);
                //add item to list
                if (this.m_Domains.addDomain(oParam.szDomain))
                {
                    //remove error message
                    var listView = document.getElementById("listDomain");
                    var item = listView.getItemAtIndex(0);
                    var szError = item.getAttribute("id");
                    if (szError.search(/error/i)!=-1)
                        listView.removeChild(item);

                    this.domainList(oParam.szDomain);
                }

                var event = document.createEvent("Events");
                event.initEvent("change", false, true);
                document.getElementById("listDomain").dispatchEvent(event);
            }
            this.m_DebugLog.Write("MailDotCom-Prefs-Domains : onAdd - END");
        }
        catch(e)
        {
             this.m_DebugLog.DebugDump("MailDotCom-Prefs-Domains : Exception in onAdd : "
                                          + e.name +
                                          ".\nError message: "
                                          + e.message + "\n"
                                          + e.lineNumber);
        }
    },


    onRemove  : function ()
    {
        try
        {
            this.m_DebugLog.Write("MailDotCom-Prefs-Domains : doRemove - START");

            //get selected item
            var listView = document.getElementById("listDomain");   //click item
            var iIndex = listView.selectedIndex;
            this.m_DebugLog.Write("MailDotCom-Prefs-Domains : doRemove - iIndex "+iIndex);

            //remove for display
            var item = listView.getItemAtIndex(iIndex);
            var szDomain = item.getAttribute("id");
            this.m_DebugLog.Write("MailDotCom-Prefs-Domains : doRemove -  "+szDomain);

            if (this.m_Domains.removeDomain(szDomain))
            {
                this.m_DebugLog.Write("MailDotCom-Prefs-Domains : Removeed -  DB");
                listView.removeChild(item);

                if (listView.getRowCount()>0)
                {
                    if (iIndex>listView.getRowCount()-1)
                        listView.selectedIndex = iIndex-1;  //select one above
                    else
                        listView.selectedIndex = iIndex;
                }
                else
                {
                    document.getElementById("remove").setAttribute("disabled",true);
                    this.errorList();
                }
            }
            var event = document.createEvent("Events");
            event.initEvent("change", false, true);
            document.getElementById("listDomain").dispatchEvent(event);

            this.m_DebugLog.Write("MailDotCom-Prefs-Domains: doRemove - END");
            return true;
        }
        catch(e)
        {
            this.m_DebugLog.DebugDump("Pref-Window : Exception in doRemove : "
                                          + e.name +
                                          ".\nError message: "
                                          + e.message + "\n"
                                          + e.lineNumber);
        }
    },
}
