import { ILog } from "./log";
import { ITask, Task } from "./task";
import { assert } from 'chai';
import * as fs from 'fs';
import * as path from 'path';
var S = require('string');
import { ITaskRunner } from "./task-runner";

//
// Strips an extension from a filename.
//
function stripExt(fileName: string): string {
    assert.isString(fileName);

    if (S(fileName).endsWith('.js')) {
        return fileName.slice(0, -3); // Hacky: Specific for .js files.
    }
    else {
        return fileName;
    }
}

//
// Sync walk a directory structure and call the callback for each file.
//
function walkDirs(rootPath: string, subDirPath: string, log: ILog, taskRunner: ITaskRunner) {

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
            walkDirs(rootPath, relativeItemPath, log, taskRunner);
        }
        else {
            var taskName = stripExt(S(relativeItemPath).replaceAll('\\', '/').s);
            taskRunner.addTask(new Task(taskName, relativeItemPath, fullItemPath, log, taskRunner));
        }
    }
}

//
// Automatic loading of tasks from a collection of files.
//
export function loadTasks(autoLoadConfig: any, log: ILog, taskRunner: ITaskRunner) {
    var tasksDir = autoLoadConfig.tasksDir || path.join(process.cwd(), "tasks");
    walkDirs(tasksDir, "./", log, taskRunner);
};