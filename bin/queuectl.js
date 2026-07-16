const { Command } = require('commander');
const { enqueue, getJob, getAllJobs } = require('../src/db');
const program = new Command();

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
  .command('status <jobId>')
  .description('Show status of a job')
  .action((jobId) => {

    const job = getJob(jobId);

    if (!job) {
      console.log('Job not found');
      return;
    }

    console.table(job);

  });
  program
  .command('list')
  .description('List all jobs')
  .action(() => {

    const jobs = getAllJobs();

    if (jobs.length === 0) {
      console.log('No jobs found');
      return;
    }

    console.table(jobs);

  });

program.parse();