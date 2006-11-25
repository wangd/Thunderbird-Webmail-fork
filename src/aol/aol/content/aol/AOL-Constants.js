const kAOLConstants = true;

const patternAOLReplace = /parent\.location\.replace\("(.*?)"\);/i;
const patternAOLRedirect = /goToLoginUrl[\s\S]*snsRedir\("(.*?)"\)/i;
const patternAOLLoginForm = /<form.*?loginForm.*?>[\s\S]*<\/form>/igm;
const patternAOLAction = /<form.*?action="(.*?)".*?>/;
const patternAOLInput = /<input.*?>/igm;
const patternAOLType = /type="(.*?)"/i;
const patternAOLName = /name="(.*?)"/i;
const patternAOLValue = /value="(.*?)"/i;
const patternAOLVerify = /<body onLoad=".*?'(http.*?)'.*>/i;
const patternAOLPath = /gSuccessPath.*?"(.*?)";/i;
const patternAOLTarget = /gTargetHost.*?"(.*?)"/i;
const patternAOLSucessPath = /^(.*?\/)suite.aspx$/i;
const patternAOLHost = /Host.*?"(.*?)";/i;
const patternAOLMSGList = /gMessageButtonVisibility/i;
const patternAOLVersion =/var VERSION="(.*?)"/i;
const patternAOLUserID =/uid:(.*?)&/i;
const patternAOLPageNum = /info.pageCount\s=\s(.*?);/i;
const patternAOLMSGSender = /^fa[\s\S].*$/gmi;
const patternAOLMSGData = /MI\(.*?\);/igm;
const patternAOLMSGDataProcess =/MI\("(.*?)",.*?,"([\s\S]*)",(.*?),(.*?),.*?,.*?,(.*?),.*?\);/i;
const patternAOLURLPageNum = /page=(.*?)&/i;
const patternAOLLogout = /Logout\.aspx/i;
const patternAOLLogoutURL = /<div id="sns"><a.*?href="(.*?logout.*?)".*?>.*?<\/div>/i;
const patternAOLFolders =/FN\(.*?\);/igm
const patternAOLFolderName = /FN\("(.*?)",.*?\);/i
const patternAOLFolderNameURL = /folder=(.*?)&/i;
const patternAOLSend =/<form.*?name="SendForm".*?>[\s\S]*?<\/form>/igm;
const patternAOLSendCheck = /parent.HandleSendSaveResponse/igm;
const patternAOLSitedomain = /sitedomain.*?"(.*?)";/i;
const patternAOLSiteState = /siteState.*?"(.*?)";/i;
const patternAOLSeamless = /seamless.*?"(.*?)";/i;
