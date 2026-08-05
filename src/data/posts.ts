// Single source of truth for the blog. The listing grid (/blog), the post pages
// (/blog/[slug]) and the "More From Fibu Insights" row all read from here.
//
// Titles, read times and images come from the Figma "Blog Listing Page" frame
// 14526:10844. Slugs and categories are not in the design — categories are
// assigned from subject matter so the listing's filter pills have something to
// filter on, and slugs are derived from the titles.

export interface Post {
  slug: string;
  title: string;
  readTime: string;
  image: string;
  category: string;
}

/** Byline shown on the listing cards (Figma 14526:10844). */
export const CARD_AUTHOR = 'Priya Verma';

/**
 * Byline shown on a post page (Figma 14543:844). The design credits the article
 * to a different person than the card that links to it — that mismatch is in the
 * source file and is reproduced rather than silently reconciled.
 */
export const ARTICLE_AUTHOR = {
  name: 'John Abraham',
  role: 'Marketing Writer',
  avatar: '/images/post-author.png',
};

export const ARTICLE_DATE = { label: '17 June, 2024', iso: '2024-06-17' };

/** Full-bleed image behind every post's title block. */
export const ARTICLE_HERO = '/images/post-hero.png';

export const posts: Post[] = [
  {
    slug: 'learn-smarter-build-better',
    title: 'Learn Smarter, Build Better: Insights for Your Learning Journey',
    readTime: '5 min read',
    image: '/images/blog-1.png',
    category: 'Learning Habits',
  },
  {
    slug: 'build-a-learning-habit-that-lasts',
    title: 'How to Build a Learning Habit That Actually Lasts',
    readTime: '8 min read',
    image: '/images/blog-2.png',
    category: 'Learning Habits',
  },
  {
    slug: '7-ways-to-improve-your-programming-skills',
    title: '7 Ways to Improve Your Programming Skills',
    readTime: '8 min read',
    image: '/images/blog-3.png',
    category: 'Backend',
  },
  {
    slug: 'why-learning-with-others-helps-you-grow-faster',
    title: 'Why Learning With Others Can Help You Grow Faster',
    readTime: '8 min read',
    image: '/images/blog-4.png',
    category: 'Careers',
  },
  {
    slug: 'from-beginner-to-builder',
    title: 'From Beginner to Builder: Your Path to Becoming a Developer',
    readTime: '10 min read',
    image: '/images/blog-5.png',
    category: 'Careers',
  },
  {
    slug: 'how-to-stay-motivated-when-learning-gets-difficult',
    title: 'How to Stay Motivated When Learning Gets Difficult',
    readTime: '4 min read',
    image: '/images/blog-6.png',
    category: 'Learning Habits',
  },
  {
    slug: 'how-to-learn-faster-without-feeling-overwhelmed',
    title: 'How to Learn Faster Without Feeling Overwhelmed',
    readTime: '9 min read',
    image: '/images/blog-7.png',
    category: 'Learning Habits',
  },
  {
    slug: '5-simple-habits-every-successful-learner-should-build',
    title: '5 Simple Habits Every Successful Learner Should Build',
    readTime: '2 min read',
    image: '/images/blog-8.png',
    category: 'Learning Habits',
  },
  {
    slug: 'the-best-way-to-start-learning-programming',
    title: 'The Best Way to Start Learning Programming as a Beginner',
    readTime: '7 min read',
    image: '/images/blog-9.png',
    category: 'Frontend',
  },
  {
    slug: 'what-to-learn-before-your-first-coding-project',
    title: 'What Should You Learn Before Your First Coding Project?',
    readTime: '8 min read',
    image: '/images/blog-10.png',
    category: 'Frontend',
  },
  {
    slug: 'turning-your-knowledge-into-real-world-skills',
    title: 'Turning Your Knowledge Into Real-World Skills',
    readTime: '8 min read',
    image: '/images/blog-11.png',
    category: 'Careers',
  },
  {
    slug: 'how-challenges-make-you-a-better-learner',
    title: 'How Challenges Can Make You a Better Learner',
    readTime: '6 min read',
    image: '/images/blog-12.png',
    category: 'Backend',
  },
];

export const ALL_POSTS = 'All Posts';
export const categories = [ALL_POSTS, 'Backend', 'Frontend', 'Learning Habits', 'Careers'];
