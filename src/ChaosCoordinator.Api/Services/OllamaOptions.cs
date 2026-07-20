namespace ChaosCoordinator.Api.Services;

/// <summary>Populated in Program.cs from OLLAMA_BASE_URL/OLLAMA_VISION_MODEL. Unlike
/// GraphEmailOptions/VapidOptions/TurnstileOptions, there's no sensible no-op fallback when this
/// isn't reachable — event extraction just isn't optional the way those integrations are — so
/// EventImportController returns a clear 503 instead of silently degrading.</summary>
public class OllamaOptions
{
    public string BaseUrl { get; set; } = "http://localhost:11434";

    /// <summary>Defaults to "llava" (7B, ~4.8GB VRAM) — meaningfully better than "moondream"
    /// (1.6B, ~1.7GB) at reading real photos: correct date/year reasoning, cleaner times, real
    /// notes instead of empty strings. On Ollama &lt;0.32.1 this used to reliably crash the runner
    /// ("model runner has unexpectedly stopped") the moment an image was attached on a 6GB-VRAM
    /// GPU — that was an Ollama-side OOM from forcing the whole model onto the GPU; 0.32.1+
    /// auto-splits it across CPU/GPU instead and the crash is gone (confirmed by hand on this
    /// host). If running against an older Ollama, expect that crash and fall back to
    /// "moondream".</summary>
    public string VisionModel { get; set; } = "llava";

    /// <summary>OLLAMA_LOG_PROMPTS=true logs the full prompt sent to Ollama and the raw response
    /// content received back, at Information level so it shows up in the console without any
    /// extra logging-level configuration. Off by default — the prompt includes any pasted text
    /// verbatim, and the response can be verbose. Toggle via env var only, no redeploy needed
    /// beyond a container restart.</summary>
    public bool LogPrompts { get; set; }
}
