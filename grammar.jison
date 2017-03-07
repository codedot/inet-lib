%lex

%s CONF TAIL

%%

<TAIL>(.|\n)*<<EOF>> return "CODE";

\s+ /* skip whitespace */

\{[^}]+\} return "CODE";

[A-Za-z][A-Za-z0-9]* return "NAME";

<CONF>"$$" %{ this.begin("TAIL"); return "MARK"; %}
"$$" %{ this.begin("CONF"); return "MARK"; %}
";" return ";";
<INITIAL>"[" return "[";
<INITIAL>"]" return "]";
"(" return "(";
")" return ")";
"," return ",";
<CONF>"!" return "!";
"\\" return "\\";
"_" return "_";
<CONF>"=" return "=";

/lex

%token MARK NAME CODE

%%

prog : rset MARK init tail {return {rules: $1, conf: $3, code: $4};}
     ;
rset : /* empty */ {$$ = [];}
     | rset side CODE side ';' {$1.push({left: $2, right: $4, code: $3}); $$ = $1;}
     ;
side : cell {$$ = {node: $1, pax: []};}
     | cell '[' list ']' {$$ = {node: $1, pax: $3};}
     ;
tree : leaf {$$ = {node: $1, pax: []};}
     | cell '(' list ')' {$$ = {node: $1, pax: $3};}
     ;
list : tree {$$ = [$1];}
     | list ',' tree {$1.push($3); $$ = $1;}
     ;
leaf : cell
     | NAME {$$ = {agent: "wire", name: $1};}
     ;
cell : need NAME {$$ = {agent: $2, need: $1, code: ""};}
     | need NAME '_' CODE {$$ = {agent: $2, need: $1, code: $4.slice(1, -1)};}
     ;
need : '!' {$$ = true;}
     | '\' {$$ = false;}
     ;
init : /* empty */ {$$ = [];}
     | init tree '=' tree ';' {$1.push({left: $2, right: $4}); $$ = $1;}
     ;
tail : /* empty */ {$$ = "";}
     | MARK CODE {$$ = $2;}
     ;
