//camera handling script
document.addEventListener("DOMContentLoaded", function () {
  const video = document.getElementById("camera");

  if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
    navigator.mediaDevices
      .getUserMedia({ video: true })
      .then(function (stream) {
        video.srcObject = stream;
      })
      .catch(function (error) {
        console.error("Camera access denied:", error);
      });
  } else {
    alert("Camera not supported on this browser.");
  }
});
