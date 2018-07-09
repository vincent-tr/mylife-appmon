'use strict';

const os = require('os');
const Refreshable = require('./refreshable');

module.exports = class Heap extends Refreshable{
  constructor(options) {
    super(options);

    this.os = `${os.platform()}-${os.release}-${os.arch} (${os.endianness()})`;
  }

  _fetch() {
    this.cpus = this._cpus();

    this.totalmem = os.totalmem();
    this.freemem = os.freemem();
    this.hostname = os.hostname();
    this.uptime = os.uptime();

    const loadavg = os.loadavg();
    this.loadavg = {
      '1 min'  : loadavg[0],
      '5 min'  : loadavg[1],
      '15 min' : loadavg[2]
    };
  }

  _cpus() {
    const map = new Map();

    for(const { model, speed } of os.cpus()) {
      const key = `${model}@${speed}`;
      let obj = map.get(key);
      if(!obj) {
        map.set(key, (obj = { model, speed, count : 0 }));
      }
      ++obj.count;
    }

    return Array.from(map.values());
  }

  metadata() {
    return {
      os       : { name : 'Operating system' },
      cpus     : { name : 'CPUs' },
      totalmem : { name : 'Memory total' },
      freemem  : { name : 'Memory free' },
      hostname : { name : 'Hostname' },
      loadavg  : { name : 'Load average' },
      uptime   : { name : 'Uptime' },
    };
  }
};