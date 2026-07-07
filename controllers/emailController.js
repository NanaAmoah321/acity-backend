const pool = require("../config/db");

exports.unsubscribe = async (req, res) => {

    const { token } = req.params;

    try {

        const result =
        await pool.query(

            `
            UPDATE users

            SET receive_marketplace_updates = FALSE

            WHERE unsubscribe_token = $1

            RETURNING name
            `,

            [token]

        );

        if(result.rows.length === 0){

            return res.status(404).send(`

                <h2>Invalid unsubscribe link.</h2>

            `);

        }

        res.send(`

<!DOCTYPE html>

<html>

<head>

<title>Unsubscribed</title>

<style>

body{

font-family:Arial;

background:#f4f7fb;

display:flex;

justify-content:center;

align-items:center;

height:100vh;

margin:0;

}

.card{

background:white;

padding:50px;

border-radius:18px;

box-shadow:0 10px 30px rgba(0,0,0,.08);

max-width:500px;

text-align:center;

}

h1{

color:#EF4444;

}

p{

color:#666;

line-height:1.7;

}

</style>

</head>

<body>

<div class="card">

<h1>

✅ You're Unsubscribed

</h1>

<p>

Hi <strong>${result.rows[0].name}</strong>,

</p>

<p>

You'll no longer receive marketplace or service announcement emails.

</p>

<p>

You'll still receive:

</p>

<p>

✔ Order Updates<br>

✔ Password Reset Emails<br>

✔ Message Notifications<br>

✔ Emails from stores you choose to follow

</p>

</div>

</body>

</html>

`);

    } catch(err){

        res.status(500).send("Something went wrong.");

    }

};