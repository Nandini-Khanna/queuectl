const { startWorker } = require('../src/worker');
const workerId = process.argv[2] || `worker-${process.pid}`;
startWorker(workerId);