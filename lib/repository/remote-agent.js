'use strict';

const debug = require('debug')('mylife:appmon:repository:remote-agent');

const Remote = require('./remote');

module.exports = class RemoteAgent extends Remote {
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

    this.publish({ msgtype : 'agent-add' });
  }

  close() {
    this.publish({ msgtype : 'agent-remove' });
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
    this.publish({ msgtype : 'agent-add' }, from);

    for(const { descriptor, object } of this.objects.values()) {
      this.publish({
        msgtype : 'object-add',
        descriptor
      }, from);

      for(const [ member, value ] of Object.entries(object)) {
        this.publish({
          msgtype : 'object-attribute',
          name : descriptor.name,
          member, value
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
    const { name, member, value } = msg;
    const { object } = this.objects.get(name);
    object[member] = value;

    this.publish(msg);
  }

  callResult(msg) {
    const { caller, callid } = JSON.parse(msg.callid);
    this.emit(caller, 'publish', { agent : this.agentId, ...msg, callid });
  }
};
