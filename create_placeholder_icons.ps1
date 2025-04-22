# Create the images directory if it doesn't exist
$imagesDir = ".\extension\images"
if (-not (Test-Path $imagesDir)) {
    New-Item -ItemType Directory -Path $imagesDir -Force
}

# Create placeholder icon files - these are just empty files
$iconSizes = @(16, 48, 128)
foreach ($size in $iconSizes) {
    $fileName = Join-Path $imagesDir "icon$size.png"
    
    # Download a simple placeholder icon from a placeholder service
    $url = "https://via.placeholder.com/${size}x${size}/2196F3/FFFFFF?text=AI"
    Invoke-WebRequest -Uri $url -OutFile $fileName
    
    Write-Output "Created placeholder icon: $fileName"
}

Write-Output "Placeholder icons created successfully." 