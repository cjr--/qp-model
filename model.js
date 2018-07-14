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
