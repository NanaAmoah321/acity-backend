const { z } = require("zod");

const {
    generateStructuredContent,
    getGeminiType
} = require("./geminiGateway");

const responseSchema = async () => {

    const Type = await getGeminiType();

    return {

        type: Type.OBJECT,

        required: [
            "replies"
        ],

        properties: {

            replies: {

                type: Type.ARRAY,

                items: {
                    type: Type.STRING
                }

            }

        }

    };

};

const outputSchema = z.object({

    replies: z
        .array(z.string())
        .min(1)
        .max(3)

});

async function generateSmartReplies(message){

    const response =
    await generateStructuredContent({

        systemInstruction: `

You are Acity Connect's Smart Reply AI.

Generate exactly three replies that the current user could naturally send back.

The replies should:

- directly answer the message
- sound like real students
- be short
- all be different
- fit a marketplace conversation
- never repeat the incoming message
- never ask unrelated questions
- never include quotation marks
- no emojis

Return JSON only.

Rules:

- Natural
- Friendly
- Marketplace context
- Under 8 words each
- No emojis
- No quotation marks
- Return JSON only

`,

        prompt: `

Incoming message:

"${message}"

`,

        responseSchema:
        await responseSchema()

    });

    return outputSchema.parse(response);

}

module.exports = {

    generateSmartReplies

};