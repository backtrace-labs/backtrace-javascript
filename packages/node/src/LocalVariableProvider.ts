import {
    BacktraceData,
    BacktraceModule,
    BacktraceModuleBindData,
    BacktraceReport,
    BacktraceStackFrameValue,
} from '@backtrace/sdk-core';
import crypto from 'crypto';
import { Debugger, Runtime, Session } from 'inspector';

interface ScopeContext {
    functionLocation: string;
    scopeStartLineNumber: number;
    scopeEndLineNumber: number;
}
interface StackFrameContext {
    frame: {
        function: string | ScopeContext;
        variables: BacktraceStackFrameValue[];
    }[];
}
export class LocalVariableProvider implements BacktraceModule {
    /**
     * Container responsible for storing local variables for specific frame.
     *
     * Container data structure:
     * - key is a unique error identifier
     * - because multiple, the same errors might happen and local variables might be out of date, one unique
     *  error might store multiple arrays of local variables
     */
    private readonly _variableContainer: Record<string, StackFrameContext[]> = {};

    private readonly IGNORED_VARIABLES_TYPE = ['Function', 'undefined', 'Generator'];

    private _session!: Session;
    public constructor(private readonly _numberOfFramesToCollect: number = 10) {}

    public initialize(session: Session = new Session()) {
        this._session = session;
        this._session.connect();
        this._session.on('Debugger.paused', (event) => {
            this.collect(
                event.params.callFrames,
                event.params.reason,
                event.params.asyncStackTrace?.callFrames,
                event.params.data,
            );
            this._session.post('Debugger.resume');
        });
        this._session.post('Debugger.enable');
        this._session.post('Debugger.setPauseOnExceptions', { state: 'all' });
    }

    public bind(client: BacktraceModuleBindData): void {
        client.reportEvents.on('after-data', (report: BacktraceReport, data: BacktraceData) => {
            if (!(report.data instanceof Error) || !report.data.stack) {
                return;
            }

            const exceptionId = this.generateExceptionId(report.data.stack);
            const localVariables = this._variableContainer[exceptionId]?.pop();

            if (!localVariables) {
                return;
            }

            const stackTrace = data.threads['main'].stack;

            for (let index = 0; index < localVariables.frame.length; index++) {
                const frameContext = localVariables.frame[index];
                // make sure we don't apply any change if we don't need to.
                if (frameContext.variables.length === 0) {
                    continue;
                }
                const functionInformation: string | ScopeContext = frameContext.function;
                const stackTraceContext =
                    typeof functionInformation === 'string'
                        ? stackTrace.find((n) => n.funcName === functionInformation)
                        : stackTrace.find(
                              (n) =>
                                  n.library === functionInformation.functionLocation &&
                                  n.line &&
                                  functionInformation.scopeStartLineNumber <= n.line &&
                                  functionInformation.scopeEndLineNumber >= n.line,
                          );

                if (!stackTraceContext) {
                    continue;
                }
                stackTraceContext.variables = frameContext.variables;
            }
        });
    }
    public dispose() {
        this._session.post('Debugger.disable');
    }

