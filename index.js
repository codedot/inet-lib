"use strict";

const setup = require("./setup");
const format = require("./format");

const reset = format.reset;
const geteqn = format.geteqn;
const getconf = format.getconf;

let inenv, inqueue, table;

function reduce(pair)
{
	const left = pair.left;
	const right = pair.right;
	const rule = pair.rule;

	if (!rule(left, right))
		throw "NO RULES: " + geteqn(pair);

	++rule.count;

	pair.left = void(0);
	pair.right = void(0);
}

function prepare(src, fmt)
{
	let system;

	inenv = run.inenv;

	system = setup(src, inenv);
	table = system.rules;
	inqueue = system.queue;
	reset(fmt, system.types);

	return inenv;
}

function debug()
{
	const conf = getconf(inqueue);
	const pair = inqueue.pop();

	if (pair)
		reduce(pair);

	return conf;
}

function debug0()
{
	const pair = inqueue.pop();

	if (pair) {
		reduce(pair);
		return true;
	}
}

function debug1()
{
	const pair = inqueue.pop();

	if (pair) {
		const eqn = geteqn(pair);

		reduce(pair);
		return eqn;
	}
}

function getstats()
{
	const stats = {};
	const tlen = table.length;

	for (let i = 0; i < tlen; i++) {
		const row = table[i];
		const rlen = row.length;

		for (let j = 0; j < rlen; j++) {
			const rule = row[j];
			const count = rule.count;
			let human = rule.human;

			if (!human)
				continue;

			if (!count)
				continue;

			human = human.split("><");
			human = human.sort();
			human = human.join("><");

			if (stats[human])
				stats[human] += count;
			else
				stats[human] = count;
		}
	}

	return stats;
}

function perform(max)
{
	const t0 = Date.now();

	for (let i = 0; i < max; i++) {
		if (!inqueue.length)
			break;

		reduce(inqueue.pop());
	}

	return Date.now() - t0;
}

function run(src, max)
{
	prepare(src);
	inenv.redtime = perform(max ? max : 1e7);
	inenv.stats = getstats();
	return inenv;
}

run.inenv = {};
run.prepare = prepare;
run.debug = debug;
run.debug0 = debug0;
run.debug1 = debug1;

module.exports = run;
