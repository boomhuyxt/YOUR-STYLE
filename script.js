const video = document.getElementById("video");
const toggleBtn = document.getElementById("toggleCamera");

let stream = null;
let cameraOn = false;

if (toggleBtn) {
  toggleBtn.addEventListener("click", async () => {
    if (!cameraOn) {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: {
            aspectRatio: 9 / 16,   // tỷ lệ chuẩn màn hình điện thoại
            facingMode: "user"
          }
        });
        video.srcObject = stream;
        cameraOn = true;
        toggleBtn.textContent = "TẮT CAMERA";
      } catch (err) {
        alert("Không thể bật camera: " + err.message);
      }
    } else {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
      video.srcObject = null;
      cameraOn = false;
      toggleBtn.textContent = "BẬT CAMERA";
    }
  });
}
