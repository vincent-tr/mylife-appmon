'use strict';

const io = require('socket.io-client');
const debug = require('debug')('mylife:appmon:agent');
const ObjectTracker = require('./object-tracker');

module.exports = class Agent {
  constructor(url, agentId) {
    this.agentId = agentId;
    this._trackers = new Map();
    this._socket = io(url);
    this._connected = false;

    this._socket.on('connect', () => {
      this._connected = true;
      debug('connected');
      this._sync();
    });

    this._socket.on('disconnect', () => {
      debug('disconnected');
      this._connected = false;
    });

    this._socket.on('message', msg => this._message(msg));
  }

  _message(msg) {
    switch(msg.msgtype) {
      case 'call': {
        const { callid, name, member, args } = msg;
        this._call(callid, name, member, args);
        break;
      }

      default:
        debug(`Message type unknown: '${msg.msgtype}', ignored`);
        break;
    }
  }

  async _call(callid, name, member, args) {
    try {
      const tracker = this._trackers.get(name);
      if(!tracker) {
        throw new Error(`Object not found : '${name}'`);
      }

      const result = await tracker.call(member, args);

      if(!this._connected) {
        return;
      }

      this._socket.send({
        msgtype : 'call-result',
        callid,
        result
      });
    }
    catch(error) {
      debug(`Call error (callid='${callid}', name='${name}', member='${member}', args=${JSON.stringify(args)}) : ${error.toString()}`);

      if(!this._connected) {
        return;
      }

      this._socket.send({
        msgtype : 'call-result',
        callid,
        error : error.toString()
      });
    }
  }

  _sync() {
    debug(`handshake : agentId=${this.agentId}`);
    this._socket.send({
      msgtype : 'agent-handshake',
      agentId : this.agentId
    });

    for(const [ name, tracker ] of this._trackers.entries()) {
      this._publish(name, tracker);
    }
  }

  close() {
    for(const tracker of this._trackers.values()) {
      tracker.dispose();
    }
    this._trackers.clear();
    this._socket.close();
  }

  add(name, object) {
    if(this._trackers.get(name)) {
      throw new Error(`Object with name '${name}' already exists`);
    }

    const tracker = new ObjectTracker(
      name,
      object,
      (member, value) => this._propertyChanged(name, member, value));

    this._trackers.set(name, tracker);
    debug(`object added : ${name}`);
    this._publish(name, tracker);
  }

  _publish(name, tracker) {
    if(!this._connected) {
      return;
    }
    this._socket.send({
      msgtype : 'object-add',
      descriptor : tracker.descriptor
    });

    for(const [ member, desc ] of Object.entries(tracker.descriptor.members)) {
      if(desc.type !== 'attribute') {
        continue;
      }

      this._propertyChanged(name, member, tracker.value(member));
    }
  }

  _propertyChanged(name, member, value) {
    this._connected && this._socket.send({
      msgtype : 'object-attribute',
      name, member, value
    });
  }

  remove(name) {
    if(!this._trackers.get(name)) {
      throw new Error(`Object with name '${name}' does not exist`);
    }

    const tracker = this._trackers.get(name);
    tracker.dispose();
    this._trackers.delete(name);

    debug(`object removed : ${name}`);

    this._connected && this._socket.send({
      msgtype : 'object-remove',
      name : name
    });
  }
};
