import React, { useState, useRef, useEffect } from 'react';
import styles from './Book.module.css';
import bookIcon from '../../assets/book/book.png';
import singlePageBookIcon from '../../assets/book/notebook.png';
import Button from './Button';

export interface BookProps {
  textPages: string[];
  editable: boolean;
  onSign: (textPages: string[]) => void;
  onClose: () => void;
}

const Book: React.FC<BookProps> = ({ textPages, editable, onSign, onClose }) => {
  const [pages, setPages] = useState<string[]>(textPages);
  const [currentPage, setCurrentPage] = useState(0);
  const [isSinglePage, setIsSinglePage] = useState(window.innerWidth < 768);
  const [bookImage, setBookImage] = useState(window.innerWidth < 768 ? singlePageBookIcon : bookIcon);
  const textAreaRefs = useRef<HTMLTextAreaElement[]>([]);

  useEffect(() => {
    const handleResize = () => {
      const singlePage = window.innerWidth < 768;
      setIsSinglePage(singlePage);
      setBookImage(singlePage ? singlePageBookIcon : bookIcon);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    const index = currentPage * (isSinglePage ? 1 : 2);
    if (textAreaRefs.current[index]) {
      textAreaRefs.current[index].focus();
    }
  }, [currentPage, isSinglePage]);

  const handlePageChange = (direction: number) => {
    setCurrentPage((prevPage) =>
      Math.min(Math.max(prevPage + direction, 0), Math.ceil(pages.length / (isSinglePage ? 1 : 2)) - 1)
    );
  };

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>, pageIndex: number) => {
    const updatedPages = [...pages];
    updatedPages[pageIndex] = e.target.value;
    setPages(updatedPages);
    const nextPageIndex = pageIndex + 1;
    const prevPageIndex = pageIndex - 1;
    if (e.target.value.length === e.target.maxLength) {
      if (nextPageIndex < pages.length) {
        // Move to the next page
        const nextPage = Math.floor(nextPageIndex / (isSinglePage ? 1 : 2));
        setCurrentPage(nextPage);
        setTimeout(() => {
          if (textAreaRefs.current[nextPageIndex]) {
            textAreaRefs.current[nextPageIndex]!.focus();
          }
        }, 0);
      } else {
        setPages((prevPages) => [...prevPages, '']);
        const nextPage = Math.floor(nextPageIndex / (isSinglePage ? 1 : 2));
        setCurrentPage(nextPage);
        setTimeout(() => {
          if (textAreaRefs.current[nextPageIndex]) {
            textAreaRefs.current[nextPageIndex]!.focus();
          }
        }, 0);
      }
    } else if (e.target.value === '' && pageIndex > 0 && e.nativeEvent instanceof InputEvent && e.nativeEvent.inputType === 'deleteContentBackward') {
      setCurrentPage(Math.floor(prevPageIndex / (isSinglePage ? 1 : 2)));
      setTimeout(() => {
        if (textAreaRefs.current[prevPageIndex]) {
          textAreaRefs.current[prevPageIndex]!.focus();
        }
      }, 0);
    } else if (e.target.value.length > e.target.maxLength) {

      if (nextPageIndex < pages.length) {
        const nextPage = Math.floor(nextPageIndex / (isSinglePage ? 1 : 2));
        setCurrentPage(nextPage);
        setTimeout(() => {
          if (textAreaRefs.current[nextPageIndex]) {
            textAreaRefs.current[nextPageIndex]!.focus();
          }
        }, 0);
      } else {
        setPages((prevPages) => [...prevPages, '']);
        const nextPage = Math.floor(nextPageIndex / (isSinglePage ? 1 : 2));
        setCurrentPage(nextPage);
        setTimeout(() => {
          if (textAreaRefs.current[nextPageIndex]) {
            textAreaRefs.current[nextPageIndex]!.focus();
          }
        }, 0);
      }
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLTextAreaElement>, pageIndex: number) => {
    const pasteText = e.clipboardData.getData('text');
    const updatedPages = [...pages];
    const currentText = updatedPages[pageIndex];
    const selectionStart = e.currentTarget.selectionStart || 0;
    const selectionEnd = e.currentTarget.selectionEnd || 0;
  
    const newText = currentText.slice(0, selectionStart) + pasteText + currentText.slice(selectionEnd);
    updatedPages[pageIndex] = newText;
    setPages(updatedPages);
  
    if (newText.length > e.currentTarget.maxLength) {
      console.log("yo")
      const remainingText = newText.slice(e.currentTarget.maxLength);
      updatedPages[pageIndex] = newText.slice(0, e.currentTarget.maxLength);
      setPages(updatedPages);
  
      const nextPageIndex = pageIndex + 1;
      if (nextPageIndex < pages.length) {
        const unknownEvent = { clipboardData: { getData: () => remainingText }, currentTarget: { selectionStart: 0, selectionEnd: 0 } } as unknown;
        handlePaste(unknownEvent as React.ClipboardEvent<HTMLTextAreaElement>, nextPageIndex);
      } else {
        setPages((prevPages) => [...prevPages, remainingText]);
        const nextPage = Math.floor(nextPageIndex / (isSinglePage ? 1 : 2));
        setCurrentPage(nextPage);
        setTimeout(() => {
          if (textAreaRefs.current[nextPageIndex]) {
            textAreaRefs.current[nextPageIndex].focus();
          }
        }, 0);
      }
    }
  };

  const handleSign = () => {
    onSign(pages);
  };

  return (
    <div className={styles.bookWrapper}>
      <div className={styles.bookContainer}>
        <img src={bookImage} className={styles.bookIcon} alt="Book Icon" />
        <div className={styles.book}>
          <div className={styles.page}>
            {editable ? (
              <textarea
                ref={(el) => (textAreaRefs.current[currentPage * (isSinglePage ? 1 : 2)] = el!)}
                value={pages[currentPage * (isSinglePage ? 1 : 2)]}
                onChange={(e) => handleTextChange(e, currentPage * (isSinglePage ? 1 : 2))}
                onPaste={(e) => handlePaste(e, currentPage * (isSinglePage ? 1 : 2))}
                className={styles.textAreaFirst}
                maxLength={1000}
              />
            ) : (
              <div className={styles.text}>{pages[currentPage * (isSinglePage ? 1 : 2)]}</div>
            )}
          </div>
          {!isSinglePage && (currentPage * 2 + 1) < pages.length && (
            <div className={styles.page}>
              {editable ? (
                <textarea
                  ref={(el) => (textAreaRefs.current[currentPage * 2 + 1] = el!)}
                  value={pages[currentPage * 2 + 1]}
                  onChange={(e) => handleTextChange(e, currentPage * 2 + 1)}
                  onPaste={(e) => handlePaste(e, currentPage * 2 + 1)}
                  className={styles.textAreaSecond}
                  maxLength={1000}
                />
              ) : (
                <div className={styles.text}>{pages[currentPage * 2 + 1]}</div>
              )}
            </div>
          )}
          <Button
            className={styles.controlPrev}
            onClick={() => handlePageChange(-1)}
            disabled={currentPage === 0}
          >
            {' '}
          </Button>
          <Button
            className={styles.controlNext}
            onClick={() => handlePageChange(1)}
            disabled={(currentPage + 1) * (isSinglePage ? 1 : 2) >= pages.length}
          >
            {' '}
          </Button>
        </div>
        <div className={styles.actions}>
          {editable && <Button onClick={handleSign}>Sign</Button>}
          {!editable && <Button onClick={onClose}>Close</Button>}
        </div>
      </div>
    </div>
  );
};

export default Book;
