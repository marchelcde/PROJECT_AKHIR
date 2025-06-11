document.addEventListener("DOMContentLoaded", function () {
  const imageInput = document.getElementById("imageUpload");
  const uploadedImage = document.getElementById("uploadedImage");
  const downloadBtn = document.getElementById("downloadBtn");
  let currentObjectUrl = null;
  let originalFileName = null;

  const ROBOFLOW_PROJECT_ID = "dataset-6nff1";
  const ROBOFLOW_VERSION_ID = "4";
  const ROBOFLOW_API_KEY = "UL8nLpCiEBGbxYqRq0nY";
  const ROBOFLOW_API_URL = `https://detect.roboflow.com/${ROBOFLOW_PROJECT_ID}/${ROBOFLOW_VERSION_ID}?api_key=${ROBOFLOW_API_KEY}&format=image&labels=on&stroke=3&confidence=40`;
  imageInput.addEventListener("change", function () {
    const file = this.files[0];
    if (file && file.type.startsWith("image/")) {
      originalFileName = file.name.split(".")[0];
      sendToRoboflowAPI(file);
    } else {
      uploadedImage.style.display = "none";
      if (downloadBtn) downloadBtn.style.display = "none";
      if (file) {
        alert("Silakan pilih file gambar yang valid (contoh: JPG, PNG).");
      }
    }
  });

  async function sendToRoboflowAPI(imageFile) {
    const formData = new FormData();
    formData.append("file", imageFile);
    console.log("Sending image to Roboflow (expecting processed image)...");
    uploadedImage.src = "";
    uploadedImage.style.display = "none";
    if (downloadBtn) downloadBtn.style.display = "none";

    try {
      const response = await fetch(ROBOFLOW_API_URL, {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const errorBody = await response.text();
        console.error("Roboflow API Error Response:", errorBody);
        throw new Error(
          `HTTP error ${response.status}: ${response.statusText}. Server says: ${errorBody}`
        );
      }

      const imageBlob = await response.blob();

      if (currentObjectUrl) {
        URL.revokeObjectURL(currentObjectUrl);
      }
      currentObjectUrl = URL.createObjectURL(imageBlob);
      uploadedImage.src = currentObjectUrl;
      uploadedImage.style.display = "block";
      if (downloadBtn) downloadBtn.style.display = "inline-block";
      console.log("Processed image received from Roboflow and displayed.");
    } catch (err) {
      console.error(
        "Gagal mengirim ke Roboflow API atau memproses respons gambar:",
        err
      );
      alert(
        "Gagal mendapatkan gambar hasil deteksi dari server. Cek konsol untuk detail."
      );
      uploadedImage.style.display = "none";
    }
  }

  function downloadImage() {
    if (currentObjectUrl && originalFileName) {
      const timestamp = new Date()
        .toISOString()
        .slice(0, 19)
        .replace(/:/g, "-");
      const filename = `${originalFileName}-fish-detection-result-${timestamp}.jpg`;

      const downloadLink = document.createElement("a");
      downloadLink.href = currentObjectUrl;
      downloadLink.download = filename;

      document.body.appendChild(downloadLink);
      downloadLink.click();
      document.body.removeChild(downloadLink);

      console.log("Download started:", filename);
      alert("Download dimulai! File akan tersimpan di folder Downloads.");
    } else {
      alert(
        "Tidak ada gambar untuk didownload! Silakan upload dan proses gambar terlebih dahulu."
      );
    }
  }

  if (downloadBtn) {
    downloadBtn.addEventListener("click", downloadImage);
  }
});
