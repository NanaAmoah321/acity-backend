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
            "improvedMessage"
        ],

        properties: {

            improvedMessage: {
                type: Type.STRING
            }

        }

    };

};

const outputSchema = z.object({

    improvedMessage:
        z.string()
            .min(1)
            .max(1000)

});

async function improveMessage(message) {

    const response =
        await generateStructuredContent({

            systemInstruction: `

You are Acity Connect's AI Writing Assistant.

Improve marketplace messages.

Goals:

- Keep the original meaning.
- Make the message polite.
- Improve grammar.
- Improve clarity.
- Do NOT make the message longer than necessary.
- Do NOT invent information.
- Return JSON only.

`,

            prompt: `

Original Message:

"${message}"

`,

            responseSchema:
                await responseSchema()

        });

    return outputSchema.parse(response);

}

module.exports = {

    improveMessage

};