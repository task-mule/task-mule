import { ITaskRunner } from "./task-runner";
import { ILog } from "./log";
import { assert } from 'chai';
var Stopwatch = require('statman-stopwatch');
import * as Sugar from 'sugar';
var util = require('util');
var hash = require('./es-hash');

export type DependsOnFn = (config: any) => Promise<(IDependency|string)[]>;

//
// User-defined task module.
//
export interface ITaskModule {

    //
    // Defines the other tasks that this one depends on.
    //
    runs?: (IDependency|string)[] | DependsOnFn;

    //
    // Validate the task.
    //
    validate?(config: any): Promise<void>;

    //
    // Invoke the task.
    //
    invoke?(config: any): Promise<any>;
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
    // Configuration for the task.
    //
    config?: any;

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
// Result lookup table for tasks.
//
export interface IResultMap {
    [index: string]: any;
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
    // Validate the task.
    //
    validate(localConfig: any, globalConfig: any, tasksValidated: IBooleanMap): Promise<any>;

    //
    // Invoke the task.
    //
    invoke(localConfig: any, globalConfig: any, tasksInvoked: IBooleanMap, taskResults: IResultMap, indentLevel: number): Promise<any>;

    //
    // Generate a tree for the tasks dependencies.
    //
    genTree(indentLevel: number, localConfig: any, globalConfig: any): Promise<string>;
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
    // Normalize a single dependency.
    private normalizeDependency(dependency: string | IDependency): IDependency {
        if (Sugar.Object.isString(dependency)) {
            return {
                task: dependency,
            }
        }
        else {
            return dependency;
        }
    }

    //
    // Normalize dependencies.
    //
    private normalizeDependencies(dependencies: (string|IDependency)[]): IDependency[] {
        return dependencies.map(dependency => this.normalizeDependency(dependency));
    };

    //
    // Gets the tasks that this task depends on.
    // Returns a promise, just in case the task needs some time to figure out it's dependencies.
    //
    private async establishDependencies(config: any): Promise<IDependency[]> {

        if (!this.taskModule) {
            return [];
        }

        if (!this.taskModule.runs) {
            return [];
        }
        
        let dependencies: (string|IDependency)[];
        
        if (Sugar.Object.isArray(this.taskModule.runs)) {
            dependencies = this.taskModule.runs as (string|IDependency)[];
        }
        else {
            dependencies = await (this.taskModule.runs as DependsOnFn)(config);
        }

        assert.isArray(dependencies, `Expected dependencies of task ${this.taskName} to be an array of strings of dependency definition objects.`);

        return this.normalizeDependencies(dependencies);
    }

    //
    // Resolve dependencies for the task.
    //       
    async resolveDependencies(config: any): Promise<IDependency[]> {

        try {
            let resolvedDependencies = await this.establishDependencies(config);
            for (const dependency of resolvedDependencies) {
                dependency.resolvedTask = this.taskRunner.getTask(dependency.task);
                if (!dependency.resolvedTask) {
                    this.log.error(`Failed to resolve task named ${dependency.task}.`);
                }
            }
            
            resolvedDependencies = resolvedDependencies.filter(dependency => dependency.resolvedTask);
            
            return resolvedDependencies;
        }
        catch (err) {
            this.log.error('Exception while resolving dependencies for task: ' + this.getName() + "\r\n" + err.stack);
            throw err;
        }
    }

    //
    // Generate a key for caching.
    //
    genTaskKey(localConfig: any): string {
        return this.taskName + '_' + hash(localConfig);
    }

