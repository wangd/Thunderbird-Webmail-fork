function AddNamesLycosListItems()
{
    var strbundle = document.getElementById("stringsLycosAbout");
    var szContributors = strbundle.getString("ExtContributorNames");
    var list = document.getElementById("LycosContributorBox");
   
    var aszNames = szContributors.split(";");
    
    for(i =0 ; i< aszNames.length; i++)
    {
        var label = document.createElement("label");
        label.setAttribute("value", aszNames[i]);
        label.setAttribute("class", "LycosContributorText");
        list.appendChild(label);
    }
}
