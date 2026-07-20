const renderTemplate = require("../utils/renderTemplate");
const { sendEmail } = require("./email");

async function sendWelcomeEmail(user) {

    const html = renderTemplate("welcome", {
        first_name: user.name,
        company_name: "Acity Connect",
        company_address: "Academic City University, Accra",
        unsubscribe_url:
            `${process.env.FRONTEND_URL}/unsubscribe`
    });

    return sendEmail({
        from: process.env.EMAIL_FROM,
        to: user.email,
        subject: "Welcome to Acity Connect! 🎉",
        html
    });
}

module.exports = {
    sendWelcomeEmail
};


function buyerOrderTemplate(name, itemName){

    return `

    <div style="font-family:Arial;padding:40px;background:#f4f7fb;">

        <div style="max-width:650px;margin:auto;background:white;border-radius:18px;padding:40px;">

            <h1 style="color:#ff2d2d;">

                🎉 Order Confirmed

            </h1>

            <p>

                Hi <strong>${name}</strong>,

            </p>

            <p>

                Your order for

                <strong>${itemName}</strong>

                has been placed successfully.

            </p>

            <p>

                The seller has been notified and will contact you soon.

            </p>

            <hr>

            <p>

                Thank you for using

                <strong>Acity Connect.</strong>

            </p>

        </div>

    </div>

    `;

}

function sellerOrderTemplate(name,buyer,itemName){

    return `

    <div style="font-family:Arial;padding:40px;background:#f4f7fb;">

        <div style="max-width:650px;margin:auto;background:white;border-radius:18px;padding:40px;">

            <h1 style="color:#ff2d2d;">

                📦 New Order

            </h1>

            <p>

                Hi <strong>${name}</strong>,

            </p>

            <p>

                <strong>${buyer}</strong>

                has ordered

                <strong>${itemName}</strong>

            </p>

            <p>

                Open Acity Connect to continue chatting with the buyer.

            </p>

        </div>

    </div>

    `;

}

function messageTemplate(receiverName, senderName, message){

    return `

    <div style="
        font-family:Arial;
        background:#f4f7fb;
        padding:40px;
    ">

        <div style="
            max-width:650px;
            margin:auto;
            background:white;
            border-radius:18px;
            padding:40px;
        ">

            <h1 style="color:#ff2d2d;">

                💬 New Message

            </h1>

            <p>

                Hi <strong>${receiverName}</strong>,

            </p>

            <p>

                <strong>${senderName}</strong>

                sent you a message on
                <strong>Acity Connect.</strong>

            </p>

            <div style="
                background:#f5f5f5;
                padding:20px;
                border-radius:12px;
                margin:25px 0;
                font-size:17px;
            ">

                "${message}"

            </div>

            <a
                href="${process.env.FRONTEND_URL}/inbox.html"
                style="
                    display:inline-block;
                    background:#ff2d2d;
                    color:white;
                    padding:15px 35px;
                    text-decoration:none;
                    border-radius:40px;
                    font-weight:bold;
                "
            >

                Reply Now

            </a>

        </div>

    </div>

    `;

}

function resetPasswordTemplate(name, resetLink){

    return `

    <div
        style="
            font-family:Arial;
            max-width:600px;
            margin:auto;
            padding:40px;
        "
    >

        <h1>

            🔒 Password Reset

        </h1>

        <p>

            Hi ${name},

        </p>

        <p>

            We received a request to reset your password.

        </p>

        <a
            href="${resetLink}"
            style="
                display:inline-block;
                background:#ef4444;
                color:white;
                padding:14px 24px;
                text-decoration:none;
                border-radius:10px;
            "
        >

            Reset Password

        </a>

        <p>

            This link expires in 30 minutes.

        </p>

        <p>

            If you didn't request this,
            simply ignore this email.

        </p>

    </div>

    `;

}

