function AddNamesYahooListItems()
{
    var strbundle = document.getElementById("stringsYahooAbout");
    var szContributors = strbundle.getString("ExtContributorNames");
    var list = document.getElementById("YahooContributorBox");
   
    var aszNames = szContributors.split(";");
    
    for(i =0 ; i< aszNames.length; i++)
    {
        var label = document.createElement("label");
        label.setAttribute("value", aszNames[i]);
        label.setAttribute("class", "YahooContributorText");
        list.appendChild(label);
    }
}
