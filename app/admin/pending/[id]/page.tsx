import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getSubmission } from '../actions';
import SubmissionReviewForm from './SubmissionReviewForm';

export const dynamic = 'force-dynamic';

export default async function ReviewSubmissionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  
  let submission;
  try {
    submission = await getSubmission(id);
  } catch (err) {
    console.error('Error fetching submission:', err);
    notFound();
  }

  if (!submission) {
    notFound();
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Review Submission</h1>
        <Link 
          href="/admin/pending" 
          className="px-4 py-2 bg-gray-600 rounded-lg hover:bg-gray-700 transition"
        >
          Back
        </Link>
      </div>

      <SubmissionReviewForm submission={submission} id={id} />
    </div>
  );
}