const newListingTemplate = (

    receiverName,

    sellerName,

    title,

    category,

    price,

    image,

    rating,

    reviews,

    unsubcribeToken

)=>`

<!DOCTYPE html>

<html>

<body style="
margin:0;
padding:0;
background:#f4f7fb;
font-family:Arial,Helvetica,sans-serif;
">

<table
width="100%"
cellpadding="0"
cellspacing="0"
>

<tr>

<td align="center">

<table
width="650"
cellpadding="0"
cellspacing="0"
style="
background:#ffffff;
margin:40px 0;
border-radius:22px;
overflow:hidden;
box-shadow:0 18px 50px rgba(0,0,0,.08);
">

<tr>

<td
style="
background:#EF4444;
padding:40px;
text-align:center;
color:white;
">

<h1 style="margin:0;">

🎓 Acity Connect

</h1>

<p style="margin-top:12px;">

A new marketplace listing is waiting for you.

</p>

</td>

</tr>

<tr>

<td style="padding:45px;">

<h2>

Hello ${receiverName} 👋

</h2>

<p>

<strong>${sellerName}</strong>

just posted something new.

</p>

<table
width="100%"
style="
border:1px solid #eee;
border-radius:18px;
overflow:hidden;
margin:35px 0;
">

<tr>

<td>

<img

src="${image || `${process.env.FRONTEND_URL}/images/${category}.jpg`}"

width="100%"

style="
display:block;
max-height:280px;
object-fit:cover;
">

</td>

</tr>

<tr>

<td style="padding:28px;">

<div
style="
display:inline-block;
background:#FEE2E2;
padding:8px 18px;
border-radius:40px;
color:#DC2626;
font-weight:bold;
font-size:13px;
">

${category}

</div>

<h2 style="margin:20px 0 10px;">

${title}

</h2>

<p
style="
font-size:28px;
font-weight:bold;
color:#EF4444;
margin:0;
">

GH₵${price}

</p>

<p
style="
margin-top:20px;
color:#666;
">

⭐ ${rating}

(${reviews} reviews)

</p>

</td>

</tr>

</table>

<div
style="
text-align:center;
margin:40px 0;
">

<a

href="${process.env.FRONTEND_URL}/marketplace.html"

style="
display:inline-block;
padding:18px 42px;
background:#EF4444;
color:white;
text-decoration:none;
border-radius:999px;
font-size:16px;
font-weight:bold;
">

View Listing →

</a>

</div>

<hr
style="
border:none;
border-top:1px solid #eee;
">

<hr style="
border:none;
border-top:1px solid #eee;
margin:40px 0 25px;
">

<p style="
font-size:13px;
color:#666;
text-align:center;
line-height:1.7;
">

You're receiving this email because you subscribed to marketplace updates or you follow this seller.

</p>

<div style="
text-align:center;
margin-top:25px;
">

<a
href="${process.env.FRONTEND_URL}/profile.html"
style="
display:inline-block;
margin-right:15px;
color:#2563EB;
text-decoration:none;
font-weight:bold;
">

Manage Preferences

</a>

<a
href="${process.env.BACKEND_URL}/api/email/unsubscribe/${unsubscribeToken}"
style="
display:inline-block;
color:#EF4444;
text-decoration:none;
font-weight:bold;
">

Unsubscribe

</a>

</div>

<p style="
font-size:12px;
color:#999;
margin-top:35px;
text-align:center;
">

Acity Connect • Academic City University

</p>

<p
style="
font-size:12px;
color:#999;
">

Acity Connect • Academic City University

</p>

</td>

</tr>

</table>

</td>

</tr>

</table>

</body>

</html>

`;

