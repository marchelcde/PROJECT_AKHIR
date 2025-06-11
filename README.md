# VANKER Fish Detection Web Application

Web aplikasi untuk deteksi ikan menggunakan AI dengan teknologi Roboflow dan InferenceJS.

## Features

- 🔍 Real-time fish detection menggunakan kamera
- 📷 Screenshot dengan overlay detection results
- 🖼️ Upload dan deteksi gambar ikan
- ⬬ Download hasil deteksi
- 🎯 AI model dengan akurasi tinggi

## Tech Stack

- **Frontend**: HTML, CSS, JavaScript (ES6+)
- **AI/ML**: InferenceJS, Roboflow API
- **Build Tool**: Vite
- **Camera API**: WebRTC MediaDevices

## Prerequisites

- Node.js (version 16 atau lebih baru)
- NPM atau Yarn
- Browser yang mendukung WebRTC (Chrome, Firefox, Safari, Edge)
- Akses kamera (untuk real-time detection)

## Installation & Setup

### 1. Clone Repository

\`\`\`bash
git clone <repository-url>
cd PROJECT_AKHIR
\`\`\`

### 2. Install Dependencies

\`\`\`bash
npm install
\`\`\`

### 3. Development Server

\`\`\`bash
npm run dev
\`\`\`

Aplikasi akan berjalan di `http://localhost:3000`

## Struktur Project

\`\`\`
PROJECT_AKHIR/
├── index.html # Landing page
├── package.json # Dependencies dan scripts
├── vite.config.js # Vite configuration
├── src/
│ ├── camera.js # Real-time camera detection logic
│ ├── script.js # Picture upload detection logic
│ ├── style.css # Styling
│ └── Ocean moving background @NomadGirl.mp4
└── template/
├── detection.html # Real-time detection page
└── picture_detection.html # Picture upload detection page
\`\`\`

## Dependencies

### Runtime Dependencies

- **inferencejs**: Library untuk AI model inference dari Roboflow

### Development Dependencies

- **vite**: Modern build tool dan dev server

## Cara Menggunakan

### Real-time Detection

1. Buka halaman "Fish Detection"
2. Klik "Start Camera" untuk mengaktifkan kamera
3. Arahkan kamera ke ikan
4. AI akan mendeteksi dan menampilkan bounding box secara real-time
5. Klik "Take Screenshot" untuk menyimpan hasil deteksi

### Picture Detection

1. Buka halaman "Picture Detection"
2. Klik "Choose Image" untuk upload gambar ikan
3. Gambar akan diproses oleh AI model
4. Hasil deteksi ditampilkan dengan bounding box
5. Klik "Download Result" untuk menyimpan gambar hasil

## License

© VANKER Fish Detection Model. All rights reserved.
