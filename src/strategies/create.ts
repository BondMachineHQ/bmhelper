import { execSync } from "child_process";
import fs, { existsSync, mkdirSync } from "fs";
import { debugLog } from "../functions/generics";
import { IStrategy } from "../interfaces/IStrategy";

export class CreateStrategy {

    private necessaryParams: string[];
    private projectName: string;
    private filesToCopy: string[];
    private executablesNecessaryBefore: string[];
    private executablesNecessaryAfter: string[];

    constructor(protected params: string[]) {
        this.params = params;
        this.necessaryParams = ["project_name"];
        this.filesToCopy = ["Makefile", "Kconfig"];
        this.executablesNecessaryBefore = ["make"]
    }

    public getProjectName(): string {
        return this.projectName;
    }

    check(): void {

        // check executable

        // WIP: to do check of executable
        for (const executable of this.executablesNecessaryBefore) {
            try {
                execSync(executable)
            } catch (err) {
                if (err.message.includes("not found")) {
                    throw new Error("Menu config command not found")
                }
            }
        }
        
        const necessaryParamsLength = this.necessaryParams.length;

        let paramCounter = 0;
        for (let i = 0; i < this.params.length; i++) {

            if (this.params[i].startsWith("--") == false) {
                continue;
            }

            const param = this.params[i].slice(2, this.params[i].length);

            switch (param) {
                case "project_name":
                    this.projectName = this.params[i + 1];
                    break;
            }
            paramCounter = paramCounter + 1;

        }

        if (paramCounter < necessaryParamsLength) {
            throw new Error(" Not all parameters has been specified; necessary parameters are: " + this.necessaryParams.join(","))
        }

        for (const fileToCopy of this.filesToCopy) {
            debugLog(` Going to check if ${fileToCopy} exists in bmresource `, `warning`)
            if (!existsSync(`.bm-resources/${fileToCopy}`)) {
                throw new Error(`File ${fileToCopy} does not exist in .bmresources directory`)
            }
            debugLog(` Copied ${fileToCopy} `, `success`)
        }

        debugLog(" Request to create project. Specifics: ", "success");
        debugLog(" Project name is:  " + this.projectName, "success");
    }

    public execute(): void {

        debugLog(" Going to create project directory: " + this.projectName, "warning")
        mkdirSync(this.projectName)
        debugLog(" Successfully create project directory: " + this.projectName, "success")

        for (const fileToCopy of this.filesToCopy) {
            debugLog(` Going to copy ${fileToCopy} `, `warning`)
            execSync(`cp .bm-resources/${fileToCopy} ${this.projectName}/`)
            debugLog(` Copied ${fileToCopy} `, `success`)
        }
    }
}