const newServiceTemplate = (

receiverName,
providerName,
title,
category,
rate,
rateType,
rating,
unsubcribeToken

)=>`

<!DOCTYPE html>

<html>

<body style="
margin:0;
padding:0;
background:#f4f7fb;
font-family:Arial;
">

<table width="100%">

<tr>

<td align="center">

<table
width="650"
style="
background:white;
margin:40px 0;
border-radius:20px;
overflow:hidden;
box-shadow:0 15px 45px rgba(0,0,0,.08);
"
>

<tr>

<td
style="
background:#2563EB;
padding:40px;
text-align:center;
color:white;
"
>

<h1>

🛠 Acity Connect

</h1>

<p style="
margin-top:12px;
font-size:16px;
opacity:.95;
">

${providerName} just listed a new service

</p>

</td>

</tr>

<tr>

<td style="padding:45px;">

<h2>

Hello ${receiverName} 

</h2>

<p>

<strong>${providerName}</strong>

just posted a new service.

</p>

<div style="
background:#F8FAFC;
padding:25px;
border-radius:16px;
border:1px solid #E5E7EB;
margin:35px 0;
">

<div
style="
display:inline-block;
background:#DBEAFE;
color:#2563EB;
padding:6px 14px;
border-radius:999px;
font-weight:bold;
margin-bottom:18px;
"
>

${category}

</div>
<h2 style="
margin:18px 0 10px;
">

${title}

</h2>

<p style="
font-size:28px;
font-weight:bold;
color:#2563EB;
margin:0;
">

GH₵${rate}

<span style="
font-size:15px;
font-weight:normal;
color:#666;
">

/ ${rateType}

</span>

</p>

<p style="
margin-top:20px;
color:#666;
">

⭐ ${rating}

</p>

<p style="
margin-top:18px;
line-height:1.6;
color:#555;
">

Find out more and contact the provider directly through Acity Connect.

</p>

</div>

<div style="text-align:center;">

<a
href="${process.env.FRONTEND_URL}/services.html"
style="
display:inline-block;
background:#2563EB;
color:white;
padding:18px 40px;
border-radius:999px;
text-decoration:none;
font-weight:bold;
"
>

View Service →

</a>

</div>

<hr
style="
border:none;
border-top:1px solid #eee;
margin:40px 0;
"
>

<p
style="
font-size:13px;
color:#777;
"
>

You're receiving this email because you subscribed to service updates or follow this provider.

</p>

<div style="
text-align:center;
margin-top:25px;
">

<a
href="${process.env.FRONTEND_URL}/profile.html"
style="
display:inline-block;
margin-right:15px;
color:#2563EB;
text-decoration:none;
font-weight:bold;
">

Manage Preferences

</a>

<a
href="${process.env.BACKEND_URL}/api/email/unsubscribe/${unsubscribeToken}"
style="
display:inline-block;
color:#EF4444;
text-decoration:none;
font-weight:bold;
">

Unsubscribe

</a>

</div>

<p
style="
font-size:12px;
color:#999;
"
>

Acity Connect • Academic City University

</p>

</td>

</tr>

</table>

</td>

</tr>

</table>

</body>

</html>

`;
const marketplaceDigestTemplate = (
    receiverName,
    sellerName,
    listings,
    averageRating,
    totalReviews,
    unsubscribeToken
) => {

    const preview = listings.slice(0, 5);

    const listingHtml = preview.map(item => `
        <tr>
            <td style="padding:16px;border-bottom:1px solid #eee;">
                <h3 style="margin:0;color:#111827;">
                    ${item.title}
                </h3>

                <p style="margin:8px 0;color:#6B7280;">
                    ${item.category}
                </p>

                <strong style="color:#DC2626;">
                    GH₵${item.price}
                </strong>
            </td>
        </tr>
    `).join("");

    const remaining =
        listings.length > 5
        ? `<p style="text-align:center;color:#6B7280;font-size:15px;">
            +${listings.length - 5} more item(s)
           </p>`
        : "";

    return `
<!DOCTYPE html>
<html>
<body style="
background:#f4f7fb;
font-family:Arial;
padding:40px;
">

<table
style="
max-width:700px;
margin:auto;
background:white;
border-radius:18px;
overflow:hidden;
">

<tr>

<td
style="
background:#DC2626;
padding:40px;
color:white;
text-align:center;
">

<h1>

🛒 Acity Marketplace

</h1>

<p>

${sellerName} added ${listings.length} new marketplace item${listings.length>1?"s":""}

</p>

</td>

</tr>

<tr>

<td style="padding:40px;">

<h2>

Hello ${receiverName} 👋

</h2>

<p>

<strong>${sellerName}</strong>

just updated their store.

</p>

<p>

⭐ ${averageRating} (${totalReviews} reviews)

</p>

<table
width="100%"
cellspacing="0"
cellpadding="0">

${listingHtml}

</table>

${remaining}

<div style="text-align:center;margin:35px 0;">

<a
href="${process.env.FRONTEND_URL}"
style="
background:#DC2626;
color:white;
padding:16px 35px;
border-radius:999px;
text-decoration:none;
display:inline-block;
font-weight:bold;
">

Visit Store →

</a>

</div>

<hr>

<p style="font-size:13px;color:#666;">

You're receiving this because you subscribed to marketplace updates or follow this seller.

</p>

<p>

<a
href="${process.env.BACKEND_URL}/api/email/unsubscribe/${unsubscribeToken}"
style="
display:inline-block;
color:#EF4444;
text-decoration:none;
font-weight:bold;
">

Unsubscribe

</a>

</p>

</td>

</tr>

</table>

</body>

</html>
`;

};

