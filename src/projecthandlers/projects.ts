import { execSync } from "child_process";
import { IVariable } from "../strategies/validateapply";
import { v4 as uuid } from "uuid";
import fs, { existsSync, mkdirSync } from "fs";
import { IWorkflowHandler } from "../interfaces/IStrategy";

export interface ITemplateType {
    [key: string]: ITemplateData
}

export interface ITemplateData {
    datatype: string[];
    prefix: string[];
    ranges: string[];
    registersize: string[];
}

export class ProjectsHandler implements IWorkflowHandler {

    private dependencies: string[];
    private templatesData: ITemplateData[];
    private patternsToCheck: string[];
    private workingDir: string;
    private jsonToRead: string;
    private templateDir: string;
    private generatedProjects: string[];
    private projectsListName: string;
    private globalGeneratedMkFile: string;

    constructor(protected variables: IVariable[]) {
        this.dependencies = ["PROJECTS_TEMPLATEDIR", "PROJECTS_TEMPLATEDESC", "WORKING_DIR"]
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

    public execValidation() {

        for(const dep of this.dependencies) {
            let found: boolean = false;
            for(const variable of this.variables) {
                if (dep == variable.name) {
                    found = true;
                    continue
                }
            }
            if (found == false) {
                throw new Error("Dependency not aligned for variable: "+dep)
            }
        }

        const templateDir = this.variables.find(elm => elm.name === "PROJECTS_TEMPLATEDIR");
        const jsonToRead = this.variables.find(elm => elm.name === "PROJECTS_TEMPLATEDESC");

        if (!fs.existsSync(jsonToRead.value)) {
            throw new Error("Json file with template specifics not found: "+jsonToRead)
        }

        this.jsonToRead = jsonToRead.value;
        
        if (!fs.existsSync(jsonToRead.value)) {
            throw new Error("template dir not found: "+jsonToRead)
        }

        this.templateDir = templateDir.value;
    }

    private readTemplateJson() {

        if (!fs.existsSync(this.jsonToRead)) {
            throw new Error("Json file with template specifics not found: "+this.jsonToRead)
        }

        const fileData = fs.readFileSync(this.jsonToRead, 'utf8');
        const jsonData: ITemplateType = JSON.parse(fileData);
        for(const key of Object.keys(jsonData)) {
            this.templatesData.push(jsonData[key])
        }
    }

    private modifyFileInDirectoryCloned(directoryClonedName: string, templateData: ITemplateData, range: string) {
        const files = fs.readdirSync(`${this.workingDir}/${directoryClonedName}`);
        for (const file of files) {
            const filePath = `${this.workingDir}/${directoryClonedName}/${file}`;

            const data = fs.readFileSync(filePath, 'utf8');

            let modifiedData = data;
            for(let i = 0; i < this.patternsToCheck.length; i++) {
                const regex = new RegExp(this.patternsToCheck[i], 'g');
                if (this.patternsToCheck[i].includes("datatype")) {
                    modifiedData = modifiedData.replace(regex, templateData["datatype"][0]);
                } 
                if (this.patternsToCheck[i].includes("prefix")) {
                    modifiedData = modifiedData.replace(regex, templateData["prefix"][0]);
                } 
                if (this.patternsToCheck[i].includes("range")) {
                    modifiedData = modifiedData.replace(regex, range);
                } 
                if (this.patternsToCheck[i].includes("registersize")) {
                    modifiedData = modifiedData.replace(regex, templateData["registersize"][0]);
                } 
                if (this.patternsToCheck[i].includes("multop")) {
                    modifiedData = modifiedData.replace(regex, templateData["multop"][0]);
                }
            }

            fs.writeFileSync(filePath, modifiedData, 'utf8')
        }
        
        const generateMkFile = "TEMPLATE_DATATYPE="+templateData.datatype+"\n"+
                            "TEMPLATE_PREFIX="+templateData.prefix+"\n"+
                            "TEMPLATE_RANGE="+range+"\n"+
                            "TEMPLATE_REGISTERSIZE="+templateData.registersize+"\n"
        
        fs.writeFileSync(`${this.workingDir}/${directoryClonedName}/generated.mk`, generateMkFile, 'utf8')
    }

    private writeGeneratedVariables() {
        const valueOfGlobalMkFile = "SOURCE_PROJECTS="+this.projectsListName+"\n";
        fs.writeFileSync(`${this.globalGeneratedMkFile}`, valueOfGlobalMkFile, 'utf8')
    }

    private duplicateFolder() {

        if (!existsSync(`${this.workingDir}`)) {
            mkdirSync(`${this.workingDir}`)
        }

        for(const templateData of this.templatesData) {
            for(const range of templateData.ranges) {
                const generatedUuid:string = uuid();
                const directoryClonedName: string = `template_${generatedUuid.replace(/-/g, "_")}`;
                this.generatedProjects.push(this.workingDir+"/"+directoryClonedName)
                execSync(`cp -r ${this.templateDir} ${this.workingDir}/${directoryClonedName}`);
                this.modifyFileInDirectoryCloned(directoryClonedName, templateData, range)
            }
        }
        
        const projectsList = this.generatedProjects.join("\n");
        fs.writeFileSync(`${this.projectsListName}`, projectsList, 'utf8')

        this.writeGeneratedVariables();
    }

    public apply() {

        this.execValidation();
        this.workingDir = this.variables.find(elm => elm.name === "WORKING_DIR").value;

        this.readTemplateJson();
        this.duplicateFolder();

    }
}