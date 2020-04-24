var Task = require('../../task');

describe('Task', function () {

	var mockLog = null;
	var mockValidate = null;
	var mockTaskRunner = null;

	var testObject = null;

	var init = function (mockTaskModule) {
		mockLog = {
			info: () => {},
			warn: () => {},
			error: () => {},
			
			verbose: () => {},
		};
		mockValidate = {};
		mockTaskRunner = {
			getTask: function () {
			},
		};

		var fullFilePath = 'blah/foo/test.js';

		jest.doMock(
			fullFilePath, 
			() => {
				return mockTaskModule;
			}, 
			{ virtual: true }
		);

		testObject = new Task('test', 'foo/test.js', fullFilePath, mockLog, mockValidate, mockTaskRunner);
	};

	afterEach(function () {
		testObject = null;
		mockLog = null;
		mockValidate = null;
		mockConfig = null;
		mockTaskMap = null;
	});

	it('bad task module throws', function () {

		expect(() => init(null)).toThrow();
	});

	it('non-function task throws', function () {

		expect(() => init({})).toThrow();
	});

	it('can get name', function () {

		init(() => {});

		expect(testObject.name()).toEqual("test");
	});

});