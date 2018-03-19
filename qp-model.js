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
  function default_bytea() { return ''; }

  qp.module(exports, {

    ns: 'qp-model/schema',

    extend: function(_exports, o) {
      var schema = require(o.extend);
      qp.each_own(o.indexes, function(index, name) {
        index.name = name;
        schema.indexes[name] = index;
      });
      qp.each_own(o.columns, function(column, name) {
        column.name = name;
        schema.columns[name] = column;
        if (column.managed) schema.fields.managed.push(name); else schema.fields.all.push(name);
      });
      qp.each(o.meta.columns, function(meta_column, i) {
        var column = schema.columns[meta_column.name];
        column.index = i;
        if (meta_column.width !== 0) {
          column.width = meta_column.width;
        } else if (column.boolean) {
          column.width = 6;
        } else if (column.array) {
          column.width = 30;
        } else if (column.primary || column.primary_key || column.foreign) {
          column.width = 6;
        } else if (column.datetime) {
          column.width = 24;
        } else if (column.int) {
          column.width = ({ 2: 6, 4: 11, 8: 20 })[column.size];
        } else if (column.numeric) {
          column.width = column.size + column.scale + 1;
        } else if (column.text) {
          column.width = column.size || 30;
        } else if (column.data) {
          column.width = 30;
        }
        column.width = Math.max(column.name.length, column.width);
      });
      _exports(schema);
    },

    build: function(_exports, o) {
      o.create = this.create.bind(this, o.columns);
      o.schema_name = o.schema || false;
      o.set_schema = this.set_schema.bind(this, o);
      var schema_prefix = o.schema_name ? o.schema_name + '.' : '';
      o.table = {
        name: o.table,
        fullname: schema_prefix + o.table,
        id_sequence_name: schema_prefix + o.table + '_id_seq'
      };
      o.fields = { managed: [], all: [] };
      o.columns = o.columns || {};
      qp.each_own(o.columns, function(column, name) {
        column.name = name;
        if (column.managed) o.fields.managed.push(name); else o.fields.all.push(name);
      });
      o.indexes = o.indexes || {};
      qp.each_own(o.indexes, function(index, name) {
        index.name = name;
      });
      _exports(o);
    },

    set_schema: function(o, schema_name) {
      if (o.schema_name === false) {
        o.schema_name = schema_name;
      }
      var schema_prefix = o.schema_name ? o.schema_name + '.' : '';
      o.table.fullname = schema_prefix + o.table.name;
      o.table.id_sequence_name = o.table.fullname + '_id_seq';
      qp.each_own(o.columns, function(column, name) {
        column.table_fullname = schema_prefix + (column.table || o.table.name);
        column.fullname = column.table_fullname + '.' + name;
      });
      return o;
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

    index: function(column, options) {
      if (qp.is(column, 'object')) {
        options = column || {};
      } else if (qp.is(column, 'string')) {
        options = options || {};
        options.column = column;
      }
      return qp.options(options, {
        column: null, expression: null, method: 'btree', unique: false, asc: true, desc: false
      });
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

      if (type === 'text' && size === 0) {
        field = { type: 'text', text: true, size: 0, default: options.default || default_string };
      } else if (type === 'text') {
        field = { type: 'varchar', text: true, size: size, default: options.default || default_string };

      } else if (type === 'smallint' || type === 'int2') {
        field = { type: 'smallint', int: true, size: 2, default: options.default || default_number };
      } else if (type === 'int' || type === 'int4' || type === 'integer') {
        field = { type: 'integer', int: true, size: 4, default: options.default || default_number };
      } else if (type === 'bigint' || type === 'int8') {
        field = { type: 'bigint', int: true, size: 8, default: options.default || default_number };

      } else if (type === 'numeric' || type === 'decimal' || type === 'number') {
        field = { type: 'numeric', numeric: true, size: size, scale: scale, default: options.default || default_number };

      } else if (type === 'currency') {
        field = { type: 'numeric', numeric: true, size: 12, scale: 4, default: options.default || default_number };

      } else if (type === 'bool' || type === 'boolean') {
        field = { type: 'boolean', boolean: true, default: options.default || default_boolean };

      } else if (type === 'dt' || type === 'datetime') {
        field = { type: 'timestamp with time zone', datetime: true, default: options.default || default_datetime };

      } else if (type === 'date') {
        field = { type: 'timestamp with time zone', date: true, default: options.default || default_date };

      } else if (type === 'bytea') {
        field = { type: 'bytea', data: true, default: options.default || default_bytea };

      } else if (type === 'smallserial') {
        field = { type: 'smallserial', int: true, size: 2, default: qp.noop };
      } else if (type === 'serial') {
        field = { type: 'serial', int: true, size: 4, default: qp.noop };
      } else if (type === 'bigserial') {
        field = { type: 'bigserial', int: true, size: 8, default: qp.noop };

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
