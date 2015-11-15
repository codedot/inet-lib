This package provides an engine for evaluation of
interaction nets encoded in a language that is similar to
interaction calculus but lacks the notion of interface, or
interaction net's root.
Interaction rules are defined using Yves Lafont's notation.
Implementation implicitly extends interaction systems with
McCarthy's _amb_ as a nondeterministic agent and also allows
side effects written in JavaScript.

# Demo

This engine was previously developed in the context of
Macro Lambda Calculus (MLC), implementation of call-by-need
lambda calculus for Web using interaction nets:

https://codedot.github.io/lambda/

Now, MLC uses this package as a low-level programming language
in order to translate lambda terms into and implement readback
also without leaving the formalism of interaction nets.

# Interface

`require("inet-lib")` returns a function of one string argument
that defines an interaction net to be evaluated.
When called, the function keeps applying interaction rules until
its normal form has been reached with no more active pairs left,
then returns `this` object which all side effects are executed
with (initialized to `{}` before reduction starts).

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

Input consists of three parts: interaction rules,
initial configuration, and optional initial side effect.

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
     | list ',' tree
     ;
leaf : cell
     | NAME
     ;
cell : '\' NAME
     | '\' NAME '_' CODE
     ;
init : /* empty */
     | init tree '=' tree ';'
     ;
tail : /* empty */
     | MARK CODE
     ;
```

# License

Copyright (c) 2015 Anton Salikhmetov

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.  IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.
