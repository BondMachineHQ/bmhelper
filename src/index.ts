import { execSync } from "child_process";
import { debugLog, productionLog } from "./functions/generics";
import { CreateStrategy } from "./strategies/create";

export type actionT = "create" // "delete", "update" ...

function buildErrorAndReturn(error: string) {
    const errorToReturn: { error: string } = {
        error: error
    };
    debugLog(JSON.stringify(errorToReturn), "error");
    execSync("rm -rf .bm-resources")
    process.exit(1);
}

async function main() {

    const paramsPassedByCli: string[] = process.argv.slice(2);
    const action: actionT = paramsPassedByCli[0] as actionT;

    if (action == undefined) {
        buildErrorAndReturn("Action must be specified");
    }

    // clone bm resources repository
    execSync("git clone -q https://github.com/BondMachineHQ/bmresources.git");
    execSync("mv bmresources .bm-resources")

    switch(action) {
        case "create":
            const createStrategy = new CreateStrategy(paramsPassedByCli);
            try {
                createStrategy.checkParams();
            }catch(err) {
                buildErrorAndReturn("Params are not correct; "+err.message);
            }
            try {
                createStrategy.execute();
            }catch(err) {
                buildErrorAndReturn("Error during execution of action requested; "+err.message);
            }
            break
        default:
            buildErrorAndReturn("Action not handled by bondmachine helper");
            break;
    }
    
    execSync("rm -rf .bm-resources")

    debugLog(" Project has been successfully created", "success");
    process.exit(0);
    
}

main();
