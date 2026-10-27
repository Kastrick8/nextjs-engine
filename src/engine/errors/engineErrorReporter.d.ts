export type EngineErrorSeverity = "error" | "warning";

export type EngineErrorSource =
	| "engine"
	| "node-uncaught-exception"
	| "next-request"
	| "next-route-error"
	| "next-global-error"
	| "react-boundary"
	| "plugin"
	| "application"
	| (string & {});

export interface EngineErrorContext {
	code?: string;
	source?: EngineErrorSource;
	severity?: EngineErrorSeverity;
	location?: string;
	file?: string;
	line?: number;
	column?: number;
	route?: string;
	requestPath?: string;
	requestMethod?: string;
	digest?: string;
	detail?: string;
	componentStack?: string;
	reason?: string;
	action?: string;
	includeStack?: boolean;
}

export interface EngineErrorReport {
	id: string;
	timestamp: string;
	severity: EngineErrorSeverity;
	code: string;
	source: EngineErrorSource;
	message: string;
	reason?: string;
	action?: string;
	location?: string;
	route?: string;
	requestPath?: string;
	requestMethod?: string;
	digest?: string;
	detail: string;
}

export declare function createEngineErrorReport(error: unknown, context?: EngineErrorContext): EngineErrorReport;
export interface EngineErrorFormatOptions { color?: boolean; }

export declare const ERROR_BOOK_URL: string;
export declare function resolveEngineErrorHelpUrl(code: string): string;
export declare function formatEngineErrorReport(report: EngineErrorReport, options?: EngineErrorFormatOptions): string;

/** Report a structured error to the console and dispatch the browser-only engine:error event. */
export declare function reportEngineError(error: unknown, context?: EngineErrorContext): EngineErrorReport;

/** Observe Node fatal errors without replacing Node's default handler or changing its exit behavior. */
export declare function installEngineUncaughtExceptionMonitor(): () => void;
