export function getAnthropicApiKey(): string | undefined {
  return process.env.ANTHROPIC_API_KEY?.trim()
    || process.env.ANTEHROPIC_API_KEY?.trim()
    || undefined;
}
