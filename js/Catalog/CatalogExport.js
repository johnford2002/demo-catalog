/**
 * @desc Using browserify, this exports Catalog into the global namespace
 * 		 allowing for client-side use.
 * @author John Ford <john.ford2002@gmail.com
 * @since 2015-01-25
 */
window.Promise = require('es6-promise').Promise;
window.Demo = {};
window.Demo.Catalog = require('./Catalog.js');