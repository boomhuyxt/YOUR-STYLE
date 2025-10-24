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

// --- TINH TI LE CO THE (LOGIC MOI: LOCK TI LE ANH, PHONG TO CHO VUA NGUOI) ---

        // 1. Tính toán kích thước mong muốn (khung thân người + padding)
        const armpitY = (vaiTrai.y + vaiPhai.y) / 2;
        const hipY = (hongTrai.y + hongPhai.y) / 2;
        const torsoWidth = Math.hypot(vaiPhai.x - vaiTrai.x, vaiPhai.y - vaiTrai.y);
        const torsoHeight = hipY - armpitY;

        // Kích thước mong muốn = kích thước thân + 40% rộng và 20% cao (để to hơn)
        // Bạn có thể chỉnh hệ số 1.4 và 1.2 nếu muốn áo to hơn hoặc nhỏ hơn
        const desiredWidth = torsoWidth * 1.8; 
        const desiredHeight = torsoHeight * 1.4;

        // 3. Lấy kích thước gốc của ảnh áo
        const imageWidth = trangPhucDangChon.width;
        const imageHeight = trangPhucDangChon.height;

        // 4. Tính toán tỷ lệ co giãn cần thiết cho chiều rộng và chiều cao
        const ratioWidth = desiredWidth / imageWidth;
        const ratioHeight = desiredHeight / imageHeight;

        // 5. Chọn tỷ lệ LỚN HƠN (Math.max)
        // Điều này đảm bảo áo sẽ LUÔN PHỦ KÍN khung thân người
        // Nó cũng giữ nguyên tỷ lệ gốc của ảnh áo, TRÁNH BỊ MÉO HÌNH
        const tiLe = Math.max(ratioWidth, ratioHeight);

        // 6. Tính kích thước mới dựa trên tỷ lệ đã chọn
        const chieuRongMoi = imageWidth * tiLe;
        const chieuCaoMoi = imageHeight * tiLe;

        // 7. Xác định vị trí vẽ (căn giữa vào thân)
        const armpitX_center = (vaiTrai.x + vaiPhai.x) / 2;
        const drawX = armpitX_center - (chieuRongMoi / 2); // Căn giữa theo chiều ngang
        
        // Dịch áo lên trên để cổ áo vừa vặn hơn
        // Thử dịch lên một khoảng bằng 15% chiều cao MỚI của áo
        // Bạn có thể điều chỉnh hệ số 0.15 này (ví dụ 0.1, 0.2) để cổ áo vừa ý
        const drawY = armpitY - (chieuCaoMoi * 0.27); 

        // 8. Vẽ áo
        ctx.drawImage(
          trangPhucDangChon,
          drawX,
          drawY,
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
