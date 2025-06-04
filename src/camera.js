import { InferenceEngine, CVImage } from "inferencejs";

document.addEventListener("DOMContentLoaded", async function () {
  const video = document.getElementById("camera");
  const overlayCanvas = document.getElementById("overlayCanvas");
  const ctx = overlayCanvas.getContext("2d");

  const PUBLISHABLE_KEY = "rf_pAl5cKMMR1TIrLNWgVKEbuMkLjH2";
  const PROJECT_URL_SLUG = "dataset-6nff1";
  const MODEL_VERSION = 4;

  let inferEngine;
  let workerId;
  let modelReady = false;

  async function setupInferenceEngine() {
    try {
      inferEngine = new InferenceEngine();
      console.log("Starting worker...");
      workerId = await inferEngine.startWorker(
        PROJECT_URL_SLUG,
        MODEL_VERSION,
        PUBLISHABLE_KEY
      );
      console.log("Worker started with ID:", workerId);
      modelReady = true;
    } catch (error) {
      console.error("Error starting inference worker:", error);
      alert("Gagal memulai worker inferensi. Cek konsol.");
    }
  }

  function drawDetections(predictions) {
    ctx.clearRect(0, 0, overlayCanvas.width, overlayCanvas.height);
    ctx.strokeStyle = "lime";
    ctx.lineWidth = 2;
    ctx.font = "16px Arial";
    ctx.fillStyle = "lime";

    predictions.forEach((pred) => {
      if (pred.bbox) {
        const { x, y, width, height } = pred.bbox;
        const rectX = x - width / 2;
        const rectY = y - height / 2;

        ctx.strokeRect(rectX, rectY, width, height);
        let label = `${pred.class} (${Math.round(pred.confidence * 100)}%)`;
        ctx.fillText(label, rectX, rectY > 10 ? rectY - 5 : 10);
      }
    });
  }

  async function detectionLoop() {
    if (
      modelReady &&
      video.readyState >= video.HAVE_ENOUGH_DATA &&
      video.videoWidth > 0
    ) {
      if (
        overlayCanvas.width !== video.videoWidth ||
        overlayCanvas.height !== video.videoHeight
      ) {
        overlayCanvas.width = video.videoWidth;
        overlayCanvas.height = video.videoHeight;
      }

      try {
        const cvImage = new CVImage(video);
        const result = await inferEngine.infer(workerId, cvImage);
        cvImage.dispose();

        if (result) {
          drawDetections(result);
        }
      } catch (error) {
        console.error("Inference error:", error);
      }
    }
    requestAnimationFrame(detectionLoop);
  }

  if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
    navigator.mediaDevices
      .getUserMedia({
        video: {
          width: { ideal: 640 },
          height: { ideal: 480 },
          frameRate: { ideal: 30 },
        },
      })
      .then(async function (stream) {
        video.srcObject = stream;
        await video.play();
        await setupInferenceEngine();
        detectionLoop();
      })
      .catch(function (error) {
        console.error("Camera access denied:", error);
        alert("Akses kamera ditolak.");
      });
  } else {
    alert("Kamera tidak didukung pada browser ini.");
  }
});
