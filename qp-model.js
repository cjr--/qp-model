define(module, function(exports, require) {

  var qp = require('qp-utility');

  qp.make(exports, {

    ns: 'qp-model/model',

    $state: null,
    $members: null,

    init: function(o) {
      var data = qp.delete_key(o, this.schema.name);
      if (qp.defined(data) && data !== null) {
        this.set_data(data, o);
        this.$state = { created: o.create || false, modified: false, deleted: false };
        this.$members = [];
        if (o && o.display) this.initialise({ create: o.create });
        if (o && o.members) this.set_members(o.members);
        if (o && o.display) this.refresh();
      }
    },

    initialise: function(o) { },
    refresh: function() { },

    set_members: function(members) {
      qp.each_own(members, function(member, name) {
        this['set_' + name](member);
      }.bind(this));
    },

    add_member: function(name) {
      if (this.$members.indexOf(name) === -1) this.$members.push(name);
    },

    set_member: function(name, model, pk, fk) {
      pk = pk || 'id';
      fk = fk || (name + '_' + pk);
      var fk_value = this[fk];
      if (qp.is(model, 'array')) { model = qp.find(model, function(o) { return o[pk] === fk_value; }); }
      if (qp.is(model, 'object')) {
        this[name] = model;
        this[fk] = model[pk];
      }
      this.add_member(name);
    },

    set_list_member: function(name, model_list, pk, fk) {
      this[name] = qp.map(this[fk], function(id) {
        return qp.find(model_list, function(o) { return o[pk] === id; });
      });
      this.add_member(name);
    },

    set_user: function(user) { this.set_member('user', user); },

    set_data: function(source, options) {
      qp.each(this.schema.columns, function(column) {
        var key = column.name;
        if (column.primary || column.primary_key) {
          var _key = '_' + key;
          this[key] = source[key] || source[_key] || qp.id();
          this[_key] = source[key] || 0;
        } else if (column.datetime) {
          this[key] = qp.date(source[key]) || column.default();
        } else {
          this[key] = source[key] || column.default();
        }
      }.bind(this));
    },

    get_data: function(options) {
      var target = options ? (options.target || {}) : {};
      qp.each(this.schema.columns, function(column) {
        var key = column.name;
        if (column.primary || column.primary_key) {
          var _key = '_' + key;
          target[key] = this[key] === this[_key] ? this[key] : 0;
          target[_key] = this[key] || 0;
        } else if (column.datetime) {
          target[key] = qp.date(this[key], 'iso');
        } else {
          target[key] = this[key];
        }
      }.bind(this));
      return target;
    },

    clone: function() {
      var config = { display: true };
      config[this.schema.name] = this.get_data();
      var clone = this.self.create(config);
      qp.each(this.$members, function(name) {
        var member = this[name];
        if (member) {
          if (qp.is_array(member)) {
            clone['set_' + name](qp.map(member, function(item) { return (item.clone ? item.clone() : null); }));
          } else if (member.clone) {
            clone['set_' + name](member.clone());
          } else {
            clone['set_' + name](qp.clone(member));
          }
          clone.add_member(name);
        }
      }.bind(this));
      return clone;
    }

  });

});

