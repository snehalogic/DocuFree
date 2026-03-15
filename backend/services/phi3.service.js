import fetch from "node-fetch";

const HF_API_URL =
  "https://api-inference.huggingface.co/models/microsoft/Phi-3-mini-4k-instruct";

export async function askPhi3(documentText, question) {
  const prompt = `
You are an AI assistant that answers questions strictly based on the document.

DOCUMENT:
${documentText}

QUESTION:
${question}

If the answer is not present in the document, say "The document does not contain this information."
`;

  const response = await fetch(HF_API_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.HF_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      inputs: prompt,
      parameters: {
        max_new_tokens: 400,
        temperature: 0.2,
      },
    }),
  });

  const data = await response.json();

  return data?.[0]?.generated_text || "No response generated";
}
