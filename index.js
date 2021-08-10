const cron = require('node-cron');
const express = require('express');
const config = require('dotenv').config();
const Database = require('./helpers/database');
const Email = require('./helpers/email/email');

app = express();

cron.schedule(process.env.JOB_ALERT_JOB_CRON_EXPRESSION, async function() {
  
  const search = {
    query: '',
    title: '',
    location: '',
    skip: 0,
    limit: 10
  };

  let query = Database.Job.find();

  if (search.query) {
    query.or([
      { 'title': { $regex: search.query || '', $options: 'i' } },
      { 'description': { $regex: search.query || '', $options: 'i' } }
    ])
  }

  if (search.title) {
    query.where('title', { $regex: search.title || '', $options: 'i' });
  }

  if (search.location) {
    query.or([
      { 'addressName': { $regex: search.location, $options: 'i' } },
      { 'city': { $regex: search.location, $options: 'i' } },
      { 'state': { $regex: search.location, $options: 'i' } },
      { 'zipCode': { $regex: search.location, $options: 'i' } }
    ])
  }

  query.select('-password');
  query.setOptions({
    skip: parseInt(search.skip),
    limit: parseInt(search.limit)
  });

  const jobs = await query
    .exec()
    .catch((error) => { console.error(error.message); });

  let jobsHTML = '';
  for (const job of jobs) {
    jobsHTML += `<br />
      <b>` + job.title + '</b> ' + job.city + '<br />' + job.description + `
    <br />`;
  }

  await Email.send(
    'kelvingraddick@gmail.com',
    'You have new job alerts from Educate ME!',
    'Check out these job alerts that were matched to you!',
    Email.templates.JOB_ALERT,
    {
      jobs: jobsHTML
    })
    .then(() => {}, error => console.error('Email error: ' + error.message))
    .catch(error => console.error('Email error: ' + error.message));

  console.info('');
  console.info('RUN:');
  console.info(JSON.stringify(jobs));
  console.info('');

});

app.listen(process.env.port);
