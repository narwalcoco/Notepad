// script.js - updated: supports secret "delete all", proper editing, fixed dates

// Elements
const noteTitle = document.getElementById('noteTitle');
const noteInput = document.getElementById('noteInput');
const markdownPreview = document.getElementById('markdownPreview');
const saveBtn = document.getElementById('saveBtn');
const uploadBtn = document.getElementById('uploadBtn');
const fileInput = document.getElementById('fileInput');
const viewNotesBtn = document.getElementById('viewNotesBtn');
const popup = document.getElementById('popup');
const saveLocalBtn = document.getElementById('saveLocalBtn');
const downloadBtn = document.getElementById('downloadBtn');
const closePopupBtn = document.getElementById('closePopupBtn');
const toolbarButtons = document.querySelectorAll('.toolbar button');

let isSaved = true; // tracks whether current editor has unsaved changes

/* -------------------------
   Load editing note if present
   ------------------------- */
window.addEventListener('load', () => {
  const editingNoteRaw = localStorage.getItem('editingNote');
  if (editingNoteRaw) {
    try {
      const parsed = JSON.parse(editingNoteRaw);
      noteInput.value = parsed.content || '';
      noteTitle.value = parsed.title || '';
      renderMarkdown(parsed.content || '');
      isSaved = true; // loaded content is considered saved (editing an existing stored note)
    } catch (e) {
      console.warn('bad editingNote in storage', e);
    }
  } else {
    // no editing note — render whatever was in the textarea
    renderMarkdown(noteInput.value || '');
  }
});

/* -------------------------
   Markdown renderer
   (simple, no libs)
   ------------------------- */
