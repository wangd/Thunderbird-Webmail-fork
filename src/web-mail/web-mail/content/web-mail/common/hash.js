function hash()
{
}

hash.prototype.md5Hash = function(szInput)
{
    var inStream = Components.classes["@mozilla.org/io/string-input-stream;1"];
    inStream = inStream.createInstance( Components.interfaces.nsIStringInputStream );
    inStream.setData(szInput,-1);

    var hash = Components.classes["@mozilla.org/security/hash;1"].
                    createInstance(Components.interfaces.nsICryptoHash);
    var hashFunction = Components.interfaces.nsICryptoHash["MD5"];
    hash.init(hashFunction);
    hash.updateFromStream(inStream, -1);
    var binHash = hash.finish(false);
    inStream.close();

    return(this.binToHex(binHash));
}


hash.prototype.binToHex = function(szInput)
{
    var result = "";
    for (var i = 0; i < szInput.length; ++i)
    {
        var hex = szInput.charCodeAt(i).toString(16);
        if (hex.length == 1) hex = "0" + hex;
        result += hex;
    }
    return result;
}
