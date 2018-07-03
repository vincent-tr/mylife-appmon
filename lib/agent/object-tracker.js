'use strict';

module.exports = class ObjectTracker {
  constructor(name, object, onPropertyChanged) {
    this._object = object;
    this._onPropertyChanged = onPropertyChanged;

    this.descriptor = {
      name,
      members : {}
    };

    const metadata = this._object.metadata && this._object.metadata();

    for(const [ id, prop ] of Object.entries(this._object)) {
      if(id.startsWith('_')) {
        continue;
      }

      const descriptor = this.descriptor.members[id] = {};
      Object.assign(descriptor, metadata && metadata[id]);
      descriptor.id = id;

      if(prop instanceof Function) {
        descriptor.type = 'method';
        continue;
      }

      descriptor.type = 'attribute';
      this._createProperty(id);
    }

    Object.freeze(this._object);

    this._disposed = false;
  }

  dispose() {
    if(this._object.dispose) {
      this._object.dispose();
    }

    this._disposed = true;
  }

  _createProperty(id) {
    let value = this._object[id];
    Object.defineProperty(this._object, id, {
      enumerable : true,
      get : () => value,
      set : val => {
        if(Object.is(value, val)) {
          return;
        }

        value = val;

        if(!this._disposed) {
          this._onPropertyChanged(id, value);
        }
      }
    });
  }

  value(id) {
    return this._object[id];
  }

  async call(id, args) {
    return await this._object[id](...args);
  }
};