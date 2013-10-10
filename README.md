msg-rpc
=============

Bidirectional rpc support over simple message interface

### The idea

The idea came from an app build on [WebSocket](https://developer.mozilla.org/en/docs/WebSockets "WebSocket"). 

Websocket provide bidirectional message communication support, the interface is very simple(actually too simple for a real app), and in simple terms, it's like this:

Client:

	//send out a message to the server
	sendMessage(data);
	
	//Listen for a message came from the server
	onMessage(function(data){
		//handle the data
	});

Server:

	//send a message to specific client (identify by socket)
	sendMessage(clientSocket, data);

	//Listen for messages came from clients
	onMessage(function(clientSocket, data){
		//use the clientSocket to identify a client
	});


In the real world, when sending out a message, some kind of response is supposed, or we can say we expect it to be interactive, just like the way Http works.

Rpc(Remote procedure call) is very like http request, the interface is like this:

Client:

	rpc(remoterPocedureName, arguments, function(error, result){
		
		//here, both error/result are came from the remote server 
	})

Server:

	registerRpc(remoterPocedureName, function(client, arguments, callback){
		
		//callback(error, result)
	});

#### What's the difference between Rpc and Message?

The trick here is: if you send 2 messages, say MsgA, MsgB. Then when you got a message back, let's say MsgC, it might be a response to some message sent out, but to which one, MsgA or MsgB, or something other?

rpc solves such problem, when you got the rpc callback, it's for sure to be the result of corresponding rpc request.

### What msg-rpc do?

Providing some simple message communication methods, e.g. the ones with WebSocket, msg-rpc will use these methods to provide rpc functions, and more...

### How to use?

> There's a socket.io example in the source.

Browser:

	//load the lib
	<script src="/build/rpc_client.js"></script>

	//create a rpc client
	var rpcClient = new MsgRpc.Client({
	
		//the read message sending function
		sendMessage : function(msg) {
			
			//in socket.io, it'll like this:
			//socket.send(JSON.stringify(msg));
		}
	});

	//proxy the message came in to the rpcClient
	
	//in socket.io, it'll like this:
	//socket.on('message', function(data) {
	
		//var msg = JSON.parse(data);
	
		//here, pass the msg to the rpcClient
		if (rpcClient.isRpcMsg(msg))
			rpcClient.message(msg);
	//});

	//Then use rpcClient to do the work.
	rpcClient.rpc('procedureA', {
		a : 1
	}, function(err, result) {

		//here's the procedure response
		console.log('procedureA return ', arguments);
	});


Server (NodeJs):

	//load the lib
	var MsgRpc = require("msg-rpc"), RpcSvrCls = MsgRpc.rpcServer;
	
	//Create a rpcServer
	var rpcSvr = new RpcSvrCls({
		//the read message sending function
		sendMessage : function(msg, socketId, cb) {
			
			//socketId should be a string, which is passed in by the message function(below)

			//send the msg
			//in socket.io, it'll like this:
			//clients[socketId].send(JSON.stringify(msg));
	
			//response
			cb(error, result);
		}
	});

	//proxy the message to the rpcSvr
	//in socket.io, it'll like this:
	//clients[socket.id] = socket;
	//socket.on('message', function(data) {

		//var msg = JSON.parse(data);

		//pass the message to the rpcSvr, with the socketId
		if (rpcSvr.isRpcMsg(msg))
			rpcSvr.message(msg, socket.id);
	//});
	
	//Register a normal procedure named procedureA
	rpcSvr.regRpc('procedureA', function(socketId, args, callback) {
	
		//response to the request
		callback(error, result);
	});


### And more, Rpc Service

Rpc itself is very like http request, client request, server response. But the simple message interface here, e.g. WebSocket, is bidirectional, server can push messages. On the client side, there must be some way to recevie these messages, and the most important, forward them to the right function to deal with.

That's why another kind of Rpc came out, named as **Rpc Service**.

We begin with the Server side this time:

Server:

	rpcSvr.regService('serviceB', function(socketId, args, callback, messenger) {

		//here we got a "messenger" parameter
	});

The key point is the new parameter **messenger**.

#### messenger

messenger works as a pair, normally, one on the client side, the other on the server side, works the same way.

Let's say there are such a pair, MsgerA and MsgerB. It's very like that there's a private pipeline between them, so they can communicate with each other without any other conserns. MsgerA send a message, MsgerB will get that, and vice versa.

messenger got 2 group of functions

1.sendMsg / onMsg
	
	//send MsgerB a message
	MsgerA.sendMsg(msg); 

	//receive messages from MsgerB
	MsgerA.onMsg(function(msg){});
	
2.callCmd / onCmd(cmd is very like rpc, just to distinguish)

	//Listen for cmd requests from MsgerB
	MsgerA.onCmd(function(cmd, args, callbak) {

		//do something with this cmd
		callbak(error, result);
	});

	//Call the cmds excuted on MsgerB
	MsgerA.callCmd('cmdA', args, function(err, result) {
		//here we got the response from MsgerB
	});

####How the client got the messenger

Well, it's up to the Server, client still use the rpc method, but if the procedure is registered by "regService" on the server, then it's a Service procedure, and messenger will be passed in as the 3rd parameter.

	//on server side
	//rpcSvr.regService('serviceB'....

	//Then, on the client side
	rpcClient.rpc('serviceB', args, function(err, result, messenger) {

		//here you got the messenger
		//just say hello
		messenger.sendMsg({
			hi : 'hello'
		});
	}


