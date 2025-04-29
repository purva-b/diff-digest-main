// src/app/api/generate-notes/route.ts
import { NextResponse } from "next/server";
import OpenAI from "openai";

const openai = new OpenAI();

export async function POST(req: Request) {
    const { diffs }: { diffs: { id: string; description: string; diff: string }[] } = await req.json();

    // Build prompt, asking for strict JSON output
    const promptLines: string[] = [
        "You are a dual-tone release-note generator.",
        "Below are a list of PRs with their diffs.",
        "",
        "PRs:",
        ...diffs.map(
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


    const completionIterable = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        stream: true,
        messages: [
            { role: "system", content: "You generate dual-tone release notes." },
            { role: "user", content: promptLines.join("\n") },
        ],
    });

    // Wrap the async iterable into a ReadableStream of Uint8Array
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
        async start(controller) {
            try {
                for await (const chunk of completionIterable) {
                    // Each chunk is a ChatCompletionChunk; extract any text
                    const text = chunk.choices
                        .map((c) => c.delta?.content ?? "")
                        .join("");
                    if (text) {
                        controller.enqueue(encoder.encode(text));
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
