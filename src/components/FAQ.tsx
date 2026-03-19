'use client'

import { useState } from 'react'
import { RichText } from './RichText'

type FAQItem = { question: string; answer: any }

export function FAQ({ items }: { items: FAQItem[] }) {
  const [openIndex, setOpenIndex] = useState<number | null>(null)

  return (
    <div className="space-y-3">
      {items.map((item, i) => {
        const isOpen = openIndex === i
        return (
          <div
            key={i}
            className="bg-background-alt rounded-[26px] tablet:rounded-[30px]"
          >
            <button
              className="w-full text-left px-6 tablet:px-8 py-4 tablet:py-5 flex items-center justify-between gap-4 cursor-pointer"
              onClick={() => setOpenIndex(isOpen ? null : i)}
            >
              <span className="text-content font-medium">{item.question}</span>
              <svg
                className={`w-5 h-5 text-muted shrink-0 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
                fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5"
              >
                <path d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            <div
              className={`overflow-hidden transition-all duration-300 ${isOpen ? 'max-h-[500px] pb-6 tablet:pb-8' : 'max-h-0'}`}
            >
              <div className="text-muted leading-[1.5] px-6 tablet:px-8">
                {typeof item.answer === 'string' ? (
                  <p>{item.answer}</p>
                ) : (
                  <RichText data={item.answer} />
                )}
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
