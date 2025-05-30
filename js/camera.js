document.addEventListener("DOMContentLoaded", function () {
  const video = document.getElementById("camera");
  const overlayCanvas = document.getElementById("overlayCanvas");
  let detectionInterval;
  let isDetecting = false;

  // Create status indicator
  const statusDiv = document.createElement("div");
  statusDiv.id = "detection-status";
  statusDiv.style.cssText = `
    position: absolute;
    top: 10px;
    right: 10px;
    background: rgba(0, 0, 0, 0.8);
    color: white;
    padding: 8px 12px;
    border-radius: 5px;
    font-size: 14px;
    font-weight: bold;
    z-index: 1000;
    border: 2px solid #fff;
  `;
  statusDiv.textContent = "🔄 Menginisialisasi kamera...";
  video.parentElement.appendChild(statusDiv);

  // Initialize camera
  if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
    navigator.mediaDevices
      .getUserMedia({
        video: {
          width: { ideal: 640 },
          height: { ideal: 480 },
          facingMode: "environment", // Use back camera if available
        },
      })
      .then(function (stream) {
        video.srcObject = stream;
        statusDiv.textContent = "📹 Kamera siap";
        statusDiv.style.background = "rgba(0, 100, 0, 0.8)";
        video.addEventListener("loadedmetadata", () => {
          // Ensure overlay canvas matches video size exactly
          setTimeout(() => {
            resizeOverlay();
          }, 100);

          // Start detection after short delay
          setTimeout(() => {
            statusDiv.textContent = "🐟 Deteksi ikan aktif";
            statusDiv.style.background = "rgba(0, 150, 255, 0.8)";
            startDetection();
          }, 2000);
        });

        // Additional event listeners for proper sizing
        video.addEventListener("loadeddata", resizeOverlay);
        video.addEventListener("canplay", resizeOverlay);
        video.addEventListener("resize", resizeOverlay);
        window.addEventListener("resize", resizeOverlay);
      })
      .catch(function (error) {
        console.error("Camera access denied:", error);
        statusDiv.textContent = "❌ Akses kamera ditolak";
        statusDiv.style.background = "rgba(255, 0, 0, 0.8)";
        alert(
          "Tidak dapat mengakses kamera. Silakan izinkan akses kamera dan refresh halaman."
        );
      });
  } else {
    alert("Kamera tidak didukung di browser ini.");
    statusDiv.textContent = "❌ Kamera tidak didukung";
    statusDiv.style.background = "rgba(255, 0, 0, 0.8)";
  }
  function resizeOverlay() {
    if (!overlayCanvas || !video) return;

    // Wait for video to be fully loaded
    if (video.videoWidth === 0 || video.videoHeight === 0) {
      setTimeout(resizeOverlay, 100);
      return;
    }

    // Get video element's actual displayed dimensions
    const videoRect = video.getBoundingClientRect();
    const containerRect = video.parentElement.getBoundingClientRect();

    // Set overlay canvas to match video display size exactly
    overlayCanvas.width = video.offsetWidth;
    overlayCanvas.height = video.offsetHeight;
    overlayCanvas.style.width = video.offsetWidth + "px";
    overlayCanvas.style.height = video.offsetHeight + "px";

    // Ensure overlay is positioned correctly
    overlayCanvas.style.position = "absolute";
    overlayCanvas.style.top = "0px";
    overlayCanvas.style.left = "0px";

    console.log("Video dimensions:", video.videoWidth, "x", video.videoHeight);
    console.log(
      "Display dimensions:",
      video.offsetWidth,
      "x",
      video.offsetHeight
    );
    console.log(
      "Overlay dimensions:",
      overlayCanvas.width,
      "x",
      overlayCanvas.height
    );
  }
  function startDetection() {
    if (detectionInterval) clearInterval(detectionInterval);

    detectionInterval = setInterval(() => {
      if (!isDetecting && video.readyState === video.HAVE_ENOUGH_DATA) {
        captureAndDetect();
      }
    }, 2000); // Detect every 2 seconds for better responsiveness
  }

  function captureAndDetect() {
    if (isDetecting) return;

    // Create temporary canvas for capture
    const tempCanvas = document.createElement("canvas");
    const tempCtx = tempCanvas.getContext("2d");

    // Set canvas to video's actual resolution
    tempCanvas.width = video.videoWidth;
    tempCanvas.height = video.videoHeight;

    // Draw current video frame
    tempCtx.drawImage(video, 0, 0, tempCanvas.width, tempCanvas.height);

    // Convert to blob and send for detection
    tempCanvas.toBlob(
      (blob) => {
        if (blob) {
          sendToBackend(blob);
        }
      },
      "image/jpeg",
      0.8
    );
  }
  async function sendToBackend(blob) {
    if (isDetecting) return;
    isDetecting = true;

    const statusDiv = document.getElementById("detection-status");
    statusDiv.textContent = "🔍 Mendeteksi ikan...";
    statusDiv.style.background = "rgba(255, 165, 0, 0.8)";

    const formData = new FormData();
    formData.append("image", blob, "camera_frame.jpg");

    try {
      const response = await fetch("../php/detection.php", {
        method: "POST",
        body: formData,
        headers: {
          // Don't set Content-Type, let browser set it with boundary
        },
      });

      console.log("Response status:", response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error("Server error:", errorText);
        throw new Error(`Server error: ${response.status} - ${errorText}`);
      }

      const result = await response.json();
      console.log("Raw API response:", result);

      if (result.error) {
        throw new Error(result.error);
      }

      // Handle Roboflow response format
      const predictions = result.predictions || [];
      const fishCount = predictions.length;

      console.log("Fish predictions:", predictions);

      if (fishCount > 0) {
        statusDiv.textContent = `🐟 ${fishCount} ikan terdeteksi`;
        statusDiv.style.background = "rgba(0, 255, 0, 0.8)";
      } else {
        statusDiv.textContent = "🔍 Tidak ada ikan terdeteksi";
        statusDiv.style.background = "rgba(100, 100, 100, 0.8)";
      }

      drawDetections(predictions);
    } catch (error) {
      console.error("Detection error:", error);
      statusDiv.textContent = "❌ Error deteksi: " + error.message;
      statusDiv.style.background = "rgba(255, 0, 0, 0.8)";
    } finally {
      isDetecting = false;
    }
  }
  function drawDetections(predictions) {
    if (!overlayCanvas || !predictions) {
      console.log("No overlay canvas or predictions");
      return;
    }

    const ctx = overlayCanvas.getContext("2d");

    // Clear previous detections
    ctx.clearRect(0, 0, overlayCanvas.width, overlayCanvas.height);

    if (predictions.length === 0) {
      console.log("No fish detected");
      return;
    }

    console.log("Drawing", predictions.length, "detections");

    // Get scaling factors between video resolution and display size
    const videoRect = video.getBoundingClientRect();
    const scaleX = videoRect.width / video.videoWidth;
    const scaleY = videoRect.height / video.videoHeight;

    console.log("Scale factors:", scaleX, scaleY);

    // Set drawing styles
    ctx.strokeStyle = "#00FF00";
    ctx.lineWidth = 3;
    ctx.font = "16px Arial";
    ctx.shadowColor = "rgba(0, 0, 0, 0.8)";
    ctx.shadowBlur = 3;

    predictions.forEach((pred, index) => {
      console.log(`Drawing fish ${index + 1}:`, pred);

      // Roboflow returns center coordinates, convert to top-left
      const centerX = pred.x || 0;
      const centerY = pred.y || 0;
      const width = pred.width || 0;
      const height = pred.height || 0;

      // Calculate bounding box coordinates scaled to display size
      const x = (centerX - width / 2) * scaleX;
      const y = (centerY - height / 2) * scaleY;
      const scaledWidth = width * scaleX;
      const scaledHeight = height * scaleY;

      console.log(
        `Scaled coordinates: x=${x}, y=${y}, w=${scaledWidth}, h=${scaledHeight}`
      );

      // Draw bounding box
      ctx.strokeRect(x, y, scaledWidth, scaledHeight);

      // Prepare label text
      const className = pred.class || "Unknown";
      const confidence = Math.round((pred.confidence || 0) * 100);
      const label = `${className} ${confidence}%`;

      // Measure text for background
      const textMetrics = ctx.measureText(label);
      const textWidth = textMetrics.width;
      const textHeight = 20;

      // Draw label background
      ctx.fillStyle = "rgba(0, 255, 0, 0.8)";
      ctx.fillRect(x, y - textHeight - 5, textWidth + 10, textHeight + 5);

      // Draw label text
      ctx.fillStyle = "#000000";
      ctx.fillText(label, x + 5, y - 8);
    });

    console.log("Finished drawing detections");
  }
});
