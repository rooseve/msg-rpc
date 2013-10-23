msg-rpc
=============

Bidirectional Rpc(Remote procedure call) support over simple message interface, such as [WebSocket](https://developer.mozilla.org/en/docs/WebSockets "WebSocket").

Now there are WebSocket [examples](https://github.com/rooseve/msg-rpc/tree/master/example) based on [socket.io](http://socket.io/) and [sockjs](https://github.com/sockjs). Also there is a simple nodejs local example, where sending messages is just passing variables.

> [Simpe Message Vs. Rpc](https://github.com/rooseve/msg-rpc/tree/master/docs/simple_message_vs_rpc.md)

###Features

- Simple. Just over simple sendMessage/onMessage interface, no other dependencies.

- Powerful. Not only normal Rpc, but also a special one: [Rpc Service](https://github.com/rooseve/msg-rpc#rpc-service), which make the rpc pushable, in other words, the server can also send a request to the client and expect some kind of response. 


###How to use?

Basically, there're two preparatory things to be done, for both server or client:

1. Tell how to send out a message
2. Forward the messages came in to the msg-rpc

*Actually there's normally a 3rd for the server, when the client disconnect, the server should do some clean up work.*

Here's a websocket example between browser/nodejs, but just for illustration purposes. Reference [these examples](https://github.com/rooseve/msg-rpc/tree/master/example) for more details.

#####Server (NodeJs):

- Install the node module

		npm install msg-rpc	
	
- Create a rpc server object, named rpcSvr, and do the preparatory work (tell how to send message, and forward the messages recevied)

		var MsgRpc = require("msg-rpc"), RpcSvrCls = MsgRpc.rpcServer;

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
	
		//forward the message to the rpcSvr
		//in socket.io, it'll like this:
		//clients[socket.id] = socket;
		//socket.on('message', function(data) {
	
			//var msg = JSON.parse(data);
	
			//pass the message to the rpcSvr, with the socketId
			if (rpcSvr.isRpcMsg(msg))
				rpcSvr.message(msg, socket.id);
		//});

		//cleanup when disconnect
		//socket.on('disconnect', function() {
	
			rpcSvr.clearupSocketId(socket.id);

			delete clients[socket.id];
		//});

- Then register some procedures to listen for rpc requests.

		//Register a normal procedure named procedureA
		rpcSvr.regRpc('procedureA', function(socketId, args, callback) {
		
			//response to the request
			callback(error, result);
		});


#####Browser:

- Load the lib, create a rpc client, named rpcClient, and do the preparatory work (tell how to send message, and forward the messages recevied)

		<script src="/build/rpc_client.js"></script>

		//create a rpc client, tell how to send the message out
		var rpcClient = new MsgRpc.Client({
		
			//the real message sending function
			sendMessage : function(msg) {
				
				//in socket.io, it'll like this:
				//socket.send(JSON.stringify(msg));
			}
		});
	
		//forward the messages received to the rpcClient
		//in socket.io, it'll like this:
		//socket.on('message', function(data) {
		
			//var msg = JSON.parse(data);
		
			//here, pass the msg to the rpcClient
			if (rpcClient.isRpcMsg(msg))
				rpcClient.message(msg);
		//});
	
- Then use the rpcClient to do the work.

		rpcClient.rpc('procedureA', {
			a : 1
		}, function(err, result) {
	
			//here's the procedure response
			console.log('procedureA return ', arguments);
		});



> **Again, there are socket.io/sockjs/node [examples](https://github.com/rooseve/msg-rpc/tree/master/example), reference them for more details.**


### Advanced usage

#### Rpc Service

Rpc itself is very like http request, client request, server response. But the simple message interface here, e.g. WebSocket, is bidirectional, server can push messages. On the client side, there must be some way to recevie these messages, and the most important, forward them to the right function to deal with.

That's why another kind of Rpc came out, named as **Rpc Service**, here's what it's like:

	//Register a service named serviceB
	rpcSvr.regService('serviceB', function(socketId, args, callback, messenger) {

		//compared to regRpc, here we got an extra "messenger" parameter
	});

The key point is the 3rd parameter **messenger**.

#### What's messenger?

Messenger works as a pair, normally one on the client side, one on the server side. Both work the same way(share the same source code).

Let's say there is such a pair, MsgerA and MsgerB. It's very like that there's a private pipeline between them, so they can communicate with each other without any other conserns. MsgerA send a message, MsgerB will get that, and vice versa.

A messenger, e.g. MsgerA got 2 group of functions:

##### sendMsg / onMsg

- Send a message to MsgerB:

		MsgerA.sendMsg(msg); 

- Receive messages from MsgerB

		MsgerA.onMsg(function(msg){
			//messages from MsgerB
		});
	

##### callCmd / onCmd (cmd is very like rpc, just to distinguish)
 
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

#### How the client got the messenger?

Well, it's up to the Server, client still use the rpc method, but if the procedure is registered by "regService" on the server, then it's a Service procedure, and messenger will be passed in as the 3rd parameter.

On the server side, rpcSvr.regService('serviceB', function(socketId, args, callback, msgerSvr)...., then, on the client side:

	rpcClient.rpc('serviceB', args, function(err, result, msgerClient) {
		//here you got the messenger "msgerClient", and with msgerSvr as a pair.
		//just say hello to the msgerSvr
		msgerClient.sendMsg({
			hi : 'hello'
		});
	}


#### How could messengers be helpful?

Messenger is just a variable with msg/cmd interface, when some client call this Rpc Service, the server and client could both keep the messenger variables, and talk to each other in the future.
	
Imagine that there's a group chat app, the client could rpc a service to join some group, and the server will keep every client's messenger. When some client send out a message through its messenger, the corresponding messenger on the server side will received that, and the server could just loop through all other messengers in this group and call the sendMsg function. Very easy, right?


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


