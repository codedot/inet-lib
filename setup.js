"use strict";

const compile = require("./compile");
const verbatim = require("./verbatim");

const parser = new compile.Parser();
const generate = verbatim.generate;
const mkeffect = verbatim.mkeffect;

const ambtype = 1;
const wiretype = 0;
const lpaxtype = -1;
const rpaxtype = -2;
const eqntype = -3;

let inqueue, inenv, ntypes, types, table;

function addtypes(tree)
{
	const agent = tree.node.agent;

	if ("wire" == agent)
		return;

	if (!types[agent]) {
		types[agent] = ntypes;
		++ntypes;
	}

	tree.pax.forEach(sub => {
		addtypes(sub);
	});
}

function indwire(wire, agent)
{
	const dst = wire.twin;
	const twin = agent.twin;

	dst.twin = twin;
	twin.twin = dst;

	wire.parent = void(0);
	wire.twin = void(0);
	agent.parent = void(0);
	agent.twin = void(0);
}

function inderiw(agent, wire)
{
	return indwire(wire, agent);
}

function indamb(wire, agent)
{
	const dst = wire.twin;
	const twin = agent.twin;
	const main = agent.main;
	const aux = agent.aux;

	dst.twin = twin;
	twin.twin = dst;

	dst.type = ambtype;
	dst.main = main;
	dst.aux = aux;

	main.parent = dst;
	aux.parent = dst;

	if (agent.need)
		delegate(dst);

	wire.parent = void(0);
	wire.twin = void(0);
	agent.parent = void(0);
	agent.twin = void(0);
	agent.main = void(0);
	agent.aux = void(0);
}

function indbma(agent, wire)
{
	return indamb(wire, agent);
}

function indagent(wire, agent)
{
	const dst = wire.twin;
	const pax = agent.pax;
	const plen = pax.length;

	dst.type = agent.type;
	dst.data = agent.data;
	dst.pax = pax;

	for (let i = 0; i < plen; i++)
		pax[i].parent = dst;

	if (agent.need)
		delegate(dst);

	wire.parent = void(0);
	wire.twin = void(0);
	agent.parent = void(0);
	agent.data = void(0);
	agent.pax = void(0);
}

function indtnega(agent, wire)
{
	return indagent(wire, agent);
}

function delegate(node)
{
	do {
		node.need = true;

		if (eqntype == node.type)
			inqueue.push(node);

		node = node.parent;
	} while (node && !node.need);
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
	const twin = amb.twin;
	const main = amb.main;
	const aux = amb.aux;

	amb.type = wiretype;
	amb.main = void(0);
	amb.aux = void(0);
	twin.type = wiretype;
	twin.main = void(0);
	twin.aux = void(0);

	flush(amb, aux);
	flush(main, agent);
}

function mreted(agent, amb)
{
	return determ(amb, agent);
}

function getqueue(lval, rval, left, right, wires)
{
	const getpair = type => (tree, i) => {
		tree = encode(lval, rval, tree, wires);

		adopt(tree);

		return {
			left: {
				type: type,
				id: i
			},
			right: tree
		};
	};

	left = left.pax.map(getpair(lpaxtype));
	right = right.pax.map(getpair(rpaxtype));
	return left.concat(right);
}

