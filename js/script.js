document.addEventListener("DOMContentLoaded", function () {
  const imageInput = document.getElementById("imageUpload");
  const uploadedImage = document.getElementById("uploadedImage");
  let overlay = null;

  // Create loading indicator
  const loadingDiv = document.createElement("div");
  loadingDiv.id = "loading-indicator";
  loadingDiv.style.cssText = `
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    background: rgba(0, 0, 0, 0.8);
    color: white;
    padding: 20px;
    border-radius: 10px;
    display: none;
    z-index: 100;
  `;
  loadingDiv.innerHTML = `
    <div style="text-align: center;">
      <div style="border: 4px solid #f3f3f3; border-top: 4px solid #3498db; border-radius: 50%; width: 30px; height: 30px; animation: spin 1s linear infinite; margin: 0 auto 10px;"></div>
      <div>Detecting fish...</div>
    </div>
    <style>
      @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
      }
    </style>
  `;
  document.body.appendChild(loadingDiv);

  // Create results display
  const resultsDiv = document.createElement("div");
  resultsDiv.id = "detection-results";
  resultsDiv.style.cssText = `
    margin-top: 20px;
    padding: 15px;
    background: #f8f9fa;
    border-radius: 8px;
    border-left: 4px solid #007bff;
    display: none;
  `;
  document.querySelector(".detection-container").appendChild(resultsDiv);
  imageInput.addEventListener("change", function () {
    const file = this.files[0];
    if (file && file.type.startsWith("image/")) {
      // Validate file size (max 10MB)
      if (file.size > 10 * 1024 * 1024) {
        alert("File size too large. Please select an image smaller than 10MB.");
        return;
      }

      const reader = new FileReader();
      reader.onload = function (e) {
        uploadedImage.src = e.target.result;
        uploadedImage.style.display = "block";

        // Clear previous results
        if (overlay) {
          overlay.remove();
          overlay = null;
        }
        document.getElementById("detection-results").style.display = "none";

        uploadedImage.onload = () => {
          // Create overlay canvas
          createOverlay();
          // Start detection
          sendToBackend(file);
        };
      };
      reader.readAsDataURL(file);
    } else {
      uploadedImage.style.display = "none";
      if (overlay) {
        overlay.remove();
        overlay = null;
      }
      document.getElementById("detection-results").style.display = "none";
      if (file) {
        alert("Please select a valid image file.");
      }
    }
  });
  function createOverlay() {
    if (overlay) overlay.remove();

    overlay = document.createElement("canvas");
    overlay.id = "overlay";
    overlay.style.cssText = `
      position: absolute;
      top: 0;
      left: 0;
      pointer-events: none;
      z-index: 10;
    `;

    // Set canvas size to match image display size
    overlay.width = uploadedImage.offsetWidth;
    overlay.height = uploadedImage.offsetHeight;

    uploadedImage.parentElement.style.position = "relative";
    uploadedImage.parentElement.appendChild(overlay);
  }

  function sendToBackend(file) {
    loadingDiv.style.display = "block";

    const formData = new FormData();
    formData.append("image", file);

    fetch("../php/detection.php", {
      method: "POST",
      body: formData,
    })
      .then((response) => {
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        return response.json();
      })
      .then((data) => {
        loadingDiv.style.display = "none";

        if (data.error) {
          throw new Error(data.error);
        }

        console.log("Fish detection result:", data);

        const predictions = data.predictions || [];
        drawDetections(predictions);
        displayResults(predictions);
      })
      .catch((error) => {
        loadingDiv.style.display = "none";
        console.error("Fish detection failed:", error);

        const resultsDiv = document.getElementById("detection-results");
        resultsDiv.innerHTML = `
          <h4 style="color: #dc3545; margin-bottom: 10px;">Detection Failed</h4>
          <p style="color: #6c757d;">Error: ${error.message}</p>
        `;
        resultsDiv.style.display = "block";
      });
  }
  function drawDetections(predictions) {
    if (!overlay || !predictions) return;

    const ctx = overlay.getContext("2d");
    ctx.clearRect(0, 0, overlay.width, overlay.height);

    if (predictions.length === 0) return;

    // Calculate scale factors between original image and displayed image
    const scaleX = overlay.width / uploadedImage.naturalWidth;
    const scaleY = overlay.height / uploadedImage.naturalHeight;

    ctx.strokeStyle = "#ff0000";
    ctx.lineWidth = 3;
    ctx.font = "14px Arial";
    ctx.fillStyle = "#ff0000";
    ctx.shadowColor = "rgba(0, 0, 0, 0.5)";
    ctx.shadowBlur = 2;

    predictions.forEach((pred, index) => {
      // Scale coordinates to match displayed image size
      const x = (pred.x - pred.width / 2) * scaleX;
      const y = (pred.y - pred.height / 2) * scaleY;
      const width = pred.width * scaleX;
      const height = pred.height * scaleY;

      // Draw bounding box
      ctx.strokeRect(x, y, width, height);

      // Draw label with background
      const label = `${pred.class} (${Math.round(pred.confidence * 100)}%)`;
      const labelMetrics = ctx.measureText(label);
      const labelHeight = 20;

      // Label background
      ctx.fillStyle = "rgba(255, 0, 0, 0.8)";
      ctx.fillRect(x, y - labelHeight, labelMetrics.width + 10, labelHeight);

      // Label text
      ctx.fillStyle = "#ffffff";
      ctx.fillText(label, x + 5, y - 5);

      // Reset for next iteration
      ctx.fillStyle = "#ff0000";
    });
  }

  function displayResults(predictions) {
    const resultsDiv = document.getElementById("detection-results");

    if (predictions.length === 0) {
      resultsDiv.innerHTML = `
        <h4 style="color: #ffc107; margin-bottom: 10px;">No Fish Detected</h4>
        <p style="color: #6c757d;">No fish were found in this image. Try uploading a different image with fish.</p>
      `;
    } else {
      // Group predictions by class
      const fishCounts = {};
      predictions.forEach((pred) => {
        fishCounts[pred.class] = (fishCounts[pred.class] || 0) + 1;
      });

      let resultsHTML = `
        <h4 style="color: #28a745; margin-bottom: 15px;">
          🐟 Detection Results (${predictions.length} fish found)
        </h4>
      `;

      // Display fish counts by type
      Object.entries(fishCounts).forEach(([fishType, count]) => {
        resultsHTML += `
          <div style="margin-bottom: 8px; padding: 8px; background: white; border-radius: 4px; border-left: 3px solid #28a745;">
            <strong>${fishType}:</strong> ${count} fish detected
          </div>
        `;
      });

      // Display individual detections with confidence
      resultsHTML += `
        <div style="margin-top: 15px;">
          <h5 style="margin-bottom: 10px; color: #495057;">Detailed Detection:</h5>
      `;

      predictions.forEach((pred, index) => {
        const confidence = Math.round(pred.confidence * 100);
        resultsHTML += `
          <div style="margin-bottom: 5px; font-size: 14px; color: #6c757d;">
            ${index + 1}. ${pred.class} - ${confidence}% confidence
          </div>
        `;
      });

      resultsHTML += `</div>`;
      resultsDiv.innerHTML = resultsHTML;
    }

    resultsDiv.style.display = "block";
  }
});
