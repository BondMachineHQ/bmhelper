import { execSync } from "child_process";
import fs, { existsSync, mkdirSync } from "fs";
import { debugLog, productionLog } from "../functions/generics";
import { IStrategy } from "../interfaces/IStrategy";

export class CreateStrategy {

    private necessaryParams: string[];
    private projectName: string;
    private listExamples: boolean;
    private createFromTemplate: boolean;
    private projectTemplateName: string;
    private filesToCopy: string[];

    constructor(protected params: string[]) {
        this.params = params;
        this.necessaryParams = ["project_name"];
        this.filesToCopy = ["Makefile", "Kconfig"];
        this.listExamples = false;
        this.createFromTemplate = false;
        this.projectTemplateName = "";
    }

    public getProjectName(): string {
        return this.projectName;
    }

    public list(): void {

        productionLog("Going to check the available template projects to start with.", "success");

        execSync("git clone -q https://github.com/BondMachineHQ/bmexamples.git", { stdio: 'ignore' });

        const filesInFolder: string[] = fs.readdirSync("bmexamples");

        const projectsTemplate: string[] = [];
        for (const fileName of filesInFolder) {
            if (fs.lstatSync(fileName).isDirectory()) {
                projectsTemplate.push(fileName);
            }
        }

        execSync("rm -rf bmexamples");
        productionLog("The following is the list of the template projects you can start with", "success");
        for (let i = 0; i < projectsTemplate.length; i++) {
            productionLog(i.toString() + " -> " + projectsTemplate[i], "success");
        }
        productionLog("Use this command 'bmhelper create --project_name project_test --example example_name' to create a new project from a template ", "success");
    }

    public check(): void {

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
                case "list-examples":
                    this.listExamples = true;
                    break;
                case "example":
                    this.createFromTemplate = true;
                    this.projectTemplateName = this.params[i + 1];
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

    private create(): void {
        if(fs.existsSync(this.projectName)) {
            throw new Error(`A folder called ${this.projectName} already exists.`)
        }
        if (this.createFromTemplate == false) {
            debugLog(" Going to create project directory: " + this.projectName, "warning")
            mkdirSync(this.projectName)
            debugLog(" Successfully create project directory: " + this.projectName, "success")

            productionLog(`Project has been successfully created.`, "success");
            
        } else {
            productionLog("Going to check the available template projects to start with.", "success");
            execSync("git clone -q https://github.com/BondMachineHQ/bmexamples.git", { stdio: 'ignore' });

            const filesInFolder: string[] = fs.readdirSync("bmexamples");

            const projectsTemplate: string[] = [];
            for (const fileName of filesInFolder) {
                if (fileName.startsWith("proj_")) {
                    projectsTemplate.push(fileName);
                }
            }

            if (projectsTemplate.includes(this.projectTemplateName) == false) {
                execSync("rm -rf bmexamples");
                throw new Error("project specified is not in the list of the template projects.");
            }

            execSync(`cp -r bmexamples/${this.projectTemplateName} ${this.projectName}`);
            execSync("rm -rf bmexamples");
            productionLog("Project successfully created from template.", "success");
        }

        for (const fileToCopy of this.filesToCopy) {
            debugLog(` Going to copy ${fileToCopy} `, `warning`)
            execSync(`cp .bm-resources/${fileToCopy} ${this.projectName}/`)
            debugLog(` Copied ${fileToCopy} `, `success`)
        }
    }

    public execute(): void {

        if (this.listExamples == false) {            
            this.create();
        } else {
            this.list();
        }
    }
}