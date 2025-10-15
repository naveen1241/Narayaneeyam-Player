document.addEventListener('DOMContentLoaded', () => {
    const audioPlayer = document.getElementById('audio-player');
    const chapterSelect = document.getElementById('chapter-select');
    const repeatChapterBtn = document.getElementById('repeat-chapter');
    const repeatSubsectionBtn = document.getElementById('repeat-subsection');
    const speedSelect = document.getElementById('speed-select');
    const textContainer = document.getElementById('text-container');
    const toggleTransliterationBtn = document.getElementById('toggle-transliteration');

    const prevVerseBtn = document.getElementById('prev-verse');
    const nextVerseBtn = document.getElementById('next-verse');
    const prevDashakamBtn = document.getElementById('prev-dashakam');
    const nextDashakamBtn = document.getElementById('next-dashakam');

    const customPlayPauseBtn = document.getElementById('custom-play-pause');
    const rewindBtn = document.getElementById('rewind-btn');
    const forwardBtn = document.getElementById('forward-btn');
    const muteBtn = document.getElementById('mute-btn');
    const volumeSlider = document.getElementById('volume-slider');

    let isRepeatingChapter = false;
    let isRepeatingSubsection = false;
    let currentChapterText = null;
    let currentSubsectionCue = null;
    let currentCueElement = null;
    let isMuted = false;

    let currentChapterContent = null;
    let currentTransliteratedContent = null;
    let isDisplayingTransliteration = false;

    for (let i = 1; i <= 100; i++) {
        const option = document.createElement('option');
        const chapterNumber = String(i).padStart(3, '0');
        option.value = chapterNumber;
        option.textContent = `Dashakam ${i}`;
        chapterSelect.appendChild(option);
    }

    async function loadChapterContent(chapterNumber) {
        const chapterPadded = String(chapterNumber).padStart(3, '0');
        const audioPath = `Audio_Sync_S_Verses_Only/Narayaneeyam_D${chapterPadded}.mp3`;
        audioPlayer.src = audioPath;
        audioPlayer.load();

        try {
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

            updateTextDisplay();
            
        } catch (error) {
            console.error('[Error] An error occurred during loading chapter content:', error);
            textContainer.innerHTML = `<p style="color:red;">Error loading text: ${error.message}</p>`;
            currentChapterText = [];
        }
    }

    function updateTextDisplay() {
        textContainer.innerHTML = '';
        const contentToDisplay = isDisplayingTransliteration ? currentTransliteratedContent : currentChapterContent;
        if (contentToDisplay) {
            textContainer.innerHTML = contentToDisplay.join('');
        }
        
        toggleTransliterationBtn.textContent = isDisplayingTransliteration ? 'Display Sanskrit' : 'Display English Transliteration';
        currentChapterText = textContainer.querySelectorAll('p[data-start]');
        
        setTimeout(() => {
            const event = new Event('timeupdate');
            audioPlayer.dispatchEvent(event);
        }, 50);
    }

    function seekToPreviousVerse() {
        if (!currentCueElement || !currentChapterText || currentChapterText.length < 2) return;
        
        const currentIndex = Array.from(currentChapterText).indexOf(currentCueElement);
        if (currentIndex > 0) {
            const previousCue = currentChapterText[currentIndex - 1];
            audioPlayer.currentTime = parseTime(previousCue.dataset.start);
            audioPlayer.play();
        } else {
            audioPlayer.currentTime = 0;
            audioPlayer.play();
        }
    }

    function seekToNextVerse() {
        if (!currentCueElement || !currentChapterText || currentChapterText.length < 2) return;
        
        const currentIndex = Array.from(currentChapterText).indexOf(currentCueElement);
        if (currentIndex < currentChapterText.length - 1) {
            const nextCue = currentChapterText[currentIndex + 1];
            audioPlayer.currentTime = parseTime(nextCue.dataset.start);
            audioPlayer.play();
        } else {
            audioPlayer.currentTime = 0;
            audioPlayer.play();
        }
    }

    function seekToPreviousDashakam() {
        let currentDashakam = parseInt(chapterSelect.value);
        if (currentDashakam > 1) {
            chapterSelect.value = String(currentDashakam - 1).padStart(3, '0');
            loadChapterContent(chapterSelect.value);
            audioPlayer.pause();
        }
    }

    function seekToNextDashakam() {
        let currentDashakam = parseInt(chapterSelect.value);
        if (currentDashakam < 100) {
            chapterSelect.value = String(currentDashakam + 1).padStart(3, '0');
            loadChapterContent(chapterSelect.value);
            audioPlayer.play();
        }
    }

    chapterSelect?.addEventListener('change', (e) => {
        loadChapterContent(e.target.value);
    });

    toggleTransliterationBtn?.addEventListener('click', () => {
        isDisplayingTransliteration = !isDisplayingTransliteration;
        updateTextDisplay();
    });

    speedSelect?.addEventListener('change', (e) => {
        audioPlayer.playbackRate = parseFloat(e.target.value);
    });

    prevVerseBtn?.addEventListener('click', seekToPreviousVerse);
    nextVerseBtn?.addEventListener('click', seekToNextVerse);
    prevDashakamBtn?.addEventListener('click', seekToPreviousDashakam);
    nextDashakamBtn?.addEventListener('click', seekToNextDashakam);

    repeatChapterBtn?.addEventListener('click', () => {
        isRepeatingChapter = !isRepeatingChapter;
        repeatChapterBtn.classList.toggle('active', isRepeatingChapter);
    });

    repeatSubsectionBtn?.addEventListener('click', () => {
        isRepeatingSubsection = !isRepeatingSubsection;
        repeatSubsectionBtn.classList.toggle('active', isRepeatingSubsection);
    });

    customPlayPauseBtn?.addEventListener('click', () => {
        if (audioPlayer.paused || audioPlayer.ended) {
            audioPlayer.play();
            customPlayPauseBtn.textContent = '⏸';
        } else {
            audioPlayer.pause();
            customPlayPauseBtn.textContent = '⏯';
        }
    });

    rewindBtn?.addEventListener('click', () => {
        audioPlayer.currentTime -= 5;
    });

    forwardBtn?.addEventListener('click', () => {
        audioPlayer.currentTime += 5;
    });

    muteBtn?.addEventListener('click', () => {
        audioPlayer.muted = !audioPlayer.muted;
        isMuted = audioPlayer.muted;
        muteBtn.textContent = isMuted ? '🔇' : '🔊';
        if (volumeSlider) {
            volumeSlider.value = isMuted ? 0 : 1;
        }
    });

    volumeSlider?.addEventListener('input', (e) => {
        audioPlayer.volume = parseFloat(e.target.value);
        audioPlayer.muted = audioPlayer.volume === 0;
        isMuted = audioPlayer.muted;
        muteBtn.textContent = isMuted ? '🔇' : '🔊';
    });

    audioPlayer.addEventListener('timeupdate', () => {
        if (!currentChapterText || currentChapterText.length === 0) {
            return;
        }
        
        currentChapterText.forEach(p => p.style.display = 'none');
        
        let foundCue = false;
        for (const p of currentChapterText) {
            const startTime = parseTime(p.dataset.start);
            const endTime = parseTime(p.dataset.end);

            if (audioPlayer.currentTime >= startTime && audioPlayer.currentTime < endTime) {
                p.style.display = 'block';
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
        
        if (!foundCue) {
             if (currentCueElement) {
                currentCueElement.classList.remove('highlight');
                currentCueElement = null;
             }
        }
        
        if (isRepeatingSubsection && currentSubsectionCue) {
            const endTime = parseTime(currentSubsectionCue.dataset.end);
            if (audioPlayer.currentTime >= endTime) {
                audioPlayer.currentTime = parseTime(currentSubsectionCue.dataset.start);
            }
        }
    });

    audioPlayer.addEventListener('ended', () => {
        if (isRepeatingChapter) {
            audioPlayer.currentTime = 0;
            audioPlayer.play();
        } else {
            const currentDashakam = parseInt(chapterSelect.value);
            if (currentDashakam < 100) {
                seekToNextDashakam();
            } else {
                if (currentCueElement) {
                    currentCueElement.classList.remove('highlight');
                    currentCueElement = null;
                }
                customPlayPauseBtn.textContent = '⏯';
            }
        }
    });

    function parseTime(timeStr) {
        if (!timeStr) return 0;
        
        const parts = timeStr.split(':');
        let hours = 0, minutes = 0, seconds = 0;

        if (parts.length === 3) {
            hours = parseInt(parts[0], 10) || 0;
            minutes = parseInt(parts[1], 10) || 0;
            seconds = parseFloat(parts[2]) || 0;
        } else if (parts.length === 2) {
            minutes = parseInt(parts[0], 10) || 0;
            seconds = parseFloat(parts[1]) || 0;
        } else if (parts.length === 1) {
            seconds = parseFloat(parts[0]) || 0;
        }

        return hours * 3600 + minutes * 60 + seconds;
    }

    loadChapterContent(chapterSelect.value);
});
