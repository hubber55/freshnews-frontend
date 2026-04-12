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
    <main className="min-h-screen bg-gray-50 text-gray-900 pb-12">
      {/* Top Navbar */}
      <header className="bg-white shadow-sm sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <h1 className="text-2xl font-black text-rose-600 tracking-tight">FRESH<span className="text-gray-800">NEWS</span></h1>
          <div className="flex items-center gap-3">
            <span className="text-sm font-semibold bg-rose-100 text-rose-700 px-3 py-1 rounded-full">Malayalam</span>
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 mt-6">
        {/* Navigation Categories */}
        <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide">
          {['Latest', 'Kerala', 'Politics', 'Entertainment', 'Sports', 'Business', 'Technology'].map((tab, idx) => (
            <button key={tab} className={`px-4 py-1.5 rounded-full whitespace-nowrap text-sm font-semibold transition-colors ${idx === 0 ? 'bg-gray-800 text-white' : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'}`}>
              {tab}
            </button>
          ))}
        </div>

        {/* Hero Post (DailyHunt Style Large Card) */}
        <section className="mt-4 mb-8">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden group cursor-pointer hover:shadow-md transition-shadow">
            {heroPost.image_url ? (
              <img src={heroPost.image_url} alt={heroPost.title} className="w-full h-64 sm:h-80 object-cover object-top group-hover:scale-105 transition-transform duration-500" />
            ) : (
              <div className="w-full h-64 sm:h-80 bg-gray-200 flex items-center justify-center">
                <span className="text-gray-400">No Image Available</span>
              </div>
            )}
            <div className="p-5 sm:p-6">
              <div className="flex items-center gap-2 mb-3">
                <span className="bg-rose-600 text-white text-xs font-bold px-2 py-0.5 rounded capitalize">{heroPost.source_name}</span>
                {heroPost.published_at && (
                  <span className="text-xs text-gray-500 flex items-center gap-1">
                    <Clock size={12} />
                    {formatDistanceToNow(new Date(heroPost.published_at), { addSuffix: true })}
                  </span>
                )}
              </div>
              <h2 className="text-xl sm:text-2xl font-bold leading-snug mb-3 line-clamp-2 hover:text-rose-600 transition-colors">
                {heroPost.title}
              </h2>
              <div 
                className="text-gray-600 line-clamp-3 text-sm sm:text-base leading-relaxed"
                dangerouslySetInnerHTML={{ __html: heroPost.summary }}
              />
              <div className="mt-4 flex gap-2 flex-wrap">
                 {heroPost.tags?.slice(0, 3).map((tag: string) => (
                    <span key={tag} className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-md">#{tag.trim()}</span>
                 ))}
              </div>
            </div>
          </div>
        </section>

        {/* Standard Posts Grid */}
        <section className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {remainingPosts.map((post) => (
            <div key={post.id} className="bg-white rounded-xl shadow-sm border border-gray-100 p-3 sm:p-4 flex gap-4 group cursor-pointer hover:shadow-md transition-shadow">
               {/* Left/Top Content */}
               <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-xs font-bold text-rose-600 truncate capitalize">{post.source_name}</span>
                  </div>
                  <h3 className="text-base font-bold leading-snug line-clamp-3 group-hover:text-rose-600 transition-colors">
                    {post.title}
                  </h3>
                  {post.published_at && (
                    <span className="text-xs text-gray-400 mt-2 flex items-center gap-1">
                      <Clock size={12} />
                      {formatDistanceToNow(new Date(post.published_at))}
                    </span>
                  )}
               </div>

               {/* Right Image Thumbnail */}
               {post.image_url ? (
                 <img src={post.image_url} alt="" className="w-24 h-24 sm:w-28 sm:h-28 object-cover rounded-lg flex-shrink-0" />
               ) : (
                 <div className="w-24 h-24 sm:w-28 sm:h-28 bg-gray-100 rounded-lg flex-shrink-0 flex items-center justify-center">
                    <span className="text-xs text-gray-400">No Img</span>
                 </div>
               )}
            </div>
          ))}
        </section>
      </div>
    </main>
  );
}
