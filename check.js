var inet = require("./index");
var fs = require("fs");

var file = process.argv[2];

if (file) {
	var input = fs.readFileSync(file, "utf8");
	var conf;

	inet.prepare(input);

	while (conf = inet.debug())
		console.log("$$\n%s", conf);

	console.log("$$");
} else {
	var example = fs.readFileSync("example.in", "utf8");
	var output = inet(example);

	console.info("%s(%s)", output.total, output.beta);
	console.log(output.nf);
}
