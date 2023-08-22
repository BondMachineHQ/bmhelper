import { productionLog } from "../functions/generics";
import { IWorkflowHandler } from "../interfaces/IStrategy";
import { IVariable } from "../strategies/validateapply";
import { IGenerateVariable, IMandatoryDependencies } from "./bondgo";
import fs, { existsSync, mkdirSync } from "fs";

export class AbstractHandler implements IWorkflowHandler {

    protected optionalDependencies: IVariable[];
    protected mandatoryDependencies: IMandatoryDependencies[];
    protected generateMkVariables: IVariable[];
    protected ignoreDependencies: IVariable[];

    constructor(protected variables: IVariable[]) {
        this.generateMkVariables = [];
    }

    checkInternalDependencies(apply: boolean): void {
        throw new Error("Method not implemented.");
    }
    execValidation(apply: boolean): void {

        let dependenciesNotFound: string[] = [];
        const variablesKey = this.variables.map(elm => elm.name);

        for (const dep of this.mandatoryDependencies) {

            const findVar = variablesKey.find(elm => elm === dep.name);
            if (findVar != undefined) {
                productionLog("Mandatory variable found " +findVar, "success");
            } else {
                dependenciesNotFound.push(dep.name);
            }
        }

        if (dependenciesNotFound.length > 0) {
            for (const depNotFound of dependenciesNotFound) {
                productionLog("Mandatory variable not found " + depNotFound, "error");
            }
            if (apply == true) {
                throw new Error("Mandatory dependency not aligned")
            }
        }

        let optDependenciesNotFound: string[] = [];

        for (const optDependency of this.optionalDependencies) {
            const findVar = variablesKey.find(elm => elm === optDependency.name);
            if (findVar != undefined) {
                productionLog("Mandatory variable found " +findVar, "success");
            } else {
                optDependenciesNotFound.push(optDependency.name);
            }
        }

        if (optDependenciesNotFound.length > 0) {
            for (const depNotFound of optDependenciesNotFound) {
                productionLog("Mandatory variable not found " + depNotFound, "warning");
            }
        }

        let ignoreDependenciesNotFound: string[] = [];
        for(const ignoreDep of this.ignoreDependencies) {
            const findVar = variablesKey.find(elm => elm === ignoreDep.name);
            if (findVar != undefined) {
                productionLog("Optional variable found: " +findVar, "success");
            } else {
                ignoreDependenciesNotFound.push(ignoreDep.name);
            }
        }

        if (ignoreDependenciesNotFound.length > 0) {
            for (const depNotFound of ignoreDependenciesNotFound) {
                productionLog("Optional variable not found: " + depNotFound, "warning");
            }
        }

        // check for file dependencies
        for (const dep of this.mandatoryDependencies) {
            if (dep.type != "file") {
                continue;
            }
            const variableName = this.variables.find(elm => elm.name === dep.name);
            if (fs.existsSync(variableName.value) === false) {
                //throw new Error(`Source file ${variableName.value} not found.`)
                productionLog(`Source file not ${variableName.value} found`, "success");
            } else {
                productionLog(`Source file ${variableName.value} found`, "success");
            }
        }

        this.checkInternalDependencies(apply);

    }

    async execOptionalDependencies(): Promise<void> {
        for (const optDependency of this.optionalDependencies) {
            let found: boolean = false;
            for (const variable of this.variables) {
                if (optDependency.name == variable.name) {
                    found = true;
                    continue
                }
            }
            if (found == false) {
                const reply = (await productionLog(optDependency.name + " not found. Do you want to use the default value: " + optDependency.value + " ?", "ask") as string)
                if (reply.toLowerCase() == "y" || reply.toLowerCase() == "yes") {
                    this.variables.push(optDependency)
                } else {
                    optDependency.value = reply;
                    this.variables.push(optDependency)
                }
                this.generateMkVariables.push(optDependency);

                const variable = this.variables.find(elm => elm.name == optDependency.name)
                if (variable.toGenerate == false) {
                    continue;
                }
                fs.writeFileSync(variable.value, variable.content, 'utf-8');
            }
        }
    }

    public writeGenerateMk() {
        let generateMkFile: string[] = [];
        for (const genMk of this.generateMkVariables) {
            generateMkFile.push(`${genMk.name}=${genMk.value}`);
        }
        generateMkFile.push(`ROOTDIR=.`);
        const generatedMkFileToDump = generateMkFile.join("\n");
        fs.writeFileSync(`generated.mk`, generatedMkFileToDump, 'utf8');
    }

    apply(): void {
        throw new Error("Method not implemented.");
    }

}