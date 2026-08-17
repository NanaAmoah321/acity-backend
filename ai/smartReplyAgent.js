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

            Return ONLY valid JSON.
            Do not use markdown.
            Do not use code fences.
            Do not write any explanation.

            The JSON must have exactly this shape:

            {
            "replies": [
                "short reply one",
                "short reply two",
                "short reply three"
            ]
            }

            Generate exactly three short, natural replies.
            Each reply must be under 8 words.
            Use no emojis and no quotation marks.
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