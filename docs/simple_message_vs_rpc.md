## Simpe Message Vs. Rpc

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