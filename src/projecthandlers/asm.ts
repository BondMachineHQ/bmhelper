import { execSync } from "child_process";
import { IVariable } from "../strategies/validateapply";
import fs, { existsSync, mkdirSync } from "fs";
import { productionLog } from "../functions/generics";
import { AbstractHandler } from "./abstracthandler";

export interface IMandatoryDependencies {
    name: string;
    type: string; // file for example
}

export interface ITemplateType {
    [key: string]: ITemplateData
}

export interface ITemplateData {
    datatype: string[];
    prefix: string[];
    ranges: string[];
    registersize: string[];
    multop: string[];
    name?: string[];
}

export interface IGenerateVariable {
    name: string;
    value: string;
}

// BOARD, MAPFILE, SHOWARGS (OPT)
// MAPFILE SE NON CE L'HAI CUSTOM LO GENERI CON L'HELPER
// INCLUDE SLOW OPZIONALE
// GENERAL_TYPE_BOARD MI DICE SE LA BOARD È MANDATORY OPPURE NO

export class AsmProjectHandler extends AbstractHandler {

    private workingDir: string;
    private globalGeneratedMkFile: string;
    private targetBoard: string;
    private filesToCheck: string[];

    constructor(protected variables: IVariable[]) {
        super(variables)
        this.mandatoryDependencies = [{
            name: "SOURCE_ASM",
            type: "file"
        }]
        this.ignoreDependencies = [{
            name: "SHOWARGS",
            value: "-dot-detail 5",
            toGenerate: false
        }]
        this.optionalDependencies = [{
            name: "WORKING_DIR",
            value: "working_dir",
            toGenerate: false
        },
        {
            name: "MAPFILE",
            value: "default_maps.json",
            toGenerate: true,
            content: `{"Assoc" : { "clk" : "clk" }}`
        }]
        this.workingDir = "";
        this.globalGeneratedMkFile = "generated.mk";
        this.targetBoard = "";
        this.filesToCheck = [".xdc"]
    }

    public checkInternalDependencies(apply: boolean) {

        const variablesName: string[] = this.variables.map(elm => elm.name);

        const oldType = this.variables.find(elm => elm.name == "BOARD");
        if (oldType != undefined) {
            this.targetBoard = oldType.value;
            productionLog("Found target board: " + this.targetBoard, "success");
            return;
        }
        
        const foundType = this.variables.find(elm => elm.name === "GENERAL_TYPE_BOARD" && elm.value === "y");
        if (foundType == undefined) {
            return;
        }

        const toolchains: string[] = ["TOOLCHAIN_XILINX", "TOOLCHAIN_ALTERA", "TOOLCHAIN_LATTICE"];
        const toolchainInts = toolchains.filter((value) => variablesName.includes(value));
        if (toolchainInts.length == 0) {
            if (apply == true) {
                throw new Error("You must select a toolchain in order to continue.");
            } else {
                productionLog("You must select a toolchain (XILINX, ALTERA, LATTICE)", "error");
            }
        }

        const boards: string[] = ["XILINX_BOARD_ZEDBOARD", "XILINX_BOARD_BASYS3", "XILINX_BOARD_EBAZ4205"];
        const boardInts = boards.filter((value) => variablesName.includes(value));
        if (boardInts.length == 0) {
            if (apply == true) {
                throw new Error("You must select a board in order to continue.");
            } else {
                productionLog("You must select a board", "error");
            }
        } else {
            if (boardInts.length > 1) {
                if (apply == true) {
                    throw new Error("You must select only one target board in order to continue.");
                } else {
                    productionLog("You must select only one target board", "error");
                }
            } else {
                this.targetBoard = boardInts[0].replace("XILINX_BOARD_", "").toLowerCase();
                productionLog("Found target board: " + this.targetBoard, "success");
            }
        }
    }

    private copyTclFileAndConstr() {

        const directorySourceName: string = ".bm-resources";
        if (!existsSync(directorySourceName)) {
            throw new Error("Bm resources folder not found.");
        }

        const filesInFolder: string[] = fs.readdirSync(directorySourceName);
        const targetBoardFiles: string[] = [];

        for (const file of filesInFolder) {
            if (file.startsWith(this.targetBoard)) {
                targetBoardFiles.push(file);
            }
        }

        for (const targetFile of targetBoardFiles) {
            const foundfile = this.filesToCheck.find(elm => targetFile.includes(elm));
            if (foundfile == undefined) {
                execSync(`cp ${directorySourceName}/${targetFile} ${targetFile}`);
            } else {
                if(fs.existsSync(targetFile) == false) {
                    execSync(`cp ${directorySourceName}/${targetFile} ${targetFile}`);
                } 
            }   
        }
    }

    public async apply() {

        // THE APPLY IS ONLY CALLED WITH THE COMMAND 
        // BMHELPER APPLY

        //await this.execValidation(true);
        await this.execOptionalDependencies();

        this.workingDir = this.variables.find(elm => elm.name === "WORKING_DIR").value;

        this.writeGenerateMk();
        this.copyTclFileAndConstr();
    }
}