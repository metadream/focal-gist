import { TextLineStream } from "@std/streams";
import { localeCompare } from "./util.ts";

const textEncoder = new TextEncoder();

export enum MpdSignal {
    VERSION = "OK MPD",
    END = "OK",
    ERROR = "ACK",
}

export type MpdMessage = Record<string, string | number | boolean | Date>;

/**
 * Music Player Deamon Client
 *
 * @Author Marco
 * @Since 2023-12-17
 * @link https://www.musicpd.org
 *
 * @example
 * ```
 * const mpd = new MpdClient("10.0.0.2", 6600);
 * mpd.play();
 * ```
 *
 * Available Commands:
 * add,addid,addtagid,channels,clear,clearerror,cleartagid,close,commands,config,
 * consume,count,crossfade,currentsong,decoders,delete,deleteid,disableoutput,
 * enableoutput,find,findadd,idle,kill,list,listall,listallinfo,listfiles,listmounts,
 * listplaylist,listplaylistinfo,listplaylists,load,lsinfo,mixrampdb,mixrampdelay,mount,
 * move,moveid,next,notcommands,outputs,password,pause,ping,play,playid,playlist,
 * playlistadd,playlistclear,playlistdelete,playlistfind,playlistid,playlistinfo,
 * playlistmove,playlistsearch,plchanges,plchangesposid,previous,prio,prioid,random,
 * rangeid,readcomments,readmessages,rename,repeat,replay_gain_mode,replay_gain_status,
 * rescan,rm,save,search,searchadd,searchaddpl,seek,seekcur,seekid,sendmessage,setvol,
 * shuffle,single,stats,status,stop,subscribe,swap,swapid,tagtypes,toggleoutput,unmount,
 * unsubscribe,update,urlhandlers,volume
 */
export class MpdClient {
    private hostname: string;
    private port: number;

    constructor(hostname: string, port: number = 6600) {
        this.hostname = hostname;
        this.port = port;
    }

    // Get status
    async getStatus(): Promise<MpdMessage> {
        return (await this.sendCommand("status")) as MpdMessage;
    }

    // Get current song
    async getCurrentSong(): Promise<MpdMessage> {
        return (await this.sendCommand("currentsong")) as MpdMessage;
    }

    // Get playlist
    async getPlaylist(): Promise<MpdMessage[]> {
        return (await this.sendCommand("playlistinfo")) as MpdMessage[];
    }

    // Get directories or files in library
    async getLibrary(path: string): Promise<MpdMessage[]> {
        const list = (await this.sendCommand("lsinfo", path)) as MpdMessage[];
        return list.sort((a: MpdMessage, b: MpdMessage) => {
            if (a.isDir && !b.isDir) return -1;
            return localeCompare(a.file as string, b.file as string);
        });
    }

    async playId(id: number): Promise<void> {
        await this.sendCommand("playid", id);
    }

    async play(): Promise<void> {
        await this.sendCommand("play");
    }

    async pause(): Promise<void> {
        await this.sendCommand("pause");
    }

    async stop(): Promise<void> {
        await this.sendCommand("stop");
    }

    async next(): Promise<void> {
        await this.sendCommand("next");
    }

    async previous(): Promise<void> {
        await this.sendCommand("previous");
    }

    async setRepeat(state: number): Promise<void> {
        await this.sendCommand("repeat", state);
    }

    async setSingle(state: number): Promise<void> {
        await this.sendCommand("single", state);
    }

    async setRandom(state: number): Promise<void> {
        await this.sendCommand("random", state);
    }

    async addSong(path: string): Promise<void> {
        if (path.indexOf("+") >= 0) {
            throw new Error('The path cannot contain a "+" sign');
        }
        await this.sendCommand("add", path);
    }

    async removeSong(id: number): Promise<void> {
        await this.sendCommand("deleteid", id);
    }

    async updateLibrary(): Promise<void> {
        await this.sendCommand("update");
    }

    async clearPlaylist(): Promise<void> {
        await this.sendCommand("clear");
    }

    // Send TCP command to MPD server
    async sendCommand(command: string, argument?: string | number): Promise<MpdMessage | MpdMessage[]> {
        const commandLine = argument ? `${command} "${argument}"` : command;
        const conn: Deno.TcpConn = await this.getConnection();
        await conn.write(textEncoder.encode(`${commandLine}\n`));

        const result = [];
        const lines = conn.readable.pipeThrough(new TextDecoderStream()).pipeThrough(new TextLineStream());

        // Read stream line by line
        for await (const line of lines) {
            if (line === MpdSignal.END) break;
            if (line.startsWith(MpdSignal.VERSION)) continue;
            if (line.startsWith(MpdSignal.ERROR)) {
                const errorMessage = line.substring(MpdSignal.ERROR.length + 1);
                throw new Error(errorMessage);
            }
            result.push(line);
        }

        if (command == "playlistinfo" || command == "lsinfo") {
            return this.parseMessageList(result);
        }
        return this.parseMessageObject(result);
    }

    // Parse message lines as object
    private parseMessageObject(messageLines: string[]): MpdMessage {
        const result: MpdMessage = {};
        for (const line of messageLines) {
            const message = this.parseMessageLine(line);
            Object.assign(result, message);
        }
        return result;
    }

    // Parse message lines as list
    private parseMessageList(messageLines: string[]): MpdMessage[] {
        const delimiter = messageLines[0].substring(0, messageLines[0].indexOf(":") + 1);
        const result: MpdMessage[] = [];
        let message = null;

        for (const line of messageLines) {
            if (line.startsWith(delimiter)) {
                message = {};
                result.push(message);
            }
            if (message) {
                const _message = this.parseMessageLine(line);
                Object.assign(message, _message);
            }
        }
        return result;
    }

    // Parse message line
    private parseMessageLine(messageLine: string): MpdMessage {
        const result: MpdMessage = {};
        if (!messageLine) result;

        const [key, value] = messageLine.split(/:\s/);
        switch (key) {
            case "Id":
            case "Pos":
            case "volume":
            case "repeat":
            case "random":
            case "single":
            case "consume":
            case "playlist":
                result[key.toLowerCase()] = parseInt(value);
                break;
            case "directory":
                result["file"] = value;
                result["isDir"] = 1;
                break;
            case "Last-Modified":
                result["lastModified"] = new Date(value);
                break;
            case "Time":
                result["duration"] = parseFloat(value);
                break;
            case "song":
                result["songPos"] = parseInt(value);
                break;
            case "songid":
                result["songId"] = parseInt(value);
                break;
            case "time": {
                const time = value.split(":");
                result["duration"] = parseFloat(time[1]);
                break;
            }
            case "elapsed": {
                result["elapsed"] = parseFloat(value);
                break;
            }
            case "bitrate":
                result["bitRate"] = parseInt(value);
                break;
            case "audio": {
                const audio = value.split(":");
                result["sampleRate"] = parseInt(audio[0]);
                result["sampleBits"] = parseInt(audio[1]);
                break;
            }
            default:
                result[key.toLowerCase()] = value;
                break;
        }
        return result;
    }

    // Create TCP connection if not exists
    private async getConnection() {
        const { hostname, port } = this;
        return await Deno.connect({ hostname, port });
    }
}
