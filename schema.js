define(module, function(exports, require) {

  var qp = require('qp-utility');

  function default_string() { return ''; }
  function default_number() { return 0; }
  function default_boolean() { return false; }
  function default_datetime() { return new Date(); }
  function default_date() { return (new Date()).setUTCHours(12, 0, 0, 0); }

  qp.module(exports, {

    ns: 'qp-model/schema',

    build: function(_exports, schema) {
      schema.create = this.create.bind(this, schema.columns);
      schema.table = { name: schema.table };
      schema.fields = { managed: [], all: [] };
      qp.each_own(schema.columns, function(column, name) {
        column.name = name;
        if (column.managed) schema.fields.managed.push(name); else schema.fields.all.push(name);
      });
      _exports(schema);
    },

    create: function(fields, data, options) {
      options = qp.options(options, { internal: false });
      if (qp.is(data, 'array')) {
        return qp.map(data, function(item) {
          return this.create_item(fields, item, {}, options);
        }.bind(this));
      } else if (qp.is(data, 'object', 'undefined')) {
        return this.create_item(fields, data || {}, options.instance || {}, options);
      } else {
        return null;
      }
    },

    create_item: function(fields, source, target, options) {
      if (qp.is(source, 'object')) {
        qp.each_own(fields, function(v, k) {
          if (options.internal || !v.internal) {
            target[k] = source[k] || v.default();
          }
        });
      }
      return target || {};
    },

    field: function(type, size, scale, options) {
      if (qp.is(size, 'object', 'undefined')) {
        options = size;
        size = scale = 0;
      } else if (qp.is(scale, 'object', 'undefined')) {
        options = scale;
        scale = 0;
      }
      options = options || {};
      var field;

      // TEXT
      if (type === 'text' && size === 0) {
        field = { type: 'varchar', size: size, default: options.default || default_string };
      } else if (type === 'text') {
        field = { type: 'text', default: options.default || default_string };

      // INTEGER
      } else if (type === 'smallint' || type === 'int2') {
        field = { type: 'smallint', size: 2, default: options.default || default_number };
      } else if (type === 'int' || type === 'int4' || type === 'integer') {
        field = { type: 'integer', size: 4, default: options.default || default_number };
      } else if (type === 'bigint' || type === 'int8') {
        field = { type: 'bigint', size: 8, default: options.default || default_number };

      // NUMERIC
      } else if (type === 'numeric' || type === 'decimal' || type === 'number') {
        field = { type: 'numeric', size: size, scale: scale, default: options.default || default_number };

      // CURRENCY
      } else if (type === 'currency') {
        field = { type: 'numeric', size: 12, scale: 4, default: options.default || default_number };

      // BOOLEAN
      } else if (type === 'bool' || type === 'boolean') {
        field = { type: 'boolean', default: options.default || default_boolean };

      // DATETIME
      } else if (type === 'datetime') {
        field = { type: 'timestamp with time zone', default: options.default || default_datetime };

      // DATE
      } else if (type === 'date') {
        field = { type: 'timestamp with time zone', default: options.default || default_date };

      // SERIAL
      } else if (type === 'smallserial') {
        field = { type: 'smallserial', default: qp.noop };
      } else if (type === 'serial') {
        field = { type: 'serial', default: qp.noop };
      } else if (type === 'bigserial') {
        field = { type: 'bigserial', default: qp.noop };

      } else {
        field = { type: '', default: qp.noop };

      }
      return qp.options(field, options);
    },

    primary: function() {
      return this.field('integer', { primary: true, managed: true });
    },

    primary_key: function() {
      return this.field('integer', { primary_key: true, sequence: true, managed: false });
    },

    foreign: function(table) {
      return this.field('integer', { foreign: true, table: table });
    },

    foreign_ids: function(table) {
      return this.field('integer', { foreign: true, table: table, array: true });
    },

    unique: function() {
      return this.field('integer', { unique: true, managed: false });
    },

    created: function() {
      return this.field('datetime', { managed: true });
    },

    modified: function() {
      return this.field('datetime', { managed: true });
    }

  });

});
