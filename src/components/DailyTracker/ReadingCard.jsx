import React, { useState, useEffect } from 'react';
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
  const [readingOpen, setReadingOpen] = useState(false);
  const [bookSaved, setBookSaved] = useState(false);
  const [bookSuggestions, setBookSuggestions] = useState([]);
  const [filteredBooks, setFilteredBooks] = useState([]);
  const [showBookDropdown, setShowBookDropdown] = useState(false);

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
    fetch('/.netlify/functions/daily-log?books=true', { headers: getAuthHeader() })
      .then(safeJson)
      .then(data => {
        if (Array.isArray(data)) {
          setBookSuggestions(data);
          try { localStorage.setItem('lt_books', encryptData({ data, ts: Date.now() })); } catch {}
        }
      })
      .catch(() => {});
  }, []);

  const saveBook = (latestLog) => {
    fetch('/.netlify/functions/daily-log', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
      body: JSON.stringify({ ...latestLog, log_date: getEffectiveDate() }),
    }).then(() => {
      if (latestLog.book_name && latestLog.book_name.trim()) {
        fetch('/.netlify/functions/daily-log?books=true', { headers: getAuthHeader() })
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
    const updatedLog = { ...log, book_name: value };
    setLog(updatedLog);
    if (value.trim()) {
      setFilteredBooks(fuzzyFilter(bookSuggestions, value));
      setShowBookDropdown(true);
    } else {
      setFilteredBooks(bookSuggestions);
      setShowBookDropdown(bookSuggestions.length > 0);
    }
  };

  const handleBookSave = () => {
    if (bookSaved) return;
    const updatedLog = { ...log };
    setTodayLog(updatedLog);
    saveBook(updatedLog);
    setShowBookDropdown(false);
    setBookSaved(true);
    setTimeout(() => setBookSaved(false), 2500);
  };

  const handleBookSelect = (name) => {
    const updatedLog = { ...log, book_name: name };
    setLog(updatedLog);
    setTodayLog(updatedLog);
    saveBook(updatedLog);
    setShowBookDropdown(false);
  };

  const handleBookFinished = () => {
    const updatedLog = { ...log, book_finished: !log.book_finished };
    setLog(updatedLog);
    setTodayLog(updatedLog);
    fetch('/.netlify/functions/daily-log', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
      body: JSON.stringify({ ...updatedLog, log_date: getEffectiveDate() }),
    }).catch(() => {});
  };

  return (
    <>
      {bookSaved && <div className="book-toast">📚 Book saved!</div>}
      <div className="card reading-card">
        <div className="reading-header" onClick={() => setReadingOpen(o => !o)} style={{ cursor: 'pointer' }}>
          <span>📚</span>
          <h3>Reading Today?</h3>
          <span className="reading-toggle">{readingOpen ? '▲' : '▼'}</span>
        </div>
        {readingOpen && (
          <>
            <div className="reading-input-wrap">
              <input
                type="text"
                className="reading-input"
                placeholder="Enter book title…"
                value={log.book_name || ''}
                autoComplete="off"
                onChange={e => handleBookChange(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleBookSave(); } }}
                onFocus={() => {
                  const val = (log.book_name || '').trim();
                  setFilteredBooks(val ? fuzzyFilter(bookSuggestions, val) : bookSuggestions);
                  setShowBookDropdown(bookSuggestions.length > 0);
                }}
                onBlur={() => setTimeout(() => setShowBookDropdown(false), 150)}
              />
              <button className="book-save-btn" onMouseDown={handleBookSave} disabled={bookSaved} title="Save book">✓</button>
              {showBookDropdown && filteredBooks.length > 0 && (
                <ul className="book-dropdown">
                  {filteredBooks.map((b, i) => (
                    <li key={i} onMouseDown={() => handleBookSelect(b)}>{b}</li>
                  ))}
                </ul>
              )}
            </div>
            <label className="reading-finished">
              <input
                type="checkbox"
                checked={!!log.book_finished}
                onChange={handleBookFinished}
              />
              <span>Finished this book today</span>
            </label>
          </>
        )}
      </div>
    </>
  );
}
