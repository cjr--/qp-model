define(module, function(exports, require) {

  var qp = require('qp-utility');

  qp.make(exports, {

    ns: 'qp-model/model',

    create: function(schema, data) {
      schema.create(data, { instance: this });
    },

    refresh: function() { },

    set_user: function(user) {
      if (qp.is(user, 'array')) user = qp.find(user, { id: this.user_id });
      if (qp.is(user, 'user')) {
        this.user = user;
        this.user_id = user.id;
      }
    }

  });

});

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
      } else if (qp.is(data, 'object')) {
        return this.create_item(fields, data, options.instance || {}, options);
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

    field: function(type, size, options) {
      if (qp.is(size, 'object')) options = size; size = 0;
      var field;
      if (type === 'text') {
        if (size) {
          field = { type: 'varchar', size: size, default: default_string };
        } else {
          field = { type: 'text', default: default_string };
        }
      } else if (type === 'int' || type === 'integer') {
        if (size === 2) {
          field = { type: 'smallint', default: default_number };
        } else if (size === 8) {
          field = { type: 'bigint', default: default_number };
        } else {
          field = { type: 'integer', default: default_number };
        }
      } else if (type === 'bool' || type === 'boolean') {
        field = { type: 'boolean', default: default_boolean };
      } else if (type === 'datetime') {
        field = { type: 'timestamp with time zone', default: default_datetime };
      } else if (type === 'date') {
        field = { type: 'timestamp with time zone', default: default_date };
      } else {
        field = { type: '', default: qp.noop };
      }
      return qp.options(field, options);
    },

    primary: function() {
      return this.field('int', 64, { primary: true, managed: true });
    },

    foreign: function(table) {
      return this.field('int', 64, { foreign: true, table: table });
    },

    foreign_ids: function(table) {
      return this.field('int', 64, { foreign: true, table: table, array: true });
    },

    created: function() {
      return this.field('datetime', { managed: true });
    },

    modified: function() {
      return this.field('datetime', { managed: true });
    }

  });

});
