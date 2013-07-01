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
		ABPIFY.ajax("/rest/accounts/identity/" + username + "?password=" + password, function() {
			localStorage.setItem("ABP-User", username);			
		}, function(xhr, status, error) {
			ABPIFY.logout();
			var info = xhr.getResponseHeader("X-LVS-Information");
			alert('Call to ' + url + ': ' + xhr.status + ' - ' + xhr.statusText + ' (' + info  + ')' );
		});
	},
	
	logout : function() {
		localStorage.removeItem("ABP-Token");
	},
	
	isLoggedIn : function() {
		if (localStorage.getItem("ABP-Token")) {
			return true;
		} else {
			return false;
		};	
	},
	
	ajax : function(url, data, callback, error) {
	
		// shift arguments if data argument was omitted
		if ( $.isFunction( data ) ) {
			error = callback;
			callback = data;
			data = null;
		}
		
		if (typeof error === "undefined") {
			error = function(xhr, status, error) {
				switch (status) {
					case 'error':
						var info = xhr.getResponseHeader("X-LVS-Information");
						alert('Call to ' + url + ': ' + xhr.status + ' - ' + xhr.statusText + ' (' + info  + ')' );
						break;
					case 'timeout':
						alert('Timeout');
						break;
					case 'abort':
						alert('Abort');
						break;
					case 'parsererror':
						alert('Parser error=' + error);
						break;
				}
			}
		}
		
		if (ABPIFY.showDebug) var debug = {};

		var token = localStorage.getItem("ABP-Token");
		
		if (ABPIFY.showDebug) debug['token'] = "USER:" + token;
		
		if (token === null) {
			token = ABPIFY.anonymous_token;
			if (ABPIFY.showDebug) debug['token'] = "ANON:" + token;	
		}

		var host = localStorage.getItem("ABP-URL");

		if (ABPIFY.showDebug) {
			debug['request_data'] = data;
			debug['host'] = host;
			debug['url'] = url;
		}
		
		var rc = $.ajax({
			type: 'GET',
			dataType: 'json',
			url: host + url,
			data: data,
			async: false,
			timeout: 5000,
			ifModified: false,
			beforeSend: function(xhr, options) {
				xhr.setRequestHeader('X-LVS-HSToken', token);
			},
			success: function(data, status, xhr) {
				if (ABPIFY.showDebug) {
					debug['response_data'] = data;
					debug['status'] = status;
					debug['xhr'] = xhr;
					debug['stacktrace'] = ABPIFY.generate_stack();
				}
				
				var token = xhr.getResponseHeader('X-LVS-HSToken');
				if (token) {
					localStorage.setItem("ABP-Token", token);
				}
				callback(data, status, xhr);
			},
			error: function(xhr, status, errorText) {
				if (ABPIFY.showDebug) {
					debug['status'] = status;
					debug['xhr'] = xhr;
					debug['stacktrace'] = ABPIFY.generate_stack();
				}
				
				if (xhr.status === 403) {
					ABPIFY.logout();
				}
				error(xhr, status, errorText);
			}
		});
		
		if (ABPIFY.showDebug) console.log(debug);
		
		return rc;
	
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
		ABPIFY.populate_bar();
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