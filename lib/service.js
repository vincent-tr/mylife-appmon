'use strict';

const os = require('os');

const Agent = require('./agent');
const Repository = require('./repository');

let agent;
let repository;

exports.setupRepository = config => {
  return repository = new Repository(config.port);
};

exports.repository = () => repository;

exports.setupAgent = config => {
  const { url, agentId } = config;
  agent = new Agent(url, agentId || `agent-${os.hostname()}-${process.pid}`);

  let builtins = config.builtins;
  if(!builtins) {
    return;
  }

  if(Array.isArray(builtins)) {
    const array = builtins;
    builtins = {};
    for(const type of array) {
      builtins[type] = [];
    }
  }

  for(const [ type, args ] of Object.entries(builtins)) {
    agent.addBuiltin(type, args);
  }

  return agent;
};

exports.setupLocalAgent = config => {
  config = Object.assign({}, config, { url : `http://localhost:${repository.port}`});
  return exports.setupAgent(config);
};

exports.agent = () => agent;
