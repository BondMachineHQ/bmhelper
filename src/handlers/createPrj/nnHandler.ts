import { execSync } from "child_process";
import { fstat, mkdirSync, writeFileSync, existsSync } from "fs";
import { debugLog } from "../../functions/generics";
import fs from "fs";

export type flavor = "aximm" | "axist";

export class NeuralNetworkHandler {

    private n_inputs: number;
    private n_outputs: number;
    private source_neuralbond: string;
    private flavor: flavor;
    private necessaryParamsForProject: { projectType: string; requiredInputs: string[]}[];

    constructor(protected projectName: string, protected board: string, protected params: string[]) {
        this.projectName = projectName;
        this.board = board;
        this.params = params;
        this.necessaryParamsForProject = [{
            projectType: "neural_network",
            requiredInputs: ['n_inputs', 'n_outputs', 'source_neuralbond', 'flavor']
        }];
    }

    modifyLocalFile(directoryName: string): void {

        const ioMode = this.flavor == "aximm" ? "async" : "sync"

        const toSaveLocalMk = `WORKING_DIR=working_dir
CURRENT_DIR=$(shell pwd)
SOURCE_NEURALBOND=${this.source_neuralbond}
NEURALBOND_LIBRARY=neurons
NEURALBOND_ARGS=-config-file neuralbondconfig.json -operating-mode fragment -io-mode ${ioMode}
BMINFO=bminfo.json
BOARD=${this.board}
MAPFILE=${this.board}_maps.json
SHOWARGS=-dot-detail 5
SHOWRENDERER=dot
VERILOG_OPTIONS=-comment-verilog
DBASM_ARGS=-d
#BENCHCORE=i0,p22o0
#HDL_REGRESSION=bondmachine.sv
#BM_REGRESSION=bondmachine.json
include bmapi.mk
include crosscompile.mk
include buildroot.mk
include simbatch.mk`

        writeFileSync(`${directoryName}/local.mk`, toSaveLocalMk);
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
                case "source_neuralbond":
                    this.source_neuralbond = this.params[i+1]
                    break
                case "flavor":
                    this.flavor = this.params[i+1] as flavor;
                    break
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

    private copyTclFiles(directoryName) {
        const filesInDir = fs.readdirSync('.bm-resources/');
        for(const f of filesInDir) {
            if (f.includes("zedboard_template")) {
                debugLog(` Going to copy ${f} `, "warning")
                execSync(`cp .bm-resources/${f} ${directoryName}/`)
                debugLog(` Copied Makefile ${f}`, "success")
            }
        }
    }

    private modifyBmApi(directoryName: string) {

        const ioMode = this.flavor == "aximm" ? "async" : "sync"
        const toSaveBmApi = ioMode == "async" ? `USE_BMAPI=yes
BMAPI_LANGUAGE=go
BMAPI_FLAVOR=${ioMode}
BMAPI_MAPFILE=bmapi.json
BMAPI_LIBOUTDIR=working_dir/bmapi
BMAPI_MODOUTDIR=working_dir/module
BMAPI_AUXOUTDIR=working_dir/aux
BMAPI_GOAPP=sumapp.go
BMAPI_GOMOD=git.fisica.unipg.it/sumapp.git
        ` :`USE_BMAPI=yes
BMAPI_LANGUAGE=python
BMAPI_FLAVOR=${ioMode}
BMAPI_FLAVOR_VERSION=basic
BMAPI_MAPFILE=bmapi.json
BMAPI_LIBOUTDIR=working_dir/bmapi
BMAPI_FRAMEWORK=pynq
`
    writeFileSync(`${directoryName}/bmapi.mk`, toSaveBmApi);
    }

    private changeFlavor(directoryName: string) {
        const fileData = fs.readFileSync(`${directoryName}/bmapi.mk`, 'utf-8');
        const rows = fileData.split('\n');
        const rowIndex = rows.findIndex((row) => row.includes("BMAPI_FLAVOR"));
        const oldValue = rows[rowIndex];

        if (rowIndex !== -1) {
            rows[rowIndex] = rows[rowIndex].replace(oldValue, `BMAPI_FLAVOR=${this.flavor}`);
        
            const newData = rows.join('\n');
            console.log("before writing file")
            fs.writeFileSync(`${directoryName}/bmapi.mk`, newData, 'utf-8');
        }
    }

    public initializeProject() {
        // create project directory 
        //const directoryName: string = "proj_"+this.board+"_"+"neural";
        const directoryName: string = this.projectName;
        this.checkDependencies(directoryName);

        debugLog(" Going to create project directory: " + directoryName, "warning")
        mkdirSync(directoryName)
        debugLog(" Successfully create project directory: " + directoryName, "success")

        this.copyTclFiles(directoryName);
        
        debugLog(" Going to copy bmapi.mk ", "warning")
        // execSync(`cp .bm-resources/bmapi.mk ${directoryName}/`)
        // if (this.flavor != undefined) {
        //     this.changeFlavor(directoryName);
        // }
        this.modifyBmApi(directoryName);
        debugLog(" Copied bmapi.mk ", "success")

        debugLog(" Going to copy makefile ", "warning")
        execSync(`cp .bm-resources/Makefile ${directoryName}/`)
        debugLog(" Copied Makefile ", "success")

        debugLog(" Going to copy board files", "warning")
        execSync(`cp .bm-resources/${this.board}_maps.json ${directoryName}/`)
        execSync(`cp .bm-resources/${this.board}.xdc ${directoryName}/`)
        debugLog(" Successfully copied board files", "success")

        debugLog(" Going to copy simbatch.mk ", "warning")
        execSync(`cp .bm-resources/simbatch.mk ${directoryName}/`)
        debugLog(" Successfully copied simbatch.mk", "success")

        debugLog(" Going to copy simbatch.py ", "warning")
        execSync(`cp .bm-resources/simbatch.py ${directoryName}/`)
        debugLog(" Successfully copied simbatch.py", "success")

        debugLog(" Going to copy bminfo.json ", "warning")
        execSync(`cp .bm-resources/bminfo.json ${directoryName}/`)
        debugLog(" Successfully copied bminfo.json", "success")

        debugLog(" Going to copy neurons folder", "warning")
        execSync(`cp -r .bm-resources/neural_network/neurons ${directoryName}/`)
        debugLog(" Successfully copied neurons folder", "success")

        // debugLog(" Going to copy local.mk ", "warning")
        // execSync(`cp .bm-resources/neural_network/local.mk ${directoryName}/`)
        // debugLog(" Successfully copied local.mk", "success")

        debugLog(" Going to copy neuralbondconfig.json ", "warning")
        execSync(`cp .bm-resources/neural_network/neuralbondconfig.json ${directoryName}/`)
        debugLog(" Successfully copied neuralbondconfig.json", "success")

        debugLog(" Going to copy vivadoAXIcomment.sh ", "warning")
        execSync(`cp .bm-resources/vivadoAXIcomment.sh ${directoryName}/`)
        debugLog(" Successfully copied vivadoAXIcomment.sh", "success")

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
        this.modifyLocalFile(directoryName);

        debugLog(" Successfully create bmapi.json", "success");
    }
}