'use strict';

const debug = require('debug')('mylife:appmon:repository:bus');

module.exports = class Bus {
  constructor() {
    this.subscriptions = new Map();
    this.broadcasts = {};
  }

  send(from, to, type, payload) {
    debug(`bus message : from=${JSON.stringify(from)}, to=${JSON.stringify(to)}, type='${type}'`);

    if(to.id) {
      const handler = this.subscriptions.get(to.id);
      handler && handler({ from, to, type, payload });
      return;
    }

    const handlers = this.broadcasts[to.type];
    if(!handlers) {
      return;
    }

    for(const handler of handlers.values()) {
      handler({ from, to, type, payload });
    }
  }

  subscribe(busId, handler) {
    this.subscriptions.set(busId.id, handler);
    const bcmap = this.broadcasts[busId.type] || (this.broadcasts[busId.type] = new Map());
    bcmap.set(busId.id, handler);
  }

  unsubscribe(busId) {
    this.subscriptions.delete(busId.id);
    const bcmap = this.broadcasts[busId.type];
    bcmap && bcmap.delete(busId.id);
  }
};