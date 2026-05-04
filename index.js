document.addEventListener('DOMContentLoaded', () => {
    const boardContainer = document.getElementById('boardContainer');
    const emptyState = document.getElementById('emptyState');
    const searchInput = document.getElementById('searchInput');
    const themeToggle = document.getElementById('themeToggle');
    
    const noteModal = document.getElementById('noteModal');
    const previewModal = document.getElementById('previewModal');
    const noteCloseBtn = noteModal.querySelector('.close-modal');
    const previewCloseBtn = previewModal.querySelector('.preview-close');
    const noteForm = document.getElementById('noteForm');
    const noteIdInput = document.getElementById('noteId');
    const noteTitleInput = document.getElementById('noteTitle');
    const noteContentInput = document.getElementById('noteContent');
    const noteCategoryInput = document.getElementById('noteCategory');
    const noteImageInput = document.getElementById('noteImage');
    const noteImageUrlInput = document.getElementById('noteImageUrl');
    const imagePreview = document.getElementById('imagePreview');
    const modalTitle = document.getElementById('modalTitle');
    const heroAddBtn = document.getElementById('heroAddBtn');
    const heroTotalCount = document.getElementById('heroTotalCount');
    const heroSavedCount = document.getElementById('heroSavedCount');
    const previewImage = document.getElementById('previewImage');
    const previewText = document.getElementById('previewText');
    const previewCategory = document.getElementById('previewCategory');
    const previewPinButton = document.getElementById('previewPinButton');
    const previewDownloadButton = document.getElementById('previewDownloadButton');
    const sortOrder = document.getElementById('sortOrder');
    const backToTop = document.getElementById('backToTop');
    let currentNoteColor = '#ffffff';
    let currentPreviewNoteId = null;
    
    let currentImageBase64 = null;
    
    const filterTags = document.querySelectorAll('.filter-tag');

    let notes = JSON.parse(localStorage.getItem('museboard_notes')) || [];
    let historyStack = [];
    let currentCategory = 'All';

    initTheme();
    renderNotes();

    // --- Theme ---
    function initTheme() {
        const saved = localStorage.getItem('theme');
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        const useDark = saved === 'dark' || (!saved && prefersDark);

        if (useDark) {
            document.documentElement.setAttribute('data-theme', 'dark');
            themeToggle.innerHTML = '<i class="fa-solid fa-sun"></i>';
            themeToggle.title = 'Switch to light mode';
        } else {
            document.documentElement.removeAttribute('data-theme');
            themeToggle.innerHTML = '<i class="fa-solid fa-moon"></i>';
            themeToggle.title = 'Switch to dark mode';
        }

        themeToggle.addEventListener('click', () => {
            if (document.documentElement.getAttribute('data-theme') === 'dark') {
                document.documentElement.removeAttribute('data-theme');
                localStorage.setItem('theme', 'light');
                themeToggle.innerHTML = '<i class="fa-solid fa-moon"></i>';
                themeToggle.title = 'Switch to dark mode';
            } else {
                document.documentElement.setAttribute('data-theme', 'dark');
                localStorage.setItem('theme', 'dark');
                themeToggle.innerHTML = '<i class="fa-solid fa-sun"></i>';
                themeToggle.title = 'Switch to light mode';
            }
        });
    }

    // --- Data ---
    function saveNotes(newNotes) {
        historyStack.push(JSON.stringify(notes));
        if (historyStack.length > 20) historyStack.shift();
        notes = newNotes;
        localStorage.setItem('museboard_notes', JSON.stringify(notes));
        renderNotes();
    }

    document.addEventListener('keydown', (e) => {
        if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
            e.preventDefault();
        }
        if (e.key.toLowerCase() === 'n' && !e.target.matches('input, textarea')) {
            e.preventDefault();
            openModal();
        }
    });

    // --- Filters ---
    filterTags.forEach(tag => {
        tag.addEventListener('click', () => {
            filterTags.forEach(t => t.classList.remove('active'));
            tag.classList.add('active');
            currentCategory = tag.getAttribute('data-cat');
            renderNotes();
        });
    });

    searchInput.addEventListener('input', () => renderNotes());
    sortOrder.addEventListener('change', () => renderNotes());
    heroAddBtn.addEventListener('click', () => openModal());
    previewCloseBtn.addEventListener('click', () => previewModal.classList.add('hidden-el'));
    previewModal.addEventListener('click', (event) => {
        if (event.target === previewModal) previewModal.classList.add('hidden-el');
    });

    previewPinButton.addEventListener('click', () => {
        if (!currentPreviewNoteId) return;
        const idx = notes.findIndex(n => n.id === currentPreviewNoteId);
        if (idx > -1) {
            const updated = [...notes];
            updated[idx] = { ...updated[idx], saved: !updated[idx].saved };
            saveNotes(updated);
            previewModal.classList.add('hidden-el');
        }
    });

    previewDownloadButton.addEventListener('click', () => {
        if (!currentPreviewNoteId) return;
        const note = notes.find(n => n.id === currentPreviewNoteId);
        if (note && note.image) {
            const link = document.createElement('a');
            link.href = note.image;
            link.download = `MuseBoard_pin_${note.id}.png`;
            link.click();
        }
    });

    window.addEventListener('scroll', () => {
        if (window.scrollY > 280) {
            backToTop.classList.add('visible');
            backToTop.classList.remove('hidden-el');
        } else {
            backToTop.classList.remove('visible');
            backToTop.classList.add('hidden-el');
        }
    });

    backToTop.addEventListener('click', () => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
    });

    // --- Rendering ---
    function renderNotes() {
        boardContainer.innerHTML = '';
        updateHeroStats();
        let filtered = notes;

        if (currentCategory !== 'All') {
            filtered = filtered.filter(n => n.category === currentCategory);
        }

        const term = searchInput.value.toLowerCase();
        if (term) {
            filtered = filtered.filter(n => n.content.toLowerCase().includes(term));
        }

        if (filtered.length === 0) {
            emptyState.classList.remove('hidden-el');
        } else {
            emptyState.classList.add('hidden-el');
            filtered.sort((a, b) => {
                if (sortOrder.value === 'old') return a.timestamp - b.timestamp;
                return b.timestamp - a.timestamp;
            });

            filtered.forEach(note => {
                const card = document.createElement('div');
                card.className = 'pin';
                card.style.backgroundColor = note.color;

                const hex = note.color.replace('#', '');
                const r = parseInt(hex.substr(0, 2), 16), g = parseInt(hex.substr(2, 2), 16), b = parseInt(hex.substr(4, 2), 16);
                const yiq = ((r * 299) + (g * 587) + (b * 114)) / 1000;
                const textColor = (yiq >= 128) ? '#2c2c2c' : '#ffffff';
                card.style.color = textColor;

                const imgHtml = note.image ? `<img src="${note.image}" alt="Note Image" class="pin-image">` : '';
                const titleHtml = note.title ? `<h3 class="pin-title">${escapeHTML(note.title)}</h3>` : '';

                card.innerHTML = `
                    <div class="pin-badge">${note.category || 'Other'}</div>
                    ${imgHtml}
                    ${titleHtml}
                    <div class="note-content">${escapeHTML(note.content)}</div>
                    <div class="pin-overlay">
                        <div></div>
                        <div class="action-buttons">
                            <button class="save-btn edit-btn" data-id="${note.id}" title="Edit"><i class="fa-solid fa-pen"></i></button>
                            ${note.image ? `<button class="save-btn save-img-btn ${note.saved ? 'saved' : ''}" data-id="${note.id}" title="${note.saved ? 'Unsave' : 'Save'}"><i class="fa-solid fa-bookmark"></i></button>` : ''}
                            ${note.image ? `<button class="save-btn download-img-btn" data-id="${note.id}" title="Download Image"><i class="fa-solid fa-download"></i></button>` : ''}
                            <button class="save-btn delete delete-btn" data-id="${note.id}" title="Delete"><i class="fa-solid fa-trash"></i></button>
                        </div>
                    </div>
                `;
                boardContainer.appendChild(card);
                const previewImageEl = card.querySelector('.pin-image');
                if (previewImageEl) {
                    previewImageEl.addEventListener('click', () => openPreview(note));
                }
            });

            document.querySelectorAll('.edit-btn').forEach(btn => btn.addEventListener('click', (e) => openModal(e.currentTarget.dataset.id)));
            document.querySelectorAll('.save-img-btn').forEach(btn => btn.addEventListener('click', (e) => {
                const idx = notes.findIndex(n => n.id === e.currentTarget.dataset.id);
                if (idx > -1) {
                    const updated = [...notes];
                    updated[idx] = { ...updated[idx], saved: !updated[idx].saved };
                    saveNotes(updated);
                }
            }));
            document.querySelectorAll('.download-img-btn').forEach(btn => btn.addEventListener('click', (e) => {
                const imgNote = notes.find(n => n.id === e.currentTarget.dataset.id);
                if (imgNote && imgNote.image) {
                    const link = document.createElement('a');
                    link.href = imgNote.image;
                    link.download = `MuseBoard_image_${imgNote.id}.png`;
                    link.click();
                }
            }));
            document.querySelectorAll('.delete-btn').forEach(btn => btn.addEventListener('click', (e) => {
                if (confirm('Delete note?')) saveNotes(notes.filter(n => n.id !== e.currentTarget.dataset.id));
            }));
        }
    }

    function updateHeroStats() {
        const savedCount = notes.filter(n => n.saved).length;
        heroTotalCount.textContent = notes.length;
        heroSavedCount.textContent = savedCount;
        if (previewPinButton) {
            previewPinButton.textContent = previewPinButton.textContent.includes('Unpin') ? 'Unpin' : 'Pin';
        }
    }

    function openPreview(note) {
        currentPreviewNoteId = note.id;
        previewImage.src = note.image || '';
        previewText.textContent = note.content;
        previewCategory.textContent = note.category ? note.category : 'Other';
        previewPinButton.innerHTML = note.saved ? '<i class="fa-solid fa-thumbtack"></i> Unpin' : '<i class="fa-solid fa-thumbtack"></i> Pin';
        previewModal.classList.remove('hidden-el');
    }

    function escapeHTML(str) {
        return str.replace(/[&<>'"]/g, tag => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;'}[tag] || tag));
    }

    // --- Modal ---
    function openModal(id = null) {
        noteImageInput.value = '';
        imagePreview.src = '';
        imagePreview.classList.add('hidden-el');
        currentImageBase64 = null;

        if (id) {
            const note = notes.find(n => n.id === id);
            if (note) {
                modalTitle.textContent = 'Edit Note';
                noteIdInput.value = note.id;
                noteTitleInput.value = note.title || '';
                noteContentInput.value = note.content;
                currentNoteColor = note.color;
                noteCategoryInput.value = note.category || 'Minimalist';
                if (note.image) {
                    imagePreview.src = note.image;
                    imagePreview.classList.remove('hidden-el');
                    currentImageBase64 = note.image;
                    if (!note.image.startsWith('data:image')) {
                        noteImageUrlInput.value = note.image;
                    } else {
                        noteImageUrlInput.value = '';
                    }
                }
            }
        } else {
            modalTitle.textContent = 'Add Note';
            noteIdInput.value = '';
            noteTitleInput.value = '';
            noteContentInput.value = '';
            noteCategoryInput.value = currentCategory !== 'All' ? currentCategory : 'Minimalist';
            noteImageInput.value = '';
            noteImageUrlInput.value = '';
            imagePreview.src = '';
            imagePreview.classList.add('hidden-el');
            const colors = ['#fdfcf8', '#ffe5d9', '#d8e2dc', '#fcd5ce', '#e8e8e4', '#ffffff'];
            currentNoteColor = colors[Math.floor(Math.random() * colors.length)];
        }
        noteModal.classList.remove('hidden');
        setTimeout(() => noteContentInput.focus(), 50);
    }

    noteCloseBtn.addEventListener('click', () => noteModal.classList.add('hidden'));

    noteImageInput.addEventListener('change', (e) => {
        noteImageUrlInput.value = '';
        const file = e.target.files[0];
        if (file) {
            if (file.size > 2 * 1024 * 1024) {
                alert("Please select an image smaller than 2MB to save space.");
                noteImageInput.value = '';
                return;
            }
            const reader = new FileReader();
            reader.onload = (ev) => {
                currentImageBase64 = ev.target.result;
                imagePreview.src = currentImageBase64;
                imagePreview.classList.remove('hidden-el');
            };
            reader.readAsDataURL(file);
        } else {
            currentImageBase64 = noteImageUrlInput.value.trim() || null;
            if (currentImageBase64) {
                imagePreview.src = currentImageBase64;
                imagePreview.classList.remove('hidden-el');
            } else {
                imagePreview.src = '';
                imagePreview.classList.add('hidden-el');
            }
        }
    });

    noteImageUrlInput.addEventListener('input', (e) => {
        if (e.target.value.trim()) {
            currentImageBase64 = e.target.value.trim();
            imagePreview.src = currentImageBase64;
            imagePreview.classList.remove('hidden-el');
            noteImageInput.value = '';
        } else if (!noteImageInput.files.length) {
            currentImageBase64 = null;
            imagePreview.src = '';
            imagePreview.classList.add('hidden-el');
        }
    });

    noteForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const id = noteIdInput.value;
        const content = noteContentInput.value.trim();
        if (!content && !currentImageBase64) return;

        let newNotes = [...notes];
        if (id) {
            const idx = newNotes.findIndex(n => n.id === id);
            if (idx > -1) newNotes[idx] = { ...newNotes[idx], title: noteTitleInput.value.trim(), content, color: currentNoteColor, category: noteCategoryInput.value, image: currentImageBase64, timestamp: Date.now() };
        } else {
            newNotes.push({ id: Date.now().toString(), title: noteTitleInput.value.trim(), content, color: currentNoteColor, category: noteCategoryInput.value, image: currentImageBase64, saved: false, timestamp: Date.now() });
        }

        saveNotes(newNotes);
        noteModal.classList.add('hidden');
    });
});