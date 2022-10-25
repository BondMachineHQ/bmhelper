import { execSync } from "child_process";
import fs, { mkdirSync } from "fs";
import { debugLog } from "../functions/generics";
import { NeuralNetworkHandler } from "../handlers/createPrj/nnHandler";

export interface IStrategy {
    checkParams(): void;
    execute(): void;
}

export class CreateStrategy implements  IStrategy{

    private necessaryParams: string[];
    private projectName: string;
    private projectType: string;
    private board: string;
    private necessaryParamsForProject: { projectType: string; requiredInputs: string[]}[];

    constructor(protected params: string[]) {
        this.params = params;
        this.necessaryParams = ["project_name", "board", "project_type"];
        this.necessaryParamsForProject = [{
            projectType: "neural_network",
            requiredInputs: ['n_inputs', 'n_outputs']
        }];
        //this.necessaryParams = [...this.necessaryParams, ...this.necessaryParamsForProject.map(elm => elm.requiredInputs).flat()] as string[]
    }
    

    checkParams(): void {
        // validate project name, project type and board

        const necessaryParamsLength = this.necessaryParams.length;
        
        let paramCounter = 0;
        for(let i = 0; i < this.params.length; i++) {
            
            if (this.params[i].startsWith("--") == false) {
                continue;
            }

            const param = this.params[i].slice(2, this.params[i].length);
            // if (this.necessaryParams.includes(param) == false) {
            //     throw new Error(" Param "+param+" is not handled by create strategy.")
            // }
            switch(param) {
                case "project_name":
                    this.projectName = this.params[i+1];
                    break;
                case "board":
                    this.board = this.params[i+1];
                    break;
                case "project_type":
                    this.projectType = this.params[i+1];
                    break;
            }
            paramCounter = paramCounter + 1;
            
        }

        if (paramCounter < necessaryParamsLength) {
            throw new Error(" Not all parameters has been specified; necessary parameters are: "+this.necessaryParams.join(","))
        }

        debugLog(" Request to create project. Specifics: ", "success");
        debugLog(" Project name is:  " + this.projectName, "success");
        debugLog(" Project board is: " + this.board, "success");
        debugLog(" Project type is:  " + this.projectType, "success");
    }

    public execute(): void {
    
        switch(this.projectType) {
            case "neural_network":
                const nnHandler = new NeuralNetworkHandler(this.projectName, this.board, this.params);
                nnHandler.checkAndExtractProjectRequirements();
                nnHandler.initializeProject();
                break;
            default:
                throw new Error(" Project type not yet handled by Bondmachine helper tool");
        }

    }

}