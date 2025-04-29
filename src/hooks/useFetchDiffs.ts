import { useState } from 'react';
import { DiffItem } from '@/lib/types';

interface ApiResponse {
  diffs: DiffItem[];
  nextPage: number | null;
  currentPage: number;
  perPage: number;
}

export function useFetchDiffs(perPage = 3) {
  const [diffs, setDiffs] = useState<DiffItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [nextPage, setNextPage] = useState<number | null>(null);
  const [initialFetchDone, setInitialFetchDone] = useState<boolean>(false);

  const fetchDiffs = async (page: number) => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch(
        `/api/sample-diffs?page=${page}&per_page=${perPage}`
      );
      if (!response.ok) {
        let errorMsg = `HTTP error! status: ${response.status}`;
        try {
          const errorData = await response.json();
          errorMsg = errorData.error || errorData.details || errorMsg;
        } catch {
          console.warn('Failed to parse error response as JSON');
        }
        throw new Error(errorMsg);
      }
      const data: ApiResponse = await response.json();

      setDiffs(prev => (page === 1 ? data.diffs : [...prev, ...data.diffs]));
      setCurrentPage(data.currentPage);
      setNextPage(data.nextPage);
      if (!initialFetchDone) setInitialFetchDone(true);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'An unknown error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchLatest = () => {
    setDiffs([]);
    fetchDiffs(1);
  };

  const fetchNext = () => {
    if (nextPage) fetchDiffs(nextPage);
  };

  return {
    diffs,
    isLoading,
    error,
    currentPage,
    nextPage,
    initialFetchDone,
    fetchLatest,
    fetchNext,
  };
}
