"use strict";

const compile = require("./compile");

const parser = new compile.Parser();

let inenv, inqueue, nwires, nambs;
let typelist, types, ntypes, wiretype, ambtype, table;
let lpaxtype, rpaxtype, format, ndebug;

function addtypes(tree)
{
	const agent = tree.node.agent;
	const pax = tree.pax;
	const plen = pax.length;

	if ("wire" == agent)
		return;

	if (!types[agent]) {
		types[agent] = ntypes;
		++ntypes;
	}

	for (let i = 0; i < plen; i++)
		addtypes(pax[i]);
}

function norules(lagent, ragent)
{
	const eqn = geteqn({
		left: lagent,
		right: ragent
	});

	throw "NO RULES: " + eqn;
}

function ischild(wire, agent)
{
	const type = agent.type;

	if (wiretype == type) {
		if (wire === agent)
			return true;
	} else if (ambtype == type) {
		if (ischild(wire, agent.main))
			return true;

		if (ischild(wire, agent.aux))
			return true;
	} else {
		const pax = agent.pax;
		const plen = pax.length;

		for (let i = 0; i < plen; i++)
			if (ischild(wire, pax[i]))
				return true;
	}

	return false;
}

function detect(wire, agent)
{
	if (ndebug)
		return;

	if (ischild(wire, agent)) {
		const eqn = geteqn({
			left: wire,
			right: agent
		});

		throw "DEADLOCK: " + eqn;
	}
}

function indwire(wire, agent)
{
	const dst = wire.twin;
	const twin = agent.twin;

	dst.twin = twin;
	twin.twin = dst;
}

function inderiw(agent, wire)
{
	indwire(wire, agent);
}

function indamb(wire, agent)
{
	const dst = wire.twin;
	const twin = agent.twin;

	detect(dst, agent);

	dst.twin = twin;
	twin.twin = dst;

	dst.type = ambtype;
	dst.main = agent.main;
	dst.aux = agent.aux;
}

function indbma(agent, wire)
{
	indamb(wire, agent);
}

function indagent(wire, agent)
{
	const dst = wire.twin;

	detect(dst, agent);

	dst.type = agent.type;
	dst.pax = agent.pax;
	dst.data = agent.data;
}

function indtnega(agent, wire)
{
	indagent(wire, agent);
}

function getindir(type)
{
	if ("wire" == type)
		return indwire;
	else if ("amb" == type)
		return indamb;
	else
		return indagent;
}

function getridni(type)
{
	if ("wire" == type)
		return inderiw;
	else if ("amb" == type)
		return indbma;
	else
		return indtnega;
}

function determ(amb, agent)
{
	const dst = amb.twin;
	const aux = amb.aux;
	const type = aux.type;

	if (wiretype == type) {
		const twin = aux.twin;

		dst.twin = twin;
		twin.twin = dst;

		dst.type = type;
	} else if (ambtype == type) {
		const twin = aux.twin;

		dst.twin = twin;
		twin.twin = dst;

		dst.main = aux.main;
		dst.aux = aux.aux;
	} else {
		dst.type = type;
		dst.pax = aux.pax;
		dst.data = aux.data;
	}

	flush([{
		left: amb.main,
		right: agent
	}]);
}

function mreted(agent, amb)
{
	determ(amb, agent);
}

function mkeffect(lval, rval, code, expr)
{
	let body = expr ? "return (%s);" : "%s\n\treturn true;";

	if (!lval)
		lval = "LVAL";
	if (!rval)
		rval = "RVAL";
	if (!code && expr)
		code = "void(0)";

	body = body.replace("%s", code);
	return new Function(lval, rval, body);
}

function prequeue(queue, side, lval, rval, pax, wires)
{
	const plen = pax.length;

	for (let i = 0; i < plen; i++) {
		const img = encode(lval, rval, pax[i], wires);

		queue.push({
			left: {
				type: side,
				id: i
			},
			right: img
		});
	}
}

function optimize(queue)
{
	const needed = [];
	const qlen = queue.length;

	for (let i = 0; i < qlen; i++) {
		const pair = queue[i];
		const pax = pair.left;
		const wire = pair.right;
		const twin = wire.twin;

		if (wiretype != wire.type) {
			needed.push(pair);
			continue;
		}

		twin.type = pax.type;
		twin.id = pax.id;

		wire.junk = true;
		twin.junk = true;
	}

	return needed;
}

