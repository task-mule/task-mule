"use strict";

module.exports = function (log) {
    
    return {
        
        description: "test1",
        
        dependsOn: [], 

        validate: async config => {
            console.log('Validate test1');
        },
        
        invoke: async config => {
            console.log('Invoke test1');
        },
    };
};