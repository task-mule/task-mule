import { ITask, Task, ITaskModule, IBooleanMap, IResultMap } from "../../lib/task";

describe('Task', () => {

	let mockLog: any;
	let mockTaskRunner: any;
	let testObject!: Task;
	let mockErrorFn: jest.Mock;

	function init(mockTaskModule: ITaskModule, mockTasksMap?: any): void {
		mockErrorFn = jest.fn();
		mockLog = {
			info: () => {},
			warn: () => {},
			error: mockErrorFn,
			verbose: () => {},
			task: () => {},
		};

		mockTaskRunner = {
			getTask: (taskName: string): ITask => {
				return mockTasksMap && mockTasksMap[taskName];
			},
		};

		testObject = new Task(
			'test', 
			'foo/test.js', 
			'blah/foo/test.js', 
			mockTaskModule, 
			mockLog, 
			mockTaskRunner
		);
	};

	it("can resolve dependencies when there are no dependencies", async () => {

		init({});

		const dependencies = await testObject.resolveDependencies({});
		expect(dependencies).toEqual([]);
	});

	it("resolving single dependency that doesnt exists results in no resolved dependencies", async () => {

		init({
			runs: [ "non-existing-task" ],
		});

		const dependencies = await testObject.resolveDependencies({});

		expect(mockErrorFn).toHaveBeenCalled();
		expect(dependencies).toEqual([]);
	});

	it("can resolve string dependency", async () => {

		const mockAnotherTask: any = {};

		init(
			{
				runs: [ "another-task" ],
			}, 
			{
				"another-task": mockAnotherTask,
			}
		);
		const dependencies = await testObject.resolveDependencies({});

		expect(dependencies.length).toEqual(1);
		
		const dependency = dependencies[0];
		expect(dependency.task).toEqual("another-task");
		expect(dependency.resolvedTask).toEqual(mockAnotherTask);
	});

	it("can resolve object dependency", async () => {

		const mockAnotherTask: any = {};

		init(
			{
				runs: [ 
					{
						task: "another-task",
					}
				],
			}, 
			{
				"another-task": mockAnotherTask,
			}
		);

		const dependencies = await testObject.resolveDependencies({});

		expect(dependencies.length).toEqual(1);
		
		const dependency = dependencies[0];
		expect(dependency.task).toEqual("another-task");
		expect(dependency.resolvedTask).toEqual(mockAnotherTask);
	});

	it("can resolve object dependency with config", async () => {

		const mockAnotherTask: any = {};

		const dependencyConfig = {};

		init(
			{
				runs: [ 
					{
						task: "another-task",
						config: dependencyConfig,
					}
				],
			}, 
			{
				"another-task": mockAnotherTask,
			}
		);

		const dependencies = await testObject.resolveDependencies({});

		expect(dependencies.length).toEqual(1);
		
		const dependency = dependencies[0];
		expect(dependency.task).toEqual("another-task");
		expect(dependency.resolvedTask).toEqual(mockAnotherTask);
	});	

	it("can resolve dependencies", async () => {

		const mockTask1: any = { resolveDependencies: () => {}, };
		const mockTask2: any = { resolveDependencies: () => {}, };

		init(
			{
				runs: [ "one-task", "two-task" ],
			}, 
			{
				"one-task": mockTask1,
				"two-task": mockTask2,
			}
		);

		const dependencies = await testObject.resolveDependencies({});

		expect(dependencies.length).toEqual(2);
		expect(dependencies[0].task).toEqual("one-task");
		expect(dependencies[1].task).toEqual("two-task");
	});

	it("can resolve dependency using function", async () => {

		const mockAnotherTask: any = {};

		init(
			{
				runs: async () => [ "another-task" ],
			}, 
			{
				"another-task": mockAnotherTask,
			}
		);

		const dependencies = await testObject.resolveDependencies({});

		expect(dependencies.length).toEqual(1);
		
		const dependency = dependencies[0];
		expect(dependency.task).toEqual("another-task");
		expect(dependency.resolvedTask).toEqual(mockAnotherTask);
	});

	it("can validate", async () => {

		init({});

		const localConfig = {};
		const tasksValidated: IBooleanMap = {};
		await testObject.validate(localConfig, {}, tasksValidated);

		expect(tasksValidated[testObject.genTaskKey(localConfig)]).toBe(true);
	});

	it("validation invokes task-module callback", async () => {

		const mockValidateFn = jest.fn();
		init({
			validate: mockValidateFn,
		});

		const globalConfig: any = {};		
		await testObject.validate({}, globalConfig, {});

		expect(mockValidateFn).toHaveBeenCalledWith(globalConfig);
	});

	it("can validate with dependency", async () => {

		const mockNestedValidateFn = jest.fn();

		const mockAnotherTask: any = {
			resolveDependencies: () => {},
			validate: mockNestedValidateFn,
		};

		init(
			{
				runs: async () => [ "another-task" ],
			}, 
			{
				"another-task": mockAnotherTask,
			}
		);

		const localConfig = {};
		const globalConfig: any = {};
		const tasksValidated = {};

		await testObject.validate(localConfig, globalConfig, tasksValidated);

		expect(mockNestedValidateFn).toHaveBeenCalledWith(localConfig, globalConfig, tasksValidated);
	});

	it("wont validate twice", async () => {

		const mockValidateFn = jest.fn();
		init({
			validate: mockValidateFn,
		});

		const globalConfig: any = {};
		const tasksValidated = {};

		await testObject.validate({}, globalConfig, tasksValidated);
		await testObject.validate({}, globalConfig, tasksValidated);

		expect(mockValidateFn).toHaveBeenCalledTimes(1);
	});

	it("can invoke", async () => {

		init({});

		const globalConfig: any = {};
		const localConfig = {};
		const tasksInvoked: IBooleanMap = {};
		const taskResults: IResultMap = {};
		await testObject.invoke(localConfig, globalConfig, tasksInvoked, taskResults, 0);

		expect(tasksInvoked[testObject.genTaskKey(localConfig)]).toBe(true);
	});

	it("invoke invokes task-module callback", async () => {

		const mockInvokeFn = jest.fn();
		init({
			invoke: mockInvokeFn,
		});

		const globalConfig: any = {};
		await testObject.invoke({}, globalConfig, {}, {}, 0);

		expect(mockInvokeFn).toHaveBeenCalledWith(globalConfig);
	});

	it("can invoke with dependency", async () => {

		const mockNestedInvokeFn = jest.fn();

		const mockAnotherTask: any = {
			resolveDependencies: () => {},
			invoke: mockNestedInvokeFn,
		};

		init(
			{
				runs: async () => [ "another-task" ],
			}, 
			{
				"another-task": mockAnotherTask,
			}
		);

		const localConfig = {};
		const globalConfig: any = {};		
		const tasksInvoked: IBooleanMap = {};
		const taskResults: IResultMap = {};		
		await testObject.invoke(localConfig, globalConfig, tasksInvoked, taskResults, 0);

		expect(mockNestedInvokeFn).toHaveBeenCalledWith(localConfig, globalConfig, tasksInvoked, taskResults, 1);
	});

	it("wont invoke twice", async () => {

		const mockNestedInvokeFn = jest.fn();
		init({
			invoke: mockNestedInvokeFn,
		});

		const globalConfig: any = {};
		const tasksInvoked: IBooleanMap = {};
		const taskResults: IResultMap = {};
		await testObject.invoke({}, globalConfig, tasksInvoked, taskResults, 0);
		await testObject.invoke({}, globalConfig, tasksInvoked, taskResults, 0);

		expect(mockNestedInvokeFn).toHaveBeenCalledTimes(1);
	});

	it('can gen tree', async () => {

		init({});

		const tree = await testObject.genTree(1, {}, {});
		expect(tree).toEqual("#test\n");
	});

	it('can gen tree with dependencies', async () => {

		const mockTask1: any = { 
			resolveDependencies: () => {}, 
			genTree: () => "##one-task\n",
		};
		const mockTask2: any = { 
			resolveDependencies: () => {}, 
			genTree: () => "##two-task\n",
		};

		init(
			{
				runs: [ "one-task", "two-task" ],
			}, 
			{
				"one-task": mockTask1,
				"two-task": mockTask2,
			}
		);

		const tree = await testObject.genTree(1, {}, {});
		expect(tree).toEqual("#test\n##one-task\n##two-task\n");
	});

	it("can invoke and get result", async () => {
		const someResult = {};
		init({
			invoke: async config => {
				return someResult;
			}
		});

		const globalConfig: any = {};
		const localConfig = {};
		const tasksInvoked: IBooleanMap = {};
		const taskResults: IResultMap = {};
		const result = await testObject.invoke(localConfig, globalConfig, tasksInvoked, taskResults, 0);
		expect(result).toBe(someResult);
		expect(taskResults[testObject.genTaskKey(localConfig)]).toBe(someResult);
	});
});