import { ILog } from "./log";
import { ITask } from "./task";
import { globalAgent } from "http";

const assert = require('chai').assert;
const asciitree = require('ascii-tree');

//
// Lookup table for tasks.
//
export interface ITaskMap {
    [index: string]: ITask;
}

//
// Defines global callbacks for the task runner.
//
export interface ITaskRunnerCallbacks {

    //
    // Callback invoked when a task has started.
    //
    taskStarted?(taskName: string): Promise<void>;

    //
    // Callback invoked when a task has succeeded.
    //
    taskSuccess?(taskName: string): Promise<void>;

    //
    // Callback invoked when a task has failed.
    //
    taskFailure?(taskName: string, err: Error): Promise<void>;

    //
    // Callback invoked when a task has finished (either success or failure).
    //
    taskDone?(taskName: string): Promise<void>;

    //
    // Called for unhandle exceptions.
    //
    unhandledException?(err: Error): void;
}

export interface ITaskRunner {
    //
    // Set user callbacks.
    //
    setCallbacks(callbacks: any): void;

    //
	// Get a task by name, throws exception if task doesn't exist.
	//
    getTask(taskName: string): ITask;

    //
    // Add a task.
    //
	addTask(task: ITask): void;
    
    //
	// Run a named task with a particular config.
	//
    runTask(taskName: string, globalConfig: any, localConfig: any): Promise<void>;
    
    //
    // List registered tasks.
    //
    listTasks(globalConfig: any, localConfig: any): Promise<void>;
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
    private tasks: ITask[] = [];

    //
    // Map of tasks for look up by name.
    //
    private taskMap: ITaskMap = {};

    //
    // User-defined callbacks for particular events.
    //
    private callbacks?: ITaskRunnerCallbacks;

    constructor(log: ILog) {
        this.log = log;
    }

    //
    // Set user callbacks.
    //
    setCallbacks(callbacks: ITaskRunnerCallbacks): void {
        this.callbacks = callbacks;
    }

    //
    // Add a task.
    //
	addTask(task: ITask): void {
        this.tasks.push(task);
        this.taskMap[task.getName()] = task;                
	}

	//
	// Get a task by name, throws exception if task doesn't exist.
	//
	getTask(taskName: string): ITask {
        const task = this.taskMap[taskName];
        if (!task) {
            throw new Error("Task not found: " + taskName);
        }

        return task;
	}

    //
    // Notify a task has started.
    //
    private async notifyTaskStarted(taskName: string): Promise<void> {
        if (this.callbacks && this.callbacks.taskStarted) {
            await this.callbacks.taskStarted(taskName);
        }
    }

    //
    // Notify that a task succeeded.
    //
    private async notifyTaskSuccess(taskName: string): Promise<void> {
        if (this.callbacks && this.callbacks.taskSuccess) {
            await this.callbacks.taskSuccess(taskName);
        }
    }

    //
    // Notify that a task failed.
    //
    private async notifyTaskFailed(taskName: string, err: Error): Promise<void> {
        if (this.callbacks && this.callbacks.taskFailure) {
            await this.callbacks.taskFailure(taskName, err);
        }         
    }

    //
    // Notify that a task is done.
    //
    private async notifyTaskDone(taskName: string): Promise<void> {
        if (this.callbacks && this.callbacks.taskDone) {
            await this.callbacks.taskDone(taskName);
        }         
    }

	//
	// Run a named task with a particular config.
	//
	async runTask(taskName: string, globalConfig: any, localConfig: any): Promise<any> {

        const task = this.taskMap[taskName];
        if (!task) {
            throw new Error("Failed to find task: " + taskName);
        }

        globalConfig = globalConfig || {};
        localConfig = localConfig || {};

        let uncaughtExceptionCount = 0;
        const uncaughtExceptionHandler = (err: any): void => {
            ++uncaughtExceptionCount;

            if (this.callbacks && this.callbacks.unhandledException) {
                this.callbacks.unhandledException(err);
            }
            else {
                this.log.error("Unhandled exception occurred.");
                this.log.error(err && err.stack || err);
            }            
        };

        process.on('uncaughtException', uncaughtExceptionHandler);

        try {
            await this.notifyTaskStarted(taskName);

            const tasksValidated = {}; // Tasks that have been validated.
            await task.validate(localConfig, globalConfig, tasksValidated);
    
            const taskInvoked = {}; // Tasks that have been invoked.
            const taskResults = {}; // Collected cached task results.
            const result = await task.invoke(localConfig, globalConfig, taskInvoked, taskResults, 0);

            if (uncaughtExceptionCount > 0) {
                throw new Error(' Unhandled exceptions (' + uncaughtExceptionCount + ') occurred while running task ' + taskName);
            };

            process.removeListener('uncaughtException', uncaughtExceptionHandler);
            await this.notifyTaskSuccess(taskName);
            return result;
        }
        catch (err) {
            process.removeListener('uncaughtException', uncaughtExceptionHandler);
            await this.notifyTaskFailed(taskName, err);
            throw err;
        }
        finally {
            await this.notifyTaskDone(taskName);
        }
	}    

    //
    // List registered tasks.
    //
    async listTasks(globalConfig: any, localConfig: any): Promise<void> {

        let treeOutput = "#tasks\n";

        for (const task of this.tasks) {
            treeOutput += await task.genTree(2, globalAgent, localConfig);
        }

        this.log.info(asciitree.generate(treeOutput));
    }
}