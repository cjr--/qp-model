require('qp-define');

var path = require('path');
var fs = require('fs');
var uglify = require('uglify-js');
var term = require('qp-library/term');

term.set_title('qp-model - build');

fs.writeFileSync(
  path.join(__dirname, 'qp-model.js'), [
    fs.readFileSync(path.join(__dirname, 'model.js'), 'utf8'),
    fs.readFileSync(path.join(__dirname, 'schema.js'), 'utf8')
  ].join('\n')
);

fs.writeFileSync(
  path.join(__dirname, 'qp-model.min.js'),
  uglify.minify(
    fs.readFileSync(path.join(__dirname, 'qp-model.js'), 'utf8'),
    { compress: { dead_code: false, unused: false } }
  ).code
);
