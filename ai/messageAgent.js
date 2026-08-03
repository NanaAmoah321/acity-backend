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

            "translatedMessage",

            "detectedLanguage",

            "isSpam",

            "spamReason",

            "isScam",

            "scamReason",

            "isToxic",

            "toxicityReason",

            "suggestedReplies"

        ],

        properties: {

            translatedMessage: {
                type: Type.STRING
            },

            detectedLanguage: {
                type: Type.STRING
            },

            isSpam: {
                type: Type.BOOLEAN
            },

            spamReason: {
                type: Type.STRING
            },

            isScam: {
                type: Type.BOOLEAN
            },

            scamReason: {
                type: Type.STRING
            },

            isToxic: {
                type: Type.BOOLEAN
            },

            toxicityReason: {
                type: Type.STRING
            },

            suggestedReplies: {

                type: Type.ARRAY,

                items: {
                    type: Type.STRING
                }

            }

        }

    };

};

const outputSchema = z.object({

    translatedMessage:
        z.string(),

    detectedLanguage:
        z.string(),

    isSpam:
        z.boolean(),

    spamReason:
        z.string(),

    isScam:
        z.boolean(),

    scamReason:
        z.string(),

    isToxic:
        z.boolean(),

    toxicityReason:
        z.string(),

    suggestedReplies:
        z.array(z.string())
            .max(3)

});

async function analyzeMessage(message) {

    const prompt = `
Message:

"${message}"
`;

    const response =
        await generateStructuredContent({

            systemInstruction: `

You are Acity Connect's Message AI.

Analyze ONE message.

Tasks:

1. Detect the language.

2. Translate it into English.

3. Detect spam.

4. Detect scams.

5. Detect abusive or toxic language.

6. Generate up to 3 short suggested replies.

Rules:

- Never rewrite the user's meaning.

- Keep translations natural.

- Suggested replies must be short.

- If the message is already English,
translatedMessage should equal the original.

Return JSON only.

`,

            prompt,

            responseSchema:
                await responseSchema()

        });

    return outputSchema.parse(response);

}

module.exports = {

    analyzeMessage

};