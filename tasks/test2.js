"use strict";

module.exports = function (log) {
    
    return {
        
        description: "test2",
        
        dependsOn: [
            {
                task: 'test1',
            },
        ], 

        validate: async config => {
            console.log('Validate test2');
        },
        
        invoke: async config => {
            console.log('Invoke test2');
        },
    };
};