# Generated from EconLang.g4 by ANTLR 4.13.2
from antlr4 import *
if "." in __name__:
    from .EconLangParser import EconLangParser
else:
    from EconLangParser import EconLangParser

# This class defines a complete generic visitor for a parse tree produced by EconLangParser.

class EconLangVisitor(ParseTreeVisitor):

    # Visit a parse tree produced by EconLangParser#program.
    def visitProgram(self, ctx:EconLangParser.ProgramContext):
        return self.visitChildren(ctx)


    # Visit a parse tree produced by EconLangParser#statement.
    def visitStatement(self, ctx:EconLangParser.StatementContext):
        return self.visitChildren(ctx)


    # Visit a parse tree produced by EconLangParser#declaration.
    def visitDeclaration(self, ctx:EconLangParser.DeclarationContext):
        return self.visitChildren(ctx)


    # Visit a parse tree produced by EconLangParser#assignment.
    def visitAssignment(self, ctx:EconLangParser.AssignmentContext):
        return self.visitChildren(ctx)


    # Visit a parse tree produced by EconLangParser#functionDef.
    def visitFunctionDef(self, ctx:EconLangParser.FunctionDefContext):
        return self.visitChildren(ctx)


    # Visit a parse tree produced by EconLangParser#paramList.
    def visitParamList(self, ctx:EconLangParser.ParamListContext):
        return self.visitChildren(ctx)


    # Visit a parse tree produced by EconLangParser#ifStatement.
    def visitIfStatement(self, ctx:EconLangParser.IfStatementContext):
        return self.visitChildren(ctx)


    # Visit a parse tree produced by EconLangParser#loopStatement.
    def visitLoopStatement(self, ctx:EconLangParser.LoopStatementContext):
        return self.visitChildren(ctx)


    # Visit a parse tree produced by EconLangParser#returnStatement.
    def visitReturnStatement(self, ctx:EconLangParser.ReturnStatementContext):
        return self.visitChildren(ctx)


    # Visit a parse tree produced by EconLangParser#block.
    def visitBlock(self, ctx:EconLangParser.BlockContext):
        return self.visitChildren(ctx)


    # Visit a parse tree produced by EconLangParser#expression.
    def visitExpression(self, ctx:EconLangParser.ExpressionContext):
        return self.visitChildren(ctx)


    # Visit a parse tree produced by EconLangParser#orExpr.
    def visitOrExpr(self, ctx:EconLangParser.OrExprContext):
        return self.visitChildren(ctx)


    # Visit a parse tree produced by EconLangParser#andExpr.
    def visitAndExpr(self, ctx:EconLangParser.AndExprContext):
        return self.visitChildren(ctx)


    # Visit a parse tree produced by EconLangParser#equalityExpr.
    def visitEqualityExpr(self, ctx:EconLangParser.EqualityExprContext):
        return self.visitChildren(ctx)


    # Visit a parse tree produced by EconLangParser#relationalExpr.
    def visitRelationalExpr(self, ctx:EconLangParser.RelationalExprContext):
        return self.visitChildren(ctx)


    # Visit a parse tree produced by EconLangParser#additiveExpr.
    def visitAdditiveExpr(self, ctx:EconLangParser.AdditiveExprContext):
        return self.visitChildren(ctx)


    # Visit a parse tree produced by EconLangParser#multiplicativeExpr.
    def visitMultiplicativeExpr(self, ctx:EconLangParser.MultiplicativeExprContext):
        return self.visitChildren(ctx)


    # Visit a parse tree produced by EconLangParser#unaryExpr.
    def visitUnaryExpr(self, ctx:EconLangParser.UnaryExprContext):
        return self.visitChildren(ctx)


    # Visit a parse tree produced by EconLangParser#primary.
    def visitPrimary(self, ctx:EconLangParser.PrimaryContext):
        return self.visitChildren(ctx)


    # Visit a parse tree produced by EconLangParser#qid.
    def visitQid(self, ctx:EconLangParser.QidContext):
        return self.visitChildren(ctx)


    # Visit a parse tree produced by EconLangParser#functionCall.
    def visitFunctionCall(self, ctx:EconLangParser.FunctionCallContext):
        return self.visitChildren(ctx)


    # Visit a parse tree produced by EconLangParser#funcName.
    def visitFuncName(self, ctx:EconLangParser.FuncNameContext):
        return self.visitChildren(ctx)


    # Visit a parse tree produced by EconLangParser#funcArgs.
    def visitFuncArgs(self, ctx:EconLangParser.FuncArgsContext):
        return self.visitChildren(ctx)


    # Visit a parse tree produced by EconLangParser#caseExpr.
    def visitCaseExpr(self, ctx:EconLangParser.CaseExprContext):
        return self.visitChildren(ctx)


    # Visit a parse tree produced by EconLangParser#whenClause.
    def visitWhenClause(self, ctx:EconLangParser.WhenClauseContext):
        return self.visitChildren(ctx)


    # Visit a parse tree produced by EconLangParser#elseClause.
    def visitElseClause(self, ctx:EconLangParser.ElseClauseContext):
        return self.visitChildren(ctx)


    # Visit a parse tree produced by EconLangParser#argList.
    def visitArgList(self, ctx:EconLangParser.ArgListContext):
        return self.visitChildren(ctx)


    # Visit a parse tree produced by EconLangParser#arg.
    def visitArg(self, ctx:EconLangParser.ArgContext):
        return self.visitChildren(ctx)


    # Visit a parse tree produced by EconLangParser#namedArg.
    def visitNamedArg(self, ctx:EconLangParser.NamedArgContext):
        return self.visitChildren(ctx)


    # Visit a parse tree produced by EconLangParser#dataLoad.
    def visitDataLoad(self, ctx:EconLangParser.DataLoadContext):
        return self.visitChildren(ctx)


    # Visit a parse tree produced by EconLangParser#columns.
    def visitColumns(self, ctx:EconLangParser.ColumnsContext):
        return self.visitChildren(ctx)


    # Visit a parse tree produced by EconLangParser#series.
    def visitSeries(self, ctx:EconLangParser.SeriesContext):
        return self.visitChildren(ctx)


    # Visit a parse tree produced by EconLangParser#params.
    def visitParams(self, ctx:EconLangParser.ParamsContext):
        return self.visitChildren(ctx)


    # Visit a parse tree produced by EconLangParser#period.
    def visitPeriod(self, ctx:EconLangParser.PeriodContext):
        return self.visitChildren(ctx)


    # Visit a parse tree produced by EconLangParser#arrayExpr.
    def visitArrayExpr(self, ctx:EconLangParser.ArrayExprContext):
        return self.visitChildren(ctx)


    # Visit a parse tree produced by EconLangParser#seriesOp.
    def visitSeriesOp(self, ctx:EconLangParser.SeriesOpContext):
        return self.visitChildren(ctx)


    # Visit a parse tree produced by EconLangParser#window.
    def visitWindow(self, ctx:EconLangParser.WindowContext):
        return self.visitChildren(ctx)


    # Visit a parse tree produced by EconLangParser#sqlQuery.
    def visitSqlQuery(self, ctx:EconLangParser.SqlQueryContext):
        return self.visitChildren(ctx)


    # Visit a parse tree produced by EconLangParser#selectCore.
    def visitSelectCore(self, ctx:EconLangParser.SelectCoreContext):
        return self.visitChildren(ctx)


    # Visit a parse tree produced by EconLangParser#setOperator.
    def visitSetOperator(self, ctx:EconLangParser.SetOperatorContext):
        return self.visitChildren(ctx)


    # Visit a parse tree produced by EconLangParser#tableRef.
    def visitTableRef(self, ctx:EconLangParser.TableRefContext):
        return self.visitChildren(ctx)


    # Visit a parse tree produced by EconLangParser#alias.
    def visitAlias(self, ctx:EconLangParser.AliasContext):
        return self.visitChildren(ctx)


    # Visit a parse tree produced by EconLangParser#joinClause.
    def visitJoinClause(self, ctx:EconLangParser.JoinClauseContext):
        return self.visitChildren(ctx)


    # Visit a parse tree produced by EconLangParser#groupByList.
    def visitGroupByList(self, ctx:EconLangParser.GroupByListContext):
        return self.visitChildren(ctx)


    # Visit a parse tree produced by EconLangParser#limitClause.
    def visitLimitClause(self, ctx:EconLangParser.LimitClauseContext):
        return self.visitChildren(ctx)


    # Visit a parse tree produced by EconLangParser#selectItems.
    def visitSelectItems(self, ctx:EconLangParser.SelectItemsContext):
        return self.visitChildren(ctx)


    # Visit a parse tree produced by EconLangParser#tableStar.
    def visitTableStar(self, ctx:EconLangParser.TableStarContext):
        return self.visitChildren(ctx)


    # Visit a parse tree produced by EconLangParser#selectItem.
    def visitSelectItem(self, ctx:EconLangParser.SelectItemContext):
        return self.visitChildren(ctx)


    # Visit a parse tree produced by EconLangParser#aggFunc.
    def visitAggFunc(self, ctx:EconLangParser.AggFuncContext):
        return self.visitChildren(ctx)


    # Visit a parse tree produced by EconLangParser#aggArith.
    def visitAggArith(self, ctx:EconLangParser.AggArithContext):
        return self.visitChildren(ctx)


    # Visit a parse tree produced by EconLangParser#aggTerm.
    def visitAggTerm(self, ctx:EconLangParser.AggTermContext):
        return self.visitChildren(ctx)


    # Visit a parse tree produced by EconLangParser#source.
    def visitSource(self, ctx:EconLangParser.SourceContext):
        return self.visitChildren(ctx)


    # Visit a parse tree produced by EconLangParser#idList.
    def visitIdList(self, ctx:EconLangParser.IdListContext):
        return self.visitChildren(ctx)


    # Visit a parse tree produced by EconLangParser#exprList.
    def visitExprList(self, ctx:EconLangParser.ExprListContext):
        return self.visitChildren(ctx)


    # Visit a parse tree produced by EconLangParser#orderList.
    def visitOrderList(self, ctx:EconLangParser.OrderListContext):
        return self.visitChildren(ctx)


    # Visit a parse tree produced by EconLangParser#orderItem.
    def visitOrderItem(self, ctx:EconLangParser.OrderItemContext):
        return self.visitChildren(ctx)



del EconLangParser