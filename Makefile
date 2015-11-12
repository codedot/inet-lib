JISON = node_modules/.bin/jison

all: grammar.js
	node check.js debug.in >debug.tmp
	tail debug.tmp
	time -p node check.js

$(JISON):
	npm install jison

clean:
	-rm -f *.tmp
	-rm -fr node_modules

.POSIX:

.SUFFIXES: .jison .js

.jison.js:
	$(MAKE) $(JISON)
	$(JISON) $< -o $*.tmp -m js
	printf '\nmodule.exports = parser;\n' >>$*.tmp
	mv $*.tmp $@
