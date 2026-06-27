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
                                        href="https://acity-backend.onrender.com"
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
                href="https://acity-backend.onrender.com/inbox.html"
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



module.exports = {

    welcomeTemplate,

    buyerOrderTemplate,

    sellerOrderTemplate,

    messageTemplate,

    resetPasswordTemplate

};