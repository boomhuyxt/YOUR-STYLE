const video = document.getElementById("video");
const nutChuyenCamera = document.getElementById("toggleCamera");
const nutTrangPhuc = document.querySelectorAll(".outfit-btn");
const thuVienTrangPhuc = document.getElementById("outfit-gallery");

let luongVideo = null;
let cameraBat = false;
let moHinh = null;
let trangPhucDangChon = null; // ao dang chon
let gioiTinhHienTai = "nam"; // mac dinh la Nam

// ------------------- CANVAS ------------------- //
const canvas = document.getElementById("poseCanvas");
const ctx = canvas.getContext("2d");

// Resize canvas theo video
video.addEventListener("loadedmetadata", () => {
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;
});

// ------------------- KHUNG XUONG ------------------- //
const khungXuong = [
  [0, 1], [1, 3], [0, 2], [2, 4],
  [5, 7], [7, 9], [6, 8], [8, 10],
  [5, 6], [5, 11], [6, 12],
  [11, 12], [11, 13], [13, 15], [12, 14], [14, 16]
];

// ------------------- TAI MO HINH ------------------- //
async function taiMoHinh() {
  const cauHinh = {
    modelType: poseDetection.movenet.modelType.SINGLEPOSE_LIGHTNING
  };
  moHinh = await poseDetection.createDetector(
    poseDetection.SupportedModels.MoveNet,
    cauHinh
  );
  console.log("Mo hinh MoveNet da tai xong");
}

// ------------------- PHAT HIEN TU THE ------------------- //
async function phatHienTuThe() {
  if (moHinh && cameraBat) {
    const tuThe = await moHinh.estimatePoses(video);

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (tuThe.length > 0) {
      const diemChinh = tuThe[0].keypoints.map(kp => ({
        ...kp,
        x: canvas.width - kp.x
      }));

      // Ve diem
      diemChinh.forEach(diem => {
        if (diem.score > 0.4) {
          ctx.beginPath();
          ctx.arc(diem.x, diem.y, 5, 0, 2 * Math.PI);
          ctx.fillStyle = "red";
          ctx.fill();
        }
      });

      // Ve khung xuong
      ctx.strokeStyle = "lime";
      ctx.lineWidth = 2;
      khungXuong.forEach(([a, b]) => {
        if (diemChinh[a].score > 0.4 && diemChinh[b].score > 0.4) {
          ctx.beginPath();
          ctx.moveTo(diemChinh[a].x, diemChinh[a].y);
          ctx.lineTo(diemChinh[b].x, diemChinh[b].y);
          ctx.stroke();
        }
      });

      // ------------------- VE AO ------------------- //
      if (
        trangPhucDangChon &&
        diemChinh[5].score > 0.4 && diemChinh[6].score > 0.4 &&
        diemChinh[11].score > 0.4 && diemChinh[12].score > 0.4
      ) {
        const vaiTrai = diemChinh[5];
        const vaiPhai = diemChinh[6];
        const hongTrai = diemChinh[11];
        const hongPhai = diemChinh[12];

        // --- TINH SIZE ---
        const { size } = tinhSize(vaiTrai, vaiPhai, hongTrai, hongPhai);

        // Ve nen + chu size
        ctx.fillStyle = "rgba(0,0,0,0.7)";
        ctx.fillRect(15, 10, 280, 80);
        ctx.fillStyle = "rgba(255, 0, 0, 1)";
        ctx.font = "62px Arial";
        ctx.fillText(`Size: ${size}`, 20, 70);

        // --- TINH TI LE CO THE ---
        const rongVai = Math.hypot(
          vaiPhai.x - vaiTrai.x,
          vaiPhai.y - vaiTrai.y
        );
        const rongHong = Math.hypot(
          hongPhai.x - hongTrai.x,
          hongPhai.y - hongTrai.y
        );
        const daiThan = ((hongTrai.y + hongPhai.y) / 2) - ((vaiTrai.y + vaiPhai.y) / 2);

        const tiLeX = Math.max(rongVai, rongHong) / trangPhucDangChon.width;
        const tiLeY = daiThan / trangPhucDangChon.height;
        const tiLe = Math.min(tiLeX, tiLeY);

        const tamX = (vaiTrai.x + vaiPhai.x) / 2;
        const tamY = (vaiTrai.y + vaiPhai.y) / 2;

        const chieuRongMoi = trangPhucDangChon.width * tiLe;
        const chieuCaoMoi = trangPhucDangChon.height * tiLe;

        ctx.drawImage(
          trangPhucDangChon,
          tamX - chieuRongMoi / 2,
          tamY,
          chieuRongMoi,
          chieuCaoMoi
        );
      }
    }
  }
  if (cameraBat) requestAnimationFrame(phatHienTuThe);
}

