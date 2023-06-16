import { IStrategy } from "../interfaces/IStrategy";
import readline from "readline";
import fs, { existsSync } from "fs";
import { debugLog } from "../functions/generics";
import { ProjectsHandler } from "../projecthandlers/projects";

export interface IVariable {
    name: string;
    value: string;
}

/**
 * proj_diff_template
 */
// workflow => simulazione da template. E' attivo se c'è la variable project_type=templatesim
// quando fai apply ti ritrovi con n progetti copie di questo risolti i template 
// generated.mk che includiamo nel makefile (qui ci va la lista dei progetti) PROJECTS_LIST=...
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
                key: "PROJECT_TYPE_PROJECTS",
                value: "y"
            }
        ]
        this.workflowsSelected = [];
        this.configsFileToRead = [".config", "local.mk"]
        this.apply = apply;
    }

    getWorkflow() {

        const keys = this.workflows.map(elm => elm.key);

        for (const variable of this.variables) {
            if (keys.includes(variable.name)) {
                this.workflowsSelected.push(this.workflows.find(elm => elm.key === variable.name))
            }
        }

        if (this.workflowsSelected.length == 0) {
            throw new Error("No workflow found")
        }

        debugLog(" Workflows detected: "+this.workflowsSelected.map(elm => elm.name).join(","), "success")
    }

    public async exec() {

        for(const workflow of this.workflowsSelected) {
            if (workflow.key == "PROJECT_TYPE_PROJECTS" && workflow.value == "y") {
                const prjHandler = new ProjectsHandler(this.variables);
                prjHandler.execValidation();
                if(this.apply === true) {
                    prjHandler.apply();
                }
            }
        }
    }

    //  PROJECTS_TARGET (simulate)
    //  PROJECT_TYPE (templatesim)

    insertNewVariable(name: string, value: string) {
        const alreadyExists = this.variables.findIndex(elm => elm.name === name);
        if (alreadyExists != -1) {
            this.variables.splice(alreadyExists, 1)
        }
        const entry: IVariable = {
            name: name,
            value: value.replace(/"/g, '').trim()
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
                if (trimmedLine.startsWith('CONFIG_') && configFileToRead == ".config") {
                    const [name, value] = trimmedLine.split('=');
                    this.insertNewVariable(name.substring('CONFIG_'.length), value)
                } else if (configFileToRead == "local.mk") {
                    if (trimmedLine.startsWith('#')) {
                        continue
                    }
                    if (trimmedLine.startsWith('include')) {
                        const [name, value] = trimmedLine.split(' ');
                        await this.readMk(value.trim())
                        continue
                    } else {
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