export const uploadToImgBB = async (
  file: Express.Multer.File
): Promise<{ url: string; displayUrl: string }> => {
  const apiKey = process.env.IMGBB_API_KEY;

  if (!apiKey) {
    throw new Error(
      "ImgBB API key is missing. Add IMGBB_API_KEY to the server .env file."
    );
  }

  // Convert image buffer into Base64
  const base64Image = file.buffer.toString("base64");

  // Prepare data for ImgBB
  const formData = new FormData();

  formData.append("image", base64Image);

  if (file.originalname) {
    formData.append("name", file.originalname);
  }

  // Send image to ImgBB
  const response = await fetch(
    `https://api.imgbb.com/1/upload?key=${apiKey}`,
    {
      method: "POST",
      body: formData,
    }
  );

  // ImgBB normally answers JSON, but a proxy/rate-limit page can come back as
  // HTML — parse defensively so the caller always gets a readable message.
  let result: {
    success?: boolean;
    data?: { url?: string; display_url?: string };
    error?: { message?: string; code?: number };
  } | null = null;

  try {
    result = await response.json();
  } catch {
    result = null;
  }

  console.log(
    `ImgBB upload: HTTP ${response.status} ${
      result?.success ? "ok" : `failed (${result?.error?.code ?? "no code"})`
    }`
  );

  if (!response.ok || !result?.success) {
    const code = result?.error?.code;
    const reason =
      result?.error?.message || `ImgBB returned HTTP ${response.status}`;

    // 103 = ImgBB refuses this specific image (too small, duplicate or flagged)
    // while the API key itself stays valid.
    if (code === 103) {
      throw new Error(
        `ImgBB refused this image (error 103: ${reason}). ` +
          "Very small, duplicate or flagged images are rejected — please try a different image."
      );
    }

    throw new Error(
      `ImgBB image upload failed${code ? ` (error ${code})` : ""}: ${reason}`
    );
  }

  const url = result.data?.url;
  const displayUrl = result.data?.display_url;

  if (!url) {
    throw new Error("ImgBB responded without an image URL.");
  }

  // Return hosted image URLs (full-size + display size)
  return {
    url,
    displayUrl: displayUrl ?? url,
  };
};
