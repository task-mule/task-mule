'use strict';

import { assert } from 'chai';
import { ITaskRunner } from './task-runner';
import { ILog } from './log';
import { callbackify } from 'util';
import { ITask } from './task';
const Stopwatch = require('statman-stopwatch');

// 
// A higher level manager for tasks. Runs tasks and coordinates error handling and logging.
//

export interface IJobRunner {
    //
	// Run a named task with a particular config.
	//
	runTask(taskName: string, config: any, configOverride: any): Promise<void>;
}

export class JobRunner implements IJobRunner { //TODO: JUST INTEGRATE THIS WITH TASKRUNNER.
    //
    // Injected task runner.
    //
    taskRunner: ITaskRunner;

    // 
    // Injected log.
    //
    log: ILog;

    //
    // User-defined callbacks for particular events.
    //
    callbacks: any;

    constructor(taskRunner: ITaskRunner, log: ILog, callbacks: any) {
        this.taskRunner = taskRunner;
        this.log = log;
        this.callbacks = callbackify;
    }

    //
    // Notify a task has started.
    //
    private async notifyTaskStarted(taskName: string): Promise<void> {
        if (this.callbacks.taskStarted) {
            await this.callbacks.taskStarted({ name: taskName });
        }
    };

    //
    // Notify that a task succeeded.
    //
    private async notifyTaskSuccess(taskName: string, stopwatch: any): Promise<void> {
        if (this.callbacks.taskSuccess) {
            var elapsedTimeMins = stopwatch.read()/1000.0/60.0; 
            await this.callbacks.taskSuccess({ name: taskName }, elapsedTimeMins);
        }
    };

    //
    // Notify that a task failed.
    //
    private async notifyTaskFailed(taskName: string, err: any, stopwatch: any): Promise<void> {
        if (this.callbacks.taskFailure) {
            var elapsedTimeMins = stopwatch.read()/1000.0/60.0; 
            await this.callbacks.taskFailure({ name: taskName }, elapsedTimeMins, err);
        }         
    };

    //
    // Notify that a task is done.
    //
    private async notifyTaskDone(taskName: string): Promise<void> {
        if (this.callbacks.taskDone) {
            await this.callbacks.taskDone({ name: taskName });
        }         
    };

	//
	// Run a named task with a particular config.
	//
	async runTask(taskName: string, config: any, configOverride: any): Promise<void> {

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
            await this.taskRunner.runTask(taskName, config, configOverride);

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
}