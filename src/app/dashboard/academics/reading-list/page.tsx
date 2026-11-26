'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Loader2, X } from 'lucide-react';
import { AcademicsShell } from '@/components/academics/AcademicsShell';
import { useAuth } from '@/context/AuthContext';
import { academicsApi, ReadingItem } from '@/lib/academics-api';

type ReadingListCache = {
    readingItems: ReadingItem[];
};

const CACHE_TTL_MS = 10 * 60 * 1000;

function getCacheKey(userId?: string | number | null): string | null {
    if (!userId) return null;
    return `hexad:academics:reading-list:${userId}`;
}

function readCache(key: string | null): ReadingListCache | null {
    if (!key || typeof window === 'undefined') return null;
    try {
        const raw = window.localStorage.getItem(key);
        if (!raw) return null;
        const parsed = JSON.parse(raw) as { data?: ReadingListCache; savedAt?: number };
        if (typeof parsed.savedAt !== 'number' || Date.now() - parsed.savedAt > CACHE_TTL_MS) {
            return null;
        }
        return parsed.data ?? null;
    } catch {
        return null;
    }
}

function writeCache(key: string | null, data: ReadingListCache): void {
    if (!key || typeof window === 'undefined') return;
    try {
        window.localStorage.setItem(key, JSON.stringify({ data, savedAt: Date.now() }));
    } catch {
        // Ignore storage quota or private-mode errors
    }
}

