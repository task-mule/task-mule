var assert = require('chai').assert;
var fs = require("fs");
var path = require('path');
var S = require('string');
var Task = require('./task');
var assert = require('chai').assert;

//
// Automatic loading of Grunt tasks from a collection of files.
//
module.exports = function (autoLoadConfig, log, taskRunner) {

    assert.isObject(autoLoadConfig);

    // 
    // Load in all tasks from files.
    //
    var tasksDir = autoLoadConfig.tasksDir || path.join(process.cwd(), "tasks");

    //
    // Strips an extension from a filename.
    //
    var stripExt = function (fileName) {
        assert.isString(fileName);

        if (S(fileName).endsWith('.js')) {
            return fileName.slice(0, -3); // Hacky: Specific for .js files.
        }
        else {
            return fileName;
        }
    };

    //
    // Sync walk a directory structure and call the callback for each file.
    //
    var walkDirsInternal = function (rootPath, subDirPath) {

        assert.isString(rootPath);
        assert.isString(subDirPath);
        
        var dirPath = path.join(rootPath, subDirPath);
        var items = fs.readdirSync(dirPath);
            
        for (var i = 0; i < items.length; ++i) {
            
            var itemName = items[i];
            var relativeItemPath = path.join(subDirPath, itemName);
            var fullItemPath = path.join(dirPath, itemName);
            var stat = fs.statSync(fullItemPath);            
            if (stat.isDirectory()) {
                walkDirsInternal(rootPath, relativeItemPath);
            }
            else {
                var taskName = stripExt(S(relativeItemPath).replaceAll('\\', '/').s);
                taskRunner.addTask(new Task(taskName, relativeItemPath, fullItemPath, log, taskRunner));
            }
        }
    };

    var walkDirs = function (dirPath) {
        walkDirsInternal(dirPath, "./");
    };    
    
    walkDirs(tasksDir);
};