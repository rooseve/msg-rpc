define([ 'utils', 'consts', 'errors', 'rpcBase', 'messenger' ], function(utils, consts, errors, RpcBase, Messenger) {

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