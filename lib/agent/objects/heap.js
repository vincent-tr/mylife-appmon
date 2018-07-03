'use strict';

const v8 = require('v8');

module.exports = class Heap {
  constructor({ interval = 5000 } = {}) {
    this._interval = setInterval(() => this._fetch(), interval);
    this._fetch();
  }

  _fetch() {
    const data = v8.getHeapStatistics();
    this.totalHeapSize = data.total_heap_size;
    this.totalHeapSizeExecutable = data.total_heap_size_executable;
    this.totalPhysicalSize = data.total_physical_size;
    this.totalAvailableSize = data.total_available_size;
    this.usedHeapSize = data.used_heap_size;
    this.heapSizeLimit = data.heap_size_limit;
    this.mallocedMemory = data.malloced_memory;
    this.peakMallocedMemory = data.peak_malloced_memory;
  }

  dispose() {
    clearInterval();
  }
};