    private collect(
        callFrames: Debugger.CallFrame[],
        reason: string,
        locations: Runtime.CallFrame[] = [],
        data?: { description?: string },
    ) {
        if (reason !== 'exception' && reason !== 'promiseRejection') {
            return;
        }
        if (!callFrames || callFrames.length === 0) {
            return;
        }

        const currentExceptionStackTrace = data?.description;
        if (!currentExceptionStackTrace) {
            return;
        }

        const exceptionReference = this.generateExceptionId(currentExceptionStackTrace);

        const result: StackFrameContext = { frame: [] };

        if (!this._variableContainer[exceptionReference]) {
            this._variableContainer[exceptionReference] = [];
        }
        this._variableContainer[exceptionReference].push(result);
        const maximumNumberOfFrames = Math.min(this._numberOfFramesToCollect, callFrames.length);

        for (let frameIndex = 0; frameIndex < maximumNumberOfFrames; frameIndex++) {
            const frame = callFrames[frameIndex];

            const localVariables = frame.scopeChain.find((n) => n.type === 'local');
            const frameLocalVariables: BacktraceStackFrameValue[] = [];

            const localVariablePropertiesId = localVariables?.object.objectId;
            if (!localVariablePropertiesId) {
                continue;
            }

            const functionReference = this.generateFunctionReference(frame, localVariables, locations);
            if (!functionReference) {
                continue;
            }
            this.readProperty(localVariablePropertiesId, (err, frameVariables) => {
                if (err) {
                    return;
                }

                if (!frameVariables || !frameVariables.result || frameVariables.result.length === 0) {
                    return;
                }
                for (const frameVariable of frameVariables.result) {
                    if (!frameVariable.value) {
                        continue;
                    }

                    this.readFrameVariableValue(frameVariable, (value?: { type: string; value: unknown }) => {
                        if (!value) {
                            return;
                        }
                        if (this.IGNORED_VARIABLES_TYPE.indexOf(value.type) !== -1) {
                            return;
                        }
                        frameLocalVariables.push({
                            name: frameVariable.name,
                            type: value.type,
                            value: value.value,
                        });
                    });
                }

                result.frame.push({
                    function: functionReference,
                    variables: frameLocalVariables,
                });
            });
        }
    }

    private readFrameVariableValue(
        frameVariable: Runtime.PropertyDescriptor,
        callback: (value?: { type: string; value: unknown }) => void,
    ) {
        if (!frameVariable.value) {
            return;
        }
        const { className, value, objectId } = frameVariable.value;

        if (objectId) {
            if (className === 'Object') {
                return this.readProperty(objectId, (err, object) => {
                    if (err) {
                        return callback();
                    }
                    return callback({
                        type: className,
                        value: object?.result?.reduce((acc, current) => {
                            if (current.value?.objectId) {
                                this.readFrameVariableValue(current, (value) => {
                                    acc[current.name] = value?.value;
                                });
                            } else if (current.value?.value) {
                                acc[current.name] = current.value?.value;
                            }
                            return acc;
                        }, {} as Record<string, unknown>),
                    });
                });
            } else if (className === 'Array') {
                return this.readProperty(objectId, (err, object) => {
                    if (err) {
                        return callback();
                    }
                    const values = object.result.filter((n) => n.name !== 'length');
                    const result = [];
                    for (const current of values) {
                        if (current.value?.objectId) {
                            this.readFrameVariableValue(current, (value) => {
                                result.push(value);
                            });
                        } else if (current.value?.value) {
                            result.push(current.value.value);
                        }
                    }

                    return callback({ type: className, value: result });
                });
            }
        }

        callback({ type: className ?? typeof value, value });
    }

    private generateExceptionId(exceptionContext: string): string {
        return crypto.createHash('sha256').update(exceptionContext).digest('hex');
    }

    private generateFunctionReference(
        frame: Debugger.CallFrame,
        scope: Debugger.Scope,
        locations: Runtime.CallFrame[],
    ): string | undefined | ScopeContext {
        const functionName = frame.this.className
            ? `${frame.this.className}.${frame.functionName}`
            : frame.functionName;

        if (functionName) {
            return functionName;
        }

        const scriptId = scope?.startLocation?.scriptId;
        if (!scriptId) {
            return undefined;
        }
        const scopeStartLineNumber = scope.startLocation?.lineNumber;
        const scopeEndLineNumber = scope.endLocation?.lineNumber;
        if (!scopeStartLineNumber || !scopeEndLineNumber) {
            return undefined;
        }

        const location = locations.find((n) => n.scriptId === scriptId);
        const scriptLocationPrefix = 'file://';
        if (!location || !location.url.startsWith(scriptLocationPrefix)) {
            return undefined;
        }
        return {
            functionLocation: location.url.substring(scriptLocationPrefix.length),
            scopeStartLineNumber,
            scopeEndLineNumber,
        };
    }

    private readProperty<T = { result: Runtime.PropertyDescriptor[] }>(
        objectId: string,
        callback: (err: Error | null, data: T) => void,
    ) {
        this._session.post(
            'Runtime.getProperties',
            {
                objectId,
                ownProperties: true,
            },
            (err, data) => callback(err, data as T),
        );
    }
}