function geneff(effect)
{
	effect = "(" + effect.toString() + ")";
	return effect + ".call(this, lval, rval)";
}

function gentwins(wlist, alist)
{
	const wlen = wlist.length;
	const alen = alist.length;
	let head = "";
	let tail = "";

	if (!wlist.length)
		return "";

	for (let i = 0; i < wlen; i++) {
		const wire = wlist[i];
		const type = wire.type;
		const twin = wire.twin.id;

		head = head.concat("\
	const wire" + i + " = {type: " + type + "};\n");

		tail = tail.concat("\
	wire" + i + ".twin = wire" + twin + ";\n");
	}

	for (let i = 0; i < alen; i++) {
		const tree = alist[i];

		head = head.concat("\
	const tree" + i + " = " + genclone(tree) + ";\n");
	}

	for (let i = 0; i < wlen; i++) {
		const wire = wlist[i];

		if (ambtype == wire.type) {
			const main = wire.main;
			const aux = wire.aux;

			tail = tail.concat("\
	wire" + i + ".main = tree" + main + ";\n\
	wire" + i + ".aux = tree" + aux + ";\n");
		}
	}

	return head.concat("\n", tail, "\n");
}

function genclone(img)
{
	const type = img.type;
	const imgpax = img.pax;
	const pax = [];
	let iplen;

	if (lpaxtype == type)
		return "lpax[" + img.id + "]";

	if (rpaxtype == type)
		return "rpax[" + img.id + "]";

	if (wiretype == type)
		return "wire" + img.id;

	if (ambtype == type)
		return "wire" + img.id;

	iplen = imgpax.length;
	for (let i = 0; i < iplen; i++)
		pax[i] = genclone(imgpax[i]);

	return "{\n\
			type: " + type + ",\n\
			pax: [" + pax.join(", ") + "],\n\
			data: " + geneff(img.effect) + "\n\
		}";
}

function genqueue(img)
{
	const queue = [];
	const ilen = img.length;

	for (let i = 0; i < ilen; i++) {
		const pair = img[i];
		const left = pair.left;
		const right = pair.right;

		queue.push("{\n\
		left: " + genclone(left) + ",\n\
		right: " + genclone(right) + "\n\
	}");
	}

	return "[" + queue.join(", ") + "]";
}

function generate(img, wlist, alist, effect, rl)
{
	const left = rl ? "right" : "left";
	const right = rl ? "left" : "right";
	const body = "\
	const lval = " + left + ".data;\n\
	const rval = " + right + ".data;\n\n\
	if (!(" + geneff(effect) + "))\n\
		return;\n\n\
	const lpax = left.pax;\n\
	const rpax = right.pax;\n\n\
	" + gentwins(wlist, alist) + "\
	return " + genqueue(img) + ";";

	return new Function("left", "right", body);
}

function apply(left, right, code, rl)
{
	const lnode = left.node;
	const rnode = right.node;
	const human = lnode.agent + "><" + rnode.agent;
	const lval = rl ? rnode.code : lnode.code;
	const rval = rl ? lnode.code : rnode.code;
	const effect = mkeffect(lval, rval, code);
	const img = [];
	const wires = {};
	const wlist = [];
	const alist = [];
	let oimg, interact;

	prequeue(img, lpaxtype, lval, rval, left.pax, wires);
	prequeue(img, rpaxtype, lval, rval, right.pax, wires);

	oimg = optimize(img);

	for (const name in wires) {
		const wire = wires[name];
		const twin = wire.twin;

		if (wire.junk)
			continue;

		wire.id = wlist.length;
		wlist.push(wire);

		twin.id = wlist.length;
		wlist.push(twin);

		if (ambtype == wire.type) {
			const main = wire.main;
			const aux = wire.aux;

			wire.main = alist.length;
			twin.main = alist.length;
			alist.push(main);

			wire.aux = alist.length;
			twin.aux = alist.length;
			alist.push(aux);
		}
	}

	interact = generate(oimg, wlist, alist, effect, rl);
	interact.human = human;
	interact.count = 0;
	return interact;
}

function addrule(dict, rule)
{
	const human = rule.human;
	const entry = dict[human];

	if (entry)
		entry.push(rule);
	else
		dict[human] = [rule];
}

