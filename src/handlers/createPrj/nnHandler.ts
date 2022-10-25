import { execSync } from "child_process";
import { fstat, mkdirSync, writeFileSync, existsSync } from "fs";
import { debugLog } from "../../functions/generics";

export class NeuralNetworkHandler {

    private n_inputs: number;
    private n_outputs: number;
    private necessaryParamsForProject: { projectType: string; requiredInputs: string[]}[];

    constructor(protected projectName: string, protected board: string, protected params: string[]) {
        this.projectName = projectName;
        this.board = board;
        this.params = params;
        this.necessaryParamsForProject = [{
            projectType: "neural_network",
            requiredInputs: ['n_inputs', 'n_outputs']
        }];
    }

    checkAndExtractProjectRequirements(): void {

        for(let i = 0; i < this.params.length; i++) {

            if (this.params[i].startsWith("--") == false) {
                continue
            }
            const param = this.params[i].slice(2, this.params[i].length);
            switch(param) {
                case "n_inputs":
                    this.n_inputs = parseInt(this.params[i+1])
                    break;
                case "n_outputs":
                    this.n_outputs = parseInt(this.params[i+1])
                    break;
            }
        }
    }

    private checkDependencies(directoryName: string) {
        if (existsSync(directoryName) == true) {
            throw new Error(" Directory already exists, choose another name");
        }
        if (existsSync(`.bm-resources/${this.board}_maps.json`) == false) {
            throw new Error(` ${this.board}_maps.json not in .bm-resources directory`)
        }
        if (existsSync(`.bm-resources/${this.board}.xdc`) == false) {
            throw new Error(` ${this.board}.xdc not in .bm-resources directory`)
        }
        if (existsSync(`.bm-resources/buildroot.mk`) == false) {
            throw new Error(` buildroot.mk not in .bm-resources directory`)
        }
        if (existsSync(`.bm-resources/crosscompile.mk`) == false) {
            throw new Error(` crosscompile.mk not in .bm-resources directory`)
        }
    }

    public initializeProject() {
        // create project directory 
        const directoryName: string = "proj_"+this.board+"_"+"neural";

        this.checkDependencies(directoryName);


        debugLog(" Going to create project directory: " + directoryName, "warning")
        mkdirSync(directoryName)
        debugLog(" Successfully create project directory: " + directoryName, "success")

        
        debugLog(" Going to copy makefile ", "warning")
        execSync(`cp .bm-resources/Makefile ${directoryName}/`)
        debugLog(" Copied Makefile ", "success")

        debugLog(" Going to copy board files", "warning")
        execSync(`cp .bm-resources/${this.board}_maps.json ${directoryName}/`)
        execSync(`cp .bm-resources/${this.board}.xdc ${directoryName}/`)
        debugLog(" Successfully copied board files", "success")

        debugLog(" Going to copy neurons folder", "warning")
        execSync(`cp -r .bm-resources/neural_network/neurons ${directoryName}/`)
        debugLog(" Successfully copied neurons folder", "success")

        debugLog(" Going to copy local.mk ", "warning")
        execSync(`cp .bm-resources/neural_network/local.mk ${directoryName}/`)
        debugLog(" Successfully copied neurons folder", "success")

        debugLog(" Going to copy buildroot dependencies", "warning")
        execSync(`cp -r .bm-resources/buildroot.mk ${directoryName}/`)
        execSync(`cp -r .bm-resources/crosscompile.mk ${directoryName}/`)
        debugLog(" Successfully copied buildroot dependencies", "success")


        debugLog( " Going to create bmapi.json", "warning");
        
        const bmApi = {
            "Assoc": {}
        }

        const inputElements = [];
        for(let i = 0; i < this.n_inputs; i++) {
            const key = "i"+i.toString();
            const objToPush = {}
            objToPush[key] = i.toString();
            inputElements.push(objToPush)
        }

        const outputElements = [];
        for(let i = 0; i < this.n_outputs; i++) {
            const key = "o"+i.toString();
            const objToPush = {}
            objToPush[key] = i.toString();
            outputElements.push(objToPush)
        }

        if (inputElements.length > outputElements.length) {
            for(let i = 0; i < inputElements.length; i++) {
                bmApi.Assoc["i"+i.toString()] = i.toString();
                if (i >= outputElements.length) {
                    continue;
                }
                bmApi.Assoc["o"+i.toString()] = i.toString();
            }
        } else if (inputElements.length < outputElements.length) {
            for(let i = 0; i < outputElements.length; i++) {
                bmApi.Assoc["o"+i.toString()] = i.toString();
                if (i >= inputElements.length) {
                    continue;
                }
                bmApi.Assoc["i"+i.toString()] = i.toString();
            }
        } else {
            for(let i = 0; i < outputElements.length; i++) {
                bmApi.Assoc["i"+i.toString()] = i.toString();
                bmApi.Assoc["o"+i.toString()] = i.toString();
            }
        }
    
        writeFileSync(`${directoryName}/bmapi.json`, JSON.stringify(bmApi));
        debugLog(" Successfully create bmapi.json", "success");
    }
}