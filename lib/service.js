'use strict';

const os = require('os');

const Agent = require('./agent');
const Repository = require('./repository');
const builtins = require('./agent/objects');

let agent;
let repository;

exports.setupRepository = config => {
  return repository = new Repository(config.port);
};

exports.repository = () => repository;

exports.setupAgent = config => {
  const { url, agentId } = config;
  agent = new Agent(url, agentId || `agent-${os.hostname()}-${process.pid}`);

  for(const { name, plugin, options } of config.objects || []) {
    const pluginObjects = plugin ? process.mainModule.require(plugin).objects : builtins;
    const PluginObject = pluginObjects[name];
    const object = new PluginObject(options);
    agent.add(name, object);
  }

  return agent;
};

exports.setupLocalAgent = config => {
  config = Object.assign({}, config, { url : `http://localhost:${repository.port}`});
  return exports.setupAgent(config);
};

exports.agent = () => agent;
