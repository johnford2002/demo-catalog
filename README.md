demo-catalog
=================
Contains a sample node.js catalog module written for either server or client side usage.

This module provides a way to access categories and metrics via an ID or formatted string lookup.

An example server side use can be found in main.js.

	node main.js

An example client side use utilizing an export from browserify can be found in testPage.html. The client side implementation utilizes dist/export-min.js, which is just a minified version of dist/export.js created by using browserify:

	browserify lib/CatalogExport.js > dist/export.js
	