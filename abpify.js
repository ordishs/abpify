;(function($){	
	$.fn.abpify = function(options){
		
		var defaults = {
			showDebug: false
		};

		var o = {};
		$.extend(o, defaults, options);
		
		ABPIFY.showDebug = o.showDebug;

		return this.each(function() {

			var form = '<input type="text" name="url" id="abpify_url" size="33" maxlength="33" placeholder="url" />';
			form += '<input type="text" name="username" id="abpify_username" size="20" maxlength="20" placeholder="user name" />';
			form += '<input type="password" name="password" id="abpify_password" size="20" maxlength="20" placeholder="password" />';
			form += '<input type="button" id="abpify_action" value="Login" />';
			form += '<hr>';

			$(this).append(form);
			
			ABPIFY.populate_bar();

			$("#abpify_url, #abpify_username, #abpify_password").keypress(function(event) {
				if (event.which === 13) {
					ABPIFY.go_action();
				}
			});

			$("#abpify_action").click(function() {
				ABPIFY.go_action();
			});
		});
		

		
	}
})(jQuery)

ABPIFY = {
	
	anonymous_token: null,
	
	init : function(token) {
		ABPIFY.anonymous_token = token;
	},
	
	credentials : function() {
		return [localStorage.getItem("ABP-URL"), localStorage.getItem("ABP-User")];
	},
	
	login : function(url, username, password) {
		localStorage.setItem("ABP-URL", url);
		ABPIFY.get("/rest/accounts/identity/" + username + "?password=" + password, function(data, xhr) {
		
			localStorage.setItem("ABP-User", username);
			ABPIFY.populate_bar();

			if (xhr.status !== 200) {
				ABPIFY.logout();
				var info = xhr.getResponseHeader("X-LVS-Information");
				alert("Invalid username / password [" + info + "]");
			}			
		
		}, function(xhr, e) {
			ABPIFY.logout();
			var info = xhr.getResponseHeader("X-LVS-Information");
			alert('Call to ' + url + ': ' + xhr.status + ' - ' + xhr.statusText);
		});
	},
	
	logout : function() {
		localStorage.removeItem("ABP-Token");
		ABPIFY.populate_bar();
	},
	
	isLoggedIn : function() {
		if (localStorage.getItem("ABP-Token")) {
			return true;
		} else {
			return false;
		};	
	},
	
	get : function(url, success, error) {
		ABPIFY.ajax('GET', url, null, success, error);	
	},
	
	post : function(url, data, success, error) {
		ABPIFY.ajax('POST', url, data, success, error);	
	},
	
	put : function(url, data, success, error) {
		ABPIFY.ajax('PUT', url, data, success, error);	
	},
	
	delete : function(url, success, error) {
		ABPIFY.ajax('DELETE', url, null, success, error);	
	},
	
	ajax : function(method, url, data, success, error) {
	
		if (ABPIFY.showDebug) var debug = {};

		var token = localStorage.getItem("ABP-Token");
		
		if (ABPIFY.showDebug) debug['token'] = "USER:" + token;
		
		if (token === null) {
			token = ABPIFY.anonymous_token;
			if (ABPIFY.showDebug) debug['token'] = "ANON:" + token;	
		}

		var host = localStorage.getItem("ABP-URL");

		if (ABPIFY.showDebug) {
			if (data) debug['request_data'] = data;
			debug['host'] = host;
			debug['url'] = url;
		}
		
		var xhr = new XMLHttpRequest();
		if ("withCredentials" in xhr) {
			// XHR for Chrome/Firefox/Opera/Safari.
			xhr.open(method, host + url, true); // the 3rd parameter is Async
		} else if (typeof XDomainRequest != "undefined") {
			// XDomainRequest for IE.
			xhr = new XDomainRequest();
			xhr.open(method, host + url);
		} else {
			// CORS not supported.
			error(null, null);
			return;
		}
		
		xhr.setRequestHeader("Content-type", "application/json; charset=UTF-8");
		xhr.setRequestHeader('X-LVS-HSToken', token);
		
		xhr.onload = function(e) {
		
			if (ABPIFY.showDebug) {
				debug['xhr'] = xhr;
				debug['stacktrace'] = ABPIFY.generate_stack();
				console.log(debug);
			}
		
			var token = xhr.getResponseHeader('X-LVS-HSToken');
			if (token) {
				localStorage.setItem("ABP-Token", token);
			}
			
			var rc = parseInt(xhr.status.toString()[0]); // Get the first character.
			if (rc >= 4) {
				error(xhr, e);
			} else {
				success(JSON.parse(xhr.responseText), xhr);
			}
			
		};

		xhr.onerror = function(e) {
			if (ABPIFY.showDebug) {
				debug['xhr'] = xhr;
				debug['stacktrace'] = ABPIFY.generate_stack();
				console.log(debug);
			}
				
			if (xhr.status === 403) {
				ABPIFY.logout();
			}
			error(xhr, e);
		};
		
		xhr.ontimeout = function(e) {
			error(null, e);
		}
		
		if ((method === "POST" || method === "PUT") && data) {
			xhr.send(data);
		} else {
			xhr.send();		
		}

  	},
	
	populate_bar : function() {
		var credentials = ABPIFY.credentials();
		$("#abpify_url").val(credentials[0]);
		$("#abpify_username").val(credentials[1]);
			
		if (ABPIFY.isLoggedIn()) {
			$("#abpify_password").hide();
			$("#abpify_action").val("Logout");
		} else {
			$("#abpify_password").val("");
			$("#abpify_password").show();	
			$("#abpify_action").val("Login");
		}	
	},

	go_action : function() {
		if ($("#abpify_action").val() === "Login") {
			ABPIFY.login($("#abpify_url").val(), $("#abpify_username").val(), $("#abpify_password").val());
		} else {
			ABPIFY.logout();
		}
	}, 
		
	generate_stack : function() {
		var callstack = [];
		var isCallstackPopulated = false;
		try {
			i.dont.exist+=0; //doesn't exist- that's the point
		} catch(e) {
			if (e.stack) { //Firefox
				var lines = e.stack.split('\n');
				for (var i = 0; i < lines.length; i++) {
					if (!lines[i].match(/jquery.*\.js/)) {
 					//if (lines[i].match(/^\s*[A-Za-z0-9\-_\$]+\(/)) {
						callstack.push(lines[i]);
					//}
					}
				}
				//Remove call to printStackTrace()
				callstack.shift();
				isCallstackPopulated = true;
				
			} else if (window.opera && e.message) { //Opera
				var lines = e.message.split('\n');
				for (var i = 0; i < lines.length; i++) {
					if (!lines[i].match(/jquery.*\.js/)) {
					//if (lines[i].match(/^\s*[A-Za-z0-9\-_\$]+\(/)) {
						var entry = lines[i];
						//Append next line also since it has the file info
						if (lines[i+1]) {
							entry += ' at ' + lines[i+1];
							i++;
						}
						callstack.push(entry);
					//}
					}
				}
				//Remove call to printStackTrace()
				callstack.shift();
				isCallstackPopulated = true;
			}
		}
		
		if (!isCallstackPopulated) { //IE and Safari
			var currentFunction = arguments.callee.caller;
			while (currentFunction) {
				var fn = currentFunction.toString();
				var fname = fn.substring(fn.indexOf('function') + 8, fn.indexOf('')) || 'anonymous';
				callstack.push(fname);
				currentFunction = currentFunction.caller;
			}
		}
		
		var str = "";
		for (var i = 0; i < callstack.length; i++) {
			str += ("    " + callstack[i] + "\r\n");
		}
		
		return str;
	}
}