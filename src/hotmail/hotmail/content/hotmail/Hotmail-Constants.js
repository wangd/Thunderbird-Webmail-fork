const kHotmailConstants = true;

/************************Webdav constants *************************************/
const HotmailSchema = "<?xml version=\"1.0\"?>\r\n<D:propfind xmlns:D=\"DAV:\" xmlns:h=\"http://schemas.microsoft.com/hotmail/\" xmlns:hm=\"urn:sc hemas:httpmail:\">\r\n<D:prop>\r\n<h:adbar/>\r\n<hm:contacts/>\r\n<hm:inbox/>\r\n<hm:outbox/>\r\n<hm:sendmsg/>\r\n<hm:sentitems/>\r\n<hm:deleteditems/>\r\n<hm:drafts/>\r\n<hm:msgfolderroot/>\r\n<h:maxpoll/>\r\n<h:sig/>\r\n</D:prop>\r\n</D:propfind>";
const HotmailFolderSchema = "<?xml version=\"1.0\"?>\r\n<D:propfind xmlns:D=\"DAV:\" xmlns:hm=\"urn:schemas:httpmail:\">\r\n<D:prop>\r\n<D:isfolder/>\r\n<D:displayname/>\r\n<hm:special/>\r\n<D:hassubs/>\r\n<D:nosubs/>\r\n<hm:unreadcount/>\r\n<D:visiblecount/>\r\n<hm:special/>\r\n</D:prop>\r\n</D:propfind>";
const HotmailMailSchema = "<?xml version=\"1.0\"?>\r\n<D:propfind xmlns:D=\"DAV:\" xmlns:hm=\"urn:schemas:httpmail:\" xmlns:m=\"urn:schemas:mailheader:\">\r\n<D:prop>\r\n<D:isfolder/>\r\n<hm:read/>\r\n<m:hasattachment/>\r\n<m:to/>\r\n<m:from/>\r\n<m:subject/>\r\n<m:date/>\r\n<D:getcontentlength/>\r\n</D:prop>\r\n</D:propfind>";
const HotmailReadSchema = "<?xml version=\"1.0\"?>\r\n<D:propertyupdate xmlns:D=\"DAV:\" xmlns:hm=\"urn:schemas:httpmail:\">\r\n<D:set>\r\n<D:prop>\r\n<hm:read>1</hm:read>\r\n</D:prop>\r\n</D:set>\r\n</D:propertyupdate>";
const HotmailUnReadSchema = "<?xml version=\"1.0\"?>\r\n<D:propertyupdate xmlns:D=\"DAV:\" xmlns:hm=\"urn:schemas:httpmail:\">\r\n<D:set>\r\n<D:prop>\r\n<hm:read>0</hm:read>\r\n</D:prop>\r\n</D:set>\r\n</D:propertyupdate>";

const patternHotmailResponse = /<D:response>[\S\s]*?<\/D:response>/gm;
const patternHotmailSendMsg = /<hm:sendmsg>(.*?)<\/hm:sendmsg>/;
const patternHotmailMSGID = /[^\/]+$/;
const patternHotmailHref = /<D:href>(.*?)<\/D:href>/;
const patternHotmailRead = /<hm:read>(.*?)<\/hm:read>/i;
const patternHotmailSize = /<D:getcontentlength>(.*?)<\/D:getcontentlength>/;
const patternHotmailTo = /<m:to>(.*?)<\/m:to>/i;
const patternHotmailFrom = /<m:from>(.*?)<\/m:from>/i;
const patternHotmailSubject = /<m:subject>(.*?)<\/m:subject>/i;
const patternHotmailDate = /<m:date>(.*?)T(.*?)<\/m:date>/i;
const patternHotmailFolder = /<hm:msgfolderroot>(.*?)<\/hm:msgfolderroot>/;
const patternHotmailSpecial = /<hm:special>(.*?)<\/hm:special>/;
const patternHotmailDisplayName = /<D:displayname>(.*?)<\/D:displayname>/i;
const patternHotmailUnreadCount = /<hm:unreadcount>(.*?)<\/hm:unreadcount>/;
const patternHotmailMsgCount = /<D:visiblecount>(.*?)<\/D:visiblecount>/;
const patternHotmailTrash = /<hm:deleteditems>(.*?)<\/hm:deleteditems>/;
const patternHotmailFolderName = /folders\/(.*?)\//i;
const patternHotmailFrame = /src="(loading.*?)"/;

