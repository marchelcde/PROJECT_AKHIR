<?php
// Enable error reporting for debugging
error_reporting(E_ALL);
ini_set('display_errors', 0); // Disable for production, enable for debugging
ini_set('log_errors', 1);

// Roboflow API configuration
$apiKey = "UL8nLpCiEBGbxYqRq0nY";
$project = "dataset-6nff1";  
$version = "4";

// CORS headers
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Headers: Content-Type, X-Requested-With");
header("Access-Control-Allow-Methods: POST, OPTIONS");
header('Content-Type: application/json');

// Handle preflight OPTIONS request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Validate request method
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(["error" => "Only POST method allowed"]);
    exit;
}

// Debug incoming request
error_log("POST data received: " . print_r($_POST, true));
error_log("FILES data received: " . print_r($_FILES, true));

// Validate file upload
if (!isset($_FILES['image'])) {
    echo json_encode(["error" => "No image file in request", "debug" => $_FILES]);
    exit;
}

$file = $_FILES['image'];
if ($file['error'] !== UPLOAD_ERR_OK) {
    $errorMessages = [
        UPLOAD_ERR_INI_SIZE => "File too large (server limit)",
        UPLOAD_ERR_FORM_SIZE => "File too large (form limit)", 
        UPLOAD_ERR_PARTIAL => "File upload incomplete",
        UPLOAD_ERR_NO_FILE => "No file uploaded",
        UPLOAD_ERR_NO_TMP_DIR => "No temp directory",
        UPLOAD_ERR_CANT_WRITE => "Cannot write file",
        UPLOAD_ERR_EXTENSION => "Upload blocked by extension"
    ];
    
    $message = $errorMessages[$file['error']] ?? "Unknown upload error: " . $file['error'];
    echo json_encode(["error" => $message]);
    exit;
}

// Validate file type and size
$allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
$fileType = $file['type'];

if (!in_array($fileType, $allowedTypes)) {
    echo json_encode(["error" => "Invalid file type: $fileType. Allowed: JPG, PNG, GIF, WebP"]);
    exit;
}

if ($file['size'] > 10 * 1024 * 1024) { // 10MB limit
    echo json_encode(["error" => "File too large. Max 10MB allowed."]);
    exit;
}

// Read image data
$imagePath = $file['tmp_name'];
$imageData = file_get_contents($imagePath);

if ($imageData === false) {
    echo json_encode(["error" => "Failed to read uploaded image"]);
    exit;
}

// Log image info
error_log("Image size: " . strlen($imageData) . " bytes");
error_log("Image type: " . $fileType);

// Send to Roboflow
$roboflowUrl = "https://detect.roboflow.com/$project/$version?api_key=$apiKey";
$response = sendToRoboflow($roboflowUrl, $imageData);

// Log response
error_log("Roboflow response: " . $response);

echo $response;

function sendToRoboflow($url, $imageData) {
    // Method 1: Try with base64 encoding (recommended by Roboflow)
    $base64Image = base64_encode($imageData);
    
    $ch = curl_init($url);
    curl_setopt_array($ch, [
        CURLOPT_POST => true,
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_HTTPHEADER => [
            "Content-Type: application/x-www-form-urlencoded"
        ],
        CURLOPT_POSTFIELDS => $base64Image,
        CURLOPT_TIMEOUT => 30,
        CURLOPT_FOLLOWLOCATION => true,
        CURLOPT_SSL_VERIFYPEER => false, // For development only
        CURLOPT_VERBOSE => true
    ]);

    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $curlError = curl_error($ch);
    
    error_log("HTTP Code: $httpCode");
    error_log("cURL Error: $curlError");
    error_log("Raw Response: $response");
    
    curl_close($ch);

    if ($curlError) {
        return json_encode([
            "error" => "Network error: " . $curlError,
            "http_code" => $httpCode
        ]);
    }

    if ($httpCode !== 200) {
        return json_encode([
            "error" => "API error: HTTP $httpCode",
            "response" => $response
        ]);
    }

    // Validate JSON response
    $decoded = json_decode($response, true);
    if (json_last_error() !== JSON_ERROR_NONE) {
        return json_encode([
            "error" => "Invalid JSON response: " . json_last_error_msg(),
            "raw_response" => substr($response, 0, 500)
        ]);
    }

    return $response;
}

// Alternative method using multipart/form-data (backup)
function sendToRoboflowMultipart($url, $imageData) {
    $boundary = "-----" . uniqid();
    
    $postData = "--$boundary\r\n";
    $postData .= "Content-Disposition: form-data; name=\"file\"; filename=\"image.jpg\"\r\n";
    $postData .= "Content-Type: image/jpeg\r\n\r\n";
    $postData .= $imageData . "\r\n";
    $postData .= "--$boundary--\r\n";

    $ch = curl_init($url);
    curl_setopt_array($ch, [
        CURLOPT_POST => true,
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_HTTPHEADER => [
            "Content-Type: multipart/form-data; boundary=$boundary",
            "Content-Length: " . strlen($postData)
        ],
        CURLOPT_POSTFIELDS => $postData,
        CURLOPT_TIMEOUT => 30
    ]);

    $response = curl_exec($ch);
    
    if (curl_errno($ch)) {
        $error = json_encode(["error" => "cURL Error: " . curl_error($ch)]);
        curl_close($ch);
        return $error;
    }

    curl_close($ch);
    return $response;
}

?>
