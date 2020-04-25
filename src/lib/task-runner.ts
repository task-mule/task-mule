import { ILog } from "./log";
import { ITask } from "./task";
import { callbackify } from "util";

const assert = require('chai').assert;
const asciitree = require('ascii-tree');
const Stopwatch = require('statman-stopwatch');

//
// Lookup table for tasks.
//
export interface ITaskMap {
    [index: string]: ITask;
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
    runTask(taskName: string, config: any, configOverride: any): Promise<void>;
    
    //
    // List registered tasks.
    //
    listTasks(): void;

    //
    // Resolve dependencies for all tasks.
    //
    resolveAllDependencies(config: any): Promise<void>;
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
    private callbacks?: any;

    constructor(log: ILog) {
        this.log = log;
    }

    //
    // Set user callbacks.
    //
    setCallbacks(callbacks: any): void {
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
            await this.callbacks.taskStarted({ name: taskName });
        }
    }

    //
    // Notify that a task succeeded.
    //
    private async notifyTaskSuccess(taskName: string, stopwatch: any): Promise<void> {
        if (this.callbacks && this.callbacks.taskSuccess) {
            var elapsedTimeMins = stopwatch.read()/1000.0/60.0; 
            await this.callbacks.taskSuccess({ name: taskName }, elapsedTimeMins);
        }
    }

    //
    // Notify that a task failed.
    //
    private async notifyTaskFailed(taskName: string, err: any, stopwatch: any): Promise<void> {
        if (this.callbacks && this.callbacks.taskFailure) {
            var elapsedTimeMins = stopwatch.read()/1000.0/60.0; 
            await this.callbacks.taskFailure({ name: taskName }, elapsedTimeMins, err);
        }         
    }

    //
    // Notify that a task is done.
    //
    private async notifyTaskDone(taskName: string): Promise<void> {
        if (this.callbacks && this.callbacks.taskDone) {
            await this.callbacks.taskDone({ name: taskName });
        }         
    }

	//
	// Run a named task with a particular config.
	//
	async runTask(taskName: string, config: any, configOverride: any): Promise<void> {

        const task = this.taskMap[taskName];
        if (!task) {
            throw new Error("Failed to find task: " + taskName);
        }

        configOverride = configOverride || {};

        const stopwatch = new Stopwatch();
        stopwatch.start();

        let uncaughtExceptionCount = 0;
        const uncaughtExceptionHandler = (err: any): void => {
            ++uncaughtExceptionCount;

            if (this.callbacks.unhandledException) {
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

            await task.resolveDependencies(config);

            const tasksValidated = {}; // Tasks that have been validated.
            await task.validate(configOverride, config, tasksValidated);
    
            const taskInvoked = {}; // Tasks that have been invoked.
            await task.invoke(configOverride, config, taskInvoked);

            if (uncaughtExceptionCount > 0) {
                throw new Error(' Unhandled exceptions (' + uncaughtExceptionCount + ') occurred while running task ' + taskName);
            };

            stopwatch.stop();
            process.removeListener('uncaughtException', uncaughtExceptionHandler);
            await this.notifyTaskSuccess(taskName, stopwatch);
        }
        catch (err) {
            stopwatch.stop();
            process.removeListener('uncaughtException', uncaughtExceptionHandler);
            await this.notifyTaskFailed(taskName, err, stopwatch);
            throw err;
        }
        finally {
            await this.notifyTaskDone(taskName);
        }
	}    

    //
    // List registered tasks.
    //
    listTasks(): void {

        let treeOutput = "#tasks\n";

        for (const task of this.tasks) {
            treeOutput += task.genTree(2);
        }

        this.log.info(asciitree.generate(treeOutput));
    }

    //
    // Resolve dependencies for all tasks.
    //
    async resolveAllDependencies(config: any): Promise<void> {

        assert.isObject(config);

        for (const task of this.tasks) {
            await task.resolveDependencies(config); //TODO: Can these be done in parallel?
        }
    }

}