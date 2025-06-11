import { InferenceEngine, CVImage } from "inferencejs";

const originalWarn = console.warn;
console.warn = function (...args) {
  if (
    args[0] &&
    typeof args[0] === "string" &&
    (args[0].includes("already registered") ||
      args[0].includes("Overwriting the platform"))
  ) {
    return;
  }
  originalWarn.apply(console, args);
};

document.addEventListener("DOMContentLoaded", async function () {
  const video = document.getElementById("camera");
  const overlayCanvas = document.getElementById("overlayCanvas");
  const ctx = overlayCanvas.getContext("2d");
  const stopCameraBtn = document.getElementById("stopCameraBtn");
  const startCameraBtn = document.getElementById("startCameraBtn");
  const screenshotBtn = document.getElementById("screenshotBtn");
  const cameraPlaceholder = document.getElementById("cameraPlaceholder");
  const loadingIndicator = document.getElementById("loadingIndicator");

  if (
    !video ||
    !overlayCanvas ||
    !stopCameraBtn ||
    !startCameraBtn ||
    !screenshotBtn ||
    !cameraPlaceholder ||
    !loadingIndicator
  ) {
    console.error("Some required DOM elements are missing!");
    return;
  }

  const PUBLISHABLE_KEY = "rf_pAl5cKMMR1TIrLNWgVKEbuMkLjH2";
  const PROJECT_URL_SLUG = "dataset-6nff1";
  const MODEL_VERSION = 4;
  let inferEngine;
  let workerId;
  let modelReady = false;
  let currentStream = null;
  let detectionRunning = false;
  let cameraActive = false;
  let animationId = null;

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
    if (!detectionRunning || !cameraActive || !currentStream) {
      if (animationId) {
        cancelAnimationFrame(animationId);
        animationId = null;
      }
      return;
    }

    try {
      if (
        modelReady &&
        video.readyState >= video.HAVE_ENOUGH_DATA &&
        video.videoWidth > 0 &&
        video.videoHeight > 0
      ) {
        if (
          overlayCanvas.width !== video.videoWidth ||
          overlayCanvas.height !== video.videoHeight
        ) {
          overlayCanvas.width = video.videoWidth;
          overlayCanvas.height = video.videoHeight;
        }

        const cvImage = new CVImage(video);
        const result = await inferEngine.infer(workerId, cvImage);
        cvImage.dispose();

        if (result && detectionRunning && cameraActive) {
          drawDetections(result);
        }
      }
    } catch (error) {
      console.error("Detection loop error:", error);
    }
    if (detectionRunning && cameraActive && currentStream) {
      animationId = requestAnimationFrame(detectionLoop);
    }
  }
  async function startCamera() {
    if (cameraActive) {
      console.log("Camera is already active");
      return;
    }

    if (startCameraBtn) {
      startCameraBtn.innerHTML = "Starting Camera...";
      startCameraBtn.disabled = true;
    }

    if (loadingIndicator) {
      loadingIndicator.style.display = "block";
    }

    try {
      console.log("=== STARTING CAMERA ===");

      if (currentStream) {
        currentStream.getTracks().forEach((track) => track.stop());
        currentStream = null;
      }
      console.log("Requesting camera access...");
      currentStream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 480, max: 640 },
          height: { ideal: 360, max: 480 },
          frameRate: { ideal: 15, max: 30 },
          facingMode: "environment",
        },
      });
      video.srcObject = currentStream;

      await new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error("Video loading timeout"));
        }, 10000);

        video.addEventListener(
          "loadedmetadata",
          () => {
            console.log(
              "Video metadata loaded. Dimensions:",
              video.videoWidth,
              "x",
              video.videoHeight
            );
            clearTimeout(timeout);
            resolve();
          },
          { once: true }
        );

        video.addEventListener(
          "error",
          (e) => {
            console.error("Video error during setup:", e);
            clearTimeout(timeout);
            reject(e);
          },
          { once: true }
        );
      });

      await video.play();
      console.log("Video is now playing");

      cameraActive = true;
      console.log("Camera state set to ACTIVE");

      if (loadingIndicator) {
        loadingIndicator.style.display = "none";
      }

      updateButtonStates();

      if (!modelReady) {
        console.log("Loading AI model in background...");
        setupInferenceEngine()
          .then(() => {
            console.log("AI model ready, starting detection...");
            detectionRunning = true;
            detectionLoop();
          })
          .catch((error) => {
            console.error("AI model loading failed:", error);
          });
      } else {
        detectionRunning = true;
        detectionLoop();
      }

      console.log("=== CAMERA STARTED SUCCESSFULLY ===");
    } catch (error) {
      console.error("Camera access denied:", error);

      if (loadingIndicator) {
        loadingIndicator.style.display = "none";
      }

      alert(
        "Akses kamera ditolak atau tidak tersedia. Pastikan:\n1. Browser mendapat izin akses kamera\n2. Kamera tidak digunakan aplikasi lain\n3. Gunakan HTTPS atau localhost"
      );

      cameraActive = false;
      detectionRunning = false;

      if (currentStream) {
        currentStream.getTracks().forEach((track) => track.stop());
        currentStream = null;
      }

      console.log("Updating button states after camera error...");
      updateButtonStates();
    }
  }
  function stopCamera() {
    if (!cameraActive) {
      console.log("Camera is already stopped");
      return;
    }

    console.log("=== STOPPING CAMERA ===");

    cameraActive = false;
    detectionRunning = false;
    console.log("Camera state set to INACTIVE");

    if (animationId) {
      cancelAnimationFrame(animationId);
      animationId = null;
    }

    if (currentStream) {
      currentStream.getTracks().forEach((track) => {
        track.stop();
        console.log("Track stopped:", track.kind);
      });
      currentStream = null;
    }
    video.srcObject = null;
    video.load();
    ctx.clearRect(0, 0, overlayCanvas.width, overlayCanvas.height);

    console.log("Updating button states after camera stop...");
    updateButtonStates();

    console.log("=== CAMERA STOPPED SUCCESSFULLY ===");
  }
  function updateButtonStates() {
    console.log("Updating button states:", {
      cameraActive,
      currentStream: !!currentStream,
      stopBtnExists: !!stopCameraBtn,
      startBtnExists: !!startCameraBtn,
      screenshotBtnExists: !!screenshotBtn,
    });

    if (cameraActive && currentStream) {
      if (cameraPlaceholder) {
        cameraPlaceholder.style.display = "none";
        console.log("Placeholder hidden");
      }
      if (video) {
        video.style.display = "block";
        console.log("Video shown");
      }
      if (overlayCanvas) {
        overlayCanvas.style.display = "block";
        console.log("Overlay canvas shown");
      }
    } else {
      if (cameraPlaceholder) {
        cameraPlaceholder.style.display = "flex";
        console.log("Placeholder shown");
      }
      if (video) {
        video.style.display = "none";
        console.log("Video hidden");
      }
      if (overlayCanvas) {
        overlayCanvas.style.display = "none";
        console.log("Overlay canvas hidden");
      }
    }

    if (stopCameraBtn) {
      if (cameraActive) {
        stopCameraBtn.style.display = "inline-block";
        stopCameraBtn.disabled = false;
        console.log("Stop button: VISIBLE and ENABLED");
      } else {
        stopCameraBtn.style.display = "none";
        stopCameraBtn.disabled = true;
        console.log("Stop button: HIDDEN and DISABLED");
      }
    } else {
      console.log("Stop button element not found!");
    }

    if (startCameraBtn) {
      if (!cameraActive) {
        startCameraBtn.style.display = "inline-block";
        startCameraBtn.disabled = false;
        startCameraBtn.innerHTML = "Start Camera";
        console.log("Start button: VISIBLE and ENABLED");
      } else {
        startCameraBtn.style.display = "none";
        startCameraBtn.disabled = true;
        console.log("Start button: HIDDEN and DISABLED");
      }
    } else {
      console.log("Start button element not found!");
    }

    if (screenshotBtn) {
      const shouldEnable = cameraActive && currentStream;
      screenshotBtn.disabled = !shouldEnable;
      console.log("Screenshot button disabled:", !shouldEnable);
    } else {
      console.log("Screenshot button element not found!");
    }

    console.log("=== FINAL BUTTON STATES ===");
    console.log("Camera active:", cameraActive);
    console.log("Stop button visible:", cameraActive ? "YES" : "NO");
    console.log("Start button visible:", !cameraActive ? "YES" : "NO");
    console.log("Placeholder visible:", !cameraActive ? "YES" : "NO");
    console.log("Video visible:", cameraActive ? "YES" : "NO");
    console.log("========================");
  }
  function takeScreenshot() {
    if (
      !cameraActive ||
      !currentStream ||
      !video.videoWidth ||
      !video.videoHeight
    ) {
      alert("Kamera tidak aktif atau tidak ada video stream!");
      return;
    }

    const screenshotCanvas = document.createElement("canvas");
    const screenshotCtx = screenshotCanvas.getContext("2d");

    screenshotCanvas.width = video.videoWidth;
    screenshotCanvas.height = video.videoHeight;

    screenshotCtx.drawImage(
      video,
      0,
      0,
      screenshotCanvas.width,
      screenshotCanvas.height
    );

    if (overlayCanvas.width > 0 && overlayCanvas.height > 0) {
      screenshotCtx.drawImage(
        overlayCanvas,
        0,
        0,
        screenshotCanvas.width,
        screenshotCanvas.height
      );
    }

    const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, "-");
    const filename = `fish-detection-screenshot-${timestamp}.png`;

    screenshotCanvas.toBlob(function (blob) {
      if (blob) {
        const url = URL.createObjectURL(blob);
        const downloadLink = document.createElement("a");
        downloadLink.href = url;
        downloadLink.download = filename;

        document.body.appendChild(downloadLink);
        downloadLink.click();
        document.body.removeChild(downloadLink);

        URL.revokeObjectURL(url);

        console.log("Screenshot saved:", filename);
        alert("Screenshot berhasil disimpan!");
      } else {
        console.error("Failed to create blob");
        alert("Gagal membuat screenshot!");
      }
    }, "image/png");
  }
  if (stopCameraBtn) {
    stopCameraBtn.addEventListener("click", function (e) {
      e.preventDefault();
      e.stopPropagation();
      console.log("Stop camera button clicked");
      stopCamera();
    });
  }

  if (startCameraBtn) {
    startCameraBtn.addEventListener("click", function (e) {
      e.preventDefault();
      e.stopPropagation();
      console.log("Start camera button clicked");
      startCamera();
    });
  }

  if (screenshotBtn) {
    screenshotBtn.addEventListener("click", function (e) {
      e.preventDefault();
      e.stopPropagation();
      console.log("Screenshot button clicked");
      takeScreenshot();
    });
  }
  document.addEventListener("visibilitychange", function () {
    if (document.hidden && cameraActive) {
      console.log("Page hidden, maintaining camera state");
    } else if (!document.hidden && cameraActive) {
      console.log("Page visible, camera still active");
    }
  });

  window.addEventListener("beforeunload", function () {
    if (cameraActive) {
      stopCamera();
    }
  });
  if (video) {
    video.addEventListener("error", function (e) {
      console.error("Video error:", e);
      if (cameraActive) {
        console.log("Video error detected, stopping camera");
        stopCamera();
      }
    });

    video.addEventListener("ended", function () {
      console.log("Video ended");
      if (cameraActive) {
        console.log("Video ended, stopping camera");
        stopCamera();
      }
    });
    video.addEventListener("loadedmetadata", function () {
      console.log("Video metadata loaded");
      updateButtonStates();
    });

    video.addEventListener("canplay", function () {
      console.log("Video can play");
      updateButtonStates();
    });
  }
  console.log("=== INITIALIZING APPLICATION ===");
  cameraActive = false;
  detectionRunning = false;
  console.log("Initial camera state: INACTIVE (Default: Camera OFF)");
  updateButtonStates();

  console.log("Preloading AI model in background...");
  setupInferenceEngine().catch((error) => {
    console.warn("Failed to preload AI model:", error);
  });

  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    alert("Kamera tidak didukung pada browser ini.");
    cameraActive = false;
    updateButtonStates();
  } else {
    console.log("Camera ready to start when user clicks Start Camera button");
  }
});
