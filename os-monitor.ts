const textDecoder = new TextDecoder();
const ipChecker = "http://ip.3322.net"; // http://members.3322.org/dyndns/getip

export class OsInfo {
    platform = "";
    arch = "";
    release = "";
    build = "";
    hostname = "";
}

export class SystemInfo {
    timestamp = 0;
    uptime = 0;
    users = 0;
    loadavg = [0.0, 0.0, 0.0];
}

export class TaskInfo {
    total = 0;
    running = 0;
    sleeping = 0;
    stopped = 0;
    zombie = 0;
}

export class CpuInfo {
    user = 0.0;
    system = 0.0;
    nice = 0.0;
    idle = 0.0;
    wait = 0.0;
    hardware = 0.0;
    software = 0.0;
    steal = 0.0;
    usage = 0.0;
}

export class MemoryInfo {
    total = 0;
    used = 0;
    free = 0;
    shared?: number;
    buffers?: number;
    cache?: number;
    available?: number;
    usage = 0.0;
}

export class ProcessInfo {
    pid = 0;
    user = "";
    priority = 0;
    nice = 0;
    virtual = 0;
    resident = 0;
    shared = 0;
    status = "";
    usage_cpu = 0.0;
    usage_mem = 0.0;
    time = "";
    command = "";
}

export class FsInfo {
    filesystem = "";
    fstype = "";
    blocks = 0;
    used = 0;
    available = 0;
    total = 0;
    usage = 0.0;
    mounted = "";
}

export class IoInfo {
    device = "";
    tps = 0;
    kb_read_s = 0.0;
    kb_wrtn_s = 0.0;
    kb_read = 0;
    kb_wrtn = 0;
}

export class SocketInfo {
    netid = "";
    state = "";
    recv_q = 0;
    send_q = 0;
    local_address = "";
    local_port = "";
    peer_address = "";
    peer_port = "";
    process = "";
}

export class TrafficInfo {
    iface = "";
    rx_packets = 0;
    tx_packets = 0;
    rx_bytes = 0;
    tx_bytes = 0;
}

export class IpAddress {
    external = "0.0.0.0";
    internal = ["127.0.0.1"];
}

type TopInfo = {
    systemInfo: SystemInfo;
    taskInfo: TaskInfo;
    cpuInfo: CpuInfo;
    processes: ProcessInfo[];
};

/**
 * Operating System Monitor for Linux
 *
 * @Author Marco
 * @Since 2023-12-22
 * @example
 * ```
 * const om = new OsMonitor();
 * console.log('os=', om.os());
 * console.log('top=', om.top());
 * console.log('memory=', om.memory());
 * console.log('fs=', om.fs());
 * console.log('io=', om.io());
 * console.log('sockets=', om.sockets());
 * console.log('traffic=', om.traffic());
 * console.log('ipv4=', await om.ipv4());
 * ```
 */
export class OsMonitor {
    // Get os info.
    os(): OsInfo {
        const { os, arch } = Deno.build;
        const result = this.exeCommand("cat /etc/os-release");
        const matched = result.match(/^PRETTY_NAME="(.+)"\n/);

        const osInfo = new OsInfo();
        osInfo.platform = os;
        osInfo.arch = arch;
        osInfo.release = matched ? matched[1] : "";
        osInfo.build = Deno.osRelease();
        osInfo.hostname = Deno.hostname();
        return osInfo;
    }

    // Get ipv4 addresses.
    async ipv4(): Promise<IpAddress> {
        const ipAddress = new IpAddress();
        try {
            const res = await fetch(ipChecker);
            ipAddress.external = (await res.text()).trim();
        } catch (e: any) {
            console.warn(e.message);
        }

        const faces = this.networkInterfaces();
        if (faces && faces.length) {
            ipAddress.internal.length = 0;
            for (const face of faces) {
                ipAddress.internal.push(face.address);
            }
        }
        return ipAddress;
    }

    // Get network interfaces (excludes docker, ipv6 and localhost).
    networkInterfaces(): Deno.NetworkInterfaceInfo[] {
        const faces = Deno.networkInterfaces();

        for (let i = faces.length - 1; i >= 0; i--) {
            const face = faces[i];
            if (face.name.startsWith("docker") || face.family === "IPv6" || face.address === "127.0.0.1") {
                faces.splice(i, 1);
            }
        }
        return faces;
    }

