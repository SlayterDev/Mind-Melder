import { useState, useEffect } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { weeklyReviewAPI, type WeeklyReview } from '../api/client';
import { Calendar, TrendingUp, Target, ArrowRight, Loader2, CheckCircle2, XCircle, Clock } from 'lucide-react';

export default function WeeklyReviewPage() {
  const [selectedReview, setSelectedReview] = useState<WeeklyReview | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  // Query for latest review
  const { data: latestReview, isLoading: loadingLatest, error: latestError, refetch } = useQuery({
    queryKey: ['weekly-review', 'latest'],
    queryFn: () => weeklyReviewAPI.getLatest(),
    retry: false,
  });

  // Query for review history
  const { data: reviewHistory, isLoading: loadingHistory } = useQuery({
    queryKey: ['weekly-review', 'list'],
    queryFn: () => weeklyReviewAPI.list(1, 10),
  });

  // Mutation for generating new review
  const generateMutation = useMutation({
    mutationFn: ({ forceRegenerate }: { forceRegenerate?: boolean }) => 
      weeklyReviewAPI.generate(undefined, forceRegenerate),
    onSuccess: (data) => {
      setSelectedReview(data.review);
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3000);
      refetch();
    },
    onError: (error: any) => {
      console.error('Failed to generate weekly review:', error);
      alert(`Failed to generate review: ${error.message}`);
    },
  });

  useEffect(() => {
    if (latestReview && !selectedReview) {
      setSelectedReview(latestReview);
    }
  }, [latestReview]);

  const handleGenerate = async (forceRegenerate: boolean = false) => {
    setIsGenerating(true);
    try {
      await generateMutation.mutateAsync({ forceRegenerate });
    } finally {
      setIsGenerating(false);
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const getWeekLabel = (startDate: string, endDate: string) => {
    return `${formatDate(startDate)} - ${formatDate(endDate)}`;
  };

  const displayReview = selectedReview || latestReview;
  const hasNoReview = !loadingLatest && !displayReview && !latestError;
  
  // Check if review contains current date
  const isCurrentWeek = displayReview ? (() => {
    const now = new Date();
    const start = new Date(displayReview.weekStartDate);
    const end = new Date(displayReview.weekEndDate);
    return now >= start && now <= end;
  })() : false;

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Weekly Review</h1>
          <p className="text-gray-600 mt-1">
            Reflect on your week and plan ahead
          </p>
        </div>
        <div className="flex gap-2">
          {isCurrentWeek && displayReview && (
            <button
              onClick={() => handleGenerate(true)}
              disabled={isGenerating}
              className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center gap-2 transition-colors"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Regenerating...
                </>
              ) : (
                <>
                  <TrendingUp className="w-4 h-4" />
                  Regenerate
                </>
              )}
            </button>
          )}
          <button
            onClick={() => handleGenerate(false)}
            disabled={isGenerating}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center gap-2 transition-colors"
          >
            {isGenerating ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <TrendingUp className="w-4 h-4" />
                Generate Review
              </>
            )}
          </button>
        </div>
      </div>

      {/* Success Message */}
      {showSuccess && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-center gap-2">
          <CheckCircle2 className="w-5 h-5 text-green-600" />
          <span className="text-green-800">Weekly review generated successfully!</span>
        </div>
      )}

      {/* Loading State */}
      {loadingLatest && !displayReview && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
        </div>
      )}

      {/* No Review State */}
      {hasNoReview && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
          <Calendar className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            No Weekly Reviews Yet
          </h2>
          <p className="text-gray-600 mb-6">
            Generate your first weekly review to see insights about your productivity patterns.
          </p>
          <button
            onClick={() => handleGenerate(false)}
            disabled={isGenerating}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed inline-flex items-center gap-2"
          >
            {isGenerating ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <TrendingUp className="w-5 h-5" />
                Generate Your First Review
              </>
            )}
          </button>
        </div>
      )}

      {/* Review Display */}
      {displayReview && (
        <div className="space-y-6">
          {/* Week Header */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center gap-2 text-sm text-gray-600 mb-2">
              <Calendar className="w-4 h-4" />
              <span>{getWeekLabel(displayReview.weekStartDate, displayReview.weekEndDate)}</span>
              {isCurrentWeek && (
                <span className="ml-2 px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded-full">
                  This Week
                </span>
              )}
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-3">Week Summary</h2>
            <p className="text-gray-700 leading-relaxed">
              {displayReview.summary}
            </p>
          </div>

          {/* Accomplishments */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center gap-2 mb-4">
              <CheckCircle2 className="w-5 h-5 text-green-600" />
              <h3 className="text-xl font-semibold text-gray-900">Accomplishments</h3>
            </div>
            <ul className="space-y-2">
              {displayReview.insights.accomplishments.map((item, idx) => (
                <li key={idx} className="flex items-start gap-2">
                  <span className="text-green-600 mt-1">✓</span>
                  <span className="text-gray-700">{item}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Patterns & Insights */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center gap-2 mb-4">
              <TrendingUp className="w-5 h-5 text-blue-600" />
              <h3 className="text-xl font-semibold text-gray-900">Patterns & Insights</h3>
            </div>
            
            {/* Completion Rate */}
            <div className="mb-4 p-4 bg-gray-50 rounded-lg">
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-medium text-gray-700">Completion Rate</span>
                <span className="text-2xl font-bold text-blue-600">
                  {displayReview.insights.patterns.completionRate}%
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-blue-600 h-2 rounded-full transition-all"
                  style={{ width: `${displayReview.insights.patterns.completionRate}%` }}
                ></div>
              </div>
            </div>

            {/* Top Categories */}
            {displayReview.insights.patterns.topCategories.length > 0 && (
              <div className="mb-4">
                <h4 className="text-sm font-medium text-gray-700 mb-2">Top Categories</h4>
                <div className="flex flex-wrap gap-2">
                  {displayReview.insights.patterns.topCategories.map((category, idx) => (
                    <span
                      key={idx}
                      className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm"
                    >
                      {category}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Observations */}
            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-2">Observations</h4>
              <ul className="space-y-2">
                {displayReview.insights.patterns.observations.map((obs, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <ArrowRight className="w-4 h-4 text-gray-400 mt-1 flex-shrink-0" />
                    <span className="text-gray-700">{obs}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Carry Forward */}
          {displayReview.insights.carryForward.length > 0 && (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center gap-2 mb-4">
                <Clock className="w-5 h-5 text-yellow-600" />
                <h3 className="text-xl font-semibold text-gray-900">Carry Forward</h3>
              </div>
              <div className="space-y-3">
                {displayReview.insights.carryForward.map((item, idx) => (
                  <div key={idx} className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <p className="font-medium text-gray-900 mb-1">{item.content}</p>
                    <p className="text-sm text-gray-600 italic">{item.reason}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Recommendations */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center gap-2 mb-4">
              <Target className="w-5 h-5 text-purple-600" />
              <h3 className="text-xl font-semibold text-gray-900">Recommendations</h3>
            </div>
            <ul className="space-y-3">
              {displayReview.insights.recommendations.map((rec, idx) => (
                <li key={idx} className="flex items-start gap-2 p-3 bg-purple-50 rounded-lg">
                  <span className="text-purple-600 font-bold">#{idx + 1}</span>
                  <span className="text-gray-700">{rec}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {/* Review History */}
      {reviewHistory && reviewHistory.reviews.length > 1 && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Past Reviews</h3>
          <div className="space-y-2">
            {reviewHistory.reviews.filter(r => r.id !== displayReview?.id).map((review) => (
              <button
                key={review.id}
                onClick={() => setSelectedReview(review)}
                className="w-full text-left p-3 rounded-lg hover:bg-gray-50 transition-colors flex items-center justify-between"
              >
                <div>
                  <span className="text-sm font-medium text-gray-900">
                    {getWeekLabel(review.weekStartDate, review.weekEndDate)}
                  </span>
                  <p className="text-xs text-gray-500 mt-1">
                    {review.insights.patterns.completionRate}% completion rate
                  </p>
                </div>
                <ArrowRight className="w-4 h-4 text-gray-400" />
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
