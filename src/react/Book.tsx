import React, { useState, useRef } from 'react';
import styles from './Book.module.css';

export interface BookProps {
  textPages: string[];
  editable: boolean;
  onSign: (textPages: string[]) => void;
  onClose: () => void;
}

const Book: React.FC<BookProps> = ({ textPages, editable, onSign, onClose }) => {
  const [pages, setPages] = useState(textPages);
  const [currentPage, setCurrentPage] = useState(0);
  const textAreaRef = useRef<HTMLTextAreaElement>(null);

  const handlePageChange = (direction: number) => {
    setCurrentPage((prevPage) => Math.min(Math.max(prevPage + direction * 2, 0), pages.length - 1));
  };

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const updatedPages = [...pages];
    updatedPages[currentPage] = e.target.value;
    setPages(updatedPages);
    if (e.target.value.length === e.target.maxLength) {
      handlePageChange(1);
      if (textAreaRef.current) {
        textAreaRef.current.focus();
      }
    }
  };

  const handleSign = () => {
    onSign(pages);
  };

  return (
    <div className={styles.bookWrapper}>
      <div className={styles.bookContainer}>
        <div className={styles.book}>
          <div className={styles.page}>
            {editable ? (
              <textarea
                ref={textAreaRef}
                value={pages[currentPage]}
                onChange={handleTextChange}
                className={styles.textAreaFirst}
                maxLength={1000}
              />
            ) : (
              <div className={styles.text}>{pages[currentPage]}</div>
            )}
          </div>
          {currentPage + 1 < pages.length && (
            <div className={styles.page}>
              {editable ? (
                <textarea
                  value={pages[currentPage + 1]}
                  onChange={(e) => {
                    const updatedPages = [...pages];
                    updatedPages[currentPage + 1] = e.target.value;
                    setPages(updatedPages);
                  }}
                  className={styles.textAreaSecond}
                  maxLength={1000}
                />
              ) : (
                <div className={styles.text}>{pages[currentPage + 1]}</div>
              )}
            </div>
          )}
          <button className={styles.controlPrev} onClick={() => handlePageChange(-1)} disabled={currentPage === 0}>
            {''}
          </button>
          <button className={styles.controlNext} onClick={() => handlePageChange(1)} disabled={currentPage + 2 >= pages.length}>
            {''}
          </button>
        </div>
        <div className={styles.actions}>
          {editable && <button onClick={handleSign}>Sign</button>}
          <button onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
};

export default Book;
