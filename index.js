var glob = require('glob')
  , fs = require('fs')
  , Stream = require('stream')
  , inherits = require('util').inherits
  , brake = require('brake')
  , format = require('util').format
  , async = require('async')
  ;

module.exports = function prog(options) {
  options || (options = {});
  return new Prog(options).pipe(brake(options.rate || 100));
};

function Prog(options) {
  Stream.call(this);
  this.readable = true;
  this.writable = true;
  this.stack = [];
  this.pile = [];
  this.started = false;
  if (typeof options.ignore === 'undefined') {
    options.ignore = '/?node_modules/';
  }
  this.ignore = options.ignore && new RegExp(options.ignore);
  this.repeat = options.repeat;
  if (options.files && options.files.length) {
    options.files.forEach(this.onMatch.bind(this));
  }
  else {
    var self = this;
    var tasks = [];
    (options.patterns || ['*.json', '*.js', '*.coffee', '**/*.js', '**/*.coffee', '*.sh', '**/*.sh', '*.md', '*.markdown'])
      .forEach(function(pattern) {
        tasks.push(function(done) {
          self.addPattern.call(self, pattern, done);
        });
      });
    async.parallel(tasks, function(files) {
      files.forEach(self.onMatch.bind(self));
    });
  }
}
inherits(Prog, Stream);
module.exports.Prog = Prog;

Prog.prototype.addPattern = function(pattern, done) {
  var self = this;
  glob(pattern)
    .on('match', this.onMatch.bind(this))
    .on('end', done);
};

Prog.prototype.onMatch = function(file) {
  if (this.ignore && this.ignore.test(file)) return;
  this.stack.push(file);
  if (!this.started) {
    this.started = true;
    this.end();
  }
}

Prog.prototype.write = function(chunk) {
  this.emit('data', chunk);
};

Prog.prototype.end = function(chunk) {
  if (chunk) {
    this.write(chunk);
  }
  var file = this.stack.pop();
  if (!file) {
    this.emit('data', '\n');
    if (this.repeat) {
      this.stack = this.pile;
      this.pile = [];
      this.end();
      return;
    }
    this.emit('end');
    return;
  }
  this.pile.unshift(file);
  this.header(file);
  fs.createReadStream(file).pipe(this);
};

Prog.prototype.header = function(file) {
  var sep = repeat('-', file.length);
  if (this.started) this.emit('data', '\n');
  this.emit('data', format('%s\n%s\n%s\n', sep, file, sep));
};

function repeat(str, len) {
  var ret = '';
  while (ret.length < len) ret += str;
  return ret;
}