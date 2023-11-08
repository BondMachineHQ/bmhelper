import { execSync } from "child_process";
import { debugLog, productionLog } from "./functions/generics";
import { CreateStrategy } from "./strategies/create";
import { ValidateApplyStrategy } from "./strategies/validateapply";
import { existsSync } from "fs";
import { DoctorStrategy } from "./strategies/doctor";

// there will be three actions 
// 1. create -> create the projects with Makefile and kconfig

export type actionT = "help" | "create"  | "validate" | "apply" | "doctor" | "version"
export let ISDEBUGACTIVE:boolean = false;

function buildErrorAndReturn(error: string) {
    productionLog(error, "error");
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

    if (existsSync(".bm-resources")) {
        execSync("rm -rf .bm-resources");
    }
    if (existsSync("bm-resources")) {
        execSync("rm -rf bm-resources");
    }

    if (action == "create" || action == "validate" || action == "apply") {
        // clone bm resources repository
        execSync("git clone -q https://github.com/BondMachineHQ/bmresources.git", { stdio: 'ignore' });
        execSync("mv bmresources .bm-resources")
    }

    const doctorStrategy = new DoctorStrategy(paramsPassedByCli);

    switch (action) {
        case "version":
            console.log(`\x1b[35m[ VERSION ] \x1b[37mBondmachine helper version: \x1b[34m ${require("../package.json").version} \x1b[37m`)
            break
        case "help":
            console.log(`\x1b[35m[ HELP ] \x1b[37mRun \x1b[34m bmhelper create   \x1b[37m \t \t to create a new project.`)
            console.log(`\x1b[35m[ HELP ] \x1b[37mRun \x1b[34m bmhelper create --list-examples \x1b[37m \t to list examples to start with.`)
            console.log(`\x1b[35m[ HELP ] \x1b[37mRun \x1b[34m bmhelper validate \x1b[37m \t \t to validate an existing project.`)
            console.log(`\x1b[35m[ HELP ] \x1b[37mRun \x1b[34m bmhelper apply    \x1b[37m \t \t to setup all dependencies and variables to an existing project.`)
            console.log(`\x1b[35m[ HELP ] \x1b[37mGet more details here: \x1b[34m https://github.com/BondMachineHQ/bmexamples    \x1b[37m`)
            break
        case "create":
            const createStrategy = new CreateStrategy(paramsPassedByCli);
            try {
                createStrategy.check();
            } catch (err) {
                buildErrorAndReturn(err.message);
            }
            try {
                createStrategy.execute();
            } catch (err) {
                buildErrorAndReturn(err.message);
            }
            break
        case "doctor":
            try {
                doctorStrategy.checkDependencies(true);
            } catch (err) {
                buildErrorAndReturn(err.message);
            }
            break
        case "validate":
            const validateStrategy = new ValidateApplyStrategy(false);
            try {
                doctorStrategy.checkDependencies(false);
                await validateStrategy.check();
                await validateStrategy.exec();
            } catch (err) {
                buildErrorAndReturn(err.message);
            }
            break
        case "apply":
            const applyStrategy = new ValidateApplyStrategy(true);
            try {
                doctorStrategy.checkDependencies(false);
                await applyStrategy.check();
                await applyStrategy.exec();
            } catch (err) {
                buildErrorAndReturn(err.message);
            }
            break
        default:
            buildErrorAndReturn("Action not handled by bondmachine helper");
            break;
    }

    execSync("rm -rf .bm-resources")
    
    switch (action) {
        case "apply":
            productionLog(`Project has been successfully initialized.`, "success")
        break;
        case "doctor":
            productionLog(`Dependencies checked`, "success")
        break;
        case "validate":
            productionLog(`Project has been successfully ${action}.`, "success")
        break;
    }
    
    process.exit(0);

}

main();
