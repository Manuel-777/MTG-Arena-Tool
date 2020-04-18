#!/usr/bin/env node
var argv = require('optimist')
    .usage('Convert a ProtoBuf.js JSON description in TypeScript definitions.\nUsage: $0')

    .demand('f')
    .alias('f', 'file')
    .describe('f', 'The JSON file')

    .boolean('c')
    .alias('c', 'camelCaseGetSet')
    .describe('c', 'Generate getter and setters in camel case notation')
    .default('c', true)

    .boolean('u')
    .alias('u', 'underscoreGetSet')
    .describe('u', 'Generate getter and setters in underscore notation')
    .default('u', false)

    .boolean('p')
    .alias('p', 'properties')
    .describe('p', 'Generate properties')
    .default('p', true)

    .argv;

var fs = require('fs');

var vinylFile = require('vinyl-file');
var proto2typescript = require('../lib/proto2typescript');

//var file = vinylFile.readSync(argv.file);
var file = fs.readFileSync(argv.file, 'utf8');

proto2typescript(
    file,
    {
        camelCaseGetSet: argv.camelCaseGetSet,
        underscoreGetSet: argv.underscoreGetSet,
        properties: argv.properties
    },
    function (err, out) {
        if (err != null) {
            console.error(err);
            process.exit(1);
        }
        else {
            process.stdout.write(out);
        }
    }
);
