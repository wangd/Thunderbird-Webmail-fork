const PatternGMailGetSessionCookie = /GMAIL_AT=(.*?);/i
const PatternGMailGetLoginCookie = /.*GX=(.*);/
const PatternGMailNextMSGTable = /D\(\["ts",(.*?),(.*?),(.*?),.*?,.*?,(.*?),.*?,.*?,.*?,.*?,.*?\]/i;
const PatternGMailMSGTable = /D\(\["t",\[[\s\S]*?^\);/igm;
const PatternGMailMSGData = /\["(.*?)",(\d),(\d),".*?","(.*?)",.*?,.*?,.*?,\[(.*?)\]/i;
const PatternGMailThreadTable = /D\(\["mi",[\s\S]*?\);/igm;
const PatternGMailThreadData = /\["mi",(\d+),(\d+),"(.*?)",(\d),".*?",".*?",".*?","(.*?)",/i;
const PatternGMailThreadLabels = /D\(\["cs",.*?,.*?,.*?,.*?,\[(.*?)\]/i;
const PatternGMailThreadID = /\["(.*?)",\d,\d,".*?",".*?",".*?",".*?",".*?","(.*?)",\d,".*?",\d,".*?",\d,\d,\d\]/i;
const PatternGMailThread = /.*?\((\d+)\)/;
const PatternGMailNewMessagesIDsStep1 = /\[\"([\da-fA-F]*)\"/g
const PatternGMailNewMessagesIDsStep2 = /\[\"([\da-fA-F]*)\"/
const patternGMailLoginRedirect = /CheckCookie\?continue=(.*?)';/i
const patternGMailLoginBounce = /<meta http-equiv="Refresh" content="0;URL=(.*?)">/;
const PatternGMailRFCMsg = /X-Gmail-Received.*/;
const PatternGmailConstants = true;