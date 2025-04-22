// Reddit DOM selectors for various Reddit layouts
const redditSelectors = {
  // Selectors for posts
  posts: [
    // New Reddit
    'div[data-testid="post-container"]',
    'div.Post',
    // Old Reddit
    'div.thing[data-type="link"]',
    // More specific selectors
    'div[data-test-id="post-content"]',
    'div.scrollerItem',
    'div[data-adclicklocation="background"]',
    'shreddit-post'
  ].join(', '),
  
  // Selectors for post title
  postTitle: [
    // New Reddit
    'h1[data-testid="post-title"]',
    'h3[data-testid="post-title"]',
    '.Post h1',
    '.Post h3',
    // Old Reddit
    'p.title a.title',
    // Latest Reddit
    'shreddit-post h1',
    'shreddit-post h3'
  ].join(', '),
  
  // Selectors for post content
  postContent: [
    // New Reddit
    'div[data-testid="post-content"] p',
    'div.RichTextJSON-root',
    'div[data-click-id="text"] div',
    // Old Reddit
    'div.expando div.md',
    // Latest Reddit
    'shreddit-post div[data-adclicklocation="post_content"]',
    'shreddit-post div[slot="text-body"]'
  ].join(', ')
};

// Export the selectors
if (typeof module !== 'undefined') {
  module.exports = redditSelectors;
} 