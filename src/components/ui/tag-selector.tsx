"use client"

import React, { useState, useCallback } from "react"
import { Check, ChevronsUpDown, X } from "lucide-react"

import styles from "./tag-selector.module.scss"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"

interface TagSelectorProps<T> {
  availableTags: T[]
  selectedTags: T[]
  onChange: (tags: T[]) => void
  getValue: (tag: T) => string
  getLabel: (tag: T) => string
  createTag: (inputValue: string) => T
  className?: string
  open?: boolean
  onOpenChange?: (open: boolean) => void
  inputValue?: string
  onInputValueChange?: (value: string) => void
}

export function TagSelector<T>({
  availableTags,
  selectedTags,
  onChange,
  getValue,
  getLabel,
  createTag,
  className,
  open,
  onOpenChange,
  inputValue,
  onInputValueChange,
}: TagSelectorProps<T>) {
  const [internalOpen, setInternalOpen] = useState(false)
  const [internalInputValue, setInternalInputValue] = useState("")

  const isOpen = open ?? internalOpen
  const setOpen = onOpenChange ?? setInternalOpen

  const currentInputValue = inputValue ?? internalInputValue
  const setInputValue = onInputValueChange ?? setInternalInputValue

  const filteredTags = availableTags.filter(
    (tag) =>
      getLabel(tag).toLowerCase().includes(currentInputValue.toLowerCase()) &&
      !selectedTags.some((selected) => getValue(selected) === getValue(tag))
  )

  const handleSelect = useCallback((value: string) => {
    const existingTag = availableTags.find((tag) => getValue(tag) === value)
    if (existingTag) {
      onChange([...selectedTags, existingTag])
    }
    setInputValue("")
  }, [availableTags, selectedTags, onChange, getValue, setInputValue])

  const handleCreate = useCallback(() => {
    const newTag = createTag(currentInputValue)
    onChange([...selectedTags, newTag])
    setInputValue("")
  }, [currentInputValue, selectedTags, onChange, createTag, setInputValue])

  const handleRemove = useCallback((value: string) => {
    onChange(selectedTags.filter((tag) => getValue(tag) !== value))
  }, [selectedTags, onChange, getValue])

  const createRemoveHandler = useCallback((tagValue: string) => {
    return (e: React.MouseEvent) => {
      e.stopPropagation()
      handleRemove(tagValue)
    }
  }, [handleRemove])

  const handleInputValueChange = useCallback((value: string) => {
    setInputValue(value)
  }, [setInputValue])

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === "Enter" && currentInputValue.trim() !== "") {
      handleCreate()
    }
  }, [currentInputValue, handleCreate])

  return (
    <Popover open={isOpen} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button type="button" className={`${styles.tagSelectorButton} ${className || ''}`}>
          {selectedTags.map((tag) => (
            <span
              key={getValue(tag)}
              className={styles.tag}
            >
              {getLabel(tag)}
              <button
                type="button"
                className={styles.removeButton}
                onClick={createRemoveHandler(getValue(tag))}
              >
                <X size={12} />
              </button>
            </span>
          ))}
          <span className={styles.flexGrow} />
          <ChevronsUpDown className={styles.chevronIcon} />
        </button>
      </PopoverTrigger>
      <PopoverContent className={styles.popoverContent}>
        <Command>
          <CommandInput
            placeholder="Enter tag..."
            value={currentInputValue}
            onValueChange={handleInputValueChange}
            autoFocus
            onKeyDown={handleKeyDown}
          />
          <CommandList>
            <CommandEmpty>No tags found.</CommandEmpty>
            <CommandGroup heading="Tags">
              {filteredTags.map((tag) => (
                <CommandItem
                  key={getValue(tag)}
                  value={getValue(tag)}
                  onSelect={handleSelect}
                >
                  <Check
                    className={`${styles.checkIcon} ${
                      selectedTags.some(
                        (selected) => getValue(selected) === getValue(tag),
                      )
                        ? styles.visible
                        : styles.hidden
                    }`}
                  />
                  {getLabel(tag)}
                </CommandItem>
              ))}
            </CommandGroup>
            {currentInputValue.trim() !== "" &&
              !availableTags.some((tag) => getLabel(tag).toLowerCase() === currentInputValue.toLowerCase()) && (
                <CommandGroup heading="Create Tag">
                  <CommandItem value={currentInputValue} onSelect={handleCreate}>
                    <Check className={`${styles.checkIcon} ${styles.visible}`} />
                    Create &quot;{currentInputValue}&quot;
                  </CommandItem>
                </CommandGroup>
              )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
} 