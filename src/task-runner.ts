'use strict';

import { ILog } from "./log";
import { ITask } from "./task";

var assert = require('chai').assert;
var E = require('linq');
var asciitree = require('ascii-tree');

export interface ITaskRunner {
    //
	// Get a task by name, throws exception if task doesn't exist.
	//
	getTask(taskName: string): ITask;
}

// 
// Responsible for finding and running tasks.
//

export class TaskRunner implements ITaskRunner {

    //
    // Injected log.
    //
    private log: ILog;

	//
	// All tasks.
	//
    private tasks: any[] = []; //TODO: Should be ITask[]

    //
    // Map of tasks for look up by name.
    //
    private taskMap: any = {}; //TODO: Type this.

    constructor(log: ILog) {
        this.log = log;
    }

    //
    // Add a task.
    //
	addTask(task: any) {

		assert.isObject(task);

        this.tasks.push(task);
        this.taskMap[task.name()] = task;                
	}

	//
	// Get a task by name, throws exception if task doesn't exist.
	//
	getTask(taskName: string): ITask {

		assert.isString(taskName);

        const task = this.taskMap[taskName];
        if (!task) {
            throw new Error("Task not found: " + taskName);
        }

        return task;
	}

	//
	// Run a named task with a particular config.
	//
	async runTask(taskName: string, config: any, configOverride: any): Promise<void> {

		assert.isString(taskName);
		assert.isObject(config);
        assert.isObject(configOverride);

        const requestedTask = this.taskMap[taskName];
        if (!requestedTask) {
            throw new Error("Failed to find task: " + taskName);
        }

        await this.resolveDependencies(taskName, config);

        const tasksValidated = {}; // Tasks that have been validated.
        await requestedTask.validate(configOverride, config, tasksValidated);

        const taskInvoked = {}; // Tasks that have been invoked.
        await requestedTask.invoke(configOverride, config, taskInvoked);
	}


    //
    // List registered tasks.
    //
    listTasks() {

        let treeOutput = "#tasks\n";

        for (const task of this.tasks) {
            treeOutput += task.genTree(2);
        }

        this.log.info(asciitree.generate(treeOutput));
    };

    //
    // Resolve dependencies for all tasks.
    //
    async resolveAllDependencies(config: any): Promise<void> {

        assert.isObject(config);

        for (const task of this.tasks) {
            await task.resolveDependencies(config); //TODO: Can these be done in parallel?
        }
    };
    
    //
    // Resolve dependencies for a particular task.
    //
    async resolveDependencies(taskName: string, config: any): Promise<void> {

        assert.isString(taskName);
    	assert.isObject(config);

        const task = this.taskMap[taskName];
        if (!task) {
            throw new Error("Failed to find task: " + taskName);
        }        

        await task.resolveDependencies(config);
    };
};