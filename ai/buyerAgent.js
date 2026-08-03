const { z } = require("zod");
const {
  generateStructuredContent,
  getGeminiType
} = require("./geminiGateway");

const buyerResponseSchema = async () => {
  const Type = await getGeminiType();

  return {
    type: Type.OBJECT,
    required: ["rankedListings", "overallExplanation"],
    properties: {
      rankedListings: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          required: ["id", "score", "reason"],
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
};

const buyerOutputSchema = z.object({
  rankedListings: z.array(
    z.object({
      id: z.number().int(),
      score: z.number().min(0).max(100),
      reason: z.string().min(1).max(300)
    })
  ),
  overallExplanation: z.string().min(1).max(500)
});

async function rankListings(query, listings) {
  if (!Array.isArray(listings) || listings.length === 0) {
    return {
      rankedListings: [],
      overallExplanation: "No matching listings were found."
    };
  }

  const prompt = `
User Search:
${query}

Marketplace Listings:

${JSON.stringify(
  listings.map((listing) => ({
    id: listing.id,
    title: listing.title,
    description: listing.description,
    category: listing.category,
    price: listing.price
  })),
  null,
  2
)}
`;

  const response = await generateStructuredContent({
    systemInstruction: `
You are Acity Connect's Buyer AI.

Your job is ONLY to rank the provided listings.

Rules:

- Never invent listings.
- Never invent IDs.
- Never change prices.
- Never change descriptions.
- Never mention listings that are not provided.
- Rank listings from best to worst based on the user's search.
- Give each listing a score between 0 and 100.
- Keep reasons short.
- Return JSON only.
`,
    prompt,
    responseSchema: await buyerResponseSchema()
  });

  return buyerOutputSchema.parse(response);
}

module.exports = {
  rankListings
};