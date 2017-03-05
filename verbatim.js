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
	const wlen = wlist.length;
	const alen = alist.length;

	if (!wlist.length)
		return;

	for (let i = 0; i < wlen; i++) {
		const type = wlist[i].type;

		body.push(`const wire${i} = {type: ${type}};`);
	}

	for (let i = 0; i < alen; i++) {
		const tree = genclone(body, alist[i]);

		body.push(`const tree${i} = ${tree};`);
	}

	for (let i = 0; i < wlen; i++) {
		const wire = wlist[i];
		const twin = wire.twin.id;

		body.push(`wire${i}.twin = wire${twin};`);

		if (ambtype != wire.type)
			continue;

		body.push(`wire${i}.main = tree${wire.main};`);
		body.push(`wire${i}.aux = tree${wire.aux};`);
	}
}

function genclone(body, img)
{
	const type = img.type;
	const imgpax = img.pax;
	const pax = [];
	let iplen;

	if (lpaxtype == type)
		return `lpax[${img.id}]`;

	if (rpaxtype == type)
		return `rpax[${img.id}]`;

	if (wiretype == type)
		return `wire${img.id}`;

	if (ambtype == type)
		return `wire${img.id}`;

	iplen = imgpax.length;
	for (let i = 0; i < iplen; i++)
		pax[i] = genclone(body, imgpax[i]);

	return `{
		type: ${type},
		pax: [${pax.join(", ")}],
		data: ${geneff(img.effect)}
	}`;
}

function genqueue(body, img)
{
	const ilen = img.length;

	for (let i = 0; i < ilen; i++) {
		const pair = img[i];
		const left = genclone(body, pair.left);
		const right = genclone(body, pair.right);

		body.push(`flush(${left}, ${right});`);
	}
}

function generate(img, wlist, alist, effect, rl)
{
	const left = rl ? "right" : "left";
	const right = rl ? "left" : "right";
	const body = ["/* Generated code below. */"];

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
