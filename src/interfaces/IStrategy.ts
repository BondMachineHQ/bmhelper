export interface IStrategy {
    check(): void;
    exec(): void;
}

export interface IWorkflowHandler {
    checkInternalDependencies(): void;
    execValidation(): void;
    execOptionalDependencies(): void;
    apply(): void;
}