function AddNamesYahooListItems()
{
    var strbundle = document.getElementById("stringsYahooAbout");
    var szContributors = strbundle.getString("ExtContributorNames");
    var list = document.getElementById("YahooContributorBox");
   
    var aszNames = szContributors.split(";");
    
    
     for(i =0 ; i< aszNames.length; i++)
    {
        var hBox = document.createElement("hbox");
        
        var aData = aszNames[i].split("|");
        var szName = aData[0];
        var szNum = -1;
        try
        {
            szNum = aData[1];
        }
        catch(e)
        {
            szNum = -1;
        }
        
        
        var flagImage = document.createElement("image");
        flagImage.setAttribute("id", "flagImage");
        flagImage.setAttribute("class", "flag");
        flagImage.setAttribute("value", szNum.toString());
        hBox.appendChild(flagImage);
        
        var label = document.createElement("label");
        label.setAttribute("value",szName); 
        label.setAttribute("class", "YahooContributorText");
        hBox.appendChild(label);
        
        list.appendChild(hBox);
    }
}
