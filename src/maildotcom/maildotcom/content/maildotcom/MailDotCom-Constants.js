const kMailDotComConstants = true;

const patternMailDotComLoginForm =/<form.*?>[\S\s]*?<\/form>/igm;
const patternMailDotComLoginURI = /action="(.*?)"/;
const patternMailDotComLoginInput = /<input.*?type=(?!"submit").*?>/igm;
const patternMailDotComType = /type="(.*?)"/i;
const patternMailDotComValue = /value=\s?['??|"??](\S*)['??|"??]/i;
const patternMailDotComName = /name=\s?["??|'??](\S*)["??|'??]/i;
const patternMailDotComFrame = /<frame.*?src="(.*?)".*?name="mailcomframe".*?>/i;
const patternMailDotComFolders = /href=['|"](.*?folders.mail.*?)['|"]/i;
//const patternMailDotComFoldersAlt = /href='(.*?folders.mail.*?)'/i;
const patternMailDotComFolderList = /href=".*?".*?class="fb"/gm;
const patternMailDotComFolderURI= /href="(.*?)"/;
const patternMailDotComFolderName=/folder=(.*?)&/i;
const patternMailDotComAddURI = /document.location.href="(.*?)"/;
const patternMailDotComMsgTable = /<tbody>[\S\s]*<\/tbody>/igm;
const patternMailDotComNext = /<a href="(.*?mailbox.mail.*?)" class="fl">Next<\/a>/;
const patternMailDotComDelete = /<form action="(\/scripts\/mail\/mailbox.mail\?.ob=.*?)" method="POST" name="inBoxMessages">/;
const patternMailDotComMsgRows = /<tr.*?>[\S\s\n]*?<\/tr>/igm;
const patternMailDotComMsgData = /<td.*?>[\S\s\n]*?<\/td>/igm;
const patternMailDotComHref = /href="(.*?)"/i;
const patternMailDotComSize = />(.*?)</;
const patternMailDotComMsgId = /msg_uid=(.*?)&/;
const patternMailDotComMSG =/<body bgcolor="#ffffff">([\s\S]*)<div id="pbl">/;
const patternMailDotComHeaders = /<p>([\s\S]*?)<\/p>/;
const patternMailDotComOtherHeaderData = /<B>(.*?)<\/B>([\s\S]*?)$/i;
const patternMailDotComUnRead = /ib_unread/;
const patternMailDotComComposeButtonForm = /<form.*?>[\s\S]*?<input type="button".*?compose.*?>[\s\S]*?<\/form>/igm;
const patternMailDotComComposerURI = /'(.*?compose.*?)'/i;
const patternMailDotComComposeForm = /<form.*?composeForm.*?>[\s\S]*<\/form>/igm;
const patternMailDotComAttachForm = /<form.*?attachmentForm.*?>[\s\S]*<\/form>/igm;
const patternMailDotComInput = /<input.*?>/igm;
