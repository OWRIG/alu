export class DomainError extends Error {
  readonly code: string;
  readonly path?: string;
  readonly entityIds?: string[];
  readonly suggestion?: string;
  readonly commandIndex?: number;

  constructor(options: {
    code: string;
    message: string;
    path?: string;
    entityIds?: string[];
    suggestion?: string;
    commandIndex?: number;
  }) {
    super(options.message);
    this.name = "DomainError";
    this.code = options.code;
    this.path = options.path;
    this.entityIds = options.entityIds;
    this.suggestion = options.suggestion;
    this.commandIndex = options.commandIndex;
  }
}

export function asDomainError(error: unknown): DomainError {
  if (error instanceof DomainError) return error;
  return new DomainError({
    code: "internal.unexpected",
    message: error instanceof Error ? error.message : "发生未知错误",
  });
}
