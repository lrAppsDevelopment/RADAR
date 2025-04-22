// Configuration
const DEFAULT_API_ENDPOINT = 'http://localhost:5000/detect'; // Default, will be overridden by settings
const DEFAULT_AI_THRESHOLD = 0.7; // Default, will be overridden by settings

// Store settings
let extensionSettings = {
  enabled: true,
  aiThreshold: DEFAULT_AI_THRESHOLD,
  apiEndpoint: DEFAULT_API_ENDPOINT,
  completelyRemove: false, // Default setting for completely removing posts without banner
  skipShortContent: true // Default to skip API check for short content
};

// Reddit selectors for different layouts
const redditSelectors = {
  // Selectors for posts
  posts: [
    // New Reddit (Shreddit)
    'shreddit-post',
    'article shreddit-post',
    // Old Reddit selectors
    'div[data-testid="post-container"]',
    'div.Post',
    'div.thing[data-type="link"]'
  ].join(', '),
  
  // Selectors for post title
  postTitle: [
    // New Reddit (Shreddit)
    'a[slot="title"]',
    // Old selectors
    'h1[data-testid="post-title"]',
    'h3[data-testid="post-title"]',
    '.Post h1',
    '.Post h3',
    'p.title a.title'
  ].join(', '),
  
  // Selectors for post content
  postContent: [
    // New Reddit (Shreddit)
    'div[slot="text-body"]',
    'div[class*="post-rtjson-content"]',
    'div.md.feed-card-text-preview',
    // Old selectors
    'div[data-testid="post-content"] p',
    'div.RichTextJSON-root',
    'div[data-click-id="text"] div',
    'div.expando div.md'
  ].join(', ')
};

// Debug mode
const DEBUG = true;
function log(...args) {
    if (DEBUG) console.log("[AI-Filter]", ...args);
}

// More concise logging function for just basic status updates
function statusLog(message) {
    if (DEBUG) console.log(`[AI-Filter] ${message}`);
}

log("Reddit AI Content Filter extension loaded");

// Cache to avoid re-checking the same posts
const checkedPosts = new Set();

// Function to extract post content
function extractPostContent(postElement) {
    // Extract post ID to use as a key
    // For the new Reddit structure, use the post-id attribute if available
    const postId = postElement.getAttribute('post-id') || 
                   postElement.getAttribute('id') || 
                   postElement.getAttribute('data-post-id') || 
                   Math.random().toString(36).substring(2, 15);
    
    // Skip already checked posts
    if (checkedPosts.has(postId)) {
        return null;
    }
    
    log("Checking post element:", postElement.tagName, "ID:", postId);
    
    // Find the title and text content of the post
    const titleElement = postElement.querySelector(redditSelectors.postTitle);
    const contentElement = postElement.querySelector(redditSelectors.postContent);
    
    // Check for media content
    // 1. Direct images
    const hasImage = postElement.querySelector('img:not([alt=""], [alt*="avatar"], [alt*="icon"])') !== null ||
                     postElement.querySelector('a[href*=".jpg"], a[href*=".jpeg"], a[href*=".png"], a[href*=".gif"]') !== null;
    
    // 2. Reddit-specific image elements
    const hasRedditImage = postElement.querySelector('[data-testid="media-element"]') !== null || 
                          postElement.querySelector('shreddit-post[post-type="image"]') !== null ||
                          postElement.querySelector('div[data-click-id="image"]') !== null;
    
    // 3. Video elements
    const hasVideo = postElement.querySelector('video') !== null ||
                     postElement.querySelector('shreddit-post[post-type="video"]') !== null ||
                     postElement.querySelector('shreddit-player') !== null;
    
    // 4. External links
    const isExternalLink = postElement.querySelector('a[data-testid="outbound-link"]') !== null ||
                          (postElement.getAttribute('domain') && 
                           !postElement.getAttribute('domain').includes('self.'));
    
    const isMediaPost = hasImage || hasRedditImage || hasVideo || isExternalLink;
    
    log("Post elements:", 
        "ID:", postId, 
        "Title element:", titleElement ? "Found" : "Not found", 
        "Content element:", contentElement ? "Found" : "Not found",
        "Is media post:", isMediaPost ? "Yes" : "No");
    
    // For debugging - if elements weren't found, log more details
    if (!titleElement && !contentElement) {
        log("Skipping post - no title or content elements found");
        return null;
    }
    
    const title = titleElement ? titleElement.textContent.trim() : '';
    const content = contentElement ? contentElement.textContent.trim() : '';
    
    // Skip media posts without substantial text content
    if (isMediaPost && (!contentElement || content.length < 200)) {
        log("Skipping media post:", postId, "Title:", title.substring(0, 100));
        return null;
    }
    
    // Skip if there's not enough content overall (now using 400 chars as our threshold)
    const combinedContent = `${title} ${content}`.trim();
    if (combinedContent.length < 400) {
        log("Post content below 400 char threshold:", postId, "Title:", title.substring(0, 100), "Length:", combinedContent.length);
        
        // Mark as checked to avoid re-checking
        checkedPosts.add(postId);
        
        // Return the post data but mark it as below the character threshold
        return {
            element: postElement,
            id: postId,
            title: title,
            content: combinedContent,
            belowThreshold: true
        };
    }
    
    // Only process text-focused posts that have enough content for reliable analysis
    log("Processing text post with substantial content:", postId, "Title:", title.substring(0, 100));
    
    // Mark as checked
    checkedPosts.add(postId);
    
    log("Extracted content from post:", postId);
    log("Title:", title);
    log("Content size:", combinedContent.length, "characters");
    statusLog(`Complete content extracted from post and will be sent to the server for analysis`);
    
    return {
        element: postElement,
        id: postId,
        title: title,
        content: combinedContent,
        belowThreshold: false
    };
}

