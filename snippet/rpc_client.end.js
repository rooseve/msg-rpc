
var MsgRpc={
		utils:require('utils'),
		rpcClient: require('rpcClient'),
		Client: require('rpcClient')
};

var isNodeSvr = typeof module != 'undefined' && module.exports;

if (isNodeSvr) {

	module.exports = MsgRpc;

} else if (typeof (window) != 'undefined') {

	window.MsgRpc = MsgRpc;
}

})(window, document, void(0));