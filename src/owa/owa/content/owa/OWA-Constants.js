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
const kOWAMSGSize = /[<b>]?(\d*?)&nbsp;[a-z,A-Z]{1,}[<\/b>]?/i;
const KNextPage = /<A href="(.*?Page=.*?)".*?Next.*?>/i;
const KTextArea = /<TEXTAREA.*?>([\s\S]*?)<\/TEXTAREA>/gi;
const kOWAPageNum = /<TD.*?><FONT.*?><B>&nbsp;[a-z,A-Z]*?&nbsp;([\d]*).*?<\/B><\/FONT><\/TD>/i;
const kOWAAttchForm =/<FORM NAME=['|"]attachForm['|"][\s\S]*?<\/FORM>/i;
const kOWAEdit =/href=['|"](.*?Cmd=edit.*?)["|']/i