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
        this.user_id = this.user.id;
      }
    }

  });

});
