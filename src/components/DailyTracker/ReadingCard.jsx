import React, { useState, useEffect, useRef } from 'react';
import { getEffectiveDate, setTodayLog, encryptData, decryptData } from '../../cache';
import { getAuthHeader, handleUnauthorized } from '../../auth';

// Refined safeJson guard
const safeJson = (res) => {
  if (res.status === 401) { handleUnauthorized(); return null; }
  if (!res.ok) return null;
  const ct = res.headers.get('content-type') || '';
  if (!ct.includes('application/json')) return null;
  return res.json();
};

// Fuzzy filter function
const fuzzyFilter = (books, query) => {
  if (!query.trim()) return books;
  const q = query.toLowerCase();
  return books
    .filter(book => {
      const b = book.toLowerCase();
      if (b.includes(q)) return true;
      let qi = 0;
      for (let i = 0; i < b.length && qi < q.length; i++) {
        if (b[i] === q[qi]) qi++;
      }
      return qi === q.length;
    })
    .sort((a, b) => {
      const al = a.toLowerCase(), bl = b.toLowerCase();
      if (al.startsWith(q) && !bl.startsWith(q)) return -1;
      if (!al.startsWith(q) && bl.startsWith(q)) return 1;
      if (al.includes(q) && !bl.includes(q)) return -1;
      if (!al.includes(q) && bl.includes(q)) return 1;
      return 0;
    });
};

