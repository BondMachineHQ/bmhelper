import { execSync } from "child_process";
import fs, { existsSync, mkdirSync } from "fs";
import { debugLog, productionLog } from "../functions/generics";
import { IStrategy } from "../interfaces/IStrategy";

export class DoctorStrategy {

    private projectName: string;
    private executablesNecessaryBefore: string[];
    private bmTools: string[];
    private optionalTools: string[];

    constructor(protected params: string[]) {
        this.params = params;
        this.executablesNecessaryBefore = ["make", "dot", "curl"];
        this.bmTools = [
            "basm",
            "bmanalysis",
            "bmnumbers",
            "bmstack",
            "bondgo",
            "bondmachine",
            "melbond",
            "neuralbond",
            "procbuilder",
            "simbox"
        ];
        // icestorm = yosis, icepack
        this.optionalTools = [
            "vivado",
            "yosis",
            "icepack",
            "quartus"
        ]
    }

    public getProjectName(): string {
        return this.projectName;
    }

    checkDependencies(enableLog: boolean): void {

        let errorFound: boolean = false;
        let warningFound: boolean = false;

        for (const executable of this.executablesNecessaryBefore) {
            try {
                execSync(`which ${executable}`, { stdio: 'ignore' });
                if (enableLog) {
                    productionLog("Mandatory dependency found: " + executable, "success");
                }
            } catch (error) {
                if (enableLog) {
                    productionLog("Mandatory dependency not found: " + executable, "error");
                } else {
                    errorFound = true;
                }
                //throw new Error("error on mandatory dependency")
            }
        }

        const missingBmTools: string[] = [];
        for (const tool of this.bmTools) {
            try {
                execSync("which " + tool, { stdio: 'ignore' })
                if (enableLog) {
                    productionLog("BondMachine tool " + tool + " found", "success");
                }
            } catch (err) {
                missingBmTools.push(tool);
            }
        }

        if (missingBmTools.length > 0) {
            for (const missingTool of missingBmTools) {
                if (enableLog) {
                    productionLog("BondMachine tool not found: " + missingTool, "error");
                } else {
                    warningFound = true;
                }
            }
            //throw new Error("missing tool");
        } else {
            if (enableLog) {
                productionLog("All BondMachine tools has been found.", "success");
            }
        }

        const missingOptionalTools: string[] = [];
        for (const tool of this.optionalTools) {
            try {
                execSync("which " + tool, { stdio: 'ignore' })
                if(enableLog) {
                    productionLog("Optional tool found: " + tool, "success");
                }
            } catch (err) {
                missingOptionalTools.push(tool);
            }
        }

        if (missingOptionalTools.length > 0) {
            for (const missingOptTool of missingOptionalTools) {
                if (enableLog) {
                    productionLog("Optional tool not found: " + missingOptTool, "warning");
                } else {
                    warningFound = true;
                }
            }
        }

        if (!enableLog) {
            if (warningFound) {
                productionLog("Doctor has detected a warning; Run the command 'bmhelper doctor' to get more details.", "warning");
            }
            if(errorFound) {
                productionLog("Doctor has detected an error; Run the command 'bmhelper doctor' to get more details. ", "error");
            }
        }
    }

}