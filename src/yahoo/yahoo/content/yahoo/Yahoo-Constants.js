const kYahooConstants = true;

const patternYahooSecure = /<a href="(.*?https.*?login.*?)".*?>/;
const patternYahooLoginForm = /<form.*?name="login_form".*?>[\S\s]*?<\/form>/gm;
const patternYahooAction = /<form.*?action="(.*?)".*?>/;
const patternYahooInput = /<input.*?type=['|"]*hidden['|"]*.*?name=.*?>/igm;
const patternYahooLogInSpam = /<input type="hidden" name=".secdata" value=".*?">/igm;
const patternYahooSpanURI =/<td colspan="2">[\s\S]*?<img src="(https.*?)".*?>[\s\S]*?<img src=".*?error.gif.*?".*?>[\s\S]*?<\/td>/im;
const patternYahooFile = /<input.*?type="*file"*.*?name=.*?>/igm;
const patternYahooNameAlt = /name=['|"]*([\S]*)['|"]*/;
const patternYahooAltValue = /value=['|"]*([\S\s]*)['|"]*[\s]*>/;
const patternYahooRedirect = /<a href=['|"]*(.*?)['|"]*>/;
const patternYahooCompose = /location=['|"](http:\/\/.*?Compose\?YY=.*?)['|"]/i;
const patternYahooComposeForm = /<form.*?name="*Compose"*.*?>[\S\s]*?<\/form>/igm;
const patternYahooAttachmentForm = /<form.*?name="*Attachments"*.*?>[\S\s]*?<\/form>/igm;
const patternYahooAttachCheck = /javascript\:VirusScanResults\(0\)/igm;
const patternYahooImageVerifiaction = /<form.*?name=ImgVerification[\S\s]*?>[\s\S]*?<\/form>/igm;
const patternYahooImage = /<input.*?name="IMG".*?value="(.*?)">/i;
const patternYahooImageAction = /<form.*?name=ImgVerification.*?action="([\S\s]*?)">/i;
const PatternYahooLogout = /Logout/im;
const patternYahooShowFolder = /ShowFolder/igm;
const patternYahooMSGIdTable = /<table id="datatable"[\S\s]*?>[\S\s]*?<\/table>/m;
const patternYahooMsgRow = /<tr.*?>[\S\s]*?<\/tr>/gm;
const patternYahooMsgID = /href="(.*?MsgId.*?)"/;
const patternYahooMsgSize = /<td.*?>.*?<\/td>/gm;
const patternYahooNextPage = /<a href=".*?next=1.*?">/m;
const patternYahooNextURI = /<a href=["|']*(.*?)["|']*>/
const PatternYahooID =/MsgId=(.*?)&/;
const PatternYahooDeleteForm = /<form name=messageList.*?>[\S\s]*?<\/form>/;
const PatternYahooDeleteURL = /action="(.*?)"/;
const PatternYahooDeleteInput = /<input.*?hidden.*?>/gm;
const PatternYahooBox =/(box=.*?)#/;
const PatternYahooBoxAlt =/(box=.*?)$/;
const PatternYahooUnRead = /msgnew/;
const PatternYahooFolders = /".*?ShowFolder\?box=.*?"/gim;
const PatternYahooFoldersPart = /"(.*?ShowFolder\?box=.*?)"/i;
const PatternYahooFolderURL =/\[.*?id="addfoldercontrol"[\s\S]*?\-[\s\S]*?href="(.*?Folders\?.*?)"[\s\S]*?\]/i;
const PatternYahooFolderName= /box=(.*?)&/i;
const PatternYahooFolderBox = /box=(.*?)$/i;

//new classic
const patternYahooClassicMsgRow = /<tr.*?[msgold|msgnew].*?>[\S\s]*?<\/tr>/igm;
const patternYahooMsgIDAlt =/href="(.*?mid.*?)"/;
const PatternYahooFoldersAlt = /href=".*?ShowFolder\?fid=.*?"/gim;
const PatternYahooFoldersPartAlt = /href="(.*?ShowFolder\?fid=.*?)"/i;
const PatternYahooIDAlt =/mid=(.*?)&/;
const PatternYahooBoxAlt2=/(fid=.*?)&/;
const PatternYahooFolderNameAlt= /fid=(.*?)&/i;
const PatternYahooFolderBoxAlt = /fid=(.*?)$/i;
const PatternYahooCrumb =/mcrumb=(.*?)&/i;
const patternYahooNextPageAlt = /<span class="offscreen">.*?href="(.*?startMid=.*?)">/im;
const patternYahooComposeURLForm = /<form.*?compose.*?>[\s\S]*?<\/form>/igm;
const patternYahooClassicName = /name=['|"]([\S\s]*?)['|"]/i;
const patternYahooClassicValue = /value=['|"]([\S\s]*?)['|"]/i;
const patternYahooClassicAttForm = /<form.*?id="attach_form0"[\S\s]*?>[\S\s]*?<\/form>/igm;
const patternYahooClassicAction = /action="(.*?)"/;
const patternYahooClassicAttCheck = /errorFlag.*?=.*?false;/igm;
const patternYahooClassicAttDetails = /fileDetails.*?=.*?["|'](.*?)["|'];/im;

/******************************  BETA ***************************************/
const kPatternWssid = /[']?wssid[']?.*?'(.*?)',/i;
const kPatternLogOut = /LoggedInAs/ig;

const kListFolders = "<SOAP-ENV:Envelope xmlns:SOAP-ENV=\"http://schemas.xmlsoap.org/soap/envelope/\" xmlns:xsi=\"http://www.w3.org/1999/XMLSchema-instance\" xmlns:xsd=\"http://www.w3.org/1999/XMLSchema\" SOAP-ENV:encodingStyle=\"http://schemas.xmlsoap.org/soap/encoding/\"><SOAP-ENV:Body><m:ListFolders xmlns:m=\"urn:yahoo:ymws\"><param1><greq gve=\"8\" ListFolders=\"true\" resetUnseen=\"true\"><gid>cg</gid></greq></param1></m:ListFolders></SOAP-ENV:Body></SOAP-ENV:Envelope>";
const kPatternFolderResponse = /<ListFoldersResponse.*?>([\s\S]*?)<\/ListFoldersResponse>/i;
const kPatternFolderData =  /<folder.*?>[\s\S]*?<\/folder>/img;
const kPatternFolderName =/name="(.*?)"/i;
const kPatternFolderID =/fid="(.*?)"/i;

const kLstMsgs = "<SOAP-ENV:Envelope xmlns:SOAP-ENV=\"http://schemas.xmlsoap.org/soap/envelope/\" xmlns:xsi=\"http://www.w3.org/1999/XMLSchema-instance\" xmlns:xsd=\"http://www.w3.org/1999/XMLSchema\" SOAP-ENV:encodingStyle=\"http://schemas.xmlsoap.org/soap/encoding/\"><SOAP-ENV:Body><ListMessages startMid=\"0\" numMid=\"300\" startInfo=\"0\" numInfo=\"65\" startBody=\"0\" numBody=\"0\"><sortKey>date</sortKey><sortOrder>down</sortOrder><fid>folderName</fid></ListMessages></SOAP-ENV:Body></SOAP-ENV:Envelope>";
const kPatternLstMsgsResponse = /<ListMessagesResponse.*?>([\s\S]*?)<\/ListMessagesResponse>/i;
const kPatternInfo = /<messageInfo.*?>[\s\S]*?<\/messageInfo>/ig;
const kPatternID = /mid="(.*?)"/i;
const kPatternSize = /size="(.*?)"/i;
const kPatternSeen = /isRead="(.*?)"/i;
const kPatternFolderInfo =/<folderInfo[\s\S]*?\/>/i;

const kMSGHeaders ="<SOAP-ENV:Envelope xmlns:SOAP-ENV=\"http://schemas.xmlsoap.org/soap/envelope/\" xmlns:xsi=\"http://www.w3.org/1999/XMLSchema-instance\" xmlns:xsd=\"http://www.w3.org/1999/XMLSchema\" SOAP-ENV:encodingStyle=\"http://schemas.xmlsoap.org/soap/encoding/\"><SOAP-ENV:Body><m:GetMessageRawHeader xmlns:m=\"urn:yahoo:ymws\"><fid>FOLDERNAME<\/fid><mid>MSGID</mid></m:GetMessageRawHeader></SOAP-ENV:Body></SOAP-ENV:Envelope>";
const kPatternLstHeadersResponse = /<GetMessageRawHeaderResponse.*?>([\s\S]*?)<\/GetMessageRawHeaderResponse>/i;
const kPatternHeader = /<rawheaders>([\s\S]*?)<\/rawheaders>/im;

const kMSG = "<SOAP-ENV:Envelope xmlns:SOAP-ENV=\"http://schemas.xmlsoap.org/soap/envelope/\" xmlns:xsi=\"http://www.w3.org/1999/XMLSchema-instance\" xmlns:xsd=\"http://www.w3.org/1999/XMLSchema\" SOAP-ENV:encodingStyle=\"http://schemas.xmlsoap.org/soap/encoding/\"><SOAP-ENV:Body><m:GetMessage xmlns:m=\"urn:yahoo:ymws\"><fid>FOLDERNAME<\/fid><message><mid>MSGID</mid><\/message><truncateAt>102400000</truncateAt></m:GetMessage></SOAP-ENV:Body></SOAP-ENV:Envelope>";
const kPatternLstBodyPartResponse = /<GetMessageResponse>([\s\S]*?)<\/GetMessageResponse>/i;
const kPatternLongPart =/<part.*?>[\s\S]*?<\/part>/img;
const kPatternShortPart = /<part.*?\/>/igm;
const kPatternPartID = /partId="(.*?)"/i;
const kPatternPartText = /<text>([\s\S]*?)<\/text>/im;
const kPatternPartType =/ type="(.*?)"/i;
const kPatternPartTypeParams =/typeParams="(.*?)"/i;
const kPatternPartSubType =/subType="(.*?)"/i;
const kPatternPartDispParam =/dispParams="(.*?)"/i;
const kPatternPartId = /partId="(.*?)"/i;
const kPatternFileName = /filename=(.*?)$/i;
const kPatternContentId = /contentId="(.*?)"/i;

const kSeen = "<SOAP-ENV:Envelope xmlns:SOAP-ENV=\"http://schemas.xmlsoap.org/soap/envelope/\" xmlns:xsi=\"http://www.w3.org/1999/XMLSchema-instance\" xmlns:xsd=\"http://www.w3.org/1999/XMLSchema\" SOAP-ENV:encodingStyle=\"http://schemas.xmlsoap.org/soap/encoding/\"><SOAP-ENV:Body><m:FlagMessages xmlns:m=\"urn:yahoo:ymws\"><fid>FOLDERNAME<\/fid><mid>MSGID</mid><setFlags read=\"1\"></setFlags></m:FlagMessages></SOAP-ENV:Body></SOAP-ENV:Envelope>";
const kPatternSeenMSGResponse = /<ymws:SetMessageFlagResponse.*?>([\s\S]*?)<\/ymws:SetMessageFlagResponse.*?>/i;

const kDelete = "<SOAP-ENV:Envelope xmlns:SOAP-ENV=\"http://schemas.xmlsoap.org/soap/envelope/\" xmlns:xsi=\"http://www.w3.org/1999/XMLSchema-instance\" xmlns:xsd=\"http://www.w3.org/1999/XMLSchema\" SOAP-ENV:encodingStyle=\"http://schemas.xmlsoap.org/soap/encoding/\"><SOAP-ENV:Body><m:MoveMessages xmlns:m=\"urn:yahoo:ymws\"><sourceFid>FOLDERNAME</sourceFid><destinationFid>Trash</destinationFid><mid>MSGID</mid></m:MoveMessages></SOAP-ENV:Body></SOAP-ENV:Envelope>";
const kPatternDeleteMSGResponse = /<MoveMessagesResponse.*?>([\s\S]*?)<\/MoveMessagesResponse.*?>/i;

const kSendMessge = "<SOAP-ENV:Envelope xmlns:SOAP-ENV=\"http://schemas.xmlsoap.org/soap/envelope/\" xmlns:xsi=\"http://www.w3.org/1999/XMLSchema-instance\" xmlns:xsd=\"http://www.w3.org/1999/XMLSchema\" SOAP-ENV:encodingStyle=\"http://schemas.xmlsoap.org/soap/encoding/\"><SOAP-ENV:Body><m:SendMessage xmlns:m=\"urn:yahoo:ymws\"><message>TOADDRESS-BCCEMAILADDRESS-CCEMAILADDRESS<from><name>FROMNAME</name><email>FROMADDRESS</email></from><simplebody>EMAILBODY</simplebody><subject>EMAILSUBJECT</subject></message></m:SendMessage></SOAP-ENV:Body></SOAP-ENV:Envelope>";
const kPatternSendMSGResponse = /<SendMessageResponse.*?>/i;
const kPatternDiskFileName =/diskfilename=(.*?)&/i;

const kPatternSpamImageURL = /<imageurl>(.*?)<\/imageurl>/igm;
const kPatternGreq = /<greq.*?>(.*?)<\/greq>/i;


const kPatternBTBounce = /window.location.replace\('(.*?redir_now.*?)'\);/i;