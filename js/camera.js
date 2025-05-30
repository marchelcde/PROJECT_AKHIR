document.addEventListener("DOMContentLoaded", function () {
  const video = document.getElementById("camera");
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");

  // Mulai kamera
  if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
    navigator.mediaDevices
      .getUserMedia({ video: true })
      .then(function (stream) {
        video.srcObject = stream;

        // Mulai interval pengambilan gambar setelah video aktif
        video.addEventListener("loadeddata", () => {
          setInterval(() => {
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

            canvas.toBlob((blob) => {
              if (blob) {
                sendToBackend(blob);
              }
            }, "image/jpeg");
          }, 5000); // Ambil gambar setiap 5 detik
        });
      })
      .catch(function (error) {
        console.error("Camera access denied:", error);
      });
  } else {
    alert("Camera not supported on this browser.");
  }

  async function sendToBackend(blob) {
    const formData = new FormData();
    formData.append("image", blob, "frame.jpg");

    try {
      const response = await fetch("../php/detect.php", {
        method: "POST",
        body: formData,
      });

      const result = await response.json();
      console.log("Deteksi:", result);

      drawDetections(result.predictions);
    } catch (error) {
      console.error("Error sending image to server:", error);
    }
  }

  function drawDetections(predictions) {
    let overlay = document.getElementById("overlay");

    if (!overlay) {
      overlay = document.createElement("canvas");
      overlay.id = "overlay";
      overlay.style.position = "absolute";
      overlay.style.top = video.offsetTop + "px";
      overlay.style.left = video.offsetLeft + "px";
      overlay.style.pointerEvents = "none";
      overlay.width = video.videoWidth;
      overlay.height = video.videoHeight;
      video.parentElement.appendChild(overlay);
    }

    const ctxOverlay = overlay.getContext("2d");
    ctxOverlay.clearRect(0, 0, overlay.width, overlay.height);
    ctxOverlay.strokeStyle = "lime";
    ctxOverlay.lineWidth = 2;
    ctxOverlay.font = "16px Arial";
    ctxOverlay.fillStyle = "lime";

    predictions.forEach((pred) => {
      const x = pred.x - pred.width / 2;
      const y = pred.y - pred.height / 2;
      ctxOverlay.strokeRect(x, y, pred.width, pred.height);
      ctxOverlay.fillText(
        pred.class + " (" + Math.round(pred.confidence * 100) + "%)",
        x,
        y - 5
      );
    });
  }
});
