import { Review } from '@/modules/review/models/review.model';

export type RatingDistribution = Record<1 | 2 | 3 | 4 | 5, number>;

export interface RatingSummary {
  average: number;
  count: number;
  distribution: RatingDistribution;
}

export function buildRatingSummary(reviews: Pick<Review, 'rating'>[]): RatingSummary {
  const distribution: RatingDistribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  let total = 0;

  reviews.forEach((review) => {
    const rating = Number(review.rating);
    if (rating >= 1 && rating <= 5) {
      distribution[rating as keyof RatingDistribution] += 1;
      total += rating;
    }
  });

  const count = Object.values(distribution).reduce((sum, value) => sum + value, 0);

  return {
    average: count > 0 ? Number((total / count).toFixed(1)) : 0,
    count,
    distribution,
  };
}
