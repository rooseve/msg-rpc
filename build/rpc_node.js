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

define('consts',[], function() {

	'use strict';

	var sysKeyPre = '$$:';

	return {
		//an iden string of this lib
		libIden : 'msg-rpc',

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

		this.__pkSeqBase = 1;

		this.__idenStr = utils.randomStr(10);

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
				//some kind of useragent for this msg package
				u : consts.libIden,

				//lib version, as the client/server might not use the same version, this might helpful for compatibility
				v : consts.version,

				//the identity str for this client/server
				i : this.__idenStr,

				//the package sequence number of this life cycle
				s : this.__pkSeqBase++,

				//the pipeline to use
				p : pipe,

				//the message data
				m : msg

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

			}, cmdPipe, 99999999);

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

			},

			//Listen all messages and filter out the cmd ones
			'*',

			//very high priority, so we can intercept cmd msg as early as possible
			9999999);
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

			this.emit.apply(this, [ '__msg' ].concat(Array.prototype.slice.call(arguments)));

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
define('rpcServer',[ 'utils', 'consts', 'errors', 'rpcBase', 'messenger' ], function(utils, consts, errors, RpcBase, Messenger) {

	'use strict';

	/**
	 * Rpc server, which listen on rpc requests
	 * 
	 * 
	 */
	function RpcServer(msgSender) {

		RpcServer.__super__.constructor.apply(this, arguments);

		this.__regCmdHash = {};

		this.__serviceFlag = {};

		this.__msgerHash = {};

		this.__sockMsgerList = {};

		//Listen on rpc pipeline for requests
		this.onPipeMsg(this.PipeNs.Rpc, function(request, socketId) {

			if (!utils.isObject(request) || !request.cmd || !request.tag) {
				return;
			}

			var self = this, regCmdHash = this.__regCmdHash;

			function respCb(err, result) {

				self.__respCmdReq(err, result, request, socketId);
			}

			if (this.hasReged(request.cmd)) {

				var msger = this.isService(request.cmd) ? this.__getMessenger(request.tag, socketId) : undefined;

				(regCmdHash[request.cmd])(socketId, request.args || {}, respCb, msger);

			} else {

				respCb(404, 'Unknown cmd: ' + request.cmd);
			}
		});

		//Listen on messenger pipeline
		this.onPipeMsg(this.PipeNs.Msger, function(data, socketId) {

			if (!utils.isObject(data) || !data.tag) {
				return;
			}

			var msgerHash = this.__msgerHash;

			if (msgerHash[data.tag]) {

				msgerHash[data.tag].message(data.msg);
				return;

			}

			utils.log.debug('Unknown msg', data);
		});

		this.setSender(msgSender);
	}

	utils.inherit(RpcServer, RpcBase);

	function getCmdCbFunc(cmd, args, callback) {

		return function() {

			utils.log.debug('Call: ' + cmd);

			if (callback) {

				try {

					callback.apply(null, Array.prototype.slice.apply(arguments).concat(args));

				} catch (exp) {

					utils.log.error(exp.stack);
				}
			}
		};
	}

	utils.extend(RpcServer.prototype, {
		/**
		 * Register a procedure
		 * 
		 * @param cmd
		 *            String, an identity of this procedure
		 */
		regRpc : function(/*cmd, arg1, arg2... callback*/) {

			var args = Array.prototype.slice.apply(arguments);

			var cmd = args.shift(), callback = args.pop(), regCmdHash = this.__regCmdHash;

			if (regCmdHash[cmd]) {
				utils.log.info('Waring: ' + cmd + ' already exists');
			}

			regCmdHash[cmd] = getCmdCbFunc(cmd, args, callback);

			utils.log.info('Reg: ' + cmd);
		},
		/**
		 * Register the procedure as a service.
		 * 
		 * The big different here is service got a messenger parameter to communicate with the client
		 * 
		 * @param cmd
		 */
		regService : function(cmd) {

			this.__serviceFlag[cmd] = true;

			this.regRpc.apply(this, arguments);
		},
		isService : function(cmd) {

			return !!this.__serviceFlag[cmd];
		},
		hasReged : function(cmd) {

			return !!this.__regCmdHash[cmd];
		},
		/**
		 * If the socket disconnect, cal this to clean up
		 * 
		 * @param socketId
		 */
		clearupSocketId : function(socketId) {

			var sockMsgerList = this.__sockMsgerList;

			if (!sockMsgerList[socketId])
				return;

			sockMsgerList[socketId].forEach(function(messenger) {

				messenger.destroy();
			});

			sockMsgerList[socketId].length = 0;

			delete sockMsgerList[socketId];
		},
		message : function(msg, socketId) {

			if (!socketId || typeof (socketId) != 'string') {
				throw new Error('String type socketId is supposed to be passed in as the 2nd param');
			}

			RpcServer.__super__.message.apply(this, arguments);
		},
		__respCmdReq : function(err, result, request, socketId) {

			var self = this;

			this.sendPipeMsg({
				err : err,
				result : result,
				request : utils.subset([ 'cmd', 'tag' ], request),
				isService : self.isService(request.cmd) ? 1 : 0
			}, this.PipeNs.Rpc, socketId, function(err) {

				if (err)
					utils.log.error('send cmd_response_from_server error...', err);
			});
		},
		__getMessenger : function(tag, socketId) {

			var self = this, msgerHash = this.__msgerHash, sockMsgerList = this.__sockMsgerList;

			if (msgerHash[tag])
				return msgerHash[tag];

			var messenger = new Messenger({

				sendMessage : function(msg, cb) {

					self.sendPipeMsg({
						msg : msg,
						tag : tag
					}, self.PipeNs.Msger, socketId, function(err) {

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

			if (!sockMsgerList[socketId]) {
				sockMsgerList[socketId] = [];
			}
			sockMsgerList[socketId].push(messenger);

			return utils.hidePrivate(messenger);
		}
	});

	return RpcServer;
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

		this.__rpcSeqBase = 1;

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
			tag = 'r' + (this.__rpcSeqBase++) + '_' + this.__idenStr;

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
});//console.log(defndMods);

var expts = {
	isNodeSvr : true
};

for ( var i = 0, len = defndMods.length; i < len; i++) {
	expts[defndMods[i]] = defRequire(defndMods[i]);
}

var exNameMap = {};

for ( var k in exNameMap) {
	expts[k] = defRequire(exNameMap[k]);
}

module.exports = expts;