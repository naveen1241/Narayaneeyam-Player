document.addEventListener('DOMContentLoaded', () => {
    const audioPlayer = document.getElementById('audio-player');
    const chapterSelect = document.getElementById('chapter-select');
    const playPauseBtn = document.getElementById('play-pause');
    const repeatChapterBtn = document.getElementById('repeat-chapter');
    const repeatSubsectionBtn = document.getElementById('repeat-subsection');
    const speedSelect = document.getElementById('speed-select');
    const volumeSlider = document.getElementById('volume-slider');
    const textContainer = document.getElementById('text-container');
    const toggleTransliterationBtn = document.getElementById('toggle-transliteration');

    let isPlaying = false;
    let isRepeatingChapter = false;
    let isRepeatingSubsection = false;
    let currentChapterText = null;
    let currentSubsectionCue = null;
    let currentCueElement = null;

    // New variables for handling transliteration
    let currentChapterContent = null;
    let currentTransliteratedContent = null;
    let isDisplayingTransliteration = false;

    // --- Part 1: Initial setup ---
    for (let i = 1; i <= 100; i++) {
        const option = document.createElement('option');
        const chapterNumber = String(i).padStart(3, '0');
        option.value = chapterNumber;
        option.textContent = `Dashakam ${i}`;
        chapterSelect.appendChild(option);
    }

    // --- Part 2: Dynamic text and audio loading ---
    async function loadChapterContent(chapterNumber) {
        const chapterPadded = String(chapterNumber).padStart(3, '0');
        const audioPath = `Audio_Sync_S_Verses_Only/Narayaneeyam_D${chapterPadded}.mp3`;
        audioPlayer.src = audioPath;
        audioPlayer.load();

        try {
            // Fetch both files simultaneously
            const [textResponse, translitResponse] = await Promise.all([
                fetch('narayaneeyam_text.html'),
                fetch('narayaneeyam_transliteration.html')
            ]);
            
            if (!textResponse.ok) throw new Error(`HTTP error! status: ${textResponse.status}`);
            if (!translitResponse.ok) throw new Error(`HTTP error! status: ${translitResponse.status}`);
            
            const [textHtml, translitHtml] = await Promise.all([
                textResponse.text(),
                translitResponse.text()
            ]);
            
            const tempDiv = document.createElement('div');
            const tempTranslitDiv = document.createElement('div');
            
            tempDiv.innerHTML = textHtml;
            tempTranslitDiv.innerHTML = translitHtml;

            const chapterTitleToSearch = `Narayaneeyam D${chapterPadded}`;
            
            let foundContent = { original: [], transliterated: [] };
            
            // Function to extract and store chapter content
            function extractChapterContent(tempContainer, contentArray) {
                const h2Elements = tempContainer.querySelectorAll('h2[data-chapter]');
                for (const h2 of h2Elements) {
                    if (h2.dataset.chapter.trim() === chapterTitleToSearch.trim()) {
                        contentArray.push(h2.outerHTML);
                        let nextSibling = h2.nextElementSibling;
                        while (nextSibling && nextSibling.tagName !== 'H2') {
                            contentArray.push(nextSibling.outerHTML);
                            nextSibling = nextSibling.nextElementSibling;
                        }
                        break;
                    }
                }
            }
            
            extractChapterContent(tempDiv, foundContent.original);
            extractChapterContent(tempTranslitDiv, foundContent.transliterated);
            
            currentChapterContent = foundContent.original;
            currentTransliteratedContent = foundContent.transliterated;

            if (currentChapterContent.length === 0) {
                console.warn(`[Parse] No content found for chapter ${chapterNumber}. Check chapter title matching.`);
            }

            // Initial display based on toggle state
            updateTextDisplay();
            
        } catch (error) {
            console.error('[Error] An error occurred during loading chapter content:', error);
            textContainer.innerHTML = `<p style="color:red;">Error loading text: ${error.message}</p>`;
            currentChapterText = [];
        }
        
        if (isPlaying) {
            audioPlayer.play();
        }
    }

    // Function to handle display updates
    function updateTextDisplay() {
        if (isDisplayingTransliteration) {
            textContainer.innerHTML = currentTransliteratedContent.join('');
            toggleTransliterationBtn.textContent = 'Display Sanskrit';
        } else {
            textContainer.innerHTML = currentChapterContent.join('');
            toggleTransliterationBtn.textContent = 'Display English Transliteration';
        }
        currentChapterText = textContainer.querySelectorAll('p[data-start]');
        
        // Force a re-evaluation of the current cue
        const event = new Event('timeupdate');
        audioPlayer.dispatchEvent(event);
    }

    // --- Part 3: Event Listeners and Logic ---
    chapterSelect.addEventListener('change', (e) => {
        loadChapterContent(e.target.value);
    });

    playPauseBtn.addEventListener('click', () => {
        if (isPlaying) {
            audioPlayer.pause();
            playPauseBtn.textContent = 'Play';
        } else {
            audioPlayer.play();
            playPauseBtn.textContent = 'Pause';
        }
        isPlaying = !isPlaying;
    });

    toggleTransliterationBtn.addEventListener('click', () => {
        isDisplayingTransliteration = !isDisplayingTransliteration;
        updateTextDisplay();
    });

    speedSelect.addEventListener('change', (e) => {
        audioPlayer.playbackRate = parseFloat(e.target.value);
    });

    volumeSlider.addEventListener('input', (e) => {
        audioPlayer.volume = parseFloat(e.target.value);
    });

    // Main synchronization logic
    audioPlayer.addEventListener('timeupdate', () => {
        const currentTime = audioPlayer.currentTime;
        
        if (!currentChapterText || currentChapterText.length === 0) {
            return;
        }
        
        let foundCue = false;
        for (const p of currentChapterText) {
            const startTime = parseTime(p.dataset.start);
            const endTime = parseTime(p.dataset.end);

            if (currentTime >= startTime && currentTime < endTime) {
                if (currentCueElement !== p) {
                    if (currentCueElement) {
                        currentCueElement.classList.remove('highlight');
                    }
                    p.classList.add('highlight');
                    currentCueElement = p;
                    currentSubsectionCue = p;
                }
                foundCue = true;
                break;
            }
        }
        
        if (!foundCue && currentCueElement) {
             currentCueElement.classList.remove('highlight');
             currentCueElement = null;
        }
        
        if (isRepeatingSubsection && currentSubsectionCue) {
            const endTime = parseTime(currentSubsectionCue.dataset.end);
            if (currentTime >= endTime) {
                audioPlayer.currentTime = parseTime(currentSubsectionCue.dataset.start);
            }
        }
    });

    // Add a seeked event listener to force a re-evaluation on seeking
    audioPlayer.addEventListener('seeked', () => {
        const event = new Event('timeupdate');
        audioPlayer.dispatchEvent(event);
    });
    
    repeatChapterBtn.addEventListener('click', () => {
        isRepeatingChapter = !isRepeatingChapter;
        repeatChapterBtn.classList.toggle('active', isRepeatingChapter);
    });

    audioPlayer.addEventListener('ended', () => {
        if (isRepeatingChapter) {
            audioPlayer.currentTime = 0;
            audioPlayer.play();
        } else {
            isPlaying = false;
            playPauseBtn.textContent = 'Play';
            if (currentCueElement) {
                currentCueElement.classList.remove('highlight');
                currentCueElement = null;
            }
        }
    });

    repeatSubsectionBtn.addEventListener('click', () => {
        isRepeatingSubsection = !isRepeatingSubsection;
        repeatSubsectionBtn.classList.toggle('active', isRepeatingSubsection);
    });
    
    // Helper function to convert time string to seconds
    function parseTime(timeStr) {
        if (!timeStr) return 0;
        
        const parts = timeStr.split(':');
        let hours = 0, minutes = 0, seconds = 0;

        if (parts.length === 3) {
            hours = parseInt(parts, 10) || 0;
            minutes = parseInt(parts, 10) || 0;
            seconds = parseFloat(parts) || 0;
        } else if (parts.length === 2) {
            minutes = parseInt(parts, 10) || 0;
            seconds = parseFloat(parts) || 0;
        } else if (parts.length === 1) {
            seconds = parseFloat(parts) || 0;
        }

        return hours * 3600 + minutes * 60 + seconds;
    }

    // Initial load
    loadChapterContent(chapterSelect.value);
});
