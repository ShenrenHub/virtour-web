export class Debugger {
    static log(...message: any[]) {
        const time = new Date().toLocaleTimeString();
        console.log("[DH_Live][" , time , "] " , message);
    }

    static warn(message: string) {
        const time = new Date().toLocaleTimeString();
        console.warn("[DH_Live][" + time + "] " + message);
    }

    static error(message: string) {
        const time = new Date().toLocaleTimeString();
        console.error("[DH_Live][" + time + "] " + message);
    }
}
