const { buyerSearchSchema } = require("../schemas/buyerSearchSchema");

const {
    extractSearchIntent,
    rankListings
} = require("../ai/buyerAgent");

const {
    searchListings
} = require("../services/listingSearchService");

const {
    AiGatewayError
} = require("../ai/geminiGateway");

async function search(req, res) {

    try {

        // Validate request
        const { query } =
            buyerSearchSchema.parse(req.body);

        // AI understands what the buyer wants
        const intent =
            await extractSearchIntent(query);

        // PostgreSQL searches using the extracted intent
        const candidates =
            await searchListings(intent);

        if (candidates.length === 0) {

            return res.status(200).json({

                success: true,

                query,

                intent,

                explanation:
                    "No matching listings were found.",

                results: []

            });

        }

        // AI ranks ONLY the real listings
        const aiResponse =
            await rankListings(
                query,
                candidates
            );

        const listingMap = new Map(

            candidates.map(listing => [

                listing.id,

                listing

            ])

        );

        const rankedResults =

            aiResponse.rankedListings

                .map(result => {

                    const listing =
                        listingMap.get(result.id);

                    if (!listing) {

                        return null;

                    }

                    return {

                        ...listing,

                        aiScore:
                            result.score,

                        aiReason:
                            result.reason

                    };

                })

                .filter(Boolean)

                .sort(

                    (a, b) =>

                        b.aiScore -

                        a.aiScore

                );

        return res.status(200).json({

            success: true,

            query,

            intent,

            explanation:
                aiResponse.overallExplanation,

            results:
                rankedResults

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

                error:
                    "Invalid search query.",

                details:
                    error.issues

            });

        }

        if (
            error instanceof AiGatewayError
        ) {

            return res.status(
                error.statusCode
            ).json({

                success: false,

                error:
                    error.message,

                code:
                    error.code

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