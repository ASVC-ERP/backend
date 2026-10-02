import {
  Injectable,
  BadRequestException,
  InternalServerErrorException,
} from '@nestjs/common';

// generateContent is legacy; new projects use the Interactions API.
// https://ai.google.dev/gemini-api/docs/interactions-overview
const INTERACTIONS_URL = 'https://generativelanguage.googleapis.com/v1beta/interactions';

const PRIMARY_MODEL = process.env.GEMINI_MODEL || 'gemini-3.8-flash';
const FALLBACK_MODEL = 'gemini-2.5-flash';

// Thrown only for "model is overloaded, try again" responses -- the one
// case worth retrying against a different model rather than surfacing.
class GeminiOverloadedError extends Error {}

@Injectable()
export class GeminiService {
  // Turns one already-sanitized report payload into a short business-analysis
  // prompt and runs it through Gemini's free-tier API. Callers must strip
  // names, addresses, and any other identifying fields before calling this --
  // this service just forwards whatever payload it's given.
  async analyzeReport(
    kind: 'sales' | 'purchases',
    payload: unknown,
  ): Promise<string> {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new BadRequestException(
        'GEMINI_API_KEY is not set. Get a free key at https://aistudio.google.com/apikey and add it to .env.',
      );
    }

    const prompt = [
      `You are a business analyst reviewing a company's ${kind} report.`,
      `The data below is already aggregated: customer/supplier names were replaced with generic ranks, so treat every account as anonymous.`,
      `Write a short analysis as plain text (no markdown headers): 2-3 sentences on the overall trend, then up to 5 bullet points of the most actionable observations (risks, opportunities, standout products or accounts by rank). Reference the actual numbers.`,
      '',
      JSON.stringify(payload),
    ].join('\n');

    try {
      return await this.callModel(PRIMARY_MODEL, prompt, apiKey);
    } catch (err) {
      if (!(err instanceof GeminiOverloadedError) || PRIMARY_MODEL === FALLBACK_MODEL) {
        throw err;
      }
      // Primary model is temporarily overloaded -- fall back once rather
      // than failing the whole request.
      return await this.callModel(FALLBACK_MODEL, prompt, apiKey);
    }
  }

  private async callModel(
    model: string,
    prompt: string,
    apiKey: string,
  ): Promise<string> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30000);
    try {
      const res = await fetch(INTERACTIONS_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': apiKey,
        },
        body: JSON.stringify({ model, input: prompt }),
        signal: controller.signal,
      });

      const body = await res.json();
      if (!res.ok) {
        const message: string =
          body?.error?.message || `Gemini request failed (${res.status})`;
        if (res.status === 503 || /overload|unavailable/i.test(message)) {
          throw new GeminiOverloadedError(message);
        }
        throw new InternalServerErrorException(message);
      }

      // Response is a "steps" timeline (e.g. a thought step, then the
      // model_output step) rather than generateContent's candidates array.
      const outputStep = (body?.steps ?? []).find(
        (s: { type?: string }) => s.type === 'model_output',
      );
      const text: string =
        outputStep?.content
          ?.map((p: { type?: string; text?: string }) =>
            p.type === 'text' ? (p.text ?? '') : '',
          )
          .join('') ?? '';
      if (!text) {
        throw new InternalServerErrorException('Gemini returned an empty response.');
      }
      return text.trim();
    } catch (err) {
      if (
        err instanceof GeminiOverloadedError ||
        err instanceof BadRequestException ||
        err instanceof InternalServerErrorException
      ) {
        throw err;
      }
      if ((err as Error).name === 'AbortError') {
        throw new InternalServerErrorException('Gemini request timed out.');
      }
      throw new InternalServerErrorException(
        'Failed to reach Gemini: ' + (err as Error).message,
      );
    } finally {
      clearTimeout(timeout);
    }
  }
}
