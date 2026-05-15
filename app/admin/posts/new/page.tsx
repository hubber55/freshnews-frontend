import CreatePostForm from './CreatePostForm'

export default function NewPostPage() {
  return (
    <div className="mx-auto max-w-5xl">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white">Create New Article</h1>
      </div>
      <CreatePostForm />
    </div>
  )
}
