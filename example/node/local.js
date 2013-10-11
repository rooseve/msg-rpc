//require the rpc lib
var MsgRpc = require(__dirname + '/../../build/rpc_node.js');
var clients = {};

//client send msg to server
function sendToSvr(clientId, msg) {

	//just let the sever got the message
	rpcSvr.message(msg, clientId);

}

//server send msg to client
function sendToClient(clientId, msg) {

	//just let the client got the message
	clients[clientId].message(msg);

}

//Create a rpcServer
var rpcSvr = new MsgRpc.rpcServer({
	sendMessage : function(msg, clientId) {

		sendToClient(clientId, msg);
	}
});

//Init the rpcSvr, register some rpc/services
require(__dirname + '/../lib/rpcSvr.js')(rpcSvr, MsgRpc);

//create a rpc client

var myClientId = MsgRpc.utils.randomStr(5);
var rpcClient = new MsgRpc.rpcClient({

	//the read message sending function
	sendMessage : function(msg) {

		sendToSvr(myClientId, msg);
	}
});
clients[myClientId] = rpcClient;

require(__dirname + '/../lib/rpcClient.js')(rpcClient, MsgRpc);