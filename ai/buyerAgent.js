const { z } = require("zod");
const {
    generateStructuredContent,
    getGeminiType
} = require("./geminiGateway");

const intentSchema = z.object({

    keywords: z.array(
        z.string().min(1).max(80)
    ).min(1),

    sortBy: z.enum([
        "relevance",
        "price",
        "created_at"
    ]),

    sortDirection: z.enum([
        "asc",
        "desc"
    ]),

    minPrice: z
        .number()
        .nullable(),

    maxPrice: z
        .number()
        .nullable(),

    explanation: z
        .string()
        .min(1)
        .max(200)

});

async function intentResponseSchema() {

    const Type = await getGeminiType();

    return {

        type: Type.OBJECT,

        required: [
            "keywords",
            "sortBy",
            "sortDirection",
            "minPrice",
            "maxPrice",
            "explanation"
        ],

        properties: {

            keywords: {

                type: Type.ARRAY,

                items: {
                    type: Type.STRING
                }

            },

            sortBy: {

                type: Type.STRING,

                enum: [
                    "relevance",
                    "price",
                    "created_at"
                ]

            },

            sortDirection: {

                type: Type.STRING,

                enum: [
                    "asc",
                    "desc"
                ]

            },

            minPrice: {

                type: Type.NUMBER,

                nullable: true

            },

            maxPrice: {

                type: Type.NUMBER,

                nullable: true

            },

            explanation: {

                type: Type.STRING

            }

        }

    };

}

async function extractSearchIntent(query) {

    const response =
        await generateStructuredContent({

            systemInstruction: `
You are Acity Connect's Buyer Intent AI.

Your ONLY responsibility is understanding what the buyer wants.

Never recommend products.

Never invent products.

Never rank products.

Never answer questions.

Return ONLY structured search intent.

Rules:

Ignore filler words such as:

cheap
cheapest
best
good
nice
find
looking for
where can I buy
show me
need
want
please

---------------------------------

Examples

"cheapest led lights"

keywords:
["led lights"]

sortBy:
price

sortDirection:
asc

---------------------------------

"most expensive calculator"

keywords:
["calculator"]

sortBy:
price

sortDirection:
desc

---------------------------------

"newest laptop"

keywords:
["laptop"]

sortBy:
created_at

sortDirection:
desc

---------------------------------

"oldest books"

keywords:
["books"]

sortBy:
created_at

sortDirection:
asc

---------------------------------

"water under 20"

keywords:
["water"]

maxPrice:
20

---------------------------------

"phones above 500"

keywords:
["phones"]

minPrice:
500

---------------------------------

If no sorting intent exists:

sortBy = relevance

sortDirection = desc

Keep multi-word products together.

For example:

"led lights"

NOT

["led","lights"]

Return JSON only.
`,

            prompt: query,

            responseSchema:
                await intentResponseSchema()

        });

    return intentSchema.parse(response);

}

module.exports = {

    extractSearchIntent

};