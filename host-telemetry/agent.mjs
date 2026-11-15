import os from 'node:os';

const endpointValue = process.env.VEXON_TELEMETRY_URL || 'https://www.vixon.online/api/host-telemetry';
const token = process.env.VEXON_TELEMETRY_TOKEN;
const hostId = process.env.VEXON_HOST_ID;
const hostName = process.env.VEXON_HOST_NAME || hostId;
const intervalSeconds = Number.parseInt(process.env.VEXON_TELEMETRY_INTERVAL_SECONDS || '60', 10);

if (!token || !hostId || !hostName) {
  throw new Error('Set VEXON_TELEMETRY_TOKEN, VEXON_HOST_ID, and VEXON_HOST_NAME.');
}
if (!/^[a-zA-Z0-9][a-zA-Z0-9._-]{0,63}$/.test(hostId)) {
  throw new Error('VEXON_HOST_ID must be 1-64 letters, numbers, dots, underscores, or hyphens.');
}
if (!Number.isInteger(intervalSeconds) || intervalSeconds < 30 || intervalSeconds > 3600) {
  throw new Error('VEXON_TELEMETRY_INTERVAL_SECONDS must be between 30 and 3600.');
}

const endpoint = new URL(endpointValue);
if (endpoint.protocol !== 'https:') {
  throw new Error('VEXON_TELEMETRY_URL must use HTTPS.');
}

const delay = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));

const cpuTimes = () => os.cpus().reduce((total, cpu) => ({
  idle: total.idle + cpu.times.idle,
  total: total.total + Object.values(cpu.times).reduce((sum, value) => sum + value, 0),
}), { idle: 0, total: 0 });

const readCpuPercent = async () => {
  const before = cpuTimes();
  await delay(500);
  const after = cpuTimes();
  const total = after.total - before.total;
  if (total <= 0) return 0;
  return Math.round((1 - (after.idle - before.idle) / total) * 1000) / 10;
};

const report = async () => {
  const cpuPercent = await readCpuPercent();
  const memoryTotalBytes = os.totalmem();
  const memoryAvailableBytes = os.freemem();
  const payload = {
    host_id: hostId,
    host_name: hostName,
    platform: os.platform(),
    cpu_percent: Math.max(0, Math.min(100, cpuPercent)),
    memory_total_bytes: memoryTotalBytes,
    memory_available_bytes: memoryAvailableBytes,
    uptime_seconds: Math.floor(os.uptime()),
  };

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(10000),
  });
  if (!response.ok) throw new Error(`Telemetry endpoint returned HTTP ${response.status}.`);
  console.log(`${new Date().toISOString()} telemetry reported for ${hostId}.`);
};

let stopping = false;
process.once('SIGINT', () => { stopping = true; });
process.once('SIGTERM', () => { stopping = true; });

while (!stopping) {
  try {
    await report();
  } catch (error) {
    console.error(`Telemetry report failed: ${error.message}`);
  }
  if (!stopping) await delay(intervalSeconds * 1000);
}
