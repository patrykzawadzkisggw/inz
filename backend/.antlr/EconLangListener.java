// Generated from c:/Users/patryk/Desktop/inz/backend/EconLang.g4 by ANTLR 4.13.1
import org.antlr.v4.runtime.tree.ParseTreeListener;

/**
 * This interface defines a complete listener for a parse tree produced by
 * {@link EconLangParser}.
 */
public interface EconLangListener extends ParseTreeListener {
	/**
	 * Enter a parse tree produced by {@link EconLangParser#program}.
	 * @param ctx the parse tree
	 */
	void enterProgram(EconLangParser.ProgramContext ctx);
	/**
	 * Exit a parse tree produced by {@link EconLangParser#program}.
	 * @param ctx the parse tree
	 */
	void exitProgram(EconLangParser.ProgramContext ctx);
	/**
	 * Enter a parse tree produced by {@link EconLangParser#statement}.
	 * @param ctx the parse tree
	 */
	void enterStatement(EconLangParser.StatementContext ctx);
	/**
	 * Exit a parse tree produced by {@link EconLangParser#statement}.
	 * @param ctx the parse tree
	 */
	void exitStatement(EconLangParser.StatementContext ctx);
	/**
	 * Enter a parse tree produced by {@link EconLangParser#declaration}.
	 * @param ctx the parse tree
	 */
	void enterDeclaration(EconLangParser.DeclarationContext ctx);
	/**
	 * Exit a parse tree produced by {@link EconLangParser#declaration}.
	 * @param ctx the parse tree
	 */
	void exitDeclaration(EconLangParser.DeclarationContext ctx);
	/**
	 * Enter a parse tree produced by {@link EconLangParser#assignment}.
	 * @param ctx the parse tree
	 */
	void enterAssignment(EconLangParser.AssignmentContext ctx);
	/**
	 * Exit a parse tree produced by {@link EconLangParser#assignment}.
	 * @param ctx the parse tree
	 */
	void exitAssignment(EconLangParser.AssignmentContext ctx);
	/**
	 * Enter a parse tree produced by {@link EconLangParser#functionDef}.
	 * @param ctx the parse tree
	 */
	void enterFunctionDef(EconLangParser.FunctionDefContext ctx);
	/**
	 * Exit a parse tree produced by {@link EconLangParser#functionDef}.
	 * @param ctx the parse tree
	 */
	void exitFunctionDef(EconLangParser.FunctionDefContext ctx);
	/**
	 * Enter a parse tree produced by {@link EconLangParser#paramList}.
	 * @param ctx the parse tree
	 */
	void enterParamList(EconLangParser.ParamListContext ctx);
	/**
	 * Exit a parse tree produced by {@link EconLangParser#paramList}.
	 * @param ctx the parse tree
	 */
	void exitParamList(EconLangParser.ParamListContext ctx);
	/**
	 * Enter a parse tree produced by {@link EconLangParser#ifStatement}.
	 * @param ctx the parse tree
	 */
	void enterIfStatement(EconLangParser.IfStatementContext ctx);
	/**
	 * Exit a parse tree produced by {@link EconLangParser#ifStatement}.
	 * @param ctx the parse tree
	 */
	void exitIfStatement(EconLangParser.IfStatementContext ctx);
	/**
	 * Enter a parse tree produced by {@link EconLangParser#loopStatement}.
	 * @param ctx the parse tree
	 */
	void enterLoopStatement(EconLangParser.LoopStatementContext ctx);
	/**
	 * Exit a parse tree produced by {@link EconLangParser#loopStatement}.
	 * @param ctx the parse tree
	 */
	void exitLoopStatement(EconLangParser.LoopStatementContext ctx);
	/**
	 * Enter a parse tree produced by {@link EconLangParser#alertStatement}.
	 * @param ctx the parse tree
	 */
	void enterAlertStatement(EconLangParser.AlertStatementContext ctx);
	/**
	 * Exit a parse tree produced by {@link EconLangParser#alertStatement}.
	 * @param ctx the parse tree
	 */
	void exitAlertStatement(EconLangParser.AlertStatementContext ctx);
	/**
	 * Enter a parse tree produced by {@link EconLangParser#returnStatement}.
	 * @param ctx the parse tree
	 */
	void enterReturnStatement(EconLangParser.ReturnStatementContext ctx);
	/**
	 * Exit a parse tree produced by {@link EconLangParser#returnStatement}.
	 * @param ctx the parse tree
	 */
	void exitReturnStatement(EconLangParser.ReturnStatementContext ctx);
	/**
	 * Enter a parse tree produced by {@link EconLangParser#block}.
	 * @param ctx the parse tree
	 */
	void enterBlock(EconLangParser.BlockContext ctx);
	/**
	 * Exit a parse tree produced by {@link EconLangParser#block}.
	 * @param ctx the parse tree
	 */
	void exitBlock(EconLangParser.BlockContext ctx);
	/**
	 * Enter a parse tree produced by {@link EconLangParser#expression}.
	 * @param ctx the parse tree
	 */
	void enterExpression(EconLangParser.ExpressionContext ctx);
	/**
	 * Exit a parse tree produced by {@link EconLangParser#expression}.
	 * @param ctx the parse tree
	 */
	void exitExpression(EconLangParser.ExpressionContext ctx);
	/**
	 * Enter a parse tree produced by {@link EconLangParser#orExpr}.
	 * @param ctx the parse tree
	 */
	void enterOrExpr(EconLangParser.OrExprContext ctx);
	/**
	 * Exit a parse tree produced by {@link EconLangParser#orExpr}.
	 * @param ctx the parse tree
	 */
	void exitOrExpr(EconLangParser.OrExprContext ctx);
	/**
	 * Enter a parse tree produced by {@link EconLangParser#andExpr}.
	 * @param ctx the parse tree
	 */
	void enterAndExpr(EconLangParser.AndExprContext ctx);
	/**
	 * Exit a parse tree produced by {@link EconLangParser#andExpr}.
	 * @param ctx the parse tree
	 */
	void exitAndExpr(EconLangParser.AndExprContext ctx);
	/**
	 * Enter a parse tree produced by {@link EconLangParser#equalityExpr}.
	 * @param ctx the parse tree
	 */
	void enterEqualityExpr(EconLangParser.EqualityExprContext ctx);
	/**
	 * Exit a parse tree produced by {@link EconLangParser#equalityExpr}.
	 * @param ctx the parse tree
	 */
	void exitEqualityExpr(EconLangParser.EqualityExprContext ctx);
	/**
	 * Enter a parse tree produced by {@link EconLangParser#relationalExpr}.
	 * @param ctx the parse tree
	 */
	void enterRelationalExpr(EconLangParser.RelationalExprContext ctx);
	/**
	 * Exit a parse tree produced by {@link EconLangParser#relationalExpr}.
	 * @param ctx the parse tree
	 */
	void exitRelationalExpr(EconLangParser.RelationalExprContext ctx);
	/**
	 * Enter a parse tree produced by {@link EconLangParser#additiveExpr}.
	 * @param ctx the parse tree
	 */
	void enterAdditiveExpr(EconLangParser.AdditiveExprContext ctx);
	/**
	 * Exit a parse tree produced by {@link EconLangParser#additiveExpr}.
	 * @param ctx the parse tree
	 */
	void exitAdditiveExpr(EconLangParser.AdditiveExprContext ctx);
	/**
	 * Enter a parse tree produced by {@link EconLangParser#multiplicativeExpr}.
	 * @param ctx the parse tree
	 */
	void enterMultiplicativeExpr(EconLangParser.MultiplicativeExprContext ctx);
	/**
	 * Exit a parse tree produced by {@link EconLangParser#multiplicativeExpr}.
	 * @param ctx the parse tree
	 */
	void exitMultiplicativeExpr(EconLangParser.MultiplicativeExprContext ctx);
	/**
	 * Enter a parse tree produced by {@link EconLangParser#unaryExpr}.
	 * @param ctx the parse tree
	 */
	void enterUnaryExpr(EconLangParser.UnaryExprContext ctx);
	/**
	 * Exit a parse tree produced by {@link EconLangParser#unaryExpr}.
	 * @param ctx the parse tree
	 */
	void exitUnaryExpr(EconLangParser.UnaryExprContext ctx);
	/**
	 * Enter a parse tree produced by {@link EconLangParser#primary}.
	 * @param ctx the parse tree
	 */
	void enterPrimary(EconLangParser.PrimaryContext ctx);
	/**
	 * Exit a parse tree produced by {@link EconLangParser#primary}.
	 * @param ctx the parse tree
	 */
	void exitPrimary(EconLangParser.PrimaryContext ctx);
	/**
	 * Enter a parse tree produced by {@link EconLangParser#functionCall}.
	 * @param ctx the parse tree
	 */
	void enterFunctionCall(EconLangParser.FunctionCallContext ctx);
	/**
	 * Exit a parse tree produced by {@link EconLangParser#functionCall}.
	 * @param ctx the parse tree
	 */
	void exitFunctionCall(EconLangParser.FunctionCallContext ctx);
	/**
	 * Enter a parse tree produced by {@link EconLangParser#funcName}.
	 * @param ctx the parse tree
	 */
	void enterFuncName(EconLangParser.FuncNameContext ctx);
	/**
	 * Exit a parse tree produced by {@link EconLangParser#funcName}.
	 * @param ctx the parse tree
	 */
	void exitFuncName(EconLangParser.FuncNameContext ctx);
	/**
	 * Enter a parse tree produced by {@link EconLangParser#argList}.
	 * @param ctx the parse tree
	 */
	void enterArgList(EconLangParser.ArgListContext ctx);
	/**
	 * Exit a parse tree produced by {@link EconLangParser#argList}.
	 * @param ctx the parse tree
	 */
	void exitArgList(EconLangParser.ArgListContext ctx);
	/**
	 * Enter a parse tree produced by {@link EconLangParser#arg}.
	 * @param ctx the parse tree
	 */
	void enterArg(EconLangParser.ArgContext ctx);
	/**
	 * Exit a parse tree produced by {@link EconLangParser#arg}.
	 * @param ctx the parse tree
	 */
	void exitArg(EconLangParser.ArgContext ctx);
	/**
	 * Enter a parse tree produced by {@link EconLangParser#namedArg}.
	 * @param ctx the parse tree
	 */
	void enterNamedArg(EconLangParser.NamedArgContext ctx);
	/**
	 * Exit a parse tree produced by {@link EconLangParser#namedArg}.
	 * @param ctx the parse tree
	 */
	void exitNamedArg(EconLangParser.NamedArgContext ctx);
	/**
	 * Enter a parse tree produced by {@link EconLangParser#dataLoad}.
	 * @param ctx the parse tree
	 */
	void enterDataLoad(EconLangParser.DataLoadContext ctx);
	/**
	 * Exit a parse tree produced by {@link EconLangParser#dataLoad}.
	 * @param ctx the parse tree
	 */
	void exitDataLoad(EconLangParser.DataLoadContext ctx);
	/**
	 * Enter a parse tree produced by {@link EconLangParser#columns}.
	 * @param ctx the parse tree
	 */
	void enterColumns(EconLangParser.ColumnsContext ctx);
	/**
	 * Exit a parse tree produced by {@link EconLangParser#columns}.
	 * @param ctx the parse tree
	 */
	void exitColumns(EconLangParser.ColumnsContext ctx);
	/**
	 * Enter a parse tree produced by {@link EconLangParser#forecastCall}.
	 * @param ctx the parse tree
	 */
	void enterForecastCall(EconLangParser.ForecastCallContext ctx);
	/**
	 * Exit a parse tree produced by {@link EconLangParser#forecastCall}.
	 * @param ctx the parse tree
	 */
	void exitForecastCall(EconLangParser.ForecastCallContext ctx);
	/**
	 * Enter a parse tree produced by {@link EconLangParser#series}.
	 * @param ctx the parse tree
	 */
	void enterSeries(EconLangParser.SeriesContext ctx);
	/**
	 * Exit a parse tree produced by {@link EconLangParser#series}.
	 * @param ctx the parse tree
	 */
	void exitSeries(EconLangParser.SeriesContext ctx);
	/**
	 * Enter a parse tree produced by {@link EconLangParser#params}.
	 * @param ctx the parse tree
	 */
	void enterParams(EconLangParser.ParamsContext ctx);
	/**
	 * Exit a parse tree produced by {@link EconLangParser#params}.
	 * @param ctx the parse tree
	 */
	void exitParams(EconLangParser.ParamsContext ctx);
	/**
	 * Enter a parse tree produced by {@link EconLangParser#indicatorCall}.
	 * @param ctx the parse tree
	 */
	void enterIndicatorCall(EconLangParser.IndicatorCallContext ctx);
	/**
	 * Exit a parse tree produced by {@link EconLangParser#indicatorCall}.
	 * @param ctx the parse tree
	 */
	void exitIndicatorCall(EconLangParser.IndicatorCallContext ctx);
	/**
	 * Enter a parse tree produced by {@link EconLangParser#period}.
	 * @param ctx the parse tree
	 */
	void enterPeriod(EconLangParser.PeriodContext ctx);
	/**
	 * Exit a parse tree produced by {@link EconLangParser#period}.
	 * @param ctx the parse tree
	 */
	void exitPeriod(EconLangParser.PeriodContext ctx);
	/**
	 * Enter a parse tree produced by {@link EconLangParser#arrayExpr}.
	 * @param ctx the parse tree
	 */
	void enterArrayExpr(EconLangParser.ArrayExprContext ctx);
	/**
	 * Exit a parse tree produced by {@link EconLangParser#arrayExpr}.
	 * @param ctx the parse tree
	 */
	void exitArrayExpr(EconLangParser.ArrayExprContext ctx);
	/**
	 * Enter a parse tree produced by {@link EconLangParser#seriesOp}.
	 * @param ctx the parse tree
	 */
	void enterSeriesOp(EconLangParser.SeriesOpContext ctx);
	/**
	 * Exit a parse tree produced by {@link EconLangParser#seriesOp}.
	 * @param ctx the parse tree
	 */
	void exitSeriesOp(EconLangParser.SeriesOpContext ctx);
	/**
	 * Enter a parse tree produced by {@link EconLangParser#window}.
	 * @param ctx the parse tree
	 */
	void enterWindow(EconLangParser.WindowContext ctx);
	/**
	 * Exit a parse tree produced by {@link EconLangParser#window}.
	 * @param ctx the parse tree
	 */
	void exitWindow(EconLangParser.WindowContext ctx);
	/**
	 * Enter a parse tree produced by {@link EconLangParser#sqlQuery}.
	 * @param ctx the parse tree
	 */
	void enterSqlQuery(EconLangParser.SqlQueryContext ctx);
	/**
	 * Exit a parse tree produced by {@link EconLangParser#sqlQuery}.
	 * @param ctx the parse tree
	 */
	void exitSqlQuery(EconLangParser.SqlQueryContext ctx);
	/**
	 * Enter a parse tree produced by {@link EconLangParser#selectItems}.
	 * @param ctx the parse tree
	 */
	void enterSelectItems(EconLangParser.SelectItemsContext ctx);
	/**
	 * Exit a parse tree produced by {@link EconLangParser#selectItems}.
	 * @param ctx the parse tree
	 */
	void exitSelectItems(EconLangParser.SelectItemsContext ctx);
	/**
	 * Enter a parse tree produced by {@link EconLangParser#selectItem}.
	 * @param ctx the parse tree
	 */
	void enterSelectItem(EconLangParser.SelectItemContext ctx);
	/**
	 * Exit a parse tree produced by {@link EconLangParser#selectItem}.
	 * @param ctx the parse tree
	 */
	void exitSelectItem(EconLangParser.SelectItemContext ctx);
	/**
	 * Enter a parse tree produced by {@link EconLangParser#aggFunc}.
	 * @param ctx the parse tree
	 */
	void enterAggFunc(EconLangParser.AggFuncContext ctx);
	/**
	 * Exit a parse tree produced by {@link EconLangParser#aggFunc}.
	 * @param ctx the parse tree
	 */
	void exitAggFunc(EconLangParser.AggFuncContext ctx);
	/**
	 * Enter a parse tree produced by {@link EconLangParser#aggArith}.
	 * @param ctx the parse tree
	 */
	void enterAggArith(EconLangParser.AggArithContext ctx);
	/**
	 * Exit a parse tree produced by {@link EconLangParser#aggArith}.
	 * @param ctx the parse tree
	 */
	void exitAggArith(EconLangParser.AggArithContext ctx);
	/**
	 * Enter a parse tree produced by {@link EconLangParser#aggTerm}.
	 * @param ctx the parse tree
	 */
	void enterAggTerm(EconLangParser.AggTermContext ctx);
	/**
	 * Exit a parse tree produced by {@link EconLangParser#aggTerm}.
	 * @param ctx the parse tree
	 */
	void exitAggTerm(EconLangParser.AggTermContext ctx);
	/**
	 * Enter a parse tree produced by {@link EconLangParser#source}.
	 * @param ctx the parse tree
	 */
	void enterSource(EconLangParser.SourceContext ctx);
	/**
	 * Exit a parse tree produced by {@link EconLangParser#source}.
	 * @param ctx the parse tree
	 */
	void exitSource(EconLangParser.SourceContext ctx);
	/**
	 * Enter a parse tree produced by {@link EconLangParser#idList}.
	 * @param ctx the parse tree
	 */
	void enterIdList(EconLangParser.IdListContext ctx);
	/**
	 * Exit a parse tree produced by {@link EconLangParser#idList}.
	 * @param ctx the parse tree
	 */
	void exitIdList(EconLangParser.IdListContext ctx);
	/**
	 * Enter a parse tree produced by {@link EconLangParser#orderList}.
	 * @param ctx the parse tree
	 */
	void enterOrderList(EconLangParser.OrderListContext ctx);
	/**
	 * Exit a parse tree produced by {@link EconLangParser#orderList}.
	 * @param ctx the parse tree
	 */
	void exitOrderList(EconLangParser.OrderListContext ctx);
	/**
	 * Enter a parse tree produced by {@link EconLangParser#orderItem}.
	 * @param ctx the parse tree
	 */
	void enterOrderItem(EconLangParser.OrderItemContext ctx);
	/**
	 * Exit a parse tree produced by {@link EconLangParser#orderItem}.
	 * @param ctx the parse tree
	 */
	void exitOrderItem(EconLangParser.OrderItemContext ctx);
}