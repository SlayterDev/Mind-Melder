import { useState, useEffect } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { weeklyReviewAPI, type WeeklyReview } from '../api/client';
import { Calendar, TrendingUp, Target, ArrowRight, Loader2, CheckCircle2, Clock, Sparkles, AlertCircle } from 'lucide-react';

export default function WeeklyReviewPage() {
  const [selectedReview, setSelectedReview] = useState<WeeklyReview | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

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
      setErrorMessage(null);
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3000);
      refetch();
    },
    onError: (error: any) => {
      console.error('Failed to generate weekly review:', error);
      setErrorMessage(error.message || 'Failed to generate review. Please try again.');
    },
  });

  useEffect(() => {
    if (latestReview && !selectedReview) {
      setSelectedReview(latestReview);
    }
  }, [latestReview]);

  const handleGenerate = async (forceRegenerate: boolean = false) => {
    setIsGenerating(true);
    setErrorMessage(null);
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
    <div className="max-w-4xl mx-auto px-4 md:px-0">
      {/* Card wrapper matching TodaySheet style */}
      <div className="sheet-card p-4 md:p-8 -mx-4 md:-mx-[50px]">
        {/* Header */}
        <div className={`mb-6 pb-4 section-divider ${isGenerating ? 'section-divider-generating' : ''}`}>
          <div className="flex flex-col md:flex-row items-start md:items-start justify-between gap-4">
            <div className="flex-1 flex flex-col">
              <h1 className="text-2xl md:text-3xl font-bold text-gray-100 mb-1">Weekly Review</h1>
              <p className="text-gray-400 text-sm font-serif italic">
                Reflect on your week and plan ahead
              </p>
            </div>
            <div className="flex gap-2">
              {isCurrentWeek && displayReview ? (
                <button
                  onClick={() => handleGenerate(true)}
                  disabled={isGenerating}
                  className={`btn-accent flex items-center gap-2 transition-all ${
                    isGenerating ? 'btn-generating' : ''
                  }`}
                >
                  {isGenerating ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Regenerating...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" />
                      Regenerate
                    </>
                  )}
                </button>
              ) : (
                <button
                  onClick={() => handleGenerate(false)}
                  disabled={isGenerating}
                  className={`btn-accent flex items-center gap-2 transition-all ${
                    isGenerating ? 'btn-generating' : ''
                  } ${showSuccess ? 'btn-success-flash' : ''}`}
                >
                  {isGenerating ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" />
                      Generate Review
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Success Message */}
        {showSuccess && (
          <div className="mb-4 summary-box flex items-center gap-2" style={{ borderColor: 'rgb(34 197 94 / 0.3)', backgroundColor: 'rgb(34 197 94 / 0.1)' }}>
            <CheckCircle2 className="w-5 h-5 text-green-400" />
            <span className="text-green-300">Weekly review generated successfully!</span>
          </div>
        )}

        {/* Error Message */}
        {errorMessage && (
          <div className="mb-4 summary-box flex items-center gap-2" style={{ borderColor: 'rgb(239 68 68 / 0.3)', backgroundColor: 'rgb(239 68 68 / 0.1)' }}>
            <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
            <span className="text-red-300">{errorMessage}</span>
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
          <div className="sheet-card-inner p-6 md:p-12 text-center">
            <Calendar className="w-16 h-16 mx-auto mb-4 text-gray-400" />
            <h3 className="text-xl font-semibold text-gray-100 mb-2">
              No Weekly Reviews Yet
            </h3>
            <p className="text-gray-400 mb-6">
              Generate your first weekly review to see insights about your productivity patterns.
            </p>
            <button
              onClick={() => handleGenerate(false)}
              disabled={isGenerating}
              className="btn-accent-lg flex items-center gap-2 mx-auto"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Sparkles className="w-5 h-5" />
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
            <div className="summary-box">
              <div className="flex items-center gap-2 text-sm text-gray-400 mb-2">
                <Calendar className="w-4 h-4" />
                <span>{getWeekLabel(displayReview.weekStartDate, displayReview.weekEndDate)}</span>
                {isCurrentWeek && (
                  <span className="badge-accent text-xs">
                    This Week
                  </span>
                )}
              </div>
              <h2 className="text-2xl font-bold text-gray-100 mb-3">Week Summary</h2>
              <p className="text-gray-200 leading-relaxed italic font-serif">
                {displayReview.summary}
              </p>
            </div>

            {/* Accomplishments */}
            <div className="animate-fade-in" style={{ animationDelay: '0ms' }}>
              <div className="sheet-card-inner p-6">
                <div className="flex items-center gap-2 mb-4">
                  <CheckCircle2 className="w-5 h-5 text-green-400" />
                  <h3 className="text-xl font-semibold text-gray-100">Accomplishments</h3>
                </div>
                <ul className="space-y-2">
                  {displayReview.insights.accomplishments.map((item, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                      <span className="text-green-400 mt-1">&#10003;</span>
                      <span className="text-gray-300">{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Patterns & Insights */}
            <div className="animate-fade-in" style={{ animationDelay: '150ms' }}>
              <div className="sheet-card-inner p-6">
                <div className="flex items-center gap-2 mb-4">
                  <TrendingUp className="w-5 h-5 text-accent" />
                  <h3 className="text-xl font-semibold text-gray-100">Patterns & Insights</h3>
                </div>

                {/* Completion Rate */}
                <div className="mb-4 p-4 rounded-lg" style={{ backgroundColor: 'rgb(114 97 175 / 0.1)', border: '1px solid rgb(114 97 175 / 0.2)' }}>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-md font-medium text-gray-300">Completion Rate</span>
                    <span className="text-xl font-semibold text-accent-highlight">
                      {displayReview.insights.patterns.completionRate}%
                    </span>
                  </div>
                  <div className="w-full rounded-full h-2" style={{ backgroundColor: 'rgb(114 97 175 / 0.2)' }}>
                    <div
                      className="h-2 rounded-full transition-all"
                      style={{ width: `${displayReview.insights.patterns.completionRate}%`, backgroundColor: '#7261af' }}
                    ></div>
                  </div>
                </div>

                {/* Top Categories */}
                {displayReview.insights.patterns.topCategories.length > 0 && (
                  <div className="mb-4">
                    <h4 className="text-sm font-medium text-gray-300 mb-2">Top Categories</h4>
                    <div className="flex flex-wrap gap-2">
                      {displayReview.insights.patterns.topCategories.map((category, idx) => (
                        <span key={idx} className="badge-accent">
                          {category}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Observations */}
                <div>
                  <h4 className="text-sm font-medium text-gray-300 mb-2">Observations</h4>
                  <ul className="space-y-2">
                    {displayReview.insights.patterns.observations.map((obs, idx) => (
                      <li key={idx} className="flex items-start gap-2">
                        <ArrowRight className="w-4 h-4 text-accent-arrow mt-1 flex-shrink-0" />
                        <span className="text-gray-300">{obs}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>

            {/* Carry Forward */}
            {displayReview.insights.carryForward.length > 0 && (
              <div className="animate-fade-in" style={{ animationDelay: '300ms' }}>
                <div className="sheet-card-inner p-6">
                  <div className="flex items-center gap-2 mb-4">
                    <Clock className="w-5 h-5 text-yellow-400" />
                    <h3 className="text-xl font-semibold text-gray-100">Carry Forward</h3>
                  </div>
                  <div className="space-y-3">
                    {displayReview.insights.carryForward.map((item, idx) => (
                      <div key={idx} className="p-3 rounded-lg" style={{ backgroundColor: 'rgb(234 179 8 / 0.1)', border: '1px solid rgb(234 179 8 / 0.2)' }}>
                        <p className="font-medium text-gray-100 mb-1">{item.content}</p>
                        <p className="text-sm text-gray-400 italic">{item.reason}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Recommendations */}
            <div className="animate-fade-in" style={{ animationDelay: '450ms' }}>
              <div className="sheet-card-inner p-6">
                <div className="flex items-center gap-2 mb-4">
                  <Target className="w-5 h-5 text-accent" />
                  <h3 className="text-xl font-semibold text-gray-100">Recommendations</h3>
                </div>
                <ul className="space-y-3">
                  {displayReview.insights.recommendations.map((rec, idx) => (
                    <li key={idx} className="flex items-start gap-2 p-3 rounded-lg" style={{ backgroundColor: 'rgb(114 97 175 / 0.1)', border: '1px solid rgb(114 97 175 / 0.15)' }}>
                      <span className="text-accent-highlight font-bold">#{idx + 1}</span>
                      <span className="text-gray-300">{rec}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        )}

        {/* Review History */}
        {reviewHistory && reviewHistory.reviews.length > 1 && (
          <div className="mt-6 sheet-card-inner p-6">
            <h3 className="text-lg font-semibold text-gray-100 mb-4">Past Reviews</h3>
            <div className="space-y-2">
              {reviewHistory.reviews.filter(r => r.id !== displayReview?.id).map((review) => (
                <button
                  key={review.id}
                  onClick={() => setSelectedReview(review)}
                  className="w-full text-left p-3 rounded-lg transition-colors flex items-center justify-between"
                  style={{ backgroundColor: 'transparent' }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgb(114 97 175 / 0.1)'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                >
                  <div>
                    <span className="text-sm font-medium text-gray-200">
                      {getWeekLabel(review.weekStartDate, review.weekEndDate)}
                    </span>
                    <p className="text-xs text-gray-500 mt-1">
                      <span className="text-accent-highlight">{review.insights.patterns.completionRate}%</span> completion rate
                    </p>
                  </div>
                  <ArrowRight className="w-4 h-4 text-accent-arrow" />
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
