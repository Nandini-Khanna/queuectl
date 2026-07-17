const { Command } = require('commander');
const { enqueue, getJob, getAllJobs, getDeadJobs, getJobsByState, getQueueStatus, retryDeadJob, requestStop, clearStop } = require('../src/db');const program = new Command();
const { fork } = require('child_process');
const path = require('path');
program
  .name('queuectl')
  .description('CLI background job queue');

program
  .command('enqueue <jobJson>')
  .description('Add a new job to the queue')
  .action((jobJson) => {
    const job = JSON.parse(jobJson);
    const created = enqueue(job);
    console.log(`enqueued job '${created.id}' (state=${created.state})`);
  });
  program
  .command('status [id]')
  .description('Show job status or queue summary')
  .action((id) => {

    if (id) {
      const job = getJob(id);

      if (!job) {
        console.log('Job not found');
        return;
      }

      console.table(job);
      return;
    }

    const summary = getQueueStatus();

    console.log('Queue Summary');
    console.table(summary);

  });
program
  .command('list')
  .description('List jobs')
  .option('--state <state>', 'Filter by state')
  .action((options) => {

    if (options.state) {
      console.table(getJobsByState(options.state));
    } else {
      console.table(getAllJobs());
    }

  });
 program
  .command('dlq')
  .description('Dead Letter Queue')

  .command('list')
  .description('List dead jobs')
  .action(() => {
    const jobs = getDeadJobs();

    if (jobs.length === 0) {
      console.log('DLQ is empty');
      return;
    }

    console.table(jobs);
  });

program
  .command('dlq-retry <id>')
  .description('Retry a dead job')
  .action((id) => {

    const job = retryDeadJob(id);

    if (!job) {
      console.log('Dead job not found');
      return;
    }

    console.log(`Job '${job.id}' moved back to pending.`);
  });
  const workerCmd = program
  .command('worker')
  .description('Manage worker processes');

workerCmd
  .command('start')
  .description('Start one or more workers')
  .option('--count <n>', 'Number of workers to start', '1')
  .action((options) => {
    clearStop();
    const count = parseInt(options.count, 10);
    console.log(`Starting ${count} worker(s)... (Ctrl+C to stop)`);
    const workerScript = path.join(__dirname, '../src/worker-runner.js');
    for (let i = 1; i <= count; i++) {
      fork(workerScript, [`worker-${i}`]);
    }
  });

workerCmd
  .command('stop')
  .description('Signal running workers to stop gracefully')
  .action(() => {
    requestStop();
    console.log('Stop signal sent. Workers will finish current job and exit.');
  });
program.parse();