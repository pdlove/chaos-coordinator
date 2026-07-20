namespace ChaosCoordinator.Api.Services;

/// <summary>Populated in Program.cs from ANTHROPIC_API_KEY/ANTHROPIC_VISION_MODEL/
/// ANTHROPIC_LOG_PROMPTS. When configured, this takes priority over the local Ollama backend for
/// the "create events from a photo" import flow (see Program.cs's IEventExtractionService
/// registration) — a hosted call with no local GPU/VRAM constraints, at a small per-request cost.</summary>
public class AnthropicOptions
{
    public string? ApiKey { get; set; }

    /// <summary>Defaults to "claude-haiku-4-5" — cheap and fast, appropriate for a single-image
    /// structured-extraction call. Supports structured outputs (output_config.format).</summary>
    public string Model { get; set; } = "claude-haiku-4-5";

    /// <summary>Same purpose as OllamaOptions.LogPrompts — logs the prompt sent and the raw
    /// response received, at Information level, for debugging extraction quality.</summary>
    public bool LogPrompts { get; set; }

    public bool IsConfigured => !string.IsNullOrWhiteSpace(ApiKey);
}
