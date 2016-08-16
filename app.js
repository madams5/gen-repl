'use strict';

const Q = require('q');
Q.longStackSupport = true;
const REPL = require('repl');
const VM = require('vm');
const vm = new VM.Script();
const esprima = require('esprima');
const escope = require('escope');
const escodegen = require('escodegen');

let inBlock = false;
let lines = [];

function localEval (cmd, context, filename, callback) {
	if ( inBlock ) {
		lines.push(cmd);
		process.stdout.write('... ');
		return;
	}

	cmd = `__localEvalWrapper = function* () { ${cmd} }`;

	let parsed = esprima.parse(cmd, { sourceType: 'script', esnext: true });
	let functionBlockStatement = parsed.body[0].expression.right.body;

	let last = functionBlockStatement.body[functionBlockStatement.body.length - 1];
	if ( last.type === 'ExpressionStatement' ) {
		last.expression = {
			type: 'AssignmentExpression',
			operator: '=',
			left: {
				type: 'MemberExpression',
				computed: false,
				object: {
					type: 'Identifier',
					name: 'global'
				},
				property: {
					type: 'Identifier',
					name: '__localEvalReturn'
				}
			},
			right: last.expression
		};
	}

	functionBlockStatement.body.push({
        type: 'ExpressionStatement',
        expression: {
          	type: 'CallExpression',
          	callee: {
	            type: 'MemberExpression',
	            computed: false,
	            object: {
	              	type: 'Identifier',
	              	name: '__localEvalPromise'
	            },
	            property: {
	              	type: 'Identifier',
	              	name: 'resolve'
	            }
          	},
          	arguments: []
        }
    });

	let currentScope = escope.analyze(parsed);
	for ( let i = 0 ; i < currentScope.scopes[1].variables.length ; i++ ) {

		let variable = currentScope.scopes[1].variables[i];
		if ( variable.name === 'arguments' ) {
			continue;
		}

		functionBlockStatement.body.push({ 
			type: 'ExpressionStatement',
			expression: {
				type: 'AssignmentExpression',
				operator: '=',
				left: {
					type: 'MemberExpression',
					computed: false,
					object: {
						type: 'Identifier',
						name: 'global'
					},
					property: {
						type: 'Identifier',
						name: variable.name
					}
				},
				right: {
					type: 'Identifier',
					name: variable.name
				}
			}
		});
	}

	cmd = escodegen.generate(parsed);
	
	let command = `
		'use strict';

		if ( !Q ) {
			var Q = require('q');
		}
		if ( !__localEvalPromise ) {
			var __localEvalPromise;
		}
		if ( !__localEvalWrapper ) {
			var __localEvalWrapper;
		}
		if ( !__localEvalReturn ) {
			var __localEvalReturn;
		}

		__localEvalReturn = undefined;
		__localEvalPromise = Q.defer();

		${cmd}

		Q.spawn(__localEvalWrapper);
	`;

	let vm = new VM.Script(command);
	let result = vm.runInContext(context);
	context.__localEvalPromise.promise.then(function () {
		callback(null, context.__localEvalReturn);
	});
}

function startBlock (repl) {
	if ( !inBlock ) {
		inBlock = true;
		lines = [];
		repl._prompt = '... ';
		process.stdout.write(repl._prompt);
	} else {
		console.log('cannot startblock inside a block');
		process.stdout.write(repl._prompt);
	}
}

function endBlock (repl) {
	if ( inBlock ) {
		inBlock = false;
		repl._prompt = '> ';
		localEval(lines.join(''), repl.context, null, function (err, result) {
			console.log(result);
			process.stdout.write(repl._prompt);
		});
	} else {
		console.log('startblock must be used before endblock');
		process.stdout.write(repl._prompt);
	}
}

function* main () {
	let repl = REPL.start({
		eval: localEval
	});

	repl.defineCommand('startblock', {
		help: 'Starts a block for evaluation',
		action: function () {
			startBlock(repl);
		}
	});
	repl.defineCommand('sb', {
		help: 'Shorthand for starting a block',
		action: function () {
			startBlock(repl);
		}
	});
	repl.defineCommand('endblock', {
		help: 'Ends a block and evaluates',
		action: function () {
			endBlock(repl);
		}
	});
	repl.defineCommand('eb', {
		help: 'Shorthand for ending a block and evaluating',
		action: function () {
			endBlock(repl)
		}
	});

	require('repl.history')(repl, process.env.HOME + '/.node_history');
	return repl;
}

Q.spawn(main);