'use strict';

const debug = require('debug')('mylife-appmon:repository:remote-viewer');

const Remote = require('./remote');

let viewerIdCounter = 0;

module.exports = class RemoteViewer extends Remote {
  constructor(bus, socket) {
    super(bus, { type : 'viewer', id : `viewer-${++viewerIdCounter}` }, socket);

    this.messageHandlers = {
      'call' : msg => this.call(msg),
    };

    this.busHandlers = {
      'publish' : msg => this.publish(msg),
    };

    this.emit({ type : 'agent' }, 'viewer-hello');
  }

  busMessage(msg) {
    const handler = this.busHandlers[msg.type];
    if(!handler) {
      debug(`Bus message type unknown: '${msg.type}', from: ${JSON.stringify(msg.from)}, ignored`);
    }

    handler(msg);
  }

  socketMessage(msg) {
    const handler = this.messageHandlers[msg.msgtype];
    if(!handler) {
      debug(`Message type unknown: '${msg.msgtype}', ignored`);
    }

    handler(msg);
  }

  call(msg) {
    const { agent, ...others } = msg;
    this.emit({ type : 'agent', id : agent }, 'call', others);
  }

  publish({ payload }) {
    this.socket.send(payload);
  }
};