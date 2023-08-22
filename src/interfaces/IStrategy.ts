export interface IStrategy {
    check(): void;
    exec(): void;
}

export interface IWorkflowHandler {
    checkInternalDependencies(apply: boolean): void;
    execValidation(apply: boolean): void;
    execOptionalDependencies(): void;
    apply(): void;
    writeGenerateMk(): void;
}