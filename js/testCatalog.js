/*
 * @desc Server side test script to test functionality of Catalog module
 * @author John Ford <john.ford2002@gmail.com
 * @since 2015-01-25
 */
var Promise = require('es6-promise').Promise;
var Catalog = require('./Catalog/Catalog.js');

//console.log('Instantiating catalog...')
var c = new Catalog();

c.initialize().then(
	function() {
		//console.log('Catalog loaded.');

		var category1, category2, metric1, metric2;

		// Test category lookups
		category1 = c.getCategoryById(1);

		category2 = c.getCategoryByStatString('demo.device.http');

		if (category1.id === category2.id) {
		   console.log(category1.display_name + ' lookups match!');
		}

		// Test metric lookups
		metric1 = c.getMetricById(4);
		metric2 = c.getMetricByStatString('demo.device.dns:req');

		if (metric1.id === metric2.id) {
		   console.log(metric1.display_name + ' lookups match!');
		}
	}
);