'use strict';

const service = require('../lib/service');
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

service.setupRepository({
  port : 12345
});

service.setupLocalAgent({
  url: 'http://localhost:12345',
  agentId : 'agent-0',
  builtins : [ 'base:heap', 'base:process', 'base:os' ]
});

const viewer = new Viewer('http://localhost:12345');