import { ITaskRunner } from "./task-runner";
import { ILog } from "./log";
import { assert } from 'chai';
var Stopwatch = require('statman-stopwatch');
import * as Sugar from 'sugar';
var util = require('util');
var hash = require('./es-hash');

export type DependsOnFn = (config: any) => Promise<string[]>;

//
// User-defined task module.
//
export interface ITaskModule {

    //
    // Defines the other tasks that this one depends on.
    //
    dependsOn?: string[] | DependsOnFn;

    //
    // Validate the task.
    //
    validate?(config: any): Promise<void>;

    //
    // Invoke the task.
    //
    invoke?(config: any): Promise<void>;
}

//
// Represents a dependency of a task.
//
export interface IDependency {
    //
    // Name of the task.
    //
    task: string;

    //
    // The task that has been resolved for the dependency.
    //
    resolvedTask?: ITask;   
}

//
// Boolean lookup table for tasks.
//
export interface IBooleanMap {
    [index: string]: boolean;
}

//
// Represents a task.
//
export interface ITask {
    //
    // The name of this task.
    //
    getName(): string;

    //
    // Resolve dependencies for the task.
    //       
    resolveDependencies(config: any): Promise<void>;

    //
    // Validate the task.
    //
    validate(configOverride: any, config: any, tasksValidated: IBooleanMap): Promise<any>;

    //
    // Invoke the task.
    //
    invoke(configOverride: any, config: any, tasksInvoked: IBooleanMap): Promise<void>;

    //
    // Generate a tree for the tasks dependencies.
    //
    genTree(indentLevel: number): string;
}

//
// Class that represents a task loaded from a file.
//
export class Task implements ITask {

    //
    // The name of the task.
    //
    private taskName: string;

    //
    // The relative path to the task's script file.
    //
    private relativeFilePath: string;

    //
    // The full path to the task's script file.
    //
    private fullFilePath: string;

    //
    // Depdencies that have been resolved for this task.
    //
    private resolvedDependencies: IDependency[] = [];
    
    //
    // Injected logger.
    //
    private log: ILog;

    //
    // Injected task runner.
    //
    private taskRunner: ITaskRunner;

    //
    // Module loaded from the task's script file.
    //
    private taskModule: ITaskModule;

    constructor(taskName: string, relativeFilePath: string, fullFilePath: string, taskModule: ITaskModule, log: ILog, taskRunner: ITaskRunner) {
        this.taskName = taskName;
        this.relativeFilePath = relativeFilePath;
        this.fullFilePath = fullFilePath;
        this.log = log;
        this.taskRunner = taskRunner;
        this.taskModule = taskModule;
    }

    //
    // The name of this task.
    //
    getName(): string {
        return this.taskName;
    }

    //
    // Get depenencies.
    //
    getResolvedDependencies(): IDependency[] {
        return this.resolvedDependencies;
    }

    //
    // Normalize dependencies.
    //
    private normalizeDependencies(dependencies: (string|IDependency)[]): IDependency[] {
        return dependencies.map(dependency => {
            if (util.isObject(dependency)) {
                return dependency as IDependency;
            }
            else {
                assert.isString(dependency, "Expected dependency to be a string that names another task.");

                return { 
                    task: dependency as string,
                };
            }
        });
    };

    //
    // Gets the tasks that this task depends on.
    // Returns a promise, just in case the task needs some time to figure out it's dependencies.
    //
    private async establishDependencies(config: any): Promise<IDependency[]> {

        if (!this.taskModule) {
            return [];
        }

        if (!this.taskModule.dependsOn) {
            return [];
        }
        
        let dependencies: string[];
        
        if (Sugar.Object.isFunction(this.taskModule.dependsOn)) {
            dependencies = await (this.taskModule.dependsOn as DependsOnFn)(config);
        }
        else {
            dependencies = this.taskModule.dependsOn as string[];
        }

        return this.normalizeDependencies(dependencies);
    }

