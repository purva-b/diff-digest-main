// src/app/hooks/useGenerateNotes.ts
import { useState } from 'react';
import { DiffItem, Note } from '@/lib/types';

const safeJsonParse = (text: string): Note[] => {
  const cleaned = text
    .trim()
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/, '');
  return JSON.parse(cleaned) as Note[];
};

export function useGenerateNotes(diffs: DiffItem[]) {
  const [structuredNotes, setStructuredNotes] = useState<Note[]>([]);
  const [parseErrorRaw, setParseErrorRaw] = useState<string | null>(null);
  const [notesError, setNotesError] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState<boolean>(false);

  const generateNotes = async () => {
    setParseErrorRaw(null);
    setStructuredNotes([]);
    setNotesError(null);
    setIsGenerating(true);

    try {
      const res = await fetch('/api/generate-notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ diffs }),
      });

      if (!res.ok) {
        setNotesError(`Generation failed: ${res.status}`);
        return;
      }

      const reader = res.body!.getReader();
      const decoder = new TextDecoder();
      let done = false;
      let buffer = '';

      while (!done) {
        const { value, done: doneReading } = await reader.read();
        done = doneReading;
        if (value) buffer += decoder.decode(value);
      }

      // Quick sanity check for our expected keys
      try {
        if (
          !buffer.includes('"developerNote"') ||
          !buffer.includes('"marketingNote"')
        ) {
          throw new Error('missing expected keys');
        }

        // Safe-parse the cleaned JSON
        const parsed = safeJsonParse(buffer);
        setStructuredNotes(parsed);
      } catch (err: any) {
        console.error('Notes generation error:', err, '\nBuffer:', buffer);
        if (err.message === 'missing expected keys') {
          // Friendly fallback if the LLM never emitted our markers
          setNotesError("Oops, the model didn’t respond as expected—try again?");
        } else {
          // Fallback to raw if it was just a parse failure
          setNotesError(
            'Could not parse model output as JSON—showing raw stream below.'
          );
          setParseErrorRaw(buffer);
        }
      }
    } catch (err: any) {
      console.error('Unexpected error during notes generation:', err);
      setNotesError('An unexpected error occurred—please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  return { structuredNotes, parseErrorRaw, notesError, isGenerating, generateNotes };
}
