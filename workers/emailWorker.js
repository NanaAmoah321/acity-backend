const pool = require("../config/db");

const { sendEmail } =
require("../utils/email");

async function processEmailQueue(){

    try{

        const jobs = await pool.query(
`
UPDATE email_queue
SET status = 'processing'
WHERE id IN (

    SELECT id

    FROM email_queue

    WHERE

        status = 'pending'

    ORDER BY created_at ASC

    LIMIT 500

)

RETURNING *;
`
);

const groupedJobs = {};

jobs.rows.forEach(job => {

    const key = `${job.user_id}_${job.seller_id}_${job.type}`;

    if(!groupedJobs[key]){

        groupedJobs[key] = [];

    }

    groupedJobs[key].push(job);

});

for(const key in groupedJobs){

    const jobs = groupedJobs[key];

    console.log(

        `Processing ${jobs.length} jobs for ${key}`

    );

}

        console.log(

            `${jobs.rows.length} email jobs found.`

        );

    }catch(err){

        console.error(err);

    }

}

setInterval(

    processEmailQueue,

    /*10 * 60 * 1000*/
    10000

);

processEmailQueue();