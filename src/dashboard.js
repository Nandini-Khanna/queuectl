const express = require('express');
const path = require('path');

const { getAllJobs, getQueueStatus } = require('./db');

const app = express();
const PORT = 3000;

app.use(express.static(path.join(__dirname, '../public')));

app.get('/api/dashboard', (req, res) => {

    res.json({
        summary: getQueueStatus(),
        jobs: getAllJobs()
    });

});

app.get('/', (req, res) => {

    res.sendFile(path.join(__dirname, '../views/index.html'));

});

app.listen(PORT, () => {

    console.log(`Dashboard running at http://localhost:${PORT}`);

});