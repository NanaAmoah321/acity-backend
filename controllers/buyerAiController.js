const { buyerSearchSchema } = require("../schemas/buyerSearchSchema");

const {
    extractSearchIntent
} = require("../ai/buyerAgent");

const {
    searchListings
} = require("../services/listingSearchService");

const {
    AiGatewayError
} = require("../ai/geminiGateway");

function buildExplanation(intent, resultCount) {

    if (resultCount === 0) {
        return "No matching listings were found.";
    }

    let message = "Showing";

    switch (intent.sortBy) {

        case "price":
            message += intent.sortDirection === "asc"
                ? " the cheapest"
                : " the most expensive";
            break;

        case "created_at":
            message += intent.sortDirection === "desc"
                ? " the newest"
                : " the oldest";
            break;

        default:
            message += " the most relevant";
    }

    message += ` ${intent.keywords.join(" ")} listings`;

    if (intent.maxPrice !== null) {
        message += ` under GH₵${intent.maxPrice}`;
    }

    if (intent.minPrice !== null) {
        message += ` above GH₵${intent.minPrice}`;
    }

    message += ".";

    return message;
}

async function search(req, res) {

    try {

        const { query } =
            buyerSearchSchema.parse(req.body);

        const intent =
            await extractSearchIntent(query);

        const results =
            await searchListings(intent);

        return res.status(200).json({

            success: true,

            query,

            intent,

            explanation:
                buildExplanation(
                    intent,
                    results.length
                ),

            results

        });

    }

    catch (error) {

        console.error(
            "Buyer AI Search Error:",
            error
        );

        if (error.name === "ZodError") {

            return res.status(400).json({

                success: false,

                error: "Invalid search query.",

                details: error.issues

            });

        }

        if (
            error instanceof AiGatewayError
        ) {

            return res.status(
                error.statusCode
            ).json({

                success: false,

                error: error.message,

                code: error.code

            });

        }

        return res.status(500).json({

            success: false,

            error:
                "Unable to process AI search."

        });

    }

}

module.exports = {
    search
};