    //
    // Validate the task.
    //
    async validate(localConfig: any, globalConfig: any, tasksValidated: IBooleanMap): Promise<void> {

        var taskKey = this.genTaskKey(localConfig);
        if (tasksValidated[taskKey]) {
            // Skip tasks that have already been satisfied.
            this.log.verbose(`${this.taskName} already validated, hash key = ${taskKey}.`);
            return;
        }

        const taskConfig = Object.assign({}, globalConfig, localConfig);

        this.log.verbose(`Validating task ${this.taskName}, hash key = ${taskKey}.`);
        this.log.verbose(`Config: ${JSON.stringify(taskConfig, null, 4)}`);

        try {                        
            const resolvedDependencies = await this.resolveDependencies(taskConfig);
            for (const dependency of resolvedDependencies) {
                if (dependency.resolvedTask) {
                    await dependency.resolvedTask.validate(dependency.config || {}, taskConfig, tasksValidated);
                }
            }

            tasksValidated[taskKey] = true; // Make that the task has been validated.

            if (!this.taskModule) {
                return;
            }
        
            if (!this.taskModule.validate) {
                return;   
            }

            await this.taskModule.validate(taskConfig);
        }
        catch (err) {
            this.log.error(`Exception while validating task: ${this.taskName}.`);
            throw err;
        }
    }

    private makeIndent(indentLevel: number): string {
        let indentStr: string = "";
        if (indentLevel > 1) {
            indentStr += "│   ".repeat(indentLevel-1);
        }

        if (indentLevel > 0) {
            indentStr += "├──";
        }

        return indentStr;
    }

    //
    // Invoke the task.
    //
    async invoke(localConfig: any, globalConfig: any, tasksInvoked: IBooleanMap, taskResults: IResultMap, indentLevel: number): Promise<any> {

        var taskKey = this.genTaskKey(localConfig);
        if (tasksInvoked[taskKey]) {
            // Skip tasks that have already been satisfied.
            this.log.verbose(`${this.taskName} already completed, hash key = ${taskKey}.`);
            return taskResults[taskKey];
        }
       
        const taskConfig = Object.assign({}, globalConfig, localConfig);

        this.log.verbose(`Running task ${this.taskName}, hash key = ${taskKey}.`);
        this.log.verbose(`Config: ${JSON.stringify(taskConfig, null, 4)}`);

        let indentStr = this.makeIndent(indentLevel);
        if (indentStr.length > 0) {
            indentStr += " ";
        }
        this.log.task(`${indentStr}${this.taskName} ${JSON.stringify(localConfig)}`);

        const stopWatch = new Stopwatch();
        stopWatch.start();

        try {
            const resolvedDependencies = await this.resolveDependencies(taskConfig);
            for (const dependency of resolvedDependencies) {
                if (dependency.resolvedTask) {    
                    await dependency.resolvedTask.invoke(dependency.config || {}, taskConfig, tasksInvoked, taskResults, indentLevel+1);
                }
            }

            let result = undefined;

            if (!this.taskModule) {
                this.log.warn("Task not implemented: " + this.taskName);
            }
            else if (this.taskModule.invoke) {    
                result = await this.taskModule.invoke(taskConfig);    
                tasksInvoked[taskKey] = true;   // Track the task as invoked.
                taskResults[taskKey] = result;  // Cache it's output.
            }
            else {
                tasksInvoked[taskKey] = true;   // Track the task as invoked.
            }

            stopWatch.stop();
            this.log.task(this.makeIndent(indentLevel+1) + " completed : " + (stopWatch.read() * 0.001).toFixed(2) + " seconds");
        }
        catch (err) {
            this.log.error(this.makeIndent(indentLevel+1) + " failed");
            throw err;
        }
    }

    //
    // Make a string for indented output.
    //
    private makeTreeIndent(indentLevel: number): string {
        let output = "";
        while (indentLevel-- > 0) {
            output += "#";
        }

        return output;
    }

    //
    // Generate a tree for the tasks dependencies.
    //
    async genTree(indentLevel: number, localConfig: any, globalConfig: any): Promise<string> {
        let output = this.makeTreeIndent(indentLevel);
        output += this.getName();
        output += "\n";

        const taskConfig = Object.assign({}, globalConfig, localConfig);
        const resolvedDependencies = await this.resolveDependencies(taskConfig);
        for (const dependency of resolvedDependencies) {
            if (dependency.resolvedTask) {
                output += await dependency.resolvedTask.genTree(indentLevel+1, dependency.config || {}, taskConfig);
            }
        }

        return output;
    }
}
