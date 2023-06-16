export interface IStrategy {
    check(): void;
    exec(): void;
}

export interface IWorkflowHandler {
    execValidation(): void;
    apply(): void;
}