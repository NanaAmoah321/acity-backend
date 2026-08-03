function parseSearchIntent(query) {

    if (!query || typeof query !== "string") {
        return { parsed: false };
    }

    const original = query.trim();

    let text = original.toLowerCase();

    let sortBy = "relevance";
    let sortDirection = "desc";

    let minPrice = null;
    let maxPrice = null;

    // ------------------------
    // PRICE SORT
    // ------------------------

    if (/\b(cheap|cheapest|lowest|low price|budget)\b/.test(text)) {
        sortBy = "price";
        sortDirection = "asc";
    }

    if (/\b(expensive|highest|premium|costliest|most expensive)\b/.test(text)) {
        sortBy = "price";
        sortDirection = "desc";
    }

    // ------------------------
    // DATE SORT
    // ------------------------

    if (/\b(new|newest|latest|recent|recently added)\b/.test(text)) {
        sortBy = "created_at";
        sortDirection = "desc";
    }

    if (/\b(oldest|old)\b/.test(text)) {
        sortBy = "created_at";
        sortDirection = "asc";
    }

    // ------------------------
    // PRICE FILTERS
    // ------------------------

    let match;

    match = text.match(/under\s+(\d+)/);

    if (match) {
        maxPrice = Number(match[1]);
    }

    match = text.match(/below\s+(\d+)/);

    if (match) {
        maxPrice = Number(match[1]);
    }

    match = text.match(/less than\s+(\d+)/);

    if (match) {
        maxPrice = Number(match[1]);
    }

    match = text.match(/above\s+(\d+)/);

    if (match) {
        minPrice = Number(match[1]);
    }

    match = text.match(/over\s+(\d+)/);

    if (match) {
        minPrice = Number(match[1]);
    }

    match = text.match(/more than\s+(\d+)/);

    if (match) {
        minPrice = Number(match[1]);
    }

    // ------------------------
    // Remove filler words
    // ------------------------

    text = text.replace(/\b(show|find|need|want|looking|looking for|search|give me|please|can i get|where can i buy)\b/g, "");

    text = text.replace(/\b(cheap|cheapest|budget|lowest|low price|expensive|premium|highest|costliest|most expensive)\b/g, "");

    text = text.replace(/\b(new|newest|latest|recent|recently added|old|oldest)\b/g, "");

    text = text.replace(/\b(under|below|above|over|less than|more than)\s+\d+\b/g, "");

    text = text.replace(/\s+/g, " ").trim();

    if (!text) {
        return { parsed: false };
    }

    return {

        parsed: true,

        intent: {

            keywords: [text],

            sortBy,

            sortDirection,

            minPrice,

            maxPrice,

            explanation: ""

        }

    };

}

module.exports = {
    parseSearchIntent
};