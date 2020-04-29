import { ITask, Task, ITaskModule, IBooleanMap } from "../../lib/task";

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
			dependsOn: [ "non-existing-task" ],
		});

		const dependencies = await testObject.resolveDependencies({});

		expect(mockErrorFn).toHaveBeenCalled();
		expect(dependencies).toEqual([]);
	});

	it("can resolve string dependency", async () => {

		const mockAnotherTask: any = {};

		init(
			{
				dependsOn: [ "another-task" ],
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
				dependsOn: [ 
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
				dependsOn: [ 
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
				dependsOn: [ "one-task", "two-task" ],
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
				dependsOn: async () => [ "another-task" ],
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

		const configOverride = {};
		const tasksValidated: IBooleanMap = {};
		await testObject.validate(configOverride, {}, tasksValidated);

		expect(tasksValidated[testObject.genTaskKey(configOverride)]).toBe(true);
	});

	it("validation invokes task-module callback", async () => {

		const mockValidateFn = jest.fn();
		init({
			validate: mockValidateFn,
		});

		const mockConfig: any = {};		
		await testObject.validate({}, mockConfig, {});

		expect(mockValidateFn).toHaveBeenCalledWith(mockConfig);
	});

	it("can validate with dependency", async () => {

		const mockNestedValidateFn = jest.fn();

		const mockAnotherTask: any = {
			resolveDependencies: () => {},
			validate: mockNestedValidateFn,
		};

		init(
			{
				dependsOn: async () => [ "another-task" ],
			}, 
			{
				"another-task": mockAnotherTask,
			}
		);

		const configOverride = {};
		const mockConfig: any = {};
		const tasksValidated = {};

		await testObject.validate(configOverride, mockConfig, tasksValidated);

		expect(mockNestedValidateFn).toHaveBeenCalledWith(configOverride, mockConfig, tasksValidated);
	});

	it("wont validate twice", async () => {

		const mockValidateFn = jest.fn();
		init({
			validate: mockValidateFn,
		});

		const mockConfig: any = {};
		const tasksValidated = {};

		await testObject.validate({}, mockConfig, tasksValidated);
		await testObject.validate({}, mockConfig, tasksValidated);

		expect(mockValidateFn).toHaveBeenCalledTimes(1);
	});

	it("can invoke", async () => {

		init({});

		const mockConfig: any = {};
		const configOverride = {};
		const taskInvoked: IBooleanMap = {};
		await testObject.invoke(configOverride, mockConfig, taskInvoked, 0);

		expect(taskInvoked[testObject.genTaskKey(configOverride)]).toBe(true);
	});

	it("invoke invokes task-module callback", async () => {

		const mockInvokeFn = jest.fn();
		init({
			invoke: mockInvokeFn,
		});

		const mockConfig: any = {};
		await testObject.invoke({}, mockConfig, {}, 0);

		expect(mockInvokeFn).toHaveBeenCalledWith(mockConfig);
	});

	it("can invoke with dependency", async () => {

		const mockNestedInvokeFn = jest.fn();

		const mockAnotherTask: any = {
			resolveDependencies: () => {},
			invoke: mockNestedInvokeFn,
		};

		init(
			{
				dependsOn: async () => [ "another-task" ],
			}, 
			{
				"another-task": mockAnotherTask,
			}
		);

		const configOverride = {};
		const mockConfig: any = {};		
		const tasksInvoked = {};
		await testObject.invoke(configOverride, mockConfig, tasksInvoked, 0);

		expect(mockNestedInvokeFn).toHaveBeenCalledWith(configOverride, mockConfig, tasksInvoked, 1);
	});

	it("wont invoke twice", async () => {

		const mockNestedInvokeFn = jest.fn();
		init({
			invoke: mockNestedInvokeFn,
		});

		const mockConfig: any = {};
		const tasksInvoked = {};
		await testObject.invoke({}, mockConfig, tasksInvoked, 0);
		await testObject.invoke({}, mockConfig, tasksInvoked, 0);

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
				dependsOn: [ "one-task", "two-task" ],
			}, 
			{
				"one-task": mockTask1,
				"two-task": mockTask2,
			}
		);

		const tree = await testObject.genTree(1, {}, {});
		expect(tree).toEqual("#test\n##one-task\n##two-task\n");
	});

});