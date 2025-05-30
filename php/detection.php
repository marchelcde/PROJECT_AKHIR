<?php

// Konfigurasi
$apiKey = "UL8nLpCiEBGbxYqRq0nY";
$project = "dataset-6nff1";
$version = "4"; // versi model Roboflow kamu

// CORS (opsional, bisa dihapus jika tidak dibutuhkan)
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Headers: Content-Type");

// Pastikan ada file yang diunggah
if (!isset($_FILES['image']) || $_FILES['image']['error'] !== UPLOAD_ERR_OK) {
    http_response_code(400);
    echo json_encode(["error" => "Gambar tidak berhasil diunggah."]);
    exit;
}

// Ambil gambar
$imageTmp = $_FILES['image']['tmp_name'];
$imageData = file_get_contents($imageTmp);

// Endpoint Roboflow
$url = "https://detect.roboflow.com/$project/$version?api_key=$apiKey";

// Kirim ke Roboflow
$response = sendToRoboflow($url, $imageData);

// Kembalikan ke frontend
header('Content-Type: application/json');
echo $response;

// Kirim gambar ke Roboflow via CURL
function sendToRoboflow($url, $imageData) {
    $boundary = uniqid();
    $delimiter = '-------------' . $boundary;

    $postData = build_data_files("file", "image.jpg", $imageData, $boundary);

    $ch = curl_init($url);
    curl_setopt_array($ch, array(
        CURLOPT_POST => true,
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_HTTPHEADER => array(
            "Content-Type: multipart/form-data; boundary=$delimiter",
            "Content-Length: " . strlen($postData)
        ),
        CURLOPT_POSTFIELDS => $postData
    )); 

    $response = curl_exec($ch);

    if (curl_errno($ch)) {
        return json_encode([
            "error" => "CURL Error: " . curl_error($ch)
        ]);
    }

    curl_close($ch);
    return $response;
}

// Format multipart/form-data
function build_data_files($file_field, $filename, $filedata, $boundary) {
    $eol = "\r\n";
    $data = "--$boundary$eol";
    $data .= "Content-Disposition: form-data; name=\"$file_field\"; filename=\"$filename\"$eol";
    $data .= "Content-Type: image/jpeg$eol$eol";
    $data .= $filedata . $eol;
    $data .= "--$boundary--$eol";
    return $data;
}
