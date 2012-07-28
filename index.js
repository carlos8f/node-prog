var glob = require('glob')
  , fs = require('fs')
  , Stream = require('stream')
  , inherits = require('util').inherits
  , brake = require('brake')
  , format = require('util').format
  , extensions = require('./extensions')
  , async = require('async')
  ;

module.exports = function prog(options) {
  options || (options = {});
  return new Prog(options).pipe(brake(options.rate || 500));
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
  if (typeof options.indent === 'undefined') {
    options.indent = 40;
  }
  this.ignore = options.ignore && new RegExp(options.ignore);
  this.repeat = options.repeat;
  this.indent = options.indent;
  if (options.files && options.files.length) {
    options.files.forEach(this.onMatch.bind(this));
  }
  else {
    var self = this;
    var tasks = [];
    if (!options.patterns) {
      options.patterns = [];
      extensions.forEach(function(ext) {
        options.patterns.push('*.' + ext);
        options.patterns.push('**/*.' + ext);
      });
    }
    options.patterns.forEach(function(pattern) {
      tasks.push(function(done) {
        self.addPattern.call(self, pattern, done);
      });
    });
    async.parallel(tasks, function(err, results) {
      var files = [];
      results.forEach(function(arr) {
        files = files.concat(arr);
      });
      if (files.length === 0) {
        self.emit('end');
      }
    });
  }
}
inherits(Prog, Stream);
module.exports.Prog = Prog;

Prog.prototype.addPattern = function(pattern, done) {
  var self = this;
  glob(pattern)
    .on('match', this.onMatch.bind(this))
    .on('end', function(files) {
      done(null, files);
    });
};

Prog.prototype.onMatch = function(file) {
  if (this.ignore && this.ignore.test(file)) return;
  this.stack.push(file);
  if (!this.started) {
    this.end();
    this.started = true;
  }
};

Prog.prototype.write = function(chunk) {
  if (this.indent) {
    chunk = chunk.toString().replace(/\n/g, '\n' + repeat(' ', this.indent));
  }
  this.emit('data', chunk);
};

Prog.prototype.end = function(chunk) {
  if (chunk) {
    this.write(chunk);
  }
  this.write('\n');
  var file = this.stack.pop();
  if (!file) {
    if (this.repeat) {
      this.stack = this.pile;
      this.pile = [];
      this.end();
      return;
    }
    this.emit('end');
    return;
  }
  var self = this;
  fs.stat(file, function(err, stats) {
    if (stats.isFile()) {
      self.pile.unshift(file);
      self.header(file);
      fs.createReadStream(file).pipe(self);
    }
  });
};

Prog.prototype.header = function(file) {
  var sep = repeat('-', file.length);
  this.write(format('%s\n%s\n%s\n', sep, file, sep));
};

function repeat(str, len) {
  var ret = '';
  while (ret.length < len) ret += str;
  return ret;
}