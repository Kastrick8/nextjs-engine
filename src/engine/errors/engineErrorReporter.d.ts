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
	includeStack?: boolean;
}

export interface EngineErrorReport {
	id: string;
	timestamp: string;
	severity: EngineErrorSeverity;
	code: string;
	source: EngineErrorSource;
	message: string;
	location?: string;
	route?: string;
	requestPath?: string;
	requestMethod?: string;
	digest?: string;
	detail: string;
}

export declare function createEngineErrorReport(error: unknown, context?: EngineErrorContext): EngineErrorReport;
export declare function formatEngineErrorReport(report: EngineErrorReport): string;

/** Report a structured error to the console and dispatch the browser-only engine:error event. */
export declare function reportEngineError(error: unknown, context?: EngineErrorContext): EngineErrorReport;

/** Observe Node fatal errors without replacing Node's default handler or changing its exit behavior. */
export declare function installEngineUncaughtExceptionMonitor(): () => void;
