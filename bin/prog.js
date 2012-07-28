#!/usr/bin/env node
var argv = require('optimist')
    .alias('h', 'help')
    .argv
  ;

if (argv.help) {
  console.log('Usage: ' + require('path').basename(process.argv[1]) + ' glob [glob...] [--rate=bytes/sec]');
  process.exit();
}
if (typeof argv.pattern === 'string') {
  argv.pattern = [argv.pattern];
}
require('../')({
  files: argv._,
  rate: argv.rate,
  patterns: argv.pattern,
  repeat: argv.repeat,
  ignore: argv.ignore,
  indent: argv.indent
}).pipe(process.stdout);