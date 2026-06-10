# Chrome Web Store Listing — Save to Compound

> Last Updated: 2026-06-05

## Store Listing

**Extension Name** [REQUIRED]
Save to Compound

**Short Description** [REQUIRED]
Save interesting articles to your Compound learning queue, with AI-generated review cards.

**Detailed Description** [REQUIRED]
Save to Compound is the official browser extension for Compound, a platform that turns what you want to learn into a spaced-repetition habit.

This extension makes it effortless to capture real-world content into your learning queue. When you find an interesting article, blog post, or tutorial, simply click the Compound icon to open the side panel. Choose the learning track you want to assign it to, set the cognitive difficulty, and hit save. 

The extension securely extracts the article's text and sends it to the Compound backend, where our AI instantly summarizes the content and generates personalized flashcards based on the material. These cards are automatically scheduled in your daily review queue using the Free Spaced Repetition Scheduler (FSRS) algorithm.

Privacy note: This extension only reads the content of the active tab when you explicitly open the side panel and click "Save Material". Data is sent directly to your Compound account and is never sold to third parties.

**Category** [REQUIRED]
Productivity

**Single Purpose** [REQUIRED]
Captures text from web articles to generate flashcards and save them to your Compound learning queue.

**Primary Language** [REQUIRED]
English

## Graphics & Assets

| Asset | Dimensions | Status | Filename |
|-------|-----------|--------|----------|
| Store Icon [REQUIRED] | 128×128 PNG | ✅ Ready | `extension/icons/icon-128.png` |
| Screenshot 1 [REQUIRED] | 1280×800 or 640×400 | ⬜ Not created | |
| Screenshot 2 [RECOMMENDED] | 1280×800 or 640×400 | ⬜ Not created | |

### Screenshot Notes
- **Screenshot 1:** Show a user reading a complex article (e.g., Wikipedia or a dev blog) with the "Save to Compound" side panel open, selecting a track.
- **Screenshot 2:** Show the Compound Web App with the newly generated flashcards appearing in the daily queue.

## Permissions Justification

| Permission | Type | Justification |
|------------|------|---------------|
| sidePanel | permissions | Needed to display the extension's user interface alongside the web content being read without navigating away. |
| tabs | permissions | Needed to read the current tab's title and URL to automatically populate the "Save" form when the user opens the side panel. |
| scripting | permissions | Needed to extract the article's text from the current page so it can be sent to the backend for AI flashcard generation when the user clicks "Save Material". |
| `<all_urls>` | host_permissions | Needed to allow the extension to extract the text content from any article the user is currently reading across the web. |
| `http://localhost:8000/*` | host_permissions | Needed to securely transmit the extracted text to the local Compound backend API for processing. (Note: this should be updated to the production URL before publishing). |

## Privacy & Data Use

### Data Collection

**Does the extension collect user data?** Yes

| Data Type | Collected? | Transmitted Off-Device? | Purpose | Shared with Third Parties? |
|-----------|-----------|------------------------|---------|---------------------------|
| Website content | Yes | Yes | To generate AI flashcards and save the reading material to the user's Compound account. | No |

### Data Use Certification
- [x] Data is NOT sold to third parties
- [x] Data is NOT used for purposes unrelated to the extension's core functionality
- [x] Data is NOT used for creditworthiness or lending purposes

## Privacy Policy
**Privacy Policy URL** [RECOMMENDED]
(Create a privacy policy on the Compound landing page and link it here)

## Version History

| Version | Date | Changes | Status |
|---------|------|---------|--------|
| 0.1.0 | 2026-06-05 | Initial release featuring side panel integration, track fetching, and content extraction. | Draft |
