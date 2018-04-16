define(module, function(exports, require) {

  var qp = require('qp-utility');

  qp.make(exports, {

    ns: 'qp-model/model',

    init: function(o) {
      var schema = this.schema;
      var source = qp.delete_key(o, schema.name);
      this.set_data(source, o);
      if (o && o.display) this.refresh();
    },

    refresh: function() { },

    set_user: function(user) {
      if (qp.is(user, 'array')) user = qp.find(user, { id: this.user_id });
      if (qp.is(user, 'user')) {
        this.user = user;
        this.user_id = user.id;
      }
    },

    set_data: function(source, options) {
      qp.each(this.schema.columns, function(column) {
        var key = column.name;
        if (column.primary || column.primary_key) {
          var _key = '_' + key;
          this[key] = source[key] || source[_key] || qp.id();
          this[_key] = source[key] || 0;
        } else {
          this[key] = source[key] || column.default();
        }
      });
    },

    get_data: function(options) {
      var target = options.target || {};
      qp.each(this.schema.columns, function(column) {
        var key = column.name;
        if (column.primary || column.primary_key) {
          var _key = '_' + key;
          target[key] = this[key] === this[_key] ? this[key] : 0;
          target[_key] = this[key] || 0;
        } else {
          target[key] = this[key];
        }
      });
      return target;
    }

  });

});
