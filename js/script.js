document.addEventListener("DOMContentLoaded", function () {
  const imageInput = document.getElementById("imageUpload");
  const uploadedImage = document.getElementById("uploadedImage");

  imageInput.addEventListener("change", function () {
    const file = this.files[0];
    if (file && file.type.startsWith("image/")) {
      const reader = new FileReader();
      reader.onload = function (e) {
        uploadedImage.src = e.target.result;
        uploadedImage.style.display = "block";

        // Tunggu gambar dimuat lalu kirim ke backend
        uploadedImage.onload = () => {
          sendToBackend(file);
        };
      };
      reader.readAsDataURL(file);
    } else {
      uploadedImage.style.display = "none";
    }
  });

  function sendToBackend(file) {
    const formData = new FormData();
    formData.append("image", file);

    fetch("../php/detect.php", {
      method: "POST",
      body: formData,
    })
      .then((res) => res.json())
      .then((data) => {
        console.log("Hasil deteksi:", data);
        drawDetections(data.predictions);
      })
      .catch((err) => {
        console.error("Gagal mengirim ke backend:", err);
      });
  }

  function drawDetections(predictions) {
    // Buat canvas overlay di atas uploaded image
    let overlay = document.getElementById("overlay");
    if (!overlay) {
      overlay = document.createElement("canvas");
      overlay.id = "overlay";
      overlay.style.position = "absolute";
      overlay.style.top = uploadedImage.offsetTop + "px";
      overlay.style.left = uploadedImage.offsetLeft + "px";
      overlay.style.pointerEvents = "none";
      uploadedImage.parentElement.appendChild(overlay);
    }

    overlay.width = uploadedImage.width;
    overlay.height = uploadedImage.height;

    const ctx = overlay.getContext("2d");
    ctx.clearRect(0, 0, overlay.width, overlay.height);
    ctx.strokeStyle = "red";
    ctx.lineWidth = 2;
    ctx.font = "16px Arial";
    ctx.fillStyle = "red";

    predictions.forEach((pred) => {
      const x = pred.x - pred.width / 2;
      const y = pred.y - pred.height / 2;
      ctx.strokeRect(x, y, pred.width, pred.height);
      ctx.fillText(
        `${pred.class} (${Math.round(pred.confidence * 100)}%)`,
        x,
        y - 5
      );
    });
  }
});
