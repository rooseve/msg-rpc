function goRpc(rpcClient, MsgRpc) {

	var arr = [];
	for ( var i = 0; i < 3; i++)
		arr.push(MsgRpc.utils.randomInt(1, 10));

	rpcClient.rpc('maxOfArr', {
		arr : arr
	}, function(err, result) {

		if (err)
			console.error(err);
		//here's the procedure response
		console.log('maxOfArr ', result, arr);
	});

	//call procedureA
	rpcClient.rpc('procedureA', {
		a : 1
	}, function(err, result) {

		if (err)
			console.error(err);
		//here's the procedure response
		console.log('procedureA return ', result);
	});

	//call serviceB, which is a service procedure, with a messenger param
	rpcClient.rpc('serviceB', {
		b : 2
	}, function(err, result, messenger) {

		if (err)
			console.error(err);
		console.log('serviceB return ', result);

		//Listen for the message came from the server side messenger
		messenger.onMsg(function(msg) {

			console.log('messenger msg: ', msg);
		});

		//use messenger to send a message
		messenger.sendMsg({
			hi : 'hello'
		});

		//Call a cmd
		messenger.callCmd('msger_cmdA', {
			b : 2
		}, function(err, result) {

			if (err)
				console.error(err);
			console.log('msger_cmdA return', result);
		});

		messenger.callCmd('msger_cmdB', {
			c : 3
		}, function(err, result) {

			if (err)
				console.error(err);
			console.log('msger_cmdB return', result);
		});

	});
}

if (typeof module != 'undefined' && module.exports) {
	module.exports = goRpc;
}