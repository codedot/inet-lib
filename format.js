"use strict";

const ambtype = 1;
const wiretype = 0;

let nwires, nambs, typelist, infmt;

function getlist(pax)
{
	const list = pax.map(gettree);

	if (list.length)
		return "(" + list.join(", ") + ")";
	else
		return "";
}

function gettree(agent)
{
	const type = agent.type;
	let human;

	if (wiretype == type) {
		human = agent.human;

		if (!human) {
			++nwires;
			human = "w" + nwires;
			agent.human = human;
		}

		agent.twin.human = human;
	} else if (ambtype == type) {
		const need = agent.need ? "!" : "\\";
		let index = agent.index;
		let list = "";

		if (!index || (nambs < index)) {
			++nambs;
			index = nambs;
			agent.twin.index = nambs;

			list = getlist([
				agent.main,
				agent.aux
			]);
		}

		human = need + "amb#" + index + list;
	} else {
		const need = agent.need ? "!" : "\\";
		let data = infmt(agent.data);
		let cell;

		if (void(0) == data)
			data = "";
		else
			data = "_{" + data + "}";

		cell = typelist[type] + data;

		human = need + cell + getlist(agent.pax);
	}

	return human;
}

function geteqn(pair)
{
	const left = gettree(pair.left);
	const right = gettree(pair.right);

	return left + " = " + right + ";";
}

function getconf(queue)
{
	nambs = 0;
	return queue.map(geteqn).join("\n");
}

function nofmt(data)
{
	return data;
}

function reset(fmt, types)
{
	if (fmt)
		infmt = fmt;
	else
		infmt = nofmt;

	nwires = 0;
	nambs = 0;
	typelist = [];

	for (const type in types)
		typelist[types[type]] = type;
}

exports.reset = reset;
exports.geteqn = geteqn;
exports.getconf = getconf;
