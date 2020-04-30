"use strict";

module.exports = function (log) {
    
    return {
        
        description: "test3",
        
        runs: [
            "test1",
            "test2",
        ], 

        validate: async config => {
            console.log('Validate test3');
        },
        
        invoke: async config => {
            console.log('Invoke test3');

            console.log('foo: ' + config.get('foo'));
        },
    };
};