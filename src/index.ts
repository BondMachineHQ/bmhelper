import { execSync } from "child_process";
import { debugLog, productionLog } from "./functions/generics";
import { CreateStrategy } from "./strategies/create";
import { ValidateApplyStrategy } from "./strategies/validateapply";

// there will be three actions 
// 1. create -> create the projects with Makefile and kconfig

export type actionT = "create"  | "validate" | "apply" // "delete", "update" ...
export let ISDEBUGACTIVE:boolean = false;


function buildErrorAndReturn(error: string) {
    const errorToReturn: { error: string } = {
        error: error
    };
    productionLog(JSON.stringify(errorToReturn), "error");
    execSync("rm -rf .bm-resources")
    process.exit(1);
}

async function main() {

    const paramsPassedByCli: string[] = process.argv.slice(2);
    const action: actionT = paramsPassedByCli[0] as actionT;
    ISDEBUGACTIVE = paramsPassedByCli.length > 1 && paramsPassedByCli[1] == "debug" ? true : false;

    debugLog(` Requested ${action} `, "success");

    if (action == undefined) {
        buildErrorAndReturn("Action must be specified");
    }

    // clone bm resources repository
    execSync("git clone -q https://github.com/BondMachineHQ/bmresources.git");
    execSync("mv bmresources .bm-resources")

    switch (action) {
        case "create":
            const createStrategy = new CreateStrategy(paramsPassedByCli);
            try {
                createStrategy.check();
            } catch (err) {
                buildErrorAndReturn("Params are not correct; " + err.message);
            }
            try {
                createStrategy.execute();
            } catch (err) {
                buildErrorAndReturn("Error during execution of action requested; " + err.message);
            }
            break
        case "validate":
            const validateStrategy = new ValidateApplyStrategy(false);
            try {
                await validateStrategy.check();
                await validateStrategy.exec();
            } catch (err) {
                buildErrorAndReturn("Params are not correct; " + err.message);
            }
            break
        case "apply":
            const applyStrategy = new ValidateApplyStrategy(true);
            try {
                await applyStrategy.check();
                await applyStrategy.exec();
            } catch (err) {
                buildErrorAndReturn("Params are not correct; " + err.message);
            }
            break
        default:
            buildErrorAndReturn("Action not handled by bondmachine helper");
            break;
    }

    execSync("rm -rf .bm-resources")

    productionLog(`Project has been successfully ${action}`, "success")
    process.exit(0);

}

main();
