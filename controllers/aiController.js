const { ZodError } = require("zod");
const { improveListing, listingDraftSchema } = require("../ai/sellerAgent");
const { AiGatewayError } = require("../ai/geminiGateway");
const { getPricingInsight } = require("../services/pricingService");

async function improveListingDraft(req, res) {
  try {
    const listingDraft = listingDraftSchema.parse(req.body);

    const [suggestions, pricing] = await Promise.all([
      improveListing(listingDraft),
      getPricingInsight(listingDraft.category)
    ]);

    return res.status(200).json({
      data: {
        ...suggestions,
        pricing
      },
      meta: {
        agent: "seller",
        advisoryOnly: true
      }
    });
  } catch (error) {
    if (error instanceof ZodError) {
      return res.status(400).json({
        error: {
          code: "VALIDATION_ERROR",
          message: "Please check the listing details and try again."
        }
      });
    }

    if (error instanceof AiGatewayError) {
      return res.status(error.statusCode).json({
        error: {
          code: error.code,
          message: error.message
        }
      });
    }

    console.error("Seller Agent controller failed", {
      name: error?.name,
      message: error?.message
    });

    return res.status(500).json({
      error: {
        code: "INTERNAL_ERROR",
        message: "Unable to improve this listing right now."
      }
    });
  }
}

module.exports = { improveListingDraft };