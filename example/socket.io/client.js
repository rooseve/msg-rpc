var socket = io.connect('http://localhost:8082');

//create a rpc client
var rpcClient = new MsgRpc.Client({

	//the read message sending function
	sendMessage : function(msg) {

		socket.send(JSON.stringify(msg));
	}
});

//proxy the message came in to the rpcClient
socket.on('message', function(data) {

	var msg = JSON.parse(data);

	if (rpcClient.isRpcMsg(msg))
		rpcClient.message(msg);
});

socket.on('connect', function() {

	//call procedureA
	rpcClient.rpc('procedureA', {
		a : 1
	}, function(err, result) {

		//here's the procedure response
		console.log('procedureA return ', arguments);
	});

	//call serviceB, which is a service procedure, with a messenger param
	rpcClient.rpc('serviceB', {
		b : 2
	}, function(err, result, messenger) {

		console.log('serviceB return ', arguments);

		//use messenger to send a message
		messenger.sendMsg({
			hi : 'hello'
		});

		//Listen for the message came from the server side messenger
		messenger.onMsg(function(msg) {

			console.log('receive msg: ', msg);
		});

		//Call a cmd
		messenger.callCmd('msger_cmdA', {
			b : 2
		}, function(err, result) {

			console.log('msger_cmdA return', arguments);
		});

		messenger.callCmd('msger_cmdB', {
			c : 3
		}, function(err, result) {

			console.log('msger_cmdB return', arguments);
		});

	});

});
