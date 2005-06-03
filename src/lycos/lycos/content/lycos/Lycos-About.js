function AddNamesLycosListItems()
{
    var strbundle = document.getElementById("stringsLycosAbout");
    var szContributors = strbundle.getString("ExtContributorNames");
    var list = document.getElementById("LycosContributorBox");
   
    var aszNames = szContributors.split(";");
    
    for(i =0 ; i< aszNames.length; i++)
    {
        var hBox = document.createElement("hbox");
        
        var aData = aszNames[i].split("|");
        var szName = aData[0];
        var szNum = -1;
        
        if (aData.length>1) szNum = aData[1];
        
        var flagImage = document.createElement("image");
        flagImage.setAttribute("id", "flagImage");
        flagImage.setAttribute("class", "flag");
        flagImage.setAttribute("value", szNum.toString());
        hBox.appendChild(flagImage);
        
        var label = document.createElement("label");
        label.setAttribute("value",szName); 
        label.setAttribute("class", "LycosContributorText");
        hBox.appendChild(label);
        
        list.appendChild(hBox);
    }
}
