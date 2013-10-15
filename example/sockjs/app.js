/**
 * set up a http server
 */
var server = require(__dirname + '/../lib/httpSvr.js')(__dirname);

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
		clients[socketId].write(JSON.stringify(msg));

		//always successful
		cb(null, true);
	}
});

//Init the rpcSvr, register some rpc/services
require(__dirname + '/../lib/rpcSvr.js')(rpcSvr, MsgRpc);

//socket hash
var clients = {};

var sockjs = require('sockjs'), echo = sockjs.createServer();

echo.on('connection', function(conn) {

	//random an id
	conn.__socketId = MsgRpc.utils.randomStr(10);

	//add to the clients
	clients[conn.__socketId] = conn;

	//forward messages
	conn.on('data', function(data) {

		var msg = JSON.parse(data);

		if (rpcSvr.isRpcMsg(msg))
			rpcSvr.message(msg, conn.__socketId);
	});

	//cleanup when disconnect
	conn.on('close', function() {

		rpcSvr.clearupSocketId(conn.__socketId);
		delete clients[conn.__socketId];
	});
});

echo.installHandlers(server, {
	prefix : '/echo'
});

server.listen(8083);