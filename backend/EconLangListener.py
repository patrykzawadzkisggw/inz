# Generated from EconLang.g4 by ANTLR 4.13.2
from antlr4 import *
if "." in __name__:
    from .EconLangParser import EconLangParser
else:
    from EconLangParser import EconLangParser

# This class defines a complete listener for a parse tree produced by EconLangParser.
class EconLangListener(ParseTreeListener):

    # Enter a parse tree produced by EconLangParser#program.
    def enterProgram(self, ctx:EconLangParser.ProgramContext):
        pass

    # Exit a parse tree produced by EconLangParser#program.
    def exitProgram(self, ctx:EconLangParser.ProgramContext):
        pass


    # Enter a parse tree produced by EconLangParser#statement.
    def enterStatement(self, ctx:EconLangParser.StatementContext):
        pass

    # Exit a parse tree produced by EconLangParser#statement.
    def exitStatement(self, ctx:EconLangParser.StatementContext):
        pass


    # Enter a parse tree produced by EconLangParser#declaration.
    def enterDeclaration(self, ctx:EconLangParser.DeclarationContext):
        pass

    # Exit a parse tree produced by EconLangParser#declaration.
    def exitDeclaration(self, ctx:EconLangParser.DeclarationContext):
        pass


    # Enter a parse tree produced by EconLangParser#assignment.
    def enterAssignment(self, ctx:EconLangParser.AssignmentContext):
        pass

    # Exit a parse tree produced by EconLangParser#assignment.
    def exitAssignment(self, ctx:EconLangParser.AssignmentContext):
        pass


    # Enter a parse tree produced by EconLangParser#functionDef.
    def enterFunctionDef(self, ctx:EconLangParser.FunctionDefContext):
        pass

    # Exit a parse tree produced by EconLangParser#functionDef.
    def exitFunctionDef(self, ctx:EconLangParser.FunctionDefContext):
        pass


    # Enter a parse tree produced by EconLangParser#paramList.
    def enterParamList(self, ctx:EconLangParser.ParamListContext):
        pass

    # Exit a parse tree produced by EconLangParser#paramList.
    def exitParamList(self, ctx:EconLangParser.ParamListContext):
        pass


    # Enter a parse tree produced by EconLangParser#ifStatement.
    def enterIfStatement(self, ctx:EconLangParser.IfStatementContext):
        pass

    # Exit a parse tree produced by EconLangParser#ifStatement.
    def exitIfStatement(self, ctx:EconLangParser.IfStatementContext):
        pass


    # Enter a parse tree produced by EconLangParser#loopStatement.
    def enterLoopStatement(self, ctx:EconLangParser.LoopStatementContext):
        pass

    # Exit a parse tree produced by EconLangParser#loopStatement.
    def exitLoopStatement(self, ctx:EconLangParser.LoopStatementContext):
        pass


    # Enter a parse tree produced by EconLangParser#returnStatement.
    def enterReturnStatement(self, ctx:EconLangParser.ReturnStatementContext):
        pass

    # Exit a parse tree produced by EconLangParser#returnStatement.
    def exitReturnStatement(self, ctx:EconLangParser.ReturnStatementContext):
        pass


    # Enter a parse tree produced by EconLangParser#block.
    def enterBlock(self, ctx:EconLangParser.BlockContext):
        pass

    # Exit a parse tree produced by EconLangParser#block.
    def exitBlock(self, ctx:EconLangParser.BlockContext):
        pass


    # Enter a parse tree produced by EconLangParser#expression.
    def enterExpression(self, ctx:EconLangParser.ExpressionContext):
        pass

    # Exit a parse tree produced by EconLangParser#expression.
    def exitExpression(self, ctx:EconLangParser.ExpressionContext):
        pass


    # Enter a parse tree produced by EconLangParser#orExpr.
    def enterOrExpr(self, ctx:EconLangParser.OrExprContext):
        pass

    # Exit a parse tree produced by EconLangParser#orExpr.
    def exitOrExpr(self, ctx:EconLangParser.OrExprContext):
        pass


    # Enter a parse tree produced by EconLangParser#andExpr.
    def enterAndExpr(self, ctx:EconLangParser.AndExprContext):
        pass

    # Exit a parse tree produced by EconLangParser#andExpr.
    def exitAndExpr(self, ctx:EconLangParser.AndExprContext):
        pass


    # Enter a parse tree produced by EconLangParser#equalityExpr.
    def enterEqualityExpr(self, ctx:EconLangParser.EqualityExprContext):
        pass

    # Exit a parse tree produced by EconLangParser#equalityExpr.
    def exitEqualityExpr(self, ctx:EconLangParser.EqualityExprContext):
        pass


    # Enter a parse tree produced by EconLangParser#relationalExpr.
    def enterRelationalExpr(self, ctx:EconLangParser.RelationalExprContext):
        pass

    # Exit a parse tree produced by EconLangParser#relationalExpr.
    def exitRelationalExpr(self, ctx:EconLangParser.RelationalExprContext):
        pass


    # Enter a parse tree produced by EconLangParser#additiveExpr.
    def enterAdditiveExpr(self, ctx:EconLangParser.AdditiveExprContext):
        pass

    # Exit a parse tree produced by EconLangParser#additiveExpr.
    def exitAdditiveExpr(self, ctx:EconLangParser.AdditiveExprContext):
        pass


    # Enter a parse tree produced by EconLangParser#multiplicativeExpr.
    def enterMultiplicativeExpr(self, ctx:EconLangParser.MultiplicativeExprContext):
        pass

    # Exit a parse tree produced by EconLangParser#multiplicativeExpr.
    def exitMultiplicativeExpr(self, ctx:EconLangParser.MultiplicativeExprContext):
        pass


    # Enter a parse tree produced by EconLangParser#unaryExpr.
    def enterUnaryExpr(self, ctx:EconLangParser.UnaryExprContext):
        pass

    # Exit a parse tree produced by EconLangParser#unaryExpr.
    def exitUnaryExpr(self, ctx:EconLangParser.UnaryExprContext):
        pass


    # Enter a parse tree produced by EconLangParser#primary.
    def enterPrimary(self, ctx:EconLangParser.PrimaryContext):
        pass

    # Exit a parse tree produced by EconLangParser#primary.
    def exitPrimary(self, ctx:EconLangParser.PrimaryContext):
        pass


    # Enter a parse tree produced by EconLangParser#qid.
    def enterQid(self, ctx:EconLangParser.QidContext):
        pass

    # Exit a parse tree produced by EconLangParser#qid.
    def exitQid(self, ctx:EconLangParser.QidContext):
        pass


    # Enter a parse tree produced by EconLangParser#functionCall.
    def enterFunctionCall(self, ctx:EconLangParser.FunctionCallContext):
        pass

    # Exit a parse tree produced by EconLangParser#functionCall.
    def exitFunctionCall(self, ctx:EconLangParser.FunctionCallContext):
        pass


    # Enter a parse tree produced by EconLangParser#funcName.
    def enterFuncName(self, ctx:EconLangParser.FuncNameContext):
        pass

    # Exit a parse tree produced by EconLangParser#funcName.
    def exitFuncName(self, ctx:EconLangParser.FuncNameContext):
        pass


    # Enter a parse tree produced by EconLangParser#funcArgs.
    def enterFuncArgs(self, ctx:EconLangParser.FuncArgsContext):
        pass

    # Exit a parse tree produced by EconLangParser#funcArgs.
    def exitFuncArgs(self, ctx:EconLangParser.FuncArgsContext):
        pass


    # Enter a parse tree produced by EconLangParser#caseExpr.
    def enterCaseExpr(self, ctx:EconLangParser.CaseExprContext):
        pass

    # Exit a parse tree produced by EconLangParser#caseExpr.
    def exitCaseExpr(self, ctx:EconLangParser.CaseExprContext):
        pass


    # Enter a parse tree produced by EconLangParser#whenClause.
    def enterWhenClause(self, ctx:EconLangParser.WhenClauseContext):
        pass

    # Exit a parse tree produced by EconLangParser#whenClause.
    def exitWhenClause(self, ctx:EconLangParser.WhenClauseContext):
        pass


    # Enter a parse tree produced by EconLangParser#elseClause.
    def enterElseClause(self, ctx:EconLangParser.ElseClauseContext):
        pass

    # Exit a parse tree produced by EconLangParser#elseClause.
    def exitElseClause(self, ctx:EconLangParser.ElseClauseContext):
        pass


    # Enter a parse tree produced by EconLangParser#argList.
    def enterArgList(self, ctx:EconLangParser.ArgListContext):
        pass

    # Exit a parse tree produced by EconLangParser#argList.
    def exitArgList(self, ctx:EconLangParser.ArgListContext):
        pass


    # Enter a parse tree produced by EconLangParser#arg.
    def enterArg(self, ctx:EconLangParser.ArgContext):
        pass

    # Exit a parse tree produced by EconLangParser#arg.
    def exitArg(self, ctx:EconLangParser.ArgContext):
        pass


    # Enter a parse tree produced by EconLangParser#namedArg.
    def enterNamedArg(self, ctx:EconLangParser.NamedArgContext):
        pass

    # Exit a parse tree produced by EconLangParser#namedArg.
    def exitNamedArg(self, ctx:EconLangParser.NamedArgContext):
        pass


    # Enter a parse tree produced by EconLangParser#dataLoad.
    def enterDataLoad(self, ctx:EconLangParser.DataLoadContext):
        pass

    # Exit a parse tree produced by EconLangParser#dataLoad.
    def exitDataLoad(self, ctx:EconLangParser.DataLoadContext):
        pass


    # Enter a parse tree produced by EconLangParser#columns.
    def enterColumns(self, ctx:EconLangParser.ColumnsContext):
        pass

    # Exit a parse tree produced by EconLangParser#columns.
    def exitColumns(self, ctx:EconLangParser.ColumnsContext):
        pass


    # Enter a parse tree produced by EconLangParser#series.
    def enterSeries(self, ctx:EconLangParser.SeriesContext):
        pass

    # Exit a parse tree produced by EconLangParser#series.
    def exitSeries(self, ctx:EconLangParser.SeriesContext):
        pass


    # Enter a parse tree produced by EconLangParser#params.
    def enterParams(self, ctx:EconLangParser.ParamsContext):
        pass

    # Exit a parse tree produced by EconLangParser#params.
    def exitParams(self, ctx:EconLangParser.ParamsContext):
        pass


    # Enter a parse tree produced by EconLangParser#period.
    def enterPeriod(self, ctx:EconLangParser.PeriodContext):
        pass

    # Exit a parse tree produced by EconLangParser#period.
    def exitPeriod(self, ctx:EconLangParser.PeriodContext):
        pass


    # Enter a parse tree produced by EconLangParser#arrayExpr.
    def enterArrayExpr(self, ctx:EconLangParser.ArrayExprContext):
        pass

    # Exit a parse tree produced by EconLangParser#arrayExpr.
    def exitArrayExpr(self, ctx:EconLangParser.ArrayExprContext):
        pass


    # Enter a parse tree produced by EconLangParser#seriesOp.
    def enterSeriesOp(self, ctx:EconLangParser.SeriesOpContext):
        pass

    # Exit a parse tree produced by EconLangParser#seriesOp.
    def exitSeriesOp(self, ctx:EconLangParser.SeriesOpContext):
        pass


    # Enter a parse tree produced by EconLangParser#window.
    def enterWindow(self, ctx:EconLangParser.WindowContext):
        pass

    # Exit a parse tree produced by EconLangParser#window.
    def exitWindow(self, ctx:EconLangParser.WindowContext):
        pass


    # Enter a parse tree produced by EconLangParser#sqlQuery.
    def enterSqlQuery(self, ctx:EconLangParser.SqlQueryContext):
        pass

    # Exit a parse tree produced by EconLangParser#sqlQuery.
    def exitSqlQuery(self, ctx:EconLangParser.SqlQueryContext):
        pass


    # Enter a parse tree produced by EconLangParser#selectCore.
    def enterSelectCore(self, ctx:EconLangParser.SelectCoreContext):
        pass

    # Exit a parse tree produced by EconLangParser#selectCore.
    def exitSelectCore(self, ctx:EconLangParser.SelectCoreContext):
        pass


    # Enter a parse tree produced by EconLangParser#setOperator.
    def enterSetOperator(self, ctx:EconLangParser.SetOperatorContext):
        pass

    # Exit a parse tree produced by EconLangParser#setOperator.
    def exitSetOperator(self, ctx:EconLangParser.SetOperatorContext):
        pass


    # Enter a parse tree produced by EconLangParser#tableRef.
    def enterTableRef(self, ctx:EconLangParser.TableRefContext):
        pass

    # Exit a parse tree produced by EconLangParser#tableRef.
    def exitTableRef(self, ctx:EconLangParser.TableRefContext):
        pass


    # Enter a parse tree produced by EconLangParser#alias.
    def enterAlias(self, ctx:EconLangParser.AliasContext):
        pass

    # Exit a parse tree produced by EconLangParser#alias.
    def exitAlias(self, ctx:EconLangParser.AliasContext):
        pass


    # Enter a parse tree produced by EconLangParser#joinClause.
    def enterJoinClause(self, ctx:EconLangParser.JoinClauseContext):
        pass

    # Exit a parse tree produced by EconLangParser#joinClause.
    def exitJoinClause(self, ctx:EconLangParser.JoinClauseContext):
        pass


    # Enter a parse tree produced by EconLangParser#groupByList.
    def enterGroupByList(self, ctx:EconLangParser.GroupByListContext):
        pass

    # Exit a parse tree produced by EconLangParser#groupByList.
    def exitGroupByList(self, ctx:EconLangParser.GroupByListContext):
        pass


    # Enter a parse tree produced by EconLangParser#limitClause.
    def enterLimitClause(self, ctx:EconLangParser.LimitClauseContext):
        pass

    # Exit a parse tree produced by EconLangParser#limitClause.
    def exitLimitClause(self, ctx:EconLangParser.LimitClauseContext):
        pass


    # Enter a parse tree produced by EconLangParser#selectItems.
    def enterSelectItems(self, ctx:EconLangParser.SelectItemsContext):
        pass

    # Exit a parse tree produced by EconLangParser#selectItems.
    def exitSelectItems(self, ctx:EconLangParser.SelectItemsContext):
        pass


    # Enter a parse tree produced by EconLangParser#tableStar.
    def enterTableStar(self, ctx:EconLangParser.TableStarContext):
        pass

    # Exit a parse tree produced by EconLangParser#tableStar.
    def exitTableStar(self, ctx:EconLangParser.TableStarContext):
        pass


    # Enter a parse tree produced by EconLangParser#selectItem.
    def enterSelectItem(self, ctx:EconLangParser.SelectItemContext):
        pass

    # Exit a parse tree produced by EconLangParser#selectItem.
    def exitSelectItem(self, ctx:EconLangParser.SelectItemContext):
        pass


    # Enter a parse tree produced by EconLangParser#aggFunc.
    def enterAggFunc(self, ctx:EconLangParser.AggFuncContext):
        pass

    # Exit a parse tree produced by EconLangParser#aggFunc.
    def exitAggFunc(self, ctx:EconLangParser.AggFuncContext):
        pass


    # Enter a parse tree produced by EconLangParser#aggArith.
    def enterAggArith(self, ctx:EconLangParser.AggArithContext):
        pass

    # Exit a parse tree produced by EconLangParser#aggArith.
    def exitAggArith(self, ctx:EconLangParser.AggArithContext):
        pass


    # Enter a parse tree produced by EconLangParser#aggTerm.
    def enterAggTerm(self, ctx:EconLangParser.AggTermContext):
        pass

    # Exit a parse tree produced by EconLangParser#aggTerm.
    def exitAggTerm(self, ctx:EconLangParser.AggTermContext):
        pass


    # Enter a parse tree produced by EconLangParser#source.
    def enterSource(self, ctx:EconLangParser.SourceContext):
        pass

    # Exit a parse tree produced by EconLangParser#source.
    def exitSource(self, ctx:EconLangParser.SourceContext):
        pass


    # Enter a parse tree produced by EconLangParser#idList.
    def enterIdList(self, ctx:EconLangParser.IdListContext):
        pass

    # Exit a parse tree produced by EconLangParser#idList.
    def exitIdList(self, ctx:EconLangParser.IdListContext):
        pass


    # Enter a parse tree produced by EconLangParser#exprList.
    def enterExprList(self, ctx:EconLangParser.ExprListContext):
        pass

    # Exit a parse tree produced by EconLangParser#exprList.
    def exitExprList(self, ctx:EconLangParser.ExprListContext):
        pass


    # Enter a parse tree produced by EconLangParser#orderList.
    def enterOrderList(self, ctx:EconLangParser.OrderListContext):
        pass

    # Exit a parse tree produced by EconLangParser#orderList.
    def exitOrderList(self, ctx:EconLangParser.OrderListContext):
        pass


    # Enter a parse tree produced by EconLangParser#orderItem.
    def enterOrderItem(self, ctx:EconLangParser.OrderItemContext):
        pass

    # Exit a parse tree produced by EconLangParser#orderItem.
    def exitOrderItem(self, ctx:EconLangParser.OrderItemContext):
        pass



del EconLangParser