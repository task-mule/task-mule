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
            resolveDependencies: jest.fn(),
            validate: jest.fn(),
            invoke: jest.fn(),
        };
        testObject.addTask(mockTask);

        const configOverride = {};
        const mockConfig = {};
        await testObject.runTask("test-task", mockConfig, configOverride);

        expect(mockTask.resolveDependencies).toHaveBeenCalledWith(mockConfig);
        expect(mockTask.validate).toHaveBeenCalledWith(configOverride, mockConfig, {});
        expect(mockTask.invoke).toHaveBeenCalledWith(configOverride, mockConfig, {});
    });

    // it("fails to run task when task doesnt exist", async () => {

    //     const mockLog: any = {};
    //     const testObject = new TaskRunner(mockLog);
        
    //     expect(() => testObject.runTask("test-task", {}, {})).toThrow();
    // });


});