'use strict';

const Refreshable = require('./refreshable');
const v8 = require('v8');

module.exports = class Process extends Refreshable{
  constructor(options) {
    super(options);

    this.argv = process.argv;
    this.pid = process.pid;
    this.version = process.version;
  }

  _fetch() {
    const heap = v8.getHeapStatistics();
    const pmem = process.memoryUsage();
    this.memoryUsage = {
      'Heap total' : heap.total_heap_size,
      'Heap executable' : heap.total_heap_size_executable,
      'Heap physical' : heap.total_physical_size,
      'Heap available' : heap.total_available_size,
      'Heap used' : heap.used_heap_size,
      'Heap limit' : heap.heap_size_limit,
      'Malloced memory' : heap.malloced_memory,
      'Peak malloced memory' : heap.peak_malloced_memory,
      'Resident set size' : pmem.rss,
      'External' : pmem.external
    };

    const pcpu = process.cpuUsage();
    this.cpuUsage = {
      'User' : pcpu.user,
      'System' : pcpu.system
    };

    this.uptime = process.uptime();
  }

  metadata() {
    return {
      argv        : { name : 'Command line arguments' },
      pid         : { name : 'Process identifier' },
      version     : { name : 'Node version' },
      memoryUsage : { name : 'Memory usage' },
      cpuUsage    : { name : 'CPU usage' },
      uptime      : { name : 'Uptime' }
    };
  }
};