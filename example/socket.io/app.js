/**
 * set up a http server
 */
var server = require(__dirname + '/../lib/httpSvr.js')(__dirname), io = require('socket.io').listen(server);

//require the rpc lib
var MsgRpc = require(__dirname + '/../../build/rpc_node.js'), RpcSvrCls = MsgRpc.rpcServer;

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

//Init the rpcSvr, register some rpc/services
require(__dirname + '/../lib/rpcSvr.js')(rpcSvr, MsgRpc);

//socket hash
var clients = {};

io.sockets.on('connection', function(socket) {

	//add to the clients
	clients[socket.id] = socket;

	//forward messages to the rpcSvr
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
server.listen(8082);