cd "C:\Documents and Settings\Andrew\My Documents\My Projects\webmail\src\web-mail\components\"

copy nsWebmailCookieManager.js C:\gecko-sdk\bin\

copy nsIWebmailCookieManager.idl C:\gecko-sdk\bin\

cd c:\gecko-sdk\bin

call xpidl.exe -m typelib -w -v -I c:\gecko-sdk\idl\ nsIWebmailCookieManager.idl

cd "C:\Documents and Settings\Andrew\My Documents\My Projects\webmail\src\web-mail\components\"

copy C:\gecko-sdk\bin\nsIWebmailCookieManager.xpt nsIWebmailCookieManager.xpt

del C:\gecko-sdk\bin\nsIWebmailCookieManager.xpt

del C:\gecko-sdk\bin\nsWebmailCookieManager.js

del C:\gecko-sdk\bin\nsIWebmailCookieManager.idl
