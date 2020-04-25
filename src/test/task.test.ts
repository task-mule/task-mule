import { ITask, Task, ITaskModule, IBooleanMap } from "../task";

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

		await testObject.resolveDependencies({});

		const dependencies = testObject.getResolvedDependencies();
		expect(dependencies).toEqual([]);
	});

	it("resolving single dependency that doesnt exists results in no resolved dependencies", async () => {

		init({
			dependsOn: [ "non-existing-task" ],
		});

		await testObject.resolveDependencies({});

		expect(mockErrorFn).toHaveBeenCalled();

		const dependencies = testObject.getResolvedDependencies();
		expect(dependencies).toEqual([]);
	});

	it("can resolve single dependency", async () => {

		const mockNestedResolveFn = jest.fn();

		const mockAnotherTask: any = {
			resolveDependencies: mockNestedResolveFn,
		};

		init(
			{
				dependsOn: [ "another-task" ],
			}, 
			{
				"another-task": mockAnotherTask,
			}
		);

		const mockConfig = {};
		await testObject.resolveDependencies(mockConfig);

		const dependencies = testObject.getResolvedDependencies();
		expect(dependencies.length).toEqual(1);
		
		const dependency = dependencies[0];
		expect(dependency.task).toEqual("another-task");
		expect(dependency.resolvedTask).toEqual(mockAnotherTask);
		expect(mockNestedResolveFn).toHaveBeenCalledWith(mockConfig);
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

		await testObject.resolveDependencies({});

		const dependencies = testObject.getResolvedDependencies();
		expect(dependencies.length).toEqual(2);
		expect(dependencies[0].task).toEqual("one-task");
		expect(dependencies[1].task).toEqual("two-task");
	});

	it("can resolve dependency using function", async () => {

		const mockNestedResolveFn = jest.fn();

		const mockAnotherTask: any = {
			resolveDependencies: mockNestedResolveFn,
		};

		init(
			{
				dependsOn: async () => [ "another-task" ],
			}, 
			{
				"another-task": mockAnotherTask,
			}
		);

		const mockConfig = {};
		await testObject.resolveDependencies(mockConfig);

		const dependencies = testObject.getResolvedDependencies();
		expect(dependencies.length).toEqual(1);
		
		const dependency = dependencies[0];
		expect(dependency.task).toEqual("another-task");
		expect(dependency.resolvedTask).toEqual(mockAnotherTask);
		expect(mockNestedResolveFn).toHaveBeenCalledWith(mockConfig);
	});

	it("can validate", async () => {

		init({});

		const mockPushConfigFn = jest.fn();
		const mockPopConfigFn = jest.fn();
		const mockConfig: any = {
			push: mockPushConfigFn,
			pop: mockPopConfigFn,
		}

		const configOverride = {};
		const tasksValidated: IBooleanMap = {};
		await testObject.validate(configOverride, mockConfig, tasksValidated);

		expect(tasksValidated[testObject.genTaskKey(configOverride)]).toBe(true);
		expect(mockPushConfigFn).toHaveBeenCalledWith(configOverride);
		expect(mockPopConfigFn).toHaveBeenCalledWith();
	});

	it("validation invokes task-module callback", async () => {

		const mockValidateFn = jest.fn();
		init({
			validate: mockValidateFn,
		});

		const mockConfig: any = {
			push: () => {},
			pop: () => {},
		}

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
		const mockConfig: any = {
			push: () => {},
			pop: () => {},
		}
		const tasksValidated = {};

		await testObject.resolveDependencies(mockConfig);
		await testObject.validate(configOverride, mockConfig, tasksValidated);

		expect(mockNestedValidateFn).toHaveBeenCalledWith(configOverride, mockConfig, tasksValidated);
	});

	it("wont validate twice", async () => {

		const mockValidateFn = jest.fn();
		init({
			validate: mockValidateFn,
		});

		const mockConfig: any = {
			push: () => {},
			pop: () => {},
		}

		const tasksValidated = {};

		await testObject.validate({}, mockConfig, tasksValidated);
		await testObject.validate({}, mockConfig, tasksValidated);

		expect(mockValidateFn).toHaveBeenCalledTimes(1);
	});

	it("can invoke", async () => {

		init({});

		const mockPushConfigFn = jest.fn();
		const mockPopConfigFn = jest.fn();
		const mockConfig: any = {
			push: mockPushConfigFn,
			pop: mockPopConfigFn,
		}

		const configOverride = {};
		const taskInvoked: IBooleanMap = {};
		await testObject.invoke(configOverride, mockConfig, taskInvoked);

		expect(taskInvoked[testObject.genTaskKey(configOverride)]).toBe(true);
		expect(mockPushConfigFn).toHaveBeenCalledWith(configOverride);
		expect(mockPopConfigFn).toHaveBeenCalledWith();
	});

	it("invoke invokes task-module callback", async () => {

		const mockInvokeFn = jest.fn();
		init({
			invoke: mockInvokeFn,
		});

		const mockConfig: any = {
			push: () => {},
			pop: () => {},
		}

		await testObject.invoke({}, mockConfig, {});

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
		const mockConfig: any = {
			push: () => {},
			pop: () => {},
		}
		const tasksInvoked = {};

		await testObject.resolveDependencies(mockConfig);
		await testObject.invoke(configOverride, mockConfig, tasksInvoked);

		expect(mockNestedInvokeFn).toHaveBeenCalledWith(configOverride, mockConfig, tasksInvoked);
	});

	it("wont invoke twice", async () => {

		const mockNestedInvokeFn = jest.fn();
		init({
			invoke: mockNestedInvokeFn,
		});

		const mockConfig: any = {
			push: () => {},
			pop: () => {},
		}

		const tasksInvoked = {};

		await testObject.invoke({}, mockConfig, tasksInvoked);
		await testObject.invoke({}, mockConfig, tasksInvoked);

		expect(mockNestedInvokeFn).toHaveBeenCalledTimes(1);
	});

	it('can gen tree', () => {

		init({});

		const tree = testObject.genTree(1);
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

		await testObject.resolveDependencies({});

		const tree = testObject.genTree(1);
		expect(tree).toEqual("#test\n##one-task\n##two-task\n");
	});

});