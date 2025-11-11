"use client"

import type React from "react"
import { useState, useEffect, useRef } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import gsap from "gsap"
import { DayPicker } from "react-day-picker"
import { es } from "date-fns/locale"
import Image from "next/image"

// Form schema
const timerFormSchema = z.object({
  time: z.string().min(1, "Time is required"),
  date: z.date().optional(),
  comment: z.string().max(500, "Comment must be 500 characters or less"),
})

type TimerFormData = z.infer<typeof timerFormSchema>

interface TimerPanelProps {
  isOpen: boolean
  timerInput: string
  setTimerInput: (value: string) => void
  dateInput: Date | undefined
  setDateInput: (value: Date | undefined) => void
  commentInput: string
  setCommentInput: (value: string) => void
  totalHours: number
  onAddTimeEntry: () => Promise<void>
  onCancel: () => void
  isTimerRunning: boolean
  timerSeconds: number
}

export const TimerPanel: React.FC<TimerPanelProps> = ({
  isOpen,
  timerInput,
  setTimerInput,
  dateInput,
  setDateInput,
  commentInput,
  setCommentInput,
  totalHours,
  onAddTimeEntry,
  onCancel,
  isTimerRunning,
  timerSeconds,
}) => {
  const timerPanelRef = useRef<HTMLDivElement>(null)
  const timerPanelContent = useRef<HTMLDivElement>(null)
  const [currentStep, setCurrentStep] = useState(0)

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<TimerFormData>({
    resolver: zodResolver(timerFormSchema),
    defaultValues: {
      time: timerInput,
      date: dateInput,
      comment: commentInput,
    },
  })

  // GSAP animation
  useEffect(() => {
    if (!timerPanelRef.current) return

    if (isOpen) {
      gsap.to(timerPanelRef.current, {
        height: "auto",
        opacity: 1,
        duration: 0.3,
        ease: "power2.out",
      })
    } else {
      gsap.to(timerPanelRef.current, {
        height: 0,
        opacity: 0,
        duration: 0.3,
        ease: "power2.in",
      })
    }
  }, [isOpen])

  const onSubmit = async (data: TimerFormData) => {
    setTimerInput(data.time)
    setDateInput(data.date)
    setCommentInput(data.comment)
    await onAddTimeEntry()
  }

  return (
    <div
      ref={timerPanelRef}
      className="absolute bottom-full left-0 w-full bg-white border-t border-gray-200 shadow-lg overflow-hidden"
      style={{ height: 0, opacity: 0 }}
    >
      <div ref={timerPanelContent} className="p-4">
        {/* Header */}
        <div className="flex justify-between items-center pb-4 mb-4 border-b border-gray-300">
          <h3 className="text-base font-semibold text-gray-900">Add Time Entry</h3>
          <button type="button" onClick={onCancel} className="p-1 hover:bg-gray-200 rounded-md transition-colors">
            <Image src="/x.svg" alt="Close" width={20} height={20} />
          </button>
        </div>

        {/* Wizard steps */}
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* Step 1: Time input */}
          {currentStep === 0 && (
            <div className="text-center mb-4">
              <h4 className="text-lg font-semibold text-gray-900 mb-2">How much time did you spend?</h4>
              <input
                type="text"
                placeholder="e.g., 2h 30m"
                {...register("time")}
                value={timerInput}
                onChange={(e) => setTimerInput(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              {errors.time && <p className="text-red-500 text-sm text-center mt-2">{errors.time.message}</p>}
            </div>
          )}

          {/* Step 2: Date picker */}
          {currentStep === 1 && (
            <div className="text-center mb-4">
              <h4 className="text-lg font-semibold text-gray-900 mb-4">When did you work on this?</h4>
              <div className="bg-gray-50 rounded-lg p-4 my-4">
                <DayPicker mode="single" selected={dateInput} onSelect={setDateInput} locale={es} className="rdp" />
              </div>
            </div>
          )}

          {/* Step 3: Comment */}
          {currentStep === 2 && (
            <div className="text-center mb-4">
              <h4 className="text-lg font-semibold text-gray-900 mb-2">Any notes?</h4>
              <p className="text-sm text-gray-600 mb-4">Optional description of what you did</p>
              <textarea
                {...register("comment")}
                value={commentInput}
                onChange={(e) => setCommentInput(e.target.value)}
                placeholder="Enter notes..."
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none h-24"
              />
              {errors.comment && <p className="text-red-500 text-sm text-center mt-2">{errors.comment.message}</p>}
            </div>
          )}

          {/* Navigation buttons */}
          <div className="flex justify-between gap-2 mt-4">
            <button
              type="button"
              onClick={() => setCurrentStep(Math.max(0, currentStep - 1))}
              disabled={currentStep === 0}
              className="px-4 py-2 rounded-md border border-gray-300 text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100 transition-colors"
            >
              Back
            </button>
            {currentStep < 2 ? (
              <button
                type="button"
                onClick={() => setCurrentStep(currentStep + 1)}
                className="px-4 py-2 rounded-md bg-blue-600 text-white hover:bg-blue-700 transition-colors"
              >
                Next
              </button>
            ) : (
              <button
                type="submit"
                className="px-4 py-2 rounded-md bg-blue-600 text-white hover:bg-blue-700 transition-colors"
              >
                Add Entry
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  )
}
