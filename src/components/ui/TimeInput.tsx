import NumberFlow from '@number-flow/react'
import { Minus, Plus } from 'lucide-react'
import * as React from 'react'
import styles from './TimeInput.module.scss'

type TimeInputProps = {
	value?: number
	min?: number
	max?: number
	onChange?: (value: number) => void
	label?: string
	type?: 'hours' | 'minutes'
}

export function TimeInput({ 
	value = 0, 
	min = 0, 
	max = 23, 
	onChange,
	label,
	type = 'hours'
}: TimeInputProps) {
	const defaultValue = React.useRef(value)
	const inputRef = React.useRef<HTMLInputElement>(null)
	const [animated, setAnimated] = React.useState(true)
	// Hide the caret during transitions so you can't see it shifting around:
	const [showCaret, setShowCaret] = React.useState(true)

	const handleInput: React.ChangeEventHandler<HTMLInputElement> = ({ currentTarget: el }) => {
		setAnimated(false)
		let next = value
		if (el.value === '') {
			next = defaultValue.current
		} else {
			const num = el.valueAsNumber
			if (!isNaN(num) && min <= num && num <= max) next = num
		}
		// Manually update the input.value in case the number stays the same e.g. 09 == 9
		el.value = String(next)
		onChange?.(next)
	}

	const handlePointerDown = (diff: number) => (event: React.PointerEvent<HTMLButtonElement>) => {
		setAnimated(true)
		if (event.pointerType === 'mouse') {
			event?.preventDefault()
			inputRef.current?.focus()
		}
		const newVal = Math.min(Math.max(value + diff, min), max)
		onChange?.(newVal)
	}

	return (
		<div className={styles.timeInputContainer}>
			{label && (
				<span className={styles.label}>
					{label}
				</span>
			)}
			<div className={styles.inputGroup}>
				<button
					aria-hidden="true"
					tabIndex={-1}
					className={styles.decrementButton}
					disabled={min != null && value <= min}
					onPointerDown={handlePointerDown(-1)}
				>
					<Minus className={styles.icon} absoluteStrokeWidth strokeWidth={3.5} />
				</button>
				<div className={styles.numberContainer}>
					<input
						ref={inputRef}
						className={`${styles.hiddenInput} ${styles.spinHide} ${showCaret ? styles.showCaret : styles.hideCaret}`}
						// Make sure to disable kerning, to match NumberFlow:
						style={{ fontKerning: 'none' }}
						type="number"
						min={min}
						step={1}
						autoComplete="off"
						inputMode="numeric"
						max={max}
						value={value}
						onInput={handleInput}
					/>
					<NumberFlow
						value={value}
						locales="en-US"
						format={{ useGrouping: false, minimumIntegerDigits: type === 'hours' ? 2 : 2 }}
						aria-hidden="true"
						animated={animated}
						onAnimationsStart={() => setShowCaret(false)}
						onAnimationsFinish={() => setShowCaret(true)}
						className={styles.numberFlow}
						willChange
					/>
				</div>
				<button
					aria-hidden="true"
					tabIndex={-1}
					className={styles.incrementButton}
					disabled={max != null && value >= max}
					onPointerDown={handlePointerDown(1)}
				>
					<Plus className={styles.icon} absoluteStrokeWidth strokeWidth={3.5} />
				</button>
			</div>
		</div>
	)
}