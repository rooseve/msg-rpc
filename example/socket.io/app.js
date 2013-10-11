var app = require('http').createServer(function(req, res) {

	if (req.url == '/')
		req.url = '/index.html';

	if (req.url.indexOf('/build') === 0) {
		req.url = '/../..' + req.url;
	}

	fs.readFile(__dirname + req.url, function(err, data) {

		if (err) {
			res.writeHead(500);
			return res.end('Error loading ' + req.url);
		}

		res.writeHead(200);
		res.end(data);
	});

}), io = require('socket.io').listen(app), fs = require('fs');

//require the rpc lib
var MsgRpc = require(__dirname + '/../../build/rpc_node.js'), RpcSvrCls = MsgRpc.rpcServer;

//show log
MsgRpc.utils.debug(1);

//Create a rpcServer
var rpcSvr = new RpcSvrCls({
	sendMessage : function(msg, socketId, cb) {

		if (!clients[socketId]) {
			cb(404, socketId + ' not found');
			return;
		}

		//send the msg
		clients[socketId].send(JSON.stringify(msg));

		//always successful
		cb(null, true);
	}
});

//Register a normal procedure named procedureA
rpcSvr.regRpc('procedureA', function(socketId, args, callback) {

	//response to the request
	callback(null, {
		timestamp : MsgRpc.utils.timestamp(),
		args : args
	});
});

//Register a service named serviceA, service will get a messenger param, which make it distinguish from normal procedure
rpcSvr.regService('serviceB', function(socketId, args, callback, messenger) {

	//response to the request
	callback(null, {
		timestamp : MsgRpc.utils.timestamp(),
		args : args
	});

	//Listen for message
	messenger.onMsg(function(msg, pipe) {

		var seq = 1;

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
});

var clients = {};

io.sockets.on('connection', function(socket) {

	//add to the clients
	clients[socket.id] = socket;

	//proxy the message to the rpcSvr
	socket.on('message', function(data) {

		var msg = JSON.parse(data);

		if (rpcSvr.isRpcMsg(msg))
			rpcSvr.message(msg, socket.id);
	});

	//cleanup when disconnect
	socket.on('disconnect', function() {

		rpcSvr.clearupSocketId(socket.id);
		delete clients[socket.id];
	});
});

//Listen and go
app.listen(8082);