const { startWorker } = require('./worker');

const workerId = process.argv[2] || `worker-${process.pid}`;

startWorker(workerId);