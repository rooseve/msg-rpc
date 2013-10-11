msg-rpc
=============

Bidirectional Rpc(Remote procedure call) support over simple message interface, such as [WebSocket](https://developer.mozilla.org/en/docs/WebSockets "WebSocket").


### Simpe Message Vs. Rpc

Simpe Message, e.g.Websocket, provides bidirectional message communication support, the interface is very simple(actually too simple for a real app), and in simple terms, it's like this:

Client:

- Send a message to the server

		sendMessage(data);
	
- Listen for messages came from the server

		onMessage(function(data){
			//handle the data
		});

Server:

- Send a message to a specific client (normally identified by socket)

		sendMessage(client, data);

- Listen for messages came from clients

		onMessage(function(client, data){
			//get the message from client
		});


In the real world, when sending out a message, some kind of response is supposed, or we can say we expect it to be interactive, just like the way Http works.

Rpc(Remote procedure call) is very like http request, the interface is like this:

Server:

- Register a pocedure:

		registerRpc(remoterPocedureName, function(client, arguments, callback){
	
			//response to the client which called this.
			//callback(error, result)
		});

Client:

- Call the pocedure:

		rpc(remoterPocedureName, arguments, function(error, result){
			
			//here, both error/result are came from the remote server 
		})


#### What's the trick here?

With only simple message interface, if you send 2 messages, say MsgA, MsgB. Then when you got a message back, let's say MsgC, it might be a response to some message sent out, but to which one? MsgA or MsgB, or something other?

Rpc solves such problem, when you got the rpc callback, it's for sure to be the result of corresponding rpc request.

### What does msg-rpc do?

Providing rpc support just over the simple message interface you got.

Even more, msg-rpc also provides a special kind of rpc called **Rpc Service**, which make the rpc pushable, in other words, the server can also send a request to the client and expect some kind of response. 

### How to use?

#### There are socket.io/sockjs/node examples, refer to them for more details.

- Browser:

		//load the lib
		<script src="/build/rpc_client.js"></script>
	
		//create a rpc client, tell how to send the message out
		var rpcClient = new MsgRpc.Client({
		
			//the real message sending function
			sendMessage : function(msg) {
				
				//in socket.io, it'll like this:
				//socket.send(JSON.stringify(msg));
			}
		});
	
		//proxy the messages received to the rpcClient
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


- Server (NodeJs):

	Install the node module
	
		npm install msg-rpc

	Then

		//load the lib
		var MsgRpc = require("msg-rpc"), RpcSvrCls = MsgRpc.rpcServer;
		
		//Create a rpcServer
		var rpcSvr = new RpcSvrCls({
			//the real message sending function
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


### Rpc Service

Rpc itself is very like http request, client request, server response. But the simple message interface here, e.g. WebSocket, is bidirectional, server can push messages. On the client side, there must be some way to recevie these messages, and the most important, forward them to the right function to deal with.

That's why another kind of Rpc came out, named as **Rpc Service**.

We begin with the Server side this time:

- Server:

		//Register a service named serviceB
		rpcSvr.regService('serviceB', function(socketId, args, callback, messenger) {
	
			//compared to regRpc, here we got an extra "messenger" parameter
		});

The key point is the 3rd parameter **messenger**.

#### What's messenger?

Messenger works as a pair, normally one on the client side, one on the server side. Both work the same way(share the same source code).

Let's say there is such a pair, MsgerA and MsgerB. It's very like that there's a private pipeline between them, so they can communicate with each other without any other conserns. MsgerA send a message, MsgerB will get that, and vice versa.

A messenger, e.g. MsgerA got 2 group of functions:

- sendMsg / onMsg

	- Send a message to MsgerB:
	
			MsgerA.sendMsg(msg); 
	
	- Receive messages from MsgerB

			MsgerA.onMsg(function(msg){
				//messages from MsgerA
			});
	

- callCmd / onCmd (cmd is very like rpc, just to distinguish)
 
 	- Call cmd which will be excuted on MsgerB
	 
			MsgerA.callCmd('cmdA', args, function(err, result) {
				//here we got the response from MsgerB
			});


	- Listen for cmd requests from MsgerB
	

			MsgerA.onCmd(function(cmd, args, callbak) {
		
				//do something, and response to MsgerB
				callbak(error, result);
			});
	

With this pair of messengers, bidirectional message/cmd(rpc) communication is supported.

#### How the client got the messenger

Well, it's up to the Server, client still use the rpc method, but if the procedure is registered by "regService" on the server, then it's a Service procedure, and messenger will be passed in as the 3rd parameter.

On the server side, rpcSvr.regService('serviceB', function(socketId, args, callback, msgerSvr)...., then, on the client side:

	rpcClient.rpc('serviceB', args, function(err, result, msgerClient) {
		//here you got the messenger "msgerClient", and with msgerSvr as a pair.
		//just say hello to the msgerSvr
		msgerClient.sendMsg({
			hi : 'hello'
		});
	}


###How to build

msg-rpc use [Grunt](http://gruntjs.com/) to build the source under src folder.

In the project folder, run:

	npm install

	grunt

If grunt not installed yet, run:

	npm install -g grunt-cli
	
	grunt


The some final libraries will be generated in the build folder, e.g.

- rpc_client.js, works on browser

- rpc_node.js, works on Node