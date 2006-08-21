const kYahooConstants = true;

const patternYahooSecure = /<a href="(.*?https.*?login.*?)".*?>/;
const patternYahooLoginForm = /<form.*?name="login_form".*?>[\S\s]*?<\/form>/gm;
const patternYahooAction = /<form.*?action="(.*?)".*?>/;
const patternYahooInput = /<input.*?type=['|"]*hidden['|"]*.*?name=.*?value=[\s\S]*?>/igm;
const patternYahooLogInSpam = /<input type="hidden" name=".secdata" value=".*?">/igm;
const patternYahooSpanURI =/<td colspan="2">[\s\S]*?<img src="(https.*?)".*?>[\s\S]*?<img src=".*?error.gif.*?".*?>[\s\S]*?<\/td>/im;
const patternYahooFile = /<input.*?type="*file"*.*?name=.*?>/igm;
const patternYahooNameAlt = /name=['|"]*([\S]*)['|"]*/;
const patternYahooAltValue = /value=['|"]*([\S\s]*)['|"]*[\s]*>/;
const patternYahooRedirect = /<a href=['|"]*(.*?)['|"]*>/;
const patternYahooCompose = /location="*(http:\/\/.*?Compose\?YY=.*?)"*/i;
const patternYahooComposeForm = /<form.*?name="*Compose"*.*?>[\S\s]*?<\/form>/igm;
const patternYahooAttachmentForm = /<form.*?name="*Attachments"*.*?>[\S\s]*?<\/form>/igm;
const patternYahooAttachCheck = /javascript\:VirusScanResults\(0\)/igm;
const patternYahooImageVerifiaction = /<form.*?name=ImgVerification[\S\s]*?>[\s\S]*?<\/form>/igm;
const patternYahooImage = /<input.*?name="IMG".*?value="(.*?)">/i;
const patternYahooImageAction = /<form.*?name=ImgVerification.*?action="([\S\s]*?)">/i;
const PatternYahooLogout = /Logout/im; 
const patternYahooMSGIdTable = /<table id="datatable".*?>[\S\s]*?<\/table>/m;
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
const PatternYahooFoldersPart = /"(.*?ShowFolder\?box=.*?)"/gim;
const PatternYahooFolderURL =/'(.*?Folders\?YY.*?)'"/i;
const PatternYahooFolderBox = /box=(.*?)&/i;
const PatternYahooFolderBoxAlt = /box=(.*?)$/i;




/******************************  BETA ***************************************/
const kSendMessge = "<SOAP-ENV:Envelope xmlns:SOAP-ENV=\"http://schemas.xmlsoap.org/soap/envelope/\" xmlns:xsi=\"http://www.w3.org/1999/XMLSchema-instance\" xmlns:xsd=\"http://www.w3.org/1999/XMLSchema\" SOAP-ENV:encodingStyle=\"http://schemas.xmlsoap.org/soap/encoding/\"><SOAP-ENV:Body><m:SendMessage xmlns:m=\"urn:yahoo:ymws\"><param1><greq gve=\"8\"><gid>cg</gid></greq><message><to>TOADDRESS</to><bcc>BCCEMAILADDRESS</bcc><cc>-CCEMAILADDRESS</cc><from><addr>FROMADDRESS</addr></from><reply-to><addr>FROMADDRESS</addr></reply-to><body>EMAILBODY</body><subject>EMAILSUBJECT</subject></message></param1></m:SendMessage></SOAP-ENV:Body></SOAP-ENV:Envelope>";
const kLstMsgs = "<SOAP-ENV:Envelope xmlns:SOAP-ENV=\"http://schemas.xmlsoap.org/soap/envelope/\" xmlns:xsi=\"http://www.w3.org/1999/XMLSchema-instance\" xmlns:xsd=\"http://www.w3.org/1999/XMLSchema\" SOAP-ENV:encodingStyle=\"http://schemas.xmlsoap.org/soap/encoding/\"><SOAP-ENV:Body><m:LstMsgs xmlns:m=\"urn:yahoo:ymws\"><param1 startMid=\"0\" numMid=\"300\" startInfo=\"0\" numInfo=\"65\" startBody=\"0\" numBody=\"0\"><greq gve=\"8\" getUserData=\"true\" getMetaData=\"true\"><gid>cg</gid></greq><sortKey>date</sortKey><sortOrder>down</sortOrder><fi fname=\"folderName\"/></param1></m:LstMsgs></SOAP-ENV:Body></SOAP-ENV:Envelope>";
const kListFolders = "<SOAP-ENV:Envelope xmlns:SOAP-ENV=\"http://schemas.xmlsoap.org/soap/envelope/\" xmlns:xsi=\"http://www.w3.org/1999/XMLSchema-instance\" xmlns:xsd=\"http://www.w3.org/1999/XMLSchema\" SOAP-ENV:encodingStyle=\"http://schemas.xmlsoap.org/soap/encoding/\"><SOAP-ENV:Body><m:ListFolders xmlns:m=\"urn:yahoo:ymws\"><param1><greq gve=\"8\" ListFolders=\"true\" resetUnseen=\"true\"><gid>cg</gid></greq></param1></m:ListFolders></SOAP-ENV:Body></SOAP-ENV:Envelope>";
const kMSG = "<SOAP-ENV:Envelope xmlns:SOAP-ENV=\"http://schemas.xmlsoap.org/soap/envelope/\" xmlns:xsi=\"http://www.w3.org/1999/XMLSchema-instance\" xmlns:xsd=\"http://www.w3.org/1999/XMLSchema\" SOAP-ENV:encodingStyle=\"http://schemas.xmlsoap.org/soap/encoding/\"><SOAP-ENV:Body><m:GetMessageBodyPart xmlns:m=\"urn:yahoo:ymws\"><param1><greq gve=\"8\" gdk=\"1\"><gid>cg</gid></greq><fi fname=\"FOLDERNAME\"/><mid>MSGID</mid><truncateAt>102400000</truncateAt></param1></m:GetMessageBodyPart></SOAP-ENV:Body></SOAP-ENV:Envelope>";
const kMSGHeaders ="<SOAP-ENV:Envelope xmlns:SOAP-ENV=\"http://schemas.xmlsoap.org/soap/envelope/\" xmlns:xsi=\"http://www.w3.org/1999/XMLSchema-instance\" xmlns:xsd=\"http://www.w3.org/1999/XMLSchema\" SOAP-ENV:encodingStyle=\"http://schemas.xmlsoap.org/soap/encoding/\"><SOAP-ENV:Body><m:GetMessageRawHeader xmlns:m=\"urn:yahoo:ymws\"><param1><greq gve=\"8\"><gid>cg</gid></greq><fi fname=\"FOLDERNAME\"/><mid>MSGID</mid></param1></m:GetMessageRawHeader></SOAP-ENV:Body></SOAP-ENV:Envelope>";
const kDelete = "<SOAP-ENV:Envelope xmlns:SOAP-ENV=\"http://schemas.xmlsoap.org/soap/envelope/\" xmlns:xsi=\"http://www.w3.org/1999/XMLSchema-instance\" xmlns:xsd=\"http://www.w3.org/1999/XMLSchema\" SOAP-ENV:encodingStyle=\"http://schemas.xmlsoap.org/soap/encoding/\"><SOAP-ENV:Body><m:MoveMsgs xmlns:m=\"urn:yahoo:ymws\"><param1><greq gve=\"8\"><gid>cg</gid></greq><fi fname=\"FOLDERNAME\"/><tofi fname=\"Trash\"/><mid>MSGID</mid></param1></m:MoveMsgs></SOAP-ENV:Body></SOAP-ENV:Envelope>";
const kSeen = "<SOAP-ENV:Envelope xmlns:SOAP-ENV=\"http://schemas.xmlsoap.org/soap/envelope/\" xmlns:xsi=\"http://www.w3.org/1999/XMLSchema-instance\" xmlns:xsd=\"http://www.w3.org/1999/XMLSchema\" SOAP-ENV:encodingStyle=\"http://schemas.xmlsoap.org/soap/encoding/\"><SOAP-ENV:Body><m:SetMessageFlag xmlns:m=\"urn:yahoo:ymws\"><param1><greq gve=\"8\"><gid>cg</gid></greq><fi fname=\"FOLDERNAME\"/><mid>MSGID</mid><flag seen=\"1\"></flag></param1></m:SetMessageFlag></SOAP-ENV:Body></SOAP-ENV:Envelope>";
const kPatternSendMSGResponse = "<ymws:SendMessageResponse.*?>([\s\S]*?)<\/ymws:SendMessageResponse>";
const kPatternFolderResponse = /<ymws:ListFoldersResponse.*?>([\s\S]*?)<\/ymws:ListFoldersResponse>/i;
const kPatternLstMsgsResponse = /<ymws:LstMsgsResponse.*?>([\s\S]*?)<\/ymws:LstMsgsResponse>/i;
const kPatternLstHeadersResponse = /<ymws:GetMessageRawHeaderResponse.*?>([\s\S]*?)<\/ymws:GetMessageRawHeaderResponse>/i;
const kPatternLstBodyPartResponse = /<ymws:GetMessageBodyPartResponse.*?>([\s\S]*?)<\/ymws:GetMessageBodyPartResponse>/i;
const kPatternDeleteMSGResponse = /<ymws:MoveMsgsResponse.*?>([\s\S]*?)<\/ymws:MoveMsgsResponse.*?>/i;
const kPatternSeenMSGResponse = /<ymws:SetMessageFlagResponse.*?>([\s\S]*?)<\/ymws:SetMessageFlagResponse.*?>/i;
const kPatternWssid = /wssid.*?'(.*?)',/i;
const kPatternLogOut = /exit/ig;
const kPatternAttchUploadForm = /<form.*?id="upload_form".*?>([\s\S]*?)<\/form>/i;
const kPatternInput = /<input.*?type="hidden".*?>/igm;
const kPatternSpamImageURL = /<detail>(.*?)<\/detail>/i;
const kPatternGreq = /<greq.*?>(.*?)<\/greq>/i;
const kPatternWebserviceUrl = /webserviceUrl.*?'(.*?)',/i;
const kPatternInfo = /<minfo.*?>[\s\S]*?<\/minfo>/ig;
const kPatternData =/<fdata.*?>/igm;
const kPatternFolderName =/\sfname="(.*?)"/i;
const kPatternSeen = /seen="(.*?)"/i;
const kPatternID = /<mid>(.*?)<\/mid>/i;
const kPatternSize = /msize="(.*?)"/i;
const kPatternFolder = /mfolder="(.*?)"/i;
const kPatternHeader = /<mhd>(.*?)<\/mhd>/i;
const kPatternPart = /<part.*?>[\s\S]*?<\/part>/img;
const kPatternPartID = /partId="(.*?)"/i;
const kPatternPartText = /<text>(.*?)<\/text>/i;
const kPatternPartType =/ type="(.*?)"/i;
const kPatternPartTypeParams =/typeParams="(.*?)"/i;
const kPatternPartSubType =/subType="(.*?)"/i;
const kPatternPartDispParam =/dispParams="(.*?)"/i;
const kPatternPartId = /partId="(.*?)"/i;
const kPatternFileName = /filename=(.*?)$/i