const UserAgent = "Mozilla/5.0 (Macintosh; U; Intel Mac OS X; en-US; rv:1.8.1.3) Gecko/20070515 Firefox/2.0.0.4";
// "1.5.0 on Mac OS X Mozilla/5.0 (Macintosh; U; Intel Mac OS X; en-US; rv:1.8.0.4) Gecko/20061213 Firefox/1.0.2";
// "Mozilla/5.0 (Windows; U; Windows NT 5.1; en-US; rv:1.8.1.4) Gecko/20070515 Firefox/2.0.0.4";
// "Mozilla/5.0 (Macintosh; U; Intel Mac OS X; en-US; rv:1.8.1.4) Gecko/20070515 Firefox/2.0.0.4";

/************************Screen Rippper constants******************************/
const patternHotmailLoginURL = /srf_uPost=['|"](.*?)["|']/i;
const patternHotmailSRBlob = /srf_sRBlob=['|"](.*?)["|']/i;
const patternHotmailSFT =/srf_sFT=.*?value=['|"](.*?)["|']/i;
const patternHotmailJavaRefresh = /location\.replace\("(.*?)"\)/i;
const patternHotmailRefresh2 = /window\.location=['|"](.*?)['|"]/i;

const patternHotmailLoginForm = /<form.*?name="fmHF".*?>[\S\s]*?<\/form>/i;
const patternHotmailForm = /<form[\S\s]*?>[\S\s]*?<\/form>/i;
const patternHotmailAction = /<form.*?action="(.*?)".*?>/i;
const patternHotmailInput = /<input[\s\S]*?>/igm;
const patternHotmailType = /type="(.*?)"/i;
const patternHotmailName = /name="(.*?)"/i;
const patternHotmailValue = /value="(.*?)"/i;
const patternHotmailUM = /_UM="(.*?)"/;
const patternHotmailQS = /g_QS="(.*?)"/i;
const patternHotmailComposer = /onclick="G\('(.*?compose\?.*?)'\);"/i;
const patternHotmailCompForm = /<form\s+name="composeform".*?>[\S\s]*?<\/form>/igm;
const patternHotmailAttForm = /<form\s+name="doattach".*?>[\S\s]*?<\/form>/igm
const patternHotmailAD = /<form.*?name="addtoAB".*?>/igm;
const patternHotmailSpamForm = /<form.*?forcehip.srf.*>/igm;
const patternHotmailSpamImage =/<img.*?src="(.*?hip\.srf.*?)".*?name="hipImage"\/>/i;
const patternHotmailBase = /<base href="(.*?)"\/>/i;
const patternHotmailCurmbox = /curmbox=(.*?)&/;
const patternHotmailLogout = /<td><a.*?href="(.*?\/cgi-bin\/logout\?curmbox=.*?").*?>/m;
const patternHotmailMailbox = /<a href="(\/cgi-bin\/HoTMaiL.*?)".*?tabindex=121.*?class="E">/;
const patternHotmailFolderBase = /document.location = "(.*?)"\+f/;
const patternHotmailSRFolderList =/href="javascript:G\('\/cgi-bin\/folders\?'\)"(.*?)<a href="javascript:G\('\/cgi-bin\/folders\?'\)"/;
const patternHotmailFolderLinks =/<a.*?>/g;
const patternHotmailTabindex =/tabindex="(.*?)"/i;
const patternHotmailTabTitle =/title="(.*?)"/i;
const patternHotmailHMFO =/HMFO\('(.*?)'\)/;
const patternHotmailMsgTable = /MsgTable.*?>(.*?)<\/table>/m;
const patternHotmailMultPageNum = /<select name="MultPageNum" onChange="window\.location\.href='(.*?)'\+_UM\+'(.*?)'.*?>(.*?)<\/select>/;
const patternHotmailPages = /<option value="(.*?)".*?>/g;
const patternHotmailEmailURL = /<a.*?href="javascript:G\('(.*?)'\)">/;
const patternHotmailEmailLength = /len=(.*?)&/;
const patternHotmailEmailID = /msg=(.*?)&/;
const patternHotmailSRRead = /msgread=1/gi;
const patternHotmailSRFrom =/<tr[\S\s]*name="(.*?)"><td>/i;




