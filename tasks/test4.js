"use strict";

module.exports = function (log) {
    
    return {
        
        description: "test4",
        
        dependsOn: [
            "test2", 
            {
                task: "test3",
            },
            {
                task: "test3",
            },            
        ], 

        validate: async config => {
            console.log('Validate test4');
        },
        
        invoke: async config => {
            console.log('Invoke test4');
        },
    };
};