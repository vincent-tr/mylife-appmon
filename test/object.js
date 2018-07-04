'use strict';

const Repository = require('../lib/repository');
const Agent = require('../lib/agent');

const io = require('socket.io-client');

class TestObject {
  constructor() {
    this.value = 0;
  }

  increment() {
    ++this.value;
  }
}


class Viewer {
  constructor(url) {
    this.socket = io(url);
    this.socket.on('connect', () => this.socket.send({ msgtype : 'viewer-handshake' }));

    this.socket.on('message', data => console.log(JSON.stringify(data)));
/*
    setInterval(() => {
      this.socket.send({
        msgtype : 'call',
        agent : 'agent-0',
        name : 'test',
        member : 'increment',
        args : []
      });
    }, 5000);
*/
  }
}

const repository = new Repository(12345);

const agent = new Agent('http://localhost:12345', 'agent-0');
//agent.add('test', new TestObject());
agent.addBuiltin('base:heap');
agent.addBuiltin('base:process');
agent.addBuiltin('base:os');

const viewer = new Viewer('http://localhost:12345');