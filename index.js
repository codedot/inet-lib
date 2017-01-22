var compile = require("./compile");

var parser = new compile.Parser();
var inverb, inrules, inconf, inenv, inqueue, nwires, nambs;
var typelist, types, ntypes, wiretype, ambtype, table;
var lpaxtype, rpaxtype, format, ndebug;

function addtypes(tree)
{
	var node = tree.node;
	var pax = tree.pax;
	var agent = node.agent;
	var type = types[agent];
	var i;

	if ("wire" == agent)
		return;

	if (!type) {
		types[agent] = ntypes;
		++ntypes;
	}

	for (i = 0; i < pax.length; i++)
		addtypes(pax[i]);
}

function norules(lagent, ragent)
{
	var eqn = geteqn({
		left: lagent,
		right: ragent
	});

	throw "NO RULES: " + eqn;
}

function ischild(wire, agent)
{
	var type = agent.type;

	if (wiretype == type) {
		if (wire === agent)
			return true;
	} else if (ambtype == type) {
		if (ischild(wire, agent.main))
			return true;

		if (ischild(wire, agent.aux))
			return true;
	} else {
		var pax = agent.pax;
		var i;

		for (i = 0; i < pax.length; i++)
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
		var eqn = geteqn({
			left: wire,
			right: agent
		});

		throw "DEADLOCK: " + eqn;
	}
}

function indwire(wire, agent)
{
	var dst = wire.twin;
	var twin = agent.twin;

	dst.twin = twin;
	twin.twin = dst;
}

function inderiw(agent, wire)
{
	indwire(wire, agent);
}