    // Parse top command outputs.
    top(): TopInfo {
        const stdout = this.exeCommand("top -bn 1");
        const parts = stdout.split(/\n{2}/);
        const headLines = parts[0].split(/\n/);
        const psLines = parts[1].split(/\n/);

        // line 1
        // top - 08:45:34 up 21 days, 21:24,  1 user,  load average: 0.05, 0.02, 0.00
        const systemInfo = new SystemInfo();
        systemInfo.timestamp = Date.now();
        systemInfo.uptime = Deno.osUptime();

        const matched = headLines
            .shift()
            ?.match(/^top - ([\d\:]{8}) up ([\w\s\:,]+),\s+(\d+) users?,\s+load average: ([\d\.]+, [\d\.]+, [\d\.]+)$/);
        if (matched) {
            systemInfo.users = parseInt(matched[3]);
            systemInfo.loadavg = matched[4].split(/, /).map((v) => parseFloat(v));
        }

        // line 2
        // Tasks: 294 total,   2 running, 292 sleeping,   0 stopped,   1 zombie
        const taskInfo = new TaskInfo();
        const count = headLines
            .shift()
            ?.replace(/[a-zT:\s]/g, "")
            .split(/,/);
        if (count) {
            taskInfo.total = parseInt(count[0]);
            taskInfo.running = parseInt(count[1]);
            taskInfo.sleeping = parseInt(count[2]);
            taskInfo.stopped = parseInt(count[3]);
            taskInfo.zombie = parseInt(count[4]);
        }

        // line 3
        // %Cpu(s):  0.0 us,  2.1 sy,  0.0 ni, 97.9 id,  0.0 wa,  0.0 hi,  0.0 si,  0.1 st
        const cpuInfo = new CpuInfo();
        const load = headLines
            .shift()
            ?.replace(/[a-zC%:()\s]/g, "")
            .split(/,/);
        if (load) {
            cpuInfo.user = parseFloat(load[0]);
            cpuInfo.system = parseFloat(load[1]);
            cpuInfo.nice = parseFloat(load[2]);
            cpuInfo.idle = parseFloat(load[3]);
            cpuInfo.wait = parseFloat(load[4]);
            cpuInfo.hardware = parseFloat(load[5]);
            cpuInfo.software = parseFloat(load[6]);
            cpuInfo.steal = parseFloat(load[7]);
            cpuInfo.usage = parseFloat((100 - cpuInfo.idle).toFixed(1));
        }

        // processes parts
        psLines.shift();
        const processes: ProcessInfo[] = [];

        for (const line of psLines) {
            const ps = line.trim().split(/\s+/);
            const processInfo = new ProcessInfo();
            processes.push(processInfo);

            processInfo.pid = parseInt(ps[0]);
            processInfo.user = ps[1];
            processInfo.priority = parseInt(ps[2]);
            processInfo.nice = parseInt(ps[3]);
            processInfo.virtual = parseInt(ps[4]);
            processInfo.resident = parseInt(ps[5]);
            processInfo.shared = parseInt(ps[6]);
            processInfo.status = ps[7];
            processInfo.usage_cpu = parseFloat(ps[8]);
            processInfo.usage_mem = parseFloat(ps[9]);
            processInfo.time = ps[10];
            processInfo.command = ps[11];
        }

        return { systemInfo, taskInfo, cpuInfo, processes };
    }

    // Parse memory and swap status
    memory(): Record<string, MemoryInfo> {
        const stdout = this.exeCommand("free -wb");
        const lines = stdout.split(/\n+/).slice(1);

        const memoryInfo = new MemoryInfo();
        let item = lines
            .shift()
            ?.replace(/^Mem:\s+/, "")
            .split(/\s+/);
        if (item) {
            memoryInfo.total = parseInt(item[0]);
            memoryInfo.used = parseInt(item[1]);
            memoryInfo.free = parseInt(item[2]);
            memoryInfo.shared = parseInt(item[3]);
            memoryInfo.buffers = parseInt(item[4]);
            memoryInfo.cache = parseInt(item[5]);
            memoryInfo.available = parseInt(item[6]);

            const usage = ((memoryInfo.total - memoryInfo.available) / memoryInfo.total) * 100;
            memoryInfo.usage = parseFloat(usage.toFixed(1));
        }

        const swapInfo = new MemoryInfo();
        item = lines
            .shift()
            ?.replace(/^Swap:\s+/, "")
            .split(/\s+/);
        if (item) {
            swapInfo.total = parseInt(item[0]);
            swapInfo.used = parseInt(item[1]);
            swapInfo.free = parseInt(item[2]);
            swapInfo.usage = parseFloat(((swapInfo.used / swapInfo.total) * 100).toFixed(1));
        }

        return { memoryInfo, swapInfo };
    }

