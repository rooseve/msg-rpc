/**
 * Lib for node
 */

var define, defRequire, defndMods = [];

//make a define proxy, so we can record the defined module names
(function(realDefine) {

	define = function(id) {

		if (typeof (id) == 'string') {
			defndMods.push(id);
		}

		realDefine.apply(realDefine, arguments);
	};

	defRequire = realDefine.require;

})(require('amdefine')(module));
