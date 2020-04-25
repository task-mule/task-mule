'use strict';

import * as fs from 'fs';

export interface IValidate {
    config(config: any, name: string): any;

    directoryExists(path: string): void;

    fileExists(path: string): void;    
}

export class Validate implements IValidate {
    config(config: any, name: string): any {
        var value = config.get(name);
        if (!value) {
            throw new Error('Configuration option not set: ' + name);
        }
        return value;
    }

    directoryExists(path: string): void {
        if (!fs.existsSync(path)) {
            throw new Error('Path not found: ' + path);
        }

        var stat = fs.lstatSync(path);
        if (!stat.isDirectory()) {
            throw new Error('Path is not a directory: ' + path);	
        }
    }

    fileExists(path: string): void {
        if (!fs.existsSync(path)) {
            throw new Error('Path not found: ' + path);
        }

        var stat = fs.lstatSync(path);
        if (stat.isDirectory()) {
            throw new Error('Path is a directory: ' + path);	
        }
    }
}


