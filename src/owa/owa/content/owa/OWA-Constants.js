const kOWAConstants = true;
const kOWAForm = /(<FORM[\s\S]*?<\/FORM>)/i;
const kOWAInput =/<INPUT.*?>/gmi;
const kOWAAction = /<FORM[\s\S]*?action=['|"](.*?)['|"][\s\S]*?>/i;
const kOWAAction2 = /ACTION=["|'](.*?)['|"]/i;
const kOWAType = /type=['|"](.*?)['|"]/i;
const kOWAName = /name=["|'](.*?)['|"]/i;
const kOWAValue = /value=["|'](.*?)['|"]/i;
const kBaseURL = /<BASE href="(.*?)">/i;
const kMailBoxURL = /<FRAME.*?name="viewer".*?src="(.*?)".*?>/i;
const kMSGData = /<TR><TD class=List.*?><INPUT TYPE=checkbox.*?NAME=MsgID value=".*?"><\/TD>.*?<\/TR>/gi;
const kOWAMSGURL = /href="(.*?")/i;
const kOWAMSGID = /<INPUT.*?NAME=MsgID.*?value="(.*?)">/i;
const kOWAMSGSize = /(?:<b>)?(\d*?)&nbsp;([a-zA-Z]{1,})(?:<\/b>)?/i;
const KNextPage = /<A href="(.*?Page=.*?)".*?Next.*?>/i;
const KTextArea = /<TEXTAREA.*?>([\s\S]*?)<\/TEXTAREA>/gi;
const kOWAPageNum = /<TD.*?><FONT.*?><B>&nbsp;[a-z,A-Z]*?&nbsp;([\d]*).*?<\/B><\/FONT><\/TD>/i;
const kOWAAttchForm =/<FORM NAME=['|"]attachForm['|"][\s\S]*?<\/FORM>/i;
const kOWAEdit =/href=['|"](.*?Cmd=edit.*?)["|']/i;
const kOWABase =/<BASE.*?href="(.*?)".*?>/i;


/************************Webdav constants *************************************/
const OWASchema = "<?xml version=\"1.0\"?>\r\n<D:propfind xmlns:D=\"DAV:\" xmlns:h=\"http://schemas.microsoft.com/hotmail/\" xmlns:hm=\"urn:schemas:httpmail:\">\r\n<D:prop>\r\n<h:adbar/>\r\n<hm:contacts/>\r\n<hm:inbox/>\r\n<hm:outbox/>\r\n<hm:sendmsg/>\r\n<hm:sentitems/>\r\n<hm:deleteditems/>\r\n<hm:drafts/>\r\n<hm:msgfolderroot/>\r\n<h:maxpoll/>\r\n<h:sig/>\r\n</D:prop>\r\n</D:propfind>";
const OWAFolderSchema = "<?xml version=\"1.0\"?>\r\n<D:propfind xmlns:D=\"DAV:\" xmlns:hm=\"urn:schemas:httpmail:\">\r\n<D:prop>\r\n<D:isfolder/>\r\n<D:displayname/>\r\n<hm:special/>\r\n<D:hassubs/>\r\n<D:nosubs/>\r\n<hm:unreadcount/>\r\n<D:visiblecount/>\r\n<hm:special/>\r\n</D:prop>\r\n</D:propfind>";
//const OWAMailSchema = "<?xml version=\"1.0\"?>\r\n<D:propfind xmlns:D=\"DAV:\" xmlns:hm=\"urn:schemas:httpmail:\" xmlns:m=\"urn:schemas:mailheader:\">\r\n<D:prop>\r\n<D:isfolder/>\r\n<hm:read/>\r\n<m:hasattachment/>\r\n<m:to/>\r\n<m:from/>\r\n<h:fromaddr/>\r\n<m:subject/>\r\n<m:date/>\r\n<D:getcontentlength/>\r\n</D:prop>\r\n</D:propfind>";
const OWAMailSchema = "<?xml version=\"1.0\"?>\r\n<D:propfind xmlns:D=\"DAV:\" xmlns:hm=\"urn:schemas:httpmail:\" xmlns:m=\"urn:schemas:mailheader:\">\r\n<D:prop>\r\n<D:isfolder/>\r\n<hm:read/>\r\n<m:hasattachment/>\r\n<m:to/>\r\n<m:from/>\r\n<m:subject/>\r\n<m:date/>\r\n<D:getcontentlength/>\r\n</D:prop>\r\n</D:propfind>";
const OWAReadSchema = "<?xml version=\"1.0\"?>\r\n<D:propertyupdate xmlns:D=\"DAV:\" xmlns:hm=\"urn:schemas:httpmail:\">\r\n<D:set>\r\n<D:prop>\r\n<hm:read>1</hm:read>\r\n</D:prop>\r\n</D:set>\r\n</D:propertyupdate>";
const OWAUnReadSchema = "<?xml version=\"1.0\"?>\r\n<D:propertyupdate xmlns:D=\"DAV:\" xmlns:hm=\"urn:schemas:httpmail:\">\r\n<D:set>\r\n<D:prop>\r\n<hm:read>0</hm:read>\r\n</D:prop>\r\n</D:set>\r\n</D:propertyupdate>";

const patternOWAResponse = /<a:response>[\S\s]*?<\/a:response>/gm; //const patternOWAResponse = /<D:response>[\S\s]*?<\/D:response>/gm;
const patternOWASendMsg = /<e:sendmsg>(.*?)<\/e:sendmsg>/; //const patternOWASendMsg = /<hm:sendmsg>(.*?)<\/hm:sendmsg>/;
const patternOWAMSGID = /[^\/]+$/;
const patternOWAHref = /<a:href>(.*?)<\/a:href>/; //const patternOWAHref = /<D:href>(.*?)<\/D:href>/;
const patternOWARead = /<d:read b:dt="boolean">(.*?)<\/d:read>/i; //const patternOWARead = /<hm:read>(.*?)<\/hm:read>/i;
const patternOWASize = /<a:getcontentlength b:dt="int">(.*?)<\/a:getcontentlength>/;// const patternOWASize = /<D:getcontentlength>(.*?)<\/D:getcontentlength>/;
const patternOWATo = /<e:to>(.*?)<\/e:to>/i; //const patternOWATo = /<m:to>(.*?)<\/m:to>/i;
const patternOWAFrom = /<e:from>(.*?)<\/e:from>/i;// const patternOWAFrom = /<m:from>(.*?)<\/m:from>/i;
const patternOWAFromAddr = /<e:fromaddr>(.*?)<\/e:fromaddr>/i;//const patternOWAFromAddr = /<h:fromaddr>(.*?)<\/h:fromaddr>/i;
const patternOWASubject = /<e:subject>(.*?)<\/e:subject>/i;//const patternOWASubject = /<m:subject>(.*?)<\/m:subject>/i;
const patternOWADate = /<e:date>(.*?)T(.*?)<\/e:date>/i; //const patternOWADate = /<m:date>(.*?)T(.*?)<\/m:date>/i;
const patternOWAFolder = /<e:msgfolderroot>(.*?)<\/e:msgfolderroot>/; //const patternOWAFolder = /<hm:msgfolderroot>(.*?)<\/hm:msgfolderroot>/;
const patternOWASpecial = /<d:special>(.*?)<\/d:special>/; //const patternOWASpecial = /<hm:special>(.*?)<\/hm:special>/;
const patternOWADisplayName = /<a:displayname>(.*?)<\/a:displayname>/i; //const patternOWADisplayName = /<D:displayname>(.*?)<\/D:displayname>/i;
const patternOWAUnreadCount = /<d:unreadcount>(.*?)<\/d:unreadcount>/; //const patternOWAUnreadCount = /<hm:unreadcount>(.*?)<\/hm:unreadcount>/;
const patternOWAMsgCount = /<a:visiblecount>(.*?)<\/a:visiblecount>/; //const patternOWAMsgCount = /<D:visiblecount>(.*?)<\/D:visiblecount>/;
const patternOWATrash = /<e:deleteditems>(.*?)<\/e:deleteditems>/; //const patternOWATrash = /<hm:deleteditems>(.*?)<\/hm:deleteditems>/;
const patternOWAFolderName = /\/([^\/]*?)[\/]*$/i; //const patternOWAFolderName = /folders\/(.*?)\//i;
const patternOWAIsFolder = /<a:isfolder b:dt="boolean">1<\/a:isfolder>/;
