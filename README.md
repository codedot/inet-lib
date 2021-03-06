This package provides an engine for evaluation of
interaction nets encoded in a language that is similar to
the refined interaction calculus as described in
[arXiv:1702.06092][1].
Implementation implicitly extends interaction systems with
McCarthy's _amb_ as a nondeterministic agent and also allows
side effects written in JavaScript.

This engine is used by [Macro Lambda Calculus][2].

[1]: https://arxiv.org/abs/1702.06092
[2]: https://www.npmjs.com/package/@alexo/lambda

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
cell : need NAME
     | need NAME '_' CODE
     ;
need : '!'
     | '\'
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
