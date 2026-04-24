'use client';

import { Clock } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { limitWords } from '../../lib/posts';
import TrackedLink from './TrackedLink';
import LazyImage from './LazyImage';

interface Post {
  id: string | number;
  title: string;
  image_url: string | null;
  source_name: string;
  published_at: string;
}

interface ProgressivePostListProps {
  posts: Post[];
}

export default function ProgressivePostList({ posts }: ProgressivePostListProps) {

  return (
    <>
      {/* REMAINING CARDS */}
      <div className="mt-6 space-y-7">
        {posts.map((post, index) => (
          <article
            key={post.id}
            className="overflow-hidden rounded-2xl bg-[var(--bg-card)] border border-[var(--border)]"
          >
            <TrackedLink href={`/posts/${post.id}`} className="block" trackEvent={{ postId: Number(post.id), eventType: 'click' }}>
              <div className="relative w-full aspect-video overflow-hidden">
                {post.image_url ? (
                  <>
                    <LazyImage
                      src={post.image_url}
                      alt={post.title}
                      eager={index < 3}
                      className="absolute inset-0 w-full h-full object-cover"
                    />
                  </>
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center bg-[#21262d] text-sm text-[var(--text-muted)]">
                    No Image Available
                  </div>
                )}
                <span className="source-badge">{post.source_name}</span>
              </div>

              <div className="px-5 py-3 sm:py-4">
                <div className="mb-2 flex items-center gap-2 text-[11.5px] text-[var(--text-muted)]" style={{ fontFamily: 'var(--font-en)' }}>
                  {post.published_at && (
                    <span className="flex items-center gap-1">
                      <Clock size={13} />
                      {formatDistanceToNow(new Date(post.published_at), { addSuffix: true })}
                    </span>
                  )}
                </div>

                <h3 className="card-title mb-2 text-white">
                  {limitWords(post.title, 10)}
                </h3>
              </div>
            </TrackedLink>
          </article>
        ))}
      </div>

      {/* Show count */}
      <div className="mt-4 text-center text-[11px] text-[var(--text-muted)]">
        Showing {posts.length} articles
      </div>
    </>
  );
}
