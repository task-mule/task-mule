
'use strict';

// ... load npm modules here ...

module.exports = (config) => {

	return {
		//
		// Describes options to the system.
		// Fill this out to provide custom help when 'task-mule --help' is executed on the command line.
		//
		options: [
			['--some-option', 'description of the option'],
		],

		//
		// Examples of use.
		// Fill this out to provide custom help when 'task-mule --help' is executed on the command line.
		//
		examples: [
			['What it is', 'example command line'],
		],

		initConfig: () => {
			// ... setup default config here ...
		},

		init: () => {
			// ... custom initialisation code here ... 
		},

		unhandledException: (err) => {
			// ... callback for unhandled exceptions thrown by your tasks ...
		},

		taskStarted: async (taskInfo) => {
			// ... callback for when a task has started (not called for dependencies) ...
		},

		taskSuccess: async (taskInfo) => {
			// ... callback for when a task has succeeed (not called for dependencies) ...
		},

		taskFailure: async (taskInfo) => {
			// ... callback for when a task has failed (not called for dependencies) ...
		},

		taskDone: async (taskInfo) => {
			// ... callback for when a task has completed, either failed or succeeed (not called for dependencies) ...
		},

		done: () => {
			// ... callback for when all tasks have been completed, either failed or succeeded ...
		}
	};
};