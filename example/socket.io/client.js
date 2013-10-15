var socket = io.connect('http://localhost:8082');

//create a rpc client
var rpcClient = new MsgRpc.Client({

	//the read message sending function
	sendMessage : function(msg) {

		socket.send(JSON.stringify(msg));
	}
});

//forward messages came in to the rpcClient
socket.on('message', function(data) {

	var msg = JSON.parse(data);

	if (rpcClient.isRpcMsg(msg))
		rpcClient.message(msg);
});

socket.on('connect', function() {

	//refer to file ../rpcClient.js
	goRpc(rpcClient, MsgRpc);
});
