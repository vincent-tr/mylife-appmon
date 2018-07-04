'use strict';

const Server = require('socket.io');
const debug = require('debug')('mylife-appmon:repository');

const Bus = require('./bus');
const RemoteAgent = require('./remote-agent');
const RemoteViewer = require('./remote-viewer');

module.exports = class Repository {
  constructor(port) {
    this._io = new Server(port);
    this._io.on('connection', socket => this._newConnection(socket));
    this._bus = new Bus();
    this._bus.subscribe({ type: 'manager', id : 'manager' }, msg => this._busMessage(msg));

    this._remotes = new Set();
  }

  _busMessage({ type, payload }) {
    if(type === 'close') {
      this._remotes.delete(payload);
    }
  }

  _newConnection(socket) {
    socket.once('message', handshake => {

      let remote;
      switch(handshake.msgtype) {
        case 'agent-handshake' : {
          remote = new RemoteAgent(this._bus, socket, handshake);
          break;
        }

        case 'viewer-handshake' : {
          remote = new RemoteViewer(this._bus, socket, handshake);
          break;
        }

        default:
          debug(`Handshake type unknown: '${handshake.msgtype}', ignored`);
          return;
      }

      this._remotes.add(remote);
    });
  }

  close() {
    this.io.close();

    for(const remote of Array.from(this._remotes)) {
      remote.close();
    }
  }
};
