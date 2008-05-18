function WebMailCommonPrefAccess() 
{
    this.m_PrefService =  Components.classes["@mozilla.org/preferences-service;1"].
                                              getService(Components.interfaces.nsIPrefBranch);
                                        
}

WebMailCommonPrefAccess.prototype.Get = function(Type, Key, Value)
{
    try
    {
        switch (Type)
        {
            case "bool":
                Value.Value = this.m_PrefService.getBoolPref( Key);
                return true;
            break
         
            case "int":
                Value.Value = this.m_PrefService.getIntPref( Key);
                return true;
            break
         
            case "char":
                // Value.Value = this.m_PrefService.getCharPref(Key);
                var str = this.m_PrefService.getComplexValue(Key, Components.interfaces.nsISupportsString);
                Value.Value = str.data;
                return true;
            break
         
            case "nsILocalFile":
                Value.Value = this.m_PrefService.getComplexValue(Key, Components.interfaces.nsILocalFile);
                return true;
            break
            
            default:
                return false;
            break
        }
    }
    catch(e)
    {
        return false;
    }
}


WebMailCommonPrefAccess.prototype.Set = function(Type, Key, Value)
{
    try
    {
        switch (Type)
        {
            case "bool":
                 this.m_PrefService.setBoolPref( Key, Value);
                 return true;
            break
         
            case "int":
                this.m_PrefService.setIntPref( Key, Value);
                return true;
            break
         
            case "char":
                // this.m_PrefService.setCharPref(Key,Value);
                var str = Components.classes["@mozilla.org/supports-string;1"]
                                   .createInstance(Components.interfaces.nsISupportsString);
                str.data = Value;
                this.m_PrefService.setComplexValue(Key,Components.interfaces.nsISupportsString, str);
                return true;
            break
         
            case "nsILocalFile":
                this.m_PrefService.setComplexValue( Key , Components.interfaces.nsILocalFile,Value);
                return true;
            break
            
            default:
                return false;
            break
        }
    }
    catch(e)
    {
        alert(e.message);
        return false;
    }
}



WebMailCommonPrefAccess.prototype.DeleteBranch = function(Key)
{
    try
    {
        this.m_PrefService.deleteBranch( Key);
        return true;
    }
    catch(e)
    {
        alert(e.message);
        return false;
    }
}
