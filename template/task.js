"use strict";

const { runCmd, runTask, validate, log } = require("task-mule");

module.exports = {
    description: "<description of your task>",
    
    // Tasks that this one depends on (these tasks will run before this one).
    runs: [
        // ... list of dependencies ...
    ], 

    // Can also use a function for depends on like this ...
    /*
    runs: async config => {
        return [
            /// ... list of dependencies ...                
        ];
    },
    */

    //
    // Validate configuration for the task.
    // Throw an exception to fail the task.
    //
    validate: async config => {
        // ... validate input to the task ...
    },

    //
    // Invoke the task. Peform the operations required of the task.
    // Return a promise for async tasks.
    // Throw an exception or return a rejected promise to fail the task.
    //
    invoke: async config => {
        // ... do the action of the task ...
    },
};