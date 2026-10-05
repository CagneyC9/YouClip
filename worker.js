export default {
    async fetch(request, env) {
        const url = new URL(request.url);

        // Handle YouClip watch links
        if (url.pathname === "/watch" || url.pathname === "/watch/") {
            return handleWatchPage(request, env, url);
        }

        // Everything else is served normally.
        return env.ASSETS.fetch(request);
    }
};

async function handleWatchPage(request, env, url) {
    const videoId = url.searchParams.get("v");
    const start = url.searchParams.get("t");
    const end = url.searchParams.get("end");

    // If this isn't a valid-looking clip URL,
    // just serve the normal watch page.
    if (
        !videoId ||
        !/^[\w-]{11}$/.test(videoId) ||
        start === null ||
        end === null
    ) {
        return env.ASSETS.fetch(request);
    }

    // Get the normal /watch/ HTML page.
    const watchUrl = new URL("/watch/", url.origin);
    const response = await env.ASSETS.fetch(
        new Request(watchUrl, request)
    );

    let html = await response.text();

    const thumbnail =
        `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;

    const description =
        `Watch this YouTube clip from ${formatTime(start)} to ${formatTime(end)} on YouClip`;

    const socialTags = `
        <meta property="og:site_name" content="YouClip">
        <meta property="og:title" content="YouClip">
        <meta property="og:description" content="${description}">
        <meta property="og:image" content="${thumbnail}">
        <meta property="og:type" content="website">

        <meta name="twitter:card" content="summary_large_image">
        <meta name="twitter:title" content="YouClip">
        <meta name="twitter:description" content="${description}">
        <meta name="twitter:image" content="${thumbnail}">
    `;

    // Remove the generic tags already in watch/index.html.
    html = html
        .replace(/<meta property="og:[^>]+>/g, "")
        .replace(/<meta name="twitter:[^>]+>/g, "");

    // Insert clip-specific metadata.
    html = html.replace("</head>", `${socialTags}</head>`);

    return new Response(html, {
        status: response.status,
        headers: {
            "Content-Type": "text/html; charset=UTF-8"
        }
    });
}

function formatTime(value) {
    const seconds = Math.max(0, Number(value) || 0);
    const minutes = Math.floor(seconds / 60);
    const remainder = Math.floor(seconds % 60);

    return `${minutes}:${String(remainder).padStart(2, "0")}`;
}