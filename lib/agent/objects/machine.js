'use strict';

const os = require('os');
const Refreshable = require('./refreshable');

module.exports = class Heap extends Refreshable {
  constructor(options) {
    super(options);

    this.os = `${os.platform()}-${os.release}-${os.arch} (${os.endianness()})`;
  }

  _fetch() {
    this.cpus = this._cpus();

    this.memory = {
      'Total' : os.totalmem(),
      'Free'  : os.freemem()
    };

    const loadavg = os.loadavg();
    this.loadavg = {
      '1 min'  : loadavg[0],
      '5 min'  : loadavg[1],
      '15 min' : loadavg[2]
    };

    this.network = this._network();

    this.hostname = os.hostname();
    this.uptime = os.uptime();
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

  _network() {
    const result = [];
    for(const [ name, addresses ] of Object.entries(os.networkInterfaces())) {
      for(const { address, family, internal, cidr } of addresses) {
        result.push({
          'Interface' : name,
          'Address'   : address,
          'Family'    : family,
          'Internal'  : internal,
          'CIDR'      : cidr
        });
      }
    }
    return result;
  }

  metadata() {
    return {
      os       : { name : 'Operating system' },
      cpus     : { name : 'CPUs' },
      network  : { name : 'Network' },
      memoty   : { name : 'Memory' },
      hostname : { name : 'Hostname' },
      loadavg  : { name : 'Load average' },
      uptime   : { name : 'Uptime' },
    };
  }
};