/*****************************  Globals   *************************************/                 
const nsIMAPFoldersClassID = Components.ID("{9433ab20-f658-11da-974d-0800200c9a66}");
const nsIMAPFoldersContactID = "@mozilla.org/nsIMAPFolders;1";


/***********************  UriManager ********************************/
function nsIMAPFolders()
{   
    this.m_scriptLoader = null; 
    this.m_Log = null; 
    this.m_aUsers = new Array();
    this.m_bSubUpdate = false;
}

nsIMAPFolders.prototype =
{
    listSubscribed : function (szUser, iCount, aszFolders)
    {
        try
        {
            this.m_Log.Write("nsIMAPFolder.js - listSubscribed - Start");
            this.m_Log.Write("nsIMAPFolder.js - listSubscribed - "+szUser);
            
            var bReturn = false;
            //Find user
            var oUser = this.getUser(szUser);
            
            if (oUser)//get sub list
            {                              
                var aResult = new Array();
                for (i=0; i<oUser.aszSubFolders.length; i++)
                {
                    aResult.push(oUser.aszSubFolders[i]);
                }
 
                iCount.value = aResult.length;
                aszFolders.value = aResult;
                bReturn = true;
                this.m_Log.Write("nsIMAPFolder.js - listSubscribed - " + iCount.value + " " + aszFolders.value);    
            }
            
            this.m_Log.Write("nsIMAPFolder.js - listSubscribed - End");
            return bReturn;
        }
        catch(err)
        {
            this.m_Log.DebugDump("nsIMAPFolder.js: listSubscribed : Exception : " 
                                          + err.name 
                                          + ".\nError message: " 
                                          + err.message + "\n"
                                          + err.lineNumber);
            return false;
        }
    },
    
    
    
    
    subscribeFolder :function (szUser, szFolder)
    {
        try
        {
            this.m_Log.Write("nsIMAPFolder.js - subscribeFolder - Start");
            this.m_Log.Write("nsIMAPFolder.js - subscribeFolder - "+szUser + " " + szFolder);
            
            var bReturn = false;
            //find user
            var oUser = this.getUser(szUser);      
            if (!oUser) //add new user
            {
                oUser = new IMAPUser();
                oUser.szUser = szUser;
                this.m_aUsers.push(oUser);  
            }
            
            var bFound = false;
            if (oUser.aszSubFolders.length>0)
            {   
                var regexpFolder = new RegExp("^"+szFolder+"$","i");
                var i=0;
                do 
                {
                   
                    if (oUser.aszSubFolders[i].search(regexpFolder)!=-1)
                    {
                        this.m_Log.Write("nsIMAPFolder.js - subscribeFolder - Found");
                        bFound = true;
                    } 
                    i++                    
                }while(i!=oUser.aszSubFolders.length && !bFound)
            }
            
            //add new folder  
            if (!bFound)
            { 
                oUser.aszSubFolders.push(szFolder);             
                bReturn = true;
                this.m_bSubUpdate = true;
            }
            
            this.m_Log.Write("nsIMAPFolder.js - subscribeFolder - End");
            return bReturn;
        }
        catch(err)
        {
            this.m_Log.DebugDump("nsIMAPFolder.js: subscribeFolder : Exception : " 
                                          + err.name 
                                          + ".\nError message: " 
                                          + err.message + "\n"
                                          + err.lineNumber);
            return false;
        }
    },
    
    
    
    
    unsubscribeFolder : function (szUser, szFolder)
    {
        try
        {
            this.m_Log.Write("nsIMAPFolder.js - unsubscribeFolder - Start");
            this.m_Log.Write("nsIMAPFolder.js - unsubscribeFolder - "+szUser + " " + szFolder);
            
            //find user
            var oUser = this.getUser(szUser);
            var bFound = false;
            if (oUser)  //remove folder
            {   
                var i=0;  
                
                var regexpFolder = new RegExp("^"+szFolder+"$","i");
                this.m_Log.Write("nsIMAPFolder.js - unsubscribeFolder - Target folder  " +regexpFolder);

                if (oUser.aszSubFolders.length>0)
                {
                    do 
                    {
                        var oTemp = oUser.aszSubFolders.shift();
                        if (oTemp.search(regexpFolder)!=-1)
                        {
                            this.m_Log.Write("nsIMAPFolder.js - unsubscribeFolder - Found");
                            bFound = true;
                            this.m_bSubUpdate = true;
                            delete oTemp;
                        } 
                        else
                        {
                            this.m_Log.Write("nsIMAPFolder.js - unsubscribeFolder - Not Found");
                            oUser.aszSubFolders.push(oTemp);
                        }
                        i++
                        
                    }while(i!=oUser.aszSubFolders.length && !bFound)
                }
            }
            
            this.m_Log.Write("nsIMAPFolder.js - unsubscribeFolder - End");
            return bFound;
        }
        catch(err)
        {
            this.m_Log.DebugDump("nsIMAPFolder.js: unsubscribeFolder : Exception : " 
                                          + err.name 
                                          + ".\nError message: " 
                                          + err.message + "\n"
                                          + err.lineNumber);
            return false;
        }
    },
       
       
    
    addFolder : function (szUser, szHiererchy, szHref, szUID, iMSGCount, iUnreadCount)
    {
        try
        {
            this.m_Log.Write("nsIMAPFolder.js - addFolder - Start");
            this.m_Log.Write("nsIMAPFolder.js - addFolder - "+ szUser + " " + szHiererchy + " " + szHref + " " + szUID + " " + iMSGCount + " " +iUnreadCount);
            
            var bFound = false;
            
            //find user
            var oUser = this.getUser(szUser);
            
            if (!oUser) //add new user
            {
                this.m_Log.Write("nsIMAPFolder.js - addFolder - creating user");
                oUser = new IMAPUser();
                oUser.szUser = szUser;
                this.m_aUsers.push(oUser);  
            }
            
            //create new folder object
            var oFolder = new IMAPFolderData()
            oFolder.szHeirerchy = szHiererchy;
            oFolder.szHref = szHref;
            oFolder.szHref = szHref;
            oFolder.szUID = szUID;
            oFolder.iMSGCount = iMSGCount;
            oFolder.iUnreadCount = iUnreadCount;
            
            if (oUser.aFolders.length == 0)
            {
                this.m_Log.Write("nsIMAPFolder.js - addFolder - creating folder object");
                oUser.aFolders.push(oFolder);
                bFound = true;
            }
            else //search list
            {
                var i=0;
                var regexpHier = new RegExp("^"+szHiererchy+"$","i");
                this.m_Log.Write("nsIMAPFolder.js - addFolder - Target Hier  " +regexpHier);
                
                do
                {
                    this.m_Log.Write("nsIMAPFolder.js - addFolder - search folders "+ oUser.aFolders[i].szHeirerchy);
                    if (oUser.aFolders[i].szHeirerchy.search(regexpHier)!=-1)
                    { //found update it
                        this.m_Log.Write("nsIMAPFolder.js - addFolder - folder Found");
                        bFound = true;
                        oUser.aFolders[i].szHref = szHref;
                        oUser.aFolders[i].szUID = szUID;
                        oUser.aFolders[i].iMSGCount = iMSGCount;
                        oUser.aFolders[i].iUnreadCount = iUnreadCount;
                        delete oFolder;
                    }
                    i++;
                }while (i!=oUser.aFolders.length && !bFound)
                
                //not found add it
                if (!bFound)
                {   
                    oUser.aFolders.push(oFolder);
                    bFound = true;
                }
            }
            
            this.m_Log.Write("nsIMAPFolder.js - addFolder - End");
            return bFound;
        }
        catch(err)
        {
            this.m_Log.DebugDump("nsIMAPFolder.js: addFolder : Exception : " 
                                          + err.name 
                                          + ".\nError message: " 
                                          + err.message + "\n"
                                          + err.lineNumber);
            return false;
        }
    },
    
    
    deleteFolder : function (szUser, szHiererchy)
    {
        try
        {
            this.m_Log.Write("nsIMAPFolder.js - deleteFolder - Start");
            this.m_Log.Write("nsIMAPFolder.js - deleteFolder - "+ szUser + " " + szHiererchy);
            
            var bFound = false;
            
            //find user
            var oUser = this.getUser(szUser);
            
            if (!oUser) //add new user
            {
                this.m_Log.Write("nsIMAPFolder.js - deleteFolder - user not found");
                return false;
            }
    
    
            if (oUser.aFolders.length != 0)
            {
                var i=0;
                var regexpHier = new RegExp("^"+szHiererchy+"$","i");
                this.m_Log.Write("nsIMAPFolder.js - deleteFolder - Target Hier  " +regexpHier);
                
                do
                {
                    var oFolder = oUser.aFolders.shift();
                    this.m_Log.Write("nsIMAPFolder.js - deleteFolder - search folders "+ oFolder.szHeirerchy);
                    if (oFolder.szHeirerchy.search(regexpHier)!=-1)
                    { //found update it
                        this.m_Log.Write("nsIMAPFolder.js - deleteFolder - folder Found");
                        bFound = true;
                        delete oFolder;
                    }
                    else
                    {   
                        this.m_Log.Write("nsIMAPFolder.js - deleteFolder - folder NOT Found");
                        oUser.aFolders.push(oFolder);    
                    }
                    i++;
                }while (i!=oUser.aFolders.length && !bFound)

            }
            
            this.m_Log.Write("nsIMAPFolder.js - deleteFolder - End");
            return bFound;
        }
        catch(err)
        {
            this.m_Log.DebugDump("nsIMAPFolder.js: deleteFolder : Exception : " 
                                          + err.name 
                                          + ".\nError message: " 
                                          + err.message + "\n"
                                          + err.lineNumber);
            return false;
        }
    },
    
    
    
    getFolderCount :function (szUser)
    {
        try
        {
            this.m_Log.Write("nsIMAPFolder.js - getFolderCount - START " +szUser);
            
            //find user
            var oUser = this.getUser(szUser);
            var num = 0;
            
            if (oUser) //add new user
            {
                this.m_Log.Write("nsIMAPFolder.js - getFolderCount - user found");
                num = oUser.aFolders.length;
            }
                 
            this.m_Log.Write("nsIMAPFolder.js - getFolderCount - End "+ num);
            return num;
        }
        catch(err)
        {
             this.m_Log.DebugDump("nsIMAPFolder.js: getFolderCount : Exception : " 
                                          + err.name 
                                          + ".\nError message: " 
                                          + err.message + "\n"
                                          + err.lineNumber);
            return 0;
        }
    },
    
    
    
    renameFolder : function (szUser, szOldHierarchy, szNewHierarchy, szNewHref)
    {
        try
        {
            this.m_Log.Write("nsIMAPFolder.js - renameFolder - Start");
            this.m_Log.Write("nsIMAPFolder.js - renameFolder - "+ szUser + " " + szOldHierarchy + " " + szNewHierarchy + " " + szNewHref);
            
            var bFound = false;
            
            //find user
            var oUser = this.getUser(szUser);
            if (!oUser) //add new user
            {
                this.m_Log.Write("nsIMAPFolder.js - renameFolder - creating user");
                return false;
            }
                    
            if (oUser.aFolders.length != 0)
            {
                var i=0;
                var regexpHier = new RegExp("^"+szOldHierarchy+"$","i");
                this.m_Log.Write("nsIMAPFolder.js - renameFolder - Target Hier  " +regexpHier);
                
                do
                {
                    this.m_Log.Write("nsIMAPFolder.js - renameFolder - search folders "+ oUser.aFolders[i].szHeirerchy);
                    if (oUser.aFolders[i].szHeirerchy.search(regexpHier)!=-1)
                    { //found update it
                        this.m_Log.Write("nsIMAPFolder.js - renameFolder - folder Found");
                        bFound = true;
                        oUser.aFolders[i].szHref = szNewHref;
                        oUser.aFolders[i].szHeirerchy = szNewHierarchy;
                    }
                    i++;
                }while (i!=oUser.aFolders.length && !bFound)
            }
            
            this.m_Log.Write("nsIMAPFolder.js - renameFolder - End");
            return bFound;
        }
        catch(err)
        {
            this.m_Log.DebugDump("nsIMAPFolder.js: renameFolder : Exception : " 
                                          + err.name 
                                          + ".\nError message: " 
                                          + err.message + "\n"
                                          + err.lineNumber);
            return false;
        }   
    },
    
    
       
    getHierarchies : function (szUser, szHierarchy ,iCount, aszFolders)
    {
        try
        {
            this.m_Log.Write("nsIMAPFolder.js - getAllHiererchy - START");
            this.m_Log.Write("nsIMAPFolder.js - getAllHiererchy - " + szUser + " " +szHierarchy);
            if (!szHierarchy) throw new Error("no szHierarchy");
            if (szHierarchy.search(/INBOX/)==-1) throw new Error("searching not for inbox");
            
            var bResult = false;      
            var aResult = new Array();
            
            //get user
            var oUser = this.getUser(szUser);

            if (oUser) //user found
            {
                this.m_Log.Write("nsIMAPFolder.js - getAllHiererchy - user found");
                            
                var bWildcards = false;
                if (szHierarchy.search(/INBOX\.\*|\%$/)!=-1) bWildcards = true; 
                this.m_Log.Write("nsIMAPFolder.js - getAllHiererchy - wildcard " + bWildcards);
            
                var aHier = szHierarchy.split(".");
                this.m_Log.Write("nsIMAPFolder.js - getAllHiererchy " + aHier);
                var regexpHier = null;
                if (aHier.length==1)
                    regexpHier = new RegExp(szHierarchy+"$");
                else
                    regexpHier = new RegExp(aHier[1]);
                this.m_Log.Write("nsIMAPFolder.js - getAllHiererchy  Reg "+ regexpHier);
            
            
                for (var i = 0 ; i<oUser.aFolders.length; i++)
                {                    
                    var szTempHierarchy = oUser.aFolders[i].szHeirerchy;
                    this.m_Log.Write("nsIMAPFolder.js - getAllHiererchy " + i + " "+ szTempHierarchy);
                   
                    if (bWildcards) //wildcard retun everything
                    {
                        aResult.push(szTempHierarchy);
                    }
                    else
                    {
                        if (szTempHierarchy.search(regexpHier)!=-1)
                        {
                            this.m_Log.Write("nsIMAPFolder.js - getAllHiererchy found");
                            aResult.push(szTempHierarchy);
                            bResult=true;
                        }
                    }
                }
            }
            
            iCount.value = aResult.length;
            aszFolders.value = aResult;
            
            this.m_Log.Write("nsIMAPFolder.js - getAllHiererchy - End");
            return bResult;
        }
        catch(err)
        {
            this.m_Log.DebugDump("nsIMAPFolder.js: getAllHiererchy : Exception : " 
                                          + err.name 
                                          + ".\nError message: " 
                                          + err.message + "\n"
                                          + err.lineNumber);
            return false;
        }
    },  
       
         
    
    getFolderDetails : function (szUser, szHierarchy, szHref, szUID, iMSGCount, iUnreadCount)
    {
        try
        {
            this.m_Log.Write("nsIMAPFolder.js - getFolderDetails - Start");
            this.m_Log.Write("nsIMAPFolder.js - getFolderDetails - " + szUser + " " + szHierarchy);
            
            var bResult = false;
            
            //get user
            var oUser = this.getUser(szUser);

            if (oUser) //user found
            {
                this.m_Log.Write("nsIMAPFolder.js - getFolderDetails - user found");
                
                //get folder
                var oFolder = this.getFolder(oUser ,szHierarchy);
                if (oFolder)
                {
                    this.m_Log.Write("nsIMAPFolder.js - getFolderDetails - folder found");
                    
                    szHref.value = oFolder.szHref;
                    szUID.value = oFolder.szUID;
                    iMSGCount.value = oFolder.iMSGCount;
                    iUnreadCount.value = oFolder.iUnreadCount;
                    this.m_Log.Write("nsIMAPFolder.js - getFolderDetails - " + szHref.value + " " + szUID.value + " " + iMSGCount.value + " " + iUnreadCount.value);
                    bResult = true;
                }
            }
                      
            this.m_Log.Write("nsIMAPFolder.js - getFolderDetails - End" +bResult);
            return bResult;
        }
        catch(err)
        {
             this.m_Log.DebugDump("nsIMAPFolder.js: getFolderDetails : Exception : " 
                                          + err.name 
                                          + ".\nError message: " 
                                          + err.message + "\n"
                                          + err.lineNumber);
            return false;
        }
    },
    
    
    getMSGUIDS : function (szUser, szHierarchy, iCount, aszUIDs)
    {
        try
        {
            this.m_Log.Write("nsIMAPFolder.js - getMSGUIDS - Start");
            this.m_Log.Write("nsIMAPFolder.js - getMSGUIDS - " + szUser + " " + szHierarchy);
            
            var bResult = false;
            var aResult = new Array();
            
            //get user
            var oUser = this.getUser(szUser);

            if (oUser) //user found
            {
                this.m_Log.Write("nsIMAPFolder.js - getMSGUIDS - user found");
                
                //get folder
                var oFolder = this.getFolder(oUser ,szHierarchy);
                if (oFolder)
                {
                    this.m_Log.Write("nsIMAPFolder.js - getMSGUIDS - folder found");
                    
                    aResult=aResult.concat(oFolder.aUIDs);
                    
                    this.m_Log.Write("nsIMAPFolder.js - getMSGUIDS - aResult " + aResult);
                    bResult = true;
                }
            }

            iCount.value = aResult.length;
            aszUIDs.value = aResult;

            this.m_Log.Write("nsIMAPFolder.js - getMSGUIDS - End " +bResult);
            return bResult;
        }
        catch(err)
        {
            this.m_Log.DebugDump("nsIMAPFolder.js: getMSGUIDS : Exception : " 
                                          + err.name 
                                          + ".\nError message: " 
                                          + err.message + "\n"
                                          + err.lineNumber);
            return false;
        }
    },
    
    
    cleanAllMSG : function (szUser, szHierarchy)
    {
        try
        {
            this.m_Log.Write("nsIMAPFolder.js - cleanAllMSG - START");
            this.m_Log.Write("nsIMAPFolder.js - cleanAllMSG - " + szUser + " " + szHierarchy);
            var bResult = false;
            
            var oUser = this.getUser(szUser);
            if (oUser) //user found
            {
                this.m_Log.Write("nsIMAPFolder.js - cleanAllMSG - user found");
                
                //get folder
                var oFolder = this.getFolder(oUser ,szHierarchy);
                if (oFolder)
                {
                    this.m_Log.Write("nsIMAPFolder.js - cleanAllMSG - folder found - MSG deleted");
                    delete oFolder.aMSG;
                    oFolder.aMSG = new Array();
                    oFolder.iMSGCount = 0;
                    oFolder.iUnreadCount = 0;
                    delete oFolder.aUIDs;
                    oFolder.aUIDs = new Array(); 
                    bResult= true;
                }
            }
            
            this.m_Log.Write("nsIMAPFolder.js - cleanAllMSG - End" +bResult);
            return bResult;        
        }
        catch(err)
        {
            this.m_Log.DebugDump("nsIMAPFolder.js: cleanAllMSG : Exception : " 
                                          + err.name 
                                          + ".\nError message: " 
                                          + err.message + "\n"
                                          + err.lineNumber);
            return false;
        }
    },
      
      
      
        
    addMSG : function (szUser, szHierarchy, szHref, szUID, bRead, szTo, szFrom, szSubject, szDate, iSize)
    {
        try
        {
            this.m_Log.Write("nsIMAPFolder.js - addMSG - Start");
            this.m_Log.Write("nsIMAPFolder.js - addMSG - " + szUser + " " + szHierarchy + " " + szHref + " " + szUID + " " + bRead +" " 
                                                           + szTo + " " + szFrom + " " + szSubject + " " + szDate + " " + iSize);
            var bResult = false;
        
            var MSG = new IMAPMSGData();
            MSG.szHref = szHref;
            MSG.szTo= szTo;
            MSG.szFrom = szFrom;
            MSG.szSubject = szSubject;
            MSG.szDate = szDate;
            MSG.bRead= bRead;
            MSG.iSize= iSize;
            MSG.szUID = szUID;
          
            var oUser = this.getUser(szUser);  
            if (oUser) //user found
            {
                this.m_Log.Write("nsIMAPFolder.js - addMSG - user found");
                
                //get folder
                var oFolder = this.getFolder(oUser ,szHierarchy);
                if (oFolder)
                {
                    this.m_Log.Write("nsIMAPFolder.js - addMSG - folder found");
                    
                    var oMSG = {value : null};
                    var oIndex = {valie : null};
                    var bMSG = this.findMSG(oFolder, szUID, oMSG, oIndex);
                                        
                    if (!bMSG)
                    {
                        this.m_Log.Write("nsIMAPFolder.js - addMSG MSG added");
                        oFolder.aMSG.push(MSG);
                        //oFolder.aMSG = oFolder.aMSG.sort(this.sortUID);
                        oFolder.aUIDs.push(szUID);
                        //oFolder.aUIDs = oFolder.aUIDs.sort(this.sortMSGUID);
                        bResult = true;
                        oFolder.iMSGCount++;
                        if (!bRead) oFolder.iUnreadCount++;
                    }
                    else
                    {
                        oMSG.bDelete = false;
                        oMSG.bRead = bRead;
                        oFolder.iMSGCount++;
                        if (!bRead) oFolder.iUnreadCount++;
                    }
                }
            }
            
            this.m_Log.Write("nsIMAPFolder.js - addMSG - End " +bResult);
            return bResult;
        }
        catch(err)
        {
            this.m_Log.DebugDump("nsIMAPFolder.js: addMSG : Exception : " 
                                          + err.name 
                                          + ".\nError message: " 
                                          + err.message + "\n"
                                          + err.lineNumber);
            return false;
        }
    },
         
      
    sortUID : function (a,b)
    {
        return ((a<b)?-1:1);
    },
    
    sortMSGUID : function (a,b)
    {
        return ((a.szUID<b.szUID)?-1:1);
    },
    

    getMSG : function (szUser, szHierarchy, szUID, iIndex, szHref, bRead, bDelete, szTo, szFrom, szSubject, szDate, iSize)
    {
        try
        {
            this.m_Log.Write("nsIMAPFolder.js - getMSG - Start");
            this.m_Log.Write("nsIMAPFolder.js - getMSG - " + szUser + " " + szHierarchy + " " + szUID);
            var bResult = false;
                      
            var oUser = this.getUser(szUser);  
            if (oUser) //user found
            {
                this.m_Log.Write("nsIMAPFolder.js - getMSG - user found");
                
                //get folder
                var oFolder = this.getFolder(oUser ,szHierarchy);
                if (oFolder)
                {
                    this.m_Log.Write("nsIMAPFolder.js - getMSG - folder found");
                    
                    var oMSG = {value : null};
                    var oIndex = {value : null};
                    var bMSG = this.findMSG(oFolder, szUID, oMSG, oIndex);
                                        
                    if (bMSG)
                    {
                        this.m_Log.Write("nsIMAPFolder.js - getMSG MSG found");
                        bResult = true;
                        iIndex.value = oIndex.value;
                        szHref.value = oMSG.value.szHref;
                        bRead.value = oMSG.value.bRead;
                        bDelete.value = oMSG.value.bDelete;
                        szTo.value = oMSG.value.szTo;
                        szFrom.value = oMSG.value.szFrom;
                        szSubject.value = oMSG.value.szSubject;
                        szDate.value = oMSG.value.szDate;
                        iSize.value = oMSG.value.iSize;
                    }
                }
            }
            
            this.m_Log.Write("nsIMAPFolder.js - addMSG - END " +bResult);
            return bResult;
        }
        catch(err)
        {
             this.m_Log.DebugDump("nsIMAPFolder.js: getMSG : Exception : " 
                                          + err.name 
                                          + ".\nError message: " 
                                          + err.message + "\n"
                                          + err.lineNumber);
            return false;
        }
    },
    
    

    setMSGSeenFlag : function(szUser, szHierarchy, szUID, bSeen)
    {
        try
        {
            this.m_Log.Write("nsIMAPFolder.js - setMSGSeenFlag - Start");
            this.m_Log.Write("nsIMAPFolder.js - setMSGSeenFlag - " + szUser + " " + szHierarchy + " " + szUID + " " + bSeen);
            var bResult = false;
                      
            var oUser = this.getUser(szUser);  
            if (oUser) //user found
            {
                this.m_Log.Write("nsIMAPFolder.js - setMSGSeenFlag - user found");
                
                //get folder
                var oFolder = this.getFolder(oUser ,szHierarchy);
                if (oFolder)
                {
                    this.m_Log.Write("nsIMAPFolder.js - setMSGSeenFlag - folder found");
                    
                    var oMSG = {value : null};
                    var oIndex = {value : null};
                    var bMSG = this.findMSG(oFolder, szUID, oMSG, oIndex);
                                        
                    if (bMSG)
                    {
                        this.m_Log.Write("nsIMAPFolder.js - setMSGSeenFlag MSG found");
                        bResult = true;
                        oMSG.value.bRead = bSeen;
                        !bSeen? oFolder.iUnreadCount-- : oFolder.iUnreadCount++;
                    }
                }
            }
            
            this.m_Log.Write("nsIMAPFolder.js - setMSGSeenFlag - END " +bResult);
            return bResult;
        }
        catch(err)
        {
             this.m_Log.DebugDump("nsIMAPFolder.js: setMSGSeenFlag : Exception : " 
                                          + err.name 
                                          + ".\nError message: " 
                                          + err.message + "\n"
                                          + err.lineNumber);
            return false;
        }
    },
    
    
    
    
    
    setMSGDeleteFlag : function (szUser, szHierarchy, szUID, bDelete)
    {
        try
        {
            this.m_Log.Write("nsIMAPFolder.js - setMSGDeleteFlag - Start");
            this.m_Log.Write("nsIMAPFolder.js - setMSGDeleteFlag - " + szUser + " " + szHierarchy + " " + szUID + " " + bDelete);
            var bResult = false;
                      
            var oUser = this.getUser(szUser);  
            if (oUser) //user found
            {
                this.m_Log.Write("nsIMAPFolder.js - setMSGDeleteFlag - user found");
                
                //get folder
                var oFolder = this.getFolder(oUser ,szHierarchy);
                if (oFolder)
                {
                    this.m_Log.Write("nsIMAPFolder.js - setMSGDeleteFlag - folder found");
                    
                    var oMSG = {value : null};
                    var oIndex = {value : null};
                    var bMSG = this.findMSG(oFolder, szUID, oMSG, oIndex);
                                        
                    if (bMSG)
                    {
                        this.m_Log.Write("nsIMAPFolder.js - setMSGDeleteFlag MSG found");
                        bResult = true;
                        oMSG.value.bDelete = bDelete;
                    }
                }
            }
            
            this.m_Log.Write("nsIMAPFolder.js - setMSGDeleteFlag - END " +bResult);
            return bResult;
        }
        catch(err)
        {
             this.m_Log.DebugDump("nsIMAPFolder.js: setMSGDeleteFlag : Exception : " 
                                          + err.name 
                                          + ".\nError message: " 
                                          + err.message + "\n"
                                          + err.lineNumber);
            return false;
        }
    },





    findMSG : function (oFolder, szUID , oMSG, oIndex)
    {
        try
        {
            this.m_Log.Write("nsIMAPFolder.js - findMSG - START");
            
            if (oFolder.aMSG.length>0)
            {
                var regexpMSG = new RegExp(szUID+"$");
                this.m_Log.Write("nsIMAPFolder.js - findMSG  Reg "+ regexpMSG);
                
                var bResult = false;
                var  i=0;
                do
                {                   
                    var szTempID = oFolder.aMSG[i].szUID;
                    this.m_Log.Write("nsIMAPFolder.js - findMSG " + i + " "+ szTempID);
                   
                    if (szTempID.search(regexpMSG)!=-1)
                    {
                        this.m_Log.Write("nsIMAPFolder.js - findMSG found");
                        oMSG.value = oFolder.aMSG[i];
                        oIndex.value = i;
                        bResult = true;
                    }
                    i++;
                }while(i!=oFolder.aMSG.length && !bResult)
            }
            
            this.m_Log.Write("nsIMAPFolder.js - findMSG - End");
            return bResult;
        }
        catch(err)
        {
            this.m_Log.DebugDump("nsIMAPFolder.js: findMSG : Exception : " 
                                          + err.name 
                                          + ".\nError message: " 
                                          + err.message + "\n"
                                          + err.lineNumber);
            return null;
        }
        
    },
    
    
    getFolder : function (oUser, szFolder)
    {
        try
        {
            this.m_Log.Write("nsIMAPFolder.js - getFolder - START");
            var oFolder = null;
            
            if (oUser.aFolders.length>0)
            {
                var regexpHier = new RegExp(szFolder+"$");
                this.m_Log.Write("nsIMAPFolder.js - getFolder  Reg "+ regexpHier);
                
                var bResult = false;
                var  i=0;
                do
                {                   
                    var szTempHierarchy = oUser.aFolders[i].szHeirerchy;
                    this.m_Log.Write("nsIMAPFolder.js - getFolder " + i + " "+ szTempHierarchy);
                   
                    if (szTempHierarchy.search(regexpHier)!=-1)
                    {
                        this.m_Log.Write("nsIMAPFolder.js - getFolder folder found");
                        oFolder = oUser.aFolders[i];
                        bResult = true;
                    }
                    i++;
                }while(i!=oUser.aFolders.length && !bResult)
            }
            
            this.m_Log.Write("nsIMAPFolder.js - getFolder - End");
            return oFolder;
        }
        catch(err)
        {
            this.m_Log.DebugDump("nsIMAPFolder.js: getFolder : Exception : " 
                                          + err.name 
                                          + ".\nError message: " 
                                          + err.message + "\n"
                                          + err.lineNumber);
            return null;
        }
    },
    
    

    
          
    getUser : function (szUser)
    {
        try
        {
            this.m_Log.Write("nsIMAPFolder.js - getUser - Start");
            this.m_Log.Write("nsIMAPFolder.js - getUser - "+szUser);
            
            //find user
            var bFound = false;
            var  i =0;
            var oUser = null;
            var regexpUser = new RegExp("^"+szUser+"$","i");
            this.m_Log.Write("nsIMAPFolder.js - getUser - Target User  " +regexpUser);
            
            if (this.m_aUsers.length>0)
            {
                do
                {     
                    this.m_Log.Write("nsIMAPFolder.js - getUser - search users " + this.m_aUsers[i].szUser);  
                    if (this.m_aUsers[i].szUser.search(regexpUser)!=-1)
                    {
                        this.m_Log.Write("nsIMAPFolder.js - getUser - user Found");
                        bFound = true;
                        oUser = this.m_aUsers[i];
                    }
                     
                    i++;
                }while(i!=this.m_aUsers.length && !bFound)
            }
            
            this.m_Log.Write("nsIMAPFolder.js - getUser - End "+ oUser);
            return oUser;
        }
        catch(err)
        {
            this.m_Log.DebugDump("nsIMAPFolder.js: getUser : Exception : " 
                                          + err.name 
                                          + ".\nError message: " 
                                          + err.message + "\n"
                                          + err.lineNumber);
            return null;
        }
    },
    
    
    
    loadSubData : function()
    {
        try
        {
            this.m_Log.Write("nsIMAPFolder.js - loadSubData - START");   
            
            //get user prefs
            var iCount = 0;
            var oPref = {Value:null};
            var  WebMailPrefAccess = new WebMailCommonPrefAccess();
            WebMailPrefAccess.Get("int","webmail.IMAPSubFolders.Num",oPref);
            this.m_Log.Write("nsIMAPFolder.js - loadPrefs - num " + oPref.Value);
            if (oPref.Value)
            { 
                iCount = oPref.Value;
        
                for (i=0; i<iCount; i++)
                {          
                    //get user name
                    oPref.Value = null;
                    WebMailPrefAccess.Get("char","webmail.IMAPSubFolders."+i+".user",oPref);
                    this.m_Log.Write("nsIMAPFolder.js - loadPrefs - user " + oPref.Value);
                    if (oPref.Value)
                    { 
                        var data = new IMAPUser();
                        data.szUser = oPref.Value;
                        
                        //get folders
                        oPref.Value= null;
                        WebMailPrefAccess.Get("char","webmail.IMAPSubFolders."+i+".szFolders",oPref);
                        this.m_Log.Write("nsIMAPFolder.js - loadPrefs - szFolders " + oPref.Value);
                        if (oPref.Value)
                        {
                            //data.aszSubFolders = new Array();
                            
                            var aszFolders = oPref.Value.split("\r");
                            for (j=0; j<aszFolders.length; j++)
                            {
                                this.m_Log.Write("nsYahoo - loadPRefs - aszFolders[j] " + aszFolders[j]);
                                data.aszSubFolders.push(aszFolders[j]);
                            }
                        }
                        
                        this.m_aUsers.push(data);
                    }
                }
            }    
            this.m_Log.Write("nsIMAPFolder.js - loadSubData - END");  
            return true;
        }
        catch(err)
        {
            this.m_Log.DebugDump("nsIMAPFolder.js: loadSubData : Exception : " 
                                          + err.name 
                                          + ".\nError message: " 
                                          + err.message + "\n"
                                          + err.lineNumber);
                                          
            return false;
        }
    },




    saveSubData : function()
    {
        try
        {
            this.m_Log.Write("nsIMAPFolder.js - saveSubData - START");   
            
            this.m_Log.Write("nsIMAPFolder.js - saveSubData - " +this.m_bSubUpdate);
            if (this.m_bSubUpdate)
            {
                //write prefs
                var WebMailPrefAccess = new WebMailCommonPrefAccess();
                WebMailPrefAccess.DeleteBranch("webmail.IMAPSubFolders");
                WebMailPrefAccess.Set("int","webmail.IMAPSubFolders.Num",this.m_aUsers.length);
                
                for (var i=0; i<this.m_aUsers.length; i++)
                {
                    WebMailPrefAccess.Set("char","webmail.IMAPSubFolders."+i+".user",this.m_aUsers[i].szUser);
                    this.m_Log.Write("nsIMAPFolder.js - saveSubData - user " + this.m_aUsers[i].szUser);
                    
                    var szFolders = "";
                    for (var j=0; j<this.m_aUsers[i].aszSubFolders.length; j++)
                    {
                        szFolders += this.m_aUsers[i].aszSubFolders[j];
                        if (j!=this.m_aUsers[i].aszSubFolders.length-1) szFolders += "\r";
                    }

                    WebMailPrefAccess.Set("char","webmail.IMAPSubFolders."+i+".szFolders",szFolders);
                    this.m_Log.Write("nsIMAPFolder.js - saveSubData - szFolders " + szFolders);   
                }
            }
     
            this.m_Log.Write("nsIMAPFolder.js - saveSubData - END");  
            return true;
        }
        catch(err)
        {
            this.m_Log.DebugDump("nsIMAPFolder.js: loadDataBase : Exception : " 
                                          + err.name 
                                          + ".\nError message: " 
                                          + err.message + "\n"
                                          + err.lineNumber);
                                          
            return false;
        }
    },  


    
    observe : function(aSubject, aTopic, aData) 
    {
        switch(aTopic) 
        {
            case "xpcom-startup":
                // this is run very early, right after XPCOM is initialized, but before
                // user profile information is applied. Register ourselves as an observer
                // for 'profile-after-change' and 'quit-application'.
                var obsSvc = Components.classes["@mozilla.org/observer-service;1"].
                                getService(Components.interfaces.nsIObserverService);
                obsSvc.addObserver(this, "profile-after-change", false);
                obsSvc.addObserver(this, "quit-application", false);
                
                this.m_scriptLoader = Components.classes["@mozilla.org/moz/jssubscript-loader;1"]
                                        .getService(Components.interfaces.mozIJSSubScriptLoader);
            break;
            
            case "profile-after-change":
                // This happens after profile has been loaded and user preferences have been read.
                // startup code here
                this.m_scriptLoader.loadSubScript("chrome://web-mail/content/common/DebugLog.js");
                this.m_scriptLoader.loadSubScript("chrome://web-mail/content/common/CommonPrefs.js");
                this.m_scriptLoader.loadSubScript("chrome://web-mail/content/common/IMAPData.js");
                this.m_Log = new DebugLog("webmail.logging.comms", 
                                          "{3c8e8390-2cf6-11d9-9669-0800200c9a66}",
                                          "IMAP Folders");
                                          
                this.m_Log.Write("nsIMAPFolder.js - profile-after-change");
                this.loadSubData();
            break;

            case "quit-application":
                this.m_Log.Write("nsIMAPFolder.js - quit-application "); 
                this.saveSubData();
            break;

            case "app-startup":
            break;
            
            default:
                throw Components.Exception("Unknown topic: " + aTopic);
        }
    },

/******************************************************************************/
/***************** XPCOM  stuff ***********************************************/
/******************************************************************************/
    QueryInterface : function (iid)
    {
        if (!iid.equals(Components.interfaces.nsIIMAPFolders) 
        	    && !iid.equals(Components.interfaces.nsISupports)
                    && !iid.equals(Components.interfaces.nsIObserver))
            throw Components.results.NS_ERROR_NO_INTERFACE;
            
        return this;
    }
}
 

