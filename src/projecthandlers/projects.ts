import { execSync } from "child_process";
import { IVariable } from "../strategies/validateapply";
import { v4 as uuid } from "uuid";
import fs, { existsSync, mkdirSync } from "fs";
import { IWorkflowHandler } from "../interfaces/IStrategy";
import { productionLog } from "../functions/generics";
import { AbstractHandler } from "./abstracthandler";
import { IMandatoryDependencies } from "./bondgo";

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

export class ProjectsHandler extends AbstractHandler {

    protected mandatoryDependencies: IMandatoryDependencies[];
    protected optionalDependencies: IVariable[];
    private templatesData: ITemplateData[];
    private patternsToCheck: string[];
    private workingDir: string;
    private jsonToRead: string;
    private templateDir: string;
    private generatedProjects: string[];
    private projectsListName: string;
    private globalGeneratedMkFile: string;

    constructor(protected variables: IVariable[]) {
        super(variables)
        this.mandatoryDependencies = [{
            name: "MULTI_TEMPLATEDIR",
            type: "dir"
        }, {
            name: "MULTI_TEMPLATEDESC",
            type: "dir"
        }]
        this.optionalDependencies = [{
            name: "WORKING_DIR",
            value: "working_dir",
            toGenerate: false
        }]
        this.ignoreDependencies = []
        this.variables = variables;
        this.templatesData = [];
        this.patternsToCheck = ['{{datatype}}', '{{ranges}}', '{{prefix}}', '{{registersize}}', '{{multop}}'];
        this.workingDir = "";
        this.jsonToRead = "";
        this.templateDir = "";
        this.generatedProjects = [];
        this.projectsListName = "projectslist"
        this.globalGeneratedMkFile = "generated.mk"
    }

    checkInternalDependencies(apply: boolean): void {
        const templateDir = this.variables.find(elm => elm.name === "MULTI_TEMPLATEDIR");
        const jsonToRead = this.variables.find(elm => elm.name === "MULTI_TEMPLATEDESC");

        if(!fs.existsSync(templateDir.value)) {
            throw new Error("the template directory selected "+templateDir.value+" does not exist")
        }

        if(!fs.existsSync(jsonToRead.value)) {
            throw new Error("the json file specified "+jsonToRead.value+" does not exist")
        }

        if (!fs.existsSync(jsonToRead.value)) {
            throw new Error("Json file with template specifics not found: " + jsonToRead)
        }

        this.jsonToRead = jsonToRead.value;

        if (!fs.existsSync(jsonToRead.value)) {
            throw new Error("template dir not found: " + jsonToRead)
        }

        this.templateDir = templateDir.value;
    }

    private readTemplateJson() {

        if (!fs.existsSync(this.jsonToRead)) {
            throw new Error("Json file with template specifics not found: " + this.jsonToRead)
        }

        const fileData = fs.readFileSync(this.jsonToRead, 'utf8');
        const jsonData: ITemplateType = JSON.parse(fileData);
        for (const key of Object.keys(jsonData)) {
            const infoToAdd = jsonData[key];
            if (!("name" in infoToAdd)) {
                infoToAdd["name"] = [key];
            }
            this.templatesData.push(infoToAdd)
        }
    }

    private writeGeneratedVariables() {
        this.generateMkVariables.push({
            name: "SOURCE_MULTI",
            value: this.projectsListName,
            toGenerate: false
        })
    }


    // se ci sono tre grandezze differenti => tira errore
    private createProject(templateInfo: ITemplateData) {

        const valuesSize: number[] = [];

        for (const key in templateInfo) {
            const value = templateInfo[key];
            valuesSize.push(value.length);
        }

        if (Array.from(new Set(valuesSize)).length > 2) {
            throw new Error("Sizes mismatch")
        }

        const maxValue = Math.max(...valuesSize);

        for (const key in templateInfo) {
            const value = templateInfo[key];
            if (value.length < maxValue) {
                const diff = maxValue - value.length
                for (let j = 0; j < diff; j++) {
                    value.push(value[0])
                }
            }
        }

        for (let i = 0; i < maxValue; i++) {
            const directoryClonedName: string = `template_${templateInfo["name"][0]}_${i}`;
            this.generatedProjects.push(this.workingDir + "/" + directoryClonedName);
            execSync(`cp -r ${this.templateDir} ${this.workingDir}/${directoryClonedName}`);
            let generateMkFile: string[] = [];
            for (const key in templateInfo) {
                const value = templateInfo[key][i];
                const files = fs.readdirSync(`${this.workingDir}/${directoryClonedName}`);

                for (const file of files) {
                    const filePath = `${this.workingDir}/${directoryClonedName}/${file}`;
                    const data = fs.readFileSync(filePath, 'utf8');
                    let modifiedData = data;
                    const regex = new RegExp("{{" + key + "}}", 'g');
                    modifiedData = modifiedData.replace(regex, value);
                    fs.writeFileSync(filePath, modifiedData, 'utf8');
                }

                if (key == "name") {
                    generateMkFile.push("TEMPLATE_INSTANCE" + key.toUpperCase() + "=" + value);
                } else {
                    generateMkFile.push("TEMPLATE_" + key.toUpperCase() + "=" + value);
                }
            }

            const generatedMkFileToDump = generateMkFile.join("\n");
            fs.writeFileSync(`${this.workingDir}/${directoryClonedName}/generated.mk`, generatedMkFileToDump, 'utf8');
        }
    }

    private duplicateFolder() {

        if (!existsSync(`${this.workingDir}`)) {
            mkdirSync(`${this.workingDir}`)
        }

        for (const templateData of this.templatesData) {
            this.createProject(templateData);
        }

        const projectsList = this.generatedProjects.join("\n");
        fs.writeFileSync(`${this.projectsListName}`, projectsList, 'utf8')

        this.writeGeneratedVariables();
    }

    public async apply() {

        //await this.execValidation(true);
        await this.execOptionalDependencies();

        this.workingDir = this.variables.find(elm => elm.name === "WORKING_DIR").value;

        this.readTemplateJson();
        this.duplicateFolder();
        this.writeGenerateMk();

    }
}