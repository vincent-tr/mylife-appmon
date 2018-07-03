'use strict';

const Server = require('socket.io');

const Agent = require('../lib/agent');

const io = new Server(12345);
const agent = new Agent('http://localhost:12345', 'agent-0');
agent.addBuiltin('base:heap');

io.on('connection', conn => {
  console.log('connection');
  conn.on('message', data => console.log('message', JSON.stringify(data)));
});