const cszGMailPOPContentID = "@mozilla.org/GMailPOP;1";
const cszGMailSMTPContentID = "@mozilla.org/GMailSMTP;1";

window.addEventListener("load", function() {gGMailStartUp.init();} , false);

var gGMailStartUp =
{
	m_DomainManager : null,
	m_Log : null,
	m_Timer : null,

	init : function ()
	{
		try {
			//create debug log global 
			this.m_Log = new DebugLog("webmail.logging.comms", "{3c8e8390-2cf6-11d9-9669-0800200c9a66}", "GMail");

			this.m_Log.Write("GMail.js : GMailStartUp - START");

			var iCount = this.windowCount();
			if (iCount >1) {
				this.m_Log.Write("GMail.js : - another window - END");
				return;
			}
		}
		catch(e) {
			this.m_Log.DebugDump("GMail.js : Exception in GMailStartUp " + e.name + ".\nError message: " + e.message);
		}
	},

	windowCount : function()
	{
		try {
			this.m_Log.Write("GMail.js : windowCount - START");
			
			var iWindowCount = 0;
			var winman = Components.classes["@mozilla.org/appshell/window-mediator;1"];
			winman = winman.getService(Components.interfaces.nsIWindowMediator);
			var e = winman.getEnumerator(null);

			while ( e.hasMoreElements() ) {
				var win = e.getNext();
				win.QueryInterface(Components.interfaces.nsIDOMWindowInternal);
				var szValue = win.document.documentElement.getAttribute("id");
				this.m_Log.Write("GMail.js : windowCount - "+ szValue);
				if (szValue =="messengerWindow")
					iWindowCount++;
			}
			this.m_Log.Write("GMail.js : windowCount - "+ iWindowCount +" END ");
			return iWindowCount;
		}
		catch(e) {
			this.m_Log.DebugDump("GMail.js : Exception in shutDown " + e.name + ".\nError message: " + e.message);
		}
	},
};