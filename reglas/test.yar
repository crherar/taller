rule Test : ransomware
{
    strings:
        $notaRansomware = "ransomware"

    condition:
       $notaRansomware
}