function indamb(wire, agent)
{
	var dst = wire.twin;
	var twin = agent.twin;

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
	var dst = wire.twin;

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
	var dst = amb.twin;
	var aux = amb.aux;
	var type = aux.type;

	if (wiretype == type) {
		var twin = aux.twin;

		dst.twin = twin;
		twin.twin = dst;

		dst.type = type;
	} else if (ambtype == type) {
		var twin = aux.twin;

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
	var body = expr ? "return (%s);" : "%s\n\treturn true;";

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
	var i;

	for (i = 0; i < pax.length; i++) {
		var img = encode(lval, rval, pax[i], wires);

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
	var needed = [];
	var i;

	for (i = 0; i < queue.length; i++) {
		var pair = queue[i];
		var pax = pair.left;
		var wire = pair.right;
		var twin = wire.twin;

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
	var head = "";
	var tail = "";
	var i;

	if (!wlist.length)
		return "";

	for (i = 0; i < wlist.length; i++) {
		var wire = wlist[i];
		var type = wire.type;
		var twin = wire.twin.id;

		head = head.concat("\
	var wire" + i + " = {type: " + type + "};\n");

		tail = tail.concat("\
	wire" + i + ".twin = wire" + twin + ";\n");
	}

	for (i = 0; i < alist.length; i++) {
		var tree = alist[i];

		head = head.concat("\
	var tree" + i + " = " + genclone(tree) + ";\n");
	}

	for (i = 0; i < wlist.length; i++) {
		var wire = wlist[i];

		if (ambtype == wire.type) {
			var main = wire.main;
			var aux = wire.aux;

			tail = tail.concat("\
	wire" + i + ".main = tree" + main + ";\n\
	wire" + i + ".aux = tree" + aux + ";\n");
		}
	}

	return head.concat("\n", tail, "\n");
}

function genclone(img)
{
	var type = img.type;
	var imgpax = img.pax;
	var pax = [];
	var i;

	if (lpaxtype == type)
		return "lpax[" + img.id + "]";

	if (rpaxtype == type)
		return "rpax[" + img.id + "]";

	if (wiretype == type)
		return "wire" + img.id;

	if (ambtype == type)
		return "wire" + img.id;

	for (i = 0; i < imgpax.length; i++)
		pax[i] = genclone(imgpax[i]);

	return "{\n\
			type: " + type + ",\n\
			pax: [" + pax.join(", ") + "],\n\
			data: " + geneff(img.effect) + "\n\
		}";
}

function genqueue(img)
{
	var queue = [];
	var i;

	for (i = 0; i < img.length; i++) {
		var pair = img[i];
		var left = pair.left;
		var right = pair.right;

		queue.push("{\n\
		left: " + genclone(left) + ",\n\
		right: " + genclone(right) + "\n\
	}");
	}

	return "[" + queue.join(", ") + "]";
}

function generate(img, wlist, alist, effect, rl)
{
	var left = rl ? "right" : "left";
	var right = rl ? "left" : "right";
	var body = "\
	var lval = " + left + ".data;\n\
	var rval = " + right + ".data;\n\n\
	if (!(" + geneff(effect) + "))\n\
		return;\n\n\
	var lpax = left.pax;\n\
	var rpax = right.pax;\n\n" + gentwins(wlist, alist) + "\
	return " + genqueue(img) + ";";

	return new Function("left", "right", body);
}

function apply(left, right, code, rl)
{
	var lnode = left.node;
	var rnode = right.node;
	var human = lnode.agent + "><" + rnode.agent;
	var lval = rl ? rnode.code : lnode.code;
	var rval = rl ? lnode.code : rnode.code;
	var effect = mkeffect(lval, rval, code);
	var img = [];
	var wires = {};
	var wlist = [];
	var alist = [];
	var i, name, interact;

	prequeue(img, lpaxtype, lval, rval, left.pax, wires);
	prequeue(img, rpaxtype, lval, rval, right.pax, wires);

	img = optimize(img);

	for (name in wires) {
		var wire = wires[name];
		var twin = wire.twin;

		if (wire.junk)
			continue;

		wire.id = wlist.length;
		wlist.push(wire);

		twin.id = wlist.length;
		wlist.push(twin);

		if (ambtype == wire.type) {
			var main = wire.main;
			var aux = wire.aux;

			wire.main = alist.length;
			twin.main = alist.length;
			alist.push(main);

			wire.aux = alist.length;
			twin.aux = alist.length;
			alist.push(aux);
		}
	}

	interact = generate(img, wlist, alist, effect, rl);
	interact.human = human;
	interact.count = 0;
	return interact;
}

function addrule(dict, rule)
{
	var human = rule.human;
	var entry = dict[human];

	if (!entry) {
		entry = [];
		dict[human] = entry;
	}

	entry.push(rule);
}

function gettable()
{
	var tab = [];
	var custom = {};
	var left, right, type;

	for (i = 0; i < inrules.length; i++) {
		var rule = inrules[i];
		var left = rule.left;
		var right = rule.right;
		var code = rule.code;
		var lrfunc, rlfunc;

		addtypes(left);
		addtypes(right);

		lrfunc = apply(left, right, code);
		addrule(custom, lrfunc);

		rlfunc = apply(right, left, code, true);
		addrule(custom, rlfunc);
	}

	for (i = 0; i < inconf.length; i++) {
		var eqn = inconf[i];
		var left = eqn.left;
		var right = eqn.right;

		addtypes(left);
		addtypes(right);
	}

	for (left in types) {
		var row = [];

		for (right in types) {
			var rules = custom[left + "><" + right];

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

		tab[types[left]] = row;

		typelist[types[left]] = left;
	}

	return tab;
}

function traverse(pair)
{
	var left = pair.left;
	var right = pair.right;
	var rules = pair.rules;
	var i;

	for (i = 0; i < rules.length; i++) {
		var rule = rules[i];
		var queue = rule.call(inenv, left, right);

		if (queue) {
			++rule.count;
			flush(queue);
			return;
		}
	}

	norules(left, right);
}

function reduce(max)
{
	var i;

	if (!max)
		max = 1e7;

	for (i = 0; i < max; i++) {
		var pair = inqueue.shift();

		if (!pair)
			break;

		traverse(pair);
	}
}

function flush(queue)
{
	var i;

	for (i = 0; i < queue.length; i++) {
		var pair = queue[i];
		var left = pair.left;
		var right = pair.right;
		var row = table[left.type];
		var rules = row[right.type];

		pair.rules = rules;

		if (rules.pseudo)
			rules(left, right);
		else
			inqueue.push(pair);
	}
}

function encode(lval, rval, tree, wires, rt)
{
	var node = tree.node;
	var code = node.code;
	var agent = node.agent;
	var type = types[agent];
	var pax = tree.pax;
	var imgpax = [];
	var i;

	for (i = 0; i < pax.length; i++) {
		var sub = pax[i];

		imgpax[i] = encode(lval, rval, sub, wires, rt);
	}

	pax = imgpax;
	tree = {
		type: type,
		pax: imgpax
	};

	if (wiretype == type) {
		var name = node.name;
		var wire = wires[name];

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
		var wire = pax.shift();
		var twin = wire.twin;
		var main = pax.shift();
		var aux = pax.shift();

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
		var effect = mkeffect(lval, rval, code, true);

		if (rt)
			tree.data = effect.call(inenv);
		else
			tree.effect = effect;
	}

	return tree;
}

function init()
{
	var wires = {};
	var queue = [];
	var effect = mkeffect(0, 0, inverb);
	var i;

	effect.call(inenv);

	for (i = 0; i < inconf.length; i++) {
		var eqn = inconf[i];
		var left = eqn.left;
		var right = eqn.right;

		queue.push({
			left: encode(0, 0, left, wires, true),
			right: encode(0, 0, right, wires, true)
		});
	}

	flush(queue);
}

function prepare(src, fmt, deadlock)
{
	var system = parser.parse(src);

	if (fmt)
		format = fmt;
	else
		format = noformat;

	ndebug = !deadlock;
	inverb = system.code;
	inrules = system.rules;
	inconf = system.conf;
	inenv = {};
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

	table = gettable();

	init();

	return inenv;
}

function getlist(pax)
{
	var list = [];
	var i;

	for (i = 0; i < pax.length; i++)
		list[i] = gettree(pax[i]);

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
	var type = agent.type;
	var human;

	if (wiretype == type) {
		human = agent.human;

		if (!human) {
			++nwires;
			human = "w" + nwires;
			agent.human = human;
		}

		agent.twin.human = human;
	} else if (ambtype == type) {
		var index = agent.index;
		var list = "";

		if (!index || (nambs < index)) {
			++nambs;
			index = nambs;
			agent.twin.index = nambs;

			list = getlist([
				agent.main,
				agent.aux
			]);
		}

		human = "\\amb#" + index + list;
	} else {
		var data = format(agent.data);

		if (void(0) == data)
			data = "";
		else
			data = "_{" + data + "}";

		type = typelist[type] + data;

		human = "\\" + type + getlist(agent.pax);
	}

	return human;
}

function geteqn(pair)
{
	var left = gettree(pair.left);
	var right = gettree(pair.right);

	return left + " = " + right + ";";
}

function getconf()
{
	var list = [];
	var i;

	nambs = 0;

	for (i = 0; i < inqueue.length; i++)
		list[i] = geteqn(inqueue[i]);

	return list.join("\n");
}

function debug()
{
	var conf = getconf();
	var pair;

	pair = inqueue.shift();
	if (pair)
		traverse(pair);

	return conf;
}

function debug0()
{
	var pair = inqueue.shift();

	if (pair) {
		traverse(pair);
		return true;
	}

	return false;
}

function debug1()
{
	var pair = inqueue.shift();
	var eqn;

	if (pair) {
		eqn = geteqn(pair);
		traverse(pair);
	}

	return eqn;
}

function getstats()
{
	var stats = {};
	var i;

	for (i = 0; i < table.length; i++) {
		var row = table[i];
		var j;

		for (j = 0; j < row.length; j++) {
			var cell = row[j];
			var k;

			if (cell.pseudo)
				continue;

			for (k = 0; k < cell.length; k++) {
				var rule = cell[k];
				var count = rule.count;
				var human = rule.human;

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
	var t0, t1;

	prepare(src);

	t0 = Date.now();
	reduce(max);
	t1 = Date.now();

	inenv.redtime = t1 - t0;
	inenv.stats = getstats();
	return inenv;
}

run.prepare = prepare;
run.debug = debug;
run.debug0 = debug0;
run.debug1 = debug1;

module.exports = run;
