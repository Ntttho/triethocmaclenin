# Web Ôn Thi Trắc Nghiệm Triết Học Mác - Lênin

Ứng dụng web ôn tập trắc nghiệm cuối kỳ môn **Triết học Mác - Lênin** với đầy đủ **150 câu hỏi** trích xuất từ 2 bộ đề `ONTAP1` (100 câu) và `ONTAP2` (50 câu).

---

## 🌟 Tính Năng Nổi Bật

- 🔀 **Random 2 Chiều (True Randomization)**: Xáo trộn ngẫu nhiên thứ tự câu hỏi và thứ tự 4 đáp án A-B-C-D theo thuật toán Fisher-Yates.
- 🎓 **2 Chế Độ Linh Hoạt**:
  - **Luyện tập tự do**: Hiển thị Đúng/Sai tức thì ngay khi chọn kèm đáp án chuẩn.
  - **Thi thử tính giờ**: Đếm ngược thời gian, nộp bài mới chấm điểm thang 10.
- 📱 **Giao Diện Thân Thiện**: Tương thích hoàn hảo trên điện thoại và máy tính, hỗ trợ **Dark Mode** dịu mắt khi ôn đêm.
- 🎯 **Bảng Điều Hướng (Question Palette)**: Nhảy nhanh câu hỏi, gắn cờ xem lại câu khó.
- 📊 **Chữa Bài & Lọc Câu Sai**: Xem chi tiết câu làm sai, giải thích đáp án.
- 🔍 **Ngân Hàng 150 Câu**: Tra cứu từ khóa bài giảng thời gian thực.
- 💾 **Dual-Mode Database**: Hỗ trợ kết nối **MySQL 8.0** để lưu lịch sử làm bài, đồng thời tích hợp **Auto-Fallback JSON** để deploy lên cloud không lo lỗi database!

---

## 🚀 Hướng Dẫn Chạy Local (Máy Tính Của Bạn)

1. Cài đặt các thư viện:
   ```bash
   npm install
   ```

2. Khởi tạo CSDL MySQL (nếu chưa có):
   ```bash
   mysql -u root -p < database/schema.sql
   mysql -u root -p < database/data.sql
   ```

3. Khởi động Web Server:
   ```bash
   npm start
   ```
   Truy cập vào trình duyệt: `http://localhost:3000`

---

## 🌐 Hướng Dẫn Đưa Lên GitHub & Deploy Miễn Phí (Online)

### Bước 1: Khởi tạo Git & Đẩy code lên GitHub

Mở PowerShell tại thư mục dự án và chạy các lệnh:

```bash
# 1. Khởi tạo git repo
git init

# 2. Thêm tất cả code vào git (các file tài liệu nặng đã tự động được lọc qua .gitignore)
git add .

# 3. Tạo commit đầu tiên
git commit -m "Initial commit: Web ôn thi trắc nghiệm Triết học Mác - Lênin"

# 4. Đổi tên nhánh sang main
git branch -M main

# 5. Liên kết với repository GitHub của bạn (thay URL bằng repo của bạn trên GitHub)
git remote add origin https://github.com/<tai-khoan-cua-ban>/triet-hoc-quiz.git

# 6. Đẩy code lên GitHub
git push -u origin main
```

---

### Bước 2: Deploy miễn phí lên Render.com (Khuyên dùng - 3 phút)

1. Truy cập [render.com](https://render.com) và đăng nhập bằng tài khoản **GitHub**.
2. Bấm nút **New +** ở góc trên -> chọn **Web Service**.
3. Chọn repository `triet-hoc-quiz` vừa tạo trên GitHub.
4. Cấu hình cài đặt:
   - **Name**: `triet-hoc-quiz` (hoặc tên tuỳ thích)
   - **Language**: `Node`
   - **Branch**: `main`
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Instance Type**: `Free`
5. Bấm **Create Web Service**.
6. Đợi 1-2 phút, Render sẽ cấp cho bạn một đường link công khai dạng:
   👉 `https://triet-hoc-quiz-xxxx.onrender.com`
   *(Bạn và bạn bè có thể mở link này trên điện thoại hoặc máy tính để làm bài mọi lúc mọi nơi!)*

> 💡 **Lưu ý về CSDL khi Deploy**:
> Hệ thống đã được tích hợp sẵn cơ chế **Auto-Fallback**. Khi deploy lên Render, nếu bạn chưa cấu hình MySQL Cloud, web vẫn tự động lấy trọn vẹn 150 câu hỏi từ `data/questions.json` và chạy mượt mà 100% không bao giờ bị lỗi!
> Nếu bạn muốn lưu lịch sử vào MySQL trên cloud, bạn chỉ cần tạo 1 database miễn phí trên [Aiven](https://aiven.io) hoặc [TiDB Cloud](https://tidbcloud.com) rồi điền biến môi trường `DATABASE_URL` vào mục **Environment** trên Render.
