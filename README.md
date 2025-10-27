Dưới đây là bản README đã **bổ sung link xem dự án (Live Demo)**:
**[https://dangkhoa2004.github.io/BamBamSquad/](https://dangkhoa2004.github.io/BamBamSquad/)**

---

# Đội hình kéo-thả (HTML/JS/Tailwind) – README mở rộng

> Công cụ **kéo-thả** để xây dựng **đội hình 6 ô (2×3)**, hiển thị **kích hoạt tộc/hệ**, kèm **3 ô Pet** (mỗi Pet cộng **+1** vào trait của chính nó).
> **Lưu ý nguồn tư liệu:** Dự án tham khảo hình ảnh/tư liệu của game **Bam Bam Squad** – *Touka Technology Limited*. Đây là dự án minh hoạ UI/logic phục vụ học tập, **không thương mại hóa**.

**Live Demo:** [https://dangkhoa2004.github.io/BamBamSquad/](https://dangkhoa2004.github.io/BamBamSquad/)
**Tải game chính thức:** [https://apps.apple.com/vn/app/bam-bam-squad/id6751526939](https://apps.apple.com/vn/app/bam-bam-squad/id6751526939)

---

## 1) Tính năng nổi bật

* Bàn cờ **2×3 (6 ô)**, kéo-thả tướng để **đặt/hoán đổi/xóa (chuột phải)**.
* **3 ô Pet**: mỗi Pet cộng **+1** vào trait của Pet đó, được tính vào kích hoạt.
* **Bảng Synergy**: tự tính theo **ngưỡng trait** (ví dụ 2/4/6…).
* **Tìm kiếm + lọc theo trait** (chip filter).
* **Dữ liệu tách file theo từng tộc/hệ**, nạp qua **manifest** (có fallback).
* **Export/Import bố cục**: Lưu/tải lại `board` & `petSlots`.
* **Không có ghế dự bị**, **không** còn tính năng thêm tướng/pet tùy chỉnh trong UI.

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

* `index.html`: Giao diện + Tailwind CDN + **fallback** `window.MANIFEST_FILES`.
* `script.js`: Logic kéo-thả, render, synergy, loader dữ liệu, import/export.
* `traits_manifest.json`: Danh sách file trait sẽ nạp.
* `data/*.json`: Mỗi file đại diện một nhóm trait.

---

## 3) Chạy nhanh

### Cách 1 – Web server tĩnh (khuyến nghị)

* **Python**

  ```bash
  cd project-root
  python -m http.server 8000
  # mở http://localhost:8000/
  ```
* **Node**

  ```bash
  npm i -g serve
  serve .
  # hoặc: npx serve .
  ```

### Cách 2 – Mở trực tiếp file `index.html`

Có thể bị chặn `fetch()` file cục bộ; nếu lỗi, dùng **Cách 1**.

---

## 4) Hướng dẫn sử dụng

1. Mở app (hoặc xem **Live Demo**: [https://dangkhoa2004.github.io/BamBamSquad/](https://dangkhoa2004.github.io/BamBamSquad/)).
2. Tab **Tướng** → kéo thả vào **bàn cờ 2×3**; chuột phải để xoá.
3. Tab **Pet** → kéo thả vào **3 ô Pet**; chuột phải để xoá.
4. Quan sát **Tộc/Hệ kích hoạt** ở panel phải.
5. **Xuất (Export)** bố cục để lưu; **Nhập (Import)** để khôi phục.

---

## 5) Dữ liệu & Định dạng JSON

### 5.1 Manifest

`traits_manifest.json`

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

* App sẽ tải **tất cả** file trong `files[]` và **gộp**:

  * `trait_thresholds`: merge theo key (file sau ghi đè nếu trùng).
  * `champions` / `pets`: merge theo `id` (chống trùng).
* Nếu **manifest 404**, `index.html` có **fallback** `window.MANIFEST_FILES` cùng format.

### 5.2 Mẫu `data/<trait>_data.json`

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
      "img": "data:image/svg+xml;... hoặc URL ảnh"
    }
  ],
  "pets": [
    {
      "id": "pet1",
      "name": "Pixie",
      "trait": "Pháp sư",
      "img": "data:image/svg+xml;... hoặc URL ảnh"
    }
  ]
}
```

**Champion**: `id` (duy nhất), `name`, `traits[]` (>=1), `img` (Data URI/URL).
**Pet**: `id`, `name`, `trait` (1 trait duy nhất), `img`.

---

## 6) Import/Export bố cục

* **Export** → file JSON có:

  ```json
  {
    "board": [
      ["as1", null, "br1"],
      [null, "el1", "ga1"]
    ],
    "petSlots": ["pet1", null, "pet2"]
  }
  ```
* **Import** → chỉ nạp `board` & `petSlots`.
  Danh sách tướng/pet luôn lấy từ manifest & các file data.

---

## 7) Kiến trúc & Kỹ thuật

* **UI**: Tailwind CDN, không cần build; layout responsive.
* **Drag-and-Drop**: Native HTML5 DnD (`dragstart`, `dragover`, `drop`…), payload JSON `{ kind: 'champ'|'pet', id, from }`.
* **Render**: tạo slot từ `<template>`, state `slots` (ma trận 2×3) và `petSlots` (mảng 3).
* **Synergy**:

  * Đếm số **champion** trên bàn cờ theo trait.
  * Cộng thêm **+1** cho mỗi Pet theo trait của Pet.
  * So `cnt` với `trait_thresholds[trait]` để đánh dấu cấp kích hoạt.
* **Loader**:

  * Thử `traits_manifest.json`; nếu lỗi, fallback `window.MANIFEST_FILES`.
  * Gộp dữ liệu an toàn; skip file lỗi hoặc JSON không hợp lệ.
* **Import/Export**:

  * Export chỉ state bố cục, không export dữ liệu tướng/pet.
  * Import không ghi đè danh sách tướng/pet.

---

## 8) Tuỳ biến & Đồng bộ với **Bam Bam Squad**

**Link game:** [https://apps.apple.com/vn/app/bam-bam-squad/id6751526939](https://apps.apple.com/vn/app/bam-bam-squad/id6751526939)
**Live Demo của dự án:** [https://dangkhoa2004.github.io/BamBamSquad/](https://dangkhoa2004.github.io/BamBamSquad/)

* **Đồng bộ trait/tướng/pet**:

  * Tạo thêm file trong `data/` theo đúng **tên trait**/ngưỡng kích hoạt thực tế.
  * Điền danh sách tướng/pet theo tài liệu được phép sử dụng.
  * Bổ sung đường dẫn vào `traits_manifest.json`.
* **Ngưỡng kích hoạt**: đặt đúng theo bản game (ví dụ 2/3/5 thay vì 2/4/6).
* **Icon/Ảnh chính thức**:

  * Dùng URL công khai (nếu được phép) hoặc chuyển ảnh sang Data URI.
  * Khuyến nghị kích cỡ ~256×256 để hiển thị nét.

---

## 9) Khả năng mở rộng (Roadmap)

* Switch **layout** nhanh (1×6 / 3×2).
* **Tooltip** giàu thông tin (mô tả trait/cấp).
* **Bộ lọc nâng cao** (bao gồm/loại trừ trait).
* **Xuất PNG** đội hình.
* **I18n**: file dịch riêng.
* **Kiểm tra hợp lệ** (giới hạn loại tướng, slot khoá… nếu game có quy tắc).

---

## 10) Trợ năng (Accessibility)

* Alt text cho ảnh từ `name`.
* Vùng thả có **outline** khi `dragover`.
* Kích cỡ hit-area đủ lớn trên mobile (thẻ + slot bo góc, spacing 8–12px).

---

## 11) Hiệu năng

* Gallery paginate nhẹ (nếu dữ liệu lớn có thể thêm virtual list).
* Cache HTTP mặc định; có thể thêm hash version cho file data khi deploy.
* Data gộp theo `id` tránh trùng lặp.

---

## 12) Triển khai (Deploy)

* **GitHub Pages**: push toàn bộ thư mục, bật Pages → (Ví dụ) **Live Demo**: [https://dangkhoa2004.github.io/BamBamSquad/](https://dangkhoa2004.github.io/BamBamSquad/)
* **Netlify/Vercel**: kéo-thả folder hoặc kết nối repo, không cần build.
* **Nginx/Apache/S3**: serve tĩnh là đủ (lưu ý CORS nếu `img` là URL ngoài).

---

## 13) Kiểm thử nhanh (Checklist)

* [ ] Tải được **manifest** hoặc dùng **fallback**.
* [ ] Tải đủ các file `data/*.json`.
* [ ] Kéo-thả tướng: đặt, hoán đổi, xoá.
* [ ] Kéo-thả Pet: đặt, hoán đổi, xoá.
* [ ] Bảng synergy cập nhật đúng khi thêm/bớt tướng & pet.
* [ ] Export/Import khôi phục đúng `board` & `petSlots`.
* [ ] Mọi file JSON hợp lệ (không lỗi `Unexpected token '<'`).

---

## 14) Pháp lý & Ghi nhận

* **Bam Bam Squad** là sản phẩm của **Touka Technology Limited**.

  * Mọi thương hiệu, tên gọi, hình ảnh liên quan thuộc quyền của chủ sở hữu.
  * Repo này **không** phát hành tài nguyên gốc, chỉ minh hoạ UI/logic.
* **Mã nguồn UI/logic** của dự án (trừ tài sản bên thứ ba): dùng cho mục đích học tập/nghiên cứu.
* Nếu bạn là đại diện **Touka Technology Limited** và muốn điều chỉnh/nêu yêu cầu, vui lòng liên hệ — mình sẽ cập nhật ngay.

**Tải Bam Bam Squad trên App Store:** [https://apps.apple.com/vn/app/bam-bam-squad/id6751526939](https://apps.apple.com/vn/app/bam-bam-squad/id6751526939)
**Live Demo dự án:** [https://dangkhoa2004.github.io/BamBamSquad/](https://dangkhoa2004.github.io/BamBamSquad/)

---

## 15) Liên hệ & Đóng góp

* Mở issue/PR kèm mô tả rõ: trình duyệt, hệ điều hành, bước tái hiện, JSON mẫu (nếu liên quan dữ liệu).
* Bạn muốn mình **điền sẵn dữ liệu trait/tướng/pet đúng meta Bam Bam Squad**? Gửi danh sách (được phép sử dụng), mình sẽ cấu hình sẵn `data/*.json` và `traits_manifest.json` cho bạn.