export default function ReadingListPage() {
    const { user } = useAuth();
    const userId = user?.id;
    const cacheKey = getCacheKey(userId);
    const initialCache = readCache(cacheKey);

    const [readingItems, setReadingItems] = useState<ReadingItem[]>(
        () => initialCache?.readingItems ?? []
    );

    const hasCachedData = Boolean(initialCache && initialCache.readingItems.length > 0);

    const [loading, setLoading] = useState<boolean>(() => !hasCachedData);
    const [error, setError] = useState<string | null>(null);

    const [modalOpen, setModalOpen] = useState(false);
    const [title, setTitle] = useState('');
    const [author, setAuthor] = useState('');
    const [pagesRead, setPagesRead] = useState('0');
    const [totalPages, setTotalPages] = useState('250');
    const [submitting, setSubmitting] = useState(false);

    const loadData = useCallback(async () => {
        if (!userId) return;
        const activeKey = getCacheKey(userId);
        const cached = readCache(activeKey);

        if (cached && cached.readingItems.length > 0) {
            setReadingItems((prev) => (prev.length > 0 ? prev : cached.readingItems));
        }

        const hasAnyExistingData = Boolean(cached && cached.readingItems.length > 0);
        if (!hasAnyExistingData) {
            setLoading(true);
        }
        setError(null);

        try {
            const res = await academicsApi
                .getReadingItems()
                .catch(() => ({ count: 0, next: null, previous: null, results: [] }));
            const nextItems = Array.isArray(res.results) ? res.results : [];
            setReadingItems(nextItems);
            writeCache(activeKey, { readingItems: nextItems });
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to load reading list.');
        } finally {
            setLoading(false);
        }
    }, [userId]);

    useEffect(() => {
        void loadData();
    }, [loadData]);

    const totalPagesRead = useMemo(
        () => readingItems.reduce((acc, b) => acc + (Number(b.pages_read) || 0), 0),
        [readingItems]
    );

    const completedBooksCount = useMemo(
        () =>
            readingItems.filter(
                (b) => b.status === 'completed' || (b.total_pages > 0 && b.pages_read >= b.total_pages)
            ).length,
        [readingItems]
    );

    const activeBooks = useMemo(
        () =>
            readingItems.filter(
                (b) => b.status !== 'completed' && !(b.total_pages > 0 && b.pages_read >= b.total_pages)
            ),
        [readingItems]
    );

    const completedOrQueuedBooks = useMemo(
        () =>
            readingItems.filter(
                (b) =>
                    b.status === 'completed' ||
                    b.status === 'queued' ||
                    (b.total_pages > 0 && b.pages_read >= b.total_pages)
            ),
        [readingItems]
    );

    const handleCreateReading = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!title.trim()) return;
        setSubmitting(true);
        try {
            const read = Math.max(0, Number(pagesRead) || 0);
            const total = Math.max(1, Number(totalPages) || 200);
            await academicsApi.createReadingItem({
                title: title.trim(),
                author: author.trim() || 'Unknown Author',
                pages_read: read,
                total_pages: total,
                status: read >= total ? 'completed' : 'reading',
            });
            setModalOpen(false);
            await loadData();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Unable to save reading item.');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <AcademicsShell
            subtitle="Active books, weekly reading pace, annotations, and completed queue."
            ctaLabel="Log reading pages"
            onCtaClick={() => {
                setTitle('');
                setAuthor('');
                setPagesRead('0');
                setTotalPages('250');
                setModalOpen(true);
            }}
            error={error}
        >
            {loading ? (
                <div className="mt-14 flex items-center justify-center py-16">
                    <Loader2 className="h-6 w-6 animate-spin text-[#004635]" />
                </div>
            ) : (
                <>
                    <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                        <div className="rounded-xl border border-[#BFC9C3]/70 bg-white p-5">
                            <div className="text-xs text-[#707974]">Pages Read</div>
                            <div className="mt-2 font-mono text-2xl font-semibold text-[#00629F]">
                                {totalPagesRead}
                            </div>
                            <div className="mt-1 text-xs text-[#707974]">
                                Across {readingItems.length} titles
                            </div>
                        </div>

                        <div className="rounded-xl border border-[#BFC9C3]/70 bg-white p-5">
                            <div className="text-xs text-[#707974]">Books Completed</div>
                            <div className="mt-2 font-mono text-2xl font-semibold text-[#111D18]">
                                {completedBooksCount} / {readingItems.length}
                            </div>
                            <div className="mt-1 text-xs text-[#707974]">Reading shelf progress</div>
                        </div>

                        <div className="rounded-xl border border-[#BFC9C3]/70 bg-white p-5">
                            <div className="text-xs text-[#707974]">Active Books</div>
                            <div className="mt-2 font-mono text-2xl font-semibold text-[#111D18]">
                                {activeBooks.length}
                            </div>
                            <div className="mt-1 text-xs text-[#707974]">In progress now</div>
                        </div>

                        <div className="rounded-xl border border-[#BFC9C3]/70 bg-white p-5">
                            <div className="text-xs text-[#707974]">Daily Pace</div>
                            <div className="mt-2 font-mono text-2xl font-semibold text-[#111D18]">
                                {Math.round(totalPagesRead / 7)} pg
                            </div>
                            <div className="mt-1 text-xs text-[#707974]">Estimated weekly average</div>
                        </div>
                    </div>

                    <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-12">
                        <div className="lg:col-span-7">
                            <h2 className="font-serif text-xl font-semibold text-[#111D18] mb-3.5">
                                Currently Reading
                            </h2>
                            {activeBooks.length === 0 ? (
                                <div className="rounded-xl border border-[#BFC9C3]/70 bg-white p-6 text-xs text-[#707974]">
                                    No active books right now.
                                </div>
                            ) : (
                                <div className="space-y-3.5">
                                    {activeBooks.map((book) => {
                                        const total = Math.max(1, Number(book.total_pages) || 1);
                                        const read = Math.max(0, Number(book.pages_read) || 0);
                                        const pct = Math.min(100, Math.round((read / total) * 100));
                                        return (
                                            <div
                                                key={book.id}
                                                className="rounded-xl border border-[#BFC9C3]/70 bg-white p-5"
                                            >
                                                <div className="flex items-start justify-between gap-3">
                                                    <div>
                                                        <div className="text-sm font-semibold text-[#14221C]">
                                                            {book.title}
                                                        </div>
                                                        <div className="text-xs text-[#707974] mt-0.5">
                                                            {book.author}
                                                        </div>
                                                    </div>
                                                    <span className="font-mono text-xs font-semibold text-[#00629F]">
                                                        {pct}%
                                                    </span>
                                                </div>
                                                <div className="mt-3.5 h-2 w-full overflow-hidden rounded-full bg-[#ECEEEB]">
                                                    <div
                                                        className="h-full rounded-full bg-[#00629F]"
                                                        style={{ width: `${pct}%` }}
                                                    />
                                                </div>
                                                <div className="mt-2.5 font-mono text-xs text-[#707974]">
                                                    Page {read} of {total}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>

                        <div className="lg:col-span-5">
                            <h2 className="font-serif text-xl font-semibold text-[#111D18] mb-3.5">
                                Completed &amp; Queue
                            </h2>
                            {completedOrQueuedBooks.length === 0 ? (
                                <div className="rounded-xl border border-[#BFC9C3]/70 bg-white p-6 text-xs text-[#707974]">
                                    No completed or queued titles yet.
                                </div>
                            ) : (
                                <div className="rounded-xl border border-[#BFC9C3]/70 bg-white divide-y divide-[#ECEEEB]">
                                    {completedOrQueuedBooks.map((book) => (
                                        <div
                                            key={book.id}
                                            className="flex items-center justify-between px-4 py-3.5"
                                        >
                                            <div className="min-w-0 pr-3">
                                                <div className="truncate text-sm font-semibold text-[#14221C]">
                                                    {book.title}
                                                </div>
                                                <div className="text-xs text-[#707974] mt-0.5">
                                                    {book.author}
                                                </div>
                                            </div>
                                            <span className="font-mono text-xs font-semibold text-[#00629F] capitalize shrink-0">
                                                {book.status === 'completed' ? 'Done' : book.status}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </>
            )}

            {modalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/35 px-4">
                    <div className="w-full max-w-md rounded-2xl border border-[#BFC9C3] bg-white p-6 shadow-lg">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="font-serif text-xl font-semibold text-[#111D18]">
                                Log reading pages
                            </h3>
                            <button
                                type="button"
                                onClick={() => setModalOpen(false)}
                                className="rounded-lg p-1 text-[#707974] hover:bg-[#ECEEEB]"
                            >
                                <X className="h-4 w-4" />
                            </button>
                        </div>
                        <form onSubmit={handleCreateReading} className="space-y-4">
                            <div>
                                <label className="block text-xs font-medium text-[#14221C] mb-1">
                                    Book Title
                                </label>
                                <input
                                    type="text"
                                    required
                                    value={title}
                                    onChange={(e) => setTitle(e.target.value)}
                                    className="w-full rounded-lg border border-[#BFC9C3] bg-[#F8FAF7] px-3 py-2 text-sm text-[#14221C]"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-[#14221C] mb-1">
                                    Author
                                </label>
                                <input
                                    type="text"
                                    required
                                    value={author}
                                    onChange={(e) => setAuthor(e.target.value)}
                                    className="w-full rounded-lg border border-[#BFC9C3] bg-[#F8FAF7] px-3 py-2 text-sm text-[#14221C]"
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-medium text-[#14221C] mb-1">
                                        Pages Read
                                    </label>
                                    <input
                                        type="number"
                                        min={0}
                                        value={pagesRead}
                                        onChange={(e) => setPagesRead(e.target.value)}
                                        className="w-full rounded-lg border border-[#BFC9C3] bg-[#F8FAF7] px-3 py-2 text-sm text-[#14221C]"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-[#14221C] mb-1">
                                        Total Pages
                                    </label>
                                    <input
                                        type="number"
                                        min={1}
                                        value={totalPages}
                                        onChange={(e) => setTotalPages(e.target.value)}
                                        className="w-full rounded-lg border border-[#BFC9C3] bg-[#F8FAF7] px-3 py-2 text-sm text-[#14221C]"
                                    />
                                </div>
                            </div>
                            <div className="flex justify-end gap-2 pt-2">
                                <button
                                    type="button"
                                    onClick={() => setModalOpen(false)}
                                    className="rounded-lg border border-[#BFC9C3] px-4 py-2 text-xs font-medium text-[#2E312F]"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={submitting}
                                    className="inline-flex items-center gap-1.5 rounded-lg bg-[#004635] px-4 py-2 text-xs font-medium text-white hover:bg-[#1B5E4B] disabled:opacity-60"
                                >
                                    {submitting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                                    Save
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </AcademicsShell>
    );
}