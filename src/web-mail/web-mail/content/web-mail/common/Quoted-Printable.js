function QuotedPrintable()
{
}


QuotedPrintable.prototype.encode = function(msg)
{
    return msg;
}

QuotedPrintable.prototype.decode = function(rawMSG)
{
    try
    {
        var szMSG;
        
        //remove soft line break;
        szMSG = rawMSG.replace(/=\r?\n/g, "");

        //find used quoted printable hex codes
        var aszHexCodes = szMSG.match(/=[A-Z0-9]{2}/gm);
        aszHexCodes.sort();
        
        //remove duplicates
        for (var i=0; i<aszHexCodes.length; i)
        {
            if (aszHexCodes[i] == aszHexCodes[i+1])
                aszHexCodes.splice(i+1,1);
            else
               i++
        }
        
        //removed quoted printable codes
        for (var j=0; j<aszHexCodes.length; j++)
        {
            var hex = aszHexCodes[j].replace(/=/,"");
            var decimal = parseInt(hex,16); //convert hex to decimal
            var regexp = new RegExp(aszHexCodes[j], "gm");
            //replace hex 
            szMSG = szMSG.replace(regexp,String.fromCharCode(decimal));
        }
        
        return szMSG;
    }
    catch(e)
    {
        return null;
    }
}

