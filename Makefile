JISON = node_modules/.bin/jison

all: grammar.js

$(JISON):
	npm install jison

clean:
	-rm -f grammar.js
	-rm -fr node_modules

.POSIX:

.SUFFIXES: .jison .js

.jison.js:
	$(MAKE) $(JISON)
	$(JISON) $< -o $*.tmp -m js
	printf '\nmodule.exports = parser;\n' >>$*.tmp
	mv $*.tmp $@
