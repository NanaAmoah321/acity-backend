const { Resend } = require("resend");

const resend = new Resend(process.env.RESEND_API_KEY);

async function sendEmail({from, to, subject, html}) {
    const { data, error } = await resend.emails.send({
        from,
        to,
        subject,
        html
    });

    console.log("Resend response:", data, error);

    if (error) {
        console.error("Resend error:", error);
        throw error;
    }

    return data;
}

module.exports = { sendEmail };

