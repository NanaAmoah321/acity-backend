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
  const upstreamStatus = error?.status || error?.statusCode;

  if (upstreamStatus === 429) {
    return new AiGatewayError(
    "Acity AI has reached its usage limit. Please try again in about a minute.",{
      statusCode: 503,
      code: "AI_RATE_LIMITED"
    });
  }

  return new AiGatewayError("AI service request failed.", {
    statusCode: 502,
    code: "AI_UPSTREAM_ERROR"
  });
}

async function generateStructuredContent({
  systemInstruction,
  prompt,
  responseSchema,
  model = process.env.GEMINI_MODEL || "gemini-2.5-flash"
}) {
  if (typeof systemInstruction !== "string" || !systemInstruction.trim()) {
    throw new AiGatewayError("AI system instructions are invalid.", {
      statusCode: 500,
      code: "AI_CONFIGURATION_ERROR"
    });
  }

  if (typeof prompt !== "string" || !prompt.trim()) {
    throw new AiGatewayError("AI prompt is invalid.", {
      statusCode: 500,
      code: "AI_CONFIGURATION_ERROR"
    });
  }

  try {
    const client = await getClient();

    const response = await client.models.generateContent({
      model,
      contents: [
        {
          role: "user",
          parts: [{ text: prompt }]
        }
      ],
      config: {
        
        systemInstruction,
        responseMimeType: "application/json",
        responseJsonSchema: responseSchema,
        maxOutputTokens: 1000
        }
    });

    if (!response.text) {
      throw new AiGatewayError("AI service returned an empty response.", {
        code: "AI_EMPTY_RESPONSE"
      });
    }

    try {
        return JSON.parse(response.text);
        } catch {
        

        throw new AiGatewayError("AI service returned invalid JSON.", {
            code: "AI_INVALID_JSON"
        });
        }
  } catch (error) {
    if (error instanceof AiGatewayError) {
      throw error;
    }

    logUpstreamError(error);
    throw toSafeGatewayError(error);
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