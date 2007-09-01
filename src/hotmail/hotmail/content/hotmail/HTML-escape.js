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
        
        //&#00;-&#08;                Unused
        //&#11;-&#12;                Unused
        //&#14;-&#31;                Unused
        //&#32; = \s                 MS not using
        //&#44; = ,                  MS not using
        //&#45; = -                  MS not using
        //&#46; = .                  MS not using
        //&#48;-&#57;      0-9       Digits 0-9
        //&#65;-&#90;      A-Z       Letters A-Z
        //&#97;-&#122;     a-z       Letters a-z
        //&#127;-&#159;              Unused
        //&#160;-&#255               Unlikely
        szMSG = szMSG.replace(/&#9;/gm, "\t") .replace(/&#09;/gm, "\t")
                     .replace(/&#10;/gm, "\n").replace(/&#13;/gm, "\r")
                     .replace(/&#33;/gm, "!") .replace(/&#34;/gm, "\"") 
                     .replace(/&#35;/gm, "#") .replace(/&#36;/gm, "$") 
                     .replace(/&#37;/gm, "%") .replace(/&#38;/gm, "&") 
                     .replace(/&#39;/gm, "'") .replace(/&#40;/gm, "(") 
                     .replace(/&#41;/gm, ")") .replace(/&#42;/gm, "*") 
                     .replace(/&#43;/gm, "+") .replace(/&#47;/gm, "/") 
                     .replace(/&#58;/gm, ":") .replace(/&#59;/gm, ";") 
                     .replace(/&#60;/gm, "<") .replace(/&#61;/gm, "=") 
                     .replace(/&#62;/gm, ">") .replace(/&#63;/gm, "?") 
                     .replace(/&#64;/gm, "@") .replace(/&#91;/gm, "[") 
                     .replace(/&#92;/gm, "\\").replace(/&#93;/gm, "]")
                     .replace(/&#94;/gm, "^") .replace(/&#95;/gm, "_") 
                     .replace(/&#96;/gm, "`") .replace(/&#123;/gm, "{")
                     .replace(/&#124;/gm, "|").replace(/&#125;/gm, "}")
                     .replace(/&#126;/gm, "~");

        return szMSG;
    }
    catch(e)
    {
        return null;
    }
}