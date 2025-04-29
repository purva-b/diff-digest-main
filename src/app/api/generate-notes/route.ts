// src/app/api/generate-notes/route.ts
import { NextResponse } from "next/server";
import OpenAI from "openai";

const openai = new OpenAI();

interface Diff {
    id: string;
    description: string;
    diff: string;
}

export async function POST(req: Request) {
    const { diffs }: { diffs: Diff[] } = await req.json();

    // Break into batches of up to 8 PRs each to keep prompt size reasonable
    const BATCH_SIZE = 8;
    const batches: Diff[][] = [];
    for (let i = 0; i < diffs.length; i += BATCH_SIZE) {
        batches.push(diffs.slice(i, i + BATCH_SIZE));
    }

    const encoder = new TextEncoder();
    const stream = new ReadableStream({
        async start(controller) {
            try {
                for (const batch of batches) {
                    // Rebuild prompt just for this batch
                    const promptLines: string[] = [
                        "You are a dual-tone release-note generator.",
                        "Below are a list of PRs with their diffs.",
                        "",
                        "PRs:",
                        ...batch.map(
                            (pr, i) =>
                                `${i + 1}. [#${pr.id}] ${pr.description}\n\`\`\`diff\n${pr.diff}\n\`\`\``
                        ),
                        "",
                        "Return a single JSON array where each element is an object with these keys:",
                        "{",
                        '  "id": string,',
                        '  "developerNote": string,   // concise & technical',
                        '  "marketingNote": string     // user-centric benefit',
                        "}",
                        "",
                        "Example:",
                        `[ { "id": "123", "developerNote": "Refactored X…", "marketingNote": "X is now faster…" }, … ]`,
                    ];

                    // Stream with low temperature to reduce hallucinations
                    const completionIterable = await openai.chat.completions.create({
                        model: "gpt-4o-mini",
                        temperature: 0.2,
                        stream: true,
                        messages: [
                            { role: "system", content: "You generate dual-tone release notes." },
                            { role: "user", content: promptLines.join("\n") },
                        ],
                    });

                    for await (const chunk of completionIterable) {
                        const text = chunk.choices
                            .map((c) => c.delta?.content ?? "")
                            .join("");
                        if (text) {
                            controller.enqueue(encoder.encode(text));
                        }
                    }
                }
            } finally {
                controller.close();
            }
        },
    });

    return new NextResponse(stream, {
        status: 200,
        headers: {
            "Content-Type": "text/event-stream",
            "Cache-Control": "no-cache, no-transform",
            Connection: "keep-alive",
        },
    });
}
