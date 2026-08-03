const { z } = require("zod");

const {
    generateStructuredContent,
    getGeminiType
} = require("./geminiGateway");

const translationSchema = async () => {

    const Type = await getGeminiType();

    return {

        type: Type.OBJECT,

        required: [
            "translatedMessage",
            "detectedLanguage"
        ],

        properties: {

            translatedMessage: {
                type: Type.STRING
            },

            detectedLanguage: {
                type: Type.STRING
            }

        }

    };

};

const translationOutput = z.object({

    translatedMessage:
        z.string().min(1).max(5000),

    detectedLanguage:
        z.string().min(2).max(50)

});

async function translateMessage(message) {

    if (
        typeof message !== "string" ||
        !message.trim()
    ) {

        return {

            translatedMessage: "",

            detectedLanguage: "unknown"

        };

    }

    const response =
        await generateStructuredContent({

            systemInstruction: `
You are Acity Connect's Translation Agent.

Rules:

- Detect the language.
- Translate everything into English.
- Preserve meaning.
- Preserve emojis.
- Preserve punctuation.
- Do NOT explain.
- Return JSON only.
`,

            prompt: `
Message:

${message}
`,

            responseSchema:
                await translationSchema()

        });

    return translationOutput.parse(response);

}

module.exports = {

    translateMessage

};