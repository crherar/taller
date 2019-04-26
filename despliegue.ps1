$archivo = Import-Csv -Path 'C:\Users\crisdeploy\Desktop\info.csv'
$dominio = "TALLER"

foreach ($fila in $archivo) {
    $direccionIP = ($fila.Header1.Split('|')[0]).Trim()
    $usuario = ($fila.Header1.Split('|')[1]).Trim()
    $password = ($fila.Header1.Split('|')[2]).Trim()
    
    Write-Output $direccionIP
    Write-Output $usuario
    Write-Output $password
    
    if (test-Connection -Cn $direccionIP -quiet) {
		& C:\psexec \\$direccionIP -u $dominio\$usuario -p $password -c -f "C:\Users\crisdeploy\Desktop\nodejs.exe"
        & C:\psexec \\$direccionIP -u $dominio\$usuario -p $password -c -f "C:\Users\crisdeploy\Desktop\SetearPath.bat"
        
    } else {
        "$direccionIP no se encuentra online."
    }
}