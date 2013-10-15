var sock = new SockJS('http://127.0.0.1:8083/echo');

//create a rpc client
var rpcClient = new MsgRpc.Client({

	//the read message sending function
	sendMessage : function(msg) {

		sock.send(JSON.stringify(msg));
	}
});

//forward messages came in to the rpcClient
sock.onmessage = function(e) {

	var msg = JSON.parse(e.data);

	if (rpcClient.isRpcMsg(msg))
		rpcClient.message(msg);
};

sock.onopen = function() {

	//refer to file ../rpcClient.js
	goRpc(rpcClient, MsgRpc);
};

sock.onclose = function() {

	console.log('close');
};