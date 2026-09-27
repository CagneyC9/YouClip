console.log("YouTube Clipper loaded!");

const CLIP_VIEWER_BASE_URL =
    "https://cagneyc9.github.io/Youtube_Clip/";

if (window.__youtubeClipperInitialized) {
    console.log("YouTube Clipper already initialized.");
} else {
    window.__youtubeClipperInitialized = true;

    let startTime = null;
    let endTime = null;
    let currentVideoId = null;

    // -----------------------------
    // Helpers
    // -----------------------------

    const getVideo = () => document.querySelector("video");

    const getVideoId = () => {
        const params = new URLSearchParams(window.location.search);
        return params.get("v");
    };

    const isWatchPage = () => {
        return window.location.pathname === "/watch" && !!getVideoId();
    };

    const formatTime = (seconds) => {
        const totalSeconds = Math.floor(seconds);
        const hours = Math.floor(totalSeconds / 3600);
        const minutes = Math.floor((totalSeconds % 3600) / 60);
        const secs = totalSeconds % 60;

        if (hours > 0) {
            return `${hours}:${String(minutes).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
        }

        return `${minutes}:${String(secs).padStart(2, "0")}`;
    };

    const hasValidRange = () =>
        startTime !== null && endTime !== null && endTime > startTime;

    const buildClipUrl = () => {
        const videoId = getVideoId();

        if (!videoId) {
            return null;
        }

        const clipUrl = new URL(CLIP_VIEWER_BASE_URL);

        clipUrl.searchParams.set("v", videoId);
        clipUrl.searchParams.set("s", String(startTime));
        clipUrl.searchParams.set("e", String(endTime));

        return clipUrl;
    };

    // -----------------------------
    // Main Clip button
    // -----------------------------

    const clipActionButton = document.createElement("button");
    clipActionButton.id = "youtube-clipper-action";
    clipActionButton.type = "button";
    clipActionButton.title = "Create a clip";

    const clipActionContainer = document.createElement("div");
    clipActionContainer.className = "youtube-clipper-action-container";
    clipActionContainer.appendChild(clipActionButton);

    const scissorsIcon = document.createElement("img");
    scissorsIcon.src = chrome.runtime.getURL("scissors.svg");
    scissorsIcon.alt = "";
    scissorsIcon.className = "youtube-clipper-icon";

    const clipButtonText = document.createElement("span");
    clipButtonText.textContent = "Clip";
    clipButtonText.className = "youtube-clipper-action-text";

    clipActionButton.appendChild(scissorsIcon);
    clipActionButton.appendChild(clipButtonText);

    // -----------------------------
    // Popup ("Create clip" modal)
    // -----------------------------

    const MAX_CLIP_SECONDS = 60;

    let clipTitle = "";
    let videoDuration = 0;
    let draggingHandle = null;
    let loopIntervalId = null;

    const clipper = document.createElement("div");
    clipper.id = "youtube-clipper-root";

    const modalHeader = document.createElement("div");
    modalHeader.className = "youtube-clipper-modal-header";

    const modalHeaderTitle = document.createElement("span");
    modalHeaderTitle.textContent = "Create clip";

    const closeButton = document.createElement("button");
    closeButton.type = "button";
    closeButton.className = "youtube-clipper-close";
    closeButton.textContent = "×";
    closeButton.title = "Cancel";

    modalHeader.appendChild(modalHeaderTitle);
    modalHeader.appendChild(closeButton);

    const titleInput = document.createElement("input");
    titleInput.type = "text";
    titleInput.className = "youtube-clipper-title-input";
    titleInput.placeholder = "Add a title (optional)";
    titleInput.maxLength = 140;

    const timeRow = document.createElement("div");
    timeRow.className = "youtube-clipper-time-row";

    const startTimeInput = document.createElement("input");
    startTimeInput.type = "text";
    startTimeInput.className = "youtube-clipper-time-input";

    const timeSeparator = document.createElement("span");
    timeSeparator.className = "youtube-clipper-time-separator";
    timeSeparator.textContent = "–";

    const endTimeInput = document.createElement("input");
    endTimeInput.type = "text";
    endTimeInput.className = "youtube-clipper-time-input";

    timeRow.appendChild(startTimeInput);
    timeRow.appendChild(timeSeparator);
    timeRow.appendChild(endTimeInput);

    const track = document.createElement("div");
    track.className = "youtube-clipper-track";

    const trackFill = document.createElement("div");
    trackFill.className = "youtube-clipper-track-fill";

    const startHandle = document.createElement("div");
    startHandle.className = "youtube-clipper-handle youtube-clipper-handle-start";

    const endHandle = document.createElement("div");
    endHandle.className = "youtube-clipper-handle youtube-clipper-handle-end";

    track.appendChild(trackFill);
    track.appendChild(startHandle);
    track.appendChild(endHandle);

    const durationLabel = document.createElement("div");
    durationLabel.className = "youtube-clipper-duration";

    const modalFooter = document.createElement("div");
    modalFooter.className = "youtube-clipper-modal-footer";

    const cancelButton = document.createElement("button");
    cancelButton.type = "button";
    cancelButton.className = "youtube-clipper-cancel";
    cancelButton.textContent = "Cancel";

    const shareButton = document.createElement("button");
    shareButton.type = "button";
    shareButton.className = "youtube-clipper-share";
    shareButton.textContent = "Share clip";

    modalFooter.appendChild(cancelButton);
    modalFooter.appendChild(shareButton);

    clipper.appendChild(modalHeader);
    clipper.appendChild(titleInput);
    clipper.appendChild(timeRow);
    clipper.appendChild(track);
    clipper.appendChild(durationLabel);
    clipper.appendChild(modalFooter);

    // -----------------------------
    // Time <-> slider syncing
    // -----------------------------

    const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

    const parseTimeInput = (value) => {
        const parts = value.split(":").map((part) => Number(part));

        if (parts.some((part) => Number.isNaN(part))) {
            return null;
        }

        if (parts.length === 2) {
            return parts[0] * 60 + parts[1];
        }

        if (parts.length === 3) {
            return parts[0] * 3600 + parts[1] * 60 + parts[2];
        }

        return null;
    };

    const clampRange = () => {
        if (startTime === null || endTime === null || !videoDuration) {
            return;
        }

        startTime = clamp(startTime, 0, videoDuration);
        endTime = clamp(
            endTime,
            startTime + 0.5,
            Math.min(videoDuration, startTime + MAX_CLIP_SECONDS)
        );
    };

    const updateInputs = () => {
        startTimeInput.value =
            startTime === null ? "" : formatTime(startTime);

        endTimeInput.value =
            endTime === null ? "" : formatTime(endTime);
    };

    const updateDurationLabel = () => {
        if (!hasValidRange()) {
            durationLabel.textContent = "Drag the handles to choose a clip range";
            return;
        }

        durationLabel.textContent =
            `${(endTime - startTime).toFixed(1)} seconds`;
    };

    const updateTrackVisuals = () => {
        if (!videoDuration || startTime === null || endTime === null) {
            trackFill.style.left = "0%";
            trackFill.style.width = "0%";
            startHandle.style.left = "0%";
            endHandle.style.left = "0%";
            return;
        }

        const startPercent = (startTime / videoDuration) * 100;
        const endPercent = (endTime / videoDuration) * 100;

        trackFill.style.left = `${startPercent}%`;
        trackFill.style.width = `${endPercent - startPercent}%`;

        startHandle.style.left = `${startPercent}%`;
        endHandle.style.left = `${endPercent}%`;
    };

    const refreshUi = () => {
        updateInputs();
        updateTrackVisuals();
        updateDurationLabel();

        shareButton.disabled = !hasValidRange();
    };

    // -----------------------------
    // Loop preview while the modal is open
    // -----------------------------

    const stopLoopPreview = () => {
        if (loopIntervalId) {
            clearInterval(loopIntervalId);
            loopIntervalId = null;
        }
    };

    const startLoopPreview = () => {
        const video = getVideo();

        if (!video || !hasValidRange()) {
            return;
        }

        stopLoopPreview();

        video.currentTime = startTime;
        video.play();

        loopIntervalId = setInterval(() => {
            if (video.currentTime >= endTime) {
                video.currentTime = startTime;
            }
        }, 200);
    };

    // -----------------------------
    // Reset clip
    // -----------------------------

    const resetClip = () => {
        startTime = null;
        endTime = null;
        clipTitle = "";

        titleInput.value = "";

        stopLoopPreview();
        shareButton.textContent = "Share clip";

        refreshUi();

        console.log("Clip times reset.");
    };

    // -----------------------------
    // Clipboard helper
    // -----------------------------

    const copyToClipboard = async (text) => {
        if (navigator.clipboard && window.isSecureContext) {
            await navigator.clipboard.writeText(text);
            return;
        }

        const helper = document.createElement("textarea");

        helper.value = text;
        helper.setAttribute("readonly", "");
        helper.style.position = "fixed";
        helper.style.opacity = "0";

        document.body.appendChild(helper);

        helper.select();

        try {
            document.execCommand("copy");
        } finally {
            helper.remove();
        }
    };

    // -----------------------------
    // Auto-copy whenever the range becomes valid
    // -----------------------------

    const autoCopyClipLink = async () => {
        if (!hasValidRange()) {
            return;
        }

        const clipUrl = buildClipUrl();

        if (!clipUrl) {
            console.log("Could not find YouTube video ID.");
            return;
        }

        if (clipTitle.trim()) {
            clipUrl.searchParams.set("t", clipTitle.trim());
        }

        try {
            await copyToClipboard(clipUrl.toString());

            console.log("Copied:", clipUrl.toString());

            shareButton.textContent = "Copied!";

            setTimeout(() => {
                shareButton.textContent = "Share clip";
            }, 1500);
        } catch (error) {
            console.error("Clipboard copy failed:", error);
            shareButton.textContent = "Share clip";
        }
    };

    // -----------------------------
    // Title input
    // -----------------------------

    titleInput.addEventListener("input", () => {
        clipTitle = titleInput.value;
    });

    // -----------------------------
    // Manual time entry
    // -----------------------------

    startTimeInput.addEventListener("change", () => {
        const parsed = parseTimeInput(startTimeInput.value);

        if (parsed === null) {
            updateInputs();
            return;
        }

        startTime = parsed;
        clampRange();
        refreshUi();
        startLoopPreview();
        autoCopyClipLink();
    });

    endTimeInput.addEventListener("change", () => {
        const parsed = parseTimeInput(endTimeInput.value);

        if (parsed === null) {
            updateInputs();
            return;
        }

        endTime = parsed;
        clampRange();
        refreshUi();
        startLoopPreview();
        autoCopyClipLink();
    });

    // -----------------------------
    // Dragging the slider handles
    // -----------------------------

    const beginDrag = (which) => (event) => {
        event.preventDefault();
        draggingHandle = which;
        stopLoopPreview();

        document.addEventListener("pointermove", onDragMove);
        document.addEventListener("pointerup", onDragEnd);
    };

    const onDragMove = (event) => {
        if (!draggingHandle || !videoDuration) {
            return;
        }

        const rect = track.getBoundingClientRect();
        const ratio = clamp((event.clientX - rect.left) / rect.width, 0, 1);
        const time = ratio * videoDuration;
        const video = getVideo();

        if (draggingHandle === "start") {
            startTime = clamp(
                time,
                Math.max(0, endTime - MAX_CLIP_SECONDS),
                endTime - 0.5
            );

            if (video) {
                video.currentTime = startTime;
            }
        } else {
            endTime = clamp(
                time,
                startTime + 0.5,
                Math.min(videoDuration, startTime + MAX_CLIP_SECONDS)
            );

            if (video) {
                video.currentTime = endTime;
            }
        }

        refreshUi();
    };

    const onDragEnd = () => {
        draggingHandle = null;

        document.removeEventListener("pointermove", onDragMove);
        document.removeEventListener("pointerup", onDragEnd);

        startLoopPreview();
        autoCopyClipLink();
    };

    startHandle.addEventListener("pointerdown", beginDrag("start"));
    endHandle.addEventListener("pointerdown", beginDrag("end"));

    // Clicking the track jumps the nearest handle to that spot.
    track.addEventListener("pointerdown", (event) => {
        if (
            event.target === startHandle ||
            event.target === endHandle ||
            !videoDuration
        ) {
            return;
        }

        const rect = track.getBoundingClientRect();
        const ratio = clamp((event.clientX - rect.left) / rect.width, 0, 1);
        const time = ratio * videoDuration;

        const distanceToStart = Math.abs(time - startTime);
        const distanceToEnd = Math.abs(time - endTime);

        draggingHandle = distanceToStart <= distanceToEnd ? "start" : "end";
        onDragMove(event);
        onDragEnd();
    });

    // -----------------------------
    // Share clip
    // -----------------------------

    shareButton.onclick = async () => {
        if (!hasValidRange()) {
            return;
        }

        await autoCopyClipLink();
    };

    // -----------------------------
    // Open / close popup
    // -----------------------------

    const openModal = () => {
        const video = getVideo();

        if (!video) {
            console.log("No video element found.");
            return;
        }

        videoDuration = video.duration || 0;

        if (startTime === null) {
            startTime = video.currentTime;
        }

        if (endTime === null || endTime <= startTime) {
            endTime = Math.min(
                videoDuration || startTime + 15,
                startTime + 15
            );
        }

        clampRange();
        refreshUi();

        clipper.classList.add("youtube-clipper-open");

        startLoopPreview();
    };

    const closeModal = () => {
        clipper.classList.remove("youtube-clipper-open");
        stopLoopPreview();
        draggingHandle = null;
    };

    clipActionButton.onclick = (event) => {
        event.stopPropagation();

        const isOpen =
            clipper.classList.contains("youtube-clipper-open");

        if (isOpen) {
            closeModal();
            return;
        }

        openModal();
    };

    closeButton.onclick = (event) => {
        event.stopPropagation();
        closeModal();
    };

    cancelButton.onclick = (event) => {
        event.stopPropagation();
        closeModal();
        resetClip();
    };

    // Close popup when clicking somewhere else
    document.addEventListener("click", (event) => {
        if (
            !clipper.contains(event.target) &&
            !clipActionButton.contains(event.target)
        ) {
            closeModal();
        }
    });

    // -----------------------------
    // Insert button into YouTube
    // -----------------------------

    const insertClipButton = () => {
        if (!isWatchPage()) {
            return;
        }

        if (document.contains(clipActionContainer)) {
            return;
        }

        /*
         * YouTube's action buttons live around #actions-inner.
         * We first find the Share button so we can place Clip
         * immediately after it.
         */
        const actions = document.querySelector(
            "ytd-watch-metadata #top-level-buttons-computed"
        );

        if (!actions) {
            return;
        }

        // Look through buttons for YouTube's Share button.
        const buttons = Array.from(
            actions.querySelectorAll("button")
        );

        const shareButton = buttons.find((button) => {
            const label =
                button.getAttribute("aria-label") || "";

            const text =
                button.textContent || "";

            return (
                label.toLowerCase().includes("share") ||
                text.trim().toLowerCase() === "share"
            );
        });

        /*
         * YouTube wraps its buttons in several elements.
         * Insert beside Share inside YouTube's top-level action group.
         */
        if (shareButton) {
            const shareContainer = shareButton.closest(
                "ytd-button-renderer, ytd-toggle-button-renderer"
            );

            if (shareContainer && shareContainer.parentElement === actions) {
                shareContainer.insertAdjacentElement(
                    "afterend",
                    clipActionContainer
                );

                return;
            }
        }

        // Fallback if YouTube changes the Share button structure.
        actions.appendChild(clipActionContainer);
    };

   // -----------------------------
// Navigation handling
// -----------------------------

let actionsObserver = null;
let actionsCheckScheduled = false;
let actionsCheckIntervalId = null;

// Coalesce YouTube's frequent DOM mutations into a single check
// per animation frame.
const scheduleInsertClipButton = () => {
    if (actionsCheckScheduled) {
        return;
    }

    actionsCheckScheduled = true;

    requestAnimationFrame(() => {
        actionsCheckScheduled = false;
        insertClipButton();
    });
};

/*
 * YouTube is a SPA and progressively renders/replaces parts of the
 * watch page. Keep this observer alive for the lifetime of the
 * content script so the Clip button can be inserted whenever the
 * action bar becomes available.
 */
const watchForActions = () => {
    insertClipButton();

    if (!actionsObserver) {
        actionsObserver = new MutationObserver(scheduleInsertClipButton);

        actionsObserver.observe(document.body, {
            childList: true,
            subtree: true,
        });
    }

    // Safety net in case YouTube renders/replaces the action bar
    // without a mutation we care about.
    if (!actionsCheckIntervalId) {
        actionsCheckIntervalId = setInterval(() => {
            insertClipButton();
        }, 1500);
    }
};

const handleNavigation = () => {
    const newVideoId = getVideoId();

    // If we're not on a video page, remove our UI,
    // but DO NOT stop the observer.
    if (!isWatchPage()) {
        clipActionContainer.remove();
        closeModal();

        currentVideoId = null;
        resetClip();

        return;
    }

    // Reset clip state when navigating to a different video.
    if (currentVideoId !== newVideoId) {
        currentVideoId = newVideoId;

        resetClip();
        closeModal();

        console.log("Current video:", currentVideoId);
    }

    // YouTube may not have rendered the action bar yet.
    // The observer will keep trying, but also schedule a check now.
    scheduleInsertClipButton();
};

// -----------------------------
// Add popup to document
// -----------------------------

const initializeClipper = () => {
    if (!document.body) {
        return;
    }

    if (!document.body.contains(clipper)) {
        document.body.appendChild(clipper);
    }

    // Start watching YouTube's DOM once and leave the watcher active.
    watchForActions();

    // Handle whatever page we're currently on.
    handleNavigation();
};

if (document.readyState === "loading") {
    document.addEventListener(
        "DOMContentLoaded",
        initializeClipper,
        { once: true }
    );
} else {
    initializeClipper();
}

// YouTube SPA navigation
document.addEventListener(
    "yt-navigate-finish",
    handleNavigation
);

// -----------------------------
// Keyboard shortcuts
// -----------------------------

document.addEventListener("keydown", (event) => {
    const target = event.target;

    if (
        target instanceof HTMLElement &&
        (
            target.tagName === "INPUT" ||
            target.tagName === "TEXTAREA" ||
            target.isContentEditable
        )
    ) {
        return;
    }

    if (!isWatchPage()) {
        return;
    }

    const video = getVideo();

    if (!video) {
        return;
    }

    if (event.key.toLowerCase() === "s") {
        if (!clipper.classList.contains("youtube-clipper-open")) {
            openModal();
        }

        startTime = video.currentTime;
        clampRange();
        refreshUi();
        startLoopPreview();
        autoCopyClipLink();
    } else if (event.key.toLowerCase() === "e") {
        if (!clipper.classList.contains("youtube-clipper-open")) {
            openModal();
        }

        endTime = video.currentTime;
        clampRange();
        refreshUi();
        startLoopPreview();
        autoCopyClipLink();
    }
});
}