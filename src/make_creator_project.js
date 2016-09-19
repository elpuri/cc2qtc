#!/usr/bin/env node

// Generates generic Qt creator project files from compilation_commands.json
var args = process.argv.slice(2);
if (args.length < 2) {
    console.log('Usage:', process.argv[0], '<project name> <build dir> [source dir]');
    console.log('source dir is searched recursively for auxiliary files');
    return;
}

var projectName = args[0];
var buildDir = args[1];

if (args.length < 3)
    var sourceDir = '';
else
    sourceDir = args[2];

var fs = require('fs');
var ccFile = buildDir + '/compile_commands.json';

try {
    var commands = JSON.parse(fs.readFileSync(ccFile, 'utf8'));
} catch (e) {
    console.log("Couldn't open", ccFile)
    return;
}

var dflags = {};
var fileExtensions = ['.c', '.cpp', '.h', '.hpp', '.js', '.txt', '.cmake'];

var filesStream = fs.createWriteStream(projectName + '.files');

var traverseDirectory = function(path) {
    var entries = fs.readdirSync(path);
    entries.forEach(function(entry) {
        entry = path + '/' + entry;
        var attrs = fs.statSync(entry);
        if (attrs && attrs.isDirectory()) {
            traverseDirectory(entry);
        } else {
            for (var i = 0; i < fileExtensions.length; i++) {
                if (entry.lastIndexOf(fileExtensions[i]) === entry.length - fileExtensions[i].length) {
                    console.log('Adding file', entry);
                    filesStream.write(entry + '\n');
                    break;
                }
            }
        }
    });
}

if (sourceDir)
    traverseDirectory(sourceDir);


var includeDirs = {};

var flagRE = new RegExp('-D(.+?)\\s', 'g');
var valueRE = new RegExp('(.*?)=(.*)');
var includeRE = new RegExp('-I(.+?)\\s', 'g');


commands.forEach(function(command) {
    // Extract defines
    var flagMatch;
    while ((flagMatch = flagRE.exec(command.command)) !== null) {
        var flag = flagMatch[1];
        var valuedFlagMatch = valueRE.exec(flag);
        if (valuedFlagMatch === null)
            dflags[flag] = null;
        else
            dflags[valuedFlagMatch[1]] = valuedFlagMatch[2];
    }

    // Extract include dirs
    var includeDirMatch;
    while ((includeDirMatch = includeRE.exec(command.command)) !== null) {
        includeDirs[includeDirMatch[1]] = null;
    }
})
filesStream.end();

fs.writeFile(projectName + '.creator', '[General]');

var defineStream = fs.createWriteStream(projectName + '.config');
Object.keys(dflags).forEach(function(define) {
    if (dflags[define] === null)
        defineStream.write('#define ' + define + '\n');
    else
        defineStream.write('#define ' + define + ' ' + dflags[define] + '\n');
});
defineStream.end();

var includeStream = fs.createWriteStream(projectName + '.includes');
Object.keys(includeDirs).forEach(function(dir) {
    includeStream.write(dir + '\n');
})
includeStream.end();

console.log('done.');
