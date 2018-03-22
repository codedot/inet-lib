all: compile.js
	node test debug.in
	node test

compile.js: grammar.jison
	npm install --no-save jison@0.4.18
	node_modules/.bin/jison $< -o $@

clean:
	-rm -fr node_modules
