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

			try  {
				this.m_DomainManager = Components.classes["@mozilla.org/DomainManager;1"].getService().QueryInterface(Components.interfaces.nsIDomainManager);
			}
			catch(err) {
				window.removeEventListener("load", function() {gGMailStartUp.init();} , false);
				throw new Error("Domain Manager Not Found");
			}

			this.m_Timer = Components.classes["@mozilla.org/timer;1"].createInstance(Components.interfaces.nsITimer); 
			this.m_Timer.initWithCallback(this, 2000, Components.interfaces.nsITimer.TYPE_REPEATING_SLACK);
			this.m_Log.Write("GMail.js : GMailStartUp - DB not loaded");

			window.removeEventListener("load", function() {gGMailStartUp.init();} , false);
			this.m_Log.Write("GMail.js : GMailStartUP - END ");
		}
		catch(e) {
			this.m_Log.DebugDump("GMail.js : Exception in GMailStartUp " + e.name + ".\nError message: " + e.message);
		}
	},

	notify: function(timer)
	{
		try {
			this.m_Log.Write("GMail.js : TimerCallback -  START");

			if( !this.m_DomainManager.isReady() ) {
				this.m_Log.Write("GMail.js : TimerCallback -  db not ready");
				return;
			}
			timer.cancel();

			//get store ids
			this.idCheck("gmail.com", "POP", cszGMailPOPContentID);
			this.idCheck("gmail.com", "SMTP", cszGMailSMTPContentID);
            this.idCheck("googlemail.com", "POP", cszGMailPOPContentID);
            this.idCheck("googlemail.com", "SMTP", cszGMailSMTPContentID);

			this.m_Log.Write("GMail.js : TimerCallback - END");
		}
		catch(e) {
			this.m_Log.DebugDump("GMail.js : TimerCallback - Exception in notify : " + e.name + ".\nError message: " + e.message);
		}
	},

	idCheck : function(szDomain, szProtocol, szGMailContentID)
	{
		this.m_Log.Write("GMail.js : idCheck - START");
		this.m_Log.Write("GMail.js : idCheck - " +szDomain + " " + szProtocol+ " " + szGMailContentID);

		var szContentID = new Object;
		if (this.m_DomainManager.getDomainForProtocol(szDomain,szProtocol, szContentID)) {
			this.m_Log.Write("GMail.js : idCheck - found");
			if (szContentID.value != szGMailContentID) {
				this.m_Log.Write("GMail.js : idCheck - wrong id");
				this.m_DomainManager.newDomainForProtocol(szDomain, szProtocol, szGMailContentID);
			}
		} else {
			this.m_Log.Write("GMail.js : idCheck - not found");
			this.m_DomainManager.newDomainForProtocol(szDomain, szProtocol, szGMailContentID);
		}

		this.m_Log.Write("GMail.js : idCheck - END");
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