/*********BETA**********/
const patternHotmailSMTPForm = /<form.*?name="aspnetForm".*?>[\S\s]*?<\/form>/i;
const patternHotmailJSRefresh = /<html><head><script.*?>.*?\.location\.replace.*?\("(.*?)"\).*?<\/script>.*?<\/html>/i;
const patternHotmailJSRefreshAlt = /<head><meta http-equiv="REFRESH".*?content=".*?URL=(.*?)">.*?<\/head><\/html>/i;
const patternHotmailJSBounce = /srf_uRet="(.*?)"/i;
const patternHotmailLogOut = /"(.*?logout.aspx.*?)"/i;
const patternHotmailViewState = /__VIEWSTATE".*?value="(.*?)".*?\/>/i;
const patternHotmailInboxFolderID = /<td class="dManageFoldersFolderNameCol"><a href="(.*?\?FolderID=.*?1&.*?)".*?>/i;
const patternHotmailJunkFolderID = /<td class="dManageFoldersFolderNameCol"><a href="(.*?\?FolderID=.*?5&.*?)".*?>/i;
const patternHotmailFolderManager = /<a.*?href="(.*?ManageFolders.*?)".*?>/i;
const patternHotmailFolderList = /<td class="dManageFoldersFolderNameCol"><a.*?><\/td>/img;
const patternHotmailFolderTitle = /<a.*?>(.*?)<\/a>/i;
const patternHotmailFolderURL = /<a.*?"(.*?)">.*?<\/a>/i;
const patternHotmailFolderOption = /<option value=.*?>.*?<\/option>/ig;
const patternHotmailInboxContent = /<div id="inbox">/ig;
const patternHotmailInboxNoContent =/<div.*?ContentNoMsg.*?>/ig;
const patternHotmailCompose = /href="(.*?EditMessageLight.*?)"/i;
const patternHotmailSend = /href=".*?,'(.*?SendMessageLight.*?)'.*?"/i;
const patternHotmailAddAttachment = /href=".*?,'(.*?AddAttachmentLight.*?)'.*?"/i;
const patternHotmailLastAttachment = /href=".*?,'(.*?EditMessageLight.*?)'.*?"/i;
const patternHotmailNavDiv = /<div class="dItemListHeaderNav">([\s\S]*?)<div class="dItemListContent">/igm;
const patternHotmailNextPage = /href="(.*?Next&.*?)"/i;
const patternHotmailSentOK = /smcMainContentContainer/im;
const patternHotmailMailBoxTable = /<table.*?class="dItemListContentTable".*?>[\s\S]*?<tbody([\s\S]*?)<\/tbody>[\s\S]*?<\/table>/im;
const patternHotmailMailBoxTableRow = /<tr.*?>[\s\S]*?<\/tr>/ig;
const patternHotmailMailBoxTableData = /<td.*?>[\s\S]*?<\/td>/ig;
const patternHotmailEMailURL = /<td .*?><a href="(.*?)".*?>.*?<\/a><\/td>/i;
const patternHotmailEmailRead = /class="dInboxContentItemUnread">/i;
const patternHotmailEmailSender = /<td .*?><a.*?><div class="truncateFrom">(.*?)<\/div><\/a><\/td>/i;
const patternHotmailEmailSubject = /<td.*?>.*?<a href=.*?>(.*?)<\/a>.*?<\/td>/i;
const patternHotmailEmailDate = /<td.*?>(.*?)<\/td>/i;
const patternHotmailEMailID =/ReadMessageID=(.*?)&/i;
const patternHotmailFolderID = /FolderID=(.*?)$/i;
const patternHotmailFromBeta = /<select id="fromAddressDropdown".*?name="(.*?)"[\s\S]*<option value="(.*?)" selected>.*?<\/option>/im;
const patternHotmailMT = /mt=(.*?);/i;
const patternHotmailLight = /"(.*?TodayLight.aspx.*?)"/i;
