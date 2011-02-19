function PrefData()
{
    this.aszFolder = new Array();
}

PrefData.prototype.bSaveCopy = false;

PrefData.prototype.bUseJunkMail = false;

PrefData.prototype.bDownloadUnread = false;

PrefData.prototype.bMarkAsRead = true;

PrefData.prototype.aszFolder = null;

PrefData.prototype.bSendHtml = false;

PrefData.prototype.bReUseSession = true;

PrefData.prototype.bLoginWithDomain = false;

PrefData.prototype.iMode = 0;   //default ScreenRipper

PrefData.prototype.iProcessDelay = 10;

PrefData.prototype.iProcessAmount = 25;

PrefData.prototype.szUser = null;

PrefData.prototype.forwardCreds = true;
