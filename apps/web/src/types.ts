/** A single page of a child's storybook (one row in the D1 table). */
export interface StoryPage {
  id: number;
  child_name: string;
  page_number: number;
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