// ------------------- HAM TINH SIZE ------------------- //
function tinhSize(vaiTrai, vaiPhai, hongTrai, hongPhai) {
  const khoangCachVai = Math.hypot(
    vaiTrai.x - vaiPhai.x,
    vaiTrai.y - vaiPhai.y
  );

  let size = "M"; // mac dinh

  if (khoangCachVai < 120) size = "XS";
  else if (khoangCachVai >= 120 && khoangCachVai < 150) size = "S";
  else if (khoangCachVai >= 150 && khoangCachVai < 200) size = "M";
  else if (khoangCachVai >= 200 && khoangCachVai < 250) size = "L";
  else if (khoangCachVai >= 250 && khoangCachVai < 300) size = "XL";
  else if (khoangCachVai >= 300) size = "XXL";

  return { size };
}

// ------------------- CAMERA ------------------- //
if (nutChuyenCamera) {
  nutChuyenCamera.addEventListener("click", async () => {
    if (!cameraBat) {
      try {
        luongVideo = await navigator.mediaDevices.getUserMedia({
          video: { aspectRatio: 16 / 9, facingMode: "user" }
        });
        video.srcObject = luongVideo;
        cameraBat = true;
        nutChuyenCamera.textContent = "TAT CAMERA";

        if (!moHinh) await taiMoHinh();
        phatHienTuThe();
      } catch (err) {
        alert("Khong the bat camera: " + err.message);
      }
    } else {
      if (luongVideo) luongVideo.getTracks().forEach(track => track.stop());
      video.srcObject = null;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      cameraBat = false;
      nutChuyenCamera.textContent = "BAT CAMERA";
    }
  });
}

// hien thi trang phuc theo loai va gioi tinh
function hienThiTrangPhuc(loai) {
  const anhTrangPhuc = danhSachTrangPhuc[gioiTinhHienTai][loai] || [];
  thuVienTrangPhuc.innerHTML = "";
  anhTrangPhuc.forEach(src => {
    const img = document.createElement("img");
    img.src = src;
    img.addEventListener("click", () => {
      const imgMoi = new Image();
      imgMoi.src = src;
      imgMoi.onload = () => {
        trangPhucDangChon = imgMoi;
      };
    });
    thuVienTrangPhuc.appendChild(img);
  });
  thuVienTrangPhuc.style.display = "grid";
}

nutTrangPhuc.forEach(btn => {
  btn.addEventListener("click", () => {
    const loai = btn.getAttribute("data-type");
    hienThiTrangPhuc(loai);
  });
});

// ------------------- NUT NAM / NU ------------------- //
document.getElementById("btnMale").addEventListener("click", () => {
  gioiTinhHienTai = "nam";
  thuVienTrangPhuc.innerHTML = "<p>Da chon gioi tinh: Nam</p>";
});
document.getElementById("btnFemale").addEventListener("click", () => {
  gioiTinhHienTai = "nu";
  thuVienTrangPhuc.innerHTML = "<p>Da chon gioi tinh: Nu</p>";
});