function apply(left, right, code, rl)
{
	const lnode = left.node;
	const rnode = right.node;
	const human = lnode.agent + "><" + rnode.agent;
	const lval = rl ? rnode.code : lnode.code;
	const rval = rl ? lnode.code : rnode.code;
	const effect = mkeffect(lval, rval, code);
	const wires = {};
	const wlist = [];
	const alist = [];
	const img = getqueue(lval, rval, left, right, wires);
	let interact;

	for (const name in wires) {
		const wire = wires[name];
		const twin = wire.twin;

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

	interact = generate(img, wlist, alist, effect, rl);
	interact = interact.bind(inenv, flush);
	interact.human = human;
	return interact;
}

function adopt(agent, parent)
{
	const type = agent.type;
	let need = agent.need;

	if (ambtype == type) {
		if (adopt(agent.main, agent))
			need = true;

		if (adopt(agent.aux, agent))
			need = true;
	} else if (wiretype != type) {
		agent.pax.forEach(tree => {
			if (adopt(tree, agent))
				need = true;
		});
	}

	agent.parent = parent;

	agent.need = need;
	return need;
}

function addpair(left, right, rule)
{
	const need = left.need || right.need;
	const pair = {
		need: need,
		type: eqntype,
		left: left,
		right: right,
		rule: rule
	};

	left.parent = pair;
	right.parent = pair;

	if (need)
		inqueue.push(pair);
}

function flush(left, right)
{
	const row = table[left.type];
	const rule = row[right.type];

	if (rule.pseudo)
		rule(left, right);
	else
		addpair(left, right, rule);
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

function copyamb(dst, src)
{
	dst.need = src.need;
	dst.type = src.type;
	dst.main = src.main;
	dst.aux = src.aux;
}

function encode(lval, rval, root, wires, rt)
{
	const node = root.node;
	const need = node.need;
	const type = types[node.agent];
	const pax = root.pax.map(sub => {
		return encode(lval, rval, sub, wires, rt);
	});

	if (wiretype == type) {
		const name = node.name;
		const wire = wires[name];
		const tree = {
			type: type
		};

		if (wire) {
			wire.twin = tree;
			tree.twin = wire;

			copyamb(tree, wire);
		}

		wires[name] = tree;

		return tree;
	} else if (ambtype == type) {
		const wire = pax.shift();
		const main = pax.shift();
		const aux = pax.shift();
		const twin = wire.twin;
		const tree = {
			need: need,
			type: type,
			main: main,
			aux: aux
		};

		copyamb(wire, tree);

		if (twin)
			copyamb(twin, tree);

		return wire;
	} else {
		const code = node.code;
		const effect = mkeffect(lval, rval, code, true);
		const tree = {
			need: need,
			type: type,
			pax: pax
		};

		if (rt)
			tree.data = effect.call(inenv);
		else
			tree.effect = effect;

		return tree;
	}
}

function traverse(list, pair)
{
	const n = list.length;

	function compound(left, right)
	{
		for (let i = 0; i < n; i++) {
			const rule = list[i];

			if (rule(left, right))
				return true;
		}
	}

	compound.human = pair;
	compound.count = 0;
	return compound;
}

function setup(src, env)
{
	const system = parser.parse(src);
	const inconf = system.conf;
	const custom = {};
	const wires = {};
	const effect = mkeffect(0, 0, system.code);

	table = [];
	inqueue = [];
	inenv = env;
	ntypes = 2;
	types = {
		wire: wiretype,
		amb: ambtype
	};

	system.rules.forEach(rule => {
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
	});

	for (const pair in custom)
		custom[pair] = traverse(custom[pair], pair);

	inconf.forEach(eqn => {
		addtypes(eqn.left);
		addtypes(eqn.right);
	});

	for (const left in types) {
		const row = [];

		for (const right in types) {
			let rule = custom[left + "><" + right];

			if (!rule) {
				if ("wire" == left)
					rule = getindir(right);
				else if ("wire" == right)
					rule = getridni(left);
				else if ("amb" == left)
					rule = determ;
				else if ("amb" == right)
					rule = mreted;
				else
					rule = () => {};
			}

			row[types[right]] = rule;
		}

		table[types[left]] = row;
	}

	effect.call(inenv);

	inconf.map(eqn => {
		const left = eqn.left;
		const right = eqn.right;

		return {
			left: encode(0, 0, left, wires, true),
			right: encode(0, 0, right, wires, true)
		};
	}).forEach(pair => {
		const left = pair.left;
		const right = pair.right;

		adopt(left);
		adopt(right);

		flush(left, right);
	});

	return {
		queue: inqueue,
		rules: table,
		types: types
	};
}

determ.pseudo = true;
mreted.pseudo = true;
indwire.pseudo = true;
inderiw.pseudo = true;
indamb.pseudo = true;
indbma.pseudo = true;
indagent.pseudo = true;
indtnega.pseudo = true;

module.exports = setup;
