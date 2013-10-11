module.exports = function(grunt) {

	var gconf = {
		pkg : grunt.file.readJSON('package.json'),
		dest : {
			rpc_svr : 'build/rpc_node.js',
			rpc_client : 'build/rpc_client.js',
			rpc_client_min : 'build/rpc_client.min.js',
		},
		requirejs : {
			options : {

				baseUrl : 'src',
				paths : {
					when : '../node_modules/when',
				},
				optimize : 'none',
				useStrict : true
			},
			svr : {
				options : {
					almond : false,
					include : [ 'rpcServer', 'rpcClient' ],
					out : '<%= dest.rpc_svr %>',
					wrap : {
						startFile : [ 'snippet/rpc_svr.start.js' ],
						endFile : [ 'snippet/rpc_svr.end.js' ]
					}
				}
			},
			client : {
				options : {
					almond : true,
					include : [ 'rpcClient' ],
					out : '<%= dest.rpc_client %>',
					wrap : {
						startFile : [ 'snippet/rpc_client.start.js' ],
						endFile : [ 'snippet/rpc_client.end.js' ]
					}
				}
			}
		},
		uglify : {
			options : {
				banner : '/* <%= pkg.name %> v<%= pkg.version %> */\n'
			},
			dist : {
				files : {
					'<%= dest.rpc_client_min %>' : [ '<%= dest.rpc_client %>' ]
				}
			}
		},
		jshint : {
			files : [ 'Gruntfile.js', 'src/**/*.js', 'example/**/*.js' ],
			options : {
				smarttabs : true,
				'-W099' : true,
				globals : {
					jQuery : true,
					console : true,
					module : true,
					document : true
				}
			}
		}
	};

	grunt.initConfig(gconf);

	grunt.loadNpmTasks('grunt-requirejs');
	grunt.loadNpmTasks('grunt-contrib-uglify');
	grunt.loadNpmTasks('grunt-contrib-jshint');

	grunt.registerTask('default', [ 'jshint', 'requirejs', 'uglify' ]);

};