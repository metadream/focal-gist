import { localeCompare } from "./util.ts";

const textDecoder = new TextDecoder();

export type SmbOption = {
    hostname: string;
    port?: number;
    username?: string;
    password?: string;
};

export type SmbFile = {
    type: "SHARE" | "DIR" | "FILE";
    name: string;
    comment?: string;
    size?: number;
    ctime?: Date;
};

export type SmbPath = {
    share: string;
    dir: string;
    filename: string;
};

/**
 * Samba Client
 * Depends on smbclient CLI: apt install smbclient
 *
 * @Author Marco
 * @Since 2023-12-17
 * @example
 * ```
 * const smb = new SmbClient({ hostname: "10.0.0.2" });
 * smb.authenticate("username", "password");
 * const smbFile = smb.readDir("/");
 * const readable = smb.readFile("/abc.jpg");
 * ```
 */
export class SmbClient {
    private smbOption: SmbOption = {
        hostname: "",
        port: 445,
        username: "",
        password: "",
    };

    constructor(smbOption: SmbOption) {
        Object.assign(this.smbOption, smbOption);
    }

    authenticate(username: string, password: string): void {
        Object.assign(this.smbOption, { username, password });
    }

    readFile(path: string): ReadableStream<Uint8Array> {
        const smbPath: SmbPath = this.parseSmbPath(path);
        return this.getSmbStream('get "' + smbPath.filename + '" -', smbPath);
    }

    readDir(path = ""): SmbFile[] {
        const smbPath: SmbPath = this.parseSmbPath(path);
        return smbPath.share ? this.listFiles(smbPath) : this.listShares();
    }

    private listShares(): SmbFile[] {
        const cmd = new Deno.Command("smbclient", {
            // prettier-ignore
            args: [
                "-gL", this.smbOption.hostname,
                "-p", this.smbOption.port + "",
                "-U", this.smbOption.username + "%" + this.smbOption.password,
            ],
        });

        const stdout = textDecoder.decode(cmd.outputSync().stdout).split(/\n+/);
        const smbFiles: SmbFile[] = [];

        for (const line of stdout) {
            const arr = line.split(/\|/);
            if (arr.length != 3 || arr[0] != "Disk") continue;

            smbFiles.push({
                type: "SHARE",
                name: arr[1],
                comment: arr[2],
            });
        }
        return smbFiles;
    }

    private listFiles(smbPath: SmbPath): SmbFile[] {
        smbPath.dir = smbPath.dir + "/" + smbPath.filename;
        smbPath.filename = "";

        const stdout = this.getSmbStdout("ls", smbPath);
        const lines = textDecoder.decode(stdout).split(/\n/);
        const smbFiles: SmbFile[] = [];

        for (let line of lines) {
            line = line.trim();
            if (!line) break;

            const matches = line.match(/(?<name>.+\S)\s+(?<type>[A-Z])\s+(?<size>\d+)\s+(?<ctime>.{24})/);
            if (!matches || !matches.groups) continue;
            const { type, name, size, ctime } = matches.groups;
            if (name === "..") continue;

            smbFiles.push({
                name,
                type: type.charAt(0) === "D" ? "DIR" : "FILE",
                size: parseInt(size),
                ctime: new Date(ctime),
            });
        }
        return smbFiles.sort((a, b) => {
            if (a.type !== b.type) {
                return a.type > b.type ? 1 : -1;
            }
            return localeCompare(a.name, b.name);
        });
    }

    private parseSmbPath(path = ""): SmbPath {
        const parts = path.replace(/^\/*|\/*$/g, "").split(/\/+/);
        const share = parts.shift() || "";
        const filename = parts.pop() || "";
        const dir = parts.join("/");
        return { share, dir, filename };
    }

    private getSmbStream(command: string, smbPath: SmbPath): ReadableStream<Uint8Array> {
        const cmd = this.exeCommand(command, smbPath);
        return cmd.spawn().stdout;
    }

    private getSmbStdout(command: string, smbPath: SmbPath): Uint8Array {
        const cmd = this.exeCommand(command, smbPath);
        const output = cmd.outputSync();

        if (output.code !== 0) {
            const message = output.stderr.length ? output.stderr : output.stdout;
            throw new Error(textDecoder.decode(message));
        }
        return output.stdout;
    }

    private exeCommand(command: string, smbPath: SmbPath): Deno.Command {
        return new Deno.Command("smbclient", {
            stdout: "piped",
            // prettier-ignore
            args: [
                "//" + this.smbOption.hostname + "/" + smbPath.share,
                "-p", this.smbOption.port + "",
                "-U", this.smbOption.username + "%" + this.smbOption.password,
                "-d", "0", // default debug level is 1, set to 0 get less output
                "-D", smbPath.dir,
                "-c", command,
            ],
        });
    }
}
