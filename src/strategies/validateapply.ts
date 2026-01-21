import { IStrategy } from "../interfaces/IStrategy";
import readline from "readline";
import fs, { existsSync } from "fs";
import { debugLog, productionLog } from "../functions/generics";
import { ProjectsHandler } from "../projecthandlers/projects";
import { execSync } from "child_process";
import { BondGoProjectHandler } from "../projecthandlers/bondgo";
import { NeuralNetworkProjectHandler } from "../projecthandlers/neuralnetwork";
import { FlexpyProjectHandler } from "../projecthandlers/flexpy";
import { AsmProjectHandler } from "../projecthandlers/asm";
import { BasmProjectHandler } from "../projecthandlers/basm";
import { QuantumProjectHandler } from "../projecthandlers/quantum";
import { JSONProjectHandler } from "../projecthandlers/json";

export interface IVariable {
    name: string;
    value: string;
    toGenerate: boolean;
    content?: string;
}

/**
 * proj_diff_template
 */
// workflow => simulazione da template. E' attivo se c'è la variable project_type=templatesim
// quando fai apply ti ritrovi con n progetti copie di questo risolti i template 
// generated.mk che includiamo nel makefile (qui ci va la lista dei progetti) MULTI_LIST=...
// devo verificare che ci sia il progect target
// dentro a generated.mk template_nometemplate=<valore> template_
// TEMPLATE=NOME
// VALORE=<VALORE>
// OGNUNO DEI TWMPLATE HA GENERATED.MK

export class ValidateApplyStrategy implements IStrategy {

    private variables: IVariable[];
    private workflows: { name: string; key: string; value: string }[];
    private workflowsSelected: { name: string; key: string; value: string }[];
    private configsFileToRead: string[];
    private tools: string[];

    constructor(protected apply: boolean) {
        this.variables = []
        this.workflows = [
            {
                name: "simulation",
                key: "PROJECT_TYPE",
                value: "templsim"
            },
            {
                name: "simulation",
                key: "PROJECT_TYPE_MULTI",
                value: "y"
            },
            {
                name: "bondgo",
                key: "SOURCE_GO",
                value: ""
            },
            {
                name: "asm",
                key: "SOURCE_ASM",
                value: ""
            },
            {
                name: "basm",
                key: "SOURCE_BASM",
                value: ""
            },
            {
                name: "neuralnetwork",
                key: "SOURCE_NEURALBOND",
                value: ""
            },
            {
                name: "json",
                key: "SOURCE_JSON",
                value: ""
            },
            {
                name: "quantum",
                key: "SOURCE_QUANTUM",
                value: ""
            },
            {
                name: "flexpy",
                key: "SOURCE_FLEXPY",
                value: ""
            }
        ]
        this.workflowsSelected = [];
        this.configsFileToRead = [".config", "local.mk"]
        this.apply = apply;
    }

    getWorkflow() {

        debugLog("Analyzing the project to detect the workflow...", "warning");

        const keys = this.workflows.map(elm => elm.key);
        for (const variable of this.variables) {
            if (keys.includes(variable.name)) {
                this.workflowsSelected.push(this.workflows.find(elm => elm.key === variable.name))
            }
        }

        if (this.workflowsSelected.length == 0) {
            throw new Error("No workflows could be identified based on the analyzed files")
        }

        productionLog("Workflow detected: " + this.workflowsSelected.map(elm => elm.name).join(",")+".", "success");
    }