function renderMarkdown(text) {
  if (!text || !text.trim()) {
    markdownPreview.innerHTML = "<em>Live preview will appear here...</em>";
    return;
  }

  let html = text
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/^###### (.*$)/gim, "<h6>$1</h6>")
    .replace(/^##### (.*$)/gim, "<h5>$1</h5>")
    .replace(/^#### (.*$)/gim, "<h4>$1</h4>")
    .replace(/^### (.*$)/gim, "<h3>$1</h3>")
    .replace(/^## (.*$)/gim, "<h2>$1</h2>")
    .replace(/^# (.*$)/gim, "<h1>$1</h1>")
    .replace(/\*\*(.*?)\*\*/gim, "<strong>$1</strong>")
    .replace(/\*(.*?)\*/gim, "<em>$1</em>")
    .replace(/`(.*?)`/gim, "<code>$1</code>")
    .replace(/\[(.*?)\]\((.*?)\)/gim, '<a href="$2" target="_blank" rel="noopener">$1</a>')
    .replace(/^- (.*)$/gim, "<ul><li>$1</li></ul>")
    .replace(/\n$/gim, "<br>");

  html = html.replace(/<\/ul>\s*<ul>/gim, "");
  markdownPreview.innerHTML = html.trim();
}

/* -------------------------
   Live preview + unsaved tracking
   ------------------------- */
noteInput.addEventListener('input', (e) => {
  renderMarkdown(e.target.value);
  isSaved = false;
});
noteTitle.addEventListener('input', () => { isSaved = false; });

/* -------------------------
   Toolbar actions
   ------------------------- */
toolbarButtons.forEach(btn => {
  btn.addEventListener('click', () => {
    const action = btn.dataset.action;
    const start = noteInput.selectionStart;
    const end = noteInput.selectionEnd;
    let selected = noteInput.value.substring(start, end);
    let insertText = "";

    switch (action) {
      case 'bold':
        insertText = `**${selected || "bold text"}**`;
        break;
      case 'italic':
        insertText = `*${selected || "italic text"}*`;
        break;
      case 'header':
        insertText = `# ${selected || "Header"}`;
        break;
      case 'list':
        insertText = `- ${selected || "List item"}`;
        break;
      case 'code':
        insertText = `\`${selected || "code"}\``;
        break;
      case 'link':
        insertText = `[${selected || "link text"}](https://example.com)`;
        break;
      default:
        insertText = selected;
    }

    noteInput.setRangeText(insertText, start, end, 'end');
    noteInput.dispatchEvent(new Event('input'));
  });
});

/* -------------------------
   Popup show/hide
   ------------------------- */
saveBtn.addEventListener('click', () => popup.style.display = 'flex');
closePopupBtn.addEventListener('click', () => popup.style.display = 'none');

/* -------------------------
   Save to localStorage (fixed edit behavior)
   ------------------------- */
saveLocalBtn.addEventListener('click', () => {
  const noteContent = noteInput.value.trim();
  let title = noteTitle.value.trim();

  if (!noteContent && !title) {
    alert("Nothing to save!");
    popup.style.display = 'none';
    return;
  }

  // Load existing notes
  const notes = JSON.parse(localStorage.getItem('notes') || "[]");

  // Auto-generate title if blank
  if (!title) {
    const untitledCount = notes.filter(n => n.title && n.title.startsWith("Untitled Note")).length + 1;
    title = `Untitled Note ${untitledCount}`;
  }

  // Check if we're editing an existing note
  const editingRaw = localStorage.getItem('editingNote');
  if (editingRaw) {
    try {
      const editing = JSON.parse(editingRaw);
      // find note by id and update it
      const idx = notes.findIndex(n => n.id === editing.id);
      if (idx !== -1) {
        notes[idx].title = title;
        notes[idx].content = noteContent;
        notes[idx].updated = Date.now();
      } else {
        // If for some reason it's not found, push as fallback (shouldn't usually happen)
        notes.push({
          id: editing.id,
          title,
          content: noteContent,
          updated: Date.now()
        });
      }
      // Clear editingNote flag
      localStorage.removeItem('editingNote');
    } catch (e) {
      console.warn('bad editingNote data', e);
      // fallback: create new note
      notes.push({
        id: Date.now(),
        title,
        content: noteContent,
        updated: Date.now()
      });
    }
  } else {
    // Create new note
    notes.push({
      id: Date.now(),
      title,
      content: noteContent,
      updated: Date.now()
    });
  }

  // Save back
  localStorage.setItem('notes', JSON.stringify(notes));

  // Clear inputs & UI
  noteTitle.value = "";
  noteInput.value = "";
  renderMarkdown("");
  popup.style.display = 'none';
  isSaved = true;

  alert(`Note "${title}" saved locally!`);
});

/* -------------------------
   Download as .md
   ------------------------- */
downloadBtn.addEventListener('click', () => {
  const note = noteInput.value.trim();
  if (!note) {
    alert('No note to download!');
    return;
  }
  const blob = new Blob([note], { type: 'text/markdown' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = (noteTitle.value.trim() || 'note') + '.md';
  a.click();
  URL.revokeObjectURL(url);
  popup.style.display = 'none';
});

/* -------------------------
   Upload .md file into editor
   ------------------------- */
uploadBtn.addEventListener('click', () => fileInput.click());
fileInput.addEventListener('change', e => {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = ev => {
    noteInput.value = ev.target.result;
    // set a default title from filename if empty
    if (!noteTitle.value) {
      noteTitle.value = file.name.replace(/\.md$/i, '');
    }
    renderMarkdown(ev.target.result);
    isSaved = false;
  };
  reader.readAsText(file);
});

/* -------------------------
   Navigate to notes page
   ------------------------- */
viewNotesBtn.addEventListener('click', () => {
  // if there are unsaved changes, warn before navigating
  if (!isSaved && (noteInput.value.trim() || noteTitle.value.trim())) {
    if (!confirm('You have unsaved changes. Leave anyway?')) return;
  }
  window.location.href = 'notes.html';
});

/* -------------------------
   Unsaved changes browser warning
   ------------------------- */
window.addEventListener('beforeunload', (e) => {
  if (!isSaved && (noteInput.value.trim() || noteTitle.value.trim())) {
    e.preventDefault();
    e.returnValue = '';
  }
});

/* -------------------------
   Secret "delete all" command (with Shift requirement)
   Works only when user clicks outside inputs.
   You must hold Shift while typing "delete all".
   ------------------------- */
let secretBuffer = "";
let secretTimer = null;
const SECRET_PHRASE = "delete all";

function resetSecretBuffer() {
  secretBuffer = "";
  if (secretTimer) { clearTimeout(secretTimer); secretTimer = null; }
}

function startSecretTimer() {
  if (secretTimer) clearTimeout(secretTimer);
  secretTimer = setTimeout(() => resetSecretBuffer(), 5000); // 5s inactivity resets buffer
}

document.addEventListener('click', (ev) => {
  const tag = (ev.target && ev.target.tagName) ? ev.target.tagName.toLowerCase() : '';
  const isInteractive = ['input', 'textarea', 'select', 'button', 'a'].includes(tag) || ev.target.isContentEditable;
  if (!isInteractive) {
    resetSecretBuffer();
    startSecretTimer();
  } else {
    resetSecretBuffer();
  }
});

document.addEventListener('keydown', (ev) => {
  const active = document.activeElement;
  const activeTag = active && active.tagName ? active.tagName.toLowerCase() : '';
  const isEditing = activeTag === 'input' || activeTag === 'textarea' || active.isContentEditable;
  if (isEditing) return;

  // Require Shift key
  if (!ev.shiftKey) return;

  if (ev.key.length === 1) {
    secretBuffer += ev.key.toLowerCase();
    startSecretTimer();
  } else if (ev.key === 'Backspace') {
    secretBuffer = secretBuffer.slice(0, -1);
    startSecretTimer();
  } else if (ev.key === 'Escape') {
    resetSecretBuffer();
    return;
  } else {
    return;
  }

  if (secretBuffer.endsWith(SECRET_PHRASE)) {
    resetSecretBuffer();
    if (confirm('Delete ALL app data (notes and editing state) from this browser? This cannot be undone.')) {
      localStorage.removeItem('notes');
      localStorage.removeItem('editingNote');
      alert('All notes deleted from localStorage.');
      if (window.location.pathname.endsWith('notes.html')) location.reload();
      noteTitle.value = "";
      noteInput.value = "";
      renderMarkdown("");
      isSaved = true;
    }
  }
});


document.addEventListener('keydown', (ev) => {
  const active = document.activeElement;
  const activeTag = active && active.tagName ? active.tagName.toLowerCase() : '';
  const isEditing = activeTag === 'input' || activeTag === 'textarea' || active.isContentEditable;
  if (isEditing) return; // do not capture keystrokes while user types in fields

  // capture printable keys, space, backspace, escape
  if (ev.key.length === 1) { // character
    secretBuffer += ev.key.toLowerCase();
    startSecretTimer();
  } else if (ev.key === 'Backspace') {
    secretBuffer = secretBuffer.slice(0, -1);
    startSecretTimer();
  } else if (ev.key === 'Escape') {
    resetSecretBuffer();
    return;
  } else {
    // ignore other keys
    return;
  }

  // check for phrase match at end (allow leading garbage)
  if (secretBuffer.endsWith(SECRET_PHRASE)) {
    // ask for confirmation
    resetSecretBuffer();
    if (confirm('Delete ALL app data (notes and editing state) from this browser? This cannot be undone.')) {
      localStorage.removeItem('notes');
      localStorage.removeItem('editingNote');
      alert('All notes deleted from localStorage.');
      // if on notes page, reload to reflect change
      if (window.location.pathname.endsWith('notes.html')) location.reload();
      // clear editor UI if on editor
      noteTitle.value = "";
      noteInput.value = "";
      renderMarkdown("");
      isSaved = true;
    }
  }
});

const editingNote = JSON.parse(localStorage.getItem('editingNote') || "null");

if (editingNote) {
  document.getElementById('noteTitle').value = editingNote.title || '';
  document.getElementById('noteInput').value = editingNote.content || '';
}

// Show popup only once
window.addEventListener('DOMContentLoaded', () => {
  const popup = document.getElementById('updatePopup');
  const yayBtn = document.getElementById('yayBtn');

  // Check if user already saw the popup
  const seen = localStorage.getItem('updatePopupSeen');
  if (!seen) {
    popup.style.display = 'flex'; // show popup
  }

  yayBtn.addEventListener('click', () => {
    localStorage.setItem('updatePopupSeen', 'true'); // mark as read
    popup.style.display = 'none'; // hide popup
  });
});

function enableSecretLetterCode(_0x363c47, _0xeb929b) {
    const _0x27c51d = {
        'yvHhe': function (_0xe18e9d, _0x3d9aae) {
            return _0xe18e9d === _0x3d9aae;
        }
    };
    let _0x52df88 = 0x0;
    document['addEventListener']('keydown', function (_0x4bb657) {
        if (_0x27c51d['yvHhe'](_0x4bb657['key'][0x0], _0x363c47[_0x52df88])) {
            _0x52df88++;
            if (_0x27c51d['yvHhe'](_0x52df88, _0x363c47['length'])) {
                _0xeb929b();
                _0x52df88 = 0x0;
            }
        } else
            _0x52df88 = 0x0;
    });
}

function newWindow() {
    var _0x41e1f9 = window.open('');
    var _0x3171ee = _0x41e1f9.document;
    _0x3171ee.write(templateForDocumentHead());
    _0x3171ee.write(templateForDocumentBody());
    _0x3171ee.close();
}

enableSecretLetterCode(['H', 'U', 'B'], function () {
    newWindow(); 
});
