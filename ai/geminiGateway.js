class AiGatewayError extends Error {
  constructor(message, { statusCode = 502, code = "AI_UPSTREAM_ERROR" } = {}) {
    super(message);
    this.name = "AiGatewayError";
    this.statusCode = statusCode;
    this.code = code;
  }
}

let sdkPromise;
let clientPromise;

function loadGeminiSdk() {
  if (!sdkPromise) {
    sdkPromise = import("@google/genai");
  }

  return sdkPromise;
}

async function getClient() {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    throw new AiGatewayError("AI service is not configured.", {
      statusCode: 503,
      code: "AI_NOT_CONFIGURED"
    });
  }

  if (!clientPromise) {
    clientPromise = loadGeminiSdk().then(({ GoogleGenAI }) => {
      return new GoogleGenAI({ apiKey });
    });
  }

  return clientPromise;
}

function logUpstreamError(error) {
  console.error("Gemini request failed", {
    name: error?.name,
    message: error?.message,
    status: error?.status || error?.statusCode
  });
}

function toSafeGatewayError(error) {

  const upstreamStatus =
    error?.status ||
    error?.statusCode;

  if (upstreamStatus === 429) {

    return new AiGatewayError(

      "Acity AI is temporarily busy. Please try again in about a minute.",

      {

        statusCode: 503,

        code: "AI_RATE_LIMITED"

      }

    );

  }

  if (upstreamStatus === 503) {

    return new AiGatewayError(

      "Acity AI is temporarily unavailable. Please try again shortly.",

      {

        statusCode: 503,

        code: "AI_TEMPORARILY_UNAVAILABLE"

      }

    );

  }

  return new AiGatewayError(

    "AI service request failed.",

    {

      statusCode: 502,

      code: "AI_UPSTREAM_ERROR"

    }

  );

}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function cleanJsonText(value) {
    return String(value || "")
        .trim()
        .replace(/^```json\s*/i, "")
        .replace(/^```\s*/i, "")
        .replace(/\s*```$/i, "")
        .trim();
}

async function generateStructuredContent({
    systemInstruction,
    prompt,
    responseSchema,
    model = process.env.GEMINI_MODEL || "gemini-2.5-flash"
}) {
    if (
        typeof systemInstruction !== "string" ||
        !systemInstruction.trim()
    ) {
        throw new AiGatewayError(
            "AI system instructions are invalid.",
            {
                statusCode: 500,
                code: "AI_CONFIGURATION_ERROR"
            }
        );
    }

    if (
        typeof prompt !== "string" ||
        !prompt.trim()
    ) {
        throw new AiGatewayError(
            "AI prompt is invalid.",
            {
                statusCode: 500,
                code: "AI_CONFIGURATION_ERROR"
            }
        );
    }

    const retries = 3;
    let delay = 800;

    for (let attempt = 1; attempt <= retries; attempt++) {
        try {
            const client = await getClient();

            const response =
                await client.models.generateContent({
                    model,

                    contents: [
                        {
                            role: "user",
                            parts: [
                                {
                                    text: prompt
                                }
                            ]
                        }
                    ],

                    config: {
                        systemInstruction,
                        responseMimeType: "application/json",
                        responseJsonSchema: responseSchema,
                        maxOutputTokens: 300
                    }
                });

            const rawText = response?.text;

            if (
                typeof rawText !== "string" ||
                !rawText.trim()
            ) {
                throw new AiGatewayError(
                    "AI service returned an empty response.",
                    {
                        statusCode: 502,
                        code: "AI_EMPTY_RESPONSE"
                    }
                );
            }

            const cleanedText =
                cleanJsonText(rawText);

            try {
                return JSON.parse(cleanedText);
            } catch (parseError) {
                console.error(
                    "Gemini raw response:",
                    rawText
                );

                throw new AiGatewayError(
                    "AI service returned invalid JSON.",
                    {
                        statusCode: 502,
                        code: "AI_INVALID_JSON"
                    }
                );
            }

        } catch (error) {
            if (error instanceof AiGatewayError) {
                throw error;
            }

            const status =
                error?.status ||
                error?.statusCode;

            const retryable =
                status === 429 ||
                status === 500 ||
                status === 502 ||
                status === 503 ||
                status === 504;

            if (
                !retryable ||
                attempt === retries
            ) {
                logUpstreamError(error);
                throw toSafeGatewayError(error);
            }

            console.warn(
                `Gemini retry ${attempt}/${retries} in ${delay}ms...`
            );

            await sleep(delay);
            delay *= 2;
        }
    }
}

async function getGeminiType() {
  const { Type } = await loadGeminiSdk();
  return Type;
}

module.exports = {
  AiGatewayError,
  generateStructuredContent,
  getGeminiType
};