/******************************************************************************/
/* FACTORY*/
var nsIMAPFoldersFactory = new Object();

nsIMAPFoldersFactory.createInstance = function (outer, iid)
{
    if (outer != null)
        throw Components.results.NS_ERROR_NO_AGGREGATION;
    
    if (!iid.equals(nsIMAPFoldersClassID) 
            && !iid.equals(Components.interfaces.nsISupports))
        throw Components.results.NS_ERROR_INVALID_ARG;
    
    return new nsIMAPFolders();
}


/******************************************************************************/
/* MODULE */
var nsIMAPFoldersModule = new Object();

nsIMAPFoldersModule.registerSelf = function(compMgr, fileSpec, location, type)
{
    var catman = Components.classes["@mozilla.org/categorymanager;1"].
                        getService(Components.interfaces.nsICategoryManager);
        
    catman.addCategoryEntry("xpcom-startup", 
                            "IMAP Folders", 
                            nsIMAPFoldersContactID, 
                            true, 
                            true);                     
                            
    catman.addCategoryEntry("app-startup", 
                            "IMAP Folders", 
                            "service," + nsIMAPFoldersContactID, 
                            true, 
                            true);
                            
    compMgr = compMgr.QueryInterface(Components.interfaces.nsIComponentRegistrar);
    compMgr.registerFactoryLocation(nsIMAPFoldersClassID,
                                    "IMAP Folders",
                                    nsIMAPFoldersContactID, 
                                    fileSpec,
                                    location, 
                                    type);
}


nsIMAPFoldersModule.unregisterSelf = function(aCompMgr, aFileSpec, aLocation)
{
    var catman = Components.classes["@mozilla.org/categorymanager;1"].
                            getService(Components.interfaces.nsICategoryManager);
                            
    catman.deleteCategoryEntry("xpcom-startup", "IMAP Folders", true);
    catman.deleteCategoryEntry("app-startup", "IMAP Folders", true);
    
    aCompMgr = aCompMgr.QueryInterface(Components.interfaces.nsIComponentRegistrar);
    aCompMgr.unregisterFactoryLocation(nsIMAPFoldersClassID, aFileSpec);
}

 
nsIMAPFoldersModule.getClassObject = function(compMgr, cid, iid)
{
    if (!cid.equals(nsIMAPFoldersClassID))
        throw Components.results.NS_ERROR_NO_INTERFACE;

    if (!iid.equals(Components.interfaces.nsIFactory))
        throw Components.results.NS_ERROR_NOT_IMPLEMENTED;

    return nsIMAPFoldersFactory;
}


nsIMAPFoldersModule.canUnload = function(compMgr)
{
    return true;
}
/******************************************************************************/


function NSGetModule(compMgr, fileSpec)
{
    return nsIMAPFoldersModule; 
}
