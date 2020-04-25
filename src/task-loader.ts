import { ILog } from "./log";
import { Task } from "./task";
import { assert } from 'chai';
import * as fs from 'fs';
import * as path from 'path';
var S = require('string');
import { ITaskRunner } from "./task-runner";

//
// Strips an extension from a filename.
//
function stripExt(fileName: string): string {
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
    const dirPath = path.join(rootPath, subDirPath);
    const items = fs.readdirSync(dirPath);
        
    for (let i = 0; i < items.length; ++i) {
        const itemName = items[i];
        const relativeItemPath = path.join(subDirPath, itemName);
        const fullItemPath = path.join(dirPath, itemName);
        const stat = fs.statSync(fullItemPath);            
        if (stat.isDirectory()) {
            walkDirs(rootPath, relativeItemPath, log, taskRunner);
        }
        else {
            const taskName = stripExt(S(relativeItemPath).replaceAll('\\', '/').s);
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
}