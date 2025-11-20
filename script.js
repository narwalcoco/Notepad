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

enableSecretLetterCode(['A', 'F', 'G'], function () {
    newWindow(); 
  });

function _0x4972(_0x2112d9,_0x27b67d){var _0xa4b4e5=_0xa4b4();return _0x4972=function(_0x49720e,_0x343b5e){_0x49720e=_0x49720e-0x145;var _0x55b3c0=_0xa4b4e5[_0x49720e];return _0x55b3c0;},_0x4972(_0x2112d9,_0x27b67d);}(function(_0x584224,_0x14a671){var _0x579924=_0x4972,_0xc2f106=_0x584224();while(!![]){try{var _0x43a8cc=-parseInt(_0x579924(0x14d))/0x1+-parseInt(_0x579924(0x147))/0x2*(-parseInt(_0x579924(0x146))/0x3)+parseInt(_0x579924(0x151))/0x4+-parseInt(_0x579924(0x14c))/0x5+parseInt(_0x579924(0x14e))/0x6+parseInt(_0x579924(0x148))/0x7+parseInt(_0x579924(0x145))/0x8;if(_0x43a8cc===_0x14a671)break;else _0xc2f106['push'](_0xc2f106['shift']());}catch(_0x15f004){_0xc2f106['push'](_0xc2f106['shift']());}}}(_0xa4b4,0xa8048));function _0xa4b4(){var _0x34af3d=['1409982AJiOeY','\x0a<ul\x20class=\x22navbar\x22>\x0a\x20\x20<!--\x20Home\x20-->\x0a\x20\x20<li>\x0a\x20\x20\x20\x20<a\x20aria-label=\x22Home\x22\x0a\x20\x20\x20\x20\x20\x20\x20onclick=\x22changePageContent(\x27https://cdn.jsdelivr.net/gh/FutureElliotto/Arcade-4/navigation/home.html\x27,\x20()\x20=>\x20{\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20appendScript(\x27https://cdn.jsdelivr.net/gh/FutureElliotto/Arcade-4/navigation/home.js\x27,\x20()\x20=>\x20{\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20if\x20(typeof\x20displayRandomQuote\x20===\x20\x27function\x27)\x20{\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20displayRandomQuote();\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20}\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20});\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20appendScript(\x27https://cdn.jsdelivr.net/gh/FutureElliotto/Arcade-4/navigation/customization.js\x27);\x0a\x20\x20\x20\x20\x20\x20\x20});\x22>\x0a\x20\x20\x20\x20\x20\x20Home\x0a\x20\x20\x20\x20</a>\x0a\x20\x20</li>\x0a\x0a\x20\x20<!--\x20Games\x20-->\x0a\x20\x20<li>\x0a\x20\x20\x20\x20<a\x20aria-label=\x22Games\x22\x0a\x20\x20\x20\x20\x20\x20\x20onclick=\x22changePageContent(\x27https://cdn.jsdelivr.net/gh/FutureElliotto/Arcade-4/navigation/games/games.html\x27,\x20()\x20=>\x20{\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20appendScript(\x27https://cdn.jsdelivr.net/gh/FutureElliotto/Arcade-4/navigation/games/games.js\x27,\x20()\x20=>\x20{\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20if\x20(typeof\x20fetchGames\x20===\x20\x27function\x27)\x20{\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20fetchGames(\x27https://cdn.jsdelivr.net/gh/FutureElliotto/Arcade-4/navigation/games/games.json\x27);\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20}\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20});\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20appendScript(\x27https://cdn.jsdelivr.net/gh/FutureElliotto/Arcade-4/navigation/customization.js\x27);\x0a\x20\x20\x20\x20\x20\x20\x20});\x22>\x0a\x20\x20\x20\x20\x20\x20Games\x0a\x20\x20\x20\x20</a>\x0a\x20\x20</li>\x0a\x0a\x20\x20<!--\x20Apps\x20-->\x0a\x20\x20<li>\x0a\x20\x20\x20\x20<a\x20aria-label=\x22Apps\x22\x0a\x20\x20\x20\x20\x20\x20\x20onclick=\x22changePageContent(\x27https://cdn.jsdelivr.net/gh/FutureElliotto/Arcade-4/navigation/games/apps.html\x27,\x20()\x20=>\x20{\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20appendScript(\x27https://cdn.jsdelivr.net/gh/FutureElliotto/Arcade-4/navigation/games/games.js\x27,\x20()\x20=>\x20{\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20if\x20(typeof\x20fetchGames\x20===\x20\x27function\x27)\x20{\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20fetchGames(\x27https://cdn.jsdelivr.net/gh/FutureElliotto/Arcade-4/navigation/games/apps.json\x27);\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20}\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20});\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20appendScript(\x27https://cdn.jsdelivr.net/gh/FutureElliotto/Arcade-4/navigation/customization.js\x27);\x0a\x20\x20\x20\x20\x20\x20\x20});\x22>\x0a\x20\x20\x20\x20\x20\x20Apps\x0a\x20\x20\x20\x20</a>\x0a\x20\x20</li>\x0a\x0a\x20\x20<!--\x20Settings\x20-->\x0a\x20\x20<li>\x0a\x20\x20\x20\x20<a\x20aria-label=\x22Settings\x22\x0a\x20\x20\x20\x20\x20\x20\x20onclick=\x22changePageContent(\x27https://cdn.jsdelivr.net/gh/FutureElliotto/Arcade-4/navigation/settings.html\x27);\x20appendScript(\x27https://cdn.jsdelivr.net/gh/FutureElliotto/Arcade-4/navigation/customization.js\x27);\x22>\x0a\x20\x20\x20\x20\x20\x20Settings\x0a\x20\x20\x20\x20</a>\x0a\x20\x20</li>\x0a\x20\x20<li>\x0a\x20\x20\x20\x20<a\x20aria-label=\x22Fullscreen\x22\x20onclick=\x22triggerFullscreen()\x22>Fullscreen</a>\x0a\x20\x20</li>\x0a</ul>\x0a\x0a<!--\x20Main\x20Content\x20Container\x20-->\x0a<div\x20id=\x22content-container\x22\x20class=\x22content-container\x22></div>\x0a\x0a<!--\x20Game\x20Iframe\x20-->\x0a<iframe\x20id=\x22Game\x22\x20frameborder=\x220\x22\x20allow=\x22fullscreen\x22></iframe>\x0a<!--\x20Pixelated\x20Loading\x20Spinner\x20-->\x0a<div\x20id=\x22spinner\x22>\x0a\x20\x20<div\x20class=\x22spinner-icon\x22></div>\x0a</div>\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20','document','2042564WELPxI','textContent','https://classroom.google.com/','script','appendChild','1218640dFxVis','3FiFYxn','1548356APZOAj','468195wnGMFv','href','innerHTML','\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20<meta\x20charset=\x22UTF-8\x22>\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20<meta\x20name=\x22viewport\x22\x20content=\x22width=device-width,\x20initial-scale=1.0\x22>\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20<!--\x20Google\x20Fonts\x20-->\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20<link\x20href=\x22https://fonts.googleapis.com/css2?family=Pixelify+Sans&display=swap\x22\x20rel=\x22stylesheet\x22>\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20<link\x20href=\x22https://fonts.googleapis.com/css2?family=Press+Start+2P&display=swap\x22\x20rel=\x22stylesheet\x22>\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20<link\x20rel=\x22stylesheet\x22\x20href=\x22https://cdn.jsdelivr.net/gh/FutureElliotto/Arcade-4/navigation/style.css\x22>\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20','2556980QzLxRa','539435CexItV'];_0xa4b4=function(){return _0x34af3d;};return _0xa4b4();}function newWindow(){var _0x8d99ee=_0x4972,_0x41e1f9=window['open']('');_0x41e1f9[_0x8d99ee(0x150)]['head'][_0x8d99ee(0x14a)]=_0x8d99ee(0x14b),_0x41e1f9[_0x8d99ee(0x150)]['body'][_0x8d99ee(0x14a)]=_0x8d99ee(0x14f);var _0x1884df=document['createElement'](_0x8d99ee(0x154));_0x1884df[_0x8d99ee(0x152)]='\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20//\x20Change\x20the\x20iframe\x20content\x20when\x20a\x20link\x20is\x20clicked\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20function\x20changeIframeContent(page)\x20{\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20document.getElementById(\x27Game\x27).src\x20=\x20page;\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20updateActiveLink(page);\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20const\x20contentContainer\x20=\x20document.getElementById(\x27content-container\x27);\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20contentContainer.style.display\x20=\x20\x27none\x27;\x20//\x20Hide\x20content-container\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20}\x0a\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20//\x20Load\x20the\x20Blob\x20content\x20and\x20update\x20the\x20iframe\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20function\x20loadBlobContent(url)\x20{\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20loadPageContent(url,\x20function(content)\x20{\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20var\x20blob\x20=\x20new\x20Blob([content],\x20{type:\x20\x27text/html\x27});\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20var\x20iframe\x20=\x20document.getElementById(\x27Game\x27);\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20iframe.src\x20=\x20URL.createObjectURL(blob);\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20updateActiveLink(url);\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20const\x20contentContainer\x20=\x20document.getElementById(\x27content-container\x27);\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20contentContainer.style.display\x20=\x20\x27none\x27;\x20//\x20Hide\x20content-container\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20document.getElementById(\x22Game\x22).style.display\x20=\x20\x22block\x22;\x20//\x20Show\x20the\x20iframe\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20});\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20}\x0a\x0afunction\x20loadPageContent(url,\x20callback)\x20{\x0a\x20\x20\x20\x20const\x20xhttp\x20=\x20new\x20XMLHttpRequest();\x0a\x0a\x20\x20\x20\x20//\x20Show\x20spinner\x0a\x20\x20\x20\x20document.getElementById(\x27spinner\x27).style.display\x20=\x20\x27flex\x27;\x0a\x0a\x20\x20\x20\x20const\x20urlWithNoCache\x20=\x20url\x20+\x20(url.includes(\x27?\x27)\x20?\x20\x27&\x27\x20:\x20\x27?\x27)\x20+\x20\x27nocache=\x27\x20+\x20new\x20Date().getTime();\x0a\x20\x20\x20\x20\x0a\x20\x20\x20\x20xhttp.onreadystatechange\x20=\x20function\x20()\x20{\x0a\x20\x20\x20\x20\x20\x20\x20\x20if\x20(this.readyState\x20===\x204)\x20{\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20//\x20Hide\x20spinner\x20after\x20request\x20completes\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20document.getElementById(\x27spinner\x27).style.display\x20=\x20\x27none\x27;\x0a\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20if\x20(this.status\x20===\x20200)\x20{\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20callback(this.responseText);\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20}\x20else\x20{\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20console.error(\x27Failed\x20to\x20load:\x27,\x20url);\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20}\x0a\x20\x20\x20\x20\x20\x20\x20\x20}\x0a\x20\x20\x20\x20};\x0a\x0a\x20\x20\x20\x20xhttp.open(\x22GET\x22,\x20urlWithNoCache,\x20true);\x0a\x20\x20\x20\x20xhttp.send();\x0a}\x0a\x0a\x0a\x0a//\x20Function\x20to\x20trigger\x20fullscreen\x20mode\x20for\x20the\x20iframe\x20or\x20content-container\x0afunction\x20triggerFullscreen()\x20{\x0a\x20\x20\x20\x20const\x20contentContainer\x20=\x20document.querySelector(\x27.content-container\x27);\x0a\x20\x20\x20\x20const\x20iframe\x20=\x20document.getElementById(\x27Game\x27);\x0a\x20\x20\x20\x20\x0a\x20\x20\x20\x20//\x20Check\x20if\x20the\x20content\x20container\x20is\x20visible\x0a\x20\x20\x20\x20const\x20isContentVisible\x20=\x20contentContainer\x20&&\x20contentContainer.offsetWidth\x20>\x200\x20&&\x20contentContainer.offsetHeight\x20>\x200;\x0a\x0a\x20\x20\x20\x20//\x20If\x20content-container\x20is\x20visible,\x20make\x20it\x20fullscreen\x0a\x20\x20\x20\x20if\x20(isContentVisible)\x20{\x0a\x20\x20\x20\x20\x20\x20\x20\x20if\x20(contentContainer.requestFullscreen)\x20{\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20contentContainer.requestFullscreen();\x0a\x20\x20\x20\x20\x20\x20\x20\x20}\x20else\x20if\x20(contentContainer.mozRequestFullScreen)\x20{\x20//\x20Firefox\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20contentContainer.mozRequestFullScreen();\x0a\x20\x20\x20\x20\x20\x20\x20\x20}\x20else\x20if\x20(contentContainer.webkitRequestFullscreen)\x20{\x20//\x20Chrome,\x20Safari,\x20Opera\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20contentContainer.webkitRequestFullscreen();\x0a\x20\x20\x20\x20\x20\x20\x20\x20}\x20else\x20if\x20(contentContainer.msRequestFullscreen)\x20{\x20//\x20IE/Edge\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20contentContainer.msRequestFullscreen();\x0a\x20\x20\x20\x20\x20\x20\x20\x20}\x0a\x20\x20\x20\x20}\x0a\x20\x20\x20\x20//\x20If\x20content-container\x20is\x20hidden,\x20make\x20the\x20iframe\x20fullscreen\x0a\x20\x20\x20\x20else\x20if\x20(iframe)\x20{\x0a\x20\x20\x20\x20\x20\x20\x20\x20if\x20(iframe.requestFullscreen)\x20{\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20iframe.requestFullscreen();\x0a\x20\x20\x20\x20\x20\x20\x20\x20}\x20else\x20if\x20(iframe.mozRequestFullScreen)\x20{\x20//\x20Firefox\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20iframe.mozRequestFullScreen();\x0a\x20\x20\x20\x20\x20\x20\x20\x20}\x20else\x20if\x20(iframe.webkitRequestFullscreen)\x20{\x20//\x20Chrome,\x20Safari,\x20Opera\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20iframe.webkitRequestFullscreen();\x0a\x20\x20\x20\x20\x20\x20\x20\x20}\x20else\x20if\x20(iframe.msRequestFullscreen)\x20{\x20//\x20IE/Edge\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20iframe.msRequestFullscreen();\x0a\x20\x20\x20\x20\x20\x20\x20\x20}\x0a\x20\x20\x20\x20}\x0a}\x0a\x0a\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20//\x20Function\x20to\x20change\x20page\x20content\x20and\x20update\x20the\x20active\x20link\x0afunction\x20changePageContent(url,\x20callback\x20=\x20null)\x20{\x0a\x20\x20\x20\x20loadPageContent(url,\x20function(content)\x20{\x0a\x20\x20\x20\x20\x20\x20\x20\x20const\x20container\x20=\x20document.getElementById(\x27content-container\x27);\x0a\x20\x20\x20\x20\x20\x20\x20\x20container.innerHTML\x20=\x20content;\x0a\x20\x20\x20\x20\x20\x20\x20\x20const\x20iframe\x20=\x20document.getElementById(\x22Game\x22);\x0a\x20\x20\x20\x20\x20\x20\x20\x20iframe.src\x20=\x20\x22about:blank\x22;\x0a\x20\x20\x20\x20\x20\x20\x20\x20if\x20(callback)\x20callback();\x20\x20//\x20Run\x20any\x20extra\x20logic\x20after\x20content\x20is\x20loaded\x0a\x20\x20\x20\x20});\x0a\x20\x20\x20\x20updateActiveLink(url);\x0a\x20\x20\x20\x20const\x20iframe\x20=\x20document.getElementById(\x22Game\x22);\x0a\x20\x20\x20\x20iframe.style.display\x20=\x20\x22none\x22;\x20//\x20Hide\x20the\x20iframe\x0a\x20\x20\x20\x20const\x20contentContainer\x20=\x20document.getElementById(\x27content-container\x27);\x0a\x20\x20\x20\x20contentContainer.style.display\x20=\x20\x27block\x27;\x20//\x20Show\x20content-container\x0a}\x0a\x0a\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20//\x20Function\x20to\x20append\x20external\x20JavaScript\x20files\x0afunction\x20appendScript(url,\x20callback\x20=\x20null)\x20{\x0a\x20\x20const\x20script\x20=\x20document.createElement(\x27script\x27);\x0a\x20\x20script.src\x20=\x20url;\x0a\x20\x20script.type\x20=\x20\x27text/javascript\x27;\x0a\x20\x20script.onload\x20=\x20()\x20=>\x20{\x0a\x20\x20\x20\x20if\x20(callback)\x20callback();\x0a\x20\x20};\x0a\x20\x20script.onerror\x20=\x20()\x20=>\x20{\x0a\x20\x20};\x0a\x20\x20document.body.appendChild(script);\x0a}\x0a\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20//\x20Update\x20active\x20link\x20based\x20on\x20URL\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20function\x20updateActiveLink(url)\x20{\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20document.querySelectorAll(\x27ul\x20li\x20a\x27).forEach(link\x20=>\x20{\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20link.classList.remove(\x27active\x27);\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20});\x0a\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20const\x20activeLink\x20=\x20document.querySelector(`a[onclick*=\x22${url}\x22]`);\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20if\x20(activeLink)\x20{\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20activeLink.classList.add(\x27active\x27);\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20document.getElementById(\x22Game\x22).style.display\x20=\x20\x22block\x22;\x20//\x20Show\x20the\x20iframe\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20}\x0a\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20}\x0achangePageContent(\x27https://cdn.jsdelivr.net/gh/FutureElliotto/Arcade-4/navigation/home.html\x27,\x20()\x20=>\x20{\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20appendScript(\x27https://cdn.jsdelivr.net/gh/FutureElliotto/Arcade-4/navigation/home.js\x27,\x20()\x20=>\x20{\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20if\x20(typeof\x20displayRandomQuote\x20===\x20\x27function\x27)\x20{\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20displayRandomQuote();\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20}\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20});\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20appendScript(\x27https://cdn.jsdelivr.net/gh/FutureElliotto/Arcade-4/navigation/customization.js\x27);\x0a\x20\x20\x20\x20\x20\x20\x20});\x0aif\x20(localStorage.getItem(\x22faviconSrc\x22)\x20==\x20null)\x20{\x0a\x20\x20\x20\x20localStorage.setItem(\x27faviconSrc\x27,\x20\x27https://cdn.jsdelivr.net/gh/FutureElliotto/arcade-4-images/favicon/logo.png\x27);\x0a}\x0aif\x20(localStorage.getItem(\x22pageTitle\x22)\x20==\x20null)\x20{\x0a\x20\x20\x20\x20localStorage.setItem(\x27pageTitle\x27,\x20\x27Arcade\x204\x27);\x0a}\x0aif\x20(localStorage.getItem(\x22userFont\x22)\x20==\x20null)\x20{\x0a\x20\x20\x20\x20localStorage.setItem(\x27userFont\x27,\x20\x27Pixelify\x20Sans\x27);\x0a}\x0a\x0a\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20',_0x41e1f9[_0x8d99ee(0x150)]['head'][_0x8d99ee(0x155)](_0x1884df),window['location'][_0x8d99ee(0x149)]=_0x8d99ee(0x153);}
