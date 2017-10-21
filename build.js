var path = require('path');
var fs = require('fs');
var uglify = require('uglify-js');

fs.writeFileSync(
  path.join(__dirname, 'qp-model.js'), [
    fs.readFileSync(path.join(__dirname, 'index.js'), 'utf8'),
    fs.readFileSync(path.join(__dirname, 'model.js'), 'utf8'),
    fs.readFileSync(path.join(__dirname, 'schema.js'), 'utf8')
  ].join('\n')
);

fs.writeFileSync(
  path.join(__dirname, 'qp-model.min.js'),
  uglify.minify(fs.readFileSync(path.join(__dirname, 'qp-model.js'), 'utf8')).code
);
