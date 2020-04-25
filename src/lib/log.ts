
import { argv } from 'yargs';
import chalk from 'chalk';

const enableVerbose = argv.verbose;
const noColors = argv.nocolors;

export interface ILog {
	error(msg: string): void;

	warn(msg: string): void;
	
	info(msg: string): void;

	verbose(msg: string): void;

	task (taskName: string): void;

}

export class Log implements ILog {
	error(msg: string): void {
		if (noColors) {
			console.error(msg);
		}
		else {
			console.error(chalk.bold.red(msg));
		}
	}

	warn(msg: string): void {
		if (noColors) {
			console.log(msg);
		}
		else {
			console.log(chalk.yellow(msg));	
		}
	}
	
	info(msg: string): void {
		if (noColors) {
			console.log(msg);
		}
		else {
			if (enableVerbose) {
				console.log(chalk.bold.green(msg));
			}
			else {
				console.log(chalk.green(msg));
			}
		}
	}

	verbose(msg: string): void {
		if (enableVerbose) {
			if (noColors) {
				console.log(msg);
			}
			else {
				console.log(chalk.green(msg));	
			}
		}
	}

	task (taskName: string): void {
		console.log(chalk.cyan(taskName));
	}
}

