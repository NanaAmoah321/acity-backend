const pool = require("../config/db");

const { sendEmail } =
require("../utils/email");

async function processEmailQueue(){

    try{

        const jobs =
        await pool.query(

            `
            SELECT *

            FROM email_queue

            WHERE processed = FALSE

            ORDER BY created_at ASC
            `
        );

        console.log(

            `${jobs.rows.length} email jobs found.`

        );

    }catch(err){

        console.error(err);

    }

}

setInterval(

    processEmailQueue,

    10 * 60 * 1000

);

processEmailQueue();