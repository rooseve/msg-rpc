define([ 'consts' ], function(consts) {

	'use strict';

	function emptyfunc() {

	}

	var logger = typeof sumLogger == 'object' ? sumLogger : console;

	var isNodeSvr = typeof module != 'undefined' && module.exports;

	if (!logger.debug || isNodeSvr)
		logger.debug = logger.info;

	var utils = {
		log : logger,
		debug : function(on) {

			this.log = on ? logger : {
				error : function() {

					logger.error.apply(logger, arguments);
				},
				warn : emptyfunc,
				info : emptyfunc,
				debug : emptyfunc,
				trace : emptyfunc
			};

			this.__debugMode = on;
		},
		isDebug : function() {

			return !!this.__debugMode;
		},
		isNodeSvr : function() {

			return isNodeSvr;
		},
		timestamp : function() {

			return new Date().getTime();
		},
		randomInt : function(min, max) {

			return Math.floor(Math.random() * (max - min + 1)) + min;
		},
		randomStr : function(length) {

			var str = '', chars = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXTZabcdefghiklmnopqrstuvwxyz', clen = chars.length;

			if (!length)
				length = 6;

			for ( var i = 0; i < length; i++) {
				str += chars.charAt(this.randomInt(0, clen - 1));
			}
			return str;
		},
		extend : function(dst) {

			if (!dst)
				dst = {};

			Array.prototype.slice.call(arguments, 1).forEach(function(source) {

				if (!source)
					return;

				for ( var prop in source) {
					if (source.hasOwnProperty(prop)) {
						dst[prop] = source[prop];
					}
				}
			});

			return dst;
		},
		/**
		 * copy the attr keys in props
		 * 
		 * @param Array|props
		 * @returns
		 */
		subset : function(props) {

			var sobj = {};

			if (!props || !props.length)
				return sobj;

			if (!this.isArray(props))
				props = [ props ];

			Array.prototype.slice.call(arguments, 1).forEach(function(source) {

				if (!source)
					return;

				for ( var i = 0, len = props.length; i < len; i++) {
					if (source.hasOwnProperty(props[i])) {
						sobj[props[i]] = source[props[i]];
					}
				}
			});

			return sobj;
		},
		/**
		 * copy the attr keys not in props
		 * 
		 * @param Array|props
		 * @returns
		 */
		subsetExcept : function(props) {

			var sobj = {};

			if (!props || !props.length)
				return sobj;

			if (!this.isArray(props))
				props = [ props ];

			Array.prototype.slice.call(arguments, 1).forEach(function(source) {

				if (!source)
					return;

				for ( var k in source) {

					if (!source.hasOwnProperty(k) || props.indexOf(k) >= 0)
						continue;

					sobj[k] = source[k];
				}
			});

			return sobj;
		},
		construct : function(constructor, args) {

			function F() {

				return constructor.apply(this, args);
			}

			F.prototype = constructor.prototype;

			return new F();
		},
		isEqual : function(a, b) {

			if (a === b)
				return true;
			if (a === null || b === null)
				return false;
			if (a !== a && b !== b)
				return true;

			var hskey = consts.hashTagKey;

			var t1 = typeof a, t2 = typeof b, length, key = null, keySet;

			if (t1 == t2) {
				if (t1 == 'object') {
					if (this.isArray(a)) {
						if (a.length == b.length) {
							length = a.length;
							for (key = 0; key < length; key++) {
								if (!this.isEqual(a[key], b[key]))
									return false;
							}
							return true;
						}
					} else {

						//this is a little trick to improve performace
						if (hskey && (a[hskey] && b[hskey])) {

							if (a[hskey] === b[hskey])
								return true;

							//if not match, we can not sure equal or not, so go on..
						}

						keySet = {};
						for (key in a) {
							if (!a.hasOwnProperty(key) || this.isSysOwnedFld(key))
								continue;
							if (!this.isEqual(a[key], b[key]))
								return false;
							keySet[key] = true;
						}
						for (key in b) {
							if (!b.hasOwnProperty(key) || this.isSysOwnedFld(key))
								continue;
							if (!keySet[key] && b[key] !== undefined && typeof b[key] !== 'function')
								return false;
						}

						return true;
					}
				}
			}

			return false;
		},
		isArray : function(obj) {

			return Array.isArray ? Array.isArray(obj) : Object.prototype.call(obj) == '[object Array]';
		},
		isObject : function(value) {

			return value !== null && typeof value === 'object';
		},
		isFunction : function(f) {

			return f && typeof f === 'function';
		},
		ownProps : function(obj) {

			if (!obj)
				return {};

			var props = {};
			for ( var k in obj) {
				if (obj.hasOwnProperty(k))
					props[k] = obj[k];
			}

			return obj;
		},
		nextTick : function(f) {

			(typeof process === 'object' && process.nextTick ? process.nextTick : function(task) {

				setTimeout(task, 0);
			})(f);
		},
		size : function(obj) {

			if (obj === null)
				return 0;

			if (obj.length === +obj.length)
				return obj.length;

			var len = 0;
			for ( var k in obj) {
				if (obj.hasOwnProperty(k))
					len++;
			}
			return len;
		},
		inherit : function(child, parent) {

			for ( var key in parent) {
				if (parent.hasOwnProperty(key))
					child[key] = parent[key];
			}

			function Ctor() {

				this.constructor = child;
			}
			Ctor.prototype = parent.prototype;

			child.prototype = new Ctor();
			child.__super__ = parent.prototype;

			return child;
		},
		hidePrivate : function(obj) {

			var proxy = {};

			function get_proxy_func(realfunc, obj) {

				return function() {

					return realfunc.apply(obj, arguments);
				};
			}

			for ( var k in obj) {

				if (!k.charAt || k.charAt(0) == '_')
					continue;

				if (typeof (obj[k]) == 'function') {

					proxy[k] = get_proxy_func(obj[k], obj);

				} else if (obj.hasOwnProperty(k)) {

					proxy[k] = obj[k];
				}
			}

			return proxy;
		},
		copy : function(obj, rc) {

			var out;

			if (this.isArray(obj)) {

				out = [];
				for ( var i = 0, len = obj.length; i < len; i++) {
					out.push(this.copy(obj[i], 1));
				}
				return out;

			} else if (this.isObject(obj)) {

				out = {};
				for ( var k in obj) {
					if (obj.hasOwnProperty(k) && !this.isSysOwnedFld(k))
						out[k] = this.copy(obj[k], 1);
				}
				return out;
			}

			return obj;
		},
		walk : function(obj, wcb, maxlevel) {

			maxlevel = maxlevel || 10;

			var self = this;

			function dowalk(level, ele, parent, pindex) {

				if (level >= maxlevel)
					return;

				if (self.isObject(ele)) {
					for ( var k in ele) {
						if (!ele.hasOwnProperty(k))
							continue;

						dowalk(level + 1, ele[k], ele, k);
					}

				} else if (self.isArray(ele)) {
					for ( var i = 0, len = ele.length; i < len; i++) {
						dowalk(level + 1, ele[i], ele, i);
					}

				} else {

					var nval = wcb(ele, level);
					if (nval === undefined)
						return;

					if (parent) {
						parent[pindex] = nval;
					} else
						return nval;
				}
			}

			return dowalk(0, obj);
		},
		trim : function(s) {

			if (!s)
				return '';

			if (s.trim)
				return s.trim();

			return s.replace(/^\s+|\s+$/g, '');
		},
		ucfirst : function(str) {

			return str.charAt(0).toUpperCase() + str.substr(1);
		},
		strHashCode : function(str) {

			var hash = 0;

			if (str.length === 0)
				return hash;

			var character;

			for ( var i = 0, len = str.length; i < len; i++) {

				character = str.charCodeAt(i);
				hash = ((hash << 5) - hash) + character;
				hash = hash & hash; // Convert to 32bit integer
			}
			return hash;
		},
		getHashTag : function(obj) {

			return this.strHashCode(JSON.stringify(obj));
		},
		setHashTag : function(obj, hash) {

			if (!obj)
				return;

			if (obj[consts.hashTagKey])
				delete obj[consts.hashTagKey];

			obj[consts.hashTagKey] = hash || this.getHashTag(obj);
		},
		isSysOwnedFld : function(k) {

			return k.indexOf(consts.sysKeyPre) === 0;
		},
		inArray : function(val, arr) {

			return this.arrayIndex(val, arr) >= 0;
		},
		arrayIndex : function(val, arr) {

			return this.isArray(arr) ? arr.indexOf(val) : -1;
		}
	};

	//utils.log.info(utils.randomStr(10));

	utils.debug(0);

	return utils;
});