define(module, function(exports, require) {

  var qp = require('qp-utility');

  var int_widths = { 2: 6, 4: 11, 8: 20 };

  var field_default = {
    uuid:         function() { return null; },
    string:       function() { return ''; },
    number:       function() { return 0; },
    boolean:      function() { return false; },
    datetime:     function() { return new Date(); },
    date:         function() { return (new Date()).setUTCHours(12, 0, 0, 0); },
    min_datetime: function() { return new Date(-62135596800000); },
    max_datetime: function() { return new Date(253402214400000); },
    bytea:        function() { return ''; }
  };

  qp.module(exports, {

    ns: 'qp-model/schema',

    extend: function(_exports, o) {
      var schema = require(o.extend);
      schema.fields.system = [];
      qp.each_own(o.triggers, function(trigger, name) {
        schema.triggers[name] = trigger;
      });
      qp.each_own(o.indexes, function(index, name) {
        index.name = name;
        schema.indexes[name] = index;
      });
      if (schema.api || o.api) schema.api = qp.merge(schema.api, o.api);
      qp.each_own(o.columns, function(column, name) {
        var schema_column = schema.columns[name];
        if (schema_column) {
          qp.merge(schema_column, column);
        } else {
          column.name = name;
          schema_column = schema.columns[name] = column;
          if (column.managed) { schema.fields.managed.push(name); }
          else {
            schema.fields.all.push(name);
            schema.fields.system.push(name);
          }
        }
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
          column.width = int_widths[column.size];
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
      o.fields = { managed: [], all: [], public: [] };
      o.columns = o.columns || {};
      o.triggers = o.triggers || {};
      o.indexes = o.indexes || {};
      o.schema_name = o.schema || false;
      var schema_prefix = o.schema_name ? o.schema_name + '.' : '';
      o.table = {
        name: o.table,
        fullname: schema_prefix + o.table,
        id_sequence_name: schema_prefix + o.table + '_id_seq'
      };
      qp.each_own(o.indexes, function(index, name) { index.name = name; });
      qp.each_own(o.columns, function(column, name) {
        column.name = name;
        if (column.managed) {
          o.fields.managed.push(name);
        } else {
          o.fields.all.push(name);
          o.fields.public.push(name);
        }
      });

      o.create = this.create.bind(this, o.columns);
      o.get_schema = this.get_model_definition.bind(this, o);
      o.set_schema = this.set_schema.bind(this, o);
      _exports(o);
    },

    get_model_definition: function(o, options) {
      options = options || { internal: false };
      var definition = { name: o.name };
      var columns = definition.columns = [];
      qp.each_own(o.columns, function(column) {
        if (options.internal || !column.internal) {
          columns.push(column);
        }
      });
      return definition;
    },

    set_schema: function(o, schema_name) {
      if (o.schema_name === false) o.schema_name = schema_name;
      var schema_prefix = o.schema_name ? o.schema_name + '.' : '';
      o.table.fullname = schema_prefix + o.table.name;
      o.table.id_sequence_name = o.table.fullname + '_id_seq';
      qp.each_own(o.columns, function(column, name) {
        column.table_fullname = schema_prefix + (column.table || o.table.name);
        column.fullname = column.table_fullname + '.' + name;
      });
      return o;
    },

    create: function(fields, source, target, options) {
      options = qp.options(options, { internal: false });
      if (qp.is(source, 'array')) {
        return qp.map(source, function(item) {
          return this.create_item(fields, item, null, options);
        }.bind(this));
      } else if (qp.is(source, 'object', 'undefined')) {
        return this.create_item(fields, source, target, options);
      } else {
        return null;
      }
    },

    create_item: function(fields, source, target, options) {
      source = source || {};
      target = target || {};
      qp.each_own(fields, function(column, key) {
        if (options.internal || !column.internal) {
          var value = source[key];
          if (qp.undefined(value)) {
            target[key] = column.default();
          } else {
            target[key] = value;
          }
          if (column.datetime) {
            if (target[key] === -Infinity) {
              target[key] = qp.min_date();
            } else if (target[key] === Infinity) {
              target[key] = qp.max_date();
            }
          }
        }
      });
      return target;
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
      if (type.slice(-2) === '[]') {
        type = type.slice(0, -2);
        options.array = true;
        options.default = function() { return []; }
      }
      if (qp.is(options.default, 'string')) {
        options.default = field_default[options.default];
      }
      var field;

      if (type === 'text' && size === 0) {
        field = { type: 'text', text: true, size: 0, default: options.default || field_default.string };
      } else if (type === 'text') {
        field = { type: 'varchar', text: true, size: size, default: options.default || field_default.string };

      } else if (type === 'smallint' || type === 'int2') {
        field = { type: 'smallint', int: true, size: 2, default: options.default || field_default.number };
      } else if (type === 'int' || type === 'int4' || type === 'integer') {
        field = { type: 'integer', int: true, size: 4, default: options.default || field_default.number };
      } else if (type === 'bigint' || type === 'int8') {
        field = { type: 'bigint', int: true, size: 8, default: options.default || field_default.number };

      } else if (type === 'numeric' || type === 'decimal' || type === 'number') {
        field = { type: 'numeric', numeric: true, size: size, scale: scale, default: options.default || field_default.number };

      } else if (type === 'currency') {
        field = { type: 'numeric', numeric: true, size: 12, scale: 4, default: options.default || field_default.number };

      } else if (type === 'bool' || type === 'boolean') {
        field = { type: 'boolean', boolean: true, default: options.default || field_default.boolean };

      } else if (type === 'dt' || type === 'datetime') {
        field = { type: 'timestamp with time zone', datetime: true, default: options.default || field_default.datetime };

      } else if (type === 'date') {
        field = { type: 'timestamp with time zone', date: true, default: options.default || field_default.date };

      } else if (type === 'uuid') {
        field = { type: 'uuid', uuid: true, default: options.default || field_default.uuid };

      } else if (type === 'bytea') {
        field = { type: 'bytea', data: true, default: options.default || field_default.bytea };

      } else if (type === 'jsonb' || type === 'json') {
        field = { type: type, json: true, default: options.default || field_default.string };

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

    primary: function(options) {
      return this.field('integer', qp.options({ primary: true, sequence: true, managed: true, generated_always: true }, options));
    },

    primary_uuid: function(options) {
      return this.field('uuid', qp.options({ generated: true, primary: true, managed: false }, options));
    },

    primary_key: function(options) {
      return this.field('integer', qp.options({ primary_key: true, sequence: true, managed: false }, options));
    },

    candidate_uuid: function(options) {
      return this.field('uuid', qp.options({ generated: true, managed: false, unique: true }, options));
    },

    uuid: function(options) {
      return this.field('uuid', qp.options({ generated: true, unique: true }, options));
    },

    optional_uuid: function(options) {
      return this.field('uuid', qp.options({ generated: false, unique: false }, options));
    },

    entity_id: function(options) {
      return this.field('text', qp.options({ managed: false, entity_id: true }, options));
    },

    reference: function(options) {
      return this.field('text', qp.options({ unique: true }, options));
    },

    foreign: function(table, options) {
      return this.field('integer', qp.options({ foreign: true, table: table }, options));
    },

    foreign_uuid: function(table, options) {
      return this.field('uuid', qp.options({ foreign: true, table: table }, options));
    },

    foreign_ids: function(table, options) {
      return this.field('integer', qp.options({ foreign: true, table: table, array: true, default: function() { return []; } }, options));
    },

    foreign_uuids: function(table, options) {
      return this.field('uuid', qp.options({ foreign: true, table: table, array: true, default: function() { return []; } }, options));
    },

    unique: function(options) {
      return this.field('integer', qp.options({ unique: true, managed: false }, options));
    },

    created: function(options) {
      return this.field('datetime', qp.options({ managed: true }, options));
    },

    modified: function(options) {
      return this.field('datetime', qp.options({ managed: true }, options));
    }

  });

});
