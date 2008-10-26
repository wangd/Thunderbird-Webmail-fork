function PrefData()
{
    this.aszFolder = new Array();
}

PrefData.prototype.bReUseSession = true;

PrefData.prototype.bSaveCopy = false;

PrefData.prototype.bUseJunkMail = false;

PrefData.prototype.bDownloadUnread = false;

PrefData.prototype.bMarkAsRead = true;

PrefData.prototype.aszFolder = null;

PrefData.prototype.bSendHtml = false;

PrefData.prototype.iMode = 2;   //default Hotmail live (new site)

PrefData.prototype.iProcessDelay = 10;

PrefData.prototype.iProcessAmount = 25;

PrefData.prototype.szUser = null;

PrefData.prototype.bDownloadInbox = false;
