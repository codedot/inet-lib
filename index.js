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
	const row = table[left.type];
	const rule = row[right.type];
	const queue = rule(left, right);

	if (!queue)
		throw "NO RULES: " + geteqn(pair);

	inqueue.push.apply(inqueue, queue);

	++rule.count;
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

	return false;
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

function run(src, max)
{
	let t0, t1;

	prepare(src);

	if (!max)
		max = 1e7;

	t0 = Date.now();

	for (let i = 0; i < max; i++) {
		if (!inqueue.length)
			break;

		reduce(inqueue.pop());
	}

	t1 = Date.now();

	inenv.redtime = t1 - t0;
	inenv.stats = getstats();
	return inenv;
}

run.inenv = {};
run.prepare = prepare;
run.debug = debug;
run.debug0 = debug0;
run.debug1 = debug1;

module.exports = run;
