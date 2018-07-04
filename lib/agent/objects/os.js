'use strict';

const os = require('os');
const Refreshable = require('./refreshable');

module.exports = class Heap extends Refreshable{
  constructor(options) {
    super(options);

    this.arch = os.arch();
    this.endianness = os.endianness();
    this.platform = os.platform();
    this.release = os.release();
    this.type = os.type();
  }

  _fetch() {
    this.cpus = os.cpus();
    this.freemem = os.freemem();
    this.hostname = os.hostname();
    this.loadavg = os.loadavg();
    this.tmpdir = os.tmpdir();
    this.totalmem = os.totalmem();
    this.uptime = os.uptime();
  }
};