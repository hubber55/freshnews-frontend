import { supabase } from '../lib/supabase';
import { Clock } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

export const revalidate = 60; // Revalidate every 60 seconds

export default async function Home() {
  const { data: posts } = await supabase
    .from('posts')
    .select('*')
    .order('published_at', { ascending: false })
    .limit(50);

  if (!posts || posts.length === 0) {
    return (
      <main className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-800 mb-2">No News Available Yet</h1>
          <p className="text-gray-500">The daemon is fetching articles. Check back soon.</p>
        </div>
      </main>
    );
  }

  const heroPost = posts[0];
  const remainingPosts = posts.slice(1);

  return (
    <main className="min-h-screen bg-[#181818] text-white pb-12">
      {/* Top Navbar */}
      <header className="bg-[#0d0d0d] shadow-lg sticky top-0 z-10 border-b border-[#333]">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <h1 className="text-2xl sm:text-3xl font-black text-yellow-400 tracking-tight">FRESHNEWS.TOP</h1>
          <span className="text-xs sm:text-sm font-semibold bg-yellow-900 text-yellow-300 px-3 py-1 rounded-full">Malayalam</span>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-3 sm:px-4 mt-6">
        {/* Hero Post */}
        <article className="mb-8 bg-[#232323] rounded-xl shadow-lg border border-[#333] overflow-hidden hover:shadow-2xl transition-shadow">
          {/* Image Container - Fixed Height, Centered */}
          <div className="w-full h-56 sm:h-72 md:h-80 bg-black flex items-center justify-center overflow-hidden">
            {heroPost.image_url ? (
              <img 
                src={heroPost.image_url} 
                alt={heroPost.title} 
                className="w-full h-full object-cover"
              />
            ) : (
              <span className="text-gray-500">No Image Available</span>
            )}
          </div>
          
          {/* Content */}
          <div className="p-4 sm:p-6">
            <div className="flex items-center gap-2 mb-2">
              <span className="bg-yellow-600 text-white text-xs font-bold px-2 py-1 rounded uppercase">{heroPost.source_name}</span>
              {heroPost.published_at && (
                <span className="text-xs text-gray-400 flex items-center gap-1">
                  <Clock size={12} />
                  {formatDistanceToNow(new Date(heroPost.published_at), { addSuffix: true })}
                </span>
              )}
            </div>
            
            <h2 className="text-xl sm:text-2xl md:text-3xl font-bold leading-tight mb-3 text-yellow-400">
              {heroPost.title}
            </h2>
            
            <div 
              className="text-white text-sm sm:text-base leading-relaxed mb-4"
              dangerouslySetInnerHTML={{ __html: heroPost.summary }}
            />
            
            {/* Clickable Tags */}
            <div className="flex gap-2 flex-wrap">
              {heroPost.tags?.map((tag: string) => (
                <a
                  key={tag}
                  href={`/?tag=${encodeURIComponent(tag.trim())}`}
                  className="text-xs bg-yellow-900 text-yellow-300 px-3 py-1 rounded-full hover:bg-yellow-700 hover:text-white transition-colors cursor-pointer"
                >
                  #{tag.trim()}
                </a>
              ))}
            </div>
          </div>
        </article>

        {/* Posts Grid */}
        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {remainingPosts.map((post) => (
            <article 
              key={post.id} 
              className="bg-[#232323] rounded-xl shadow-lg border border-[#333] overflow-hidden hover:shadow-2xl transition-shadow cursor-pointer"
            >
              {/* Image Container - Fixed Height */}
              <div className="w-full h-48 bg-black flex items-center justify-center overflow-hidden">
                {post.image_url ? (
                  <img 
                    src={post.image_url} 
                    alt={post.title} 
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span className="text-gray-500 text-sm">No Image</span>
                )}
              </div>
              
              {/* Content */}
              <div className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xs font-bold text-yellow-400 uppercase">{post.source_name}</span>
                  {post.published_at && (
                    <span className="text-xs text-gray-400 flex items-center gap-1">
                      <Clock size={10} />
                      {formatDistanceToNow(new Date(post.published_at), { addSuffix: true })}
                    </span>
                  )}
                </div>
                
                <h3 className="text-base sm:text-lg font-bold leading-tight mb-2 text-yellow-400 line-clamp-2">
                  {post.title}
                </h3>
                
                <div 
                  className="text-white text-sm leading-relaxed mb-3 line-clamp-3"
                  dangerouslySetInnerHTML={{ __html: post.summary }}
                />
                
                {/* Clickable Tags */}
                <div className="flex gap-2 flex-wrap">
                  {post.tags?.slice(0, 3).map((tag: string) => (
                    <a
                      key={tag}
                      href={`/?tag=${encodeURIComponent(tag.trim())}`}
                      className="text-xs bg-yellow-900 text-yellow-300 px-2 py-1 rounded-full hover:bg-yellow-700 hover:text-white transition-colors cursor-pointer"
                    >
                      #{tag.trim()}
                    </a>
                  ))}
                </div>
              </div>
            </article>
          ))}
        </section>
      </div>
    </main>
  );
}
