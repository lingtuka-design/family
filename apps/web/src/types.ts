/** A single page of a child's storybook (one row in the D1 table). */
export interface StoryPage {
  id: number;
  child_name: string;
  page_number: number;
  title: string;
  image_url: string;
  story_text: string;
  bg_color: string;
  created_at: string;
}

/** Summary used on the landing page to render one avatar per child. */
export interface ChildSummary {
  name: string;
  pageCount: number;
}

/** A child's book cover, shown on the home page (portrait 2:3). */
export interface BookCover {
  id: number;
  child_name: string;
  image_url: string;
  pageCount: number;
  created_at: string;
}
