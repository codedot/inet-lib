"use strict";

const ambtype = 1;
const wiretype = 0;
const lpaxtype = -1;
const rpaxtype = -2;

function geneff(effect)
{
	return `(${effect.toString()}).call(this, lval, rval)`;
}

function gentwins(body, wlist, alist)
{
	if (!wlist.length)
		return;

	wlist.forEach((wire, i) => {
		const type = wire.type;

		body.push(`const wire${i} = {type: ${type}};`);
	});

	alist.forEach((amb, i) => {
		const tree = genclone(body, amb);

		body.push(`const tree${i} = ${tree};`);
	});

	wlist.forEach((wire, i) => {
		const twin = wire.twin.id;

		body.push(`wire${i}.twin = wire${twin};`);

		if (ambtype != wire.type)
			return;

		body.push(`wire${i}.main = tree${wire.main};`);
		body.push(`tree${wire.main}.parent = wire${i};`);

		body.push(`wire${i}.aux = tree${wire.aux};`);
		body.push(`tree${wire.aux}.parent = wire${i};`);
	});
}

function genclone(body, img)
{
	const type = img.type;
	let pax, node;

	if (lpaxtype == type)
		return `lpax[${img.id}]`;

	if (rpaxtype == type)
		return `rpax[${img.id}]`;

	if (wiretype == type)
		return `wire${img.id}`;

	if (ambtype == type) {
		if (img.need)
			body.push(`wire${img.id}.need = true;`);

		return `wire${img.id}`;
	}

	node = `node${body.nnodes}`;
	body.push(`const ${node} = {
		type: ${type},
		data: ${geneff(img.effect)}
	};`);
	++body.nnodes;

	pax = img.pax.map(child => {
		child = genclone(body, child);

		body.push(`${child}.parent = ${node};`);

		return child;
	});

	body.push(`${node}.pax = [${pax.join(", ")}];`);

	if (img.need)
		body.push(`${node}.need = true;`);

	return node;
}

function genqueue(body, img)
{
	img.forEach(pair => {
		pair.left = genclone(body, pair.left);
		pair.right = genclone(body, pair.right);
	});

	img.forEach(pair => {
		body.push(`flush(${pair.left}, ${pair.right});`);
	});
}

function generate(img, wlist, alist, effect, rl)
{
	const left = rl ? "right" : "left";
	const right = rl ? "left" : "right";
	const body = ["/* Generated code below. */"];

	body.nnodes = 0;
	gentwins(body, wlist, alist);
	genqueue(body, img);

	return new Function("flush", "left", "right", `
		const lval = ${left}.data;
		const rval = ${right}.data;

		if (!${geneff(effect)})
			return;

		const lpax = left.pax;
		const rpax = right.pax;

		left.parent = void(0);
		left.data = void(0);
		left.pax = void(0);
		right.parent = void(0);
		right.data = void(0);
		right.pax = void(0);

		${body.join("\n")}

		return true;
	`);
}

function mkeffect(lval, rval, code, expr)
{
	const left = lval ? lval : "LVAL";
	const right = rval ? rval : "RVAL";

	return new Function(left, right, expr ? `
		return ${code ? code : "void(0)"};
	` : `${code}
		return true;
	`);
}

exports.generate = generate;
exports.mkeffect = mkeffect;
