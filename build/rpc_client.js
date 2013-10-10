(function(window, document, undefined){

/**
 * almond 0.2.6 Copyright (c) 2011-2012, The Dojo Foundation All Rights Reserved.
 * Available via the MIT or new BSD license.
 * see: http://github.com/jrburke/almond for details
 */
//Going sloppy to avoid 'use strict' string cost, but strict practices should
//be followed.
/*jslint sloppy: true */
/*global setTimeout: false */

var requirejs, require, define;
(function (undef) {
    var main, req, makeMap, handlers,
        defined = {},
        waiting = {},
        config = {},
        defining = {},
        hasOwn = Object.prototype.hasOwnProperty,
        aps = [].slice;

    function hasProp(obj, prop) {
        return hasOwn.call(obj, prop);
    }

    /**
     * Given a relative module name, like ./something, normalize it to
     * a real name that can be mapped to a path.
     * @param {String} name the relative name
     * @param {String} baseName a real name that the name arg is relative
     * to.
     * @returns {String} normalized name
     */
    function normalize(name, baseName) {
        var nameParts, nameSegment, mapValue, foundMap,
            foundI, foundStarMap, starI, i, j, part,
            baseParts = baseName && baseName.split("/"),
            map = config.map,
            starMap = (map && map['*']) || {};

        //Adjust any relative paths.
        if (name && name.charAt(0) === ".") {
            //If have a base name, try to normalize against it,
            //otherwise, assume it is a top-level require that will
            //be relative to baseUrl in the end.
            if (baseName) {
                //Convert baseName to array, and lop off the last part,
                //so that . matches that "directory" and not name of the baseName's
                //module. For instance, baseName of "one/two/three", maps to
                //"one/two/three.js", but we want the directory, "one/two" for
                //this normalization.
                baseParts = baseParts.slice(0, baseParts.length - 1);

                name = baseParts.concat(name.split("/"));

                //start trimDots
                for (i = 0; i < name.length; i += 1) {
                    part = name[i];
                    if (part === ".") {
                        name.splice(i, 1);
                        i -= 1;
                    } else if (part === "..") {
                        if (i === 1 && (name[2] === '..' || name[0] === '..')) {
                            //End of the line. Keep at least one non-dot
                            //path segment at the front so it can be mapped
                            //correctly to disk. Otherwise, there is likely
                            //no path mapping for a path starting with '..'.
                            //This can still fail, but catches the most reasonable
                            //uses of ..
                            break;
                        } else if (i > 0) {
                            name.splice(i - 1, 2);
                            i -= 2;
                        }
                    }
                }
                //end trimDots

                name = name.join("/");
            } else if (name.indexOf('./') === 0) {
                // No baseName, so this is ID is resolved relative
                // to baseUrl, pull off the leading dot.
                name = name.substring(2);
            }
        }

        //Apply map config if available.
        if ((baseParts || starMap) && map) {
            nameParts = name.split('/');

            for (i = nameParts.length; i > 0; i -= 1) {
                nameSegment = nameParts.slice(0, i).join("/");

                if (baseParts) {
                    //Find the longest baseName segment match in the config.
                    //So, do joins on the biggest to smallest lengths of baseParts.
                    for (j = baseParts.length; j > 0; j -= 1) {
                        mapValue = map[baseParts.slice(0, j).join('/')];

                        //baseName segment has  config, find if it has one for
                        //this name.
                        if (mapValue) {
                            mapValue = mapValue[nameSegment];
                            if (mapValue) {
                                //Match, update name to the new value.
                                foundMap = mapValue;
                                foundI = i;
                                break;
                            }
                        }
                    }
                }

                if (foundMap) {
                    break;
                }

                //Check for a star map match, but just hold on to it,
                //if there is a shorter segment match later in a matching
                //config, then favor over this star map.
                if (!foundStarMap && starMap && starMap[nameSegment]) {
                    foundStarMap = starMap[nameSegment];
                    starI = i;
                }
            }

            if (!foundMap && foundStarMap) {
                foundMap = foundStarMap;
                foundI = starI;
            }

            if (foundMap) {
                nameParts.splice(0, foundI, foundMap);
                name = nameParts.join('/');
            }
        }

        return name;
    }

    function makeRequire(relName, forceSync) {
        return function () {
            //A version of a require function that passes a moduleName
            //value for items that may need to
            //look up paths relative to the moduleName
            return req.apply(undef, aps.call(arguments, 0).concat([relName, forceSync]));
        };
    }

    function makeNormalize(relName) {
        return function (name) {
            return normalize(name, relName);
        };
    }

    function makeLoad(depName) {
        return function (value) {
            defined[depName] = value;
        };
    }

    function callDep(name) {
        if (hasProp(waiting, name)) {
            var args = waiting[name];
            delete waiting[name];
            defining[name] = true;
            main.apply(undef, args);
        }

        if (!hasProp(defined, name) && !hasProp(defining, name)) {
            throw new Error('No ' + name);
        }
        return defined[name];
    }

    //Turns a plugin!resource to [plugin, resource]
    //with the plugin being undefined if the name
    //did not have a plugin prefix.
    function splitPrefix(name) {
        var prefix,
            index = name ? name.indexOf('!') : -1;
        if (index > -1) {
            prefix = name.substring(0, index);
            name = name.substring(index + 1, name.length);
        }
        return [prefix, name];
    }

    /**
     * Makes a name map, normalizing the name, and using a plugin
     * for normalization if necessary. Grabs a ref to plugin
     * too, as an optimization.
     */
    makeMap = function (name, relName) {
        var plugin,
            parts = splitPrefix(name),
            prefix = parts[0];

        name = parts[1];

        if (prefix) {
            prefix = normalize(prefix, relName);
            plugin = callDep(prefix);
        }

        //Normalize according
        if (prefix) {
            if (plugin && plugin.normalize) {
                name = plugin.normalize(name, makeNormalize(relName));
            } else {
                name = normalize(name, relName);
            }
        } else {
            name = normalize(name, relName);
            parts = splitPrefix(name);
            prefix = parts[0];
            name = parts[1];
            if (prefix) {
                plugin = callDep(prefix);
            }
        }

        //Using ridiculous property names for space reasons
        return {
            f: prefix ? prefix + '!' + name : name, //fullName
            n: name,
            pr: prefix,
            p: plugin
        };
    };

    function makeConfig(name) {
        return function () {
            return (config && config.config && config.config[name]) || {};
        };
    }

    handlers = {
        require: function (name) {
            return makeRequire(name);
        },
        exports: function (name) {
            var e = defined[name];
            if (typeof e !== 'undefined') {
                return e;
            } else {
                return (defined[name] = {});
            }
        },
        module: function (name) {
            return {
                id: name,
                uri: '',
                exports: defined[name],
                config: makeConfig(name)
            };
        }
    };

    main = function (name, deps, callback, relName) {
        var cjsModule, depName, ret, map, i,
            args = [],
            usingExports;

        //Use name if no relName
        relName = relName || name;

        //Call the callback to define the module, if necessary.
        if (typeof callback === 'function') {

            //Pull out the defined dependencies and pass the ordered
            //values to the callback.
            //Default to [require, exports, module] if no deps
            deps = !deps.length && callback.length ? ['require', 'exports', 'module'] : deps;
            for (i = 0; i < deps.length; i += 1) {
                map = makeMap(deps[i], relName);
                depName = map.f;

                //Fast path CommonJS standard dependencies.
                if (depName === "require") {
                    args[i] = handlers.require(name);
                } else if (depName === "exports") {
                    //CommonJS module spec 1.1
                    args[i] = handlers.exports(name);
                    usingExports = true;
                } else if (depName === "module") {
                    //CommonJS module spec 1.1
                    cjsModule = args[i] = handlers.module(name);
                } else if (hasProp(defined, depName) ||
                           hasProp(waiting, depName) ||
                           hasProp(defining, depName)) {
                    args[i] = callDep(depName);
                } else if (map.p) {
                    map.p.load(map.n, makeRequire(relName, true), makeLoad(depName), {});
                    args[i] = defined[depName];
                } else {
                    throw new Error(name + ' missing ' + depName);
                }
            }

            ret = callback.apply(defined[name], args);

            if (name) {
                //If setting exports via "module" is in play,
                //favor that over return value and exports. After that,
                //favor a non-undefined return value over exports use.
                if (cjsModule && cjsModule.exports !== undef &&
                        cjsModule.exports !== defined[name]) {
                    defined[name] = cjsModule.exports;
                } else if (ret !== undef || !usingExports) {
                    //Use the return value from the function.
                    defined[name] = ret;
                }
            }
        } else if (name) {
            //May just be an object definition for the module. Only
            //worry about defining if have a module name.
            defined[name] = callback;
        }
    };

    requirejs = require = req = function (deps, callback, relName, forceSync, alt) {
        if (typeof deps === "string") {
            if (handlers[deps]) {
                //callback in this case is really relName
                return handlers[deps](callback);
            }
            //Just return the module wanted. In this scenario, the
            //deps arg is the module name, and second arg (if passed)
            //is just the relName.
            //Normalize module name, if it contains . or ..
            return callDep(makeMap(deps, callback).f);
        } else if (!deps.splice) {
            //deps is a config object, not an array.
            config = deps;
            if (callback.splice) {
                //callback is an array, which means it is a dependency list.
                //Adjust args if there are dependencies
                deps = callback;
                callback = relName;
                relName = null;
            } else {
                deps = undef;
            }
        }

        //Support require(['a'])
        callback = callback || function () {};

        //If relName is a function, it is an errback handler,
        //so remove it.
        if (typeof relName === 'function') {
            relName = forceSync;
            forceSync = alt;
        }

        //Simulate async callback;
        if (forceSync) {
            main(undef, deps, callback, relName);
        } else {
            //Using a non-zero value because of concern for what old browsers
            //do, and latest browsers "upgrade" to 4 if lower value is used:
            //http://www.whatwg.org/specs/web-apps/current-work/multipage/timers.html#dom-windowtimers-settimeout:
            //If want a value immediately, use require('id') instead -- something
            //that works in almond on the global level, but not guaranteed and
            //unlikely to work in other AMD implementations.
            setTimeout(function () {
                main(undef, deps, callback, relName);
            }, 4);
        }

        return req;
    };

    /**
     * Just drops the config on the floor, but returns req in case
     * the config return value is used.
     */
    req.config = function (cfg) {
        config = cfg;
        if (config.deps) {
            req(config.deps, config.callback);
        }
        return req;
    };

    /**
     * Expose module registry for debugging and tooling
     */
    requirejs._defined = defined;

    define = function (name, deps, callback) {

        //This module may not have dependencies
        if (!deps.splice) {
            //deps is not an array, so probably means
            //an object literal or factory function for
            //the value. Adjust args.
            callback = deps;
            deps = [];
        }

        if (!hasProp(defined, name) && !hasProp(waiting, name)) {
            waiting[name] = [name, deps, callback];
        }
    };

    define.amd = {
        jQuery: true
    };
}());

define("almond", function(){});

define('consts',[], function() {

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
define('utils',[ 'consts' ], function(consts) {

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
define('errors',[], function() {

	'use strict';

	return {

		BadReq : '400: Bad Request',

		Timeout : '408: Timeout',

		NotFound : '404: NotFound',

		NetError : '600: Network error',

		Unknown : '-1: Unknown error',

		Failed : '-2: Failed'
	};
});
define('event',[ 'utils' ], function(utils) {

	'use strict';

	/**
	 * Just an event pattern implementation
	 */
	function Event() {

		//the hash to store event/listeners
		this.__evHash = {};

	}

	utils.extend(Event.prototype, {

		/**
		 * Listen event
		 * 
		 * on('event1', callback, 20)
		 * 
		 * on('event1 event2 event3', callback)
		 * 
		 * on({ event1: callback1, event2:callback2 })
		 * 
		 * @param ev,
		 *            event name
		 * @param listener,
		 *            callback function
		 * @param priority,
		 *            the higher, the earlier to be called, default 10
		 * @returns this
		 */
		on : function(ev, listener, priority) {

			if (this.__multiCall(ev, listener, this.on))
				return this;

			var evHash = this.__evHash;

			if (!evHash[ev])
				evHash[ev] = [];

			var list = evHash[ev];

			var index = this.__index(list, listener);

			if (index < 0) {
				if (typeof (priority) != 'number')
					priority = 10;

				var inps = list.length;

				for ( var i = 0, len = list.length; i < len; i++) {
					if (priority > list[i].priority) {
						inps = i;
						break;
					}
				}

				list.splice(inps, 0, {
					listener : listener,
					priority : priority
				});
			}

			return this;
		},
		once : function(ev, listener, priority) {

			if (this.__multiCall(ev, listener, this.once))
				return this;

			var self = this;

			function oncefunc() {

				self.__callListenser(listener, arguments);
				self.off(ev, oncefunc);
			}

			this.on(ev, oncefunc, priority);

			return this;
		},
		offAll : function() {

			for ( var ev in this.__evHash) {
				this.off(ev);
			}

			this.__evHash = {};

			return this;
		},
		off : function(ev, listener) {

			if (this.__multiCall(ev, listener, this.off))
				return this;

			var evHash = this.__evHash;

			if (!evHash[ev])
				return;

			var list = evHash[ev];

			if (typeof (listener) != 'undefined') {

				var index = this.__index(list, listener);

				if (index >= 0) {
					list.splice(index, 1);

					return 1;
				}

			} else {

				var c = list.length;
				list.length = 0;

				return c;
			}

			return 0;
		},
		emit : function(ev) {

			var evHash = this.__evHash, args, count = 0, list;

			list = evHash[ev];

			if (list && list.length) {

				args = Array.prototype.slice.call(arguments, 1);

				count += this.__callListenerList(list, args);
			}

			//wild events bind, * means bind to all events
			list = evHash['*'];

			if (list && list.length) {

				//tell the exact event name
				args = Array.prototype.slice.call(arguments);

				count += this.__callListenerList(list, args);
			}

			return count;
		},
		onDestroy : function(cb, priority) {

			this.on('__destroy', cb, priority);

			return this;
		},
		destroy : function() {

			//this flag can avoid some circle dependency
			if (this.__destroying) {
				//utils.log.info('destroy going on');
				return;
			}

			this.__destroying = 1;

			this.emit('__destroy', this);

			this.offAll();

			return this;
		},
		__multiCall : function(ev, listener, func) {

			if (utils.isObject(ev) && typeof (listener) == 'undefined') {

				for ( var k in ev) {
					func.call(this, k, ev[k]);
				}
				return true;

			} else if (typeof (ev) == 'string') {

				var evs = ev.split(/[\s,]+/);

				if (evs.length > 1) {

					for ( var i = 0, len = evs.length; i < len; i++) {
						func.call(this, evs[i], listener);
					}

					return true;
				}
			}

			return false;
		},
		__index : function(list, listener) {

			var index = -1;

			list.some(function(ele, i) {

				if (utils.isEqual(ele.listener, listener)) {
					index = i;
					return true;
				}

			});

			return index;
		},
		__callListenser : function(listener, args) {

			var func = null, contxt = null;

			if (typeof (listener) == 'function') {

				func = listener;
				contxt = this;

			} else if (listener.length == 2) {

				func = listener[1];
				contxt = listener[0];
			}

			if (func) {
				return [ 1, func.apply(contxt, args) ];
			}

			return [ 0, undefined ];
		},
		__callListenerList : function(list, args) {

			if (!list || !list.length)
				return 0;

			//copy this list, as the cb might alter the list by on/off during the loop
			list = [].concat(list);

			var count = 0, cres;

			for ( var i = 0, len = list.length; i < len; i++) {

				cres = this.__callListenser(list[i].listener, args);

				count += cres[0];

				if (cres[1] === false) {
					//the call return false, stop here
					//utils.log.debug('.. stop ev loop: ' + ev);
					break;
				}
			}

			return count;
		}
	});

	return Event;
});
define('rpcBase',[ 'utils', 'consts', 'errors', 'event' ], function(utils, consts, errors, Event) {

	'use strict';

	function RpcBase(msgSender) {

		this.PipeNs = {
			//Pipeline for rpc calls
			Rpc : 'rs-rpc',

			//Pipeline for messenger
			Msger : 'rs-msger'
		};

		RpcBase.__super__.constructor.apply(this, arguments);

		this.setSender(msgSender);
	}

	utils.inherit(RpcBase, Event);

	utils.extend(RpcBase.prototype, {

		setSender : function(sender) {

			if (!utils.isObject(sender) || !utils.isFunction(sender.sendMessage))
				throw new Error('msgSender should implement function sendMessage(msg, [callback])');

			this.__msgSender = sender;
		},
		/**
		 * pack the msg to send via a virtual pipeline
		 * 
		 * @param msg
		 * @param pipe
		 */
		sendPipeMsg : function(msg, pipe/*socketId, cb*/) {

			this.__msgSender.sendMessage.apply(this.__msgSender, [ {
				m : msg,
				p : pipe,
				v : consts.version,
				u : consts.libIden
			} ].concat(Array.prototype.slice.call(arguments, 2)));
		},
		/**
		 * Listen on msg came through specific pipeline
		 * 
		 * @param pipe
		 * @param cb
		 */
		onPipeMsg : function(pipe, cb) {

			this.on('pipe_msg_' + pipe, cb);
		},
		/**
		 * check if the msg is for this lib
		 * 
		 * @param msg
		 * @returns {Boolean}
		 */
		isRpcMsg : function(msg) {

			return utils.isObject(msg) && msg.u == consts.libIden;
		},
		/**
		 * This will be called by the real communication module, like websocket. When a message came in, pass the
		 * message into this rpc system
		 * 
		 * @param msg
		 */
		message : function(msg/*socketId*/) {

			if (utils.isObject(msg) && msg.p && msg.m) {

				this.emit.apply(this, [ 'pipe_msg_' + msg.p, msg.m ].concat(Array.prototype.slice.call(arguments, 1)));

			} else {
				utils.log.warn('Unknown msg format: ', msg);
			}
		}
	});

	return RpcBase;
});
define('messenger',[ 'utils', 'event', 'errors' ], function(utils, SumEvent, errors) {

	'use strict';

	var ResCmdConsumed = '__ResCmdConsumed', defCmds = {
		ping : function(cmd, args, cb) {

			cb(null, {
				timestamp : Date.now(),
				args : args
			});
		}
	}, defPipeline = '__';

	/**
	 * Messengers works as a pair, which can send msg/cmd to each other
	 * 
	 * msgSender an interface which implements function sendMessage, like this:
	 * 
	 * <code>
	 * {
	 * 		sendMessage : function(msg, callback) {
	 * 			//send msg out
	 * 			
	 * 			//callback(error, result);
	 *  	} 
	 * }
	 * </code>
	 * 
	 * msg is just the data, e.g. { a:1, b:"hi"}, which will be sent to the other side.
	 * 
	 * callback is a node style function(error, result) to indicate if the send action is successful or not.
	 * "Successful" here just means the msg is sent out, not guarantee to be received by the other side.
	 * 
	 * Messenger itself got 2 pairs of methods,
	 * 
	 * sendMessage/onMessage
	 * 
	 * callCmd/onCmd(cmd is )
	 * 
	 */
	function Messenger(msgSender) {

		Messenger.__super__.constructor.apply(this, arguments);

		this.__idenStr = utils.randomStr(10);

		this.__seqBase = 1;

		this.__cmdCbHash = {};

		this.__msgInCount = this.__msgOutCount = 0;

		this.setSender(msgSender);

		this.__listenCmd();

		this.__bindDefCmds();

		this.__markActive();
	}

	/**
	 * 
	 * @returns a local pair of messengers, which can [ sendMessage to /callCmd of ] each other
	 */
	Messenger.getLocalPair = function() {

		var m1 = new Messenger(), m2 = new Messenger();

		m1.setSender({
			sendMessage : function(msg, cb) {

				m2.message(msg);

				if (cb)
					cb(null, true);
			}
		});

		m2.setSender({
			sendMessage : function(msg, cb) {

				m1.message(msg);

				if (cb)
					cb(null, true);
			}
		});

		return [ m1, m2 ];
	};

	utils.inherit(Messenger, SumEvent);

	utils.extend(Messenger.prototype, {
		/**
		 * Send a msg to the other side
		 * 
		 * Various argument possibilities:
		 * 
		 * sendMessage({ data: 'hello' });
		 * 
		 * sendMessage('pipelineA', { data: 'hello'}, function(err, result){});
		 * 
		 * @param msg,
		 *            the msg data to be sent
		 * 
		 * @param [pipe],
		 *            optional, the pipeline to be used, optional
		 * 
		 * @param [cb],
		 *            optional, a node style callback function
		 * 
		 */
		sendMessage : function(msg, pipe, cb) {

			if (typeof (pipe) == 'function') {
				cb = pipe;
				pipe = false;
			}

			var self = this;

			self.__msgSender.sendMessage({
				p : pipe || defPipeline,
				m : msg
			}, function(err) {

				if (!err) {
					//send out successful, update status
					self.__lastMsgOutTs = utils.timestamp();
					self.__msgOutCount++;
					self.__markActive();

				} else {
					self.__reduceLife();
				}

				if (cb) {
					cb.apply(undefined, arguments);
				}
			});

			return this;
		},
		/**
		 * Listen for message coming
		 * 
		 * Various argument possibilities:
		 * 
		 * @param pipe
		 * @param cb
		 * @param priority
		 */
		onMessage : function(cb, pipe, priority) {

			if (!utils.isFunction(cb)) {
				throw new Error('a callback function must be provided');
			}

			if (typeof (pipe) == 'number') {

				priority = pipe;
				pipe = false;
			}

			var self = this;

			pipe = pipe || defPipeline;

			function onpacket(packet) {

				if (packet.p && (!pipe || pipe == '*' || packet.p == pipe)) {

					var cbres = cb(packet.m, packet.p);

					if (cbres == ResCmdConsumed) {

						self.off('__msg', onpacket);

						return false;
					}

					return cbres;
				}
			}

			this.on('__msg', onpacket, priority);

			return this;
		},
		/**
		 * Remote procedure call the other side, or we can say, send a cmd and expect a response
		 * 
		 * @param cmd,
		 *            to identity a procedure
		 * 
		 * @param args,
		 *            arguments passed to the procedure, e.g. {a:1, b:2...}
		 * 
		 * @param cb,
		 *            node style callback function(error, result), which is the response of the other side
		 * 
		 * @param options, -
		 *            timeout, in milliseconds, if the other side doesn't response in this time, cb(error) directly
		 * 
		 */
		callCmd : function(cmd, args, cb, options) {

			if (typeof (args) == 'function') {
				cb = args;
				options = cb;
				args = {};
			}

			var defopts = {
				timeout : 10000
			};

			options = utils.extend({}, defopts, options);

			var ctag = 'c' + (this.__seqBase++) + '_' + this.__idenStr, self = this,

			//the specific pipeline
			cmdPipe = this.__getCmdPipe(cmd, ctag),

			timeoutHandler = setTimeout(function() {

				self.message({
					p : cmdPipe,
					m : {
						err : errors.Timeout,
						result : 'timeout within ' + options.timeout
					}
				});

			}, options.timeout);

			this.onMessage(function(msg) {

				clearTimeout(timeoutHandler);

				utils.log.debug('msger cmd back', cmd);

				try {
					cb(msg.err, msg.result);
				} catch (exp) {
					utils.log.error(exp.stack);
				}

				return ResCmdConsumed;

			}, cmdPipe, 99999);

			this.sendMessage({
				cmd : cmd,
				args : args,
				ctag : ctag
			}, cmdPipe, function(err) {

				if (!err)
					return;

				self.message({
					p : cmdPipe,
					m : {
						err : errors.NetError,
						result : err
					}
				});
			});

			utils.log.debug('msger send cmd', cmd);

			return this;
		},
		/**
		 * 
		 * @param cmd,
		 *            to identity a procedure
		 * @param cb,
		 *            node style callback function
		 */
		onCmd : function(cmd, cb) {

			if (typeof (cmd) == 'function') {
				cb = cmd;
				cmd = '*';
			}

			if (this.__cmdCbHash[cmd]) {

				utils.log.error('cmd alreay listened: ' + cmd);
				return;
			}

			this.__cmdCbHash[cmd] = cb;

			return this;
		},
		__getCmdPipe : function(cmd, ctag) {

			return 'c_' + cmd + '_' + ctag;
		},
		/**
		 * Listen for cmd call requests
		 */
		__listenCmd : function() {

			var self = this;

			function get_cb(pipe) {

				return function(err, result) {

					self.sendMessage({
						err : err,
						result : result
					}, pipe, function(err) {

						if (err) {
							utils.log.warn('cmd resp failed', cmd);
						}
					});

				};
			}

			this.onMessage(function(msg, pipe) {

				if (!(utils.isObject(msg) && msg.cmd && msg.ctag && pipe == self.__getCmdPipe(msg.cmd, msg.ctag))) {
					//not cmd msg
					return;
				}

				var matchFunc = false;

				for ( var cmd in self.__cmdCbHash) {

					if (msg.cmd == cmd) {

						matchFunc = self.__cmdCbHash[cmd];
						break;
					}
				}

				//the wild math is the last option
				if (!matchFunc && msg.cmd != '*' && self.__cmdCbHash['*']) {
					matchFunc = self.__cmdCbHash['*'];
				}

				if (matchFunc) {

					try {
						matchFunc(msg.cmd, msg.args || {}, get_cb(pipe));
					} catch (exp) {
						utils.log.error(exp.stack);
					}

					//stop bubble this message
					return false;

				} else {
					get_cb(pipe)('404 Unkown cmd: ' + msg.cmd);
				}

			}, '*', 99999);
		},
		setSender : function(sender) {

			if (!utils.isObject(sender) || !utils.isFunction(sender.sendMessage))
				throw new Error('msgSender should implement function sendMessage');

			this.__msgSender = sender;
		},
		getStatus : function() {

			return {
				msgIn : this.__msgInCount,
				msgOut : this.__msgOutCount,
				lifeValue : this.__lifeValue,
				lastAct : this.__lastActiveTs,
				lastOut : this.__lastMsgOutTs,
				lastIn : this.__lastMsgInTs
			};
		},
		__bindDefCmds : function() {

			for ( var k in defCmds) {
				this.onCmd(k, defCmds[k]);
			}
		},
		__markActive : function() {

			this.__lastActiveTs = utils.timestamp();
			this.__lifeValue = 5;

		},
		__reduceLife : function() {

			this.__lifeValue--;

			if (this.__lifeValue <= 0 && utils.timestamp() - this.__lastActiveTs > 60 * 1000) {

				utils.log.warn('messenger dead', this);

				this.emit('__dead', this.getStatus());
			}
		},
		destroy : function() {

			Messenger.__super__.destroy.apply(this, arguments);

			this.setSender({
				sendMessage : function() {

					utils.log.error('messenger has been destroyed');
				}
			});

			utils.log.debug('Messenger destroyed');
		},
		message : function(msg) {

			this.emit('__msg', msg);

			this.__lastMsgInTs = utils.timestamp();
			this.__msgInCount++;
			this.__markActive();

			return this;
		}
	});

	//aliases
	var aliases = {
		sendCmd : 'callCmd',

		rpc : 'callCmd',
		onRpc : 'onCmd',

		sendMsg : 'sendMessage',
		onMsg : 'onMessage'
	};

	for ( var k in aliases) {
		Messenger.prototype[k] = Messenger.prototype[aliases[k]];
	}

	return Messenger;

});
define('rpcClient',[ 'utils', 'consts', 'errors', 'rpcBase', 'messenger' ], function(utils, consts, errors, RpcBase, Messenger) {

	'use strict';

	/**
	 * Rpc client, which send rpc requests
	 * 
	 * <pre>
	 * rpcClient.rpc('procedureA', {arg1:1, arg2:2}, function(error, result [,messenger]){
	 * 
	 *     //if procedureA is a service(determined by server), the 3rd parameter messenger will be passed in
	 *     //and you can use this messenger to sendMessage/onMessage, callCmd/onCmd
	 *     
	 * });
	 * </pre>
	 */
	function RpcClient(msgSender) {

		RpcClient.__super__.constructor.apply(this, arguments);

		this.__cmdCbHash = {};

		this.__msgerHash = {};

		this.__seqBase = 1;

		this.__idenStr = utils.randomStr(10);

		//Listen on rpc pipeline for response
		this.onPipeMsg(this.PipeNs.Rpc, function(data) {

			if (!utils.isObject(data) || !data.request) {
				return;
			}

			this.__finRpc(data.request.cmd, data.request.tag, data.err, data.result, data.isService);
		});

		//Listen on messenger pipeline
		this.onPipeMsg(this.PipeNs.Msger, function(data) {

			if (!utils.isObject(data) || !data.tag) {
				return;
			}

			var msgerHash = this.__msgerHash;

			//pass the message to the specific messenger
			if (msgerHash[data.tag]) {
				msgerHash[data.tag].message(data.msg);
				return;
			}
		});
	}

	utils.inherit(RpcClient, RpcBase);

	utils.extend(RpcClient.prototype, {

		/**
		 * Send a rpc call to the server side
		 * 
		 * @param cmd
		 *            String, to identify the remote procedure to be called
		 * @param args
		 *            Object, the arguments passed to the remote procedure
		 * @param cb
		 *            Function, which will be called when the server response came.
		 * @param options
		 *            Object, [timeout]
		 * @returns {String}
		 */
		rpc : function(cmd, args, cb, options) {

			if (typeof (cmd) != 'string') {
				throw new Error('param cmd should be a string');
			}

			if (args instanceof Function) {
				cb = args;
				args = {};
			} else {
				args = args || {};
			}

			if (!utils.isObject(args)) {
				throw new Error('param args should be an object, e.g. {a:1, b:2}');
			}

			var self = this, cmdCbHash = this.__cmdCbHash,

			//an unique tag to identify this msg
			tag = 'r' + (this.__seqBase++) + '_' + this.__idenStr;

			var defopts = {
				timeout : 10000
			};

			options = utils.extend({}, defopts, options);

			var timeout = options.timeout;

			cb = (cb instanceof Function) ? cb : false;

			//when the other side response, it'll carry the "tag", so we can find the corresponding callback function 
			cmdCbHash[tag] = {
				cb : cb,
				timeout : timeout,
				timeoutHandler : setTimeout(function() {

					utils.log.info('Cmd timeout: ' + cmd + ': ' + tag);

					self.__finRpc(cmd, tag, errors.Timeout, 'Time out: ' + timeout);

				}, timeout)
			};

			//send the msg out
			this.sendPipeMsg({
				cmd : cmd,
				args : args,
				tag : tag
			}, this.PipeNs.Rpc, function(err) {

				if (err) {
					self.__finRpc(cmd, tag, err, 'Send out failed');
				}

			});

			utils.log.debug('Rpc: ', cmd);

			return tag;
		},
		/**
		 * The rpc response came back
		 * 
		 * @param cmd
		 * @param tag
		 * 
		 * @param err
		 * @param result
		 * 
		 * @param isService.
		 *            when true, create a messenger
		 */
		__finRpc : function(cmd, tag, err, result, isService) {

			utils.log.debug('Rpc back: ', cmd);

			var cmdCbHash = this.__cmdCbHash, cbInfo = cmdCbHash[tag];

			if (!cbInfo) {
				return;
			}

			delete cmdCbHash[tag];

			if (cbInfo.timeoutHandler)
				clearTimeout(cbInfo.timeoutHandler);

			if (cbInfo.cb) {

				var cbArgs = [ err, result ];

				if (isService)
					cbArgs.push(this.__getMessenger(tag));

				cbInfo.cb.apply(undefined, cbArgs);
			}

		},
		/**
		 * Create a messenger, which has a corresponding server side messenger there to communicate with
		 * 
		 * @param tag
		 * @returns
		 */
		__getMessenger : function(tag) {

			var self = this, msgerHash = this.__msgerHash;

			if (msgerHash[tag])
				return msgerHash[tag];

			var messenger = new Messenger({

				sendMessage : function(msg, cb) {

					self.sendPipeMsg({
						msg : msg,
						tag : tag
					}, self.PipeNs.Msger, function(err) {

						if (err) {
							if (cb)
								cb(err, null);
						}

					});
				}
			});

			messenger.onDestroy(function() {

				delete msgerHash[tag];
			});

			msgerHash[tag] = messenger;

			return utils.hidePrivate(messenger);
		}
	});

	return RpcClient;
});
window.RsWsRpc={
		Client: require('rpcClient')
};

})(window, document, void(0));