// Function to check if content is AI-generated
async function checkContent(content, title) {
    try {
        // For very short content (under 400 characters), immediately return as non-AI if the setting is enabled
        if (extensionSettings.skipShortContent && content.length < 400) {
            statusLog(`Content length (${content.length} chars) below 400 char threshold - skipping API check`);
            return {
                text: content,
                title: title,
                ai_probability: 0.05, // Very low probability
                is_ai_generated: false
            };
        }
        
        statusLog(`Sending post to API for analysis...`);
        
        // Set a timeout for the API request (5 seconds)
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000);
        
        const response = await fetch(extensionSettings.apiEndpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ 
                text: content,
                title: title 
            }),
            signal: controller.signal
        });
        
        // Clear the timeout
        clearTimeout(timeoutId);
        
        if (!response.ok) {
            const errorText = await response.text();
            statusLog(`API error: ${response.status} - ${errorText}`);
            throw new Error(`API error: ${response.status} - ${errorText}`);
        }
        
        const result = await response.json();
        
        // Override the server's threshold with our extension setting
        result.is_ai_generated = result.ai_probability > extensionSettings.aiThreshold;
        
        return result;
    } catch (error) {
        // Handle abort (timeout) specifically
        if (error.name === 'AbortError') {
            statusLog(`API request timed out after 5 seconds`);
            return { 
                error: 'API request timed out', 
                ai_probability: 0, 
                is_ai_generated: false 
            };
        }
        
        statusLog(`Error checking content: ${error.message}`);
        return { 
            error: error.message, 
            ai_probability: 0, 
            is_ai_generated: false 
        };
    }
}

