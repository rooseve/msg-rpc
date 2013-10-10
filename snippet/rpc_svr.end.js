//console.log(defndMods);

var expts = {
	isNodeSvr : true
};

for ( var i = 0, len = defndMods.length; i < len; i++) {
	expts[defndMods[i]] = defRequire(defndMods[i]);
}

var exNameMap = {};

for ( var k in exNameMap) {
	expts[k] = defRequire(exNameMap[k]);
}

module.exports = expts;