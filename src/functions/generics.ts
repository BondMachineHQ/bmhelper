import axios, { AxiosResponse, Method } from 'axios';

export function debugLog(message: string, type: "error" | "warning" | "success", functionInScope?: string): void {
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

export function productionLog(message: string, type: "error" | "warning" | "success"): void {
    if (type === "error") {
        console.error(`${message}`)
    } else {
        console.log(`${message}`);
    }
}