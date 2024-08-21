import { execSync } from "child_process";
import fs, { existsSync, mkdirSync } from "fs";
import { debugLog, productionLog } from "../functions/generics";
import { IStrategy } from "../interfaces/IStrategy";
import axios from "axios";

export class DoctorStrategy {

    private projectName: string;
    private executablesNecessaryBefore: string[];
    private bmTools: string[];
    private optionalTools: string[];

    constructor(protected params: string[]) {
        this.params = params;
        this.executablesNecessaryBefore = ["make", "dot", "curl"];
        this.bmTools = [];
        // icestorm = iosys, icepack
        this.optionalTools = [
            "vivado",
            "iosys",
            "icepack",
            "quartus",
            "nextpnr-ice40",
            "synth_ice40"
        ]
    }

    public getProjectName(): string {
        return this.projectName;
    }

    public async checkDependencies(enableLog: boolean): Promise<void> {

        // use axios to make a get request to this url http://bondmachine.fisica.unipg.it/installer/componentlist which will return this 
        /**
         * bmhelper
            boolbond
            basm
            bmanalysis
            bmbuilder
            bmnumbers
            bmqsim
            bmstack
            bondgo
            bondmachine
            brvgasdl
            brvgasend
            melbond
            neuralbond
            nnef2bm
            procbuilder
            simbox
         */ 
        // save them in this.bmTools

        const response = await axios.get("https://www.bondmachine.it/installer/componentlist");
        this.bmTools = (response.data as string).split("\n").filter(elm => elm != "");

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