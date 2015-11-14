This package provides an engine for evaluation of
interaction nets encoded in a language that is similar to
interaction calculus but lacks the notion of interface, or
interaction net's root.
Interaction rules are defined using Yves Lafont's notation.
Implementation implicitly extends interaction systems with
McCarthy's _amb_ as a nondeterministic agent and also allows
side effects written in JavaScript.

# Interface

`require("inet-lib")` returns a function of one string argument
that defines an interaction net to be evaluated.
When called, the function keeps applying interaction rules until
its normal form has been reached with no more active pairs left.
The returned value is a `this` object which all side effects are
executed with (initialized with `{}` before reduction starts).

For developing and testing purposes, the package also exports
two additional functions `.prepare(src, fmt)` and `.debug()`,
where `src` is a string that defines an interaction net, and
optional `fmt` argument is a user-defined function used to
format arbitrary data attached to agents in debug output.
The `.debug()` function applies a single reduction step to
the interaction net defined by the previous `.prepare(src, fmt)`
call and returns a human-readable string representation of
the current interaction net state.

# Grammar

Input consists of three parts separated with the `$$` delimiter:
interaction rules, initial configuration, and
optional initial side effect.
Side effects are written in JavaScript and executed during
reduction of the interaction net.

```
%token MARK /* "$$" */
%token NAME /* [A-Za-z][A-Za-z0-9]* */
%token CODE /* \{[^}]+\} */

%%

prog : rset MARK init tail
     ;
rset : /* empty */
     | rset side CODE side ';'
     ;
side : cell
     | cell '[' list ']'
     ;
tree : leaf
     | cell '(' list ')'
     ;
list : tree
     | tree ',' list
     ;
leaf : cell
     | NAME
     ;
cell : '\' NAME
     | '\' NAME '_' CODE
     ;
init : /* empty */
     | tree '=' tree ';' init
     ;
tail : /* empty */
     | MARK CODE
     ;
```