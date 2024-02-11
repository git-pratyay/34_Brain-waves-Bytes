const { GoogleGenerativeAI } = require("@google/generative-ai");
const http = require ('http')
const fs = require("fs");
const dotenv = require('dotenv');
const fileContent = fs.readFileSync('index.html')
dotenv.config();

const server = http.createServer((req, res) => {
  res.writeHead(200, {'content-type':'text/html'});
  res.end(fileContent)
})

// Access your API key as an environment variable (see "Set up your API key" instructions)
const genAI = new GoogleGenerativeAI(process.env.API_KEY);

// Helper function to convert file information to a GoogleGenerativeAI.Part object
function fileToGenerativePart(path, mimeType) {
  return {
    inlineData: {
      data: Buffer.from(fs.readFileSync(path)).toString("base64"),
      mimeType,
    },
  };
}

async function diseaseNameGenerator() {
  // Use the appropriate model for leaf image identification
  const model = genAI.getGenerativeModel({ model: "gemini-pro-vision" });

  const prompt = "'Gemini, your task is to identify whether the image that is provided is of a leaf or not. If you can not find any leaf then reply \'No leaf detected !! Try another image\'. If its a leaf then do not reply anything like leaf detected, rather identify if the leaf is healthy or not. If the leaf is healthy then reply \'Healthy Leaf\'. If the leaf is not healthy and seems abnormal,then do not reply that the leaf is not normal or healthy or seems abnormal, rather try to figure out what are the diseases, pests, deficiencies, or decay that is causing the abnormality in the leaf, and reply the exact name of the disease or deficiency that you found, do not reply the explanation of the disease or do not reply with any extra text just reply the name of the disease or deficiency. Another big point is I strictly do not want any text like leaf detected'";

  const imageParts = [fileToGenerativePart("./dataset/image19.jpg", "image/jpeg")];

  try {
    const result = await model.generateContent([prompt, ...imageParts]);
    const response = await result.response;
    const text = response.text();

    if (text === "No leaf detected !! Try another image") {
      console.log("No leaf detected in the image.");
      return; // Terminate if no leaf is found
    }

    // Handle healthy leaf scenario (adjust according to your use case)
    else if (text === "Healthy Leaf") {
      console.log("The leaf appears healthy.");
      return; // Terminate if the leaf is healthy
    }

    else {
      const diseaseName = text; // Extract the disease name from the response
      console.log("Agro-lens captured:", diseaseName);
      return diseaseName; // Return the disease name for further processing
    }

  } catch (error) {
    console.error("Error occurred:", error);
    return; // Handle errors gracefully
  }
}

async function run() {
  // Use the appropriate model for text-based generation
  const model = genAI.getGenerativeModel({ model: "gemini-pro" });

  const diseaseName = await diseaseNameGenerator(); // Call the disease identification function

  if (diseaseName != "No leaf detected in the image." && "Healthy Leaf") {
    const prompt = `Gemini, for the plant disease "${diseaseName}", provide three precautionary measures to prevent or manage the disease. These measures should be concise, clear, and limited to one sentence each. No additional information or context is needed—only the three precautions in bullet-point format.But if the plant disease is 'healthy leaf' then must reply\'No need to worry. The leaf seems healthy\' else if the plant disease is 'No leaf detected !! Try another image' then must reply \'No leaf detected in the image\'`;

    try {
      const result = await model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();
      console.log("\nPrecautionary measures for", diseaseName, ":\n", text);
    } catch (error) {
      console.error("Error occurred:", error);
    }
  } else {
    console.log("No disease detected or other error occurred in disease identification.");
  }
}

run();

server.listen(80, '127.0.0.1', ()=>{
  console.log("Listening on port 80...")
})
