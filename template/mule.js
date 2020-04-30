
'use strict';

// ... load npm modules here ...

module.exports = {
	//
	// Describes options to the system.
	// Fill this out to provide custom help when 'task-mule --help' is executed on the command line.
	//
	options: [
		['--some-option', 'description of the option'],
		['--another-option', 'description of the option'],
	],

	//
	// Examples of use.
	// Fill this out to provide custom help when 'task-mule --help' is executed on the command line.
	//
	examples: [
		['Example 1', 'An example command line'],
		['Example 2', 'An example command line'],
	],

	init: async config => {
		// ... custom initialisation code here ... 
	},

	unhandledException: err => {
		// ... callback for unhandled exceptions thrown by your tasks ...
	},

	taskStarted: async taskName => {
		// ... callback for when a task has started (not called for dependencies) ...
	},

	taskSuccess: async taskName => {
		// ... callback for when a task has succeeed (not called for dependencies) ...
	},

	taskFailure: async (taskName, err) => {
		// ... callback for when a task has failed (not called for dependencies) ...
	},

	taskDone: async taskName => {
		// ... callback for when a task has completed, either failed or succeeed (not called for dependencies) ...
	},

	done: async config => {
		// ... callback for when all tasks have been completed, either failed or succeeded ...
	},
};
