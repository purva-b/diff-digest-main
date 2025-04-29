// src/app/api/sample-diff/route.ts
import { NextResponse } from "next/server";
import { Octokit } from "@octokit/rest";

const octokit = new Octokit({ auth: process.env.GITHUB_TOKEN });
const DEFAULT_OWNER = process.env.GITHUB_OWNER || "openai";
const DEFAULT_REPO = process.env.GITHUB_REPO || "openai-node";

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const owner = searchParams.get("owner") || DEFAULT_OWNER;
    const repo = searchParams.get("repo") || DEFAULT_REPO;
    const per_page = parseInt(searchParams.get("per_page") || "10", 10);
    const page = parseInt(searchParams.get("page") || "1", 10);

    if (isNaN(per_page) || per_page <= 0) {
        return NextResponse.json({ error: "Invalid per_page parameter" }, { status: 400 });
    }
    if (isNaN(page) || page <= 0) {
        return NextResponse.json({ error: "Invalid page parameter" }, { status: 400 });
    }

    try {
        // 1️⃣ List closed PRs (includes merged)
        const { data: closedPrs, headers } = await octokit.pulls.list({
            owner,
            repo,
            state: "closed",
            per_page,
            page,
            sort: "updated",
            direction: "desc",
        });

        // 2️⃣ Filter to only merged PRs
        const mergedPrs = closedPrs.filter((pr) => pr.merged_at);

        // 3️⃣ Fetch each diff in parallel
        const diffs = await Promise.all(
            mergedPrs.map(async (pr) => {
                try {
                    const diffRes = await octokit.pulls.get({
                        owner,
                        repo,
                        pull_number: pr.number,
                        mediaType: { format: "diff" },
                    });
                    return {
                        id: pr.number.toString(),
                        description: pr.title || "",
                        diff: (diffRes.data as unknown) as string,
                        url: pr.html_url,
                    };
                } catch (diffErr) {
                    console.error(`Failed diff for PR #${pr.number}:`, diffErr);
                    return null;
                }
            })
        ).then((results) => results.filter((r) => r !== null));

        // 4️⃣ Rate-limit headers
        const remaining = Number(headers["x-ratelimit-remaining"]);
        const reset = Number(headers["x-ratelimit-reset"]);
        if (remaining < 5) {
            console.warn(`⚠️ GitHub rate-limit low: ${remaining} calls left`);
        }

        // 5️⃣ Pagination cursor
        let nextPage: number | null = null;
        const linkHeader = headers.link;
        if (linkHeader) {
            const parts = linkHeader.split(",").map((p) => p.split(";"));
            const nxt = parts.find(([, rel]) => rel.includes('rel="next"'));
            if (nxt) {
                const url = new URL(nxt[0].trim().slice(1, -1));
                nextPage = parseInt(url.searchParams.get("page") || "", 10) || null;
            }
        }

        const payload = {
            diffs,
            nextPage,
            currentPage: page,
            perPage: per_page,
            rateLimit: { remaining, reset },
        };

        return NextResponse.json(payload, {
            headers: {
                "X-RateLimit-Remaining": remaining.toString(),
                "Cache-Control": "public, max-age=60",
            },
        });
    } catch (err: any) {
        console.error("GitHub API Error:", err);
        const status = err.status === 403 && err.message.includes("rate limit")
            ? 429
            : err.status || 500;
        const message = status === 429
            ? "GitHub rate limit exceeded. Provide a GITHUB_TOKEN or try later."
            : err.message || "Unknown error fetching pull requests.";
        return NextResponse.json({ error: message }, { status });
    }
}
