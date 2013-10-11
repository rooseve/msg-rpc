var fs = require('fs');

module.exports = function(homedir) {

	return require('http').createServer(function(req, res) {

		if (req.url == '/')
			req.url = '/index.html';
		else if (req.url.indexOf('/root/') === 0) {
			req.url = '/../..' + req.url.substring(5);
		}

		fs.readFile(homedir + req.url, function(err, data) {

			if (err) {
				res.writeHead(500);
				return res.end('Error loading ' + req.url);
			}

			res.writeHead(200);
			res.end(data);
		});

	});
};