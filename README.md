# Task-Mule

A task runner for complex build processes using [Node.js](https://nodejs.org/en/).

Why another task runner when we already have a gazillion? Surely one of [Grunt](http://gruntjs.com/), [Gulp](http://gulpjs.com/), [Webpack](https://webpack.js.org/) are good enough?

Sure, they are great for standard and fairly simple web pages. That's where you should start.

Turn to Task-Mule when you have a more complicated build process. Like for a game, VR application or cross-platform desktop application.

Task-Mule is the task runner for build processes with complex dependency chains. Got a load of tasks that depend on each in wierd and wonderful ways? 

Task-Mule allows you to build ["make files"](https://en.wikipedia.org/wiki/Makefile) in JavaScript. 

Need to get started, jump straight to [the quick start](#getting-started---ultra-quick).

Task-Mule is the build tool that powers [Data-Forge Notebook](https://www.data-forge-notebook.com/): a cross-platform notebook-style desktop application built on [Electron](https://www.electronjs.org/).

# Why Task-Mule?

So why Task-Mule? Task-Mule is a bit different. It is a task runner of course, but is not just for build scripts. It was designed for large automation jobs with complex dependencies between tasks.

Task-Mule was built for piece-meal testing of individual tasks. Each task can be tested from the command line (or test runner) with ease, even if those tasks will only ever be a dependency for other tasks in production.

Task-Mule relies on [npm](https://www.npmjs.com/). Install the dependencies you need via npm and then wire them into your script through tasks written in JavaScript.

# Features

- Create a build script or automation script in JavaScript.
- Define tasks in JavaScript and use whatever npm modules you like.
- Create hierarchies of tasks.
- Run a task and all its children.
- Testing individual tasks and sub-trees of tasks is easy.
- Color logging.
- Times the execution of tasks.
- Built-in support for running command line tools and retreiving their output.
- Uses async/await to support asynchronous tasks.
- The validation pass happens before any tasks are invoked (you'd like to know if you build script is badly configured as early as possible).
- Child tasks can be configured by their parent task.
- Child tasks can return output values to their parent task.

# Getting started - ultra quick

If you already have Node.js and are familiar with npm, here is the quick guide to getting started. If you need more explanation please skip to the following section.

Install task-mule for your build script:

    npm install --save-dev task-mule

Create your mule.js script:

    npx task-mule init

Create a task:

    npx task-mule create-task my-first-task

Edit *tasks/my-first-task.js* so that it does what you want.

Run the task:

    npx task-mule my-first-task
   
# Getting Started - the long version

## Installing Task-Mule

First up, make sure you have Node.js installed:    [https://nodejs.org/en/](https://nodejs.org/en/) 

Now open your terminal and change directory to your project. 

Create your package.json if you don't yet have one:

    npm init -y

Then install Task-Mule:

    npm install --save-dev task-mule

## Create your first script

Try running Task-Mule:

    npx task-mule

You should now see an error message saying *mule.js not found*. mule.js is the entry point for a Task-Mule script, similar to *Gruntfile* (for Grunt) or *gulpfile.js* (for Gulp).

Generate a default *mule.js* as follows:

    npx task-mule init

This creates a template *mule.js* that you can fill out. You don't actually have to put anything in this file, but you can put event handlers here if you need for:
- build script initialisation;
- build script completion; 
- callbacks for particular tasks; and
- handling unhandled errors.

## Creating your first task

Run task-mule now:

    npx task-mule

You'll see an error message indicating that you don't have a *tasks* directory. Each Task-Mule *task* lives in its own JavaScript file under the *tasks* directory.

Run the following command to create the *tasks* directory and your first task:

    npx task-mule create-task my-first-task

This has created the *tasks* directory and a file called *my-first-task.js*. Open this file and you'll see a template for the basic [layout of a task](#task-layout).

Let's add a simple log message to the invoke function so we can see it running. Find the invoke function and add some logging like this:

```javascript
log.info("Hello Task-Mule!");
```

The entire first task (with superflous declarations and comments stripped) looks like this:

```javascript
module.exports = {
    description: "A first task mule task!",
    
    invoke: async config => {
        console.log("Hello Task-Mule!");      
    },
};
```

The `invoke` function contains JavaScript that executes your task. Note that it's an `async` function. You can run async code here, like downloading files or hitting REST APIs or a database.

## Running your task

Now run your first task like this:

    npx task-mule my-first-task

You should see some output like this:

```
> npx task-mule my-first-task
my-first-task {}
Hello Task-Mule!
├── completed : 0.00 seconds
Task-Mule finished.
```

Note that the output tells you how long the task took to complete. This trivial task is over so quickly it doesn't even register!

## Adding a child task

Let's create another trivial task to illustrate a child task:

    npx task-mule create-task my-child-task

This generates the file *my-child-task.js* under the *tasks* directory. Add some logging to the invoke function so you know that the new task gets invoked:

```javascript
console.log("Hello from child task!");
```

Now let's add this as a child to the first task using the `runs` field as follows:

```javascript
module.exports = {
    description: "My first task!",

    runs: [
        "my-child-task",
    ],
    
    invoke: async config => {
        console.log("Hello Task-Mule!");      
    },
};
```

Now run your first task again: 

    npx task-mule my-first-task

You'll see the both tasks are executed in the right order:

```
> npx task-mule my-first-task
my-first-task {}
├── my-child-task {}
Hello from child task!
│   ├── completed : 0.00 seconds
Hello Task-Mule!
├── completed : 0.01 seconds
Task-Mule finished.
```

Using the `runs` field allows you to build up complex graphs of tasks.

Each task can have as many children as you need, so instead of just this: 

```javascript
    runs: [
        "my-child-task",
    ],
```

A complex build script will have many more tasks:

```javascript
    runs: [
        "child1-task",
        "child2-task",
        "child3-task",
        // and so on, as many as you want
    ],
```

## Listing tasks

You can list your hierarchy of tasks like this:

    npx task-mule --tasks

The output shows you how your tasks are nested:

```
tasks
├─ my-child-task
└─ my-first-task
   └─ my-child-task
```

## Configuring an npm script

You can run any task by name. Typically though you'll have some root or main task that encapsulates your entire build process. You might call it `build.js` or something similar.

For convenience you should add an npm script for it in your package.json file as follows:

```json
{
  "name": "task-mule-test",
  "scripts": {
    "build": "npx task-mule build"
  },
  "devDependencies": {
    "task-mule": "^2.0.0"
  }
}
```

Now you can run your build process like this:

    npm run build

That's a bit shorter and it's also easier to remember. 

It's easier to remember because you can always check package.json to remind yourself!

## Task configuration

Any task can accept configuration options. As an example let's make our child task from earlier take a message as input and then print it.

Configuration is supplied by a plain old JavaScript object, like this: 

```javascript
module.exports = {
    description: "A child task!",
    
    validate: async config => {
        if (!config.msg) {
            throw new Error("Child task requires a 'msg' config field.");
        }
    },

    invoke: async config => {
        console.log(config.msg);
    },
};
```

The `validate` function is called by Task-Mule and it's here that you can check that the right configuration has been provided. Task-Mule has separate phases for validation and execution, typically execution is expensive and takes a long time so having a separate validation phase that happens first allows you to find configuration problems much more quickly.

In the `invoke` function you can access the `config` object to get your configuration, such as the `msg` field demonstrated here. You can have whatever fields and values you need in the `config` object, you just have to make sure you pass in the right options from the parent task.

Now we'll go back to the first task and add configuration for the child task. 

Instead of just having a simple list of child tasks like this:

```javascript
    runs: [
        "my-child-task",
    ],
```

Now we'll change it to this to set the configuration for the child task:

```javascript
    runs: [
        {
            task: "my-child-task",
            config: {
                msg: "Some great message!",
            },
        },
    ],
```

Now run your first task again:

    npx task-mule my-first-task

You should see that your configuration is passed through to the child task:

```
> npx task-mule my-first-task
my-first-task {}
├── my-child-task {msg = "Some great message!"}
Some great message!
│   ├── completed : 0.00 seconds
Hello Task-Mule!
├── completed : 0.01 seconds
Task-Mule finished.
```

## Task output

Tasks can return results, for example the child task might look like this:

```javascript
    invoke: async config => {
        return {
            msg: "Hello from the child task!",
        };
    },
```

A parent task can retrieve the output from a child by running it explicitly using the `runTask` function:

```javascript
module.exports = {
    description: "A first task mule task!",

    runs: [
        "my-child-task",
    ],
    
    invoke: async config => {
        const { msg } = await runTask("my-child-task", config);
        console.log(msg);
    },
};
```

Now we are now running the child task directly using `runTask` and can get the results returned by that task. Note that the configuration is passed through to `runTask`, this must be done to preserve the configuration of your build script.

## Failing a task

Tasks are failed simply by throwing an exception, for example:

```javascript
    invoke: async config => {
        // ...
        if (somethingBadHappens) {
            throw new Error("Somethign went wrong.");
        }
        // ...
    },
```

## Invoking a system command

Task-Mule includes a helper function `runCmd` to run system commands and marshal the results back into the build script. 

In this example we'll run the command `hg id --num` which determines the current revision number of the [*Mercurial*](https://en.wikipedia.org/wiki/Mercurial) [repository](https://en.wikipedia.org/wiki/Repository_(version_control)) we happen to be. This kind of thing is useful in build scripts because you often want to *stamp* the number of the current code revision into the build somehow. 

```javascript
const { runCmd } = require("task-mule");

//...
    invoke: async config => {
        var cmd = 'hg';
        var args = ['id', '--num'];
        const cmdResult = await runCmd(cmd, args);
        var versionNo = parseInt(cmdResult.stdOut.trim());
        return {
            version: versionNo, // Return result to parent script.
        };
    },
// ...
```

Yes I used to use Mercuial and am sad to see it fading from existance.

### Validation

Can you use the Task-Mule's `validate` helper to validate your configuration:

```javascript
const { validate } = require("task-mule");

module.exports = {
    validate: async config => {
        validate.config(config, 'aNecessaryField');
    },

    invoke: async config => {
        // ... run the task ... 
    },
};
```

The validate helper has other useful functions to check for the existance of files and directories.

## *mule.js* layout

*mule.js* is the Task-Mule build script entry point. 

You can create a new *mule.js* from the template by running the following commmand in the directory for your script:

    npx task-mule init

Technically it's not necessary to modify *mule.js* in any way to create and run tasks. You can just simply create and edits *task* files in the *tasks* directory and then run those tasks using the following command:

    npx task-mule <some-task-name>

However if you want to make custom initialisation, event handling or more, you'll need to edit *mule.js*.

Creating a new *mule.js* will give you the following template, which has stubs for you to fill out and comments for explanation:

```javascript    
module.exports = {
    //
    // Describes options to the system.
    // Fill this out to provide custom help when 'task-mule --help' 
    // is executed on the command line.
    //
    options: [
        ['--some-option', 'description of the option'],
        ['--another-option', 'description of the option'],
    ],

    //
    // Examples of use.
    // Fill this out to provide custom help when 'task-mule --help' 
    // is executed on the command line.
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
```

## Task-Mule file system structure

A Task-Mule automation script is structured in the file system as follows:

    my-script/
        node-modules/
            task-mule/                    -> Locally installed Task-Mule 
            ... other npm packages ...       
        mule.js                            -> Task mule entry point.
        tasks/                            -> Directory that contains the tasks.
            task1.js                    -> Each task lives in it's own file 
            task2.js                       and is named after that file.
            subdir/
                nested-task.js             -> Tasks can even be nested under sub-directories
                                           to help group and organise your tasks.
        some-other-file.js                -> Include any other JavaScript files and require
                                           them into your script.

## Task layout

Run the following command to create a new task with the default layout:

    task-mule create-task <new-task-name>

This creates a new task file in the tasks directory with the following *new-task-name.js*.

The default task layout looks like this:

```javascript
const { runCmd, runTask, validate, log } = require("task-mule");

module.exports = {
    description: "<description of your task>",
    
    // Tasks that this one depends on (these tasks will run before this one).
    runs: [
        // ... list of dependencies ...
    ], 

    // Can also use a function for "runs" like this ...
    /*
    runs: async config => {
        return [
            // ... list of dependencies ...
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
```

## Task dependencies

There are several ways to specify the child of a task.

The simplest an array of task names:

```javascript
    runs: [
        "dependency-task-1",
        "dependency-task-2",
        "and-so-on",
    ],
```

You can pass configuration to child task using the object format:

```javascript
    runs: [
        "dependency-task-1",
        {
            task: "dependency-task-2",
            config: {
                // ... parameters to this task ...
            },
        },
        "and-so-on",
    ],
```

You can also use a function to dynamically generate the list of child tasks:

```javascript
    runs: async config => {
        return [
            "dependency-task-1",
            "dependency-task-2",
            "and-so-on",
        ];
    },
```

This gives you advanced possibilities to conditionally configure the child tasks to be invoked.

For example, we conditionally enable a *clean build* something like this:

```javascript
    runs: async config => {
        var tasks = [];
        if (config.clean) {
            // Only delete previous buid output when the 'clean' option is used. 
            task.push("delete-the-build-output");
        }

        tasks.push("build-the-code");
        return tasks;
    },
```

This kind of thing allows you to conditionally modify dependencies via the command line, the *clean* option for example is used like this:

    task-mule do-the-build --clean

## Task execution order

When a task is requested to be executed, either from the command line or as a dependency of some other task, it's dependencies will run first in the order specified by the task's `runs` function.

For example, consider *task-A*:

```javascript
module.exports = {
    runs: [
        "dependency1",
        "dependency2",
    ], 

    invoke: async config => {
        // ... do the action of the task ...
    },
};
```

The order of tasks invoked is as follows:

1. dependency1
2. dependency2
3. task-A

When dependencies have sub-dependencies, the sub-dependencies are run in the order specified before the dependency is executed.

For example, say *dependency1* from the previous example has dependencies *sub-dependency1* and *sub-dependency-2* and *dependency2* has *sub-dependency3* and *sub-dependency-4*, then the order of task is as follows:

1. sub-dependency1
2. sub-dependency2
3. dependency1
4. sub-dependency3
5. sub-dependency4
6. dependency2
7. task-A

What is being done here is a *[depth-first post-order traversal](https://en.wikipedia.org/wiki/Tree_traversal#Depth-first_search)* of the task tree, executing each task as each node in the tree is visited.

## Task failure

Failure of a task is triggered by any of the following events that occur in any of the task's functions:

- An exception is thrown;
- The returned promise is rejected; or
- An unhandled exception occurs while a task is running.

When a task fails all further processing by the task is aborted. In addition execution of subsequent tasks are are also aborted. We can say that task failure *short-circuits* out of the sequence of tasks.

Consider the example sequence of tasks from the previous section. Let's say *sub-dependency3* fails. None of the tasks after *sub-dependency3* will run in this case:

1. (**success**) sub-dependency1
2. (**success**) sub-dependency2
3. (**success**) dependency1
4. (**fails and aborts**) sub-dependency3
5. (**never runs**) sub-dependency4
6. (**never runs**) dependency2
7. (**never runs**) task-A

Note that tasks have already run, everything before *sub-dependency3* has already run and so are not effected by the failure of *sub-dependency3*.

## Task validation

Tasks are validated via the `validate` function.

```javascript
module.exports = {
    validate: async config => {
        // ... validate input to the task ...

        //
        // To fail the task: throw an exception or return a rejected promise.
        //
    },

    invoke: async config => {
        // ... do the action of the task ...
    },
};
```

To fail a task throw an exception or return a *rejected* promise. 

Validation for a sequence of tasks is run before any of the tasks are *invoked*. This allows the entire automation script to quickly check that it's configuration and inputs are correct before it does any work. The reason for this is to have quick feedback. No one likes to have to wait for a significant amount of time (say while a build is running) before the script fails due to a configuration or input error. So validation runs first for all tasks that will be invoked. This ensure the script will fail fast when there is a user error.

## More on running commands

Use `runCmd` to invoke a command, executable or batch file. An example is presented earlier in this documentation. `runCmd` returns a promise, so it works well with Task-Mule tasks.

`runCmd` is simply for convenience. It is built on the Node.js `spawn` function and is setup to redirect standard output and standard error to Task-Mule output. This output is only displayed either when the *--verbose* command line option is used or when an error occurs.  

The promise returned by `runCmd` is resolved when the process being run has finished. By default the promise is rejected if the process completes with an error code. 

The options that are passed to `runCmd` are also passed to `spawn`, so `runCmd` accepts all the same options as `spawn`.

You don't have to use `runCmd`. Feel free to [Node.js process functions](https://nodejs.org/api/child_process.html) directly or whatever other functions will do the job for you. Just remember that you will need to *promisify* any asynchronous operations.