// Function to handle a post
async function handlePost(postElement) {
    const postData = extractPostContent(postElement);
    if (!postData) {
        return Promise.resolve(); // Return resolved promise if no post data
    }
    
    // If the post is below the character threshold and skipShortContent is enabled, immediately handle it as human content
    if (postData.belowThreshold && extensionSettings.skipShortContent) {
        // Skip API check for short content (under 400 chars)
        const confidencePercent = 5; // Fixed 5% for short content
        
        log("Post automatically marked as human (below 400 char threshold):", postData.id, "Length:", postData.content.length);
        
        // For human content, add a small indicator showing the AI score
        const humanIndicator = document.createElement('div');
        humanIndicator.className = 'human-content-indicator';
        humanIndicator.textContent = `AI score: ${confidencePercent}% (< 400 chars)`;
        humanIndicator.style.color = '#666';
        humanIndicator.style.fontSize = '11px';
        humanIndicator.style.padding = '3px';
        humanIndicator.style.marginTop = '5px';
        humanIndicator.style.opacity = '0.7';
        humanIndicator.style.textAlign = 'right';
        
        // Find a good place to insert the indicator
        const targetElement = postElement.querySelector('.md') || 
                            postElement.querySelector('[data-test-id="post-content"]') ||
                            postElement.querySelector('[slot="text-body"]');
        
        if (targetElement) {
            targetElement.appendChild(humanIndicator);
        } else {
            postElement.appendChild(humanIndicator);
        }
        
        return Promise.resolve(); // Return resolved promise
    }
    
    // Add a loading indicator (make it more subtle)
    const loadingIndicator = document.createElement('div');
    loadingIndicator.className = 'ai-detector-loading';
    loadingIndicator.textContent = 'Checking content...';
    loadingIndicator.style.color = '#666';
    loadingIndicator.style.fontSize = '10px';
    loadingIndicator.style.padding = '3px';
    loadingIndicator.style.opacity = '0.6';
    postElement.appendChild(loadingIndicator);
    
    try {
        // Check the content
        const result = await checkContent(postData.content, postData.title);
        
        // Remove loading indicator
        loadingIndicator.remove();
        
        // If there was an error, return
        if (result.error) {
            statusLog(`Error processing post: ${result.error}`);
            return;
        }
        
        // Format concise browser log for quick reference
        const confidencePercent = Math.round(result.ai_probability * 100);
        const aiStatus = result.is_ai_generated ? "AI" : "HUMAN";
        statusLog(`Post "${postData.title.substring(0, 50)}..." → ${aiStatus} (${confidencePercent}%)`);
        
        // Only do something if it's AI-generated (over the threshold)
        if (result.is_ai_generated) {
            // Add a CSS class for styling
            postElement.classList.add('ai-generated-content');
            
            // Hide the post
            postElement.style.display = 'none';
            
            // If we want to completely remove the post without a banner
            if (extensionSettings.completelyRemove) {
                log("Post completely removed (no banner):", postData.id, "Title:", postData.title.substring(0, 100), "AI probability:", confidencePercent + "%");
                return; // Exit early without creating the banner
            }
            
            // Create a placeholder element
            const placeholder = document.createElement('div');
            placeholder.className = 'ai-content-removed';
            placeholder.style.padding = '12px';
            placeholder.style.margin = '10px 0';
            placeholder.style.backgroundColor = '#f0f7ff'; // Light blue background
            placeholder.style.borderRadius = '6px';
            placeholder.style.border = '1px solid #ccdcff';
            placeholder.style.boxShadow = '0 1px 3px rgba(0,0,0,0.08)';
            
            // Blue color for both text and button
            const blueColor = '#0079d3';
            
            // Calculate confidence percentage
            const confidencePercent = Math.round(result.ai_probability * 100);
            
            // Add placeholder text with option to show (without title)
            placeholder.innerHTML = `
                <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 8px;">
                    <span style="color: ${blueColor}; font-weight: 500; font-size: 14px;">
                        <svg width="16" height="16" viewBox="0 0 24 24" style="display: inline-block; vertical-align: middle; margin-right: 6px; fill: ${blueColor};">
                            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm-1-13h2v6h-2zm0 8h2v2h-2z"></path>
                        </svg>
                        AI-generated content filtered (${confidencePercent}% confidence)
                    </span>
                    <button class="show-ai-content" style="background: ${blueColor}; color: white; border: none; padding: 6px 12px; border-radius: 4px; cursor: pointer; font-weight: 500; transition: background-color 0.2s; display: flex; align-items: center; justify-content: center; min-width: 110px; text-align: center;">Show anyway</button>
                </div>
            `;
            
            // Insert the placeholder before the post
            postElement.parentNode.insertBefore(placeholder, postElement);
            
            log("Post hidden:", postData.id, "Title:", postData.title.substring(0, 100), "AI probability:", confidencePercent + "%");
            
            // Add event listener to show button
            const showButton = placeholder.querySelector('.show-ai-content');
            
            // Add hover effect
            showButton.addEventListener('mouseover', () => {
                showButton.style.backgroundColor = '#0062a8'; // Darker blue on hover
            });
            
            showButton.addEventListener('mouseout', () => {
                showButton.style.backgroundColor = blueColor; // Return to original blue
            });
            
            showButton.addEventListener('click', () => {
                postElement.style.display = '';
                placeholder.remove();
                log("Post shown after being hidden:", postData.id, "Title:", postData.title.substring(0, 100));
            });
        } else {
            // For human content, add a small indicator showing the AI score
            const humanIndicator = document.createElement('div');
            humanIndicator.className = 'human-content-indicator';
            humanIndicator.textContent = `AI score: ${confidencePercent}%`;
            humanIndicator.style.color = '#666';
            humanIndicator.style.fontSize = '11px';
            humanIndicator.style.padding = '3px';
            humanIndicator.style.marginTop = '5px';
            humanIndicator.style.opacity = '0.7';
            humanIndicator.style.textAlign = 'right';
            
            // Find a good place to insert the indicator
            const targetElement = postElement.querySelector('.md') || 
                                postElement.querySelector('[data-test-id="post-content"]') ||
                                postElement.querySelector('[slot="text-body"]');
            
            if (targetElement) {
                targetElement.appendChild(humanIndicator);
            } else {
                postElement.appendChild(humanIndicator);
            }
            
            log("Human content indicator added to post:", postData.id, "Title:", postData.title.substring(0, 100), "AI probability:", confidencePercent + "%");
        }
    } catch (error) {
        // Make sure to remove the loading indicator if there's an error
        loadingIndicator.remove();
        statusLog(`Error processing post: ${error.message}`);
    }
}

