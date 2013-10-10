define([ 'utils', 'event', 'errors' ], function(utils, SumEvent, errors) {

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