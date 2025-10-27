# Đội hình kéo-thả (HTML/JS/Tailwind) – README

> Công cụ nhỏ gọn để **xây dựng đội hình 6 ô (2×3)** bằng **kéo-thả**, hiển thị **kích hoạt tộc/hệ**, và hỗ trợ **3 ô Pet** (mỗi Pet cộng +1 vào trait của chính nó).
> **Dự án được biên soạn nhằm mục đích học tập/thử nghiệm UI**; dữ liệu minh họa và tên gọi chỉ là ví dụ.

> **Ghi chú nguồn tư liệu**
> Dự án được xây dựng dựa trên **hình ảnh/tư liệu** về game **Bam Bam Squad** – *Touka Technology Limited*.
> Mọi nội dung, hình ảnh, tên gọi liên quan đến Bam Bam Squad thuộc quyền sở hữu của **Touka Technology Limited**. Repo này **không phải** sản phẩm thương mại, **không phân phối** tài nguyên gốc, chỉ minh hoạ UI/logic. Vui lòng tuân thủ điều khoản bản quyền khi sử dụng.

---

## 1) Tính năng chính

* **Bàn cờ 2×3 (6 ô)**, kéo-thả tướng giữa các ô để hoán đổi.
* **3 ô Pet**: mỗi Pet cộng **+1** vào trait của Pet đó (được tính vào kích hoạt).
* **Tự tính tộc/hệ kích hoạt** theo ngưỡng cấu hình (ví dụ 2/4/6).
* **Bộ lọc & tìm kiếm** theo tên/trait.
* **Tách dữ liệu theo tộc/hệ** thành nhiều file JSON; load qua **manifest**.
* **Import/Export đội hình**:

  * Export: `{ board, petSlots }`
  * Import: nạp lại `board`, `petSlots` (không ghi đè danh sách tướng/pet).
* **Không có ghế dự bị**, **không có** tính năng thêm tướng/pet tuỳ chỉnh trong UI (đã gỡ).

---

## 2) Cấu trúc thư mục

```
/project-root
  index.html
  script.js
  traits_manifest.json
  /data
    warrior_data.json
    magic_data.json
    assassin_data.json
    guardian_data.json
    archer_data.json
    support_data.json
    frost_data.json
    dark_data.json
```

* `index.html`: giao diện, stylesheet (Tailwind CDN), fallback manifest.
* `script.js`: toàn bộ logic (kéo-thả, render, synergy, import/export, loader dữ liệu).
* `traits_manifest.json`: liệt kê các file dữ liệu trait cần nạp.
* Thư mục `data/`: mỗi file là **một nhóm trait** (ví dụ: magic/archer/…).

---

## 3) Khởi chạy nhanh (Local)

### Cách 1: Mở qua web server tĩnh (khuyến nghị)

* **Python**:

  ```bash
  cd project-root
  python -m http.server 8000
  # Mở http://localhost:8000/
  ```
* **Node**:

  ```bash
  npm i -g serve
  serve .
  # Hoặc: npx serve .
  ```

### Cách 2: Mở trực tiếp `index.html`

* Một số trình duyệt có thể chặn `fetch()` file cục bộ. Nếu thấy lỗi 404/parse JSON, dùng **Cách 1**.

---

## 4) Cách sử dụng

1. Mở ứng dụng (theo cách trên).
2. Ở **tab “Tướng”**, kéo thả card tướng vào **bàn cờ 2×3**.

   * Chuột phải vào ô để **xoá** tướng.
3. Ở **tab “Pet”**, kéo thả pet vào **3 ô Pet**.

   * Chuột phải vào ô Pet để **xoá** pet.
4. Xem bảng **Tộc/Hệ kích hoạt** ở panel bên phải.
5. **Export** để lưu bố cục (`board`, `petSlots`). **Import** để nạp lại.

---

## 5) Cơ chế dữ liệu & định dạng JSON

### 5.1 Manifest

`traits_manifest.json`:

```json
{
  "files": [
    "data/warrior_data.json",
    "data/magic_data.json",
    "data/assassin_data.json",
    "data/guardian_data.json",
    "data/archer_data.json",
    "data/support_data.json",
    "data/frost_data.json",
    "data/dark_data.json"
  ]
}
```

* App sẽ `fetch()` lần lượt từng file trong `files[]` rồi **merge**:

  * `trait_thresholds`: gộp theo key; file sau **ghi đè** nếu trùng.
  * `champions`: gộp theo `id` (tránh trùng).
  * `pets`: gộp theo `id` (tránh trùng).
* Nếu không tải được `traits_manifest.json`, `index.html` có **fallback** `window.MANIFEST_FILES` (same format).

### 5.2 File dữ liệu trait (ví dụ `data/magic_data.json`)

```json
{
  "trait_thresholds": {
    "Pháp sư": [2, 4, 6]
  },
  "champions": [
    {
      "id": "br1",
      "name": "Bora",
      "traits": ["Pháp sư", "Hỗ trợ"],
      "img": "data:image/svg+xml;...hoặc URL hình..."
    }
  ],
  "pets": [
    {
      "id": "pet1",
      "name": "Pixie",
      "trait": "Pháp sư",
      "img": "data:image/svg+xml;...hoặc URL hình..."
    }
  ]
}
```