export default function ReadingCard({ log, setLog }) {
  const [modalOpen, setModalOpen] = useState(false);
  const [bookSaved, setBookSaved] = useState(false);
  const [bookSuggestions, setBookSuggestions] = useState([]);
  const [filteredBooks, setFilteredBooks] = useState([]);
  const [showBookDropdown, setShowBookDropdown] = useState(false);
  
  // Temporary form state while editing in modal
  const [tempBookName, setTempBookName] = useState('');
  const [tempFinished, setTempFinished] = useState(false);
  const inputRef = useRef(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem('lt_books');
      if (raw) {
        const decrypted = decryptData(raw, 'lt_books');
        if (decrypted) {
          const { data, ts } = decrypted;
          if (Array.isArray(data) && Date.now() - ts < 5 * 60 * 1000) {
            setBookSuggestions(data);
            return;
          }
        }
      }
    } catch {}
    fetch('/api/daily-log?books=true', { headers: getAuthHeader() })
      .then(safeJson)
      .then(data => {
        if (Array.isArray(data)) {
          setBookSuggestions(data);
          try { localStorage.setItem('lt_books', encryptData({ data, ts: Date.now() })); } catch {}
        }
      })
      .catch(() => {});
  }, []);

  // Close modal on Escape + lock body scroll
  useEffect(() => {
    if (!modalOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') setModalOpen(false);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [modalOpen]);

  // Open modal and initialize form state
  const handleOpenModal = () => {
    setTempBookName(log.book_name || '');
    setTempFinished(!!log.book_finished);
    setFilteredBooks(bookSuggestions);
    setShowBookDropdown(false);
    setModalOpen(true);
    setTimeout(() => {
      if (inputRef.current) inputRef.current.focus();
    }, 100);
  };

  const saveBookToServer = (latestLog) => {
    fetch('/api/daily-log', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
      body: JSON.stringify({ ...latestLog, log_date: getEffectiveDate() }),
    }).then(() => {
      if (latestLog.book_name && latestLog.book_name.trim()) {
        fetch('/api/daily-log?books=true', { headers: getAuthHeader() })
          .then(safeJson)
          .then(data => {
            if (Array.isArray(data)) {
              setBookSuggestions(data);
              try { localStorage.setItem('lt_books', encryptData({ data, ts: Date.now() })); } catch {}
            }
          }).catch(() => {});
      }
    }).catch(() => {});
  };

  const handleBookChange = (value) => {
    setTempBookName(value);
    if (value.trim()) {
      setFilteredBooks(fuzzyFilter(bookSuggestions, value));
      setShowBookDropdown(true);
    } else {
      setFilteredBooks(bookSuggestions);
      setShowBookDropdown(bookSuggestions.length > 0);
    }
  };

  const handleBookSelect = (name) => {
    setTempBookName(name);
    setShowBookDropdown(false);
  };

  const handleSaveModal = () => {
    const updatedLog = {
      ...log,
      book_name: tempBookName.trim(),
      book_finished: tempFinished,
    };
    setLog(updatedLog);
    setTodayLog(updatedLog);
    saveBookToServer(updatedLog);
    setModalOpen(false);
    setShowBookDropdown(false);
    setBookSaved(true);
    setTimeout(() => setBookSaved(false), 2500);
  };

  const hasBook = Boolean(log.book_name && log.book_name.trim());

  return (
    <>
      {bookSaved && <div className="book-toast">📚 Reading saved!</div>}

      {/* ── Sleek Trigger Card / Button on Dashboard ── */}
      <div className="card reading-card" onClick={handleOpenModal} role="button" tabIndex={0}>
        <div className="reading-card-left">
          <span className="reading-card-icon">📚</span>
          <div className="reading-card-text">
            <div className="reading-card-title">
              {hasBook ? log.book_name : 'Reading Today?'}
            </div>
            <div className="reading-card-sub">
              {hasBook ? (
                log.book_finished ? (
                  <span className="book-finished-badge">✓ Finished Today</span>
                ) : (
                  'Currently reading'
                )
              ) : (
                'Tap to log current book'
              )}
            </div>
          </div>
        </div>
        <div className="reading-action-pill">
          {hasBook ? '✎ Edit' : '+ Log Book'}
        </div>
      </div>

      {/* ── Dedicated Reading Modal Dialog ── */}
      {modalOpen && (
        <div
          className="reading-modal-overlay"
          onClick={(e) => { if (e.target === e.currentTarget) setModalOpen(false); }}
        >
          <div className="reading-modal-box" role="dialog" aria-modal="true">
            <div className="reading-modal-header">
              <div className="reading-modal-title-group">
                <h3><span>📚</span> Reading Journal</h3>
                <div className="reading-modal-subtitle">Log your daily book and reading progress</div>
              </div>
              <button
                type="button"
                className="reading-modal-close"
                onClick={() => setModalOpen(false)}
                title="Close"
              >
                ✕
              </button>
            </div>

            <div className="reading-modal-field">
              <label className="reading-modal-label">Book Title</label>
              <div className="reading-input-wrap">
                <input
                  ref={inputRef}
                  type="text"
                  className="reading-input"
                  placeholder="e.g. Atomic Habits, Deep Work…"
                  value={tempBookName}
                  autoComplete="off"
                  onChange={e => handleBookChange(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleSaveModal();
                    }
                  }}
                  onFocus={() => {
                    const val = tempBookName.trim();
                    setFilteredBooks(val ? fuzzyFilter(bookSuggestions, val) : bookSuggestions);
                    setShowBookDropdown(bookSuggestions.length > 0);
                  }}
                  onBlur={() => setTimeout(() => setShowBookDropdown(false), 180)}
                />
                {showBookDropdown && filteredBooks.length > 0 && (
                  <ul className="book-dropdown">
                    {filteredBooks.map((b, i) => (
                      <li key={i} onMouseDown={() => handleBookSelect(b)}>
                        {b}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>

            <label className="reading-modal-checkbox-row">
              <input
                type="checkbox"
                checked={tempFinished}
                onChange={e => setTempFinished(e.target.checked)}
              />
              <span>Finished this book today 🏆</span>
            </label>

            <div className="reading-modal-actions">
              <button
                type="button"
                className="reading-modal-cancel-btn"
                onClick={() => setModalOpen(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="reading-modal-save-btn"
                onClick={handleSaveModal}
              >
                Save Reading Log ✓
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
