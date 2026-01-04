grammar EconLang;

program: statement* EOF;

statement
    : declaration ';'
    | assignment ';'
    | functionDef
    | ifStatement
    | loopStatement
    | returnStatement
    | expression ';'
    ;

declaration: 'let' ID '=' expression;
assignment: ID '=' expression;
functionDef: 'function' ID '(' paramList? ')' block ;
paramList: ID (',' ID)* ;
ifStatement: 'if' '(' expression ')' block ('else' block)? ;
loopStatement: 'for' ID 'in' expression block
             | 'while' '(' expression ')' block ;
returnStatement: 'return' expression ';' ;
block: '{' statement* '}' ;

expression: orExpr;
orExpr: andExpr (OR andExpr)*;
andExpr: equalityExpr (AND equalityExpr)*;
equalityExpr: relationalExpr ((EQ | NEQ) relationalExpr)*;

relationalExpr
        : additiveExpr (
                (LT | LE | GT | GE) additiveExpr
                | (NOT)? BETWEENKW additiveExpr AND additiveExpr
                | (NOT)? IN '(' (exprList | sqlQuery) ')'
                | ISKW (NOT)? NULLKW
                | (NOT)? (LIKEKW | ILIKEKW) additiveExpr
            )*
        | EXISTSKW '(' sqlQuery ')'
        ;
additiveExpr: multiplicativeExpr ((ADD | SUB) multiplicativeExpr)*;
multiplicativeExpr: unaryExpr ((MUL | DIV) unaryExpr)*;
unaryExpr
    : NOT unaryExpr
    | primary ;
primary
    : functionCall
    | dataLoad
    | '(' sqlQuery ')'
    | sqlQuery
    | caseExpr
    | arrayExpr
    | AT_VAR
    | qid
    | NUMBER
    | STRING
    | DATE
    | '(' expression ')' ;

qid: ID ('.' ID)* ;

functionCall: funcName '(' funcArgs? ')' ;
funcName: ID | AT_VAR | AVG | MIN | MAX | COUNT | SUM | MEAN | IF ;


funcArgs
    : DISTINCTKW arg (',' arg)*    
    | argList                      
    ;

caseExpr
    : CASEKW expression? whenClause+ elseClause? ENDKW
    ;
whenClause
    : WHENKW expression THENKW expression
    ;
elseClause
    : ELSE expression
    ;

argList: arg (',' arg)* ;
arg: namedArg | expression | MUL ;
namedArg: ID '=' expression ;
dataLoad: 'load' '_' ( 'csv' | 'json' ) '(' STRING ',' columns? ')' ;
columns: '[' ID (',' ID)* ']';
series: ID | expression;
params: ID '=' NUMBER (',' ID '=' NUMBER)*;
period: NUMBER;
arrayExpr
    : '[' (expression (',' expression)*)? ']'
    | seriesOp ;
seriesOp
    : ID 'agg' '_' ( 'mean' | 'sum' | 'std' ) '(' window? ')'
    | ID '.' ( 'filter' | 'shift' ) '(' NUMBER ')' ;
window: 'from' DATE 'to' DATE;
sqlQuery
    : selectCore (setOperator selectCore)*
      (ORDERKW BYKW orderList)?
      (limitClause)?
    ;

selectCore
    : SELECTKW (DISTINCTKW | ALLKW)? selectItems
      (FROM tableRef (joinClause)*)?
      (WHEREKW expression)?
      (GROUPKW BYKW groupByList)?
      (HAVINGKW expression)?
    ;

setOperator
    : UNIONKW (ALLKW)?
    | INTERSECTKW
    | EXCEPTKW
    ;

tableRef
    : source alias?
    ;

alias
    : (AS ID)
    | ID
    ;

joinClause
    : (NATURALKW)? (INNERKW | LEFTKW | RIGHTKW | FULLKW | CROSSKW)? (OUTERKW)? JOINKW tableRef (ONKW expression | USINGKW '(' idList ')')
    ;

groupByList
    : expression (',' expression)*
    ;

