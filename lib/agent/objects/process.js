'use strict';

const Refreshable = require('./refreshable');

module.exports = class Process extends Refreshable{
  constructor(options) {
    super(options);

    this.arch = process.arch;
    this.argv = process.argv;
    this.pid = process.pid;
    this.platform = process.platform;
    this.release = process.release;
  }

  _fetch() {
    this.cpuUsage = process.cpuUsage();
    this.env = process.env;
    this.memoryUsage = process.memoryUsage();
    this.title = process.title;
    this.uptime = process.uptime();
    this.version = process.version;
  }
};