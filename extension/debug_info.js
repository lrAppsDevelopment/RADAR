// Add this to your content.js at the top
console.log("Reddit AI Content Filter extension loaded");

// Add this inside the checkContent function to see what's being sent to the API
console.log("Checking content:", content.substring(0, 100) + "...");

// Add this right after the fetch call in checkContent:
console.log("API Response:", result);

// Add this to the handlePost function
console.log("Post found:", postData?.id);

// Add this inside processAllPosts
console.log("Posts found on page:", posts.length);

// Add this to check if the MutationObserver is working
console.log("MutationObserver started"); 