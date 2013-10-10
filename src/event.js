define([ 'utils' ], function(utils) {

	'use strict';

	/**
	 * Just an event pattern implementation
	 */
	function Event() {

		//the hash to store event/listeners
		this.__evHash = {};

	}

	utils.extend(Event.prototype, {

		/**
		 * Listen event
		 * 
		 * on('event1', callback, 20)
		 * 
		 * on('event1 event2 event3', callback)
		 * 
		 * on({ event1: callback1, event2:callback2 })
		 * 
		 * @param ev,
		 *            event name
		 * @param listener,
		 *            callback function
		 * @param priority,
		 *            the higher, the earlier to be called, default 10
		 * @returns this
		 */
		on : function(ev, listener, priority) {

			if (this.__multiCall(ev, listener, this.on))
				return this;

			var evHash = this.__evHash;

			if (!evHash[ev])
				evHash[ev] = [];

			var list = evHash[ev];

			var index = this.__index(list, listener);

			if (index < 0) {
				if (typeof (priority) != 'number')
					priority = 10;

				var inps = list.length;

				for ( var i = 0, len = list.length; i < len; i++) {
					if (priority > list[i].priority) {
						inps = i;
						break;
					}
				}

				list.splice(inps, 0, {
					listener : listener,
					priority : priority
				});
			}

			return this;
		},
		once : function(ev, listener, priority) {

			if (this.__multiCall(ev, listener, this.once))
				return this;

			var self = this;

			function oncefunc() {

				self.__callListenser(listener, arguments);
				self.off(ev, oncefunc);
			}

			this.on(ev, oncefunc, priority);

			return this;
		},
		offAll : function() {

			for ( var ev in this.__evHash) {
				this.off(ev);
			}

			this.__evHash = {};

			return this;
		},
		off : function(ev, listener) {

			if (this.__multiCall(ev, listener, this.off))
				return this;

			var evHash = this.__evHash;

			if (!evHash[ev])
				return;

			var list = evHash[ev];

			if (typeof (listener) != 'undefined') {

				var index = this.__index(list, listener);

				if (index >= 0) {
					list.splice(index, 1);

					return 1;
				}

			} else {

				var c = list.length;
				list.length = 0;

				return c;
			}

			return 0;
		},
		emit : function(ev) {

			var evHash = this.__evHash, args, count = 0, list;

			list = evHash[ev];

			if (list && list.length) {

				args = Array.prototype.slice.call(arguments, 1);

				count += this.__callListenerList(list, args);
			}

			//wild events bind, * means bind to all events
			list = evHash['*'];

			if (list && list.length) {

				//tell the exact event name
				args = Array.prototype.slice.call(arguments);

				count += this.__callListenerList(list, args);
			}

			return count;
		},
		onDestroy : function(cb, priority) {

			this.on('__destroy', cb, priority);

			return this;
		},
		destroy : function() {

			//this flag can avoid some circle dependency
			if (this.__destroying) {
				//utils.log.info('destroy going on');
				return;
			}

			this.__destroying = 1;

			this.emit('__destroy', this);

			this.offAll();

			return this;
		},
		__multiCall : function(ev, listener, func) {

			if (utils.isObject(ev) && typeof (listener) == 'undefined') {

				for ( var k in ev) {
					func.call(this, k, ev[k]);
				}
				return true;

			} else if (typeof (ev) == 'string') {

				var evs = ev.split(/[\s,]+/);

				if (evs.length > 1) {

					for ( var i = 0, len = evs.length; i < len; i++) {
						func.call(this, evs[i], listener);
					}

					return true;
				}
			}

			return false;
		},
		__index : function(list, listener) {

			var index = -1;

			list.some(function(ele, i) {

				if (utils.isEqual(ele.listener, listener)) {
					index = i;
					return true;
				}

			});

			return index;
		},
		__callListenser : function(listener, args) {

			var func = null, contxt = null;

			if (typeof (listener) == 'function') {

				func = listener;
				contxt = this;

			} else if (listener.length == 2) {

				func = listener[1];
				contxt = listener[0];
			}

			if (func) {
				return [ 1, func.apply(contxt, args) ];
			}

			return [ 0, undefined ];
		},
		__callListenerList : function(list, args) {

			if (!list || !list.length)
				return 0;

			//copy this list, as the cb might alter the list by on/off during the loop
			list = [].concat(list);

			var count = 0, cres;

			for ( var i = 0, len = list.length; i < len; i++) {

				cres = this.__callListenser(list[i].listener, args);

				count += cres[0];

				if (cres[1] === false) {
					//the call return false, stop here
					//utils.log.debug('.. stop ev loop: ' + ev);
					break;
				}
			}

			return count;
		}
	});

	return Event;
});