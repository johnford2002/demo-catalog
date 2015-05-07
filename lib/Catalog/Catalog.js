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
		this.categoriesStringIndex = {};

		// Indexes used for metric search
		this.metricsIdIndex = {};
		this.metricsStringIndex = {};
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
		var category = new Category();
		var categoryArray = [];
		var lookupValues = [];
		var lookupString = '';

		// Validate string
		if(typeof statString !== 'string'){
			throw new Error("Error: Invalid argument type passed to getCategoryByStatString - " + statString);
		}

		// Split string
		lookupValues = statString.split('.');

		// Drop prefix since it's not used
		lookupValues.shift();

		// validate number of arguments
		if(lookupValues.length !== 2){
			throw new Error("Error: Inavlid string provided for category lookup - " + statString);
		}

		// Recombine lookup values into identifying string
		lookupString = lookupValues[0] + '.' + lookupValues[1];

		// Attempt to find category
		if(lookupString in this.categoriesStringIndex){
			categoryArray = this.categories[this.categoriesStringIndex[lookupString]];
			category.populateFromArray(categoryArray);
		} 
			
		return category;
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
		var metric = new Metric();
		var metricArray = [];
		var lookupValues = [];
		var lookupString = '';
		

		// Validate string
		if(typeof statString !== 'string'){
			throw new Error("Error: Invalid argument type passed to getMetricByStatString - " + statString);
		}

		// Split string at category/metric divide
		lookupValues = statString.split('.');

		// Drop metric namespace value
		lookupValues.shift();

		// validate number of arguments
		if(lookupValues.length !== 2){
			throw new Error("Error: Inavlid string provided for metric lookup - " + statString);
		}

		// Recombine lookup values into identifying string
		lookupString = lookupValues[0] + '.' + lookupValues[1];

		// Attempt to find category
		if(lookupString in this.metricsStringIndex){
			metricArray = this.metrics[this.metricsStringIndex[lookupString]];
			metric.populateFromArray(metricArray);
		} 

		return metric;
	};

	/**
	 * @desc Builds indexes off of the collection of categories for faster searching
	 * @return void
	 */
	Catalog.prototype._buildCategoriesIndexes = function(){
		// Declare local variables
		var currentId, currentObjectType, currentStatName, stringIndex;

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

			// Unique string identifier consists of object_type.stat_name
			stringIndex = currentObjectType + '.' + currentStatName;

			// Provide unique string index lookup
			this.categoriesStringIndex[stringIndex] = i;
		}
	};

	/**
	 * @desc Builds indexes off of the collection of metrics for faster searching
	 * @return void
	 */
	Catalog.prototype._buildMetricsIndexes = function(){
		// Declare local variables
		var currentId, currentCategoryId, currentFieldName, category, stringIndex;
		
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

			// Retrieve the associated category
			category = this.getCategoryById(currentCategoryId);

			// Unique string identifier consists of object_type.stat_name:field_name
			stringIndex = category.object_type + '.' + category.stat_name + ':' + currentFieldName;

			// Provide unique string index lookup
			this.metricsStringIndex[stringIndex] = i;
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
