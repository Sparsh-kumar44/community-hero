const { Client, handle_file } = require("@gradio/client");

async function run() {
  try {
    const app = await Client.connect("Sparsh141/vision-language-model");
    console.log("Connected successfully!");
    
    // Fetch a public image as buffer
    const res = await fetch("https://raw.githubusercontent.com/gradio-app/gradio/main/test/test_files/bus.png");
    const arrayBuffer = await res.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    
    // Convert Buffer to Blob
    const blob = new Blob([buffer], { type: "image/png" });
    
    const result = await app.predict("/analyze_image", [
      handle_file(blob),
      "Describe this image"
    ]);
    
    console.log("Result:");
    console.log(JSON.stringify(result.data, null, 2));
  } catch (err) {
    console.error("Error:", err);
  }
}

run();
