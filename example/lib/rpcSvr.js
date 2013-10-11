module.exports = function(rpcSvr, MsgRpc) {

	//show log
	MsgRpc.utils.debug(1);

	//Register a normal procedure named procedureA
	rpcSvr.regRpc('procedureA', function(socketId, args, callback) {

		//response to the request
		callback(null, {
			timestamp : MsgRpc.utils.timestamp(),
			args : args
		});
	});

	//find the max element
	rpcSvr.regRpc('maxOfArr', function(socketId, args, callback) {

		//response to the request
		callback(null, {
			max : Math.max.apply(Math, args.arr)
		});
	});

	//Register a service named serviceA, service will get a messenger param, which make it distinguish from normal procedure
	rpcSvr.regService('serviceB', function(socketId, args, callback, messenger) {

		//Listen for message
		messenger.onMsg(function(msg, pipe) {

			var seq = 1;

			messenger.sendMsg({
				msg : "lot of message coming"
			});

			var handler = setInterval(function() {

				messenger.sendMsg({
					seq : seq++,
					timestamp : MsgRpc.utils.timestamp(),
					msg : msg
				});

			}, 3000);

			messenger.onDestroy(function() {

				clearInterval(handler);
			});

		});

		//Listen for all cmds
		messenger.onCmd(function(cmd, args, cb) {

			cb(null, {
				wildmatch : true,
				timestamp : MsgRpc.utils.timestamp(),
				cmd : cmd,
				args : args
			});
		});

		//Listen for specific cmd
		messenger.onCmd('msger_cmdA', function(cmd, args, cb) {

			cb(null, {
				timestamp : MsgRpc.utils.timestamp(),
				cmd : cmd,
				args : args
			});
		});

		//response to the request
		callback(null, {
			timestamp : MsgRpc.utils.timestamp(),
			args : args
		});
	});
};