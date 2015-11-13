This is a package to evaluate interaction nets encoded in
a language similar to interaction calculus.
Interaction rules are extended with side effects,
the latter ones being described directly in JavaScript.
The package exports a function which takes one string argument
that defines the interaction net to be evaluated, and applies
interaction rules until there are no more active pairs left.

# Debug

For developing and testing purposes, the package also exports
two additional functions `.prepare(src, fmt)` and `.debug()`,
where `src` is a string that defines an interaction net, and
optional `fmt` argument is a user-defined function used to
format arbitrary data attached to agents in debug output.
The `.debug()` function applies a single reduction step to
the interaction net defined by the previous `.prepare(src, fmt)`
call and returns a human-readable string representation of
the current interaction net state.