    public async exec() {

        for (const workflow of this.workflowsSelected) {
            if (workflow.key == "PROJECT_TYPE_MULTI" && workflow.value == "y") {
                const prjHandler = new ProjectsHandler(this.variables);
                await prjHandler.execValidation(this.apply);
                if (this.apply === true) {
                    await prjHandler.apply();
                }
            } else if (workflow.key == "SOURCE_GO") {
                const bondgoPrjHandler = new BondGoProjectHandler(this.variables);
                await bondgoPrjHandler.execValidation(this.apply);
                if (this.apply === true) {
                    await bondgoPrjHandler.apply();
                }
            } else if (workflow.key == "SOURCE_NEURALBOND") {
                const nnPrjHandler = new NeuralNetworkProjectHandler(this.variables);
                await nnPrjHandler.execValidation(this.apply);
                if (this.apply === true) {
                    await nnPrjHandler.apply();
                }
            } else if (workflow.key == "SOURCE_ASM") {
                const asmPrjHandler = new AsmProjectHandler(this.variables);
                await asmPrjHandler.execValidation(this.apply);
                if (this.apply === true) {
                    await asmPrjHandler.apply();
                }
            } else if (workflow.key == "SOURCE_BASM") {
                const basmPrjHandler = new BasmProjectHandler(this.variables);
                await basmPrjHandler.execValidation(this.apply);
                if (this.apply === true) {
                    await basmPrjHandler.apply();
                }
            } else if (workflow.key == "SOURCE_QUANTUM") {
                const quantumPrjHandler = new QuantumProjectHandler(this.variables);
                await quantumPrjHandler.execValidation(this.apply);
                if (this.apply === true) {
                    await quantumPrjHandler.apply();
                }
            } else if (workflow.key == "SOURCE_FLEXPY") {
                const flexpyPrjHandler = new FlexpyProjectHandler(this.variables);
                await flexpyPrjHandler.execValidation(this.apply);
                if (this.apply === true) {
                    await flexpyPrjHandler.apply();
                }
            } else if (workflow.key == "SOURCE_JSON") {
                const jsonProjectHandler = new JSONProjectHandler(this.variables);
                await jsonProjectHandler.execValidation(this.apply);
                if (this.apply === true) {
                    await jsonProjectHandler.apply();
                }
            }
            
        }
    }

    insertNewVariable(name: string, value: string) {
        const alreadyExists = this.variables.findIndex(elm => elm.name === name);
        if (alreadyExists != -1) {
            this.variables.splice(alreadyExists, 1)
        }
        if (value === undefined) {
            value = "";
        }
        const entry: IVariable = {
            name: name,
            value: value.replace(/"/g, '').trim(),
            toGenerate: false
        };
        this.variables.push(entry);
    }

    async readMk(mkfilepath: string) {
        const fileStream = fs.createReadStream(mkfilepath);
        const rl = readline.createInterface({
            input: fileStream,
            crlfDelay: Infinity
        });

        for await (const line of rl) {
            const trimmedLine = line.trim();
            if (trimmedLine.startsWith('#')) {
                continue
            }
            if (trimmedLine.startsWith('include')) {
                const [name, value] = trimmedLine.split(' ');
                await this.readMk(value)
            } else {
                const [name, value] = trimmedLine.split('=');
                this.insertNewVariable(name, value);
            }
        }

    }

    async check(): Promise<void> {

        // read .config and local.mk and store all the variables;
        // based on the project type, exec the validation 

        for (const configFileToRead of this.configsFileToRead) {

            if (existsSync(configFileToRead) == false) {
                continue;
            }

            const fileStream = fs.createReadStream(configFileToRead);
            const rl = readline.createInterface({
                input: fileStream,
                crlfDelay: Infinity
            });

            for await (const line of rl) {
                const trimmedLine = line.trim();
                debugLog(` Reading line: ${trimmedLine} from file ${configFileToRead}`, "warning");
                if (trimmedLine.startsWith('CONFIG_') && configFileToRead == ".config") {
                    const [name, value] = trimmedLine.split('=');
                    debugLog(` Detected variable ${name} with value ${value}`, "warning");
                    this.insertNewVariable(name.substring('CONFIG_'.length), value)
                } else if (configFileToRead == "local.mk") {
                    debugLog(` Processing local.mk line: ${trimmedLine}`, "warning");
                    if (trimmedLine.startsWith('#')) {
                        continue
                    }
                    if (trimmedLine.startsWith('include')) {
                        debugLog(` Detected include statement`, "warning");
                        const [name, value] = trimmedLine.split(' ');
                        debugLog(` Including file ${value}`, "warning");
                        await this.readMk(value.trim())
                        continue
                    } else {
                        debugLog(` Detected variable assignment`, "warning");
                        const [name, value] = trimmedLine.split('=');
                        this.insertNewVariable(name, value);
                    }
                }
            }
        }

        debugLog(` variables found: ${JSON.stringify(this.variables, null, 4)}`, "warning");

        this.getWorkflow();
    }

}