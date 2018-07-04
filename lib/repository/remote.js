'use strict';

const debug = require('debug')('mylife-appmon:repository:remote');

module.exports = class Remote {

  constructor(bus, busId, socket) {
    this.socket = socket;
    this.bus = bus;
    this.busId = busId;

    debug(`new remote : ${JSON.stringify(this.busId)}`);
    this.bus.subscribe(this.busId, msg => this.busMessage(msg));
    this.socket.on('message', msg => this.socketMessage(msg));

    this.socket.on('disconnect', () => this.close());
  }

  close() {
    this.emit({ type : 'manager' }, 'close', this);
    this.bus.unsubscribe(this.busId);
    this.socket.disconnect();
    debug(`remote closed : ${JSON.stringify(this.busId)}`);
  }

  emit(to, type, payload = {}) {
    this.bus.send(this.busId, to, type, payload);
  }

  socketMessage() {
    throw new Error('not implemented');
  }

  busMessage() {
    throw new Error('not implemented');
  }
};

