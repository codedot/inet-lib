var inet = require("./index");
var fs = require("fs");

var file = process.argv[2];

function obj2mlc(obj)
{
	var node;

	if (!obj)
		obj = this;

	node = obj.node;

	if ("atom" == node)
		return obj.name;

	if ("abst" == node) {
		var body = obj2mlc(obj.body);
		var sep;

		if ("abst" == obj.body.node)
			sep = ", ";
		else
			sep = ": ";

		return obj.var + sep + body;
	}

	if ("appl" == node) {
		var left = obj2mlc(obj.left);
		var right = obj2mlc(obj.right);

		if ("abst" == obj.left.node)
			left = "(" + left + ")";

		if ("abst" == obj.right.node)
			right = "(" + right + ")";

		if ("appl" == obj.right.node)
			right = "(" + right + ")";

		return left + " " + right;
	}

	return "[ ]";
}

function format(data)
{
	if ("object" == typeof data)
		return obj2mlc(data);
	else if ("number" == typeof data)
		return data.toString();
	else
		return data;
}

if (file) {
	var input = fs.readFileSync(file, "utf8");
	var eqn;

	inet.prepare(input, format);

	while (eqn = inet.debug1())
		console.log(eqn);
} else {
	var example = fs.readFileSync("example.in", "utf8");
	var output = inet(example);

	console.info("%s(%s)", output.total, output.beta);
	console.log(obj2mlc(output.nf));
}