    // File sytem stats (excludes tmpfs).
    fs(): FsInfo[] {
        const stdout = this.exeCommand("df -T -x tmpfs -x devtmpfs");
        const lines = stdout.split(/\n+/).slice(1);
        const fsInfos: FsInfo[] = [];

        for (const line of lines) {
            const matched = line.match(/^([\w\/\-\_\.]+)\s+(\w+)\s+(\d+)\s+(\d+)\s+(\d+)\s+(\d+)%\s+([\w\/]+)$/);
            if (!matched) continue;

            const fsInfo = new FsInfo();
            fsInfos.push(fsInfo);
            fsInfo.filesystem = matched[1];
            fsInfo.fstype = matched[2];
            fsInfo.blocks = parseInt(matched[3]);
            fsInfo.used = parseInt(matched[4]);
            fsInfo.available = parseInt(matched[5]);
            fsInfo.usage = parseFloat(matched[6]);
            fsInfo.mounted = matched[7];
            fsInfo.total = fsInfo.used + fsInfo.available;
        }
        return fsInfos;
    }

    // Disk I/O stats
    // Consecutive calls in the interval and subtract the values, that is the i/o per unit of time
    io(): IoInfo[] {
        const stdout = this.exeCommand("iostat -d 1 1 -o JSON");
        const disks = JSON.parse(stdout).sysstat.hosts[0].statistics.pop().disk;
        const ioInfos: IoInfo[] = [];

        for (const item of disks) {
            const ioInfo = new IoInfo();
            ioInfos.push(ioInfo);

            ioInfo.device = item.disk_device;
            ioInfo.tps = item.tps;
            ioInfo.kb_read_s = item["kB_read/s"];
            ioInfo.kb_wrtn_s = item["kB_wrtn/s"];
            ioInfo.kb_read = item.kB_read;
            ioInfo.kb_wrtn = item.kB_wrtn;
        }
        return ioInfos;
    }

    // Socket stats.
    sockets(): SocketInfo[] {
        const stdout = this.exeCommand("ss -tunpl");
        const lines = stdout.split(/\n+/).slice(1);
        const socketInfos: SocketInfo[] = [];

        for (const line of lines) {
            const matched = line.match(/(\w+)\s+([A-Z]+)\s+(\d+)\s+(\d+)\s+([^:]+):(\d+)\s+([^:]+):([\d\*]+)\s+(.+)/);
            if (matched) {
                const socketInfo = new SocketInfo();
                socketInfos.push(socketInfo);

                socketInfo.netid = matched[1];
                socketInfo.state = matched[2];
                socketInfo.recv_q = parseInt(matched[3]);
                socketInfo.send_q = parseInt(matched[4]);
                socketInfo.local_address = matched[5];
                socketInfo.local_port = matched[6];
                socketInfo.peer_address = matched[7];
                socketInfo.peer_port = matched[8];
                socketInfo.process = matched[9];
            }
        }
        return socketInfos;
    }

    // Network traffic stats.
    // Consecutive calls in the interval and subtract the values, that is the traffic per unit of time
    traffic(): TrafficInfo[] {
        const ifstat = this.netdev();
        const trafficInfos: TrafficInfo[] = [];
        const faces = this.networkInterfaces();

        for (const face of faces) {
            const stat = ifstat[face.name];
            if (stat) {
                const trafficInfo = new TrafficInfo();
                trafficInfos.push(trafficInfo);

                trafficInfo.iface = face.name;
                trafficInfo.rx_packets = stat.rx_packets;
                trafficInfo.tx_packets = stat.tx_packets;
                trafficInfo.rx_bytes = stat.rx_bytes;
                trafficInfo.tx_bytes = stat.tx_bytes;
            }
        }
        return trafficInfos;
    }

    // Parse file /proc/net/dev
    private netdev() {
        const stdout = this.exeCommand("cat /proc/net/dev");
        const lines = stdout.trim().split(/\n+/).slice(2);

        const result: Record<string, Record<string, number>> = {};
        for (const line of lines) {
            const parts = line.trim().split(/:\s+/);
            const data = parts[1].split(/\s+/);

            result[parts[0]] = {
                rx_bytes: parseInt(data[0]),
                rx_packets: parseInt(data[1]),
                tx_bytes: parseInt(data[8]),
                tx_packets: parseInt(data[9]),
            };
        }
        return result;
    }

    // Execute command.
    private exeCommand(cmdLine: string) {
        const args = cmdLine.split(/\s+/);
        const cmd = args.shift() || "";
        const command = new Deno.Command(cmd, { args, cwd: Deno.cwd() });
        const { code, stdout, stderr } = command.outputSync();

        if (code !== 0) throw new Error(textDecoder.decode(stderr));
        return textDecoder.decode(stdout);
    }
}
