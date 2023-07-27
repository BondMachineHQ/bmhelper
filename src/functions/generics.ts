import axios, { AxiosResponse, Method } from 'axios';
import { ISDEBUGACTIVE } from '..';

// const greenCheckbox = "\u2705";
// const redCheckbox = "\u26D4";
// const yellowCheckbox = "\u26A0"; 
// const violetCheckbox = "\u2753"; 

const greenCheckbox = "[ OK ]";
const redCheckbox = "[ ERROR ]";
const yellowCheckbox = "[ WARNING ]"; 
const violetCheckbox = "[ ASK ]"; 

export async function askQuestion(question: string) {
    return new Promise((resolve, reject) => {
        const readline = require('readline').createInterface({
            input: process.stdin,
            output: process.stdout
        });
        readline.question(question, reply => {
            resolve(reply)
            readline.close();
        });
    })
}

export function debugLog(message: string, type: "error" | "warning" | "success", functionInScope?: string): void {
    if (ISDEBUGACTIVE == false) {
        return;
    }
    
    let color = "";
    switch (type) {
        case "error":
            color = "\x1b[31m";
            break
        case "success":
            color = "\x1b[32m";
            break;
        case "warning":
            color = "\x1b[33m";
            break;
    }
    functionInScope == null ? console.log(color, `[DEBUG] -> ${message}`) : console.log(color, `[DEBUG] -> [${functionInScope.toUpperCase()}] -> ${message}`);
}

export async function productionLog(message: string, type: "error" | "warning" | "success" | "ask"): Promise<string | void> {
    let color = "";
    let startingMessage = "";
    switch (type) {
        case "error":
            color = "\x1b[31m";
            startingMessage = `${redCheckbox}`;
            break
        case "success":
            color = "\x1b[32m";
            startingMessage = `${greenCheckbox}`
            break;
        case "warning":
            color = "\x1b[33m";
            startingMessage = `${yellowCheckbox} `
            break;
        case "ask":
            color = "\x1b[35m";
            startingMessage = `${violetCheckbox}`
            message += " (type y to continue with default, type the name of the variable to change it) "
    }
    if (type == "ask") {
        return await askQuestion(`${color+" "+startingMessage + " " + message}`) as string;
    }
    
    console.log(color, `${startingMessage + " " + message}`);
}