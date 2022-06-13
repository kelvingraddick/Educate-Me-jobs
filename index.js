const cron = require('node-cron');
const express = require('express');
const config = require('dotenv').config();
const Database = require('./helpers/database');
const Email = require('./helpers/email/email');

app = express();

cron.schedule(process.env.JOB_ALERT_JOB_CRON_EXPRESSION, async function() {
  const jobName = 'JOB_ALERT_JOB';
  console.info('\n');
  console.info(jobName + ': START RUN ---------');

  const allJobs = await Database.Job
    .find()
    .exec()
    .catch((error) => { console.error(error.message); });

  const allEducators  = await Database.Educator
    .find()
    .select('-password')
    .exec()
    .catch((error) => { console.error(error.message); });

  for (const educator of allEducators) {
    console.info('\n');
    console.info(jobName + ': EDUCATOR:');
    console.info(educator);
    try {
      const matchingJobs = allJobs.filter(
        (x => !educator.locations || educator.locations.includes(x.city + ', ' + x.state)) &&
        (x => !educator.locationTypes || educator.locationTypes.includes(x.locationType)) &&
        (x => !educator.schoolTypes || educator.locations.includes(x.schoolType)) &&
        (x => !educator.schoolLevels || educator.locations.includes(x.schoolLevel))
      );
      console.info(jobName + ': MATCHING JOBS:');
      console.info(matchingJobs);

      let jobsHTML = '';
      for (const matchingJob of matchingJobs) {
        jobsHTML  += `<br />
          <b>` + matchingJob.title + '</b> ' + matchingJob.city + '<br />' + matchingJob.description + `
        <br />`;
      }

      await Email.send(
        educator.emailAddress,
        'You have new job alerts from EDCOM HQ Jobs!',
        'Check out these job alerts that were matched to you!',
        Email.templates.JOB_ALERT,
        {
          jobs: jobsHTML
        })
        .then(() => {}, error => console.error('Email error: ' + error.message))
        .catch(error => console.error('Email error: ' + error.message));
    
    } catch (error) {
      console.error(error.message);
    };
    console.info('\n');
  }

  console.info(jobName + ': END RUN ---------');
  console.info('\n');
});

app.listen(process.env.port);
