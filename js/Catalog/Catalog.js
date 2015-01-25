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
	var CatalogAPI = require('./CatalogAPI.js');
	var Category = require('./Category.js');
	var Metric = require('./Metric.js');

	var Catalog = (function(){
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

			throw "Error: Unable to locate category with id = " + id;
		};

		/**
		 * @desc Attempts to lookup a category using a specific string format
		 * @param string statString - "companyname.%s.%s" where %s is object_type and stat_name
		 * @return Category
		 */
		Catalog.prototype.getCategoryByStatString = function(statString){
			// Validate string
			if(typeof statString !== 'string'){
				throw "Error: Invalid argument type passed to getCategoryByStatString - " + statString;
			}

			// Split string
			var lookupValues = statString.split('.');

			// Drop prefix since it's not used
			lookupValues.shift();

			// validate number of arguments
			if(lookupValues.length !== 2){
				throw "Error: Inavlid string provided for category lookup - " + statString;
			}

			// Lookup matching object_type, time is O(1)
			var objectTypeMatches = this.categoriesObjectTypeIndex[lookupValues[0]];

			// Lookup matching stat_name, time is O(1)
			var statNameMatches = this.categoriesStatNameIndex[lookupValues[1]];

			// Find the intersect
			var intersection = this._arrayIntersect(objectTypeMatches, statNameMatches);

			// Validate results and return
			if(intersection.length === 0){
				throw "Error: No matches for string provided for category lookup - " + statString;
			} else if(intersection.length > 1){
				throw "Error: Multiple matches returned for string provided for category lookup - " + statString;
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

			throw "Error: Unable to locate metric with id = " + id;
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
				throw "Error: Invalid argument type passed to getMetricByStatString - " + statString;
			}

			// Split string at category/metric divide
			var lookupValues = statString.split(':');

			// validate number of arguments
			if(lookupValues.length !== 2){
				throw "Error: Inavlid string provided for metric lookup - " + statString;
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
				throw "Error: No matches for string provided for metric lookup - " + statString;
			} else if(intersection.length > 1){
				throw "Error: Multiple matches returned for string provided for metric lookup - " + statString;
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
			var ai=0, bi=0;
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

		return Catalog;
	})();
	
	// Export module
	module.exports = Catalog;
})();
