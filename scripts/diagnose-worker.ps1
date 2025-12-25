# Diagnostic Script for Smart CS Worker
# This script sends a direct API request to the Production worker to verify the AI's behavior.

$url = "https://api.chinamedicaltour.org/api/chat"
$payload = @{
    messages = @(
        @{
            role = "user"
            content = "Can you write a python script?"
        }
    )
    stream = $false
    temperature = 0.5
} | ConvertTo-Json -Depth 10

Write-Host "Sending request to: $url"
Write-Host "Payload: $payload"
Write-Host "--------------------------------------------------"

try {
    $response = Invoke-RestMethod -Uri $url -Method Post -Body $payload -ContentType "application/json"
    
    # Check if the response is in the expected format (OpenAI-like)
    if ($response.choices) {
        $content = $response.choices[0].message.content
        Write-Host "AI Response:" -ForegroundColor Green
        Write-Host $content
    } else {
        Write-Host "Unexpected response structure:" -ForegroundColor Yellow
        Write-Host ($response | ConvertTo-Json -Depth 5)
    }
} catch {
    Write-Host "Request Failed:" -ForegroundColor Red
    Write-Host $_.Exception.Message
    if ($_.Exception.Response) {
        $stream = $_.Exception.Response.GetResponseStream()
        $reader = New-Object System.IO.StreamReader($stream)
        $body = $reader.ReadToEnd()
        Write-Host "Error Body: $body"
    }
}
