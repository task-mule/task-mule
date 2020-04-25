import { ITaskRunner } from "./task-runner";
import { ILog } from "./log";

import { assert } from 'chai';
var S = require('string');
var Stopwatch = require('statman-stopwatch');
import * as Sugar from 'sugar';
var util = require('util');
var hash = require('./es-hash');

//
// Represents a dependency of a task.
//
export interface IDependency {
    //
    // Name of the task.
    //
    task: string;

    //
    // Configure function for the dependency.
    //
    configure?: (config: any) => Promise<void>;

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
    private module: any;

    constructor(taskName: string, relativeFilePath: string, fullFilePath: string, log: ILog, taskRunner: ITaskRunner) {
        this.taskName = taskName;
        this.relativeFilePath = relativeFilePath;
        this.fullFilePath = fullFilePath;
        this.log = log;
        this.taskRunner = taskRunner;
       
        if (S(fullFilePath).endsWith(".js")) {
            var moduleLoadFunction = require(fullFilePath);
            if (!moduleLoadFunction || 
                !Sugar.Object.isFunction(moduleLoadFunction)) {
                    
                throw new Error('Task module ' + fullFilePath + ' should export a function.');
            }
            else {
                this.module = moduleLoadFunction(log, taskRunner);
            }
        }
    }

    //
    // The name of this task.
    //
    getName(): string {
        return this.taskName;
    }

    //
    // Gets the tasks that this task depends on.
    // Returns a promise, just in case the task needs some time to figure out it's dependencies.
    //
    private async establishDependencies(config: any): Promise<any[]> {
        assert.isObject(config);

        if (!this.module) {
            return [];
        }

        if (!this.module.dependsOn) {
            return [];
        }
        
        var dependencies;
        
        if (Sugar.Object.isFunction(this.module.dependsOn)) {
            dependencies = this.module.dependsOn(config);
        }
        else {
            dependencies = this.module.dependsOn;
        }

        //
        // Normalize dependencies.
        //
        function normalizeDependencies(dependencies: any[]): IDependency[] {

            // Normalize dependencies.
            return dependencies
                .map(dependency => {                                    
                    if (util.isObject(dependency)) {
                        return dependency;
                    }
                    else {
                        assert.isString(dependency, "Expected dependency to be a string that names another task.");

                        return { 
                            task: dependency,
                        };
                    }
                });
        };

        if (util.isFunction(dependencies.then)) {
            dependencies = await dependencies;
        }

        return normalizeDependencies(dependencies);
    }

    //
    // Resolve dependencies for the task.
    //       
    async resolveDependencies(config: any): Promise<void> {

        try {
            this.resolvedDependencies = await this.establishDependencies(config);
            for (const dependency of this.resolvedDependencies) {
                dependency.resolvedTask = this.taskRunner.getTask(dependency.task);
            }

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
    // Validate the task.
    //
    async validate(configOverride: any, config: any, tasksValidated: IBooleanMap): Promise<any> { //TODO: Does this really need to return something?

        var taskName = this.getName();
        var taskKey = taskName + '_' + hash(configOverride);
        if (tasksValidated[taskKey]) { //todo: include the hash code here for the task and it's configuration.
            // Skip tasks that have already been satisfied.
            return;
        }

        config.push(configOverride);

        //
        // Run sequential dependencies.
        //
        await this.configure(config) //todo: rename this to 'setup', but probably will want a cleanup as well!!

        for (const dependency of this.resolvedDependencies) {
            const configOverride = dependency.configure 
                && await dependency.configure(config)
                || {};
            if (dependency.resolvedTask) {
                await dependency.resolvedTask.validate(configOverride, config, tasksValidated);
            }
        }

        tasksValidated[taskKey] = true; // Make that the task has been invoked.

        if (!this.module) {
            return;
        }
        else if (!this.module.validate) {
            return;   
        }

        try {                        
            return await this.module.validate(config);
        }
        catch (err) {
            this.log.error("Exception while validating task: " + taskName);
            throw err;
        }
        finally {
            config.pop(); // Restore previous config.
        }
    }

    //
    // Configure the task.
    //
    async configure(config: any): Promise<any> { //TODO: Does this really need to return something?
        if (this.module.configure) {
            return await this.module.config(config);
        }
    }

    //
    // Invoke the task.
    //
    async invoke(configOverride: any, config: any, tasksInvoked: IBooleanMap): Promise<void> {

        const taskName = this.getName();
        const taskKey = taskName + '_' + hash(configOverride);
        if (tasksInvoked[taskKey]) {
            // Skip tasks that have already been satisfied.
            return;
        }

        config.push(configOverride);

        //
        // Run sequential dependencies.
        //
        await this.configure(config); //todo: rename this to 'setup' 
        for (const dependency of this.resolvedDependencies) { //TODO: REPEATED CODE
            const configOverride = dependency.configure  //TODO: DOES IT REALLY NEED TO BE CONFIGURED HERE AND DURING VALIDATION?
                && await dependency.configure(config)
                || {};
            if (dependency.resolvedTask) {                
                await dependency.resolvedTask.invoke(configOverride, config, tasksInvoked);
            }
        }

        tasksInvoked[taskKey] = true; // Make that the task has been invoked.

        if (!this.module) {
            this.log.warn("Task not implemented: " + taskName);
            return;
        }
        else if (!this.module.invoke) {
            return;   
        }

        this.log.info(taskName);

        const stopWatch = new Stopwatch();
        stopWatch.start();

        try {
            const result = await this.module.invoke(config);

            stopWatch.stop();
            this.log.info(taskName + " completed : " + (stopWatch.read() * 0.001).toFixed(2) + " seconds");
            return result;
        }
        catch (err) {
            stopWatch.stop();
            this.log.error(taskName + " failed : " + (stopWatch.read() * 0.001).toFixed(2) + " seconds");
            throw err;
        }
        finally {
            config.pop(); // Restore previous config.
        }
    }

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
};

module.exports = Task;
