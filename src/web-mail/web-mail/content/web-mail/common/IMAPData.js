function IMAPUser()
{
    this.aszSubFolders = new Array();
    this.aFolders = new Array();
}

IMAPUser.prototype.szUser = null;
IMAPUser.prototype.aszSubFolders = null;
IMAPUser.prototype.aFolders = null;


/*****************/
function IMAPFolderData()
{
    this.aMSG = new Array();
    this.aUIDs = new Array();
}

IMAPFolderData.prototype.szHeirerchy = null;
IMAPFolderData.prototype.szHref = null;
IMAPFolderData.prototype.szUID = null;
IMAPFolderData.prototype.iMSGCount = 0;
IMAPFolderData.prototype.iUnreadCount = 0;
IMAPFolderData.prototype.aMSG= null;
IMAPFolderData.prototype.aUIDs= null;

/*****************/
function IMAPMSGData()
{
}

IMAPMSGData.prototype.szHref = null;
IMAPMSGData.prototype.szTo= null;
IMAPMSGData.prototype.szFrom = null;
IMAPMSGData.prototype.szSubject = null;
IMAPMSGData.prototype.szDate = null;
IMAPMSGData.prototype.bRead= false;
IMAPMSGData.prototype.bDelete = false;
IMAPMSGData.prototype.iSize= 0;
IMAPMSGData.prototype.szUID = null;
