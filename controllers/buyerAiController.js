const { buyerSearchSchema } = require("../schemas/buyerSearchSchema");
const { searchListings } = require("../services/listingSearchService");
const { rankListings } = require("../ai/buyerAgent");
const { AiGatewayError } = require("../ai/geminiGateway");

async function search(req, res) {
  try {
    const { query } = buyerSearchSchema.parse(req.body);

    const candidates = await searchListings(query);

    if (candidates.length === 0) {
      return res.status(200).json({
        success: true,
        query,
        explanation: "No matching listings were found.",
        results: []
      });
    }

    const aiResponse = await rankListings(query, candidates);

    // Create a lookup map of real listings
    const listingMap = new Map(
      candidates.map((listing) => [listing.id, listing])
    );

    // Merge AI ranking with real database listings
    const rankedResults = aiResponse.rankedListings
      .map((item) => {
        const listing = listingMap.get(item.id);

        if (!listing) {
          return null;
        }

        return {
          ...listing,
          aiScore: item.score,
          aiReason: item.reason
        };
      })
      .filter(Boolean)
      .sort((a, b) => b.aiScore - a.aiScore);

    return res.status(200).json({
      success: true,
      query,
      explanation: aiResponse.overallExplanation,
      results: rankedResults
    });

  } catch (error) {

    if (error.name === "ZodError") {
      return res.status(400).json({
        success: false,
        error: "Invalid search query.",
        details: error.issues
      });
    }

    if (error instanceof AiGatewayError) {
      return res.status(error.statusCode).json({
        success: false,
        error: error.message,
        code: error.code
      });
    }

    console.error("Buyer AI Search Error:", error);

    return res.status(500).json({
      success: false,
      error: "Unable to process AI search."
    });
  }
}

module.exports = {
  search
};