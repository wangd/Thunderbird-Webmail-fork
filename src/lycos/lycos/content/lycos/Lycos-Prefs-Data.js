function PrefData()
{
    this.aszFolder = new Array();
}

PrefData.prototype.bSaveCopy = false;

PrefData.prototype.bUseJunkMail = false;

PrefData.prototype.bDownloadUnread = false;

PrefData.prototype.bMarkAsRead = true;

PrefData.prototype.aszFolder = null;

PrefData.prototype.bEmptyTrash = false;

PrefData.prototype.szUser = null;

PrefData.prototype.bReUseSession = false;

PrefData.prototype.iTime = 10;

PrefData.prototype.iProcessTrigger = 50;

PrefData.prototype.iProcessAmount = 25;
