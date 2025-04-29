// src/app/page.tsx
"use client";
import { useState } from 'react';
import { useFetchDiffs } from '@/hooks/useFetchDiffs';
import { useGenerateNotes } from '@/hooks/useGenerateNotes';
import ErrorBoundary from '@/components/ErrorBoundary';
import DiffViewer from '@/components/DiffViewer';
import { DiffItem } from '@/lib/types';

export default function Home() {
  const {
    diffs,
    isLoading: isFetching,
    error: fetchError,
    initialFetchDone,
    currentPage,
    nextPage,
    fetchLatest,
    fetchNext,
  } = useFetchDiffs();

  const {
    structuredNotes,
    parseErrorRaw,
    notesError,
    isGenerating,
    generateNotes,
  } = useGenerateNotes(diffs);

  const [shownDiffs, setShownDiffs] = useState<Record<string, boolean>>({});
  const toggle = (id: string) => setShownDiffs(prev => ({ ...prev, [id]: !prev[id] }));

  return (
    <main className="flex min-h-screen flex-col items-center p-12 sm:p-24 bg-gradient-to-br from-indigo-50 via-blue-50 to-yellow-50">
      <h1 className="text-4xl font-extrabold mb-12 text-indigo-700">Diff Digest ✍️</h1>

      <div className="w-full max-w-4xl">
        <div className="mb-8 flex space-x-4">
          <button
            className="px-4 py-2 bg-indigo-500 text-white rounded-lg hover:bg-indigo-600 transition"
            onClick={fetchLatest}
            disabled={isFetching}
          >
            {isFetching && currentPage === 1 ? 'Fetching...' : 'Fetch Latest Diffs'}
          </button>
        </div>

        <div className="shadow-lg rounded-xl p-6 bg-white">
          <h2 className="text-2xl font-semibold mb-4 text-blue-600">Merged Pull Requests</h2>

          {fetchError && <div className="text-red-700 bg-red-100 p-3 rounded mb-4">Error: {fetchError}</div>}
          {!initialFetchDone && !isFetching && <p className="text-gray-600">Click the button above to fetch the latest merged pull requests.</p>}
          {initialFetchDone && diffs.length === 0 && !isFetching && !fetchError && <p className="text-gray-600">No merged pull requests found or fetched.</p>}

          {diffs.length > 0 && (
            <ul className="space-y-4">
              {diffs.map((item: DiffItem) => {
                const isShown = !!shownDiffs[item.id];
                return (
                  <li key={item.id} className="bg-gradient-to-r from-blue-100 to-blue-50 p-4 rounded-lg space-y-2">
                    <div className="flex items-center space-x-4">
                      <a
                        href={item.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-indigo-800 font-semibold hover:underline"
                      >
                        PR #{item.id}
                      </a>
                      <span className="flex-1 text-gray-700">{item.description}</span>
                      <button
                        onClick={() => toggle(item.id)}
                        className={`px-3 py-1 rounded-lg text-sm font-medium transition ${
                          isShown
                            ? 'bg-yellow-200 text-yellow-800 hover:bg-yellow-300'
                            : 'bg-green-200 text-green-800 hover:bg-green-300'
                        }`}
                      >
                        {isShown ? 'Hide diff' : 'Show diff'}
                      </button>
                    </div>
                    {isShown && <div className="mt-2 border-l-4 border-indigo-300 pl-4"><DiffViewer diff={item.diff} /></div>}
                  </li>
                );
              })}
            </ul>
          )}

          {isFetching && currentPage > 1 && <p className="text-gray-600 mt-4">Loading more...</p>}
          {nextPage && !isFetching && (
            <div className="mt-6">
              <button
                className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition"
                onClick={fetchNext}
                disabled={isFetching}
              >
                Load More (Page {nextPage})
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="w-full max-w-4xl mt-6">
        {diffs.length > 0 && (
          <button
            onClick={generateNotes}
            disabled={isGenerating}
            className="px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition"
          >
            {isGenerating ? 'Generating...' : 'Generate Release Notes'}
          </button>
        )}

        {notesError && <div className="text-red-700 mb-4 mt-4">{notesError}</div>}

        <ErrorBoundary fallback={<div className="text-red-600 mt-4">Something went wrong in notes generation.</div>}>
          {isGenerating ? (
            <div className="mt-8 space-y-6">
              {diffs.map(item => (
                <div key={item.id} className="border p-4 rounded shadow bg-gray-200 animate-pulse">
                  <div className="h-5 w-1/4 mb-4 bg-gray-300 rounded" />
                  <div className="h-4 w-3/4 mb-2 bg-gray-300 rounded" />
                  <div className="h-4 w-1/2 bg-gray-300 rounded" />
                </div>
              ))}
            </div>
          ) : structuredNotes.length > 0 ? (
            <div className="mt-8 space-y-6">
              {structuredNotes.map(note => (
                <div key={note.id} className="bg-white p-4 rounded-lg shadow">
                  <h2 className="text-xl font-bold mb-2 text-indigo-700">PR #{note.id}</h2>
                  <ol className="list-decimal list-inside space-y-1 text-gray-800">
                    <li><span className="font-semibold text-blue-600">Developer Note:</span> {note.developerNote}</li>
                    <li><span className="font-semibold text-green-600">Marketing Note:</span> {note.marketingNote}</li>
                  </ol>
                </div>
              ))}
            </div>
          ) : parseErrorRaw ? (
            <div className="mt-8 p-6 bg-gray-100 font-mono whitespace-pre-wrap rounded-lg">{parseErrorRaw}</div>
          ) : null}
        </ErrorBoundary>
      </div>
    </main>
  );
}
