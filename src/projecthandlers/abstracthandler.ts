import { productionLog } from "../functions/generics";
import { IWorkflowHandler } from "../interfaces/IStrategy";
import { IVariable } from "../strategies/validateapply";
import { IGenerateVariable, IMandatoryDependencies } from "./bondgo";
import fs, { existsSync, mkdirSync } from "fs";

export class AbstractHandler implements IWorkflowHandler {

    protected optionalDependencies: IVariable[];
    protected mandatoryDependencies: IMandatoryDependencies[];
    protected generateMkVariables: IGenerateVariable[];

    constructor(protected variables: IVariable[]) {
    }

    checkInternalDependencies(): void {
        throw new Error("Method not implemented.");
    }
    execValidation(): void {
        
        let dependenciesNotFound: string[] = [];

        for (const dep of this.mandatoryDependencies) {
            let found: boolean = false;
            for (const variable of this.variables) {

                if (dep.name == variable.name) {
                    productionLog("Found "+variable.name, "success");
                    found = true;
                    continue
                }
            }
            if (found == false) {
                dependenciesNotFound.push(dep.name);
            }
        }

        if (dependenciesNotFound.length > 0) {
            for(const depNotFound of dependenciesNotFound) {
                productionLog("Not found "+depNotFound, "error");
            }
            throw new Error("Dependency not aligned for variable: ")
        }

        // check for file dependencies
        for (const dep of this.mandatoryDependencies) {
            if (dep.type != "file") {
                continue;
            }
            const variableName = this.variables.find(elm => elm.name === dep.name);
            if (fs.existsSync(variableName.value) === false) {
                throw new Error(`Source file ${variableName.value} not found.`)
            } else {
                productionLog(`Source file ${variableName.value} found.`, "success");
            }
        }

        this.checkInternalDependencies();
    }
    async execOptionalDependencies(): Promise<void> {
        for(const optDependency of this.optionalDependencies) {
            let found: boolean = false;
            for (const variable of this.variables) {
                if (optDependency.name == variable.name) {
                    productionLog("Found "+variable.name, "success");
                    found = true;
                    continue
                }
            }
            if (found == false) {
                const reply = (await productionLog(optDependency.name+" not found. Do you want to use the default value: "+optDependency.value+" ?", "ask") as string)
                if (reply.toLowerCase() == "y" || reply.toLowerCase() == "yes") {
                    this.variables.push(optDependency)
                } else {
                    optDependency.value = reply;
                    this.variables.push(optDependency)
                }
            }
        }

        for(const variable of this.variables) {
            if (variable.toGenerate == false) {
                continue;
            }
            fs.writeFileSync(variable.value, variable.content, 'utf-8');
        }
    }
    apply(): void {
        throw new Error("Method not implemented.");
    }
    
}