// Function to process all posts on the page
function processAllPosts() {
    // Get all posts on the page
    const posts = document.querySelectorAll(redditSelectors.posts);
    
    log("Posts found on page:", posts.length);
    
    // Process posts incrementally to improve perceived performance
    if (posts.length > 0) {
        // Create a queue of posts to process
        const postQueue = Array.from(posts);
        
        // Set up an intersection observer to prioritize visible posts
        const postVisibilityMap = new Map(); // Map to track visibility of posts
        
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                postVisibilityMap.set(entry.target, entry.isIntersecting);
            });
        }, {
            root: null, // viewport
            threshold: 0.1 // 10% visible
        });
        
        // Start observing all posts
        postQueue.forEach(post => {
            observer.observe(post);
            postVisibilityMap.set(post, false); // Initialize as not visible
        });
        
        // Wait a bit to let the intersection observer gather initial data
        setTimeout(() => {
            // Sort the queue based on visibility
            postQueue.sort((a, b) => {
                const aVisible = postVisibilityMap.get(a) || false;
                const bVisible = postVisibilityMap.get(b) || false;
                return (bVisible ? 1 : 0) - (aVisible ? 1 : 0);
            });
            
            // Process posts one at a time in sequence
            const processNextPost = () => {
                if (postQueue.length > 0) {
                    const post = postQueue.shift();
                    observer.unobserve(post); // Stop observing the post being processed
                    
                    handlePost(post).then(() => {
                        // Process next post after a small delay to allow UI to update
                        setTimeout(() => {
                            // Re-sort remaining posts before processing next
                            postQueue.sort((a, b) => {
                                const aVisible = postVisibilityMap.get(a) || false;
                                const bVisible = postVisibilityMap.get(b) || false;
                                return (bVisible ? 1 : 0) - (aVisible ? 1 : 0);
                            });
                            processNextPost();
                        }, 50);
                    }).catch(error => {
                        log("Error processing post:", error);
                        // Continue with next post even if there was an error
                        setTimeout(processNextPost, 50);
                    });
                } else {
                    // Disconnect observer when done
                    observer.disconnect();
                }
            };
            
            // Start processing the queue
            processNextPost();
        }, 300); // Short delay to collect visibility data
    }
}