    //
    // Resolve dependencies for the task.
    //       
    async resolveDependencies(config: any): Promise<void> {

        try {
            const resolvedDependencies = await this.establishDependencies(config);
            for (const dependency of resolvedDependencies) {
                dependency.resolvedTask = this.taskRunner.getTask(dependency.task);
                if (!dependency.resolvedTask) {
                    this.log.error(`Failed to resolve task named ${dependency.task}.`);
                }
            }
            
            this.resolvedDependencies = resolvedDependencies.filter(dependency => dependency.resolvedTask);

            const tasks = this.resolvedDependencies.map(dependency => dependency.resolvedTask);
            for (const task of tasks) { //TODO: Can this be done in parallel?
                if (task) {
                    await task.resolveDependencies(config);
                }
            }
        }
        catch (err) {
            this.log.error('Exception while resolving dependencies for task: ' + this.getName() + "\r\n" + err.stack);
            throw err;
        }
    }

    //
    // Generate a key for caching.
    //
    genTaskKey(configOverride: any): string {
        return this.taskName + '_' + hash(configOverride);
    }

    //
    // Validate the task.
    //
    async validate(configOverride: any, config: any, tasksValidated: IBooleanMap): Promise<void> {
        var taskKey = this.genTaskKey(configOverride);
        if (tasksValidated[taskKey]) {
            // Skip tasks that have already been satisfied.
            return;
        }

        config.push(configOverride);

        try {                        
        for (const dependency of this.resolvedDependencies) {
            if (dependency.resolvedTask) {
                    await dependency.resolvedTask.validate(configOverride, config, tasksValidated);
            }
        }

        tasksValidated[taskKey] = true; // Make that the task has been invoked.

        if (!this.taskModule) {
            return;
        }
    
        if (!this.taskModule.validate) {
            return;   
        }

            return await this.taskModule.validate(config);
        }
        catch (err) {
            this.log.error(`Exception while validating task: ${this.taskName}.`);
            throw err;
        }
        finally {
            config.pop(); // Restore previous config.
        }
    }

    //
    // Invoke the task.
    //
    async invoke(configOverride: any, config: any, tasksInvoked: IBooleanMap): Promise<void> {

        var taskKey = this.genTaskKey(configOverride);
        if (tasksInvoked[taskKey]) {
            // Skip tasks that have already been satisfied.
            return;
        }

        config.push(configOverride);

        const stopWatch = new Stopwatch();

        try {

            //
            // Run sequential dependencies.
            //
            for (const dependency of this.resolvedDependencies) {
                if (dependency.resolvedTask) {                
                    await dependency.resolvedTask.invoke(configOverride, config, tasksInvoked);
                }
            }

            tasksInvoked[taskKey] = true; // Make that the task has been invoked.

            if (!this.taskModule) {
                this.log.warn("Task not implemented: " + this.taskName);
                return;
            }
            
            if (!this.taskModule.invoke) {
                return;   
            }

            this.log.info(this.taskName);

            stopWatch.start();

            await this.taskModule.invoke(config);

            stopWatch.stop();
            this.log.info(this.taskName + " completed : " + (stopWatch.read() * 0.001).toFixed(2) + " seconds");
        }
        catch (err) {
            stopWatch.stop();
            this.log.error(this.taskName + " failed : " + (stopWatch.read() * 0.001).toFixed(2) + " seconds");
            throw err;
        }
        finally {
            config.pop(); // Restore previous config.
        }
    }

    //
    // Make a string for indented output.
    //
    private makeIndent(indentLevel: number): string {
        let output = "";
        while (indentLevel-- > 0) {
            output += "#";
        }

        return output;
    }

    //
    // Generate a tree for the tasks dependencies.
    //
    genTree(indentLevel: number): string {
        let output = this.makeIndent(indentLevel);
        output += this.getName();
        output += "\n";

        for (const dependency of this.resolvedDependencies) {
            if (dependency.resolvedTask) {
                output += dependency.resolvedTask.genTree(indentLevel+1);            
            }
        }

        return output;
    }
}
