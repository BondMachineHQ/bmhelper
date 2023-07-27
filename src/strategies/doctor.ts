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

    checkDependencies(): void {

        for (const executable of this.executablesNecessaryBefore) {
            try {
                execSync(`which ${executable}`, { stdio: 'ignore' });
            } catch (error) {
                productionLog("Mandatory dependency not found: " + executable, "error");
                //throw new Error("error on mandatory dependency")
            }
        }

        const missingBmTools: string[] = [];
        for (const tool of this.bmTools) {
            try {
                execSync("which " + tool, { stdio: 'ignore' })
            } catch (err) {
                missingBmTools.push(tool);
            }
        }

        if (missingBmTools.length > 0) {
            for (const missingTool of missingBmTools) {
                productionLog("BondMachine tool not found: " + missingTool, "error");
            }
            //throw new Error("missing tool");
        } else {
            productionLog("All BondMachine tools has been found.", "success");
        }

        const missingOptionalTools: string[] = [];
        for (const tool of this.optionalTools) {
            try {
                execSync("which " + tool, { stdio: 'ignore' })
                productionLog("Optional tool found: " + tool, "success");
            } catch (err) {
                missingOptionalTools.push(tool);
            }
        }

        if (missingOptionalTools.length > 0) {
            for (const missingOptTool of missingOptionalTools) {
                productionLog("Optional tool not found: " + missingOptTool, "warning");
            }
        }


    }

}