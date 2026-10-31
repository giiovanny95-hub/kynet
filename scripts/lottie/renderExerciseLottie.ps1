# Render offline del subconjunto Lottie generado por buildExerciseLottie.mjs.
# System.Drawing viene con Windows: no instala paquetes. No sustituye al player Android.
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing
$repo = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '../..'))
$destination = Join-Path $repo 'docs/diseno/capturas'
[IO.Directory]::CreateDirectory($destination) | Out-Null

function Read-Value($property, [int]$frame) {
    if ($property.a -eq 0) { return ,@($property.k) }
    $key = $property.k | Where-Object { $_.t -le $frame } | Select-Object -Last 1
    if ($key.h -ne 1) { throw 'Este renderer solo admite claves hold.' }
    return ,@($key.s)
}

function Convert-Point($layer, [double]$x, [double]$y, [int]$frame, $layers) {
    $anchor = Read-Value $layer.ks.a $frame
    $scale = Read-Value $layer.ks.s $frame
    $position = Read-Value $layer.ks.p $frame
    $rotation = (Read-Value $layer.ks.r $frame)[0] * [Math]::PI / 180
    $dx = ($x - $anchor[0]) * $scale[0] / 100
    $dy = ($y - $anchor[1]) * $scale[1] / 100
    $px = $position[0] + $dx * [Math]::Cos($rotation) - $dy * [Math]::Sin($rotation)
    $py = $position[1] + $dx * [Math]::Sin($rotation) + $dy * [Math]::Cos($rotation)
    if ($layer.parent) { return Convert-Point $layers[$layer.parent] $px $py $frame $layers }
    return ,@($px, $py)
}

foreach ($name in @('squat-front', 'squat-side', 'pushup-front', 'pushup-side', 'jj-front')) {
    $animation = Get-Content -Raw (Join-Path $repo "assets/lottie/exercises/$name.json") | ConvertFrom-Json
    $layers = @{}
    foreach ($layer in $animation.layers) { $layers[$layer.ind] = $layer }
    foreach ($marker in $animation.markers) {
        $frame = [int]$marker.tm
        $bitmap = [Drawing.Bitmap]::new(360, 360)
        $graphics = [Drawing.Graphics]::FromImage($bitmap)
        $graphics.SmoothingMode = [Drawing.Drawing2D.SmoothingMode]::AntiAlias
        $graphics.Clear([Drawing.Color]::Transparent)
        try {
            for ($i = $animation.layers.Count - 1; $i -ge 0; $i--) {
                $layer = $animation.layers[$i]
                if ($layer.ty -ne 4) { throw 'Solo se admiten capas de forma.' }
                $items = $layer.shapes[0].it
                $shape = $items[0]; $fill = $items[1]; $transform = $items[2]
                if ($fill.ty -ne 'fl' -or $transform.ty -ne 'tr') { throw 'Grupo no soportado.' }
                $size = Read-Value $shape.s $frame
                $center = Read-Value $shape.p $frame
                $x = [single]($center[0] - $size[0] / 2)
                $y = [single]($center[1] - $size[1] / 2)
                $w = [single]$size[0]; $h = [single]$size[1]
                $path = [Drawing.Drawing2D.GraphicsPath]::new()
                if ($shape.ty -eq 'el') { $path.AddEllipse($x, $y, $w, $h) }
                elseif ($shape.ty -eq 'rc') {
                    $radius = [Math]::Min((Read-Value $shape.r $frame)[0], [Math]::Min($w, $h) / 2)
                    $d = [single](2 * $radius)
                    $path.AddArc($x, $y, $d, $d, 180, 90)
                    $path.AddArc(($x + $w - $d), $y, $d, $d, 270, 90)
                    $path.AddArc(($x + $w - $d), ($y + $h - $d), $d, $d, 0, 90)
                    $path.AddArc($x, ($y + $h - $d), $d, $d, 90, 90)
                    $path.CloseFigure()
                } else { throw "Forma no soportada: $($shape.ty)" }
                $s = Read-Value $transform.s $frame
                $origin = Convert-Point $layer 0 0 $frame $layers
                $axisX = Convert-Point $layer ($s[0] / 100) 0 $frame $layers
                $axisY = Convert-Point $layer 0 ($s[1] / 100) $frame $layers
                $matrix = [Drawing.Drawing2D.Matrix]::new(
                    [single]($axisX[0] - $origin[0]), [single]($axisX[1] - $origin[1]),
                    [single]($axisY[0] - $origin[0]), [single]($axisY[1] - $origin[1]),
                    [single]$origin[0], [single]$origin[1])
                $path.Transform($matrix)
                $c = Read-Value $fill.c $frame
                $brush = [Drawing.SolidBrush]::new([Drawing.Color]::FromArgb(255,
                    [int][Math]::Round($c[0] * 255), [int][Math]::Round($c[1] * 255), [int][Math]::Round($c[2] * 255)))
                $graphics.FillPath($brush, $path)
                $brush.Dispose(); $path.Dispose(); $matrix.Dispose()
            }
            $file = Join-Path $destination "g1-$name-$($marker.cm).png"
            $bitmap.Save($file, [Drawing.Imaging.ImageFormat]::Png)
            Write-Output $file
        } finally { $graphics.Dispose(); $bitmap.Dispose() }
    }
}
