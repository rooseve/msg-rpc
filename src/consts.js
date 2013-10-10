define([], function() {

	'use strict';

	var sysKeyPre = '$$:';

	return {
		//an iden string of this lib
		libIden : 'rs-rpc',

		//version
		version : 1,

		//the key prefix for system owned attributes
		sysKeyPre : sysKeyPre,

		//object hash attribute key
		hashTagKey : sysKeyPre + 'hash'
	};
});