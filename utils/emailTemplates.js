function welcomeTemplate(name) {

    return `

    <!DOCTYPE html>

    <html>

    <body style="
        margin:0;
        padding:0;
        background:#f4f7fb;
        font-family:Arial, Helvetica, sans-serif;
    ">

        <table width="100%" cellpadding="0" cellspacing="0">

            <tr>

                <td align="center">

                    <table
                        width="650"
                        cellpadding="0"
                        cellspacing="0"
                        style="
                            background:white;
                            margin:40px 0;
                            border-radius:18px;
                            overflow:hidden;
                            box-shadow:0 15px 40px rgba(0,0,0,.08);
                        "
                    >

                        <tr>

                            <td
                                align="center"
                                style="
                                    background:#ff2d2d;
                                    color:white;
                                    padding:40px;
                                "
                            >

                                <h1 style="margin:0;">

                                    🎓 Acity Connect

                                </h1>

                                <p style="margin-top:12px;">

                                    Your Campus Marketplace

                                </p>

                            </td>

                        </tr>

                        <tr>

                            <td style="padding:45px;">

                                <h2>

                                    Welcome ${name}! 👋

                                </h2>

                                <p>

                                    Thanks for joining
                                    <strong>Acity Connect.</strong>

                                </p>

                                <p>

                                    You can now:

                                </p>

                                <ul>

                                    <li>🛒 Buy & Sell Items</li>

                                    <li>💬 Chat with Students</li>

                                    <li>🛠 Offer Services</li>

                                    <li>⭐ Receive Reviews</li>

                                    <li>📦 Manage Orders</li>

                                </ul>

                                <div
                                    style="
                                        margin:40px 0;
                                        text-align:center;
                                    "
                                >

                                    <a
                                        href="${process.env.FRONTEND_URL}"
                                        style="
                                            display:inline-block;
                                            padding:16px 36px;
                                            background:#ff2d2d;
                                            color:white;
                                            text-decoration:none;
                                            border-radius:50px;
                                            font-weight:bold;
                                        "
                                    >

                                        Open Acity Connect

                                    </a>

                                </div>

                                <p>

                                    Happy trading!

                                </p>

                                <h3>

                                    The Acity Connect Team ❤️

                                </h3>

                            </td>

                        </tr>

                    </table>

                </td>

            </tr>

        </table>

    </body>

    </html>

    `;

}

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

    reviews

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

<p
style="
color:#777;
font-size:13px;
">

You're receiving this email because you subscribed to marketplace updates or follow this seller.

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
rating

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


module.exports = {

    welcomeTemplate,

    buyerOrderTemplate,

    sellerOrderTemplate,

    messageTemplate,

    resetPasswordTemplate,

    newListingTemplate,

    newServiceTemplate

};