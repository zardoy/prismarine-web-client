import React, { useState, useRef, useEffect, useCallback } from 'react'
import insideIcon from './book_icons/book.webp'
import insideHalfIcon from './book_icons/book-half.webp'
import singlePageInsideIcon from './book_icons/notebook.webp'
import titleIcon from './book_icons/title.webp'
import styles from './Book.module.css'
import Button from './Button'
import MessageFormattedString from './MessageFormattedString'

export interface BookProps {
  textPages: string[]
  editable: boolean
  onSign: (textPages: string[], title: string) => void
  onEdit: (textPages: string[]) => void
  onClose: () => void
}

const Book: React.FC<BookProps> = ({ textPages, editable, onSign, onEdit, onClose }) => {
  const [pages, setPages] = useState<string[]>(textPages)
  const [currentPage, setCurrentPage] = useState(0)
  const [isSinglePage, setIsSinglePage] = useState(window.innerWidth < 768)
  const [insideImage, setInsideImage] = useState(window.innerWidth < 768 ? singlePageInsideIcon : insideIcon)
  const [animateInsideIcon, setAnimateInsideIcon] = useState(0)
  const [animatePageIcon, setAnimatePageIcon] = useState(0)
  const [animateTitleIcon, setAnimateTitleIcon] = useState(0)
  const [isOutside, setIsOutside] = useState(false)
  const [signClickedOnce, setSignClickedOnce] = useState(false)
  const textAreaRefs = useRef<HTMLTextAreaElement[]>([])
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const handleResize = () => {
      const singlePage = window.innerWidth < 768
      setIsSinglePage(singlePage)
      setInsideImage(singlePage ? singlePageInsideIcon : insideIcon)
    }

    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  useEffect(() => {
    const index = currentPage * (isSinglePage ? 1 : 2)
    if (textAreaRefs.current[index]) {
      textAreaRefs.current[index].focus()
    }
  }, [currentPage, isSinglePage])

  useEffect(() => {
    if (isOutside && inputRef.current!) {
      setTimeout(() => {
        inputRef.current!.focus()
        console.log(inputRef)
      }, 0)
    }
  }, [isOutside])

  const handlePageChange = (direction: number) => {
    setCurrentPage((prevPage) =>
      Math.min(Math.max(prevPage + direction, 0), Math.ceil(pages.length / (isSinglePage ? 1 : 2)) - 1)
    )
  }

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>, pageIndex: number) => {
    const updatedPages = [...pages]
    updatedPages[pageIndex] = e.target.value
    setPages(updatedPages)
    const nextPageIndex = pageIndex + 1
    const prevPageIndex = pageIndex - 1
    if (e.target.value.length === e.target.maxLength || e.target.value.length > e.target.maxLength) {
      if (nextPageIndex < pages.length) {
        const nextPage = Math.floor(nextPageIndex / (isSinglePage ? 1 : 2))
        setCurrentPage(nextPage)
        setTimeout(() => {
          if (textAreaRefs.current[nextPageIndex]) {
            textAreaRefs.current[nextPageIndex]!.focus()
          }
        }, 0)
      } else {
        setPages((prevPages) => [...prevPages, ''])
        const nextPage = Math.floor(nextPageIndex / (isSinglePage ? 1 : 2))
        setCurrentPage(nextPage)
        setTimeout(() => {
          if (textAreaRefs.current[nextPageIndex]) {
            textAreaRefs.current[nextPageIndex]!.focus()
          }
        }, 0)
      }
    } else if (e.target.value === '' && pageIndex > 0 && e.nativeEvent instanceof InputEvent && e.nativeEvent.inputType === 'deleteContentBackward') {
      setCurrentPage(Math.floor(prevPageIndex / (isSinglePage ? 1 : 2)))
      setTimeout(() => {
        if (textAreaRefs.current[prevPageIndex]) {
          textAreaRefs.current[prevPageIndex]!.focus()
        }
      }, 0)
    }
  }

  const handlePaste = (e: React.ClipboardEvent<HTMLTextAreaElement>, pageIndex: number) => {
    const pasteText = e.clipboardData.getData('text')
    const updatedPages = [...pages]
    const currentText = updatedPages[pageIndex]
    const selectionStart = e.currentTarget.selectionStart || 0
    const selectionEnd = e.currentTarget.selectionEnd || 0
    const newText = currentText.slice(0, selectionStart) + pasteText + currentText.slice(selectionEnd)
    updatedPages[pageIndex] = newText
    setPages(updatedPages)
  
    if (newText.length > e.currentTarget.maxLength) {
      const remainingText = newText.slice(e.currentTarget.maxLength)
      updatedPages[pageIndex] = newText.slice(0, e.currentTarget.maxLength)
      setPages(updatedPages)
      const nextPageIndex = pageIndex + 1
      if (nextPageIndex < pages.length) {
        const unknownEvent = { clipboardData: { getData: () => remainingText }, currentTarget: { selectionStart: 0, selectionEnd: 0 } } as unknown
        handlePaste(unknownEvent as React.ClipboardEvent<HTMLTextAreaElement>, nextPageIndex)
      } else {
        setPages((prevPages) => [...prevPages, remainingText])
        const nextPage = Math.floor(nextPageIndex / (isSinglePage ? 1 : 2))
        setCurrentPage(nextPage)
        setTimeout(() => {
          if (textAreaRefs.current[nextPageIndex]) {
            textAreaRefs.current[nextPageIndex].focus()
          }
        }, 0)
      }
    }
  }

  const handleSign = useCallback(() => {
    if (editable && signClickedOnce) {
      onSign(pages, 'Title')
    }
    setIsOutside(true)
    setSignClickedOnce(true)
    setAnimatePageIcon(1)
    setAnimateInsideIcon(1)
    setTimeout(() => {
      setAnimateTitleIcon(1)
    }, 150)
  }, [pages, onSign, editable, signClickedOnce])

  const handleEdit = useCallback(() => {
    setSignClickedOnce(false)
    onEdit(pages)
  }, [pages, onEdit])

  const handleCancel = useCallback(() => {
    if (isOutside) {
      setIsOutside(false)
      setSignClickedOnce(false)
      setAnimateTitleIcon(2)
      setTimeout(() => {
        setAnimateInsideIcon(2)
        setTimeout(() => {
          setAnimatePageIcon(2)
        }, 150)
      }, 150)
    } else {
      onClose()
    }
  }, [isOutside, onClose])

  const setRef = (index: number) => (el: HTMLTextAreaElement | null) => {
    if (el) textAreaRefs.current[index] = el
  }

  return (
    <div className={styles.bookWrapper}>
      <div className={styles.bookContainer}>
        <img
          src={insideImage}
          className={`${styles.insideIcon} ${
            animateInsideIcon === 1
              ? styles.insideAnimation
              : animateTitleIcon === 2
                ? styles.insideAnimationReverse
                : ''
          }`}
          alt="inside Icon"
        />
        <img
          src={insideHalfIcon}
          className={`${styles.insideHalfIcon} ${
            animatePageIcon === 1
              ? styles.pageAnimation
              : animatePageIcon === 2
                ? styles.pageAnimationReverse
                : ''
          }`}
          alt="inside Page Icon"
        />
        <img
          src={titleIcon}
          className={`${styles.titleIcon} ${
            animateTitleIcon === 1
              ? styles.titleAnimation
              : animateTitleIcon === 2
                ? styles.titleAnimationReverse
                : ''
          }`}
          alt="Title Icon" />
        <div className={`${styles.inside}`}>
          <div className={styles.page}>
            {editable ? (
              <textarea
                ref={setRef(currentPage * (isSinglePage ? 1 : 2))}
                value={pages[currentPage * (isSinglePage ? 1 : 2)]}
                onChange={(e) => handleTextChange(e, currentPage * (isSinglePage ? 1 : 2))}
                onPaste={(e) => handlePaste(e, currentPage * (isSinglePage ? 1 : 2))}
                className={`${styles.textAreaFirst} ${
                  animatePageIcon === 1
                    ? styles.pageTextAnimation
                    : animatePageIcon === 2
                      ? styles.pageTextAnimationReverse
                      : ''
                }`}
                maxLength={500}
              />
            ) : (
              <div className={`${
                animatePageIcon === 1
                  ? styles.pageTextAnimation
                  : animatePageIcon === 2
                    ? styles.pageTextAnimationReverse
                    : ''
              }`}>
                <MessageFormattedString message={pages[currentPage * (isSinglePage ? 1 : 2)]} />
              </div>
            )}
          </div>
          {!isSinglePage && (currentPage * 2 + 1) < pages.length && (
            <div className={styles.page}>
              {editable ? (
                <textarea
                  ref={setRef(currentPage * 2 + 1)}
                  value={pages[currentPage * 2 + 1]}
                  onChange={(e) => handleTextChange(e, currentPage * 2 + 1)}
                  onPaste={(e) => handlePaste(e, currentPage * 2 + 1)}
                  className={`${styles.textAreaSecond} ${
                    animateInsideIcon === 1
                      ? styles.pageSecondTextAnimation
                      : animateInsideIcon === 2
                        ? styles.pageSecondTextAnimationReverse
                        : ''
                  }`}
                  maxLength={500}
                />
              ) : (
                <div className={`${
                  animateInsideIcon === 1
                    ? styles.pageSecondTextAnimation
                    : animateInsideIcon === 2
                      ? styles.pageSecondTextAnimationReverse
                      : ''
                }`}>
                  <MessageFormattedString message={pages[currentPage * 2 + 1]} />
                </div>
              )}
            </div>
          )}
          <Button
            className={`${styles.controlPrev} ${
              animateInsideIcon === 1
                ? styles.hidden
                : animateInsideIcon === 2
                  ? styles.pageButtonAnimationReverse
                  : ''
            }`}
            onClick={() => handlePageChange(-1)}
            disabled={currentPage === 0}
          >
            {' '}
          </Button>
          <Button
            className={`${styles.controlNext} ${
              animateInsideIcon === 1
                ? styles.hidden
                : animateInsideIcon === 2
                  ? styles.pageButtonAnimationReverse
                  : ''
            }`}
            onClick={() => handlePageChange(1)}
            disabled={(currentPage + 1) * (isSinglePage ? 1 : 2) >= pages.length}
          >
            {' '}
          </Button>
        </div>
        <div 
          className={`${styles.outSide} ${
            animateTitleIcon === 1
              ? styles.titleContentAnimation
              : animateTitleIcon === 2
                ? styles.titleContentAnimationReverse
                : ''
          }`}>
          {editable ? (
            <div className={`${styles.titleContent}`} >
              <MessageFormattedString message="Enter Book Title: " />
              <input 
                ref={inputRef}
                className={`${styles.inputTitle}`}
              />
              <MessageFormattedString message="by Author" />
              <br />
              <MessageFormattedString message="Note! When you sign the book, it will no longer be editable." />
            </div>
          ) : (
            <div className={`${styles.titleContent}`} >
              <MessageFormattedString message="Book Name Here" />
              <br />
              <MessageFormattedString message="by Author" />
            </div>
          )}
        </div>
      </div>
      <div className={styles.actions}>
        {editable && (
          <Button onClick={handleSign}>
            {signClickedOnce ? 'Sign and Save' : 'Sign'}
          </Button>
        )}

        {!editable && !isOutside && (
          <Button onClick={handleSign}>
            Sign
          </Button>
        )}
        {editable && !isOutside && (
          <Button onClick={handleEdit}>Edit</Button>
        )}
        <Button onClick={handleCancel}>
          {isOutside ? 'Cancel' : 'Close'}
        </Button>
      </div>
    </div>
  )
}

export default Book
