define([ 'utils', 'consts', 'errors', 'event' ], function(utils, consts, errors, Event) {

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