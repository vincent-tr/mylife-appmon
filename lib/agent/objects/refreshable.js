'use strict';

module.exports = class Refreshable {
  constructor({ interval = 5000 } = {}) {
    this._interval = setInterval(() => this._fetch(), interval);
    this._fetch();
  }

  _fetch() {
    throw new Error('not implemented');
  }

  dispose() {
    clearInterval(this._interval);
    this._interval = null;
  }
};