const { spawn } = require('child_process');
const { claimJob, completeJob, failJob } = require('./db');

const POLL_INTERVAL_MS = 1000;
function executeCommand(command) {
  return new Promise((resolve) => {
    const child = spawn(command, { shell: true });

    let stdout = '';
    let stderr = '';

    child.stdout.on('data', (chunk) => {
      stdout += chunk.toString();
    });

    child.stderr.on('data', (chunk) => {
      stderr += chunk.toString();
    });
    child.on('error', (err) => {
      resolve({ exitCode: 127, stdout, stderr: err.message });
    });
    child.on('close', (exitCode) => {
      resolve({ exitCode, stdout, stderr });
    });
  });
}

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
async function startWorker(workerId) {
  let isShuttingDown = false;

  process.on('SIGINT', () => {
    console.log(`[${workerId}] Shutdown signal received. Finishing current job before exit.`);
    isShuttingDown = true;
  });

  process.on('SIGTERM', () => {
    isShuttingDown = true;
  });

  console.log(`[${workerId}] Worker started (pid: ${process.pid})`);

  while (!isShuttingDown) {
    const job = claimJob(workerId);

    if (!job) {
      await wait(POLL_INTERVAL_MS);
      continue;
    }

    console.log(`[${workerId}] Picked up job "${job.id}" -> ${job.command}`);

    const { exitCode, stdout, stderr } = await executeCommand(job.command);

    if (exitCode === 0) {
      completeJob(job.id, stdout);
      console.log(`[${workerId}] Job "${job.id}" completed successfully.`);
    } else {
      const updatedJob = failJob(job.id, stderr || `Command failed with exit code ${exitCode}`);

      if (updatedJob.state === 'dead') {
        console.log(`[${workerId}] Job "${job.id}" moved to DLQ after ${updatedJob.attempts} attempts.`);
      } else {
        console.log(`[${workerId}] Job "${job.id}" failed. Will retry at ${updatedJob.next_run_at}.`);
      }
    }
  }

  console.log(`[${workerId}] Worker stopped.`);
  process.exit(0);
}

module.exports = { startWorker };