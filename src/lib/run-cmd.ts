//
// This code orginally from here, but modified to fit my needs.
//
// https://www.npmjs.com/package/promised-exec
//

'use strict';

import { spawn, SpawnOptionsWithoutStdio } from 'child_process';
import { assert } from 'chai';
import { ILog } from './log';
import { log as globalLog } from '../index';

export interface IRunCmdResult {
    code: number;
    stdout: string;
    stderr: string;
}

export function runCmd(command: string, args?: string[], options?: SpawnOptionsWithoutStdio, injectedLog?: ILog): Promise<IRunCmdResult> {

    const log = injectedLog || globalLog;

    assert.isString(command, "Expected 'command' parameter to 'runCmd' function to be a string.");
    if (args) {
        assert.isArray(args, "Expected optional 'args' parameter to 'runCmd' function to be an array of strings.");
    }
    
    if (options) {
        assert.isObject(options, "Expected optional 'options' parameter to 'runCmd' function to be an object with configuration for 'spawn'.");
    }

    log.verbose("Running cmd: " + command + " " + (args || []).join(' '));

    return new Promise((resolve, reject) => {

        var stdout = '';
        var stderr = ''

        var cp = spawn(command, args || [], options);

        cp.stdout.on('data', data => {
            var str = data.toString();
            log.verbose(command + ':out: ' + str);
            stdout += str;
        });

        cp.stderr.on('data', data => {
            var str = data.toString();
            log.verbose(command + ':err: ' + str);
            stderr += str;
        });

        cp.on('error', err => {
            log.error(`Command failed: ${err.message}.`);
            log.warn("=== Command === ");
            log.warn(command + " " + (args || []).join(' '));
            log.warn("cwd is " + (options && options.cwd || "undefined"));
            log.warn("=== Stdout ===");            
            log.warn(stdout);
            log.warn("=== Stderr ===");
            log.warn(stderr);

            reject(err);
        });

        cp.on('exit', code => {
            if (code === 0) {
                resolve({
                    code: code,
                    stdout: stdout,
                    stderr: stderr,                        
                });
                return;
            }

            log.error(`Command exited with code ${code}.`);
            log.warn("=== Command === ");
            log.warn(command + " " + (args || []).join(' '));
            log.warn("cwd is " + (options && options.cwd || "undefined"));
            log.warn("=== Stdout ===");            
            log.warn(stdout);
            log.warn("=== Stderr ===");
            log.warn(stderr);

            reject(new Error(`Command failed with code ${code}.`));
        });
    });    
}

