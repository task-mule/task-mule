import { TaskRunner } from "../../lib/task-runner";

describe('TaskRunner', () => {

	it("getting task when none added throws", () => {

        const mockLog: any = {};
        const testObject = new TaskRunner(mockLog);
        
        expect(() => testObject.getTask("test-task")).toThrow();
    });


	it("can get task that was added", () => {

        const mockLog: any = {};
        const testObject = new TaskRunner(mockLog);
        
        const taskName = "test-task";
        const mockTask: any = {
            getName: () => taskName,
        };
        testObject.addTask(mockTask);

        expect(testObject.getTask("test-task")).toBe(mockTask);
    });

	it("can get task that wasnt added", () => {

        const mockLog: any = {};
        const testObject = new TaskRunner(mockLog);
        
        const taskName = "test-task";
        const mockTask: any = {
            getName: () => taskName,
        };
        testObject.addTask(mockTask);

        expect(() => testObject.getTask("bad-task")).toThrow();
    });
    
    it('can run task', async () => {

        const mockLog: any = {};
        const testObject = new TaskRunner(mockLog);
        
        const taskName = "test-task";
        const mockTask: any = {
            getName: () => taskName,
            validate: jest.fn(),
            invoke: jest.fn(),
        };
        testObject.addTask(mockTask);

        const configOverride = {};
        const mockConfig = {};
        await testObject.runTask("test-task", mockConfig, configOverride);

        expect(mockTask.validate).toHaveBeenCalledWith(configOverride, mockConfig, {});
        expect(mockTask.invoke).toHaveBeenCalledWith(configOverride, mockConfig, {}, {}, 0);
    });

    it("exception is propagated from failed task invocation", async () => {

        const mockLog: any = {};
        const testObject = new TaskRunner(mockLog);

        const error = new Error("Bad task");
        
        const taskName = "test-task";
        const mockTask: any = {
            getName: () => taskName,
            resolveDependencies: () => {},
            validate: () => {},
            invoke: async () => {
                throw error;
            }
        };
        testObject.addTask(mockTask);

        const configOverride = {};
        const mockConfig = {};
        await expect(() => testObject.runTask("test-task", mockConfig, configOverride))
            .rejects
            .toThrow();
    });

    it("exception is propagated from failed task validation", async () => {

        const mockLog: any = {};
        const testObject = new TaskRunner(mockLog);

        const error = new Error("Bad task");
        
        const taskName = "test-task";
        const mockTask: any = {
            getName: () => taskName,
            resolveDependencies: () => {},
            validate: async () => {
                throw error;
            },
        };
        testObject.addTask(mockTask);

        const configOverride = {};
        const mockConfig = {};
        await expect(() => testObject.runTask("test-task", mockConfig, configOverride))
            .rejects
            .toThrow();
    });

    it("exception is propagated from failed dependency resolution", async () => {

        const mockLog: any = {};
        const testObject = new TaskRunner(mockLog);

        const error = new Error("Bad task");
        
        const taskName = "test-task";
        const mockTask: any = {
            getName: () => taskName,
            resolveDependencies: async () => {
                throw error;
            },
        };
        testObject.addTask(mockTask);

        const configOverride = {};
        const mockConfig = {};
        await expect(() => testObject.runTask("test-task", mockConfig, configOverride))
            .rejects
            .toThrow();
    });

    it("running succeeded task invokes user callbacks", async () => {

        const mockLog: any = {};
        const testObject = new TaskRunner(mockLog);

        const mockCallbacks: any = {
            taskStarted: jest.fn(),
            taskSuccess: jest.fn(),
            taskDone: jest.fn(),
        };
        testObject.setCallbacks(mockCallbacks);
        
        const taskName = "test-task";
        const mockTask: any = {
            getName: () => taskName,
            resolveDependencies: jest.fn(),
            validate: jest.fn(),
            invoke: jest.fn(),
        };
        testObject.addTask(mockTask);

        const configOverride = {};
        const mockConfig = {};
        await testObject.runTask("test-task", mockConfig, configOverride);

        expect(mockCallbacks.taskStarted).toHaveBeenCalledWith("test-task");
        expect(mockCallbacks.taskSuccess).toHaveBeenCalledWith("test-task");
        expect(mockCallbacks.taskDone).toHaveBeenCalledWith("test-task");
    });

    it("running failed task invokes user callbacks", async () => {

        const mockLog: any = {};
        const testObject = new TaskRunner(mockLog);

        const mockCallbacks: any = {
            taskStarted: jest.fn(),
            taskFailure: jest.fn(),
            taskDone: jest.fn(),
        };
        testObject.setCallbacks(mockCallbacks);

        const error = new Error("Bad task");
        
        const taskName = "test-task";
        const mockTask: any = {
            getName: () => taskName,
            resolveDependencies: jest.fn(),
            validate: jest.fn(),
            invoke: async () => {
                throw error;
            },
        };
        testObject.addTask(mockTask);

        const configOverride = {};
        const mockConfig = {};
        await expect(() => testObject.runTask("test-task", mockConfig, configOverride))
            .rejects
            .toThrow();

        expect(mockCallbacks.taskStarted).toHaveBeenCalledWith("test-task");
        expect(mockCallbacks.taskFailure).toHaveBeenCalledWith("test-task", error);
        expect(mockCallbacks.taskDone).toHaveBeenCalledWith("test-task");
    });

    it("fails to run task when task doesnt exist", async () => {

        const mockLog: any = {};
        const testObject = new TaskRunner(mockLog);
        
        await expect(() => testObject.runTask("test-task", {}, {})).rejects.toThrow();
    });

    it("can run task and get result", async () => {
        const mockLog: any = {};
        const testObject = new TaskRunner(mockLog);
        
        const taskName = "test-task";
        const someResult = {};
        const mockTask: any = {
            getName: () => taskName,
            validate: () => {},
            invoke: async () => someResult,
        };
        testObject.addTask(mockTask);

        const configOverride = {};
        const mockConfig = {};
        const result = await testObject.runTask("test-task", mockConfig, configOverride);
        expect(result).toBe(someResult);
    });

    it("can list tasks", async () => {

        let loggedText = "";

        const mockLog: any = {
            info: (msg: string) => {
                loggedText += msg;
            },
        };
        const testObject = new TaskRunner(mockLog);

        const taskName = "test-task";
        const mockTask: any = {
            getName: () => taskName,
            genTree: () => `##${taskName}\n`,
        };
        testObject.addTask(mockTask);

        await testObject.listTasks({}, {});

        expect(loggedText).toEqual("tasks\r\n└─ test-task");
    });

});