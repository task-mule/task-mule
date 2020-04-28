'use strict';

import { argv } from 'yargs';
var confucious = require('confucious');
import * as path from 'path';
import * as fs from 'fs-extra';
import chalk from 'chalk';
var S = require('string');
var AsciiTable = require('ascii-table');
import { assert } from 'chai';
import { ILog, Log } from './lib/log';
import { IValidate, Validate } from './lib/validate';
import { loadTasks } from './lib/task-loader';
import { TaskRunner, ITaskRunner, ITaskRunnerCallbacks } from './lib/task-runner.js';
import * as Sugar from 'sugar';

export const log: ILog = new Log();
export const validate: IValidate = new Validate();
const taskRunner: ITaskRunner = new TaskRunner(log);

export { runCmd } from "./lib/run-cmd";

export async function runTask(taskName: string, config: any, configOverride: any): Promise<void> {
	await taskRunner.runTask(taskName, config, configOverride);
}

export interface IMuleConfiguration extends ITaskRunnerCallbacks {

	//
	// Options for configuring the build process.
	//
	options?: [string, string][];

	//
	// Examples of running the build process.
	//
	examples?: [string, string][];	

	//
	// Initialise build process.
	//
	init?: (config: any) => Promise<void>;

	//
	// Finalized the build process.
	//
	done?: (config: any) => Promise<void>;
}

//
// task-mule init
//
function commandInit(config: any): void {

	if (fs.existsSync(config.buildFilePath)) {
		log.error("Can't overwrite existing 'mule.js'.");
		process.exit(1);
	}

	// Auto create mule.js.
	var defaultBuildJs = path.join(__dirname, 'template', 'mule.js');
	fs.copySync(defaultBuildJs, config.buildFilePath);
	log.info("Created new 'mule.js' at " + config.buildFilePath);
	process.exit(0);
};

//
// task-mule create-task <task-name>
//
function commandCreateTask(config: any): void {

	var newTaskName = argv._[1];
	if (!newTaskName) {
		log.error("Task name not specified.");
		process.exit(1);
	}

	if (!S(newTaskName.toLowerCase()).endsWith(".js")) {
		if (newTaskName[newTaskName.length-1] === '.') {
			// Trim final period.
			newTaskName = newTaskName.substring(0, newTaskName.length-1);
		}
		
		// Auto add extension.
		newTaskName += ".js";
	}

	var newTaskFilePath = path.join(config.tasksDir, newTaskName);
	if (fs.existsSync(newTaskFilePath)) {
		log.error("Can't create task, file already exists: " + newTaskFilePath);
		process.exit(1);
	}

	var defaultTaskFile = path.join(__dirname, 'template', 'task.js');
	fs.copySync(defaultTaskFile, newTaskFilePath);
	log.info("Created new task file at " + newTaskFilePath);
}

//
// task-mule <task-name>
//
async function commandRunTask(config: any, buildConfig: IMuleConfiguration, requestedTaskName?: string): Promise<void> {

	loadTasks(config, log, taskRunner);	

	if (requestedTaskName) {
	    await taskRunner.runTask(requestedTaskName, confucious, {});
	}
	else if (argv.tasks) {
	    await taskRunner.resolveAllDependencies(confucious)

		taskRunner.listTasks();
		process.exit(1);
	} 
	else {
		throw new Error("Unexpected usage of task-mule.");
	}
};

//
// Display usage and help.
//
function displayHelp(buildConfig: IMuleConfiguration): void {

	log.info("Usage: task-mule <task-name> [options]\n");

	if (buildConfig.options) {
		var optionsTable = new AsciiTable('Options');
		optionsTable.setHeading('Options', 'Description');

		buildConfig.options.forEach((option: any) => {
			optionsTable.addRow(option[0], option[1]);
		});

		console.log(chalk.bold.green(optionsTable.toString()));
	}	

	if (buildConfig.examples) {
		var examplesTable = new AsciiTable('Examples');
		examplesTable.setHeading('What?', 'Command Line');
	
		buildConfig.examples.forEach((example: any) => {
			examplesTable.addRow(example[0], example[1]);
		});
	
		console.log(chalk.bold.green(examplesTable.toString()));
	}
};

async function main() {
	const config: any = {
		cwd: path.normalize(process.cwd()).replace(/\\/g, "/"),
	};

	config.buildFilePath = path.join(config.cwd, "mule.js");
	config.tasksDir = path.join(config.cwd, 'tasks');
	confucious.push(config);

	var requestedTaskName = argv._[0];
	if (requestedTaskName === 'init') {
		commandInit(config);
	}
	else if (requestedTaskName === 'create-task') {
		commandCreateTask(config);
	}
	else {
		if (!fs.existsSync(config.buildFilePath)) {
			log.error("'mule.js' not found, please run task-mule in a directory that has this file.");
			log.info("Run 'task-mule init' to create a default 'mule.js'.")
			process.exit(1);
		}

		if (!fs.existsSync(config.tasksDir)) {
			log.error("'tasks' directory doesn't exist.");
			log.info("Run 'task-mule create-task <task-name> to create your first task.");
			process.exit(1);
		}

		const buildConfigModule = require(config.buildFilePath);
		let buildConfig: IMuleConfiguration;
		if (Sugar.Object.isFunction(buildConfigModule)) {
			buildConfig = buildConfigModule();
		}
		else {
			buildConfig = buildConfigModule;
		}

		taskRunner.setCallbacks(buildConfig);		

		if (!requestedTaskName && !argv.tasks) {
			console.log(chalk.bold.red("Expected parameter: task-mule <task-name>"));
			console.log(chalk.bold.yellow("To list tasks: task-mule --tasks"));
			console.log();

			displayHelp(buildConfig);
			process.exit(1);
		}

		if (buildConfig.init) {
			assert.isFunction(buildConfig.init, "Expected mule.js 'init' callback to be a function.");
			await buildConfig.init(confucious);
		}
	
		try {
			await commandRunTask(config, buildConfig, requestedTaskName);
		}
		finally {
			if (buildConfig.done) {
				assert.isFunction(buildConfig.done, "Expected mule.js 'done' callback to be a function.");
				await buildConfig.done(confucious);
			}
		}
	}

	log.info("Task-Mule finished.");
};

main()
	.catch(err => {
		log.error("Task-Mule errorred.");
		log.error(err && err.message || err);
		if (err.stack) {
			log.error(err.stack);
		}
		process.exit(1);
	});