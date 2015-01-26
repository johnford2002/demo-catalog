(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
/**
 * @desc A stub for the CatalogAPI
 * 		 Intended for server side node use or bundling using browserify
 * @return node.js module export
 * @author John Ford <john.ford2002@gmail.com
 * @since 2015-01-25
 */
(function(){
	// Required dependencies
	var Promise = require('es6-promise').Promise;
	var CatalogAPI = require('./CatalogAPI');
	var Category = require('./Category');
	var Metric = require('./Metric');
	
	/*
	 * Create an instance of the Catalog object
	 */
	var Catalog = function(){
		// General properties
		this.api = null; 
		this.categories = null;
		this.metrics = null;

		// Indexes used for category search
		this.categoriesIdIndex = {};
		this.categoriesObjectTypeIndex = {};
		this.categoriesStatNameIndex = {};

		// Indexes used for metric search
		this.metricsIdIndex = {};
		this.metricsCategoryIdIndex = {};
		this.metricsFieldNameIndex = {};
	};

	/**
	 * @desc Loads data from the CatalogAPI and sets up indexes for searching the catalog
	 * @return void
	 */
	Catalog.prototype.initialize = function(){
		var self = this;
		//return promise
		return new Promise(function(resolve, reject){
			
			var emptyCategories = (typeof self.categories === 'undefined' || self.categories === null);
			var emptyMetrics = (typeof self.metrics === 'undefined' || self.categories === null);
			var emptyApi = (typeof self.api === 'undefined' || self.api === null);

			// Only attempt to load data if load failed or never ran
			if( (emptyCategories && emptyMetrics) || emptyApi){
				
				if(emptyApi){
					self.api = new CatalogAPI();
				}

				// Attempt to load categories from CatalogAPI
				self.api.getCategories().then(function(response) {
					// Assign categories to instance property
					self.categories = response;

					// Build categories indexes
					self._buildCategoriesIndexes();

					// Attempt to load metrics from CatalogAPI
					self.api.getMetrics().then(function(response) {
						// Assign metrics to isntance property
						self.metrics = response;

						// Build metrics indexes
						self._buildMetricsIndexes();

						// Resolve upon successful API load of categories and metrics
						resolve();
					}, function(error) {
						reject(error);
					});
				}, function(error) {
					reject(error);
				});
			}
		});
	};

	/**
	 * @desc Attempts to lookup a Category by its id
	 * @param integer id
	 * @return Category
	 */
	Catalog.prototype.getCategoryById = function(id){

		// Time is O(1)
		if(id in this.categoriesIdIndex){
			// Populate category model and return
			var category = new Category();
			category.populateFromArray(this.categories[this.categoriesIdIndex[id]]);
			return category;
		}

		throw new Error("Error: Unable to locate category with id = " + id);
	};

	/**
	 * @desc Attempts to lookup a category using a specific string format
	 * @param string statString - "companyname.%s.%s" where %s is object_type and stat_name
	 * @return Category
	 */
	Catalog.prototype.getCategoryByStatString = function(statString){
		// Validate string
		if(typeof statString !== 'string'){
			throw new Error("Error: Invalid argument type passed to getCategoryByStatString - " + statString);
		}

		// Split string
		var lookupValues = statString.split('.');

		// Drop prefix since it's not used
		lookupValues.shift();

		// validate number of arguments
		if(lookupValues.length !== 2){
			throw new Error("Error: Inavlid string provided for category lookup - " + statString);
		}

		// Lookup matching object_type, time is O(1)
		var objectTypeMatches = this.categoriesObjectTypeIndex[lookupValues[0]];

		// Lookup matching stat_name, time is O(1)
		var statNameMatches = this.categoriesStatNameIndex[lookupValues[1]];

		// Find the intersect
		var intersection = this._arrayIntersect(objectTypeMatches, statNameMatches);

		// Validate results and return
		if(intersection.length === 0){
			throw new Error("Error: No matches for string provided for category lookup - " + statString);
		} else if(intersection.length > 1){
			throw new Error("Error: Multiple matches returned for string provided for category lookup - " + statString);
		} else {
			// Populate category model and return
			var category = new Category();
			category.populateFromArray(this.categories[intersection[0]]);
			return category;
		}
	};

	/**
	 * @desc Attempts to lookup a metric by its id
	 * @param integer id
	 * @return Metric
	 */
	Catalog.prototype.getMetricById = function(id){

		// Time is O(1)
		if(id in this.metricsIdIndex){
			// Populate metric model and return
			var metric = new Metric();
			metric.populateFromArray(this.metrics[this.metricsIdIndex[id]]);
			return metric;
		}

		throw new Error("Error: Unable to locate metric with id = " + id);
	};

	/**
	 * @desc Attempts to lookup a metric using a specific string format
	 * @param string statString - "companyname.%s.%s:%s" where %s is 
	 * 							   object_type, stat_name, and field_name
	 * @return Metric
	 */
	Catalog.prototype.getMetricByStatString = function(statString){
		// Validate string
		if(typeof statString !== 'string'){
			throw new Error("Error: Invalid argument type passed to getMetricByStatString - " + statString);
		}

		// Split string at category/metric divide
		var lookupValues = statString.split(':');

		// validate number of arguments
		if(lookupValues.length !== 2){
			throw new Error("Error: Inavlid string provided for metric lookup - " + statString);
		}
		
		// Lookup matching category first
		var category = this.getCategoryByStatString(lookupValues[0]);

		// Pull metrics that match category
		var categoryIdMatches = this.metricsCategoryIdIndex[category.id];

		// Pull metrics that match field name
		var fieldNameMatches = this.metricsFieldNameIndex[lookupValues[1]];

		// Find the intersect
		var intersection = this._arrayIntersect(categoryIdMatches, fieldNameMatches);

		// Validate results and return
		if(intersection.length === 0){
			throw new Error("Error: No matches for string provided for metric lookup - " + statString);
		} else if(intersection.length > 1){
			throw new Error("Error: Multiple matches returned for string provided for metric lookup - " + statString);
		} else {
			// Populate Metric object and return
			var metric = new Metric();
			metric.populateFromArray(this.metrics[intersection[0]]);
			return metric;
		}
	};

	/**
	 * @desc Builds indexes off of the collection of categories for faster searching
	 * @return void
	 */
	Catalog.prototype._buildCategoriesIndexes = function(){
		// Declare local variables
		var currentId, currentObjectType, currentStatName;

		// Indexing for faster search
		// Time is O(n)
		for(var i=0; i<this.categories.length; i++){
			// Assign current values for ease of reference
			currentId = this.categories[i][0];
			currentObjectType = this.categories[i][1];
			currentStatName = this.categories[i][2];

			// Provide ID lookup into array of categories
			// Useful if ID doesn't match index
			this.categoriesIdIndex[currentId] = i; 

			// Object types aren't necessarily unique
			// Provide an array of matching indexes into the categories array
			if(currentObjectType in this.categoriesObjectTypeIndex){
		        this.categoriesObjectTypeIndex[currentObjectType].push(i);
		    } else {
		        this.categoriesObjectTypeIndex[currentObjectType] = [i];
		    }

			// Stat names aren't necessarily unique
			// Provide an array of matching indexes into the categories array
			if(currentStatName in this.categoriesStatNameIndex){
		        this.categoriesStatNameIndex[currentStatName].push(i);
		    } else {
		        this.categoriesStatNameIndex[currentStatName] = [i];
		    }
		}
	};

	/**
	 * @desc Builds indexes off of the collection of metrics for faster searching
	 * @return void
	 */
	Catalog.prototype._buildMetricsIndexes = function(){
		// Declare local variables
		var currentId, currentCategoryId, currentFieldName;
		
		// indexing for faster search
		// Time is O(n)
		for(var i=0; i<this.metrics.length; i++){
			// Assign current values for ease of reference
			currentId = this.metrics[i][0];
			currentCategoryId = this.metrics[i][1];
			currentFieldName = this.metrics[i][2];

			// Provide ID lookup into array of metrics
			// Useful if ID doesn't match index
			this.metricsIdIndex[currentId] = i; 

			// More than one metric can belong to the same category
			// Provide an array of matching indexes into the metrics array
			if(currentCategoryId in this.metricsCategoryIdIndex){
				this.metricsCategoryIdIndex[currentCategoryId].push(i);
			} else {
				this.metricsCategoryIdIndex[currentCategoryId] = [i];
			}

			// Field names aren't necessarily unique
			// Provide an array of matching indexes into the metrics array
			if(currentFieldName in this.metricsFieldNameIndex){
				this.metricsFieldNameIndex[currentFieldName].push(i);
			} else {
				this.metricsFieldNameIndex[currentFieldName] = [i];
			}
		}
	};

	/**
	 * @desc Attempts to find the intersections between two arrays of sorted values
	 * @param array a
	 * @param array b
	 * @return array
	 *
	 * @see http://stackoverflow.com/questions/1885557/simplest-code-for-array-intersection-in-javascript
	 */
	Catalog.prototype._arrayIntersect = function(a, b){
		// used to iterate through two arrays
		var ai=0, bi=0;
		// holds the intersect result
		var result = [];

		while( ai < a.length && bi < b.length )
		{
			if (a[ai] < b[bi] ){ 
				ai++; 
			} else if (a[ai] > b[bi] ){ 
				bi++; 
			/* they're equal */
			} else  {
				result.push(a[ai]);
				ai++;
				bi++;
			}
		}

		return result;
	};
	
	// Export module
	module.exports = Catalog;
})();

},{"./CatalogAPI":2,"./Category":4,"./Metric":5,"es6-promise":6}],2:[function(require,module,exports){
/**
 * @desc A stub for the CatalogAPI
 * 		 Intended for server side node use or bundling using browserify
 * @return node.js module export
 * @author John Ford <john.ford2002@gmail.com
 * @since 2015-01-25
 */
(function(){
	var Promise = require('es6-promise').Promise;

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

	// Export module
	module.exports = CatalogAPI;
})();
},{"es6-promise":6}],3:[function(require,module,exports){
/**
 * @desc Using browserify, this exports Catalog into the global namespace
 * 		 allowing for client-side use.
 * @author John Ford <john.ford2002@gmail.com
 * @since 2015-01-25
 */
window.Promise = require('es6-promise').Promise;
window.Demo = {};
window.Demo.Catalog = require('./Catalog');
},{"./Catalog":1,"es6-promise":6}],4:[function(require,module,exports){
/**
 * @desc A container for a category, usable server side or client side standalone
 * @return node.js module export || window.Demo.Category
 * @author John Ford <john.ford2002@gmail.com
 * @since 2015-01-25
 */
(function(){
	var Category = function(){
		this.id = null;
		this.object_type = null;
		this.stat_name = null;
		this.display_name = null;
	};

	Category.prototype.populateFromArray = function(arr){
		if(typeof arr !== 'object' || arr.length !== 4){
			throw "Error: Failed to populate Category object.";
		}

		this.id = arr[0];
		this.object_type = arr[1];
		this.stat_name = arr[2];
		this.display_name = arr[3];
	};

	// If loading in node context, assign to exports
	if(typeof module !== 'undefined' && typeof module.exports !== 'undefined'){
		module.exports = Category;
	// If loading in browser, assign under Demo in global namespace
	} else if(typeof window.Demo !== 'undefined') {
		window.Demo.Category = Category;
	// If no other Demo modules have loaded, create a global container
	} else {
		window.Demo = {};
		window.Demo.Category = Category;
	}
})();
},{}],5:[function(require,module,exports){
/**
 * @desc A container for a metric, usable server side or client side standalone
 * @return node.js module export || window.Demo.Metric
 * @author John Ford <john.ford2002@gmail.com
 * @since 2015-01-25
 */
(function(){
	var Metric = function(){
		this.id = null;
		this.category_id = null;
		this.field_name = null;
		this.display_name = null;
	};

	Metric.prototype.populateFromArray = function(arr){
		if(typeof arr !== 'object' || arr.length !== 4){
			throw "Error: Failed to populate Category object.";
		}

		this.id = arr[0];
		this.category_id = arr[1];
		this.field_name = arr[2];
		this.display_name = arr[3];
	};

	// If loading in node context, assign to exports
	if(typeof module !== 'undefined' && typeof module.exports !== 'undefined'){
		module.exports = Metric;
	// If loading in browser, assign under Demo in global namespace
	} else if(typeof window.Demo !== 'undefined') {
		window.Demo.Metric = Metric;
	// If no other Demo modules have loaded, create a global container
	} else {
		window.Demo = {};
		window.Demo.Metric = Metric;
	}
})();
},{}],6:[function(require,module,exports){
(function (process,global){
/*!
 * @overview es6-promise - a tiny implementation of Promises/A+.
 * @copyright Copyright (c) 2014 Yehuda Katz, Tom Dale, Stefan Penner and contributors (Conversion to ES6 API by Jake Archibald)
 * @license   Licensed under MIT license
 *            See https://raw.githubusercontent.com/jakearchibald/es6-promise/master/LICENSE
 * @version   2.0.1
 */

(function() {
    "use strict";

    function $$utils$$objectOrFunction(x) {
      return typeof x === 'function' || (typeof x === 'object' && x !== null);
    }

    function $$utils$$isFunction(x) {
      return typeof x === 'function';
    }

    function $$utils$$isMaybeThenable(x) {
      return typeof x === 'object' && x !== null;
    }

    var $$utils$$_isArray;

    if (!Array.isArray) {
      $$utils$$_isArray = function (x) {
        return Object.prototype.toString.call(x) === '[object Array]';
      };
    } else {
      $$utils$$_isArray = Array.isArray;
    }

    var $$utils$$isArray = $$utils$$_isArray;
    var $$utils$$now = Date.now || function() { return new Date().getTime(); };
    function $$utils$$F() { }

    var $$utils$$o_create = (Object.create || function (o) {
      if (arguments.length > 1) {
        throw new Error('Second argument not supported');
      }
      if (typeof o !== 'object') {
        throw new TypeError('Argument must be an object');
      }
      $$utils$$F.prototype = o;
      return new $$utils$$F();
    });

    var $$asap$$len = 0;

    var $$asap$$default = function asap(callback, arg) {
      $$asap$$queue[$$asap$$len] = callback;
      $$asap$$queue[$$asap$$len + 1] = arg;
      $$asap$$len += 2;
      if ($$asap$$len === 2) {
        // If len is 1, that means that we need to schedule an async flush.
        // If additional callbacks are queued before the queue is flushed, they
        // will be processed by this flush that we are scheduling.
        $$asap$$scheduleFlush();
      }
    };

    var $$asap$$browserGlobal = (typeof window !== 'undefined') ? window : {};
    var $$asap$$BrowserMutationObserver = $$asap$$browserGlobal.MutationObserver || $$asap$$browserGlobal.WebKitMutationObserver;

    // test for web worker but not in IE10
    var $$asap$$isWorker = typeof Uint8ClampedArray !== 'undefined' &&
      typeof importScripts !== 'undefined' &&
      typeof MessageChannel !== 'undefined';

    // node
    function $$asap$$useNextTick() {
      return function() {
        process.nextTick($$asap$$flush);
      };
    }

    function $$asap$$useMutationObserver() {
      var iterations = 0;
      var observer = new $$asap$$BrowserMutationObserver($$asap$$flush);
      var node = document.createTextNode('');
      observer.observe(node, { characterData: true });

      return function() {
        node.data = (iterations = ++iterations % 2);
      };
    }

    // web worker
    function $$asap$$useMessageChannel() {
      var channel = new MessageChannel();
      channel.port1.onmessage = $$asap$$flush;
      return function () {
        channel.port2.postMessage(0);
      };
    }

    function $$asap$$useSetTimeout() {
      return function() {
        setTimeout($$asap$$flush, 1);
      };
    }

    var $$asap$$queue = new Array(1000);

    function $$asap$$flush() {
      for (var i = 0; i < $$asap$$len; i+=2) {
        var callback = $$asap$$queue[i];
        var arg = $$asap$$queue[i+1];

        callback(arg);

        $$asap$$queue[i] = undefined;
        $$asap$$queue[i+1] = undefined;
      }

      $$asap$$len = 0;
    }

    var $$asap$$scheduleFlush;

    // Decide what async method to use to triggering processing of queued callbacks:
    if (typeof process !== 'undefined' && {}.toString.call(process) === '[object process]') {
      $$asap$$scheduleFlush = $$asap$$useNextTick();
    } else if ($$asap$$BrowserMutationObserver) {
      $$asap$$scheduleFlush = $$asap$$useMutationObserver();
    } else if ($$asap$$isWorker) {
      $$asap$$scheduleFlush = $$asap$$useMessageChannel();
    } else {
      $$asap$$scheduleFlush = $$asap$$useSetTimeout();
    }

    function $$$internal$$noop() {}
    var $$$internal$$PENDING   = void 0;
    var $$$internal$$FULFILLED = 1;
    var $$$internal$$REJECTED  = 2;
    var $$$internal$$GET_THEN_ERROR = new $$$internal$$ErrorObject();

    function $$$internal$$selfFullfillment() {
      return new TypeError("You cannot resolve a promise with itself");
    }

    function $$$internal$$cannotReturnOwn() {
      return new TypeError('A promises callback cannot return that same promise.')
    }

    function $$$internal$$getThen(promise) {
      try {
        return promise.then;
      } catch(error) {
        $$$internal$$GET_THEN_ERROR.error = error;
        return $$$internal$$GET_THEN_ERROR;
      }
    }

    function $$$internal$$tryThen(then, value, fulfillmentHandler, rejectionHandler) {
      try {
        then.call(value, fulfillmentHandler, rejectionHandler);
      } catch(e) {
        return e;
      }
    }

    function $$$internal$$handleForeignThenable(promise, thenable, then) {
       $$asap$$default(function(promise) {
        var sealed = false;
        var error = $$$internal$$tryThen(then, thenable, function(value) {
          if (sealed) { return; }
          sealed = true;
          if (thenable !== value) {
            $$$internal$$resolve(promise, value);
          } else {
            $$$internal$$fulfill(promise, value);
          }
        }, function(reason) {
          if (sealed) { return; }
          sealed = true;

          $$$internal$$reject(promise, reason);
        }, 'Settle: ' + (promise._label || ' unknown promise'));

        if (!sealed && error) {
          sealed = true;
          $$$internal$$reject(promise, error);
        }
      }, promise);
    }

    function $$$internal$$handleOwnThenable(promise, thenable) {
      if (thenable._state === $$$internal$$FULFILLED) {
        $$$internal$$fulfill(promise, thenable._result);
      } else if (promise._state === $$$internal$$REJECTED) {
        $$$internal$$reject(promise, thenable._result);
      } else {
        $$$internal$$subscribe(thenable, undefined, function(value) {
          $$$internal$$resolve(promise, value);
        }, function(reason) {
          $$$internal$$reject(promise, reason);
        });
      }
    }

    function $$$internal$$handleMaybeThenable(promise, maybeThenable) {
      if (maybeThenable.constructor === promise.constructor) {
        $$$internal$$handleOwnThenable(promise, maybeThenable);
      } else {
        var then = $$$internal$$getThen(maybeThenable);

        if (then === $$$internal$$GET_THEN_ERROR) {
          $$$internal$$reject(promise, $$$internal$$GET_THEN_ERROR.error);
        } else if (then === undefined) {
          $$$internal$$fulfill(promise, maybeThenable);
        } else if ($$utils$$isFunction(then)) {
          $$$internal$$handleForeignThenable(promise, maybeThenable, then);
        } else {
          $$$internal$$fulfill(promise, maybeThenable);
        }
      }
    }

    function $$$internal$$resolve(promise, value) {
      if (promise === value) {
        $$$internal$$reject(promise, $$$internal$$selfFullfillment());
      } else if ($$utils$$objectOrFunction(value)) {
        $$$internal$$handleMaybeThenable(promise, value);
      } else {
        $$$internal$$fulfill(promise, value);
      }
    }

    function $$$internal$$publishRejection(promise) {
      if (promise._onerror) {
        promise._onerror(promise._result);
      }

      $$$internal$$publish(promise);
    }

    function $$$internal$$fulfill(promise, value) {
      if (promise._state !== $$$internal$$PENDING) { return; }

      promise._result = value;
      promise._state = $$$internal$$FULFILLED;

      if (promise._subscribers.length === 0) {
      } else {
        $$asap$$default($$$internal$$publish, promise);
      }
    }

    function $$$internal$$reject(promise, reason) {
      if (promise._state !== $$$internal$$PENDING) { return; }
      promise._state = $$$internal$$REJECTED;
      promise._result = reason;

      $$asap$$default($$$internal$$publishRejection, promise);
    }

    function $$$internal$$subscribe(parent, child, onFulfillment, onRejection) {
      var subscribers = parent._subscribers;
      var length = subscribers.length;

      parent._onerror = null;

      subscribers[length] = child;
      subscribers[length + $$$internal$$FULFILLED] = onFulfillment;
      subscribers[length + $$$internal$$REJECTED]  = onRejection;

      if (length === 0 && parent._state) {
        $$asap$$default($$$internal$$publish, parent);
      }
    }

    function $$$internal$$publish(promise) {
      var subscribers = promise._subscribers;
      var settled = promise._state;

      if (subscribers.length === 0) { return; }

      var child, callback, detail = promise._result;

      for (var i = 0; i < subscribers.length; i += 3) {
        child = subscribers[i];
        callback = subscribers[i + settled];

        if (child) {
          $$$internal$$invokeCallback(settled, child, callback, detail);
        } else {
          callback(detail);
        }
      }

      promise._subscribers.length = 0;
    }

    function $$$internal$$ErrorObject() {
      this.error = null;
    }

    var $$$internal$$TRY_CATCH_ERROR = new $$$internal$$ErrorObject();

    function $$$internal$$tryCatch(callback, detail) {
      try {
        return callback(detail);
      } catch(e) {
        $$$internal$$TRY_CATCH_ERROR.error = e;
        return $$$internal$$TRY_CATCH_ERROR;
      }
    }

    function $$$internal$$invokeCallback(settled, promise, callback, detail) {
      var hasCallback = $$utils$$isFunction(callback),
          value, error, succeeded, failed;

      if (hasCallback) {
        value = $$$internal$$tryCatch(callback, detail);

        if (value === $$$internal$$TRY_CATCH_ERROR) {
          failed = true;
          error = value.error;
          value = null;
        } else {
          succeeded = true;
        }

        if (promise === value) {
          $$$internal$$reject(promise, $$$internal$$cannotReturnOwn());
          return;
        }

      } else {
        value = detail;
        succeeded = true;
      }

      if (promise._state !== $$$internal$$PENDING) {
        // noop
      } else if (hasCallback && succeeded) {
        $$$internal$$resolve(promise, value);
      } else if (failed) {
        $$$internal$$reject(promise, error);
      } else if (settled === $$$internal$$FULFILLED) {
        $$$internal$$fulfill(promise, value);
      } else if (settled === $$$internal$$REJECTED) {
        $$$internal$$reject(promise, value);
      }
    }

    function $$$internal$$initializePromise(promise, resolver) {
      try {
        resolver(function resolvePromise(value){
          $$$internal$$resolve(promise, value);
        }, function rejectPromise(reason) {
          $$$internal$$reject(promise, reason);
        });
      } catch(e) {
        $$$internal$$reject(promise, e);
      }
    }

    function $$$enumerator$$makeSettledResult(state, position, value) {
      if (state === $$$internal$$FULFILLED) {
        return {
          state: 'fulfilled',
          value: value
        };
      } else {
        return {
          state: 'rejected',
          reason: value
        };
      }
    }

    function $$$enumerator$$Enumerator(Constructor, input, abortOnReject, label) {
      this._instanceConstructor = Constructor;
      this.promise = new Constructor($$$internal$$noop, label);
      this._abortOnReject = abortOnReject;

      if (this._validateInput(input)) {
        this._input     = input;
        this.length     = input.length;
        this._remaining = input.length;

        this._init();

        if (this.length === 0) {
          $$$internal$$fulfill(this.promise, this._result);
        } else {
          this.length = this.length || 0;
          this._enumerate();
          if (this._remaining === 0) {
            $$$internal$$fulfill(this.promise, this._result);
          }
        }
      } else {
        $$$internal$$reject(this.promise, this._validationError());
      }
    }

    $$$enumerator$$Enumerator.prototype._validateInput = function(input) {
      return $$utils$$isArray(input);
    };

    $$$enumerator$$Enumerator.prototype._validationError = function() {
      return new Error('Array Methods must be provided an Array');
    };

    $$$enumerator$$Enumerator.prototype._init = function() {
      this._result = new Array(this.length);
    };

    var $$$enumerator$$default = $$$enumerator$$Enumerator;

    $$$enumerator$$Enumerator.prototype._enumerate = function() {
      var length  = this.length;
      var promise = this.promise;
      var input   = this._input;

      for (var i = 0; promise._state === $$$internal$$PENDING && i < length; i++) {
        this._eachEntry(input[i], i);
      }
    };

    $$$enumerator$$Enumerator.prototype._eachEntry = function(entry, i) {
      var c = this._instanceConstructor;
      if ($$utils$$isMaybeThenable(entry)) {
        if (entry.constructor === c && entry._state !== $$$internal$$PENDING) {
          entry._onerror = null;
          this._settledAt(entry._state, i, entry._result);
        } else {
          this._willSettleAt(c.resolve(entry), i);
        }
      } else {
        this._remaining--;
        this._result[i] = this._makeResult($$$internal$$FULFILLED, i, entry);
      }
    };

    $$$enumerator$$Enumerator.prototype._settledAt = function(state, i, value) {
      var promise = this.promise;

      if (promise._state === $$$internal$$PENDING) {
        this._remaining--;

        if (this._abortOnReject && state === $$$internal$$REJECTED) {
          $$$internal$$reject(promise, value);
        } else {
          this._result[i] = this._makeResult(state, i, value);
        }
      }

      if (this._remaining === 0) {
        $$$internal$$fulfill(promise, this._result);
      }
    };

    $$$enumerator$$Enumerator.prototype._makeResult = function(state, i, value) {
      return value;
    };

    $$$enumerator$$Enumerator.prototype._willSettleAt = function(promise, i) {
      var enumerator = this;

      $$$internal$$subscribe(promise, undefined, function(value) {
        enumerator._settledAt($$$internal$$FULFILLED, i, value);
      }, function(reason) {
        enumerator._settledAt($$$internal$$REJECTED, i, reason);
      });
    };

    var $$promise$all$$default = function all(entries, label) {
      return new $$$enumerator$$default(this, entries, true /* abort on reject */, label).promise;
    };

    var $$promise$race$$default = function race(entries, label) {
      /*jshint validthis:true */
      var Constructor = this;

      var promise = new Constructor($$$internal$$noop, label);

      if (!$$utils$$isArray(entries)) {
        $$$internal$$reject(promise, new TypeError('You must pass an array to race.'));
        return promise;
      }

      var length = entries.length;

      function onFulfillment(value) {
        $$$internal$$resolve(promise, value);
      }

      function onRejection(reason) {
        $$$internal$$reject(promise, reason);
      }

      for (var i = 0; promise._state === $$$internal$$PENDING && i < length; i++) {
        $$$internal$$subscribe(Constructor.resolve(entries[i]), undefined, onFulfillment, onRejection);
      }

      return promise;
    };

    var $$promise$resolve$$default = function resolve(object, label) {
      /*jshint validthis:true */
      var Constructor = this;

      if (object && typeof object === 'object' && object.constructor === Constructor) {
        return object;
      }

      var promise = new Constructor($$$internal$$noop, label);
      $$$internal$$resolve(promise, object);
      return promise;
    };

    var $$promise$reject$$default = function reject(reason, label) {
      /*jshint validthis:true */
      var Constructor = this;
      var promise = new Constructor($$$internal$$noop, label);
      $$$internal$$reject(promise, reason);
      return promise;
    };

    var $$es6$promise$promise$$counter = 0;

    function $$es6$promise$promise$$needsResolver() {
      throw new TypeError('You must pass a resolver function as the first argument to the promise constructor');
    }

    function $$es6$promise$promise$$needsNew() {
      throw new TypeError("Failed to construct 'Promise': Please use the 'new' operator, this object constructor cannot be called as a function.");
    }

    var $$es6$promise$promise$$default = $$es6$promise$promise$$Promise;

    /**
      Promise objects represent the eventual result of an asynchronous operation. The
      primary way of interacting with a promise is through its `then` method, which
      registers callbacks to receive either a promise’s eventual value or the reason
      why the promise cannot be fulfilled.

      Terminology
      -----------

      - `promise` is an object or function with a `then` method whose behavior conforms to this specification.
      - `thenable` is an object or function that defines a `then` method.
      - `value` is any legal JavaScript value (including undefined, a thenable, or a promise).
      - `exception` is a value that is thrown using the throw statement.
      - `reason` is a value that indicates why a promise was rejected.
      - `settled` the final resting state of a promise, fulfilled or rejected.

      A promise can be in one of three states: pending, fulfilled, or rejected.

      Promises that are fulfilled have a fulfillment value and are in the fulfilled
      state.  Promises that are rejected have a rejection reason and are in the
      rejected state.  A fulfillment value is never a thenable.

      Promises can also be said to *resolve* a value.  If this value is also a
      promise, then the original promise's settled state will match the value's
      settled state.  So a promise that *resolves* a promise that rejects will
      itself reject, and a promise that *resolves* a promise that fulfills will
      itself fulfill.


      Basic Usage:
      ------------

      ```js
      var promise = new Promise(function(resolve, reject) {
        // on success
        resolve(value);

        // on failure
        reject(reason);
      });

      promise.then(function(value) {
        // on fulfillment
      }, function(reason) {
        // on rejection
      });
      ```

      Advanced Usage:
      ---------------

      Promises shine when abstracting away asynchronous interactions such as
      `XMLHttpRequest`s.

      ```js
      function getJSON(url) {
        return new Promise(function(resolve, reject){
          var xhr = new XMLHttpRequest();

          xhr.open('GET', url);
          xhr.onreadystatechange = handler;
          xhr.responseType = 'json';
          xhr.setRequestHeader('Accept', 'application/json');
          xhr.send();

          function handler() {
            if (this.readyState === this.DONE) {
              if (this.status === 200) {
                resolve(this.response);
              } else {
                reject(new Error('getJSON: `' + url + '` failed with status: [' + this.status + ']'));
              }
            }
          };
        });
      }

      getJSON('/posts.json').then(function(json) {
        // on fulfillment
      }, function(reason) {
        // on rejection
      });
      ```

      Unlike callbacks, promises are great composable primitives.

      ```js
      Promise.all([
        getJSON('/posts'),
        getJSON('/comments')
      ]).then(function(values){
        values[0] // => postsJSON
        values[1] // => commentsJSON

        return values;
      });
      ```

      @class Promise
      @param {function} resolver
      Useful for tooling.
      @constructor
    */
    function $$es6$promise$promise$$Promise(resolver) {
      this._id = $$es6$promise$promise$$counter++;
      this._state = undefined;
      this._result = undefined;
      this._subscribers = [];

      if ($$$internal$$noop !== resolver) {
        if (!$$utils$$isFunction(resolver)) {
          $$es6$promise$promise$$needsResolver();
        }

        if (!(this instanceof $$es6$promise$promise$$Promise)) {
          $$es6$promise$promise$$needsNew();
        }

        $$$internal$$initializePromise(this, resolver);
      }
    }

    $$es6$promise$promise$$Promise.all = $$promise$all$$default;
    $$es6$promise$promise$$Promise.race = $$promise$race$$default;
    $$es6$promise$promise$$Promise.resolve = $$promise$resolve$$default;
    $$es6$promise$promise$$Promise.reject = $$promise$reject$$default;

    $$es6$promise$promise$$Promise.prototype = {
      constructor: $$es6$promise$promise$$Promise,

    /**
      The primary way of interacting with a promise is through its `then` method,
      which registers callbacks to receive either a promise's eventual value or the
      reason why the promise cannot be fulfilled.

      ```js
      findUser().then(function(user){
        // user is available
      }, function(reason){
        // user is unavailable, and you are given the reason why
      });
      ```

      Chaining
      --------

      The return value of `then` is itself a promise.  This second, 'downstream'
      promise is resolved with the return value of the first promise's fulfillment
      or rejection handler, or rejected if the handler throws an exception.

      ```js
      findUser().then(function (user) {
        return user.name;
      }, function (reason) {
        return 'default name';
      }).then(function (userName) {
        // If `findUser` fulfilled, `userName` will be the user's name, otherwise it
        // will be `'default name'`
      });

      findUser().then(function (user) {
        throw new Error('Found user, but still unhappy');
      }, function (reason) {
        throw new Error('`findUser` rejected and we're unhappy');
      }).then(function (value) {
        // never reached
      }, function (reason) {
        // if `findUser` fulfilled, `reason` will be 'Found user, but still unhappy'.
        // If `findUser` rejected, `reason` will be '`findUser` rejected and we're unhappy'.
      });
      ```
      If the downstream promise does not specify a rejection handler, rejection reasons will be propagated further downstream.

      ```js
      findUser().then(function (user) {
        throw new PedagogicalException('Upstream error');
      }).then(function (value) {
        // never reached
      }).then(function (value) {
        // never reached
      }, function (reason) {
        // The `PedgagocialException` is propagated all the way down to here
      });
      ```

      Assimilation
      ------------

      Sometimes the value you want to propagate to a downstream promise can only be
      retrieved asynchronously. This can be achieved by returning a promise in the
      fulfillment or rejection handler. The downstream promise will then be pending
      until the returned promise is settled. This is called *assimilation*.

      ```js
      findUser().then(function (user) {
        return findCommentsByAuthor(user);
      }).then(function (comments) {
        // The user's comments are now available
      });
      ```

      If the assimliated promise rejects, then the downstream promise will also reject.

      ```js
      findUser().then(function (user) {
        return findCommentsByAuthor(user);
      }).then(function (comments) {
        // If `findCommentsByAuthor` fulfills, we'll have the value here
      }, function (reason) {
        // If `findCommentsByAuthor` rejects, we'll have the reason here
      });
      ```

      Simple Example
      --------------

      Synchronous Example

      ```javascript
      var result;

      try {
        result = findResult();
        // success
      } catch(reason) {
        // failure
      }
      ```

      Errback Example

      ```js
      findResult(function(result, err){
        if (err) {
          // failure
        } else {
          // success
        }
      });
      ```

      Promise Example;

      ```javascript
      findResult().then(function(result){
        // success
      }, function(reason){
        // failure
      });
      ```

      Advanced Example
      --------------

      Synchronous Example

      ```javascript
      var author, books;

      try {
        author = findAuthor();
        books  = findBooksByAuthor(author);
        // success
      } catch(reason) {
        // failure
      }
      ```

      Errback Example

      ```js

      function foundBooks(books) {

      }

      function failure(reason) {

      }

      findAuthor(function(author, err){
        if (err) {
          failure(err);
          // failure
        } else {
          try {
            findBoooksByAuthor(author, function(books, err) {
              if (err) {
                failure(err);
              } else {
                try {
                  foundBooks(books);
                } catch(reason) {
                  failure(reason);
                }
              }
            });
          } catch(error) {
            failure(err);
          }
          // success
        }
      });
      ```

      Promise Example;

      ```javascript
      findAuthor().
        then(findBooksByAuthor).
        then(function(books){
          // found books
      }).catch(function(reason){
        // something went wrong
      });
      ```

      @method then
      @param {Function} onFulfilled
      @param {Function} onRejected
      Useful for tooling.
      @return {Promise}
    */
      then: function(onFulfillment, onRejection) {
        var parent = this;
        var state = parent._state;

        if (state === $$$internal$$FULFILLED && !onFulfillment || state === $$$internal$$REJECTED && !onRejection) {
          return this;
        }

        var child = new this.constructor($$$internal$$noop);
        var result = parent._result;

        if (state) {
          var callback = arguments[state - 1];
          $$asap$$default(function(){
            $$$internal$$invokeCallback(state, child, callback, result);
          });
        } else {
          $$$internal$$subscribe(parent, child, onFulfillment, onRejection);
        }

        return child;
      },

    /**
      `catch` is simply sugar for `then(undefined, onRejection)` which makes it the same
      as the catch block of a try/catch statement.

      ```js
      function findAuthor(){
        throw new Error('couldn't find that author');
      }

      // synchronous
      try {
        findAuthor();
      } catch(reason) {
        // something went wrong
      }

      // async with promises
      findAuthor().catch(function(reason){
        // something went wrong
      });
      ```

      @method catch
      @param {Function} onRejection
      Useful for tooling.
      @return {Promise}
    */
      'catch': function(onRejection) {
        return this.then(null, onRejection);
      }
    };

    var $$es6$promise$polyfill$$default = function polyfill() {
      var local;

      if (typeof global !== 'undefined') {
        local = global;
      } else if (typeof window !== 'undefined' && window.document) {
        local = window;
      } else {
        local = self;
      }

      var es6PromiseSupport =
        "Promise" in local &&
        // Some of these methods are missing from
        // Firefox/Chrome experimental implementations
        "resolve" in local.Promise &&
        "reject" in local.Promise &&
        "all" in local.Promise &&
        "race" in local.Promise &&
        // Older version of the spec had a resolver object
        // as the arg rather than a function
        (function() {
          var resolve;
          new local.Promise(function(r) { resolve = r; });
          return $$utils$$isFunction(resolve);
        }());

      if (!es6PromiseSupport) {
        local.Promise = $$es6$promise$promise$$default;
      }
    };

    var es6$promise$umd$$ES6Promise = {
      'Promise': $$es6$promise$promise$$default,
      'polyfill': $$es6$promise$polyfill$$default
    };

    /* global define:true module:true window: true */
    if (typeof define === 'function' && define['amd']) {
      define(function() { return es6$promise$umd$$ES6Promise; });
    } else if (typeof module !== 'undefined' && module['exports']) {
      module['exports'] = es6$promise$umd$$ES6Promise;
    } else if (typeof this !== 'undefined') {
      this['ES6Promise'] = es6$promise$umd$$ES6Promise;
    }
}).call(this);
}).call(this,require('_process'),typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{"_process":7}],7:[function(require,module,exports){
// shim for using process in browser

var process = module.exports = {};
var queue = [];
var draining = false;

function drainQueue() {
    if (draining) {
        return;
    }
    draining = true;
    var currentQueue;
    var len = queue.length;
    while(len) {
        currentQueue = queue;
        queue = [];
        var i = -1;
        while (++i < len) {
            currentQueue[i]();
        }
        len = queue.length;
    }
    draining = false;
}
process.nextTick = function (fun) {
    queue.push(fun);
    if (!draining) {
        setTimeout(drainQueue, 0);
    }
};

process.title = 'browser';
process.browser = true;
process.env = {};
process.argv = [];
process.version = ''; // empty string to avoid regexp issues

function noop() {}

process.on = noop;
process.addListener = noop;
process.once = noop;
process.off = noop;
process.removeListener = noop;
process.removeAllListeners = noop;
process.emit = noop;

process.binding = function (name) {
    throw new Error('process.binding is not supported');
};

// TODO(shtylman)
process.cwd = function () { return '/' };
process.chdir = function (dir) {
    throw new Error('process.chdir is not supported');
};
process.umask = function() { return 0; };

},{}]},{},[3]);
