define([ 'utils', 'consts', 'errors', 'rpcBase', 'messenger' ], function(utils, consts, errors, RpcBase, Messenger) {

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

			var self = this, regCmdHash = this.__regCmdHash, msger = null;

			function respCb(err, result) {

				if (err) {

					//destroy the messenger if something wrong
					if (msger && msger.destroy) {
						msger.destroy();
					}
				}

				self.__respCmdReq(err, result, request, socketId);
			}

			if (this.hasReged(request.cmd)) {

				msger = this.isService(request.cmd) ? this.__getMessenger(request.tag, socketId) : undefined;

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