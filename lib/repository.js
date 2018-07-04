'use strict';

const Server = require('socket.io');
const debug = require('debug')('mylife-appmon:repository');

class Bus {
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
}

class Remote {

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
}

class RemoteAgent extends Remote {
  constructor(bus, socket, handshake) {
    const { agentId } = handshake;

    super(bus, { type : 'agent', id : agentId }, socket);

    this.agentId = handshake.agentId;
    this.objects = new Map();

    this.messageHandlers = {
      'object-add'       : msg => this.objectAdd(msg),
      'object-remove'    : msg => this.objectRemove(msg),
      'object-attribute' : msg => this.objectAttribute(msg),
      'call-result'      : msg => this.callResult(msg),
    };

    this.busHandlers = {
      'call'         : msg => this.call(msg),
      'viewer-hello' : msg => this.sendAll(msg)
    };

    this.emit({ type : 'viewer' }, 'agent-add', { agent : this.agentId });
  }

  close() {
    this.emit({ type : 'viewer' }, 'agent-remove', { agent : this.agentId });
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

  call({ from, payload }) {
    const { callid : callerCallid, name, member, args } = payload;
    const callid = JSON.stringify({ caller : from, callid : callerCallid });
    this.socket.send({
      msgtype : 'call',
      callid, name, member, args
    });
  }

  sendAll({ from }) {
    for(const { descriptor, object } of this.objects.values()) {
      this.publish({
        msgtype : 'object-add',
        descriptor
      }, from);

      for(const [ id, value ] of Object.entries(object)) {
        this.publish({
          msgtype : 'object-attribute',
          name : descriptor.name,
          id, value
        }, from);
      }
    }
  }

  publish(msg, to = { type : 'viewer' }) {
    this.emit(to, 'publish', { agent : this.agentId, ...msg });
  }

  objectAdd(msg) {
    const { descriptor } = msg;
    this.objects.set(descriptor.name, {
      descriptor,
      object : {}
    });

    this.publish(msg);
  }

  objectRemove(msg) {
    this.objects.remove(msg.name);

    this.publish(msg);
  }

  objectAttribute(msg) {
    const { name, id, value } = msg;
    const { object } = this.objects.get(name);
    object[id] = value;

    this.publish(msg);
  }

  callResult(msg) {
    const { caller, callid } = JSON.parse(msg.callid);
    this.emit(caller, 'publish', { agent : this.agentId, ...msg, callid });
  }
}

let viewerIdCounter = 0;

class RemoteViewer extends Remote {
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
}

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
