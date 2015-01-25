/**
 * @desc A container for a metric, usable server side or client side standalone
 * @return node.js module export || window.Demo.Metric
 * @author John Ford <john.ford2002@gmail.com
 * @since 2015-01-25
 */
(function(){
	var Metric = (function(){
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
		}

		return Metric;
	})();

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