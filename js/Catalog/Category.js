/**
 * @desc A container for a category, usable server side or client side standalone
 * @return node.js module export || window.Demo.Category
 * @author John Ford <john.ford2002@gmail.com
 * @since 2015-01-25
 */
(function(){
	var Category = (function(){
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
		}

		return Category;
	})();

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