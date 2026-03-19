param(
    [Parameter(Mandatory = $false)] [string]$TwilioAccountSid,
    [Parameter(Mandatory = $false)] [string]$TwilioAuthToken,
    [Parameter(Mandatory = $false)] [string]$TwilioWhatsAppFrom,
    [Parameter(Mandatory = $false)] [string]$SmtpHost,
    [Parameter(Mandatory = $false)] [int]$SmtpPort = 587,
    [Parameter(Mandatory = $false)] [bool]$SmtpUseSsl = $true,
    [Parameter(Mandatory = $false)] [string]$SmtpUsername,
    [Parameter(Mandatory = $false)] [string]$SmtpPassword,
    [Parameter(Mandatory = $false)] [string]$SmtpFromEmail,
    [Parameter(Mandatory = $false)] [string]$SmtpFromName = "ARAME TURISMO"
)

$project = "backend-dotnet/ArameTurismo.Api/ArameTurismo.Api.csproj"

function Set-SecretIfValue([string]$key, [string]$value) {
    if (-not [string]::IsNullOrWhiteSpace($value)) {
        dotnet user-secrets set $key $value --project $project | Out-Null
        Write-Host "[OK] $key configurado."
    }
    else {
        Write-Host "[WARN] $key nao informado."
    }
}

Set-SecretIfValue "Twilio:AccountSid" $TwilioAccountSid
Set-SecretIfValue "Twilio:AuthToken" $TwilioAuthToken
Set-SecretIfValue "Twilio:WhatsAppFrom" $TwilioWhatsAppFrom
Set-SecretIfValue "Smtp:Host" $SmtpHost
if ($SmtpPort -gt 0) { dotnet user-secrets set "Smtp:Port" "$SmtpPort" --project $project | Out-Null; Write-Host "[OK] Smtp:Port configurado." }
dotnet user-secrets set "Smtp:UseSsl" "$SmtpUseSsl" --project $project | Out-Null
Write-Host "[OK] Smtp:UseSsl configurado."
Set-SecretIfValue "Smtp:Username" $SmtpUsername
Set-SecretIfValue "Smtp:Password" $SmtpPassword
Set-SecretIfValue "Smtp:FromEmail" $SmtpFromEmail
Set-SecretIfValue "Smtp:FromName" $SmtpFromName

Write-Host "Concluido. Use 'dotnet user-secrets list --project $project' para verificar."