function setup(src)
{
	const system = parser.parse(src);
	const inrules = system.rules;
	const inconf = system.conf;
	const rlen = inrules.length;
	const clen = inconf.length;
	const custom = {};
	const wires = {};
	const queue = [];
	const effect = mkeffect(0, 0, system.code);

	table = [];

	for (let i = 0; i < rlen; i++) {
		const rule = inrules[i];
		const left = rule.left;
		const right = rule.right;
		const code = rule.code;
		let lrfunc, rlfunc;

		addtypes(left);
		addtypes(right);

		lrfunc = apply(left, right, code);
		addrule(custom, lrfunc);

		rlfunc = apply(right, left, code, true);
		addrule(custom, rlfunc);
	}

	for (let i = 0; i < clen; i++) {
		const eqn = inconf[i];
		const left = eqn.left;
		const right = eqn.right;

		addtypes(left);
		addtypes(right);
	}

	for (const left in types) {
		const row = [];

		for (const right in types) {
			let rules = custom[left + "><" + right];

			if (!rules) {
				if ("wire" == left)
					rules = getindir(right);
				else if ("wire" == right)
					rules = getridni(left);
				else if ("amb" == left)
					rules = determ;
				else if ("amb" == right)
					rules = mreted;
				else
					rules = norules;
			}

			row[types[right]] = rules;
		}

		table[types[left]] = row;

		typelist[types[left]] = left;
	}

	effect.call(inenv);

	for (let i = 0; i < clen; i++) {
		const eqn = inconf[i];
		const left = eqn.left;
		const right = eqn.right;

		queue.push({
			left: encode(0, 0, left, wires, true),
			right: encode(0, 0, right, wires, true)
		});
	}

	flush(queue);
}

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

	norules(left, right);
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

		pair.rules = rules;

		if (rules.pseudo)
			rules(left, right);
		else
			inqueue.push(pair);
	}
}

function encode(lval, rval, tree, wires, rt)
{
	const node = tree.node;
	const code = node.code;
	const agent = node.agent;
	const type = types[agent];
	const pax = tree.pax;
	const plen = pax.length;
	const imgpax = [];

	for (let i = 0; i < plen; i++) {
		const sub = pax[i];

		imgpax[i] = encode(lval, rval, sub, wires, rt);
	}

	tree = {
		type: type,
		pax: imgpax
	};

	if (wiretype == type) {
		const name = node.name;
		const wire = wires[name];

		if (wire) {
			wire.twin = tree;
			tree.twin = wire;

			tree.type = wire.type;
			tree.main = wire.main;
			tree.aux = wire.aux;
		}

		delete tree.pax;

		wires[name] = tree;
	} else if (ambtype == type) {
		const wire = imgpax.shift();
		const twin = wire.twin;
		const main = imgpax.shift();
		const aux = imgpax.shift();

		wire.type = type;
		wire.main = main;
		wire.aux = aux;

		if (twin) {
			twin.type = type;
			twin.main = main;
			twin.aux = aux;
		}

		return wire;
	} else {
		const effect = mkeffect(lval, rval, code, true);

		if (rt)
			tree.data = effect.call(inenv);
		else
			tree.effect = effect;
	}

	return tree;
}

function prepare(src, fmt, deadlock)
{
	if (fmt)
		format = fmt;
	else
		format = noformat;

	ndebug = !deadlock;
	inenv = run.inenv;
	inqueue = [];
	typelist = [];
	types = {
		wire: 0,
		amb: 1
	};
	ntypes = 2;
	nwires = 0;
	nambs = 0;

	norules.pseudo = true;
	determ.pseudo = true;
	mreted.pseudo = true;
	indwire.pseudo = true;
	inderiw.pseudo = true;
	indamb.pseudo = true;
	indbma.pseudo = true;
	indagent.pseudo = true;
	indtnega.pseudo = true;

	wiretype = types["wire"];
	ambtype = types["amb"];
	lpaxtype = -1;
	rpaxtype = -2;

	setup(src);

	return inenv;
}

function getlist(pax)
{
	const list = pax.map(gettree);

	if (list.length)
		return "(" + list.join(", ") + ")";
	else
		return "";
}

function noformat(data)
{
	return data;
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
		let data = format(agent.data);
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

function getconf()
{
	nambs = 0;
	return inqueue.map(geteqn).join("\n");
}

function debug()
{
	const conf = getconf();
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
