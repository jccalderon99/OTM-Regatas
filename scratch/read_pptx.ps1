$pptxPath = "C:\Users\jccalderon\OneDrive - Universidad Tecnologica del Peru\Documentos\DATA_OTM\Reporte\RESUMEN proyecto piloto OTM V2.pptx"
$tempDir = Join-Path $env:TEMP "pptx_extract"

if (Test-Path $tempDir) {
    Remove-Item -Recurse -Force $tempDir
}
New-Item -ItemType Directory -Path $tempDir | Out-Null

# PPTX is a ZIP. Copy it to a .zip file and expand it
$zipPath = Join-Path $tempDir "temp.zip"
Copy-Item $pptxPath $zipPath

Add-Type -AssemblyName System.IO.Compression.FileSystem
[System.IO.Compression.ZipFile]::ExtractToDirectory($zipPath, $tempDir)

Write-Host "=== SLIDE TEXT EXTRACTED ==="
$slides = Get-ChildItem -Path (Join-Path $tempDir "ppt/slides") -Filter "*.xml" | Sort-Object Name

foreach ($slide in $slides) {
    $xml = [xml](Get-Content $slide.FullName -Raw)
    
    # Select all text nodes in the slide (usually within <a:t> elements)
    # The namespace manager is needed for pptx xml namespace "a"
    $ns = New-Object System.Xml.XmlNamespaceManager($xml.NameTable)
    $ns.AddNamespace("a", "http://schemas.openxmlformats.org/drawingml/2006/main")
    
    $textNodes = $xml.SelectNodes("//a:t", $ns)
    if ($textNodes.Count -gt 0) {
        Write-Host "`nSlide: $($slide.BaseName)"
        $slideText = ""
        foreach ($node in $textNodes) {
            $slideText += " " + $node.InnerText
        }
        Write-Host $slideText.Trim()
    }
}

# Clean up
Remove-Item -Recurse -Force $tempDir
