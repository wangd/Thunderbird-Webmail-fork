function AddNamesListItems()
{
    var strbundle = document.getElementById("stringsHotmailAbout");
    var szContributors = strbundle.getString("ExtContributorNames");
    var list = document.getElementById("HotmailContributorBox");
   
    var aszNames = szContributors.split(";");
    
    for(i =0 ; i< aszNames.length; i++)
    {
        var label = document.createElement("label");
        label.setAttribute("value", aszNames[i]);
        label.setAttribute("class", "HotmailContributorText");
        list.appendChild(label);
    }
}