limitClause
    : LIMITKW (NUMBER | AT_VAR) (OFFSETKW (NUMBER | AT_VAR))?
    | OFFSETKW (NUMBER | AT_VAR) (LIMITKW (NUMBER | AT_VAR))?
    ;

selectItems: '*' | tableStar | selectItem (',' selectItem)* ;
tableStar: ID '.' '*';
selectItem: expression (AS ID)? ;
aggFunc: SUM | MEAN | AVG | MIN | MAX | COUNT ;

aggArith: aggTerm ((ADD | SUB | MUL | DIV) aggTerm)* ;
aggTerm: '(' aggArith ')'
    | aggFunc '(' (ID | MUL) ')'            
    | (ID|AT_VAR) '(' ( (ID|NUMBER|MUL) (',' (ID|NUMBER|MUL))* )? ')'
    | ID
    | AT_VAR
    | MUL                                  
    ;

source: ID | functionCall | dataLoad | '(' sqlQuery ')';
idList: (ID|AT_VAR) (',' (ID|AT_VAR))* ;
exprList: expression (',' expression)* ;
orderList: orderItem (',' orderItem)* ;
orderItem: (expression | NUMBER) (ASC | DESC)? (NULLS (FIRST | LAST))? ;



LET: 'let';
FUNCTION: 'function';
RETURN: 'return';
IF: 'if';
ELSE: 'else';
FOR: 'for';
IN: 'in';
WHILE: 'while';
ALERT: 'alert';
EMAIL: 'email';
LOAD: 'load';
CSV: 'csv';
JSON: 'json';
FORECAST: 'forecast';
ARIMA: 'arima';
EXPONENTIAL: 'exponential';
INDICATOR: 'indicator';
RSI: 'rsi';
MACD: 'macd';
INFLATION: 'inflation';
AGG: 'agg';
MEAN: 'mean';
SUM: 'sum';
STD: 'std';
FROM: 'from';
TO: 'to';
FILTER: 'filter';
SHIFT: 'shift';
AND: 'and' | '&&';
OR: 'or' | '||';
NOT: 'not';

SELECTKW: 'select';
WHEREKW: 'where';
GROUPKW: 'group';
BYKW: 'by';
ORDERKW: 'order';
LIMITKW: 'limit';
OFFSETKW: 'offset';
ASC: 'asc';
DESC: 'desc';
AS: 'as';
AVG: 'avg';
MIN: 'min';
MAX: 'max';
COUNT: 'count';
DISTINCTKW: 'distinct';
ALLKW: 'all';
JOINKW: 'join';
INNERKW: 'inner';
LEFTKW: 'left';
RIGHTKW: 'right';
FULLKW: 'full';
OUTERKW: 'outer';
CROSSKW: 'cross';
NATURALKW: 'natural';
ONKW: 'on';
USINGKW: 'using';
HAVINGKW: 'having';
QUALIFYKW: 'qualify';
UNIONKW: 'union';
INTERSECTKW: 'intersect';
EXCEPTKW: 'except';
NULLS: 'nulls';
FIRST: 'first';
LAST: 'last';
BETWEENKW: 'between';
LIKEKW: 'like';
ILIKEKW: 'ilike';
ISKW: 'is';
NULLKW: 'null';
EXISTSKW: 'exists';
CASEKW: 'case';
WHENKW: 'when';
THENKW: 'then';
ENDKW: 'end';

MUL: '*';
DIV: '/';
ADD: '+';
SUB: '-';
EQ: '=';
NEQ: '!=' | '<>';
LT: '<';
GT: '>';
LE: '<=';
GE: '>=';

ID: [a-zA-Z_][a-zA-Z0-9_]* ; 
AT_VAR: '@' [a-zA-Z_][a-zA-Z0-9_]* ;
NUMBER: [0-9]+ ('.' [0-9]+)? ;
STRING: '"' (~["\\] | '\\' .)* '"' ;
DATE: DIGIT DIGIT DIGIT DIGIT '-' DIGIT DIGIT '-' DIGIT DIGIT ;
fragment DIGIT: [0-9] ;
WS: [ \t\r\n]+ -> skip ;
COMMENT: '/*' .*? '*/' -> skip ;
LINE_COMMENT: '//' ~[\r\n]* -> skip ;