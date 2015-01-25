/**
 * @desc A stub for the CatalogAPI
 * 		 Intended for server side node use or bundling using browserify
 * @return node.js module export
 * @author John Ford <john.ford2002@gmail.com
 * @since 2015-01-25
 */
(function(){
	var Promise = require('es6-promise').Promise;
	var CatalogAPI = (function(){
		var CatalogAPI = function(){};

		// Stub function for get categories
		CatalogAPI.prototype.getCategories = function(){
			// return promise
			return new Promise(function(resolve, reject){
				//module requests categories here

				// resolve with default categories data
				var response =
					[
				       [1, 'device', 'http', 'HTTP'],
				       [2, 'device', 'dns', 'DNS'],
				       [3, 'application', 'ldap', 'LDAP'],
				       [4, 'application', 'mongo', 'MongoDB']
				   	];

				resolve(response);

				// reject on API failure
			});
		};

		// Stub function for get metrics
		CatalogAPI.prototype.getMetrics = function(){
			// return promise
			return new Promise(function(resolve, reject){
				// module requests metrics here

				// resolve with default metrics data
				var response = 
					[
				       [1, 1, 'req', 'Requests'],
				       [2, 1, 'rsp', 'Responses'],
				       [3, 1, 'tprocess', 'Server Processing Time'],
				       [4, 2, 'req', 'Requests'],
				       [5, 2, 'rsp', 'Responses'],
				       [6, 2, 'trunc', 'Truncated Responses'],
				       [7, 3, 'plain', 'Plain Text Messages'],
				       [8, 3, 'sasl', 'SASL Messages'],
				       [9, 3, 'error', 'Errors'],
				       [10, 4, 'req', 'Requests'],
				       [11, 4, 'rsp', 'Responses'],
				       [12, 4, 'tprocess', 'Server Processing Time']
				   	];

				resolve(response);

				// reject on API failure
			});		
		};

		return CatalogAPI;
	})();

	// Export module
	module.exports = CatalogAPI;
})();