const serviceDigestTemplate = (
    receiverName,
    providerName,
    services,
    averageRating,
    unsubscribeToken
) => {

    const preview = services.slice(0, 5);

    const serviceHtml = preview.map(service => `
        <tr>
            <td style="padding:16px;border-bottom:1px solid #eee;">
                <h3 style="margin:0;color:#111827;">
                    ${service.title}
                </h3>

                <p style="margin:8px 0;color:#6B7280;">
                    ${service.category}
                </p>

                <strong style="color:#2563EB;">
                    GH₵${service.rate}
                    ${service.rate_type}
                </strong>
            </td>
        </tr>
    `).join("");

    const remaining =
        services.length > 5
        ? `<p style="text-align:center;color:#6B7280;font-size:15px;">
            +${services.length - 5} more service(s)
           </p>`
        : "";

    return `
<!DOCTYPE html>

<html>

<body style="
background:#f4f7fb;
font-family:Arial;
padding:40px;
">

<table
style="
max-width:700px;
margin:auto;
background:white;
border-radius:18px;
overflow:hidden;
">

<tr>

<td
style="
background:#2563EB;
padding:40px;
color:white;
text-align:center;
">

<h1>

🛠 Acity Services

</h1>

<p>

${providerName} added ${services.length} new service${services.length > 1 ? "s" : ""}

</p>

</td>

</tr>

<tr>

<td style="padding:40px;">

<h2>

Hello ${receiverName} 👋

</h2>

<p>

<strong>${providerName}</strong>

just posted new services.

</p>

<p>

⭐ ${averageRating}

</p>

<table
width="100%"
cellspacing="0"
cellpadding="0">

${serviceHtml}

</table>

${remaining}

<div style="text-align:center;margin:35px 0;">

<a
href="${process.env.FRONTEND_URL}/services.html"
style="
background:#2563EB;
color:white;
padding:16px 35px;
border-radius:999px;
text-decoration:none;
display:inline-block;
font-weight:bold;
">

View Services →

</a>

</div>

<hr>

<p style="font-size:13px;color:#666;">

You're receiving this because you subscribed to service updates or follow this provider.

</p>

<p>

<a
href="${process.env.BACKEND_URL}/api/email/unsubscribe/${unsubscribeToken}"
style="
display:inline-block;
color:#EF4444;
text-decoration:none;
font-weight:bold;
">

Unsubscribe

</a>

</p>

</td>

</tr>

</table>

</body>

</html>
`;

};


module.exports = {

    welcomeTemplate,

    buyerOrderTemplate,

    sellerOrderTemplate,

    messageTemplate,

    resetPasswordTemplate,

    marketplaceDigestTemplate,

    serviceDigestTemplate

};