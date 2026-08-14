const { ZodError } = require("zod");
const { improveListing, listingDraftSchema } = require("../ai/sellerAgent");
const { AiGatewayError } = require("../ai/geminiGateway");
const { getPricingInsight } = require("../services/pricingService");
const { improveMessage } = require("../ai/messageComposer");

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

    if (error instanceof ZodError) {
    const details = error.issues
        .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
        .join(" ");

    return res.status(400).json({
        error: {
        code: "VALIDATION_ERROR",
        message: details
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

async function improveMessageController(req, res) {

    try {

        const { message } = req.body;

        if (
            !message ||
            typeof message !== "string" ||
            !message.trim()
        ) {

            return res.status(400).json({

                error: {

                    code: "VALIDATION_ERROR",

                    message: "Message is required."

                }

            });

        }

        const improvedMessage =
            await improveMessage(message);

        return res.status(200).json({

            data: improvedMessage,

            meta: {

                agent: "message"

            }

        });

    } catch (error) {

        if (error instanceof AiGatewayError) {

            return res.status(error.statusCode).json({

                error: {

                    code: error.code,

                    message: error.message

                }

            });

        }

        console.error("Message Composer failed", {

            name: error?.name,

            message: error?.message

        });

        return res.status(500).json({

            error: {

                code: "INTERNAL_ERROR",

                message:
                    "Unable to improve this message."

            }

        });

    }

}

module.exports = { improveListingDraft, improveMessageController };