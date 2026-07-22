using Microsoft.AspNetCore.Mvc;

namespace ChaosCoordinator.Api.Controllers;

[ApiController]
[Route("api/uploads")]
public class UploadsController(IWebHostEnvironment env) : ControllerBase
{
    private static readonly HashSet<string> AllowedExtensions = [".jpg", ".jpeg", ".png", ".webp"];

    /// <summary>Generic image upload despite the route name — used by the phone chore-detail
    /// "photo evidence" flow, the wall display's full-screen camera capture, and shopping item
    /// photos. All three just POST a captured image and get a URL back to attach to whatever
    /// entity (ChoreCompletion.PhotoUrl, ShoppingListItem.ImageUrl) via its own update call.</summary>
    [HttpPost("chore-photo")]
    [RequestSizeLimit(10_000_000)]
    public async Task<IActionResult> UploadChorePhoto(IFormFile file)
    {
        var ext = Path.GetExtension(file.FileName).ToLowerInvariant();
        if (!AllowedExtensions.Contains(ext))
        {
            return BadRequest(new { error = "unsupported_file_type" });
        }

        var uploadsDir = Path.Combine(env.ContentRootPath, "uploads");
        Directory.CreateDirectory(uploadsDir);

        var fileName = $"{Guid.NewGuid()}{ext}";
        var fullPath = Path.Combine(uploadsDir, fileName);

        await using (var stream = System.IO.File.Create(fullPath))
        {
            await file.CopyToAsync(stream);
        }

        return Ok(new { url = $"/uploads/{fileName}" });
    }
}
