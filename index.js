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
	const rules = pair.rules;
	const rlen = rules.length;

	for (let i = 0; i < rlen; i++) {
		const rule = rules[i];
		const queue = rule.call(inenv, left, right);

		if (queue) {
			++rule.count;
			flush(queue);
			return;
		}
	}

	throw "NO RULES: " + geteqn(pair);
}

function flush(queue)
{
	const qlen = queue.length;

	for (let i = 0; i < qlen; i++) {
		const pair = queue[i];
		const left = pair.left;
		const right = pair.right;
		const row = table[left.type];
		const rules = row[right.type];

		if (rules.pseudo) {
			const amb = rules(left, right);

			if (amb)
				flush(amb);

			continue;
		}

		pair.rules = rules;
		inqueue.push(pair);
	}
}

function prepare(src, fmt)
{
	let system;

	inenv = run.inenv;
	inqueue = [];

	system = setup(src, inenv);
	table = system.rules;
	flush(system.queue);
	reset(fmt, system.types);

	return inenv;
}

function debug()
{
	const conf = getconf(inqueue);
	const pair = inqueue.shift();

	if (pair)
		reduce(pair);

	return conf;
}

function debug0()
{
	const pair = inqueue.shift();

	if (pair) {
		reduce(pair);
		return true;
	}

	return false;
}

function debug1()
{
	const pair = inqueue.shift();

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
			const cell = row[j];
			const clen = cell.length;

			if (cell.pseudo)
				continue;

			for (let k = 0; k < clen; k++) {
				const rule = cell[k];
				const count = rule.count;
				let human = rule.human;

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
		const pair = inqueue.shift();

		if (!pair)
			break;

		reduce(pair);
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