// Main initialization function
async function initialize() {
  // First load settings
  await loadSettings();
  
  // Only proceed if extension is enabled
  if (!extensionSettings.enabled) {
    log("Extension is disabled in settings, not processing posts");
    return;
  }
  
  log("Extension is enabled, threshold set to:", extensionSettings.aiThreshold);
  log("Using API endpoint:", extensionSettings.apiEndpoint);
  
  // Process posts initially
  log("Starting initial post processing");
  setTimeout(processAllPosts, 1500); // Delay initial processing to let the page load

  // Set up a MutationObserver to handle dynamically loaded content
  log("Setting up MutationObserver");
  const observer = new MutationObserver((mutations) => {
      log("DOM mutations observed:", mutations.length);
      
      // Only process if extension is enabled
      if (!extensionSettings.enabled) return;
      
      // Create a queue of new posts to process
      const newPosts = [];
      
      // Collect all posts from mutations
      mutations.forEach((mutation) => {
          if (mutation.addedNodes.length) {
              mutation.addedNodes.forEach((node) => {
                  // Check if the added node is a post or contains posts
                  if (node.nodeType === Node.ELEMENT_NODE) {
                      if (node.matches(redditSelectors.posts)) {
                          log("New post detected via mutation");
                          newPosts.push(node);
                      } else {
                          const posts = node.querySelectorAll(redditSelectors.posts);
                          if (posts.length > 0) {
                              log("New posts found inside added node:", posts.length);
                              newPosts.push(...Array.from(posts));
                          }
                      }
                  }
              });
          }
      });
      
      // Process them sequentially with visibility prioritization
      if (newPosts.length > 0) {
          log("Processing", newPosts.length, "new posts from mutations");
          
          // Set up an intersection observer to prioritize visible posts
          const postVisibilityMap = new Map(); // Map to track visibility of posts
          
          const visibilityObserver = new IntersectionObserver((entries) => {
              entries.forEach(entry => {
                  postVisibilityMap.set(entry.target, entry.isIntersecting);
              });
          }, {
              root: null, // viewport
              threshold: 0.1 // 10% visible
          });
          
          // Start observing all posts
          newPosts.forEach(post => {
              visibilityObserver.observe(post);
              postVisibilityMap.set(post, false); // Initialize as not visible
          });
          
          // Wait a bit to let the intersection observer gather initial data
          setTimeout(() => {
              // Sort the queue based on visibility
              newPosts.sort((a, b) => {
                  const aVisible = postVisibilityMap.get(a) || false;
                  const bVisible = postVisibilityMap.get(b) || false;
                  return (bVisible ? 1 : 0) - (aVisible ? 1 : 0);
              });
              
              const processNextMutationPost = () => {
                  if (newPosts.length > 0) {
                      const post = newPosts.shift();
                      visibilityObserver.unobserve(post); // Stop observing the post being processed
                      
                      handlePost(post).then(() => {
                          // Process next post after a small delay to allow UI to update
                          setTimeout(() => {
                              // Re-sort remaining posts before processing next
                              newPosts.sort((a, b) => {
                                  const aVisible = postVisibilityMap.get(a) || false;
                                  const bVisible = postVisibilityMap.get(b) || false;
                                  return (bVisible ? 1 : 0) - (aVisible ? 1 : 0);
                              });
                              processNextMutationPost();
                          }, 50);
                      }).catch(error => {
                          log("Error processing mutation post:", error);
                          // Continue with next post even if there was an error
                          setTimeout(processNextMutationPost, 50);
                      });
                  } else {
                      // Disconnect observer when done
                      visibilityObserver.disconnect();
                  }
              };
              
              // Start processing the queue
              processNextMutationPost();
          }, 100); // Shorter delay since there are typically fewer mutation posts
      }
  });

  // Start observing
  observer.observe(document.body, {
      childList: true,
      subtree: true
  });
  log("MutationObserver started");
  
  // Listen for setting changes
  chrome.runtime.onMessage.addListener((message) => {
    if (message.type === 'settingsChanged') {
      log("Settings changed:", message.settings);
      extensionSettings = message.settings;
    }
  });
}

// Start the extension
initialize();

// Load settings from storage
function loadSettings() {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage({ type: 'getSettings' }, (settings) => {
      if (settings) {
        log("Loaded settings:", settings);
        extensionSettings = settings;
      } else {
        log("No settings found, using defaults");
      }
      resolve(extensionSettings);
    });
  });
} 