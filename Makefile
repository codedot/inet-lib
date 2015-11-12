JISON = node_modules/.bin/jison

all: compile.js
	node test.js debug.in >debug.tmp
	tail debug.tmp
	time -p node test.js

compile.js: grammar.jison
	$(MAKE) $(JISON)
	$(JISON) $< -o $*.tmp -m js
	printf '\nmodule.exports = parser;\n' >>$*.tmp
	mv $*.tmp $@

$(JISON):
	npm install jison

clean:
	-rm -f *.tmp
	-rm -fr node_modules
