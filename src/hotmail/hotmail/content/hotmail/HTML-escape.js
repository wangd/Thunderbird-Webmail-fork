function HTMLescape()
{
}


HTMLescape.prototype.encode = function(msg)
{
    return msg;
}

HTMLescape.prototype.decode = function(rawMSG)
{
    try
    {
        var szMSG = rawMSG;

        //find used quoted printable hex codes
        var aszCodes = szMSG.match(/&#\d+;/gm);

        if (aszCodes)
        {
            aszCodes.sort();
            //remove duplicates
            for (var i=0; i<aszCodes.length; i)
            {
                if (aszCodes[i] == aszCodes[i+1])
                    aszCodes.splice(i+1,1);
                else
                   i++
            }

            //removed quoted printable codes
            for (var j=0; j<aszCodes.length; j++)
            {
                var decimal = parseInt(aszCodes[j].replace(/[&#;]/gm,""));
                var regexp = new RegExp(aszCodes[j], "gm");
                szMSG = szMSG.replace(regexp,String.fromCharCode(decimal));
            }
        }

        return szMSG;
    }
    catch(e)
    {
        return null;
    }
}

