'use strict';

var argv = require('yargs').argv;
var conf = require('confucious');
var path = require('path');
var fs = require('fs-extra');
var chalk = require('chalk');
var validate = require('./validate');
var S = require('string');
var AsciiTable = require('ascii-table');
var assert = require('chai').assert;
var loadTasks = require('./task-loader')
var JobRunner = require('./job-runner');
var log = require('./log')(argv.verbose, argv.nocolors);

//
// task-mule init
//
var commandInit = function (config) {

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
var commandCreateTask = function (config) {

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
};

//
// Init config prior to running or listing tasks.
//
var initConfig = function (config, buildConfig, log) {

	assert.isObject(config);
	assert.isObject(buildConfig);
	assert.isFunction(log.error);
	assert.isFunction(log.info);
	assert.isFunction(log.warn);
	assert.isFunction(log.verbose);

	var defaultConfigFilePath = path.join(config.workingDirectory, 'config.json');
	if (fs.existsSync(defaultConfigFilePath)) {

		log.verbose("Loading config from file: " + defaultConfigFilePath);

		conf.pushJsonFile(defaultConfigFilePath);
	}

	conf.pushEnv();

	if (config.defaultConfig) {
		conf.push(config.defaultConfig)
	}

	if (buildConfig.initConfig) {
		buildConfig.initConfig();
	}

	conf.pushArgv();

	buildConfig.init();

	return buildConfig;
};

//
// task-mule <task-name>
//
var commandRunTask = function (config, buildConfig, log, requestedTaskName) {

	assert.isObject(config);
	assert.isObject(buildConfig);
	assert.isFunction(log.error);
	assert.isFunction(log.info);
	assert.isFunction(log.warn);

	initConfig(config, buildConfig, log);

	var taskRunner = loadTasks(config, log, validate);
	var jobRunner = new JobRunner(taskRunner, log, buildConfig);

	if (requestedTaskName) {
	    return jobRunner.runTask(requestedTaskName, conf, {})
            .catch(function (err) {
                
                log.error('Build failed.');
                
                if (err.message) {
                    log.warn(err.message);
                }

                if (err.stack) {
                    log.warn(err.stack);
                }
                else {
                    log.warn('no stack');
                }
				
				if (!config.noExit) {
                	process.exit(1);
				}
				
				runDoneCallback(buildConfig);

                throw err;
            })
	        .then(function () {
				runDoneCallback(buildConfig);
            });
	}
	else if (argv.tasks) {
	    return taskRunner.resolveAllDependencies(conf)
	    	.then(function () {
			    taskRunner.listTasks();
			    process.exit(1);
			});
	} 
	else {
		throw new Error("Unexpected usage of task-mule.");
	}
};

//
// Run config done callback.
//
var runDoneCallback = function (buildConfig) {

	if (buildConfig.done) {
		assert.isFunction(buildConfig.done);
		buildConfig.done();
	}
}

//
// Display usage and help.
//
var displayHelp = function (buildConfig, log) {

	log.info("Usage: task-mule <task-name> [options]\n");

	var optionsTable = new AsciiTable('Options');
	optionsTable
		.setHeading('Options', 'Description');

	buildConfig.options.forEach(function (option) {
		optionsTable.addRow(option[0], option[1]);
	});

	console.log(chalk.bold.green(optionsTable.toString()));

	var examplesTable = new AsciiTable('Examples');
	examplesTable.setHeading('What?', 'Command Line');

		buildConfig.examples.forEach(function (example) {
		examplesTable.addRow(example[0], example[1]);
		});

	console.log(chalk.bold.green(examplesTable.toString()));
};

async function main() {
	const config = {
		workingDirectory: process.cwd(),
	};

	config.buildFilePath = path.join(config.workingDirectory, "mule.js");
	config.tasksDir = path.join(config.workingDirectory, 'tasks');

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

		var buildConfig = require(config.buildFilePath)(conf, validate);

		global.runCmd = require('./run-cmd')(log);

		if (!requestedTaskName && !argv.tasks) {
			console.log(chalk.bold.red("Expected parameter: task-mule <task-name>"));
			console.log(chalk.bold.yellow("To list tasks: task-mule --tasks"));
			console.log();

			displayHelp(buildConfig, log);
			process.exit(1);
		}

		await commandRunTask(config, buildConfig, log, requestedTaskName);
	}
};

main()
	.then(() => {
		log.info("Task-Mule finished.");		
	})
	.catch(err => {
		log.error("Task-Mule errorred.");
		log.error(err && err.message || err);
		if (err.stack) {
			log.error(err.stack);
		}
		process.exit(1);
	});