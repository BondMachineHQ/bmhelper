import { execSync } from "child_process";
import { IVariable } from "../strategies/validateapply";
import { v4 as uuid } from "uuid";
import fs, { existsSync, mkdirSync } from "fs";
import { IWorkflowHandler } from "../interfaces/IStrategy";
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

export class BondGoProjectHandler extends AbstractHandler {

    private workingDir: string;
    private globalGeneratedMkFile: string;

    constructor(protected variables: IVariable[]) {
        super(variables)
        this.mandatoryDependencies = [{
            name: "SOURCE_GO",
            type: "file"
        }]
        this.optionalDependencies = [{
            name: "WORKING_DIR",
            value: "working_dir",
            toGenerate: false
        },
        {
            name: "SHOWARGS",
            value: "-dot-detail 5",
            toGenerate: false
        },
        {
            name: "MAPFILE",
            value: "default_maps.json",
            toGenerate: true,
            content: `{"Assoc" : { "clk" : "clk", "reset" : "btnC" }}`
        }]
        this.workingDir = "";
        this.globalGeneratedMkFile = "generated.mk";
    }

    public checkInternalDependencies() {
        
        const variablesName: string[] = this.variables.map(elm => elm.name);

        const foundType = this.variables.find(elm => elm.name === "GENERAL_TYPE_BOARD" && elm.value === "y");
        if(foundType == undefined) {
            return;
        }

        const toolchains: string[] = ["TOOLCHAIN_XILINX", "TOOLCHAIN_ALTERA", "TOOLCHAIN_LATTICE"];
        const toolchainInts = toolchains.filter((value) => variablesName.includes(value));
        if(toolchainInts.length == 0) {
            throw new Error("You must select a toolchain in order to continue.")
        }

        const boards: string[] = ["XILINX_BOARD_ZEDBOARD", "XILINX_BOARD_BASYS3", "XILINX_BOARD_EBAZ4205"];
        const boardInts = boards.filter((value) => variablesName.includes(value));
        if(boardInts.length == 0) {
            throw new Error("You must select a board in order to continue.")
        }
    }

    public async apply() {

        // THE APPLY IS ONLY CALLED WITH THE COMMAND 
        // BMHELPER APPLY
        
        await this.execValidation();
        await this.execOptionalDependencies();

        this.workingDir = this.variables.find(elm => elm.name === "WORKING_DIR").value;

        // WIP: WRITE GENERATED.MK FILE

    }
}