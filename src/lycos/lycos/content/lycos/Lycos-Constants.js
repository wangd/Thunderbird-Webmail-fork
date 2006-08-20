const kLycosConstants = true;

const kLycosSchema = "<?xml version=\"1.0\"?>\r\n<D:propfind xmlns:D=\"DAV:\" xmlns:h=\"http://schemas.microsoft.com/hotmail/\" xmlns:hm=\"urn:schemas:httpmail:\">\r\n<D:prop>\r\n<h:adbar/>\r\n<hm:contacts/>\r\n<hm:inbox/>\r\n<hm:outbox/>\r\n<hm:sendmsg/>\r\n<hm:sentitems/>\r\n<hm:deleteditems/>\r\n<hm:drafts/>\r\n<hm:msgfolderroot/>\r\n<h:maxpoll/>\r\n<h:sig/>\r\n</D:prop>\r\n</D:propfind>\r\n";
const kLycosFolderSchema = "<?xml version=\"1.0\"?>\r\n<D:propfind xmlns:D=\"DAV:\" xmlns:hm=\"urn:schemas:httpmail:\">\r\n<D:prop>\r\n<D:isfolder/>\r\n<D:displayname/>\r\n<hm:special/>\r\n<D:hassubs/>\r\n<D:nosubs/>\r\n<hm:unreadcount/>\r\n<D:visiblecount/>\r\n<hm:special/>\r\n</D:prop>\r\n</D:propfind>\r\n";
const kLycosMailSchema = "<?xml version=\"1.0\"?>\r\n<D:propfind xmlns:D=\"DAV:\" xmlns:hm=\"urn:schemas:httpmail:\" xmlns:m=\"urn:schemas:mailheader:\">\r\n<D:prop>\r\n<D:isfolder/>\r\n<hm:read/>\r\n<m:hasattachment/>\r\n<m:to/>\r\n<m:from/>\r\n<m:subject/>\r\n<m:date/>\r\n<D:getcontentlength/>\r\n</D:prop>\r\n</D:propfind>\r\n";
const kLycosReadSchema = "<?xml version=\"1.0\"?>\r\n<D:propertyupdate xmlns:D=\"DAV:\" xmlns:hm=\"urn:schemas:httpmail:\">\r\n<D:set>\r\n<D:prop>\r\n<hm:read>1</hm:read>\r\n</D:prop>\r\n</D:set>\r\n</D:propertyupdate>";                   
const kLycosUnReadSchema = "<?xml version=\"1.0\"?>\r\n<D:propertyupdate xmlns:D=\"DAV:\" xmlns:hm=\"urn:schemas:httpmail:\">\r\n<D:set>\r\n<D:prop>\r\n<hm:read>0</hm:read>\r\n</D:prop>\r\n</D:set>\r\n</D:propertyupdate>";

const kLycosResponse = /<D:response>[\S\d\s\r\n]*?<\/D:response>/gm;
const kLycosSize = /<D:getcontentlength>(.*?)<\/D:getcontentlength>/i;
const kLycosRead = /<hm:read>(.*?)<\/hm:read>/i;
const kLycosTo = /<m:to>(.*?)<\/m:to>/i;
const kLycosFrom = /<m:from>(.*?)<\/m:from>/i;
const kLycosSubject = /<m:subject>(.*?)<\/m:subject>/i;
const kLycosDate = /<m:date>(.*?)T(.*?)<\/m:date>/i;
const kLycosHref = /<D:href>(.*?)<\/D:href>/i;
const kLycosMSGID = /[^\/]+$/;
const kLycosSendMsg = /<hm:sendmsg>(.*?)<\/hm:sendmsg>/;
const kLycosFolder = /<hm:msgfolderroot>(.*?)<\/hm:msgfolderroot>/;
const kLycosFolderName = /folders\/(.*?)\//i;
const kLycosTrash = /<hm:deleteditems>(.*?)<\/hm:deleteditems>/;
const kLycosDisplayName = /<D:displayname>(.*?)<\/D:displayname>/i;
const kLycosSpecial = /<hm:special>(.*?)<\/hm:special>/;
const kLycosID = /<D:id>(.*?)<\/D:id>/i;
const kLycosUnreadCount = /<hm:unreadcount>(.*?)<\/hm:unreadcount>/;
const kLycosMsgCount = /<D:visiblecount>(.*?)<\/D:visiblecount>/;
