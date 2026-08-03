const { z } = require("zod");
const {
    generateStructuredContent,
    getGeminiType
} = require("./geminiGateway");

/* ======================================================
   Intent Extraction
====================================================== */

const intentOutputSchema = z.object({
    keywords: z.array(
        z.string().min(1).max(50)
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

    minPrice: z.number().nullable(),

    maxPrice: z.number().nullable(),

    explanation: z.string().min(1).max(200)
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

Understand what the buyer wants.

Rules:

- Remove filler words.
- Keep only product keywords.

Examples:

"cheapest led lights"

keywords:
["led lights"]

sortBy:
price

sortDirection:
asc

--------------------

"most expensive laptop"

keywords:
["laptop"]

sortBy:
price

sortDirection:
desc

--------------------

"newest calculator"

keywords:
["calculator"]

sortBy:
created_at

sortDirection:
desc

--------------------

"oldest calculator"

sortBy:
created_at

sortDirection:
asc

--------------------

"water under 20 cedis"

keywords:
["water"]

maxPrice:
20

--------------------

If no sorting intent exists:

sortBy:
relevance

sortDirection:
desc

Return JSON only.
`,

            prompt: query,

            responseSchema:
                await intentResponseSchema()

        });

    return intentOutputSchema.parse(response);

}

/* ======================================================
   Ranking
====================================================== */

const rankingOutputSchema = z.object({

    rankedListings: z.array(

        z.object({

            id: z.number().int(),

            score: z.number()
                .min(0)
                .max(100),

            reason: z.string()
                .min(1)
                .max(300)

        })

    ),

    overallExplanation:
        z.string()
            .min(1)
            .max(500)

});

async function rankingResponseSchema() {

    const Type = await getGeminiType();

    return {

        type: Type.OBJECT,

        required: [
            "rankedListings",
            "overallExplanation"
        ],

        properties: {

            rankedListings: {

                type: Type.ARRAY,

                items: {

                    type: Type.OBJECT,

                    required: [
                        "id",
                        "score",
                        "reason"
                    ],

                    properties: {

                        id: {
                            type: Type.INTEGER
                        },

                        score: {
                            type: Type.NUMBER
                        },

                        reason: {
                            type: Type.STRING
                        }

                    }

                }

            },

            overallExplanation: {
                type: Type.STRING
            }

        }

    };

}

async function rankListings(query, listings) {

    if (!Array.isArray(listings) ||
        listings.length === 0) {

        return {

            rankedListings: [],

            overallExplanation:
                "No matching listings were found."

        };

    }

    const prompt = `
User Search

${query}

Candidate Listings

${JSON.stringify(

    listings.map(item => ({

        id: item.id,

        title: item.title,

        description: item.description,

        category: item.category,

        price: item.price,

        stock_quantity:
            item.stock_quantity

    })),

    null,

    2

)}
`;

    const response =
        await generateStructuredContent({

            systemInstruction: `
You are Acity Connect's Buyer Ranking AI.

ONLY rank the provided listings.

Never invent listings.

Never invent IDs.

Never invent prices.

Prefer listings that:

- match the user's intent
- are in stock
- satisfy the requested sorting

If the user asked for the cheapest item,
higher scores should go to cheaper listings.

If the user asked for the newest,
higher scores should go to newer listings.

Reasons must be short.

Return JSON only.
`,

            prompt,

            responseSchema:
                await rankingResponseSchema()

        });

    return rankingOutputSchema.parse(response);

}

module.exports = {

    extractSearchIntent,

    rankListings

};