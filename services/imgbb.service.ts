export const uploadToImgBB = async (
  file: Express.Multer.File
): Promise<string> => {
  const apiKey = process.env.IMGBB_API_KEY;

  if (!apiKey) {
    throw new Error("ImgBB API key is missing");
  }

  console.log("1. ImgBB upload started");
    console.log("2. File name:", file.originalname);
    console.log("3. File size:", file.size);

  // Convert image buffer into Base64
  const base64Image = file.buffer.toString("base64");

  // Prepare data for ImgBB
  const formData = new FormData();

  formData.append("image", base64Image);

  // Send image to ImgBB
  const response = await fetch(
    `https://api.imgbb.com/1/upload?key=${apiKey}`,
    {
      method: "POST",
      body: formData,
    }
  );

  const result = await response.json();
  console.log("6. ImgBB response:", result);

  if (!response.ok || !result.success) {
    throw new Error(
      result.error?.message || "ImgBB image upload failed"
    );
  }
 console.log("7. ImgBB upload successful");
  // Return hosted image URL
  return result.data.url;
};