* **Champion**

  * `id`: duy nhất.
  * `name`: tên hiển thị.
  * `traits`: mảng trait (1+).
  * `img`: Data URI hoặc URL ảnh (vuông là đẹp).
* **Pet**

  * `id`, `name` tương tự.
  * `trait`: **duy nhất** (mỗi Pet chỉ cộng +1 vào trait này).
  * `img`: Data URI hoặc URL ảnh.

> **Gợi ý**: Nếu muốn đồng bộ với trait/đơn vị của **Bam Bam Squad**, bạn có thể đặt mỗi trait đúng tên & ngưỡng theo tài liệu, tách file tương ứng, rồi thêm vào `traits_manifest.json`.

---

## 6) Import/Export bố cục

* **Export** (tạo file JSON):

  ```json
  {
    "board": [  // ma trận 2×3 id champion hoặc null
      ["as1", null, "br1"],
      [null, "el1", "ga1"]
    ],
    "petSlots": ["pet1", null, "pet2"]
  }
  ```
* **Import**:

  * Chỉ nạp **`board`** và **`petSlots`**.
  * Danh sách tướng/pet được nạp từ manifest, **không** ghi đè.

---

## 7) T tuỳ biến & mở rộng

* **Đổi kích thước bàn cờ**: Sửa `state.rows`, `state.cols` trong `script.js` (mặc định `2×3`).
* **Cập nhật ngưỡng trait**: Sửa trong các file `data/*_data.json` (field `trait_thresholds`).
* **Thêm trait mới**:

  1. Tạo file mới trong `data/` theo cấu trúc ở **5.2**.
  2. Bổ sung đường dẫn vào `traits_manifest.json`.
* **Đổi ngôn ngữ**: bạn có thể đặt trait hiển thị tiếng Việt/Anh tuỳ ý trong file data.
* **Giao diện**: Tailwind qua CDN, có thể chỉnh class trong `index.html`.

---

## 8) Yêu cầu môi trường

* Trình duyệt hiện đại (Chrome/Edge/Firefox/Safari phiên bản gần đây).
* **Không cần build**; dùng CDN Tailwind.
* Khuyến nghị chạy qua **server tĩnh** để tránh vấn đề CORS/file scheme.

---

## 9) Khắc phục sự cố

* **404 `traits_manifest.json`**:
  Đảm bảo file nằm cùng cấp `index.html`. Nếu mở trực tiếp bằng trình duyệt, dùng server tĩnh. App có **fallback** `window.MANIFEST_FILES` trong `index.html`.
* **`Unexpected token '<'` khi parse JSON**:
  Thường do fetch trả về **HTML (404)** thay vì JSON. Kiểm tra **đường dẫn** trong `traits_manifest.json` và **tên file** trong `data/`.
* **Không thấy ảnh**:
  Kiểm tra `img` là **Data URI** hợp lệ hoặc **URL có thể truy cập** (CORS).
* **Không hiển thị synergy đúng**:
  Kiểm tra lại `trait_thresholds` và số lượng tướng/pet trên bàn.

---

## 10) Lộ trình (Roadmap) đề xuất

* Tuỳ chọn **layout** (1×6, 3×2) chuyển nhanh trên UI.
* Tooltip nâng cao (mô tả trait chi tiết, cấp kích hoạt hiện tại).
* Lọc nâng cao (kết hợp nhiều trait, loại trừ…).
* Snapshot đội hình (PNG export).
* I18n (tệp ngôn ngữ riêng).

---

## 11) Giấy phép & ghi nhận

* **Mã nguồn (UI/logic) trong dự án này**: bạn có thể sử dụng cho mục đích học tập/nghiên cứu.
* **Tài nguyên/thương hiệu của Bam Bam Squad**: thuộc **Touka Technology Limited**.

  * Nếu bạn tích hợp hình ảnh/logo/chất liệu chính thức, hãy đảm bảo **có quyền sử dụng** và tuân thủ **điều khoản bản quyền** tương ứng.
* Nếu bạn là đại diện Touka Technology Limited và muốn mình điều chỉnh/loại bỏ nội dung, xin hãy cho biết — mình sẽ cập nhật ngay.

---

## 12) Đóng góp

* Tạo pull request/issue với:

  * Bản ghi lỗi (trình duyệt, OS, bước tái hiện).
  * JSON mẫu (nếu lỗi liên quan dữ liệu).
  * Ảnh chụp minh hoạ.

---

## 13) Liên hệ

* Nếu bạn muốn mình **điền dữ liệu trait/tướng/pet đúng theo Bam Bam Squad** (tên chuẩn, ngưỡng kích hoạt, icon…), hãy gửi danh sách/tư liệu được phép sử dụng — mình sẽ cấu hình sẵn các tệp trong `data/` và manifest cho bạn.
