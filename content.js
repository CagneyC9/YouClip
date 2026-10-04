console.log("YouTube Clipper loaded!");

const CLIP_VIEWER_BASE_URL =
    "https://youclip.stream/";

if (window.__youtubeClipperInitialized) {
    console.log("YouTube Clipper already initialized.");
} else {
    window.__youtubeClipperInitialized = true;

    let startTime = null;
    let endTime = null;
    let currentVideoId = null;

    // Helper constants

    // Gets video element and ID
    const getVideo = () => document.querySelector("video");

    const getVideoId = () => {
        const params = new URLSearchParams(window.location.search);
        return params.get("v");
    };

    // Checks if user is on watch page
    const isWatchPage = () => {
        return window.location.pathname === "/watch" && !!getVideoId();
    };

    // Formats display time
    const formatTime = (seconds) => {
        const totalTenths = Math.round(seconds * 10);
        const hours = Math.floor(totalTenths / 36000);
        const minutes = Math.floor((totalTenths % 36000) / 600);
        const secs = Math.floor((totalTenths % 600) / 10);
        const tenths = totalTenths % 10;
        const secondsText = `${String(secs).padStart(2, "0")}.${tenths}`;

        if (hours > 0) {
            return `${hours}:${String(minutes).padStart(2, "0")}:${secondsText}`;
        }

        return `${minutes}:${secondsText}`;
    };

    // Checks if clip range is ok
    const hasValidRange = () =>
        startTime !== null && endTime !== null && endTime > startTime;

    const buildClipUrl = () => {
    const videoId = getVideoId();

    if (!videoId) {
        return null;
    }

    const clipUrl = new URL("watch", CLIP_VIEWER_BASE_URL);

    clipUrl.searchParams.set("v", videoId);
    clipUrl.searchParams.set("t", startTime.toFixed(1));
    clipUrl.searchParams.set("end", endTime.toFixed(1));

    return clipUrl;
};

    
    // Main Clip button
   

    const clipActionButton = document.createElement("button");
    clipActionButton.id = "youtube-clipper-action";
    clipActionButton.type = "button";
    clipActionButton.title = "Create a clip";

    const clipActionContainer = document.createElement("div");
    clipActionContainer.className = "youtube-clipper-action-container";
    clipActionContainer.appendChild(clipActionButton);

    // Icon for the button
    const scissorsIcon = document.createElement("img");
    scissorsIcon.src = chrome.runtime.getURL("scissors.svg");
    scissorsIcon.alt = "";
    scissorsIcon.className = "youtube-clipper-icon";

    const clipButtonText = document.createElement("span");
    clipButtonText.textContent = "Clip";
    clipButtonText.className = "youtube-clipper-action-text";

    clipActionButton.appendChild(scissorsIcon);
    clipActionButton.appendChild(clipButtonText);

   
    // Popup ("Create clip" modal)



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

const modalHeaderActions = document.createElement("div");
modalHeaderActions.className = "youtube-clipper-header-actions";

const settingsButton = document.createElement("button");
settingsButton.type = "button";
settingsButton.className = "youtube-clipper-settings-button";
settingsButton.textContent = "⚙";
settingsButton.title = "Settings";

const closeButton = document.createElement("button");
closeButton.type = "button";
closeButton.className = "youtube-clipper-close";
closeButton.textContent = "×";
closeButton.title = "Cancel";

modalHeaderActions.appendChild(settingsButton);
modalHeaderActions.appendChild(closeButton);

modalHeader.appendChild(modalHeaderTitle);
modalHeader.appendChild(modalHeaderActions);
    // Drag the panel by its header.
(() => {
    let drag = null;

    modalHeader.style.cursor = "grab";
    modalHeader.style.touchAction = "none";
    modalHeader.style.userSelect = "none";

    modalHeader.addEventListener("pointerdown", (event) => {
        if (
    event.button !== 0 ||
    closeButton.contains(event.target) ||
    settingsButton.contains(event.target)
) {
    return;
}

        const rect = clipper.getBoundingClientRect();

        drag = {
            pointerId: event.pointerId,
            offsetX: event.clientX - rect.left,
            offsetY: event.clientY - rect.top,
        };

        Object.assign(clipper.style, {
            position: "fixed",
            left: `${rect.left}px`,
            top: `${rect.top}px`,
            right: "auto",
            bottom: "auto",
            transform: "none",
            margin: "0",
        });

        modalHeader.setPointerCapture(event.pointerId);
        modalHeader.style.cursor = "grabbing";

        event.preventDefault();
        event.stopPropagation();
    });

    modalHeader.addEventListener("pointermove", (event) => {
        if (!drag || event.pointerId !== drag.pointerId) return;

        const rect = clipper.getBoundingClientRect();
        const maxLeft = Math.max(0, window.innerWidth - rect.width);
        const maxTop = Math.max(0, window.innerHeight - rect.height);

        clipper.style.left = `${Math.max(
            0,
            Math.min(event.clientX - drag.offsetX, maxLeft)
        )}px`;

        clipper.style.top = `${Math.max(
            0,
            Math.min(event.clientY - drag.offsetY, maxTop)
        )}px`;

        event.stopPropagation();
    });

    const finishDrag = () => {
        drag = null;
        modalHeader.style.cursor = "grab";
    };

    modalHeader.addEventListener("pointerup", finishDrag);
    modalHeader.addEventListener("pointercancel", finishDrag);
    modalHeader.addEventListener("lostpointercapture", finishDrag);
})();

//Settings
    const DEFAULT_SETTINGS = {
    defaultClipLength: 15,
    minimumClipLength: 5,
    decimalPlaces: 1
};
    let settings = { ...DEFAULT_SETTINGS };
    function loadSettings() {
    chrome.storage.local.get(DEFAULT_SETTINGS, (savedSettings) => {
        settings = savedSettings;
        refreshUi();
    });
}
loadSettings();

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

    startTimeInput.id = "youtube-clipper-start-time";
    endTimeInput.id = "youtube-clipper-end-time";

    const startLabel = document.createElement("label");
    startLabel.textContent = "Start";
    startLabel.htmlFor = startTimeInput.id;

    const endLabel = document.createElement("label");
    endLabel.textContent = "End";
    endLabel.htmlFor = endTimeInput.id;

    for (const label of [startLabel, endLabel]) {
        label.style.fontSize = "12px";
        label.style.color = "#aaa";
        label.style.flexShrink = "0";
    }

    timeRow.append(
        startLabel,
        startTimeInput,
        timeSeparator,
        endTimeInput,
        endLabel
    );

    const track = document.createElement("div");
    track.className = "youtube-clipper-track";

    const trackFill = document.createElement("div");
    trackFill.className = "youtube-clipper-track-fill";

    const startHandle = document.createElement("div");
    startHandle.className = "youtube-clipper-handle youtube-clipper-handle-start";
    startHandle.textContent = "S";

    const endHandle = document.createElement("div");
    endHandle.className = "youtube-clipper-handle youtube-clipper-handle-end";
    endHandle.textContent = "E";

    const sliderMinLabel = document.createElement("span");
sliderMinLabel.className = "youtube-clipper-slider-min";
sliderMinLabel.textContent = "0:00.0";

const sliderMaxLabel = document.createElement("span");
sliderMaxLabel.className = "youtube-clipper-slider-max";
sliderMaxLabel.textContent = "0:00.0";

    track.appendChild(trackFill);
    track.appendChild(startHandle);
    track.appendChild(endHandle);

    const playheadMarker = document.createElement("div");
    playheadMarker.className = "youtube-clipper-playhead";

    track.appendChild(playheadMarker);

    const durationLabel = document.createElement("div");
    durationLabel.className = "youtube-clipper-duration";

    const sliderInfoRow = document.createElement("div");
sliderInfoRow.className = "youtube-clipper-slider-info";

sliderInfoRow.appendChild(sliderMinLabel);
sliderInfoRow.appendChild(durationLabel);
sliderInfoRow.appendChild(sliderMaxLabel);

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

    const modalFooterActions = document.createElement("div");
    modalFooterActions.className = "youtube-clipper-modal-footer-actions";
    modalFooterActions.appendChild(cancelButton);
    modalFooterActions.appendChild(shareButton);


    modalFooter.appendChild(modalFooterActions);

    clipper.appendChild(modalHeader);
    clipper.appendChild(titleInput);
    clipper.appendChild(timeRow);
    clipper.appendChild(track);
    clipper.appendChild(sliderInfoRow);
    clipper.appendChild(modalFooter);

    
    // Time <-> slider syncing

    const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

    // The track shows a zoomed-in window around the clip instead of
    // the whole video, so handles stay usable on long videos.
    const TRACK_WINDOW_SECONDS = 180;

    let trackWindowStart = 0;
    let trackWindowSize = 0;

    const centerTrackWindow = (time) => {
        trackWindowSize = Math.min(videoDuration, TRACK_WINDOW_SECONDS) || 1;

        trackWindowStart = clamp(
            time - trackWindowSize / 2,
            0,
            Math.max(0, videoDuration - trackWindowSize)
        );
    };

    const timeToRatio = (time) =>
        clamp((time - trackWindowStart) / trackWindowSize, 0, 1);

    const ratioToTime = (ratio) => trackWindowStart + ratio * trackWindowSize;

    // Only re-center when the time actually falls outside the
    // current window, so typing/keyboard edits don't jump around.
    const ensureTrackWindowContains = (time) => {
        if (!trackWindowSize) {
            centerTrackWindow(time);
            return;
        }

        if (time < trackWindowStart || time > trackWindowStart + trackWindowSize) {
            centerTrackWindow(time);
        }
    };

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

    const minimumLength = Math.min(
        settings.minimumClipLength,
        videoDuration
    );

    startTime = clamp(startTime, 0, videoDuration - minimumLength);
    endTime = clamp(
        endTime,
        startTime + minimumLength,
        videoDuration
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
                `Duration: ${formatTime(endTime - startTime)}`;
    };

    const updateTrackVisuals = () => {
        if (!videoDuration || startTime === null || endTime === null) {
            trackFill.style.left = "0%";
            trackFill.style.width = "0%";
            startHandle.style.left = "0%";
            endHandle.style.left = "0%";
            return;
        }

        const startPercent = timeToRatio(startTime) * 100;
        const endPercent = timeToRatio(endTime) * 100;

        trackFill.style.left = `${startPercent}%`;
        trackFill.style.width = `${endPercent - startPercent}%`;

        startHandle.style.left = `${startPercent}%`;
        endHandle.style.left = `${endPercent}%`;
    };

    const updatePlayheadMarker = () => {
        const video = getVideo();

        if (!video || !videoDuration) {
            playheadMarker.style.display = "none";
            return;
        }

        const ratio = timeToRatio(video.currentTime);
        const isVisible = video.currentTime >= trackWindowStart &&
            video.currentTime <= trackWindowStart + trackWindowSize;

        playheadMarker.style.display = isVisible ? "block" : "none";
        playheadMarker.style.left = `${ratio * 100}%`;
    };

    const refreshUi = () => {
        updateInputs();
        updateTrackVisuals();
        updateDurationLabel();
        updatePlayheadMarker();
        

        shareButton.disabled = !hasValidRange();
        sliderMinLabel.textContent = formatTime(trackWindowStart);

sliderMaxLabel.textContent = formatTime(
    Math.min(trackWindowStart + trackWindowSize, videoDuration)
);
    };


    // Loop preview while the modal is open
  
    const stopLoopPreview = () => {
        if (loopIntervalId) {
            clearInterval(loopIntervalId);
            loopIntervalId = null;
        }
    };

    let playheadIntervalId = null;

    const stopPlayheadTracking = () => {
        if (playheadIntervalId) {
            clearInterval(playheadIntervalId);
            playheadIntervalId = null;
        }
    };

    const startPlayheadTracking = () => {
        stopPlayheadTracking();
        playheadIntervalId = setInterval(updatePlayheadMarker, 200);
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

   
    // Resets the clip


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

  
    // Clipboard helper
  

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

   
    // Auto-copy clip link when valid
   

    const autoCopyClipLink = async () => {
        if (!hasValidRange()) {
            return;
        }

        const clipUrl = buildClipUrl();

        if (!clipUrl) {
            console.log("Could not find YouTube video ID.");
            return;
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

 
    // Lets you title the clip

    titleInput.addEventListener("input", () => {
        clipTitle = titleInput.value;
    });

   
    // Lets you enter times manually
   

    startTimeInput.addEventListener("change", () => {
        const parsed = parseTimeInput(startTimeInput.value);

        if (parsed === null) {
            updateInputs();
            return;
        }

        startTime = parsed;
        clampRange();
        ensureTrackWindowContains(startTime);
        refreshUi();

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
        ensureTrackWindowContains(endTime);
        refreshUi();

        autoCopyClipLink();
    });

    
    // For dragging slider element

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
        const time = ratioToTime(ratio);
        const video = getVideo();


       

        if (draggingHandle === "start") {
            startTime = clamp(
                time,
                0,
                endTime - settings.minimumClipLength
            );

            if (video) {
                video.currentTime = startTime;
            }
        } else {
            endTime = clamp(
                time,
                startTime + settings.minimumClipLength,
                videoDuration
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


        autoCopyClipLink();
    };

    startHandle.addEventListener("pointerdown", beginDrag("start"));
    endHandle.addEventListener("pointerdown", beginDrag("end"));

// Drag the red marker to seek within the selected clip.
let playheadPointerId = null;

const seekFromPlayheadPointer = (event) => {
    const video = getVideo();

    if (!video || !hasValidRange()) {
        return;
    }

    const rect = track.getBoundingClientRect();

    if (rect.width <= 0 || !trackWindowSize) {
        return;
    }

    const ratio = clamp(
        (event.clientX - rect.left) / rect.width,
        0,
        1
    );

    const seekTime = clamp(
        ratioToTime(ratio),
        startTime,
        endTime
    );

    video.currentTime = seekTime;

    // Update immediately rather than waiting for the tracking interval.
    playheadMarker.style.display = "block";
    playheadMarker.style.left = `${timeToRatio(seekTime) * 100}%`;
};

const finishPlayheadDrag = () => {
    const pointerId = playheadPointerId;
    playheadPointerId = null;

    if (
        pointerId !== null &&
        playheadMarker.hasPointerCapture(pointerId)
    ) {
        playheadMarker.releasePointerCapture(pointerId);
    }

    updatePlayheadMarker();
};

const beginPlayheadDrag = (event) => {
    event.stopPropagation();

    if (
        event.button !== 0 ||
        playheadPointerId !== null ||
        draggingHandle ||
        !hasValidRange()
    ) {
        return;
    }

    const video = getVideo();

    if (!video) {
        return;
    }

    event.preventDefault();

    stopLoopPreview();
    video.pause();

    playheadPointerId = event.pointerId;
    playheadMarker.setPointerCapture(event.pointerId);

    seekFromPlayheadPointer(event);
};

playheadMarker.addEventListener("pointerdown", beginPlayheadDrag);

track.addEventListener("pointerdown", (event) => {
    // White handles continue to adjust the clip boundaries.
    if (
        startHandle.contains(event.target) ||
        endHandle.contains(event.target)
    ) {
        return;
    }

    beginPlayheadDrag(event);
});

playheadMarker.addEventListener("pointermove", (event) => {
    if (event.pointerId !== playheadPointerId) {
        return;
    }

    event.preventDefault();
    event.stopPropagation();
    seekFromPlayheadPointer(event);
});

playheadMarker.addEventListener("pointerup", (event) => {
    if (event.pointerId !== playheadPointerId) {
        return;
    }

    event.stopPropagation();
    seekFromPlayheadPointer(event);
    finishPlayheadDrag();
});

playheadMarker.addEventListener("pointercancel", (event) => {
    if (event.pointerId === playheadPointerId) {
        finishPlayheadDrag();
    }
});

playheadMarker.addEventListener("lostpointercapture", () => {
    if (playheadPointerId !== null) {
        finishPlayheadDrag();
    }
});
  
    // Sharing clip
   

    shareButton.onclick = async () => {
        if (!hasValidRange()) {
            return;
        }

        await autoCopyClipLink();
    };

   
    // Opening and closing the clipper modal


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
    videoDuration || startTime + settings.defaultClipLength,
    startTime + settings.defaultClipLength
);
        }

        clampRange();
        centerTrackWindow(startTime);
        refreshUi();

        clipper.classList.add("youtube-clipper-open");


        startPlayheadTracking();
    };

    const closeModal = () => {
        clipper.classList.remove("youtube-clipper-open");
        stopLoopPreview();
        stopPlayheadTracking();
        draggingHandle = null;
        finishPlayheadDrag();
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

   
    // Inserts button into YouTube UI


    const insertClipButton = () => {
        if (!isWatchPage()) {
            return;
        }

        if (document.contains(clipActionContainer)) {
            return;
        }

        // We find the share button in #actions-inner so we can place clip right after it
 
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

        // If Share not found, just append at end
        actions.appendChild(clipActionContainer);
    };


    // Handling navigation changes


    let actionsObserver = null;
    let actionsCheckScheduled = false;
    let actionsCheckIntervalId = null;

    // Single check per frame

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

 

    // Watch for action bar changes

    const watchForActions = () => {
        insertClipButton();

        if (!actionsObserver) {
            actionsObserver = new MutationObserver(scheduleInsertClipButton);

            actionsObserver.observe(document.body, {
                childList: true,
                subtree: true,
            });
        }

        // Safety net in case observer misses changes

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

 
        // Constantly try to insert the button

        scheduleInsertClipButton();
    };

    // Initialize clipper on page load

    const initializeClipper = () => {
        if (!document.body) {
            return;
        }

        if (!document.body.contains(clipper)) {
            document.body.appendChild(clipper);
        }

        // Start watching for action bar changes

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

    // Youtube navigation

    document.addEventListener(
        "yt-navigate-finish",
        handleNavigation
    );

    // Keyboard shortcuts

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
            ensureTrackWindowContains(startTime);
            refreshUi();

            autoCopyClipLink();
        } else if (event.key.toLowerCase() === "e") {
            if (!clipper.classList.contains("youtube-clipper-open")) {
                openModal();
            }

            endTime = video.currentTime;
            clampRange();
            ensureTrackWindowContains(endTime);
            refreshUi();

            autoCopyClipLink();
        }
    });
}
